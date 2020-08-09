/*
 * Copyright (C) 2016-2020  Yomichan Authors
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

/* global
 * Deinflector
 * TextSourceMap
 * dictEnabledSet
 * dictTagBuildSource
 * dictTagSanitize
 * dictTagsSort
 * dictTermsCompressTags
 * dictTermsGroup
 * dictTermsMergeByGloss
 * dictTermsMergeBySequence
 * dictTermsSort
 * dictTermsUndupe
 * jp
 */

class Translator {
    constructor(database) {
        this._database = database;
        this._deinflector = null;
        this._tagCache = new Map();
    }

    async prepare() {
        const reasons = await this._fetchJsonAsset('/bg/lang/deinflect.json');
        this._deinflector = new Deinflector(reasons);
    }

    clearDatabaseCaches() {
        this._tagCache.clear();
    }

    async findTerms(mode, text, details, options) {
        switch (mode) {
            case 'group':
                return await this._findTermsGrouped(text, details, options);
            case 'merge':
                return await this._findTermsMerged(text, details, options);
            case 'split':
                return await this._findTermsSplit(text, details, options);
            case 'simple':
                return await this._findTermsSimple(text, details, options);
            default:
                return [[], 0];
        }
    }

    async findKanji(text, options) {
        const dictionaries = dictEnabledSet(options);
        const kanjiUnique = new Set();
        for (const c of text) {
            kanjiUnique.add(c);
        }

        const definitions = await this._database.findKanjiBulk([...kanjiUnique], dictionaries);
        if (definitions.length === 0) {
            return definitions;
        }

        if (definitions.length > 1) {
            definitions.sort((a, b) => a.index - b.index);
        }

        for (const definition of definitions) {
            const tags = await this._expandTags(definition.tags, definition.dictionary);
            tags.push(dictTagBuildSource(definition.dictionary));
            dictTagsSort(tags);

            const stats = await this._expandStats(definition.stats, definition.dictionary);

            definition.tags = tags;
            definition.stats = stats;
        }

        await this._buildKanjiMeta(definitions, dictionaries);

        return definitions;
    }

    // Private

    async _getSequencedDefinitions(definitions, mainDictionary) {
        const [definitionsBySequence, defaultDefinitions] = dictTermsMergeBySequence(definitions, mainDictionary);

        const sequenceList = [];
        const sequencedDefinitions = [];
        for (const [key, value] of definitionsBySequence.entries()) {
            sequenceList.push(key);
            sequencedDefinitions.push({definitions: value, rawDefinitions: []});
        }

        for (const definition of await this._database.findTermsBySequenceBulk(sequenceList, mainDictionary)) {
            sequencedDefinitions[definition.index].rawDefinitions.push(definition);
        }

        return {sequencedDefinitions, defaultDefinitions};
    }

