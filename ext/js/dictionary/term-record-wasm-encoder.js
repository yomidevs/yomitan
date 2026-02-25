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
    const metasView = new DataView(metasBuffer);
    /** @type {Uint8Array[]} */
    const stringChunks = [];
    let stringsTotal = 0;

    let metaOffset = 0;
    for (const record of records) {
        const dictionaryBytes = textEncoder.encode(record.dictionary);
        const expressionBytes = textEncoder.encode(record.expression);
        const readingBytes = textEncoder.encode(record.reading);
        const expressionReverseBytes = record.expressionReverse !== null ? textEncoder.encode(record.expressionReverse) : null;
        const readingReverseBytes = record.readingReverse !== null ? textEncoder.encode(record.readingReverse) : null;
        const dictNameBytes = textEncoder.encode(record.entryContentDictName);

        const dictionaryOff = stringsTotal;
        stringChunks.push(dictionaryBytes);
        stringsTotal += dictionaryBytes.byteLength;
        const expressionOff = stringsTotal;
        stringChunks.push(expressionBytes);
        stringsTotal += expressionBytes.byteLength;
        const readingOff = stringsTotal;
        stringChunks.push(readingBytes);
        stringsTotal += readingBytes.byteLength;
        const expressionReverseOff = expressionReverseBytes !== null ? stringsTotal : U32_NULL;
        if (expressionReverseBytes !== null) {
            stringChunks.push(expressionReverseBytes);
            stringsTotal += expressionReverseBytes.byteLength;
        }
        const readingReverseOff = readingReverseBytes !== null ? stringsTotal : U32_NULL;
        if (readingReverseBytes !== null) {
            stringChunks.push(readingReverseBytes);
            stringsTotal += readingReverseBytes.byteLength;
        }
        const dictNameOff = stringsTotal;
        stringChunks.push(dictNameBytes);
        stringsTotal += dictNameBytes.byteLength;

        metasView.setUint32(metaOffset + 0, record.id, true);
        metasView.setUint32(metaOffset + 4, dictionaryOff, true);
        metasView.setUint32(metaOffset + 8, dictionaryBytes.byteLength, true);
        metasView.setUint32(metaOffset + 12, expressionOff, true);
        metasView.setUint32(metaOffset + 16, expressionBytes.byteLength, true);
        metasView.setUint32(metaOffset + 20, readingOff, true);
        metasView.setUint32(metaOffset + 24, readingBytes.byteLength, true);
        metasView.setUint32(metaOffset + 28, expressionReverseOff, true);
        metasView.setUint32(metaOffset + 32, expressionReverseBytes === null ? U32_NULL : expressionReverseBytes.byteLength, true);
        metasView.setUint32(metaOffset + 36, readingReverseOff, true);
        metasView.setUint32(metaOffset + 40, readingReverseBytes === null ? U32_NULL : readingReverseBytes.byteLength, true);
        metasView.setInt32(metaOffset + 44, record.entryContentOffset, true);
        metasView.setInt32(metaOffset + 48, record.entryContentLength, true);
        metasView.setUint32(metaOffset + 52, dictNameOff, true);
        metasView.setUint32(metaOffset + 56, dictNameBytes.byteLength, true);
        metasView.setInt32(metaOffset + 60, record.score, true);
        metasView.setInt32(metaOffset + 64, record.sequence ?? -1, true);
        metaOffset += META_BYTES;
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
