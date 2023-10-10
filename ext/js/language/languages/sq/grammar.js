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
 * suffixInflection
*/

window.languages.sq.getDeinflectionReasons = async () => {
    return {
        // Nouns
        'definite': [
            suffixInflection('ku', 'k', [], ['noun']),
            suffixInflection('gu', 'g', [], ['noun']),
            suffixInflection('hu', 'h', [], ['noun']),
            suffixInflection('au', 'a', [], ['noun']),
            suffixInflection('iu', 'i', [], ['noun']),
            suffixInflection('eu', 'e', [], ['noun'])
        ],
        'plural': [
            suffixInflection('e', '', [], ['noun'])
        ],
        // Verbs
        'present indicative 2nd singular': [
            suffixInflection('n', 'j', [], ['verb'])
        ],
        'present indicative 3rd singular': [
            suffixInflection('n', 'j', [], ['verb'])
        ],
        'present indicative 1st plural': [
            suffixInflection('jmë', 'j', [], ['verb']),
            suffixInflection('im', '', [], ['verb']),
            suffixInflection('më', '', [], ['verb'])
        ],
        'present indicative 2nd plural': [
            suffixInflection('ni', 'j', [], ['verb']),
            suffixInflection('ni', '', [], ['verb'])
        ],
        'present indicative 3rd plural': [
            suffixInflection('jnë', 'j', [], ['verb']),
            suffixInflection('in', '', [], ['verb']),
            suffixInflection('në', '', [], ['verb'])
        ]
    };
};