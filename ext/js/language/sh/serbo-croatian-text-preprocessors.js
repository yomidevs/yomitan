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

import {MAX_PROCESS_VARIANTS} from '../text-processors.js';

/**
 * Generates all variants of a string where unaccented letters that have
 * common diacritic counterparts are substituted: c→č/ć, z→ž, s→š, dj→đ.
 * @param {string} str
 * @returns {string[]}
 */
function generateDiacriticVariants(str) {
    str = str.normalize('NFC');
    /** @type {string[]} */
    let variants = [''];
    let warned = false;

    for (let i = 0; i < str.length; i++) {
        const ch = str[i];
        const next = str[i + 1];

        if ((ch === 'd' || ch === 'D') && (next === 'j' || next === 'J')) {
            const base = ch + next;
            const đ = ch === 'D' ? 'Đ' : 'đ';
            variants = variants.flatMap((v) => [v + base, v + đ]);
            i++;
        } else {
            /** @type {string[]} */
            let choices;
            switch (ch) {
                case 'c': choices = ['c', 'č', 'ć']; break;
                case 'C': choices = ['C', 'Č', 'Ć']; break;
                case 'z': choices = ['z', 'ž']; break;
                case 'Z': choices = ['Z', 'Ž']; break;
                case 's': choices = ['s', 'š']; break;
                case 'S': choices = ['S', 'Š']; break;
                default: choices = [ch]; break;
            }
            variants = variants.flatMap((v) => choices.map((c) => v + c));
        }

        if (variants.length > MAX_PROCESS_VARIANTS) {
            if (!warned) {
                // eslint-disable-next-line no-console
                console.warn(`addSerboCroatianDiacritics: input "${str}" produces too many variants; truncating to ${MAX_PROCESS_VARIANTS}`);
                warned = true;
            }
            variants = variants.slice(0, MAX_PROCESS_VARIANTS);
        }
    }
    return variants;
}

/** @type {import('language').TextProcessor} */
export const addSerboCroatianDiacritics = {
    name: 'Add diacritics',
    description: 'c → č/ć, z → ž, s → š, dj → đ',
    process: (str) => generateDiacriticVariants(str),
};

/** @type {import('language').TextProcessor} */
export const removeSerboCroatianAccentMarks = {
    name: 'Remove vowel accents',
    description: 'A\u0301 → A, a\u0301 → a',
    process: (str) => [
        str,
        str.normalize('NFD').replace(/[aeiourAEIOUR][\u0300-\u036f]/g, (match) => match[0]),
    ],
};
