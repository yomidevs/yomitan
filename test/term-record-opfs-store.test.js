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

import {describe, expect, test} from 'vitest';
import {TermRecordOpfsStore} from '../ext/js/dictionary/term-record-opfs-store.js';

function createFakeDirectoryHandle(fileBytesByName) {
    return {
        async getFileHandle(name, {create} = {create: false}) {
            if (!fileBytesByName.has(name)) {
                if (!create) {
                    throw new Error(`File not found: ${name}`);
                }
                fileBytesByName.set(name, new Uint8Array());
            }
            return {
                async getFile() {
                    const bytes = fileBytesByName.get(name) ?? new Uint8Array();
                    return {
                        size: bytes.byteLength,
                        async arrayBuffer() {
                            return bytes.slice().buffer;
                        },
                    };
                },
                async createWritable() {
                    let nextBytes = fileBytesByName.get(name) ?? new Uint8Array();
                    return {
                        async truncate(length) {
                            nextBytes = nextBytes.slice(0, Math.max(0, length));
                        },
                        async write(value) {
                            if (value instanceof ArrayBuffer) {
                                nextBytes = new Uint8Array(value.slice(0));
                                return;
                            }
                            if (ArrayBuffer.isView(value)) {
                                nextBytes = new Uint8Array(value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength));
                            }
                        },
                        async close() {
                            fileBytesByName.set(name, nextBytes);
                        },
                    };
                },
            };
        },
        async removeEntry(name) {
            fileBytesByName.delete(name);
        },
        async *entries() {
            for (const name of fileBytesByName.keys()) {
                yield [name, {kind: 'file'}];
            }
        },
    };
}

describe('TermRecordOpfsStore', () => {
    test('replaceDictionaryName renames shard files and in-memory records', async () => {
        const store = new TermRecordOpfsStore();
        const recordsById = Reflect.get(store, '_recordsById');
        const shardStateByFileName = Reflect.get(store, '_shardStateByFileName');
        const activeAppendShardStateByKey = Reflect.get(store, '_activeAppendShardStateByKey');
        const oldFileName = store._getShardSegmentFileName('JMdict staging', 'raw', 0);
        const oldLogicalKey = store._getShardFileName('JMdict staging', 'raw');
        const fileBytesByName = new Map([[oldFileName, new Uint8Array([1, 2, 3, 4])]]);
        const recordsDirectoryHandle = createFakeDirectoryHandle(fileBytesByName);
        const fileHandle = await recordsDirectoryHandle.getFileHandle(oldFileName, {create: false});
        const shardState = store._createShardState(oldFileName, fileHandle, 4, 'raw', 0, oldLogicalKey);

        Reflect.set(store, '_recordsDirectoryHandle', recordsDirectoryHandle);
        shardStateByFileName.set(oldFileName, shardState);
        activeAppendShardStateByKey.set(oldLogicalKey, shardState);
        recordsById.set(1, {
            id: 1,
            dictionary: 'JMdict staging',
            expression: '暗記',
            reading: 'あんき',
            expressionReverse: null,
            readingReverse: null,
            entryContentOffset: 0,
            entryContentLength: 4,
            entryContentDictName: 'raw',
            score: 0,
            sequence: null,
        });

        const renamedCount = await store.replaceDictionaryName('JMdict staging', 'JMdict [2026-02-26]');
        const newFileName = store._getShardSegmentFileName('JMdict [2026-02-26]', 'raw', 0);

        expect(renamedCount).toBe(1);
        expect(recordsById.get(1)?.dictionary).toBe('JMdict [2026-02-26]');
        expect(fileBytesByName.has(oldFileName)).toBe(false);
        expect(fileBytesByName.has(newFileName)).toBe(true);
        expect(Array.from(fileBytesByName.get(newFileName) ?? [])).toStrictEqual([1, 2, 3, 4]);
        expect(shardStateByFileName.has(oldFileName)).toBe(false);
        expect(shardStateByFileName.has(newFileName)).toBe(true);
    });
});
