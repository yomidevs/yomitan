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
 * @param {boolean} notBeginning
 * @param {string} originalOrthography
 * @param {string} alternateOrthography
 * @param {string[]} conditionsIn
 * @param {string[]} conditionsOut
 * @returns {import('language-transformer').Rule}
 */
function tryAlternateOrthography(notBeginning, originalOrthography, alternateOrthography, conditionsIn, conditionsOut) {
    const orthographyRegExp = notBeginning ? new RegExp('(?<!^)' + originalOrthography, 'g') : new RegExp(originalOrthography, 'g');
    return {
        type: 'other',
        isInflected: orthographyRegExp,
        deinflect: (text) => text.replace(orthographyRegExp, alternateOrthography),
        conditionsIn,
        conditionsOut,
    };
}

/** @type {import('language-transformer').LanguageTransformDescriptor} */
export const oldIrishTransforms = {
    language: 'sga',
    conditions: {},
    transforms: {
        'nd for nn': {
            name: 'nd for nn',
            description: 'nd for nn',
            rules: [
                suffixInflection('nd', 'nn', [], []),
            ],
        },
        'cg for c': {
            name: 'cg for c',
            description: 'cg for c',
            rules: [
                tryAlternateOrthography(false, 'cg', 'c', [], []),
            ],
        },
        'td for t': {
            name: 'td for t',
            description: 'td for t',
            rules: [
                tryAlternateOrthography(false, 'td', 't', [], []),
            ],
        },
        'pb for p': {
            name: 'pb for p',
            description: 'pb for p',
            rules: [
                tryAlternateOrthography(false, 'pb', 'p', [], []),
            ],
        },
        'ǽ/æ for é': {
            name: 'ǽ/æ for é',
            description: 'ǽ/æ for é',
            rules: [
                tryAlternateOrthography(false, 'ǽ', 'é', [], []),
                tryAlternateOrthography(false, 'æ', 'é', [], []),
            ],
        },
        'doubled vowel': {
            name: 'doubled vowel',
            description: 'Doubled Vowel',
            rules: [
                tryAlternateOrthography(true, 'aa', 'á', [], []),
                tryAlternateOrthography(true, 'ee', 'é', [], []),
                tryAlternateOrthography(true, 'ii', 'í', [], []),
                tryAlternateOrthography(true, 'oo', 'ó', [], []),
                tryAlternateOrthography(true, 'uu', 'ú', [], []),
            ],
        },
        'doubled consonant': {
            name: 'doubled consonant',
            description: 'Doubled Consonant',
            rules: [
                tryAlternateOrthography(true, 'cc', 'c', [], []),
                tryAlternateOrthography(true, 'pp', 'p', [], []),
                tryAlternateOrthography(true, 'tt', 't', [], []),
                tryAlternateOrthography(true, 'gg', 'g', [], []),
                tryAlternateOrthography(true, 'bb', 'b', [], []),
                tryAlternateOrthography(true, 'dd', 'd', [], []),
                tryAlternateOrthography(true, 'rr', 'r', [], []),
                tryAlternateOrthography(true, 'll', 'l', [], []),
                tryAlternateOrthography(true, 'nn', 'n', [], []),
                tryAlternateOrthography(true, 'mm', 'm', [], []),
                tryAlternateOrthography(true, 'ss', 's', [], []),
            ],
        },
        'lenited': {
            name: 'lenited',
            description: 'Non-Beginning Lenition',
            rules: [
                tryAlternateOrthography(true, 'ch', 'c', [], []),
                tryAlternateOrthography(true, 'ph', 'p', [], []),
                tryAlternateOrthography(true, 'th', 't', [], []),
            ],
        },
        'lenited (Middle Irish)': {
            name: 'lenited (Middle Irish)',
            description: 'Non-Beginning Lenition (Middle Irish)',
            rules: [
                tryAlternateOrthography(true, 'gh', 'g', [], []),
                tryAlternateOrthography(true, 'bh', 'b', [], []),
                tryAlternateOrthography(true, 'dh', 'd', [], []),
            ],
        },
        '[IM] nasalized': {
            name: '[IM] nasalized',
            description: 'Nasalized Word',
            rules: [
                prefixInflection('ng', 'g', [], []),
                prefixInflection('mb', 'b', [], []),
                prefixInflection('nd', 'd', [], []),
                prefixInflection('n-', '', [], []),
                prefixInflection('m-', '', [], []),
            ],
        },
        '[IM] nasalized (Middle Irish)': {
            name: '[IM] nasalized (Middle Irish)',
            description: 'Nasalized Word (Middle Irish)',
            rules: [
                prefixInflection('gc', 'c', [], []),
                prefixInflection('bp', 'p', [], []),
                prefixInflection('dt', 'd', [], []),
            ],
        },
        '[IM] lenited': {
            name: '[IM] lenited',
            description: 'Lenited Word',
            rules: [
                prefixInflection('ch', 'c', [], []),
                prefixInflection('ph', 'p', [], []),
                prefixInflection('th', 't', [], []),
            ],
        },
        '[IM] lenited (Middle Irish)': {
            name: '[IM] lenited (Middle Irish)',
            description: 'Lenited Word (Middle Irish)',
            rules: [
                prefixInflection('gh', 'g', [], []),
                prefixInflection('bh', 'b', [], []),
                prefixInflection('dh', 'd', [], []),
            ],
        },
        '[IM] aspirated': {
            name: '[IM] aspirated',
            description: 'Aspirated Word',
            rules: [
                prefixInflection('ha', 'a', [], []),
                prefixInflection('he', 'e', [], []),
                prefixInflection('hi', 'i', [], []),
                prefixInflection('ho', 'o', [], []),
                prefixInflection('hu', 'u', [], []),
                prefixInflection('h-', '', [], []),
            ],
        },
        '[IM] geminated': {
            name: '[IM] geminated',
            description: 'Geminated Word',
            rules: [
                prefixInflection('cc', 'c', [], []),
                prefixInflection('pp', 'p', [], []),
                prefixInflection('tt', 't', [], []),
                prefixInflection('gg', 'g', [], []),
                prefixInflection('bb', 'b', [], []),
                prefixInflection('dd', 'd', [], []),
                prefixInflection('rr', 'r', [], []),
                prefixInflection('ll', 'l', [], []),
                prefixInflection('nn', 'n', [], []),
                prefixInflection('mm', 'm', [], []),
                prefixInflection('ss', 's', [], []),
                prefixInflection('c-c', 'c', [], []),
                prefixInflection('p-p', 'p', [], []),
                prefixInflection('t-t', 't', [], []),
                prefixInflection('g-g', 'g', [], []),
                prefixInflection('b-b', 'b', [], []),
                prefixInflection('d-d', 'd', [], []),
                prefixInflection('r-r', 'r', [], []),
                prefixInflection('l-l', 'l', [], []),
                prefixInflection('n-n', 'n', [], []),
                prefixInflection('m-m', 'm', [], []),
                prefixInflection('s-s', 's', [], []),
            ],
        },
    },
};
