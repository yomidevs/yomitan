/*
 * Copyright (C) 2023-2025  Yomitan Authors
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

import sqlite3InitModule from '../../lib/sqlite/index.mjs';
import {reportDiagnostics} from '../core/diagnostics-reporter.js';

export const DICTIONARY_DB_FILE = '/dict.sqlite3';

const DICTIONARY_DB_FILE_ALT = 'dict.sqlite3';
const OPFS_SAHPOOL_VFS_NAME = 'opfs-sahpool';

let lastOpenUsedFallbackStorage = false;
/** @type {{mode: string, caller: string, runtimeContext: ReturnType<typeof getRuntimeContextDiagnostics>|null, forceFallback: boolean, opfsReadyTimeoutMs: number, opfsReadyWait: {attempts: number, elapsedMs: number, ready: boolean}|null, hasOpfsDbCtor: boolean, hasOpfsImportDb: boolean, hasWasmfsDir: boolean, hasInstallOpfsSAHPoolVfs: boolean, hasOpfsVfs: boolean, hasOpfsSahpoolVfs: boolean, opfsVfsPtr: string|number|null, opfsSahpoolVfsPtr: string|number|null, openFailureClass: 'unsupported-opfs'|'lock-contention'|'corruption'|'transient-open-race'|'unknown'|null, attempts?: Array<{strategy: string, target: string, flags: string, error: string, errorClass: 'unsupported-opfs'|'lock-contention'|'corruption'|'transient-open-race'|'unknown'}>, lastError?: string|null}} */
let lastOpenStorageDiagnostics = {
    mode: 'unknown',
    caller: 'unknown',
    runtimeContext: null,
    forceFallback: false,
    opfsReadyTimeoutMs: 0,
    opfsReadyWait: null,
    hasOpfsDbCtor: false,
    hasOpfsImportDb: false,
    hasWasmfsDir: false,
    hasInstallOpfsSAHPoolVfs: false,
    hasOpfsVfs: false,
    hasOpfsSahpoolVfs: false,
    opfsVfsPtr: null,
    opfsSahpoolVfsPtr: null,
    openFailureClass: null,
    attempts: [],
    lastError: null,
};

/**
 * @typedef {object} SqliteOpfsApi
 * @property {(path: string, recursive?: boolean, throwIfNotFound?: boolean) => Promise<void>|void} [unlink]
 * @property {(path: string, content: Uint8Array) => Promise<void>|void} [importDb]
 */

/** @type {Promise<import('@sqlite.org/sqlite-wasm').Sqlite3Static>|null} */
let sqlite3Promise = null;
/** @type {Promise<boolean>|null} */
let opfsSahpoolInstallPromise = null;
/** @type {boolean} */
let sqliteInitDiagnosticsReported = false;

/**
 * @returns {{href: string|null, origin: string|null, globalConstructor: string|null, isWindow: boolean, isWorkerGlobalScope: boolean, isServiceWorkerGlobalScope: boolean, crossOriginIsolated: boolean|null, hasSharedArrayBuffer: boolean, hasAtomics: boolean, hasNavigatorStorage: boolean, hasStorageGetDirectory: boolean, hasFileSystemHandle: boolean, hasFileSystemDirectoryHandle: boolean, hasFileSystemFileHandle: boolean, hasCreateSyncAccessHandle: boolean, userAgent: string|null}}
 */
