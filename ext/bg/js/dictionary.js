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


class Dictionary {
    constructor() {
        this.db = null;
        this.dbVer = 2;
        this.entities = null;
    }

    initDb() {
        if (this.db !== null) {
            return Promise.reject('database already initialized');
        }

        this.db = new Dexie('dict');
        this.db.version(1).stores({
            terms: '++id,expression,reading',
            entities: '++,name',
            kanji: '++,character',
            meta: 'name,value',
        });
    }

    prepareDb() {
        this.initDb();

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
                this.initDb();
                return false;
            });
        });
    }

    sealDb() {
        if (this.db === null) {
            return Promise.reject('database not initialized');
        }

        return this.db.meta.put({name: 'version', value: this.dbVer});
    }

    findTerm(term) {
        if (this.db === null) {
            return Promise.reject('database not initialized');
        }

        const results = [];
        return this.db.terms.where('expression').equals(term).or('reading').equals(term).each(row => {
            results.push({
                expression: row.expression,
                reading: row.reading,
                tags: row.tags.split(' '),
                glossary: row.glossary,
                id: row.id
            });
        }).then(() => {
            return this.getEntities();
        }).then(entities => {
            for (const result of results) {
                result.entities = entities;
            }

            return results;
        });
    }

    findKanji(kanji) {
        if (this.db === null) {
            return Promise.reject('database not initialized');
        }

        const results = [];
        return this.db.kanji.where('character').equals(kanji).each(row => {
            results.push({
                character: row.character,
                onyomi: row.onyomi.split(' '),
                kunyomi: row.kunyomi.split(' '),
                tags: row.tags.split(' '),
                glossary: row.meanings
            });
        }).then(() => results);
    }

    getEntities(tags) {
        if (this.db === null) {
            return Promise.reject('database not initialized');
        }

        if (this.entities !== null) {
            return Promise.resolve(this.entities);
        }

        return this.db.entities.toArray(rows => {
            this.entities = {};
            for (const row of rows) {
                this.entities[row.name] = row.value;
            }

            return this.entities;
        });
    }

    importTermDict(indexUrl, callback) {
        if (this.db === null) {
            return Promise.reject('database not initialized');
        }

        const indexDir = indexUrl.slice(0, indexUrl.lastIndexOf('/'));
        return loadJson(indexUrl).then(index => {
            const entities = [];
            for (const [name, value] of index.ents) {
                entities.push({name, value});
            }

            return this.db.entities.bulkAdd(entities).then(() => {
                if (this.entities === null) {
                    this.entities = {};
                }

                for (const entity of entities) {
                    this.entities[entity.name] = entity.value;
                }
            }).then(() => {
                const loaders = [];
                for (let i = 1; i <= index.banks; ++i) {
                    const bankUrl = `${indexDir}/bank_${i}.json`;
                    loaders.push(() => {
                        return loadJson(bankUrl).then(definitions => {
                            const rows = [];
                            for (const [expression, reading, tags, ...glossary] of definitions) {
                                rows.push({expression, reading, tags, glossary});
                            }

                            return this.db.terms.bulkAdd(rows).then(() => {
                                if (callback) {
                                    callback(i, index.banks, indexUrl);
                                }
                            });
                        });
                    });
                }

                let chain = Promise.resolve();
                for (const loader of loaders) {
                    chain = chain.then(loader);
                }

                return chain;
            });
        });
    }

    importKanjiDict(indexUrl, callback) {
        if (this.db === null) {
            return Promise.reject('database not initialized');
        }

        const indexDir = indexUrl.slice(0, indexUrl.lastIndexOf('/'));
        return loadJson(indexUrl).then(index => {
            const loaders = [];
            for (let i = 1; i <= index.banks; ++i) {
                const bankUrl = `${indexDir}/bank_${i}.json`;
                loaders.push(() => {
                    return loadJson(bankUrl).then(definitions => {
                        const rows = [];
                        for (const [character, onyomi, kunyomi, tags, ...meanings] of definitions) {
                            rows.push({character, onyomi, kunyomi, tags, meanings});
                        }

                        return this.db.kanji.bulkAdd(rows).then(() => {
                            if (callback) {
                                callback(i, index.banks, indexUrl);
                            }
                        });
                    });
                });
            }

            let chain = Promise.resolve();
            for (const loader of loaders) {
                chain = chain.then(loader);
            }

            return chain;
        });
    }
}
