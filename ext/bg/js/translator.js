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
 * jp
 */

class Translator {
    constructor(database) {
        this._database = database;
        this._deinflector = null;
        this._tagCache = new Map();
        this._stringComparer = new Intl.Collator('en-US'); // Invariant locale
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
        const dictionaries = this._getEnabledDictionaryMap(options);
        const kanjiUnique = new Set();
        for (const c of text) {
            kanjiUnique.add(c);
        }

        const databaseDefinitions = await this._database.findKanjiBulk([...kanjiUnique], dictionaries);
        if (databaseDefinitions.length === 0) { return []; }

        this._sortDatabaseDefinitionsByIndex(databaseDefinitions);

        const definitions = [];
        for (const {index, character, onyomi, kunyomi, tags, glossary, stats, dictionary} of databaseDefinitions) {
            const expandedStats = await this._expandStats(stats, dictionary);
            const expandedTags = await this._expandTags(tags, dictionary);
            expandedTags.push(this._createDictionaryTag(dictionary));
            this._sortTags(expandedTags);

            definitions.push({
                index,
                character,
                onyomi,
                kunyomi,
                tags: expandedTags,
                glossary,
                stats: expandedStats,
                dictionary,
                frequencies: []
            });
        }

        await this._buildKanjiMeta(definitions, dictionaries);

        return definitions;
    }

    // Private

    async _getSequencedDefinitions(definitions, mainDictionary) {
        const sequenceList = [];
        const sequencedDefinitionMap = new Map();
        const sequencedDefinitions = [];
        const unsequencedDefinitions = [];
        for (const definition of definitions) {
            const {sequence, dictionary} = definition;
            if (mainDictionary === dictionary && sequence >= 0) {
                const {score} = definition;
                let sequencedDefinition = sequencedDefinitionMap.get(sequence);
                if (typeof sequencedDefinition === 'undefined') {
                    const {reasons, source} = definition;
                    sequencedDefinition = {
                        reasons,
                        score,
                        source,
                        dictionary,
                        databaseDefinitions: []
                    };
                    sequencedDefinitionMap.set(sequence, sequencedDefinition);
                    sequencedDefinitions.push(sequencedDefinition);
                    sequenceList.push(sequence);
                } else {
                    sequencedDefinition.score = Math.max(sequencedDefinition.score, score);
                }
            } else {
                unsequencedDefinitions.push(definition);
            }
        }

        const databaseDefinitions = await this._database.findTermsBySequenceBulk(sequenceList, mainDictionary);
        for (const databaseDefinition of databaseDefinitions) {
            sequencedDefinitions[databaseDefinition.index].databaseDefinitions.push(databaseDefinition);
        }

        return {sequencedDefinitions, unsequencedDefinitions};
    }

    async _getMergedSecondarySearchResults(text, expressionsMap, secondarySearchDictionaries) {
        if (secondarySearchDictionaries.size === 0) {
            return [];
        }

        const expressionList = [];
        const readingList = [];
        for (const [expression, readingMap] of expressionsMap.entries()) {
            if (expression === text) { continue; }
            for (const reading of readingMap.keys()) {
                expressionList.push(expression);
                readingList.push(reading);
            }
        }

        const databaseDefinitions = await this._database.findTermsExactBulk(expressionList, readingList, secondarySearchDictionaries);
        this._sortDatabaseDefinitionsByIndex(databaseDefinitions);

        const definitions = [];
        for (const databaseDefinition of databaseDefinitions) {
            const source = expressionList[databaseDefinition.index];
            const definition = await this._createTermDefinitionFromDatabaseDefinition(databaseDefinition, source, source, []);
            definitions.push(definition);
        }

        return definitions;
    }

