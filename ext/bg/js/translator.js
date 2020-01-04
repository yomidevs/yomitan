/*
 * Copyright (C) 2016-2020  Alex Yatskov <alex@foosoft.net>
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
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */


class Translator {
    constructor() {
        this.database = null;
        this.deinflector = null;
        this.tagCache = {};
    }

    async prepare() {
        if (!this.database) {
            this.database = new Database();
            await this.database.prepare();
        }

        if (!this.deinflector) {
            const url = chrome.runtime.getURL('/bg/lang/deinflect.json');
            const reasons = await requestJson(url, 'GET');
            this.deinflector = new Deinflector(reasons);
        }
    }

    async purgeDatabase() {
        this.tagCache = {};
        await this.database.purge();
    }

    async deleteDictionary(dictionaryName) {
        this.tagCache = {};
        await this.database.deleteDictionary(dictionaryName);
    }

    async getSequencedDefinitions(definitions, mainDictionary) {
        const definitionsBySequence = dictTermsMergeBySequence(definitions, mainDictionary);
        const defaultDefinitions = definitionsBySequence['-1'];

        const sequenceList = Object.keys(definitionsBySequence).map((v) => Number(v)).filter((v) => v >= 0);
        const sequencedDefinitions = sequenceList.map((key) => ({
            definitions: definitionsBySequence[key],
            rawDefinitions: []
        }));

        for (const definition of await this.database.findTermsBySequenceBulk(sequenceList, mainDictionary)) {
            sequencedDefinitions[definition.index].rawDefinitions.push(definition);
        }

        return {sequencedDefinitions, defaultDefinitions};
    }

    async getMergedSecondarySearchResults(text, expressionsMap, secondarySearchTitles) {
        if (secondarySearchTitles.length === 0) {
            return [];
        }

        const expressionList = [];
        const readingList = [];
        for (const expression of expressionsMap.keys()) {
            if (expression === text) { continue; }
            for (const reading of expressionsMap.get(expression).keys()) {
                expressionList.push(expression);
                readingList.push(reading);
            }
        }

        const definitions = await this.database.findTermsExactBulk(expressionList, readingList, secondarySearchTitles);
        for (const definition of definitions) {
            const definitionTags = await this.expandTags(definition.definitionTags, definition.dictionary);
            definitionTags.push(dictTagBuildSource(definition.dictionary));
            definition.definitionTags = definitionTags;
            const termTags = await this.expandTags(definition.termTags, definition.dictionary);
            definition.termTags = termTags;
        }

        if (definitions.length > 1) {
            definitions.sort((a, b) => a.index - b.index);
        }

        return definitions;
    }

    async getMergedDefinition(text, dictionaries, sequencedDefinition, defaultDefinitions, secondarySearchTitles, mergedByTermIndices) {
        const result = sequencedDefinition.definitions;
        const rawDefinitionsBySequence = sequencedDefinition.rawDefinitions;

        for (const definition of rawDefinitionsBySequence) {
            const definitionTags = await this.expandTags(definition.definitionTags, definition.dictionary);
            definitionTags.push(dictTagBuildSource(definition.dictionary));
            definition.definitionTags = definitionTags;
            const termTags = await this.expandTags(definition.termTags, definition.dictionary);
            definition.termTags = termTags;
        }

        const definitionsByGloss = dictTermsMergeByGloss(result, rawDefinitionsBySequence);
        const secondarySearchResults = await this.getMergedSecondarySearchResults(text, result.expressions, secondarySearchTitles);

        dictTermsMergeByGloss(result, defaultDefinitions.concat(secondarySearchResults), definitionsByGloss, mergedByTermIndices);

        for (const gloss in definitionsByGloss) {
            const definition = definitionsByGloss[gloss];
            dictTagsSort(definition.definitionTags);
            result.definitions.push(definition);
        }

        dictTermsSort(result.definitions, dictionaries);

        const expressions = [];
        for (const expression of result.expressions.keys()) {
            for (const reading of result.expressions.get(expression).keys()) {
                const termTags = result.expressions.get(expression).get(reading);
                const score = termTags.map((tag) => tag.score).reduce((p, v) => p + v, 0);
                expressions.push({
                    expression: expression,
                    reading: reading,
                    termTags: dictTagsSort(termTags),
                    termFrequency: Translator.scoreToTermFrequency(score)
                });
            }
        }

        result.expressions = expressions;
        result.expression = Array.from(result.expression);
        result.reading = Array.from(result.reading);

        return result;
    }

