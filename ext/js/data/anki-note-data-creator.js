/*
 * Copyright (C) 2023-2024  Yomitan Authors
 * Copyright (C) 2021-2022  Yomichan Authors
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

import {getDisambiguations, getGroupedPronunciations, getPronunciationsOfType, getTermFrequency, groupTermTags} from '../dictionary/dictionary-data-util.js';
import {distributeFurigana, distributeFuriganaInflected} from '../language/ja/japanese.js';

/**
 * Creates a compatibility representation of the specified data.
 * @param {string} marker The marker that is being used for template rendering.
 * @param {import('anki-templates-internal').CreateDetails} details Information which is used to generate the data.
 * @returns {import('anki-templates').NoteData} An object used for rendering Anki templates.
 */
export function createAnkiNoteData(marker, {
    compactTags,
    context,
    dictionaryEntry,
    dictionaryStylesMap,
    glossaryLayoutMode,
    media,
    mode,
    resultOutputMode,
}) {
    const definition = createCachedValue(getDefinition.bind(null, dictionaryEntry, context, resultOutputMode, dictionaryStylesMap));
    const uniqueExpressions = createCachedValue(getUniqueExpressions.bind(null, dictionaryEntry));
    const uniqueReadings = createCachedValue(getUniqueReadings.bind(null, dictionaryEntry));
    const context2 = createCachedValue(getPublicContext.bind(null, context));
    const pitches = createCachedValue(getPitches.bind(null, dictionaryEntry));
    const pitchCount = createCachedValue(getPitchCount.bind(null, pitches));
    const phoneticTranscriptions = createCachedValue(getPhoneticTranscriptions.bind(null, dictionaryEntry));

    if (typeof media !== 'object' || media === null || Array.isArray(media)) {
        media = {
            audio: void 0,
            clipboardImage: void 0,
            clipboardText: void 0,
            dictionaryMedia: {},
            popupSelectionText: void 0,
            screenshot: void 0,
            textFurigana: [],
        };
    }
    /** @type {import('anki-templates').NoteData} */
    const result = {
        compactGlossaries: (glossaryLayoutMode === 'compact'),
        compactTags,
        get context() { return getCachedValue(context2); },
        get definition() { return getCachedValue(definition); },
        dictionaryEntry,
        glossaryLayoutMode,
        group: (resultOutputMode === 'group'),
        marker,
        media,
        merge: (resultOutputMode === 'merge'),
        modeKanji: (mode === 'kanji'),
        modeTermKana: (mode === 'term-kana'),
        modeTermKanji: (mode === 'term-kanji'),
        get phoneticTranscriptions() { return getCachedValue(phoneticTranscriptions); },
        get pitchCount() { return getCachedValue(pitchCount); },
        get pitches() { return getCachedValue(pitches); },
        get uniqueExpressions() { return getCachedValue(uniqueExpressions); },
        get uniqueReadings() { return getCachedValue(uniqueReadings); },
    };
    Object.defineProperty(result, 'dictionaryEntry', {
        configurable: false,
        enumerable: false,
        value: dictionaryEntry,
        writable: false,
    });
    return result;
}

/**
 * Creates a deferred-evaluation value.
 * @template [T=unknown]
 * @param {() => T} getter The function to invoke to get the return value.
 * @returns {import('anki-templates-internal').CachedValue<T>} An object which can be passed into `getCachedValue`.
 */
export function createCachedValue(getter) {
    return {getter, hasValue: false, value: void 0};
}

/**
 * Gets the value of a cached object.
 * @template [T=unknown]
 * @param {import('anki-templates-internal').CachedValue<T>} item An object that was returned from `createCachedValue`.
 * @returns {T} The result of evaluating the getter, which is cached after the first invocation.
 */
export function getCachedValue(item) {
    if (item.hasValue) { return /** @type {T} */ (item.value); }
    const value = item.getter();
    item.value = value;
    item.hasValue = true;
    return value;
}

// Private

/**
 * @param {import('dictionary').TermDictionaryEntry} dictionaryEntry
 * @returns {?import('dictionary').TermSource}
 */
function getPrimarySource(dictionaryEntry) {
    for (const headword of dictionaryEntry.headwords) {
        for (const source of headword.sources) {
            if (source.isPrimary) { return source; }
        }
    }
    return null;
}

/**
 * @param {import('dictionary').DictionaryEntry} dictionaryEntry
 * @returns {string[]}
 */
function getUniqueExpressions(dictionaryEntry) {
    if (dictionaryEntry.type === 'term') {
        const results = new Set();
        for (const {term} of dictionaryEntry.headwords) {
            results.add(term);
        }
        return [...results];
    } else {
        return [];
    }
}

