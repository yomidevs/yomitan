/*
 * Copyright (C) 2023  Yomitan Authors
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
        id: 'removeDiacritics',
        name: 'Remove diacritics',
        description: 'āēīōūȳ → aeiouy, áéíóúý → aeiouy',
        options: {
            false: 'Disabled',
            true: 'Enabled',
            variant: 'Use both variants'
        },
        transform: (text) => {
            const diacriticMap = {
                'ā': 'a', 'ē': 'e', 'ī': 'i', 'ō': 'o', 'ū': 'u', 'ȳ': 'y',
                'Ā': 'A', 'Ē': 'E', 'Ī': 'I', 'Ō': 'O', 'Ū': 'U', 'Ȳ': 'Y',
                'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u', 'ý': 'y',
                'Á': 'A', 'É': 'E', 'Í': 'I', 'Ó': 'O', 'Ú': 'U', 'Ý': 'Y'
            };
            return text.replace(/[āēīōūȳáéíóúýĀĒĪŌŪȲÁÉÍÓÚÝ]/g, (match) => diacriticMap[match] || match);
        }
    },
    decapitalize,
    capitalizeFirstLetter
];