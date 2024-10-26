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

import * as wanakana from '../../../lib/wanakana.js';

/**
 * @param {string} text
 * @returns {string}
 */
function convertAlphabeticPartToKana(text) {
    return wanakana.toHiragana(text);
}

/**
 * @param {string} text
 * @returns {string}
 */
export function convertToKana(text) {
    return wanakana.toKana(text);
}

/**
 * @param {string} text
 * @returns {string}
 */
export function convertToRomaji(text) {
    return wanakana.toRomaji(text);
}

/**
 * @param {string} text
 * @returns {string}
 */
export function convertAlphabeticToKana(text) {
    let part = '';
    let result = '';

    for (const char of text) {
        // Note: 0x61 is the character code for 'a'
        let c = /** @type {number} */ (char.codePointAt(0));
        if (c >= 0x41 && c <= 0x5a) { // ['A', 'Z']
            c += (0x61 - 0x41);
        } else if (c >= 0x61 && c <= 0x7a) { // ['a', 'z']
            // NOP; c += (0x61 - 0x61);
        } else if (c >= 0xff21 && c <= 0xff3a) { // ['A', 'Z'] fullwidth
            c += (0x61 - 0xff21);
        } else if (c >= 0xff41 && c <= 0xff5a) { // ['a', 'z'] fullwidth
            c += (0x61 - 0xff41);
        } else if (c === 0x2d || c === 0xff0d) { // '-' or fullwidth dash
            c = 0x2d; // '-'
        } else {
            if (part.length > 0) {
                result += convertAlphabeticPartToKana(part);
                part = '';
            }
            result += char;
            continue;
        }
        part += String.fromCodePoint(c);
    }

    if (part.length > 0) {
        result += convertAlphabeticPartToKana(part);
    }
    return result;
}
