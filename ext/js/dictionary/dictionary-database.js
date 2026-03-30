/*
 * Copyright (C) 2023-2025  Yomitan Authors
 * Copyright (C) 2016-2022  Yomichan Authors
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

/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */
// @ts-nocheck

import {initWasm, Resvg} from '../../lib/resvg-wasm.js';
import {createApiMap, invokeApiMapHandler} from '../core/api-map.js';
import {reportDiagnostics} from '../core/diagnostics-reporter.js';
import {ExtensionError} from '../core/extension-error.js';
import {parseJson} from '../core/json.js';
import {log} from '../core/log.js';
import {safePerformance} from '../core/safe-performance.js';
import {toError} from '../core/to-error.js';
import {stringReverse} from '../core/utilities.js';
import {deleteOpfsDatabaseFiles, didLastOpenUseFallbackStorage, getLastOpenStorageDiagnostics, getSqlite3, importOpfsDatabase, openOpfsDatabase} from './sqlite-wasm.js';
import {
    compressTermContentZstd,
    decompressTermContentZstd,
    initializeTermContentZstd,
    logTermContentZstdError,
    resolveTermContentZstdDictName,
} from './zstd-term-content.js';
import {
    decodeRawTermContentHeader,
    RAW_TERM_CONTENT_COMPRESSED_SHARED_GLOSSARY_DICT_NAME,
    decodeRawTermContentSharedGlossaryHeader,
    encodeRawTermContentBinary,
    getRawTermContentGlossaryJsonBytes,
    isRawTermContentBinary,
    isRawTermContentSharedGlossaryBinary,
    RAW_TERM_CONTENT_DICT_NAME,
    RAW_TERM_CONTENT_SHARED_GLOSSARY_DICT_NAME,
} from './raw-term-content.js';
import {decompress as zstdDecompress} from '../../lib/zstd-wasm.js';
import {TermContentOpfsStore} from './term-content-opfs-store.js';
import {TermRecordOpfsStore} from './term-record-opfs-store.js';

const CURRENT_DICTIONARY_SCHEMA_VERSION = 5;
const TRANSIENT_UPDATE_TITLE_PATTERN = /\[(?:update-staging|cutover|replaced) [^\]]+\]/;
const TERM_ENTRY_CONTENT_CACHE_MAX_ENTRIES = 4096;
const DEFAULT_STATEMENT_CACHE_MAX_ENTRIES = 256;
const LOW_MEMORY_STATEMENT_CACHE_MAX_ENTRIES = 128;
const DEFAULT_TERM_EXACT_PRESENCE_CACHE_MAX_ENTRIES = 25000;
const LOW_MEMORY_TERM_EXACT_PRESENCE_CACHE_MAX_ENTRIES = 8000;
const TERM_BULK_ADD_STAGING_MAX_ROWS = 3000;
const DEFAULT_TERM_BULK_ADD_STAGING_MAX_ROWS = 4096;
const HIGH_MEMORY_TERM_BULK_ADD_STAGING_MAX_ROWS = 10240;
const TERM_CONTENT_STORAGE_MODE_BASELINE = 'baseline';
const TERM_CONTENT_STORAGE_MODE_RAW_BYTES = 'raw-bytes';
const DEFAULT_RAW_TERM_CONTENT_PACK_TARGET_BYTES = 4 * 1024 * 1024;
const LARGE_ARTIFACT_FIXED_PACK_MIN_TOTAL_ROWS = 2_000_000;
const EXTERNAL_MEDIA_BULK_INSERT_BATCH_SIZE = 512;
const ZIP_COMPRESSION_METHOD_STORE = 0;
const ZIP_COMPRESSION_METHOD_DEFLATE = 8;

/**
 * @param {Uint8Array} bytes
 * @param {number} compressionMethod
 * @param {number} uncompressedLength
 * @returns {Promise<Uint8Array>}
 */
async function inflateZipMediaContent(bytes, compressionMethod, uncompressedLength) {
    switch (compressionMethod) {
        case ZIP_COMPRESSION_METHOD_STORE:
            return bytes;
        case ZIP_COMPRESSION_METHOD_DEFLATE: {
            if (typeof DecompressionStream === 'undefined') {
                throw new Error('DecompressionStream is unavailable for compressed media content');
            }
            const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
            const inflated = new Uint8Array(await new Response(stream).arrayBuffer());
            if (uncompressedLength > 0 && inflated.byteLength !== uncompressedLength) {
                throw new Error(`Compressed media length mismatch: expected ${uncompressedLength}, got ${inflated.byteLength}`);
            }
            return inflated;
        }
        default:
            throw new Error(`Unsupported zip media compression method: ${compressionMethod}`);
    }
}

/**
 * @param {string} value
 * @returns {[number, number]|null}
 */
function parseContentHashHexPair(value) {
    if (value.length !== 16) { return null; }
    const hash1 = Number.parseInt(value.slice(0, 8), 16);
    const hash2 = Number.parseInt(value.slice(8, 16), 16);
    if (!Number.isFinite(hash1) || !Number.isFinite(hash2)) { return null; }
    return [hash1 >>> 0, hash2 >>> 0];
}

/**
 * @param {Uint8Array[]} chunks
 * @param {number} targetBytes
 * @returns {{packedChunks: Uint8Array[], sourceChunkIndices: number[], sourceChunkLocalOffsets: number[]}}
 */
function packContentChunksIntoSlabs(chunks, targetBytes) {
    /** @type {Uint8Array[]} */
    const packedChunks = [];
    /** @type {number[]} */
    const sourceChunkIndices = new Array(chunks.length);
    /** @type {number[]} */
    const sourceChunkLocalOffsets = new Array(chunks.length);
    let startIndex = 0;
    while (startIndex < chunks.length) {
        let totalBytes = 0;
        let endIndex = startIndex;
        while (endIndex < chunks.length) {
            const nextBytes = chunks[endIndex].byteLength;
            if (totalBytes > 0 && (totalBytes + nextBytes) > targetBytes) {
                break;
            }
            totalBytes += nextBytes;
            ++endIndex;
        }
        if (totalBytes <= 0) {
            sourceChunkIndices[startIndex] = packedChunks.length;
            sourceChunkLocalOffsets[startIndex] = 0;
            packedChunks.push(chunks[startIndex]);
            ++startIndex;
            continue;
        }
        const packedIndex = packedChunks.length;
        const packed = new Uint8Array(totalBytes);
        let offset = 0;
        for (let i = startIndex; i < endIndex; ++i) {
            const chunk = chunks[i];
            sourceChunkIndices[i] = packedIndex;
            sourceChunkLocalOffsets[i] = offset;
            packed.set(chunk, offset);
            offset += chunk.byteLength;
        }
        packedChunks.push(packed);
        startIndex = endIndex;
    }
    return {packedChunks, sourceChunkIndices, sourceChunkLocalOffsets};
}

/**
 * @param {string} title
 * @returns {{stage: string, token: string}|null}
 */
function parseTransientUpdateTitleInfo(title) {
    const match = `${title}`.trim().match(/\[(update-staging|cutover|replaced) ([^\]]+)\]$/);
    if (match === null) { return null; }
    const [, stage, token] = match;
    if (typeof stage !== 'string' || typeof token !== 'string' || token.length === 0) {
        return null;
    }
    return {stage, token};
}

/**
 * @param {string} title
 * @param {unknown} summary
 * @returns {boolean}
 */
function isRecognizedTransientUpdateTitle(title, summary) {
    const transientInfo = parseTransientUpdateTitleInfo(title);
    if (transientInfo === null) { return false; }
    if (!(typeof summary === 'object' && summary !== null && !Array.isArray(summary))) {
        return false;
    }
    const summaryToken = typeof Reflect.get(summary, 'updateSessionToken') === 'string' ? Reflect.get(summary, 'updateSessionToken').trim() : '';
    const summaryStage = typeof Reflect.get(summary, 'transientUpdateStage') === 'string' ? Reflect.get(summary, 'transientUpdateStage').trim() : '';
    return summaryToken === transientInfo.token && summaryStage === transientInfo.stage;
}

/**
 * @param {Uint8Array[]} chunks
 * @param {number} targetBytes
 * @param {number} fixedChunkBytes
 * @returns {{packedChunks: Uint8Array[], packedRowStarts: number[], packedRowCounts: number[]}}
 */
function packFixedSizeContentChunksIntoSlabs(chunks, targetBytes, fixedChunkBytes) {
    /** @type {Uint8Array[]} */
    const packedChunks = [];
    const packedRowStarts = [];
    const packedRowCounts = [];
    if (chunks.length === 0 || fixedChunkBytes <= 0) {
        return {packedChunks, packedRowStarts, packedRowCounts};
    }
    const rowsPerPackedChunk = Math.max(1, Math.floor(targetBytes / fixedChunkBytes));
    for (let startIndex = 0; startIndex < chunks.length;) {
        const endIndex = Math.min(chunks.length, startIndex + rowsPerPackedChunk);
        const rowCount = endIndex - startIndex;
        const packed = new Uint8Array(rowCount * fixedChunkBytes);
        let offset = 0;
        for (let i = startIndex; i < endIndex; ++i) {
            packed.set(chunks[i], offset);
            offset += fixedChunkBytes;
        }
        packedChunks.push(packed);
        packedRowStarts.push(startIndex);
        packedRowCounts.push(rowCount);
        startIndex = endIndex;
    }
    return {packedChunks, packedRowStarts, packedRowCounts};
}

/**
 * @param {unknown[]} rows
 * @returns {import('./term-record-wasm-encoder.js').PreinternedTermRecordPlan|null}
 */
function getTermRecordPreinternedPlan(rows) {
    const value = /** @type {{termRecordPreinternedPlan?: import('./term-record-wasm-encoder.js').PreinternedTermRecordPlan}} */ (/** @type {unknown} */ (rows)).termRecordPreinternedPlan;
    return value ?? null;
}

/**
 * @param {import('./term-record-wasm-encoder.js').PreinternedTermRecordPlan|null} plan
 * @param {number} start
 * @param {number} count
 * @returns {import('./term-record-wasm-encoder.js').PreinternedTermRecordPlan|null}
 */
function sliceTermRecordPreinternedPlan(plan, start, count) {
    if (plan === null) { return null; }
    return {
        stringLengths: plan.stringLengths,
        stringsBuffer: plan.stringsBuffer,
        expressionIndexes: plan.expressionIndexes.subarray(start, start + count),
        readingIndexes: plan.readingIndexes.subarray(start, start + count),
    };
}


/**
 * @typedef {object} InsertStatement
 * @property {string} sql
 * @property {(item: unknown) => import('@sqlite.org/sqlite-wasm').BindingSpec} bind
 */

export class DictionaryDatabase {
    constructor() {
        /** @type {import('@sqlite.org/sqlite-wasm').Sqlite3Static|null} */
        this._sqlite3 = null;
        /** @type {import('@sqlite.org/sqlite-wasm').Database|null} */
        this._db = null;
        /** @type {boolean} */
        this._isOpening = false;
        /** @type {Promise<void>|null} */
        this._openingPromise = null;
        /** @type {boolean} */
        this._usesFallbackStorage = false;
        /** @type {{mode: string, forceFallback: boolean, hasOpfsDbCtor: boolean, hasOpfsImportDb: boolean, hasWasmfsDir: boolean, attempts?: Array<{strategy: string, target: string, flags: string, error: string}>, lastError?: string|null}|null} */
        this._openStorageDiagnostics = null;
        /** @type {Record<string, unknown>|null} */
        this._startupCleanupIncompleteImportsSummary = null;
        /** @type {Record<string, unknown>|null} */
        this._startupCleanupMissingTermRecordShardsSummary = null;
        /** @type {number} */
        this._bulkImportDepth = 0;
        /** @type {boolean} */
        this._bulkImportTransactionOpen = false;
        /** @type {boolean} */
        this._deferTermsVirtualTableSync = false;
        /** @type {boolean} */
        this._termsVirtualTableDirty = false;
        /** @type {Map<string, number>} */
        this._termEntryContentIdByKey = new Map();
        /** @type {Map<string, number>} */
        this._termEntryContentIdByHash = new Map();
        /** @type {Map<string, {id: number, offset: number, length: number, dictName: string}>} */
        this._termEntryContentMetaByHash = new Map();
        /** @type {Map<number, Map<number, {id: number, offset: number, length: number, dictName: string}>>} */
        this._termEntryContentMetaByHashPair = new Map();
        /** @type {boolean} */
        this._termEntryContentHasExistingRows = true;
        /** @type {boolean} */
        this._enableTermEntryContentDedup = true;
        /** @type {Map<string, import('@sqlite.org/sqlite-wasm').PreparedStatement>} */
        this._statementCache = new Map();
        /** @type {number} */
        this._statementCacheMaxEntries = this._computeStatementCacheMaxEntries();
        /** @type {Map<string, {definitionTags: string|null, termTags: string|undefined, rules: string, glossaryJson?: string, glossary?: import('dictionary-data').TermGlossary[]}>} */
        this._termEntryContentCache = new Map();
        /** @type {Map<string, {contentOffset: number, contentLength: number, contentDictName: string, uncompressedLength: number}>} */
        this._sharedGlossaryArtifactMetaByDictionary = new Map();
        /** @type {Map<string, Uint8Array>} */
        this._sharedGlossaryArtifactInflatedByDictionary = new Map();
        /** @type {Record<string, unknown>|null} */
        this._lastReplaceDictionaryTitleDebug = null;
        /** @type {number} */
        this._termEntryContentCacheMaxEntries = TERM_ENTRY_CONTENT_CACHE_MAX_ENTRIES;
        /** @type {TextEncoder} */
        this._textEncoder = new TextEncoder();
        /** @type {TextDecoder} */
        this._textDecoder = new TextDecoder();
        /** @type {boolean} */
        this._termContentZstdInitialized = false;
        /** @type {'baseline'|'raw-bytes'} */
        this._termContentStorageMode = TERM_CONTENT_STORAGE_MODE_BASELINE;
        /** @type {Map<string, boolean>} */
        this._termExactPresenceCache = new Map();
        /** @type {number} */
        this._termExactPresenceCacheMaxEntries = this._computeTermExactPresenceCacheMaxEntries();
        /** @type {Map<string, boolean>} */
        this._termPrefixNegativeCache = new Map();
        /** @type {Map<string, {expression: Map<string, number[]>, reading: Map<string, number[]>, expressionReverse: Map<string, number[]>, readingReverse: Map<string, number[]>, pair: Map<string, number[]>, sequence: Map<number, number[]>}>} */
        this._directTermIndexByDictionary = new Map();
        /** @type {import('@sqlite.org/sqlite-wasm').sqlite3_module|null} */
        this._termsVtabModule = null;
        /** @type {boolean} */
        this._termsVtabModuleRegistered = false;
        /** @type {Map<number, {ids: number[], index: number}>} */
        this._termsVtabCursorState = new Map();
        /** @type {boolean} */
        this._enableSqliteSecondaryIndexes = false;
        /** @type {number} */
        this._termContentCompressionMinBytes = 1048576;
        /** @type {number} */
        this._rawTermContentPackTargetBytes = DEFAULT_RAW_TERM_CONTENT_PACK_TARGET_BYTES;
        /** @type {boolean} */
        this._importDebugLogging = false;
        /** @type {number} */
        this._termBulkAddLogIntervalMs = 3000;
        /** @type {number} */
        this._termBulkAddFailFastMinRowsPerSecond = 1200;
        /** @type {number} */
        this._termBulkAddFailFastSlowBatchMs = 15000;
        /** @type {number} */
        this._termBulkAddFailFastMinRowsBeforeCheck = 32768;
        /** @type {number} */
        this._termBulkAddFailFastWindowSize = 5;
        /** @type {number} */
        this._termBulkAddBatchSize = 25000;
        /** @type {boolean} */
        this._adaptiveTermBulkAddBatchSize = true;
        /** @type {boolean} */
        this._retryBeginImmediateTransaction = false;
        /** @type {boolean} */
        this._skipIntraBatchContentDedup = false;
        /** @type {number} */
        this._termBulkAddStagingMaxRows = this._computeDefaultTermBulkAddStagingMaxRows();
        /** @type {boolean} */
        this._termRecordRowAppendFastPath = true;
        /** @type {{contentAppendMs: number, termRecordBuildMs: number, termRecordEncodeMs: number, termRecordWriteMs: number, termsVtabInsertMs: number}|null} */
        this._lastBulkAddTermsMetrics = null;
        /** @type {TermContentOpfsStore} */
        this._termContentStore = new TermContentOpfsStore();
        /** @type {TermRecordOpfsStore} */
        this._termRecordStore = new TermRecordOpfsStore();
        /**
         * @type {Worker?}
         */
        this._worker = null;

        /**
         * @type {Uint8Array?}
         */
        this._resvgFontBuffer = null;

        /** @type {import('dictionary-database').ApiMap} */
        this._apiMap = createApiMap([
            ['drawMedia', this._onDrawMedia.bind(this)],
        ]);
    }

    /** */
    async prepare() {
        if (this._db !== null) {
            throw new Error('Database already open');
        }
        if (this._isOpening) {
            if (this._openingPromise !== null) {
                await this._openingPromise;
                return;
            }
            throw new Error('Already opening');
        }

        this._openingPromise = (async () => {
            this._isOpening = true;
            try {
                await this._openConnection();
                await initializeTermContentZstd();
                this._termContentZstdInitialized = true;
                await this._deleteLegacyIndexedDb();
                await this._cleanupIncompleteImports();
                await this._cleanupMissingTermRecordShards();

                // keep existing draw worker split behaviour.
                const isWorker = self.constructor.name !== 'Window';
                if (!isWorker && this._worker === null) {
                    this._worker = new Worker('/js/dictionary/dictionary-database-worker-main.js', {type: 'module'});
                    this._worker.addEventListener('error', (event) => {
                        log.log('Worker terminated with error:', event);
                    });
                    this._worker.addEventListener('unhandledrejection', (event) => {
                        log.log('Unhandled promise rejection in worker:', event);
                    });
                } else if (isWorker && this._resvgFontBuffer === null) {
                    try {
                        await initWasm(fetch('/lib/resvg.wasm'));
                    } catch (error) {
                        const message = (error instanceof Error) ? error.message : String(error);
                        if (!/Already initialized/i.test(message)) {
                            throw error;
                        }
                    }

                    const font = await fetch('/fonts/NotoSansJP-Regular.ttf');
                    const fontData = await font.arrayBuffer();
                    this._resvgFontBuffer = new Uint8Array(fontData);
                }
            } finally {
                this._isOpening = false;
            }
        })();
        try {
            await this._openingPromise;
        } finally {
            this._openingPromise = null;
        }
    }

    /** */
    async close() {
        if (this._isOpening && this._openingPromise !== null) {
            await this._openingPromise;
        }
        if (this._db === null) {
            throw new Error('Database is not open');
        }
        await this._termContentStore.endImportSession();
        await this._termRecordStore.endImportSession();
        if (this._bulkImportTransactionOpen) {
            try {
                this._db.exec('ROLLBACK');
            } catch (_) { /* NOP */ }
            this._bulkImportTransactionOpen = false;
        }
        this._clearCachedStatements();
        this._termEntryContentCache.clear();
        this._termEntryContentIdByHash.clear();
        this._termExactPresenceCache.clear();
        this._termPrefixNegativeCache.clear();
        this._directTermIndexByDictionary.clear();
        this._clearTermsVtabCursorState();
        this._termsVtabModuleRegistered = false;
        this._db.close();
        this._db = null;
        this._usesFallbackStorage = false;
    }

    /**
     * @returns {boolean}
     */
    isPrepared() {
        return this._db !== null;
    }

    /**
     * @returns {boolean}
     */
    isOpening() {
        return this._isOpening;
    }

    /**
     * @param {boolean} suspended
     * @returns {Promise<void>}
     */
    async setSuspended(suspended) {
        if (suspended) {
            if (this._db !== null) {
                await this.close();
            }
            return;
        }
        if (this._db === null) {
            await this.prepare();
        }
    }

    /**
     * @returns {boolean}
     */
    usesFallbackStorage() {
        return this._usesFallbackStorage;
    }

    /**
     * @returns {{mode: string, forceFallback: boolean, hasOpfsDbCtor: boolean, hasOpfsImportDb: boolean, hasWasmfsDir: boolean, attempts?: Array<{strategy: string, target: string, flags: string, error: string}>, lastError?: string|null}|null}
     */
    getOpenStorageDiagnostics() {
        if (this._openStorageDiagnostics === null) {
            return null;
        }
        return {...this._openStorageDiagnostics};
    }

    /**
     * @param {string} dictionaryName
     * @param {number} [sampleLimit=8]
     * @returns {Promise<{dictionary: string, totalLength: number, sampledRecordCount: number, outOfBoundsRecordCount: number, sampledRecords: Array<{id: number, expression: string, reading: string, entryContentOffset: number, entryContentLength: number, entryContentDictName: string|null, outOfBounds: boolean}>}>}
     */
    async debugSampleTermContentIntegrity(dictionaryName, sampleLimit = 8) {
        const logicalStoreState = this._termContentStore.getDebugState();
        const logicalTotalLength = this._asNumber(logicalStoreState?.totalLength, -1);
        await this._termContentStore.ensureLoadedForRead();
        await this._termRecordStore.ensureDictionariesLoaded([dictionaryName]);
        const persistedStoreState = this._termContentStore.getDebugState();
        const persistedTotalLength = this._asNumber(persistedStoreState?.totalLength, -1);
        const index = this._termRecordStore.getDictionaryIndex(dictionaryName);
        /** @type {number[]} */
        const ids = [];
        for (const valueIds of index.expression.values()) {
            for (const id of valueIds) {
                ids.push(id);
                if (ids.length >= sampleLimit) { break; }
            }
            if (ids.length >= sampleLimit) { break; }
        }
        /** @type {Array<{id: number, expression: string, reading: string, entryContentOffset: number, entryContentLength: number, entryContentDictName: string|null, outOfBounds: boolean}>} */
        const sampledRecords = [];
        let outOfBoundsRecordCount = 0;
        for (const id of ids) {
            const record = this._termRecordStore.getById(id);
            if (typeof record === 'undefined') { continue; }
            const entryContentOffset = this._asNumber(record.entryContentOffset, -1);
            const entryContentLength = this._asNumber(record.entryContentLength, -1);
            const outOfBounds = (
                persistedTotalLength >= 0 &&
                entryContentOffset >= 0 &&
                entryContentLength > 0 &&
                (entryContentOffset + entryContentLength) > persistedTotalLength
            );
            if (outOfBounds) {
                ++outOfBoundsRecordCount;
            }
            sampledRecords.push({
                id,
                expression: this._asString(record.expression),
                reading: this._asString(record.reading),
                entryContentOffset,
                entryContentLength,
                entryContentDictName: this._asNullableString(record.entryContentDictName),
                outOfBounds,
            });
        }
        return {
            dictionary: dictionaryName,
            logicalTotalLength,
            persistedTotalLength,
            sampledRecordCount: sampledRecords.length,
            outOfBoundsRecordCount,
            logicalStoreState,
            persistedStoreState,
            sampledRecords,
        };
    }

    /**
     * @returns {Record<string, unknown>|null}
     */
    getStartupCleanupIncompleteImportsSummary() {
        return this._startupCleanupIncompleteImportsSummary;
    }

    /**
     * @returns {Record<string, unknown>|null}
     */
    getStartupCleanupMissingTermRecordShardsSummary() {
        return this._startupCleanupMissingTermRecordShardsSummary;
    }

    /** */
    async startBulkImport() {
        const db = this._requireDb();
        if (this._bulkImportDepth === 0) {
            await this._termContentStore.beginImportSession();
            await this._termRecordStore.beginImportSession();
            this._applyImportPragmas();
            this._deferTermsVirtualTableSync = true;
            this._termsVirtualTableDirty = false;
            this._termEntryContentHasExistingRows = this._asNumber(db.selectValue('SELECT 1 FROM termEntryContent LIMIT 1'), 0) === 1;
            for (const dropIndexSql of this._createDropIndexesSql()) {
                db.exec(dropIndexSql);
            }
            this._termEntryContentIdByKey.clear();
            this._termEntryContentIdByHash.clear();
            this._clearTermEntryContentMetaCaches();
            this._termEntryContentCache.clear();
            this._termExactPresenceCache.clear();
            this._termPrefixNegativeCache.clear();
            this._directTermIndexByDictionary.clear();
            await this._beginImmediateTransaction(db);
            this._bulkImportTransactionOpen = true;
        }
        ++this._bulkImportDepth;
    }

    /**
     * @param {((index: number, count: number) => void)?} [onCheckpoint]
     * @returns {Promise<{commitMs: number, termContentEndImportSessionMs: number, termContentEndImportSessionFlushPendingWritesMs: number, termContentEndImportSessionAwaitQueuedWritesMs: number, termContentEndImportSessionCloseWritableMs: number, termContentDrainCycleCount: number, termContentWriteCallCount: number, termContentSingleChunkWriteCount: number, termContentMergedWriteCount: number, termContentTotalWriteBytes: number, termContentMergedWriteBytes: number, termContentMaxWriteBytes: number, termContentMergedGroupChunkCount: number, termContentMaxMergedGroupChunkCount: number, termContentFlushDueToBytesCount: number, termContentFlushDueToChunkCount: number, termContentFlushFinalGroupCount: number, termContentWriteCoalesceTargetBytes: number, termContentWriteCoalesceMaxChunks: number, termRecordEndImportSessionMs: number, termsVirtualTableSyncMs: number, createIndexesMs: number, createIndexesCheckpointCount: number, cacheResetMs: number, runtimePragmasMs: number, totalMs: number}|null>}
     */
    async finishBulkImport(onCheckpoint = null) {
        if (this._bulkImportDepth <= 0) {
            return null;
        }
        --this._bulkImportDepth;
        if (this._bulkImportDepth === 0) {
            const db = this._requireDb();
            const tFinishBulkImportStart = safePerformance.now();
            let commitMs = 0;
            let termContentEndImportSessionMs = 0;
            let termContentEndImportSessionFlushPendingWritesMs = 0;
            let termContentEndImportSessionAwaitQueuedWritesMs = 0;
            let termContentEndImportSessionCloseWritableMs = 0;
            let termContentDrainCycleCount = 0;
            let termContentWriteCallCount = 0;
            let termContentSingleChunkWriteCount = 0;
            let termContentMergedWriteCount = 0;
            let termContentTotalWriteBytes = 0;
            let termContentMergedWriteBytes = 0;
            let termContentMaxWriteBytes = 0;
            let termContentMergedGroupChunkCount = 0;
            let termContentMaxMergedGroupChunkCount = 0;
            let termContentFlushDueToBytesCount = 0;
            let termContentFlushDueToChunkCount = 0;
            let termContentFlushFinalGroupCount = 0;
            let termContentWriteCoalesceTargetBytes = 0;
            let termContentWriteCoalesceMaxChunks = 0;
            let termRecordEndImportSessionMs = 0;
            let termsVirtualTableSyncMs = 0;
            let createIndexesMs = 0;
            let createIndexesCheckpointCount = 0;
            let cacheResetMs = 0;
            let runtimePragmasMs = 0;
            try {
                if (this._bulkImportTransactionOpen) {
                    const tCommitStart = safePerformance.now();
                    try {
                        db.exec('COMMIT');
                    } catch (e) {
                        const error = toError(e);
                        if (!this._isNoActiveTransactionError(error)) {
                            throw error;
                        }
                    }
                    commitMs = safePerformance.now() - tCommitStart;
                    this._bulkImportTransactionOpen = false;
                }
                const tTermContentEndImportSessionStart = safePerformance.now();
                const termContentEndImportSessionPromise = this._termContentStore.endImportSession()
                    .then(() => {
                        termContentEndImportSessionMs = safePerformance.now() - tTermContentEndImportSessionStart;
                        const metrics = this._termContentStore.getLastEndImportSessionMetrics();
                        if (metrics !== null) {
                            termContentEndImportSessionFlushPendingWritesMs = metrics.flushPendingWritesMs;
                            termContentEndImportSessionAwaitQueuedWritesMs = metrics.awaitQueuedWritesMs;
                            termContentEndImportSessionCloseWritableMs = metrics.closeWritableMs;
                            termContentDrainCycleCount = metrics.drainCycleCount;
                            termContentWriteCallCount = metrics.writeCallCount;
                            termContentSingleChunkWriteCount = metrics.singleChunkWriteCount;
                            termContentMergedWriteCount = metrics.mergedWriteCount;
                            termContentTotalWriteBytes = metrics.totalWriteBytes;
                            termContentMergedWriteBytes = metrics.mergedWriteBytes;
                            termContentMaxWriteBytes = metrics.maxWriteBytes;
                            termContentMergedGroupChunkCount = metrics.mergedGroupChunkCount;
                            termContentMaxMergedGroupChunkCount = metrics.maxMergedGroupChunkCount;
                            termContentFlushDueToBytesCount = metrics.flushDueToBytesCount;
                            termContentFlushDueToChunkCount = metrics.flushDueToChunkCount;
                            termContentFlushFinalGroupCount = metrics.flushFinalGroupCount;
                            termContentWriteCoalesceTargetBytes = metrics.writeCoalesceTargetBytes;
                            termContentWriteCoalesceMaxChunks = metrics.writeCoalesceMaxChunks;
                        }
                    });
                const tTermRecordEndImportSessionStart = safePerformance.now();
                const termRecordEndImportSessionPromise = this._termRecordStore.endImportSession()
                    .then(() => {
                        termRecordEndImportSessionMs = safePerformance.now() - tTermRecordEndImportSessionStart;
                    });
                await Promise.all([termContentEndImportSessionPromise, termRecordEndImportSessionPromise]);
                if (this._termsVirtualTableDirty) {
                    await this._beginImmediateTransaction(db);
                    try {
                        const tTermsVirtualTableSyncStart = safePerformance.now();
                        await this._syncTermsVirtualTableFromRecordStore();
                        termsVirtualTableSyncMs = safePerformance.now() - tTermsVirtualTableSyncStart;
                        try {
                            db.exec('COMMIT');
                        } catch (e) {
                            const error = toError(e);
                            if (!this._isNoActiveTransactionError(error)) {
                                throw error;
                            }
                        }
                        this._termsVirtualTableDirty = false;
                    } catch (e) {
                        try {
                            db.exec('ROLLBACK');
                        } catch (rollbackError) {
                            if (!this._isNoActiveTransactionError(toError(rollbackError))) {
                                throw rollbackError;
                            }
                        }
                        throw e;
                    }
                }
                const createIndexStatements = this._createIndexesSql();
                const tCreateIndexesStart = safePerformance.now();
                for (let i = 0; i < createIndexStatements.length; ++i) {
                    db.exec(createIndexStatements[i]);
                    if (typeof onCheckpoint === 'function') {
                        onCheckpoint(i + 1, createIndexStatements.length);
                    }
                }
                createIndexesMs = safePerformance.now() - tCreateIndexesStart;
                createIndexesCheckpointCount = createIndexStatements.length;
                const tCacheResetStart = safePerformance.now();
                this._termEntryContentIdByKey.clear();
                this._termEntryContentIdByHash.clear();
                this._clearTermEntryContentMetaCaches();
                this._termEntryContentCache.clear();
                this._termExactPresenceCache.clear();
                this._termPrefixNegativeCache.clear();
                this._directTermIndexByDictionary.clear();
                cacheResetMs = safePerformance.now() - tCacheResetStart;
                this._deferTermsVirtualTableSync = false;
                const tRuntimePragmasStart = safePerformance.now();
                this._applyRuntimePragmas();
                runtimePragmasMs = safePerformance.now() - tRuntimePragmasStart;
                const totalMs = safePerformance.now() - tFinishBulkImportStart;
                if (this._importDebugLogging) {
                    log.log(
                        '[manabitan-db-import] finishBulkImport ' +
                        `total=${totalMs.toFixed(1)}ms ` +
                        `commit=${commitMs.toFixed(1)}ms ` +
                        `termContentEnd=${termContentEndImportSessionMs.toFixed(1)}ms ` +
                        `termContentFlush=${termContentEndImportSessionFlushPendingWritesMs.toFixed(1)}ms ` +
                        `termContentAwait=${termContentEndImportSessionAwaitQueuedWritesMs.toFixed(1)}ms ` +
                        `termContentClose=${termContentEndImportSessionCloseWritableMs.toFixed(1)}ms ` +
                        `termContentDrainCycles=${termContentDrainCycleCount} ` +
                        `termContentWrites=${termContentWriteCallCount} ` +
                        `termContentSingleWrites=${termContentSingleChunkWriteCount} ` +
                        `termContentMergedWrites=${termContentMergedWriteCount} ` +
                        `termContentTotalWriteBytes=${termContentTotalWriteBytes} ` +
                        `termContentMergedWriteBytes=${termContentMergedWriteBytes} ` +
                        `termContentMaxWriteBytes=${termContentMaxWriteBytes} ` +
                        `termContentMergedGroupChunks=${termContentMergedGroupChunkCount} ` +
                        `termContentMaxMergedGroupChunks=${termContentMaxMergedGroupChunkCount} ` +
                        `termContentFlushDueToBytes=${termContentFlushDueToBytesCount} ` +
                        `termContentFlushDueToChunks=${termContentFlushDueToChunkCount} ` +
                        `termContentFlushFinalGroups=${termContentFlushFinalGroupCount} ` +
                        `termContentWriteCoalesceTargetBytes=${termContentWriteCoalesceTargetBytes} ` +
                        `termContentWriteCoalesceMaxChunks=${termContentWriteCoalesceMaxChunks} ` +
                        `termRecordEnd=${termRecordEndImportSessionMs.toFixed(1)}ms ` +
                        `termsVtabSync=${termsVirtualTableSyncMs.toFixed(1)}ms ` +
                        `createIndexes=${createIndexesMs.toFixed(1)}ms ` +
                        `cacheReset=${cacheResetMs.toFixed(1)}ms ` +
                        `runtimePragmas=${runtimePragmasMs.toFixed(1)}ms ` +
                        `indexStatements=${createIndexesCheckpointCount}`,
                    );
                }
                return {
                    commitMs,
                    termContentEndImportSessionMs,
                    termContentEndImportSessionFlushPendingWritesMs,
                    termContentEndImportSessionAwaitQueuedWritesMs,
                    termContentEndImportSessionCloseWritableMs,
                    termContentDrainCycleCount,
                    termContentWriteCallCount,
                    termContentSingleChunkWriteCount,
                    termContentMergedWriteCount,
                    termContentTotalWriteBytes,
                    termContentMergedWriteBytes,
                    termContentMaxWriteBytes,
                    termContentMergedGroupChunkCount,
                    termContentMaxMergedGroupChunkCount,
                    termContentFlushDueToBytesCount,
                    termContentFlushDueToChunkCount,
                    termContentFlushFinalGroupCount,
                    termContentWriteCoalesceTargetBytes,
                    termContentWriteCoalesceMaxChunks,
                    termRecordEndImportSessionMs,
                    termsVirtualTableSyncMs,
                    createIndexesMs,
                    createIndexesCheckpointCount,
                    cacheResetMs,
                    runtimePragmasMs,
                    totalMs,
                };
            } finally {
                if (this._bulkImportTransactionOpen) {
                    try {
                        db.exec('ROLLBACK');
                    } catch (e) {
                        if (!this._isNoActiveTransactionError(toError(e))) {
                            throw e;
                        }
                    }
                    this._bulkImportTransactionOpen = false;
                }
                await this._termContentStore.endImportSession();
                await this._termRecordStore.endImportSession();
            }
        }
    }

