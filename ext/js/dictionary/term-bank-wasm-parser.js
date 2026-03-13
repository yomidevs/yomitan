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

import {parseJson} from '../core/json.js';

const META_U32_FIELDS = 16;
const U8_BACKSLASH = 0x5c;
const U8_QUOTE = 0x22;
const U8_N = 0x6e;
const U8_U = 0x75;
const U8_L = 0x6c;

const CONTENT_META_U32_FIELDS = 4;
const DEFAULT_ROW_CHUNK_SIZE = 2048;
const GLOSSARY_MEDIA_MARKER_IMAGE = new Uint8Array([0x22, 0x69, 0x6d, 0x61, 0x67, 0x65, 0x22]); // "image"
const GLOSSARY_MEDIA_MARKER_IMG = new Uint8Array([0x22, 0x69, 0x6d, 0x67, 0x22]); // "img"
const EMPTY_UINT8_ARRAY = new Uint8Array(0);
/** @type {Promise<{memory: WebAssembly.Memory, wasm_reset_heap: () => void, wasm_alloc: (size: number) => number, parse_term_bank: (jsonPtr: number, jsonLen: number, outPtr: number, outCapacity: number) => number, encode_term_content: (jsonPtr: number, metasPtr: number, rowCount: number, outPtr: number, outCapacity: number, rowMetaPtr: number) => number}>|null} */
let wasmPromise = null;

/** @type {TextDecoder} */
const textDecoder = new TextDecoder();
/** @type {{bufferSetupMs: number, allocationMs: number, copyJsonMs: number, parseBankMs: number, encodeContentMs: number, rowDecodeMs: number, chunkDispatchMs: number, rowCount: number, chunkCount: number, chunkSize: number, minimalDecode: boolean, includeContentMetadata: boolean, copyContentBytes: boolean, reuseExpressionForReadingDecode: boolean, skipTagRuleDecode: boolean, lazyGlossaryDecode: boolean, mediaHintFastScan: boolean}|null} */
let lastTermBankWasmParseProfile = null;
/** @type {number} */
let lastSuccessfulMetaCapacity = 0;
/** @type {number} */
let lastSuccessfulContentBytesPerRow = 0;

/**
 * @returns {Promise<{memory: WebAssembly.Memory, wasm_reset_heap: () => void, wasm_alloc: (size: number) => number, parse_term_bank: (jsonPtr: number, jsonLen: number, outPtr: number, outCapacity: number) => number, encode_term_content: (jsonPtr: number, metasPtr: number, rowCount: number, outPtr: number, outCapacity: number, rowMetaPtr: number) => number}>}
 */
async function getWasm() {
    if (wasmPromise !== null) {
        return await wasmPromise;
    }
    wasmPromise = (async () => {
        const url = new URL('../../lib/term-bank-parser.wasm', import.meta.url);
        const response = await fetch(url);
        const bytes = await response.arrayBuffer();
        const instance = await WebAssembly.instantiate(bytes, {});
        const exports = /** @type {WebAssembly.Exports & {memory?: WebAssembly.Memory, wasm_reset_heap?: () => void, wasm_alloc?: (size: number) => number, parse_term_bank?: (jsonPtr: number, jsonLen: number, outPtr: number, outCapacity: number) => number, encode_term_content?: (jsonPtr: number, metasPtr: number, rowCount: number, outPtr: number, outCapacity: number, rowMetaPtr: number) => number}} */ (instance.instance.exports);
        if (
            !(exports.memory instanceof WebAssembly.Memory) ||
            typeof exports.wasm_reset_heap !== 'function' ||
            typeof exports.wasm_alloc !== 'function' ||
            typeof exports.parse_term_bank !== 'function' ||
            typeof exports.encode_term_content !== 'function'
        ) {
            throw new Error('term-bank wasm parser exports are invalid');
        }
        return {
            memory: exports.memory,
            wasm_reset_heap: exports.wasm_reset_heap,
            wasm_alloc: exports.wasm_alloc,
            parse_term_bank: exports.parse_term_bank,
            encode_term_content: exports.encode_term_content,
        };
    })();
    return await wasmPromise;
}

