/*
 * Copyright (C) 2016-2021  Yomichan Authors
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
 */

/**
 * Class which finds term and kanji definitions for text.
 */
class Translator {
    /**
     * Creates a new Translator instance.
     * @param database An instance of DictionaryDatabase.
     */
    constructor({japaneseUtil, database}) {
        this._japaneseUtil = japaneseUtil;
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
     *   One of: 'group', 'merge', 'split', 'simple'
     * @param text The text to find terms for.
     * @param options An object using the following structure:
     *   {
     *     wildcard: (enum: null, 'prefix', 'suffix'),
     *     mainDictionary: (string),
     *     alphanumeric: (boolean),
     *     convertHalfWidthCharacters: (enum: 'false', 'true', 'variant'),
     *     convertNumericCharacters: (enum: 'false', 'true', 'variant'),
     *     convertAlphabeticCharacters: (enum: 'false', 'true', 'variant'),
     *     convertHiraganaToKatakana: (enum: 'false', 'true', 'variant'),
     *     convertKatakanaToHiragana: (enum: 'false', 'true', 'variant'),
     *     collapseEmphaticSequences: (enum: 'false', 'true', 'full'),
     *     textReplacements: [
     *       (null or [
     *         {pattern: (RegExp), replacement: (string)}
     *         ...
     *       ])
     *       ...
     *     ],
     *     enabledDictionaryMap: (Map of [
     *       (string),
     *       {
     *         order: (number),
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
     *         order: (number)
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
            this._sortTags(expandedTags);

            const definition = this._createKanjiDefinition(character, dictionary, onyomi, kunyomi, glossary, expandedTags, expandedStats);
            definitions.push(definition);
        }

        await this._buildKanjiMeta(definitions, enabledDictionaryMap);

        return definitions;
    }

    // Find terms core functions

    async _findTermsSimple(text, options) {
        const {enabledDictionaryMap} = options;
        const [definitions, length] = await this._findTermsInternal(text, enabledDictionaryMap, options);
        this._sortDefinitions(definitions);
        return [definitions, length];
    }

    async _findTermsSplit(text, options) {
        const {enabledDictionaryMap} = options;
        const [definitions, length] = await this._findTermsInternal(text, enabledDictionaryMap, options);
        await this._buildTermMeta(definitions, enabledDictionaryMap);
        this._sortDefinitions(definitions);
        return [definitions, length];
    }

    async _findTermsGrouped(text, options) {
        const {enabledDictionaryMap} = options;
        const [definitions, length] = await this._findTermsInternal(text, enabledDictionaryMap, options);

        const groupedDefinitions = this._groupTerms(definitions, enabledDictionaryMap);
        await this._buildTermMeta(groupedDefinitions, enabledDictionaryMap);
        this._sortDefinitions(groupedDefinitions);

        for (const definition of groupedDefinitions) {
            this._flagRedundantDefinitionTags(definition.definitions);
        }

        return [groupedDefinitions, length];
    }

    async _findTermsMerged(text, options) {
        const {mainDictionary, enabledDictionaryMap} = options;
        const secondarySearchDictionaryMap = this._getSecondarySearchDictionaryMap(enabledDictionaryMap);

        const [definitions, length] = await this._findTermsInternal(text, enabledDictionaryMap, options);
        const {sequencedDefinitions, unsequencedDefinitions} = await this._getSequencedDefinitions(definitions, mainDictionary, enabledDictionaryMap);
        const definitionsMerged = [];
        const usedDefinitions = new Set();

        for (const {sourceDefinitions, relatedDefinitions} of sequencedDefinitions) {
            const result = await this._getMergedDefinition(
                sourceDefinitions,
                relatedDefinitions,
                unsequencedDefinitions,
                secondarySearchDictionaryMap,
                usedDefinitions
            );
            definitionsMerged.push(result);
        }

        const unusedDefinitions = unsequencedDefinitions.filter((definition) => !usedDefinitions.has(definition));
        for (const groupedDefinition of this._groupTerms(unusedDefinitions, enabledDictionaryMap)) {
            const {reasons, score, expression, reading, source, rawSource, sourceTerm, furiganaSegments, termTags, definitions: definitions2} = groupedDefinition;
            const termDetailsList = [this._createTermDetails(sourceTerm, expression, reading, furiganaSegments, termTags)];
            const compatibilityDefinition = this._createMergedTermDefinition(
                source,
                rawSource,
                this._convertTermDefinitionsToMergedGlossaryTermDefinitions(definitions2),
                [expression],
                [reading],
                termDetailsList,
                reasons,
                score
            );
            definitionsMerged.push(compatibilityDefinition);
        }

        await this._buildTermMeta(definitionsMerged, enabledDictionaryMap);
        this._sortDefinitions(definitionsMerged);

        for (const definition of definitionsMerged) {
            this._flagRedundantDefinitionTags(definition.definitions);
        }

        return [definitionsMerged, length];
    }

    // Find terms internal implementation

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
        for (const {databaseDefinitions, source, rawSource, term, reasons} of deinflections) {
            if (databaseDefinitions.length === 0) { continue; }
            maxLength = Math.max(maxLength, rawSource.length);
            for (const databaseDefinition of databaseDefinitions) {
                const definition = await this._createTermDefinitionFromDatabaseDefinition(databaseDefinition, source, rawSource, term, reasons, true, enabledDictionaryMap);
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
        const textOptionVariantArray = [
            this._getTextReplacementsVariants(options),
            this._getTextOptionEntryVariants(options.convertHalfWidthCharacters),
            this._getTextOptionEntryVariants(options.convertNumericCharacters),
            this._getTextOptionEntryVariants(options.convertAlphabeticCharacters),
            this._getTextOptionEntryVariants(options.convertHiraganaToKatakana),
            this._getTextOptionEntryVariants(options.convertKatakanaToHiragana),
            this._getCollapseEmphaticOptions(options)
        ];

        const jp = this._japaneseUtil;
        const deinflections = [];
        const used = new Set();
        for (const [textReplacements, halfWidth, numeric, alphabetic, katakana, hiragana, [collapseEmphatic, collapseEmphaticFull]] of this._getArrayVariants(textOptionVariantArray)) {
            let text2 = text;
            const sourceMap = new TextSourceMap(text2);
            if (textReplacements !== null) {
                text2 = this._applyTextReplacements(text2, sourceMap, textReplacements);
            }
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

    /**
     * @param definitions An array of 'term' definitions.
     * @param mainDictionary The name of the main dictionary.
     * @param enabledDictionaryMap The map of enabled dictionaries and their settings.
     */
    async _getSequencedDefinitions(definitions, mainDictionary, enabledDictionaryMap) {
        const sequenceList = [];
        const sequencedDefinitionMap = new Map();
        const sequencedDefinitions = [];
        const unsequencedDefinitions = [];
        for (const definition of definitions) {
            const {sequence, dictionary} = definition;
            if (mainDictionary === dictionary && sequence >= 0) {
                let sequencedDefinition = sequencedDefinitionMap.get(sequence);
                if (typeof sequencedDefinition === 'undefined') {
                    sequencedDefinition = {
                        sourceDefinitions: [],
                        relatedDefinitions: [],
                        relatedDefinitionIds: new Set()
                    };
                    sequencedDefinitionMap.set(sequence, sequencedDefinition);
                    sequencedDefinitions.push(sequencedDefinition);
                    sequenceList.push(sequence);
                }
                sequencedDefinition.sourceDefinitions.push(definition);
                sequencedDefinition.relatedDefinitions.push(definition);
                sequencedDefinition.relatedDefinitionIds.add(definition.id);
            } else {
                unsequencedDefinitions.push(definition);
            }
        }

        if (sequenceList.length > 0) {
            const databaseDefinitions = await this._database.findTermsBySequenceBulk(sequenceList, mainDictionary);
            for (const databaseDefinition of databaseDefinitions) {
                const {relatedDefinitions, relatedDefinitionIds} = sequencedDefinitions[databaseDefinition.index];
                const {id} = databaseDefinition;
                if (relatedDefinitionIds.has(id)) { continue; }

                const {source, rawSource, sourceTerm} = relatedDefinitions[0];
                const definition = await this._createTermDefinitionFromDatabaseDefinition(databaseDefinition, source, rawSource, sourceTerm, [], false, enabledDictionaryMap);
                relatedDefinitions.push(definition);
            }
        }

        for (const {relatedDefinitions} of sequencedDefinitions) {
            this._sortDefinitionsById(relatedDefinitions);
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
            const definition = await this._createTermDefinitionFromDatabaseDefinition(databaseDefinition, source, source, source, [], false, secondarySearchDictionaryMap);
            definitions.push(definition);
        }

        return definitions;
    }

    async _getMergedDefinition(sourceDefinitions, relatedDefinitions, unsequencedDefinitions, secondarySearchDictionaryMap, usedDefinitions) {
        const {reasons, source, rawSource} = sourceDefinitions[0];
        const score = this._getMaxDefinitionScore(sourceDefinitions);
        const termInfoMap = new Map();
        const glossaryDefinitions = [];
        const glossaryDefinitionGroupMap = new Map();

        this._mergeByGlossary(relatedDefinitions, glossaryDefinitionGroupMap);
        this._addUniqueTermInfos(relatedDefinitions, termInfoMap);

        let secondaryDefinitions = await this._getMergedSecondarySearchResults(termInfoMap, secondarySearchDictionaryMap);
        secondaryDefinitions = [...unsequencedDefinitions, ...secondaryDefinitions];

        this._removeUsedDefinitions(secondaryDefinitions, termInfoMap, usedDefinitions);
        this._removeDuplicateDefinitions(secondaryDefinitions);

        this._mergeByGlossary(secondaryDefinitions, glossaryDefinitionGroupMap);

        const allExpressions = new Set();
        const allReadings = new Set();
        for (const {expressions, readings} of glossaryDefinitionGroupMap.values()) {
            for (const expression of expressions) { allExpressions.add(expression); }
            for (const reading of readings) { allReadings.add(reading); }
        }

        for (const {expressions, readings, definitions} of glossaryDefinitionGroupMap.values()) {
            const glossaryDefinition = this._createMergedGlossaryTermDefinition(
                source,
                rawSource,
                definitions,
                expressions,
                readings,
                allExpressions,
                allReadings
            );
            glossaryDefinitions.push(glossaryDefinition);
        }

        this._sortDefinitions(glossaryDefinitions);

        const termDetailsList = this._createTermDetailsListFromTermInfoMap(termInfoMap);

        return this._createMergedTermDefinition(
            source,
            rawSource,
            glossaryDefinitions,
            [...allExpressions],
            [...allReadings],
            termDetailsList,
            reasons,
            score
        );
    }

    _removeUsedDefinitions(definitions, termInfoMap, usedDefinitions) {
        for (let i = 0, ii = definitions.length; i < ii; ++i) {
            const definition = definitions[i];
            const {expression, reading} = definition;
            const expressionMap = termInfoMap.get(expression);
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
            if (definition.source.length > existing[1].source.length) {
                definitionGroups.set(id, [i, definition]);
                removeIndex = existing[0];
            }

            definitions.splice(removeIndex, 1);
            --i;
            --ii;
        }
    }

    _flagRedundantDefinitionTags(definitions) {
        let lastDictionary = null;
        let lastPartOfSpeech = '';
        const removeCategoriesSet = new Set();

        for (const {dictionary, definitionTags} of definitions) {
            const partOfSpeech = this._createMapKey(this._getTagNamesWithCategory(definitionTags, 'partOfSpeech'));

            if (lastDictionary !== dictionary) {
                lastDictionary = dictionary;
                lastPartOfSpeech = '';
            }

            if (lastPartOfSpeech === partOfSpeech) {
                removeCategoriesSet.add('partOfSpeech');
            } else {
                lastPartOfSpeech = partOfSpeech;
            }

            if (removeCategoriesSet.size > 0) {
                this._flagTagsWithCategoryAsRedundant(definitionTags, removeCategoriesSet);
                removeCategoriesSet.clear();
            }
        }
    }

    /**
     * Groups definitions with the same [source, expression, reading, reasons].
     * @param definitions An array of 'term' definitions.
     * @returns An array of 'termGrouped' definitions.
     */
    _groupTerms(definitions) {
        const groups = new Map();
        for (const definition of definitions) {
            const {source, reasons, expressions: [{expression, reading}]} = definition;
            const key = this._createMapKey([source, expression, reading, ...reasons]);
            let groupDefinitions = groups.get(key);
            if (typeof groupDefinitions === 'undefined') {
                groupDefinitions = [];
                groups.set(key, groupDefinitions);
            }

            groupDefinitions.push(definition);
        }

        const results = [];
        for (const groupDefinitions of groups.values()) {
            this._sortDefinitions(groupDefinitions);
            const definition = this._createGroupedTermDefinition(groupDefinitions);
            results.push(definition);
        }

        return results;
    }

    _mergeByGlossary(definitions, glossaryDefinitionGroupMap) {
        for (const definition of definitions) {
            const {expression, reading, dictionary, glossary, id} = definition;

            const key = this._createMapKey([dictionary, ...glossary]);
            let group = glossaryDefinitionGroupMap.get(key);
            if (typeof group === 'undefined') {
                group = {
                    expressions: new Set(),
                    readings: new Set(),
                    definitions: [],
                    definitionIds: new Set()
                };
                glossaryDefinitionGroupMap.set(key, group);
            }

            const {definitionIds} = group;
            if (definitionIds.has(id)) { continue; }
            definitionIds.add(id);
            group.expressions.add(expression);
            group.readings.add(reading);
            group.definitions.push(definition);
        }
    }

    _addUniqueTermInfos(definitions, termInfoMap) {
        for (const {expression, reading, sourceTerm, furiganaSegments, termTags} of definitions) {
            let readingMap = termInfoMap.get(expression);
            if (typeof readingMap === 'undefined') {
                readingMap = new Map();
                termInfoMap.set(expression, readingMap);
            }

            let termInfo = readingMap.get(reading);
            if (typeof termInfo === 'undefined') {
                termInfo = {
                    sourceTerm,
                    furiganaSegments,
                    termTagsMap: new Map()
                };
                readingMap.set(reading, termInfo);
            }

            const {termTagsMap} = termInfo;
            for (const tag of termTags) {
                const {name} = tag;
                if (termTagsMap.has(name)) { continue; }
                termTagsMap.set(name, this._cloneTag(tag));
            }
        }
    }

    _convertTermDefinitionsToMergedGlossaryTermDefinitions(definitions) {
        const convertedDefinitions = [];
        for (const definition of definitions) {
            const {source, rawSource, expression, reading} = definition;
            const expressions = new Set([expression]);
            const readings = new Set([reading]);
            const convertedDefinition = this._createMergedGlossaryTermDefinition(source, rawSource, [definition], expressions, readings, expressions, readings);
            convertedDefinitions.push(convertedDefinition);
        }
        return convertedDefinitions;
    }

    // Metadata building

    async _buildTermMeta(definitions, enabledDictionaryMap) {
        const allDefinitions = this._getAllDefinitions(definitions);
        const expressionMap = new Map();
        const expressionValues = [];
        const expressionKeys = [];

        for (const {expressions, frequencies: frequencies1, pitches: pitches1} of allDefinitions) {
            for (let i = 0, ii = expressions.length; i < ii; ++i) {
                const {expression, reading, frequencies: frequencies2, pitches: pitches2} = expressions[i];
                let readingMap = expressionMap.get(expression);
                if (typeof readingMap === 'undefined') {
                    readingMap = new Map();
                    expressionMap.set(expression, readingMap);
                    expressionValues.push(readingMap);
                    expressionKeys.push(expression);
                }
                let targets = readingMap.get(reading);
                if (typeof targets === 'undefined') {
                    targets = [];
                    readingMap.set(reading, targets);
                }
                targets.push(
                    {frequencies: frequencies1, pitches: pitches1, index: i},
                    {frequencies: frequencies2, pitches: pitches2, index: i}
                );
            }
        }

        const metas = await this._database.findTermMetaBulk(expressionKeys, enabledDictionaryMap);
        for (const {expression, mode, data, dictionary, index} of metas) {
            const dictionaryOrder = this._getDictionaryOrder(dictionary, enabledDictionaryMap);
            const map2 = expressionValues[index];
            for (const [reading, targets] of map2.entries()) {
                switch (mode) {
                    case 'freq':
                        {
                            let frequency = data;
                            const hasReading = (data !== null && typeof data === 'object');
                            if (hasReading) {
                                if (data.reading !== reading) { continue; }
                                frequency = data.frequency;
                            }
                            for (const {frequencies, index: expressionIndex} of targets) {
                                frequencies.push({index: frequencies.length, expressionIndex, dictionary, dictionaryOrder, expression, reading, hasReading, frequency});
                            }
                        }
                        break;
                    case 'pitch':
                        {
                            if (data.reading !== reading) { continue; }
                            const pitches2 = [];
                            for (let {position, tags} of data.pitches) {
                                tags = Array.isArray(tags) ? await this._expandTags(tags, dictionary) : [];
                                pitches2.push({position, tags});
                            }
                            for (const {pitches, index: expressionIndex} of targets) {
                                pitches.push({index: pitches.length, expressionIndex, dictionary, dictionaryOrder, expression, reading, pitches: pitches2});
                            }
                        }
                        break;
                }
            }
        }

        for (const definition of allDefinitions) {
            this._sortTermDefinitionMeta(definition);
        }
    }

    async _buildKanjiMeta(definitions, enabledDictionaryMap) {
        const kanjiList = [];
        for (const {character} of definitions) {
            kanjiList.push(character);
        }

        const metas = await this._database.findKanjiMetaBulk(kanjiList, enabledDictionaryMap);
        for (const {character, mode, data, dictionary, index} of metas) {
            const dictionaryOrder = this._getDictionaryOrder(dictionary, enabledDictionaryMap);
            switch (mode) {
                case 'freq':
                    {
                        const {frequencies} = definitions[index];
                        frequencies.push({index: frequencies.length, dictionary, dictionaryOrder, character, frequency: data});
                    }
                    break;
            }
        }

        for (const definition of definitions) {
            this._sortKanjiDefinitionMeta(definition);
        }
    }

    async _expandTags(names, dictionary) {
        const tagMetaList = await this._getTagMetaList(names, dictionary);
        const results = [];
        for (let i = 0, ii = tagMetaList.length; i < ii; ++i) {
            const meta = tagMetaList[i];
            const name = names[i];
            const {category, notes, order, score} = (meta !== null ? meta : {});
            const tag = this._createTag(name, category, notes, order, score, dictionary, false);
            results.push(tag);
        }
        return results;
    }

    async _expandStats(items, dictionary) {
        const names = Object.keys(items);
        const tagMetaList = await this._getTagMetaList(names, dictionary);

        const statsGroups = new Map();
        for (let i = 0; i < names.length; ++i) {
            const name = names[i];
            const meta = tagMetaList[i];
            if (meta === null) { continue; }

            const {category, notes, order, score} = meta;
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

    async _getTagMetaList(names, dictionary) {
        const tagMetaList = [];
        let cache = this._tagCache.get(dictionary);
        if (typeof cache === 'undefined') {
            cache = new Map();
            this._tagCache.set(dictionary, cache);
        }

        for (const name of names) {
            const base = this._getNameBase(name);

            let tagMeta = cache.get(base);
            if (typeof tagMeta === 'undefined') {
                tagMeta = await this._database.findTagForTitle(base, dictionary);
                cache.set(base, tagMeta);
            }

            tagMetaList.push(tagMeta);
        }

        return tagMetaList;
    }

    // Simple helpers

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

    _getSearchableText(text, allowAlphanumericCharacters) {
        if (allowAlphanumericCharacters) {
            return text;
        }

        const jp = this._japaneseUtil;
        let newText = '';
        for (const c of text) {
            if (!jp.isCodePointJapanese(c.codePointAt(0))) {
                break;
            }
            newText += c;
        }
        return newText;
    }

    _getTextOptionEntryVariants(value) {
        switch (value) {
            case 'true': return [true];
            case 'variant': return [false, true];
            default: return [false];
        }
    }

    _getCollapseEmphaticOptions(options) {
        const collapseEmphaticOptions = [[false, false]];
        switch (options.collapseEmphaticSequences) {
            case 'true':
                collapseEmphaticOptions.push([true, false]);
                break;
            case 'full':
                collapseEmphaticOptions.push([true, false], [true, true]);
                break;
        }
        return collapseEmphaticOptions;
    }

    _getTextReplacementsVariants(options) {
        return options.textReplacements;
    }

    _getSecondarySearchDictionaryMap(enabledDictionaryMap) {
        const secondarySearchDictionaryMap = new Map();
        for (const [dictionary, details] of enabledDictionaryMap.entries()) {
            if (!details.allowSecondarySearches) { continue; }
            secondarySearchDictionaryMap.set(dictionary, details);
        }
        return secondarySearchDictionaryMap;
    }

    _getDictionaryOrder(dictionary, enabledDictionaryMap) {
        const info = enabledDictionaryMap.get(dictionary);
        return typeof info !== 'undefined' ? info.order : 0;
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

    _flagTagsWithCategoryAsRedundant(tags, removeCategoriesSet) {
        for (const tag of tags) {
            if (removeCategoriesSet.has(tag.category)) {
                tag.redundant = true;
            }
        }
    }

    _getUniqueDictionaryNames(definitions) {
        const uniqueDictionaryNames = new Set();
        for (const {dictionaryNames} of definitions) {
            for (const dictionaryName of dictionaryNames) {
                uniqueDictionaryNames.add(dictionaryName);
            }
        }
        return [...uniqueDictionaryNames];
    }

    _getUniqueTermTags(definitions) {
        const newTermTags = [];
        if (definitions.length <= 1) {
            for (const {termTags} of definitions) {
                for (const tag of termTags) {
                    newTermTags.push(this._cloneTag(tag));
                }
            }
        } else {
            const tagsSet = new Set();
            let checkTagsMap = false;
            for (const {termTags} of definitions) {
                for (const tag of termTags) {
                    const key = this._getTagMapKey(tag);
                    if (checkTagsMap && tagsSet.has(key)) { continue; }
                    tagsSet.add(key);
                    newTermTags.push(this._cloneTag(tag));
                }
                checkTagsMap = true;
            }
        }
        return newTermTags;
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

    _areSetsEqual(set1, set2) {
        if (set1.size !== set2.size) {
            return false;
        }

        for (const value of set1) {
            if (!set2.has(value)) {
                return false;
            }
        }

        return true;
    }

    _getSetIntersection(set1, set2) {
        const result = [];
        for (const value of set1) {
            if (set2.has(value)) {
                result.push(value);
            }
        }
        return result;
    }

    _getAllDefinitions(definitions) {
        definitions = [...definitions];
        for (let i = 0; i < definitions.length; ++i) {
            const childDefinitions = definitions[i].definitions;
            if (Array.isArray(childDefinitions)) {
                definitions.push(...childDefinitions);
            }
        }
        return definitions;
    }

    // Reduction functions

    _getTermTagsScoreSum(termTags) {
        let result = 0;
        for (const {score} of termTags) {
            result += score;
        }
        return result;
    }

    _getSourceTermMatchCountSum(definitions) {
        let result = 0;
        for (const {sourceTermExactMatchCount} of definitions) {
            result += sourceTermExactMatchCount;
        }
        return result;
    }

    _getMaxDefinitionScore(definitions) {
        let result = Number.MIN_SAFE_INTEGER;
        for (const {score} of definitions) {
            if (score > result) { result = score; }
        }
        return result;
    }

    _getMinDictionaryOrder(definitions) {
        let result = Number.MAX_SAFE_INTEGER;
        for (const {dictionaryOrder} of definitions) {
            if (dictionaryOrder < result) { result = dictionaryOrder; }
        }
        return result;
    }

    // Common data creation and cloning functions

    _cloneTag(tag) {
        const {name, category, notes, order, score, dictionary, redundant} = tag;
        return this._createTag(name, category, notes, order, score, dictionary, redundant);
    }

    _getTagMapKey(tag) {
        const {name, category, notes} = tag;
        return this._createMapKey([name, category, notes]);
    }

    _createMapKey(array) {
        return JSON.stringify(array);
    }

    _createTag(name, category, notes, order, score, dictionary, redundant) {
        return {
            name,
            category: (typeof category === 'string' && category.length > 0 ? category : 'default'),
            notes: (typeof notes === 'string' ? notes : ''),
            order: (typeof order === 'number' ? order : 0),
            score: (typeof score === 'number' ? score : 0),
            dictionary: (typeof dictionary === 'string' ? dictionary : null),
            redundant
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

    async _createTermDefinitionFromDatabaseDefinition(databaseDefinition, source, rawSource, sourceTerm, reasons, isPrimary, enabledDictionaryMap) {
        const {expression, reading, definitionTags, termTags, glossary, score, dictionary, id, sequence} = databaseDefinition;
        const dictionaryOrder = this._getDictionaryOrder(dictionary, enabledDictionaryMap);
        const termTagsExpanded = await this._expandTags(termTags, dictionary);
        const definitionTagsExpanded = await this._expandTags(definitionTags, dictionary);

        this._sortTags(definitionTagsExpanded);
        this._sortTags(termTagsExpanded);

        const furiganaSegments = this._japaneseUtil.distributeFurigana(expression, reading);
        const termDetailsList = [this._createTermDetails(sourceTerm, expression, reading, furiganaSegments, termTagsExpanded)];
        const sourceTermExactMatchCount = (sourceTerm === expression ? 1 : 0);

        return {
            type: 'term',
            id,
            source,
            rawSource,
            sourceTerm,
            reasons,
            score,
            isPrimary,
            sequence,
            dictionary,
            dictionaryOrder,
            dictionaryNames: [dictionary],
            expression,
            reading,
            expressions: termDetailsList,
            furiganaSegments,
            glossary,
            definitionTags: definitionTagsExpanded,
            termTags: termTagsExpanded,
            // definitions
            frequencies: [],
            pitches: [],
            // only
            sourceTermExactMatchCount
        };
    }

    _createGroupedTermDefinition(definitions) {
        const {expression, reading, furiganaSegments, reasons, source, rawSource, sourceTerm} = definitions[0];
        const score = this._getMaxDefinitionScore(definitions);
        const dictionaryOrder = this._getMinDictionaryOrder(definitions);
        const dictionaryNames = this._getUniqueDictionaryNames(definitions);
        const termTags = this._getUniqueTermTags(definitions);
        const termDetailsList = [this._createTermDetails(sourceTerm, expression, reading, furiganaSegments, termTags)];
        const sourceTermExactMatchCount = (sourceTerm === expression ? 1 : 0);
        return {
            type: 'termGrouped',
            // id
            source,
            rawSource,
            sourceTerm,
            reasons: [...reasons],
            score,
            // isPrimary
            // sequence
            dictionary: dictionaryNames[0],
            dictionaryOrder,
            dictionaryNames,
            expression,
            reading,
            expressions: termDetailsList,
            furiganaSegments, // Contains duplicate data
            // glossary
            // definitionTags
            termTags,
            definitions, // type: 'term'
            frequencies: [],
            pitches: [],
            // only
            sourceTermExactMatchCount
        };
    }

    _createMergedTermDefinition(source, rawSource, definitions, expressions, readings, termDetailsList, reasons, score) {
        const dictionaryOrder = this._getMinDictionaryOrder(definitions);
        const sourceTermExactMatchCount = this._getSourceTermMatchCountSum(definitions);
        const dictionaryNames = this._getUniqueDictionaryNames(definitions);
        return {
            type: 'termMerged',
            // id
            source,
            rawSource,
            // sourceTerm
            reasons,
            score,
            // isPrimary
            // sequence
            dictionary: dictionaryNames[0],
            dictionaryOrder,
            dictionaryNames,
            expression: expressions,
            reading: readings,
            expressions: termDetailsList,
            // furiganaSegments
            // glossary
            // definitionTags
            // termTags
            definitions, // type: 'termMergedByGlossary'
            frequencies: [],
            pitches: [],
            // only
            sourceTermExactMatchCount
        };
    }

    _createMergedGlossaryTermDefinition(source, rawSource, definitions, expressions, readings, allExpressions, allReadings) {
        const only = [];
        if (!this._areSetsEqual(expressions, allExpressions)) {
            only.push(...this._getSetIntersection(expressions, allExpressions));
        }
        if (!this._areSetsEqual(readings, allReadings)) {
            only.push(...this._getSetIntersection(readings, allReadings));
        }

        const sourceTermExactMatchCount = this._getSourceTermMatchCountSum(definitions);
        const dictionaryNames = this._getUniqueDictionaryNames(definitions);

        const termInfoMap = new Map();
        this._addUniqueTermInfos(definitions, termInfoMap);
        const termDetailsList = this._createTermDetailsListFromTermInfoMap(termInfoMap);

        const definitionTags = this._getUniqueDefinitionTags(definitions);
        this._sortTags(definitionTags);

        const {glossary} = definitions[0];
        const score = this._getMaxDefinitionScore(definitions);
        const dictionaryOrder = this._getMinDictionaryOrder(definitions);
        return {
            type: 'termMergedByGlossary',
            // id
            source,
            rawSource,
            // sourceTerm
            reasons: [],
            score,
            // isPrimary
            // sequence
            dictionary: dictionaryNames[0],
            dictionaryOrder,
            dictionaryNames,
            expression: [...expressions],
            reading: [...readings],
            expressions: termDetailsList,
            // furiganaSegments
            glossary: [...glossary],
            definitionTags,
            // termTags
            definitions, // type: 'term'; contains duplicate data
            frequencies: [],
            pitches: [],
            only,
            sourceTermExactMatchCount
        };
    }

    _createTermDetailsListFromTermInfoMap(termInfoMap) {
        const termDetailsList = [];
        for (const [expression, readingMap] of termInfoMap.entries()) {
            for (const [reading, {termTagsMap, sourceTerm, furiganaSegments}] of readingMap.entries()) {
                const termTags = [...termTagsMap.values()];
                this._sortTags(termTags);
                termDetailsList.push(this._createTermDetails(sourceTerm, expression, reading, furiganaSegments, termTags));
            }
        }
        return termDetailsList;
    }

    _createTermDetails(sourceTerm, expression, reading, furiganaSegments, termTags) {
        const termFrequency = this._scoreToTermFrequency(this._getTermTagsScoreSum(termTags));
        return {
            sourceTerm,
            expression,
            reading,
            furiganaSegments, // Contains duplicate data
            termTags,
            termFrequency,
            frequencies: [],
            pitches: []
        };
    }

    // Sorting functions

    _sortTags(tags) {
        if (tags.length <= 1) { return; }
        const stringComparer = this._stringComparer;
        tags.sort((v1, v2) => {
            const i = v1.order - v2.order;
            if (i !== 0) { return i; }

            return stringComparer.compare(v1.name, v2.name);
        });
    }

    _sortDefinitions(definitions) {
        if (definitions.length <= 1) { return; }
        const stringComparer = this._stringComparer;
        const compareFunction = (v1, v2) => {
            let i = v1.dictionaryOrder - v2.dictionaryOrder;
            if (i !== 0) { return i; }

            i = v2.source.length - v1.source.length;
            if (i !== 0) { return i; }

            i = v1.reasons.length - v2.reasons.length;
            if (i !== 0) { return i; }

            i = v2.sourceTermExactMatchCount - v1.sourceTermExactMatchCount;
            if (i !== 0) { return i; }

            i = v2.score - v1.score;
            if (i !== 0) { return i; }

            const expression1 = v1.expression;
            const expression2 = v2.expression;
            if (typeof expression1 !== 'string' || typeof expression2 !== 'string') { return 0; } // Skip if either is not a string (array)

            i = expression2.length - expression1.length;
            if (i !== 0) { return i; }

            return stringComparer.compare(expression1, expression2);
        };
        definitions.sort(compareFunction);
    }

    _sortDatabaseDefinitionsByIndex(definitions) {
        if (definitions.length <= 1) { return; }
        definitions.sort((a, b) => a.index - b.index);
    }

    _sortDefinitionsById(definitions) {
        if (definitions.length <= 1) { return; }
        definitions.sort((a, b) => a.id - b.id);
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

    _sortTermDefinitionMeta(definition) {
        const compareFunction = (v1, v2) => {
            // Sort by dictionary
            let i = v1.dictionaryOrder - v2.dictionaryOrder;
            if (i !== 0) { return i; }

            // Sory by expression order
            i = v1.expressionIndex - v2.expressionIndex;
            if (i !== 0) { return i; }

            // Default order
            i = v1.index - v2.index;
            return i;
        };

        const {expressions, frequencies: frequencies1, pitches: pitches1} = definition;
        frequencies1.sort(compareFunction);
        pitches1.sort(compareFunction);
        for (const {frequencies: frequencies2, pitches: pitches2} of expressions) {
            frequencies2.sort(compareFunction);
            pitches2.sort(compareFunction);
        }
    }

    _sortKanjiDefinitionMeta(definition) {
        const compareFunction = (v1, v2) => {
            // Sort by dictionary
            let i = v1.dictionaryOrder - v2.dictionaryOrder;
            if (i !== 0) { return i; }

            // Default order
            i = v1.index - v2.index;
            return i;
        };

        const {frequencies} = definition;
        frequencies.sort(compareFunction);
    }

    // Regex functions

    _applyTextReplacements(text, sourceMap, replacements) {
        for (const {pattern, replacement} of replacements) {
            text = this._applyTextReplacement(text, sourceMap, pattern, replacement);
        }
        return text;
    }

    _applyTextReplacement(text, sourceMap, pattern, replacement) {
        const isGlobal = pattern.global;
        if (isGlobal) { pattern.lastIndex = 0; }
        for (let loop = true; loop; loop = isGlobal) {
            const match = pattern.exec(text);
            if (match === null) { break; }

            const matchText = match[0];
            const index = match.index;
            const actualReplacement = this._applyMatchReplacement(replacement, match);
            const actualReplacementLength = actualReplacement.length;
            const delta = actualReplacementLength - (matchText.length > 0 ? matchText.length : -1);

            text = `${text.substring(0, index)}${actualReplacement}${text.substring(index + matchText.length)}`;
            pattern.lastIndex += delta;

            if (actualReplacementLength > 0) {
                sourceMap.insert(index, ...(new Array(actualReplacementLength).fill(0)));
                sourceMap.combine(index - 1 + actualReplacementLength, matchText.length);
            } else {
                sourceMap.combine(index, matchText.length);
            }
        }
        return text;
    }

    _applyMatchReplacement(replacement, match) {
        const pattern = /\$(?:\$|&|`|'|(\d\d?)|<([^>]*)>)/g;
        return replacement.replace(pattern, (g0, g1, g2) => {
            if (typeof g1 !== 'undefined') {
                const matchIndex = Number.parseInt(g1, 10);
                if (matchIndex >= 1 && matchIndex <= match.length) {
                    return match[matchIndex];
                }
            } else if (typeof g2 !== 'undefined') {
                const {groups} = match;
                if (typeof groups === 'object' && groups !== null && Object.prototype.hasOwnProperty.call(groups, g2)) {
                    return groups[g2];
                }
            } else {
                switch (g0) {
                    case '$': return '$';
                    case '&': return match[0];
                    case '`': return replacement.substring(0, match.index);
                    case '\'': return replacement.substring(match.index + g0.length);
                }
            }
            return g0;
        });
    }
}
