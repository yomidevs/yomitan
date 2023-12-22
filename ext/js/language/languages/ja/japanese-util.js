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

import {
    CJK_IDEOGRAPH_RANGES,
    DIACRITIC_MAPPING,
    HIRAGANA_CONVERSION_RANGE,
    HIRAGANA_SMALL_TSU_CODE_POINT,
    JAPANESE_RANGES,
    KANA_PROLONGED_SOUND_MARK_CODE_POINT,
    KANA_RANGES,
    KANA_TO_VOWEL_MAPPING,
    KATAKANA_CONVERSION_RANGE,
    KATAKANA_SMALL_KA_CODE_POINT,
    KATAKANA_SMALL_KE_CODE_POINT,
    KATAKANA_SMALL_TSU_CODE_POINT,
    SMALL_KANA_SET
} from './constants.js';

/**
 * @param {number} codePoint
 * @param {import('japanese-util').CodepointRange} range
 * @returns {boolean}
 */
// eslint-disable-next-line no-implicit-globals
function isCodePointInRange(codePoint, [min, max]) {
    return (codePoint >= min && codePoint <= max);
}

/**
 * @param {number} codePoint
 * @param {import('japanese-util').CodepointRange[]} ranges
 * @returns {boolean}
 */
// eslint-disable-next-line no-implicit-globals
function isCodePointInRanges(codePoint, ranges) {
    for (const [min, max] of ranges) {
        if (codePoint >= min && codePoint <= max) {
            return true;
        }
    }
    return false;
}

/**
 * @param {string} previousCharacter
 * @returns {?string}
 */
// eslint-disable-next-line no-implicit-globals
function getProlongedHiragana(previousCharacter) {
    switch (KANA_TO_VOWEL_MAPPING.get(previousCharacter)) {
        case 'a': return 'あ';
        case 'i': return 'い';
        case 'u': return 'う';
        case 'e': return 'え';
        case 'o': return 'う';
        default: return null;
    }
}


export class JapaneseUtil {
    /**
     * @param {?import('wanakana')|import('../../../../lib/wanakana.js')} wanakana
     */
    constructor(wanakana = null) {
        /** @type {?import('wanakana')} */
        this._wanakana = /** @type {import('wanakana')} */ (wanakana);
    }

    // Character code testing functions

    /**
     * @param {number} codePoint
     * @returns {boolean}
     */
    isCodePointKanji(codePoint) {
        return isCodePointInRanges(codePoint, CJK_IDEOGRAPH_RANGES);
    }

    /**
     * @param {number} codePoint
     * @returns {boolean}
     */
    isCodePointKana(codePoint) {
        return isCodePointInRanges(codePoint, KANA_RANGES);
    }

    /**
     * @param {number} codePoint
     * @returns {boolean}
     */
    isCodePointJapanese(codePoint) {
        return isCodePointInRanges(codePoint, JAPANESE_RANGES);
    }

    // String testing functions

    /**
     * @param {string} str
     * @returns {boolean}
     */
    isStringEntirelyKana(str) {
        if (str.length === 0) { return false; }
        for (const c of str) {
            if (!isCodePointInRanges(/** @type {number} */ (c.codePointAt(0)), KANA_RANGES)) {
                return false;
            }
        }
        return true;
    }

    /**
     * @param {string} str
     * @returns {boolean}
     */
    isStringPartiallyJapanese(str) {
        if (str.length === 0) { return false; }
        for (const c of str) {
            if (isCodePointInRanges(/** @type {number} */ (c.codePointAt(0)), JAPANESE_RANGES)) {
                return true;
            }
        }
        return false;
    }

    // Mora functions

    /**
     * @param {number} moraIndex
     * @param {number} pitchAccentDownstepPosition
     * @returns {boolean}
     */
    isMoraPitchHigh(moraIndex, pitchAccentDownstepPosition) {
        switch (pitchAccentDownstepPosition) {
            case 0: return (moraIndex > 0);
            case 1: return (moraIndex < 1);
            default: return (moraIndex > 0 && moraIndex < pitchAccentDownstepPosition);
        }
    }

