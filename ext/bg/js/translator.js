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
        this.ruleMeta = null;
        this.database = new Database();
        this.deinflector = new Deinflector();
    }

    prepare() {
        if (this.loaded) {
            return Promise.resolve();
        }

        const promises = [
            loadJsonInt('bg/data/deinflect.json'),
            this.database.prepare()
        ];

        return Promise.all(promises).then(([reasons]) => {
            this.deinflector.setReasons(reasons);
            this.loaded = true;
        });
    }

    findTerm(text, dictionaries, enableSoftKatakanaSearch) {
        return this.findDeinflectionGroups(text, dictionaries).then(groups => {
            const textHiragana = wanakana._katakanaToHiragana(text);
            if (text !== textHiragana && enableSoftKatakanaSearch) {
                return this.findDeinflectionGroups(textHiragana, dictionaries).then(groupsHiragana => {
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

    findDeinflectionGroups(text, dictionaries) {
        const definer = term => this.database.findTerm(term, dictionaries);
        const groups = {};
        const promises = [];

        for (let i = text.length; i > 0; --i) {
            promises.push(
                this.deinflector.deinflect(text.slice(0, i), definer).then(deinflections => {
                    for (const deinflection of deinflections) {
                        this.processDeinflection(groups, deinflection);
                    }
                })
            );
        }

        return Promise.all(promises).then(() => groups);
    }

    processDeinflection(groups, {source, rules, reasons, definitions}, dictionaries) {
        for (const definition of definitions) {
            if (definition.id in groups) {
                continue;
            }

            const tags = definition.tags.map(tag => buildTag(tag, definition.tagMeta));
            groups[definition.id] = {
                source,
                reasons,
                score: definition.score,
                dictionary: definition.dictionary,
                expression: definition.expression,
                reading: definition.reading,
                glossary: definition.glossary,
                tags: sortTags(tags)
            };
        }
    }

    processKanji(definitions) {
        for (const definition of definitions) {
            const tags = definition.tags.map(tag => buildTag(tag, definition.tagMeta));
            definition.tags = sortTags(tags);
        }

        return definitions;
    }
}
