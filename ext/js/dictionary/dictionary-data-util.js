/*
 * Copyright (C) 2023-2025  Yomitan Authors
 * Copyright (C) 2020-2022  Yomichan Authors
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

/**
 * @param {import('dictionary').TermDictionaryEntry} dictionaryEntry
 * @returns {import('dictionary-data-util').TagGroup[]}
 */
export function groupTermTags(dictionaryEntry) {
    const {headwords} = dictionaryEntry;
    const headwordCount = headwords.length;
    const uniqueCheck = (headwordCount > 1);
    /** @type {Map<string, number>} */
    const resultsIndexMap = new Map();
    const results = [];
    for (let i = 0; i < headwordCount; ++i) {
        const {tags} = headwords[i];
        for (const tag of tags) {
            if (uniqueCheck) {
                const {name, category, content, dictionaries} = tag;
                const key = createMapKey([name, category, content, dictionaries]);
                const index = resultsIndexMap.get(key);
                if (typeof index !== 'undefined') {
                    const existingItem = results[index];
                    existingItem.headwordIndices.push(i);
                    continue;
                }
                resultsIndexMap.set(key, results.length);
            }

            const item = {tag, headwordIndices: [i]};
            results.push(item);
        }
    }
    return results;
}

/**
 * @param {import('dictionary').TermDictionaryEntry} dictionaryEntry
 * @param {import('dictionary-importer').Summary[]} dictionaryInfo
 * @returns {import('dictionary-data-util').DictionaryFrequency<import('dictionary-data-util').TermFrequency>[]}
 */
export function groupTermFrequencies(dictionaryEntry, dictionaryInfo) {
    const {headwords, frequencies: sourceFrequencies} = dictionaryEntry;

    /** @type {import('dictionary-data-util').TermFrequenciesMap1} */
    const map1 = new Map();
    /** @type {Map<string, string>} */
    const aliasMap = new Map();
    for (const {headwordIndex, dictionary, dictionaryAlias, hasReading, frequency, displayValue} of sourceFrequencies) {
        const {term, reading} = headwords[headwordIndex];

        let map2 = map1.get(dictionary);
        if (typeof map2 === 'undefined') {
            map2 = new Map();
            map1.set(dictionary, map2);
            aliasMap.set(dictionary, dictionaryAlias);
        }

        const readingKey = hasReading ? reading : null;
        const key = createMapKey([term, readingKey]);
        let frequencyData = map2.get(key);
        if (typeof frequencyData === 'undefined') {
            frequencyData = {term, reading: readingKey, values: new Map()};
            map2.set(key, frequencyData);
        }

        frequencyData.values.set(createMapKey([frequency, displayValue]), {frequency, displayValue});
    }

    const results = [];

    /** @type {import('dictionary').AverageFrequencyListGroup} */
    const averages = new Map();
    for (const [dictionary, map2] of map1.entries()) {
        /** @type {import('dictionary-data-util').TermFrequency[]} */
        const frequencies = [];
        const dictionaryAlias = aliasMap.get(dictionary) ?? dictionary;
        for (const {term, reading, values} of map2.values()) {
            const termFrequency = {
                term,
                reading,
                values: [...values.values()],
            };
            frequencies.push(termFrequency);

            const averageFrequencyData = makeAverageFrequencyData(termFrequency, averages.get(term));
            if (averageFrequencyData) {
                averages.set(term, averageFrequencyData);
            }
        }
        const currentDictionaryInfo = dictionaryInfo.find(({title}) => title === dictionary);
        const freqCount = currentDictionaryInfo?.counts?.termMeta.freq ?? 0;
        results.push({dictionary, frequencies, dictionaryAlias, freqCount});
    }

    results.push({dictionary: 'Average', frequencies: makeAverageFrequencyArray(averages), dictionaryAlias: 'Average', freqCount: 1});

    return results;
}

/**
 * @param {import('dictionary-data-util').TermFrequency} termFrequency
 * @param {import('dictionary').AverageFrequencyListTerm | undefined} averageTerm
 * @returns {import('dictionary').AverageFrequencyListTerm | undefined}
 */
function makeAverageFrequencyData(termFrequency, averageTerm) {
    const valuesArray = [...termFrequency.values.values()];
    const newReading = termFrequency.reading ?? '';

    /** @type {import('dictionary').AverageFrequencyListTerm} */
    const termMap = typeof averageTerm === 'undefined' ? new Map() : averageTerm;

    const frequencyData = termMap.get(newReading) ?? {currentAvg: 1, count: 0};

    if (valuesArray[0].frequency === null) { return; }

    frequencyData.currentAvg = frequencyData.count / frequencyData.currentAvg + 1 / valuesArray[0].frequency;
    frequencyData.currentAvg = (frequencyData.count + 1) / frequencyData.currentAvg;
    frequencyData.count += 1;

    termMap.set(newReading, frequencyData);
    return termMap;
}

