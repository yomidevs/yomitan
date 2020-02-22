/*
 * Copyright (C) 2016-2020  Alex Yatskov <alex@foosoft.net>
 * Author: Alex Yatskov <alex@foosoft.net>
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

/*global dictFieldSplit, requestJson, JsonSchema, JSZip*/

class Database {
    constructor() {
        this.db = null;
        this._schemas = new Map();
    }

    // Public

    async prepare() {
        if (this.db !== null) {
            throw new Error('Database already initialized');
        }

        try {
            this.db = await Database._open('dict', 5, (db, transaction, oldVersion) => {
                Database._upgrade(db, transaction, oldVersion, [
                    {
                        version: 2,
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
                        version: 3,
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
                        version: 4,
                        stores: {
                            terms: {
                                primaryKey: {keyPath: 'id', autoIncrement: true},
                                indices: ['dictionary', 'expression', 'reading', 'sequence']
                            }
                        }
                    },
                    {
                        version: 5,
                        stores: {
                            terms: {
                                primaryKey: {keyPath: 'id', autoIncrement: true},
                                indices: ['dictionary', 'expression', 'reading', 'sequence', 'expressionReverse', 'readingReverse']
                            }
                        }
                    }
                ]);
            });
            return true;
        } catch (e) {
            console.error(e);
            return false;
        }
    }

    async close() {
        this._validate();
        this.db.close();
        this.db = null;
    }

    async purge() {
        this._validate();

        this.db.close();
        await Database._deleteDatabase(this.db.name);
        this.db = null;

        await this.prepare();
    }

    async deleteDictionary(dictionaryName, onProgress, progressSettings) {
        this._validate();

        const targets = [
            ['dictionaries', 'title'],
            ['kanji', 'dictionary'],
            ['kanjiMeta', 'dictionary'],
            ['terms', 'dictionary'],
            ['termMeta', 'dictionary'],
            ['tagMeta', 'dictionary']
        ];
        const promises = [];
        const progressData = {
            count: 0,
            processed: 0,
            storeCount: targets.length,
            storesProcesed: 0
        };
        let progressRate = (typeof progressSettings === 'object' && progressSettings !== null ? progressSettings.rate : 0);
        if (typeof progressRate !== 'number' || progressRate <= 0) {
            progressRate = 1000;
        }

        for (const [objectStoreName, index] of targets) {
            const dbTransaction = this.db.transaction([objectStoreName], 'readwrite');
            const dbObjectStore = dbTransaction.objectStore(objectStoreName);
            const dbIndex = dbObjectStore.index(index);
            const only = IDBKeyRange.only(dictionaryName);
            promises.push(Database._deleteValues(dbObjectStore, dbIndex, only, onProgress, progressData, progressRate));
        }

        await Promise.all(promises);
    }

    async findTermsBulk(termList, titles, wildcard) {
        this._validate();

        const promises = [];
        const visited = {};
        const results = [];
        const processRow = (row, index) => {
            if (titles.includes(row.dictionary) && !hasOwn(visited, row.id)) {
                visited[row.id] = true;
                results.push(Database._createTerm(row, index));
            }
        };

        const useWildcard = !!wildcard;
        const prefixWildcard = wildcard === 'prefix';

        const dbTransaction = this.db.transaction(['terms'], 'readonly');
        const dbTerms = dbTransaction.objectStore('terms');
        const dbIndex1 = dbTerms.index(prefixWildcard ? 'expressionReverse' : 'expression');
        const dbIndex2 = dbTerms.index(prefixWildcard ? 'readingReverse' : 'reading');

        for (let i = 0; i < termList.length; ++i) {
            const term = prefixWildcard ? stringReverse(termList[i]) : termList[i];
            const query = useWildcard ? IDBKeyRange.bound(term, `${term}\uffff`, false, false) : IDBKeyRange.only(term);
            promises.push(
                Database._getAll(dbIndex1, query, i, processRow),
                Database._getAll(dbIndex2, query, i, processRow)
            );
        }

        await Promise.all(promises);

        return results;
    }

