/*
 * Copyright (C) 2025  Yomitan Authors
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

const suffixes = [
    'ები',
    'ებს',
    'ებების', // plural suffixes
    'მა', // ergative
    'ს', // dative
    'ის', // genitive
    'ით', // instrumental
    'ად', // adverbial
    'ო', // vocative
    'ში',
    'ზე',
    'შია',
    'ზეა',
];

// Stem completion (for consonant endings)
const stemCompletionRules = [
    suffixInflection('გნ', 'გნი', ['n', 'adj'], ['n', 'adj']),
    suffixInflection('ნ', 'ნი', ['n', 'adj'], ['n', 'adj']),
];

// Vowel restoration example (optional, extend as needed)
const vowelRestorationRules = [
    suffixInflection('გ', 'გა', ['n', 'adj'], ['n', 'adj']),
];

export const georgianTransforms = {
    language: 'kat',
    conditions: {
        v: {
            name: 'Verb',
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
    },
    transforms: {
        nounAdjSuffixStripping: {
            name: 'noun-adj-suffix-stripping',
            description: 'Strip Georgian noun and adjective declension suffixes',
            rules: suffixes.map((suffix) => suffixInflection(suffix, '', ['n', 'adj'], ['n', 'adj'])),
        },
        nounAdjStemCompletion: {
            name: 'noun-adj-stem-completion',
            description: 'Restore nominative suffix -ი for consonant-ending noun/adjective stems',
            rules: stemCompletionRules,
        },
        vowelRestoration: {
            name: 'vowel-restoration',
            description: 'Restore truncated vowels if applicable',
            rules: vowelRestorationRules,
        },
    },
};
