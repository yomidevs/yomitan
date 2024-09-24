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

/*
TODO
    Nouns
        inflectionalSuffixes
            -s (plural)
            -es (plural)
            -n (plural)
            -en (plural)
            -t (plural)
            -ekh (plural)
            -er (comparative)
    Verbs
        Past
            -t ge- +n
            -n ge- +n
            converbs
        Present
            inf (dictionary form)
            1st p. s. +n
            2nd p. s. -st +n
                2nd question form -stu +n
            3rd p. s. -t +n
            1st p. pl. (dict form)
            2nd p. pl -t +n
            3rd p. pl (dict form)
        Future
            (dict form)
        Converbs
    Adjectives
        -er
        -e
*/

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
    const match = (/[עװאאַױוײיִײַיאָ](?!.*[װאאַױוײיִײַיאָע])/).exec(str);
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
    },
    n: {
        name: 'Noun',
        isDictionaryForm: true,
        subConditions: ['np', 'ns'],
    },
    np: {
        name: 'Noun plural',
        isDictionaryForm: false,
    },
    ns: {
        name: 'Noun singular',
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
                suffixInflection('ס', '', ['np'], ['ns']),
                suffixInflection('ן', '', ['np'], ['ns']),
                suffixInflection('ים', '', ['np'], ['ns']),
                suffixInflection('ער', '', ['np'], ['ns']),
            ],
        },
        umlaut_plural: {
            name: 'umlaut_plural',
            description: 'plural form of a umlaut noun',
            rules: [
                umlautMutationSuffixInflection('ער', '', ['np'], ['ns']),
                umlautMutationSuffixInflection('לעך', '', ['np'], ['ns']),
            ],
        },
        diminutive: {
            name: 'diminutive',
            description: 'diminutive form of a noun',
            rules: [
                suffixInflection('לעך', '', ['n'], ['n']),
                suffixInflection('טשיק', '', ['n'], ['n']),
                suffixInflection('קע', '', ['n'], ['n']),
                umlautMutationSuffixInflection('ל', '', ['n'], ['n']),
                umlautMutationSuffixInflection('עלע', '', ['n'], ['n']),
            ],
        },
    },
};
