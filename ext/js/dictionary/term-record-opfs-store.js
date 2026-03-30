/*
 * Copyright (C) 2026 Manabitan authors
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

import {parseJson} from '../core/json.js';
import {reportDiagnostics} from '../core/diagnostics-reporter.js';
import {safePerformance} from '../core/safe-performance.js';
import {
    RAW_TERM_CONTENT_COMPRESSED_SHARED_GLOSSARY_DICT_NAME,
    RAW_TERM_CONTENT_DICT_NAME,
    RAW_TERM_CONTENT_SHARED_GLOSSARY_DICT_NAME,
} from './raw-term-content.js';
import {encodeTermRecordArtifactChunkWithWasmPreinterned, encodeTermRecordsWithWasm, encodeTermRecordsWithWasmPreinterned} from './term-record-wasm-encoder.js';

const LEGACY_FILE_NAME = 'manabitan-term-records.ndjson';
const SHARD_DIRECTORY_NAME = 'manabitan-term-records';
const SHARD_FILE_PREFIX = 'dict-';
const SHARD_FILE_SUFFIX = '.mbtr';
const SHARD_FILE_CONTENT_DICT_SEPARATOR = '|';
const SHARD_FILE_SEGMENT_SEPARATOR = '^';
const BINARY_MAGIC_TEXT = 'MBTRR11B';
const PREVIOUS_BINARY_MAGIC_TEXT = 'MBTRR10B';
const PREVIOUS_PREVIOUS_BINARY_MAGIC_TEXT = 'MBTRREC9';
const PREVIOUS_PREVIOUS_PREVIOUS_BINARY_MAGIC_TEXT = 'MBTRREC8';
const PREVIOUS_PREVIOUS_PREVIOUS_PREVIOUS_BINARY_MAGIC_TEXT = 'MBTRREC5';
const PREVIOUS_PREVIOUS_PREVIOUS_PREVIOUS_PREVIOUS_BINARY_MAGIC_TEXT = 'MBTRREC4';
const PREVIOUS_PREVIOUS_PREVIOUS_PREVIOUS_PREVIOUS_PREVIOUS_BINARY_MAGIC_TEXT = 'MBTRREC3';
const PREVIOUS_PREVIOUS_PREVIOUS_PREVIOUS_PREVIOUS_PREVIOUS_PREVIOUS_BINARY_MAGIC_TEXT = 'MBTRREC2';
const LEGACY_BINARY_MAGIC_TEXT = 'MBTRREC1';
const BINARY_MAGIC_BYTES = 8;
const CHUNK_HEADER_BYTES = 8;
const STRING_TABLE_HEADER_BYTES = 8;
const RECORD_HEADER_BYTES = 22;
const PREVIOUS_RECORD_HEADER_BYTES = 18;
const PREVIOUS_PREVIOUS_RECORD_HEADER_BYTES = 22;
const PREVIOUS_PREVIOUS_PREVIOUS_RECORD_HEADER_BYTES = 32;
const PREVIOUS_PREVIOUS_PREVIOUS_PREVIOUS_RECORD_HEADER_BYTES = 40;
const LEGACY_RECORD_HEADER_BYTES = 44;
const U32_NULL = 0xffffffff;
const U16_NULL = 0xffff;
const READING_EQUALS_EXPRESSION_U32 = 0xffffffff;
const DEFAULT_FLUSH_THRESHOLD_BYTES = 32 * 1024 * 1024;
const LOW_MEMORY_FLUSH_THRESHOLD_BYTES = 16 * 1024 * 1024;
const HIGH_MEMORY_FLUSH_THRESHOLD_BYTES = 64 * 1024 * 1024;
const DEFAULT_QUEUED_WRITE_BUDGET_BYTES = 64 * 1024 * 1024;
const LOW_MEMORY_QUEUED_WRITE_BUDGET_BYTES = 24 * 1024 * 1024;
const HIGH_MEMORY_QUEUED_WRITE_BUDGET_BYTES = 64 * 1024 * 1024;
const DEFAULT_WRITE_COALESCE_TARGET_BYTES = 4 * 1024 * 1024;
const LOW_MEMORY_WRITE_COALESCE_TARGET_BYTES = 1024 * 1024;
const HIGH_MEMORY_WRITE_COALESCE_TARGET_BYTES = 8 * 1024 * 1024;
const WRITE_COALESCE_MAX_CHUNKS = 512;
const MAX_SHARD_SEGMENT_FILE_BYTES = 1024 * 1024 * 1024;

/**
 * @param {unknown[]} rows
 * @returns {import('./term-record-wasm-encoder.js').PreinternedTermRecordPlan|null}
 */
function getTermRecordPreinternedPlan(rows) {
    const value = /** @type {{termRecordPreinternedPlan?: import('./term-record-wasm-encoder.js').PreinternedTermRecordPlan}} */ (/** @type {unknown} */ (rows)).termRecordPreinternedPlan;
    return value ?? null;
}

/**
 * @param {import('./term-record-wasm-encoder.js').PreinternedTermRecordPlan|null} plan
 * @param {number[]} indexes
 * @returns {import('./term-record-wasm-encoder.js').PreinternedTermRecordPlan|null}
 */
function selectTermRecordPreinternedPlan(plan, indexes) {
    if (plan === null) { return null; }
    const count = indexes.length;
    const expressionIndexes = new Uint32Array(count);
    const readingIndexes = new Uint32Array(count);
    for (let i = 0; i < count; ++i) {
        const sourceIndex = indexes[i];
        expressionIndexes[i] = plan.expressionIndexes[sourceIndex];
        readingIndexes[i] = plan.readingIndexes[sourceIndex];
    }
    return {
        stringLengths: plan.stringLengths,
        stringsBuffer: plan.stringsBuffer,
        expressionIndexes,
        readingIndexes,
    };
}

/**
 * @param {import('./term-record-wasm-encoder.js').PreinternedTermRecordPlan|null} plan
 * @param {number} start
 * @param {number} count
 * @returns {import('./term-record-wasm-encoder.js').PreinternedTermRecordPlan|null}
 */
function sliceTermRecordPreinternedPlan(plan, start, count) {
    if (plan === null) { return null; }
    const end = start + count;
    return {
        stringLengths: plan.stringLengths,
        stringsBuffer: plan.stringsBuffer,
        expressionIndexes: plan.expressionIndexes.subarray(start, end),
        readingIndexes: plan.readingIndexes.subarray(start, end),
    };
}
const ENTRY_CONTENT_DICT_NAME_CODE_RAW = 0;
const ENTRY_CONTENT_DICT_NAME_CODE_RAW_V2 = 1;
const ENTRY_CONTENT_DICT_NAME_CODE_RAW_V3 = 2;
const ENTRY_CONTENT_DICT_NAME_CODE_RAW_V4 = 3;
const ENTRY_CONTENT_DICT_NAME_CODE_JMDICT = 4;
const ENTRY_CONTENT_DICT_NAME_CODE_CUSTOM = 0xff;
const ENTRY_CONTENT_LENGTH_U16_NULL = 0xffff;
const ENTRY_CONTENT_LENGTH_EXTENDED_U16 = 0xfffe;
const ENTRY_CONTENT_DICT_NAME_FLAG_READING_EQUALS_EXPRESSION = 0x8000;
const ENTRY_CONTENT_DICT_NAME_FLAG_READING_REVERSE_EQUALS_EXPRESSION_REVERSE = 0x40000000;
const ENTRY_CONTENT_DICT_NAME_FLAGS_MASK = 0x8000;
const ENTRY_CONTENT_DICT_NAME_VALUE_MASK = 0x7fff;

class DenseIdRecordStore {
    /** */
    constructor() {
        /** @type {(TermRecord|undefined)[]} */
        this._records = [];
        /** @type {number} */
        this.size = 0;
    }

    /** */
    clear() {
        this._records = [];
        this.size = 0;
    }

    /**
     * @param {number} maxId
     * @returns {void}
     */
    ensureCapacity(maxId) {
        if (maxId < 0) { return; }
        const requiredLength = maxId + 1;
        if (this._records.length >= requiredLength) { return; }
        this._records.length = requiredLength;
    }

    /**
     * @param {number} id
     * @param {TermRecord} record
     * @returns {DenseIdRecordStore}
     */
    set(id, record) {
        if (typeof this._records[id] === 'undefined') {
            ++this.size;
        }
        this._records[id] = record;
        return this;
    }

    /**
     * @param {number} id
     * @returns {TermRecord|undefined}
     */
    get(id) {
        return this._records[id];
    }

    /**
     * @param {number} id
     * @returns {boolean}
     */
    delete(id) {
        if (typeof this._records[id] === 'undefined') {
            return false;
        }
        this._records[id] = void 0;
        --this.size;
        return true;
    }

    /**
     * @returns {Generator<number, void, void>}
     * @yields {number}
     */
    *keys() {
        for (let i = 1, ii = this._records.length; i < ii; ++i) {
            if (typeof this._records[i] !== 'undefined') {
                yield i;
            }
        }
    }

    /**
     * @returns {Generator<TermRecord, void, void>}
     * @yields {TermRecord}
     */
    *values() {
        for (let i = 1, ii = this._records.length; i < ii; ++i) {
            const record = this._records[i];
            if (typeof record !== 'undefined') {
                yield record;
            }
        }
    }
}

/**
 * @typedef {object} TermRecord
 * @property {number} id
 * @property {string} dictionary
 * @property {string} [expression]
 * @property {string} [reading]
 * @property {boolean} [readingEqualsExpression]
 * @property {Uint8Array} [expressionBytes]
 * @property {Uint8Array} [readingBytes]
 * @property {string|null} [expressionReverse]
 * @property {string|null} [readingReverse]
 * @property {number} entryContentOffset
 * @property {number} entryContentLength
 * @property {string} entryContentDictName
 * @property {number} score
 * @property {number|null} sequence
 */

/**
 * @typedef {object} TermRecordShardState
 * @property {string} fileName
 * @property {FileSystemFileHandle} fileHandle
 * @property {FileSystemWritableFileStream|null} writable
 * @property {number} fileLength
 * @property {number} pendingWriteBytes
 * @property {Uint8Array[]} pendingWriteChunks
 * @property {number} queuedWriteBytes
 * @property {Promise<void>|null} queuedWritePromise
 * @property {Uint8Array[]} queuedWriteChunks
 * @property {string|null} sharedContentDictName
 * @property {number} segmentIndex
 * @property {string} logicalKey
 */

/**
 * @typedef {object} PendingArtifactReloadPlan
 * @property {string} dictionary
 * @property {number} firstId
 * @property {number} rowCount
 * @property {Uint8Array[]} expressionBytesList
 * @property {Uint8Array[]} readingBytesList
 * @property {boolean[]} readingEqualsExpressionList
 * @property {number[]} contentOffsets
 * @property {number[]} contentLengths
 * @property {string | (string|null)[]} contentDictNames
 * @property {number[]} scoreList
 * @property {(number|undefined)[]} sequenceList
 */

export class TermRecordOpfsStore {
    constructor() {
        /** @type {FileSystemDirectoryHandle|null} */
        this._rootDirectoryHandle = null;
        /** @type {FileSystemDirectoryHandle|null} */
        this._recordsDirectoryHandle = null;
        /** @type {Map<string, TermRecordShardState>} */
        this._shardStateByFileName = new Map();
        /** @type {Map<string, TermRecordShardState>} */
        this._activeAppendShardStateByKey = new Map();
        /** @type {number} */
        this._flushThresholdBytes = this._computeFlushThresholdBytes();
        /** @type {number} */
        this._queuedWriteBudgetBytes = this._computeQueuedWriteBudgetBytes();
        /** @type {boolean} */
        this._importSessionActive = false;
        /** @type {DenseIdRecordStore} */
        this._recordsById = new DenseIdRecordStore();
        /** @type {number} */
        this._nextId = 1;
        /** @type {Map<string, {expression: Map<string, number[]>, reading: Map<string, number[]>, expressionReverse: Map<string, number[]>, readingReverse: Map<string, number[]>, pair: Map<string, number[]>, sequence: Map<number, number[]>}>} */
        this._indexByDictionary = new Map();
        /** @type {boolean} */
        this._deferIndexBuild = false;
        /** @type {boolean} */
        this._indexDirty = false;
        /** @type {boolean} */
        this._reloadFromShardsAfterImport = false;
        /** @type {Set<string>} */
        this._reloadShardLogicalKeysAfterImport = new Set();
        /** @type {Set<string>} */
        this._loadedDictionaryNames = new Set();
        /** @type {boolean} */
        this._allShardContentsLoaded = false;
        /** @type {PendingArtifactReloadPlan[]} */
        this._pendingArtifactReloadPlansAfterImport = [];
        /** @type {TextEncoder} */
        this._textEncoder = new TextEncoder();
        /** @type {TextDecoder} */
        this._textDecoder = new TextDecoder();
        /** @type {boolean} */
        // The wasm encoder currently emits corrupted entryContent offsets on Chromium-family import paths.
        // Keep the JS fallback there for correctness, but allow the faster path on other runtimes.
        this._wasmEncoderUnavailable = this._shouldDisableWasmEncoderByDefault();
        /** @type {string[]} */
        this._invalidShardFileNames = [];
        /** @type {number} */
        this._writeCoalesceTargetBytes = this._computeWriteCoalesceTargetBytes();
    }

    /**
     * @returns {boolean}
     */
    _shouldDisableWasmEncoderByDefault() {
        if (typeof globalThis === 'undefined') {
            return false;
        }
        const browserRuntime = /** @type {{runtime?: {getBrowserInfo?: (() => Promise<unknown>)}}|undefined} */ (Reflect.get(globalThis, 'browser'));
        if (typeof browserRuntime?.runtime?.getBrowserInfo === 'function') {
            return false;
        }
        const chromeRuntime = /** @type {{runtime?: unknown}|undefined} */ (Reflect.get(globalThis, 'chrome'));
        if (typeof chromeRuntime?.runtime === 'object' && chromeRuntime.runtime !== null) {
            return true;
        }
        return false;
    }

    /**
     * @returns {Promise<void>}
     */
    async prepare() {
        await this._closeAllWritables();
        this._recordsById.clear();
        this._indexByDictionary.clear();
        this._nextId = 1;
        this._deferIndexBuild = false;
        this._indexDirty = false;
        this._reloadFromShardsAfterImport = false;
        this._reloadShardLogicalKeysAfterImport.clear();
        this._loadedDictionaryNames.clear();
        this._allShardContentsLoaded = false;
        this._pendingArtifactReloadPlansAfterImport = [];
        this._rootDirectoryHandle = null;
        this._recordsDirectoryHandle = null;
        this._shardStateByFileName.clear();
        this._activeAppendShardStateByKey.clear();
        this._invalidShardFileNames = [];
        if (typeof navigator === 'undefined' || !('storage' in navigator) || !('getDirectory' in navigator.storage)) {
            return;
        }
        const rootDirectoryHandle = await navigator.storage.getDirectory();
        this._rootDirectoryHandle = rootDirectoryHandle;
        this._recordsDirectoryHandle = await rootDirectoryHandle.getDirectoryHandle(SHARD_DIRECTORY_NAME, {create: true});

        const shardFileCount = await this._loadShardFiles(false);
        await (shardFileCount === 0 ? this._migrateLegacyMonolithicIfPresent() : this._deleteLegacyMonolithicIfPresent());
        if (shardFileCount === 0) {
            await this.verifyIntegrity();
            this._allShardContentsLoaded = true;
        }
    }

    /**
     * @returns {Promise<void>}
     */
    async beginImportSession() {
        if (this._importSessionActive) {
            return;
        }
        this._importSessionActive = true;
        this._deferIndexBuild = true;
        this._indexDirty = true;
        this._reloadFromShardsAfterImport = false;
        this._reloadShardLogicalKeysAfterImport.clear();
        this._loadedDictionaryNames.clear();
        this._allShardContentsLoaded = false;
        this._pendingArtifactReloadPlansAfterImport = [];
        this._indexByDictionary.clear();
        this._queuedWriteBudgetBytes = this._computeQueuedWriteBudgetBytes();
        for (const state of this._shardStateByFileName.values()) {
            state.pendingWriteBytes = 0;
            state.pendingWriteChunks = [];
            state.queuedWriteBytes = 0;
            state.queuedWritePromise = null;
            state.queuedWriteChunks = [];
        }
    }

