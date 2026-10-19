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

import {parseJson} from '../core/json.js';
import {reportDiagnostics} from '../core/diagnostics-reporter.js';
import {safePerformance} from '../core/safe-performance.js';
import {RAW_TERM_CONTENT_DICT_NAME, RAW_TERM_CONTENT_SHARED_GLOSSARY_DICT_NAME} from './raw-term-content.js';
import {encodeTermRecordsWithWasm} from './term-record-wasm-encoder.js';

const LEGACY_FILE_NAME = 'yomitan-term-records.ndjson';
const SHARD_DIRECTORY_NAME = 'yomitan-term-records';
const SHARD_FILE_PREFIX = 'dict-';
const SHARD_FILE_SUFFIX = '.mbtr';
const BINARY_MAGIC_TEXT = 'YMTRREC9';
const PREVIOUS_BINARY_MAGIC_TEXT = 'YMTRREC8';
const PREVIOUS_PREVIOUS_BINARY_MAGIC_TEXT = 'YMTRREC5';
const PREVIOUS_PREVIOUS_PREVIOUS_BINARY_MAGIC_TEXT = 'YMTRREC4';
const PREVIOUS_PREVIOUS_PREVIOUS_PREVIOUS_BINARY_MAGIC_TEXT = 'YMTRREC3';
const PREVIOUS_PREVIOUS_PREVIOUS_PREVIOUS_PREVIOUS_BINARY_MAGIC_TEXT = 'YMTRREC2';
const LEGACY_BINARY_MAGIC_TEXT = 'YMTRREC1';
const BINARY_MAGIC_BYTES = 8;
const CHUNK_HEADER_BYTES = 8;
const RECORD_HEADER_BYTES = 20;
const PREVIOUS_RECORD_HEADER_BYTES = 22;
const PREVIOUS_PREVIOUS_RECORD_HEADER_BYTES = 32;
const PREVIOUS_PREVIOUS_PREVIOUS_RECORD_HEADER_BYTES = 40;
const LEGACY_RECORD_HEADER_BYTES = 44;
const U32_NULL = 0xffffffff;
const U16_NULL = 0xffff;
const DEFAULT_FLUSH_THRESHOLD_BYTES = 32 * 1024 * 1024;
const LOW_MEMORY_FLUSH_THRESHOLD_BYTES = 16 * 1024 * 1024;
const HIGH_MEMORY_FLUSH_THRESHOLD_BYTES = 64 * 1024 * 1024;
const DEFAULT_WRITE_COALESCE_TARGET_BYTES = 4 * 1024 * 1024;
const LOW_MEMORY_WRITE_COALESCE_TARGET_BYTES = 1024 * 1024;
const HIGH_MEMORY_WRITE_COALESCE_TARGET_BYTES = 16 * 1024 * 1024;
const WRITE_COALESCE_MAX_CHUNKS = 512;
const ENTRY_CONTENT_DICT_NAME_CODE_RAW = 0;
const ENTRY_CONTENT_DICT_NAME_CODE_RAW_V2 = 1;
const ENTRY_CONTENT_DICT_NAME_CODE_RAW_V3 = 2;
const ENTRY_CONTENT_DICT_NAME_CODE_JMDICT = 3;
const ENTRY_CONTENT_DICT_NAME_CODE_CUSTOM = 0xff;
const ENTRY_CONTENT_LENGTH_U16_NULL = 0xffff;
const ENTRY_CONTENT_LENGTH_EXTENDED_U16 = 0xfffe;
const ENTRY_CONTENT_DICT_NAME_FLAG_READING_EQUALS_EXPRESSION = 0x8000;
const ENTRY_CONTENT_DICT_NAME_FLAG_READING_REVERSE_EQUALS_EXPRESSION_REVERSE = 0x40000000;
const ENTRY_CONTENT_DICT_NAME_FLAGS_MASK = 0x8000;
const ENTRY_CONTENT_DICT_NAME_VALUE_MASK = 0x7fff;

/**
 * @typedef {object} TermRecord
 * @property {number} id
 * @property {string} dictionary
 * @property {string} expression
 * @property {string} reading
 * @property {string|null} expressionReverse
 * @property {string|null} readingReverse
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
 */