    /**
     * @param {boolean} value
     */
    setTermEntryContentDedupEnabled(value) {
        this._enableTermEntryContentDedup = value;
    }

    /**
     * @param {boolean} value
     */
    setImportDebugLogging(value) {
        this._importDebugLogging = value;
    }

    /**
     * @param {{termContentStorageMode?: 'baseline'|'raw-bytes', expectedTermContentImportBytes?: number}} [options]
     */
    setImportOptimizationFlags(options = {}) {
        this._adaptiveTermBulkAddBatchSize = true;
        this._retryBeginImmediateTransaction = false;
        this._skipIntraBatchContentDedup = false;
        this._termBulkAddStagingMaxRows = this._computeDefaultTermBulkAddStagingMaxRows();
        this._termRecordRowAppendFastPath = true;
        this._termContentStorageMode = (options.termContentStorageMode === TERM_CONTENT_STORAGE_MODE_RAW_BYTES) ?
            options.termContentStorageMode :
            TERM_CONTENT_STORAGE_MODE_BASELINE;
        this._termContentCompressionMinBytes = 1048576;
        this._rawTermContentPackTargetBytes = DEFAULT_RAW_TERM_CONTENT_PACK_TARGET_BYTES;
        this._termContentStore.setImportStorageMode(this._termContentStorageMode);
        this._termContentStore.setExpectedImportBytes(options.expectedTermContentImportBytes ?? null);
        this._termContentStore.setWriteCoalesceMaxChunksOverride(null);
    }

    /**
     * @returns {Promise<boolean>}
     */
    async purge() {
        if (this._isOpening) {
            throw new Error('Cannot purge database while opening');
        }

        if (this._db !== null) {
            if (this._bulkImportTransactionOpen) {
                try {
                    this._db.exec('ROLLBACK');
                } catch (_) { /* NOP */ }
                this._bulkImportTransactionOpen = false;
            }
            this._applyRuntimePragmas();
            this._clearCachedStatements();
            this._db.close();
            this._db = null;
            this._usesFallbackStorage = false;
        }
        await this._termContentStore.reset();
        await this._termRecordStore.reset();

        if (this._worker !== null) {
            this._worker.terminate();
            this._worker = null;
        }

        let result = false;
        try {
            result = await deleteOpfsDatabaseFiles();
        } catch (e) {
            log.error(e);
        }

        await this.prepare();
        this._termEntryContentCache.clear();
        this._termEntryContentIdByHash.clear();
        this._clearTermEntryContentMetaCaches();
        this._termExactPresenceCache.clear();
        this._termPrefixNegativeCache.clear();
        this._directTermIndexByDictionary.clear();
        return result;
    }

    /**
     * @returns {Promise<ArrayBuffer>}
     */
    async exportDatabase() {
        const db = this._requireDb();
        const sqlite3 = this._requireSqlite3();
        const pageCount = this._asNumber(db.selectValue('PRAGMA page_count'), -1);
        const pageSize = this._asNumber(db.selectValue('PRAGMA page_size'), -1);
        const freelistCount = this._asNumber(db.selectValue('PRAGMA freelist_count'), -1);
        const approxDbBytes = (pageCount > 0 && pageSize > 0) ? pageCount * pageSize : -1;

        // Release cached prepared statements before serialization to reduce wasm heap pressure.
        this._clearCachedStatements();
        try {
            db.exec('PRAGMA shrink_memory');
        } catch (_) {
            // Not all sqlite builds expose shrink_memory; ignore when unavailable.
        }
        try {
            db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
        } catch (_) {
            // In-memory/non-WAL databases may reject checkpoint pragmas.
        }
        try {
            /** @type {ArrayBuffer|null} */
            let exported = null;
            const exportBinaryImage = /** @type {unknown} */ (Reflect.get(db, 'exportBinaryImage'));
            if (typeof exportBinaryImage === 'function') {
                try {
                    const raw = /** @type {() => Uint8Array|ArrayBuffer} */ (exportBinaryImage).call(db);
                    const bytes = raw instanceof Uint8Array ? raw : new Uint8Array(raw);
                    if (bytes.byteLength > 0) {
                        exported = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
                    }
                } catch (_) {
                    // Fall back to sqlite3_js_db_export below.
                }
            }
            if (exported === null) {
                const dbPointer = db.pointer;
                if (typeof dbPointer !== 'number') {
                    throw new Error('sqlite database pointer is unavailable');
                }
                const raw = sqlite3.capi.sqlite3_js_db_export(dbPointer);
                const bytes = raw instanceof Uint8Array ? raw : new Uint8Array(raw);
                if (bytes.byteLength > 0) {
                    exported = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
                }
            }
            if (exported === null || exported.byteLength === 0) {
                throw new Error('Database export returned an empty payload');
            }
            return exported;
        } catch (e) {
            const storageDiagnostics = this.getOpenStorageDiagnostics();
            const wrappedError = new Error(
                `Database serialization failed: ${String(e && typeof e === 'object' && 'message' in e ? Reflect.get(e, 'message') : e)} ` +
                `(usesFallbackStorage=${String(this._usesFallbackStorage)} ` +
                `pageCount=${String(pageCount)} pageSize=${String(pageSize)} freelistCount=${String(freelistCount)} ` +
                `approxDbBytes=${String(approxDbBytes)} storageDiagnostics=${JSON.stringify(storageDiagnostics)})`,
            );
            log.warn(wrappedError);
            throw wrappedError;
        }
    }

    /**
     * @param {ArrayBuffer} content
     */
    async importDatabase(content) {
        const sqlite3 = await getSqlite3();

        if (this._db !== null) {
            this._clearCachedStatements();
            this._db.close();
            this._db = null;
            this._usesFallbackStorage = false;
        }

        await importOpfsDatabase(content);

        this._sqlite3 = sqlite3;
        await this._openConnection();
        this._termEntryContentCache.clear();
        this._termEntryContentIdByHash.clear();
        this._clearTermEntryContentMetaCaches();
        this._termExactPresenceCache.clear();
        this._termPrefixNegativeCache.clear();
        this._directTermIndexByDictionary.clear();
    }

    /**
     * @param {string} dictionaryName
     * @param {number} progressRate
     * @param {import('dictionary-database').DeleteDictionaryProgressCallback} onProgress
     */
    async deleteDictionary(dictionaryName, progressRate, onProgress) {
        const db = this._requireDb();

        /** @type {[table: string, keyColumn: string][]} */
        const targets = [
            ['kanji', 'dictionary'],
            ['kanjiMeta', 'dictionary'],
            ['termMeta', 'dictionary'],
            ['tagMeta', 'dictionary'],
            ['media', 'dictionary'],
            ['dictionaries', 'title'],
        ];

        /** @type {import('dictionary-database').DeleteDictionaryProgressData} */
        const progressData = {
            count: 0,
            processed: 0,
            storeCount: targets.length + 1,
            storesProcesed: 0,
        };

        /** @type {number[]} */
        const counts = [];
        await this._termRecordStore.ensureDictionariesLoaded([dictionaryName]);
        const termCount = this._termRecordStore.getDictionaryIndex(dictionaryName).expression.size > 0 ?
            [...this._termRecordStore.getDictionaryIndex(dictionaryName).expression.values()].reduce((sum, list) => sum + list.length, 0) :
            0;
        progressData.count += termCount;
        counts.push(termCount);
        for (const [table, keyColumn] of targets) {
            const count = this._asNumber(db.selectValue(`SELECT COUNT(*) FROM ${table} WHERE ${keyColumn} = $value`, {$value: dictionaryName}), 0);
            counts.push(count);
            progressData.count += count;
            ++progressData.storesProcesed;
            onProgress(progressData);
        }

        progressData.storesProcesed = 0;

        await this._beginImmediateTransaction(db);
        try {
            let countIndex = 1;
            const deletedTerms = await this._termRecordStore.deleteByDictionary(dictionaryName);
            this._termsVirtualTableDirty = true;
            progressData.processed += deletedTerms;
            ++progressData.storesProcesed;
            onProgress(progressData);
            for (let i = 0; i < targets.length; ++i) {
                const [table, keyColumn] = targets[i];
                db.exec({sql: `DELETE FROM ${table} WHERE ${keyColumn} = $value`, bind: {$value: dictionaryName}});
                progressData.processed += counts[countIndex++];
                ++progressData.storesProcesed;
                if ((progressData.processed % progressRate) === 0 || progressData.processed >= progressData.count) {
                    onProgress(progressData);
                }
            }
            db.exec('COMMIT');
        } catch (e) {
            try { db.exec('ROLLBACK'); } catch (_) { /* NOP */ }
            throw e;
        }

        await this._cleanupTermContentAfterDictionaryDelete();

        onProgress(progressData);
        this._termEntryContentCache.clear();
        this._termEntryContentIdByHash.clear();
        this._clearTermEntryContentMetaCaches();
        this._termExactPresenceCache.clear();
        this._termPrefixNegativeCache.clear();
        this._directTermIndexByDictionary.clear();
        this._termEntryContentIdByKey.clear();
        this._sharedGlossaryArtifactMetaByDictionary.clear();
        this._sharedGlossaryArtifactInflatedByDictionary.clear();
        try {
            this._requireDb().exec('PRAGMA wal_checkpoint(TRUNCATE)');
        } catch (_) {
            // In-memory/non-WAL databases may reject checkpoint pragmas.
        }
    }

