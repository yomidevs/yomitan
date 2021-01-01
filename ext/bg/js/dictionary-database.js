/*
 * Copyright (C) 2016-2021  Yomichan Authors
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

/* global
 * Database
 */

class DictionaryDatabase {
    constructor() {
        this._db = new Database();
        this._dbName = 'dict';
        this._schemas = new Map();
    }

    // Public

    async prepare() {
        await this._db.open(
            this._dbName,
            60,
            [
                {
                    version: 20,
                    stores: {
                        terms: {
                            primaryKey: {keyPath: 'id', autoIncrement: true},
                            indices: ['dictionary', 'expression', 'reading']
                        },
                        kanji: {
                            primaryKey: {autoIncrement: true},
                            indices: ['dictionary', 'character']
                        },
                        tagMeta: {
                            primaryKey: {autoIncrement: true},
                            indices: ['dictionary']
                        },
                        dictionaries: {
                            primaryKey: {autoIncrement: true},
                            indices: ['title', 'version']
                        }
                    }
                },
                {
                    version: 30,
                    stores: {
                        termMeta: {
                            primaryKey: {autoIncrement: true},
                            indices: ['dictionary', 'expression']
                        },
                        kanjiMeta: {
                            primaryKey: {autoIncrement: true},
                            indices: ['dictionary', 'character']
                        },
                        tagMeta: {
                            primaryKey: {autoIncrement: true},
                            indices: ['dictionary', 'name']
                        }
                    }
                },
                {
                    version: 40,
                    stores: {
                        terms: {
                            primaryKey: {keyPath: 'id', autoIncrement: true},
                            indices: ['dictionary', 'expression', 'reading', 'sequence']
                        }
                    }
                },
                {
                    version: 50,
                    stores: {
                        terms: {
                            primaryKey: {keyPath: 'id', autoIncrement: true},
                            indices: ['dictionary', 'expression', 'reading', 'sequence', 'expressionReverse', 'readingReverse']
                        }
                    }
                },
                {
                    version: 60,
                    stores: {
                        media: {
                            primaryKey: {keyPath: 'id', autoIncrement: true},
                            indices: ['dictionary', 'path']
                        }
                    }
                }
            ]
        );
    }

    async close() {
        this._db.close();
    }

    isPrepared() {
        return this._db.isOpen();
    }

    async purge() {
        if (this._db.isOpening()) {
            throw new Error('Cannot purge database while opening');
        }
        if (this._db.isOpen()) {
            this._db.close();
        }
        let result = false;
        try {
            await Database.deleteDatabase(this._dbName);
            result = true;
        } catch (e) {
            yomichan.logError(e);
        }
        await this.prepare();
        return result;
    }

    async deleteDictionary(dictionaryName, progressSettings, onProgress) {
        const targets = [
            ['dictionaries', 'title'],
            ['kanji', 'dictionary'],
            ['kanjiMeta', 'dictionary'],
            ['terms', 'dictionary'],
            ['termMeta', 'dictionary'],
            ['tagMeta', 'dictionary'],
            ['media', 'dictionary']
        ];

        const {rate} = progressSettings;
        const progressData = {
            count: 0,
            processed: 0,
            storeCount: targets.length,
            storesProcesed: 0
        };

        const filterKeys = (keys) => {
            ++progressData.storesProcesed;
            progressData.count += keys.length;
            onProgress(progressData);
            return keys;
        };
        const onProgress2 = () => {
            const processed = progressData.processed + 1;
            progressData.processed = processed;
            if ((processed % rate) === 0 || processed === progressData.count) {
                onProgress(progressData);
            }
        };

        const promises = [];
        for (const [objectStoreName, indexName] of targets) {
            const query = IDBKeyRange.only(dictionaryName);
            const promise = this._db.bulkDelete(objectStoreName, indexName, query, filterKeys, onProgress2);
            promises.push(promise);
        }
        await Promise.all(promises);
    }

