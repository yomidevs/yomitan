/*
 * Copyright (C) 2023  Yomitan Authors
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

export class DictionaryDataUtil {
    /**
     * @param {import('dictionary').TermDictionaryEntry} dictionaryEntry
     * @returns {import('dictionary-data-util').TagGroup[]}
     */
    static groupTermTags(dictionaryEntry) {
        const {headwords} = dictionaryEntry;
        const headwordCount = headwords.length;
        const uniqueCheck = (headwordCount > 1);
        const resultsIndexMap = new Map();
        const results = [];
        for (let i = 0; i < headwordCount; ++i) {
            const {tags} = headwords[i];
            for (const tag of tags) {
                if (uniqueCheck) {
                    const {name, category, content, dictionaries} = tag;
                    const key = this._createMapKey([name, category, content, dictionaries]);
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
     * @returns {import('dictionary-data-util').DictionaryFrequency<import('dictionary-data-util').TermFrequency>[]}
     */
    static groupTermFrequencies(dictionaryEntry) {
        const {headwords, frequencies: sourceFrequencies} = dictionaryEntry;

        /** @type {import('dictionary-data-util').TermFrequenciesMap1} */
        const map1 = new Map();
        for (const {headwordIndex, dictionary, hasReading, frequency, displayValue} of sourceFrequencies) {
            const {term, reading} = headwords[headwordIndex];

            let map2 = map1.get(dictionary);
            if (typeof map2 === 'undefined') {
                map2 = new Map();
                map1.set(dictionary, map2);
            }

            const readingKey = hasReading ? reading : null;
            const key = this._createMapKey([term, readingKey]);
            let frequencyData = map2.get(key);
            if (typeof frequencyData === 'undefined') {
                frequencyData = {term, reading: readingKey, values: new Map()};
                map2.set(key, frequencyData);
            }

            frequencyData.values.set(this._createMapKey([frequency, displayValue]), {frequency, displayValue});
        }

        const results = [];
        for (const [dictionary, map2] of map1.entries()) {
            const frequencies = [];
            for (const {term, reading, values} of map2.values()) {
                frequencies.push({
                    term,
                    reading,
                    values: [...values.values()]
                });
            }
            results.push({dictionary, frequencies});
        }
        return results;
    }

    /**
     * @param {import('dictionary').KanjiFrequency[]} sourceFrequencies
     * @returns {import('dictionary-data-util').DictionaryFrequency<import('dictionary-data-util').KanjiFrequency>[]}
     */
    static groupKanjiFrequencies(sourceFrequencies) {
        /** @type {import('dictionary-data-util').KanjiFrequenciesMap1} */
        const map1 = new Map();
        for (const {dictionary, character, frequency, displayValue} of sourceFrequencies) {
            let map2 = map1.get(dictionary);
            if (typeof map2 === 'undefined') {
                map2 = new Map();
                map1.set(dictionary, map2);
            }

            let frequencyData = map2.get(character);
            if (typeof frequencyData === 'undefined') {
                frequencyData = {character, values: new Map()};
                map2.set(character, frequencyData);
            }

            frequencyData.values.set(this._createMapKey([frequency, displayValue]), {frequency, displayValue});
        }

        const results = [];
        for (const [dictionary, map2] of map1.entries()) {
            const frequencies = [];
            for (const {character, values} of map2.values()) {
                frequencies.push({
                    character,
                    values: [...values.values()]
                });
            }
            results.push({dictionary, frequencies});
        }
        return results;
    }

    /**
     * @param {import('dictionary').TermDictionaryEntry} dictionaryEntry
     * @returns {import('dictionary-data-util').DictionaryGroupedPronunciations[]}
     */
    static getGroupedPronunciations(dictionaryEntry) {
        const {headwords, pronunciations} = dictionaryEntry;

        const allTerms = new Set();
        const allReadings = new Set();
        for (const {term, reading} of headwords) {
            allTerms.add(term);
            allReadings.add(reading);
        }

        /** @type {Map<string, import('dictionary-data-util').GroupedPronunciationInternal[]>} */
        const groupedPronunciationsMap = new Map();

        for (const {headwordIndex, dictionary, pitches, phoneticTranscriptions} of pronunciations) {
            const {term, reading} = headwords[headwordIndex];
            let dictionaryGroupedPronunciationList = groupedPronunciationsMap.get(dictionary);
            if (typeof dictionaryGroupedPronunciationList === 'undefined') {
                dictionaryGroupedPronunciationList = [];
                groupedPronunciationsMap.set(dictionary, dictionaryGroupedPronunciationList);
            }
            for (const {position, nasalPositions, devoicePositions, tags} of pitches) {
                let groupedPronunciation = this._findExistingGroupedPronunciation(reading, null, position, nasalPositions, devoicePositions, tags, dictionaryGroupedPronunciationList);
                if (groupedPronunciation === null) {
                    groupedPronunciation = {
                        type: 'pitch-accent',
                        terms: new Set(),
                        reading,
                        position,
                        nasalPositions,
                        devoicePositions,
                        tags
                    };
                    dictionaryGroupedPronunciationList.push(groupedPronunciation);
                }
                groupedPronunciation.terms.add(term);
            }
            for (const {ipa, tags = []} of phoneticTranscriptions) {
                let groupedPronunciation = this._findExistingGroupedPronunciation(reading, ipa, null, null, null, tags, dictionaryGroupedPronunciationList);
                if (groupedPronunciation === null) {
                    groupedPronunciation = {
                        type: 'phonetic-transcription',
                        terms: new Set(),
                        reading,
                        ipa,
                        tags
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
            const pronunciationsWithExclusive = [];
            for (const groupedPronunciation of dictionaryGroupedPronunciationList) {
                const {terms, type, reading, tags} = groupedPronunciation;
                const ipa = groupedPronunciation.type === 'phonetic-transcription' ? groupedPronunciation.ipa : null;
                const {position, nasalPositions, devoicePositions} = groupedPronunciation.type === 'pitch-accent' ? groupedPronunciation : {position: null, nasalPositions: null, devoicePositions: null};

                const exclusiveTerms = !this._areSetsEqual(terms, allTerms) ? this._getSetIntersection(terms, allTerms) : [];
                const exclusiveReadings = [];
                if (multipleReadings) {
                    exclusiveReadings.push(reading);
                }
                pronunciationsWithExclusive.push({
                    terms: [...terms],
                    type,
                    reading,
                    ipa,
                    position,
                    nasalPositions,
                    devoicePositions,
                    tags,
                    exclusiveTerms,
                    exclusiveReadings
                });
            }
            results2.push({dictionary, pronunciations: pronunciationsWithExclusive});
        }

        return results2;
    }

    /**
     * @param {import('dictionary').Tag[]|import('anki-templates').Tag[]} termTags
     * @returns {import('dictionary-data-util').TermFrequencyType}
     */
    static getTermFrequency(termTags) {
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
    static getDisambiguations(headwords, headwordIndices, allTermsSet, allReadingsSet) {
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
        const addTerms = !this._areSetsEqual(terms, allTermsSet);
        const addReadings = !this._areSetsEqual(readings, allReadingsSet);
        if (addTerms) {
            disambiguations.push(...this._getSetIntersection(terms, allTermsSet));
        }
        if (addReadings) {
            if (addTerms) {
                for (const term of terms) {
                    readings.delete(term);
                }
            }
            disambiguations.push(...this._getSetIntersection(readings, allReadingsSet));
        }
        return disambiguations;
    }

    /**
     * @param {string[]} wordClasses
     * @returns {boolean}
     */
    static isNonNounVerbOrAdjective(wordClasses) {
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
                    break;
                case 'n':
                    isNoun = true;
                    break;
            }
        }
        return isVerbOrAdjective && !(isSuruVerb && isNoun);
    }

    // Private

    /**
     * @param {string} reading
     * @param {string | null} ipa
     * @param {number | null} position
     * @param {number[] | null} nasalPositions
     * @param {number[] | null} devoicePositions
     * @param {import('dictionary').Tag[]} tags
     * @param {import('dictionary-data-util').GroupedPronunciationInternal[]} groupedPronunciationList
     * @returns {?import('dictionary-data-util').GroupedPronunciationInternal}
     */
    static _findExistingGroupedPronunciation(reading, ipa, position, nasalPositions, devoicePositions, tags, groupedPronunciationList) {
        for (const pronunciation of groupedPronunciationList) {
            if (
                pronunciation.reading === reading &&
                this._areTagListsEqual(pronunciation.tags, tags) &&
                (
                    pronunciation.type === 'pitch-accent' &&
                    pronunciation.position === position &&
                    this._areArraysEqual(pronunciation.nasalPositions, nasalPositions) &&
                    this._areArraysEqual(pronunciation.devoicePositions, devoicePositions)
                    ||
                    pronunciation.type === 'phonetic-transcription' &&
                    pronunciation.ipa === ipa
                )
            ) {
                return pronunciation;
            }
        }
        return null;
    }

    /**
     * @template [T=unknown]
     * @param {T[] | null} array1
     * @param {T[] | null} array2
     * @returns {boolean}
     */
    static _areArraysEqual(array1, array2) {
        if (array1 === null || array2 === null) {
            return array1 === array2;
        }
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
    static _areTagListsEqual(tagList1, tagList2) {
        const ii = tagList1.length;
        if (tagList2.length !== ii) { return false; }

        for (let i = 0; i < ii; ++i) {
            const tag1 = tagList1[i];
            const tag2 = tagList2[i];
            if (tag1.name !== tag2.name || !this._areArraysEqual(tag1.dictionaries, tag2.dictionaries)) {
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
    static _areSetsEqual(set1, set2) {
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
    static _getSetIntersection(set1, set2) {
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
    static _createMapKey(array) {
        return JSON.stringify(array);
    }
}