/**
 * @returns {{bufferSetupMs: number, allocationMs: number, copyJsonMs: number, parseBankMs: number, encodeContentMs: number, rowDecodeMs: number, chunkDispatchMs: number, rowCount: number, chunkCount: number, chunkSize: number, minimalDecode: boolean, includeContentMetadata: boolean, copyContentBytes: boolean, reuseExpressionForReadingDecode: boolean, skipTagRuleDecode: boolean, lazyGlossaryDecode: boolean, mediaHintFastScan: boolean}|null}
 */
export function consumeLastTermBankWasmParseProfile() {
    const value = lastTermBankWasmParseProfile;
    lastTermBankWasmParseProfile = null;
    return value;
}

/**
 * @param {Uint8Array} source
 * @param {number} start
 * @param {number} length
 * @returns {string}
 */
function decodeJsonStringToken(source, start, length) {
    if (length < 2 || source[start] !== U8_QUOTE || source[start + length - 1] !== U8_QUOTE) {
        return '';
    }
    if (length === 2) {
        return '';
    }
    const valueStart = start + 1;
    const valueEnd = start + length - 1;
    const valueBytes = source.subarray(valueStart, valueEnd);
    if (!valueBytes.includes(U8_BACKSLASH)) {
        return textDecoder.decode(valueBytes);
    }
    const quoted = textDecoder.decode(source.subarray(start, start + length));
    return /** @type {string} */ (parseJson(quoted));
}

/**
 * @param {Uint8Array} source
 * @param {number} start
 * @param {number} length
 * @returns {string|null}
 */
function decodeNullableJsonStringToken(source, start, length) {
    if (length === 4 && source[start] === U8_N && source[start + 1] === U8_U && source[start + 2] === U8_L && source[start + 3] === U8_L) {
        return null;
    }
    return decodeJsonStringToken(source, start, length);
}

/**
 * @param {Uint8Array} source
 * @param {number} start
 * @param {number} length
 * @returns {boolean}
 */
function isNullToken(source, start, length) {
    return length === 4 && source[start] === U8_N && source[start + 1] === U8_U && source[start + 2] === U8_L && source[start + 3] === U8_L;
}

/**
 * @param {Uint8Array} source
 * @param {number} start
 * @param {number} length
 * @param {number} fallback
 * @returns {number}
 */
function decodeNumberToken(source, start, length, fallback) {
    if (length <= 0) { return fallback; }
    let i = start;
    const end = start + length;
    let sign = 1;
    if (source[i] === 0x2d) { // '-'
        sign = -1;
        ++i;
        if (i >= end) { return fallback; }
    }
    let value = 0;
    let hasDigit = false;
    for (; i < end; ++i) {
        const c = source[i];
        if (c >= 0x30 && c <= 0x39) { // '0'..'9'
            value = (value * 10) + (c - 0x30);
            hasDigit = true;
            continue;
        }
        const raw = textDecoder.decode(source.subarray(start, end));
        const parsed = Number.parseInt(raw, 10);
        return Number.isFinite(parsed) ? parsed : fallback;
    }
    return hasDigit ? (sign * value) : fallback;
}

/**
 * @param {Uint8Array} source
 * @param {number} start
 * @param {number} length
 * @returns {string}
 */
function decodeRawToken(source, start, length) {
    if (length <= 0) { return ''; }
    return textDecoder.decode(source.subarray(start, start + length));
}

/**
 * @param {Uint8Array} source
 * @param {number} start
 * @param {number} length
 * @param {Uint8Array} marker
 * @returns {boolean}
 */