    async _getMergedSecondarySearchResults(text, expressionsMap, secondarySearchDictionaries) {
        if (secondarySearchDictionaries.size === 0) {
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

        const definitions = await this._database.findTermsExactBulk(expressionList, readingList, secondarySearchDictionaries);
        for (const definition of definitions) {
            const definitionTags = await this._expandTags(definition.definitionTags, definition.dictionary);
            definitionTags.push(dictTagBuildSource(definition.dictionary));
            definition.definitionTags = definitionTags;
            const termTags = await this._expandTags(definition.termTags, definition.dictionary);
            definition.termTags = termTags;
        }

        if (definitions.length > 1) {
            definitions.sort((a, b) => a.index - b.index);
        }

        return definitions;
    }

    async _getMergedDefinition(text, dictionaries, sequencedDefinition, defaultDefinitions, secondarySearchDictionaries, mergedByTermIndices) {
        const result = sequencedDefinition.definitions;
        const rawDefinitionsBySequence = sequencedDefinition.rawDefinitions;

        for (const definition of rawDefinitionsBySequence) {
            const definitionTags = await this._expandTags(definition.definitionTags, definition.dictionary);
            definitionTags.push(dictTagBuildSource(definition.dictionary));
            definition.definitionTags = definitionTags;
            const termTags = await this._expandTags(definition.termTags, definition.dictionary);
            definition.termTags = termTags;
        }

        const definitionsByGloss = dictTermsMergeByGloss(result, rawDefinitionsBySequence);
        const secondarySearchResults = await this._getMergedSecondarySearchResults(text, result.expressions, secondarySearchDictionaries);

        dictTermsMergeByGloss(result, defaultDefinitions.concat(secondarySearchResults), definitionsByGloss, mergedByTermIndices);

        for (const definition of definitionsByGloss.values()) {
            dictTagsSort(definition.definitionTags);
            result.definitions.push(definition);
        }

        dictTermsSort(result.definitions, dictionaries);

        const expressions = [];
        for (const [expression, readingMap] of result.expressions.entries()) {
            for (const [reading, termTagsMap] of readingMap.entries()) {
                const termTags = [...termTagsMap.values()];
                const score = termTags.map((tag) => tag.score).reduce((p, v) => p + v, 0);
                expressions.push(this._createExpression(expression, reading, dictTagsSort(termTags), this._scoreToTermFrequency(score)));
            }
        }

        result.expressions = expressions;
        result.expression = Array.from(result.expression);
        result.reading = Array.from(result.reading);

        return result;
    }

    async _findTermsGrouped(text, details, options) {
        const dictionaries = dictEnabledSet(options);
        const [definitions, length] = await this._findTermsInternal(text, dictionaries, details, options);

        const definitionsGrouped = dictTermsGroup(definitions, dictionaries);
        await this._buildTermMeta(definitionsGrouped, dictionaries);

        if (options.general.compactTags) {
            for (const definition of definitionsGrouped) {
                dictTermsCompressTags(definition.definitions);
            }
        }

        return [definitionsGrouped, length];
    }

    async _findTermsMerged(text, details, options) {
        const dictionaries = dictEnabledSet(options);
        const secondarySearchDictionaries = new Map();
        for (const [title, dictionary] of dictionaries.entries()) {
            if (!dictionary.allowSecondarySearches) { continue; }
            secondarySearchDictionaries.set(title, dictionary);
        }

        const [definitions, length] = await this._findTermsInternal(text, dictionaries, details, options);
        const {sequencedDefinitions, defaultDefinitions} = await this._getSequencedDefinitions(definitions, options.general.mainDictionary);
        const definitionsMerged = [];
        const mergedByTermIndices = new Set();

        for (const sequencedDefinition of sequencedDefinitions) {
            const result = await this._getMergedDefinition(
                text,
                dictionaries,
                sequencedDefinition,
                defaultDefinitions,
                secondarySearchDictionaries,
                mergedByTermIndices
            );
            definitionsMerged.push(result);
        }

        const strayDefinitions = defaultDefinitions.filter((definition, index) => !mergedByTermIndices.has(index));
        for (const groupedDefinition of dictTermsGroup(strayDefinitions, dictionaries)) {
            // from dictTermsMergeBySequence
            const {reasons, score, expression, reading, source, dictionary} = groupedDefinition;
            const compatibilityDefinition = {
                reasons,
                score,
                expression: [expression],
                reading: [reading],
                expressions: [this._createExpression(groupedDefinition.expression, groupedDefinition.reading)],
                source,
                dictionary,
                definitions: groupedDefinition.definitions
            };
            definitionsMerged.push(compatibilityDefinition);
        }

        await this._buildTermMeta(definitionsMerged, dictionaries);

        if (options.general.compactTags) {
            for (const definition of definitionsMerged) {
                dictTermsCompressTags(definition.definitions);
            }
        }

        return [dictTermsSort(definitionsMerged), length];
    }

    async _findTermsSplit(text, details, options) {
        const dictionaries = dictEnabledSet(options);
        const [definitions, length] = await this._findTermsInternal(text, dictionaries, details, options);

        await this._buildTermMeta(definitions, dictionaries);

        return [definitions, length];
    }

    async _findTermsSimple(text, details, options) {
        const dictionaries = dictEnabledSet(options);
        const [definitions, length] = await this._findTermsInternal(text, dictionaries, details, options);
        dictTermsSort(definitions);
        return [definitions, length];
    }

    async _findTermsInternal(text, dictionaries, details, options) {
        text = this._getSearchableText(text, options);
        if (text.length === 0) {
            return [[], 0];
        }

        const deinflections = (
            details.wildcard ?
            await this._findTermWildcard(text, dictionaries, details.wildcard) :
            await this._findTermDeinflections(text, dictionaries, options)
        );

        let definitions = [];
        for (const deinflection of deinflections) {
            for (const definition of deinflection.definitions) {
                const definitionTags = await this._expandTags(definition.definitionTags, definition.dictionary);
                definitionTags.push(dictTagBuildSource(definition.dictionary));
                const termTags = await this._expandTags(definition.termTags, definition.dictionary);

                const {expression, reading} = definition;
                const furiganaSegments = jp.distributeFurigana(expression, reading);

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

    async _findTermWildcard(text, dictionaries, wildcard) {
        const definitions = await this._database.findTermsBulk([text], dictionaries, wildcard);
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

    async _findTermDeinflections(text, dictionaries, options) {
        const deinflections = this._getAllDeinflections(text, options);

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

        const definitions = await this._database.findTermsBulk(uniqueDeinflectionTerms, dictionaries, null);

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

    _getAllDeinflections(text, options) {
        const translationOptions = options.translation;
        const collapseEmphaticOptions = [[false, false]];
        switch (translationOptions.collapseEmphaticSequences) {
            case 'true':
                collapseEmphaticOptions.push([true, false]);
                break;
            case 'full':
                collapseEmphaticOptions.push([true, false], [true, true]);
                break;
        }
        const textOptionVariantArray = [
            this._getTextOptionEntryVariants(translationOptions.convertHalfWidthCharacters),
            this._getTextOptionEntryVariants(translationOptions.convertNumericCharacters),
            this._getTextOptionEntryVariants(translationOptions.convertAlphabeticCharacters),
            this._getTextOptionEntryVariants(translationOptions.convertHiraganaToKatakana),
            this._getTextOptionEntryVariants(translationOptions.convertKatakanaToHiragana),
            collapseEmphaticOptions
        ];

        const deinflections = [];
        const used = new Set();
        for (const [halfWidth, numeric, alphabetic, katakana, hiragana, [collapseEmphatic, collapseEmphaticFull]] of this._getArrayVariants(textOptionVariantArray)) {
            let text2 = text;
            const sourceMap = new TextSourceMap(text2);
            if (halfWidth) {
                text2 = jp.convertHalfWidthKanaToFullWidth(text2, sourceMap);
            }
            if (numeric) {
                text2 = jp.convertNumericToFullWidth(text2);
            }
            if (alphabetic) {
                text2 = jp.convertAlphabeticToKana(text2, sourceMap);
            }
            if (katakana) {
                text2 = jp.convertHiraganaToKatakana(text2);
            }
            if (hiragana) {
                text2 = jp.convertKatakanaToHiragana(text2);
            }
            if (collapseEmphatic) {
                text2 = jp.collapseEmphaticSequences(text2, collapseEmphaticFull, sourceMap);
            }

            for (let i = text2.length; i > 0; --i) {
                const text2Substring = text2.substring(0, i);
                if (used.has(text2Substring)) { break; }
                used.add(text2Substring);
                for (const deinflection of this._deinflector.deinflect(text2Substring)) {
                    deinflection.rawSource = sourceMap.source.substring(0, sourceMap.getSourceLength(i));
                    deinflections.push(deinflection);
                }
            }
        }
        return deinflections;
    }

    _getTextOptionEntryVariants(value) {
        switch (value) {
            case 'true': return [true];
            case 'variant': return [false, true];
            default: return [false];
        }
    }

    async _buildTermMeta(definitions, dictionaries) {
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
            term.pitches = [];
        }

        const metas = await this._database.findTermMetaBulk(expressionsUnique, dictionaries);
        for (const {expression, mode, data, dictionary, index} of metas) {
            switch (mode) {
                case 'freq':
                    for (const term of termsUnique[index]) {
                        const frequencyData = this._getFrequencyData(expression, data, dictionary, term);
                        if (frequencyData === null) { continue; }
                        term.frequencies.push(frequencyData);
                    }
                    break;
                case 'pitch':
                    for (const term of termsUnique[index]) {
                        const pitchData = await this._getPitchData(expression, data, dictionary, term);
                        if (pitchData === null) { continue; }
                        term.pitches.push(pitchData);
                    }
                    break;
            }
        }
    }

    async _buildKanjiMeta(definitions, dictionaries) {
        const kanjiList = [];
        for (const definition of definitions) {
            kanjiList.push(definition.character);
            definition.frequencies = [];
        }

        const metas = await this._database.findKanjiMetaBulk(kanjiList, dictionaries);
        for (const {character, mode, data, dictionary, index} of metas) {
            switch (mode) {
                case 'freq':
                    definitions[index].frequencies.push({character, frequency: data, dictionary});
                    break;
            }
        }
    }

    async _expandTags(names, title) {
        const tagMetaList = await this._getTagMetaList(names, title);
        return tagMetaList.map((meta, index) => {
            const name = names[index];
            const tag = dictTagSanitize(Object.assign({}, meta !== null ? meta : {}, {name}));
            return dictTagSanitize(tag);
        });
    }

    async _expandStats(items, title) {
        const names = Object.keys(items);
        const tagMetaList = await this._getTagMetaList(names, title);

        const statsGroups = new Map();
        for (let i = 0; i < names.length; ++i) {
            const name = names[i];
            const meta = tagMetaList[i];
            if (meta === null) { continue; }

            const category = meta.category;
            let group = statsGroups.get(category);
            if (typeof group === 'undefined') {
                group = [];
                statsGroups.set(category, group);
            }

            const stat = Object.assign({}, meta, {name, value: items[name]});
            group.push(dictTagSanitize(stat));
        }

        const stats = {};
        const sortCompare = (a, b) => a.notes - b.notes;
        for (const [category, group] of statsGroups.entries()) {
            group.sort(sortCompare);
            stats[category] = group;
        }
        return stats;
    }

    async _getTagMetaList(names, title) {
        const tagMetaList = [];
        let cache = this._tagCache.get(title);
        if (typeof cache === 'undefined') {
            cache = new Map();
            this._tagCache.set(title, cache);
        }

        for (const name of names) {
            const base = this._getNameBase(name);

            let tagMeta = cache.get(base);
            if (typeof tagMeta === 'undefined') {
                tagMeta = await this._database.findTagForTitle(base, title);
                cache.set(base, tagMeta);
            }

            tagMetaList.push(tagMeta);
        }

        return tagMetaList;
    }

    _getFrequencyData(expression, data, dictionary, term) {
        if (data !== null && typeof data === 'object') {
            const {frequency, reading} = data;

            const termReading = term.reading || expression;
            if (reading !== termReading) { return null; }

            return {expression, frequency, dictionary};
        }
        return {expression, frequency: data, dictionary};
    }

    async _getPitchData(expression, data, dictionary, term) {
        const reading = data.reading;
        const termReading = term.reading || expression;
        if (reading !== termReading) { return null; }

        const pitches = [];
        for (let {position, tags} of data.pitches) {
            tags = Array.isArray(tags) ? await this._getTagMetaList(tags, dictionary) : [];
            pitches.push({position, tags});
        }

        return {reading, pitches, dictionary};
    }

    _createExpression(expression, reading, termTags=null, termFrequency=null) {
        const furiganaSegments = jp.distributeFurigana(expression, reading);
        return {
            expression,
            reading,
            furiganaSegments,
            termTags,
            termFrequency
        };
    }

    _scoreToTermFrequency(score) {
        if (score > 0) {
            return 'popular';
        } else if (score < 0) {
            return 'rare';
        } else {
            return 'normal';
        }
    }

    _getNameBase(name) {
        const pos = name.indexOf(':');
        return (pos >= 0 ? name.substring(0, pos) : name);
    }

    *_getArrayVariants(arrayVariants) {
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

    _getSearchableText(text, options) {
        if (!options.scanning.alphanumeric) {
            let newText = '';
            for (const c of text) {
                if (!jp.isCodePointJapanese(c.codePointAt(0))) {
                    break;
                }
                newText += c;
            }
            text = newText;
        }

        return text;
    }

    async _fetchJsonAsset(url) {
        const response = await fetch(chrome.runtime.getURL(url), {
            method: 'GET',
            mode: 'no-cors',
            cache: 'default',
            credentials: 'omit',
            redirect: 'follow',
            referrerPolicy: 'no-referrer'
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch ${url}: ${response.status}`);
        }
        return await response.json();
    }
}
