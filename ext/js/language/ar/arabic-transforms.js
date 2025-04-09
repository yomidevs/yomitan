/*
 * Copyright (C) 2025  Yomitan Authors
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

const arabicLetters = '[\u0620-\u065F\u066E-\u06D3\u06D5\u06EE\u06EF\u06FA-\u06FC\u06FF]';
const directObjectPronouns1st = ['ني', 'نا'];
const directObjectPronouns2nd = ['ك', 'كما', 'كم', 'كن'];
const directObjectPronouns3rd = ['ه', 'ها', 'هما', 'هم', 'هن'];
const directObjectPronouns = [...directObjectPronouns1st, ...directObjectPronouns2nd, ...directObjectPronouns3rd];

/**
 * @param {string} prefix
 * @param {boolean} includeLiPrefix
 * @returns {string[]}
 */
function getImperfectPrefixes(prefix, includeLiPrefix = true) {
    return [
        `${prefix}`,
        `و${prefix}`,
        `ف${prefix}`,
        `س${prefix}`,
        `وس${prefix}`,
        `فس${prefix}`,
        ...(includeLiPrefix ? [`ل${prefix}`, `ول${prefix}`, `فل${prefix}`] : []),
    ];
}

/**
 * @param {string} inflectedPrefix
 * @param {string} deinflectedPrefix
 * @param {string} initialStemSegment
 * @param {Condition[]} conditionsIn
 * @param {Condition[]} conditionsOut
 * @returns {import('language-transformer').Rule<Condition>}
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
 * @param {string} inflectedSuffix
 * @param {string} deinflectedSuffix
 * @param {string} finalStemSegment
 * @param {Condition[]} conditionsIn
 * @param {Condition[]} conditionsOut
 * @returns {import('language-transformer').SuffixRule<Condition>}
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

/**
 * @param {string} inflectedPrefix
 * @param {string} deinflectedPrefix
 * @param {string} inflectedSuffix
 * @param {string} deinflectedSuffix
 * @param {Condition[]} conditionsIn
 * @param {Condition[]} conditionsOut
 * @param {object} [options={}]
 * @param {string} [options.initialStemSegment = '']
 * @param {string} [options.finalStemSegment = '']
 * @returns {import('language-transformer').Rule<Condition>}
 */
function sandwichInflection(
    inflectedPrefix,
    deinflectedPrefix,
    inflectedSuffix,
    deinflectedSuffix,
    conditionsIn,
    conditionsOut,
    {initialStemSegment = '', finalStemSegment = ''} = {},
) {
    if (!inflectedSuffix && !deinflectedSuffix) {
        return conditionalPrefixInflection(
            inflectedPrefix,
            deinflectedPrefix,
            initialStemSegment,
            conditionsIn,
            conditionsOut,
        );
    }
    if (!inflectedPrefix && !deinflectedPrefix) {
        return conditionalSuffixInflection(
            inflectedSuffix,
            deinflectedSuffix,
            finalStemSegment,
            conditionsIn,
            conditionsOut,
        );
    }

    const regex = new RegExp(
        `^${inflectedPrefix}${initialStemSegment}${arabicLetters}+${finalStemSegment}${inflectedSuffix}$`,
    );
    return {
        type: 'other',
        isInflected: regex,
        deinflect: (text) => deinflectedPrefix + text.slice(inflectedPrefix.length, -inflectedSuffix.length) + deinflectedSuffix,
        conditionsIn,
        conditionsOut,
    };
}

/**
 * @param {string} inflectedPrefix
 * @param {string} deinflectedPrefix
 * @param {string} inflectedSuffix
 * @param {string} deinflectedSuffix
 * @param {object} [options={}]
 * @param {string} [options.attachedSuffix = inflectedSuffix]
 * @param {boolean} [options.attachesTo1st = true]
 * @param {boolean} [options.attachesTo2nd = true]
 * @param {boolean} [options.includeLiPrefix = true]
 * @param {string} [options.initialStemSegment = '']
 * @param {string} [options.finalStemSegment = '']
 * @returns {import('language-transformer').Rule<Condition>[]}
 */
