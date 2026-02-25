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

import {initWasm, Resvg} from '../../lib/resvg-wasm.js';
import {createApiMap, invokeApiMapHandler} from '../core/api-map.js';
import {ExtensionError} from '../core/extension-error.js';
import {parseJson} from '../core/json.js';
import {log} from '../core/log.js';
import {safePerformance} from '../core/safe-performance.js';
import {stringReverse} from '../core/utilities.js';
import {deleteOpfsDatabaseFiles, didLastOpenUseFallbackStorage, getSqlite3, importOpfsDatabase, openOpfsDatabase} from './sqlite-wasm.js';
import {
    compressTermContentZstd,
    decompressTermContentZstd,
    initializeTermContentZstd,
    logTermContentZstdError,
    resolveTermContentZstdDictName,
} from './zstd-term-content.js';
import {TermContentOpfsStore} from './term-content-opfs-store.js';

/**
 * @typedef {object} InsertStatement
 * @property {string} sql
 * @property {(item: unknown) => import('@sqlite.org/sqlite-wasm').BindingSpec} bind
 */

export class DictionaryDatabase {
    constructor() {
        /** @type {import('@sqlite.org/sqlite-wasm').Sqlite3Static|null} */
        this._sqlite3 = null;
        /** @type {import('@sqlite.org/sqlite-wasm').Database|null} */
        this._db = null;
        /** @type {boolean} */
        this._isOpening = false;
        /** @type {boolean} */
        this._usesFallbackStorage = false;
        /** @type {number} */
        this._bulkImportDepth = 0;
        /** @type {boolean} */
        this._bulkImportTransactionOpen = false;
        /** @type {Map<string, number>} */
        this._termEntryContentIdByKey = new Map();
        /** @type {Map<string, number>} */
        this._termEntryContentIdByHash = new Map();
        /** @type {boolean} */
        this._termEntryContentHasExistingRows = true;
        /** @type {boolean} */
        this._enableTermEntryContentDedup = true;
        /** @type {Map<string, import('@sqlite.org/sqlite-wasm').PreparedStatement>} */
        this._statementCache = new Map();
        /** @type {Map<number, {definitionTags: string|null, termTags: string|undefined, rules: string, glossary: import('dictionary-data').TermGlossary[]}>} */
        this._termEntryContentCache = new Map();
        /** @type {TextEncoder} */
        this._textEncoder = new TextEncoder();
        /** @type {TextDecoder} */
        this._textDecoder = new TextDecoder();
        /** @type {boolean} */
        this._termContentZstdInitialized = false;
        /** @type {Map<string, boolean>} */
        this._termExactPresenceCache = new Map();
        /** @type {Map<string, boolean>} */
        this._termPrefixNegativeCache = new Map();
        /** @type {Map<string, {expression: Map<string, number[]>, reading: Map<string, number[]>, pair: Map<string, number[]>, sequence: Map<number, number[]>}>} */
        this._directTermIndexByDictionary = new Map();
        /** @type {boolean} */
        this._enableSqliteSecondaryIndexes = false;
        /** @type {number} */
        this._termContentCompressionMinBytes = 1048576;
        /** @type {TermContentOpfsStore} */
        this._termContentStore = new TermContentOpfsStore();

        /**
         * @type {Worker?}
         */
        this._worker = null;

        /**
         * @type {Uint8Array?}
         */
        this._resvgFontBuffer = null;

        /** @type {import('dictionary-database').ApiMap} */
        this._apiMap = createApiMap([
            ['drawMedia', this._onDrawMedia.bind(this)],
        ]);
    }

    /** */
    async prepare() {
        if (this._db !== null) {
            throw new Error('Database already open');
        }
        if (this._isOpening) {
            throw new Error('Already opening');
        }

        try {
            this._isOpening = true;
            await this._openConnection();
            await initializeTermContentZstd();
            this._termContentZstdInitialized = true;
            await this._deleteLegacyIndexedDb();

            // keep existing draw worker split behaviour.
            const isWorker = self.constructor.name !== 'Window';
            if (!isWorker && this._worker === null) {
                this._worker = new Worker('/js/dictionary/dictionary-database-worker-main.js', {type: 'module'});
                this._worker.addEventListener('error', (event) => {
                    log.log('Worker terminated with error:', event);
                });
                this._worker.addEventListener('unhandledrejection', (event) => {
                    log.log('Unhandled promise rejection in worker:', event);
                });
            } else if (isWorker && this._resvgFontBuffer === null) {
                await initWasm(fetch('/lib/resvg.wasm'));

                const font = await fetch('/fonts/NotoSansJP-Regular.ttf');
                const fontData = await font.arrayBuffer();
                this._resvgFontBuffer = new Uint8Array(fontData);
            }
        } finally {
            this._isOpening = false;
        }
    }

    /** */
    async close() {
        if (this._db === null) {
            throw new Error('Database is not open');
        }
        if (this._bulkImportTransactionOpen) {
            try {
                this._db.exec('ROLLBACK');
            } catch (_) { /* NOP */ }
            this._bulkImportTransactionOpen = false;
        }
        this._clearCachedStatements();
        this._termEntryContentCache.clear();
        this._termEntryContentIdByHash.clear();
        this._termExactPresenceCache.clear();
        this._termPrefixNegativeCache.clear();
        this._directTermIndexByDictionary.clear();
        this._db.close();
        this._db = null;
        this._usesFallbackStorage = false;
    }

    /**
     * @returns {boolean}
     */
    isPrepared() {
        return this._db !== null;
    }

    /**
     * @returns {boolean}
     */
    isOpening() {
        return this._isOpening;
    }

    /**
     * @returns {boolean}
     */
    usesFallbackStorage() {
        return this._usesFallbackStorage;
    }

    /** */
    startBulkImport() {
        const db = this._requireDb();
        if (this._bulkImportDepth === 0) {
            this._applyImportPragmas();
            this._termEntryContentHasExistingRows = this._asNumber(db.selectValue('SELECT 1 FROM termEntryContent LIMIT 1'), 0) === 1;
            for (const dropIndexSql of this._createDropIndexesSql()) {
                db.exec(dropIndexSql);
            }
            this._termEntryContentIdByKey.clear();
            this._termEntryContentIdByHash.clear();
            this._termEntryContentCache.clear();
            this._termExactPresenceCache.clear();
            this._termPrefixNegativeCache.clear();
            this._directTermIndexByDictionary.clear();
            db.exec('BEGIN IMMEDIATE');
            this._bulkImportTransactionOpen = true;
        }
        ++this._bulkImportDepth;
    }

    /**
     * @param {((index: number, count: number) => void)?} [onCheckpoint]
     */
    finishBulkImport(onCheckpoint = null) {
        if (this._bulkImportDepth <= 0) {
            return;
        }
        --this._bulkImportDepth;
        if (this._bulkImportDepth === 0) {
            const db = this._requireDb();
            if (this._bulkImportTransactionOpen) {
                db.exec('COMMIT');
                this._bulkImportTransactionOpen = false;
            }
            const createIndexStatements = this._createIndexesSql();
            for (let i = 0; i < createIndexStatements.length; ++i) {
                db.exec(createIndexStatements[i]);
                if (typeof onCheckpoint === 'function') {
                    onCheckpoint(i + 1, createIndexStatements.length);
                }
            }
            this._termEntryContentIdByKey.clear();
            this._termEntryContentIdByHash.clear();
            this._termEntryContentCache.clear();
            this._termExactPresenceCache.clear();
            this._termPrefixNegativeCache.clear();
            this._directTermIndexByDictionary.clear();
            this._applyRuntimePragmas();
        }
    }

    /**
     * @param {boolean} value
     */
    setTermEntryContentDedupEnabled(value) {
        this._enableTermEntryContentDedup = value;
    }

    /**
     * @returns {Promise<boolean>}
     */
    async purge() {
        if (this._isOpening) {
            throw new Error('Cannot purge database while opening');
        }

        if (this._db !== null) {
            if (this._bulkImportTransactionOpen) {
                try {
                    this._db.exec('ROLLBACK');
                } catch (_) { /* NOP */ }
                this._bulkImportTransactionOpen = false;
            }
            this._applyRuntimePragmas();
            this._clearCachedStatements();
            this._db.close();
            this._db = null;
            this._usesFallbackStorage = false;
        }
        await this._termContentStore.reset();

        if (this._worker !== null) {
            this._worker.terminate();
            this._worker = null;
        }

        let result = false;
        try {
            result = await deleteOpfsDatabaseFiles();
        } catch (e) {
            log.error(e);
        }

        await this.prepare();
        this._termEntryContentCache.clear();
        this._termEntryContentIdByHash.clear();
        this._termExactPresenceCache.clear();
        this._termPrefixNegativeCache.clear();
        this._directTermIndexByDictionary.clear();
        return result;
    }

    /**
     * @returns {Promise<ArrayBuffer>}
     */
    async exportDatabase() {
        const db = this._requireDb();
        const sqlite3 = this._requireSqlite3();

        db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
        const dbPointer = db.pointer;
        if (typeof dbPointer !== 'number') {
            throw new Error('sqlite database pointer is unavailable');
        }
        const raw = sqlite3.capi.sqlite3_js_db_export(dbPointer);
        const bytes = raw instanceof Uint8Array ? raw : new Uint8Array(raw);
        return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    }

    /**
     * @param {ArrayBuffer} content
     */
    async importDatabase(content) {
        const sqlite3 = await getSqlite3();

        if (this._db !== null) {
            this._clearCachedStatements();
            this._db.close();
            this._db = null;
            this._usesFallbackStorage = false;
        }

        await importOpfsDatabase(content);

        this._sqlite3 = sqlite3;
        await this._openConnection();
        this._termEntryContentCache.clear();
        this._termEntryContentIdByHash.clear();
        this._termExactPresenceCache.clear();
        this._termPrefixNegativeCache.clear();
        this._directTermIndexByDictionary.clear();
    }

    /**
     * @param {string} dictionaryName
     * @param {number} progressRate
     * @param {import('dictionary-database').DeleteDictionaryProgressCallback} onProgress
     */
    async deleteDictionary(dictionaryName, progressRate, onProgress) {
        const db = this._requireDb();

        /** @type {[table: string, keyColumn: string][]} */
        const targets = [
            ['kanji', 'dictionary'],
            ['kanjiMeta', 'dictionary'],
            ['terms', 'dictionary'],
            ['termMeta', 'dictionary'],
            ['tagMeta', 'dictionary'],
            ['media', 'dictionary'],
            ['dictionaries', 'title'],
        ];

        /** @type {import('dictionary-database').DeleteDictionaryProgressData} */
        const progressData = {
            count: 0,
            processed: 0,
            storeCount: targets.length,
            storesProcesed: 0,
        };

        /** @type {number[]} */
        const counts = [];
        for (const [table, keyColumn] of targets) {
            const count = this._asNumber(db.selectValue(`SELECT COUNT(*) FROM ${table} WHERE ${keyColumn} = $value`, {$value: dictionaryName}), 0);
            counts.push(count);
            progressData.count += count;
            ++progressData.storesProcesed;
            onProgress(progressData);
        }

        progressData.storesProcesed = 0;

        db.exec('BEGIN IMMEDIATE');
        try {
            for (let i = 0; i < targets.length; ++i) {
                const [table, keyColumn] = targets[i];
                db.exec({sql: `DELETE FROM ${table} WHERE ${keyColumn} = $value`, bind: {$value: dictionaryName}});
                progressData.processed += counts[i];
                ++progressData.storesProcesed;
                if ((progressData.processed % progressRate) === 0 || progressData.processed >= progressData.count) {
                    onProgress(progressData);
                }
            }
            db.exec('COMMIT');
        } catch (e) {
            try { db.exec('ROLLBACK'); } catch (_) { /* NOP */ }
            throw e;
        }

        onProgress(progressData);
        this._pruneOrphanTermEntryContent();
        this._termEntryContentCache.clear();
        this._termEntryContentIdByHash.clear();
        this._termExactPresenceCache.clear();
        this._termPrefixNegativeCache.clear();
        this._directTermIndexByDictionary.clear();
    }

    /**
     * @param {string} sql
     * @returns {import('@sqlite.org/sqlite-wasm').PreparedStatement}
     */
    _getCachedStatement(sql) {
        const cached = this._statementCache.get(sql);
        if (typeof cached !== 'undefined') {
            return cached;
        }
        const db = this._requireDb();
        const created = /** @type {import('@sqlite.org/sqlite-wasm').PreparedStatement} */ (db.prepare(sql));
        this._statementCache.set(sql, created);
        return created;
    }

