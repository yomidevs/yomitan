/*
 * Copyright (C) 2020  Yomichan Authors
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

const fs = require('fs');
const url = require('url');
const path = require('path');
const assert = require('assert');
const yomichanTest = require('./yomichan-test');
const {VM} = require('./yomichan-vm');
require('fake-indexeddb/auto');

const chrome = {
    runtime: {
        onMessage: {
            addListener() { /* NOP */ },
            removeListener() { /* NOP */ }
        },
        getURL(path2) {
            return url.pathToFileURL(path.join(__dirname, '..', 'ext', path2.replace(/^\//, '')));
        },
        sendMessage() {
            // NOP
        }
    }
};

class XMLHttpRequest {
    constructor() {
        this._eventCallbacks = new Map();
        this._url = '';
        this._responseText = null;
    }

    overrideMimeType() {
        // NOP
    }

    addEventListener(eventName, callback) {
        let callbacks = this._eventCallbacks.get(eventName);
        if (typeof callbacks === 'undefined') {
            callbacks = [];
            this._eventCallbacks.set(eventName, callbacks);
        }
        callbacks.push(callback);
    }

    open(action, url2) {
        this._url = url2;
    }

    send() {
        const filePath = url.fileURLToPath(this._url);
        Promise.resolve()
            .then(() => {
                let source;
                try {
                    source = fs.readFileSync(filePath, {encoding: 'utf8'});
                } catch (e) {
                    this._trigger('error');
                    return;
                }
                this._responseText = source;
                this._trigger('load');
            });
    }

    get responseText() {
        return this._responseText;
    }

    _trigger(eventName, ...args) {
        const callbacks = this._eventCallbacks.get(eventName);
        if (typeof callbacks === 'undefined') { return; }

        for (let i = 0, ii = callbacks.length; i < ii; ++i) {
            callbacks[i](...args);
        }
    }
}

class Image {
    constructor() {
        this._src = '';
        this._loadCallbacks = [];
    }

    get src() {
        return this._src;
    }

    set src(value) {
        this._src = value;
        this._delayTriggerLoad();
    }

    get naturalWidth() {
        return 100;
    }

    get naturalHeight() {
        return 100;
    }

    addEventListener(eventName, callback) {
        if (eventName === 'load') {
            this._loadCallbacks.push(callback);
        }
    }

    removeEventListener(eventName, callback) {
        if (eventName === 'load') {
            const index = this._loadCallbacks.indexOf(callback);
            if (index >= 0) {
                this._loadCallbacks.splice(index, 1);
            }
        }
    }

    async _delayTriggerLoad() {
        await Promise.resolve();
        for (const callback of this._loadCallbacks) {
            callback();
        }
    }
}


const vm = new VM({
    chrome,
    Image,
    XMLHttpRequest,
    indexedDB: global.indexedDB,
    IDBKeyRange: global.IDBKeyRange,
    JSZip: yomichanTest.JSZip,
    addEventListener() {
        // NOP
    }
});
vm.context.window = vm.context;

vm.execute([
    'bg/js/json-schema.js',
    'bg/js/dictionary.js',
    'mixed/js/core.js',
    'bg/js/media-utility.js',
    'bg/js/request.js',
    'bg/js/dictionary-importer.js',
    'bg/js/database.js'
]);
const DictionaryImporter = vm.get('DictionaryImporter');
const Database = vm.get('Database');


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


function clearDatabase(timeout) {
    return new Promise((resolve, reject) => {
        let timer = setTimeout(() => {
            timer = null;
            reject(new Error(`clearDatabase failed to resolve after ${timeout}ms`));
        }, timeout);

        (async () => {
            const indexedDB = global.indexedDB;
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
    const testDictionary = yomichanTest.createTestDictionaryArchive('valid-dictionary1');
    const testDictionarySource = await testDictionary.generateAsync({type: 'string'});
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
                    {rate: 1000},
                    () => {
                        progressEvent = true;
                    }
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
    const dictionaryImporter = new DictionaryImporter();
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
        const {result, errors} = await dictionaryImporter.import(
            database,
            testDictionarySource,
            {prefixWildcardsSupported: true},
            () => {
                progressEvent = true;
            }
        );
        vm.assert.deepStrictEqual(errors, []);
        vm.assert.deepStrictEqual(result, expectedSummary);
        assert.ok(progressEvent);

        // Get info summary
        const info = await database.getDictionaryInfo();
        vm.assert.deepStrictEqual(info, [expectedSummary]);

        // Get counts
        const counts = await database.getDictionaryCounts(
            info.map((v) => v.title),
            true
        );
        vm.assert.deepStrictEqual(counts, {
            counts: [{kanji: 2, kanjiMeta: 2, terms: 33, termMeta: 12, tagMeta: 14}],
            total: {kanji: 2, kanjiMeta: 2, terms: 33, termMeta: 12, tagMeta: 14}
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
    vm.assert.deepStrictEqual(info, []);

    const counts = await database.getDictionaryCounts([], true);
    vm.assert.deepStrictEqual(counts, {
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
                total: 3,
                modes: [
                    ['freq', 3]
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
                total: 3,
                modes: [
                    ['freq', 3]
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
                total: 5,
                modes: [
                    ['freq', 3],
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
            vm.assert.deepStrictEqual(result, expectedResults.value);
        }
    }
}


async function testDatabase2() {
    // Load dictionary data
    const testDictionary = yomichanTest.createTestDictionaryArchive('valid-dictionary1');
    const testDictionarySource = await testDictionary.generateAsync({type: 'string'});
    const testDictionaryIndex = JSON.parse(await testDictionary.files['index.json'].async('string'));

    const title = testDictionaryIndex.title;
    const titles = new Map([
        [title, {priority: 0, allowSecondarySearches: false}]
    ]);

    // Setup database
    const dictionaryImporter = new DictionaryImporter();
    const database = new Database();

    // Error: not prepared
    await assert.rejects(async () => await database.purge());
    await assert.rejects(async () => await database.deleteDictionary(title, {}, () => {}));
    await assert.rejects(async () => await database.findTermsBulk(['?'], titles, null));
    await assert.rejects(async () => await database.findTermsExactBulk(['?'], ['?'], titles));
    await assert.rejects(async () => await database.findTermsBySequenceBulk([1], title));
    await assert.rejects(async () => await database.findTermMetaBulk(['?'], titles));
    await assert.rejects(async () => await database.findTermMetaBulk(['?'], titles));
    await assert.rejects(async () => await database.findKanjiBulk(['?'], titles));
    await assert.rejects(async () => await database.findKanjiMetaBulk(['?'], titles));
    await assert.rejects(async () => await database.findTagForTitle('tag', title));
    await assert.rejects(async () => await database.getDictionaryInfo());
    await assert.rejects(async () => await database.getDictionaryCounts(titles, true));
    await assert.rejects(async () => await dictionaryImporter.import(database, testDictionarySource, {}, () => {}));

    await database.prepare();

    // Error: already prepared
    await assert.rejects(async () => await database.prepare());

    await dictionaryImporter.import(database, testDictionarySource, {}, () => {});

    // Error: dictionary already imported
    await assert.rejects(async () => await dictionaryImporter.import(database, testDictionarySource, {}, () => {}));

    await database.close();
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
    const dictionaryImporter = new DictionaryImporter();
    const database = new Database();
    await database.prepare();

    for (const invalidDictionary of invalidDictionaries) {
        const testDictionary = yomichanTest.createTestDictionaryArchive(invalidDictionary);
        const testDictionarySource = await testDictionary.generateAsync({type: 'string'});

        let error = null;
        try {
            await dictionaryImporter.import(database, testDictionarySource, {}, () => {});
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

    await database.close();
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


if (require.main === module) { main(); }
