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

const RAW_TERM_CONTENT_MAGIC = new Uint8Array([0x4d, 0x42, 0x52, 0x31]);
const RAW_TERM_CONTENT_HEADER_BYTES = 20;
const RAW_TERM_CONTENT_SHARED_GLOSSARY_MAGIC = new Uint8Array([0x4d, 0x42, 0x52, 0x32]);
const RAW_TERM_CONTENT_SHARED_GLOSSARY_HEADER_BYTES = 28;

export const RAW_TERM_CONTENT_DICT_NAME = 'raw-v2';

export const RAW_TERM_CONTENT_SHARED_GLOSSARY_DICT_NAME = 'raw-v3';

export const RAW_TERM_CONTENT_COMPRESSED_SHARED_GLOSSARY_DICT_NAME = 'raw-v4';

/**
 * @param {Uint8Array} bytes
 * @param {TextDecoder} textDecoder
 * @returns {{rules: string, definitionTags: string, termTags: string, glossaryJsonOffset: number, glossaryJsonLength: number}|null}
 */
export function decodeRawTermContentHeader(bytes, textDecoder) {
    if (!isRawTermContentBinary(bytes)) {
        return null;
    }
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const rulesLength = view.getUint32(4, true);
    const definitionTagsLength = view.getUint32(8, true);
    const termTagsLength = view.getUint32(12, true);
    const glossaryJsonLength = view.getUint32(16, true);
    const totalLength = RAW_TERM_CONTENT_HEADER_BYTES + rulesLength + definitionTagsLength + termTagsLength + glossaryJsonLength;
    if (totalLength !== bytes.byteLength) {
        return null;
    }
    let offset = RAW_TERM_CONTENT_HEADER_BYTES;
    const rules = textDecoder.decode(bytes.subarray(offset, offset + rulesLength));
    offset += rulesLength;
    const definitionTags = textDecoder.decode(bytes.subarray(offset, offset + definitionTagsLength));
    offset += definitionTagsLength;
    const termTags = textDecoder.decode(bytes.subarray(offset, offset + termTagsLength));
    offset += termTagsLength;
    return {rules, definitionTags, termTags, glossaryJsonOffset: offset, glossaryJsonLength};
}

/**
 * @param {Uint8Array} bytes
 * @param {number} offset
 * @param {number} length
 * @returns {Uint8Array}
 */
export function getRawTermContentGlossaryJsonBytes(bytes, offset, length) {
    return bytes.subarray(offset, offset + length);
}

/**
 * @param {Uint8Array} bytes
 * @returns {boolean}
 */
export function isRawTermContentBinary(bytes) {
    return (
        bytes.byteLength >= RAW_TERM_CONTENT_HEADER_BYTES &&
        bytes[0] === RAW_TERM_CONTENT_MAGIC[0] &&
        bytes[1] === RAW_TERM_CONTENT_MAGIC[1] &&
        bytes[2] === RAW_TERM_CONTENT_MAGIC[2] &&
        bytes[3] === RAW_TERM_CONTENT_MAGIC[3]
    );
}

/**
 * @param {Uint8Array} bytes
 * @returns {boolean}
 */
export function isRawTermContentSharedGlossaryBinary(bytes) {
    return (
        bytes.byteLength >= RAW_TERM_CONTENT_SHARED_GLOSSARY_HEADER_BYTES &&
        bytes[0] === RAW_TERM_CONTENT_SHARED_GLOSSARY_MAGIC[0] &&
        bytes[1] === RAW_TERM_CONTENT_SHARED_GLOSSARY_MAGIC[1] &&
        bytes[2] === RAW_TERM_CONTENT_SHARED_GLOSSARY_MAGIC[2] &&
        bytes[3] === RAW_TERM_CONTENT_SHARED_GLOSSARY_MAGIC[3]
    );
}

/**
 * @param {string} rules
 * @param {string} definitionTags
 * @param {string} termTags
 * @param {Uint8Array} glossaryJsonBytes
 * @param {TextEncoder} textEncoder
 * @returns {Uint8Array}
 */
export function encodeRawTermContentBinary(rules, definitionTags, termTags, glossaryJsonBytes, textEncoder) {
    const rulesBytes = textEncoder.encode(rules);
    const definitionTagsBytes = textEncoder.encode(definitionTags);
    const termTagsBytes = textEncoder.encode(termTags);
    const totalBytes = (
        RAW_TERM_CONTENT_HEADER_BYTES +
        rulesBytes.byteLength +
        definitionTagsBytes.byteLength +
        termTagsBytes.byteLength +
        glossaryJsonBytes.byteLength
    );
    const bytes = new Uint8Array(totalBytes);
    bytes.set(RAW_TERM_CONTENT_MAGIC, 0);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    view.setUint32(4, rulesBytes.byteLength, true);
    view.setUint32(8, definitionTagsBytes.byteLength, true);
    view.setUint32(12, termTagsBytes.byteLength, true);
    view.setUint32(16, glossaryJsonBytes.byteLength, true);
    let offset = RAW_TERM_CONTENT_HEADER_BYTES;
    bytes.set(rulesBytes, offset);
    offset += rulesBytes.byteLength;
    bytes.set(definitionTagsBytes, offset);
    offset += definitionTagsBytes.byteLength;
    bytes.set(termTagsBytes, offset);
    offset += termTagsBytes.byteLength;
    bytes.set(glossaryJsonBytes, offset);
    return bytes;
}