    /** */
    _clearCachedStatements() {
        for (const stmt of this._statementCache.values()) {
            try {
                stmt.finalize();
            } catch (_) {
                // NOP
            }
        }
        this._statementCache.clear();
        this._termEntryContentCache.clear();
        this._termEntryContentIdByHash.clear();
        this._termExactPresenceCache.clear();
        this._termPrefixNegativeCache.clear();
        this._directTermIndexByDictionary.clear();
    }

    /**
     * @param {Iterable<string>} values
     * @param {string} prefix
     * @returns {{clause: string, bind: Record<string, string>}}
     */
    _buildTextInClause(values, prefix) {
        /** @type {string[]} */
        const placeholders = [];
        /** @type {Record<string, string>} */
        const bind = {};
        let index = 0;
        for (const value of values) {
            const key = `${prefix}${index++}`;
            placeholders.push(`$${key}`);
            bind[`$${key}`] = value;
        }
        return {
            clause: placeholders.length > 0 ? placeholders.join(', ') : "''",
            bind,
        };
    }

    /**
     * @param {Iterable<number>} values
     * @param {string} prefix
     * @returns {{clause: string, bind: Record<string, number>}}
     */
    _buildNumberInClause(values, prefix) {
        /** @type {string[]} */
        const placeholders = [];
        /** @type {Record<string, number>} */
        const bind = {};
        let index = 0;
        for (const value of values) {
            const key = `${prefix}${index++}`;
            placeholders.push(`$${key}`);
            bind[`$${key}`] = value;
        }
        return {
            clause: placeholders.length > 0 ? placeholders.join(', ') : '-1',
            bind,
        };
    }

    /**
     * @template T
     * @param {T[]} values
     * @param {number} chunkSize
     * @returns {T[][]}
     */
    _chunkValues(values, chunkSize) {
        /** @type {T[][]} */
        const chunks = [];
        if (chunkSize <= 0) {
            return chunks;
        }
        for (let i = 0; i < values.length; i += chunkSize) {
            chunks.push(values.slice(i, i + chunkSize));
        }
        return chunks;
    }

    /**
     * @param {string[]} dictionaryNames
     * @returns {string}
     */
    _getDictionaryCacheKey(dictionaryNames) {
        if (dictionaryNames.length <= 1) {
            return dictionaryNames[0] ?? '';
        }
        return [...dictionaryNames].sort().join('\u001f');
    }

    /**
     * @param {string} dictionaryName
     * @returns {{expression: Map<string, number[]>, reading: Map<string, number[]>, pair: Map<string, number[]>, sequence: Map<number, number[]>}}
     */
    _ensureDirectTermIndex(dictionaryName) {
        const existing = this._directTermIndexByDictionary.get(dictionaryName);
        if (typeof existing !== 'undefined') {
            return existing;
        }
        /** @type {Map<string, number[]>} */
        const expression = new Map();
        /** @type {Map<string, number[]>} */
        const reading = new Map();
        /** @type {Map<string, number[]>} */
        const pair = new Map();
        /** @type {Map<number, number[]>} */
        const sequence = new Map();

        const stmt = this._getCachedStatement('SELECT id, expression, reading, sequence FROM terms WHERE dictionary = $dictionary');
        stmt.reset(true);
        stmt.bind({$dictionary: dictionaryName});
        while (stmt.step()) {
            const row = /** @type {import('core').SafeAny[]} */ (stmt.get([]));
            const id = this._asNumber(row[0], -1);
            if (id <= 0) { continue; }
            const expressionValue = this._asString(row[1]);
            const readingValue = this._asString(row[2]);
            const sequenceValue = this._asNullableNumber(row[3]);

            const expressionList = expression.get(expressionValue);
            if (typeof expressionList === 'undefined') {
                expression.set(expressionValue, [id]);
            } else {
                expressionList.push(id);
            }

            const readingList = reading.get(readingValue);
            if (typeof readingList === 'undefined') {
                reading.set(readingValue, [id]);
            } else {
                readingList.push(id);
            }

            const pairKey = `${expressionValue}\u001f${readingValue}`;
            const pairList = pair.get(pairKey);
            if (typeof pairList === 'undefined') {
                pair.set(pairKey, [id]);
            } else {
                pairList.push(id);
            }

            if (typeof sequenceValue === 'number' && sequenceValue >= 0) {
                const sequenceList = sequence.get(sequenceValue);
                if (typeof sequenceList === 'undefined') {
                    sequence.set(sequenceValue, [id]);
                } else {
                    sequenceList.push(id);
                }
            }
        }

        const index = {expression, reading, pair, sequence};
        this._directTermIndexByDictionary.set(dictionaryName, index);
        return index;
    }

    /**
     * @param {import('dictionary-database').DictionarySet} dictionaries
     * @returns {string[]}
     */
    _getDictionaryNames(dictionaries) {
        if (dictionaries instanceof Map) {
            return [...dictionaries.keys()];
        }
        return [...dictionaries];
    }

    /**
     * @param {string[]} terms
     * @returns {Map<string, number[]>}
     */
    _buildTermIndexMap(terms) {
        /** @type {Map<string, number[]>} */
        const result = new Map();
        for (let i = 0; i < terms.length; ++i) {
            const term = terms[i];
            const list = result.get(term);
            if (typeof list === 'undefined') {
                result.set(term, [i]);
            } else {
                list.push(i);
            }
        }
        return result;
    }

    /**
     * @param {string[]} termList
     * @param {import('dictionary-database').DictionarySet} dictionaries
     * @param {import('dictionary-database').MatchType} matchType
     * @returns {Promise<import('dictionary-database').TermEntry[]>}
     */
    async findTermsBulk(termList, dictionaries, matchType) {
        if (termList.length === 0 || dictionaries.size === 0) {
            return [];
        }
        const visited = new Set();
        /** @type {import('dictionary-database').TermEntry[]} */
        const results = [];
        const dictionaryNames = this._getDictionaryNames(dictionaries);
        const {clause: dictionaryInClause, bind: dictionaryBind} = this._buildTextInClause(dictionaryNames, 'dict');

        /** @type {('expression'|'reading'|'expressionReverse'|'readingReverse')[]} */
        const columns = (matchType === 'suffix') ? ['expressionReverse', 'readingReverse'] : ['expression', 'reading'];

        if (matchType === 'exact') {
            /** @type {Map<string, number[]>} */
            const termIndexMap = new Map();
            /** @type {Map<number, {matchSource: import('dictionary-database').MatchSource, itemIndex: number}[]>} */
            const idMatches = new Map();
            for (let i = 0; i < termList.length; ++i) {
                const term = termList[i];
                const cachedPresence = this._termExactPresenceCache.get(term);
                if (cachedPresence === false) {
                    continue;
                }
                const existingList = termIndexMap.get(term);
                if (typeof existingList === 'undefined') {
                    termIndexMap.set(term, [i]);
                } else {
                    existingList.push(i);
                }
            }
            if (termIndexMap.size === 0) {
                return [];
            }
            for (const term of termIndexMap.keys()) {
                const itemIndexes = /** @type {number[]} */ (termIndexMap.get(term));
                let found = false;
                for (const dictionaryName of dictionaryNames) {
                    const index = this._ensureDirectTermIndex(dictionaryName);
                    const expressionIds = index.expression.get(term);
                    if (typeof expressionIds !== 'undefined') {
                        found = true;
                        for (const id of expressionIds) {
                            if (id <= 0 || visited.has(id)) { continue; }
                            visited.add(id);
                            const matches = idMatches.get(id);
                            if (typeof matches === 'undefined') {
                                idMatches.set(id, itemIndexes.map((itemIndex) => ({matchSource: 'term', itemIndex})));
                            } else {
                                for (const itemIndex of itemIndexes) {
                                    matches.push({matchSource: 'term', itemIndex});
                                }
                            }
                        }
                    }
                }
                for (const dictionaryName of dictionaryNames) {
                    const index = this._ensureDirectTermIndex(dictionaryName);
                    const readingIds = index.reading.get(term);
                    if (typeof readingIds !== 'undefined') {
                        found = true;
                        for (const id of readingIds) {
                            if (id <= 0 || visited.has(id)) { continue; }
                            visited.add(id);
                            const matches = idMatches.get(id);
                            if (typeof matches === 'undefined') {
                                idMatches.set(id, itemIndexes.map((itemIndex) => ({matchSource: 'reading', itemIndex})));
                            } else {
                                for (const itemIndex of itemIndexes) {
                                    matches.push({matchSource: 'reading', itemIndex});
                                }
                            }
                        }
                    }
                }
                this._termExactPresenceCache.set(term, found);
            }

            if (idMatches.size === 0) {
                return [];
            }

            const rowsById = await this._fetchTermRowsByIds(idMatches.keys());
            for (const [id, matches] of idMatches) {
                const row = rowsById.get(id);
                if (typeof row === 'undefined') { continue; }
                for (const {matchSource, itemIndex} of matches) {
                    results.push(this._createTerm(matchSource, 'exact', row, itemIndex));
                }
            }
            return results;
        }

        /** @type {Map<number, {matchSource: import('dictionary-database').MatchSource, matchType: import('dictionary-database').MatchType, itemIndex: number}>} */
        const idMatches = new Map();
        /** @type {Map<string, {term: string, query: string, itemIndex: number}>} */
        const uniqueQueryMap = new Map();
        for (let itemIndex = 0; itemIndex < termList.length; ++itemIndex) {
            const term = termList[itemIndex];
            const query = matchType === 'suffix' ? stringReverse(term) : term;
            if (query.length === 0) { continue; }
            if (!uniqueQueryMap.has(query)) {
                uniqueQueryMap.set(query, {term, query, itemIndex});
            }
        }
        const dictionaryCacheKey = this._getDictionaryCacheKey(dictionaryNames);
        const negativeCachePrefix = `${matchType}\u001f${dictionaryCacheKey}\u001f`;
        const queriesToCheck = [...uniqueQueryMap.values()].filter(({query}) => !this._termPrefixNegativeCache.has(`${negativeCachePrefix}${query}`));
        /** @type {Set<string>} */
        const foundQueries = new Set();

        for (let indexIndex = 0; indexIndex < columns.length; ++indexIndex) {
            const column = columns[indexIndex];
            for (const queryChunk of this._chunkValues(queriesToCheck, 32)) {
                if (queryChunk.length === 0) { continue; }
                /** @type {Record<string, string>} */
                const queryBind = {};
                /** @type {string[]} */
                const queryConditions = [];
                for (let i = 0; i < queryChunk.length; ++i) {
                    const key = `$query${i}`;
                    queryBind[key] = queryChunk[i].query;
                    queryConditions.push(`t.${column} LIKE ${key} || '%'`);
                }
                const sql = `SELECT id, expression, reading, t.${column} AS matchedValue FROM terms t WHERE (${queryConditions.join(' OR ')}) AND t.dictionary IN (${dictionaryInClause})`;
                const stmt = this._getCachedStatement(sql);
                stmt.reset(true);
                stmt.bind({...queryBind, ...dictionaryBind});
                while (stmt.step()) {
                    const row = /** @type {import('core').SafeAny[]} */ (stmt.get([]));
                    const id = this._asNumber(row[0], -1);
                    if (id <= 0 || visited.has(id)) { continue; }
                    const expression = this._asString(row[1]);
                    const reading = this._asString(row[2]);
                    const value = this._asString(row[3]);
                    /** @type {{term: string, query: string, itemIndex: number}|null} */
                    let selected = null;
                    for (const queryData of queryChunk) {
                        if (!value.startsWith(queryData.query)) { continue; }
                        foundQueries.add(queryData.query);
                        if (selected === null || queryData.itemIndex < selected.itemIndex) {
                            selected = queryData;
                        }
                    }
                    if (selected === null) { continue; }
                    visited.add(id);
                    const matchSource = (indexIndex === 0) ? 'term' : 'reading';
                    const matchedValue = (matchSource === 'term') ? expression : reading;
                    const matchType2 = (matchedValue === selected.term) ? 'exact' : matchType;
                    idMatches.set(id, {matchSource, matchType: matchType2, itemIndex: selected.itemIndex});
                }
            }
        }
        for (const {query} of queriesToCheck) {
            const key = `${negativeCachePrefix}${query}`;
            if (foundQueries.has(query)) {
                this._termPrefixNegativeCache.delete(key);
            } else {
                this._termPrefixNegativeCache.set(key, true);
            }
        }
        if (this._termPrefixNegativeCache.size > 50000) {
            this._termPrefixNegativeCache.clear();
        }

        const rowsById = await this._fetchTermRowsByIds(idMatches.keys());
        for (const [id, {matchSource, matchType: matchType2, itemIndex}] of idMatches) {
            const row = rowsById.get(id);
            if (typeof row === 'undefined') { continue; }
            results.push(this._createTerm(matchSource, matchType2, row, itemIndex));
        }
        return results;
    }

