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
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join, dirname as pathDirname} from 'path';
import {beforeEach, describe, test, vi} from 'vitest';
import {createDictionaryArchiveData, getDictionaryArchiveIndex} from '../dev/dictionary-archive-util.js';
import {parseJson} from '../dev/json.js';
import {DictionaryDatabase} from '../ext/js/dictionary/dictionary-database.js';
import {DictionaryImporter} from '../ext/js/dictionary/dictionary-importer.js';
import {DictionaryWorkerHandler} from '../ext/js/dictionary/dictionary-worker-handler.js';
import {chrome, fetch} from './mocks/common.js';
import {DictionaryImporterMediaLoader} from './mocks/dictionary-importer-media-loader.js';
import {setupStubs} from './utilities/database.js';

const dirname = pathDirname(fileURLToPath(import.meta.url));

setupStubs();
vi.stubGlobal('IDBKeyRange', IDBKeyRange);
vi.stubGlobal('fetch', fetch);
vi.stubGlobal('chrome', chrome);

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
 * @param {import('vitest').ExpectStatic} expect
 * @param {import('dictionary-importer').OnProgressCallback} [onProgress]
 * @returns {DictionaryImporter}
 */
function createDictionaryImporter(expect, onProgress) {
    const dictionaryImporterMediaLoader = new DictionaryImporterMediaLoader();
    return new DictionaryImporter(dictionaryImporterMediaLoader, (...args) => {
        const {index, count} = args[0];
        expect.soft(index <= count).toBe(true);
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
        expect.soft(await createDictionaryImporter(expect).importDictionary(dictionaryDatabase, testDictionarySource, defaultImportDetails)).toEqual({result: null, errors: [new Error('Dictionary Test Dictionary is already imported, skipped it.')]});

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
        });

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
        });

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
                    scannedCount: 4,
                    removedCount: 2,
                    removedTitles: ['Broken Parse'],
                    removedEmptyTitleRows: 1,
                    failedCount: 1,
                    failedTitles: ['Broken Flag'],
                    parseErrorCount: 1,
                });

                const remainingTitles = db.selectObjects('SELECT title FROM dictionaries ORDER BY title ASC').map((row) => row.title);
                expect.soft(remainingTitles).toStrictEqual(['Broken Flag', 'Healthy']);
            } finally {
                deleteDictionarySpy.mockRestore();
                await dictionaryDatabase.close();
            }
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
            });
        });
    });
});