    async findTermsExactBulk(termList, readingList, titles) {
        this._validate();

        const promises = [];
        const results = [];
        const processRow = (row, index) => {
            if (row.reading === readingList[index] && titles.includes(row.dictionary)) {
                results.push(Database._createTerm(row, index));
            }
        };

        const dbTransaction = this.db.transaction(['terms'], 'readonly');
        const dbTerms = dbTransaction.objectStore('terms');
        const dbIndex = dbTerms.index('expression');

        for (let i = 0; i < termList.length; ++i) {
            const only = IDBKeyRange.only(termList[i]);
            promises.push(Database._getAll(dbIndex, only, i, processRow));
        }

        await Promise.all(promises);

        return results;
    }

    async findTermsBySequenceBulk(sequenceList, mainDictionary) {
        this._validate();

        const promises = [];
        const results = [];
        const processRow = (row, index) => {
            if (row.dictionary === mainDictionary) {
                results.push(Database._createTerm(row, index));
            }
        };

        const dbTransaction = this.db.transaction(['terms'], 'readonly');
        const dbTerms = dbTransaction.objectStore('terms');
        const dbIndex = dbTerms.index('sequence');

        for (let i = 0; i < sequenceList.length; ++i) {
            const only = IDBKeyRange.only(sequenceList[i]);
            promises.push(Database._getAll(dbIndex, only, i, processRow));
        }

        await Promise.all(promises);

        return results;
    }

    async findTermMetaBulk(termList, titles) {
        return this._findGenericBulk('termMeta', 'expression', termList, titles, Database._createTermMeta);
    }

    async findKanjiBulk(kanjiList, titles) {
        return this._findGenericBulk('kanji', 'character', kanjiList, titles, Database._createKanji);
    }

    async findKanjiMetaBulk(kanjiList, titles) {
        return this._findGenericBulk('kanjiMeta', 'character', kanjiList, titles, Database._createKanjiMeta);
    }

    async findTagForTitle(name, title) {
        this._validate();

        let result = null;
        const dbTransaction = this.db.transaction(['tagMeta'], 'readonly');
        const dbTerms = dbTransaction.objectStore('tagMeta');
        const dbIndex = dbTerms.index('name');
        const only = IDBKeyRange.only(name);
        await Database._getAll(dbIndex, only, null, (row) => {
            if (title === row.dictionary) {
                result = row;
            }
        });

        return result;
    }

    async getDictionaryInfo() {
        this._validate();

        const results = [];
        const dbTransaction = this.db.transaction(['dictionaries'], 'readonly');
        const dbDictionaries = dbTransaction.objectStore('dictionaries');

        await Database._getAll(dbDictionaries, null, null, (info) => results.push(info));

        return results;
    }

    async getDictionaryCounts(dictionaryNames, getTotal) {
        this._validate();

        const objectStoreNames = [
            'kanji',
            'kanjiMeta',
            'terms',
            'termMeta',
            'tagMeta'
        ];
        const dbCountTransaction = this.db.transaction(objectStoreNames, 'readonly');

        const targets = [];
        for (const objectStoreName of objectStoreNames) {
            targets.push([
                objectStoreName,
                dbCountTransaction.objectStore(objectStoreName).index('dictionary')
            ]);
        }

        // Query is required for Edge, otherwise index.count throws an exception.
        const query1 = IDBKeyRange.lowerBound('', false);
        const totalPromise = getTotal ? Database._getCounts(targets, query1) : null;

        const counts = [];
        const countPromises = [];
        for (let i = 0; i < dictionaryNames.length; ++i) {
            counts.push(null);
            const index = i;
            const query2 = IDBKeyRange.only(dictionaryNames[i]);
            const countPromise = Database._getCounts(targets, query2).then((v) => counts[index] = v);
            countPromises.push(countPromise);
        }
        await Promise.all(countPromises);

        const result = {counts};
        if (totalPromise !== null) {
            result.total = await totalPromise;
        }
        return result;
    }

