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

const META_U32_FIELDS = 16;
const U8_BACKSLASH = 0x5c;
const U8_QUOTE = 0x22;
const U8_N = 0x6e;
const U8_U = 0x75;
const U8_L = 0x6c;

const CONTENT_META_U32_FIELDS = 4;
const DEFAULT_ROW_CHUNK_SIZE = 2048;

/** @type {Promise<{memory: WebAssembly.Memory, wasm_reset_heap: () => void, wasm_alloc: (size: number) => number, parse_term_bank: (jsonPtr: number, jsonLen: number, outPtr: number, outCapacity: number) => number, encode_term_content: (jsonPtr: number, metasPtr: number, rowCount: number, outPtr: number, outCapacity: number, rowMetaPtr: number) => number}>|null} */
let wasmPromise = null;

/** @type {TextDecoder} */
const textDecoder = new TextDecoder();

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
 * @param {number} h1
 * @param {number} h2
 * @returns {string}
 */
function hashPairToHex(h1, h2) {
    const a = (h1 >>> 0).toString(16).padStart(8, '0');
    const b = (h2 >>> 0).toString(16).padStart(8, '0');
    return `${a}${b}`;
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
    const valueStart = start + 1;
    const valueLength = length - 2;
    let hasEscape = false;
    for (let i = 0; i < valueLength; ++i) {
        if (source[valueStart + i] === U8_BACKSLASH) {
            hasEscape = true;
            break;
        }
    }
    if (!hasEscape) {
        return textDecoder.decode(source.subarray(valueStart, valueStart + valueLength));
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
    const raw = textDecoder.decode(source.subarray(start, start + length));
    const value = Number.parseInt(raw, 10);
    return Number.isFinite(value) ? value : fallback;
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
 * @param {Uint8Array} contentBytes
 * @returns {Promise<{heap: Uint8Array, source: Uint8Array, metas: Uint32Array, contentMetas: Uint32Array, contentOutPtr: number, rowCount: number}>}
 * @throws {Error}
 */
async function parseTermBankWasmBuffers(contentBytes) {
    if (contentBytes.byteLength === 0) {
        return {
            heap: new Uint8Array(0),
            source: new Uint8Array(0),
            metas: new Uint32Array(0),
            contentMetas: new Uint32Array(0),
            contentOutPtr: 0,
            rowCount: 0,
        };
    }
    const wasm = await getWasm();
    wasm.wasm_reset_heap();
    const jsonPtr = wasm.wasm_alloc(contentBytes.byteLength);
    if (jsonPtr === 0) {
        throw new Error('Failed to allocate wasm json buffer');
    }
    new Uint8Array(wasm.memory.buffer).set(contentBytes, jsonPtr);

    let capacity = Math.max(1024, Math.floor(contentBytes.byteLength / 24));
    if (capacity < 8192) { capacity = 8192; }
    let rowCount = -1;
    let outPtr = 0;
    for (let attempt = 0; attempt < 6; ++attempt) {
        outPtr = wasm.wasm_alloc(capacity * META_U32_FIELDS * 4);
        if (outPtr === 0) {
            throw new Error('Failed to allocate wasm term metadata buffer');
        }
        rowCount = wasm.parse_term_bank(jsonPtr, contentBytes.byteLength, outPtr, capacity);
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

    const contentMetaPtr = wasm.wasm_alloc(rowCount * CONTENT_META_U32_FIELDS * 4);
    if (contentMetaPtr === 0) {
        throw new Error('Failed to allocate wasm content metadata buffer');
    }
    let contentOutCapacity = Math.max(contentBytes.byteLength, rowCount * 96);
    let contentOutPtr = 0;
    let encodedContentBytes = -1;
    for (let attempt = 0; attempt < 6; ++attempt) {
        contentOutPtr = wasm.wasm_alloc(contentOutCapacity);
        if (contentOutPtr === 0) {
            throw new Error('Failed to allocate wasm content buffer');
        }
        encodedContentBytes = wasm.encode_term_content(
            jsonPtr,
            outPtr,
            rowCount,
            contentOutPtr,
            contentOutCapacity,
            contentMetaPtr,
        );
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

    const heap = new Uint8Array(wasm.memory.buffer);
    const metas = new Uint32Array(wasm.memory.buffer, outPtr, rowCount * META_U32_FIELDS);
    const contentMetas = new Uint32Array(wasm.memory.buffer, contentMetaPtr, rowCount * CONTENT_META_U32_FIELDS);
    const source = heap.subarray(jsonPtr, jsonPtr + contentBytes.byteLength);
    return {
        heap,
        source,
        metas,
        contentMetas,
        contentOutPtr,
        rowCount,
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
 * @returns {{expression: string, reading: string, definitionTags: string, rules: string, score: number, glossaryJson: string, sequence: number|null, termTags: string, termEntryContentHash: string, termEntryContentBytes: Uint8Array}}
 */
function decodeParsedTermRow(source, metas, contentMetas, heap, contentOutPtr, version, i, copyContentBytes) {
    const o = i * META_U32_FIELDS;
    const c = i * CONTENT_META_U32_FIELDS;
    const expression = decodeJsonStringToken(source, metas[o + 0], metas[o + 1]);
    const reading = decodeJsonStringToken(source, metas[o + 2], metas[o + 3]);
    const definitionTags = decodeNullableJsonStringToken(source, metas[o + 4], metas[o + 5]) ?? '';
    const rules = decodeJsonStringToken(source, metas[o + 6], metas[o + 7]);
    const score = decodeNumberToken(source, metas[o + 8], metas[o + 9], 0);
    const glossaryJson = decodeRawToken(source, metas[o + 10], metas[o + 11]);
    const sequence = version >= 3 ? (isNullToken(source, metas[o + 12], metas[o + 13]) ? null : decodeNumberToken(source, metas[o + 12], metas[o + 13], 0)) : null;
    const termTags = version >= 3 ? (decodeNullableJsonStringToken(source, metas[o + 14], metas[o + 15]) ?? '') : '';
    const contentOffset = contentMetas[c + 0];
    const contentLength = contentMetas[c + 1];
    const hash1 = contentMetas[c + 2];
    const hash2 = contentMetas[c + 3];
    const contentStart = contentOutPtr + contentOffset;
    const contentEnd = contentStart + contentLength;
    const contentSlice = heap.subarray(contentStart, contentEnd);
    const termEntryContentBytes = copyContentBytes ? Uint8Array.from(contentSlice) : contentSlice;
    return {
        expression,
        reading,
        definitionTags,
        rules,
        score,
        glossaryJson,
        sequence,
        termTags,
        termEntryContentHash: hashPairToHex(hash1, hash2),
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
 * @returns {{expression: string, reading: string, definitionTags: string, rules: string, score: number, glossaryJson: string, sequence: number|null, termTags: string, termEntryContentHash: string, termEntryContentBytes: Uint8Array}}
 */
function decodeParsedTermRowMinimal(source, metas, contentMetas, heap, contentOutPtr, version, i, copyContentBytes) {
    const o = i * META_U32_FIELDS;
    const c = i * CONTENT_META_U32_FIELDS;
    const expression = decodeJsonStringToken(source, metas[o + 0], metas[o + 1]);
    const reading = decodeJsonStringToken(source, metas[o + 2], metas[o + 3]);
    const score = decodeNumberToken(source, metas[o + 8], metas[o + 9], 0);
    const sequence = version >= 3 ? (isNullToken(source, metas[o + 12], metas[o + 13]) ? null : decodeNumberToken(source, metas[o + 12], metas[o + 13], 0)) : null;
    const contentOffset = contentMetas[c + 0];
    const contentLength = contentMetas[c + 1];
    const hash1 = contentMetas[c + 2];
    const hash2 = contentMetas[c + 3];
    const contentStart = contentOutPtr + contentOffset;
    const contentEnd = contentStart + contentLength;
    const contentSlice = heap.subarray(contentStart, contentEnd);
    const termEntryContentBytes = copyContentBytes ? Uint8Array.from(contentSlice) : contentSlice;
    return {
        expression,
        reading,
        definitionTags: '',
        rules: '',
        score,
        glossaryJson: '[]',
        sequence,
        termTags: '',
        termEntryContentHash: hashPairToHex(hash1, hash2),
        termEntryContentBytes,
    };
}

/**
 * @param {Uint8Array} contentBytes
 * @param {number} version
 * @param {(rows: {expression: string, reading: string, definitionTags: string, rules: string, score: number, glossaryJson: string, sequence: number|null, termTags: string, termEntryContentHash: string, termEntryContentBytes: Uint8Array}[]) => Promise<void>|void} onChunk
 * @param {number} [chunkSize]
 * @param {{copyContentBytes?: boolean, minimalDecode?: boolean}} [options]
 * @returns {Promise<void>}
 */
export async function parseTermBankWithWasmChunks(contentBytes, version, onChunk, chunkSize = DEFAULT_ROW_CHUNK_SIZE, options = {}) {
    const copyContentBytes = options.copyContentBytes === true;
    const minimalDecode = options.minimalDecode === true;
    const {
        heap,
        source,
        metas,
        contentMetas,
        contentOutPtr,
        rowCount,
    } = await parseTermBankWasmBuffers(contentBytes);
    if (rowCount === 0) {
        return;
    }
    const normalizedChunkSize = Number.isFinite(chunkSize) ? Math.max(1, Math.trunc(chunkSize)) : DEFAULT_ROW_CHUNK_SIZE;
    /** @type {{expression: string, reading: string, definitionTags: string, rules: string, score: number, glossaryJson: string, sequence: number|null, termTags: string, termEntryContentHash: string, termEntryContentBytes: Uint8Array}[]} */
    let rows = [];
    for (let i = 0; i < rowCount; ++i) {
        rows.push(
            minimalDecode ?
                decodeParsedTermRowMinimal(source, metas, contentMetas, heap, contentOutPtr, version, i, copyContentBytes) :
                decodeParsedTermRow(source, metas, contentMetas, heap, contentOutPtr, version, i, copyContentBytes),
        );
        if (rows.length >= normalizedChunkSize) {
            const chunk = rows;
            rows = [];
            await onChunk(chunk);
        }
    }
    if (rows.length > 0) {
        await onChunk(rows);
    }
}

/**
 * @param {Uint8Array} contentBytes
 * @param {number} version
 * @returns {Promise<{expression: string, reading: string, definitionTags: string, rules: string, score: number, glossaryJson: string, sequence: number|null, termTags: string, termEntryContentHash: string, termEntryContentBytes: Uint8Array}[]>}
 */
export async function parseTermBankWithWasm(contentBytes, version) {
    /** @type {{expression: string, reading: string, definitionTags: string, rules: string, score: number, glossaryJson: string, sequence: number|null, termTags: string, termEntryContentHash: string, termEntryContentBytes: Uint8Array}[]} */
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
