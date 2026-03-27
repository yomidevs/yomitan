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

import {IDBFactory, IDBKeyRange} from 'fake-indexeddb';
import {readdirSync, readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join, dirname as pathDirname} from 'path';
import {BlobWriter, TextReader, ZipWriter} from '@zip.js/zip.js';
import {beforeEach, describe, test, vi} from 'vitest';
import {createDictionaryArchiveData, getDictionaryArchiveIndex} from '../dev/dictionary-archive-util.js';
import {parseJson} from '../dev/json.js';
import {DictionaryDatabase} from '../ext/js/dictionary/dictionary-database.js';
import {DictionaryImporter} from '../ext/js/dictionary/dictionary-importer.js';
import {encodeRawTermContentSharedGlossaryBinary} from '../ext/js/dictionary/raw-term-content.js';
import {TermRecordOpfsStore} from '../ext/js/dictionary/term-record-opfs-store.js';
import {DictionaryWorkerHandler} from '../ext/js/dictionary/dictionary-worker-handler.js';
import {compress as zstdCompress, init as zstdInit} from '../ext/lib/zstd-wasm.js';
import {chrome, fetch} from './mocks/common.js';
import {DictionaryImporterMediaLoader} from './mocks/dictionary-importer-media-loader.js';
import {setupStubs} from './utilities/database.js';

const dirname = pathDirname(fileURLToPath(import.meta.url));

setupStubs();
vi.stubGlobal('IDBKeyRange', IDBKeyRange);
vi.stubGlobal('fetch', fetch);
vi.stubGlobal('chrome', chrome);

/**
 * @returns {{
 *   kind: 'directory',
 *   getDirectoryHandle: (name: string, options?: {create?: boolean}) => Promise<unknown>,
 *   getFileHandle: (name: string, options?: {create?: boolean}) => Promise<unknown>,
 *   removeEntry: (name: string) => Promise<void>,
 *   entries: () => AsyncGenerator<[string, unknown], void, unknown>
 * }}
 */
function createInMemoryOpfsDirectoryHandle() {
    /** @type {Map<string, ReturnType<typeof createInMemoryOpfsDirectoryHandle>>} */
    const directories = new Map();
    /** @type {Map<string, Uint8Array>} */
    const files = new Map();

    /**
     * @param {string} fileName
     * @returns {{
     *   kind: 'file',
     *   getFile: () => Promise<{size: number, arrayBuffer: () => Promise<ArrayBuffer>}>,
     *   createWritable: (options?: {keepExistingData?: boolean}) => Promise<{
     *     seek: (offset: number) => Promise<void>,
     *     truncate: (size: number) => Promise<void>,
     *     write: (chunk: Uint8Array|ArrayBuffer) => Promise<void>,
     *     close: () => Promise<void>
     *   }>
     * }}
     */
    const createFileHandle = (fileName) => ({
        kind: /** @type {'file'} */ ('file'),
        async getFile() {
            const bytes = files.get(fileName) ?? new Uint8Array(0);
            return {
                size: bytes.byteLength,
                arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
            };
        },
        async createWritable(options = {}) {
            let bytes = options.keepExistingData === true ? Uint8Array.from(files.get(fileName) ?? new Uint8Array(0)) : new Uint8Array(0);
            let position = 0;

            /**
             * @param {number} requiredLength
             */
            const ensureCapacity = (requiredLength) => {
                if (requiredLength <= bytes.byteLength) {
                    return;
                }
                const next = new Uint8Array(requiredLength);
                next.set(bytes, 0);
                bytes = next;
            };

            return {
                seek: async (offset) => {
                    position = Math.max(0, Math.trunc(offset));
                },
                truncate: async (size) => {
                    const nextSize = Math.max(0, Math.trunc(size));
                    if (nextSize < bytes.byteLength) {
                        bytes = Uint8Array.from(bytes.subarray(0, nextSize));
                    } else if (nextSize > bytes.byteLength) {
                        const next = new Uint8Array(nextSize);
                        next.set(bytes, 0);
                        bytes = next;
                    }
                    if (position > nextSize) {
                        position = nextSize;
                    }
                },
                write: async (chunk) => {
                    const source = chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk);
                    const end = position + source.byteLength;
                    ensureCapacity(end);
                    bytes.set(source, position);
                    position = end;
                },
                close: async () => {
                    files.set(fileName, bytes);
                },
            };
        },
    });

    return {
        kind: /** @type {'directory'} */ ('directory'),
        async getDirectoryHandle(name, options = {}) {
            const existing = directories.get(name);
            if (typeof existing !== 'undefined') {
                return existing;
            }
            if (options.create !== true) {
                throw new Error(`NotFoundError: directory '${name}'`);
            }
            const created = createInMemoryOpfsDirectoryHandle();
            directories.set(name, created);
            return created;
        },
        async getFileHandle(name, options = {}) {
            if (!files.has(name)) {
                if (options.create !== true) {
                    throw new Error(`NotFoundError: file '${name}'`);
                }
                files.set(name, new Uint8Array(0));
            }
            return createFileHandle(name);
        },
        async removeEntry(name) {
            if (files.delete(name) || directories.delete(name)) {
                return;
            }
            throw new Error(`NotFoundError: entry '${name}'`);
        },
        async *entries() {
            for (const [name, directoryHandle] of directories) {
                yield [name, directoryHandle];
            }
            for (const [name] of files) {
                yield [name, createFileHandle(name)];
            }
        },
    };
}

/**
 * @param {unknown} rootDirectoryHandle
 * @returns {() => void}
 */
function installInMemoryOpfsNavigator(rootDirectoryHandle) {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
    const previousNavigator = /** @type {unknown} */ (globalThis.navigator);
    /** @type {Record<string, unknown>} */
    let navigatorBase = {};
    if (typeof previousNavigator === 'object' && previousNavigator !== null) {
        navigatorBase = /** @type {Record<string, unknown>} */ (previousNavigator);
    }
    const nextNavigator = {...navigatorBase};
    nextNavigator.storage = {
        getDirectory: async () => rootDirectoryHandle,
    };
    Object.defineProperty(globalThis, 'navigator', {
        configurable: true,
        writable: true,
        value: nextNavigator,
    });
    return () => {
        if (typeof descriptor !== 'undefined') {
            Object.defineProperty(globalThis, 'navigator', descriptor);
            return;
        }
        Reflect.deleteProperty(globalThis, 'navigator');
    };
}

/**
 * @param {string} dictionary
 * @param {string} [dictionaryName]
 * @returns {Promise<ArrayBuffer>}
 */
async function createTestDictionaryArchiveData(dictionary, dictionaryName) {
    const dictionaryDirectory = join(dirname, 'data', 'dictionaries', dictionary);
    return await createDictionaryArchiveData(dictionaryDirectory, dictionaryName);
}

/**
 * @param {Uint8Array[]} chunks
 * @returns {Uint8Array}
 */
function concatUint8Arrays(chunks) {
    const totalLength = chunks.reduce((sum, chunk) => (sum + chunk.byteLength), 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.byteLength;
    }
    return result;
}

let zstdInitialized = false;

/**
 * @returns {Promise<void>}
 */
async function ensureZstdInitialized() {
    if (zstdInitialized) { return; }
    const wasmPath = join(dirname, '..', 'ext', 'lib', 'zstd.wasm');
    await zstdInit(new Uint8Array(readFileSync(wasmPath)));
    zstdInitialized = true;
}

/**
 * @param {DictionaryImporter} dictionaryImporter
 * @param {import('dictionary-data').IndexVersion} version
 * @param {string} dictionaryTitle
 * @param {import('dictionary-data').TermV1Array|import('dictionary-data').TermV3Array} rawEntries
 * @param {'legacy'|'raw-v3'|'raw-v4'} [termContentMode]
 * @returns {{payload: Uint8Array, sharedGlossaryBytes: Uint8Array|null}}
 * @throws {Error}
 */