    /**
     * @param {import('dictionary-database').TermExactRequest[]} termList
     * @param {import('dictionary-database').DictionarySet} dictionaries
     * @returns {Promise<import('dictionary-database').TermEntry[]>}
     */
    async findTermsExactBulk(termList, dictionaries) {
        if (termList.length === 0 || dictionaries.size === 0) {
            return [];
        }
        /** @type {import('dictionary-database').TermEntry[]} */
        const results = [];
        const dictionaryNames = this._getDictionaryNames(dictionaries);
        /** @type {Map<string, number[]>} */
        const termReadingIndexes = new Map();
        for (let itemIndex = 0; itemIndex < termList.length; ++itemIndex) {
            const item = termList[itemIndex];
            const key = `${item.term}\u001f${item.reading}`;
            const itemIndexes = termReadingIndexes.get(key);
            if (typeof itemIndexes === 'undefined') {
                termReadingIndexes.set(key, [itemIndex]);
            } else {
                itemIndexes.push(itemIndex);
            }
        }
        const uniquePairs = [...termReadingIndexes.keys()];
        /** @type {Map<number, number[]>} */
        const idMatches = new Map();
        for (const pair of uniquePairs) {
            const itemIndexes = termReadingIndexes.get(pair);
            if (typeof itemIndexes === 'undefined') { continue; }
            for (const dictionaryName of dictionaryNames) {
                const index = this._ensureDirectTermIndex(dictionaryName);
                const ids = index.pair.get(pair);
                if (typeof ids === 'undefined') { continue; }
                for (const id of ids) {
                    if (id <= 0) { continue; }
                    const existingIndexes = idMatches.get(id);
                    if (typeof existingIndexes === 'undefined') {
                        idMatches.set(id, [...itemIndexes]);
                    } else {
                        for (const itemIndex of itemIndexes) {
                            existingIndexes.push(itemIndex);
                        }
                    }
                }
            }
        }

        const rowsById = await this._fetchTermRowsByIds(idMatches.keys());
        for (const [id, itemIndexes] of idMatches) {
            const row = rowsById.get(id);
            if (typeof row === 'undefined') { continue; }
            for (const itemIndex of itemIndexes) {
                results.push(this._createTerm('term', 'exact', row, itemIndex));
            }
        }

        return results;
    }

    /**
     * @param {import('dictionary-database').DictionaryAndQueryRequest[]} items
     * @returns {Promise<import('dictionary-database').TermEntry[]>}
     */
    async findTermsBySequenceBulk(items) {
        if (items.length === 0) {
            return [];
        }
        /** @type {import('dictionary-database').TermEntry[]} */
        const results = [];
        /** @type {Map<string, number[]>} */
        const dictionarySequenceIndexes = new Map();
        for (let itemIndex = 0; itemIndex < items.length; ++itemIndex) {
            const item = items[itemIndex];
            const sequence = this._asNumber(item.query, -1);
            if (sequence < 0) { continue; }
            const key = `${item.dictionary}\u001f${sequence}`;
            const itemIndexes = dictionarySequenceIndexes.get(key);
            if (typeof itemIndexes === 'undefined') {
                dictionarySequenceIndexes.set(key, [itemIndex]);
            } else {
                itemIndexes.push(itemIndex);
            }
        }
        if (dictionarySequenceIndexes.size === 0) {
            return [];
        }
        const dictionaryNames = [...new Set(items.map((item) => item.dictionary))];
        const sequenceValues = [...new Set(items.map((item) => this._asNumber(item.query, -1)).filter((value) => value >= 0))];
        /** @type {Map<number, number[]>} */
        const idMatches = new Map();
        for (const dictionaryName of dictionaryNames) {
            const index = this._ensureDirectTermIndex(dictionaryName);
            for (const sequence of sequenceValues) {
                const ids = index.sequence.get(sequence);
                if (typeof ids === 'undefined') { continue; }
                const key = `${dictionaryName}\u001f${sequence}`;
                const itemIndexes = dictionarySequenceIndexes.get(key);
                if (typeof itemIndexes === 'undefined') { continue; }
                for (const id of ids) {
                    if (id <= 0) { continue; }
                    const existingIndexes = idMatches.get(id);
                    if (typeof existingIndexes === 'undefined') {
                        idMatches.set(id, [...itemIndexes]);
                    } else {
                        for (const itemIndex of itemIndexes) {
                            existingIndexes.push(itemIndex);
                        }
                    }
                }
            }
        }

        const rowsById = await this._fetchTermRowsByIds(idMatches.keys());
        for (const [id, itemIndexes] of idMatches) {
            const row = rowsById.get(id);
            if (typeof row === 'undefined') { continue; }
            for (const itemIndex of itemIndexes) {
                results.push(this._createTerm('sequence', 'exact', row, itemIndex));
            }
        }

        return results;
    }

    /**
     * @param {string[]} termList
     * @param {import('dictionary-database').DictionarySet} dictionaries
     * @returns {Promise<import('dictionary-database').TermMeta[]>}
     */
    async findTermMetaBulk(termList, dictionaries) {
        if (termList.length === 0 || dictionaries.size === 0) {
            return [];
        }
        /** @type {import('dictionary-database').TermMeta[]} */
        const results = [];
        const termIndexMap = this._buildTermIndexMap(termList);
        const dictionaryNames = this._getDictionaryNames(dictionaries);
        const {clause: termInClause, bind: termBind} = this._buildTextInClause(termIndexMap.keys(), 'term');
        const {clause: dictionaryInClause, bind: dictionaryBind} = this._buildTextInClause(dictionaryNames, 'dict');
        const sql = `SELECT * FROM termMeta WHERE expression IN (${termInClause}) AND dictionary IN (${dictionaryInClause})`;
        const stmt = this._getCachedStatement(sql);
        stmt.reset(true);
        stmt.bind({...termBind, ...dictionaryBind});
        while (stmt.step()) {
            const row = /** @type {import('core').SafeAny} */ (stmt.get({}));
            const expression = this._asString(row.expression);
            const itemIndexes = termIndexMap.get(expression);
            if (typeof itemIndexes === 'undefined') { continue; }
            const converted = this._deserializeTermMetaRow(row);
            for (const itemIndex of itemIndexes) {
                results.push(this._createTermMeta(converted, {itemIndex, indexIndex: 0, item: expression}));
            }
        }

        return results;
    }

    /**
     * @param {string[]} kanjiList
     * @param {import('dictionary-database').DictionarySet} dictionaries
     * @returns {Promise<import('dictionary-database').KanjiEntry[]>}
     */
    async findKanjiBulk(kanjiList, dictionaries) {
        if (kanjiList.length === 0 || dictionaries.size === 0) {
            return [];
        }
        /** @type {import('dictionary-database').KanjiEntry[]} */
        const results = [];
        const characterIndexMap = this._buildTermIndexMap(kanjiList);
        const dictionaryNames = this._getDictionaryNames(dictionaries);
        const {clause: characterInClause, bind: characterBind} = this._buildTextInClause(characterIndexMap.keys(), 'ch');
        const {clause: dictionaryInClause, bind: dictionaryBind} = this._buildTextInClause(dictionaryNames, 'dict');
        const sql = `SELECT * FROM kanji WHERE character IN (${characterInClause}) AND dictionary IN (${dictionaryInClause})`;
        const stmt = this._getCachedStatement(sql);
        stmt.reset(true);
        stmt.bind({...characterBind, ...dictionaryBind});
        while (stmt.step()) {
            const converted = this._deserializeKanjiRow(/** @type {import('core').SafeAny} */ (stmt.get({})));
            const itemIndexes = characterIndexMap.get(converted.character);
            if (typeof itemIndexes === 'undefined') { continue; }
            for (const itemIndex of itemIndexes) {
                results.push(this._createKanji(converted, {itemIndex, indexIndex: 0, item: converted.character}));
            }
        }

        return results;
    }

    /**
     * @param {string[]} kanjiList
     * @param {import('dictionary-database').DictionarySet} dictionaries
     * @returns {Promise<import('dictionary-database').KanjiMeta[]>}
     */
    async findKanjiMetaBulk(kanjiList, dictionaries) {
        if (kanjiList.length === 0 || dictionaries.size === 0) {
            return [];
        }
        /** @type {import('dictionary-database').KanjiMeta[]} */
        const results = [];
        const characterIndexMap = this._buildTermIndexMap(kanjiList);
        const dictionaryNames = this._getDictionaryNames(dictionaries);
        const {clause: characterInClause, bind: characterBind} = this._buildTextInClause(characterIndexMap.keys(), 'ch');
        const {clause: dictionaryInClause, bind: dictionaryBind} = this._buildTextInClause(dictionaryNames, 'dict');
        const sql = `SELECT * FROM kanjiMeta WHERE character IN (${characterInClause}) AND dictionary IN (${dictionaryInClause})`;
        const stmt = this._getCachedStatement(sql);
        stmt.reset(true);
        stmt.bind({...characterBind, ...dictionaryBind});
        while (stmt.step()) {
            const row = /** @type {import('core').SafeAny} */ (stmt.get({}));
            const character = this._asString(row.character);
            const itemIndexes = characterIndexMap.get(character);
            if (typeof itemIndexes === 'undefined') { continue; }
            const converted = this._deserializeKanjiMetaRow(row);
            for (const itemIndex of itemIndexes) {
                results.push(this._createKanjiMeta(converted, {itemIndex, indexIndex: 0, item: character}));
            }
        }

        return results;
    }

    /**
     * @param {import('dictionary-database').DictionaryAndQueryRequest[]} items
     * @returns {Promise<(import('dictionary-database').Tag|undefined)[]>}
     */
    async findTagMetaBulk(items) {
        if (items.length === 0) {
            return [];
        }
        const results = new Array(items.length);
        /** @type {Map<string, number[]>} */
        const requestIndexes = new Map();
        for (let i = 0; i < items.length; ++i) {
            const item = items[i];
            const key = `${item.dictionary}\u001f${this._asString(item.query)}`;
            const itemIndexes = requestIndexes.get(key);
            if (typeof itemIndexes === 'undefined') {
                requestIndexes.set(key, [i]);
            } else {
                itemIndexes.push(i);
            }
        }

        const uniqueRequests = [...requestIndexes.keys()];
        for (const requestChunk of this._chunkValues(uniqueRequests, 256)) {
            /** @type {Record<string, string>} */
            const bind = {};
            const conditions = [];
            for (let i = 0; i < requestChunk.length; ++i) {
                const [dictionary, query] = requestChunk[i].split('\u001f');
                const dictionaryKey = `$dictionary${i}`;
                const queryKey = `$query${i}`;
                bind[dictionaryKey] = dictionary;
                bind[queryKey] = query;
                conditions.push(`(dictionary = ${dictionaryKey} AND name = ${queryKey})`);
            }
            const sql = `SELECT name, category, ord as "order", notes, score, dictionary FROM tagMeta WHERE ${conditions.join(' OR ')}`;
            const stmt = this._getCachedStatement(sql);
            stmt.reset(true);
            stmt.bind(bind);
            while (stmt.step()) {
                const row = /** @type {import('core').SafeAny} */ (stmt.get({}));
                const tag = this._deserializeTagRow(row);
                const itemIndexes = requestIndexes.get(`${tag.dictionary}\u001f${tag.name}`);
                if (typeof itemIndexes === 'undefined') { continue; }
                for (const itemIndex of itemIndexes) {
                    if (typeof results[itemIndex] === 'undefined') {
                        results[itemIndex] = tag;
                    }
                }
            }
        }

        return results;
    }

    /**
     * @param {string} name
     * @param {string} dictionary
     * @returns {Promise<?import('dictionary-database').Tag>}
     */
    async findTagForTitle(name, dictionary) {
        const db = this._requireDb();
        const row = db.selectObject(
            'SELECT name, category, ord as "order", notes, score, dictionary FROM tagMeta WHERE name = $name AND dictionary = $dictionary LIMIT 1',
            {$name: name, $dictionary: dictionary},
        );
        return typeof row === 'undefined' ? null : this._deserializeTagRow(row);
    }

