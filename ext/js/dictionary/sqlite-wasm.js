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

export const DICTIONARY_DB_FILE = '/dict.sqlite3';

const DICTIONARY_DB_FILE_ALT = 'dict.sqlite3';

const FALLBACK_IMPORT_DB_FILE = '/dict-import.sqlite3';
/** @type {Uint8Array|null} */
let fallbackImportedContent = null;
let lastOpenUsedFallbackStorage = false;

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
    const OpfsDb = sqlite3.oo1.OpfsDb;
    if (typeof OpfsDb === 'function') {
        /**
         * @returns {import('@sqlite.org/sqlite-wasm').Database|null}
         */
        const tryOpen = () => {
            for (const dbPath of getDatabasePaths()) {
                for (const flags of ['cw', 'c']) {
                    try {
                        return new OpfsDb(dbPath, flags);
                    } catch (_) {
                        // Try the next path/flag combination.
                    }
                }
            }
            return null;
        };

        const opened = tryOpen();
        if (opened !== null) {
            return opened;
        }

        const opfs = /** @type {{opfs?: SqliteOpfsApi}} */ (/** @type {unknown} */ (sqlite3)).opfs;
        await deleteOpfsDatabaseFilesInternal(opfs);
        const openedAfterCleanup = tryOpen();
        if (openedAfterCleanup !== null) {
            return openedAfterCleanup;
        }
    }

    lastOpenUsedFallbackStorage = true;
    if (fallbackImportedContent !== null) {
        sqlite3.capi.sqlite3_js_posix_create_file(FALLBACK_IMPORT_DB_FILE, fallbackImportedContent);
        fallbackImportedContent = null;
        return new sqlite3.oo1.DB(FALLBACK_IMPORT_DB_FILE, 'c');
    }

    return new sqlite3.oo1.DB(':memory:', 'c');
}

/**
 * @returns {boolean}
 */
export function didLastOpenUseFallbackStorage() {
    return lastOpenUsedFallbackStorage;
}

/**
 * @returns {Promise<boolean>}
 */
export async function deleteOpfsDatabaseFiles() {
    const sqlite3 = await getSqlite3();
    const opfs = /** @type {{opfs?: SqliteOpfsApi}} */ (/** @type {unknown} */ (sqlite3)).opfs;
    if (typeof opfs?.unlink !== 'function') {
        fallbackImportedContent = null;
        return true;
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
        fallbackImportedContent = Uint8Array.from(new Uint8Array(content));
        return;
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
    fallbackImportedContent = Uint8Array.from(bytes);
}
