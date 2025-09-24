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

import {basicTextProcessorOptions} from '../text-processors.js';

/** @type {import('language').TextProcessor<boolean>} */
export const removeDoubleAcuteAccents = {
    name: 'Remove double acute accents',
    description: 'πρόσωπό → πρόσωπο',
    options: basicTextProcessorOptions,
    process: (str, setting) => {
        return setting ? removeDoubleAcuteAccentsImpl(str) : str;
    },
};

/**
 * @param {string} word
 * @returns {string}
 */
export function removeDoubleAcuteAccentsImpl(word) {
    const ACUTE_ACCENT = '\u0301'; // Combining acute accent
    const decomposed = word.normalize('NFD');

    // Count accents
    const accents = [...decomposed].filter((char) => char === ACUTE_ACCENT);
    if (accents.length < 2) {
        return word;
    }

    // Remove every acute after the first
    let removed = false;
    const updated = [...decomposed].filter((char, i, arr) => {
        if (char === ACUTE_ACCENT && !removed) {
            const rest = arr.slice(i + 1);
            if (!rest.includes(ACUTE_ACCENT)) {
                removed = true;
                return false;
            }
        }
        return true;
    });

    return updated.join('').normalize('NFC');
}
