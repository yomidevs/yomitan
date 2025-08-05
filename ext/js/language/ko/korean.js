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

import {CJK_IDEOGRAPH_RANGES, CJK_PUNCTUATION_RANGE, FULLWIDTH_CHARACTER_RANGES, isCodePointInRanges} from '../CJK-util.js';

/** @type {import('CJK-util').CodepointRange} */
const HANGUL_JAMO_RANGE = [0x1100, 0x11ff];
/** @type {import('CJK-util').CodepointRange} */
const HANGUL_COMPATIBILITY_JAMO_RANGE = [0x3130, 0x318f];
/** @type {import('CJK-util').CodepointRange} */
const HANGUL_SYLLABLES_RANGE = [0xac00, 0xd7af];
/** @type {import('CJK-util').CodepointRange} */
const HANGUL_JAMO_EXTENDED_A_RANGE = [0xa960, 0xa97f];
/** @type {import('CJK-util').CodepointRange} */
const HANGUL_JAMO_EXTENDED_B_RANGE = [0xd7b0, 0xd7ff];
/** @type {import('CJK-util').CodepointRange} */
const HANGUL_JAMO_HALF_WIDTH_RANGE = [0xffa0, 0xffdf];

/**
 * Korean character ranges, roughly ordered in order of expected frequency.
 * @type {import('CJK-util').CodepointRange[]}
 */
const KOREAN_RANGES = [
    ...CJK_IDEOGRAPH_RANGES,
    CJK_PUNCTUATION_RANGE,
    ...FULLWIDTH_CHARACTER_RANGES,

    HANGUL_JAMO_RANGE,
    HANGUL_COMPATIBILITY_JAMO_RANGE,
    HANGUL_SYLLABLES_RANGE,
    HANGUL_JAMO_EXTENDED_A_RANGE,
    HANGUL_JAMO_EXTENDED_B_RANGE,
    HANGUL_JAMO_HALF_WIDTH_RANGE,
];

/**
 * @param {number} codePoint
 * @returns {boolean}
 */
export function isCodePointKorean(codePoint) {
    return isCodePointInRanges(codePoint, KOREAN_RANGES);
}
