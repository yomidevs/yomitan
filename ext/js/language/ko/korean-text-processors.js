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

import {Hangul} from '../../../lib/hangul-js.js';

/** @type {import('language').TextProcessor<boolean>} */
export const disassembleHangul = {
    name: 'Disassemble Hangul',
    description: 'Disassemble Hangul characters into jamo.',
    options: [true], // Could probably also be set to [false, true], but this way it is always on
    process: (str) => {
        return Hangul.disassemble(str, false).join('');
    },
};

/** @type {import('language').TextProcessor<boolean>} */
export const reassembleHangul = {
    name: 'Reassemble Hangul',
    description: 'Reassemble Hangul characters from jamo.',
    options: [true], // Could probably also be set to [false, true], but this way it is always on
    process: (str) => {
        return Hangul.assemble(str);
    },
};
