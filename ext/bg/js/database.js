/*
 * Copyright (C) 2016  Alex Yatskov <alex@foosoft.net>
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
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */


class Database {
    constructor() {
        this.db = null;
        this.dbVer = 6;
        this.entities = {};
    }

    init() {
        if (this.db !== null) {
            return Promise.reject('database already initialized');
        }

        this.db = new Dexie('dict');
        this.db.version(1).stores({
            terms: '++id, dictionary, expression, reading',
            kanji: '++, dictionary, character',
            entities: '++, dictionary',
            dictionaries: '++, title, version',
            meta: 'name, value',
        });

        return Promise.resolve();
    }

    prepare() {
        this.init();

        return this.db.meta.get('version').then(row => {
            return row ? row.value : 0;
        }).catch(() => {
            return 0;
        }).then(version => {
            if (this.dbVer === version) {
                return true;
            }

            const db = this.db;
            this.db.close();
            this.db = null;

            return db.delete().then(() => {
                this.init();
                return false;
            });
        });
    }

    seal() {
        if (this.db === null) {
            return Promise.reject('database not initialized');
        }

        return this.db.meta.put({name: 'version', value: this.dbVer});
    }

    findTerm(term, dictionaries) {
        if (this.db === null) {
            return Promise.reject('database not initialized');
        }

        const results = [];
        return this.db.terms.where('expression').equals(term).or('reading').equals(term).each(row => {
            if (dictionaries.includes(row.dictionary)) {
                results.push({
                    expression: row.expression,
                    reading: row.reading,
                    tags: splitField(row.tags),
                    glossary: row.glossary,
                    id: row.id
                });
            }
        }).then(() => {
            return this.getEntities(dictionaries);
        }).then(entities => {
            for (const result of results) {
                result.entities = entities;
            }

            return results;
        });
    }

    findKanji(kanji, dictionaries) {
        if (this.db === null) {
            return Promise.reject('database not initialized');
        }

        const results = [];
        return this.db.kanji.where('character').equals(kanji).each(row => {
            if (dictionaries.includes(row.dictionary)) {
                results.push({
                    character: row.character,
                    onyomi: splitField(row.onyomi),
                    kunyomi: splitField(row.kunyomi),
                    tags: splitField(row.tags),
                    glossary: row.meanings
                });
            }
        }).then(() => {
            return this.getEntities(dictionaries);
        }).then(entities => {
            for (const result of results) {
                result.entities = entities;
            }

            return results;
        });
    }

    getEntities(dictionaries) {
        if (this.db === null) {
            return Promise.reject('database not initialized');
        }

        const promises = [];
        for (const dictionary of dictionaries) {
            if (this.entities.hasOwnProperty(dictionary)) {
                promises.push(Promise.resolve(this.entities[dictionary]));
            } else {
                const entities = this.entities[dictionary] = {};
                promises.push(
                    this.db.entities.where('dictionary').equals(dictionary).each(row => {
                        entities[row.name] = row.value;
                    }).then(() => entities)
                );
            }
        }

        return Promise.all(promises).then(results => {
            const entries = {};
            for (const result of results) {
                for (const name in result) {
                    entries[name] = result[name];
                }
            }

            return entries;
        });
    }

    getDictionaries() {
        if (this.db === null) {
            return Promise.reject('database not initialized');
        }

        return this.db.dictionaries.toArray();
    }

    deleteDictionary(title, callback) {
        if (this.db === null) {
            return Promise.reject('database not initialized');
        }

        return this.db.dictionaries.where('title').equals(title).first(info => {
            if (!info) {
                return;
            }

            let termCounter = Promise.resolve(0);
            if (info.hasTerms) {
                termCounter = this.db.terms.where('dictionary').equals(title).count();
            }

            let kanjiCounter = Promise.resolve(0);
            if (info.hasKanji) {
                kanjiCounter = this.db.kanji.where('dictionary').equals(title).count();
            }

            return Promise.all([termCounter, kanjiCounter]).then(([termCount, kanjiCount]) => {
                const totalCount = termCount + kanjiCount;
                let deletedCount = 0;

                let termDeleter = Promise.resolve();
                if (info.hasTerms) {
                    const termDeleterFunc = () => {
                        return this.db.terms.where('dictionary').equals(title).limit(1000).delete().then(count => {
                            if (count === 0) {
                                return Promise.resolve();
                            }

                            deletedCount += count;
                            if (callback) {
                                callback(totalCount, deletedCount);
                            }

                            return termDeleterFunc();
                        });
                    };

                    termDeleter = termDeleterFunc();
                }

                let kanjiDeleter = Promise.resolve();
                if (info.hasKanji) {
                    const kanjiDeleterFunc = () => {
                        return this.db.kanji.where('dictionary').equals(title).limit(1000).delete().then(count => {
                            if (count === 0) {
                                return Promise.resolve();
                            }

                            deletedCount += count;
                            if (callback) {
                                callback(totalCount, deletedCount);
                            }

                            return kanjiDeleterFunc();
                        });
                    };

                    kanjiDeleter = kanjiDeleterFunc();
                }

                return Promise.all([termDeleter, kanjiDeleter]);
            });
        }).then(() => {
            return this.db.entities.where('dictionary').equals(title).delete();
        }).then(() => {
            return this.db.dictionaries.where('title').equals(title).delete();
        });
    }

    importDictionary(indexUrl, callback) {
        if (this.db === null) {
            return Promise.reject('database not initialized');
        }

        const indexLoaded = (title, version, entities, hasTerms, hasKanji) => {
            return this.db.dictionaries.where('title').equals(title).count().then(count => {
                if (count > 0) {
                    return Promise.reject(`dictionary "${title}" is already imported`);
                }

                return this.db.dictionaries.add({title, version, hasTerms, hasKanji}).then(() => {
                    this.entities = entities || {};

                    const rows = [];
                    for (const name in entities || {}) {
                        rows.push({name, value: entities[name], dictionary: title});
                    }

                    return this.db.entities.bulkAdd(rows);
                });
            });
        };

        const termsLoaded = (title, entries, total, current) => {
            const rows = [];
            for (const [expression, reading, tags, ...glossary] of entries) {
                rows.push({
                    expression,
                    reading,
                    tags,
                    glossary,
                    dictionary: title
                });
            }

            return this.db.terms.bulkAdd(rows).then(() => {
                if (callback) {
                    callback(total, current, indexUrl);
                }
            });
        };

        const kanjiLoaded = (title, entries, total, current)  => {
            const rows = [];
            for (const [character, onyomi, kunyomi, tags, ...meanings] of entries) {
                rows.push({
                    character,
                    onyomi,
                    kunyomi,
                    tags,
                    meanings,
                    dictionary: title
                });
            }

            return this.db.kanji.bulkAdd(rows).then(() => {
                if (callback) {
                    callback(total, current, indexUrl);
                }
            });
        };

        return importJsonDb(indexUrl, indexLoaded, termsLoaded, kanjiLoaded);
    }
}
