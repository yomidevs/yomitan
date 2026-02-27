/*
 * Copyright (C) 2023-2025  Yomitan Authors
 * Copyright (C) 2021-2022  Yomichan Authors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import {ExtensionError} from '../core/extension-error.js';
import {log} from '../core/log.js';
import {DictionaryDatabase} from './dictionary-database.js';
import {DictionaryImporter} from './dictionary-importer.js';
import {DictionaryWorkerMediaLoader} from './dictionary-worker-media-loader.js';

export class DictionaryWorkerHandler {
    constructor() {
        /** @type {DictionaryWorkerMediaLoader} */
        this._mediaLoader = new DictionaryWorkerMediaLoader();
        /** @type {DictionaryDatabase|null} */
        this._importSessionDictionaryDatabase = null;
    }

    /** */
    prepare() {
        self.addEventListener('message', this._onMessage.bind(this), false);
    }

    // Private

    /**
     * @param {MessageEvent<import('dictionary-worker-handler').Message>} event
     */
    _onMessage(event) {
        const {action, params} = event.data;
        switch (action) {
            case 'importDictionary':
                void this._onMessageWithProgress(params, this._importDictionary.bind(this));
                break;
            case 'deleteDictionary':
                void this._onMessageWithProgress(params, this._deleteDictionary.bind(this));
                break;
            case 'getDictionaryCounts':
                void this._onMessageWithProgress(params, this._getDictionaryCounts.bind(this));
                break;
            case 'getImageDetails.response':
                this._mediaLoader.handleMessage(params);
                break;
        }
    }

    /**
     * @template [T=unknown]
     * @param {T} params
     * @param {(details: T, onProgress: import('dictionary-worker-handler').OnProgressCallback) => Promise<unknown>} handler
     */
    async _onMessageWithProgress(params, handler) {
        /**
         * @param {...unknown} args
         */
        const onProgress = (...args) => {
            self.postMessage({
                action: 'progress',
                params: {args},
            });
        };
        let response;
        try {
            const result = await handler(params, onProgress);
            response = {result};
        } catch (e) {
            response = {error: ExtensionError.serialize(e)};
        }
        self.postMessage({action: 'complete', params: response});
    }

    /**
     * @param {import('dictionary-worker-handler').ImportDictionaryMessageParams} details
     * @param {import('dictionary-worker-handler').OnProgressCallback} onProgress
     * @returns {Promise<import('dictionary-worker').MessageCompleteResultSerialized>}
     */
    async _importDictionary({details, archiveContent}, onProgress) {
        const useImportSession = (
            typeof details === 'object' &&
            details !== null &&
            !Array.isArray(details) &&
            Reflect.get(details, 'useImportSession') === true
        );
        const finalizeImportSession = (
            typeof details === 'object' &&
            details !== null &&
            !Array.isArray(details) &&
            Reflect.get(details, 'finalizeImportSession') === true
        );
        const createdImportSessionDatabase = useImportSession && this._importSessionDictionaryDatabase === null;
        log.log(`[ImportTiming][worker] useImportSession=${String(useImportSession)} finalizeImportSession=${String(finalizeImportSession)} createdSessionDb=${String(createdImportSessionDatabase)} hasExistingSessionDb=${String(this._importSessionDictionaryDatabase !== null)}`);
        const dictionaryDatabase = useImportSession ?
            (this._importSessionDictionaryDatabase ?? await this._getPreparedDictionaryDatabase()) :
            await this._getPreparedDictionaryDatabase();
        const usesFallbackStorage = dictionaryDatabase.usesFallbackStorage();
        const openStorageDiagnostics = (
            typeof dictionaryDatabase.getOpenStorageDiagnostics === 'function' ?
                dictionaryDatabase.getOpenStorageDiagnostics() :
                null
        );
        if (usesFallbackStorage) {
            throw new Error(`OPFS is required for dictionary import. diagnostics=${JSON.stringify(openStorageDiagnostics)}`);
        }
        if (createdImportSessionDatabase) {
            this._importSessionDictionaryDatabase = dictionaryDatabase;
        }
        try {
            const dictionaryImporter = new DictionaryImporter(this._mediaLoader, onProgress);
            let result;
            let errors;
            try {
                ({result, errors} = await dictionaryImporter.importDictionary(dictionaryDatabase, archiveContent, details));
            } catch (error) {
                const diagnostics = (
                    typeof dictionaryDatabase.getOpenStorageDiagnostics === 'function' ?
                        dictionaryDatabase.getOpenStorageDiagnostics() :
                        openStorageDiagnostics
                );
                const message = (error instanceof Error) ? error.message : String(error);
                throw new Error(`Dictionary import failed: ${message}. workerStorageDiagnostics=${JSON.stringify(diagnostics)}`);
            }
            return {
                result,
                errors: errors.map((error) => ExtensionError.serialize(error)),
                debug: {
                    usesFallbackStorage,
                    openStorageDiagnostics,
                    useImportSession,
                    finalizeImportSession,
                },
            };
        } finally {
            if (useImportSession && finalizeImportSession && this._importSessionDictionaryDatabase !== null) {
                await this._importSessionDictionaryDatabase.close();
                this._importSessionDictionaryDatabase = null;
            } else if (!useImportSession) {
                await dictionaryDatabase.close();
            }
        }
    }

    /**
     * @param {import('dictionary-worker-handler').DeleteDictionaryMessageParams} details
     * @param {import('dictionary-database').DeleteDictionaryProgressCallback} onProgress
     * @returns {Promise<void>}
     */
    async _deleteDictionary({dictionaryTitle}, onProgress) {
        const dictionaryDatabase = await this._getPreparedDictionaryDatabase();
        try {
            return await dictionaryDatabase.deleteDictionary(dictionaryTitle, 1000, onProgress);
        } finally {
            void dictionaryDatabase.close();
        }
    }

    /**
     * @param {import('dictionary-worker-handler').GetDictionaryCountsMessageParams} details
     * @returns {Promise<import('dictionary-database').DictionaryCounts>}
     */
    async _getDictionaryCounts({dictionaryNames, getTotal}) {
        const dictionaryDatabase = await this._getPreparedDictionaryDatabase();
        try {
            return await dictionaryDatabase.getDictionaryCounts(dictionaryNames, getTotal);
        } finally {
            void dictionaryDatabase.close();
        }
    }

    /**
     * @returns {Promise<DictionaryDatabase>}
     */
    async _getPreparedDictionaryDatabase() {
        const dictionaryDatabase = new DictionaryDatabase();
        await dictionaryDatabase.prepare();
        return dictionaryDatabase;
    }
}
