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
const READ_PAGE_SIZE_BYTES = 64 * 1024;
const DEFAULT_READ_PAGE_CACHE_MAX_PAGES = 128;
const LOW_MEMORY_READ_PAGE_CACHE_MAX_PAGES = 48;

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
        /** @type {File|null} */
        this._readFile = null;
        /** @type {Map<number, Uint8Array>} */
        this._readPageCache = new Map();
        /** @type {number} */
        this._readPageCacheMaxPages = this._computeReadPageCacheMaxPages();
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
        this._invalidateReadState();
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
            this._invalidateReadState();
            return;
        }
        const writable = await this._fileHandle.createWritable();
        await writable.truncate(0);
        await writable.close();
        this._chunks = [];
        this._chunkOffsets = [];
        this._length = 0;
        this._invalidateReadState();
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
                if (this._fileHandle === null) {
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
                this._invalidateReadState();
                for (const chunk of chunks) {
                    if (chunk.byteLength <= 0) { continue; }
                    this._pendingWriteChunks.push(chunk);
                    this._pendingWriteBytes += chunk.byteLength;
                }
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
        this._length = file.size;
        this._readFile = file;
        this._readPageCache.clear();
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
        for (const chunk of this._pendingWriteChunks) {
            if (chunk.byteLength <= 0) { continue; }
            await this._writable.write(chunk);
        }
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
     * @returns {Promise<Uint8Array|null>}
     */
    async readSlice(offset, length) {
        if (offset < 0 || length <= 0) { return null; }
        const end = offset + length;
        if (end > this._length) { return null; }
        if (this._fileHandle === null) {
            if (this._chunks.length === 0) { return null; }
            return this._readSliceFromMemory(offset, length);
        }
        if (!this._loadedForRead) {
            await this.ensureLoadedForRead();
        }
        return await this._readSliceFromFile(offset, length);
    }

    /**
     * @param {number} offset
     * @param {number} length
     * @returns {Uint8Array|null}
     */
    _readSliceFromMemory(offset, length) {
        if (this._chunks.length === 0) { return null; }
        const end = offset + length;

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
     * @param {number} length
     * @returns {Promise<Uint8Array|null>}
     */
    async _readSliceFromFile(offset, length) {
        if (this._readFile === null) {
            return null;
        }
        const output = new Uint8Array(length);
        const pageSize = READ_PAGE_SIZE_BYTES;
        const startPage = Math.floor(offset / pageSize);
        const endPage = Math.floor((offset + length - 1) / pageSize);
        let outputOffset = 0;
        for (let pageIndex = startPage; pageIndex <= endPage; ++pageIndex) {
            const page = await this._getReadPage(pageIndex);
            if (page === null) {
                return null;
            }
            const pageStartOffset = pageIndex * pageSize;
            const rangeStart = Math.max(offset, pageStartOffset);
            const rangeEnd = Math.min(offset + length, pageStartOffset + page.byteLength);
            const copyLength = rangeEnd - rangeStart;
            if (copyLength <= 0) { continue; }
            const pageStart = rangeStart - pageStartOffset;
            output.set(page.subarray(pageStart, pageStart + copyLength), outputOffset);
            outputOffset += copyLength;
        }
        return outputOffset === length ? output : null;
    }

    /**
     * @param {number} pageIndex
     * @returns {Promise<Uint8Array|null>}
     */
    async _getReadPage(pageIndex) {
        const cached = this._readPageCache.get(pageIndex);
        if (typeof cached !== 'undefined') {
            this._touchReadPage(pageIndex, cached);
            return cached;
        }
        const file = this._readFile;
        if (file === null) {
            return null;
        }
        const pageOffset = pageIndex * READ_PAGE_SIZE_BYTES;
        if (pageOffset >= this._length) {
            return null;
        }
        const pageEnd = Math.min(this._length, pageOffset + READ_PAGE_SIZE_BYTES);
        const bytes = new Uint8Array(await file.slice(pageOffset, pageEnd).arrayBuffer());
        this._setReadPage(pageIndex, bytes);
        return bytes;
    }

    /**
     * @param {number} pageIndex
     * @param {Uint8Array} page
     */
    _touchReadPage(pageIndex, page) {
        this._readPageCache.delete(pageIndex);
        this._readPageCache.set(pageIndex, page);
    }

    /**
     * @param {number} pageIndex
     * @param {Uint8Array} page
     */
    _setReadPage(pageIndex, page) {
        this._readPageCache.set(pageIndex, page);
        while (this._readPageCache.size > this._readPageCacheMaxPages) {
            const first = this._readPageCache.keys().next();
            if (first.done) {
                break;
            }
            this._readPageCache.delete(first.value);
        }
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

    /** */
    _invalidateReadState() {
        this._loadedForRead = false;
        this._readFile = null;
        this._readPageCache.clear();
    }

    /**
     * @returns {number}
     */
    _computeReadPageCacheMaxPages() {
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
        return memoryGiB !== null && memoryGiB <= 4 ? LOW_MEMORY_READ_PAGE_CACHE_MAX_PAGES : DEFAULT_READ_PAGE_CACHE_MAX_PAGES;
    }
}
