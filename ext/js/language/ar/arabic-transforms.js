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
                suffixInflection('ه', '', ['pv_s'], ['pv_d']),
                suffixInflection('هما', '', ['pv_s'], ['pv_d']),
                suffixInflection('هم', '', ['pv_s'], ['pv_d']),
                suffixInflection('ها', '', ['pv_s'], ['pv_d']),
                suffixInflection('هن', '', ['pv_s'], ['pv_d']),
                suffixInflection('ك', '', ['pv_s'], ['pv_d']),
                suffixInflection('كما', '', ['pv_s'], ['pv_d']),
                suffixInflection('كم', '', ['pv_s'], ['pv_d']),
                suffixInflection('كن', '', ['pv_s'], ['pv_d']),
                suffixInflection('ني', '', ['pv_s'], ['pv_d']),
                suffixInflection('نا', '', ['pv_s'], ['pv_d']),
            ],
        },
        'PVSuff-n': {
            name: 'Perfect Tense',
            description: 'Perfect Verb suffixes assimilating with ن',
            rules: [
                // Stem doesn't end in ن
                conditionalSuffixInflection('ن', '', '(?<!ن)', ['pv_s'], ['pv_d']),
                conditionalSuffixInflection('نا', '', '(?<!ن)', ['pv_s'], ['pv_d']),

                conditionalSuffixInflection('نه', '', '(?<!ن)', ['pv_s'], ['pv_d']),
                conditionalSuffixInflection('نهما', '', '(?<!ن)', ['pv_s'], ['pv_d']),
                conditionalSuffixInflection('نهم', '', '(?<!ن)', ['pv_s'], ['pv_d']),
                conditionalSuffixInflection('نها', '', '(?<!ن)', ['pv_s'], ['pv_d']),
                conditionalSuffixInflection('نهن', '', '(?<!ن)', ['pv_s'], ['pv_d']),
                conditionalSuffixInflection('نك', '', '(?<!ن)', ['pv_s'], ['pv_d']),
                conditionalSuffixInflection('نكما', '', '(?<!ن)', ['pv_s'], ['pv_d']),
                conditionalSuffixInflection('نكم', '', '(?<!ن)', ['pv_s'], ['pv_d']),
                conditionalSuffixInflection('نكن', '', '(?<!ن)', ['pv_s'], ['pv_d']),
                conditionalSuffixInflection('نني', '', '(?<!ن)', ['pv_s'], ['pv_d']),
                conditionalSuffixInflection('ننا', '', '(?<!ن)', ['pv_s'], ['pv_d']),

                conditionalSuffixInflection('ناه', '', '(?<!ن)', ['pv_s'], ['pv_d']),
                conditionalSuffixInflection('ناهما', '', '(?<!ن)', ['pv_s'], ['pv_d']),
                conditionalSuffixInflection('ناهم', '', '(?<!ن)', ['pv_s'], ['pv_d']),
                conditionalSuffixInflection('ناها', '', '(?<!ن)', ['pv_s'], ['pv_d']),
                conditionalSuffixInflection('ناهن', '', '(?<!ن)', ['pv_s'], ['pv_d']),
                conditionalSuffixInflection('ناك', '', '(?<!ن)', ['pv_s'], ['pv_d']),
                conditionalSuffixInflection('ناكما', '', '(?<!ن)', ['pv_s'], ['pv_d']),
                conditionalSuffixInflection('ناكم', '', '(?<!ن)', ['pv_s'], ['pv_d']),
                conditionalSuffixInflection('ناكن', '', '(?<!ن)', ['pv_s'], ['pv_d']),

                // Suffixes assimilated with stems ending in ن
                suffixInflection('نا', 'ن', ['pv_s'], ['pv_d']),

                suffixInflection('نه', 'ن', ['pv_s'], ['pv_d']),
                suffixInflection('نهما', 'ن', ['pv_s'], ['pv_d']),
                suffixInflection('نهم', 'ن', ['pv_s'], ['pv_d']),
                suffixInflection('نها', 'ن', ['pv_s'], ['pv_d']),
                suffixInflection('نهن', 'ن', ['pv_s'], ['pv_d']),
                suffixInflection('نك', 'ن', ['pv_s'], ['pv_d']),
                suffixInflection('نكما', 'ن', ['pv_s'], ['pv_d']),
                suffixInflection('نكم', 'ن', ['pv_s'], ['pv_d']),
                suffixInflection('نكن', 'ن', ['pv_s'], ['pv_d']),
                suffixInflection('نني', 'ن', ['pv_s'], ['pv_d']),
                suffixInflection('ننا', 'ن', ['pv_s'], ['pv_d']),

                suffixInflection('ناه', 'ن', ['pv_s'], ['pv_d']),
                suffixInflection('ناهما', 'ن', ['pv_s'], ['pv_d']),
                suffixInflection('ناهم', 'ن', ['pv_s'], ['pv_d']),
                suffixInflection('ناها', 'ن', ['pv_s'], ['pv_d']),
                suffixInflection('ناهن', 'ن', ['pv_s'], ['pv_d']),
                suffixInflection('ناك', 'ن', ['pv_s'], ['pv_d']),
                suffixInflection('ناكما', 'ن', ['pv_s'], ['pv_d']),
                suffixInflection('ناكم', 'ن', ['pv_s'], ['pv_d']),
                suffixInflection('ناكن', 'ن', ['pv_s'], ['pv_d']),
            ],
        },
        'PVSuff-t': {
            name: 'Perfect Tense',
            description: 'Perfect Verb suffixes assimilating with ت',
            rules: [
                // This can either be 3rd p. f. singular, or 1st/2nd p. singular
                // The former doesn't assimilate, the latter do, so the below accounts for both
                suffixInflection('ت', '', ['pv_s'], ['pv_d']),

                suffixInflection('ته', '', ['pv_s'], ['pv_d']),
                suffixInflection('تهما', '', ['pv_s'], ['pv_d']),
                suffixInflection('تهم', '', ['pv_s'], ['pv_d']),
                suffixInflection('تها', '', ['pv_s'], ['pv_d']),
                suffixInflection('تهن', '', ['pv_s'], ['pv_d']),
                suffixInflection('تك', '', ['pv_s'], ['pv_d']),
                suffixInflection('تكما', '', ['pv_s'], ['pv_d']),
                suffixInflection('تكم', '', ['pv_s'], ['pv_d']),
                suffixInflection('تكن', '', ['pv_s'], ['pv_d']),
                suffixInflection('تني', '', ['pv_s'], ['pv_d']),
                suffixInflection('تنا', '', ['pv_s'], ['pv_d']),

                // Stem doesn't end in ت
                conditionalSuffixInflection('تما', '', '(?<!ت)', ['pv_s'], ['pv_d']),
                conditionalSuffixInflection('تم', '', '(?<!ت)', ['pv_s'], ['pv_d']),
                conditionalSuffixInflection('تن', '', '(?<!ت)', ['pv_s'], ['pv_d']),

                conditionalSuffixInflection('تماه', '', '(?<!ت)', ['pv_s'], ['pv_d']),
                conditionalSuffixInflection('تماهما', '', '(?<!ت)', ['pv_s'], ['pv_d']),
                conditionalSuffixInflection('تماهم', '', '(?<!ت)', ['pv_s'], ['pv_d']),
                conditionalSuffixInflection('تماها', '', '(?<!ت)', ['pv_s'], ['pv_d']),
                conditionalSuffixInflection('تماهن', '', '(?<!ت)', ['pv_s'], ['pv_d']),
                conditionalSuffixInflection('تماني', '', '(?<!ت)', ['pv_s'], ['pv_d']),
                conditionalSuffixInflection('تمانا', '', '(?<!ت)', ['pv_s'], ['pv_d']),

                conditionalSuffixInflection('تموه', '', '(?<!ت)', ['pv_s'], ['pv_d']),
                conditionalSuffixInflection('تموهما', '', '(?<!ت)', ['pv_s'], ['pv_d']),
                conditionalSuffixInflection('تموهم', '', '(?<!ت)', ['pv_s'], ['pv_d']),
                conditionalSuffixInflection('تموها', '', '(?<!ت)', ['pv_s'], ['pv_d']),
                conditionalSuffixInflection('تموهن', '', '(?<!ت)', ['pv_s'], ['pv_d']),
                conditionalSuffixInflection('تموني', '', '(?<!ت)', ['pv_s'], ['pv_d']),
                conditionalSuffixInflection('تمونا', '', '(?<!ت)', ['pv_s'], ['pv_d']),

                conditionalSuffixInflection('تنه', '', '(?<!ت)', ['pv_s'], ['pv_d']),
                conditionalSuffixInflection('تنهما', '', '(?<!ت)', ['pv_s'], ['pv_d']),
                conditionalSuffixInflection('تنهم', '', '(?<!ت)', ['pv_s'], ['pv_d']),
                conditionalSuffixInflection('تنها', '', '(?<!ت)', ['pv_s'], ['pv_d']),
                conditionalSuffixInflection('تنهن', '', '(?<!ت)', ['pv_s'], ['pv_d']),
                conditionalSuffixInflection('تنني', '', '(?<!ت)', ['pv_s'], ['pv_d']),
                conditionalSuffixInflection('تننا', '', '(?<!ت)', ['pv_s'], ['pv_d']),

                // Suffixes assimilated with stems ending in ت
                suffixInflection('تما', 'ت', ['pv_s'], ['pv_d']),
                suffixInflection('تم', 'ت', ['pv_s'], ['pv_d']),
                suffixInflection('تن', 'ت', ['pv_s'], ['pv_d']),

                suffixInflection('ته', 'ت', ['pv_s'], ['pv_d']),
                suffixInflection('تهما', 'ت', ['pv_s'], ['pv_d']),
                suffixInflection('تهم', 'ت', ['pv_s'], ['pv_d']),
                suffixInflection('تها', 'ت', ['pv_s'], ['pv_d']),
                suffixInflection('تهن', 'ت', ['pv_s'], ['pv_d']),
                suffixInflection('تك', 'ت', ['pv_s'], ['pv_d']),
                suffixInflection('تكما', 'ت', ['pv_s'], ['pv_d']),
                suffixInflection('تكم', 'ت', ['pv_s'], ['pv_d']),
                suffixInflection('تكن', 'ت', ['pv_s'], ['pv_d']),
                suffixInflection('تني', 'ت', ['pv_s'], ['pv_d']),
                suffixInflection('تنا', 'ت', ['pv_s'], ['pv_d']),

                suffixInflection('تماه', 'ت', ['pv_s'], ['pv_d']),
                suffixInflection('تماهما', 'ت', ['pv_s'], ['pv_d']),
                suffixInflection('تماهم', 'ت', ['pv_s'], ['pv_d']),
                suffixInflection('تماها', 'ت', ['pv_s'], ['pv_d']),
                suffixInflection('تماهن', 'ت', ['pv_s'], ['pv_d']),
                suffixInflection('تماني', 'ت', ['pv_s'], ['pv_d']),
                suffixInflection('تمانا', 'ت', ['pv_s'], ['pv_d']),

                suffixInflection('تموه', 'ت', ['pv_s'], ['pv_d']),
                suffixInflection('تموهما', 'ت', ['pv_s'], ['pv_d']),
                suffixInflection('تموهم', 'ت', ['pv_s'], ['pv_d']),
                suffixInflection('تموها', 'ت', ['pv_s'], ['pv_d']),
                suffixInflection('تموهن', 'ت', ['pv_s'], ['pv_d']),
                suffixInflection('تموني', 'ت', ['pv_s'], ['pv_d']),
                suffixInflection('تمونا', 'ت', ['pv_s'], ['pv_d']),

                suffixInflection('تنه', 'ت', ['pv_s'], ['pv_d']),
                suffixInflection('تنهما', 'ت', ['pv_s'], ['pv_d']),
                suffixInflection('تنهم', 'ت', ['pv_s'], ['pv_d']),
                suffixInflection('تنها', 'ت', ['pv_s'], ['pv_d']),
                suffixInflection('تنهن', 'ت', ['pv_s'], ['pv_d']),
                suffixInflection('تنني', 'ت', ['pv_s'], ['pv_d']),
                suffixInflection('تننا', 'ت', ['pv_s'], ['pv_d']),
            ],
        },
        'PVSuff-at': {
            name: 'Perfect Tense',
            description: 'Perfect Verb non-assimilating ت suffixes',
            rules: [
                suffixInflection('تا', '', ['pv_s'], ['pv_d']),
                suffixInflection('تاه', '', ['pv_s'], ['pv_d']),
                suffixInflection('تاهما', '', ['pv_s'], ['pv_d']),
                suffixInflection('تاهم', '', ['pv_s'], ['pv_d']),
                suffixInflection('تاها', '', ['pv_s'], ['pv_d']),
                suffixInflection('تاهن', '', ['pv_s'], ['pv_d']),
                suffixInflection('تاك', '', ['pv_s'], ['pv_d']),
                suffixInflection('تاكما', '', ['pv_s'], ['pv_d']),
                suffixInflection('تاكم', '', ['pv_s'], ['pv_d']),
                suffixInflection('تاكن', '', ['pv_s'], ['pv_d']),
                suffixInflection('تاني', '', ['pv_s'], ['pv_d']),
                suffixInflection('تانا', '', ['pv_s'], ['pv_d']),
            ],
        },
        'PVSuff-A': {
            name: 'Perfect Tense',
            description: 'Perfect Verb 3rd. m. dual',
            rules: [
                suffixInflection('ا', '', ['pv_s'], ['pv_d']),
                suffixInflection('اه', '', ['pv_s'], ['pv_d']),
                suffixInflection('اهما', '', ['pv_s'], ['pv_d']),
                suffixInflection('اهم', '', ['pv_s'], ['pv_d']),
                suffixInflection('اها', '', ['pv_s'], ['pv_d']),
                suffixInflection('اهن', '', ['pv_s'], ['pv_d']),
                suffixInflection('اك', '', ['pv_s'], ['pv_d']),
                suffixInflection('اكما', '', ['pv_s'], ['pv_d']),
                suffixInflection('اكم', '', ['pv_s'], ['pv_d']),
                suffixInflection('اكن', '', ['pv_s'], ['pv_d']),
                suffixInflection('اني', '', ['pv_s'], ['pv_d']),
                suffixInflection('انا', '', ['pv_s'], ['pv_d']),

                // Combines with أ to form آ
                suffixInflection('آ', 'أ', ['pv_s'], ['pv_d']),
                suffixInflection('آه', 'أ', ['pv_s'], ['pv_d']),
                suffixInflection('آهما', 'أ', ['pv_s'], ['pv_d']),
                suffixInflection('آهم', 'أ', ['pv_s'], ['pv_d']),
                suffixInflection('آها', 'أ', ['pv_s'], ['pv_d']),
                suffixInflection('آهن', 'أ', ['pv_s'], ['pv_d']),
                suffixInflection('آك', 'أ', ['pv_s'], ['pv_d']),
                suffixInflection('آكما', 'أ', ['pv_s'], ['pv_d']),
                suffixInflection('آكم', 'أ', ['pv_s'], ['pv_d']),
                suffixInflection('آكن', 'أ', ['pv_s'], ['pv_d']),
                suffixInflection('آني', 'أ', ['pv_s'], ['pv_d']),
                suffixInflection('آنا', 'أ', ['pv_s'], ['pv_d']),
            ],
        },
        'PVSuff-uw': {
            name: 'Perfect Tense',
            description: 'Perfect Verb 3rd. m. pl.',
            rules: [
                suffixInflection('وا', '', ['pv_s'], ['pv_d']),
                suffixInflection('وه', '', ['pv_s'], ['pv_d']),
                suffixInflection('وهما', '', ['pv_s'], ['pv_d']),
                suffixInflection('وهم', '', ['pv_s'], ['pv_d']),
                suffixInflection('وها', '', ['pv_s'], ['pv_d']),
                suffixInflection('وهن', '', ['pv_s'], ['pv_d']),
                suffixInflection('وك', '', ['pv_s'], ['pv_d']),
                suffixInflection('وكما', '', ['pv_s'], ['pv_d']),
                suffixInflection('وكم', '', ['pv_s'], ['pv_d']),
                suffixInflection('وكن', '', ['pv_s'], ['pv_d']),
                suffixInflection('وني', '', ['pv_s'], ['pv_d']),
                suffixInflection('ونا', '', ['pv_s'], ['pv_d']),
            ],
        },
    },
};
