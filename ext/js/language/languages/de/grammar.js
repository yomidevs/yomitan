/*
 * Copyright (C) 2016-2022  Yomichan Authors
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

/* global
 * separatedPrefix
 * suffixInflection
*/

window.languages.de.getDeinflectionReasons = async () => {
    const separablePrefixes = [ // https://www.dartmouth.edu/~deutsch/Grammatik/Wortbildung/Separables.html
        'ab',
        'an',
        'auf',
        'aus',
        'auseinander',
        'bei',
        'da',
        'dabei',
        'dar',
        'daran',
        'dazwischen',
        'durch',
        'ein',
        'empor',
        'entgegen',
        'entlang',
        'entzwei',
        'fehl',
        'fern',
        'fest',
        'fort',
        'frei',
        'gegenüber',
        'gleich',
        'heim',
        'her',
        'herab',
        'heran',
        'herauf',
        'heraus',
        'herbei',
        'herein',
        'herüber',
        'herum',
        'herunter',
        'hervor',
        'hin',
        'hinab',
        'hinauf',
        'hinaus',
        'hinein',
        'hinterher',
        'hinunter',
        'hinweg',
        'hinzu',
        'hoch',
        'los',
        'mit',
        'nach',
        'nebenher',
        'nieder',
        'statt',
        'um',
        'vor',
        'voran',
        'voraus',
        'vorbei',
        'vorüber',
        'vorweg',
        'weg',
        'weiter',
        'wieder',
        'zu',
        'zurecht',
        'zurück',
        'zusammen'
    ];

    const separatedPrefixInflections = separablePrefixes.map((prefix) => {
        return separatedPrefix(prefix, [], []);
    });

    const zuInfinitiveInflections = separablePrefixes.map((prefix) => {
        return prefixInflection(prefix+'zu', prefix, [], ['verb'])
    });

    return new Map([
        ['separated-prefix', [
            ...separatedPrefixInflections
        ]],
        ['nominalization', [
            suffixInflection('ung', 'en', [], []),
            suffixInflection('lung', 'eln', [], []),
        ]],
        ['zu-infinitive', [
                ...zuInfinitiveInflections
        ]],
        ['negative', [
                prefixInflection('un', '', [], ['adjective']),
        ]],
        ['-able', [
                suffixInflection('bar', 'en', [], ['verb']),
                suffixInflection('bar', 'n', [], ['verb']), // lieferbar
        ]]
    ]);


};