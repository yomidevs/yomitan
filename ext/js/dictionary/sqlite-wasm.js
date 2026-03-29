/*
 * Copyright (C) 2026  Manabitan authors
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

const OPFS_SAHPOOL_VFS_NAME = 'opfs-sahpool';
const OPFS_SAHPOOL_DIRECTORY = '/manabitan/sqlite-sahpool-v1';
const OPFS_SAHPOOL_MIN_CAPACITY = 8;

/** @type {Promise<import('@sqlite.org/sqlite-wasm').Sqlite3Static>|null} */
let sqlite3Promise = null;
/** @type {Promise<import('@sqlite.org/sqlite-wasm').SAHPoolUtil>|null} */
let opfsSahpoolPromise = null;
/** @type {boolean} */
let sqliteInitDiagnosticsReported = false;

/** @type {{mode: string, caller: string, runtimeContext: ReturnType<typeof getRuntimeContextDiagnostics>|null, forceFallback: boolean, opfsReadyTimeoutMs: number, opfsReadyWait: {attempts: number, elapsedMs: number, ready: boolean}|null, hasOpfsDbCtor: boolean, hasOpfsImportDb: boolean, hasWasmfsDir: boolean, hasInstallOpfsSAHPoolVfs: boolean, hasOpfsVfs: boolean, hasOpfsSahpoolVfs: boolean, opfsVfsPtr: string|number|null, opfsSahpoolVfsPtr: string|number|null, opfsSahpoolInstallAttempted: boolean, opfsSahpoolInstallResult: string|null, opfsSahpoolInstallError: string|null, opfsSahpoolDirectory: string|null, opfsSahpoolCapacity: number|null, opfsSahpoolFileCount: number|null, opfsSahpoolFileNames: string[]|null, openFailureClass: 'unsupported-opfs'|'lock-contention'|'corruption'|'transient-open-race'|'worker-required'|'unknown'|null, attempts?: Array<{strategy: string, target: string, flags: string, error: string, errorClass: 'unsupported-opfs'|'lock-contention'|'corruption'|'transient-open-race'|'worker-required'|'unknown'}>, lastError?: string|null}} */
let lastOpenStorageDiagnostics = createInitialDiagnostics('unknown');

function createInitialDiagnostics(caller) {
    return {
        mode: 'unknown',
        caller,
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
        opfsSahpoolInstallAttempted: false,
        opfsSahpoolInstallResult: null,
        opfsSahpoolInstallError: null,
        opfsSahpoolDirectory: null,
        opfsSahpoolCapacity: null,
        opfsSahpoolFileCount: null,
        opfsSahpoolFileNames: null,
        openFailureClass: null,
        attempts: [],
        lastError: null,
    };
}

/**
 * @returns {{href: string|null, origin: string|null, globalConstructor: string|null, isWindow: boolean, isWorkerGlobalScope: boolean, isServiceWorkerGlobalScope: boolean, isDedicatedWorkerGlobalScope: boolean, crossOriginIsolated: boolean|null, hasSharedArrayBuffer: boolean, hasAtomics: boolean, hasNavigatorStorage: boolean, hasStorageGetDirectory: boolean, hasFileSystemHandle: boolean, hasFileSystemDirectoryHandle: boolean, hasFileSystemFileHandle: boolean, hasCreateSyncAccessHandle: boolean, userAgent: string|null}}
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
        isDedicatedWorkerGlobalScope: isWorkerGlobalScope && !isServiceWorkerGlobalScope && globalCtorName === 'DedicatedWorkerGlobalScope',
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
 * @param {string} message
 * @returns {'unsupported-opfs'|'lock-contention'|'corruption'|'transient-open-race'|'worker-required'|'unknown'}
 */
