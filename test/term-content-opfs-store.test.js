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

import {describe, expect, test, vi} from 'vitest';
import {TermContentOpfsStore} from '../ext/js/dictionary/term-content-opfs-store.js';

/**
 * @param {string} message
 * @returns {Error}
 */
function createNotReadableError(message = 'The requested file could not be read') {
    const error = new Error(message);
    error.name = 'NotReadableError';
    return error;
}

/**
 * @param {Uint8Array} bytes
 * @returns {{size: number, slice: (start: number, end: number) => {arrayBuffer: () => Promise<ArrayBufferLike>}}}
 */
function createReadableFile(bytes) {
    return {
        size: bytes.byteLength,
        slice(start, end) {
            const clampedStart = Math.max(0, start);
            const clampedEnd = Math.max(clampedStart, end);
            const page = bytes.slice(clampedStart, clampedEnd);
            return {
                async arrayBuffer() {
                    return page.buffer;
                },
            };
        },
    };
}

describe('TermContentOpfsStore', () => {
    test('readSlice recovers after transient NotReadableError and returns bytes', async () => {
        const bytes = new Uint8Array([11, 12, 13, 14, 15, 16]);
        const store = new TermContentOpfsStore();
        const readableFile = createReadableFile(bytes);
        const fileHandle = {
            getFile: vi.fn(async () => readableFile),
        };
        const unreadableFile = {
            size: bytes.byteLength,
            slice() {
                return {
                    async arrayBuffer() {
                        throw createNotReadableError();
                    },
                };
            },
        };
        Reflect.set(store, '_fileHandle', fileHandle);
        Reflect.set(store, '_readFile', unreadableFile);
        Reflect.set(store, '_segmentStates', [{
            index: 0,
            fileName: 'manabitan-term-content.bin',
            fileHandle,
            fileLength: bytes.byteLength,
            startOffset: 0,
            readFile: unreadableFile,
        }]);
        Reflect.set(store, '_loadedForRead', true);
        Reflect.set(store, '_length', bytes.byteLength);

        const result = await store.readSlice(1, 4);

        expect(result).toStrictEqual(new Uint8Array([12, 13, 14, 15]));
        expect(fileHandle.getFile).toHaveBeenCalledTimes(1);
    });

    test('readSlice returns null (without throwing) when NotReadableError is persistent', async () => {
        const bytes = new Uint8Array([1, 2, 3, 4]);
        const store = new TermContentOpfsStore();
        const fileHandle = {
            getFile: vi.fn(async () => {
                throw createNotReadableError('still unreadable');
            }),
        };
        const unreadableFile = {
            size: bytes.byteLength,
            slice() {
                return {
                    async arrayBuffer() {
                        throw createNotReadableError('unreadable on slice');
                    },
                };
            },
        };
        Reflect.set(store, '_fileHandle', fileHandle);
        Reflect.set(store, '_readFile', unreadableFile);
        Reflect.set(store, '_segmentStates', [{
            index: 0,
            fileName: 'manabitan-term-content.bin',
            fileHandle,
            fileLength: bytes.byteLength,
            startOffset: 0,
            readFile: unreadableFile,
        }]);
        Reflect.set(store, '_loadedForRead', true);
        Reflect.set(store, '_length', bytes.byteLength);

        const result = await store.readSlice(0, bytes.byteLength);

        expect(result).toBeNull();
        expect(fileHandle.getFile).toHaveBeenCalledTimes(2);
    });
});
