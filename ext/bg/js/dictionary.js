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

    loadDb() {
        this.db = null;
        this.entities = null;

        return new Dexie('dict').open().then((db) => {
            this.db = db;
        });
    }

    resetDb() {
        this.db = null;
        this.entities = null;

        return new Dexie('dict').delete().then(() => {
            return Promise.resolve(new Dexie('dict'));
        }).then((db) => {
            this.db = db;
            return this.db.version(1).stores({
                terms: '++id, e, r',
                entities: 'n',
                kanji: 'c'
            });
        });
    }

    importTermDict(dict) {
        return this.db.terms.bulkAdd(dict.d).then(() => {
            this.entities = {};
            for (const name in dict.e) {
                this.entities[name] = dict.e[name];
            }

            return this.db.entities.bulkAdd(dict.e);
        });
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

    findterm(term) {
        const results = [];
        return this.db.terms.where('e').equals(term).or('r').equals(term).each((row) => {
            results.push({
                expression: row.e,
                reading: row.r,
                tags: row.t.split(' '),
                glossary: row.g,
                entities: this.entities,
                id: results.id
            });
        }).then(() => {
            Promise.resolve(results);
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
}
