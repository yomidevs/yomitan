/*
 * Copyright (C) 2023-2025  Yomitan Authors
 * Copyright (C) 2016-2022  Yomichan Authors
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
import {arrayBufferToBase64, base64ToArrayBuffer} from '../data/array-buffer-util.js';
import {DictionaryDatabase} from '../dictionary/dictionary-database.js';
import {DictionaryImporter} from '../dictionary/dictionary-importer.js';
import {DictionaryImporterMediaLoader} from '../dictionary/dictionary-importer-media-loader.js';
import {Translator} from '../language/translator.js';

/**
 * @typedef {{id: number, action: string, params?: import('core').SerializableObject}} WorkerRequest
 * @typedef {{id: number, result?: unknown, error?: import('core').SerializedError}} WorkerResponse
 */

class OffscreenDictionaryWorkerHandler {
    constructor() {
        /** @type {DictionaryDatabase} */
        this._dictionaryDatabase = new DictionaryDatabase();
        /** @type {Translator} */
        this._translator = new Translator(this._dictionaryDatabase);
        /** @type {?Promise<void>} */
        this._prepareDatabasePromise = null;
        /** @type {boolean} */
        this._databaseSuspended = false;
        /** @type {DictionaryImporterMediaLoader} */
        this._mediaLoader = new DictionaryImporterMediaLoader();
    }

    /** */
    prepare() {
        self.addEventListener('message', this._onMessage.bind(this), false);
        self.addEventListener('messageerror', this._onMessageError.bind(this), false);
    }

    /**
     * @returns {Promise<void>}
     */
    async _ensureDatabasePrepared() {
        if (this._databaseSuspended) {
            throw new Error('Dictionary database access is suspended while import is in progress');
        }
        if (this._dictionaryDatabase.isPrepared()) {
            return;
        }
        if (this._prepareDatabasePromise !== null) {
            await this._prepareDatabasePromise;
            return;
        }
        this._prepareDatabasePromise = (async () => {
            await this._dictionaryDatabase.prepare();
            this._translator.prepare();
        })();
        try {
            await this._prepareDatabasePromise;
        } finally {
            this._prepareDatabasePromise = null;
        }
    }

    /**
     * @param {MessageEvent<WorkerRequest>} event
     */
    _onMessage(event) {
        void this._onMessageAsync(event);
    }

    /**
     * @param {MessageEvent<WorkerRequest>} event
     */
    async _onMessageAsync(event) {
        const {id, action, params} = event.data;
        /** @type {WorkerResponse} */
        const response = {id};
        try {
            response.result = await this._invokeAction(action, params ?? {}, [...event.ports]);
        } catch (e) {
            response.error = ExtensionError.serialize(e);
        }
        self.postMessage(response);
    }

    /**
     * @param {MessageEvent<WorkerRequest>} event
     */
    _onMessageError(event) {
        const error = new ExtensionError('Offscreen dictionary worker: Error receiving message');
        error.data = event;
        log.error(error);
    }

    /**
     * @param {string} action
     * @throws {Error}
     */
    _assertDatabaseAvailable(action) {
        if (this._databaseSuspended) {
            throw new Error(`Cannot execute ${action}: dictionary database access is suspended while import is in progress`);
        }
    }

    /**
     * @param {MessagePort[]} ports
     * @returns {MessagePort}
     * @throws {Error}
     */
    _getRequiredResponsePort(ports) {
        if (ports.length === 0) {
            throw new Error('Offscreen import response port missing');
        }
        return ports[0];
    }

    /**
     * @param {MessagePort} port
     * @param {unknown} progress
     */
    _postImportProgress(port, progress) {
        port.postMessage({type: 'progress', progress});
    }

    /**
     * @param {MessagePort} port
     * @param {unknown} result
     */
    _postImportComplete(port, result) {
        port.postMessage({type: 'complete', result});
    }