    async importDictionary(archiveSource, onProgress, details) {
        this._validate();
        const db = this.db;
        const hasOnProgress = (typeof onProgress === 'function');

        // Read archive
        const archive = await JSZip.loadAsync(archiveSource);

        // Read and validate index
        const indexFile = archive.files['index.json'];
        if (!indexFile) {
            throw new Error('No dictionary index found in archive');
        }

        const index = JSON.parse(await indexFile.async('string'));

        const indexSchema = await this._getSchema('/bg/data/dictionary-index-schema.json');
        JsonSchema.validate(index, indexSchema);

        const dictionaryTitle = index.title;
        const version = index.format || index.version;

        if (!dictionaryTitle || !index.revision) {
            throw new Error('Unrecognized dictionary format');
        }

        // Verify database is not already imported
        if (await this._dictionaryExists(dictionaryTitle)) {
            throw new Error('Dictionary is already imported');
        }

        // Data format converters
        const convertTermBankEntry = (entry) => {
            if (version === 1) {
                const [expression, reading, definitionTags, rules, score, ...glossary] = entry;
                return {expression, reading, definitionTags, rules, score, glossary};
            } else {
                const [expression, reading, definitionTags, rules, score, glossary, sequence, termTags] = entry;
                return {expression, reading, definitionTags, rules, score, glossary, sequence, termTags};
            }
        };

        const convertTermMetaBankEntry = (entry) => {
            const [expression, mode, data] = entry;
            return {expression, mode, data};
        };

        const convertKanjiBankEntry = (entry) => {
            if (version === 1) {
                const [character, onyomi, kunyomi, tags, ...meanings] = entry;
                return {character, onyomi, kunyomi, tags, meanings};
            } else {
                const [character, onyomi, kunyomi, tags, meanings, stats] = entry;
                return {character, onyomi, kunyomi, tags, meanings, stats};
            }
        };

        const convertKanjiMetaBankEntry = (entry) => {
            const [character, mode, data] = entry;
            return {character, mode, data};
        };

        const convertTagBankEntry = (entry) => {
            const [name, category, order, notes, score] = entry;
            return {name, category, order, notes, score};
        };

        // Archive file reading
        const readFileSequence = async (fileNameFormat, convertEntry, schema) => {
            const results = [];
            for (let i = 1; true; ++i) {
                const fileName = fileNameFormat.replace(/\?/, `${i}`);
                const file = archive.files[fileName];
                if (!file) { break; }

                const entries = JSON.parse(await file.async('string'));
                JsonSchema.validate(entries, schema);

                for (let entry of entries) {
                    entry = convertEntry(entry);
                    entry.dictionary = dictionaryTitle;
                    results.push(entry);
                }
            }
            return results;
        };

        // Load schemas
        const dataBankSchemaPaths = this.constructor._getDataBankSchemaPaths(version);
        const dataBankSchemas = await Promise.all(dataBankSchemaPaths.map((path) => this._getSchema(path)));

        // Load data
        const termList      = await readFileSequence('term_bank_?.json',       convertTermBankEntry,      dataBankSchemas[0]);
        const termMetaList  = await readFileSequence('term_meta_bank_?.json',  convertTermMetaBankEntry,  dataBankSchemas[1]);
        const kanjiList     = await readFileSequence('kanji_bank_?.json',      convertKanjiBankEntry,     dataBankSchemas[2]);
        const kanjiMetaList = await readFileSequence('kanji_meta_bank_?.json', convertKanjiMetaBankEntry, dataBankSchemas[3]);
        const tagList       = await readFileSequence('tag_bank_?.json',        convertTagBankEntry,       dataBankSchemas[4]);

        // Old tags
        const indexTagMeta = index.tagMeta;
        if (typeof indexTagMeta === 'object' && indexTagMeta !== null) {
            for (const name of Object.keys(indexTagMeta)) {
                const {category, order, notes, score} = indexTagMeta[name];
                tagList.push({name, category, order, notes, score});
            }
        }

        // Prefix wildcard support
        const prefixWildcardsSupported = !!details.prefixWildcardsSupported;
        if (prefixWildcardsSupported) {
            for (const entry of termList) {
                entry.expressionReverse = stringReverse(entry.expression);
                entry.readingReverse = stringReverse(entry.reading);
            }
        }

        // Add dictionary
        const summary = {
            title: dictionaryTitle,
            revision: index.revision,
            sequenced: index.sequenced,
            version,
            prefixWildcardsSupported
        };

        {
            const transaction = db.transaction(['dictionaries'], 'readwrite');
            const objectStore = transaction.objectStore('dictionaries');
            await Database._bulkAdd(objectStore, [summary], 0, 1);
        }

        // Add data
        const errors = [];
        const total = (
            termList.length +
            termMetaList.length +
            kanjiList.length +
            kanjiMetaList.length +
            tagList.length
        );
        let loadedCount = 0;
        const maxTransactionLength = 1000;

        const bulkAdd = async (objectStoreName, entries) => {
            const ii = entries.length;
            for (let i = 0; i < ii; i += maxTransactionLength) {
                const count = Math.min(maxTransactionLength, ii - i);

                try {
                    const transaction = db.transaction([objectStoreName], 'readwrite');
                    const objectStore = transaction.objectStore(objectStoreName);
                    await Database._bulkAdd(objectStore, entries, i, count);
                } catch (e) {
                    errors.push(e);
                }

                loadedCount += count;
                if (hasOnProgress) {
                    onProgress(total, loadedCount);
                }
            }
        };

        await bulkAdd('terms', termList);
        await bulkAdd('termMeta', termMetaList);
        await bulkAdd('kanji', kanjiList);
        await bulkAdd('kanjiMeta', kanjiMetaList);
        await bulkAdd('tagMeta', tagList);

        return {result: summary, errors};
    }

