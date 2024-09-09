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

import {LanguageTransformer} from '../../ext/js/language/language-transformer.js';
import {albanianTransforms} from '../../ext/js/language/sq/albanian-transforms.js';
import {testLanguageTransformer} from '../fixtures/language-transformer-test.js';

/* eslint-disable @stylistic/no-multi-spaces */
const tests = [
    {
        category: 'verbs',
        tests: [
            {reasons: ['present indicative second-person singular'], rule: 'v',  source: 'fshin', term: 'fshij'},
            {reasons: ['present indicative third-person singular'], rule: 'v',  source: 'fshin', term: 'fshij'},
            {reasons: ['present indicative first-person plural'], rule: 'v', source: 'fshijmë', term: 'fshij'},
            {reasons: ['present indicative second-person plural'], rule: 'v',  source: 'fshini', term: 'fshij'},
            {reasons: ['present indicative third-person plural'], rule: 'v', source: 'fshijnë', term: 'fshij'},
            {reasons: ['imperfect first-person singular indicative'], rule: 'v',  source: 'fshija', term: 'fshij'},
            {reasons: ['imperfect second-person singular indicative'], rule: 'v',  source: 'fshije', term: 'fshij'},
            {reasons: ['imperfect third-person singular indicative'], rule: 'v', source: 'fshinte', term: 'fshij'},
            {reasons: ['imperfect first-person plural indicative'], rule: 'v', source: 'fshinim', term: 'fshij'},
            {reasons: ['imperfect second-person plural indicative'], rule: 'v', source: 'fshinit', term: 'fshij'},
            {reasons: ['imperfect third-person plural indicative'], rule: 'v', source: 'fshinin', term: 'fshij'},
            {reasons: ['aorist first-person singular indicative'], rule: 'v',  source: 'fshiva', term: 'fshij'},
            {reasons: ['aorist second-person singular indicative'], rule: 'v',  source: 'fshive', term: 'fshij'},
            {reasons: ['aorist third-person singular indicative'], rule: 'v',   source: 'fshiu', term: 'fshij'},
            {reasons: ['aorist first-person plural indicative'], rule: 'v',  source: 'fshimë', term: 'fshij'},
            {reasons: ['aorist second-person plural indicative'], rule: 'v',  source: 'fshitë', term: 'fshij'},
            {reasons: ['aorist third-person plural indicative'], rule: 'v',  source: 'fshinë', term: 'fshij'},
            {reasons: ['imperative second-person plural present'], rule: 'v',  source: 'fshini', term: 'fshij'},
            {reasons: ['participle'], rule: 'v',  source: 'fshirë', term: 'fshij'},

            {reasons: ['present indicative first-person plural'], rule: 'v', source: 'ndihmojmë', term: 'ndihmoj'},
            {reasons: ['present indicative second-person plural'], rule: 'v', source: 'ndihmoni', term: 'ndihmoj'},
            {reasons: ['present indicative third-person plural'], rule: 'v', source: 'ndihmojnë', term: 'ndihmoj'},
            {reasons: ['imperfect first-person singular indicative'], rule: 'v', source: 'ndihmoja', term: 'ndihmoj'},
            {reasons: ['imperfect second-person singular indicative'], rule: 'v', source: 'ndihmoje', term: 'ndihmoj'},
            {reasons: ['imperfect third-person singular indicative'], rule: 'v', source: 'ndihmonte', term: 'ndihmoj'},
            {reasons: ['imperfect first-person plural indicative'], rule: 'v', source: 'ndihmonim', term: 'ndihmoj'},
            {reasons: ['imperfect second-person plural indicative'], rule: 'v', source: 'ndihmonit', term: 'ndihmoj'},
            {reasons: ['imperfect third-person plural indicative'], rule: 'v', source: 'ndihmonin', term: 'ndihmoj'},
            {reasons: ['aorist first-person singular indicative'], rule: 'v', source: 'ndihmova', term: 'ndihmoj'},
            {reasons: ['aorist second-person singular indicative'], rule: 'v', source: 'ndihmove', term: 'ndihmoj'},
            {reasons: ['aorist third-person singular indicative'], rule: 'v', source: 'ndihmoi', term: 'ndihmoj'},
            {reasons: ['aorist first-person plural indicative'], rule: 'v', source: 'ndihmuam', term: 'ndihmoj'},
            {reasons: ['aorist second-person plural indicative'], rule: 'v', source: 'ndihmuat', term: 'ndihmoj'},
            {reasons: ['aorist third-person plural indicative'], rule: 'v', source: 'ndihmuan', term: 'ndihmoj'},
            {reasons: ['imperative second-person plural present'], rule: 'v', source: 'ndihmoni', term: 'ndihmoj'},
            {reasons: ['optative first-person singular present'], rule: 'v', source: 'ndihmofsha', term: 'ndihmoj'},
            {reasons: ['optative second-person singular present'], rule: 'v', source: 'ndihmofsh', term: 'ndihmoj'},
            {reasons: ['optative third-person singular present'], rule: 'v', source: 'ndihmoftë', term: 'ndihmoj'},
            {reasons: ['optative first-person plural present'], rule: 'v', source: 'ndihmofshim', term: 'ndihmoj'},
            {reasons: ['optative second-person plural present'], rule: 'v', source: 'ndihmofshi', term: 'ndihmoj'},
            {reasons: ['optative third-person plural present'], rule: 'v', source: 'ndihmofshin', term: 'ndihmoj'},

            {reasons: ['present indicative first-person plural'], rule: 'v', source: 'paguajmë', term: 'paguaj'},
            {reasons: ['present indicative second-person plural'], rule: 'v', source: 'paguani', term: 'paguaj'},
            {reasons: ['present indicative third-person plural'], rule: 'v', source: 'paguajnë', term: 'paguaj'},
            {reasons: ['imperfect first-person singular indicative'], rule: 'v', source: 'paguaja', term: 'paguaj'},
            {reasons: ['imperfect second-person singular indicative'], rule: 'v', source: 'paguaje', term: 'paguaj'},
            {reasons: ['imperfect third-person singular indicative'], rule: 'v', source: 'paguante', term: 'paguaj'},
            {reasons: ['imperfect first-person plural indicative'], rule: 'v', source: 'paguanim', term: 'paguaj'},
            {reasons: ['imperfect second-person plural indicative'], rule: 'v', source: 'paguanit', term: 'paguaj'},
            {reasons: ['imperfect third-person plural indicative'], rule: 'v', source: 'paguanin', term: 'paguaj'},
            {reasons: ['aorist first-person singular indicative'], rule: 'v', source: 'pagova', term: 'paguaj'},
            {reasons: ['aorist second-person singular indicative'], rule: 'v', source: 'pagove', term: 'paguaj'},
            {reasons: ['aorist third-person singular indicative'], rule: 'v', source: 'pagoi', term: 'paguaj'},
            {reasons: ['aorist first-person plural indicative'], rule: 'v', source: 'paguam', term: 'paguaj'},
            {reasons: ['aorist second-person plural indicative'], rule: 'v', source: 'paguat', term: 'paguaj'},
            {reasons: ['aorist third-person plural indicative'], rule: 'v', source: 'paguan', term: 'paguaj'},
            {reasons: ['imperative second-person plural present'], rule: 'v', source: 'paguani', term: 'paguaj'},

            {reasons: ['present indicative first-person plural'], rule: 'v', source: 'vendosim', term: 'vendos'},
            {reasons: ['present indicative second-person plural'], rule: 'v', source: 'vendosni', term: 'vendos'},
            {reasons: ['present indicative third-person plural'], rule: 'v', source: 'vendosin', term: 'vendos'},
            {reasons: ['imperfect first-person singular indicative'], rule: 'v', source: 'vendosja', term: 'vendos'},
            {reasons: ['imperfect second-person singular indicative'], rule: 'v', source: 'vendosje', term: 'vendos'},
            {reasons: ['imperfect third-person singular indicative'], rule: 'v', source: 'vendoste', term: 'vendos'},
            {reasons: ['imperfect first-person plural indicative'], rule: 'v', source: 'vendosnim', term: 'vendos'},
            {reasons: ['imperfect second-person plural indicative'], rule: 'v', source: 'vendosnit', term: 'vendos'},
            {reasons: ['imperfect third-person plural indicative'], rule: 'v', source: 'vendosnin', term: 'vendos'},
            {reasons: ['aorist first-person singular indicative'], rule: 'v', source: 'vendosa', term: 'vendos'},
            {reasons: ['aorist second-person singular indicative'], rule: 'v', source: 'vendose', term: 'vendos'},
            {reasons: ['aorist third-person singular indicative'], rule: 'v', source: 'vendosi', term: 'vendos'},
            {reasons: ['aorist first-person plural indicative'], rule: 'v', source: 'vendosëm', term: 'vendos'},
            {reasons: ['aorist second-person plural indicative'], rule: 'v', source: 'vendosët', term: 'vendos'},
            {reasons: ['aorist third-person plural indicative'], rule: 'v', source: 'vendosën', term: 'vendos'},
            {reasons: ['imperative second-person plural present'], rule: 'v', source: 'vendosni', term: 'vendos'},

            {reasons: ['present indicative first-person plural'], rule: 'v', source: 'hapim', term: 'hap'},
            {reasons: ['present indicative second-person plural'], rule: 'v', source: 'hapni', term: 'hap'},
            {reasons: ['present indicative third-person plural'], rule: 'v', source: 'hapin', term: 'hap'},
            {reasons: ['imperfect first-person singular indicative'], rule: 'v', source: 'hapja', term: 'hap'},
            {reasons: ['imperfect second-person singular indicative'], rule: 'v', source: 'hapje', term: 'hap'},
            {reasons: ['imperfect third-person singular indicative'], rule: 'v', source: 'hapte', term: 'hap'},
            {reasons: ['imperfect first-person plural indicative'], rule: 'v', source: 'hapnim', term: 'hap'},
            {reasons: ['imperfect second-person plural indicative'], rule: 'v', source: 'hapnit', term: 'hap'},
            {reasons: ['imperfect third-person plural indicative'], rule: 'v', source: 'hapnin', term: 'hap'},
            {reasons: ['aorist first-person singular indicative'], rule: 'v', source: 'hapa', term: 'hap'},
            {reasons: ['aorist second-person singular indicative'], rule: 'v', source: 'hape', term: 'hap'},
            {reasons: ['aorist third-person singular indicative'], rule: 'v', source: 'hapi', term: 'hap'},
            {reasons: ['aorist first-person plural indicative'], rule: 'v', source: 'hapëm', term: 'hap'},
            {reasons: ['aorist second-person plural indicative'], rule: 'v', source: 'hapët', term: 'hap'},
            {reasons: ['aorist third-person plural indicative'], rule: 'v', source: 'hapën', term: 'hap'},
            {reasons: ['imperative second-person plural present'], rule: 'v', source: 'hapni', term: 'hap'},

            {reasons: ['imperative second-person singular present'], rule: 'v', source: 'kujtohu', term: 'kujtohem'},
            {reasons: ['imperative second-person plural present'], rule: 'v', source: 'kujtohuni', term: 'kujtohem'},

            {reasons: ['aorist third-person singular indicative'], rule: 'v', source: 'kthye', term: 'kthej'},
            {reasons: ['participle'], rule: 'v', source: 'shkëlqyer', term: 'shkëlqej'},
        ],
        valid: true,
    },
    {
        category: 'nouns',
        tests: [
            {reasons: ['plural'], rule: 'ns', source: 'pijet', term: 'pije'},

            {reasons: ['nominalization'], rule: 'v', source: 'gëzim', term: 'gëzoj'},
            {reasons: ['nominalization'], rule: 'v', source: 'zbulim', term: 'zbuloj'},
            {reasons: ['nominalization'], rule: 'v', source: 'përkthim', term: 'përkthej'},
            {reasons: ['nominalization'], rule: 'v', source: 'lëvizje', term: 'lëviz'},
        ],
        valid: true,
    },
];
/* eslint-enable @stylistic/no-multi-spaces */

const languageTransformer = new LanguageTransformer();
languageTransformer.addDescriptor(albanianTransforms);
testLanguageTransformer(languageTransformer, tests);
