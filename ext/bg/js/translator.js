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
        this.paths = {
            rules:    'bg/data/rules.json',
            tags:     'bg/data/tags.json',
            edict:    'bg/data/edict.json',
            enamdict: 'bg/data/enamdict.json',
            kanjidic: 'bg/data/kanjidic.json'
        };

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

        let files = ['rules', 'tags', 'edict', 'kanjidic'];
        if (loadEnamDict) {
            files = files.concat('enamdict');
        }

        const pendingLoads = [];
        for (let key of files) {
            pendingLoads.push(key);
            Translator.loadData(this.paths[key], (response) => {
                switch (key) {
                    case 'rules':
                        this.deinflector.setRules(JSON.parse(response));
                        break;
                    case 'tags':
                        this.tagMeta = JSON.parse(response);
                        break;
                    case 'kanjidic':
                        this.dictionary.addKanjiDict(key, JSON.parse(response));
                        break;
                    case 'edict':
                    case 'enamdict':
                        this.dictionary.addTermDict(key, JSON.parse(response));
                        break;
                }

                pendingLoads.splice(pendingLoads.indexOf(key), 1);
                if (pendingLoads.length === 0) {
                    this.loaded = true;
                    callback();
                }
            });
        }
    }

    findTerm(text) {
        const groups = {};
        for (let i = text.length; i > 0; --i) {
            const term = text.slice(0, i);

            const dfs = this.deinflector.deinflect(term, t => {
                const tags = [];
                for (let d of this.dictionary.findTerm(t)) {
                    tags.push(d.tags);
                }

                return tags;
            });

            if (dfs === null) {
                continue;
            }

            for (let df of dfs) {
                this.processTerm(groups, df.source, df.tags, df.rules, df.root);
            }
        }

        let definitions = [];
        for (let key in groups) {
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
        for (let result of definitions) {
            length = Math.max(length, result.source.length);
        }

        return {definitions: definitions, length: length};
    }

    findKanji(text) {
        let definitions = [];
        const processed = {};

        for (let c of text) {
            if (!processed[c]) {
                definitions = definitions.concat(this.dictionary.findKanji(c));
                processed[c] = true;
            }
        }

        return definitions;
    }

    processTerm(groups, source, tags, rules=[], root='') {
        for (let entry of this.dictionary.findTerm(root)) {
            if (entry.id in groups) {
                continue;
            }

            let matched = tags.length == 0;
            for (let tag of tags) {
                if (entry.tags.indexOf(tag) !== -1) {
                    matched = true;
                    break;
                }
            }

            let popular = false;
            let tagItems = [];
            for (let tag of entry.tags) {
                const tagItem = {
                    class: 'default',
                    order: Number.MAX_SAFE_INTEGER,
                    desc:  entry.entities[tag] || '',
                    name:  tag
                };

                const tagMeta = this.tagMeta[tag];
                if (tagMeta) {
                    for (const tagProp in tagMeta) {
                        tagItem[tagProp] = tagMeta[tagProp] || tagItem[tagProp];
                    }
                }

                tagItems.push(tagItem);

                //
                // TODO: Handle tagging as popular through data.
                //

                if (tag === 'P') {
                    popular = true;
                }
            }

            tagItems = tagItems.sort((v1, v2) => {
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

            if (matched) {
                groups[entry.id] = {
                    expression: entry.expression,
                    reading:    entry.reading,
                    glossary:   entry.glossary,
                    tags:       tagItems,
                    source:     source,
                    rules:      rules,
                    popular:    popular
                };
            }
        }
    }

    static isKanji(c) {
        const code = c.charCodeAt(0);
        return code >= 0x4e00 && code < 0x9fb0 || code >= 0x3400 && code < 0x4dc0;
    }

    static loadData(url, callback) {
        const xhr = new XMLHttpRequest();
        xhr.addEventListener('load', () => callback(xhr.responseText));
        xhr.open('GET', chrome.extension.getURL(url), true);
        xhr.send();
    }
}
