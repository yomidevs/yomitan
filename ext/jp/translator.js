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
    constructor() {
        this.dictionary  = new Dictionary();
        this.deinflector = new Deinflector();
        this.initialized = false;
    }

    initialize(paths, callback) {
        if (this.initialized) {
            return;
        }

        const loaders = [];
        for (const key of ['rules', 'edict', 'enamdict', 'kanjidic']) {
            loaders.push(
                $.getJSON(chrome.extension.getURL(paths[key]))
            );
        }

        $.when.apply($, loaders).done((rules, edict, enamdict, kanjidic) => {
            this.deinflector.setRules(rules);

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
        for (let i = text.length; i >= 0; --i) {
            const term = text.slice(0, i);

            const dfs = this.deinflector.deinflect(term, this.validator);
            if (dfs === null) {
                this.processTerm(groups, term);
            } else {
                for (const df of dfs) {
                    this.processTerm(groups, df.source, df.rules, df.root);
                }
            }

            const results = formatResults(groups).sort(resultSorter);

            let length = 0;
            for (const result of results) {
                length = Math.max(length, result.source.length);
            }

            return {results: results, length: length};
        }
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
        root = root || source;

        // for (const entry of this.dictionary.findTerm(root)) {
        //     const key = 

        // }

        // root = root or source

        // for entry in self.dictionary.findTerm(root, wildcards):
        //     key = entry['expression'], entry['reading'], entry['glossary']
        //     if key not in groups:
        //         groups[key] = entry['tags'], source, rules
    }

    formatResult(group) {
        const results = [];
        for (const [key, value] of groups) {
            [expression, reading, glossary] = key;
            [tags, source, rules]           = group;

            results.push({
                expression: expression,
                reading:    reading,
                glossary:   glossary,
                rules:      rules,
                source:     source,
                tags:       tags
            });
        }

        return results;
    }

    resultSorter(v1, v2) {
        const sl1 = v1.source.length;
        const sl2 = v2.source.length;

        if (sl1 > sl2) {
            return -1;
        } else if (sl1 > sl2) {
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

    validator(term) {
        // return [d['tags'] for d in self.dictionary.findTerm(term)]
    }
}

const trans = new Translator();

trans.initialize({
    rules:    'jp/data/rules.json',
    edict:    'jp/data/edict.json',
    enamdict: 'jp/data/enamdict.json',
    kanjidic: 'jp/data/kanjidic.json'
}, function() {
    // alert('Loaded');
    // alert(trans.dictionary.findTerm('猫'));
});
