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
                suffixInflection('an', '', [], []),
                suffixInflection('ran', 'd', [], []),
                suffixInflectionWithOtoUSoundChange('an', '', [], []),
                suffixInflectionWithOtoUSoundChange('ran', 'd', [], []),
                ...[...'aeiou'].map((v) => suffixInflection(`${v}han`, `${v}`, [], [])), //  murahan
                ...[...'aeiou'].map((v) => suffixInflection(`${v}nan`, `${v}`, [], [])), //  tawanan
                suffixInflection('uhan', 'o', [], []),
                suffixInflection('unan', 'o', [], []),
            ],
        },
        '-in': {
            name: '-in',
            rules: [
                suffixInflection('in', '', [], []),
                suffixInflection('rin', 'd', [], []),
                suffixInflectionWithOtoUSoundChange('in', '', [], []),
                suffixInflectionWithOtoUSoundChange('rin', 'd', [], []),
                ...[...'aeiou'].map((v) => suffixInflection(`${v}hin`, `${v}`, [], [])), //  katihin
                ...[...'aeiou'].map((v) => suffixInflection(`${v}nin`, `${v}`, [], [])), //  talunin
                suffixInflection('uhin', 'o', [], []),
                suffixInflection('unin', 'o', [], []),
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
                prefixInflection('pang', '', [], []),
                ...[...'dlrst'].map((v) => prefixInflection(`pan${v}`, `${v}`, [], [])),
                ...[...'bp'].map((v) => prefixInflection(`pam${v}`, `${v}`, [], [])),
            ],
        },
        'ka-': {
            name: 'ka-',
            rules: [
                prefixInflection('ka', '', [], []),
                prefixInflection('kar', 'd', [], []),
            ],
        },
        'kaka-': {
            name: 'kaka-',
            rules: [
                prefixInflection('kaka', '', [], []),
                prefixInflection('kakar', 'd', [], []),
                prefixInflectionWithRep1('ka', '', [], []),
            ],
        },
        'ka-...-an': {
            name: 'ka-...-an',
            rules: [
                sandwichInflection('ka', '', 'an', '', [], []),
                sandwichInflection('kar', 'd', 'an', '', [], []),
                sandwichInflection('ka', '', 'ran', 'd', [], []),
                sandwichInflection('kar', 'd', 'ran', 'd', [], []),
                ...[...'aeiou'].map((v) => sandwichInflection('ka', '', `${v}han`, `${v}`, [], [])), //  murahan
                ...[...'aeiou'].map((v) => sandwichInflection('kar', 'd', `${v}han`, `${v}`, [], [])), //  murahan
                ...[...'aeiou'].map((v) => sandwichInflection('ka', '', `${v}nan`, `${v}`, [], [])), //  murahan
                ...[...'aeiou'].map((v) => sandwichInflection('kar', 'd', `${v}nan`, `${v}`, [], [])), //  tawanan
                sandwichInflection('ka', '', 'uhan', 'o', [], []),
                sandwichInflection('kar', 'd', 'uhan', 'o', [], []),
                sandwichInflection('ka', '', 'unan', 'o', [], []),
                sandwichInflection('kar', 'd', 'unan', 'o', [], []),
                sandwichInflectionWithOtoUSoundChange('ka', '', 'an', '', [], []),
                sandwichInflectionWithOtoUSoundChange('kar', 'd', 'an', '', [], []),
                sandwichInflectionWithOtoUSoundChange('ka', '', 'ran', 'd', [], []),
                sandwichInflectionWithOtoUSoundChange('kar', 'd', 'ran', 'd', [], []),
            ],
        },
        'mag-': {
            name: 'mag-',
            rules: [
                prefixInflection('mag', '', [], []),
            ],
        },
        'mag- + rep1': {
            name: 'mag- + rep1',
            rules: [
                prefixInflectionWithRep1('mag', '', [], []),
            ],
        },
        'magka-': {
            name: 'magka-',
            rules: [
                prefixInflection('magka', '', [], []),
                prefixInflection('magkar', 'd', [], []),
            ],
        },
        'magkaka-': {
            name: 'magkaka-',
            rules: [
                prefixInflection('magkaka', '', [], []),
                prefixInflection('magkakar', 'd', [], []),
            ],
        },
        'mang- + rep1': {
            name: 'mang- + rep1',
            rules: [
                prefixInflectionWithRep1('mang', '', [], []),
                prefixInflectionWithRep1('man', '', [], [], 'dlrst'),
                prefixInflectionWithRep1('mam', '', [], [], 'bp'),
            ],
        },
        'pa-': {
            name: 'pa-',
            rules: [
                prefixInflection('pa', '', [], []),
                prefixInflection('par', 'd', [], []),
            ],
        },
        'pa-...-an': {
            name: 'pa-...-an',
            rules: [
                sandwichInflection('pa', '', 'an', '', [], []),
                sandwichInflection('par', 'd', 'an', '', [], []),
                sandwichInflection('pa', '', 'ran', 'd', [], []),
                sandwichInflection('par', 'd', 'ran', 'd', [], []),
                ...[...'aeiou'].map((v) => sandwichInflection('pa', '', `${v}han`, `${v}`, [], [])), //  murahan
                ...[...'aeiou'].map((v) => sandwichInflection('par', 'd', `${v}han`, `${v}`, [], [])), //  murahan
                ...[...'aeiou'].map((v) => sandwichInflection('pa', '', `${v}nan`, `${v}`, [], [])), //  murahan
                ...[...'aeiou'].map((v) => sandwichInflection('par', 'd', `${v}nan`, `${v}`, [], [])), //  tawanan
                sandwichInflection('pa', '', 'uhan', 'o', [], []),
                sandwichInflection('par', 'd', 'uhan', 'o', [], []),
                sandwichInflection('pa', '', 'unan', 'o', [], []),
                sandwichInflection('par', 'd', 'unan', 'o', [], []),
                sandwichInflectionWithOtoUSoundChange('pa', '', 'an', '', [], []),
                sandwichInflectionWithOtoUSoundChange('par', 'd', 'an', '', [], []),
                sandwichInflectionWithOtoUSoundChange('pa', '', 'ran', 'd', [], []),
                sandwichInflectionWithOtoUSoundChange('par', 'd', 'ran', 'd', [], []),
            ],
        },
        'pag-': {
            name: 'pag-',
            rules: [
                prefixInflection('pag', '', [], []),
            ],
        },
        'pag- + rep1': {
            name: 'pag- + rep1',
            rules: [
                prefixInflectionWithRep1('pag', '', [], []),
            ],
        },
        'pagka-': {
            name: 'pagka-',
            rules: [
                prefixInflection('pagka', '', [], []),
                prefixInflection('pagkar', 'd', [], []),
                prefixInflection('pagkaka', '', [], []),
                prefixInflection('pagkakar', 'd', [], []),
            ],
        },
        'pakiki-': {
            name: 'pakiki-',
            rules: [
                prefixInflection('pakiki', '', [], []),
                prefixInflectionWithRep1('pakiki', '', [], []),
                prefixInflection('pakikir', 'd', [], []),
            ],
        },
        'pakikipag-': {
            name: 'pakikipag-',
            rules: [
                prefixInflection('pakikipag', '', [], []),
            ],
        },
        'pang- + rep1': {
            name: 'pang- + rep1',
            rules: [
                prefixInflectionWithRep1('pang', '', [], []),
                prefixInflectionWithRep1('pan', '', [], [], 'dlrst'),
                prefixInflectionWithRep1('pam', '', [], [], 'bp'),
            ],
        },
        'tag-': {
            name: 'tag-',
            rules: [
                prefixInflection('tag', '', [], []),
            ],
        },
        'taga-': {
            name: 'taga-',
            rules: [
                prefixInflection('taga', '', [], []),
            ],
        },
        'tagapag-': {
            name: 'tagapag-',
            rules: [
                prefixInflection('tagapag', '', [], []),
            ],
        },
        'tagapang-': {
            name: 'tagapang-',
            rules: [
                prefixInflection('tagapang', '', [], []),
                ...[...'dlrst'].map((v) => prefixInflection(`tagapan${v}`, `${v}`, [], [])),
                ...[...'bp'].map((v) => prefixInflection(`tagapam${v}`, `${v}`, [], [])),
            ],
        },
        'i-': {
            name: 'i-',
            rules: [
                prefixInflection('i', '', [], []),
            ],
        },
        'ika-': {
            name: 'ika-',
            rules: [
                prefixInflection('ika', '', [], []),
            ],
        },
        'ipa-': {
            name: 'ipa-',
            rules: [
                prefixInflection('ipa', '', [], []),
            ],
        },
        'ipag-': {
            name: 'ipag-',
            rules: [
                prefixInflection('ipag', '', [], []),
            ],
        },
        'ipag- + rep1': {
            name: 'ipag- + rep1',
            rules: [
                prefixInflectionWithRep1('ipag', '', [], []),
            ],
        },
        'ipang-': {
            name: 'ipang-',
            rules: [
                prefixInflection('ipang', '', [], []),
                ...[...'dlrst'].map((v) => prefixInflection(`ipan${v}`, `${v}`, [], [])),
                ...[...'bp'].map((v) => prefixInflection(`ipam${v}`, `${v}`, [], [])),
            ],
        },
        'ma-...-an': {
            name: 'ma-...-an',
            rules: [
                sandwichInflection('ma', '', 'an', '', [], []),
                sandwichInflection('mar', 'd', 'an', '', [], []),
                sandwichInflection('ma', '', 'ran', 'd', [], []),
                sandwichInflection('mar', 'd', 'ran', 'd', [], []),
                ...[...'aeiou'].map((v) => sandwichInflection('ma', '', `${v}han`, `${v}`, [], [])),
                ...[...'aeiou'].map((v) => sandwichInflection('mar', 'd', `${v}han`, `${v}`, [], [])),
                ...[...'aeiou'].map((v) => sandwichInflection('ma', '', `${v}nan`, `${v}`, [], [])),
                ...[...'aeiou'].map((v) => sandwichInflection('mar', 'd', `${v}nan`, `${v}`, [], [])),
                sandwichInflection('ma', '', 'uhan', 'o', [], []),
                sandwichInflection('mar', 'd', 'uhan', 'o', [], []),
                sandwichInflection('ma', '', 'unan', 'o', [], []),
                sandwichInflection('mar', 'd', 'unan', 'o', [], []),
                sandwichInflectionWithOtoUSoundChange('ma', '', 'an', '', [], []),
                sandwichInflectionWithOtoUSoundChange('mar', 'd', 'an', '', [], []),
                sandwichInflectionWithOtoUSoundChange('ma', '', 'ran', 'd', [], []),
                sandwichInflectionWithOtoUSoundChange('mar', 'd', 'ran', 'd', [], []),
            ],
        },
        'mag-...-an': {
            name: 'mag-...-an',
            rules: [
                sandwichInflection('mag', '', 'an', '', [], []),
                sandwichInflection('mag', '', 'ran', 'd', [], []),
                ...[...'aeiou'].map((v) => sandwichInflection('mag', '', `${v}han`, `${v}`, [], [])),
                ...[...'aeiou'].map((v) => sandwichInflection('mag', '', `${v}nan`, `${v}`, [], [])),
                sandwichInflection('mag', '', 'uhan', 'o', [], []),
                sandwichInflection('mag', '', 'unan', 'o', [], []),
                sandwichInflectionWithOtoUSoundChange('mag', '', 'an', '', [], []),
                sandwichInflectionWithOtoUSoundChange('mag', '', 'ran', 'd', [], []),
            ],
        },
        'magkanda-': {
            name: 'magkanda-',
            rules: [
                prefixInflection('magkanda', '', [], []),
                prefixInflection('magkandar', 'd', [], []),
            ],
        },
        'magma-': {
            name: 'magma-',
            rules: [
                prefixInflection('magma', '', [], []),
                prefixInflection('magmar', 'd', [], []),
            ],
        },
        'magpa-': {
            name: 'magpa-',
            rules: [
                prefixInflection('magpa', '', [], []),
                prefixInflection('magpar', 'd', [], []),
            ],
        },
        'magpaka-': {
            name: 'magpaka-',
            rules: [
                prefixInflection('magpaka', '', [], []),
                prefixInflection('magpakar', 'd', [], []),
            ],
        },
        'magsi-': {
            name: 'magsi-',
            rules: [
                prefixInflection('magsi', '', [], []),
                prefixInflection('magsipag', '', [], []),
            ],
        },
        'makapang-': {
            name: 'makapang-',
            rules: [
                prefixInflection('makapang', '', [], []),
                ...[...'dlrst'].map((v) => prefixInflection(`makapan${v}`, `${v}`, [], [])),
                ...[...'bp'].map((v) => prefixInflection(`makapam${v}`, `${v}`, [], [])),
            ],
        },
        'makapag-': {
            name: 'makapag-',
            rules: [
                prefixInflection('makapag', '', [], []),
            ],
        },
        'maka-': {
            name: 'maka-',
            rules: [
                prefixInflection('maka', '', [], []),
                prefixInflection('makar', 'd', [], []),
            ],
        },
        'maki-': {
            name: 'maki-',
            rules: [
                prefixInflection('maki', '', [], []),
                prefixInflection('makir', 'd', [], []),
            ],
        },
        'makipag-': {
            name: 'makipag-',
            rules: [
                prefixInflection('makipag', '', [], []),
            ],
        },
        'makipag-...-an': {
            name: 'makipag-...-an',
            rules: [
                sandwichInflection('makipag', '', 'an', '', [], []),
                sandwichInflection('makipag', '', 'ran', 'd', [], []),
                ...[...'aeiou'].map((v) => sandwichInflection('makipag', '', `${v}han`, `${v}`, [], [])),
                ...[...'aeiou'].map((v) => sandwichInflection('makipag', '', `${v}nan`, `${v}`, [], [])),
                sandwichInflection('makipag', '', 'uhan', 'o', [], []),
                sandwichInflection('makipag', '', 'unan', 'o', [], []),
                sandwichInflectionWithOtoUSoundChange('makipag', '', 'an', '', [], []),
                sandwichInflectionWithOtoUSoundChange('makipag', '', 'ran', 'd', [], []),
            ],
        },
        'mang-': {
            name: 'mang-',
            rules: [
                prefixInflection('mang', '', [], []),
                ...[...'dlrst'].map((v) => prefixInflection(`man${v}`, `${v}`, [], [])),
                ...[...'bp'].map((v) => prefixInflection(`mam${v}`, `${v}`, [], [])),
            ],
        },
        'mapa-': {
            name: 'mapa-',
            rules: [
                prefixInflection('mapa', '', [], []),
                prefixInflection('mapar', 'd', [], []),
            ],
        },
        'pa-...-in': {
            name: 'pa-...-in',
            rules: [
                sandwichInflection('pa', '', 'in', '', [], []),
                sandwichInflection('par', 'd', 'in', '', [], []),
                sandwichInflection('pa', '', 'rin', 'd', [], []),
                sandwichInflection('par', 'd', 'rin', 'd', [], []),
                ...[...'aeiou'].map((v) => sandwichInflection('pa', '', `${v}hin`, `${v}`, [], [])), //  murahan
                ...[...'aeiou'].map((v) => sandwichInflection('par', 'd', `${v}hin`, `${v}`, [], [])), //  murahan
                ...[...'aeiou'].map((v) => sandwichInflection('pa', '', `${v}nin`, `${v}`, [], [])), //  murahan
                ...[...'aeiou'].map((v) => sandwichInflection('par', 'd', `${v}nin`, `${v}`, [], [])), //  tawanan
                sandwichInflection('pa', '', 'uhin', 'o', [], []),
                sandwichInflection('par', 'd', 'uhin', 'o', [], []),
                sandwichInflection('pa', '', 'unin', 'o', [], []),
                sandwichInflection('par', 'd', 'unin', 'o', [], []),
                sandwichInflectionWithOtoUSoundChange('pa', '', 'in', '', [], []),
                sandwichInflectionWithOtoUSoundChange('par', 'd', 'in', '', [], []),
                sandwichInflectionWithOtoUSoundChange('pa', '', 'rin', 'd', [], []),
                sandwichInflectionWithOtoUSoundChange('par', 'd', 'rin', 'd', [], []),
            ],
        },
        'pag-...-an': {
            name: 'pag-...-an',
            rules: [
                sandwichInflection('pag', '', 'an', '', [], []),
                sandwichInflection('pag', '', 'ran', 'd', [], []),
                ...[...'aeiou'].map((v) => sandwichInflection('pag', '', `${v}han`, `${v}`, [], [])),
                ...[...'aeiou'].map((v) => sandwichInflection('pag', '', `${v}nan`, `${v}`, [], [])),
                sandwichInflection('pag', '', 'uhan', 'o', [], []),
                sandwichInflection('pag', '', 'unan', 'o', [], []),
                sandwichInflectionWithOtoUSoundChange('pag', '', 'an', '', [], []),
                sandwichInflectionWithOtoUSoundChange('pag', '', 'ran', 'd', [], []),
            ],
        },
        'pang-...-an': {
            name: 'pang-...-an',
            rules: [
                sandwichInflection('pang', '', 'an', '', [], []),
                sandwichInflection('pang', '', 'ran', 'd', [], []),
                ...[...'aeiou'].map((v) => sandwichInflection('pang', '', `${v}han`, `${v}`, [], [])),
                ...[...'aeiou'].map((v) => sandwichInflection('pang', '', `${v}nan`, `${v}`, [], [])),
                sandwichInflection('pang', '', 'uhan', 'o', [], []),
                sandwichInflection('pang', '', 'unan', 'o', [], []),
                sandwichInflectionWithOtoUSoundChange('pang', '', 'an', '', [], []),
                sandwichInflectionWithOtoUSoundChange('pang', '', 'ran', 'd', [], []),

                ...[...'dlrst'].flatMap((v) => [
                    sandwichInflection(`pan${v}`, `${v}`, 'an', '', [], []),
                    sandwichInflection(`pan${v}`, `${v}`, 'ran', 'd', [], []),
                    ...[...'aeiou'].map((k) => sandwichInflection(`pan${v}`, `${v}`, `${k}han`, `${k}`, [], [])),
                    ...[...'aeiou'].map((k) => sandwichInflection(`pan${v}`, `${v}`, `${k}nan`, `${k}`, [], [])),
                    sandwichInflection(`pan${v}`, '', 'uhan', 'o', [], []),
                    sandwichInflection(`pan${v}`, '', 'unan', 'o', [], []),
                    sandwichInflectionWithOtoUSoundChange(`pan${v}`, `${v}`, 'an', '', [], []),
                    sandwichInflectionWithOtoUSoundChange(`pan${v}`, `${v}`, 'ran', 'd', [], []),
                ]),
                ...[...'bp'].flatMap((v) => [
                    sandwichInflection(`pam${v}`, `${v}`, 'an', '', [], []),
                    sandwichInflection(`pam${v}`, `${v}`, 'ran', 'd', [], []),
                    ...[...'aeiou'].map((k) => sandwichInflection(`pam${v}`, `${v}`, `${k}han`, `${k}`, [], [])),
                    ...[...'aeiou'].map((k) => sandwichInflection(`pam${v}`, `${v}`, `${k}nan`, `${k}`, [], [])),
                    sandwichInflection(`pam${v}`, '', 'uhan', 'o', [], []),
                    sandwichInflection(`pam${v}`, '', 'unan', 'o', [], []),
                    sandwichInflectionWithOtoUSoundChange(`pam${v}`, `${v}`, 'an', '', [], []),
                    sandwichInflectionWithOtoUSoundChange(`pam${v}`, `${v}`, 'ran', 'd', [], []),
                ]),
            ],
        },
        'pag-...-in': {
            name: 'pag-...-in',
            rules: [
                sandwichInflection('pag', '', 'in', '', [], []),
                sandwichInflection('pag', '', 'rin', 'd', [], []),
                ...[...'aeiou'].map((v) => sandwichInflection('pag', '', `${v}hin`, `${v}`, [], [])),
                ...[...'aeiou'].map((v) => sandwichInflection('pag', '', `${v}nin`, `${v}`, [], [])),
                sandwichInflection('pag', '', 'uhin', 'o', [], []),
                sandwichInflection('pag', '', 'unin', 'o', [], []),
                sandwichInflectionWithOtoUSoundChange('pag', '', 'in', '', [], []),
                sandwichInflectionWithOtoUSoundChange('pag', '', 'rin', 'd', [], []),
            ],
        },
        'papang-...-in': {
            name: 'papang-...-in',
            rules: [
                sandwichInflection('papang', '', 'in', '', [], []),
                sandwichInflection('papang', '', 'rin', 'd', [], []),
                ...[...'aeiou'].map((v) => sandwichInflection('papang', '', `${v}hin`, `${v}`, [], [])),
                ...[...'aeiou'].map((v) => sandwichInflection('papang', '', `${v}nin`, `${v}`, [], [])),
                sandwichInflection('papang', '', 'uhin', 'o', [], []),
                sandwichInflection('papang', '', 'unin', 'o', [], []),
                sandwichInflectionWithOtoUSoundChange('papang', '', 'in', '', [], []),
                sandwichInflectionWithOtoUSoundChange('papang', '', 'rin', 'd', [], []),

                ...[...'dlrst'].flatMap((v) => [
                    sandwichInflection(`papan${v}`, `${v}`, 'in', '', [], []),
                    sandwichInflection(`papan${v}`, `${v}`, 'rin', 'd', [], []),
                    ...[...'aeiou'].map((k) => sandwichInflection(`papan${v}`, `${v}`, `${k}hin`, `${k}`, [], [])),
                    ...[...'aeiou'].map((k) => sandwichInflection(`papan${v}`, `${v}`, `${k}nin`, `${k}`, [], [])),
                    sandwichInflection(`papan${v}`, '', 'uhin', 'o', [], []),
                    sandwichInflection(`papan${v}`, '', 'unin', 'o', [], []),
                    sandwichInflectionWithOtoUSoundChange(`papan${v}`, `${v}`, 'in', '', [], []),
                    sandwichInflectionWithOtoUSoundChange(`papan${v}`, `${v}`, 'rin', 'd', [], []),
                ]),
                ...[...'bp'].flatMap((v) => [
                    sandwichInflection(`papam${v}`, `${v}`, 'in', '', [], []),
                    sandwichInflection(`papam${v}`, `${v}`, 'rin', 'd', [], []),
                    ...[...'aeiou'].map((k) => sandwichInflection(`papam${v}`, `${v}`, `${k}hin`, `${k}`, [], [])),
                    ...[...'aeiou'].map((k) => sandwichInflection(`papam${v}`, `${v}`, `${k}nin`, `${k}`, [], [])),
                    sandwichInflection(`papam${v}`, '', 'uhin', 'o', [], []),
                    sandwichInflection(`papam${v}`, '', 'unin', 'o', [], []),
                    sandwichInflectionWithOtoUSoundChange(`papam${v}`, `${v}`, 'in', '', [], []),
                    sandwichInflectionWithOtoUSoundChange(`papam${v}`, `${v}`, 'rin', 'd', [], []),
                ]),
            ],
        },
        'ma-...-in': {
            name: 'ma-...-in',
            rules: [
                sandwichInflection('ma', '', 'in', '', [], []),
                sandwichInflection('mar', 'd', 'in', '', [], []),
                sandwichInflection('ma', '', 'rin', 'd', [], []),
                sandwichInflection('mar', 'd', 'rin', 'd', [], []),
                ...[...'aeiou'].map((v) => sandwichInflection('ma', '', `${v}hin`, `${v}`, [], [])),
                ...[...'aeiou'].map((v) => sandwichInflection('mar', 'd', `${v}hin`, `${v}`, [], [])),
                ...[...'aeiou'].map((v) => sandwichInflection('ma', '', `${v}nin`, `${v}`, [], [])),
                ...[...'aeiou'].map((v) => sandwichInflection('mar', 'd', `${v}nin`, `${v}`, [], [])),
                sandwichInflection('ma', '', 'uhin', 'o', [], []),
                sandwichInflection('mar', 'd', 'uhin', 'o', [], []),
                sandwichInflection('ma', '', 'unin', 'o', [], []),
                sandwichInflection('mar', 'd', 'unin', 'o', [], []),
                sandwichInflectionWithOtoUSoundChange('ma', '', 'in', '', [], []),
                sandwichInflectionWithOtoUSoundChange('mar', 'd', 'in', '', [], []),
                sandwichInflectionWithOtoUSoundChange('ma', '', 'rin', 'd', [], []),
                sandwichInflectionWithOtoUSoundChange('mar', 'd', 'rin', 'd', [], []),
            ],
        },
        'mapag-': {
            name: 'mapag-',
            rules: [
                prefixInflection('mapag', '', [], []),
            ],
        },
        'naka-': {
            name: 'naka-',
            rules: [
                prefixInflection('naka', '', [], []),
                prefixInflection('nakar', 'd', [], []),
            ],
        },
        'nakaka-': {
            name: 'nakaka-',
            rules: [
                prefixInflection('nakaka', '', [], []),
                prefixInflection('nakakar', 'd', [], []),
            ],
        },
        'nakakapang-': {
            name: 'nakakapang-',
            rules: [
                prefixInflection('nakakapang', '', [], []),
                ...[...'dlrst'].map((v) => prefixInflection(`nakakapan${v}`, `${v}`, [], [])),
                ...[...'bp'].map((v) => prefixInflection(`nakakapam${v}`, `${v}`, [], [])),
            ],
        },
        'pala-': {
            name: 'pala-',
            rules: [
                prefixInflection('pala', '', [], []),
                prefixInflection('palar', 'd', [], []),
            ],
        },
    },
};