    async findTerms(text, details, options) {
        switch (options.general.resultOutputMode) {
            case 'group':
                return await this.findTermsGrouped(text, details, options);
            case 'merge':
                return await this.findTermsMerged(text, details, options);
            case 'split':
                return await this.findTermsSplit(text, details, options);
            default:
                return [[], 0];
        }
    }

    async findTermsGrouped(text, details, options) {
        const dictionaries = dictEnabledSet(options);
        const titles = Object.keys(dictionaries);
        const [definitions, length] = await this.findTermsInternal(text, dictionaries, options.scanning.alphanumeric, details);

        const definitionsGrouped = dictTermsGroup(definitions, dictionaries);
        await this.buildTermFrequencies(definitionsGrouped, titles);

        if (options.general.compactTags) {
            for (const definition of definitionsGrouped) {
                dictTermsCompressTags(definition.definitions);
            }
        }

        return [definitionsGrouped, length];
    }

    async findTermsMerged(text, details, options) {
        const dictionaries = dictEnabledSet(options);
        const secondarySearchTitles = Object.keys(options.dictionaries).filter((dict) => options.dictionaries[dict].allowSecondarySearches);
        const titles = Object.keys(dictionaries);
        const [definitions, length] = await this.findTermsInternal(text, dictionaries, options.scanning.alphanumeric, details);
        const {sequencedDefinitions, defaultDefinitions} = await this.getSequencedDefinitions(definitions, options.general.mainDictionary);
        const definitionsMerged = [];
        const mergedByTermIndices = new Set();

        for (const sequencedDefinition of sequencedDefinitions) {
            const result = await this.getMergedDefinition(
                text,
                dictionaries,
                sequencedDefinition,
                defaultDefinitions,
                secondarySearchTitles,
                mergedByTermIndices
            );
            definitionsMerged.push(result);
        }

        const strayDefinitions = defaultDefinitions.filter((definition, index) => !mergedByTermIndices.has(index));
        for (const groupedDefinition of dictTermsGroup(strayDefinitions, dictionaries)) {
            groupedDefinition.expressions = [{expression: groupedDefinition.expression, reading: groupedDefinition.reading}];
            definitionsMerged.push(groupedDefinition);
        }

        await this.buildTermFrequencies(definitionsMerged, titles);

        if (options.general.compactTags) {
            for (const definition of definitionsMerged) {
                dictTermsCompressTags(definition.definitions);
            }
        }

        return [dictTermsSort(definitionsMerged), length];
    }

    async findTermsSplit(text, details, options) {
        const dictionaries = dictEnabledSet(options);
        const titles = Object.keys(dictionaries);
        const [definitions, length] = await this.findTermsInternal(text, dictionaries, options.scanning.alphanumeric, details);

        await this.buildTermFrequencies(definitions, titles);

        return [definitions, length];
    }