export class TermRecordOpfsStore {
    constructor() {
        /** @type {FileSystemDirectoryHandle|null} */
        this._rootDirectoryHandle = null;
        /** @type {FileSystemDirectoryHandle|null} */
        this._recordsDirectoryHandle = null;
        /** @type {Map<string, TermRecordShardState>} */
        this._shardStateByFileName = new Map();
        /** @type {number} */
        this._flushThresholdBytes = this._computeFlushThresholdBytes();
        /** @type {boolean} */
        this._importSessionActive = false;
        /** @type {Map<number, TermRecord>} */
        this._recordsById = new Map();
        /** @type {number} */
        this._nextId = 1;
        /** @type {Map<string, {expression: Map<string, number[]>, reading: Map<string, number[]>, expressionReverse: Map<string, number[]>, readingReverse: Map<string, number[]>, pair: Map<string, number[]>, sequence: Map<number, number[]>}>} */
        this._indexByDictionary = new Map();
        /** @type {boolean} */
        this._deferIndexBuild = false;
        /** @type {boolean} */
        this._indexDirty = false;
        /** @type {TextEncoder} */
        this._textEncoder = new TextEncoder();
        /** @type {TextDecoder} */
        this._textDecoder = new TextDecoder();
        /** @type {boolean} */
        this._wasmEncoderUnavailable = false;
        /** @type {string[]} */
        this._invalidShardFileNames = [];
        /** @type {number} */
        this._writeCoalesceTargetBytes = this._computeWriteCoalesceTargetBytes();
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
        this._rootDirectoryHandle = null;
        this._recordsDirectoryHandle = null;
        this._shardStateByFileName.clear();
        this._invalidShardFileNames = [];
        if (typeof navigator === 'undefined' || !('storage' in navigator) || !('getDirectory' in navigator.storage)) {
            return;
        }
        const rootDirectoryHandle = await navigator.storage.getDirectory();
        this._rootDirectoryHandle = rootDirectoryHandle;
        this._recordsDirectoryHandle = await rootDirectoryHandle.getDirectoryHandle(SHARD_DIRECTORY_NAME, {create: true});

        const shardFileCount = await this._loadShardFiles();
        await (shardFileCount === 0 ? this._migrateLegacyMonolithicIfPresent() : this._deleteLegacyMonolithicIfPresent());
        await this.verifyIntegrity();
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
        this._indexByDictionary.clear();
        for (const state of this._shardStateByFileName.values()) {
            state.pendingWriteBytes = 0;
            state.pendingWriteChunks = [];
        }
    }

    /**
     * @returns {Promise<void>}
     */
    async endImportSession() {
        if (!this._importSessionActive && !this._hasPendingShardWrites()) {
            return;
        }
        this._importSessionActive = false;
        await this._flushPendingWrites();
        await this._closeAllWritables();
        this._deferIndexBuild = false;
        if (this._indexDirty) {
            this._indexByDictionary.clear();
            this._indexDirty = false;
        }
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
        return this._recordsById.size;
    }

    /**
     * @returns {boolean}
     */
    isEmpty() {
        return this._recordsById.size === 0;
    }