function tokenContainsMarker(source, start, length, marker) {
    const markerLength = marker.length;
    if (markerLength === 0 || length < markerLength) {
        return false;
    }
    const end = start + length - markerLength;
    for (let i = start; i <= end; ++i) {
        let matches = true;
        for (let j = 0; j < markerLength; ++j) {
            if (source[i + j] !== marker[j]) {
                matches = false;
                break;
            }
        }
        if (matches) {
            return true;
        }
    }
    return false;
}

/**
 * @param {Uint8Array} source
 * @param {number} start
 * @param {number} length
 * @returns {boolean}
 */
function glossaryTokenLikelyContainsMedia(source, start, length) {
    const contains = tokenContainsMarker;
    return (
        contains(source, start, length, GLOSSARY_MEDIA_MARKER_IMAGE) ||
        contains(source, start, length, GLOSSARY_MEDIA_MARKER_IMG)
    );
}

/**
 * @param {Uint8Array} source
 * @param {number} startA
 * @param {number} lengthA
 * @param {number} startB
 * @param {number} lengthB
 * @returns {boolean}
 */
function tokenBytesEqual(source, startA, lengthA, startB, lengthB) {
    if (lengthA !== lengthB) { return false; }
    for (let i = 0; i < lengthA; ++i) {
        if (source[startA + i] !== source[startB + i]) {
            return false;
        }
    }
    return true;
}

/**
 * @param {Uint8Array} contentBytes
 * @param {boolean} includeContentMetadata
 * @param {number} initialMetaCapacityDivisor
 * @param {number} initialContentBytesPerRow
 * @returns {Promise<{heap: Uint8Array, source: Uint8Array, metas: Uint32Array, contentMetas: Uint32Array, contentOutPtr: number, rowCount: number, allocationMs: number, copyJsonMs: number, parseBankMs: number, encodeContentMs: number}>}
 * @throws {Error}
 */
