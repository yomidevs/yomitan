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
        this.dbVer = 5;
        this.entities = null;
    }

    initDb() {
        if (this.db !== null) {
            return Promise.reject('database already initialized');
        }

        this.db = new Dexie('dict');
        this.db.version(1).stores({
            terms: '++id, dictionary, expression, reading',
            kanji: '++, dictionary, character',
            entities: '++, dictionary',
            dictionaries: '++, dictionary, version',
            meta: 'name, value',
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
                tags: splitField(row.tags),
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
                onyomi: splitField(row.onyomi),
                kunyomi: splitField(row.kunyomi),
                tags: splitField(row.tags),
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

        const indexLoaded = (dictionary, version, entities) => {
            return this.db.dictionaries.add({dictionary, version}).then(() => {
                this.entities = entities || {};

                const rows = [];
                for (const name in entities || {}) {
                    rows.push({
                        dictionary,
                        name,
                        value: entities[name]
                    });
                }

                return this.db.entities.bulkAdd(rows);
            });
        };

        const entriesLoaded = (dictionary, version, entries, total, current) => {
            const rows = [];
            for (const [expression, reading, tags, ...glossary] of entries) {
                rows.push({
                    dictionary,
                    expression,
                    reading,
                    tags,
                    glossary
                });
            }

            return this.db.terms.bulkAdd(rows).then(() => {
                if (callback) {
                    callback(current, total, indexUrl);
                }
            });
        };

        return importJsonDb(indexUrl, indexLoaded, entriesLoaded);
    }

    importKanjiDict(indexUrl, callback) {
        if (this.db === null) {
            return Promise.reject('database not initialized');
        }

        const indexLoaded = (dictionary, version) => {
            return this.db.dictionaries.add({dictionary, version});
        };

        const entriesLoaded = (dictionary, version, entries, total, current)  => {
            const rows = [];
            for (const [character, onyomi, kunyomi, tags, ...meanings] of entries) {
                rows.push({
                    dictionary,
                    character,
                    onyomi,
                    kunyomi,
                    tags,
                    meanings
                });
            }

            return this.db.kanji.bulkAdd(rows).then(() => {
                if (callback) {
                    callback(current, total, indexUrl);
                }
            });
        };

        return importJsonDb(indexUrl, null, entriesLoaded);
    }
}
