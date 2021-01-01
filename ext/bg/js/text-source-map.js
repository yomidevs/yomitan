/*
 * Copyright (C) 2020-2021  Yomichan Authors
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

class TextSourceMap {
    constructor(source, mapping=null) {
        this._source = source;
        this._mapping = (mapping !== null ? TextSourceMap.normalizeMapping(mapping) : null);
    }

    get source() {
        return this._source;
    }

    equals(other) {
        if (this === other) {
            return true;
        }

        const source = this._source;
        if (!(other instanceof TextSourceMap && source === other.source)) {
            return false;
        }

        let mapping = this._mapping;
        let otherMapping = other.getMappingCopy();
        if (mapping === null) {
            if (otherMapping === null) {
                return true;
            }
            mapping = TextSourceMap.createMapping(source);
        } else if (otherMapping === null) {
            otherMapping = TextSourceMap.createMapping(source);
        }

        const mappingLength = mapping.length;
        if (mappingLength !== otherMapping.length) {
            return false;
        }

        for (let i = 0; i < mappingLength; ++i) {
            if (mapping[i] !== otherMapping[i]) {
                return false;
            }
        }

        return true;
    }

    getSourceLength(finalLength) {
        const mapping = this._mapping;
        if (mapping === null) {
            return finalLength;
        }

        let sourceLength = 0;
        for (let i = 0; i < finalLength; ++i) {
            sourceLength += mapping[i];
        }
        return sourceLength;
    }

    combine(index, count) {
        if (count <= 0) { return; }

        if (this._mapping === null) {
            this._mapping = TextSourceMap.createMapping(this._source);
        }

        let sum = this._mapping[index];
        const parts = this._mapping.splice(index + 1, count);
        for (const part of parts) {
            sum += part;
        }
        this._mapping[index] = sum;
    }

    insert(index, ...items) {
        if (this._mapping === null) {
            this._mapping = TextSourceMap.createMapping(this._source);
        }

        this._mapping.splice(index, 0, ...items);
    }

    getMappingCopy() {
        return this._mapping !== null ? [...this._mapping] : null;
    }

    static createMapping(text) {
        return new Array(text.length).fill(1);
    }

    static normalizeMapping(mapping) {
        const result = [];
        for (const value of mapping) {
            result.push(
                (typeof value === 'number' && Number.isFinite(value)) ?
                Math.floor(value) :
                0
            );
        }
        return result;
    }
}
