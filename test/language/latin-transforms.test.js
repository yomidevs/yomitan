/*
 * Copyright (C) 2023-2025  Yomitan Authors
 * Copyright (C) 2020-2022  Yomichan Authors
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

import {latinTransforms} from '../../ext/js/language/la/latin-transforms.js';
import {LanguageTransformer} from '../../ext/js/language/language-transformer.js';
import {testLanguageTransformer} from '../fixtures/language-transformer-test.js';

/* eslint-disable @stylistic/no-multi-spaces */
const tests = [
    {
        category: 'plural',
        valid: true,
        tests: [
            {term: 'fluvius',   source: 'fluvii',    rule: 'n',   reasons: ['plural']},
            {term: 'magnus',    source: 'magni',     rule: 'adj', reasons: ['plural']},
            {term: 'insula',    source: 'insulae',   rule: 'n',   reasons: ['plural']},
        ],
    },
    {
        category: 'adjective',
        valid: true,
        tests: [
            {term: 'magnus',    source: 'magna',    rule: 'adj',  reasons: ['feminine']},
            {term: 'Graecus',   source: 'Graecum',  rule: 'adj',  reasons: ['neuter']},
            {term: 'primus',    source: 'prima',    rule: 'adj',  reasons: ['neuter', 'plural']},
        ],
    },
    {
        category: 'ablative',
        valid: true,
        tests: [
            {term: 'vocabulum', source: 'vocabulo', rule: 'n',    reasons: ['ablative']},
        ],
    },
];
/* eslint-enable @stylistic/no-multi-spaces */

const languageTransformer = new LanguageTransformer();
languageTransformer.addDescriptor(latinTransforms);

testLanguageTransformer(languageTransformer, tests);
