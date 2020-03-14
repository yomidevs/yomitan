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

/* global
 * wanakana
 */

const jp = (() => {
    const HALFWIDTH_KATAKANA_MAPPING = new Map([
        ['ｦ', 'ヲヺ-'],
        ['ｧ', 'ァ--'],
        ['ｨ', 'ィ--'],
        ['ｩ', 'ゥ--'],
        ['ｪ', 'ェ--'],
        ['ｫ', 'ォ--'],
        ['ｬ', 'ャ--'],
        ['ｭ', 'ュ--'],
        ['ｮ', 'ョ--'],
        ['ｯ', 'ッ--'],
        ['ｰ', 'ー--'],
        ['ｱ', 'ア--'],
        ['ｲ', 'イ--'],
        ['ｳ', 'ウヴ-'],
        ['ｴ', 'エ--'],
        ['ｵ', 'オ--'],
        ['ｶ', 'カガ-'],
        ['ｷ', 'キギ-'],
        ['ｸ', 'クグ-'],
        ['ｹ', 'ケゲ-'],
        ['ｺ', 'コゴ-'],
        ['ｻ', 'サザ-'],
        ['ｼ', 'シジ-'],
        ['ｽ', 'スズ-'],
        ['ｾ', 'セゼ-'],
        ['ｿ', 'ソゾ-'],
        ['ﾀ', 'タダ-'],
        ['ﾁ', 'チヂ-'],
        ['ﾂ', 'ツヅ-'],
        ['ﾃ', 'テデ-'],
        ['ﾄ', 'トド-'],
        ['ﾅ', 'ナ--'],
        ['ﾆ', 'ニ--'],
        ['ﾇ', 'ヌ--'],
        ['ﾈ', 'ネ--'],
        ['ﾉ', 'ノ--'],
        ['ﾊ', 'ハバパ'],
        ['ﾋ', 'ヒビピ'],
        ['ﾌ', 'フブプ'],
        ['ﾍ', 'ヘベペ'],
        ['ﾎ', 'ホボポ'],
        ['ﾏ', 'マ--'],
        ['ﾐ', 'ミ--'],
        ['ﾑ', 'ム--'],
        ['ﾒ', 'メ--'],
        ['ﾓ', 'モ--'],
        ['ﾔ', 'ヤ--'],
        ['ﾕ', 'ユ--'],
        ['ﾖ', 'ヨ--'],
        ['ﾗ', 'ラ--'],
        ['ﾘ', 'リ--'],
        ['ﾙ', 'ル--'],
        ['ﾚ', 'レ--'],
        ['ﾛ', 'ロ--'],
        ['ﾜ', 'ワ--'],
        ['ﾝ', 'ン--']
    ]);

    const HIRAGANA_RANGE = [0x3040, 0x309f];
    const KATAKANA_RANGE = [0x30a0, 0x30ff];
    const KANA_RANGES = [HIRAGANA_RANGE, KATAKANA_RANGE];

    const CJK_UNIFIED_IDEOGRAPHS_RANGE = [0x4e00, 0x9fff];
    const CJK_UNIFIED_IDEOGRAPHS_EXTENSION_A_RANGE = [0x3400, 0x4dbf];
    const CJK_UNIFIED_IDEOGRAPHS_EXTENSION_B_RANGE = [0x20000, 0x2a6df];
    const CJK_UNIFIED_IDEOGRAPHS_EXTENSION_C_RANGE = [0x2a700, 0x2b73f];
    const CJK_UNIFIED_IDEOGRAPHS_EXTENSION_D_RANGE = [0x2b740, 0x2b81f];
    const CJK_UNIFIED_IDEOGRAPHS_EXTENSION_E_RANGE = [0x2b820, 0x2ceaf];
    const CJK_UNIFIED_IDEOGRAPHS_EXTENSION_F_RANGE = [0x2ceb0, 0x2ebef];
    const CJK_COMPATIBILITY_IDEOGRAPHS_SUPPLEMENT_RANGE = [0x2f800, 0x2fa1f];
    const CJK_UNIFIED_IDEOGRAPHS_RANGES = [
        CJK_UNIFIED_IDEOGRAPHS_RANGE,
        CJK_UNIFIED_IDEOGRAPHS_EXTENSION_A_RANGE,
        CJK_UNIFIED_IDEOGRAPHS_EXTENSION_B_RANGE,
        CJK_UNIFIED_IDEOGRAPHS_EXTENSION_C_RANGE,
        CJK_UNIFIED_IDEOGRAPHS_EXTENSION_D_RANGE,
        CJK_UNIFIED_IDEOGRAPHS_EXTENSION_E_RANGE,
        CJK_UNIFIED_IDEOGRAPHS_EXTENSION_F_RANGE,
        CJK_COMPATIBILITY_IDEOGRAPHS_SUPPLEMENT_RANGE
    ];

    const ITERATION_MARK_CODE_POINT = 0x3005;

    // Japanese character ranges, roughly ordered in order of expected frequency
    const JAPANESE_RANGES = [
        HIRAGANA_RANGE,
        KATAKANA_RANGE,

        ...CJK_UNIFIED_IDEOGRAPHS_RANGES,

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


    // Character code testing functions

    function isCodePointKanji(codePoint) {
        return isCodePointInRanges(codePoint, CJK_UNIFIED_IDEOGRAPHS_RANGES);
    }

    function isCodePointKana(codePoint) {
        return isCodePointInRanges(codePoint, KANA_RANGES);
    }

    function isCodePointJapanese(codePoint) {
        return isCodePointInRanges(codePoint, JAPANESE_RANGES);
    }

    function isCodePointInRanges(codePoint, ranges) {
        for (const [min, max] of ranges) {
            if (codePoint >= min && codePoint <= max) {
                return true;
            }
        }
        return false;
    }


    // String testing functions

    function isStringEntirelyKana(str) {
        if (str.length === 0) { return false; }
        for (const c of str) {
            if (!isCodePointKana(c.codePointAt(0))) {
                return false;
            }
        }
        return true;
    }

    function isStringPartiallyJapanese(str) {
        if (str.length === 0) { return false; }
        for (const c of str) {
            if (isCodePointJapanese(c.codePointAt(0))) {
                return true;
            }
        }
        return false;
    }


    // Conversion functions

    function convertKatakanaToHiragana(text) {
        let result = '';
        for (const c of text) {
            if (wanakana.isKatakana(c)) {
                result += wanakana.toHiragana(c);
            } else {
                result += c;
            }
        }

        return result;
    }

    function convertHiraganaToKatakana(text) {
        let result = '';
        for (const c of text) {
            if (wanakana.isHiragana(c)) {
                result += wanakana.toKatakana(c);
            } else {
                result += c;
            }
        }

        return result;
    }

    function convertToRomaji(text) {
        return wanakana.toRomaji(text);
    }

    function convertReading(expressionFragment, readingFragment, readingMode) {
        switch (readingMode) {
            case 'hiragana':
                return convertKatakanaToHiragana(readingFragment || '');
            case 'katakana':
                return convertHiraganaToKatakana(readingFragment || '');
            case 'romaji':
                if (readingFragment) {
                    return convertToRomaji(readingFragment);
                } else {
                    if (isStringEntirelyKana(expressionFragment)) {
                        return convertToRomaji(expressionFragment);
                    }
                }
                return readingFragment;
            case 'none':
                return null;
            default:
                return readingFragment;
        }
    }

    function convertNumericToFullWidth(text) {
        let result = '';
        for (const char of text) {
            let c = char.codePointAt(0);
            if (c >= 0x30 && c <= 0x39) { // ['0', '9']
                c += 0xff10 - 0x30; // 0xff10 = '0' full width
                result += String.fromCodePoint(c);
            } else {
                result += char;
            }
        }
        return result;
    }

    function convertHalfWidthKanaToFullWidth(text, sourceMapping) {
        let result = '';
        const hasSourceMapping = Array.isArray(sourceMapping);

        // This function is safe to use charCodeAt instead of codePointAt, since all
        // the relevant characters are represented with a single UTF-16 character code.
        for (let i = 0, ii = text.length; i < ii; ++i) {
            const c = text[i];
            const mapping = HALFWIDTH_KATAKANA_MAPPING.get(c);
            if (typeof mapping !== 'string') {
                result += c;
                continue;
            }

            let index = 0;
            switch (text.charCodeAt(i + 1)) {
                case 0xff9e: // dakuten
                    index = 1;
                    break;
                case 0xff9f: // handakuten
                    index = 2;
                    break;
            }

            let c2 = mapping[index];
            if (index > 0) {
                if (c2 === '-') { // invalid
                    index = 0;
                    c2 = mapping[0];
                } else {
                    ++i;
                }
            }

            if (hasSourceMapping && index > 0) {
                index = result.length;
                const v = sourceMapping.splice(index + 1, 1)[0];
                sourceMapping[index] += v;
            }
            result += c2;
        }

        return result;
    }

    function convertAlphabeticToKana(text, sourceMapping) {
        let part = '';
        let result = '';

        for (const char of text) {
            // Note: 0x61 is the character code for 'a'
            let c = char.codePointAt(0);
            if (c >= 0x41 && c <= 0x5a) { // ['A', 'Z']
                c += (0x61 - 0x41);
            } else if (c >= 0x61 && c <= 0x7a) { // ['a', 'z']
                // NOP; c += (0x61 - 0x61);
            } else if (c >= 0xff21 && c <= 0xff3a) { // ['A', 'Z'] fullwidth
                c += (0x61 - 0xff21);
            } else if (c >= 0xff41 && c <= 0xff5a) { // ['a', 'z'] fullwidth
                c += (0x61 - 0xff41);
            } else if (c === 0x2d || c === 0xff0d) { // '-' or fullwidth dash
                c = 0x2d; // '-'
            } else {
                if (part.length > 0) {
                    result += convertAlphabeticPartToKana(part, sourceMapping, result.length);
                    part = '';
                }
                result += char;
                continue;
            }
            part += String.fromCodePoint(c);
        }

        if (part.length > 0) {
            result += convertAlphabeticPartToKana(part, sourceMapping, result.length);
        }
        return result;
    }

    function convertAlphabeticPartToKana(text, sourceMapping, sourceMappingStart) {
        const result = wanakana.toHiragana(text);

        // Generate source mapping
        if (Array.isArray(sourceMapping)) {
            if (typeof sourceMappingStart !== 'number') { sourceMappingStart = 0; }
            let i = 0;
            let resultPos = 0;
            const ii = text.length;
            while (i < ii) {
                // Find smallest matching substring
                let iNext = i + 1;
                let resultPosNext = result.length;
                while (iNext < ii) {
                    const t = wanakana.toHiragana(text.substring(0, iNext));
                    if (t === result.substring(0, t.length)) {
                        resultPosNext = t.length;
                        break;
                    }
                    ++iNext;
                }

                // Merge characters
                const removals = iNext - i - 1;
                if (removals > 0) {
                    let sum = 0;
                    const vs = sourceMapping.splice(sourceMappingStart + 1, removals);
                    for (const v of vs) { sum += v; }
                    sourceMapping[sourceMappingStart] += sum;
                }
                ++sourceMappingStart;

                // Empty elements
                const additions = resultPosNext - resultPos - 1;
                for (let j = 0; j < additions; ++j) {
                    sourceMapping.splice(sourceMappingStart, 0, 0);
                    ++sourceMappingStart;
                }

                i = iNext;
                resultPos = resultPosNext;
            }
        }

        return result;
    }


    // Furigana distribution

    function distributeFurigana(expression, reading) {
        const fallback = [{furigana: reading, text: expression}];
        if (!reading) {
            return fallback;
        }

        let isAmbiguous = false;
        const segmentize = (reading2, groups) => {
            if (groups.length === 0 || isAmbiguous) {
                return [];
            }

            const group = groups[0];
            if (group.mode === 'kana') {
                if (convertKatakanaToHiragana(reading2).startsWith(convertKatakanaToHiragana(group.text))) {
                    const readingLeft = reading2.substring(group.text.length);
                    const segs = segmentize(readingLeft, groups.splice(1));
                    if (segs) {
                        return [{text: group.text}].concat(segs);
                    }
                }
            } else {
                let foundSegments = null;
                for (let i = reading2.length; i >= group.text.length; --i) {
                    const readingUsed = reading2.substring(0, i);
                    const readingLeft = reading2.substring(i);
                    const segs = segmentize(readingLeft, groups.slice(1));
                    if (segs) {
                        if (foundSegments !== null) {
                            // more than one way to segmentize the tail, mark as ambiguous
                            isAmbiguous = true;
                            return null;
                        }
                        foundSegments = [{text: group.text, furigana: readingUsed}].concat(segs);
                    }
                    // there is only one way to segmentize the last non-kana group
                    if (groups.length === 1) {
                        break;
                    }
                }
                return foundSegments;
            }
        };

        const groups = [];
        let modePrev = null;
        for (const c of expression) {
            const codePoint = c.codePointAt(0);
            const modeCurr = isCodePointKanji(codePoint) || codePoint === ITERATION_MARK_CODE_POINT ? 'kanji' : 'kana';
            if (modeCurr === modePrev) {
                groups[groups.length - 1].text += c;
            } else {
                groups.push({mode: modeCurr, text: c});
                modePrev = modeCurr;
            }
        }

        const segments = segmentize(reading, groups);
        if (segments && !isAmbiguous) {
            return segments;
        }
        return fallback;
    }

    function distributeFuriganaInflected(expression, reading, source) {
        const output = [];

        let stemLength = 0;
        const shortest = Math.min(source.length, expression.length);
        const sourceHiragana = convertKatakanaToHiragana(source);
        const expressionHiragana = convertKatakanaToHiragana(expression);
        while (stemLength < shortest && sourceHiragana[stemLength] === expressionHiragana[stemLength]) {
            ++stemLength;
        }
        const offset = source.length - stemLength;

        const stemExpression = source.substring(0, source.length - offset);
        const stemReading = reading.substring(
            0,
            offset === 0 ? reading.length : reading.length - expression.length + stemLength
        );
        for (const segment of distributeFurigana(stemExpression, stemReading)) {
            output.push(segment);
        }

        if (stemLength !== source.length) {
            output.push({text: source.substring(stemLength)});
        }

        return output;
    }


    // Exports

    return {
        isCodePointKanji,
        isCodePointKana,
        isCodePointJapanese,
        isStringEntirelyKana,
        isStringPartiallyJapanese,
        convertKatakanaToHiragana,
        convertHiraganaToKatakana,
        convertToRomaji,
        convertReading,
        convertNumericToFullWidth,
        convertHalfWidthKanaToFullWidth,
        convertAlphabeticToKana,
        distributeFurigana,
        distributeFuriganaInflected
    };
})();
