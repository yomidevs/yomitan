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

import {API} from '../comm/api.js';
import {ClipboardReader} from '../comm/clipboard-reader.js';
import {createApiMap, invokeApiMapHandler} from '../core/api-map.js';
import {ExtensionError} from '../core/extension-error.js';
import {log} from '../core/log.js';
import {reportDiagnostics} from '../core/diagnostics-reporter.js';
import {sanitizeCSS} from '../core/utilities.js';
import {getSqlite3} from '../dictionary/sqlite-wasm.js';
import {WebExtension} from '../extension/web-extension.js';

/**
 * This class controls the core logic of the extension, including API calls
 * and various forms of communication between browser tabs and external applications.
 */
export class Offscreen {
    /**
     * Creates a new instance.
     */
    constructor() {
        /** @type {ClipboardReader} */
        this._clipboardReader = new ClipboardReader(
            (typeof document === 'object' && document !== null ? document : null),
            '#clipboard-paste-target',
            '#clipboard-rich-content-paste-target',
        );

        /* eslint-disable @stylistic/no-multi-spaces */
        /** @type {import('offscreen').ApiMap} */
        this._apiMap = createApiMap([
            ['clipboardGetTextOffscreen',      this._getTextHandler.bind(this)],
            ['clipboardGetImageOffscreen',     this._getImageHandler.bind(this)],
            ['clipboardSetBrowserOffscreen',   this._setClipboardBrowser.bind(this)],
            ['databasePrepareOffscreen',       this._prepareDatabaseHandler.bind(this)],
            ['databaseRefreshOffscreen',       this._refreshDatabaseHandler.bind(this)],
            ['getDatabaseRuntimeStateOffscreen', this._getDatabaseRuntimeStateHandler.bind(this)],
            ['databaseSetSuspendedOffscreen',  this._setDatabaseSuspendedHandler.bind(this)],
            ['getDictionaryInfoOffscreen',     this._getDictionaryInfoHandler.bind(this)],
            ['deleteDictionaryOffscreen',      this._deleteDictionaryHandler.bind(this)],
            ['replaceDictionaryTitleOffscreen', this._replaceDictionaryTitleHandler.bind(this)],
            ['getDictionaryCountsOffscreen',   this._getDictionaryCountsHandler.bind(this)],
            ['debugDictionaryStorageStateOffscreen', this._debugDictionaryStorageStateHandler.bind(this)],
            ['debugDictionaryLookupStateOffscreen', this._debugDictionaryLookupStateHandler.bind(this)],
            ['databasePurgeOffscreen',         this._purgeDatabaseHandler.bind(this)],
            ['databaseGetMediaOffscreen',      this._getMediaHandler.bind(this)],
            ['databaseExportOffscreen',        this._exportDatabaseHandler.bind(this)],
            ['databaseImportOffscreen',        this._importDatabaseHandler.bind(this)],
            ['translatorPrepareOffscreen',     this._prepareTranslatorHandler.bind(this)],
            ['findKanjiOffscreen',             this._findKanjiHandler.bind(this)],
            ['findTermsOffscreen',             this._findTermsHandler.bind(this)],
            ['getTermFrequenciesOffscreen',    this._getTermFrequenciesHandler.bind(this)],
            ['clearDatabaseCachesOffscreen',   this._clearDatabaseCachesHandler.bind(this)],
            ['createAndRegisterPortOffscreen', this._createAndRegisterPort.bind(this)],
            ['sanitizeCSSOffscreen',           this._sanitizeCSSOffscreen.bind(this)],
        ]);
        /* eslint-enable @stylistic/no-multi-spaces */

        /** @type {import('offscreen').McApiMap} */
        this._mcApiMap = createApiMap([
            ['connectToDatabaseWorker', this._connectToDatabaseWorkerHandler.bind(this)],
            ['importDictionaryOffscreen', this._importDictionaryOffscreenHandler.bind(this)],
        ]);

        /** @type {?Promise<void>} */
        this._prepareDatabasePromise = null;
        /** @type {Worker} */
        this._dictionaryWorker = new Worker('/js/background/offscreen-dictionary-worker.js', {type: 'module'});
        /** @type {Map<number, {resolve: (value: unknown) => void, reject: (reason?: unknown) => void}>} */
        this._dictionaryWorkerResponseHandlers = new Map();
        /** @type {number} */
        this._dictionaryWorkerRequestId = 0;
        this._dictionaryWorker.addEventListener('message', this._onDictionaryWorkerMessage.bind(this));
        this._dictionaryWorker.addEventListener('messageerror', this._onDictionaryWorkerMessageError.bind(this));
        this._dictionaryWorker.addEventListener('error', this._onDictionaryWorkerError.bind(this));

        /**
         * @type {API}
         */
        this._api = new API(new WebExtension());
    }