    /**
     * @returns {Promise<void>}
     */
    async endImportSession() {
        if (!this._importSessionActive && !this._hasPendingShardWrites()) {
            return;
        }
        const wasImportSessionActive = this._importSessionActive;
        if (wasImportSessionActive) {
            await this._flushPendingWrites();
            this._importSessionActive = false;
        } else {
            this._importSessionActive = false;
            await this._flushPendingWrites();
        }
        await this._awaitQueuedWrites();
        await this._closeAllWritables();
        this._deferIndexBuild = false;
        if (this._reloadFromShardsAfterImport && this._pendingArtifactReloadPlansAfterImport.length > 0) {
            this._indexByDictionary.clear();
            this._indexDirty = false;
            this._reloadFromShardsAfterImport = false;
            this._reloadShardLogicalKeysAfterImport.clear();
            return;
        }
        if (this._reloadFromShardsAfterImport) {
            this._indexByDictionary.clear();
            this._indexDirty = false;
            return;
        }
        if (this._indexDirty) {
            this._indexByDictionary.clear();
            this._indexDirty = false;
        }
        this._reloadShardLogicalKeysAfterImport.clear();
    }

    /**
     * @returns {Promise<void>}
     */
    async reset() {
        await this._closeAllWritables();
        this._recordsById.clear();
        this._indexByDictionary.clear();
        this._nextId = 1;
        this._deferIndexBuild = false;
        this._indexDirty = false;
        this._shardStateByFileName.clear();
        this._invalidShardFileNames = [];
        this._activeAppendShardStateByKey.clear();
        this._reloadShardLogicalKeysAfterImport.clear();
        this._loadedDictionaryNames.clear();
        this._allShardContentsLoaded = false;
        this._pendingArtifactReloadPlansAfterImport = [];
        if (this._recordsDirectoryHandle === null) {
            return;
        }
        const shardFileNames = await this._listShardFileNames();
        for (const fileName of shardFileNames) {
            try {
                await this._recordsDirectoryHandle.removeEntry(fileName);
            } catch (_) {
                // NOP
            }
        }
        await this._deleteLegacyMonolithicIfPresent();
    }

    /**
     * @returns {number}
     */
    get size() {
        this._ensurePendingArtifactReloadPlansApplied();
        return this._recordsById.size;
    }

    /**
     * @returns {boolean}
     */
    isEmpty() {
        this._ensurePendingArtifactReloadPlansApplied();
        return this._recordsById.size === 0;
    }

    /**
     * @param {{dictionary: string, expression: string, reading: string, expressionBytes?: Uint8Array, readingBytes?: Uint8Array, expressionReverse: string|null, readingReverse: string|null, entryContentOffset: number, entryContentLength: number, entryContentDictName: string|null, score: number, sequence: number|null}[]} records
     * @param {import('./term-record-wasm-encoder.js').PreinternedTermRecordPlan|null} [preinternedPlan]
     * @returns {Promise<void>}
     */
    async appendBatch(records, preinternedPlan = null) {
        if (records.length === 0) { return; }
        /** @type {Map<string, TermRecord[]>} */
        const recordsByShard = new Map();
        for (const row of records) {
            const id = this._nextId++;
            const record = {
                id,
                dictionary: row.dictionary,
                expression: row.expression,
                reading: row.reading,
                expressionBytes: row.expressionBytes instanceof Uint8Array ? row.expressionBytes : void 0,
                readingBytes: row.readingBytes instanceof Uint8Array ? row.readingBytes : void 0,
                expressionReverse: row.expressionReverse,
                readingReverse: row.readingReverse,
                entryContentOffset: row.entryContentOffset,
                entryContentLength: row.entryContentLength,
                entryContentDictName: row.entryContentDictName ?? 'raw',
                score: row.score,
                sequence: row.sequence,
            };
            this._recordsById.set(id, record);
            this._loadedDictionaryNames.add(record.dictionary);
            const shardFileName = this._getShardFileName(record.dictionary, record.entryContentDictName);
            const shardRecords = recordsByShard.get(shardFileName);
            if (typeof shardRecords === 'undefined') {
                recordsByShard.set(shardFileName, [record]);
            } else {
                shardRecords.push(record);
            }
            if (!this._deferIndexBuild) {
                const existingIndex = this._indexByDictionary.get(record.dictionary);
                if (typeof existingIndex !== 'undefined') {
                    this._addRecordToDictionaryIndex(existingIndex, record);
                }
            }
        }
        if (this._deferIndexBuild) {
            this._indexDirty = true;
        }
        for (const dictionaryRecords of recordsByShard.values()) {
            const firstRecord = dictionaryRecords[0];
            const state = await this._getOrCreateShardState(firstRecord.dictionary, firstRecord.entryContentDictName);
            if (state === null) { continue; }
            await this._appendEncodedChunk(
                state,
                await this._encodeRecords(dictionaryRecords, preinternedPlan),
                firstRecord?.id ?? 0,
                dictionaryRecords.length,
            );
        }
    }

    /**
     * Fast-path append for SQL row arrays from dictionary-database bulk term insert.
     * @param {unknown[][]} rows
     * @param {number} start
     * @param {number} count
     * @returns {Promise<void>}
     */
    async appendBatchFromTermRows(rows, start, count) {
        if (count <= 0) { return; }
        /** @type {Map<string, TermRecord[]>|null} */
        let recordsByShard = null;
        /** @type {TermRecord[]} */
        const singleDictionaryRecords = [];
        let singleDictionaryName = '';
        let singleContentDictName = 'raw';
        for (let i = start, ii = start + count; i < ii; ++i) {
            const row = /** @type {[string, string, string, (string|null), (string|null), unknown, number, number, (string|null), unknown, unknown, unknown, number, unknown, (number|null)]} */ (rows[i]);
            const id = this._nextId++;
            const dictionary = row[0];
            /** @type {TermRecord} */
            const record = {
                id,
                dictionary,
                expression: row[1],
                reading: row[2],
                expressionReverse: row[3],
                readingReverse: row[4],
                entryContentOffset: row[6],
                entryContentLength: row[7],
                entryContentDictName: row[8] ?? 'raw',
                score: row[12],
                sequence: row[14],
            };
            this._recordsById.set(id, record);
            this._loadedDictionaryNames.add(dictionary);
            if (i === start) {
                singleDictionaryName = dictionary;
                singleContentDictName = record.entryContentDictName;
            }
            if (recordsByShard === null) {
                if (dictionary === singleDictionaryName && record.entryContentDictName === singleContentDictName) {
                    singleDictionaryRecords.push(record);
                } else {
                    recordsByShard = new Map();
                    recordsByShard.set(this._getShardFileName(singleDictionaryName, singleContentDictName), singleDictionaryRecords);
                    recordsByShard.set(this._getShardFileName(dictionary, record.entryContentDictName), [record]);
                }
            } else {
                const shardFileName = this._getShardFileName(dictionary, record.entryContentDictName);
                let dictionaryRecords = recordsByShard.get(shardFileName);
                if (typeof dictionaryRecords === 'undefined') {
                    dictionaryRecords = [];
                    recordsByShard.set(shardFileName, dictionaryRecords);
                }
                dictionaryRecords.push(record);
            }
            if (!this._deferIndexBuild) {
                const existingIndex = this._indexByDictionary.get(dictionary);
                if (typeof existingIndex !== 'undefined') {
                    this._addRecordToDictionaryIndex(existingIndex, record);
                }
            }
        }
        if (this._deferIndexBuild) {
            this._indexDirty = true;
        }
        if (recordsByShard === null) {
            const state = await this._getOrCreateShardState(singleDictionaryName, singleContentDictName);
            if (state !== null) {
                await this._appendEncodedChunk(state, await this._encodeRecords(singleDictionaryRecords), singleDictionaryRecords[0]?.id ?? 0, singleDictionaryRecords.length);
            }
            return;
        }
        for (const dictionaryRecords of recordsByShard.values()) {
            const firstRecord = dictionaryRecords[0];
            const state = await this._getOrCreateShardState(firstRecord.dictionary, firstRecord.entryContentDictName);
            if (state === null) { continue; }
            await this._appendEncodedChunk(state, await this._encodeRecords(dictionaryRecords), dictionaryRecords[0]?.id ?? 0, dictionaryRecords.length);
        }
    }

    /**
     * Fast-path append for importer DatabaseTermEntry arrays paired with resolved content refs.
     * @param {unknown[]} rows
     * @param {number} start
     * @param {number} count
     * @param {number[]} contentOffsets
     * @param {number[]} contentLengths
     * @param {(string|null)[]} contentDictNames
     * @param {import('./term-record-wasm-encoder.js').PreinternedTermRecordPlan|null} [preinternedPlan]
     * @returns {Promise<{buildRecordsMs: number, encodeMs: number, appendWriteMs: number}>}
     */
    async appendBatchFromResolvedImportTermEntries(rows, start, count, contentOffsets, contentLengths, contentDictNames, preinternedPlan = null) {
        if (count <= 0) { return {buildRecordsMs: 0, encodeMs: 0, appendWriteMs: 0}; }
        if (contentOffsets.length < (start + count) || contentLengths.length < (start + count) || contentDictNames.length < (start + count)) {
            throw new Error('appendBatchFromResolvedImportTermEntries content refs length is smaller than row count');
        }
        const tBuildStart = safePerformance.now();
        let buildRecordsMs = 0;
        let encodeMs = 0;
        let appendWriteMs = 0;
        /** @type {Map<string, {records: TermRecord[], indexes: number[]}>|null} */
        let recordsByShard = null;
        /** @type {TermRecord[]} */
        const singleDictionaryRecords = new Array(count);
        let singleDictionaryRecordCount = 0;
        let singleDictionaryName = '';
        let singleContentDictName = 'raw';
        for (let i = start, ii = start + count; i < ii; ++i) {
            const row = /** @type {{dictionary: string, expression: string, reading: string, readingEqualsExpression?: boolean, expressionBytes?: Uint8Array, readingBytes?: Uint8Array, expressionReverse?: string, readingReverse?: string, score: number, sequence?: number}} */ (rows[i]);
            const id = this._nextId++;
            const dictionary = row.dictionary;
            const readingEqualsExpression = row.readingEqualsExpression === true || row.reading === row.expression;
            const useLazyArtifactStrings = preinternedPlan !== null;
            /** @type {TermRecord} */
            const record = {
                id,
                dictionary,
                expression: useLazyArtifactStrings ? '' : row.expression,
                reading: useLazyArtifactStrings ? '' : row.reading,
                readingEqualsExpression,
                expressionBytes: row.expressionBytes instanceof Uint8Array ? row.expressionBytes : void 0,
                readingBytes: !readingEqualsExpression && row.readingBytes instanceof Uint8Array ? row.readingBytes : void 0,
                expressionReverse: row.expressionReverse ?? null,
                readingReverse: row.readingReverse ?? null,
                entryContentOffset: contentOffsets[i],
                entryContentLength: contentLengths[i],
                entryContentDictName: contentDictNames[i] ?? 'raw',
                score: row.score,
                sequence: typeof row.sequence === 'number' ? row.sequence : null,
            };
            this._recordsById.set(id, record);
            this._loadedDictionaryNames.add(dictionary);
            if (i === start) {
                singleDictionaryName = dictionary;
                singleContentDictName = record.entryContentDictName;
            }
            if (recordsByShard === null) {
                if (dictionary === singleDictionaryName && record.entryContentDictName === singleContentDictName) {
                    singleDictionaryRecords[singleDictionaryRecordCount++] = record;
                } else {
                    recordsByShard = new Map();
                    recordsByShard.set(
                        this._getShardFileName(singleDictionaryName, singleContentDictName),
                        {
                            records: singleDictionaryRecords.slice(0, singleDictionaryRecordCount),
                            indexes: Array.from({length: singleDictionaryRecordCount}, (_, index) => index),
                        },
                    );
                    recordsByShard.set(this._getShardFileName(dictionary, record.entryContentDictName), {records: [record], indexes: [i - start]});
                }
            } else {
                const shardFileName = this._getShardFileName(dictionary, record.entryContentDictName);
                let shardRecords = recordsByShard.get(shardFileName);
                if (typeof shardRecords === 'undefined') {
                    shardRecords = {records: [], indexes: []};
                    recordsByShard.set(shardFileName, shardRecords);
                }
                shardRecords.records.push(record);
                shardRecords.indexes.push(i - start);
            }
            if (!this._deferIndexBuild) {
                const existingIndex = this._indexByDictionary.get(dictionary);
                if (typeof existingIndex !== 'undefined') {
                    this._addRecordToDictionaryIndex(existingIndex, record);
                }
            }
        }
        if (this._deferIndexBuild) {
            this._indexDirty = true;
        }
        buildRecordsMs = safePerformance.now() - tBuildStart;
        if (recordsByShard === null) {
            const state = await this._getOrCreateShardState(singleDictionaryName, singleContentDictName);
            if (state !== null) {
                const metrics = await this._encodeAndAppendChunkForState(state, singleDictionaryRecords, preinternedPlan);
                encodeMs += metrics.encodeMs;
                appendWriteMs += metrics.appendWriteMs;
            }
            return {buildRecordsMs, encodeMs, appendWriteMs};
        }
        for (const {records: dictionaryRecords, indexes} of recordsByShard.values()) {
            const firstRecord = dictionaryRecords[0];
            const state = await this._getOrCreateShardState(firstRecord.dictionary, firstRecord.entryContentDictName);
            if (state === null) { continue; }
            const metrics = await this._encodeAndAppendChunkForState(state, dictionaryRecords, selectTermRecordPreinternedPlan(preinternedPlan, indexes));
            encodeMs += metrics.encodeMs;
            appendWriteMs += metrics.appendWriteMs;
        }
        return {buildRecordsMs, encodeMs, appendWriteMs};
    }

    /**
     * Fast-path append for importer DatabaseTermEntry arrays paired with content spans.
     * @param {unknown[]} rows
     * @param {number} start
     * @param {number} count
     * @param {{offset: number, length: number}[]} spans
     * @returns {Promise<void>}
     */
    async appendBatchFromImportTermEntries(rows, start, count, spans) {
        if (count <= 0) { return; }
        if (spans.length < count) {
            throw new Error('appendBatchFromImportTermEntries spans length is smaller than row count');
        }
        /** @type {Map<string, TermRecord[]>|null} */
        let recordsByShard = null;
        /** @type {TermRecord[]} */
        const singleDictionaryRecords = [];
        let singleDictionaryName = '';
        let singleContentDictName = 'raw';
        for (let i = 0; i < count; ++i) {
            const row = /** @type {{dictionary: string, expression: string, reading: string, expressionBytes?: Uint8Array, readingBytes?: Uint8Array, expressionReverse?: string, readingReverse?: string, score: number, sequence?: number}} */ (rows[start + i]);
            const span = spans[i];
            const id = this._nextId++;
            const dictionary = row.dictionary;
            /** @type {TermRecord} */
            const record = {
                id,
                dictionary,
                expression: row.expression,
                reading: row.reading,
                expressionBytes: row.expressionBytes instanceof Uint8Array ? row.expressionBytes : void 0,
                readingBytes: row.readingBytes instanceof Uint8Array ? row.readingBytes : void 0,
                expressionReverse: row.expressionReverse ?? null,
                readingReverse: row.readingReverse ?? null,
                entryContentOffset: span.offset,
                entryContentLength: span.length,
                entryContentDictName: 'raw',
                score: row.score,
                sequence: typeof row.sequence === 'number' ? row.sequence : null,
            };
            this._recordsById.set(id, record);
            this._loadedDictionaryNames.add(dictionary);
            if (i === 0) {
                singleDictionaryName = dictionary;
                singleContentDictName = record.entryContentDictName;
            }
            if (recordsByShard === null) {
                if (dictionary === singleDictionaryName && record.entryContentDictName === singleContentDictName) {
                    singleDictionaryRecords.push(record);
                } else {
                    recordsByShard = new Map();
                    recordsByShard.set(this._getShardFileName(singleDictionaryName, singleContentDictName), singleDictionaryRecords);
                    recordsByShard.set(this._getShardFileName(dictionary, record.entryContentDictName), [record]);
                }
            } else {
                const shardFileName = this._getShardFileName(dictionary, record.entryContentDictName);
                let dictionaryRecords = recordsByShard.get(shardFileName);
                if (typeof dictionaryRecords === 'undefined') {
                    dictionaryRecords = [];
                    recordsByShard.set(shardFileName, dictionaryRecords);
                }
                dictionaryRecords.push(record);
            }
            if (!this._deferIndexBuild) {
                const existingIndex = this._indexByDictionary.get(dictionary);
                if (typeof existingIndex !== 'undefined') {
                    this._addRecordToDictionaryIndex(existingIndex, record);
                }
            }
        }
        if (this._deferIndexBuild) {
            this._indexDirty = true;
        }
        if (recordsByShard === null) {
            const state = await this._getOrCreateShardState(singleDictionaryName, singleContentDictName);
            if (state !== null) {
                await this._encodeAndAppendChunkForState(state, singleDictionaryRecords);
            }
            return;
        }
        for (const dictionaryRecords of recordsByShard.values()) {
            const firstRecord = dictionaryRecords[0];
            const state = await this._getOrCreateShardState(firstRecord.dictionary, firstRecord.entryContentDictName);
            if (state === null) { continue; }
            await this._encodeAndAppendChunkForState(state, dictionaryRecords);
        }
    }

