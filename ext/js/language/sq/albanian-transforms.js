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

/** @typedef {keyof typeof conditions} Condition */

/**
 * @param {string} inflectedSuffix
 * @param {string} deinflectedSuffix
 * @param {Condition[]} conditionsIn
 * @param {Condition[]} conditionsOut
 * @returns {import('language-transformer').Rule<Condition>}
 */
function conjugationIISuffixInflection(inflectedSuffix, deinflectedSuffix, conditionsIn, conditionsOut) {
    return {
        ...suffixInflection(inflectedSuffix, deinflectedSuffix, conditionsIn, conditionsOut),
        isInflected: new RegExp('.*[^j]' + inflectedSuffix + '$'),
        type: 'other',
    };
}

const conditions = {
    adj: {
        isDictionaryForm: true,
        name: 'Adjective',
    },
    adv: {
        isDictionaryForm: true,
        name: 'Adverb',
    },
    n: {
        isDictionaryForm: true,
        name: 'Noun',
        subConditions: ['np', 'ns'],
    },
    np: {
        isDictionaryForm: true,
        name: 'Noun plural',
    },
    ns: {
        isDictionaryForm: true,
        name: 'Noun singular',
    },
    v: {
        isDictionaryForm: true,
        name: 'Verb',
    },
};

/** @type {import('language-transformer').LanguageTransformDescriptor<Condition>} */
export const albanianTransforms = {
    conditions,
    language: 'sq',
    transforms: {
        'aorist first-person plural indicative': {
            description: 'Aorist first-person plural indicative form of a verb',
            name: 'aorist first-person plural indicative',
            rules: [
                suffixInflection('uam', 'oj', [], ['v']),
                suffixInflection('uam', 'uaj', [], ['v']),
                suffixInflection('më', 'j', [], ['v']),
                conjugationIISuffixInflection('ëm', '', [], ['v']),
            ],
        },
        'aorist first-person singular indicative': {
            description: 'Aorist first-person singular indicative form of a verb',
            name: 'aorist first-person singular indicative',
            rules: [
                suffixInflection('ova', 'uaj', [], ['v']),
                suffixInflection('va', 'j', [], ['v']),
                conjugationIISuffixInflection('a', '', [], ['v']),
            ],
        },
        'aorist second-person plural indicative': {
            description: 'Aorist second-person plural indicative form of a verb',
            name: 'aorist second-person plural indicative',
            rules: [
                suffixInflection('uat', 'oj', [], ['v']),
                suffixInflection('uat', 'uaj', [], ['v']),
                suffixInflection('të', 'j', [], ['v']),
                conjugationIISuffixInflection('ët', '', [], ['v']),
            ],
        },
        'aorist second-person singular indicative': {
            description: 'Aorist second-person singular indicative form of a verb',
            name: 'aorist second-person singular indicative',
            rules: [
                suffixInflection('ove', 'uaj', [], ['v']),
                suffixInflection('ve', 'j', [], ['v']),
                conjugationIISuffixInflection('e', '', [], ['v']),
            ],
        },
        'aorist third-person plural indicative': {
            description: 'Aorist third-person plural indicative form of a verb',
            name: 'aorist third-person plural indicative',
            rules: [
                suffixInflection('uan', 'oj', [], ['v']),
                suffixInflection('uan', 'uaj', [], ['v']),
                suffixInflection('në', 'j', [], ['v']),
                conjugationIISuffixInflection('ën', '', [], ['v']),
            ],
        },
        'aorist third-person singular indicative': {
            description: 'Aorist third-person singular indicative form of a verb',
            name: 'aorist third-person singular indicative',
            rules: [
                suffixInflection('oi', 'oj', [], ['v']),
                suffixInflection('oi', 'uaj', [], ['v']),
                suffixInflection('u', 'j', [], ['v']),
                conjugationIISuffixInflection('i', '', [], ['v']),
                suffixInflection('ye', 'ej', [], ['v']),
            ],
        },
        // Nouns
        'definite': {
            description: 'Definite form of a noun',
            name: 'definite',
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
                suffixInflection('ja', 'e', [], ['n']),
            ],
        },
        'imperative second-person plural present': {
            description: 'Imperative second-person plural present form of a verb',
            name: 'imperative second-person plural present',
            rules: [
                suffixInflection('ni', 'j', [], ['v']),
                suffixInflection('ni', '', [], ['v']),
                suffixInflection('huni', 'hem', [], ['v']),
            ],
        },
        'imperative second-person singular present': {
            description: 'Imperative second-person singular present form of a verb',
            name: 'imperative second-person singular present',
            rules: [
                suffixInflection('o', 'oj', [], ['v']),
                suffixInflection('hu', 'hem', [], ['v']),
            ],
        },
        'imperfect first-person plural indicative': {
            description: 'Imperfect first-person plural indicative form of a verb',
            name: 'imperfect first-person plural indicative',
            rules: [
                suffixInflection('nim', 'j', [], ['v']),
                suffixInflection('nim', '', [], ['v']),
                suffixInflection('heshim', 'hem', [], ['v']),
            ],
        },
        'imperfect first-person singular indicative': {
            description: 'Imperfect first-person singular indicative form of a verb',
            name: 'imperfect first-person singular indicative',
            rules: [
                suffixInflection('ja', 'j', [], ['v']),
                suffixInflection('ja', '', [], ['v']),
                suffixInflection('hesha', 'hem', [], ['v']),
            ],
        },
        'imperfect second-person plural indicative': {
            description: 'Imperfect second-person plural indicative form of a verb',
            name: 'imperfect second-person plural indicative',
            rules: [
                suffixInflection('nit', 'j', [], ['v']),
                suffixInflection('nit', '', [], ['v']),
                suffixInflection('heshit', 'hem', [], ['v']),
            ],
        },
        'imperfect second-person singular indicative': {
            description: 'Imperfect second-person singular indicative form of a verb',
            name: 'imperfect second-person singular indicative',
            rules: [
                suffixInflection('je', 'j', [], ['v']),
                suffixInflection('je', '', [], ['v']),
                suffixInflection('heshe', 'hem', [], ['v']),
            ],
        },
        'imperfect third-person plural indicative': {
            description: 'Imperfect third-person plural indicative form of a verb',
            name: 'imperfect third-person plural indicative',
            rules: [
                suffixInflection('nin', 'j', [], ['v']),
                suffixInflection('nin', '', [], ['v']),
                suffixInflection('heshin', 'hem', [], ['v']),
            ],
        },
        'imperfect third-person singular indicative': {
            description: 'Imperfect third-person singular indicative form of a verb',
            name: 'imperfect third-person singular indicative',
            rules: [
                suffixInflection('nte', 'j', [], ['v']),
                suffixInflection('te', '', [], ['v']),
                suffixInflection('hej', 'hem', [], ['v']),
            ],
        },
        'mediopassive': {
            description: 'Mediopassive form of a verb',
            name: 'mediopassive',
            rules: [
                suffixInflection('hem', 'h', ['v'], ['v']),
                suffixInflection('hem', 'j', ['v'], ['v']),
            ],
        },
        'nominalization': {
            description: 'Noun form of a verb',
            name: 'nominalization',
            rules: [
                suffixInflection('im', 'oj', [], ['v']),
                suffixInflection('im', 'ej', [], ['v']),
                suffixInflection('je', '', [], ['v']),
            ],
        },
        'optative first-person plural present': {
            description: 'Optative first-person plural present form of a verb',
            name: 'optative first-person plural present',
            rules: [
                suffixInflection('fshim', 'j', [], ['v']),
            ],
        },
        'optative first-person singular present': {
            description: 'Optative first-person singular present form of a verb',
            name: 'optative first-person singular present',
            rules: [
                suffixInflection('fsha', 'j', [], ['v']),
            ],
        },
        'optative second-person plural present': {
            description: 'Optative second-person plural present form of a verb',
            name: 'optative second-person plural present',
            rules: [
                suffixInflection('fshi', 'j', [], ['v']),
            ],
        },
        'optative second-person singular present': {
            description: 'Optative second-person singular present form of a verb',
            name: 'optative second-person singular present',
            rules: [
                suffixInflection('fsh', 'j', [], ['v']),
            ],
        },
        'optative third-person plural present': {
            description: 'Optative third-person plural present form of a verb',
            name: 'optative third-person plural present',
            rules: [
                suffixInflection('fshin', 'j', [], ['v']),
            ],
        },
        'optative third-person singular present': {
            description: 'Optative third-person singular present form of a verb',
            name: 'optative third-person singular present',
            rules: [
                suffixInflection('ftë', 'j', [], ['v']),
            ],
        },
        'participle': {
            description: 'Participle form of a verb',
            name: 'participle',
            rules: [
                suffixInflection('uar', 'oj', [], ['v']),
                suffixInflection('ur', '', [], ['v']),
                suffixInflection('rë', 'j', [], ['v']),
                suffixInflection('yer', 'ej', [], ['v']),
            ],
        },
        'plural': {
            description: 'Plural form of a noun',
            name: 'plural',
            rules: [
                suffixInflection('e', '', ['np'], ['ns']),
                suffixInflection('t', '', ['np'], ['ns']),
            ],
        },
        'present indicative first-person plural': {
            description: 'Present indicative first-person plural form of a verb',
            name: 'present indicative first-person plural',
            rules: [
                suffixInflection('më', '', [], ['v']),
                suffixInflection('im', '', [], ['v']),
                suffixInflection('hemi', 'hem', [], ['v']),
            ],
        },
        'present indicative second-person plural': {
            description: 'Present indicative second-person plural form of a verb',
            name: 'present indicative second-person plural',
            rules: [
                suffixInflection('ni', 'j', [], ['v']),
                suffixInflection('ni', '', [], ['v']),
                suffixInflection('heni', 'hem', [], ['v']),
            ],
        },
        // Verbs
        'present indicative second-person singular': {
            description: 'Present indicative second-person singular form of a verb',
            name: 'present indicative second-person singular',
            rules: [
                suffixInflection('on', 'oj', [], ['v']),
                suffixInflection('uan', 'uaj', [], ['v']),
                suffixInflection('n', 'j', [], ['v']),
                suffixInflection('hesh', 'hem', [], ['v']),
            ],
        },
        'present indicative third-person plural': {
            description: 'Present indicative third-person plural form of a verb',
            name: 'present indicative third-person plural',
            rules: [
                suffixInflection('në', '', [], ['v']),
                suffixInflection('in', '', [], ['v']),
                suffixInflection('hen', 'hem', [], ['v']),
            ],
        },
        'present indicative third-person singular': {
            description: 'Present indicative third-person singular form of a verb',
            name: 'present indicative third-person singular',
            rules: [
                suffixInflection('on', 'oj', [], ['v']),
                suffixInflection('uan', 'uaj', [], ['v']),
                suffixInflection('n', 'j', [], ['v']),
                suffixInflection('het', 'hem', [], ['v']),
            ],
        },
        'singular definite accusative': {
            description: 'Singular definite accusative form of a noun',
            name: 'singular definite accusative',
            rules: [
                suffixInflection('n', '', [], ['n']),
            ],
        },
    },
};
