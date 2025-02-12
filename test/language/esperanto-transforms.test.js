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

import {esperantoTransforms} from '../../ext/js/language/eo/esperanto-transforms.js';
import {LanguageTransformer} from '../../ext/js/language/language-transformer.js';
import {testLanguageTransformer} from '../fixtures/language-transformer-test.js';

/* eslint-disable @stylistic/no-multi-spaces */
const tests = [
    {
        category: 'general',
        valid: true,
        tests: [
            {term: 'amiko', source: 'amikon',  rule: 'n', reasons: ['accusative']},
            {term: 'amiko', source: 'amikoj',  rule: 'n', reasons: ['plural']},
            {term: 'amiko', source: 'amiketo',  rule: 'n', reasons: ['diminutive']},
            {term: 'kie', source: 'kien',  rule: 'adv', reasons: ['directional']},
            {term: 'surpinto', source: 'surpinte',  rule: 'n', reasons: ['locational']},
            {term: 'amiko', source: 'amika',  rule: 'n', reasons: ['adjectival']},
            {term: 'amika', source: 'amike',  rule: 'adj', reasons: ['adverbial (adj -> adv)']},
            {term: 'amiki', source: 'amike',  rule: 'v', reasons: ['adverbial (v -> adv)']},
        ],
    },
    {
        category: 'suffixes',
        valid: true,
        tests: [
            {term: 'kafo', source: 'kafejo',  rule: 'n', reasons: ['-ejo (noun)']},
            {term: 'kuiri', source: 'kuirejo',  rule: 'v', reasons: ['-ejo (verb)']},
            {term: 'abelo', source: 'abelujo',  rule: 'n', reasons: ['-ujo (noun)']},
            {term: 'frida', source: 'fridujo',  rule: 'adj', reasons: ['-ujo (adjective)']},
            {term: 'lavi', source: 'lavujo',  rule: 'v', reasons: ['-ujo (verb)']},
            {term: 'kompreni', source: 'komprenebla',  rule: 'v', reasons: ['-ebla']},
            {term: 'vivi', source: 'vivado',  rule: 'v', reasons: ['-ado']},
        ],
    },
    {
        category: 'prefixes',
        valid: true,
        tests: [
            {term: 'bona', source: 'malbona',  rule: 'adj', reasons: ['mal-']},
            {term: 'labori', source: 'kunlabori',  rule: 'v', reasons: ['kun-']},
            {term: 'dome', source: 'eksterdome',  rule: 'adv', reasons: ['ekster-']},
            {term: 'lerni', source: 'eklerni',  rule: 'v', reasons: ['ek-']},
            {term: 'vekita', source: 'ĵusvekita',  rule: 'adj', reasons: ['ĵus-']},
            {term: 'iri', source: 'eliri',  rule: 'v', reasons: ['el-']},
            {term: 'fali', source: 'disfali',  rule: 'v', reasons: ['dis-']},
            {term: 'flugi', source: 'forflugi',  rule: 'v', reasons: ['for-']},
            {term: 'paroli', source: 'misparoli',  rule: 'v', reasons: ['mis-']},
        ],
    },
];
/* eslint-enable @stylistic/no-multi-spaces */

const languageTransformer = new LanguageTransformer();
languageTransformer.addDescriptor(esperantoTransforms);
testLanguageTransformer(languageTransformer, tests);