    /**
     * Fast-path append for importer DatabaseTermEntry arrays paired with raw content offset/length arrays.
     * @param {unknown[]} rows
     * @param {number} start
     * @param {number} count
     * @param {number[]} contentOffsets
     * @param {number[]} contentLengths
     * @param {string|null} [contentDictName='raw']
     * @returns {Promise<{buildRecordsMs: number, encodeMs: number, appendWriteMs: number}>}
     */
    async appendBatchFromImportTermEntriesResolvedContent(rows, start, count, contentOffsets, contentLengths, contentDictName = 'raw') {
        if (count <= 0) { return {buildRecordsMs: 0, encodeMs: 0, appendWriteMs: 0}; }
        if (contentOffsets.length < count || contentLengths.length < count) {
            throw new Error('appendBatchFromImportTermEntriesResolvedContent content arrays are smaller than row count');
        }
        const tBuildStart = safePerformance.now();
        let buildRecordsMs = 0;
        let encodeMs = 0;
        let appendWriteMs = 0;
        /** @type {Map<string, TermRecord[]>|null} */
        let recordsByShard = null;
        /** @type {TermRecord[]} */
        const singleDictionaryRecords = new Array(count);
        let singleDictionaryRecordCount = 0;
        let firstDictionaryName = '';
        const normalizedContentDictName = contentDictName ?? 'raw';
        for (let i = 0; i < count; ++i) {
            const row = /** @type {{dictionary: string, expression: string, reading: string, readingEqualsExpression?: boolean, expressionBytes?: Uint8Array, readingBytes?: Uint8Array, expressionReverse?: string, readingReverse?: string, score: number, sequence?: number}} */ (rows[start + i]);
            const id = this._nextId++;
            const dictionary = row.dictionary;
            /** @type {TermRecord} */
            const record = {
                id,
                dictionary,
                expression: row.expression,
                reading: row.reading,
                readingEqualsExpression: row.readingEqualsExpression === true,
                expressionBytes: row.expressionBytes instanceof Uint8Array ? row.expressionBytes : void 0,
                readingBytes: row.readingBytes instanceof Uint8Array ? row.readingBytes : void 0,
                expressionReverse: row.expressionReverse ?? null,
                readingReverse: row.readingReverse ?? null,
                entryContentOffset: contentOffsets[i],
                entryContentLength: contentLengths[i],
                entryContentDictName: normalizedContentDictName,
                score: row.score,
                sequence: typeof row.sequence === 'number' ? row.sequence : null,
            };
            this._recordsById.set(id, record);
            if (i === 0) {
                firstDictionaryName = dictionary;
            }
            if (recordsByShard === null) {
                if (dictionary === firstDictionaryName) {
                    singleDictionaryRecords[singleDictionaryRecordCount++] = record;
                } else {
                    recordsByShard = new Map();
                    recordsByShard.set(this._getShardFileName(firstDictionaryName, normalizedContentDictName), singleDictionaryRecords.slice(0, singleDictionaryRecordCount));
                    recordsByShard.set(this._getShardFileName(dictionary, normalizedContentDictName), [record]);
                }
            } else {
                const shardFileName = this._getShardFileName(dictionary, normalizedContentDictName);
                let dictionaryRecords = recordsByShard.get(shardFileName);
                if (typeof dictionaryRecords === 'undefined') {
                    dictionaryRecords = [];
                    recordsByShard.set(shardFileName, dictionaryRecords);
                }
                dictionaryRecords.push(record);
            }
            if (!this._deferIndexBuild) {
                const existingIndex = this._indexByDictionary.get(dictionary);
                if (typeof existingIndex !== 'undefined') {
                    this._addRecordToDictionaryIndex(existingIndex, record);
                }
            }
        }
        if (this._deferIndexBuild) {
            this._indexDirty = true;
        }
        buildRecordsMs = safePerformance.now() - tBuildStart;
        const preinternedPlan = (
            start === 0 &&
            count === rows.length &&
            rows !== null &&
            typeof rows === 'object'
        ) ?
            getTermRecordPreinternedPlan(rows) :
            null;
        if (recordsByShard === null) {
            const state = await this._getOrCreateShardState(firstDictionaryName, normalizedContentDictName);
            if (state !== null) {
                const metrics = await this._encodeAndAppendChunkForState(state, singleDictionaryRecords, preinternedPlan);
                encodeMs += metrics.encodeMs;
                appendWriteMs += metrics.appendWriteMs;
            }
            return {buildRecordsMs, encodeMs, appendWriteMs};
        }
        for (const dictionaryRecords of recordsByShard.values()) {
            const firstRecord = dictionaryRecords[0];
            const state = await this._getOrCreateShardState(firstRecord.dictionary, firstRecord.entryContentDictName);
            if (state === null) { continue; }
            const metrics = await this._encodeAndAppendChunkForState(state, dictionaryRecords, preinternedPlan);
            encodeMs += metrics.encodeMs;
            appendWriteMs += metrics.appendWriteMs;
        }
        return {buildRecordsMs, encodeMs, appendWriteMs};
    }

    /**
     * @param {{dictionary: string, rowCount: number, expressionBytesList: Uint8Array[], readingBytesList: Uint8Array[], readingEqualsExpressionList: boolean[], scoreList: number[], sequenceList: (number|undefined)[], termRecordPreinternedPlan?: import('./term-record-wasm-encoder.js').PreinternedTermRecordPlan|null}} chunk
     * @param {number[]} contentOffsets
     * @param {number[]} contentLengths
     * @param {string | (string|null)[]} contentDictNames
     * @returns {Promise<{buildRecordsMs: number, encodeMs: number, appendWriteMs: number}>}
     */
    async appendBatchFromArtifactChunkResolvedContent(chunk, contentOffsets, contentLengths, contentDictNames) {
        const count = chunk.rowCount;
        if (count <= 0) { return {buildRecordsMs: 0, encodeMs: 0, appendWriteMs: 0}; }
        if (
            contentOffsets.length < count ||
            contentLengths.length < count ||
            (Array.isArray(contentDictNames) && contentDictNames.length < count)
        ) {
            throw new Error('appendBatchFromArtifactChunkResolvedContent content arrays are smaller than row count');
        }
        const uniformContentDictName = Array.isArray(contentDictNames) ? null : (contentDictNames ?? 'raw');
        const tBuildStart = safePerformance.now();
        const firstId = this._nextId;
        const firstContentDictName = uniformContentDictName ?? (contentDictNames[0] ?? 'raw');
        const skipRecordMaterialization = (
            this._importSessionActive &&
            (chunk.dictionaryTotalRows ?? count) >= 1_000_000
        );
        if (skipRecordMaterialization) {
            this._nextId += count;
            this._reloadFromShardsAfterImport = true;
            this._loadedDictionaryNames.delete(chunk.dictionary);
            this._allShardContentsLoaded = false;
        } else {
            this._recordsById.ensureCapacity(firstId + count - 1);
            const existingIndex = this._deferIndexBuild ? void 0 : this._indexByDictionary.get(chunk.dictionary);
            for (let i = 0; i < count; ++i) {
                const id = this._nextId++;
                const sequenceValue = chunk.sequenceList[i];
                const entryContentDictName = uniformContentDictName ?? (contentDictNames[i] ?? 'raw');
                /** @type {TermRecord} */
                const record = {
                    id,
                    dictionary: chunk.dictionary,
                    readingEqualsExpression: chunk.readingEqualsExpressionList[i] === true || chunk.readingEqualsExpressionList[i] === 1,
                    expressionBytes: chunk.expressionBytesList[i],
                    readingBytes: (chunk.readingEqualsExpressionList[i] === true || chunk.readingEqualsExpressionList[i] === 1) ? void 0 : chunk.readingBytesList[i],
                    entryContentOffset: contentOffsets[i],
                    entryContentLength: contentLengths[i],
                    entryContentDictName,
                    score: chunk.scoreList[i] ?? 0,
                    sequence: typeof sequenceValue === 'number' && sequenceValue >= 0 ? sequenceValue : null,
                };
                this._recordsById.set(id, record);
                this._loadedDictionaryNames.add(chunk.dictionary);
                if (typeof existingIndex !== 'undefined') {
                    this._addRecordToDictionaryIndex(existingIndex, record);
                }
            }
            if (this._deferIndexBuild) {
                this._indexDirty = true;
            }
        }
        const buildRecordsMs = safePerformance.now() - tBuildStart;
        let encodeMs = 0;
        let appendWriteMs = 0;
        if (uniformContentDictName !== null) {
            if (skipRecordMaterialization) {
                this._reloadShardLogicalKeysAfterImport.add(this._getShardFileName(chunk.dictionary, uniformContentDictName));
            }
            const state = await this._getOrCreateShardState(chunk.dictionary, uniformContentDictName);
            if (state === null) { return {buildRecordsMs, encodeMs, appendWriteMs}; }
            const metrics = await this._encodeAndAppendArtifactChunkForState(
                state,
                chunk,
                firstId,
                contentOffsets,
                contentLengths,
                chunk.termRecordPreinternedPlan ?? null,
                uniformContentDictName,
            );
            encodeMs += metrics.encodeMs;
            appendWriteMs += metrics.appendWriteMs;
            return {buildRecordsMs, encodeMs, appendWriteMs};
        }
        let singleContentDictName = true;
        for (let i = 1; i < count; ++i) {
            if ((contentDictNames[i] ?? 'raw') !== firstContentDictName) {
                singleContentDictName = false;
                break;
            }
        }
        if (singleContentDictName) {
            if (skipRecordMaterialization) {
                this._reloadShardLogicalKeysAfterImport.add(this._getShardFileName(chunk.dictionary, firstContentDictName));
            }
            const state = await this._getOrCreateShardState(chunk.dictionary, firstContentDictName);
            if (state === null) { return {buildRecordsMs, encodeMs, appendWriteMs}; }
            const metrics = await this._encodeAndAppendArtifactChunkForState(
                state,
                chunk,
                firstId,
                contentOffsets,
                contentLengths,
                chunk.termRecordPreinternedPlan ?? null,
                firstContentDictName,
            );
            encodeMs += metrics.encodeMs;
            appendWriteMs += metrics.appendWriteMs;
            return {buildRecordsMs, encodeMs, appendWriteMs};
        }
        for (let runStart = 0; runStart < count;) {
            const contentDictName = contentDictNames[runStart] ?? 'raw';
            if (skipRecordMaterialization) {
                this._reloadShardLogicalKeysAfterImport.add(this._getShardFileName(chunk.dictionary, contentDictName));
            }
            let runEnd = runStart + 1;
            while (runEnd < count && (contentDictNames[runEnd] ?? 'raw') === contentDictName) {
                ++runEnd;
            }
            const runCount = runEnd - runStart;
            const state = await this._getOrCreateShardState(chunk.dictionary, contentDictName);
            if (state === null) {
                runStart = runEnd;
                continue;
            }
            /** @type {{dictionary: string, rowCount: number, expressionBytesList: Uint8Array[], readingBytesList: Uint8Array[], readingEqualsExpressionList: boolean[], scoreList: number[], sequenceList: (number|undefined)[], termRecordPreinternedPlan?: import('./term-record-wasm-encoder.js').PreinternedTermRecordPlan|null}} */
            const chunkSlice = {
                dictionary: chunk.dictionary,
                rowCount: runCount,
                expressionBytesList: chunk.expressionBytesList.slice(runStart, runEnd),
                readingBytesList: chunk.readingBytesList.slice(runStart, runEnd),
                readingEqualsExpressionList: chunk.readingEqualsExpressionList.slice(runStart, runEnd),
                scoreList: chunk.scoreList.slice(runStart, runEnd),
                sequenceList: chunk.sequenceList.slice(runStart, runEnd),
                termRecordPreinternedPlan: sliceTermRecordPreinternedPlan(chunk.termRecordPreinternedPlan ?? null, runStart, runCount),
            };
            const metrics = await this._encodeAndAppendArtifactChunkForState(
                state,
                chunkSlice,
                firstId + runStart,
                contentOffsets.slice(runStart, runEnd),
                contentLengths.slice(runStart, runEnd),
                chunkSlice.termRecordPreinternedPlan ?? null,
                contentDictName,
            );
            encodeMs += metrics.encodeMs;
            appendWriteMs += metrics.appendWriteMs;
            runStart = runEnd;
        }
        return {buildRecordsMs, encodeMs, appendWriteMs};
    }

    /**
     * @param {TermRecordShardState} state
     * @param {TermRecord[]} records
     * @param {import('./term-record-wasm-encoder.js').PreinternedTermRecordPlan|null} [preinternedPlan]
     * @returns {Promise<{encodeMs: number, appendWriteMs: number}>}
     */
    async _encodeAndAppendChunkForState(state, records, preinternedPlan = null) {
        const tEncodeStart = safePerformance.now();
        const chunk = await this._encodeRecords(records, preinternedPlan);
        const encodeMs = safePerformance.now() - tEncodeStart;
        const tAppendStart = safePerformance.now();
        await this._appendEncodedChunk(state, chunk, records[0]?.id ?? 0, records.length);
        const appendWriteMs = safePerformance.now() - tAppendStart;
        return {encodeMs, appendWriteMs};
    }

    /**
     * @param {TermRecordShardState} state
     * @param {{dictionary: string, rowCount: number, expressionBytesList: Uint8Array[], readingBytesList: Uint8Array[], readingEqualsExpressionList: boolean[], scoreList: number[], sequenceList: (number|undefined)[]}} chunk
     * @param {number} firstId
     * @param {number[]} contentOffsets
     * @param {number[]} contentLengths
     * @param {import('./term-record-wasm-encoder.js').PreinternedTermRecordPlan|null} [preinternedPlan]
     * @param {string} [contentDictName='raw']
     * @returns {Promise<{encodeMs: number, appendWriteMs: number}>}
     */
    async _encodeAndAppendArtifactChunkForState(state, chunk, firstId, contentOffsets, contentLengths, preinternedPlan = null, contentDictName = 'raw') {
        const tEncodeStart = safePerformance.now();
        const encodedChunk = await this._encodeArtifactChunkRecords(chunk, contentOffsets, contentLengths, preinternedPlan);
        const encodeMs = safePerformance.now() - tEncodeStart;
        const tAppendStart = safePerformance.now();
        await this._appendEncodedChunk(state, encodedChunk, firstId, chunk.rowCount, contentDictName);
        const appendWriteMs = safePerformance.now() - tAppendStart;
        return {encodeMs, appendWriteMs};
    }

    /**
     * @param {string} dictionaryName
     * @returns {Promise<number>}
     */
    async deleteByDictionary(dictionaryName) {
        this._ensurePendingArtifactReloadPlansApplied();
        this._loadedDictionaryNames.delete(dictionaryName);
        this._allShardContentsLoaded = false;
        let deletedCount = 0;
        const ids = [...this._recordsById.keys()];
        for (const id of ids) {
            const record = this._recordsById.get(id);
            if (typeof record === 'undefined' || record.dictionary !== dictionaryName) { continue; }
            this._recordsById.delete(id);
            ++deletedCount;
        }
        this._indexByDictionary.delete(dictionaryName);
        await this._deleteShardByDictionary(dictionaryName);
        return deletedCount;
    }

