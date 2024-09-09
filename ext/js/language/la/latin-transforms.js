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
    adj: {
        isDictionaryForm: true,
        name: 'Adjective',
        subConditions: ['adj3', 'adj12'],
    },
    adj3: {
        isDictionaryForm: true,
        name: 'Adjective, 3rd declension',
    },
    adj12: {
        isDictionaryForm: true,
        name: 'Adjective, 1st-2nd declension',
    },
    adv: {
        isDictionaryForm: true,
        name: 'Adverb',
    },
    n: {
        isDictionaryForm: true,
        name: 'Noun',
        subConditions: ['ns', 'np'],
    },
    n1: {
        isDictionaryForm: true,
        name: 'Noun, 1st declension',
        subConditions: ['n1s', 'n1p'],
    },
    n1p: {
        isDictionaryForm: true,
        name: 'Noun, 1st declension, plural',
    },
    n1s: {
        isDictionaryForm: true,
        name: 'Noun, 1st declension, singular',
    },
    n2: {
        isDictionaryForm: true,
        name: 'Noun, 2nd declension',
        subConditions: ['n2s', 'n2p'],
    },
    n2p: {
        isDictionaryForm: true,
        name: 'Noun, 2nd declension, plural',
    },
    n2s: {
        isDictionaryForm: true,
        name: 'Noun, 2nd declension, singular',
    },
    n3: {
        isDictionaryForm: true,
        name: 'Noun, 3rd declension',
        subConditions: ['n3s', 'n3p'],
    },
    n3p: {
        isDictionaryForm: true,
        name: 'Noun, 3rd declension, plural',
    },
    n3s: {
        isDictionaryForm: true,
        name: 'Noun, 3rd declension, singular',
    },
    n4: {
        isDictionaryForm: true,
        name: 'Noun, 4th declension',
        subConditions: ['n4s', 'n4p'],
    },
    n4p: {
        isDictionaryForm: true,
        name: 'Noun, 4th declension, plural',
    },
    n4s: {
        isDictionaryForm: true,
        name: 'Noun, 4th declension, singular',
    },
    n5: {
        isDictionaryForm: true,
        name: 'Noun, 5th declension',
        subConditions: ['n5s', 'n5p'],
    },
    n5p: {
        isDictionaryForm: true,
        name: 'Noun, 5th declension, plural',
    },
    n5s: {
        isDictionaryForm: true,
        name: 'Noun, 5th declension, singular',
    },
    np: {
        isDictionaryForm: true,
        name: 'Noun, plural',
        subConditions: ['n1p', 'n2p', 'n3p', 'n4p', 'n5p'],
    },
    ns: {
        isDictionaryForm: true,
        name: 'Noun, singular',
        subConditions: ['n1s', 'n2s', 'n3s', 'n4s', 'n5s'],
    },
    v: {
        isDictionaryForm: true,
        name: 'Verb',
    },
};

/** @type {import('language-transformer').LanguageTransformDescriptor<keyof typeof conditions>} */
export const latinTransforms = {
    conditions,
    language: 'la',
    transforms: {
        ablative: {
            description: 'Ablative case',
            name: 'ablative',
            rules: [
                suffixInflection('o', 'um', ['n2s'], ['n2s']),
            ],
        },
        feminine: {
            description: 'Adjective form',
            name: 'feminine',
            rules: [
                suffixInflection('a', 'us', ['adj12'], ['adj12']),
            ],
        },
        neuter: {
            description: 'Adjective form',
            name: 'neuter',
            rules: [
                suffixInflection('um', 'us', ['adj12'], ['adj12']),
            ],
        },
        plural: {
            description: 'Plural declension',
            name: 'plural',
            rules: [
                suffixInflection('i', 'us', ['n2p'], ['n2s']),
                suffixInflection('i', 'us', ['adj12'], ['adj12']),
                suffixInflection('e', '', ['n1p'], ['n1s']),
                suffixInflection('ae', 'a', ['adj12'], ['adj12']),
                suffixInflection('a', 'um', ['adj12'], ['adj12']),
            ],
        },
    },
};