function getRuntimeContextDiagnostics() {
    const locationValue = /** @type {Record<string, unknown>} */ (/** @type {unknown} */ (Reflect.get(globalThis, 'location') ?? {}));
    const navigatorValue = /** @type {Record<string, unknown>} */ (/** @type {unknown} */ (Reflect.get(globalThis, 'navigator') ?? {}));
    const storageValue = /** @type {Record<string, unknown>} */ (Reflect.get(navigatorValue, 'storage') ?? {});
    const ctorValue = /** @type {unknown} */ (Reflect.get(globalThis, 'constructor'));
    const ctorRecord = (typeof ctorValue === 'function') ? /** @type {Record<string, unknown>} */ (/** @type {unknown} */ (ctorValue)) : null;
    const ctorNameValue = ctorRecord !== null ? Reflect.get(ctorRecord, 'name') : null;
    const globalCtorName = typeof ctorNameValue === 'string' ? ctorNameValue : null;
    const isWindow = (typeof Window === 'function' && globalThis instanceof Window);
    const isWorkerGlobalScope = (typeof WorkerGlobalScope === 'function' && globalThis instanceof WorkerGlobalScope);
    const isServiceWorkerGlobalScope = (typeof ServiceWorkerGlobalScope === 'function' && globalThis instanceof ServiceWorkerGlobalScope);
    const crossOriginIsolatedValue = Reflect.get(globalThis, 'crossOriginIsolated');
    return {
        href: typeof locationValue.href === 'string' ? locationValue.href : null,
        origin: typeof locationValue.origin === 'string' ? locationValue.origin : null,
        globalConstructor: globalCtorName,
        isWindow,
        isWorkerGlobalScope,
        isServiceWorkerGlobalScope,
        crossOriginIsolated: typeof crossOriginIsolatedValue === 'boolean' ? crossOriginIsolatedValue : null,
        hasSharedArrayBuffer: typeof Reflect.get(globalThis, 'SharedArrayBuffer') === 'function',
        hasAtomics: typeof Reflect.get(globalThis, 'Atomics') === 'object' && Reflect.get(globalThis, 'Atomics') !== null,
        hasNavigatorStorage: typeof navigatorValue === 'object' && navigatorValue !== null && typeof storageValue === 'object' && storageValue !== null,
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
    };
}

/**
 * @returns {string[]}
 */
function getDatabasePaths() {
    return [DICTIONARY_DB_FILE, DICTIONARY_DB_FILE_ALT];
}

/**
 * @param {import('@sqlite.org/sqlite-wasm').Sqlite3Static} sqlite3
 * @returns {string[]}
 */
function getWasmfsDatabasePaths(sqlite3) {
    const getOpfsDir = sqlite3?.capi?.sqlite3_wasmfs_opfs_dir;
    if (typeof getOpfsDir !== 'function') {
        return [];
    }
    let opfsDir = '';
    try {
        opfsDir = String(getOpfsDir() ?? '');
    } catch (_) {
        return [];
    }
    if (!/^\/[^/]+$/.test(opfsDir)) {
        return [];
    }
    return [`${opfsDir}/dict.sqlite3`];
}

/**
 * @param {unknown} pointer
 * @returns {boolean}
 */
function isNonZeroPointer(pointer) {
    if (typeof pointer === 'number') {
        return Number.isFinite(pointer) && pointer !== 0;
    }
    if (typeof pointer === 'bigint') {
        return pointer !== 0n;
    }
    return pointer !== null && typeof pointer !== 'undefined';
}

/**
 * @param {unknown} pointer
 * @returns {string|number|null}
 */
function serializePointer(pointer) {
    if (typeof pointer === 'number') {
        return Number.isFinite(pointer) ? pointer : null;
    }
    if (typeof pointer === 'bigint') {
        return pointer.toString();
    }
    return null;
}

/**
 * @param {import('@sqlite.org/sqlite-wasm').Sqlite3Static} sqlite3
 * @returns {{OpfsDb: unknown, opfs: SqliteOpfsApi|undefined, hasOpfsDbCtor: boolean, hasOpfsImportDb: boolean, hasWasmfsDir: boolean, hasOpfsVfs: boolean, hasOpfsSahpoolVfs: boolean, opfsVfsPtr: string|number|null, opfsSahpoolVfsPtr: string|number|null}}
 */
function getOpfsCapabilitySnapshot(sqlite3) {
    const OpfsDb = /** @type {unknown} */ (sqlite3?.oo1?.OpfsDb);
    const opfs = /** @type {{opfs?: SqliteOpfsApi}} */ (/** @type {unknown} */ (sqlite3)).opfs;
    const findVfs = sqlite3?.capi?.sqlite3_vfs_find;
    const opfsVfsRaw = typeof findVfs === 'function' ? findVfs('opfs') : null;
    const opfsSahpoolVfsRaw = typeof findVfs === 'function' ? findVfs(OPFS_SAHPOOL_VFS_NAME) : null;
    return {
        OpfsDb,
        opfs,
        hasOpfsDbCtor: typeof OpfsDb === 'function',
        hasOpfsImportDb: typeof opfs?.importDb === 'function',
        hasWasmfsDir: getWasmfsDatabasePaths(sqlite3).length > 0,
        hasOpfsVfs: isNonZeroPointer(opfsVfsRaw),
        hasOpfsSahpoolVfs: isNonZeroPointer(opfsSahpoolVfsRaw),
        opfsVfsPtr: serializePointer(opfsVfsRaw),
        opfsSahpoolVfsPtr: serializePointer(opfsSahpoolVfsRaw),
    };
}

