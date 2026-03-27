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
            const isReadonlyError = (error) => {
                const message = (error instanceof Error) ? error.message : String(error);
                return /readonly database|SQLITE_READONLY/i.test(message);
            };
            const dictionaryTitleOverride = (
                typeof details === 'object' &&
                details !== null &&
                !Array.isArray(details) &&
                typeof Reflect.get(details, 'dictionaryTitleOverride') === 'string' &&
                Reflect.get(details, 'dictionaryTitleOverride').trim().length > 0
            ) ?
                Reflect.get(details, 'dictionaryTitleOverride').trim() :
                null;
            const replacementDictionaryTitle = (
                typeof details === 'object' &&
                details !== null &&
                !Array.isArray(details) &&
                typeof Reflect.get(details, 'replacementDictionaryTitle') === 'string' &&
                Reflect.get(details, 'replacementDictionaryTitle').trim().length > 0
            ) ?
                Reflect.get(details, 'replacementDictionaryTitle').trim() :
                null;
            const cleanupTransientReplacementTitles = async (activeDictionaryDatabase) => {
                const transientTitleCandidates = new Set();
                const transientTitlePattern = /\[(?:update-staging|cutover|replaced) [^\]]+\]/;
                const transientTokenMatch = (
                    dictionaryTitleOverride !== null &&
                    transientTitlePattern.test(dictionaryTitleOverride)
                ) ? dictionaryTitleOverride.match(/\[(?:update-staging|cutover|replaced) ([^\]]+)\]$/) : null;
                const transientSessionToken = Array.isArray(transientTokenMatch) && typeof transientTokenMatch[1] === 'string' && transientTokenMatch[1].length > 0 ?
                    transientTokenMatch[1] :
                    null;
                if (dictionaryTitleOverride !== null && transientTitlePattern.test(dictionaryTitleOverride)) {
                    transientTitleCandidates.add(dictionaryTitleOverride);
                }
                const dictionaryInfos = await activeDictionaryDatabase.getDictionaryInfo();
                for (const dictionaryInfo of dictionaryInfos) {
                    const title = (
                        dictionaryInfo &&
                        typeof dictionaryInfo === 'object' &&
                        typeof Reflect.get(dictionaryInfo, 'title') === 'string'
                    ) ? Reflect.get(dictionaryInfo, 'title').trim() : '';
                    if (title.length === 0) { continue; }
                    const infoToken = (
                        dictionaryInfo &&
                        typeof dictionaryInfo === 'object' &&
                        typeof Reflect.get(dictionaryInfo, 'updateSessionToken') === 'string'
                    ) ? Reflect.get(dictionaryInfo, 'updateSessionToken').trim() : '';
                    if (
                        transientTitlePattern.test(title) &&
                        (
                            title === dictionaryTitleOverride ||
                            (transientSessionToken !== null && infoToken === transientSessionToken) ||
                            (transientSessionToken !== null && title.endsWith(` ${transientSessionToken}]`))
                        )
                    ) {
                        transientTitleCandidates.add(title);
                    }
                }
                for (const transientTitle of transientTitleCandidates) {
                    try {
                        await activeDictionaryDatabase.deleteDictionary(transientTitle, 1000, () => {});
                    } catch (_) {
                        // NOP - best effort cleanup before retry.
                    }
                }
                await activeDictionaryDatabase.cleanupTransientTermRecordShards((dictionaryName) => {
                    const title = String(dictionaryName || '').trim();
                    if (title.length === 0) {
                        return false;
                    }
                    if (transientTitleCandidates.has(title)) {
                        return true;
                    }
                    return transientTitlePattern.test(title) && (
                        transientSessionToken !== null &&
                        title.endsWith(` ${transientSessionToken}]`)
                    );
                });
            };
            const importOnce = async (activeDictionaryDatabase) => {
                const importPayload = await dictionaryImporter.importDictionary(activeDictionaryDatabase, archiveContent, details);
                let {result, errors} = importPayload;
                const importerDebug = (typeof importPayload === 'object' && importPayload !== null && !Array.isArray(importPayload)) ?
                    (/** @type {import('dictionary-importer').ImportDebug|null} */ (Reflect.get(importPayload, 'debug') ?? null)) :
                    null;
                const sourceDictionaryTitle = (
                    result !== null &&
                    typeof result === 'object' &&
                    !Array.isArray(result) &&
                    typeof Reflect.get(result, 'sourceTitle') === 'string' &&
                    Reflect.get(result, 'sourceTitle').trim().length > 0
                ) ?
                    Reflect.get(result, 'sourceTitle').trim() :
                    ((result !== null && typeof result?.title === 'string') ? result.title.trim() : '');
                if (
                    result !== null &&
                    replacementDictionaryTitle !== null &&
                    sourceDictionaryTitle.length > 0 &&
                    result.title !== sourceDictionaryTitle
                ) {
                    await activeDictionaryDatabase.replaceDictionaryTitle(
                        result.title,
                        sourceDictionaryTitle,
                        {...result, title: sourceDictionaryTitle},
                        replacementDictionaryTitle,
                    );
                    result.title = sourceDictionaryTitle;
                    result.sourceTitle = sourceDictionaryTitle;
                }
                return {result, errors, importerDebug};
            };

            let result;
            let errors;
            /** @type {import('dictionary-importer').ImportDebug|null} */
            let importerDebug = null;
            try {
                ({result, errors, importerDebug} = await importOnce(dictionaryDatabase));
            } catch (error) {
                const canRetryReadonlyImport = isReadonlyError(error) && (!useImportSession || finalizeImportSession);
                if (!canRetryReadonlyImport) {
                    if (replacementDictionaryTitle !== null || dictionaryTitleOverride !== null) {
                        try {
                            await cleanupTransientReplacementTitles(dictionaryDatabase);
                        } catch (_) {
                            // NOP - preserve the original failure.
                        }
                    }
                    throw error;
                }
                try {
                    await dictionaryDatabase.close();
                } catch (_) {
                    // NOP
                }
                if (this._importSessionDictionaryDatabase === dictionaryDatabase) {
                    this._importSessionDictionaryDatabase = null;
                }
                const retryDictionaryDatabase = await this._getPreparedDictionaryDatabase();
                if (useImportSession) {
                    this._importSessionDictionaryDatabase = retryDictionaryDatabase;
                }
                try {
                    await cleanupTransientReplacementTitles(retryDictionaryDatabase);
                    ({result, errors, importerDebug} = await importOnce(retryDictionaryDatabase));
                } finally {
                    if (!useImportSession) {
                        await retryDictionaryDatabase.close();
                    } else if (finalizeImportSession) {
                        await retryDictionaryDatabase.close();
                        this._importSessionDictionaryDatabase = null;
                    }
                }
                return {
                    result,
                    errors: errors.map((error2) => ExtensionError.serialize(error2)),
                    debug: {
                        usesFallbackStorage,
                        openStorageDiagnostics,
                        useImportSession,
                        finalizeImportSession,
                        importerDebug,
                    },
                };
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
            } else if (!useImportSession && dictionaryDatabase.isPrepared()) {
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