    /**
     * @param {string} fromDictionaryName
     * @param {string} toDictionaryName
     * @returns {Promise<number>}
     */
    async replaceDictionaryName(fromDictionaryName, toDictionaryName) {
        const fromName = `${fromDictionaryName}`.trim();
        const toName = `${toDictionaryName}`.trim();
        if (fromName.length === 0 || toName.length === 0 || fromName === toName) {
            return 0;
        }

        this._ensurePendingArtifactReloadPlansApplied();
        this._loadedDictionaryNames.delete(fromName);
        this._loadedDictionaryNames.delete(toName);
        this._allShardContentsLoaded = false;
        await this._flushPendingWrites();
        await this._awaitQueuedWrites();
        await this._closeAllWritables();

        const recordIdsToRename = [];
        for (const id of this._recordsById.keys()) {
            const record = this._recordsById.get(id);
            if (typeof record === 'undefined' || record.dictionary !== fromName) { continue; }
            recordIdsToRename.push(id);
        }
        const renamedCount = recordIdsToRename.length;
        if (renamedCount === 0) {
            return 0;
        }

        if (this._recordsDirectoryHandle === null) {
            for (const id of recordIdsToRename) {
                const record = this._recordsById.get(id);
                if (typeof record !== 'undefined') {
                    record.dictionary = toName;
                }
            }
            this._indexByDictionary.delete(fromName);
            this._indexByDictionary.delete(toName);
            this._indexDirty = false;
            return renamedCount;
        }
        const sourceStates = [...this._shardStateByFileName.values()]
            .filter((state) => this._decodeDictionaryNameFromShardFileName(state.fileName) === fromName)
            .sort((a, b) => a.fileName.localeCompare(b.fileName));
        /** @type {Array<{state: TermRecordShardState, shardInfo: NonNullable<ReturnType<TermRecordOpfsStore['_decodeShardInfoFromShardFileName']>>, nextFileName: string, nextFileHandle: FileSystemFileHandle, bytes: ArrayBuffer, fileSize: number}>} */
        const renamePlans = [];
        for (const state of sourceStates) {
            let file;
            try {
                file = await state.fileHandle.getFile();
            } catch (_) {
                continue;
            }
            const shardInfo = this._decodeShardInfoFromShardFileName(state.fileName);
            if (shardInfo === null) { continue; }
            const nextFileName = this._getShardSegmentFileName(toName, shardInfo.contentDictName, shardInfo.segmentIndex);
            if (this._shardStateByFileName.has(nextFileName)) {
                throw new Error(`Target shard file already exists for dictionary rename: ${nextFileName}`);
            }
            const nextFileHandle = await this._recordsDirectoryHandle.getFileHandle(nextFileName, {create: true});
            try {
                const nextFile = await nextFileHandle.getFile();
                if (nextFile.size > 0) {
                    throw new Error(`Target shard file already contains data for dictionary rename: ${nextFileName}`);
                }
            } catch (e) {
                if (e instanceof Error && /already contains data|already exists/.test(e.message)) {
                    throw e;
                }
            }
            renamePlans.push({
                state,
                shardInfo,
                nextFileName,
                nextFileHandle,
                bytes: await file.arrayBuffer(),
                fileSize: file.size,
            });
        }
        const writeShardBytes = async (fileHandle, bytes) => {
            const writable = await fileHandle.createWritable();
            try {
                await writable.truncate(0);
                if (bytes.byteLength > 0) {
                    await writable.write(bytes);
                }
            } finally {
                await writable.close();
            }
        };
        /** @type {typeof renamePlans} */
        const createdPlans = [];
        /** @type {typeof renamePlans} */
        const removedPlans = [];
        try {
            for (const plan of renamePlans) {
                await writeShardBytes(plan.nextFileHandle, plan.bytes);
                createdPlans.push(plan);
            }
            for (const plan of renamePlans) {
                await this._recordsDirectoryHandle.removeEntry(plan.state.fileName);
                removedPlans.push(plan);
            }
        } catch (e) {
            for (const plan of removedPlans.slice().reverse()) {
                try {
                    const restoredHandle = await this._recordsDirectoryHandle.getFileHandle(plan.state.fileName, {create: true});
                    await writeShardBytes(restoredHandle, plan.bytes);
                } catch (_) {
                    // NOP - preserve original failure.
                }
            }
            for (const plan of createdPlans.slice().reverse()) {
                try {
                    await this._recordsDirectoryHandle.removeEntry(plan.nextFileName);
                } catch (_) {
                    // NOP - preserve original failure.
                }
            }
            throw e;
        }

        for (const id of recordIdsToRename) {
            const record = this._recordsById.get(id);
            if (typeof record !== 'undefined') {
                record.dictionary = toName;
            }
        }
        this._indexByDictionary.delete(fromName);
        this._indexByDictionary.delete(toName);
        this._indexDirty = false;
        for (const plan of renamePlans) {
            this._shardStateByFileName.delete(plan.state.fileName);
            this._activeAppendShardStateByKey.delete(plan.state.logicalKey);
            const nextState = this._createShardState(
                plan.nextFileName,
                plan.nextFileHandle,
                plan.fileSize,
                plan.shardInfo.contentDictName,
                plan.shardInfo.segmentIndex,
                this._getShardFileName(toName, plan.shardInfo.contentDictName),
            );
            this._shardStateByFileName.set(plan.nextFileName, nextState);
            this._setActiveAppendShardState(nextState);
        }

        return renamedCount;
    }

    /**
     * @param {(dictionaryName: string) => boolean} predicate
     * @returns {Promise<string[]>}
     */
    async cleanupShardFilesByDictionaryPredicate(predicate) {
        if (this._recordsDirectoryHandle === null) {
            return [];
        }
        this._ensurePendingArtifactReloadPlansApplied();
        this._allShardContentsLoaded = false;
        const removedFileNames = [];
        /** @type {Set<string>} */
        const removedDictionaryNames = new Set();
        const fileNames = await this._listShardFileNames();
        for (const fileName of fileNames) {
            const dictionaryName = this._decodeDictionaryNameFromShardFileName(fileName);
            if (!predicate(dictionaryName)) {
                continue;
            }
            removedDictionaryNames.add(dictionaryName);
            const state = this._shardStateByFileName.get(fileName);
            if (typeof state !== 'undefined') {
                await this._flushPendingWritesForShard(state);
                await this._closeShardWritable(state);
                this._shardStateByFileName.delete(fileName);
                this._activeAppendShardStateByKey.delete(state.logicalKey);
            }
            try {
                await this._recordsDirectoryHandle.removeEntry(fileName);
                removedFileNames.push(fileName);
            } catch (_) {
                // NOP
            }
        }
        if (removedDictionaryNames.size > 0) {
            for (const dictionaryName of removedDictionaryNames) {
                this._loadedDictionaryNames.delete(dictionaryName);
            }
            for (const id of [...this._recordsById.keys()]) {
                const record = this._recordsById.get(id);
                if (typeof record === 'undefined' || !removedDictionaryNames.has(record.dictionary)) {
                    continue;
                }
                this._recordsById.delete(id);
            }
            this._indexByDictionary.clear();
            this._indexDirty = false;
        }
        return removedFileNames;
    }

    /**
     * @param {Iterable<number>} ids
     * @returns {Map<number, TermRecord>}
     */
    getByIds(ids) {
        this._ensurePendingArtifactReloadPlansApplied();
        /** @type {Map<number, TermRecord>} */
        const result = new Map();
        for (const id of ids) {
            const record = this._recordsById.get(id);
            if (typeof record !== 'undefined') {
                result.set(id, record);
            }
        }
        return result;
    }

    /**
     * @returns {number[]}
     */
    getAllIds() {
        this._ensurePendingArtifactReloadPlansApplied();
        return [...this._recordsById.keys()].sort((a, b) => a - b);
    }

    /**
     * @param {string} dictionaryName
     * @returns {{expression: Map<string, number[]>, reading: Map<string, number[]>, expressionReverse: Map<string, number[]>, readingReverse: Map<string, number[]>, pair: Map<string, number[]>, sequence: Map<number, number[]>}}
     */
    getDictionaryIndex(dictionaryName) {
        this._ensurePendingArtifactReloadPlansApplied();
        this._ensureIndexesReady();
        const existing = this._indexByDictionary.get(dictionaryName);
        if (typeof existing !== 'undefined') {
            if (
                existing.expression.size === 0 &&
                existing.reading.size === 0 &&
                this._hasRecordsForDictionary(dictionaryName)
            ) {
                this._indexByDictionary.delete(dictionaryName);
            } else {
                return existing;
            }
        }
        const created = {
            expression: new Map(),
            reading: new Map(),
            expressionReverse: new Map(),
            readingReverse: new Map(),
            pair: new Map(),
            sequence: new Map(),
        };
        for (const record of this._recordsById.values()) {
            if (record.dictionary !== dictionaryName) { continue; }
            this._addRecordToDictionaryIndex(created, record);
        }
        if (
            created.expression.size === 0 &&
            created.reading.size === 0 &&
            this._hasRecordsForDictionary(dictionaryName)
        ) {
            this._rebuildIndexesFromRecords();
            const rebuilt = this._indexByDictionary.get(dictionaryName);
            if (typeof rebuilt !== 'undefined') {
                return rebuilt;
            }
        }
        this._indexByDictionary.set(dictionaryName, created);
        return created;
    }

    /**
     * @returns {string[]}
     */
    getShardFileNames() {
        return [...this._shardStateByFileName.keys()].sort((a, b) => a.localeCompare(b));
    }

    /**
     * @param {string} dictionaryName
     * @returns {boolean}
     */
    _hasRecordsForDictionary(dictionaryName) {
        for (const record of this._recordsById.values()) {
            if (record.dictionary === dictionaryName) {
                return true;
            }
        }
        return false;
    }

    /**
     * @param {number} id
     * @returns {TermRecord|undefined}
     */
    getById(id) {
        this._ensurePendingArtifactReloadPlansApplied();
        return this._recordsById.get(id);
    }

    /**
     * @param {Iterable<string>} dictionaryNames
     * @returns {Promise<void>}
     */
    async ensureDictionariesLoaded(dictionaryNames) {
        this._ensurePendingArtifactReloadPlansApplied();
        if (this._recordsDirectoryHandle === null) {
            return;
        }
        /** @type {Set<string>} */
        const pending = new Set();
        for (const dictionaryName of dictionaryNames) {
            const name = `${dictionaryName}`.trim();
            if (name.length === 0 || this._loadedDictionaryNames.has(name)) {
                continue;
            }
            pending.add(name);
        }
        if (pending.size === 0) {
            return;
        }
        /** @type {TermRecordShardState[]} */
        const statesToLoad = [];
        for (const state of this._shardStateByFileName.values()) {
            const dictionaryName = this._decodeDictionaryNameFromShardFileName(state.fileName);
            if (pending.has(dictionaryName)) {
                statesToLoad.push(state);
            }
        }
        statesToLoad.sort((a, b) => a.fileName.localeCompare(b.fileName));
        for (const state of statesToLoad) {
            await this._loadShardStateContents(state);
        }
        for (const dictionaryName of pending) {
            this._loadedDictionaryNames.add(dictionaryName);
        }
    }

    /**
     * @returns {Promise<void>}
     */
    async ensureAllDictionariesLoaded() {
        this._ensurePendingArtifactReloadPlansApplied();
        if (this._allShardContentsLoaded || this._recordsDirectoryHandle === null) {
            return;
        }
        /** @type {TermRecordShardState[]} */
        const statesToLoad = [...this._shardStateByFileName.values()].sort((a, b) => a.fileName.localeCompare(b.fileName));
        for (const state of statesToLoad) {
            await this._loadShardStateContents(state);
        }
        for (const state of this._shardStateByFileName.values()) {
            const dictionaryName = this._decodeDictionaryNameFromShardFileName(state.fileName);
            if (dictionaryName.length > 0) {
                this._loadedDictionaryNames.add(dictionaryName);
            }
        }
        this._allShardContentsLoaded = true;
    }

    /**
     * @param {string[]|null} [expectedDictionaryNames]
     * @returns {Promise<{
     *   expectedShardCount: number,
     *   actualShardCount: number,
     *   missingShardCount: number,
     *   missingShardFileNames: string[],
     *   missingDictionaryNames: string[],
     *   orphanShardCount: number,
     *   orphanShardFileNames: string[],
     *   orphanDictionaryNames: string[],
     *   removedOrphanShardCount: number,
     *   invalidShardPayloadCount: number,
     *   invalidShardFileNames: string[],
     *   rewroteAllShardsFromMemory: boolean
     * }>}
     */
    async verifyIntegrity(expectedDictionaryNames = null) {
        this._ensurePendingArtifactReloadPlansApplied();
        if (!this._allShardContentsLoaded && this._recordsById.size === 0) {
            const summary = {
                expectedShardCount: 0,
                actualShardCount: this._shardStateByFileName.size,
                missingShardCount: 0,
                missingShardFileNames: [],
                missingDictionaryNames: [],
                orphanShardCount: 0,
                orphanShardFileNames: [],
                orphanDictionaryNames: [],
                removedOrphanShardCount: 0,
                invalidShardPayloadCount: this._invalidShardFileNames.length,
                invalidShardFileNames: [...this._invalidShardFileNames].sort(),
                rewroteAllShardsFromMemory: false,
            };
            reportDiagnostics('term-record-shard-integrity-summary', summary);
            return summary;
        }
        /** @type {Set<string>} */
        const expectedShardKeys = new Set();
        /** @type {Set<string>} */
        const expectedShardKeysFromRecords = new Set();
        for (const record of this._recordsById.values()) {
            const shardKey = this._getShardFileName(record.dictionary, record.entryContentDictName);
            expectedShardKeys.add(shardKey);
            expectedShardKeysFromRecords.add(shardKey);
        }
        if (Array.isArray(expectedDictionaryNames)) {
            for (const dictionaryName of expectedDictionaryNames) {
                if (typeof dictionaryName !== 'string' || dictionaryName.length === 0) { continue; }
                expectedShardKeys.add(this._getShardFileName(dictionaryName));
            }
        }

        /** @type {Map<string, string[]>} */
        const actualFilesByShardKey = new Map();
        for (const fileName of this._shardStateByFileName.keys()) {
            const shardInfo = this._decodeShardInfoFromShardFileName(fileName);
            if (shardInfo === null) { continue; }
            const shardKey = this._getShardFileName(shardInfo.dictionaryName, shardInfo.contentDictName);
            const existing = actualFilesByShardKey.get(shardKey);
            if (typeof existing === 'undefined') {
                actualFilesByShardKey.set(shardKey, [fileName]);
            } else {
                existing.push(fileName);
            }
        }

        /** @type {string[]} */
        const missingShardFileNames = [];
        /** @type {string[]} */
        const orphanShardFileNames = [];
        for (const shardKey of expectedShardKeys) {
            if (!actualFilesByShardKey.has(shardKey)) {
                missingShardFileNames.push(shardKey);
            }
        }
        for (const [shardKey, fileNames] of actualFilesByShardKey) {
            if (!expectedShardKeys.has(shardKey)) {
                orphanShardFileNames.push(...fileNames);
            }
        }

        let removedOrphanShardCount = 0;
        for (const fileName of orphanShardFileNames) {
            if (this._recordsDirectoryHandle !== null) {
                try {
                    await this._recordsDirectoryHandle.removeEntry(fileName);
                    ++removedOrphanShardCount;
                } catch (_) {
                    // NOP
                }
            }
            this._shardStateByFileName.delete(fileName);
        }

        let rewroteAllShardsFromMemory = false;
        let shouldRewriteFromMemory = false;
        for (const fileName of missingShardFileNames) {
            if (expectedShardKeysFromRecords.has(fileName)) {
                shouldRewriteFromMemory = true;
                break;
            }
        }
        if (shouldRewriteFromMemory) {
            await this._rewriteAllShardsFromMemory();
            rewroteAllShardsFromMemory = true;
        }

        const missingDictionaryNames = missingShardFileNames
            .map((fileName) => this._decodeDictionaryNameFromShardFileName(fileName))
            .filter((value) => typeof value === 'string');
        const orphanDictionaryNames = orphanShardFileNames
            .map((fileName) => this._decodeDictionaryNameFromShardFileName(fileName))
            .filter((value) => typeof value === 'string');

        const summary = {
            expectedShardCount: expectedShardKeys.size,
            actualShardCount: this._shardStateByFileName.size,
            missingShardCount: missingShardFileNames.length,
            missingShardFileNames: [...missingShardFileNames].sort(),
            missingDictionaryNames: [...new Set(missingDictionaryNames)].sort(),
            orphanShardCount: orphanShardFileNames.length,
            orphanShardFileNames: [...orphanShardFileNames].sort(),
            orphanDictionaryNames: [...new Set(orphanDictionaryNames)].sort(),
            removedOrphanShardCount,
            invalidShardPayloadCount: this._invalidShardFileNames.length,
            invalidShardFileNames: [...this._invalidShardFileNames].sort(),
            rewroteAllShardsFromMemory,
        };
        reportDiagnostics('term-record-shard-integrity-summary', summary);
        return summary;
    }

