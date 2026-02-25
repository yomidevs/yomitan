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

const FILE_NAME = 'manabitan-term-content.bin';

export class TermContentOpfsStore {
    constructor() {
        /** @type {FileSystemFileHandle|null} */
        this._fileHandle = null;
        /** @type {Uint8Array[]} */
        this._chunks = [];
        /** @type {number[]} */
        this._chunkOffsets = [];
        /** @type {number} */
        this._length = 0;
        /** @type {boolean} */
        this._loadedForRead = false;
    }

    /**
     * @returns {Promise<void>}
     */
    async prepare() {
        if (typeof navigator === 'undefined' || !('storage' in navigator) || !('getDirectory' in navigator.storage)) {
            return;
        }
        const root = await navigator.storage.getDirectory();
        this._fileHandle = await root.getFileHandle(FILE_NAME, {create: true});
        const file = await this._fileHandle.getFile();
        this._length = file.size;
        this._chunks = [];
        this._chunkOffsets = [];
        this._loadedForRead = false;
    }

    /**
     * @returns {Promise<void>}
     */
    async reset() {
        if (this._fileHandle === null) {
            this._chunks = [];
            this._chunkOffsets = [];
            this._length = 0;
            return;
        }
        const writable = await this._fileHandle.createWritable();
        await writable.truncate(0);
        await writable.close();
        this._chunks = [];
        this._chunkOffsets = [];
        this._length = 0;
        this._loadedForRead = true;
    }

    /**
     * @param {Uint8Array[]} chunks
     * @returns {Promise<Array<{offset: number, length: number}>>}
     */
    async appendBatch(chunks) {
        if (chunks.length === 0) { return []; }
        /** @type {Array<{offset: number, length: number}>} */
        const spans = [];
        let nextOffset = this._length;
        for (const chunk of chunks) {
            const length = chunk.byteLength;
            spans.push({offset: nextOffset, length});
            if (length > 0) {
                this._chunkOffsets.push(nextOffset);
                this._chunks.push(chunk);
                nextOffset += length;
            }
        }
        this._length = nextOffset;

        if (this._fileHandle !== null) {
            const writable = await this._fileHandle.createWritable({keepExistingData: true});
            let totalBytes = 0;
            for (const chunk of chunks) {
                totalBytes += chunk.byteLength;
            }
            if (totalBytes > 0) {
                const merged = new Uint8Array(totalBytes);
                let mergeOffset = 0;
                for (const chunk of chunks) {
                    if (chunk.byteLength <= 0) { continue; }
                    merged.set(chunk, mergeOffset);
                    mergeOffset += chunk.byteLength;
                }
                await writable.seek(spans[0].offset);
                await writable.write(merged);
            }
            await writable.close();
        }
        return spans;
    }

    /**
     * @returns {Promise<void>}
     */
    async ensureLoadedForRead() {
        if (this._loadedForRead) { return; }
        if (this._fileHandle === null) {
            // Non-OPFS environments rely on in-memory chunks only.
            this._loadedForRead = true;
            return;
        }
        if (this._length <= 0) {
            this._loadedForRead = true;
            return;
        }
        const file = await this._fileHandle.getFile();
        const content = await file.arrayBuffer();
        const bytes = new Uint8Array(content);
        this._chunks = bytes.byteLength > 0 ? [bytes] : [];
        this._chunkOffsets = bytes.byteLength > 0 ? [0] : [];
        this._length = bytes.byteLength;
        this._loadedForRead = true;
    }

    /**
     * @param {number} offset
     * @param {number} length
     * @returns {Uint8Array|null}
     */
    readSlice(offset, length) {
        if (offset < 0 || length <= 0) { return null; }
        const end = offset + length;
        if (end > this._length) { return null; }
        if (this._chunks.length === 0) { return null; }

        // Fast path for single chunk.
        if (this._chunks.length === 1) {
            const chunk = this._chunks[0];
            return chunk.subarray(offset, end);
        }

        const output = new Uint8Array(length);
        let remaining = length;
        let outputOffset = 0;
        let cursor = offset;
        let chunkIndex = this._findChunkIndex(cursor);
        while (remaining > 0 && chunkIndex < this._chunks.length) {
            const chunkOffset = this._chunkOffsets[chunkIndex];
            const chunk = this._chunks[chunkIndex];
            const chunkEnd = chunkOffset + chunk.byteLength;
            const startInChunk = Math.max(0, cursor - chunkOffset);
            const available = chunkEnd - (chunkOffset + startInChunk);
            const copyLength = Math.min(remaining, available);
            if (copyLength <= 0) {
                ++chunkIndex;
                continue;
            }
            output.set(chunk.subarray(startInChunk, startInChunk + copyLength), outputOffset);
            outputOffset += copyLength;
            cursor += copyLength;
            remaining -= copyLength;
            if (cursor >= chunkEnd) {
                ++chunkIndex;
            }
        }
        return remaining === 0 ? output : null;
    }

    /**
     * @param {number} offset
     * @returns {number}
     */
    _findChunkIndex(offset) {
        let low = 0;
        let high = this._chunkOffsets.length - 1;
        while (low <= high) {
            const mid = (low + high) >>> 1;
            const start = this._chunkOffsets[mid];
            const end = start + this._chunks[mid].byteLength;
            if (offset < start) {
                high = mid - 1;
            } else if (offset >= end) {
                low = mid + 1;
            } else {
                return mid;
            }
        }
        return Math.max(0, Math.min(low, this._chunks.length - 1));
    }
}