    /**
     * @param {import('dictionary-database').MediaRequest[]} items
     * @returns {Promise<import('dictionary-database').Media[]>}
     */
    async getMedia(items) {
        if (items.length === 0) {
            return [];
        }
        /** @type {import('dictionary-database').Media[]} */
        const results = [];
        /** @type {Map<string, number[]>} */
        const mediaRequestIndexes = new Map();
        for (let itemIndex = 0; itemIndex < items.length; ++itemIndex) {
            const item = items[itemIndex];
            const key = `${item.dictionary}\u001f${item.path}`;
            const itemIndexes = mediaRequestIndexes.get(key);
            if (typeof itemIndexes === 'undefined') {
                mediaRequestIndexes.set(key, [itemIndex]);
            } else {
                itemIndexes.push(itemIndex);
            }
        }
        const uniqueRequests = [...mediaRequestIndexes.keys()];
        for (const requestChunk of this._chunkValues(uniqueRequests, 128)) {
            /** @type {Record<string, string>} */
            const bind = {};
            const conditions = [];
            for (let i = 0; i < requestChunk.length; ++i) {
                const [dictionary, path] = requestChunk[i].split('\u001f');
                const dictionaryKey = `$dictionary${i}`;
                const pathKey = `$path${i}`;
                bind[dictionaryKey] = dictionary;
                bind[pathKey] = path;
                conditions.push(`(dictionary = ${dictionaryKey} AND path = ${pathKey})`);
            }
            const sql = `SELECT dictionary, path, mediaType, width, height, content FROM media WHERE ${conditions.join(' OR ')}`;
            const stmt = this._getCachedStatement(sql);
            stmt.reset(true);
            stmt.bind(bind);
            while (stmt.step()) {
                const row = /** @type {import('core').SafeAny} */ (stmt.get({}));
                const converted = this._deserializeMediaRow(row);
                const itemIndexes = mediaRequestIndexes.get(`${converted.dictionary}\u001f${converted.path}`);
                if (typeof itemIndexes === 'undefined') { continue; }
                for (const itemIndex of itemIndexes) {
                    results.push(this._createMedia(converted, {itemIndex, indexIndex: 0, item: items[itemIndex]}));
                }
            }
        }

        return results;
    }

    /**
     * @param {import('dictionary-database').DrawMediaRequest[]} items
     * @param {MessagePort} source
     */
    async drawMedia(items, source) {
        if (this._worker !== null) {
            this._worker.postMessage({action: 'drawMedia', params: {items}}, [source]);
            return;
        }

        safePerformance.mark('drawMedia:start');

        /** @type {Map<string, import('dictionary-database').DrawMediaGroupedRequest>} */
        const groupedItems = new Map();
        for (const item of items) {
            const {path, dictionary, canvasIndex, canvasWidth, canvasHeight, generation} = item;
            const key = `${path}:::${dictionary}`;
            if (!groupedItems.has(key)) {
                groupedItems.set(key, {path, dictionary, canvasIndexes: [], canvasWidth, canvasHeight, generation});
            }
            groupedItems.get(key)?.canvasIndexes.push(canvasIndex);
        }
        const groupedItemsArray = [...groupedItems.values()];
        const media = await this.getMedia(groupedItemsArray);
        const results = media.map((item) => {
            const grouped = groupedItemsArray[item.index];
            return {
                ...item,
                canvasIndexes: grouped.canvasIndexes,
                canvasWidth: grouped.canvasWidth,
                canvasHeight: grouped.canvasHeight,
                generation: grouped.generation,
            };
        });

        results.sort((a, _b) => (a.mediaType === 'image/svg+xml' ? -1 : 1));

        safePerformance.mark('drawMedia:draw:start');
        for (const m of results) {
            if (m.mediaType === 'image/svg+xml') {
                safePerformance.mark('drawMedia:draw:svg:start');
                /** @type {import('@resvg/resvg-wasm').ResvgRenderOptions} */
                const opts = {
                    fitTo: {
                        mode: 'width',
                        value: m.canvasWidth,
                    },
                    font: {
                        fontBuffers: this._resvgFontBuffer !== null ? [this._resvgFontBuffer] : [],
                    },
                };
                const resvgJS = new Resvg(new Uint8Array(m.content), opts);
                const render = resvgJS.render();
                source.postMessage({action: 'drawBufferToCanvases', params: {buffer: render.pixels.buffer, width: render.width, height: render.height, canvasIndexes: m.canvasIndexes, generation: m.generation}}, [render.pixels.buffer]);
                safePerformance.mark('drawMedia:draw:svg:end');
                safePerformance.measure('drawMedia:draw:svg', 'drawMedia:draw:svg:start', 'drawMedia:draw:svg:end');
            } else {
                safePerformance.mark('drawMedia:draw:raster:start');

                if ('serviceWorker' in navigator) {
                    const imageDecoder = new ImageDecoder({type: m.mediaType, data: m.content});
                    await imageDecoder.decode().then((decodedImageResult) => {
                        source.postMessage({action: 'drawDecodedImageToCanvases', params: {decodedImage: decodedImageResult.image, canvasIndexes: m.canvasIndexes, generation: m.generation}}, [decodedImageResult.image]);
                    });
                } else {
                    const image = new Blob([m.content], {type: m.mediaType});
                    await createImageBitmap(image, {resizeWidth: m.canvasWidth, resizeHeight: m.canvasHeight, resizeQuality: 'high'}).then((decodedImage) => {
                        const canvas = new OffscreenCanvas(decodedImage.width, decodedImage.height);
                        const ctx = canvas.getContext('2d');
                        if (ctx !== null) {
                            ctx.drawImage(decodedImage, 0, 0);
                            const imageData = ctx.getImageData(0, 0, decodedImage.width, decodedImage.height);
                            source.postMessage({action: 'drawBufferToCanvases', params: {buffer: imageData.data.buffer, width: decodedImage.width, height: decodedImage.height, canvasIndexes: m.canvasIndexes, generation: m.generation}}, [imageData.data.buffer]);
                        }
                    });
                }
                safePerformance.mark('drawMedia:draw:raster:end');
                safePerformance.measure('drawMedia:draw:raster', 'drawMedia:draw:raster:start', 'drawMedia:draw:raster:end');
            }
        }
        safePerformance.mark('drawMedia:draw:end');
        safePerformance.measure('drawMedia:draw', 'drawMedia:draw:start', 'drawMedia:draw:end');

        safePerformance.mark('drawMedia:end');
        safePerformance.measure('drawMedia', 'drawMedia:start', 'drawMedia:end');
    }

    /**
     * @returns {Promise<import('dictionary-importer').Summary[]>}
     */
    async getDictionaryInfo() {
        const db = this._requireDb();
        const rows = db.selectObjects('SELECT summaryJson FROM dictionaries ORDER BY id ASC');
        return rows.map((row) => /** @type {import('dictionary-importer').Summary} */ (this._safeParseJson(this._asString(row.summaryJson), {})));
    }

    /**
     * @param {string[]} dictionaryNames
     * @param {boolean} getTotal
     * @returns {Promise<import('dictionary-database').DictionaryCounts>}
     */
    async getDictionaryCounts(dictionaryNames, getTotal) {
        const db = this._requireDb();
        const tables = ['kanji', 'kanjiMeta', 'terms', 'termMeta', 'tagMeta', 'media'];

        /** @type {import('dictionary-database').DictionaryCountGroup[]} */
        const counts = [];

        if (getTotal) {
            /** @type {import('dictionary-database').DictionaryCountGroup} */
            const total = {};
            for (const table of tables) {
                total[table] = this._asNumber(db.selectValue(`SELECT COUNT(*) FROM ${table}`), 0);
            }
            counts.push(total);
        }

        for (const dictionaryName of dictionaryNames) {
            /** @type {import('dictionary-database').DictionaryCountGroup} */
            const countGroup = {};
            for (const table of tables) {
                countGroup[table] = this._asNumber(
                    db.selectValue(`SELECT COUNT(*) FROM ${table} WHERE dictionary = $dictionary`, {$dictionary: dictionaryName}),
                    0,
                );
            }
            counts.push(countGroup);
        }

        const total = getTotal ? /** @type {import('dictionary-database').DictionaryCountGroup} */ (counts.shift()) : null;
        return {total, counts};
    }

    /**
     * @param {string} title
     * @returns {Promise<boolean>}
     */
    async dictionaryExists(title) {
        const db = this._requireDb();
        const value = db.selectValue('SELECT 1 FROM dictionaries WHERE title = $title LIMIT 1', {$title: title});
        return typeof value !== 'undefined';
    }

    /**
     * @template {import('dictionary-database').ObjectStoreName} T
     * @param {T} objectStoreName
     * @param {import('dictionary-database').ObjectStoreData<T>[]} items
     * @param {number} start
     * @param {number} count
     * @returns {Promise<void>}
     */
    async bulkAdd(objectStoreName, items, start, count) {
        const db = this._requireDb();

        if (start + count > items.length) {
            count = items.length - start;
        }
        if (count <= 0) { return; }
        if (objectStoreName === 'terms') {
            this._termEntryContentCache.clear();
            this._termEntryContentIdByHash.clear();
            this._termExactPresenceCache.clear();
            this._termPrefixNegativeCache.clear();
            this._directTermIndexByDictionary.clear();
        }

        if (objectStoreName === 'terms') {
            await this._bulkAddTerms(/** @type {import('dictionary-database').ObjectStoreData<'terms'>[]} */ (items), start, count);
            return;
        }
        const descriptor = this._getBulkInsertDescriptor(objectStoreName);
        const useLocalTransaction = !this._bulkImportTransactionOpen;

        if (useLocalTransaction) {
            db.exec('BEGIN IMMEDIATE');
        }
        try {
            await this._bulkInsertWithDescriptor(descriptor, items, start, count);
            if (useLocalTransaction) {
                db.exec('COMMIT');
            }
        } catch (e) {
            if (useLocalTransaction) {
                try { db.exec('ROLLBACK'); } catch (_) { /* NOP */ }
            }
            throw e;
        }
    }

    /**
     * @param {{table: string, columnsSql: string, rowPlaceholderSql: string, batchSize: number, bindRow: (item: unknown) => import('@sqlite.org/sqlite-wasm').Bindable[]}} descriptor
     * @param {unknown[]} items
     * @param {number} start
     * @param {number} count
     * @returns {Promise<void>}
     */
    async _bulkInsertWithDescriptor(descriptor, items, start, count) {
        const {table, columnsSql, rowPlaceholderSql, batchSize, bindRow} = descriptor;
        for (let i = start, ii = start + count; i < ii; i += batchSize) {
            const chunkCount = Math.min(batchSize, ii - i);
            /** @type {string[]} */
            const valueRows = [];
            /** @type {import('@sqlite.org/sqlite-wasm').Bindable[]} */
            const bind = [];
            for (let j = 0; j < chunkCount; ++j) {
                valueRows.push(rowPlaceholderSql);
                const rowBind = bindRow(items[i + j]);
                for (const value of rowBind) {
                    bind.push(value);
                }
            }
            const sql = `INSERT INTO ${table}(${columnsSql}) VALUES ${valueRows.join(',')}`;
            const stmt = this._getCachedStatement(sql);
            stmt.reset(true);
            stmt.bind(bind);
            stmt.step();
        }
    }

    /**
     * @param {import('dictionary-database').ObjectStoreName} objectStoreName
     * @returns {{table: string, columnsSql: string, rowPlaceholderSql: string, batchSize: number, bindRow: (item: unknown) => import('@sqlite.org/sqlite-wasm').Bindable[]}}
     * @throws {Error}
     */
    _getBulkInsertDescriptor(objectStoreName) {
        switch (objectStoreName) {
            case 'dictionaries':
                return {
                    table: 'dictionaries',
                    columnsSql: 'title, version, summaryJson',
                    rowPlaceholderSql: '(?, ?, ?)',
                    batchSize: 256,
                    bindRow: (item) => {
                        const summary = /** @type {import('dictionary-importer').Summary} */ (item);
                        return [summary.title, summary.version, JSON.stringify(summary)];
                    },
                };
            case 'termMeta':
                return {
                    table: 'termMeta',
                    columnsSql: 'dictionary, expression, mode, dataJson',
                    rowPlaceholderSql: '(?, ?, ?, ?)',
                    batchSize: 2048,
                    bindRow: (item) => {
                        const row = /** @type {import('dictionary-database').DatabaseTermMeta} */ (item);
                        return [row.dictionary, row.expression, row.mode, JSON.stringify(row.data)];
                    },
                };
            case 'kanji':
                return {
                    table: 'kanji',
                    columnsSql: 'dictionary, character, onyomi, kunyomi, tags, meaningsJson, statsJson',
                    rowPlaceholderSql: '(?, ?, ?, ?, ?, ?, ?)',
                    batchSize: 1024,
                    bindRow: (item) => {
                        const row = /** @type {import('dictionary-database').DatabaseKanjiEntry} */ (item);
                        return [
                            row.dictionary,
                            row.character,
                            row.onyomi,
                            row.kunyomi,
                            row.tags,
                            JSON.stringify(row.meanings),
                            typeof row.stats !== 'undefined' ? JSON.stringify(row.stats) : null,
                        ];
                    },
                };
            case 'kanjiMeta':
                return {
                    table: 'kanjiMeta',
                    columnsSql: 'dictionary, character, mode, dataJson',
                    rowPlaceholderSql: '(?, ?, ?, ?)',
                    batchSize: 2048,
                    bindRow: (item) => {
                        const row = /** @type {import('dictionary-database').DatabaseKanjiMeta} */ (item);
                        return [row.dictionary, row.character, row.mode, JSON.stringify(row.data)];
                    },
                };
            case 'tagMeta':
                return {
                    table: 'tagMeta',
                    columnsSql: 'dictionary, name, category, ord, notes, score',
                    rowPlaceholderSql: '(?, ?, ?, ?, ?, ?)',
                    batchSize: 2048,
                    bindRow: (item) => {
                        const row = /** @type {import('dictionary-database').Tag} */ (item);
                        return [row.dictionary, row.name, row.category, row.order, row.notes, row.score];
                    },
                };
            case 'media':
                return {
                    table: 'media',
                    columnsSql: 'dictionary, path, mediaType, width, height, content',
                    rowPlaceholderSql: '(?, ?, ?, ?, ?, ?)',
                    batchSize: 8,
                    bindRow: (item) => {
                        const row = /** @type {import('dictionary-database').MediaDataArrayBufferContent} */ (item);
                        return [row.dictionary, row.path, row.mediaType, row.width, row.height, row.content];
                    },
                };
            default:
                throw new Error(`Unsupported object store: ${objectStoreName}`);
        }
    }