/**
 * @param {string} rules
 * @param {string} definitionTags
 * @param {string} termTags
 * @param {number} glossaryOffset
 * @param {number} glossaryLength
 * @param {TextEncoder} textEncoder
 * @returns {Uint8Array}
 */
export function encodeRawTermContentSharedGlossaryBinary(rules, definitionTags, termTags, glossaryOffset, glossaryLength, textEncoder) {
    const rulesBytes = textEncoder.encode(rules);
    const definitionTagsBytes = textEncoder.encode(definitionTags);
    const termTagsBytes = textEncoder.encode(termTags);
    const totalBytes = (
        RAW_TERM_CONTENT_SHARED_GLOSSARY_HEADER_BYTES +
        rulesBytes.byteLength +
        definitionTagsBytes.byteLength +
        termTagsBytes.byteLength
    );
    const bytes = new Uint8Array(totalBytes);
    bytes.set(RAW_TERM_CONTENT_SHARED_GLOSSARY_MAGIC, 0);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    view.setUint32(4, rulesBytes.byteLength, true);
    view.setUint32(8, definitionTagsBytes.byteLength, true);
    view.setUint32(12, termTagsBytes.byteLength, true);
    view.setBigUint64(16, BigInt(glossaryOffset), true);
    view.setUint32(24, glossaryLength, true);
    let offset = RAW_TERM_CONTENT_SHARED_GLOSSARY_HEADER_BYTES;
    bytes.set(rulesBytes, offset);
    offset += rulesBytes.byteLength;
    bytes.set(definitionTagsBytes, offset);
    offset += definitionTagsBytes.byteLength;
    bytes.set(termTagsBytes, offset);
    return bytes;
}

/**
 * @param {Uint8Array} bytes
 * @param {number} baseOffset
 * @returns {Uint8Array}
 */
export function rebaseRawTermContentSharedGlossaryBinary(bytes, baseOffset) {
    if (!isRawTermContentSharedGlossaryBinary(bytes) || baseOffset === 0) {
        return bytes;
    }
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const rulesLength = view.getUint32(4, true);
    const definitionTagsLength = view.getUint32(8, true);
    const termTagsLength = view.getUint32(12, true);
    const totalLength = RAW_TERM_CONTENT_SHARED_GLOSSARY_HEADER_BYTES + rulesLength + definitionTagsLength + termTagsLength;
    if (totalLength !== bytes.byteLength) {
        return bytes;
    }
    const rebasedBytes = Uint8Array.from(bytes);
    const rebasedView = new DataView(rebasedBytes.buffer, rebasedBytes.byteOffset, rebasedBytes.byteLength);
    const glossaryOffset = Number(rebasedView.getBigUint64(16, true));
    rebasedView.setBigUint64(16, BigInt(glossaryOffset + baseOffset), true);
    return rebasedBytes;
}

/**
 * @param {Uint8Array} bytes
 * @param {TextDecoder} textDecoder
 * @returns {{rules: string, definitionTags: string, termTags: string, glossaryOffset: number, glossaryLength: number}|null}
 */
export function decodeRawTermContentSharedGlossaryHeader(bytes, textDecoder) {
    if (!isRawTermContentSharedGlossaryBinary(bytes)) {
        return null;
    }
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const rulesLength = view.getUint32(4, true);
    const definitionTagsLength = view.getUint32(8, true);
    const termTagsLength = view.getUint32(12, true);
    const glossaryOffset = Number(view.getBigUint64(16, true));
    const glossaryLength = view.getUint32(24, true);
    const totalLength = RAW_TERM_CONTENT_SHARED_GLOSSARY_HEADER_BYTES + rulesLength + definitionTagsLength + termTagsLength;
    if (totalLength !== bytes.byteLength) {
        return null;
    }
    let offset = RAW_TERM_CONTENT_SHARED_GLOSSARY_HEADER_BYTES;
    const rules = textDecoder.decode(bytes.subarray(offset, offset + rulesLength));
    offset += rulesLength;
    const definitionTags = textDecoder.decode(bytes.subarray(offset, offset + definitionTagsLength));
    offset += definitionTagsLength;
    const termTags = textDecoder.decode(bytes.subarray(offset, offset + termTagsLength));
    return {rules, definitionTags, termTags, glossaryOffset, glossaryLength};
}

/**
 * @param {Uint8Array} bytes
 * @param {TextDecoder} textDecoder
 * @returns {{rules: string, definitionTags: string, termTags: string, glossaryJson: string}|null}
 */
export function decodeRawTermContentBinary(bytes, textDecoder) {
    const header = decodeRawTermContentHeader(bytes, textDecoder);
    if (header === null) {
        return null;
    }
    const glossaryJson = textDecoder.decode(getRawTermContentGlossaryJsonBytes(bytes, header.glossaryJsonOffset, header.glossaryJsonLength));
    return {rules: header.rules, definitionTags: header.definitionTags, termTags: header.termTags, glossaryJson};
}