/**
 * @param {import('dictionary').AverageFrequencyListGroup} averages
 * @returns {import('dictionary-data-util').TermFrequency[]}
 */
function makeAverageFrequencyArray(averages) {
    // Merge readings if one is null and there's only two readings
    // More than one non-null reading cannot be merged since it cannot be determined which reading to merge with
    for (const currentTerm of averages.keys()) {
        const readingsMap = averages.get(currentTerm);
        if (!readingsMap) { continue; } // Skip if readingsMap is undefined

        const readingArray = [...readingsMap.keys()];
        const nullIndex = readingArray.indexOf('');

        if (readingArray.length === 2 && nullIndex >= 0) {
            const key1 = readingArray[0];
            const key2 = readingArray[1];

            const value1 = readingsMap.get(key1);
            const value2 = readingsMap.get(key2);

            if (!value1 || !value2) { continue; } // Skip if any value is undefined

            const avg1 = value1.currentAvg;
            const count1 = value1.count;
            const avg2 = value2.currentAvg;
            const count2 = value2.count;

            const newcount = count1 + count2;
            const newavg = newcount / (count1 / avg1 + count2 / avg2);

            const validKey = nullIndex === 0 ? key2 : key1;
            readingsMap.set(validKey, {currentAvg: newavg, count: newcount});
            readingsMap.delete('');
        }
    }

    // Convert averages Map back to array format
    return [...averages.entries()].flatMap(([termName, termMap]) => [...termMap.entries()].map(([readingName, data]) => ({
        term: termName,
        reading: readingName,
        values: [{
            frequency: Math.round(data.currentAvg),
            displayValue: Math.round(data.currentAvg).toString(),
        }],
    })));
}

/**
 * @param {import('dictionary').KanjiFrequency[]} sourceFrequencies
 * @param {import('dictionary-importer').Summary[]} dictionaryInfo
 * @returns {import('dictionary-data-util').DictionaryFrequency<import('dictionary-data-util').KanjiFrequency>[]}
 */
export function groupKanjiFrequencies(sourceFrequencies, dictionaryInfo) {
    /** @type {import('dictionary-data-util').KanjiFrequenciesMap1} */
    const map1 = new Map();
    /** @type {Map<string, string>} */
    const aliasMap = new Map();
    for (const {dictionary, dictionaryAlias, character, frequency, displayValue} of sourceFrequencies) {
        let map2 = map1.get(dictionary);
        if (typeof map2 === 'undefined') {
            map2 = new Map();
            map1.set(dictionary, map2);
            aliasMap.set(dictionary, dictionaryAlias);
        }

        let frequencyData = map2.get(character);
        if (typeof frequencyData === 'undefined') {
            frequencyData = {character, values: new Map()};
            map2.set(character, frequencyData);
        }

        frequencyData.values.set(createMapKey([frequency, displayValue]), {frequency, displayValue});
    }

    const results = [];
    for (const [dictionary, map2] of map1.entries()) {
        const frequencies = [];
        const dictionaryAlias = aliasMap.get(dictionary) ?? dictionary;
        for (const {character, values} of map2.values()) {
            frequencies.push({
                character,
                values: [...values.values()],
            });
        }
        const currentDictionaryInfo = dictionaryInfo.find(({title}) => title === dictionary);
        const freqCount = currentDictionaryInfo?.counts?.kanjiMeta.freq ?? 0;
        results.push({dictionary, frequencies, dictionaryAlias, freqCount});
    }
    return results;
}

/**
 * @param {import('dictionary').TermDictionaryEntry} dictionaryEntry
 * @returns {import('dictionary-data-util').DictionaryGroupedPronunciations[]}
 */
