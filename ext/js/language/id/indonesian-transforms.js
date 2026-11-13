/*
 * Copyright (C) 2026  Yomitan Authors
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

// Indonesian (Bahasa Indonesia) is analytic-derivational: affixes are stripped
// without part-of-speech conditions so that deinflection works with any
// dictionary, regardless of how its entries are tagged.

import {prefixInflection, suffixInflection} from '../language-transforms.js';

/** @type {import('language-transformer').LanguageTransformDescriptor} */
export const indonesianTransforms = {
    language: 'id',
    conditions: {},
    transforms: {
        'me-': {
            name: 'me-',
            description: 'active verb prefix me-',
            rules: [
                prefixInflection('me', '', [], []),
            ],
        },
        'mem-': {
            name: 'mem-',
            description: 'active verb prefix meN- before b/f/v, with p-restoration',
            rules: [
                prefixInflection('mem', '', [], []),
                prefixInflection('mem', 'p', [], []),
            ],
        },
        'men-': {
            name: 'men-',
            description: 'active verb prefix meN- before c/d/j, with t-restoration',
            rules: [
                prefixInflection('men', '', [], []),
                prefixInflection('men', 't', [], []),
            ],
        },
        'meng-': {
            name: 'meng-',
            description: 'active verb prefix meN- before vowels/g/h, with k-restoration',
            rules: [
                prefixInflection('meng', '', [], []),
                prefixInflection('meng', 'k', [], []),
            ],
        },
        'meny-': {
            name: 'meny-',
            description: 'active verb prefix meN- before s, with s-restoration',
            rules: [
                prefixInflection('meny', 's', [], []),
            ],
        },
        'ber-': {
            name: 'ber-',
            description: 'mutual/stative verb prefix ber-',
            rules: [
                prefixInflection('ber', '', [], []),
            ],
        },
        'bel-': {
            name: 'bel-',
            description: 'allomorph of ber- (e.g. belajar)',
            rules: [
                prefixInflection('bel', '', [], []),
            ],
        },
        'pel-': {
            name: 'pel-',
            description: 'allomorph of per- (e.g. pelajar)',
            rules: [
                prefixInflection('pel', '', [], []),
            ],
        },
        'ter-': {
            name: 'ter-',
            description: 'accidental/involuntary verb prefix ter-',
            rules: [
                prefixInflection('ter', '', [], []),
            ],
        },
        'di-': {
            name: 'di-',
            description: 'passive verb prefix di-',
            rules: [
                prefixInflection('di', '', [], []),
            ],
        },
        'ke-': {
            name: 'ke-',
            description: 'ke- prefix (kah particles, ke-...-an circumfix)',
            rules: [
                prefixInflection('ke', '', [], []),
            ],
        },
        'pe-': {
            name: 'pe-',
            description: 'agent noun prefix pe-',
            rules: [
                prefixInflection('pe', '', [], []),
            ],
        },
        'pem-': {
            name: 'pem-',
            description: 'agent noun prefix peN- before b/f/v, with p-restoration',
            rules: [
                prefixInflection('pem', '', [], []),
                prefixInflection('pem', 'p', [], []),
            ],
        },
        'pen-': {
            name: 'pen-',
            description: 'agent noun prefix peN- before c/d/j, with t-restoration',
            rules: [
                prefixInflection('pen', '', [], []),
                prefixInflection('pen', 't', [], []),
            ],
        },
        'peng-': {
            name: 'peng-',
            description: 'agent noun prefix peN- (with k-restoration)',
            rules: [
                prefixInflection('peng', '', [], []),
                prefixInflection('peng', 'k', [], []),
            ],
        },
        'peny-': {
            name: 'peny-',
            description: 'agent noun prefix peN- before s, with s-restoration',
            rules: [
                prefixInflection('peny', 's', [], []),
            ],
        },
        'per-': {
            name: 'per-',
            description: 'per- prefix',
            rules: [
                prefixInflection('per', '', [], []),
            ],
        },
        'se-': {
            name: 'se-',
            description: 'one/same prefix se-',
            rules: [
                prefixInflection('se', '', [], []),
            ],
        },
        'tidak-': {
            name: 'tidak-',
            description: 'negation prefix tidak-',
            rules: [
                prefixInflection('tidak', '', [], []),
            ],
        },
        '-kan': {
            name: '-kan',
            description: 'suffix -kan',
            rules: [
                suffixInflection('kan', '', [], []),
            ],
        },
        '-an': {
            name: '-an',
            description: 'suffix -an',
            rules: [
                suffixInflection('an', '', [], []),
            ],
        },
        '-i': {
            name: '-i',
            description: 'suffix -i',
            rules: [
                suffixInflection('i', '', [], []),
            ],
        },
        '-nya': {
            name: '-nya',
            description: 'attached particle -nya',
            rules: [
                suffixInflection('nya', '', [], []),
            ],
        },
        '-ku': {
            name: '-ku',
            description: 'first person possessive suffix -ku',
            rules: [
                suffixInflection('ku', '', [], []),
            ],
        },
        '-mu': {
            name: '-mu',
            description: 'second person possessive suffix -mu',
            rules: [
                suffixInflection('mu', '', [], []),
            ],
        },
        '-lah': {
            name: '-lah',
            description: 'emphatic particle -lah',
            rules: [
                suffixInflection('lah', '', [], []),
            ],
        },
        '-kah': {
            name: '-kah',
            description: 'interrogative particle -kah',
            rules: [
                suffixInflection('kah', '', [], []),
            ],
        },
        '-pun': {
            name: '-pun',
            description: 'also/even particle -pun',
            rules: [
                suffixInflection('pun', '', [], []),
            ],
        },
        '-wan': {
            name: '-wan',
            description: 'male occupation suffix -wan',
            rules: [
                suffixInflection('wan', '', [], []),
            ],
        },
        '-wati': {
            name: '-wati',
            description: 'female occupation suffix -wati',
            rules: [
                suffixInflection('wati', '', [], []),
            ],
        },
        'reduplication': {
            name: 'reduplication',
            description: 'repeated word (e.g. buku-buku)',
            rules: [
                {
                    type: 'other',
                    isInflected: /^(.+)-\1$/,
                    deinflect: (/** @type {string} */ text) => /** @type {string} */ (/^(.+)-\1$/.exec(text)?.[1]),
                    conditionsIn: [],
                    conditionsOut: [],
                },
                {
                    type: 'other',
                    isInflected: /^(.+)\1$/,
                    deinflect: (/** @type {string} */ text) => /** @type {string} */ (/^(.+)\1$/.exec(text)?.[1]),
                    conditionsIn: [],
                    conditionsOut: [],
                },
            ],
        },
    },
};
