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

/* global
*/

import {
    HIRAGANA_CONVERSION_RANGE,
    KATAKANA_CONVERSION_RANGE,
    KANA_PROLONGED_SOUND_MARK_CODE_POINT,
    KATAKANA_SMALL_KA_CODE_POINT,
    KATAKANA_SMALL_KE_CODE_POINT,
    HALFWIDTH_KATAKANA_MAPPING
} from './constants.js';

import {
    getProlongedHiragana,
    isCodePointInRange,
    convertAlphabeticPartToKana
} from './util.js';

export function convertKatakanaToHiragana(text, keepProlongedSoundMarks=false) {
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

export function convertHiraganaToKatakana(text) {
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

export function convertNumericToFullWidth(text) {
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

export function convertHalfWidthKanaToFullWidth(text, sourceMap=null) {
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

        if (sourceMap !== null && index > 0) {
            sourceMap.combine(result.length, 1);
        }
        result += c2;
    }

    return result;
}

export function convertAlphabeticToKana(text, sourceMap=null) {
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
                result += convertAlphabeticPartToKana(part, sourceMap, result.length);
                part = '';
            }
            result += char;
            continue;
        }
        part += String.fromCodePoint(c);
    }

    if (part.length > 0) {
        result += convertAlphabeticPartToKana(part, sourceMap, result.length);
    }

    return result;
}

window.languages = window.languages || {};
window.languages.ja = window.languages.ja || {};
window.languages.ja.textTransformations = [
    {
        id: 'convertHalfWidthCharacters',
        name: 'Convert half width characters to full width',
        description: 'ﾖﾐﾁｬﾝ → ヨミチャン',
        options: {
            false: 'Disabled',
            true: 'Enabled',
            variant: 'Use both variants'
        },
        transform: convertHalfWidthKanaToFullWidth
    },
    {
        id: 'convertNumericCharacters',
        name: 'Convert numeric characters to full width',
        description: '1234 → １２３４',
        options: {
            false: 'Disabled',
            true: 'Enabled',
            variant: 'Use both variants'
        },
        transform: convertNumericToFullWidth
    },
    {
        id: 'convertAlphabeticCharacters',
        name: 'Convert alphabetic characters to hiragana',
        description: 'yomichan → よみちゃん',
        options: {
            false: 'Disabled',
            true: 'Enabled',
            variant: 'Use both variants'
        },
        transform: convertAlphabeticToKana
    },
    {
        id: 'convertHiraganaToKatakana',
        name: 'Convert hiragana to katakana',
        description: 'よみちゃん → ヨミチャン',
        options: {
            false: 'Disabled',
            true: 'Enabled',
            variant: 'Use both variants'
        },
        transform: convertHiraganaToKatakana
    },
    {
        id: 'convertKatakanaToHiragana',
        name: 'Convert katakana to hiragana',
        description: 'ヨミチャン → よみちゃん',
        options: {
            false: 'Disabled',
            true: 'Enabled',
            variant: 'Use both variants'
        },
        transform: convertKatakanaToHiragana
    },
    {
        id: 'collapseEmphaticSequences',
        name: 'Collapse emphatic character sequences',
        description: 'すっっごーーい → すっごーい / すごい',
        options: {
            false: 'Disabled',
            true: 'Collapse into single character',
            full: 'Remove all characters'
        }
    }
];
