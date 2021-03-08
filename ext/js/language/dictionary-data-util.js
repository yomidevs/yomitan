/*
 * Copyright (C) 2020-2021  Yomichan Authors
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
    static groupTermTags(definition) {
        const {expressions} = definition;
        const expressionsLength = expressions.length;
        const uniqueCheck = (expressionsLength > 1);
        const resultsMap = new Map();
        const results = [];
        for (let i = 0; i < expressionsLength; ++i) {
            const {termTags, expression, reading} = expressions[i];
            for (const tag of termTags) {
                if (uniqueCheck) {
                    const {name, category, notes, dictionary} = tag;
                    const key = this._createMapKey([name, category, notes, dictionary]);
                    const index = resultsMap.get(key);
                    if (typeof index !== 'undefined') {
                        const existingItem = results[index];
                        existingItem.expressions.push({index: i, expression, reading});
                        continue;
                    }
                    resultsMap.set(key, results.length);
                }

                const item = {
                    tag,
                    expressions: [{index: i, expression, reading}]
                };
                results.push(item);
            }
        }
        return results;
    }

    static groupTermFrequencies(frequencies) {
        const map1 = new Map();
        for (const {dictionary, expression, reading, hasReading, frequency} of frequencies) {
            let map2 = map1.get(dictionary);
            if (typeof map2 === 'undefined') {
                map2 = new Map();
                map1.set(dictionary, map2);
            }

            const readingKey = hasReading ? reading : null;
            const key = this._createMapKey([expression, readingKey]);
            let frequencyData = map2.get(key);
            if (typeof frequencyData === 'undefined') {
                frequencyData = {expression, reading: readingKey, frequencies: new Set()};
                map2.set(key, frequencyData);
            }

            frequencyData.frequencies.add(frequency);
        }
        return this._createFrequencyGroupsFromMap(map1);
    }

    static groupKanjiFrequencies(frequencies) {
        const map1 = new Map();
        for (const {dictionary, character, frequency} of frequencies) {
            let map2 = map1.get(dictionary);
            if (typeof map2 === 'undefined') {
                map2 = new Map();
                map1.set(dictionary, map2);
            }

            let frequencyData = map2.get(character);
            if (typeof frequencyData === 'undefined') {
                frequencyData = {character, frequencies: new Set()};
                map2.set(character, frequencyData);
            }

            frequencyData.frequencies.add(frequency);
        }
        return this._createFrequencyGroupsFromMap(map1);
    }

    static getPitchAccentInfos(definition) {
        if (definition.type === 'kanji') { return []; }

        const results = new Map();
        const allExpressions = new Set();
        const allReadings = new Set();

        for (const {expression, reading, pitches: expressionPitches} of definition.expressions) {
            allExpressions.add(expression);
            allReadings.add(reading);

            for (const {pitches, dictionary} of expressionPitches) {
                let dictionaryResults = results.get(dictionary);
                if (typeof dictionaryResults === 'undefined') {
                    dictionaryResults = [];
                    results.set(dictionary, dictionaryResults);
                }

                for (const {position, tags} of pitches) {
                    let pitchAccentInfo = this._findExistingPitchAccentInfo(reading, position, tags, dictionaryResults);
                    if (pitchAccentInfo === null) {
                        pitchAccentInfo = {expressions: new Set(), reading, position, tags};
                        dictionaryResults.push(pitchAccentInfo);
                    }
                    pitchAccentInfo.expressions.add(expression);
                }
            }
        }

        const multipleReadings = (allReadings.size > 1);
        for (const dictionaryResults of results.values()) {
            for (const result of dictionaryResults) {
                const exclusiveExpressions = [];
                const exclusiveReadings = [];
                const resultExpressions = result.expressions;
                if (!this._areSetsEqual(resultExpressions, allExpressions)) {
                    exclusiveExpressions.push(...this._getSetIntersection(resultExpressions, allExpressions));
                }
                if (multipleReadings) {
                    exclusiveReadings.push(result.reading);
                }
                result.expressions = [...resultExpressions];
                result.exclusiveExpressions = exclusiveExpressions;
                result.exclusiveReadings = exclusiveReadings;
            }
        }

        const results2 = [];
        for (const [dictionary, pitches] of results.entries()) {
            results2.push({dictionary, pitches});
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

    // Private

    static _createFrequencyGroupsFromMap(map) {
        const results = [];
        for (const [dictionary, map2] of map.entries()) {
            const frequencyDataArray = [];
            for (const frequencyData of map2.values()) {
                frequencyData.frequencies = [...frequencyData.frequencies];
                frequencyDataArray.push(frequencyData);
            }
            results.push({dictionary, frequencyData: frequencyDataArray});
        }
        return results;
    }

    static _findExistingPitchAccentInfo(reading, position, tags, pitchAccentInfoList) {
        for (const pitchInfo of pitchAccentInfoList) {
            if (
                pitchInfo.reading === reading &&
                pitchInfo.position === position &&
                this._areTagListsEqual(pitchInfo.tags, tags)
            ) {
                return pitchInfo;
            }
        }
        return null;
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
