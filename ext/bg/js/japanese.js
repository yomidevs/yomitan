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

/*global wanakana*/

const JP_HALFWIDTH_KATAKANA_MAPPING = new Map([
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

const JP_HIRAGANA_RANGE = [0x3040, 0x309f];
const JP_KATAKANA_RANGE = [0x30a0, 0x30ff];
const JP_KANA_RANGES = [JP_HIRAGANA_RANGE, JP_KATAKANA_RANGE];

const JP_CJK_COMMON_RANGE = [0x4e00, 0x9fff];
const JP_CJK_RARE_RANGE = [0x3400, 0x4dbf];
const JP_CJK_RANGES = [JP_CJK_COMMON_RANGE, JP_CJK_RARE_RANGE];

const JP_ITERATION_MARK_CHAR_CODE = 0x3005;

// Japanese character ranges, roughly ordered in order of expected frequency
const JP_JAPANESE_RANGES = [
    JP_HIRAGANA_RANGE,
    JP_KATAKANA_RANGE,

    JP_CJK_COMMON_RANGE,
    JP_CJK_RARE_RANGE,

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


// Helper functions

function _jpIsCharCodeInRanges(charCode, ranges) {
    for (const [min, max] of ranges) {
        if (charCode >= min && charCode <= max) {
            return true;
        }
    }
    return false;
}


// Character code testing functions

function jpIsCharCodeKanji(charCode) {
    return _jpIsCharCodeInRanges(charCode, JP_CJK_RANGES);
}

function jpIsCharCodeKana(charCode) {
    return _jpIsCharCodeInRanges(charCode, JP_KANA_RANGES);
}

function jpIsCharCodeJapanese(charCode) {
    return _jpIsCharCodeInRanges(charCode, JP_JAPANESE_RANGES);
}


// String testing functions

function jpIsStringEntirelyKana(str) {
    if (str.length === 0) { return false; }
    for (let i = 0, ii = str.length; i < ii; ++i) {
        if (!jpIsCharCodeKana(str.charCodeAt(i))) {
            return false;
        }
    }
    return true;
}

function jpIsStringPartiallyJapanese(str) {
    if (str.length === 0) { return false; }
    for (let i = 0, ii = str.length; i < ii; ++i) {
        if (jpIsCharCodeJapanese(str.charCodeAt(i))) {
            return true;
        }
    }
    return false;
}


// Conversion functions

function jpKatakanaToHiragana(text) {
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

function jpHiraganaToKatakana(text) {
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

function jpToRomaji(text) {
    return wanakana.toRomaji(text);
}

function jpConvertReading(expressionFragment, readingFragment, readingMode) {
    switch (readingMode) {
        case 'hiragana':
            return jpKatakanaToHiragana(readingFragment || '');
        case 'katakana':
            return jpHiraganaToKatakana(readingFragment || '');
        case 'romaji':
            if (readingFragment) {
                return jpToRomaji(readingFragment);
            } else {
                if (jpIsStringEntirelyKana(expressionFragment)) {
                    return jpToRomaji(expressionFragment);
                }
            }
            return readingFragment;
        case 'none':
            return null;
        default:
            return readingFragment;
    }
}

function jpDistributeFurigana(expression, reading) {
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
            if (jpKatakanaToHiragana(reading2).startsWith(jpKatakanaToHiragana(group.text))) {
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
        const charCode = c.charCodeAt(0);
        const modeCurr = jpIsCharCodeKanji(charCode) || charCode === JP_ITERATION_MARK_CHAR_CODE ? 'kanji' : 'kana';
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

function jpDistributeFuriganaInflected(expression, reading, source) {
    const output = [];

    let stemLength = 0;
    const shortest = Math.min(source.length, expression.length);
    const sourceHiragana = jpKatakanaToHiragana(source);
    const expressionHiragana = jpKatakanaToHiragana(expression);
    while (stemLength < shortest && sourceHiragana[stemLength] === expressionHiragana[stemLength]) {
        ++stemLength;
    }
    const offset = source.length - stemLength;

    const stemExpression = source.substring(0, source.length - offset);
    const stemReading = reading.substring(
        0,
        offset === 0 ? reading.length : reading.length - expression.length + stemLength
    );
    for (const segment of jpDistributeFurigana(stemExpression, stemReading)) {
        output.push(segment);
    }

    if (stemLength !== source.length) {
        output.push({text: source.substring(stemLength)});
    }

    return output;
}

function jpConvertHalfWidthKanaToFullWidth(text, sourceMapping) {
    let result = '';
    const ii = text.length;
    const hasSourceMapping = Array.isArray(sourceMapping);

    for (let i = 0; i < ii; ++i) {
        const c = text[i];
        const mapping = JP_HALFWIDTH_KATAKANA_MAPPING.get(c);
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

function jpConvertNumericTofullWidth(text) {
    let result = '';
    for (let i = 0, ii = text.length; i < ii; ++i) {
        let c = text.charCodeAt(i);
        if (c >= 0x30 && c <= 0x39) { // ['0', '9']
            c += 0xff10 - 0x30; // 0xff10 = '0' full width
            result += String.fromCharCode(c);
        } else {
            result += text[i];
        }
    }
    return result;
}

function jpConvertAlphabeticToKana(text, sourceMapping) {
    let part = '';
    let result = '';
    const ii = text.length;

    if (sourceMapping.length === ii) {
        sourceMapping.length = ii;
        sourceMapping.fill(1);
    }

    for (let i = 0; i < ii; ++i) {
        // Note: 0x61 is the character code for 'a'
        let c = text.charCodeAt(i);
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
                result += jpToHiragana(part, sourceMapping, result.length);
                part = '';
            }
            result += text[i];
            continue;
        }
        part += String.fromCharCode(c);
    }

    if (part.length > 0) {
        result += jpToHiragana(part, sourceMapping, result.length);
    }
    return result;
}

function jpToHiragana(text, sourceMapping, sourceMappingStart) {
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
