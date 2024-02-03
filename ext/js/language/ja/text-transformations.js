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

import {basicTextTransformationOptions} from '../text-transformations.js';
import {convertAlphabeticToKana} from './japanese-wanakana.js';
import {collapseEmphaticSequences, convertHalfWidthKanaToFullWidth, convertHiraganaToKatakana, convertKatakanaToHiragana, convertNumericToFullWidth} from './japanese.js';

/** @type {import('language').TextTransformation<boolean[]>}*/
const collapseEmphaticSequencesTransform = {
    id: 'collapseEmphaticSequences',
    name: 'Collapse emphatic character sequences',
    description: 'すっっごーーい → すっごーい / すごい',
    options: [
        ['false', 'Disabled', [[false, false]]],
        ['true', 'Collapse into single character', [[false, false], [true, false]]],
        ['full', 'Remove all characters', [[false, false], [true, false], [true, true]]]
    ],
    transform: (str, setting, sourceMap) => {
        const [collapseEmphatic, collapseEmphaticFull] = setting;
        if (collapseEmphatic) {
            str = collapseEmphaticSequences(str, collapseEmphaticFull, sourceMap);
        }
        return str;
    }
};

/** @type {import('language').TextTransformation<any>[]} */
export const textTransformations = [
    {
        id: 'convertHalfWidthCharacters',
        name: 'Convert half width characters to full width',
        description: 'ﾖﾐﾁｬﾝ → ヨミチャン',
        options: basicTextTransformationOptions,
        transform: (str, setting, sourceMap) => setting ? convertHalfWidthKanaToFullWidth(str, sourceMap) : str
    },
    {
        id: 'convertNumericCharacters',
        name: 'Convert numeric characters to full width',
        description: '1234 → １２３４',
        options: basicTextTransformationOptions,
        transform: (str, setting) => setting ? convertNumericToFullWidth(str) : str
    },
    {
        id: 'convertAlphabeticCharacters',
        name: 'Convert alphabetic characters to hiragana',
        description: 'yomichan → よみちゃん',
        options: basicTextTransformationOptions,
        transform: (str, setting, sourceMap) => setting ? convertAlphabeticToKana(str, sourceMap) : str
    },
    {
        id: 'convertHiraganaToKatakana',
        name: 'Convert hiragana to katakana',
        description: 'よみちゃん → ヨミチャン',
        options: basicTextTransformationOptions,
        transform: (str, setting) => setting ? convertHiraganaToKatakana(str) : str
    },
    {
        id: 'convertKatakanaToHiragana',
        name: 'Convert katakana to hiragana',
        description: 'ヨミチャン → よみちゃん',
        options: basicTextTransformationOptions,
        transform: (str, setting) => setting ? convertKatakanaToHiragana(str) : str
    },
    collapseEmphaticSequencesTransform
];
