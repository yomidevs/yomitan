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

import {reportDiagnostics} from '../core/diagnostics-reporter.js';
import {safePerformance} from '../core/safe-performance.js';

const FILE_NAME = 'manabitan-term-content.bin';
const FILE_NAME_SEGMENT_SEPARATOR = '^';
const MAX_FILE_SEGMENT_BYTES = 128 * 1024 * 1024;
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
const LARGE_IMPORT_WRITE_COALESCE_TARGET_BYTES = 64 * 1024 * 1024;
const LARGE_IMPORT_WRITE_FLUSH_THRESHOLD_BYTES = 128 * 1024 * 1024;
const LARGE_IMPORT_EXPECTED_BYTES_THRESHOLD = 128 * 1024 * 1024;

export class TermContentOpfsStore {
    constructor() {
        /** @type {FileSystemFileHandle|null} */
        this._fileHandle = null;
        /** @type {FileSystemWritableFileStream|null} */
        this._writable = null;
        /** @type {Array<{index: number, fileName: string, fileHandle: FileSystemFileHandle, fileLength: number, startOffset: number, readFile: File|null}>} */
        this._segmentStates = [];
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
        /** @type {Map<string, Uint8Array>} */
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
        /** @type {number|null} */
        this._expectedImportBytes = null;
        /** @type {{flushPendingWritesMs: number, awaitQueuedWritesMs: number, closeWritableMs: number, totalMs: number, drainCycleCount: number, writeCallCount: number, singleChunkWriteCount: number, mergedWriteCount: number, totalWriteBytes: number, mergedWriteBytes: number, maxWriteBytes: number, minWriteBytes: number, mergedGroupChunkCount: number, maxMergedGroupChunkCount: number, minMergedGroupChunkCount: number, flushDueToBytesCount: number, flushDueToChunkCount: number, flushFinalGroupCount: number, writeCoalesceTargetBytes: number, writeCoalesceMaxChunks: number}|null} */
        this._lastEndImportSessionMetrics = null;
        /** @type {{drainCycleCount: number, writeCallCount: number, singleChunkWriteCount: number, mergedWriteCount: number, totalWriteBytes: number, mergedWriteBytes: number, maxWriteBytes: number, minWriteBytes: number, mergedGroupChunkCount: number, maxMergedGroupChunkCount: number, minMergedGroupChunkCount: number, flushDueToBytesCount: number, flushDueToChunkCount: number, flushFinalGroupCount: number, writeCoalesceTargetBytes: number, writeCoalesceMaxChunks: number}} */
        this._writeDrainMetrics = this._createEmptyWriteDrainMetrics();
        /** @type {'baseline'|'raw-bytes'} */
        this._importStorageMode = 'baseline';
        /** @type {Record<string, unknown>|null} */
        this._lastReadErrorDetails = null;
        /** @type {Promise<void>} */
        this._mutationQueue = Promise.resolve();
    }

    /**
     * @template T
     * @param {() => Promise<T>} callback
     * @returns {Promise<T>}
     */
    async _runMutationExclusive(callback) {
        const previous = this._mutationQueue;
        /** @type {() => void} */
        let release = () => {};
        this._mutationQueue = new Promise((resolve) => {
            release = resolve;
        });
        await previous;
        try {
            return await callback();
        } finally {
            release();
        }
    }

    /**
     * @returns {Promise<void>}
     */
    async prepare() {
        await this._runMutationExclusive(async () => {
            await this._awaitQueuedWrites();
            await this._closeWritable();
            if (!this._hasStorageDirectoryApi()) {
                return;
            }
            const root = await navigator.storage.getDirectory();
            this._segmentStates = await this._loadSegmentStates(root);
            if (this._segmentStates.length === 0) {
                const fileHandle = await root.getFileHandle(FILE_NAME, {create: true});
                const file = await fileHandle.getFile();
                this._segmentStates.push(this._createSegmentState(0, FILE_NAME, fileHandle, file.size, 0));
            }
            this._length = this._computeSegmentedLength();
            this._syncActiveSegmentState();
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
        });
    }

