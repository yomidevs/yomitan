/*
 * Copyright (C) 2016-2017  Alex Yatskov <alex@foosoft.net>
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

    async prepare() {
        if (this.db) {
            throw 'database already initialized';
        }

        this.db = new Dexie('dict');
        this.db.version(2).stores({
            terms:        '++id,dictionary,expression,reading',
            kanji:        '++,dictionary,character',
            tagMeta:      '++,dictionary',
            dictionaries: '++,title,version'
        });
        this.db.version(3).stores({
            termFreq:     '++,dictionary,expression',
            kanjiFreq:    '++,dictionary,character',
            tagMeta:      '++,dictionary'
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

        // const rows = [];
        // for (const tag in tagMeta || {}) {
        //     const meta = tagMeta[tag];
        //     const row = dictTagSanitize({
        //         name: tag,
        //         category: meta.category,
        //         notes: meta.notes,
        //         order: meta.order,
        //         dictionary: title
        //     });

        //     rows.push(row);
        // }

        // await this.db.tagMeta.bulkAdd(rows);

        const indexDataLoaded = async summary => {
            const count = await this.db.dictionaries.where('title').equals(summary.title).count();
            if (count > 0) {
                throw `dictionary "${title}" is already imported`;
            }

            await this.db.dictionaries.add(summary);
        };

        const termDataLoaded = async (title, entries, total, current) => {
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

        const kanjiDataLoaded = async (title, entries, total, current)  => {
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

        return await Database.importDictionaryZip(
            archive,
            indexDataLoaded,
            termDataLoaded,
            null,
            kanjiDataLoaded,
            null,
            null
        );
    }

    static async importDictionaryZip(
        archive,
        indexDataLoaded,
        termDataLoaded,
        termFreqDataLoaded,
        kanjiDataLoaded,
        kanjiFreqDataLoaded,
        tagDataLoaded
    ) {
        const files = (await JSZip.loadAsync(archive)).files;

        const indexFile = files['index.json'];
        if (!indexFile) {
            throw 'no dictionary index found in archive';
        }

        const index = JSON.parse(await indexFile.async('string'));
        if (!index.title || !index.version || !index.revision) {
            throw 'unrecognized dictionary format';
        }

        const summary = {title: index.title, version: index.version, revision: index.revision};
        if (indexDataLoaded) {
            await indexDataLoaded(summary);
        }

        if (tagDataLoaded && index.tagMeta) {
            const tags = [];
            for (const name of index.tagMeta) {
                const tag = index.tagMeta;
                tags.push([name, tag.category, tag.order, tag.notes]);
            }

            tagDataLoaded(tags);
        }

        const buildTermBankName      = index => `term_bank_${index + 1}.json`;
        const buildTermFreqBankName  = index => `termfreq_bank_${index + 1}.json`;
        const buildKanjiBankName     = index => `kanji_bank_${index + 1}.json`;
        const buildKanjiFreqBankName = index => `kanjifreq_bank_${index + 1}.json`;
        const buildTagBankName       = index => `tag_bank_${index + 1}.json`;

        const countBanks = namer => {
            let count = 0;
            while (files[namer(count)]) {
                ++count;
            }

            return count;
        };

        const termBankCount      = countBanks(buildTermBankName);
        const kanjiBankCount     = countBanks(buildTermBankName);
        const termFreqBankCount  = countBanks(buildTermBankName);
        const kanjiFreqBankCount = countBanks(buildTermBankName);
        const tagBankCount       = countBanks(buildTermBankName);

        let bankLoadedCount = 0;
        const bankTotalCount =
            termBankCount +
            hanjiBankCount +
            termFreqBankCount +
            kanjiFreqBankCount +
            tagBankCount;

        const loadBank = async (namer, count, callback) => {
            if (callback) {
                for (let i = 0; i < count; ++i) {
                    const bankFile = namer(i);
                    const bank = JSON.parse(await bankFile.async('string'));
                    await callback(index.title, bank, bankTotalCount, bankLoadedCount++);
                }
            }
        };

        await loadBank(buildTermBankName, termBankCount, termDataLoaded);
        await loadBank(buildTermFreqBankName, termFreqBankCount, termFreqDataLoaded);
        await loadBank(buildKanjiBankName, kanjiBankCount, kanjiDataLoaded);
        await loadBank(buildKanjiFreqBankName, kanjiFreqBankCount, kanjiFreqDataLoaded);
        await loadBank(buildTagBankName, tagBankCount, tagDataLoaded);

        return summary;
    }
}
