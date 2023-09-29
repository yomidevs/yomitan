/*
 * Copyright (C) 2016-2022  Yomichan Authors
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

export const HIRAGANA_SMALL_TSU_CODE_POINT = 0x3063;
export const KATAKANA_SMALL_TSU_CODE_POINT = 0x30c3;
export const KATAKANA_SMALL_KA_CODE_POINT = 0x30f5;
export const KATAKANA_SMALL_KE_CODE_POINT = 0x30f6;
export const KANA_PROLONGED_SOUND_MARK_CODE_POINT = 0x30fc;

export const HIRAGANA_RANGE = [0x3040, 0x309f];
export const KATAKANA_RANGE = [0x30a0, 0x30ff];

export const HIRAGANA_CONVERSION_RANGE = [0x3041, 0x3096];
export const KATAKANA_CONVERSION_RANGE = [0x30a1, 0x30f6];

export const KANA_RANGES = [HIRAGANA_RANGE, KATAKANA_RANGE];

export const CJK_UNIFIED_IDEOGRAPHS_RANGE = [0x4e00, 0x9fff];
export const CJK_UNIFIED_IDEOGRAPHS_EXTENSION_A_RANGE = [0x3400, 0x4dbf];
export const CJK_UNIFIED_IDEOGRAPHS_EXTENSION_B_RANGE = [0x20000, 0x2a6df];
export const CJK_UNIFIED_IDEOGRAPHS_EXTENSION_C_RANGE = [0x2a700, 0x2b73f];
export const CJK_UNIFIED_IDEOGRAPHS_EXTENSION_D_RANGE = [0x2b740, 0x2b81f];
export const CJK_UNIFIED_IDEOGRAPHS_EXTENSION_E_RANGE = [0x2b820, 0x2ceaf];
export const CJK_UNIFIED_IDEOGRAPHS_EXTENSION_F_RANGE = [0x2ceb0, 0x2ebef];
export const CJK_COMPATIBILITY_IDEOGRAPHS_RANGE = [0xf900, 0xfaff];
export const CJK_COMPATIBILITY_IDEOGRAPHS_SUPPLEMENT_RANGE = [0x2f800, 0x2fa1f];
export const CJK_IDEOGRAPH_RANGES = [
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
export const JAPANESE_RANGES = [
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

export const SMALL_KANA_SET = new Set(Array.from('ぁぃぅぇぉゃゅょゎァィゥェォャュョヮ'));

export const HALFWIDTH_KATAKANA_MAPPING = new Map([
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

export const VOWEL_TO_KANA_MAPPING = new Map([
    ['a', 'ぁあかがさざただなはばぱまゃやらゎわヵァアカガサザタダナハバパマャヤラヮワヵヷ'],
    ['i', 'ぃいきぎしじちぢにひびぴみりゐィイキギシジチヂニヒビピミリヰヸ'],
    ['u', 'ぅうくぐすずっつづぬふぶぷむゅゆるゥウクグスズッツヅヌフブプムュユルヴ'],
    ['e', 'ぇえけげせぜてでねへべぺめれゑヶェエケゲセゼテデネヘベペメレヱヶヹ'],
    ['o', 'ぉおこごそぞとどのほぼぽもょよろをォオコゴソゾトドノホボポモョヨロヲヺ'],
    ['', 'のノ']
]);

export const KANA_TO_VOWEL_MAPPING = (() => {
    const map = new Map();
    for (const [vowel, characters] of VOWEL_TO_KANA_MAPPING) {
        for (const character of characters) {
            map.set(character, vowel);
        }
    }
    return map;
})();

export const DIACRITIC_MAPPING = (() => {
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