    /**
     * @returns {Promise<void>}
     */
    async beginImportSession() {
        await this._runMutationExclusive(async () => {
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
            await this._writable.seek(this._getActiveSegmentState()?.fileLength ?? 0);
        });
    }

    /**
     * @returns {Promise<void>}
     */
    async endImportSession() {
        await this._runMutationExclusive(async () => {
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
            let persistedLengthAfterClose = -1;
            let logicalLengthAfterClose = this._length;
            if (this._fileHandle !== null) {
                try {
                    const persistedFile = await this._fileHandle.getFile();
                    persistedLengthAfterClose = persistedFile.size;
                } catch (_) {
                    persistedLengthAfterClose = -1;
                }
            }
            this._lastEndImportSessionMetrics = {
                flushPendingWritesMs,
                awaitQueuedWritesMs,
                closeWritableMs,
                totalMs: safePerformance.now() - tStart,
                persistedLengthAfterClose,
                logicalLengthAfterClose,
                ...this._writeDrainMetrics,
            };
        });
    }

    /**
     * Drains queued import-session writes without ending the import session.
     * @returns {Promise<void>}
     */
    async flushImportWrites() {
        await this._runMutationExclusive(async () => {
            await this._flushPendingWrites();
            await this._awaitQueuedWrites();
        });
    }

    /**
     * @returns {{flushPendingWritesMs: number, awaitQueuedWritesMs: number, closeWritableMs: number, totalMs: number, persistedLengthAfterClose: number, logicalLengthAfterClose: number, drainCycleCount: number, writeCallCount: number, singleChunkWriteCount: number, mergedWriteCount: number, totalWriteBytes: number, mergedWriteBytes: number, maxWriteBytes: number, mergedGroupChunkCount: number, maxMergedGroupChunkCount: number, flushDueToBytesCount: number, flushDueToChunkCount: number, flushFinalGroupCount: number, writeCoalesceTargetBytes: number, writeCoalesceMaxChunks: number}|null}
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
    setExpectedImportBytes(value) {
        this._expectedImportBytes = (typeof value === 'number' && Number.isFinite(value) && value > 0) ?
            Math.max(1, Math.trunc(value)) :
            null;
        this._writeCoalesceTargetBytes = this._computeWriteCoalesceTargetBytes();
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
        await this._runMutationExclusive(async () => {
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
            const root = await navigator.storage.getDirectory();
            for (const state of await this._loadSegmentStates(root)) {
                try {
                    await root.removeEntry(state.fileName);
                } catch (_) {
                    // NOP
                }
            }
            const fileHandle = await root.getFileHandle(FILE_NAME, {create: true});
            const writable = await fileHandle.createWritable();
            await writable.truncate(0);
            await writable.close();
            this._segmentStates = [this._createSegmentState(0, FILE_NAME, fileHandle, 0, 0)];
            this._syncActiveSegmentState();
            this._chunks = [];
            this._chunkOffsets = [];
            this._length = 0;
            this._invalidateReadState();
            this._pendingWriteBytes = 0;
            this._pendingWriteChunks = [];
            this._queuedWritePromise = null;
            this._queuedWriteChunks = [];
            this._importSessionActive = false;
            this._lastEndImportSessionMetrics = null;
            this._writeDrainMetrics = this._createEmptyWriteDrainMetrics();
        });
    }

    /**
     * @param {Uint8Array[]} chunks
     * @returns {Promise<Array<{offset: number, length: number}>>}
     */
    async appendBatch(chunks) {
        return await this._runMutationExclusive(async () => {
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
        });
    }

