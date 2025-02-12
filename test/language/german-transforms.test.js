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

import {germanTransforms} from '../../ext/js/language/de/german-transforms.js';
import {LanguageTransformer} from '../../ext/js/language/language-transformer.js';
import {testLanguageTransformer} from '../fixtures/language-transformer-test.js';

/* eslint-disable @stylistic/no-multi-spaces */
const tests = [
    {
        category: 'nominalization',
        valid: true,
        tests: [
            {term: 'reinigen',   source: 'reinigung',    rule: 'v',   reasons: ['nominalization']},
            {term: 'säubern',    source: 'säuberung',    rule: 'v',   reasons: ['nominalization']},
            {term: 'entwickeln', source: 'entwicklung',  rule: 'v',   reasons: ['nominalization']},
        ],
    },
    {
        category: '-bar',
        valid: true,
        tests: [
            {term: 'essen',     source: 'essbar',       rule: 'v',   reasons: ['-bar']},
            {term: 'liefern',   source: 'lieferbar',    rule: 'v',   reasons: ['-bar']},
        ],
    },
    {
        category: 'negative',
        valid: true,
        tests: [
            {term: 'möglich',    source: 'unmöglich',    rule: 'adj',   reasons: ['negative']},
        ],
    },
    {
        category: 'past participle',
        valid: true,
        tests: [
            {term: 'schnitzen',  source: 'geschnitzt',   rule: 'v',   reasons: ['past participle']},
            {term: 'scheitern',  source: 'gescheitert',  rule: 'v',   reasons: ['past participle']},

            {term: 'darstellen', source: 'dargestellt',  rule: 'v',   reasons: ['past participle']},
        ],
    },
    {
        category: 'separated prefix',
        valid: true,
        tests: [
            {term: 'räum auf', source: 'räum den Tisch auf', rule: 'v',   reasons: ['separated prefix']},
        ],
    },
    {
        category: 'zu-infinitive',
        valid: true,
        tests: [
            {term: 'aufräumen', source: 'aufzuräumen', rule: 'v',   reasons: ['zu-infinitive']},
        ],
    },
    {
        category: '-heit',
        valid: true,
        tests: [
            {term: 'wahr', source: 'wahrheit', rule: 'adj', reasons: ['-heit']},
            {term: 'Kind', source: 'Kindheit', rule: 'n', reasons: ['-heit']},
            {term: 'anwenden', source: 'anwendbarkeit', rule: 'v', reasons: ['-bar', '-heit']},
        ],
    },
];
/* eslint-enable @stylistic/no-multi-spaces */

const languageTransformer = new LanguageTransformer();
languageTransformer.addDescriptor(germanTransforms);

testLanguageTransformer(languageTransformer, tests);
