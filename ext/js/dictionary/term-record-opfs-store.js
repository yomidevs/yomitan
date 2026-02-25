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

const FILE_NAME = 'manabitan-term-records.ndjson';

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
        /** @type {number} */
        this._fileLength = 0;
        /** @type {Map<number, TermRecord>} */
        this._recordsById = new Map();
        /** @type {number} */
        this._nextId = 1;
        /** @type {Map<string, {expression: Map<string, number[]>, reading: Map<string, number[]>, expressionReverse: Map<string, number[]>, readingReverse: Map<string, number[]>, pair: Map<string, number[]>, sequence: Map<number, number[]>}>} */
        this._indexByDictionary = new Map();
    }

    /**
     * @returns {Promise<void>}
     */
    async prepare() {
        this._recordsById.clear();
        this._indexByDictionary.clear();
        this._nextId = 1;
        if (typeof navigator === 'undefined' || !('storage' in navigator) || !('getDirectory' in navigator.storage)) {
            return;
        }
        const root = await navigator.storage.getDirectory();
        this._fileHandle = await root.getFileHandle(FILE_NAME, {create: true});
        const file = await this._fileHandle.getFile();
        this._fileLength = file.size;
        if (file.size <= 0) { return; }
        const content = await file.text();
        const lines = content.split('\n');
        for (const line of lines) {
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
            this._addToIndex(record);
            if (id >= this._nextId) {
                this._nextId = id + 1;
            }
        }
    }

    /**
     * @returns {Promise<void>}
     */
    async reset() {
        this._recordsById.clear();
        this._indexByDictionary.clear();
        this._nextId = 1;
        this._fileLength = 0;
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
        /** @type {string[]} */
        const lines = [];
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
            this._addToIndex(record);
            lines.push(JSON.stringify([
                id,
                record.dictionary,
                record.expression,
                record.reading,
                record.expressionReverse,
                record.readingReverse,
                record.entryContentOffset,
                record.entryContentLength,
                record.entryContentDictName,
                record.score,
                record.sequence,
            ]));
        }
        if (this._fileHandle !== null) {
            const writable = await this._fileHandle.createWritable({keepExistingData: true});
            const payload = `${lines.join('\n')}\n`;
            await writable.seek(this._fileLength);
            await writable.write(payload);
            await writable.close();
            this._fileLength += payload.length;
        }
        return ids;
    }

    /**
     * @param {string} dictionaryName
     * @returns {Promise<number>}
     */
    async deleteByDictionary(dictionaryName) {
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
        await this._rewriteAll();
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
     * @returns {Promise<void>}
     */
    async _rewriteAll() {
        if (this._fileHandle === null) { return; }
        const lines = [];
        for (const id of this.getAllIds()) {
            const record = this._recordsById.get(id);
            if (typeof record === 'undefined') { continue; }
            lines.push(JSON.stringify([
                record.id,
                record.dictionary,
                record.expression,
                record.reading,
                record.expressionReverse,
                record.readingReverse,
                record.entryContentOffset,
                record.entryContentLength,
                record.entryContentDictName,
                record.score,
                record.sequence,
            ]));
        }
        const writable = await this._fileHandle.createWritable();
        await writable.truncate(0);
        if (lines.length > 0) {
            const payload = `${lines.join('\n')}\n`;
            await writable.write(payload);
            this._fileLength = payload.length;
        } else {
            this._fileLength = 0;
        }
        await writable.close();
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