    async _getMergedDefinition(text, dictionaries, sequencedDefinition, defaultDefinitions, secondarySearchDictionaries, mergedByTermIndices) {
        const {reasons, score, source, dictionary, databaseDefinitions} = sequencedDefinition;
        const result = {
            reasons,
            score,
            expression: new Set(),
            reading: new Set(),
            expressions: new Map(),
            source,
            dictionary,
            definitions: []
        };

        for (const definition of databaseDefinitions) {
            const definitionTags = await this._expandTags(definition.definitionTags, definition.dictionary);
            definitionTags.push(this._createDictionaryTag(definition.dictionary));
            definition.definitionTags = definitionTags;
            const termTags = await this._expandTags(definition.termTags, definition.dictionary);
            definition.termTags = termTags;
        }

        const definitionsByGloss = this._mergeByGlossary(result, databaseDefinitions);
        const secondarySearchResults = await this._getMergedSecondarySearchResults(text, result.expressions, secondarySearchDictionaries);

        this._mergeByGlossary(result, defaultDefinitions.concat(secondarySearchResults), definitionsByGloss, mergedByTermIndices);

        for (const definition of definitionsByGloss.values()) {
            this._sortTags(definition.definitionTags);
            result.definitions.push(definition);
        }

        this._sortDefinitions(result.definitions, dictionaries);

        const expressions = [];
        for (const [expression, readingMap] of result.expressions.entries()) {
            for (const [reading, termTagsMap] of readingMap.entries()) {
                const termTags = [...termTagsMap.values()];
                const score2 = termTags.map((tag) => tag.score).reduce((p, v) => p + v, 0);
                this._sortTags(termTags);
                expressions.push(this._createExpression(expression, reading, termTags, this._scoreToTermFrequency(score2)));
            }
        }

        result.expressions = expressions;
        result.expression = Array.from(result.expression);
        result.reading = Array.from(result.reading);

        return result;
    }

    async _findTermsGrouped(text, details, options) {
        const dictionaries = this._getEnabledDictionaryMap(options);
        const [definitions, length] = await this._findTermsInternal(text, dictionaries, details, options);

        const definitionsGrouped = this._groupTerms(definitions, dictionaries);
        await this._buildTermMeta(definitionsGrouped, dictionaries);
        this._sortDefinitions(definitionsGrouped, null);

        if (options.general.compactTags) {
            for (const definition of definitionsGrouped) {
                this._compressDefinitionTags(definition.definitions);
            }
        }

        return [definitionsGrouped, length];
    }