    /**
     * @param {Blob} blob
     * @returns {Promise<{offset: number, length: number}>}
     */
    async appendBlob(blob) {
        return await this._runMutationExclusive(async () => {
            const length = blob.size;
            const offset = this._getBufferedLength();
            if (length <= 0) {
                return {offset, length: 0};
            }
            if (this._fileHandle === null) {
                const bytes = new Uint8Array(await blob.arrayBuffer());
                /** @type {number[]} */
                const offsets = [];
                /** @type {number[]} */
                const lengths = [];
                this._appendBatchInternal([bytes], offsets, lengths);
                await this._finalizeAppendBatch([bytes]);
                return {offset: offsets[0] ?? offset, length: lengths[0] ?? bytes.byteLength};
            }
            this._invalidateReadState();
            if (this._pendingWriteBytes > 0 || this._pendingWriteChunks.length > 0) {
                await this._flushPendingWrites();
            }
            if (this._queuedWritePromise !== null) {
                await this._awaitQueuedWrites();
            }
            await this._writeBlobToActiveSegments(blob);
            return {offset, length};
        });
    }

    /**
     * @param {Uint8Array[]} chunks
     * @param {number[]} offsets
     * @param {number[]} lengths
     * @returns {Promise<void>}
     */
    async appendBatchToArrays(chunks, offsets, lengths) {
        await this._runMutationExclusive(async () => {
            if (chunks.length === 0) { return; }
            this._appendBatchInternal(chunks, offsets, lengths);
            await this._finalizeAppendBatch(chunks);
        });
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
        let nextOffset = this._getBufferedLength();
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
     * Returns the logical append cursor derived from persisted bytes plus buffered writes.
     * This is more robust than trusting `_length` alone when OPFS write buffering is active.
     * @returns {number}
     */
    _getBufferedLength() {
        if (this._fileHandle === null) {
            return this._length;
        }
        let total = this._computeSegmentedLength();
        total += this._pendingWriteBytes;
        if (this._queuedWriteChunks.length > 0) {
            for (const chunk of this._queuedWriteChunks) {
                total += chunk.byteLength;
            }
        }
        return total;
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
                if (this._importSessionActive) {
                    // Chromium can misalign reserved term-content offsets from persisted OPFS bytes when
                    // large imports accumulate buffered writes across many append batches. Drain each
                    // import append synchronously so subsequent offsets are based on actual file state.
                    await this._flushPendingWrites();
                } else if (this._pendingWriteBytes >= this._flushThresholdBytes) {
                    await this._flushPendingWrites();
                    await this._awaitQueuedWrites();
                    await this._closeWritable();
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
        if (this._fileHandle === null && this._chunks.length === 0 && this._hasStorageDirectoryApi()) {
            await this._reloadSegmentHandlesIfAvailable();
        }
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
            let startOffset = 0;
            for (const state of this._segmentStates) {
                const file = await state.fileHandle.getFile();
                state.fileLength = file.size;
                state.startOffset = startOffset;
                state.readFile = file;
                startOffset += file.size;
            }
            this._length = startOffset;
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
            await this._writable.seek(this._getActiveSegmentState()?.fileLength ?? 0);
        }
        const chunks = this._pendingWriteChunks;
        this._pendingWriteBytes = 0;
        this._pendingWriteChunks = [];
        if (this._importSessionActive) {
            // Import-time content offsets are assigned before the bytes are drained to OPFS.
            // Keep the drain synchronous here so reserved offsets cannot outrun actual file state.
            if (this._queuedWritePromise !== null) {
                await this._awaitQueuedWrites();
            }
            await this._writePendingChunksCoalesced(chunks);
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
        if (this._fileHandle === null) { return; }
        /** @type {Uint8Array[]} */
        let group = [];
        let groupBytes = 0;
        const flushGroup = async (reason = 'final') => {
            if (group.length === 0) {
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
                await this._writeChunkToActiveSegment(group[0]);
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
            await this._writeChunkToActiveSegment(merged);
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
        } catch (error) {
            if (!this._isClosingWritableStreamError(error)) {
                throw error;
            }
        } finally {
            this._writable = null;
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
     * @returns {Promise<void>}
     */
    async _reopenWritableAtActiveSegmentOffset() {
        const activeSegment = this._getActiveSegmentState();
        if (activeSegment === null) {
            this._writable = null;
            return;
        }
        this._writable = await activeSegment.fileHandle.createWritable({keepExistingData: true});
        await this._writable.seek(activeSegment.fileLength);
    }

    /**
     * @param {number} offset
     * @param {number} length
     * @returns {Promise<Uint8Array|null>}
     */
    async readSlice(offset, length) {
        if (offset < 0 || length <= 0) { return null; }
        let end = offset + length;
        if (end > this._length) {
            const reloaded = await this._reloadForPotentialExternalGrowth();
            end = offset + length;
            if (!reloaded || end > this._length) {
                return null;
            }
        }
        const cacheKey = `${offset}:${length}`;
        if (this._exactSliceCacheEnabled && this._lastSliceCacheKey === cacheKey && this._lastSliceCacheValue instanceof Uint8Array) {
            return this._lastSliceCacheValue;
        }
        /** @type {Uint8Array|null} */
        let result;
        if (this._fileHandle === null) {
            if (this._chunks.length === 0 && this._hasStorageDirectoryApi()) {
                await this.ensureLoadedForRead();
            }
            if (this._chunks.length === 0) { return null; }
            result = this._readSliceFromMemory(offset, length);
        } else {
            if (!this._loadedForRead) {
                await this.ensureLoadedForRead();
            }
            try {
                result = await this._readSliceFromFile(offset, length);
            } catch (error) {
                const state = this._findSegmentStateForOffset(offset);
                this._lastReadErrorDetails = {
                    offset,
                    length,
                    end,
                    totalLength: this._length,
                    loadedForRead: this._loadedForRead,
                    segmentCount: this._segmentStates.length,
                    activeSegmentIndex: this._getActiveSegmentState()?.index ?? null,
                    matchedSegmentIndex: state?.index ?? null,
                    matchedSegmentStartOffset: state?.startOffset ?? null,
                    matchedSegmentFileLength: state?.fileLength ?? null,
                    matchedSegmentHasReadFile: state?.readFile instanceof File,
                    errorName: this._asErrorName(error),
                    errorText: this._asErrorText(error),
                };
                reportDiagnostics('term-content-opfs-read-error', this._lastReadErrorDetails);
                throw error;
            }
            if (result === null) {
                const state = this._findSegmentStateForOffset(offset);
                this._lastReadErrorDetails = {
                    offset,
                    length,
                    end,
                    totalLength: this._length,
                    loadedForRead: this._loadedForRead,
                    segmentCount: this._segmentStates.length,
                    activeSegmentIndex: this._getActiveSegmentState()?.index ?? null,
                    matchedSegmentIndex: state?.index ?? null,
                    matchedSegmentStartOffset: state?.startOffset ?? null,
                    matchedSegmentFileLength: state?.fileLength ?? null,
                    matchedSegmentHasReadFile: state?.readFile instanceof File,
                    reason: 'read-slice-null',
                };
                reportDiagnostics('term-content-opfs-read-null', this._lastReadErrorDetails);
            } else {
                this._lastReadErrorDetails = null;
            }
        }
        if (this._exactSliceCacheEnabled && result instanceof Uint8Array) {
            this._lastSliceCacheKey = cacheKey;
            this._lastSliceCacheValue = result;
        }
        return result;
    }

    /**
     * Refreshes file snapshots once when another context may have appended data.
     * @returns {Promise<boolean>}
     */
    async _reloadForPotentialExternalGrowth() {
        if (this._fileHandle === null || !this._hasStorageDirectoryApi()) {
            return false;
        }
        this._invalidateReadState();
        try {
            await this._reloadSegmentHandlesIfAvailable();
            await this.ensureLoadedForRead();
            return true;
        } catch (_) {
            return false;
        }
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
        if (this._segmentStates.length === 0) {
            return null;
        }
        for (let attempt = 0; attempt < 2; ++attempt) {
            try {
                const output = new Uint8Array(length);
                let outputOffset = 0;
                let cursor = offset;
                while (outputOffset < length) {
                    const state = this._findSegmentStateForOffset(cursor);
                    if (state === null || state.readFile === null) {
                        return null;
                    }
                    const localOffset = cursor - state.startOffset;
                    const copyLength = Math.min(length - outputOffset, state.fileLength - localOffset);
                    if (copyLength <= 0) {
                        return null;
                    }
                    await this._copyFileRangeIntoOutput(state, localOffset, copyLength, output, outputOffset);
                    outputOffset += copyLength;
                    cursor += copyLength;
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
     * @param {{index: number, readFile: File|null, fileLength: number}} state
     * @param {number} pageIndex
     * @returns {Promise<Uint8Array|null>}
     */
    async _getReadPage(state, pageIndex) {
        const cacheKey = `${state.index}:${pageIndex}`;
        const cached = this._readPageCache.get(cacheKey);
        if (typeof cached !== 'undefined') {
            this._touchReadPage(cacheKey, cached);
            return cached;
        }
        const file = state.readFile;
        if (file === null) {
            return null;
        }
        const pageOffset = pageIndex * READ_PAGE_SIZE_BYTES;
        if (pageOffset >= state.fileLength) {
            return null;
        }
        const pageEnd = Math.min(state.fileLength, pageOffset + READ_PAGE_SIZE_BYTES);
        const bytes = new Uint8Array(await file.slice(pageOffset, pageEnd).arrayBuffer());
        this._setReadPage(cacheKey, bytes);
        return bytes;
    }

    /**
     * @param {string} cacheKey
     * @param {Uint8Array} page
     */
    _touchReadPage(cacheKey, page) {
        this._readPageCache.delete(cacheKey);
        this._readPageCache.set(cacheKey, page);
    }

    /**
     * @param {string} cacheKey
     * @param {Uint8Array} page
     */
    _setReadPage(cacheKey, page) {
        this._readPageCache.set(cacheKey, page);
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
        for (const state of this._segmentStates) {
            state.readFile = null;
        }
        this._readPageCache.clear();
        this._lastSliceCacheKey = '';
        this._lastSliceCacheValue = null;
    }

    /**
     * @returns {Record<string, unknown>|null}
     */
    getLastReadErrorDetails() {
        return this._lastReadErrorDetails === null ? null : {...this._lastReadErrorDetails};
    }

    /**
     * @returns {Record<string, unknown>}
     */
    getDebugState() {
        return {
            hasStorageDirectoryApi: this._hasStorageDirectoryApi(),
            hasFileHandle: this._fileHandle !== null,
            loadedForRead: this._loadedForRead,
            totalLength: this._length,
            chunkCount: this._chunks.length,
            chunkOffsetCount: this._chunkOffsets.length,
            segmentCount: this._segmentStates.length,
            activeSegmentIndex: this._getActiveSegmentState()?.index ?? null,
            segments: this._segmentStates.map((state) => ({
                index: state.index,
                fileName: state.fileName,
                fileLength: state.fileLength,
                startOffset: state.startOffset,
                hasReadFile: state.readFile instanceof File,
            })),
            lastReadErrorDetails: this.getLastReadErrorDetails(),
        };
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
        for (const state of this._segmentStates) {
            state.readFile = null;
        }
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
                    this._segmentStates = await this._loadSegmentStates(root);
                    if (this._segmentStates.length === 0) {
                        const fileHandle = await root.getFileHandle(FILE_NAME, {create: true});
                        const file = await fileHandle.getFile();
                        this._segmentStates.push(this._createSegmentState(0, FILE_NAME, fileHandle, file.size, 0));
                    }
                    this._syncActiveSegmentState();
                }
            } catch (_) {
                // NOP
            }
        }
        try {
            let startOffset = 0;
            for (const state of this._segmentStates) {
                const file = await state.fileHandle.getFile();
                state.fileLength = file.size;
                state.startOffset = startOffset;
                state.readFile = file;
                startOffset += file.size;
            }
            this._length = startOffset;
            this._readPageCache.clear();
            this._loadedForRead = true;
            return true;
        } catch (_) {
            return false;
        }
    }

    /**
     * @returns {boolean}
     */
    _hasStorageDirectoryApi() {
        return typeof navigator !== 'undefined' && 'storage' in navigator && 'getDirectory' in navigator.storage;
    }

    /**
     * @returns {Promise<boolean>}
     */
    async _reloadSegmentHandlesIfAvailable() {
        if (!this._hasStorageDirectoryApi()) {
            return false;
        }
        const root = await navigator.storage.getDirectory();
        this._segmentStates = await this._loadSegmentStates(root);
        if (this._segmentStates.length === 0) {
            return false;
        }
        this._length = this._computeSegmentedLength();
        this._syncActiveSegmentState();
        this._invalidateReadState();
        return this._fileHandle !== null;
    }

    /**
     * @returns {{index: number, fileName: string, fileHandle: FileSystemFileHandle, fileLength: number, startOffset: number, readFile: File|null}|null}
     */
    _getActiveSegmentState() {
        return this._segmentStates.length > 0 ? this._segmentStates[this._segmentStates.length - 1] : null;
    }

    /** */
    _syncActiveSegmentState() {
        const activeSegment = this._getActiveSegmentState();
        this._fileHandle = activeSegment?.fileHandle ?? null;
        this._writable = null;
    }

    /**
     * @param {FileSystemDirectoryHandle} root
     * @returns {Promise<Array<{index: number, fileName: string, fileHandle: FileSystemFileHandle, fileLength: number, startOffset: number, readFile: File|null}>>}
     */
    async _loadSegmentStates(root) {
        const entriesMethod = /** @type {unknown} */ (Reflect.get(root, 'entries'));
        if (typeof entriesMethod !== 'function') {
            return [];
        }
        const entries = /** @type {() => AsyncIterable<[string, FileSystemHandle]>} */ (entriesMethod).call(root);
        /** @type {Array<{index: number, fileName: string, fileHandle: FileSystemFileHandle, fileLength: number, startOffset: number, readFile: File|null}>} */
        const states = [];
        for await (const [name, handle] of entries) {
            if (handle.kind !== 'file') { continue; }
            const fileName = String(name);
            const index = this._parseSegmentIndexFromFileName(fileName);
            if (index === null) { continue; }
            const fileHandle = /** @type {FileSystemFileHandle} */ (handle);
            let fileLength = 0;
            try {
                fileLength = (await fileHandle.getFile()).size;
            } catch (_) {
                continue;
            }
            states.push(this._createSegmentState(index, fileName, fileHandle, fileLength, 0));
        }
        states.sort((a, b) => a.index - b.index);
        let startOffset = 0;
        for (const state of states) {
            state.startOffset = startOffset;
            startOffset += state.fileLength;
        }
        return states;
    }

    /**
     * @param {number} index
     * @param {string} fileName
     * @param {FileSystemFileHandle} fileHandle
     * @param {number} fileLength
     * @param {number} startOffset
     * @returns {{index: number, fileName: string, fileHandle: FileSystemFileHandle, fileLength: number, startOffset: number, readFile: File|null}}
     */
    _createSegmentState(index, fileName, fileHandle, fileLength, startOffset) {
        return {index, fileName, fileHandle, fileLength, startOffset, readFile: null};
    }

    /**
     * @returns {number}
     */
    _computeSegmentedLength() {
        let total = 0;
        for (const state of this._segmentStates) {
            state.startOffset = total;
            total += state.fileLength;
        }
        return total;
    }

    /**
     * @param {number} index
     * @returns {string}
     */
    _getSegmentFileName(index) {
        if (index <= 0) {
            return FILE_NAME;
        }
        const suffixIndex = FILE_NAME.lastIndexOf('.');
        if (suffixIndex < 0) {
            return `${FILE_NAME}${FILE_NAME_SEGMENT_SEPARATOR}${index}`;
        }
        return `${FILE_NAME.slice(0, suffixIndex)}${FILE_NAME_SEGMENT_SEPARATOR}${index}${FILE_NAME.slice(suffixIndex)}`;
    }

    /**
     * @param {string} fileName
     * @returns {number|null}
     */
    _parseSegmentIndexFromFileName(fileName) {
        if (fileName === FILE_NAME) {
            return 0;
        }
        const suffixIndex = FILE_NAME.lastIndexOf('.');
        if (suffixIndex < 0) {
            return null;
        }
        const prefix = FILE_NAME.slice(0, suffixIndex);
        const suffix = FILE_NAME.slice(suffixIndex);
        if (!fileName.startsWith(`${prefix}${FILE_NAME_SEGMENT_SEPARATOR}`) || !fileName.endsWith(suffix)) {
            return null;
        }
        const value = fileName.slice(prefix.length + FILE_NAME_SEGMENT_SEPARATOR.length, fileName.length - suffix.length);
        return /^[0-9]+$/.test(value) ? Number.parseInt(value, 10) : null;
    }

    /**
     * @param {number} offset
     * @returns {{index: number, fileName: string, fileHandle: FileSystemFileHandle, fileLength: number, startOffset: number, readFile: File|null}|null}
     */
    _findSegmentStateForOffset(offset) {
        let low = 0;
        let high = this._segmentStates.length - 1;
        while (low <= high) {
            const mid = (low + high) >>> 1;
            const state = this._segmentStates[mid];
            const start = state.startOffset;
            const end = start + state.fileLength;
            if (offset < start) {
                high = mid - 1;
            } else if (offset >= end) {
                low = mid + 1;
            } else {
                return state;
            }
        }
        return null;
    }

    /**
     * @param {{index: number, fileName: string, fileHandle: FileSystemFileHandle, fileLength: number, startOffset: number, readFile: File|null}} state
     * @param {number} localOffset
     * @param {number} length
     * @param {Uint8Array} output
     * @param {number} outputOffset
     * @returns {Promise<void>}
     */
    async _copyFileRangeIntoOutput(state, localOffset, length, output, outputOffset) {
        const pageSize = READ_PAGE_SIZE_BYTES;
        const startPage = Math.floor(localOffset / pageSize);
        const endPage = Math.floor((localOffset + length - 1) / pageSize);
        for (let pageIndex = startPage; pageIndex <= endPage; ++pageIndex) {
            const page = await this._getReadPage(state, pageIndex);
            if (page === null) {
                throw new Error('Missing term-content page');
            }
            const pageStartOffset = pageIndex * pageSize;
            const rangeStart = Math.max(localOffset, pageStartOffset);
            const rangeEnd = Math.min(localOffset + length, pageStartOffset + page.byteLength);
            const copyLength = rangeEnd - rangeStart;
            if (copyLength <= 0) { continue; }
            const pageStart = rangeStart - pageStartOffset;
            output.set(page.subarray(pageStart, pageStart + copyLength), outputOffset);
            outputOffset += copyLength;
        }
    }

    /**
     * @param {number} nextChunkBytes
     * @returns {Promise<void>}
     */
    async _rollActiveSegmentIfNeeded(nextChunkBytes) {
        const activeSegment = this._getActiveSegmentState();
        if (activeSegment === null) {
            return;
        }
        if (this._writable === null) {
            this._writable = await activeSegment.fileHandle.createWritable({keepExistingData: true});
            await this._writable.seek(activeSegment.fileLength);
        }
        if (activeSegment.fileLength <= 0 || (activeSegment.fileLength + nextChunkBytes) <= MAX_FILE_SEGMENT_BYTES) {
            return;
        }
        await this._closeWritable();
        const root = await navigator.storage.getDirectory();
        const nextIndex = activeSegment.index + 1;
        const nextFileName = this._getSegmentFileName(nextIndex);
        const nextFileHandle = await root.getFileHandle(nextFileName, {create: true});
        const nextFile = await nextFileHandle.getFile();
        const nextState = this._createSegmentState(nextIndex, nextFileName, nextFileHandle, nextFile.size, activeSegment.startOffset + activeSegment.fileLength);
        this._segmentStates.push(nextState);
        this._syncActiveSegmentState();
        this._writable = await nextFileHandle.createWritable({keepExistingData: true});
        await this._writable.seek(nextState.fileLength);
    }

    /**
     * @param {Uint8Array} chunk
     * @returns {Promise<void>}
     */
    async _writeChunkToActiveSegment(chunk) {
        if (chunk.byteLength <= 0) {
            return;
        }
        await this._rollActiveSegmentIfNeeded(chunk.byteLength);
        if (this._writable === null) {
            return;
        }
        const activeSegment = this._getActiveSegmentState();
        if (activeSegment === null) {
            return;
        }
        let wrote = false;
        try {
            await this._writable.write(chunk);
            wrote = true;
        } catch (error) {
            if (!this._isClosingWritableStreamError(error)) {
                throw error;
            }
            this._writable = null;
            await this._reopenWritableAtActiveSegmentOffset();
            if (this._writable === null) {
                throw error;
            }
            await this._writable.write(chunk);
            wrote = true;
        }
        if (wrote) {
            activeSegment.fileLength += chunk.byteLength;
            this._length = Math.max(this._length, activeSegment.startOffset + activeSegment.fileLength);
        }
    }

    /**
     * @param {Blob} blob
     * @returns {Promise<void>}
     */
    async _writeBlobToActiveSegments(blob) {
        let blobOffset = 0;
        while (blobOffset < blob.size) {
            const activeSegment = this._getActiveSegmentState();
            if (activeSegment === null) {
                return;
            }
            if (activeSegment.fileLength >= MAX_FILE_SEGMENT_BYTES) {
                await this._rollActiveSegmentIfNeeded(1);
                continue;
            }
            const remainingInSegment = MAX_FILE_SEGMENT_BYTES - activeSegment.fileLength;
            const chunkSize = Math.min(remainingInSegment, blob.size - blobOffset);
            if (chunkSize <= 0) {
                await this._rollActiveSegmentIfNeeded(1);
                continue;
            }
            await this._rollActiveSegmentIfNeeded(chunkSize);
            if (this._writable === null) {
                return;
            }
            const chunk = blob.slice(blobOffset, blobOffset + chunkSize);
            ++this._writeDrainMetrics.writeCallCount;
            ++this._writeDrainMetrics.singleChunkWriteCount;
            this._writeDrainMetrics.totalWriteBytes += chunkSize;
            if (chunkSize > this._writeDrainMetrics.maxWriteBytes) {
                this._writeDrainMetrics.maxWriteBytes = chunkSize;
            }
            if (this._writeDrainMetrics.minWriteBytes === 0 || chunkSize < this._writeDrainMetrics.minWriteBytes) {
                this._writeDrainMetrics.minWriteBytes = chunkSize;
            }
            await this._writable.write(chunk);
            const currentActiveSegment = this._getActiveSegmentState();
            if (currentActiveSegment !== null) {
                currentActiveSegment.fileLength += chunkSize;
                this._length = Math.max(this._length, currentActiveSegment.startOffset + currentActiveSegment.fileLength);
            }
            blobOffset += chunkSize;
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
        if (
            this._importStorageMode === 'raw-bytes' &&
            this._expectedImportBytes !== null &&
            this._expectedImportBytes >= LARGE_IMPORT_EXPECTED_BYTES_THRESHOLD
        ) {
            return LARGE_IMPORT_WRITE_COALESCE_TARGET_BYTES;
        }
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
        if (
            this._importStorageMode === 'raw-bytes' &&
            this._expectedImportBytes !== null &&
            this._expectedImportBytes >= LARGE_IMPORT_EXPECTED_BYTES_THRESHOLD
        ) {
            return LARGE_IMPORT_WRITE_FLUSH_THRESHOLD_BYTES;
        }
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