    findTermsBulk(termList, dictionaries, wildcard) {
        return new Promise((resolve, reject) => {
            const results = [];
            const count = termList.length;
            if (count === 0) {
                resolve(results);
                return;
            }

            const visited = new Set();
            const useWildcard = !!wildcard;
            const prefixWildcard = wildcard === 'prefix';

            const transaction = this._db.transaction(['terms'], 'readonly');
            const terms = transaction.objectStore('terms');
            const index1 = terms.index(prefixWildcard ? 'expressionReverse' : 'expression');
            const index2 = terms.index(prefixWildcard ? 'readingReverse' : 'reading');

            const count2 = count * 2;
            let completeCount = 0;
            for (let i = 0; i < count; ++i) {
                const inputIndex = i;
                const term = prefixWildcard ? stringReverse(termList[i]) : termList[i];
                const query = useWildcard ? IDBKeyRange.bound(term, `${term}\uffff`, false, false) : IDBKeyRange.only(term);

                const onGetAll = (rows) => {
                    for (const row of rows) {
                        if (dictionaries.has(row.dictionary) && !visited.has(row.id)) {
                            visited.add(row.id);
                            results.push(this._createTerm(row, inputIndex));
                        }
                    }
                    if (++completeCount >= count2) {
                        resolve(results);
                    }
                };

                this._db.getAll(index1, query, onGetAll, reject);
                this._db.getAll(index2, query, onGetAll, reject);
            }
        });
    }

    findTermsExactBulk(termList, readingList, dictionaries) {
        return new Promise((resolve, reject) => {
            const results = [];
            const count = termList.length;
            if (count === 0) {
                resolve(results);
                return;
            }

            const transaction = this._db.transaction(['terms'], 'readonly');
            const terms = transaction.objectStore('terms');
            const index = terms.index('expression');

            let completeCount = 0;
            for (let i = 0; i < count; ++i) {
                const inputIndex = i;
                const reading = readingList[i];
                const query = IDBKeyRange.only(termList[i]);

                const onGetAll = (rows) => {
                    for (const row of rows) {
                        if (row.reading === reading && dictionaries.has(row.dictionary)) {
                            results.push(this._createTerm(row, inputIndex));
                        }
                    }
                    if (++completeCount >= count) {
                        resolve(results);
                    }
                };

                this._db.getAll(index, query, onGetAll, reject);
            }
        });
    }

    findTermsBySequenceBulk(sequenceList, mainDictionary) {
        return new Promise((resolve, reject) => {
            const results = [];
            const count = sequenceList.length;
            if (count === 0) {
                resolve(results);
                return;
            }

            const transaction = this._db.transaction(['terms'], 'readonly');
            const terms = transaction.objectStore('terms');
            const index = terms.index('sequence');

            let completeCount = 0;
            for (let i = 0; i < count; ++i) {
                const inputIndex = i;
                const query = IDBKeyRange.only(sequenceList[i]);

                const onGetAll = (rows) => {
                    for (const row of rows) {
                        if (row.dictionary === mainDictionary) {
                            results.push(this._createTerm(row, inputIndex));
                        }
                    }
                    if (++completeCount >= count) {
                        resolve(results);
                    }
                };

                this._db.getAll(index, query, onGetAll, reject);
            }
        });
    }

    findTermMetaBulk(termList, dictionaries) {
        return this._findGenericBulk('termMeta', 'expression', termList, dictionaries, this._createTermMeta.bind(this));
    }

    findKanjiBulk(kanjiList, dictionaries) {
        return this._findGenericBulk('kanji', 'character', kanjiList, dictionaries, this._createKanji.bind(this));
    }

    findKanjiMetaBulk(kanjiList, dictionaries) {
        return this._findGenericBulk('kanjiMeta', 'character', kanjiList, dictionaries, this._createKanjiMeta.bind(this));
    }

    findTagForTitle(name, title) {
        const query = IDBKeyRange.only(name);
        return this._db.find('tagMeta', 'name', query, (row) => (row.dictionary === title), null);
    }

    getMedia(targets) {
        return new Promise((resolve, reject) => {
            const count = targets.length;
            const results = new Array(count).fill(null);
            if (count === 0) {
                resolve(results);
                return;
            }

            let completeCount = 0;
            const transaction = this._db.transaction(['media'], 'readonly');
            const objectStore = transaction.objectStore('media');
            const index = objectStore.index('path');

            for (let i = 0; i < count; ++i) {
                const inputIndex = i;
                const {path, dictionaryName} = targets[i];
                const query = IDBKeyRange.only(path);

                const onGetAll = (rows) => {
                    for (const row of rows) {
                        if (row.dictionary !== dictionaryName) { continue; }
                        results[inputIndex] = this._createMedia(row, inputIndex);
                    }
                    if (++completeCount >= count) {
                        resolve(results);
                    }
                };

                this._db.getAll(index, query, onGetAll, reject);
            }
        });
    }