/**
 * @param {import('dictionary').DictionaryEntry} dictionaryEntry
 * @returns {string[]}
 */
function getUniqueReadings(dictionaryEntry) {
    if (dictionaryEntry.type === 'term') {
        const results = new Set();
        for (const {reading} of dictionaryEntry.headwords) {
            results.add(reading);
        }
        return [...results];
    } else {
        return [];
    }
}

/**
 * @param {import('anki-templates-internal').Context} context
 * @returns {import('anki-templates').Context}
 */
function getPublicContext(context) {
    let {documentTitle, fullQuery, query} = context;
    if (typeof documentTitle !== 'string') { documentTitle = ''; }
    return {
        document: {
            title: documentTitle,
        },
        fullQuery,
        query,
    };
}

/**
 * @param {import('dictionary').TermDictionaryEntry|import('dictionary').KanjiDictionaryEntry} dictionaryEntry
 * @returns {number[]}
 */
function getFrequencyNumbers(dictionaryEntry) {
    let previousDictionary;
    const frequencies = [];
    for (const {dictionary, displayValue, frequency} of dictionaryEntry.frequencies) {
        if (dictionary === previousDictionary) {
            continue;
        }
        previousDictionary = dictionary;

        if (displayValue !== null) {
            const frequencyMatch = displayValue.match(/\d+/);
            if (frequencyMatch !== null) {
                frequencies.push(Number.parseInt(frequencyMatch[0], 10));
                continue;
            }
        }
        frequencies.push(frequency);
    }
    return frequencies;
}

/**
 * @param {import('dictionary').TermDictionaryEntry|import('dictionary').KanjiDictionaryEntry} dictionaryEntry
 * @returns {number}
 */
function getFrequencyHarmonic(dictionaryEntry) {
    const frequencies = getFrequencyNumbers(dictionaryEntry);

    if (frequencies.length === 0) {
        return -1;
    }

    let total = 0;
    for (const frequency of frequencies) {
        total += 1 / frequency;
    }
    return Math.floor(frequencies.length / total);
}

/**
 * @param {import('dictionary').TermDictionaryEntry|import('dictionary').KanjiDictionaryEntry} dictionaryEntry
 * @returns {number}
 */
function getFrequencyAverage(dictionaryEntry) {
    const frequencies = getFrequencyNumbers(dictionaryEntry);

    if (frequencies.length === 0) {
        return -1;
    }

    let total = 0;
    for (const frequency of frequencies) {
        total += frequency;
    }
    return Math.floor(total / frequencies.length);
}

/**
 * @param {import('dictionary').DictionaryEntry} dictionaryEntry
 * @returns {import('anki-templates').PitchGroup[]}
 */
function getPitches(dictionaryEntry) {
    /** @type {import('anki-templates').PitchGroup[]} */
    const results = [];
    if (dictionaryEntry.type === 'term') {
        for (const {dictionary, pronunciations} of getGroupedPronunciations(dictionaryEntry)) {
            /** @type {import('anki-templates').Pitch[]} */
            const pitches = [];
            for (const groupedPronunciation of pronunciations) {
                const {pronunciation} = groupedPronunciation;
                if (pronunciation.type !== 'pitch-accent') { continue; }
                const {devoicePositions, nasalPositions, position, tags} = pronunciation;
                const {exclusiveReadings, exclusiveTerms, reading, terms} = groupedPronunciation;
                pitches.push({
                    devoicePositions,
                    exclusiveExpressions: exclusiveTerms,
                    exclusiveReadings,
                    expressions: terms,
                    nasalPositions,
                    position,
                    reading,
                    tags: convertPitchTags(tags),
                });
            }
            results.push({dictionary, pitches});
        }
    }
    return results;
}

/**
 * @param {import('dictionary').DictionaryEntry} dictionaryEntry
 * @returns {import('anki-templates').TranscriptionGroup[]}
 */
function getPhoneticTranscriptions(dictionaryEntry) {
    const results = [];
    if (dictionaryEntry.type === 'term') {
        for (const {dictionary, pronunciations} of getGroupedPronunciations(dictionaryEntry)) {
            const phoneticTranscriptions = [];
            for (const groupedPronunciation of pronunciations) {
                const {pronunciation} = groupedPronunciation;
                if (pronunciation.type !== 'phonetic-transcription') { continue; }
                const {ipa, tags} = pronunciation;
                const {exclusiveReadings, exclusiveTerms, reading, terms} = groupedPronunciation;
                phoneticTranscriptions.push({
                    exclusiveExpressions: exclusiveTerms,
                    exclusiveReadings,
                    expressions: terms,
                    ipa,
                    reading,
                    tags,
                });
            }
            results.push({dictionary, phoneticTranscriptions});
        }
    }
    return results;
}

