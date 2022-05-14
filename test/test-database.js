/*
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

const path = require('path');
const assert = require('assert');
const {createDictionaryArchive, testMain} = require('../dev/util');
const {DatabaseVM, DatabaseVMDictionaryImporterMediaLoader} = require('../dev/database-vm');


const vm = new DatabaseVM();
vm.execute([
    'js/core.js',
    'js/general/cache-map.js',
    'js/data/json-schema.js',
    'js/media/media-util.js',
    'js/language/dictionary-importer.js',
    'js/data/database.js',
    'js/language/dictionary-database.js'
]);
const DictionaryImporter = vm.get('DictionaryImporter');
const DictionaryDatabase = vm.get('DictionaryDatabase');


function createTestDictionaryArchive(dictionary, dictionaryName) {
    const dictionaryDirectory = path.join(__dirname, 'data', 'dictionaries', dictionary);
    return createDictionaryArchive(dictionaryDirectory, dictionaryName);
}


function createDictionaryImporter(onProgress) {
    const dictionaryImporterMediaLoader = new DatabaseVMDictionaryImporterMediaLoader();
    return new DictionaryImporter(dictionaryImporterMediaLoader, (...args) => {
        const {stepIndex, stepCount, index, count} = args[0];
        assert.ok(stepIndex < stepCount);
        assert.ok(index <= count);
        if (typeof onProgress === 'function') {
            onProgress(...args);
        }
    });
}


function countDictionaryDatabaseEntriesWithTerm(dictionaryDatabaseEntries, term) {
    return dictionaryDatabaseEntries.reduce((i, v) => (i + (v.term === term ? 1 : 0)), 0);
}

function countDictionaryDatabaseEntriesWithReading(dictionaryDatabaseEntries, reading) {
    return dictionaryDatabaseEntries.reduce((i, v) => (i + (v.reading === reading ? 1 : 0)), 0);
}

function countMetasWithMode(metas, mode) {
    return metas.reduce((i, v) => (i + (v.mode === mode ? 1 : 0)), 0);
}

function countKanjiWithCharacter(kanji, character) {
    return kanji.reduce((i, v) => (i + (v.character === character ? 1 : 0)), 0);
}


function clearDatabase(timeout) {
    return new Promise((resolve, reject) => {
        let timer = setTimeout(() => {
            timer = null;
            reject(new Error(`clearDatabase failed to resolve after ${timeout}ms`));
        }, timeout);

        (async () => {
            const indexedDB = vm.indexedDB;
            for (const {name} of await indexedDB.databases()) {
                await new Promise((resolve2, reject2) => {
                    const request = indexedDB.deleteDatabase(name);
                    request.onerror = (e) => reject2(e);
                    request.onsuccess = () => resolve2();
                });
            }
            if (timer !== null) {
                clearTimeout(timer);
            }
            resolve();
        })();
    });
}


async function testDatabase1() {
    // Load dictionary data
    const testDictionary = createTestDictionaryArchive('valid-dictionary1');
    const testDictionarySource = await testDictionary.generateAsync({type: 'arraybuffer'});
    const testDictionaryIndex = JSON.parse(await testDictionary.files['index.json'].async('string'));

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
                assert.ok(progressEvent);

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
                media: {total: 4},
                tagMeta: {total: 15},
                termMeta: {total: 38, freq: 31, pitch: 7},
                terms: {total: 21}
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
        vm.assert.deepStrictEqual(errors, []);
        vm.assert.deepStrictEqual(result, expectedSummary);
        assert.ok(progressEvent);

        // Get info summary
        const info = await dictionaryDatabase.getDictionaryInfo();
        vm.assert.deepStrictEqual(info, [expectedSummary]);

        // Get counts
        const counts = await dictionaryDatabase.getDictionaryCounts(
            info.map((v) => v.title),
            true
        );
        vm.assert.deepStrictEqual(counts, {
            counts: [{kanji: 2, kanjiMeta: 6, terms: 21, termMeta: 38, tagMeta: 15, media: 4}],
            total: {kanji: 2, kanjiMeta: 6, terms: 21, termMeta: 38, tagMeta: 15, media: 4}
        });

        // Test find* functions
        await testFindTermsBulkTest1(dictionaryDatabase, titles);
        await testTindTermsExactBulk1(dictionaryDatabase, titles);
        await testFindTermsBySequenceBulk1(dictionaryDatabase, title);
        await testFindTermMetaBulk1(dictionaryDatabase, titles);
        await testFindKanjiBulk1(dictionaryDatabase, titles);
        await testFindKanjiMetaBulk1(dictionaryDatabase, titles);
        await testFindTagForTitle1(dictionaryDatabase, title);

        // Cleanup
        await cleanup();
    }

    await dictionaryDatabase.close();
}

async function testDatabaseEmpty1(database) {
    const info = await database.getDictionaryInfo();
    vm.assert.deepStrictEqual(info, []);

    const counts = await database.getDictionaryCounts([], true);
    vm.assert.deepStrictEqual(counts, {
        counts: [],
        total: {kanji: 0, kanjiMeta: 0, terms: 0, termMeta: 0, tagMeta: 0, media: 0}
    });
}

async function testFindTermsBulkTest1(database, titles) {
    const data = [
        {
            inputs: [
                {
                    matchType: null,
                    termList: ['打', '打つ', '打ち込む']
                },
                {
                    matchType: null,
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
                    matchType: null,
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
                    matchType: null,
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
            assert.strictEqual(results.length, expectedResults.total);
            for (const [term, count] of expectedResults.terms) {
                assert.strictEqual(countDictionaryDatabaseEntriesWithTerm(results, term), count);
            }
            for (const [reading, count] of expectedResults.readings) {
                assert.strictEqual(countDictionaryDatabaseEntriesWithReading(results, reading), count);
            }
        }
    }
}

async function testTindTermsExactBulk1(database, titles) {
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
            assert.strictEqual(results.length, expectedResults.total);
            for (const [term, count] of expectedResults.terms) {
                assert.strictEqual(countDictionaryDatabaseEntriesWithTerm(results, term), count);
            }
            for (const [reading, count] of expectedResults.readings) {
                assert.strictEqual(countDictionaryDatabaseEntriesWithReading(results, reading), count);
            }
        }
    }
}

async function testFindTermsBySequenceBulk1(database, mainDictionary) {
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
            assert.strictEqual(results.length, expectedResults.total);
            for (const [term, count] of expectedResults.terms) {
                assert.strictEqual(countDictionaryDatabaseEntriesWithTerm(results, term), count);
            }
            for (const [reading, count] of expectedResults.readings) {
                assert.strictEqual(countDictionaryDatabaseEntriesWithReading(results, reading), count);
            }
        }
    }
}

async function testFindTermMetaBulk1(database, titles) {
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
            assert.strictEqual(results.length, expectedResults.total);
            for (const [mode, count] of expectedResults.modes) {
                assert.strictEqual(countMetasWithMode(results, mode), count);
            }
        }
    }
}

async function testFindKanjiBulk1(database, titles) {
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
            assert.strictEqual(results.length, expectedResults.total);
            for (const [kanji, count] of expectedResults.kanji) {
                assert.strictEqual(countKanjiWithCharacter(results, kanji), count);
            }
        }
    }
}

async function testFindKanjiMetaBulk1(database, titles) {
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
            assert.strictEqual(results.length, expectedResults.total);
            for (const [mode, count] of expectedResults.modes) {
                assert.strictEqual(countMetasWithMode(results, mode), count);
            }
        }
    }
}

async function testFindTagForTitle1(database, title) {
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
            vm.assert.deepStrictEqual(result, expectedResults.value);
        }
    }
}


async function testDatabase2() {
    // Load dictionary data
    const testDictionary = createTestDictionaryArchive('valid-dictionary1');
    const testDictionarySource = await testDictionary.generateAsync({type: 'arraybuffer'});
    const testDictionaryIndex = JSON.parse(await testDictionary.files['index.json'].async('string'));

    const title = testDictionaryIndex.title;
    const titles = new Map([
        [title, {priority: 0, allowSecondarySearches: false}]
    ]);

    // Setup database
    const dictionaryDatabase = new DictionaryDatabase();

    // Error: not prepared
    await assert.rejects(async () => await dictionaryDatabase.deleteDictionary(title, 1000));
    await assert.rejects(async () => await dictionaryDatabase.findTermsBulk(['?'], titles, null));
    await assert.rejects(async () => await dictionaryDatabase.findTermsExactBulk([{term: '?', reading: '?'}], titles));
    await assert.rejects(async () => await dictionaryDatabase.findTermsBySequenceBulk([{query: 1, dictionary: title}]));
    await assert.rejects(async () => await dictionaryDatabase.findTermMetaBulk(['?'], titles));
    await assert.rejects(async () => await dictionaryDatabase.findTermMetaBulk(['?'], titles));
    await assert.rejects(async () => await dictionaryDatabase.findKanjiBulk(['?'], titles));
    await assert.rejects(async () => await dictionaryDatabase.findKanjiMetaBulk(['?'], titles));
    await assert.rejects(async () => await dictionaryDatabase.findTagForTitle('tag', title));
    await assert.rejects(async () => await dictionaryDatabase.getDictionaryInfo());
    await assert.rejects(async () => await dictionaryDatabase.getDictionaryCounts(titles, true));
    await assert.rejects(async () => await createDictionaryImporter().importDictionary(dictionaryDatabase, testDictionarySource, {}));

    await dictionaryDatabase.prepare();

    // Error: already prepared
    await assert.rejects(async () => await dictionaryDatabase.prepare());

    await createDictionaryImporter().importDictionary(dictionaryDatabase, testDictionarySource, {});

    // Error: dictionary already imported
    await assert.rejects(async () => await createDictionaryImporter().importDictionary(dictionaryDatabase, testDictionarySource, {}));

    await dictionaryDatabase.close();
}


async function testDatabase3() {
    const invalidDictionaries = [
        'invalid-dictionary1',
        'invalid-dictionary2',
        'invalid-dictionary3',
        'invalid-dictionary4',
        'invalid-dictionary5',
        'invalid-dictionary6'
    ];

    // Setup database
    const dictionaryDatabase = new DictionaryDatabase();
    await dictionaryDatabase.prepare();

    for (const invalidDictionary of invalidDictionaries) {
        const testDictionary = createTestDictionaryArchive(invalidDictionary);
        const testDictionarySource = await testDictionary.generateAsync({type: 'arraybuffer'});

        let error = null;
        try {
            await createDictionaryImporter().importDictionary(dictionaryDatabase, testDictionarySource, {});
        } catch (e) {
            error = e;
        }

        if (error === null) {
            assert.ok(false, `Expected an error while importing ${invalidDictionary}`);
        } else {
            const prefix = 'Dictionary has invalid data';
            const message = error.message;
            assert.ok(typeof message, 'string');
            assert.ok(message.startsWith(prefix), `Expected error message to start with '${prefix}': ${message}`);
        }
    }

    await dictionaryDatabase.close();
}


async function main() {
    const clearTimeout = 5000;
    try {
        await testDatabase1();
        await clearDatabase(clearTimeout);

        await testDatabase2();
        await clearDatabase(clearTimeout);

        await testDatabase3();
        await clearDatabase(clearTimeout);
    } catch (e) {
        console.log(e);
        process.exit(-1);
        throw e;
    }
}


if (require.main === module) { testMain(main); }
