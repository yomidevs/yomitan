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

import {prefixInflection, suffixInflection} from '../language-transforms.js';

const directObjectPronouns1st = ['ني', 'نا'];
const directObjectPronouns2nd = ['ك', 'كما', 'كم', 'كن'];
const directObjectPronouns3rd = ['ه', 'ها', 'هما', 'هم', 'هن'];
const directObjectPronouns = [...directObjectPronouns1st, ...directObjectPronouns2nd, ...directObjectPronouns3rd];
/**
 * @template {string} TCondition
 * @param {string} inflectedPrefix
 * @param {string} deinflectedPrefix
 * @param {string} initialStemSegment
 * @param {TCondition[]} conditionsIn
 * @param {TCondition[]} conditionsOut
 * @returns {import('language-transformer').Rule<TCondition>}
 */
function conditionalPrefixInflection(inflectedPrefix, deinflectedPrefix, initialStemSegment, conditionsIn, conditionsOut) {
    const prefixRegExp = new RegExp('^' + inflectedPrefix + initialStemSegment);
    return {
        type: 'prefix',
        isInflected: prefixRegExp,
        deinflect: (text) => deinflectedPrefix + text.slice(inflectedPrefix.length),
        conditionsIn,
        conditionsOut,
    };
}

/**
 * @template {string} TCondition
 * @param {string} inflectedSuffix
 * @param {string} deinflectedSuffix
 * @param {string} finalStemSegment
 * @param {TCondition[]} conditionsIn
 * @param {TCondition[]} conditionsOut
 * @returns {import('language-transformer').SuffixRule<TCondition>}
 */
function conditionalSuffixInflection(inflectedSuffix, deinflectedSuffix, finalStemSegment, conditionsIn, conditionsOut) {
    const suffixRegExp = new RegExp(finalStemSegment + inflectedSuffix + '$');
    return {
        type: 'suffix',
        isInflected: suffixRegExp,
        deinflected: deinflectedSuffix,
        deinflect: (text) => text.slice(0, -inflectedSuffix.length) + deinflectedSuffix,
        conditionsIn,
        conditionsOut,
    };
}

/** @typedef {keyof typeof conditions} Condition */
const conditions = {
    n: {
        name: 'Noun',
        isDictionaryForm: true,
        subConditions: ['n_p', 'n_s', 'n_d'],
    },
    n_p: {
        name: 'Noun with Prefix',
        isDictionaryForm: false,
    },
    n_s: {
        name: 'Noun with Suffix only',
        isDictionaryForm: false,
    },
    n_d: {
        name: 'Noun Dictionary Form',
        isDictionaryForm: true,
    },
    v: {
        name: 'Verb',
        isDictionaryForm: true,
        subConditions: ['pv'],
    },
    pv: {
        name: 'Perfect Verb',
        isDictionaryForm: true,
        subConditions: ['pv_p', 'pv_s', 'pv_d'],
    },
    pv_p: {
        name: 'Perfect Verb with Prefix',
        isDictionaryForm: false,
    },
    pv_s: {
        name: 'Perfect Verb with Suffix only',
        isDictionaryForm: false,
    },
    pv_d: {
        name: 'Perfect Verb Dictionary Form (no affixes)',
        isDictionaryForm: true,
    },
};