/**
 * @param {import('anki-templates-internal').CachedValue<import('anki-templates').PitchGroup[]>} cachedPitches
 * @returns {number}
 */
function getPitchCount(cachedPitches) {
    const pitches = getCachedValue(cachedPitches);
    return pitches.reduce((i, v) => i + v.pitches.length, 0);
}

/**
 * @param {import('dictionary').DictionaryEntry} dictionaryEntry
 * @param {import('anki-templates-internal').Context} context
 * @param {import('settings').ResultOutputMode} resultOutputMode
 * @param {Map<string, string>} dictionaryStylesMap
 * @returns {import('anki-templates').DictionaryEntry}
 */
function getDefinition(dictionaryEntry, context, resultOutputMode, dictionaryStylesMap) {
    switch (dictionaryEntry.type) {
        case 'term':
            return getTermDefinition(dictionaryEntry, context, resultOutputMode, dictionaryStylesMap);
        case 'kanji':
            return getKanjiDefinition(dictionaryEntry, context);
        default:
            return /** @type {import('anki-templates').UnknownDictionaryEntry} */ ({});
    }
}

/**
 * @param {import('dictionary').KanjiDictionaryEntry} dictionaryEntry
 * @param {import('anki-templates-internal').Context} context
 * @returns {import('anki-templates').KanjiDictionaryEntry}
 */
function getKanjiDefinition(dictionaryEntry, context) {
    const {character, definitions, dictionary, dictionaryAlias, kunyomi, onyomi} = dictionaryEntry;

    let {url} = context;
    if (typeof url !== 'string') { url = ''; }

    const stats = createCachedValue(getKanjiStats.bind(null, dictionaryEntry));
    const tags = createCachedValue(convertTags.bind(null, dictionaryEntry.tags));
    const frequencies = createCachedValue(getKanjiFrequencies.bind(null, dictionaryEntry));
    const frequencyHarmonic = createCachedValue(getFrequencyHarmonic.bind(null, dictionaryEntry));
    const frequencyAverage = createCachedValue(getFrequencyAverage.bind(null, dictionaryEntry));
    const cloze = createCachedValue(getCloze.bind(null, dictionaryEntry, context));

    return {
        character,
        get cloze() { return getCachedValue(cloze); },
        dictionary,
        dictionaryAlias,
        get frequencies() { return getCachedValue(frequencies); },
        get frequencyAverage() { return getCachedValue(frequencyAverage); },
        get frequencyHarmonic() { return getCachedValue(frequencyHarmonic); },
        glossary: definitions,
        kunyomi,
        onyomi,
        get stats() { return getCachedValue(stats); },
        get tags() { return getCachedValue(tags); },
        type: 'kanji',
        url,
    };
}

/**
 * @param {import('dictionary').KanjiDictionaryEntry} dictionaryEntry
 * @returns {import('anki-templates').KanjiStatGroups}
 */
function getKanjiStats(dictionaryEntry) {
    /** @type {import('anki-templates').KanjiStatGroups} */
    const results = {};
    for (const [key, value] of Object.entries(dictionaryEntry.stats)) {
        results[key] = value.map(convertKanjiStat);
    }
    return results;
}

/**
 * @param {import('dictionary').KanjiStat} kanjiStat
 * @returns {import('anki-templates').KanjiStat}
 */
function convertKanjiStat({category, content, dictionary, name, order, score, value}) {
    return {
        category,
        dictionary,
        name,
        notes: content,
        order,
        score,
        value,
    };
}

/**
 * @param {import('dictionary').KanjiDictionaryEntry} dictionaryEntry
 * @returns {import('anki-templates').KanjiFrequency[]}
 */
function getKanjiFrequencies(dictionaryEntry) {
    /** @type {import('anki-templates').KanjiFrequency[]} */
    const results = [];
    for (const {character, dictionary, dictionaryAlias, dictionaryIndex, dictionaryPriority, displayValue, frequency, index} of dictionaryEntry.frequencies) {
        results.push({
            character,
            dictionary,
            dictionaryAlias,
            dictionaryOrder: {
                index: dictionaryIndex,
                priority: dictionaryPriority,
            },
            frequency: displayValue !== null ? displayValue : frequency,
            index,
        });
    }
    return results;
}

