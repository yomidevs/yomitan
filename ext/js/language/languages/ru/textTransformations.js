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
*/

import {capitalizeFirstLetter, decapitalize} from '../../textTransformations.js';

export const textTransformations = [
    {
        id: 'yoToE',
        name: "Convert 'ё' to 'е'",
        description: 'Ё → Е, ё → е',
        options: {
            false: 'Disabled',
            true: 'Enabled',
            variant: 'Use both variants'
        },
        transform: (text) => {
            return text
                .replace(/Ё/g, 'Е')
                .replace(/ё/g, 'е');
        }
    },
    {
        id: 'eToYo',
        name: "Convert 'е' to 'ё'",
        description: 'Е → Ё, е → ё',
        options: {
            false: 'Disabled',
            true: 'Enabled',
            variant: 'Use both variants'
        },
        transform: (text) => {
            return text
                .replace(/Е/g, 'Ё')
                .replace(/е/g, 'ё');
        }
    },
    {
        id: 'removeDiacritics',
        name: 'Remove diacritics',
        description: 'A\u0301 → A, a\u0301 → a',
        options: {
            false: 'Disabled',
            true: 'Enabled',
            variant: 'Use both variants'
        },
        transform: (text) => {
            return text.replace(/\u0301/g, '');
        }
    },
    decapitalize,
    capitalizeFirstLetter
];