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
        // verbs - active voice
        '2nd person singular present active indicative': {
            name: '2nd person singular present active indicative',
            rules: [
                suffixInflection('εις', 'ω', [], ['v']),
                suffixInflection('εις', 'εω', [], ['v']),
            ],
        },
        '3rd person singular present active indicative': {
            name: '3rd person singular present active indicative',
            rules: [
                suffixInflection('ει', 'ω', [], ['v']),
                suffixInflection('ει', 'εω', [], ['v']),
            ],
        },
        '1st person plural present active indicative': {
            name: '1st person plural present active indicative',
            rules: [
                suffixInflection('ομεν', 'ω', [], ['v']),
            ],
        },
        '2nd person plural present active indicative': {
            name: '2nd person plural present active indicative',
            rules: [
                suffixInflection('ετε', 'ω', [], ['v']),
            ],
        },
        '3rd person plural present active indicative': {
            name: '3rd person plural present active indicative',
            rules: [
                suffixInflection('ουσι', 'ω', [], ['v']),
                suffixInflection('ουσιν', 'ω', [], ['v']),
            ],
        },
        // verbs - middle voice
        '2nd person singular present middle indicative': {
            name: '2nd person singular present middle indicative',
            rules: [
                suffixInflection('ῃ', 'ομαι', [], ['v']),
                suffixInflection('ει', 'ομαι', [], ['v']),
            ],
        },
        '3rd person singular present middle indicative': {
            name: '3rd person singular present middle indicative',
            rules: [
                suffixInflection('εται', 'ομαι', [], ['v']),
            ],
        },
        '1st person plural present middle indicative': {
            name: '1st person plural present middle indicative',
            rules: [
                suffixInflection('ομεθα', 'ομαι', [], ['v']),
            ],
        },
        '2nd person plural present middle indicative': {
            name: '2nd person plural present middle indicative',
            rules: [
                suffixInflection('εσθε', 'ομαι', [], ['v']),
            ],
        },
        '3rd person plural present middle indicative': {
            name: '3rd person plural present middle indicative',
            rules: [
                suffixInflection('ονται', 'ομαι', [], ['v']),
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
                suffixInflection('ης', 'η', [], ['n']),
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
                suffixInflection('ην', 'η', [], ['n']),
            ],
        },
        'vocative singular': {
            name: 'vocative singular',
            rules: [
                suffixInflection('ε', 'ος', [], ['n']),
                suffixInflection('α', 'ας', [], ['n']),
                suffixInflection('η', 'η', [], ['n']),
            ],
        },
        'nominative plural': {
            name: 'nominative plural',
            rules: [
                suffixInflection('οι', 'ος', [], ['n']),
                suffixInflection('αι', 'α', [], ['n']),
                suffixInflection('αι', 'ας', [], ['n']),
                suffixInflection('α', 'ον', [], ['n']),
                suffixInflection('αι', 'η', [], ['n']),
            ],
        },
        'genitive plural': {
            name: 'genitive plural',
            rules: [
                suffixInflection('ων', 'ος', [], ['n']),
                suffixInflection('ων', 'α', [], ['n']),
                suffixInflection('ων', 'ας', [], ['n']),
                suffixInflection('ων', 'ον', [], ['n']),
                suffixInflection('ων', 'η', [], ['n']),
            ],
        },
        'dative plural': {
            name: 'dative plural',
            rules: [
                suffixInflection('οις', 'ος', [], ['n']),
                suffixInflection('αις', 'α', [], ['n']),
                suffixInflection('αις', 'ας', [], ['n']),
                suffixInflection('οις', 'ον', [], ['n']),
                suffixInflection('αις', 'η', [], ['n']),
            ],
        },
        'accusative plural': {
            name: 'accusative plural',
            rules: [
                suffixInflection('ους', 'ος', [], ['n']),
                suffixInflection('ας', 'α', [], ['n']),
                suffixInflection('α', 'ον', [], ['n']),
                suffixInflection('ας', 'η', [], ['n']),
            ],
        },
        'vocative plural': {
            name: 'vocative plural',
            rules: [
                suffixInflection('οι', 'ος', [], ['n']),
                suffixInflection('αι', 'α', [], ['n']),
                suffixInflection('αι', 'ας', [], ['n']),
                suffixInflection('α', 'ον', [], ['n']),
                suffixInflection('αι', 'η', [], ['n']),
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