    /**
     * @template {import('dictionary-database').ObjectStoreName} T
     * @param {T} objectStoreName
     * @param {import('dictionary-database').ObjectStoreData<T>} item
     * @returns {Promise<number>}
     */
    async addWithResult(objectStoreName, item) {
        await this.bulkAdd(objectStoreName, [item], 0, 1);
        const db = this._requireDb();
        return this._asNumber(db.selectValue('SELECT last_insert_rowid()'), -1);
    }

    /**
     * @template {import('dictionary-database').ObjectStoreName} T
     * @param {T} objectStoreName
     * @param {import('dictionary-database').DatabaseUpdateItem[]} items
     * @param {number} start
     * @param {number} count
     * @returns {Promise<void>}
     */
    async bulkUpdate(objectStoreName, items, start, count) {
        const db = this._requireDb();

        if (start + count > items.length) {
            count = items.length - start;
        }
        if (count <= 0) { return; }

        switch (objectStoreName) {
            case 'dictionaries':
                break;
            default:
                throw new Error(`Unsupported bulkUpdate store: ${objectStoreName}`);
        }

        const stmt = this._getCachedStatement('UPDATE dictionaries SET title = $title, version = $version, summaryJson = $summaryJson WHERE id = $id');
        const useLocalTransaction = !this._bulkImportTransactionOpen;

        if (useLocalTransaction) {
            db.exec('BEGIN IMMEDIATE');
        }
        try {
            for (let i = start, ii = start + count; i < ii; ++i) {
                const {data, primaryKey} = items[i];
                const summary = /** @type {import('dictionary-importer').Summary} */ (data);
                stmt.reset(true);
                stmt.bind({
                    $id: this._asNumber(primaryKey, -1),
                    $title: summary.title,
                    $version: summary.version,
                    $summaryJson: JSON.stringify(summary),
                });
                stmt.step();
            }
            if (useLocalTransaction) {
                db.exec('COMMIT');
            }
        } catch (e) {
            if (useLocalTransaction) {
                try { db.exec('ROLLBACK'); } catch (_) { /* NOP */ }
            }
            throw e;
        }
    }

    /**
     * @param {import('dictionary-database').ObjectStoreData<'terms'>[]} items
     * @param {number} start
     * @param {number} count
     * @returns {Promise<void>}
     */
    async _bulkAddTerms(items, start, count) {
        if (!this._enableTermEntryContentDedup) {
            await this._bulkAddTermsWithoutContentDedup(items, start, count);
            return;
        }
        if (!this._termContentZstdInitialized) {
            await initializeTermContentZstd();
            this._termContentZstdInitialized = true;
        }
        const db = this._requireDb();
        const insertContentStmt = this._getCachedStatement(`
            INSERT INTO termEntryContent(contentHash, contentZstd, contentDictName, rules, definitionTags, termTags, glossaryJson, contentOffset, contentLength)
            VALUES($contentHash, NULL, $contentDictName, '', '', '', '[]', $contentOffset, $contentLength)
        `);
        const useLocalTransaction = !this._bulkImportTransactionOpen;
        /** @type {{values: import('@sqlite.org/sqlite-wasm').Bindable[], contentKey: string|null}[]} */
        const termRows = [];
        /** @type {{contentKey: string, contentHash: string, contentBytes: Uint8Array, contentDictName: string|null}[]} */
        const pendingContentRows = [];
        /** @type {Set<string>} */
        const pendingContentKeys = new Set();
        const batchSize = 1024;
        const canUseFastContentInsert = !this._termEntryContentHasExistingRows;
        if (!canUseFastContentInsert) {
            this._loadTermEntryContentHashIndex();
        }

        if (useLocalTransaction) {
            db.exec('BEGIN IMMEDIATE');
        }
        try {
            for (let i = start, ii = start + count; i < ii; ++i) {
                const row = /** @type {import('dictionary-database').DatabaseTermEntry} */ (items[i]);
                const rules = row.rules;
                const definitionTags = row.definitionTags ?? row.tags ?? '';
                const termTags = row.termTags ?? '';
                const contentJson = row.termEntryContentJson ?? null;
                const contentHash = row.termEntryContentHash ?? (contentJson !== null ? this._hashEntryContent(contentJson) : this._hashEntryContent(this._serializeTermEntryContent(rules, definitionTags, termTags, row.glossary)));
                const contentBytes = row.termEntryContentBytes instanceof Uint8Array ?
                    row.termEntryContentBytes :
                    this._textEncoder.encode(contentJson !== null ? contentJson : this._serializeTermEntryContent(rules, definitionTags, termTags, row.glossary));
                const cachedContentId = this._termEntryContentIdByKey.get(contentHash);
                let contentId = typeof cachedContentId === 'number' ? cachedContentId : null;
                if (contentId === null && canUseFastContentInsert) {
                    if (!pendingContentKeys.has(contentHash)) {
                        const contentDictName = resolveTermContentZstdDictName(row.dictionary);
                        let contentZstd = contentBytes;
                        let effectiveDictName = 'raw';
                        if (contentBytes.byteLength >= this._termContentCompressionMinBytes) {
                            const compressed = compressTermContentZstd(contentBytes, contentDictName);
                            if (compressed.byteLength < contentBytes.byteLength) {
                                contentZstd = compressed;
                                effectiveDictName = contentDictName ?? '';
                            }
                        }
                        pendingContentRows.push({
                            contentKey: contentHash,
                            contentHash,
                            contentBytes: contentZstd,
                            contentDictName: effectiveDictName,
                        });
                        pendingContentKeys.add(contentHash);
                    }
                    termRows.push({
                        values: [
                            row.dictionary,
                            row.expression,
                            row.reading,
                            row.expressionReverse ?? null,
                            row.readingReverse ?? null,
                            0,
                            '',
                            '',
                            '',
                            row.score,
                            '[]',
                            typeof row.sequence === 'number' ? row.sequence : null,
                        ],
                        contentKey: contentHash,
                    });
                } else {
                    if (contentId === null) {
                        const contentDictName = resolveTermContentZstdDictName(row.dictionary);
                        let contentZstd = contentBytes;
                        let effectiveDictName = 'raw';
                        if (contentBytes.byteLength >= this._termContentCompressionMinBytes) {
                            const compressed = compressTermContentZstd(contentBytes, contentDictName);
                            if (compressed.byteLength < contentBytes.byteLength) {
                                contentZstd = compressed;
                                effectiveDictName = contentDictName ?? '';
                            }
                        }
                        contentId = await this._resolveOrCreateTermEntryContentId(
                            insertContentStmt,
                            contentHash,
                            contentZstd,
                            effectiveDictName,
                            contentHash,
                        );
                    }
                    termRows.push({
                        values: [
                            row.dictionary,
                            row.expression,
                            row.reading,
                            row.expressionReverse ?? null,
                            row.readingReverse ?? null,
                            contentId,
                            '',
                            '',
                            '',
                            row.score,
                            '[]',
                            typeof row.sequence === 'number' ? row.sequence : null,
                        ],
                        contentKey: null,
                    });
                }
                if (termRows.length >= batchSize) {
                    if (pendingContentRows.length > 0) {
                        await this._insertTermEntryContentBatch(pendingContentRows);
                        pendingContentRows.length = 0;
                        pendingContentKeys.clear();
                    }
                    this._insertResolvedTermRowsWithContentKeys(termRows);
                    termRows.length = 0;
                }
            }
            if (pendingContentRows.length > 0) {
                await this._insertTermEntryContentBatch(pendingContentRows);
                pendingContentRows.length = 0;
                pendingContentKeys.clear();
            }
            if (termRows.length > 0) {
                this._insertResolvedTermRowsWithContentKeys(termRows);
            }
            if (useLocalTransaction) {
                db.exec('COMMIT');
            }
        } catch (e) {
            if (useLocalTransaction) {
                try { db.exec('ROLLBACK'); } catch (_) { /* NOP */ }
            }
            throw e;
        }
    }

