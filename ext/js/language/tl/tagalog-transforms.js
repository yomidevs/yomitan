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

const CONSONANTS = 'bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ';
const VOWELS = 'aeiou';

/**
 * @param {string[]} conditionsIn
 * @param {string[]} conditionsOut
 * @returns {import('language-transformer').Rule}
 */
export function hyphenatedInflection(conditionsIn, conditionsOut) {
    const regex = /-/;
    return {
        type: 'prefix',
        isInflected: regex,
        deinflect: (text) => text.replace(regex, ''),
        conditionsIn,
        conditionsOut,
    };
}

/**
 * @param {string} inflectedSuffix
 * @param {string} deinflectedSuffix
 * @param {string[]} conditionsIn
 * @param {string[]} conditionsOut
 * @returns {import('language-transformer').Rule}
 */
export function suffixInflectionWithOtoUSoundChange(inflectedSuffix, deinflectedSuffix, conditionsIn, conditionsOut) {
    const regex = new RegExp(`u([${CONSONANTS}]+)${inflectedSuffix}$`);
    return {
        type: 'prefix',
        isInflected: regex,
        deinflect: (text) => text.replace(regex, `o$1${deinflectedSuffix}`),
        conditionsIn,
        conditionsOut,
    };
}

/**
 * Prefix inflection with repeated first syllable
 * @param {string} inflectedPrefix
 * @param {string} deinflectedPrefix
 * @param {string[]} conditionsIn
 * @param {string[]} conditionsOut
 * @param {string} consonants
 * @returns {import('language-transformer').Rule}
 */
export function prefixInflectionWithRep1(inflectedPrefix, deinflectedPrefix, conditionsIn, conditionsOut, consonants = CONSONANTS) {
    const regex = new RegExp(`^(${inflectedPrefix})([${consonants}]*[${VOWELS}])(\\2)`);
    return {
        type: 'prefix',
        isInflected: regex,
        deinflect: (text) => text.replace(regex, `${deinflectedPrefix}$2`),
        conditionsIn,
        conditionsOut,
    };
}

/**
 * @param {string} inflectedPrefix
 * @param {string} deinflectedPrefix
 * @param {string} inflectedSuffix
 * @param {string} deinflectedSuffix
 * @param {string[]} conditionsIn
 * @param {string[]} conditionsOut
 * @returns {import('language-transformer').Rule}
 */
