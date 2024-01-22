/*
 * Copyright (C) 2024  Yomitan Authors
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

import {convertAlphabeticToKana} from './japanese-wanakana.js';
import {convertHalfWidthKanaToFullWidth, convertHiraganaToKatakana, convertKatakanaToHiragana, convertNumericToFullWidth} from './japanese.js';

/** @type {import('language').TextTransformation[]} */
export const textTransformations = [
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
        },
        transform: /** @type {(str: string) => string} */((str) => str)
    }
];
