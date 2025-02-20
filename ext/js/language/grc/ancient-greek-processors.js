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
export function latinToGreek(latin) {
    latin = removeAlphabeticDiacritics.process(latin, true);

    const singleMap = {
        a: 'α',
        b: 'β',
        g: 'γ',
        d: 'δ',
        e: 'ε',
        z: 'ζ',
        ē: 'η',
        i: 'ι',
        k: 'κ',
        l: 'λ',
        m: 'μ',
        n: 'ν',
        x: 'ξ',
        o: 'ο',
        p: 'π',
        r: 'ρ',
        s: 'σ',
        t: 'τ',
        u: 'υ',
        ō: 'ω',
        A: 'Α',
        B: 'Β',
        G: 'Γ',
        D: 'Δ',
        E: 'Ε',
        Z: 'Ζ',
        Ē: 'Η',
        I: 'Ι',
        K: 'Κ',
        L: 'Λ',
        M: 'Μ',
        N: 'Ν',
        X: 'Ξ',
        O: 'Ο',
        P: 'Π',
        R: 'Ρ',
        S: 'Σ',
        T: 'Τ',
        U: 'Υ',
        Ō: 'Ω',
    };

    const doubleMap = {
        th: 'θ',
        ph: 'φ',
        ch: 'χ',
        ps: 'ψ',
        Th: 'Θ',
        Ph: 'Φ',
        Ch: 'Χ',
        Ps: 'Ψ',
    };

    let result = latin;

    for (const [double, greek] of Object.entries(doubleMap)) {
        result = result.replace(new RegExp(double, 'g'), greek);
    }

    // Handle basic character replacements
    for (const [single, greek] of Object.entries(singleMap)) {
        result = result.replace(new RegExp(single, 'g'), greek);
    }

    // Handle final sigma
    result = result.replace(/σ$/, 'ς');

    return result;
}