    // Private

    _validate() {
        if (this.db === null) {
            throw new Error('Database not initialized');
        }
    }

    async _getSchema(fileName) {
        let schemaPromise = this._schemas.get(fileName);
        if (typeof schemaPromise !== 'undefined') {
            return schemaPromise;
        }

        schemaPromise = requestJson(chrome.runtime.getURL(fileName), 'GET');
        this._schemas.set(fileName, schemaPromise);
        return schemaPromise;
    }

    static _getDataBankSchemaPaths(version) {
        const termBank = (
            version === 1 ?
            '/bg/data/dictionary-term-bank-v1-schema.json' :
            '/bg/data/dictionary-term-bank-v3-schema.json'
        );
        const termMetaBank = '/bg/data/dictionary-term-meta-bank-v3-schema.json';
        const kanjiBank = (
            version === 1 ?
            '/bg/data/dictionary-kanji-bank-v1-schema.json' :
            '/bg/data/dictionary-kanji-bank-v3-schema.json'
        );
        const kanjiMetaBank = '/bg/data/dictionary-kanji-meta-bank-v3-schema.json';
        const tagBank = '/bg/data/dictionary-tag-bank-v3-schema.json';

        return [termBank, termMetaBank, kanjiBank, kanjiMetaBank, tagBank];
    }

    async _dictionaryExists(title) {
        const db = this.db;
        const dbCountTransaction = db.transaction(['dictionaries'], 'readonly');
        const dbIndex = dbCountTransaction.objectStore('dictionaries').index('title');
        const only = IDBKeyRange.only(title);
        const count = await Database._getCount(dbIndex, only);
        return count > 0;
    }

