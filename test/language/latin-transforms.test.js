/*
 * Copyright (C) 2023-2024  Yomitan Authors
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
        tests: [
            {reasons: ['plural'],   rule: 'n',    source: 'fluvii',   term: 'fluvius'},
            {reasons: ['plural'],    rule: 'adj',     source: 'magni', term: 'magnus'},
            {reasons: ['plural'],    rule: 'n',   source: 'insulae',   term: 'insula'},
        ],
        valid: true,
    },
    {
        category: 'adjective',
        tests: [
            {reasons: ['feminine'],    rule: 'adj',    source: 'magna',  term: 'magnus'},
            {reasons: ['neuter'],   rule: 'adj',  source: 'Graecum',  term: 'Graecus'},
            {reasons: ['neuter', 'plural'],    rule: 'adj',    source: 'prima',  term: 'primus'},
        ],
        valid: true,
    },
    {
        category: 'ablative',
        tests: [
            {reasons: ['ablative'], rule: 'n', source: 'vocabulo',    term: 'vocabulum'},
        ],
        valid: true,
    },
];
/* eslint-enable @stylistic/no-multi-spaces */

const languageTransformer = new LanguageTransformer();
languageTransformer.addDescriptor(latinTransforms);

testLanguageTransformer(languageTransformer, tests);
