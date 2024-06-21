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

const TONE = '([\u0300\u0309\u0303\u0301\u0323])'; // Huyền, hỏi, ngã, sắc, nặng
const COMBINING_BREVE = '\u0306'; // Ă
const COMBINING_CIRCUMFLEX_ACCENT = '\u0302'; // Â
const COMBINING_HORN = '\u031B'; // Ơ
const DIACRITICS = `${COMBINING_BREVE}${COMBINING_CIRCUMFLEX_ACCENT}${COMBINING_HORN}`;

// eslint-disable-next-line no-misleading-character-class
const re1 = new RegExp(`${TONE}([aeiouy${DIACRITICS}]+)`, 'i');
const re2 = new RegExp(`(?<=[${DIACRITICS}])(.)${TONE}`, 'i');
const re3 = new RegExp(`(?<=[ae])([iouy])${TONE}`, 'i');
const re4 = new RegExp(`(?<=[oy])([iuy])${TONE}`, 'i');
const re5 = new RegExp(`(?<!q)(u)([aeiou])${TONE}`, 'i');
const re6 = new RegExp(`(?<!g)(i)([aeiouy])${TONE}`, 'i');
const re7 = new RegExp(`(?<!q)([ou])([aeoy])${TONE}(?!\\w)`, 'i');

/**
 * This function is adapted from https://github.com/enricobarzetti/viet_text_tools/blob/master/viet_text_tools/__init__.py
 * @type {import('language').TextProcessor<'old'|'new'|'off'>}
 */
export const normalizeDiacritics = {
    name: 'Normalize Diacritics',
    description: 'Normalize diacritics and their placements (in either the old style or new style). NFC normalization is used.',
    options: ['old', 'new', 'off'],
    process: (str, setting) => {
        if (setting === 'off') { return str; }

        let result = str.normalize('NFD');
        // Put the tone on the second vowel
        result = result.replace(re1, '$2$1');
        // Put the tone on the vowel with a diacritic
        result = result.replace(re2, '$2$1');
        // For vowels that are not oa, oe, uy put the tone on the penultimate vowel
        result = result.replace(re3, '$2$1');
        result = result.replace(re4, '$2$1');
        result = result.replace(re5, '$1$3$2');
        result = result.replace(re6, '$1$3$2');

        if (setting === 'old') { result = result.replace(re7, '$1$3$2'); }
        return result.normalize('NFC');
    },
};
