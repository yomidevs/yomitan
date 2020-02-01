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
    const dictionaries = {};
    for (const title in options.dictionaries) {
        const dictionary = options.dictionaries[title];
        if (dictionary.enabled) {
            dictionaries[title] = dictionary;
        }
    }

    return dictionaries;
}

function dictConfigured(options) {
    for (const title in options.dictionaries) {
        if (options.dictionaries[title].enabled) {
            return true;
        }
    }

    return false;
}

function dictRowsSort(rows, options) {
    return rows.sort((ra, rb) => {
        const pa = (options.dictionaries[ra.title] || {}).priority || 0;
        const pb = (options.dictionaries[rb.title] || {}).priority || 0;
        if (pa > pb) {
            return -1;
        } else if (pa < pb) {
            return 1;
        } else {
            return 0;
        }
    });
}

function dictTermsSort(definitions, dictionaries=null) {
    return definitions.sort((v1, v2) => {
        let i;
        if (dictionaries !== null) {
            i = (
                ((dictionaries[v2.dictionary] || {}).priority || 0) -
                ((dictionaries[v1.dictionary] || {}).priority || 0)
            );
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
    const definitionGroups = {};
    for (const definition of definitions) {
        const definitionExisting = definitionGroups[definition.id];
        if (!hasOwn(definitionGroups, definition.id) || definition.expression.length > definitionExisting.expression.length) {
            definitionGroups[definition.id] = definition;
        }
    }

    const definitionsUnique = [];
    for (const key in definitionGroups) {
        definitionsUnique.push(definitionGroups[key]);
    }

    return definitionsUnique;
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
    const groups = {};
    for (const definition of definitions) {
        const key = [definition.source, definition.expression];
        key.push(...definition.reasons);
        if (definition.reading) {
            key.push(definition.reading);
        }

        const keyString = key.toString();
        if (hasOwn(groups, keyString)) {
            groups[keyString].push(definition);
        } else {
            groups[keyString] = [definition];
        }
    }

    const results = [];
    for (const key in groups) {
        const groupDefs = groups[key];
        const firstDef = groupDefs[0];
        dictTermsSort(groupDefs, dictionaries);
        results.push({
            definitions: groupDefs,
            expression: firstDef.expression,
            reading: firstDef.reading,
            furiganaSegments: firstDef.furiganaSegments,
            reasons: firstDef.reasons,
            termTags: firstDef.termTags,
            score: groupDefs.reduce((p, v) => v.score > p ? v.score : p, Number.MIN_SAFE_INTEGER),
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
                    score: Number.MIN_SAFE_INTEGER,
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

function dictTermsMergeByGloss(result, definitions, appendTo, mergedIndices) {
    const definitionsByGloss = appendTo || {};
    for (const [index, definition] of definitions.entries()) {
        if (appendTo) {
            let match = false;
            for (const expression of result.expressions.keys()) {
                if (definition.expression === expression) {
                    for (const reading of result.expressions.get(expression).keys()) {
                        if (definition.reading === reading) {
                            match = true;
                            break;
                        }
                    }
                }
                if (match) {
                    break;
                }
            }

            if (!match) {
                continue;
            } else if (mergedIndices) {
                mergedIndices.add(index);
            }
        }

        const gloss = JSON.stringify(definition.glossary.concat(definition.dictionary));
        if (!definitionsByGloss[gloss]) {
            definitionsByGloss[gloss] = {
                expression: new Set(),
                reading: new Set(),
                definitionTags: [],
                glossary: definition.glossary,
                source: result.source,
                reasons: [],
                score: definition.score,
                id: definition.id,
                dictionary: definition.dictionary
            };
        }

        definitionsByGloss[gloss].expression.add(definition.expression);
        definitionsByGloss[gloss].reading.add(definition.reading);

        result.expression.add(definition.expression);
        result.reading.add(definition.reading);

        for (const tag of definition.definitionTags) {
            if (!definitionsByGloss[gloss].definitionTags.find((existingTag) => existingTag.name === tag.name)) {
                definitionsByGloss[gloss].definitionTags.push(tag);
            }
        }

        if (!appendTo) {
            // result->expressions[ Expression1[ Reading1[ Tag1, Tag2 ] ], Expression2, ... ]
            if (!result.expressions.has(definition.expression)) {
                result.expressions.set(definition.expression, new Map());
            }
            if (!result.expressions.get(definition.expression).has(definition.reading)) {
                result.expressions.get(definition.expression).set(definition.reading, []);
            }

            for (const tag of definition.termTags) {
                if (!result.expressions.get(definition.expression).get(definition.reading).find((existingTag) => existingTag.name === tag.name)) {
                    result.expressions.get(definition.expression).get(definition.reading).push(tag);
                }
            }
        }
    }

    for (const gloss in definitionsByGloss) {
        const definition = definitionsByGloss[gloss];
        definition.only = [];
        if (!utilSetEqual(definition.expression, result.expression)) {
            for (const expression of utilSetIntersection(definition.expression, result.expression)) {
                definition.only.push(expression);
            }
        }
        if (!utilSetEqual(definition.reading, result.reading)) {
            for (const reading of utilSetIntersection(definition.reading, result.reading)) {
                definition.only.push(reading);
            }
        }
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

async function dictFieldFormat(field, definition, mode, options, templates, exceptions) {
    const data = {
        marker: null,
        definition,
        group: options.general.resultOutputMode === 'group',
        merge: options.general.resultOutputMode === 'merge',
        modeTermKanji: mode === 'term-kanji',
        modeTermKana: mode === 'term-kana',
        modeKanji: mode === 'kanji',
        compactGlossaries: options.general.compactGlossaries
    };
    const markers = dictFieldFormat.markers;
    const pattern = /\{([\w-]+)\}/g;
    return await stringReplaceAsync(field, pattern, async (g0, marker) => {
        if (!markers.has(marker)) {
            return g0;
        }
        data.marker = marker;
        try {
            return await apiTemplateRender(templates, data, true);
        } catch (e) {
            if (exceptions) { exceptions.push(e); }
            return `{${marker}-render-error}`;
        }
    });
}
dictFieldFormat.markers = new Set([
    'audio',
    'character',
    'cloze-body',
    'cloze-prefix',
    'cloze-suffix',
    'dictionary',
    'expression',
    'furigana',
    'furigana-plain',
    'glossary',
    'glossary-brief',
    'kunyomi',
    'onyomi',
    'reading',
    'screenshot',
    'sentence',
    'tags',
    'url'
]);

async function dictNoteFormat(definition, mode, options, templates) {
    const note = {fields: {}, tags: options.anki.tags};
    let fields = [];

    if (mode === 'kanji') {
        fields = options.anki.kanji.fields;
        note.deckName = options.anki.kanji.deck;
        note.modelName = options.anki.kanji.model;
    } else {
        fields = options.anki.terms.fields;
        note.deckName = options.anki.terms.deck;
        note.modelName = options.anki.terms.model;

        if (definition.audio) {
            const audio = {
                url: definition.audio.url,
                filename: definition.audio.filename,
                skipHash: '7e2c2f954ef6051373ba916f000168dc',
                fields: []
            };

            for (const name in fields) {
                if (fields[name].includes('{audio}')) {
                    audio.fields.push(name);
                }
            }

            if (audio.fields.length > 0) {
                note.audio = audio;
            }
        }
    }

    for (const name in fields) {
        note.fields[name] = await dictFieldFormat(fields[name], definition, mode, options, templates);
    }

    return note;
}
