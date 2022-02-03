/*
 * Copyright (C) 2016-2022  Yomichan Authors
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
        this._createOnlyQuery1 = (item) => IDBKeyRange.only(item);
        this._createOnlyQuery2 = (item) => IDBKeyRange.only(item.query);
        this._createOnlyQuery3 = (item) => IDBKeyRange.only(item.term);
        this._createOnlyQuery4 = (item) => IDBKeyRange.only(item.path);
        this._createBoundQuery1 = (item) => IDBKeyRange.bound(item, `${item}\uffff`, false, false);
        this._createBoundQuery2 = (item) => { item = stringReverse(item); return IDBKeyRange.bound(item, `${item}\uffff`, false, false); };
        this._createTermBind1 = this._createTerm.bind(this, 'term', 'exact');
        this._createTermBind2 = this._createTerm.bind(this, 'sequence', 'exact');
        this._createTermMetaBind = this._createTermMeta.bind(this);
        this._createKanjiBind = this._createKanji.bind(this);
        this._createKanjiMetaBind = this._createKanjiMeta.bind(this);
        this._createMediaBind = this._createMedia.bind(this);
    }

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
            log.error(e);
        }
        await this.prepare();
        return result;
    }

    async deleteDictionary(dictionaryName, progressRate, onProgress) {
        if (typeof progressRate !== 'number') {
            progressRate = 1;
        }
        if (typeof onProgress !== 'function') {
            onProgress = () => {};
        }

        const targetGroups = [
            [
                ['kanji', 'dictionary'],
                ['kanjiMeta', 'dictionary'],
                ['terms', 'dictionary'],
                ['termMeta', 'dictionary'],
                ['tagMeta', 'dictionary'],
                ['media', 'dictionary']
            ],
            [
                ['dictionaries', 'title']
            ]
        ];

        let storeCount = 0;
        for (const targets of targetGroups) {
            storeCount += targets.length;
        }

        const progressData = {
            count: 0,
            processed: 0,
            storeCount,
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
            if ((processed % progressRate) === 0 || processed === progressData.count) {
                onProgress(progressData);
            }
        };

        for (const targets of targetGroups) {
            const promises = [];
            for (const [objectStoreName, indexName] of targets) {
                const query = IDBKeyRange.only(dictionaryName);
                const promise = this._db.bulkDelete(objectStoreName, indexName, query, filterKeys, onProgress2);
                promises.push(promise);
            }
            await Promise.all(promises);
        }
    }

    findTermsBulk(termList, dictionaries, matchType) {
        const visited = new Set();
        const predicate = (row) => {
            if (!dictionaries.has(row.dictionary)) { return false; }
            const {id} = row;
            if (visited.has(id)) { return false; }
            visited.add(id);
            return true;
        };

        const indexNames = (matchType === 'suffix') ? ['expressionReverse', 'readingReverse'] : ['expression', 'reading'];

        let createQuery = this._createOnlyQuery1;
        switch (matchType) {
            case 'prefix':
                createQuery = this._createBoundQuery1;
                break;
            case 'suffix':
                createQuery = this._createBoundQuery2;
                break;
        }

        const createResult = this._createTermGeneric.bind(this, matchType);

        return this._findMultiBulk('terms', indexNames, termList, createQuery, predicate, createResult);
    }

    findTermsExactBulk(termList, dictionaries) {
        const predicate = (row, item) => (row.reading === item.reading && dictionaries.has(row.dictionary));
        return this._findMultiBulk('terms', ['expression'], termList, this._createOnlyQuery3, predicate, this._createTermBind1);
    }

    findTermsBySequenceBulk(items) {
        const predicate = (row, item) => (row.dictionary === item.dictionary);
        return this._findMultiBulk('terms', ['sequence'], items, this._createOnlyQuery2, predicate, this._createTermBind2);
    }

    findTermMetaBulk(termList, dictionaries) {
        const predicate = (row) => dictionaries.has(row.dictionary);
        return this._findMultiBulk('termMeta', ['expression'], termList, this._createOnlyQuery1, predicate, this._createTermMetaBind);
    }

    findKanjiBulk(kanjiList, dictionaries) {
        const predicate = (row) => dictionaries.has(row.dictionary);
        return this._findMultiBulk('kanji', ['character'], kanjiList, this._createOnlyQuery1, predicate, this._createKanjiBind);
    }

    findKanjiMetaBulk(kanjiList, dictionaries) {
        const predicate = (row) => dictionaries.has(row.dictionary);
        return this._findMultiBulk('kanjiMeta', ['character'], kanjiList, this._createOnlyQuery1, predicate, this._createKanjiMetaBind);
    }

    findTagMetaBulk(items) {
        const predicate = (row, item) => (row.dictionary === item.dictionary);
        return this._findFirstBulk('tagMeta', 'name', items, this._createOnlyQuery2, predicate);
    }

    findTagForTitle(name, title) {
        const query = IDBKeyRange.only(name);
        return this._db.find('tagMeta', 'name', query, (row) => (row.dictionary === title), null, null);
    }

    getMedia(items) {
        const predicate = (row, item) => (row.dictionary === item.dictionary);
        return this._findMultiBulk('media', ['path'], items, this._createOnlyQuery4, predicate, this._createMediaBind);
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
        const result = await this._db.find('dictionaries', 'title', query, null, null, void 0);
        return typeof result !== 'undefined';
    }

    bulkAdd(objectStoreName, items, start, count) {
        return this._db.bulkAdd(objectStoreName, items, start, count);
    }

    // Private

    _findMultiBulk(objectStoreName, indexNames, items, createQuery, predicate, createResult) {
        return new Promise((resolve, reject) => {
            const itemCount = items.length;
            const indexCount = indexNames.length;
            const results = [];
            if (itemCount === 0 || indexCount === 0) {
                resolve(results);
                return;
            }

            const transaction = this._db.transaction([objectStoreName], 'readonly');
            const objectStore = transaction.objectStore(objectStoreName);
            const indexList = [];
            for (const indexName of indexNames) {
                indexList.push(objectStore.index(indexName));
            }
            let completeCount = 0;
            const requiredCompleteCount = itemCount * indexCount;
            const onGetAll = (rows, data) => {
                for (const row of rows) {
                    if (predicate(row, data.item)) {
                        results.push(createResult(row, data));
                    }
                }
                if (++completeCount >= requiredCompleteCount) {
                    resolve(results);
                }
            };
            for (let i = 0; i < itemCount; ++i) {
                const item = items[i];
                const query = createQuery(item);
                for (let j = 0; j < indexCount; ++j) {
                    this._db.getAll(indexList[j], query, onGetAll, reject, {item, itemIndex: i, indexIndex: j});
                }
            }
        });
    }

    _findFirstBulk(objectStoreName, indexName, items, createQuery, predicate) {
        return new Promise((resolve, reject) => {
            const itemCount = items.length;
            const results = new Array(itemCount);
            if (itemCount === 0) {
                resolve(results);
                return;
            }

            const transaction = this._db.transaction([objectStoreName], 'readonly');
            const objectStore = transaction.objectStore(objectStoreName);
            const index = objectStore.index(indexName);
            let completeCount = 0;
            const onFind = (row, itemIndex) => {
                results[itemIndex] = row;
                if (++completeCount >= itemCount) {
                    resolve(results);
                }
            };
            for (let i = 0; i < itemCount; ++i) {
                const item = items[i];
                const query = createQuery(item);
                this._db.findFirst(index, query, onFind, reject, i, predicate, item, void 0);
            }
        });
    }

    _createTermGeneric(matchType, row, data) {
        const matchSourceIsTerm = (data.indexIndex === 0);
        const matchSource = (matchSourceIsTerm ? 'term' : 'reading');
        if ((matchSourceIsTerm ? row.expression : row.reading) === data.item) {
            matchType = 'exact';
        }
        return this._createTerm(matchSource, matchType, row, data);
    }

    _createTerm(matchSource, matchType, row, {itemIndex: index}) {
        const {sequence} = row;
        return {
            index,
            matchType,
            matchSource,
            term: row.expression,
            reading: row.reading,
            definitionTags: this._splitField(row.definitionTags || row.tags),
            termTags: this._splitField(row.termTags),
            rules: this._splitField(row.rules),
            definitions: row.glossary,
            score: row.score,
            dictionary: row.dictionary,
            id: row.id,
            sequence: typeof sequence === 'number' ? sequence : -1
        };
    }

    _createKanji(row, {itemIndex: index}) {
        return {
            index,
            character: row.character,
            onyomi: this._splitField(row.onyomi),
            kunyomi: this._splitField(row.kunyomi),
            tags: this._splitField(row.tags),
            definitions: row.meanings,
            stats: row.stats,
            dictionary: row.dictionary
        };
    }

    _createTermMeta({expression: term, mode, data, dictionary}, {itemIndex: index}) {
        return {term, mode, data, dictionary, index};
    }

    _createKanjiMeta({character, mode, data, dictionary}, {itemIndex: index}) {
        return {character, mode, data, dictionary, index};
    }

    _createMedia(row, {itemIndex: index}) {
        return Object.assign({}, row, {index});
    }

    _splitField(field) {
        return typeof field === 'string' && field.length > 0 ? field.split(' ') : [];
    }
}
