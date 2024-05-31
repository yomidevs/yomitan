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

import {suffixInflection, wholeWordInflection} from '../language-transforms.js';

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

/** @type {import('language-transformer').LanguageTransformDescriptor} */
export const spanishTransforms = {
    language: 'es',
    conditions: {
        v: {
            name: 'Verb',
            isDictionaryForm: true,
            subConditions: ['v_ar', 'v_er', 'v_ir'],
        },
        v_ar: {
            name: '-ar verb',
            isDictionaryForm: true,
        },
        v_er: {
            name: '-er verb',
            isDictionaryForm: true,
        },
        v_ir: {
            name: '-ir verb',
            isDictionaryForm: true,
        },
        n: {
            name: 'Noun',
            isDictionaryForm: true,
            subConditions: ['ns', 'np'],
        },
        np: {
            name: 'Noun plural',
            isDictionaryForm: true,
        },
        ns: {
            name: 'Noun singular',
            isDictionaryForm: true,
        },
        adj: {
            name: 'Adjective',
            isDictionaryForm: true,
        },
    },
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
            ],
        },
        'present indicative': {
            name: 'present indicative',
            description: 'Present indicative form of a verb',
            rules: [
                // -ar verbs
                suffixInflection('o', 'ar', ['v'], ['v']),
                suffixInflection('as', 'ar', ['v'], ['v']),
                suffixInflection('a', 'ar', ['v'], ['v']),
                suffixInflection('amos', 'ar', ['v'], ['v']),
                suffixInflection('áis', 'ar', ['v'], ['v']),
                suffixInflection('an', 'ar', ['v'], ['v']),
                // -er verbs
                suffixInflection('o', 'er', ['v'], ['v']),
                suffixInflection('es', 'er', ['v'], ['v']),
                suffixInflection('e', 'er', ['v'], ['v']),
                suffixInflection('emos', 'er', ['v'], ['v']),
                suffixInflection('éis', 'er', ['v'], ['v']),
                suffixInflection('en', 'er', ['v'], ['v']),
                // -ir verbs
                suffixInflection('o', 'ir', ['v'], ['v']),
                suffixInflection('es', 'ir', ['v'], ['v']),
                suffixInflection('e', 'ir', ['v'], ['v']),
                suffixInflection('imos', 'ir', ['v'], ['v']),
                suffixInflection('ís', 'ir', ['v'], ['v']),
                suffixInflection('en', 'ir', ['v'], ['v']),
                // -tener verbs
                suffixInflection('tengo', 'tener', ['v'], ['v']),
                suffixInflection('tienes', 'tener', ['v'], ['v']),
                suffixInflection('tiene', 'tener', ['v'], ['v']),
                suffixInflection('tenemos', 'tener', ['v'], ['v']),
                suffixInflection('tenéis', 'tener', ['v'], ['v']),
                suffixInflection('tienen', 'tener', ['v'], ['v']),
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
    },
};