/**
 * @param {import('dictionary').TermDictionaryEntry} dictionaryEntry
 * @param {import('anki-templates-internal').Context} context
 * @param {import('settings').ResultOutputMode} resultOutputMode
 * @param {Map<string, string>} dictionaryStylesMap
 * @returns {import('anki-templates').TermDictionaryEntry}
 */
function getTermDefinition(dictionaryEntry, context, resultOutputMode, dictionaryStylesMap) {
    /** @type {import('anki-templates').TermDictionaryEntryType} */
    let type = 'term';
    switch (resultOutputMode) {
        case 'group': type = 'termGrouped'; break;
        case 'merge': type = 'termMerged'; break;
    }

    const {definitions, dictionaryIndex, dictionaryPriority, inflectionRuleChainCandidates, score, sourceTermExactMatchCount} = dictionaryEntry;

    let {url} = context;
    if (typeof url !== 'string') { url = ''; }

    const primarySource = getPrimarySource(dictionaryEntry);

    const dictionaryAliases = createCachedValue(getTermDictionaryAliases.bind(null, dictionaryEntry));
    const dictionaryNames = createCachedValue(getTermDictionaryNames.bind(null, dictionaryEntry));
    const commonInfo = createCachedValue(getTermDictionaryEntryCommonInfo.bind(null, dictionaryEntry, type, dictionaryStylesMap));
    const termTags = createCachedValue(getTermTags.bind(null, dictionaryEntry, type));
    const expressions = createCachedValue(getTermExpressions.bind(null, dictionaryEntry));
    const frequencies = createCachedValue(getTermFrequencies.bind(null, dictionaryEntry));
    const frequencyHarmonic = createCachedValue(getFrequencyHarmonic.bind(null, dictionaryEntry));
    const frequencyAverage = createCachedValue(getFrequencyAverage.bind(null, dictionaryEntry));
    const pitches = createCachedValue(getTermPitches.bind(null, dictionaryEntry));
    const phoneticTranscriptions = createCachedValue(getTermPhoneticTranscriptions.bind(null, dictionaryEntry));
    const glossary = createCachedValue(getTermGlossaryArray.bind(null, dictionaryEntry, type));
    const styleInfo = createCachedValue(getTermStyles.bind(null, dictionaryEntry, type, dictionaryStylesMap));
    const cloze = createCachedValue(getCloze.bind(null, dictionaryEntry, context));
    const furiganaSegments = createCachedValue(getTermFuriganaSegments.bind(null, dictionaryEntry, type));
    const sequence = createCachedValue(getTermDictionaryEntrySequence.bind(null, dictionaryEntry));

    return {
        get cloze() { return getCachedValue(cloze); },
        get definitions() { return getCachedValue(commonInfo).definitions; },
        get definitionTags() { return type === 'term' ? getCachedValue(commonInfo).definitionTags : void 0; },
        get dictionary() { return getCachedValue(dictionaryNames)[0]; },
        get dictionaryAlias() { return getCachedValue(dictionaryAliases)[0]; },
        get dictionaryNames() { return getCachedValue(dictionaryNames); },
        dictionaryOrder: {
            index: dictionaryIndex,
            priority: dictionaryPriority,
        },
        get dictScopedStyles() { return getCachedValue(styleInfo)?.dictScopedStyles; },
        get expression() {
            const {uniqueTerms} = getCachedValue(commonInfo);
            return (type === 'term' || type === 'termGrouped' ? uniqueTerms[0] : uniqueTerms);
        },
        get expressions() { return getCachedValue(expressions); },
        get frequencies() { return getCachedValue(frequencies); },
        get frequencyAverage() { return getCachedValue(frequencyAverage); },
        get frequencyHarmonic() { return getCachedValue(frequencyHarmonic); },
        get furiganaSegments() { return getCachedValue(furiganaSegments); },
        get glossary() { return getCachedValue(glossary); },
        get glossaryScopedStyles() { return getCachedValue(styleInfo)?.glossaryScopedStyles; },
        id: (type === 'term' && definitions.length > 0 ? definitions[0].id : void 0),
        inflectionRuleChainCandidates,
        isPrimary: (type === 'term' ? dictionaryEntry.isPrimary : void 0),
        get phoneticTranscriptions() { return getCachedValue(phoneticTranscriptions); },
        get pitches() { return getCachedValue(pitches); },
        rawSource: (primarySource !== null ? primarySource.originalText : null),
        get reading() {
            const {uniqueReadings} = getCachedValue(commonInfo);
            return (type === 'term' || type === 'termGrouped' ? uniqueReadings[0] : uniqueReadings);
        },
        score,
        get sequence() { return getCachedValue(sequence); },
        source: (primarySource !== null ? primarySource.transformedText : null),
        sourceTerm: (type !== 'termMerged' ? (primarySource !== null ? primarySource.deinflectedText : null) : void 0),
        sourceTermExactMatchCount,
        get termTags() { return getCachedValue(termTags); },
        type,
        url,
    };
}