    /**
     * @param {import('@sqlite.org/sqlite-wasm').Bindable[][]} rows
     * @param {number} count
     */
    _insertResolvedTermRows(rows, count) {
        /** @type {string[]} */
        const valueRows = [];
        /** @type {import('@sqlite.org/sqlite-wasm').Bindable[]} */
        const bind = [];
        for (let i = 0; i < count; ++i) {
            valueRows.push('(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
            const row = rows[i];
            for (const value of row) {
                bind.push(value);
            }
        }
        const sql = `
            INSERT INTO terms(
                dictionary, expression, reading, expressionReverse, readingReverse,
                entryContentId, definitionTags, termTags, rules, score, glossaryJson, sequence
            ) VALUES ${valueRows.join(',')}
        `;
        const stmt = this._getCachedStatement(sql);
        stmt.reset(true);
        stmt.bind(bind);
        stmt.step();
    }

    /**
     * @param {{values: import('@sqlite.org/sqlite-wasm').Bindable[], contentKey: string|null}[]} rows
     * @throws {Error}
     */
    _insertResolvedTermRowsWithContentKeys(rows) {
        /** @type {import('@sqlite.org/sqlite-wasm').Bindable[][]} */
        const resolved = [];
        for (const row of rows) {
            /** @type {import('@sqlite.org/sqlite-wasm').Bindable[]} */
            const values = [];
            for (const value of row.values) {
                values.push(value);
            }
            const {contentKey} = row;
            if (contentKey !== null) {
                const contentId = this._termEntryContentIdByKey.get(contentKey);
                if (typeof contentId !== 'number') {
                    throw new Error('Failed to resolve term entry content id for batched insert');
                }
                values[5] = contentId;
            }
            resolved.push(values);
        }
        this._insertResolvedTermRows(resolved, resolved.length);
    }

    /**
     * @param {{contentKey: string, contentHash: string, contentBytes: Uint8Array, contentDictName: string|null}[]} rows
     * @throws {Error}
     */
    async _insertTermEntryContentBatch(rows) {
        if (rows.length === 0) { return; }
        const spans = await this._termContentStore.appendBatch(rows.map((row) => row.contentBytes));
        /** @type {string[]} */
        const valueRows = [];
        /** @type {import('@sqlite.org/sqlite-wasm').Bindable[]} */
        const bind = [];
        for (let i = 0, ii = rows.length; i < ii; ++i) {
            const row = rows[i];
            const span = spans[i];
            valueRows.push('(?, NULL, ?, \'\', \'\', \'\', \'[]\', ?, ?)');
            bind.push(row.contentHash, row.contentDictName, span.offset, span.length);
        }
        const sql = `
            INSERT INTO termEntryContent(contentHash, contentZstd, contentDictName, rules, definitionTags, termTags, glossaryJson, contentOffset, contentLength)
            VALUES ${valueRows.join(',')}
        `;
        const stmt = this._getCachedStatement(sql);
        stmt.reset(true);
        stmt.bind(bind);
        stmt.step();

        const db = this._requireDb();
        const lastInsertRowId = this._asNumber(db.selectValue('SELECT last_insert_rowid()'), -1);
        if (lastInsertRowId <= 0) {
            throw new Error('Failed to insert batched term entry content');
        }
        const firstId = lastInsertRowId - rows.length + 1;
        for (let i = 0, ii = rows.length; i < ii; ++i) {
            const id = firstId + i;
            this._termEntryContentIdByHash.set(rows[i].contentHash, id);
            this._termEntryContentIdByKey.set(rows[i].contentKey, id);
        }
    }

    /**
     * @param {import('dictionary-database').ObjectStoreData<'terms'>[]} items
     * @param {number} start
     * @param {number} count
     * @returns {Promise<void>}
     */
    async _bulkAddTermsWithoutContentDedup(items, start, count) {
        const db = this._requireDb();
        const useLocalTransaction = !this._bulkImportTransactionOpen;
        const batchSize = 1024;

        if (useLocalTransaction) {
            db.exec('BEGIN IMMEDIATE');
        }
        try {
            for (let i = start, ii = start + count; i < ii; i += batchSize) {
                const chunkCount = Math.min(batchSize, ii - i);
                /** @type {string[]} */
                const valueRows = [];
                /** @type {import('@sqlite.org/sqlite-wasm').BindableValue[]} */
                const bind = [];
                for (let j = 0; j < chunkCount; ++j) {
                    const row = /** @type {import('dictionary-database').DatabaseTermEntry} */ (items[i + j]);
                    valueRows.push(
                        '(?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?)',
                    );
                    bind.push(
                        row.dictionary,
                        row.expression,
                        row.reading,
                        row.expressionReverse ?? null,
                        row.readingReverse ?? null,
                        row.definitionTags ?? row.tags ?? null,
                        row.termTags ?? null,
                        row.rules,
                        row.score,
                        row.glossaryJson ?? JSON.stringify(row.glossary),
                        typeof row.sequence === 'number' ? row.sequence : null,
                    );
                }
                const sql = `
                    INSERT INTO terms(
                        dictionary, expression, reading, expressionReverse, readingReverse,
                        entryContentId, definitionTags, termTags, rules, score, glossaryJson, sequence
                    ) VALUES ${valueRows.join(',')}
                `;
                const stmt = this._getCachedStatement(sql);
                stmt.reset(true);
                stmt.bind(bind);
                stmt.step();
            }
            if (useLocalTransaction) {
                db.exec('COMMIT');
            }
        } catch (e) {
            if (useLocalTransaction) {
                try { db.exec('ROLLBACK'); } catch (_) { /* NOP */ }
            }
            throw e;
        }
    }

    /**
     * @param {import('@sqlite.org/sqlite-wasm').PreparedStatement} insertContentStmt
     * @param {string} contentHash
     * @param {Uint8Array} contentZstd
     * @param {string|null} contentDictName
     * @param {string} contentKey
     * @returns {Promise<number>}
     * @throws {Error}
     */
    async _resolveOrCreateTermEntryContentId(insertContentStmt, contentHash, contentZstd, contentDictName, contentKey) {
        const cachedId = this._termEntryContentIdByKey.get(contentKey);
        if (typeof cachedId === 'number') {
            return cachedId;
        }
        const cachedHashId = this._termEntryContentIdByHash.get(contentHash);
        if (typeof cachedHashId === 'number') {
            this._termEntryContentIdByKey.set(contentKey, cachedHashId);
            return cachedHashId;
        }

        insertContentStmt.reset(true);
        const [span] = await this._termContentStore.appendBatch([contentZstd]);
        insertContentStmt.bind({
            $contentHash: contentHash,
            $contentDictName: contentDictName,
            $contentOffset: span.offset,
            $contentLength: span.length,
        });
        insertContentStmt.step();

        const db = this._requireDb();
        const id = this._asNumber(db.selectValue('SELECT last_insert_rowid()'), -1);
        if (id <= 0) {
            throw new Error('Failed to insert term entry content');
        }
        this._termEntryContentIdByHash.set(contentHash, id);
        this._termEntryContentIdByKey.set(contentKey, id);
        return id;
    }

    /** */
    _loadTermEntryContentHashIndex() {
        if (this._termEntryContentIdByHash.size > 0) { return; }
        const stmt = this._getCachedStatement('SELECT id, contentHash FROM termEntryContent');
        stmt.reset(true);
        while (stmt.step()) {
            const row = /** @type {import('core').SafeAny[]} */ (stmt.get([]));
            const id = this._asNumber(row[0], -1);
            if (id <= 0) { continue; }
            const contentHash = this._asString(row[1]);
            if (contentHash.length === 0) { continue; }
            if (!this._termEntryContentIdByHash.has(contentHash)) {
                this._termEntryContentIdByHash.set(contentHash, id);
            }
        }
    }

    /** */
    _pruneOrphanTermEntryContent() {
        const db = this._requireDb();
        db.exec(`
            DELETE FROM termEntryContent
            WHERE id NOT IN (
                SELECT DISTINCT entryContentId
                FROM terms
                WHERE entryContentId IS NOT NULL
            )
        `);
    }

    // Parent-Worker API

    /**
     * @param {MessagePort} port
     */
    async connectToDatabaseWorker(port) {
        if (this._worker !== null) {
            this._worker.postMessage({action: 'connectToDatabaseWorker'}, [port]);
            return;
        }

        port.onmessage = (/** @type {MessageEvent<import('dictionary-database').ApiMessageAny>} */ event) => {
            const {action, params} = event.data;
            return invokeApiMapHandler(this._apiMap, action, params, [port], () => {});
        };
        port.onmessageerror = (event) => {
            const error = new ExtensionError('DictionaryDatabase: Error receiving message from main thread');
            error.data = event;
            log.error(error);
        };
    }

    /** @type {import('dictionary-database').ApiHandler<'drawMedia'>} */
    _onDrawMedia(params, port) {
        void this.drawMedia(params.requests, port);
    }

    // Private

    /**
     * @returns {Promise<void>}
     */
    async _openConnection() {
        this._sqlite3 = await getSqlite3();
        this._db = await openOpfsDatabase();
        this._usesFallbackStorage = didLastOpenUseFallbackStorage();
        await this._termContentStore.prepare();

        this._applyRuntimePragmas();

        await this._initializeSchema();
    }

    /** */
    async _initializeSchema() {
        const db = this._requireDb();
        db.exec(`
            CREATE TABLE IF NOT EXISTS dictionaries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                version INTEGER NOT NULL,
                summaryJson TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS termEntryContent (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                contentHash TEXT NOT NULL,
                contentZstd BLOB,
                contentOffset INTEGER,
                contentLength INTEGER,
                contentDictName TEXT,
                rules TEXT NOT NULL,
                definitionTags TEXT NOT NULL,
                termTags TEXT NOT NULL,
                glossaryJson TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS terms (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                dictionary TEXT NOT NULL,
                expression TEXT NOT NULL,
                reading TEXT NOT NULL,
                expressionReverse TEXT,
                readingReverse TEXT,
                entryContentId INTEGER,
                definitionTags TEXT,
                termTags TEXT,
                rules TEXT,
                score INTEGER,
                glossaryJson TEXT NOT NULL,
                sequence INTEGER
            );

            CREATE TABLE IF NOT EXISTS termMeta (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                dictionary TEXT NOT NULL,
                expression TEXT NOT NULL,
                mode TEXT NOT NULL,
                dataJson TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS kanji (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                dictionary TEXT NOT NULL,
                character TEXT NOT NULL,
                onyomi TEXT,
                kunyomi TEXT,
                tags TEXT,
                meaningsJson TEXT NOT NULL,
                statsJson TEXT
            );

            CREATE TABLE IF NOT EXISTS kanjiMeta (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                dictionary TEXT NOT NULL,
                character TEXT NOT NULL,
                mode TEXT NOT NULL,
                dataJson TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS tagMeta (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                dictionary TEXT NOT NULL,
                name TEXT NOT NULL,
                category TEXT,
                ord INTEGER,
                notes TEXT,
                score INTEGER
            );

            CREATE TABLE IF NOT EXISTS media (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                dictionary TEXT NOT NULL,
                path TEXT NOT NULL,
                mediaType TEXT NOT NULL,
                width INTEGER NOT NULL,
                height INTEGER NOT NULL,
                content BLOB NOT NULL
            );
        `);
        await this._migrateTermsContentSchema();
        if (!this._enableSqliteSecondaryIndexes) {
            for (const dropIndexSql of this._createDropIndexesSql()) {
                db.exec(dropIndexSql);
            }
        }
        for (const createIndexSql of this._createIndexesSql()) {
            db.exec(createIndexSql);
        }
    }

    /**
     * @returns {string[]}
     */
    _createIndexesSql() {
        if (!this._enableSqliteSecondaryIndexes) {
            return [];
        }
        return [
            'CREATE INDEX IF NOT EXISTS idx_dictionaries_title ON dictionaries(title)',
            'CREATE INDEX IF NOT EXISTS idx_dictionaries_version ON dictionaries(version)',
            'CREATE INDEX IF NOT EXISTS idx_terms_dictionary ON terms(dictionary)',
            'CREATE INDEX IF NOT EXISTS idx_terms_expression_dictionary ON terms(expression, dictionary)',
            'CREATE INDEX IF NOT EXISTS idx_terms_reading_dictionary ON terms(reading, dictionary)',
            'CREATE INDEX IF NOT EXISTS idx_terms_sequence_dictionary ON terms(sequence, dictionary)',
            'CREATE INDEX IF NOT EXISTS idx_terms_expression_reverse_dictionary ON terms(expressionReverse, dictionary)',
            'CREATE INDEX IF NOT EXISTS idx_terms_reading_reverse_dictionary ON terms(readingReverse, dictionary)',
            'CREATE INDEX IF NOT EXISTS idx_terms_entry_content_id ON terms(entryContentId)',
            'CREATE INDEX IF NOT EXISTS idx_term_entry_content_hash ON termEntryContent(contentHash)',
            'CREATE INDEX IF NOT EXISTS idx_term_meta_expression_dictionary ON termMeta(expression, dictionary)',
            'CREATE INDEX IF NOT EXISTS idx_kanji_character_dictionary ON kanji(character, dictionary)',
            'CREATE INDEX IF NOT EXISTS idx_kanji_meta_character_dictionary ON kanjiMeta(character, dictionary)',
            'CREATE INDEX IF NOT EXISTS idx_tag_meta_dictionary_name ON tagMeta(dictionary, name)',
            'CREATE INDEX IF NOT EXISTS idx_media_dictionary_path ON media(dictionary, path)',
        ];
    }

    /**
     * @returns {string[]}
     */
    _createDropIndexesSql() {
        return [
            'DROP INDEX IF EXISTS idx_dictionaries_title',
            'DROP INDEX IF EXISTS idx_dictionaries_version',
            'DROP INDEX IF EXISTS idx_terms_dictionary',
            'DROP INDEX IF EXISTS idx_terms_expression_dictionary',
            'DROP INDEX IF EXISTS idx_terms_reading_dictionary',
            'DROP INDEX IF EXISTS idx_terms_sequence_dictionary',
            'DROP INDEX IF EXISTS idx_terms_expression_reverse_dictionary',
            'DROP INDEX IF EXISTS idx_terms_reading_reverse_dictionary',
            'DROP INDEX IF EXISTS idx_terms_entry_content_id',
            'DROP INDEX IF EXISTS idx_term_entry_content_hash',
            'DROP INDEX IF EXISTS idx_term_meta_expression_dictionary',
            'DROP INDEX IF EXISTS idx_kanji_character_dictionary',
            'DROP INDEX IF EXISTS idx_kanji_meta_character_dictionary',
            'DROP INDEX IF EXISTS idx_tag_meta_dictionary_name',
            'DROP INDEX IF EXISTS idx_media_dictionary_path',
            // Legacy index names from pre-optimization schema revisions.
            'DROP INDEX IF EXISTS idx_terms_expression',
            'DROP INDEX IF EXISTS idx_terms_reading',
            'DROP INDEX IF EXISTS idx_terms_sequence',
            'DROP INDEX IF EXISTS idx_terms_expression_reverse',
            'DROP INDEX IF EXISTS idx_terms_reading_reverse',
            'DROP INDEX IF EXISTS idx_term_meta_dictionary',
            'DROP INDEX IF EXISTS idx_term_meta_expression',
            'DROP INDEX IF EXISTS idx_kanji_dictionary',
            'DROP INDEX IF EXISTS idx_kanji_character',
            'DROP INDEX IF EXISTS idx_kanji_meta_dictionary',
            'DROP INDEX IF EXISTS idx_kanji_meta_character',
            'DROP INDEX IF EXISTS idx_tag_meta_dictionary',
            'DROP INDEX IF EXISTS idx_tag_meta_name',
            'DROP INDEX IF EXISTS idx_media_dictionary',
            'DROP INDEX IF EXISTS idx_media_path',
        ];
    }

    /** */
    async _migrateTermsContentSchema() {
        const db = this._requireDb();
        const contentTableInfo = db.selectObjects('PRAGMA table_info(termEntryContent)');
        const hasContentZstd = contentTableInfo.some((row) => this._asString(row.name) === 'contentZstd');
        const hasContentOffset = contentTableInfo.some((row) => this._asString(row.name) === 'contentOffset');
        const hasContentLength = contentTableInfo.some((row) => this._asString(row.name) === 'contentLength');
        const hasContentDictName = contentTableInfo.some((row) => this._asString(row.name) === 'contentDictName');
        if (!hasContentZstd) {
            db.exec('ALTER TABLE termEntryContent ADD COLUMN contentZstd BLOB');
        }
        if (!hasContentDictName) {
            db.exec('ALTER TABLE termEntryContent ADD COLUMN contentDictName TEXT');
        }
        if (!hasContentOffset) {
            db.exec('ALTER TABLE termEntryContent ADD COLUMN contentOffset INTEGER');
        }
        if (!hasContentLength) {
            db.exec('ALTER TABLE termEntryContent ADD COLUMN contentLength INTEGER');
        }

        const tableInfo = db.selectObjects('PRAGMA table_info(terms)');
        const hasEntryContentId = tableInfo.some((row) => this._asString(row.name) === 'entryContentId');
        if (!hasEntryContentId) {
            db.exec('ALTER TABLE terms ADD COLUMN entryContentId INTEGER');
        }

        db.exec(`
            INSERT INTO termEntryContent(contentHash, rules, definitionTags, termTags, glossaryJson)
            SELECT
                '',
                COALESCE(t.rules, ''),
                COALESCE(t.definitionTags, ''),
                COALESCE(t.termTags, ''),
                COALESCE(t.glossaryJson, '[]')
            FROM terms t
            WHERE t.entryContentId IS NULL
        `);

        const contentRows = db.selectObjects('SELECT id, rules, definitionTags, termTags, glossaryJson FROM termEntryContent WHERE contentHash = \'\'');
        for (const row of contentRows) {
            const id = this._asNumber(row.id, -1);
            if (id <= 0) { continue; }
            const rules = this._asString(row.rules);
            const definitionTags = this._asString(row.definitionTags);
            const termTags = this._asString(row.termTags);
            const glossaryJson = this._asString(row.glossaryJson);
            const contentHash = this._hashEntryContent(this._serializeTermEntryContent(
                rules,
                definitionTags,
                termTags,
                this._safeParseJson(glossaryJson, []),
            ));
            db.exec({
                sql: 'UPDATE termEntryContent SET contentHash = $contentHash WHERE id = $id',
                bind: {$contentHash: contentHash, $id: id},
            });
        }

        db.exec(`
            UPDATE terms
            SET entryContentId = (
                SELECT c.id
                FROM termEntryContent c
                WHERE
                    c.rules = COALESCE(terms.rules, '') AND
                    c.definitionTags = COALESCE(terms.definitionTags, '') AND
                    c.termTags = COALESCE(terms.termTags, '') AND
                    c.glossaryJson = COALESCE(terms.glossaryJson, '[]')
                LIMIT 1
            )
            WHERE entryContentId IS NULL
        `);

        const externalizeRows = db.selectObjects(`
            SELECT id, contentZstd
            FROM termEntryContent
            WHERE
                contentZstd IS NOT NULL AND
                length(contentZstd) > 0 AND
                (contentOffset IS NULL OR contentOffset < 0 OR contentLength IS NULL OR contentLength <= 0)
        `);
        if (externalizeRows.length > 0) {
            const chunks = [];
            for (const row of externalizeRows) {
                const contentZstd = this._toUint8Array(row.contentZstd);
                if (contentZstd === null || contentZstd.byteLength <= 0) { continue; }
                chunks.push(contentZstd);
            }
            if (chunks.length > 0) {
                const spans = await this._termContentStore.appendBatch(chunks);
                let spanIndex = 0;
                for (const row of externalizeRows) {
                    const id = this._asNumber(row.id, -1);
                    const contentZstd = this._toUint8Array(row.contentZstd);
                    if (id <= 0 || contentZstd === null || contentZstd.byteLength <= 0) { continue; }
                    const span = spans[spanIndex++];
                    db.exec({
                        sql: `
                            UPDATE termEntryContent
                            SET contentOffset = $contentOffset, contentLength = $contentLength, contentZstd = NULL
                            WHERE id = $id
                        `,
                        bind: {$contentOffset: span.offset, $contentLength: span.length, $id: id},
                    });
                }
            }
        }
    }

    /**
     * Best effort cleanup for old IndexedDB storage from pre-sqlite builds.
     */
    async _deleteLegacyIndexedDb() {
        if (typeof indexedDB === 'undefined') {
            return;
        }
        await new Promise((resolve) => {
            try {
                const request = indexedDB.deleteDatabase('dict');
                request.onsuccess = () => resolve(void 0);
                request.onerror = () => resolve(void 0);
                request.onblocked = () => resolve(void 0);
            } catch (_) {
                resolve(void 0);
            }
        });
    }

    /**
     * @returns {import('@sqlite.org/sqlite-wasm').Database}
     * @throws {Error}
     */
    _requireDb() {
        if (this._db === null) {
            throw new Error(this._isOpening ? 'Database not ready' : 'Database not open');
        }
        return this._db;
    }

    /**
     * @returns {import('@sqlite.org/sqlite-wasm').Sqlite3Static}
     * @throws {Error}
     */
    _requireSqlite3() {
        if (this._sqlite3 === null) {
            throw new Error('sqlite3 module is not initialized');
        }
        return this._sqlite3;
    }

    /**
     * @template {import('dictionary-database').ObjectStoreName} T
     * @param {T} objectStoreName
     * @returns {InsertStatement}
     * @throws {Error}
     */
    _getInsertStatement(objectStoreName) {
        switch (objectStoreName) {
            case 'dictionaries':
                return {
                    sql: 'INSERT INTO dictionaries(title, version, summaryJson) VALUES($title, $version, $summaryJson)',
                    bind: (item) => {
                        const summary = /** @type {import('dictionary-importer').Summary} */ (item);
                        return {
                            $title: summary.title,
                            $version: summary.version,
                            $summaryJson: JSON.stringify(summary),
                        };
                    },
                };
            case 'terms':
                return {
                    sql: `INSERT INTO terms(
                        dictionary, expression, reading, expressionReverse, readingReverse,
                        definitionTags, termTags, rules, score, glossaryJson, sequence
                    ) VALUES(
                        $dictionary, $expression, $reading, $expressionReverse, $readingReverse,
                        $definitionTags, $termTags, $rules, $score, $glossaryJson, $sequence
                    )`,
                    bind: (item) => {
                        const row = /** @type {import('dictionary-database').DatabaseTermEntry} */ (item);
                        return {
                            $dictionary: row.dictionary,
                            $expression: row.expression,
                            $reading: row.reading,
                            $expressionReverse: row.expressionReverse ?? null,
                            $readingReverse: row.readingReverse ?? null,
                            $definitionTags: row.definitionTags ?? row.tags ?? null,
                            $termTags: row.termTags ?? null,
                            $rules: row.rules,
                            $score: row.score,
                            $glossaryJson: JSON.stringify(row.glossary),
                            $sequence: typeof row.sequence === 'number' ? row.sequence : null,
                        };
                    },
                };
            case 'termMeta':
                return {
                    sql: 'INSERT INTO termMeta(dictionary, expression, mode, dataJson) VALUES($dictionary, $expression, $mode, $dataJson)',
                    bind: (item) => {
                        const row = /** @type {import('dictionary-database').DatabaseTermMeta} */ (item);
                        return {
                            $dictionary: row.dictionary,
                            $expression: row.expression,
                            $mode: row.mode,
                            $dataJson: JSON.stringify(row.data),
                        };
                    },
                };
            case 'kanji':
                return {
                    sql: 'INSERT INTO kanji(dictionary, character, onyomi, kunyomi, tags, meaningsJson, statsJson) VALUES($dictionary, $character, $onyomi, $kunyomi, $tags, $meaningsJson, $statsJson)',
                    bind: (item) => {
                        const row = /** @type {import('dictionary-database').DatabaseKanjiEntry} */ (item);
                        return {
                            $dictionary: row.dictionary,
                            $character: row.character,
                            $onyomi: row.onyomi,
                            $kunyomi: row.kunyomi,
                            $tags: row.tags,
                            $meaningsJson: JSON.stringify(row.meanings),
                            $statsJson: row.stats ? JSON.stringify(row.stats) : null,
                        };
                    },
                };
            case 'kanjiMeta':
                return {
                    sql: 'INSERT INTO kanjiMeta(dictionary, character, mode, dataJson) VALUES($dictionary, $character, $mode, $dataJson)',
                    bind: (item) => {
                        const row = /** @type {import('dictionary-database').DatabaseKanjiMeta} */ (item);
                        return {
                            $dictionary: row.dictionary,
                            $character: row.character,
                            $mode: row.mode,
                            $dataJson: JSON.stringify(row.data),
                        };
                    },
                };
            case 'tagMeta':
                return {
                    sql: 'INSERT INTO tagMeta(dictionary, name, category, ord, notes, score) VALUES($dictionary, $name, $category, $ord, $notes, $score)',
                    bind: (item) => {
                        const row = /** @type {import('dictionary-database').Tag} */ (item);
                        return {
                            $dictionary: row.dictionary,
                            $name: row.name,
                            $category: row.category,
                            $ord: row.order,
                            $notes: row.notes,
                            $score: row.score,
                        };
                    },
                };
            case 'media':
                return {
                    sql: 'INSERT INTO media(dictionary, path, mediaType, width, height, content) VALUES($dictionary, $path, $mediaType, $width, $height, $content)',
                    bind: (item) => {
                        const row = /** @type {import('dictionary-database').MediaDataArrayBufferContent} */ (item);
                        return {
                            $dictionary: row.dictionary,
                            $path: row.path,
                            $mediaType: row.mediaType,
                            $width: row.width,
                            $height: row.height,
                            $content: row.content,
                        };
                    },
                };
            default:
                throw new Error(`Unsupported object store: ${objectStoreName}`);
        }
    }

    /**
     * @param {string} whereClause
     * @returns {string}
     */
    _createTermSelectSql(whereClause) {
        return `
            SELECT
                t.*,
                c.contentZstd AS c_contentZstd,
                c.contentOffset AS c_contentOffset,
                c.contentLength AS c_contentLength,
                c.contentDictName AS c_contentDictName
            FROM terms t
            LEFT JOIN termEntryContent c ON c.id = t.entryContentId
            WHERE ${whereClause}
        `;
    }

    /**
     * @param {Iterable<number>} ids
     * @returns {Promise<Map<number, import('dictionary-database').DatabaseTermEntryWithId>>}
     */
    async _fetchTermRowsByIds(ids) {
        await this._termContentStore.ensureLoadedForRead();
        /** @type {Map<number, import('dictionary-database').DatabaseTermEntryWithId>} */
        const rowsById = new Map();
        const idArray = [...ids].filter((id) => id > 0);
        for (const idChunk of this._chunkValues(idArray, 256)) {
            const {clause: idInClause, bind: idBind} = this._buildNumberInClause(idChunk, 'id');
            const fullSql = this._createTermSelectSql(`t.id IN (${idInClause})`);
            const stmt = this._getCachedStatement(fullSql);
            stmt.reset(true);
            stmt.bind(idBind);
            while (stmt.step()) {
                const row = this._deserializeTermRow(/** @type {import('core').SafeAny} */ (stmt.get({})));
                rowsById.set(row.id, row);
            }
        }
        return rowsById;
    }

    /**
     * @param {import('core').SafeAny} row
     * @returns {import('dictionary-database').DatabaseTermEntryWithId}
     */
    _deserializeTermRow(row) {
        const entryContentId = this._asNullableNumber(row.entryContentId);
        /** @type {string|null} */
        let definitionTags;
        /** @type {string|undefined} */
        let termTags;
        /** @type {string} */
        let rules;
        /** @type {import('dictionary-data').TermGlossary[]} */
        let glossary;

        if (typeof entryContentId === 'number' && entryContentId > 0) {
            const cached = this._termEntryContentCache.get(entryContentId);
            if (typeof cached !== 'undefined') {
                definitionTags = cached.definitionTags;
                termTags = cached.termTags;
                rules = cached.rules;
                glossary = cached.glossary;
            } else {
                const contentOffset = this._asNumber(row.c_contentOffset, -1);
                const contentLength = this._asNumber(row.c_contentLength, -1);
                const contentDictName = this._asNullableString(row.c_contentDictName) ?? '';
                let contentBytes = (contentOffset >= 0 && contentLength > 0) ? this._termContentStore.readSlice(contentOffset, contentLength) : null;
                if (contentBytes === null) {
                    // Transitional migration support only.
                    contentBytes = this._toUint8Array(row.c_contentZstd);
                }
                if (contentBytes !== null && contentBytes.length > 0) {
                    try {
                        const contentJson = (contentDictName === 'raw') ?
                            this._textDecoder.decode(contentBytes) :
                            this._textDecoder.decode(decompressTermContentZstd(contentBytes, contentDictName.length > 0 ? contentDictName : null));
                        const content = /** @type {{rules?: string, definitionTags?: string, termTags?: string, glossary?: import('dictionary-data').TermGlossary[]}} */ (
                            this._safeParseJson(contentJson, {})
                        );
                        definitionTags = this._asNullableString(content.definitionTags) ?? null;
                        termTags = this._asNullableString(content.termTags);
                        rules = this._asString(content.rules);
                        glossary = Array.isArray(content.glossary) ? content.glossary : [];
                    } catch (e) {
                        logTermContentZstdError(e);
                        definitionTags = null;
                        termTags = '';
                        rules = '';
                        glossary = [];
                    }
                } else {
                    definitionTags = null;
                    termTags = '';
                    rules = '';
                    glossary = [];
                }
                this._termEntryContentCache.set(entryContentId, {definitionTags, termTags, rules, glossary});
            }
        } else {
            definitionTags = this._asNullableString(row.definitionTags) ?? null;
            termTags = this._asNullableString(row.termTags);
            rules = this._asString(row.rules);
            glossary = this._safeParseJson(this._asString(row.glossaryJson), []);
        }
        return {
            id: this._asNumber(row.id, -1),
            expression: this._asString(row.expression),
            reading: this._asString(row.reading),
            expressionReverse: this._asNullableString(row.expressionReverse),
            readingReverse: this._asNullableString(row.readingReverse),
            definitionTags,
            rules,
            score: this._asNumber(row.score, 0),
            glossary,
            sequence: this._asNullableNumber(row.sequence),
            termTags,
            dictionary: this._asString(row.dictionary),
        };
    }

    /**
     * @param {import('core').SafeAny} row
     * @returns {import('dictionary-database').DatabaseTermMeta}
     * @throws {Error}
     */
    _deserializeTermMetaRow(row) {
        const expression = this._asString(row.expression);
        const dictionary = this._asString(row.dictionary);
        const mode = this._asString(row.mode);
        const data = /** @type {unknown} */ (this._safeParseJson(this._asString(row.dataJson), null));
        switch (mode) {
            case 'freq':
                return {
                    expression,
                    mode: 'freq',
                    data: /** @type {import('dictionary-data').GenericFrequencyData | import('dictionary-data').TermMetaFrequencyDataWithReading} */ (data),
                    dictionary,
                };
            case 'pitch':
                return {
                    expression,
                    mode: 'pitch',
                    data: /** @type {import('dictionary-data').TermMetaPitchData} */ (data),
                    dictionary,
                };
            case 'ipa':
                return {
                    expression,
                    mode: 'ipa',
                    data: /** @type {import('dictionary-data').TermMetaPhoneticData} */ (data),
                    dictionary,
                };
            default:
                throw new Error(`Unknown mode: ${mode}`);
        }
    }

    /**
     * @param {import('core').SafeAny} row
     * @returns {import('dictionary-database').DatabaseKanjiEntry}
     */
    _deserializeKanjiRow(row) {
        return {
            character: this._asString(row.character),
            onyomi: this._asString(row.onyomi),
            kunyomi: this._asString(row.kunyomi),
            tags: this._asString(row.tags),
            meanings: this._safeParseJson(this._asString(row.meaningsJson), []),
            dictionary: this._asString(row.dictionary),
            stats: this._safeParseJson(this._asNullableString(row.statsJson) ?? '{}', {}),
        };
    }

    /**
     * @param {import('core').SafeAny} row
     * @returns {import('dictionary-database').DatabaseKanjiMeta}
     * @throws {Error}
     */
    _deserializeKanjiMetaRow(row) {
        const character = this._asString(row.character);
        const dictionary = this._asString(row.dictionary);
        const mode = this._asString(row.mode);
        const data = /** @type {unknown} */ (this._safeParseJson(this._asString(row.dataJson), null));
        if (mode !== 'freq') {
            throw new Error(`Unknown mode: ${mode}`);
        }
        return {
            character,
            mode: 'freq',
            data: /** @type {import('dictionary-data').GenericFrequencyData} */ (data),
            dictionary,
        };
    }

    /**
     * @param {import('core').SafeAny} row
     * @returns {import('dictionary-database').Tag}
     */
    _deserializeTagRow(row) {
        return {
            name: this._asString(row.name),
            category: this._asString(row.category),
            order: this._asNumber(row.order, 0),
            notes: this._asString(row.notes),
            score: this._asNumber(row.score, 0),
            dictionary: this._asString(row.dictionary),
        };
    }

    /**
     * @param {import('core').SafeAny} row
     * @returns {import('dictionary-database').MediaDataArrayBufferContent}
     */
    _deserializeMediaRow(row) {
        return {
            dictionary: this._asString(row.dictionary),
            path: this._asString(row.path),
            mediaType: this._asString(row.mediaType),
            width: this._asNumber(row.width, 0),
            height: this._asNumber(row.height, 0),
            content: this._toArrayBuffer(row.content),
        };
    }

    /**
     * @param {unknown} field
     * @returns {string[]}
     */
    _splitField(field) {
        return typeof field === 'string' && field.length > 0 ? field.split(' ') : [];
    }

    /**
     * @param {unknown} value
     * @returns {ArrayBuffer}
     */
    _toArrayBuffer(value) {
        if (value instanceof ArrayBuffer) {
            return value;
        }
        if (value instanceof Uint8Array) {
            return value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength);
        }
        return new ArrayBuffer(0);
    }

