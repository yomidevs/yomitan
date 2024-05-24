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
    },
    {
        category: 'feminine adjectives',
        valid: true,
        tests: [
            {term: 'rojo', source: 'roja', rule: 'adj', reasons: ['feminine adjective']}
        ]
    },
    {
        category: 'present indicative verbs',
        valid: true,
        tests: [
            {term: 'hablar', source: 'hablo', rule: 'v', reasons: ['present indicative']},
            {term: 'hablar', source: 'hablas', rule: 'v', reasons: ['present indicative']},
            {term: 'hablar', source: 'habla', rule: 'v', reasons: ['present indicative']},
            {term: 'hablar', source: 'hablamos', rule: 'v', reasons: ['present indicative']},
            {term: 'hablar', source: 'habláis', rule: 'v', reasons: ['present indicative']},
            {term: 'hablar', source: 'hablan', rule: 'v', reasons: ['present indicative']},
            {term: 'comer', source: 'como', rule: 'v', reasons: ['present indicative']},
            {term: 'comer', source: 'comes', rule: 'v', reasons: ['present indicative']},
            {term: 'comer', source: 'come', rule: 'v', reasons: ['present indicative']},
            {term: 'comer', source: 'comemos', rule: 'v', reasons: ['present indicative']},
            {term: 'comer', source: 'coméis', rule: 'v', reasons: ['present indicative']},
            {term: 'comer', source: 'comen', rule: 'v', reasons: ['present indicative']},
            {term: 'vivir', source: 'vivo', rule: 'v', reasons: ['present indicative']},
            {term: 'vivir', source: 'vives', rule: 'v', reasons: ['present indicative']},
            {term: 'vivir', source: 'vive', rule: 'v', reasons: ['present indicative']},
            {term: 'vivir', source: 'vivimos', rule: 'v', reasons: ['present indicative']},
            {term: 'vivir', source: 'vivís', rule: 'v', reasons: ['present indicative']},
            {term: 'vivir', source: 'viven', rule: 'v', reasons: ['present indicative']},
            {term: 'tener', source: 'tengo', rule: 'v', reasons: ['present indicative']},
            {term: 'tener', source: 'tienes', rule: 'v', reasons: ['present indicative']},
            {term: 'tener', source: 'tiene', rule: 'v', reasons: ['present indicative']},
            {term: 'tener', source: 'tenemos', rule: 'v', reasons: ['present indicative']},
            {term: 'tener', source: 'tenéis', rule: 'v', reasons: ['present indicative']},
            {term: 'tener', source: 'tienen', rule: 'v', reasons: ['present indicative']},
            {term: 'exigir', source: 'exijo', rule: 'v', reasons: ['present indicative']},
            {term: 'extinguir', source: 'extingo', rule: 'v', reasons: ['present indicative']},
            {term: 'escoger', source: 'escojo', rule: 'v', reasons: ['present indicative']},
            {term: 'caber', source: 'quepo', rule: 'v', reasons: ['present indicative']},
            {term: 'caer', source: 'caigo', rule: 'v', reasons: ['present indicative']},
            {term: 'conocer', source: 'conozco', rule: 'v', reasons: ['present indicative']},
            {term: 'dar', source: 'doy', rule: 'v', reasons: ['present indicative']},
            {term: 'hacer', source: 'hago', rule: 'v', reasons: ['present indicative']},
            {term: 'poner', source: 'pongo', rule: 'v', reasons: ['present indicative']},
            {term: 'saber', source: 'sé', rule: 'v', reasons: ['present indicative']},
            {term: 'salir', source: 'salgo', rule: 'v', reasons: ['present indicative']},
            {term: 'traducir', source: 'traduzco', rule: 'v', reasons: ['present indicative']},
            {term: 'traer', source: 'traigo', rule: 'v', reasons: ['present indicative']},
            {term: 'valer', source: 'valgo', rule: 'v', reasons: ['present indicative']},
            {term: 'ver', source: 'veo', rule: 'v', reasons: ['present indicative']},
            {term: 'ser', source: 'soy', rule: 'v', reasons: ['present indicative']},
            {term: 'estar', source: 'estoy', rule: 'v', reasons: ['present indicative']},
            {term: 'ir', source: 'voy', rule: 'v', reasons: ['present indicative']},
            {term: 'haber', source: 'he', rule: 'v', reasons: ['present indicative']}
        ]
    }
];

const languageTransformer = new LanguageTransformer();
languageTransformer.addDescriptor(spanishTransforms);
testLanguageTransformer(languageTransformer, tests);