    /**
     * @param {Uint8Array} content
     * @returns {boolean}
     */
    _isBinaryFormat(content) {
        if (content.byteLength < BINARY_MAGIC_BYTES) {
            return false;
        }
        const magic = this._textDecoder.decode(content.subarray(0, BINARY_MAGIC_BYTES));
        return (
            magic === BINARY_MAGIC_TEXT ||
            magic === PREVIOUS_BINARY_MAGIC_TEXT ||
            magic === PREVIOUS_PREVIOUS_BINARY_MAGIC_TEXT ||
            magic === PREVIOUS_PREVIOUS_PREVIOUS_BINARY_MAGIC_TEXT ||
            magic === PREVIOUS_PREVIOUS_PREVIOUS_PREVIOUS_BINARY_MAGIC_TEXT ||
            magic === PREVIOUS_PREVIOUS_PREVIOUS_PREVIOUS_PREVIOUS_BINARY_MAGIC_TEXT ||
            magic === PREVIOUS_PREVIOUS_PREVIOUS_PREVIOUS_PREVIOUS_PREVIOUS_BINARY_MAGIC_TEXT ||
            magic === PREVIOUS_PREVIOUS_PREVIOUS_PREVIOUS_PREVIOUS_PREVIOUS_PREVIOUS_BINARY_MAGIC_TEXT ||
            magic === LEGACY_BINARY_MAGIC_TEXT
        );
    }

    /**
     * @param {Uint8Array} content
     * @param {string|null} shardDictionaryName
     */
    _loadBinary(content, shardDictionaryName = null) {
        const view = new DataView(content.buffer, content.byteOffset, content.byteLength);
        const magic = this._textDecoder.decode(content.subarray(0, BINARY_MAGIC_BYTES));
        const isLegacy = magic === LEGACY_BINARY_MAGIC_TEXT;
        const isCurrent = magic === BINARY_MAGIC_TEXT;
        const isPrevious = magic === PREVIOUS_BINARY_MAGIC_TEXT;
        const isPreviousPrevious = magic === PREVIOUS_PREVIOUS_BINARY_MAGIC_TEXT;
        const isPreviousPreviousPrevious = magic === PREVIOUS_PREVIOUS_PREVIOUS_BINARY_MAGIC_TEXT;
        const isPreviousPreviousPreviousPrevious = magic === PREVIOUS_PREVIOUS_PREVIOUS_PREVIOUS_BINARY_MAGIC_TEXT;
        const isPreviousPreviousPreviousPreviousPrevious = magic === PREVIOUS_PREVIOUS_PREVIOUS_PREVIOUS_PREVIOUS_BINARY_MAGIC_TEXT;
        const isPreviousPreviousPreviousPreviousPreviousPrevious = magic === PREVIOUS_PREVIOUS_PREVIOUS_PREVIOUS_PREVIOUS_PREVIOUS_BINARY_MAGIC_TEXT;
        const isPreviousPreviousPreviousPreviousPreviousPreviousPrevious = magic === PREVIOUS_PREVIOUS_PREVIOUS_PREVIOUS_PREVIOUS_PREVIOUS_PREVIOUS_BINARY_MAGIC_TEXT;
        let recordHeaderBytes;
        if (isLegacy) {
            recordHeaderBytes = LEGACY_RECORD_HEADER_BYTES;
        } else if (isCurrent) {
            recordHeaderBytes = RECORD_HEADER_BYTES;
        } else if (isPrevious) {
            recordHeaderBytes = PREVIOUS_RECORD_HEADER_BYTES;
        } else if (isPreviousPrevious) {
            recordHeaderBytes = PREVIOUS_PREVIOUS_RECORD_HEADER_BYTES;
        } else if (isPreviousPreviousPrevious || isPreviousPreviousPreviousPrevious) {
            recordHeaderBytes = PREVIOUS_PREVIOUS_PREVIOUS_RECORD_HEADER_BYTES;
        } else {
            recordHeaderBytes = PREVIOUS_PREVIOUS_PREVIOUS_PREVIOUS_RECORD_HEADER_BYTES;
        }
        let cursor = BINARY_MAGIC_BYTES;
        /** @type {string|null} */
        let sharedEntryContentDictName = null;
        if (isCurrent) {
            if ((cursor + 2) > content.byteLength) { return; }
            const entryContentDictNameMeta16 = view.getUint16(cursor, true); cursor += 2;
            let entryContentDictNameMeta = entryContentDictNameMeta16;
            if (entryContentDictNameMeta16 === U16_NULL) {
                if ((cursor + 4) > content.byteLength) { return; }
                entryContentDictNameMeta = view.getUint32(cursor, true); cursor += 4;
            }
            let entryContentDictNameLength = 0;
            if ((entryContentDictNameMeta & 0xff) === ENTRY_CONTENT_DICT_NAME_CODE_CUSTOM) {
                entryContentDictNameLength = entryContentDictNameMeta >>> 8;
            }
            if ((cursor + entryContentDictNameLength) > content.byteLength) { return; }
            sharedEntryContentDictName = this._decodeEntryContentDictName(entryContentDictNameMeta, content, cursor, entryContentDictNameLength);
            cursor += entryContentDictNameLength;
        }
        while (true) {
            let chunkBaseId = 0;
            let chunkCount = 0;
            if (isCurrent) {
                if ((cursor + CHUNK_HEADER_BYTES) > content.byteLength) { break; }
                chunkBaseId = view.getUint32(cursor, true); cursor += 4;
                chunkCount = view.getUint32(cursor, true); cursor += 4;
                if (chunkBaseId <= 0 || chunkCount === 0) { break; }
            } else {
                if ((cursor + recordHeaderBytes) > content.byteLength) { break; }
                chunkCount = 1;
            }
            /** @type {string[]|null} */
            let chunkStrings = null;
            /** @type {string[]|null} */
            let chunkStringReverses = null;
            if (isCurrent) {
                if ((cursor + STRING_TABLE_HEADER_BYTES) > content.byteLength) { return; }
                const stringCount = view.getUint32(cursor, true); cursor += 4;
                const stringBytesLength = view.getUint32(cursor, true); cursor += 4;
                const stringLengthsBytes = stringCount * 2;
                if ((cursor + stringLengthsBytes + stringBytesLength) > content.byteLength) { return; }
                chunkStrings = new Array(stringCount);
                chunkStringReverses = new Array(stringCount);
                let stringsCursor = cursor + stringLengthsBytes;
                for (let i = 0; i < stringCount; ++i) {
                    const stringLength = view.getUint16(cursor, true); cursor += 2;
                    if ((stringsCursor + stringLength) > content.byteLength) { return; }
                    const value = this._decodeString(content, stringsCursor, stringLength);
                    stringsCursor += stringLength;
                    chunkStrings[i] = value;
                    chunkStringReverses[i] = this._reverseString(value);
                }
                cursor = stringsCursor;
            }
            for (let chunkIndex = 0; chunkIndex < chunkCount; ++chunkIndex) {
                if ((cursor + recordHeaderBytes) > content.byteLength) { return; }
                const id = isCurrent ? (chunkBaseId + chunkIndex) : view.getUint32(cursor, true);
                if (!isCurrent) { cursor += 4; }
                const dictionaryLength = isLegacy ? view.getUint32(cursor, true) : 0; cursor += isLegacy ? 4 : 0;
                const expressionLength = (isCurrent || isPrevious) ? (isCurrent ? 0 : view.getUint16(cursor, true)) : view.getUint32(cursor, true); cursor += (isCurrent || isPrevious) ? (isCurrent ? 0 : 2) : 4;
                const rawReadingLength = (isCurrent || isPrevious) ? (isCurrent ? 0 : view.getUint16(cursor, true)) : view.getUint32(cursor, true); cursor += (isCurrent || isPrevious) ? (isCurrent ? 0 : 2) : 4;
                const expressionIndex = isCurrent ? view.getUint32(cursor, true) : 0; cursor += isCurrent ? 4 : 0;
                const readingIndexRaw = isCurrent ? view.getUint32(cursor, true) : 0; cursor += isCurrent ? 4 : 0;
                const readingEqualsExpression = isCurrent ? (readingIndexRaw === READING_EQUALS_EXPRESSION_U32) : false;
                const readingLength = readingEqualsExpression ? 0 : rawReadingLength;
                const rawExpressionReverseLength = (
                (isCurrent || isPrevious) ?
                    U16_NULL :
                    ((isPreviousPrevious || isPreviousPreviousPrevious) ? view.getUint16(cursor, true) : view.getUint32(cursor, true))
                );
                if (!(isCurrent || isPrevious)) { cursor += (isPreviousPrevious || isPreviousPreviousPrevious) ? 2 : 4; }
                const rawReadingReverseLength = (
                (isCurrent || isPrevious) ?
                    U16_NULL :
                    ((isPreviousPrevious || isPreviousPreviousPrevious) ? view.getUint16(cursor, true) : view.getUint32(cursor, true))
                );
                if (!(isCurrent || isPrevious)) { cursor += (isPreviousPrevious || isPreviousPreviousPrevious) ? 2 : 4; }
                const expressionReverseLength = (
                (isCurrent || isPrevious || isPreviousPrevious || isPreviousPreviousPrevious) ?
                    (rawExpressionReverseLength === U16_NULL ? -1 : rawExpressionReverseLength) :
                    (rawExpressionReverseLength === U32_NULL ? -1 : /** @type {number} */ (rawExpressionReverseLength))
                );
                const readingReverseLength = (
                (isCurrent || isPrevious || isPreviousPrevious || isPreviousPreviousPrevious) ?
                    (rawReadingReverseLength === U16_NULL ? -1 : rawReadingReverseLength) :
                    (rawReadingReverseLength === U32_NULL ? -1 : /** @type {number} */ (rawReadingReverseLength))
                );
                const rawEntryContentOffset = view.getUint32(cursor, true); cursor += 4;
                let rawEntryContentLength;
                if (isCurrent) {
                    const compactEntryContentLength = view.getUint16(cursor, true); cursor += 2;
                    if (compactEntryContentLength === ENTRY_CONTENT_LENGTH_U16_NULL) {
                        rawEntryContentLength = U32_NULL;
                    } else if (compactEntryContentLength === ENTRY_CONTENT_LENGTH_EXTENDED_U16) {
                        rawEntryContentLength = view.getUint32(cursor, true); cursor += 4;
                    } else {
                        rawEntryContentLength = compactEntryContentLength;
                    }
                } else {
                    rawEntryContentLength = view.getUint32(cursor, true); cursor += 4;
                }
                let entryContentDictNameMeta = 0;
                let entryContentDictNameFlags = 0;
                let entryContentDictNameValue = 0;
                if (!isCurrent) {
                    const entryContentDictNameMeta16 = isPrevious ? view.getUint16(cursor, true) : view.getUint32(cursor, true); cursor += isPrevious ? 2 : 4;
                    entryContentDictNameMeta = (isPrevious && entryContentDictNameMeta16 === U16_NULL) ? view.getUint32(cursor, true) : entryContentDictNameMeta16;
                    if (isPrevious && entryContentDictNameMeta16 === U16_NULL) { cursor += 4; }
                    entryContentDictNameFlags = (isPrevious || isPreviousPrevious) ? (entryContentDictNameMeta & ENTRY_CONTENT_DICT_NAME_FLAGS_MASK) : 0;
                    entryContentDictNameValue = (isPrevious || isPreviousPrevious) ? (entryContentDictNameMeta & ENTRY_CONTENT_DICT_NAME_VALUE_MASK) : entryContentDictNameMeta;
                }
                const score = view.getInt32(cursor, true); cursor += 4;
                const rawSequence = view.getInt32(cursor, true); cursor += 4;
                let entryContentDictNameLength = 0;
                if (isLegacy || isPrevious || isPreviousPrevious || isPreviousPreviousPrevious || isPreviousPreviousPreviousPrevious || isPreviousPreviousPreviousPreviousPrevious || isPreviousPreviousPreviousPreviousPreviousPrevious) {
                    entryContentDictNameLength = entryContentDictNameMeta;
                } else if (!isCurrent && (entryContentDictNameValue & 0xff) === ENTRY_CONTENT_DICT_NAME_CODE_CUSTOM) {
                    entryContentDictNameLength = entryContentDictNameValue >>> 8;
                }

                const requiredBytes =
                dictionaryLength +
                (isCurrent ? 0 : expressionLength) +
                (isCurrent ? 0 : readingLength) +
                (
                    (isCurrent || isPrevious) ?
                        0 :
                        (
                            Math.max(0, expressionReverseLength) +
                            Math.max(0, readingReverseLength)
                        )
                ) +
                entryContentDictNameLength;
                if ((cursor + requiredBytes) > content.byteLength || id <= 0) {
                    return;
                }

                const dictionary = isLegacy ? this._decodeString(content, cursor, dictionaryLength) : shardDictionaryName;
                if (isLegacy) { cursor += dictionaryLength; }
                if (dictionary === null) { return; }
                const expression = isCurrent ?
                    (chunkStrings !== null && expressionIndex < chunkStrings.length ? chunkStrings[expressionIndex] : '') :
                    this._decodeString(content, cursor, expressionLength);
                if (!isCurrent) { cursor += expressionLength; }
                if (expression.length === 0 && isCurrent) { return; }
                let reading;
                if (isCurrent && readingEqualsExpression) {
                    reading = expression;
                } else if (isPrevious && (entryContentDictNameFlags & ENTRY_CONTENT_DICT_NAME_FLAG_READING_EQUALS_EXPRESSION) !== 0) {
                    reading = expression;
                } else if (isCurrent) {
                    reading = (chunkStrings !== null && readingIndexRaw < chunkStrings.length) ? chunkStrings[readingIndexRaw] : '';
                } else {
                    reading = this._decodeString(content, cursor, readingLength);
                }
                if (!(isCurrent && readingEqualsExpression) && !(isPrevious && (entryContentDictNameFlags & ENTRY_CONTENT_DICT_NAME_FLAG_READING_EQUALS_EXPRESSION) !== 0) && !isCurrent) {
                    cursor += readingLength;
                }
                let expressionReverse;
                let readingReverse;
                if (isCurrent || isPrevious) {
                    if (isCurrent) {
                        expressionReverse = chunkStringReverses !== null ? chunkStringReverses[expressionIndex] : this._reverseString(expression);
                        readingReverse = reading === expression ?
                            expressionReverse :
                            (chunkStringReverses !== null ? chunkStringReverses[readingIndexRaw] : this._reverseString(reading));
                    } else {
                        expressionReverse = this._reverseString(expression);
                        readingReverse = reading === expression ? expressionReverse : this._reverseString(reading);
                    }
                } else {
                    expressionReverse = expressionReverseLength >= 0 ? this._decodeString(content, cursor, expressionReverseLength) : null;
                    if (expressionReverseLength >= 0) { cursor += expressionReverseLength; }
                    readingReverse = (
                    readingReverseLength >= 0 ?
                        (
                            isPreviousPrevious && (entryContentDictNameFlags & ENTRY_CONTENT_DICT_NAME_FLAG_READING_REVERSE_EQUALS_EXPRESSION_REVERSE) !== 0 ?
                                expressionReverse :
                                this._decodeString(content, cursor, readingReverseLength)
                        ) :
                        null
                    );
                    if (readingReverseLength >= 0 && !(isPreviousPrevious && (entryContentDictNameFlags & ENTRY_CONTENT_DICT_NAME_FLAG_READING_REVERSE_EQUALS_EXPRESSION_REVERSE) !== 0)) {
                        cursor += readingReverseLength;
                    }
                }
                const entryContentDictName = isCurrent ?
                    (sharedEntryContentDictName ?? 'raw') :
                    (
                        (isLegacy || isPrevious || isPreviousPrevious || isPreviousPreviousPrevious || isPreviousPreviousPreviousPrevious || isPreviousPreviousPreviousPreviousPrevious || isPreviousPreviousPreviousPreviousPreviousPrevious || isPreviousPreviousPreviousPreviousPreviousPreviousPrevious) ?
                            this._decodeString(content, cursor, entryContentDictNameLength) :
                            this._decodeEntryContentDictName(entryContentDictNameValue, content, cursor, entryContentDictNameLength)
                    );
                if (!isCurrent) {
                    cursor += entryContentDictNameLength;
                }

                const record = {
                    id,
                    dictionary,
                    expression,
                    reading,
                    expressionReverse,
                    readingReverse,
                    entryContentOffset: rawEntryContentOffset === U32_NULL ? -1 : rawEntryContentOffset,
                    entryContentLength: rawEntryContentLength === U32_NULL ? -1 : rawEntryContentLength,
                    entryContentDictName,
                    score,
                    sequence: rawSequence >= 0 ? rawSequence : null,
                };
                this._recordsById.set(id, record);
                if (id >= this._nextId) {
                    this._nextId = id + 1;
                }
            }
        }
    }

