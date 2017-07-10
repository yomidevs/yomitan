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
        this.version = 2;
        this.tagCache = {};
    }

    async sanitize() {
        try {
            const db = new Dexie('dict');
            await db.open();
            db.close();
            if (db.verno !== this.version) {
                await db.delete();
            }
        }
        catch(error) {
            // NOP
        }
    }

    async prepare() {
        if (this.db) {
            throw 'database already initialized';
        }

        await this.sanitize();

        this.db = new Dexie('dict');
        this.db.version(this.version).stores({
            terms: '++id,dictionary,expression,reading',
            kanji: '++,dictionary,character',
            tagMeta: '++,dictionary',
            dictionaries: '++,title,version'
        });

        await this.db.open();
    }

    async purge() {
        if (!this.db) {
            throw 'database not initialized';
        }

        this.db.close();
        await this.db.delete();
        this.db = null;
        this.tagCache = {};

        await this.prepare();
    }

    async findTerms(term, titles) {
        if (!this.db) {
            throw 'database not initialized';
        }

        const results = [];
        await this.db.terms.where('expression').equals(term).or('reading').equals(term).each(row => {
            if (titles.includes(row.dictionary)) {
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
        });

        await this.cacheTagMeta(titles);
        for (const result of results) {
            result.tagMeta = this.tagCache[result.dictionary] || {};
        }

        return results;
    }

    async findKanji(kanji, titles) {
        if (!this.db) {
            return Promise.reject('database not initialized');
        }

        const results = [];
        await this.db.kanji.where('character').equals(kanji).each(row => {
            if (titles.includes(row.dictionary)) {
                results.push({
                    character: row.character,
                    onyomi: dictFieldSplit(row.onyomi),
                    kunyomi: dictFieldSplit(row.kunyomi),
                    tags: dictFieldSplit(row.tags),
                    glossary: row.meanings,
                    dictionary: row.dictionary
                });
            }
        });

        await this.cacheTagMeta(titles);
        for (const result of results) {
            result.tagMeta = this.tagCache[result.dictionary] || {};
        }

        return results;
    }

    async cacheTagMeta(titles) {
        if (!this.db) {
            throw 'database not initialized';
        }

        for (const title of titles) {
            if (!this.tagCache[title]) {
                const tagMeta = {};
                await this.db.tagMeta.where('dictionary').equals(title).each(row => {
                    tagMeta[row.name] = {category: row.category, notes: row.notes, order: row.order};
                });

                this.tagCache[title] = tagMeta;
            }
        }
    }

    async getDictionaries() {
        if (this.db) {
            return this.db.dictionaries.toArray();
        } else {
            throw 'database not initialized';
        }
    }

    async importDictionary(archive, callback) {
        if (!this.db) {
            return Promise.reject('database not initialized');
        }

        let summary = null;
        const indexLoaded = async (title, version, revision, tagMeta, hasTerms, hasKanji) => {
            summary = {title, version, revision, hasTerms, hasKanji};

            const count = await this.db.dictionaries.where('title').equals(title).count();
            if (count > 0) {
                throw `dictionary "${title}" is already imported`;
            }

            await this.db.dictionaries.add({title, version, revision, hasTerms, hasKanji});

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

            await this.db.tagMeta.bulkAdd(rows);
        };

        const termsLoaded = async (title, entries, total, current) => {
            if (callback) {
                callback(total, current);
            }

            const rows = [];
            for (const [expression, reading, tags, rules, score, ...glossary] of entries) {
                rows.push({
                    expression,
                    reading,
                    tags,
                    rules,
                    score,
                    glossary,
                    dictionary: title
                });
            }

            await this.db.terms.bulkAdd(rows);
        };

        const kanjiLoaded = async (title, entries, total, current)  => {
            if (callback) {
                callback(total, current);
            }

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

            await this.db.kanji.bulkAdd(rows);
        };

        await Database.importDictionaryZip(archive, indexLoaded, termsLoaded, kanjiLoaded);
        return summary;
    }

    static async importDictionaryZip(archive, indexLoaded, termsLoaded, kanjiLoaded) {
        const files = (await JSZip.loadAsync(archive)).files;

        const indexFile = files['index.json'];
        if (!indexFile) {
            throw 'no dictionary index found in archive';
        }

        const index = JSON.parse(await indexFile.async('string'));
        if (!index.title || !index.version || !index.revision) {
            throw 'unrecognized dictionary format';
        }

        await indexLoaded(
            index.title,
            index.version,
            index.revision,
            index.tagMeta || {},
            index.termBanks > 0,
            index.kanjiBanks > 0
        );

        const banksTotal = index.termBanks + index.kanjiBanks;
        let banksLoaded = 0;

        for (let i = 1; i <= index.termBanks; ++i) {
            const bankFile = files[`term_bank_${i}.json`];
            if (bankFile) {
                const bank = JSON.parse(await bankFile.async('string'));
                await termsLoaded(index.title, bank, banksTotal, banksLoaded++);
            } else {
                throw 'missing term bank file';
            }
        }

        for (let i = 1; i <= index.kanjiBanks; ++i) {
            const bankFile = files[`kanji_bank_${i}.json`];
            if (bankFile) {
                const bank = JSON.parse(await bankFile.async('string'));
                await kanjiLoaded(index.title, bank, banksTotal, banksLoaded++);
            } else {
                throw 'missing kanji bank file';
            }
        }
    }
}