async function parseTermBankWasmBuffers(contentBytes, includeContentMetadata, initialMetaCapacityDivisor, initialContentBytesPerRow) {
    if (contentBytes.byteLength === 0) {
        return {
            heap: new Uint8Array(0),
            source: new Uint8Array(0),
            metas: new Uint32Array(0),
            contentMetas: new Uint32Array(0),
            contentOutPtr: 0,
            rowCount: 0,
            allocationMs: 0,
            copyJsonMs: 0,
            parseBankMs: 0,
            encodeContentMs: 0,
        };
    }
    const wasm = await getWasm();
    wasm.wasm_reset_heap();
    let allocationMs = 0;
    let copyJsonMs = 0;
    let parseBankMs = 0;
    let encodeContentMs = 0;
    let tStart = Date.now();
    const jsonPtr = wasm.wasm_alloc(contentBytes.byteLength);
    allocationMs += Math.max(0, Date.now() - tStart);
    if (jsonPtr === 0) {
        throw new Error('Failed to allocate wasm json buffer');
    }
    tStart = Date.now();
    new Uint8Array(wasm.memory.buffer).set(contentBytes, jsonPtr);
    copyJsonMs += Math.max(0, Date.now() - tStart);

    const normalizedMetaCapacityDivisor = Number.isFinite(initialMetaCapacityDivisor) ? Math.max(8, Math.min(128, Math.trunc(initialMetaCapacityDivisor))) : 24;
    let capacity = Math.max(1024, Math.floor(contentBytes.byteLength / normalizedMetaCapacityDivisor));
    if (capacity < 8192) { capacity = 8192; }
    if (lastSuccessfulMetaCapacity > 0) {
        capacity = Math.max(capacity, lastSuccessfulMetaCapacity);
    }
    let rowCount = -1;
    let outPtr = 0;
    for (let attempt = 0; attempt < 6; ++attempt) {
        tStart = Date.now();
        outPtr = wasm.wasm_alloc(capacity * META_U32_FIELDS * 4);
        allocationMs += Math.max(0, Date.now() - tStart);
        if (outPtr === 0) {
            throw new Error('Failed to allocate wasm term metadata buffer');
        }
        tStart = Date.now();
        rowCount = wasm.parse_term_bank(jsonPtr, contentBytes.byteLength, outPtr, capacity);
        parseBankMs += Math.max(0, Date.now() - tStart);
        if (rowCount >= 0) {
            break;
        }
        if (rowCount !== -2) {
            throw new Error(`term-bank parser failed with code ${rowCount}`);
        }
        capacity *= 2;
    }
    if (rowCount < 0) {
        throw new Error(`term-bank parser exhausted capacity (code ${rowCount})`);
    }
    lastSuccessfulMetaCapacity = Math.max(lastSuccessfulMetaCapacity, capacity);

    if (!includeContentMetadata) {
        const heap = new Uint8Array(wasm.memory.buffer);
        const metas = new Uint32Array(wasm.memory.buffer, outPtr, rowCount * META_U32_FIELDS);
        const source = heap.subarray(jsonPtr, jsonPtr + contentBytes.byteLength);
        return {
            heap,
            source,
            metas,
            contentMetas: new Uint32Array(0),
            contentOutPtr: 0,
            rowCount,
            allocationMs,
            copyJsonMs,
            parseBankMs,
            encodeContentMs,
        };
    }

    tStart = Date.now();
    const contentMetaPtr = wasm.wasm_alloc(rowCount * CONTENT_META_U32_FIELDS * 4);
    allocationMs += Math.max(0, Date.now() - tStart);
    if (contentMetaPtr === 0) {
        throw new Error('Failed to allocate wasm content metadata buffer');
    }
    const normalizedInitialContentBytesPerRow = Number.isFinite(initialContentBytesPerRow) ? Math.max(16, Math.min(512, Math.trunc(initialContentBytesPerRow))) : 96;
    let contentOutCapacity = Math.max(contentBytes.byteLength, rowCount * normalizedInitialContentBytesPerRow);
    if (lastSuccessfulContentBytesPerRow > 0) {
        contentOutCapacity = Math.max(contentOutCapacity, rowCount * lastSuccessfulContentBytesPerRow);
    }
    let contentOutPtr = 0;
    let encodedContentBytes = -1;
    for (let attempt = 0; attempt < 6; ++attempt) {
        tStart = Date.now();
        contentOutPtr = wasm.wasm_alloc(contentOutCapacity);
        allocationMs += Math.max(0, Date.now() - tStart);
        if (contentOutPtr === 0) {
            throw new Error('Failed to allocate wasm content buffer');
        }
        tStart = Date.now();
        encodedContentBytes = wasm.encode_term_content(
            jsonPtr,
            outPtr,
            rowCount,
            contentOutPtr,
            contentOutCapacity,
            contentMetaPtr,
        );
        encodeContentMs += Math.max(0, Date.now() - tStart);
        if (encodedContentBytes >= 0) {
            break;
        }
        if (encodedContentBytes !== -2) {
            throw new Error(`term-content encoder failed with code ${encodedContentBytes}`);
        }
        contentOutCapacity *= 2;
    }
    if (encodedContentBytes < 0) {
        throw new Error(`term-content encoder exhausted capacity (code ${encodedContentBytes})`);
    }
    if (rowCount > 0) {
        const nextContentBytesPerRow = Math.max(
            normalizedInitialContentBytesPerRow,
            Math.ceil(encodedContentBytes / rowCount) + 8,
        );
        lastSuccessfulContentBytesPerRow = Math.max(lastSuccessfulContentBytesPerRow, nextContentBytesPerRow);
    }

    const heap = new Uint8Array(wasm.memory.buffer);
    const metas = new Uint32Array(wasm.memory.buffer, outPtr, rowCount * META_U32_FIELDS);
    const source = heap.subarray(jsonPtr, jsonPtr + contentBytes.byteLength);
    const contentMetas = new Uint32Array(wasm.memory.buffer, contentMetaPtr, rowCount * CONTENT_META_U32_FIELDS);
    return {
        heap,
        source,
        metas,
        contentMetas,
        contentOutPtr,
        rowCount,
        allocationMs,
        copyJsonMs,
        parseBankMs,
        encodeContentMs,
    };
}

