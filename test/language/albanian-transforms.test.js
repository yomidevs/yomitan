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

import {LanguageTransformer} from '../../ext/js/language/language-transformer.js';
import {albanianTransforms} from '../../ext/js/language/sq/albanian-transforms.js';
import {testLanguageTransformer} from '../fixtures/language-transformer-test.js';

/* eslint-disable @stylistic/no-multi-spaces */
const tests = [
    {
        category: 'verbs',
        valid: true,
        tests: [
            {term: 'fshij', source: 'fshin',  rule: 'v', reasons: ['present indicative second-person singular']},
            {term: 'fshij', source: 'fshin',  rule: 'v', reasons: ['present indicative third-person singular']},
            {term: 'fshij', source: 'fshijmë', rule: 'v', reasons: ['present indicative first-person plural']},
            {term: 'fshij', source: 'fshini',  rule: 'v', reasons: ['present indicative second-person plural']},
            {term: 'fshij', source: 'fshijnë', rule: 'v', reasons: ['present indicative third-person plural']},
            {term: 'fshij', source: 'fshija',  rule: 'v', reasons: ['imperfect first-person singular indicative']},
            {term: 'fshij', source: 'fshije',  rule: 'v', reasons: ['imperfect second-person singular indicative']},
            {term: 'fshij', source: 'fshinte', rule: 'v', reasons: ['imperfect third-person singular indicative']},
            {term: 'fshij', source: 'fshinim', rule: 'v', reasons: ['imperfect first-person plural indicative']},
            {term: 'fshij', source: 'fshinit', rule: 'v', reasons: ['imperfect second-person plural indicative']},
            {term: 'fshij', source: 'fshinin', rule: 'v', reasons: ['imperfect third-person plural indicative']},
            {term: 'fshij', source: 'fshiva',  rule: 'v', reasons: ['aorist first-person singular indicative']},
            {term: 'fshij', source: 'fshive',  rule: 'v', reasons: ['aorist second-person singular indicative']},
            {term: 'fshij', source: 'fshiu',   rule: 'v', reasons: ['aorist third-person singular indicative']},
            {term: 'fshij', source: 'fshimë',  rule: 'v', reasons: ['aorist first-person plural indicative']},
            {term: 'fshij', source: 'fshitë',  rule: 'v', reasons: ['aorist second-person plural indicative']},
            {term: 'fshij', source: 'fshinë',  rule: 'v', reasons: ['aorist third-person plural indicative']},
            {term: 'fshij', source: 'fshini',  rule: 'v', reasons: ['imperative second-person plural present']},
            {term: 'fshij', source: 'fshirë',  rule: 'v', reasons: ['participle']},

            {term: 'ndihmoj', source: 'ndihmojmë', rule: 'v', reasons: ['present indicative first-person plural']},
            {term: 'ndihmoj', source: 'ndihmoni', rule: 'v', reasons: ['present indicative second-person plural']},
            {term: 'ndihmoj', source: 'ndihmojnë', rule: 'v', reasons: ['present indicative third-person plural']},
            {term: 'ndihmoj', source: 'ndihmoja', rule: 'v', reasons: ['imperfect first-person singular indicative']},
            {term: 'ndihmoj', source: 'ndihmoje', rule: 'v', reasons: ['imperfect second-person singular indicative']},
            {term: 'ndihmoj', source: 'ndihmonte', rule: 'v', reasons: ['imperfect third-person singular indicative']},
            {term: 'ndihmoj', source: 'ndihmonim', rule: 'v', reasons: ['imperfect first-person plural indicative']},
            {term: 'ndihmoj', source: 'ndihmonit', rule: 'v', reasons: ['imperfect second-person plural indicative']},
            {term: 'ndihmoj', source: 'ndihmonin', rule: 'v', reasons: ['imperfect third-person plural indicative']},
            {term: 'ndihmoj', source: 'ndihmova', rule: 'v', reasons: ['aorist first-person singular indicative']},
            {term: 'ndihmoj', source: 'ndihmove', rule: 'v', reasons: ['aorist second-person singular indicative']},
            {term: 'ndihmoj', source: 'ndihmoi', rule: 'v', reasons: ['aorist third-person singular indicative']},
            {term: 'ndihmoj', source: 'ndihmuam', rule: 'v', reasons: ['aorist first-person plural indicative']},
            {term: 'ndihmoj', source: 'ndihmuat', rule: 'v', reasons: ['aorist second-person plural indicative']},
            {term: 'ndihmoj', source: 'ndihmuan', rule: 'v', reasons: ['aorist third-person plural indicative']},
            {term: 'ndihmoj', source: 'ndihmoni', rule: 'v', reasons: ['imperative second-person plural present']},
            {term: 'ndihmoj', source: 'ndihmofsha', rule: 'v', reasons: ['optative first-person singular present']},
            {term: 'ndihmoj', source: 'ndihmofsh', rule: 'v', reasons: ['optative second-person singular present']},
            {term: 'ndihmoj', source: 'ndihmoftë', rule: 'v', reasons: ['optative third-person singular present']},
            {term: 'ndihmoj', source: 'ndihmofshim', rule: 'v', reasons: ['optative first-person plural present']},
            {term: 'ndihmoj', source: 'ndihmofshi', rule: 'v', reasons: ['optative second-person plural present']},
            {term: 'ndihmoj', source: 'ndihmofshin', rule: 'v', reasons: ['optative third-person plural present']},

            {term: 'paguaj', source: 'paguajmë', rule: 'v', reasons: ['present indicative first-person plural']},
            {term: 'paguaj', source: 'paguani', rule: 'v', reasons: ['present indicative second-person plural']},
            {term: 'paguaj', source: 'paguajnë', rule: 'v', reasons: ['present indicative third-person plural']},
            {term: 'paguaj', source: 'paguaja', rule: 'v', reasons: ['imperfect first-person singular indicative']},
            {term: 'paguaj', source: 'paguaje', rule: 'v', reasons: ['imperfect second-person singular indicative']},
            {term: 'paguaj', source: 'paguante', rule: 'v', reasons: ['imperfect third-person singular indicative']},
            {term: 'paguaj', source: 'paguanim', rule: 'v', reasons: ['imperfect first-person plural indicative']},
            {term: 'paguaj', source: 'paguanit', rule: 'v', reasons: ['imperfect second-person plural indicative']},
            {term: 'paguaj', source: 'paguanin', rule: 'v', reasons: ['imperfect third-person plural indicative']},
            {term: 'paguaj', source: 'pagova', rule: 'v', reasons: ['aorist first-person singular indicative']},
            {term: 'paguaj', source: 'pagove', rule: 'v', reasons: ['aorist second-person singular indicative']},
            {term: 'paguaj', source: 'pagoi', rule: 'v', reasons: ['aorist third-person singular indicative']},
            {term: 'paguaj', source: 'paguam', rule: 'v', reasons: ['aorist first-person plural indicative']},
            {term: 'paguaj', source: 'paguat', rule: 'v', reasons: ['aorist second-person plural indicative']},
            {term: 'paguaj', source: 'paguan', rule: 'v', reasons: ['aorist third-person plural indicative']},
            {term: 'paguaj', source: 'paguani', rule: 'v', reasons: ['imperative second-person plural present']},

            {term: 'vendos', source: 'vendosim', rule: 'v', reasons: ['present indicative first-person plural']},
            {term: 'vendos', source: 'vendosni', rule: 'v', reasons: ['present indicative second-person plural']},
            {term: 'vendos', source: 'vendosin', rule: 'v', reasons: ['present indicative third-person plural']},
            {term: 'vendos', source: 'vendosja', rule: 'v', reasons: ['imperfect first-person singular indicative']},
            {term: 'vendos', source: 'vendosje', rule: 'v', reasons: ['imperfect second-person singular indicative']},
            {term: 'vendos', source: 'vendoste', rule: 'v', reasons: ['imperfect third-person singular indicative']},
            {term: 'vendos', source: 'vendosnim', rule: 'v', reasons: ['imperfect first-person plural indicative']},
            {term: 'vendos', source: 'vendosnit', rule: 'v', reasons: ['imperfect second-person plural indicative']},
            {term: 'vendos', source: 'vendosnin', rule: 'v', reasons: ['imperfect third-person plural indicative']},
            {term: 'vendos', source: 'vendosa', rule: 'v', reasons: ['aorist first-person singular indicative']},
            {term: 'vendos', source: 'vendose', rule: 'v', reasons: ['aorist second-person singular indicative']},
            {term: 'vendos', source: 'vendosi', rule: 'v', reasons: ['aorist third-person singular indicative']},
            {term: 'vendos', source: 'vendosëm', rule: 'v', reasons: ['aorist first-person plural indicative']},
            {term: 'vendos', source: 'vendosët', rule: 'v', reasons: ['aorist second-person plural indicative']},
            {term: 'vendos', source: 'vendosën', rule: 'v', reasons: ['aorist third-person plural indicative']},
            {term: 'vendos', source: 'vendosni', rule: 'v', reasons: ['imperative second-person plural present']},

            {term: 'hap', source: 'hapim', rule: 'v', reasons: ['present indicative first-person plural']},
            {term: 'hap', source: 'hapni', rule: 'v', reasons: ['present indicative second-person plural']},
            {term: 'hap', source: 'hapin', rule: 'v', reasons: ['present indicative third-person plural']},
            {term: 'hap', source: 'hapja', rule: 'v', reasons: ['imperfect first-person singular indicative']},
            {term: 'hap', source: 'hapje', rule: 'v', reasons: ['imperfect second-person singular indicative']},
            {term: 'hap', source: 'hapte', rule: 'v', reasons: ['imperfect third-person singular indicative']},
            {term: 'hap', source: 'hapnim', rule: 'v', reasons: ['imperfect first-person plural indicative']},
            {term: 'hap', source: 'hapnit', rule: 'v', reasons: ['imperfect second-person plural indicative']},
            {term: 'hap', source: 'hapnin', rule: 'v', reasons: ['imperfect third-person plural indicative']},
            {term: 'hap', source: 'hapa', rule: 'v', reasons: ['aorist first-person singular indicative']},
            {term: 'hap', source: 'hape', rule: 'v', reasons: ['aorist second-person singular indicative']},
            {term: 'hap', source: 'hapi', rule: 'v', reasons: ['aorist third-person singular indicative']},
            {term: 'hap', source: 'hapëm', rule: 'v', reasons: ['aorist first-person plural indicative']},
            {term: 'hap', source: 'hapët', rule: 'v', reasons: ['aorist second-person plural indicative']},
            {term: 'hap', source: 'hapën', rule: 'v', reasons: ['aorist third-person plural indicative']},
            {term: 'hap', source: 'hapni', rule: 'v', reasons: ['imperative second-person plural present']},

            {term: 'kujtohem', source: 'kujtohu', rule: 'v', reasons: ['imperative second-person singular present']},
            {term: 'kujtohem', source: 'kujtohuni', rule: 'v', reasons: ['imperative second-person plural present']},

            {term: 'kthej', source: 'kthye', rule: 'v', reasons: ['aorist third-person singular indicative']},
            {term: 'shkëlqej', source: 'shkëlqyer', rule: 'v', reasons: ['participle']},
        ],
    },
    {
        category: 'nouns',
        valid: true,
        tests: [
            {term: 'pije', source: 'pijet', rule: 'ns', reasons: ['plural']},

            {term: 'gëzoj', source: 'gëzim', rule: 'v', reasons: ['nominalization']},
            {term: 'zbuloj', source: 'zbulim', rule: 'v', reasons: ['nominalization']},
            {term: 'përkthej', source: 'përkthim', rule: 'v', reasons: ['nominalization']},
            {term: 'lëviz', source: 'lëvizje', rule: 'v', reasons: ['nominalization']},
        ],
    },
];
/* eslint-enable @stylistic/no-multi-spaces */

const languageTransformer = new LanguageTransformer();
languageTransformer.addDescriptor(albanianTransforms);
testLanguageTransformer(languageTransformer, tests);