/** @type {import('language-transformer').LanguageTransformDescriptor<Condition>} */
export const arabicTransforms = {
    language: 'ar',
    conditions,
    transforms: {
        // General
        'Pref-Wa': {
            name: 'and',
            description: 'and (و); and, so (ف)',
            rules: [
                prefixInflection('و', '', ['pv_p'], ['pv_s', 'pv_d']),
                prefixInflection('ف', '', ['pv_p'], ['pv_s', 'pv_d']),
            ],
        },

        // Noun
        'NPref-Bi': {
            name: 'by, with',
            description: 'by, with',
            rules: [
                prefixInflection('ب', '', ['n_p'], ['n_s', 'n_d']),
                prefixInflection('وب', '', ['n_p'], ['n_s', 'n_d']),
                prefixInflection('فب', '', ['n_p'], ['n_s', 'n_d']),
            ],
        },
        'NPref-Ka': {
            name: 'like, such as',
            description: 'like, such as',
            rules: [
                prefixInflection('ك', '', ['n_p'], ['n_s', 'n_d']),
                prefixInflection('وك', '', ['n_p'], ['n_s', 'n_d']),
                prefixInflection('فك', '', ['n_p'], ['n_s', 'n_d']),
            ],
        },
        'NPref-Li': {
            name: 'for, to; indeed, truly',
            description: 'for, to (لِ); indeed, truly (لَ)',
            rules: [
                prefixInflection('ل', '', ['n_p'], ['n_s', 'n_d']),
                prefixInflection('ول', '', ['n_p'], ['n_s', 'n_d']),
                prefixInflection('فل', '', ['n_p'], ['n_s', 'n_d']),
            ],
        },
        'NPref-Al': {
            name: 'the',
            description: 'the',
            rules: [
                prefixInflection('ال', '', ['n_p'], ['n_s', 'n_d']),
                prefixInflection('وال', '', ['n_p'], ['n_s', 'n_d']),
                prefixInflection('فال', '', ['n_p'], ['n_s', 'n_d']),
            ],
        },
        'NPref-BiAl': {
            name: 'by/with + the',
            description: 'by/with + the',
            rules: [
                prefixInflection('بال', '', ['n_p'], ['n_s', 'n_d']),
                prefixInflection('وبال', '', ['n_p'], ['n_s', 'n_d']),
                prefixInflection('فبال', '', ['n_p'], ['n_s', 'n_d']),
            ],
        },
        'NPref-KaAl': {
            name: 'like/such as + the',
            description: 'like/such as + the',
            rules: [
                prefixInflection('كال', '', ['n_p'], ['n_s', 'n_d']),
                prefixInflection('وكال', '', ['n_p'], ['n_s', 'n_d']),
                prefixInflection('فكال', '', ['n_p'], ['n_s', 'n_d']),
            ],
        },
        'NPref-Lil': {
            name: 'for/to + the',
            description: 'for/to + the',
            rules: [
                conditionalPrefixInflection('لل', '', '(?!ل)', ['n_p'], ['n_s', 'n_d']),
                conditionalPrefixInflection('ولل', '', '(?!ل)', ['n_p'], ['n_s', 'n_d']),
                conditionalPrefixInflection('فلل', '', '(?!ل)', ['n_p'], ['n_s', 'n_d']),
            ],
        },
        'NPref-LiAl': {
            name: 'for/to + the',
            description: 'for/to + the, assimilated with initial ل',
            rules: [
                prefixInflection('لل', 'ل', ['n_p'], ['n_s', 'n_d']),
                prefixInflection('ولل', 'ل', ['n_p'], ['n_s', 'n_d']),
                prefixInflection('فلل', 'ل', ['n_p'], ['n_s', 'n_d']),
            ],
        },

        // Perfect Verb
        'PVPref-La': {
            name: 'would have',
            description: 'Result clause particle (if ... I would have ...)',
            rules: [prefixInflection('ل', '', ['pv_p'], ['pv_s', 'pv_d'])],
        },

        'PVSuff-ah': {
            name: 'Perfect Tense',
            description: 'Perfect Verb + D.O pronoun',
            rules: directObjectPronouns.map((p) => suffixInflection(p, '', ['pv_s'], ['pv_d'])),
        },
        'PVSuff-n': {
            name: 'Perfect Tense',
            description: 'Perfect Verb suffixes assimilating with ن',
            rules: [
                // Stem doesn't end in ن
                conditionalSuffixInflection('ن', '', '(?<!ن)', ['pv_s'], ['pv_d']),
                ...directObjectPronouns.map((p) => conditionalSuffixInflection(`ن${p}`, '', '(?<!ن)', ['pv_s'], ['pv_d'])),

                conditionalSuffixInflection('نا', '', '(?<!ن)', ['pv_s'], ['pv_d']),
                ...directObjectPronouns2nd.map((p) => conditionalSuffixInflection(`نا${p}`, '', '(?<!ن)', ['pv_s'], ['pv_d'])),
                ...directObjectPronouns3rd.map((p) => conditionalSuffixInflection(`نا${p}`, '', '(?<!ن)', ['pv_s'], ['pv_d'])),

                // Suffixes assimilated with stems ending in ن
                ...directObjectPronouns.map((p) => suffixInflection(`ن${p}`, 'ن', ['pv_s'], ['pv_d'])),

                suffixInflection('نا', 'ن', ['pv_s'], ['pv_d']),
                ...directObjectPronouns2nd.map((p) => suffixInflection(`نا${p}`, 'ن', ['pv_s'], ['pv_d'])),
                ...directObjectPronouns3rd.map((p) => suffixInflection(`نا${p}`, 'ن', ['pv_s'], ['pv_d'])),
            ],
        },
        'PVSuff-t': {
            name: 'Perfect Tense',
            description: 'Perfect Verb suffixes assimilating with ت',
            rules: [
                // This can either be 3rd p. f. singular, or 1st/2nd p. singular
                // The former doesn't assimilate, the latter do, so the below accounts for both
                suffixInflection('ت', '', ['pv_s'], ['pv_d']),
                ...directObjectPronouns.map((p) => suffixInflection(`ت${p}`, '', ['pv_s'], ['pv_d'])),

                // Stem doesn't end in ت
                conditionalSuffixInflection('تما', '', '(?<!ت)', ['pv_s'], ['pv_d']),
                ...directObjectPronouns1st.map((p) => conditionalSuffixInflection(`تما${p}`, '', '(?<!ت)', ['pv_s'], ['pv_d'])),
                ...directObjectPronouns3rd.map((p) => conditionalSuffixInflection(`تما${p}`, '', '(?<!ت)', ['pv_s'], ['pv_d'])),

                conditionalSuffixInflection('تم', '', '(?<!ت)', ['pv_s'], ['pv_d']),
                ...directObjectPronouns1st.map((p) => conditionalSuffixInflection(`تمو${p}`, '', '(?<!ت)', ['pv_s'], ['pv_d'])),
                ...directObjectPronouns3rd.map((p) => conditionalSuffixInflection(`تمو${p}`, '', '(?<!ت)', ['pv_s'], ['pv_d'])),

                conditionalSuffixInflection('تن', '', '(?<!ت)', ['pv_s'], ['pv_d']),
                ...directObjectPronouns1st.map((p) => conditionalSuffixInflection(`تن${p}`, '', '(?<!ت)', ['pv_s'], ['pv_d'])),
                ...directObjectPronouns3rd.map((p) => conditionalSuffixInflection(`تن${p}`, '', '(?<!ت)', ['pv_s'], ['pv_d'])),

                // Suffixes assimilated with stems ending in ت
                ...directObjectPronouns.map((p) => suffixInflection(`ت${p}`, 'ت', ['pv_s'], ['pv_d'])),

                suffixInflection('تما', 'ت', ['pv_s'], ['pv_d']),
                ...directObjectPronouns1st.map((p) => suffixInflection(`تما${p}`, 'ت', ['pv_s'], ['pv_d'])),
                ...directObjectPronouns3rd.map((p) => suffixInflection(`تما${p}`, 'ت', ['pv_s'], ['pv_d'])),

                suffixInflection('تم', 'ت', ['pv_s'], ['pv_d']),
                ...directObjectPronouns1st.map((p) => suffixInflection(`تمو${p}`, 'ت', ['pv_s'], ['pv_d'])),
                ...directObjectPronouns3rd.map((p) => suffixInflection(`تمو${p}`, 'ت', ['pv_s'], ['pv_d'])),

                suffixInflection('تن', 'ت', ['pv_s'], ['pv_d']),
                ...directObjectPronouns1st.map((p) => suffixInflection(`تن${p}`, 'ت', ['pv_s'], ['pv_d'])),
                ...directObjectPronouns3rd.map((p) => suffixInflection(`تن${p}`, 'ت', ['pv_s'], ['pv_d'])),
            ],
        },
        'PVSuff-at': {
            name: 'Perfect Tense',
            description: 'Perfect Verb non-assimilating ت suffixes',
            rules: [
                suffixInflection('تا', '', ['pv_s'], ['pv_d']),
                ...directObjectPronouns.map((p) => suffixInflection(`تا${p}`, '', ['pv_s'], ['pv_d'])),
            ],
        },
        'PVSuff-A': {
            name: 'Perfect Tense',
            description: 'Perfect Verb 3rd. m. dual',
            rules: [
                suffixInflection('ا', '', ['pv_s'], ['pv_d']),
                ...directObjectPronouns.map((p) => suffixInflection(`ا${p}`, '', ['pv_s'], ['pv_d'])),

                // Combines with أ to form آ
                suffixInflection('آ', 'أ', ['pv_s'], ['pv_d']),
                ...directObjectPronouns.map((p) => suffixInflection(`آ${p}`, 'أ', ['pv_s'], ['pv_d'])),
            ],
        },
        'PVSuff-uw': {
            name: 'Perfect Tense',
            description: 'Perfect Verb 3rd. m. pl.',
            rules: [
                suffixInflection('وا', '', ['pv_s'], ['pv_d']),
                ...directObjectPronouns.map((p) => suffixInflection(`و${p}`, '', ['pv_s'], ['pv_d'])),
            ],
        },
    },
};