/**
 * @param {import('dictionary').TermDictionaryEntry} dictionaryEntry
 * @returns {string[]}
 */
function getTermDictionaryNames(dictionaryEntry) {
    const dictionaryNames = new Set();
    for (const {dictionary} of dictionaryEntry.definitions) {
        dictionaryNames.add(dictionary);
    }
    return [...dictionaryNames];
}

/**
 * @param {import('dictionary').TermDictionaryEntry} dictionaryEntry
 * @returns {string[]}
 */
function getTermDictionaryAliases(dictionaryEntry) {
    const dictionaryAliases = new Set();
    for (const {dictionaryAlias} of dictionaryEntry.definitions) {
        dictionaryAliases.add(dictionaryAlias);
    }
    return [...dictionaryAliases];
}

/**
 * @param {import('dictionary').TermDictionaryEntry} dictionaryEntry
 * @param {import('anki-templates').TermDictionaryEntryType} type
 * @param {Map<string, string>} dictionaryStylesMap
 * @returns {import('anki-templates').TermDictionaryEntryCommonInfo}
 */
function getTermDictionaryEntryCommonInfo(dictionaryEntry, type, dictionaryStylesMap) {
    const merged = (type === 'termMerged');
    const hasDefinitions = (type !== 'term');

    /** @type {Set<string>} */
    const allTermsSet = new Set();
    /** @type {Set<string>} */
    const allReadingsSet = new Set();
    for (const {reading, term} of dictionaryEntry.headwords) {
        allTermsSet.add(term);
        allReadingsSet.add(reading);
    }
    const uniqueTerms = [...allTermsSet];
    const uniqueReadings = [...allReadingsSet];

    /** @type {import('anki-templates').TermDefinition[]} */
    const definitions = [];
    /** @type {import('anki-templates').Tag[]} */
    const definitionTags = [];
    for (const {dictionary, dictionaryAlias, entries, headwordIndices, sequences, tags} of dictionaryEntry.definitions) {
        const dictionaryStyles = dictionaryStylesMap.get(dictionary);
        let glossaryScopedStyles = '';
        let dictScopedStyles = '';
        if (dictionaryStyles) {
            glossaryScopedStyles = addGlossaryScopeToCss(dictionaryStyles);
            dictScopedStyles = addGlossaryScopeToCss(addDictionaryScopeToCss(dictionaryStyles, dictionary));
        }
        const definitionTags2 = [];
        for (const tag of tags) {
            definitionTags.push(convertTag(tag));
            definitionTags2.push(convertTag(tag));
        }
        if (!hasDefinitions) { continue; }
        const only = merged ? getDisambiguations(dictionaryEntry.headwords, headwordIndices, allTermsSet, allReadingsSet) : void 0;
        definitions.push({
            definitionTags: definitionTags2,
            dictionary,
            dictionaryAlias,
            dictScopedStyles,
            glossary: entries,
            glossaryScopedStyles,
            only,
            sequence: sequences[0],
        });
    }

    return {
        definitions: hasDefinitions ? definitions : void 0,
        definitionTags,
        uniqueReadings,
        uniqueTerms,
    };
}

/**
 * @param {string} css
 * @returns {string}
 */
function addGlossaryScopeToCss(css) {
    return addScopeToCss(css, '.yomitan-glossary');
}

/**
 * @param {string} css
 * @param {string} dictionaryTitle
 * @returns {string}
 */
function addDictionaryScopeToCss(css, dictionaryTitle) {
    const escapedTitle = dictionaryTitle
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"');

    return addScopeToCss(css, `[data-dictionary="${escapedTitle}"]`);
}

/**
 * @param {string} css
 * @param {string} scopeSelector
 * @returns {string}
 */
