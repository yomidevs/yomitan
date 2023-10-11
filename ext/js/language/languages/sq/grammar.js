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
    return new Map([
        // Nouns
        ['definite', [
            // masculine
            suffixInflection('ku', 'k', [], ['noun']),
            suffixInflection('gu', 'g', [], ['noun']),
            suffixInflection('hu', 'h', [], ['noun']),
            suffixInflection('au', 'a', [], ['noun']),
            suffixInflection('iu', 'i', [], ['noun']),
            suffixInflection('eu', 'e', [], ['noun']),
            suffixInflection('i', 'ë', [], ['noun']),
            suffixInflection('i', '', [], ['noun']),
            suffixInflection('ri', '', [], ['noun']),
            suffixInflection('oi', 'ua', [], ['noun']),
            // feminine
            suffixInflection('a', 'ë', [], ['noun']),
            suffixInflection('a', '', [], ['noun']),
            suffixInflection('ja', 'e', [], ['noun'])
        ]],
        ['plural', [
            suffixInflection('e', '', [], ['noun'])
        ]],
        // Verbs
        [['present', 'indicative', 'second-person', 'singular'], [
            suffixInflection('on', 'oj', [], ['verb']),
            suffixInflection('hesh', 'hem', [], ['verb'])
        ]],
        [['present', 'indicative', 'third-person', 'singular'], [
            suffixInflection('on', 'oj', [], ['verb']),
            suffixInflection('het', 'hem', [], ['verb'])
        ]],
        [['present', 'indicative', 'first-person', 'plural'], [
            suffixInflection('ojmë', 'oj', [], ['verb']),
            suffixInflection('im', '', [], ['verb']),
            suffixInflection('më', '', [], ['verb']),
            suffixInflection('hemi', 'hem', [], ['verb'])
        ]],
        [['present', 'indicative', 'second-person', 'plural'], [
            suffixInflection('oni', 'oj', [], ['verb']),
            suffixInflection('ni', '', [], ['verb']),
            suffixInflection('heni', 'hem', [], ['verb'])
        ]],
        [['present', 'indicative', 'third-person', 'plural'], [
            suffixInflection('ojnë', 'oj', [], ['verb']),
            suffixInflection('in', '', [], ['verb']),
            suffixInflection('në', '', [], ['verb']),
            suffixInflection('hen', 'hem', [], ['verb'])
        ]],
        [['aorist', 'first-person', 'singular', 'indicative'], [
            suffixInflection('ova', 'oj', [], ['verb'])
        ]],
        [['aorist', 'second-person', 'singular', 'indicative'], [
            suffixInflection('ove', 'oj', [], ['verb'])
        ]],
        [['aorist', 'third-person', 'singular', 'indicative'], [
            suffixInflection('oi', 'oj', [], ['verb'])
        ]],
        [['aorist', 'first-person', 'plural', 'indicative'], [
            suffixInflection('uam', 'oj', [], ['verb'])
        ]],
        [['aorist', 'second-person', 'plural', 'indicative'], [
            suffixInflection('uat', 'oj', [], ['verb'])
        ]],
        [['aorist', 'third-person', 'plural', 'indicative'], [
            suffixInflection('uan', 'oj', [], ['verb'])
        ]],
        [['imperfect', 'first-person', 'singular', 'indicative'], [
            suffixInflection('oja', 'oj', [], ['verb']),
            suffixInflection('hesha', 'hem', [], ['verb'])
        ]],
        [['imperfect', 'second-person', 'singular', 'indicative'], [
            suffixInflection('oje', 'oj', [], ['verb']),
            suffixInflection('heshe', 'hem', [], ['verb'])
        ]],
        [['imperfect', 'third-person', 'singular', 'indicative'], [
            suffixInflection('onte', 'oj', [], ['verb']),
            suffixInflection('hej', 'hem', [], ['verb'])
        ]],
        [['imperfect', 'first-person', 'plural', 'indicative'], [
            suffixInflection('onim', 'oj', [], ['verb']),
            suffixInflection('heshim', 'hem', [], ['verb'])
        ]],
        [['imperfect', 'second-person', 'plural', 'indicative'], [
            suffixInflection('onit', 'oj', [], ['verb']),
            suffixInflection('heshit', 'hem', [], ['verb'])
        ]],
        [['imperfect', 'third-person', 'plural', 'indicative'], [
            suffixInflection('onin', 'oj', [], ['verb']),
            suffixInflection('heshin', 'hem', [], ['verb'])
        ]],
        [['imperative', 'second-person', 'singular', 'present'], [
            suffixInflection('o', 'oj', [], ['verb'])
        ]],
        [['imperative', 'second-person', 'plural', 'present'], [
            suffixInflection('oni', 'oj', [], ['verb'])
        ]],
        ['participle', [
            suffixInflection('uar', 'oj', [], ['verb']),
            suffixInflection('ur', '', [], ['verb'])
        ]],
        ['mediopassive', [
            suffixInflection('hem', 'h', ['verb'], ['verb']),
            suffixInflection('hem', 'j', ['verb'], ['verb'])
        ]]
    ]);
};