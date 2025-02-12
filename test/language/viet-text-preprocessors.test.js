/*
 * Copyright (C) 2023-2025  Yomitan Authors
 * Copyright (C) 2020-2022  Yomichan Authors
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

import {normalizeDiacritics} from '../../ext/js/language/vi/viet-text-preprocessors.js';
import {describe, expect, test} from 'vitest';

const testCasesOldStyle = [
    ['hoạ', 'họa'],
    ['choàng', 'choàng'],
    ['thuỷ', 'thủy'],
    ['oà', 'òa'],
    ['toà', 'tòa'],
    ['toàn', 'toàn'],
    ['tòan', 'toàn'],
];

const testCasesNewStyle = [
    ['ngòăng', 'ngoằng'],
    ['họa', 'hoạ'],
    ['chòang', 'choàng'],
    ['giừơng', 'giường'],
    ['baỷ', 'bảy'],
    ['cuả', 'của'],
    ['òa', 'oà'],
    ['toàn', 'toàn'],
];

describe('diacritics normalization', () => {
    const {options, process} = normalizeDiacritics;
    for (const option of options) {
        if (option === 'off') { return; }

        describe(`${option} style`, () => {
            if (option === 'new') {
                test.each(testCasesNewStyle)('%s normalizes to %s', (input, expected) => {
                    expect(process(input, option)).toStrictEqual(expected);
                });
            } else {
                test.each(testCasesOldStyle)('%s normalizes to %s', (input, expected) => {
                    expect(process(input, option)).toStrictEqual(expected);
                });
            }
        });
    }
});
