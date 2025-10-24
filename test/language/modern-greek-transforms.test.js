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

import {modernGreekTransforms} from '../../ext/js/language/el/modern-greek-transforms.js';
import {LanguageTransformer} from '../../ext/js/language/language-transformer.js';
import {testLanguageTransformer} from '../fixtures/language-transformer-test.js';

const tests = [
    {
        category: 'ξανα-',
        valid: true,
        tests: [
            {term: 'ρώτησε', source: 'ξαναρώτησε', rule: 'v', reasons: ['ξανα-']},
            {term: 'ανθίζω', source: 'ξανανθίζω',  rule: 'v', reasons: ['ξανα-']},
            {term: 'έβαλε', source: 'ξανάβαλε', rule: 'v', reasons: ['ξανα-']},
            {term: 'άρχισε', source: 'ξανάρχισε', rule: 'v', reasons: ['ξανα-']},
            {term: 'είπα', source: 'ξανάπα', rule: 'v', reasons: ['ξανα-']},
            {term: 'πας', source: 'ξαναπάς', rule: 'v', reasons: ['ξανα-']},
            {term: 'λες', source: 'ξαναλές', rule: 'v', reasons: ['ξανα-']},
        ],
    },
];

const languageTransformer = new LanguageTransformer();
languageTransformer.addDescriptor(modernGreekTransforms);
testLanguageTransformer(languageTransformer, tests);
