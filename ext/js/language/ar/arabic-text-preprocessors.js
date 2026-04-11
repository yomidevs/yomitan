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

/**
 * Generates all possible combinations of replacing each occurrence of a
 * pattern with each of the options provided in replacements.
 *
 * For a pattern that matches `n` times, and a list of `m` replacements, this
 * function returns `m^n` strings representing every possible combination of replacements.
 *
 * Note: This function should not be used for large values of n and m, due to its inherent
 * exponential growth.
 * @param {string} str
 * @param {string|RegExp} pattern
 * @param {string[]} replacements
 * @returns {string[]}
 */
function generateReplacementCombinations(str, pattern, replacements) {
    const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern, 'g');

    const matches = [...str.matchAll(regex)];
    const n = matches.length;

    const m = replacements.length; // number of choices per match
    const total = m ** n; // m^n combinations

    const results = [];

    for (let combo = 0; combo < total; combo++) {
        let current = combo;

        const result = str.replaceAll(regex, (_) => {
            // Pick option using base-m digit
            const choiceIndex = current % m;
            current = Math.floor(current / m);

            return replacements[choiceIndex];
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
export const substituteAlif = {
    name: 'Substitutes plain alifs with its variations (alif with hamza, alif with madd)',
    description: 'اكبر → أكبر',
    process: (text) => generateReplacementCombinations(text, 'ا', ['ا', 'أ', 'إ', 'آ']),
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
