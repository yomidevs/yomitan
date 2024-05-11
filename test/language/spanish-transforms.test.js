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

import {spanishTransforms} from '../../ext/js/language/es/spanish-transforms.js';
import {LanguageTransformer} from '../../ext/js/language/language-transformer.js';
import {testLanguageTransformer} from '../fixtures/language-transformer-test.js';

const tests = [
    {
        category: 'nouns',
        valid: true,
        tests: [
            {term: 'gato', source: 'gatos', rule: 'ns', reasons: ['plural']},
            {term: 'sofá', source: 'sofás', rule: 'ns', reasons: ['plural']},
            {term: 'tisú', source: 'tisús', rule: 'ns', reasons: ['plural']},
            {term: 'tisú', source: 'tisúes', rule: 'ns', reasons: ['plural']},
            {term: 'autobús', source: 'autobuses', rule: 'ns', reasons: ['plural']},
            {term: 'ciudad', source: 'ciudades', rule: 'ns', reasons: ['plural']},
            {term: 'clic', source: 'clics', rule: 'ns', reasons: ['plural']},
            {term: 'sí', source: 'síes', rule: 'ns', reasons: ['plural']},
            {term: 'zigzag', source: 'zigzags', rule: 'ns', reasons: ['plural']},
            {term: 'luz', source: 'luces', rule: 'ns', reasons: ['plural']},
            {term: 'canción', source: 'canciones', rule: 'ns', reasons: ['plural']}
        ]
    }
];

const languageTransformer = new LanguageTransformer();
languageTransformer.addDescriptor(spanishTransforms);
testLanguageTransformer(languageTransformer, tests);
