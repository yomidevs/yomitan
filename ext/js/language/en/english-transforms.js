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

/** @type {import('language-transformer').LanguageTransformDescriptor} */
export const englishTransforms = {
    language: 'en',
    conditions: {
        v: {
            name: 'Verb',
            isDictionaryForm: true
        },
        n: {
            name: 'Noun',
            isDictionaryForm: true,
            subConditions: ['np', 'ns']
        },
        np: {
            name: 'Noun plural',
            isDictionaryForm: true
        },
        ns: {
            name: 'Noun singular',
            isDictionaryForm: true
        },
        adj: {
            name: 'Adjective',
            isDictionaryForm: true
        }
    },
    transforms: [
        {
            name: 'plural',
            description: 'Plural form of a noun',
            rules: [
                suffixInflection('s', '', ['np'], ['ns']),
                suffixInflection('es', '', ['np'], ['ns']),
                suffixInflection('ies', 'y', ['np'], ['ns']),
                suffixInflection('ves', 'fe', ['np'], ['ns']),
                suffixInflection('ves', 'f', ['np'], ['ns'])
            ]
        }
    ]
};
