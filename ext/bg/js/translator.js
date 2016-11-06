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

    loadData(callback) {
        if (this.loaded) {
            return Promise.resolve();
        }

        return loadJson('bg/data/rules.json').then(rules => {
            this.deinflector.setRules(rules);
            return loadJson('bg/data/tags.json');
        }).then(tagMeta => {
            this.tagMeta = tagMeta;
            return this.dictionary.prepareDb();
        }).then(exists => {
            if (exists) {
                return;
            }

            if (callback) {
                callback({state: 'begin', progress: 0});
            }

            const banks = {};
            const bankCallback = (total, loaded, indexUrl) => {
                banks[indexUrl] = {loaded, total};

                let percent = 0.0;
                for (const url in banks) {
                    percent += banks[url].loaded / banks[url].total;
                }

                percent /= 3.0;

                if (callback) {
                    callback({state: 'update', progress: Math.ceil(100.0 * percent)});
                }
            };

            return Promise.all([
                this.dictionary.importDb('bg/data/edict/index.json', bankCallback),
                this.dictionary.importDb('bg/data/enamdict/index.json', bankCallback),
                this.dictionary.importDb('bg/data/kanjidic/index.json', bankCallback),
            ]).then(() => {
                return this.dictionary.sealDb();
            }).then(() => {
                if (callback) {
                    callback({state: 'end', progress: 100.0});
                }
            });
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

    findTerm(text, enableSoftKatakanaSearch) {
        return this.findTermGroups(text).then(groups => {
            const textHiragana = wanakana._katakanaToHiragana(text);
            if (text !== textHiragana && enableSoftKatakanaSearch) {
                return this.findTermGroups(textHiragana).then(groupsHiragana => {
                    for (const key in groupsHiragana) {
                        groups[key] = groups[key] || groupsHiragana[key];
                    }

                    return groups;
                });
            } else {
                return groups;
            }
        }).then(groups => {
            const definitions = [];
            for (const key in groups) {
                definitions.push(groups[key]);
            }

            let length = 0;
            for (const result of definitions) {
                length = Math.max(length, result.source.length);
            }

            return {
                length,
                definitions: sortTermDefs(definitions)
            };
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

        return Promise.all(promises).then(sets => this.processKanji(sets.reduce((a, b) => a.concat(b), [])));
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

                    applyTagMeta(tagItem, this.tagMeta);
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
                    tags: sortTags(tagItems)
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

                applyTagMeta(tagItem, this.tagMeta);
                tagItems.push(tagItem);
            }

            definition.tags = sortTags(tagItems);
        }

        return definitions;
    }
}
