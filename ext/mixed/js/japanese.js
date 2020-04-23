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

const jp = (() => {
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

    const SMALL_KANA_SET = new Set(Array.from('ぁぃぅぇぉゃゅょゎァィゥェォャュョヮ'));


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


    // Mora functions

    function isMoraPitchHigh(moraIndex, pitchAccentPosition) {
        switch (pitchAccentPosition) {
            case 0: return (moraIndex > 0);
            case 1: return (moraIndex < 1);
            default: return (moraIndex > 0 && moraIndex < pitchAccentPosition);
        }
    }

    function getKanaMorae(text) {
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


    // Exports

    return {
        isCodePointKanji,
        isCodePointKana,
        isCodePointJapanese,
        isStringEntirelyKana,
        isStringPartiallyJapanese,
        isMoraPitchHigh,
        getKanaMorae
    };
})();