    /**
     * @param {number} meta
     * @param {Uint8Array} content
     * @param {number} offset
     * @param {number} customLength
     * @returns {string}
     */
    _decodeEntryContentDictName(meta, content, offset, customLength) {
        switch (meta & 0xff) {
            case ENTRY_CONTENT_DICT_NAME_CODE_RAW:
                return 'raw';
            case ENTRY_CONTENT_DICT_NAME_CODE_RAW_V2:
                return RAW_TERM_CONTENT_DICT_NAME;
            case ENTRY_CONTENT_DICT_NAME_CODE_RAW_V3:
                return RAW_TERM_CONTENT_SHARED_GLOSSARY_DICT_NAME;
            case ENTRY_CONTENT_DICT_NAME_CODE_RAW_V4:
                return RAW_TERM_CONTENT_COMPRESSED_SHARED_GLOSSARY_DICT_NAME;
            case ENTRY_CONTENT_DICT_NAME_CODE_JMDICT:
                return 'jmdict';
            case ENTRY_CONTENT_DICT_NAME_CODE_CUSTOM:
                return this._decodeString(content, offset, customLength);
            default:
                return 'raw';
        }
    }

    /**
     * @param {string} value
     * @returns {{meta: number, bytes: Uint8Array|null}}
     */
    _encodeEntryContentDictNameMeta(value) {
        switch (value) {
            case '':
            case 'raw':
                return {meta: ENTRY_CONTENT_DICT_NAME_CODE_RAW, bytes: null};
            case RAW_TERM_CONTENT_DICT_NAME:
                return {meta: ENTRY_CONTENT_DICT_NAME_CODE_RAW_V2, bytes: null};
            case RAW_TERM_CONTENT_SHARED_GLOSSARY_DICT_NAME:
                return {meta: ENTRY_CONTENT_DICT_NAME_CODE_RAW_V3, bytes: null};
            case RAW_TERM_CONTENT_COMPRESSED_SHARED_GLOSSARY_DICT_NAME:
                return {meta: ENTRY_CONTENT_DICT_NAME_CODE_RAW_V4, bytes: null};
            case 'jmdict':
                return {meta: ENTRY_CONTENT_DICT_NAME_CODE_JMDICT, bytes: null};
            default: {
                const bytes = this._textEncoder.encode(value);
                return {meta: (((bytes.byteLength >>> 0) << 8) | ENTRY_CONTENT_DICT_NAME_CODE_CUSTOM) >>> 0, bytes};
            }
        }
    }

    /**
     * @param {Uint8Array} content
     */
    _loadLegacyNdjson(content) {
        const text = this._textDecoder.decode(content);
        for (const line of text.split('\n')) {
            if (line.length === 0) { continue; }
            let raw;
            try {
                raw = /** @type {unknown[]} */ (parseJson(line));
            } catch (_) {
                continue;
            }
            if (!Array.isArray(raw) || raw.length < 11) { continue; }
            const id = this._asNumber(raw[0], -1);
            if (id <= 0) { continue; }
            const record = {
                id,
                dictionary: this._asString(raw[1]),
                expression: this._asString(raw[2]),
                reading: this._asString(raw[3]),
                expressionReverse: this._asNullableString(raw[4]),
                readingReverse: this._asNullableString(raw[5]),
                entryContentOffset: this._asNumber(raw[6], -1),
                entryContentLength: this._asNumber(raw[7], -1),
                entryContentDictName: this._asString(raw[8]),
                score: this._asNumber(raw[9], 0),
                sequence: this._asNullableNumber(raw[10]),
            };
            this._recordsById.set(id, record);
            if (id >= this._nextId) {
                this._nextId = id + 1;
            }
        }
    }

    /**
     * @param {Uint8Array} content
     * @param {number} offset
     * @param {number} length
     * @returns {string}
     */
    _decodeString(content, offset, length) {
        if (length <= 0) {
            return '';
        }
        return this._textDecoder.decode(content.subarray(offset, offset + length));
    }

    /**
     * @param {string} value
     * @returns {string}
     */
    _reverseString(value) {
        let result = '';
        for (let i = value.length - 1; i >= 0; --i) {
            const c = value.charCodeAt(i);
            if (
                (c & 0xfc00) === 0xdc00 &&
                i > 0
            ) {
                const c2 = value.charCodeAt(i - 1);
                if ((c2 & 0xfc00) === 0xd800) {
                    result += value[i - 1] + value[i];
                    --i;
                    continue;
                }
            }
            result += value[i];
        }
        return result;
    }

    /**
     * @param {TermRecord[]} records
     * @param {import('./term-record-wasm-encoder.js').PreinternedTermRecordPlan|null} [preinternedPlan]
     * @returns {Promise<Uint8Array>}
     */
    async _encodeRecords(records, preinternedPlan = null) {
        if (records.length === 0) {
            return new Uint8Array(0);
        }
        if (!this._wasmEncoderUnavailable) {
            try {
                const encoded = preinternedPlan === null ?
                    await encodeTermRecordsWithWasm(records, this._textEncoder) :
                    await encodeTermRecordsWithWasmPreinterned(records, this._textEncoder, preinternedPlan);
                if (encoded instanceof Uint8Array) {
                    return encoded;
                }
            } catch (_) {
                this._wasmEncoderUnavailable = true;
            }
        }
        /** @type {Array<{record: TermRecord, expressionIndex: number, readingIndex: number}>} */
        const encodedRows = [];
        /** @type {Map<string, number>} */
        const stringIndexByValue = new Map();
        /** @type {Uint8Array[]} */
        const stringBytesList = [];
        /** @type {number[]} */
        const stringLengths = [];
        let stringsByteLength = 0;
        let totalBytes = STRING_TABLE_HEADER_BYTES;
        /**
         * @param {string} value
         * @param {Uint8Array} bytes
         * @returns {number}
         */
        const internStringBytes = (value, bytes) => {
            /** @type {number|undefined} */
            const cached = stringIndexByValue.get(value);
            if (typeof cached === 'number') { return cached; }
            const index = stringBytesList.length;
            stringIndexByValue.set(value, index);
            stringBytesList.push(bytes);
            stringLengths.push(bytes.byteLength);
            stringsByteLength += bytes.byteLength;
            return index;
        };
        for (const record of records) {
            const expression = record.expression ?? '';
            const reading = record.reading ?? expression;
            const expressionBytes = record.expressionBytes instanceof Uint8Array ? record.expressionBytes : this._textEncoder.encode(expression);
            const readingBytes = record.readingBytes instanceof Uint8Array ? record.readingBytes : this._textEncoder.encode(reading);
            const expressionIndex = internStringBytes(expression, expressionBytes);
            const readingIndex = reading === expression ?
                READING_EQUALS_EXPRESSION_U32 :
                internStringBytes(reading, readingBytes);
            totalBytes +=
                RECORD_HEADER_BYTES +
                ((record.entryContentLength >= 0 && record.entryContentLength > 0xfffd) ? 4 : 0);
            encodedRows.push({
                record,
                expressionIndex,
                readingIndex,
            });
        }
        totalBytes += (stringLengths.length * 2) + stringsByteLength;

        const output = new Uint8Array(totalBytes);
        const view = new DataView(output.buffer, output.byteOffset, output.byteLength);
        let cursor = 0;
        view.setUint32(cursor, stringLengths.length, true); cursor += 4;
        view.setUint32(cursor, stringsByteLength, true); cursor += 4;
        for (const stringLength of stringLengths) {
            view.setUint16(cursor, stringLength, true); cursor += 2;
        }
        for (const bytes of stringBytesList) {
            output.set(bytes, cursor);
            cursor += bytes.byteLength;
        }
        for (const row of encodedRows) {
            const {record, expressionIndex, readingIndex} = row;
            view.setUint32(cursor, expressionIndex, true); cursor += 4;
            view.setUint32(cursor, readingIndex, true); cursor += 4;
            view.setUint32(cursor, record.entryContentOffset >= 0 ? record.entryContentOffset : U32_NULL, true); cursor += 4;
            if (record.entryContentLength < 0) {
                view.setUint16(cursor, ENTRY_CONTENT_LENGTH_U16_NULL, true); cursor += 2;
            } else if (record.entryContentLength <= 0xfffd) {
                view.setUint16(cursor, record.entryContentLength, true); cursor += 2;
            } else {
                view.setUint16(cursor, ENTRY_CONTENT_LENGTH_EXTENDED_U16, true); cursor += 2;
                view.setUint32(cursor, record.entryContentLength, true); cursor += 4;
            }
            view.setInt32(cursor, record.score, true); cursor += 4;
            view.setInt32(cursor, record.sequence ?? -1, true); cursor += 4;
        }
        return output;
    }

    /**
     * @param {{dictionary: string, rowCount: number, expressionBytesList: Uint8Array[], readingBytesList: Uint8Array[], readingEqualsExpressionList: boolean[], scoreList: number[], sequenceList: (number|undefined)[]}} chunk
     * @param {number[]} contentOffsets
     * @param {number[]} contentLengths
     * @param {import('./term-record-wasm-encoder.js').PreinternedTermRecordPlan|null} [preinternedPlan]
     * @returns {Promise<Uint8Array>}
     */
    async _encodeArtifactChunkRecords(chunk, contentOffsets, contentLengths, preinternedPlan = null) {
        if (chunk.rowCount === 0) {
            return new Uint8Array(0);
        }
        if (preinternedPlan !== null && !this._wasmEncoderUnavailable) {
            try {
                const encoded = await encodeTermRecordArtifactChunkWithWasmPreinterned(
                    chunk,
                    contentOffsets,
                    contentLengths,
                    this._textEncoder,
                    preinternedPlan,
                );
                if (encoded instanceof Uint8Array) {
                    return encoded;
                }
            } catch (_) {
                this._wasmEncoderUnavailable = true;
            }
        }
        /** @type {TermRecord[]} */
        const records = new Array(chunk.rowCount);
        for (let i = 0; i < chunk.rowCount; ++i) {
            const id = i + 1;
            const sequenceValue = chunk.sequenceList[i];
            records[i] = {
                id,
                dictionary: chunk.dictionary,
                expression: '',
                reading: '',
                readingEqualsExpression: chunk.readingEqualsExpressionList[i] === true || chunk.readingEqualsExpressionList[i] === 1,
                expressionBytes: chunk.expressionBytesList[i],
                readingBytes: (chunk.readingEqualsExpressionList[i] === true || chunk.readingEqualsExpressionList[i] === 1) ? void 0 : chunk.readingBytesList[i],
                expressionReverse: null,
                readingReverse: null,
                entryContentOffset: contentOffsets[i],
                entryContentLength: contentLengths[i],
                entryContentDictName: 'raw',
                score: chunk.scoreList[i] ?? 0,
                sequence: typeof sequenceValue === 'number' && sequenceValue >= 0 ? sequenceValue : null,
            };
        }
        return await this._encodeRecords(records, preinternedPlan);
    }

    /**
     * @param {TermRecordShardState} state
     * @param {Uint8Array} chunk
     * @param {number} firstId
     * @param {number} count
     * @param {string|null} [contentDictNameOverride=null]
     * @returns {Promise<void>}
     */
    async _appendEncodedChunk(state, chunk, firstId, count, contentDictNameOverride = null) {
        if (chunk.byteLength <= 0) { return; }
        const firstRecord = this._recordsById.get(firstId) ?? null;
        const contentDictName = contentDictNameOverride ?? firstRecord?.entryContentDictName ?? 'raw';
        if (state.sharedContentDictName === null) {
            state.sharedContentDictName = contentDictName;
        } else if (state.sharedContentDictName !== contentDictName) {
            throw new Error(`Mixed entryContentDictName values are not supported within shard ${state.fileName}`);
        }

        const withHeader = state.fileLength === 0 ?
            this._withBinaryHeader(this._withChunkHeader(chunk, firstId, count), state.sharedContentDictName) :
            this._withChunkHeader(chunk, firstId, count);
        state.pendingWriteChunks.push(withHeader);
        state.pendingWriteBytes += withHeader.byteLength;
        state.fileLength += withHeader.byteLength;

        if (!this._importSessionActive || state.pendingWriteBytes >= this._flushThresholdBytes) {
            await this._flushPendingWritesForShard(state);
            if (!this._importSessionActive) {
                await this._closeShardWritable(state);
            }
        }
    }

    /**
     * @param {Uint8Array} payload
     * @param {string} [contentDictName]
     * @returns {Uint8Array}
     */
    _withBinaryHeader(payload, contentDictName = 'raw') {
        const header = this._textEncoder.encode(BINARY_MAGIC_TEXT);
        const {meta: entryContentDictNameMeta, bytes: entryContentDictNameBytes} = this._encodeEntryContentDictNameMeta(contentDictName);
        const hasExtendedMeta = entryContentDictNameMeta > ENTRY_CONTENT_DICT_NAME_VALUE_MASK;
        const output = new Uint8Array(
            header.byteLength +
            2 +
            (hasExtendedMeta ? 4 : 0) +
            (entryContentDictNameBytes?.byteLength ?? 0) +
            payload.byteLength,
        );
        output.set(header, 0);
        const view = new DataView(output.buffer, output.byteOffset, output.byteLength);
        let cursor = header.byteLength;
        if (hasExtendedMeta) {
            view.setUint16(cursor, U16_NULL, true); cursor += 2;
            view.setUint32(cursor, entryContentDictNameMeta >>> 0, true); cursor += 4;
        } else {
            view.setUint16(cursor, entryContentDictNameMeta >>> 0, true); cursor += 2;
        }
        if (entryContentDictNameBytes !== null) {
            output.set(entryContentDictNameBytes, cursor);
            cursor += entryContentDictNameBytes.byteLength;
        }
        output.set(payload, cursor);
        return output;
    }

    /**
     * @param {Uint8Array} payload
     * @param {number} firstId
     * @param {number} count
     * @returns {Uint8Array}
     */
    _withChunkHeader(payload, firstId, count) {
        const output = new Uint8Array(CHUNK_HEADER_BYTES + payload.byteLength);
        const view = new DataView(output.buffer, output.byteOffset, output.byteLength);
        view.setUint32(0, firstId >>> 0, true);
        view.setUint32(4, count >>> 0, true);
        output.set(payload, CHUNK_HEADER_BYTES);
        return output;
    }

    /**
     * @returns {Promise<void>}
     */
    async _flushPendingWrites() {
        if (this._shardStateByFileName.size === 0) {
            return;
        }
        for (const state of this._shardStateByFileName.values()) {
            await this._flushPendingWritesForShard(state);
        }
    }

    /**
     * @returns {Promise<void>}
     */
    async _awaitQueuedWrites() {
        if (this._shardStateByFileName.size === 0) {
            return;
        }
        for (const state of this._shardStateByFileName.values()) {
            await this._awaitQueuedWritesForShard(state);
        }
    }

    /**
     * @returns {Promise<void>}
     */
    async _closeAllWritables() {
        for (const state of this._shardStateByFileName.values()) {
            await this._awaitQueuedWritesForShard(state);
            await this._closeShardWritable(state);
        }
    }

    /**
     * @param {TermRecordShardState} state
     * @returns {Promise<void>}
     */
    async _closeShardWritable(state) {
        if (state.writable === null) {
            return;
        }
        try {
            await state.writable.close();
        } catch (error) {
            if (!this._isClosingWritableStreamError(error)) {
                throw error;
            }
        } finally {
            state.writable = null;
        }
    }

    /**
     * @param {unknown} error
     * @returns {boolean}
     */
    _isClosingWritableStreamError(error) {
        const message = (error instanceof Error) ? error.message : String(error);
        return (
            message.includes('closing writable stream') ||
            message.includes('closed or closing stream')
        );
    }

    /**
     * @param {TermRecordShardState} state
     * @param {number} seekOffset
     * @returns {Promise<void>}
     */
    async _reopenShardWritable(state, seekOffset) {
        state.writable = await state.fileHandle.createWritable({keepExistingData: true});
        await state.writable.seek(Math.max(0, seekOffset));
    }

