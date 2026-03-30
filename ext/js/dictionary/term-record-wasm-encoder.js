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

const META_U32_FIELDS = 6;
const META_BYTES = META_U32_FIELDS * 4;
const U16_NULL = 0xffff;
const READING_EQUALS_EXPRESSION_U32 = 0xffffffff;

/** @type {Promise<{memory: WebAssembly.Memory, wasm_reset_heap: () => void, wasm_alloc: (size: number) => number, calc_encoded_size: (count: number, stringCount: number, lengthsPtr: number, stringsByteLength: number, metasPtr: number) => number, encode_records: (count: number, stringCount: number, lengthsPtr: number, stringsPtr: number, stringsByteLength: number, metasPtr: number, outPtr: number) => number}>|null} */
let wasmPromise = null;

/**
 * @typedef {{
 *   stringLengths: Uint16Array,
 *   stringsBuffer: Uint8Array,
 *   expressionIndexes: Uint32Array,
 *   readingIndexes: Uint32Array,
 * }} PreinternedTermRecordPlan
 */

/**
 * @param {TextEncoder} textEncoder
 * @returns {{stringOffsets: number[], stringLengths: number[], internString: (value: string) => number, internStringBytes: (value: string, bytes: Uint8Array) => number, buildStringsBuffer: () => Uint8Array}}
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

    /**
     * @param {string} value
     * @param {Uint8Array} bytes
     * @returns {number}
     */
    const internStringBytes = (value, bytes) => {
        const cachedIndex = encodedStringIndexByValue.get(value);
        if (typeof cachedIndex === 'number') {
            return cachedIndex;
        }
        const index = stringOffsets.length;
        const offset = stringsTotal;
        ensureCapacity(offset + bytes.byteLength);
        stringsBuffer.set(bytes, offset);
        stringOffsets.push(stringsTotal);
        stringLengths.push(bytes.byteLength);
        stringsTotal += bytes.byteLength;
        encodedStringIndexByValue.set(value, index);
        return index;
    };

    return {
        stringOffsets,
        stringLengths,
        internString,
        internStringBytes,
        buildStringsBuffer: () => stringsBuffer.subarray(0, stringsTotal),
    };
}

/**
 * @returns {Promise<{memory: WebAssembly.Memory, wasm_reset_heap: () => void, wasm_alloc: (size: number) => number, calc_encoded_size: (count: number, stringCount: number, lengthsPtr: number, stringsByteLength: number, metasPtr: number) => number, encode_records: (count: number, stringCount: number, lengthsPtr: number, stringsPtr: number, stringsByteLength: number, metasPtr: number, outPtr: number) => number}>}
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
 * @param {{id: number, dictionary: string, expression?: string, reading?: string, readingEqualsExpression?: boolean, expressionBytes?: Uint8Array, readingBytes?: Uint8Array, expressionReverse?: string|null, readingReverse?: string|null, entryContentOffset: number, entryContentLength: number, entryContentDictName: string, score: number, sequence: number|null}[]} records
 * @param {TextEncoder} textEncoder
 * @returns {Promise<Uint8Array|null>}
 */
export async function encodeTermRecordsWithWasm(records, textEncoder) {
    return await encodeTermRecordsWithWasmPreinterned(records, textEncoder, null);
}

/**
 * @param {{id: number, dictionary: string, expression?: string, reading?: string, readingEqualsExpression?: boolean, expressionBytes?: Uint8Array, readingBytes?: Uint8Array, expressionReverse?: string|null, readingReverse?: string|null, entryContentOffset: number, entryContentLength: number, entryContentDictName: string, score: number, sequence: number|null}[]} records
 * @param {TextEncoder} textEncoder
 * @param {PreinternedTermRecordPlan|null} preinternedPlan
 * @returns {Promise<Uint8Array|null>}
 */
