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

const conditions = {
    v: {
        name: 'Verb',
        isDictionaryForm: true,
    },
    n: {
        name: 'Noun',
        isDictionaryForm: true,
    },
    adj: {
        name: 'Adjective',
        isDictionaryForm: true,
    },
};

/** @type {import('language-transformer').LanguageTransformDescriptor<keyof typeof conditions>} */
export const ancientGreekTransforms = {
    language: 'grc',
    conditions,
    transforms: {
        // inflections
        // verbs
        '3rd person singular present active indicative': {
            name: '3rd person singular present active indicative',
            rules: [
                suffixInflection('ει', 'ω', [], ['v']),
                suffixInflection('ει', 'εω', [], ['v']),
            ],
        },
        // nouns
        'genitive singular': {
            name: 'genitive singular',
            rules: [
                suffixInflection('ου', 'ος', [], ['n']),
                suffixInflection('ας', 'α', [], ['n']),
                suffixInflection('ου', 'ας', [], ['n']),
                suffixInflection('ου', 'ον', [], ['n']),
            ],
        },
        'dative singular': {
            name: 'dative singular',
            rules: [
                suffixInflection('ω', 'ος', [], ['n']),
                suffixInflection('α', 'ας', [], ['n']),
                suffixInflection('ω', 'ον', [], ['n']),
            ],
        },
        'accusative singular': {
            name: 'accusative singular',
            rules: [
                suffixInflection('ον', 'ος', [], ['n']),
                suffixInflection('αν', 'α', [], ['n']),
                suffixInflection('αν', 'ας', [], ['n']),
            ],
        },
        'vocative singular': {
            name: 'vocative singular',
            rules: [
                suffixInflection('ε', 'ος', [], ['n']),
                suffixInflection('α', 'ας', [], ['n']),
            ],
        },
        'nominative plural': {
            name: 'nominative plural',
            rules: [
                suffixInflection('οι', 'ος', [], ['n']),
                suffixInflection('αι', 'α', [], ['n']),
                suffixInflection('αι', 'ας', [], ['n']),
                suffixInflection('α', 'ον', [], ['n']),
            ],
        },
        'genitive plural': {
            name: 'genitive plural',
            rules: [
                suffixInflection('ων', 'ος', [], ['n']),
                suffixInflection('ων', 'α', [], ['n']),
                suffixInflection('ων', 'ας', [], ['n']),
                suffixInflection('ων', 'ον', [], ['n']),
            ],
        },
        'dative plural': {
            name: 'dative plural',
            rules: [
                suffixInflection('οις', 'ος', [], ['n']),
                suffixInflection('αις', 'α', [], ['n']),
                suffixInflection('αις', 'ας', [], ['n']),
                suffixInflection('οις', 'ον', [], ['n']),
            ],
        },
        'accusative plural': {
            name: 'accusative plural',
            rules: [
                suffixInflection('ους', 'ος', [], ['n']),
                suffixInflection('ας', 'α', [], ['n']),
                suffixInflection('α', 'ον', [], ['n']),
            ],
        },
        'vocative plural': {
            name: 'vocative plural',
            rules: [
                suffixInflection('οι', 'ος', [], ['n']),
                suffixInflection('αι', 'α', [], ['n']),
                suffixInflection('αι', 'ας', [], ['n']),
                suffixInflection('α', 'ον', [], ['n']),
            ],
        },
        // adjectives
        'accusative singular masculine': {
            name: 'accusative singular masculine',
            rules: [
                suffixInflection('ον', 'ος', [], ['adj']),
            ],
        },
        // word formation
        'nominalization': {
            name: 'nominalization',
            rules: [
                suffixInflection('ος', 'εω', [], ['v']),
            ],
        },
    },
};
