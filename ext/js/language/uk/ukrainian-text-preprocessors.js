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
 * The input set is deliberately wider than the output set below: the grave and acute accents show up
 * in careless typing but never as a dictionary headword spelling, so they are recognised on the way
 * in and never generated on the way out.
 */
const apostropheVariantsRegExp = /['‘’ʼ`´]/g;

/**
 * Dictionary terms are indexed exactly as the dictionary spells them, so a variant has to be
 * produced for every character an entry might realistically be stored with, not just for the one
 * the scanned text happens to use. These three all occur as headword spellings in practice.
 */
const apostropheNormalizations = ['\'', '’', 'ʼ'];

/** @type {import('language').TextProcessor} */
export const removeUkrainianDiacritics = {
    name: 'Remove diacritics',
    description: 'Á → A, á → a',
    process: (str) => [str, str.replace(/́/g, '')],
};

/** @type {import('language').TextProcessor} */
export const ukrainianApostropheVariants = {
    name: 'Search for apostrophe variants',
    description: '’ → \', ʼ → \' and vice versa',
    process: (str) => [
        str,
        ...apostropheNormalizations.map((apostrophe) => str.replace(apostropheVariantsRegExp, apostrophe)),
    ],
};
