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
        this.database = null;
        this.deinflector = null;
    }

    async prepare() {
        if (!this.database) {
            this.database = new Database();
            await this.database.prepare();
        }

        if (!this.deinflector) {
            const url = chrome.extension.getURL('/bg/lang/deinflect.json');
            const reasons = await Translator.loadRules(url);
            this.deinflector = new Deinflector(reasons);
        }
    }

    async findTermsGrouped(text, dictionaries, alphanumeric) {
        const {length, definitions} = await this.findTerms(text, dictionaries, alphanumeric);
        return {length, definitions: dictTermsGroup(definitions, dictionaries)};
    }

    async findTerms(text, dictionaries, alphanumeric) {
        if (!alphanumeric && text.length > 0) {
            const c = text[0];
            if (!jpIsKana(c) && !jpIsKanji(c)) {
                return {length: 0, definitions: []};
            }
        }

        const cache = {};
        const titles = Object.keys(dictionaries);
        let deinflections = await this.findTermsDeinflected(text, titles, cache);
        const textHiragana = jpKatakanaToHiragana(text);
        if (text !== textHiragana) {
            deinflections = deinflections.concat(await this.findTermsDeinflected(textHiragana, titles, cache));
        }

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
    }

    async findTermsDeinflected(text, dictionaries, cache) {
        await this.prepare();

        const definer = async term => {
            if (cache.hasOwnProperty(term)) {
                return cache[term];
            } else {
                return cache[term] = await this.database.findTerms(term, dictionaries);
            }
        };

        let deinflections = [];
        for (let i = text.length; i > 0; --i) {
            const textSlice = text.slice(0, i);
            deinflections = deinflections.concat(await this.deinflector.deinflect(textSlice, definer));
        }

        return deinflections;
    }

    async findKanji(text, dictionaries) {
        await this.prepare();

        let definitions = [];
        const processed = {};
        const titles = Object.keys(dictionaries);
        for (const c of text) {
            if (!processed[c]) {
                definitions = definitions.concat(await this.database.findKanji(c, titles));
                processed[c] = true;
            }
        }

        for (const definition of definitions) {
            const tags = definition.tags.map(tag => dictTagBuild(tag, definition.tagMeta));
            tags.push(dictTagBuildSource(definition.dictionary));
            definition.tags = dictTagsSort(tags);
        }

        return definitions;
    }


    static loadRules(url) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.overrideMimeType('application/json');
            xhr.addEventListener('load', () => resolve(xhr.responseText));
            xhr.addEventListener('error', () => reject('failed to execute network request'));
            xhr.open('GET', url);
            xhr.send();
        }).then(responseText => {
            try {
                return JSON.parse(responseText);
            }
            catch (e) {
                return Promise.reject('invalid JSON response');
            }
        });
    }
}
