/*
 * Copyright (C) 2016-2022  Yomichan Authors
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

/* global
 * wanakana
*/

import {
    KANA_TO_VOWEL_MAPPING
} from './constants.js';

export function isCodePointInRange(codePoint, [min, max]) {
    return (codePoint >= min && codePoint <= max);
}

export function getProlongedHiragana(previousCharacter) {
    switch (KANA_TO_VOWEL_MAPPING.get(previousCharacter)) {
        case 'a': return 'あ';
        case 'i': return 'い';
        case 'u': return 'う';
        case 'e': return 'え';
        case 'o': return 'う';
        default: return null;
    }
}

export function convertAlphabeticPartToKana(text, sourceMap, sourceMapStart) {
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