    /**
     * @param {string} fromDictionaryTitle
     * @param {string} toDictionaryTitle
     * @param {import('dictionary-importer').Summary|null} [summaryOverride]
     * @param {string|null} [replacedDictionaryTitle]
     * @returns {Promise<void>}
     */
    async replaceDictionaryTitle(fromDictionaryTitle, toDictionaryTitle, summaryOverride = null, replacedDictionaryTitle = null) {
        const fromTitle = `${fromDictionaryTitle}`.trim();
        const toTitle = `${toDictionaryTitle}`.trim();
        const replacedTitle = typeof replacedDictionaryTitle === 'string' ? replacedDictionaryTitle.trim() : null;
        const explicitTransientSessionToken = (
            summaryOverride &&
            typeof summaryOverride === 'object' &&
            !Array.isArray(summaryOverride) &&
            typeof Reflect.get(summaryOverride, 'updateSessionToken') === 'string' &&
            Reflect.get(summaryOverride, 'updateSessionToken').trim().length > 0
        ) ? Reflect.get(summaryOverride, 'updateSessionToken').trim() : null;
        const matchTransientToken = fromTitle.match(/\[(?:update-staging|cutover|replaced) ([^\]]+)\]$/);
        const transientSessionToken = explicitTransientSessionToken ?? (matchTransientToken ? matchTransientToken[1] : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`);
        if (fromTitle.length === 0 || toTitle.length === 0) {
            throw new Error('Dictionary titles must be non-empty');
        }
        const getSummaryRowByTitle = (title) => {
            const db = this._requireDb();
            return db.selectObject('SELECT id, version, summaryJson FROM dictionaries WHERE title = $title ORDER BY id DESC LIMIT 1', {$title: title});
        };
        const snapshotRows = () => {
            const snapshotDb = this._requireDb();
            return snapshotDb.selectObjects('SELECT id, title, version, summaryJson FROM dictionaries ORDER BY id ASC').map((row) => {
                const summaryJson = this._asString(row.summaryJson);
                let summary = null;
                try {
                    summary = parseJson(summaryJson);
                } catch (_) {
                    summary = null;
                }
                const summaryObject = (typeof summary === 'object' && summary !== null && !Array.isArray(summary)) ? summary : null;
                return {
                    id: this._asNumber(row.id, 0),
                    titleColumn: this._asString(row.title),
                    versionColumn: this._asNumber(row.version, 0),
                    summaryTitle: summaryObject !== null && typeof Reflect.get(summaryObject, 'title') === 'string' ? Reflect.get(summaryObject, 'title') : null,
                    summaryImportSuccess: summaryObject !== null && typeof Reflect.get(summaryObject, 'importSuccess') === 'boolean' ? Reflect.get(summaryObject, 'importSuccess') : null,
                };
            });
        };
        this._lastReplaceDictionaryTitleDebug = {
            fromTitle,
            toTitle,
            replacedTitle,
            transientSessionToken,
            beforeDeleteRows: snapshotRows(),
        };

        const buildSummaryForTitle = (summaryRow, title, summaryValue = null) => {
            const parsedSummary = (() => {
                const summaryJson = this._asString(Reflect.get(summaryRow, 'summaryJson'));
                if (summaryJson.length === 0) { return null; }
                try {
                    const value = parseJson(summaryJson);
                    return (typeof value === 'object' && value !== null && !Array.isArray(value)) ? value : null;
                } catch (_) {
                    return null;
                }
            })();
            return (
                summaryValue && typeof summaryValue === 'object' && !Array.isArray(summaryValue) ?
                    {...summaryValue, title} :
                    (parsedSummary !== null ? {...parsedSummary, title} : {title, version: this._asNumber(Reflect.get(summaryRow, 'version'), 0)})
            );
        };
        const buildTransientSummaryForTitle = (summaryRow, title, stage, summaryValue = null) => ({
            ...buildSummaryForTitle(summaryRow, title, summaryValue),
            transientUpdateStage: stage,
            updateSessionToken: transientSessionToken,
        });
        const renameDictionaryData = async (sourceTitle, targetTitle, summaryValue, debugKey) => {
            const db = this._requireDb();
            const summaryRow = getSummaryRowByTitle(sourceTitle);
            if (!(summaryRow && typeof summaryRow === 'object')) {
                throw new Error(`Dictionary title not found for replacement: ${sourceTitle}`);
            }
            const summaryId = this._asNumber(Reflect.get(summaryRow, 'id'), -1);
            if (summaryId < 0) {
                throw new Error(`Invalid dictionary row id for replacement: ${sourceTitle}`);
            }
            const nextSummary = buildSummaryForTitle(summaryRow, targetTitle, summaryValue);
            await this._beginImmediateTransaction(db);
            try {
                db.exec({sql: 'UPDATE dictionaries SET title = $toTitle, version = $version, summaryJson = $summaryJson WHERE id = $id', bind: {
                    $id: summaryId,
                    $toTitle: targetTitle,
                    $version: this._asNumber(Reflect.get(nextSummary, 'version'), 0),
                    $summaryJson: JSON.stringify(nextSummary),
                }});
                for (const table of ['termMeta', 'kanji', 'kanjiMeta', 'tagMeta', 'media', 'sharedGlossaryArtifacts']) {
                    db.exec({sql: `UPDATE ${table} SET dictionary = $toTitle WHERE dictionary = $fromTitle`, bind: {$fromTitle: sourceTitle, $toTitle: targetTitle}});
                }
                await this._termRecordStore.replaceDictionaryName(sourceTitle, targetTitle);
                db.exec('COMMIT');
            } catch (e) {
                try { db.exec('ROLLBACK'); } catch (_) { /* NOP */ }
                throw e;
            }
            this._lastReplaceDictionaryTitleDebug = {
                ...(this._lastReplaceDictionaryTitleDebug ?? {}),
                [debugKey]: snapshotRows(),
            };
            this._lastReplaceDictionaryTitleDebug = {
                ...(this._lastReplaceDictionaryTitleDebug ?? {}),
                [`${debugKey}AfterTermRecordRows`]: snapshotRows(),
            };
        };
        const forceCleanupTransientDictionaryTitle = async (dictionaryTitle) => {
            const title = `${dictionaryTitle}`.trim();
            if (title.length === 0) { return; }
            const summaryRow = getSummaryRowByTitle(title);
            const parsedSummary = (() => {
                if (!(summaryRow && typeof summaryRow === 'object')) { return null; }
                const summaryJson = this._asString(Reflect.get(summaryRow, 'summaryJson'));
                if (summaryJson.length === 0) { return null; }
                try {
                    const value = parseJson(summaryJson);
                    return (typeof value === 'object' && value !== null && !Array.isArray(value)) ? value : null;
                } catch (_) {
                    return null;
                }
            })();
            if (!isRecognizedTransientUpdateTitle(title, parsedSummary)) {
                throw new Error(`Refusing fallback cleanup for non-transient dictionary title: ${title}`);
            }
            /** @type {unknown} */
            let originalDeleteError = null;
            try {
                await this.deleteDictionary(title, 1000, () => {});
                return;
            } catch (e) {
                originalDeleteError = e;
                // Fall through to direct transient cleanup.
            }
            try {
                const db = this._requireDb();
                this._lastReplaceDictionaryTitleDebug = {
                    ...(this._lastReplaceDictionaryTitleDebug ?? {}),
                    forcedCleanupStart: {
                        title,
                        originalDeleteError: originalDeleteError instanceof Error ? originalDeleteError.message : String(originalDeleteError),
                        rows: snapshotRows(),
                    },
                };
                await this._termRecordStore.deleteByDictionary(title);
                await this.cleanupTransientTermRecordShards((dictionaryName) => String(dictionaryName || '').trim() === title);
                await this._beginImmediateTransaction(db);
                try {
                    for (const [table, keyColumn] of [
                        ['kanji', 'dictionary'],
                        ['kanjiMeta', 'dictionary'],
                        ['termMeta', 'dictionary'],
                        ['tagMeta', 'dictionary'],
                        ['media', 'dictionary'],
                        ['sharedGlossaryArtifacts', 'dictionary'],
                        ['dictionaries', 'title'],
                    ]) {
                        db.exec({sql: `DELETE FROM ${table} WHERE ${keyColumn} = $value`, bind: {$value: title}});
                    }
                    db.exec('COMMIT');
                } catch (e) {
                    try { db.exec('ROLLBACK'); } catch (_) { /* NOP */ }
                    throw e;
                }
                await this._cleanupTermContentAfterDictionaryDelete();
                this._lastReplaceDictionaryTitleDebug = {
                    ...(this._lastReplaceDictionaryTitleDebug ?? {}),
                    forcedCleanupEnd: {
                        title,
                        rows: snapshotRows(),
                    },
                };
            } catch (fallbackError) {
                const originalMessage = originalDeleteError instanceof Error ? originalDeleteError.message : String(originalDeleteError);
                const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
                this._lastReplaceDictionaryTitleDebug = {
                    ...(this._lastReplaceDictionaryTitleDebug ?? {}),
                    forcedCleanupFailure: {
                        title,
                        originalDeleteError: originalMessage,
                        fallbackError: fallbackMessage,
                        rows: snapshotRows(),
                    },
                };
                throw new Error(`Failed transient dictionary cleanup for ${title}. deleteDictionary error=${originalMessage}; fallback cleanup error=${fallbackMessage}`);
            }
        };
        const summaryRow = getSummaryRowByTitle(fromTitle);
        if (!(summaryRow && typeof summaryRow === 'object')) {
            throw new Error(`Dictionary title not found for replacement: ${fromTitle}`);
        }

        let activeFromTitle = fromTitle;
        if (replacedTitle !== null && replacedTitle.length > 0 && replacedTitle === toTitle && replacedTitle !== fromTitle) {
            const temporaryCutoverTitle = `${toTitle} [cutover ${transientSessionToken}]`;
            const temporaryReplacedTitle = `${replacedTitle} [replaced ${transientSessionToken}]`;
            const temporarySummary = buildTransientSummaryForTitle(summaryRow, temporaryCutoverTitle, 'cutover', summaryOverride);
            await renameDictionaryData(fromTitle, temporaryCutoverTitle, temporarySummary, 'afterTemporaryCutoverRows');
            activeFromTitle = temporaryCutoverTitle;
            let replacedDictionaryMovedAside = false;
            try {
                const replacedSummaryRow = getSummaryRowByTitle(replacedTitle);
                if (!(replacedSummaryRow && typeof replacedSummaryRow === 'object')) {
                    throw new Error(`Dictionary title not found for replacement delete stage: ${replacedTitle}`);
                }
                await renameDictionaryData(
                    replacedTitle,
                    temporaryReplacedTitle,
                    buildTransientSummaryForTitle(replacedSummaryRow, temporaryReplacedTitle, 'replaced', null),
                    'afterTemporaryReplacedRows',
                );
                replacedDictionaryMovedAside = true;
                this._lastReplaceDictionaryTitleDebug = {
                    ...(this._lastReplaceDictionaryTitleDebug ?? {}),
                    afterDeleteRows: snapshotRows(),
                };

                const finalSummary = buildSummaryForTitle(summaryRow, toTitle, summaryOverride);
                await renameDictionaryData(activeFromTitle, toTitle, finalSummary, 'afterRenameRows');
            } catch (e) {
                if (replacedDictionaryMovedAside) {
                    try {
                        const movedAsideSummaryRow = getSummaryRowByTitle(temporaryReplacedTitle);
                        if (movedAsideSummaryRow && typeof movedAsideSummaryRow === 'object') {
                            await renameDictionaryData(
                                temporaryReplacedTitle,
                                replacedTitle,
                                buildSummaryForTitle(movedAsideSummaryRow, replacedTitle, null),
                                'afterRestoreReplacedRows',
                            );
                        }
                    } catch (_) {
                        // NOP - preserve the original failure, but leave debug breadcrumbs.
                    }
                }
                if (activeFromTitle !== fromTitle) {
                    try {
                        const stagedSummaryRow = getSummaryRowByTitle(activeFromTitle);
                        if (stagedSummaryRow && typeof stagedSummaryRow === 'object') {
                            await renameDictionaryData(
                                activeFromTitle,
                                fromTitle,
                                buildSummaryForTitle(stagedSummaryRow, fromTitle, summaryOverride),
                                'afterRestoreStagedRows',
                            );
                            activeFromTitle = fromTitle;
                        }
                    } catch (_) {
                        // NOP - preserve the original failure, but leave debug breadcrumbs.
                    }
                }
                throw e;
            }
            try {
                await forceCleanupTransientDictionaryTitle(temporaryReplacedTitle);
            } catch (e) {
                const cleanupMessage = e instanceof Error ? e.message : String(e);
                this._lastReplaceDictionaryTitleDebug = {
                    ...(this._lastReplaceDictionaryTitleDebug ?? {}),
                    postCutoverCleanupWarning: {
                        title: temporaryReplacedTitle,
                        message: cleanupMessage,
                        rows: snapshotRows(),
                    },
                };
                log.warn(new Error(`Post-cutover transient cleanup failed for ${temporaryReplacedTitle}: ${cleanupMessage}`));
            }
            this._lastReplaceDictionaryTitleDebug = {
                ...(this._lastReplaceDictionaryTitleDebug ?? {}),
                afterDeleteRows: snapshotRows(),
            };
        } else {
            if (replacedTitle !== null && replacedTitle.length > 0 && replacedTitle !== activeFromTitle) {
                await this.deleteDictionary(replacedTitle, 1000, () => {});
            }
            this._lastReplaceDictionaryTitleDebug = {
                ...(this._lastReplaceDictionaryTitleDebug ?? {}),
                afterDeleteRows: snapshotRows(),
            };

            const finalSummary = buildSummaryForTitle(summaryRow, toTitle, summaryOverride);
            await renameDictionaryData(activeFromTitle, toTitle, finalSummary, 'afterRenameRows');
        }

        this._termsVirtualTableDirty = true;
        this._termEntryContentCache.clear();
        this._termEntryContentIdByHash.clear();
        this._clearTermEntryContentMetaCaches();
        this._termExactPresenceCache.clear();
        this._termPrefixNegativeCache.clear();
        this._directTermIndexByDictionary.clear();
        this._termEntryContentIdByKey.clear();
        this._sharedGlossaryArtifactMetaByDictionary.clear();
        this._sharedGlossaryArtifactInflatedByDictionary.clear();
    }

    /**
     * @returns {Record<string, unknown>|null}
     */
    getLastReplaceDictionaryTitleDebug() {
        return this._lastReplaceDictionaryTitleDebug;
    }

    /**
     * @returns {Promise<void>}
     */
    async _cleanupTermContentAfterDictionaryDelete() {
        const db = this._requireDb();
        const remainingDictionaryCount = this._asNumber(db.selectValue('SELECT COUNT(*) FROM dictionaries'), 0);
        if (remainingDictionaryCount <= 0) {
            await this._termContentStore.reset();
            await this._beginImmediateTransaction(db);
            try {
                db.exec('DELETE FROM termEntryContent');
                db.exec('DELETE FROM sharedGlossaryArtifacts');
                db.exec('COMMIT');
            } catch (e) {
                try { db.exec('ROLLBACK'); } catch (_) { /* NOP */ }
                throw e;
            }
            return;
        }
        await this._beginImmediateTransaction(db);
        try {
            this._pruneOrphanTermEntryContent();
            db.exec(`
                DELETE FROM sharedGlossaryArtifacts
                WHERE dictionary NOT IN (
                    SELECT title
                    FROM dictionaries
                )
            `);
            db.exec('COMMIT');
        } catch (e) {
            try { db.exec('ROLLBACK'); } catch (_) { /* NOP */ }
            throw e;
        }
    }

    /**
     * @param {string} sql
     * @returns {import('@sqlite.org/sqlite-wasm').PreparedStatement}
     */
    _getCachedStatement(sql) {
        const cached = this._statementCache.get(sql);
        if (typeof cached !== 'undefined') {
            this._statementCache.delete(sql);
            this._statementCache.set(sql, cached);
            return cached;
        }
        const db = this._requireDb();
        const created = /** @type {import('@sqlite.org/sqlite-wasm').PreparedStatement} */ (db.prepare(sql));
        while (this._statementCache.size >= this._statementCacheMaxEntries) {
            const first = this._statementCache.entries().next();
            if (first.done) {
                break;
            }
            this._statementCache.delete(first.value[0]);
            try {
                first.value[1].finalize();
            } catch (_) {
                // NOP
            }
        }
        this._statementCache.set(sql, created);
        return created;
    }

    /** */
    _clearCachedStatements() {
        for (const stmt of this._statementCache.values()) {
            try {
                stmt.finalize();
            } catch (_) {
                // NOP
            }
        }
        this._statementCache.clear();
        this._termEntryContentCache.clear();
        this._termEntryContentIdByHash.clear();
        this._clearTermEntryContentMetaCaches();
        this._termExactPresenceCache.clear();
        this._termPrefixNegativeCache.clear();
        this._directTermIndexByDictionary.clear();
    }

    /**
     * @param {Iterable<string>} values
     * @param {string} prefix
     * @returns {{clause: string, bind: Record<string, string>}}
     */
    _buildTextInClause(values, prefix) {
        /** @type {string[]} */
        const placeholders = [];
        /** @type {Record<string, string>} */
        const bind = {};
        let index = 0;
        for (const value of values) {
            const key = `${prefix}${index++}`;
            placeholders.push(`$${key}`);
            bind[`$${key}`] = value;
        }
        return {
            clause: placeholders.length > 0 ? placeholders.join(', ') : "''",
            bind,
        };
    }

    /**
     * @param {Iterable<number>} values
     * @param {string} prefix
     * @returns {{clause: string, bind: Record<string, number>}}
     */
    _buildNumberInClause(values, prefix) {
        /** @type {string[]} */
        const placeholders = [];
        /** @type {Record<string, number>} */
        const bind = {};
        let index = 0;
        for (const value of values) {
            const key = `${prefix}${index++}`;
            placeholders.push(`$${key}`);
            bind[`$${key}`] = value;
        }
        return {
            clause: placeholders.length > 0 ? placeholders.join(', ') : '-1',
            bind,
        };
    }

    /**
     * @template T
     * @param {T[]} values
     * @param {number} chunkSize
     * @returns {T[][]}
     */
    _chunkValues(values, chunkSize) {
        /** @type {T[][]} */
        const chunks = [];
        if (chunkSize <= 0) {
            return chunks;
        }
        for (let i = 0; i < values.length; i += chunkSize) {
            chunks.push(values.slice(i, i + chunkSize));
        }
        return chunks;
    }

    /**
     * @param {string[]} dictionaryNames
     * @returns {string}
     */
    _getDictionaryCacheKey(dictionaryNames) {
        if (dictionaryNames.length <= 1) {
            return dictionaryNames[0] ?? '';
        }
        return [...dictionaryNames].sort().join('\u001f');
    }

    /**
     * @param {string} dictionaryCacheKey
     * @param {string} term
     * @returns {string}
     */
    _createTermExactPresenceCacheKey(dictionaryCacheKey, term) {
        return `${dictionaryCacheKey}\u001f${term}`;
    }

    /**
     * @param {string} dictionaryName
     * @returns {{expression: Map<string, number[]>, reading: Map<string, number[]>, expressionReverse: Map<string, number[]>, readingReverse: Map<string, number[]>, pair: Map<string, number[]>, sequence: Map<number, number[]>}}
     */
    _ensureDirectTermIndex(dictionaryName) {
        const existing = this._directTermIndexByDictionary.get(dictionaryName);
        if (typeof existing !== 'undefined') {
            return existing;
        }
        const index = this._termRecordStore.getDictionaryIndex(dictionaryName);
        this._directTermIndexByDictionary.set(dictionaryName, index);
        return index;
    }

    /**
     * @param {Iterable<string>} dictionaryNames
     * @returns {Promise<void>}
     */
    async _ensureDirectTermIndexesLoaded(dictionaryNames) {
        await this._termRecordStore.ensureDictionariesLoaded(dictionaryNames);
        for (const dictionaryName of dictionaryNames) {
            this._ensureDirectTermIndex(dictionaryName);
        }
    }

    /**
     * @param {import('dictionary-database').DictionarySet} dictionaries
     * @returns {string[]}
     */
    _getDictionaryNames(dictionaries) {
        if (dictionaries instanceof Map) {
            return [...dictionaries.keys()];
        }
        return [...dictionaries];
    }

    /**
     * @param {string[]} terms
     * @returns {Map<string, number[]>}
     */
    _buildTermIndexMap(terms) {
        /** @type {Map<string, number[]>} */
        const result = new Map();
        for (let i = 0; i < terms.length; ++i) {
            const term = terms[i];
            const list = result.get(term);
            if (typeof list === 'undefined') {
                result.set(term, [i]);
            } else {
                list.push(i);
            }
        }
        return result;
    }

    /**
     * @param {string[]} termList
     * @param {import('dictionary-database').DictionarySet} dictionaries
     * @param {import('dictionary-database').MatchType} matchType
     * @returns {Promise<import('dictionary-database').TermEntry[]>}
     */
    async findTermsBulk(termList, dictionaries, matchType) {
        this._requireDb();
        if (termList.length === 0 || dictionaries.size === 0) {
            return [];
        }
        const visited = new Set();
        /** @type {import('dictionary-database').TermEntry[]} */
        const results = [];
        const dictionaryNames = this._getDictionaryNames(dictionaries);
        await this._ensureDirectTermIndexesLoaded(dictionaryNames);

        /** @type {('expression'|'reading'|'expressionReverse'|'readingReverse')[]} */
        const columns = (matchType === 'suffix') ? ['expressionReverse', 'readingReverse'] : ['expression', 'reading'];

        if (matchType === 'exact') {
            /** @type {Map<string, number[]>} */
            const termIndexMap = new Map();
            /** @type {Map<number, {matchSource: import('dictionary-database').MatchSource, itemIndex: number}[]>} */
            const idMatches = new Map();
            const dictionaryCacheKey = this._getDictionaryCacheKey(dictionaryNames);
            for (let i = 0; i < termList.length; ++i) {
                const term = termList[i];
                const termPresenceKey = this._createTermExactPresenceCacheKey(dictionaryCacheKey, term);
                const cachedPresence = this._termExactPresenceCache.get(termPresenceKey);
                if (cachedPresence === false) {
                    continue;
                }
                const existingList = termIndexMap.get(term);
                if (typeof existingList === 'undefined') {
                    termIndexMap.set(term, [i]);
                } else {
                    existingList.push(i);
                }
            }
            if (termIndexMap.size === 0) {
                return [];
            }
            for (const term of termIndexMap.keys()) {
                const itemIndexes = /** @type {number[]} */ (termIndexMap.get(term));
                let found = false;
                for (const dictionaryName of dictionaryNames) {
                    const index = this._ensureDirectTermIndex(dictionaryName);
                    const expressionIds = index.expression.get(term);
                    if (typeof expressionIds !== 'undefined') {
                        found = true;
                        for (const id of expressionIds) {
                            if (id <= 0 || visited.has(id)) { continue; }
                            visited.add(id);
                            const matches = idMatches.get(id);
                            if (typeof matches === 'undefined') {
                                idMatches.set(id, itemIndexes.map((itemIndex) => ({matchSource: 'term', itemIndex})));
                            } else {
                                for (const itemIndex of itemIndexes) {
                                    matches.push({matchSource: 'term', itemIndex});
                                }
                            }
                        }
                    }
                }
                for (const dictionaryName of dictionaryNames) {
                    const index = this._ensureDirectTermIndex(dictionaryName);
                    const readingIds = index.reading.get(term);
                    if (typeof readingIds !== 'undefined') {
                        found = true;
                        for (const id of readingIds) {
                            if (id <= 0 || visited.has(id)) { continue; }
                            visited.add(id);
                            const matches = idMatches.get(id);
                            if (typeof matches === 'undefined') {
                                idMatches.set(id, itemIndexes.map((itemIndex) => ({matchSource: 'reading', itemIndex})));
                            } else {
                                for (const itemIndex of itemIndexes) {
                                    matches.push({matchSource: 'reading', itemIndex});
                                }
                            }
                        }
                    }
                }
                const termPresenceKey = this._createTermExactPresenceCacheKey(dictionaryCacheKey, term);
                this._setTermExactPresenceCached(termPresenceKey, found);
            }

            if (idMatches.size === 0) {
                return [];
            }

            const rowsById = await this._fetchTermRowsByIds(idMatches.keys());
            for (const [id, matches] of idMatches) {
                const row = rowsById.get(id);
                if (typeof row === 'undefined') { continue; }
                for (const {matchSource, itemIndex} of matches) {
                    results.push(this._createTerm(matchSource, 'exact', row, itemIndex));
                }
            }
            return results;
        }

        /** @type {Map<number, {matchSource: import('dictionary-database').MatchSource, matchType: import('dictionary-database').MatchType, itemIndex: number}>} */
        const idMatches = new Map();
        /** @type {Map<string, {term: string, query: string, itemIndex: number}>} */
        const uniqueQueryMap = new Map();
        for (let itemIndex = 0; itemIndex < termList.length; ++itemIndex) {
            const term = termList[itemIndex];
            const query = matchType === 'suffix' ? stringReverse(term) : term;
            if (query.length === 0) { continue; }
            if (!uniqueQueryMap.has(query)) {
                uniqueQueryMap.set(query, {term, query, itemIndex});
            }
        }
        const dictionaryCacheKey = this._getDictionaryCacheKey(dictionaryNames);
        const negativeCachePrefix = `${matchType}\u001f${dictionaryCacheKey}\u001f`;
        const queriesToCheck = [...uniqueQueryMap.values()].filter(({query}) => !this._termPrefixNegativeCache.has(`${negativeCachePrefix}${query}`));
        /** @type {Set<string>} */
        const foundQueries = new Set();

        for (let indexIndex = 0; indexIndex < columns.length; ++indexIndex) {
            const column = columns[indexIndex];
            /** @type {Map<string, number[]>|null} */
            let lookup = null;
            for (const queryData of queriesToCheck) {
                for (const dictionaryName of dictionaryNames) {
                    const index = this._ensureDirectTermIndex(dictionaryName);
                    switch (column) {
                        case 'expression':
                            lookup = index.expression;
                            break;
                        case 'reading':
                            lookup = index.reading;
                            break;
                        case 'expressionReverse':
                            lookup = index.expressionReverse;
                            break;
                        case 'readingReverse':
                            lookup = index.readingReverse;
                            break;
                        default:
                            lookup = null;
                            break;
                    }
                    if (lookup === null) { continue; }
                    for (const [value, ids] of lookup.entries()) {
                        if (!value.startsWith(queryData.query)) { continue; }
                        foundQueries.add(queryData.query);
                        for (const id of ids) {
                            if (id <= 0 || visited.has(id)) { continue; }
                            visited.add(id);
                            const matchSource = (indexIndex === 0) ? 'term' : 'reading';
                            const matchType2 = (value === queryData.term) ? 'exact' : matchType;
                            idMatches.set(id, {matchSource, matchType: matchType2, itemIndex: queryData.itemIndex});
                        }
                    }
                }
            }
        }
        for (const {query} of queriesToCheck) {
            const key = `${negativeCachePrefix}${query}`;
            if (foundQueries.has(query)) {
                this._termPrefixNegativeCache.delete(key);
            } else {
                this._termPrefixNegativeCache.set(key, true);
            }
        }
        if (this._termPrefixNegativeCache.size > 50000) {
            this._termPrefixNegativeCache.clear();
        }

        const rowsById = await this._fetchTermRowsByIds(idMatches.keys());
        for (const [id, {matchSource, matchType: matchType2, itemIndex}] of idMatches) {
            const row = rowsById.get(id);
            if (typeof row === 'undefined') { continue; }
            results.push(this._createTerm(matchSource, matchType2, row, itemIndex));
        }
        return results;
    }

    /**
     * @param {import('dictionary-database').TermExactRequest[]} termList
     * @param {import('dictionary-database').DictionarySet} dictionaries
     * @returns {Promise<import('dictionary-database').TermEntry[]>}
     */
    async findTermsExactBulk(termList, dictionaries) {
        this._requireDb();
        if (termList.length === 0 || dictionaries.size === 0) {
            return [];
        }
        /** @type {import('dictionary-database').TermEntry[]} */
        const results = [];
        const dictionaryNames = this._getDictionaryNames(dictionaries);
        await this._ensureDirectTermIndexesLoaded(dictionaryNames);
        /** @type {Map<string, number[]>} */
        const termReadingIndexes = new Map();
        for (let itemIndex = 0; itemIndex < termList.length; ++itemIndex) {
            const item = termList[itemIndex];
            const key = `${item.term}\u001f${item.reading}`;
            const itemIndexes = termReadingIndexes.get(key);
            if (typeof itemIndexes === 'undefined') {
                termReadingIndexes.set(key, [itemIndex]);
            } else {
                itemIndexes.push(itemIndex);
            }
        }
        const uniquePairs = [...termReadingIndexes.keys()];
        /** @type {Map<number, number[]>} */
        const idMatches = new Map();
        for (const pair of uniquePairs) {
            const itemIndexes = termReadingIndexes.get(pair);
            if (typeof itemIndexes === 'undefined') { continue; }
            for (const dictionaryName of dictionaryNames) {
                const index = this._ensureDirectTermIndex(dictionaryName);
                const ids = index.pair.get(pair);
                if (typeof ids === 'undefined') { continue; }
                for (const id of ids) {
                    if (id <= 0) { continue; }
                    const existingIndexes = idMatches.get(id);
                    if (typeof existingIndexes === 'undefined') {
                        idMatches.set(id, [...itemIndexes]);
                    } else {
                        for (const itemIndex of itemIndexes) {
                            existingIndexes.push(itemIndex);
                        }
                    }
                }
            }
        }

        const rowsById = await this._fetchTermRowsByIds(idMatches.keys());
        for (const [id, itemIndexes] of idMatches) {
            const row = rowsById.get(id);
            if (typeof row === 'undefined') { continue; }
            for (const itemIndex of itemIndexes) {
                results.push(this._createTerm('term', 'exact', row, itemIndex));
            }
        }

        return results;
    }

    /**
     * @param {import('dictionary-database').DictionaryAndQueryRequest[]} items
     * @returns {Promise<import('dictionary-database').TermEntry[]>}
     */
    async findTermsBySequenceBulk(items) {
        this._requireDb();
        if (items.length === 0) {
            return [];
        }
        /** @type {import('dictionary-database').TermEntry[]} */
        const results = [];
        /** @type {Map<string, number[]>} */
        const dictionarySequenceIndexes = new Map();
        for (let itemIndex = 0; itemIndex < items.length; ++itemIndex) {
            const item = items[itemIndex];
            const sequence = this._asNumber(item.query, -1);
            if (sequence < 0) { continue; }
            const key = `${item.dictionary}\u001f${sequence}`;
            const itemIndexes = dictionarySequenceIndexes.get(key);
            if (typeof itemIndexes === 'undefined') {
                dictionarySequenceIndexes.set(key, [itemIndex]);
            } else {
                itemIndexes.push(itemIndex);
            }
        }
        if (dictionarySequenceIndexes.size === 0) {
            return [];
        }
        const dictionaryNames = [...new Set(items.map((item) => item.dictionary))];
        await this._ensureDirectTermIndexesLoaded(dictionaryNames);
        const sequenceValues = [...new Set(items.map((item) => this._asNumber(item.query, -1)).filter((value) => value >= 0))];
        /** @type {Map<number, number[]>} */
        const idMatches = new Map();
        for (const dictionaryName of dictionaryNames) {
            const index = this._ensureDirectTermIndex(dictionaryName);
            for (const sequence of sequenceValues) {
                const ids = index.sequence.get(sequence);
                if (typeof ids === 'undefined') { continue; }
                const key = `${dictionaryName}\u001f${sequence}`;
                const itemIndexes = dictionarySequenceIndexes.get(key);
                if (typeof itemIndexes === 'undefined') { continue; }
                for (const id of ids) {
                    if (id <= 0) { continue; }
                    const existingIndexes = idMatches.get(id);
                    if (typeof existingIndexes === 'undefined') {
                        idMatches.set(id, [...itemIndexes]);
                    } else {
                        for (const itemIndex of itemIndexes) {
                            existingIndexes.push(itemIndex);
                        }
                    }
                }
            }
        }

        const rowsById = await this._fetchTermRowsByIds(idMatches.keys());
        for (const [id, itemIndexes] of idMatches) {
            const row = rowsById.get(id);
            if (typeof row === 'undefined') { continue; }
            for (const itemIndex of itemIndexes) {
                results.push(this._createTerm('sequence', 'exact', row, itemIndex));
            }
        }

        return results;
    }

    /**
     * @param {string[]} termList
     * @param {import('dictionary-database').DictionarySet} dictionaries
     * @returns {Promise<import('dictionary-database').TermMeta[]>}
     */
    async findTermMetaBulk(termList, dictionaries) {
        if (termList.length === 0 || dictionaries.size === 0) {
            return [];
        }
        /** @type {import('dictionary-database').TermMeta[]} */
        const results = [];
        const termIndexMap = this._buildTermIndexMap(termList);
        const dictionaryNames = this._getDictionaryNames(dictionaries);
        const {clause: termInClause, bind: termBind} = this._buildTextInClause(termIndexMap.keys(), 'term');
        const {clause: dictionaryInClause, bind: dictionaryBind} = this._buildTextInClause(dictionaryNames, 'dict');
        const sql = `SELECT * FROM termMeta WHERE expression IN (${termInClause}) AND dictionary IN (${dictionaryInClause})`;
        const stmt = this._getCachedStatement(sql);
        stmt.reset(true);
        stmt.bind({...termBind, ...dictionaryBind});
        while (stmt.step()) {
            const row = /** @type {import('core').SafeAny} */ (stmt.get({}));
            const expression = this._asString(row.expression);
            const itemIndexes = termIndexMap.get(expression);
            if (typeof itemIndexes === 'undefined') { continue; }
            const converted = this._deserializeTermMetaRow(row);
            for (const itemIndex of itemIndexes) {
                results.push(this._createTermMeta(converted, {itemIndex, indexIndex: 0, item: expression}));
            }
        }

        return results;
    }

    /**
     * @param {string[]} kanjiList
     * @param {import('dictionary-database').DictionarySet} dictionaries
     * @returns {Promise<import('dictionary-database').KanjiEntry[]>}
     */
    async findKanjiBulk(kanjiList, dictionaries) {
        if (kanjiList.length === 0 || dictionaries.size === 0) {
            return [];
        }
        /** @type {import('dictionary-database').KanjiEntry[]} */
        const results = [];
        const characterIndexMap = this._buildTermIndexMap(kanjiList);
        const dictionaryNames = this._getDictionaryNames(dictionaries);
        const {clause: characterInClause, bind: characterBind} = this._buildTextInClause(characterIndexMap.keys(), 'ch');
        const {clause: dictionaryInClause, bind: dictionaryBind} = this._buildTextInClause(dictionaryNames, 'dict');
        const sql = `SELECT * FROM kanji WHERE character IN (${characterInClause}) AND dictionary IN (${dictionaryInClause})`;
        const stmt = this._getCachedStatement(sql);
        stmt.reset(true);
        stmt.bind({...characterBind, ...dictionaryBind});
        while (stmt.step()) {
            const converted = this._deserializeKanjiRow(/** @type {import('core').SafeAny} */ (stmt.get({})));
            const itemIndexes = characterIndexMap.get(converted.character);
            if (typeof itemIndexes === 'undefined') { continue; }
            for (const itemIndex of itemIndexes) {
                results.push(this._createKanji(converted, {itemIndex, indexIndex: 0, item: converted.character}));
            }
        }

        return results;
    }

    /**
     * @param {string[]} kanjiList
     * @param {import('dictionary-database').DictionarySet} dictionaries
     * @returns {Promise<import('dictionary-database').KanjiMeta[]>}
     */
    async findKanjiMetaBulk(kanjiList, dictionaries) {
        if (kanjiList.length === 0 || dictionaries.size === 0) {
            return [];
        }
        /** @type {import('dictionary-database').KanjiMeta[]} */
        const results = [];
        const characterIndexMap = this._buildTermIndexMap(kanjiList);
        const dictionaryNames = this._getDictionaryNames(dictionaries);
        const {clause: characterInClause, bind: characterBind} = this._buildTextInClause(characterIndexMap.keys(), 'ch');
        const {clause: dictionaryInClause, bind: dictionaryBind} = this._buildTextInClause(dictionaryNames, 'dict');
        const sql = `SELECT * FROM kanjiMeta WHERE character IN (${characterInClause}) AND dictionary IN (${dictionaryInClause})`;
        const stmt = this._getCachedStatement(sql);
        stmt.reset(true);
        stmt.bind({...characterBind, ...dictionaryBind});
        while (stmt.step()) {
            const row = /** @type {import('core').SafeAny} */ (stmt.get({}));
            const character = this._asString(row.character);
            const itemIndexes = characterIndexMap.get(character);
            if (typeof itemIndexes === 'undefined') { continue; }
            const converted = this._deserializeKanjiMetaRow(row);
            for (const itemIndex of itemIndexes) {
                results.push(this._createKanjiMeta(converted, {itemIndex, indexIndex: 0, item: character}));
            }
        }

        return results;
    }

    /**
     * @param {import('dictionary-database').DictionaryAndQueryRequest[]} items
     * @returns {Promise<(import('dictionary-database').Tag|undefined)[]>}
     */
    async findTagMetaBulk(items) {
        if (items.length === 0) {
            return [];
        }
        const results = new Array(items.length);
        /** @type {Map<string, number[]>} */
        const requestIndexes = new Map();
        for (let i = 0; i < items.length; ++i) {
            const item = items[i];
            const key = `${item.dictionary}\u001f${this._asString(item.query)}`;
            const itemIndexes = requestIndexes.get(key);
            if (typeof itemIndexes === 'undefined') {
                requestIndexes.set(key, [i]);
            } else {
                itemIndexes.push(i);
            }
        }

        const uniqueRequests = [...requestIndexes.keys()];
        for (const requestChunk of this._chunkValues(uniqueRequests, 256)) {
            /** @type {Record<string, string>} */
            const bind = {};
            const conditions = [];
            for (let i = 0; i < requestChunk.length; ++i) {
                const [dictionary, query] = requestChunk[i].split('\u001f');
                const dictionaryKey = `$dictionary${i}`;
                const queryKey = `$query${i}`;
                bind[dictionaryKey] = dictionary;
                bind[queryKey] = query;
                conditions.push(`(dictionary = ${dictionaryKey} AND name = ${queryKey})`);
            }
            const sql = `SELECT name, category, ord as "order", notes, score, dictionary FROM tagMeta WHERE ${conditions.join(' OR ')}`;
            const stmt = this._getCachedStatement(sql);
            stmt.reset(true);
            stmt.bind(bind);
            while (stmt.step()) {
                const row = /** @type {import('core').SafeAny} */ (stmt.get({}));
                const tag = this._deserializeTagRow(row);
                const itemIndexes = requestIndexes.get(`${tag.dictionary}\u001f${tag.name}`);
                if (typeof itemIndexes === 'undefined') { continue; }
                for (const itemIndex of itemIndexes) {
                    if (typeof results[itemIndex] === 'undefined') {
                        results[itemIndex] = tag;
                    }
                }
            }
        }

        return results;
    }

    /**
     * @param {string} name
     * @param {string} dictionary
     * @returns {Promise<?import('dictionary-database').Tag>}
     */
    async findTagForTitle(name, dictionary) {
        const db = this._requireDb();
        const row = db.selectObject(
            'SELECT name, category, ord as "order", notes, score, dictionary FROM tagMeta WHERE name = $name AND dictionary = $dictionary LIMIT 1',
            {$name: name, $dictionary: dictionary},
        );
        return typeof row === 'undefined' ? null : this._deserializeTagRow(row);
    }

    /**
     * @param {import('dictionary-database').MediaRequest[]} items
     * @returns {Promise<import('dictionary-database').Media[]>}
     */
    async getMedia(items) {
        if (items.length === 0) {
            return [];
        }
        /** @type {import('dictionary-database').Media[]} */
        const results = [];
        /** @type {Map<string, number[]>} */
        const mediaRequestIndexes = new Map();
        for (let itemIndex = 0; itemIndex < items.length; ++itemIndex) {
            const item = items[itemIndex];
            const key = `${item.dictionary}\u001f${item.path}`;
            const itemIndexes = mediaRequestIndexes.get(key);
            if (typeof itemIndexes === 'undefined') {
                mediaRequestIndexes.set(key, [itemIndex]);
            } else {
                itemIndexes.push(itemIndex);
            }
        }
        const uniqueRequests = [...mediaRequestIndexes.keys()];
        for (const requestChunk of this._chunkValues(uniqueRequests, 128)) {
            /** @type {Record<string, string>} */
            const bind = {};
            const conditions = [];
            for (let i = 0; i < requestChunk.length; ++i) {
                const [dictionary, path] = requestChunk[i].split('\u001f');
                const dictionaryKey = `$dictionary${i}`;
                const pathKey = `$path${i}`;
                bind[dictionaryKey] = dictionary;
                bind[pathKey] = path;
                conditions.push(`(dictionary = ${dictionaryKey} AND path = ${pathKey})`);
            }
            const sql = `SELECT dictionary, path, mediaType, width, height, content, contentOffset, contentLength, contentCompressionMethod, contentUncompressedLength FROM media WHERE ${conditions.join(' OR ')}`;
            const stmt = this._getCachedStatement(sql);
            stmt.reset(true);
            stmt.bind(bind);
            while (stmt.step()) {
                const row = /** @type {import('core').SafeAny} */ (stmt.get({}));
                const converted = await this._deserializeMediaRow(row);
                const itemIndexes = mediaRequestIndexes.get(`${converted.dictionary}\u001f${converted.path}`);
                if (typeof itemIndexes === 'undefined') { continue; }
                for (const itemIndex of itemIndexes) {
                    results.push(this._createMedia(converted, {itemIndex, indexIndex: 0, item: items[itemIndex]}));
                }
            }
        }

        return results;
    }

    /**
     * @param {import('dictionary-database').DrawMediaRequest[]} items
     * @param {MessagePort} source
     */
    async drawMedia(items, source) {
        if (this._worker !== null) {
            this._worker.postMessage({action: 'drawMedia', params: {items}}, [source]);
            return;
        }

        safePerformance.mark('drawMedia:start');

        /** @type {Map<string, import('dictionary-database').DrawMediaGroupedRequest>} */
        const groupedItems = new Map();
        for (const item of items) {
            const {path, dictionary, canvasIndex, canvasWidth, canvasHeight, generation} = item;
            const key = `${path}:::${dictionary}`;
            if (!groupedItems.has(key)) {
                groupedItems.set(key, {path, dictionary, canvasIndexes: [], canvasWidth, canvasHeight, generation});
            }
            groupedItems.get(key)?.canvasIndexes.push(canvasIndex);
        }
        const groupedItemsArray = [...groupedItems.values()];
        const media = await this.getMedia(groupedItemsArray);
        const results = media.map((item) => {
            const grouped = groupedItemsArray[item.index];
            return {
                ...item,
                canvasIndexes: grouped.canvasIndexes,
                canvasWidth: grouped.canvasWidth,
                canvasHeight: grouped.canvasHeight,
                generation: grouped.generation,
            };
        });

        results.sort((a, _b) => (a.mediaType === 'image/svg+xml' ? -1 : 1));

        safePerformance.mark('drawMedia:draw:start');
        for (const m of results) {
            if (m.mediaType === 'image/svg+xml') {
                safePerformance.mark('drawMedia:draw:svg:start');
                /** @type {import('@resvg/resvg-wasm').ResvgRenderOptions} */
                const opts = {
                    fitTo: {
                        mode: 'width',
                        value: m.canvasWidth,
                    },
                    font: {
                        fontBuffers: this._resvgFontBuffer !== null ? [this._resvgFontBuffer] : [],
                    },
                };
                const resvgJS = new Resvg(new Uint8Array(m.content), opts);
                const render = resvgJS.render();
                source.postMessage({action: 'drawBufferToCanvases', params: {buffer: render.pixels.buffer, width: render.width, height: render.height, canvasIndexes: m.canvasIndexes, generation: m.generation}}, [render.pixels.buffer]);
                safePerformance.mark('drawMedia:draw:svg:end');
                safePerformance.measure('drawMedia:draw:svg', 'drawMedia:draw:svg:start', 'drawMedia:draw:svg:end');
            } else {
                safePerformance.mark('drawMedia:draw:raster:start');

                if ('serviceWorker' in navigator) {
                    const imageDecoder = new ImageDecoder({type: m.mediaType, data: m.content});
                    await imageDecoder.decode().then((decodedImageResult) => {
                        source.postMessage({action: 'drawDecodedImageToCanvases', params: {decodedImage: decodedImageResult.image, canvasIndexes: m.canvasIndexes, generation: m.generation}}, [decodedImageResult.image]);
                    });
                } else {
                    const image = new Blob([m.content], {type: m.mediaType});
                    await createImageBitmap(image, {resizeWidth: m.canvasWidth, resizeHeight: m.canvasHeight, resizeQuality: 'high'}).then((decodedImage) => {
                        const canvas = new OffscreenCanvas(decodedImage.width, decodedImage.height);
                        const ctx = canvas.getContext('2d');
                        if (ctx !== null) {
                            ctx.drawImage(decodedImage, 0, 0);
                            const imageData = ctx.getImageData(0, 0, decodedImage.width, decodedImage.height);
                            source.postMessage({action: 'drawBufferToCanvases', params: {buffer: imageData.data.buffer, width: decodedImage.width, height: decodedImage.height, canvasIndexes: m.canvasIndexes, generation: m.generation}}, [imageData.data.buffer]);
                        }
                    });
                }
                safePerformance.mark('drawMedia:draw:raster:end');
                safePerformance.measure('drawMedia:draw:raster', 'drawMedia:draw:raster:start', 'drawMedia:draw:raster:end');
            }
        }
        safePerformance.mark('drawMedia:draw:end');
        safePerformance.measure('drawMedia:draw', 'drawMedia:draw:start', 'drawMedia:draw:end');

        safePerformance.mark('drawMedia:end');
        safePerformance.measure('drawMedia', 'drawMedia:start', 'drawMedia:end');
    }

    /**
     * @returns {Promise<import('dictionary-importer').Summary[]>}
     */
    async getDictionaryInfo() {
        const db = this._requireDb();
        const rows = db.selectObjects('SELECT summaryJson FROM dictionaries ORDER BY id ASC');
        return rows.map((row) => /** @type {import('dictionary-importer').Summary} */ (this._safeParseJson(this._asString(row.summaryJson), {})));
    }

    /**
     * @param {(dictionaryName: string) => boolean} predicate
     * @returns {Promise<string[]>}
     */
    async cleanupTransientTermRecordShards(predicate) {
        return await this._termRecordStore.cleanupShardFilesByDictionaryPredicate(predicate);
    }

    /**
     * @returns {Promise<Array<{
     *   id: number,
     *   titleColumn: string,
     *   versionColumn: number,
     *   summaryJsonLength: number,
     *   summaryParseOk: boolean,
     *   summaryTitle: string|null,
     *   summaryImportSuccess: boolean|null
     * }>>}
     */
    async debugGetDictionaryRows() {
        const db = this._requireDb();
        const rows = db.selectObjects('SELECT id, title, version, summaryJson FROM dictionaries ORDER BY id ASC');
        return rows.map((row) => {
            const summaryJson = this._asString(row.summaryJson);
            let summary = null;
            let summaryParseOk = false;
            try {
                summary = /** @type {unknown} */ (parseJson(summaryJson));
                summaryParseOk = true;
            } catch (_) {
                summary = null;
            }
            const summaryObject = (typeof summary === 'object' && summary !== null && !Array.isArray(summary)) ? summary : null;
            const summaryTitle = summaryObject !== null && typeof Reflect.get(summaryObject, 'title') === 'string' ?
                /** @type {string} */ (Reflect.get(summaryObject, 'title')) :
                null;
            const summaryImportSuccess = summaryObject !== null && typeof Reflect.get(summaryObject, 'importSuccess') === 'boolean' ?
                /** @type {boolean} */ (Reflect.get(summaryObject, 'importSuccess')) :
                null;
            return {
                id: this._asNumber(row.id, 0),
                titleColumn: this._asString(row.title),
                versionColumn: this._asNumber(row.version, 0),
                summaryJsonLength: summaryJson.length,
                summaryParseOk,
                summaryTitle,
                summaryImportSuccess,
            };
        });
    }

    /**
     * @returns {Promise<{
     *   scannedCount: number,
     *   removedCount: number,
     *   removedTitles: string[],
     *   removedEmptyTitleRows: number,
     *   failedCount: number,
     *   failedTitles: string[],
     *   parseErrorCount: number
     * }>}
     */
    async _cleanupIncompleteImports() {
        const db = this._requireDb();
        const rows = db.selectObjects('SELECT id, title, summaryJson FROM dictionaries ORDER BY id ASC');
        if (rows.length === 0) {
            const summary = {
                scannedCount: 0,
                removedCount: 0,
                removedTitles: [],
                removedEmptyTitleRows: 0,
                failedCount: 0,
                failedTitles: [],
                parseErrorCount: 0,
            };
            this._startupCleanupIncompleteImportsSummary = summary;
            reportDiagnostics('dictionary-startup-cleanup-summary', summary);
            return summary;
        }

        /** @type {Set<string>} */
        const dictionaryTitlesToDelete = new Set();
        /** @type {number} */
        let removedEmptyTitleRows = 0;
        /** @type {number} */
        let parseErrorCount = 0;
        for (const row of rows) {
            const id = this._asNumber(row.id, 0);
            const title = this._asString(row.title).trim();
            const summaryJson = this._asString(row.summaryJson);
            let summaryParseFailed = false;
            /** @type {unknown} */
            let summary;
            try {
                summary = /** @type {unknown} */ (parseJson(summaryJson));
            } catch (_) {
                summary = null;
                summaryParseFailed = true;
            }
            if (summaryParseFailed) {
                parseErrorCount += 1;
            }
            const importSuccess = (
                typeof summary === 'object' &&
                summary !== null &&
                !Array.isArray(summary)
            ) ?
                /** @type {unknown} */ (Reflect.get(summary, 'importSuccess')) :
                void 0;
            if (title.length > 0 && isRecognizedTransientUpdateTitle(title, summary)) {
                dictionaryTitlesToDelete.add(title);
                continue;
            }
            if (summary !== null && importSuccess !== false) {
                continue;
            }
            if (title.length === 0) {
                db.exec({sql: 'DELETE FROM dictionaries WHERE id = $id', bind: {$id: id}});
                log.warn('Removed incomplete dictionary summary row with empty title.');
                removedEmptyTitleRows += 1;
                continue;
            }
            dictionaryTitlesToDelete.add(title);
        }

        /** @type {string[]} */
        const removedTitles = [];
        /** @type {string[]} */
        const failedTitles = [];
        for (const dictionaryTitle of dictionaryTitlesToDelete) {
            try {
                await this.deleteDictionary(dictionaryTitle, 1000, () => {});
                log.warn(`Removed incomplete dictionary import during startup: ${dictionaryTitle}`);
                removedTitles.push(dictionaryTitle);
            } catch (e) {
                const error = toError(e);
                log.error(new Error(`Failed to remove incomplete dictionary import '${dictionaryTitle}': ${error.message}`));
                failedTitles.push(dictionaryTitle);
            }
        }

        const summary = {
            scannedCount: rows.length,
            removedCount: removedTitles.length + removedEmptyTitleRows,
            removedTitles: [...removedTitles].sort((a, b) => a.localeCompare(b)),
            removedEmptyTitleRows,
            failedCount: failedTitles.length,
            failedTitles: [...failedTitles].sort((a, b) => a.localeCompare(b)),
            parseErrorCount,
        };
        this._startupCleanupIncompleteImportsSummary = summary;
        reportDiagnostics('dictionary-startup-cleanup-summary', summary);
        return summary;
    }

    /**
     * @returns {Promise<{
     *   scannedCount: number,
     *   expectedTermDictionaryCount: number,
     *   missingShardDictionaryCount: number,
     *   missingShardDictionaryNames: string[],
     *   removedCount: number,
     *   removedTitles: string[],
     *   failedCount: number,
     *   failedTitles: string[],
     *   parseErrorCount: number,
     *   shardIntegrity: {
     *     expectedShardCount: number,
     *     actualShardCount: number,
     *     missingShardCount: number,
     *     missingShardFileNames: string[],
     *     missingDictionaryNames: string[],
     *     orphanShardCount: number,
     *     orphanShardFileNames: string[],
     *     orphanDictionaryNames: string[],
     *     removedOrphanShardCount: number,
     *     invalidShardPayloadCount: number,
     *     invalidShardFileNames: string[],
     *     rewroteAllShardsFromMemory: boolean
     *   }
     * }>}
     */
    async _cleanupMissingTermRecordShards() {
        const db = this._requireDb();
        const rows = db.selectObjects('SELECT title, summaryJson FROM dictionaries ORDER BY id ASC');
        /** @type {string[]} */
        const expectedTermDictionaryNames = [];
        let parseErrorCount = 0;
        for (const row of rows) {
            const title = this._asString(row.title).trim();
            if (title.length === 0) { continue; }
            let summary;
            try {
                summary = /** @type {unknown} */ (parseJson(this._asString(row.summaryJson)));
            } catch (_) {
                ++parseErrorCount;
                continue;
            }
            if (typeof summary !== 'object' || summary === null || Array.isArray(summary)) {
                continue;
            }
            const counts = /** @type {unknown} */ (Reflect.get(summary, 'counts'));
            const terms = (typeof counts === 'object' && counts !== null) ? /** @type {unknown} */ (Reflect.get(counts, 'terms')) : null;
            const total = (typeof terms === 'object' && terms !== null) ? this._asNumber(Reflect.get(terms, 'total'), 0) : 0;
            if (total > 0) {
                expectedTermDictionaryNames.push(title);
            }
        }
        const shardIntegrity = await this._termRecordStore.verifyIntegrity(expectedTermDictionaryNames);
        const missingShardDictionaryNames = [...new Set(
            (Array.isArray(shardIntegrity.missingDictionaryNames) ? shardIntegrity.missingDictionaryNames : [])
                .filter((name) => typeof name === 'string' && name.length > 0),
        )].sort((a, b) => a.localeCompare(b));

        /** @type {string[]} */
        const removedTitles = [];
        /** @type {string[]} */
        const failedTitles = [];
        for (const title of missingShardDictionaryNames) {
            try {
                await this.deleteDictionary(title, 1000, () => {});
                removedTitles.push(title);
            } catch (e) {
                const error = toError(e);
                log.error(new Error(`Failed to remove dictionary with missing term-record shard '${title}': ${error.message}`));
                failedTitles.push(title);
            }
        }

        const summary = {
            scannedCount: rows.length,
            expectedTermDictionaryCount: expectedTermDictionaryNames.length,
            missingShardDictionaryCount: missingShardDictionaryNames.length,
            missingShardDictionaryNames,
            removedCount: removedTitles.length,
            removedTitles: [...removedTitles].sort((a, b) => a.localeCompare(b)),
            failedCount: failedTitles.length,
            failedTitles: [...failedTitles].sort((a, b) => a.localeCompare(b)),
            parseErrorCount,
            shardIntegrity,
        };
        this._startupCleanupMissingTermRecordShardsSummary = summary;
        reportDiagnostics('dictionary-term-record-integrity-summary', summary);
        return summary;
    }

    /**
     * @param {string[]} dictionaryNames
     * @param {boolean} getTotal
     * @returns {Promise<import('dictionary-database').DictionaryCounts>}
     */
    async getDictionaryCounts(dictionaryNames, getTotal) {
        const db = this._requireDb();
        const tables = ['kanji', 'kanjiMeta', 'termMeta', 'tagMeta', 'media'];
        if (getTotal) {
            await this._termRecordStore.ensureAllDictionariesLoaded();
        } else {
            await this._termRecordStore.ensureDictionariesLoaded(dictionaryNames);
        }

        /** @type {import('dictionary-database').DictionaryCountGroup[]} */
        const counts = [];

        if (getTotal) {
            /** @type {import('dictionary-database').DictionaryCountGroup} */
            const total = {terms: this._termRecordStore.size};
            for (const table of tables) {
                total[table] = this._asNumber(db.selectValue(`SELECT COUNT(*) FROM ${table}`), 0);
            }
            counts.push(total);
        }

        for (const dictionaryName of dictionaryNames) {
            /** @type {import('dictionary-database').DictionaryCountGroup} */
            const countGroup = {terms: 0};
            const termIndex = this._termRecordStore.getDictionaryIndex(dictionaryName);
            countGroup.terms = [...termIndex.expression.values()].reduce((sum, list) => sum + list.length, 0);
            for (const table of tables) {
                countGroup[table] = this._asNumber(
                    db.selectValue(`SELECT COUNT(*) FROM ${table} WHERE dictionary = $dictionary`, {$dictionary: dictionaryName}),
                    0,
                );
            }
            counts.push(countGroup);
        }

        const total = getTotal ? /** @type {import('dictionary-database').DictionaryCountGroup} */ (counts.shift()) : null;
        return {total, counts};
    }

    /**
     * @param {string} title
     * @returns {Promise<boolean>}
     */
    async dictionaryExists(title) {
        const db = this._requireDb();
        const value = db.selectValue('SELECT 1 FROM dictionaries WHERE title = $title LIMIT 1', {$title: title});
        return typeof value !== 'undefined';
    }

    /**
     * @template {import('dictionary-database').ObjectStoreName} T
     * @param {T} objectStoreName
     * @param {import('dictionary-database').ObjectStoreData<T>[]} items
     * @param {number} start
     * @param {number} count
     * @returns {Promise<void>}
     */
    async bulkAdd(objectStoreName, items, start, count) {
        const db = this._requireDb();

        if (start + count > items.length) {
            count = items.length - start;
        }
        if (count <= 0) { return; }
        if (objectStoreName === 'terms') {
            this._lastBulkAddTermsMetrics = null;
            this._termEntryContentCache.clear();
            if (!this._bulkImportTransactionOpen) {
                this._termEntryContentIdByHash.clear();
                this._termEntryContentIdByKey.clear();
                this._clearTermEntryContentMetaCaches();
            }
            this._termExactPresenceCache.clear();
            this._termPrefixNegativeCache.clear();
            this._directTermIndexByDictionary.clear();
        }

        if (objectStoreName === 'terms') {
            await this._bulkAddTerms(/** @type {import('dictionary-database').ObjectStoreData<'terms'>[]} */ (items), start, count);
            return;
        }
        const descriptor = this._getBulkInsertDescriptor(objectStoreName);
        const useLocalTransaction = !this._bulkImportTransactionOpen;

        if (useLocalTransaction) {
            await this._beginImmediateTransaction(db);
        }
        try {
            await this._bulkInsertWithDescriptor(descriptor, items, start, count);
            if (useLocalTransaction) {
                db.exec('COMMIT');
            }
        } catch (e) {
            if (useLocalTransaction) {
                try { db.exec('ROLLBACK'); } catch (_) { /* NOP */ }
            }
            throw e;
        }
    }

    /**
     * @param {{dictionary: string, rowCount: number, expressionBytesList: Uint8Array[], readingBytesList: Uint8Array[], readingEqualsExpressionList: boolean[], scoreList: number[], sequenceList: (number|undefined)[], contentBytesList: Uint8Array[], contentHash1List?: number[], contentHash2List?: number[], contentDictNameList: ((string|null)[]|null), termRecordPreinternedPlan?: import('./term-record-wasm-encoder.js').PreinternedTermRecordPlan|null, uniformContentDictName?: string|null}} chunk
     * @returns {Promise<void>}
     */
    async bulkAddArtifactTermsChunk(chunk) {
        this._lastBulkAddTermsMetrics = null;
        this._termEntryContentCache.clear();
        if (!this._bulkImportTransactionOpen) {
            this._termEntryContentIdByHash.clear();
            this._termEntryContentIdByKey.clear();
            this._clearTermEntryContentMetaCaches();
        }
        this._termExactPresenceCache.clear();
        this._termPrefixNegativeCache.clear();
        this._directTermIndexByDictionary.clear();
        if (this._enableTermEntryContentDedup) {
            const hasHashArrays = (
                (Array.isArray(chunk.contentHash1List) || chunk.contentHash1List instanceof Uint32Array) &&
                (Array.isArray(chunk.contentHash2List) || chunk.contentHash2List instanceof Uint32Array)
            );
            if (hasHashArrays) {
                await this._bulkAddArtifactTermsChunkWithContentDedup(chunk);
                return;
            }
            const rows = this._materializeArtifactChunkTermEntries(chunk);
            await this._bulkAddTerms(rows, 0, rows.length);
            return;
        }
        const rows = this._materializeArtifactChunkTermEntries(chunk);
        await this._bulkAddTermsWithoutContentDedup(rows, 0, rows.length);
    }

    /**
     * @returns {{contentAppendMs: number, termRecordBuildMs: number, termRecordEncodeMs: number, termRecordWriteMs: number, termsVtabInsertMs: number, termRecordInternMs?: number, termRecordPackLengthsMs?: number, termRecordHeapCopyMs?: number, termRecordWasmEncodeMs?: number}|null}
     */
    getLastBulkAddTermsMetrics() {
        return this._lastBulkAddTermsMetrics;
    }

    /**
     * @param {{dictionary: string, rowCount: number, expressionBytesList: Uint8Array[], readingBytesList: Uint8Array[], readingEqualsExpressionList: boolean[], scoreList: number[], sequenceList: (number|undefined)[], contentBytesList: Uint8Array[], contentDictNameList: ((string|null)[]|null)}} chunk
     * @returns {import('dictionary-database').DatabaseTermEntry[]}
     */
    _materializeArtifactChunkTermEntries(chunk) {
        const count = chunk.rowCount;
        /** @type {import('dictionary-database').DatabaseTermEntry[]} */
        const rows = new Array(count);
        for (let i = 0; i < count; ++i) {
            const expressionBytes = chunk.expressionBytesList[i];
            const readingEqualsExpression = chunk.readingEqualsExpressionList[i] === true || chunk.readingEqualsExpressionList[i] === 1;
            const readingBytes = readingEqualsExpression ? expressionBytes : chunk.readingBytesList[i];
            const expression = this._textDecoder.decode(expressionBytes);
            const reading = readingEqualsExpression ? expression : this._textDecoder.decode(readingBytes);
            const sequenceValue = chunk.sequenceList[i];
            rows[i] = {
                dictionary: chunk.dictionary,
                expression,
                reading,
                expressionBytes,
                readingBytes: readingEqualsExpression ? void 0 : readingBytes,
                readingEqualsExpression,
                expressionReverse: null,
                readingReverse: null,
                rules: '',
                definitionTags: '',
                termTags: '',
                glossary: [],
                score: chunk.scoreList[i] ?? 0,
                sequence: typeof sequenceValue === 'number' && sequenceValue >= 0 ? sequenceValue : null,
                termEntryContentBytes: chunk.contentBytesList[i],
                termEntryContentDictName: Array.isArray(chunk.contentDictNameList) ? (chunk.contentDictNameList[i] ?? null) : null,
            };
        }
        return rows;
    }

    /**
     * @param {string} dictionary
     * @returns {{contentOffset: number, contentLength: number, contentDictName: string, uncompressedLength: number}|null}
     */
    _getSharedGlossaryArtifactMeta(dictionary) {
        const cached = this._sharedGlossaryArtifactMetaByDictionary.get(dictionary);
        if (typeof cached !== 'undefined') {
            return cached;
        }
        const db = this._requireDb();
        const row = db.selectObject(
            'SELECT contentOffset, contentLength, contentDictName, uncompressedLength FROM sharedGlossaryArtifacts WHERE dictionary = $dictionary LIMIT 1',
            {$dictionary: dictionary},
        );
        if (typeof row === 'undefined') {
            return null;
        }
        const meta = {
            contentOffset: this._asNumber(row.contentOffset, -1),
            contentLength: this._asNumber(row.contentLength, 0),
            contentDictName: this._asString(row.contentDictName),
            uncompressedLength: this._asNumber(row.uncompressedLength, 0),
        };
        this._sharedGlossaryArtifactMetaByDictionary.set(dictionary, meta);
        return meta;
    }

    /**
     * @param {string} dictionary
     * @param {number} glossaryOffset
     * @param {number} glossaryLength
     * @returns {Promise<Uint8Array>}
     */
    async _readCompressedSharedGlossarySlice(dictionary, glossaryOffset, glossaryLength) {
        const cached = this._sharedGlossaryArtifactInflatedByDictionary.get(dictionary);
        if (cached instanceof Uint8Array) {
            return cached.subarray(glossaryOffset, glossaryOffset + glossaryLength);
        }
        const meta = this._getSharedGlossaryArtifactMeta(dictionary);
        if (meta === null || meta.contentOffset < 0 || meta.contentLength <= 0) {
            return new Uint8Array(0);
        }
        const compressedBytes = await this._termContentStore.readSlice(meta.contentOffset, meta.contentLength);
        let inflatedBytes = compressedBytes;
        if (meta.contentDictName === RAW_TERM_CONTENT_COMPRESSED_SHARED_GLOSSARY_DICT_NAME) {
            const defaultHeapSize = meta.uncompressedLength > 0 ? meta.uncompressedLength : (compressedBytes.byteLength * 16);
            inflatedBytes = zstdDecompress(compressedBytes, {defaultHeapSize});
        }
        this._sharedGlossaryArtifactInflatedByDictionary.set(dictionary, inflatedBytes);
        return inflatedBytes.subarray(glossaryOffset, glossaryOffset + glossaryLength);
    }

    /**
     * @param {string} dictionary
     * @param {Uint8Array} bytes
     * @param {string} contentDictName
     * @param {number} uncompressedLength
     * @returns {Promise<{offset: number, length: number}>}
     */
    async appendRawSharedGlossaryArtifact(dictionary, bytes, contentDictName, uncompressedLength) {
        const spans = await this._termContentStore.appendBatch([bytes]);
        const span = spans.length > 0 ? spans[0] : {offset: 0, length: 0};
        const db = this._requireDb();
        db.exec({
            sql: `
                INSERT INTO sharedGlossaryArtifacts(dictionary, contentOffset, contentLength, contentDictName, uncompressedLength)
                VALUES($dictionary, $contentOffset, $contentLength, $contentDictName, $uncompressedLength)
                ON CONFLICT(dictionary) DO UPDATE SET
                    contentOffset = excluded.contentOffset,
                    contentLength = excluded.contentLength,
                    contentDictName = excluded.contentDictName,
                    uncompressedLength = excluded.uncompressedLength
            `,
            bind: {
                $dictionary: dictionary,
                $contentOffset: span.offset,
                $contentLength: span.length,
                $contentDictName: contentDictName,
                $uncompressedLength: Math.max(0, uncompressedLength),
            },
        });
        this._sharedGlossaryArtifactMetaByDictionary.set(dictionary, {
            contentOffset: span.offset,
            contentLength: span.length,
            contentDictName,
            uncompressedLength: Math.max(0, uncompressedLength),
        });
        this._sharedGlossaryArtifactInflatedByDictionary.delete(dictionary);
        return span;
    }

    /**
     * @param {Uint8Array} bytes
     * @returns {Promise<{offset: number, length: number}>}
     */
    async appendMediaContentBytes(bytes) {
        const spans = await this._termContentStore.appendBatch([bytes]);
        return spans.length > 0 ? spans[0] : {offset: 0, length: 0};
    }

    /**
     * @param {Blob} blob
     * @returns {Promise<{offset: number, length: number}>}
     */
    async appendMediaContentBlob(blob) {
        return await this._termContentStore.appendBlob(blob);
    }

    /**
     * @returns {Promise<void>}
     */
    async flushMediaContentImportWrites() {
        await this._termContentStore.flushImportWrites();
    }

    /**
     * @param {import('dictionary-database').MediaDataArrayBufferContent[]} items
     * @returns {Promise<void>}
     */
    async bulkAddExternalMediaRows(items) {
        const db = this._requireDb();
        if (items.length === 0) { return; }
        const useLocalTransaction = !this._bulkImportTransactionOpen;
        if (useLocalTransaction) {
            await this._beginImmediateTransaction(db);
        }
        try {
            for (let i = 0, ii = items.length; i < ii; i += EXTERNAL_MEDIA_BULK_INSERT_BATCH_SIZE) {
                const chunkCount = Math.min(EXTERNAL_MEDIA_BULK_INSERT_BATCH_SIZE, ii - i);
                /** @type {string[]} */
                const valueRows = [];
                /** @type {import('@sqlite.org/sqlite-wasm').Bindable[]} */
                const bind = [];
                for (let j = 0; j < chunkCount; ++j) {
                    const row = items[i + j];
                    valueRows.push('(?, ?, ?, ?, ?, x\'\', ?, ?, ?, ?)');
                    bind.push(
                        row.dictionary,
                        row.path,
                        row.mediaType,
                        row.width,
                        row.height,
                        typeof row.contentOffset === 'number' ? row.contentOffset : 0,
                        typeof row.contentLength === 'number' ? row.contentLength : 0,
                        typeof row.contentCompressionMethod === 'number' ? row.contentCompressionMethod : ZIP_COMPRESSION_METHOD_STORE,
                        typeof row.contentUncompressedLength === 'number' ? row.contentUncompressedLength : (typeof row.contentLength === 'number' ? row.contentLength : 0),
                    );
                }
                const sql = 'INSERT INTO media(dictionary, path, mediaType, width, height, content, contentOffset, contentLength, contentCompressionMethod, contentUncompressedLength) VALUES ' + valueRows.join(',');
                const stmt = this._getCachedStatement(sql);
                stmt.reset(true);
                stmt.bind(bind);
                stmt.step();
            }
            if (useLocalTransaction) {
                db.exec('COMMIT');
            }
        } catch (e) {
            if (useLocalTransaction) {
                try { db.exec('ROLLBACK'); } catch (_) { /* NOP */ }
            }
            throw e;
        }
    }

    /**
     * @param {string} dictionary
     * @param {Array<{path: string, mediaType: string, packedOffset: number, packedLength: number, compressionMethod?: number, uncompressedLength?: number}>} items
     * @param {number} baseOffset
     * @param {boolean} preserveCompressedMedia
     * @returns {Promise<void>}
     */
    async bulkAddExternalMediaManifestRows(dictionary, items, baseOffset, preserveCompressedMedia = false) {
        const db = this._requireDb();
        if (items.length === 0) { return; }
        const useLocalTransaction = !this._bulkImportTransactionOpen;
        if (useLocalTransaction) {
            await this._beginImmediateTransaction(db);
        }
        try {
            for (let i = 0, ii = items.length; i < ii; i += EXTERNAL_MEDIA_BULK_INSERT_BATCH_SIZE) {
                const chunkCount = Math.min(EXTERNAL_MEDIA_BULK_INSERT_BATCH_SIZE, ii - i);
                /** @type {string[]} */
                const valueRows = [];
                /** @type {import('@sqlite.org/sqlite-wasm').Bindable[]} */
                const bind = [];
                for (let j = 0; j < chunkCount; ++j) {
                    const row = items[i + j];
                    valueRows.push('(?, ?, ?, ?, ?, x\'\', ?, ?, ?, ?)');
                    const packedLength = row.packedLength;
                    bind.push(
                        dictionary,
                        row.path,
                        row.mediaType,
                        0,
                        0,
                        baseOffset + row.packedOffset,
                        packedLength,
                        preserveCompressedMedia ?
                            (typeof row.compressionMethod === 'number' ? row.compressionMethod : ZIP_COMPRESSION_METHOD_STORE) :
                            ZIP_COMPRESSION_METHOD_STORE,
                        preserveCompressedMedia ?
                            (typeof row.uncompressedLength === 'number' ? row.uncompressedLength : packedLength) :
                            packedLength,
                    );
                }
                const sql = 'INSERT INTO media(dictionary, path, mediaType, width, height, content, contentOffset, contentLength, contentCompressionMethod, contentUncompressedLength) VALUES ' + valueRows.join(',');
                const stmt = this._getCachedStatement(sql);
                stmt.reset(true);
                stmt.bind(bind);
                stmt.step();
            }
            if (useLocalTransaction) {
                db.exec('COMMIT');
            }
        } catch (e) {
            if (useLocalTransaction) {
                try { db.exec('ROLLBACK'); } catch (_) { /* NOP */ }
            }
            throw e;
        }
    }

    /**
     * @param {{table: string, columnsSql: string, rowPlaceholderSql: string, batchSize: number, bindRow: (item: unknown) => import('@sqlite.org/sqlite-wasm').Bindable[]}} descriptor
     * @param {unknown[]} items
     * @param {number} start
     * @param {number} count
     * @returns {Promise<void>}
     */
    async _bulkInsertWithDescriptor(descriptor, items, start, count) {
        const {table, columnsSql, rowPlaceholderSql, batchSize, bindRow} = descriptor;
        for (let i = start, ii = start + count; i < ii; i += batchSize) {
            const chunkCount = Math.min(batchSize, ii - i);
            /** @type {string[]} */
            const valueRows = [];
            /** @type {import('@sqlite.org/sqlite-wasm').Bindable[]} */
            const bind = [];
            for (let j = 0; j < chunkCount; ++j) {
                valueRows.push(rowPlaceholderSql);
                const rowBind = bindRow(items[i + j]);
                for (const value of rowBind) {
                    bind.push(value);
                }
            }
            const sql = `INSERT INTO ${table}(${columnsSql}) VALUES ${valueRows.join(',')}`;
            const stmt = this._getCachedStatement(sql);
            stmt.reset(true);
            stmt.bind(bind);
            stmt.step();
        }
    }

    /**
     * @param {import('dictionary-database').ObjectStoreName} objectStoreName
     * @returns {{table: string, columnsSql: string, rowPlaceholderSql: string, batchSize: number, bindRow: (item: unknown) => import('@sqlite.org/sqlite-wasm').Bindable[]}}
     * @throws {Error}
     */
    _getBulkInsertDescriptor(objectStoreName) {
        switch (objectStoreName) {
            case 'dictionaries':
                return {
                    table: 'dictionaries',
                    columnsSql: 'title, version, summaryJson',
                    rowPlaceholderSql: '(?, ?, ?)',
                    batchSize: 256,
                    bindRow: (item) => {
                        const summary = /** @type {import('dictionary-importer').Summary} */ (item);
                        return [summary.title, summary.version, JSON.stringify(summary)];
                    },
                };
            case 'termMeta':
                return {
                    table: 'termMeta',
                    columnsSql: 'dictionary, expression, mode, dataJson',
                    rowPlaceholderSql: '(?, ?, ?, ?)',
                    batchSize: 2048,
                    bindRow: (item) => {
                        const row = /** @type {import('dictionary-database').DatabaseTermMeta} */ (item);
                        return [row.dictionary, row.expression, row.mode, JSON.stringify(row.data)];
                    },
                };
            case 'kanji':
                return {
                    table: 'kanji',
                    columnsSql: 'dictionary, character, onyomi, kunyomi, tags, meaningsJson, statsJson',
                    rowPlaceholderSql: '(?, ?, ?, ?, ?, ?, ?)',
                    batchSize: 1024,
                    bindRow: (item) => {
                        const row = /** @type {import('dictionary-database').DatabaseKanjiEntry} */ (item);
                        return [
                            row.dictionary,
                            row.character,
                            row.onyomi,
                            row.kunyomi,
                            row.tags,
                            JSON.stringify(row.meanings),
                            typeof row.stats !== 'undefined' ? JSON.stringify(row.stats) : null,
                        ];
                    },
                };
            case 'kanjiMeta':
                return {
                    table: 'kanjiMeta',
                    columnsSql: 'dictionary, character, mode, dataJson',
                    rowPlaceholderSql: '(?, ?, ?, ?)',
                    batchSize: 2048,
                    bindRow: (item) => {
                        const row = /** @type {import('dictionary-database').DatabaseKanjiMeta} */ (item);
                        return [row.dictionary, row.character, row.mode, JSON.stringify(row.data)];
                    },
                };
            case 'tagMeta':
                return {
                    table: 'tagMeta',
                    columnsSql: 'dictionary, name, category, ord, notes, score',
                    rowPlaceholderSql: '(?, ?, ?, ?, ?, ?)',
                    batchSize: 2048,
                    bindRow: (item) => {
                        const row = /** @type {import('dictionary-database').Tag} */ (item);
                        return [row.dictionary, row.name, row.category, row.order, row.notes, row.score];
                    },
                };
            case 'media':
                return {
                    table: 'media',
                    columnsSql: 'dictionary, path, mediaType, width, height, content, contentOffset, contentLength, contentCompressionMethod, contentUncompressedLength',
                    rowPlaceholderSql: '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    batchSize: 8,
                    bindRow: (item) => {
                        const row = /** @type {import('dictionary-database').MediaDataArrayBufferContent} */ (item);
                        return [
                            row.dictionary,
                            row.path,
                            row.mediaType,
                            row.width,
                            row.height,
                            row.content,
                            typeof row.contentOffset === 'number' ? row.contentOffset : 0,
                            typeof row.contentLength === 'number' ? row.contentLength : 0,
                            typeof row.contentCompressionMethod === 'number' ? row.contentCompressionMethod : ZIP_COMPRESSION_METHOD_STORE,
                            typeof row.contentUncompressedLength === 'number' ? row.contentUncompressedLength : (typeof row.contentLength === 'number' ? row.contentLength : 0),
                        ];
                    },
                };
            default:
                throw new Error(`Unsupported object store: ${objectStoreName}`);
        }
    }

    /**
     * @template {import('dictionary-database').ObjectStoreName} T
     * @param {T} objectStoreName
     * @param {import('dictionary-database').ObjectStoreData<T>} item
     * @returns {Promise<number>}
     */
    async addWithResult(objectStoreName, item) {
        await this.bulkAdd(objectStoreName, [item], 0, 1);
        const db = this._requireDb();
        return this._asNumber(db.selectValue('SELECT last_insert_rowid()'), -1);
    }

    /**
     * @template {import('dictionary-database').ObjectStoreName} T
     * @param {T} objectStoreName
     * @param {import('dictionary-database').DatabaseUpdateItem[]} items
     * @param {number} start
     * @param {number} count
     * @returns {Promise<void>}
     */
    async bulkUpdate(objectStoreName, items, start, count) {
        const db = this._requireDb();

        if (start + count > items.length) {
            count = items.length - start;
        }
        if (count <= 0) { return; }

        switch (objectStoreName) {
            case 'dictionaries':
                break;
            default:
                throw new Error(`Unsupported bulkUpdate store: ${objectStoreName}`);
        }

        const stmt = this._getCachedStatement('UPDATE dictionaries SET title = $title, version = $version, summaryJson = $summaryJson WHERE id = $id');
        const useLocalTransaction = !this._bulkImportTransactionOpen;

        if (useLocalTransaction) {
            await this._beginImmediateTransaction(db);
        }
        try {
            for (let i = start, ii = start + count; i < ii; ++i) {
                const {data, primaryKey} = items[i];
                const summary = /** @type {import('dictionary-importer').Summary} */ (data);
                stmt.reset(true);
                stmt.bind({
                    $id: this._asNumber(primaryKey, -1),
                    $title: summary.title,
                    $version: summary.version,
                    $summaryJson: JSON.stringify(summary),
                });
                stmt.step();
            }
            if (useLocalTransaction) {
                db.exec('COMMIT');
            }
        } catch (e) {
            if (useLocalTransaction) {
                try { db.exec('ROLLBACK'); } catch (_) { /* NOP */ }
            }
            throw e;
        }
    }

    /**
     * @param {import('dictionary-database').ObjectStoreData<'terms'>[]} items
     * @param {number} start
     * @param {number} count
     * @returns {Promise<void>}
     */
    async _bulkAddTerms(items, start, count) {
        if (!this._enableTermEntryContentDedup) {
            await this._bulkAddTermsWithoutContentDedup(items, start, count);
            return;
        }
        if (!this._termContentZstdInitialized) {
            await initializeTermContentZstd();
            this._termContentZstdInitialized = true;
        }
        const db = this._requireDb();
        const useLocalTransaction = !this._bulkImportTransactionOpen;
        const tBulkStart = safePerformance.now();
        let lastProgressLog = tBulkStart;
        let computeContentMs = 0;
        let compressContentMs = 0;
        let appendContentMs = 0;
        let insertContentSqlMs = 0;
        let insertTermsSqlMs = 0;
        let insertTermRecordAppendMs = 0;
        let insertTermsVtabMs = 0;
        let commitMs = 0;
        let appendedContentBytes = 0;
        let resolvedFromCacheCount = 0;
        let minAssignedContentOffset = Number.POSITIVE_INFINITY;
        let maxAssignedContentEnd = -1;
        let maxObservedStoreLengthBeforeAppend = -1;
        let maxObservedStoreLengthAfterAppend = -1;
        /** @type {number[]} */
        const contentBatchDurationsMs = [];
        /** @type {number[]} */
        const termBatchDurationsMs = [];
        /** @type {number[]} */
        const termBatchRowsPerSecond = [];
        let failFastConsecutiveLowThroughputWindows = 0;
        const termBatchSize = this._getTermBulkAddBatchSizeForCount(count);
        const stagingBatchSize = Math.max(512, Math.min(this._termBulkAddStagingMaxRows, termBatchSize));
        const contentBatchSize = 8192;
        const shouldDedupWithinBatch = !this._skipIntraBatchContentDedup;
        let processedRowCount = 0;
        let insertedRowCount = 0;
        let totalPendingContentUniqueCount = 0;
        const compressionDictName = count > 0 ? resolveTermContentZstdDictName((/** @type {import('dictionary-database').DatabaseTermEntry} */ (items[start])).dictionary) : null;

        /** @type {import('dictionary-database').DatabaseTermEntry[]} */
        let stagedRows = [];
        /** @type {number[]} */
        let stagedPendingContentIndexes = [];
        /** @type {number[]} */
        let stagedContentOffsets = [];
        /** @type {number[]} */
        let stagedContentLengths = [];
        /** @type {(string|null)[]} */
        let stagedContentDictNames = [];
        /** @type {(string|null)[]} */
        let pendingContentHashes = [];
        /** @type {number[]} */
        let pendingContentHash1s = [];
        /** @type {number[]} */
        let pendingContentHash2s = [];
        /** @type {Uint8Array[]} */
        let pendingContentBytes = [];
        /** @type {Map<string, number>|null} */
        let pendingContentRowIndexByHash = shouldDedupWithinBatch ? new Map() : null;
        /** @type {Map<number, Map<number, number>>|null} */
        let pendingContentRowIndexByHashPair = shouldDedupWithinBatch ? new Map() : null;

        if (useLocalTransaction) {
            await this._beginImmediateTransaction(db);
        }
        try {
            const flushStagedRows = async () => {
                if (stagedRows.length === 0) {
                    stagedPendingContentIndexes = [];
                    stagedContentOffsets = [];
                    stagedContentLengths = [];
                    stagedContentDictNames = [];
                    pendingContentHashes = [];
                    pendingContentHash1s = [];
                    pendingContentHash2s = [];
                    pendingContentBytes = [];
                    if (pendingContentRowIndexByHash !== null) {
                        pendingContentRowIndexByHash.clear();
                    }
                    if (pendingContentRowIndexByHashPair !== null) {
                        pendingContentRowIndexByHashPair.clear();
                    }
                    return;
                }

                if (pendingContentBytes.length > 0) {
                    totalPendingContentUniqueCount += pendingContentBytes.length;
                    const tCompressStart = safePerformance.now();
                    const storageChunks = this._createTermContentStorageChunks(
                        pendingContentBytes,
                        compressionDictName,
                        stagedRows.map((row, index) => {
                            const pendingIndex = stagedPendingContentIndexes[index];
                            return pendingIndex >= 0 ? (row.termEntryContentDictName ?? null) : null;
                        }),
                    );
                    compressContentMs += safePerformance.now() - tCompressStart;
                    if (this._importDebugLogging) {
                        const debugStateBeforeAppend = this._termContentStore.getDebugState();
                        maxObservedStoreLengthBeforeAppend = Math.max(
                            maxObservedStoreLengthBeforeAppend,
                            this._asNumber(debugStateBeforeAppend?.totalLength, -1),
                        );
                    }
                    const tAppendStart = safePerformance.now();
                    const spans = await this._termContentStore.appendBatch(storageChunks.storedChunks);
                    for (const chunk of storageChunks.storedChunks) {
                        appendedContentBytes += chunk.byteLength;
                    }
                    appendContentMs += safePerformance.now() - tAppendStart;
                    if (this._importDebugLogging) {
                        const debugStateAfterAppend = this._termContentStore.getDebugState();
                        maxObservedStoreLengthAfterAppend = Math.max(
                            maxObservedStoreLengthAfterAppend,
                            this._asNumber(debugStateAfterAppend?.totalLength, -1),
                        );
                    }

                    for (let i = 0, ii = stagedRows.length; i < ii; ++i) {
                        const pendingIndex = stagedPendingContentIndexes[i];
                        if (pendingIndex < 0) { continue; }
                        const span = spans[storageChunks.entryToStoredChunkIndexes[pendingIndex]];
                        if (typeof span === 'undefined') {
                            throw new Error('Failed to resolve staged term entry content span for bulk term insert');
                        }
                        stagedPendingContentIndexes[i] = -1;
                        stagedContentOffsets[i] = span.offset;
                        stagedContentLengths[i] = span.length;
                        stagedContentDictNames[i] = storageChunks.contentDictNames[pendingIndex] ?? 'raw';
                        if (span.length > 0) {
                            if (span.offset < minAssignedContentOffset) {
                                minAssignedContentOffset = span.offset;
                            }
                            const spanEnd = span.offset + span.length;
                            if (spanEnd > maxAssignedContentEnd) {
                                maxAssignedContentEnd = spanEnd;
                            }
                        }
                    }

                    for (let i = 0, ii = pendingContentBytes.length; i < ii; i += contentBatchSize) {
                        const chunkCount = Math.min(contentBatchSize, ii - i);
                        const tContentSqlStart = safePerformance.now();
                        for (let j = i, jj = i + chunkCount; j < jj; ++j) {
                            const span = spans[storageChunks.entryToStoredChunkIndexes[j]];
                            const contentDictName = storageChunks.contentDictNames[j];
                            this._cacheTermEntryContentMeta(
                                pendingContentHashes[j],
                                span.offset,
                                span.length,
                                contentDictName,
                                0,
                                pendingContentHash1s[j],
                                pendingContentHash2s[j],
                            );
                        }
                        const contentBatchMs = safePerformance.now() - tContentSqlStart;
                        insertContentSqlMs += contentBatchMs;
                        contentBatchDurationsMs.push(contentBatchMs);
                    }
                }

                for (let i = 0, ii = stagedRows.length; i < ii; i += termBatchSize) {
                    const chunkCount = Math.min(termBatchSize, ii - i);
                    const tTermSqlStart = safePerformance.now();
                    const split = await this._insertResolvedImportTermEntries(stagedRows, stagedContentOffsets, stagedContentLengths, stagedContentDictNames, i, chunkCount);
                    const termBatchMs = safePerformance.now() - tTermSqlStart;
                    insertTermsSqlMs += termBatchMs;
                    insertTermRecordAppendMs += split.termRecordAppendMs;
                    insertTermsVtabMs += split.termsVtabInsertMs;
                    termBatchDurationsMs.push(termBatchMs);

                    const batchRowsPerSecond = termBatchMs > 0 ? ((chunkCount * 1000) / termBatchMs) : 0;
                    termBatchRowsPerSecond.push(batchRowsPerSecond);
                    insertedRowCount += chunkCount;
                    if (this._importDebugLogging && termBatchMs >= this._termBulkAddFailFastSlowBatchMs) {
                        throw new Error(`term batch stalled: rows=${chunkCount} elapsed=${termBatchMs.toFixed(1)}ms`);
                    }

                    if (this._importDebugLogging && termBatchRowsPerSecond.length >= this._termBulkAddFailFastWindowSize) {
                        const windowStart = termBatchRowsPerSecond.length - this._termBulkAddFailFastWindowSize;
                        const window = termBatchRowsPerSecond.slice(windowStart);
                        const windowAverageRowsPerSecond = window.reduce((sum, value) => sum + value, 0) / window.length;
                        if (insertedRowCount >= this._termBulkAddFailFastMinRowsBeforeCheck && windowAverageRowsPerSecond < this._termBulkAddFailFastMinRowsPerSecond) {
                            ++failFastConsecutiveLowThroughputWindows;
                            if (failFastConsecutiveLowThroughputWindows >= 3) {
                                throw new Error(
                                    `term batch throughput degraded: window_avg_rps=${windowAverageRowsPerSecond.toFixed(1)} ` +
                                    `threshold=${this._termBulkAddFailFastMinRowsPerSecond.toFixed(1)} rows=${insertedRowCount}/${count}`,
                                );
                            }
                        } else {
                            failFastConsecutiveLowThroughputWindows = 0;
                        }
                    }
                }

                stagedRows = [];
                stagedPendingContentIndexes = [];
                stagedContentOffsets = [];
                stagedContentLengths = [];
                stagedContentDictNames = [];
                pendingContentHashes = [];
                pendingContentHash1s = [];
                pendingContentHash2s = [];
                pendingContentBytes = [];
                pendingContentRowIndexByHash = shouldDedupWithinBatch ? new Map() : null;
                pendingContentRowIndexByHashPair = shouldDedupWithinBatch ? new Map() : null;
            };

            for (let i = start, ii = start + count; i < ii; ++i) {
                ++processedRowCount;
                const row = /** @type {import('dictionary-database').DatabaseTermEntry} */ (items[i]);
                const tComputeStart = safePerformance.now();
                const precomputedHash = (typeof row.termEntryContentHash === 'string' && row.termEntryContentHash.length > 0) ? row.termEntryContentHash : null;
                const precomputedHash1 = Number.isInteger(row.termEntryContentHash1) ? (/** @type {number} */ (row.termEntryContentHash1) >>> 0) : -1;
                const precomputedHash2 = Number.isInteger(row.termEntryContentHash2) ? (/** @type {number} */ (row.termEntryContentHash2) >>> 0) : -1;
                const hasPrecomputedHashPair = precomputedHash1 >= 0 && precomputedHash2 >= 0;
                const precomputedBytes = row.termEntryContentBytes instanceof Uint8Array ? row.termEntryContentBytes : this._getRawTermContentBytesIfAvailable(row);
                let contentHash = precomputedHash;
                let contentHash1 = precomputedHash1;
                let contentHash2 = precomputedHash2;
                let contentBytes = precomputedBytes;
                if ((contentHash === null && !hasPrecomputedHashPair) || contentBytes === null) {
                    const rules = row.rules;
                    const definitionTags = row.definitionTags ?? row.tags ?? '';
                    const termTags = row.termTags ?? '';
                    const contentJson = row.termEntryContentJson ?? this._serializeTermEntryContent(rules, definitionTags, termTags, row.glossary);
                    contentHash = contentHash ?? this._hashEntryContent(contentJson);
                    contentBytes = contentBytes ?? this._textEncoder.encode(contentJson);
                    if (contentHash1 < 0 || contentHash2 < 0) {
                        const hashPair = parseContentHashHexPair(contentHash);
                        if (hashPair !== null) {
                            [contentHash1, contentHash2] = hashPair;
                        }
                    }
                }
                computeContentMs += safePerformance.now() - tComputeStart;

                let existingMeta = (contentHash1 >= 0 && contentHash2 >= 0) ?
                    this._getTermEntryContentMetaByHashPair(contentHash1, contentHash2) :
                    void 0;
                if (typeof existingMeta === 'undefined' && contentHash !== null) {
                    existingMeta = this._termEntryContentMetaByHash.get(contentHash);
                }
                if (typeof existingMeta !== 'undefined') {
                    ++resolvedFromCacheCount;
                    stagedRows.push(row);
                    stagedPendingContentIndexes.push(-1);
                    stagedContentOffsets.push(existingMeta.offset);
                    stagedContentLengths.push(existingMeta.length);
                    stagedContentDictNames.push(existingMeta.dictName);
                    continue;
                }

                let pendingContentIndex = -1;
                if (pendingContentRowIndexByHashPair !== null && contentHash1 >= 0 && contentHash2 >= 0) {
                    const pendingContentRowIndexByHash2 = pendingContentRowIndexByHashPair.get(contentHash1);
                    if (typeof pendingContentRowIndexByHash2 !== 'undefined') {
                        const existingPendingContentIndex = pendingContentRowIndexByHash2.get(contentHash2);
                        if (typeof existingPendingContentIndex === 'number') {
                            pendingContentIndex = existingPendingContentIndex;
                        }
                    }
                }
                if (pendingContentIndex < 0 && pendingContentRowIndexByHash !== null && contentHash !== null) {
                    const existingPendingContentIndex = pendingContentRowIndexByHash.get(contentHash);
                    if (typeof existingPendingContentIndex === 'number') {
                        pendingContentIndex = existingPendingContentIndex;
                    }
                }
                if (pendingContentIndex < 0) {
                    const tCompressStart = safePerformance.now();
                    compressContentMs += safePerformance.now() - tCompressStart;
                    pendingContentIndex = pendingContentBytes.length;
                    if (pendingContentRowIndexByHash !== null && contentHash !== null) {
                        pendingContentRowIndexByHash.set(contentHash, pendingContentIndex);
                    }
                    if (pendingContentRowIndexByHashPair !== null && contentHash1 >= 0 && contentHash2 >= 0) {
                        let pendingContentRowIndexByHash2 = pendingContentRowIndexByHashPair.get(contentHash1);
                        if (typeof pendingContentRowIndexByHash2 === 'undefined') {
                            pendingContentRowIndexByHash2 = new Map();
                            pendingContentRowIndexByHashPair.set(contentHash1, pendingContentRowIndexByHash2);
                        }
                        pendingContentRowIndexByHash2.set(contentHash2, pendingContentIndex);
                    }
                    pendingContentHashes.push(contentHash);
                    pendingContentHash1s.push(contentHash1);
                    pendingContentHash2s.push(contentHash2);
                    pendingContentBytes.push(contentBytes);
                }

                stagedRows.push(row);
                stagedPendingContentIndexes.push(pendingContentIndex);
                stagedContentOffsets.push(-1);
                stagedContentLengths.push(-1);
                stagedContentDictNames.push(null);

                const tNow = safePerformance.now();
                if (this._importDebugLogging && (tNow - lastProgressLog) >= this._termBulkAddLogIntervalMs) {
                    lastProgressLog = tNow;
                    log.log(
                        `[manabitan-db-import] bulkAdd terms progress rows=${processedRowCount}/${count} ` +
                        `cached=${resolvedFromCacheCount} pendingUnique=${pendingContentBytes.length}`,
                    );
                }

                if (stagedRows.length >= stagingBatchSize) {
                    await flushStagedRows();
                }
            }
            await flushStagedRows();
            if (useLocalTransaction) {
                const tCommitStart = safePerformance.now();
                db.exec('COMMIT');
                commitMs = safePerformance.now() - tCommitStart;
            }
            if (this._importDebugLogging) {
                const totalMs = safePerformance.now() - tBulkStart;
                const rowsPerSecond = totalMs > 0 ? ((count * 1000) / totalMs) : 0;
                const bytesPerSecond = totalMs > 0 ? ((appendedContentBytes * 1000) / totalMs) : 0;
                const avgTermBatchMs = this._average(termBatchDurationsMs);
                const p95TermBatchMs = this._p95(termBatchDurationsMs);
                const avgContentBatchMs = this._average(contentBatchDurationsMs);
                const p95ContentBatchMs = this._p95(contentBatchDurationsMs);
                log.log(
                    `[manabitan-db-import] bulkAdd terms done rows=${count} total=${totalMs.toFixed(1)}ms ` +
                    `compute=${computeContentMs.toFixed(1)}ms compress=${compressContentMs.toFixed(1)}ms ` +
                    `append=${appendContentMs.toFixed(1)}ms contentSql=${insertContentSqlMs.toFixed(1)}ms ` +
                    `termsSql=${insertTermsSqlMs.toFixed(1)}ms termRecordAppend=${insertTermRecordAppendMs.toFixed(1)}ms ` +
                    `termsVtabInsert=${insertTermsVtabMs.toFixed(1)}ms commit=${commitMs.toFixed(1)}ms ` +
                    `intraBatchDedup=${String(shouldDedupWithinBatch)} ` +
                    `recordFastPath=${String(this._termRecordRowAppendFastPath)} ` +
                    `stagingBatchSize=${stagingBatchSize} ` +
                    `cached=${resolvedFromCacheCount} newUnique=${totalPendingContentUniqueCount} ` +
                    `assignedMinOffset=${Number.isFinite(minAssignedContentOffset) ? minAssignedContentOffset : -1} ` +
                    `assignedMaxEnd=${maxAssignedContentEnd} ` +
                    `storeLengthBeforeAppendMax=${maxObservedStoreLengthBeforeAppend} ` +
                    `storeLengthAfterAppendMax=${maxObservedStoreLengthAfterAppend} ` +
                    `rps=${rowsPerSecond.toFixed(1)} bps=${bytesPerSecond.toFixed(1)} ` +
                    `termBatchAvg=${avgTermBatchMs.toFixed(1)}ms termBatchP95=${p95TermBatchMs.toFixed(1)}ms ` +
                    `contentBatchAvg=${avgContentBatchMs.toFixed(1)}ms contentBatchP95=${p95ContentBatchMs.toFixed(1)}ms`,
                );
            }
        } catch (e) {
            if (useLocalTransaction) {
                try { db.exec('ROLLBACK'); } catch (_) { /* NOP */ }
            }
            throw e;
        }
    }

    /**
     * @param {import('@sqlite.org/sqlite-wasm').Bindable[][]} rows
     * @param {number} start
     * @param {number} count
     * @returns {Promise<{termRecordAppendMs: number, termsVtabInsertMs: number}>}
     */
    async _insertResolvedTermRows(rows, start, count) {
        const tRecordAppendStart = safePerformance.now();
        if (this._termRecordRowAppendFastPath) {
            await this._termRecordStore.appendBatchFromTermRows(rows, start, count);
        } else {
            /** @type {{dictionary: string, expression: string, reading: string, expressionReverse: string|null, readingReverse: string|null, entryContentOffset: number, entryContentLength: number, entryContentDictName: string|null, score: number, sequence: number|null}[]} */
            const records = [];
            for (let i = start, ii = start + count; i < ii; ++i) {
                const row = rows[i];
                records.push({
                    dictionary: this._asString(row[0]),
                    expression: this._asString(row[1]),
                    reading: this._asString(row[2]),
                    expressionReverse: this._asNullableString(row[3]) ?? null,
                    readingReverse: this._asNullableString(row[4]) ?? null,
                    entryContentOffset: this._asNumber(row[6], -1),
                    entryContentLength: this._asNumber(row[7], -1),
                    entryContentDictName: this._asNullableString(row[8]),
                    score: this._asNumber(row[12], 0),
                    sequence: this._asNullableNumber(row[14]) ?? null,
                });
            }
            await this._termRecordStore.appendBatch(records);
        }
        const termRecordAppendMs = safePerformance.now() - tRecordAppendStart;
        let termsVtabInsertMs = 0;
        const deferVirtualTableWrite = this._deferTermsVirtualTableSync || this._bulkImportDepth > 0;
        if (deferVirtualTableWrite) {
            this._termsVirtualTableDirty = true;
        } else {
            const tVtabStart = safePerformance.now();
            await this._insertTermRowsIntoVirtualTable(count);
            termsVtabInsertMs = safePerformance.now() - tVtabStart;
        }
        return {termRecordAppendMs, termsVtabInsertMs};
    }

    /**
     * @param {import('dictionary-database').DatabaseTermEntry[]} rows
     * @param {number[]} contentOffsets
     * @param {number[]} contentLengths
     * @param {(string|null)[]} contentDictNames
     * @param {number} start
     * @param {number} count
     * @returns {Promise<{termRecordAppendMs: number, termRecordEncodeMs: number, termRecordWriteMs: number, termsVtabInsertMs: number}>}
     */
    async _insertResolvedImportTermEntries(rows, contentOffsets, contentLengths, contentDictNames, start, count) {
        const tRecordAppendStart = safePerformance.now();
        let termRecordEncodeMs = 0;
        let termRecordWriteMs = 0;
        const termRecordPreinternedPlan = sliceTermRecordPreinternedPlan(getTermRecordPreinternedPlan(rows), start, count);
        if (this._termRecordRowAppendFastPath) {
            const metrics = await this._termRecordStore.appendBatchFromResolvedImportTermEntries(
                rows,
                start,
                count,
                contentOffsets,
                contentLengths,
                contentDictNames,
                termRecordPreinternedPlan,
            );
            termRecordEncodeMs = metrics.encodeMs;
            termRecordWriteMs = metrics.appendWriteMs;
        } else {
            /** @type {{dictionary: string, expression: string, reading: string, expressionBytes?: Uint8Array, readingBytes?: Uint8Array, expressionReverse: string|null, readingReverse: string|null, entryContentOffset: number, entryContentLength: number, entryContentDictName: string|null, score: number, sequence: number|null}[]} */
            const records = [];
            for (let i = start, ii = start + count; i < ii; ++i) {
                const row = rows[i];
                records.push({
                    dictionary: row.dictionary,
                    expression: row.expression,
                    reading: row.reading,
                    expressionBytes: row.expressionBytes,
                    readingBytes: row.readingBytes,
                    expressionReverse: row.expressionReverse ?? null,
                    readingReverse: row.readingReverse ?? null,
                    entryContentOffset: contentOffsets[i],
                    entryContentLength: contentLengths[i],
                    entryContentDictName: contentDictNames[i],
                    score: row.score,
                    sequence: typeof row.sequence === 'number' ? row.sequence : null,
                });
            }
            await this._termRecordStore.appendBatch(records, termRecordPreinternedPlan);
        }
        const termRecordAppendMs = safePerformance.now() - tRecordAppendStart;
        let termsVtabInsertMs = 0;
        const deferVirtualTableWrite = this._deferTermsVirtualTableSync || this._bulkImportDepth > 0;
        if (deferVirtualTableWrite) {
            this._termsVirtualTableDirty = true;
        } else {
            const tVtabStart = safePerformance.now();
            await this._insertTermRowsIntoVirtualTable(count);
            termsVtabInsertMs = safePerformance.now() - tVtabStart;
        }
        return {termRecordAppendMs, termRecordEncodeMs, termRecordWriteMs, termsVtabInsertMs};
    }

    /**
     * @param {number} count
     * @returns {Promise<void>}
     */
    async _insertTermRowsIntoVirtualTable(count) {
        this._termsVirtualTableDirty = count > 0;
    }

    /**
     * @param {{values: import('@sqlite.org/sqlite-wasm').Bindable[], contentKey: string|null}[]} rows
     * @throws {Error}
     */
    async _insertResolvedTermRowsWithContentKeys(rows) {
        for (const row of rows) {
            const {contentKey} = row;
            if (contentKey !== null) {
                const contentId = this._termEntryContentIdByKey.get(contentKey);
                if (typeof contentId !== 'number') {
                    throw new Error('Failed to resolve term entry content id for batched insert');
                }
                const meta = this._termEntryContentMetaByHash.get(contentKey);
                if (typeof meta === 'undefined') {
                    throw new Error('Failed to resolve term entry content metadata for batched insert');
                }
                row.values[5] = contentId;
                row.values[6] = meta.offset;
                row.values[7] = meta.length;
                row.values[8] = meta.dictName;
            }
        }
        await this._insertResolvedTermRows(rows.map((row) => row.values), 0, rows.length);
    }

    /** */
    _clearTermEntryContentMetaCaches() {
        this._termEntryContentMetaByHash.clear();
        this._termEntryContentMetaByHashPair.clear();
    }

    /**
     * @param {number} hash1
     * @param {number} hash2
     * @returns {{id: number, offset: number, length: number, dictName: string}|undefined}
     */
    _getTermEntryContentMetaByHashPair(hash1, hash2) {
        const byHash2 = this._termEntryContentMetaByHashPair.get(hash1 >>> 0);
        return typeof byHash2 !== 'undefined' ? byHash2.get(hash2 >>> 0) : void 0;
    }

    /**
     * @param {number} hash1
     * @param {number} hash2
     * @param {{id: number, offset: number, length: number, dictName: string}} meta
     */
    _setTermEntryContentMetaByHashPair(hash1, hash2, meta) {
        hash1 >>>= 0;
        hash2 >>>= 0;
        let byHash2 = this._termEntryContentMetaByHashPair.get(hash1);
        if (typeof byHash2 === 'undefined') {
            byHash2 = new Map();
            this._termEntryContentMetaByHashPair.set(hash1, byHash2);
        }
        byHash2.set(hash2, meta);
    }

    /**
     * @param {string|null} contentHash
     * @param {number} offset
     * @param {number} length
     * @param {string|null|undefined} dictName
     * @param {number} [id]
     * @param {number} [hash1]
     * @param {number} [hash2]
     * @returns {{id: number, offset: number, length: number, dictName: string}}
     */
    _cacheTermEntryContentMeta(contentHash, offset, length, dictName, id = 0, hash1 = -1, hash2 = -1) {
        const meta = {id, offset, length, dictName: dictName ?? 'raw'};
        if (typeof contentHash === 'string' && contentHash.length > 0) {
            this._termEntryContentMetaByHash.set(contentHash, meta);
            if (hash1 < 0 || hash2 < 0) {
                const parsedHashPair = parseContentHashHexPair(contentHash);
                if (parsedHashPair !== null) {
                    [hash1, hash2] = parsedHashPair;
                }
            }
        }
        if (hash1 >= 0 && hash2 >= 0) {
            this._setTermEntryContentMetaByHashPair(hash1, hash2, meta);
        }
        return meta;
    }

    /**
     * @param {{contentKey: string, contentHash: string, contentBytes: Uint8Array, contentDictName: string|null}[]} rows
     * @throws {Error}
     */
    async _insertTermEntryContentBatch(rows) {
        if (rows.length === 0) { return; }
        const spans = await this._termContentStore.appendBatch(rows.map((row) => row.contentBytes));
        this._insertTermEntryContentBatchWithSpans(rows, spans, 0, rows.length);
    }

    /**
     * @param {{contentHash: string, contentDictName: string|null}[]} rows
     * @param {{offset: number, length: number}[]} spans
     * @param {number} start
     * @param {number} count
     * @throws {Error}
     */
    _insertTermEntryContentBatchWithSpans(rows, spans, start, count) {
        if (count <= 0) { return; }
        /** @type {string[]} */
        const valueRows = [];
        /** @type {import('@sqlite.org/sqlite-wasm').Bindable[]} */
        const bind = [];
        for (let i = start, ii = start + count; i < ii; ++i) {
            const row = rows[i];
            const span = spans[i];
            valueRows.push('(?, NULL, ?, \'\', \'\', \'\', \'[]\', ?, ?)');
            bind.push(row.contentHash, row.contentDictName, span.offset, span.length);
        }
        const sql = `
            INSERT INTO termEntryContent(contentHash, contentZstd, contentDictName, rules, definitionTags, termTags, glossaryJson, contentOffset, contentLength)
            VALUES ${valueRows.join(',')}
        `;
        const stmt = this._getCachedStatement(sql);
        stmt.reset(true);
        stmt.bind(bind);
        stmt.step();

        const db = this._requireDb();
        const lastInsertRowId = this._asNumber(db.selectValue('SELECT last_insert_rowid()'), -1);
        if (lastInsertRowId <= 0) {
            throw new Error('Failed to insert batched term entry content');
        }
        const firstId = lastInsertRowId - count + 1;
        for (let i = start, ii = start + count; i < ii; ++i) {
            const id = firstId + (i - start);
            this._termEntryContentIdByHash.set(rows[i].contentHash, id);
            this._termEntryContentIdByKey.set(rows[i].contentHash, id);
            this._cacheTermEntryContentMeta(rows[i].contentHash, spans[i].offset, spans[i].length, rows[i].contentDictName, id);
        }
    }

    /**
     * @param {import('dictionary-database').ObjectStoreData<'terms'>[]} items
     * @param {number} start
     * @param {number} count
     * @returns {Promise<void>}
     */
    async _bulkAddTermsWithoutContentDedup(items, start, count) {
        const useLocalTransaction = !this._bulkImportTransactionOpen;
        const batchSize = this._getTermBulkAddBatchSizeForCount(count);
        let contentAppendMs = 0;
        let termRecordBuildMs = 0;
        let termRecordEncodeMs = 0;
        let termRecordWriteMs = 0;
        let termsVtabInsertMs = 0;
        let termRecordInternMs = 0;
        let termRecordPackLengthsMs = 0;
        let termRecordHeapCopyMs = 0;
        let termRecordWasmEncodeMs = 0;
        let minAssignedContentOffset = Number.POSITIVE_INFINITY;
        let maxAssignedContentEnd = -1;
        let maxObservedStoreLengthBeforeAppend = -1;
        let maxObservedStoreLengthAfterAppend = -1;

        if (useLocalTransaction) {
            await this._beginImmediateTransaction(this._requireDb());
        }
        try {
            for (let i = start, ii = start + count; i < ii; i += batchSize) {
                const chunkCount = Math.min(batchSize, ii - i);
                /** @type {Uint8Array[]} */
                const contentChunks = new Array(chunkCount);
                /** @type {number[]} */
                const contentOffsets = new Array(chunkCount);
                /** @type {number[]} */
                const contentLengths = new Array(chunkCount);
                for (let j = 0; j < chunkCount; ++j) {
                    const row = /** @type {import('dictionary-database').DatabaseTermEntry} */ (items[i + j]);
                    const precomputedContentBytes = row.termEntryContentBytes instanceof Uint8Array ? row.termEntryContentBytes : this._getRawTermContentBytesIfAvailable(row);
                    if (precomputedContentBytes instanceof Uint8Array) {
                        contentChunks[j] = precomputedContentBytes;
                        continue;
                    }
                    const rules = row.rules ?? '';
                    const definitionTags = row.definitionTags ?? row.tags ?? '';
                    const termTags = row.termTags ?? '';
                    const contentJson = row.termEntryContentJson ?? this._serializeTermEntryContent(rules, definitionTags, termTags, row.glossary);
                    contentChunks[j] = this._textEncoder.encode(contentJson);
                }
                let chunksToAppend = contentChunks;
                const tContentAppendStart = safePerformance.now();
                if (this._importDebugLogging) {
                    const debugStateBeforeAppend = this._termContentStore.getDebugState();
                    maxObservedStoreLengthBeforeAppend = Math.max(
                        maxObservedStoreLengthBeforeAppend,
                        this._asNumber(debugStateBeforeAppend?.totalLength, -1),
                    );
                }
                if (this._termContentStorageMode === TERM_CONTENT_STORAGE_MODE_RAW_BYTES) {
                    const {packedChunks, sourceChunkIndices, sourceChunkLocalOffsets} = packContentChunksIntoSlabs(
                        contentChunks,
                        this._rawTermContentPackTargetBytes,
                    );
                    chunksToAppend = packedChunks;
                    /** @type {number[]} */
                    const packedOffsets = new Array(packedChunks.length);
                    /** @type {number[]} */
                    const packedLengths = new Array(packedChunks.length);
                    await this._termContentStore.appendBatchToArrays(packedChunks, packedOffsets, packedLengths);
                    for (let j = 0; j < chunkCount; ++j) {
                        const packedIndex = sourceChunkIndices[j];
                        contentOffsets[j] = packedOffsets[packedIndex] + sourceChunkLocalOffsets[j];
                        contentLengths[j] = contentChunks[j].byteLength;
                    }
                } else {
                    await this._termContentStore.appendBatchToArrays(contentChunks, contentOffsets, contentLengths);
                }
                if (this._importDebugLogging) {
                    const debugStateAfterAppend = this._termContentStore.getDebugState();
                    maxObservedStoreLengthAfterAppend = Math.max(
                        maxObservedStoreLengthAfterAppend,
                        this._asNumber(debugStateAfterAppend?.totalLength, -1),
                    );
                }
                for (let j = 0; j < chunkCount; ++j) {
                    const offset = contentOffsets[j];
                    const length = contentLengths[j];
                    if (offset >= 0 && length > 0) {
                        if (offset < minAssignedContentOffset) {
                            minAssignedContentOffset = offset;
                        }
                        const end = offset + length;
                        if (end > maxAssignedContentEnd) {
                            maxAssignedContentEnd = end;
                        }
                    }
                }
                contentAppendMs += safePerformance.now() - tContentAppendStart;
                const explicitContentDictName = chunkCount > 0 ? (items[i].termEntryContentDictName ?? null) : null;
                let contentDictName = 'raw';
                if (
                    this._termContentStorageMode === TERM_CONTENT_STORAGE_MODE_RAW_BYTES &&
                    typeof explicitContentDictName === 'string' &&
                    explicitContentDictName.length > 0
                ) {
                    contentDictName = explicitContentDictName;
                } else if (
                    this._termContentStorageMode === TERM_CONTENT_STORAGE_MODE_RAW_BYTES &&
                    chunksToAppend.every((contentBytes) => isRawTermContentBinary(contentBytes))
                ) {
                    contentDictName = RAW_TERM_CONTENT_DICT_NAME;
                }
                const metrics = await this._termRecordStore.appendBatchFromImportTermEntriesResolvedContent(items, i, chunkCount, contentOffsets, contentLengths, contentDictName);
                termRecordBuildMs += metrics.buildRecordsMs;
                termRecordEncodeMs += metrics.encodeMs;
                termRecordWriteMs += metrics.appendWriteMs;
                termRecordInternMs += metrics.internMs ?? 0;
                termRecordPackLengthsMs += metrics.packLengthsMs ?? 0;
                termRecordHeapCopyMs += metrics.heapCopyMs ?? 0;
                termRecordWasmEncodeMs += metrics.wasmEncodeMs ?? 0;
                const deferVirtualTableWrite = this._deferTermsVirtualTableSync || this._bulkImportDepth > 0;
                if (deferVirtualTableWrite) {
                    this._termsVirtualTableDirty = true;
                } else {
                    const tTermsVtabInsertStart = safePerformance.now();
                    await this._insertTermRowsIntoVirtualTable(chunkCount);
                    termsVtabInsertMs += safePerformance.now() - tTermsVtabInsertStart;
                }
            }
            if (useLocalTransaction) {
                this._requireDb().exec('COMMIT');
            }
            this._lastBulkAddTermsMetrics = {
                contentAppendMs,
                termRecordBuildMs,
                termRecordEncodeMs,
                termRecordWriteMs,
                termsVtabInsertMs,
                termRecordInternMs,
                termRecordPackLengthsMs,
                termRecordHeapCopyMs,
                termRecordWasmEncodeMs,
            };
            if (this._importDebugLogging) {
                log.log(
                    `[manabitan-db-import] bulkAdd terms no-dedup contentAppend=${contentAppendMs.toFixed(1)}ms ` +
                    `termRecordBuild=${termRecordBuildMs.toFixed(1)}ms ` +
                    `termRecordEncode=${termRecordEncodeMs.toFixed(1)}ms ` +
                    `termRecordWrite=${termRecordWriteMs.toFixed(1)}ms ` +
                    `termsVtabInsert=${termsVtabInsertMs.toFixed(1)}ms ` +
                    `assignedMinOffset=${Number.isFinite(minAssignedContentOffset) ? minAssignedContentOffset : -1} ` +
                    `assignedMaxEnd=${maxAssignedContentEnd} ` +
                    `storeLengthBeforeAppendMax=${maxObservedStoreLengthBeforeAppend} ` +
                    `storeLengthAfterAppendMax=${maxObservedStoreLengthAfterAppend}`,
                );
            }
        } catch (e) {
            if (useLocalTransaction) {
                try { this._requireDb().exec('ROLLBACK'); } catch (_) { /* NOP */ }
            }
            throw e;
        }
    }

    /**
     * @param {{dictionary: string, rowCount: number, dictionaryTotalRows?: number, expressionBytesList: Uint8Array[], readingBytesList: Uint8Array[], readingEqualsExpressionList: boolean[], scoreList: number[], sequenceList: (number|undefined)[], contentBytesList: Uint8Array[], contentDictNameList: ((string|null)[]|null), uniformContentDictName?: string|null, termRecordPreinternedPlan?: import('./term-record-wasm-encoder.js').PreinternedTermRecordPlan|null}} chunk
     * @returns {Promise<void>}
     */
    async _bulkAddArtifactTermsChunkWithoutContentDedup(chunk) {
        const useLocalTransaction = !this._bulkImportTransactionOpen;
        const count = chunk.rowCount;
        if (count <= 0) {
            this._lastBulkAddTermsMetrics = {
                contentAppendMs: 0,
                termRecordBuildMs: 0,
                termRecordEncodeMs: 0,
                termRecordWriteMs: 0,
                termsVtabInsertMs: 0,
                termRecordInternMs: 0,
                termRecordPackLengthsMs: 0,
                termRecordHeapCopyMs: 0,
                termRecordWasmEncodeMs: 0,
            };
            return;
        }
        let contentAppendMs = 0;
        let termRecordBuildMs = 0;
        let termRecordEncodeMs = 0;
        let termRecordWriteMs = 0;
        let termsVtabInsertMs = 0;
        let termRecordInternMs = 0;
        let termRecordPackLengthsMs = 0;
        let termRecordHeapCopyMs = 0;
        let termRecordWasmEncodeMs = 0;

        if (useLocalTransaction) {
            await this._beginImmediateTransaction(this._requireDb());
        }
        try {
            /** @type {number[]} */
            const contentOffsets = new Array(count);
            /** @type {number[]} */
            const contentLengths = new Array(count);
            /** @type {string | null} */
                let uniformContentDictName = null;
                /** @type {(string|null)[] | null} */
                let contentDictNames = null;
                const contentChunks = chunk.contentBytesList;
            const tContentAppendStart = safePerformance.now();
            if (this._termContentStorageMode === TERM_CONTENT_STORAGE_MODE_RAW_BYTES) {
                const firstContentLength = contentChunks[0]?.byteLength ?? 0;
                let useFixedSizePacking = (
                    firstContentLength > 0 &&
                    (chunk.dictionaryTotalRows ?? 0) >= LARGE_ARTIFACT_FIXED_PACK_MIN_TOTAL_ROWS
                );
                for (let i = 1; i < count && useFixedSizePacking; ++i) {
                    if (contentChunks[i].byteLength !== firstContentLength) {
                        useFixedSizePacking = false;
                    }
                }
                if (useFixedSizePacking) {
                    const {packedChunks, packedRowStarts, packedRowCounts} = packFixedSizeContentChunksIntoSlabs(
                        contentChunks,
                        this._rawTermContentPackTargetBytes,
                        firstContentLength,
                    );
                    /** @type {number[]} */
                    const packedOffsets = new Array(packedChunks.length);
                    /** @type {number[]} */
                    const packedLengths = new Array(packedChunks.length);
                    await this._termContentStore.appendBatchToArrays(packedChunks, packedOffsets, packedLengths);
                    for (let packedIndex = 0; packedIndex < packedChunks.length; ++packedIndex) {
                        const baseOffset = packedOffsets[packedIndex];
                        const rowStart = packedRowStarts[packedIndex];
                        const rowCount = packedRowCounts[packedIndex];
                        for (let localIndex = 0; localIndex < rowCount; ++localIndex) {
                            const rowIndex = rowStart + localIndex;
                            contentOffsets[rowIndex] = baseOffset + (localIndex * firstContentLength);
                            contentLengths[rowIndex] = firstContentLength;
                        }
                    }
                } else {
                    const {packedChunks, sourceChunkIndices, sourceChunkLocalOffsets} = packContentChunksIntoSlabs(
                        contentChunks,
                        this._rawTermContentPackTargetBytes,
                    );
                    /** @type {number[]} */
                    const packedOffsets = new Array(packedChunks.length);
                    /** @type {number[]} */
                    const packedLengths = new Array(packedChunks.length);
                    await this._termContentStore.appendBatchToArrays(packedChunks, packedOffsets, packedLengths);
                    for (let i = 0; i < count; ++i) {
                        const packedIndex = sourceChunkIndices[i];
                        contentOffsets[i] = packedOffsets[packedIndex] + sourceChunkLocalOffsets[i];
                        contentLengths[i] = contentChunks[i].byteLength;
                    }
                }
            } else {
                await this._termContentStore.appendBatchToArrays(contentChunks, contentOffsets, contentLengths);
            }
            if (typeof chunk.uniformContentDictName !== 'undefined') {
                uniformContentDictName = chunk.uniformContentDictName ?? 'raw';
            } else {
                for (let i = 0; i < count; ++i) {
                    const explicitContentDictName = Array.isArray(chunk.contentDictNameList) ? chunk.contentDictNameList[i] : null;
                    /** @type {string|null} */
                    let resolvedContentDictName;
                    if (
                        this._termContentStorageMode === TERM_CONTENT_STORAGE_MODE_RAW_BYTES &&
                        typeof explicitContentDictName === 'string' &&
                        explicitContentDictName.length > 0
                    ) {
                        resolvedContentDictName = explicitContentDictName;
                    } else if (
                        this._termContentStorageMode === TERM_CONTENT_STORAGE_MODE_RAW_BYTES &&
                        isRawTermContentBinary(contentChunks[i])
                    ) {
                        resolvedContentDictName = RAW_TERM_CONTENT_DICT_NAME;
                    } else {
                        resolvedContentDictName = 'raw';
                    }
                    if (i === 0) {
                        uniformContentDictName = resolvedContentDictName;
                        continue;
                    }
                    if (contentDictNames === null && resolvedContentDictName !== uniformContentDictName) {
                        contentDictNames = new Array(count);
                        contentDictNames.fill(uniformContentDictName, 0, i);
                    }
                    if (contentDictNames !== null) {
                        contentDictNames[i] = resolvedContentDictName;
                    }
                }
            }
            contentAppendMs += safePerformance.now() - tContentAppendStart;
            const metrics = await this._termRecordStore.appendBatchFromArtifactChunkResolvedContent(
                chunk,
                contentOffsets,
                contentLengths,
                contentDictNames ?? uniformContentDictName ?? 'raw',
            );
            termRecordBuildMs += metrics.buildRecordsMs;
            termRecordEncodeMs += metrics.encodeMs;
            termRecordWriteMs += metrics.appendWriteMs;
            termRecordInternMs += metrics.internMs ?? 0;
            termRecordPackLengthsMs += metrics.packLengthsMs ?? 0;
            termRecordHeapCopyMs += metrics.heapCopyMs ?? 0;
            termRecordWasmEncodeMs += metrics.wasmEncodeMs ?? 0;
            const deferVirtualTableWrite = this._deferTermsVirtualTableSync || this._bulkImportDepth > 0;
            if (deferVirtualTableWrite) {
                this._termsVirtualTableDirty = true;
            } else {
                const tTermsVtabInsertStart = safePerformance.now();
                await this._insertTermRowsIntoVirtualTable(count);
                termsVtabInsertMs += safePerformance.now() - tTermsVtabInsertStart;
            }
            if (useLocalTransaction) {
                this._requireDb().exec('COMMIT');
            }
            this._lastBulkAddTermsMetrics = {
                contentAppendMs,
                termRecordBuildMs,
                termRecordEncodeMs,
                termRecordWriteMs,
                termsVtabInsertMs,
                termRecordInternMs,
                termRecordPackLengthsMs,
                termRecordHeapCopyMs,
                termRecordWasmEncodeMs,
            };
        } catch (e) {
            if (useLocalTransaction) {
                try { this._requireDb().exec('ROLLBACK'); } catch (_) { /* NOP */ }
            }
            throw e;
        }
    }

    /**
     * @param {{dictionary: string, rowCount: number, dictionaryTotalRows?: number, expressionBytesList: Uint8Array[], readingBytesList: Uint8Array[], readingEqualsExpressionList: boolean[], scoreList: number[], sequenceList: (number|undefined)[], contentBytesList: Uint8Array[], contentHash1List: number[], contentHash2List: number[], contentDictNameList: ((string|null)[]|null), uniformContentDictName?: string|null, termRecordPreinternedPlan?: import('./term-record-wasm-encoder.js').PreinternedTermRecordPlan|null}} chunk
     * @returns {Promise<void>}
     */
    async _bulkAddArtifactTermsChunkWithContentDedup(chunk) {
        const useLocalTransaction = !this._bulkImportTransactionOpen;
        const count = chunk.rowCount;
        if (count <= 0) {
            this._lastBulkAddTermsMetrics = {
                contentAppendMs: 0,
                termRecordBuildMs: 0,
                termRecordEncodeMs: 0,
                termRecordWriteMs: 0,
                termsVtabInsertMs: 0,
                termRecordInternMs: 0,
                termRecordPackLengthsMs: 0,
                termRecordHeapCopyMs: 0,
                termRecordWasmEncodeMs: 0,
            };
            return;
        }
        if (chunk.contentHash1List.length < count || chunk.contentHash2List.length < count) {
            throw new Error('Artifact chunk content hash arrays are smaller than row count');
        }
        let contentAppendMs = 0;
        let termRecordBuildMs = 0;
        let termRecordEncodeMs = 0;
        let termRecordWriteMs = 0;
        let termsVtabInsertMs = 0;
        let termRecordInternMs = 0;
        let termRecordPackLengthsMs = 0;
        let termRecordHeapCopyMs = 0;
        let termRecordWasmEncodeMs = 0;

        if (useLocalTransaction) {
            await this._beginImmediateTransaction(this._requireDb());
        }
        try {
            const explicitContentDictNames = Array.isArray(chunk.contentDictNameList) ? chunk.contentDictNameList : null;
            const uniformContentDictName = typeof chunk.uniformContentDictName !== 'undefined' ? (chunk.uniformContentDictName ?? null) : null;
            const contentOffsets = new Int32Array(count);
            const contentLengths = new Int32Array(count);
            /** @type {string|((string|null)[])} */
            let resolvedContentDictNames = explicitContentDictNames !== null ? new Array(count) : (uniformContentDictName ?? 'raw');
            /** @type {Map<number, Map<number, number>>} */
            const pendingContentIndexByHashPair = new Map();
            /** @type {Uint8Array[]} */
            const pendingContentBytes = [];
            /** @type {number[]} */
            const pendingContentHash1s = [];
            /** @type {number[]} */
            const pendingContentHash2s = [];
            /** @type {(string|null)[]} */
            const pendingContentDictNames = [];
            const pendingRowToUniqueIndex = new Int32Array(count);
            pendingRowToUniqueIndex.fill(-1);
            const ensureResolvedContentDictNamesArray = (fillUntil) => {
                if (Array.isArray(resolvedContentDictNames)) {
                    return resolvedContentDictNames;
                }
                const uniformDictName = resolvedContentDictNames;
                const values = new Array(count);
                if (fillUntil > 0) {
                    values.fill(uniformDictName, 0, fillUntil);
                }
                resolvedContentDictNames = values;
                return values;
            };
            const tContentAppendStart = safePerformance.now();
            for (let i = 0; i < count; ++i) {
                const hash1 = chunk.contentHash1List[i] >>> 0;
                const hash2 = chunk.contentHash2List[i] >>> 0;
                const existingMeta = this._getTermEntryContentMetaByHashPair(hash1, hash2);
                if (typeof existingMeta !== 'undefined') {
                    contentOffsets[i] = existingMeta.offset;
                    contentLengths[i] = existingMeta.length;
                    if (Array.isArray(resolvedContentDictNames)) {
                        resolvedContentDictNames[i] = existingMeta.dictName;
                    } else if (existingMeta.dictName !== resolvedContentDictNames) {
                        ensureResolvedContentDictNamesArray(i)[i] = existingMeta.dictName;
                    }
                    continue;
                }
                let byHash2 = pendingContentIndexByHashPair.get(hash1);
                if (typeof byHash2 === 'undefined') {
                    byHash2 = new Map();
                    pendingContentIndexByHashPair.set(hash1, byHash2);
                }
                let pendingIndex = byHash2.get(hash2);
                if (typeof pendingIndex !== 'number') {
                    pendingIndex = pendingContentBytes.length;
                    byHash2.set(hash2, pendingIndex);
                    pendingContentBytes.push(chunk.contentBytesList[i]);
                    pendingContentHash1s.push(hash1);
                    pendingContentHash2s.push(hash2);
                    pendingContentDictNames.push(
                        explicitContentDictNames !== null ?
                            (explicitContentDictNames[i] ?? null) :
                            uniformContentDictName
                    );
                }
                pendingRowToUniqueIndex[i] = pendingIndex;
            }
            if (pendingContentBytes.length > 0) {
                const compressionDictName = resolveTermContentZstdDictName(chunk.dictionary);
                const storageChunks = this._createTermContentStorageChunks(
                    pendingContentBytes,
                    compressionDictName,
                    pendingContentDictNames,
                );
                /** @type {number[]} */
                const storedOffsets = [];
                /** @type {number[]} */
                const storedLengths = [];
                await this._termContentStore.appendBatchToArrays(
                    storageChunks.storedChunks,
                    storedOffsets,
                    storedLengths,
                );
                for (let i = 0; i < count; ++i) {
                    const pendingIndex = pendingRowToUniqueIndex[i];
                    if (pendingIndex < 0) { continue; }
                    const storedChunkIndex = storageChunks.entryToStoredChunkIndexes[pendingIndex];
                    const storedOffset = storedOffsets[storedChunkIndex];
                    const storedLength = storedLengths[storedChunkIndex];
                    contentOffsets[i] = storedOffset;
                    contentLengths[i] = storedLength;
                    const resolvedContentDictName = storageChunks.contentDictNames[pendingIndex] ?? 'raw';
                    if (Array.isArray(resolvedContentDictNames)) {
                        resolvedContentDictNames[i] = resolvedContentDictName;
                    } else if (resolvedContentDictName !== resolvedContentDictNames) {
                        ensureResolvedContentDictNamesArray(i)[i] = resolvedContentDictName;
                    }
                }
                for (let i = 0; i < pendingContentBytes.length; ++i) {
                    const storedChunkIndex = storageChunks.entryToStoredChunkIndexes[i];
                    this._cacheTermEntryContentMeta(
                        null,
                        storedOffsets[storedChunkIndex],
                        storedLengths[storedChunkIndex],
                        storageChunks.contentDictNames[i],
                        0,
                        pendingContentHash1s[i],
                        pendingContentHash2s[i],
                    );
                }
            }
            contentAppendMs += safePerformance.now() - tContentAppendStart;
            const metrics = await this._termRecordStore.appendBatchFromArtifactChunkResolvedContent(
                chunk,
                contentOffsets,
                contentLengths,
                resolvedContentDictNames,
            );
            termRecordBuildMs += metrics.buildRecordsMs;
            termRecordEncodeMs += metrics.encodeMs;
            termRecordWriteMs += metrics.appendWriteMs;
            termRecordInternMs += metrics.internMs ?? 0;
            termRecordPackLengthsMs += metrics.packLengthsMs ?? 0;
            termRecordHeapCopyMs += metrics.heapCopyMs ?? 0;
            termRecordWasmEncodeMs += metrics.wasmEncodeMs ?? 0;
            const deferVirtualTableWrite = this._deferTermsVirtualTableSync || this._bulkImportDepth > 0;
            if (deferVirtualTableWrite) {
                this._termsVirtualTableDirty = true;
            } else {
                const tTermsVtabInsertStart = safePerformance.now();
                await this._insertTermRowsIntoVirtualTable(count);
                termsVtabInsertMs += safePerformance.now() - tTermsVtabInsertStart;
            }
            if (useLocalTransaction) {
                this._requireDb().exec('COMMIT');
            }
            this._lastBulkAddTermsMetrics = {
                contentAppendMs,
                termRecordBuildMs,
                termRecordEncodeMs,
                termRecordWriteMs,
                termsVtabInsertMs,
                termRecordInternMs,
                termRecordPackLengthsMs,
                termRecordHeapCopyMs,
                termRecordWasmEncodeMs,
            };
        } catch (e) {
            if (useLocalTransaction) {
                try { this._requireDb().exec('ROLLBACK'); } catch (_) { /* NOP */ }
            }
            throw e;
        }
    }

    /**
     * @param {import('@sqlite.org/sqlite-wasm').PreparedStatement} insertContentStmt
     * @param {string} contentHash
     * @param {Uint8Array} contentZstd
     * @param {string|null} contentDictName
     * @param {string} contentKey
     * @returns {Promise<number>}
     * @throws {Error}
     */
    async _resolveOrCreateTermEntryContentId(insertContentStmt, contentHash, contentZstd, contentDictName, contentKey) {
        const cachedId = this._termEntryContentIdByKey.get(contentKey);
        if (typeof cachedId === 'number') {
            return cachedId;
        }
        const cachedHashId = this._termEntryContentIdByHash.get(contentHash);
        if (typeof cachedHashId === 'number') {
            this._termEntryContentIdByKey.set(contentKey, cachedHashId);
            if (!this._termEntryContentMetaByHash.has(contentHash)) {
                const stmt = this._getCachedStatement('SELECT contentOffset, contentLength, contentDictName FROM termEntryContent WHERE id = $id LIMIT 1');
                stmt.reset(true);
                stmt.bind({$id: cachedHashId});
                if (stmt.step()) {
                    const row = /** @type {import('core').SafeAny} */ (stmt.get({}));
                    const offset = this._asNumber(row.contentOffset, -1);
                    const length = this._asNumber(row.contentLength, -1);
                    const dictName = this._asNullableString(row.contentDictName) ?? 'raw';
                    if (offset >= 0 && length > 0) {
                        this._cacheTermEntryContentMeta(contentHash, offset, length, dictName, cachedHashId);
                    }
                }
            }
            if (this._termEntryContentMetaByHash.has(contentHash)) {
                return cachedHashId;
            }
        }

        insertContentStmt.reset(true);
        const [span] = await this._termContentStore.appendBatch([contentZstd]);
        insertContentStmt.bind({
            $contentHash: contentHash,
            $contentDictName: contentDictName,
            $contentOffset: span.offset,
            $contentLength: span.length,
        });
        insertContentStmt.step();

        const db = this._requireDb();
        const id = this._asNumber(db.selectValue('SELECT last_insert_rowid()'), -1);
        if (id <= 0) {
            throw new Error('Failed to insert term entry content');
        }
        this._termEntryContentIdByHash.set(contentHash, id);
        this._termEntryContentIdByKey.set(contentKey, id);
        this._cacheTermEntryContentMeta(contentHash, span.offset, span.length, contentDictName, id);
        return id;
    }

    /** */
    _loadTermEntryContentHashIndex() {
        if (this._termEntryContentIdByHash.size > 0) { return; }
        const stmt = this._getCachedStatement('SELECT id, contentHash, contentOffset, contentLength, contentDictName FROM termEntryContent');
        stmt.reset(true);
        while (stmt.step()) {
            const row = /** @type {import('core').SafeAny[]} */ (stmt.get([]));
            const id = this._asNumber(row[0], -1);
            if (id <= 0) { continue; }
            const contentHash = this._asString(row[1]);
            if (contentHash.length === 0) { continue; }
            const offset = this._asNumber(row[2], -1);
            const length = this._asNumber(row[3], -1);
            const dictName = this._asNullableString(row[4]) ?? 'raw';
            if (offset >= 0 && length > 0) {
                if (!this._termEntryContentIdByHash.has(contentHash)) {
                    this._termEntryContentIdByHash.set(contentHash, id);
                }
                this._cacheTermEntryContentMeta(contentHash, offset, length, dictName, id);
            }
        }
    }

    /** */
    _pruneOrphanTermEntryContent() {
        const db = this._requireDb();
        db.exec(`
            DELETE FROM termEntryContent
            WHERE id NOT IN (
                SELECT DISTINCT entryContentId
                FROM terms
                WHERE entryContentId IS NOT NULL
            )
        `);
    }

    // Parent-Worker API

    /**
     * @param {MessagePort} port
     */
    async connectToDatabaseWorker(port) {
        if (this._worker !== null) {
            this._worker.postMessage({action: 'connectToDatabaseWorker'}, [port]);
            return;
        }

        port.onmessage = (/** @type {MessageEvent<import('dictionary-database').ApiMessageAny>} */ event) => {
            const {action, params} = event.data;
            return invokeApiMapHandler(this._apiMap, action, params, [port], () => {});
        };
        port.onmessageerror = (event) => {
            const error = new ExtensionError('DictionaryDatabase: Error receiving message from main thread');
            error.data = event;
            log.error(error);
        };
    }

    /** @type {import('dictionary-database').ApiHandler<'drawMedia'>} */
    _onDrawMedia(params, port) {
        void this.drawMedia(params.requests, port);
    }

    // Private

    /**
     * @returns {Promise<void>}
     */
    async _openConnection() {
        this._sqlite3 = await getSqlite3();
        try {
            this._db = await openOpfsDatabase('DictionaryDatabase._openConnection');
        } catch (error) {
            const diagnostics = getLastOpenStorageDiagnostics();
            const message = (error instanceof Error) ? error.message : String(error);
            throw new Error(`Dictionary database open failed: ${message}. diagnostics=${JSON.stringify(diagnostics)}`);
        }
        this._usesFallbackStorage = didLastOpenUseFallbackStorage();
        this._openStorageDiagnostics = getLastOpenStorageDiagnostics();
        await this._termContentStore.prepare();
        await this._termRecordStore.prepare();
        this._clearTermsVtabCursorState();
        this._termsVtabModuleRegistered = false;

        this._applyRuntimePragmas();

        await this._initializeSchema();
        await this._runSchemaMigrations();
    }

    /** */
    async _initializeSchema() {
        const db = this._requireDb();
        db.exec(`
            CREATE TABLE IF NOT EXISTS dictionaries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                version INTEGER NOT NULL,
                summaryJson TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS termEntryContent (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                contentHash TEXT NOT NULL,
                contentZstd BLOB,
                contentOffset INTEGER,
                contentLength INTEGER,
                contentDictName TEXT,
                rules TEXT NOT NULL,
                definitionTags TEXT NOT NULL,
                termTags TEXT NOT NULL,
                glossaryJson TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS termMeta (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                dictionary TEXT NOT NULL,
                expression TEXT NOT NULL,
                mode TEXT NOT NULL,
                dataJson TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS kanji (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                dictionary TEXT NOT NULL,
                character TEXT NOT NULL,
                onyomi TEXT,
                kunyomi TEXT,
                tags TEXT,
                meaningsJson TEXT NOT NULL,
                statsJson TEXT
            );

            CREATE TABLE IF NOT EXISTS kanjiMeta (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                dictionary TEXT NOT NULL,
                character TEXT NOT NULL,
                mode TEXT NOT NULL,
                dataJson TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS tagMeta (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                dictionary TEXT NOT NULL,
                name TEXT NOT NULL,
                category TEXT,
                ord INTEGER,
                notes TEXT,
                score INTEGER
            );

            CREATE TABLE IF NOT EXISTS media (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                dictionary TEXT NOT NULL,
                path TEXT NOT NULL,
                mediaType TEXT NOT NULL,
                width INTEGER NOT NULL,
                height INTEGER NOT NULL,
                content BLOB NOT NULL,
                contentOffset INTEGER NOT NULL DEFAULT 0,
                contentLength INTEGER NOT NULL DEFAULT 0,
                contentCompressionMethod INTEGER NOT NULL DEFAULT 0,
                contentUncompressedLength INTEGER NOT NULL DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS sharedGlossaryArtifacts (
                dictionary TEXT PRIMARY KEY,
                contentOffset INTEGER NOT NULL,
                contentLength INTEGER NOT NULL,
                contentDictName TEXT NOT NULL,
                uncompressedLength INTEGER NOT NULL
            );
        `);
        await this._ensureTermsVirtualTable();
        await this._migrateTermsContentSchema();
        await this._migrateMediaSchema();
        if (!this._enableSqliteSecondaryIndexes) {
            for (const dropIndexSql of this._createDropIndexesSql()) {
                db.exec(dropIndexSql);
            }
        }
        for (const createIndexSql of this._createIndexesSql()) {
            db.exec(createIndexSql);
        }
    }

    /** */
    async _runSchemaMigrations() {
        const db = this._requireDb();
        const installedSchemaVersion = Math.max(0, this._asNumber(db.selectValue('PRAGMA user_version'), 0));
        if (installedSchemaVersion > CURRENT_DICTIONARY_SCHEMA_VERSION) {
            reportDiagnostics('dictionary-schema-migration-skipped', {
                reason: 'newer-installed-version',
                installedSchemaVersion,
                currentSchemaVersion: CURRENT_DICTIONARY_SCHEMA_VERSION,
            });
            return;
        }
        let currentSchemaVersion = installedSchemaVersion;
        let migrationCount = 0;
        while (currentSchemaVersion < CURRENT_DICTIONARY_SCHEMA_VERSION) {
            const nextVersion = currentSchemaVersion + 1;
            const migrationStart = safePerformance.now();
            const migrationSummary = await this._runSchemaMigrationToVersion(nextVersion);
            db.exec(`PRAGMA user_version = ${nextVersion}`);
            ++migrationCount;
            reportDiagnostics('dictionary-schema-migration-applied', {
                fromVersion: currentSchemaVersion,
                toVersion: nextVersion,
                elapsedMs: Math.max(0, safePerformance.now() - migrationStart),
                summary: migrationSummary,
            });
            currentSchemaVersion = nextVersion;
        }
        reportDiagnostics('dictionary-schema-migration-summary', {
            installedSchemaVersion,
            currentSchemaVersion,
            migrationCount,
        });
    }

    /**
     * @param {number} version
     * @returns {Promise<Record<string, number|string|boolean|null>>}
     */
    async _runSchemaMigrationToVersion(version) {
        switch (version) {
            case 1:
                return await this._wipeDictionaryDataForSchemaMigration('wipe-unversioned-dictionary-data');
            case 2:
                return await this._migrateSchemaVersion2();
            case 3:
                return await this._wipeDictionaryDataForSchemaMigration('reset-dictionary-data-for-raw-v3');
            case 4:
                return await this._wipeDictionaryDataForSchemaMigration('reset-dictionary-data-for-raw-v4');
            case 5:
                return await this._wipeDictionaryDataForSchemaMigration('reset-dictionary-data-for-opfs-sahpool');
            default:
                throw new Error(`Unhandled dictionary schema migration target version: ${version}`);
        }
    }

    /**
     * Migration v1: reset all imported dictionary data when legacy installs had no schema version.
     * @param {string} migration
     * @returns {Promise<Record<string, number|string|boolean|null>>}
     */
    async _wipeDictionaryDataForSchemaMigration(migration) {
        const db = this._requireDb();
        const dictionariesBefore = this._asNumber(db.selectValue('SELECT COUNT(*) FROM dictionaries'), 0);
        const termMetaBefore = this._asNumber(db.selectValue('SELECT COUNT(*) FROM termMeta'), 0);
        const kanjiBefore = this._asNumber(db.selectValue('SELECT COUNT(*) FROM kanji'), 0);
        const kanjiMetaBefore = this._asNumber(db.selectValue('SELECT COUNT(*) FROM kanjiMeta'), 0);
        const tagMetaBefore = this._asNumber(db.selectValue('SELECT COUNT(*) FROM tagMeta'), 0);
        const mediaBefore = this._asNumber(db.selectValue('SELECT COUNT(*) FROM media'), 0);
        const termContentBefore = this._asNumber(db.selectValue('SELECT COUNT(*) FROM termEntryContent'), 0);
        const sharedGlossaryArtifactsBefore = this._asNumber(db.selectValue('SELECT COUNT(*) FROM sharedGlossaryArtifacts'), 0);
        const termRecordsBefore = this._termRecordStore.size;

        await this._termContentStore.reset();
        await this._termRecordStore.reset();
        await this._beginImmediateTransaction(db);
        try {
            db.exec('DELETE FROM media');
            db.exec('DELETE FROM tagMeta');
            db.exec('DELETE FROM kanjiMeta');
            db.exec('DELETE FROM kanji');
            db.exec('DELETE FROM termMeta');
            db.exec('DELETE FROM termEntryContent');
            db.exec('DELETE FROM sharedGlossaryArtifacts');
            db.exec('DELETE FROM dictionaries');
            db.exec('COMMIT');
        } catch (e) {
            try { db.exec('ROLLBACK'); } catch (_) { /* NOP */ }
            throw e;
        }

        this._termEntryContentCache.clear();
        this._termEntryContentIdByHash.clear();
        this._clearTermEntryContentMetaCaches();
        this._termExactPresenceCache.clear();
        this._termPrefixNegativeCache.clear();
        this._directTermIndexByDictionary.clear();
        this._termEntryContentIdByKey.clear();
        this._sharedGlossaryArtifactMetaByDictionary.clear();
        this._sharedGlossaryArtifactInflatedByDictionary.clear();
        this._termsVirtualTableDirty = false;
        this._deferTermsVirtualTableSync = false;

        return {
            migration,
            dictionariesBefore,
            termRecordsBefore,
            termContentBefore,
            termMetaBefore,
            kanjiBefore,
            kanjiMetaBefore,
            tagMetaBefore,
            mediaBefore,
            sharedGlossaryArtifactsBefore,
        };
    }

    /**
     * Migration v2: reserved scaffold for future schema changes.
     * @returns {Promise<Record<string, number|string|boolean|null>>}
     */
    async _migrateSchemaVersion2() {
        await Promise.resolve();
        return {
            migration: 'schema-v2-noop',
        };
    }

    /**
     * @returns {string[]}
     */
    _createIndexesSql() {
        if (!this._enableSqliteSecondaryIndexes) {
            return [];
        }
        return [
            'CREATE INDEX IF NOT EXISTS idx_dictionaries_title ON dictionaries(title)',
            'CREATE INDEX IF NOT EXISTS idx_dictionaries_version ON dictionaries(version)',
            'CREATE INDEX IF NOT EXISTS idx_term_entry_content_hash ON termEntryContent(contentHash)',
            'CREATE INDEX IF NOT EXISTS idx_term_meta_expression_dictionary ON termMeta(expression, dictionary)',
            'CREATE INDEX IF NOT EXISTS idx_kanji_character_dictionary ON kanji(character, dictionary)',
            'CREATE INDEX IF NOT EXISTS idx_kanji_meta_character_dictionary ON kanjiMeta(character, dictionary)',
            'CREATE INDEX IF NOT EXISTS idx_tag_meta_dictionary_name ON tagMeta(dictionary, name)',
            'CREATE INDEX IF NOT EXISTS idx_media_dictionary_path ON media(dictionary, path)',
        ];
    }

    /**
     * @returns {string[]}
     */
    _createDropIndexesSql() {
        return [
            'DROP INDEX IF EXISTS idx_dictionaries_title',
            'DROP INDEX IF EXISTS idx_dictionaries_version',
            'DROP INDEX IF EXISTS idx_term_entry_content_hash',
            'DROP INDEX IF EXISTS idx_term_meta_expression_dictionary',
            'DROP INDEX IF EXISTS idx_kanji_character_dictionary',
            'DROP INDEX IF EXISTS idx_kanji_meta_character_dictionary',
            'DROP INDEX IF EXISTS idx_tag_meta_dictionary_name',
            'DROP INDEX IF EXISTS idx_media_dictionary_path',
            // Legacy index names from pre-optimization schema revisions.
            'DROP INDEX IF EXISTS idx_terms_expression',
            'DROP INDEX IF EXISTS idx_terms_reading',
            'DROP INDEX IF EXISTS idx_terms_sequence',
            'DROP INDEX IF EXISTS idx_terms_expression_reverse',
            'DROP INDEX IF EXISTS idx_terms_reading_reverse',
            'DROP INDEX IF EXISTS idx_term_meta_dictionary',
            'DROP INDEX IF EXISTS idx_term_meta_expression',
            'DROP INDEX IF EXISTS idx_kanji_dictionary',
            'DROP INDEX IF EXISTS idx_kanji_character',
            'DROP INDEX IF EXISTS idx_kanji_meta_dictionary',
            'DROP INDEX IF EXISTS idx_kanji_meta_character',
            'DROP INDEX IF EXISTS idx_tag_meta_dictionary',
            'DROP INDEX IF EXISTS idx_tag_meta_name',
            'DROP INDEX IF EXISTS idx_media_dictionary',
            'DROP INDEX IF EXISTS idx_media_path',
        ];
    }

    /**
     * Ensures terms are represented by a SQLite virtual table while record payload metadata remains external.
     */
    async _ensureTermsVirtualTable() {
        const db = this._requireDb();
        this._registerTermsVirtualTableModule();
        const termsEntry = db.selectObject('SELECT type, sql FROM sqlite_master WHERE name = \'terms\'');
        const termsType = typeof termsEntry === 'undefined' ? '' : this._asString(termsEntry.type);
        const termsSql = typeof termsEntry === 'undefined' ? '' : this._asString(termsEntry.sql).toUpperCase();
        const isVirtualTerms = termsSql.startsWith('CREATE VIRTUAL TABLE');
        if (termsType === 'table' && !isVirtualTerms) {
            await this._migrateLegacyTermsTableToExternalStore();
            db.exec('DROP TABLE terms');
        } else if (isVirtualTerms && !termsSql.includes('MANABITAN_TERMS')) {
            db.exec('DROP TABLE terms');
        }
        db.exec(`
            CREATE VIRTUAL TABLE IF NOT EXISTS terms USING manabitan_terms(
                dictionary,
                expression,
                reading,
                expressionReverse,
                readingReverse,
                entryContentId,
                entryContentOffset,
                entryContentLength,
                entryContentDictName,
                definitionTags,
                termTags,
                rules,
                score,
                glossaryJson,
                sequence
            )
        `);
        this._termsVirtualTableDirty = false;
    }

    /**
     * Ensures the SQLite vtable projection matches the external term record store.
     * @returns {Promise<void>}
     */
    async _syncTermsVirtualTableFromRecordStore() {
        this._termsVirtualTableDirty = false;
    }

    /**
     * @param {string} dictionaryName
     * @returns {Promise<void>}
     */
    async _appendTermRecordsFromTermsTableByDictionary(dictionaryName) {
        const db = this._requireDb();
        const termsTableInfo = db.selectObjects('PRAGMA table_info(terms)');
        const termsColumns = new Set(termsTableInfo.map((row) => this._asString(row.name)));
        const hasEntryContentOffset = termsColumns.has('entryContentOffset');
        const hasEntryContentLength = termsColumns.has('entryContentLength');
        const hasEntryContentDictName = termsColumns.has('entryContentDictName');
        const hasEntryContentId = termsColumns.has('entryContentId');
        const entryContentOffsetExpr = hasEntryContentOffset ? 't.entryContentOffset' : (hasEntryContentId ? 'c.contentOffset' : '-1');
        const entryContentLengthExpr = hasEntryContentLength ? 't.entryContentLength' : (hasEntryContentId ? 'c.contentLength' : '-1');
        const entryContentDictNameExpr = hasEntryContentDictName ? 't.entryContentDictName' : (hasEntryContentId ? 'c.contentDictName' : '\'raw\'');
        const stmt = this._getCachedStatement(`
            SELECT
                t.dictionary AS dictionary,
                t.expression AS expression,
                t.reading AS reading,
                t.expressionReverse AS expressionReverse,
                t.readingReverse AS readingReverse,
                ${entryContentOffsetExpr} AS entryContentOffset,
                ${entryContentLengthExpr} AS entryContentLength,
                COALESCE(${entryContentDictNameExpr}, 'raw') AS entryContentDictName,
                t.score AS score,
                t.sequence AS sequence
            FROM terms t
            ${hasEntryContentId ? 'LEFT JOIN termEntryContent c ON c.id = t.entryContentId' : ''}
            WHERE t.dictionary = $dictionary
        `);
        stmt.reset(true);
        stmt.bind({$dictionary: dictionaryName});
        /** @type {{dictionary: string, expression: string, reading: string, expressionReverse: string|null, readingReverse: string|null, entryContentOffset: number, entryContentLength: number, entryContentDictName: string|null, score: number, sequence: number|null}[]} */
        let batch = [];
        while (stmt.step()) {
            const row = /** @type {import('core').SafeAny} */ (stmt.get({}));
            batch.push({
                dictionary: this._asString(row.dictionary),
                expression: this._asString(row.expression),
                reading: this._asString(row.reading),
                expressionReverse: this._asNullableString(row.expressionReverse) ?? null,
                readingReverse: this._asNullableString(row.readingReverse) ?? null,
                entryContentOffset: this._asNumber(row.entryContentOffset, -1),
                entryContentLength: this._asNumber(row.entryContentLength, -1),
                entryContentDictName: this._asNullableString(row.entryContentDictName),
                score: this._asNumber(row.score, 0),
                sequence: this._asNullableNumber(row.sequence) ?? null,
            });
            if (batch.length >= 4096) {
                await this._termRecordStore.appendBatch(batch);
                batch = [];
            }
        }
        if (batch.length > 0) {
            await this._termRecordStore.appendBatch(batch);
        }
    }

    /** */
    async _migrateLegacyTermsTableToExternalStore() {
        if (!this._termRecordStore.isEmpty()) {
            return;
        }
        const db = this._requireDb();
        const termsTableInfo = db.selectObjects('PRAGMA table_info(terms)');
        const termsColumns = new Set(termsTableInfo.map((row) => this._asString(row.name)));
        const hasEntryContentOffset = termsColumns.has('entryContentOffset');
        const hasEntryContentLength = termsColumns.has('entryContentLength');
        const hasEntryContentDictName = termsColumns.has('entryContentDictName');
        const hasEntryContentId = termsColumns.has('entryContentId');
        const entryContentOffsetExpr = hasEntryContentOffset ? 't.entryContentOffset' : (hasEntryContentId ? 'c.contentOffset' : '-1');
        const entryContentLengthExpr = hasEntryContentLength ? 't.entryContentLength' : (hasEntryContentId ? 'c.contentLength' : '-1');
        const entryContentDictNameExpr = hasEntryContentDictName ? 't.entryContentDictName' : (hasEntryContentId ? 'c.contentDictName' : '\'raw\'');
        const stmt = this._getCachedStatement(`
            SELECT
                t.dictionary AS dictionary,
                t.expression AS expression,
                t.reading AS reading,
                t.expressionReverse AS expressionReverse,
                t.readingReverse AS readingReverse,
                ${entryContentOffsetExpr} AS entryContentOffset,
                ${entryContentLengthExpr} AS entryContentLength,
                COALESCE(${entryContentDictNameExpr}, 'raw') AS entryContentDictName,
                t.score AS score,
                t.sequence AS sequence
            FROM terms t
            ${hasEntryContentId ? 'LEFT JOIN termEntryContent c ON c.id = t.entryContentId' : ''}
        `);
        stmt.reset(true);
        /** @type {{dictionary: string, expression: string, reading: string, expressionReverse: string|null, readingReverse: string|null, entryContentOffset: number, entryContentLength: number, entryContentDictName: string|null, score: number, sequence: number|null}[]} */
        let batch = [];
        while (stmt.step()) {
            const row = /** @type {import('core').SafeAny} */ (stmt.get({}));
            batch.push({
                dictionary: this._asString(row.dictionary),
                expression: this._asString(row.expression),
                reading: this._asString(row.reading),
                expressionReverse: this._asNullableString(row.expressionReverse) ?? null,
                readingReverse: this._asNullableString(row.readingReverse) ?? null,
                entryContentOffset: this._asNumber(row.entryContentOffset, -1),
                entryContentLength: this._asNumber(row.entryContentLength, -1),
                entryContentDictName: this._asNullableString(row.entryContentDictName),
                score: this._asNumber(row.score, 0),
                sequence: this._asNullableNumber(row.sequence) ?? null,
            });
            if (batch.length >= 4096) {
                await this._termRecordStore.appendBatch(batch);
                batch = [];
            }
        }
        if (batch.length > 0) {
            await this._termRecordStore.appendBatch(batch);
        }
    }

    /** */
    async _migrateTermsContentSchema() {
        const db = this._requireDb();
        const contentTableInfo = db.selectObjects('PRAGMA table_info(termEntryContent)');
        const hasContentZstd = contentTableInfo.some((row) => this._asString(row.name) === 'contentZstd');
        const hasContentOffset = contentTableInfo.some((row) => this._asString(row.name) === 'contentOffset');
        const hasContentLength = contentTableInfo.some((row) => this._asString(row.name) === 'contentLength');
        const hasContentDictName = contentTableInfo.some((row) => this._asString(row.name) === 'contentDictName');
        if (!hasContentZstd) {
            db.exec('ALTER TABLE termEntryContent ADD COLUMN contentZstd BLOB');
        }
        if (!hasContentDictName) {
            db.exec('ALTER TABLE termEntryContent ADD COLUMN contentDictName TEXT');
        }
        if (!hasContentOffset) {
            db.exec('ALTER TABLE termEntryContent ADD COLUMN contentOffset INTEGER');
        }
        if (!hasContentLength) {
            db.exec('ALTER TABLE termEntryContent ADD COLUMN contentLength INTEGER');
        }

        const termsEntry = db.selectObject('SELECT type, sql FROM sqlite_master WHERE name = \'terms\'');
        const termsSql = typeof termsEntry === 'undefined' ? '' : this._asString(termsEntry.sql).toUpperCase();
        const isVirtualTerms = termsSql.startsWith('CREATE VIRTUAL TABLE');
        if (typeof termsEntry === 'undefined' || this._asString(termsEntry.type) !== 'table' || isVirtualTerms) {
            return;
        }

        const tableInfo = db.selectObjects('PRAGMA table_info(terms)');
        const hasEntryContentId = tableInfo.some((row) => this._asString(row.name) === 'entryContentId');
        const hasEntryContentOffset = tableInfo.some((row) => this._asString(row.name) === 'entryContentOffset');
        const hasEntryContentLength = tableInfo.some((row) => this._asString(row.name) === 'entryContentLength');
        const hasEntryContentDictName = tableInfo.some((row) => this._asString(row.name) === 'entryContentDictName');
        if (!hasEntryContentId) { db.exec('ALTER TABLE terms ADD COLUMN entryContentId INTEGER'); }
        if (!hasEntryContentOffset) { db.exec('ALTER TABLE terms ADD COLUMN entryContentOffset INTEGER'); }
        if (!hasEntryContentLength) { db.exec('ALTER TABLE terms ADD COLUMN entryContentLength INTEGER'); }
        if (!hasEntryContentDictName) { db.exec('ALTER TABLE terms ADD COLUMN entryContentDictName TEXT'); }

        db.exec(`
            INSERT INTO termEntryContent(contentHash, rules, definitionTags, termTags, glossaryJson)
            SELECT
                '',
                COALESCE(t.rules, ''),
                COALESCE(t.definitionTags, ''),
                COALESCE(t.termTags, ''),
                COALESCE(t.glossaryJson, '[]')
            FROM terms t
            WHERE t.entryContentId IS NULL
        `);

        const contentRows = db.selectObjects('SELECT id, rules, definitionTags, termTags, glossaryJson FROM termEntryContent WHERE contentHash = \'\'');
        for (const row of contentRows) {
            const id = this._asNumber(row.id, -1);
            if (id <= 0) { continue; }
            const rules = this._asString(row.rules);
            const definitionTags = this._asString(row.definitionTags);
            const termTags = this._asString(row.termTags);
            const glossaryJson = this._asString(row.glossaryJson);
            const contentHash = this._hashEntryContent(this._serializeTermEntryContent(
                rules,
                definitionTags,
                termTags,
                this._safeParseJson(glossaryJson, []),
            ));
            db.exec({
                sql: 'UPDATE termEntryContent SET contentHash = $contentHash WHERE id = $id',
                bind: {$contentHash: contentHash, $id: id},
            });
        }

        db.exec(`
            UPDATE terms
            SET entryContentId = (
                SELECT c.id
                FROM termEntryContent c
                WHERE
                    c.rules = COALESCE(terms.rules, '') AND
                    c.definitionTags = COALESCE(terms.definitionTags, '') AND
                    c.termTags = COALESCE(terms.termTags, '') AND
                    c.glossaryJson = COALESCE(terms.glossaryJson, '[]')
                LIMIT 1
            )
            WHERE entryContentId IS NULL
        `);

        db.exec(`
            UPDATE terms
            SET
                entryContentOffset = (
                    SELECT c.contentOffset
                    FROM termEntryContent c
                    WHERE c.id = terms.entryContentId
                    LIMIT 1
                ),
                entryContentLength = (
                    SELECT c.contentLength
                    FROM termEntryContent c
                    WHERE c.id = terms.entryContentId
                    LIMIT 1
                ),
                entryContentDictName = (
                    SELECT c.contentDictName
                    FROM termEntryContent c
                    WHERE c.id = terms.entryContentId
                    LIMIT 1
                )
            WHERE
                entryContentId IS NOT NULL AND
                (entryContentOffset IS NULL OR entryContentOffset < 0 OR entryContentLength IS NULL OR entryContentLength <= 0)
        `);

        const externalizeRows = db.selectObjects(`
            SELECT id, contentZstd
            FROM termEntryContent
            WHERE
                contentZstd IS NOT NULL AND
                length(contentZstd) > 0 AND
                (contentOffset IS NULL OR contentOffset < 0 OR contentLength IS NULL OR contentLength <= 0)
        `);
        if (externalizeRows.length > 0) {
            const chunks = [];
            for (const row of externalizeRows) {
                const contentZstd = this._toUint8Array(row.contentZstd);
                if (contentZstd === null || contentZstd.byteLength <= 0) { continue; }
                chunks.push(contentZstd);
            }
            if (chunks.length > 0) {
                const spans = await this._termContentStore.appendBatch(chunks);
                let spanIndex = 0;
                for (const row of externalizeRows) {
                    const id = this._asNumber(row.id, -1);
                    const contentZstd = this._toUint8Array(row.contentZstd);
                    if (id <= 0 || contentZstd === null || contentZstd.byteLength <= 0) { continue; }
                    const span = spans[spanIndex++];
                    db.exec({
                        sql: `
                            UPDATE termEntryContent
                            SET contentOffset = $contentOffset, contentLength = $contentLength, contentZstd = NULL
                            WHERE id = $id
                        `,
                        bind: {$contentOffset: span.offset, $contentLength: span.length, $id: id},
                    });
                }
            }
        }
    }

    /** */
    async _migrateMediaSchema() {
        const db = this._requireDb();
        const mediaTableInfo = db.selectObjects('PRAGMA table_info(media)');
        const hasContentOffset = mediaTableInfo.some((row) => this._asString(row.name) === 'contentOffset');
        const hasContentLength = mediaTableInfo.some((row) => this._asString(row.name) === 'contentLength');
        const hasContentCompressionMethod = mediaTableInfo.some((row) => this._asString(row.name) === 'contentCompressionMethod');
        const hasContentUncompressedLength = mediaTableInfo.some((row) => this._asString(row.name) === 'contentUncompressedLength');
        if (!hasContentOffset) {
            db.exec('ALTER TABLE media ADD COLUMN contentOffset INTEGER NOT NULL DEFAULT 0');
        }
        if (!hasContentLength) {
            db.exec('ALTER TABLE media ADD COLUMN contentLength INTEGER NOT NULL DEFAULT 0');
        }
        if (!hasContentCompressionMethod) {
            db.exec('ALTER TABLE media ADD COLUMN contentCompressionMethod INTEGER NOT NULL DEFAULT 0');
        }
        if (!hasContentUncompressedLength) {
            db.exec('ALTER TABLE media ADD COLUMN contentUncompressedLength INTEGER NOT NULL DEFAULT 0');
        }
    }

    /**
     * Best effort cleanup for old IndexedDB storage from pre-sqlite builds.
     */
    async _deleteLegacyIndexedDb() {
        if (typeof indexedDB === 'undefined') {
            return;
        }
        await new Promise((resolve) => {
            try {
                const request = indexedDB.deleteDatabase('dict');
                request.onsuccess = () => resolve(void 0);
                request.onerror = () => resolve(void 0);
                request.onblocked = () => resolve(void 0);
            } catch (_) {
                resolve(void 0);
            }
        });
    }

    /**
     * @returns {import('@sqlite.org/sqlite-wasm').Database}
     * @throws {Error}
     */
    _requireDb() {
        if (this._db === null) {
            throw new Error(this._isOpening ? 'Database not ready' : 'Database not open');
        }
        return this._db;
    }

    /**
     * @returns {import('@sqlite.org/sqlite-wasm').Sqlite3Static}
     * @throws {Error}
     */
    _requireSqlite3() {
        if (this._sqlite3 === null) {
            throw new Error('sqlite3 module is not initialized');
        }
        return this._sqlite3;
    }

    /**
     * @template {import('dictionary-database').ObjectStoreName} T
     * @param {T} objectStoreName
     * @returns {InsertStatement}
     * @throws {Error}
     */
    _getInsertStatement(objectStoreName) {
        switch (objectStoreName) {
            case 'dictionaries':
                return {
                    sql: 'INSERT INTO dictionaries(title, version, summaryJson) VALUES($title, $version, $summaryJson)',
                    bind: (item) => {
                        const summary = /** @type {import('dictionary-importer').Summary} */ (item);
                        return {
                            $title: summary.title,
                            $version: summary.version,
                            $summaryJson: JSON.stringify(summary),
                        };
                    },
                };
            case 'terms':
                throw new Error('terms uses external virtual storage; use bulkAdd');
            case 'termMeta':
                return {
                    sql: 'INSERT INTO termMeta(dictionary, expression, mode, dataJson) VALUES($dictionary, $expression, $mode, $dataJson)',
                    bind: (item) => {
                        const row = /** @type {import('dictionary-database').DatabaseTermMeta} */ (item);
                        return {
                            $dictionary: row.dictionary,
                            $expression: row.expression,
                            $mode: row.mode,
                            $dataJson: JSON.stringify(row.data),
                        };
                    },
                };
            case 'kanji':
                return {
                    sql: 'INSERT INTO kanji(dictionary, character, onyomi, kunyomi, tags, meaningsJson, statsJson) VALUES($dictionary, $character, $onyomi, $kunyomi, $tags, $meaningsJson, $statsJson)',
                    bind: (item) => {
                        const row = /** @type {import('dictionary-database').DatabaseKanjiEntry} */ (item);
                        return {
                            $dictionary: row.dictionary,
                            $character: row.character,
                            $onyomi: row.onyomi,
                            $kunyomi: row.kunyomi,
                            $tags: row.tags,
                            $meaningsJson: JSON.stringify(row.meanings),
                            $statsJson: row.stats ? JSON.stringify(row.stats) : null,
                        };
                    },
                };
            case 'kanjiMeta':
                return {
                    sql: 'INSERT INTO kanjiMeta(dictionary, character, mode, dataJson) VALUES($dictionary, $character, $mode, $dataJson)',
                    bind: (item) => {
                        const row = /** @type {import('dictionary-database').DatabaseKanjiMeta} */ (item);
                        return {
                            $dictionary: row.dictionary,
                            $character: row.character,
                            $mode: row.mode,
                            $dataJson: JSON.stringify(row.data),
                        };
                    },
                };
            case 'tagMeta':
                return {
                    sql: 'INSERT INTO tagMeta(dictionary, name, category, ord, notes, score) VALUES($dictionary, $name, $category, $ord, $notes, $score)',
                    bind: (item) => {
                        const row = /** @type {import('dictionary-database').Tag} */ (item);
                        return {
                            $dictionary: row.dictionary,
                            $name: row.name,
                            $category: row.category,
                            $ord: row.order,
                            $notes: row.notes,
                            $score: row.score,
                        };
                    },
                };
            case 'media':
                return {
                    sql: 'INSERT INTO media(dictionary, path, mediaType, width, height, content, contentOffset, contentLength, contentCompressionMethod, contentUncompressedLength) VALUES($dictionary, $path, $mediaType, $width, $height, $content, $contentOffset, $contentLength, $contentCompressionMethod, $contentUncompressedLength)',
                    /**
                     * @param {import('dictionary-database').MediaDataArrayBufferContent} row
                     * @returns {{$dictionary: string, $path: string, $mediaType: string, $width: number, $height: number, $content: ArrayBuffer, $contentOffset: number, $contentLength: number, $contentCompressionMethod: number, $contentUncompressedLength: number}}
                     */
                    bind: (row) => {
                        const source = /** @type {{dictionary: string, path: string, mediaType: string, width: number, height: number, content: ArrayBuffer, contentOffset?: unknown, contentLength?: unknown, contentCompressionMethod?: unknown, contentUncompressedLength?: unknown}} */ (row);
                        const contentOffset = typeof source.contentOffset === 'number' ? source.contentOffset : 0;
                        const contentLength = typeof source.contentLength === 'number' ? source.contentLength : 0;
                        const contentCompressionMethod = typeof source.contentCompressionMethod === 'number' ? source.contentCompressionMethod : ZIP_COMPRESSION_METHOD_STORE;
                        const contentUncompressedLength = typeof source.contentUncompressedLength === 'number' ? source.contentUncompressedLength : contentLength;
                        return {
                            $dictionary: source.dictionary,
                            $path: source.path,
                            $mediaType: source.mediaType,
                            $width: source.width,
                            $height: source.height,
                            $content: source.content,
                            $contentOffset: contentOffset,
                            $contentLength: contentLength,
                            $contentCompressionMethod: contentCompressionMethod,
                            $contentUncompressedLength: contentUncompressedLength,
                        };
                    },
                };
            default:
                throw new Error(`Unsupported object store: ${objectStoreName}`);
        }
    }

    /** */
    _clearTermsVtabCursorState() {
        this._termsVtabCursorState.clear();
    }

    /**
     * @throws {Error}
     */
    _registerTermsVirtualTableModule() {
        if (this._termsVtabModuleRegistered) {
            return;
        }
        const sqlite3 = this._requireSqlite3();
        const db = this._requireDb();
        const dbPointer = db.pointer;
        if (typeof dbPointer !== 'number') {
            throw new Error('sqlite database pointer is unavailable');
        }
        if (typeof sqlite3.vtab === 'undefined') {
            throw new Error('sqlite vtab API is unavailable');
        }
        const {capi, vtab} = sqlite3;
        const termsVtabIdxDictionaryEq = 1 << 0;
        const termsVtabIdxExpressionEq = 1 << 1;
        const termsVtabIdxReadingEq = 1 << 2;
        const termsVtabIdxSequenceEq = 1 << 3;
        const termsVtabIdxRowIdEq = 1 << 4;
        const termRecordStore = this._termRecordStore;
        const termsVtabCursorState = this._termsVtabCursorState;
        const asNumber = this._asNumber.bind(this);
        const asString = this._asString.bind(this);
        const eqOp = typeof capi.SQLITE_INDEX_CONSTRAINT_EQ === 'number' ? capi.SQLITE_INDEX_CONSTRAINT_EQ : 2;
        const toPtr = (value) => this._asNumber(value, 0);
        const schema = `
            CREATE TABLE x(
                dictionary TEXT,
                expression TEXT,
                reading TEXT,
                expressionReverse TEXT,
                readingReverse TEXT,
                entryContentId INTEGER,
                entryContentOffset INTEGER,
                entryContentLength INTEGER,
                entryContentDictName TEXT,
                definitionTags TEXT,
                termTags TEXT,
                rules TEXT,
                score INTEGER,
                glossaryJson TEXT,
                sequence INTEGER
            )
        `;

        // sqlite wasm vtab helpers expose dynamic struct wrappers that are not strongly typed in our jsdoc surface.
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const module = vtab.setupModule({
            catchExceptions: true,
            methods: {
                xCreate(pDb, _pAux, _argc, _argv, ppVtab) {
                    const rc = capi.sqlite3_declare_vtab(toPtr(pDb), schema);
                    if (rc !== 0) { return rc; }
                    vtab.xVtab.create(toPtr(ppVtab));
                    return 0;
                },
                xConnect(pDb, pAux, argc, argv, ppVtab) {
                    const rc = capi.sqlite3_declare_vtab(toPtr(pDb), schema);
                    if (rc !== 0) { return rc; }
                    vtab.xVtab.create(toPtr(ppVtab));
                    return 0;
                },
                xBestIndex(_pVtab, pIdxInfo) {
                    const idxInfo = vtab.xIndexInfo(toPtr(pIdxInfo));
                    let argvIndex = 1;
                    let idxNum = 0;
                    for (let i = 0; i < idxInfo.$nConstraint; ++i) {
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                        const constraint = idxInfo.nthConstraint(i);
                        if (!constraint || constraint.$usable === 0 || constraint.$op !== eqOp) { continue; }
                        const column = toPtr(constraint.$iColumn);
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                        const usage = idxInfo.nthConstraintUsage(i);
                        if (!usage) { continue; }
                        switch (column) {
                            case -1:
                                idxNum |= termsVtabIdxRowIdEq;
                                break;
                            case 0:
                                idxNum |= termsVtabIdxDictionaryEq;
                                break;
                            case 1:
                                idxNum |= termsVtabIdxExpressionEq;
                                break;
                            case 2:
                                idxNum |= termsVtabIdxReadingEq;
                                break;
                            case 14:
                                idxNum |= termsVtabIdxSequenceEq;
                                break;
                            default:
                                continue;
                        }
                        usage.$argvIndex = argvIndex++;
                        usage.$omit = 1;
                    }
                    idxInfo.$idxNum = idxNum;
                    idxInfo.$estimatedRows = idxNum === 0 ? Math.max(1, termRecordStore.size) : 32;
                    idxInfo.$estimatedCost = idxNum === 0 ? Math.max(1, termRecordStore.size) : 32;
                    return 0;
                },
                xDisconnect(pVtab) {
                    vtab.xVtab.dispose(toPtr(pVtab));
                    return 0;
                },
                xDestroy(pVtab) {
                    vtab.xVtab.dispose(toPtr(pVtab));
                    return 0;
                },
                xOpen(_pVtab, ppCursor) {
                    const cursor = vtab.xCursor.create(toPtr(ppCursor));
                    termsVtabCursorState.set(cursor.pointer, {ids: [], index: 0});
                    return 0;
                },
                xClose(pCursor) {
                    const cursorPtr = toPtr(pCursor);
                    termsVtabCursorState.delete(cursorPtr);
                    vtab.xCursor.dispose(cursorPtr);
                    return 0;
                },
                xFilter(pCursor, idxNum, _idxStr, argc, argv) {
                    const cursorPtr = toPtr(pCursor);
                    const state = termsVtabCursorState.get(cursorPtr);
                    if (typeof state === 'undefined') { return 0; }
                    const args = capi.sqlite3_values_to_js(toPtr(argc), toPtr(argv));
                    let argIndex = 0;
                    let rowId = null;
                    let dictionary = null;
                    let expression = null;
                    let reading = null;
                    let sequence = null;
                    const idxBits = toPtr(idxNum);
                    if ((idxBits & termsVtabIdxRowIdEq) !== 0) { rowId = asNumber(args[argIndex++], -1); }
                    if ((idxBits & termsVtabIdxDictionaryEq) !== 0) { dictionary = asString(args[argIndex++]); }
                    if ((idxBits & termsVtabIdxExpressionEq) !== 0) { expression = asString(args[argIndex++]); }
                    if ((idxBits & termsVtabIdxReadingEq) !== 0) { reading = asString(args[argIndex++]); }
                    if ((idxBits & termsVtabIdxSequenceEq) !== 0) { sequence = asNumber(args[argIndex++], -1); }

                    const baseIds = (typeof rowId === 'number' && rowId > 0) ? [rowId] : termRecordStore.getAllIds();
                    const ids = [];
                    for (const id of baseIds) {
                        if (id <= 0) { continue; }
                        const record = termRecordStore.getById(id);
                        if (typeof record === 'undefined') { continue; }
                        if (dictionary !== null && record.dictionary !== dictionary) { continue; }
                        if (expression !== null && record.expression !== expression) { continue; }
                        if (reading !== null && record.reading !== reading) { continue; }
                        if (sequence !== null && (record.sequence ?? -1) !== sequence) { continue; }
                        ids.push(id);
                    }
                    state.ids = ids;
                    state.index = 0;
                    return 0;
                },
                xNext(pCursor) {
                    const state = termsVtabCursorState.get(toPtr(pCursor));
                    if (typeof state !== 'undefined') {
                        ++state.index;
                    }
                    return 0;
                },
                xEof(pCursor) {
                    const state = termsVtabCursorState.get(toPtr(pCursor));
                    return (typeof state === 'undefined' || state.index >= state.ids.length) ? 1 : 0;
                },
                xColumn(pCursor, pContext, column) {
                    const state = termsVtabCursorState.get(toPtr(pCursor));
                    if (typeof state === 'undefined' || state.index >= state.ids.length) {
                        capi.sqlite3_result_null(toPtr(pContext));
                        return 0;
                    }
                    const id = state.ids[state.index];
                    const record = termRecordStore.getById(id);
                    if (typeof record === 'undefined') {
                        capi.sqlite3_result_null(toPtr(pContext));
                        return 0;
                    }
                    let value = null;
                    switch (toPtr(column)) {
                        case 0: value = record.dictionary; break;
                        case 1: value = record.expression; break;
                        case 2: value = record.reading; break;
                        case 3: value = record.expressionReverse; break;
                        case 4: value = record.readingReverse; break;
                        case 5: value = null; break;
                        case 6: value = record.entryContentOffset; break;
                        case 7: value = record.entryContentLength; break;
                        case 8: value = record.entryContentDictName; break;
                        case 9: value = ''; break;
                        case 10: value = ''; break;
                        case 11: value = ''; break;
                        case 12: value = record.score; break;
                        case 13: value = '[]'; break;
                        case 14: value = record.sequence; break;
                        default: value = null; break;
                    }
                    capi.sqlite3_result_js(toPtr(pContext), value);
                    return 0;
                },
                xRowid(pCursor, ppRowId) {
                    const state = termsVtabCursorState.get(toPtr(pCursor));
                    const id = (typeof state === 'undefined' || state.index >= state.ids.length) ? 0 : state.ids[state.index];
                    vtab.xRowid(toPtr(ppRowId), id);
                    return 0;
                },
                xUpdate() {
                    return capi.SQLITE_READONLY;
                },
            },
        });
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const typedModule = /** @type {import('@sqlite.org/sqlite-wasm').sqlite3_module} */ (module);
        this._termsVtabModule = typedModule;
        const rc = capi.sqlite3_create_module(dbPointer, 'manabitan_terms', typedModule, 0);
        if (rc !== 0) {
            throw new Error(`Failed to register manabitan_terms module: rc=${rc}`);
        }
        this._termsVtabModuleRegistered = true;
    }

    /**
     * @param {string} whereClause
     * @returns {string}
     */
    _createTermSelectSql(whereClause) {
        return `
            SELECT
                t.*
            FROM terms t
            WHERE ${whereClause}
        `;
    }

    /**
     * @param {Iterable<number>} ids
     * @returns {Promise<Map<number, import('dictionary-database').DatabaseTermEntryWithId>>}
     */
    async _fetchTermRowsByIds(ids) {
        await this._termContentStore.ensureLoadedForRead();
        /** @type {Map<number, import('dictionary-database').DatabaseTermEntryWithId>} */
        const rowsById = new Map();
        const recordsById = this._termRecordStore.getByIds(ids);
        for (const [id, record] of recordsById) {
            const row = await this._deserializeTermRow({
                id,
                dictionary: record.dictionary,
                expression: record.expression,
                reading: record.reading,
                expressionReverse: record.expressionReverse,
                readingReverse: record.readingReverse,
                entryContentId: null,
                entryContentOffset: record.entryContentOffset,
                entryContentLength: record.entryContentLength,
                entryContentDictName: record.entryContentDictName,
                definitionTags: '',
                termTags: '',
                rules: '',
                score: record.score,
                glossaryJson: '[]',
                sequence: record.sequence,
            });
            rowsById.set(id, row);
        }
        return rowsById;
    }

    /**
     * @param {import('core').SafeAny} row
     * @returns {Promise<import('dictionary-database').DatabaseTermEntryWithId>}
     */
    async _deserializeTermRow(row) {
        const entryContentId = this._asNullableNumber(row.entryContentId);
        const contentOffset = this._asNumber(row.entryContentOffset, -1);
        const contentLength = this._asNumber(row.entryContentLength, -1);
        const contentDictName = this._asNullableString(row.entryContentDictName) ?? '';
        const hasExternalContentSpan = contentOffset >= 0 && contentLength > 0;
        const cacheKey = hasExternalContentSpan ?
            `span:${contentOffset}:${contentLength}:${contentDictName}` :
            (typeof entryContentId === 'number' && entryContentId > 0 ? `id:${entryContentId}` : '');
        /** @type {string|null} */
        let definitionTags;
        /** @type {string|undefined} */
        let termTags;
        /** @type {string} */
        let rules;
        /** @type {import('dictionary-data').TermGlossary[]} */
        let glossary;
        /** @type {(() => import('dictionary-data').TermGlossary[])|null} */
        let glossaryResolver = null;

        if (cacheKey.length > 0) {
            let cached = this._getCachedTermEntryContent(cacheKey);
            if (typeof cached === 'undefined') {
                /** @type {Uint8Array|null} */
                let contentBytes = null;
                if (contentOffset >= 0 && contentLength > 0) {
                    try {
                        contentBytes = await this._termContentStore.readSlice(contentOffset, contentLength);
                    } catch (e) {
                        logTermContentZstdError(e);
                        contentBytes = null;
                    }
                }
                if (contentBytes !== null && contentBytes.length > 0) {
                    try {
                        const rawSharedGlossaryHeader = (
                            contentDictName === RAW_TERM_CONTENT_SHARED_GLOSSARY_DICT_NAME ||
                            contentDictName === RAW_TERM_CONTENT_COMPRESSED_SHARED_GLOSSARY_DICT_NAME ||
                            isRawTermContentSharedGlossaryBinary(contentBytes)
                        ) ?
                            decodeRawTermContentSharedGlossaryHeader(contentBytes, this._textDecoder) :
                            null;
                        if (rawSharedGlossaryHeader !== null) {
                            definitionTags = this._asNullableString(rawSharedGlossaryHeader.definitionTags) ?? null;
                            termTags = this._asNullableString(rawSharedGlossaryHeader.termTags);
                            rules = this._asString(rawSharedGlossaryHeader.rules);
                            const rawGlossaryJsonBytes = contentDictName === RAW_TERM_CONTENT_COMPRESSED_SHARED_GLOSSARY_DICT_NAME ?
                                await this._readCompressedSharedGlossarySlice(
                                    this._asString(row.dictionary),
                                    rawSharedGlossaryHeader.glossaryOffset,
                                    rawSharedGlossaryHeader.glossaryLength,
                                ) :
                                await this._termContentStore.readSlice(
                                    rawSharedGlossaryHeader.glossaryOffset,
                                    rawSharedGlossaryHeader.glossaryLength,
                                );
                            const glossaryJson = this._textDecoder.decode(rawGlossaryJsonBytes);
                            glossary = this._safeParseJson(glossaryJson, []);
                            cached = {
                                definitionTags,
                                termTags,
                                rules,
                                glossaryJson,
                                glossary: Array.isArray(glossary) ? glossary : [],
                            };
                        } else {
                            const rawContentHeader = (
                                contentDictName === RAW_TERM_CONTENT_DICT_NAME ||
                                isRawTermContentBinary(contentBytes)
                            ) ?
                                decodeRawTermContentHeader(contentBytes, this._textDecoder) :
                                null;
                            if (rawContentHeader !== null) {
                                definitionTags = this._asNullableString(rawContentHeader.definitionTags) ?? null;
                                termTags = this._asNullableString(rawContentHeader.termTags);
                                rules = this._asString(rawContentHeader.rules);
                                const rawGlossaryJsonBytes = getRawTermContentGlossaryJsonBytes(
                                    contentBytes,
                                    rawContentHeader.glossaryJsonOffset,
                                    rawContentHeader.glossaryJsonLength,
                                );
                                const glossaryJson = this._textDecoder.decode(rawGlossaryJsonBytes);
                                glossary = this._safeParseJson(glossaryJson, []);
                                cached = {
                                    definitionTags,
                                    termTags,
                                    rules,
                                    glossaryJson,
                                    glossary: Array.isArray(glossary) ? glossary : [],
                                };
                            } else {
                                const contentJson = (contentDictName === 'raw') ?
                                    this._textDecoder.decode(contentBytes) :
                                    this._textDecoder.decode(decompressTermContentZstd(contentBytes, contentDictName.length > 0 ? contentDictName : null));
                                const parsedHeader = this._parseSerializedTermEntryContentHeader(contentJson);
                                if (parsedHeader !== null) {
                                    definitionTags = parsedHeader.definitionTags;
                                    termTags = parsedHeader.termTags;
                                    rules = parsedHeader.rules;
                                    glossary = this._safeParseJson(parsedHeader.glossaryJson, []);
                                    cached = {
                                        definitionTags,
                                        termTags,
                                        rules,
                                        glossaryJson: parsedHeader.glossaryJson,
                                        glossary: Array.isArray(glossary) ? glossary : [],
                                    };
                                } else {
                                    const content = /** @type {{rules?: string, definitionTags?: string, termTags?: string, glossary?: import('dictionary-data').TermGlossary[]}} */ (
                                        this._safeParseJson(contentJson, {})
                                    );
                                    definitionTags = this._asNullableString(content.definitionTags) ?? null;
                                    termTags = this._asNullableString(content.termTags);
                                    rules = this._asString(content.rules);
                                    glossary = Array.isArray(content.glossary) ? content.glossary : [];
                                    cached = {
                                        definitionTags,
                                        termTags,
                                        rules,
                                        glossaryJson: JSON.stringify(glossary),
                                        glossary,
                                    };
                                }
                            }
                        }
                    } catch (e) {
                        logTermContentZstdError(e);
                        definitionTags = null;
                        termTags = '';
                        rules = '';
                        glossary = [];
                        cached = {
                            definitionTags,
                            termTags,
                            rules,
                            glossaryJson: '[]',
                            glossary,
                        };
                    }
                } else {
                    definitionTags = null;
                    termTags = '';
                    rules = '';
                    glossary = [];
                    cached = {
                        definitionTags,
                        termTags,
                        rules,
                        glossaryJson: '[]',
                        glossary,
                    };
                }
                this._setCachedTermEntryContent(cacheKey, cached);
            }
            definitionTags = cached.definitionTags;
            termTags = cached.termTags;
            rules = cached.rules;
            if (Array.isArray(cached.glossary)) {
                glossary = cached.glossary;
            } else {
                glossary = [];
                glossaryResolver = () => this._resolveCachedTermEntryGlossary(cached);
            }
        } else {
            definitionTags = this._asNullableString(row.definitionTags) ?? null;
            termTags = this._asNullableString(row.termTags);
            rules = this._asString(row.rules);
            glossary = this._safeParseJson(this._asString(row.glossaryJson), []);
        }
        const termEntry = {
            id: this._asNumber(row.id, -1),
            expression: this._asString(row.expression),
            reading: this._asString(row.reading),
            expressionReverse: this._asNullableString(row.expressionReverse),
            readingReverse: this._asNullableString(row.readingReverse),
            definitionTags,
            rules,
            score: this._asNumber(row.score, 0),
            glossary,
            sequence: this._asNullableNumber(row.sequence),
            termTags,
            dictionary: this._asString(row.dictionary),
        };
        if (glossaryResolver !== null) {
            Object.defineProperty(termEntry, 'glossary', {
                enumerable: true,
                configurable: true,
                get: () => {
                    const resolvedGlossary = glossaryResolver();
                    Object.defineProperty(termEntry, 'glossary', {
                        enumerable: true,
                        configurable: true,
                        writable: true,
                        value: resolvedGlossary,
                    });
                    return resolvedGlossary;
                },
                set: (value) => {
                    Object.defineProperty(termEntry, 'glossary', {
                        enumerable: true,
                        configurable: true,
                        writable: true,
                        value: Array.isArray(value) ? value : [],
                    });
                },
            });
        }
        return termEntry;
    }

    /**
     * @param {string} cacheKey
     * @returns {{definitionTags: string|null, termTags: string|undefined, rules: string, glossaryJson?: string, glossary?: import('dictionary-data').TermGlossary[]}|undefined}
     */
    _getCachedTermEntryContent(cacheKey) {
        const cached = this._termEntryContentCache.get(cacheKey);
        if (typeof cached === 'undefined') {
            return void 0;
        }
        // Promote recently used entries.
        this._termEntryContentCache.delete(cacheKey);
        this._termEntryContentCache.set(cacheKey, cached);
        return cached;
    }

    /**
     * @param {string} cacheKey
     * @param {{definitionTags: string|null, termTags: string|undefined, rules: string, glossaryJson?: string, glossary?: import('dictionary-data').TermGlossary[]}} value
     */
    _setCachedTermEntryContent(cacheKey, value) {
        if (this._termEntryContentCache.has(cacheKey)) {
            this._termEntryContentCache.delete(cacheKey);
        }
        this._termEntryContentCache.set(cacheKey, value);
        while (this._termEntryContentCache.size > this._termEntryContentCacheMaxEntries) {
            const oldestKey = this._termEntryContentCache.keys().next().value;
            if (typeof oldestKey !== 'string') { break; }
            this._termEntryContentCache.delete(oldestKey);
        }
    }

    /**
     * @param {string} cacheKey
     * @param {boolean} present
     */
    _setTermExactPresenceCached(cacheKey, present) {
        if (this._termExactPresenceCache.has(cacheKey)) {
            this._termExactPresenceCache.delete(cacheKey);
        }
        this._termExactPresenceCache.set(cacheKey, present);
        while (this._termExactPresenceCache.size > this._termExactPresenceCacheMaxEntries) {
            const oldestKey = this._termExactPresenceCache.keys().next().value;
            if (typeof oldestKey !== 'string') { break; }
            this._termExactPresenceCache.delete(oldestKey);
        }
    }

    /**
     * @param {{glossaryJson?: string, glossary?: import('dictionary-data').TermGlossary[], definitionTags: string|null, termTags: string|undefined, rules: string}} cached
     * @returns {import('dictionary-data').TermGlossary[]}
     */
    _resolveCachedTermEntryGlossary(cached) {
        if (Array.isArray(cached.glossary)) {
            return cached.glossary;
        }
        const parsedGlossary = this._safeParseJson(typeof cached.glossaryJson === 'string' ? cached.glossaryJson : '[]', []);
        cached.glossary = Array.isArray(parsedGlossary) ? parsedGlossary : [];
        return cached.glossary;
    }

    /**
     * @param {string} value
     * @param {number} startIndex
     * @returns {{token: string, endIndex: number}|null}
     */
    _readJsonStringToken(value, startIndex) {
        if (startIndex < 0 || startIndex >= value.length || value[startIndex] !== '"') {
            return null;
        }
        let i = startIndex + 1;
        const ii = value.length;
        while (i < ii) {
            const c = value[i];
            if (c === '\\') {
                i += 2;
                continue;
            }
            if (c === '"') {
                return {
                    token: value.slice(startIndex, i + 1),
                    endIndex: i + 1,
                };
            }
            ++i;
        }
        return null;
    }

    /**
     * @param {string} contentJson
     * @returns {{rules: string, definitionTags: string|null, termTags: string|undefined, glossaryJson: string}|null}
     */
    _parseSerializedTermEntryContentHeader(contentJson) {
        const prefixRules = '{"rules":';
        const prefixDefinitionTags = ',"definitionTags":';
        const prefixTermTags = ',"termTags":';
        const prefixGlossary = ',"glossary":';
        if (!contentJson.startsWith(prefixRules) || !contentJson.endsWith('}')) {
            return null;
        }

        let index = prefixRules.length;
        const rulesToken = this._readJsonStringToken(contentJson, index);
        if (rulesToken === null) { return null; }
        index = rulesToken.endIndex;
        if (!contentJson.startsWith(prefixDefinitionTags, index)) { return null; }
        index += prefixDefinitionTags.length;

        const definitionTagsToken = this._readJsonStringToken(contentJson, index);
        if (definitionTagsToken === null) { return null; }
        index = definitionTagsToken.endIndex;
        if (!contentJson.startsWith(prefixTermTags, index)) { return null; }
        index += prefixTermTags.length;

        const termTagsToken = this._readJsonStringToken(contentJson, index);
        if (termTagsToken === null) { return null; }
        index = termTagsToken.endIndex;
        if (!contentJson.startsWith(prefixGlossary, index)) { return null; }
        index += prefixGlossary.length;
        if (index > contentJson.length - 1) { return null; }

        const glossaryJson = contentJson.slice(index, -1);
        return {
            rules: /** @type {string} */ (this._safeParseJson(rulesToken.token, '')),
            definitionTags: this._asNullableString(this._safeParseJson(definitionTagsToken.token, '')) ?? null,
            termTags: this._asNullableString(this._safeParseJson(termTagsToken.token, '')),
            glossaryJson,
        };
    }

    /**
     * @param {import('core').SafeAny} row
     * @returns {import('dictionary-database').DatabaseTermMeta}
     * @throws {Error}
     */
    _deserializeTermMetaRow(row) {
        const expression = this._asString(row.expression);
        const dictionary = this._asString(row.dictionary);
        const mode = this._asString(row.mode);
        const data = /** @type {unknown} */ (this._safeParseJson(this._asString(row.dataJson), null));
        switch (mode) {
            case 'freq':
                return {
                    expression,
                    mode: 'freq',
                    data: /** @type {import('dictionary-data').GenericFrequencyData | import('dictionary-data').TermMetaFrequencyDataWithReading} */ (data),
                    dictionary,
                };
            case 'pitch':
                return {
                    expression,
                    mode: 'pitch',
                    data: /** @type {import('dictionary-data').TermMetaPitchData} */ (data),
                    dictionary,
                };
            case 'ipa':
                return {
                    expression,
                    mode: 'ipa',
                    data: /** @type {import('dictionary-data').TermMetaPhoneticData} */ (data),
                    dictionary,
                };
            default:
                throw new Error(`Unknown mode: ${mode}`);
        }
    }

    /**
     * @param {import('core').SafeAny} row
     * @returns {import('dictionary-database').DatabaseKanjiEntry}
     */
    _deserializeKanjiRow(row) {
        return {
            character: this._asString(row.character),
            onyomi: this._asString(row.onyomi),
            kunyomi: this._asString(row.kunyomi),
            tags: this._asString(row.tags),
            meanings: this._safeParseJson(this._asString(row.meaningsJson), []),
            dictionary: this._asString(row.dictionary),
            stats: this._safeParseJson(this._asNullableString(row.statsJson) ?? '{}', {}),
        };
    }

    /**
     * @param {import('core').SafeAny} row
     * @returns {import('dictionary-database').DatabaseKanjiMeta}
     * @throws {Error}
     */
    _deserializeKanjiMetaRow(row) {
        const character = this._asString(row.character);
        const dictionary = this._asString(row.dictionary);
        const mode = this._asString(row.mode);
        const data = /** @type {unknown} */ (this._safeParseJson(this._asString(row.dataJson), null));
        if (mode !== 'freq') {
            throw new Error(`Unknown mode: ${mode}`);
        }
        return {
            character,
            mode: 'freq',
            data: /** @type {import('dictionary-data').GenericFrequencyData} */ (data),
            dictionary,
        };
    }

    /**
     * @param {import('core').SafeAny} row
     * @returns {import('dictionary-database').Tag}
     */
    _deserializeTagRow(row) {
        return {
            name: this._asString(row.name),
            category: this._asString(row.category),
            order: this._asNumber(row.order, 0),
            notes: this._asString(row.notes),
            score: this._asNumber(row.score, 0),
            dictionary: this._asString(row.dictionary),
        };
    }

    /**
     * @param {import('core').SafeAny} row
     * @returns {Promise<import('dictionary-database').MediaDataArrayBufferContent>}
     */
    async _deserializeMediaRow(row) {
        const contentOffset = this._asNumber(row.contentOffset, 0);
        const contentLength = this._asNumber(row.contentLength, 0);
        const contentCompressionMethod = this._asNumber(row.contentCompressionMethod, ZIP_COMPRESSION_METHOD_STORE);
        const contentUncompressedLength = this._asNumber(row.contentUncompressedLength, 0);
        let content = this._toArrayBuffer(row.content);
        if (contentLength > 0 && content.byteLength === 0) {
            let contentBytes = await this._termContentStore.readSlice(contentOffset, contentLength);
            if (contentCompressionMethod !== ZIP_COMPRESSION_METHOD_STORE) {
                contentBytes = await inflateZipMediaContent(contentBytes, contentCompressionMethod, contentUncompressedLength);
            }
            content = (
                contentBytes.byteOffset === 0 &&
                contentBytes.byteLength === contentBytes.buffer.byteLength
            ) ?
                contentBytes.buffer :
                contentBytes.buffer.slice(contentBytes.byteOffset, contentBytes.byteOffset + contentBytes.byteLength);
        }
        return {
            dictionary: this._asString(row.dictionary),
            path: this._asString(row.path),
            mediaType: this._asString(row.mediaType),
            width: this._asNumber(row.width, 0),
            height: this._asNumber(row.height, 0),
            content,
            contentOffset,
            contentLength,
            contentCompressionMethod,
            contentUncompressedLength,
        };
    }

    /**
     * @param {unknown} field
     * @returns {string[]}
     */
    _splitField(field) {
        return typeof field === 'string' && field.length > 0 ? field.split(' ') : [];
    }

    /**
     * @param {unknown} value
     * @returns {ArrayBuffer}
     */
    _toArrayBuffer(value) {
        if (value instanceof ArrayBuffer) {
            return value;
        }
        if (value instanceof Uint8Array) {
            return value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength);
        }
        return new ArrayBuffer(0);
    }

    /**
     * @param {unknown} value
     * @returns {Uint8Array|null}
     */
    _toUint8Array(value) {
        if (value instanceof Uint8Array) {
            return value;
        }
        if (value instanceof ArrayBuffer) {
            return new Uint8Array(value);
        }
        return null;
    }

    /**
     * @param {Uint8Array} a
     * @param {Uint8Array} b
     * @returns {boolean}
     */
    _areUint8ArraysEqual(a, b) {
        if (a.byteLength !== b.byteLength) {
            return false;
        }
        for (let i = 0, ii = a.byteLength; i < ii; ++i) {
            if (a[i] !== b[i]) {
                return false;
            }
        }
        return true;
    }

    /**
     * @returns {number}
     */
    _computeStatementCacheMaxEntries() {
        const memoryGiB = this._getApproximateDeviceMemoryGiB();
        return memoryGiB !== null && memoryGiB <= 4 ? LOW_MEMORY_STATEMENT_CACHE_MAX_ENTRIES : DEFAULT_STATEMENT_CACHE_MAX_ENTRIES;
    }

    /**
     * @returns {number}
     */
    _computeTermExactPresenceCacheMaxEntries() {
        const memoryGiB = this._getApproximateDeviceMemoryGiB();
        return memoryGiB !== null && memoryGiB <= 4 ? LOW_MEMORY_TERM_EXACT_PRESENCE_CACHE_MAX_ENTRIES : DEFAULT_TERM_EXACT_PRESENCE_CACHE_MAX_ENTRIES;
    }

    /**
     * @returns {number}
     */
    _computeDefaultTermBulkAddStagingMaxRows() {
        const memoryGiB = this._getApproximateDeviceMemoryGiB();
        if (memoryGiB !== null && memoryGiB <= 4) {
            return TERM_BULK_ADD_STAGING_MAX_ROWS;
        }
        if (memoryGiB !== null && memoryGiB >= 8) {
            return HIGH_MEMORY_TERM_BULK_ADD_STAGING_MAX_ROWS;
        }
        return DEFAULT_TERM_BULK_ADD_STAGING_MAX_ROWS;
    }

    /**
     * @returns {number|null}
     */
    _getApproximateDeviceMemoryGiB() {
        try {
            const rawValue = /** @type {unknown} */ (Reflect.get(globalThis.navigator ?? {}, 'deviceMemory'));
            if (typeof rawValue === 'number' && Number.isFinite(rawValue) && rawValue > 0) {
                return rawValue;
            }
        } catch (_) {
            // NOP
        }
        return null;
    }

    /**
     * @param {number[]} values
     * @returns {number}
     */
    _average(values) {
        if (values.length === 0) { return 0; }
        let total = 0;
        for (const value of values) {
            total += value;
        }
        return total / values.length;
    }

    /**
     * @param {number[]} values
     * @returns {number}
     */
    _p95(values) {
        if (values.length === 0) { return 0; }
        const sorted = [...values].sort((a, b) => a - b);
        const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * 0.95) - 1));
        return sorted[index];
    }

    /**
     * @param {unknown} value
     * @param {number} defaultValue
     * @returns {number}
     */
    _asNumber(value, defaultValue = 0) {
        if (typeof value === 'number') { return value; }
        if (typeof value === 'bigint') { return Number(value); }
        if (typeof value === 'string' && value.length > 0) {
            const parsed = Number(value);
            return Number.isFinite(parsed) ? parsed : defaultValue;
        }
        return defaultValue;
    }

    /**
     * @param {unknown} value
     * @returns {number|undefined}
     */
    _asNullableNumber(value) {
        if (value === null || typeof value === 'undefined') {
            return void 0;
        }
        return this._asNumber(value, 0);
    }

    /**
     * @param {unknown} value
     * @returns {string}
     */
    _asString(value) {
        if (typeof value === 'string') {
            return value;
        }
        if (typeof value === 'number' || typeof value === 'bigint') {
            return `${value}`;
        }
        return '';
    }

    /**
     * @param {unknown} value
     * @returns {string|undefined}
     */
    _asNullableString(value) {
        if (value === null || typeof value === 'undefined') {
            return void 0;
        }
        return this._asString(value);
    }

    /**
     * @template [T=unknown]
     * @param {string} value
     * @param {T} fallback
     * @returns {T}
     */
    _safeParseJson(value, fallback) {
        try {
            return /** @type {T} */ (parseJson(value));
        } catch (_) {
            return fallback;
        }
    }

    /**
     * @param {string} rules
     * @param {string} definitionTags
     * @param {string} termTags
     * @param {import('dictionary-data').TermGlossary[]} glossary
     * @returns {string}
     */
    _serializeTermEntryContent(rules, definitionTags, termTags, glossary) {
        return JSON.stringify({rules, definitionTags, termTags, glossary});
    }

    /**
     * @param {import('dictionary-database').DatabaseTermEntry} row
     * @returns {Uint8Array|null}
     */
    _getRawTermContentBytesIfAvailable(row) {
        const glossaryJsonBytes = row.termEntryContentRawGlossaryJsonBytes;
        if (!(glossaryJsonBytes instanceof Uint8Array) || glossaryJsonBytes.byteLength === 0) {
            return null;
        }
        const rules = row.rules ?? '';
        const definitionTags = row.definitionTags ?? row.tags ?? '';
        const termTags = row.termTags ?? '';
        const contentBytes = encodeRawTermContentBinary(rules, definitionTags, termTags, glossaryJsonBytes, this._textEncoder);
        row.termEntryContentBytes = contentBytes;
        row.termEntryContentRawGlossaryJsonBytes = void 0;
        return contentBytes;
    }

    /**
     * @param {string} contentJson
     * @returns {string}
     */
    _hashEntryContent(contentJson) {
        let h1 = 0x811c9dc5;
        let h2 = 0x9e3779b9;
        const bytes = this._textEncoder.encode(contentJson);
        for (let i = 0, ii = bytes.length; i < ii; ++i) {
            const code = bytes[i];
            h1 = Math.imul((h1 ^ code) >>> 0, 0x01000193);
            h2 = Math.imul((h2 ^ code) >>> 0, 0x85ebca6b);
            h2 = (h2 ^ (h2 >>> 13)) >>> 0;
        }
        if ((h1 | h2) === 0) {
            h1 = 1;
        }
        return `${(h1 >>> 0).toString(16).padStart(8, '0')}${(h2 >>> 0).toString(16).padStart(8, '0')}`;
    }

    /**
     * @param {Uint8Array[]} contentBytesList
     * @param {string|null} compressionDictName
     * @param {(string|null)[]} [contentDictNameOverrides]
     * @param {string|null} [uniformRawContentDictName]
     * @returns {{storedChunks: Uint8Array[], contentDictNames: string[], entryToStoredChunkIndexes: number[]}}
     */
    _createTermContentStorageChunks(contentBytesList, compressionDictName, contentDictNameOverrides = [], uniformRawContentDictName = null) {
        if (this._termContentStorageMode === TERM_CONTENT_STORAGE_MODE_RAW_BYTES) {
            if (typeof uniformRawContentDictName === 'string' && uniformRawContentDictName.length > 0) {
                return {
                    storedChunks: contentBytesList,
                    contentDictNames: Array(contentBytesList.length).fill(uniformRawContentDictName),
                    entryToStoredChunkIndexes: contentBytesList.map((_, index) => index),
                };
            }
            return {
                storedChunks: contentBytesList,
                contentDictNames: contentBytesList.map((contentBytes, index) => {
                    const override = contentDictNameOverrides[index];
                    if (typeof override === 'string' && override.length > 0) {
                        return override;
                    }
                    return isRawTermContentBinary(contentBytes) ?
                        RAW_TERM_CONTENT_DICT_NAME :
                        (isRawTermContentSharedGlossaryBinary(contentBytes) ? RAW_TERM_CONTENT_SHARED_GLOSSARY_DICT_NAME : 'raw');
                }),
                entryToStoredChunkIndexes: contentBytesList.map((_, index) => index),
            };
        }
        /** @type {Uint8Array[]} */
        const storedChunks = [];
        /** @type {string[]} */
        const contentDictNames = [];
        for (const contentBytes of contentBytesList) {
            let storedBytes = contentBytes;
            let effectiveDictName = 'raw';
            if (contentBytes.byteLength >= this._termContentCompressionMinBytes) {
                const compressed = compressTermContentZstd(contentBytes, compressionDictName);
                if (compressed.byteLength < contentBytes.byteLength) {
                    storedBytes = compressed;
                    effectiveDictName = compressionDictName ?? '';
                }
            }
            storedChunks.push(storedBytes);
            contentDictNames.push(effectiveDictName);
        }
        return {
            storedChunks,
            contentDictNames,
            entryToStoredChunkIndexes: storedChunks.map((_, index) => index),
        };
    }

    /**
     * @param {number} rowCount
     * @returns {number}
     */
    _getTermBulkAddBatchSizeForCount(rowCount) {
        const baseline = this._termBulkAddBatchSize;
        if (!this._adaptiveTermBulkAddBatchSize) {
            return baseline;
        }
        let candidate = baseline;
        if (rowCount >= 300000) {
            candidate = 75000;
        } else if (rowCount >= 160000) {
            candidate = 75000;
        } else if (rowCount >= 60000) {
            candidate = 50000;
        } else if (rowCount >= 20000) {
            candidate = 37500;
        }
        return Math.max(1024, Math.min(100000, Math.max(baseline, candidate)));
    }

    /**
     * @param {Error} error
     * @returns {boolean}
     */
    _isRetryableBeginImmediateError(error) {
        return /SQLITE_BUSY|SQLITE_LOCKED|database is locked/i.test(error.message);
    }

    /**
     * @param {Error} error
     * @returns {boolean}
     */
    _isAlreadyInTransactionError(error) {
        return /cannot start a transaction within a transaction/i.test(error.message);
    }

    /**
     * @param {Error} error
     * @returns {boolean}
     */
    _isNoActiveTransactionError(error) {
        return /cannot commit - no transaction is active|cannot rollback - no transaction is active/i.test(error.message);
    }

    /**
     * @param {number} ms
     * @returns {Promise<void>}
     */
    async _sleep(ms) {
        if (ms <= 0) { return; }
        await new Promise((resolve) => {
            setTimeout(resolve, ms);
        });
    }

    /**
     * @param {import('@sqlite.org/sqlite-wasm').Database} db
     * @returns {Promise<void>}
     * @throws {Error}
     */
    async _beginImmediateTransaction(db) {
        if (!this._retryBeginImmediateTransaction) {
            try {
                db.exec('BEGIN IMMEDIATE');
            } catch (e) {
                const error = toError(e);
                if (this._isAlreadyInTransactionError(error)) {
                    return;
                }
                throw error;
            }
            return;
        }
        const retryBackoffMs = [0, 8, 16, 32, 64, 128];
        /** @type {Error|null} */
        let lastError = null;
        for (let i = 0; i < retryBackoffMs.length; ++i) {
            await this._sleep(retryBackoffMs[i]);
            try {
                db.exec('BEGIN IMMEDIATE');
                return;
            } catch (e) {
                const error = toError(e);
                if (this._isAlreadyInTransactionError(error)) {
                    return;
                }
                lastError = error;
                if (!this._isRetryableBeginImmediateError(error) || i >= (retryBackoffMs.length - 1)) {
                    throw error;
                }
            }
        }
        if (lastError !== null) {
            throw lastError;
        }
        throw new Error('BEGIN IMMEDIATE failed with unknown error');
    }

    /** */
    _applyRuntimePragmas() {
        const db = this._requireDb();
        db.exec('PRAGMA journal_mode = WAL');
        db.exec('PRAGMA synchronous = NORMAL');
        db.exec('PRAGMA temp_store = MEMORY');
        db.exec('PRAGMA foreign_keys = OFF');
        db.exec('PRAGMA wal_autocheckpoint = 1000');
        db.exec('PRAGMA cache_size = -16384');
        db.exec('PRAGMA cache_spill = ON');
        db.exec('PRAGMA locking_mode = NORMAL');
    }

    /** */
    _applyImportPragmas() {
        const db = this._requireDb();
        /** @param {string} sql */
        const execBestEffort = (sql) => {
            try {
                db.exec(sql);
            } catch (e) {
                const message = toError(e).message;
                if (!/inside a transaction|cannot change .* within a transaction/i.test(message)) {
                    throw e;
                }
                reportDiagnostics('dictionary-import-pragma-skipped', {
                    sql,
                    reason: message,
                });
            }
        };
        execBestEffort('PRAGMA journal_mode = WAL');
        execBestEffort('PRAGMA synchronous = OFF');
        execBestEffort('PRAGMA temp_store = MEMORY');
        execBestEffort('PRAGMA foreign_keys = OFF');
        execBestEffort('PRAGMA cache_size = -131072');
        execBestEffort('PRAGMA cache_spill = OFF');
        execBestEffort('PRAGMA wal_autocheckpoint = 0');
        // OPFS-backed sqlite handles can see generic I/O/CANTOPEN failures under
        // contention when EXCLUSIVE mode is held for long imports. Keep NORMAL
        // here so concurrent extension handles can continue to cooperate.
        execBestEffort('PRAGMA locking_mode = NORMAL');
    }

    /**
     * @param {import('dictionary-database').MatchSource} matchSource
     * @param {import('dictionary-database').MatchType} matchType
     * @param {import('dictionary-database').DatabaseTermEntryWithId} row
     * @param {number} index
     * @returns {import('dictionary-database').TermEntry}
     */
    _createTerm(matchSource, matchType, row, index) {
        const {sequence} = row;
        return {
            index,
            matchType,
            matchSource,
            term: row.expression,
            reading: row.reading,
            definitionTags: this._splitField(row.definitionTags || row.tags),
            termTags: this._splitField(row.termTags),
            rules: this._splitField(row.rules),
            definitions: row.glossary,
            score: row.score,
            dictionary: row.dictionary,
            id: row.id,
            sequence: typeof sequence === 'number' ? sequence : -1,
        };
    }

    /**
     * @param {import('dictionary-database').DatabaseKanjiEntry} row
     * @param {import('dictionary-database').FindMultiBulkData<string>} data
     * @returns {import('dictionary-database').KanjiEntry}
     */
    _createKanji(row, {itemIndex: index}) {
        const {stats} = row;
        return {
            index,
            character: row.character,
            onyomi: this._splitField(row.onyomi),
            kunyomi: this._splitField(row.kunyomi),
            tags: this._splitField(row.tags),
            definitions: row.meanings,
            stats: typeof stats === 'object' && stats !== null ? stats : {},
            dictionary: row.dictionary,
        };
    }

    /**
     * @param {import('dictionary-database').DatabaseTermMeta} row
     * @param {import('dictionary-database').FindMultiBulkData<string>} data
     * @returns {import('dictionary-database').TermMeta}
     * @throws {Error}
     */
    _createTermMeta({expression: term, mode, data, dictionary}, {itemIndex: index}) {
        switch (mode) {
            case 'freq':
                return {
                    index,
                    term,
                    mode: 'freq',
                    data: /** @type {import('dictionary-data').GenericFrequencyData | import('dictionary-data').TermMetaFrequencyDataWithReading} */ (data),
                    dictionary,
                };
            case 'pitch':
                return {
                    index,
                    term,
                    mode: 'pitch',
                    data: /** @type {import('dictionary-data').TermMetaPitchData} */ (data),
                    dictionary,
                };
            case 'ipa':
                return {
                    index,
                    term,
                    mode: 'ipa',
                    data: /** @type {import('dictionary-data').TermMetaPhoneticData} */ (data),
                    dictionary,
                };
            default:
                throw new Error(`Unknown mode: ${mode}`);
        }
    }

    /**
     * @param {import('dictionary-database').DatabaseKanjiMeta} row
     * @param {import('dictionary-database').FindMultiBulkData<string>} data
     * @returns {import('dictionary-database').KanjiMeta}
     */
    _createKanjiMeta({character, mode, data, dictionary}, {itemIndex: index}) {
        return {index, character, mode, data, dictionary};
    }

    /**
     * @param {import('dictionary-database').MediaDataArrayBufferContent} row
     * @param {import('dictionary-database').FindMultiBulkData<import('dictionary-database').MediaRequest>} data
     * @returns {import('dictionary-database').Media}
     */
    _createMedia(row, {itemIndex: index}) {
        const {dictionary, path, mediaType, width, height, content} = row;
        return {index, dictionary, path, mediaType, width, height, content};
    }
}