    async findTermsInternal(text, dictionaries, alphanumeric, details) {
        if (!alphanumeric && text.length > 0) {
            const c = text[0];
            if (!jpIsKana(c) && !jpIsKanji(c)) {
                return [[], 0];
            }
        }

        const titles = Object.keys(dictionaries);
        const deinflections = (
            details.wildcard ?
            await this.findTermWildcard(text, titles, details.wildcard) :
            await this.findTermDeinflections(text, titles)
        );

        let definitions = [];
        for (const deinflection of deinflections) {
            for (const definition of deinflection.definitions) {
                const definitionTags = await this.expandTags(definition.definitionTags, definition.dictionary);
                definitionTags.push(dictTagBuildSource(definition.dictionary));
                const termTags = await this.expandTags(definition.termTags, definition.dictionary);

                definitions.push({
                    source: deinflection.source,
                    reasons: deinflection.reasons,
                    score: definition.score,
                    id: definition.id,
                    dictionary: definition.dictionary,
                    expression: definition.expression,
                    reading: definition.reading,
                    glossary: definition.glossary,
                    definitionTags: dictTagsSort(definitionTags),
                    termTags: dictTagsSort(termTags),
                    sequence: definition.sequence
                });
            }
        }

        definitions = dictTermsUndupe(definitions);
        definitions = dictTermsSort(definitions, dictionaries);

        let length = 0;
        for (const definition of definitions) {
            length = Math.max(length, definition.source.length);
        }

        return [definitions, length];
    }

    async findTermWildcard(text, titles, wildcard) {
        const definitions = await this.database.findTermsBulk([text], titles, wildcard);
        if (definitions.length === 0) {
            return [];
        }

        return [{
            source: text,
            term: text,
            rules: 0,
            definitions,
            reasons: []
        }];
    }

    async findTermDeinflections(text, titles) {
        const text2 = jpKatakanaToHiragana(text);
        const deinflections = (text === text2 ? this.getDeinflections(text) : this.getDeinflections2(text, text2));

        if (deinflections.length === 0) {
            return [];
        }

        const uniqueDeinflectionTerms = [];
        const uniqueDeinflectionArrays = [];
        const uniqueDeinflectionsMap = {};
        for (const deinflection of deinflections) {
            const term = deinflection.term;
            let deinflectionArray;
            if (hasOwn(uniqueDeinflectionsMap, term)) {
                deinflectionArray = uniqueDeinflectionsMap[term];
            } else {
                deinflectionArray = [];
                uniqueDeinflectionTerms.push(term);
                uniqueDeinflectionArrays.push(deinflectionArray);
                uniqueDeinflectionsMap[term] = deinflectionArray;
            }
            deinflectionArray.push(deinflection);
        }

        const definitions = await this.database.findTermsBulk(uniqueDeinflectionTerms, titles, null);

        for (const definition of definitions) {
            const definitionRules = Deinflector.rulesToRuleFlags(definition.rules);
            for (const deinflection of uniqueDeinflectionArrays[definition.index]) {
                const deinflectionRules = deinflection.rules;
                if (deinflectionRules === 0 || (definitionRules & deinflectionRules) !== 0) {
                    deinflection.definitions.push(definition);
                }
            }
        }

        return deinflections.filter((e) => e.definitions.length > 0);
    }

    getDeinflections(text) {
        const deinflections = [];

        for (let i = text.length; i > 0; --i) {
            const textSubstring = text.substring(0, i);
            deinflections.push(...this.deinflector.deinflect(textSubstring));
        }

        return deinflections;
    }

    getDeinflections2(text1, text2) {
        const deinflections = [];

        for (let i = text1.length; i > 0; --i) {
            const text1Substring = text1.substring(0, i);
            const text2Substring = text2.substring(0, i);
            deinflections.push(...this.deinflector.deinflect(text1Substring));
            if (text1Substring !== text2Substring) {
                deinflections.push(...this.deinflector.deinflect(text2Substring));
            }
        }

        return deinflections;
    }