/**
 * @param {Uint8Array} source
 * @param {Uint32Array} metas
 * @param {Uint32Array} contentMetas
 * @param {Uint8Array} heap
 * @param {number} contentOutPtr
 * @param {number} version
 * @param {number} i
 * @param {boolean} copyContentBytes
 * @param {boolean} includeContentMetadata
 * @param {boolean} reuseExpressionForReadingDecode
 * @param {boolean} skipTagRuleDecode
 * @param {boolean} lazyGlossaryDecode
 * @param {boolean} mediaHintFastScan
 * @returns {{expression: string, reading: string, definitionTags: string, rules: string, score: number, glossaryJson: string, glossaryJsonBytes?: Uint8Array, glossaryMayContainMedia?: boolean, sequence: number|null, termTags: string, termEntryContentHash1?: number, termEntryContentHash2?: number, termEntryContentBytes: Uint8Array}}
 */
function decodeParsedTermRow(source, metas, contentMetas, heap, contentOutPtr, version, i, copyContentBytes, includeContentMetadata, reuseExpressionForReadingDecode, skipTagRuleDecode, lazyGlossaryDecode, mediaHintFastScan) {
    const o = i * META_U32_FIELDS;
    const c = i * CONTENT_META_U32_FIELDS;
    const expressionStart = metas[o + 0];
    const expressionLength = metas[o + 1];
    const readingStart = metas[o + 2];
    const readingLength = metas[o + 3];
    const expression = decodeJsonStringToken(source, expressionStart, expressionLength);
    const reuseExpressionReading = (
        reuseExpressionForReadingDecode &&
        tokenBytesEqual(source, expressionStart, expressionLength, readingStart, readingLength)
    );
    const reading = reuseExpressionReading ?
        expression :
        decodeJsonStringToken(source, readingStart, readingLength);
    const definitionTags = skipTagRuleDecode ? '' : (decodeNullableJsonStringToken(source, metas[o + 4], metas[o + 5]) ?? '');
    const rules = skipTagRuleDecode ? '' : decodeJsonStringToken(source, metas[o + 6], metas[o + 7]);
    const score = decodeNumberToken(source, metas[o + 8], metas[o + 9], 0);
    const glossaryStart = metas[o + 10];
    const glossaryLength = metas[o + 11];
    const glossaryJsonBytes = source.subarray(glossaryStart, glossaryStart + glossaryLength);
    const glossaryJson = lazyGlossaryDecode ? '' : decodeRawToken(source, glossaryStart, glossaryLength);
    const glossaryMayContainMedia = mediaHintFastScan ? glossaryTokenLikelyContainsMedia(source, glossaryStart, glossaryLength) : void 0;
    const sequence = version >= 3 ? (isNullToken(source, metas[o + 12], metas[o + 13]) ? null : decodeNumberToken(source, metas[o + 12], metas[o + 13], 0)) : null;
    const termTags = skipTagRuleDecode ? '' : (version >= 3 ? (decodeNullableJsonStringToken(source, metas[o + 14], metas[o + 15]) ?? '') : '');
    let termEntryContentHash1;
    let termEntryContentHash2;
    let termEntryContentBytes = EMPTY_UINT8_ARRAY;
    if (includeContentMetadata) {
        const contentOffset = contentMetas[c + 0];
        const contentLength = contentMetas[c + 1];
        const hash1 = contentMetas[c + 2];
        const hash2 = contentMetas[c + 3];
        const contentStart = contentOutPtr + contentOffset;
        const contentEnd = contentStart + contentLength;
        const contentSlice = heap.subarray(contentStart, contentEnd);
        termEntryContentBytes = copyContentBytes ? Uint8Array.from(contentSlice) : contentSlice;
        termEntryContentHash1 = hash1 >>> 0;
        termEntryContentHash2 = hash2 >>> 0;
    }
    return {
        expression,
        reading,
        definitionTags,
        rules,
        score,
        glossaryJson,
        glossaryJsonBytes: lazyGlossaryDecode ? glossaryJsonBytes : void 0,
        glossaryMayContainMedia,
        sequence,
        termTags,
        termEntryContentHash1,
        termEntryContentHash2,
        termEntryContentBytes,
    };
}

