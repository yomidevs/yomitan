/*
 * Copyright (C) 2024-2025  Yomitan Authors
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

import {prefixInflection} from '../language-transforms.js';

/** @typedef {keyof typeof conditions} Condition */

const eclipsisPrefixInflections = [
    prefixInflection('mb', 'b', ['n'], ['n']), // 'mbean'
    prefixInflection('gc', 'c', ['n'], ['n']), // 'gclann'
    prefixInflection('nd', 'd', ['n'], ['n']), // 'ndul'
    prefixInflection('bhf', 'f', ['n'], ['n']), // bhfear
    prefixInflection('ng', 'g', ['n'], ['n']), // nGaeilge
    prefixInflection('bp', 'p', ['n'], ['n']), // bpáiste
    prefixInflection('dt', 't', ['n'], ['n']), // dtriail
];

const conditions = {
    v: {
        name: 'Verb',
        isDictionaryForm: true,
        subConditions: ['v_phr'],
    },
    v_phr: {
        name: 'Phrasal verb',
        isDictionaryForm: true,
    },
    n: {
        name: 'Noun',
        isDictionaryForm: true,
        subConditions: ['np', 'ns'],
    },
    np: {
        name: 'Noun plural',
        isDictionaryForm: true,
    },
    ns: {
        name: 'Noun singular',
        isDictionaryForm: true,
    },
    adj: {
        name: 'Adjective',
        isDictionaryForm: true,
    },
    adv: {
        name: 'Adverb',
        isDictionaryForm: true,
    },
};

/** @type {import('language-transformer').LanguageTransformDescriptor<Condition>} */
export const irishTransforms = {
    language: 'ga',
    conditions,
    transforms: {
        eclipsis: {
            name: 'eclipsis',
            description: 'eclipsis form of a noun',
            rules: [
                ...eclipsisPrefixInflections,
            ],
        },
    },
};