    async findKanji(text, options) {
        const dictionaries = dictEnabledSet(options);
        const titles = Object.keys(dictionaries);
        const kanjiUnique = {};
        const kanjiList = [];
        for (const c of text) {
            if (!hasOwn(kanjiUnique, c)) {
                kanjiList.push(c);
                kanjiUnique[c] = true;
            }
        }

        const definitions = await this.database.findKanjiBulk(kanjiList, titles);
        if (definitions.length === 0) {
            return definitions;
        }

        if (definitions.length > 1) {
            definitions.sort((a, b) => a.index - b.index);
        }

        const kanjiList2 = [];
        for (const definition of definitions) {
            kanjiList2.push(definition.character);

            const tags = await this.expandTags(definition.tags, definition.dictionary);
            tags.push(dictTagBuildSource(definition.dictionary));

            definition.tags = dictTagsSort(tags);
            definition.stats = await this.expandStats(definition.stats, definition.dictionary);
            definition.frequencies = [];
        }

        for (const meta of await this.database.findKanjiMetaBulk(kanjiList2, titles)) {
            if (meta.mode !== 'freq') { continue; }
            definitions[meta.index].frequencies.push({
                character: meta.character,
                frequency: meta.data,
                dictionary: meta.dictionary
            });
        }

        return definitions;
    }

    async buildTermFrequencies(definitions, titles) {
        const terms = [];
        for (const definition of definitions) {
            if (definition.expressions) {
                terms.push(...definition.expressions);
            } else {
                terms.push(definition);
            }
        }

        if (terms.length === 0) {
            return;
        }

        // Create mapping of unique terms
        const expressionsUnique = [];
        const termsUnique = [];
        const termsUniqueMap = {};
        for (let i = 0, ii = terms.length; i < ii; ++i) {
            const term = terms[i];
            const expression = term.expression;
            term.frequencies = [];

            if (hasOwn(termsUniqueMap, expression)) {
                termsUniqueMap[expression].push(term);
            } else {
                const termList = [term];
                expressionsUnique.push(expression);
                termsUnique.push(termList);
                termsUniqueMap[expression] = termList;
            }
        }

        const metas = await this.database.findTermMetaBulk(expressionsUnique, titles);
        for (const meta of metas) {
            if (meta.mode !== 'freq') {
                continue;
            }

            for (const term of termsUnique[meta.index]) {
                term.frequencies.push({
                    expression: meta.expression,
                    frequency: meta.data,
                    dictionary: meta.dictionary
                });
            }
        }
    }

    async expandTags(names, title) {
        const tagMetaList = await this.getTagMetaList(names, title);
        return tagMetaList.map((meta, index) => {
            const name = names[index];
            const tag = dictTagSanitize(Object.assign({}, meta !== null ? meta : {}, {name}));
            return dictTagSanitize(tag);
        });
    }

    async expandStats(items, title) {
        const names = Object.keys(items);
        const tagMetaList = await this.getTagMetaList(names, title);

        const stats = {};
        for (let i = 0; i < names.length; ++i) {
            const name = names[i];
            const meta = tagMetaList[i];
            if (meta === null) { continue; }

            const category = meta.category;
            const group = (
                hasOwn(stats, category) ?
                stats[category] :
                (stats[category] = [])
            );

            const stat = Object.assign({}, meta, {name, value: items[name]});
            group.push(dictTagSanitize(stat));
        }

        const sortCompare = (a, b) => a.notes - b.notes;
        for (const category in stats) {
            stats[category].sort(sortCompare);
        }

        return stats;
    }

    async getTagMetaList(names, title) {
        const tagMetaList = [];
        const cache = (
            hasOwn(this.tagCache, title) ?
            this.tagCache[title] :
            (this.tagCache[title] = {})
        );

        for (const name of names) {
            const base = Translator.getNameBase(name);

            if (hasOwn(cache, base)) {
                tagMetaList.push(cache[base]);
            } else {
                const tagMeta = await this.database.findTagForTitle(base, title);
                cache[base] = tagMeta;
                tagMetaList.push(tagMeta);
            }
        }

        return tagMetaList;
    }

    static scoreToTermFrequency(score) {
        if (score > 0) {
            return 'popular';
        } else if (score < 0) {
            return 'rare';
        } else {
            return 'normal';
        }
    }

    static getNameBase(name) {
        const pos = name.indexOf(':');
        return (pos >= 0 ? name.substring(0, pos) : name);
    }
}
