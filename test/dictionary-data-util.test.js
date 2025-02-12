/*
 * Copyright (C) 2023-2025  Yomitan Authors
 * Copyright (C) 2021-2022  Yomichan Authors
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
import {compareRevisions} from '../ext/js/dictionary/dictionary-data-util.js';

describe('compareRevisions', () => {
    /** @type {[current: string, latest: string, hasUpdate: boolean][]} */
    const data = [
        ['1', '2', true],
        ['4.7', '4.8', true],
        ['4.8', '4.8', false],
        ['version1', 'version2', true],
        ['version2', 'version100', false],
    ];

    test.each(data)('compare revisions %s -> %s', (current, latest, hasUpdate) => {
        expect(compareRevisions(current, latest)).toStrictEqual(hasUpdate);
    });
});
