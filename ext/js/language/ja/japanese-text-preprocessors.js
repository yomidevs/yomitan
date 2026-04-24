/*
 * Copyright (C) 2024-2026  Yomitan Authors
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

import {convertVariants} from '../../../lib/kanji-processor.js';
import {convertAlphabeticToKana} from './japanese-wanakana.js';
import {
    collapseEmphaticSequences as collapseEmphaticSequencesFunction,
    convertAlphanumericToFullWidth,
    convertFullWidthAlphanumericToNormal,
    convertHalfWidthKanaToFullWidth,
    convertHiraganaToKatakana as convertHiraganaToKatakanaFunction,
    convertKatakanaToHiragana as convertKatakanaToHiraganaFunction,
    normalizeCJKCompatibilityCharacters as normalizeCJKCompatibilityCharactersFunction,
    normalizeCombiningCharacters as normalizeCombiningCharactersFunction,
} from './japanese.js';

/** @type {import('language').TextProcessor} */
export const convertHalfWidthCharacters = {
    name: 'Convert half width characters to full width',
    description: 'ﾖﾐﾁｬﾝ → ヨミチャン',
    process: (str) => [str, convertHalfWidthKanaToFullWidth(str)],
};

/** @type {import('language').TextProcessor} */
export const alphabeticToHiragana = {
    name: 'Convert alphabetic characters to hiragana',
    description: 'yomichan → よみちゃん',
    process: (str) => [str, convertAlphabeticToKana(str)],
};

/** @type {import('language').TextProcessor} */
export const alphanumericWidthVariants = {
    name: 'Convert between alphabetic width variants',
    description: 'ｙｏｍｉｔａｎ → yomitan and vice versa',
    process: (str) => [
        str,
        convertFullWidthAlphanumericToNormal(str),
        convertAlphanumericToFullWidth(str),
    ],
};

/** @type {import('language').TextProcessor} */
export const convertHiraganaToKatakana = {
    name: 'Convert hiragana to katakana',
    description: 'よみちゃん → ヨミチャン and vice versa',
    process: (str) => [
        str,
        convertHiraganaToKatakanaFunction(str),
        convertKatakanaToHiraganaFunction(str),
    ],
};

/** @type {import('language').TextProcessor} */
export const collapseEmphaticSequences = {
    name: 'Collapse emphatic character sequences',
    description: 'すっっごーーい → すっごーい / すごい',
    process: (str) => [
        str,
        collapseEmphaticSequencesFunction(str, false),
        collapseEmphaticSequencesFunction(str, true),
    ],
};

/** @type {import('language').TextProcessor} */
export const normalizeCombiningCharacters = {
    name: 'Normalize combining characters',
    description: 'ド → ド (U+30C8 U+3099 → U+30C9)',
    process: (str) => [str, normalizeCombiningCharactersFunction(str)],
};

/** @type {import('language').TextProcessor} */
export const normalizeCJKCompatibilityCharacters = {
    name: 'Normalize CJK Compatibility Characters',
    description: '㌀ → アパート',
    process: (str) => [str, normalizeCJKCompatibilityCharactersFunction(str)],
};

/** @type {import('language').TextProcessor} */
export const standardizeKanji = {
    name: 'Convert kanji variants to their modern standard form',
    description: '萬 → 万',
    process: (str) => [str, convertVariants(str)],
};

const WILDCARD_MAX_VARIANTS = 51;
const WILDCARD_CHAR = '～'; // U+FF5E fullwidth tilde

/** @type {import('language').TextProcessor} */
export const insertWildcard = {
    name: 'Insert wildcard for grammar patterns',
    description: 'いくら騒いでも → いくら～でも',
    process: (str) => {
        const chars = [...str];
        const n = chars.length;
        if (n < 3) { return [str]; }

        /** @type {string[]} */
        const results = [str];
        for (let prefixLen = 1; prefixLen < n; prefixLen++) {
            for (let suffixLen = 1; suffixLen < n - prefixLen; suffixLen++) {
                const prefix = chars.slice(0, prefixLen).join('');
                const suffix = chars.slice(n - suffixLen).join('');
                results.push(prefix + WILDCARD_CHAR + suffix);
                if (results.length >= WILDCARD_MAX_VARIANTS) { return results; }
            }
        }
        return results;
    },
};
