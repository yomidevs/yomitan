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

    initDb() {
        this.entities = null;

        this.db = new Dexie('dict');
        this.db.version(1).stores({
            terms: '++id,expression,reading',
            entities: '++,name',
            kanji: '++,character'
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

    getEntities() {
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

    importTermDict(indexUrl) {
        const indexDir = indexUrl.slice(0, indexUrl.lastIndexOf('/'));

        return loadJson(indexUrl).then((index) => {
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
                        return loadJson(bankUrl).then((defs) => {
                            const rows = [];
                            for (const [expression, reading, tags, ...glossary] of defs) {
                                rows.push({expression, reading, tags, glossary});
                            }

                            return this.db.terms.bulkAdd(rows);
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

    importKanjiDict(indexUrl) {
        const indexDir = indexUrl.slice(0, indexUrl.lastIndexOf('/'));

        return loadJson(indexUrl).then((index) => {
            const loaders = [];
            for (let i = 1; i <= index.banks; ++i) {
                const bankUrl = `${indexDir}/bank_${i}.json`;
                loaders.push(() => {
                    return loadJson(bankUrl).then((defs) => {
                        const rows = [];
                        for (const [character, onyomi, kunyomi, tags, ...meanings] of defs) {
                            rows.push({character, onyomi, kunyomi, tags, meanings});
                        }

                        return this.db.kanji.bulkAdd(rows);
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
