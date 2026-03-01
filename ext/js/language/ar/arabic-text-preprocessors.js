/*
 * Copyright (C) 2024-2025  Yomitan Authors
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
 * Generates all possible combinations of replacing or not replacing
 * each occurrence of a pattern within a string.
 *
 * For a pattern that matches `n` times, this function returns `2^n`
 * strings representing every possible combination of replacements.
 *
 * Note: this implementation only works for n < 31, as bitwise shifting is used, and
 * JavaScript operations operate on 32-bit signed integers. However, this function should
 * not be used if such large values of n are expected anyway, due to its inherent
 * exponential growth.
 * @param {string} str
 * @param {string|RegExp} pattern
 * @param {string} replacement
 * @returns {string[]}
 */
function generateReplacementCombinations(str, pattern, replacement) {
    const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern, 'g');
    const matches = [...str.matchAll(regex)];
    const n = matches.length;
    // Total of 2^n possible combinations
    const total = 1 << n;

    const results = [];
    for (let mask = 0; mask < total; mask++) {
        let i = 0;

        const result = str.replaceAll(regex, (match) => {
            // Only replace ith occurrence if ith bit in bitmask is set to 1
            const shouldReplace = mask & (1 << i++);
            return shouldReplace ? replacement : match;
        });

        results.push(result);
    }

    return results;
}

const optionalDiacritics = [
    '\u0618', // Small Fatha
    '\u0619', // Small Damma
    '\u061A', // Small Kasra
    '\u064B', // Fathatan
    '\u064C', // Dammatan
    '\u064D', // Kasratan
    '\u064E', // Fatha
    '\u064F', // Damma
    '\u0650', // Kasra
    '\u0651', // Shadda
    '\u0652', // Sukun
    '\u0653', // Maddah
    '\u0654', // Hamza Above
    '\u0655', // Hamza Below
    '\u0656', // Subscript Alef
    '\u0670', // Dagger Alef
];

const diacriticsRegex = new RegExp(`[${optionalDiacritics.join('')}]`, 'g');

/** @type {import('language').TextProcessor} */
export const removeArabicScriptDiacritics = {
    name: 'Remove diacritics',
    description: 'وَلَدَ → ولد',
    process: (text) => [text, text.replace(diacriticsRegex, '')],
};

/** @type {import('language').TextProcessor} */
export const removeTatweel = {
    name: 'Remove tatweel characters',
    description: 'لـكن → لكن',
    process: (text) => [text, text.replaceAll('ـ', '')],
};

/** @type {import('language').TextProcessor} */
export const normalizeUnicode = {
    name: 'Normalize unicode',
    description: 'ﻴ → ي',
    process: (text) => [text, text.normalize('NFKC')],
};

/** @type {import('language').TextProcessor} */
export const addHamzaTop = {
    name: 'Add Hamza to top of Alif',
    description: 'اكبر → أكبر',
    process: (text) => generateReplacementCombinations(text, 'ا', 'أ'),
};

/** @type {import('language').TextProcessor} */
export const addHamzaBottom = {
    name: 'Add Hamza to bottom of Alif',
    description: 'اسلام → إسلام',
    process: (text) => generateReplacementCombinations(text, 'ا', 'إ'),
};

/** @type {import('language').TextProcessor} */
export const addMadd = {
    name: 'Add Madd to Alif',
    description: 'الان → الآن',
    process: (text) => generateReplacementCombinations(text, 'ا', 'آ'),
};

/** @type {import('language').TextProcessor} */
export const convertAlifMaqsuraToYaa = {
    name: 'Convert Alif Maqsura to Yaa',
    description: 'فى → في',
    process: (text) => [text, text.replace(/ى$/, 'ي')],
};

/** @type {import('language').TextProcessor} */
export const convertHaToTaMarbuta = {
    name: 'Convert final Ha to Ta Marbuta',
    description: 'لغه → لغة',
    process: (text) => [text, text.replace(/ه$/, 'ة')],
};
