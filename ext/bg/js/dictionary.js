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
        this.entities = null;
    }

    existsDb() {
        return Dexie.exists('dict');
    }

    loadDb() {
        this.db = null;
        this.entities = null;

        return this.initDb().open();
    }

    initDb() {
        this.db = new Dexie('dict');
        this.db.version(1).stores({
            terms: '++id,expression,reading',
            entities: '++id,name',
            kanji: '++id,character'
        });

        return this.db;
    }

    importKanjiDict(dict) {
        return this.db.kanji.bulkAdd(dict.d);
    }

    fetchEntities() {
        if (this.entities !== null) {
            return Promise.resolve(this.entities);
        }

        return this.db.entities.toArray((rows) => {
            this.entities = {};
            for (const row of rows) {
                this.entities[row.name] = row.value;
            }
        }).then(() => {
            return Promise.resolve(this.entities);
        });
    }

    findTerm(term) {
        const results = [];
        return this.db.terms.where('expression').equals(term).or('reading').equals(term).each((row) => {
            results.push({
                expression: row.expression,
                reading: row.reading,
                tags: row.tags.split(' '),
                glossary: row.glossary,
                entities: this.entities,
                id: row.id
            });
        }).then(() => {
            return Promise.resolve(results);
        });
    }

    findKanji(kanji) {
        const results = [];
        return this.db.kanji.where('c').equals(kanji).each((row) => {
            results.push({
                character: row.c,
                onyomi: row.o.split(' '),
                kunyomi: row.k.split(' '),
                tags: row.t.split(' '),
                glossary: row.m
            });
        });
    }

    // importTermDict(dict) {
    //     return this.db.terms.bulkAdd(dict.d).then(() => {
    //         this.entities = {};
    //         for (const name in dict.e) {
    //             this.entities[name] = dict.e[name];
    //         }

    //         return this.db.entities.bulkAdd(dict.e);
    //     });
    // }

    importTermDict(indexUrl) {
        return Dictionary.loadJson(indexUrl).then((index) => {
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
                const indexDir = indexUrl.slice(0, indexUrl.lastIndexOf('/'));

                for (let i = 0; i < index.refs; ++i) {
                    const refUrl = `${indexDir}/ref_${i}.json`;
                    loaders.push(
                        Dictionary.loadJson(refUrl).then((refs) => {
                            const rows = [];
                            for (const [e, r, t, ...g] of refs) {
                                rows.push({
                                    'expression': e,
                                    'reading': r,
                                    'tags': t,
                                    'glossary': g
                                });
                            }

                            return this.db.terms.bulkAdd(rows);
                        })
                    );
                }

                return Promise.all(loaders);
            });
        });
    }

    static loadJson(url) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.addEventListener('load', () => resolve(JSON.parse(xhr.responseText)));
            xhr.open('GET', chrome.extension.getURL(url), true);
            xhr.send();
        });
    }
}
