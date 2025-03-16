/*
 * Copyright (C) 2024-2025  Yomitan Authors
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
import {tagalogTransforms} from '../../ext/js/language/tl/tagalog-transforms.js';
import {testLanguageTransformer} from '../fixtures/language-transformer-test.js';


const tests = [
    {
        category: 'prefixes',
        valid: true,
        tests: [
            {term: 'luto', source: 'tagaluto', rule: 'n', reasons: ['taga-']},
            {term: 'sigaw', source: 'kasisigaw', rule: 'n', reasons: ['kaka-']},
            {term: 'isip', source: 'kaiisip', rule: 'n', reasons: ['kaka-']},
            {term: 'gamot', source: 'manggagamot', rule: 'n', reasons: ['mang- + rep1']},
            {term: 'pareho', source: 'kapareho', rule: 'adj', reasons: ['ka-']},
            {term: 'hina', source: 'nakapanghihina', rule: 'n', reasons: ['nakapang- + rep1']},
            {term: 'tulong', source: 'nakatutulong', rule: 'n', reasons: ['naka- + rep1']},
        ],
    },
    {
        category: 'sandwich',
        valid: true,
        tests: [
            {term: 'sira', source: 'masiraan', rule: 'n', reasons: ['ma-...-an']},
        ],
    },
    {
        category: 'suffix',
        valid: true,
        tests: [
            {term: 'kain', source: 'kainin', rule: 'n', reasons: ['-in']},
            {term: 'ako', source: 'akong', rule: 'n', reasons: ['-ng']},
        ],
    },
    {
        category: 'irregulars',
        valid: true,
        tests: [
            {term: 'dalawa', source: 'ikalawa', rule: 'num', reasons: ['ika-']},
            {term: 'dalawa', source: 'pangalawa', rule: 'num', reasons: ['pang-']},
            {term: 'tatlo', source: 'ikatlo', rule: 'num', reasons: ['ika-']},
            {term: 'tatlo', source: 'pangatlo', rule: 'num', reasons: ['pang-']},
        ],
    },
];

const languageTransformer = new LanguageTransformer();
languageTransformer.addDescriptor(tagalogTransforms);
testLanguageTransformer(languageTransformer, tests);
