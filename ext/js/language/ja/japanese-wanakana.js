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
 * @param {?import('../../general/text-source-map.js').TextSourceMap} sourceMap
 * @param {number} sourceMapStart
 * @returns {string}
 */
function convertAlphabeticPartToKana(text, sourceMap, sourceMapStart) {
    const result = wanakana.toHiragana(text);

    // Generate source mapping
    if (sourceMap !== null) {
        let i = 0;
        let resultPos = 0;
        const ii = text.length;
        while (i < ii) {
            // Find smallest matching substring
            let iNext = i + 1;
            let resultPosNext = result.length;
            while (iNext < ii) {
                const t = wanakana.toHiragana(text.substring(0, iNext));
                if (t === result.substring(0, t.length)) {
                    resultPosNext = t.length;
                    break;
                }
                ++iNext;
            }

            // Merge characters
            const removals = iNext - i - 1;
            if (removals > 0) {
                sourceMap.combine(sourceMapStart, removals);
            }
            ++sourceMapStart;

            // Empty elements
            const additions = resultPosNext - resultPos - 1;
            for (let j = 0; j < additions; ++j) {
                sourceMap.insert(sourceMapStart, 0);
                ++sourceMapStart;
            }

            i = iNext;
            resultPos = resultPosNext;
        }
    }

    return result;
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
 * @param {?import('../../general/text-source-map.js').TextSourceMap} sourceMap
 * @returns {string}
 */
export function convertAlphabeticToKana(text, sourceMap = null) {
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
                result += convertAlphabeticPartToKana(part, sourceMap, result.length);
                part = '';
            }
            result += char;
            continue;
        }
        part += String.fromCodePoint(c);
    }

    if (part.length > 0) {
        result += convertAlphabeticPartToKana(part, sourceMap, result.length);
    }
    return result;
}