    /**
     * @param {unknown} value
     * @returns {Uint8Array|null}
     */
    _toUint8Array(value) {
        if (value instanceof Uint8Array) {
            return value;
        }
        if (value instanceof ArrayBuffer) {
            return new Uint8Array(value);
        }
        return null;
    }

    /**
     * @param {Uint8Array} a
     * @param {Uint8Array} b
     * @returns {boolean}
     */
    _areUint8ArraysEqual(a, b) {
        if (a.byteLength !== b.byteLength) {
            return false;
        }
        for (let i = 0, ii = a.byteLength; i < ii; ++i) {
            if (a[i] !== b[i]) {
                return false;
            }
        }
        return true;
    }

    /**
     * @param {unknown} value
     * @param {number} defaultValue
     * @returns {number}
     */
    _asNumber(value, defaultValue = 0) {
        if (typeof value === 'number') { return value; }
        if (typeof value === 'bigint') { return Number(value); }
        if (typeof value === 'string' && value.length > 0) {
            const parsed = Number(value);
            return Number.isFinite(parsed) ? parsed : defaultValue;
        }
        return defaultValue;
    }

    /**
     * @param {unknown} value
     * @returns {number|undefined}
     */
    _asNullableNumber(value) {
        if (value === null || typeof value === 'undefined') {
            return void 0;
        }
        return this._asNumber(value, 0);
    }