/**
 * @param {Uint8Array} source
 * @param {Uint32Array} metas
 * @param {Uint32Array} contentMetas
 * @param {Uint8Array} heap
 * @param {number} contentOutPtr
 * @param {number} version
 * @param {number} i
 * @param {boolean} copyContentBytes
 * @param {boolean} includeContentMetadata
 * @param {boolean} reuseExpressionForReadingDecode
 * @returns {{expression: string, reading: string, definitionTags: string, rules: string, score: number, glossaryJson: string, glossaryJsonBytes?: Uint8Array, glossaryMayContainMedia?: boolean, sequence: number|null, termTags: string, termEntryContentHash1?: number, termEntryContentHash2?: number, termEntryContentBytes: Uint8Array}}
 */
function decodeParsedTermRowMinimal(source, metas, contentMetas, heap, contentOutPtr, version, i, copyContentBytes, includeContentMetadata, reuseExpressionForReadingDecode) {
    const o = i * META_U32_FIELDS;
    const c = i * CONTENT_META_U32_FIELDS;
    const expressionStart = metas[o + 0];
    const expressionLength = metas[o + 1];
    const readingStart = metas[o + 2];
    const readingLength = metas[o + 3];
    const expression = decodeJsonStringToken(source, expressionStart, expressionLength);
    const reuseExpressionReading = (
        reuseExpressionForReadingDecode &&
        tokenBytesEqual(source, expressionStart, expressionLength, readingStart, readingLength)
    );
    const reading = reuseExpressionReading ?
        expression :
        decodeJsonStringToken(source, readingStart, readingLength);
    const score = decodeNumberToken(source, metas[o + 8], metas[o + 9], 0);
    const sequence = version >= 3 ? (isNullToken(source, metas[o + 12], metas[o + 13]) ? null : decodeNumberToken(source, metas[o + 12], metas[o + 13], 0)) : null;
    let termEntryContentHash1;
    let termEntryContentHash2;
    let termEntryContentBytes = EMPTY_UINT8_ARRAY;
    if (includeContentMetadata) {
        const contentOffset = contentMetas[c + 0];
        const contentLength = contentMetas[c + 1];
        const hash1 = contentMetas[c + 2];
        const hash2 = contentMetas[c + 3];
        const contentStart = contentOutPtr + contentOffset;
        const contentEnd = contentStart + contentLength;
        const contentSlice = heap.subarray(contentStart, contentEnd);
        termEntryContentBytes = copyContentBytes ? Uint8Array.from(contentSlice) : contentSlice;
        termEntryContentHash1 = hash1 >>> 0;
        termEntryContentHash2 = hash2 >>> 0;
    }
    return {
        expression,
        reading,
        definitionTags: '',
        rules: '',
        score,
        glossaryJson: '[]',
        sequence,
        termTags: '',
        termEntryContentHash1,
        termEntryContentHash2,
        termEntryContentBytes,
    };
}

