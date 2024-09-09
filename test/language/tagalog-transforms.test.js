/*
 * Copyright (C) 2024  Yomitan Authors
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

import {testLanguageTransformer} from '../fixtures/language-transformer-test.js';
import {LanguageTransformer} from '../../ext/js/language/language-transformer.js';
import {tagalogTransforms} from '../../ext/js/language/tl/tagalog-transforms.js';


const tests = [
    {
        category: 'prefixes',
        tests: [
            {reasons: ['taga-'], rule: 'n', source: 'tagaluto', term: 'luto'},
            {reasons: ['kaka-'], rule: 'n', source: 'kasisigaw', term: 'sigaw'},
            {reasons: ['kaka-'], rule: 'n', source: 'kaiisip', term: 'isip'},
            {reasons: ['mang- + rep1'], rule: 'n', source: 'manggagamot', term: 'gamot'},
            {reasons: ['ka-'], rule: 'adj', source: 'kapareho', term: 'pareho'},
            {reasons: ['nakapang- + rep1'], rule: 'n', source: 'nakapanghihina', term: 'hina'},
            {reasons: ['naka- + rep1'], rule: 'n', source: 'nakatutulong', term: 'tulong'},
        ],
        valid: true,
    },
    {
        category: 'sandwich',
        tests: [
            {reasons: ['ma-...-an'], rule: 'n', source: 'masiraan', term: 'sira'},
        ],
        valid: true,
    },
    {
        category: 'suffix',
        tests: [
            {reasons: ['-in'], rule: 'n', source: 'kainin', term: 'kain'},
            {reasons: ['-ng'], rule: 'n', source: 'akong', term: 'ako'},
        ],
        valid: true,
    },
    {
        category: 'irregulars',
        tests: [
            {reasons: ['ika-'], rule: 'num', source: 'ikalawa', term: 'dalawa'},
            {reasons: ['pang-'], rule: 'num', source: 'pangalawa', term: 'dalawa'},
            {reasons: ['ika-'], rule: 'num', source: 'ikatlo', term: 'tatlo'},
            {reasons: ['pang-'], rule: 'num', source: 'pangatlo', term: 'tatlo'},
        ],
        valid: true,
    },
];

const languageTransformer = new LanguageTransformer();
languageTransformer.addDescriptor(tagalogTransforms);
testLanguageTransformer(languageTransformer, tests);