function getImperfectRules(
    inflectedPrefix,
    deinflectedPrefix,
    inflectedSuffix,
    deinflectedSuffix,
    {
        attachedSuffix = inflectedSuffix,
        attachesTo1st = true,
        attachesTo2nd = true,
        includeLiPrefix = true,
        initialStemSegment = '',
        finalStemSegment = '',
    } = {},
) {
    const stemSegments = {initialStemSegment, finalStemSegment};
    const rules = getImperfectPrefixes(inflectedPrefix, includeLiPrefix).flatMap((pre) => [
        sandwichInflection(pre, deinflectedPrefix, inflectedSuffix, deinflectedSuffix, ['iv_p'], ['iv'], stemSegments),

        // With attached direct object pronouns
        ...(attachesTo1st ?
            directObjectPronouns1st.map((p) => sandwichInflection(
                pre,
                deinflectedPrefix,
                attachedSuffix + p,
                deinflectedSuffix,
                ['iv_p'],
                ['iv'],
                stemSegments,
            )) :
            []),
        ...(attachesTo2nd ?
            directObjectPronouns2nd.map((p) => sandwichInflection(
                pre,
                deinflectedPrefix,
                attachedSuffix + p,
                deinflectedSuffix,
                ['iv_p'],
                ['iv'],
                stemSegments,
            )) :
            []),
        ...directObjectPronouns3rd.map((p) => sandwichInflection(
            pre,
            deinflectedPrefix,
            attachedSuffix + p,
            deinflectedSuffix,
            ['iv_p'],
            ['iv'],
            stemSegments,
        )),
    ]);

    if (!deinflectedPrefix) {
        const opts = {
            attachedSuffix,
            attachesTo1st,
            attachesTo2nd,
            includeLiPrefix,
            initialStemSegment,
            finalStemSegment,
        };

        // For Form IV, VII, VIII, IX, X, XI, XII, XIII, XIV, XV verbs
        rules.push(
            ...getImperfectRules(inflectedPrefix, 'أ', inflectedSuffix, deinflectedSuffix, opts),
            ...getImperfectRules(inflectedPrefix, 'ا', inflectedSuffix, deinflectedSuffix, opts),
        );
    }

    return rules;
}

/** @typedef {keyof typeof conditions} Condition */
const conditions = {
    n: {
        name: 'Noun',
        isDictionaryForm: true,
    },
    n_p: {
        name: 'Noun with Prefix',
        isDictionaryForm: false,
    },
    n_s: {
        name: 'Noun with Suffix only',
        isDictionaryForm: false,
    },
    v: {
        name: 'Verb',
        isDictionaryForm: true,
        subConditions: ['pv', 'iv', 'cv'],
    },
    pv: {
        name: 'Perfect Verb (no affixes)',
        isDictionaryForm: true,
    },
    pv_p: {
        name: 'Perfect Verb with Prefix',
        isDictionaryForm: false,
    },
    pv_s: {
        name: 'Perfect Verb with Suffix only',
        isDictionaryForm: false,
    },
    iv: {
        name: 'Imperfect Verb (no affixes)',
        isDictionaryForm: true,
    },
    iv_p: {
        name: 'Imperfect Verb with Prefix',
        isDictionaryForm: false,
    },
    iv_s: {
        name: 'Imperfect Verb with Suffix only',
        isDictionaryForm: false,
    },
    cv: {
        name: 'Command Verb (no affixes)',
        isDictionaryForm: true,
    },
    cv_p: {
        name: 'Command Verb with Prefix',
        isDictionaryForm: false,
    },
    cv_s: {
        name: 'Command Verb with Suffix only',
        isDictionaryForm: false,
    },
};

