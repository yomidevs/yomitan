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

function dictEnabledSet(options) {
    const enabledDictionaryMap = new Map();
    for (const [title, {enabled, priority, allowSecondarySearches}] of Object.entries(options.dictionaries)) {
        if (!enabled) { continue; }
        enabledDictionaryMap.set(title, {priority, allowSecondarySearches});
    }
    return enabledDictionaryMap;
}

function dictConfigured(options) {
    for (const {enabled} of Object.values(options.dictionaries)) {
        if (enabled) {
            return true;
        }
    }

    return false;
}

function dictTermsSort(definitions, dictionaries=null) {
    return definitions.sort((v1, v2) => {
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

        return v2.expression.toString().localeCompare(v1.expression.toString());
    });
}

function dictTermsUndupe(definitions) {
    const definitionGroups = new Map();
    for (const definition of definitions) {
        const id = definition.id;
        const definitionExisting = definitionGroups.get(id);
        if (typeof definitionExisting === 'undefined' || definition.expression.length > definitionExisting.expression.length) {
            definitionGroups.set(id, definition);
        }
    }

    return [...definitionGroups.values()];
}

function dictTermsCompressTags(definitions) {
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

function dictTermsGroup(definitions, dictionaries) {
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
        dictTermsSort(groupDefinitions, dictionaries);
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

    return dictTermsSort(results);
}

function dictTermsMergeBySequence(definitions, mainDictionary) {
    const sequencedDefinitions = new Map();
    const nonSequencedDefinitions = [];
    for (const definition of definitions) {
        const sequence = definition.sequence;
        if (mainDictionary === definition.dictionary && sequence >= 0) {
            let sequencedDefinition = sequencedDefinitions.get(sequence);
            if (typeof sequencedDefinition === 'undefined') {
                sequencedDefinition = {
                    reasons: definition.reasons,
                    score: definition.score,
                    expression: new Set(),
                    reading: new Set(),
                    expressions: new Map(),
                    source: definition.source,
                    dictionary: definition.dictionary,
                    definitions: []
                };
                sequencedDefinitions.set(sequence, sequencedDefinition);
            } else {
                sequencedDefinition.score = Math.max(sequencedDefinition.score, definition.score);
            }
        } else {
            nonSequencedDefinitions.push(definition);
        }
    }

    return [sequencedDefinitions, nonSequencedDefinitions];
}

function dictTermsMergeByGloss(result, definitions, appendTo=null, mergedIndices=null) {
    const definitionsByGloss = appendTo !== null ? appendTo : new Map();

    const resultExpressionsMap = result.expressions;
    const resultExpressionSet = result.expression;
    const resultReadingSet = result.reading;
    const resultSource = result.source;

    for (const [index, definition] of definitions.entries()) {
        const {expression, reading} = definition;

        if (mergedIndices !== null) {
            const expressionMap = resultExpressionsMap.get(expression);
            if (
                typeof expressionMap !== 'undefined' &&
                typeof expressionMap.get(reading) !== 'undefined'
            ) {
                mergedIndices.add(index);
            } else {
                continue;
            }
        }

        const gloss = JSON.stringify(definition.glossary.concat(definition.dictionary));
        let glossDefinition = definitionsByGloss.get(gloss);
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
            definitionsByGloss.set(gloss, glossDefinition);
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

    for (const definition of definitionsByGloss.values()) {
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

    return definitionsByGloss;
}

function dictTagBuildSource(name) {
    return dictTagSanitize({name, category: 'dictionary', order: 100});
}

function dictTagSanitize(tag) {
    tag.name = tag.name || 'untitled';
    tag.category = tag.category || 'default';
    tag.notes = tag.notes || '';
    tag.order = tag.order || 0;
    tag.score = tag.score || 0;
    return tag;
}

function dictTagsSort(tags) {
    return tags.sort((v1, v2) => {
        const order1 = v1.order;
        const order2 = v2.order;
        if (order1 < order2) {
            return -1;
        } else if (order1 > order2) {
            return 1;
        }

        const name1 = v1.name;
        const name2 = v2.name;
        if (name1 < name2) {
            return -1;
        } else if (name1 > name2) {
            return 1;
        }

        return 0;
    });
}

function dictFieldSplit(field) {
    return field.length === 0 ? [] : field.split(' ');
}
