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

const META_U32_FIELDS = 17;
const META_BYTES = META_U32_FIELDS * 4;
const U32_NULL = 0xffffffff;

/** @type {Promise<{memory: WebAssembly.Memory, wasm_reset_heap: () => void, wasm_alloc: (size: number) => number, calc_encoded_size: (count: number, metasPtr: number) => number, encode_records: (count: number, metasPtr: number, stringsPtr: number, outPtr: number) => number}>|null} */
let wasmPromise = null;

/**
 * @returns {Promise<{memory: WebAssembly.Memory, wasm_reset_heap: () => void, wasm_alloc: (size: number) => number, calc_encoded_size: (count: number, metasPtr: number) => number, encode_records: (count: number, metasPtr: number, stringsPtr: number, outPtr: number) => number}>}
 */
async function getWasm() {
    if (wasmPromise !== null) {
        return await wasmPromise;
    }
    wasmPromise = (async () => {
        const url = new URL('../../lib/term-record-encoder.wasm', import.meta.url);
        const response = await fetch(url);
        const bytes = await response.arrayBuffer();
        const instance = await WebAssembly.instantiate(bytes, {});
        const exports = /** @type {WebAssembly.Exports & {memory?: WebAssembly.Memory, wasm_reset_heap?: () => void, wasm_alloc?: (size: number) => number, calc_encoded_size?: (count: number, metasPtr: number) => number, encode_records?: (count: number, metasPtr: number, stringsPtr: number, outPtr: number) => number}} */ (instance.instance.exports);
        if (!(exports.memory instanceof WebAssembly.Memory) || typeof exports.wasm_reset_heap !== 'function' || typeof exports.wasm_alloc !== 'function' || typeof exports.calc_encoded_size !== 'function' || typeof exports.encode_records !== 'function') {
            throw new Error('term-record wasm encoder exports are invalid');
        }
        return {
            memory: exports.memory,
            wasm_reset_heap: exports.wasm_reset_heap,
            wasm_alloc: exports.wasm_alloc,
            calc_encoded_size: exports.calc_encoded_size,
            encode_records: exports.encode_records,
        };
    })();
    return await wasmPromise;
}

/**
 * @param {{id: number, dictionary: string, expression: string, reading: string, expressionReverse: string|null, readingReverse: string|null, entryContentOffset: number, entryContentLength: number, entryContentDictName: string, score: number, sequence: number|null}[]} records
 * @param {TextEncoder} textEncoder
 * @returns {Promise<Uint8Array|null>}
 */
export async function encodeTermRecordsWithWasm(records, textEncoder) {
    if (records.length === 0) {
        return new Uint8Array(0);
    }
    const wasm = await getWasm();

    const metasBuffer = new ArrayBuffer(records.length * META_BYTES);
    const metasU32 = new Uint32Array(metasBuffer);
    const metasI32 = new Int32Array(metasBuffer);
    /** @type {Uint8Array[]} */
    const stringChunks = [];
    let stringsTotal = 0;
    /** @type {Map<string, {off: number, len: number}>} */
    const encodedStringCache = new Map();

    /**
     * @param {string} value
     * @returns {{off: number, len: number}}
     */
    const internString = (value) => {
        const cached = encodedStringCache.get(value);
        if (typeof cached !== 'undefined') {
            return cached;
        }
        const bytes = textEncoder.encode(value);
        const out = {off: stringsTotal, len: bytes.byteLength};
        stringsTotal += bytes.byteLength;
        stringChunks.push(bytes);
        encodedStringCache.set(value, out);
        return out;
    };

    let recordIndex = 0;
    for (const record of records) {
        const dictionary = internString(record.dictionary);
        const expression = internString(record.expression);
        const reading = internString(record.reading);
        const expressionReverse = record.expressionReverse !== null ? internString(record.expressionReverse) : null;
        const readingReverse = record.readingReverse !== null ? internString(record.readingReverse) : null;
        const dictName = internString(record.entryContentDictName);
        const metaIndex = recordIndex * META_U32_FIELDS;
        metasU32[metaIndex + 0] = record.id >>> 0;
        metasU32[metaIndex + 1] = dictionary.off >>> 0;
        metasU32[metaIndex + 2] = dictionary.len >>> 0;
        metasU32[metaIndex + 3] = expression.off >>> 0;
        metasU32[metaIndex + 4] = expression.len >>> 0;
        metasU32[metaIndex + 5] = reading.off >>> 0;
        metasU32[metaIndex + 6] = reading.len >>> 0;
        metasU32[metaIndex + 7] = expressionReverse?.off ?? U32_NULL;
        metasU32[metaIndex + 8] = expressionReverse?.len ?? U32_NULL;
        metasU32[metaIndex + 9] = readingReverse?.off ?? U32_NULL;
        metasU32[metaIndex + 10] = readingReverse?.len ?? U32_NULL;
        metasI32[metaIndex + 11] = record.entryContentOffset | 0;
        metasI32[metaIndex + 12] = record.entryContentLength | 0;
        metasU32[metaIndex + 13] = dictName.off >>> 0;
        metasU32[metaIndex + 14] = dictName.len >>> 0;
        metasI32[metaIndex + 15] = record.score | 0;
        metasI32[metaIndex + 16] = record.sequence ?? -1;
        ++recordIndex;
    }

    const stringsBuffer = new Uint8Array(stringsTotal);
    let stringsCursor = 0;
    for (const chunk of stringChunks) {
        stringsBuffer.set(chunk, stringsCursor);
        stringsCursor += chunk.byteLength;
    }

    wasm.wasm_reset_heap();
    const metasPtr = wasm.wasm_alloc(metasBuffer.byteLength);
    const stringsPtr = wasm.wasm_alloc(stringsBuffer.byteLength);
    if (metasPtr === 0 || stringsPtr === 0) {
        return null;
    }
    const wasmHeap = new Uint8Array(wasm.memory.buffer);
    wasmHeap.set(new Uint8Array(metasBuffer), metasPtr);
    wasmHeap.set(stringsBuffer, stringsPtr);

    const encodedSize = wasm.calc_encoded_size(records.length, metasPtr);
    if (encodedSize <= 0) {
        return new Uint8Array(0);
    }
    const outPtr = wasm.wasm_alloc(encodedSize);
    if (outPtr === 0) {
        return null;
    }
    const written = wasm.encode_records(records.length, metasPtr, stringsPtr, outPtr);
    if (written <= 0) {
        return new Uint8Array(0);
    }
    const heapAfterEncode = new Uint8Array(wasm.memory.buffer);
    return heapAfterEncode.slice(outPtr, outPtr + written);
}
