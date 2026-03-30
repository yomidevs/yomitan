/*
 * Copyright (C) 2023-2025  Yomitan Authors
 * Copyright (C) 2020-2022  Yomichan Authors
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

import {
    BlobReader as BlobReader0,
    BlobWriter as BlobWriter0,
    TextWriter as TextWriter0,
    Uint8ArrayReader as Uint8ArrayReader0,
    Uint8ArrayWriter as Uint8ArrayWriter0,
    ZipReader as ZipReader0,
    configure,
} from '../../lib/zip.js';
import {parseJson} from '../core/json.js';
import {toError} from '../core/to-error.js';
import {stringReverse} from '../core/utilities.js';
import {getFileExtensionFromImageMediaType, getImageMediaTypeFromFileName} from '../media/media-util.js';
import {
    decodeRawTermContentBinary,
    encodeRawTermContentBinary,
    RAW_TERM_CONTENT_DICT_NAME,
    RAW_TERM_CONTENT_COMPRESSED_SHARED_GLOSSARY_DICT_NAME,
    RAW_TERM_CONTENT_SHARED_GLOSSARY_DICT_NAME,
    isRawTermContentSharedGlossaryBinary,
    rebaseRawTermContentSharedGlossaryBinary,
} from './raw-term-content.js';
import {
    initializeTermContentZstd,
    logTermContentZstdError,
} from './zstd-term-content.js';
import {decompress as zstdDecompress} from '../../lib/zstd-wasm.js';
import {compareRevisions} from './dictionary-data-util.js';
import {consumeLastTermBankWasmParseProfile, parseTermBankWithWasmChunks} from './term-bank-wasm-parser.js';

const BlobReader = /** @type {typeof import('@zip.js/zip.js').BlobReader} */ (/** @type {unknown} */ (BlobReader0));
const BlobWriter = /** @type {typeof import('@zip.js/zip.js').BlobWriter} */ (/** @type {unknown} */ (BlobWriter0));
const TextWriter = /** @type {typeof import('@zip.js/zip.js').TextWriter} */ (/** @type {unknown} */ (TextWriter0));
const Uint8ArrayReader = /** @type {typeof import('@zip.js/zip.js').Uint8ArrayReader} */ (/** @type {unknown} */ (Uint8ArrayReader0));
const Uint8ArrayWriter = /** @type {typeof import('@zip.js/zip.js').Uint8ArrayWriter} */ (/** @type {unknown} */ (Uint8ArrayWriter0));
const ZipReader = /** @type {typeof import('@zip.js/zip.js').ZipReader} */ (/** @type {unknown} */ (ZipReader0));

const INDEX_FILE_NAME = 'index.json';
const SUPPORTED_INDEX_VERSIONS = new Set([1, 3]);
const JSON_QUOTED_STRING_CACHE_MAX_ENTRIES = 8192;
const TERM_BANK_WASM_ROW_CHUNK_SIZE = 2048;
const TERM_BANK_WASM_INITIAL_META_CAPACITY_DIVISOR = 24;
const TERM_BANK_WASM_INITIAL_CONTENT_BYTES_PER_ROW = 96;
const TERM_ARTIFACT_ROW_CHUNK_SIZE = 40960;
const NO_MEDIA_FAST_PATH_TERM_BANK_WASM_ROW_CHUNK_SIZE = 8192;
const ADAPTIVE_TERM_BANK_WASM_ROW_CHUNK_SIZE_THRESHOLD_BYTES = 8 * 1024 * 1024;
const ADAPTIVE_TERM_BANK_WASM_ROW_CHUNK_SIZE_UPPER_BOUND_BYTES = 128 * 1024 * 1024;
const ADAPTIVE_TERM_BANK_WASM_INITIAL_META_CAPACITY_DIVISOR = 18;
const ADAPTIVE_TERM_BANK_WASM_INITIAL_CONTENT_BYTES_PER_ROW = 128;
const REVERSE_STRING_CACHE_MAX_ENTRIES = 4096;
const TERM_BANK_ARTIFACT_MAGIC_V1 = 'MBTB0001';
const TERM_BANK_ARTIFACT_MAGIC_V2 = 'MBTB0002';
const TERM_BANK_ARTIFACT_MAGIC_BYTES = TERM_BANK_ARTIFACT_MAGIC_V1.length;
const TERM_BANK_ARTIFACT_MANIFEST_FILE = 'manabitan-import-artifact.json';
const TERM_BANK_PACKED_ARTIFACT_FILE = 'manabitan-term-banks-packed.bin';
const TERM_BANK_PACKED_MEDIA_ARTIFACT_FILE = 'manabitan-media-packed.bin';
const TERM_BANK_SHARED_GLOSSARY_ARTIFACT_FILE = 'manabitan-term-glossary-shared.bin';
const TERM_ARTIFACT_PRELOAD_CONCURRENCY = 4;
const ZIP_COMPRESSION_METHOD_STORE = 0;
const HEX_BYTE_TABLE = Array.from({length: 256}, (_, i) => i.toString(16).padStart(2, '0'));
/** @type {import('dictionary-data').TermGlossary[]} */
const EMPTY_TERM_GLOSSARY = [];
const EMPTY_ARRAY_BUFFER = new ArrayBuffer(0);
Object.freeze(EMPTY_TERM_GLOSSARY);

/**
 * @template T
 * @param {number} length
 * @returns {T[]}
 */
function createSparseArray(length) {
    /** @type {T[]} */
    const result = [];
    result.length = length;
    return result;
}

/**
 * @returns {{
 *   internStringBytes: (bytes: Uint8Array) => number,
 *   buildPlan: (expressionIndexes: number[]|Uint32Array, readingIndexes: number[]|Uint32Array, count?: number) => import('./term-record-wasm-encoder.js').PreinternedTermRecordPlan,
 * }}
 */
function createArtifactTermRecordPreinternedPlanBuilder() {
    /** @type {Map<number, Map<number, Map<number, number[]>>>} */
    const stringIndexesByHash = new Map();
    /** @type {number[]} */
    const stringLengths = [];
    /** @type {Uint8Array[]} */
    const stringBytesList = [];

    /**
     * @param {number} h1
     * @param {number} h2
     * @param {number} byteLength
     * @returns {number[]|undefined}
     */
    const getCachedIndexes = (h1, h2, byteLength) => {
        const byH2 = stringIndexesByHash.get(h1 >>> 0);
        if (!(byH2 instanceof Map)) {
            return void 0;
        }
        const byLength = byH2.get(h2 >>> 0);
        if (!(byLength instanceof Map)) {
            return void 0;
        }
        return byLength.get(byteLength >>> 0);
    };

    /**
     * @param {number} h1
     * @param {number} h2
     * @param {number} byteLength
     * @param {number} index
     * @returns {void}
     */
    const cacheIndex = (h1, h2, byteLength, index) => {
        h1 >>>= 0;
        h2 >>>= 0;
        byteLength >>>= 0;
        let byH2 = stringIndexesByHash.get(h1);
        if (!(byH2 instanceof Map)) {
            byH2 = new Map();
            stringIndexesByHash.set(h1, byH2);
        }
        let byLength = byH2.get(h2);
        if (!(byLength instanceof Map)) {
            byLength = new Map();
            byH2.set(h2, byLength);
        }
        const cachedIndexes = byLength.get(byteLength);
        if (Array.isArray(cachedIndexes)) {
            cachedIndexes.push(index);
        } else {
            byLength.set(byteLength, [index]);
        }
    };

    /**
     * @param {Uint8Array} lhs
     * @param {Uint8Array} rhs
     * @returns {boolean}
     */
    const bytesEqual = (lhs, rhs) => {
        const length = lhs.byteLength;
        if (length !== rhs.byteLength) { return false; }
        for (let i = 0; i < length; ++i) {
            if (lhs[i] !== rhs[i]) { return false; }
        }
        return true;
    };

    return {
        internStringBytes(bytes) {
            let h1 = 0x811c9dc5;
            let h2 = 0x9e3779b9;
            for (let i = 0, ii = bytes.byteLength; i < ii; ++i) {
                const code = bytes[i];
                h1 = Math.imul((h1 ^ code) >>> 0, 0x01000193);
                h2 = Math.imul((h2 ^ code) >>> 0, 0x85ebca6b);
                h2 = (h2 ^ (h2 >>> 13)) >>> 0;
            }
            const cachedIndexes = getCachedIndexes(h1, h2, bytes.byteLength);
            if (Array.isArray(cachedIndexes)) {
                for (const cachedIndex of cachedIndexes) {
                    const cachedBytes = stringBytesList[cachedIndex];
                    if (cachedBytes instanceof Uint8Array && bytesEqual(cachedBytes, bytes)) {
                        return cachedIndex;
                    }
                }
            }
            const index = stringBytesList.length;
            cacheIndex(h1, h2, bytes.byteLength, index);
            stringLengths.push(bytes.byteLength);
            stringBytesList.push(bytes);
            return index;
        },
        buildPlan(expressionIndexes, readingIndexes, count = expressionIndexes.length) {
            let totalStringBytes = 0;
            for (const stringLength of stringLengths) {
                totalStringBytes += stringLength;
            }
            const stringsBuffer = new Uint8Array(totalStringBytes);
            let cursor = 0;
            for (const bytes of stringBytesList) {
                stringsBuffer.set(bytes, cursor);
                cursor += bytes.byteLength;
            }
            return {
                stringLengths: Uint16Array.from(stringLengths),
                stringsBuffer,
                expressionIndexes: expressionIndexes instanceof Uint32Array ?
                    expressionIndexes.subarray(0, count) :
                    Uint32Array.from(expressionIndexes.slice(0, count)),
                readingIndexes: readingIndexes instanceof Uint32Array ?
                    readingIndexes.subarray(0, count) :
                    Uint32Array.from(readingIndexes.slice(0, count)),
            };
        },
    };
}

/**
 * @param {import('dictionary-database').DatabaseTermEntry[]} rows
 * @param {import('./term-record-wasm-encoder.js').PreinternedTermRecordPlan} plan
 * @returns {void}
 */
function setTermRecordPreinternedPlan(rows, plan) {
    /** @type {{termRecordPreinternedPlan?: import('./term-record-wasm-encoder.js').PreinternedTermRecordPlan}} */ (/** @type {unknown} */ (rows)).termRecordPreinternedPlan = plan;
}

/**
 * @param {string} value
 * @returns {string}
 */
function reverseUtf16PreserveSurrogates(value) {
    const ii = value.length;
    if (ii <= 1) {
        return value;
    }
    // Most dictionary terms are BMP-only; use a cheaper code-unit reversal when no surrogate code units are present.
    let hasSurrogates = false;
    for (let i = 0; i < ii; ++i) {
        if ((value.charCodeAt(i) & 0xf800) === 0xd800) {
            hasSurrogates = true;
            break;
        }
    }
    if (!hasSurrogates) {
        /** @type {string[]} */
        const parts = new Array(ii);
        for (let i = 0; i < ii; ++i) {
            parts[i] = value[ii - 1 - i];
        }
        return parts.join('');
    }
    /** @type {string[]} */
    const parts = [];
    parts.length = ii;
    let outIndex = 0;
    for (let i = ii - 1; i >= 0; --i) {
        const c = value.charCodeAt(i);
        if (
            c >= 0xdc00 && c <= 0xdfff &&
            i > 0
        ) {
            const prev = value.charCodeAt(i - 1);
            if (prev >= 0xd800 && prev <= 0xdbff) {
                parts[outIndex++] = value.slice(i - 1, i + 1);
                --i;
                continue;
            }
        }
        parts[outIndex++] = value[i];
    }
    parts.length = outIndex;
    return parts.join('');
}

/**
 * @param {number} h1
 * @param {number} h2
 * @returns {string}
 */
function hashPairToHex(h1, h2) {
    const a = h1 >>> 0;
    const b = h2 >>> 0;
    return (
        HEX_BYTE_TABLE[(a >>> 24) & 0xff] +
        HEX_BYTE_TABLE[(a >>> 16) & 0xff] +
        HEX_BYTE_TABLE[(a >>> 8) & 0xff] +
        HEX_BYTE_TABLE[a & 0xff] +
        HEX_BYTE_TABLE[(b >>> 24) & 0xff] +
        HEX_BYTE_TABLE[(b >>> 16) & 0xff] +
        HEX_BYTE_TABLE[(b >>> 8) & 0xff] +
        HEX_BYTE_TABLE[b & 0xff]
    );
}

/**
 * @param {{termEntryContentHash?: string, termEntryContentHash1?: number, termEntryContentHash2?: number, termEntryContentBytes?: Uint8Array}} entry
 * @returns {boolean}
 */
function hasPrecomputedTermEntryContent(entry) {
    return (
        (
            typeof entry.termEntryContentHash === 'string' &&
            entry.termEntryContentHash.length > 0
        ) ||
        (
            Number.isInteger(entry.termEntryContentHash1) &&
            Number.isInteger(entry.termEntryContentHash2)
        )
    ) && entry.termEntryContentBytes instanceof Uint8Array;
}

/**
 * @typedef {object} ParsedTermBankChunkRow
 * @property {string} expression
 * @property {string} reading
 * @property {string} definitionTags
 * @property {string} rules
 * @property {number} score
 * @property {string} glossaryJson
 * @property {Uint8Array} [glossaryJsonBytes]
 * @property {boolean} [glossaryMayContainMedia]
 * @property {number|null} sequence
 * @property {string} termTags
 * @property {string} [termEntryContentHash]
 * @property {number} [termEntryContentHash1]
 * @property {number} [termEntryContentHash2]
 * @property {Uint8Array} termEntryContentBytes
 */

/**
 * @param {Uint8Array} bytes
 * @param {number} aStart
 * @param {number} bStart
 * @param {number} length
 * @returns {boolean}
 */
function byteRangeEqual(bytes, aStart, bStart, length) {
    for (let i = 0; i < length; ++i) {
        if (bytes[aStart + i] !== bytes[bStart + i]) {
            return false;
        }
    }
    return true;
}

export class DictionaryImporter {
    /**
     * @param {import('dictionary-importer-media-loader').GenericMediaLoader} mediaLoader
     * @param {import('dictionary-importer').OnProgressCallback} [onProgress]
     */
    constructor(mediaLoader, onProgress) {
        /** @type {import('dictionary-importer-media-loader').GenericMediaLoader} */
        this._mediaLoader = mediaLoader;
        /** @type {import('dictionary-importer').OnProgressCallback} */
        this._onProgress = typeof onProgress === 'function' ? onProgress : () => {};
        /** @type {import('dictionary-importer').ProgressData} */
        this._progressData = this._createProgressData();
        /** @type {number} */
        this._lastProgressTimestamp = 0;
        /** @type {boolean} */
        this._skipImageMetadata = false;
        /** @type {boolean} */
        this._skipMediaImport = false;
        /** @type {number} */
        this._mediaResolutionConcurrency = 8;
        /** @type {Map<string, Promise<import('dictionary-database').MediaDataArrayBufferContent>>} */
        this._pendingImageMediaByPath = new Map();
        /** @type {Map<string, {mediaType: string, width: number, height: number}>} */
        this._imageMetadataByPath = new Map();
        /** @type {boolean} */
        this._debugImportLogging = false;
        /** @type {TextEncoder} */
        this._textEncoder = new TextEncoder();
        /** @type {TextDecoder} */
        this._textDecoder = new TextDecoder();
        /** @type {Map<string, string>} */
        this._jsonQuotedStringCache = new Map();
        /** @type {Map<string, Uint8Array>} */
        this._utf8StringBytesCache = new Map();
        /** @type {number} */
        this._progressMinIntervalMs = 1000;
        /** @type {boolean} */
        this._adaptiveTermBulkAddBatchSize = true;
        /** @type {boolean} */
        this._glossaryMediaFastScan = false;
        /** @type {boolean} */
        this._lazyGlossaryDecodeForMedia = false;
        /** @type {boolean} */
        this._reuseExpressionReverseForReading = true;
        /** @type {boolean} */
        this._disableTermBankWasmFastPath = false;
        /** @type {boolean} */
        this._wasmCanonicalRowsFastPath = true;
        /** @type {boolean} */
        this._wasmPassThroughTermContent = true;
        /** @type {number} */
        this._termBankWasmRowChunkSize = TERM_BANK_WASM_ROW_CHUNK_SIZE;
        /** @type {number} */
        this._termBankWasmInitialMetaCapacityDivisor = TERM_BANK_WASM_INITIAL_META_CAPACITY_DIVISOR;
        /** @type {number} */
        this._termBankWasmInitialContentBytesPerRow = TERM_BANK_WASM_INITIAL_CONTENT_BYTES_PER_ROW;
        /** @type {boolean} */
        this._adaptiveTermBankWasmRowChunkSize = false;
        /** @type {boolean} */
        this._adaptiveTermBankWasmRowChunkSizeTiered = false;
        /** @type {boolean} */
        this._adaptiveTermBankWasmInitialCapacity = false;
        /** @type {boolean} */
        this._streamTermArtifactChunks = true;
        /** @type {number} */
        this._termArtifactRowChunkSize = TERM_ARTIFACT_ROW_CHUNK_SIZE;
        /** @type {boolean} */
        this._wasmSkipUnusedTermContentEncoding = true;
        /** @type {boolean} */
        this._wasmReuseExpressionForReadingDecode = true;
        /** @type {boolean} */
        this._wasmPreallocateChunkRows = false;
        /** @type {boolean} */
        this._usePrecomputedContentForMediaRows = false;
        /** @type {boolean} */
        this._leanCanonicalTermEntryObjects = false;
        /** @type {boolean} */
        this._cacheReverseStrings = true;
        /** @type {number} */
        this._reverseStringCacheMaxEntries = REVERSE_STRING_CACHE_MAX_ENTRIES;
        /** @type {Map<string, string>} */
        this._reverseStringCache = new Map();
        /** @type {boolean} */
        this._fastPrefixReverse = true;
    }

