/*
 * Copyright (C) 2023  Yomitan Authors
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


import {suffixInflection} from '../../deinflection-ruleset.js';

/**
 *
 * @param inflectedSuffix
 * @param deinflectedSuffix
 * @param rulesIn
 * @param rulesOut
 */
function conjugationIISuffixInflection(inflectedSuffix, deinflectedSuffix, rulesIn, rulesOut){
    return {
        ...suffixInflection(inflectedSuffix, deinflectedSuffix, rulesIn, rulesOut),
        inflected: new RegExp('.*[^j]' + inflectedSuffix + '$')
    };
}

/**
 *
 */
export async function getDeinflectionReasons() {
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
        [['singular', 'definite', 'accusative'], [
            suffixInflection('n', '', [], ['noun'])
        ]],
        ['plural', [
            suffixInflection('e', '', [], ['noun']),
            suffixInflection('t', '', [], ['noun']) // pijet
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
            suffixInflection('n', 'j', [], ['verb']), // fshin
            suffixInflection('het', 'hem', [], ['verb'])
        ]],
        [['present', 'indicative', 'first-person', 'plural'], [
            suffixInflection('më', '', [], ['verb']), // ndihmojmë, paguajmë, fshijmë
            suffixInflection('im', '', [], ['verb']), // vendosim, hapim
            suffixInflection('hemi', 'hem', [], ['verb'])
        ]],
        [['present', 'indicative', 'second-person', 'plural'], [
            suffixInflection('ni', 'j', [], ['verb']), // ndihmoni, paguani, fshini
            suffixInflection('ni', '', [], ['verb']), // vendosni, hapni
            suffixInflection('heni', 'hem', [], ['verb'])
        ]],
        [['present', 'indicative', 'third-person', 'plural'], [
            suffixInflection('në', '', [], ['verb']), // ndihmojnë, paguajnë, fshijnë
            suffixInflection('in', '', [], ['verb']), // vendosin, hapin
            suffixInflection('hen', 'hem', [], ['verb'])
        ]],
        [['imperfect', 'first-person', 'singular', 'indicative'], [
            suffixInflection('ja', 'j', [], ['verb']), // ndihmoja, paguaja, fshija
            suffixInflection('ja', '', [], ['verb']), // vendosja, hapja
            suffixInflection('hesha', 'hem', [], ['verb'])
        ]],
        [['imperfect', 'second-person', 'singular', 'indicative'], [
            suffixInflection('je', 'j', [], ['verb']), // ndihmoje, paguaje, fshije
            suffixInflection('je', '', [], ['verb']), // vendosje, hapje
            suffixInflection('heshe', 'hem', [], ['verb'])
        ]],
        [['imperfect', 'third-person', 'singular', 'indicative'], [
            suffixInflection('nte', 'j', [], ['verb']), // ndihmonte, paguante, fshinte
            suffixInflection('te', '', [], ['verb']), // vendoste, hapte
            suffixInflection('hej', 'hem', [], ['verb'])
        ]],
        [['imperfect', 'first-person', 'plural', 'indicative'], [
            suffixInflection('nim', 'j', [], ['verb']), // ndihmonim, paguanim, fshinim
            suffixInflection('nim', '', [], ['verb']), // vendosnim, hapnim
            suffixInflection('heshim', 'hem', [], ['verb'])
        ]],
        [['imperfect', 'second-person', 'plural', 'indicative'], [
            suffixInflection('nit', 'j', [], ['verb']), // ndihmonit, paguanit, fshinit
            suffixInflection('nit', '', [], ['verb']), // vendosnit, hapnit
            suffixInflection('heshit', 'hem', [], ['verb'])
        ]],
        [['imperfect', 'third-person', 'plural', 'indicative'], [
            suffixInflection('nin', 'j', [], ['verb']), // ndihmonin, paguanin, fshinin
            suffixInflection('nin', '', [], ['verb']), // vendosnin, hapnin
            suffixInflection('heshin', 'hem', [], ['verb'])
        ]],
        [['aorist', 'first-person', 'singular', 'indicative'], [
            suffixInflection('ova', 'uaj', [], ['verb']), // pagova
            suffixInflection('va', 'j', [], ['verb']), // ndihmova, fshiva
            conjugationIISuffixInflection('a', '', [], ['verb']) // vendosa, hapa
        ]],
        [['aorist', 'second-person', 'singular', 'indicative'], [
            suffixInflection('ove', 'uaj', [], ['verb']), // pagove
            suffixInflection('ve', 'j', [], ['verb']), // ndihmove, fshive
            conjugationIISuffixInflection('e', '', [], ['verb']) // vendose, hape
        ]],
        [['aorist', 'third-person', 'singular', 'indicative'], [
            suffixInflection('oi', 'oj', [], ['verb']), // ndihmoi
            suffixInflection('oi', 'uaj', [], ['verb']), // pagoi
            suffixInflection('u', 'j', [], ['verb']), // fshiu
            conjugationIISuffixInflection('i', '', [], ['verb']) // vendosi, hapi
        ]],
        [['aorist', 'first-person', 'plural', 'indicative'], [
            suffixInflection('uam', 'oj', [], ['verb']), // ndihmuam
            suffixInflection('uam', 'uaj', [], ['verb']), // paguam
            suffixInflection('më', 'j', [], ['verb']), // fshimë
            conjugationIISuffixInflection('ëm', '', [], ['verb']) // vendosëm, hapëm
        ]],
        [['aorist', 'second-person', 'plural', 'indicative'], [
            suffixInflection('uat', 'oj', [], ['verb']), // ndihmuat
            suffixInflection('uat', 'uaj', [], ['verb']), // paguat
            suffixInflection('të', 'j', [], ['verb']), // fshitë
            conjugationIISuffixInflection('ët', '', [], ['verb']) // vendosët, hapët
        ]],
        [['aorist', 'third-person', 'plural', 'indicative'], [
            suffixInflection('uan', 'oj', [], ['verb']), // ndihmuan
            suffixInflection('uan', 'uaj', [], ['verb']), // paguan
            suffixInflection('në', 'j', [], ['verb']), // fshinë
            suffixInflection('ye', 'ej', [], ['verb']), // u kthye ?
            conjugationIISuffixInflection('ën', '', [], ['verb']) // vendosën, hapën
        ]],
        [['imperative', 'second-person', 'singular', 'present'], [
            suffixInflection('o', 'oj', [], ['verb']),
            suffixInflection('hu', 'hem', [], ['verb']) // kujtohu
        ]],
        [['imperative', 'second-person', 'plural', 'present'], [
            suffixInflection('ni', 'j', [], ['verb']), // ndihmoni, paguani, fshini
            suffixInflection('ni', '', [], ['verb']), // vendosni, hapni
            suffixInflection('huni', 'hem', [], ['verb']) // kujtohuni
        ]],
        ['participle', [
            suffixInflection('uar', 'oj', [], ['verb']),
            suffixInflection('ur', '', [], ['verb']),
            suffixInflection('rë', 'j', [], ['verb']), // fshirë,
            suffixInflection('yer', 'ej', [], ['verb']) // shkëlqyer
        ]],
        ['mediopassive', [
            suffixInflection('hem', 'h', ['verb'], ['verb']),
            suffixInflection('hem', 'j', ['verb'], ['verb'])
        ]],
        [['optative', 'first-person', 'singular', 'present'], [
            suffixInflection('fsha', 'j', [], ['verb']) // ndihmofsha
        ]],
        [['optative', 'second-person', 'singular', 'present'], [
            suffixInflection('fsh', 'j', [], ['verb']) // ndihmofsh
        ]],
        [['optative', 'third-person', 'singular', 'present'], [
            suffixInflection('ftë', 'j', [], ['verb']) // ndihmoftë
        ]],
        [['optative', 'first-person', 'plural', 'present'], [
            suffixInflection('fshim', 'j', [], ['verb']) // ndihmofshim
        ]],
        [['optative', 'second-person', 'plural', 'present'], [
            suffixInflection('fshi', 'j', [], ['verb']) // ndihmofshi
        ]],
        [['optative', 'third-person', 'plural', 'present'], [
            suffixInflection('fshin', 'j', [], ['verb']) // ndihmofshin
        ]],
        [['noun'], [
            suffixInflection('im', 'oj', [], ['verb']), // gëzim, zbulim
            suffixInflection('im', 'ej', [], ['verb']), // përkthim
            suffixInflection('je', '', [], ['verb']) // lëvizje
        ]]
    ]);
}