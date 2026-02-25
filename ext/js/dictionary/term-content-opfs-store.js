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
        /** @type {FileSystemWritableFileStream|null} */
        this._writable = null;
        /** @type {Uint8Array[]} */
        this._chunks = [];
        /** @type {number[]} */
        this._chunkOffsets = [];
        /** @type {number} */
        this._length = 0;
        /** @type {number} */
        this._pendingWriteBytes = 0;
        /** @type {Uint8Array[]} */
        this._pendingWriteChunks = [];
        /** @type {number} */
        this._flushThresholdBytes = 8 * 1024 * 1024;
        /** @type {boolean} */
        this._importSessionActive = false;
        /** @type {boolean} */
        this._loadedForRead = false;
    }

    /**
     * @returns {Promise<void>}
     */
    async prepare() {
        await this._closeWritable();
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
        this._pendingWriteBytes = 0;
        this._pendingWriteChunks = [];
        this._importSessionActive = false;
    }

    /**
     * @returns {Promise<void>}
     */
    async beginImportSession() {
        if (this._importSessionActive) {
            return;
        }
        this._importSessionActive = true;
        this._pendingWriteBytes = 0;
        this._pendingWriteChunks = [];
        if (this._fileHandle === null) {
            return;
        }
        this._writable = await this._fileHandle.createWritable({keepExistingData: true});
        await this._writable.seek(this._length);
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
    }

    /**
     * @returns {Promise<void>}
     */
    async reset() {
        await this._closeWritable();
        if (this._fileHandle === null) {
            this._chunks = [];
            this._chunkOffsets = [];
            this._length = 0;
            this._pendingWriteBytes = 0;
            this._pendingWriteChunks = [];
            this._importSessionActive = false;
            return;
        }
        const writable = await this._fileHandle.createWritable();
        await writable.truncate(0);
        await writable.close();
        this._chunks = [];
        this._chunkOffsets = [];
        this._length = 0;
        this._loadedForRead = true;
        this._pendingWriteBytes = 0;
        this._pendingWriteChunks = [];
        this._importSessionActive = false;
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
                if (!this._importSessionActive || this._loadedForRead || this._fileHandle === null) {
                    this._chunkOffsets.push(nextOffset);
                    this._chunks.push(chunk);
                }
                nextOffset += length;
            }
        }
        this._length = nextOffset;

        if (this._fileHandle !== null) {
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
                this._pendingWriteChunks.push(merged);
                this._pendingWriteBytes += merged.byteLength;
                if (!this._importSessionActive || this._pendingWriteBytes >= this._flushThresholdBytes) {
                    await this._flushPendingWrites();
                    if (!this._importSessionActive) {
                        await this._closeWritable();
                    }
                }
            }
        }
        return spans;
    }

    /**
     * @returns {Promise<void>}
     */
    async ensureLoadedForRead() {
        await this._flushPendingWrites();
        await this._closeWritable();
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
     * @returns {Promise<void>}
     */
    async _flushPendingWrites() {
        if (this._pendingWriteBytes <= 0 || this._pendingWriteChunks.length === 0 || this._fileHandle === null) {
            return;
        }
        if (this._writable === null) {
            this._writable = await this._fileHandle.createWritable({keepExistingData: true});
            const seekOffset = this._length - this._pendingWriteBytes;
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
        this._pendingWriteBytes = 0;
        this._pendingWriteChunks = [];
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