    /**
     * @param {import('./dictionary-database.js').DictionaryDatabase} dictionaryDatabase
     * @param {ArrayBuffer|Blob|null} archiveContent
     * @param {import('dictionary-importer').ImportDetails} details
     * @returns {Promise<import('dictionary-importer').ImportResult>}
     */
    async importDictionary(dictionaryDatabase, archiveContent, details) {
        if (!dictionaryDatabase) {
            throw new Error('Invalid database');
        }
        if (!dictionaryDatabase.isPrepared()) {
            throw new Error('Database is not ready');
        }

        /** @type {Error[]} */
        const errors = [];
        const maxTransactionLength = 262144;
        const bulkAddProgressAllowance = 1000;
        const enableTermEntryContentDedup = details.enableTermEntryContentDedup !== false;
        const preserveCompressedMedia = details.preserveCompressedMedia === true;
        const termContentStorageMode = (details.termContentStorageMode === 'raw-bytes') ?
            details.termContentStorageMode :
            'raw-bytes';
        this._skipImageMetadata = details.skipImageMetadata === true;
        this._skipMediaImport = details.skipMediaImport === true;
        this._mediaResolutionConcurrency = Math.max(1, Math.min(32, Math.trunc(details.mediaResolutionConcurrency ?? 8)));
        this._debugImportLogging = details.debugImportLogging === true;
        this._pendingImageMediaByPath.clear();
        this._imageMetadataByPath.clear();
        this._jsonQuotedStringCache.clear();
        this._utf8StringBytesCache.clear();
        this._reverseStringCache.clear();
        dictionaryDatabase.setImportOptimizationFlags({
            termContentStorageMode,
            expectedTermContentImportBytes: void 0,
        });
        const tImportStart = Date.now();
        /** @type {Array<{phase: string, elapsedMs: number, details?: Record<string, string|number|boolean|null>}>} */
        const phaseTimings = [];
        /** @type {{termParseMs: number, termSerializationMs: number, bulkAddTermsMs: number, bulkAddTagsMetaMs: number, mediaResolveMs: number, mediaWriteMs: number, termFileNonParseWriteMs: number, termMetaReadMs: number, kanjiReadMs: number, kanjiMetaReadMs: number, tagReadMs: number}} */
        const step4TimingBreakdown = {
            termParseMs: 0,
            termSerializationMs: 0,
            bulkAddTermsMs: 0,
            bulkAddTagsMetaMs: 0,
            mediaResolveMs: 0,
            mediaWriteMs: 0,
            termFileNonParseWriteMs: 0,
            termMetaReadMs: 0,
            kanjiReadMs: 0,
            kanjiMetaReadMs: 0,
            tagReadMs: 0,
        };
        /** @type {{parserProfile?: Record<string, string|number|boolean|null>|null, materializationMs?: number, chunkSinkMs?: number, chunkCount?: number, totalRows?: number}|null} */
        let lastFastTermBankReadProfile = null;
        /** @type {{readBytesMs?: number, decodeRowsMs?: number, reverseRowsMs?: number, metadataRebaseMs?: number, chunkSinkMs?: number, chunkCount?: number, totalRows?: number, rowChunkSize?: number, readingEqualsExpressionCount?: number, sequencePresentCount?: number, zeroScoreCount?: number, nonZeroScoreCount?: number, sharedGlossaryRowCount?: number, contentLengthExtendedCount?: number, avgContentLength?: number, avgExpressionLength?: number, avgReadingLength?: number}|null} */
        let lastArtifactTermBankReadProfile = null;

        /**
         * @param {string} phase
         * @param {number} startTime
         * @param {Record<string, string|number|boolean|null>} [phaseDetails]
         */
        const recordPhaseTiming = (phase, startTime, phaseDetails = {}) => {
            const elapsedMs = Math.max(0, Date.now() - startTime);
            const phaseTiming = {phase, elapsedMs, details: phaseDetails};
            phaseTimings.push(phaseTiming);
            this._logImport(`phase ${phase} ${elapsedMs}ms details=${JSON.stringify(phaseDetails)}`);
        };

        /**
         * @template {import('dictionary-database').ObjectStoreName} T
         * @param {T} objectStoreName
         * @param {import('dictionary-database').ObjectStoreData<T>[]} entries
         * @param {{trackProgress?: boolean}} [options]
         */
        const bulkAdd = async (objectStoreName, entries, {trackProgress = true} = {}) => {
            const entryCount = entries.length;
            let progressIndexIncrease = 0;
            if (trackProgress) {
                progressIndexIncrease = bulkAddProgressAllowance / Math.ceil(entryCount / maxTransactionLength);
                if (entryCount < maxTransactionLength) { progressIndexIncrease = bulkAddProgressAllowance; }
                if (entryCount === 0) {
                    this._progressData.index += progressIndexIncrease;
                }
            }

            for (let i = 0, chunkIndex = 0; i < entryCount; i += maxTransactionLength, ++chunkIndex) {
                const count = Math.min(maxTransactionLength, entryCount - i);
                const tChunk = Date.now();

                try {
                    await dictionaryDatabase.bulkAdd(objectStoreName, entries, i, count);
                } catch (e) {
                    throw toError(e);
                }
                this._logImport(
                    `bulkAdd ${objectStoreName} chunk=${chunkIndex + 1} ` +
                    `rows=${count} elapsed=${Date.now() - tChunk}ms`,
                );

                if (trackProgress) {
                    this._progressData.index += progressIndexIncrease;
                    this._progress();
                }
            }
        };

        this._progressReset();

        configure({
            workerScripts: {
                deflate: ['../../lib/z-worker.js'],
                inflate: ['../../lib/z-worker.js'],
            },
        });

        // Read archive
        const tArchiveStart = Date.now();
        /** @type {import('dictionary-importer').ArchiveFileMap} */
        let fileMap;
        /** @type {import('@zip.js/zip.js').ZipReader<import('@zip.js/zip.js').BlobReader|import('@zip.js/zip.js').Uint8ArrayReader>|null} */
        let archiveReader = null;
        /** @type {import('dictionary-data').Index} */
        let index;
        try {
            if (archiveContent === null) {
                throw new Error('Archive content is no longer available');
            }
            ({fileMap, zipReader: archiveReader} = await this._getFilesFromArchive(archiveContent));
            index = await this._readAndValidateIndex(fileMap);
        } catch (e) {
            recordPhaseTiming('archive-and-index', tArchiveStart, {ok: false});
            return {
                result: null,
                errors: [toError(e)],
                debug: {phaseTimings},
            };
        }
        recordPhaseTiming('archive-and-index', tArchiveStart, {
            ok: true,
            fileCount: fileMap.size,
            indexVersion: typeof index.version === 'number' ? index.version : null,
        });
        this._logImport(`archive+index ${Date.now() - tArchiveStart}ms files=${fileMap.size}`);

        const sourceDictionaryTitle = index.title;
        const dictionaryTitleOverride = (
            typeof details.dictionaryTitleOverride === 'string' &&
            details.dictionaryTitleOverride.trim().length > 0
        ) ?
            details.dictionaryTitleOverride.trim() :
            null;
        const dictionaryTitle = dictionaryTitleOverride ?? sourceDictionaryTitle;
        const version = /** @type {import('dictionary-data').IndexVersion} */ (index.version);

        // Verify database is not already imported
        if (await dictionaryDatabase.dictionaryExists(dictionaryTitle)) {
            return {
                errors: [new Error(`Dictionary ${dictionaryTitle} is already imported, skipped it.`)],
                result: null,
                debug: {phaseTimings},
            };
        }
        dictionaryDatabase.setTermEntryContentDedupEnabled(enableTermEntryContentDedup);
        dictionaryDatabase.setImportDebugLogging(this._debugImportLogging);

        let termArtifactManifest = null;
        if (fileMap.has(TERM_BANK_ARTIFACT_MANIFEST_FILE)) {
            termArtifactManifest = await this._readTermArtifactManifest(fileMap);
        }
        const usePrunedArtifactAuxFastPath = termArtifactManifest?.prunedAuxFiles === true;

        // Files
        /** @type {import('dictionary-importer').QueryDetails} */
        const queryDetails = [
            ['termFiles', /^term_bank_(\d+)\.json$/],
            ['termArtifactFiles', /^term_bank_(\d+)\.mbtb$/],
        ];
        if (!usePrunedArtifactAuxFastPath) {
            queryDetails.push(
                ['termMetaFiles', /^term_meta_bank_(\d+)\.json$/],
                ['kanjiFiles', /^kanji_bank_(\d+)\.json$/],
                ['kanjiMetaFiles', /^kanji_meta_bank_(\d+)\.json$/],
                ['tagFiles', /^tag_bank_(\d+)\.json$/],
            );
        }
        const archiveFiles = Object.fromEntries(this._getArchiveFiles(fileMap, queryDetails));
        const termFiles = archiveFiles.termFiles ?? [];
        const termArtifactFiles = archiveFiles.termArtifactFiles ?? [];
        const termMetaFiles = archiveFiles.termMetaFiles ?? [];
        const kanjiFiles = archiveFiles.kanjiFiles ?? [];
        const kanjiMetaFiles = archiveFiles.kanjiMetaFiles ?? [];
        const tagFiles = archiveFiles.tagFiles ?? [];
        const useTermArtifactFiles = termArtifactFiles.length > 0;
        const effectiveTermContentStorageMode = (
            termArtifactManifest !== null &&
            (
                termArtifactManifest.termContentMode === RAW_TERM_CONTENT_SHARED_GLOSSARY_DICT_NAME ||
                termArtifactManifest.termContentMode === 'raw-v4'
            )
        ) ?
            'raw-bytes' :
            termContentStorageMode;
        if (effectiveTermContentStorageMode !== termContentStorageMode) {
            dictionaryDatabase.setImportOptimizationFlags({
                termContentStorageMode: effectiveTermContentStorageMode,
                expectedTermContentImportBytes: void 0,
            });
        }
        const packedTermArtifactEntry = (
            termArtifactManifest !== null &&
            typeof termArtifactManifest.packedFileName === 'string'
        ) ?
            fileMap.get(termArtifactManifest.packedFileName) :
            fileMap.get(TERM_BANK_PACKED_ARTIFACT_FILE);
        const packedMediaArtifactEntry = (
            termArtifactManifest !== null &&
            typeof termArtifactManifest.packedMediaFileName === 'string'
        ) ?
            fileMap.get(termArtifactManifest.packedMediaFileName) :
            fileMap.get(TERM_BANK_PACKED_MEDIA_ARTIFACT_FILE);
        const sharedGlossaryArtifactEntry = (
            termArtifactManifest !== null &&
            typeof termArtifactManifest.sharedGlossaryFileName === 'string'
        ) ?
            fileMap.get(termArtifactManifest.sharedGlossaryFileName) :
            fileMap.get(TERM_BANK_SHARED_GLOSSARY_ARTIFACT_FILE);
        const sharedGlossaryPackedOffset = termArtifactManifest?.sharedGlossaryPackedOffset ?? null;
        const sharedGlossaryPackedLength = termArtifactManifest?.sharedGlossaryPackedLength ?? null;
        const sharedGlossaryCompression = termArtifactManifest?.sharedGlossaryCompression ?? null;
        const sharedGlossaryUncompressedLength = termArtifactManifest?.sharedGlossaryUncompressedLength ?? null;
        /** @type {Uint8Array|null} */
        let packedTermArtifactBytes = null;
        /** @type {Uint8Array|null} */
        let packedMediaArtifactBytes = null;
        /** @type {Blob|null} */
        let packedMediaArtifactBlob = null;
        /** @type {Uint8Array|null} */
        let sharedGlossaryArtifactBytes = null;
        /** @type {Map<string, Uint8Array>|null} */
        let preloadedTermArtifactBytes = null;
        let packedTermArtifactPreloadMs = 0;
        let packedMediaArtifactPreloadMs = 0;
        let termArtifactPreloadMs = 0;
        let sharedGlossaryArtifactPreloadMs = 0;
        const useParallelPackedArtifactPreload = (
            termArtifactManifest !== null &&
            termArtifactManifest.packedMediaEntries.length >= 100000 &&
            typeof packedTermArtifactEntry !== 'undefined' &&
            typeof packedMediaArtifactEntry !== 'undefined'
        );
        if (useParallelPackedArtifactPreload) {
            const tParallelPackedArtifactReadStart = Date.now();
            const [parallelPackedTermArtifactBytes, parallelPackedMediaArtifact] = await Promise.all([
                this._getData(/** @type {import('@zip.js/zip.js').Entry} */ (packedTermArtifactEntry), new Uint8ArrayWriter()),
                this._skipImageMetadata ?
                    this._getData(/** @type {import('@zip.js/zip.js').Entry} */ (packedMediaArtifactEntry), new BlobWriter()) :
                    this._getData(/** @type {import('@zip.js/zip.js').Entry} */ (packedMediaArtifactEntry), new Uint8ArrayWriter()),
            ]);
            packedTermArtifactBytes = parallelPackedTermArtifactBytes;
            if (parallelPackedMediaArtifact instanceof Blob) {
                packedMediaArtifactBlob = parallelPackedMediaArtifact;
            } else {
                packedMediaArtifactBytes = parallelPackedMediaArtifact;
            }
            const parallelPackedArtifactPreloadMs = Math.max(0, Date.now() - tParallelPackedArtifactReadStart);
            packedTermArtifactPreloadMs = parallelPackedArtifactPreloadMs;
            packedMediaArtifactPreloadMs = 0;
            this._logImport(
                `parallel packed artifact preload ${parallelPackedArtifactPreloadMs}ms ` +
                `termBytes=${packedTermArtifactBytes.byteLength} mediaBytes=${
                    packedMediaArtifactBytes instanceof Uint8Array ?
                        packedMediaArtifactBytes.byteLength :
                        (packedMediaArtifactBlob instanceof Blob ? packedMediaArtifactBlob.size : 0)
                }`,
            );
        } else if (useTermArtifactFiles || typeof packedTermArtifactEntry !== 'undefined') {
            if (typeof packedTermArtifactEntry !== 'undefined') {
                const tPackedArtifactReadStart = Date.now();
                packedTermArtifactBytes = await this._getData(/** @type {import('@zip.js/zip.js').Entry} */ (packedTermArtifactEntry), new Uint8ArrayWriter());
                packedTermArtifactPreloadMs = Math.max(0, Date.now() - tPackedArtifactReadStart);
                this._logImport(`packed term artifact preload ${packedTermArtifactPreloadMs}ms bytes=${packedTermArtifactBytes.byteLength}`);
            } else if (termArtifactFiles.length > 1) {
                const tPreloadArtifactStart = Date.now();
                preloadedTermArtifactBytes = await this._preloadTermArtifactFiles(termArtifactFiles);
                termArtifactPreloadMs = Math.max(0, Date.now() - tPreloadArtifactStart);
                this._logImport(`term artifact preload ${termArtifactPreloadMs}ms files=${preloadedTermArtifactBytes.size}`);
            }
        }
        if (
            packedTermArtifactBytes instanceof Uint8Array &&
            Number.isInteger(sharedGlossaryPackedOffset) &&
            Number.isInteger(sharedGlossaryPackedLength)
        ) {
            const packedSharedGlossaryOffset = /** @type {number} */ (sharedGlossaryPackedOffset);
            const packedSharedGlossaryLength = /** @type {number} */ (sharedGlossaryPackedLength);
            if (
                packedSharedGlossaryOffset >= 0 &&
                packedSharedGlossaryLength > 0 &&
                packedSharedGlossaryOffset + packedSharedGlossaryLength <= packedTermArtifactBytes.byteLength
            ) {
                sharedGlossaryArtifactBytes = packedTermArtifactBytes.subarray(
                    packedSharedGlossaryOffset,
                    packedSharedGlossaryOffset + packedSharedGlossaryLength,
                );
            }
        }
        if (sharedGlossaryArtifactBytes === null && typeof sharedGlossaryArtifactEntry !== 'undefined') {
            const tSharedGlossaryReadStart = Date.now();
            sharedGlossaryArtifactBytes = await this._getData(/** @type {import('@zip.js/zip.js').Entry} */ (sharedGlossaryArtifactEntry), new Uint8ArrayWriter());
            sharedGlossaryArtifactPreloadMs = Math.max(0, Date.now() - tSharedGlossaryReadStart);
            this._logImport(`shared glossary artifact preload ${sharedGlossaryArtifactPreloadMs}ms bytes=${sharedGlossaryArtifactBytes.byteLength}`);
        }
        if (
            !useParallelPackedArtifactPreload &&
            packedMediaArtifactBytes === null &&
            packedMediaArtifactBlob === null &&
            termArtifactManifest !== null &&
            termArtifactManifest.packedMediaEntries.length > 0 &&
            typeof packedMediaArtifactEntry !== 'undefined'
        ) {
            const tPackedMediaReadStart = Date.now();
            const usePackedMediaBlobPreload =
                this._skipImageMetadata &&
                termArtifactManifest.packedMediaEntries.length >= 2048;
            if (usePackedMediaBlobPreload) {
                packedMediaArtifactBlob = await this._getData(/** @type {import('@zip.js/zip.js').Entry} */ (packedMediaArtifactEntry), new BlobWriter());
            } else {
                packedMediaArtifactBytes = await this._getData(/** @type {import('@zip.js/zip.js').Entry} */ (packedMediaArtifactEntry), new Uint8ArrayWriter());
            }
            packedMediaArtifactPreloadMs = Math.max(0, Date.now() - tPackedMediaReadStart);
            this._logImport(
                `packed media artifact preload ${packedMediaArtifactPreloadMs}ms bytes=${
                    packedMediaArtifactBytes instanceof Uint8Array ?
                        packedMediaArtifactBytes.byteLength :
                        (packedMediaArtifactBlob instanceof Blob ? packedMediaArtifactBlob.size : 0)
                }`,
            );
        }
        const useCompressedSharedGlossaryArtifact = termArtifactManifest?.termContentMode === RAW_TERM_CONTENT_COMPRESSED_SHARED_GLOSSARY_DICT_NAME;
        if (
            sharedGlossaryArtifactBytes instanceof Uint8Array &&
            sharedGlossaryCompression === 'zstd' &&
            !useCompressedSharedGlossaryArtifact
        ) {
            try {
                await initializeTermContentZstd();
                const defaultHeapSize = (
                    Number.isInteger(sharedGlossaryUncompressedLength) &&
                    /** @type {number} */ (sharedGlossaryUncompressedLength) > 0
                ) ?
                    /** @type {number} */ (sharedGlossaryUncompressedLength) :
                    (sharedGlossaryArtifactBytes.byteLength * 16);
                sharedGlossaryArtifactBytes = zstdDecompress(sharedGlossaryArtifactBytes, {defaultHeapSize});
            } catch (e) {
                logTermContentZstdError(e);
                throw e;
            }
        }
        const usePackedTermArtifact = (
            packedTermArtifactBytes !== null &&
            termArtifactManifest !== null &&
            termArtifactManifest.termBanksByArtifact.size > 0
        );
        const packedTermArtifactManifest = usePackedTermArtifact ? termArtifactManifest : null;
        const totalArtifactTermRows = (
            termArtifactManifest !== null
        ) ?
            [...termArtifactManifest.termBanksByArtifact.values()].reduce((sum, value) => (
                sum + (Number.isInteger(value.rows) ? /** @type {number} */ (value.rows) : 0)
            ), 0) :
            0;
        const expectedTermContentImportBytes = (
            effectiveTermContentStorageMode === 'raw-bytes'
        ) ?
            this._estimateExpectedTermContentImportBytes(
                packedTermArtifactBytes,
                sharedGlossaryArtifactBytes,
                termArtifactManifest,
                preloadedTermArtifactBytes,
                termArtifactFiles,
            ) :
            null;
        dictionaryDatabase.setImportOptimizationFlags(
            expectedTermContentImportBytes === null ?
                {termContentStorageMode: effectiveTermContentStorageMode} :
                {
                    termContentStorageMode: effectiveTermContentStorageMode,
                    expectedTermContentImportBytes,
                },
        );
        /** @type {Array<import('@zip.js/zip.js').Entry|{filename: string}>} */
        const activeTermFiles = packedTermArtifactManifest !== null ?
            this._createPackedTermArtifactFiles(packedTermArtifactManifest.termBanksByArtifact) :
            (useTermArtifactFiles ? termArtifactFiles : termFiles);
        this._logImport(
            `banks terms=${activeTermFiles.length} termArtifacts=${termArtifactFiles.length} ` +
            `termMeta=${termMetaFiles.length} kanji=${kanjiFiles.length} kanjiMeta=${kanjiMetaFiles.length} tags=${tagFiles.length} ` +
            `useArtifactTerms=${String(useTermArtifactFiles || usePackedTermArtifact)} packedTermArtifact=${String(packedTermArtifactBytes !== null)} ` +
            `prunedArtifactAux=${String(usePrunedArtifactAuxFastPath)} ` +
            `preloadedTermArtifacts=${String(preloadedTermArtifactBytes !== null)} ` +
            `expectedTermContentImportBytes=${String(expectedTermContentImportBytes)}`,
        );

        // Load and import data
        const prefixWildcardsSupported = !!details.prefixWildcardsSupported;

        // Term files are doubled due to media importing.
        // This transition enters "Importing data".
        this._progressNextStep((activeTermFiles.length * 2 + termMetaFiles.length + kanjiFiles.length + kanjiMetaFiles.length + tagFiles.length) * bulkAddProgressAllowance);
        const previousProgressInterval = this._progressMinIntervalMs;
        this._setProgressInterval(100);

        let importSuccess = false;
        let preloadedStyles = null;

        /** @type {import('dictionary-importer').SummaryCounts} */
        const counts = {
            terms: {total: 0},
            termMeta: {total: 0},
            kanji: {total: 0},
            kanjiMeta: {total: 0},
            tagMeta: {total: 0},
            media: {total: 0},
        };

        const yomitanVersion = details.yomitanVersion;
        /** @type {import('dictionary-importer').SummaryDetails} */
        let summaryDetails = {prefixWildcardsSupported, counts, styles: '', yomitanVersion, importSuccess};

        let summary = this._createSummary(dictionaryTitle, version, index, summaryDetails);
        if (sourceDictionaryTitle !== dictionaryTitle) {
            summary.sourceTitle = sourceDictionaryTitle;
        }
        if (
            typeof details.dictionaryTitleOverride === 'string' &&
            /\[update-staging [^\]]+\]$/.test(details.dictionaryTitleOverride) &&
            typeof details.updateSessionToken === 'string' &&
            details.updateSessionToken.trim().length > 0
        ) {
            summary.transientUpdateStage = 'update-staging';
            summary.updateSessionToken = details.updateSessionToken.trim();
        }
        const dictionarySummaryPrimaryKey = await dictionaryDatabase.addWithResult('dictionaries', summary);
        let styles = '';
        let importFailed = false;
        let sharedGlossaryArtifactBaseOffset = 0;
        let sharedGlossaryArtifactAppendMs = 0;
        const tImportBanksStart = Date.now();

        const closeArchiveReader = async () => {
            if (archiveReader === null) { return; }
            try {
                await archiveReader.close();
            } finally {
                archiveReader = null;
            }
        };

        if (packedTermArtifactBytes !== null && usePrunedArtifactAuxFastPath && (!preserveCompressedMedia || this._skipImageMetadata)) {
            const stylesFile = fileMap.get('styles.css');
            if (typeof stylesFile !== 'undefined') {
                preloadedStyles = await this._getData(stylesFile, new TextWriter());
            }
            fileMap.clear();
            await closeArchiveReader();
            this._logImport('released source archive after packed artifact preload');
        }

