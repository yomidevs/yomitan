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

/**
 * Class which finds term and kanji definitions for text.
 */
class Translator {
    /**
     * Creates a new Translator instance.
     * @param database An instance of DictionaryDatabase.
     */
    constructor(database) {
        this._database = database;
        this._deinflector = null;
        this._tagCache = new Map();
        this._stringComparer = new Intl.Collator('en-US'); // Invariant locale
    }

    /**
     * Initializes the instance for use. The public API should not be used until
     * this function has been called.
     * @param deinflectionReasons The raw deinflections reasons data that the Deinflector uses.
     */
    prepare(deinflectionReasons) {
        this._deinflector = new Deinflector(deinflectionReasons);
    }

    /**
     * Clears the database tag cache. This should be executed if the database is changed.
     */
    clearDatabaseCaches() {
        this._tagCache.clear();
    }

    /**
     * Finds term definitions for the given text.
     * @param mode The mode to use for finding terms, which determines the format of the resulting array.
     * @param text The text to find terms for.
     * @param options An object using the following structure:
     *   {
     *     wildcard: (null or string),
     *     compactTags: (boolean),
     *     mainDictionary: (string),
     *     alphanumeric: (boolean),
     *     convertHalfWidthCharacters: (boolean),
     *     convertNumericCharacters: (boolean),
     *     convertAlphabeticCharacters: (boolean),
     *     convertHiraganaToKatakana: (boolean),
     *     convertKatakanaToHiragana: (boolean),
     *     collapseEmphaticSequences: (boolean),
     *     enabledDictionaryMap: (Map of [
     *       (string),
     *       {
     *         priority: (number),
     *         allowSecondarySearches: (boolean)
     *       }
     *     ])
     *   }
     * @returns An array of [definitions, textLength]. The structure of each definition depends on the
     *   mode parameter, see the _create?TermDefinition?() functions for structure details.
     */
    async findTerms(mode, text, options) {
        switch (mode) {
            case 'group':
                return await this._findTermsGrouped(text, options);
            case 'merge':
                return await this._findTermsMerged(text, options);
            case 'split':
                return await this._findTermsSplit(text, options);
            case 'simple':
                return await this._findTermsSimple(text, options);
            default:
                return [[], 0];
        }
    }

    /**
     * Finds kanji definitions for the given text.
     * @param text The text to find kanji definitions for. This string can be of any length,
     *   but is typically just one character, which is a single kanji. If the string is multiple
     *   characters long, each character will be searched in the database.
     * @param options An object using the following structure:
     *   {
     *     enabledDictionaryMap: (Map of [
     *       (string),
     *       {
     *         priority: (number)
     *       }
     *     ])
     *   }
     * @returns An array of definitions. See the _createKanjiDefinition() function for structure details.
     */
    async findKanji(text, options) {
        const {enabledDictionaryMap} = options;
        const kanjiUnique = new Set();
        for (const c of text) {
            kanjiUnique.add(c);
        }

        const databaseDefinitions = await this._database.findKanjiBulk([...kanjiUnique], enabledDictionaryMap);
        if (databaseDefinitions.length === 0) { return []; }

        this._sortDatabaseDefinitionsByIndex(databaseDefinitions);

        const definitions = [];
        for (const {character, onyomi, kunyomi, tags, glossary, stats, dictionary} of databaseDefinitions) {
            const expandedStats = await this._expandStats(stats, dictionary);
            const expandedTags = await this._expandTags(tags, dictionary);
            expandedTags.push(this._createDictionaryTag(dictionary));
            this._sortTags(expandedTags);

            const definition = this._createKanjiDefinition(character, dictionary, onyomi, kunyomi, glossary, expandedTags, expandedStats);
            definitions.push(definition);
        }

        await this._buildKanjiMeta(definitions, enabledDictionaryMap);

        return definitions;
    }

    // Private

