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

            {term: 'λύω',   source: 'λύεις',   rule: 'v',   reasons: ['2nd person singular present active indicative']},
            {term: 'λύω',   source: 'λύει',    rule: 'v',   reasons: ['3rd person singular present active indicative']},
            {term: 'λύω',   source: 'λύομεν',  rule: 'v',   reasons: ['1st person plural present active indicative']},
            {term: 'λύω',   source: 'λύετε',   rule: 'v',   reasons: ['2nd person plural present active indicative']},
            {term: 'λύω',   source: 'λύουσι',  rule: 'v',   reasons: ['3rd person plural present active indicative']},
            {term: 'λύω',   source: 'λύουσιν',  rule: 'v',   reasons: ['3rd person plural present active indicative']},


            {term: 'φιλεω', source: 'φιλεις',  rule: 'v',   reasons: ['2nd person singular present active indicative']},
            {term: 'φιλεω', source: 'φιλει',   rule: 'v',   reasons: ['3rd person singular present active indicative']},
            {term: 'φιλεω', source: 'φιλεομεν', rule: 'v',   reasons: ['1st person plural present active indicative']},
            {term: 'φιλεω', source: 'φιλεετε', rule: 'v',   reasons: ['2nd person plural present active indicative']},
            {term: 'φιλεω', source: 'φιλεουσι', rule: 'v',   reasons: ['3rd person plural present active indicative']},
            {term: 'φιλεω', source: 'φιλεουσιν', rule: 'v',   reasons: ['3rd person plural present active indicative']},

            {term: 'γεωργεω', source: 'γεωργος', rule: 'v',   reasons: ['nominalization']},
        ],
    },
    {
        category: 'nouns',
        valid: true,
        tests: [
            // 1st declension, feminine
            {term: 'σκια', source: 'σκιας', rule: 'n', reasons: ['genitive singular']},
            {term: 'σκια', source: 'σκιαν', rule: 'n', reasons: ['accusative singular']},
            {term: 'σκια', source: 'σκιαι', rule: 'n', reasons: ['nominative plural']},
            {term: 'σκια', source: 'σκιων', rule: 'n', reasons: ['genitive plural']},
            {term: 'σκια', source: 'σκιαις', rule: 'n', reasons: ['dative plural']},
            {term: 'σκια', source: 'σκιας', rule: 'n', reasons: ['accusative plural']},
            {term: 'σκια', source: 'σκιαι', rule: 'n', reasons: ['vocative plural']},

            // 1st declension, masculine
            {term: 'νεανιας', source: 'νεανιου', rule: 'n', reasons: ['genitive singular']},
            {term: 'νεανιας', source: 'νεανια', rule: 'n', reasons: ['dative singular']},
            {term: 'νεανιας', source: 'νεανιαν', rule: 'n', reasons: ['accusative singular']},
            {term: 'νεανιας', source: 'νεανια', rule: 'n', reasons: ['vocative singular']},
            {term: 'νεανιας', source: 'νεανιαι', rule: 'n', reasons: ['nominative plural']},
            {term: 'νεανιας', source: 'νεανιων', rule: 'n', reasons: ['genitive plural']},
            {term: 'νεανιας', source: 'νεανιαις', rule: 'n', reasons: ['dative plural']},
            {term: 'νεανιας', source: 'νεανιαι', rule: 'n', reasons: ['vocative plural']},

            // 2nd declension, masculine
            {term: 'ανθρωπος', source: 'ανθρωπου', rule: 'n', reasons: ['genitive singular']},
            {term: 'ανθρωπος', source: 'ανθρωπω', rule: 'n', reasons: ['dative singular']},
            {term: 'ανθρωπος', source: 'ανθρωπον', rule: 'n', reasons: ['accusative singular']},
            {term: 'ανθρωπος', source: 'ανθρωπε', rule: 'n', reasons: ['vocative singular']},
            {term: 'ανθρωπος', source: 'ανθρωποι', rule: 'n', reasons: ['nominative plural']},
            {term: 'ανθρωπος', source: 'ανθρωπων', rule: 'n', reasons: ['genitive plural']},
            {term: 'ανθρωπος', source: 'ανθρωποις', rule: 'n', reasons: ['dative plural']},
            {term: 'ανθρωπος', source: 'ανθρωπους', rule: 'n', reasons: ['accusative plural']},
            {term: 'ανθρωπος', source: 'ανθρωποι', rule: 'n', reasons: ['vocative plural']},

            // 2nd declension, neuter
            {term: 'δωρον', source: 'δωρου', rule: 'n', reasons: ['genitive singular']},
            {term: 'δωρον', source: 'δωρω', rule: 'n', reasons: ['dative singular']},
            {term: 'δωρον', source: 'δωρα', rule: 'n', reasons: ['nominative plural']},
            {term: 'δωρον', source: 'δωρων', rule: 'n', reasons: ['genitive plural']},
            {term: 'δωρον', source: 'δωροις', rule: 'n', reasons: ['dative plural']},
            {term: 'δωρον', source: 'δωρα', rule: 'n', reasons: ['accusative plural']},
            {term: 'δωρον', source: 'δωρα', rule: 'n', reasons: ['vocative plural']},

            // word formation
            {term: 'πονεω', source: 'πονος', rule: 'v', reasons: ['nominalization']},
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