function createTermArtifactPayload(dictionaryImporter, version, dictionaryTitle, rawEntries, termContentMode = 'legacy') {
    const textEncoder = new TextEncoder();
    if (!Array.isArray(rawEntries)) {
        throw new Error('Expected term bank entries array');
    }
    const convertTermBankEntryV1 = /** @type {(entry: import('dictionary-data').TermV1, dictionary: string) => import('dictionary-database').DatabaseTermEntry} */ (
        Reflect.get(dictionaryImporter, '_convertTermBankEntryV1').bind(dictionaryImporter)
    );
    const convertTermBankEntryV3 = /** @type {(entry: import('dictionary-data').TermV3, dictionary: string) => import('dictionary-database').DatabaseTermEntry} */ (
        Reflect.get(dictionaryImporter, '_convertTermBankEntryV3').bind(dictionaryImporter)
    );
    const prepareTermEntrySerialization = /** @type {(entry: import('dictionary-database').DatabaseTermEntry, enableTermEntryContentDedup: boolean) => void} */ (
        Reflect.get(dictionaryImporter, '_prepareTermEntrySerialization').bind(dictionaryImporter)
    );
    /** @type {Uint8Array[]} */
    const chunks = [textEncoder.encode('MBTB0001')];
    const sharedGlossaryBytes = termContentMode === 'raw-v3' || termContentMode === 'raw-v4' ? [] : null;
    /** @type {Map<string, {offset: number, length: number}>|null} */
    const sharedGlossarySpanByKey = termContentMode === 'raw-v3' || termContentMode === 'raw-v4' ? new Map() : null;
    const rowCountBytes = new Uint8Array(4);
    new DataView(rowCountBytes.buffer).setUint32(0, rawEntries.length, true);
    chunks.push(rowCountBytes);
    for (const rawEntry of rawEntries) {
        const entry = version === 1 ?
            convertTermBankEntryV1(/** @type {import('dictionary-data').TermV1} */ (/** @type {unknown} */ (rawEntry)), dictionaryTitle) :
            convertTermBankEntryV3(/** @type {import('dictionary-data').TermV3} */ (/** @type {unknown} */ (rawEntry)), dictionaryTitle);
        prepareTermEntrySerialization(entry, true);
        const expressionBytes = textEncoder.encode(entry.expression);
        const readingValue = entry.reading === entry.expression ? '' : entry.reading;
        const readingBytes = textEncoder.encode(readingValue);
        const contentBytes = (() => {
            if (termContentMode !== 'raw-v3' && termContentMode !== 'raw-v4') {
                return entry.termEntryContentBytes;
            }
            const glossaryBytes = textEncoder.encode(JSON.stringify(entry.glossary));
            const glossaryKey = JSON.stringify(entry.glossary);
            let span = /** @type {{offset: number, length: number}|undefined} */ (sharedGlossarySpanByKey?.get(glossaryKey));
            if (typeof span === 'undefined') {
                const sharedGlossaryChunks = /** @type {Uint8Array[]} */ (sharedGlossaryBytes ?? []);
                const offset = sharedGlossaryChunks.reduce((sum, chunk) => (sum + chunk.byteLength), 0);
                span = {offset, length: glossaryBytes.byteLength};
                sharedGlossarySpanByKey?.set(glossaryKey, span);
                sharedGlossaryChunks.push(glossaryBytes);
            }
            return encodeRawTermContentSharedGlossaryBinary(
                entry.rules,
                entry.definitionTags ?? '',
                entry.termTags ?? '',
                span.offset,
                span.length,
                textEncoder,
            );
        })();
        if (!(contentBytes instanceof Uint8Array)) {
            throw new Error('Expected precomputed term entry content bytes');
        }
        const header = new Uint8Array(24);
        const view = new DataView(header.buffer);
        view.setUint32(0, expressionBytes.byteLength, true);
        view.setUint32(4, readingBytes.byteLength, true);
        view.setInt32(8, entry.score, true);
        view.setInt32(12, entry.sequence ?? -1, true);
        view.setUint32(16, entry.termEntryContentHash1 ?? 0, true);
        view.setUint32(20, entry.termEntryContentHash2 ?? 0, true);
        const contentLengthBytes = new Uint8Array(4);
        new DataView(contentLengthBytes.buffer).setUint32(0, contentBytes.byteLength, true);
        chunks.push(
            header.subarray(0, 4),
            expressionBytes,
            header.subarray(4, 8),
            readingBytes,
            header.subarray(8, 24),
            contentLengthBytes,
            contentBytes,
        );
    }
    return {
        payload: concatUint8Arrays(chunks),
        sharedGlossaryBytes: Array.isArray(sharedGlossaryBytes) ? concatUint8Arrays(sharedGlossaryBytes) : null,
    };
}

/**
 * @param {string} dictionary
 * @param {string} [dictionaryName]
 * @param {'legacy'|'raw-v3'|'raw-v4'} [termContentMode]
 * @returns {Promise<ArrayBuffer>}
 */
async function createTestDictionaryArtifactArchiveData(dictionary, dictionaryName, termContentMode = 'legacy') {
    const dictionaryDirectory = join(dirname, 'data', 'dictionaries', dictionary);
    const fileNames = readdirSync(dictionaryDirectory);
    const zipFileWriter = new BlobWriter();
    const zipWriter = new ZipWriter(zipFileWriter, {level: 0});
    const dictionaryImporter = createDictionaryImporter({
        soft(value) {
            return {
                toBe(expected) {
                    if (value !== expected) {
                        throw new Error(`Expected ${String(value)} to be ${String(expected)}`);
                    }
                },
            };
        },
    });
    /** @type {Uint8Array[]} */
    const sharedGlossaryChunks = [];
    /** @type {Record<string, unknown>|null} */
    let rawIndex = null;
    for (const fileName of fileNames) {
        if (/^term_bank_\d+\.json$/i.test(fileName)) {
            const content = readFileSync(join(dictionaryDirectory, fileName), {encoding: 'utf8'});
            const rawEntriesJson = parseJson(content);
            if (!Array.isArray(rawEntriesJson)) {
                throw new Error(`Expected term bank array in ${fileName}`);
            }
            const rawEntries = /** @type {import('dictionary-data').TermV1Array|import('dictionary-data').TermV3Array} */ (rawEntriesJson);
            const indexContent = readFileSync(join(dictionaryDirectory, 'index.json'), {encoding: 'utf8'});
            /** @type {import('dictionary-data').Index} */
            const index = parseJson(indexContent);
            const dictionaryTitle = typeof dictionaryName === 'string' ? dictionaryName : index.title;
            const version = index.version ?? index.format;
            if (typeof version === 'undefined') {
                throw new Error(`Expected dictionary index version in ${dictionary}/index.json`);
            }
            const {payload: artifactPayload, sharedGlossaryBytes} = createTermArtifactPayload(dictionaryImporter, version, dictionaryTitle, rawEntries, termContentMode);
            const artifactName = fileName.replace(/\.json$/i, '.mbtb');
            await zipWriter.add(artifactName, new Blob([artifactPayload]).stream());
            if ((termContentMode === 'raw-v3' || termContentMode === 'raw-v4') && sharedGlossaryBytes instanceof Uint8Array && sharedGlossaryBytes.byteLength > 0) {
                sharedGlossaryChunks.push(sharedGlossaryBytes);
            }
            continue;
        }
        if (/\.json$/i.test(fileName)) {
            const content = readFileSync(join(dictionaryDirectory, fileName), {encoding: 'utf8'});
            /** @type {unknown} */
            let json = parseJson(content);
            if (fileName === 'index.json' && typeof dictionaryName === 'string' && typeof json === 'object' && json !== null) {
                json = {.../** @type {Record<string, unknown>} */(json), title: dictionaryName};
            }
            if (fileName === 'index.json' && typeof json === 'object' && json !== null) {
                rawIndex = {
                    .../** @type {Record<string, unknown>} */(json),
                    termContentMode,
                };
                continue;
            }
            await zipWriter.add(fileName, new TextReader(JSON.stringify(json, null, 0)));
            continue;
        }
        const content = readFileSync(join(dictionaryDirectory, fileName), {encoding: null});
        await zipWriter.add(fileName, new Blob([content]).stream());
    }
    if ((termContentMode === 'raw-v3' || termContentMode === 'raw-v4') && sharedGlossaryChunks.length > 0) {
        const sharedGlossaryBytes = concatUint8Arrays(sharedGlossaryChunks);
        let artifactBytes = sharedGlossaryBytes;
        if (termContentMode === 'raw-v4') {
            await ensureZstdInitialized();
            artifactBytes = zstdCompress(sharedGlossaryBytes, 1);
        }
        await zipWriter.add('manabitan-term-glossary-shared.bin', new Blob([artifactBytes]).stream());
        if (rawIndex !== null) {
            rawIndex = {
                ...rawIndex,
                sharedGlossaryArtifact: {
                    file: 'manabitan-term-glossary-shared.bin',
                    ...(termContentMode === 'raw-v4' ? {uncompressedLength: sharedGlossaryBytes.byteLength} : {}),
                },
            };
        }
    }
    if (rawIndex !== null) {
        await zipWriter.add('index.json', new TextReader(JSON.stringify(rawIndex, null, 0)));
    }
    const blob = await zipWriter.close();
    return await blob.arrayBuffer();
}

/**
 * @param {{soft: (value: boolean) => {toBe: (expected: boolean) => void}}} testExpect
 * @param {import('dictionary-importer').OnProgressCallback} [onProgress]
 * @returns {DictionaryImporter}
 */
function createDictionaryImporter(testExpect, onProgress) {
    const dictionaryImporterMediaLoader = new DictionaryImporterMediaLoader();
    return new DictionaryImporter(dictionaryImporterMediaLoader, (...args) => {
        const {index, count} = args[0];
        testExpect.soft(index <= count).toBe(true);
        if (typeof onProgress === 'function') {
            onProgress(...args);
        }
    });
}

/**
 * @param {import('dictionary-database').TermEntry[]} dictionaryDatabaseEntries
 * @param {string} term
 * @returns {number}
 */
function countDictionaryDatabaseEntriesWithTerm(dictionaryDatabaseEntries, term) {
    return dictionaryDatabaseEntries.reduce((i, v) => (i + (v.term === term ? 1 : 0)), 0);
}

/**
 * @param {import('dictionary-database').TermEntry[]} dictionaryDatabaseEntries
 * @param {string} reading
 * @returns {number}
 */
function countDictionaryDatabaseEntriesWithReading(dictionaryDatabaseEntries, reading) {
    return dictionaryDatabaseEntries.reduce((i, v) => (i + (v.reading === reading ? 1 : 0)), 0);
}

/**
 * @param {import('dictionary-database').TermMeta[]|import('dictionary-database').KanjiMeta[]} metas
 * @param {import('dictionary-database').TermMetaType|import('dictionary-database').KanjiMetaType} mode
 * @returns {number}
 */
function countMetasWithMode(metas, mode) {
    let i = 0;
    for (const item of metas) {
        if (item.mode === mode) { ++i; }
    }
    return i;
}

/**
 * @param {import('dictionary-database').KanjiEntry[]} kanji
 * @param {string} character
 * @returns {number}
 */