/**
 * @param {number} ms
 * @returns {Promise<void>}
 */
function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

/**
 * @param {string} message
 * @returns {'unsupported-opfs'|'lock-contention'|'corruption'|'transient-open-race'|'unknown'}
 */
function classifyOpenFailureMessage(message) {
    const text = message.toLowerCase();
    if (
        text.includes('no such vfs') ||
        text.includes('opfs is required') ||
        text.includes('missing sharedarraybuffer') ||
        text.includes('crossoriginisolated')
    ) {
        return 'unsupported-opfs';
    }
    if (
        text.includes('sqlite_busy') ||
        text.includes('database is locked') ||
        text.includes('database table is locked') ||
        text.includes('locked')
    ) {
        return 'lock-contention';
    }
    if (
        text.includes('sqlite_corrupt') ||
        text.includes('database disk image is malformed') ||
        text.includes('file is not a database')
    ) {
        return 'corruption';
    }
    if (
        text.includes('sqlite_cantopen') ||
        text.includes('unable to open database file')
    ) {
        return 'transient-open-race';
    }
    return 'unknown';
}

/**
 * @param {number} attempt
 * @returns {number}
 */
function getOpenRetryDelayMs(attempt) {
    const base = Math.min(1000, 50 * (2 ** attempt));
    const jitter = Math.floor(Math.random() * 25);
    return base + jitter;
}

/**
 * @param {SqliteOpfsApi|undefined} opfs
 * @returns {Promise<void>}
 */
async function deleteOpfsDatabaseFilesInternal(opfs) {
    if (typeof opfs?.unlink !== 'function') {
        return;
    }
    /** @type {string[]} */
    const targets = [];
    for (const dbPath of getDatabasePaths()) {
        targets.push(dbPath, `${dbPath}-wal`, `${dbPath}-shm`);
    }
    for (const target of targets) {
        try {
            await opfs.unlink(target, false, false);
        } catch (_) {
            // NOP - continue best-effort cleanup.
        }
    }
}

/**
 * @returns {Promise<import('@sqlite.org/sqlite-wasm').Sqlite3Static>}
 */
export async function getSqlite3() {
    if (sqlite3Promise !== null) {
        return await sqlite3Promise;
    }
    const initWithOptions = /** @type {(options: {locateFile: (file: string) => string}) => Promise<import('@sqlite.org/sqlite-wasm').Sqlite3Static>} */ (sqlite3InitModule);
    /**
     * @param {string} file
     * @returns {string}
     */
    const locateFile = (file) => new URL(`../../lib/sqlite/${file}`, import.meta.url).href;
    sqlite3Promise = initWithOptions({
        locateFile,
    });
    const sqlite3 = await sqlite3Promise;
    if (!sqliteInitDiagnosticsReported) {
        sqliteInitDiagnosticsReported = true;
        const snapshot = getOpfsCapabilitySnapshot(sqlite3);
        reportDiagnostics('opfs-sqlite-init', {
            context: getRuntimeContextDiagnostics(),
            hasOpfsDbCtor: snapshot.hasOpfsDbCtor,
            hasInstallOpfsSAHPoolVfs: typeof Reflect.get(sqlite3, 'installOpfsSAHPoolVfs') === 'function',
            hasOpfsImportDb: snapshot.hasOpfsImportDb,
            hasWasmfsDir: snapshot.hasWasmfsDir,
            hasOpfsVfs: snapshot.hasOpfsVfs,
            hasOpfsSahpoolVfs: snapshot.hasOpfsSahpoolVfs,
            opfsVfsPtr: snapshot.opfsVfsPtr,
            opfsSahpoolVfsPtr: snapshot.opfsSahpoolVfsPtr,
            sqliteVersion: sqlite3?.version?.libVersion ?? null,
        });
    }
    return sqlite3;
}

