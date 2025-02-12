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
            {term: 'canción', source: 'canciones', rule: 'ns', reasons: ['plural']},
        ],
    },
    {
        category: 'feminine adjectives',
        valid: true,
        tests: [
            {term: 'rojo', source: 'roja', rule: 'adj', reasons: ['feminine adjective']},
        ],
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
            {term: 'haber', source: 'he', rule: 'v', reasons: ['present indicative']},
        ],
    },
    {
        category: 'preterite',
        valid: true,
        tests: [
            {term: 'hablar', source: 'hablé', rule: 'v', reasons: ['preterite']},
            {term: 'hablar', source: 'hablaste', rule: 'v', reasons: ['preterite']},
            {term: 'hablar', source: 'habló', rule: 'v', reasons: ['preterite']},
            {term: 'hablar', source: 'hablamos', rule: 'v', reasons: ['preterite']},
            {term: 'hablar', source: 'hablasteis', rule: 'v', reasons: ['preterite']},
            {term: 'hablar', source: 'hablaron', rule: 'v', reasons: ['preterite']},
            {term: 'comer', source: 'comí', rule: 'v', reasons: ['preterite']},
            {term: 'comer', source: 'comiste', rule: 'v', reasons: ['preterite']},
            {term: 'comer', source: 'comió', rule: 'v', reasons: ['preterite']},
            {term: 'comer', source: 'comimos', rule: 'v', reasons: ['preterite']},
            {term: 'comer', source: 'comisteis', rule: 'v', reasons: ['preterite']},
            {term: 'comer', source: 'comieron', rule: 'v', reasons: ['preterite']},
            {term: 'vivir', source: 'viví', rule: 'v', reasons: ['preterite']},
            {term: 'vivir', source: 'viviste', rule: 'v', reasons: ['preterite']},
            {term: 'vivir', source: 'vivió', rule: 'v', reasons: ['preterite']},
            {term: 'vivir', source: 'vivimos', rule: 'v', reasons: ['preterite']},
            {term: 'vivir', source: 'vivisteis', rule: 'v', reasons: ['preterite']},
            {term: 'vivir', source: 'vivieron', rule: 'v', reasons: ['preterite']},
            {term: 'tener', source: 'tuve', rule: 'v', reasons: ['preterite']},
        ],
    },
    {
        category: 'imperfect',
        valid: true,
        tests: [
            {term: 'hablar', source: 'hablaba', rule: 'v', reasons: ['imperfect']},
            {term: 'hablar', source: 'hablabas', rule: 'v', reasons: ['imperfect']},
            {term: 'hablar', source: 'hablaba', rule: 'v', reasons: ['imperfect']},
            {term: 'hablar', source: 'hablábamos', rule: 'v', reasons: ['imperfect']},
            {term: 'hablar', source: 'hablabais', rule: 'v', reasons: ['imperfect']},
            {term: 'hablar', source: 'hablaban', rule: 'v', reasons: ['imperfect']},
            {term: 'comer', source: 'comía', rule: 'v', reasons: ['imperfect']},
            {term: 'comer', source: 'comías', rule: 'v', reasons: ['imperfect']},
            {term: 'comer', source: 'comía', rule: 'v', reasons: ['imperfect']},
            {term: 'comer', source: 'comíamos', rule: 'v', reasons: ['imperfect']},
            {term: 'comer', source: 'comíais', rule: 'v', reasons: ['imperfect']},
            {term: 'comer', source: 'comían', rule: 'v', reasons: ['imperfect']},
            {term: 'vivir', source: 'vivía', rule: 'v', reasons: ['imperfect']},
            {term: 'vivir', source: 'vivías', rule: 'v', reasons: ['imperfect']},
            {term: 'vivir', source: 'vivía', rule: 'v', reasons: ['imperfect']},
            {term: 'vivir', source: 'vivíamos', rule: 'v', reasons: ['imperfect']},
            {term: 'vivir', source: 'vivíais', rule: 'v', reasons: ['imperfect']},
            {term: 'vivir', source: 'vivían', rule: 'v', reasons: ['imperfect']},
        ],
    },
    {
        category: 'progressive',
        valid: true,
        tests: [
            {term: 'hablar', source: 'hablando', rule: 'v', reasons: ['progressive']},
            {term: 'comer', source: 'comiendo', rule: 'v', reasons: ['progressive']},
            {term: 'vivir', source: 'viviendo', rule: 'v', reasons: ['progressive']},
        ],
    },
    {
        category: 'imperative',
        valid: true,
        tests: [
            {term: 'hablar', source: 'habla', rule: 'v', reasons: ['imperative']},
            {term: 'hablar', source: 'hablad', rule: 'v', reasons: ['imperative']},
            {term: 'comer', source: 'come', rule: 'v', reasons: ['imperative']},
            {term: 'comer', source: 'comed', rule: 'v', reasons: ['imperative']},
            {term: 'vivir', source: 'vive', rule: 'v', reasons: ['imperative']},
            {term: 'vivir', source: 'vivid', rule: 'v', reasons: ['imperative']},
        ],
    },
    {
        category: 'conditional',
        valid: true,
        tests: [
            {term: 'hablar', source: 'hablaría', rule: 'v', reasons: ['conditional']},
            {term: 'hablar', source: 'hablarías', rule: 'v', reasons: ['conditional']},
            {term: 'hablar', source: 'hablaría', rule: 'v', reasons: ['conditional']},
            {term: 'hablar', source: 'hablaríamos', rule: 'v', reasons: ['conditional']},
            {term: 'hablar', source: 'hablaríais', rule: 'v', reasons: ['conditional']},
            {term: 'hablar', source: 'hablarían', rule: 'v', reasons: ['conditional']},
            {term: 'comer', source: 'comería', rule: 'v', reasons: ['conditional']},
            {term: 'comer', source: 'comerías', rule: 'v', reasons: ['conditional']},
            {term: 'comer', source: 'comería', rule: 'v', reasons: ['conditional']},
            {term: 'comer', source: 'comeríamos', rule: 'v', reasons: ['conditional']},
            {term: 'comer', source: 'comeríais', rule: 'v', reasons: ['conditional']},
            {term: 'comer', source: 'comerían', rule: 'v', reasons: ['conditional']},
            {term: 'vivir', source: 'viviría', rule: 'v', reasons: ['conditional']},
            {term: 'vivir', source: 'vivirías', rule: 'v', reasons: ['conditional']},
            {term: 'vivir', source: 'viviría', rule: 'v', reasons: ['conditional']},
            {term: 'vivir', source: 'viviríamos', rule: 'v', reasons: ['conditional']},
            {term: 'vivir', source: 'viviríais', rule: 'v', reasons: ['conditional']},
            {term: 'vivir', source: 'vivirían', rule: 'v', reasons: ['conditional']},
        ],
    },
    {
        category: 'future',
        valid: true,
        tests: [
            {term: 'hablar', source: 'hablaré', rule: 'v', reasons: ['future']},
            {term: 'hablar', source: 'hablarás', rule: 'v', reasons: ['future']},
            {term: 'hablar', source: 'hablará', rule: 'v', reasons: ['future']},
            {term: 'hablar', source: 'hablaremos', rule: 'v', reasons: ['future']},
            {term: 'hablar', source: 'hablaréis', rule: 'v', reasons: ['future']},
            {term: 'hablar', source: 'hablarán', rule: 'v', reasons: ['future']},
            {term: 'comer', source: 'comeré', rule: 'v', reasons: ['future']},
            {term: 'comer', source: 'comerás', rule: 'v', reasons: ['future']},
            {term: 'comer', source: 'comerá', rule: 'v', reasons: ['future']},
            {term: 'comer', source: 'comeremos', rule: 'v', reasons: ['future']},
            {term: 'comer', source: 'comeréis', rule: 'v', reasons: ['future']},
            {term: 'comer', source: 'comerán', rule: 'v', reasons: ['future']},
            {term: 'vivir', source: 'viviré', rule: 'v', reasons: ['future']},
            {term: 'vivir', source: 'vivirás', rule: 'v', reasons: ['future']},
            {term: 'vivir', source: 'vivirá', rule: 'v', reasons: ['future']},
            {term: 'vivir', source: 'viviremos', rule: 'v', reasons: ['future']},
            {term: 'vivir', source: 'viviréis', rule: 'v', reasons: ['future']},
            {term: 'vivir', source: 'vivirán', rule: 'v', reasons: ['future']},
        ],
    },
    {
        category: 'present subjunctive',
        valid: true,
        tests: [
            {term: 'hablar', source: 'hable', rule: 'v', reasons: ['present subjunctive']},
            {term: 'hablar', source: 'hables', rule: 'v', reasons: ['present subjunctive']},
            {term: 'hablar', source: 'hable', rule: 'v', reasons: ['present subjunctive']},
            {term: 'hablar', source: 'hablemos', rule: 'v', reasons: ['present subjunctive']},
            {term: 'hablar', source: 'habléis', rule: 'v', reasons: ['present subjunctive']},
            {term: 'hablar', source: 'hablen', rule: 'v', reasons: ['present subjunctive']},
            {term: 'comer', source: 'coma', rule: 'v', reasons: ['present subjunctive']},
            {term: 'comer', source: 'comas', rule: 'v', reasons: ['present subjunctive']},
            {term: 'comer', source: 'coma', rule: 'v', reasons: ['present subjunctive']},
            {term: 'comer', source: 'comamos', rule: 'v', reasons: ['present subjunctive']},
            {term: 'comer', source: 'comáis', rule: 'v', reasons: ['present subjunctive']},
            {term: 'comer', source: 'coman', rule: 'v', reasons: ['present subjunctive']},
            {term: 'vivir', source: 'viva', rule: 'v', reasons: ['present subjunctive']},
            {term: 'vivir', source: 'vivas', rule: 'v', reasons: ['present subjunctive']},
            {term: 'vivir', source: 'viva', rule: 'v', reasons: ['present subjunctive']},
            {term: 'vivir', source: 'vivamos', rule: 'v', reasons: ['present subjunctive']},
            {term: 'vivir', source: 'viváis', rule: 'v', reasons: ['present subjunctive']},
            {term: 'vivir', source: 'vivan', rule: 'v', reasons: ['present subjunctive']},
        ],
    },
    {
        category: 'participle',
        valid: true,
        tests: [
            {term: 'escuchar', source: 'escuchado', rule: 'v', reasons: ['participle']},
        ],
    },
    {
        category: 'reflexive',
        valid: true,
        tests: [
            {term: 'lavar', source: 'lavarse', rule: 'v', reasons: ['reflexive']},
            {term: 'lavarse', source: 'lavarte', rule: 'v', reasons: ['pronoun substitution']},
            {term: 'lavarse', source: 'me lavar', rule: 'v', reasons: ['pronominal']},
        ],
    },

];

const languageTransformer = new LanguageTransformer();
languageTransformer.addDescriptor(spanishTransforms);
testLanguageTransformer(languageTransformer, tests);