export async function encodeTermRecordsWithWasmPreinterned(records, textEncoder, preinternedPlan) {
    if (records.length === 0) {
        return new Uint8Array(0);
    }
    const wasm = await getWasm();

    const metasBuffer = new ArrayBuffer(records.length * META_BYTES);
    const metasU32 = new Uint32Array(metasBuffer);
    const metasI32 = new Int32Array(metasBuffer);
    const {stringLengths, internString, internStringBytes, buildStringsBuffer} = createStringInterner(textEncoder);
    const planExpressionIndexes = preinternedPlan?.expressionIndexes ?? null;
    const planReadingIndexes = preinternedPlan?.readingIndexes ?? null;
    let recordIndex = 0;
    for (const record of records) {
        const expression = record.expression ?? '';
        const reading = record.reading ?? expression;
        let expressionIndex;
        if (planExpressionIndexes instanceof Uint32Array) {
            expressionIndex = planExpressionIndexes[recordIndex];
        } else if (record.expressionBytes instanceof Uint8Array) {
            expressionIndex = internStringBytes(expression, record.expressionBytes);
        } else {
            expressionIndex = internString(expression);
        }
        const readingEqualsExpression = record.readingEqualsExpression ?? (reading === expression);
        let readingIndex;
        if (planReadingIndexes instanceof Uint32Array) {
            readingIndex = planReadingIndexes[recordIndex];
        } else if (readingEqualsExpression) {
            readingIndex = expressionIndex;
        } else if (record.readingBytes instanceof Uint8Array) {
            readingIndex = internStringBytes(reading, record.readingBytes);
        } else {
            readingIndex = internString(reading);
        }
        if (
            !(preinternedPlan instanceof Object) &&
            (
                stringLengths[expressionIndex] > U16_NULL ||
                stringLengths[readingIndex] > U16_NULL
            )
        ) {
            return null;
        }
        const metaIndex = recordIndex * META_U32_FIELDS;
        metasU32[metaIndex + 0] = expressionIndex >>> 0;
        metasU32[metaIndex + 1] = readingEqualsExpression ? READING_EQUALS_EXPRESSION_U32 : (readingIndex >>> 0);
        metasI32[metaIndex + 2] = record.entryContentOffset | 0;
        metasI32[metaIndex + 3] = record.entryContentLength | 0;
        metasI32[metaIndex + 4] = record.score | 0;
        metasI32[metaIndex + 5] = record.sequence ?? -1;
        ++recordIndex;
    }
    const stringLengthsU16 = preinternedPlan?.stringLengths ?? Uint16Array.from(stringLengths);
    const stringLengthsBuffer = new Uint8Array(
        stringLengthsU16.buffer,
        stringLengthsU16.byteOffset,
        stringLengthsU16.byteLength,
    );
    const stringsBuffer = preinternedPlan?.stringsBuffer ?? buildStringsBuffer();
    wasm.wasm_reset_heap();
    const metasPtr = wasm.wasm_alloc(metasBuffer.byteLength);
    const stringLengthsPtr = wasm.wasm_alloc(stringLengthsBuffer.byteLength);
    const stringsPtr = wasm.wasm_alloc(stringsBuffer.byteLength);
    if (metasPtr === 0 || stringLengthsPtr === 0 || stringsPtr === 0) {
        return null;
    }
    const wasmHeapAfterAlloc = new Uint8Array(wasm.memory.buffer);
    wasmHeapAfterAlloc.set(new Uint8Array(metasBuffer), metasPtr);
    wasmHeapAfterAlloc.set(stringLengthsBuffer, stringLengthsPtr);
    wasmHeapAfterAlloc.set(stringsBuffer, stringsPtr);

    const encodedSize = wasm.calc_encoded_size(records.length, stringLengthsU16.length, stringLengthsPtr, stringsBuffer.byteLength, metasPtr);
    if (encodedSize <= 0) {
        return new Uint8Array(0);
    }
    const outPtr = wasm.wasm_alloc(encodedSize);
    if (outPtr === 0) {
        return null;
    }
    const written = wasm.encode_records(records.length, stringLengthsU16.length, stringLengthsPtr, stringsPtr, stringsBuffer.byteLength, metasPtr, outPtr);
    if (written <= 0) {
        return new Uint8Array(0);
    }
    const heapAfterEncode = new Uint8Array(wasm.memory.buffer);
    return heapAfterEncode.slice(outPtr, outPtr + written);
}

/**
 * @param {{rowCount: number, expressionBytesList: Uint8Array[], readingBytesList: Uint8Array[], readingEqualsExpressionList: boolean[], scoreList: number[], sequenceList: (number|undefined)[]}} chunk
 * @param {number[]} contentOffsets
 * @param {number[]} contentLengths
 * @param {TextEncoder} textEncoder
 * @param {PreinternedTermRecordPlan|null} preinternedPlan
 * @returns {Promise<Uint8Array|null>}
 */
