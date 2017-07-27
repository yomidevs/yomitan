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
        this.dbVersion = 2;
        this.tagMetaCache = {};
    }

    sanitize() {
        const db = new Dexie('dict');
        return db.open().then(() => {
            db.close();
            if (db.verno !== this.dbVersion) {
                return db.delete();
            }
        }).catch(() => {});
    }

    prepare() {
        if (this.db !== null) {
            return Promise.reject('database already initialized');
        }

        return this.sanitize().then(() => {
            this.db = new Dexie('dict');
            this.db.version(this.dbVersion).stores({
                terms: '++id,dictionary,expression,reading',
                kanji: '++,dictionary,character',
                tagMeta: '++,dictionary',
                dictionaries: '++,title,version'
            });

            return this.db.open();
        });
    }

    purge() {
        if (this.db === null) {
            return Promise.reject('database not initialized');
        }

        this.db.close();
        return this.db.delete().then(() => {
            this.db = null;
            this.tagMetaCache = {};
            return this.prepare();
        });
    }

    findTerms(term, dictionaries) {
        if (this.db === null) {
            return Promise.reject('database not initialized');
        }

        const results = [];
        return this.db.terms.where('expression').equals(term).or('reading').equals(term).each(row => {
            if (dictionaries.includes(row.dictionary)) {
                results.push({
                    expression: row.expression,
                    reading: row.reading,
                    tags: dictFieldSplit(row.tags),
                    rules: dictFieldSplit(row.rules),
                    glossary: row.glossary,
                    score: row.score,
                    dictionary: row.dictionary,
                    id: row.id
                });
            }
        }).then(() => {
            return this.cacheTagMeta(dictionaries);
        }).then(() => {
            for (const result of results) {
                result.tagMeta = this.tagMetaCache[result.dictionary] || {};
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
                    onyomi: dictFieldSplit(row.onyomi),
                    kunyomi: dictFieldSplit(row.kunyomi),
                    tags: dictFieldSplit(row.tags),
                    glossary: row.meanings,
                    dictionary: row.dictionary
                });
            }
        }).then(() => {
            return this.cacheTagMeta(dictionaries);
        }).then(() => {
            for (const result of results) {
                result.tagMeta = this.tagMetaCache[result.dictionary] || {};
            }

            return results;
        });
    }

    cacheTagMeta(dictionaries) {
        if (this.db === null) {
            return Promise.reject('database not initialized');
        }

        const promises = [];
        for (const dictionary of dictionaries) {
            if (this.tagMetaCache[dictionary]) {
                continue;
            }

            const tagMeta = {};
            promises.push(
                this.db.tagMeta.where('dictionary').equals(dictionary).each(row => {
                    tagMeta[row.name] = {category: row.category, notes: row.notes, order: row.order};
                }).then(() => {
                    this.tagMetaCache[dictionary] = tagMeta;
                })
            );
        }

        return Promise.all(promises);
    }

    getDictionaries() {
        if (this.db === null) {
            return Promise.reject('database not initialized');
        }

        return this.db.dictionaries.toArray();
    }

    importDictionary(archive, callback) {
        if (this.db === null) {
            return Promise.reject('database not initialized');
        }

        let summary = null;
        const indexLoaded = (title, version, revision, tagMeta, hasTerms, hasKanji) => {
            summary = {title, version, revision, hasTerms, hasKanji};
            return this.db.dictionaries.where('title').equals(title).count().then(count => {
                if (count > 0) {
                    return Promise.reject(`dictionary "${title}" is already imported`);
                }

                return this.db.dictionaries.add({title, version, revision, hasTerms, hasKanji}).then(() => {
                    const rows = [];
                    for (const tag in tagMeta || {}) {
                        const meta = tagMeta[tag];
                        const row = dictTagSanitize({
                            name: tag,
                            category: meta.category,
                            notes: meta.notes,
                            order: meta.order,
                            dictionary: title
                        });

                        rows.push(row);
                    }

                    return this.db.tagMeta.bulkAdd(rows);
                });
            });
        };

        const termsLoaded = (title, entries, total, current) => {
            return this.db.transaction('rw', this.db.terms, function() {
                for (const [expression, reading, tags, rules, score, ...glossary] of entries) {
                    this.db.terms.add({
                        expression,
                        reading,
                        tags,
                        rules,
                        score,
                        glossary,
                        dictionary: title
                    });
                }
            }).then(() => {
                if (callback) {
                    callback(total, current);
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
                    callback(total, current);
                }
            });
        };

        return zipLoadDb(archive, indexLoaded, termsLoaded, kanjiLoaded).then(() => summary);
    }
}
