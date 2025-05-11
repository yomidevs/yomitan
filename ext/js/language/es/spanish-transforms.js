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

import {suffixInflection, wholeWordInflection} from '../language-transforms.js';

/** @typedef {keyof typeof conditions} Condition */
const REFLEXIVE_PATTERN = /\b(me|te|se|nos|os)\s+(\w+)(ar|er|ir)\b/g;

const ACCENTS = new Map([
    ['a', 'á'],
    ['e', 'é'],
    ['i', 'í'],
    ['o', 'ó'],
    ['u', 'ú'],
]);


/**
 * @param {string} char
 * @returns {string}
 */
function addAccent(char) {
    return ACCENTS.get(char) || char;
}

const conditions = {
    n: {
        name: 'Noun',
        isDictionaryForm: true,
        subConditions: ['ns', 'np'],
    },
    np: {
        name: 'Noun plural',
        isDictionaryForm: false,
    },
    ns: {
        name: 'Noun singular',
        isDictionaryForm: false,
    },
    v: {
        name: 'Verb',
        isDictionaryForm: true,
        subConditions: ['v_ar', 'v_er', 'v_ir'],
    },
    v_ar: {
        name: '-ar verb',
        isDictionaryForm: false,
    },
    v_er: {
        name: '-er verb',
        isDictionaryForm: false,
    },
    v_ir: {
        name: '-ir verb',
        isDictionaryForm: false,
    },
    adj: {
        name: 'Adjective',
        isDictionaryForm: true,
    },
};

