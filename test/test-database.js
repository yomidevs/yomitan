const assert = require('assert');
const yomichanTest = require('./yomichan-test');
require('fake-indexeddb/auto');

const chrome = {
    runtime: {
        onMessage: {
            addListener: () => { /* NOP */ }
        }
    }
};

const {Database} = yomichanTest.requireScript('ext/bg/js/database.js', ['Database']);
const {dictFieldSplit, dictTagSanitize} = yomichanTest.requireScript('ext/bg/js/dictionary.js', ['dictFieldSplit', 'dictTagSanitize']);
const {stringReverse, hasOwn} = yomichanTest.requireScript('ext/mixed/js/core.js', ['stringReverse', 'hasOwn'], {chrome});

global.window = global;
global.JSZip = yomichanTest.JSZip;
global.dictFieldSplit = dictFieldSplit;
global.dictTagSanitize = dictTagSanitize;
global.stringReverse = stringReverse;
global.hasOwn = hasOwn;


function countTermsWithExpression(terms, expression) {
    return terms.reduce((i, v) => (i + (v.expression === expression ? 1 : 0)), 0);
}

function countTermsWithReading(terms, reading) {
    return terms.reduce((i, v) => (i + (v.reading === reading ? 1 : 0)), 0);
}

function countMetasWithMode(metas, mode) {
    return metas.reduce((i, v) => (i + (v.mode === mode ? 1 : 0)), 0);
}

function countKanjiWithCharacter(kanji, character) {
    return kanji.reduce((i, v) => (i + (v.character === character ? 1 : 0)), 0);
}


async function testDatabase1() {
    // Load dictionary data
    const testDictionary = yomichanTest.createTestDictionaryArchive();
    const testDictionarySource = await testDictionary.generateAsync({type: 'string'});
    const testDictionaryIndex = JSON.parse(await testDictionary.files['index.json'].async('string'));

    const title = testDictionaryIndex.title;
    const titles = [title];

    // Setup iteration data
    const iterations = [
        {
            cleanup: async () => {
                // Test purge
                await database.purge();
                await testDatabaseEmpty1(database);
            }
        },
        {
            cleanup: async () => {
                // Test deleteDictionary
                let progressEvent = false;
                await database.deleteDictionary(
                    title,
                    () => {
                        progressEvent = true;
                    },
                    {rate: 1000}
                );
                assert.ok(progressEvent);

                await testDatabaseEmpty1(database);
            }
        },
        {
            cleanup: async () => {}
        }
    ];

    // Setup database
    const database = new Database();
    await database.prepare();

    for (const {cleanup} of iterations) {
        const expectedSummary = {
            title,
            revision: 'test',
            sequenced: true,
            version: 3,
            prefixWildcardsSupported: true
        };

        // Import data
        let progressEvent = false;
        const {result, errors} = await database.importDictionary(
            testDictionarySource,
            () => {
                progressEvent = true;
            },
            {prefixWildcardsSupported: true}
        );
        assert.deepStrictEqual(errors, []);
        assert.deepStrictEqual(result, expectedSummary);
        assert.ok(progressEvent);

        // Get info summary
        const info = await database.getDictionaryInfo();
        assert.deepStrictEqual(info, [expectedSummary]);

        // Get counts
        const counts = await database.getDictionaryCounts(
            info.map((v) => v.title),
            true
        );
        assert.deepStrictEqual(counts, {
            counts: [{kanji: 2, kanjiMeta: 2, terms: 32, termMeta: 3, tagMeta: 12}],
            total: {kanji: 2, kanjiMeta: 2, terms: 32, termMeta: 3, tagMeta: 12}
        });

        // Test find* functions
        await testFindTermsBulkTest1(database, titles);
        await testTindTermsExactBulk1(database, titles);
        await testFindTermsBySequenceBulk1(database, title);
        await testFindTermMetaBulk1(database, titles);
        await testFindKanjiBulk1(database, titles);
        await testFindKanjiMetaBulk1(database, titles);
        await testFindTagForTitle1(database, title);

        // Cleanup
        await cleanup();
    }

    await database.close();
}