/**
 * @param {string} [caller]
 * @returns {Promise<import('@sqlite.org/sqlite-wasm').Database>}
 */
export async function openOpfsDatabase(caller = 'unknown') {
    lastOpenUsedFallbackStorage = false;
    const sqlite3 = await getSqlite3();
    const allowFallback = (
        Reflect.get(globalThis, 'yomitanRequireOpfs') === false ||
        Reflect.get(globalThis, 'yomitanAllowSqliteMemoryFallback') === true ||
        typeof Reflect.get(globalThis, 'chrome') === 'undefined'
    );
    const forceFallback = Reflect.get(globalThis, 'yomitanForceSqliteFallback') === true;
    const installOpfsSAHPoolVfs = /** @type {unknown} */ (Reflect.get(sqlite3, 'installOpfsSAHPoolVfs'));
    const contextDiagnostics = getRuntimeContextDiagnostics();
    const opfsReadyTimeoutMsRaw = /** @type {unknown} */ (Reflect.get(globalThis, 'yomitanOpfsReadyTimeoutMs'));
    const opfsReadyTimeoutMs = (
        typeof opfsReadyTimeoutMsRaw === 'number' &&
        Number.isFinite(opfsReadyTimeoutMsRaw) &&
        opfsReadyTimeoutMsRaw >= 0
    ) ?
        opfsReadyTimeoutMsRaw :
        3000;
    let capability = getOpfsCapabilitySnapshot(sqlite3);
    lastOpenStorageDiagnostics = {
        mode: 'opening',
        caller,
        runtimeContext: contextDiagnostics,
        forceFallback,
        opfsReadyTimeoutMs,
        opfsReadyWait: null,
        hasOpfsDbCtor: capability.hasOpfsDbCtor,
        hasOpfsImportDb: capability.hasOpfsImportDb,
        hasWasmfsDir: capability.hasWasmfsDir,
        hasInstallOpfsSAHPoolVfs: typeof installOpfsSAHPoolVfs === 'function',
        hasOpfsVfs: capability.hasOpfsVfs,
        hasOpfsSahpoolVfs: capability.hasOpfsSahpoolVfs,
        opfsVfsPtr: capability.opfsVfsPtr,
        opfsSahpoolVfsPtr: capability.opfsSahpoolVfsPtr,
        openFailureClass: null,
        attempts: [],
        lastError: null,
    };
    const attempts = /** @type {Array<{strategy: string, target: string, flags: string, error: string, errorClass: 'unsupported-opfs'|'lock-contention'|'corruption'|'transient-open-race'|'unknown'}>} */ (lastOpenStorageDiagnostics.attempts);
    /**
     * @param {string} strategy
     * @param {string} target
     * @param {string} flags
     * @param {unknown} error
     */
    const pushAttemptError = (strategy, target, flags, error) => {
        const message = (error instanceof Error) ? error.message : String(error);
        const errorClass = classifyOpenFailureMessage(message);
        attempts.push({strategy, target, flags, error: message, errorClass});
        if (attempts.length > 40) {
            attempts.shift();
        }
        lastOpenStorageDiagnostics.lastError = message;
        lastOpenStorageDiagnostics.openFailureClass = errorClass;
    };
    /**
     * @returns {ReturnType<typeof getOpfsCapabilitySnapshot>}
     */
    const syncCapabilityIntoDiagnostics = () => {
        capability = getOpfsCapabilitySnapshot(sqlite3);
        lastOpenStorageDiagnostics.hasOpfsDbCtor = capability.hasOpfsDbCtor;
        lastOpenStorageDiagnostics.hasOpfsImportDb = capability.hasOpfsImportDb;
        lastOpenStorageDiagnostics.hasWasmfsDir = capability.hasWasmfsDir;
        lastOpenStorageDiagnostics.hasOpfsVfs = capability.hasOpfsVfs;
        lastOpenStorageDiagnostics.hasOpfsSahpoolVfs = capability.hasOpfsSahpoolVfs;
        lastOpenStorageDiagnostics.opfsVfsPtr = capability.opfsVfsPtr;
        lastOpenStorageDiagnostics.opfsSahpoolVfsPtr = capability.opfsSahpoolVfsPtr;
        return capability;
    };
    /**
     * @returns {boolean}
     */
    const isOpfsReadyForOpen = () => (
        capability.hasOpfsDbCtor ||
        capability.hasOpfsVfs ||
        capability.hasWasmfsDir ||
        capability.hasOpfsImportDb ||
        capability.hasOpfsSahpoolVfs
    );
    reportDiagnostics('opfs-open-begin', {
        caller,
        allowFallback,
        forceFallback,
        opfsReadyTimeoutMs,
        context: contextDiagnostics,
        diagnostics: lastOpenStorageDiagnostics,
    });
    if (forceFallback) {
        lastOpenStorageDiagnostics.mode = 'forced-fallback-disallowed';
        reportDiagnostics('opfs-open-failed', {
            stage: 'forced-fallback-disallowed',
            caller,
            context: contextDiagnostics,
            diagnostics: lastOpenStorageDiagnostics,
        });
        throw new Error(`OPFS is required; forced fallback is disabled. diagnostics=${JSON.stringify(lastOpenStorageDiagnostics)}`);
    }
    if (!isOpfsReadyForOpen() && opfsReadyTimeoutMs > 0) {
        const start = Date.now();
        let waitAttempts = 0;
        while ((Date.now() - start) < opfsReadyTimeoutMs) {
            await sleep(100);
            ++waitAttempts;
            syncCapabilityIntoDiagnostics();
            if (isOpfsReadyForOpen()) { break; }
        }
        lastOpenStorageDiagnostics.opfsReadyWait = {
            attempts: waitAttempts,
            elapsedMs: Date.now() - start,
            ready: isOpfsReadyForOpen(),
        };
    }
    syncCapabilityIntoDiagnostics();
    /**
     * @returns {import('@sqlite.org/sqlite-wasm').Database|null}
     */
    const tryOpenWasmfsPersistent = () => {
        const persistentPaths = getWasmfsDatabasePaths(sqlite3);
        for (const dbPath of persistentPaths) {
            for (const flags of ['cw', 'c']) {
                try {
                    return new sqlite3.oo1.DB(dbPath, flags);
                } catch (error) {
                    pushAttemptError('wasmfs-persistent', dbPath, flags, error);
                    // Try the next wasmfs path/flag combination.
                }
            }
        }
        return null;
    };
    /**
     * @returns {import('@sqlite.org/sqlite-wasm').Database|null}
     */
    const tryOpenViaUri = () => {
        for (const dbPath of getDatabasePaths()) {
            const uri = `file:${dbPath}?vfs=opfs`;
            for (const flags of ['cw', 'c']) {
                try {
                    return new sqlite3.oo1.DB(uri, flags);
                } catch (error) {
                    pushAttemptError('uri-opfs', uri, flags, error);
                    // Try the next URI/flag combination.
                }
            }
        }
        return null;
    };
    /**
     * @returns {import('@sqlite.org/sqlite-wasm').Database|null}
     */
    const tryOpenViaSahpoolUri = () => {
        for (const dbPath of getDatabasePaths()) {
            const uri = `file:${dbPath}?vfs=${OPFS_SAHPOOL_VFS_NAME}`;
            for (const flags of ['cw', 'c']) {
                try {
                    return new sqlite3.oo1.DB(uri, flags);
                } catch (error) {
                    pushAttemptError('uri-opfs-sahpool', uri, flags, error);
                    // Try the next URI/flag combination.
                }
            }
        }
        return null;
    };
    /**
     * @returns {Promise<boolean>}
     */
    const ensureOpfsSahpoolVfs = async () => {
        const findVfs2 = sqlite3?.capi?.sqlite3_vfs_find;
        if (typeof findVfs2 === 'function' && isNonZeroPointer(findVfs2(OPFS_SAHPOOL_VFS_NAME))) {
            return true;
        }
        if (typeof installOpfsSAHPoolVfs !== 'function') {
            return false;
        }
        if (opfsSahpoolInstallPromise === null) {
            opfsSahpoolInstallPromise = (async () => {
                try {
                    await /** @type {(opts: {name?: string}) => Promise<unknown>} */ (installOpfsSAHPoolVfs)({
                        name: OPFS_SAHPOOL_VFS_NAME,
                    });
                    return true;
                } catch (error) {
                    pushAttemptError('install-opfs-sahpool-vfs', OPFS_SAHPOOL_VFS_NAME, '-', error);
                    return false;
                }
            })();
        }
        const installed = await opfsSahpoolInstallPromise;
        syncCapabilityIntoDiagnostics();
        if (typeof findVfs2 === 'function') {
            return isNonZeroPointer(findVfs2(OPFS_SAHPOOL_VFS_NAME));
        }
        return installed;
    };
    if (typeof sqlite3.oo1.OpfsDb === 'function') {
        const OpfsDb = sqlite3.oo1.OpfsDb;
        /**
         * @returns {import('@sqlite.org/sqlite-wasm').Database|null}
         */
        const tryOpen = () => {
            for (const dbPath of getDatabasePaths()) {
                for (const flags of ['cw', 'c']) {
                    try {
                        return new OpfsDb(dbPath, flags);
                    } catch (error) {
                        pushAttemptError('opfsdb', dbPath, flags, error);
                        // Try the next path/flag combination.
                    }
                }
            }
            return null;
        };

        /**
         * @returns {Promise<import('@sqlite.org/sqlite-wasm').Database|null>}
         */
        const tryOpenWithRetry = async () => {
            const maxAttempts = 8;
            for (let attempt = 0; attempt < maxAttempts; ++attempt) {
                const opened = tryOpen();
                if (opened !== null) { return opened; }
                const retryableError = attempts.length > 0 ? attempts[attempts.length - 1].error : '';
                const retryableErrorClass = classifyOpenFailureMessage(retryableError);
                const shouldRetry = (
                    retryableErrorClass === 'lock-contention' ||
                    retryableErrorClass === 'transient-open-race'
                );
                if (!shouldRetry) { break; }
                await sleep(getOpenRetryDelayMs(attempt));
            }
            return null;
        };

        const opened = await tryOpenWithRetry();
        if (opened !== null) {
            lastOpenStorageDiagnostics.mode = 'opfsdb';
            reportDiagnostics('opfs-open-success', {
                caller,
                context: contextDiagnostics,
                diagnostics: lastOpenStorageDiagnostics,
            });
            return opened;
        }
    }

    const openedViaUri = tryOpenViaUri();
    if (openedViaUri !== null) {
        lastOpenStorageDiagnostics.mode = 'uri-opfs';
        reportDiagnostics('opfs-open-success', {
            caller,
            context: contextDiagnostics,
            diagnostics: lastOpenStorageDiagnostics,
        });
        return openedViaUri;
    }

    const openedViaWasmfsPersistentPath = tryOpenWasmfsPersistent();
    if (openedViaWasmfsPersistentPath !== null) {
        lastOpenStorageDiagnostics.mode = 'wasmfs-persistent';
        reportDiagnostics('opfs-open-success', {
            caller,
            context: contextDiagnostics,
            diagnostics: lastOpenStorageDiagnostics,
        });
        return openedViaWasmfsPersistentPath;
    }

    if (await ensureOpfsSahpoolVfs()) {
        const openedViaSahpoolUri = tryOpenViaSahpoolUri();
        if (openedViaSahpoolUri !== null) {
            lastOpenStorageDiagnostics.mode = 'uri-opfs-sahpool';
            syncCapabilityIntoDiagnostics();
            reportDiagnostics('opfs-open-success', {
                caller,
                context: contextDiagnostics,
                diagnostics: lastOpenStorageDiagnostics,
            });
            return openedViaSahpoolUri;
        }
        syncCapabilityIntoDiagnostics();
    }

    if (!allowFallback) {
        syncCapabilityIntoDiagnostics();
        lastOpenStorageDiagnostics.mode = 'opfs-unavailable';
        reportDiagnostics('opfs-open-failed', {
            stage: 'opfs-unavailable',
            caller,
            context: contextDiagnostics,
            diagnostics: lastOpenStorageDiagnostics,
            failureClass: lastOpenStorageDiagnostics.openFailureClass,
        });
        throw new Error(`OPFS is required but unavailable. diagnostics=${JSON.stringify(lastOpenStorageDiagnostics)}`);
    }

    lastOpenUsedFallbackStorage = true;
    try {
        lastOpenStorageDiagnostics.mode = 'fallback-memory';
        reportDiagnostics('opfs-open-fallback-memory', {
            caller,
            context: contextDiagnostics,
            diagnostics: lastOpenStorageDiagnostics,
        });
        return new sqlite3.oo1.DB(':memory:', 'ct');
    } catch (e) {
        lastOpenStorageDiagnostics.mode = 'fallback-memory-open-failed';
        lastOpenStorageDiagnostics.openFailureClass = classifyOpenFailureMessage(String(e));
        reportDiagnostics('opfs-open-failed', {
            stage: 'fallback-memory-open-failed',
            caller,
            context: contextDiagnostics,
            diagnostics: lastOpenStorageDiagnostics,
            failureClass: lastOpenStorageDiagnostics.openFailureClass,
            error: String(e),
        });
        throw new Error(`Fallback in-memory database open failed. diagnostics=${JSON.stringify(lastOpenStorageDiagnostics)} error=${String(e)}`);
    }
}

