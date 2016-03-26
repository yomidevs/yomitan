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


class Translator {
    constructor(paths, callback) {
        this.dictionary  = new Dictionary();
        this.deinflector = new Deinflector();

        const loaders = [];
        for (const key of ['rules', 'edict', 'enamdict', 'kanjidic']) {
            loaders.push(
                $.getJSON(chrome.extension.getURL(paths[key]))
            );
        }

        $.when.apply($, loaders).done((rules, edict, enamdict, kanjidic) => {
            this.deinflector.setRules(rules[0]);

            this.dictionary.addTermDict(edict[0]);
            this.dictionary.addTermDict(enamdict[0]);
            this.dictionary.addKanjiDict(kanjidic[0]);

            this.initialized = true;

            if (callback) {
                callback();
            }
        });
    }

    findTerm(text) {
        const groups = {};
        for (let i = text.length; i > 0; --i) {
            const term = text.slice(0, i);

            const dfs = this.deinflector.deinflect(term, t => {
                const tags = [];
                for (const d of this.dictionary.findTerm(t)) {
                    tags.push(d.tags);
                }

                return tags;
            });

            if (dfs === null) {
                this.processTerm(groups, term);
            } else {
                for (const df of dfs) {
                    this.processTerm(groups, df.source, df.rules, df.root);
                }
            }
        }

        let results = [];
        for (const key in groups) {
            results.push(groups[key]);
        }

        results = results.sort(this.resultSorter);

        let length = 0;
        for (const result of results) {
            length = Math.max(length, result.source.length);
        }

        return {results: results, length: length};
    }

    findKanji(text) {
        let results = [];

        const processed = {};
        for (const c of text) {
            if (!processed.has(c)) {
                results = results.concat(this.dictionary.findKanji(c));
                processed[c] = true;
            }
        }

        return results;
    }

    processTerm(groups, source, rules=[], root='') {
        for (const entry of this.dictionary.findTerm(root || source)) {
            if (entry.id in groups) {
                continue;
            }

            groups[entry.id] = {
                expression: entry.expression,
                reading:    entry.reading,
                glossary:   entry.glossary,
                tags:       entry.tags,
                source:     source,
                rules:      rules
            };
        }
    }

    resultSorter(v1, v2) {
        const sl1 = v1.source.length;
        const sl2 = v2.source.length;
        if (sl1 > sl2) {
            return -1;
        } else if (sl1 < sl2) {
            return 1;
        }

        const p1 = v1.tags.indexOf('P') >= 0;
        const p2 = v2.tags.indexOf('P') >= 0;
        if (p1 && !p2) {
            return -1;
        } else if (!p1 && p2) {
            return 1;
        }

        const rl1 = v1.rules.length;
        const rl2 = v2.rules.length;
        if (rl1 < rl2) {
            return -1;
        } else if (rl2 > rl1) {
            return 1;
        }

        return 0;
    }
}
