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

import {suffixInflection} from '../language-transforms.js';


// TODO: -ne suffix (estne, nonne)?

const conditions = {
    v: {
        name: 'Verb',
        isDictionaryForm: true,
    },
    n: {
        name: 'Noun',
        isDictionaryForm: true,
    },
};

/** @type {import('language-transformer').LanguageTransformDescriptor<keyof typeof conditions>} */
export const ancientGreekTransforms = {
    language: 'grc',
    conditions,
    transforms: {
        '3rd person singular present active indicative': {
            name: '3rd person singular present active indicative',
            rules: [
                suffixInflection('ει', 'ω', [], ['v']),
                suffixInflection('ει', 'εω', [], ['v']),
            ],
        },
        'accusative singular': {
            name: 'accusative singular',
            rules: [
                suffixInflection('ον', 'ος', [], ['n']),
            ],
        },
        'nominalization': {
            name: 'nominalization',
            rules: [
                suffixInflection('ος', 'εω', [], ['v']),
            ],
        },
    },
};
