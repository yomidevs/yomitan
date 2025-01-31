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

/**
 * @template {string} TCondition
 * @param {string} inflectedPrefix
 * @param {string} deinflectedPrefix
 * @param {string} initialStemSegment
 * @param {TCondition[]} conditionsIn
 * @param {TCondition[]} conditionsOut
 * @returns {import('language-transformer').Rule<TCondition>}
 */
function conditionalPrefixInflection(
    inflectedPrefix,
    deinflectedPrefix,
    initialStemSegment,
    conditionsIn,
    conditionsOut,
) {
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
function conditionalSuffixInflection(
    inflectedSuffix,
    deinflectedSuffix,
    finalStemSegment,
    conditionsIn,
    conditionsOut,
) {
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
        subConditions: ['n_a', 'n_s', 'n_d'],
    },
    n_a: {
        name: 'Noun with Affixes',
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
        isDictionaryForm: false,
        subConditions: ['pv_a', 'pv_s', 'pv_d'],
    },
    pv_a: {
        name: 'Perfect Verb with Affixes',
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

/** @type {Condition[]} */
const condIn = ['pv_s'];
/** @type {Condition[]} */
const condInN = ['pv_s'];
/** @type {Condition[]} */
const condInT = ['pv_s'];
/** @type {Condition[]} */
const condInAT = ['pv_s'];
/** @type {Condition[]} */
const condInA = ['pv_s'];
/** @type {Condition[]} */
const condInUW = ['pv_s'];

/** @type {Condition[]} */
const condOut = ['pv_d'];
/** @type {Condition[]} */
const condOutN = ['pv_d'];
/** @type {Condition[]} */
const condOutT = ['pv_d'];
/** @type {Condition[]} */
const condOutAT = ['pv_d'];
/** @type {Condition[]} */
const condOutA = ['pv_d'];
/** @type {Condition[]} */
const condOutUW = ['pv_d'];

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
                prefixInflection('و', '', ['pv_a'], ['pv_s', 'pv_d']),
                prefixInflection('ف', '', ['pv_a'], ['pv_s', 'pv_d']),
            ],
        },

        // Noun
        'NPref-Bi': {
            name: 'by, with',
            description: 'by, with',
            rules: [
                prefixInflection('ب', '', ['n_a'], ['n_s', 'n_d']),
                prefixInflection('وب', '', ['n_a'], ['n_s', 'n_d']),
                prefixInflection('فب', '', ['n_a'], ['n_s', 'n_d']),
            ],
        },
        'NPref-Ka': {
            name: 'like, such as',
            description: 'like, such as',
            rules: [
                prefixInflection('ك', '', ['n_a'], ['n_s', 'n_d']),
                prefixInflection('وك', '', ['n_a'], ['n_s', 'n_d']),
                prefixInflection('فك', '', ['n_a'], ['n_s', 'n_d']),
            ],
        },
        'NPref-Li': {
            name: 'for, to; indeed, truly',
            description: 'for, to (لِ); indeed, truly (لَ)',
            rules: [
                prefixInflection('ل', '', ['n_a'], ['n_s', 'n_d']),
                prefixInflection('ول', '', ['n_a'], ['n_s', 'n_d']),
                prefixInflection('فل', '', ['n_a'], ['n_s', 'n_d']),
            ],
        },
        'NPref-Al': {
            name: 'the',
            description: 'the',
            rules: [
                prefixInflection('ال', '', ['n_a'], ['n_s', 'n_d']),
                prefixInflection('وال', '', ['n_a'], ['n_s', 'n_d']),
                prefixInflection('فال', '', ['n_a'], ['n_s', 'n_d']),
            ],
        },
        'NPref-BiAl': {
            name: 'by/with + the',
            description: 'by/with + the',
            rules: [
                prefixInflection('بال', '', ['n_a'], ['n_s', 'n_d']),
                prefixInflection('وبال', '', ['n_a'], ['n_s', 'n_d']),
                prefixInflection('فبال', '', ['n_a'], ['n_s', 'n_d']),
            ],
        },
        'NPref-KaAl': {
            name: 'like/such as + the',
            description: 'like/such as + the',
            rules: [
                prefixInflection('كال', '', ['n_a'], ['n_s', 'n_d']),
                prefixInflection('وكال', '', ['n_a'], ['n_s', 'n_d']),
                prefixInflection('فكال', '', ['n_a'], ['n_s', 'n_d']),
            ],
        },
        'NPref-Lil': {
            name: 'for/to + the',
            description: 'for/to + the',
            rules: [
                conditionalPrefixInflection('لل', '', '(?!ل)', ['n_a'], ['n_s', 'n_d']),
                conditionalPrefixInflection('ولل', '', '(?!ل)', ['n_a'], ['n_s', 'n_d']),
                conditionalPrefixInflection('فلل', '', '(?!ل)', ['n_a'], ['n_s', 'n_d']),
            ],
        },
        'NPref-LiAl': {
            name: 'for/to + the',
            description: 'for/to + the, assimilated with initial ل',
            rules: [
                prefixInflection('لل', 'ل', ['n_a'], ['n_s', 'n_d']),
                prefixInflection('ولل', 'ل', ['n_a'], ['n_s', 'n_d']),
                prefixInflection('فلل', 'ل', ['n_a'], ['n_s', 'n_d']),
            ],
        },

        // Perfect Verb
        'PVPref-La': {
            name: 'would have',
            description: 'Result clause particle (if ... I would have ...)',
            rules: [prefixInflection('ل', '', ['pv_a'], ['pv_s', 'pv_d'])],
        },

        'PVSuff-ah': {
            name: 'Perfect Tense',
            description: 'Perfect Verb + D.O pronoun',
            rules: [
                suffixInflection('ه', '', condIn, condOut),
                suffixInflection('هما', '', condIn, condOut),
                suffixInflection('هم', '', condIn, condOut),
                suffixInflection('ها', '', condIn, condOut),
                suffixInflection('هن', '', condIn, condOut),
                suffixInflection('ك', '', condIn, condOut),
                suffixInflection('كما', '', condIn, condOut),
                suffixInflection('كم', '', condIn, condOut),
                suffixInflection('كن', '', condIn, condOut),
                suffixInflection('ني', '', condIn, condOut),
                suffixInflection('نا', '', condIn, condOut),
            ],
        },
        'PVSuff-n': {
            name: 'Perfect Tense',
            description: 'Perfect Verb suffixes assimilating with ن',
            rules: [
                // Stem doesn't end in ن
                conditionalSuffixInflection('ن', '', '(?<!ن)', condInN, condOutN),
                conditionalSuffixInflection('نا', '', '(?<!ن)', condInN, condOutN),

                conditionalSuffixInflection('نه', '', '(?<!ن)', condInN, condOutN),
                conditionalSuffixInflection('نهما', '', '(?<!ن)', condInN, condOutN),
                conditionalSuffixInflection('نهم', '', '(?<!ن)', condInN, condOutN),
                conditionalSuffixInflection('نها', '', '(?<!ن)', condInN, condOutN),
                conditionalSuffixInflection('نهن', '', '(?<!ن)', condInN, condOutN),
                conditionalSuffixInflection('نك', '', '(?<!ن)', condInN, condOutN),
                conditionalSuffixInflection('نكما', '', '(?<!ن)', condInN, condOutN),
                conditionalSuffixInflection('نكم', '', '(?<!ن)', condInN, condOutN),
                conditionalSuffixInflection('نكن', '', '(?<!ن)', condInN, condOutN),
                conditionalSuffixInflection('نني', '', '(?<!ن)', condInN, condOutN),
                conditionalSuffixInflection('ننا', '', '(?<!ن)', condInN, condOutN),

                conditionalSuffixInflection('ناه', '', '(?<!ن)', condInN, condOutN),
                conditionalSuffixInflection('ناهما', '', '(?<!ن)', condInN, condOutN),
                conditionalSuffixInflection('ناهم', '', '(?<!ن)', condInN, condOutN),
                conditionalSuffixInflection('ناها', '', '(?<!ن)', condInN, condOutN),
                conditionalSuffixInflection('ناهن', '', '(?<!ن)', condInN, condOutN),
                conditionalSuffixInflection('ناك', '', '(?<!ن)', condInN, condOutN),
                conditionalSuffixInflection('ناكما', '', '(?<!ن)', condInN, condOutN),
                conditionalSuffixInflection('ناكم', '', '(?<!ن)', condInN, condOutN),
                conditionalSuffixInflection('ناكن', '', '(?<!ن)', condInN, condOutN),

                // Suffixes assimilated with stems ending in ن
                suffixInflection('نا', 'ن', condInN, condOutN),

                suffixInflection('نه', 'ن', condInN, condOutN),
                suffixInflection('نهما', 'ن', condInN, condOutN),
                suffixInflection('نهم', 'ن', condInN, condOutN),
                suffixInflection('نها', 'ن', condInN, condOutN),
                suffixInflection('نهن', 'ن', condInN, condOutN),
                suffixInflection('نك', 'ن', condInN, condOutN),
                suffixInflection('نكما', 'ن', condInN, condOutN),
                suffixInflection('نكم', 'ن', condInN, condOutN),
                suffixInflection('نكن', 'ن', condInN, condOutN),
                suffixInflection('نني', 'ن', condInN, condOutN),
                suffixInflection('ننا', 'ن', condInN, condOutN),

                suffixInflection('ناه', 'ن', condInN, condOutN),
                suffixInflection('ناهما', 'ن', condInN, condOutN),
                suffixInflection('ناهم', 'ن', condInN, condOutN),
                suffixInflection('ناها', 'ن', condInN, condOutN),
                suffixInflection('ناهن', 'ن', condInN, condOutN),
                suffixInflection('ناك', 'ن', condInN, condOutN),
                suffixInflection('ناكما', 'ن', condInN, condOutN),
                suffixInflection('ناكم', 'ن', condInN, condOutN),
                suffixInflection('ناكن', 'ن', condInN, condOutN),
            ],
        },
        'PVSuff-t': {
            name: 'Perfect Tense',
            description: 'Perfect Verb suffixes assimilating with ت',
            rules: [
                // This can either be 3rd p. f. singular, or 1st/2nd p. singular
                // The former doesn't assimilate, the latter do, so the below accounts for both
                suffixInflection('ت', '', condInT, condOutT),

                suffixInflection('ته', '', condInT, condOutT),
                suffixInflection('تهما', '', condInT, condOutT),
                suffixInflection('تهم', '', condInT, condOutT),
                suffixInflection('تها', '', condInT, condOutT),
                suffixInflection('تهن', '', condInT, condOutT),
                suffixInflection('تك', '', condInT, condOutT),
                suffixInflection('تكما', '', condInT, condOutT),
                suffixInflection('تكم', '', condInT, condOutT),
                suffixInflection('تكن', '', condInT, condOutT),
                suffixInflection('تني', '', condInT, condOutT),
                suffixInflection('تنا', '', condInT, condOutT),

                // Stem doesn't end in ت
                conditionalSuffixInflection('تما', '', '(?<!ت)', condInT, condOutT),
                conditionalSuffixInflection('تم', '', '(?<!ت)', condInT, condOutT),
                conditionalSuffixInflection('تن', '', '(?<!ت)', condInT, condOutT),

                conditionalSuffixInflection('تماه', '', '(?<!ت)', condInT, condOutT),
                conditionalSuffixInflection('تماهما', '', '(?<!ت)', condInT, condOutT),
                conditionalSuffixInflection('تماهم', '', '(?<!ت)', condInT, condOutT),
                conditionalSuffixInflection('تماها', '', '(?<!ت)', condInT, condOutT),
                conditionalSuffixInflection('تماهن', '', '(?<!ت)', condInT, condOutT),
                conditionalSuffixInflection('تماني', '', '(?<!ت)', condInT, condOutT),
                conditionalSuffixInflection('تمانا', '', '(?<!ت)', condInT, condOutT),

                conditionalSuffixInflection('تموه', '', '(?<!ت)', condInT, condOutT),
                conditionalSuffixInflection('تموهما', '', '(?<!ت)', condInT, condOutT),
                conditionalSuffixInflection('تموهم', '', '(?<!ت)', condInT, condOutT),
                conditionalSuffixInflection('تموها', '', '(?<!ت)', condInT, condOutT),
                conditionalSuffixInflection('تموهن', '', '(?<!ت)', condInT, condOutT),
                conditionalSuffixInflection('تموني', '', '(?<!ت)', condInT, condOutT),
                conditionalSuffixInflection('تمونا', '', '(?<!ت)', condInT, condOutT),

                conditionalSuffixInflection('تنه', '', '(?<!ت)', condInT, condOutT),
                conditionalSuffixInflection('تنهما', '', '(?<!ت)', condInT, condOutT),
                conditionalSuffixInflection('تنهم', '', '(?<!ت)', condInT, condOutT),
                conditionalSuffixInflection('تنها', '', '(?<!ت)', condInT, condOutT),
                conditionalSuffixInflection('تنهن', '', '(?<!ت)', condInT, condOutT),
                conditionalSuffixInflection('تنني', '', '(?<!ت)', condInT, condOutT),
                conditionalSuffixInflection('تننا', '', '(?<!ت)', condInT, condOutT),

                // Suffixes assimilated with stems ending in ت
                suffixInflection('تما', 'ت', condInT, condOutT),
                suffixInflection('تم', 'ت', condInT, condOutT),
                suffixInflection('تن', 'ت', condInT, condOutT),

                suffixInflection('ته', 'ت', condInT, condOutT),
                suffixInflection('تهما', 'ت', condInT, condOutT),
                suffixInflection('تهم', 'ت', condInT, condOutT),
                suffixInflection('تها', 'ت', condInT, condOutT),
                suffixInflection('تهن', 'ت', condInT, condOutT),
                suffixInflection('تك', 'ت', condInT, condOutT),
                suffixInflection('تكما', 'ت', condInT, condOutT),
                suffixInflection('تكم', 'ت', condInT, condOutT),
                suffixInflection('تكن', 'ت', condInT, condOutT),
                suffixInflection('تني', 'ت', condInT, condOutT),
                suffixInflection('تنا', 'ت', condInT, condOutT),

                suffixInflection('تماه', 'ت', condInT, condOutT),
                suffixInflection('تماهما', 'ت', condInT, condOutT),
                suffixInflection('تماهم', 'ت', condInT, condOutT),
                suffixInflection('تماها', 'ت', condInT, condOutT),
                suffixInflection('تماهن', 'ت', condInT, condOutT),
                suffixInflection('تماني', 'ت', condInT, condOutT),
                suffixInflection('تمانا', 'ت', condInT, condOutT),

                suffixInflection('تموه', 'ت', condInT, condOutT),
                suffixInflection('تموهما', 'ت', condInT, condOutT),
                suffixInflection('تموهم', 'ت', condInT, condOutT),
                suffixInflection('تموها', 'ت', condInT, condOutT),
                suffixInflection('تموهن', 'ت', condInT, condOutT),
                suffixInflection('تموني', 'ت', condInT, condOutT),
                suffixInflection('تمونا', 'ت', condInT, condOutT),

                suffixInflection('تنه', 'ت', condInT, condOutT),
                suffixInflection('تنهما', 'ت', condInT, condOutT),
                suffixInflection('تنهم', 'ت', condInT, condOutT),
                suffixInflection('تنها', 'ت', condInT, condOutT),
                suffixInflection('تنهن', 'ت', condInT, condOutT),
                suffixInflection('تنني', 'ت', condInT, condOutT),
                suffixInflection('تننا', 'ت', condInT, condOutT),
            ],
        },
        'PVSuff-at': {
            name: 'Perfect Tense',
            description: 'Perfect Verb non-assimilating ت suffixes',
            rules: [
                suffixInflection('تا', '', condInAT, condOutAT),
                suffixInflection('تاه', '', condInAT, condOutAT),
                suffixInflection('تاهما', '', condInAT, condOutAT),
                suffixInflection('تاهم', '', condInAT, condOutAT),
                suffixInflection('تاها', '', condInAT, condOutAT),
                suffixInflection('تاهن', '', condInAT, condOutAT),
                suffixInflection('تاك', '', condInAT, condOutAT),
                suffixInflection('تاكما', '', condInAT, condOutAT),
                suffixInflection('تاكم', '', condInAT, condOutAT),
                suffixInflection('تاكن', '', condInAT, condOutAT),
                suffixInflection('تاني', '', condInAT, condOutAT),
                suffixInflection('تانا', '', condInAT, condOutAT),
            ],
        },
        'PVSuff-A': {
            name: 'Perfect Tense',
            description: 'Perfect Verb 3rd. m. dual',
            rules: [
                suffixInflection('ا', '', condInA, condOutA),
                suffixInflection('اه', '', condInA, condOutA),
                suffixInflection('اهما', '', condInA, condOutA),
                suffixInflection('اهم', '', condInA, condOutA),
                suffixInflection('اها', '', condInA, condOutA),
                suffixInflection('اهن', '', condInA, condOutA),
                suffixInflection('اك', '', condInA, condOutA),
                suffixInflection('اكما', '', condInA, condOutA),
                suffixInflection('اكم', '', condInA, condOutA),
                suffixInflection('اكن', '', condInA, condOutA),
                suffixInflection('اني', '', condInA, condOutA),
                suffixInflection('انا', '', condInA, condOutA),

                // Combines with أ to form آ
                suffixInflection('آ', 'أ', condInA, condOutA),
                suffixInflection('آه', 'أ', condInA, condOutA),
                suffixInflection('آهما', 'أ', condInA, condOutA),
                suffixInflection('آهم', 'أ', condInA, condOutA),
                suffixInflection('آها', 'أ', condInA, condOutA),
                suffixInflection('آهن', 'أ', condInA, condOutA),
                suffixInflection('آك', 'أ', condInA, condOutA),
                suffixInflection('آكما', 'أ', condInA, condOutA),
                suffixInflection('آكم', 'أ', condInA, condOutA),
                suffixInflection('آكن', 'أ', condInA, condOutA),
                suffixInflection('آني', 'أ', condInA, condOutA),
                suffixInflection('آنا', 'أ', condInA, condOutA),
            ],
        },
        'PVSuff-uw': {
            name: 'Perfect Tense',
            description: 'Perfect Verb 3rd. m. pl.',
            rules: [
                suffixInflection('وا', '', condInUW, condOutUW),
                suffixInflection('وه', '', condInUW, condOutUW),
                suffixInflection('وهما', '', condInUW, condOutUW),
                suffixInflection('وهم', '', condInUW, condOutUW),
                suffixInflection('وها', '', condInUW, condOutUW),
                suffixInflection('وهن', '', condInUW, condOutUW),
                suffixInflection('وك', '', condInUW, condOutUW),
                suffixInflection('وكما', '', condInUW, condOutUW),
                suffixInflection('وكم', '', condInUW, condOutUW),
                suffixInflection('وكن', '', condInUW, condOutUW),
                suffixInflection('وني', '', condInUW, condOutUW),
                suffixInflection('ونا', '', condInUW, condOutUW),
            ],
        },
    },
};
