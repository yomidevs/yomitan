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
     * @template [T=unknown]
     * @param {string} action
     * @param {import('core').SerializableObject} params
     * @returns {Promise<T>}
     */
    async _invokeBackendApi(action, params) {
        const runtime = /** @type {typeof chrome.runtime|undefined} */ (Reflect.get(chrome, 'runtime'));
        if (typeof runtime?.sendMessage !== 'function') {
            throw new Error(`Cannot invoke backend action ${action}: chrome.runtime.sendMessage unavailable`);
        }
        return await new Promise((resolve, reject) => {
            runtime.sendMessage({action, params}, (responseRaw) => {
                const runtimeError = runtime.lastError;
                if (typeof runtimeError !== 'undefined') {
                    reject(new Error(runtimeError.message));
                    return;
                }
                const response = /** @type {unknown} */ (responseRaw);
                if (!(typeof response === 'object' && response !== null)) {
                    reject(new Error(`Backend action ${action} returned invalid response`));
                    return;
                }
                const responseRecord = /** @type {Record<string, unknown>} */ (response);
                const error = /** @type {unknown} */ (Reflect.get(responseRecord, 'error'));
                if (typeof error !== 'undefined' && error !== null) {
                    if (typeof error === 'object' && !Array.isArray(error)) {
                        reject(ExtensionError.deserialize(/** @type {import('core').SerializedError} */ (error)));
                        return;
                    }
                    reject(new Error(`Backend action ${action} returned invalid error payload`));
                    return;
                }
                const result = Reflect.get(responseRecord, 'result');
                resolve(/** @type {T} */ (result));
            });
        });
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
            /** @type {import('dictionary-importer').ImportDebug|null} */
            let importerDebug = null;
            try {
                const importPayload = await dictionaryImporter.importDictionary(dictionaryDatabase, archiveContent, details);
                ({result, errors} = importPayload);
                importerDebug = (typeof importPayload === 'object' && importPayload !== null && !Array.isArray(importPayload)) ?
                    (/** @type {import('dictionary-importer').ImportDebug|null} */ (Reflect.get(importPayload, 'debug') ?? null)) :
                    null;
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
                    importerDebug,
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
        onProgress({processed: 0, count: 1, storeCount: 1, storesProcesed: 0});
        await this._invokeBackendApi('deleteDictionaryByTitle', {dictionaryTitle});
        onProgress({processed: 1, count: 1, storeCount: 1, storesProcesed: 1});
    }

    /**
     * @param {import('dictionary-worker-handler').GetDictionaryCountsMessageParams} details
     * @returns {Promise<import('dictionary-database').DictionaryCounts>}
     */
    async _getDictionaryCounts({dictionaryNames, getTotal}) {
        return await this._invokeBackendApi('getDictionaryCounts', {dictionaryNames, getTotal});
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