export function sandwichInflection(inflectedPrefix, deinflectedPrefix, inflectedSuffix, deinflectedSuffix, conditionsIn, conditionsOut) {
    const regex = new RegExp(`^${inflectedPrefix}\\w+${inflectedSuffix}$`);
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
 * @param {string[]} conditionsIn
 * @param {string[]} conditionsOut
 * @returns {import('language-transformer').Rule}
 */
export function sandwichInflectionWithOtoUSoundChange(inflectedPrefix, deinflectedPrefix, inflectedSuffix, deinflectedSuffix, conditionsIn, conditionsOut) {
    const regex = new RegExp(`^${inflectedPrefix}(\\w+)u([${CONSONANTS}]+)${inflectedSuffix}$`);
    return {
        type: 'prefix',
        isInflected: regex,
        deinflect: (text) => text.replace(regex, `${deinflectedPrefix}$1o$2${deinflectedSuffix}`),
        conditionsIn,
        conditionsOut,
    };
}


/** @type {import('language-transformer').LanguageTransformDescriptor} */
export const tagalogTransforms = {
    language: 'tl',
    conditions: {
        n: {
            name: 'Noun',
            isDictionaryForm: true,
            subConditions: ['num'],
        },
        v: {
            name: 'Verb',
            isDictionaryForm: true,
        },
        adj: {
            name: 'Adjective',
            isDictionaryForm: true,
        },
        num: {
            name: 'Numeral',
            isDictionaryForm: true,
        },
    },
    transforms: {
        'hyphenated': {
            name: 'hyphenated',
            description: 'hyphenated form of words',
            rules: [
                hyphenatedInflection([], []),
            ],
        },
        '-an': {
            name: '-an',
            rules: [
                suffixInflection('an', '', [], ['n', 'v']),
                suffixInflection('ran', 'd', [], ['n', 'v']),
                suffixInflectionWithOtoUSoundChange('an', '', [], ['n', 'v']),
                suffixInflectionWithOtoUSoundChange('ran', 'd', [], ['n', 'v']),
                ...[...'aeiou'].map((v) => suffixInflection(`${v}han`, `${v}`, [], ['n', 'v'])), //  murahan
                ...[...'aeiou'].map((v) => suffixInflection(`${v}nan`, `${v}`, [], ['n', 'v'])), //  tawanan
                suffixInflection('uhan', 'o', [], ['n', 'v']),
                suffixInflection('unan', 'o', [], ['n', 'v']),
            ],
        },
        '-in': {
            name: '-in',
            rules: [
                suffixInflection('in', '', [], ['n']),
                suffixInflection('rin', 'd', [], ['n']),
                suffixInflectionWithOtoUSoundChange('in', '', [], ['n']),
                suffixInflectionWithOtoUSoundChange('rin', 'd', [], ['n']),
                ...[...'aeiou'].map((v) => suffixInflection(`${v}hin`, `${v}`, [], ['n'])), //  katihin
                ...[...'aeiou'].map((v) => suffixInflection(`${v}nin`, `${v}`, [], ['n'])), //  talunin
                suffixInflection('uhin', 'o', [], ['n']),
                suffixInflection('unin', 'o', [], ['n']),
            ],
        },
        'ma-': {
            name: 'ma-',
            rules: [
                prefixInflection('ma', '', [], []),
                prefixInflection('mar', 'd', [], []),
            ],
        },
        'pang-': {
            name: 'pang-',
            rules: [
                prefixInflection('pang', '', [], ['n']),
                ...[...'dlrst'].map((v) => prefixInflection(`pan${v}`, `${v}`, [], ['n'])),
                ...[...'bp'].map((v) => prefixInflection(`pam${v}`, `${v}`, [], ['n'])),
            ],
        },
        'ka-': {
            name: 'ka-',
            rules: [
                prefixInflection('ka', '', [], ['n']),
                prefixInflection('kar', 'd', [], ['n']),
            ],
        },
        'kaka-': {
            name: 'kaka-',
            rules: [
                prefixInflection('kaka', '', [], ['n']),
                prefixInflection('kakar', 'd', [], ['n']),
                prefixInflectionWithRep1('ka', '', [], ['n']),
            ],
        },
        'ka-...-an': {
            name: 'ka-...-an',
            rules: [
                sandwichInflection('ka', '', 'an', '', [], ['n']),
                sandwichInflection('kar', 'd', 'an', '', [], ['n']),
                sandwichInflection('ka', '', 'an', '', [], ['n']),
                sandwichInflection('kar', 'd', 'ran', 'd', [], ['n']),
                ...[...'aeiou'].map((v) => sandwichInflection('ka', '', `${v}han`, `${v}`, [], ['n'])), //  murahan
                ...[...'aeiou'].map((v) => sandwichInflection('kar', 'd', `${v}han`, `${v}`, [], ['n'])), //  murahan
                ...[...'aeiou'].map((v) => sandwichInflection('ka', '', `${v}nan`, `${v}`, [], ['n'])), //  murahan
                ...[...'aeiou'].map((v) => sandwichInflection('kar', 'd', `${v}nan`, `${v}`, [], ['n'])), //  tawanan
                sandwichInflection('ka', '', 'uhan', 'o', [], ['n', 'v']),
                sandwichInflection('kar', 'd', 'uhan', 'o', [], ['n', 'v']),
                sandwichInflection('ka', '', 'unan', 'o', [], ['n', 'v']),
                sandwichInflection('kar', 'd', 'unan', 'o', [], ['n', 'v']),
                sandwichInflectionWithOtoUSoundChange('ka', '', 'an', '', [], ['n']),
                sandwichInflectionWithOtoUSoundChange('kar', 'd', 'an', '', [], ['n']),
                sandwichInflectionWithOtoUSoundChange('ka', '', 'ran', 'd', [], ['n']),
                sandwichInflectionWithOtoUSoundChange('kar', 'd', 'ran', 'd', [], ['n']),
            ],
        },
        'mag-': {
            name: 'mag-',
            rules: [
                prefixInflection('mag', '', [], ['n']),
            ],
        },
        'mag- + rep1': {
            name: 'mag- + rep1',
            rules: [
                prefixInflectionWithRep1('mag', '', [], ['n']),
            ],
        },
        'magka-': {
            name: 'magka-',
            rules: [
                prefixInflection('magka', '', [], ['n']),
                prefixInflection('magkar', 'd', [], ['n']),
            ],
        },
        'magkaka-': {
            name: 'magkaka-',
            rules: [
                prefixInflection('magkaka', '', [], ['n']),
                prefixInflection('magkakar', 'd', [], ['n']),
            ],
        },
        'mang- + rep1': {
            name: 'mang- + rep1',
            rules: [
                prefixInflectionWithRep1('mang', '', [], ['n']),
                prefixInflectionWithRep1('man', '', [], ['n'], 'dlrst'),
                prefixInflectionWithRep1('mam', '', [], ['n'], 'bp'),
            ],
        },
        'pa-': {
            name: 'pa-',
            rules: [
                prefixInflection('pa', '', [], ['n']),
                prefixInflection('par', 'd', [], ['n']),
            ],
        },
        'pa-...-an': {
            name: 'pa-...-an',
            rules: [
                sandwichInflection('pa', '', 'an', '', [], ['n']),
                sandwichInflection('par', 'd', 'an', '', [], ['n']),
                sandwichInflection('pa', '', 'an', '', [], ['n']),
                sandwichInflection('par', 'd', 'ran', 'd', [], ['n']),
                ...[...'aeiou'].map((v) => sandwichInflection('pa', '', `${v}han`, `${v}`, [], ['n'])), //  murahan
                ...[...'aeiou'].map((v) => sandwichInflection('par', 'd', `${v}han`, `${v}`, [], ['n'])), //  murahan
                ...[...'aeiou'].map((v) => sandwichInflection('pa', '', `${v}nan`, `${v}`, [], ['n'])), //  murahan
                ...[...'aeiou'].map((v) => sandwichInflection('par', 'd', `${v}nan`, `${v}`, [], ['n'])), //  tawanan
                sandwichInflection('pa', '', 'uhan', 'o', [], ['n', 'v']),
                sandwichInflection('par', 'd', 'uhan', 'o', [], ['n', 'v']),
                sandwichInflection('pa', '', 'unan', 'o', [], ['n', 'v']),
                sandwichInflection('par', 'd', 'unan', 'o', [], ['n', 'v']),
                sandwichInflectionWithOtoUSoundChange('pa', '', 'ran', 'd', [], ['n']),
                sandwichInflectionWithOtoUSoundChange('par', 'd', 'ran', 'd', [], ['n']),
            ],
        },
        'pag-': {
            name: 'pag-',
            rules: [
                prefixInflection('pag', '', [], ['n']),
            ],
        },
        'pag- + rep1': {
            name: 'pag- + rep1',
            rules: [
                prefixInflectionWithRep1('pag', '', [], ['n']),
            ],
        },
        'pagka-': {
            name: 'pagka-',
            rules: [
                prefixInflection('pagka', '', [], ['n']),
                prefixInflection('pagkar', 'd', [], ['n']),
                prefixInflection('pagkaka', '', [], ['n']),
                prefixInflection('pagkakar', 'd', [], ['n']),
            ],
        },
        'pakiki-': {
            name: 'pakiki-',
            rules: [
                prefixInflection('pakiki', '', [], ['n']),
                prefixInflectionWithRep1('pakiki', '', [], ['n']),
                prefixInflection('pakikir', 'd', [], ['n']),
            ],
        },
        'pakikipag-': {
            name: 'pakikipag-',
            rules: [
                prefixInflection('pakikipag', '', [], ['n']),
            ],
        },
        'pang- + rep1': {
            name: 'pang- + rep1',
            rules: [
                prefixInflectionWithRep1('pang', '', [], ['n']),
                prefixInflectionWithRep1('pan', '', [], ['n'], 'dlrst'),
                prefixInflectionWithRep1('pam', '', [], ['n'], 'bp'),
            ],
        },
        'tag-': {
            name: 'tag-',
            rules: [
                prefixInflection('tag', '', [], ['n']),
            ],
        },
        'taga-': {
            name: 'taga-',
            rules: [
                prefixInflection('taga', '', [], ['n']),
            ],
        },
        'tagapag-': {
            name: 'tagapag-',
            rules: [
                prefixInflection('tagapag', '', [], ['n']),
            ],
        },
        'tagapang-': {
            name: 'tagapang-',
            rules: [
                prefixInflection('tagapang', '', [], ['n']),
                ...[...'dlrst'].map((v) => prefixInflection(`tagapan${v}`, `${v}`, [], ['n'])),
                ...[...'bp'].map((v) => prefixInflection(`tagapam${v}`, `${v}`, [], ['n'])),
            ],
        },
    },
};