export function getGroupedPronunciations(dictionaryEntry) {
    const {headwords, pronunciations: termPronunciations} = dictionaryEntry;

    /** @type {Set<string>} */
    const allTerms = new Set();
    const allReadings = new Set();
    /** @type {Map<string, string>} */
    const aliasMap = new Map();
    for (const {term, reading} of headwords) {
        allTerms.add(term);
        allReadings.add(reading);
    }

    /** @type {Map<string, import('dictionary-data-util').GroupedPronunciationInternal[]>} */
    const groupedPronunciationsMap = new Map();
    for (const {headwordIndex, dictionary, dictionaryAlias, pronunciations} of termPronunciations) {
        const {term, reading} = headwords[headwordIndex];
        let dictionaryGroupedPronunciationList = groupedPronunciationsMap.get(dictionary);
        if (typeof dictionaryGroupedPronunciationList === 'undefined') {
            dictionaryGroupedPronunciationList = [];
            groupedPronunciationsMap.set(dictionary, dictionaryGroupedPronunciationList);
            aliasMap.set(dictionary, dictionaryAlias);
        }
        for (const pronunciation of pronunciations) {
            let groupedPronunciation = findExistingGroupedPronunciation(reading, pronunciation, dictionaryGroupedPronunciationList);
            if (groupedPronunciation === null) {
                groupedPronunciation = {
                    pronunciation,
                    terms: new Set(),
                    reading,
                };
                dictionaryGroupedPronunciationList.push(groupedPronunciation);
            }
            groupedPronunciation.terms.add(term);
        }
    }

    /** @type {import('dictionary-data-util').DictionaryGroupedPronunciations[]} */
    const results2 = [];
    const multipleReadings = (allReadings.size > 1);
    for (const [dictionary, dictionaryGroupedPronunciationList] of groupedPronunciationsMap.entries()) {
        /** @type {import('dictionary-data-util').GroupedPronunciation[]} */
        const pronunciations2 = [];
        const dictionaryAlias = aliasMap.get(dictionary) ?? dictionary;
        for (const groupedPronunciation of dictionaryGroupedPronunciationList) {
            const {pronunciation, terms, reading} = groupedPronunciation;
            const exclusiveTerms = !areSetsEqual(terms, allTerms) ? getSetIntersection(terms, allTerms) : [];
            const exclusiveReadings = [];
            if (multipleReadings) {
                exclusiveReadings.push(reading);
            }
            pronunciations2.push({
                pronunciation,
                terms: [...terms],
                reading,
                exclusiveTerms,
                exclusiveReadings,
            });
        }

        results2.push({dictionary, dictionaryAlias, pronunciations: pronunciations2});
    }
    return results2;
}

/**
 * @template {import('dictionary').PronunciationType} T
 * @param {import('dictionary').Pronunciation[]} pronunciations
 * @param {T} type
 * @returns {import('dictionary').PronunciationGeneric<T>[]}
 */
export function getPronunciationsOfType(pronunciations, type) {
    /** @type {import('dictionary').PronunciationGeneric<T>[]} */
    const results = [];
    for (const pronunciation of pronunciations) {
        if (pronunciation.type !== type) { continue; }
        // This is type safe, but for some reason the cast is needed.
        results.push(/** @type {import('dictionary').PronunciationGeneric<T>} */ (pronunciation));
    }
    return results;
}

/**
 * @param {import('dictionary').Tag[]|import('anki-templates').Tag[]} termTags
 * @returns {import('dictionary-data-util').TermFrequencyType}
 */
export function getTermFrequency(termTags) {
    let totalScore = 0;
    for (const {score} of termTags) {
        totalScore += score;
    }
    if (totalScore > 0) {
        return 'popular';
    } else if (totalScore < 0) {
        return 'rare';
    } else {
        return 'normal';
    }
}

/**
 * @param {import('dictionary').TermHeadword[]} headwords
 * @param {number[]} headwordIndices
 * @param {Set<string>} allTermsSet
 * @param {Set<string>} allReadingsSet
 * @returns {string[]}
 */
export function getDisambiguations(headwords, headwordIndices, allTermsSet, allReadingsSet) {
    if (allTermsSet.size <= 1 && allReadingsSet.size <= 1) { return []; }

    /** @type {Set<string>} */
    const terms = new Set();
    /** @type {Set<string>} */
    const readings = new Set();
    for (const headwordIndex of headwordIndices) {
        const {term, reading} = headwords[headwordIndex];
        terms.add(term);
        readings.add(reading);
    }

    /** @type {string[]} */
    const disambiguations = [];
    const addTerms = !areSetsEqual(terms, allTermsSet);
    const addReadings = !areSetsEqual(readings, allReadingsSet);
    if (addTerms) {
        disambiguations.push(...getSetIntersection(terms, allTermsSet));
    }
    if (addReadings) {
        if (addTerms) {
            for (const term of terms) {
                readings.delete(term);
            }
        }
        disambiguations.push(...getSetIntersection(readings, allReadingsSet));
    }
    return disambiguations;
}

/**
 * @param {string[]} wordClasses
 * @returns {boolean}
 */
export function isNonNounVerbOrAdjective(wordClasses) {
    let isVerbOrAdjective = false;
    let isSuruVerb = false;
    let isNoun = false;
    for (const wordClass of wordClasses) {
        switch (wordClass) {
            case 'v1':
            case 'v5':
            case 'vk':
            case 'vz':
            case 'adj-i':
                isVerbOrAdjective = true;
                break;
            case 'vs':
                isVerbOrAdjective = true;
                isSuruVerb = true;
                // Falls through
            case 'n':
                isNoun = true;
                break;
        }
    }
    return isVerbOrAdjective && !(isSuruVerb && isNoun);
}