async function testDatabaseEmpty1(database) {
    const info = await database.getDictionaryInfo();
    assert.deepStrictEqual(info, []);

    const counts = await database.getDictionaryCounts([], true);
    assert.deepStrictEqual(counts, {
        counts: [],
        total: {kanji: 0, kanjiMeta: 0, terms: 0, termMeta: 0, tagMeta: 0}
    });
}

async function testFindTermsBulkTest1(database, titles) {
    const data = [
        {
            inputs: [
                {
                    wildcard: null,
                    termList: ['打', '打つ', '打ち込む']
                },
                {
                    wildcard: null,
                    termList: ['だ', 'ダース', 'うつ', 'ぶつ', 'うちこむ', 'ぶちこむ']
                },
                {
                    wildcard: 'suffix',
                    termList: ['打']
                }
            ],
            expectedResults: {
                total: 32,
                expressions: [
                    ['打', 2],
                    ['打つ', 17],
                    ['打ち込む', 13]
                ],
                readings: [
                    ['だ', 1],
                    ['ダース', 1],
                    ['うつ', 15],
                    ['ぶつ', 2],
                    ['うちこむ', 9],
                    ['ぶちこむ', 4]
                ]
            }
        },
        {
            inputs: [
                {
                    wildcard: null,
                    termList: ['込む']
                }
            ],
            expectedResults: {
                total: 0,
                expressions: [],
                readings: []
            }
        },
        {
            inputs: [
                {
                    wildcard: 'prefix',
                    termList: ['込む']
                }
            ],
            expectedResults: {
                total: 13,
                expressions: [
                    ['打ち込む', 13]
                ],
                readings: [
                    ['うちこむ', 9],
                    ['ぶちこむ', 4]
                ]
            }
        },
        {
            inputs: [
                {
                    wildcard: null,
                    termList: []
                }
            ],
            expectedResults: {
                total: 0,
                expressions: [],
                readings: []
            }
        }
    ];

    for (const {inputs, expectedResults} of data) {
        for (const {termList, wildcard} of inputs) {
            const results = await database.findTermsBulk(termList, titles, wildcard);
            assert.strictEqual(results.length, expectedResults.total);
            for (const [expression, count] of expectedResults.expressions) {
                assert.strictEqual(countTermsWithExpression(results, expression), count);
            }
            for (const [reading, count] of expectedResults.readings) {
                assert.strictEqual(countTermsWithReading(results, reading), count);
            }
        }
    }
}

async function testTindTermsExactBulk1(database, titles) {
    const data = [
        {
            inputs: [
                {
                    termList: ['打', '打つ', '打ち込む'],
                    readingList: ['だ', 'うつ', 'うちこむ']
                }
            ],
            expectedResults: {
                total: 25,
                expressions: [
                    ['打', 1],
                    ['打つ', 15],
                    ['打ち込む', 9]
                ],
                readings: [
                    ['だ', 1],
                    ['うつ', 15],
                    ['うちこむ', 9]
                ]
            }
        },
        {
            inputs: [
                {
                    termList: ['打', '打つ', '打ち込む'],
                    readingList: ['だ?', 'うつ?', 'うちこむ?']
                }
            ],
            expectedResults: {
                total: 0,
                expressions: [],
                readings: []
            }
        },
        {
            inputs: [
                {
                    termList: ['打つ', '打つ'],
                    readingList: ['うつ', 'ぶつ']
                }
            ],
            expectedResults: {
                total: 17,
                expressions: [
                    ['打つ', 17]
                ],
                readings: [
                    ['うつ', 15],
                    ['ぶつ', 2]
                ]
            }
        },
        {
            inputs: [
                {
                    termList: ['打つ'],
                    readingList: ['うちこむ']
                }
            ],
            expectedResults: {
                total: 0,
                expressions: [],
                readings: []
            }
        },
        {
            inputs: [
                {
                    termList: [],
                    readingList: []
                }
            ],
            expectedResults: {
                total: 0,
                expressions: [],
                readings: []
            }
        }
    ];

    for (const {inputs, expectedResults} of data) {
        for (const {termList, readingList} of inputs) {
            const results = await database.findTermsExactBulk(termList, readingList, titles);
            assert.strictEqual(results.length, expectedResults.total);
            for (const [expression, count] of expectedResults.expressions) {
                assert.strictEqual(countTermsWithExpression(results, expression), count);
            }
            for (const [reading, count] of expectedResults.readings) {
                assert.strictEqual(countTermsWithReading(results, reading), count);
            }
        }
    }
}

