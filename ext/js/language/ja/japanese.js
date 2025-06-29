/*
 * Copyright (C) 2024-2025  Yomitan Authors
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

import {CJK_COMPATIBILITY, CJK_IDEOGRAPH_RANGES, isCodePointInRange, isCodePointInRanges} from '../CJK-util.js';


const HIRAGANA_SMALL_TSU_CODE_POINT = 0x3063;
const KATAKANA_SMALL_TSU_CODE_POINT = 0x30c3;
const KATAKANA_SMALL_KA_CODE_POINT = 0x30f5;
const KATAKANA_SMALL_KE_CODE_POINT = 0x30f6;
const KANA_PROLONGED_SOUND_MARK_CODE_POINT = 0x30fc;

/** @type {import('CJK-util').CodepointRange} */
const HIRAGANA_RANGE = [0x3040, 0x309f];
/** @type {import('CJK-util').CodepointRange} */
const KATAKANA_RANGE = [0x30a0, 0x30ff];

/** @type {import('CJK-util').CodepointRange} */
const HIRAGANA_CONVERSION_RANGE = [0x3041, 0x3096];
/** @type {import('CJK-util').CodepointRange} */
const KATAKANA_CONVERSION_RANGE = [0x30a1, 0x30f6];

/** @type {import('CJK-util').CodepointRange[]} */
const KANA_RANGES = [HIRAGANA_RANGE, KATAKANA_RANGE];

/**
 * Japanese character ranges, roughly ordered in order of expected frequency.
 * @type {import('CJK-util').CodepointRange[]}
 */
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
    [0xffe0, 0xffee], // Currency markers
];

const SMALL_KANA_SET = new Set('ぁぃぅぇぉゃゅょゎァィゥェォャュョヮ');

const HALFWIDTH_KATAKANA_MAPPING = new Map([
    ['･', '・--'],
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
    ['ﾝ', 'ン--'],
]);

const VOWEL_TO_KANA_MAPPING = new Map([
    ['a', 'ぁあかがさざただなはばぱまゃやらゎわヵァアカガサザタダナハバパマャヤラヮワヵヷ'],
    ['i', 'ぃいきぎしじちぢにひびぴみりゐィイキギシジチヂニヒビピミリヰヸ'],
    ['u', 'ぅうくぐすずっつづぬふぶぷむゅゆるゥウクグスズッツヅヌフブプムュユルヴ'],
    ['e', 'ぇえけげせぜてでねへべぺめれゑヶェエケゲセゼテデネヘベペメレヱヶヹ'],
    ['o', 'ぉおこごそぞとどのほぼぽもょよろをォオコゴソゾトドノホボポモョヨロヲヺ'],
    ['', 'のノ'],
]);

/** @type {Map<string, string>} */
const KANA_TO_VOWEL_MAPPING = new Map();
for (const [vowel, characters] of VOWEL_TO_KANA_MAPPING) {
    for (const character of characters) {
        KANA_TO_VOWEL_MAPPING.set(character, vowel);
    }
}

const kana = 'うゔ-かが-きぎ-くぐ-けげ-こご-さざ-しじ-すず-せぜ-そぞ-ただ-ちぢ-つづ-てで-とど-はばぱひびぴふぶぷへべぺほぼぽワヷ-ヰヸ-ウヴ-ヱヹ-ヲヺ-カガ-キギ-クグ-ケゲ-コゴ-サザ-シジ-スズ-セゼ-ソゾ-タダ-チヂ-ツヅ-テデ-トド-ハバパヒビピフブプヘベペホボポ';
/** @type {Map<string, {character: string, type: import('japanese-util').DiacriticType}>} */
const DIACRITIC_MAPPING = new Map();
for (let i = 0, ii = kana.length; i < ii; i += 3) {
    const character = kana[i];
    const dakuten = kana[i + 1];
    const handakuten = kana[i + 2];
    DIACRITIC_MAPPING.set(dakuten, {character, type: 'dakuten'});
    if (handakuten !== '-') {
        DIACRITIC_MAPPING.set(handakuten, {character, type: 'handakuten'});
    }
}

/**
 * @param {string} previousCharacter
 * @returns {?string}
 */
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

/**
 * @param {string} text
 * @param {string} reading
 * @returns {import('japanese-util').FuriganaSegment}
 */
function createFuriganaSegment(text, reading) {
    return {text, reading};
}

/**
 * @param {string} reading
 * @param {string} readingNormalized
 * @param {import('japanese-util').FuriganaGroup[]} groups
 * @param {number} groupsStart
 * @returns {?(import('japanese-util').FuriganaSegment[])}
 */
