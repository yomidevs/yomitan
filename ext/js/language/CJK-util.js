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

/** @type {import('CJK-util').CodepointRange} */
const CJK_UNIFIED_IDEOGRAPHS_RANGE = [0x4e00, 0x9fff];
/** @type {import('CJK-util').CodepointRange} */
const CJK_UNIFIED_IDEOGRAPHS_EXTENSION_A_RANGE = [0x3400, 0x4dbf];
/** @type {import('CJK-util').CodepointRange} */
const CJK_UNIFIED_IDEOGRAPHS_EXTENSION_B_RANGE = [0x20000, 0x2a6df];
/** @type {import('CJK-util').CodepointRange} */
const CJK_UNIFIED_IDEOGRAPHS_EXTENSION_C_RANGE = [0x2a700, 0x2b73f];
/** @type {import('CJK-util').CodepointRange} */
const CJK_UNIFIED_IDEOGRAPHS_EXTENSION_D_RANGE = [0x2b740, 0x2b81f];
/** @type {import('CJK-util').CodepointRange} */
const CJK_UNIFIED_IDEOGRAPHS_EXTENSION_E_RANGE = [0x2b820, 0x2ceaf];
/** @type {import('CJK-util').CodepointRange} */
const CJK_UNIFIED_IDEOGRAPHS_EXTENSION_F_RANGE = [0x2ceb0, 0x2ebef];
/** @type {import('CJK-util').CodepointRange} */
const CJK_UNIFIED_IDEOGRAPHS_EXTENSION_G_RANGE = [0x30000, 0x3134f];
/** @type {import('CJK-util').CodepointRange} */
const CJK_UNIFIED_IDEOGRAPHS_EXTENSION_H_RANGE = [0x31350, 0x323af];
/** @type {import('CJK-util').CodepointRange} */
const CJK_UNIFIED_IDEOGRAPHS_EXTENSION_I_RANGE = [0x2ebf0, 0x2ee5f];
/** @type {import('CJK-util').CodepointRange} */
const CJK_COMPATIBILITY_IDEOGRAPHS_RANGE = [0xf900, 0xfaff];
/** @type {import('CJK-util').CodepointRange} */
const CJK_COMPATIBILITY_IDEOGRAPHS_SUPPLEMENT_RANGE = [0x2f800, 0x2fa1f];

/** @type {import('CJK-util').CodepointRange[]} */
export const CJK_IDEOGRAPH_RANGES = [
    CJK_UNIFIED_IDEOGRAPHS_RANGE,
    CJK_UNIFIED_IDEOGRAPHS_EXTENSION_A_RANGE,
    CJK_UNIFIED_IDEOGRAPHS_EXTENSION_B_RANGE,
    CJK_UNIFIED_IDEOGRAPHS_EXTENSION_C_RANGE,
    CJK_UNIFIED_IDEOGRAPHS_EXTENSION_D_RANGE,
    CJK_UNIFIED_IDEOGRAPHS_EXTENSION_E_RANGE,
    CJK_UNIFIED_IDEOGRAPHS_EXTENSION_F_RANGE,
    CJK_UNIFIED_IDEOGRAPHS_EXTENSION_G_RANGE,
    CJK_UNIFIED_IDEOGRAPHS_EXTENSION_H_RANGE,
    CJK_UNIFIED_IDEOGRAPHS_EXTENSION_I_RANGE,
    CJK_COMPATIBILITY_IDEOGRAPHS_RANGE,
    CJK_COMPATIBILITY_IDEOGRAPHS_SUPPLEMENT_RANGE,
];

/** @type {import('CJK-util').CodepointRange[]} */
export const FULLWIDTH_CHARACTER_RANGES = [
    [0xff10, 0xff19], // Fullwidth numbers
    [0xff21, 0xff3a], // Fullwidth upper case Latin letters
    [0xff41, 0xff5a], // Fullwidth lower case Latin letters

    [0xff01, 0xff0f], // Fullwidth punctuation 1
    [0xff1a, 0xff1f], // Fullwidth punctuation 2
    [0xff3b, 0xff3f], // Fullwidth punctuation 3
    [0xff5b, 0xff60], // Fullwidth punctuation 4
    [0xffe0, 0xffee], // Currency markers
];

/** @type {import('CJK-util').CodepointRange} */
export const CJK_PUNCTUATION_RANGE = [0x3000, 0x303f];

/**
 * @param {number} codePoint
 * @param {import('CJK-util').CodepointRange} range
 * @returns {boolean}
 */
export function isCodePointInRange(codePoint, [min, max]) {
    return (codePoint >= min && codePoint <= max);
}

/**
 * @param {number} codePoint
 * @param {import('CJK-util').CodepointRange[]} ranges
 * @returns {boolean}
 */
export function isCodePointInRanges(codePoint, ranges) {
    for (const [min, max] of ranges) {
        if (codePoint >= min && codePoint <= max) {
            return true;
        }
    }
    return false;
}
