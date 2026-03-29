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
import {RAW_TERM_CONTENT_COMPRESSED_SHARED_GLOSSARY_DICT_NAME} from '../ext/js/dictionary/raw-term-content.js';

function createFakeDirectoryHandle(fileBytesByName, {removeEntryFailures = new Map()} = {}) {
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
            const failuresRemaining = removeEntryFailures.get(name) ?? 0;
            if (failuresRemaining > 0) {
                removeEntryFailures.set(name, failuresRemaining - 1);
                throw new Error(`Injected removeEntry failure for ${name}`);
            }
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
    test('encodes and decodes raw-v4 entry content dict names without falling back to custom strings', () => {
        const store = new TermRecordOpfsStore();
        const {meta, bytes} = store._encodeEntryContentDictNameMeta(RAW_TERM_CONTENT_COMPRESSED_SHARED_GLOSSARY_DICT_NAME);
        const decoded = store._decodeEntryContentDictName(meta, new Uint8Array(), 0, 0);

        expect(meta & 0xff).not.toBe(0xff);
        expect(bytes).toBeNull();
        expect(decoded).toBe(RAW_TERM_CONTENT_COMPRESSED_SHARED_GLOSSARY_DICT_NAME);
    });

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

    test('replaceDictionaryName restores original shard files and records when source removal fails', async () => {
        const store = new TermRecordOpfsStore();
        const recordsById = Reflect.get(store, '_recordsById');
        const shardStateByFileName = Reflect.get(store, '_shardStateByFileName');
        const activeAppendShardStateByKey = Reflect.get(store, '_activeAppendShardStateByKey');
        const oldFileName = store._getShardSegmentFileName('JMdict staging', 'raw', 0);
        const oldLogicalKey = store._getShardFileName('JMdict staging', 'raw');
        const fileBytesByName = new Map([[oldFileName, new Uint8Array([9, 8, 7, 6])]]);
        const recordsDirectoryHandle = createFakeDirectoryHandle(fileBytesByName, {
            removeEntryFailures: new Map([[oldFileName, 1]]),
        });
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

        await expect(store.replaceDictionaryName('JMdict staging', 'JMdict [2026-02-26]')).rejects.toThrow(/Injected removeEntry failure/);

        const newFileName = store._getShardSegmentFileName('JMdict [2026-02-26]', 'raw', 0);
        expect(recordsById.get(1)?.dictionary).toBe('JMdict staging');
        expect(fileBytesByName.has(oldFileName)).toBe(true);
        expect(fileBytesByName.has(newFileName)).toBe(false);
        expect(Array.from(fileBytesByName.get(oldFileName) ?? [])).toStrictEqual([9, 8, 7, 6]);
        expect(shardStateByFileName.has(oldFileName)).toBe(true);
        expect(shardStateByFileName.has(newFileName)).toBe(false);
    });

    test('replaceDictionaryName preserves existing target shard files when rename cannot start cleanly', async () => {
        const store = new TermRecordOpfsStore();
        const recordsById = Reflect.get(store, '_recordsById');
        const shardStateByFileName = Reflect.get(store, '_shardStateByFileName');
        const activeAppendShardStateByKey = Reflect.get(store, '_activeAppendShardStateByKey');
        const oldFileName = store._getShardSegmentFileName('JMdict staging', 'raw', 0);
        const oldLogicalKey = store._getShardFileName('JMdict staging', 'raw');
        const newFileName = store._getShardSegmentFileName('JMdict [2026-02-26]', 'raw', 0);
        const newLogicalKey = store._getShardFileName('JMdict [2026-02-26]', 'raw');
        const fileBytesByName = new Map([
            [oldFileName, new Uint8Array([1, 2, 3, 4])],
            [newFileName, new Uint8Array([5, 6, 7, 8])],
        ]);
        const recordsDirectoryHandle = createFakeDirectoryHandle(fileBytesByName);
        const oldFileHandle = await recordsDirectoryHandle.getFileHandle(oldFileName, {create: false});
        const newFileHandle = await recordsDirectoryHandle.getFileHandle(newFileName, {create: false});
        const oldShardState = store._createShardState(oldFileName, oldFileHandle, 4, 'raw', 0, oldLogicalKey);
        const newShardState = store._createShardState(newFileName, newFileHandle, 4, 'raw', 0, newLogicalKey);

        Reflect.set(store, '_recordsDirectoryHandle', recordsDirectoryHandle);
        shardStateByFileName.set(oldFileName, oldShardState);
        shardStateByFileName.set(newFileName, newShardState);
        activeAppendShardStateByKey.set(oldLogicalKey, oldShardState);
        activeAppendShardStateByKey.set(newLogicalKey, newShardState);
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

        await expect(store.replaceDictionaryName('JMdict staging', 'JMdict [2026-02-26]')).rejects.toThrow(/Target shard file already exists/);

        expect(recordsById.get(1)?.dictionary).toBe('JMdict staging');
        expect(Array.from(fileBytesByName.get(oldFileName) ?? [])).toStrictEqual([1, 2, 3, 4]);
        expect(Array.from(fileBytesByName.get(newFileName) ?? [])).toStrictEqual([5, 6, 7, 8]);
        expect(shardStateByFileName.has(oldFileName)).toBe(true);
        expect(shardStateByFileName.has(newFileName)).toBe(true);
    });

    test('cleanupShardFilesByDictionaryPredicate removes transient shard files and state', async () => {
        const store = new TermRecordOpfsStore();
        const recordsById = Reflect.get(store, '_recordsById');
        const indexByDictionary = Reflect.get(store, '_indexByDictionary');
        const shardStateByFileName = Reflect.get(store, '_shardStateByFileName');
        const activeAppendShardStateByKey = Reflect.get(store, '_activeAppendShardStateByKey');
        const transientFileName = store._getShardSegmentFileName('JMdict [cutover abc123]', 'raw', 0);
        const transientLogicalKey = store._getShardFileName('JMdict [cutover abc123]', 'raw');
        const liveFileName = store._getShardSegmentFileName('JMdict', 'raw', 0);
        const liveLogicalKey = store._getShardFileName('JMdict', 'raw');
        const fileBytesByName = new Map([
            [transientFileName, new Uint8Array([1, 2, 3])],
            [liveFileName, new Uint8Array([4, 5, 6])],
        ]);
        const recordsDirectoryHandle = createFakeDirectoryHandle(fileBytesByName);
        const transientFileHandle = await recordsDirectoryHandle.getFileHandle(transientFileName, {create: false});
        const liveFileHandle = await recordsDirectoryHandle.getFileHandle(liveFileName, {create: false});
        const transientState = store._createShardState(transientFileName, transientFileHandle, 3, 'raw', 0, transientLogicalKey);
        const liveState = store._createShardState(liveFileName, liveFileHandle, 3, 'raw', 0, liveLogicalKey);

        Reflect.set(store, '_recordsDirectoryHandle', recordsDirectoryHandle);
        shardStateByFileName.set(transientFileName, transientState);
        shardStateByFileName.set(liveFileName, liveState);
        activeAppendShardStateByKey.set(transientLogicalKey, transientState);
        activeAppendShardStateByKey.set(liveLogicalKey, liveState);
        recordsById.set(1, {
            id: 1,
            dictionary: 'JMdict [cutover abc123]',
            expression: '一',
            reading: 'いち',
            expressionReverse: null,
            readingReverse: null,
            entryContentOffset: 0,
            entryContentLength: 3,
            entryContentDictName: 'raw',
            score: 0,
            sequence: null,
        });
        recordsById.set(2, {
            id: 2,
            dictionary: 'JMdict',
            expression: '二',
            reading: 'に',
            expressionReverse: null,
            readingReverse: null,
            entryContentOffset: 0,
            entryContentLength: 3,
            entryContentDictName: 'raw',
            score: 0,
            sequence: null,
        });
        indexByDictionary.set('JMdict [cutover abc123]', {expression: new Map(), reading: new Map(), expressionReverse: new Map(), readingReverse: new Map(), pair: new Map(), sequence: new Map()});
        indexByDictionary.set('JMdict', {expression: new Map(), reading: new Map(), expressionReverse: new Map(), readingReverse: new Map(), pair: new Map(), sequence: new Map()});

        const removed = await store.cleanupShardFilesByDictionaryPredicate((dictionaryName) => /\[cutover /.test(dictionaryName));

        expect(removed).toStrictEqual([transientFileName]);
        expect(fileBytesByName.has(transientFileName)).toBe(false);
        expect(fileBytesByName.has(liveFileName)).toBe(true);
        expect(shardStateByFileName.has(transientFileName)).toBe(false);
        expect(shardStateByFileName.has(liveFileName)).toBe(true);
        expect(activeAppendShardStateByKey.has(transientLogicalKey)).toBe(false);
        expect(activeAppendShardStateByKey.has(liveLogicalKey)).toBe(true);
        expect(recordsById.get(1)).toBeUndefined();
        expect(recordsById.get(2)?.dictionary).toBe('JMdict');
        expect(indexByDictionary.size).toBe(0);
    });
});
