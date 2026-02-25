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
import {encodeTermRecordsWithWasm} from './term-record-wasm-encoder.js';

const FILE_NAME = 'manabitan-term-records.ndjson';
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

export class TermRecordOpfsStore {
    constructor() {
        /** @type {FileSystemFileHandle|null} */
        this._fileHandle = null;
        /** @type {FileSystemWritableFileStream|null} */
        this._writable = null;
        /** @type {number} */
        this._fileLength = 0;
        /** @type {number} */
        this._pendingWriteBytes = 0;
        /** @type {Uint8Array[]} */
        this._pendingWriteChunks = [];
        /** @type {number} */
        this._flushThresholdBytes = 8 * 1024 * 1024;
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
    }

    /**
     * @returns {Promise<void>}
     */
    async prepare() {
        await this._closeWritable();
        this._recordsById.clear();
        this._indexByDictionary.clear();
        this._nextId = 1;
        this._deferIndexBuild = false;
        this._indexDirty = false;
        this._pendingWriteBytes = 0;
        this._pendingWriteChunks = [];
        if (typeof navigator === 'undefined' || !('storage' in navigator) || !('getDirectory' in navigator.storage)) {
            return;
        }
        const root = await navigator.storage.getDirectory();
        this._fileHandle = await root.getFileHandle(FILE_NAME, {create: true});
        const file = await this._fileHandle.getFile();
        this._fileLength = file.size;
        if (file.size <= 0) { return; }

        const content = new Uint8Array(await file.arrayBuffer());
        if (this._isBinaryFormat(content)) {
            this._loadBinary(content);
        } else {
            this._loadLegacyNdjson(content);
            await this._rewriteAllBinary();
        }
        this._rebuildIndexesFromRecords();
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
        this._pendingWriteBytes = 0;
        this._pendingWriteChunks = [];
        if (this._fileHandle === null) {
            return;
        }
        this._writable = await this._fileHandle.createWritable({keepExistingData: true});
        await this._writable.seek(this._fileLength);
    }

    /**
     * @returns {Promise<void>}
     */
    async endImportSession() {
        if (!this._importSessionActive && this._writable === null) {
            return;
        }
        this._importSessionActive = false;
        await this._flushPendingWrites();
        await this._closeWritable();
        this._deferIndexBuild = false;
        if (this._indexDirty) {
            this._rebuildIndexesFromRecords();
        }
    }

    /**
     * @returns {Promise<void>}
     */
    async reset() {
        await this._closeWritable();
        this._recordsById.clear();
        this._indexByDictionary.clear();
        this._nextId = 1;
        this._fileLength = 0;
        this._deferIndexBuild = false;
        this._indexDirty = false;
        this._pendingWriteBytes = 0;
        this._pendingWriteChunks = [];
        if (this._fileHandle === null) {
            return;
        }
        const writable = await this._fileHandle.createWritable();
        await writable.truncate(0);
        await writable.close();
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
     * @returns {Promise<number[]>}
     */
    async appendBatch(records) {
        if (records.length === 0) { return []; }
        /** @type {TermRecord[]} */
        const mappedRecords = [];
        /** @type {number[]} */
        const ids = [];
        for (const row of records) {
            const id = this._nextId++;
            ids.push(id);
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
            mappedRecords.push(record);
            if (!this._deferIndexBuild) {
                this._addToIndex(record);
            }
        }
        if (this._deferIndexBuild) {
            this._indexDirty = true;
        }
        await this._appendEncodedChunk(await this._encodeRecords(mappedRecords));
        return ids;
    }

    /**
     * @param {string} dictionaryName
     * @returns {Promise<number>}
     */
    async deleteByDictionary(dictionaryName) {
        this._ensureIndexesReady();
        const index = this._indexByDictionary.get(dictionaryName);
        if (typeof index === 'undefined') {
            return 0;
        }
        const ids = new Set();
        for (const list of index.expression.values()) {
            for (const id of list) {
                ids.add(id);
            }
        }
        for (const id of ids) {
            this._recordsById.delete(this._asNumber(id, -1));
        }
        this._indexByDictionary.delete(dictionaryName);
        await this._rewriteAllBinary();
        return ids.size;
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
     * @param {Uint8Array} chunk
     * @returns {Promise<void>}
     */
    async _appendEncodedChunk(chunk) {
        if (chunk.byteLength <= 0) { return; }
        if (this._fileHandle === null) { return; }

        const withHeader = this._fileLength === 0 ? this._withBinaryHeader(chunk) : chunk;
        this._pendingWriteChunks.push(withHeader);
        this._pendingWriteBytes += withHeader.byteLength;
        this._fileLength += withHeader.byteLength;

        if (!this._importSessionActive || this._pendingWriteBytes >= this._flushThresholdBytes) {
            await this._flushPendingWrites();
            if (!this._importSessionActive) {
                await this._closeWritable();
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
        if (this._pendingWriteBytes <= 0 || this._pendingWriteChunks.length === 0 || this._fileHandle === null) {
            return;
        }
        if (this._writable === null) {
            this._writable = await this._fileHandle.createWritable({keepExistingData: true});
            const seekOffset = this._fileLength - this._pendingWriteBytes;
            await this._writable.seek(Math.max(0, seekOffset));
        }
        let merged = this._pendingWriteChunks[0];
        if (this._pendingWriteChunks.length > 1) {
            merged = new Uint8Array(this._pendingWriteBytes);
            let cursor = 0;
            for (const chunk of this._pendingWriteChunks) {
                merged.set(chunk, cursor);
                cursor += chunk.byteLength;
            }
        }
        await this._writable.write(merged);
        this._pendingWriteChunks = [];
        this._pendingWriteBytes = 0;
    }

    /**
     * @returns {Promise<void>}
     */
    async _closeWritable() {
        if (this._writable === null) {
            return;
        }
        try {
            await this._writable.close();
        } finally {
            this._writable = null;
        }
    }

    /**
     * @returns {Promise<void>}
     */
    async _rewriteAllBinary() {
        if (this._fileHandle === null) { return; }
        await this._closeWritable();
        this._pendingWriteBytes = 0;
        this._pendingWriteChunks = [];
        const allRecords = this.getAllIds().map((id) => this._recordsById.get(id)).filter((record) => typeof record !== 'undefined');
        const payload = await this._encodeRecords(/** @type {TermRecord[]} */ (allRecords));
        const writable = await this._fileHandle.createWritable();
        await writable.truncate(0);
        if (payload.byteLength > 0) {
            await writable.write(this._withBinaryHeader(payload));
            this._fileLength = BINARY_MAGIC_BYTES + payload.byteLength;
        } else {
            this._fileLength = 0;
        }
        await writable.close();
    }

    /** */
    _ensureIndexesReady() {
        if (!this._indexDirty) {
            return;
        }
        this._rebuildIndexesFromRecords();
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
