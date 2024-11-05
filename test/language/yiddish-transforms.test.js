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
import {yiddishTransforms} from '../../ext/js/language/yi/yiddish-transforms.js';
import {testLanguageTransformer} from '../fixtures/language-transformer-test.js';

/* Since Yiddish final letters are handled in a text postprocessor after all the transformations have been run, test cases must never use the final form of a letter!
Otherwise, it will fail even if the rule is correct! */
const tests = [
    {
        category: 'nouns',
        valid: true,
        tests: [
            {term: 'גרופּע', source: 'גרופּעס', rule: 'ns', reasons: ['plural']},
            {term: 'טיש', source: 'טישן', rule: 'ns', reasons: ['plural']},
            {term: 'פּויער', source: 'פּויערים', rule: 'ns', reasons: ['plural']},
            {term: 'קינד', source: 'קינדער', rule: 'ns', reasons: ['plural']},
            {term: 'קינדער', source: 'קינדערלעך', rule: 'n', reasons: ['diminutive']},
            {term: 'עטיקעט', source: 'עטיקעטקע', rule: 'n', reasons: ['diminutive']},
            {term: 'עטיקעט', source: 'עטיקעטקע', rule: 'n', reasons: ['diminutive']},
            {term: 'קליענטעל', source: 'קליענטעלטשיק', rule: 'n', reasons: ['diminutive']},
            {term: 'קאצ', source: 'קעצעלע', rule: 'n', reasons: ['diminutive']},
            {term: 'קאצ', source: 'קעצל', rule: 'n', reasons: ['diminutive']},
            {term: 'מױד', source: 'מײדלעך', rule: 'ns', reasons: ['umlaut_plural']},
            {term: 'מאנ', source: 'מענער', rule: 'ns', reasons: ['umlaut_plural']},
            {term: 'קויפֿ', source: 'קויפֿסט', rule: 'v', reasons: ['verb_present_singular_to_first_person']},
            {term: 'קויפֿ', source: 'קויפֿט', rule: 'vpresent', reasons: ['verb_present_singular_to_first_person']},
            {term: 'קויפֿנ', source: 'קויפֿט', rule: 'vpresent', reasons: ['verb_present_plural_to_first_person']},
            {term: 'קויפֿנ', source: 'קויפֿטס', rule: 'vpresent', reasons: ['verb_present_plural_to_first_person']},
            {term: 'קויפֿנ', source: 'קויפֿטס', rule: 'vpresent', reasons: ['verb_present_plural_to_first_person']},
        ],
    },
];


const languageTransformer = new LanguageTransformer();
languageTransformer.addDescriptor(yiddishTransforms);
testLanguageTransformer(languageTransformer, tests);