    /**
     * @returns {Promise<void>}
     */
    async _rewriteAllShardsFromMemory() {
        if (this._recordsDirectoryHandle === null) {
            return;
        }
        await this._closeAllWritables();
        this._shardStateByFileName.clear();
        this._activeAppendShardStateByKey.clear();

        const existingShardFileNames = await this._listShardFileNames();
        for (const fileName of existingShardFileNames) {
            try {
                await this._recordsDirectoryHandle.removeEntry(fileName);
            } catch (_) {
                // NOP
            }
        }

        /** @type {Map<string, {dictionaryName: string, contentDictName: string, records: TermRecord[]}>} */
        const recordsByShard = new Map();
        const orderedRecords = [...this._recordsById.values()].sort((a, b) => a.id - b.id);
        for (const record of orderedRecords) {
            const contentDictName = record.entryContentDictName ?? 'raw';
            const fileName = this._getShardFileName(record.dictionary, contentDictName);
            const shard = recordsByShard.get(fileName);
            if (typeof shard === 'undefined') {
                recordsByShard.set(fileName, {dictionaryName: record.dictionary, contentDictName, records: [record]});
            } else {
                shard.records.push(record);
            }
        }

        for (const [fileName, shard] of recordsByShard) {
            const {contentDictName, records} = shard;
            const payload = await this._encodeRecords(records);
            const fileHandle = await this._recordsDirectoryHandle.getFileHandle(fileName, {create: true});
            const writable = await fileHandle.createWritable();
            await writable.truncate(0);
            let fileLength = 0;
            if (payload.byteLength > 0) {
                const output = this._withBinaryHeader(payload, contentDictName);
                await writable.write(output);
                fileLength = output.byteLength;
            }
            await writable.close();
            const state = this._createShardState(fileName, fileHandle, fileLength, contentDictName);
            this._shardStateByFileName.set(fileName, state);
            this._setActiveAppendShardState(state);
        }
    }

    /**
     * @returns {Promise<number>}
     */
    async _loadShardFiles(materializeRecords = true) {
        if (this._recordsDirectoryHandle === null) {
            return 0;
        }
        const entriesMethod = /** @type {unknown} */ (Reflect.get(this._recordsDirectoryHandle, 'entries'));
        if (typeof entriesMethod !== 'function') {
            return 0;
        }
        const entries = /** @type {() => AsyncIterable<[string, FileSystemHandle]>} */ (entriesMethod).call(this._recordsDirectoryHandle);
        let shardFileCount = 0;
        for await (const entry of entries) {
            const name = String(entry[0] ?? '');
            const fileSystemHandle = /** @type {FileSystemHandle} */ (/** @type {unknown} */ (entry[1]));
            if (fileSystemHandle.kind !== 'file' || !this._isShardFileName(name)) {
                continue;
            }
            const fileHandle = /** @type {FileSystemFileHandle} */ (fileSystemHandle);
            let file;
            try {
                file = await fileHandle.getFile();
            } catch (_) {
                continue;
            }
            ++shardFileCount;
            const shardInfo = this._decodeShardInfoFromShardFileName(name);
            const state = this._createShardState(
                name,
                fileHandle,
                file.size,
                null,
                shardInfo?.segmentIndex ?? 0,
                shardInfo === null ? name : this._getShardFileName(shardInfo.dictionaryName, shardInfo.contentDictName),
            );
            this._shardStateByFileName.set(name, state);
            this._setActiveAppendShardState(state);
            if (!materializeRecords || file.size <= 0) {
                continue;
            }
            await this._loadShardStateContents(state, file);
        }
        return shardFileCount;
    }

    /**
     * @param {TermRecordShardState} state
     * @param {File|null} [existingFile=null]
     * @returns {Promise<void>}
     */
    async _loadShardStateContents(state, existingFile = null) {
        let file = existingFile;
        if (file === null) {
            try {
                file = await state.fileHandle.getFile();
            } catch (_) {
                return;
            }
        }
        state.fileLength = file.size;
        if (file.size <= 0) {
            return;
        }
        const arrayBuffer = await file.arrayBuffer();
        const content = new Uint8Array(arrayBuffer);
        if (this._isBinaryFormat(content)) {
            this._loadBinary(content, this._decodeDictionaryNameFromShardFileName(state.fileName));
            return;
        }
        this._invalidShardFileNames.push(state.fileName);
        this._shardStateByFileName.delete(state.fileName);
        this._activeAppendShardStateByKey.delete(state.logicalKey);
        if (this._recordsDirectoryHandle !== null) {
            try {
                await this._recordsDirectoryHandle.removeEntry(state.fileName);
            } catch (_) {
                // NOP
            }
        }
    }

    /**
     * @returns {Promise<boolean>}
     */
    async _migrateLegacyMonolithicIfPresent() {
        if (this._rootDirectoryHandle === null) {
            return false;
        }
        let fileHandle;
        try {
            fileHandle = await this._rootDirectoryHandle.getFileHandle(LEGACY_FILE_NAME, {create: false});
        } catch (_) {
            return false;
        }
        const file = await fileHandle.getFile();
        if (file.size <= 0) {
            await this._deleteLegacyMonolithicIfPresent();
            return false;
        }
        const content = new Uint8Array(await file.arrayBuffer());
        if (this._isBinaryFormat(content)) {
            this._loadBinary(content);
        } else {
            this._loadLegacyNdjson(content);
        }
        await this._rewriteAllShardsFromMemory();
        await this._deleteLegacyMonolithicIfPresent();
        return true;
    }

    /**
     * @returns {Promise<void>}
     */
    async _deleteLegacyMonolithicIfPresent() {
        if (this._rootDirectoryHandle === null) {
            return;
        }
        try {
            await this._rootDirectoryHandle.removeEntry(LEGACY_FILE_NAME);
        } catch (_) {
            // NOP
        }
    }

    /**
     * @returns {Promise<string[]>}
     */
    async _listShardFileNames() {
        if (this._recordsDirectoryHandle === null) {
            return [];
        }
        const entriesMethod = /** @type {unknown} */ (Reflect.get(this._recordsDirectoryHandle, 'entries'));
        if (typeof entriesMethod !== 'function') {
            return [];
        }
        const entries = /** @type {() => AsyncIterable<[string, FileSystemHandle]>} */ (entriesMethod).call(this._recordsDirectoryHandle);
        /** @type {string[]} */
        const names = [];
        for await (const entry of entries) {
            const name = String(entry[0] ?? '');
            const fileSystemHandle = /** @type {FileSystemHandle} */ (/** @type {unknown} */ (entry[1]));
            if (fileSystemHandle.kind === 'file' && this._isShardFileName(name)) {
                names.push(name);
            }
        }
        return names;
    }

    /**
     * @returns {boolean}
     */
    _hasPendingShardWrites() {
        for (const state of this._shardStateByFileName.values()) {
            if (state.writable !== null || state.pendingWriteBytes > 0 || state.pendingWriteChunks.length > 0) {
                return true;
            }
        }
        return false;
    }

    /**
     * @param {string} dictionaryName
     * @param {string} [contentDictName='raw']
     * @returns {Promise<TermRecordShardState|null>}
     */
    async _getOrCreateShardState(dictionaryName, contentDictName = 'raw') {
        if (this._recordsDirectoryHandle === null) {
            return null;
        }
        const normalizedContentDictName = this._normalizeContentDictName(contentDictName);
        const logicalKey = this._getShardFileName(dictionaryName, normalizedContentDictName);
        const existing = this._activeAppendShardStateByKey.get(logicalKey);
        if (typeof existing !== 'undefined') {
            if (existing.fileLength < MAX_SHARD_SEGMENT_FILE_BYTES) {
                return existing;
            }
            const nextSegmentIndex = existing.segmentIndex + 1;
            const nextFileName = this._getShardSegmentFileName(dictionaryName, normalizedContentDictName, nextSegmentIndex);
            const nextFileHandle = await this._recordsDirectoryHandle.getFileHandle(nextFileName, {create: true});
            const created = this._createShardState(
                nextFileName,
                nextFileHandle,
                this._importSessionActive ? 0 : (await nextFileHandle.getFile()).size,
                normalizedContentDictName,
                nextSegmentIndex,
                logicalKey,
            );
            this._shardStateByFileName.set(nextFileName, created);
            this._activeAppendShardStateByKey.set(logicalKey, created);
            return created;
        }
        const fileName = this._getShardSegmentFileName(dictionaryName, normalizedContentDictName, 0);
        const fileHandle = await this._recordsDirectoryHandle.getFileHandle(fileName, {create: true});
        const created = this._createShardState(
            fileName,
            fileHandle,
            this._importSessionActive ? 0 : (await fileHandle.getFile()).size,
            normalizedContentDictName,
            0,
            logicalKey,
        );
        this._shardStateByFileName.set(fileName, created);
        this._activeAppendShardStateByKey.set(logicalKey, created);
        return created;
    }

    /**
     * @param {TermRecordShardState} state
     * @returns {Promise<void>}
     */
    async _flushPendingWritesForShard(state) {
        if (state.pendingWriteBytes <= 0 || state.pendingWriteChunks.length === 0) {
            return;
        }
        if (state.writable === null) {
            state.writable = await state.fileHandle.createWritable({keepExistingData: true});
            const seekOffset = state.fileLength - state.pendingWriteBytes;
            await state.writable.seek(Math.max(0, seekOffset));
        }
        const chunks = this._coalescePendingChunks(state.pendingWriteChunks);
        state.pendingWriteChunks = [];
        state.pendingWriteBytes = 0;
        if (this._importSessionActive) {
            this._queueWriteChunksForShard(state, chunks);
            if (state.queuedWriteBytes >= this._queuedWriteBudgetBytes) {
                const rotated = await this._rotateActiveShardSegmentAfterQueuePressure(state);
                if (!rotated) {
                    await this._awaitQueuedWritesForShard(state);
                }
            }
            return;
        }
        if (state.queuedWritePromise !== null) {
            this._queueWriteChunksForShard(state, chunks);
            await this._awaitQueuedWritesForShard(state);
            return;
        }
        await this._writeChunksForShard(state, chunks);
    }

    /**
     * @param {TermRecordShardState} state
     * @param {Uint8Array[]} chunks
     * @returns {void}
     */
    _queueWriteChunksForShard(state, chunks) {
        if (chunks.length === 0) {
            return;
        }
        for (const chunk of chunks) {
            if (chunk.byteLength <= 0) { continue; }
            state.queuedWriteChunks.push(chunk);
            state.queuedWriteBytes += chunk.byteLength;
        }
        if (state.queuedWritePromise !== null) {
            return;
        }
        state.queuedWritePromise = this._drainQueuedWritesForShard(state);
    }

    /**
     * @param {TermRecordShardState} state
     * @returns {Promise<void>}
     */
    async _awaitQueuedWritesForShard(state) {
        const promise = state.queuedWritePromise;
        if (promise === null) {
            return;
        }
        await promise;
    }

    /**
     * @param {TermRecordShardState} state
     * @returns {Promise<boolean>}
     */
    async _rotateActiveShardSegmentAfterQueuePressure(state) {
        const logicalKey = state.logicalKey;
        if (logicalKey === null) {
            return false;
        }
        const active = this._activeAppendShardStateByKey.get(logicalKey);
        if (active !== state) {
            return false;
        }
        const nextSegmentIndex = state.segmentIndex + 1;
        const decodedShardInfo = this._decodeShardInfoFromShardFileName(state.logicalKey ?? state.fileName);
        const dictionaryName = decodedShardInfo?.dictionaryName ?? this._decodeShardInfoFromShardFileName(state.fileName)?.dictionaryName ?? '';
        const sharedContentDictName = String(state.sharedContentDictName ?? 'raw');
        const nextFileName = this._getShardSegmentFileName(dictionaryName, sharedContentDictName, nextSegmentIndex);
        const nextFileHandle = await this._recordsDirectoryHandle?.getFileHandle(nextFileName, {create: true});
        if (typeof nextFileHandle === 'undefined') {
            return false;
        }
        const created = this._createShardState(
            nextFileName,
            nextFileHandle,
            0,
            state.sharedContentDictName,
            nextSegmentIndex,
            logicalKey,
        );
        this._shardStateByFileName.set(nextFileName, created);
        this._activeAppendShardStateByKey.set(logicalKey, created);
        return true;
    }

    /**
     * @param {TermRecordShardState} state
     * @returns {Promise<void>}
     */
    async _drainQueuedWritesForShard(state) {
        try {
            while (state.queuedWriteChunks.length > 0) {
                const chunks = state.queuedWriteChunks;
                state.queuedWriteChunks = [];
                state.queuedWriteBytes = 0;
                await this._writeChunksForShard(state, chunks);
            }
        } finally {
            state.queuedWritePromise = null;
            if (state.queuedWriteChunks.length > 0) {
                state.queuedWritePromise = this._drainQueuedWritesForShard(state);
            }
        }
    }

    /**
     * @param {TermRecordShardState} state
     * @param {Uint8Array[]} chunks
     * @returns {Promise<void>}
     */
    async _writeChunksForShard(state, chunks) {
        if (state.writable === null) {
            return;
        }
        let writtenBytes = 0;
        for (const chunk of chunks) {
            if (chunk.byteLength <= 0) { continue; }
            try {
                await state.writable.write(chunk);
                writtenBytes += chunk.byteLength;
            } catch (error) {
                if (!this._isClosingWritableStreamError(error)) {
                    throw error;
                }
                state.writable = null;
                const seekOffset = state.fileLength - this._sumChunkByteLength(chunks) + writtenBytes;
                await this._reopenShardWritable(state, seekOffset);
                if (state.writable === null) {
                    throw error;
                }
                await state.writable.write(chunk);
                writtenBytes += chunk.byteLength;
            }
        }
    }

    /**
     * @param {Uint8Array[]} chunks
     * @returns {number}
     */
    _sumChunkByteLength(chunks) {
        let total = 0;
        for (const chunk of chunks) {
            total += chunk.byteLength;
        }
        return total;
    }

    /**
     * @param {string} dictionaryName
     * @returns {Promise<void>}
     */
    async _deleteShardByDictionary(dictionaryName) {
        if (this._recordsDirectoryHandle === null) {
            return;
        }
        const fileNames = await this._listShardFileNames();
        for (const fileName of fileNames) {
            if (this._decodeDictionaryNameFromShardFileName(fileName) !== dictionaryName) {
                continue;
            }
            const state = this._shardStateByFileName.get(fileName);
            if (typeof state !== 'undefined') {
                await this._flushPendingWritesForShard(state);
                await this._closeShardWritable(state);
                this._shardStateByFileName.delete(fileName);
                this._activeAppendShardStateByKey.delete(state.logicalKey);
            }
            try {
                await this._recordsDirectoryHandle.removeEntry(fileName);
            } catch (_) {
                // NOP
            }
        }
    }

    /**
     * @param {string} fileName
     * @param {FileSystemFileHandle} fileHandle
     * @param {number} fileLength
     * @param {string|null} [sharedContentDictName]
     * @param {number} [segmentIndex=0]
     * @param {string|null} [logicalKey=null]
     * @returns {TermRecordShardState}
     */
    _createShardState(fileName, fileHandle, fileLength, sharedContentDictName = null, segmentIndex = 0, logicalKey = null) {
        return {
            fileName,
            fileHandle,
            writable: null,
            fileLength,
            pendingWriteBytes: 0,
            pendingWriteChunks: [],
            queuedWriteBytes: 0,
            queuedWritePromise: null,
            queuedWriteChunks: [],
            sharedContentDictName,
            segmentIndex,
            logicalKey: logicalKey ?? fileName,
        };
    }

    /**
     * @param {string} dictionaryName
     * @returns {string|null}
     */
    /**
     * @returns {number}
     */
    _computeFlushThresholdBytes() {
        /** @type {number|null} */
        let memoryGiB = null;
        try {
            const rawValue = /** @type {unknown} */ (Reflect.get(globalThis.navigator ?? {}, 'deviceMemory'));
            if (typeof rawValue === 'number' && Number.isFinite(rawValue) && rawValue > 0) {
                memoryGiB = rawValue;
            }
        } catch (_) {
            // NOP
        }
        if (memoryGiB !== null) {
            if (memoryGiB <= 4) {
                return LOW_MEMORY_FLUSH_THRESHOLD_BYTES;
            }
            if (memoryGiB >= 8) {
                return HIGH_MEMORY_FLUSH_THRESHOLD_BYTES;
            }
        }
        return DEFAULT_FLUSH_THRESHOLD_BYTES;
    }

    /**
     * @returns {number}
     */
    _computeQueuedWriteBudgetBytes() {
        /** @type {number|null} */
        let memoryGiB = null;
        try {
            const rawValue = /** @type {unknown} */ (Reflect.get(globalThis.navigator ?? {}, 'deviceMemory'));
            if (typeof rawValue === 'number' && Number.isFinite(rawValue) && rawValue > 0) {
                memoryGiB = rawValue;
            }
        } catch (_) {
            // NOP
        }
        if (memoryGiB !== null) {
            if (memoryGiB <= 4) {
                return LOW_MEMORY_QUEUED_WRITE_BUDGET_BYTES;
            }
            if (memoryGiB >= 8) {
                return HIGH_MEMORY_QUEUED_WRITE_BUDGET_BYTES;
            }
        }
        return DEFAULT_QUEUED_WRITE_BUDGET_BYTES;
    }

