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

/*global requestJson
dictTermsMergeBySequence, dictTagBuildSource, dictTermsMergeByGloss, dictTermsSort, dictTagsSort
dictEnabledSet, dictTermsGroup, dictTermsCompressTags, dictTermsUndupe, dictTagSanitize
jpDistributeFurigana, jpConvertHalfWidthKanaToFullWidth, jpConvertNumericTofullWidth
jpConvertAlphabeticToKana, jpHiraganaToKatakana, jpKatakanaToHiragana, jpIsCharCodeJapanese
Database, Deinflector*/

class Translator {
    constructor() {
        this.database = null;
        this.deinflector = null;
        this.tagCache = new Map();
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
        this.tagCache.clear();
        await this.database.purge();
    }

    async deleteDictionary(dictionaryName) {
        this.tagCache.clear();
        await this.database.deleteDictionary(dictionaryName);
    }

    async getSequencedDefinitions(definitions, mainDictionary) {
        const [definitionsBySequence, defaultDefinitions] = dictTermsMergeBySequence(definitions, mainDictionary);

        const sequenceList = [];
        const sequencedDefinitions = [];
        for (const [key, value] of definitionsBySequence.entries()) {
            sequenceList.push(key);
            sequencedDefinitions.push({definitions: value, rawDefinitions: []});
        }

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
        for (const [expression, readingMap] of result.expressions.entries()) {
            for (const [reading, termTags] of readingMap.entries()) {
                const score = termTags.map((tag) => tag.score).reduce((p, v) => p + v, 0);
                expressions.push(Translator.createExpression(expression, reading, dictTagsSort(termTags), Translator.scoreToTermFrequency(score)));
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
        const [definitions, length] = await this.findTermsInternal(text, dictionaries, details, options);

        const definitionsGrouped = dictTermsGroup(definitions, dictionaries);
        await this.buildTermMeta(definitionsGrouped, titles);

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
        const [definitions, length] = await this.findTermsInternal(text, dictionaries, details, options);
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
            groupedDefinition.expressions = [Translator.createExpression(groupedDefinition.expression, groupedDefinition.reading)];
            definitionsMerged.push(groupedDefinition);
        }

        await this.buildTermMeta(definitionsMerged, titles);

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
        const [definitions, length] = await this.findTermsInternal(text, dictionaries, details, options);

        await this.buildTermMeta(definitions, titles);

        return [definitions, length];
    }

    async findTermsInternal(text, dictionaries, details, options) {
        text = Translator.getSearchableText(text, options);
        if (text.length === 0) {
            return [[], 0];
        }

        const titles = Object.keys(dictionaries);
        const deinflections = (
            details.wildcard ?
            await this.findTermWildcard(text, titles, details.wildcard) :
            await this.findTermDeinflections(text, titles, options)
        );

        let definitions = [];
        for (const deinflection of deinflections) {
            for (const definition of deinflection.definitions) {
                const definitionTags = await this.expandTags(definition.definitionTags, definition.dictionary);
                definitionTags.push(dictTagBuildSource(definition.dictionary));
                const termTags = await this.expandTags(definition.termTags, definition.dictionary);

                const {expression, reading} = definition;
                const furiganaSegments = jpDistributeFurigana(expression, reading);

                definitions.push({
                    source: deinflection.source,
                    rawSource: deinflection.rawSource,
                    reasons: deinflection.reasons,
                    score: definition.score,
                    id: definition.id,
                    dictionary: definition.dictionary,
                    expression,
                    reading,
                    furiganaSegments,
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
            length = Math.max(length, definition.rawSource.length);
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
            rawSource: text,
            term: text,
            rules: 0,
            definitions,
            reasons: []
        }];
    }

    async findTermDeinflections(text, titles, options) {
        const deinflections = this.getAllDeinflections(text, options);

        if (deinflections.length === 0) {
            return [];
        }

        const uniqueDeinflectionTerms = [];
        const uniqueDeinflectionArrays = [];
        const uniqueDeinflectionsMap = new Map();
        for (const deinflection of deinflections) {
            const term = deinflection.term;
            let deinflectionArray = uniqueDeinflectionsMap.get(term);
            if (typeof deinflectionArray === 'undefined') {
                deinflectionArray = [];
                uniqueDeinflectionTerms.push(term);
                uniqueDeinflectionArrays.push(deinflectionArray);
                uniqueDeinflectionsMap.set(term, deinflectionArray);
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

    getAllDeinflections(text, options) {
        const translationOptions = options.translation;
        const textOptionVariantArray = [
            Translator.getTextOptionEntryVariants(translationOptions.convertHalfWidthCharacters),
            Translator.getTextOptionEntryVariants(translationOptions.convertNumericCharacters),
            Translator.getTextOptionEntryVariants(translationOptions.convertAlphabeticCharacters),
            Translator.getTextOptionEntryVariants(translationOptions.convertHiraganaToKatakana),
            Translator.getTextOptionEntryVariants(translationOptions.convertKatakanaToHiragana)
        ];

        const deinflections = [];
        const used = new Set();
        for (const [halfWidth, numeric, alphabetic, katakana, hiragana] of Translator.getArrayVariants(textOptionVariantArray)) {
            let text2 = text;
            let sourceMapping = null;
            if (halfWidth) {
                if (sourceMapping === null) { sourceMapping = Translator.createTextSourceMapping(text2); }
                text2 = jpConvertHalfWidthKanaToFullWidth(text2, sourceMapping);
            }
            if (numeric) {
                text2 = jpConvertNumericTofullWidth(text2);
            }
            if (alphabetic) {
                if (sourceMapping === null) { sourceMapping = Translator.createTextSourceMapping(text2); }
                text2 = jpConvertAlphabeticToKana(text2, sourceMapping);
            }
            if (katakana) {
                text2 = jpHiraganaToKatakana(text2);
            }
            if (hiragana) {
                text2 = jpKatakanaToHiragana(text2);
            }

            for (let i = text2.length; i > 0; --i) {
                const text2Substring = text2.substring(0, i);
                if (used.has(text2Substring)) { break; }
                used.add(text2Substring);
                for (const deinflection of this.deinflector.deinflect(text2Substring)) {
                    deinflection.rawSource = Translator.getDeinflectionRawSource(text, i, sourceMapping);
                    deinflections.push(deinflection);
                }
            }
        }
        return deinflections;
    }

    static getTextOptionEntryVariants(value) {
        switch (value) {
            case 'true': return [true];
            case 'variant': return [false, true];
            default: return [false];
        }
    }

    static getDeinflectionRawSource(source, length, sourceMapping) {
        if (sourceMapping === null) {
            return source.substring(0, length);
        }

        let result = '';
        let index = 0;
        for (let i = 0; i < length; ++i) {
            const c = sourceMapping[i];
            result += source.substring(index, index + c);
            index += c;
        }
        return result;
    }

    static createTextSourceMapping(text) {
        return new Array(text.length).fill(1);
    }

    async findKanji(text, options) {
        const dictionaries = dictEnabledSet(options);
        const titles = Object.keys(dictionaries);
        const kanjiUnique = new Set();
        for (const c of text) {
            kanjiUnique.add(c);
        }

        const definitions = await this.database.findKanjiBulk([...kanjiUnique], titles);
        if (definitions.length === 0) {
            return definitions;
        }

        if (definitions.length > 1) {
            definitions.sort((a, b) => a.index - b.index);
        }

        for (const definition of definitions) {
            const tags = await this.expandTags(definition.tags, definition.dictionary);
            tags.push(dictTagBuildSource(definition.dictionary));
            dictTagsSort(tags);

            const stats = await this.expandStats(definition.stats, definition.dictionary);

            definition.tags = tags;
            definition.stats = stats;
        }

        await this.buildKanjiMeta(definitions, titles);

        return definitions;
    }

    async buildTermMeta(definitions, titles) {
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
        const termsUniqueMap = new Map();
        for (let i = 0, ii = terms.length; i < ii; ++i) {
            const term = terms[i];
            const expression = term.expression;
            let termList = termsUniqueMap.get(expression);
            if (typeof termList === 'undefined') {
                termList = [];
                expressionsUnique.push(expression);
                termsUnique.push(termList);
                termsUniqueMap.set(expression, termList);
            }
            termList.push(term);

            // New data
            term.frequencies = [];
        }

        const metas = await this.database.findTermMetaBulk(expressionsUnique, titles);
        for (const {expression, mode, data, dictionary, index} of metas) {
            switch (mode) {
                case 'freq':
                    for (const term of termsUnique[index]) {
                        term.frequencies.push({expression, frequency: data, dictionary});
                    }
                    break;
            }
        }
    }

    async buildKanjiMeta(definitions, titles) {
        const kanjiList = [];
        for (const definition of definitions) {
            kanjiList.push(definition.character);
            definition.frequencies = [];
        }

        const metas = await this.database.findKanjiMetaBulk(kanjiList, titles);
        for (const {character, mode, data, dictionary, index} of metas) {
            switch (mode) {
                case 'freq':
                    definitions[index].frequencies.push({character, frequency: data, dictionary});
                    break;
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
        let cache = this.tagCache.get(title);
        if (typeof cache === 'undefined') {
            cache = new Map();
            this.tagCache.set(title, cache);
        }

        for (const name of names) {
            const base = Translator.getNameBase(name);

            let tagMeta = cache.get(base);
            if (typeof tagMeta === 'undefined') {
                tagMeta = await this.database.findTagForTitle(base, title);
                cache.set(base, tagMeta);
            }

            tagMetaList.push(tagMeta);
        }

        return tagMetaList;
    }

    static createExpression(expression, reading, termTags=null, termFrequency=null) {
        const furiganaSegments = jpDistributeFurigana(expression, reading);
        return {
            expression,
            reading,
            furiganaSegments,
            termTags,
            termFrequency
        };
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

    static *getArrayVariants(arrayVariants) {
        const ii = arrayVariants.length;

        let total = 1;
        for (let i = 0; i < ii; ++i) {
            total *= arrayVariants[i].length;
        }

        for (let a = 0; a < total; ++a) {
            const variant = [];
            let index = a;
            for (let i = 0; i < ii; ++i) {
                const entryVariants = arrayVariants[i];
                variant.push(entryVariants[index % entryVariants.length]);
                index = Math.floor(index / entryVariants.length);
            }
            yield variant;
        }
    }

    static getSearchableText(text, options) {
        if (!options.scanning.alphanumeric) {
            const ii = text.length;
            for (let i = 0; i < ii; ++i) {
                if (!jpIsCharCodeJapanese(text.charCodeAt(i))) {
                    text = text.substring(0, i);
                    break;
                }
            }
        }

        return text;
    }
}
