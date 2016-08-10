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
        this.loaded = false;
        this.tagMeta = null;
        this.dictionary = new Dictionary();
        this.deinflector = new Deinflector();
    }

    loadData({loadEnamDict=true}, callback) {
        if (this.loaded) {
            callback();
            return;
        }

        Translator.loadData('bg/data/rules.json')
            .then((response) => {
                this.deinflector.setRules(JSON.parse(response));
                return Translator.loadData('bg/data/tags.json');
            })
            .then((response) => {
                this.tagMeta = JSON.parse(response);
                return Translator.loadData('bg/data/edict.json');
            })
            .then((response) => {
                this.dictionary.addTermDict('edict', JSON.parse(response));
                return Translator.loadData('bg/data/kanjidic.json');
            })
            .then((response) => {
                this.dictionary.addKanjiDict('kanjidic', JSON.parse(response));
                return loadEnamDict ? Translator.loadData('bg/data/enamdict.json') : Promise.resolve(null);
            })
            .then((response) => {
                if (response !== null) {
                    this.dictionary.addTermDict('enamdict', JSON.parse(response));
                }

                this.loaded = true;
                callback();
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
                continue;
            }

            for (const df of dfs) {
                this.processTerm(groups, df.source, df.tags, df.rules, df.root);
            }
        }

        let definitions = [];
        for (const key in groups) {
            definitions.push(groups[key]);
        }

        definitions = definitions.sort((v1, v2) => {
            const sl1 = v1.source.length;
            const sl2 = v2.source.length;
            if (sl1 > sl2) {
                return -1;
            } else if (sl1 < sl2) {
                return 1;
            }

            const p1 = v1.popular;
            const p2 = v2.popular;
            if (p1 && !p2) {
                return -1;
            } else if (!p1 && p2) {
                return 1;
            }

            const rl1 = v1.rules.length;
            const rl2 = v2.rules.length;
            if (rl1 < rl2) {
                return -1;
            } else if (rl1 > rl2) {
                return 1;
            }

            return v2.expression.localeCompare(v1.expression);
        });

        let length = 0;
        for (const result of definitions) {
            length = Math.max(length, result.source.length);
        }

        return {definitions: definitions, length: length};
    }

    findKanji(text) {
        let definitions = [];
        const processed = {};

        for (const c of text) {
            if (!processed[c]) {
                definitions = definitions.concat(this.dictionary.findKanji(c));
                processed[c] = true;
            }
        }

        return this.processKanji(definitions);
    }

    processTerm(groups, dfSource, dfTags, dfRules=[], dfRoot='') {
        for (const entry of this.dictionary.findTerm(dfRoot)) {
            if (entry.id in groups) {
                continue;
            }

            let matched = dfTags.length === 0;
            for (const t of dfTags) {
                if (entry.tags.indexOf(t) !== -1) {
                    matched = true;
                    break;
                }
            }

            if (!matched) {
                continue;
            }

            let popular = false;

            let tags = [];
            for (const t of entry.tags) {
                const tag = {class: 'default', order: Number.MAX_SAFE_INTEGER, desc: entry.entities[t] || '', name: t};
                this.applyTagMeta(tag);
                tags.push(tag);

                //
                // TODO: Handle tagging as popular through data.
                //

                if (t === 'P') {
                    popular = true;
                }
            }

            groups[entry.id] = {
                expression: entry.expression,
                reading:    entry.reading,
                glossary:   entry.glossary,
                tags:       Translator.sortTags(tags),
                source:     dfSource,
                rules:      dfRules,
                popular:    popular
            };
        }
    }

    processKanji(entries) {
        const processed = [];

        for (const entry of entries) {
            const tags = [];
            for (const t of entry.tags) {
                const tag = {class: 'default', order: Number.MAX_SAFE_INTEGER, desc: '', name: t};
                this.applyTagMeta(tag);
                tags.push(tag);
            }

            processed.push({
                character: entry.character,
                kunyomi:   entry.kunyomi,
                onyomi:    entry.onyomi,
                tags:      Translator.sortTags(tags),
                glossary:  entry.glossary
            });
        }

        return processed;
    }

    applyTagMeta(tag) {
        const symbol = tag.name.split(':')[0];
        for (const prop in this.tagMeta[symbol] || {}) {
            tag[prop] = this.tagMeta[symbol][prop];
        }
    }

    static sortTags(tags) {
        return tags.sort((v1, v2) => {
            const order1 = v1.order;
            const order2 = v2.order;
            if (order1 < order2) {
                return -1;
            } else if (order1 > order2) {
                return 1;
            }

            const name1 = v1.name;
            const name2 = v2.name;
            if (name1 < name2) {
                return -1;
            } else if (name1 > name2) {
                return 1;
            }

            return 0;
        });
    }

    static isKanji(c) {
        const code = c.charCodeAt(0);
        return code >= 0x4e00 && code < 0x9fb0 || code >= 0x3400 && code < 0x4dc0;
    }

    static loadData(url) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.addEventListener('load', () => resolve(xhr.responseText));
            xhr.open('GET', chrome.extension.getURL(url), true);
            xhr.send();
        });
    }
}
