/*
 * Copyright (C) 2026  Yomitan Authors
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

import {suffixInflection} from '../language-transforms.js';

/** @typedef {keyof typeof conditions} Condition */
const conditions = {
    n: {
        name: 'Noun',
        isDictionaryForm: true,
    },
    adj: {
        name: 'Adjective',
        isDictionaryForm: true,
    },
    adv: {
        name: 'Adverb',
        isDictionaryForm: true,
    },
    v: {
        name: 'Verb',
        isDictionaryForm: true,
    },
};


/** @type {import('language-transformer').LanguageTransformDescriptor<Condition>} */
export const basqueTransforms = {
    language: 'eu',
    conditions,
    transforms: {
        // Noun and Adjective Declensions
        'Absolutive Singular': {
            name: 'Absolutive Singular',
            rules: [suffixInflection('a', '', ['n', 'adj'], ['n', 'adj'])],
        },
        'Absolutive Plural': {
            name: 'Absolutive Plural',
            rules: [suffixInflection('ak', '', ['n', 'adj'], ['n', 'adj'])],
        },
        'Ergative Singular': {
            name: 'Ergative Singular',
            rules: [suffixInflection('ak', '', ['n', 'adj'], ['n', 'adj'])],
        },
        'Ergative Plural': {
            name: 'Ergative Plural',
            rules: [suffixInflection('ek', '', ['n', 'adj'], ['n', 'adj'])],
        },
        'Ergative Indefinite': {
            name: 'Ergative Indefinite',
            rules: [suffixInflection('k', '', ['n', 'adj'], ['n', 'adj'])],
        },
        'Dative Singular': {
            name: 'Dative Singular',
            rules: [suffixInflection('ari', '', ['n', 'adj'], ['n', 'adj'])],
        },
        'Dative Plural': {
            name: 'Dative Plural',
            rules: [suffixInflection('ei', '', ['n', 'adj'], ['n', 'adj'])],
        },
        'Dative Indefinite': {
            name: 'Dative Indefinite',
            rules: [suffixInflection('ri', '', ['n', 'adj'], ['n', 'adj'])],
        },
        'Genitive Singular': {
            name: 'Genitive Singular',
            rules: [suffixInflection('aren', '', ['n', 'adj'], ['n', 'adj'])],
        },
        'Genitive Plural': {
            name: 'Genitive Plural',
            rules: [suffixInflection('en', '', ['n', 'adj'], ['n', 'adj'])],
        },
        'Genitive Indefinite': {
            name: 'Genitive Indefinite',
            rules: [suffixInflection('ren', '', ['n', 'adj'], ['n', 'adj'])],
        },
        'Comitative Singular': {
            name: 'Comitative Singular',
            rules: [suffixInflection('arekin', '', ['n', 'adj'], ['n', 'adj'])],
        },
        'Comitative Plural': {
            name: 'Comitative Plural',
            rules: [suffixInflection('ekin', '', ['n', 'adj'], ['n', 'adj'])],
        },
        'Comitative Indefinite': {
            name: 'Comitative Indefinite',
            rules: [suffixInflection('rekin', '', ['n', 'adj'], ['n', 'adj'])],
        },
        'Benefactive Singular': {
            name: 'Benefactive Singular',
            rules: [suffixInflection('arentzat', '', ['n', 'adj', 'adv'], ['n', 'adj'])],
        },
        'Benefactive Plural': {
            name: 'Benefactive Plural',
            rules: [suffixInflection('entzat', '', ['n', 'adj', 'adv'], ['n', 'adj'])],
        },
        'Benefactive Indefinite': {
            name: 'Benefactive Indefinite',
            rules: [suffixInflection('rentzat', '', ['n', 'adj', 'adv'], ['n', 'adj'])],
        },
        'Instrumental Singular': {
            name: 'Instrumental Singular',
            rules: [suffixInflection('az', '', ['n', 'adj', 'adv'], ['n', 'adj'])],
        },
        'Instrumental Plural': {
            name: 'Instrumental Plural',
            rules: [suffixInflection('ez', '', ['n', 'adj', 'adv'], ['n', 'adj'])],
        },
        'Instrumental Indefinite': {
            name: 'Instrumental Indefinite',
            rules: [suffixInflection('z', '', ['n', 'adj', 'adv'], ['n', 'adj'])],
        },
        'Inessive Singular': {
            name: 'Inessive Singular',
            rules: [suffixInflection('an', '', ['n', 'adj'], ['n', 'adj'])],
        },
        'Inessive Plural': {
            name: 'Inessive Plural',
            rules: [suffixInflection('etan', '', ['n', 'adj'], ['n', 'adj'])],
        },
        'Inessive Indefinite': {
            name: 'Inessive Indefinite',
            rules: [suffixInflection('tan', '', ['n', 'adj'], ['n', 'adj'])],
        },
        'Allative Singular': {
            name: 'Allative Singular',
            rules: [suffixInflection('ra', '', ['n', 'adj'], ['n', 'adj'])],
        },
        'Allative Plural': {
            name: 'Allative Plural',
            rules: [suffixInflection('etara', '', ['n', 'adj'], ['n', 'adj'])],
        },
        'Allative Indefinite': {
            name: 'Allative Indefinite',
            rules: [suffixInflection('tara', '', ['n', 'adj'], ['n', 'adj'])],
        },
        'Ablative Singular': {
            name: 'Ablative Singular',
            rules: [suffixInflection('tik', '', ['n', 'adj'], ['n', 'adj'])],
        },
        'Ablative Plural': {
            name: 'Ablative Plural',
            rules: [suffixInflection('etatik', '', ['n', 'adj'], ['n', 'adj'])],
        },
        'Ablative Indefinite': {
            name: 'Ablative Indefinite',
            rules: [suffixInflection('tatik', '', ['n', 'adj'], ['n', 'adj'])],
        },
        'Locative Genitive Singular': {
            name: 'Locative Genitive Singular',
            rules: [suffixInflection('ko', '', ['n', 'adj'], ['n', 'adj'])],
        },
        'Locative Genitive Singular (Voiced)': {
            name: 'Locative Genitive Singular (Voiced)',
            rules: [suffixInflection('go', '', ['n', 'adj'], ['n', 'adj'])],
        },
        'Locative Genitive Plural': {
            name: 'Locative Genitive Plural',
            rules: [suffixInflection('etako', '', ['n', 'adj'], ['n', 'adj'])],
        },
        'Locative Genitive Indefinite': {
            name: 'Locative Genitive Indefinite',
            rules: [suffixInflection('tako', '', ['n', 'adj'], ['n', 'adj'])],
        },
        'Directional Allative Singular': {
            name: 'Directional Allative Singular',
            rules: [suffixInflection('rantz', '', ['n', 'adj'], ['n', 'adj'])],
        },
        'Directional Allative Plural': {
            name: 'Directional Allative Plural',
            rules: [suffixInflection('etarantz', '', ['n', 'adj'], ['n', 'adj'])],
        },
        'Directional Allative Indefinite': {
            name: 'Directional Allative Indefinite',
            rules: [suffixInflection('tarantz', '', ['n', 'adj'], ['n', 'adj'])],
        },
        'Terminative Allative Singular': {
            name: 'Terminative Allative Singular',
            rules: [suffixInflection('raino', '', ['n', 'adj'], ['n', 'adj'])],
        },
        'Terminative Allative Plural': {
            name: 'Terminative Allative Plural',
            rules: [suffixInflection('etaraino', '', ['n', 'adj'], ['n', 'adj'])],
        },
        'Terminative Allative Indefinite': {
            name: 'Terminative Allative Indefinite',
            rules: [suffixInflection('taraino', '', ['n', 'adj'], ['n', 'adj'])],
        },
        'Inessive Animate Singular': {
            name: 'Inessive Animate Singular',
            rules: [suffixInflection('arengan', '', ['n', 'adj'], ['n', 'adj'])],
        },
        'Inessive Animate Plural': {
            name: 'Inessive Animate Plural',
            rules: [suffixInflection('engan', '', ['n', 'adj'], ['n', 'adj'])],
        },
        'Inessive Animate Indefinite': {
            name: 'Inessive Animate Indefinite',
            rules: [suffixInflection('rengan', '', ['n', 'adj'], ['n', 'adj'])],
        },
        'Allative Animate Singular': {
            name: 'Allative Animate Singular',
            rules: [suffixInflection('arengana', '', ['n', 'adj'], ['n', 'adj'])],
        },
        'Allative Animate Plural': {
            name: 'Allative Animate Plural',
            rules: [suffixInflection('engana', '', ['n', 'adj'], ['n', 'adj'])],
        },
        'Allative Animate Indefinite': {
            name: 'Allative Animate Indefinite',
            rules: [suffixInflection('rengana', '', ['n', 'adj'], ['n', 'adj'])],
        },
        'Ablative Animate Singular': {
            name: 'Ablative Animate Singular',
            rules: [suffixInflection('arengandik', '', ['n', 'adj'], ['n', 'adj'])],
        },
        'Ablative Animate Plural': {
            name: 'Ablative Animate Plural',
            rules: [suffixInflection('engandik', '', ['n', 'adj'], ['n', 'adj'])],
        },
        'Ablative Animate Indefinite': {
            name: 'Ablative Animate Indefinite',
            rules: [suffixInflection('rengandik', '', ['n', 'adj'], ['n', 'adj'])],
        },
        'Directional Allative Animate Singular': {
            name: 'Directional Allative Animate Singular',
            rules: [suffixInflection('arenganantz', '', ['n', 'adj'], ['n', 'adj'])],
        },
        'Directional Allative Animate Plural': {
            name: 'Directional Allative Animate Plural',
            rules: [suffixInflection('enganantz', '', ['n', 'adj'], ['n', 'adj'])],
        },
        'Directional Allative Animate Indefinite': {
            name: 'Directional Allative Animate Indefinite',
            rules: [suffixInflection('renganantz', '', ['n', 'adj'], ['n', 'adj'])],
        },
        'Terminative Allative Animate Singular': {
            name: 'Terminative Allative Animate Singular',
            rules: [suffixInflection('arenganaino', '', ['n', 'adj'], ['n', 'adj'])],
        },
        'Terminative Allative Animate Plural': {
            name: 'Terminative Allative Animate Plural',
            rules: [suffixInflection('enganaino', '', ['n', 'adj'], ['n', 'adj'])],
        },
        'Terminative Allative Animate Indefinite': {
            name: 'Terminative Allative Animate Indefinite',
            rules: [suffixInflection('renganaino', '', ['n', 'adj'], ['n', 'adj'])],
        },
        // Verb Aspectual Forms
        'Future Participle': {
            name: 'Future Participle',
            rules: [suffixInflection('ko', '', ['v'], ['v'])],
        },
        'Future Participle (Voiced)': {
            name: 'Future Participle (Voiced)',
            rules: [suffixInflection('go', '', ['v'], ['v'])],
        },
        'Habitual to -tu': {
            name: 'Habitual to -tu',
            rules: [suffixInflection('tzen', 'tu', ['v'], ['v'])],
        },
        'Habitual to -tu (Soft)': {
            name: 'Habitual to -tu (Soft)',
            rules: [suffixInflection('ten', 'tu', ['v'], ['v'])],
        },
        'Habitual to -i': {
            name: 'Habitual to -i',
            rules: [suffixInflection('tzen', 'i', ['v'], ['v'])],
        },
        'Habitual to -n': {
            name: 'Habitual to -n',
            rules: [suffixInflection('ten', 'n', ['v'], ['v'])],
        },
        'Habitual to -si': {
            name: 'Habitual to -si',
            rules: [suffixInflection('sten', 'si', ['v'], ['v'])],
        },
        'Habitual to -tzi': {
            name: 'Habitual to -tzi',
            rules: [suffixInflection('zten', 'tzi', ['v'], ['v'])],
        },
        'Habitual to -tsi': {
            name: 'Habitual to -tsi',
            rules: [suffixInflection('sten', 'tsi', ['v'], ['v'])],
        },
        'Verbal Noun to -tu': {
            name: 'Verbal Noun to -tu',
            rules: [suffixInflection('tzea', 'tu', ['n'], ['v'])],
        },
        'Verbal Noun to -tu (Soft)': {
            name: 'Verbal Noun to -tu (Soft)',
            rules: [suffixInflection('tea', 'tu', ['n'], ['v'])],
        },
        'Verbal Noun to -i': {
            name: 'Verbal Noun to -i',
            rules: [suffixInflection('tzea', 'i', ['n'], ['v'])],
        },
        'Verbal Noun to -n': {
            name: 'Verbal Noun to -n',
            rules: [suffixInflection('tea', 'n', ['n'], ['v'])],
        },
        'Verbal Noun to -si': {
            name: 'Verbal Noun to -si',
            rules: [suffixInflection('stea', 'si', ['n'], ['v'])],
        },
        'Verbal Noun to -tzi': {
            name: 'Verbal Noun to -tzi',
            rules: [suffixInflection('ztea', 'tzi', ['n'], ['v'])],
        },
        'Adverbial Participle to -tu': {
            name: 'Adverbial Participle to -tu',
            rules: [suffixInflection('ta', '', ['adv'], ['v'])],
        },
        'Adverbial Participle after n': {
            name: 'Adverbial Participle after n',
            rules: [suffixInflection('da', '', ['adv'], ['v'])],
        },
        'Adverbial Participle to -i': {
            name: 'Adverbial Participle to -i',
            rules: [suffixInflection('ita', 'i', ['adv'], ['v'])],
        },
        'Negative/Adverbial Participle 1': {
            name: 'Negative/Adverbial Participle',
            rules: [suffixInflection('ik', '', ['adv'], ['v'])],
        },
        'Negative/Adverbial Participle 2': {
            name: 'Negative/Adverbial Participle 2',
            rules: [suffixInflection('rik', '', ['adv'], ['v'])],
        },
        // Adverbial
        'Adverbializer -ki': {
            name: 'Adverbializer -ki',
            rules: [suffixInflection('ki', '', ['adv'], ['n', 'adj'])],
        },
    },
};
