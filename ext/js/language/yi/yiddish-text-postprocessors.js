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


const final_letter_map = new Map([
    ['מ', 'ם'],
    ['נ', 'ן'],
    ['צ', 'ץ'],
    ['פ', 'ף'],
    ['כ', 'ך'],
]);

/* This could probably be optimized with a regular expression and a function call in str.replace instead of a for loop */
/** @type {import('language').TextProcessor<boolean>} */
export const convertFinalLetters = {
    name: 'Convert to Final Letters',
    description: 'קויף → קויפֿ',
    options: [true],
    process: (str) => {
        if ([...final_letter_map.keys()].includes(str.charAt(str.length - 1))) {
            str = str.substring(0, str.length - 1) + final_letter_map.get(str.substring(str.length - 1));
        }
        return str;
    },
};
