/*
 * Copyright (C) 2020  Yomichan Authors
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
    static getPitchAccentInfos(definition) {
        const results = new Map();
        const allExpressions = new Set();
        const allReadings = new Set();
        const expressions = definition.expressions;
        const sources = Array.isArray(expressions) ? expressions : [definition];

        for (const {pitches: expressionPitches, expression} of sources) {
            allExpressions.add(expression);

            for (const {reading, pitches, dictionary} of expressionPitches) {
                allReadings.add(reading);

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
                if (!areSetsEqual(resultExpressions, allExpressions)) {
                    exclusiveExpressions.push(...getSetIntersection(resultExpressions, allExpressions));
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
}
