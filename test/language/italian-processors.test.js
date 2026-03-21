/*
 * Copyright (C) 2025-2026  Yomitan Authors
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

import {describe, expect, test} from 'vitest';
import {removeApostrophedWordsImpl} from '../../ext/js/language/it/italian-processors.js';

const testCases = [
    ['dell\'Italia', 'Italia'],
    ['nell\'Italia', 'Italia'],
    ['c\'erano', 'erano'],
    ['c’erano', 'erano'],
];

describe('removing apostrophed words', () => {
    test.each(testCases)('%s converts to %s', (input, expected) => {
        expect(removeApostrophedWordsImpl(input)).toStrictEqual(expected);
    });
});
