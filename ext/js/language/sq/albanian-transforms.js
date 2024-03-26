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

import {suffixInflection} from '../language-transforms.js';

/**
 * @param {string} inflectedSuffix
 * @param {string} deinflectedSuffix
 * @param {string[]} conditionsIn
 * @param {string[]} conditionsOut
 * @returns {import('language-transformer').Rule}
 */
function conjugationIISuffixInflection(inflectedSuffix, deinflectedSuffix, conditionsIn, conditionsOut) {
    return {
        ...suffixInflection(inflectedSuffix, deinflectedSuffix, conditionsIn, conditionsOut),
        type: 'other',
        isInflected: new RegExp('.*[^j]' + inflectedSuffix + '$')
    };
}

/** @type {import('language-transformer').LanguageTransformDescriptor} */
export const albanianTransforms = {
    language: 'sq',
    conditions: {
        v: {
            name: 'Verb',
            isDictionaryForm: true
        },
        n: {
            name: 'Noun',
            isDictionaryForm: true,
            subConditions: ['np', 'ns']
        },
        np: {
            name: 'Noun plural',
            isDictionaryForm: true
        },
        ns: {
            name: 'Noun singular',
            isDictionaryForm: true
        },
        adj: {
            name: 'Adjective',
            isDictionaryForm: true
        },
        adv: {
            name: 'Adverb',
            isDictionaryForm: true
        }
    },
    transforms: [
        // Nouns
        {
            name: 'definite',
            description: 'Definite form of a noun',
            rules: [
                // Masculine
                suffixInflection('ku', 'k', [], ['n']),
                suffixInflection('gu', 'g', [], ['n']),
                suffixInflection('hu', 'h', [], ['n']),
                suffixInflection('au', 'a', [], ['n']),
                suffixInflection('iu', 'i', [], ['n']),
                suffixInflection('eu', 'e', [], ['n']),
                suffixInflection('i', 'ë', [], ['n']),
                suffixInflection('i', '', [], ['n']),
                suffixInflection('ri', '', [], ['n']),
                suffixInflection('oi', 'ua', [], ['n']),
                // Feminine
                suffixInflection('a', 'ë', [], ['n']),
                suffixInflection('a', '', [], ['n']),
                suffixInflection('ja', 'e', [], ['n'])
            ]
        },
        {
            name: 'singular definite accusative',
            description: 'Singular definite accusative form of a noun',
            rules: [
                suffixInflection('n', '', [], ['n'])
            ]
        },
        {
            name: 'plural',
            description: 'Plural form of a noun',
            rules: [
                suffixInflection('e', '', ['np'], ['ns']),
                suffixInflection('t', '', ['np'], ['ns']) // Pijet
            ]
        },
        // Verbs
        {
            name: 'present indicative second-person singular',
            description: 'Present indicative second-person singular form of a verb',
            rules: [
                suffixInflection('on', 'oj', [], ['v']),
                suffixInflection('uan', 'uaj', [], ['v']),
                suffixInflection('n', 'j', [], ['v']), // Fshin
                suffixInflection('hesh', 'hem', [], ['v'])
            ]
        },
        {
            name: 'present indicative third-person singular',
            description: 'Present indicative third-person singular form of a verb',
            rules: [
                suffixInflection('on', 'oj', [], ['v']),
                suffixInflection('uan', 'uaj', [], ['v']),
                suffixInflection('n', 'j', [], ['v']), // Fshin
                suffixInflection('het', 'hem', [], ['v'])
            ]
        },
        {
            name: 'present indicative first-person plural',
            description: 'Present indicative first-person plural form of a verb',
            rules: [
                suffixInflection('më', '', [], ['v']), // Ndihmojmë, paguajmë, fshijmë
                suffixInflection('im', '', [], ['v']), // Vendosim, hapim
                suffixInflection('hemi', 'hem', [], ['v'])
            ]
        },
        {
            name: 'present indicative second-person plural',
            description: 'Present indicative second-person plural form of a verb',
            rules: [
                suffixInflection('ni', 'j', [], ['v']), // Ndihmoni, paguani, fshini
                suffixInflection('ni', '', [], ['v']), // Vendosni, hapni
                suffixInflection('heni', 'hem', [], ['v'])
            ]
        },
        {
            name: 'present indicative third-person plural',
            description: 'Present indicative third-person plural form of a verb',
            rules: [
                suffixInflection('në', '', [], ['v']), // Ndihmojnë, paguajnë, fshijnë
                suffixInflection('in', '', [], ['v']), // Vendosin, hapin
                suffixInflection('hen', 'hem', [], ['v'])
            ]
        },
        {
            name: 'imperfect first-person singular indicative',
            description: 'Imperfect first-person singular indicative form of a verb',
            rules: [
                suffixInflection('ja', 'j', [], ['v']), // Ndihmoja, paguaja, fshija
                suffixInflection('ja', '', [], ['v']), // Vendosja, hapja
                suffixInflection('hesha', 'hem', [], ['v'])
            ]
        },
        {
            name: 'imperfect second-person singular indicative',
            description: 'Imperfect second-person singular indicative form of a verb',
            rules: [
                suffixInflection('je', 'j', [], ['v']), // Ndihmoje, paguaje, fshije
                suffixInflection('je', '', [], ['v']), // Vendosje, hapje
                suffixInflection('heshe', 'hem', [], ['v'])
            ]
        },
        {
            name: 'imperfect third-person singular indicative',
            description: 'Imperfect third-person singular indicative form of a verb',
            rules: [
                suffixInflection('nte', 'j', [], ['v']), // Ndihmonte, paguante, fshinte
                suffixInflection('te', '', [], ['v']), // Vendoste, hapte
                suffixInflection('hej', 'hem', [], ['v'])
            ]
        },
        {
            name: 'imperfect first-person plural indicative',
            description: 'Imperfect first-person plural indicative form of a verb',
            rules: [
                suffixInflection('nim', 'j', [], ['v']), // Ndihmonim, paguanim, fshinim
                suffixInflection('nim', '', [], ['v']), // Vendosnim, hapnim
                suffixInflection('heshim', 'hem', [], ['v'])
            ]
        },
        {
            name: 'imperfect second-person plural indicative',
            description: 'Imperfect second-person plural indicative form of a verb',
            rules: [
                suffixInflection('nit', 'j', [], ['v']), // Ndihmonit, paguanit, fshinit
                suffixInflection('nit', '', [], ['v']), // Vendosnit, hapnit
                suffixInflection('heshit', 'hem', [], ['v'])
            ]
        },
        {
            name: 'imperfect third-person plural indicative',
            description: 'Imperfect third-person plural indicative form of a verb',
            rules: [
                suffixInflection('nin', 'j', [], ['v']), // Ndihmonin, paguanin, fshinin
                suffixInflection('nin', '', [], ['v']), // Vendosnin, hapnin
                suffixInflection('heshin', 'hem', [], ['v'])
            ]
        },
        {
            name: 'aorist first-person singular indicative',
            description: 'Aorist first-person singular indicative form of a verb',
            rules: [
                suffixInflection('ova', 'uaj', [], ['v']), // Pagova
                suffixInflection('va', 'j', [], ['v']), // Ndihmova, fshiva
                conjugationIISuffixInflection('a', '', [], ['v']) // Vendosa, hapa
            ]
        },
        {
            name: 'aorist second-person singular indicative',
            description: 'Aorist second-person singular indicative form of a verb',
            rules: [
                suffixInflection('ove', 'uaj', [], ['v']), // Pagove
                suffixInflection('ve', 'j', [], ['v']), // Ndihmove, fshive
                conjugationIISuffixInflection('e', '', [], ['v']) // Vendose, hape
            ]
        },
        {
            name: 'aorist third-person singular indicative',
            description: 'Aorist third-person singular indicative form of a verb',
            rules: [
                suffixInflection('oi', 'oj', [], ['v']), // Ndihmoi
                suffixInflection('oi', 'uaj', [], ['v']), // Pagoi
                suffixInflection('u', 'j', [], ['v']), // Fshiu
                conjugationIISuffixInflection('i', '', [], ['v']) // Vendosi, hapi
            ]
        },
        {
            name: 'aorist first-person plural indicative',
            description: 'Aorist first-person plural indicative form of a verb',
            rules: [
                suffixInflection('uam', 'oj', [], ['v']), // Ndihmuam
                suffixInflection('uam', 'uaj', [], ['v']), // Paguam
                suffixInflection('më', 'j', [], ['v']), // Fshimë
                conjugationIISuffixInflection('ëm', '', [], ['v']) // Vendosëm, hapëm
            ]
        },
        {
            name: 'aorist second-person plural indicative',
            description: 'Aorist second-person plural indicative form of a verb',
            rules: [
                suffixInflection('uat', 'oj', [], ['v']), // Ndihmuat
                suffixInflection('uat', 'uaj', [], ['v']), // Paguat
                suffixInflection('të', 'j', [], ['v']), // Fshitë
                conjugationIISuffixInflection('ët', '', [], ['v']) // Vendosët, hapët
            ]
        },
        {
            name: 'aorist third-person plural indicative',
            description: 'Aorist third-person plural indicative form of a verb',
            rules: [
                suffixInflection('uan', 'oj', [], ['v']), // Ndihmuan
                suffixInflection('uan', 'uaj', [], ['v']), // Paguan
                suffixInflection('në', 'j', [], ['v']), // Fshinë
                suffixInflection('ye', 'ej', [], ['v']), // U kthye ?
                conjugationIISuffixInflection('ën', '', [], ['v']) // Vendosën, hapën
            ]
        },
        {
            name: 'imperative second-person singular present',
            description: 'Imperative second-person singular present form of a verb',
            rules: [
                suffixInflection('o', 'oj', [], ['v']),
                suffixInflection('hu', 'hem', [], ['v']) // Kujtohu
            ]
        },
        {
            name: 'imperative second-person plural present',
            description: 'Imperative second-person plural present form of a verb',
            rules: [
                suffixInflection('ni', 'j', [], ['v']), // Ndihmoni, paguani, fshini
                suffixInflection('ni', '', [], ['v']), // Vendosni, hapni
                suffixInflection('huni', 'hem', [], ['v']) // Kujtohuni
            ]
        },
        {
            name: 'participle',
            description: 'Participle form of a verb',
            rules: [
                suffixInflection('uar', 'oj', [], ['v']),
                suffixInflection('ur', '', [], ['v']),
                suffixInflection('rë', 'j', [], ['v']), // Fshirë,
                suffixInflection('yer', 'ej', [], ['v']) // Shkëlqyer
            ]
        },
        {
            name: 'mediopassive',
            description: 'Mediopassive form of a verb',
            rules: [
                suffixInflection('hem', 'h', ['v'], ['v']),
                suffixInflection('hem', 'j', ['v'], ['v'])
            ]
        },
        {
            name: 'optative first-person singular present',
            description: 'Optative first-person singular present form of a verb',
            rules: [
                suffixInflection('fsha', 'j', [], ['v']) // Ndihmofsha
            ]
        },
        {
            name: 'optative second-person singular present',
            description: 'Optative second-person singular present form of a verb',
            rules: [
                suffixInflection('fsh', 'j', [], ['v']) // Ndihmofsh
            ]
        },
        {
            name: 'optative third-person singular present',
            description: 'Optative third-person singular present form of a verb',
            rules: [
                suffixInflection('ftë', 'j', [], ['v']) // Ndihmoftë
            ]
        },
        {
            name: 'optative first-person plural present',
            description: 'Optative first-person plural present form of a verb',
            rules: [
                suffixInflection('fshim', 'j', [], ['v']) // Ndihmofshim
            ]
        },
        {
            name: 'optative second-person plural present',
            description: 'Optative second-person plural present form of a verb',
            rules: [
                suffixInflection('fshi', 'j', [], ['v']) // Ndihmofshi
            ]
        },
        {
            name: 'optative third-person plural present',
            description: 'Optative third-person plural present form of a verb',
            rules: [
                suffixInflection('fshin', 'j', [], ['v']) // Ndihmofshin
            ]
        },
        {
            name: 'noun',
            description: 'Noun form of a verb',
            rules: [
                suffixInflection('im', 'oj', [], ['v']), // Gëzim, zbulim
                suffixInflection('im', 'ej', [], ['v']), // Përkthim
                suffixInflection('je', '', [], ['v']) // Lëvizje
            ]
        }
    ]
};