    async _findTermsMerged(text, details, options) {
        const dictionaries = this._getEnabledDictionaryMap(options);
        const secondarySearchDictionaries = new Map();
        for (const [title, dictionary] of dictionaries.entries()) {
            if (!dictionary.allowSecondarySearches) { continue; }
            secondarySearchDictionaries.set(title, dictionary);
        }

        const [definitions, length] = await this._findTermsInternal(text, dictionaries, details, options);
        const {sequencedDefinitions, unsequencedDefinitions} = await this._getSequencedDefinitions(definitions, options.general.mainDictionary);
        const definitionsMerged = [];
        const mergedByTermIndices = new Set();

        for (const sequencedDefinition of sequencedDefinitions) {
            const result = await this._getMergedDefinition(
                text,
                dictionaries,
                sequencedDefinition,
                unsequencedDefinitions,
                secondarySearchDictionaries,
                mergedByTermIndices
            );
            definitionsMerged.push(result);
        }

        const strayDefinitions = unsequencedDefinitions.filter((definition, index) => !mergedByTermIndices.has(index));
        for (const groupedDefinition of this._groupTerms(strayDefinitions, dictionaries)) {
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
        this._sortDefinitions(definitionsMerged, null);

        if (options.general.compactTags) {
            for (const definition of definitionsMerged) {
                this._compressDefinitionTags(definition.definitions);
            }
        }

        return [definitionsMerged, length];
    }

    async _findTermsSplit(text, details, options) {
        const dictionaries = this._getEnabledDictionaryMap(options);
        const [definitions, length] = await this._findTermsInternal(text, dictionaries, details, options);
        await this._buildTermMeta(definitions, dictionaries);
        this._sortDefinitions(definitions, dictionaries);
        return [definitions, length];
    }

    async _findTermsSimple(text, details, options) {
        const dictionaries = this._getEnabledDictionaryMap(options);
        const [definitions, length] = await this._findTermsInternal(text, dictionaries, details, options);
        this._sortDefinitions(definitions, null);
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

        let maxLength = 0;
        const definitions = [];
        for (const {databaseDefinitions, source, rawSource, reasons} of deinflections) {
            maxLength = Math.max(maxLength, rawSource.length);
            for (const databaseDefinition of databaseDefinitions) {
                const definition = await this._createTermDefinitionFromDatabaseDefinition(databaseDefinition, source, rawSource, reasons);
                definitions.push(definition);
            }
        }

        this._removeDuplicateDefinitions(definitions);
        return [definitions, maxLength];
    }

    async _findTermWildcard(text, dictionaries, wildcard) {
        const databaseDefinitions = await this._database.findTermsBulk([text], dictionaries, wildcard);
        if (databaseDefinitions.length === 0) {
            return [];
        }

        return [{
            source: text,
            rawSource: text,
            term: text,
            rules: 0,
            reasons: [],
            databaseDefinitions
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

        const databaseDefinitions = await this._database.findTermsBulk(uniqueDeinflectionTerms, dictionaries, null);

        for (const databaseDefinition of databaseDefinitions) {
            const definitionRules = Deinflector.rulesToRuleFlags(databaseDefinition.rules);
            for (const deinflection of uniqueDeinflectionArrays[databaseDefinition.index]) {
                const deinflectionRules = deinflection.rules;
                if (deinflectionRules === 0 || (definitionRules & deinflectionRules) !== 0) {
                    deinflection.databaseDefinitions.push(databaseDefinition);
                }
            }
        }

        return deinflections.filter((e) => e.databaseDefinitions.length > 0);
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
                const rawSource = sourceMap.source.substring(0, sourceMap.getSourceLength(i));
                for (const deinflection of this._deinflector.deinflect(text2Substring, rawSource)) {
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
        for (const {character} of definitions) {
            kanjiList.push(character);
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
        const results = [];
        for (let i = 0, ii = tagMetaList.length; i < ii; ++i) {
            const meta = tagMetaList[i];
            if (meta === null) { continue; }
            const name = names[i];
            const {category, notes, order, score, dictionary} = meta;
            const tag = this._createTag(name, category, notes, order, score, dictionary);
            results.push(tag);
        }
        return results;
    }

    async _expandStats(items, title) {
        const names = Object.keys(items);
        const tagMetaList = await this._getTagMetaList(names, title);

        const statsGroups = new Map();
        for (let i = 0; i < names.length; ++i) {
            const name = names[i];
            const meta = tagMetaList[i];
            if (meta === null) { continue; }

            const {category, notes, order, score, dictionary} = meta;
            let group = statsGroups.get(category);
            if (typeof group === 'undefined') {
                group = [];
                statsGroups.set(category, group);
            }

            const value = items[name];
            const stat = this._createKanjiStat(name, category, notes, order, score, dictionary, value);
            group.push(stat);
        }

        const stats = {};
        for (const [category, group] of statsGroups.entries()) {
            this._sortKanjiStats(group);
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

    _getEnabledDictionaryMap(options) {
        const enabledDictionaryMap = new Map();
        for (const [title, {enabled, priority, allowSecondarySearches}] of Object.entries(options.dictionaries)) {
            if (!enabled) { continue; }
            enabledDictionaryMap.set(title, {priority, allowSecondarySearches});
        }
        return enabledDictionaryMap;
    }

    _removeDuplicateDefinitions(definitions) {
        const definitionGroups = new Map();
        for (let i = 0, ii = definitions.length; i < ii; ++i) {
            const definition = definitions[i];
            const {id} = definition;
            const existing = definitionGroups.get(id);
            if (typeof existing === 'undefined') {
                definitionGroups.set(id, [i, definition]);
                continue;
            }

            let removeIndex = i;
            if (definition.expression.length > existing[1].expression.length) {
                definitionGroups.set(id, [i, definition]);
                removeIndex = existing[0];
            }

            definitions.splice(removeIndex, 1);
            --i;
            --ii;
        }
    }

    _compressDefinitionTags(definitions) {
        let lastDictionary = '';
        let lastPartOfSpeech = '';

        for (const definition of definitions) {
            const dictionary = JSON.stringify(definition.definitionTags.filter((tag) => tag.category === 'dictionary').map((tag) => tag.name).sort());
            const partOfSpeech = JSON.stringify(definition.definitionTags.filter((tag) => tag.category === 'partOfSpeech').map((tag) => tag.name).sort());

            const filterOutCategories = [];

            if (lastDictionary === dictionary) {
                filterOutCategories.push('dictionary');
            } else {
                lastDictionary = dictionary;
                lastPartOfSpeech = '';
            }

            if (lastPartOfSpeech === partOfSpeech) {
                filterOutCategories.push('partOfSpeech');
            } else {
                lastPartOfSpeech = partOfSpeech;
            }

            definition.definitionTags = definition.definitionTags.filter((tag) => !filterOutCategories.includes(tag.category));
        }
    }

    _groupTerms(definitions, dictionaries) {
        const groups = new Map();
        for (const definition of definitions) {
            const key = [definition.source, definition.expression, ...definition.reasons];
            if (definition.reading) {
                key.push(definition.reading);
            }

            const keyString = key.toString();
            let groupDefinitions = groups.get(keyString);
            if (typeof groupDefinitions === 'undefined') {
                groupDefinitions = [];
                groups.set(keyString, groupDefinitions);
            }

            groupDefinitions.push(definition);
        }

        const results = [];
        for (const groupDefinitions of groups.values()) {
            const firstDef = groupDefinitions[0];
            this._sortDefinitions(groupDefinitions, dictionaries);
            results.push({
                definitions: groupDefinitions,
                expression: firstDef.expression,
                reading: firstDef.reading,
                furiganaSegments: firstDef.furiganaSegments,
                reasons: firstDef.reasons,
                termTags: firstDef.termTags,
                score: groupDefinitions.reduce((p, v) => v.score > p ? v.score : p, Number.MIN_SAFE_INTEGER),
                source: firstDef.source
            });
        }

        return results;
    }

    _mergeByGlossary(result, definitions, appendTo=null, mergedIndices=null) {
        const definitionsByGlossary = appendTo !== null ? appendTo : new Map();

        const resultExpressionsMap = result.expressions;
        const resultExpressionSet = result.expression;
        const resultReadingSet = result.reading;
        const resultSource = result.source;

        for (let i = 0, ii = definitions.length; i < ii; ++i) {
            const definition = definitions[i];
            const {expression, reading} = definition;

            if (mergedIndices !== null) {
                const expressionMap = resultExpressionsMap.get(expression);
                if (
                    typeof expressionMap !== 'undefined' &&
                    typeof expressionMap.get(reading) !== 'undefined'
                ) {
                    mergedIndices.add(i);
                } else {
                    continue;
                }
            }

            const gloss = JSON.stringify(definition.glossary.concat(definition.dictionary));
            let glossDefinition = definitionsByGlossary.get(gloss);
            if (typeof glossDefinition === 'undefined') {
                glossDefinition = {
                    expression: new Set(),
                    reading: new Set(),
                    definitionTags: [],
                    glossary: definition.glossary,
                    source: resultSource,
                    reasons: [],
                    score: definition.score,
                    id: definition.id,
                    dictionary: definition.dictionary
                };
                definitionsByGlossary.set(gloss, glossDefinition);
            }

            glossDefinition.expression.add(expression);
            glossDefinition.reading.add(reading);

            resultExpressionSet.add(expression);
            resultReadingSet.add(reading);

            for (const tag of definition.definitionTags) {
                if (!glossDefinition.definitionTags.find((existingTag) => existingTag.name === tag.name)) {
                    glossDefinition.definitionTags.push(tag);
                }
            }

            if (appendTo === null) {
                /*
                    Data layout:
                    resultExpressionsMap = new Map([
                        [expression, new Map([
                            [reading, new Map([
                                [tagName, tagInfo],
                                ...
                            ])],
                            ...
                        ])],
                        ...
                    ]);
                */
                let readingMap = resultExpressionsMap.get(expression);
                if (typeof readingMap === 'undefined') {
                    readingMap = new Map();
                    resultExpressionsMap.set(expression, readingMap);
                }

                let termTagsMap = readingMap.get(reading);
                if (typeof termTagsMap === 'undefined') {
                    termTagsMap = new Map();
                    readingMap.set(reading, termTagsMap);
                }

                for (const tag of definition.termTags) {
                    if (!termTagsMap.has(tag.name)) {
                        termTagsMap.set(tag.name, tag);
                    }
                }
            }
        }

        for (const definition of definitionsByGlossary.values()) {
            const only = [];
            const expressionSet = definition.expression;
            const readingSet = definition.reading;
            if (!areSetsEqual(expressionSet, resultExpressionSet)) {
                only.push(...getSetIntersection(expressionSet, resultExpressionSet));
            }
            if (!areSetsEqual(readingSet, resultReadingSet)) {
                only.push(...getSetIntersection(readingSet, resultReadingSet));
            }
            definition.only = only;
        }

        return definitionsByGlossary;
    }

    _createDictionaryTag(name) {
        return this._createTag(name, 'dictionary', '', 100, 0, name);
    }

    _createTag(name, category, notes, order, score, dictionary) {
        return {
            name,
            category: (typeof category === 'string' && category.length > 0 ? category : 'default'),
            notes: (typeof notes === 'string' ? notes : ''),
            order: (typeof order === 'number' ? order : 0),
            score: (typeof score === 'number' ? score : 0),
            dictionary: (typeof dictionary === 'string' ? dictionary : null)
        };
    }

    _createKanjiStat(name, category, notes, order, score, dictionary, value) {
        return {
            name,
            category: (typeof category === 'string' && category.length > 0 ? category : 'default'),
            notes: (typeof notes === 'string' ? notes : ''),
            order: (typeof order === 'number' ? order : 0),
            score: (typeof score === 'number' ? score : 0),
            dictionary: (typeof dictionary === 'string' ? dictionary : null),
            value
        };
    }

    async _createTermDefinitionFromDatabaseDefinition(databaseDefinition, source, rawSource, reasons) {
        const {expression, reading, definitionTags, termTags, glossary, score, dictionary, id, sequence} = databaseDefinition;
        const termTagsExpanded = await this._expandTags(termTags, dictionary);
        const definitionTagsExpanded = await this._expandTags(definitionTags, dictionary);
        definitionTagsExpanded.push(this._createDictionaryTag(dictionary));

        this._sortTags(definitionTagsExpanded);
        this._sortTags(termTagsExpanded);

        const furiganaSegments = jp.distributeFurigana(expression, reading);

        return {
            source,
            rawSource,
            reasons,
            score,
            id,
            dictionary,
            expression,
            reading,
            furiganaSegments,
            glossary,
            definitionTags: definitionTagsExpanded,
            termTags: termTagsExpanded,
            sequence
        };
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

    _sortTags(tags) {
        if (tags.length <= 1) { return; }
        const stringComparer = this._stringComparer;
        tags.sort((v1, v2) => {
            const i = v1.order - v2.order;
            if (i !== 0) { return i; }

            return stringComparer.compare(v1.name, v2.name);
        });
    }

    _sortDefinitions(definitions, dictionaries) {
        if (definitions.length <= 1) { return; }
        const stringComparer = this._stringComparer;
        definitions.sort((v1, v2) => {
            let i;
            if (dictionaries !== null) {
                const dictionaryInfo1 = dictionaries.get(v1.dictionary);
                const dictionaryInfo2 = dictionaries.get(v2.dictionary);
                const priority1 = typeof dictionaryInfo1 !== 'undefined' ? dictionaryInfo1.priority : 0;
                const priority2 = typeof dictionaryInfo2 !== 'undefined' ? dictionaryInfo2.priority : 0;
                i = priority2 - priority1;
                if (i !== 0) { return i; }
            }

            i = v2.source.length - v1.source.length;
            if (i !== 0) { return i; }

            i = v1.reasons.length - v2.reasons.length;
            if (i !== 0) { return i; }

            i = v2.score - v1.score;
            if (i !== 0) { return i; }

            const expression1 = v1.expression;
            const expression2 = v2.expression;
            i = expression2.length - expression1.length;
            if (i !== 0) { return i; }

            return stringComparer.compare(expression1, expression2);
        });
    }

    _sortDatabaseDefinitionsByIndex(definitions) {
        if (definitions.length <= 1) { return; }
        definitions.sort((a, b) => a.index - b.index);
    }

    _sortKanjiStats(stats) {
        if (stats.length <= 1) { return; }
        const stringComparer = this._stringComparer;
        stats.sort((v1, v2) => {
            const i = v1.order - v2.order;
            if (i !== 0) { return i; }

            return stringComparer.compare(v1.notes, v2.notes);
        });
    }
}