    getDictionaryInfo() {
        return new Promise((resolve, reject) => {
            const transaction = this._db.transaction(['dictionaries'], 'readonly');
            const objectStore = transaction.objectStore('dictionaries');
            this._db.getAll(objectStore, null, resolve, reject);
        });
    }

    getDictionaryCounts(dictionaryNames, getTotal) {
        return new Promise((resolve, reject) => {
            const targets = [
                ['kanji', 'dictionary'],
                ['kanjiMeta', 'dictionary'],
                ['terms', 'dictionary'],
                ['termMeta', 'dictionary'],
                ['tagMeta', 'dictionary'],
                ['media', 'dictionary']
            ];
            const objectStoreNames = targets.map(([objectStoreName]) => objectStoreName);
            const transaction = this._db.transaction(objectStoreNames, 'readonly');
            const databaseTargets = targets.map(([objectStoreName, indexName]) => {
                const objectStore = transaction.objectStore(objectStoreName);
                const index = objectStore.index(indexName);
                return {objectStore, index};
            });

            const countTargets = [];
            if (getTotal) {
                for (const {objectStore} of databaseTargets) {
                    countTargets.push([objectStore, null]);
                }
            }
            for (const dictionaryName of dictionaryNames) {
                const query = IDBKeyRange.only(dictionaryName);
                for (const {index} of databaseTargets) {
                    countTargets.push([index, query]);
                }
            }

            const onCountComplete = (results) => {
                const resultCount = results.length;
                const targetCount = targets.length;
                const counts = [];
                for (let i = 0; i < resultCount; i += targetCount) {
                    const countGroup = {};
                    for (let j = 0; j < targetCount; ++j) {
                        countGroup[targets[j][0]] = results[i + j];
                    }
                    counts.push(countGroup);
                }
                const total = getTotal ? counts.shift() : null;
                resolve({total, counts});
            };

            this._db.bulkCount(countTargets, onCountComplete, reject);
        });
    }

    async dictionaryExists(title) {
        const query = IDBKeyRange.only(title);
        const result = await this._db.find('dictionaries', 'title', query);
        return typeof result !== 'undefined';
    }

    bulkAdd(objectStoreName, items, start, count) {
        return this._db.bulkAdd(objectStoreName, items, start, count);
    }

    // Private

    async _findGenericBulk(objectStoreName, indexName, indexValueList, dictionaries, createResult) {
        return new Promise((resolve, reject) => {
            const results = [];
            const count = indexValueList.length;
            if (count === 0) {
                resolve(results);
                return;
            }

            const transaction = this._db.transaction([objectStoreName], 'readonly');
            const terms = transaction.objectStore(objectStoreName);
            const index = terms.index(indexName);

            let completeCount = 0;
            for (let i = 0; i < count; ++i) {
                const inputIndex = i;
                const query = IDBKeyRange.only(indexValueList[i]);

                const onGetAll = (rows) => {
                    for (const row of rows) {
                        if (dictionaries.has(row.dictionary)) {
                            results.push(createResult(row, inputIndex));
                        }
                    }
                    if (++completeCount >= count) {
                        resolve(results);
                    }
                };

                this._db.getAll(index, query, onGetAll, reject);
            }
        });
    }

    _createTerm(row, index) {
        return {
            index,
            expression: row.expression,
            reading: row.reading,
            definitionTags: this._splitField(row.definitionTags || row.tags || ''),
            termTags: this._splitField(row.termTags || ''),
            rules: this._splitField(row.rules),
            glossary: row.glossary,
            score: row.score,
            dictionary: row.dictionary,
            id: row.id,
            sequence: typeof row.sequence === 'undefined' ? -1 : row.sequence
        };
    }

    _createKanji(row, index) {
        return {
            index,
            character: row.character,
            onyomi: this._splitField(row.onyomi),
            kunyomi: this._splitField(row.kunyomi),
            tags: this._splitField(row.tags),
            glossary: row.meanings,
            stats: row.stats,
            dictionary: row.dictionary
        };
    }

    _createTermMeta({expression, mode, data, dictionary}, index) {
        return {expression, mode, data, dictionary, index};
    }

    _createKanjiMeta({character, mode, data, dictionary}, index) {
        return {character, mode, data, dictionary, index};
    }

    _createMedia(row, index) {
        return Object.assign({}, row, {index});
    }

    _splitField(field) {
        return field.length === 0 ? [] : field.split(' ');
    }
}
