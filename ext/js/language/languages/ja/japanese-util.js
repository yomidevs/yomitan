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

export const JapaneseUtil = (() => {
    const HIRAGANA_SMALL_TSU_CODE_POINT = 0x3063;
    const KATAKANA_SMALL_TSU_CODE_POINT = 0x30c3;
    const KATAKANA_SMALL_KA_CODE_POINT = 0x30f5;
    const KATAKANA_SMALL_KE_CODE_POINT = 0x30f6;
    const KANA_PROLONGED_SOUND_MARK_CODE_POINT = 0x30fc;

    const HIRAGANA_RANGE = [0x3040, 0x309f];
    const KATAKANA_RANGE = [0x30a0, 0x30ff];

    const HIRAGANA_CONVERSION_RANGE = [0x3041, 0x3096];
    const KATAKANA_CONVERSION_RANGE = [0x30a1, 0x30f6];

    const KANA_RANGES = [HIRAGANA_RANGE, KATAKANA_RANGE];

    const CJK_UNIFIED_IDEOGRAPHS_RANGE = [0x4e00, 0x9fff];
    const CJK_UNIFIED_IDEOGRAPHS_EXTENSION_A_RANGE = [0x3400, 0x4dbf];
    const CJK_UNIFIED_IDEOGRAPHS_EXTENSION_B_RANGE = [0x20000, 0x2a6df];
    const CJK_UNIFIED_IDEOGRAPHS_EXTENSION_C_RANGE = [0x2a700, 0x2b73f];
    const CJK_UNIFIED_IDEOGRAPHS_EXTENSION_D_RANGE = [0x2b740, 0x2b81f];
    const CJK_UNIFIED_IDEOGRAPHS_EXTENSION_E_RANGE = [0x2b820, 0x2ceaf];
    const CJK_UNIFIED_IDEOGRAPHS_EXTENSION_F_RANGE = [0x2ceb0, 0x2ebef];
    const CJK_COMPATIBILITY_IDEOGRAPHS_RANGE = [0xf900, 0xfaff];
    const CJK_COMPATIBILITY_IDEOGRAPHS_SUPPLEMENT_RANGE = [0x2f800, 0x2fa1f];
    const CJK_IDEOGRAPH_RANGES = [
        CJK_UNIFIED_IDEOGRAPHS_RANGE,
        CJK_UNIFIED_IDEOGRAPHS_EXTENSION_A_RANGE,
        CJK_UNIFIED_IDEOGRAPHS_EXTENSION_B_RANGE,
        CJK_UNIFIED_IDEOGRAPHS_EXTENSION_C_RANGE,
        CJK_UNIFIED_IDEOGRAPHS_EXTENSION_D_RANGE,
        CJK_UNIFIED_IDEOGRAPHS_EXTENSION_E_RANGE,
        CJK_UNIFIED_IDEOGRAPHS_EXTENSION_F_RANGE,
        CJK_COMPATIBILITY_IDEOGRAPHS_RANGE,
        CJK_COMPATIBILITY_IDEOGRAPHS_SUPPLEMENT_RANGE
    ];

    // Japanese character ranges, roughly ordered in order of expected frequency
    const JAPANESE_RANGES = [
        HIRAGANA_RANGE,
        KATAKANA_RANGE,

        ...CJK_IDEOGRAPH_RANGES,

        [0xff66, 0xff9f], // Halfwidth katakana

        [0x30fb, 0x30fc], // Katakana punctuation
        [0xff61, 0xff65], // Kana punctuation
        [0x3000, 0x303f], // CJK punctuation

        [0xff10, 0xff19], // Fullwidth numbers
        [0xff21, 0xff3a], // Fullwidth upper case Latin letters
        [0xff41, 0xff5a], // Fullwidth lower case Latin letters

        [0xff01, 0xff0f], // Fullwidth punctuation 1
        [0xff1a, 0xff1f], // Fullwidth punctuation 2
        [0xff3b, 0xff3f], // Fullwidth punctuation 3
        [0xff5b, 0xff60], // Fullwidth punctuation 4
        [0xffe0, 0xffee]  // Currency markers
    ];

    const SMALL_KANA_SET = new Set(Array.from('ぁぃぅぇぉゃゅょゎァィゥェォャュョヮ'));

    const VOWEL_TO_KANA_MAPPING = new Map([
        ['a', 'ぁあかがさざただなはばぱまゃやらゎわヵァアカガサザタダナハバパマャヤラヮワヵヷ'],
        ['i', 'ぃいきぎしじちぢにひびぴみりゐィイキギシジチヂニヒビピミリヰヸ'],
        ['u', 'ぅうくぐすずっつづぬふぶぷむゅゆるゥウクグスズッツヅヌフブプムュユルヴ'],
        ['e', 'ぇえけげせぜてでねへべぺめれゑヶェエケゲセゼテデネヘベペメレヱヶヹ'],
        ['o', 'ぉおこごそぞとどのほぼぽもょよろをォオコゴソゾトドノホボポモョヨロヲヺ'],
        ['', 'のノ']
    ]);

    const KANA_TO_VOWEL_MAPPING = (() => {
        const map = new Map();
        for (const [vowel, characters] of VOWEL_TO_KANA_MAPPING) {
            for (const character of characters) {
                map.set(character, vowel);
            }
        }
        return map;
    })();

    const DIACRITIC_MAPPING = (() => {
        const kana = 'うゔ-かが-きぎ-くぐ-けげ-こご-さざ-しじ-すず-せぜ-そぞ-ただ-ちぢ-つづ-てで-とど-はばぱひびぴふぶぷへべぺほぼぽワヷ-ヰヸ-ウヴ-ヱヹ-ヲヺ-カガ-キギ-クグ-ケゲ-コゴ-サザ-シジ-スズ-セゼ-ソゾ-タダ-チヂ-ツヅ-テデ-トド-ハバパヒビピフブプヘベペホボポ';
        const map = new Map();
        for (let i = 0, ii = kana.length; i < ii; i += 3) {
            const character = kana[i];
            const dakuten = kana[i + 1];
            const handakuten = kana[i + 2];
            map.set(dakuten, {character, type: 'dakuten'});
            if (handakuten !== '-') {
                map.set(handakuten, {character, type: 'handakuten'});
            }
        }
        return map;
    })();


    function isCodePointInRange(codePoint, [min, max]) {
        return (codePoint >= min && codePoint <= max);
    }

    function isCodePointInRanges(codePoint, ranges) {
        for (const [min, max] of ranges) {
            if (codePoint >= min && codePoint <= max) {
                return true;
            }
        }
        return false;
    }

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


    // eslint-disable-next-line no-shadow
    class JapaneseUtil {
        constructor(wanakana=null) {
            this._wanakana = wanakana;
        }

        // Character code testing functions

        isCodePointKanji(codePoint) {
            return isCodePointInRanges(codePoint, CJK_IDEOGRAPH_RANGES);
        }

        isCodePointKana(codePoint) {
            return isCodePointInRanges(codePoint, KANA_RANGES);
        }

        isCodePointJapanese(codePoint) {
            return isCodePointInRanges(codePoint, JAPANESE_RANGES);
        }

        // String testing functions

        isStringEntirelyKana(str) {
            if (str.length === 0) { return false; }
            for (const c of str) {
                if (!isCodePointInRanges(c.codePointAt(0), KANA_RANGES)) {
                    return false;
                }
            }
            return true;
        }

        isStringPartiallyJapanese(str) {
            if (str.length === 0) { return false; }
            for (const c of str) {
                if (isCodePointInRanges(c.codePointAt(0), JAPANESE_RANGES)) {
                    return true;
                }
            }
            return false;
        }

        // Mora functions

        isMoraPitchHigh(moraIndex, pitchAccentDownstepPosition) {
            switch (pitchAccentDownstepPosition) {
                case 0: return (moraIndex > 0);
                case 1: return (moraIndex < 1);
                default: return (moraIndex > 0 && moraIndex < pitchAccentDownstepPosition);
            }
        }

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

        convertToKana(text) {
            return this._getWanakana().toKana(text);
        }

        convertToKanaSupported() {
            return this._wanakana !== null;
        }

        convertKatakanaToHiragana(text, keepProlongedSoundMarks=false) {
            let result = '';
            const offset = (HIRAGANA_CONVERSION_RANGE[0] - KATAKANA_CONVERSION_RANGE[0]);
            for (let char of text) {
                const codePoint = char.codePointAt(0);
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

        convertHiraganaToKatakana(text) {
            let result = '';
            const offset = (KATAKANA_CONVERSION_RANGE[0] - HIRAGANA_CONVERSION_RANGE[0]);
            for (let char of text) {
                const codePoint = char.codePointAt(0);
                if (isCodePointInRange(codePoint, HIRAGANA_CONVERSION_RANGE)) {
                    char = String.fromCodePoint(codePoint + offset);
                }
                result += char;
            }
            return result;
        }

        convertToRomaji(text) {
            const wanakana = this._getWanakana();
            return wanakana.toRomaji(text);
        }

        convertToRomajiSupported() {
            return this._wanakana !== null;
        }

        getKanaDiacriticInfo(character) {
            const info = DIACRITIC_MAPPING.get(character);
            return typeof info !== 'undefined' ? {character: info.character, type: info.type} : null;
        }

        // Furigana distribution

        distributeFurigana(term, reading) {
            if (reading === term) {
                // Same
                return [this._createFuriganaSegment(term, '')];
            }

            const groups = [];
            let groupPre = null;
            let isKanaPre = null;
            for (const c of term) {
                const codePoint = c.codePointAt(0);
                const isKana = this.isCodePointKana(codePoint);
                if (isKana === isKanaPre) {
                    groupPre.text += c;
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

        collapseEmphaticSequences(text, fullCollapse, sourceMap=null) {
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

        _createFuriganaSegment(text, reading) {
            return {text, reading};
        }

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
                if (readingNormalized.startsWith(textNormalized)) {
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

        _getWanakana() {
            const wanakana = this._wanakana;
            if (wanakana === null) { throw new Error('Functions which use WanaKana are not supported in this context'); }
            return wanakana;
        }

        _getStemLength(text1, text2) {
            const minLength = Math.min(text1.length, text2.length);
            if (minLength === 0) { return 0; }

            let i = 0;
            while (true) {
                const char1 = text1.codePointAt(i);
                const char2 = text2.codePointAt(i);
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


    return JapaneseUtil;
})();
