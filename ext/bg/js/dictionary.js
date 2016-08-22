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
        this.db = new Dexie('dict');
        this.dbVer = 1;
        this.entities = null;
    }

    loadDb() {
        return this.db.open().then((db) => {
            if (db.verno !== this.dbVer) {
                Promise.reject('db version mismatch');
            }

            return db.verno;
        });
    }

    initDb() {
        this.entities = {};
        return this.db.version(this.dbVer).stores({
            terms: 'expression, reading',
            entities: 'name',
            kanji: 'character',
        });
    }

    importTermDict(dict) {
        this.entities = {};
        return this.db.terms.bulkAdd(dict.d, 'expression, reading, tags, glossary').then(() => {
            for (const [key, value] of dict.e) {
                this.entities[key] = value;
            }

            return this.db.entities.bulkAdd(dict.e, 'name, value');
        });
    }

    importKanjiDict(dict) {
        return this.db.kanji.bulkAdd(dict.d, 'character, onyomi, kunyomi, tags, glossary');
    }

    fetchEntities() {
        if (this.entities !== null) {
            return Promise.resolve(this.entities);
        }

        this.entities = {};
        return this.db.entities.each((row) => {
            this.entities[row.name] = row.value;
        }).then(() => {
            return Promise.resolve(this.entities);
        });
    }

    findterm(term) {
        const results = [];
        return this.db.terms.where('expression').equals(term).or('reading').equals(term).each((row) => {
            results.push({
                expression: row.expression,
                reading: row.reading,
                tags: row.tags.split(' '),
                glossary: row.glossary,
                entities: this.entities,
                id: results.length
            });
        }).then(() => {
            Promise.resolve(results);
        });
    }

    findKanji(kanji) {
        const results = [];
        return this.db.kanji.where('character').equals(kanji).each((row) => {
            results.push({
                character: row.character,
                onyomi: row.onyomi.split(' '),
                kunyomi: row.kunyomi.split(' '),
                tags: row.tags.split(' '),
                glossary: row.glossary
            });
        });
    }
}