function segmentizeFurigana(reading, readingNormalized, groups, groupsStart) {
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
            const segments = segmentizeFurigana(
                reading.substring(textLength),
                readingNormalized.substring(textLength),
                groups,
                groupsStart + 1,
            );
            if (segments !== null) {
                if (reading.startsWith(text)) {
                    segments.unshift(createFuriganaSegment(text, ''));
                } else {
                    segments.unshift(...getFuriganaKanaSegments(text, reading));
                }
                return segments;
            }
        }
        return null;
    } else {
        let result = null;
        for (let i = reading.length; i >= textLength; --i) {
            const segments = segmentizeFurigana(
                reading.substring(i),
                readingNormalized.substring(i),
                groups,
                groupsStart + 1,
            );
            if (segments !== null) {
                if (result !== null) {
                    // More than one way to segmentize the tail; mark as ambiguous
                    return null;
                }
                const segmentReading = reading.substring(0, i);
                segments.unshift(createFuriganaSegment(text, segmentReading));
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
function getFuriganaKanaSegments(text, reading) {
    const textLength = text.length;
    const newSegments = [];
    let start = 0;
    let state = (reading[0] === text[0]);
    for (let i = 1; i < textLength; ++i) {
        const newState = (reading[i] === text[i]);
        if (state === newState) { continue; }
        newSegments.push(createFuriganaSegment(text.substring(start, i), state ? '' : reading.substring(start, i)));
        state = newState;
        start = i;
    }
    newSegments.push(createFuriganaSegment(text.substring(start, textLength), state ? '' : reading.substring(start, textLength)));
    return newSegments;
}

/**
 * @param {string} text1
 * @param {string} text2
 * @returns {number}
 */
function getStemLength(text1, text2) {
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


// Character code testing functions

/**
 * @param {number} codePoint
 * @returns {boolean}
 */
export function isCodePointKanji(codePoint) {
    return isCodePointInRanges(codePoint, CJK_IDEOGRAPH_RANGES);
}

/**
 * @param {number} codePoint
 * @returns {boolean}
 */
export function isCodePointKana(codePoint) {
    return isCodePointInRanges(codePoint, KANA_RANGES);
}

/**
 * @param {number} codePoint
 * @returns {boolean}
 */
export function isCodePointJapanese(codePoint) {
    return isCodePointInRanges(codePoint, JAPANESE_RANGES);
}


// String testing functions

/**
 * @param {string} str
 * @returns {boolean}
 */
export function isStringEntirelyKana(str) {
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
export function isStringPartiallyJapanese(str) {
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
 * @param {number | string} pitchAccentValue
 * @returns {boolean}
 */
export function isMoraPitchHigh(moraIndex, pitchAccentValue) {
    if (typeof pitchAccentValue === 'string') {
        return pitchAccentValue[moraIndex] === 'H';
    }
    switch (pitchAccentValue) {
        case 0: return (moraIndex > 0);
        case 1: return (moraIndex < 1);
        default: return (moraIndex > 0 && moraIndex < pitchAccentValue);
    }
}

/**
 * @param {string} text
 * @param {number | string} pitchAccentValue
 * @param {boolean} isVerbOrAdjective
 * @returns {?import('japanese-util').PitchCategory}
 */
export function getPitchCategory(text, pitchAccentValue, isVerbOrAdjective) {
    const pitchAccentDownstepPosition = typeof pitchAccentValue === 'string' ? getDownstepPositions(pitchAccentValue)[0] : pitchAccentValue;
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
        return pitchAccentDownstepPosition >= getKanaMoraCount(text) ? 'odaka' : 'nakadaka';
    }
    return null;
}

/**
 * @param {string} pitchString
 * @returns {number[]}
 */
export function getDownstepPositions(pitchString) {
    const downsteps = [];
    const moraCount = pitchString.length;
    for (let i = 0; i < moraCount; i++) {
        if (i > 0 && pitchString[i - 1] === 'H' && pitchString[i] === 'L') {
            downsteps.push(i);
        }
    }
    if (downsteps.length === 0) {
        downsteps.push(pitchString.startsWith('L') ? 0 : -1);
    }
    return downsteps;
}

/**
 * @param {string} text
 * @returns {string[]}
 */
export function getKanaMorae(text) {
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
export function getKanaMoraCount(text) {
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
 * @param {boolean} [keepProlongedSoundMarks]
 * @returns {string}
 */
export function convertKatakanaToHiragana(text, keepProlongedSoundMarks = false) {
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
export function convertHiraganaToKatakana(text) {
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
export function convertAlphanumericToFullWidth(text) {
    let result = '';
    for (const char of text) {
        let c = /** @type {number} */ (char.codePointAt(0));
        if (c >= 0x30 && c <= 0x39) { // ['0', '9']
            c += 0xff10 - 0x30; // 0xff10 = '0' full width
        } else if (c >= 0x41 && c <= 0x5a) { // ['A', 'Z']
            c += 0xff21 - 0x41; // 0xff21 = 'A' full width
        } else if (c >= 0x61 && c <= 0x7a) { // ['a', 'z']
            c += 0xff41 - 0x61; // 0xff41 = 'a' full width
        }
        result += String.fromCodePoint(c);
    }
    return result;
}

/**
 * @param {string} text
 * @returns {string}
 */
export function convertFullWidthAlphanumericToNormal(text) {
    let result = '';
    const length = text.length;
    for (let i = 0; i < length; i++) {
        let c = /** @type {number} */ (text[i].codePointAt(0));
        if (c >= 0xff10 && c <= 0xff19) { // ['０', '９']
            c -= 0xff10 - 0x30; // 0x30 = '0'
        } else if (c >= 0xff21 && c <= 0xff3a) { // ['Ａ', 'Ｚ']
            c -= 0xff21 - 0x41; // 0x41 = 'A'
        } else if (c >= 0xff41 && c <= 0xff5a) { // ['ａ', 'ｚ']
            c -= 0xff41 - 0x61; // 0x61 = 'a'
        }
        result += String.fromCodePoint(c);
    }
    return result;
}

/**
 * @param {string} text
 * @returns {string}
 */
export function convertHalfWidthKanaToFullWidth(text) {
    let result = '';

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
            case 0xff9e: // Dakuten
                index = 1;
                break;
            case 0xff9f: // Handakuten
                index = 2;
                break;
        }

        let c2 = mapping[index];
        if (index > 0) {
            if (c2 === '-') { // Invalid
                index = 0;
                c2 = mapping[0];
            } else {
                ++i;
            }
        }

        result += c2;
    }

    return result;
}

/**
 * @param {string} character
 * @returns {?{character: string, type: import('japanese-util').DiacriticType}}
 */
export function getKanaDiacriticInfo(character) {
    const info = DIACRITIC_MAPPING.get(character);
    return typeof info !== 'undefined' ? {character: info.character, type: info.type} : null;
}

/**
 * @param {number} codePoint
 * @returns {boolean}
 */
function dakutenAllowed(codePoint) {
    // To reduce processing time some characters which shouldn't have dakuten but are highly unlikely to have a combining character attached are included
    // かがきぎくぐけげこごさざしじすずせぜそぞただちぢっつづてでとはばぱひびぴふぶぷへべぺほ
    // カガキギクグケゲコゴサザシジスズセゼソゾタダチヂッツヅテデトハバパヒビピフブプヘベペホ
    return ((codePoint >= 0x304B && codePoint <= 0x3068) ||
    (codePoint >= 0x306F && codePoint <= 0x307B) ||
    (codePoint >= 0x30AB && codePoint <= 0x30C8) ||
    (codePoint >= 0x30CF && codePoint <= 0x30DB));
}

/**
 * @param {number} codePoint
 * @returns {boolean}
 */
function handakutenAllowed(codePoint) {
    // To reduce processing time some characters which shouldn't have handakuten but are highly unlikely to have a combining character attached are included
    // はばぱひびぴふぶぷへべぺほ
    // ハバパヒビピフブプヘベペホ
    return ((codePoint >= 0x306F && codePoint <= 0x307B) ||
    (codePoint >= 0x30CF && codePoint <= 0x30DB));
}

/**
 * @param {string} text
 * @returns {string}
 */
export function normalizeCombiningCharacters(text) {
    let result = '';
    let i = text.length - 1;
    // Ignoring the first character is intentional, it cannot combine with anything
    while (i > 0) {
        if (text[i] === '\u3099') {
            const dakutenCombinee = text[i - 1].codePointAt(0);
            if (dakutenCombinee && dakutenAllowed(dakutenCombinee)) {
                result = String.fromCodePoint(dakutenCombinee + 1) + result;
                i -= 2;
                continue;
            }
        } else if (text[i] === '\u309A') {
            const handakutenCombinee = text[i - 1].codePointAt(0);
            if (handakutenCombinee && handakutenAllowed(handakutenCombinee)) {
                result = String.fromCodePoint(handakutenCombinee + 2) + result;
                i -= 2;
                continue;
            }
        }
        result = text[i] + result;
        i--;
    }
    // i === -1 when first two characters are combined
    if (i === 0) {
        result = text[0] + result;
    }
    return result;
}

/**
 * @param {string} text
 * @returns {string}
 */
export function normalizeCJKCompatibilityCharacters(text) {
    let result = '';
    for (let i = 0; i < text.length; i++) {
        const codePoint = text[i].codePointAt(0);
        result += codePoint && isCodePointInRange(codePoint, CJK_COMPATIBILITY) ? text[i].normalize('NFKD') : text[i];
    }
    return result;
}

// Furigana distribution

/**
 * @param {string} term
 * @param {string} reading
 * @returns {import('japanese-util').FuriganaSegment[]}
 */
export function distributeFurigana(term, reading) {
    if (reading === term) {
        // Same
        return [createFuriganaSegment(term, '')];
    }

    /** @type {import('japanese-util').FuriganaGroup[]} */
    const groups = [];
    /** @type {?import('japanese-util').FuriganaGroup} */
    let groupPre = null;
    let isKanaPre = null;
    for (const c of term) {
        const codePoint = /** @type {number} */ (c.codePointAt(0));
        const isKana = isCodePointKana(codePoint);
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
            group.textNormalized = convertKatakanaToHiragana(group.text);
        }
    }

    const readingNormalized = convertKatakanaToHiragana(reading);
    const segments = segmentizeFurigana(reading, readingNormalized, groups, 0);
    if (segments !== null) {
        return segments;
    }

    // Fallback
    return [createFuriganaSegment(term, reading)];
}

/**
 * @param {string} term
 * @param {string} reading
 * @param {string} source
 * @returns {import('japanese-util').FuriganaSegment[]}
 */
export function distributeFuriganaInflected(term, reading, source) {
    const termNormalized = convertKatakanaToHiragana(term);
    const readingNormalized = convertKatakanaToHiragana(reading);
    const sourceNormalized = convertKatakanaToHiragana(source);

    let mainText = term;
    let stemLength = getStemLength(termNormalized, sourceNormalized);

    // Check if source is derived from the reading instead of the term
    const readingStemLength = getStemLength(readingNormalized, sourceNormalized);
    if (readingStemLength > 0 && readingStemLength >= stemLength) {
        mainText = reading;
        stemLength = readingStemLength;
        reading = `${source.substring(0, stemLength)}${reading.substring(stemLength)}`;
    }

    const segments = [];
    if (stemLength > 0) {
        mainText = `${source.substring(0, stemLength)}${mainText.substring(stemLength)}`;
        const segments2 = distributeFurigana(mainText, reading);
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
                    segments.push(createFuriganaSegment(mainText.substring(start, stemLength), ''));
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
            segments.push(createFuriganaSegment(remainder, ''));
        }
    }

    return segments;
}


// Miscellaneous

/**
 * @param {number} codePoint
 * @returns {boolean}
 */
export function isEmphaticCodePoint(codePoint) {
    return (
        codePoint === HIRAGANA_SMALL_TSU_CODE_POINT ||
        codePoint === KATAKANA_SMALL_TSU_CODE_POINT ||
        codePoint === KANA_PROLONGED_SOUND_MARK_CODE_POINT
    );
}

/**
 * @param {string} text
 * @param {boolean} fullCollapse
 * @returns {string}
 */
export function collapseEmphaticSequences(text, fullCollapse) {
    let left = 0;
    while (left < text.length && isEmphaticCodePoint(/** @type {number} */ (text.codePointAt(left)))) {
        ++left;
    }
    let right = text.length - 1;
    while (right >= 0 && isEmphaticCodePoint(/** @type {number} */ (text.codePointAt(right)))) {
        --right;
    }
    // Whole string is emphatic
    if (left > right) {
        return text;
    }

    const leadingEmphatics = text.substring(0, left);
    const trailingEmphatics = text.substring(right + 1);
    let middle = '';
    let currentCollapsedCodePoint = -1;

    for (let i = left; i <= right; ++i) {
        const char = text[i];
        const codePoint = /** @type {number} */ (char.codePointAt(0));
        if (isEmphaticCodePoint(codePoint)) {
            if (currentCollapsedCodePoint !== codePoint) {
                currentCollapsedCodePoint = codePoint;
                if (!fullCollapse) {
                    middle += char;
                    continue;
                }
            }
        } else {
            currentCollapsedCodePoint = -1;
            middle += char;
        }
    }

    return leadingEmphatics + middle + trailingEmphatics;
}