        try {
            await dictionaryDatabase.startBulkImport();
            if (sharedGlossaryArtifactBytes instanceof Uint8Array && sharedGlossaryArtifactBytes.byteLength > 0) {
                const tSharedGlossaryAppendStart = Date.now();
                const sharedGlossarySpan = await dictionaryDatabase.appendRawSharedGlossaryArtifact(
                    dictionaryTitle,
                    sharedGlossaryArtifactBytes,
                    useCompressedSharedGlossaryArtifact ? RAW_TERM_CONTENT_COMPRESSED_SHARED_GLOSSARY_DICT_NAME : RAW_TERM_CONTENT_SHARED_GLOSSARY_DICT_NAME,
                    Number.isInteger(sharedGlossaryUncompressedLength) ? /** @type {number} */ (sharedGlossaryUncompressedLength) : sharedGlossaryArtifactBytes.byteLength,
                );
                if (!useCompressedSharedGlossaryArtifact) {
                    sharedGlossaryArtifactBaseOffset = sharedGlossarySpan.offset;
                }
                sharedGlossaryArtifactAppendMs = Math.max(0, Date.now() - tSharedGlossaryAppendStart);
            }
            const hasArchiveImageMediaFiles = this._archiveHasImageMediaFiles(fileMap);
            const hasUsableArtifactMediaFiles = (
                termArtifactManifest?.includesMediaFiles === true &&
                termArtifactManifest.packedMediaEntries.length > 0
            );
            const useMediaPipeline = (
                !this._skipMediaImport &&
                (hasArchiveImageMediaFiles || hasUsableArtifactMediaFiles)
            );
            /** @type {Array<{path: string, mediaType: string, packedOffset?: number, packedLength?: number, compressionMethod?: number, uncompressedLength?: number, fileEntry?: import('@zip.js/zip.js').Entry}>} */
            const artifactArchiveImageFileEntries = (() => {
                if (
                    !useMediaPipeline ||
                    !(useTermArtifactFiles || usePackedTermArtifact) ||
                    termArtifactManifest?.includesMediaFiles !== true
                ) {
                    return [];
                }
                if (
                    termArtifactManifest !== null &&
                    termArtifactManifest.packedMediaEntries.length > 0 &&
                    (packedMediaArtifactBytes instanceof Uint8Array || packedMediaArtifactBlob instanceof Blob)
                ) {
                    return termArtifactManifest.packedMediaEntries;
                }
                return [...fileMap.entries()]
                    .map(([path, fileEntry]) => {
                        const mediaType = getImageMediaTypeFromFileName(path);
                        if (mediaType === null) {
                            return null;
                        }
                        return {path, mediaType, fileEntry};
                    })
                    .filter((value) => value !== null);
            })();
            const artifactDirectMediaImport = artifactArchiveImageFileEntries.length > 0;
            const useTermMediaRequirements = useMediaPipeline && !artifactDirectMediaImport;
            const useExternalPackedMediaStorage = (
                artifactDirectMediaImport &&
                (packedMediaArtifactBytes instanceof Uint8Array || packedMediaArtifactBlob instanceof Blob) &&
                artifactArchiveImageFileEntries.length >= 2048
            );
            this._logImport(
                `media pipeline enabled=${String(useMediaPipeline)} skipMediaImport=${String(this._skipMediaImport)} ` +
                `hasArchiveImageMediaFiles=${String(hasArchiveImageMediaFiles)} ` +
                `hasUsableArtifactMediaFiles=${String(hasUsableArtifactMediaFiles)} ` +
                `artifactDirectMediaImport=${String(artifactDirectMediaImport)} ` +
                `externalPackedMediaStorage=${String(useExternalPackedMediaStorage)}`,
            );
            const uniqueMediaPaths = useTermMediaRequirements ? new Set() : null;
            const termFileProgressAllowance = bulkAddProgressAllowance * 2;
            const step4ArtifactPreloadMs = (
                packedTermArtifactPreloadMs +
                packedMediaArtifactPreloadMs +
                termArtifactPreloadMs +
                sharedGlossaryArtifactPreloadMs
            );
            let step4ArtifactReadBytesMs = 0;
            let step4ArtifactMetadataRebaseMs = 0;
            let step4ArtifactMetadataAppendMs = 0;
            const step4SharedGlossaryAppendMs = sharedGlossaryArtifactAppendMs;
            /**
             * @returns {Promise<void>}
             */
            const importArtifactArchiveMediaFiles = async () => {
                if (!artifactDirectMediaImport) {
                    return;
                }
                /** @type {import('dictionary-importer').ImportRequirementContext} */
                const context = {fileMap, media: new Map()};
                /** @type {import('dictionary-database').DatabaseTermEntry} */
                const syntheticEntry = {
                    dictionary: dictionaryTitle,
                    expression: '',
                    reading: '',
                    definitionTags: '',
                    rules: '',
                    score: 0,
                    glossary: EMPTY_TERM_GLOSSARY,
                };
                const chunkSize = Math.max(this._mediaResolutionConcurrency * 128, 512);
                const skipArtifactImageMetadata = this._skipImageMetadata || artifactArchiveImageFileEntries.length >= 4096;
                const useArtifactMediaManifestFastPath = (
                    skipArtifactImageMetadata &&
                    artifactArchiveImageFileEntries.every(({
                        packedOffset,
                        packedLength,
                        compressionMethod,
                        uncompressedLength,
                    }) => (
                        Number.isInteger(packedOffset) &&
                        Number.isInteger(packedLength) &&
                        (!preserveCompressedMedia || (Number.isInteger(compressionMethod) && Number.isInteger(uncompressedLength)))
                    ))
                );
                let packedMediaBytesForDirectImport = packedMediaArtifactBytes;
                let packedMediaBlobForDirectImport = packedMediaArtifactBlob;
                const packedMediaBaseSpan = useExternalPackedMediaStorage ?
                    (
                        packedMediaBlobForDirectImport instanceof Blob ?
                            await dictionaryDatabase.appendMediaContentBlob(packedMediaBlobForDirectImport) :
                            await dictionaryDatabase.appendMediaContentBytes(/** @type {Uint8Array} */ (packedMediaBytesForDirectImport))
                    ) :
                    null;
                if (packedMediaBaseSpan !== null) {
                    await dictionaryDatabase.flushMediaContentImportWrites();
                    if (skipArtifactImageMetadata) {
                        packedMediaBytesForDirectImport = null;
                        packedMediaBlobForDirectImport = null;
                    }
                }
                for (let i = 0; i < artifactArchiveImageFileEntries.length; i += chunkSize) {
                    const chunkEntries = artifactArchiveImageFileEntries.slice(i, i + chunkSize);
                    const tMediaResolveStart = Date.now();
                    /** @type {import('dictionary-database').MediaDataArrayBufferContent[]} */
                    let media;
                    if (useArtifactMediaManifestFastPath && packedMediaBaseSpan !== null) {
                        const tMediaResolved = Date.now();
                        const tMediaWriteStart = Date.now();
                        await dictionaryDatabase.bulkAddExternalMediaManifestRows(
                            dictionaryTitle,
                            /** @type {Array<{path: string, mediaType: string, packedOffset: number, packedLength: number, compressionMethod?: number, uncompressedLength?: number}>} */ (chunkEntries),
                            packedMediaBaseSpan.offset,
                            preserveCompressedMedia,
                        );
                        const tMediaWriteEnd = Date.now();
                        step4TimingBreakdown.mediaResolveMs += Math.max(0, tMediaResolved - tMediaResolveStart);
                        step4TimingBreakdown.mediaWriteMs += Math.max(0, tMediaWriteEnd - tMediaWriteStart);
                        counts.media.total += chunkEntries.length;
                        this._logImport(
                            `artifact media batch ${i}-${i + chunkEntries.length}/${artifactArchiveImageFileEntries.length} ` +
                            `rows=${chunkEntries.length} resolve=${tMediaResolved - tMediaResolveStart}ms ` +
                            `write=${tMediaWriteEnd - tMediaWriteStart}ms`,
                        );
                        continue;
                    } else if (useArtifactMediaManifestFastPath) {
                        media = new Array(chunkEntries.length);
                        for (let j = 0, jj = chunkEntries.length; j < jj; ++j) {
                            const {path, mediaType, packedOffset, packedLength, compressionMethod, uncompressedLength} = chunkEntries[j];
                            const start = /** @type {number} */ (packedOffset);
                            const end = start + /** @type {number} */ (packedLength);
                            const bytes = /** @type {Uint8Array} */ (packedMediaBytesForDirectImport).subarray(start, end);
                            const content = (
                                bytes.byteOffset === 0 &&
                                bytes.byteLength === bytes.buffer.byteLength
                            ) ?
                                bytes.buffer :
                                bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
                            media[j] = {
                                dictionary: dictionaryTitle,
                                path,
                                mediaType,
                                width: 0,
                                height: 0,
                                content,
                                contentOffset: 0,
                                contentLength: /** @type {number} */ (packedLength),
                                contentCompressionMethod: preserveCompressedMedia ? /** @type {number} */ (compressionMethod) : ZIP_COMPRESSION_METHOD_STORE,
                                contentUncompressedLength: preserveCompressedMedia ? /** @type {number} */ (uncompressedLength) : /** @type {number} */ (packedLength),
                            };
                        }
                    } else {
                        await this._runWithConcurrencyLimit(chunkEntries, this._mediaResolutionConcurrency, async ({path, mediaType, packedOffset, packedLength, compressionMethod, uncompressedLength, fileEntry}) => {
                            if (
                                !skipArtifactImageMetadata &&
                                !(
                                    Number.isInteger(packedOffset) &&
                                    Number.isInteger(packedLength) &&
                                    (
                                        !preserveCompressedMedia ||
                                        (Number.isInteger(compressionMethod) && Number.isInteger(uncompressedLength))
                                    )
                                )
                            ) {
                                await this._getImageMedia(context, path, syntheticEntry);
                                return;
                            }
                            if (context.media.has(path)) {
                                return;
                            }
                            /** @type {ArrayBuffer} */
                            let content;
                            let width = 0;
                            let height = 0;
                            let contentOffset = 0;
                            let contentLength = 0;
                            let contentCompressionMethod = ZIP_COMPRESSION_METHOD_STORE;
                            let contentUncompressedLength = 0;
                            if (
                                packedMediaBaseSpan !== null &&
                                Number.isInteger(packedOffset) &&
                                Number.isInteger(packedLength)
                            ) {
                                content = EMPTY_ARRAY_BUFFER;
                                contentOffset = packedMediaBaseSpan.offset + /** @type {number} */ (packedOffset);
                                contentLength = /** @type {number} */ (packedLength);
                                if (preserveCompressedMedia) {
                                    contentCompressionMethod = Number.isInteger(compressionMethod) ? /** @type {number} */ (compressionMethod) : ZIP_COMPRESSION_METHOD_STORE;
                                    contentUncompressedLength = Number.isInteger(uncompressedLength) ? /** @type {number} */ (uncompressedLength) : contentLength;
                                }
                            } else if (
                                packedMediaBytesForDirectImport instanceof Uint8Array &&
                                Number.isInteger(packedOffset) &&
                                Number.isInteger(packedLength)
                            ) {
                                const start = /** @type {number} */ (packedOffset);
                                const end = start + /** @type {number} */ (packedLength);
                                const bytes = packedMediaBytesForDirectImport.subarray(start, end);
                                content = (
                                    bytes.byteOffset === 0 &&
                                    bytes.byteLength === bytes.buffer.byteLength
                                ) ?
                                    bytes.buffer :
                                    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
                                if (preserveCompressedMedia) {
                                    contentCompressionMethod = Number.isInteger(compressionMethod) ? /** @type {number} */ (compressionMethod) : ZIP_COMPRESSION_METHOD_STORE;
                                    contentUncompressedLength = Number.isInteger(uncompressedLength) ? /** @type {number} */ (uncompressedLength) : bytes.byteLength;
                                }
                            } else {
                                const file = fileEntry ?? fileMap.get(path);
                                if (typeof file === 'undefined') {
                                    throw new Error(`Could not find image at path ${JSON.stringify(path)} in ${dictionaryTitle}`);
                                }
                                const bytes = await this._getData(file, new Uint8ArrayWriter());
                                content = (
                                    bytes.byteOffset === 0 &&
                                    bytes.byteLength === bytes.buffer.byteLength
                                ) ?
                                    bytes.buffer :
                                    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
                            }
                            if (!skipArtifactImageMetadata) {
                                try {
                                    let metadataContent = content;
                                    if (preserveCompressedMedia && contentCompressionMethod !== ZIP_COMPRESSION_METHOD_STORE) {
                                        const metadataFile = fileEntry ?? fileMap.get(path);
                                        if (typeof metadataFile === 'undefined') {
                                            throw new Error(`Could not find image metadata source at path ${JSON.stringify(path)} in ${dictionaryTitle}`);
                                        }
                                        const metadataBytes = await this._getData(metadataFile, new Uint8ArrayWriter());
                                        metadataContent = (
                                            metadataBytes.byteOffset === 0 &&
                                            metadataBytes.byteLength === metadataBytes.buffer.byteLength
                                        ) ?
                                            metadataBytes.buffer :
                                            metadataBytes.buffer.slice(metadataBytes.byteOffset, metadataBytes.byteOffset + metadataBytes.byteLength);
                                    }
                                    ({content: _ignoredContent, width, height} = await this._mediaLoader.getImageDetails(metadataContent, mediaType));
                                } catch (_) {
                                    width = 0;
                                    height = 0;
                                }
                            }
                            if (!skipArtifactImageMetadata) {
                                this._imageMetadataByPath.set(path, {mediaType, width, height});
                            }
                            context.media.set(path, {
                                dictionary: dictionaryTitle,
                                path,
                                mediaType,
                                width,
                                height,
                                content,
                                contentOffset,
                                contentLength,
                                contentCompressionMethod,
                                contentUncompressedLength,
                            });
                        });
                        media = [...context.media.values()];
                        context.media.clear();
                    }
                    const tMediaResolved = Date.now();
                    const tMediaWriteStart = Date.now();
                    await (useExternalPackedMediaStorage ?
                        dictionaryDatabase.bulkAddExternalMediaRows(media) :
                        bulkAdd('media', media, {trackProgress: false}));
                    const tMediaWriteEnd = Date.now();
                    step4TimingBreakdown.mediaResolveMs += Math.max(0, tMediaResolved - tMediaResolveStart);
                    step4TimingBreakdown.mediaWriteMs += Math.max(0, tMediaWriteEnd - tMediaWriteStart);
                    counts.media.total += media.length;
                    this._logImport(
                        `artifact media batch ${i}-${i + chunkEntries.length}/${artifactArchiveImageFileEntries.length} ` +
                        `rows=${media.length} resolve=${tMediaResolved - tMediaResolveStart}ms ` +
                        `write=${tMediaWriteEnd - tMediaWriteStart}ms`,
                    );
                }
            };
            /**
             * @param {number} startIndex
             * @param {number} processedRows
             * @param {number} totalRows
             * @param {boolean} [finalize]
             */
            const updateStreamedTermFileProgress = (startIndex, processedRows, totalRows, finalize = false) => {
                const normalizedTotalRows = Number.isFinite(totalRows) ? Math.max(1, Math.trunc(totalRows)) : 1;
                const normalizedProcessedRows = finalize ?
                    normalizedTotalRows :
                    (Number.isFinite(processedRows) ? Math.max(0, Math.min(normalizedTotalRows, Math.trunc(processedRows))) : 0);
                const target = Math.max(
                    this._progressData.index,
                    startIndex + Math.floor((normalizedProcessedRows / normalizedTotalRows) * termFileProgressAllowance),
                );
                const upperBound = Math.min(this._progressData.count, startIndex + termFileProgressAllowance);
                const clampedTarget = Math.min(target, upperBound);
                if (clampedTarget > this._progressData.index) {
                    this._progressData.index = clampedTarget;
                    this._progress();
                }
            };
            /**
             * @param {{filename: string}} termFile
             * @param {import('dictionary-database').DatabaseTermEntry[]|{dictionary: string, rowCount: number, dictionaryTotalRows?: number, expressionBytesList: Uint8Array[], readingBytesList: Uint8Array[], readingEqualsExpressionList: boolean[], scoreList: number[], sequenceList: (number|undefined)[], contentBytesList: Uint8Array[], contentDictNameList: ((string|null)[]|null), uniformContentDictName?: string|null, termRecordPreinternedPlan?: import('./term-record-wasm-encoder.js').PreinternedTermRecordPlan|null}} termChunk
             * @param {import('dictionary-importer').ImportRequirement[]|null} requirements
             * @param {{processedRows: number, totalRows: number, chunkIndex: number, chunkCount: number}|null} streamedProgress
             * @param {number} streamedProgressStartIndex
             * @returns {Promise<{mediaResolveMs: number, mediaWriteMs: number, serializationMs: number, bulkAddTermsMs: number, contentAppendMs: number, termRecordBuildMs: number, termRecordEncodeMs: number, termRecordWriteMs: number, termsVtabInsertMs: number}>}
             */
            const processTermChunk = async (termFile, termChunk, requirements, streamedProgress = null, streamedProgressStartIndex = 0) => {
                const trackProgress = streamedProgress === null;
                /** @type {{dictionary: string, rowCount: number, dictionaryTotalRows?: number, expressionBytesList: Uint8Array[], readingBytesList: Uint8Array[], readingEqualsExpressionList: boolean[], scoreList: number[], sequenceList: (number|undefined)[], contentBytesList: Uint8Array[], contentDictNameList: ((string|null)[]|null), uniformContentDictName?: string|null, termRecordPreinternedPlan?: import('./term-record-wasm-encoder.js').PreinternedTermRecordPlan|null}|null} */
                const directArtifactChunk = Array.isArray(termChunk) ? null : termChunk;
                /** @type {import('dictionary-database').DatabaseTermEntry[]} */
                const termList = Array.isArray(termChunk) ? termChunk : [];
                let mediaResolveMs = 0;
                let mediaWriteMs = 0;
                let serializationMs = 0;
                let bulkAddTermsMs = 0;
                let contentAppendMs = 0;
                let termRecordBuildMs = 0;
                let termRecordEncodeMs = 0;
                let termRecordWriteMs = 0;
                let termsVtabInsertMs = 0;
                if (directArtifactChunk !== null && useTermMediaRequirements) {
                    throw new Error('Direct artifact chunk import does not support media requirements');
                }

                if (useTermMediaRequirements && requirements !== null && uniqueMediaPaths !== null) {
                    /** @type {import('dictionary-importer').ImportRequirement[]} */
                    const alreadyAddedRequirements = [];
                    /** @type {import('dictionary-importer').ImportRequirement[]} */
                    const notAddedRequirements = [];
                    for (const requirement of requirements) {
                        const mediaPath = requirement.source.path;
                        if (uniqueMediaPaths.has(mediaPath)) {
                            alreadyAddedRequirements.push(requirement);
                            continue;
                        }
                        uniqueMediaPaths.add(mediaPath);
                        notAddedRequirements.push(requirement);
                    }

                    const tMediaResolveStart = Date.now();
                    const tResolveExisting = Date.now();
                    if (alreadyAddedRequirements.length > 0) {
                        /** @type {import('dictionary-importer').ImportRequirement[]} */
                        const unresolvedRequirements = [];
                        for (const requirement of alreadyAddedRequirements) {
                            if (!this._tryResolveRequirementFromCachedImageMetadata(requirement)) {
                                unresolvedRequirements.push(requirement);
                            }
                        }
                        if (unresolvedRequirements.length > 0) {
                            await this._resolveAsyncRequirements(unresolvedRequirements, fileMap);
                        }
                    }
                    const tResolveNew = Date.now();
                    /** @type {import('dictionary-database').MediaDataArrayBufferContent[]} */
                    let media = [];
                    if (notAddedRequirements.length > 0) {
                        ({media} = await this._resolveAsyncRequirements(notAddedRequirements, fileMap));
                    }
                    const tResolved = Date.now();
                    mediaResolveMs += Math.max(0, tResolved - tMediaResolveStart);
                    step4TimingBreakdown.mediaResolveMs += mediaResolveMs;
                    this._logImport(
                        `term file ${termFile.filename}: resolve existing=${alreadyAddedRequirements.length} ` +
                        `${tResolveNew - tResolveExisting}ms new=${notAddedRequirements.length} ` +
                        `${tResolved - tResolveNew}ms`,
                    );
                    this._logImport(`term file ${termFile.filename}: requirements=${requirements.length} newMedia=${media.length}`);
                    const tMediaWriteStart = Date.now();
                    await bulkAdd('media', media, {trackProgress});
                    const tMediaWriteEnd = Date.now();
                    mediaWriteMs += Math.max(0, tMediaWriteEnd - tMediaWriteStart);
                    step4TimingBreakdown.mediaWriteMs += mediaWriteMs;
                    counts.media.total += media.length;
                    this._logImport(`term file ${termFile.filename}: media write rows=${media.length} elapsed=${tMediaWriteEnd - tMediaWriteStart}ms`);

                    if (trackProgress) { this._progress(); }
                    media = [];
                }

                if (useTermMediaRequirements) {
                    const tSerializationStart = Date.now();
                    this._prepareTermImportSerialization(termList, enableTermEntryContentDedup);
                    serializationMs += Math.max(0, Date.now() - tSerializationStart);
                    step4TimingBreakdown.termSerializationMs += serializationMs;
                }
                const tTermsWriteStart = Date.now();
                await (directArtifactChunk !== null ?
                    dictionaryDatabase.bulkAddArtifactTermsChunk(directArtifactChunk) :
                    bulkAdd('terms', termList, {trackProgress}));
                const tTermsWriteEnd = Date.now();
                bulkAddTermsMs += Math.max(0, tTermsWriteEnd - tTermsWriteStart);
                if (directArtifactChunk !== null) {
                    directArtifactChunk.expressionBytesList = [];
                    directArtifactChunk.readingBytesList = [];
                    directArtifactChunk.readingEqualsExpressionList = new Uint8Array(0);
                    directArtifactChunk.scoreList = new Int32Array(0);
                    directArtifactChunk.sequenceList = new Int32Array(0);
                    directArtifactChunk.contentBytesList = [];
                    directArtifactChunk.contentHash1List = new Uint32Array(0);
                    directArtifactChunk.contentHash2List = new Uint32Array(0);
                    if (Array.isArray(directArtifactChunk.contentDictNameList)) {
                        directArtifactChunk.contentDictNameList.length = 0;
                    }
                    directArtifactChunk.termRecordPreinternedPlan = null;
                }
                const bulkAddTermsMetrics = dictionaryDatabase.getLastBulkAddTermsMetrics();
                if (bulkAddTermsMetrics !== null) {
                    ({
                        contentAppendMs,
                        termRecordBuildMs,
                        termRecordEncodeMs,
                        termRecordWriteMs,
                        termsVtabInsertMs,
                    } = bulkAddTermsMetrics);
                }
                step4TimingBreakdown.bulkAddTermsMs += bulkAddTermsMs;
                const rowCount = directArtifactChunk?.rowCount ?? termList.length;
                counts.terms.total += rowCount;
                this._logImport(`term file ${termFile.filename}: terms write rows=${rowCount} elapsed=${tTermsWriteEnd - tTermsWriteStart}ms`);

                if (trackProgress) {
                    this._progress();
                } else if (streamedProgress !== null) {
                    updateStreamedTermFileProgress(streamedProgressStartIndex, streamedProgress.processedRows, streamedProgress.totalRows);
                }
                return {
                    mediaResolveMs,
                    mediaWriteMs,
                    serializationMs,
                    bulkAddTermsMs,
                    contentAppendMs,
                    termRecordBuildMs,
                    termRecordEncodeMs,
                    termRecordWriteMs,
                    termsVtabInsertMs,
                };
            };
            await importArtifactArchiveMediaFiles();
            if (useExternalPackedMediaStorage && this._skipImageMetadata) {
                packedMediaArtifactBytes = null;
                packedMediaArtifactBlob = null;
            }
            for (let termFileIndex = 0; termFileIndex < activeTermFiles.length; ++termFileIndex) {
                const termFile = activeTermFiles[termFileIndex];
                const tTermFile = Date.now();
                const streamedProgressStartIndex = this._progressData.index;
                let streamedImportCompleted = false;
                let termParseAlreadyAccounted = false;
                let streamChunkWorkMs = 0;
                let artifactBulkAddTermsMs = 0;
                let artifactSerializationMs = 0;
                let artifactMediaResolveMs = 0;
                let artifactMediaWriteMs = 0;
                let artifactContentAppendMs = 0;
                let artifactTermRecordBuildMs = 0;
                let artifactTermRecordEncodeMs = 0;
                let artifactTermRecordWriteMs = 0;
                let artifactTermsVtabInsertMs = 0;
                let artifactMetadataRebaseMs = 0;
                const tFastParseStart = Date.now();
                if ((useTermArtifactFiles || usePackedTermArtifact) && /\.mbtb$/i.test(termFile.filename)) {
                    const termArtifactFileEntry = /** @type {import('@zip.js/zip.js').Entry|undefined} */ (
                        termFile instanceof Object && 'getData' in termFile ? termFile : void 0
                    );
                    const tArtifactParseStart = Date.now();
                    const packedTermBankMeta = termArtifactManifest?.termBanksByArtifact.get(termFile.filename) ?? null;
                    if (this._streamTermArtifactChunks) {
                        /**
                         * @param {import('dictionary-database').DatabaseTermEntry[]} termListChunk
                         * @param {import('dictionary-importer').ImportRequirement[]|null} requirementsChunk
                         * @param {{processedRows: number, totalRows: number, chunkIndex: number, chunkCount: number}} streamProgress
                         * @returns {Promise<void>}
                         */
                        const directArtifactChunkImport = !useTermMediaRequirements;
                        /**
                         * @param {import('dictionary-database').DatabaseTermEntry[]|{dictionary: string, rowCount: number, expressionBytesList: Uint8Array[], readingBytesList: Uint8Array[], readingEqualsExpressionList: boolean[], scoreList: number[], sequenceList: (number|undefined)[], contentBytesList: Uint8Array[], contentHash1List: number[], contentHash2List: number[], contentDictNameList: (string|null)[], uniformContentDictName?: string|null, termRecordPreinternedPlan?: import('./term-record-wasm-encoder.js').PreinternedTermRecordPlan|null}} termListChunk
                         * @param {import('dictionary-importer').ImportRequirement[]|null} requirementsChunk
                         * @param {{processedRows: number, totalRows: number, chunkIndex: number, chunkCount: number}} streamProgress
                         * @returns {Promise<void>}
                         */
                        const onArtifactChunk = async (termListChunk, requirementsChunk, streamProgress) => {
                            const tChunkWorkStart = Date.now();
                            const chunkMetrics = await processTermChunk(termFile, termListChunk, requirementsChunk, streamProgress, streamedProgressStartIndex);
                            artifactBulkAddTermsMs += chunkMetrics.bulkAddTermsMs;
                            artifactSerializationMs += chunkMetrics.serializationMs;
                            artifactMediaResolveMs += chunkMetrics.mediaResolveMs;
                            artifactMediaWriteMs += chunkMetrics.mediaWriteMs;
                            artifactContentAppendMs += chunkMetrics.contentAppendMs;
                            step4ArtifactMetadataAppendMs += chunkMetrics.contentAppendMs;
                            artifactTermRecordBuildMs += chunkMetrics.termRecordBuildMs;
                            artifactTermRecordEncodeMs += chunkMetrics.termRecordEncodeMs;
                            artifactTermRecordWriteMs += chunkMetrics.termRecordWriteMs;
                            artifactTermsVtabInsertMs += chunkMetrics.termsVtabInsertMs;
                            streamChunkWorkMs += Math.max(0, Date.now() - tChunkWorkStart);
                            if (Array.isArray(termListChunk)) {
                                termListChunk.length = 0;
                            }
                        };
                        if (packedTermArtifactBytes !== null && packedTermBankMeta !== null) {
                            const packedSlice = packedTermArtifactBytes.subarray(
                                packedTermBankMeta.packedOffset,
                                packedTermBankMeta.packedOffset + packedTermBankMeta.packedLength,
                            );
                            await this._decodeTermBankArtifactBytes(packedSlice, termFile.filename, dictionaryTitle, prefixWildcardsSupported, effectiveTermContentStorageMode, onArtifactChunk, 0, sharedGlossaryArtifactBaseOffset, directArtifactChunkImport, totalArtifactTermRows);
                        } else if (preloadedTermArtifactBytes !== null) {
                            const preloadedBytes = preloadedTermArtifactBytes.get(termFile.filename);
                            if (typeof preloadedBytes === 'undefined') {
                                throw new Error(`Missing preloaded term artifact bytes for '${termFile.filename}'`);
                            }
                            await this._decodeTermBankArtifactBytes(preloadedBytes, termFile.filename, dictionaryTitle, prefixWildcardsSupported, effectiveTermContentStorageMode, onArtifactChunk, 0, sharedGlossaryArtifactBaseOffset, directArtifactChunkImport, totalArtifactTermRows);
                        } else {
                            if (typeof termArtifactFileEntry === 'undefined') {
                                throw new Error(`Missing zip entry for term artifact '${termFile.filename}'`);
                            }
                            await this._readTermBankArtifactFile(
                                termArtifactFileEntry,
                                dictionaryTitle,
                                prefixWildcardsSupported,
                                effectiveTermContentStorageMode,
                                onArtifactChunk,
                                sharedGlossaryArtifactBaseOffset,
                                directArtifactChunkImport,
                                totalArtifactTermRows,
                            );
                        }
                        const totalArtifactReadMs = Math.max(0, Date.now() - tArtifactParseStart);
                        lastArtifactTermBankReadProfile = this._lastArtifactTermBankReadProfile ?? null;
                        if (lastArtifactTermBankReadProfile !== null) {
                            step4ArtifactReadBytesMs += Math.max(0, lastArtifactTermBankReadProfile.readBytesMs ?? 0);
                            step4ArtifactMetadataRebaseMs += Math.max(0, lastArtifactTermBankReadProfile.metadataRebaseMs ?? 0);
                            artifactMetadataRebaseMs += Math.max(0, lastArtifactTermBankReadProfile.metadataRebaseMs ?? 0);
                        }
                        step4TimingBreakdown.termParseMs += Math.max(0, totalArtifactReadMs - streamChunkWorkMs);
                        termParseAlreadyAccounted = true;
                    } else {
                        let termReadResult;
                        if (packedTermArtifactBytes !== null && packedTermBankMeta !== null) {
                            const packedSlice = packedTermArtifactBytes.subarray(
                                packedTermBankMeta.packedOffset,
                                packedTermBankMeta.packedOffset + packedTermBankMeta.packedLength,
                            );
                            termReadResult = await this._decodeTermBankArtifactBytes(packedSlice, termFile.filename, dictionaryTitle, prefixWildcardsSupported, effectiveTermContentStorageMode, void 0, 0, sharedGlossaryArtifactBaseOffset, false, totalArtifactTermRows);
                        } else if (preloadedTermArtifactBytes !== null) {
                            const preloadedBytes = preloadedTermArtifactBytes.get(termFile.filename);
                            if (typeof preloadedBytes === 'undefined') {
                                throw new Error(`Missing preloaded term artifact bytes for '${termFile.filename}'`);
                            }
                            termReadResult = await this._decodeTermBankArtifactBytes(preloadedBytes, termFile.filename, dictionaryTitle, prefixWildcardsSupported, effectiveTermContentStorageMode, void 0, 0, sharedGlossaryArtifactBaseOffset, false, totalArtifactTermRows);
                        } else {
                            if (typeof termArtifactFileEntry === 'undefined') {
                                throw new Error(`Missing zip entry for term artifact '${termFile.filename}'`);
                            }
                            termReadResult = await this._readTermBankArtifactFile(
                                termArtifactFileEntry,
                                dictionaryTitle,
                                prefixWildcardsSupported,
                                effectiveTermContentStorageMode,
                                void 0,
                                sharedGlossaryArtifactBaseOffset,
                                false,
                                totalArtifactTermRows,
                            );
                        }
                        lastArtifactTermBankReadProfile = this._lastArtifactTermBankReadProfile ?? null;
                        if (lastArtifactTermBankReadProfile !== null) {
                            step4ArtifactReadBytesMs += Math.max(0, lastArtifactTermBankReadProfile.readBytesMs ?? 0);
                            step4ArtifactMetadataRebaseMs += Math.max(0, lastArtifactTermBankReadProfile.metadataRebaseMs ?? 0);
                            artifactMetadataRebaseMs += Math.max(0, lastArtifactTermBankReadProfile.metadataRebaseMs ?? 0);
                        }
                        step4TimingBreakdown.termParseMs += Math.max(0, Date.now() - tArtifactParseStart);
                        termParseAlreadyAccounted = true;
                        const chunkMetrics = await processTermChunk(termFile, termReadResult.termList, termReadResult.requirements);
                        artifactBulkAddTermsMs += chunkMetrics.bulkAddTermsMs;
                        artifactSerializationMs += chunkMetrics.serializationMs;
                        artifactMediaResolveMs += chunkMetrics.mediaResolveMs;
                        artifactMediaWriteMs += chunkMetrics.mediaWriteMs;
                        artifactContentAppendMs += chunkMetrics.contentAppendMs;
                        step4ArtifactMetadataAppendMs += chunkMetrics.contentAppendMs;
                        artifactTermRecordBuildMs += chunkMetrics.termRecordBuildMs;
                        artifactTermRecordEncodeMs += chunkMetrics.termRecordEncodeMs;
                        artifactTermRecordWriteMs += chunkMetrics.termRecordWriteMs;
                        artifactTermsVtabInsertMs += chunkMetrics.termsVtabInsertMs;
                    }
                    streamedImportCompleted = true;
                } else if (!this._disableTermBankWasmFastPath) {
                    try {
                        const termFileEntry = /** @type {import('@zip.js/zip.js').Entry} */ (termFile);
                        await this._readTermBankFileFast(
                            termFileEntry,
                            version,
                            dictionaryTitle,
                            prefixWildcardsSupported,
                            useTermMediaRequirements,
                            enableTermEntryContentDedup,
                            termContentStorageMode,
                            async (termListChunk, requirementsChunk, streamProgress) => {
                                const tChunkWorkStart = Date.now();
                                await processTermChunk(termFile, termListChunk, requirementsChunk, streamProgress, streamedProgressStartIndex);
                                streamChunkWorkMs += Math.max(0, Date.now() - tChunkWorkStart);
                                termListChunk.length = 0;
                                if (requirementsChunk !== null) {
                                    requirementsChunk.length = 0;
                                }
                            },
                        );
                        lastFastTermBankReadProfile = this._lastFastTermBankReadProfile ?? null;
                        streamedImportCompleted = true;
                    } catch (error) {
                        const e = toError(error);
                        this._logImport(`term file ${termFile.filename}: streaming fast path failed (${e.message}), using fallback parser`);
                    }
                } else {
                    this._logImport(`term file ${termFile.filename}: streaming wasm parser disabled by import flag`);
                }

                if (streamedImportCompleted) {
                    if (!termParseAlreadyAccounted) {
                        const totalFastReadMs = Math.max(0, Date.now() - tFastParseStart);
                        step4TimingBreakdown.termParseMs += Math.max(0, totalFastReadMs - streamChunkWorkMs);
                    }
                    if (lastFastTermBankReadProfile !== null) {
                        const parserProfile = lastFastTermBankReadProfile.parserProfile ?? {};
                        recordPhaseTiming(`term-file-fast-path:${termFile.filename}`, tFastParseStart, {
                            rows: lastFastTermBankReadProfile.totalRows ?? null,
                            chunkCount: lastFastTermBankReadProfile.chunkCount ?? null,
                            importerMaterializationMs: lastFastTermBankReadProfile.materializationMs ?? null,
                            importerChunkSinkMs: lastFastTermBankReadProfile.chunkSinkMs ?? null,
                            parserBufferSetupMs: parserProfile.bufferSetupMs ?? null,
                            parserAllocationMs: parserProfile.allocationMs ?? null,
                            parserCopyJsonMs: parserProfile.copyJsonMs ?? null,
                            parserParseBankMs: parserProfile.parseBankMs ?? null,
                            parserEncodeContentMs: parserProfile.encodeContentMs ?? null,
                            parserRowDecodeMs: parserProfile.rowDecodeMs ?? null,
                            parserChunkDispatchMs: parserProfile.chunkDispatchMs ?? null,
                            parserChunkSize: parserProfile.chunkSize ?? null,
                            parserMinimalDecode: parserProfile.minimalDecode ?? null,
                        });
                    } else if (lastArtifactTermBankReadProfile !== null) {
                        const artifactReadBytesMs = lastArtifactTermBankReadProfile.readBytesMs ?? null;
                        recordPhaseTiming(`term-file-artifact-path:${termFile.filename}`, tFastParseStart, {
                            rows: lastArtifactTermBankReadProfile.totalRows ?? null,
                            chunkCount: lastArtifactTermBankReadProfile.chunkCount ?? null,
                            rowChunkSize: lastArtifactTermBankReadProfile.rowChunkSize ?? null,
                            artifactReadBytesMs,
                            artifactDecodeRowsMs: lastArtifactTermBankReadProfile.decodeRowsMs ?? null,
                            artifactReverseRowsMs: lastArtifactTermBankReadProfile.reverseRowsMs ?? null,
                            readingEqualsExpressionCount: lastArtifactTermBankReadProfile.readingEqualsExpressionCount ?? null,
                            sequencePresentCount: lastArtifactTermBankReadProfile.sequencePresentCount ?? null,
                            zeroScoreCount: lastArtifactTermBankReadProfile.zeroScoreCount ?? null,
                            nonZeroScoreCount: lastArtifactTermBankReadProfile.nonZeroScoreCount ?? null,
                            sharedGlossaryRowCount: lastArtifactTermBankReadProfile.sharedGlossaryRowCount ?? null,
                            contentLengthExtendedCount: lastArtifactTermBankReadProfile.contentLengthExtendedCount ?? null,
                            avgContentLength: lastArtifactTermBankReadProfile.avgContentLength ?? null,
                            avgExpressionLength: lastArtifactTermBankReadProfile.avgExpressionLength ?? null,
                            avgReadingLength: lastArtifactTermBankReadProfile.avgReadingLength ?? null,
                            artifactBulkAddTermsMs,
                            artifactContentAppendMs,
                            artifactMetadataAppendMs: artifactContentAppendMs,
                            artifactTermRecordBuildMs,
                            artifactTermRecordEncodeMs,
                            artifactTermRecordWriteMs,
                            artifactTermsVtabInsertMs,
                            artifactMetadataRebaseMs,
                            artifactSerializationMs,
                            artifactMediaResolveMs,
                            artifactMediaWriteMs,
                            importerChunkSinkMs: lastArtifactTermBankReadProfile.chunkSinkMs ?? null,
                        });
                    }
                    updateStreamedTermFileProgress(streamedProgressStartIndex, 1, 1, true);
                } else {
                    const tTermParseStart = Date.now();
                    const termFileEntry = /** @type {import('@zip.js/zip.js').Entry} */ (termFile);
                    const termReadResult = await this._readTermBankFile(
                        termFileEntry,
                        version,
                        dictionaryTitle,
                        prefixWildcardsSupported,
                        useTermMediaRequirements,
                        enableTermEntryContentDedup,
                        termContentStorageMode,
                    );
                    step4TimingBreakdown.termParseMs += Math.max(0, Date.now() - tTermParseStart);
                    await processTermChunk(termFile, termReadResult.termList, termReadResult.requirements);
                }

                const termFileElapsedMs = Math.max(0, Date.now() - tTermFile);
                const termFileAccountedMs = (
                    artifactBulkAddTermsMs +
                    artifactSerializationMs +
                    artifactMediaResolveMs +
                    artifactMediaWriteMs +
                    streamChunkWorkMs
                );
                step4TimingBreakdown.termFileNonParseWriteMs += Math.max(0, termFileElapsedMs - termFileAccountedMs);
                this._logImport(`term file ${termFile.filename}: total elapsed=${termFileElapsedMs}ms`);
            }

            for (const termMetaFile of termMetaFiles) {
                const tTermMetaFile = Date.now();
                let termMetaList = await this._readFileSequence([termMetaFile], this._convertTermMetaBankEntry.bind(this), dictionaryTitle);
                step4TimingBreakdown.termMetaReadMs += Math.max(0, Date.now() - tTermMetaFile);

                const tMetaWriteStart = Date.now();
                await bulkAdd('termMeta', termMetaList);
                step4TimingBreakdown.bulkAddTagsMetaMs += Math.max(0, Date.now() - tMetaWriteStart);
                for (const [key, value] of Object.entries(this._getMetaCounts(termMetaList))) {
                    if (key in counts.termMeta) {
                        counts.termMeta[key] += value;
                    } else {
                        counts.termMeta[key] = value;
                    }
                }

                this._progress();
                this._logImport(`termMeta file ${termMetaFile.filename}: entries=${termMetaList.length} elapsed=${Date.now() - tTermMetaFile}ms`);

                termMetaList = [];
            }

            for (const kanjiFile of kanjiFiles) {
                const tKanjiFile = Date.now();
                let kanjiList = await (
                    version === 1 ?
                        this._readFileSequence([kanjiFile], this._convertKanjiBankEntryV1.bind(this), dictionaryTitle) :
                        this._readFileSequence([kanjiFile], this._convertKanjiBankEntryV3.bind(this), dictionaryTitle)
                );
                step4TimingBreakdown.kanjiReadMs += Math.max(0, Date.now() - tKanjiFile);

                const tKanjiWriteStart = Date.now();
                await bulkAdd('kanji', kanjiList);
                step4TimingBreakdown.bulkAddTagsMetaMs += Math.max(0, Date.now() - tKanjiWriteStart);
                counts.kanji.total += kanjiList.length;

                this._progress();
                this._logImport(`kanji file ${kanjiFile.filename}: entries=${kanjiList.length} elapsed=${Date.now() - tKanjiFile}ms`);

                kanjiList = [];
            }

            for (const kanjiMetaFile of kanjiMetaFiles) {
                const tKanjiMetaFile = Date.now();
                let kanjiMetaList = await this._readFileSequence([kanjiMetaFile], this._convertKanjiMetaBankEntry.bind(this), dictionaryTitle);
                step4TimingBreakdown.kanjiMetaReadMs += Math.max(0, Date.now() - tKanjiMetaFile);

                const tKanjiMetaWriteStart = Date.now();
                await bulkAdd('kanjiMeta', kanjiMetaList);
                step4TimingBreakdown.bulkAddTagsMetaMs += Math.max(0, Date.now() - tKanjiMetaWriteStart);
                for (const [key, value] of Object.entries(this._getMetaCounts(kanjiMetaList))) {
                    if (key in counts.kanjiMeta) {
                        counts.kanjiMeta[key] += value;
                    } else {
                        counts.kanjiMeta[key] = value;
                    }
                }

                this._progress();
                this._logImport(`kanjiMeta file ${kanjiMetaFile.filename}: entries=${kanjiMetaList.length} elapsed=${Date.now() - tKanjiMetaFile}ms`);

                kanjiMetaList = [];
            }

            for (const tagFile of tagFiles) {
                const tTagFile = Date.now();
                let tagList = await this._readFileSequence([tagFile], this._convertTagBankEntry.bind(this), dictionaryTitle);
                this._addOldIndexTags(index, tagList, dictionaryTitle);
                step4TimingBreakdown.tagReadMs += Math.max(0, Date.now() - tTagFile);

                const tTagWriteStart = Date.now();
                await bulkAdd('tagMeta', tagList);
                step4TimingBreakdown.bulkAddTagsMetaMs += Math.max(0, Date.now() - tTagWriteStart);
                counts.tagMeta.total += tagList.length;

                this._progress();
                this._logImport(`tag file ${tagFile.filename}: entries=${tagList.length} elapsed=${Date.now() - tTagFile}ms`);

                tagList = [];
            }
            const importDataBanksElapsedMs = Math.max(0, Date.now() - tImportBanksStart);
            const step4AccountedMs = (
                step4TimingBreakdown.termParseMs +
                step4TimingBreakdown.termSerializationMs +
                step4TimingBreakdown.bulkAddTermsMs +
                step4TimingBreakdown.bulkAddTagsMetaMs +
                step4TimingBreakdown.mediaResolveMs +
                step4TimingBreakdown.mediaWriteMs
            );
            recordPhaseTiming('import-data-banks', tImportBanksStart, {
                terms: counts.terms.total,
                termMeta: counts.termMeta.total,
                kanji: counts.kanji.total,
                kanjiMeta: counts.kanjiMeta.total,
                tagMeta: counts.tagMeta.total,
                media: counts.media.total,
                step4TermParseMs: Math.max(0, step4TimingBreakdown.termParseMs),
                step4TermSerializationMs: Math.max(0, step4TimingBreakdown.termSerializationMs),
                step4BulkAddTermsMs: Math.max(0, step4TimingBreakdown.bulkAddTermsMs),
                step4BulkAddTagsMetaMs: Math.max(0, step4TimingBreakdown.bulkAddTagsMetaMs),
                step4MediaResolveMs: Math.max(0, step4TimingBreakdown.mediaResolveMs),
                step4MediaWriteMs: Math.max(0, step4TimingBreakdown.mediaWriteMs),
                step4TermFileNonParseWriteMs: Math.max(0, step4TimingBreakdown.termFileNonParseWriteMs),
                step4ArtifactPreloadMs: Math.max(0, step4ArtifactPreloadMs),
                step4ArtifactReadBytesMs: Math.max(0, step4ArtifactReadBytesMs),
                step4ArtifactMetadataRebaseMs: Math.max(0, step4ArtifactMetadataRebaseMs),
                step4ArtifactMetadataAppendMs: Math.max(0, step4ArtifactMetadataAppendMs),
                step4SharedGlossaryAppendMs: Math.max(0, step4SharedGlossaryAppendMs),
                step4TermMetaReadMs: Math.max(0, step4TimingBreakdown.termMetaReadMs),
                step4KanjiReadMs: Math.max(0, step4TimingBreakdown.kanjiReadMs),
                step4KanjiMetaReadMs: Math.max(0, step4TimingBreakdown.kanjiMetaReadMs),
                step4TagReadMs: Math.max(0, step4TimingBreakdown.tagReadMs),
                step4AccountedMs: Math.max(0, step4AccountedMs),
                step4OtherMs: Math.max(0, importDataBanksElapsedMs - step4AccountedMs),
                useMediaPipeline,
                hasArchiveImageMediaFiles,
            });

            // Finalize dictionary descriptor
            this._progressNextStep(0);
            const tFinalizeDescriptorStart = Date.now();

            const stylesFileName = 'styles.css';
            if (typeof preloadedStyles === 'string') {
                styles = preloadedStyles;
                const cssErrors = this._validateCss(styles);
                if (cssErrors.length > 0) {
                    throw cssErrors[0];
                }
            } else {
                const stylesFile = fileMap.get(stylesFileName);
                if (typeof stylesFile !== 'undefined') {
                    styles = await this._getData(stylesFile, new TextWriter());
                    const cssErrors = this._validateCss(styles);
                    if (cssErrors.length > 0) {
                        throw cssErrors[0];
                    }
                }
            }
            recordPhaseTiming('finalize-descriptor', tFinalizeDescriptorStart, {
                hasStyles: styles.length > 0,
            });
        } catch (e) {
            importFailed = true;
            errors.push(toError(e));
            recordPhaseTiming('import-data-banks', tImportBanksStart, {
                ok: false,
            });
        } finally {
            await closeArchiveReader();
            this._setProgressInterval(previousProgressInterval);
            const tBulkFinalizationStart = Date.now();
            /** @type {{commitMs?: number, termContentEndImportSessionMs?: number, termRecordEndImportSessionMs?: number, termsVirtualTableSyncMs?: number, createIndexesMs?: number, createIndexesCheckpointCount?: number, cacheResetMs?: number, runtimePragmasMs?: number, totalMs?: number}|null} */
            let bulkFinalizationDetails = null;
            this._progressNextStep(20, false);
            this._progressData.index = 0;
            this._progress();
            try {
                bulkFinalizationDetails = await dictionaryDatabase.finishBulkImport((checkpointIndex, total) => {
                    this._progressData.index = Math.max(1, Math.floor((checkpointIndex / total) * this._progressData.count));
                    this._progress();
                    this._logImport(`bulk finalization ${checkpointIndex}/${total}`);
                });
            } catch (e) {
                importFailed = true;
                errors.push(toError(e));
            }
            this._progressData.index = this._progressData.count;
            this._progress();
            const bulkFinalizationPhaseDetails = {ok: !importFailed};
            if (bulkFinalizationDetails !== null) {
                Object.assign(bulkFinalizationPhaseDetails, bulkFinalizationDetails);
            }
            recordPhaseTiming('bulk-finalization', tBulkFinalizationStart, bulkFinalizationPhaseDetails);
            if (!importFailed) {
                try {
                    if (counts.terms.total >= 1_000_000) {
                        recordPhaseTiming('post-finalization-integrity-sample', Date.now(), {
                            skipped: true,
                            reason: 'large-dictionary',
                            termCount: counts.terms.total,
                        });
                    } else {
                        const directIntegrity = await dictionaryDatabase.debugSampleTermContentIntegrity(dictionaryTitle, 8);
                        recordPhaseTiming('post-finalization-integrity-sample', Date.now(), directIntegrity);
                    }
                } catch (e) {
                    recordPhaseTiming('post-finalization-integrity-sample', Date.now(), {
                        ok: false,
                        error: toError(e).message,
                    });
                }
            }
            dictionaryDatabase.setImportDebugLogging(false);
        }

