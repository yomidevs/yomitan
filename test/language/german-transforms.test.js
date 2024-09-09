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

import {germanTransforms} from '../../ext/js/language/de/german-transforms.js';
import {LanguageTransformer} from '../../ext/js/language/language-transformer.js';
import {testLanguageTransformer} from '../fixtures/language-transformer-test.js';

/* eslint-disable @stylistic/no-multi-spaces */
const tests = [
    {
        category: 'nominalization',
        tests: [
            {reasons: ['nominalization'],   rule: 'v',    source: 'reinigung',   term: 'reinigen'},
            {reasons: ['nominalization'],    rule: 'v',    source: 'säuberung',   term: 'säubern'},
            {reasons: ['nominalization'], rule: 'v',  source: 'entwicklung',   term: 'entwickeln'},
        ],
        valid: true,
    },
    {
        category: '-bar',
        tests: [
            {reasons: ['-bar'],     rule: 'v',       source: 'essbar',   term: 'essen'},
            {reasons: ['-bar'],   rule: 'v',    source: 'lieferbar',   term: 'liefern'},
        ],
        valid: true,
    },
    {
        category: 'negative',
        tests: [
            {reasons: ['negative'],    rule: 'adj',    source: 'unmöglich',   term: 'möglich'},
        ],
        valid: true,
    },
    {
        category: 'past participle',
        tests: [
            {reasons: ['past participle'],  rule: 'v',   source: 'geschnitzt',   term: 'schnitzen'},
            {reasons: ['past participle'],  rule: 'v',  source: 'gescheitert',   term: 'scheitern'},

            {reasons: ['past participle'], rule: 'v',  source: 'dargestellt',   term: 'darstellen'},
        ],
        valid: true,
    },
    {
        category: 'separated prefix',
        tests: [
            {reasons: ['separated prefix'], rule: 'v', source: 'räum den Tisch auf',   term: 'räum auf'},
        ],
        valid: true,
    },
    {
        category: 'zu-infinitive',
        tests: [
            {reasons: ['zu-infinitive'], rule: 'v', source: 'aufzuräumen',   term: 'aufräumen'},
        ],
        valid: true,
    },
    {
        category: '-heit',
        tests: [
            {reasons: ['-heit'], rule: 'adj', source: 'wahrheit', term: 'wahr'},
            {reasons: ['-heit'], rule: 'n', source: 'Kindheit', term: 'Kind'},
            {reasons: ['-bar', '-heit'], rule: 'v', source: 'anwendbarkeit', term: 'anwenden'},
        ],
        valid: true,
    },
];
/* eslint-enable @stylistic/no-multi-spaces */

const languageTransformer = new LanguageTransformer();
languageTransformer.addDescriptor(germanTransforms);

testLanguageTransformer(languageTransformer, tests);
