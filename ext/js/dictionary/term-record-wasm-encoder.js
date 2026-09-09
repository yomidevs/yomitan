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

import {RAW_TERM_CONTENT_DICT_NAME, RAW_TERM_CONTENT_SHARED_GLOSSARY_DICT_NAME} from './raw-term-content.js';

const META_U32_FIELDS = 10;
const META_BYTES = META_U32_FIELDS * 4;
const U32_NULL = 0xffffffff;
const U16_NULL = 0xffff;
const ENTRY_CONTENT_DICT_NAME_CODE_RAW = 0;
const ENTRY_CONTENT_DICT_NAME_CODE_RAW_V2 = 1;
const ENTRY_CONTENT_DICT_NAME_CODE_RAW_V3 = 2;
const ENTRY_CONTENT_DICT_NAME_CODE_JMDICT = 3;
const ENTRY_CONTENT_DICT_NAME_CODE_CUSTOM = 0xff;
const ENTRY_CONTENT_DICT_NAME_FLAG_READING_EQUALS_EXPRESSION = 0x8000;

/**
 * @param {string} value
 * @returns {{meta: number, requiresString: boolean}}
 */
function encodeEntryContentDictNameMeta(value) {
    switch (value) {
        case '':
        case 'raw':
            return {meta: ENTRY_CONTENT_DICT_NAME_CODE_RAW, requiresString: false};
        case RAW_TERM_CONTENT_DICT_NAME:
            return {meta: ENTRY_CONTENT_DICT_NAME_CODE_RAW_V2, requiresString: false};
        case RAW_TERM_CONTENT_SHARED_GLOSSARY_DICT_NAME:
            return {meta: ENTRY_CONTENT_DICT_NAME_CODE_RAW_V3, requiresString: false};
        case 'jmdict':
            return {meta: ENTRY_CONTENT_DICT_NAME_CODE_JMDICT, requiresString: false};
        default:
            return {meta: ENTRY_CONTENT_DICT_NAME_CODE_CUSTOM, requiresString: true};
    }
}

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
    const firstDictNameMeta = encodeEntryContentDictNameMeta(firstRecord.entryContentDictName);
    const sharedDictNameIndex = firstDictNameMeta.requiresString ? internString(firstRecord.entryContentDictName) : -1;

    let recordIndex = 0;
    for (const record of records) {
        const expressionIndex = internString(record.expression);
        const readingEqualsExpression = record.reading === record.expression;
        const readingIndex = readingEqualsExpression ? expressionIndex : internString(record.reading);
        const dictNameMetaInfo = encodeEntryContentDictNameMeta(record.entryContentDictName);
        const dictNameIndex = dictNameMetaInfo.requiresString ?
            (record.entryContentDictName === firstRecord.entryContentDictName ? sharedDictNameIndex : internString(record.entryContentDictName)) :
            -1;
        if (
            stringLengths[expressionIndex] > U16_NULL ||
            stringLengths[readingIndex] > U16_NULL
        ) {
            return null;
        }
        const metaIndex = recordIndex * META_U32_FIELDS;
        const dictNameFlags = (
            (readingEqualsExpression ? ENTRY_CONTENT_DICT_NAME_FLAG_READING_EQUALS_EXPRESSION : 0)
        ) >>> 0;
        metasU32[metaIndex + 0] = stringOffsets[expressionIndex] >>> 0;
        metasU32[metaIndex + 1] = stringLengths[expressionIndex] >>> 0;
        metasU32[metaIndex + 2] = stringOffsets[readingIndex] >>> 0;
        metasU32[metaIndex + 3] = readingEqualsExpression ? 0 : (stringLengths[readingIndex] >>> 0);
        metasI32[metaIndex + 4] = record.entryContentOffset | 0;
        metasI32[metaIndex + 5] = record.entryContentLength | 0;
        if (dictNameMetaInfo.requiresString && dictNameIndex >= 0) {
            metasU32[metaIndex + 6] = ((((stringLengths[dictNameIndex] >>> 0) << 8) | ENTRY_CONTENT_DICT_NAME_CODE_CUSTOM) | dictNameFlags) >>> 0;
            metasU32[metaIndex + 7] = stringOffsets[dictNameIndex] >>> 0;
        } else {
            metasU32[metaIndex + 6] = (dictNameMetaInfo.meta | dictNameFlags) >>> 0;
            metasU32[metaIndex + 7] = U32_NULL;
        }
        metasI32[metaIndex + 8] = record.score | 0;
        metasI32[metaIndex + 9] = record.sequence ?? -1;
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
