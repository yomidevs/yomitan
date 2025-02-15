/*
 * Copyright (C) 2025  Yomitan Authors
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

import {basicTextProcessorOptions, removeAlphabeticDiacritics} from '../text-processors.js';

/** @type {import('language').TextProcessor<boolean>} */
export const convertLatinToGreek = {
    name: 'Convert latin characters to greek',
    description: 'a → α, A → Α, b → β, B → Β, etc.',
    options: basicTextProcessorOptions,
    process: (str, setting) => {
        return setting ? latinToGreek(str) : str;
    },
};

/**
 * @param {string} latin
 * @returns {string}
 */
function latinToGreek(latin) {
    latin = removeAlphabeticDiacritics.process(latin, true);

    const singleMap = {
        'a': 'α',
        'b': 'β',
        'g': 'γ',
        'd': 'δ',
        'e': 'ε',
        'z': 'ζ',
        'ē': 'η',
        'i': 'ι',
        'k': 'κ',
        'l': 'λ',
        'm': 'μ',
        'n': 'ν',
        'x': 'ξ',
        'o': 'ο',
        'p': 'π',
        'r': 'ρ',
        's': 'σ',
        't': 'τ',
        'u': 'υ',
        'ō': 'ω'
    };

    const doubleMap = {
        'th': 'θ',
        'ph': 'φ',
        'ch': 'χ',
        'ps': 'ψ',
    }

    let result = latin.toLowerCase();

    for (let [latin, greek] of Object.entries(doubleMap)) {
        result = result.replace(new RegExp(latin, 'g'), greek);
    }

    // Handle basic character replacements
    for (let [latin, greek] of Object.entries(singleMap)) {
        result = result.replace(new RegExp(latin, 'g'), greek);
    }

    // Handle final sigma
    result = result.replace(/σ$/, 'ς');

    return result;
}