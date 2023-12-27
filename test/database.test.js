/*
 * Copyright (C) 2023  Yomitan Authors
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
import path from 'path';
import {beforeEach, describe, expect, test, vi} from 'vitest';
import {parseJson} from '../dev/json.js';
import {createDictionaryArchive} from '../dev/util.js';
import {DictionaryDatabase} from '../ext/js/dictionary/dictionary-database.js';
import {DictionaryImporter} from '../ext/js/dictionary/dictionary-importer.js';
import {DictionaryImporterMediaLoader} from './mocks/dictionary-importer-media-loader.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));

vi.stubGlobal('IDBKeyRange', IDBKeyRange);

/**
 * @param {string} dictionary
 * @param {string} [dictionaryName]
 * @returns {import('jszip')}
 */
function createTestDictionaryArchive(dictionary, dictionaryName) {
    const dictionaryDirectory = path.join(dirname, 'data', 'dictionaries', dictionary);
    return createDictionaryArchive(dictionaryDirectory, dictionaryName);
}


/**
 * @param {import('dictionary-importer').OnProgressCallback} [onProgress]
 * @returns {DictionaryImporter}
 */
function createDictionaryImporter(onProgress) {
    const dictionaryImporterMediaLoader = new DictionaryImporterMediaLoader();
    return new DictionaryImporter(dictionaryImporterMediaLoader, (...args) => {
        const {stepIndex, stepCount, index, count} = args[0];
        expect(stepIndex < stepCount).toBe(true);
        expect(index <= count).toBe(true);
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
async function testDatabase1() {
    test('Database1', async () => {
        // Load dictionary data
        const testDictionary = createTestDictionaryArchive('valid-dictionary1');
        const testDictionarySource = await testDictionary.generateAsync({type: 'arraybuffer'});
        /** @type {import('dictionary-data').Index} */
        const testDictionaryIndex = parseJson(await testDictionary.files['index.json'].async('string'));

        const title = testDictionaryIndex.title;
        const titles = new Map([
            [title, {priority: 0, allowSecondarySearches: false}]
        ]);

        // Setup iteration data
        const iterations = [
            {
                cleanup: async () => {
                // Test purge
                    await dictionaryDatabase.purge();
                    await testDatabaseEmpty1(dictionaryDatabase);
                }
            },
            {
                cleanup: async () => {
                // Test deleteDictionary
                    let progressEvent = false;
                    await dictionaryDatabase.deleteDictionary(
                        title,
                        1000,
                        () => {
                            progressEvent = true;
                        }
                    );
                    expect(progressEvent).toBe(true);

                    await testDatabaseEmpty1(dictionaryDatabase);
                }
            },
            {
                cleanup: async () => {}
            }
        ];

        // Setup database
        const dictionaryDatabase = new DictionaryDatabase();
        await dictionaryDatabase.prepare();

        for (const {cleanup} of iterations) {
            /** @type {import('dictionary-importer').Summary} */
            const expectedSummary = {
                title,
                revision: 'test',
                sequenced: true,
                version: 3,
                importDate: 0,
                prefixWildcardsSupported: true,
                counts: {
                    kanji: {total: 2},
                    kanjiMeta: {total: 6, freq: 6},
                    media: {total: 6},
                    tagMeta: {total: 15},
                    termMeta: {total: 39, freq: 31, pitch: 7, ipa: 1},
                    terms: {total: 23}
                }
            };

            // Import data
            let progressEvent = false;
            const dictionaryImporter = createDictionaryImporter(() => { progressEvent = true; });
            const {result, errors} = await dictionaryImporter.importDictionary(
                dictionaryDatabase,
                testDictionarySource,
                {prefixWildcardsSupported: true}
            );
            expectedSummary.importDate = result.importDate;
            expect(errors).toStrictEqual([]);
            expect(result).toStrictEqual(expectedSummary);
            expect(progressEvent).toBe(true);

            // Get info summary
            const info = await dictionaryDatabase.getDictionaryInfo();
            expect(info).toStrictEqual([expectedSummary]);

            // Get counts
            const counts = await dictionaryDatabase.getDictionaryCounts(
                info.map((v) => v.title),
                true
            );
            expect(counts).toStrictEqual({
                counts: [{kanji: 2, kanjiMeta: 6, terms: 23, termMeta: 39, tagMeta: 15, media: 6}],
                total: {kanji: 2, kanjiMeta: 6, terms: 23, termMeta: 39, tagMeta: 15, media: 6}
            });

            // Test find* functions
            await testFindTermsBulkTest1(dictionaryDatabase, titles);
            await testFindTermsExactBulk1(dictionaryDatabase, titles);
            await testFindTermsBySequenceBulk1(dictionaryDatabase, title);
            await testFindTermMetaBulk1(dictionaryDatabase, titles);
            await testFindKanjiBulk1(dictionaryDatabase, titles);
            await testFindKanjiMetaBulk1(dictionaryDatabase, titles);
            await testFindTagForTitle1(dictionaryDatabase, title);

            // Cleanup
            await cleanup();
        }

        await dictionaryDatabase.close();
    });
}

/**
 * @param {DictionaryDatabase} database
 */
async function testDatabaseEmpty1(database) {
    test('DatabaseEmpty1', async () => {
        const info = await database.getDictionaryInfo();
        expect(info).toStrictEqual([]);

        const counts = await database.getDictionaryCounts([], true);
        expect(counts).toStrictEqual({
            counts: [],
            total: {kanji: 0, kanjiMeta: 0, terms: 0, termMeta: 0, tagMeta: 0, media: 0}
        });
    });
}

/**
 * @param {DictionaryDatabase} database
 * @param {import('dictionary-database').DictionarySet} titles
 */
async function testFindTermsBulkTest1(database, titles) {
    test('FindTermsBulkTest1', async () => {
        /** @type {{inputs: {matchType: import('dictionary-database').MatchType, termList: string[]}[], expectedResults: {total: number, terms: [key: string, count: number][], readings: [key: string, count: number][]}}[]} */
        const data = [
            {
                inputs: [
                    {
                        matchType: 'exact',
                        termList: ['打', '打つ', '打ち込む']
                    },
                    {
                        matchType: 'exact',
                        termList: ['だ', 'ダース', 'うつ', 'ぶつ', 'うちこむ', 'ぶちこむ']
                    },
                    {
                        matchType: 'prefix',
                        termList: ['打']
                    }
                ],
                expectedResults: {
                    total: 10,
                    terms: [
                        ['打', 2],
                        ['打つ', 4],
                        ['打ち込む', 4]
                    ],
                    readings: [
                        ['だ', 1],
                        ['ダース', 1],
                        ['うつ', 2],
                        ['ぶつ', 2],
                        ['うちこむ', 2],
                        ['ぶちこむ', 2]
                    ]
                }
            },
            {
                inputs: [
                    {
                        matchType: 'exact',
                        termList: ['込む']
                    }
                ],
                expectedResults: {
                    total: 0,
                    terms: [],
                    readings: []
                }
            },
            {
                inputs: [
                    {
                        matchType: 'suffix',
                        termList: ['込む']
                    }
                ],
                expectedResults: {
                    total: 4,
                    terms: [
                        ['打ち込む', 4]
                    ],
                    readings: [
                        ['うちこむ', 2],
                        ['ぶちこむ', 2]
                    ]
                }
            },
            {
                inputs: [
                    {
                        matchType: 'exact',
                        termList: []
                    }
                ],
                expectedResults: {
                    total: 0,
                    terms: [],
                    readings: []
                }
            }
        ];

        for (const {inputs, expectedResults} of data) {
            for (const {termList, matchType} of inputs) {
                const results = await database.findTermsBulk(termList, titles, matchType);
                expect(results.length).toStrictEqual(expectedResults.total);
                for (const [term, count] of expectedResults.terms) {
                    expect(countDictionaryDatabaseEntriesWithTerm(results, term)).toStrictEqual(count);
                }
                for (const [reading, count] of expectedResults.readings) {
                    expect(countDictionaryDatabaseEntriesWithReading(results, reading)).toStrictEqual(count);
                }
            }
        }
    });
}

/**
 * @param {DictionaryDatabase} database
 * @param {import('dictionary-database').DictionarySet} titles
 */
async function testFindTermsExactBulk1(database, titles) {
    test('FindTermsExactBulk1', async () => {
        /** @type {{inputs: {termList: {term: string, reading: string}[]}[], expectedResults: {total: number, terms: [key: string, count: number][], readings: [key: string, count: number][]}}[]} */
        const data = [
            {
                inputs: [
                    {
                        termList: [
                            {term: '打', reading: 'だ'},
                            {term: '打つ', reading: 'うつ'},
                            {term: '打ち込む', reading: 'うちこむ'}
                        ]
                    }
                ],
                expectedResults: {
                    total: 5,
                    terms: [
                        ['打', 1],
                        ['打つ', 2],
                        ['打ち込む', 2]
                    ],
                    readings: [
                        ['だ', 1],
                        ['うつ', 2],
                        ['うちこむ', 2]
                    ]
                }
            },
            {
                inputs: [
                    {
                        termList: [
                            {term: '打', reading: 'だ?'},
                            {term: '打つ', reading: 'うつ?'},
                            {term: '打ち込む', reading: 'うちこむ?'}
                        ]
                    }
                ],
                expectedResults: {
                    total: 0,
                    terms: [],
                    readings: []
                }
            },
            {
                inputs: [
                    {
                        termList: [
                            {term: '打つ', reading: 'うつ'},
                            {term: '打つ', reading: 'ぶつ'}
                        ]
                    }
                ],
                expectedResults: {
                    total: 4,
                    terms: [
                        ['打つ', 4]
                    ],
                    readings: [
                        ['うつ', 2],
                        ['ぶつ', 2]
                    ]
                }
            },
            {
                inputs: [
                    {
                        termList: [
                            {term: '打つ', reading: 'うちこむ'}
                        ]
                    }
                ],
                expectedResults: {
                    total: 0,
                    terms: [],
                    readings: []
                }
            },
            {
                inputs: [
                    {
                        termList: []
                    }
                ],
                expectedResults: {
                    total: 0,
                    terms: [],
                    readings: []
                }
            }
        ];

        for (const {inputs, expectedResults} of data) {
            for (const {termList} of inputs) {
                const results = await database.findTermsExactBulk(termList, titles);
                expect(results.length).toStrictEqual(expectedResults.total);
                for (const [term, count] of expectedResults.terms) {
                    expect(countDictionaryDatabaseEntriesWithTerm(results, term)).toStrictEqual(count);
                }
                for (const [reading, count] of expectedResults.readings) {
                    expect(countDictionaryDatabaseEntriesWithReading(results, reading)).toStrictEqual(count);
                }
            }
        }
    });
}

/**
 * @param {DictionaryDatabase} database
 * @param {string} mainDictionary
 */
async function testFindTermsBySequenceBulk1(database, mainDictionary) {
    test('FindTermsBySequenceBulk1', async () => {
        /** @type {{inputs: {sequenceList: number[]}[], expectedResults: {total: number, terms: [key: string, count: number][], readings: [key: string, count: number][]}}[]} */
        const data = [
            {
                inputs: [
                    {
                        sequenceList: [1, 2, 3, 4, 5]
                    }
                ],
                expectedResults: {
                    total: 11,
                    terms: [
                        ['打', 2],
                        ['打つ', 4],
                        ['打ち込む', 4],
                        ['画像', 1]
                    ],
                    readings: [
                        ['だ', 1],
                        ['ダース', 1],
                        ['うつ', 2],
                        ['ぶつ', 2],
                        ['うちこむ', 2],
                        ['ぶちこむ', 2],
                        ['がぞう', 1]
                    ]
                }
            },
            {
                inputs: [
                    {
                        sequenceList: [1]
                    }
                ],
                expectedResults: {
                    total: 1,
                    terms: [
                        ['打', 1]
                    ],
                    readings: [
                        ['だ', 1]
                    ]
                }
            },
            {
                inputs: [
                    {
                        sequenceList: [2]
                    }
                ],
                expectedResults: {
                    total: 1,
                    terms: [
                        ['打', 1]
                    ],
                    readings: [
                        ['ダース', 1]
                    ]
                }
            },
            {
                inputs: [
                    {
                        sequenceList: [3]
                    }
                ],
                expectedResults: {
                    total: 4,
                    terms: [
                        ['打つ', 4]
                    ],
                    readings: [
                        ['うつ', 2],
                        ['ぶつ', 2]
                    ]
                }
            },
            {
                inputs: [
                    {
                        sequenceList: [4]
                    }
                ],
                expectedResults: {
                    total: 4,
                    terms: [
                        ['打ち込む', 4]
                    ],
                    readings: [
                        ['うちこむ', 2],
                        ['ぶちこむ', 2]
                    ]
                }
            },
            {
                inputs: [
                    {
                        sequenceList: [5]
                    }
                ],
                expectedResults: {
                    total: 1,
                    terms: [
                        ['画像', 1]
                    ],
                    readings: [
                        ['がぞう', 1]
                    ]
                }
            },
            {
                inputs: [
                    {
                        sequenceList: [1099490]
                    }
                ],
                expectedResults: {
                    total: 1,
                    terms: [
                        ['発条', 1]
                    ],
                    readings: [
                        ['ばね', 1]
                    ]
                }
            },
            {
                inputs: [
                    {
                        sequenceList: [-1]
                    }
                ],
                expectedResults: {
                    total: 0,
                    terms: [],
                    readings: []
                }
            },
            {
                inputs: [
                    {
                        sequenceList: []
                    }
                ],
                expectedResults: {
                    total: 0,
                    terms: [],
                    readings: []
                }
            }
        ];

        for (const {inputs, expectedResults} of data) {
            for (const {sequenceList} of inputs) {
                const results = await database.findTermsBySequenceBulk(sequenceList.map((query) => ({query, dictionary: mainDictionary})));
                expect(results.length).toStrictEqual(expectedResults.total);
                for (const [term, count] of expectedResults.terms) {
                    expect(countDictionaryDatabaseEntriesWithTerm(results, term)).toStrictEqual(count);
                }
                for (const [reading, count] of expectedResults.readings) {
                    expect(countDictionaryDatabaseEntriesWithReading(results, reading)).toStrictEqual(count);
                }
            }
        }
    });
}

/**
 * @param {DictionaryDatabase} database
 * @param {import('dictionary-database').DictionarySet} titles
 */
async function testFindTermMetaBulk1(database, titles) {
    test('FindTermMetaBulk1', async () => {
        /** @type {{inputs: {termList: string[]}[], expectedResults: {total: number, modes: [key: import('dictionary-database').TermMetaType, count: number][]}}[]} */
        const data = [
            {
                inputs: [
                    {
                        termList: ['打']
                    }
                ],
                expectedResults: {
                    total: 11,
                    modes: [
                        ['freq', 11]
                    ]
                }
            },
            {
                inputs: [
                    {
                        termList: ['打つ']
                    }
                ],
                expectedResults: {
                    total: 10,
                    modes: [
                        ['freq', 10]
                    ]
                }
            },
            {
                inputs: [
                    {
                        termList: ['打ち込む']
                    }
                ],
                expectedResults: {
                    total: 12,
                    modes: [
                        ['freq', 10],
                        ['pitch', 2]
                    ]
                }
            },
            {
                inputs: [
                    {
                        termList: ['?']
                    }
                ],
                expectedResults: {
                    total: 0,
                    modes: []
                }
            }
        ];

        for (const {inputs, expectedResults} of data) {
            for (const {termList} of inputs) {
                const results = await database.findTermMetaBulk(termList, titles);
                expect(results.length).toStrictEqual(expectedResults.total);
                for (const [mode, count] of expectedResults.modes) {
                    expect(countMetasWithMode(results, mode)).toStrictEqual(count);
                }
            }
        }
    });
}

/**
 * @param {DictionaryDatabase} database
 * @param {import('dictionary-database').DictionarySet} titles
 */
async function testFindKanjiBulk1(database, titles) {
    test('FindKanjiBulk1', async () => {
        /** @type {{inputs: {kanjiList: string[]}[], expectedResults: {total: number, kanji: [key: string, count: number][]}}[]} */
        const data = [
            {
                inputs: [
                    {
                        kanjiList: ['打']
                    }
                ],
                expectedResults: {
                    total: 1,
                    kanji: [
                        ['打', 1]
                    ]
                }
            },
            {
                inputs: [
                    {
                        kanjiList: ['込']
                    }
                ],
                expectedResults: {
                    total: 1,
                    kanji: [
                        ['込', 1]
                    ]
                }
            },
            {
                inputs: [
                    {
                        kanjiList: ['?']
                    }
                ],
                expectedResults: {
                    total: 0,
                    kanji: []
                }
            }
        ];

        for (const {inputs, expectedResults} of data) {
            for (const {kanjiList} of inputs) {
                const results = await database.findKanjiBulk(kanjiList, titles);
                expect(results.length).toStrictEqual(expectedResults.total);
                for (const [kanji, count] of expectedResults.kanji) {
                    expect(countKanjiWithCharacter(results, kanji)).toStrictEqual(count);
                }
            }
        }
    });
}

/**
 * @param {DictionaryDatabase} database
 * @param {import('dictionary-database').DictionarySet} titles
 */
async function testFindKanjiMetaBulk1(database, titles) {
    test('FindKanjiMetaBulk1', async () => {
        /** @type {{inputs: {kanjiList: string[]}[], expectedResults: {total: number, modes: [key: import('dictionary-database').KanjiMetaType, count: number][]}}[]} */
        const data = [
            {
                inputs: [
                    {
                        kanjiList: ['打']
                    }
                ],
                expectedResults: {
                    total: 3,
                    modes: [
                        ['freq', 3]
                    ]
                }
            },
            {
                inputs: [
                    {
                        kanjiList: ['込']
                    }
                ],
                expectedResults: {
                    total: 3,
                    modes: [
                        ['freq', 3]
                    ]
                }
            },
            {
                inputs: [
                    {
                        kanjiList: ['?']
                    }
                ],
                expectedResults: {
                    total: 0,
                    modes: []
                }
            }
        ];

        for (const {inputs, expectedResults} of data) {
            for (const {kanjiList} of inputs) {
                const results = await database.findKanjiMetaBulk(kanjiList, titles);
                expect(results.length).toStrictEqual(expectedResults.total);
                for (const [mode, count] of expectedResults.modes) {
                    expect(countMetasWithMode(results, mode)).toStrictEqual(count);
                }
            }
        }
    });
}

/**
 * @param {DictionaryDatabase} database
 * @param {string} title
 */
async function testFindTagForTitle1(database, title) {
    test('FindTagForTitle1', async () => {
        const data = [
            {
                inputs: [
                    {
                        name: 'E1'
                    }
                ],
                expectedResults: {
                    value: {category: 'default', dictionary: title, name: 'E1', notes: 'example tag 1', order: 0, score: 0}
                }
            },
            {
                inputs: [
                    {
                        name: 'K1'
                    }
                ],
                expectedResults: {
                    value: {category: 'default', dictionary: title, name: 'K1', notes: 'example kanji tag 1', order: 0, score: 0}
                }
            },
            {
                inputs: [
                    {
                        name: 'kstat1'
                    }
                ],
                expectedResults: {
                    value: {category: 'class', dictionary: title, name: 'kstat1', notes: 'kanji stat 1', order: 0, score: 0}
                }
            },
            {
                inputs: [
                    {
                        name: 'invalid'
                    }
                ],
                expectedResults: {
                    value: null
                }
            }
        ];

        for (const {inputs, expectedResults} of data) {
            for (const {name} of inputs) {
                const result = await database.findTagForTitle(name, title);
                expect(result).toStrictEqual(expectedResults.value);
            }
        }
    });
}


/** */
describe('Database', () => {
    beforeEach(async () => {
        globalThis.indexedDB = new IDBFactory();
    });
    test('Database invalid usage', async ({expect}) => {
        // Load dictionary data
        const testDictionary = createTestDictionaryArchive('valid-dictionary1');
        const testDictionarySource = await testDictionary.generateAsync({type: 'arraybuffer'});
        /** @type {import('dictionary-data').Index} */
        const testDictionaryIndex = parseJson(await testDictionary.files['index.json'].async('string'));

        const title = testDictionaryIndex.title;
        const titles = new Map([
            [title, {priority: 0, allowSecondarySearches: false}]
        ]);

        // Setup database
        const dictionaryDatabase = new DictionaryDatabase();
        /** @type {import('dictionary-importer').ImportDetails} */
        const detaultImportDetails = {prefixWildcardsSupported: false};

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
        await expect.soft(createDictionaryImporter().importDictionary(dictionaryDatabase, testDictionarySource, detaultImportDetails)).rejects.toThrow('Database is not ready');

        await dictionaryDatabase.prepare();

        // Already prepared
        await expect.soft(dictionaryDatabase.prepare()).rejects.toThrow('Database already open');

        await createDictionaryImporter().importDictionary(dictionaryDatabase, testDictionarySource, detaultImportDetails);

        // Dictionary already imported
        await expect.soft(createDictionaryImporter().importDictionary(dictionaryDatabase, testDictionarySource, detaultImportDetails)).rejects.toThrow('Dictionary is already imported');

        await dictionaryDatabase.close();
    });
    describe('Invalid dictionaries', () => {
        const invalidDictionaries = [
            {name: 'invalid-dictionary1'},
            {name: 'invalid-dictionary2'},
            {name: 'invalid-dictionary3'},
            {name: 'invalid-dictionary4'},
            {name: 'invalid-dictionary5'},
            {name: 'invalid-dictionary6'}
        ];
        describe.each(invalidDictionaries)('Invalid dictionary: $name', ({name}) => {
            test('Has invalid data', async ({expect}) => {
                const dictionaryDatabase = new DictionaryDatabase();
                await dictionaryDatabase.prepare();

                const testDictionary = createTestDictionaryArchive(name);
                const testDictionarySource = await testDictionary.generateAsync({type: 'arraybuffer'});

                /** @type {import('dictionary-importer').ImportDetails} */
                const detaultImportDetails = {prefixWildcardsSupported: false};
                await expect.soft(createDictionaryImporter().importDictionary(dictionaryDatabase, testDictionarySource, detaultImportDetails)).rejects.toThrow('Dictionary has invalid data');
                await dictionaryDatabase.close();
            });
        });
    });
    describe('Database valid usage', () => {
        const testDataFilePath = path.join(dirname, 'data/database-test-cases.json');
        /** @type {import('test/database').DatabaseTestData} */
        const testData = parseJson(readFileSync(testDataFilePath, {encoding: 'utf8'}));
        /** @type {{clearMethod: 'purge'|'delete'|'none'}[]} */
        const cleanupTestCases = [
            {clearMethod: 'purge'},
            {clearMethod: 'delete'},
            {clearMethod: 'none'}
        ];
        describe.each(cleanupTestCases)('Testing with cleanup method $cleanupMethod', ({clearMethod}) => {
            test('Import data and test', async ({expect}) => {
                const fakeImportDate = testData.expectedSummary.importDate;

                // Load dictionary data
                const testDictionary = createTestDictionaryArchive('valid-dictionary1');
                const testDictionarySource = await testDictionary.generateAsync({type: 'arraybuffer'});
                /** @type {import('dictionary-data').Index} */
                const testDictionaryIndex = parseJson(await testDictionary.files['index.json'].async('string'));

                const title = testDictionaryIndex.title;
                const titles = new Map([
                    [title, {priority: 0, allowSecondarySearches: false}]
                ]);

                // Setup database
                const dictionaryDatabase = new DictionaryDatabase();
                await dictionaryDatabase.prepare();

                // Import data
                let progressEvent1 = false;
                const dictionaryImporter = createDictionaryImporter(() => { progressEvent1 = true; });
                const {result: importDictionaryResult, errors: importDictionaryErrors} = await dictionaryImporter.importDictionary(
                    dictionaryDatabase,
                    testDictionarySource,
                    {prefixWildcardsSupported: true}
                );
                importDictionaryResult.importDate = fakeImportDate;
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

                // Clear
                let cleared = false;
                switch (clearMethod) {
                    case 'purge':
                        await dictionaryDatabase.purge();
                        cleared = true;
                        break;
                    case 'delete':
                        {
                            let progressEvent2 = false;
                            await dictionaryDatabase.deleteDictionary(
                                title,
                                1000,
                                () => { progressEvent2 = true; }
                            );
                            expect(progressEvent2).toBe(true);
                            cleared = true;
                        }
                        break;
                }

                // Test empty
                if (cleared) {
                    const info2 = await dictionaryDatabase.getDictionaryInfo();
                    for (const item of info2) { item.importDate = fakeImportDate; }
                    expect.soft(info2).toStrictEqual([]);

                    const counts2 = await dictionaryDatabase.getDictionaryCounts([], true);
                    /** @type {import('dictionary-database').DictionaryCounts} */
                    const counts2Expected = {
                        counts: [],
                        total: {kanji: 0, kanjiMeta: 0, terms: 0, termMeta: 0, tagMeta: 0, media: 0}
                    };
                    expect.soft(counts2).toStrictEqual(counts2Expected);
                }

                await dictionaryDatabase.close();
            });
        });
    });
});
