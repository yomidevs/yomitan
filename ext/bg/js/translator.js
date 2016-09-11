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

    loadData() {
        if (this.loaded) {
            return Promise.resolve();
        }

        return loadJson('bg/data/rules.json').then(rules => {
            this.deinflector.setRules(rules);
            return loadJson('bg/data/tags.json');
        }).then(tagMeta => {
            this.tagMeta = tagMeta;
            return this.dictionary.existsDb();
        }).then(exists => {
            this.dictionary.initDb();
            if (!exists) {
                return Promise.all([
                    this.dictionary.importKanjiDict('bg/data/kanjidic/index.json'),
                    this.dictionary.importTermDict('bg/data/edict/index.json'),
                    this.dictionary.importTermDict('bg/data/enamdict/index.json')
                ]);
            }
        }).then(() => {
            this.loaded = true;
        });
    }

    findTermGroups(text) {
        const deinflectGroups = {};
        const deinflectPromises = [];

        for (let i = text.length; i > 0; --i) {
            deinflectPromises.push(
                this.deinflector.deinflect(text.slice(0, i), term => {
                    return this.dictionary.findTerm(term).then(definitions => definitions.map(definition => definition.tags));
                }).then(deinflects => {
                    const processPromises = [];
                    for (const deinflect of deinflects) {
                        processPromises.push(this.processTerm(
                            deinflectGroups,
                            deinflect.source,
                            deinflect.tags,
                            deinflect.rules,
                            deinflect.root
                        ));
                    }

                    return Promise.all(processPromises);
                })
            );
        }

        return Promise.all(deinflectPromises).then(() => deinflectGroups);
    }

    findTerm(text) {
        return this.findTermGroups(text).then(deinflectGroups => {
            let definitions = [];
            for (const key in deinflectGroups) {
                definitions.push(deinflectGroups[key]);
            }

            definitions = definitions.sort((v1, v2) => {
                const sl1 = v1.source.length;
                const sl2 = v2.source.length;
                if (sl1 > sl2) {
                    return -1;
                } else if (sl1 < sl2) {
                    return 1;
                }

                const s1 = v1.score;
                const s2 = v2.score;
                if (s1 > s2) {
                    return -1;
                } else if (s1 < s2) {
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

            return {definitions, length};
        });
    }

    findKanji(text) {
        const processed = {};
        const promises = [];

        for (const c of text) {
            if (!processed[c]) {
                promises.push(this.dictionary.findKanji(c).then((definitions) => definitions));
                processed[c] = true;
            }
        }

        return Promise.all(promises).then(sets => this.processKanji(sets.reduce((a, b) => a.concat(b))));
    }

    processTerm(groups, source, tags, rules, root) {
        return this.dictionary.findTerm(root).then(definitions => {
            for (const definition of definitions) {
                if (definition.id in groups) {
                    continue;
                }

                let matched = tags.length === 0;
                for (const tag of tags) {
                    if (definition.tags.includes(tag)) {
                        matched = true;
                        break;
                    }
                }

                if (!matched) {
                    continue;
                }

                const tagItems = [];
                for (const tag of definition.tags) {
                    const tagItem = {
                        name: tag,
                        class: 'default',
                        order: Number.MAX_SAFE_INTEGER,
                        score: 0,
                        desc: definition.entities[tag] || '',
                    };

                    this.applyTagMeta(tagItem);
                    tagItems.push(tagItem);
                }

                let score = 0;
                for (const tagItem of tagItems) {
                    score += tagItem.score;
                }

                groups[definition.id] = {
                    score,
                    source,
                    rules,
                    expression: definition.expression,
                    reading: definition.reading,
                    glossary: definition.glossary,
                    tags: Translator.sortTags(tagItems)
                };
            }
        });
    }

    processKanji(definitions) {
        for (const definition of definitions) {
            const tagItems = [];
            for (const tag of definition.tags) {
                const tagItem = {
                    name: tag,
                    class: 'default',
                    order: Number.MAX_SAFE_INTEGER,
                    desc: '',
                };

                this.applyTagMeta(tagItem);
                tagItems.push(tagItem);
            }

            definition.tags = Translator.sortTags(tagItems);
        }

        return definitions;
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
}