/**
 * @returns {boolean}
 */
export function didLastOpenUseFallbackStorage() {
    return lastOpenUsedFallbackStorage;
}

/**
 * @returns {{mode: string, caller: string, runtimeContext: ReturnType<typeof getRuntimeContextDiagnostics>|null, forceFallback: boolean, opfsReadyTimeoutMs: number, opfsReadyWait: {attempts: number, elapsedMs: number, ready: boolean}|null, hasOpfsDbCtor: boolean, hasOpfsImportDb: boolean, hasWasmfsDir: boolean, hasInstallOpfsSAHPoolVfs: boolean, hasOpfsVfs: boolean, hasOpfsSahpoolVfs: boolean, opfsVfsPtr: string|number|null, opfsSahpoolVfsPtr: string|number|null, openFailureClass: 'unsupported-opfs'|'lock-contention'|'corruption'|'transient-open-race'|'unknown'|null}}
 */
export function getLastOpenStorageDiagnostics() {
    return {...lastOpenStorageDiagnostics};
}

/**
 * @returns {Promise<boolean>}
 */
export async function deleteOpfsDatabaseFiles() {
    const sqlite3 = await getSqlite3();
    const allowFallback = (
        Reflect.get(globalThis, 'yomitanRequireOpfs') === false ||
        Reflect.get(globalThis, 'yomitanAllowSqliteMemoryFallback') === true ||
        typeof Reflect.get(globalThis, 'chrome') === 'undefined'
    );
    const opfs = /** @type {{opfs?: SqliteOpfsApi}} */ (/** @type {unknown} */ (sqlite3)).opfs;
    if (typeof opfs?.unlink !== 'function') {
        reportDiagnostics('opfs-delete-files-unavailable', {
            allowFallback,
            context: getRuntimeContextDiagnostics(),
            diagnostics: getLastOpenStorageDiagnostics(),
        });
        if (allowFallback) {
            return false;
        }
        throw new Error('OPFS unlink API is unavailable');
    }
    await deleteOpfsDatabaseFilesInternal(opfs);

    return true;
}

/**
 * @param {ArrayBuffer} content
 * @returns {Promise<void>}
 */
export async function importOpfsDatabase(content) {
    const sqlite3 = await getSqlite3();
    const opfs = /** @type {{opfs?: SqliteOpfsApi}} */ (/** @type {unknown} */ (sqlite3)).opfs;
    if (typeof opfs?.importDb !== 'function') {
        reportDiagnostics('opfs-import-db-unavailable', {
            context: getRuntimeContextDiagnostics(),
            diagnostics: getLastOpenStorageDiagnostics(),
            contentBytes: content.byteLength,
        });
        throw new Error('OPFS importDb API is unavailable');
    }
    const bytes = new Uint8Array(content);
    for (const dbPath of getDatabasePaths()) {
        try {
            await opfs.importDb(dbPath, bytes);
            return;
        } catch (_) {
            // Try alternate path variant.
        }
    }
    throw new Error('Failed to import OPFS database using available path variants');
}