    /**
     * @param {string} text
     * @param {number} pitchAccentDownstepPosition
     * @param {boolean} isVerbOrAdjective
     * @returns {?import('japanese-util').PitchCategory}
     */
    getPitchCategory(text, pitchAccentDownstepPosition, isVerbOrAdjective) {
        if (pitchAccentDownstepPosition === 0) {
            return 'heiban';
        }
        if (isVerbOrAdjective) {
            return pitchAccentDownstepPosition > 0 ? 'kifuku' : null;
        }
        if (pitchAccentDownstepPosition === 1) {
            return 'atamadaka';
        }
        if (pitchAccentDownstepPosition > 1) {
            return pitchAccentDownstepPosition >= this.getKanaMoraCount(text) ? 'odaka' : 'nakadaka';
        }
        return null;
    }

    /**
     * @param {string} text
     * @returns {string[]}
     */
    getKanaMorae(text) {
        const morae = [];
        let i;
        for (const c of text) {
            if (SMALL_KANA_SET.has(c) && (i = morae.length) > 0) {
                morae[i - 1] += c;
            } else {
                morae.push(c);
            }
        }
        return morae;
    }

    /**
     * @param {string} text
     * @returns {number}
     */
    getKanaMoraCount(text) {
        let moraCount = 0;
        for (const c of text) {
            if (!(SMALL_KANA_SET.has(c) && moraCount > 0)) {
                ++moraCount;
            }
        }
        return moraCount;
    }

    // Conversion functions

    /**
     * @param {string} text
     * @returns {string}
     */
    convertToKana(text) {
        return this._getWanakana().toKana(text);
    }

    /**
     * @returns {boolean}
     */
    convertToKanaSupported() {
        return this._wanakana !== null;
    }

    /**
     * @param {string} text
     * @param {boolean} [keepProlongedSoundMarks]
     * @returns {string}
     */
    convertKatakanaToHiragana(text, keepProlongedSoundMarks = false) {
        let result = '';
        const offset = (HIRAGANA_CONVERSION_RANGE[0] - KATAKANA_CONVERSION_RANGE[0]);
        for (let char of text) {
            const codePoint = /** @type {number} */ (char.codePointAt(0));
            switch (codePoint) {
                case KATAKANA_SMALL_KA_CODE_POINT:
                case KATAKANA_SMALL_KE_CODE_POINT:
                    // No change
                    break;
                case KANA_PROLONGED_SOUND_MARK_CODE_POINT:
                    if (!keepProlongedSoundMarks && result.length > 0) {
                        const char2 = getProlongedHiragana(result[result.length - 1]);
                        if (char2 !== null) { char = char2; }
                    }
                    break;
                default:
                    if (isCodePointInRange(codePoint, KATAKANA_CONVERSION_RANGE)) {
                        char = String.fromCodePoint(codePoint + offset);
                    }
                    break;
            }
            result += char;
        }
        return result;
    }

    /**
     * @param {string} text
     * @returns {string}
     */
    convertHiraganaToKatakana(text) {
        let result = '';
        const offset = (KATAKANA_CONVERSION_RANGE[0] - HIRAGANA_CONVERSION_RANGE[0]);
        for (let char of text) {
            const codePoint = /** @type {number} */ (char.codePointAt(0));
            if (isCodePointInRange(codePoint, HIRAGANA_CONVERSION_RANGE)) {
                char = String.fromCodePoint(codePoint + offset);
            }
            result += char;
        }
        return result;
    }

    /**
     * @param {string} text
     * @returns {string}
     */
    convertToRomaji(text) {
        const wanakana = this._getWanakana();
        return wanakana.toRomaji(text);
    }

    /**
     * @returns {boolean}
     */
    convertToRomajiSupported() {
        return this._wanakana !== null;
    }

    /**
     * @param {string} character
     * @returns {?{character: string, type: import('japanese-util').DiacriticType}}
     */
    getKanaDiacriticInfo(character) {
        const info = DIACRITIC_MAPPING.get(character);
        return typeof info !== 'undefined' ? {character: info.character, type: info.type} : null;
    }

    // Furigana distribution