/** @type {import('language-transformer').LanguageTransformDescriptor<Condition>} */
export const arabicTransforms = {
    language: 'ar',
    conditions,
    transforms: {
        // Noun
        'NPref-Bi': {
            name: 'by, with',
            description: 'by, with',
            rules: [
                prefixInflection('ب', '', ['n_p'], ['n_s', 'n']),
                prefixInflection('وب', '', ['n_p'], ['n_s', 'n']),
                prefixInflection('فب', '', ['n_p'], ['n_s', 'n']),
            ],
        },
        'NPref-Ka': {
            name: 'like, such as',
            description: 'like, such as',
            rules: [
                prefixInflection('ك', '', ['n_p'], ['n_s', 'n']),
                prefixInflection('وك', '', ['n_p'], ['n_s', 'n']),
                prefixInflection('فك', '', ['n_p'], ['n_s', 'n']),
            ],
        },
        'NPref-Li': {
            name: 'for, to; indeed, truly',
            description: 'for, to (لِ); indeed, truly (لَ)',
            rules: [
                prefixInflection('ل', '', ['n_p'], ['n_s', 'n']),
                prefixInflection('ول', '', ['n_p'], ['n_s', 'n']),
                prefixInflection('فل', '', ['n_p'], ['n_s', 'n']),
            ],
        },
        'NPref-Al': {
            name: 'the',
            description: 'the',
            rules: [
                prefixInflection('ال', '', ['n_p'], ['n_s', 'n']),
                prefixInflection('وال', '', ['n_p'], ['n_s', 'n']),
                prefixInflection('فال', '', ['n_p'], ['n_s', 'n']),
            ],
        },
        'NPref-BiAl': {
            name: 'by/with + the',
            description: 'by/with + the',
            rules: [
                prefixInflection('بال', '', ['n_p'], ['n_s', 'n']),
                prefixInflection('وبال', '', ['n_p'], ['n_s', 'n']),
                prefixInflection('فبال', '', ['n_p'], ['n_s', 'n']),
            ],
        },
        'NPref-KaAl': {
            name: 'like/such as + the',
            description: 'like/such as + the',
            rules: [
                prefixInflection('كال', '', ['n_p'], ['n_s', 'n']),
                prefixInflection('وكال', '', ['n_p'], ['n_s', 'n']),
                prefixInflection('فكال', '', ['n_p'], ['n_s', 'n']),
            ],
        },
        'NPref-Lil': {
            name: 'for/to + the',
            description: 'for/to + the',
            rules: [
                conditionalPrefixInflection('لل', '', '(?!ل)', ['n_p'], ['n_s', 'n']),
                conditionalPrefixInflection('ولل', '', '(?!ل)', ['n_p'], ['n_s', 'n']),
                conditionalPrefixInflection('فلل', '', '(?!ل)', ['n_p'], ['n_s', 'n']),
            ],
        },
        'NPref-LiAl': {
            name: 'for/to + the',
            description: 'for/to + the, assimilated with initial ل',
            rules: [
                prefixInflection('لل', 'ل', ['n_p'], ['n_s', 'n']),
                prefixInflection('ولل', 'ل', ['n_p'], ['n_s', 'n']),
                prefixInflection('فلل', 'ل', ['n_p'], ['n_s', 'n']),
            ],
        },

        // Perfect Verb
        'PVPref-Wa': {
            name: 'and',
            description: 'and (و); and, so (ف)',
            rules: [
                prefixInflection('و', '', ['pv_p'], ['pv_s', 'pv']),
                prefixInflection('ف', '', ['pv_p'], ['pv_s', 'pv']),
            ],
        },
        'PVPref-La': {
            name: 'would have',
            description: 'Result clause particle (if ... I would have ...)',
            rules: [prefixInflection('ل', '', ['pv_p'], ['pv_s', 'pv'])],
        },

        'PVSuff-ah': {
            name: 'Perfect Tense',
            description: 'Perfect Verb + D.O pronoun',
            rules: directObjectPronouns.map((p) => suffixInflection(p, '', ['pv_s'], ['pv'])),
        },
        'PVSuff-n': {
            name: 'Perfect Tense',
            description: 'Perfect Verb suffixes assimilating with ن',
            rules: [
                // Stem doesn't end in ن
                conditionalSuffixInflection('ن', '', '(?<!ن)', ['pv_s'], ['pv']),
                ...directObjectPronouns.map((p) => conditionalSuffixInflection(`ن${p}`, '', '(?<!ن)', ['pv_s'], ['pv'])),

                conditionalSuffixInflection('نا', '', '(?<!ن)', ['pv_s'], ['pv']),
                ...directObjectPronouns2nd.map((p) => conditionalSuffixInflection(`نا${p}`, '', '(?<!ن)', ['pv_s'], ['pv'])),
                ...directObjectPronouns3rd.map((p) => conditionalSuffixInflection(`نا${p}`, '', '(?<!ن)', ['pv_s'], ['pv'])),

                // Suffixes assimilated with stems ending in ن
                ...directObjectPronouns.map((p) => suffixInflection(`ن${p}`, 'ن', ['pv_s'], ['pv'])),

                suffixInflection('نا', 'ن', ['pv_s'], ['pv']),
                ...directObjectPronouns2nd.map((p) => suffixInflection(`نا${p}`, 'ن', ['pv_s'], ['pv'])),
                ...directObjectPronouns3rd.map((p) => suffixInflection(`نا${p}`, 'ن', ['pv_s'], ['pv'])),
            ],
        },
        'PVSuff-t': {
            name: 'Perfect Tense',
            description: 'Perfect Verb suffixes assimilating with ت',
            rules: [
                // This can either be 3rd p. f. singular, or 1st/2nd p. singular
                // The former doesn't assimilate, the latter do, so the below accounts for both
                suffixInflection('ت', '', ['pv_s'], ['pv']),
                ...directObjectPronouns.map((p) => suffixInflection(`ت${p}`, '', ['pv_s'], ['pv'])),

                // Stem doesn't end in ت
                conditionalSuffixInflection('تما', '', '(?<!ت)', ['pv_s'], ['pv']),
                ...directObjectPronouns1st.map((p) => conditionalSuffixInflection(`تما${p}`, '', '(?<!ت)', ['pv_s'], ['pv'])),
                ...directObjectPronouns3rd.map((p) => conditionalSuffixInflection(`تما${p}`, '', '(?<!ت)', ['pv_s'], ['pv'])),

                conditionalSuffixInflection('تم', '', '(?<!ت)', ['pv_s'], ['pv']),
                ...directObjectPronouns1st.map((p) => conditionalSuffixInflection(`تمو${p}`, '', '(?<!ت)', ['pv_s'], ['pv'])),
                ...directObjectPronouns3rd.map((p) => conditionalSuffixInflection(`تمو${p}`, '', '(?<!ت)', ['pv_s'], ['pv'])),

                conditionalSuffixInflection('تن', '', '(?<!ت)', ['pv_s'], ['pv']),
                ...directObjectPronouns1st.map((p) => conditionalSuffixInflection(`تن${p}`, '', '(?<!ت)', ['pv_s'], ['pv'])),
                ...directObjectPronouns3rd.map((p) => conditionalSuffixInflection(`تن${p}`, '', '(?<!ت)', ['pv_s'], ['pv'])),

                // Suffixes assimilated with stems ending in ت
                ...directObjectPronouns.map((p) => suffixInflection(`ت${p}`, 'ت', ['pv_s'], ['pv'])),

                suffixInflection('تما', 'ت', ['pv_s'], ['pv']),
                ...directObjectPronouns1st.map((p) => suffixInflection(`تما${p}`, 'ت', ['pv_s'], ['pv'])),
                ...directObjectPronouns3rd.map((p) => suffixInflection(`تما${p}`, 'ت', ['pv_s'], ['pv'])),

                suffixInflection('تم', 'ت', ['pv_s'], ['pv']),
                ...directObjectPronouns1st.map((p) => suffixInflection(`تمو${p}`, 'ت', ['pv_s'], ['pv'])),
                ...directObjectPronouns3rd.map((p) => suffixInflection(`تمو${p}`, 'ت', ['pv_s'], ['pv'])),

                suffixInflection('تن', 'ت', ['pv_s'], ['pv']),
                ...directObjectPronouns1st.map((p) => suffixInflection(`تن${p}`, 'ت', ['pv_s'], ['pv'])),
                ...directObjectPronouns3rd.map((p) => suffixInflection(`تن${p}`, 'ت', ['pv_s'], ['pv'])),
            ],
        },
        'PVSuff-at': {
            name: 'Perfect Tense',
            description: 'Perfect Verb non-assimilating ت suffixes',
            rules: [
                suffixInflection('تا', '', ['pv_s'], ['pv']),
                ...directObjectPronouns.map((p) => suffixInflection(`تا${p}`, '', ['pv_s'], ['pv'])),
            ],
        },
        'PVSuff-A': {
            name: 'Perfect Tense',
            description: 'Perfect Verb 3rd. m. dual',
            rules: [
                suffixInflection('ا', '', ['pv_s'], ['pv']),
                ...directObjectPronouns.map((p) => suffixInflection(`ا${p}`, '', ['pv_s'], ['pv'])),

                // Combines with أ to form آ
                suffixInflection('آ', 'أ', ['pv_s'], ['pv']),
                ...directObjectPronouns.map((p) => suffixInflection(`آ${p}`, 'أ', ['pv_s'], ['pv'])),
            ],
        },
        'PVSuff-uw': {
            name: 'Perfect Tense',
            description: 'Perfect Verb 3rd. m. pl.',
            rules: [
                suffixInflection('وا', '', ['pv_s'], ['pv']),
                ...directObjectPronouns.map((p) => suffixInflection(`و${p}`, '', ['pv_s'], ['pv'])),
            ],
        },

        // Imperfect Verb
        'IVPref-hw': {
            name: 'Imperfect Tense',
            description: 'Imperfect Verb 3rd. m. sing.',
            rules: [...getImperfectRules('ي', '', '', '')],
        },
        'IVPref-hy': {
            name: 'Imperfect Tense',
            description: 'Imperfect Verb 3rd. f. sing.',
            rules: [...getImperfectRules('ت', '', '', '')],
        },
        'IVPref-hmA': {
            name: 'Imperfect Tense',
            description: 'Imperfect Verb 3rd. m. dual',
            rules: [
                // Indicative
                ...getImperfectRules('ي', '', 'ان', '', {includeLiPrefix: false}),
                ...getImperfectRules('ي', '', 'آن', 'أ', {includeLiPrefix: false}),
                // Subjunctive
                ...getImperfectRules('ي', '', 'ا', ''),
                ...getImperfectRules('ي', '', 'آ', 'أ'),
            ],
        },
        'IVPref-hmA-ta': {
            name: 'Imperfect Tense',
            description: 'Imperfect Verb 3rd. f. dual',
            rules: [
                // Indicative
                ...getImperfectRules('ت', '', 'ان', '', {includeLiPrefix: false}),
                ...getImperfectRules('ت', '', 'آن', 'أ', {includeLiPrefix: false}),
                // Subjunctive
                ...getImperfectRules('ت', '', 'ا', ''),
                ...getImperfectRules('ت', '', 'آ', 'أ'),
            ],
        },
        'IVPref-hm': {
            name: 'Imperfect Tense',
            description: 'Imperfect Verb 3rd. m. pl.',
            rules: [
                // Indicative
                ...getImperfectRules('ي', '', 'ون', '', {includeLiPrefix: false}),
                // Subjunctive
                ...getImperfectRules('ي', '', 'وا', '', {attachedSuffix: 'و'}),
            ],
        },
        'IVPref-hn': {
            name: 'Imperfect Tense',
            description: 'Imperfect Verb 3rd. f. pl.',
            rules: [
                ...getImperfectRules('ي', '', 'ن', '', {finalStemSegment: '(?<!ن)'}),
                ...getImperfectRules('ي', '', 'ن', 'ن'),
            ],
        },
        'IVPref-Anta': {
            name: 'Imperfect Tense',
            description: 'Imperfect Verb 2nd. m. sing.',
            rules: [...getImperfectRules('ت', '', '', '', {attachesTo2nd: false})],
        },
        'IVPref-Anti': {
            name: 'Imperfect Tense',
            description: 'Imperfect Verb 2nd. f. sing.',
            rules: [
                ...getImperfectRules('ت', '', 'ين', '', {attachesTo2nd: false, includeLiPrefix: false}), // Indicative
                ...getImperfectRules('ت', '', 'ي', '', {attachesTo2nd: false}), // Subjunctive
            ],
        },
        'IVPref-AntmA': {
            name: 'Imperfect Tense',
            description: 'Imperfect Verb 2nd. dual',
            rules: [
                // Indicative
                ...getImperfectRules('ت', '', 'ان', '', {attachesTo2nd: false, includeLiPrefix: false}),
                ...getImperfectRules('ت', '', 'آن', 'أ', {attachesTo2nd: false, includeLiPrefix: false}),
                // Subjunctive
                ...getImperfectRules('ت', '', 'ا', '', {attachesTo2nd: false}),
                ...getImperfectRules('ت', '', 'آ', 'أ', {attachesTo2nd: false}),
            ],
        },
        'IVPref-Antm': {
            name: 'Imperfect Tense',
            description: 'Imperfect Verb 2nd. m. pl.',
            rules: [
                // Indicative
                ...getImperfectRules('ت', '', 'ون', '', {attachesTo2nd: false, includeLiPrefix: false}),
                // Subjunctive
                ...getImperfectRules('ت', '', 'وا', '', {attachesTo2nd: false, attachedSuffix: 'و'}),
            ],
        },
        'IVPref-Antn': {
            name: 'Imperfect Tense',
            description: 'Imperfect Verb 2nd. f. pl.',
            rules: [
                ...getImperfectRules('ت', '', 'ن', '', {attachesTo2nd: false, finalStemSegment: '(?<!ن)'}),
                ...getImperfectRules('ت', '', 'ن', 'ن', {attachesTo2nd: false}),
            ],
        },
        'IVPref-AnA': {
            name: 'Imperfect Tense',
            description: 'Imperfect Verb 1st. sing.',
            rules: [
                ...getImperfectRules('أ', '', '', '', {attachesTo1st: false}),
                ...getImperfectRules('آ', 'أ', '', '', {attachesTo1st: false}),
            ],
        },
        'IVPref-nHn': {
            name: 'Imperfect Tense',
            description: 'Imperfect Verb 1st. pl.',
            rules: [...getImperfectRules('ن', '', '', '', {attachesTo1st: false})],
        },

        // Command Verb
        'CVPref': {
            name: 'Imperative',
            description: 'Command Verb',
            rules: [
                prefixInflection('و', '', ['cv_p'], ['cv_s']),
                prefixInflection('ف', '', ['cv_p'], ['cv_s']),
                prefixInflection('ا', '', ['cv_p'], ['cv_s', 'cv']),
                prefixInflection('وا', '', ['cv_p'], ['cv_s', 'cv']),
                prefixInflection('فا', '', ['cv_p'], ['cv_s', 'cv']),
            ],
        },
        'CVSuff': {
            name: 'Imperative',
            description: 'Command Verb',
            rules: [
                // 2nd. m. sing.
                ...directObjectPronouns1st.map((p) => suffixInflection(p, '', ['cv_s'], ['cv'])),
                ...directObjectPronouns3rd.map((p) => suffixInflection(p, '', ['cv_s'], ['cv'])),

                // 2nd. f. sing
                suffixInflection('ي', '', ['cv_s'], ['cv']),
                ...directObjectPronouns1st.map((p) => suffixInflection(`ي${p}`, '', ['cv_s'], ['cv'])),
                ...directObjectPronouns3rd.map((p) => suffixInflection(`ي${p}`, '', ['cv_s'], ['cv'])),

                // 2nd. dual
                suffixInflection('ا', '', ['cv_s'], ['cv']),
                ...directObjectPronouns1st.map((p) => suffixInflection(`ا${p}`, '', ['cv_s'], ['cv'])),
                ...directObjectPronouns3rd.map((p) => suffixInflection(`ا${p}`, '', ['cv_s'], ['cv'])),

                // 2nd. m. pl.
                suffixInflection('وا', '', ['cv_s'], ['cv']),
                ...directObjectPronouns1st.map((p) => suffixInflection(`و${p}`, '', ['cv_s'], ['cv'])),
                ...directObjectPronouns3rd.map((p) => suffixInflection(`و${p}`, '', ['cv_s'], ['cv'])),

                // 2nd. f. pl.
                suffixInflection('ن', '', ['cv_s'], ['cv']),
                ...directObjectPronouns1st.map((p) => suffixInflection(`ن${p}`, '', ['cv_s'], ['cv'])),
                ...directObjectPronouns3rd.map((p) => suffixInflection(`ن${p}`, '', ['cv_s'], ['cv'])),
            ],
        },
    },
};
