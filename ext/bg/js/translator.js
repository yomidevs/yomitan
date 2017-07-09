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
            jsonLoadInt('/bg/lang/deinflect.json'),
            this.database.prepare()
        ];

        return Promise.all(promises).then(([reasons]) => {
            this.deinflector.setReasons(reasons);
            this.loaded = true;
        });
    }

    findTerms(text, dictionaries, alphanumeric) {
        const titles = Object.keys(dictionaries);
        const cache = {};

        if (!alphanumeric && text.length > 0) {
            const c = text[0];
            if (!jpIsKana(c) && !jpIsKanji(c)) {
                return Promise.resolve({length: 0, definitions: []});
            }
        }

        return this.findTermsDeinflected(text, titles, cache).then(deinfLiteral => {
            const textHiragana = jpKatakanaToHiragana(text);
            if (text === textHiragana) {
                return deinfLiteral;
            } else {
                return this.findTermsDeinflected(textHiragana, titles, cache).then(deinfHiragana => deinfLiteral.concat(deinfHiragana));
            }
        }).then(deinflections => {
            let definitions = [];
            for (const deinflection of deinflections) {
                for (const definition of deinflection.definitions) {
                    const tags = definition.tags.map(tag => dictTagBuild(tag, definition.tagMeta));
                    tags.push(dictTagBuildSource(definition.dictionary));
                    definitions.push({
                        source: deinflection.source,
                        reasons: deinflection.reasons,
                        score: definition.score,
                        id: definition.id,
                        dictionary: definition.dictionary,
                        expression: definition.expression,
                        reading: definition.reading,
                        glossary: definition.glossary,
                        tags: dictTagsSort(tags)
                    });
                }
            }

            definitions = dictTermsUndupe(definitions);
            definitions = dictTermsSort(definitions, dictionaries);

            let length = 0;
            for (const definition of definitions) {
                length = Math.max(length, definition.source.length);
            }

            return {length, definitions};
        });
    }

    findTermsGrouped(text, dictionaries, alphanumeric) {
        return this.findTerms(text, dictionaries, alphanumeric).then(({length, definitions}) => {
            return {length, definitions: dictTermsGroup(definitions, dictionaries)};
        });
    }

    findKanji(text, dictionaries) {
        const titles = Object.keys(dictionaries);
        const processed = {};
        const promises = [];

        for (const c of text) {
            if (!processed[c]) {
                promises.push(this.database.findKanji(c, titles));
                processed[c] = true;
            }
        }

        return Promise.all(promises).then(defSets => {
            const definitions = defSets.reduce((a, b) => a.concat(b), []);
            for (const definition of definitions) {
                const tags = definition.tags.map(tag => dictTagBuild(tag, definition.tagMeta));
                tags.push(dictTagBuildSource(definition.dictionary));
                definition.tags = dictTagsSort(tags);
            }

            return definitions;
        });
    }

    findTermsDeinflected(text, dictionaries, cache) {
        const definer = term => {
            if (cache.hasOwnProperty(term)) {
                return Promise.resolve(cache[term]);
            }

            return this.database.findTerms(term, dictionaries).then(definitions => cache[term] = definitions);
        };

        const promises = [];
        for (let i = text.length; i > 0; --i) {
            promises.push(this.deinflector.deinflect(text.slice(0, i), definer));
        }

        return Promise.all(promises).then(results => {
            let deinflections = [];
            for (const result of results) {
                deinflections = deinflections.concat(result);
            }

            return deinflections;
        });
    }

    processKanji(definitions) {
        for (const definition of definitions) {
            const tags = definition.tags.map(tag => dictTagBuild(tag, definition.tagMeta));
            definition.tags = dictTagsSort(tags);
        }

        return definitions;
    }
}
