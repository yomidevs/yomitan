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

const ACCENTS = new Map([
    ['a', 'á'],
    ['e', 'é'],
    ['i', 'í'],
    ['o', 'ó'],
    ['u', 'ú']
]);


/**
 * @param {string} char
 * @returns {string}
 */
function addAccent(char) {
    return ACCENTS.get(char) || char;
}

/** @type {import('language-transformer').LanguageTransformDescriptor} */
export const spanishTransforms = {
    language: 'es',
    conditions: {
        v: {
            name: 'Verb',
            isDictionaryForm: true,
            subConditions: ['v_ar', 'v_er', 'v_ir']
        },
        v_ar: {
            name: '-ar verb',
            isDictionaryForm: true
        },
        v_er: {
            name: '-er verb',
            isDictionaryForm: true
        },
        v_ir: {
            name: '-ir verb',
            isDictionaryForm: true
        },
        n: {
            name: 'Noun',
            isDictionaryForm: true,
            subConditions: ['ns', 'np']
        },
        np: {
            name: 'Noun plural',
            isDictionaryForm: true
        },
        ns: {
            name: 'Noun singular',
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
                suffixInflection('ces', 'z', ['np'], ['ns']), // 'lápices' -> lápiz
                ...[...'aeiou'].map((v) => suffixInflection(`${v}ses`, `${addAccent(v)}s`, ['np'], ['ns'])), // 'autobuses' -> autobús
                ...[...'aeiou'].map((v) => suffixInflection(`${v}nes`, `${addAccent(v)}n`, ['np'], ['ns'])) // 'canciones' -> canción
            ]
        }
    ]
};
