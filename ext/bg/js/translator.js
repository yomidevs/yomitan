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
        this.database = new Database();
        this.deinflector = new Deinflector();
    }

    prepare() {
        if (this.loaded) {
            return Promise.resolve();
        }

        const promises = [
            loadJsonInt('bg/data/rules.json'),
            loadJsonInt('bg/data/tags.json'),
            this.database.prepare()
        ];

        return Promise.all(promises).then(([rules, tags]) => {
            this.deinflector.setRules(rules);
            this.tagMeta = tags;
            this.loaded = true;
        });
    }

    findTerm(text, dictionaries, enableSoftKatakanaSearch) {
        return this.findTermGroups(text, dictionaries).then(groups => {
            const textHiragana = wanakana._katakanaToHiragana(text);
            if (text !== textHiragana && enableSoftKatakanaSearch) {
                return this.findTermGroups(textHiragana, dictionaries).then(groupsHiragana => {
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

    findKanji(text, dictionaries) {
        const processed = {};
        const promises = [];

        for (const c of text) {
            if (!processed[c]) {
                promises.push(this.database.findKanji(c, dictionaries));
                processed[c] = true;
            }
        }

        return Promise.all(promises).then(sets => this.processKanji(sets.reduce((a, b) => a.concat(b), [])));
    }

    findTermGroups(text, dictionaries) {
        const deinflectGroups = {};
        const deinflectPromises = [];

        for (let i = text.length; i > 0; --i) {
            deinflectPromises.push(
                this.deinflector.deinflect(text.slice(0, i), term => {
                    return this.database.findTerm(term, dictionaries).then(definitions => definitions.map(definition => definition.tags));
                }).then(deinflects => {
                    const processPromises = [];
                    for (const deinflect of deinflects) {
                        processPromises.push(this.processTerm(
                            deinflectGroups,
                            deinflect.source,
                            deinflect.tags,
                            deinflect.rules,
                            deinflect.root,
                            dictionaries
                        ));
                    }

                    return Promise.all(processPromises);
                })
            );
        }

        return Promise.all(deinflectPromises).then(() => deinflectGroups);
    }

    processTerm(groups, source, tags, rules, root, dictionaries) {
        return this.database.findTerm(root, dictionaries).then(definitions => {
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
