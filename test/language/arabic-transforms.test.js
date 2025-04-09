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

import {arabicTransforms} from '../../ext/js/language/ar/arabic-transforms.js';
import {LanguageTransformer} from '../../ext/js/language/language-transformer.js';
import {testLanguageTransformer} from '../fixtures/language-transformer-test.js';

const tests = [
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
        category: 'perfect verb conjunction (and)',
        valid: true,
        tests: [
            {term: 'ذهب', source: 'وذهب', rule: 'pv', reasons: ['PVPref-Wa']},
            {term: 'ذهب', source: 'فذهب', rule: 'pv', reasons: ['PVPref-Wa']},
        ],
    },
    {
        category: 'perfect verb result clause particle (would have)',
        valid: true,
        tests: [{term: 'فعل', source: 'لفعل', rule: 'pv', reasons: ['PVPref-La']}],
    },
    {
        category: 'regular perfect verb',
        valid: true,
        tests: [
            {term: 'كتب', source: 'كتبت', rule: 'pv', reasons: ['PVSuff-t']},
            {term: 'كتب', source: 'كتبتما', rule: 'pv', reasons: ['PVSuff-t']},
            {term: 'كتب', source: 'كتبا', rule: 'pv', reasons: ['PVSuff-A']},
            {term: 'كتب', source: 'كتبتا', rule: 'pv', reasons: ['PVSuff-at']},
            {term: 'كتب', source: 'كتبنا', rule: 'pv', reasons: ['PVSuff-n']},
            {term: 'كتب', source: 'كتبتم', rule: 'pv', reasons: ['PVSuff-t']},
            {term: 'كتب', source: 'كتبتن', rule: 'pv', reasons: ['PVSuff-t']},
            {term: 'كتب', source: 'كتبوا', rule: 'pv', reasons: ['PVSuff-uw']},
            {term: 'كتب', source: 'كتبن', rule: 'pv', reasons: ['PVSuff-n']},
        ],
    },
    {
        category: 'perfect verb with assimilated ت',
        valid: true,
        tests: [
            {term: 'كبت', source: 'كبتت', rule: 'pv', reasons: ['PVSuff-t']},
            {term: 'كبت', source: 'كبتتا', rule: 'pv', reasons: ['PVSuff-at']},

            {term: 'كبت', source: 'كبتما', rule: 'pv', reasons: ['PVSuff-t']},
            {term: 'كبت', source: 'كبتم', rule: 'pv', reasons: ['PVSuff-t']},
            {term: 'كبت', source: 'كبتن', rule: 'pv', reasons: ['PVSuff-t']},
        ],
    },
    {
        category: 'perfect verb with assimilated ن',
        valid: true,
        tests: [{term: 'حسن', source: 'حسنا', rule: 'pv', reasons: ['PVSuff-n']}],
    },
    {
        category: 'perfect verb with assimilated أ + ا = آ',
        valid: true,
        tests: [{term: 'قرأ', source: 'قرآ', rule: 'pv', reasons: ['PVSuff-A']}],
    },
    {
        category: 'perfect verb attached direct object pronouns',
        valid: true,
        tests: [
            {term: 'علم', source: 'علمني', rule: 'pv', reasons: ['PVSuff-ah']},
            {term: 'علم', source: 'علمنا', rule: 'pv', reasons: ['PVSuff-ah']},
            {term: 'علم', source: 'علمك', rule: 'pv', reasons: ['PVSuff-ah']},
            {term: 'علم', source: 'علمكما', rule: 'pv', reasons: ['PVSuff-ah']},
            {term: 'علم', source: 'علمكم', rule: 'pv', reasons: ['PVSuff-ah']},
            {term: 'علم', source: 'علمكن', rule: 'pv', reasons: ['PVSuff-ah']},
            {term: 'علم', source: 'علمه', rule: 'pv', reasons: ['PVSuff-ah']},
            {term: 'علم', source: 'علمها', rule: 'pv', reasons: ['PVSuff-ah']},
            {term: 'علم', source: 'علمهما', rule: 'pv', reasons: ['PVSuff-ah']},
            {term: 'علم', source: 'علمهم', rule: 'pv', reasons: ['PVSuff-ah']},
            {term: 'علم', source: 'علمهن', rule: 'pv', reasons: ['PVSuff-ah']},

            {term: 'علم', source: 'علمتني', rule: 'pv', reasons: ['PVSuff-t']},
            {term: 'علم', source: 'علمتنا', rule: 'pv', reasons: ['PVSuff-t']},
            {term: 'علم', source: 'علمتك', rule: 'pv', reasons: ['PVSuff-t']},
            {term: 'علم', source: 'علمتكما', rule: 'pv', reasons: ['PVSuff-t']},
            {term: 'علم', source: 'علمتكم', rule: 'pv', reasons: ['PVSuff-t']},
            {term: 'علم', source: 'علمتكن', rule: 'pv', reasons: ['PVSuff-t']},
            {term: 'علم', source: 'علمته', rule: 'pv', reasons: ['PVSuff-t']},
            {term: 'علم', source: 'علمتها', rule: 'pv', reasons: ['PVSuff-t']},
            {term: 'علم', source: 'علمتهما', rule: 'pv', reasons: ['PVSuff-t']},
            {term: 'علم', source: 'علمتهم', rule: 'pv', reasons: ['PVSuff-t']},
            {term: 'علم', source: 'علمتهن', rule: 'pv', reasons: ['PVSuff-t']},

            {term: 'علم', source: 'علمتموه', rule: 'pv', reasons: ['PVSuff-t']},
            {term: 'علم', source: 'علموه', rule: 'pv', reasons: ['PVSuff-uw']},
        ],
    },
    {
        category: 'perfect verb invalid attached direct object pronouns',
        valid: false,
        tests: [
            {term: 'علم', source: 'علمناني', rule: 'pv', reasons: null},
            {term: 'علم', source: 'علمنانا', rule: 'pv', reasons: null},

            {term: 'علم', source: 'علمتموك', rule: 'pv', reasons: null},
            {term: 'علم', source: 'علمتموكما', rule: 'pv', reasons: null},
            {term: 'علم', source: 'علمتموكم', rule: 'pv', reasons: null},
            {term: 'علم', source: 'علمتموكن', rule: 'pv', reasons: null},

            {term: 'علم', source: 'علمتماك', rule: 'pv', reasons: null},
            {term: 'علم', source: 'علمتماكما', rule: 'pv', reasons: null},
            {term: 'علم', source: 'علمتماكم', rule: 'pv', reasons: null},
            {term: 'علم', source: 'علمتماكن', rule: 'pv', reasons: null},

            {term: 'علم', source: 'علمتنك', rule: 'pv', reasons: null},
            {term: 'علم', source: 'علمتنكما', rule: 'pv', reasons: null},
            {term: 'علم', source: 'علمتنكم', rule: 'pv', reasons: null},
            {term: 'علم', source: 'علمتنكن', rule: 'pv', reasons: null},
        ],
    },
    {
        category: 'perfect verb invalid chains',
        valid: false,
        tests: [
            {term: 'سمع', source: 'ووسمع', rule: 'pv', reasons: ['Pref-Wa', 'Pref-Wa']},
            {term: 'سمع', source: 'فوسمع', rule: 'pv', reasons: ['Pref-Wa', 'Pref-Wa']},
            {term: 'سمع', source: 'وفسمع', rule: 'pv', reasons: ['Pref-Wa', 'Pref-Wa']},

            {term: 'سمع', source: 'سمعتت', rule: 'pv', reasons: ['PVSuff-t', 'PVSuff-t']},
            {term: 'سمع', source: 'سمعتتم', rule: 'pv', reasons: ['PVSuff-t', 'PVSuff-t']},
            {term: 'سمع', source: 'سمعتمن', rule: 'pv', reasons: ['PVSuff-t', 'PVSuff-n']},
            {term: 'سمع', source: 'سمعنتم', rule: 'pv', reasons: ['PVSuff-n', 'PVSuff-t']},
        ],
    },
    {
        category: 'regular imperfect verb',
        valid: true,
        tests: [
            // indicative
            {term: 'جلس', source: 'أجلس', rule: 'iv', reasons: ['IVPref-AnA']},
            {term: 'جلس', source: 'تجلس', rule: 'iv', reasons: ['IVPref-Anta']},
            {term: 'جلس', source: 'تجلسين', rule: 'iv', reasons: ['IVPref-Anti']},
            {term: 'جلس', source: 'يجلس', rule: 'iv', reasons: ['IVPref-hw']},
            {term: 'جلس', source: 'تجلس', rule: 'iv', reasons: ['IVPref-hy']},
            {term: 'جلس', source: 'تجلسان', rule: 'iv', reasons: ['IVPref-AntmA']},
            {term: 'جلس', source: 'يجلسان', rule: 'iv', reasons: ['IVPref-hmA']},
            {term: 'جلس', source: 'تجلسان', rule: 'iv', reasons: ['IVPref-hmA-ta']},
            {term: 'جلس', source: 'نجلس', rule: 'iv', reasons: ['IVPref-nHn']},
            {term: 'جلس', source: 'تجلسون', rule: 'iv', reasons: ['IVPref-Antm']},
            {term: 'جلس', source: 'تجلسن', rule: 'iv', reasons: ['IVPref-Antn']},
            {term: 'جلس', source: 'يجلسون', rule: 'iv', reasons: ['IVPref-hm']},
            {term: 'جلس', source: 'يجلسن', rule: 'iv', reasons: ['IVPref-hn']},

            // subjunctive
            {term: 'جلس', source: 'تجلسي', rule: 'iv', reasons: ['IVPref-Anti']},
            {term: 'جلس', source: 'تجلسا', rule: 'iv', reasons: ['IVPref-AntmA']},
            {term: 'جلس', source: 'يجلسا', rule: 'iv', reasons: ['IVPref-hmA']},
            {term: 'جلس', source: 'تجلسا', rule: 'iv', reasons: ['IVPref-hmA-ta']},
            {term: 'جلس', source: 'تجلسوا', rule: 'iv', reasons: ['IVPref-Antm']},
            {term: 'جلس', source: 'يجلسوا', rule: 'iv', reasons: ['IVPref-hm']},
        ],
    },
    {
        category: 'imperfect verb prefix chains',
        valid: true,
        tests: [
            {term: 'جلس', source: 'ويجلس', rule: 'iv', reasons: ['IVPref-hw']},
            {term: 'جلس', source: 'فيجلس', rule: 'iv', reasons: ['IVPref-hw']},
            {term: 'جلس', source: 'سيجلس', rule: 'iv', reasons: ['IVPref-hw']},
            {term: 'جلس', source: 'وسيجلس', rule: 'iv', reasons: ['IVPref-hw']},
            {term: 'جلس', source: 'فسيجلس', rule: 'iv', reasons: ['IVPref-hw']},
            {term: 'جلس', source: 'ليجلس', rule: 'iv', reasons: ['IVPref-hw']},
            {term: 'جلس', source: 'وليجلس', rule: 'iv', reasons: ['IVPref-hw']},
            {term: 'جلس', source: 'فليجلس', rule: 'iv', reasons: ['IVPref-hw']},

            {term: 'جلس', source: 'ليجلسا', rule: 'iv', reasons: ['IVPref-hmA']},
        ],
    },
    {
        category: 'imperfect verb attached direct object pronouns',
        valid: true,
        tests: [
            {term: 'ضرب', source: 'يضربني', rule: 'iv', reasons: ['IVPref-hw']},
            {term: 'ضرب', source: 'يضربنا', rule: 'iv', reasons: ['IVPref-hw']},
            {term: 'ضرب', source: 'يضربك', rule: 'iv', reasons: ['IVPref-hw']},
            {term: 'ضرب', source: 'يضربكما', rule: 'iv', reasons: ['IVPref-hw']},
            {term: 'ضرب', source: 'يضربكم', rule: 'iv', reasons: ['IVPref-hw']},
            {term: 'ضرب', source: 'يضربكن', rule: 'iv', reasons: ['IVPref-hw']},
            {term: 'ضرب', source: 'يضربه', rule: 'iv', reasons: ['IVPref-hw']},
            {term: 'ضرب', source: 'يضربها', rule: 'iv', reasons: ['IVPref-hw']},
            {term: 'ضرب', source: 'يضربهما', rule: 'iv', reasons: ['IVPref-hw']},
            {term: 'ضرب', source: 'يضربهم', rule: 'iv', reasons: ['IVPref-hw']},
            {term: 'ضرب', source: 'يضربهن', rule: 'iv', reasons: ['IVPref-hw']},

            {term: 'ضرب', source: 'أضربه', rule: 'iv', reasons: ['IVPref-AnA']},
            {term: 'ضرب', source: 'تضربه', rule: 'iv', reasons: ['IVPref-Anta']},
            {term: 'ضرب', source: 'تضربينه', rule: 'iv', reasons: ['IVPref-Anti']},
            {term: 'ضرب', source: 'يضربه', rule: 'iv', reasons: ['IVPref-hw']},
            {term: 'ضرب', source: 'تضربه', rule: 'iv', reasons: ['IVPref-hy']},
            {term: 'ضرب', source: 'تضربانه', rule: 'iv', reasons: ['IVPref-AntmA']},
            {term: 'ضرب', source: 'يضربانه', rule: 'iv', reasons: ['IVPref-hmA']},
            {term: 'ضرب', source: 'تضربانه', rule: 'iv', reasons: ['IVPref-hmA-ta']},
            {term: 'ضرب', source: 'نضربه', rule: 'iv', reasons: ['IVPref-nHn']},
            {term: 'ضرب', source: 'تضربونه', rule: 'iv', reasons: ['IVPref-Antm']},
            {term: 'ضرب', source: 'تضربنه', rule: 'iv', reasons: ['IVPref-Antn']},
            {term: 'ضرب', source: 'يضربونه', rule: 'iv', reasons: ['IVPref-hm']},
            {term: 'ضرب', source: 'يضربنه', rule: 'iv', reasons: ['IVPref-hn']},

            // subjunctive
            {term: 'ضرب', source: 'تضربيه', rule: 'iv', reasons: ['IVPref-Anti']},
            {term: 'ضرب', source: 'تضرباه', rule: 'iv', reasons: ['IVPref-AntmA']},
            {term: 'ضرب', source: 'يضرباه', rule: 'iv', reasons: ['IVPref-hmA']},
            {term: 'ضرب', source: 'تضرباه', rule: 'iv', reasons: ['IVPref-hmA-ta']},
            {term: 'ضرب', source: 'تضربوه', rule: 'iv', reasons: ['IVPref-Antm']},
            {term: 'ضرب', source: 'يضربوه', rule: 'iv', reasons: ['IVPref-hm']},
        ],
    },
    {
        category: 'imperfect verb with assimilated أ + ا = آ',
        valid: true,
        tests: [
            {term: 'قرأ', source: 'يقرآن', rule: 'iv', reasons: ['IVPref-hmA']},
            {term: 'قرأ', source: 'يقرآ', rule: 'iv', reasons: ['IVPref-hmA']},

            {term: 'قرأ', source: 'يقرآنه', rule: 'iv', reasons: ['IVPref-hmA']},
            {term: 'قرأ', source: 'يقرآه', rule: 'iv', reasons: ['IVPref-hmA']},

            {term: 'قرأ', source: 'ليقرآ', rule: 'iv', reasons: ['IVPref-hmA']},
        ],
    },
    {
        category: 'imperfect verb invalid attached direct object pronouns',
        valid: false,
        tests: [
            {term: 'ضرب', source: 'أضربنا', rule: 'iv', reasons: null},
            {term: 'ضرب', source: 'أضربني', rule: 'iv', reasons: null},
            {term: 'ضرب', source: 'نضربني', rule: 'iv', reasons: null},

            {term: 'ضرب', source: 'تضربك', rule: 'iv', reasons: ['IVPref-Anta']},
            {term: 'ضرب', source: 'تضربينك', rule: 'iv', reasons: null},
            {term: 'ضرب', source: 'تضربانك', rule: 'iv', reasons: ['IVPref-Antma']},
            {term: 'ضرب', source: 'تضربونك', rule: 'iv', reasons: null},
            {term: 'ضرب', source: 'تضربنك', rule: 'iv', reasons: null},

            {term: 'ضرب', source: 'تضربنكما', rule: 'iv', reasons: null},
            {term: 'ضرب', source: 'تضربنكم', rule: 'iv', reasons: null},
            {term: 'ضرب', source: 'تضربنكن', rule: 'iv', reasons: null},
        ],
    },
    {
        category: 'imperfect verb invalid chains',
        valid: false,
        tests: [
            {term: 'جلس', source: 'ليجلسان', rule: 'iv', reasons: null},
            {term: 'جلس', source: 'ليجلسون', rule: 'iv', reasons: null},
            {term: 'جلس', source: 'لتجلسين', rule: 'iv', reasons: null},

            {term: 'جلس', source: 'سليجلس', rule: 'iv', reasons: null},
        ],
    },
];

const languageTransformer = new LanguageTransformer();
languageTransformer.addDescriptor(arabicTransforms);
testLanguageTransformer(languageTransformer, tests);
