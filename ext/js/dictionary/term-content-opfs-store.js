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

import {reportDiagnostics} from '../core/diagnostics-reporter.js';
import {safePerformance} from '../core/safe-performance.js';

const FILE_NAME = 'yomitan-term-content.bin';
const READ_PAGE_SIZE_BYTES = 64 * 1024;
const DEFAULT_READ_PAGE_CACHE_MAX_PAGES = 128;
const LOW_MEMORY_READ_PAGE_CACHE_MAX_PAGES = 48;
const HIGH_MEMORY_READ_PAGE_CACHE_MAX_PAGES = 192;
const DEFAULT_WRITE_COALESCE_TARGET_BYTES = 4 * 1024 * 1024;
const LOW_MEMORY_WRITE_COALESCE_TARGET_BYTES = 1024 * 1024;
const HIGH_MEMORY_WRITE_COALESCE_TARGET_BYTES = 16 * 1024 * 1024;
const RAW_BYTES_WRITE_COALESCE_TARGET_BYTES = 32 * 1024 * 1024;
const DEFAULT_WRITE_COALESCE_MAX_CHUNKS = 512;
const RAW_BYTES_WRITE_COALESCE_MAX_CHUNKS = 8192;
const DEFAULT_WRITE_FLUSH_THRESHOLD_BYTES = 16 * 1024 * 1024;
const LOW_MEMORY_WRITE_FLUSH_THRESHOLD_BYTES = 8 * 1024 * 1024;
const HIGH_MEMORY_WRITE_FLUSH_THRESHOLD_BYTES = 128 * 1024 * 1024;
const RAW_BYTES_WRITE_FLUSH_THRESHOLD_BYTES = 256 * 1024 * 1024;

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
        /** @type {Promise<void>|null} */
        this._queuedWritePromise = null;
        /** @type {Uint8Array[]} */
        this._queuedWriteChunks = [];
        /** @type {number} */
        this._flushThresholdBytes = this._computeWriteFlushThresholdBytes();
        /** @type {boolean} */
        this._importSessionActive = false;
        /** @type {boolean} */
        this._loadedForRead = false;
        /** @type {File|null} */
        this._readFile = null;
        /** @type {Map<number, Uint8Array>} */
        this._readPageCache = new Map();
        /** @type {string} */
        this._lastSliceCacheKey = '';
        /** @type {Uint8Array|null} */
        this._lastSliceCacheValue = null;
        /** @type {boolean} */
        this._exactSliceCacheEnabled = true;
        /** @type {number} */
        this._readPageCacheMaxPages = this._computeReadPageCacheMaxPages();
        /** @type {number} */
        this._writeCoalesceTargetBytes = this._computeWriteCoalesceTargetBytes();
        /** @type {number} */
        this._writeCoalesceMaxChunks = this._computeWriteCoalesceMaxChunks();
        /** @type {number|null} */
        this._writeCoalesceMaxChunksOverride = null;
        /** @type {{flushPendingWritesMs: number, awaitQueuedWritesMs: number, closeWritableMs: number, totalMs: number, drainCycleCount: number, writeCallCount: number, singleChunkWriteCount: number, mergedWriteCount: number, totalWriteBytes: number, mergedWriteBytes: number, maxWriteBytes: number, minWriteBytes: number, mergedGroupChunkCount: number, maxMergedGroupChunkCount: number, minMergedGroupChunkCount: number, flushDueToBytesCount: number, flushDueToChunkCount: number, flushFinalGroupCount: number, writeCoalesceTargetBytes: number, writeCoalesceMaxChunks: number}|null} */
        this._lastEndImportSessionMetrics = null;
        /** @type {{drainCycleCount: number, writeCallCount: number, singleChunkWriteCount: number, mergedWriteCount: number, totalWriteBytes: number, mergedWriteBytes: number, maxWriteBytes: number, minWriteBytes: number, mergedGroupChunkCount: number, maxMergedGroupChunkCount: number, minMergedGroupChunkCount: number, flushDueToBytesCount: number, flushDueToChunkCount: number, flushFinalGroupCount: number, writeCoalesceTargetBytes: number, writeCoalesceMaxChunks: number}} */
        this._writeDrainMetrics = this._createEmptyWriteDrainMetrics();
        /** @type {'baseline'|'raw-bytes'} */
        this._importStorageMode = 'baseline';
    }

    /**
     * @returns {Promise<void>}
     */
    async prepare() {
        await this._awaitQueuedWrites();
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
        this._queuedWritePromise = null;
        this._queuedWriteChunks = [];
        this._importSessionActive = false;
        this._lastEndImportSessionMetrics = null;
        this._writeDrainMetrics = this._createEmptyWriteDrainMetrics();
    }

    /**
     * @returns {Promise<void>}
     */
    async beginImportSession() {
        if (this._importSessionActive) {
            return;
        }
        await this._awaitQueuedWrites();
        this._importSessionActive = true;
        this._writeCoalesceTargetBytes = this._computeWriteCoalesceTargetBytes();
        this._writeCoalesceMaxChunks = this._computeWriteCoalesceMaxChunks();
        this._flushThresholdBytes = this._computeWriteFlushThresholdBytes();
        this._pendingWriteBytes = 0;
        this._pendingWriteChunks = [];
        this._queuedWritePromise = null;
        this._queuedWriteChunks = [];
        this._lastEndImportSessionMetrics = null;
        this._writeDrainMetrics = this._createEmptyWriteDrainMetrics();
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
        const tStart = safePerformance.now();
        this._importSessionActive = false;
        const tFlushPendingWritesStart = safePerformance.now();
        await this._flushPendingWrites();
        const flushPendingWritesMs = safePerformance.now() - tFlushPendingWritesStart;
        const tAwaitQueuedWritesStart = safePerformance.now();
        await this._awaitQueuedWrites();
        const awaitQueuedWritesMs = safePerformance.now() - tAwaitQueuedWritesStart;
        const tCloseWritableStart = safePerformance.now();
        await this._closeWritable();
        const closeWritableMs = safePerformance.now() - tCloseWritableStart;
        this._lastEndImportSessionMetrics = {
            flushPendingWritesMs,
            awaitQueuedWritesMs,
            closeWritableMs,
            totalMs: safePerformance.now() - tStart,
            ...this._writeDrainMetrics,
        };
    }

    /**
     * @returns {{flushPendingWritesMs: number, awaitQueuedWritesMs: number, closeWritableMs: number, totalMs: number, drainCycleCount: number, writeCallCount: number, singleChunkWriteCount: number, mergedWriteCount: number, totalWriteBytes: number, mergedWriteBytes: number, maxWriteBytes: number, mergedGroupChunkCount: number, maxMergedGroupChunkCount: number, flushDueToBytesCount: number, flushDueToChunkCount: number, flushFinalGroupCount: number, writeCoalesceTargetBytes: number, writeCoalesceMaxChunks: number}|null}
     */
    getLastEndImportSessionMetrics() {
        return this._lastEndImportSessionMetrics;
    }

    /**
     * @param {'baseline'|'raw-bytes'} mode
     */
    setImportStorageMode(mode) {
        this._importStorageMode = mode === 'raw-bytes' ? 'raw-bytes' : 'baseline';
        this._writeCoalesceTargetBytes = this._computeWriteCoalesceTargetBytes();
        this._writeCoalesceMaxChunks = this._computeWriteCoalesceMaxChunks();
        this._flushThresholdBytes = this._computeWriteFlushThresholdBytes();
        this._writeDrainMetrics = this._createEmptyWriteDrainMetrics();
    }

    /**
     * @param {number|null} value
     */
    setWriteCoalesceMaxChunksOverride(value) {
        this._writeCoalesceMaxChunksOverride = (typeof value === 'number' && Number.isFinite(value) && value > 0) ?
            Math.max(1, Math.trunc(value)) :
            null;
        this._writeCoalesceMaxChunks = this._computeWriteCoalesceMaxChunks();
        this._writeDrainMetrics = this._createEmptyWriteDrainMetrics();
    }

    /**
     * @param {boolean} value
     */
    setExactSliceCacheEnabled(value) {
        this._exactSliceCacheEnabled = value;
        if (!value) {
            this._lastSliceCacheKey = '';
            this._lastSliceCacheValue = null;
        }
    }

    /**
     * @returns {Promise<void>}
     */
    async reset() {
        await this._awaitQueuedWrites();
        await this._closeWritable();
        if (this._fileHandle === null) {
            this._chunks = [];
            this._chunkOffsets = [];
            this._length = 0;
            this._pendingWriteBytes = 0;
            this._pendingWriteChunks = [];
            this._queuedWritePromise = null;
            this._queuedWriteChunks = [];
            this._importSessionActive = false;
            this._lastEndImportSessionMetrics = null;
            this._writeDrainMetrics = this._createEmptyWriteDrainMetrics();
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
        this._queuedWritePromise = null;
        this._queuedWriteChunks = [];
        this._importSessionActive = false;
        this._lastEndImportSessionMetrics = null;
        this._writeDrainMetrics = this._createEmptyWriteDrainMetrics();
    }

    /**
     * @param {Uint8Array[]} chunks
     * @returns {Promise<Array<{offset: number, length: number}>>}
     */
    async appendBatch(chunks) {
        if (chunks.length === 0) { return []; }
        /** @type {Array<{offset: number, length: number}>} */
        const spans = [];
        /** @type {number[]} */
        const offsets = [];
        /** @type {number[]} */
        const lengths = [];
        this._appendBatchInternal(chunks, offsets, lengths);
        for (let i = 0, ii = offsets.length; i < ii; ++i) {
            spans.push({offset: offsets[i], length: lengths[i]});
        }
        await this._finalizeAppendBatch(chunks);
        return spans;
    }

    /**
     * @param {Uint8Array[]} chunks
     * @param {number[]} offsets
     * @param {number[]} lengths
     * @returns {Promise<void>}
     */
    async appendBatchToArrays(chunks, offsets, lengths) {
        if (chunks.length === 0) { return; }
        this._appendBatchInternal(chunks, offsets, lengths);
        await this._finalizeAppendBatch(chunks);
    }

    /**
     * @param {Uint8Array[]} chunks
     * @param {number[]} offsets
     * @param {number[]} lengths
     * @returns {void}
     */
    _appendBatchInternal(chunks, offsets, lengths) {
        offsets.length = 0;
        lengths.length = 0;
        let nextOffset = this._length;
        for (const chunk of chunks) {
            const length = chunk.byteLength;
            offsets.push(nextOffset);
            lengths.push(length);
            if (length > 0) {
                if (this._fileHandle === null) {
                    this._chunkOffsets.push(nextOffset);
                    this._chunks.push(chunk);
                }
                nextOffset += length;
            }
        }
        this._length = nextOffset;
    }

    /**
     * @param {Uint8Array[]} chunks
     * @returns {Promise<void>}
     */
    async _finalizeAppendBatch(chunks) {
        if (this._fileHandle !== null) {
            let totalBytes = 0;
            for (const chunk of chunks) {
                totalBytes += chunk.byteLength;
            }
            if (totalBytes > 0) {
                this._invalidateReadState();
                for (const chunk of chunks) {
                    if (chunk.byteLength <= 0) { continue; }
                    this._pendingWriteBytes += chunk.byteLength;
                    this._pendingWriteChunks.push(chunk);
                }
                if (!this._importSessionActive || this._pendingWriteBytes >= this._flushThresholdBytes) {
                    await this._flushPendingWrites();
                    if (!this._importSessionActive) {
                        await this._awaitQueuedWrites();
                        await this._closeWritable();
                    }
                }
            }
        }
    }

    /**
     * @returns {Promise<void>}
     */
    async ensureLoadedForRead() {
        await this._flushPendingWrites();
        await this._awaitQueuedWrites();
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
        try {
            const file = await this._fileHandle.getFile();
            this._length = file.size;
            this._readFile = file;
            this._readPageCache.clear();
            this._loadedForRead = true;
        } catch (error) {
            if (!this._isNotReadableFileError(error)) {
                throw error;
            }
            const recovered = await this._recoverFromNotReadableFileError('ensure-loaded', error);
            this._loadedForRead = recovered;
        }
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
        const chunks = this._pendingWriteChunks;
        this._pendingWriteBytes = 0;
        this._pendingWriteChunks = [];
        if (this._importSessionActive) {
            this._queueWriteChunks(chunks);
            return;
        }
        if (this._queuedWritePromise !== null) {
            this._queueWriteChunks(chunks);
            return;
        }
        await this._writePendingChunksCoalesced(chunks);
    }

    /**
     * @param {Uint8Array[]} chunks
     * @returns {void}
     */
    _queueWriteChunks(chunks) {
        if (chunks.length === 0) {
            return;
        }
        for (const chunk of chunks) {
            this._queuedWriteChunks.push(chunk);
        }
        if (this._queuedWritePromise !== null) {
            return;
        }
        this._queuedWritePromise = this._drainQueuedWrites();
    }

    /**
     * @returns {Promise<void>}
     */
    async _awaitQueuedWrites() {
        const promise = this._queuedWritePromise;
        if (promise === null) {
            return;
        }
        await promise;
    }

    /**
     * @returns {Promise<void>}
     */
    async _drainQueuedWrites() {
        try {
            ++this._writeDrainMetrics.drainCycleCount;
            while (this._queuedWriteChunks.length > 0) {
                const chunks = this._queuedWriteChunks;
                this._queuedWriteChunks = [];
                await this._writePendingChunksCoalesced(chunks);
            }
        } finally {
            this._queuedWritePromise = null;
            if (this._queuedWriteChunks.length > 0) {
                this._queuedWritePromise = this._drainQueuedWrites();
            }
        }
    }

    /**
     * @param {Uint8Array[]} chunks
     * @returns {Promise<void>}
     */
    async _writePendingChunksCoalesced(chunks) {
        if (this._writable === null) { return; }
        /** @type {Uint8Array[]} */
        let group = [];
        let groupBytes = 0;
        const flushGroup = async (reason = 'final') => {
            if (group.length === 0 || this._writable === null) {
                group = [];
                groupBytes = 0;
                return;
            }
            if (reason === 'bytes') {
                ++this._writeDrainMetrics.flushDueToBytesCount;
            } else if (reason === 'chunks') {
                ++this._writeDrainMetrics.flushDueToChunkCount;
            } else {
                ++this._writeDrainMetrics.flushFinalGroupCount;
            }
            ++this._writeDrainMetrics.writeCallCount;
            this._writeDrainMetrics.totalWriteBytes += groupBytes;
            if (groupBytes > this._writeDrainMetrics.maxWriteBytes) {
                this._writeDrainMetrics.maxWriteBytes = groupBytes;
            }
            if (this._writeDrainMetrics.minWriteBytes === 0 || groupBytes < this._writeDrainMetrics.minWriteBytes) {
                this._writeDrainMetrics.minWriteBytes = groupBytes;
            }
            if (group.length === 1) {
                ++this._writeDrainMetrics.singleChunkWriteCount;
                await this._writable.write(group[0]);
                group = [];
                groupBytes = 0;
                return;
            }
            ++this._writeDrainMetrics.mergedWriteCount;
            this._writeDrainMetrics.mergedGroupChunkCount += group.length;
            if (group.length > this._writeDrainMetrics.maxMergedGroupChunkCount) {
                this._writeDrainMetrics.maxMergedGroupChunkCount = group.length;
            }
            if (
                this._writeDrainMetrics.minMergedGroupChunkCount === 0 ||
                group.length < this._writeDrainMetrics.minMergedGroupChunkCount
            ) {
                this._writeDrainMetrics.minMergedGroupChunkCount = group.length;
            }
            this._writeDrainMetrics.mergedWriteBytes += groupBytes;
            const merged = new Uint8Array(groupBytes);
            let offset = 0;
            for (const chunk of group) {
                merged.set(chunk, offset);
                offset += chunk.byteLength;
            }
            await this._writable.write(merged);
            group = [];
            groupBytes = 0;
        };
        for (const chunk of chunks) {
            if (chunk.byteLength <= 0) { continue; }
            const wouldOverflow = groupBytes > 0 && (groupBytes + chunk.byteLength) > this._writeCoalesceTargetBytes;
            if (wouldOverflow) {
                await flushGroup('bytes');
            }
            group.push(chunk);
            groupBytes += chunk.byteLength;
            if (group.length >= this._writeCoalesceMaxChunks || groupBytes >= this._writeCoalesceTargetBytes) {
                await flushGroup(group.length >= this._writeCoalesceMaxChunks ? 'chunks' : 'bytes');
            }
        }
        await flushGroup();
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
        const cacheKey = `${offset}:${length}`;
        if (this._exactSliceCacheEnabled && this._lastSliceCacheKey === cacheKey && this._lastSliceCacheValue instanceof Uint8Array) {
            return this._lastSliceCacheValue;
        }
        /** @type {Uint8Array|null} */
        let result;
        if (this._fileHandle === null) {
            if (this._chunks.length === 0) { return null; }
            result = this._readSliceFromMemory(offset, length);
        } else {
            if (!this._loadedForRead) {
                await this.ensureLoadedForRead();
            }
            result = await this._readSliceFromFile(offset, length);
        }
        if (this._exactSliceCacheEnabled && result instanceof Uint8Array) {
            this._lastSliceCacheKey = cacheKey;
            this._lastSliceCacheValue = result;
        }
        return result;
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
        for (let attempt = 0; attempt < 2; ++attempt) {
            try {
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
            } catch (error) {
                if (attempt > 0 || !this._isNotReadableFileError(error)) {
                    throw error;
                }
                const recovered = await this._recoverFromNotReadableFileError('read-slice', error);
                if (!recovered) {
                    return null;
                }
            }
        }
        return null;
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
        this._lastSliceCacheKey = '';
        this._lastSliceCacheValue = null;
    }

    /**
     * @param {unknown} error
     * @returns {boolean}
     */
    _isNotReadableFileError(error) {
        const name = this._asErrorName(error);
        if (name === 'NotReadableError') {
            return true;
        }
        const text = this._asErrorText(error).toLowerCase();
        return (
            text.includes('notreadableerror') ||
            text.includes('requested file could not be read')
        );
    }

    /**
     * @param {unknown} error
     * @returns {string}
     */
    _asErrorName(error) {
        return (typeof error === 'object' && error !== null && typeof Reflect.get(error, 'name') === 'string') ?
            /** @type {string} */ (Reflect.get(error, 'name')) :
            '';
    }

    /**
     * @param {unknown} error
     * @returns {string}
     */
    _asErrorText(error) {
        if (error instanceof Error) {
            return `${error.name}: ${error.message}`;
        }
        const name = this._asErrorName(error);
        const message = (
            typeof error === 'object' &&
            error !== null &&
            typeof Reflect.get(error, 'message') === 'string'
        ) ?
            /** @type {string} */ (Reflect.get(error, 'message')) :
            String(error);
        return name.length > 0 ? `${name}: ${message}` : message;
    }

    /**
     * @param {string} phase
     * @param {unknown} error
     * @returns {Promise<boolean>}
     */
    async _recoverFromNotReadableFileError(phase, error) {
        reportDiagnostics('term-content-opfs-read-error', {
            phase,
            reason: this._asErrorText(error),
            action: 'retry-open-file',
        });
        this._readFile = null;
        this._readPageCache.clear();
        const refreshed = await this._refreshReadFileSnapshot({reacquireHandle: false});
        if (refreshed) {
            return true;
        }
        return await this._refreshReadFileSnapshot({reacquireHandle: true});
    }

    /**
     * @param {{reacquireHandle: boolean}} options
     * @returns {Promise<boolean>}
     */
    async _refreshReadFileSnapshot({reacquireHandle}) {
        if (this._fileHandle === null) {
            return false;
        }
        if (reacquireHandle) {
            try {
                if (
                    typeof navigator !== 'undefined' &&
                    'storage' in navigator &&
                    'getDirectory' in navigator.storage
                ) {
                    const root = await navigator.storage.getDirectory();
                    this._fileHandle = await root.getFileHandle(FILE_NAME, {create: true});
                }
            } catch (_) {
                // NOP
            }
        }
        try {
            const file = await this._fileHandle.getFile();
            this._length = file.size;
            this._readFile = file;
            this._readPageCache.clear();
            this._loadedForRead = true;
            return true;
        } catch (_) {
            return false;
        }
    }

    /**
     * @returns {number}
     */
    _computeReadPageCacheMaxPages() {
        const memoryGiB = this._getDeviceMemoryGiB();
        if (memoryGiB !== null && memoryGiB <= 4) {
            return LOW_MEMORY_READ_PAGE_CACHE_MAX_PAGES;
        }
        if (memoryGiB !== null && memoryGiB >= 8) {
            return HIGH_MEMORY_READ_PAGE_CACHE_MAX_PAGES;
        }
        return DEFAULT_READ_PAGE_CACHE_MAX_PAGES;
    }

    /**
     * @returns {number}
     */
    _computeWriteCoalesceTargetBytes() {
        if (this._importStorageMode === 'raw-bytes') {
            return RAW_BYTES_WRITE_COALESCE_TARGET_BYTES;
        }
        const memoryGiB = this._getDeviceMemoryGiB();
        if (memoryGiB !== null && memoryGiB <= 4) {
            return LOW_MEMORY_WRITE_COALESCE_TARGET_BYTES;
        }
        if (memoryGiB !== null && memoryGiB >= 8) {
            return HIGH_MEMORY_WRITE_COALESCE_TARGET_BYTES;
        }
        return DEFAULT_WRITE_COALESCE_TARGET_BYTES;
    }

    /**
     * @returns {number}
     */
    _computeWriteFlushThresholdBytes() {
        if (this._importStorageMode === 'raw-bytes') {
            return RAW_BYTES_WRITE_FLUSH_THRESHOLD_BYTES;
        }
        const memoryGiB = this._getDeviceMemoryGiB();
        if (memoryGiB !== null && memoryGiB <= 4) {
            return LOW_MEMORY_WRITE_FLUSH_THRESHOLD_BYTES;
        }
        if (memoryGiB !== null && memoryGiB >= 8) {
            return HIGH_MEMORY_WRITE_FLUSH_THRESHOLD_BYTES;
        }
        return DEFAULT_WRITE_FLUSH_THRESHOLD_BYTES;
    }

    /**
     * @returns {number}
     */
    _computeWriteCoalesceMaxChunks() {
        if (this._writeCoalesceMaxChunksOverride !== null) {
            return this._writeCoalesceMaxChunksOverride;
        }
        return this._importStorageMode === 'raw-bytes' ? RAW_BYTES_WRITE_COALESCE_MAX_CHUNKS : DEFAULT_WRITE_COALESCE_MAX_CHUNKS;
    }

    /**
     * @returns {{drainCycleCount: number, writeCallCount: number, singleChunkWriteCount: number, mergedWriteCount: number, totalWriteBytes: number, mergedWriteBytes: number, maxWriteBytes: number, minWriteBytes: number, mergedGroupChunkCount: number, maxMergedGroupChunkCount: number, minMergedGroupChunkCount: number, flushDueToBytesCount: number, flushDueToChunkCount: number, flushFinalGroupCount: number, writeCoalesceTargetBytes: number, writeCoalesceMaxChunks: number}}
     */
    _createEmptyWriteDrainMetrics() {
        return {
            drainCycleCount: 0,
            writeCallCount: 0,
            singleChunkWriteCount: 0,
            mergedWriteCount: 0,
            totalWriteBytes: 0,
            mergedWriteBytes: 0,
            maxWriteBytes: 0,
            minWriteBytes: 0,
            mergedGroupChunkCount: 0,
            maxMergedGroupChunkCount: 0,
            minMergedGroupChunkCount: 0,
            flushDueToBytesCount: 0,
            flushDueToChunkCount: 0,
            flushFinalGroupCount: 0,
            writeCoalesceTargetBytes: this._writeCoalesceTargetBytes,
            writeCoalesceMaxChunks: this._writeCoalesceMaxChunks,
        };
    }

    /**
     * @returns {number|null}
     */
    _getDeviceMemoryGiB() {
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
        return memoryGiB;
    }
}