function addScopeToCss(css, scopeSelector) {
    const regex = /([^\r\n,{}]+)(\s*[,{])/g;
    const replacement = `${scopeSelector} $1$2`;
    return css.replace(regex, replacement);
}


/**
 * @param {import('dictionary').TermDictionaryEntry} dictionaryEntry
 * @returns {import('anki-templates').TermFrequency[]}
 */
function getTermFrequencies(dictionaryEntry) {
    const results = [];
    const {headwords} = dictionaryEntry;
    for (const {dictionary, dictionaryAlias, dictionaryIndex, dictionaryPriority, displayValue, frequency, hasReading, headwordIndex} of dictionaryEntry.frequencies) {
        const {reading, term} = headwords[headwordIndex];
        results.push({
            dictionary,
            dictionaryAlias,
            dictionaryOrder: {
                index: dictionaryIndex,
                priority: dictionaryPriority,
            },
            expression: term,
            expressionIndex: headwordIndex,
            frequency: displayValue !== null ? displayValue : frequency,
            hasReading,
            index: results.length,
            reading,
        });
    }
    return results;
}

/**
 * @param {import('dictionary').TermDictionaryEntry} dictionaryEntry
 * @returns {import('anki-templates').TermPitchAccent[]}
 */
function getTermPitches(dictionaryEntry) {
    const results = [];
    const {headwords} = dictionaryEntry;
    for (const {dictionary, dictionaryAlias, dictionaryIndex, dictionaryPriority, headwordIndex, pronunciations} of dictionaryEntry.pronunciations) {
        const {reading, term} = headwords[headwordIndex];
        const pitches = getPronunciationsOfType(pronunciations, 'pitch-accent');
        const cachedPitches = createCachedValue(getTermPitchesInner.bind(null, pitches));
        results.push({
            dictionary,
            dictionaryAlias,
            dictionaryOrder: {
                index: dictionaryIndex,
                priority: dictionaryPriority,
            },
            expression: term,
            expressionIndex: headwordIndex,
            index: results.length,
            get pitches() { return getCachedValue(cachedPitches); },
            reading,
        });
    }
    return results;
}

/**
 * @param {import('dictionary').PitchAccent[]} pitches
 * @returns {import('anki-templates').PitchAccent[]}
 */
function getTermPitchesInner(pitches) {
    const results = [];
    for (const {position, tags} of pitches) {
        const cachedTags = createCachedValue(convertTags.bind(null, tags));
        results.push({
            position,
            get tags() { return getCachedValue(cachedTags); },
        });
    }
    return results;
}

/**
 * @param {import('dictionary').TermDictionaryEntry} dictionaryEntry
 * @returns {import('anki-templates').TermPhoneticTranscription[]}
 */
function getTermPhoneticTranscriptions(dictionaryEntry) {
    const results = [];
    const {headwords} = dictionaryEntry;
    for (const {dictionary, dictionaryAlias, dictionaryIndex, dictionaryPriority, headwordIndex, pronunciations} of dictionaryEntry.pronunciations) {
        const {reading, term} = headwords[headwordIndex];
        const phoneticTranscriptions = getPronunciationsOfType(pronunciations, 'phonetic-transcription');
        const termPhoneticTranscriptions = getTermPhoneticTranscriptionsInner(phoneticTranscriptions);
        results.push({
            dictionary,
            dictionaryAlias,
            dictionaryOrder: {
                index: dictionaryIndex,
                priority: dictionaryPriority,
            },
            expression: term,
            expressionIndex: headwordIndex,
            index: results.length,
            get phoneticTranscriptions() { return termPhoneticTranscriptions; },
            reading,
        });
    }

    return results;
}

/**
 * @param {import('dictionary').PhoneticTranscription[]} phoneticTranscriptions
 * @returns {import('anki-templates').PhoneticTranscription[]}
 */
function getTermPhoneticTranscriptionsInner(phoneticTranscriptions) {
    const results = [];
    for (const {ipa, tags} of phoneticTranscriptions) {
        const cachedTags = createCachedValue(convertTags.bind(null, tags));
        results.push({
            ipa,
            get tags() { return getCachedValue(cachedTags); },
        });
    }
    return results;
}

/**
 * @param {import('dictionary').TermDictionaryEntry} dictionaryEntry
 * @returns {import('anki-templates').TermHeadword[]}
 */
function getTermExpressions(dictionaryEntry) {
    const results = [];
    const {headwords} = dictionaryEntry;
    for (let i = 0, ii = headwords.length; i < ii; ++i) {
        const {reading, sources: [{deinflectedText}], tags, term, wordClasses} = headwords[i];
        const termTags = createCachedValue(convertTags.bind(null, tags));
        const frequencies = createCachedValue(getTermExpressionFrequencies.bind(null, dictionaryEntry, i));
        const pitches = createCachedValue(getTermExpressionPitches.bind(null, dictionaryEntry, i));
        const termFrequency = createCachedValue(getTermExpressionTermFrequency.bind(null, termTags));
        const furiganaSegments = createCachedValue(getTermHeadwordFuriganaSegments.bind(null, term, reading));
        const item = {
            expression: term,
            get frequencies() { return getCachedValue(frequencies); },
            get furiganaSegments() { return getCachedValue(furiganaSegments); },
            get pitches() { return getCachedValue(pitches); },
            reading,
            sourceTerm: deinflectedText,
            get termFrequency() { return getCachedValue(termFrequency); },
            get termTags() { return getCachedValue(termTags); },
            wordClasses,
        };
        results.push(item);
    }
    return results;
}

/**
 * @param {import('dictionary').TermDictionaryEntry} dictionaryEntry
 * @param {number} i
 * @returns {import('anki-templates').TermFrequency[]}
 */
function getTermExpressionFrequencies(dictionaryEntry, i) {
    const results = [];
    const {frequencies, headwords} = dictionaryEntry;
    for (const {dictionary, dictionaryAlias, dictionaryIndex, dictionaryPriority, displayValue, frequency, hasReading, headwordIndex} of frequencies) {
        if (headwordIndex !== i) { continue; }
        const {reading, term} = headwords[headwordIndex];
        results.push({
            dictionary,
            dictionaryAlias,
            dictionaryOrder: {
                index: dictionaryIndex,
                priority: dictionaryPriority,
            },
            expression: term,
            expressionIndex: headwordIndex,
            frequency: displayValue !== null ? displayValue : frequency,
            hasReading,
            index: results.length,
            reading,
        });
    }
    return results;
}

/**
 * @param {import('dictionary').TermDictionaryEntry} dictionaryEntry
 * @param {number} i
 * @returns {import('anki-templates').TermPitchAccent[]}
 */
function getTermExpressionPitches(dictionaryEntry, i) {
    const results = [];
    const {headwords, pronunciations: termPronunciations} = dictionaryEntry;
    for (const {dictionary, dictionaryAlias, dictionaryIndex, dictionaryPriority, headwordIndex, pronunciations} of termPronunciations) {
        if (headwordIndex !== i) { continue; }
        const {reading, term} = headwords[headwordIndex];
        const pitches = getPronunciationsOfType(pronunciations, 'pitch-accent');
        const cachedPitches = createCachedValue(getTermPitchesInner.bind(null, pitches));
        results.push({
            dictionary,
            dictionaryAlias,
            dictionaryOrder: {
                index: dictionaryIndex,
                priority: dictionaryPriority,
            },
            expression: term,
            expressionIndex: headwordIndex,
            index: results.length,
            get pitches() { return getCachedValue(cachedPitches); },
            reading,
        });
    }
    return results;
}

/**
 * @param {import('anki-templates-internal').CachedValue<import('anki-templates').Tag[]>} cachedTermTags
 * @returns {import('anki-templates').TermFrequencyType}
 */
function getTermExpressionTermFrequency(cachedTermTags) {
    const termTags = getCachedValue(cachedTermTags);
    return getTermFrequency(termTags);
}

/**
 * @param {import('dictionary').TermDictionaryEntry} dictionaryEntry
 * @param {import('anki-templates').TermDictionaryEntryType} type
 * @returns {import('dictionary-data').TermGlossary[]|undefined}
 */
function getTermGlossaryArray(dictionaryEntry, type) {
    if (type === 'term') {
        const results = [];
        for (const {entries} of dictionaryEntry.definitions) {
            results.push(...entries);
        }
        return results;
    }
    return void 0;
}

/**
 * @param {import('dictionary').TermDictionaryEntry} dictionaryEntry
 * @param {import('anki-templates').TermDictionaryEntryType} type
 * @param {Map<string, string>} dictionaryStylesMap
 * @returns {{glossaryScopedStyles: string, dictScopedStyles: string}|undefined}
 */
function getTermStyles(dictionaryEntry, type, dictionaryStylesMap) {
    if (type !== 'term') {
        return void 0;
    }
    let glossaryScopedStyles = '';
    let dictScopedStyles = '';
    for (const {dictionary} of dictionaryEntry.definitions) {
        const dictionaryStyles = dictionaryStylesMap.get(dictionary);
        if (dictionaryStyles) {
            glossaryScopedStyles += addGlossaryScopeToCss(dictionaryStyles);
            dictScopedStyles += addGlossaryScopeToCss(addDictionaryScopeToCss(dictionaryStyles, dictionary));
        }
    }
    return {dictScopedStyles, glossaryScopedStyles};
}

/**
 * @param {import('dictionary').TermDictionaryEntry} dictionaryEntry
 * @param {import('anki-templates').TermDictionaryEntryType} type
 * @returns {import('anki-templates').Tag[]|undefined}
 */
function getTermTags(dictionaryEntry, type) {
    if (type !== 'termMerged') {
        const results = [];
        for (const {tag} of groupTermTags(dictionaryEntry)) {
            results.push(convertTag(tag));
        }
        return results;
    }
    return void 0;
}

/**
 * @param {import('dictionary').Tag[]} tags
 * @returns {import('anki-templates').Tag[]}
 */
function convertTags(tags) {
    const results = [];
    for (const tag of tags) {
        results.push(convertTag(tag));
    }
    return results;
}

/**
 * @param {import('dictionary').Tag} tag
 * @returns {import('anki-templates').Tag}
 */
function convertTag({category, content, dictionaries, name, order, redundant, score}) {
    return {
        category,
        dictionary: (dictionaries.length > 0 ? dictionaries[0] : ''),
        name,
        notes: (content.length > 0 ? content[0] : ''),
        order,
        redundant,
        score,
    };
}

/**
 * @param {import('dictionary').Tag[]} tags
 * @returns {import('anki-templates').PitchTag[]}
 */
function convertPitchTags(tags) {
    const results = [];
    for (const tag of tags) {
        results.push(convertPitchTag(tag));
    }
    return results;
}

/**
 * @param {import('dictionary').Tag} tag
 * @returns {import('anki-templates').PitchTag}
 */
function convertPitchTag({category, content, dictionaries, name, order, redundant, score}) {
    return {
        category,
        content: [...content],
        dictionaries: [...dictionaries],
        name,
        order,
        redundant,
        score,
    };
}

/**
 * @param {import('dictionary').DictionaryEntry} dictionaryEntry
 * @param {import('anki-templates-internal').Context} context
 * @returns {import('anki-templates').Cloze}
 */
function getCloze(dictionaryEntry, context) {
    let originalText = '';
    let term = '';
    let reading = '';
    switch (dictionaryEntry.type) {
        case 'term':
            {
                term = dictionaryEntry.headwords[0].term;
                reading = dictionaryEntry.headwords[0].reading;
                const primarySource = getPrimarySource(dictionaryEntry);
                if (primarySource !== null) { originalText = primarySource.originalText; }
            }
            break;
        case 'kanji':
            originalText = dictionaryEntry.character;
            break;
    }

    const {sentence} = context;
    let text;
    let offset;
    if (typeof sentence === 'object' && sentence !== null) {
        ({offset, text} = sentence);
    }
    if (typeof text !== 'string') { text = ''; }
    if (typeof offset !== 'number') { offset = 0; }

    const textSegments = [];
    for (const {reading: reading2, text: text2} of distributeFuriganaInflected(term, reading, text.substring(offset, offset + originalText.length))) {
        textSegments.push(reading2.length > 0 ? reading2 : text2);
    }

    return {
        body: text.substring(offset, offset + originalText.length),
        bodyKana: textSegments.join(''),
        prefix: text.substring(0, offset),
        sentence: text,
        suffix: text.substring(offset + originalText.length),
    };
}

/**
 * @param {import('dictionary').TermDictionaryEntry} dictionaryEntry
 * @param {import('anki-templates').TermDictionaryEntryType} type
 * @returns {import('anki-templates').FuriganaSegment[]|undefined}
 */
function getTermFuriganaSegments(dictionaryEntry, type) {
    if (type === 'term') {
        for (const {reading, term} of dictionaryEntry.headwords) {
            return getTermHeadwordFuriganaSegments(term, reading);
        }
    }
    return void 0;
}

/**
 * @param {string} term
 * @param {string} reading
 * @returns {import('anki-templates').FuriganaSegment[]}
 */
function getTermHeadwordFuriganaSegments(term, reading) {
    /** @type {import('anki-templates').FuriganaSegment[]} */
    const result = [];
    for (const {reading: reading2, text} of distributeFurigana(term, reading)) {
        result.push({furigana: reading2, text});
    }
    return result;
}

/**
 * @param {import('dictionary').TermDictionaryEntry} dictionaryEntry
 * @returns {number}
 */
function getTermDictionaryEntrySequence(dictionaryEntry) {
    let hasSequence = false;
    let mainSequence = -1;
    if (!dictionaryEntry.isPrimary) { return mainSequence; }
    for (const {sequences} of dictionaryEntry.definitions) {
        const sequence = sequences[0];
        if (!hasSequence) {
            mainSequence = sequence;
            hasSequence = true;
            if (mainSequence === -1) { break; }
        } else if (mainSequence !== sequence) {
            mainSequence = -1;
            break;
        }
    }
    return mainSequence;
}