    /** */
    prepare() {
        chrome.runtime.onMessage.addListener(this._onMessage.bind(this));
        navigator.serviceWorker.addEventListener('controllerchange', this._createAndRegisterPort.bind(this));
        this._createAndRegisterPort();
        void this._reportOpfsPreflight();
    }

    /**
     * @returns {Promise<void>}
     */
    async _reportOpfsPreflight() {
        const locationValue = /** @type {Record<string, unknown>} */ (/** @type {unknown} */ (Reflect.get(globalThis, 'location') ?? {}));
        const navigatorValue = /** @type {Record<string, unknown>} */ (/** @type {unknown} */ (Reflect.get(globalThis, 'navigator') ?? {}));
        const storageValue = /** @type {Record<string, unknown>} */ (Reflect.get(navigatorValue, 'storage') ?? {});
        /** @type {Record<string, unknown>} */
        const payload = {
            context: {
                href: typeof locationValue.href === 'string' ? locationValue.href : null,
                origin: typeof locationValue.origin === 'string' ? locationValue.origin : null,
                hasNavigatorStorage: typeof storageValue === 'object' && storageValue !== null,
                hasStorageGetDirectory: typeof storageValue.getDirectory === 'function',
                hasFileSystemHandle: typeof Reflect.get(globalThis, 'FileSystemHandle') === 'function',
                hasFileSystemDirectoryHandle: typeof Reflect.get(globalThis, 'FileSystemDirectoryHandle') === 'function',
                hasFileSystemFileHandle: typeof Reflect.get(globalThis, 'FileSystemFileHandle') === 'function',
                hasCreateSyncAccessHandle: (
                    typeof Reflect.get(globalThis, 'FileSystemFileHandle') === 'function' &&
                    typeof Reflect.get(
                        /** @type {{prototype?: Record<string, unknown>}} */ (/** @type {unknown} */ (Reflect.get(globalThis, 'FileSystemFileHandle'))).prototype ?? {},
                        'createSyncAccessHandle',
                    ) === 'function'
                ),
                userAgent: typeof navigatorValue.userAgent === 'string' ? navigatorValue.userAgent : null,
            },
        };
        try {
            const sqlite3 = await getSqlite3();
            /**
             * @param {unknown} pointer
             * @returns {string|number|null}
             */
            const serializePointer = (pointer) => {
                if (typeof pointer === 'bigint') {
                    return pointer.toString();
                }
                if (typeof pointer === 'number') {
                    return pointer;
                }
                return null;
            };
            /**
             * @param {unknown} pointer
             * @returns {boolean}
             */
            const isNonZeroPointer = (pointer) => {
                if (typeof pointer === 'bigint') {
                    return pointer !== 0n;
                }
                if (typeof pointer === 'number') {
                    return pointer !== 0;
                }
                return false;
            };
            const findVfs = sqlite3?.capi?.sqlite3_vfs_find;
            const opfsSahpoolVfsRaw = typeof findVfs === 'function' ? findVfs('opfs-sahpool') : null;
            payload.sqlite = {
                sqliteVersion: sqlite3?.version?.libVersion ?? null,
                hasInstallOpfsSAHPoolVfs: typeof Reflect.get(sqlite3, 'installOpfsSAHPoolVfs') === 'function',
                hasOpfsSahpoolVfs: opfsSahpoolVfsRaw !== null && isNonZeroPointer(opfsSahpoolVfsRaw),
                opfsSahpoolVfsPtr: serializePointer(opfsSahpoolVfsRaw),
            };
        } catch (e) {
            payload.sqliteInitError = (e instanceof Error) ? e.message : String(e);
        }
        reportDiagnostics('offscreen-opfs-preflight', payload);
    }

    /** @type {import('offscreen').ApiHandler<'clipboardGetTextOffscreen'>} */
    async _getTextHandler({useRichText}) {
        return await this._clipboardReader.getText(useRichText);
    }

    /** @type {import('offscreen').ApiHandler<'clipboardGetImageOffscreen'>} */
    async _getImageHandler() {
        return await this._clipboardReader.getImage();
    }

    /** @type {import('offscreen').ApiHandler<'clipboardSetBrowserOffscreen'>} */
    _setClipboardBrowser({value}) {
        this._clipboardReader.browser = value;
    }