/** @type {import('language-transformer').LanguageTransformDescriptor<keyof typeof conditions>} */
export const spanishTransforms = {
    language: 'es',
    conditions,
    transforms: {
        'plural': {
            name: 'plural',
            description: 'Plural form of a noun',
            rules: [
                suffixInflection('s', '', ['np'], ['ns']),
                suffixInflection('es', '', ['np'], ['ns']),
                suffixInflection('ces', 'z', ['np'], ['ns']), // 'lápices' -> lápiz
                ...[...'aeiou'].map((v) => suffixInflection(`${v}ses`, `${addAccent(v)}s`, ['np'], ['ns'])), // 'autobuses' -> autobús
                ...[...'aeiou'].map((v) => suffixInflection(`${v}nes`, `${addAccent(v)}n`, ['np'], ['ns'])), // 'canciones' -> canción
            ],
        },
        'feminine adjective': {
            name: 'feminine adjective',
            description: 'feminine form of an adjective',
            rules: [
                suffixInflection('a', 'o', ['adj'], ['adj']),
                suffixInflection('a', '', ['adj'], ['adj']), // encantadora -> encantador, española -> español
                ...[...'aeio'].map((v) => suffixInflection(`${v}na`, `${addAccent(v)}n`, ['adj'], ['adj'])), // dormilona -> dormilón, chiquitina -> chiquitín
                ...[...'aeio'].map((v) => suffixInflection(`${v}sa`, `${addAccent(v)}s`, ['adj'], ['adj'])), // francesa -> francés
            ],
        },
        'present indicative': {
            name: 'present indicative',
            description: 'Present indicative form of a verb',
            rules: [
                // STEM-CHANGING RULES FIRST
                // e->ie for -ar
                {
                    type: 'other',
                    isInflected: /ie([a-z]*)(o|as|a|an)$/,
                    deinflect: (term) => term.replace(/ie/, 'e').replace(/(o|as|a|an)$/, 'ar'),
                    conditionsIn: ['v_ar'],
                    conditionsOut: ['v_ar'],
                },
                // e->ie for -er
                {
                    type: 'other',
                    isInflected: /ie([a-z]*)(o|es|e|en)$/,
                    deinflect: (term) => term.replace(/ie/, 'e').replace(/(o|es|e|en)$/, 'er'),
                    conditionsIn: ['v_er'],
                    conditionsOut: ['v_er'],
                },
                // e->ie for -ir
                {
                    type: 'other',
                    isInflected: /ie([a-z]*)(o|es|e|en)$/,
                    deinflect: (term) => term.replace(/ie/, 'e').replace(/(o|es|e|en)$/, 'ir'),
                    conditionsIn: ['v_ir'],
                    conditionsOut: ['v_ir'],
                },
                // o->ue for -ar
                {
                    type: 'other',
                    isInflected: /ue([a-z]*)(o|as|a|an)$/,
                    deinflect: (term) => {
                        // "jugar" (u->ue)
                        if (term.startsWith('jue')) {
                            return term.replace(/ue/, 'u').replace(/(o|as|a|an)$/, 'ar');
                        }
                        return term.replace(/ue/, 'o').replace(/(o|as|a|an)$/, 'ar');
                    },
                    conditionsIn: ['v_ar'],
                    conditionsOut: ['v_ar'],
                },
                // o->ue for -er
                {
                    type: 'other',
                    isInflected: /ue([a-z]*)(o|es|e|en)$/,
                    deinflect: (term) => {
                        // "oler" (o->hue)
                        if (term.startsWith('hue')) {
                            return term.replace(/hue/, 'o').replace(/(o|es|e|en)$/, 'er');
                        }
                        return term.replace(/ue/, 'o').replace(/(o|es|e|en)$/, 'er');
                    },
                    conditionsIn: ['v_er'],
                    conditionsOut: ['v_er'],
                },
                // o->ue for -ir
                {
                    type: 'other',
                    isInflected: /ue([a-z]*)(o|es|e|en)$/,
                    deinflect: (term) => term.replace(/ue/, 'o').replace(/(o|es|e|en)$/, 'ir'),
                    conditionsIn: ['v_ir'],
                    conditionsOut: ['v_ir'],
                },
                // e->i for -ir
                {
                    type: 'other',
                    isInflected: /i([a-z]*)(o|es|e|en)$/,
                    deinflect: (term) => term.replace(/i/, 'e').replace(/(o|es|e|en)$/, 'ir'),
                    conditionsIn: ['v_ir'],
                    conditionsOut: ['v_ir'],
                },
                // -ar verbs
                suffixInflection('o', 'ar', ['v_ar'], ['v_ar']),
                suffixInflection('as', 'ar', ['v_ar'], ['v_ar']),
                suffixInflection('a', 'ar', ['v_ar'], ['v_ar']),
                suffixInflection('amos', 'ar', ['v_ar'], ['v_ar']),
                suffixInflection('áis', 'ar', ['v_ar'], ['v_ar']),
                suffixInflection('an', 'ar', ['v_ar'], ['v_ar']),
                // -er verbs
                suffixInflection('o', 'er', ['v_er'], ['v_er']),
                suffixInflection('es', 'er', ['v_er'], ['v_er']),
                suffixInflection('e', 'er', ['v_er'], ['v_er']),
                suffixInflection('emos', 'er', ['v_er'], ['v_er']),
                suffixInflection('éis', 'er', ['v_er'], ['v_er']),
                suffixInflection('en', 'er', ['v_er'], ['v_er']),
                // -ir verbs
                suffixInflection('o', 'ir', ['v_ir'], ['v_ir']),
                suffixInflection('es', 'ir', ['v_ir'], ['v_ir']),
                suffixInflection('e', 'ir', ['v_ir'], ['v_ir']),
                suffixInflection('imos', 'ir', ['v_ir'], ['v_ir']),
                suffixInflection('ís', 'ir', ['v_ir'], ['v_ir']),
                suffixInflection('en', 'ir', ['v_ir'], ['v_ir']),
                // i -> y verbs (incluir, huir, construir...)
                suffixInflection('uyo', 'uir', ['v_ir'], ['v_ir']),
                suffixInflection('uyes', 'uir', ['v_ir'], ['v_ir']),
                suffixInflection('uye', 'uir', ['v_ir'], ['v_ir']),
                suffixInflection('uyen', 'uir', ['v_ir'], ['v_ir']),
                // -tener verbs
                suffixInflection('tengo', 'tener', ['v'], ['v']),
                suffixInflection('tienes', 'tener', ['v'], ['v']),
                suffixInflection('tiene', 'tener', ['v'], ['v']),
                suffixInflection('tenemos', 'tener', ['v'], ['v']),
                suffixInflection('tenéis', 'tener', ['v'], ['v']),
                suffixInflection('tienen', 'tener', ['v'], ['v']),
                // -oír verbs
                suffixInflection('oigo', 'oír', ['v'], ['v']),
                suffixInflection('oyes', 'oír', ['v'], ['v']),
                suffixInflection('oye', 'oír', ['v'], ['v']),
                suffixInflection('oímos', 'oír', ['v'], ['v']),
                suffixInflection('oís', 'oír', ['v'], ['v']),
                suffixInflection('oyen', 'oír', ['v'], ['v']),
                // -venir verbs
                suffixInflection('vengo', 'venir', ['v'], ['v']),
                suffixInflection('vienes', 'venir', ['v'], ['v']),
                suffixInflection('viene', 'venir', ['v'], ['v']),
                suffixInflection('venimos', 'venir', ['v'], ['v']),
                suffixInflection('venís', 'venir', ['v'], ['v']),
                suffixInflection('vienen', 'venir', ['v'], ['v']),
                // Verbs with Irregular Yo Forms
                // -guir, -ger, or -gir verbs
                suffixInflection('go', 'guir', ['v'], ['v']),
                suffixInflection('jo', 'ger', ['v'], ['v']),
                suffixInflection('jo', 'gir', ['v'], ['v']),
                suffixInflection('aigo', 'aer', ['v'], ['v']),
                suffixInflection('zco', 'cer', ['v'], ['v']),
                suffixInflection('zco', 'cir', ['v'], ['v']),
                suffixInflection('hago', 'hacer', ['v'], ['v']),
                suffixInflection('pongo', 'poner', ['v'], ['v']),
                suffixInflection('lgo', 'lir', ['v'], ['v']),
                suffixInflection('lgo', 'ler', ['v'], ['v']),
                wholeWordInflection('quepo', 'caber', ['v'], ['v']),
                wholeWordInflection('doy', 'dar', ['v'], ['v']),
                wholeWordInflection('sé', 'saber', ['v'], ['v']),
                wholeWordInflection('veo', 'ver', ['v'], ['v']),
                // Ser, estar, ir, haber
                wholeWordInflection('soy', 'ser', ['v'], ['v']),
                wholeWordInflection('eres', 'ser', ['v'], ['v']),
                wholeWordInflection('es', 'ser', ['v'], ['v']),
                wholeWordInflection('somos', 'ser', ['v'], ['v']),
                wholeWordInflection('sois', 'ser', ['v'], ['v']),
                wholeWordInflection('son', 'ser', ['v'], ['v']),
                wholeWordInflection('estoy', 'estar', ['v'], ['v']),
                wholeWordInflection('estás', 'estar', ['v'], ['v']),
                wholeWordInflection('está', 'estar', ['v'], ['v']),
                wholeWordInflection('estamos', 'estar', ['v'], ['v']),
                wholeWordInflection('estáis', 'estar', ['v'], ['v']),
                wholeWordInflection('están', 'estar', ['v'], ['v']),
                wholeWordInflection('voy', 'ir', ['v'], ['v']),
                wholeWordInflection('vas', 'ir', ['v'], ['v']),
                wholeWordInflection('va', 'ir', ['v'], ['v']),
                wholeWordInflection('vamos', 'ir', ['v'], ['v']),
                wholeWordInflection('vais', 'ir', ['v'], ['v']),
                wholeWordInflection('van', 'ir', ['v'], ['v']),
                wholeWordInflection('he', 'haber', ['v'], ['v']),
                wholeWordInflection('has', 'haber', ['v'], ['v']),
                wholeWordInflection('ha', 'haber', ['v'], ['v']),
                wholeWordInflection('hemos', 'haber', ['v'], ['v']),
                wholeWordInflection('habéis', 'haber', ['v'], ['v']),
                wholeWordInflection('han', 'haber', ['v'], ['v']),
            ],
        },
        'preterite': {
            name: 'preterite',
            description: 'Preterite (past) form of a verb',
            rules: [
                // e->i for -ir
                {
                    type: 'other',
                    isInflected: /i([a-z]*)(ió|ieron)$/, // this only happens in 3rd person - singular and plural
                    deinflect: (term) => term.replace(/i/, 'e').replace(/(ió|ieron)$/, 'ir'),
                    conditionsIn: ['v_ir'],
                    conditionsOut: ['v_ir'],
                },
                // o->u for -ir
                {
                    type: 'other',
                    isInflected: /u([a-z]*)(ió|ieron)$/,
                    deinflect: (term) => term.replace(/u/, 'o').replace(/(ió|ieron)$/, 'ir'),
                    conditionsIn: ['v_ir'],
                    conditionsOut: ['v_ir'],
                },
                // -ar verbs
                suffixInflection('é', 'ar', ['v_ar'], ['v_ar']),
                suffixInflection('aste', 'ar', ['v_ar'], ['v_ar']),
                suffixInflection('ó', 'ar', ['v_ar'], ['v_ar']),
                suffixInflection('amos', 'ar', ['v_ar'], ['v_ar']),
                suffixInflection('asteis', 'ar', ['v_ar'], ['v_ar']),
                suffixInflection('aron', 'ar', ['v_ar'], ['v_ar']),
                // -er verbs
                suffixInflection('í', 'er', ['v_er'], ['v_er']),
                suffixInflection('iste', 'er', ['v_er'], ['v_er']),
                suffixInflection('ió', 'er', ['v_er'], ['v_er']),
                suffixInflection('imos', 'er', ['v_er'], ['v_er']),
                suffixInflection('isteis', 'er', ['v_er'], ['v_er']),
                suffixInflection('ieron', 'er', ['v_er'], ['v_er']),
                // -ir verbs
                suffixInflection('í', 'ir', ['v_ir'], ['v_ir']),
                suffixInflection('iste', 'ir', ['v_ir'], ['v_ir']),
                suffixInflection('ió', 'ir', ['v_ir'], ['v_ir']),
                suffixInflection('imos', 'ir', ['v_ir'], ['v_ir']),
                suffixInflection('isteis', 'ir', ['v_ir'], ['v_ir']),
                suffixInflection('ieron', 'ir', ['v_ir'], ['v_ir']),
                // -car, -gar, -zar verbs
                suffixInflection('qué', 'car', ['v'], ['v']),
                suffixInflection('gué', 'gar', ['v'], ['v']),
                suffixInflection('cé', 'zar', ['v'], ['v']),
                // -uir verbs
                suffixInflection('í', 'uir', ['v'], ['v']),
                // Verbs with irregular forms
                wholeWordInflection('fui', 'ser', ['v'], ['v']),
                wholeWordInflection('fuiste', 'ser', ['v'], ['v']),
                wholeWordInflection('fue', 'ser', ['v'], ['v']),
                wholeWordInflection('fuimos', 'ser', ['v'], ['v']),
                wholeWordInflection('fuisteis', 'ser', ['v'], ['v']),
                wholeWordInflection('fueron', 'ser', ['v'], ['v']),
                wholeWordInflection('fui', 'ir', ['v'], ['v']),
                wholeWordInflection('fuiste', 'ir', ['v'], ['v']),
                wholeWordInflection('fue', 'ir', ['v'], ['v']),
                wholeWordInflection('fuimos', 'ir', ['v'], ['v']),
                wholeWordInflection('fuisteis', 'ir', ['v'], ['v']),
                wholeWordInflection('fueron', 'ir', ['v'], ['v']),
                wholeWordInflection('di', 'dar', ['v'], ['v']),
                wholeWordInflection('diste', 'dar', ['v'], ['v']),
                wholeWordInflection('dio', 'dar', ['v'], ['v']),
                wholeWordInflection('dimos', 'dar', ['v'], ['v']),
                wholeWordInflection('disteis', 'dar', ['v'], ['v']),
                wholeWordInflection('dieron', 'dar', ['v'], ['v']),
                suffixInflection('hice', 'hacer', ['v'], ['v']),
                suffixInflection('hiciste', 'hacer', ['v'], ['v']),
                suffixInflection('hizo', 'hacer', ['v'], ['v']),
                suffixInflection('hicimos', 'hacer', ['v'], ['v']),
                suffixInflection('hicisteis', 'hacer', ['v'], ['v']),
                suffixInflection('hicieron', 'hacer', ['v'], ['v']),
                suffixInflection('puse', 'poner', ['v'], ['v']),
                suffixInflection('pusiste', 'poner', ['v'], ['v']),
                suffixInflection('puso', 'poner', ['v'], ['v']),
                suffixInflection('pusimos', 'poner', ['v'], ['v']),
                suffixInflection('pusisteis', 'poner', ['v'], ['v']),
                suffixInflection('pusieron', 'poner', ['v'], ['v']),
                suffixInflection('dije', 'decir', ['v'], ['v']),
                suffixInflection('dijiste', 'decir', ['v'], ['v']),
                suffixInflection('dijo', 'decir', ['v'], ['v']),
                suffixInflection('dijimos', 'decir', ['v'], ['v']),
                suffixInflection('dijisteis', 'decir', ['v'], ['v']),
                suffixInflection('dijeron', 'decir', ['v'], ['v']),
                suffixInflection('vine', 'venir', ['v'], ['v']),
                suffixInflection('viniste', 'venir', ['v'], ['v']),
                suffixInflection('vino', 'venir', ['v'], ['v']),
                suffixInflection('vinimos', 'venir', ['v'], ['v']),
                suffixInflection('vinisteis', 'venir', ['v'], ['v']),
                suffixInflection('vinieron', 'venir', ['v'], ['v']),
                wholeWordInflection('quise', 'querer', ['v'], ['v']),
                wholeWordInflection('quisiste', 'querer', ['v'], ['v']),
                wholeWordInflection('quiso', 'querer', ['v'], ['v']),
                wholeWordInflection('quisimos', 'querer', ['v'], ['v']),
                wholeWordInflection('quisisteis', 'querer', ['v'], ['v']),
                wholeWordInflection('quisieron', 'querer', ['v'], ['v']),
                suffixInflection('tuve', 'tener', ['v'], ['v']),
                suffixInflection('tuviste', 'tener', ['v'], ['v']),
                suffixInflection('tuvo', 'tener', ['v'], ['v']),
                suffixInflection('tuvimos', 'tener', ['v'], ['v']),
                suffixInflection('tuvisteis', 'tener', ['v'], ['v']),
                suffixInflection('tuvieron', 'tener', ['v'], ['v']),
                wholeWordInflection('pude', 'poder', ['v'], ['v']),
                wholeWordInflection('pudiste', 'poder', ['v'], ['v']),
                wholeWordInflection('pudo', 'poder', ['v'], ['v']),
                wholeWordInflection('pudimos', 'poder', ['v'], ['v']),
                wholeWordInflection('pudisteis', 'poder', ['v'], ['v']),
                wholeWordInflection('pudieron', 'poder', ['v'], ['v']),
                wholeWordInflection('supe', 'saber', ['v'], ['v']),
                wholeWordInflection('supiste', 'saber', ['v'], ['v']),
                wholeWordInflection('supo', 'saber', ['v'], ['v']),
                wholeWordInflection('supimos', 'saber', ['v'], ['v']),
                wholeWordInflection('supisteis', 'saber', ['v'], ['v']),
                wholeWordInflection('supieron', 'saber', ['v'], ['v']),
                wholeWordInflection('estuve', 'estar', ['v'], ['v']),
                wholeWordInflection('estuviste', 'estar', ['v'], ['v']),
                wholeWordInflection('estuvo', 'estar', ['v'], ['v']),
                wholeWordInflection('estuvimos', 'estar', ['v'], ['v']),
                wholeWordInflection('estuvisteis', 'estar', ['v'], ['v']),
                wholeWordInflection('estuvieron', 'estar', ['v'], ['v']),
                wholeWordInflection('anduve', 'andar', ['v'], ['v']),
                wholeWordInflection('anduviste', 'andar', ['v'], ['v']),
                wholeWordInflection('anduvo', 'andar', ['v'], ['v']),
                wholeWordInflection('anduvimos', 'andar', ['v'], ['v']),
                wholeWordInflection('anduvisteis', 'andar', ['v'], ['v']),
                wholeWordInflection('anduvieron', 'andar', ['v'], ['v']),
            ],
        },
        'imperfect': {
            name: 'imperfect',
            description: 'Imperfect form of a verb',
            rules: [
                // -ar verbs
                suffixInflection('aba', 'ar', ['v_ar'], ['v_ar']),
                suffixInflection('abas', 'ar', ['v_ar'], ['v_ar']),
                suffixInflection('aba', 'ar', ['v_ar'], ['v_ar']),
                suffixInflection('ábamos', 'ar', ['v_ar'], ['v_ar']),
                suffixInflection('abais', 'ar', ['v_ar'], ['v_ar']),
                suffixInflection('aban', 'ar', ['v_ar'], ['v_ar']),
                // -er verbs
                suffixInflection('ía', 'er', ['v_er'], ['v_er']),
                suffixInflection('ías', 'er', ['v_er'], ['v_er']),
                suffixInflection('ía', 'er', ['v_er'], ['v_er']),
                suffixInflection('íamos', 'er', ['v_er'], ['v_er']),
                suffixInflection('íais', 'er', ['v_er'], ['v_er']),
                suffixInflection('ían', 'er', ['v_er'], ['v_er']),
                // -ir verbs
                suffixInflection('ía', 'ir', ['v_ir'], ['v_ir']),
                suffixInflection('ías', 'ir', ['v_ir'], ['v_ir']),
                suffixInflection('ía', 'ir', ['v_ir'], ['v_ir']),
                suffixInflection('íamos', 'ir', ['v_ir'], ['v_ir']),
                suffixInflection('íais', 'ir', ['v_ir'], ['v_ir']),
                suffixInflection('ían', 'ir', ['v_ir'], ['v_ir']),
                // -ir verbs with stem changes
                suffixInflection('eía', 'ir', ['v_ir'], ['v_ir']),
                suffixInflection('eías', 'ir', ['v_ir'], ['v_ir']),
                suffixInflection('eía', 'ir', ['v_ir'], ['v_ir']),
                suffixInflection('eíamos', 'ir', ['v_ir'], ['v_ir']),
                suffixInflection('eíais', 'ir', ['v_ir'], ['v_ir']),
                suffixInflection('eían', 'ir', ['v_ir'], ['v_ir']),
                // irregular verbs ir, ser, ver
                wholeWordInflection('era', 'ser', ['v'], ['v']),
                wholeWordInflection('eras', 'ser', ['v'], ['v']),
                wholeWordInflection('era', 'ser', ['v'], ['v']),
                wholeWordInflection('éramos', 'ser', ['v'], ['v']),
                wholeWordInflection('erais', 'ser', ['v'], ['v']),
                wholeWordInflection('eran', 'ser', ['v'], ['v']),
                wholeWordInflection('iba', 'ir', ['v'], ['v']),
                wholeWordInflection('ibas', 'ir', ['v'], ['v']),
                wholeWordInflection('iba', 'ir', ['v'], ['v']),
                wholeWordInflection('íbamos', 'ir', ['v'], ['v']),
                wholeWordInflection('ibais', 'ir', ['v'], ['v']),
                wholeWordInflection('iban', 'ir', ['v'], ['v']),
                wholeWordInflection('veía', 'ver', ['v'], ['v']),
                wholeWordInflection('veías', 'ver', ['v'], ['v']),
                wholeWordInflection('veía', 'ver', ['v'], ['v']),
                wholeWordInflection('veíamos', 'ver', ['v'], ['v']),
                wholeWordInflection('veíais', 'ver', ['v'], ['v']),
                wholeWordInflection('veían', 'ver', ['v'], ['v']),
            ],
        },
        'progressive': {
            name: 'progressive',
            description: 'Progressive form of a verb',
            rules: [
                // e->i for -ir
                {
                    type: 'other',
                    isInflected: /i([a-z]*)(iendo)$/,
                    deinflect: (term) => term.replace(/i/, 'e').replace(/(iendo)$/, 'ir'),
                    conditionsIn: ['v_ir'],
                    conditionsOut: ['v_ir'],
                },
                // o->u for -er
                {
                    type: 'other',
                    isInflected: /u([a-z]*)(iendo)$/,
                    deinflect: (term) => term.replace(/u/, 'o').replace(/(iendo)$/, 'er'),
                    conditionsIn: ['v_er'],
                    conditionsOut: ['v_er'],
                },
                // o->u for -ir
                {
                    type: 'other',
                    isInflected: /u([a-z]*)(iendo)$/,
                    deinflect: (term) => term.replace(/u/, 'o').replace(/(iendo)$/, 'ir'),
                    conditionsIn: ['v_ir'],
                    conditionsOut: ['v_ir'],
                },
                // regular
                suffixInflection('ando', 'ar', ['v_ar'], ['v_ar']),
                suffixInflection('iendo', 'er', ['v_er'], ['v_er']),
                suffixInflection('iendo', 'ir', ['v_ir'], ['v_ir']),
                // vowel before the ending (-yendo)
                suffixInflection('ayendo', 'aer', ['v_er'], ['v_er']), // traer -> trayendo, caer -> cayendo
                suffixInflection('eyendo', 'eer', ['v_er'], ['v_er']), // leer -> leyendo
                suffixInflection('uyendo', 'uir', ['v_ir'], ['v_ir']), // huir -> huyendo
                // irregular
                wholeWordInflection('oyendo', 'oír', ['v'], ['v']),
                wholeWordInflection('yendo', 'ir', ['v'], ['v']),
            ],
        },
        'imperative': {
            name: 'imperative',
            description: 'Imperative form of a verb',
            rules: [
                {
                    type: 'other',
                    isInflected: /ie([a-z]*)(a|e|en)$/,
                    deinflect: (term) => term.replace(/ie/, 'e').replace(/(a|e|en)$/, 'ar'),
                    conditionsIn: ['v_ar'],
                    conditionsOut: ['v_ar'],
                },
                {
                    type: 'other',
                    isInflected: /ie([a-z]*)(e|a|an)$/,
                    deinflect: (term) => term.replace(/ie/, 'e').replace(/(e|a|an)$/, 'er'),
                    conditionsIn: ['v_er'],
                    conditionsOut: ['v_er'],
                },
                {
                    type: 'other',
                    isInflected: /ie([a-z]*)(e|a|an)$/,
                    deinflect: (term) => term.replace(/ie/, 'e').replace(/(e|a|an)$/, 'ir'),
                    conditionsIn: ['v_ir'],
                    conditionsOut: ['v_ir'],
                },
                {
                    type: 'other',
                    isInflected: /ue([a-z]*)(a|e|en)$/,
                    deinflect: (term) => {
                        if (term.startsWith('jue')) {
                            return term.replace(/ue/, 'u').replace(/(a|ue|uen)$/, 'ar');
                        }
                        return term.replace(/ue/, 'o').replace(/(a|e|en)$/, 'ar');
                    },
                    conditionsIn: ['v_ar'],
                    conditionsOut: ['v_ar'],
                },
                {
                    type: 'other',
                    isInflected: /ue([a-z]*)(e|a|an)$/,
                    deinflect: (term) => {
                        if (term.startsWith('hue')) {
                            return term.replace(/hue/, 'o').replace(/(e|a|an)$/, 'er');
                        }
                        return term.replace(/ue/, 'o').replace(/(e|a|an)$/, 'er');
                    },
                    conditionsIn: ['v_er'],
                    conditionsOut: ['v_er'],
                },
                {
                    type: 'other',
                    isInflected: /ue([a-z]*)(e|a|an)$/,
                    deinflect: (term) => term.replace(/ue/, 'o').replace(/(e|a|an)$/, 'ir'),
                    conditionsIn: ['v_ir'],
                    conditionsOut: ['v_ir'],
                },
                {
                    type: 'other',
                    isInflected: /i([a-z]*)(e|a|an)$/,
                    deinflect: (term) => term.replace(/i/, 'e').replace(/(e|a|an)$/, 'ir'),
                    conditionsIn: ['v_ir'],
                    conditionsOut: ['v_ir'],
                },
                // -ar verbs
                suffixInflection('a', 'ar', ['v_ar'], ['v_ar']),
                suffixInflection('emos', 'ar', ['v_ar'], ['v_ar']),
                suffixInflection('ad', 'ar', ['v_ar'], ['v_ar']),
                // -er verbs
                suffixInflection('e', 'er', ['v_er'], ['v_er']),
                suffixInflection('amos', 'ar', ['v_er'], ['v_er']),
                suffixInflection('ed', 'er', ['v_er'], ['v_er']),
                // -ir verbs
                suffixInflection('e', 'ir', ['v_ir'], ['v_ir']),
                suffixInflection('amos', 'ar', ['v_ir'], ['v_ir']),
                suffixInflection('id', 'ir', ['v_ir'], ['v_ir']),
                // irregular verbs
                wholeWordInflection('diga', 'decir', ['v'], ['v']),
                wholeWordInflection('sé', 'ser', ['v'], ['v']),
                wholeWordInflection('ve', 'ir', ['v'], ['v']),
                wholeWordInflection('ten', 'tener', ['v'], ['v']),
                wholeWordInflection('ven', 'venir', ['v'], ['v']),
                wholeWordInflection('haz', 'hacer', ['v'], ['v']),
                wholeWordInflection('di', 'decir', ['v'], ['v']),
                wholeWordInflection('pon', 'poner', ['v'], ['v']),
                wholeWordInflection('sal', 'salir', ['v'], ['v']),
                // negative commands
                // -ar verbs
                suffixInflection('es', 'ar', ['v_ar'], ['v_ar']),
                suffixInflection('emos', 'ar', ['v_ar'], ['v_ar']),
                suffixInflection('éis', 'ar', ['v_ar'], ['v_ar']),
                // -er verbs
                suffixInflection('as', 'er', ['v_er'], ['v_er']),
                suffixInflection('amos', 'er', ['v_er'], ['v_er']),
                suffixInflection('áis', 'er', ['v_er'], ['v_er']),
                // -ir verbs
                suffixInflection('as', 'ir', ['v_ir'], ['v_ir']),
                suffixInflection('amos', 'ir', ['v_ir'], ['v_ir']),
                suffixInflection('áis', 'ir', ['v_ir'], ['v_ir']),
            ],
        },
        'conditional': {
            name: 'conditional',
            description: 'Conditional form of a verb',
            rules: [
                suffixInflection('ía', '', ['v'], ['v']),
                suffixInflection('ías', '', ['v'], ['v']),
                suffixInflection('ía', '', ['v'], ['v']),
                suffixInflection('íamos', '', ['v'], ['v']),
                suffixInflection('íais', '', ['v'], ['v']),
                suffixInflection('ían', '', ['v'], ['v']),
                // irregular verbs
                wholeWordInflection('diría', 'decir', ['v'], ['v']),
                wholeWordInflection('dirías', 'decir', ['v'], ['v']),
                wholeWordInflection('diría', 'decir', ['v'], ['v']),
                wholeWordInflection('diríamos', 'decir', ['v'], ['v']),
                wholeWordInflection('diríais', 'decir', ['v'], ['v']),
                wholeWordInflection('dirían', 'decir', ['v'], ['v']),
                wholeWordInflection('haría', 'hacer', ['v'], ['v']),
                wholeWordInflection('harías', 'hacer', ['v'], ['v']),
                wholeWordInflection('haría', 'hacer', ['v'], ['v']),
                wholeWordInflection('haríamos', 'hacer', ['v'], ['v']),
                wholeWordInflection('haríais', 'hacer', ['v'], ['v']),
                wholeWordInflection('harían', 'hacer', ['v'], ['v']),
                wholeWordInflection('pondría', 'poner', ['v'], ['v']),
                wholeWordInflection('pondrías', 'poner', ['v'], ['v']),
                wholeWordInflection('pondría', 'poner', ['v'], ['v']),
                wholeWordInflection('pondríamos', 'poner', ['v'], ['v']),
                wholeWordInflection('pondríais', 'poner', ['v'], ['v']),
                wholeWordInflection('pondrían', 'poner', ['v'], ['v']),
                wholeWordInflection('saldría', 'salir', ['v'], ['v']),
                wholeWordInflection('saldrías', 'salir', ['v'], ['v']),
                wholeWordInflection('saldría', 'salir', ['v'], ['v']),
                wholeWordInflection('saldríamos', 'salir', ['v'], ['v']),
                wholeWordInflection('saldríais', 'salir', ['v'], ['v']),
                wholeWordInflection('saldrían', 'salir', ['v'], ['v']),
                wholeWordInflection('tendría', 'tener', ['v'], ['v']),
                wholeWordInflection('tendrías', 'tener', ['v'], ['v']),
                wholeWordInflection('tendría', 'tener', ['v'], ['v']),
                wholeWordInflection('tendríamos', 'tener', ['v'], ['v']),
                wholeWordInflection('tendríais', 'tener', ['v'], ['v']),
                wholeWordInflection('tendrían', 'tener', ['v'], ['v']),
                wholeWordInflection('vendría', 'venir', ['v'], ['v']),
                wholeWordInflection('vendrías', 'venir', ['v'], ['v']),
                wholeWordInflection('vendría', 'venir', ['v'], ['v']),
                wholeWordInflection('vendríamos', 'venir', ['v'], ['v']),
                wholeWordInflection('vendríais', 'venir', ['v'], ['v']),
                wholeWordInflection('vendrían', 'venir', ['v'], ['v']),
                wholeWordInflection('querría', 'querer', ['v'], ['v']),
                wholeWordInflection('querrías', 'querer', ['v'], ['v']),
                wholeWordInflection('querría', 'querer', ['v'], ['v']),
                wholeWordInflection('querríamos', 'querer', ['v'], ['v']),
                wholeWordInflection('querríais', 'querer', ['v'], ['v']),
                wholeWordInflection('querrían', 'querer', ['v'], ['v']),
                wholeWordInflection('podría', 'poder', ['v'], ['v']),
                wholeWordInflection('podrías', 'poder', ['v'], ['v']),
                wholeWordInflection('podría', 'poder', ['v'], ['v']),
                wholeWordInflection('podríamos', 'poder', ['v'], ['v']),
                wholeWordInflection('podríais', 'poder', ['v'], ['v']),
                wholeWordInflection('podrían', 'poder', ['v'], ['v']),
                wholeWordInflection('sabría', 'saber', ['v'], ['v']),
                wholeWordInflection('sabrías', 'saber', ['v'], ['v']),
                wholeWordInflection('sabría', 'saber', ['v'], ['v']),
                wholeWordInflection('sabríamos', 'saber', ['v'], ['v']),
                wholeWordInflection('sabríais', 'saber', ['v'], ['v']),
                wholeWordInflection('sabrían', 'saber', ['v'], ['v']),
            ],
        },
        'future': {
            name: 'future',
            description: 'Future form of a verb',
            rules: [
                suffixInflection('é', '', ['v'], ['v']),
                suffixInflection('ás', '', ['v'], ['v']),
                suffixInflection('á', '', ['v'], ['v']),
                suffixInflection('emos', '', ['v'], ['v']),
                suffixInflection('éis', '', ['v'], ['v']),
                suffixInflection('án', '', ['v'], ['v']),
                // irregular verbs
                suffixInflection('diré', 'decir', ['v'], ['v']),
                suffixInflection('dirás', 'decir', ['v'], ['v']),
                suffixInflection('dirá', 'decir', ['v'], ['v']),
                suffixInflection('diremos', 'decir', ['v'], ['v']),
                suffixInflection('diréis', 'decir', ['v'], ['v']),
                suffixInflection('dirán', 'decir', ['v'], ['v']),
                wholeWordInflection('haré', 'hacer', ['v'], ['v']),
                wholeWordInflection('harás', 'hacer', ['v'], ['v']),
                wholeWordInflection('hará', 'hacer', ['v'], ['v']),
                wholeWordInflection('haremos', 'hacer', ['v'], ['v']),
                wholeWordInflection('haréis', 'hacer', ['v'], ['v']),
                wholeWordInflection('harán', 'hacer', ['v'], ['v']),
                suffixInflection('pondré', 'poner', ['v'], ['v']),
                suffixInflection('pondrás', 'poner', ['v'], ['v']),
                suffixInflection('pondrá', 'poner', ['v'], ['v']),
                suffixInflection('pondremos', 'poner', ['v'], ['v']),
                suffixInflection('pondréis', 'poner', ['v'], ['v']),
                suffixInflection('pondrán', 'poner', ['v'], ['v']),
                wholeWordInflection('saldré', 'salir', ['v'], ['v']),
                wholeWordInflection('saldrás', 'salir', ['v'], ['v']),
                wholeWordInflection('saldrá', 'salir', ['v'], ['v']),
                wholeWordInflection('saldremos', 'salir', ['v'], ['v']),
                wholeWordInflection('saldréis', 'salir', ['v'], ['v']),
                wholeWordInflection('saldrán', 'salir', ['v'], ['v']),
                suffixInflection('tendré', 'tener', ['v'], ['v']),
                suffixInflection('tendrás', 'tener', ['v'], ['v']),
                suffixInflection('tendrá', 'tener', ['v'], ['v']),
                suffixInflection('tendremos', 'tener', ['v'], ['v']),
                suffixInflection('tendréis', 'tener', ['v'], ['v']),
                suffixInflection('tendrán', 'tener', ['v'], ['v']),
                suffixInflection('vendré', 'venir', ['v'], ['v']),
                suffixInflection('vendrás', 'venir', ['v'], ['v']),
                suffixInflection('vendrá', 'venir', ['v'], ['v']),
                suffixInflection('vendremos', 'venir', ['v'], ['v']),
                suffixInflection('vendréis', 'venir', ['v'], ['v']),
                suffixInflection('vendrán', 'venir', ['v'], ['v']),
            ],
        },
        'present subjunctive': {
            name: 'present subjunctive',
            description: 'Present subjunctive form of a verb',
            rules: [
                // STEM-CHANGING RULES FIRST
                // e->ie for -ar
                {
                    type: 'other',
                    isInflected: /ie([a-z]*)(e|es|e|en)$/,
                    deinflect: (term) => term.replace(/ie/, 'e').replace(/(e|es|e|en)$/, 'ar'),
                    conditionsIn: ['v_ar'],
                    conditionsOut: ['v_ar'],
                },
                // e->ie for -er
                {
                    type: 'other',
                    isInflected: /ie([a-z]*)(a|as|a|an)$/,
                    deinflect: (term) => term.replace(/ie/, 'e').replace(/(a|as|a|an)$/, 'er'),
                    conditionsIn: ['v_er'],
                    conditionsOut: ['v_er'],
                },
                // e->ie for -ir
                {
                    type: 'other',
                    isInflected: /ie([a-z]*)(a|as|a|an)$/,
                    deinflect: (term) => term.replace(/ie/, 'e').replace(/(a|as|a|an)$/, 'ir'),
                    conditionsIn: ['v_ir'],
                    conditionsOut: ['v_ir'],
                },
                // o->ue for -ar
                {
                    type: 'other',
                    isInflected: /ue([a-z]*)(e|es|e|en)$/,
                    deinflect: (term) => {
                        // "jugar" (u->ue)
                        if (term.startsWith('jue')) {
                            return term.replace(/ue/, 'u').replace(/(ue|ues|ue|uen)$/, 'ar');
                        }
                        return term.replace(/ue/, 'o').replace(/(e|es|e|en)$/, 'ar');
                    },
                    conditionsIn: ['v_ar'],
                    conditionsOut: ['v_ar'],
                },
                // o->ue for -er
                {
                    type: 'other',
                    isInflected: /ue([a-z]*)(a|as|a|an)$/,
                    deinflect: (term) => {
                        if (term.startsWith('hue')) {
                            return term.replace(/hue/, 'o').replace(/(a|as|a|an)$/, 'er');
                        }
                        return term.replace(/ue/, 'o').replace(/(a|as|a|an)$/, 'er');
                    },
                    conditionsIn: ['v_er'],
                    conditionsOut: ['v_er'],
                },
                // o->ue for -ir
                {
                    type: 'other',
                    isInflected: /ue([a-z]*)(a|as|a|an)$/,
                    deinflect: (term) => term.replace(/ue/, 'o').replace(/(a|as|a|an)$/, 'ir'),
                    conditionsIn: ['v_ir'],
                    conditionsOut: ['v_ir'],
                },
                // e->i for -ir
                {
                    type: 'other',
                    isInflected: /i([a-z]*)(a|as|a|an)$/,
                    deinflect: (term) => term.replace(/i/, 'e').replace(/(a|as|a|an)$/, 'ir'),
                    conditionsIn: ['v_ir'],
                    conditionsOut: ['v_ir'],
                },
                // -ar verbs
                suffixInflection('e', 'ar', ['v_ar'], ['v_ar']),
                suffixInflection('es', 'ar', ['v_ar'], ['v_ar']),
                suffixInflection('e', 'ar', ['v_ar'], ['v_ar']),
                suffixInflection('emos', 'ar', ['v_ar'], ['v_ar']),
                suffixInflection('éis', 'ar', ['v_ar'], ['v_ar']),
                suffixInflection('en', 'ar', ['v_ar'], ['v_ar']),
                // -er verbs
                suffixInflection('a', 'er', ['v_er'], ['v_er']),
                suffixInflection('as', 'er', ['v_er'], ['v_er']),
                suffixInflection('a', 'er', ['v_er'], ['v_er']),
                suffixInflection('amos', 'er', ['v_er'], ['v_er']),
                suffixInflection('áis', 'er', ['v_er'], ['v_er']),
                suffixInflection('an', 'er', ['v_er'], ['v_er']),
                // -ir verbs
                suffixInflection('a', 'ir', ['v_ir'], ['v_ir']),
                suffixInflection('as', 'ir', ['v_ir'], ['v_ir']),
                suffixInflection('a', 'ir', ['v_ir'], ['v_ir']),
                suffixInflection('amos', 'ir', ['v_ir'], ['v_ir']),
                suffixInflection('áis', 'ir', ['v_ir'], ['v_ir']),
                suffixInflection('an', 'ir', ['v_ir'], ['v_ir']),
                // irregular verbs
                wholeWordInflection('dé', 'dar', ['v'], ['v']),
                wholeWordInflection('des', 'dar', ['v'], ['v']),
                wholeWordInflection('dé', 'dar', ['v'], ['v']),
                wholeWordInflection('demos', 'dar', ['v'], ['v']),
                wholeWordInflection('deis', 'dar', ['v'], ['v']),
                wholeWordInflection('den', 'dar', ['v'], ['v']),
                wholeWordInflection('esté', 'estar', ['v'], ['v']),
                wholeWordInflection('estés', 'estar', ['v'], ['v']),
                wholeWordInflection('esté', 'estar', ['v'], ['v']),
                wholeWordInflection('estemos', 'estar', ['v'], ['v']),
                wholeWordInflection('estéis', 'estar', ['v'], ['v']),
                wholeWordInflection('estén', 'estar', ['v'], ['v']),
                wholeWordInflection('sea', 'ser', ['v'], ['v']),
                wholeWordInflection('seas', 'ser', ['v'], ['v']),
                wholeWordInflection('sea', 'ser', ['v'], ['v']),
                wholeWordInflection('seamos', 'ser', ['v'], ['v']),
                wholeWordInflection('seáis', 'ser', ['v'], ['v']),
                wholeWordInflection('sean', 'ser', ['v'], ['v']),
                wholeWordInflection('vaya', 'ir', ['v'], ['v']),
                wholeWordInflection('vayas', 'ir', ['v'], ['v']),
                wholeWordInflection('vaya', 'ir', ['v'], ['v']),
                wholeWordInflection('vayamos', 'ir', ['v'], ['v']),
                wholeWordInflection('vayáis', 'ir', ['v'], ['v']),
                wholeWordInflection('vayan', 'ir', ['v'], ['v']),
                wholeWordInflection('haya', 'haber', ['v'], ['v']),
                wholeWordInflection('hayas', 'haber', ['v'], ['v']),
                wholeWordInflection('haya', 'haber', ['v'], ['v']),
                wholeWordInflection('hayamos', 'haber', ['v'], ['v']),
                wholeWordInflection('hayáis', 'haber', ['v'], ['v']),
                wholeWordInflection('hayan', 'haber', ['v'], ['v']),
                wholeWordInflection('sepa', 'saber', ['v'], ['v']),
                wholeWordInflection('sepas', 'saber', ['v'], ['v']),
                wholeWordInflection('sepa', 'saber', ['v'], ['v']),
                wholeWordInflection('sepamos', 'saber', ['v'], ['v']),
                wholeWordInflection('sepáis', 'saber', ['v'], ['v']),
                wholeWordInflection('sepan', 'saber', ['v'], ['v']),
            ],
        },
        'imperfect subjunctive': {
            name: 'imperfect subjunctive',
            description: 'Imperfect subjunctive form of a verb',
            rules: [
                // -ar verbs
                suffixInflection('ara', 'ar', ['v_ar'], ['v_ar']),
                suffixInflection('ase', 'ar', ['v_ar'], ['v_ar']),
                suffixInflection('aras', 'ar', ['v_ar'], ['v_ar']),
                suffixInflection('ases', 'ar', ['v_ar'], ['v_ar']),
                suffixInflection('ara', 'ar', ['v_ar'], ['v_ar']),
                suffixInflection('ase', 'ar', ['v_ar'], ['v_ar']),
                suffixInflection('áramos', 'ar', ['v_ar'], ['v_ar']),
                suffixInflection('ásemos', 'ar', ['v_ar'], ['v_ar']),
                suffixInflection('arais', 'ar', ['v_ar'], ['v_ar']),
                suffixInflection('aseis', 'ar', ['v_ar'], ['v_ar']),
                suffixInflection('aran', 'ar', ['v_ar'], ['v_ar']),
                suffixInflection('asen', 'ar', ['v_ar'], ['v_ar']),
                // -er verbs
                suffixInflection('iera', 'er', ['v_er'], ['v_er']),
                suffixInflection('iese', 'er', ['v_er'], ['v_er']),
                suffixInflection('ieras', 'er', ['v_er'], ['v_er']),
                suffixInflection('ieses', 'er', ['v_er'], ['v_er']),
                suffixInflection('iera', 'er', ['v_er'], ['v_er']),
                suffixInflection('iese', 'er', ['v_er'], ['v_er']),
                suffixInflection('iéramos', 'er', ['v_er'], ['v_er']),
                suffixInflection('iésemos', 'er', ['v_er'], ['v_er']),
                suffixInflection('ierais', 'er', ['v_er'], ['v_er']),
                suffixInflection('ieseis', 'er', ['v_er'], ['v_er']),
                suffixInflection('ieran', 'er', ['v_er'], ['v_er']),
                suffixInflection('iesen', 'er', ['v_er'], ['v_er']),
                // -ir verbs
                suffixInflection('iera', 'ir', ['v_ir'], ['v_ir']),
                suffixInflection('iese', 'ir', ['v_ir'], ['v_ir']),
                suffixInflection('ieras', 'ir', ['v_ir'], ['v_ir']),
                suffixInflection('ieses', 'ir', ['v_ir'], ['v_ir']),
                suffixInflection('iera', 'ir', ['v_ir'], ['v_ir']),
                suffixInflection('iese', 'ir', ['v_ir'], ['v_ir']),
                suffixInflection('iéramos', 'ir', ['v_ir'], ['v_ir']),
                suffixInflection('iésemos', 'ir', ['v_ir'], ['v_ir']),
                suffixInflection('ierais', 'ir', ['v_ir'], ['v_ir']),
                suffixInflection('ieseis', 'ir', ['v_ir'], ['v_ir']),
                suffixInflection('ieran', 'ir', ['v_ir'], ['v_ir']),
                suffixInflection('iesen', 'ir', ['v_ir'], ['v_ir']),
                // irregular verbs
                wholeWordInflection('fuera', 'ser', ['v'], ['v']),
                wholeWordInflection('fuese', 'ser', ['v'], ['v']),
                wholeWordInflection('fueras', 'ser', ['v'], ['v']),
                wholeWordInflection('fueses', 'ser', ['v'], ['v']),
                wholeWordInflection('fuera', 'ser', ['v'], ['v']),
                wholeWordInflection('fuese', 'ser', ['v'], ['v']),
                wholeWordInflection('fuéramos', 'ser', ['v'], ['v']),
                wholeWordInflection('fuésemos', 'ser', ['v'], ['v']),
                wholeWordInflection('fuerais', 'ser', ['v'], ['v']),
                wholeWordInflection('fueseis', 'ser', ['v'], ['v']),
                wholeWordInflection('fueran', 'ser', ['v'], ['v']),
                wholeWordInflection('fuesen', 'ser', ['v'], ['v']),
                wholeWordInflection('fuera', 'ir', ['v'], ['v']),
                wholeWordInflection('fuese', 'ir', ['v'], ['v']),
                wholeWordInflection('fueras', 'ir', ['v'], ['v']),
                wholeWordInflection('fueses', 'ir', ['v'], ['v']),
                wholeWordInflection('fuera', 'ir', ['v'], ['v']),
                wholeWordInflection('fuese', 'ir', ['v'], ['v']),
                wholeWordInflection('fuéramos', 'ir', ['v'], ['v']),
                wholeWordInflection('fuésemos', 'ir', ['v'], ['v']),
                wholeWordInflection('fuerais', 'ir', ['v'], ['v']),
                wholeWordInflection('fueseis', 'ir', ['v'], ['v']),
                wholeWordInflection('fueran', 'ir', ['v'], ['v']),
                wholeWordInflection('fuesen', 'ir', ['v'], ['v']),
            ],
        },
        'participle': {
            name: 'participle',
            description: 'Participle form of a verb',
            rules: [
                // -ar verbs
                suffixInflection('ado', 'ar', ['adj'], ['v_ar']),
                // -er verbs
                suffixInflection('ido', 'er', ['adj'], ['v_er']),
                // -ir verbs
                suffixInflection('ido', 'ir', ['adj'], ['v_ir']),
                // irregular verbs
                suffixInflection('oído', 'oír', ['adj'], ['v']),
                wholeWordInflection('dicho', 'decir', ['adj'], ['v']),
                wholeWordInflection('escrito', 'escribir', ['adj'], ['v']),
                wholeWordInflection('hecho', 'hacer', ['adj'], ['v']),
                wholeWordInflection('muerto', 'morir', ['adj'], ['v']),
                wholeWordInflection('puesto', 'poner', ['adj'], ['v']),
                wholeWordInflection('roto', 'romper', ['adj'], ['v']),
                wholeWordInflection('visto', 'ver', ['adj'], ['v']),
                wholeWordInflection('vuelto', 'volver', ['adj'], ['v']),
            ],
        },
        'reflexive': {
            name: 'reflexive',
            description: 'Reflexive form of a verb',
            rules: [
                suffixInflection('arse', 'ar', ['v_ar'], ['v_ar']),
                suffixInflection('erse', 'er', ['v_er'], ['v_er']),
                suffixInflection('irse', 'ir', ['v_ir'], ['v_ir']),
            ],
        },
        'pronoun substitution': {
            name: 'pronoun substitution',
            description: 'Substituted pronoun of a reflexive verb',
            rules: [
                suffixInflection('arme', 'arse', ['v_ar'], ['v_ar']),
                suffixInflection('arte', 'arse', ['v_ar'], ['v_ar']),
                suffixInflection('arnos', 'arse', ['v_er'], ['v_er']),
                suffixInflection('erme', 'erse', ['v_er'], ['v_er']),
                suffixInflection('erte', 'erse', ['v_er'], ['v_er']),
                suffixInflection('ernos', 'erse', ['v_er'], ['v_er']),
                suffixInflection('irme', 'irse', ['v_ir'], ['v_ir']),
                suffixInflection('irte', 'irse', ['v_ir'], ['v_ir']),
                suffixInflection('irnos', 'irse', ['v_ir'], ['v_ir']),
            ],
        },
        'pronominal': {
            // me despertar -> despertarse
            name: 'pronominal',
            description: 'Pronominal form of a verb',
            rules: [
                {
                    type: 'other',
                    isInflected: new RegExp(REFLEXIVE_PATTERN),
                    deinflect: (term) => {
                        return term.replace(REFLEXIVE_PATTERN, (_match, _pronoun, verb, ending) => `${verb}${ending}se`);
                    },
                    conditionsIn: ['v'],
                    conditionsOut: ['v'],
                },
            ],
        },
    },
};
