/*
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

class DictionaryDataUtil {
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
                    const {name, category, notes, dictionary} = tag;
                    const key = this._createMapKey([name, category, notes, dictionary]);
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

    static groupTermFrequencies(dictionaryEntry) {
        const {headwords, frequencies} = dictionaryEntry;

        const map1 = new Map();
        for (const {headwordIndex, dictionary, hasReading, frequency, displayValue} of frequencies) {
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
        return this._createFrequencyGroupsFromMap(map1);
    }

    static groupKanjiFrequencies(frequencies) {
        const map1 = new Map();
        for (const {dictionary, character, frequency, displayValue} of frequencies) {
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
        return this._createFrequencyGroupsFromMap(map1);
    }

    static getGroupedPronunciations(dictionaryEntry) {
        const {headwords, pronunciations} = dictionaryEntry;

        const allTerms = new Set();
        const allReadings = new Set();
        for (const {term, reading} of headwords) {
            allTerms.add(term);
            allReadings.add(reading);
        }

        const groupedPronunciationsMap = new Map();
        for (const {headwordIndex, dictionary, pitches} of pronunciations) {
            const {term, reading} = headwords[headwordIndex];
            let dictionaryGroupedPronunciationList = groupedPronunciationsMap.get(dictionary);
            if (typeof dictionaryGroupedPronunciationList === 'undefined') {
                dictionaryGroupedPronunciationList = [];
                groupedPronunciationsMap.set(dictionary, dictionaryGroupedPronunciationList);
            }
            for (const {position, nasalPositions, devoicePositions, tags} of pitches) {
                let groupedPronunciation = this._findExistingGroupedPronunciation(reading, position, nasalPositions, devoicePositions, tags, dictionaryGroupedPronunciationList);
                if (groupedPronunciation === null) {
                    groupedPronunciation = {
                        terms: new Set(),
                        reading,
                        position,
                        nasalPositions,
                        devoicePositions,
                        tags,
                        exclusiveTerms: [],
                        exclusiveReadings: []
                    };
                    dictionaryGroupedPronunciationList.push(groupedPronunciation);
                }
                groupedPronunciation.terms.add(term);
            }
        }

        const multipleReadings = (allReadings.size > 1);
        for (const dictionaryGroupedPronunciationList of groupedPronunciationsMap.values()) {
            for (const groupedPronunciation of dictionaryGroupedPronunciationList) {
                const {terms, reading, exclusiveTerms, exclusiveReadings} = groupedPronunciation;
                if (!this._areSetsEqual(terms, allTerms)) {
                    exclusiveTerms.push(...this._getSetIntersection(terms, allTerms));
                }
                if (multipleReadings) {
                    exclusiveReadings.push(reading);
                }
                groupedPronunciation.terms = [...terms];
            }
        }

        const results2 = [];
        for (const [dictionary, pronunciations2] of groupedPronunciationsMap.entries()) {
            results2.push({dictionary, pronunciations: pronunciations2});
        }
        return results2;
    }

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

    static getDisambiguations(headwords, headwordIndices, allTermsSet, allReadingsSet) {
        if (allTermsSet.size <= 1 && allReadingsSet.size <= 1) { return []; }

        const terms = new Set();
        const readings = new Set();
        for (const headwordIndex of headwordIndices) {
            const {term, reading} = headwords[headwordIndex];
            terms.add(term);
            readings.add(reading);
        }

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

    static _createFrequencyGroupsFromMap(map) {
        const results = [];
        for (const [dictionary, map2] of map.entries()) {
            const frequencies = [];
            for (const frequencyData of map2.values()) {
                frequencyData.values = [...frequencyData.values.values()];
                frequencies.push(frequencyData);
            }
            results.push({dictionary, frequencies});
        }
        return results;
    }

    static _findExistingGroupedPronunciation(reading, position, nasalPositions, devoicePositions, tags, groupedPronunciationList) {
        for (const pitchInfo of groupedPronunciationList) {
            if (
                pitchInfo.reading === reading &&
                pitchInfo.position === position &&
                this._areArraysEqual(pitchInfo.nasalPositions, nasalPositions) &&
                this._areArraysEqual(pitchInfo.devoicePositions, devoicePositions) &&
                this._areTagListsEqual(pitchInfo.tags, tags)
            ) {
                return pitchInfo;
            }
        }
        return null;
    }

    static _areArraysEqual(array1, array2) {
        const ii = array1.length;
        if (ii !== array2.length) { return false; }
        for (let i = 0; i < ii; ++i) {
            if (array1[i] !== array2[i]) { return false; }
        }
        return true;
    }

    static _areTagListsEqual(tagList1, tagList2) {
        const ii = tagList1.length;
        if (tagList2.length !== ii) { return false; }

        for (let i = 0; i < ii; ++i) {
            const tag1 = tagList1[i];
            const tag2 = tagList2[i];
            if (tag1.name !== tag2.name || tag1.dictionary !== tag2.dictionary) {
                return false;
            }
        }

        return true;
    }

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

    static _getSetIntersection(set1, set2) {
        const result = [];
        for (const value of set1) {
            if (set2.has(value)) {
                result.push(value);
            }
        }
        return result;
    }

    static _createMapKey(array) {
        return JSON.stringify(array);
    }
}