    /** @type {import('offscreen').ApiHandler<'databasePrepareOffscreen'>} */
    _prepareDatabaseHandler() {
        if (this._prepareDatabasePromise !== null) {
            return this._prepareDatabasePromise;
        }
        this._prepareDatabasePromise = (async () => {
            await this._invokeDictionaryWorker('databasePrepareOffscreen', {});
        })();
        this._prepareDatabasePromise.finally(() => {
            this._prepareDatabasePromise = null;
        }).catch(() => {
            // NOP
        });
        return this._prepareDatabasePromise;
    }

    /**
     * @returns {Promise<void>}
     */
    async _ensureDatabasePrepared() {
        await /** @type {Promise<void>} */ (this._prepareDatabaseHandler());
    }

    /** @type {import('offscreen').ApiHandler<'getDictionaryInfoOffscreen'>} */
    async _getDictionaryInfoHandler() {
        return await this._invokeDictionaryWorker('getDictionaryInfoOffscreen', {});
    }

    /** @type {import('offscreen').ApiHandler<'databaseRefreshOffscreen'>} */
    async _refreshDatabaseHandler() {
        await this._invokeDictionaryWorker('databaseRefreshOffscreen', {});
    }

    /** @type {import('offscreen').ApiHandler<'getDatabaseRuntimeStateOffscreen'>} */
    async _getDatabaseRuntimeStateHandler() {
        return await this._invokeDictionaryWorker('getDatabaseRuntimeStateOffscreen', {});
    }

    /** @type {import('offscreen').ApiHandler<'databaseSetSuspendedOffscreen'>} */
    async _setDatabaseSuspendedHandler({suspended}) {
        await this._invokeDictionaryWorker('databaseSetSuspendedOffscreen', {suspended});
    }

    /** @type {import('offscreen').ApiHandler<'databasePurgeOffscreen'>} */
    async _purgeDatabaseHandler() {
        return await this._invokeDictionaryWorker('databasePurgeOffscreen', {});
    }

    /** @type {import('offscreen').ApiHandler<'deleteDictionaryOffscreen'>} */
    async _deleteDictionaryHandler({dictionaryTitle}) {
        await this._invokeDictionaryWorker('deleteDictionaryOffscreen', {dictionaryTitle});
    }

    /** @type {import('offscreen').ApiHandler<'replaceDictionaryTitleOffscreen'>} */
    async _replaceDictionaryTitleHandler({fromDictionaryTitle, toDictionaryTitle, summaryOverride, replacedDictionaryTitle}) {
        await this._invokeDictionaryWorker('replaceDictionaryTitleOffscreen', {
            fromDictionaryTitle,
            toDictionaryTitle,
            summaryOverride,
            replacedDictionaryTitle,
        });
    }

    /** @type {import('offscreen').ApiHandler<'getDictionaryCountsOffscreen'>} */
    async _getDictionaryCountsHandler({dictionaryNames, getTotal}) {
        return await this._invokeDictionaryWorker('getDictionaryCountsOffscreen', {dictionaryNames, getTotal});
    }

    async _debugDictionaryStorageStateHandler() {
        return await this._invokeDictionaryWorker('debugDictionaryStorageStateOffscreen', {});
    }

    async _debugDictionaryLookupStateHandler({text, dictionaryNames}) {
        return await this._invokeDictionaryWorker('debugDictionaryLookupStateOffscreen', {text, dictionaryNames});
    }

    /** @type {import('offscreen').ApiHandler<'databaseGetMediaOffscreen'>} */
    async _getMediaHandler({targets}) {
        return await this._invokeDictionaryWorker('databaseGetMediaOffscreen', {targets});
    }

    /** @type {import('offscreen').ApiHandler<'databaseExportOffscreen'>} */
    async _exportDatabaseHandler() {
        return await this._invokeDictionaryWorker('databaseExportOffscreen', {});
    }

    /** @type {import('offscreen').ApiHandler<'databaseImportOffscreen'>} */
    async _importDatabaseHandler({content}) {
        await this._invokeDictionaryWorker('databaseImportOffscreen', {content});
    }

    /** @type {import('offscreen').ApiHandler<'translatorPrepareOffscreen'>} */
    async _prepareTranslatorHandler() {
        await this._invokeDictionaryWorker('translatorPrepareOffscreen', {});
    }

    /** @type {import('offscreen').ApiHandler<'findKanjiOffscreen'>} */
    async _findKanjiHandler({text, options}) {
        return await this._invokeDictionaryWorker('findKanjiOffscreen', {text, options});
    }