    /**
     * @param {string} term
     * @param {string} reading
     * @returns {import('japanese-util').FuriganaSegment[]}
     */
    distributeFurigana(term, reading) {
        if (reading === term) {
            // Same
            return [this._createFuriganaSegment(term, '')];
        }

        /** @type {import('japanese-util').FuriganaGroup[]} */
        const groups = [];
        /** @type {?import('japanese-util').FuriganaGroup} */
        let groupPre = null;
        let isKanaPre = null;
        for (const c of term) {
            const codePoint = /** @type {number} */ (c.codePointAt(0));
            const isKana = this.isCodePointKana(codePoint);
            if (isKana === isKanaPre) {
                /** @type {import('japanese-util').FuriganaGroup} */ (groupPre).text += c;
            } else {
                groupPre = {isKana, text: c, textNormalized: null};
                groups.push(groupPre);
                isKanaPre = isKana;
            }
        }
        for (const group of groups) {
            if (group.isKana) {
                group.textNormalized = this.convertKatakanaToHiragana(group.text);
            }
        }

        const readingNormalized = this.convertKatakanaToHiragana(reading);
        const segments = this._segmentizeFurigana(reading, readingNormalized, groups, 0);
        if (segments !== null) {
            return segments;
        }

        // Fallback
        return [this._createFuriganaSegment(term, reading)];
    }

    /**
     * @param {string} term
     * @param {string} reading
     * @param {string} source
     * @returns {import('japanese-util').FuriganaSegment[]}
     */
    distributeFuriganaInflected(term, reading, source) {
        const termNormalized = this.convertKatakanaToHiragana(term);
        const readingNormalized = this.convertKatakanaToHiragana(reading);
        const sourceNormalized = this.convertKatakanaToHiragana(source);

        let mainText = term;
        let stemLength = this._getStemLength(termNormalized, sourceNormalized);

        // Check if source is derived from the reading instead of the term
        const readingStemLength = this._getStemLength(readingNormalized, sourceNormalized);
        if (readingStemLength > 0 && readingStemLength >= stemLength) {
            mainText = reading;
            stemLength = readingStemLength;
            reading = `${source.substring(0, stemLength)}${reading.substring(stemLength)}`;
        }

        const segments = [];
        if (stemLength > 0) {
            mainText = `${source.substring(0, stemLength)}${mainText.substring(stemLength)}`;
            const segments2 = this.distributeFurigana(mainText, reading);
            let consumed = 0;
            for (const segment of segments2) {
                const {text} = segment;
                const start = consumed;
                consumed += text.length;
                if (consumed < stemLength) {
                    segments.push(segment);
                } else if (consumed === stemLength) {
                    segments.push(segment);
                    break;
                } else {
                    if (start < stemLength) {
                        segments.push(this._createFuriganaSegment(mainText.substring(start, stemLength), ''));
                    }
                    break;
                }
            }
        }

        if (stemLength < source.length) {
            const remainder = source.substring(stemLength);
            const segmentCount = segments.length;
            if (segmentCount > 0 && segments[segmentCount - 1].reading.length === 0) {
                // Append to the last segment if it has an empty reading
                segments[segmentCount - 1].text += remainder;
            } else {
                // Otherwise, create a new segment
                segments.push(this._createFuriganaSegment(remainder, ''));
            }
        }

        return segments;
    }

    // Miscellaneous

    /**
     * @param {string} text
     * @param {boolean} fullCollapse
     * @param {?import('../../../general/text-source-map.js').TextSourceMap} [sourceMap]
     * @returns {string}
     */
    collapseEmphaticSequences(text, fullCollapse, sourceMap = null) {
        let result = '';
        let collapseCodePoint = -1;
        const hasSourceMap = (sourceMap !== null);
        for (const char of text) {
            const c = char.codePointAt(0);
            if (
                c === HIRAGANA_SMALL_TSU_CODE_POINT ||
                c === KATAKANA_SMALL_TSU_CODE_POINT ||
                c === KANA_PROLONGED_SOUND_MARK_CODE_POINT
            ) {
                if (collapseCodePoint !== c) {
                    collapseCodePoint = c;
                    if (!fullCollapse) {
                        result += char;
                        continue;
                    }
                }
            } else {
                collapseCodePoint = -1;
                result += char;
                continue;
            }

            if (hasSourceMap) {
                sourceMap.combine(Math.max(0, result.length - 1), 1);
            }
        }
        return result;
    }