    /**
     * @param {MessagePort} port
     * @param {unknown} error
     */
    _postImportError(port, error) {
        port.postMessage({
            type: 'error',
            error: ExtensionError.serialize(error),
        });
    }

    /**
     * @param {import('dictionary-importer').ImportDetails} details
     * @param {ArrayBuffer|Blob|null} archiveContent
     * @param {MessagePort} port
     * @returns {Promise<void>}
     */
    async _importDictionaryOffscreen(details, archiveContent, port) {
        this._assertDatabaseAvailable('importDictionaryOffscreen');
        await this._ensureDatabasePrepared();
        const dictionaryImporter = new DictionaryImporter(this._mediaLoader, this._postImportProgress.bind(this, port));
        try {
            const importPayload = await dictionaryImporter.importDictionary(this._dictionaryDatabase, archiveContent, details);
            const {result, errors, debug} = importPayload;
            this._postImportComplete(port, {
                result,
                errors: errors.map((error) => ExtensionError.serialize(error)),
                debug: {
                    usesFallbackStorage: this._dictionaryDatabase.usesFallbackStorage(),
                    openStorageDiagnostics: (
                        typeof this._dictionaryDatabase.getOpenStorageDiagnostics === 'function' ?
                            this._dictionaryDatabase.getOpenStorageDiagnostics() :
                            null
                    ),
                    useImportSession: Reflect.get(details, 'useImportSession') === true,
                    finalizeImportSession: Reflect.get(details, 'finalizeImportSession') === true,
                    importerDebug: debug ?? null,
                },
            });
        } catch (error) {
            this._postImportError(port, error);
        } finally {
            port.close();
        }
    }