/**
 * @param {Uint8Array} contentBytes
 * @param {number} version
 * @param {(rows: {expression: string, reading: string, definitionTags: string, rules: string, score: number, glossaryJson: string, glossaryJsonBytes?: Uint8Array, glossaryMayContainMedia?: boolean, sequence: number|null, termTags: string, termEntryContentHash1?: number, termEntryContentHash2?: number, termEntryContentBytes: Uint8Array}[], progress: {processedRows: number, totalRows: number, chunkIndex: number, chunkCount: number}) => Promise<void>|void} onChunk
 * @param {number} [chunkSize]
 * @param {{copyContentBytes?: boolean, includeContentMetadata?: boolean, initialMetaCapacityDivisor?: number, initialContentBytesPerRow?: number, minimalDecode?: boolean, reuseExpressionForReadingDecode?: boolean, skipTagRuleDecode?: boolean, lazyGlossaryDecode?: boolean, mediaHintFastScan?: boolean, preallocateChunkRows?: boolean}} [options]
 * @returns {Promise<void>}
 */
export async function parseTermBankWithWasmChunks(contentBytes, version, onChunk, chunkSize = DEFAULT_ROW_CHUNK_SIZE, options = {}) {
    const copyContentBytes = options.copyContentBytes === true;
    const includeContentMetadata = options.includeContentMetadata !== false;
    const initialMetaCapacityDivisor = Number.isFinite(options.initialMetaCapacityDivisor) ? /** @type {number} */ (options.initialMetaCapacityDivisor) : 24;
    const initialContentBytesPerRow = Number.isFinite(options.initialContentBytesPerRow) ? /** @type {number} */ (options.initialContentBytesPerRow) : 96;
    const minimalDecode = options.minimalDecode === true;
    const reuseExpressionForReadingDecode = options.reuseExpressionForReadingDecode === true;
    const skipTagRuleDecode = options.skipTagRuleDecode === true;
    const lazyGlossaryDecode = options.lazyGlossaryDecode === true;
    const mediaHintFastScan = options.mediaHintFastScan === true;
    const preallocateChunkRows = options.preallocateChunkRows === true;
    const tBufferSetupStart = Date.now();
    const {
        heap,
        source,
        metas,
        contentMetas,
        contentOutPtr,
        rowCount,
        allocationMs,
        copyJsonMs,
        parseBankMs,
        encodeContentMs,
    } = await parseTermBankWasmBuffers(
        contentBytes,
        includeContentMetadata,
        initialMetaCapacityDivisor,
        initialContentBytesPerRow,
    );
    const bufferSetupMs = Math.max(0, Date.now() - tBufferSetupStart);
    if (rowCount === 0) {
        lastTermBankWasmParseProfile = {
            bufferSetupMs,
            allocationMs,
            copyJsonMs,
            parseBankMs,
            encodeContentMs,
            rowDecodeMs: 0,
            chunkDispatchMs: 0,
            rowCount: 0,
            chunkCount: 0,
            chunkSize: 0,
            minimalDecode,
            includeContentMetadata,
            copyContentBytes,
            reuseExpressionForReadingDecode,
            skipTagRuleDecode,
            lazyGlossaryDecode,
            mediaHintFastScan,
        };
        return;
    }
    const normalizedChunkSize = Number.isFinite(chunkSize) ? Math.max(1, Math.trunc(chunkSize)) : DEFAULT_ROW_CHUNK_SIZE;
    const chunkCount = Math.max(1, Math.ceil(rowCount / normalizedChunkSize));
    /**
     * @param {number} size
     * @returns {{expression: string, reading: string, definitionTags: string, rules: string, score: number, glossaryJson: string, glossaryJsonBytes?: Uint8Array, glossaryMayContainMedia?: boolean, sequence: number|null, termTags: string, termEntryContentHash1?: number, termEntryContentHash2?: number, termEntryContentBytes: Uint8Array}[]}
     */
    const createRowBuffer = (size) => /** @type {{expression: string, reading: string, definitionTags: string, rules: string, score: number, glossaryJson: string, glossaryJsonBytes?: Uint8Array, glossaryMayContainMedia?: boolean, sequence: number|null, termTags: string, termEntryContentHash1?: number, termEntryContentHash2?: number, termEntryContentBytes: Uint8Array}[]} */ (new Array(size));
    /** @type {{expression: string, reading: string, definitionTags: string, rules: string, score: number, glossaryJson: string, glossaryJsonBytes?: Uint8Array, glossaryMayContainMedia?: boolean, sequence: number|null, termTags: string, termEntryContentHash1?: number, termEntryContentHash2?: number, termEntryContentBytes: Uint8Array}[]} */
    let rows = preallocateChunkRows ? createRowBuffer(Math.min(normalizedChunkSize, rowCount)) : [];
    let rowsIndex = 0;
    let chunkIndex = 0;
    let rowDecodeMs = 0;
    let chunkDispatchMs = 0;
    for (let i = 0; i < rowCount; ++i) {
        const tDecodeStart = Date.now();
        const row = minimalDecode ?
            decodeParsedTermRowMinimal(source, metas, contentMetas, heap, contentOutPtr, version, i, copyContentBytes, includeContentMetadata, reuseExpressionForReadingDecode) :
            decodeParsedTermRow(source, metas, contentMetas, heap, contentOutPtr, version, i, copyContentBytes, includeContentMetadata, reuseExpressionForReadingDecode, skipTagRuleDecode, lazyGlossaryDecode, mediaHintFastScan);
        rowDecodeMs += Math.max(0, Date.now() - tDecodeStart);
        if (preallocateChunkRows) {
            rows[rowsIndex] = row;
            ++rowsIndex;
        } else {
            rows.push(row);
            rowsIndex = rows.length;
        }
        if (rowsIndex >= normalizedChunkSize) {
            const chunk = rows;
            rows = preallocateChunkRows ? createRowBuffer(Math.min(normalizedChunkSize, rowCount - (i + 1))) : [];
            rowsIndex = 0;
            ++chunkIndex;
            const tDispatchStart = Date.now();
            await onChunk(chunk, {
                processedRows: i + 1,
                totalRows: rowCount,
                chunkIndex,
                chunkCount,
            });
            chunkDispatchMs += Math.max(0, Date.now() - tDispatchStart);
        }
    }
    if (rowsIndex > 0) {
        if (preallocateChunkRows) {
            rows.length = rowsIndex;
        }
        ++chunkIndex;
        const tDispatchStart = Date.now();
        await onChunk(rows, {
            processedRows: rowCount,
            totalRows: rowCount,
            chunkIndex,
            chunkCount,
        });
        chunkDispatchMs += Math.max(0, Date.now() - tDispatchStart);
    }
    lastTermBankWasmParseProfile = {
        bufferSetupMs,
        allocationMs,
        copyJsonMs,
        parseBankMs,
        encodeContentMs,
        rowDecodeMs,
        chunkDispatchMs,
        rowCount,
        chunkCount,
        chunkSize: normalizedChunkSize,
        minimalDecode,
        includeContentMetadata,
        copyContentBytes,
        reuseExpressionForReadingDecode,
        skipTagRuleDecode,
        lazyGlossaryDecode,
        mediaHintFastScan,
    };
}

/**
 * @param {Uint8Array} contentBytes
 * @param {number} version
 * @returns {Promise<{expression: string, reading: string, definitionTags: string, rules: string, score: number, glossaryJson: string, sequence: number|null, termTags: string, termEntryContentHash1?: number, termEntryContentHash2?: number, termEntryContentBytes: Uint8Array}[]>}
 */
export async function parseTermBankWithWasm(contentBytes, version) {
    /** @type {{expression: string, reading: string, definitionTags: string, rules: string, score: number, glossaryJson: string, sequence: number|null, termTags: string, termEntryContentHash1?: number, termEntryContentHash2?: number, termEntryContentBytes: Uint8Array}[]} */
    const rows = [];
    await parseTermBankWithWasmChunks(
        contentBytes,
        version,
        (chunk) => {
            rows.push(...chunk);
        },
        DEFAULT_ROW_CHUNK_SIZE,
        {copyContentBytes: true},
    );
    return rows;
}
