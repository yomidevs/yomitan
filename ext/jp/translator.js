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
        const groups = {}
        for (let i = text.length; i >= 0; --i) {
            const term = text.slice(0, i);

            const deinflections = this.deinflector.deinflect(term, this.validator);
            if (deinflections === null) {
                this.processTerm(groups, term);
            } else {
                for (const deinflection of deinflections) {
                    //fix
                    //this.processTerm(groups, **deinflection);
                }
            }

            const results = 
        }


        // text = util.sanitize(text, wildcards=wildcards)

        // groups = dict()
        // for i in xrange(len(text), 0, -1):
        //     term = text[:i]
        //     deinflections = self.deinflector.deinflect(term, self.validator)
        //     if deinflections is None:
        //         self.processTerm(groups, term, wildcards=wildcards)
        //     else:
        //         for deinflection in deinflections:
        //             self.processTerm(groups, **deinflection)

        // results = map(self.formatResult, groups.items())
        // results = filter(operator.truth, results)
        // results = sorted(results, key=lambda d: (len(d['source']), 'P' in d['tags'], -len(d['rules'])), reverse=True)

        // length = 0
        // for result in results:
        //     length = max(length, len(result['source']))

        // return results, length
    }

    findKanji(text) {
        // text = util.sanitize(text, kana=False)
        // results = list()

        // processed = dict()
        // for c in text:
        //     if c not in processed:
        //         match = self.dictionary.findCharacter(c)
        //         if match is not None:
        //             results.append(match)
        //         processed[c] = match

        // return results
    }

    processTerm(groups, source, rules=[], root='') {
        // root = root or source

        // for entry in self.dictionary.findTerm(root, wildcards):
        //     key = entry['expression'], entry['reading'], entry['glossary']
        //     if key not in groups:
        //         groups[key] = entry['tags'], source, rules
    }

    formatResult(group) {
        // root = root or source

        // for entry in self.dictionary.findTerm(root, wildcards):
        //     key = entry['expression'], entry['reading'], entry['glossary']
        //     if key not in groups:
        //         groups[key] = entry['tags'], source, rules
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