        if (importFailed) {
            try {
                await dictionaryDatabase.deleteDictionary(dictionaryTitle, 1000, () => {});
            } catch (e) {
                const cleanupError = toError(e);
                errors.push(new Error(`Failed to clean up partially imported dictionary ${dictionaryTitle}: ${cleanupError.message}`));
            }
            return {
                result: null,
                errors,
                debug: {phaseTimings},
            };
        }

        importSuccess = true;
        summaryDetails = {prefixWildcardsSupported, counts, styles, yomitanVersion, importSuccess};
        summary = this._createSummary(dictionaryTitle, version, index, summaryDetails);
        if (sourceDictionaryTitle !== dictionaryTitle) {
            summary.sourceTitle = sourceDictionaryTitle;
        }
        if (
            typeof details.dictionaryTitleOverride === 'string' &&
            /\[update-staging [^\]]+\]$/.test(details.dictionaryTitleOverride) &&
            typeof details.updateSessionToken === 'string' &&
            details.updateSessionToken.trim().length > 0
        ) {
            summary.transientUpdateStage = 'update-staging';
            summary.updateSessionToken = details.updateSessionToken.trim();
        }
        const tSummaryUpdateStart = Date.now();
        await dictionaryDatabase.bulkUpdate('dictionaries', [{data: summary, primaryKey: dictionarySummaryPrimaryKey}], 0, 1);
        recordPhaseTiming('write-summary', tSummaryUpdateStart, {ok: true});
        this._logImport(`import done ${Date.now() - tImportStart}ms terms=${counts.terms.total} media=${counts.media.total}`);

        this._progress();
        return {
            result: summary,
            errors,
            debug: {phaseTimings},
        };
    }

    /**
     * @param {ArrayBuffer|Blob} archiveContent
     * @returns {Promise<{fileMap: import('dictionary-importer').ArchiveFileMap, zipReader: import('@zip.js/zip.js').ZipReader<import('@zip.js/zip.js').BlobReader|import('@zip.js/zip.js').Uint8ArrayReader>}>}
     */
    async _getFilesFromArchive(archiveContent) {
        const zipFileReader = (
            archiveContent instanceof Blob ?
                new BlobReader(archiveContent) :
                new Uint8ArrayReader(new Uint8Array(archiveContent))
        );
        const zipReader = /** @type {import('@zip.js/zip.js').ZipReader<import('@zip.js/zip.js').BlobReader|import('@zip.js/zip.js').Uint8ArrayReader>} */ (new ZipReader(zipFileReader));
        const zipEntries = await zipReader.getEntries();
        /** @type {import('dictionary-importer').ArchiveFileMap} */
        const fileMap = new Map();
        for (const entry of zipEntries) {
            fileMap.set(entry.filename, entry);
        }
        return {fileMap, zipReader};
    }

    /**
     * @param {import('dictionary-importer').ArchiveFileMap} fileMap
     * @returns {?string}
     */
    _findRedundantDirectories(fileMap) {
        let indexPath = '';
        for (const file of fileMap) {
            if (file[0].replace(/.*\//, '') === INDEX_FILE_NAME) {
                indexPath = file[0];
            }
        }
        const redundantDirectoriesRegex = new RegExp(`.*(?=${INDEX_FILE_NAME.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`);
        const redundantDirectories = indexPath.match(redundantDirectoriesRegex);
        return redundantDirectories ? redundantDirectories[0] : null;
    }

    /**
     * @param {import('dictionary-importer').ArchiveFileMap} fileMap
     * @returns {Promise<import('dictionary-data').Index>}
     * @throws {Error}
     */
    async _readAndValidateIndex(fileMap) {
        const indexFile = fileMap.get(INDEX_FILE_NAME);
        if (typeof indexFile === 'undefined') {
            const redundantDirectories = this._findRedundantDirectories(fileMap);
            if (redundantDirectories) {
                throw new Error('Dictionary index found nested in redundant directories: "' + redundantDirectories + '" when it must be in the archive\'s root directory');
            }
            throw new Error('No dictionary index found in archive');
        }
        const indexFile2 = /** @type {import('@zip.js/zip.js').Entry} */ (indexFile);

        const indexContent = await this._getData(indexFile2, new TextWriter());
        const index = /** @type {unknown} */ (parseJson(indexContent));
        const validIndex = /** @type {import('dictionary-data').Index} */ (index);

        const version = typeof validIndex.format === 'number' ? validIndex.format : validIndex.version;
        validIndex.version = version;

        const {title, revision} = validIndex;
        if (typeof version !== 'number' || !title || !revision) {
            throw new Error('Unrecognized dictionary format');
        }
        if (!SUPPORTED_INDEX_VERSIONS.has(version)) {
            throw new Error(`Unsupported dictionary format version: ${String(version)}`);
        }

        return validIndex;
    }

    /**
     * @param {import('dictionary-importer').ArchiveFileMap} fileMap
     * @returns {boolean}
     */
    _archiveHasImageMediaFiles(fileMap) {
        for (const fileName of fileMap.keys()) {
            if (getImageMediaTypeFromFileName(fileName) !== null) {
                return true;
            }
        }
        return false;
    }

    /**
     * @returns {import('dictionary-importer').ProgressData}
     */
    _createProgressData() {
        return {
            index: 0,
            count: 0,
        };
    }

    /** */
    _progressReset() {
        this._progressData = this._createProgressData();
        this._lastProgressTimestamp = 0;
        this._progress(true);
    }

    /**
     * @param {number} count
     * @param {boolean} [advanceStep]
     */
    _progressNextStep(count, advanceStep = true) {
        this._progressData.index = 0;
        this._progressData.count = count;
        this._progress(advanceStep);
    }

    /**
     * @param {number} intervalMs
     */
    _setProgressInterval(intervalMs) {
        const normalizedIntervalMs = Number.isFinite(intervalMs) ? Math.max(50, Math.trunc(intervalMs)) : this._progressMinIntervalMs;
        this._progressMinIntervalMs = normalizedIntervalMs;
    }

    /**
     * @param {boolean} nextStep
     */
    _progress(nextStep = false) {
        const now = Date.now();
        if (!nextStep && (now - this._lastProgressTimestamp) < this._progressMinIntervalMs) {
            return;
        }
        this._lastProgressTimestamp = now;
        this._onProgress({...this._progressData, nextStep});
    }

    /**
     * @param {string} message
     */
    _logImport(message) {
        if (!this._debugImportLogging) {
            return;
        }
        // eslint-disable-next-line no-console
        console.log(`[manabitan-import] ${message}`);
    }

    /**
     * @param {string} dictionaryTitle
     * @param {number} version
     * @param {import('dictionary-data').Index} index
     * @param {import('dictionary-importer').SummaryDetails} details
     * @returns {import('dictionary-importer').Summary}
     * @throws {Error}
     */
    _createSummary(dictionaryTitle, version, index, details) {
        const indexSequenced = index.sequenced;
        const {prefixWildcardsSupported, counts, styles, importSuccess} = details;
        /** @type {import('dictionary-importer').Summary} */
        const summary = {
            title: dictionaryTitle,
            revision: index.revision,
            sequenced: typeof indexSequenced === 'boolean' && indexSequenced,
            version,
            importDate: Date.now(),
            prefixWildcardsSupported,
            counts,
            styles,
            importSuccess,
        };

        const {minimumYomitanVersion, author, url, description, attribution, frequencyMode, isUpdatable, sourceLanguage, targetLanguage} = index;
        if (typeof minimumYomitanVersion === 'string') {
            if (details.yomitanVersion === '0.0.0.0') {
                // Running a development version of Yomitan
            } else if (compareRevisions(details.yomitanVersion, minimumYomitanVersion)) {
                throw new Error(`Dictionary is incompatible with this version of Yomitan (${details.yomitanVersion}; minimum required: ${minimumYomitanVersion})`);
            }
            summary.minimumYomitanVersion = minimumYomitanVersion;
        }
        if (typeof author === 'string') { summary.author = author; }
        if (typeof url === 'string') { summary.url = url; }
        if (typeof description === 'string') { summary.description = description; }
        if (typeof attribution === 'string') { summary.attribution = attribution; }
        if (typeof frequencyMode === 'string') { summary.frequencyMode = frequencyMode; }
        if (typeof sourceLanguage === 'string') { summary.sourceLanguage = sourceLanguage; }
        if (typeof targetLanguage === 'string') { summary.targetLanguage = targetLanguage; }
        if (typeof isUpdatable === 'boolean') {
            const {indexUrl, downloadUrl} = index;
            if (!isUpdatable || !this._validateUrl(indexUrl) || !this._validateUrl(downloadUrl)) {
                throw new Error('Invalid index data for updatable dictionary');
            }
            summary.isUpdatable = isUpdatable;
            summary.indexUrl = indexUrl;
            summary.downloadUrl = downloadUrl;
        }
        return summary;
    }

    /**
     * @param {string|undefined} string
     * @returns {boolean}
     */
    _validateUrl(string) {
        if (typeof string !== 'string') {
            return false;
        }

        let url;
        try {
            url = new URL(string);
        } catch (_) {
            return false;
        }

        return url.protocol === 'http:' || url.protocol === 'https:';
    }

    /**
     * @param {string} css
     * @returns {Error[]}
     */
    _validateCss(css) {
        return css ? [] : [new Error('No styles found')];
    }

    /**
     * @param {import('dictionary-data').TermGlossaryText|import('dictionary-data').TermGlossaryImage|import('dictionary-data').TermGlossaryStructuredContent} data
     * @param {import('dictionary-database').DatabaseTermEntry} entry
     * @param {import('dictionary-importer').ImportRequirement[]} requirements
     * @returns {import('dictionary-data').TermGlossary}
     * @throws {Error}
     */
    _formatDictionaryTermGlossaryObject(data, entry, requirements) {
        switch (data.type) {
            case 'text':
                return data.text;
            case 'image':
                return this._formatDictionaryTermGlossaryImage(data, entry, requirements);
            case 'structured-content':
                return this._formatStructuredContent(data, entry, requirements);
            default:
                throw new Error(`Unhandled data type: ${/** @type {import('core').SerializableObject} */ (data).type}`);
        }
    }

    /**
     * @param {import('dictionary-data').TermGlossaryImage} data
     * @param {import('dictionary-database').DatabaseTermEntry} entry
     * @param {import('dictionary-importer').ImportRequirement[]} requirements
     * @returns {import('dictionary-data').TermGlossaryImage}
     */
    _formatDictionaryTermGlossaryImage(data, entry, requirements) {
        if (this._skipMediaImport) {
            return {
                ...data,
                type: 'image',
            };
        }
        /** @type {import('dictionary-data').TermGlossaryImage} */
        const target = {
            type: 'image',
            path: '', // Will be populated during requirement resolution
        };
        requirements.push({type: 'image', target, source: data, entry});
        return target;
    }

    /**
     * @param {import('dictionary-data').TermGlossaryStructuredContent} data
     * @param {import('dictionary-database').DatabaseTermEntry} entry
     * @param {import('dictionary-importer').ImportRequirement[]} requirements
     * @returns {import('dictionary-data').TermGlossaryStructuredContent}
     */
    _formatStructuredContent(data, entry, requirements) {
        if (this._skipMediaImport) {
            return data;
        }
        const content = this._prepareStructuredContent(data.content, entry, requirements);
        return {
            type: 'structured-content',
            content,
        };
    }

    /**
     * @param {import('structured-content').Content} content
     * @param {import('dictionary-database').DatabaseTermEntry} entry
     * @param {import('dictionary-importer').ImportRequirement[]} requirements
     * @returns {import('structured-content').Content}
     */
    _prepareStructuredContent(content, entry, requirements) {
        if (typeof content === 'string' || !(typeof content === 'object' && content !== null)) {
            return content;
        }
        if (Array.isArray(content)) {
            for (let i = 0, ii = content.length; i < ii; ++i) {
                content[i] = this._prepareStructuredContent(content[i], entry, requirements);
            }
            return content;
        }
        const {tag} = content;
        switch (tag) {
            case 'img':
                return this._prepareStructuredContentImage(content, entry, requirements);
        }
        const childContent = content.content;
        if (typeof childContent !== 'undefined') {
            content.content = this._prepareStructuredContent(childContent, entry, requirements);
        }
        return content;
    }

    /**
     * @param {import('structured-content').ImageElement} content
     * @param {import('dictionary-database').DatabaseTermEntry} entry
     * @param {import('dictionary-importer').ImportRequirement[]} requirements
     * @returns {import('structured-content').ImageElement}
     */
    _prepareStructuredContentImage(content, entry, requirements) {
        if (this._skipMediaImport) {
            return {...content};
        }
        /** @type {import('structured-content').ImageElement} */
        const target = {
            tag: 'img',
            path: '', // Will be populated during requirement resolution
        };
        requirements.push({type: 'structured-content-image', target, source: content, entry});
        return target;
    }

    /**
     * @param {import('dictionary-importer').ImportRequirement[]} requirements
     * @param {import('dictionary-importer').ArchiveFileMap} fileMap
     * @returns {Promise<{media: import('dictionary-database').MediaDataArrayBufferContent[]}>}
     */
    async _resolveAsyncRequirements(requirements, fileMap) {
        /** @type {Map<string, import('dictionary-database').MediaDataArrayBufferContent>} */
        const media = new Map();
        /** @type {import('dictionary-importer').ImportRequirementContext} */
        const context = {fileMap, media};

        await this._runWithConcurrencyLimit(requirements, this._mediaResolutionConcurrency, async (requirement) => {
            await this._resolveAsyncRequirement(context, requirement);
        });

        return {
            media: [...media.values()],
        };
    }

    /**
     * @param {import('dictionary-importer').ImportRequirementContext} context
     * @param {import('dictionary-importer').ImportRequirement} requirement
     */
    async _resolveAsyncRequirement(context, requirement) {
        switch (requirement.type) {
            case 'image':
                await this._resolveDictionaryTermGlossaryImage(
                    context,
                    requirement.target,
                    requirement.source,
                    requirement.entry,
                );
                break;
            case 'structured-content-image':
                await this._resolveStructuredContentImage(
                    context,
                    requirement.target,
                    requirement.source,
                    requirement.entry,
                );
                break;
            default:
                return;
        }
    }

    /**
     * @param {import('dictionary-importer').ImportRequirement} requirement
     * @returns {boolean}
     */
    _tryResolveRequirementFromCachedImageMetadata(requirement) {
        const sourcePath = requirement.source.path;
        const cachedMetadata = this._imageMetadataByPath.get(sourcePath);
        if (typeof cachedMetadata === 'undefined') {
            return false;
        }

        switch (requirement.type) {
            case 'image':
                this._assignResolvedImageData(requirement.target, requirement.source, cachedMetadata.width, cachedMetadata.height);
                return true;
            case 'structured-content-image':
                this._assignResolvedImageData(requirement.target, requirement.source, cachedMetadata.width, cachedMetadata.height);
                if (typeof requirement.source.verticalAlign === 'string') { requirement.target.verticalAlign = requirement.source.verticalAlign; }
                if (typeof requirement.source.border === 'string') { requirement.target.border = requirement.source.border; }
                if (typeof requirement.source.borderRadius === 'string') { requirement.target.borderRadius = requirement.source.borderRadius; }
                if (typeof requirement.source.sizeUnits === 'string') { requirement.target.sizeUnits = requirement.source.sizeUnits; }
                return true;
            default:
                return false;
        }
    }

    /**
     * @param {import('dictionary-importer').ImportRequirementContext} context
     * @param {import('dictionary-data').TermGlossaryImage} target
     * @param {import('dictionary-data').TermGlossaryImage} source
     * @param {import('dictionary-database').DatabaseTermEntry} entry
     */
    async _resolveDictionaryTermGlossaryImage(context, target, source, entry) {
        await this._createImageData(context, target, source, entry);
    }

    /**
     * @param {import('dictionary-importer').ImportRequirementContext} context
     * @param {import('structured-content').ImageElement} target
     * @param {import('structured-content').ImageElement} source
     * @param {import('dictionary-database').DatabaseTermEntry} entry
     */
    async _resolveStructuredContentImage(context, target, source, entry) {
        const {
            verticalAlign,
            border,
            borderRadius,
            sizeUnits,
        } = source;
        await this._createImageData(context, target, source, entry);
        if (typeof verticalAlign === 'string') { target.verticalAlign = verticalAlign; }
        if (typeof border === 'string') { target.border = border; }
        if (typeof borderRadius === 'string') { target.borderRadius = borderRadius; }
        if (typeof sizeUnits === 'string') { target.sizeUnits = sizeUnits; }
    }

    /**
     * @param {import('dictionary-importer').ImportRequirementContext} context
     * @param {import('structured-content').ImageElementBase} target
     * @param {import('structured-content').ImageElementBase} source
     * @param {import('dictionary-database').DatabaseTermEntry} entry
     */
    async _createImageData(context, target, source, entry) {
        const {
            path,
        } = source;
        const {width, height} = await this._getImageMedia(context, path, entry);
        this._assignResolvedImageData(target, source, width, height);
    }

    /**
     * @param {import('structured-content').ImageElementBase} target
     * @param {import('structured-content').ImageElementBase} source
     * @param {number} width
     * @param {number} height
     */
    _assignResolvedImageData(target, source, width, height) {
        const {
            path,
            width: preferredWidth,
            height: preferredHeight,
            title,
            alt,
            description,
            pixelated,
            imageRendering,
            appearance,
            background,
            collapsed,
            collapsible,
        } = source;
        target.path = path;
        target.width = width;
        target.height = height;
        if (typeof preferredWidth === 'number') { target.preferredWidth = preferredWidth; }
        if (typeof preferredHeight === 'number') { target.preferredHeight = preferredHeight; }
        if (typeof title === 'string') { target.title = title; }
        if (typeof alt === 'string') { target.alt = alt; }
        if (typeof description === 'string') { target.description = description; }
        if (typeof pixelated === 'boolean') { target.pixelated = pixelated; }
        if (typeof imageRendering === 'string') { target.imageRendering = imageRendering; }
        if (typeof appearance === 'string') { target.appearance = appearance; }
        if (typeof background === 'boolean') { target.background = background; }
        if (typeof collapsed === 'boolean') { target.collapsed = collapsed; }
        if (typeof collapsible === 'boolean') { target.collapsible = collapsible; }
    }

    /**
     * @param {import('dictionary-importer').ImportRequirementContext} context
     * @param {string} path
     * @param {import('dictionary-database').DatabaseTermEntry} entry
     * @returns {Promise<import('dictionary-database').MediaDataArrayBufferContent>}
     */
    async _getImageMedia(context, path, entry) {
        const {media} = context;
        const {dictionary} = entry;

        /**
         * @param {string} message
         * @returns {Error}
         */
        const createError = (message) => {
            const {expression, reading} = entry;
            const readingSource = reading.length > 0 ? ` (${reading})` : '';
            return new Error(`${message} at path ${JSON.stringify(path)} for ${expression}${readingSource} in ${dictionary}`);
        };

        // Check if already added
        const mediaData = media.get(path);
        if (typeof mediaData !== 'undefined') {
            if (getFileExtensionFromImageMediaType(mediaData.mediaType) === null) {
                throw createError('Media file is not a valid image');
            }
            return mediaData;
        }
        const pending = this._pendingImageMediaByPath.get(path);
        if (typeof pending !== 'undefined') {
            return await pending;
        }
        const cachedMetadata = this._imageMetadataByPath.get(path);
        if (typeof cachedMetadata !== 'undefined') {
            return {
                dictionary,
                path,
                mediaType: cachedMetadata.mediaType,
                width: cachedMetadata.width,
                height: cachedMetadata.height,
                content: new ArrayBuffer(0),
            };
        }
        const promise = (async () => {
            // Find file in archive
            const file = context.fileMap.get(path);
            if (typeof file === 'undefined') {
                throw createError('Could not find image');
            }

            // Load file content without staging through Blob.
            const bytes = await this._getData(file, new Uint8ArrayWriter());
            let content = (
                bytes.byteOffset === 0 &&
                bytes.byteLength === bytes.buffer.byteLength
            ) ?
                bytes.buffer :
                bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);

            const mediaType = getImageMediaTypeFromFileName(path);
            if (mediaType === null) {
                throw createError('Could not determine media type for image');
            }

            let width = 0;
            let height = 0;
            if (!this._skipImageMetadata) {
                // Keep imports resilient when a browser/runtime cannot decode a specific image variant.
                // The media payload can still be stored and resolved later even without dimensions.
                try {
                    ({content, width, height} = await this._mediaLoader.getImageDetails(content, mediaType));
                } catch (_) {
                    width = 0;
                    height = 0;
                }
            }

            const created = {
                dictionary,
                path,
                mediaType,
                width,
                height,
                content,
            };
            this._imageMetadataByPath.set(path, {mediaType, width, height});
            media.set(path, created);
            return created;
        })();
        this._pendingImageMediaByPath.set(path, promise);
        try {
            return await promise;
        } finally {
            this._pendingImageMediaByPath.delete(path);
        }
    }

    /**
     * @template T
     * @param {T[]} items
     * @param {number} concurrency
     * @param {(item: T) => Promise<void>} fn
     * @returns {Promise<void>}
     */
    async _runWithConcurrencyLimit(items, concurrency, fn) {
        if (items.length === 0) {
            return;
        }
        let nextIndex = 0;
        const workerCount = Math.min(concurrency, items.length);
        /** @type {Promise<void>[]} */
        const workers = [];
        for (let i = 0; i < workerCount; ++i) {
            workers.push((async () => {
                while (true) {
                    const index = nextIndex++;
                    if (index >= items.length) {
                        return;
                    }
                    await fn(items[index]);
                }
            })());
        }
        await Promise.all(workers);
    }

    /**
     * @param {import('dictionary-data').TermV1} entry
     * @param {string} dictionary
     * @returns {import('dictionary-database').DatabaseTermEntry}
     */
    _convertTermBankEntryV1(entry, dictionary) {
        let [expression, reading, definitionTags, rules, score, ...glossary] = entry;
        reading = reading.length > 0 ? reading : expression;
        return {expression, reading, definitionTags, rules, score, glossary, dictionary};
    }

    /**
     * @param {import('dictionary-data').TermV3} entry
     * @param {string} dictionary
     * @returns {import('dictionary-database').DatabaseTermEntry}
     */
    _convertTermBankEntryV3(entry, dictionary) {
        let [expression, reading, definitionTags, rules, score, glossary, sequence, termTags] = entry;
        reading = reading.length > 0 ? reading : expression;
        return {expression, reading, definitionTags, rules, score, glossary, sequence, termTags, dictionary};
    }

    /**
     * @param {import('dictionary-database').DatabaseTermEntry[]} termList
     * @param {boolean} enableTermEntryContentDedup
     */
    _prepareTermImportSerialization(termList, enableTermEntryContentDedup) {
        for (const entry of termList) {
            this._prepareTermEntrySerialization(entry, enableTermEntryContentDedup);
        }
    }

    /**
     * @param {import('dictionary-database').DatabaseTermEntry} entry
     * @param {boolean} enableTermEntryContentDedup
     * @param {Uint8Array|null} [glossaryJsonBytes]
     */
    _prepareTermEntrySerialization(entry, enableTermEntryContentDedup, glossaryJsonBytes = null) {
        if (
            enableTermEntryContentDedup &&
            hasPrecomputedTermEntryContent(entry)
        ) {
            return;
        }
        if (
            hasPrecomputedTermEntryContent(entry) &&
            typeof entry.glossaryJson === 'string'
        ) {
            return;
        }
        const glossaryJson = (typeof entry.glossaryJson === 'string') ? entry.glossaryJson : JSON.stringify(entry.glossary);
        if (!enableTermEntryContentDedup) {
            entry.glossaryJson = glossaryJson;
        }
        const definitionTags = entry.definitionTags ?? entry.tags ?? '';
        const termTags = entry.termTags ?? '';
        let hash1;
        let hash2;
        if (
            glossaryJsonBytes instanceof Uint8Array &&
            glossaryJsonBytes.byteLength > 0
        ) {
            const contentBytes = encodeRawTermContentBinary(entry.rules, definitionTags, termTags, glossaryJsonBytes, this._textEncoder);
            [hash1, hash2] = this._hashEntryContentBytesPair(contentBytes);
            entry.termEntryContentBytes = contentBytes;
            entry.termEntryContentDictName = RAW_TERM_CONTENT_DICT_NAME;
            entry.termEntryContentRawGlossaryJsonBytes = void 0;
        } else {
            const contentBytes = this._textEncoder.encode(this._createTermEntryContentJson(entry.rules, definitionTags, termTags, glossaryJson));
            [hash1, hash2] = this._hashEntryContentBytesPair(contentBytes);
            entry.termEntryContentBytes = contentBytes;
            entry.termEntryContentRawGlossaryJsonBytes = void 0;
        }
        entry.termEntryContentHash1 = hash1;
        entry.termEntryContentHash2 = hash2;
        entry.termEntryContentHash = hashPairToHex(hash1, hash2);
    }

    /**
     * @param {string} rules
     * @param {string} definitionTags
     * @param {string} termTags
     * @param {string} glossaryJson
     * @returns {string}
     */
    _createTermEntryContentJson(rules, definitionTags, termTags, glossaryJson) {
        return `{"rules":${this._quoteJsonStringCached(rules)},"definitionTags":${this._quoteJsonStringCached(definitionTags)},"termTags":${this._quoteJsonStringCached(termTags)},"glossary":${glossaryJson}}`;
    }

    /**
     * @param {string} value
     * @returns {string}
     */
    _quoteJsonStringCached(value) {
        const cached = this._jsonQuotedStringCache.get(value);
        if (typeof cached !== 'undefined') {
            // Promote to keep eviction order LRU-like.
            this._jsonQuotedStringCache.delete(value);
            this._jsonQuotedStringCache.set(value, cached);
            return cached;
        }
        const quoted = JSON.stringify(value);
        if (this._jsonQuotedStringCache.size >= JSON_QUOTED_STRING_CACHE_MAX_ENTRIES) {
            const oldestKey = this._jsonQuotedStringCache.keys().next().value;
            if (typeof oldestKey === 'string') {
                this._jsonQuotedStringCache.delete(oldestKey);
            }
        }
        this._jsonQuotedStringCache.set(value, quoted);
        return quoted;
    }

    /**
     * @param {string} value
     * @returns {Uint8Array}
     */
    _getUtf8StringBytesCached(value) {
        const cached = this._utf8StringBytesCache.get(value);
        if (cached instanceof Uint8Array) {
            this._utf8StringBytesCache.delete(value);
            this._utf8StringBytesCache.set(value, cached);
            return cached;
        }
        const bytes = this._textEncoder.encode(value);
        if (this._utf8StringBytesCache.size >= JSON_QUOTED_STRING_CACHE_MAX_ENTRIES) {
            const oldestKey = this._utf8StringBytesCache.keys().next().value;
            if (typeof oldestKey === 'string') {
                this._utf8StringBytesCache.delete(oldestKey);
            }
        }
        this._utf8StringBytesCache.set(value, bytes);
        return bytes;
    }

    /**
     * @param {string} contentJson
     * @returns {string}
     */
    _hashEntryContent(contentJson) {
        const [h1, h2] = this._hashEntryContentPair(contentJson);
        return hashPairToHex(h1, h2);
    }

    /**
     * @param {string} contentJson
     * @returns {[number, number]}
     */
    _hashEntryContentPair(contentJson) {
        return this._hashEntryContentBytesPair(this._textEncoder.encode(contentJson));
    }

    /**
     * @param {Uint8Array} bytes
     * @returns {[number, number]}
     */
    _hashEntryContentBytesPair(bytes) {
        let h1 = 0x811c9dc5;
        let h2 = 0x9e3779b9;
        for (let i = 0, ii = bytes.length; i < ii; ++i) {
            const code = bytes[i];
            h1 = Math.imul((h1 ^ code) >>> 0, 0x01000193);
            h2 = Math.imul((h2 ^ code) >>> 0, 0x85ebca6b);
            h2 = (h2 ^ (h2 >>> 13)) >>> 0;
        }
        if ((h1 | h2) === 0) {
            h1 = 1;
        }
        return [h1 >>> 0, h2 >>> 0];
    }

    /**
     * @param {import('dictionary-data').TermMeta} entry
     * @param {string} dictionary
     * @returns {import('dictionary-database').DatabaseTermMeta}
     */
    _convertTermMetaBankEntry(entry, dictionary) {
        const [expression, mode, data] = entry;
        return /** @type {import('dictionary-database').DatabaseTermMeta} */ ({expression, mode, data, dictionary});
    }

    /**
     * @param {import('dictionary-data').KanjiV1} entry
     * @param {string} dictionary
     * @returns {import('dictionary-database').DatabaseKanjiEntry}
     */
    _convertKanjiBankEntryV1(entry, dictionary) {
        const [character, onyomi, kunyomi, tags, ...meanings] = entry;
        return {character, onyomi, kunyomi, tags, meanings, dictionary};
    }

    /**
     * @param {import('dictionary-data').KanjiV3} entry
     * @param {string} dictionary
     * @returns {import('dictionary-database').DatabaseKanjiEntry}
     */
    _convertKanjiBankEntryV3(entry, dictionary) {
        const [character, onyomi, kunyomi, tags, meanings, stats] = entry;
        return {character, onyomi, kunyomi, tags, meanings, stats, dictionary};
    }

    /**
     * @param {import('dictionary-data').KanjiMeta} entry
     * @param {string} dictionary
     * @returns {import('dictionary-database').DatabaseKanjiMeta}
     */
    _convertKanjiMetaBankEntry(entry, dictionary) {
        const [character, mode, data] = entry;
        return {character, mode, data, dictionary};
    }

    /**
     * @param {import('dictionary-data').Tag} entry
     * @param {string} dictionary
     * @returns {import('dictionary-database').Tag}
     */
    _convertTagBankEntry(entry, dictionary) {
        const [name, category, order, notes, score] = entry;
        return {name, category, order, notes, score, dictionary};
    }

    /**
     * @param {import('dictionary-data').Index} index
     * @param {import('dictionary-database').Tag[]} results
     * @param {string} dictionary
     */
    _addOldIndexTags(index, results, dictionary) {
        const {tagMeta} = index;
        if (typeof tagMeta !== 'object' || tagMeta === null) { return; }
        for (const [name, value] of Object.entries(tagMeta)) {
            const {category, order, notes, score} = value;
            results.push({name, category, order, notes, score, dictionary});
        }
    }

    /**
     * @param {import('dictionary-importer').ArchiveFileMap} fileMap
     * @param {import('dictionary-importer').QueryDetails} queryDetails
     * @returns {import('dictionary-importer').QueryResult}
     */
    _getArchiveFiles(fileMap, queryDetails) {
        /** @type {import('dictionary-importer').QueryResult} */
        const results = new Map();

        for (const [fileType] of queryDetails) {
            results.set(fileType, []);
        }

        for (const [fileName, fileEntry] of fileMap.entries()) {
            for (const [fileType, fileNameFormat] of queryDetails) {
                if (!fileNameFormat.test(fileName)) { continue; }
                const entries = results.get(fileType);

                if (typeof entries !== 'undefined') {
                    entries.push(fileEntry);
                    break;
                }
            }
        }
        return results;
    }

    /**
     * @param {import('dictionary-importer').ArchiveFileMap} fileMap
     * @returns {Promise<{termBanksByArtifact: Map<string, {packedOffset: number, packedLength: number, rows: number|null}>, packedFileName: string|null, packedMediaFileName: string|null, packedMediaEntries: Array<{path: string, packedOffset: number, packedLength: number, mediaType: string, compressionMethod: number, uncompressedLength: number}>, sharedGlossaryFileName: string|null, sharedGlossaryPackedOffset: number|null, sharedGlossaryPackedLength: number|null, sharedGlossaryCompression: string|null, sharedGlossaryUncompressedLength: number|null, termContentMode: string|null, prunedAuxFiles: boolean, includesMediaFiles: boolean}|null>}
     */
    async _readTermArtifactManifest(fileMap) {
        const manifestEntry = fileMap.get(TERM_BANK_ARTIFACT_MANIFEST_FILE);
        if (typeof manifestEntry === 'undefined') {
            return null;
        }
        let manifest;
        try {
            manifest = /** @type {{termBanks?: Array<{artifact?: unknown, packedOffset?: unknown, packedLength?: unknown, rows?: unknown}>, packedTermArtifact?: {file?: unknown}|null, mediaArtifact?: {file?: unknown, entries?: Array<{path?: unknown, packedOffset?: unknown, packedLength?: unknown, mediaType?: unknown, compressionMethod?: unknown, uncompressedLength?: unknown}>|null}|null, sharedGlossaryArtifact?: {file?: unknown, packedOffset?: unknown, packedLength?: unknown, compression?: unknown, uncompressedBytes?: unknown}|null, termContentMode?: unknown, prunedAuxFiles?: unknown, includesMediaFiles?: unknown}|null} */ (
                parseJson(await this._getData(/** @type {import('@zip.js/zip.js').Entry} */ (manifestEntry), new TextWriter()))
            );
        } catch (_) {
            return null;
        }
        if (!(typeof manifest === 'object' && manifest !== null)) {
            return null;
        }
        /** @type {Map<string, {packedOffset: number, packedLength: number, rows: number|null}>} */
        const termBanksByArtifact = new Map();
        const termBanks = Array.isArray(manifest.termBanks) ? manifest.termBanks : [];
        for (const termBank of termBanks) {
            if (!(typeof termBank === 'object' && termBank !== null)) { continue; }
            const artifact = typeof termBank.artifact === 'string' ? termBank.artifact : null;
            const packedOffset = Number.isInteger(termBank.packedOffset) ? /** @type {number} */ (termBank.packedOffset) : -1;
            const packedLength = Number.isInteger(termBank.packedLength) ? /** @type {number} */ (termBank.packedLength) : -1;
            const rows = Number.isInteger(termBank.rows) ? /** @type {number} */ (termBank.rows) : null;
            if (artifact === null || packedOffset < 0 || packedLength <= 0) { continue; }
            termBanksByArtifact.set(artifact, {packedOffset, packedLength, rows});
        }
        const packedFileName = (
            typeof manifest.packedTermArtifact === 'object' &&
            manifest.packedTermArtifact !== null &&
            typeof manifest.packedTermArtifact.file === 'string'
        ) ?
            manifest.packedTermArtifact.file :
            null;
        const packedMediaFileName = (
            typeof manifest.mediaArtifact === 'object' &&
            manifest.mediaArtifact !== null &&
            typeof manifest.mediaArtifact.file === 'string'
        ) ?
            manifest.mediaArtifact.file :
            null;
        /** @type {Array<{path: string, packedOffset: number, packedLength: number, mediaType: string, compressionMethod: number, uncompressedLength: number}>} */
        const packedMediaEntries = [];
        const mediaEntries = (
            typeof manifest.mediaArtifact === 'object' &&
            manifest.mediaArtifact !== null &&
            Array.isArray(manifest.mediaArtifact.entries)
        ) ?
            manifest.mediaArtifact.entries :
            [];
        for (const mediaEntry of mediaEntries) {
            if (!(typeof mediaEntry === 'object' && mediaEntry !== null)) { continue; }
            const path = typeof mediaEntry.path === 'string' ? mediaEntry.path : null;
            const packedOffset = Number.isInteger(mediaEntry.packedOffset) ? /** @type {number} */ (mediaEntry.packedOffset) : -1;
            const packedLength = Number.isInteger(mediaEntry.packedLength) ? /** @type {number} */ (mediaEntry.packedLength) : -1;
            const mediaType = typeof mediaEntry.mediaType === 'string' ? mediaEntry.mediaType : null;
            const compressionMethod = Number.isInteger(mediaEntry.compressionMethod) ? /** @type {number} */ (mediaEntry.compressionMethod) : ZIP_COMPRESSION_METHOD_STORE;
            const uncompressedLength = Number.isInteger(mediaEntry.uncompressedLength) ? /** @type {number} */ (mediaEntry.uncompressedLength) : packedLength;
            if (path === null || mediaType === null || packedOffset < 0 || packedLength <= 0 || uncompressedLength <= 0) { continue; }
            packedMediaEntries.push({path, packedOffset, packedLength, mediaType, compressionMethod, uncompressedLength});
        }
        const sharedGlossaryFileName = (
            typeof manifest.sharedGlossaryArtifact === 'object' &&
            manifest.sharedGlossaryArtifact !== null &&
            typeof manifest.sharedGlossaryArtifact.file === 'string'
        ) ?
            manifest.sharedGlossaryArtifact.file :
            null;
        const sharedGlossaryPackedOffset = (
            typeof manifest.sharedGlossaryArtifact === 'object' &&
            manifest.sharedGlossaryArtifact !== null &&
            Number.isInteger(manifest.sharedGlossaryArtifact.packedOffset)
        ) ?
            /** @type {number} */ (manifest.sharedGlossaryArtifact.packedOffset) :
            null;
        const sharedGlossaryPackedLength = (
            typeof manifest.sharedGlossaryArtifact === 'object' &&
            manifest.sharedGlossaryArtifact !== null &&
            Number.isInteger(manifest.sharedGlossaryArtifact.packedLength)
        ) ?
            /** @type {number} */ (manifest.sharedGlossaryArtifact.packedLength) :
            null;
        const sharedGlossaryCompression = (
            typeof manifest.sharedGlossaryArtifact === 'object' &&
            manifest.sharedGlossaryArtifact !== null &&
            typeof manifest.sharedGlossaryArtifact.compression === 'string'
        ) ?
            manifest.sharedGlossaryArtifact.compression :
            null;
        const sharedGlossaryUncompressedLength = (
            typeof manifest.sharedGlossaryArtifact === 'object' &&
            manifest.sharedGlossaryArtifact !== null &&
            Number.isInteger(manifest.sharedGlossaryArtifact.uncompressedBytes)
        ) ?
            /** @type {number} */ (manifest.sharedGlossaryArtifact.uncompressedBytes) :
            null;
        const termContentModeValue = manifest.termContentMode;
        const termContentMode = typeof termContentModeValue === 'string' ? termContentModeValue : null;
        const prunedAuxFiles = manifest.prunedAuxFiles === true;
        const includesMediaFiles = manifest.includesMediaFiles === true;
        return {
            termBanksByArtifact,
            packedFileName,
            packedMediaFileName,
            packedMediaEntries,
            sharedGlossaryFileName,
            sharedGlossaryPackedOffset,
            sharedGlossaryPackedLength,
            sharedGlossaryCompression,
            sharedGlossaryUncompressedLength,
            termContentMode,
            prunedAuxFiles,
            includesMediaFiles,
        };
    }

    /**
     * @param {import('@zip.js/zip.js').Entry[]} termArtifactFiles
     * @returns {Promise<Map<string, Uint8Array>>}
     */
    async _preloadTermArtifactFiles(termArtifactFiles) {
        /** @type {Map<string, Uint8Array>} */
        const results = new Map();
        for (let i = 0; i < termArtifactFiles.length; i += TERM_ARTIFACT_PRELOAD_CONCURRENCY) {
            const batch = termArtifactFiles.slice(i, i + TERM_ARTIFACT_PRELOAD_CONCURRENCY);
            const batchResults = await Promise.all(batch.map(async (termFile) => {
                const bytes = await this._getData(termFile, new Uint8ArrayWriter());
                return [termFile.filename, bytes];
            }));
            for (const [filename, bytes] of batchResults) {
                results.set(/** @type {string} */ (filename), /** @type {Uint8Array} */ (bytes));
            }
        }
        return results;
    }

    /**
     * @param {Uint8Array|null} packedTermArtifactBytes
     * @param {Uint8Array|null} sharedGlossaryArtifactBytes
     * @param {{termBanksByArtifact: Map<string, {packedOffset: number, packedLength: number, rows: number|null}>}|null} termArtifactManifest
     * @param {Map<string, Uint8Array>|null} preloadedTermArtifactBytes
     * @param {import('@zip.js/zip.js').Entry[]} termArtifactFiles
     * @returns {number|null}
     */
    _estimateExpectedTermContentImportBytes(
        packedTermArtifactBytes,
        sharedGlossaryArtifactBytes,
        termArtifactManifest,
        preloadedTermArtifactBytes,
        termArtifactFiles,
    ) {
        let total = 0;
        if (packedTermArtifactBytes instanceof Uint8Array) {
            total += packedTermArtifactBytes.byteLength;
        } else if (preloadedTermArtifactBytes !== null) {
            for (const bytes of preloadedTermArtifactBytes.values()) {
                total += bytes.byteLength;
            }
        } else if (termArtifactManifest !== null) {
            for (const {packedLength} of termArtifactManifest.termBanksByArtifact.values()) {
                total += packedLength;
            }
        } else {
            for (const termArtifactFile of termArtifactFiles) {
                const size = typeof termArtifactFile.uncompressedSize === 'number' && Number.isFinite(termArtifactFile.uncompressedSize) ?
                    Math.max(0, Math.trunc(termArtifactFile.uncompressedSize)) :
                    0;
                total += size;
            }
        }
        if (
            sharedGlossaryArtifactBytes instanceof Uint8Array &&
            !(packedTermArtifactBytes instanceof Uint8Array)
        ) {
            total += sharedGlossaryArtifactBytes.byteLength;
        }
        return total > 0 ? total : null;
    }

    /**
     * @param {Map<string, {packedOffset: number, packedLength: number, rows: number|null}>} termBanksByArtifact
     * @returns {{filename: string}[]}
     */
    _createPackedTermArtifactFiles(termBanksByArtifact) {
        return [...termBanksByArtifact.keys()]
            .sort((a, b) => {
                const aMatch = /term_bank_(\d+)\.mbtb$/i.exec(a);
                const bMatch = /term_bank_(\d+)\.mbtb$/i.exec(b);
                const aIndex = aMatch !== null ? Number.parseInt(aMatch[1], 10) : Number.MAX_SAFE_INTEGER;
                const bIndex = bMatch !== null ? Number.parseInt(bMatch[1], 10) : Number.MAX_SAFE_INTEGER;
                return aIndex - bIndex;
            })
            .map((filename) => ({filename}));
    }

    /**
     * @template [TEntry=unknown]
     * @template [TResult=unknown]
     * @param {import('@zip.js/zip.js').Entry[]} files
     * @param {(entry: TEntry, dictionaryTitle: string) => TResult} convertEntry
     * @param {string} dictionaryTitle
     * @returns {Promise<TResult[]>}
     */
    async _readFileSequence(files, convertEntry, dictionaryTitle) {
        const results = [];
        for (const file of files) {
            const content = await this._getData(file, new TextWriter());
            let entries;

            try {
                /** @type {unknown} */
                entries = parseJson(content);
            } catch (error) {
                if (error instanceof Error) {
                    throw new Error(error.message + ` in '${file.filename}'`);
                }
            }

            if (Array.isArray(entries)) {
                for (const entry of /** @type {TEntry[]} */ (entries)) {
                    results.push(convertEntry(entry, dictionaryTitle));
                }
            }
        }
        return results;
    }

    /**
     * @param {import('@zip.js/zip.js').Entry} termFile
     * @param {import('dictionary-data').IndexVersion} version
     * @param {string} dictionaryTitle
     * @param {boolean} prefixWildcardsSupported
     * @param {boolean} useMediaPipeline
     * @param {boolean} enableTermEntryContentDedup
     * @param {'baseline'|'raw-bytes'} termContentStorageMode
     * @returns {Promise<{termList: import('dictionary-database').DatabaseTermEntry[], requirements: import('dictionary-importer').ImportRequirement[]|null}>}
     */
    async _readTermBankFile(
        termFile,
        version,
        dictionaryTitle,
        prefixWildcardsSupported,
        useMediaPipeline,
        enableTermEntryContentDedup,
        termContentStorageMode,
    ) {
        if (!this._disableTermBankWasmFastPath) {
            try {
                return await this._readTermBankFileFast(
                    termFile,
                    version,
                    dictionaryTitle,
                    prefixWildcardsSupported,
                    useMediaPipeline,
                    enableTermEntryContentDedup,
                    termContentStorageMode,
                );
            } catch (e) {
                this._logImport(`term file ${termFile.filename}: wasm parse fallback (${/** @type {Error} */ (toError(e)).message})`);
            }
        } else {
            this._logImport(`term file ${termFile.filename}: wasm parser disabled by import flag`);
        }
        const content = await this._getData(termFile, new TextWriter());
        let entries = /** @type {unknown} */ ([]);
        try {
            entries = parseJson(content);
        } catch (error) {
            if (error instanceof Error) {
                throw new Error(error.message + ` in '${termFile.filename}'`);
            }
        }
        if (!Array.isArray(entries)) {
            return {termList: [], requirements: null};
        }
        const parsedEntries = /** @type {unknown[]} */ (entries);
        /** @type {import('dictionary-importer').ImportRequirement[]|null} */
        const requirements = useMediaPipeline ? [] : null;

        /** @type {import('dictionary-database').DatabaseTermEntry[]} */
        const result = [];
        result.length = parsedEntries.length;

        for (let i = 0, ii = parsedEntries.length; i < ii; ++i) {
            const raw = parsedEntries[i];
            const entry = version === 1 ? this._convertTermBankEntryV1(/** @type {import('dictionary-data').TermV1} */ (raw), dictionaryTitle) : this._convertTermBankEntryV3(/** @type {import('dictionary-data').TermV3} */ (raw), dictionaryTitle);

            this._assignPrefixReverseFields(entry, prefixWildcardsSupported);

            if (requirements !== null) {
                const glossaryList = entry.glossary;
                for (let j = 0, jj = glossaryList.length; j < jj; ++j) {
                    const glossary = glossaryList[j];
                    if (typeof glossary !== 'object' || glossary === null || Array.isArray(glossary)) { continue; }
                    glossaryList[j] = this._formatDictionaryTermGlossaryObject(glossary, entry, requirements);
                }
            }

            if (requirements === null) {
                this._prepareTermEntrySerialization(entry, enableTermEntryContentDedup);
            }
            result[i] = entry;
        }
        return {termList: result, requirements};
    }

    /**
     * @param {import('@zip.js/zip.js').Entry} termFile
     * @param {import('dictionary-data').IndexVersion} version
     * @param {string} dictionaryTitle
     * @param {boolean} prefixWildcardsSupported
     * @param {boolean} useMediaPipeline
     * @param {boolean} enableTermEntryContentDedup
     * @param {'baseline'|'raw-bytes'} termContentStorageMode
     * @param {(termList: import('dictionary-database').DatabaseTermEntry[], requirements: import('dictionary-importer').ImportRequirement[]|null, progress: {processedRows: number, totalRows: number, chunkIndex: number, chunkCount: number}) => Promise<void>|void} [onChunk]
     * @returns {Promise<{termList: import('dictionary-database').DatabaseTermEntry[], requirements: import('dictionary-importer').ImportRequirement[]|null}>}
     */
    async _readTermBankFileFast(termFile, version, dictionaryTitle, prefixWildcardsSupported, useMediaPipeline, enableTermEntryContentDedup, termContentStorageMode, onChunk = void 0) {
        this._lastFastTermBankReadProfile = null;
        const bytes = await this._getData(termFile, new Uint8ArrayWriter());
        let wasmRowChunkSize = this._termBankWasmRowChunkSize;
        if (this._adaptiveTermBankWasmRowChunkSizeTiered) {
            if (
                bytes.byteLength >= ADAPTIVE_TERM_BANK_WASM_ROW_CHUNK_SIZE_THRESHOLD_BYTES &&
                bytes.byteLength < ADAPTIVE_TERM_BANK_WASM_ROW_CHUNK_SIZE_UPPER_BOUND_BYTES
            ) {
                wasmRowChunkSize = Math.max(wasmRowChunkSize, 4096);
            }
        } else if (
            this._adaptiveTermBankWasmRowChunkSize &&
            bytes.byteLength >= ADAPTIVE_TERM_BANK_WASM_ROW_CHUNK_SIZE_THRESHOLD_BYTES
        ) {
            wasmRowChunkSize = Math.max(wasmRowChunkSize, 4096);
        }
        let wasmInitialMetaCapacityDivisor = this._termBankWasmInitialMetaCapacityDivisor;
        let wasmInitialContentBytesPerRow = this._termBankWasmInitialContentBytesPerRow;
        if (
            this._adaptiveTermBankWasmInitialCapacity &&
            bytes.byteLength >= ADAPTIVE_TERM_BANK_WASM_ROW_CHUNK_SIZE_THRESHOLD_BYTES
        ) {
            wasmInitialMetaCapacityDivisor = Math.min(
                wasmInitialMetaCapacityDivisor,
                ADAPTIVE_TERM_BANK_WASM_INITIAL_META_CAPACITY_DIVISOR,
            );
            wasmInitialContentBytesPerRow = Math.max(
                wasmInitialContentBytesPerRow,
                ADAPTIVE_TERM_BANK_WASM_INITIAL_CONTENT_BYTES_PER_ROW,
            );
        }
        const streamToChunkHandler = typeof onChunk === 'function';
        if (streamToChunkHandler && !useMediaPipeline) {
            wasmRowChunkSize = Math.max(wasmRowChunkSize, NO_MEDIA_FAST_PATH_TERM_BANK_WASM_ROW_CHUNK_SIZE);
        }
        /** @type {import('dictionary-importer').ImportRequirement[]|null} */
        const requirements = (useMediaPipeline && !streamToChunkHandler) ? [] : null;
        /** @type {import('dictionary-database').DatabaseTermEntry[]} */
        const termList = [];
        const minimalDecode = this._wasmCanonicalRowsFastPath && !useMediaPipeline;
        const usePrecomputedContentForMediaRows = useMediaPipeline && this._wasmPassThroughTermContent && this._usePrecomputedContentForMediaRows;
        const useRawBytesDirectContent = (termContentStorageMode === 'raw-bytes' && !useMediaPipeline);
        const includeContentMetadata = useRawBytesDirectContent ? false : (this._wasmPassThroughTermContent || !this._wasmSkipUnusedTermContentEncoding);
        const useLazyGlossaryDecode = useRawBytesDirectContent || (useMediaPipeline && (this._lazyGlossaryDecodeForMedia || this._glossaryMediaFastScan || usePrecomputedContentForMediaRows));
        const useMediaHintFastScan = useMediaPipeline && (
            this._wasmPassThroughTermContent ||
            this._lazyGlossaryDecodeForMedia ||
            this._glossaryMediaFastScan ||
            usePrecomputedContentForMediaRows
        );
        try {
            let importerMaterializationMs = 0;
            let importerChunkSinkMs = 0;
            let importerChunkCount = 0;
            let importerTotalRows = 0;
            await parseTermBankWithWasmChunks(
                bytes,
                version,
                async (parsedRows, chunkProgress) => {
                    ++importerChunkCount;
                    importerTotalRows = chunkProgress.processedRows;
                    /** @type {import('dictionary-importer').ImportRequirement[]|null} */
                    const requirementsForChunk = useMediaPipeline ? [] : null;
                    if (requirementsForChunk !== null) {
                        requirementsForChunk.length = 0;
                    }
                    /** @type {import('dictionary-database').DatabaseTermEntry[]} */
                    const termListChunk = [];
                    termListChunk.length = parsedRows.length;
                    const tMaterializationStart = Date.now();
                    for (let i = 0, ii = parsedRows.length; i < ii; ++i) {
                        const row = /** @type {ParsedTermBankChunkRow} */ (parsedRows[i]);
                        const expression = row.expression;
                        const reading = row.reading.length > 0 ? row.reading : expression;
                        const hasPrecomputedTermContent = hasPrecomputedTermEntryContent(row);
                        let usePrecomputedTermContent = false;
                        const useLeanTermEntryObject = (
                            this._leanCanonicalTermEntryObjects &&
                            requirementsForChunk === null &&
                            hasPrecomputedTermContent
                        );
                        /** @type {import('dictionary-database').DatabaseTermEntry} */
                        const entry = useLeanTermEntryObject ?
                            {
                                expression,
                                reading,
                                definitionTags: '',
                                rules: '',
                                score: row.score,
                                glossary: [],
                                termTags: '',
                                dictionary: dictionaryTitle,
                            } :
                            {
                                expression,
                                reading,
                                definitionTags: row.definitionTags ?? '',
                                rules: row.rules ?? '',
                                score: row.score,
                                glossary: [],
                                termTags: row.termTags ?? '',
                                dictionary: dictionaryTitle,
                            };
                        if (requirementsForChunk === null) {
                            if (typeof row.glossaryJson === 'string' && row.glossaryJson.length > 0) {
                                entry.glossaryJson = row.glossaryJson;
                            }
                            usePrecomputedTermContent = useRawBytesDirectContent ?
                                hasPrecomputedTermContent(row) :
                                true;
                        } else {
                            const skipGlossaryParse = (
                                typeof row.glossaryMayContainMedia === 'boolean' ?
                                    !row.glossaryMayContainMedia :
                                    !this._glossaryJsonLikelyContainsMedia(this._getFastRowGlossaryJson(row))
                            );
                            if (skipGlossaryParse) {
                                if (!this._wasmPassThroughTermContent) {
                                    entry.glossaryJson = this._getFastRowGlossaryJson(row);
                                }
                                usePrecomputedTermContent = true;
                            } else {
                                let glossaryList;
                                if (usePrecomputedContentForMediaRows && hasPrecomputedTermContent) {
                                    const contentPayload = this._parseTermEntryContentFromFastRow(row, termFile.filename);
                                    entry.rules = contentPayload.rules;
                                    entry.definitionTags = contentPayload.definitionTags;
                                    entry.termTags = contentPayload.termTags;
                                    glossaryList = contentPayload.glossary;
                                } else {
                                    const rowGlossaryJson = this._getFastRowGlossaryJson(row);
                                    glossaryList = this._parseGlossaryJsonFromFastRow(rowGlossaryJson, termFile.filename);
                                }
                                for (let j = 0, jj = glossaryList.length; j < jj; ++j) {
                                    const glossary = glossaryList[j];
                                    if (typeof glossary !== 'object' || glossary === null || Array.isArray(glossary)) { continue; }
                                    glossaryList[j] = this._formatDictionaryTermGlossaryObject(glossary, entry, requirementsForChunk);
                                }
                                entry.glossary = glossaryList;
                            }
                        }
                        if (typeof row.sequence === 'number') {
                            entry.sequence = row.sequence;
                        }
                        this._assignPrefixReverseFields(entry, prefixWildcardsSupported);
                        if (
                            usePrecomputedTermContent &&
                            this._wasmPassThroughTermContent &&
                            hasPrecomputedTermContent
                        ) {
                            if (typeof row.termEntryContentHash === 'string' && row.termEntryContentHash.length > 0) {
                                entry.termEntryContentHash = row.termEntryContentHash;
                            }
                            if (Number.isInteger(row.termEntryContentHash1) && Number.isInteger(row.termEntryContentHash2)) {
                                entry.termEntryContentHash1 = /** @type {number} */ (row.termEntryContentHash1);
                                entry.termEntryContentHash2 = /** @type {number} */ (row.termEntryContentHash2);
                            }
                            entry.termEntryContentBytes = row.termEntryContentBytes;
                        }
                        // Keep serialization canonical with the runtime deserializer.
                        if (
                            requirementsForChunk === null ||
                            (
                                requirementsForChunk !== null &&
                                (
                                    !hasPrecomputedTermEntryContent(entry)
                                )
                            )
                        ) {
                            if (
                                requirementsForChunk !== null &&
                                typeof entry.glossaryJson !== 'string' &&
                                (
                                    !hasPrecomputedTermEntryContent(entry)
                                )
                            ) {
                                entry.glossaryJson = this._getFastRowGlossaryJson(row);
                            }
                            this._prepareTermEntrySerialization(
                                entry,
                                enableTermEntryContentDedup,
                                (
                                    useRawBytesDirectContent &&
                                    requirementsForChunk === null &&
                                    row.glossaryJsonBytes instanceof Uint8Array
                                ) ?
                                    row.glossaryJsonBytes :
                                    null,
                            );
                        }
                        termListChunk[i] = entry;
                    }
                    importerMaterializationMs += Math.max(0, Date.now() - tMaterializationStart);

                    const tChunkSinkStart = Date.now();
                    if (streamToChunkHandler) {
                        await /** @type {(termList: import('dictionary-database').DatabaseTermEntry[], requirements: import('dictionary-importer').ImportRequirement[]|null, progress: {processedRows: number, totalRows: number, chunkIndex: number, chunkCount: number}) => Promise<void>|void} */ (onChunk)(
                            termListChunk,
                            requirementsForChunk,
                            chunkProgress,
                        );
                    } else {
                        termList.push(...termListChunk);
                        if (requirements !== null && requirementsForChunk !== null) {
                            requirements.push(...requirementsForChunk);
                        }
                    }
                    importerChunkSinkMs += Math.max(0, Date.now() - tChunkSinkStart);
                },
                wasmRowChunkSize,
                {
                    copyContentBytes: this._wasmPassThroughTermContent && !streamToChunkHandler,
                    includeContentMetadata,
                    initialMetaCapacityDivisor: wasmInitialMetaCapacityDivisor,
                    initialContentBytesPerRow: wasmInitialContentBytesPerRow,
                    minimalDecode,
                    reuseExpressionForReadingDecode: this._wasmReuseExpressionForReadingDecode,
                    preallocateChunkRows: this._wasmPreallocateChunkRows,
                    skipTagRuleDecode: usePrecomputedContentForMediaRows,
                    lazyGlossaryDecode: useLazyGlossaryDecode,
                    mediaHintFastScan: useMediaHintFastScan,
                },
            );
            const parserProfile = consumeLastTermBankWasmParseProfile();
            this._lastFastTermBankReadProfile = {
                parserProfile,
                materializationMs: importerMaterializationMs,
                chunkSinkMs: importerChunkSinkMs,
                chunkCount: importerChunkCount,
                totalRows: importerTotalRows,
            };
        } catch (error) {
            consumeLastTermBankWasmParseProfile();
            throw toError(error);
        }
        return {termList, requirements};
    }

    /**
     * @param {import('@zip.js/zip.js').Entry} termFile
     * @param {string} dictionaryTitle
     * @param {boolean} prefixWildcardsSupported
     * @param {'baseline'|'raw-bytes'} termContentStorageMode
     * @param {(termList: import('dictionary-database').DatabaseTermEntry[], requirements: import('dictionary-importer').ImportRequirement[]|null, progress: {processedRows: number, totalRows: number, chunkIndex: number, chunkCount: number}) => Promise<void>|void} [onChunk]
     * @param {number} [sharedGlossaryBaseOffset]
     * @param {boolean} [directArtifactChunkImport]
     * @param {number} [dictionaryTotalRows]
     * @returns {Promise<{termList: import('dictionary-database').DatabaseTermEntry[], requirements: import('dictionary-importer').ImportRequirement[]|null}>}
     */
    async _readTermBankArtifactFile(termFile, dictionaryTitle, prefixWildcardsSupported, termContentStorageMode, onChunk = void 0, sharedGlossaryBaseOffset = 0, directArtifactChunkImport = false, dictionaryTotalRows = 0) {
        this._lastArtifactTermBankReadProfile = null;
        const tReadBytesStart = Date.now();
        const bytes = await this._getData(termFile, new Uint8ArrayWriter());
        const readBytesMs = Math.max(0, Date.now() - tReadBytesStart);
        return await this._decodeTermBankArtifactBytes(bytes, termFile.filename, dictionaryTitle, prefixWildcardsSupported, termContentStorageMode, onChunk, readBytesMs, sharedGlossaryBaseOffset, directArtifactChunkImport, dictionaryTotalRows);
    }

    /**
     * @param {Uint8Array} bytes
     * @param {string} filename
     * @param {string} dictionaryTitle
     * @param {boolean} prefixWildcardsSupported
     * @param {'baseline'|'raw-bytes'} termContentStorageMode
     * @param {(termList: import('dictionary-database').DatabaseTermEntry[], requirements: import('dictionary-importer').ImportRequirement[]|null, progress: {processedRows: number, totalRows: number, chunkIndex: number, chunkCount: number}) => Promise<void>|void} [onChunk]
     * @param {number} readBytesMs
     * @param {number} [sharedGlossaryBaseOffset]
     * @param {boolean} [directArtifactChunkImport]
     * @param {number} [dictionaryTotalRows]
     * @returns {Promise<{termList: import('dictionary-database').DatabaseTermEntry[], requirements: import('dictionary-importer').ImportRequirement[]|null}>}
     */
    async _decodeTermBankArtifactBytes(bytes, filename, dictionaryTitle, prefixWildcardsSupported, termContentStorageMode, onChunk = void 0, readBytesMs = 0, sharedGlossaryBaseOffset = 0, directArtifactChunkImport = false, dictionaryTotalRows = 0) {
        const textDecoder = this._textDecoder;
        if (bytes.byteLength < (TERM_BANK_ARTIFACT_MAGIC_BYTES + 4)) {
            throw new Error(`Invalid term artifact payload in '${filename}': too small`);
        }
        const magic = textDecoder.decode(bytes.subarray(0, TERM_BANK_ARTIFACT_MAGIC_BYTES));
        const artifactVersion = (
            magic === TERM_BANK_ARTIFACT_MAGIC_V2 ?
                2 :
                (magic === TERM_BANK_ARTIFACT_MAGIC_V1 ? 1 : 0)
        );
        if (artifactVersion === 0) {
            throw new Error(`Invalid term artifact payload in '${filename}': bad magic`);
        }
        const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        let cursor = TERM_BANK_ARTIFACT_MAGIC_BYTES;
        const rowCount = view.getUint32(cursor, true);
        cursor += 4;
        const streamToChunkHandler = typeof onChunk === 'function';
        /** @type {import('dictionary-database').DatabaseTermEntry[]} */
        const termList = streamToChunkHandler && directArtifactChunkImport ? [] : (streamToChunkHandler ? [] : new Array(rowCount));
        /** @type {Uint8Array[]} */
        let chunkExpressionBytes = [];
        /** @type {Uint8Array[]} */
        let chunkReadingBytes = [];
        /** @type {boolean[]|Uint8Array} */
        let chunkReadingEqualsExpression = [];
        /** @type {number[]|Int32Array} */
        let chunkScores = [];
        /** @type {(number|undefined)[]|Int32Array} */
        let chunkSequences = [];
        /** @type {Uint8Array[]} */
        let chunkContentBytes = [];
        /** @type {number[]|Uint32Array} */
        let chunkContentHash1 = [];
        /** @type {number[]|Uint32Array} */
        let chunkContentHash2 = [];
        /** @type {(string|null)[]|null} */
        let chunkContentDictNames = null;
        let termRecordPlanBuilder = directArtifactChunkImport ? null : createArtifactTermRecordPreinternedPlanBuilder();
        const chunkSize = this._termArtifactRowChunkSize;
        /** @type {number[]|Uint32Array} */
        let termRecordExpressionIndexes = [];
        /** @type {number[]|Uint32Array} */
        let termRecordReadingIndexes = [];
        const usePreallocatedTermRecordIndexes = streamToChunkHandler;
        let termRecordChunkIndex = 0;
        let chunkRowCount = 0;
        /** @type {string|null|undefined} */
        let chunkUniformContentDictName = void 0;
        if (directArtifactChunkImport) {
            chunkExpressionBytes = createSparseArray(chunkSize);
            chunkReadingBytes = createSparseArray(chunkSize);
            chunkReadingEqualsExpression = new Uint8Array(chunkSize);
            chunkScores = new Int32Array(chunkSize);
            chunkSequences = new Int32Array(chunkSize);
            chunkSequences.fill(-1);
            chunkContentBytes = createSparseArray(chunkSize);
            chunkContentHash1 = new Uint32Array(chunkSize);
            chunkContentHash2 = new Uint32Array(chunkSize);
        }
        if (usePreallocatedTermRecordIndexes) {
            termRecordExpressionIndexes = new Uint32Array(chunkSize);
            termRecordReadingIndexes = new Uint32Array(chunkSize);
        }
        const chunkCount = Math.max(1, Math.ceil(rowCount / Math.max(1, chunkSize)));
        let chunkIndex = 0;
        const tDecodeRowsStart = Date.now();
        let decodeRowsMs = 0;
        const reverseRowsMs = 0;
        let importerChunkSinkMs = 0;
        const metadataRebaseMs = 0;
        let readingEqualsExpressionCount = 0;
        let sequencePresentCount = 0;
        let zeroScoreCount = 0;
        let nonZeroScoreCount = 0;
        let sharedGlossaryRowCount = 0;
        let contentLengthExtendedCount = 0;
        let contentLengthTotal = 0;
        let expressionLengthTotal = 0;
        let readingLengthTotal = 0;
        for (let i = 0; i < rowCount; ++i) {
            if ((cursor + 4) > bytes.byteLength) {
                throw new Error(`Invalid term artifact payload in '${filename}': truncated expression length`);
            }
            const expressionLength = view.getUint32(cursor, true);
            cursor += 4;
            if ((cursor + expressionLength + 4) > bytes.byteLength) {
                throw new Error(`Invalid term artifact payload in '${filename}': truncated expression`);
            }
            const expressionStart = cursor;
            const expressionBytes = bytes.subarray(cursor, cursor + expressionLength);
            cursor += expressionLength;
            const readingLength = view.getUint32(cursor, true);
            cursor += 4;
            const trailingRowBytes = artifactVersion >= 2 ? 21 : 20;
            if ((cursor + readingLength + trailingRowBytes) > bytes.byteLength) {
                throw new Error(`Invalid term artifact payload in '${filename}': truncated row payload`);
            }
            const readingStart = cursor;
            let readingMatchesExpression;
            if (artifactVersion >= 2) {
                const flagsOffset = cursor + readingLength;
                const rowFlags = bytes[flagsOffset] ?? 0;
                readingMatchesExpression = (rowFlags & 0x01) !== 0;
            } else {
                readingMatchesExpression = (
                    readingLength > 0 &&
                    readingLength === expressionLength &&
                    byteRangeEqual(bytes, expressionStart, readingStart, expressionLength)
                );
            }
            if (readingMatchesExpression) {
                ++readingEqualsExpressionCount;
            }
            expressionLengthTotal += expressionLength;
            readingLengthTotal += readingLength;
            const readingBytes = readingMatchesExpression ?
                expressionBytes :
                bytes.subarray(cursor, cursor + readingLength);
            if (termRecordPlanBuilder !== null) {
                const expressionIndex = termRecordPlanBuilder.internStringBytes(expressionBytes);
                const readingIndex = readingMatchesExpression ?
                    expressionIndex :
                    termRecordPlanBuilder.internStringBytes(readingBytes);
                if (usePreallocatedTermRecordIndexes) {
                    /** @type {Uint32Array} */ (termRecordExpressionIndexes)[termRecordChunkIndex] = expressionIndex >>> 0;
                    /** @type {Uint32Array} */ (termRecordReadingIndexes)[termRecordChunkIndex] = readingIndex >>> 0;
                    ++termRecordChunkIndex;
                } else {
                    /** @type {number[]} */ (termRecordExpressionIndexes).push(expressionIndex);
                    /** @type {number[]} */ (termRecordReadingIndexes).push(readingIndex);
                }
            }
            cursor += readingLength;
            if (artifactVersion >= 2) {
                cursor += 1;
            }
            const score = view.getInt32(cursor, true);
            if (score === 0) {
                ++zeroScoreCount;
            } else {
                ++nonZeroScoreCount;
            }
            cursor += 4;
            const sequenceRaw = view.getInt32(cursor, true);
            if (sequenceRaw >= 0) {
                ++sequencePresentCount;
            }
            cursor += 4;
            const hash1 = view.getUint32(cursor, true);
            cursor += 4;
            const hash2 = view.getUint32(cursor, true);
            cursor += 4;
            const contentLength = view.getUint32(cursor, true);
            contentLengthTotal += contentLength;
            if (contentLength > 0xfffd) {
                ++contentLengthExtendedCount;
            }
            cursor += 4;
            if ((cursor + contentLength) > bytes.byteLength) {
                throw new Error(`Invalid term artifact payload in '${filename}': truncated content bytes`);
            }
            const contentStart = cursor;
            const contentEnd = contentStart + contentLength;
            const sequence = sequenceRaw >= 0 ? sequenceRaw : void 0;
            let contentBytes = bytes.subarray(contentStart, contentEnd);
            /** @type {string|null} */
            let contentDictName = null;
            if (termContentStorageMode === 'raw-bytes' && contentBytes.byteLength > 0) {
                const contentInfo = this._normalizeArtifactTermContent(contentBytes, sharedGlossaryBaseOffset);
                contentBytes = contentInfo.contentBytes;
                contentDictName = contentInfo.contentDictName;
                if (
                    contentDictName === RAW_TERM_CONTENT_SHARED_GLOSSARY_DICT_NAME ||
                    contentDictName === RAW_TERM_CONTENT_COMPRESSED_SHARED_GLOSSARY_DICT_NAME
                ) {
                    ++sharedGlossaryRowCount;
                }
            } else {
                contentBytes = this._normalizeArtifactTermContentBytes(contentBytes, termContentStorageMode);
            }
            cursor = contentEnd;
            if (streamToChunkHandler) {
                if (directArtifactChunkImport) {
                    chunkExpressionBytes[chunkRowCount] = expressionBytes;
                    chunkReadingBytes[chunkRowCount] = readingBytes;
                    chunkReadingEqualsExpression[chunkRowCount] = readingMatchesExpression ? 1 : 0;
                    chunkScores[chunkRowCount] = score;
                    chunkSequences[chunkRowCount] = typeof sequence === 'number' ? sequence : -1;
                    chunkContentBytes[chunkRowCount] = contentBytes;
                    chunkContentHash1[chunkRowCount] = hash1 >>> 0;
                    chunkContentHash2[chunkRowCount] = hash2 >>> 0;
                    if (chunkRowCount === 0) {
                        chunkUniformContentDictName = contentDictName;
                    } else if (chunkUniformContentDictName !== void 0 && contentDictName !== chunkUniformContentDictName) {
                        if (chunkContentDictNames === null) {
                            chunkContentDictNames = createSparseArray(chunkSize);
                            chunkContentDictNames.fill(chunkUniformContentDictName, 0, chunkRowCount);
                        }
                        chunkUniformContentDictName = void 0;
                    }
                    if (chunkContentDictNames !== null) {
                        chunkContentDictNames[chunkRowCount] = contentDictName;
                    }
                    ++chunkRowCount;
                } else {
                    /** @type {import('dictionary-database').DatabaseTermEntry} */
                    const entry = {
                        expression: '',
                        reading: '',
                        readingEqualsExpression: readingMatchesExpression,
                        expressionBytes,
                        readingBytes,
                        expressionReverse: void 0,
                        readingReverse: void 0,
                        definitionTags: null,
                        rules: '',
                        score,
                        glossary: EMPTY_TERM_GLOSSARY,
                        dictionary: dictionaryTitle,
                        termEntryContentHash1: hash1,
                        termEntryContentHash2: hash2,
                        termEntryContentBytes: contentBytes,
                        sequence,
                    };
                    if (contentDictName !== null) {
                        entry.termEntryContentDictName = contentDictName;
                    }
                    termList.push(entry);
                }
                const streamedRowCount = directArtifactChunkImport ?
                    chunkRowCount :
                    termList.length;
                if (streamedRowCount >= chunkSize) {
                    const termRecordPreinternedPlan = termRecordPlanBuilder !== null ?
                        termRecordPlanBuilder.buildPlan(termRecordExpressionIndexes, termRecordReadingIndexes, streamedRowCount) :
                        null;
                    ++chunkIndex;
                    const tChunkSinkStart = Date.now();
                    /** @type {import('dictionary-database').DatabaseTermEntry[]|{dictionary: string, rowCount: number, dictionaryTotalRows?: number, expressionBytesList: Uint8Array[], readingBytesList: Uint8Array[], readingEqualsExpressionList: boolean[], scoreList: number[], sequenceList: (number|undefined)[], contentBytesList: Uint8Array[], contentHash1List: number[], contentHash2List: number[], contentDictNameList: ((string|null)[]|null), termRecordPreinternedPlan?: import('./term-record-wasm-encoder.js').PreinternedTermRecordPlan|null}} */
                    const chunkPayload = directArtifactChunkImport ?
                        {
                            dictionary: dictionaryTitle,
                            rowCount: streamedRowCount,
                            dictionaryTotalRows,
                            expressionBytesList: chunkExpressionBytes,
                            readingBytesList: chunkReadingBytes,
                            readingEqualsExpressionList: chunkReadingEqualsExpression,
                            scoreList: chunkScores,
                            sequenceList: chunkSequences,
                            contentBytesList: chunkContentBytes,
                            contentHash1List: chunkContentHash1,
                            contentHash2List: chunkContentHash2,
                            contentDictNameList: chunkContentDictNames,
                            uniformContentDictName: chunkUniformContentDictName,
                            termRecordPreinternedPlan,
                        } :
                        termList;
                    if (!directArtifactChunkImport) {
                        if (termRecordPreinternedPlan === null) {
                            throw new Error(`Invalid term artifact payload in '${filename}': missing preinterned plan`);
                        }
                        setTermRecordPreinternedPlan(termList, termRecordPreinternedPlan);
                    }
                    await /** @type {(termList: import('dictionary-database').DatabaseTermEntry[]|{dictionary: string, rowCount: number, expressionBytesList: Uint8Array[], readingBytesList: Uint8Array[], readingEqualsExpressionList: boolean[], scoreList: number[], sequenceList: (number|undefined)[], contentBytesList: Uint8Array[], contentDictNameList: ((string|null)[]|null), termRecordPreinternedPlan?: import('./term-record-wasm-encoder.js').PreinternedTermRecordPlan|null}, requirements: import('dictionary-importer').ImportRequirement[]|null, progress: {processedRows: number, totalRows: number, chunkIndex: number, chunkCount: number}) => Promise<void>|void} */ (onChunk)(chunkPayload, null, {
                        processedRows: i + 1,
                        totalRows: rowCount,
                        chunkIndex,
                        chunkCount,
                    });
                    importerChunkSinkMs += Math.max(0, Date.now() - tChunkSinkStart);
                    if (directArtifactChunkImport) {
                        chunkRowCount = 0;
                    } else {
                        termList.length = 0;
                    }
                    termRecordPlanBuilder = directArtifactChunkImport ? null : createArtifactTermRecordPreinternedPlanBuilder();
                    if (usePreallocatedTermRecordIndexes) {
                        termRecordExpressionIndexes = new Uint32Array(chunkSize);
                        termRecordReadingIndexes = new Uint32Array(chunkSize);
                        termRecordChunkIndex = 0;
                    } else {
                        termRecordExpressionIndexes = [];
                        termRecordReadingIndexes = [];
                    }
                    chunkUniformContentDictName = void 0;
                    chunkContentDictNames = null;
                }
            } else {
                /** @type {import('dictionary-database').DatabaseTermEntry} */
                const entry = {
                    expression: '',
                    reading: '',
                    readingEqualsExpression: readingMatchesExpression,
                    expressionBytes,
                    readingBytes,
                    expressionReverse: void 0,
                    readingReverse: void 0,
                    definitionTags: null,
                    rules: '',
                    score,
                    glossary: EMPTY_TERM_GLOSSARY,
                    dictionary: dictionaryTitle,
                    termEntryContentHash1: hash1,
                    termEntryContentHash2: hash2,
                    termEntryContentBytes: contentBytes,
                    sequence,
                };
                if (contentDictName !== null) {
                    entry.termEntryContentDictName = contentDictName;
                }
                termList[i] = entry;
            }
        }
        decodeRowsMs = Math.max(0, Date.now() - tDecodeRowsStart);
        if (streamToChunkHandler && (directArtifactChunkImport ? chunkRowCount > 0 : termList.length > 0)) {
            const streamedRowCount = directArtifactChunkImport ? chunkRowCount : termList.length;
            const termRecordPreinternedPlan = termRecordPlanBuilder !== null ?
                termRecordPlanBuilder.buildPlan(termRecordExpressionIndexes, termRecordReadingIndexes, streamedRowCount) :
                null;
            ++chunkIndex;
            const tChunkSinkStart = Date.now();
            /** @type {import('dictionary-database').DatabaseTermEntry[]|{dictionary: string, rowCount: number, dictionaryTotalRows?: number, expressionBytesList: Uint8Array[], readingBytesList: Uint8Array[], readingEqualsExpressionList: boolean[], scoreList: number[], sequenceList: (number|undefined)[], contentBytesList: Uint8Array[], contentHash1List: number[], contentHash2List: number[], contentDictNameList: ((string|null)[]|null), termRecordPreinternedPlan?: import('./term-record-wasm-encoder.js').PreinternedTermRecordPlan|null}} */
            const chunkPayload = directArtifactChunkImport ?
                {
                    dictionary: dictionaryTitle,
                    rowCount: streamedRowCount,
                    dictionaryTotalRows,
                    expressionBytesList: chunkExpressionBytes,
                    readingBytesList: chunkReadingBytes,
                    readingEqualsExpressionList: chunkReadingEqualsExpression,
                    scoreList: chunkScores,
                    sequenceList: chunkSequences,
                    contentBytesList: chunkContentBytes,
                    contentHash1List: chunkContentHash1,
                    contentHash2List: chunkContentHash2,
                    contentDictNameList: chunkContentDictNames,
                    uniformContentDictName: chunkUniformContentDictName,
                    termRecordPreinternedPlan,
                } :
                termList;
            if (!directArtifactChunkImport) {
                if (termRecordPreinternedPlan === null) {
                    throw new Error(`Invalid term artifact payload in '${filename}': missing preinterned plan`);
                }
                setTermRecordPreinternedPlan(termList, termRecordPreinternedPlan);
            }
            await /** @type {(termList: import('dictionary-database').DatabaseTermEntry[]|{dictionary: string, rowCount: number, expressionBytesList: Uint8Array[], readingBytesList: Uint8Array[], readingEqualsExpressionList: boolean[], scoreList: number[], sequenceList: (number|undefined)[], contentBytesList: Uint8Array[], contentDictNameList: ((string|null)[]|null), termRecordPreinternedPlan?: import('./term-record-wasm-encoder.js').PreinternedTermRecordPlan|null}, requirements: import('dictionary-importer').ImportRequirement[]|null, progress: {processedRows: number, totalRows: number, chunkIndex: number, chunkCount: number}) => Promise<void>|void} */ (onChunk)(chunkPayload, null, {
                processedRows: rowCount,
                totalRows: rowCount,
                chunkIndex,
                chunkCount,
            });
            importerChunkSinkMs += Math.max(0, Date.now() - tChunkSinkStart);
            if (directArtifactChunkImport) {
                chunkExpressionBytes = [];
                chunkReadingBytes = [];
                chunkReadingEqualsExpression = [];
                chunkScores = [];
                chunkSequences = [];
                chunkContentBytes = [];
                chunkContentDictNames = null;
            } else {
                termList.length = 0;
            }
        } else if (!streamToChunkHandler) {
            if (termRecordPlanBuilder === null) {
                throw new Error(`Invalid term artifact payload in '${filename}': missing preinterned plan builder`);
            }
            setTermRecordPreinternedPlan(termList, termRecordPlanBuilder.buildPlan(termRecordExpressionIndexes, termRecordReadingIndexes));
        }
        this._lastArtifactTermBankReadProfile = {
            readBytesMs,
            decodeRowsMs,
            reverseRowsMs,
            metadataRebaseMs,
            chunkSinkMs: importerChunkSinkMs,
            chunkCount: streamToChunkHandler ? chunkIndex : 0,
            totalRows: rowCount,
            rowChunkSize: chunkSize,
            readingEqualsExpressionCount,
            sequencePresentCount,
            zeroScoreCount,
            nonZeroScoreCount,
            sharedGlossaryRowCount,
            contentLengthExtendedCount,
            avgContentLength: rowCount > 0 ? (contentLengthTotal / rowCount) : 0,
            avgExpressionLength: rowCount > 0 ? (expressionLengthTotal / rowCount) : 0,
            avgReadingLength: rowCount > 0 ? (readingLengthTotal / rowCount) : 0,
        };
        return {termList: streamToChunkHandler ? [] : termList, requirements: null};
    }

    /**
     * @param {import('dictionary-database').DatabaseTermEntry} entry
     * @param {'baseline'|'raw-bytes'} termContentStorageMode
     * @returns {void}
     */
    _normalizeArtifactTermEntryContent(entry, termContentStorageMode) {
        if (termContentStorageMode !== 'raw-bytes') {
            return;
        }
        const termEntryContentBytes = entry.termEntryContentBytes;
        if (!(termEntryContentBytes instanceof Uint8Array) || termEntryContentBytes.byteLength === 0) {
            return;
        }
        const normalizedBytes = this._normalizeArtifactTermContentBytes(termEntryContentBytes, termContentStorageMode);
        if (normalizedBytes === termEntryContentBytes) {
            return;
        }
        const [hash1, hash2] = this._hashEntryContentBytesPair(normalizedBytes);
        entry.termEntryContentHash1 = hash1;
        entry.termEntryContentHash2 = hash2;
        entry.termEntryContentHash = hashPairToHex(hash1, hash2);
        entry.termEntryContentBytes = normalizedBytes;
        entry.termEntryContentRawGlossaryJsonBytes = void 0;
    }

    /**
     * @param {Uint8Array} termEntryContentBytes
     * @param {'baseline'|'raw-bytes'} termContentStorageMode
     * @returns {Uint8Array}
     */
    _normalizeArtifactTermContentBytes(termEntryContentBytes, termContentStorageMode) {
        if (termContentStorageMode !== 'raw-bytes' || termEntryContentBytes.byteLength === 0) {
            return termEntryContentBytes;
        }
        if (
            decodeRawTermContentBinary(termEntryContentBytes, this._textDecoder) !== null ||
            isRawTermContentSharedGlossaryBinary(termEntryContentBytes)
        ) {
            return termEntryContentBytes;
        }
        try {
            const value = /** @type {{rules?: unknown, definitionTags?: unknown, termTags?: unknown, glossary?: unknown}} */ (
                parseJson(this._textDecoder.decode(termEntryContentBytes))
            );
            const rules = typeof value.rules === 'string' ? value.rules : '';
            const definitionTags = typeof value.definitionTags === 'string' ? value.definitionTags : '';
            const termTags = typeof value.termTags === 'string' ? value.termTags : '';
            const glossaryJsonBytes = this._textEncoder.encode(JSON.stringify(Array.isArray(value.glossary) ? value.glossary : []));
            return encodeRawTermContentBinary(
                rules,
                definitionTags,
                termTags,
                glossaryJsonBytes,
                this._textEncoder,
            );
        } catch (_) {
            return termEntryContentBytes;
        }
    }

    /**
     * @param {Uint8Array} termEntryContentBytes
     * @param {number} sharedGlossaryBaseOffset
     * @returns {{contentBytes: Uint8Array, contentDictName: string|null}}
     */
    _normalizeArtifactTermContent(termEntryContentBytes, sharedGlossaryBaseOffset = 0) {
        let contentBytes = termEntryContentBytes;
        const sharedGlossary = isRawTermContentSharedGlossaryBinary(contentBytes);
        if (sharedGlossary && sharedGlossaryBaseOffset > 0) {
            contentBytes = rebaseRawTermContentSharedGlossaryBinary(contentBytes, sharedGlossaryBaseOffset);
        }
        if (sharedGlossary) {
            return {
                contentBytes,
                contentDictName: RAW_TERM_CONTENT_COMPRESSED_SHARED_GLOSSARY_DICT_NAME,
            };
        }
        if (decodeRawTermContentBinary(contentBytes, this._textDecoder) !== null) {
            return {contentBytes, contentDictName: RAW_TERM_CONTENT_DICT_NAME};
        }
        try {
            const value = /** @type {{rules?: unknown, definitionTags?: unknown, termTags?: unknown, glossary?: unknown}} */ (
                parseJson(this._textDecoder.decode(contentBytes))
            );
            const rules = typeof value.rules === 'string' ? value.rules : '';
            const definitionTags = typeof value.definitionTags === 'string' ? value.definitionTags : '';
            const termTags = typeof value.termTags === 'string' ? value.termTags : '';
            const glossaryJsonBytes = this._textEncoder.encode(JSON.stringify(Array.isArray(value.glossary) ? value.glossary : []));
            return {
                contentBytes: encodeRawTermContentBinary(
                    rules,
                    definitionTags,
                    termTags,
                    glossaryJsonBytes,
                    this._textEncoder,
                ),
                contentDictName: RAW_TERM_CONTENT_DICT_NAME,
            };
        } catch (_) {
            return {contentBytes, contentDictName: null};
        }
    }

    /**
     * @param {string} glossaryJson
     * @returns {boolean}
     */
    _glossaryJsonLikelyContainsMedia(glossaryJson) {
        if (this._glossaryMediaFastScan) {
            return this._glossaryJsonLikelyContainsMediaFast(glossaryJson);
        }
        return /"type"\s*:\s*"image"|"tag"\s*:\s*"img"/.test(glossaryJson);
    }

    /**
     * @param {string} glossaryJson
     * @returns {boolean}
     */
    _glossaryJsonLikelyContainsMediaFast(glossaryJson) {
        const hasTypeImage = glossaryJson.includes('"type"') && glossaryJson.includes('"image"');
        const hasTagImg = glossaryJson.includes('"tag"') && glossaryJson.includes('"img"');
        return hasTypeImage || hasTagImg;
    }

    /**
     * @param {{glossaryJson?: string, glossaryJsonBytes?: Uint8Array}} row
     * @returns {string}
     */
    _getFastRowGlossaryJson(row) {
        if (typeof row.glossaryJson === 'string') {
            return row.glossaryJson;
        }
        if (row.glossaryJsonBytes instanceof Uint8Array) {
            const glossaryJson = this._textDecoder.decode(row.glossaryJsonBytes);
            row.glossaryJson = glossaryJson;
            return glossaryJson;
        }
        return '[]';
    }

    /**
     * @param {import('dictionary-database').DatabaseTermEntry} entry
     * @param {boolean} prefixWildcardsSupported
     */
    _assignPrefixReverseFields(entry, prefixWildcardsSupported) {
        if (!prefixWildcardsSupported) {
            return;
        }
        const expressionReverse = this._reverseString(entry.expression);
        entry.expressionReverse = expressionReverse;
        if (this._reuseExpressionReverseForReading && entry.reading === entry.expression) {
            entry.readingReverse = expressionReverse;
            return;
        }
        entry.readingReverse = this._reverseString(entry.reading);
    }

    /**
     * @param {string} value
     * @returns {string}
     */
    _reverseString(value) {
        if (!this._cacheReverseStrings) {
            return this._fastPrefixReverse ?
                reverseUtf16PreserveSurrogates(value) :
                stringReverse(value);
        }
        const cached = this._reverseStringCache.get(value);
        if (typeof cached === 'string') {
            return cached;
        }
        const reversed = this._fastPrefixReverse ?
            reverseUtf16PreserveSurrogates(value) :
            stringReverse(value);
        if (this._reverseStringCache.size >= this._reverseStringCacheMaxEntries) {
            this._reverseStringCache.clear();
        }
        this._reverseStringCache.set(value, reversed);
        return reversed;
    }

    /**
     * @param {string} glossaryJson
     * @param {string} fileName
     * @returns {import('dictionary-data').TermGlossary[]}
     * @throws {Error}
     */
    _parseGlossaryJsonFromFastRow(glossaryJson, fileName) {
        try {
            const glossary = /** @type {unknown} */ (parseJson(glossaryJson));
            return Array.isArray(glossary) ? glossary : [];
        } catch (error) {
            if (error instanceof Error) {
                throw new Error(error.message + ` in '${fileName}'`);
            }
            throw error;
        }
    }

    /**
     * @param {{termEntryContentBytes?: Uint8Array}} row
     * @param {string} fileName
     * @returns {{rules: string, definitionTags: string, termTags: string, glossary: import('dictionary-data').TermGlossary[]}}
     * @throws {Error}
     */
    _parseTermEntryContentFromFastRow(row, fileName) {
        if (!(row.termEntryContentBytes instanceof Uint8Array) || row.termEntryContentBytes.byteLength === 0) {
            throw new Error(`Invalid precomputed term content in '${fileName}': missing content bytes`);
        }
        const termEntryContentBytes = row.termEntryContentBytes;
        try {
            const rawContent = decodeRawTermContentBinary(termEntryContentBytes, this._textDecoder);
            if (rawContent !== null) {
                return {
                    rules: rawContent.rules,
                    definitionTags: rawContent.definitionTags,
                    termTags: rawContent.termTags,
                    glossary: this._parseGlossaryJsonFromFastRow(rawContent.glossaryJson, fileName),
                };
            }
            const value = /** @type {{rules?: unknown, definitionTags?: unknown, termTags?: unknown, glossary?: unknown}} */ (
                parseJson(this._textDecoder.decode(termEntryContentBytes))
            );
            const rules = typeof value.rules === 'string' ? value.rules : '';
            const definitionTags = typeof value.definitionTags === 'string' ? value.definitionTags : '';
            const termTags = typeof value.termTags === 'string' ? value.termTags : '';
            const glossary = Array.isArray(value.glossary) ? /** @type {import('dictionary-data').TermGlossary[]} */ (value.glossary) : [];
            return {rules, definitionTags, termTags, glossary};
        } catch (error) {
            if (error instanceof Error) {
                throw new Error(error.message + ` in '${fileName}'`);
            }
            throw error;
        }
    }

    /**
     * @param {import('dictionary-database').DatabaseTermMeta[]|import('dictionary-database').DatabaseKanjiMeta[]} metaList
     * @returns {import('dictionary-importer').SummaryMetaCount}
     */
    _getMetaCounts(metaList) {
        /** @type {Map<string, number>} */
        const countsMap = new Map();
        for (const {mode} of metaList) {
            let count = countsMap.get(mode);
            count = typeof count !== 'undefined' ? count + 1 : 1;
            countsMap.set(mode, count);
        }
        /** @type {import('dictionary-importer').SummaryMetaCount} */
        const counts = {total: metaList.length};
        for (const [key, value] of countsMap.entries()) {
            if (Object.prototype.hasOwnProperty.call(counts, key)) { continue; }
            counts[key] = value;
        }
        return counts;
    }

    /**
     * @template [T=unknown]
     * @param {import('@zip.js/zip.js').Entry} entry
     * @param {import('@zip.js/zip.js').Writer<T>|import('@zip.js/zip.js').WritableWriter} writer
     * @returns {Promise<T>}
     */
    async _getData(entry, writer) {
        if (typeof entry.getData === 'undefined') {
            throw new Error(`Cannot read ${entry.filename}`);
        }
        return await entry.getData(writer);
    }

}