    async _getSequencedDefinitions(definitions, mainDictionary, enabledDictionaryMap) {
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
                    const {reasons, source, rawSource} = definition;
                    sequencedDefinition = {
                        reasons,
                        score,
                        source,
                        rawSource,
                        dictionary,
                        definitions: []
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

        if (sequenceList.length > 0) {
            const databaseDefinitions = await this._database.findTermsBySequenceBulk(sequenceList, mainDictionary);
            for (const databaseDefinition of databaseDefinitions) {
                const {definitions: definitions2, source, rawSource, reasons} = sequencedDefinitions[databaseDefinition.index];
                const definition = await this._createTermDefinitionFromDatabaseDefinition(databaseDefinition, source, rawSource, reasons, enabledDictionaryMap);
                definitions2.push(definition);
            }
        }

        return {sequencedDefinitions, unsequencedDefinitions};
    }

    async _getMergedSecondarySearchResults(expressionsMap, secondarySearchDictionaryMap) {
        if (secondarySearchDictionaryMap.size === 0) {
            return [];
        }

        const expressionList = [];
        const readingList = [];
        for (const [expression, readingMap] of expressionsMap.entries()) {
            for (const reading of readingMap.keys()) {
                expressionList.push(expression);
                readingList.push(reading);
            }
        }

        const databaseDefinitions = await this._database.findTermsExactBulk(expressionList, readingList, secondarySearchDictionaryMap);
        this._sortDatabaseDefinitionsByIndex(databaseDefinitions);

        const definitions = [];
        for (const databaseDefinition of databaseDefinitions) {
            const source = expressionList[databaseDefinition.index];
            const definition = await this._createTermDefinitionFromDatabaseDefinition(databaseDefinition, source, source, [], secondarySearchDictionaryMap);
            definitions.push(definition);
        }

        return definitions;
    }

    async _getMergedDefinition(sequencedDefinition, unsequencedDefinitions, secondarySearchDictionaryMap, usedDefinitions) {
        const {reasons, score, source, rawSource, dictionary, definitions} = sequencedDefinition;
        const definitionDetailsMap = new Map();
        const glossaryDefinitions = [];
        const glossaryDefinitionGroupMap = new Map();

        this._mergeByGlossary(definitions, glossaryDefinitionGroupMap);
        this._addDefinitionDetails(definitions, definitionDetailsMap);

        let secondaryDefinitions = await this._getMergedSecondarySearchResults(definitionDetailsMap, secondarySearchDictionaryMap);
        secondaryDefinitions = [unsequencedDefinitions, ...secondaryDefinitions];

        this._removeUsedDefinitions(secondaryDefinitions, definitionDetailsMap, usedDefinitions);
        this._removeDuplicateDefinitions(secondaryDefinitions);

        this._mergeByGlossary(secondaryDefinitions, glossaryDefinitionGroupMap);

        const allExpressions = new Set();
        const allReadings = new Set();
        for (const {expressions, readings} of glossaryDefinitionGroupMap.values()) {
            for (const expression of expressions) { allExpressions.add(expression); }
            for (const reading of readings) { allReadings.add(reading); }
        }

        for (const {expressions, readings, definitions: definitions2} of glossaryDefinitionGroupMap.values()) {
            const glossaryDefinition = this._createMergedGlossaryTermDefinition(
                source,
                rawSource,
                definitions2,
                expressions,
                readings,
                allExpressions,
                allReadings
            );
            glossaryDefinitions.push(glossaryDefinition);
        }

        this._sortDefinitions(glossaryDefinitions, true);

        const expressionDetailsList = [];
        for (const [expression, readingMap] of definitionDetailsMap.entries()) {
            for (const [reading, termTagsMap] of readingMap.entries()) {
                const termTags = [...termTagsMap.values()];
                this._sortTags(termTags);
                expressionDetailsList.push(this._createExpressionDetails(expression, reading, termTags));
            }
        }

        return this._createMergedTermDefinition(
            source,
            rawSource,
            glossaryDefinitions,
            [...allExpressions],
            [...allReadings],
            expressionDetailsList,
            reasons,
            dictionary,
            score
        );
    }

    _removeUsedDefinitions(definitions, definitionDetailsMap, usedDefinitions) {
        for (let i = 0, ii = definitions.length; i < ii; ++i) {
            const definition = definitions[i];
            const {expression, reading} = definition;
            const expressionMap = definitionDetailsMap.get(expression);
            if (
                typeof expressionMap !== 'undefined' &&
                typeof expressionMap.get(reading) !== 'undefined'
            ) {
                usedDefinitions.add(definition);
            } else {
                definitions.splice(i, 1);
                --i;
                --ii;
            }
        }
    }

    _getUniqueDefinitionTags(definitions) {
        const definitionTagsMap = new Map();
        for (const {definitionTags} of definitions) {
            for (const tag of definitionTags) {
                const {name} = tag;
                if (definitionTagsMap.has(name)) { continue; }
                definitionTagsMap.set(name, this._cloneTag(tag));
            }
        }
        return [...definitionTagsMap.values()];
    }

    _getTermTagsScoreSum(termTags) {
        let result = 0;
        for (const {score} of termTags) { result += score; }
        return result;
    }

    async _findTermsGrouped(text, options) {
        const {compactTags, enabledDictionaryMap} = options;
        const [definitions, length] = await this._findTermsInternal(text, enabledDictionaryMap, options);

        const groupedDefinitions = this._groupTerms(definitions, enabledDictionaryMap);
        await this._buildTermMeta(groupedDefinitions, enabledDictionaryMap);
        this._sortDefinitions(groupedDefinitions, false);

        if (compactTags) {
            for (const definition of groupedDefinitions) {
                this._compressDefinitionTags(definition.definitions);
            }
        }

        return [groupedDefinitions, length];
    }

    async _findTermsMerged(text, options) {
        const {compactTags, mainDictionary, enabledDictionaryMap} = options;
        const secondarySearchDictionaryMap = this._getSecondarySearchDictionaryMap(enabledDictionaryMap);

        const [definitions, length] = await this._findTermsInternal(text, enabledDictionaryMap, options);
        const {sequencedDefinitions, unsequencedDefinitions} = await this._getSequencedDefinitions(definitions, mainDictionary, enabledDictionaryMap);
        const definitionsMerged = [];
        const usedDefinitions = new Set();

        for (const sequencedDefinition of sequencedDefinitions) {
            const result = await this._getMergedDefinition(
                sequencedDefinition,
                unsequencedDefinitions,
                secondarySearchDictionaryMap,
                usedDefinitions
            );
            definitionsMerged.push(result);
        }

        const unusedDefinitions = unsequencedDefinitions.filter((definition) => !usedDefinitions.has(definition));
        for (const groupedDefinition of this._groupTerms(unusedDefinitions, enabledDictionaryMap)) {
            const {reasons, score, expression, reading, source, rawSource, dictionary, termTags} = groupedDefinition;
            const expressionDetails = this._createExpressionDetails(expression, reading, termTags);
            const compatibilityDefinition = this._createMergedTermDefinition(
                source,
                rawSource,
                definitions,
                [expression],
                [reading],
                [expressionDetails],
                reasons,
                dictionary,
                score
            );
            definitionsMerged.push(compatibilityDefinition);
        }

        await this._buildTermMeta(definitionsMerged, enabledDictionaryMap);
        this._sortDefinitions(definitionsMerged, false);

        if (compactTags) {
            for (const definition of definitionsMerged) {
                this._compressDefinitionTags(definition.definitions);
            }
        }

        return [definitionsMerged, length];
    }

    async _findTermsSplit(text, options) {
        const {enabledDictionaryMap} = options;
        const [definitions, length] = await this._findTermsInternal(text, enabledDictionaryMap, options);
        await this._buildTermMeta(definitions, enabledDictionaryMap);
        this._sortDefinitions(definitions, true);
        return [definitions, length];
    }

    async _findTermsSimple(text, options) {
        const {enabledDictionaryMap} = options;
        const [definitions, length] = await this._findTermsInternal(text, enabledDictionaryMap, options);
        this._sortDefinitions(definitions, false);
        return [definitions, length];
    }

    async _findTermsInternal(text, enabledDictionaryMap, options) {
        const {alphanumeric, wildcard} = options;
        text = this._getSearchableText(text, alphanumeric);
        if (text.length === 0) {
            return [[], 0];
        }

        const deinflections = (
            wildcard ?
            await this._findTermWildcard(text, enabledDictionaryMap, wildcard) :
            await this._findTermDeinflections(text, enabledDictionaryMap, options)
        );

        let maxLength = 0;
        const definitions = [];
        for (const {databaseDefinitions, source, rawSource, reasons} of deinflections) {
            if (databaseDefinitions.length === 0) { continue; }
            maxLength = Math.max(maxLength, rawSource.length);
            for (const databaseDefinition of databaseDefinitions) {
                const definition = await this._createTermDefinitionFromDatabaseDefinition(databaseDefinition, source, rawSource, reasons, enabledDictionaryMap);
                definitions.push(definition);
            }
        }

        this._removeDuplicateDefinitions(definitions);
        return [definitions, maxLength];
    }

    async _findTermWildcard(text, enabledDictionaryMap, wildcard) {
        const databaseDefinitions = await this._database.findTermsBulk([text], enabledDictionaryMap, wildcard);
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

    async _findTermDeinflections(text, enabledDictionaryMap, options) {
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

        const databaseDefinitions = await this._database.findTermsBulk(uniqueDeinflectionTerms, enabledDictionaryMap, null);

        for (const databaseDefinition of databaseDefinitions) {
            const definitionRules = Deinflector.rulesToRuleFlags(databaseDefinition.rules);
            for (const deinflection of uniqueDeinflectionArrays[databaseDefinition.index]) {
                const deinflectionRules = deinflection.rules;
                if (deinflectionRules === 0 || (definitionRules & deinflectionRules) !== 0) {
                    deinflection.databaseDefinitions.push(databaseDefinition);
                }
            }
        }

        return deinflections;
    }

    _getAllDeinflections(text, options) {
        const collapseEmphaticOptions = [[false, false]];
        switch (options.collapseEmphaticSequences) {
            case 'true':
                collapseEmphaticOptions.push([true, false]);
                break;
            case 'full':
                collapseEmphaticOptions.push([true, false], [true, true]);
                break;
        }
        const textOptionVariantArray = [
            this._getTextOptionEntryVariants(options.convertHalfWidthCharacters),
            this._getTextOptionEntryVariants(options.convertNumericCharacters),
            this._getTextOptionEntryVariants(options.convertAlphabeticCharacters),
            this._getTextOptionEntryVariants(options.convertHiraganaToKatakana),
            this._getTextOptionEntryVariants(options.convertKatakanaToHiragana),
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

    async _buildTermMeta(definitions, enabledDictionaryMap) {
        const terms = [];
        for (const definition of definitions) {
            switch (definition.type) {
                case 'term':
                case 'termGrouped':
                    terms.push(definition);
                    break;
                case 'termMerged':
                    terms.push(...definition.expressions);
                    break;
            }
        }

        if (terms.length === 0) {
            return;
        }

        // Create mapping of unique terms
        const expressionsUnique = [];
        const termsUnique = [];
        const termsUniqueMap = new Map();
        for (const term of terms) {
            const {expression} = term;
            let termList = termsUniqueMap.get(expression);
            if (typeof termList === 'undefined') {
                termList = [];
                expressionsUnique.push(expression);
                termsUnique.push(termList);
                termsUniqueMap.set(expression, termList);
            }
            termList.push(term);
        }

        const metas = await this._database.findTermMetaBulk(expressionsUnique, enabledDictionaryMap);
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

    async _buildKanjiMeta(definitions, enabledDictionaryMap) {
        const kanjiList = [];
        for (const {character} of definitions) {
            kanjiList.push(character);
        }

        const metas = await this._database.findKanjiMetaBulk(kanjiList, enabledDictionaryMap);
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

    _getSearchableText(text, allowAlphanumericCharacters) {
        if (allowAlphanumericCharacters) {
            return text;
        }

        let newText = '';
        for (const c of text) {
            if (!jp.isCodePointJapanese(c.codePointAt(0))) {
                break;
            }
            newText += c;
        }
        return newText;
    }

    _getSecondarySearchDictionaryMap(enabledDictionaryMap) {
        const secondarySearchDictionaryMap = new Map();
        for (const [title, dictionary] of enabledDictionaryMap.entries()) {
            if (!dictionary.allowSecondarySearches) { continue; }
            secondarySearchDictionaryMap.set(title, dictionary);
        }
        return secondarySearchDictionaryMap;
    }

    _getDictionaryPriority(dictionary, enabledDictionaryMap) {
        const info = enabledDictionaryMap.get(dictionary);
        return typeof info !== 'undefined' ? info.priority : 0;
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
        const removeCategoriesSet = new Set();

        for (const {definitionTags} of definitions) {
            const dictionary = this._createMapKey(this._getTagNamesWithCategory(definitionTags, 'dictionary'));
            const partOfSpeech = this._createMapKey(this._getTagNamesWithCategory(definitionTags, 'partOfSpeech'));

            if (lastDictionary === dictionary) {
                removeCategoriesSet.add('dictionary');
            } else {
                lastDictionary = dictionary;
                lastPartOfSpeech = '';
            }

            if (lastPartOfSpeech === partOfSpeech) {
                removeCategoriesSet.add('partOfSpeech');
            } else {
                lastPartOfSpeech = partOfSpeech;
            }

            if (removeCategoriesSet.size > 0) {
                this._removeTagsWithCategory(definitionTags, removeCategoriesSet);
                removeCategoriesSet.clear();
            }
        }
    }

    _getTagNamesWithCategory(tags, category) {
        const results = [];
        for (const tag of tags) {
            if (tag.category !== category) { continue; }
            results.push(tag.name);
        }
        results.sort();
        return results;
    }

    _removeTagsWithCategory(tags, removeCategoriesSet) {
        for (let i = 0, ii = tags.length; i < ii; ++i) {
            const {category} = tags[i];
            if (!removeCategoriesSet.has(category)) { continue; }
            tags.splice(i, 1);
            --i;
            --ii;
        }
    }

    _groupTerms(definitions) {
        const groups = new Map();
        for (const definition of definitions) {
            const key = this._createMapKey([definition.source, definition.expression, definition.reading, ...definition.reasons]);
            let groupDefinitions = groups.get(key);
            if (typeof groupDefinitions === 'undefined') {
                groupDefinitions = [];
                groups.set(key, groupDefinitions);
            }

            groupDefinitions.push(definition);
        }

        const results = [];
        for (const groupDefinitions of groups.values()) {
            this._sortDefinitions(groupDefinitions, true);
            const definition = this._createGroupedTermDefinition(groupDefinitions);
            results.push(definition);
        }

        return results;
    }

    _mergeByGlossary(definitions, glossaryDefinitionGroupMap) {
        for (const definition of definitions) {
            const {expression, reading, dictionary, glossary} = definition;

            const key = this._createMapKey([dictionary, ...glossary]);
            let group = glossaryDefinitionGroupMap.get(key);
            if (typeof group === 'undefined') {
                group = {
                    expressions: new Set(),
                    readings: new Set(),
                    definitions: []
                };
                glossaryDefinitionGroupMap.set(key, group);
            }

            group.expressions.add(expression);
            group.readings.add(reading);
            group.definitions.push(definition);
        }
    }

    _addDefinitionDetails(definitions, definitionDetailsMap) {
        for (const {expression, reading, termTags} of definitions) {
            let readingMap = definitionDetailsMap.get(expression);
            if (typeof readingMap === 'undefined') {
                readingMap = new Map();
                definitionDetailsMap.set(expression, readingMap);
            }

            let termTagsMap = readingMap.get(reading);
            if (typeof termTagsMap === 'undefined') {
                termTagsMap = new Map();
                readingMap.set(reading, termTagsMap);
            }

            for (const tag of termTags) {
                const {name} = tag;
                if (termTagsMap.has(name)) { continue; }
                termTagsMap.set(name, this._cloneTag(tag));
            }
        }
    }

    _getMaxDefinitionScore(definitions) {
        let result = Number.MIN_SAFE_INTEGER;
        for (const {score} of definitions) {
            if (score > result) { result = score; }
        }
        return result;
    }

    _getMaxDictionaryPriority(definitions) {
        let result = Number.MIN_SAFE_INTEGER;
        for (const {dictionaryPriority} of definitions) {
            if (dictionaryPriority > result) { result = dictionaryPriority; }
        }
        return result;
    }

    _cloneTag(tag) {
        const {name, category, notes, order, score, dictionary} = tag;
        return this._createTag(name, category, notes, order, score, dictionary);
    }

    _cloneTags(tags) {
        const results = [];
        for (const tag of tags) {
            results.push(this._cloneTag(tag));
        }
        return results;
    }

    _createMapKey(array) {
        return JSON.stringify(array);
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

    _createKanjiDefinition(character, dictionary, onyomi, kunyomi, glossary, tags, stats) {
        return {
            type: 'kanji',
            character,
            dictionary,
            onyomi,
            kunyomi,
            glossary,
            tags,
            stats,
            frequencies: []
        };
    }

    async _createTermDefinitionFromDatabaseDefinition(databaseDefinition, source, rawSource, reasons, enabledDictionaryMap) {
        const {expression, reading, definitionTags, termTags, glossary, score, dictionary, id, sequence} = databaseDefinition;
        const dictionaryPriority = this._getDictionaryPriority(dictionary, enabledDictionaryMap);
        const termTagsExpanded = await this._expandTags(termTags, dictionary);
        const definitionTagsExpanded = await this._expandTags(definitionTags, dictionary);
        definitionTagsExpanded.push(this._createDictionaryTag(dictionary));

        this._sortTags(definitionTagsExpanded);
        this._sortTags(termTagsExpanded);

        const furiganaSegments = jp.distributeFurigana(expression, reading);

        return {
            type: 'term',
            id,
            source,
            rawSource,
            reasons,
            score,
            sequence,
            dictionary,
            dictionaryPriority,
            expression,
            reading,
            // expressions
            furiganaSegments,
            glossary,
            definitionTags: definitionTagsExpanded,
            termTags: termTagsExpanded,
            // definitions
            frequencies: [],
            pitches: []
            // only
        };
    }

    _createGroupedTermDefinition(definitions) {
        const {expression, reading, furiganaSegments, reasons, termTags, source, rawSource} = definitions[0];
        const score = this._getMaxDefinitionScore(definitions);
        const dictionaryPriority = this._getMaxDictionaryPriority(definitions);
        return {
            type: 'termGrouped',
            // id
            source,
            rawSource,
            reasons: [...reasons],
            score,
            // sequence
            // dictionary
            dictionaryPriority,
            expression,
            reading,
            // expressions
            furiganaSegments, // Contains duplicate data
            // glossary
            // definitionTags
            termTags: this._cloneTags(termTags),
            definitions, // type: 'term'
            frequencies: [],
            pitches: []
            // only
        };
    }

    _createMergedTermDefinition(source, rawSource, definitions, expressions, readings, expressionDetailsList, reasons, dictionary, score) {
        const dictionaryPriority = this._getMaxDictionaryPriority(definitions);
        return {
            type: 'termMerged',
            // id
            source,
            rawSource,
            reasons,
            score,
            // sequence
            dictionary,
            dictionaryPriority,
            expression: expressions,
            reading: readings,
            expressions: expressionDetailsList,
            // furiganaSegments
            // glossary
            // definitionTags
            // termTags
            definitions, // type: 'termMergedByGlossary'
            frequencies: [],
            pitches: []
            // only
        };
    }

    _createMergedGlossaryTermDefinition(source, rawSource, definitions, expressions, readings, allExpressions, allReadings) {
        const only = [];
        if (!areSetsEqual(expressions, allExpressions)) {
            only.push(...getSetIntersection(expressions, allExpressions));
        }
        if (!areSetsEqual(readings, allReadings)) {
            only.push(...getSetIntersection(readings, allReadings));
        }

        const definitionTags = this._getUniqueDefinitionTags(definitions);
        this._sortTags(definitionTags);

        const {glossary, dictionary} = definitions[0];
        const score = this._getMaxDefinitionScore(definitions);
        const dictionaryPriority = this._getMaxDictionaryPriority(definitions);
        return {
            type: 'termMergedByGlossary',
            // id
            source,
            rawSource,
            reasons: [],
            score,
            // sequence
            dictionary,
            dictionaryPriority,
            expression: [...expressions],
            reading: [...readings],
            // expressions
            // furiganaSegments
            glossary: [...glossary],
            definitionTags,
            // termTags
            definitions, // type: 'term'; contains duplicate data
            frequencies: [],
            pitches: [],
            only
        };
    }

    _createExpressionDetails(expression, reading, termTags) {
        const termFrequency = this._scoreToTermFrequency(this._getTermTagsScoreSum(termTags));
        const furiganaSegments = jp.distributeFurigana(expression, reading);
        return {
            expression,
            reading,
            furiganaSegments,
            termTags,
            termFrequency,
            frequencies: [],
            pitches: []
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

    _sortDefinitions(definitions, useDictionaryPriority) {
        if (definitions.length <= 1) { return; }
        const stringComparer = this._stringComparer;
        const compareFunction1 = (v1, v2) => {
            let i = v2.source.length - v1.source.length;
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
        };
        const compareFunction2 = (v1, v2) => {
            const i = v2.dictionaryPriority - v1.dictionaryPriority;
            return (i !== 0) ? i : compareFunction1(v1, v2);
        };
        definitions.sort(useDictionaryPriority ? compareFunction2 : compareFunction1);
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
