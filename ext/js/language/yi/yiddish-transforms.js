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

const umlautTable = new Map([
    ['\u05e2', '\u05d0'], // Ayin to Shtumer alef
    ['\u05f2', '\u05f1'], // Tsvey yudn to Vov yud
    ['\u05d9', '\u05d5'], // Yud to Vov
]);

/**
 * @param {string} str
 * @returns {string}
 */
function umlautMutation(str) {
    const match = (/[\u05E2\u05F0\u05D0\uFB2E\u05F1\u05D5\u05F2\uFB1D\uFB1F\u05D9\uFB2F](?!.*[\u05E2\u05F0\u05D0\uFB2E\u05F1\u05D5\u05F2\uFB1D\uFB1F\u05D9\uFB2F])/).exec(str);
    if (match !== null && [...umlautTable.keys()].includes(str.charAt(match.index))) {
        str = str.substring(0, match.index) + umlautTable.get(str.charAt(match.index)) + str.substring(match.index + 1);
    }
    return str;
}

/**
 * @template {string} TCondition
 * @param {string} inflectedSuffix
 * @param {string} deinflectedSuffix
 * @param {TCondition[]} conditionsIn
 * @param {TCondition[]} conditionsOut
 * @returns {import('language-transformer').SuffixRule<TCondition>}
 */
function umlautMutationSuffixInflection(inflectedSuffix, deinflectedSuffix, conditionsIn, conditionsOut) {
    const suffixRegExp = new RegExp(inflectedSuffix + '$');
    return {
        type: 'suffix',
        isInflected: suffixRegExp,
        deinflected: deinflectedSuffix,
        deinflect: (text) => umlautMutation(text.slice(0, -inflectedSuffix.length)) + deinflectedSuffix,
        conditionsIn,
        conditionsOut,
    };
}

const conditions = {
    v: {
        name: 'Verb',
        isDictionaryForm: true,
        subConditions: ['vpast', 'vpresent'],
    },
    vpast: {
        name: 'Verb, past tense',
        isDictionaryForm: false,
    },
    vpresent: {
        name: 'Verb, present tense',
        isDictionaryForm: true,
    },
    n: {
        name: 'Noun',
        isDictionaryForm: true,
        subConditions: ['np', 'ns'],
    },
    np: {
        name: 'Noun, plural',
        isDictionaryForm: true,
    },
    ns: {
        name: 'Noun, singular',
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
};

/** @type {import('language-transformer').LanguageTransformDescriptor<Condition>} */
export const yiddishTransforms = {
    language: 'yi',
    conditions,
    transforms: {
        plural: {
            name: 'plural',
            description: 'plural form of a noun',
            rules: [
                suffixInflection('\u05E1', '', ['np'], ['ns']), // -s
                suffixInflection('\u05DF', '', ['np'], ['ns']), // -n
                suffixInflection('\u05D9\u05DD', '', ['np'], ['ns']), // -im
                suffixInflection('\u05E2\u05E8', '', ['np'], ['ns']), // -er
            ],
        },
        umlaut_plural: {
            name: 'umlaut_plural',
            description: 'plural form of a umlaut noun',
            rules: [
                umlautMutationSuffixInflection('\u05E2\u05E8', '', ['np'], ['ns']), // -er
                umlautMutationSuffixInflection('\u05DC\u05E2\u05DA', '', ['np'], ['ns']), // -lekh
            ],
        },
        diminutive: {
            name: 'diminutive',
            description: 'diminutive form of a noun',
            rules: [
                suffixInflection('\u05DC\u05E2\u05DA', '', ['n'], ['n']), // -lekh
                suffixInflection('\u05D8\u05E9\u05D9\u05E7', '', ['n'], ['n']), // -tshik
                suffixInflection('\u05E7\u05E2', '', ['n'], ['n']), // -ke
                umlautMutationSuffixInflection('\u05DC', '', ['n'], ['n']), // -l
                umlautMutationSuffixInflection('\u05E2\u05DC\u05E2', '', ['n'], ['n']), // -ele
            ],
        },
        verb_present_singular_to_first_person: {
            name: 'verb_present_singular_to_first_person',
            description: 'Turn the second and third person singular form to first person',
            rules: [
                suffixInflection('\u05E1\u05D8', '', ['v'], ['vpresent']), // -st
                suffixInflection('\u05D8', '', ['v'], ['vpresent']), // -t
                suffixInflection('\u05E0\u05D3\u05D9\u05E7', '', ['v'], ['vpresent']), // -ndik
            ],
        },
        verb_present_plural_to_first_person: {
            name: 'verb_present_plural_to_first_person',
            description: 'Turn the second plural form to first person plural form',
            rules: [
                suffixInflection('\u05D8\u05E1', '\u05E0', ['v'], ['vpresent']), // -ts
                suffixInflection('\u05D8', '\u05E0', ['v'], ['vpresent']), // -t
            ],
        },
    },
};