function countKanjiWithCharacter(kanji, character) {
    let i = 0;
    for (const item of kanji) {
        if (item.character === character) { ++i; }
    }
    return i;
}


/** */
describe('Database', () => {
    beforeEach(async () => {
        globalThis.indexedDB = new IDBFactory();
    });
    test('Database invalid usage', async ({expect}) => {
        // Load dictionary data
        const testDictionarySource = await createTestDictionaryArchiveData('valid-dictionary1');
        const testDictionaryIndex = await getDictionaryArchiveIndex(testDictionarySource);

        const title = testDictionaryIndex.title;
        const titles = new Map([
            [title, {alias: title, allowSecondarySearches: false}],
        ]);

        // Setup database
        const dictionaryDatabase = new DictionaryDatabase();
        /** @type {import('dictionary-importer').ImportDetails} */
        const defaultImportDetails = {prefixWildcardsSupported: false, yomitanVersion: '0.0.0.0'};

        // Database not open
        await expect.soft(dictionaryDatabase.deleteDictionary(title, 1000, () => {})).rejects.toThrow('Database not open');
        await expect.soft(dictionaryDatabase.findTermsBulk(['?'], titles, 'exact')).rejects.toThrow('Database not open');
        await expect.soft(dictionaryDatabase.findTermsExactBulk([{term: '?', reading: '?'}], titles)).rejects.toThrow('Database not open');
        await expect.soft(dictionaryDatabase.findTermsBySequenceBulk([{query: 1, dictionary: title}])).rejects.toThrow('Database not open');
        await expect.soft(dictionaryDatabase.findTermMetaBulk(['?'], titles)).rejects.toThrow('Database not open');
        await expect.soft(dictionaryDatabase.findTermMetaBulk(['?'], titles)).rejects.toThrow('Database not open');
        await expect.soft(dictionaryDatabase.findKanjiBulk(['?'], titles)).rejects.toThrow('Database not open');
        await expect.soft(dictionaryDatabase.findKanjiMetaBulk(['?'], titles)).rejects.toThrow('Database not open');
        await expect.soft(dictionaryDatabase.findTagForTitle('tag', title)).rejects.toThrow('Database not open');
        await expect.soft(dictionaryDatabase.getDictionaryInfo()).rejects.toThrow('Database not open');
        await expect.soft(dictionaryDatabase.getDictionaryCounts([...titles.keys()], true)).rejects.toThrow('Database not open');
        await expect.soft(createDictionaryImporter(expect).importDictionary(dictionaryDatabase, testDictionarySource, defaultImportDetails)).rejects.toThrow('Database is not ready');

        await dictionaryDatabase.prepare();

        // Already prepared
        await expect.soft(dictionaryDatabase.prepare()).rejects.toThrow('Database already open');

        await createDictionaryImporter(expect).importDictionary(dictionaryDatabase, testDictionarySource, defaultImportDetails);

        // Dictionary already imported
        const duplicateImportResult = await createDictionaryImporter(expect).importDictionary(
            dictionaryDatabase,
            testDictionarySource,
            defaultImportDetails,
        );
        expect.soft(duplicateImportResult.result).toBeNull();
        expect.soft(duplicateImportResult.errors).toStrictEqual([new Error('Dictionary Test Dictionary is already imported, skipped it.')]);

        await dictionaryDatabase.close();
    });
    describe('Invalid dictionaries', () => {
        const invalidDictionaries = [
            {name: 'invalid-dictionary1'},
            {name: 'invalid-dictionary2'},
            {name: 'invalid-dictionary3'},
            {name: 'invalid-dictionary4'},
            {name: 'invalid-dictionary5'},
            {name: 'invalid-dictionary6'},
        ];
        describe.each(invalidDictionaries)('Invalid dictionary: $name', ({name}) => {
            test('Has invalid data', async ({expect}) => {
                const dictionaryDatabase = new DictionaryDatabase();
                await dictionaryDatabase.prepare();

                const testDictionarySource = await createTestDictionaryArchiveData(name);

                /** @type {import('dictionary-importer').ImportDetails} */
                const detaultImportDetails = {prefixWildcardsSupported: false, yomitanVersion: '0.0.0.0'};
                try {
                    const {result, errors} = await createDictionaryImporter(expect).importDictionary(dictionaryDatabase, testDictionarySource, detaultImportDetails);
                    if (result === null) {
                        expect.soft(errors.length).toBeGreaterThan(0);
                        const info = await dictionaryDatabase.getDictionaryInfo();
                        expect.soft(info).toStrictEqual([]);
                    } else {
                        expect.soft(result.importSuccess).toBe(true);
                    }
                } catch (error) {
                    expect.soft(error instanceof Error).toBe(true);
                }
                await dictionaryDatabase.close();
            });
        });

        test('Rejects unsupported dictionary index versions', async ({expect}) => {
            const dictionaryDatabase = new DictionaryDatabase();
            await dictionaryDatabase.prepare();

            const testDictionarySource = await createTestDictionaryArchiveData('invalid-dictionary1');

            /** @type {import('dictionary-importer').ImportDetails} */
            const importDetails = {prefixWildcardsSupported: false, yomitanVersion: '0.0.0.0'};
            try {
                const {result, errors} = await createDictionaryImporter(expect).importDictionary(
                    dictionaryDatabase,
                    testDictionarySource,
                    importDetails,
                );
                expect.soft(result).toBeNull();
                expect.soft(errors.some((error) => error.message.includes('Unsupported dictionary format version: 0'))).toBe(true);
                expect.soft(await dictionaryDatabase.getDictionaryInfo()).toStrictEqual([]);
            } finally {
                await dictionaryDatabase.close();
            }
        });
    });
    describe('Database valid usage', () => {
        const testDataFilePath = join(dirname, 'data/database-test-cases.json');
        /** @type {import('test/database').DatabaseTestData} */
        const testData = parseJson(readFileSync(testDataFilePath, {encoding: 'utf8'}));
        test('Rejects worker imports when fallback storage is detected', async ({expect}) => {
            const dictionaryWorkerHandler = new DictionaryWorkerHandler();
            /**
             * @type {{
             *   usesFallbackStorage: () => boolean,
             *   exportDatabase: () => Promise<ArrayBuffer>,
             *   importDatabase: (content: ArrayBuffer) => Promise<void>,
             *   close: () => Promise<void>
              }} */
            const fakeDatabase = {
                usesFallbackStorage: () => true,
                exportDatabase: async () => new ArrayBuffer(8),
                importDatabase: async () => {},
                close: async () => {},
            };
            const getPreparedDictionaryDatabaseSpy = vi.spyOn(dictionaryWorkerHandler, '_getPreparedDictionaryDatabase').mockResolvedValue(
                /** @type {any} */ (fakeDatabase),
            );
            const importDictionarySpy = vi.spyOn(DictionaryImporter.prototype, 'importDictionary').mockResolvedValue({
                result: /** @type {import('dictionary-importer').Summary} */ ({title: 'mock', revision: 'mock', sequenced: true, version: 3, importDate: 0, prefixWildcardsSupported: false, styles: ''}),
                errors: [],
            });

            const importDictionaryInternal = /** @type {(params: import('dictionary-worker-handler').ImportDictionaryMessageParams, onProgress: (...args: unknown[]) => void) => Promise<import('dictionary-worker').MessageCompleteResultSerialized>} */ (
                Reflect.get(dictionaryWorkerHandler, '_importDictionary').bind(dictionaryWorkerHandler)
            );
            /** @type {import('dictionary-importer').ImportDetails} */
            const importDetails = {
                prefixWildcardsSupported: false,
                yomitanVersion: '0.0.0.0',
            };
            try {
                await expect.soft(
                    importDictionaryInternal({details: importDetails, archiveContent: new ArrayBuffer(0)}, () => {}),
                ).rejects.toThrow('OPFS is required for dictionary import');
            } finally {
                getPreparedDictionaryDatabaseSpy.mockRestore();
                importDictionarySpy.mockRestore();
            }
        });
        test('Deduplicates shared term entry content', async ({expect}) => {
            const dictionaryDatabase = new DictionaryDatabase();
            await dictionaryDatabase.prepare();

            /** @type {import('dictionary-database').DatabaseTermEntry[]} */
            const entries = [
                {
                    dictionary: 'dedupe-dict',
                    expression: '語1',
                    reading: 'ご1',
                    definitionTags: 'n',
                    termTags: '',
                    rules: '',
                    score: 1,
                    glossary: ['shared definition'],
                    sequence: 1,
                },
                {
                    dictionary: 'dedupe-dict',
                    expression: '語2',
                    reading: 'ご2',
                    definitionTags: 'n',
                    termTags: '',
                    rules: '',
                    score: 2,
                    glossary: ['shared definition'],
                    sequence: 2,
                },
                {
                    dictionary: 'dedupe-dict',
                    expression: '語3',
                    reading: 'ご3',
                    definitionTags: 'n',
                    termTags: '',
                    rules: '',
                    score: 3,
                    glossary: ['different definition'],
                    sequence: 3,
                },
            ];

            await dictionaryDatabase.bulkAdd('terms', entries, 0, entries.length);

            // eslint-disable-next-line no-underscore-dangle
            const db = dictionaryDatabase._requireDb();
            const termsCount = db.selectValue('SELECT COUNT(*) FROM terms');
            const termsWithExternalContentCount = db.selectValue(`
                SELECT COUNT(*)
                FROM terms
                WHERE entryContentOffset IS NOT NULL AND entryContentLength IS NOT NULL
            `);
            const reusedContentCount = db.selectValue(`
                SELECT COUNT(*)
                FROM (
                    SELECT entryContentOffset, entryContentLength, entryContentDictName
                    FROM terms
                    GROUP BY entryContentOffset, entryContentLength, entryContentDictName
                    HAVING COUNT(*) > 1
                )
            `);

            expect.soft(termsCount).toStrictEqual(3);
            expect.soft(termsWithExternalContentCount).toStrictEqual(3);
            expect.soft(reusedContentCount).toStrictEqual(1);

            const titles = new Map([['dedupe-dict', {alias: 'dedupe-dict', allowSecondarySearches: false}]]);
            const results = await dictionaryDatabase.findTermsExactBulk([{term: '語2', reading: 'ご2'}], titles);
            expect.soft(results.length).toStrictEqual(1);
            expect.soft(results[0].definitions).toStrictEqual(['shared definition']);

            await dictionaryDatabase.close();
        });

        test('Does not deduplicate shared term entry content when dedup is disabled', async ({expect}) => {
            const dictionaryDatabase = new DictionaryDatabase();
            await dictionaryDatabase.prepare();
            dictionaryDatabase.setTermEntryContentDedupEnabled(false);

            /** @type {import('dictionary-database').DatabaseTermEntry[]} */
            const entries = [
                {
                    dictionary: 'dedupe-off-dict',
                    expression: '語1',
                    reading: 'ご1',
                    definitionTags: 'n',
                    termTags: '',
                    rules: '',
                    score: 1,
                    glossary: ['shared definition'],
                    sequence: 1,
                },
                {
                    dictionary: 'dedupe-off-dict',
                    expression: '語2',
                    reading: 'ご2',
                    definitionTags: 'n',
                    termTags: '',
                    rules: '',
                    score: 2,
                    glossary: ['shared definition'],
                    sequence: 2,
                },
            ];

            await dictionaryDatabase.bulkAdd('terms', entries, 0, entries.length);

            // eslint-disable-next-line no-underscore-dangle
            const db = dictionaryDatabase._requireDb();
            const reusedContentCount = db.selectValue(`
                SELECT COUNT(*)
                FROM (
                    SELECT entryContentOffset, entryContentLength, entryContentDictName
                    FROM terms
                    GROUP BY entryContentOffset, entryContentLength, entryContentDictName
                    HAVING COUNT(*) > 1
                )
            `);
            expect.soft(reusedContentCount).toStrictEqual(0);

            await dictionaryDatabase.close();
        });

        test('Uses fast term parser for media-enabled imports', async ({expect}) => {
            const testDictionarySource = await createTestDictionaryArchiveData('valid-dictionary1');
            const dictionaryDatabase = new DictionaryDatabase();
            await dictionaryDatabase.prepare();
            const readTermBankFileFastSpy = vi.spyOn(DictionaryImporter.prototype, '_readTermBankFileFast');
            try {
                const dictionaryImporter = createDictionaryImporter(expect);
                const {result, errors} = await dictionaryImporter.importDictionary(
                    dictionaryDatabase,
                    testDictionarySource,
                    {prefixWildcardsSupported: true, yomitanVersion: '0.0.0.0'},
                );
                expect.soft(errors).toStrictEqual([]);
                expect.soft(result).not.toBeNull();
                expect.soft(readTermBankFileFastSpy).toHaveBeenCalled();

                const info = await dictionaryDatabase.getDictionaryInfo();
                expect.soft(info.length).toBe(1);
                if (info.length > 0 && typeof info[0].counts === 'object' && info[0].counts !== null) {
                    expect.soft(info[0].counts.media.total).toBeGreaterThan(0);
                }
            } finally {
                readTermBankFileFastSpy.mockRestore();
                await dictionaryDatabase.close();
            }
        });

        test('Prefers term artifact files when archive provides them', async ({expect}) => {
            const testDictionarySource = await createTestDictionaryArtifactArchiveData('valid-dictionary1', 'Artifact Dictionary');
            const dictionaryDatabase = new DictionaryDatabase();
            await dictionaryDatabase.prepare();
            const readTermBankArtifactFileSpy = vi.spyOn(DictionaryImporter.prototype, '_readTermBankArtifactFile');
            const decodeTermBankArtifactBytesSpy = vi.spyOn(DictionaryImporter.prototype, '_decodeTermBankArtifactBytes');
            const readTermBankFileFastSpy = vi.spyOn(DictionaryImporter.prototype, '_readTermBankFileFast');
            try {
                const dictionaryImporter = createDictionaryImporter(expect);
                const {result, errors} = await dictionaryImporter.importDictionary(
                    dictionaryDatabase,
                    testDictionarySource,
                    {prefixWildcardsSupported: true, yomitanVersion: '0.0.0.0'},
                );
                expect.soft(errors).toStrictEqual([]);
                expect.soft(result).not.toBeNull();
                expect.soft(
                    readTermBankArtifactFileSpy.mock.calls.length + decodeTermBankArtifactBytesSpy.mock.calls.length,
                ).toBeGreaterThan(0);
                expect.soft(readTermBankFileFastSpy).not.toHaveBeenCalled();

                const info = await dictionaryDatabase.getDictionaryInfo();
                expect.soft(info.length).toBe(1);
                expect.soft(info[0]?.title).toBe('Artifact Dictionary');
                expect.soft(info[0]?.importSuccess).toBe(true);
            } finally {
                readTermBankArtifactFileSpy.mockRestore();
                decodeTermBankArtifactBytesSpy.mockRestore();
                readTermBankFileFastSpy.mockRestore();
                await dictionaryDatabase.close();
            }
        });

        test('Imports raw-v3 term artifact files and preserves lookup/counts', async ({expect}) => {
            const testDictionarySource = await createTestDictionaryArtifactArchiveData('valid-dictionary1', 'Artifact Raw Dictionary', 'raw-v3');
            const dictionaryDatabase = new DictionaryDatabase();
            await dictionaryDatabase.prepare();
            try {
                const dictionaryImporter = createDictionaryImporter(expect);
                const {result, errors} = await dictionaryImporter.importDictionary(
                    dictionaryDatabase,
                    testDictionarySource,
                    {prefixWildcardsSupported: true, yomitanVersion: '0.0.0.0'},
                );
                expect.soft(errors).toStrictEqual([]);
                expect.soft(result).not.toBeNull();

                const info = await dictionaryDatabase.getDictionaryInfo();
                expect.soft(info.length).toBe(1);
                expect.soft(info[0]?.title).toBe('Artifact Raw Dictionary');
                expect.soft(info[0]?.importSuccess).toBe(true);

                const counts = await dictionaryDatabase.getDictionaryCounts(['Artifact Raw Dictionary'], true);
                expect.soft(counts.total?.terms ?? 0).toBeGreaterThan(0);

                const titles = new Map([
                    ['Artifact Raw Dictionary', {alias: 'Artifact Raw Dictionary', allowSecondarySearches: false}],
                ]);
                const results = await dictionaryDatabase.findTermsBulk(['打'], titles, 'exact');
                expect.soft(results.length).toBeGreaterThan(0);
                expect.soft(results.some((entry) => entry.dictionary === 'Artifact Raw Dictionary')).toBe(true);
            } finally {
                await dictionaryDatabase.close();
            }
        });

        test('Imports raw-v4 term artifact files and preserves lookup/counts', async ({expect}) => {
            const testDictionarySource = await createTestDictionaryArtifactArchiveData('valid-dictionary1', 'Artifact Raw V4 Dictionary', 'raw-v4');
            const dictionaryDatabase = new DictionaryDatabase();
            await dictionaryDatabase.prepare();
            try {
                const dictionaryImporter = createDictionaryImporter(expect);
                const {result, errors} = await dictionaryImporter.importDictionary(
                    dictionaryDatabase,
                    testDictionarySource,
                    {prefixWildcardsSupported: true, yomitanVersion: '0.0.0.0'},
                );
                expect.soft(errors).toStrictEqual([]);
                expect.soft(result).not.toBeNull();

                const info = await dictionaryDatabase.getDictionaryInfo();
                expect.soft(info.length).toBe(1);
                expect.soft(info[0]?.title).toBe('Artifact Raw V4 Dictionary');
                expect.soft(info[0]?.importSuccess).toBe(true);

                const counts = await dictionaryDatabase.getDictionaryCounts(['Artifact Raw V4 Dictionary'], true);
                expect.soft(counts.total?.terms ?? 0).toBeGreaterThan(0);

                const titles = new Map([
                    ['Artifact Raw V4 Dictionary', {alias: 'Artifact Raw V4 Dictionary', allowSecondarySearches: false}],
                ]);
                const results = await dictionaryDatabase.findTermsBulk(['打'], titles, 'exact');
                expect.soft(results.length).toBeGreaterThan(0);
                expect.soft(results.some((entry) => entry.dictionary === 'Artifact Raw V4 Dictionary')).toBe(true);
            } finally {
                await dictionaryDatabase.close();
            }
        });

        test('Import data and test', async ({expect}) => {
            const fakeImportDate = testData.expectedSummary.importDate;

            // Load dictionary data
            const testDictionarySource = await createTestDictionaryArchiveData('valid-dictionary1');
            const testDictionaryIndex = await getDictionaryArchiveIndex(testDictionarySource);

            const title = testDictionaryIndex.title;
            const titles = new Map([
                [title, {alias: title, allowSecondarySearches: false}],
            ]);

            // Setup database
            const dictionaryDatabase = new DictionaryDatabase();
            await dictionaryDatabase.prepare();

            // Import data
            let progressEvent1 = false;
            const dictionaryImporter = createDictionaryImporter(expect, () => { progressEvent1 = true; });
            const {result: importDictionaryResult, errors: importDictionaryErrors} = await dictionaryImporter.importDictionary(
                dictionaryDatabase,
                testDictionarySource,
                {prefixWildcardsSupported: true, yomitanVersion: '0.0.0.0'},
            );

            if (importDictionaryResult) {
                importDictionaryResult.importDate = fakeImportDate;
            }

            expect.soft(importDictionaryErrors).toStrictEqual([]);
            expect.soft(importDictionaryResult).toStrictEqual(testData.expectedSummary);
            expect.soft(progressEvent1).toBe(true);

            // Get info summary
            const info = await dictionaryDatabase.getDictionaryInfo();
            for (const item of info) { item.importDate = fakeImportDate; }
            expect.soft(info).toStrictEqual([testData.expectedSummary]);

            // Get counts
            const counts = await dictionaryDatabase.getDictionaryCounts(info.map((v) => v.title), true);
            expect.soft(counts).toStrictEqual(testData.expectedCounts);

            // Test findTermsBulk
            for (const {inputs, expectedResults} of testData.tests.findTermsBulk) {
                for (const {termList, matchType} of inputs) {
                    const results = await dictionaryDatabase.findTermsBulk(termList, titles, matchType);
                    expect.soft(results.length).toStrictEqual(expectedResults.total);
                    for (const [term, count] of expectedResults.terms) {
                        expect.soft(countDictionaryDatabaseEntriesWithTerm(results, term)).toStrictEqual(count);
                    }
                    for (const [reading, count] of expectedResults.readings) {
                        expect.soft(countDictionaryDatabaseEntriesWithReading(results, reading)).toStrictEqual(count);
                    }
                }
            }

            // Test findTermsExactBulk
            for (const {inputs, expectedResults} of testData.tests.findTermsExactBulk) {
                for (const {termList} of inputs) {
                    const results = await dictionaryDatabase.findTermsExactBulk(termList, titles);
                    expect.soft(results.length).toStrictEqual(expectedResults.total);
                    for (const [term, count] of expectedResults.terms) {
                        expect.soft(countDictionaryDatabaseEntriesWithTerm(results, term)).toStrictEqual(count);
                    }
                    for (const [reading, count] of expectedResults.readings) {
                        expect.soft(countDictionaryDatabaseEntriesWithReading(results, reading)).toStrictEqual(count);
                    }
                }
            }

            // Test findTermsBySequenceBulk
            for (const {inputs, expectedResults} of testData.tests.findTermsBySequenceBulk) {
                for (const {sequenceList} of inputs) {
                    const results = await dictionaryDatabase.findTermsBySequenceBulk(sequenceList.map((query) => ({query, dictionary: title})));
                    expect.soft(results.length).toStrictEqual(expectedResults.total);
                    for (const [term, count] of expectedResults.terms) {
                        expect.soft(countDictionaryDatabaseEntriesWithTerm(results, term)).toStrictEqual(count);
                    }
                    for (const [reading, count] of expectedResults.readings) {
                        expect.soft(countDictionaryDatabaseEntriesWithReading(results, reading)).toStrictEqual(count);
                    }
                }
            }

            // Test findTermMetaBulk
            for (const {inputs, expectedResults} of testData.tests.findTermMetaBulk) {
                for (const {termList} of inputs) {
                    const results = await dictionaryDatabase.findTermMetaBulk(termList, titles);
                    expect.soft(results.length).toStrictEqual(expectedResults.total);
                    for (const [mode, count] of expectedResults.modes) {
                        expect.soft(countMetasWithMode(results, mode)).toStrictEqual(count);
                    }
                }
            }

            // Test findKanjiBulk
            for (const {inputs, expectedResults} of testData.tests.findKanjiBulk) {
                for (const {kanjiList} of inputs) {
                    const results = await dictionaryDatabase.findKanjiBulk(kanjiList, titles);
                    expect.soft(results.length).toStrictEqual(expectedResults.total);
                    for (const [kanji, count] of expectedResults.kanji) {
                        expect.soft(countKanjiWithCharacter(results, kanji)).toStrictEqual(count);
                    }
                }
            }

            // Test findKanjiBulk
            for (const {inputs, expectedResults} of testData.tests.findKanjiMetaBulk) {
                for (const {kanjiList} of inputs) {
                    const results = await dictionaryDatabase.findKanjiMetaBulk(kanjiList, titles);
                    expect.soft(results.length).toStrictEqual(expectedResults.total);
                    for (const [mode, count] of expectedResults.modes) {
                        expect.soft(countMetasWithMode(results, mode)).toStrictEqual(count);
                    }
                }
            }

            // Test findTagForTitle
            for (const {inputs, expectedResults} of testData.tests.findTagForTitle) {
                for (const {name} of inputs) {
                    const result = await dictionaryDatabase.findTagForTitle(name, title);
                    expect.soft(result).toStrictEqual(expectedResults.value);
                }
            }

            // Close
            await dictionaryDatabase.close();
        });

        test('Removes partially imported dictionaries after import failure', async ({expect}) => {
            const testDictionarySource = await createTestDictionaryArchiveData('valid-dictionary1');
            const dictionaryDatabase = new DictionaryDatabase();
            await dictionaryDatabase.prepare();

            const originalBulkAdd = dictionaryDatabase.bulkAdd.bind(dictionaryDatabase);
            let injectedFailureTriggered = false;
            const bulkAddSpy = vi.spyOn(dictionaryDatabase, 'bulkAdd').mockImplementation(async (...args) => {
                const [objectStoreName] = args;
                await originalBulkAdd(...args);
                if (objectStoreName === 'termMeta') {
                    injectedFailureTriggered = true;
                    throw new Error('Injected import failure');
                }
            });

            try {
                const dictionaryImporter = createDictionaryImporter(expect);
                const {result, errors} = await dictionaryImporter.importDictionary(
                    dictionaryDatabase,
                    testDictionarySource,
                    {prefixWildcardsSupported: true, yomitanVersion: '0.0.0.0'},
                );
                expect.soft(injectedFailureTriggered).toBe(true);
                expect.soft(result).toBeNull();
                expect.soft(errors.some((error) => error.message.includes('Injected import failure'))).toBe(true);

                const info = await dictionaryDatabase.getDictionaryInfo();
                expect.soft(info).toStrictEqual([]);

                const counts = await dictionaryDatabase.getDictionaryCounts([], true);
                expect.soft(counts.total).toStrictEqual({kanji: 0, kanjiMeta: 0, terms: 0, termMeta: 0, tagMeta: 0, media: 0});
            } finally {
                bulkAddSpy.mockRestore();
                await dictionaryDatabase.close();
            }
        });

        test('Reads terms correctly when storing glossary content as raw bytes', async ({expect}) => {
            const testDictionarySource = await createTestDictionaryArchiveData('valid-dictionary1');
            const testDictionaryIndex = await getDictionaryArchiveIndex(testDictionarySource);
            const dictionaryDatabase = new DictionaryDatabase();
            await dictionaryDatabase.prepare();

            const dictionaryImporter = createDictionaryImporter(expect);
            const {result, errors} = await dictionaryImporter.importDictionary(
                dictionaryDatabase,
                testDictionarySource,
                {
                    prefixWildcardsSupported: true,
                    yomitanVersion: '0.0.0.0',
                    enableTermEntryContentDedup: true,
                    termContentStorageMode: 'raw-bytes',
                },
            );
            expect.soft(errors).toStrictEqual([]);
            expect.soft(result).not.toBeNull();
            const info = await dictionaryDatabase.getDictionaryInfo();
            expect.soft(info.length).toBe(1);
            expect.soft(info[0]?.counts?.terms.total).toBeGreaterThan(0);

            const titles = new Map([
                [testDictionaryIndex.title, {alias: testDictionaryIndex.title, allowSecondarySearches: false}],
            ]);
            const results = await dictionaryDatabase.findTermsBulk(['打'], titles, 'exact');
            expect.soft(results.length).toBeGreaterThan(0);
            expect.soft(countDictionaryDatabaseEntriesWithTerm(results, '打')).toBeGreaterThan(0);
            await dictionaryDatabase.close();
        });

        test('Exact lookup negative cache is scoped to enabled dictionary set', async ({expect}) => {
            const testDictionarySource = await createTestDictionaryArchiveData('valid-dictionary1');
            const testDictionaryIndex = await getDictionaryArchiveIndex(testDictionarySource);
            const dictionaryDatabase = new DictionaryDatabase();
            await dictionaryDatabase.prepare();

            const dictionaryImporter = createDictionaryImporter(expect);
            await dictionaryImporter.importDictionary(
                dictionaryDatabase,
                testDictionarySource,
                {prefixWildcardsSupported: true, yomitanVersion: '0.0.0.0'},
            );

            const installedTitles = new Map([
                [testDictionaryIndex.title, {alias: testDictionaryIndex.title, allowSecondarySearches: false}],
            ]);
            const missingTitles = new Map([
                ['__manabitan_missing_dictionary__', {alias: '__manabitan_missing_dictionary__', allowSecondarySearches: false}],
            ]);

            const missingResults = await dictionaryDatabase.findTermsBulk(['打'], missingTitles, 'exact');
            expect.soft(missingResults).toStrictEqual([]);

            const installedResults = await dictionaryDatabase.findTermsBulk(['打'], installedTitles, 'exact');
            expect.soft(installedResults.length).toBeGreaterThan(0);
            expect.soft(countDictionaryDatabaseEntriesWithTerm(installedResults, '打')).toBeGreaterThan(0);
            await dictionaryDatabase.close();
        });

        test('Retains multiple imported dictionaries and returns results from both', async ({expect}) => {
            const sourceA = await createTestDictionaryArchiveData('valid-dictionary1', 'Dictionary A');
            const sourceB = await createTestDictionaryArchiveData('valid-dictionary1', 'Dictionary B');
            const dictionaryDatabase = new DictionaryDatabase();
            await dictionaryDatabase.prepare();

            const dictionaryImporter = createDictionaryImporter(expect);
            await dictionaryImporter.importDictionary(
                dictionaryDatabase,
                sourceA,
                {prefixWildcardsSupported: true, yomitanVersion: '0.0.0.0'},
            );
            await dictionaryImporter.importDictionary(
                dictionaryDatabase,
                sourceB,
                {prefixWildcardsSupported: true, yomitanVersion: '0.0.0.0'},
            );

            const info = await dictionaryDatabase.getDictionaryInfo();
            expect.soft(info.map(({title}) => title).sort()).toStrictEqual(['Dictionary A', 'Dictionary B']);

            const titles = new Map([
                ['Dictionary A', {alias: 'Dictionary A', allowSecondarySearches: false}],
                ['Dictionary B', {alias: 'Dictionary B', allowSecondarySearches: false}],
            ]);
            const results = await dictionaryDatabase.findTermsBulk(['打'], titles, 'exact');
            const dictionaries = new Set(results.map(({dictionary}) => dictionary));
            expect.soft(dictionaries).toStrictEqual(new Set(['Dictionary A', 'Dictionary B']));

            await dictionaryDatabase.close();
        });

        test('Recovers incomplete import on startup when immediate cleanup fails', async ({expect}) => {
            const testDictionarySource = await createTestDictionaryArchiveData('valid-dictionary1');
            const testDictionaryIndex = await getDictionaryArchiveIndex(testDictionarySource);
            const dictionaryDatabase = new DictionaryDatabase();
            await dictionaryDatabase.prepare();

            const originalBulkAdd = dictionaryDatabase.bulkAdd.bind(dictionaryDatabase);
            let injectedFailureTriggered = false;
            const bulkAddSpy = vi.spyOn(dictionaryDatabase, 'bulkAdd').mockImplementation(async (...args) => {
                const [objectStoreName] = args;
                await originalBulkAdd(...args);
                if (!injectedFailureTriggered && objectStoreName === 'termMeta') {
                    injectedFailureTriggered = true;
                    throw new Error('Injected import failure for crash-recovery');
                }
            });

            const deleteDictionarySpy = vi.spyOn(dictionaryDatabase, 'deleteDictionary').mockImplementation(async () => {
                throw new Error('Injected cleanup deletion failure for crash-recovery');
            });

            try {
                const dictionaryImporter = createDictionaryImporter(expect);
                const {result, errors} = await dictionaryImporter.importDictionary(
                    dictionaryDatabase,
                    testDictionarySource,
                    {prefixWildcardsSupported: true, yomitanVersion: '0.0.0.0'},
                );

                expect.soft(injectedFailureTriggered).toBe(true);
                expect.soft(result).toBeNull();
                expect.soft(errors.some((error) => error.message.includes('Injected import failure for crash-recovery'))).toBe(true);
                expect.soft(errors.some((error) => error.message.includes('Failed to clean up partially imported dictionary'))).toBe(true);

                const interimInfo = await dictionaryDatabase.getDictionaryInfo();
                expect.soft(interimInfo.length).toBe(1);
                expect.soft(interimInfo[0]?.title).toBe(testDictionaryIndex.title);
                expect.soft(interimInfo[0]?.importSuccess).toBe(false);
            } finally {
                deleteDictionarySpy.mockRestore();
                bulkAddSpy.mockRestore();
                await dictionaryDatabase.close();
            }

            const reopenedDictionaryDatabase = new DictionaryDatabase();
            await reopenedDictionaryDatabase.prepare();
            try {
                const info = await reopenedDictionaryDatabase.getDictionaryInfo();
                expect.soft(info).toStrictEqual([]);

                const counts = await reopenedDictionaryDatabase.getDictionaryCounts([], true);
                expect.soft(counts.total).toStrictEqual({kanji: 0, kanjiMeta: 0, terms: 0, termMeta: 0, tagMeta: 0, media: 0});
            } finally {
                await reopenedDictionaryDatabase.close();
            }
        }, 15000);

        test('Preserves the live dictionary when staged title cutover fails before delete', async ({expect}) => {
            const liveDictionarySource = await createTestDictionaryArchiveData('valid-dictionary1', 'Live Dictionary');
            const stagedDictionarySource = await createTestDictionaryArchiveData('valid-dictionary1', 'Live Dictionary');
            const stagedDictionaryTitle = 'Live Dictionary [update-staging cutover-test]';
            const dictionaryDatabase = new DictionaryDatabase();
            await dictionaryDatabase.prepare();

            const dictionaryImporter = createDictionaryImporter(expect);
            await dictionaryImporter.importDictionary(
                dictionaryDatabase,
                liveDictionarySource,
                {prefixWildcardsSupported: true, yomitanVersion: '0.0.0.0'},
            );
            await dictionaryImporter.importDictionary(
                dictionaryDatabase,
                stagedDictionarySource,
                {
                    prefixWildcardsSupported: true,
                    yomitanVersion: '0.0.0.0',
                    dictionaryTitleOverride: stagedDictionaryTitle,
                },
            );

            // eslint-disable-next-line no-underscore-dangle
            const replaceDictionaryNameSpy = vi.spyOn(dictionaryDatabase._termRecordStore, 'replaceDictionaryName').mockImplementationOnce(async () => {
                throw new Error('Injected staged cutover failure');
            });

            try {
                await expect.soft(dictionaryDatabase.replaceDictionaryTitle(
                    stagedDictionaryTitle,
                    'Live Dictionary',
                    {title: 'Live Dictionary', sourceTitle: 'Live Dictionary'},
                    'Live Dictionary',
                )).rejects.toThrow('Injected staged cutover failure');

                const info = await dictionaryDatabase.getDictionaryInfo();
                const titles = info.map(({title}) => title);
                expect.soft(titles.some((title) => title === 'Live Dictionary')).toBe(true);
                expect.soft(titles.some((title) => title.includes('[cutover '))).toBe(false);
            } finally {
                replaceDictionaryNameSpy.mockRestore();
                await dictionaryDatabase.close();
            }
        }, 15000);

        test('Removes the temporary replaced dictionary when post-cutover delete fails', async ({expect}) => {
            const liveDictionarySource = await createTestDictionaryArchiveData('valid-dictionary1', 'Live Dictionary');
            const stagedDictionarySource = await createTestDictionaryArchiveData('valid-dictionary1', 'Live Dictionary');
            const stagedDictionaryTitle = 'Live Dictionary [update-staging cleanup-test]';
            const dictionaryDatabase = new DictionaryDatabase();
            await dictionaryDatabase.prepare();

            const dictionaryImporter = createDictionaryImporter(expect);
            await dictionaryImporter.importDictionary(
                dictionaryDatabase,
                liveDictionarySource,
                {prefixWildcardsSupported: true, yomitanVersion: '0.0.0.0'},
            );
            await dictionaryImporter.importDictionary(
                dictionaryDatabase,
                stagedDictionarySource,
                {
                    prefixWildcardsSupported: true,
                    yomitanVersion: '0.0.0.0',
                    dictionaryTitleOverride: stagedDictionaryTitle,
                },
            );

            const originalDeleteDictionary = dictionaryDatabase.deleteDictionary.bind(dictionaryDatabase);
            const deleteDictionarySpy = vi.spyOn(dictionaryDatabase, 'deleteDictionary').mockImplementation(async (title, deleteStepSize, onProgress) => {
                if (typeof title === 'string' && title.includes('[replaced ') && !title.includes('[retry-ok]')) {
                    throw new Error('Injected replaced-title delete failure');
                }
                await originalDeleteDictionary(title, deleteStepSize, onProgress);
            });

            try {
                await dictionaryDatabase.replaceDictionaryTitle(
                    stagedDictionaryTitle,
                    'Live Dictionary',
                    {title: 'Live Dictionary', sourceTitle: 'Live Dictionary'},
                    'Live Dictionary',
                );

                const info = await dictionaryDatabase.getDictionaryInfo();
                const titles = info.map(({title}) => title);
                expect.soft(titles).toStrictEqual(['Live Dictionary']);
                expect.soft(titles.some((title) => title.includes('[replaced '))).toBe(false);
            } finally {
                deleteDictionarySpy.mockRestore();
                await dictionaryDatabase.close();
            }
        }, 15000);

        test('Cleans incomplete dictionaries during prepare', async ({expect}) => {
            const testDictionarySource = await createTestDictionaryArchiveData('valid-dictionary1');
            const testDictionaryIndex = await getDictionaryArchiveIndex(testDictionarySource);
            const dictionaryImporter = createDictionaryImporter(expect);

            const dictionaryDatabase = new DictionaryDatabase();
            await dictionaryDatabase.prepare();
            await dictionaryImporter.importDictionary(
                dictionaryDatabase,
                testDictionarySource,
                {prefixWildcardsSupported: true, yomitanVersion: '0.0.0.0'},
            );

            // eslint-disable-next-line no-underscore-dangle
            const db = dictionaryDatabase._requireDb();
            const summaryRow = db.selectObject('SELECT summaryJson FROM dictionaries WHERE title = $title LIMIT 1', {$title: testDictionaryIndex.title});
            expect.soft(typeof summaryRow).toBe('object');
            if (typeof summaryRow === 'undefined') {
                throw new Error('Imported dictionary summary row missing');
            }
            const summaryJson = summaryRow.summaryJson;
            expect.soft(typeof summaryJson).toBe('string');
            if (typeof summaryJson !== 'string') {
                throw new Error('Imported dictionary summaryJson is not a string');
            }
            const summary = /** @type {{importSuccess?: boolean}} */ (parseJson(summaryJson));
            summary.importSuccess = false;
            db.exec({
                sql: 'UPDATE dictionaries SET summaryJson = $summaryJson WHERE title = $title',
                bind: {
                    $summaryJson: JSON.stringify(summary),
                    $title: testDictionaryIndex.title,
                },
            });
            await dictionaryDatabase.close();

            const reopenedDictionaryDatabase = new DictionaryDatabase();
            await reopenedDictionaryDatabase.prepare();
            try {
                const info = await reopenedDictionaryDatabase.getDictionaryInfo();
                expect.soft(info).toStrictEqual([]);

                const counts = await reopenedDictionaryDatabase.getDictionaryCounts([], true);
                expect.soft(counts.total).toStrictEqual({kanji: 0, kanjiMeta: 0, terms: 0, termMeta: 0, tagMeta: 0, media: 0});
            } finally {
                await reopenedDictionaryDatabase.close();
            }
        }, 15000);

        test('Cleans dictionaries with corrupted summary JSON during prepare', async ({expect}) => {
            const testDictionarySource = await createTestDictionaryArchiveData('valid-dictionary1');
            const testDictionaryIndex = await getDictionaryArchiveIndex(testDictionarySource);
            const dictionaryImporter = createDictionaryImporter(expect);

            const dictionaryDatabase = new DictionaryDatabase();
            await dictionaryDatabase.prepare();
            await dictionaryImporter.importDictionary(
                dictionaryDatabase,
                testDictionarySource,
                {prefixWildcardsSupported: true, yomitanVersion: '0.0.0.0'},
            );

            // eslint-disable-next-line no-underscore-dangle
            const db = dictionaryDatabase._requireDb();
            db.exec({
                sql: 'UPDATE dictionaries SET summaryJson = $summaryJson WHERE title = $title',
                bind: {
                    $summaryJson: '{invalid-json',
                    $title: testDictionaryIndex.title,
                },
            });
            await dictionaryDatabase.close();

            const reopenedDictionaryDatabase = new DictionaryDatabase();
            await reopenedDictionaryDatabase.prepare();
            try {
                const info = await reopenedDictionaryDatabase.getDictionaryInfo();
                expect.soft(info).toStrictEqual([]);

                const counts = await reopenedDictionaryDatabase.getDictionaryCounts([], true);
                expect.soft(counts.total).toStrictEqual({kanji: 0, kanjiMeta: 0, terms: 0, termMeta: 0, tagMeta: 0, media: 0});
            } finally {
                await reopenedDictionaryDatabase.close();
            }
        }, 15000);

        test('Cleans dictionaries with missing term-record shard during prepare', async ({expect}) => {
            const testDictionarySource = await createTestDictionaryArchiveData('valid-dictionary1');
            const testDictionaryIndex = await getDictionaryArchiveIndex(testDictionarySource);
            const dictionaryImporter = createDictionaryImporter(expect);
            const opfsRootDirectoryHandle = createInMemoryOpfsDirectoryHandle();
            const restoreNavigator = installInMemoryOpfsNavigator(opfsRootDirectoryHandle);

            const dictionaryDatabase = new DictionaryDatabase();
            try {
                await dictionaryDatabase.prepare();
                await dictionaryImporter.importDictionary(
                    dictionaryDatabase,
                    testDictionarySource,
                    {prefixWildcardsSupported: true, yomitanVersion: '0.0.0.0'},
                );
                await dictionaryDatabase.close();

                const recordsDirectoryHandle = /** @type {{getDirectoryHandle: (name: string, options?: {create?: boolean}) => Promise<{removeEntry: (name: string) => Promise<void>}>}} */ (
                    opfsRootDirectoryHandle
                );
                const termRecordsDirectory = await recordsDirectoryHandle.getDirectoryHandle('manabitan-term-records', {create: false});
                const shardFileName = `dict-${encodeURIComponent(testDictionaryIndex.title)}.mbtr`;
                await termRecordsDirectory.removeEntry(shardFileName);

                const reopenedDictionaryDatabase = new DictionaryDatabase();
                await reopenedDictionaryDatabase.prepare();
                try {
                    const info = await reopenedDictionaryDatabase.getDictionaryInfo();
                    expect.soft(info).toStrictEqual([]);

                    const counts = await reopenedDictionaryDatabase.getDictionaryCounts([], true);
                    expect.soft(counts.total).toStrictEqual({kanji: 0, kanjiMeta: 0, terms: 0, termMeta: 0, tagMeta: 0, media: 0});
                } finally {
                    await reopenedDictionaryDatabase.close();
                }
            } finally {
                restoreNavigator();
            }
        }, 15000);

        test('Rebuilds stale empty direct term index from loaded term records', async ({expect}) => {
            const opfsRootDirectoryHandle = createInMemoryOpfsDirectoryHandle();
            const restoreNavigator = installInMemoryOpfsNavigator(opfsRootDirectoryHandle);

            try {
                const termRecordStore = new TermRecordOpfsStore();
                await termRecordStore.prepare();
                await termRecordStore.appendBatch([{
                    dictionary: 'Test Dictionary',
                    expression: '打つ',
                    reading: 'うつ',
                    expressionReverse: null,
                    readingReverse: null,
                    entryContentOffset: 0,
                    entryContentLength: 1,
                    entryContentDictName: 'raw',
                    score: 0,
                    sequence: 1,
                }]);

                const reopenedTermRecordStore = new TermRecordOpfsStore();
                await reopenedTermRecordStore.prepare();
                try {
                    // Simulate a stale empty cached index even though the records are loaded.
                    // eslint-disable-next-line no-underscore-dangle
                    reopenedTermRecordStore._indexByDictionary.set('Test Dictionary', {
                        expression: new Map(),
                        reading: new Map(),
                        expressionReverse: new Map(),
                        readingReverse: new Map(),
                        pair: new Map(),
                        sequence: new Map(),
                    });
                    const rebuilt = reopenedTermRecordStore.getDictionaryIndex('Test Dictionary');
                    expect.soft(rebuilt.expression.get('打つ')?.length ?? 0).toBeGreaterThan(0);
                    expect.soft(rebuilt.reading.get('うつ')?.length ?? 0).toBeGreaterThan(0);
                    expect.soft(rebuilt.expressionReverse.get('つ打')?.length ?? 0).toBeGreaterThan(0);
                    expect.soft(rebuilt.readingReverse.get('つう')?.length ?? 0).toBeGreaterThan(0);
                } finally {
                    await reopenedTermRecordStore.reset();
                }
            } finally {
                restoreNavigator();
            }
        }, 15000);

        test('Reports startup cleanup summary counts and failures', async ({expect}) => {
            const dictionaryDatabase = new DictionaryDatabase();
            await dictionaryDatabase.prepare();

            // eslint-disable-next-line no-underscore-dangle
            const db = dictionaryDatabase._requireDb();
            db.exec({
                sql: 'INSERT INTO dictionaries(title, version, summaryJson) VALUES ($title, $version, $summaryJson)',
                bind: {
                    $title: 'Healthy',
                    $version: 3,
                    $summaryJson: JSON.stringify({title: 'Healthy', revision: '1', version: 3, importSuccess: true}),
                },
            });
            db.exec({
                sql: 'INSERT INTO dictionaries(title, version, summaryJson) VALUES ($title, $version, $summaryJson)',
                bind: {
                    $title: '',
                    $version: 3,
                    $summaryJson: JSON.stringify({title: '', revision: '1', version: 3, importSuccess: false}),
                },
            });
            db.exec({
                sql: 'INSERT INTO dictionaries(title, version, summaryJson) VALUES ($title, $version, $summaryJson)',
                bind: {
                    $title: 'Broken Parse',
                    $version: 3,
                    $summaryJson: '{broken-json',
                },
            });
            db.exec({
                sql: 'INSERT INTO dictionaries(title, version, summaryJson) VALUES ($title, $version, $summaryJson)',
                bind: {
                    $title: 'Broken Flag',
                    $version: 3,
                    $summaryJson: JSON.stringify({title: 'Broken Flag', revision: '1', version: 3, importSuccess: false}),
                },
            });
            db.exec({
                sql: 'INSERT INTO dictionaries(title, version, summaryJson) VALUES ($title, $version, $summaryJson)',
                bind: {
                    $title: 'Healthy [cutover abc123]',
                    $version: 3,
                    $summaryJson: JSON.stringify({
                        title: 'Healthy [cutover abc123]',
                        revision: '1',
                        version: 3,
                        importSuccess: true,
                        transientUpdateStage: 'cutover',
                        updateSessionToken: 'abc123',
                    }),
                },
            });
            db.exec({
                sql: 'INSERT INTO dictionaries(title, version, summaryJson) VALUES ($title, $version, $summaryJson)',
                bind: {
                    $title: 'Legit [cutover abc123]',
                    $version: 3,
                    $summaryJson: JSON.stringify({title: 'Legit [cutover abc123]', revision: '1', version: 3, importSuccess: true}),
                },
            });

            const originalDeleteDictionary = dictionaryDatabase.deleteDictionary.bind(dictionaryDatabase);
            const deleteDictionarySpy = vi.spyOn(dictionaryDatabase, 'deleteDictionary').mockImplementation(async (title, deleteStepSize, onProgress) => {
                if (title === 'Broken Flag') {
                    throw new Error('Injected startup cleanup delete failure');
                }
                await originalDeleteDictionary(title, deleteStepSize, onProgress);
            });

            try {
                const cleanupMethod = Reflect.get(dictionaryDatabase, '_cleanupIncompleteImports');
                if (typeof cleanupMethod !== 'function') {
                    throw new Error('Expected _cleanupIncompleteImports method');
                }
                const summary = await Promise.resolve(cleanupMethod.call(dictionaryDatabase));
                expect.soft(summary).toStrictEqual({
                    scannedCount: 6,
                    removedCount: 3,
                    removedTitles: ['Broken Parse', 'Healthy [cutover abc123]'],
                    removedEmptyTitleRows: 1,
                    failedCount: 1,
                    failedTitles: ['Broken Flag'],
                    parseErrorCount: 1,
                });

                const remainingTitles = db.selectObjects('SELECT title FROM dictionaries ORDER BY title ASC').map((row) => row.title);
                expect.soft(remainingTitles).toStrictEqual(['Broken Flag', 'Healthy', 'Legit [cutover abc123]']);
            } finally {
                deleteDictionarySpy.mockRestore();
                await dictionaryDatabase.close();
            }
        });

        test('Schema migration v1 wipes unversioned dictionary data and advances to current schema version', async ({expect}) => {
            const testDictionarySource = await createTestDictionaryArchiveData('valid-dictionary1');
            const dictionaryDatabase = new DictionaryDatabase();
            await dictionaryDatabase.prepare();
            const dictionaryImporter = createDictionaryImporter(expect);
            await dictionaryImporter.importDictionary(
                dictionaryDatabase,
                testDictionarySource,
                {prefixWildcardsSupported: true, yomitanVersion: '0.0.0.0'},
            );

            const beforeInfo = await dictionaryDatabase.getDictionaryInfo();
            expect.soft(beforeInfo.length).toBe(1);
            // eslint-disable-next-line no-underscore-dangle
            const db = dictionaryDatabase._requireDb();
            db.exec('PRAGMA user_version = 0');
            const runSchemaMigrations = Reflect.get(dictionaryDatabase, '_runSchemaMigrations');
            if (typeof runSchemaMigrations !== 'function') {
                throw new Error('Expected _runSchemaMigrations method');
            }
            await Promise.resolve(runSchemaMigrations.call(dictionaryDatabase));

            const afterInfo = await dictionaryDatabase.getDictionaryInfo();
            expect.soft(afterInfo).toStrictEqual([]);
            const counts = await dictionaryDatabase.getDictionaryCounts([], true);
            expect.soft(counts.total).toStrictEqual({kanji: 0, kanjiMeta: 0, terms: 0, termMeta: 0, tagMeta: 0, media: 0});
            expect.soft(Number(db.selectValue('PRAGMA user_version'))).toBe(4);
            await dictionaryDatabase.close();
        });

        test('Schema migration v2 upgrades from v1 without wiping dictionary data, and v3 resets for raw-v3 schema', async ({expect}) => {
            const testDictionarySource = await createTestDictionaryArchiveData('valid-dictionary1');
            const dictionaryDatabase = new DictionaryDatabase();
            await dictionaryDatabase.prepare();
            const dictionaryImporter = createDictionaryImporter(expect);
            await dictionaryImporter.importDictionary(
                dictionaryDatabase,
                testDictionarySource,
                {prefixWildcardsSupported: true, yomitanVersion: '0.0.0.0'},
            );

            // eslint-disable-next-line no-underscore-dangle
            const db = dictionaryDatabase._requireDb();
            db.exec('PRAGMA user_version = 1');
            const runSchemaMigrations = Reflect.get(dictionaryDatabase, '_runSchemaMigrations');
            if (typeof runSchemaMigrations !== 'function') {
                throw new Error('Expected _runSchemaMigrations method');
            }
            await Promise.resolve(runSchemaMigrations.call(dictionaryDatabase));
            const runSchemaMigrationToVersion = Reflect.get(dictionaryDatabase, '_runSchemaMigrationToVersion');
            if (typeof runSchemaMigrationToVersion !== 'function') {
                throw new Error('Expected _runSchemaMigrationToVersion method');
            }
            const v2Summary = await Promise.resolve(runSchemaMigrationToVersion.call(dictionaryDatabase, 2));

            const afterInfo = await dictionaryDatabase.getDictionaryInfo();
            expect.soft(afterInfo).toStrictEqual([]);
            expect.soft(Number(db.selectValue('PRAGMA user_version'))).toBe(4);
            expect.soft(v2Summary).toStrictEqual({migration: 'schema-v2-noop'});
            await dictionaryDatabase.close();
        });

        test('Schema migration rerun is idempotent at current version', async ({expect}) => {
            const testDictionarySource = await createTestDictionaryArchiveData('valid-dictionary1');
            const dictionaryDatabase = new DictionaryDatabase();
            await dictionaryDatabase.prepare();
            const dictionaryImporter = createDictionaryImporter(expect);
            await dictionaryImporter.importDictionary(
                dictionaryDatabase,
                testDictionarySource,
                {prefixWildcardsSupported: true, yomitanVersion: '0.0.0.0'},
            );

            // eslint-disable-next-line no-underscore-dangle
            const db = dictionaryDatabase._requireDb();
            const runSchemaMigrations = Reflect.get(dictionaryDatabase, '_runSchemaMigrations');
            if (typeof runSchemaMigrations !== 'function') {
                throw new Error('Expected _runSchemaMigrations method');
            }
            await Promise.resolve(runSchemaMigrations.call(dictionaryDatabase));
            await Promise.resolve(runSchemaMigrations.call(dictionaryDatabase));

            const info = await dictionaryDatabase.getDictionaryInfo();
            expect.soft(info.length).toBe(1);
            expect.soft(info[0]?.importSuccess).toBe(true);
            expect.soft(Number(db.selectValue('PRAGMA user_version'))).toBe(4);
            await dictionaryDatabase.close();
        });

        test('Schema migration is skipped when installed version is newer', async ({expect}) => {
            const testDictionarySource = await createTestDictionaryArchiveData('valid-dictionary1');
            const dictionaryDatabase = new DictionaryDatabase();
            await dictionaryDatabase.prepare();
            const dictionaryImporter = createDictionaryImporter(expect);
            await dictionaryImporter.importDictionary(
                dictionaryDatabase,
                testDictionarySource,
                {prefixWildcardsSupported: true, yomitanVersion: '0.0.0.0'},
            );

            // eslint-disable-next-line no-underscore-dangle
            const db = dictionaryDatabase._requireDb();
            db.exec('PRAGMA user_version = 999');
            const runSchemaMigrations = Reflect.get(dictionaryDatabase, '_runSchemaMigrations');
            if (typeof runSchemaMigrations !== 'function') {
                throw new Error('Expected _runSchemaMigrations method');
            }
            await Promise.resolve(runSchemaMigrations.call(dictionaryDatabase));

            const info = await dictionaryDatabase.getDictionaryInfo();
            expect.soft(info.length).toBe(1);
            expect.soft(info[0]?.importSuccess).toBe(true);
            expect.soft(Number(db.selectValue('PRAGMA user_version'))).toBe(999);
            await dictionaryDatabase.close();
        });
    });
    describe('Database cleanup', () => {
        /** @type {{clearMethod: 'purge'|'delete'}[]} */
        const cleanupTestCases = [
            {clearMethod: 'purge'},
            {clearMethod: 'delete'},
        ];
        describe.each(cleanupTestCases)('Testing cleanup method $clearMethod', ({clearMethod}) => {
            test('Import data and test', async ({expect}) => {
                // Load dictionary data
                const testDictionarySource = await createTestDictionaryArchiveData('valid-dictionary1');
                const testDictionaryIndex = await getDictionaryArchiveIndex(testDictionarySource);

                // Setup database
                const dictionaryDatabase = new DictionaryDatabase();
                await dictionaryDatabase.prepare();

                // Import data
                const dictionaryImporter = createDictionaryImporter(expect);
                await dictionaryImporter.importDictionary(dictionaryDatabase, testDictionarySource, {prefixWildcardsSupported: true, yomitanVersion: '0.0.0.0'});

                // Clear
                switch (clearMethod) {
                    case 'purge':
                        await dictionaryDatabase.purge();
                        break;
                    case 'delete':
                        {
                            let progressEvent2 = false;
                            await dictionaryDatabase.deleteDictionary(
                                testDictionaryIndex.title,
                                1000,
                                () => { progressEvent2 = true; },
                            );
                            expect(progressEvent2).toBe(true);
                        }
                        break;
                }

                // Test empty
                const info = await dictionaryDatabase.getDictionaryInfo();
                expect.soft(info).toStrictEqual([]);

                const counts = await dictionaryDatabase.getDictionaryCounts([], true);
                /** @type {import('dictionary-database').DictionaryCounts} */
                const countsExpected = {
                    counts: [],
                    total: {kanji: 0, kanjiMeta: 0, terms: 0, termMeta: 0, tagMeta: 0, media: 0},
                };
                expect.soft(counts).toStrictEqual(countsExpected);

                // Close
                await dictionaryDatabase.close();
            }, 15000);
        });
    });
});