async function testFindTermsBySequenceBulk1(database, mainDictionary) {
    const data = [
        {
            inputs: [
                {
                    sequenceList: [1, 2, 3, 4, 5, 6]
                }
            ],
            expectedResults: {
                total: 32,
                expressions: [
                    ['打', 2],
                    ['打つ', 17],
                    ['打ち込む', 13]
                ],
                readings: [
                    ['だ', 1],
                    ['ダース', 1],
                    ['うつ', 15],
                    ['ぶつ', 2],
                    ['うちこむ', 9],
                    ['ぶちこむ', 4]
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
                expressions: [
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
                expressions: [
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
                total: 15,
                expressions: [
                    ['打つ', 15]
                ],
                readings: [
                    ['うつ', 15]
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
                total: 2,
                expressions: [
                    ['打つ', 2]
                ],
                readings: [
                    ['ぶつ', 2]
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
                total: 9,
                expressions: [
                    ['打ち込む', 9]
                ],
                readings: [
                    ['うちこむ', 9]
                ]
            }
        },
        {
            inputs: [
                {
                    sequenceList: [6]
                }
            ],
            expectedResults: {
                total: 4,
                expressions: [
                    ['打ち込む', 4]
                ],
                readings: [
                    ['ぶちこむ', 4]
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
                expressions: [],
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
                expressions: [],
                readings: []
            }
        }
    ];

    for (const {inputs, expectedResults} of data) {
        for (const {sequenceList} of inputs) {
            const results = await database.findTermsBySequenceBulk(sequenceList, mainDictionary);
            assert.strictEqual(results.length, expectedResults.total);
            for (const [expression, count] of expectedResults.expressions) {
                assert.strictEqual(countTermsWithExpression(results, expression), count);
            }
            for (const [reading, count] of expectedResults.readings) {
                assert.strictEqual(countTermsWithReading(results, reading), count);
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
                total: 1,
                modes: [
                    ['freq', 1]
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
                total: 1,
                modes: [
                    ['freq', 1]
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
                total: 1,
                modes: [
                    ['freq', 1]
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
                total: 1,
                modes: [
                    ['freq', 1]
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
                modes: [
                    ['freq', 1]
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
                    name: 'tag1'
                }
            ],
            expectedResults: {
                value: {category: 'category1', dictionary: title, name: 'tag1', notes: 'tag1 notes', order: 0, score: 0}
            }
        },
        {
            inputs: [
                {
                    name: 'ktag1'
                }
            ],
            expectedResults: {
                value: {category: 'kcategory1', dictionary: title, name: 'ktag1', notes: 'ktag1 notes', order: 0, score: 0}
            }
        },
        {
            inputs: [
                {
                    name: 'kstat1'
                }
            ],
            expectedResults: {
                value: {category: 'kcategory3', dictionary: title, name: 'kstat1', notes: 'kstat1 notes', order: 0, score: 0}
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
            assert.deepStrictEqual(result, expectedResults.value);
        }
    }
}


async function main() {
    await testDatabase1();
}


if (require.main === module) { main(); }
