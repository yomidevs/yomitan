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

import {arabicTransforms} from '../../ext/js/language/ar/arabic-transforms.js';
import {LanguageTransformer} from '../../ext/js/language/language-transformer.js';
import {testLanguageTransformer} from '../fixtures/language-transformer-test.js';

const tests = [
    {
        category: 'conjunction (and)',
        valid: true,
        tests: [
            {term: 'ذهب', source: 'وذهب', rule: 'pv_d', reasons: ['Pref-Wa']},
            {term: 'ذهب', source: 'فذهب', rule: 'pv_d', reasons: ['Pref-Wa']},
        ],
    },
    {
        category: 'noun prefixes',
        valid: true,
        tests: [
            {term: 'بيت', source: 'ببيت', rule: 'n_d', reasons: ['NPref-Bi']},
            {term: 'بيت', source: 'وببيت', rule: 'n_d', reasons: ['NPref-Bi']},
            {term: 'بيت', source: 'فببيت', rule: 'n_d', reasons: ['NPref-Bi']},

            {term: 'بيت', source: 'كبيت', rule: 'n_d', reasons: ['NPref-Ka']},
            {term: 'بيت', source: 'وكبيت', rule: 'n_d', reasons: ['NPref-Ka']},
            {term: 'بيت', source: 'فكبيت', rule: 'n_d', reasons: ['NPref-Ka']},

            {term: 'بيت', source: 'لبيت', rule: 'n_d', reasons: ['NPref-Li']},
            {term: 'بيت', source: 'ولبيت', rule: 'n_d', reasons: ['NPref-Li']},
            {term: 'بيت', source: 'فلبيت', rule: 'n_d', reasons: ['NPref-Li']},

            {term: 'بيت', source: 'البيت', rule: 'n_d', reasons: ['NPref-Al']},
            {term: 'بيت', source: 'والبيت', rule: 'n_d', reasons: ['NPref-Al']},
            {term: 'بيت', source: 'فالبيت', rule: 'n_d', reasons: ['NPref-Al']},

            {term: 'بيت', source: 'بالبيت', rule: 'n_d', reasons: ['NPref-BiAl']},
            {term: 'بيت', source: 'وبالبيت', rule: 'n_d', reasons: ['NPref-BiAl']},
            {term: 'بيت', source: 'فبالبيت', rule: 'n_d', reasons: ['NPref-BiAl']},

            {term: 'بيت', source: 'كالبيت', rule: 'n_d', reasons: ['NPref-KaAl']},
            {term: 'بيت', source: 'وكالبيت', rule: 'n_d', reasons: ['NPref-KaAl']},
            {term: 'بيت', source: 'فكالبيت', rule: 'n_d', reasons: ['NPref-KaAl']},

            {term: 'بيت', source: 'للبيت', rule: 'n_d', reasons: ['NPref-Lil']},
            {term: 'بيت', source: 'وللبيت', rule: 'n_d', reasons: ['NPref-Lil']},
            {term: 'بيت', source: 'فللبيت', rule: 'n_d', reasons: ['NPref-Lil']},

            {term: 'ليل', source: 'لليل', rule: 'n_d', reasons: ['NPref-LiAl']},
            {term: 'ليل', source: 'ولليل', rule: 'n_d', reasons: ['NPref-LiAl']},
            {term: 'ليل', source: 'فلليل', rule: 'n_d', reasons: ['NPref-LiAl']},
        ],
    },
    {
        category: 'invalid noun prefixes',
        valid: false,
        tests: [{term: 'ليل', source: 'للليل', rule: 'n_d', reasons: ['NPref-Lil']}],
    },
    {
        category: 'invalid chains (noun)',
        valid: false,
        tests: [
            {term: 'بيت', source: 'بوبيت', rule: 'n_d', reasons: ['NPref-Wa', 'NPref-Bi']},
            {term: 'بيت', source: 'كببيت', rule: 'n_d', reasons: ['NPref-Bi', 'NPref-Ka']},
            {term: 'بيت', source: 'كلبيت', rule: 'n_d', reasons: ['NPref-Li', 'NPref-Ka']},
        ],
    },
    {
        category: 'perfect verb result clause particle (would have)',
        valid: true,
        tests: [{term: 'فعل', source: 'لفعل', rule: 'pv_d', reasons: ['PVPref-La']}],
    },
    {
        category: 'regular perfect verb',
        valid: true,
        tests: [
            {term: 'كتب', source: 'كتبت', rule: 'pv_d', reasons: ['PVSuff-t']},
            {term: 'كتب', source: 'كتبتما', rule: 'pv_d', reasons: ['PVSuff-t']},
            {term: 'كتب', source: 'كتبا', rule: 'pv_d', reasons: ['PVSuff-A']},
            {term: 'كتب', source: 'كتبتا', rule: 'pv_d', reasons: ['PVSuff-at']},
            {term: 'كتب', source: 'كتبنا', rule: 'pv_d', reasons: ['PVSuff-n']},
            {term: 'كتب', source: 'كتبتم', rule: 'pv_d', reasons: ['PVSuff-t']},
            {term: 'كتب', source: 'كتبتن', rule: 'pv_d', reasons: ['PVSuff-t']},
            {term: 'كتب', source: 'كتبوا', rule: 'pv_d', reasons: ['PVSuff-uw']},
            {term: 'كتب', source: 'كتبن', rule: 'pv_d', reasons: ['PVSuff-n']},
        ],
    },
    {
        category: 'perfect verb with assimilated ت',
        valid: true,
        tests: [
            {term: 'كبت', source: 'كبتت', rule: 'pv_d', reasons: ['PVSuff-t']},
            {term: 'كبت', source: 'كبتتا', rule: 'pv_d', reasons: ['PVSuff-at']},

            {term: 'كبت', source: 'كبتما', rule: 'pv_d', reasons: ['PVSuff-t']},
            {term: 'كبت', source: 'كبتم', rule: 'pv_d', reasons: ['PVSuff-t']},
            {term: 'كبت', source: 'كبتن', rule: 'pv_d', reasons: ['PVSuff-t']},
        ],
    },
    {
        category: 'perfect verb with assimilated ن',
        valid: true,
        tests: [{term: 'حسن', source: 'حسنا', rule: 'pv_d', reasons: ['PVSuff-n']}],
    },
    {
        category: 'perfect verb with assimilated أ + ا = آ',
        valid: true,
        tests: [{term: 'قرأ', source: 'قرآ', rule: 'pv_d', reasons: ['PVSuff-A']}],
    },
    {
        category: 'attached direct object pronouns',
        valid: true,
        tests: [
            {term: 'علم', source: 'علمني', rule: 'pv_d', reasons: ['PVSuff-ah']},
            {term: 'علم', source: 'علمك', rule: 'pv_d', reasons: ['PVSuff-ah']},
            {term: 'علم', source: 'علمه', rule: 'pv_d', reasons: ['PVSuff-ah']},
            {term: 'علم', source: 'علمها', rule: 'pv_d', reasons: ['PVSuff-ah']},
            {term: 'علم', source: 'علمكما', rule: 'pv_d', reasons: ['PVSuff-ah']},
            {term: 'علم', source: 'علمهما', rule: 'pv_d', reasons: ['PVSuff-ah']},
            {term: 'علم', source: 'علمنا', rule: 'pv_d', reasons: ['PVSuff-ah']},
            {term: 'علم', source: 'علمكم', rule: 'pv_d', reasons: ['PVSuff-ah']},
            {term: 'علم', source: 'علمكن', rule: 'pv_d', reasons: ['PVSuff-ah']},
            {term: 'علم', source: 'علمهم', rule: 'pv_d', reasons: ['PVSuff-ah']},
            {term: 'علم', source: 'علمهن', rule: 'pv_d', reasons: ['PVSuff-ah']},

            {term: 'علم', source: 'علمتني', rule: 'pv_d', reasons: ['PVSuff-t']},
            {term: 'علم', source: 'علمتك', rule: 'pv_d', reasons: ['PVSuff-t']},
            {term: 'علم', source: 'علمته', rule: 'pv_d', reasons: ['PVSuff-t']},
            {term: 'علم', source: 'علمتها', rule: 'pv_d', reasons: ['PVSuff-t']},
            {term: 'علم', source: 'علمتكما', rule: 'pv_d', reasons: ['PVSuff-t']},
            {term: 'علم', source: 'علمتهما', rule: 'pv_d', reasons: ['PVSuff-t']},
            {term: 'علم', source: 'علمتنا', rule: 'pv_d', reasons: ['PVSuff-t']},
            {term: 'علم', source: 'علمتكم', rule: 'pv_d', reasons: ['PVSuff-t']},
            {term: 'علم', source: 'علمتكن', rule: 'pv_d', reasons: ['PVSuff-t']},
            {term: 'علم', source: 'علمتهم', rule: 'pv_d', reasons: ['PVSuff-t']},
            {term: 'علم', source: 'علمتهن', rule: 'pv_d', reasons: ['PVSuff-t']},

            {term: 'علم', source: 'علمتموه', rule: 'pv_d', reasons: ['PVSuff-t']},
            {term: 'علم', source: 'علموه', rule: 'pv_d', reasons: ['PVSuff-uw']},
        ],
    },
    {
        category: 'invalid attached direct object pronouns',
        valid: false,
        tests: [
            {term: 'علم', source: 'علمناني', rule: 'pv_d', reasons: null},
            {term: 'علم', source: 'علمنانا', rule: 'pv_d', reasons: null},

            {term: 'علم', source: 'علمتموك', rule: 'pv_d', reasons: null},
            {term: 'علم', source: 'علمتموكما', rule: 'pv_d', reasons: null},
            {term: 'علم', source: 'علمتموكم', rule: 'pv_d', reasons: null},
            {term: 'علم', source: 'علمتموكن', rule: 'pv_d', reasons: null},

            {term: 'علم', source: 'علمتماك', rule: 'pv_d', reasons: null},
            {term: 'علم', source: 'علمتماكما', rule: 'pv_d', reasons: null},
            {term: 'علم', source: 'علمتماكم', rule: 'pv_d', reasons: null},
            {term: 'علم', source: 'علمتماكن', rule: 'pv_d', reasons: null},

            {term: 'علم', source: 'علمتنك', rule: 'pv_d', reasons: null},
            {term: 'علم', source: 'علمتنكما', rule: 'pv_d', reasons: null},
            {term: 'علم', source: 'علمتنكم', rule: 'pv_d', reasons: null},
            {term: 'علم', source: 'علمتنكن', rule: 'pv_d', reasons: null},
        ],
    },
    {
        category: 'invalid chains (verb)',
        valid: false,
        tests: [
            {term: 'سمع', source: 'ووسمع', rule: 'pv_d', reasons: ['Pref-Wa', 'Pref-Wa']},
            {term: 'سمع', source: 'فوسمع', rule: 'pv_d', reasons: ['Pref-Wa', 'Pref-Wa']},
            {term: 'سمع', source: 'وفسمع', rule: 'pv_d', reasons: ['Pref-Wa', 'Pref-Wa']},

            {term: 'سمع', source: 'سمعتت', rule: 'pv_d', reasons: ['PVSuff-t', 'PVSuff-t']},
            {term: 'سمع', source: 'سمعتتم', rule: 'pv_d', reasons: ['PVSuff-t', 'PVSuff-t']},
            {term: 'سمع', source: 'سمعتمن', rule: 'pv_d', reasons: ['PVSuff-t', 'PVSuff-n']},
            {term: 'سمع', source: 'سمعنتم', rule: 'pv_d', reasons: ['PVSuff-n', 'PVSuff-t']},
        ],
    },
];

const languageTransformer = new LanguageTransformer();
languageTransformer.addDescriptor(arabicTransforms);
testLanguageTransformer(languageTransformer, tests);
