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
            tagMeta:      '++,dictionary,name'
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

        return results;
    }

    async findTermFreq(term, titles) {
        if (!this.db) {
            throw 'database not initialized';
        }

        const results = [];
        await this.db.termFreq.where('expression').equals(term).each(row => {
            if (titles.includes(row.dictionary)) {
                results.push({frequency: row.frequency, dictionary: row.dictionary});
            }
        });

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

        return results;
    }

    async findKanjiFreq(kanji, titles) {
        if (!this.db) {
            throw 'database not initialized';
        }

        const results = [];
        await this.db.kanjiFreq.where('character').equals(kanji).each(row => {
            if (titles.includes(row.dictionary)) {
                results.push({frequency: row.frequency, dictionary: row.dictionary});
            }
        });

        return results;
    }

    async findTagForTitle(name, title) {
        if (!this.db) {
            throw 'database not initialized';
        }

        this.tagCache[title] = this.tagCache[title] || {};

        let result = this.tagCache[title][name];
        if (!result) {
            await this.db.tagMeta.where('name').equals(name).each(row => {
                if (title === row.dictionary) {
                    result = row;
                }
            });

            this.tagCache[title][name] = result;
        }

        return result;
    }

    async getTitles() {
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

        const indexDataLoaded = async summary => {
            const count = await this.db.dictionaries.where('title').equals(summary.title).count();
            if (count > 0) {
                throw `dictionary "${summary.title}" is already imported`;
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

        const termFreqDataLoaded = async (title, entries, total, current) => {
            if (callback) {
                callback(total, current);
            }

            const rows = [];
            for (const [expression, frequency] of entries) {
                rows.push({
                    expression,
                    frequency,
                    dictionary: title
                });
            }

            await this.db.termFreq.bulkAdd(rows);
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

        const kanjiFreqDataLoaded = async (title, entries, total, current) => {
            if (callback) {
                callback(total, current);
            }

            const rows = [];
            for (const [character, frequency] of entries) {
                rows.push({
                    character,
                    frequency,
                    dictionary: title
                });
            }

            await this.db.kanjiFreq.bulkAdd(rows);
        };

        const tagDataLoaded = async (title, entries, total, current) => {
            if (callback) {
                callback(total, current);
            }

            const rows = [];
            for (const [name, category, order, notes] of entries) {
                const row = dictTagSanitize({
                    name,
                    category,
                    order,
                    notes,
                    dictionary: title
                });

                rows.push(row);
            }

            await this.db.tagMeta.bulkAdd(rows);
        };

        return await Database.importDictionaryZip(
            archive,
            indexDataLoaded,
            termDataLoaded,
            termFreqDataLoaded,
            kanjiDataLoaded,
            kanjiFreqDataLoaded,
            tagDataLoaded
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
        const zip = await JSZip.loadAsync(archive);

        const indexFile = zip.files['index.json'];
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

        const buildTermBankName      = index => `term_bank_${index + 1}.json`;
        const buildTermFreqBankName  = index => `termfreq_bank_${index + 1}.json`;
        const buildKanjiBankName     = index => `kanji_bank_${index + 1}.json`;
        const buildKanjiFreqBankName = index => `kanjifreq_bank_${index + 1}.json`;
        const buildTagBankName       = index => `tag_bank_${index + 1}.json`;

        const countBanks = namer => {
            let count = 0;
            while (zip.files[namer(count)]) {
                ++count;
            }

            return count;
        };

        const termBankCount      = countBanks(buildTermBankName);
        const termFreqBankCount  = countBanks(buildTermFreqBankName);
        const kanjiBankCount     = countBanks(buildKanjiBankName);
        const kanjiFreqBankCount = countBanks(buildKanjiFreqBankName);
        const tagBankCount       = countBanks(buildTagBankName);

        let bankLoadedCount = 0;
        let bankTotalCount =
            termBankCount +
            termFreqBankCount +
            kanjiBankCount +
            kanjiFreqBankCount +
            tagBankCount;

        if (tagDataLoaded && index.tagMeta) {
            const bank = [];
            for (const name in index.tagMeta) {
                const tag = index.tagMeta[name];
                bank.push([name, tag.category, tag.order, tag.notes]);
            }

            tagDataLoaded(index.title, bank, ++bankTotalCount, bankLoadedCount++);
        }

        const loadBank = async (namer, count, callback) => {
            if (callback) {
                for (let i = 0; i < count; ++i) {
                    const bankFile = zip.files[namer(i)];
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
