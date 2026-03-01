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

const DICTIONARY_DB_FILE_ALT = 'dict.sqlite3';

let lastOpenUsedFallbackStorage = false;
/** @type {{mode: string, forceFallback: boolean, hasOpfsDbCtor: boolean, hasOpfsImportDb: boolean, hasWasmfsDir: boolean, attempts?: Array<{strategy: string, target: string, flags: string, error: string}>, lastError?: string|null}} */
let lastOpenStorageDiagnostics = {
    mode: 'unknown',
    forceFallback: false,
    hasOpfsDbCtor: false,
    hasOpfsImportDb: false,
    hasWasmfsDir: false,
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
    return await sqlite3Promise;
}

/**
 * @returns {Promise<import('@sqlite.org/sqlite-wasm').Database>}
 */
export async function openOpfsDatabase() {
    lastOpenUsedFallbackStorage = false;
    const sqlite3 = await getSqlite3();
    const allowFallback = (
        Reflect.get(globalThis, 'manabitanRequireOpfs') === false ||
        Reflect.get(globalThis, 'manabitanAllowSqliteMemoryFallback') === true ||
        typeof Reflect.get(globalThis, 'chrome') === 'undefined'
    );
    const forceFallback = Reflect.get(globalThis, 'manabitanForceSqliteFallback') === true;
    const OpfsDb = sqlite3.oo1.OpfsDb;
    const opfs = /** @type {{opfs?: SqliteOpfsApi}} */ (/** @type {unknown} */ (sqlite3)).opfs;
    const wasmfsPaths = getWasmfsDatabasePaths(sqlite3);
    lastOpenStorageDiagnostics = {
        mode: 'opening',
        forceFallback,
        hasOpfsDbCtor: typeof OpfsDb === 'function',
        hasOpfsImportDb: typeof opfs?.importDb === 'function',
        hasWasmfsDir: wasmfsPaths.length > 0,
        attempts: [],
        lastError: null,
    };
    const attempts = /** @type {Array<{strategy: string, target: string, flags: string, error: string}>} */ (lastOpenStorageDiagnostics.attempts);
    /**
     * @param {string} strategy
     * @param {string} target
     * @param {string} flags
     * @param {unknown} error
     */
    const pushAttemptError = (strategy, target, flags, error) => {
        const message = (error instanceof Error) ? error.message : String(error);
        attempts.push({strategy, target, flags, error: message});
        if (attempts.length > 40) {
            attempts.shift();
        }
        lastOpenStorageDiagnostics.lastError = message;
    };
    if (forceFallback) {
        lastOpenStorageDiagnostics.mode = 'forced-fallback-disallowed';
        reportDiagnostics('opfs-open-failed', {
            stage: 'forced-fallback-disallowed',
            diagnostics: lastOpenStorageDiagnostics,
        });
        throw new Error(`OPFS is required; forced fallback is disabled. diagnostics=${JSON.stringify(lastOpenStorageDiagnostics)}`);
    }
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
    if (typeof OpfsDb === 'function') {
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
            const maxAttempts = 20;
            for (let attempt = 0; attempt < maxAttempts; ++attempt) {
                const opened = tryOpen();
                if (opened !== null) { return opened; }
                const retryableError = attempts.length > 0 ? attempts[attempts.length - 1].error : '';
                const shouldRetry = (
                    retryableError.includes('SQLITE_CANTOPEN') ||
                    retryableError.includes('SQLITE_BUSY') ||
                    retryableError.includes('database is locked')
                );
                if (!shouldRetry) { break; }
                await new Promise((resolve) => {
                    setTimeout(resolve, 100);
                });
            }
            return null;
        };

        const opened = await tryOpenWithRetry();
        if (opened !== null) {
            lastOpenStorageDiagnostics.mode = 'opfsdb';
            return opened;
        }
    }

    const openedViaUri = tryOpenViaUri();
    if (openedViaUri !== null) {
        lastOpenStorageDiagnostics.mode = 'uri-opfs';
        return openedViaUri;
    }

    const openedViaWasmfsPersistentPath = tryOpenWasmfsPersistent();
    if (openedViaWasmfsPersistentPath !== null) {
        lastOpenStorageDiagnostics.mode = 'wasmfs-persistent';
        return openedViaWasmfsPersistentPath;
    }

    if (!allowFallback) {
        lastOpenStorageDiagnostics.mode = 'opfs-unavailable';
        reportDiagnostics('opfs-open-failed', {
            stage: 'opfs-unavailable',
            diagnostics: lastOpenStorageDiagnostics,
        });
        throw new Error(`OPFS is required but unavailable. diagnostics=${JSON.stringify(lastOpenStorageDiagnostics)}`);
    }

    lastOpenUsedFallbackStorage = true;
    try {
        lastOpenStorageDiagnostics.mode = 'fallback-memory';
        reportDiagnostics('opfs-open-fallback-memory', {
            diagnostics: lastOpenStorageDiagnostics,
        });
        return new sqlite3.oo1.DB(':memory:', 'ct');
    } catch (e) {
        lastOpenStorageDiagnostics.mode = 'fallback-memory-open-failed';
        reportDiagnostics('opfs-open-failed', {
            stage: 'fallback-memory-open-failed',
            diagnostics: lastOpenStorageDiagnostics,
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
 * @returns {{mode: string, forceFallback: boolean, hasOpfsDbCtor: boolean, hasOpfsImportDb: boolean, hasWasmfsDir: boolean}}
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
        Reflect.get(globalThis, 'manabitanRequireOpfs') === false ||
        Reflect.get(globalThis, 'manabitanAllowSqliteMemoryFallback') === true ||
        typeof Reflect.get(globalThis, 'chrome') === 'undefined'
    );
    const opfs = /** @type {{opfs?: SqliteOpfsApi}} */ (/** @type {unknown} */ (sqlite3)).opfs;
    if (typeof opfs?.unlink !== 'function') {
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