    /**
     * @param {unknown} value
     * @returns {string}
     */
    _asString(value) {
        if (typeof value === 'string') {
            return value;
        }
        if (typeof value === 'number' || typeof value === 'bigint') {
            return `${value}`;
        }
        return '';
    }

    /**
     * @param {unknown} value
     * @returns {string|undefined}
     */
    _asNullableString(value) {
        if (value === null || typeof value === 'undefined') {
            return void 0;
        }
        return this._asString(value);
    }

    /**
     * @template [T=unknown]
     * @param {string} value
     * @param {T} fallback
     * @returns {T}
     */
    _safeParseJson(value, fallback) {
        try {
            return /** @type {T} */ (parseJson(value));
        } catch (_) {
            return fallback;
        }
    }

    /**
     * @param {string} rules
     * @param {string} definitionTags
     * @param {string} termTags
     * @param {import('dictionary-data').TermGlossary[]} glossary
     * @returns {string}
     */
    _serializeTermEntryContent(rules, definitionTags, termTags, glossary) {
        return JSON.stringify({rules, definitionTags, termTags, glossary});
    }

    /**
     * @param {string} contentJson
     * @returns {string}
     */
    _hashEntryContent(contentJson) {
        let h1 = 0x811c9dc5;
        let h2 = 0x9e3779b9;
        for (let i = 0, ii = contentJson.length; i < ii; ++i) {
            const code = contentJson.charCodeAt(i);
            h1 = Math.imul((h1 ^ code) >>> 0, 0x01000193);
            h2 = Math.imul((h2 ^ code) >>> 0, 0x85ebca6b);
            h2 = (h2 ^ (h2 >>> 13)) >>> 0;
        }
        if ((h1 | h2) === 0) {
            h1 = 1;
        }
        return `${(h1 >>> 0).toString(16).padStart(8, '0')}${(h2 >>> 0).toString(16).padStart(8, '0')}`;
    }

    /** */
    _applyRuntimePragmas() {
        const db = this._requireDb();
        db.exec('PRAGMA journal_mode = WAL');
        db.exec('PRAGMA synchronous = NORMAL');
        db.exec('PRAGMA temp_store = MEMORY');
        db.exec('PRAGMA foreign_keys = OFF');
        db.exec('PRAGMA wal_autocheckpoint = 1000');
        db.exec('PRAGMA cache_size = -16384');
        db.exec('PRAGMA locking_mode = NORMAL');
    }

    /** */
    _applyImportPragmas() {
        const db = this._requireDb();
        db.exec('PRAGMA journal_mode = WAL');
        db.exec('PRAGMA synchronous = NORMAL');
        db.exec('PRAGMA temp_store = MEMORY');
        db.exec('PRAGMA foreign_keys = OFF');
        db.exec('PRAGMA cache_size = -65536');
        db.exec('PRAGMA wal_autocheckpoint = 0');
        db.exec('PRAGMA locking_mode = EXCLUSIVE');
    }

    /**
     * @param {import('dictionary-database').MatchSource} matchSource
     * @param {import('dictionary-database').MatchType} matchType
     * @param {import('dictionary-database').DatabaseTermEntryWithId} row
     * @param {number} index
     * @returns {import('dictionary-database').TermEntry}
     */
    _createTerm(matchSource, matchType, row, index) {
        const {sequence} = row;
        return {
            index,
            matchType,
            matchSource,
            term: row.expression,
            reading: row.reading,
            definitionTags: this._splitField(row.definitionTags || row.tags),
            termTags: this._splitField(row.termTags),
            rules: this._splitField(row.rules),
            definitions: row.glossary,
            score: row.score,
            dictionary: row.dictionary,
            id: row.id,
            sequence: typeof sequence === 'number' ? sequence : -1,
        };
    }

    /**
     * @param {import('dictionary-database').DatabaseKanjiEntry} row
     * @param {import('dictionary-database').FindMultiBulkData<string>} data
     * @returns {import('dictionary-database').KanjiEntry}
     */
    _createKanji(row, {itemIndex: index}) {
        const {stats} = row;
        return {
            index,
            character: row.character,
            onyomi: this._splitField(row.onyomi),
            kunyomi: this._splitField(row.kunyomi),
            tags: this._splitField(row.tags),
            definitions: row.meanings,
            stats: typeof stats === 'object' && stats !== null ? stats : {},
            dictionary: row.dictionary,
        };
    }

    /**
     * @param {import('dictionary-database').DatabaseTermMeta} row
     * @param {import('dictionary-database').FindMultiBulkData<string>} data
     * @returns {import('dictionary-database').TermMeta}
     * @throws {Error}
     */
    _createTermMeta({expression: term, mode, data, dictionary}, {itemIndex: index}) {
        switch (mode) {
            case 'freq':
                return {
                    index,
                    term,
                    mode: 'freq',
                    data: /** @type {import('dictionary-data').GenericFrequencyData | import('dictionary-data').TermMetaFrequencyDataWithReading} */ (data),
                    dictionary,
                };
            case 'pitch':
                return {
                    index,
                    term,
                    mode: 'pitch',
                    data: /** @type {import('dictionary-data').TermMetaPitchData} */ (data),
                    dictionary,
                };
            case 'ipa':
                return {
                    index,
                    term,
                    mode: 'ipa',
                    data: /** @type {import('dictionary-data').TermMetaPhoneticData} */ (data),
                    dictionary,
                };
            default:
                throw new Error(`Unknown mode: ${mode}`);
        }
    }

    /**
     * @param {import('dictionary-database').DatabaseKanjiMeta} row
     * @param {import('dictionary-database').FindMultiBulkData<string>} data
     * @returns {import('dictionary-database').KanjiMeta}
     */
    _createKanjiMeta({character, mode, data, dictionary}, {itemIndex: index}) {
        return {index, character, mode, data, dictionary};
    }

    /**
     * @param {import('dictionary-database').MediaDataArrayBufferContent} row
     * @param {import('dictionary-database').FindMultiBulkData<import('dictionary-database').MediaRequest>} data
     * @returns {import('dictionary-database').Media}
     */
    _createMedia(row, {itemIndex: index}) {
        const {dictionary, path, mediaType, width, height, content} = row;
        return {index, dictionary, path, mediaType, width, height, content};
    }
}