    async _findGenericBulk(tableName, indexName, indexValueList, titles, createResult) {
        this._validate();

        const promises = [];
        const results = [];
        const processRow = (row, index) => {
            if (titles.includes(row.dictionary)) {
                results.push(createResult(row, index));
            }
        };

        const dbTransaction = this.db.transaction([tableName], 'readonly');
        const dbTerms = dbTransaction.objectStore(tableName);
        const dbIndex = dbTerms.index(indexName);

        for (let i = 0; i < indexValueList.length; ++i) {
            const only = IDBKeyRange.only(indexValueList[i]);
            promises.push(Database._getAll(dbIndex, only, i, processRow));
        }

        await Promise.all(promises);

        return results;
    }

    static _createTerm(row, index) {
        return {
            index,
            expression: row.expression,
            reading: row.reading,
            definitionTags: dictFieldSplit(row.definitionTags || row.tags || ''),
            termTags: dictFieldSplit(row.termTags || ''),
            rules: dictFieldSplit(row.rules),
            glossary: row.glossary,
            score: row.score,
            dictionary: row.dictionary,
            id: row.id,
            sequence: typeof row.sequence === 'undefined' ? -1 : row.sequence
        };
    }

    static _createKanji(row, index) {
        return {
            index,
            character: row.character,
            onyomi: dictFieldSplit(row.onyomi),
            kunyomi: dictFieldSplit(row.kunyomi),
            tags: dictFieldSplit(row.tags),
            glossary: row.meanings,
            stats: row.stats,
            dictionary: row.dictionary
        };
    }

    static _createTermMeta({expression, mode, data, dictionary}, index) {
        return {expression, mode, data, dictionary, index};
    }

    static _createKanjiMeta({character, mode, data, dictionary}, index) {
        return {character, mode, data, dictionary, index};
    }

    static _getAll(dbIndex, query, context, processRow) {
        const fn = typeof dbIndex.getAll === 'function' ? Database._getAllFast : Database._getAllUsingCursor;
        return fn(dbIndex, query, context, processRow);
    }

    static _getAllFast(dbIndex, query, context, processRow) {
        return new Promise((resolve, reject) => {
            const request = dbIndex.getAll(query);
            request.onerror = (e) => reject(e);
            request.onsuccess = (e) => {
                for (const row of e.target.result) {
                    processRow(row, context);
                }
                resolve();
            };
        });
    }

    static _getAllUsingCursor(dbIndex, query, context, processRow) {
        return new Promise((resolve, reject) => {
            const request = dbIndex.openCursor(query, 'next');
            request.onerror = (e) => reject(e);
            request.onsuccess = (e) => {
                const cursor = e.target.result;
                if (cursor) {
                    processRow(cursor.value, context);
                    cursor.continue();
                } else {
                    resolve();
                }
            };
        });
    }

    static _getCounts(targets, query) {
        const countPromises = [];
        const counts = {};
        for (const [objectStoreName, index] of targets) {
            const n = objectStoreName;
            const countPromise = Database._getCount(index, query).then((count) => counts[n] = count);
            countPromises.push(countPromise);
        }
        return Promise.all(countPromises).then(() => counts);
    }

    static _getCount(dbIndex, query) {
        return new Promise((resolve, reject) => {
            const request = dbIndex.count(query);
            request.onerror = (e) => reject(e);
            request.onsuccess = (e) => resolve(e.target.result);
        });
    }

    static _getAllKeys(dbIndex, query) {
        const fn = typeof dbIndex.getAllKeys === 'function' ? Database._getAllKeysFast : Database._getAllKeysUsingCursor;
        return fn(dbIndex, query);
    }

    static _getAllKeysFast(dbIndex, query) {
        return new Promise((resolve, reject) => {
            const request = dbIndex.getAllKeys(query);
            request.onerror = (e) => reject(e);
            request.onsuccess = (e) => resolve(e.target.result);
        });
    }