    /**
     * @returns {number}
     */
    _computeWriteCoalesceTargetBytes() {
        /** @type {number|null} */
        let memoryGiB = null;
        try {
            const rawValue = /** @type {unknown} */ (Reflect.get(globalThis.navigator ?? {}, 'deviceMemory'));
            if (typeof rawValue === 'number' && Number.isFinite(rawValue) && rawValue > 0) {
                memoryGiB = rawValue;
            }
        } catch (_) {
            // NOP
        }
        if (memoryGiB !== null) {
            if (memoryGiB <= 4) {
                return LOW_MEMORY_WRITE_COALESCE_TARGET_BYTES;
            }
            if (memoryGiB >= 8) {
                return HIGH_MEMORY_WRITE_COALESCE_TARGET_BYTES;
            }
        }
        return DEFAULT_WRITE_COALESCE_TARGET_BYTES;
    }

    /**
     * @param {Uint8Array[]} chunks
     * @returns {Uint8Array[]}
     */
    _coalescePendingChunks(chunks) {
        const targetBytes = this._writeCoalesceTargetBytes;
        if (chunks.length <= 1 || targetBytes <= 0) {
            return chunks;
        }
        /** @type {Uint8Array[]} */
        const result = [];
        /** @type {Uint8Array[]} */
        let group = [];
        let groupBytes = 0;
        for (const chunk of chunks) {
            const chunkBytes = chunk.byteLength;
            if (chunkBytes <= 0) { continue; }
            if (groupBytes > 0 && (groupBytes + chunkBytes > targetBytes || group.length >= WRITE_COALESCE_MAX_CHUNKS)) {
                result.push(this._mergeChunks(group, groupBytes));
                group = [];
                groupBytes = 0;
            }
            if (chunkBytes >= targetBytes) {
                if (groupBytes > 0) {
                    result.push(this._mergeChunks(group, groupBytes));
                    group = [];
                    groupBytes = 0;
                }
                result.push(chunk);
                continue;
            }
            group.push(chunk);
            groupBytes += chunkBytes;
        }
        if (groupBytes > 0) {
            result.push(this._mergeChunks(group, groupBytes));
        }
        return result;
    }

    /**
     * @param {Uint8Array[]} chunks
     * @param {number} totalBytes
     * @returns {Uint8Array}
     */
    _mergeChunks(chunks, totalBytes) {
        if (chunks.length === 1) {
            return chunks[0];
        }
        const output = new Uint8Array(totalBytes);
        let offset = 0;
        for (const chunk of chunks) {
            output.set(chunk, offset);
            offset += chunk.byteLength;
        }
        return output;
    }

    /**
     * @param {string} dictionaryName
     * @param {string} [contentDictName='raw']
     * @returns {string}
     */
    _getShardFileName(dictionaryName, contentDictName = 'raw') {
        const normalizedContentDictName = this._normalizeContentDictName(contentDictName);
        const encodedDictionaryName = encodeURIComponent(dictionaryName);
        if (normalizedContentDictName === 'raw') {
            return `${SHARD_FILE_PREFIX}${encodedDictionaryName}${SHARD_FILE_SUFFIX}`;
        }
        const encodedContentDictName = encodeURIComponent(normalizedContentDictName);
        return `${SHARD_FILE_PREFIX}${encodedDictionaryName.length}${SHARD_FILE_CONTENT_DICT_SEPARATOR}${encodedDictionaryName}${encodedContentDictName}${SHARD_FILE_SUFFIX}`;
    }

    /**
     * @param {string} dictionaryName
     * @param {string} [contentDictName='raw']
     * @param {number} [segmentIndex=0]
     * @returns {string}
     */
    _getShardSegmentFileName(dictionaryName, contentDictName = 'raw', segmentIndex = 0) {
        const baseFileName = this._getShardFileName(dictionaryName, contentDictName);
        if (segmentIndex <= 0) {
            return baseFileName;
        }
        return `${baseFileName.slice(0, -SHARD_FILE_SUFFIX.length)}${SHARD_FILE_SEGMENT_SEPARATOR}${segmentIndex}${SHARD_FILE_SUFFIX}`;
    }

    /**
     * @param {string} fileName
     * @returns {boolean}
     */
    _isShardFileName(fileName) {
        return fileName.startsWith(SHARD_FILE_PREFIX) && fileName.endsWith(SHARD_FILE_SUFFIX);
    }

    /**
     * @param {string} fileName
     * @returns {string|null}
     */
    _decodeDictionaryNameFromShardFileName(fileName) {
        if (!this._isShardFileName(fileName)) {
            return null;
        }
        return this._decodeShardInfoFromShardFileName(fileName)?.dictionaryName ?? null;
    }

    /**
     * @param {string|null|undefined} contentDictName
     * @returns {string}
     */
    _normalizeContentDictName(contentDictName) {
        return (typeof contentDictName === 'string' && contentDictName.length > 0) ? contentDictName : 'raw';
    }

    /**
     * @param {string} fileName
     * @returns {{dictionaryName: string, contentDictName: string, segmentIndex: number}|null}
     */
    _decodeShardInfoFromShardFileName(fileName) {
        if (!this._isShardFileName(fileName)) {
            return null;
        }
        let encoded = fileName.slice(SHARD_FILE_PREFIX.length, fileName.length - SHARD_FILE_SUFFIX.length);
        let segmentIndex = 0;
        const segmentSeparatorIndex = encoded.lastIndexOf(SHARD_FILE_SEGMENT_SEPARATOR);
        if (segmentSeparatorIndex > 0) {
            const segmentValue = encoded.slice(segmentSeparatorIndex + SHARD_FILE_SEGMENT_SEPARATOR.length);
            if (/^[0-9]+$/.test(segmentValue)) {
                segmentIndex = Number.parseInt(segmentValue, 10);
                encoded = encoded.slice(0, segmentSeparatorIndex);
            }
        }
        const separatorIndex = encoded.indexOf(SHARD_FILE_CONTENT_DICT_SEPARATOR);
        try {
            if (separatorIndex <= 0) {
                const dictionaryName = decodeURIComponent(encoded);
                return dictionaryName.length > 0 ? {dictionaryName, contentDictName: 'raw', segmentIndex} : null;
            }
            const dictionaryLength = Number.parseInt(encoded.slice(0, separatorIndex), 10);
            if (!Number.isFinite(dictionaryLength) || dictionaryLength < 0) {
                return null;
            }
            const payload = encoded.slice(separatorIndex + SHARD_FILE_CONTENT_DICT_SEPARATOR.length);
            if (payload.length < dictionaryLength) {
                return null;
            }
            const dictionaryName = decodeURIComponent(payload.slice(0, dictionaryLength));
            const contentDictName = decodeURIComponent(payload.slice(dictionaryLength));
            if (dictionaryName.length === 0) {
                return null;
            }
            return {
                dictionaryName,
                contentDictName: contentDictName.length > 0 ? contentDictName : 'raw',
                segmentIndex,
            };
        } catch (_) {
            return null;
        }
    }

    /**
     * @param {TermRecordShardState} state
     * @returns {void}
     */
    _setActiveAppendShardState(state) {
        const existing = this._activeAppendShardStateByKey.get(state.logicalKey);
        if (typeof existing === 'undefined' || existing.segmentIndex <= state.segmentIndex) {
            this._activeAppendShardStateByKey.set(state.logicalKey, state);
        }
    }

    /** */
    _ensureIndexesReady() {
        this._ensurePendingArtifactReloadPlansApplied();
        if (!this._indexDirty) {
            return;
        }
        this._indexByDictionary.clear();
        this._indexDirty = false;
    }

    /** */
    _ensurePendingArtifactReloadPlansApplied() {
        if (this._pendingArtifactReloadPlansAfterImport.length > 0) {
            this._reloadTouchedArtifactChunksAfterImport();
            this._reloadFromShardsAfterImport = false;
            this._reloadShardLogicalKeysAfterImport.clear();
            this._pendingArtifactReloadPlansAfterImport = [];
            this._indexDirty = true;
        }
    }

    /** */
    _rebuildIndexesFromRecords() {
        this._indexByDictionary.clear();
        for (const record of this._recordsById.values()) {
            this._addToIndex(record);
        }
        this._indexDirty = false;
    }

    /**
     * @returns {Promise<void>}
     */
    async _reloadTouchedShardsAfterImport() {
        if (this._pendingArtifactReloadPlansAfterImport.length > 0) {
            this._reloadTouchedArtifactChunksAfterImport();
            return;
        }
        if (this._reloadShardLogicalKeysAfterImport.size === 0) {
            this._indexByDictionary.clear();
            return;
        }

        for (const id of this._recordsById.keys()) {
            const record = this._recordsById.get(id);
            if (typeof record === 'undefined') { continue; }
            const logicalKey = this._getShardFileName(record.dictionary, record.entryContentDictName);
            if (this._reloadShardLogicalKeysAfterImport.has(logicalKey)) {
                this._recordsById.delete(id);
            }
        }

        this._indexByDictionary.clear();

        /** @type {TermRecordShardState[]} */
        const statesToReload = [];
        for (const state of this._shardStateByFileName.values()) {
            if (this._reloadShardLogicalKeysAfterImport.has(state.logicalKey)) {
                statesToReload.push(state);
            }
        }
        statesToReload.sort((a, b) => a.fileName.localeCompare(b.fileName));

        for (const state of statesToReload) {
            let file;
            try {
                file = await state.fileHandle.getFile();
            } catch (_) {
                continue;
            }
            state.fileLength = file.size;
            if (file.size <= 0) {
                continue;
            }
            const content = new Uint8Array(await file.arrayBuffer());
            if (!this._isBinaryFormat(content)) {
                continue;
            }
            this._loadBinary(content, this._decodeDictionaryNameFromShardFileName(state.fileName));
        }
    }

    /**
     * @returns {void}
     */
    _reloadTouchedArtifactChunksAfterImport() {
        if (this._reloadShardLogicalKeysAfterImport.size === 0) {
            this._indexByDictionary.clear();
            return;
        }

        for (const id of this._recordsById.keys()) {
            const record = this._recordsById.get(id);
            if (typeof record === 'undefined') { continue; }
            const logicalKey = this._getShardFileName(record.dictionary, record.entryContentDictName);
            if (this._reloadShardLogicalKeysAfterImport.has(logicalKey)) {
                this._recordsById.delete(id);
            }
        }

        this._indexByDictionary.clear();

        for (const plan of this._pendingArtifactReloadPlansAfterImport) {
            const {dictionary, firstId, rowCount} = plan;
            const uniformContentDictName = Array.isArray(plan.contentDictNames) ? null : (plan.contentDictNames ?? 'raw');
            for (let i = 0; i < rowCount; ++i) {
                const id = firstId + i;
                const sequenceValue = plan.sequenceList[i];
                const entryContentDictName = uniformContentDictName ?? (plan.contentDictNames[i] ?? 'raw');
                /** @type {TermRecord} */
                const record = {
                    id,
                    dictionary,
                    readingEqualsExpression: plan.readingEqualsExpressionList[i] === true || plan.readingEqualsExpressionList[i] === 1,
                    expressionBytes: plan.expressionBytesList[i],
                    readingBytes: (plan.readingEqualsExpressionList[i] === true || plan.readingEqualsExpressionList[i] === 1) ? void 0 : plan.readingBytesList[i],
                    entryContentOffset: plan.contentOffsets[i],
                    entryContentLength: plan.contentLengths[i],
                    entryContentDictName,
                    score: plan.scoreList[i] ?? 0,
                    sequence: typeof sequenceValue === 'number' && sequenceValue >= 0 ? sequenceValue : null,
                };
                this._recordsById.set(id, record);
            }
        }
    }

    /**
     * @param {TermRecord} record
     */
    _addToIndex(record) {
        let index = this._indexByDictionary.get(record.dictionary);
        if (typeof index === 'undefined') {
            index = {
                expression: new Map(),
                reading: new Map(),
                expressionReverse: new Map(),
                readingReverse: new Map(),
                pair: new Map(),
                sequence: new Map(),
            };
            this._indexByDictionary.set(record.dictionary, index);
        }
        this._addRecordToDictionaryIndex(index, record);
    }

    /**
     * @param {{expression: Map<string, number[]>, reading: Map<string, number[]>, expressionReverse: Map<string, number[]>, readingReverse: Map<string, number[]>, pair: Map<string, number[]>, sequence: Map<number, number[]>}} index
     * @param {TermRecord} record
     */
    _addRecordToDictionaryIndex(index, record) {
        this._ensureDecodedRecordStrings(record);
        const expression = record.expression ?? '';
        const reading = record.reading ?? expression;
        const expressionList = index.expression.get(expression);
        if (typeof expressionList === 'undefined') {
            index.expression.set(expression, [record.id]);
        } else {
            expressionList.push(record.id);
        }

        const readingList = index.reading.get(reading);
        if (typeof readingList === 'undefined') {
            index.reading.set(reading, [record.id]);
        } else {
            readingList.push(record.id);
        }
        if (record.expressionReverse === null || typeof record.expressionReverse === 'undefined') {
            record.expressionReverse = this._reverseString(expression);
        }
        if (record.expressionReverse !== null) {
            const expressionReverseList = index.expressionReverse.get(record.expressionReverse);
            if (typeof expressionReverseList === 'undefined') {
                index.expressionReverse.set(record.expressionReverse, [record.id]);
            } else {
                expressionReverseList.push(record.id);
            }
        }
        if (record.readingReverse === null || typeof record.readingReverse === 'undefined') {
            record.readingReverse = reading === expression ?
                record.expressionReverse :
                this._reverseString(reading);
        }
        if (record.readingReverse !== null) {
            const readingReverseList = index.readingReverse.get(record.readingReverse);
            if (typeof readingReverseList === 'undefined') {
                index.readingReverse.set(record.readingReverse, [record.id]);
            } else {
                readingReverseList.push(record.id);
            }
        }

        const pairKey = `${record.expression}\u001f${record.reading}`;
        const pairList = index.pair.get(pairKey);
        if (typeof pairList === 'undefined') {
            index.pair.set(pairKey, [record.id]);
        } else {
            pairList.push(record.id);
        }

        if (typeof record.sequence === 'number' && record.sequence >= 0) {
            const sequenceList = index.sequence.get(record.sequence);
            if (typeof sequenceList === 'undefined') {
                index.sequence.set(record.sequence, [record.id]);
            } else {
                sequenceList.push(record.id);
            }
        }
    }

    /**
     * @param {TermRecord} record
     * @returns {void}
     */
    _ensureDecodedRecordStrings(record) {
        if ((typeof record.expression !== 'string' || record.expression.length === 0) && record.expressionBytes instanceof Uint8Array && record.expressionBytes.byteLength > 0) {
            record.expression = this._decodeString(record.expressionBytes, 0, record.expressionBytes.byteLength);
        }
        if (typeof record.expression !== 'string') {
            record.expression = '';
        }
        if (typeof record.reading !== 'string' || record.reading.length === 0) {
            if (record.readingEqualsExpression === true) {
                record.reading = record.expression;
            } else if (record.readingBytes instanceof Uint8Array && record.readingBytes.byteLength > 0) {
                record.reading = this._decodeString(record.readingBytes, 0, record.readingBytes.byteLength);
            } else if (typeof record.reading !== 'string') {
                record.reading = '';
            }
        }
    }

    /**
     * @param {unknown} value
     * @param {number} fallback
     * @returns {number}
     */
    _asNumber(value, fallback) {
        if (typeof value === 'number' && Number.isFinite(value)) {
            return value;
        }
        if (typeof value === 'string' && value.length > 0) {
            const parsed = Number(value);
            if (Number.isFinite(parsed)) {
                return parsed;
            }
        }
        return fallback;
    }

    /**
     * @param {unknown} value
     * @returns {number|null}
     */
    _asNullableNumber(value) {
        if (value === null || typeof value === 'undefined') {
            return null;
        }
        return this._asNumber(value, 0);
    }

    /**
     * @param {unknown} value
     * @returns {string}
     */
    _asString(value) {
        return typeof value === 'string' ? value : '';
    }

    /**
     * @param {unknown} value
     * @returns {string|null}
     */
    _asNullableString(value) {
        if (value === null || typeof value === 'undefined') {
            return null;
        }
        return this._asString(value);
    }
}