/**
 * @param {string} current
 * @param {string} latest
 * @returns {boolean}
 */
export function compareRevisions(current, latest) {
    const simpleVersionTest = /^(\d+\.)*\d+$/; // dot-separated integers, so 4.7 or 24.1.1.1 are ok, 1.0.0-alpha is not
    if (!simpleVersionTest.test(current) || !simpleVersionTest.test(latest)) {
        return current < latest;
    }

    const currentParts = current.split('.').map((part) => Number.parseInt(part, 10));
    const latestParts = latest.split('.').map((part) => Number.parseInt(part, 10));

    if (currentParts.length !== latestParts.length) {
        return current < latest;
    }

    for (let i = 0; i < currentParts.length; i++) {
        if (currentParts[i] !== latestParts[i]) {
            return currentParts[i] < latestParts[i];
        }
    }

    return false;
}

// Private

/**
 * @param {string} reading
 * @param {import('dictionary').Pronunciation} pronunciation
 * @param {import('dictionary-data-util').GroupedPronunciationInternal[]} groupedPronunciationList
 * @returns {?import('dictionary-data-util').GroupedPronunciationInternal}
 */
function findExistingGroupedPronunciation(reading, pronunciation, groupedPronunciationList) {
    const existingGroupedPronunciation = groupedPronunciationList.find((groupedPronunciation) => {
        return groupedPronunciation.reading === reading && arePronunciationsEquivalent(groupedPronunciation, pronunciation);
    });

    return existingGroupedPronunciation || null;
}

/**
 * @param {import('dictionary-data-util').GroupedPronunciationInternal} groupedPronunciation
 * @param {import('dictionary').Pronunciation} pronunciation2
 * @returns {boolean}
 */
function arePronunciationsEquivalent({pronunciation: pronunciation1}, pronunciation2) {
    if (
        pronunciation1.type !== pronunciation2.type ||
        !areTagListsEqual(pronunciation1.tags, pronunciation2.tags)
    ) {
        return false;
    }
    switch (pronunciation1.type) {
        case 'pitch-accent':
        {
            // This cast is valid based on the type check at the start of the function.
            const pitchAccent2 = /** @type {import('dictionary').PitchAccent} */ (pronunciation2);
            return (
                pronunciation1.positions === pitchAccent2.positions &&
                areArraysEqual(pronunciation1.nasalPositions, pitchAccent2.nasalPositions) &&
                areArraysEqual(pronunciation1.devoicePositions, pitchAccent2.devoicePositions)
            );
        }
        case 'phonetic-transcription':
        {
            // This cast is valid based on the type check at the start of the function.
            const phoneticTranscription2 = /** @type {import('dictionary').PhoneticTranscription} */ (pronunciation2);
            return pronunciation1.ipa === phoneticTranscription2.ipa;
        }
    }
    return true;
}

/**
 * @template [T=unknown]
 * @param {T[]} array1
 * @param {T[]} array2
 * @returns {boolean}
 */
function areArraysEqual(array1, array2) {
    const ii = array1.length;
    if (ii !== array2.length) { return false; }
    for (let i = 0; i < ii; ++i) {
        if (array1[i] !== array2[i]) { return false; }
    }
    return true;
}

/**
 * @param {import('dictionary').Tag[]} tagList1
 * @param {import('dictionary').Tag[]} tagList2
 * @returns {boolean}
 */
function areTagListsEqual(tagList1, tagList2) {
    const ii = tagList1.length;
    if (tagList2.length !== ii) { return false; }

    for (let i = 0; i < ii; ++i) {
        const tag1 = tagList1[i];
        const tag2 = tagList2[i];
        if (tag1.name !== tag2.name || !areArraysEqual(tag1.dictionaries, tag2.dictionaries)) {
            return false;
        }
    }

    return true;
}

/**
 * @template [T=unknown]
 * @param {Set<T>} set1
 * @param {Set<T>} set2
 * @returns {boolean}
 */
function areSetsEqual(set1, set2) {
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

/**
 * @template [T=unknown]
 * @param {Set<T>} set1
 * @param {Set<T>} set2
 * @returns {T[]}
 */
function getSetIntersection(set1, set2) {
    const result = [];
    for (const value of set1) {
        if (set2.has(value)) {
            result.push(value);
        }
    }
    return result;
}

/**
 * @param {unknown[]} array
 * @returns {string}
 */
function createMapKey(array) {
    return JSON.stringify(array);
}
