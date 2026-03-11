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

const META_U32_FIELDS = 15;
const META_BYTES = META_U32_FIELDS * 4;
const U32_NULL = 0xffffffff;

/** @type {Promise<{memory: WebAssembly.Memory, wasm_reset_heap: () => void, wasm_alloc: (size: number) => number, calc_encoded_size: (count: number, metasPtr: number) => number, encode_records: (count: number, metasPtr: number, stringsPtr: number, outPtr: number) => number}>|null} */
let wasmPromise = null;

/**
 * @param {TextEncoder} textEncoder
 * @returns {{stringOffsets: number[], stringLengths: number[], internString: (value: string) => number, buildStringsBuffer: () => Uint8Array}}
 */
function createStringInterner(textEncoder) {
    let stringsTotal = 0;
    let stringsCapacity = 64 * 1024;
    let stringsBuffer = new Uint8Array(stringsCapacity);
    /** @type {Map<string, number>} */
    const encodedStringIndexByValue = new Map();
    /** @type {number[]} */
    const stringOffsets = [];
    /** @type {number[]} */
    const stringLengths = [];

    /**
     * @param {number} requiredCapacity
     * @returns {void}
     */
    const ensureCapacity = (requiredCapacity) => {
        if (requiredCapacity <= stringsCapacity) {
            return;
        }
        let nextCapacity = stringsCapacity;
        while (nextCapacity < requiredCapacity) {
            nextCapacity *= 2;
        }
        const nextBuffer = new Uint8Array(nextCapacity);
        nextBuffer.set(stringsBuffer.subarray(0, stringsTotal));
        stringsBuffer = nextBuffer;
        stringsCapacity = nextCapacity;
    };

    /**
     * @param {string} value
     * @returns {number}
     */
    const internString = (value) => {
        const cachedIndex = encodedStringIndexByValue.get(value);
        if (typeof cachedIndex === 'number') {
            return cachedIndex;
        }
        const index = stringOffsets.length;
        const offset = stringsTotal;
        ensureCapacity(offset + (value.length * 3));
        const {written = 0} = textEncoder.encodeInto(value, stringsBuffer.subarray(offset));
        stringOffsets.push(stringsTotal);
        stringLengths.push(written);
        stringsTotal += written;
        encodedStringIndexByValue.set(value, index);
        return index;
    };

    return {
        stringOffsets,
        stringLengths,
        internString,
        buildStringsBuffer: () => stringsBuffer.subarray(0, stringsTotal),
    };
}

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
    const {stringOffsets, stringLengths, internString, buildStringsBuffer} = createStringInterner(textEncoder);
    const firstRecord = records[0];
    const sharedDictNameIndex = internString(firstRecord.entryContentDictName);

    let recordIndex = 0;
    for (const record of records) {
        const expressionIndex = internString(record.expression);
        const readingIndex = record.reading === record.expression ? expressionIndex : internString(record.reading);
        const expressionReverseIndex = record.expressionReverse !== null ? internString(record.expressionReverse) : -1;
        const readingReverseIndex = (
            record.readingReverse !== null &&
            record.expressionReverse !== null &&
            record.readingReverse === record.expressionReverse
        ) ?
            expressionReverseIndex :
            (record.readingReverse !== null ? internString(record.readingReverse) : -1);
        const dictNameIndex = record.entryContentDictName === firstRecord.entryContentDictName ? sharedDictNameIndex : internString(record.entryContentDictName);
        const metaIndex = recordIndex * META_U32_FIELDS;
        metasU32[metaIndex + 0] = record.id >>> 0;
        metasU32[metaIndex + 1] = stringOffsets[expressionIndex] >>> 0;
        metasU32[metaIndex + 2] = stringLengths[expressionIndex] >>> 0;
        metasU32[metaIndex + 3] = stringOffsets[readingIndex] >>> 0;
        metasU32[metaIndex + 4] = stringLengths[readingIndex] >>> 0;
        metasU32[metaIndex + 5] = expressionReverseIndex >= 0 ? (stringOffsets[expressionReverseIndex] >>> 0) : U32_NULL;
        metasU32[metaIndex + 6] = expressionReverseIndex >= 0 ? (stringLengths[expressionReverseIndex] >>> 0) : U32_NULL;
        metasU32[metaIndex + 7] = readingReverseIndex >= 0 ? (stringOffsets[readingReverseIndex] >>> 0) : U32_NULL;
        metasU32[metaIndex + 8] = readingReverseIndex >= 0 ? (stringLengths[readingReverseIndex] >>> 0) : U32_NULL;
        metasI32[metaIndex + 9] = record.entryContentOffset | 0;
        metasI32[metaIndex + 10] = record.entryContentLength | 0;
        metasU32[metaIndex + 11] = stringOffsets[dictNameIndex] >>> 0;
        metasU32[metaIndex + 12] = stringLengths[dictNameIndex] >>> 0;
        metasI32[metaIndex + 13] = record.score | 0;
        metasI32[metaIndex + 14] = record.sequence ?? -1;
        ++recordIndex;
    }
    const stringsBuffer = buildStringsBuffer();
    wasm.wasm_reset_heap();
    const metasPtr = wasm.wasm_alloc(metasBuffer.byteLength);
    const stringsPtr = wasm.wasm_alloc(stringsBuffer.byteLength);
    if (metasPtr === 0 || stringsPtr === 0) {
        return null;
    }
    const wasmHeapAfterAlloc = new Uint8Array(wasm.memory.buffer);
    wasmHeapAfterAlloc.set(new Uint8Array(metasBuffer), metasPtr);
    wasmHeapAfterAlloc.set(stringsBuffer, stringsPtr);

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
