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
            loadJsonInt('bg/lang/deinflect.json'),
            this.database.prepare()
        ];

        return Promise.all(promises).then(([reasons]) => {
            this.deinflector.setReasons(reasons);
            this.loaded = true;
        });
    }

    findTerm(text, dictionaries, enableSoftKatakanaSearch) {
        const cache = {};
        return this.findTermDeinflections(text, dictionaries, cache).then(deinfHiragana => {
            const textHiragana = wanakana._katakanaToHiragana(text);
            if (text !== textHiragana && enableSoftKatakanaSearch) {
                return this.findTermDeinflections(textHiragana, dictionaries, cache).then(deinfHiragana => deinfHiragana.concat(deinfHiragana));
            } else {
                return deinfHiragana;
            }
        }).then(deinflections => {
            let definitions = [];
            for (const deinflection of deinflections) {
                for (const definition of deinflection.definitions) {
                    definitions.push({
                        source: deinflection.source,
                        reasons: deinflection.reasons,
                        score: definition.score,
                        id: definition.id,
                        dictionary: definition.dictionary,
                        expression: definition.expression,
                        reading: definition.reading,
                        glossary: definition.glossary,
                        tags: sortTags(definition.tags.map(tag => buildTag(tag, definition.tagMeta)))
                    });
                }
            }

            definitions = undupeTermDefs(definitions);
            definitions = sortTermDefs(definitions);

            let length = 0;
            for (const definition of definitions) {
                length = Math.max(length, definition.source.length);
            }

            return {length, definitions};
        });
    }

    findKanji(text, dictionaries) {
        const processed = {}, promises = [];
        for (const c of text) {
            if (!processed[c]) {
                promises.push(this.database.findKanji(c, dictionaries));
                processed[c] = true;
            }
        }

        return Promise.all(promises).then(sets => this.processKanji(sets.reduce((a, b) => a.concat(b), [])));
    }

    findTermDeinflections(text, dictionaries, cache) {
        const definer = term => {
            if (cache.hasOwnProperty(term)) {
                return Promise.resolve(cache[term]);
            }

            return this.database.findTerm(term, dictionaries).then(definitions => cache[term] = definitions);
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
            const tags = definition.tags.map(tag => buildTag(tag, definition.tagMeta));
            definition.tags = sortTags(tags);
        }

        return definitions;
    }
}
