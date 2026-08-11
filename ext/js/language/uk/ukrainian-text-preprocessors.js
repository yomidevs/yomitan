/*
 * Copyright (C) 2026  Yomitan Authors
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

/**
 * Ukrainian uses several visually similar characters for the apostrophe which separates a labial
 * consonant from a following iotated vowel, as in "п'ять". Dictionaries and the text they are
 * scanned against rarely agree on which one to use, so all of them are treated as equivalent.
 */
const apostropheVariantsRegExp = /['‘’ʼ`´]/g;

/** @type {import('language').TextProcessor} */
export const removeUkrainianDiacritics = {
    name: 'Remove diacritics',
    description: 'Á → A, á → a',
    process: (str) => [str, str.replace(/́/g, '')],
};

/** @type {import('language').TextProcessor} */
export const ukrainianApostropheVariants = {
    name: 'Search for apostrophe variants',
    description: '’ → \' and vice versa',
    process: (str) => [
        str,
        str.replace(apostropheVariantsRegExp, '\''),
        str.replace(apostropheVariantsRegExp, '’'),
    ],
};
