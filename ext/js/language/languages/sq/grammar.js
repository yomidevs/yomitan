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
            suffixInflection('uan', 'uaj', [], ['verb']),
            suffixInflection('n', 'j', [], ['verb']), // fshin
            suffixInflection('hesh', 'hem', [], ['verb'])
        ]],
        [['present', 'indicative', 'third-person', 'singular'], [
            suffixInflection('on', 'oj', [], ['verb']),
            suffixInflection('uan', 'uaj', [], ['verb']),
            suffixInflection('n', '', [], ['verb']), // fshin
            suffixInflection('het', 'hem', [], ['verb'])
        ]],
        [['present', 'indicative', 'first-person', 'plural'], [
            // suffixInflection('ojmë', 'oj', [], ['verb']),
            // suffixInflection('uajmë', 'uaj', [], ['verb']), // paguajmë
            // suffixInflection('jmë', 'j', [], ['verb']), // fshijmë
            suffixInflection('më', '', [], ['verb']),
            suffixInflection('im', '', [], ['verb']),
            suffixInflection('hemi', 'hem', [], ['verb'])
        ]],
        [['present', 'indicative', 'second-person', 'plural'], [
            // suffixInflection('oni', 'oj', [], ['verb']),
            // suffixInflection('uani', 'uaj', [], ['verb']),
            suffixInflection('ni', 'j', [], ['verb']), // fshini
            suffixInflection('ni', '', [], ['verb']),
            suffixInflection('heni', 'hem', [], ['verb'])
        ]],
        [['present', 'indicative', 'third-person', 'plural'], [
            // suffixInflection('ojnë', 'oj', [], ['verb']),
            // suffixInflection('uajnë', 'uaj', [], ['verb']),
            suffixInflection('në', '', [], ['verb']), // fshijnë
            suffixInflection('in', '', [], ['verb']),
            suffixInflection('hen', 'hem', [], ['verb'])
        ]],
        [['imperfect', 'first-person', 'singular', 'indicative'], [
            suffixInflection('oja', 'oj', [], ['verb']),
            suffixInflection('uaja', 'uaj', [], ['verb']),
            suffixInflection('hesha', 'hem', [], ['verb'])
        ]],
        [['imperfect', 'second-person', 'singular', 'indicative'], [
            suffixInflection('oje', 'oj', [], ['verb']),
            suffixInflection('uaje', 'uaj', [], ['verb']),
            suffixInflection('heshe', 'hem', [], ['verb'])
        ]],
        [['imperfect', 'third-person', 'singular', 'indicative'], [
            suffixInflection('onte', 'oj', [], ['verb']),
            suffixInflection('uante', 'uaj', [], ['verb']),
            suffixInflection('hej', 'hem', [], ['verb'])
        ]],
        [['imperfect', 'first-person', 'plural', 'indicative'], [
            suffixInflection('onim', 'oj', [], ['verb']),
            suffixInflection('uanim', 'uaj', [], ['verb']),
            suffixInflection('heshim', 'hem', [], ['verb'])
        ]],
        [['imperfect', 'second-person', 'plural', 'indicative'], [
            suffixInflection('onit', 'oj', [], ['verb']),
            suffixInflection('uanit', 'uaj', [], ['verb']),
            suffixInflection('heshit', 'hem', [], ['verb'])
        ]],
        [['imperfect', 'third-person', 'plural', 'indicative'], [
            suffixInflection('onin', 'oj', [], ['verb']),
            suffixInflection('uanin', 'uaj', [], ['verb']),
            suffixInflection('heshin', 'hem', [], ['verb'])
        ]],
        [['aorist', 'first-person', 'singular', 'indicative'], [
            suffixInflection('ova', 'oj', [], ['verb']), // ndihmova
            suffixInflection('ova', 'uaj', [], ['verb']), // pagova
            suffixInflection('a', '', [], ['verb']) // vendosa, hapa // TODO: mistake on lexoja
        ]],
        [['aorist', 'second-person', 'singular', 'indicative'], [
            suffixInflection('ove', 'oj', [], ['verb']), // ndihmove
            suffixInflection('ove', 'uaj', [], ['verb']), // pagove
            suffixInflection('e', '', [], ['verb']) // vendose, hape // TODO: mistake on lexoje
        ]],
        [['aorist', 'third-person', 'singular', 'indicative'], [
            suffixInflection('oi', 'oj', [], ['verb']), // ndihmoi
            suffixInflection('oi', 'uaj', [], ['verb']), // pagoi
            suffixInflection('i', '', [], ['verb']) // vendosi, hapi
        ]],
        [['aorist', 'first-person', 'plural', 'indicative'], [
            suffixInflection('uam', 'oj', [], ['verb']), // ndihmuam
            suffixInflection('uam', 'uaj', [], ['verb']), // paguam
            suffixInflection('ëm', '', [], ['verb']) // vendosëm, hapëm
        ]],
        [['aorist', 'second-person', 'plural', 'indicative'], [
            suffixInflection('uat', 'oj', [], ['verb']), // ndihmuat
            suffixInflection('uat', 'uaj', [], ['verb']), // paguat
            suffixInflection('ët', '', [], ['verb']) // vendosët, hapët
        ]],
        [['aorist', 'third-person', 'plural', 'indicative'], [
            suffixInflection('uan', 'oj', [], ['verb']), // ndihmuan
            suffixInflection('uan', 'uaj', [], ['verb']), // paguan
            suffixInflection('ën', '', [], ['verb']) // vendosën, hapën
        ]],
        [['imperative', 'second-person', 'singular', 'present'], [
            suffixInflection('o', 'oj', [], ['verb']),
            suffixInflection('hu', 'hem', [], ['verb']) // kujtohu
        ]],
        [['imperative', 'second-person', 'plural', 'present'], [
            suffixInflection('oni', 'oj', [], ['verb']),
            suffixInflection('uani', 'uaj', [], ['verb']),
            suffixInflection('huni', 'hem', [], ['verb']) // kujtohuni
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