export async function encodeTermRecordArtifactChunkWithWasmPreinterned(chunk, contentOffsets, contentLengths, textEncoder, preinternedPlan) {
    const count = chunk.rowCount;
    if (count === 0) {
        return new Uint8Array(0);
    }
    const wasm = await getWasm();
    const metasBuffer = new ArrayBuffer(count * META_BYTES);
    const metasU32 = new Uint32Array(metasBuffer);
    const metasI32 = new Int32Array(metasBuffer);
    const {stringLengths, internString, internStringBytes, buildStringsBuffer} = createStringInterner(textEncoder);
    const planExpressionIndexes = preinternedPlan?.expressionIndexes ?? null;
    const planReadingIndexes = preinternedPlan?.readingIndexes ?? null;
    for (let i = 0; i < count; ++i) {
        const expressionBytes = chunk.expressionBytesList[i];
        const readingEqualsExpression = chunk.readingEqualsExpressionList[i] === true || chunk.readingEqualsExpressionList[i] === 1;
        const expressionIndex = planExpressionIndexes instanceof Uint32Array ? planExpressionIndexes[i] : internStringBytes('', expressionBytes);
        let readingIndex;
        if (planReadingIndexes instanceof Uint32Array) {
            readingIndex = planReadingIndexes[i];
        } else if (readingEqualsExpression) {
            readingIndex = expressionIndex;
        } else {
            const readingBytes = chunk.readingBytesList[i];
            readingIndex = readingBytes instanceof Uint8Array ? internStringBytes('', readingBytes) : internString('');
        }
        if (
            !(preinternedPlan instanceof Object) &&
            (
                stringLengths[expressionIndex] > U16_NULL ||
                stringLengths[readingIndex] > U16_NULL
            )
        ) {
            return null;
        }
        const metaIndex = i * META_U32_FIELDS;
        metasU32[metaIndex + 0] = expressionIndex >>> 0;
        metasU32[metaIndex + 1] = readingEqualsExpression ? READING_EQUALS_EXPRESSION_U32 : (readingIndex >>> 0);
        metasI32[metaIndex + 2] = contentOffsets[i] | 0;
        metasI32[metaIndex + 3] = contentLengths[i] | 0;
        metasI32[metaIndex + 4] = (chunk.scoreList[i] ?? 0) | 0;
        metasI32[metaIndex + 5] = chunk.sequenceList[i] ?? -1;
    }
    const stringLengthsU16 = preinternedPlan?.stringLengths ?? Uint16Array.from(stringLengths);
    const stringLengthsBuffer = new Uint8Array(
        stringLengthsU16.buffer,
        stringLengthsU16.byteOffset,
        stringLengthsU16.byteLength,
    );
    const stringsBuffer = preinternedPlan?.stringsBuffer ?? buildStringsBuffer();
    wasm.wasm_reset_heap();
    const metasPtr = wasm.wasm_alloc(metasBuffer.byteLength);
    const stringLengthsPtr = wasm.wasm_alloc(stringLengthsBuffer.byteLength);
    const stringsPtr = wasm.wasm_alloc(stringsBuffer.byteLength);
    if (metasPtr === 0 || stringLengthsPtr === 0 || stringsPtr === 0) {
        return null;
    }
    const wasmHeapAfterAlloc = new Uint8Array(wasm.memory.buffer);
    wasmHeapAfterAlloc.set(new Uint8Array(metasBuffer), metasPtr);
    wasmHeapAfterAlloc.set(stringLengthsBuffer, stringLengthsPtr);
    wasmHeapAfterAlloc.set(stringsBuffer, stringsPtr);

    const encodedSize = wasm.calc_encoded_size(count, stringLengthsU16.length, stringLengthsPtr, stringsBuffer.byteLength, metasPtr);
    if (encodedSize <= 0) {
        return new Uint8Array(0);
    }
    const outPtr = wasm.wasm_alloc(encodedSize);
    if (outPtr === 0) {
        return null;
    }
    const written = wasm.encode_records(count, stringLengthsU16.length, stringLengthsPtr, stringsPtr, stringsBuffer.byteLength, metasPtr, outPtr);
    if (written <= 0) {
        return new Uint8Array(0);
    }
    const heapAfterEncode = new Uint8Array(wasm.memory.buffer);
    return heapAfterEncode.slice(outPtr, outPtr + written);
}