    /**
     * @param {{dictionary: string, expression: string, reading: string, expressionReverse: string|null, readingReverse: string|null, entryContentOffset: number, entryContentLength: number, entryContentDictName: string|null, score: number, sequence: number|null}[]} records
     * @returns {Promise<void>}
     */
    async appendBatch(records) {
        if (records.length === 0) { return; }
        /** @type {Map<string, TermRecord[]>} */
        const recordsByDictionary = new Map();
        for (const row of records) {
            const id = this._nextId++;
            const record = {
                id,
                dictionary: row.dictionary,
                expression: row.expression,
                reading: row.reading,
                expressionReverse: row.expressionReverse,
                readingReverse: row.readingReverse,
                entryContentOffset: row.entryContentOffset,
                entryContentLength: row.entryContentLength,
                entryContentDictName: row.entryContentDictName ?? 'raw',
                score: row.score,
                sequence: row.sequence,
            };
            this._recordsById.set(id, record);
            const dictionaryRecords = recordsByDictionary.get(record.dictionary);
            if (typeof dictionaryRecords === 'undefined') {
                recordsByDictionary.set(record.dictionary, [record]);
            } else {
                dictionaryRecords.push(record);
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
        for (const [dictionaryName, dictionaryRecords] of recordsByDictionary) {
            const state = await this._getOrCreateShardState(dictionaryName);
            if (state === null) { continue; }
            await this._appendEncodedChunk(state, await this._encodeRecords(dictionaryRecords), dictionaryRecords[0]?.id ?? 0, dictionaryRecords.length);
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
        let recordsByDictionary = null;
        /** @type {TermRecord[]} */
        const singleDictionaryRecords = [];
        let singleDictionaryName = '';
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
            if (i === start) {
                singleDictionaryName = dictionary;
            }
            if (recordsByDictionary === null) {
                if (dictionary === singleDictionaryName) {
                    singleDictionaryRecords.push(record);
                } else {
                    recordsByDictionary = new Map();
                    recordsByDictionary.set(singleDictionaryName, singleDictionaryRecords);
                    recordsByDictionary.set(dictionary, [record]);
                }
            } else {
                let dictionaryRecords = recordsByDictionary.get(dictionary);
                if (typeof dictionaryRecords === 'undefined') {
                    dictionaryRecords = [];
                    recordsByDictionary.set(dictionary, dictionaryRecords);
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
        if (recordsByDictionary === null) {
            const state = await this._getOrCreateShardState(singleDictionaryName);
            if (state !== null) {
                await this._appendEncodedChunk(state, await this._encodeRecords(singleDictionaryRecords), singleDictionaryRecords[0]?.id ?? 0, singleDictionaryRecords.length);
            }
            return;
        }
        for (const [dictionaryName, dictionaryRecords] of recordsByDictionary) {
            const state = await this._getOrCreateShardState(dictionaryName);
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
     * @returns {Promise<{buildRecordsMs: number, encodeMs: number, appendWriteMs: number}>}
     */
    async appendBatchFromResolvedImportTermEntries(rows, start, count, contentOffsets, contentLengths, contentDictNames) {
        if (count <= 0) { return {buildRecordsMs: 0, encodeMs: 0, appendWriteMs: 0}; }
        if (contentOffsets.length < (start + count) || contentLengths.length < (start + count) || contentDictNames.length < (start + count)) {
            throw new Error('appendBatchFromResolvedImportTermEntries content refs length is smaller than row count');
        }
        const tBuildStart = safePerformance.now();
        let buildRecordsMs = 0;
        let encodeMs = 0;
        let appendWriteMs = 0;
        /** @type {Map<string, TermRecord[]>|null} */
        let recordsByDictionary = null;
        /** @type {TermRecord[]} */
        const singleDictionaryRecords = new Array(count);
        let singleDictionaryRecordCount = 0;
        let singleDictionaryName = '';
        for (let i = start, ii = start + count; i < ii; ++i) {
            const row = /** @type {{dictionary: string, expression: string, reading: string, expressionReverse?: string, readingReverse?: string, score: number, sequence?: number}} */ (rows[i]);
            const id = this._nextId++;
            const dictionary = row.dictionary;
            /** @type {TermRecord} */
            const record = {
                id,
                dictionary,
                expression: row.expression,
                reading: row.reading,
                expressionReverse: row.expressionReverse ?? null,
                readingReverse: row.readingReverse ?? null,
                entryContentOffset: contentOffsets[i],
                entryContentLength: contentLengths[i],
                entryContentDictName: contentDictNames[i] ?? 'raw',
                score: row.score,
                sequence: typeof row.sequence === 'number' ? row.sequence : null,
            };
            this._recordsById.set(id, record);
            if (i === start) {
                singleDictionaryName = dictionary;
            }
            if (recordsByDictionary === null) {
                if (dictionary === singleDictionaryName) {
                    singleDictionaryRecords[singleDictionaryRecordCount++] = record;
                } else {
                    recordsByDictionary = new Map();
                    recordsByDictionary.set(singleDictionaryName, singleDictionaryRecords.slice(0, singleDictionaryRecordCount));
                    recordsByDictionary.set(dictionary, [record]);
                }
            } else {
                let dictionaryRecords = recordsByDictionary.get(dictionary);
                if (typeof dictionaryRecords === 'undefined') {
                    dictionaryRecords = [];
                    recordsByDictionary.set(dictionary, dictionaryRecords);
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
        if (recordsByDictionary === null) {
            const state = await this._getOrCreateShardState(singleDictionaryName);
            if (state !== null) {
                const metrics = await this._encodeAndAppendChunkForState(state, singleDictionaryRecords);
                encodeMs += metrics.encodeMs;
                appendWriteMs += metrics.appendWriteMs;
            }
            return {buildRecordsMs, encodeMs, appendWriteMs};
        }
        for (const [dictionaryName, dictionaryRecords] of recordsByDictionary) {
            const state = await this._getOrCreateShardState(dictionaryName);
            if (state === null) { continue; }
            const metrics = await this._encodeAndAppendChunkForState(state, dictionaryRecords);
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
        let recordsByDictionary = null;
        /** @type {TermRecord[]} */
        const singleDictionaryRecords = [];
        let singleDictionaryName = '';
        for (let i = 0; i < count; ++i) {
            const row = /** @type {{dictionary: string, expression: string, reading: string, expressionReverse?: string, readingReverse?: string, score: number, sequence?: number}} */ (rows[start + i]);
            const span = spans[i];
            const id = this._nextId++;
            const dictionary = row.dictionary;
            /** @type {TermRecord} */
            const record = {
                id,
                dictionary,
                expression: row.expression,
                reading: row.reading,
                expressionReverse: row.expressionReverse ?? null,
                readingReverse: row.readingReverse ?? null,
                entryContentOffset: span.offset,
                entryContentLength: span.length,
                entryContentDictName: 'raw',
                score: row.score,
                sequence: typeof row.sequence === 'number' ? row.sequence : null,
            };
            this._recordsById.set(id, record);
            if (i === 0) {
                singleDictionaryName = dictionary;
            }
            if (recordsByDictionary === null) {
                if (dictionary === singleDictionaryName) {
                    singleDictionaryRecords.push(record);
                } else {
                    recordsByDictionary = new Map();
                    recordsByDictionary.set(singleDictionaryName, singleDictionaryRecords);
                    recordsByDictionary.set(dictionary, [record]);
                }
            } else {
                let dictionaryRecords = recordsByDictionary.get(dictionary);
                if (typeof dictionaryRecords === 'undefined') {
                    dictionaryRecords = [];
                    recordsByDictionary.set(dictionary, dictionaryRecords);
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
        if (recordsByDictionary === null) {
            const state = await this._getOrCreateShardState(singleDictionaryName);
            if (state !== null) {
                await this._encodeAndAppendChunkForState(state, singleDictionaryRecords);
            }
            return;
        }
        for (const [dictionaryName, dictionaryRecords] of recordsByDictionary) {
            const state = await this._getOrCreateShardState(dictionaryName);
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
        let recordsByDictionary = null;
        /** @type {TermRecord[]} */
        const singleDictionaryRecords = new Array(count);
        let singleDictionaryRecordCount = 0;
        let firstDictionaryName = '';
        for (let i = 0; i < count; ++i) {
            const row = /** @type {{dictionary: string, expression: string, reading: string, expressionReverse?: string, readingReverse?: string, score: number, sequence?: number}} */ (rows[start + i]);
            const id = this._nextId++;
            const dictionary = row.dictionary;
            /** @type {TermRecord} */
            const record = {
                id,
                dictionary,
                expression: row.expression,
                reading: row.reading,
                expressionReverse: row.expressionReverse ?? null,
                readingReverse: row.readingReverse ?? null,
                entryContentOffset: contentOffsets[i],
                entryContentLength: contentLengths[i],
                entryContentDictName: contentDictName ?? 'raw',
                score: row.score,
                sequence: typeof row.sequence === 'number' ? row.sequence : null,
            };
            this._recordsById.set(id, record);
            if (i === 0) {
                firstDictionaryName = dictionary;
            }
            if (recordsByDictionary === null) {
                if (dictionary === firstDictionaryName) {
                    singleDictionaryRecords[singleDictionaryRecordCount++] = record;
                } else {
                    recordsByDictionary = new Map();
                    recordsByDictionary.set(firstDictionaryName, singleDictionaryRecords.slice(0, singleDictionaryRecordCount));
                    recordsByDictionary.set(dictionary, [record]);
                }
            } else {
                let dictionaryRecords = recordsByDictionary.get(dictionary);
                if (typeof dictionaryRecords === 'undefined') {
                    dictionaryRecords = [];
                    recordsByDictionary.set(dictionary, dictionaryRecords);
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
        if (recordsByDictionary === null) {
            const state = await this._getOrCreateShardState(firstDictionaryName);
            if (state !== null) {
                const metrics = await this._encodeAndAppendChunkForState(state, singleDictionaryRecords);
                encodeMs += metrics.encodeMs;
                appendWriteMs += metrics.appendWriteMs;
            }
            return {buildRecordsMs, encodeMs, appendWriteMs};
        }
        for (const [dictionaryName, dictionaryRecords] of recordsByDictionary) {
            const state = await this._getOrCreateShardState(dictionaryName);
            if (state === null) { continue; }
            const metrics = await this._encodeAndAppendChunkForState(state, dictionaryRecords);
            encodeMs += metrics.encodeMs;
            appendWriteMs += metrics.appendWriteMs;
        }
        return {buildRecordsMs, encodeMs, appendWriteMs};
    }

    /**
     * @param {TermRecordShardState} state
     * @param {TermRecord[]} records
     * @returns {Promise<{encodeMs: number, appendWriteMs: number}>}
     */
    async _encodeAndAppendChunkForState(state, records) {
        const tEncodeStart = safePerformance.now();
        const chunk = await this._encodeRecords(records);
        const encodeMs = safePerformance.now() - tEncodeStart;
        const tAppendStart = safePerformance.now();
        await this._appendEncodedChunk(state, chunk, records[0]?.id ?? 0, records.length);
        const appendWriteMs = safePerformance.now() - tAppendStart;
        return {encodeMs, appendWriteMs};
    }

    /**
     * @param {string} dictionaryName
     * @returns {Promise<number>}
     */
    async deleteByDictionary(dictionaryName) {
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
     * @param {Iterable<number>} ids
     * @returns {Map<number, TermRecord>}
     */
    getByIds(ids) {
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
        return [...this._recordsById.keys()].sort((a, b) => a - b);
    }

    /**
     * @param {string} dictionaryName
     * @returns {{expression: Map<string, number[]>, reading: Map<string, number[]>, expressionReverse: Map<string, number[]>, readingReverse: Map<string, number[]>, pair: Map<string, number[]>, sequence: Map<number, number[]>}}
     */
    getDictionaryIndex(dictionaryName) {
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
        return this._recordsById.get(id);
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
        /** @type {Set<string>} */
        const expectedFileNames = new Set();
        /** @type {Set<string>} */
        const expectedFileNamesFromRecords = new Set();
        for (const record of this._recordsById.values()) {
            const fileName = this._getShardFileName(record.dictionary);
            expectedFileNames.add(fileName);
            expectedFileNamesFromRecords.add(fileName);
        }
        if (Array.isArray(expectedDictionaryNames)) {
            for (const dictionaryName of expectedDictionaryNames) {
                if (typeof dictionaryName !== 'string' || dictionaryName.length === 0) { continue; }
                expectedFileNames.add(this._getShardFileName(dictionaryName));
            }
        }

        /** @type {string[]} */
        const missingShardFileNames = [];
        /** @type {string[]} */
        const orphanShardFileNames = [];
        for (const fileName of expectedFileNames) {
            if (!this._shardStateByFileName.has(fileName)) {
                missingShardFileNames.push(fileName);
            }
        }
        for (const fileName of this._shardStateByFileName.keys()) {
            if (!expectedFileNames.has(fileName)) {
                orphanShardFileNames.push(fileName);
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
            if (expectedFileNamesFromRecords.has(fileName)) {
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
            expectedShardCount: expectedFileNames.size,
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
        let recordHeaderBytes;
        if (isLegacy) {
            recordHeaderBytes = LEGACY_RECORD_HEADER_BYTES;
        } else if (isCurrent) {
            recordHeaderBytes = RECORD_HEADER_BYTES;
        } else if (isPrevious) {
            recordHeaderBytes = PREVIOUS_RECORD_HEADER_BYTES;
        } else if (isPreviousPrevious) {
            recordHeaderBytes = PREVIOUS_PREVIOUS_RECORD_HEADER_BYTES;
        } else {
            recordHeaderBytes = PREVIOUS_PREVIOUS_PREVIOUS_RECORD_HEADER_BYTES;
        }
        let cursor = BINARY_MAGIC_BYTES;
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
            for (let chunkIndex = 0; chunkIndex < chunkCount; ++chunkIndex) {
                if ((cursor + recordHeaderBytes) > content.byteLength) { return; }
                const id = isCurrent ? (chunkBaseId + chunkIndex) : view.getUint32(cursor, true);
                if (!isCurrent) { cursor += 4; }
                const dictionaryLength = isLegacy ? view.getUint32(cursor, true) : 0; cursor += isLegacy ? 4 : 0;
                const expressionLength = (isCurrent || isPrevious) ? view.getUint16(cursor, true) : view.getUint32(cursor, true); cursor += (isCurrent || isPrevious) ? 2 : 4;
                const readingLength = (isCurrent || isPrevious) ? view.getUint16(cursor, true) : view.getUint32(cursor, true); cursor += (isCurrent || isPrevious) ? 2 : 4;
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
                const entryContentDictNameMeta16 = isCurrent ? view.getUint16(cursor, true) : view.getUint32(cursor, true); cursor += isCurrent ? 2 : 4;
                const entryContentDictNameMeta = (isCurrent && entryContentDictNameMeta16 === U16_NULL) ? view.getUint32(cursor, true) : entryContentDictNameMeta16;
                if (isCurrent && entryContentDictNameMeta16 === U16_NULL) { cursor += 4; }
                const entryContentDictNameFlags = (isCurrent || isPrevious) ? (entryContentDictNameMeta & ENTRY_CONTENT_DICT_NAME_FLAGS_MASK) : 0;
                const entryContentDictNameValue = (isCurrent || isPrevious) ? (entryContentDictNameMeta & ENTRY_CONTENT_DICT_NAME_VALUE_MASK) : entryContentDictNameMeta;
                const score = view.getInt32(cursor, true); cursor += 4;
                const rawSequence = view.getInt32(cursor, true); cursor += 4;
                let entryContentDictNameLength = 0;
                if (isLegacy || isPrevious || isPreviousPrevious || isPreviousPreviousPrevious || isPreviousPreviousPreviousPrevious || isPreviousPreviousPreviousPreviousPrevious) {
                    entryContentDictNameLength = entryContentDictNameMeta;
                } else if ((entryContentDictNameValue & 0xff) === ENTRY_CONTENT_DICT_NAME_CODE_CUSTOM) {
                    entryContentDictNameLength = entryContentDictNameValue >>> 8;
                }

                const requiredBytes =
                dictionaryLength +
                expressionLength +
                readingLength +
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
                const expression = this._decodeString(content, cursor, expressionLength); cursor += expressionLength;
                const reading = (
                (isCurrent || isPrevious) && (entryContentDictNameFlags & ENTRY_CONTENT_DICT_NAME_FLAG_READING_EQUALS_EXPRESSION) !== 0 ?
                    expression :
                    this._decodeString(content, cursor, readingLength)
                );
                if (!((isCurrent || isPrevious) && (entryContentDictNameFlags & ENTRY_CONTENT_DICT_NAME_FLAG_READING_EQUALS_EXPRESSION) !== 0)) {
                    cursor += readingLength;
                }
                let expressionReverse;
                let readingReverse;
                if (isCurrent || isPrevious) {
                    expressionReverse = this._reverseString(expression);
                    readingReverse = reading === expression ? expressionReverse : this._reverseString(reading);
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
                const entryContentDictName = (isLegacy || isPrevious || isPreviousPrevious || isPreviousPreviousPrevious || isPreviousPreviousPreviousPrevious || isPreviousPreviousPreviousPreviousPrevious) ?
                this._decodeString(content, cursor, entryContentDictNameLength) :
                this._decodeEntryContentDictName(entryContentDictNameValue, content, cursor, entryContentDictNameLength);
                cursor += entryContentDictNameLength;

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
     * @returns {Promise<Uint8Array>}
     */
    async _encodeRecords(records) {
        if (records.length === 0) {
            return new Uint8Array(0);
        }
        if (!this._wasmEncoderUnavailable) {
            try {
                const encoded = await encodeTermRecordsWithWasm(records, this._textEncoder);
                if (encoded instanceof Uint8Array) {
                    return encoded;
                }
            } catch (_) {
                this._wasmEncoderUnavailable = true;
            }
        }
        /** @type {Array<{record: TermRecord, expressionBytes: Uint8Array, readingBytes: Uint8Array, entryContentDictNameMeta: number, entryContentDictNameBytes: Uint8Array|null}>} */
        const encodedRows = [];
        let totalBytes = 0;
        for (const record of records) {
            const expressionBytes = this._textEncoder.encode(record.expression);
            const readingBytes = this._textEncoder.encode(record.reading);
            const {meta: entryContentDictNameMeta, bytes: entryContentDictNameBytes} = this._encodeEntryContentDictNameMeta(record.entryContentDictName);
            totalBytes +=
                RECORD_HEADER_BYTES +
                expressionBytes.byteLength +
                readingBytes.byteLength +
                (entryContentDictNameBytes?.byteLength ?? 0) +
                (((entryContentDictNameMeta & ~ENTRY_CONTENT_DICT_NAME_FLAGS_MASK) <= ENTRY_CONTENT_DICT_NAME_VALUE_MASK) ? 0 : 4) +
                ((record.entryContentLength >= 0 && record.entryContentLength > 0xfffd) ? 4 : 0);
            encodedRows.push({
                record,
                expressionBytes,
                readingBytes,
                entryContentDictNameMeta,
                entryContentDictNameBytes,
            });
        }

        const output = new Uint8Array(totalBytes);
        const view = new DataView(output.buffer, output.byteOffset, output.byteLength);
        let cursor = 0;
        for (const row of encodedRows) {
            const {record, expressionBytes, readingBytes, entryContentDictNameMeta, entryContentDictNameBytes} = row;
            view.setUint16(cursor, expressionBytes.byteLength, true); cursor += 2;
            view.setUint16(cursor, readingBytes.byteLength, true); cursor += 2;
            view.setUint32(cursor, record.entryContentOffset >= 0 ? record.entryContentOffset : U32_NULL, true); cursor += 4;
            if (record.entryContentLength < 0) {
                view.setUint16(cursor, ENTRY_CONTENT_LENGTH_U16_NULL, true); cursor += 2;
            } else if (record.entryContentLength <= 0xfffd) {
                view.setUint16(cursor, record.entryContentLength, true); cursor += 2;
            } else {
                view.setUint16(cursor, ENTRY_CONTENT_LENGTH_EXTENDED_U16, true); cursor += 2;
                view.setUint32(cursor, record.entryContentLength, true); cursor += 4;
            }
            if ((entryContentDictNameMeta & ~ENTRY_CONTENT_DICT_NAME_FLAGS_MASK) <= ENTRY_CONTENT_DICT_NAME_VALUE_MASK) {
                view.setUint16(cursor, entryContentDictNameMeta, true); cursor += 2;
            } else {
                view.setUint16(cursor, U16_NULL, true); cursor += 2;
                view.setUint32(cursor, entryContentDictNameMeta, true); cursor += 4;
            }
            view.setInt32(cursor, record.score, true); cursor += 4;
            view.setInt32(cursor, record.sequence ?? -1, true); cursor += 4;

            output.set(expressionBytes, cursor); cursor += expressionBytes.byteLength;
            output.set(readingBytes, cursor); cursor += readingBytes.byteLength;
            if (entryContentDictNameBytes !== null) {
                output.set(entryContentDictNameBytes, cursor);
                cursor += entryContentDictNameBytes.byteLength;
            }
        }
        return output;
    }

    /**
     * @param {TermRecordShardState} state
     * @param {Uint8Array} chunk
     * @param {number} firstId
     * @param {number} count
     * @returns {Promise<void>}
     */
    async _appendEncodedChunk(state, chunk, firstId, count) {
        if (chunk.byteLength <= 0) { return; }

        const withHeader = state.fileLength === 0 ?
            this._withBinaryHeader(this._withChunkHeader(chunk, firstId, count)) :
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
     * @returns {Uint8Array}
     */
    _withBinaryHeader(payload) {
        const header = this._textEncoder.encode(BINARY_MAGIC_TEXT);
        const output = new Uint8Array(header.byteLength + payload.byteLength);
        output.set(header, 0);
        output.set(payload, header.byteLength);
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
    async _closeAllWritables() {
        for (const state of this._shardStateByFileName.values()) {
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
        } finally {
            state.writable = null;
        }
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

        const existingShardFileNames = await this._listShardFileNames();
        for (const fileName of existingShardFileNames) {
            try {
                await this._recordsDirectoryHandle.removeEntry(fileName);
            } catch (_) {
                // NOP
            }
        }

        /** @type {Map<string, TermRecord[]>} */
        const recordsByDictionary = new Map();
        const orderedRecords = [...this._recordsById.values()].sort((a, b) => a.id - b.id);
        for (const record of orderedRecords) {
            const list = recordsByDictionary.get(record.dictionary);
            if (typeof list === 'undefined') {
                recordsByDictionary.set(record.dictionary, [record]);
            } else {
                list.push(record);
            }
        }

        for (const [dictionaryName, records] of recordsByDictionary) {
            const payload = await this._encodeRecords(records);
            const fileName = this._getShardFileName(dictionaryName);
            const fileHandle = await this._recordsDirectoryHandle.getFileHandle(fileName, {create: true});
            const writable = await fileHandle.createWritable();
            await writable.truncate(0);
            let fileLength = 0;
            if (payload.byteLength > 0) {
                const output = this._withBinaryHeader(payload);
                await writable.write(output);
                fileLength = output.byteLength;
            }
            await writable.close();
            this._shardStateByFileName.set(fileName, this._createShardState(fileName, fileHandle, fileLength));
        }
    }

    /**
     * @returns {Promise<number>}
     */
    async _loadShardFiles() {
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
            const state = this._createShardState(name, fileHandle, file.size);
            this._shardStateByFileName.set(name, state);
            if (file.size <= 0) {
                continue;
            }
            const arrayBuffer = await file.arrayBuffer();
            const content = new Uint8Array(arrayBuffer);
            if (this._isBinaryFormat(content)) {
                this._loadBinary(content, this._decodeDictionaryNameFromShardFileName(name));
                continue;
            }
            // Invalid shard payloads are discarded so they cannot poison future reads.
            this._invalidShardFileNames.push(name);
            this._shardStateByFileName.delete(name);
            if (this._recordsDirectoryHandle !== null) {
                try {
                    await this._recordsDirectoryHandle.removeEntry(name);
                } catch (_) {
                    // NOP
                }
            }
        }
        return shardFileCount;
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
     * @returns {Promise<TermRecordShardState|null>}
     */
    async _getOrCreateShardState(dictionaryName) {
        if (this._recordsDirectoryHandle === null) {
            return null;
        }
        const fileName = this._getShardFileName(dictionaryName);
        const existing = this._shardStateByFileName.get(fileName);
        if (typeof existing !== 'undefined') {
            return existing;
        }
        const fileHandle = await this._recordsDirectoryHandle.getFileHandle(fileName, {create: true});
        const file = await fileHandle.getFile();
        const created = this._createShardState(fileName, fileHandle, file.size);
        this._shardStateByFileName.set(fileName, created);
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
        for (const chunk of chunks) {
            if (chunk.byteLength <= 0) { continue; }
            await state.writable.write(chunk);
        }
    }

    /**
     * @param {string} dictionaryName
     * @returns {Promise<void>}
     */
    async _deleteShardByDictionary(dictionaryName) {
        if (this._recordsDirectoryHandle === null) {
            return;
        }
        const fileName = this._getShardFileName(dictionaryName);
        const state = this._shardStateByFileName.get(fileName);
        if (typeof state !== 'undefined') {
            await this._flushPendingWritesForShard(state);
            await this._closeShardWritable(state);
            this._shardStateByFileName.delete(fileName);
        }
        try {
            await this._recordsDirectoryHandle.removeEntry(fileName);
        } catch (_) {
            // NOP
        }
    }

    /**
     * @param {string} fileName
     * @param {FileSystemFileHandle} fileHandle
     * @param {number} fileLength
     * @returns {TermRecordShardState}
     */
    _createShardState(fileName, fileHandle, fileLength) {
        return {
            fileName,
            fileHandle,
            writable: null,
            fileLength,
            pendingWriteBytes: 0,
            pendingWriteChunks: [],
        };
    }

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
     * @returns {string}
     */
    _getShardFileName(dictionaryName) {
        return `${SHARD_FILE_PREFIX}${encodeURIComponent(dictionaryName)}${SHARD_FILE_SUFFIX}`;
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
        const encoded = fileName.slice(SHARD_FILE_PREFIX.length, fileName.length - SHARD_FILE_SUFFIX.length);
        try {
            const decoded = decodeURIComponent(encoded);
            return decoded.length > 0 ? decoded : null;
        } catch (_) {
            return null;
        }
    }

    /** */
    _ensureIndexesReady() {
        if (!this._indexDirty) {
            return;
        }
        this._indexByDictionary.clear();
        this._indexDirty = false;
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
        const expressionList = index.expression.get(record.expression);
        if (typeof expressionList === 'undefined') {
            index.expression.set(record.expression, [record.id]);
        } else {
            expressionList.push(record.id);
        }

        const readingList = index.reading.get(record.reading);
        if (typeof readingList === 'undefined') {
            index.reading.set(record.reading, [record.id]);
        } else {
            readingList.push(record.id);
        }
        if (record.expressionReverse !== null) {
            const expressionReverseList = index.expressionReverse.get(record.expressionReverse);
            if (typeof expressionReverseList === 'undefined') {
                index.expressionReverse.set(record.expressionReverse, [record.id]);
            } else {
                expressionReverseList.push(record.id);
            }
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
