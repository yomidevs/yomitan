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
import {encodeTermRecordsWithWasm} from './term-record-wasm-encoder.js';

const LEGACY_FILE_NAME = 'manabitan-term-records.ndjson';
const SHARD_DIRECTORY_NAME = 'manabitan-term-records';
const SHARD_FILE_PREFIX = 'dict-';
const SHARD_FILE_SUFFIX = '.mbtr';
const BINARY_MAGIC_TEXT = 'MBTRREC1';
const BINARY_MAGIC_BYTES = 8;
const RECORD_HEADER_BYTES = 44;
const U32_NULL = 0xffffffff;

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
        this._flushThresholdBytes = 16 * 1024 * 1024;
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
            await this._appendEncodedChunk(state, await this._encodeRecords(dictionaryRecords));
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
        /** @type {Map<string, TermRecord[]>} */
        const recordsByDictionary = new Map();
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
            let dictionaryRecords = recordsByDictionary.get(dictionary);
            if (typeof dictionaryRecords === 'undefined') {
                dictionaryRecords = [];
                recordsByDictionary.set(dictionary, dictionaryRecords);
            }
            dictionaryRecords.push(record);
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
        for (const [dictionaryName, dictionaryRecords] of recordsByDictionary) {
            const state = await this._getOrCreateShardState(dictionaryName);
            if (state === null) { continue; }
            await this._appendEncodedChunk(state, await this._encodeRecords(dictionaryRecords));
        }
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
                await this._appendEncodedChunk(state, await this._encodeRecords(singleDictionaryRecords));
            }
            return;
        }
        for (const [dictionaryName, dictionaryRecords] of recordsByDictionary) {
            const state = await this._getOrCreateShardState(dictionaryName);
            if (state === null) { continue; }
            await this._appendEncodedChunk(state, await this._encodeRecords(dictionaryRecords));
        }
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
            return existing;
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
        this._indexByDictionary.set(dictionaryName, created);
        return created;
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
        return magic === BINARY_MAGIC_TEXT;
    }

    /**
     * @param {Uint8Array} content
     */
    _loadBinary(content) {
        const view = new DataView(content.buffer, content.byteOffset, content.byteLength);
        let cursor = BINARY_MAGIC_BYTES;
        while ((cursor + RECORD_HEADER_BYTES) <= content.byteLength) {
            const id = view.getUint32(cursor, true); cursor += 4;
            const dictionaryLength = view.getUint32(cursor, true); cursor += 4;
            const expressionLength = view.getUint32(cursor, true); cursor += 4;
            const readingLength = view.getUint32(cursor, true); cursor += 4;
            const expressionReverseLength = view.getInt32(cursor, true); cursor += 4;
            const readingReverseLength = view.getInt32(cursor, true); cursor += 4;
            const rawEntryContentOffset = view.getUint32(cursor, true); cursor += 4;
            const rawEntryContentLength = view.getUint32(cursor, true); cursor += 4;
            const entryContentDictNameLength = view.getUint32(cursor, true); cursor += 4;
            const score = view.getInt32(cursor, true); cursor += 4;
            const rawSequence = view.getInt32(cursor, true); cursor += 4;

            const requiredBytes =
                dictionaryLength +
                expressionLength +
                readingLength +
                Math.max(0, expressionReverseLength) +
                Math.max(0, readingReverseLength) +
                entryContentDictNameLength;
            if ((cursor + requiredBytes) > content.byteLength || id <= 0) {
                break;
            }

            const dictionary = this._decodeString(content, cursor, dictionaryLength); cursor += dictionaryLength;
            const expression = this._decodeString(content, cursor, expressionLength); cursor += expressionLength;
            const reading = this._decodeString(content, cursor, readingLength); cursor += readingLength;
            const expressionReverse = expressionReverseLength >= 0 ? this._decodeString(content, cursor, expressionReverseLength) : null;
            if (expressionReverseLength >= 0) { cursor += expressionReverseLength; }
            const readingReverse = readingReverseLength >= 0 ? this._decodeString(content, cursor, readingReverseLength) : null;
            if (readingReverseLength >= 0) { cursor += readingReverseLength; }
            const entryContentDictName = this._decodeString(content, cursor, entryContentDictNameLength); cursor += entryContentDictNameLength;

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
        /** @type {Array<{record: TermRecord, dictionaryBytes: Uint8Array, expressionBytes: Uint8Array, readingBytes: Uint8Array, expressionReverseBytes: Uint8Array|null, readingReverseBytes: Uint8Array|null, entryContentDictNameBytes: Uint8Array}>} */
        const encodedRows = [];
        let totalBytes = 0;
        for (const record of records) {
            const dictionaryBytes = this._textEncoder.encode(record.dictionary);
            const expressionBytes = this._textEncoder.encode(record.expression);
            const readingBytes = this._textEncoder.encode(record.reading);
            const expressionReverseBytes = record.expressionReverse !== null ? this._textEncoder.encode(record.expressionReverse) : null;
            const readingReverseBytes = record.readingReverse !== null ? this._textEncoder.encode(record.readingReverse) : null;
            const entryContentDictNameBytes = this._textEncoder.encode(record.entryContentDictName);
            totalBytes +=
                RECORD_HEADER_BYTES +
                dictionaryBytes.byteLength +
                expressionBytes.byteLength +
                readingBytes.byteLength +
                (expressionReverseBytes?.byteLength ?? 0) +
                (readingReverseBytes?.byteLength ?? 0) +
                entryContentDictNameBytes.byteLength;
            encodedRows.push({
                record,
                dictionaryBytes,
                expressionBytes,
                readingBytes,
                expressionReverseBytes,
                readingReverseBytes,
                entryContentDictNameBytes,
            });
        }

        const output = new Uint8Array(totalBytes);
        const view = new DataView(output.buffer, output.byteOffset, output.byteLength);
        let cursor = 0;
        for (const row of encodedRows) {
            const {record, dictionaryBytes, expressionBytes, readingBytes, expressionReverseBytes, readingReverseBytes, entryContentDictNameBytes} = row;
            view.setUint32(cursor, record.id, true); cursor += 4;
            view.setUint32(cursor, dictionaryBytes.byteLength, true); cursor += 4;
            view.setUint32(cursor, expressionBytes.byteLength, true); cursor += 4;
            view.setUint32(cursor, readingBytes.byteLength, true); cursor += 4;
            view.setInt32(cursor, expressionReverseBytes?.byteLength ?? -1, true); cursor += 4;
            view.setInt32(cursor, readingReverseBytes?.byteLength ?? -1, true); cursor += 4;
            view.setUint32(cursor, record.entryContentOffset >= 0 ? record.entryContentOffset : U32_NULL, true); cursor += 4;
            view.setUint32(cursor, record.entryContentLength >= 0 ? record.entryContentLength : U32_NULL, true); cursor += 4;
            view.setUint32(cursor, entryContentDictNameBytes.byteLength, true); cursor += 4;
            view.setInt32(cursor, record.score, true); cursor += 4;
            view.setInt32(cursor, record.sequence ?? -1, true); cursor += 4;

            output.set(dictionaryBytes, cursor); cursor += dictionaryBytes.byteLength;
            output.set(expressionBytes, cursor); cursor += expressionBytes.byteLength;
            output.set(readingBytes, cursor); cursor += readingBytes.byteLength;
            if (expressionReverseBytes !== null) {
                output.set(expressionReverseBytes, cursor);
                cursor += expressionReverseBytes.byteLength;
            }
            if (readingReverseBytes !== null) {
                output.set(readingReverseBytes, cursor);
                cursor += readingReverseBytes.byteLength;
            }
            output.set(entryContentDictNameBytes, cursor); cursor += entryContentDictNameBytes.byteLength;
        }
        return output;
    }

    /**
     * @param {TermRecordShardState} state
     * @param {Uint8Array} chunk
     * @returns {Promise<void>}
     */
    async _appendEncodedChunk(state, chunk) {
        if (chunk.byteLength <= 0) { return; }

        const withHeader = state.fileLength === 0 ? this._withBinaryHeader(chunk) : chunk;
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
                this._loadBinary(content);
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
        for (const chunk of state.pendingWriteChunks) {
            if (chunk.byteLength <= 0) { continue; }
            await state.writable.write(chunk);
        }
        state.pendingWriteChunks = [];
        state.pendingWriteBytes = 0;
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