    /**
     * @param {string} action
     * @param {import('core').SerializableObject} params
     * @param {MessagePort[]} ports
     * @returns {Promise<unknown>}
     */
    async _invokeAction(action, params, ports) {
        switch (action) {
            case 'databasePrepareOffscreen':
                await this._ensureDatabasePrepared();
                return;
            case 'databaseSetSuspendedOffscreen': {
                const suspended = params.suspended === true;
                if (suspended) {
                    this._databaseSuspended = true;
                    if (this._dictionaryDatabase.isPrepared()) {
                        await this._dictionaryDatabase.close();
                    }
                    this._translator.clearDatabaseCaches();
                    return;
                }
                this._databaseSuspended = false;
                await this._ensureDatabasePrepared();
                this._translator.prepare();
                return;
            }
            case 'getDictionaryInfoOffscreen':
                this._assertDatabaseAvailable(action);
                await this._ensureDatabasePrepared();
                return await this._dictionaryDatabase.getDictionaryInfo();
            case 'deleteDictionaryOffscreen':
                this._assertDatabaseAvailable(action);
                await this._ensureDatabasePrepared();
                await this._dictionaryDatabase.deleteDictionary(/** @type {string} */ (params.dictionaryTitle ?? ''), 1000, () => {});
                return;
            case 'getDictionaryCountsOffscreen':
                this._assertDatabaseAvailable(action);
                await this._ensureDatabasePrepared();
                return await this._dictionaryDatabase.getDictionaryCounts(
                    /** @type {string[]} */ (params.dictionaryNames ?? []),
                    params.getTotal === true,
                );
            case 'databasePurgeOffscreen':
                this._assertDatabaseAvailable(action);
                await this._ensureDatabasePrepared();
                return await this._dictionaryDatabase.purge();
            case 'databaseRefreshOffscreen':
                this._assertDatabaseAvailable(action);
                if (this._dictionaryDatabase.isPrepared()) {
                    await this._dictionaryDatabase.close();
                }
                this._translator.clearDatabaseCaches();
                await this._ensureDatabasePrepared();
                return;
            case 'databaseGetMediaOffscreen': {
                this._assertDatabaseAvailable(action);
                await this._ensureDatabasePrepared();
                const targets = /** @type {import('dictionary-database').MediaRequest[]} */ (params.targets ?? []);
                const media = await this._dictionaryDatabase.getMedia(targets);
                return media.map((m) => ({...m, content: arrayBufferToBase64(m.content)}));
            }
            case 'databaseExportOffscreen':
                this._assertDatabaseAvailable(action);
                await this._ensureDatabasePrepared();
                return arrayBufferToBase64(await this._dictionaryDatabase.exportDatabase());
            case 'databaseImportOffscreen':
                this._assertDatabaseAvailable(action);
                await this._ensureDatabasePrepared();
                await this._dictionaryDatabase.importDatabase(base64ToArrayBuffer(/** @type {string} */ (params.content ?? '')));
                return;
            case 'translatorPrepareOffscreen':
                this._assertDatabaseAvailable(action);
                await this._ensureDatabasePrepared();
                this._translator.prepare();
                return;
            case 'findKanjiOffscreen': {
                this._assertDatabaseAvailable(action);
                await this._ensureDatabasePrepared();
                const options = /** @type {import('offscreen').FindKanjiOptionsOffscreen} */ (params.options);
                /** @type {import('translation').FindKanjiOptions} */
                const modifiedOptions = {
                    ...options,
                    enabledDictionaryMap: new Map(options.enabledDictionaryMap),
                };
                const text = /** @type {string} */ (params.text ?? '');
                return await this._translator.findKanji(text, modifiedOptions);
            }
            case 'findTermsOffscreen': {
                this._assertDatabaseAvailable(action);
                await this._ensureDatabasePrepared();
                const mode = /** @type {import('translator').FindTermsMode} */ (params.mode);
                const text = /** @type {string} */ (params.text ?? '');
                const options = /** @type {import('offscreen').FindTermsOptionsOffscreen} */ (params.options);
                const enabledDictionaryMap = new Map(options.enabledDictionaryMap);
                const excludeDictionaryDefinitions = (
                    options.excludeDictionaryDefinitions !== null ?
                        new Set(options.excludeDictionaryDefinitions) :
                        null
                );
                const textReplacements = options.textReplacements.map((group) => {
                    if (group === null) { return null; }
                    return group.map((opt) => {
                        const match = opt.pattern.match(/\/(.*?)\/([a-z]*)?$/i);
                        const [, pattern, flags] = match !== null ? match : ['', '', ''];
                        return {...opt, pattern: new RegExp(pattern, flags ?? '')};
                    });
                });
                /** @type {import('translation').FindTermsOptions} */
                const modifiedOptions = {
                    ...options,
                    enabledDictionaryMap,
                    excludeDictionaryDefinitions,
                    textReplacements,
                };
                return await this._translator.findTerms(mode, text, modifiedOptions);
            }
            case 'getTermFrequenciesOffscreen':
                this._assertDatabaseAvailable(action);
                await this._ensureDatabasePrepared();
                return await this._translator.getTermFrequencies(
                    /** @type {import('translator').TermReadingList} */ (params.termReadingList ?? []),
                    /** @type {string[]} */ (params.dictionaries ?? []),
                );
            case 'clearDatabaseCachesOffscreen':
                this._translator.clearDatabaseCaches();
                return;
            case 'importDictionaryOffscreen':
                await this._importDictionaryOffscreen(
                    /** @type {import('dictionary-importer').ImportDetails} */ (params.details),
                    /** @type {ArrayBuffer|Blob|null} */ (params.archiveContent ?? null),
                    this._getRequiredResponsePort(ports),
                );
                return;
            case 'connectToDatabaseWorker':
                this._assertDatabaseAvailable(action);
                await this._ensureDatabasePrepared();
                if (ports.length > 0) {
                    await this._dictionaryDatabase.connectToDatabaseWorker(ports[0]);
                }
                return;
            default:
                throw new Error(`Unknown action: ${action}`);
        }
    }
}

/** Entry point. */
function main() {
    const handler = new OffscreenDictionaryWorkerHandler();
    handler.prepare();
}

main();