    /** @type {import('offscreen').ApiHandler<'findTermsOffscreen'>} */
    async _findTermsHandler({mode, text, options}) {
        return await this._invokeDictionaryWorker('findTermsOffscreen', {mode, text, options});
    }

    /** @type {import('offscreen').ApiHandler<'getTermFrequenciesOffscreen'>} */
    async _getTermFrequenciesHandler({termReadingList, dictionaries}) {
        return await this._invokeDictionaryWorker('getTermFrequenciesOffscreen', {termReadingList, dictionaries});
    }

    /** @type {import('offscreen').ApiHandler<'clearDatabaseCachesOffscreen'>} */
    async _clearDatabaseCachesHandler() {
        await this._invokeDictionaryWorker('clearDatabaseCachesOffscreen', {});
    }

    /** @type {import('extension').ChromeRuntimeOnMessageCallback<import('offscreen').ApiMessageAny>} */
    _onMessage({action, params}, _sender, callback) {
        return invokeApiMapHandler(this._apiMap, action, params, [], callback);
    }

    /**
     *
     */
    _createAndRegisterPort() {
        const mc = new MessageChannel();
        mc.port1.onmessage = this._onMcMessage.bind(this);
        mc.port1.onmessageerror = this._onMcMessageError.bind(this);
        this._api.registerOffscreenPort([mc.port2]);
    }

    /** @type {import('offscreen').McApiHandler<'connectToDatabaseWorker'>} */
    async _connectToDatabaseWorkerHandler(_params, ports) {
        if (ports.length === 0) {
            return;
        }
        await this._invokeDictionaryWorker('connectToDatabaseWorker', {}, [ports[0]]);
    }

    /** @type {import('offscreen').McApiHandler<'importDictionaryOffscreen'>} */
    async _importDictionaryOffscreenHandler({archiveContent, details}, ports) {
        if (ports.length === 0) {
            throw new Error('Offscreen import response port missing');
        }
        try {
            await this._invokeDictionaryWorker('importDictionaryOffscreen', {archiveContent, details}, [ports[0]]);
        } catch (error) {
            ports[0].postMessage({type: 'error', error: ExtensionError.serialize(error)});
            ports[0].close();
        }
    }

    /** @type {import('offscreen').ApiHandler<'sanitizeCSSOffscreen'>} */
    _sanitizeCSSOffscreen(params) {
        return sanitizeCSS(params.css);
    }

    /**
     * @param {string} action
     * @param {import('core').SerializableObject} params
     * @param {Transferable[]} [transferables]
     * @returns {Promise<any>}
     */
    _invokeDictionaryWorker(action, params, transferables = []) {
        const id = ++this._dictionaryWorkerRequestId;
        return new Promise((resolve, reject) => {
            this._dictionaryWorkerResponseHandlers.set(id, {resolve, reject});
            this._dictionaryWorker.postMessage({id, action, params}, transferables);
        });
    }

    /**
     * @param {MessageEvent<{id: number, result?: unknown, error?: import('core').SerializedError}>} event
     */
    _onDictionaryWorkerMessage(event) {
        const {id, result, error} = event.data;
        const handler = this._dictionaryWorkerResponseHandlers.get(id);
        if (typeof handler === 'undefined') {
            return;
        }
        this._dictionaryWorkerResponseHandlers.delete(id);
        if (error) {
            handler.reject(ExtensionError.deserialize(/** @type {import('core').SerializedError} */ (error)));
            return;
        }
        handler.resolve(result);
    }

    /**
     * @param {MessageEvent} event
     */
    _onDictionaryWorkerMessageError(event) {
        const error = new ExtensionError('Offscreen: Error receiving dictionary worker message');
        error.data = event;
        log.error(error);
    }

    /**
     * @param {ErrorEvent} event
     */
    _onDictionaryWorkerError(event) {
        const error = new ExtensionError('Offscreen: Dictionary worker terminated with an error');
        error.data = {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            message: event.message,
        };
        log.error(error);
    }

    /**
     * @param {MessageEvent<import('offscreen').McApiMessageAny>} event
     */
    _onMcMessage(event) {
        const {action, params} = event.data;
        invokeApiMapHandler(this._mcApiMap, action, params, [event.ports], () => {});
    }

    /**
     * @param {MessageEvent<import('offscreen').McApiMessageAny>} event
     */
    _onMcMessageError(event) {
        const error = new ExtensionError('Offscreen: Error receiving message via postMessage');
        error.data = event;
        log.error(error);
    }
}