    // Private

    /**
     * @param {string} text
     * @param {string} reading
     * @returns {import('japanese-util').FuriganaSegment}
     */
    _createFuriganaSegment(text, reading) {
        return {text, reading};
    }

    /**
     * @param {string} reading
     * @param {string} readingNormalized
     * @param {import('japanese-util').FuriganaGroup[]} groups
     * @param {number} groupsStart
     * @returns {?(import('japanese-util').FuriganaSegment[])}
     */
    _segmentizeFurigana(reading, readingNormalized, groups, groupsStart) {
        const groupCount = groups.length - groupsStart;
        if (groupCount <= 0) {
            return reading.length === 0 ? [] : null;
        }

        const group = groups[groupsStart];
        const {isKana, text} = group;
        const textLength = text.length;
        if (isKana) {
            const {textNormalized} = group;
            if (textNormalized !== null && readingNormalized.startsWith(textNormalized)) {
                const segments = this._segmentizeFurigana(
                    reading.substring(textLength),
                    readingNormalized.substring(textLength),
                    groups,
                    groupsStart + 1
                );
                if (segments !== null) {
                    if (reading.startsWith(text)) {
                        segments.unshift(this._createFuriganaSegment(text, ''));
                    } else {
                        segments.unshift(...this._getFuriganaKanaSegments(text, reading));
                    }
                    return segments;
                }
            }
            return null;
        } else {
            let result = null;
            for (let i = reading.length; i >= textLength; --i) {
                const segments = this._segmentizeFurigana(
                    reading.substring(i),
                    readingNormalized.substring(i),
                    groups,
                    groupsStart + 1
                );
                if (segments !== null) {
                    if (result !== null) {
                        // More than one way to segmentize the tail; mark as ambiguous
                        return null;
                    }
                    const segmentReading = reading.substring(0, i);
                    segments.unshift(this._createFuriganaSegment(text, segmentReading));
                    result = segments;
                }
                // There is only one way to segmentize the last non-kana group
                if (groupCount === 1) {
                    break;
                }
            }
            return result;
        }
    }

    /**
     * @param {string} text
     * @param {string} reading
     * @returns {import('japanese-util').FuriganaSegment[]}
     */
    _getFuriganaKanaSegments(text, reading) {
        const textLength = text.length;
        const newSegments = [];
        let start = 0;
        let state = (reading[0] === text[0]);
        for (let i = 1; i < textLength; ++i) {
            const newState = (reading[i] === text[i]);
            if (state === newState) { continue; }
            newSegments.push(this._createFuriganaSegment(text.substring(start, i), state ? '' : reading.substring(start, i)));
            state = newState;
            start = i;
        }
        newSegments.push(this._createFuriganaSegment(text.substring(start, textLength), state ? '' : reading.substring(start, textLength)));
        return newSegments;
    }

    /**
     * @returns {import('wanakana')}
     * @throws {Error}
     */
    _getWanakana() {
        const wanakana = this._wanakana;
        if (wanakana === null) { throw new Error('Functions which use WanaKana are not supported in this context'); }
        return wanakana;
    }

    /**
     * @param {string} text1
     * @param {string} text2
     * @returns {number}
     */
    _getStemLength(text1, text2) {
        const minLength = Math.min(text1.length, text2.length);
        if (minLength === 0) { return 0; }

        let i = 0;
        while (true) {
            const char1 = /** @type {number} */ (text1.codePointAt(i));
            const char2 = /** @type {number} */ (text2.codePointAt(i));
            if (char1 !== char2) { break; }
            const charLength = String.fromCodePoint(char1).length;
            i += charLength;
            if (i >= minLength) {
                if (i > minLength) {
                    i -= charLength; // Don't consume partial UTF16 surrogate characters
                }
                break;
            }
        }
        return i;
    }
}
