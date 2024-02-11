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

import {basicTextPreprocessorOptions} from '../text-preprocessors.js';
import {convertAlphabeticToKana} from './japanese-wanakana.js';
import {collapseEmphaticSequences, convertHalfWidthKanaToFullWidth, convertHiraganaToKatakana, convertKatakanaToHiragana, convertNumericToFullWidth} from './japanese.js';

/** @type {import('language-japanese').JapaneseLanguageDescriptor} */
export const descriptor = {
    name: 'Japanese',
    iso: 'ja',
    exampleText: '読め',
    textPreprocessors: {
        convertHalfWidthCharacters: {
            name: 'Convert half width characters to full width',
            description: 'ﾖﾐﾁｬﾝ → ヨミチャン',
            options: basicTextPreprocessorOptions,
            /** @type {import('language').TextPreprocessorFunction<boolean>} */
            process: (str, setting, sourceMap) => setting ? convertHalfWidthKanaToFullWidth(str, sourceMap) : str
        },
        convertNumericCharacters: {
            name: 'Convert numeric characters to full width',
            description: '1234 → １２３４',
            options: basicTextPreprocessorOptions,
            /** @type {import('language').TextPreprocessorFunction<boolean>} */
            process: (str, setting) => setting ? convertNumericToFullWidth(str) : str
        },
        convertAlphabeticCharacters: {
            name: 'Convert alphabetic characters to hiragana',
            description: 'yomichan → よみちゃん',
            options: basicTextPreprocessorOptions,
            /** @type {import('language').TextPreprocessorFunction<boolean>} */
            process: (str, setting, sourceMap) => setting ? convertAlphabeticToKana(str, sourceMap) : str
        },
        convertHiraganaToKatakana: {
            name: 'Convert hiragana to katakana',
            description: 'よみちゃん → ヨミチャン',
            options: basicTextPreprocessorOptions,
            /** @type {import('language').TextPreprocessorFunction<boolean>} */
            process: (str, setting) => setting ? convertHiraganaToKatakana(str) : str
        },
        convertKatakanaToHiragana: {
            name: 'Convert katakana to hiragana',
            description: 'ヨミチャン → よみちゃん',
            options: basicTextPreprocessorOptions,
            /** @type {import('language').TextPreprocessorFunction<boolean>} */
            process: (str, setting) => setting ? convertKatakanaToHiragana(str) : str
        },
        collapseEmphaticSequences: {
            name: 'Collapse emphatic character sequences',
            description: 'すっっごーーい → すっごーい / すごい',
            options: [[false, false], [true, false], [true, true]],
            /** @type {import('language').TextPreprocessorFunction<[collapseEmphatic: boolean, collapseEmphaticFull: boolean]>} */
            process: (str, setting, sourceMap) => {
                const [collapseEmphatic, collapseEmphaticFull] = setting;
                if (collapseEmphatic) {
                    str = collapseEmphaticSequences(str, collapseEmphaticFull, sourceMap);
                }
                return str;
            }
        }
    }
};
