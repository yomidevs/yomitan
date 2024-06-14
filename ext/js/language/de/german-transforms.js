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

// https://www.dartmouth.edu/~deutsch/Grammatik/Wortbildung/Separables.html
const separablePrefixes = ['ab', 'an', 'auf', 'aus', 'auseinander', 'bei', 'da', 'dabei', 'dar', 'daran', 'dazwischen', 'durch', 'ein', 'empor', 'entgegen', 'entlang', 'entzwei', 'fehl', 'fern', 'fest', 'fort', 'frei', 'gegenüber', 'gleich', 'heim', 'her', 'herab', 'heran', 'herauf', 'heraus', 'herbei', 'herein', 'herüber', 'herum', 'herunter', 'hervor', 'hin', 'hinab', 'hinauf', 'hinaus', 'hinein', 'hinterher', 'hinunter', 'hinweg', 'hinzu', 'hoch', 'los', 'mit', 'nach', 'nebenher', 'nieder', 'statt', 'um', 'vor', 'voran', 'voraus', 'vorbei', 'vorüber', 'vorweg', 'weg', 'weiter', 'wieder', 'zu', 'zurecht', 'zurück', 'zusammen'];

/**
 * @param {string} prefix
 * @param {string[]} conditionsIn
 * @param {string[]} conditionsOut
 * @returns {import('language-transformer').Rule}
 */
function separatedPrefix(prefix, conditionsIn, conditionsOut) {
    const germanLetters = 'a-zA-ZäöüßÄÖÜẞ';
    const regex = new RegExp(`^([${germanLetters}]+) .+ ${prefix}$`);
    return {
        type: 'other',
        isInflected: regex,
        deinflect: (term) => {
            return term.replace(regex, '$1 ' + prefix);
        },
        conditionsIn,
        conditionsOut,
    };
}

const separatedPrefixInflections = separablePrefixes.map((prefix) => {
    return separatedPrefix(prefix, [], []);
});

const zuInfinitiveInflections = separablePrefixes.map((prefix) => {
    return prefixInflection(prefix + 'zu', prefix, [], ['v']);
});

export const germanTransforms = {
    language: 'de',
    conditions: {
        v: {
            name: 'Verb',
            isDictionaryForm: true,
        },
        n: {
            name: 'Noun',
            isDictionaryForm: true,
        },
        adj: {
            name: 'Adjective',
            isDictionaryForm: true,
        },
    },
    transforms: {
        'nominalization': {
            name: 'nominalization',
            description: 'Noun formed from a verb',
            rules: [
                suffixInflection('ung', 'en', [], []),
                suffixInflection('lung', 'eln', [], []),
            ],
        },
        '-bar': {
            name: '-bar',
            description: '-able adjective from a verb',
            rules: [
                suffixInflection('bar', 'en', [], ['v']),
                suffixInflection('bar', 'n', [], ['v']), // Lieferbar
            ],
        },
        'negative': {
            name: 'negative',
            description: 'Negation',
            rules: [
                prefixInflection('un', '', [], ['adj']),
            ],
        },
        'separated prefix': {
            name: 'separated prefix',
            description: 'Separable prefix',
            rules: [
                ...separatedPrefixInflections,
            ],
        },
        'zu-infinitive': {
            name: 'zu-infinitive',
            description: 'zu-infinitive',
            rules: [
                ...zuInfinitiveInflections,
            ],
        },
    },
};
