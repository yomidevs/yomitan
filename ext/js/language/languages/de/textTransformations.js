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
    decapitalize,
    capitalizeFirstLetter,
    {
        id: 'ssToSharpS',
        name: "Convert 'ss' to 'ß'",
        description: 'ss → ß, SS → ẞ',
        options: {
            false: 'Disabled',
            true: 'Enabled',
            variant: 'Use both variants'
        },
        transform: (text) => {
            return text
                .replace(/ss/g, 'ß')
                .replace(/SS/g, 'ẞ');
        }
    },
    {
        id: 'sharpSToSS',
        name: "Convert 'ß' to 'ss'",
        description: 'ß → ss, ẞ → SS',
        options: {
            false: 'Disabled',
            true: 'Enabled',
            variant: 'Use both variants'
        },
        transform: (text) => {
            return text
                .replace(/ẞ/g, 'SS')
                .replace(/ß/g, 'ss');
        }
    }
];