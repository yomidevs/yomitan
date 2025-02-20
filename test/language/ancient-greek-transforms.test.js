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

import {ancientGreekTransforms} from '../../ext/js/language/grc/ancient-greek-transforms.js';
import {LanguageTransformer} from '../../ext/js/language/language-transformer.js';
import {testLanguageTransformer} from '../fixtures/language-transformer-test.js';

/* eslint-disable @stylistic/no-multi-spaces */
const tests = [
    {
        category: 'verbs',
        valid: true,
        tests: [
            {term: 'λύω',   source: 'λύει',    rule: 'v',   reasons: ['3rd person singular present active indicative']},
            {term: 'φιλεω', source: 'φιλει',   rule: 'v',   reasons: ['3rd person singular present active indicative']},
            {term: 'γεωργεω', source: 'γεωργος', rule: 'v',   reasons: ['nominalization']},
        ],
    },
    {
        category: 'nouns',
        valid: true,
        tests: [
            {term: 'ανθρωπος', source: 'ανθρωπον', rule: 'n', reasons: ['accusative singular']},
            {term: 'ανθρωπος', source: 'ανθρωπου', rule: 'n', reasons: ['genitive singular']},
            {term: 'ανθρωπος', source: 'ανθρωπε', rule: 'n', reasons: ['vocative singular']},
            {term: 'ανθρωπος', source: 'ανθρωπω', rule: 'n', reasons: ['dative singular']},
            {term: 'ανθρωπος', source: 'ανθρωποι', rule: 'n', reasons: ['nominative plural']},
            {term: 'ανθρωπος', source: 'ανθρωποις', rule: 'n', reasons: ['dative plural']},
            {term: 'ανθρωπος', source: 'ανθρωπους', rule: 'n', reasons: ['accusative plural']},
            {term: 'ανθρωπος', source: 'ανθρωπων', rule: 'n', reasons: ['genitive plural']},
            {term: 'ανθρωπος', source: 'ανθρωποι', rule: 'n', reasons: ['vocative plural']},
        ],
    },
    {
        category: 'adjectives',
        valid: true,
        tests: [
            {term: 'καλος', source: 'καλον', rule: 'adj', reasons: ['accusative singular masculine']},
        ],
    },
];
/* eslint-enable @stylistic/no-multi-spaces */

const languageTransformer = new LanguageTransformer();
languageTransformer.addDescriptor(ancientGreekTransforms);

testLanguageTransformer(languageTransformer, tests);