function classifyOpenFailureMessage(message) {
    const text = message.toLowerCase();
    if (
        text.includes('dedicated worker') ||
        text.includes('workers only') ||
        text.includes('syncaccesshandle') ||
        text.includes('worker runtime')
    ) {
        return 'worker-required';
    }
    if (
        text.includes('no such vfs') ||
        text.includes('opfs is required') ||
        text.includes('createSyncAccessHandle'.toLowerCase()) ||
        text.includes('getdirectory') ||
        text.includes('file system access')
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
 * @param {import('@sqlite.org/sqlite-wasm').Sqlite3Static} sqlite3
 * @returns {{hasOpfsDbCtor: boolean, hasOpfsImportDb: boolean, hasWasmfsDir: boolean, hasOpfsVfs: boolean, hasOpfsSahpoolVfs: boolean, opfsVfsPtr: string|number|null, opfsSahpoolVfsPtr: string|number|null}}
 */
function getOpfsCapabilitySnapshot(sqlite3) {
    const findVfs = sqlite3?.capi?.sqlite3_vfs_find;
    const opfsVfsRaw = typeof findVfs === 'function' ? findVfs('opfs') : null;
    const opfsSahpoolVfsRaw = typeof findVfs === 'function' ? findVfs(OPFS_SAHPOOL_VFS_NAME) : null;
    return {
        hasOpfsDbCtor: typeof sqlite3?.oo1?.OpfsDb === 'function',
        hasOpfsImportDb: typeof /** @type {{opfs?: {importDb?: unknown}}} */ (/** @type {unknown} */ (sqlite3)).opfs?.importDb === 'function',
        hasWasmfsDir: typeof sqlite3?.capi?.sqlite3_wasmfs_opfs_dir === 'function',
        hasOpfsVfs: isNonZeroPointer(opfsVfsRaw),
        hasOpfsSahpoolVfs: isNonZeroPointer(opfsSahpoolVfsRaw),
        opfsVfsPtr: serializePointer(opfsVfsRaw),
        opfsSahpoolVfsPtr: serializePointer(opfsSahpoolVfsRaw),
    };
}

/**
 * @param {string} caller
 * @returns {void}
 */
function resetOpenDiagnostics(caller) {
    lastOpenStorageDiagnostics = createInitialDiagnostics(caller);
    lastOpenStorageDiagnostics.runtimeContext = getRuntimeContextDiagnostics();
}

/**
 * @param {string} strategy
 * @param {string} target
 * @param {string} flags
 * @param {unknown} error
 * @returns {void}
 */
function pushAttemptError(strategy, target, flags, error) {
    const message = (error instanceof Error) ? error.message : String(error);
    const errorClass = classifyOpenFailureMessage(message);
    const attempts = /** @type {NonNullable<typeof lastOpenStorageDiagnostics.attempts>} */ (lastOpenStorageDiagnostics.attempts ?? []);
    attempts.push({strategy, target, flags, error: message, errorClass});
    if (attempts.length > 40) {
        attempts.shift();
    }
    lastOpenStorageDiagnostics.attempts = attempts;
    lastOpenStorageDiagnostics.lastError = message;
    lastOpenStorageDiagnostics.openFailureClass = errorClass;
}

/**
 * @param {import('@sqlite.org/sqlite-wasm').Sqlite3Static} sqlite3
 * @returns {void}
 */
function syncCapabilityIntoDiagnostics(sqlite3) {
    const snapshot = getOpfsCapabilitySnapshot(sqlite3);
    lastOpenStorageDiagnostics.hasOpfsDbCtor = snapshot.hasOpfsDbCtor;
    lastOpenStorageDiagnostics.hasOpfsImportDb = snapshot.hasOpfsImportDb;
    lastOpenStorageDiagnostics.hasWasmfsDir = snapshot.hasWasmfsDir;
    lastOpenStorageDiagnostics.hasOpfsVfs = snapshot.hasOpfsVfs;
    lastOpenStorageDiagnostics.hasOpfsSahpoolVfs = snapshot.hasOpfsSahpoolVfs;
    lastOpenStorageDiagnostics.opfsVfsPtr = snapshot.opfsVfsPtr;
    lastOpenStorageDiagnostics.opfsSahpoolVfsPtr = snapshot.opfsSahpoolVfsPtr;
    lastOpenStorageDiagnostics.hasInstallOpfsSAHPoolVfs = typeof Reflect.get(sqlite3, 'installOpfsSAHPoolVfs') === 'function';
    lastOpenStorageDiagnostics.opfsSahpoolDirectory = OPFS_SAHPOOL_DIRECTORY;
}

/**
 * @returns {Promise<import('@sqlite.org/sqlite-wasm').Sqlite3Static>}
 */
export async function getSqlite3() {
    if (sqlite3Promise !== null) {
        return await sqlite3Promise;
    }
    const initWithOptions = /** @type {(options: {locateFile: (file: string) => string}) => Promise<import('@sqlite.org/sqlite-wasm').Sqlite3Static>} */ (sqlite3InitModule);
    const locateFile = (file) => new URL(`../../lib/sqlite/${file}`, import.meta.url).href;
    sqlite3Promise = initWithOptions({locateFile});
    const sqlite3 = await sqlite3Promise;
    if (!sqliteInitDiagnosticsReported) {
        sqliteInitDiagnosticsReported = true;
        const snapshot = getOpfsCapabilitySnapshot(sqlite3);
        reportDiagnostics('opfs-sqlite-init', {
            context: getRuntimeContextDiagnostics(),
            hasInstallOpfsSAHPoolVfs: typeof Reflect.get(sqlite3, 'installOpfsSAHPoolVfs') === 'function',
            hasOpfsDbCtor: snapshot.hasOpfsDbCtor,
            hasOpfsImportDb: snapshot.hasOpfsImportDb,
            hasWasmfsDir: snapshot.hasWasmfsDir,
            hasOpfsVfs: snapshot.hasOpfsVfs,
            hasOpfsSahpoolVfs: snapshot.hasOpfsSahpoolVfs,
            opfsVfsPtr: snapshot.opfsVfsPtr,
            opfsSahpoolVfsPtr: snapshot.opfsSahpoolVfsPtr,
            sqliteVersion: sqlite3?.version?.libVersion ?? null,
            opfsSahpoolDirectory: OPFS_SAHPOOL_DIRECTORY,
            opfsSahpoolMinCapacity: OPFS_SAHPOOL_MIN_CAPACITY,
        });
    }
    return sqlite3;
}

/**
 * @param {import('@sqlite.org/sqlite-wasm').Sqlite3Static} sqlite3
 * @returns {Promise<import('@sqlite.org/sqlite-wasm').SAHPoolUtil>}
 */
async function ensureOpfsSahpool(sqlite3) {
    if (opfsSahpoolPromise !== null) {
        return await opfsSahpoolPromise;
    }
    const installOpfsSAHPoolVfs = /** @type {unknown} */ (Reflect.get(sqlite3, 'installOpfsSAHPoolVfs'));
    if (typeof installOpfsSAHPoolVfs !== 'function') {
        throw new Error('sqlite-wasm build does not expose installOpfsSAHPoolVfs()');
    }
    opfsSahpoolPromise = (async () => {
        const context = getRuntimeContextDiagnostics();
        if (!context.isDedicatedWorkerGlobalScope) {
            throw new Error(`opfs-sahpool requires a DedicatedWorkerGlobalScope. runtimeContext=${JSON.stringify(context)}`);
        }
        if (!context.hasStorageGetDirectory || !context.hasCreateSyncAccessHandle) {
            throw new Error(`opfs-sahpool runtime prerequisites are unavailable. runtimeContext=${JSON.stringify(context)}`);
        }
        lastOpenStorageDiagnostics.opfsSahpoolInstallAttempted = true;
        try {
            const poolUtil = await /** @type {(opts: {name?: string, directory?: string, initialCapacity?: number}) => Promise<import('@sqlite.org/sqlite-wasm').SAHPoolUtil>} */ (installOpfsSAHPoolVfs)({
                name: OPFS_SAHPOOL_VFS_NAME,
                directory: OPFS_SAHPOOL_DIRECTORY,
                initialCapacity: OPFS_SAHPOOL_MIN_CAPACITY,
            });
            await poolUtil.reserveMinimumCapacity(OPFS_SAHPOOL_MIN_CAPACITY);
            lastOpenStorageDiagnostics.opfsSahpoolInstallResult = 'installed';
            lastOpenStorageDiagnostics.opfsSahpoolInstallError = null;
            lastOpenStorageDiagnostics.opfsSahpoolCapacity = poolUtil.getCapacity();
            lastOpenStorageDiagnostics.opfsSahpoolFileCount = poolUtil.getFileCount();
            lastOpenStorageDiagnostics.opfsSahpoolFileNames = poolUtil.getFileNames();
            return poolUtil;
        } catch (error) {
            const message = (error instanceof Error) ? error.message : String(error);
            lastOpenStorageDiagnostics.opfsSahpoolInstallResult = 'failed';
            lastOpenStorageDiagnostics.opfsSahpoolInstallError = message;
            pushAttemptError('install-opfs-sahpool-vfs', OPFS_SAHPOOL_DIRECTORY, '-', error);
            throw error;
        }
    })();
    return await opfsSahpoolPromise;
}

/**
 * @param {string} [caller]
 * @returns {Promise<import('@sqlite.org/sqlite-wasm').Database>}
 */
export async function openOpfsDatabase(caller = 'unknown') {
    resetOpenDiagnostics(caller);
    const sqlite3 = await getSqlite3();
    syncCapabilityIntoDiagnostics(sqlite3);
    reportDiagnostics('opfs-open-begin', {
        caller,
        allowFallback: false,
        forceFallback: false,
        opfsReadyTimeoutMs: 0,
        context: lastOpenStorageDiagnostics.runtimeContext,
        diagnostics: lastOpenStorageDiagnostics,
    });
    try {
        const poolUtil = await ensureOpfsSahpool(sqlite3);
        lastOpenStorageDiagnostics.mode = 'opfs-sahpool';
        lastOpenStorageDiagnostics.hasOpfsSahpoolVfs = true;
        lastOpenStorageDiagnostics.opfsSahpoolCapacity = poolUtil.getCapacity();
        lastOpenStorageDiagnostics.opfsSahpoolFileCount = poolUtil.getFileCount();
        lastOpenStorageDiagnostics.opfsSahpoolFileNames = poolUtil.getFileNames();
        const opened = new poolUtil.OpfsSAHPoolDb(DICTIONARY_DB_FILE);
        reportDiagnostics('opfs-open-success', {
            caller,
            context: lastOpenStorageDiagnostics.runtimeContext,
            diagnostics: lastOpenStorageDiagnostics,
        });
        return opened;
    } catch (error) {
        syncCapabilityIntoDiagnostics(sqlite3);
        lastOpenStorageDiagnostics.mode = 'opfs-sahpool-unavailable';
        if (lastOpenStorageDiagnostics.openFailureClass === null) {
            lastOpenStorageDiagnostics.openFailureClass = classifyOpenFailureMessage((error instanceof Error) ? error.message : String(error));
        }
        reportDiagnostics('opfs-open-failed', {
            stage: 'opfs-sahpool-unavailable',
            caller,
            context: lastOpenStorageDiagnostics.runtimeContext,
            diagnostics: lastOpenStorageDiagnostics,
            failureClass: lastOpenStorageDiagnostics.openFailureClass,
        });
        throw new Error(`OPFS sahpool database open failed: ${(error instanceof Error) ? error.message : String(error)}. diagnostics=${JSON.stringify(lastOpenStorageDiagnostics)}`);
    }
}

/**
 * @returns {boolean}
 */
export function didLastOpenUseFallbackStorage() {
    return false;
}

/**
 * @returns {{mode: string, caller: string, runtimeContext: ReturnType<typeof getRuntimeContextDiagnostics>|null, forceFallback: boolean, opfsReadyTimeoutMs: number, opfsReadyWait: {attempts: number, elapsedMs: number, ready: boolean}|null, hasOpfsDbCtor: boolean, hasOpfsImportDb: boolean, hasWasmfsDir: boolean, hasInstallOpfsSAHPoolVfs: boolean, hasOpfsVfs: boolean, hasOpfsSahpoolVfs: boolean, opfsVfsPtr: string|number|null, opfsSahpoolVfsPtr: string|number|null, opfsSahpoolInstallAttempted: boolean, opfsSahpoolInstallResult: string|null, opfsSahpoolInstallError: string|null, opfsSahpoolDirectory: string|null, opfsSahpoolCapacity: number|null, opfsSahpoolFileCount: number|null, opfsSahpoolFileNames: string[]|null, openFailureClass: 'unsupported-opfs'|'lock-contention'|'corruption'|'transient-open-race'|'worker-required'|'unknown'|null}}
 */
export function getLastOpenStorageDiagnostics() {
    return {...lastOpenStorageDiagnostics};
}

/**
 * @returns {Promise<boolean>}
 */
export async function deleteOpfsDatabaseFiles() {
    const sqlite3 = await getSqlite3();
    syncCapabilityIntoDiagnostics(sqlite3);
    try {
        const poolUtil = await ensureOpfsSahpool(sqlite3);
        await poolUtil.wipeFiles();
        lastOpenStorageDiagnostics.opfsSahpoolCapacity = poolUtil.getCapacity();
        lastOpenStorageDiagnostics.opfsSahpoolFileCount = poolUtil.getFileCount();
        lastOpenStorageDiagnostics.opfsSahpoolFileNames = poolUtil.getFileNames();
        return true;
    } catch (error) {
        reportDiagnostics('opfs-delete-files-unavailable', {
            context: getRuntimeContextDiagnostics(),
            diagnostics: getLastOpenStorageDiagnostics(),
            error: (error instanceof Error) ? error.message : String(error),
        });
        throw error;
    }
}

/**
 * @param {ArrayBuffer} content
 * @returns {Promise<void>}
 */
export async function importOpfsDatabase(content) {
    const sqlite3 = await getSqlite3();
    syncCapabilityIntoDiagnostics(sqlite3);
    try {
        const poolUtil = await ensureOpfsSahpool(sqlite3);
        await poolUtil.importDb(DICTIONARY_DB_FILE, new Uint8Array(content));
        lastOpenStorageDiagnostics.opfsSahpoolCapacity = poolUtil.getCapacity();
        lastOpenStorageDiagnostics.opfsSahpoolFileCount = poolUtil.getFileCount();
        lastOpenStorageDiagnostics.opfsSahpoolFileNames = poolUtil.getFileNames();
    } catch (error) {
        reportDiagnostics('opfs-import-db-unavailable', {
            context: getRuntimeContextDiagnostics(),
            diagnostics: getLastOpenStorageDiagnostics(),
            contentBytes: content.byteLength,
            error: (error instanceof Error) ? error.message : String(error),
        });
        throw error;
    }
}
