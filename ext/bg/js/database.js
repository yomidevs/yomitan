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
        this.tagMetaCache = {};
    }

    prepare() {
        if (this.db !== null) {
            return Promise.reject('database already initialized');
        }

        this.db = new Dexie('dict');
        this.db.version(1).stores({
            terms: '++id, dictionary, expression, reading',
            kanji: '++, dictionary, character',
            tagMeta: '++, dictionary',
            dictionaries: '++, title, version',
        });

        return this.db.open();
    }

    purge() {
        if (this.db === null) {
            return Promise.reject('database not initialized');
        }

        this.db.close();
        return this.db.delete().then(() => {
            this.db = null;
            this.prepare();
        });
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
            return this.getTagMeta(dictionaries);
        }).then(tagMeta => {
            for (const result of results) {
                result.tagMeta = tagMeta;
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
            return this.getTagMeta(dictionaries);
        }).then(tagMeta => {
            for (const result of results) {
                result.tagMeta = tagMeta;
            }

            return results;
        });
    }

    getTagMeta(dictionaries) {
        if (this.db === null) {
            return Promise.reject('database not initialized');
        }

        const promises = [];
        for (const dictionary of dictionaries) {
            if (this.tagMetaCache[dictionary]) {
                continue;
            }

            const tagMeta = this.tagMetaCache[dictionary] = {};
            promises.push(
                this.db.tagMeta.where('dictionary').equals(dictionary).each(row => {
                    tagMeta[row.tag] = {
                        category: row.category,
                        notes: row.notes,
                        order: row.order
                    };
                })
            );
        }

        return Promise.all(promises).then(() => this.tagMetaCache);
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
                const rowLimit = 500;
                const totalCount = termCount + kanjiCount;
                let deletedCount = 0;

                let termDeleter = Promise.resolve();
                if (info.hasTerms) {
                    const termDeleterFunc = () => {
                        return this.db.terms.where('dictionary').equals(title).limit(rowLimit).delete().then(count => {
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
                        return this.db.kanji.where('dictionary').equals(title).limit(rowLimit).delete().then(count => {
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
            return this.db.tagMeta.where('dictionary').equals(title).delete();
        }).then(() => {
            return this.db.dictionaries.where('title').equals(title).delete();
        });
    }

    importDictionary(indexUrl, callback) {
        if (this.db === null) {
            return Promise.reject('database not initialized');
        }

        let summary = null;
        const indexLoaded = (title, version, tagMeta, hasTerms, hasKanji) => {
            summary = {title, hasTerms, hasKanji, version};
            return this.db.dictionaries.where('title').equals(title).count().then(count => {
                if (count > 0) {
                    return Promise.reject(`dictionary "${title}" is already imported`);
                }

                return this.db.dictionaries.add({title, version, hasTerms, hasKanji}).then(() => {
                    const rows = [];
                    for (const tag in tagMeta || {}) {
                        const meta = tagMeta[tag];
                        rows.push({
                            tag,
                            category: meta.category,
                            notes: meta.notes,
                            order: meta.order,
                            dictionary: title
                        });
                    }

                    return this.db.tagMeta.bulkAdd(rows);
                });
            });
        };

        const termsLoaded = (title, entries, total, current) => {
            const rows = [];
            for (const [expression, reading, tags, rules, score, ...glossary] of entries) {
                rows.push({
                    expression,
                    reading,
                    tags,
                    rules,
                    glossary,
                    score: parseInt(score),
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

        return importJsonDb(indexUrl, indexLoaded, termsLoaded, kanjiLoaded).then(() => summary);
    }
}