    static _getAllKeysUsingCursor(dbIndex, query) {
        return new Promise((resolve, reject) => {
            const primaryKeys = [];
            const request = dbIndex.openKeyCursor(query, 'next');
            request.onerror = (e) => reject(e);
            request.onsuccess = (e) => {
                const cursor = e.target.result;
                if (cursor) {
                    primaryKeys.push(cursor.primaryKey);
                    cursor.continue();
                } else {
                    resolve(primaryKeys);
                }
            };
        });
    }

    static async _deleteValues(dbObjectStore, dbIndex, query, onProgress, progressData, progressRate) {
        const hasProgress = (typeof onProgress === 'function');
        const count = await Database._getCount(dbIndex, query);
        ++progressData.storesProcesed;
        progressData.count += count;
        if (hasProgress) {
            onProgress(progressData);
        }

        const onValueDeleted = (
            hasProgress ?
            () => {
                const p = ++progressData.processed;
                if ((p % progressRate) === 0 || p === progressData.count) {
                    onProgress(progressData);
                }
            } :
            () => {}
        );

        const promises = [];
        const primaryKeys = await Database._getAllKeys(dbIndex, query);
        for (const key of primaryKeys) {
            const promise = Database._deleteValue(dbObjectStore, key).then(onValueDeleted);
            promises.push(promise);
        }

        await Promise.all(promises);
    }

    static _deleteValue(dbObjectStore, key) {
        return new Promise((resolve, reject) => {
            const request = dbObjectStore.delete(key);
            request.onerror = (e) => reject(e);
            request.onsuccess = () => resolve();
        });
    }

    static _bulkAdd(objectStore, items, start, count) {
        return new Promise((resolve, reject) => {
            if (start + count > items.length) {
                count = items.length - start;
            }

            if (count <= 0) {
                resolve();
                return;
            }

            const end = start + count;
            let completedCount = 0;
            const onError = (e) => reject(e);
            const onSuccess = () => {
                if (++completedCount >= count) {
                    resolve();
                }
            };

            for (let i = start; i < end; ++i) {
                const request = objectStore.add(items[i]);
                request.onerror = onError;
                request.onsuccess = onSuccess;
            }
        });
    }

    static _open(name, version, onUpgradeNeeded) {
        return new Promise((resolve, reject) => {
            const request = window.indexedDB.open(name, version * 10);

            request.onupgradeneeded = (event) => {
                try {
                    request.transaction.onerror = (e) => reject(e);
                    onUpgradeNeeded(request.result, request.transaction, event.oldVersion / 10, event.newVersion / 10);
                } catch (e) {
                    reject(e);
                }
            };

            request.onerror = (e) => reject(e);
            request.onsuccess = () => resolve(request.result);
        });
    }

    static _upgrade(db, transaction, oldVersion, upgrades) {
        for (const {version, stores} of upgrades) {
            if (oldVersion >= version) { continue; }

            const objectStoreNames = Object.keys(stores);
            for (const objectStoreName of objectStoreNames) {
                const {primaryKey, indices} = stores[objectStoreName];

                const objectStoreNames = transaction.objectStoreNames || db.objectStoreNames;
                const objectStore = (
                    Database._listContains(objectStoreNames, objectStoreName) ?
                    transaction.objectStore(objectStoreName) :
                    db.createObjectStore(objectStoreName, primaryKey)
                );

                for (const indexName of indices) {
                    if (Database._listContains(objectStore.indexNames, indexName)) { continue; }

                    objectStore.createIndex(indexName, indexName, {});
                }
            }
        }
    }

    static _deleteDatabase(dbName) {
        return new Promise((resolve, reject) => {
            const request = indexedDB.deleteDatabase(dbName);
            request.onerror = (e) => reject(e);
            request.onsuccess = () => resolve();
        });
    }

    static _listContains(list, value) {
        for (let i = 0, ii = list.length; i < ii; ++i) {
            if (list[i] === value) { return true; }
        }
        return false;
    }
}
