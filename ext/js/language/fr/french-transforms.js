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

import {suffixInflection} from '../language-transforms.js';

const conditions = {
    v: {name: 'Verb', isDictionaryForm: true},
    n: {name: 'Noun', isDictionaryForm: true},
    adj: {name: 'Adjective', isDictionaryForm: true},
    adv: {name: 'Adverb', isDictionaryForm: true},
    aux: {name: 'auxiliary', isDictionaryForm: true},
};

/** @type {import('language-transformer').LanguageTransformDescriptor<keyof typeof conditions>} */
export const frenchTransforms = {
    language: 'fr',
    conditions,
    transforms: {
        // Présent de l'indicatif pour les trois groupes
        'present indicative': {
            name: 'present indicative',
            description: 'Present indicative form of a verb',
            rules: [
                // auxiliaire être
                suffixInflection('suis', 'être', ['aux'], ['v']),
                suffixInflection('es', 'être', ['aux'], ['v']),
                suffixInflection('est', 'être', ['aux'], ['v']),
                suffixInflection('sommes', 'être', ['aux'], ['v']),
                suffixInflection('êtes', 'être', ['aux'], ['v']),
                suffixInflection('sont', 'être', ['aux'], ['v']),

                // auxiliaire avoir
                suffixInflection('ai', 'avoir', ['aux'], ['v']),
                suffixInflection('as', 'avoir', ['aux'], ['v']),
                suffixInflection('a', 'avoir', ['aux'], ['v']),
                suffixInflection('avons', 'avoir', ['aux'], ['v']),
                suffixInflection('avez', 'avoir', ['aux'], ['v']),
                suffixInflection('ont', 'avoir', ['aux'], ['v']),

                // 1er groupe : verbes en -er
                suffixInflection('e', 'er', ['v'], ['v']),
                suffixInflection('es', 'er', ['v'], ['v']),
                suffixInflection('ons', 'er', ['v'], ['v']),
                suffixInflection('ez', 'er', ['v'], ['v']),
                suffixInflection('ent', 'er', ['v'], ['v']),

                // 1er groupe : verbes en -cer
                suffixInflection('çons', 'cer', ['v'], ['v']),

                // 1er groupe : verbes en -ger
                suffixInflection('geons', 'ger', ['v'], ['v']),

                // 1er groupe : verbes en e(.)er
                suffixInflection('èce', 'ecer', ['v'], ['v']),
                suffixInflection('ève', 'ever', ['v'], ['v']),
                suffixInflection('ène', 'ener', ['v'], ['v']),
                suffixInflection('èpe', 'eper', ['v'], ['v']),
                suffixInflection('ère', 'erer', ['v'], ['v']),
                suffixInflection('ème', 'emer', ['v'], ['v']),
                suffixInflection('èvre', 'evrer', ['v'], ['v']),
                suffixInflection('èse', 'eser', ['v'], ['v']),

                // 1er groupe : verbes en é(.)er
                suffixInflection('ède', 'éder', ['v'], ['v']),
                suffixInflection('èdes', 'éder', ['v'], ['v']),
                suffixInflection('èdent', 'éder', ['v'], ['v']),

                suffixInflection('èbre', 'ébrer', ['v'], ['v']),
                suffixInflection('èbres', 'ébrer', ['v'], ['v']),
                suffixInflection('èbrent', 'ébrer', ['v'], ['v']),

                suffixInflection('èce', 'écer', ['v'], ['v']),
                suffixInflection('èces', 'écer', ['v'], ['v']),
                suffixInflection('ècent', 'écer', ['v'], ['v']),

                suffixInflection('èche', 'écher', ['v'], ['v']),
                suffixInflection('èches', 'écher', ['v'], ['v']),
                suffixInflection('èchent', 'écher', ['v'], ['v']),

                suffixInflection('ècre', 'écrer', ['v'], ['v']),
                suffixInflection('ècres', 'écrer', ['v'], ['v']),
                suffixInflection('ècrent', 'écrer', ['v'], ['v']),

                suffixInflection('ègle', 'égler', ['v'], ['v']),
                suffixInflection('ègles', 'égler', ['v'], ['v']),
                suffixInflection('èglent', 'égler', ['v'], ['v']),

                suffixInflection('ègne', 'égner', ['v'], ['v']),
                suffixInflection('ègnes', 'égner', ['v'], ['v']),
                suffixInflection('ègnent', 'égner', ['v'], ['v']),

                suffixInflection('ègre', 'égrer', ['v'], ['v']),
                suffixInflection('ègres', 'égrer', ['v'], ['v']),
                suffixInflection('ègrent', 'égrer', ['v'], ['v']),

                suffixInflection('ègue', 'éguer', ['v'], ['v']),
                suffixInflection('ègues', 'éguer', ['v'], ['v']),
                suffixInflection('èguent', 'éguer', ['v'], ['v']),

                suffixInflection('èle', 'éler', ['v'], ['v']),
                suffixInflection('èles', 'éler', ['v'], ['v']),
                suffixInflection('èlent', 'éler', ['v'], ['v']),

                suffixInflection('ème', 'émer', ['v'], ['v']),
                suffixInflection('èmes', 'émer', ['v'], ['v']),
                suffixInflection('èment', 'émer', ['v'], ['v']),

                suffixInflection('ène', 'éner', ['v'], ['v']),
                suffixInflection('ènes', 'éner', ['v'], ['v']),
                suffixInflection('ènent', 'éner', ['v'], ['v']),

                suffixInflection('èpe', 'éper', ['v'], ['v']),
                suffixInflection('èpes', 'éper', ['v'], ['v']),
                suffixInflection('èpent', 'éper', ['v'], ['v']),

                suffixInflection('èque', 'équer', ['v'], ['v']),
                suffixInflection('èques', 'équer', ['v'], ['v']),
                suffixInflection('èquent', 'équer', ['v'], ['v']),

                suffixInflection('ère', 'érer', ['v'], ['v']),
                suffixInflection('ères', 'érer', ['v'], ['v']),
                suffixInflection('èrent', 'érer', ['v'], ['v']),

                suffixInflection('èse', 'éser', ['v'], ['v']),
                suffixInflection('èses', 'éser', ['v'], ['v']),
                suffixInflection('èsent', 'éser', ['v'], ['v']),

                suffixInflection('ète', 'éter', ['v'], ['v']),
                suffixInflection('ètes', 'éter', ['v'], ['v']),
                suffixInflection('ètent', 'éter', ['v'], ['v']),

                suffixInflection('ètre', 'étrer', ['v'], ['v']),
                suffixInflection('ètres', 'étrer', ['v'], ['v']),
                suffixInflection('ètrent', 'étrer', ['v'], ['v']),

                suffixInflection('èye', 'éyer', ['v'], ['v']),
                suffixInflection('èyes', 'éyer', ['v'], ['v']),
                suffixInflection('èyent', 'éyer', ['v'], ['v']),

                // 1er groupe : verbes en -eler / eter doublant le l - changeant le e en è
                suffixInflection('elle', 'eler', ['v'], ['v']),
                suffixInflection('elles', 'eler', ['v'], ['v']),
                suffixInflection('ellent', 'eler', ['v'], ['v']),

                suffixInflection('ette', 'eter', ['v'], ['v']),
                suffixInflection('ettes', 'eter', ['v'], ['v']),
                suffixInflection('ettent', 'eter', ['v'], ['v']),

                // 1er groupe : verbes en -eler / eter changeant le e en è
                suffixInflection('èle', 'eler', ['v'], ['v']),
                suffixInflection('èles', 'eler', ['v'], ['v']),
                suffixInflection('èlent', 'eler', ['v'], ['v']),

                suffixInflection('ète', 'eter', ['v'], ['v']),
                suffixInflection('ètes', 'eter', ['v'], ['v']),
                suffixInflection('ètent', 'eter', ['v'], ['v']),

                // 1er groupe : verbes en -éger
                suffixInflection('ège', 'éger', ['v'], ['v']),
                suffixInflection('èges', 'éger', ['v'], ['v']),
                suffixInflection('ègent', 'éger', ['v'], ['v']),

                // 1er groupe : verbes en -ayer
                suffixInflection('aie', 'ayer', ['v'], ['v']),
                suffixInflection('aies', 'ayer', ['v'], ['v']),
                suffixInflection('aient', 'ayer', ['v'], ['v']),

                // 1er groupe : verbes en -oyer et uyer
                suffixInflection('oie', 'oyer', ['v'], ['v']),
                suffixInflection('oies', 'oyer', ['v'], ['v']),
                suffixInflection('oient', 'oyer', ['v'], ['v']),

                suffixInflection('uie', 'uyer', ['v'], ['v']),
                suffixInflection('uies', 'uyer', ['v'], ['v']),
                suffixInflection('uient', 'uyer', ['v'], ['v']),

                // 2e groupe : verbes en -ir (finissant en -issons)
                suffixInflection('is', 'ir', ['v'], ['v']),
                suffixInflection('it', 'ir', ['v'], ['v']),
                suffixInflection('issons', 'ir', ['v'], ['v']),
                suffixInflection('issez', 'ir', ['v'], ['v']),
                suffixInflection('issent', 'ir', ['v'], ['v']),

                // 2e groupe : haïr
                suffixInflection('hais', 'haïr', ['v'], ['v']),
                suffixInflection('hait', 'haïr', ['v'], ['v']),

                // 3ème groupe aller
                suffixInflection('vais', 'aller', ['v'], ['v']),
                suffixInflection('vas', 'aller', ['v'], ['v']),
                suffixInflection('va', 'aller', ['v'], ['v']),
                suffixInflection('vont', 'aller', ['v'], ['v']),

                // 3ème groupe -enir
                suffixInflection('iens', 'enir', ['v'], ['v']),
                suffixInflection('ient', 'enir', ['v'], ['v']),
                suffixInflection('enons', 'enir', ['v'], ['v']),
                suffixInflection('enez', 'enir', ['v'], ['v']),
                suffixInflection('iennent', 'enir', ['v'], ['v']),

                // 3ème groupe -éir
                suffixInflection('iers', 'érir', ['v'], ['v']),
                suffixInflection('iert', 'érir', ['v'], ['v']),
                suffixInflection('érons', 'érir', ['v'], ['v']),
                suffixInflection('érez', 'érir', ['v'], ['v']),
                suffixInflection('ièrent', 'érir', ['v'], ['v']),

                // 3ème groupe -tir
                suffixInflection('s', 'tir', ['v'], ['v']),
                suffixInflection('t', 'tir', ['v'], ['v']),
                suffixInflection('tons', 'tir', ['v'], ['v']),
                suffixInflection('tez', 'tir', ['v'], ['v']),
                suffixInflection('tent', 'tir', ['v'], ['v']),

                // 3ème groupe -êtir
                suffixInflection('êts', 'êtir', ['v'], ['v']),
                suffixInflection('êt', 'êtir', ['v'], ['v']),
                suffixInflection('êtons', 'êtir', ['v'], ['v']),
                suffixInflection('êtez', 'êtir', ['v'], ['v']),
                suffixInflection('êtent', 'êtir', ['v'], ['v']),

                // 3ème groupe -vrir
                suffixInflection('vre', 'vrir', ['v'], ['v']),
                suffixInflection('vres', 'vrir', ['v'], ['v']),
                suffixInflection('vrons', 'vrir', ['v'], ['v']),
                suffixInflection('vrez', 'vrir', ['v'], ['v']),
                suffixInflection('vrent', 'vrir', ['v'], ['v']),

                // 3ème groupe -frir
                suffixInflection('fre', 'frir', ['v'], ['v']),
                suffixInflection('fres', 'frir', ['v'], ['v']),
                suffixInflection('frons', 'frir', ['v'], ['v']),
                suffixInflection('frez', 'frir', ['v'], ['v']),
                suffixInflection('frent', 'frir', ['v'], ['v']),

                // 3ème groupe -ueillir
                suffixInflection('ueille', 'ueillir', ['v'], ['v']),
                suffixInflection('ueilles', 'ueillir', ['v'], ['v']),
                suffixInflection('ueillons', 'ueillir', ['v'], ['v']),
                suffixInflection('ueillez', 'ueillir', ['v'], ['v']),
                suffixInflection('ueillent', 'ueillir', ['v'], ['v']),

                // 3ème groupe -aillir
                suffixInflection('aille', 'aillir', ['v'], ['v']),
                suffixInflection('ailles', 'aillir', ['v'], ['v']),
                suffixInflection('aillons', 'aillir', ['v'], ['v']),
                suffixInflection('aillez', 'aillir', ['v'], ['v']),
                suffixInflection('aillent', 'aillir', ['v'], ['v']),

                // 3ème groupe : faillir (exception)
                suffixInflection('faux', 'aillir', ['v'], ['v']),
                suffixInflection('faut', 'aillir', ['v'], ['v']),

                // 3ème groupe : bouillir
                suffixInflection('bous', 'bouillir', ['v'], ['v']),
                suffixInflection('bout', 'bouillir', ['v'], ['v']),
                suffixInflection('bouillons', 'bouillir', ['v'], ['v']),
                suffixInflection('bouillez', 'bouillir', ['v'], ['v']),
                suffixInflection('bouillent', 'bouillir', ['v'], ['v']),

                // 3ème groupe : dormir
                suffixInflection('dors', 'dormir', ['v'], ['v']),
                suffixInflection('dort', 'dormir', ['v'], ['v']),
                suffixInflection('dormons', 'dormir', ['v'], ['v']),
                suffixInflection('dormez', 'dormir', ['v'], ['v']),
                suffixInflection('dorment', 'dormir', ['v'], ['v']),

                // 3ème groupe : courir
                suffixInflection('cours', 'dormir', ['v'], ['v']),
                suffixInflection('court', 'dormir', ['v'], ['v']),
                suffixInflection('courons', 'dormir', ['v'], ['v']),
                suffixInflection('courez', 'dormir', ['v'], ['v']),
                suffixInflection('courent', 'dormir', ['v'], ['v']),

                // 3ème groupe : mourir
                suffixInflection('meurs', 'mourir', ['v'], ['v']),
                suffixInflection('meurt', 'mourir', ['v'], ['v']),
                suffixInflection('mourons', 'mourir', ['v'], ['v']),
                suffixInflection('mourez', 'mourir', ['v'], ['v']),
                suffixInflection('meurent', 'mourir', ['v'], ['v']),

                // 3ème groupe servir
                suffixInflection('sers', 'servir', ['v'], ['v']),
                suffixInflection('sert', 'servir', ['v'], ['v']),
                suffixInflection('servons', 'servir', ['v'], ['v']),
                suffixInflection('servez', 'servir', ['v'], ['v']),
                suffixInflection('servent', 'servir', ['v'], ['v']),

                // 3ème groupe : fuir
                suffixInflection('fuis', 'fuir', ['v'], ['v']),
                suffixInflection('fuit', 'fuir', ['v'], ['v']),
                suffixInflection('fuyons', 'fuir', ['v'], ['v']),
                suffixInflection('fuyez', 'fuir', ['v'], ['v']),
                suffixInflection('fuient', 'fuir', ['v'], ['v']),

                // 3ème groupe : ouïr
                suffixInflection('ois', 'ouïr', ['v'], ['v']),
                suffixInflection('oit', 'ouïr', ['v'], ['v']),
                suffixInflection('oyons', 'ouïr', ['v'], ['v']),
                suffixInflection('oyez', 'ouïr', ['v'], ['v']),
                suffixInflection('oient', 'ouïr', ['v'], ['v']),

                // 3ème groupe : gésir
                suffixInflection('gis', 'gésir', ['v'], ['v']),
                suffixInflection('git', 'gésir', ['v'], ['v']),
                suffixInflection('gisons', 'gésir', ['v'], ['v']),
                suffixInflection('gisez', 'gésir', ['v'], ['v']),
                suffixInflection('gisent', 'gésir', ['v'], ['v']),

                // 3ème groupe -cevoir
                suffixInflection('çois', 'cevoir', ['v'], ['v']),
                suffixInflection('çoit', 'cevoir', ['v'], ['v']),
                suffixInflection('cevons', 'cevoir', ['v'], ['v']),
                suffixInflection('cevez', 'cevoir', ['v'], ['v']),
                suffixInflection('çoivent', 'cevoir', ['v'], ['v']),

                // 3ème groupe : voir
                suffixInflection('vois', 'voir', ['v'], ['v']),
                suffixInflection('voit', 'voir', ['v'], ['v']),
                suffixInflection('voyons', 'voir', ['v'], ['v']),
                suffixInflection('voyez', 'voir', ['v'], ['v']),
                suffixInflection('voient', 'voir', ['v'], ['v']),

                // 3ème groupe : savoir
                suffixInflection('sais', 'savoir', ['v'], ['v']),
                suffixInflection('sait', 'savoir', ['v'], ['v']),
                suffixInflection('savons', 'savoir', ['v'], ['v']),
                suffixInflection('savez', 'savoir', ['v'], ['v']),
                suffixInflection('savent', 'savoir', ['v'], ['v']),

                // 3ème groupe : devoir
                suffixInflection('dois', 'devoir', ['v'], ['v']),
                suffixInflection('doit', 'devoir', ['v'], ['v']),
                suffixInflection('devons', 'devoir', ['v'], ['v']),
                suffixInflection('devez', 'devoir', ['v'], ['v']),
                suffixInflection('doivent', 'devoir', ['v'], ['v']),

                // 3ème groupe : pouvoir
                suffixInflection('puis', 'pouvoir', ['v'], ['v']),
                suffixInflection('peux', 'pouvoir', ['v'], ['v']),
                suffixInflection('peut', 'pouvoir', ['v'], ['v']),
                suffixInflection('pouvons', 'pouvoir', ['v'], ['v']),
                suffixInflection('pouvez', 'pouvoir', ['v'], ['v']),
                suffixInflection('peuvent', 'pouvoir', ['v'], ['v']),

                // 3ème groupe : mouvoir
                suffixInflection('meus', 'mouvoir', ['v'], ['v']),
                suffixInflection('meut', 'mouvoir', ['v'], ['v']),
                suffixInflection('mouvons', 'mouvoir', ['v'], ['v']),
                suffixInflection('mouvez', 'mouvoir', ['v'], ['v']),
                suffixInflection('meuvent', 'mouvoir', ['v'], ['v']),

                // 3ème groupe : pleuvoir / falloir (verbes impersonnel)
                suffixInflection('pleut', 'pleuvoir', ['v'], ['v']),
                suffixInflection('faut', 'falloir', ['v'], ['v']),

                // 3ème groupe : valoir
                suffixInflection('vaux', 'valoir', ['v'], ['v']),
                suffixInflection('vaut', 'valoir', ['v'], ['v']),
                suffixInflection('valons', 'valoir', ['v'], ['v']),
                suffixInflection('valez', 'valoir', ['v'], ['v']),
                suffixInflection('valent', 'valoir', ['v'], ['v']),

                // 3ème groupe : vouloir
                suffixInflection('veux', 'vouloir', ['v'], ['v']),
                suffixInflection('veut', 'vouloir', ['v'], ['v']),
                suffixInflection('voulons', 'vouloir', ['v'], ['v']),
                suffixInflection('voulez', 'vouloir', ['v'], ['v']),
                suffixInflection('veulent', 'vouloir', ['v'], ['v']),

                // 3ème groupe : seoir / surseoir
                suffixInflection('sois', 'seoir', ['v'], ['v']),
                suffixInflection('soit', 'seoir', ['v'], ['v']),
                suffixInflection('soyons', 'seoir', ['v'], ['v']),
                suffixInflection('soyez', 'seoir', ['v'], ['v']),
                suffixInflection('soient', 'seoir', ['v'], ['v']),

                // 3ème groupe : asseoir (forme en ie et ye)
                suffixInflection('assied', 'asseoir', ['v'], ['v']),
                suffixInflection('assieds', 'asseoir', ['v'], ['v']),
                suffixInflection('asseyons', 'asseoir', ['v'], ['v']),
                suffixInflection('asseyez', 'asseoir', ['v'], ['v']),
                suffixInflection('asseyent', 'asseoir', ['v'], ['v']),

                // 3ème groupe : seoir (convenir) / messeoir (ne pas être convenable)
                suffixInflection('sied', 'seoir', ['v'], ['v']),

                // 3ème groupe : choir
                suffixInflection('chois', 'choir', ['v'], ['v']),
                suffixInflection('choit', 'choir', ['v'], ['v']),
                suffixInflection('choyons', 'choir', ['v'], ['v']),
                suffixInflection('choyez', 'choir', ['v'], ['v']),
                suffixInflection('choient', 'choir', ['v'], ['v']),

                // 3ème groupe : échoir / déchoir
                suffixInflection('échoit', 'échoir', ['v'], ['v']),
                suffixInflection('échet', 'échoir', ['v'], ['v']),
                suffixInflection('échoient', 'échoir', ['v'], ['v']),
                suffixInflection('échéent', 'échoir', ['v'], ['v']),

                // 3ème groupe : verbes en -andre, -endre, -ondre, -erdre, -ordre
                suffixInflection('and', 'andre', ['v'], ['v']),
                suffixInflection('ands', 'andre', ['v'], ['v']),
                suffixInflection('andons', 'andre', ['v'], ['v']),
                suffixInflection('andez', 'andre', ['v'], ['v']),
                suffixInflection('andent', 'andre', ['v'], ['v']),

                suffixInflection('end', 'endre', ['v'], ['v']),
                suffixInflection('ends', 'endre', ['v'], ['v']),
                suffixInflection('endons', 'endre', ['v'], ['v']),
                suffixInflection('endez', 'endre', ['v'], ['v']),
                suffixInflection('endent', 'endre', ['v'], ['v']),

                suffixInflection('ond', 'ondre', ['v'], ['v']),
                suffixInflection('onds', 'ondre', ['v'], ['v']),
                suffixInflection('ondons', 'ondre', ['v'], ['v']),
                suffixInflection('ondez', 'ondre', ['v'], ['v']),
                suffixInflection('ondent', 'ondre', ['v'], ['v']),

                suffixInflection('erd', 'erdre', ['v'], ['v']),
                suffixInflection('erds', 'erdre', ['v'], ['v']),
                suffixInflection('erdons', 'erdre', ['v'], ['v']),
                suffixInflection('erdez', 'erdre', ['v'], ['v']),
                suffixInflection('erdent', 'erdre', ['v'], ['v']),

                suffixInflection('ord', 'ordre', ['v'], ['v']),
                suffixInflection('ords', 'ordre', ['v'], ['v']),
                suffixInflection('ordons', 'ordre', ['v'], ['v']),
                suffixInflection('ordez', 'ordre', ['v'], ['v']),
                suffixInflection('ordent', 'ordre', ['v'], ['v']),

                // 3ème groupe : prendre
                suffixInflection('prenons', 'prendre', ['v'], ['v']),
                suffixInflection('prenez', 'prendre', ['v'], ['v']),
                suffixInflection('prenent', 'prendre', ['v'], ['v']),

                // 3ème groupe : battre
                suffixInflection('bats', 'battre', ['v'], ['v']),
                suffixInflection('bat', 'battre', ['v'], ['v']),
                suffixInflection('battons', 'battre', ['v'], ['v']),
                suffixInflection('battez', 'battre', ['v'], ['v']),
                suffixInflection('battent', 'battre', ['v'], ['v']),

                // 3ème groupe : mettre
                suffixInflection('mets', 'mettre', ['v'], ['v']),
                suffixInflection('met', 'mettre', ['v'], ['v']),
                suffixInflection('mettons', 'mettre', ['v'], ['v']),
                suffixInflection('mettez', 'mettre', ['v'], ['v']),
                suffixInflection('mettent', 'mettre', ['v'], ['v']),

                // 3ème groupe : verbes en -eindre
                suffixInflection('eins', 'eindre', ['v'], ['v']),
                suffixInflection('eint', 'eindre', ['v'], ['v']),
                suffixInflection('eignons', 'eindre', ['v'], ['v']),
                suffixInflection('eignez', 'eindre', ['v'], ['v']),
                suffixInflection('eignent', 'eindre', ['v'], ['v']),

                // 3ème groupe : verbes en -oindre
                suffixInflection('oins', 'oindre', ['v'], ['v']),
                suffixInflection('oint', 'oindre', ['v'], ['v']),
                suffixInflection('oignons', 'oindre', ['v'], ['v']),
                suffixInflection('oignez', 'oindre', ['v'], ['v']),
                suffixInflection('oignent', 'oindre', ['v'], ['v']),

                // 3ème groupe : verbes en -aindre
                suffixInflection('ains', 'aindre', ['v'], ['v']),
                suffixInflection('aint', 'aindre', ['v'], ['v']),
                suffixInflection('aignons', 'aindre', ['v'], ['v']),
                suffixInflection('aignez', 'aindre', ['v'], ['v']),
                suffixInflection('aignent', 'aindre', ['v'], ['v']),

                // 3ème groupe : vaincre
                suffixInflection('vaincs', 'vaincre', ['v'], ['v']),
                suffixInflection('vainc', 'vaincre', ['v'], ['v']),
                suffixInflection('vainquons', 'vaincre', ['v'], ['v']),
                suffixInflection('vainquez', 'vaincre', ['v'], ['v']),
                suffixInflection('vainquent', 'vaincre', ['v'], ['v']),

                // 3ème groupe : raire
                suffixInflection('rais', 'raire', ['v'], ['v']),
                suffixInflection('rait', 'raire', ['v'], ['v']),
                suffixInflection('rayons', 'raire', ['v'], ['v']),
                suffixInflection('rayez', 'raire', ['v'], ['v']),
                suffixInflection('raient', 'raire', ['v'], ['v']),

                // 3ème groupe : faire
                suffixInflection('fais', 'faire', ['v'], ['v']),
                suffixInflection('fait', 'faire', ['v'], ['v']),
                suffixInflection('faisons', 'faire', ['v'], ['v']),
                suffixInflection('faites', 'faire', ['v'], ['v']),
                suffixInflection('font', 'faire', ['v'], ['v']),

                // 3ème groupe : plaire
                suffixInflection('plais', 'faire', ['v'], ['v']),
                suffixInflection('plait', 'faire', ['v'], ['v']),
                suffixInflection('plaisons', 'faire', ['v'], ['v']),
                suffixInflection('plaisez', 'faire', ['v'], ['v']),
                suffixInflection('plaisent', 'faire', ['v'], ['v']),

                // 3ème groupe : verbes en -aître (naître / connaître)
                suffixInflection('ais', 'aître', ['v'], ['v']),
                suffixInflection('aît', 'aître', ['v'], ['v']),
                suffixInflection('ait', 'aître', ['v'], ['v']),
                suffixInflection('aissons', 'aître', ['v'], ['v']),
                suffixInflection('aissez', 'aître', ['v'], ['v']),
                suffixInflection('aissent', 'aître', ['v'], ['v']),

                // 3ème groupe : verbes en -oître
                suffixInflection('ois', 'oître', ['v'], ['v']),
                suffixInflection('oît', 'oître', ['v'], ['v']),
                suffixInflection('oit', 'oître', ['v'], ['v']),
                suffixInflection('oissons', 'oître', ['v'], ['v']),
                suffixInflection('oissez', 'oître', ['v'], ['v']),
                suffixInflection('oissent', 'oître', ['v'], ['v']),

                // 3ème groupe : croire et boire
                suffixInflection('crois', 'croire', ['v'], ['v']),
                suffixInflection('croît', 'croire', ['v'], ['v']),
                suffixInflection('croit', 'croire', ['v'], ['v']),
                suffixInflection('croyons', 'croire', ['v'], ['v']),
                suffixInflection('croyez', 'croire', ['v'], ['v']),
                suffixInflection('croient', 'croire', ['v'], ['v']),

                suffixInflection('bois', 'boire', ['v'], ['v']),
                suffixInflection('boît', 'boire', ['v'], ['v']),
                suffixInflection('boit', 'boire', ['v'], ['v']),
                suffixInflection('buvons', 'boire', ['v'], ['v']),
                suffixInflection('buvez', 'boire', ['v'], ['v']),
                suffixInflection('boivent', 'boire', ['v'], ['v']),

                // 3ème groupe : clore
                suffixInflection('clos', 'clore', ['v'], ['v']),
                suffixInflection('clôt', 'clore', ['v'], ['v']),
                suffixInflection('closent', 'croire', ['v'], ['v']),

                // 3ème groupe : verbes en -clure
                suffixInflection('clus', 'clure', ['v'], ['v']),
                suffixInflection('clut', 'clure', ['v'], ['v']),
                suffixInflection('cluons', 'clure', ['v'], ['v']),
                suffixInflection('cluez', 'clure', ['v'], ['v']),
                suffixInflection('cluent', 'clure', ['v'], ['v']),

                // 3ème groupe : verbes en -soudre (pas !!!)
                suffixInflection('sous', 'soudre', ['v'], ['v']),
                suffixInflection('sout', 'soudre', ['v'], ['v']),
                suffixInflection('solvons', 'soudre', ['v'], ['v']),
                suffixInflection('solvez', 'soudre', ['v'], ['v']),
                suffixInflection('solvent', 'soudre', ['v'], ['v']),

                // 3ème groupe : verbes en -coudre
                suffixInflection('coud', 'coudre', ['v'], ['v']),
                suffixInflection('couds', 'coudre', ['v'], ['v']),
                suffixInflection('cousons', 'coudre', ['v'], ['v']),
                suffixInflection('cousez', 'coudre', ['v'], ['v']),
                suffixInflection('cousent', 'coudre', ['v'], ['v']),

                // 3ème groupe : verbes en -moudre
                suffixInflection('moud', 'moudre', ['v'], ['v']),
                suffixInflection('mouds', 'moudre', ['v'], ['v']),
                suffixInflection('moulons', 'moudre', ['v'], ['v']),
                suffixInflection('moulez', 'moudre', ['v'], ['v']),
                suffixInflection('moulent', 'moudre', ['v'], ['v']),

                // 3ème groupe : verbes en -ivre (suivre, vivre)
                suffixInflection('is', 'vivre', ['v'], ['v']),
                suffixInflection('it', 'vivre', ['v'], ['v']),
                suffixInflection('ivons', 'vivre', ['v'], ['v']),
                suffixInflection('ivez', 'vivre', ['v'], ['v']),
                suffixInflection('ivent', 'vivre', ['v'], ['v']),

                // 3ème groupe : verbes en -lire (relire)
                suffixInflection('lis', 'lire', ['v'], ['v']),
                suffixInflection('lit', 'lire', ['v'], ['v']),
                suffixInflection('lisons', 'lire', ['v'], ['v']),
                suffixInflection('lisez', 'lire', ['v'], ['v']),
                suffixInflection('lisent', 'lire', ['v'], ['v']),

                // 3ème groupe : verbes en -dire (relire)
                suffixInflection('dis', 'dire', ['v'], ['v']),
                suffixInflection('dit', 'dire', ['v'], ['v']),
                suffixInflection('disons', 'dire', ['v'], ['v']),
                suffixInflection('disez', 'dire', ['v'], ['v']),
                suffixInflection('disent', 'dire', ['v'], ['v']),

                // 3ème groupe : verbes en rire (sourire)
                suffixInflection('ris', 'rire', ['v'], ['v']),
                suffixInflection('rit', 'rire', ['v'], ['v']),
                suffixInflection('rions', 'rire', ['v'], ['v']),
                suffixInflection('riez', 'rire', ['v'], ['v']),
                suffixInflection('rient', 'rire', ['v'], ['v']),

                // 3ème groupe : maudire
                suffixInflection('maudissons', 'maudire', ['v'], ['v']),
                suffixInflection('maudissez', 'maudire', ['v'], ['v']),
                suffixInflection('maudissent', 'maudire', ['v'], ['v']),

                // 3ème groupe : verbes en crire (décrire)
                suffixInflection('cris', 'crire', ['v'], ['v']),
                suffixInflection('crit', 'crire', ['v'], ['v']),
                suffixInflection('crivons', 'crire', ['v'], ['v']),
                suffixInflection('crivez', 'crire', ['v'], ['v']),
                suffixInflection('crivent', 'crire', ['v'], ['v']),

                // 3ème groupe : verbes en -fire, -cire, -frire (suffire, confire etc...)
                suffixInflection('fis', 'fire', ['v'], ['v']),
                suffixInflection('fit', 'fire', ['v'], ['v']),
                suffixInflection('fisons', 'fire', ['v'], ['v']),
                suffixInflection('fisez', 'fire', ['v'], ['v']),
                suffixInflection('fisent', 'fire', ['v'], ['v']),

                suffixInflection('cis', 'cire', ['v'], ['v']),
                suffixInflection('cit', 'cire', ['v'], ['v']),
                suffixInflection('cisons', 'cire', ['v'], ['v']),
                suffixInflection('cisez', 'cire', ['v'], ['v']),
                suffixInflection('cisent', 'cire', ['v'], ['v']),

                suffixInflection('fris', 'frire', ['v'], ['v']),
                suffixInflection('frit', 'frire', ['v'], ['v']),
                suffixInflection('frisons', 'frire', ['v'], ['v']),
                suffixInflection('frisez', 'frire', ['v'], ['v']),
                suffixInflection('frisent', 'frire', ['v'], ['v']),

                // 3ème groupe : verbes en -uire (conduire, cuire etc...)
                suffixInflection('uis', 'uire', ['v'], ['v']),
                suffixInflection('uit', 'uire', ['v'], ['v']),
                suffixInflection('uisons', 'uire', ['v'], ['v']),
                suffixInflection('uisez', 'uire', ['v'], ['v']),
                suffixInflection('uisent', 'uire', ['v'], ['v']),
            ],
        },

        // Imparfait de l'indicatif
        'imperfect indicative': {
            name: 'imperfect indicative',
            description: 'Imperfect indicative form of a verb',
            rules: [
                // Auxiliaire être et avoir
                suffixInflection('étais', 'être', ['v'], ['v']),
                suffixInflection('était', 'être', ['v'], ['v']),
                suffixInflection('étions', 'être', ['v'], ['v']),
                suffixInflection('étiez', 'être', ['v'], ['v']),
                suffixInflection('étaient', 'être', ['v'], ['v']),

                suffixInflection('avais', 'avoir', ['v'], ['v']),
                suffixInflection('avait', 'avoir', ['v'], ['v']),
                suffixInflection('avions', 'avoir', ['v'], ['v']),
                suffixInflection('aviez', 'avoir', ['v'], ['v']),
                suffixInflection('avaient', 'avoir', ['v'], ['v']),

                // 1er groupe : verbes en -er
                suffixInflection('ais', 'er', ['v'], ['v']),
                suffixInflection('ait', 'er', ['v'], ['v']),
                suffixInflection('ions', 'er', ['v'], ['v']),
                suffixInflection('iez', 'er', ['v'], ['v']),
                suffixInflection('aient', 'er', ['v'], ['v']),

                // 1er groupe : verbes en -cer
                suffixInflection('çais', 'cer', ['v'], ['v']),
                suffixInflection('çait', 'cer', ['v'], ['v']),
                suffixInflection('çions', 'cer', ['v'], ['v']),
                suffixInflection('çiez', 'cer', ['v'], ['v']),
                suffixInflection('çaient', 'cer', ['v'], ['v']),

                // 1er groupe : verbes en -ger
                suffixInflection('geais', 'ger', ['v'], ['v']),
                suffixInflection('geait', 'ger', ['v'], ['v']),
                suffixInflection('geaient', 'ger', ['v'], ['v']),

                // 1er groupe : verbes en e(.)er
                // pas de modif

                // 1er groupe : verbes en é(.)er
                // pas de modif

                // 1er groupe : verbes en -eler / eter doublant le l - changeant le e en è
                // pas de modif

                // 1er groupe : verbes en -eler / eter changeant le e en è
                // pas de modif

                // 1er groupe : verbes en -éger
                // pas de modif

                // 1er groupe : verbes en -ayer
                // pas de modif

                // 1er groupe : verbes en -oyer et uyer
                // pas de modif

                // 2e groupe : verbes en -ir (finissant en -issons) A COMMENCER
                suffixInflection('issais', 'ir', ['v'], ['v']),
                suffixInflection('issait', 'ir', ['v'], ['v']),
                suffixInflection('issions', 'ir', ['v'], ['v']),
                suffixInflection('issiez', 'ir', ['v'], ['v']),
                suffixInflection('issaient', 'ir', ['v'], ['v']),

                // 2e groupe : haïr
                suffixInflection('haïssais', 'haïr', ['v'], ['v']),
                suffixInflection('haïssait', 'haïr', ['v'], ['v']),
                suffixInflection('haïssions', 'haïr', ['v'], ['v']),
                suffixInflection('haïssaient', 'haïr', ['v'], ['v']),

                suffixInflection('haissais', 'haïr', ['v'], ['v']),
                suffixInflection('haissait', 'haïr', ['v'], ['v']),
                suffixInflection('haissions', 'haïr', ['v'], ['v']),
                suffixInflection('haissaient', 'haïr', ['v'], ['v']),

                // 3ème groupe aller
                suffixInflection('allais', 'aller', ['v'], ['v']),
                suffixInflection('allait', 'aller', ['v'], ['v']),
                suffixInflection('allions', 'aller', ['v'], ['v']),
                suffixInflection('alliez', 'aller', ['v'], ['v']),
                suffixInflection('allaient', 'aller', ['v'], ['v']),

                // 3ème groupe -enir
                suffixInflection('enais', 'enir', ['v'], ['v']),
                suffixInflection('enait', 'enir', ['v'], ['v']),
                suffixInflection('enions', 'enir', ['v'], ['v']),
                suffixInflection('eniez', 'enir', ['v'], ['v']),
                suffixInflection('enaient', 'enir', ['v'], ['v']),

                // 3ème groupe -éir
                suffixInflection('érais', 'érir', ['v'], ['v']),
                suffixInflection('érait', 'érir', ['v'], ['v']),
                suffixInflection('érions', 'érir', ['v'], ['v']),
                suffixInflection('ériez', 'érir', ['v'], ['v']),
                suffixInflection('éraient', 'érir', ['v'], ['v']),

                // 3ème groupe -tir
                suffixInflection('tais', 'tir', ['v'], ['v']),
                suffixInflection('tait', 'tir', ['v'], ['v']),
                suffixInflection('tions', 'tir', ['v'], ['v']),
                suffixInflection('tiez', 'tir', ['v'], ['v']),
                suffixInflection('taient', 'tir', ['v'], ['v']),

                // 3ème groupe -êtir
                suffixInflection('êtais', 'êtir', ['v'], ['v']),
                suffixInflection('êtait', 'êtir', ['v'], ['v']),
                suffixInflection('êtions', 'êtir', ['v'], ['v']),
                suffixInflection('êtiez', 'êtir', ['v'], ['v']),
                suffixInflection('êtaient', 'êtir', ['v'], ['v']),

                // 3ème groupe -vrir
                suffixInflection('vrais', 'vrir', ['v'], ['v']),
                suffixInflection('vrait', 'vrir', ['v'], ['v']),
                suffixInflection('vrions', 'vrir', ['v'], ['v']),
                suffixInflection('vriez', 'vrir', ['v'], ['v']),
                suffixInflection('vraient', 'vrir', ['v'], ['v']),

                // 3ème groupe -frir
                suffixInflection('frais', 'frir', ['v'], ['v']),
                suffixInflection('frait', 'frir', ['v'], ['v']),
                suffixInflection('frions', 'frir', ['v'], ['v']),
                suffixInflection('friez', 'frir', ['v'], ['v']),
                suffixInflection('fraient', 'frir', ['v'], ['v']),

                // 3ème groupe -ueillir
                suffixInflection('ueillais', 'ueillir', ['v'], ['v']),
                suffixInflection('ueillait', 'ueillir', ['v'], ['v']),
                suffixInflection('ueillions', 'ueillir', ['v'], ['v']),
                suffixInflection('ueilliez', 'ueillir', ['v'], ['v']),
                suffixInflection('ueillaient', 'ueillir', ['v'], ['v']),

                // 3ème groupe -aillir
                suffixInflection('aillais', 'aillir', ['v'], ['v']),
                suffixInflection('aillait', 'aillir', ['v'], ['v']),
                suffixInflection('aillions', 'aillir', ['v'], ['v']),
                suffixInflection('ailliez', 'aillir', ['v'], ['v']),
                suffixInflection('aillaient', 'aillir', ['v'], ['v']),

                // 3ème groupe : faillir (exception)
                // pas de modif

                // 3ème groupe : bouillir
                suffixInflection('bouilliais', 'bouillir', ['v'], ['v']),
                suffixInflection('bouilliait', 'bouillir', ['v'], ['v']),
                suffixInflection('bouillions', 'bouillir', ['v'], ['v']),
                suffixInflection('bouilliez', 'bouillir', ['v'], ['v']),
                suffixInflection('bouillaient', 'bouillir', ['v'], ['v']),

                // 3ème groupe : dormir
                suffixInflection('dormais', 'dormir', ['v'], ['v']),
                suffixInflection('dormait', 'dormir', ['v'], ['v']),
                suffixInflection('dormions', 'dormir', ['v'], ['v']),
                suffixInflection('dormiez', 'dormir', ['v'], ['v']),
                suffixInflection('dormaient', 'dormir', ['v'], ['v']),

                // 3ème groupe : courir
                suffixInflection('courais', 'dormir', ['v'], ['v']),
                suffixInflection('courait', 'dormir', ['v'], ['v']),
                suffixInflection('courions', 'dormir', ['v'], ['v']),
                suffixInflection('couriez', 'dormir', ['v'], ['v']),
                suffixInflection('couraient', 'dormir', ['v'], ['v']),

                // 3ème groupe : mourir
                suffixInflection('mourais', 'mourir', ['v'], ['v']),
                suffixInflection('mourait', 'mourir', ['v'], ['v']),
                suffixInflection('mourions', 'mourir', ['v'], ['v']),
                suffixInflection('mouriez', 'mourir', ['v'], ['v']),
                suffixInflection('mouraient', 'mourir', ['v'], ['v']),

                // 3ème groupe servir
                suffixInflection('servais', 'servir', ['v'], ['v']),
                suffixInflection('servait', 'servir', ['v'], ['v']),
                suffixInflection('servions', 'servir', ['v'], ['v']),
                suffixInflection('serviez', 'servir', ['v'], ['v']),
                suffixInflection('servaient', 'servir', ['v'], ['v']),

                // 3ème groupe : fuir
                suffixInflection('fuyais', 'fuir', ['v'], ['v']),
                suffixInflection('fuyait', 'fuir', ['v'], ['v']),
                suffixInflection('fuyions', 'fuir', ['v'], ['v']),
                suffixInflection('fuyiez', 'fuir', ['v'], ['v']),
                suffixInflection('fuyaient', 'fuir', ['v'], ['v']),

                // 3ème groupe : ouïr
                suffixInflection('oyais', 'ouïr', ['v'], ['v']),
                suffixInflection('oyait', 'ouïr', ['v'], ['v']),
                suffixInflection('oyions', 'ouïr', ['v'], ['v']),
                suffixInflection('oyiez', 'ouïr', ['v'], ['v']),
                suffixInflection('oyaient', 'ouïr', ['v'], ['v']),

                // 3ème groupe : gésir
                suffixInflection('gisais', 'gésir', ['v'], ['v']),
                suffixInflection('gisait', 'gésir', ['v'], ['v']),
                suffixInflection('gisions', 'gésir', ['v'], ['v']),
                suffixInflection('gisiez', 'gésir', ['v'], ['v']),
                suffixInflection('gisaient', 'gésir', ['v'], ['v']),

                // 3ème groupe -cevoir
                suffixInflection('cevais', 'cevoir', ['v'], ['v']),
                suffixInflection('cevait', 'cevoir', ['v'], ['v']),
                suffixInflection('cevions', 'cevoir', ['v'], ['v']),
                suffixInflection('ceviez', 'cevoir', ['v'], ['v']),
                suffixInflection('cevaient', 'cevoir', ['v'], ['v']),

                // 3ème groupe : voir
                suffixInflection('voyais', 'voir', ['v'], ['v']),
                suffixInflection('voyait', 'voir', ['v'], ['v']),
                suffixInflection('voyions', 'voir', ['v'], ['v']),
                suffixInflection('voyiez', 'voir', ['v'], ['v']),
                suffixInflection('voyaient', 'voir', ['v'], ['v']),

                // 3ème groupe : savoir
                suffixInflection('savais', 'savoir', ['v'], ['v']),
                suffixInflection('savait', 'savoir', ['v'], ['v']),
                suffixInflection('savions', 'savoir', ['v'], ['v']),
                suffixInflection('saviez', 'savoir', ['v'], ['v']),
                suffixInflection('savaient', 'savoir', ['v'], ['v']),

                // 3ème groupe : devoir
                suffixInflection('devais', 'devoir', ['v'], ['v']),
                suffixInflection('devait', 'devoir', ['v'], ['v']),
                suffixInflection('devions', 'devoir', ['v'], ['v']),
                suffixInflection('deviez', 'devoir', ['v'], ['v']),
                suffixInflection('devaient', 'devoir', ['v'], ['v']),

                // 3ème groupe : pouvoir
                suffixInflection('pouvais', 'pouvoir', ['v'], ['v']),
                suffixInflection('pouvait', 'pouvoir', ['v'], ['v']),
                suffixInflection('pouvions', 'pouvoir', ['v'], ['v']),
                suffixInflection('pouviez', 'pouvoir', ['v'], ['v']),
                suffixInflection('pouvaient', 'pouvoir', ['v'], ['v']),

                // 3ème groupe : mouvoir
                suffixInflection('mouvais', 'mouvoir', ['v'], ['v']),
                suffixInflection('mouvait', 'mouvoir', ['v'], ['v']),
                suffixInflection('mouvions', 'mouvoir', ['v'], ['v']),
                suffixInflection('mouviez', 'mouvoir', ['v'], ['v']),
                suffixInflection('mouvaient', 'mouvoir', ['v'], ['v']),

                // 3ème groupe : pleuvoir / falloir (verbes impersonnel)
                suffixInflection('pleuvait', 'pleuvoir', ['v'], ['v']),
                suffixInflection('fallait', 'falloir', ['v'], ['v']),

                // 3ème groupe : valoir
                suffixInflection('valais', 'vouloir', ['v'], ['v']),
                suffixInflection('valait', 'vouloir', ['v'], ['v']),
                suffixInflection('valions', 'vouloir', ['v'], ['v']),
                suffixInflection('valiez', 'vouloir', ['v'], ['v']),
                suffixInflection('valaient', 'vouloir', ['v'], ['v']),

                // 3ème groupe : vouloir
                suffixInflection('voulais', 'vouloir', ['v'], ['v']),
                suffixInflection('voulait', 'vouloir', ['v'], ['v']),
                suffixInflection('voulions', 'vouloir', ['v'], ['v']),
                suffixInflection('vouliez', 'vouloir', ['v'], ['v']),
                suffixInflection('voulaient', 'vouloir', ['v'], ['v']),

                // 3ème groupe : seoir / surseoir
                suffixInflection('seyais', 'seoir', ['v'], ['v']),
                suffixInflection('seyait', 'seoir', ['v'], ['v']),
                suffixInflection('seyions', 'seoir', ['v'], ['v']),
                suffixInflection('seyiez', 'seoir', ['v'], ['v']),
                suffixInflection('seyaient', 'seoir', ['v'], ['v']),

                suffixInflection('soyais', 'seoir', ['v'], ['v']),
                suffixInflection('soyait', 'seoir', ['v'], ['v']),
                suffixInflection('soyions', 'seoir', ['v'], ['v']),
                suffixInflection('soyiez', 'seoir', ['v'], ['v']),
                suffixInflection('soyaient', 'seoir', ['v'], ['v']),

                // 3ème groupe : asseoir (forme en ie et ye)
                suffixInflection('assoyais', 'asseoir', ['v'], ['v']),
                suffixInflection('assoyait', 'asseoir', ['v'], ['v']),
                suffixInflection('assoyions', 'asseoir', ['v'], ['v']),
                suffixInflection('assoyiez', 'asseoir', ['v'], ['v']),
                suffixInflection('assoyaient', 'asseoir', ['v'], ['v']),

                // 3ème groupe : seoir (convenir) / messeoir (ne pas être convenable)
                suffixInflection('sied', 'seoir', ['v'], ['v']),
                suffixInflection('siéent', 'seoir', ['v'], ['v']),

                // 3ème groupe : choir
                // existe pas

                // 3ème groupe : échoir / déchoir
                suffixInflection('échoyait', 'échoir', ['v'], ['v']),
                suffixInflection('échoyaient', 'échoir', ['v'], ['v']),

                // 3ème groupe : verbes en -andre, -endre, -ondre, -erdre, -ordre
                suffixInflection('andais', 'andre', ['v'], ['v']),
                suffixInflection('andais', 'andre', ['v'], ['v']),
                suffixInflection('andions', 'andre', ['v'], ['v']),
                suffixInflection('andiez', 'andre', ['v'], ['v']),
                suffixInflection('andaient', 'andre', ['v'], ['v']),

                suffixInflection('endais', 'endre', ['v'], ['v']),
                suffixInflection('endait', 'endre', ['v'], ['v']),
                suffixInflection('endions', 'endre', ['v'], ['v']),
                suffixInflection('endiez', 'endre', ['v'], ['v']),
                suffixInflection('endaient', 'endre', ['v'], ['v']),

                suffixInflection('ondais', 'ondre', ['v'], ['v']),
                suffixInflection('ondait', 'ondre', ['v'], ['v']),
                suffixInflection('ondions', 'ondre', ['v'], ['v']),
                suffixInflection('ondiez', 'ondre', ['v'], ['v']),
                suffixInflection('ondaient', 'ondre', ['v'], ['v']),

                suffixInflection('erdais', 'erdre', ['v'], ['v']),
                suffixInflection('erdait', 'erdre', ['v'], ['v']),
                suffixInflection('erdions', 'erdre', ['v'], ['v']),
                suffixInflection('erdiez', 'erdre', ['v'], ['v']),
                suffixInflection('erdaient', 'erdre', ['v'], ['v']),

                suffixInflection('ordais', 'ordre', ['v'], ['v']),
                suffixInflection('ordait', 'ordre', ['v'], ['v']),
                suffixInflection('ordions', 'ordre', ['v'], ['v']),
                suffixInflection('ordiez', 'ordre', ['v'], ['v']),
                suffixInflection('ordaient', 'ordre', ['v'], ['v']),

                // 3ème groupe : prendre
                suffixInflection('prenais', 'prendre', ['v'], ['v']),
                suffixInflection('prenait', 'prendre', ['v'], ['v']),
                suffixInflection('prenions', 'prendre', ['v'], ['v']),
                suffixInflection('preniez', 'prendre', ['v'], ['v']),
                suffixInflection('prenaient', 'prendre', ['v'], ['v']),

                // 3ème groupe : battre
                suffixInflection('battais', 'battre', ['v'], ['v']),
                suffixInflection('battait', 'battre', ['v'], ['v']),
                suffixInflection('battions', 'battre', ['v'], ['v']),
                suffixInflection('battiez', 'battre', ['v'], ['v']),
                suffixInflection('battaient', 'battre', ['v'], ['v']),

                // 3ème groupe : mettre
                suffixInflection('mettais', 'mettre', ['v'], ['v']),
                suffixInflection('mettait', 'mettre', ['v'], ['v']),
                suffixInflection('mettions', 'mettre', ['v'], ['v']),
                suffixInflection('mettiez', 'mettre', ['v'], ['v']),
                suffixInflection('mettaient', 'mettre', ['v'], ['v']),

                // 3ème groupe : verbes en -eindre
                suffixInflection('eignais', 'eindre', ['v'], ['v']),
                suffixInflection('eignait', 'eindre', ['v'], ['v']),
                suffixInflection('eiginons', 'eindre', ['v'], ['v']),
                suffixInflection('eiginez', 'eindre', ['v'], ['v']),
                suffixInflection('eignaient', 'eindre', ['v'], ['v']),

                // 3ème groupe : verbes en -oindre
                suffixInflection('oignais', 'oindre', ['v'], ['v']),
                suffixInflection('oignait', 'oindre', ['v'], ['v']),
                suffixInflection('oignions', 'oindre', ['v'], ['v']),
                suffixInflection('oigniez', 'oindre', ['v'], ['v']),
                suffixInflection('oignaient', 'oindre', ['v'], ['v']),

                // 3ème groupe : verbes en -aindre
                suffixInflection('aignais', 'aindre', ['v'], ['v']),
                suffixInflection('aignait', 'aindre', ['v'], ['v']),
                suffixInflection('aignions', 'aindre', ['v'], ['v']),
                suffixInflection('aigniez', 'aindre', ['v'], ['v']),
                suffixInflection('aignaient', 'aindre', ['v'], ['v']),

                // 3ème groupe : vaincre
                suffixInflection('vainquas', 'vaincre', ['v'], ['v']),
                suffixInflection('vainquait', 'vaincre', ['v'], ['v']),
                suffixInflection('vainquions', 'vaincre', ['v'], ['v']),
                suffixInflection('vainquiez', 'vaincre', ['v'], ['v']),
                suffixInflection('vainquaient', 'vaincre', ['v'], ['v']),

                // 3ème groupe : raire
                suffixInflection('rayais', 'raire', ['v'], ['v']),
                suffixInflection('raiyat', 'raire', ['v'], ['v']),
                suffixInflection('rayions', 'raire', ['v'], ['v']),
                suffixInflection('rayiez', 'raire', ['v'], ['v']),
                suffixInflection('rayaient', 'raire', ['v'], ['v']),

                // 3ème groupe : faire
                suffixInflection('faisais', 'faire', ['v'], ['v']),
                suffixInflection('faisait', 'faire', ['v'], ['v']),
                suffixInflection('faisions', 'faire', ['v'], ['v']),
                suffixInflection('faisiez', 'faire', ['v'], ['v']),
                suffixInflection('faisaient', 'faire', ['v'], ['v']),

                // 3ème groupe : plaire
                suffixInflection('plaisais', 'faire', ['v'], ['v']),
                suffixInflection('plaisait', 'faire', ['v'], ['v']),
                suffixInflection('plaisions', 'faire', ['v'], ['v']),
                suffixInflection('plaisiez', 'faire', ['v'], ['v']),
                suffixInflection('plaisaient', 'faire', ['v'], ['v']),

                // 3ème groupe : verbes en -aître (naître / connaître)
                suffixInflection('aissais', 'aître', ['v'], ['v']),
                suffixInflection('aissait', 'aître', ['v'], ['v']),
                suffixInflection('aissions', 'aître', ['v'], ['v']),
                suffixInflection('aissiez', 'aître', ['v'], ['v']),
                suffixInflection('aissaient', 'aître', ['v'], ['v']),

                // 3ème groupe : verbes en -oître
                suffixInflection('oissais', 'oître', ['v'], ['v']),
                suffixInflection('oissait', 'oître', ['v'], ['v']),
                suffixInflection('oissions', 'oître', ['v'], ['v']),
                suffixInflection('oissiez', 'oître', ['v'], ['v']),
                suffixInflection('oissaient', 'oître', ['v'], ['v']),

                // 3ème groupe : croire et boire
                suffixInflection('croyais', 'croire', ['v'], ['v']),
                suffixInflection('croyait', 'croire', ['v'], ['v']),
                suffixInflection('croyions', 'croire', ['v'], ['v']),
                suffixInflection('croyiez', 'croire', ['v'], ['v']),
                suffixInflection('croyaient', 'croire', ['v'], ['v']),

                suffixInflection('buvais', 'boire', ['v'], ['v']),
                suffixInflection('buvait', 'boire', ['v'], ['v']),
                suffixInflection('buvions', 'boire', ['v'], ['v']),
                suffixInflection('buviez', 'boire', ['v'], ['v']),
                suffixInflection('buvaient', 'boire', ['v'], ['v']),

                // 3ème groupe : clore
                // existe pas

                // 3ème groupe : verbes en -clure
                suffixInflection('cluais', 'clure', ['v'], ['v']),
                suffixInflection('cluait', 'clure', ['v'], ['v']),
                suffixInflection('cluions', 'clure', ['v'], ['v']),
                suffixInflection('cluiez', 'clure', ['v'], ['v']),
                suffixInflection('cluaient', 'clure', ['v'], ['v']),

                // 3ème groupe : verbes en -soudre (pas !!!)
                suffixInflection('solvais', 'soudre', ['v'], ['v']),
                suffixInflection('solvait', 'soudre', ['v'], ['v']),
                suffixInflection('solvions', 'soudre', ['v'], ['v']),
                suffixInflection('solviez', 'soudre', ['v'], ['v']),
                suffixInflection('solvaient', 'soudre', ['v'], ['v']),

                // 3ème groupe : verbes en -coudre
                suffixInflection('cousais', 'coudre', ['v'], ['v']),
                suffixInflection('cousait', 'coudre', ['v'], ['v']),
                suffixInflection('cousions', 'coudre', ['v'], ['v']),
                suffixInflection('cousiez', 'coudre', ['v'], ['v']),
                suffixInflection('cousaient', 'coudre', ['v'], ['v']),

                // 3ème groupe : verbes en -moudre
                suffixInflection('moulais', 'moudre', ['v'], ['v']),
                suffixInflection('moulait', 'moudre', ['v'], ['v']),
                suffixInflection('moulions', 'moudre', ['v'], ['v']),
                suffixInflection('mouliez', 'moudre', ['v'], ['v']),
                suffixInflection('moulaient', 'moudre', ['v'], ['v']),

                // 3ème groupe : verbes en -ivre (suivre, vivre)
                suffixInflection('ivais', 'vivre', ['v'], ['v']),
                suffixInflection('ivait', 'vivre', ['v'], ['v']),
                suffixInflection('ivions', 'vivre', ['v'], ['v']),
                suffixInflection('iviez', 'vivre', ['v'], ['v']),
                suffixInflection('ivaient', 'vivre', ['v'], ['v']),

                // 3ème groupe : verbes en -lire (relire)
                suffixInflection('lisais', 'lire', ['v'], ['v']),
                suffixInflection('lisait', 'lire', ['v'], ['v']),
                suffixInflection('lisions', 'lire', ['v'], ['v']),
                suffixInflection('lisiez', 'lire', ['v'], ['v']),
                suffixInflection('lisaient', 'lire', ['v'], ['v']),

                // 3ème groupe : verbes en -dire (relire)
                suffixInflection('disais', 'dire', ['v'], ['v']),
                suffixInflection('disait', 'dire', ['v'], ['v']),
                suffixInflection('disions', 'dire', ['v'], ['v']),
                suffixInflection('disiez', 'dire', ['v'], ['v']),
                suffixInflection('disaient', 'dire', ['v'], ['v']),

                // 3ème groupe : verbes en rire (sourire)
                suffixInflection('riais', 'rire', ['v'], ['v']),
                suffixInflection('riait', 'rire', ['v'], ['v']),
                suffixInflection('riions', 'rire', ['v'], ['v']),
                suffixInflection('riiez', 'rire', ['v'], ['v']),
                suffixInflection('riaient', 'rire', ['v'], ['v']),

                // 3ème groupe : maudire
                suffixInflection('maudissais', 'maudire', ['v'], ['v']),
                suffixInflection('maudissait', 'maudire', ['v'], ['v']),
                suffixInflection('maudissions', 'maudire', ['v'], ['v']),
                suffixInflection('maudissiez', 'maudire', ['v'], ['v']),
                suffixInflection('maudissaient', 'maudire', ['v'], ['v']),

                // 3ème groupe : verbes en crire (décrire)
                suffixInflection('crivais', 'crire', ['v'], ['v']),
                suffixInflection('crivait', 'crire', ['v'], ['v']),
                suffixInflection('crivions', 'crire', ['v'], ['v']),
                suffixInflection('criviez', 'crire', ['v'], ['v']),
                suffixInflection('crivaient', 'crire', ['v'], ['v']),

                // 3ème groupe : verbes en -fire, -cire, -frire (suffire, confire etc...)
                suffixInflection('fisais', 'fire', ['v'], ['v']),
                suffixInflection('fisait', 'fire', ['v'], ['v']),
                suffixInflection('fisions', 'fire', ['v'], ['v']),
                suffixInflection('fisiez', 'fire', ['v'], ['v']),
                suffixInflection('fisaient', 'fire', ['v'], ['v']),

                suffixInflection('cisais', 'cire', ['v'], ['v']),
                suffixInflection('cisait', 'cire', ['v'], ['v']),
                suffixInflection('cisions', 'cire', ['v'], ['v']),
                suffixInflection('cisiez', 'cire', ['v'], ['v']),
                suffixInflection('cisaient', 'cire', ['v'], ['v']),

                suffixInflection('frisais', 'frire', ['v'], ['v']),
                suffixInflection('frisait', 'frire', ['v'], ['v']),
                suffixInflection('frisions', 'frire', ['v'], ['v']),
                suffixInflection('frisiez', 'frire', ['v'], ['v']),
                suffixInflection('frisaient', 'frire', ['v'], ['v']),

                // 3ème groupe : verbes en -uire (conduire, cuire etc...)
                suffixInflection('uisais', 'uire', ['v'], ['v']),
                suffixInflection('uisait', 'uire', ['v'], ['v']),
                suffixInflection('uisions', 'uire', ['v'], ['v']),
                suffixInflection('uisiez', 'uire', ['v'], ['v']),
                suffixInflection('uisaient', 'uire', ['v'], ['v']),
            ],
        },

        // Futur simple
        'future': {
            name: 'future',
            description: 'Future form of a verb',
            rules: [
                // auxiliaire être
                suffixInflection('serai', 'être', ['aux'], ['v']),
                suffixInflection('seras', 'être', ['aux'], ['v']),
                suffixInflection('sera', 'être', ['aux'], ['v']),
                suffixInflection('serons,', 'être', ['aux'], ['v']),
                suffixInflection('serez', 'être', ['aux'], ['v']),
                suffixInflection('seront', 'être', ['aux'], ['v']),

                // auxiliaire avoir
                suffixInflection('aurai', 'avoir', ['aux'], ['v']),
                suffixInflection('auras', 'avoir', ['aux'], ['v']),
                suffixInflection('aura', 'avoir', ['aux'], ['v']),
                suffixInflection('aurons', 'avoir', ['aux'], ['v']),
                suffixInflection('aurez', 'avoir', ['aux'], ['v']),
                suffixInflection('auront', 'avoir', ['aux'], ['v']),

                // 1er groupe
                suffixInflection('erai', 'er', ['v'], ['v']),
                suffixInflection('eras', 'er', ['v'], ['v']),
                suffixInflection('era', 'er', ['v'], ['v']),
                suffixInflection('erons', 'er', ['v'], ['v']),
                suffixInflection('erez', 'er', ['v'], ['v']),
                suffixInflection('eront', 'er', ['v'], ['v']),

                // 1er groupe : verbes en -cer
                // rien de spécial

                // 1er groupe : verbes en -ger
                // rien de spécial

                // 1er groupe : verbes en e(.)er
                suffixInflection('ècerai', 'ecer', ['v'], ['v']),
                suffixInflection('èverai', 'ever', ['v'], ['v']),
                suffixInflection('ènerai', 'ener', ['v'], ['v']),
                suffixInflection('èperai', 'eper', ['v'], ['v']),
                suffixInflection('èrerai', 'erer', ['v'], ['v']),
                suffixInflection('èmerai', 'emer', ['v'], ['v']),
                suffixInflection('èvrerai', 'evrer', ['v'], ['v']),
                suffixInflection('èserai', 'eser', ['v'], ['v']),

                suffixInflection('èceras', 'ecer', ['v'], ['v']),
                suffixInflection('èveras', 'ever', ['v'], ['v']),
                suffixInflection('èneras', 'ener', ['v'], ['v']),
                suffixInflection('èperas', 'eper', ['v'], ['v']),
                suffixInflection('èreras', 'erer', ['v'], ['v']),
                suffixInflection('èmeras', 'emer', ['v'], ['v']),
                suffixInflection('èvreras', 'evrer', ['v'], ['v']),
                suffixInflection('èseras', 'eser', ['v'], ['v']),

                suffixInflection('ècera', 'ecer', ['v'], ['v']),
                suffixInflection('èvera', 'ever', ['v'], ['v']),
                suffixInflection('ènera', 'ener', ['v'], ['v']),
                suffixInflection('èpera', 'eper', ['v'], ['v']),
                suffixInflection('èrera', 'erer', ['v'], ['v']),
                suffixInflection('èmera', 'emer', ['v'], ['v']),
                suffixInflection('èvrera', 'evrer', ['v'], ['v']),
                suffixInflection('èsera', 'eser', ['v'], ['v']),

                suffixInflection('ècerons', 'ecer', ['v'], ['v']),
                suffixInflection('èverons', 'ever', ['v'], ['v']),
                suffixInflection('ènerons', 'ener', ['v'], ['v']),
                suffixInflection('èperons', 'eper', ['v'], ['v']),
                suffixInflection('èrerons', 'erer', ['v'], ['v']),
                suffixInflection('èmerons', 'emer', ['v'], ['v']),
                suffixInflection('èvrerons', 'evrer', ['v'], ['v']),
                suffixInflection('èserons', 'eser', ['v'], ['v']),

                suffixInflection('ècerez', 'ecer', ['v'], ['v']),
                suffixInflection('èverez', 'ever', ['v'], ['v']),
                suffixInflection('ènerez', 'ener', ['v'], ['v']),
                suffixInflection('èperez', 'eper', ['v'], ['v']),
                suffixInflection('èrerez', 'erer', ['v'], ['v']),
                suffixInflection('èmerez', 'emer', ['v'], ['v']),
                suffixInflection('èvrerez', 'evrer', ['v'], ['v']),
                suffixInflection('èserez', 'eser', ['v'], ['v']),

                suffixInflection('èceront', 'ecer', ['v'], ['v']),
                suffixInflection('èveront', 'ever', ['v'], ['v']),
                suffixInflection('èneront', 'ener', ['v'], ['v']),
                suffixInflection('èperontz', 'eper', ['v'], ['v']),
                suffixInflection('èreront', 'erer', ['v'], ['v']),
                suffixInflection('èmeront', 'emer', ['v'], ['v']),
                suffixInflection('èvreront', 'evrer', ['v'], ['v']),
                suffixInflection('èseront', 'eser', ['v'], ['v']),

                // 1er groupe : verbes en é(.)er
                // pas de changement

                // 1er groupe : verbes en -eler / eter doublant le l - changeant le e en è
                suffixInflection('ellerai', 'eler', ['v'], ['v']),
                suffixInflection('elleras', 'eler', ['v'], ['v']),
                suffixInflection('ellera', 'eler', ['v'], ['v']),
                suffixInflection('ellerons', 'eler', ['v'], ['v']),
                suffixInflection('ellerez', 'eler', ['v'], ['v']),
                suffixInflection('elleront', 'eler', ['v'], ['v']),

                suffixInflection('etterais', 'eter', ['v'], ['v']),
                suffixInflection('etteras', 'eter', ['v'], ['v']),
                suffixInflection('ettera', 'eter', ['v'], ['v']),
                suffixInflection('etterons', 'eter', ['v'], ['v']),
                suffixInflection('etterez', 'eter', ['v'], ['v']),
                suffixInflection('etteront', 'eter', ['v'], ['v']),

                // 1er groupe : verbes en -eler / eter changeant le e en è
                suffixInflection('èlerai', 'eler', ['v'], ['v']),
                suffixInflection('èleras', 'eler', ['v'], ['v']),
                suffixInflection('èlera', 'eler', ['v'], ['v']),
                suffixInflection('èlerons', 'eler', ['v'], ['v']),
                suffixInflection('èlerez', 'eler', ['v'], ['v']),
                suffixInflection('èleront', 'eler', ['v'], ['v']),

                suffixInflection('èterai', 'eter', ['v'], ['v']),
                suffixInflection('èteras', 'eter', ['v'], ['v']),
                suffixInflection('ètera', 'eter', ['v'], ['v']),
                suffixInflection('èterons', 'eter', ['v'], ['v']),
                suffixInflection('èterez', 'eter', ['v'], ['v']),
                suffixInflection('èteront', 'eter', ['v'], ['v']),

                // 1er groupe : verbes en -éger
                suffixInflection('ègerai', 'éger', ['v'], ['v']),
                suffixInflection('ègeras', 'éger', ['v'], ['v']),
                suffixInflection('ègera', 'éger', ['v'], ['v']),
                suffixInflection('ègerons', 'éger', ['v'], ['v']),
                suffixInflection('ègerez', 'éger', ['v'], ['v']),
                suffixInflection('ègeront', 'éger', ['v'], ['v']),

                // 1er groupe : verbes en -ayer
                suffixInflection('aierai', 'ayer', ['v'], ['v']),
                suffixInflection('aieras', 'ayer', ['v'], ['v']),
                suffixInflection('aiera', 'ayer', ['v'], ['v']),
                suffixInflection('aierons', 'ayer', ['v'], ['v']),
                suffixInflection('aierez', 'ayer', ['v'], ['v']),
                suffixInflection('aieront', 'ayer', ['v'], ['v']),
                suffixInflection('ayerai', 'ayer', ['v'], ['v']),
                suffixInflection('ayeras', 'ayer', ['v'], ['v']),
                suffixInflection('ayera', 'ayer', ['v'], ['v']),
                suffixInflection('ayerons', 'ayer', ['v'], ['v']),
                suffixInflection('ayerez', 'ayer', ['v'], ['v']),
                suffixInflection('ayeront', 'ayer', ['v'], ['v']),

                // 1er groupe : verbes en -oyer et uyer
                suffixInflection('oierai', 'oyer', ['v'], ['v']),
                suffixInflection('oieras', 'oyer', ['v'], ['v']),
                suffixInflection('oiera', 'oyer', ['v'], ['v']),
                suffixInflection('oierons', 'oyer', ['v'], ['v']),
                suffixInflection('oierez', 'oyer', ['v'], ['v']),
                suffixInflection('oieront', 'oyer', ['v'], ['v']),

                suffixInflection('uierai', 'uyer', ['v'], ['v']),
                suffixInflection('uieras', 'uyer', ['v'], ['v']),
                suffixInflection('uiera', 'uyer', ['v'], ['v']),
                suffixInflection('uierons', 'uyer', ['v'], ['v']),
                suffixInflection('uierez', 'uyer', ['v'], ['v']),
                suffixInflection('uieront', 'uyer', ['v'], ['v']),

                // envoyer (renvoyer se base sur ce modèle)
                suffixInflection('enverrai', 'envoyer', ['v'], ['v']),
                suffixInflection('enverras', 'envoyer', ['v'], ['v']),
                suffixInflection('enverra', 'envoyer', ['v'], ['v']),
                suffixInflection('enverrons', 'envoyer', ['v'], ['v']),
                suffixInflection('enverrez', 'envoyer', ['v'], ['v']),
                suffixInflection('enverront', 'envoyer', ['v'], ['v']),

                // 2e groupe : verbes en -ir (finissant en -issons)
                suffixInflection('irai', 'ir', ['v'], ['v']),
                suffixInflection('iras', 'ir', ['v'], ['v']),
                suffixInflection('ira', 'ir', ['v'], ['v']),
                suffixInflection('irons', 'ir', ['v'], ['v']),
                suffixInflection('irez', 'ir', ['v'], ['v']),
                suffixInflection('iront', 'ir', ['v'], ['v']),

                // 2e groupe : haïr
                suffixInflection('ïrai', 'ïr', ['v'], ['v']),
                suffixInflection('ïras', 'ïr', ['v'], ['v']),
                suffixInflection('ïra', 'ïr', ['v'], ['v']),
                suffixInflection('ïrons', 'ïr', ['v'], ['v']),
                suffixInflection('ïrez', 'ïr', ['v'], ['v']),
                suffixInflection('ïront', 'ïr', ['v'], ['v']),

                // 3ème groupe aller
                suffixInflection('irai', 'aller', ['v'], ['v']),
                suffixInflection('iras', 'aller', ['v'], ['v']),
                suffixInflection('ira', 'aller', ['v'], ['v']),
                suffixInflection('irons', 'aller', ['v'], ['v']),
                suffixInflection('irez', 'aller', ['v'], ['v']),
                suffixInflection('iront', 'aller', ['v'], ['v']),

                // 3ème groupe -enir
                suffixInflection('iendrai', 'enir', ['v'], ['v']),
                suffixInflection('iendras', 'enir', ['v'], ['v']),
                suffixInflection('iendrons', 'enir', ['v'], ['v']),
                suffixInflection('iendrez', 'enir', ['v'], ['v']),
                suffixInflection('iendront', 'enir', ['v'], ['v']),

                // 3ème groupe -éir
                suffixInflection('errai', 'érir', ['v'], ['v']),
                suffixInflection('erras', 'érir', ['v'], ['v']),
                suffixInflection('erra', 'érir', ['v'], ['v']),
                suffixInflection('errons', 'érir', ['v'], ['v']),
                suffixInflection('errez', 'érir', ['v'], ['v']),
                suffixInflection('erront', 'érir', ['v'], ['v']),

                // 3ème groupe -tir
                suffixInflection('tirai', 'tir', ['v'], ['v']),
                suffixInflection('tiras', 'tir', ['v'], ['v']),
                suffixInflection('tira', 'tir', ['v'], ['v']),
                suffixInflection('tirons', 'tir', ['v'], ['v']),
                suffixInflection('tirez', 'tir', ['v'], ['v']),
                suffixInflection('tiront', 'tir', ['v'], ['v']),

                // 3ème groupe -êtir
                suffixInflection('êtirai', 'êtir', ['v'], ['v']),
                suffixInflection('êtiras', 'êtir', ['v'], ['v']),
                suffixInflection('êtira', 'êtir', ['v'], ['v']),
                suffixInflection('êtirons', 'êtir', ['v'], ['v']),
                suffixInflection('êtirez', 'êtir', ['v'], ['v']),
                suffixInflection('êtiront', 'êtir', ['v'], ['v']),

                // 3ème groupe -vrir
                suffixInflection('vrirai', 'vrir', ['v'], ['v']),
                suffixInflection('vriras', 'vrir', ['v'], ['v']),
                suffixInflection('vrira', 'vrir', ['v'], ['v']),
                suffixInflection('vrirons', 'vrir', ['v'], ['v']),
                suffixInflection('vrirez', 'vrir', ['v'], ['v']),
                suffixInflection('vriront', 'vrir', ['v'], ['v']),

                // 3ème groupe -frir
                suffixInflection('frirai', 'frir', ['v'], ['v']),
                suffixInflection('frira', 'frir', ['v'], ['v']),
                suffixInflection('frira', 'frir', ['v'], ['v']),
                suffixInflection('frirons', 'frir', ['v'], ['v']),
                suffixInflection('frirez', 'frir', ['v'], ['v']),
                suffixInflection('friront', 'frir', ['v'], ['v']),

                // 3ème groupe -ueillir
                suffixInflection('ueillerai', 'ueillir', ['v'], ['v']),
                suffixInflection('ueilleras', 'ueillir', ['v'], ['v']),
                suffixInflection('ueillera', 'ueillir', ['v'], ['v']),
                suffixInflection('ueillerons', 'ueillir', ['v'], ['v']),
                suffixInflection('ueillerez', 'ueillir', ['v'], ['v']),
                suffixInflection('ueilleront', 'ueillir', ['v'], ['v']),

                // 3ème groupe -aillir
                suffixInflection('aillirai', 'aillir', ['v'], ['v']),
                suffixInflection('ailliras', 'aillir', ['v'], ['v']),
                suffixInflection('aillira', 'aillir', ['v'], ['v']),
                suffixInflection('aillirons', 'aillir', ['v'], ['v']),
                suffixInflection('aillirez', 'aillir', ['v'], ['v']),
                suffixInflection('ailliront', 'aillir', ['v'], ['v']),

                // 3ème groupe : faillir (exception)
                // same que l'autre

                // 3ème groupe : bouillir
                suffixInflection('bouillirai', 'bouillir', ['v'], ['v']),
                suffixInflection('bouilliras', 'bouillir', ['v'], ['v']),
                suffixInflection('bouillira', 'bouillir', ['v'], ['v']),
                suffixInflection('bouillirons', 'bouillir', ['v'], ['v']),
                suffixInflection('bouillirez', 'bouillir', ['v'], ['v']),
                suffixInflection('bouilliront', 'bouillir', ['v'], ['v']),

                // 3ème groupe : dormir
                suffixInflection('dormirai', 'dormir', ['v'], ['v']),
                suffixInflection('dormiras', 'dormir', ['v'], ['v']),
                suffixInflection('dormira', 'dormir', ['v'], ['v']),
                suffixInflection('dormirons', 'dormir', ['v'], ['v']),
                suffixInflection('dormirez', 'dormir', ['v'], ['v']),
                suffixInflection('dormiront', 'dormir', ['v'], ['v']),

                // 3ème groupe : courir
                suffixInflection('courrai', 'dormir', ['v'], ['v']),
                suffixInflection('courras', 'dormir', ['v'], ['v']),
                suffixInflection('courra', 'dormir', ['v'], ['v']),
                suffixInflection('courrons', 'dormir', ['v'], ['v']),
                suffixInflection('courrez', 'dormir', ['v'], ['v']),
                suffixInflection('courront', 'dormir', ['v'], ['v']),

                // 3ème groupe : mourir
                suffixInflection('mourrai', 'mourir', ['v'], ['v']),
                suffixInflection('mourras', 'mourir', ['v'], ['v']),
                suffixInflection('mourra', 'mourir', ['v'], ['v']),
                suffixInflection('mourrons', 'mourir', ['v'], ['v']),
                suffixInflection('mourrez', 'mourir', ['v'], ['v']),
                suffixInflection('mourront', 'mourir', ['v'], ['v']),

                // 3ème groupe servir
                // rien de spécial

                // 3ème groupe : fuir
                // rien de spécial

                // 3ème groupe : ouïr
                suffixInflection('orrai', 'ouïr', ['v'], ['v']),
                suffixInflection('oirai', 'ouïr', ['v'], ['v']),
                suffixInflection('orras', 'ouïr', ['v'], ['v']),
                suffixInflection('orra', 'ouïr', ['v'], ['v']),
                suffixInflection('orrons', 'ouïr', ['v'], ['v']),
                suffixInflection('orrez', 'ouïr', ['v'], ['v']),
                suffixInflection('orront', 'ouïr', ['v'], ['v']),

                // 3ème groupe : gésir
                // pas de futur

                // 3ème groupe -cevoir
                suffixInflection('cevrai', 'cevoir', ['v'], ['v']),
                suffixInflection('cevras', 'cevoir', ['v'], ['v']),
                suffixInflection('cevra', 'cevoir', ['v'], ['v']),
                suffixInflection('cevrons', 'cevoir', ['v'], ['v']),
                suffixInflection('cevrez', 'cevoir', ['v'], ['v']),
                suffixInflection('cevront', 'cevoir', ['v'], ['v']),

                // 3ème groupe : voir
                suffixInflection('verrai', 'voir', ['v'], ['v']),
                suffixInflection('verras', 'voir', ['v'], ['v']),
                suffixInflection('verra', 'voir', ['v'], ['v']),
                suffixInflection('verrons', 'voir', ['v'], ['v']),
                suffixInflection('verrez', 'voir', ['v'], ['v']),
                suffixInflection('verront', 'voir', ['v'], ['v']),

                // 3ème groupe : pouvoir
                suffixInflection('pourvoirai', 'pourvoir', ['v'], ['v']),
                suffixInflection('pourvoiras', 'pourvoir', ['v'], ['v']),
                suffixInflection('pourvoira', 'pourvoir', ['v'], ['v']),
                suffixInflection('pourvoirons', 'pourvoir', ['v'], ['v']),
                suffixInflection('pourvoirez', 'pourvoir', ['v'], ['v']),
                suffixInflection('pourvoiront', 'pourvoir', ['v'], ['v']),

                // 3ème groupe : savoir
                suffixInflection('saurai', 'savoir', ['v'], ['v']),
                suffixInflection('sauras', 'savoir', ['v'], ['v']),
                suffixInflection('saura', 'savoir', ['v'], ['v']),
                suffixInflection('saurons', 'savoir', ['v'], ['v']),
                suffixInflection('saurez', 'savoir', ['v'], ['v']),
                suffixInflection('sauront', 'savoir', ['v'], ['v']),

                // 3ème groupe : devoir
                suffixInflection('devrai', 'devoir', ['v'], ['v']),
                suffixInflection('devras', 'devoir', ['v'], ['v']),
                suffixInflection('devra', 'devoir', ['v'], ['v']),
                suffixInflection('devrons', 'devoir', ['v'], ['v']),
                suffixInflection('devrez', 'devoir', ['v'], ['v']),
                suffixInflection('devront', 'devoir', ['v'], ['v']),

                // 3ème groupe : pouvoir
                suffixInflection('pourrai', 'pouvoir', ['v'], ['v']), // possible
                suffixInflection('pourras', 'pouvoir', ['v'], ['v']),
                suffixInflection('pourra', 'pouvoir', ['v'], ['v']),
                suffixInflection('pourrons', 'pouvoir', ['v'], ['v']),
                suffixInflection('pourrez', 'pouvoir', ['v'], ['v']),
                suffixInflection('pourront', 'pouvoir', ['v'], ['v']),

                // 3ème groupe : mouvoir
                suffixInflection('mouvrai', 'mouvoir', ['v'], ['v']),
                suffixInflection('mouvras', 'mouvoir', ['v'], ['v']),
                suffixInflection('mouvra', 'mouvoir', ['v'], ['v']),
                suffixInflection('mouvrons', 'mouvoir', ['v'], ['v']),
                suffixInflection('mouvrez', 'mouvoir', ['v'], ['v']),
                suffixInflection('mouvront', 'mouvoir', ['v'], ['v']),

                // 3ème groupe : pleuvoir / falloir (verbes impersonnel)
                suffixInflection('pleuvra', 'pleuvoir', ['v'], ['v']),
                suffixInflection('pleuvront', 'pleuvoir', ['v'], ['v']),
                suffixInflection('faudra', 'falloir', ['v'], ['v']),

                // 3ème groupe : valoir
                suffixInflection('vaudrai', 'valoir', ['v'], ['v']),
                suffixInflection('vaudras', 'valoir', ['v'], ['v']),
                suffixInflection('vaudra', 'valoir', ['v'], ['v']),
                suffixInflection('vaudrons', 'valoir', ['v'], ['v']),
                suffixInflection('vaudrez', 'valoir', ['v'], ['v']),
                suffixInflection('vaudront', 'valoir', ['v'], ['v']),

                // 3ème groupe : vouloir
                suffixInflection('voudrai', 'vouloir', ['v'], ['v']),
                suffixInflection('voudras', 'vouloir', ['v'], ['v']),
                suffixInflection('voudra', 'vouloir', ['v'], ['v']),
                suffixInflection('voudrons', 'vouloir', ['v'], ['v']),
                suffixInflection('voudrez', 'vouloir', ['v'], ['v']),
                suffixInflection('voudront', 'vouloir', ['v'], ['v']),

                // 3ème groupe : seoir / surseoir
                suffixInflection('soirai', 'seoir', ['v'], ['v']),
                suffixInflection('soiras', 'seoir', ['v'], ['v']),
                suffixInflection('soira', 'seoir', ['v'], ['v']),
                suffixInflection('soirons', 'seoir', ['v'], ['v']),
                suffixInflection('soirez', 'seoir', ['v'], ['v']),
                suffixInflection('soiront', 'seoir', ['v'], ['v']),

                // 3ème groupe : asseoir (forme en ie et ye)
                suffixInflection('assiérai', 'asseoir', ['v'], ['v']),
                suffixInflection('assiéras', 'asseoir', ['v'], ['v']),
                suffixInflection('assiéra', 'asseoir', ['v'], ['v']),
                suffixInflection('assiérons', 'asseoir', ['v'], ['v']),
                suffixInflection('assiérez', 'asseoir', ['v'], ['v']),
                suffixInflection('assiéront', 'asseoir', ['v'], ['v']),

                // 3ème groupe : seoir (convenir) / messeoir (ne pas être convenable)
                suffixInflection('siéra', 'seoir', ['v'], ['v']),
                suffixInflection('siéront', 'seoir', ['v'], ['v']),

                // 3ème groupe : choir
                suffixInflection('choirai', 'choir', ['v'], ['v']),
                suffixInflection('choiras', 'choir', ['v'], ['v']),
                suffixInflection('choira', 'choir', ['v'], ['v']),
                suffixInflection('choirons', 'choir', ['v'], ['v']),
                suffixInflection('choirez', 'choir', ['v'], ['v']),
                suffixInflection('choiront', 'choir', ['v'], ['v']),

                suffixInflection('cherrai', 'choir', ['v'], ['v']),
                suffixInflection('cherras', 'choir', ['v'], ['v']),
                suffixInflection('cherra', 'choir', ['v'], ['v']),
                suffixInflection('cherrosn', 'choir', ['v'], ['v']),
                suffixInflection('cherrez', 'choir', ['v'], ['v']),
                suffixInflection('cherront', 'choir', ['v'], ['v']),

                // 3ème groupe : échoir / déchoir
                // same

                // 3ème groupe : verbes en -andre, -endre, -ondre, -erdre, -ordre
                suffixInflection('andrai', 'andre', ['v'], ['v']),
                suffixInflection('andras', 'andre', ['v'], ['v']),
                suffixInflection('andra', 'andre', ['v'], ['v']),
                suffixInflection('androns', 'andre', ['v'], ['v']),
                suffixInflection('andrez', 'andre', ['v'], ['v']),
                suffixInflection('andront', 'andre', ['v'], ['v']),

                suffixInflection('endrai', 'endre', ['v'], ['v']),
                suffixInflection('endras', 'endre', ['v'], ['v']),
                suffixInflection('endra', 'endre', ['v'], ['v']),
                suffixInflection('endrons', 'endre', ['v'], ['v']),
                suffixInflection('endrez', 'endre', ['v'], ['v']),
                suffixInflection('endront', 'endre', ['v'], ['v']),

                suffixInflection('ondrai', 'ondre', ['v'], ['v']),
                suffixInflection('ondras', 'ondre', ['v'], ['v']),
                suffixInflection('ondra', 'ondre', ['v'], ['v']),
                suffixInflection('ondrons', 'ondre', ['v'], ['v']),
                suffixInflection('ondrez', 'ondre', ['v'], ['v']),
                suffixInflection('ondront', 'ondre', ['v'], ['v']),

                suffixInflection('erdrai', 'erdre', ['v'], ['v']),
                suffixInflection('erdras', 'erdre', ['v'], ['v']),
                suffixInflection('erdra', 'erdre', ['v'], ['v']),
                suffixInflection('erdrons', 'erdre', ['v'], ['v']),
                suffixInflection('erdrez', 'erdre', ['v'], ['v']),
                suffixInflection('erdront', 'erdre', ['v'], ['v']),

                suffixInflection('ordrai', 'ordre', ['v'], ['v']),
                suffixInflection('ordras', 'ordre', ['v'], ['v']),
                suffixInflection('ordra', 'ordre', ['v'], ['v']),
                suffixInflection('ordrons', 'ordre', ['v'], ['v']),
                suffixInflection('ordrez', 'ordre', ['v'], ['v']),
                suffixInflection('ordront', 'ordre', ['v'], ['v']),

                // 3ème groupe : prendre
                // rien de spécial

                // 3ème groupe : battre
                suffixInflection('battrai', 'battre', ['v'], ['v']),
                suffixInflection('battras', 'battre', ['v'], ['v']),
                suffixInflection('battra', 'battre', ['v'], ['v']),
                suffixInflection('battrons', 'battre', ['v'], ['v']),
                suffixInflection('battrez', 'battre', ['v'], ['v']),
                suffixInflection('battront', 'battre', ['v'], ['v']),

                // 3ème groupe : mettre
                suffixInflection('mettrai', 'mettre', ['v'], ['v']),
                suffixInflection('mettras', 'mettre', ['v'], ['v']),
                suffixInflection('mettra', 'mettre', ['v'], ['v']),
                suffixInflection('mettrons', 'mettre', ['v'], ['v']),
                suffixInflection('mettrez', 'mettre', ['v'], ['v']),
                suffixInflection('mettront', 'mettre', ['v'], ['v']),

                // 3ème groupe : verbes en -eindre
                suffixInflection('eindrai', 'eindre', ['v'], ['v']),
                suffixInflection('eindras', 'eindre', ['v'], ['v']),
                suffixInflection('eindra', 'eindre', ['v'], ['v']),
                suffixInflection('eindrons', 'eindre', ['v'], ['v']),
                suffixInflection('eindrez', 'eindre', ['v'], ['v']),
                suffixInflection('eindront', 'eindre', ['v'], ['v']),

                // 3ème groupe : verbes en -oindre
                suffixInflection('oindrai', 'oindre', ['v'], ['v']),
                suffixInflection('oindras', 'oindre', ['v'], ['v']),
                suffixInflection('oindra', 'oindre', ['v'], ['v']),
                suffixInflection('oindrons', 'oindre', ['v'], ['v']),
                suffixInflection('oindrez', 'oindre', ['v'], ['v']),
                suffixInflection('oindront', 'oindre', ['v'], ['v']),

                // 3ème groupe : verbes en -aindre
                suffixInflection('aindrai', 'aindre', ['v'], ['v']),
                suffixInflection('aindras', 'aindre', ['v'], ['v']),
                suffixInflection('aindra', 'aindre', ['v'], ['v']),
                suffixInflection('aindrons', 'aindre', ['v'], ['v']),
                suffixInflection('aindrez', 'aindre', ['v'], ['v']),
                suffixInflection('aindront', 'aindre', ['v'], ['v']),

                // 3ème groupe : vaincre
                suffixInflection('vaincrai', 'vaincre', ['v'], ['v']),
                suffixInflection('vaincras', 'vaincre', ['v'], ['v']),
                suffixInflection('vaincra', 'vaincre', ['v'], ['v']),
                suffixInflection('vaincrons', 'vaincre', ['v'], ['v']),
                suffixInflection('vaincrez', 'vaincre', ['v'], ['v']),
                suffixInflection('vaincront', 'vaincre', ['v'], ['v']),

                // 3ème groupe : raire
                suffixInflection('rairai', 'raire', ['v'], ['v']),
                suffixInflection('rairas', 'raire', ['v'], ['v']),
                suffixInflection('raira', 'raire', ['v'], ['v']),
                suffixInflection('rairons', 'raire', ['v'], ['v']),
                suffixInflection('rairez', 'raire', ['v'], ['v']),
                suffixInflection('rairont', 'raire', ['v'], ['v']),

                // 3ème groupe : faire
                suffixInflection('ferai', 'faire', ['v'], ['v']),
                suffixInflection('feras', 'faire', ['v'], ['v']),
                suffixInflection('fera', 'faire', ['v'], ['v']),
                suffixInflection('ferons', 'faire', ['v'], ['v']),
                suffixInflection('ferez', 'faire', ['v'], ['v']),
                suffixInflection('feront', 'faire', ['v'], ['v']),

                // 3ème groupe : plaire
                suffixInflection('plairai', 'plaire', ['v'], ['v']),
                suffixInflection('plairas', 'plaire', ['v'], ['v']),
                suffixInflection('plaira', 'plaire', ['v'], ['v']),
                suffixInflection('plairons', 'plaire', ['v'], ['v']),
                suffixInflection('plairez', 'plaire', ['v'], ['v']),
                suffixInflection('plairont', 'plaire', ['v'], ['v']),

                // 3ème groupe : verbes en -aître (naître / connaître)
                suffixInflection('aîtrai', 'aître', ['v'], ['v']),
                suffixInflection('aîtras', 'aître', ['v'], ['v']),
                suffixInflection('aîtra', 'aître', ['v'], ['v']),
                suffixInflection('aîtrons', 'aître', ['v'], ['v']),
                suffixInflection('aîtrez', 'aître', ['v'], ['v']),
                suffixInflection('aîtront', 'aître', ['v'], ['v']),

                // 3ème groupe : verbes en -oître
                suffixInflection('oîtrai', 'oître', ['v'], ['v']),
                suffixInflection('oîtras', 'oître', ['v'], ['v']),
                suffixInflection('oîtra', 'oître', ['v'], ['v']),
                suffixInflection('oîtrons', 'oître', ['v'], ['v']),
                suffixInflection('oîtrez', 'oître', ['v'], ['v']),
                suffixInflection('oîtront', 'oître', ['v'], ['v']),

                // 3ème groupe : croire et boire
                suffixInflection('croirai', 'croire', ['v'], ['v']),
                suffixInflection('croiras', 'croire', ['v'], ['v']),
                suffixInflection('croira', 'croire', ['v'], ['v']),
                suffixInflection('croirons', 'croire', ['v'], ['v']),
                suffixInflection('croirez', 'croire', ['v'], ['v']),
                suffixInflection('croiront', 'croire', ['v'], ['v']),

                suffixInflection('boirai', 'boire', ['v'], ['v']),
                suffixInflection('boiras', 'boire', ['v'], ['v']),
                suffixInflection('boira', 'boire', ['v'], ['v']),
                suffixInflection('boirons', 'boire', ['v'], ['v']),
                suffixInflection('boirez', 'boire', ['v'], ['v']),
                suffixInflection('boiront', 'boire', ['v'], ['v']),

                // 3ème groupe : clore
                suffixInflection('clorai', 'clore', ['v'], ['v']),
                suffixInflection('cloras', 'clore', ['v'], ['v']),
                suffixInflection('clora', 'clore', ['v'], ['v']),
                suffixInflection('clorons', 'clore', ['v'], ['v']),
                suffixInflection('clorez', 'clore', ['v'], ['v']),
                suffixInflection('cloront', 'clore', ['v'], ['v']),

                // 3ème groupe : verbes en -clure
                suffixInflection('clurai', 'clure', ['v'], ['v']),
                suffixInflection('cluras', 'clure', ['v'], ['v']),
                suffixInflection('clura', 'clure', ['v'], ['v']),
                suffixInflection('clurons', 'clure', ['v'], ['v']),
                suffixInflection('clurez', 'clure', ['v'], ['v']),
                suffixInflection('cluront', 'clure', ['v'], ['v']),

                // 3ème groupe : verbes en -soudre
                suffixInflection('soudrai', 'soudre', ['v'], ['v']),
                suffixInflection('soudras', 'soudre', ['v'], ['v']),
                suffixInflection('soudra', 'soudre', ['v'], ['v']),
                suffixInflection('soudrons', 'soudre', ['v'], ['v']),
                suffixInflection('soudrez', 'soudre', ['v'], ['v']),
                suffixInflection('soudront', 'soudre', ['v'], ['v']),

                // 3ème groupe : verbes en -coudre
                suffixInflection('coudrai', 'coudre', ['v'], ['v']),
                suffixInflection('coudras', 'coudre', ['v'], ['v']),
                suffixInflection('coudra', 'coudre', ['v'], ['v']),
                suffixInflection('coudrons', 'coudre', ['v'], ['v']),
                suffixInflection('coudrez', 'coudre', ['v'], ['v']),
                suffixInflection('coudront', 'coudre', ['v'], ['v']),

                // 3ème groupe : verbes en -moudre
                suffixInflection('moudrai', 'moudre', ['v'], ['v']),
                suffixInflection('moudras', 'moudre', ['v'], ['v']),
                suffixInflection('moudra', 'moudre', ['v'], ['v']),
                suffixInflection('moudrons', 'moudre', ['v'], ['v']),
                suffixInflection('moudrez', 'moudre', ['v'], ['v']),
                suffixInflection('moudront', 'moudre', ['v'], ['v']),

                // 3ème groupe : verbes en -ivre (suivre, vivre)
                suffixInflection('ivrai', 'vivre', ['v'], ['v']),
                suffixInflection('ivras', 'vivre', ['v'], ['v']),
                suffixInflection('ivra', 'vivre', ['v'], ['v']),
                suffixInflection('ivrons', 'vivre', ['v'], ['v']),
                suffixInflection('ivrez', 'vivre', ['v'], ['v']),
                suffixInflection('ivront', 'vivre', ['v'], ['v']),

                // 3ème groupe : verbes en -lire (relire)
                suffixInflection('lirai', 'lire', ['v'], ['v']),
                suffixInflection('liras', 'lire', ['v'], ['v']),
                suffixInflection('lira', 'lire', ['v'], ['v']),
                suffixInflection('lirons', 'lire', ['v'], ['v']),
                suffixInflection('lirez', 'lire', ['v'], ['v']),
                suffixInflection('liront', 'lire', ['v'], ['v']),

                // 3ème groupe : verbes en -dire
                suffixInflection('dirai', 'dire', ['v'], ['v']),
                suffixInflection('diras', 'dire', ['v'], ['v']),
                suffixInflection('dira', 'dire', ['v'], ['v']),
                suffixInflection('dirons', 'dire', ['v'], ['v']),
                suffixInflection('direz', 'dire', ['v'], ['v']),
                suffixInflection('diront', 'dire', ['v'], ['v']),

                // 3ème groupe : verbes en rire (sourire)
                suffixInflection('rirai', 'rire', ['v'], ['v']),
                suffixInflection('riras', 'rire', ['v'], ['v']),
                suffixInflection('rira', 'rire', ['v'], ['v']),
                suffixInflection('rirons', 'rire', ['v'], ['v']),
                suffixInflection('rirez', 'rire', ['v'], ['v']),
                suffixInflection('riront', 'rire', ['v'], ['v']),

                // 3ème groupe : maudire
                suffixInflection('maudirai', 'maudire', ['v'], ['v']),
                suffixInflection('maudiras', 'maudire', ['v'], ['v']),
                suffixInflection('maudira', 'maudire', ['v'], ['v']),
                suffixInflection('maudirons', 'maudire', ['v'], ['v']),
                suffixInflection('maudirez', 'maudire', ['v'], ['v']),
                suffixInflection('maudiront', 'maudire', ['v'], ['v']),

                // 3ème groupe : verbes en -crire (décrire)
                suffixInflection('crirai', 'crire', ['v'], ['v']),
                suffixInflection('criras', 'crire', ['v'], ['v']),
                suffixInflection('crira', 'crire', ['v'], ['v']),
                suffixInflection('crirons', 'crire', ['v'], ['v']),
                suffixInflection('crirez', 'crire', ['v'], ['v']),
                suffixInflection('criront', 'crire', ['v'], ['v']),

                // 3ème groupe : verbes en -fire, -cire, -frire (suffire, confire etc...)
                suffixInflection('firai', 'fire', ['v'], ['v']),
                suffixInflection('firas', 'fire', ['v'], ['v']),
                suffixInflection('fira', 'fire', ['v'], ['v']),
                suffixInflection('firons', 'fire', ['v'], ['v']),
                suffixInflection('firez', 'fire', ['v'], ['v']),
                suffixInflection('firont', 'fire', ['v'], ['v']),

                suffixInflection('cirai', 'cire', ['v'], ['v']),
                suffixInflection('ciras', 'cire', ['v'], ['v']),
                suffixInflection('cira', 'cire', ['v'], ['v']),
                suffixInflection('cirons', 'cire', ['v'], ['v']),
                suffixInflection('cirez', 'cire', ['v'], ['v']),
                suffixInflection('ciront', 'cire', ['v'], ['v']),

                suffixInflection('frirai', 'frire', ['v'], ['v']),
                suffixInflection('friras', 'frire', ['v'], ['v']),
                suffixInflection('frira', 'frire', ['v'], ['v']),
                suffixInflection('frirons', 'frire', ['v'], ['v']),
                suffixInflection('frirez', 'frire', ['v'], ['v']),
                suffixInflection('friront', 'frire', ['v'], ['v']),

                // 3ème groupe : verbes en -uire (conduire, cuire etc...)
                suffixInflection('uirai', 'uire', ['v'], ['v']),
                suffixInflection('uiras', 'uire', ['v'], ['v']),
                suffixInflection('uira', 'uire', ['v'], ['v']),
                suffixInflection('uirons', 'uire', ['v'], ['v']),
                suffixInflection('uirez', 'uire', ['v'], ['v']),
                suffixInflection('uiront', 'uire', ['v'], ['v']),
            ],
        },

        // imperative
        'imperative present': {
            name: 'imperative present',
            description: 'Imperative form of a verb', // mode impératif d'un verbe dépend de plusieurs facteurs

            rules: [
                // auxiliaire être
                suffixInflection('sois', 'être', ['aux'], ['v']),
                suffixInflection('soyons', 'être', ['aux'], ['v']),
                suffixInflection('soyez', 'être', ['aux'], ['v']),

                // auxiliaire avoir
                suffixInflection('aie', 'avoir', ['aux'], ['v']),
                suffixInflection('ayons', 'avoir', ['aux'], ['v']),
                suffixInflection('ayez', 'avoir', ['aux'], ['v']),

                // verbes en -er
                suffixInflection('e', 'er', ['v'], ['v']),
                suffixInflection('ons', 'er', ['v'], ['v']),
                suffixInflection('ez', 'er', ['v'], ['v']),

                // verbes du 1er groupe : -cer
                suffixInflection('ce', 'er', ['v'], ['v']),
                suffixInflection('çons', 'er', ['v'], ['v']),
                suffixInflection('cez', 'er', ['v'], ['v']),

                // verbes du 1er groupe : -ger (manger)
                suffixInflection('ge', 'ger', ['v'], ['v']),
                suffixInflection('geons', 'ger', ['v'], ['v']),
                suffixInflection('gez', 'ger', ['v'], ['v']),

                // Verbes du 1er groupe : -e(.)er
                suffixInflection('èce', 'ecer', ['v'], ['v']),
                suffixInflection('eçons', 'ecer', ['v'], ['v']),
                suffixInflection('ecez', 'ecer', ['v'], ['v']),

                suffixInflection('ève', 'ever', ['v'], ['v']),
                suffixInflection('evons', 'ever', ['v'], ['v']),
                suffixInflection('evez', 'ever', ['v'], ['v']),

                suffixInflection('ène', 'ener', ['v'], ['v']),
                suffixInflection('enons', 'ener', ['v'], ['v']),
                suffixInflection('enez', 'ener', ['v'], ['v']),

                suffixInflection('èpe', 'eper', ['v'], ['v']),
                suffixInflection('epons', 'eper', ['v'], ['v']),
                suffixInflection('epez', 'eper', ['v'], ['v']),

                suffixInflection('ère', 'erer', ['v'], ['v']),
                suffixInflection('erons', 'erer', ['v'], ['v']),
                suffixInflection('erez', 'erer', ['v'], ['v']),

                suffixInflection('ème', 'emer', ['v'], ['v']),
                suffixInflection('emons', 'emer', ['v'], ['v']),
                suffixInflection('emez', 'emer', ['v'], ['v']),

                suffixInflection('èvre', 'evrer', ['v'], ['v']),
                suffixInflection('evrons', 'evrer', ['v'], ['v']),
                suffixInflection('evrez', 'evrer', ['v'], ['v']),

                suffixInflection('èse', 'eser', ['v'], ['v']),
                suffixInflection('èsons', 'eser', ['v'], ['v']),
                suffixInflection('esez', 'eser', ['v'], ['v']),

                // 1er groupe : verbes en é(.)er
                suffixInflection('ède', 'éder', ['v'], ['v']),
                suffixInflection('édons', 'éder', ['v'], ['v']),
                suffixInflection('édez', 'éder', ['v'], ['v']),

                suffixInflection('èbre', 'ébrer', ['v'], ['v']),
                suffixInflection('ébrons', 'ébrer', ['v'], ['v']),
                suffixInflection('ébrez', 'ébrer', ['v'], ['v']),

                suffixInflection('èce', 'écer', ['v'], ['v']),
                suffixInflection('éçons', 'écer', ['v'], ['v']),
                suffixInflection('écez', 'écer', ['v'], ['v']),

                suffixInflection('èche', 'écher', ['v'], ['v']),
                suffixInflection('échons', 'écher', ['v'], ['v']),
                suffixInflection('échez', 'écher', ['v'], ['v']),

                suffixInflection('ècre', 'écrer', ['v'], ['v']),
                suffixInflection('écrons', 'écrer', ['v'], ['v']),
                suffixInflection('écrez', 'écrer', ['v'], ['v']),

                suffixInflection('ègle', 'égler', ['v'], ['v']),
                suffixInflection('églons', 'égler', ['v'], ['v']),
                suffixInflection('églez', 'égler', ['v'], ['v']),

                suffixInflection('ègne', 'égner', ['v'], ['v']),
                suffixInflection('égnons', 'égner', ['v'], ['v']),
                suffixInflection('égnez', 'égner', ['v'], ['v']),

                suffixInflection('ègre', 'égrer', ['v'], ['v']),
                suffixInflection('égrons', 'égrer', ['v'], ['v']),
                suffixInflection('égrez', 'égrer', ['v'], ['v']),

                suffixInflection('ègue', 'éguer', ['v'], ['v']),
                suffixInflection('éguons', 'éguer', ['v'], ['v']),
                suffixInflection('éguez', 'éguer', ['v'], ['v']),

                suffixInflection('èle', 'éler', ['v'], ['v']),
                suffixInflection('élons', 'éler', ['v'], ['v']),
                suffixInflection('élez', 'éler', ['v'], ['v']),

                suffixInflection('ème', 'émer', ['v'], ['v']),
                suffixInflection('émons', 'émer', ['v'], ['v']),
                suffixInflection('émez', 'émer', ['v'], ['v']),

                suffixInflection('ène', 'éner', ['v'], ['v']),
                suffixInflection('énons', 'éner', ['v'], ['v']),
                suffixInflection('énez', 'éner', ['v'], ['v']),

                suffixInflection('èpe', 'éper', ['v'], ['v']),
                suffixInflection('épons', 'éper', ['v'], ['v']),
                suffixInflection('épez', 'éper', ['v'], ['v']),

                suffixInflection('èque', 'équer', ['v'], ['v']),
                suffixInflection('équons', 'équer', ['v'], ['v']),
                suffixInflection('équez', 'équer', ['v'], ['v']),

                suffixInflection('ère', 'érer', ['v'], ['v']),
                suffixInflection('érons', 'érer', ['v'], ['v']),
                suffixInflection('érez', 'érer', ['v'], ['v']),

                suffixInflection('èse', 'éser', ['v'], ['v']),
                suffixInflection('ésons', 'éser', ['v'], ['v']),
                suffixInflection('ésez', 'éser', ['v'], ['v']),

                suffixInflection('ète', 'éter', ['v'], ['v']),
                suffixInflection('étons', 'éter', ['v'], ['v']),
                suffixInflection('étez', 'éter', ['v'], ['v']),

                suffixInflection('ètre', 'étrer', ['v'], ['v']),
                suffixInflection('étrons', 'étrer', ['v'], ['v']),
                suffixInflection('étrez', 'étrer', ['v'], ['v']),

                suffixInflection('èye', 'éyer', ['v'], ['v']),
                suffixInflection('éyons', 'éyer', ['v'], ['v']),
                suffixInflection('éyez', 'éyer', ['v'], ['v']),

                // 1er groupe : verbes en -eler / -eter doublant le l ou le t, changeant le e en è
                suffixInflection('elle', 'eler', ['v'], ['v']),
                suffixInflection('ellons', 'eler', ['v'], ['v']),
                suffixInflection('ellez', 'eler', ['v'], ['v']),

                suffixInflection('ette', 'eter', ['v'], ['v']),
                suffixInflection('ettons', 'eter', ['v'], ['v']),
                suffixInflection('ettez', 'eter', ['v'], ['v']),

                // 1er groupe : verbes en -eler / -eter changeant le e en è
                suffixInflection('èle', 'eler', ['v'], ['v']),
                suffixInflection('élons', 'eler', ['v'], ['v']),
                suffixInflection('élez', 'eler', ['v'], ['v']),

                suffixInflection('ète', 'eter', ['v'], ['v']),
                suffixInflection('étons', 'eter', ['v'], ['v']),
                suffixInflection('étez', 'eter', ['v'], ['v']),

                // 1er groupe : verbes en -éger
                suffixInflection('ège', 'éger', ['v'], ['v']),
                suffixInflection('égeons', 'éger', ['v'], ['v']),
                suffixInflection('égez', 'éger', ['v'], ['v']),

                // 1er groupe : verbes en -ayer
                suffixInflection('aie', 'ayer', ['v'], ['v']),
                suffixInflection('ayons', 'ayer', ['v'], ['v']),
                suffixInflection('ayez', 'ayer', ['v'], ['v']),

                // 1er groupe : verbes en -oyer et -uyer
                suffixInflection('oie', 'oyer', ['v'], ['v']),
                suffixInflection('oyons', 'oyer', ['v'], ['v']),
                suffixInflection('oyez', 'oyer', ['v'], ['v']),

                suffixInflection('uie', 'uyer', ['v'], ['v']),
                suffixInflection('uyons', 'uyer', ['v'], ['v']),
                suffixInflection('uyez', 'uyer', ['v'], ['v']),

                // 2e groupe : verbes en -ir (finissant en -issons)
                suffixInflection('is', 'ir', ['v'], ['v']),
                suffixInflection('issons', 'ir', ['v'], ['v']),
                suffixInflection('issez', 'ir', ['v'], ['v']),

                suffixInflection('ïs', 'ïr', ['v'], ['v']),
                suffixInflection('ïssons', 'ïr', ['v'], ['v']),
                suffixInflection('ïssez', 'ïr', ['v'], ['v']),

                // 2e groupe : haïr (casual conv)
                suffixInflection('hais', 'haïr', ['v'], ['v']),
                suffixInflection('haïssons', 'haïr', ['v'], ['v']),
                suffixInflection('haïssez', 'haïr', ['v'], ['v']),

                // 3ème groupe aller
                suffixInflection('va', 'aller', ['v'], ['v']),
                suffixInflection('allons', 'aller', ['v'], ['v']),
                suffixInflection('allez', 'aller', ['v'], ['v']),

                // 3ème groupe -enir
                suffixInflection('iens', 'enir', ['v'], ['v']),
                suffixInflection('enons', 'enir', ['v'], ['v']),
                suffixInflection('enez', 'enir', ['v'], ['v']),

                // 3ème groupe -éir
                suffixInflection('iers', 'érir', ['v'], ['v']),
                suffixInflection('érons', 'érir', ['v'], ['v']),
                suffixInflection('érez', 'érir', ['v'], ['v']),

                // 3ème groupe -tir
                suffixInflection('s', 'tir', ['v'], ['v']),
                suffixInflection('tons', 'tir', ['v'], ['v']),
                suffixInflection('tez', 'tir', ['v'], ['v']),

                // 3ème groupe -êtir
                suffixInflection('êts', 'êtir', ['v'], ['v']),
                suffixInflection('êtons', 'êtir', ['v'], ['v']),
                suffixInflection('êtez', 'êtir', ['v'], ['v']),

                // 3ème groupe -vrir
                suffixInflection('vre', 'vrir', ['v'], ['v']),
                suffixInflection('vrons', 'vrir', ['v'], ['v']),
                suffixInflection('vrez', 'vrir', ['v'], ['v']),

                // 3ème groupe -frir
                suffixInflection('fre', 'frir', ['v'], ['v']),
                suffixInflection('frons', 'frir', ['v'], ['v']),
                suffixInflection('frez', 'frir', ['v'], ['v']),

                // 3ème groupe -ueillir
                suffixInflection('ueille', 'ueillir', ['v'], ['v']),
                suffixInflection('ueillons', 'ueillir', ['v'], ['v']),
                suffixInflection('ueillez', 'ueillir', ['v'], ['v']),

                // 3ème groupe -aillir
                suffixInflection('aille', 'aillir', ['v'], ['v']),
                suffixInflection('aillons', 'aillir', ['v'], ['v']),
                suffixInflection('aillez', 'aillir', ['v'], ['v']),

                // 3ème groupe : bouillir
                suffixInflection('bous', 'bouillir', ['v'], ['v']),
                suffixInflection('bouillons', 'bouillir', ['v'], ['v']),
                suffixInflection('bouillez', 'bouillir', ['v'], ['v']),

                // 3ème groupe : dormir
                suffixInflection('dors', 'dormir', ['v'], ['v']),
                suffixInflection('dormons', 'dormir', ['v'], ['v']),
                suffixInflection('dormez', 'dormir', ['v'], ['v']),

                // 3ème groupe : courir
                suffixInflection('cours', 'dormir', ['v'], ['v']),
                suffixInflection('courons', 'dormir', ['v'], ['v']),
                suffixInflection('courez', 'dormir', ['v'], ['v']),

                // 3ème groupe : mourir
                suffixInflection('meurs', 'mourir', ['v'], ['v']),
                suffixInflection('mourons', 'mourir', ['v'], ['v']),
                suffixInflection('mourez', 'mourir', ['v'], ['v']),

                // 3ème groupe servir
                suffixInflection('sers', 'servir', ['v'], ['v']),
                suffixInflection('servons', 'servir', ['v'], ['v']),
                suffixInflection('servez', 'servir', ['v'], ['v']),

                // 3ème groupe : fuir
                suffixInflection('fuis', 'fuir', ['v'], ['v']),
                suffixInflection('fuyons', 'fuir', ['v'], ['v']),
                suffixInflection('fuyez', 'fuir', ['v'], ['v']),

                // 3ème groupe : ouïr
                suffixInflection('ois', 'ouïr', ['v'], ['v']),
                suffixInflection('oyons', 'ouïr', ['v'], ['v']),
                suffixInflection('oyez', 'ouïr', ['v'], ['v']),

                // 3ème groupe -cevoir
                suffixInflection('çois', 'cevoir', ['v'], ['v']),
                suffixInflection('cevons', 'cevoir', ['v'], ['v']),
                suffixInflection('cevez', 'cevoir', ['v'], ['v']),

                // 3ème groupe : voir
                suffixInflection('vois', 'voir', ['v'], ['v']),
                suffixInflection('voyons', 'voir', ['v'], ['v']),
                suffixInflection('voyez', 'voir', ['v'], ['v']),

                // 3ème groupe : savoir
                suffixInflection('sais', 'savoir', ['v'], ['v']),
                suffixInflection('savons', 'savoir', ['v'], ['v']),
                suffixInflection('savez', 'savoir', ['v'], ['v']),

                // 3ème groupe : devoir
                suffixInflection('dois', 'devoir', ['v'], ['v']),
                suffixInflection('devons', 'devoir', ['v'], ['v']),
                suffixInflection('devez', 'devoir', ['v'], ['v']),

                // 3ème groupe : mouvoir
                suffixInflection('meus', 'mouvoir', ['v'], ['v']),
                suffixInflection('mouvons', 'mouvoir', ['v'], ['v']),
                suffixInflection('mouvez', 'mouvoir', ['v'], ['v']),

                // 3ème groupe : valoir
                suffixInflection('vaux', 'valoir', ['v'], ['v']),
                suffixInflection('valons', 'valoir', ['v'], ['v']),
                suffixInflection('valez', 'valoir', ['v'], ['v']),

                // 3ème groupe : vouloir
                suffixInflection('veux', 'vouloir', ['v'], ['v']),
                suffixInflection('veuille', 'vouloir', ['v'], ['v']),
                suffixInflection('voulons', 'vouloir', ['v'], ['v']),
                suffixInflection('voulez', 'vouloir', ['v'], ['v']),
                suffixInflection('veuillez', 'vouloir', ['v'], ['v']),

                // 3ème groupe : seoir / surseoir
                suffixInflection('sois', 'seoir', ['v'], ['v']),
                suffixInflection('soyons', 'seoir', ['v'], ['v']),
                suffixInflection('soyez', 'seoir', ['v'], ['v']),

                // 3ème groupe : asseoir (forme en ie et ye)
                suffixInflection('assieds', 'asseoir', ['v'], ['v']),
                suffixInflection('asseyons', 'asseoir', ['v'], ['v']),
                suffixInflection('asseyez', 'asseoir', ['v'], ['v']),

                // 3ème groupe : verbes en -andre, -endre, -ondre, -erdre, -ordre
                suffixInflection('ands', 'andre', ['v'], ['v']),
                suffixInflection('andons', 'andre', ['v'], ['v']),
                suffixInflection('andez', 'andre', ['v'], ['v']),

                suffixInflection('ends', 'endre', ['v'], ['v']),
                suffixInflection('endons', 'endre', ['v'], ['v']),
                suffixInflection('endez', 'endre', ['v'], ['v']),

                suffixInflection('onds', 'ondre', ['v'], ['v']),
                suffixInflection('ondons', 'ondre', ['v'], ['v']),
                suffixInflection('ondez', 'ondre', ['v'], ['v']),

                suffixInflection('erds', 'erdre', ['v'], ['v']),
                suffixInflection('erdons', 'erdre', ['v'], ['v']),
                suffixInflection('erdez', 'erdre', ['v'], ['v']),

                suffixInflection('ords', 'ordre', ['v'], ['v']),
                suffixInflection('ordons', 'ordre', ['v'], ['v']),
                suffixInflection('ordez', 'ordre', ['v'], ['v']),

                // 3ème groupe : prendre
                suffixInflection('prends', 'prendre', ['v'], ['v']),
                suffixInflection('prenons', 'prendre', ['v'], ['v']),
                suffixInflection('prenez', 'prendre', ['v'], ['v']),

                // 3ème groupe : battre
                suffixInflection('bats', 'battre', ['v'], ['v']),
                suffixInflection('battons', 'battre', ['v'], ['v']),
                suffixInflection('battez', 'battre', ['v'], ['v']),

                // 3ème groupe : mettre
                suffixInflection('mets', 'mettre', ['v'], ['v']),
                suffixInflection('mettons', 'mettre', ['v'], ['v']),
                suffixInflection('mettez', 'mettre', ['v'], ['v']),

                // 3ème groupe : verbes en -eindre
                suffixInflection('eins', 'eindre', ['v'], ['v']),
                suffixInflection('eignons', 'eindre', ['v'], ['v']),
                suffixInflection('eignez', 'eindre', ['v'], ['v']),

                // 3ème groupe : verbes en -oindre
                suffixInflection('oins', 'oindre', ['v'], ['v']),
                suffixInflection('oignons', 'oindre', ['v'], ['v']),
                suffixInflection('oignez', 'oindre', ['v'], ['v']),

                // 3ème groupe : verbes en -aindre
                suffixInflection('ains', 'aindre', ['v'], ['v']),
                suffixInflection('aignons', 'aindre', ['v'], ['v']),
                suffixInflection('aignez', 'aindre', ['v'], ['v']),

                // 3ème groupe : vaincre
                suffixInflection('vaincs', 'vaincre', ['v'], ['v']),
                suffixInflection('vainquons', 'vaincre', ['v'], ['v']),
                suffixInflection('vainquez', 'vaincre', ['v'], ['v']),

                // 3ème groupe : raire
                suffixInflection('rais', 'raire', ['v'], ['v']),
                suffixInflection('rayons', 'raire', ['v'], ['v']),
                suffixInflection('rayez', 'raire', ['v'], ['v']),

                // 3ème groupe : faire
                suffixInflection('fais', 'faire', ['v'], ['v']),
                suffixInflection('faisons', 'faire', ['v'], ['v']),
                suffixInflection('faites', 'faire', ['v'], ['v']),

                // 3ème groupe : plaire
                suffixInflection('plais', 'faire', ['v'], ['v']),
                suffixInflection('plaisons', 'faire', ['v'], ['v']),
                suffixInflection('plaisez', 'faire', ['v'], ['v']),

                // 3ème groupe : verbes en -aître (naître / connaître)
                suffixInflection('ais', 'aître', ['v'], ['v']),
                suffixInflection('aissons', 'aître', ['v'], ['v']),
                suffixInflection('aissez', 'aître', ['v'], ['v']),

                // 3ème groupe : verbes en -oître
                suffixInflection('ois', 'oître', ['v'], ['v']),
                suffixInflection('oissons', 'oître', ['v'], ['v']),
                suffixInflection('oissez', 'oître', ['v'], ['v']),

                // 3ème groupe : croire et boire
                suffixInflection('crois', 'croire', ['v'], ['v']),
                suffixInflection('croyons', 'croire', ['v'], ['v']),
                suffixInflection('croyez', 'croire', ['v'], ['v']),

                suffixInflection('bois', 'boire', ['v'], ['v']),
                suffixInflection('buvons', 'boire', ['v'], ['v']),
                suffixInflection('buvez', 'boire', ['v'], ['v']),

                // 3ème groupe : clore
                suffixInflection('clos', 'clore', ['v'], ['v']),

                // 3ème groupe : verbes en -clure
                suffixInflection('clus', 'clure', ['v'], ['v']),
                suffixInflection('cluons', 'clure', ['v'], ['v']),
                suffixInflection('cluez', 'clure', ['v'], ['v']),

                // 3ème groupe : verbes en -soudre (pas !!!)
                suffixInflection('sous', 'soudre', ['v'], ['v']),
                suffixInflection('solvons', 'soudre', ['v'], ['v']),
                suffixInflection('solvez', 'soudre', ['v'], ['v']),

                // 3ème groupe : verbes en -coudre
                suffixInflection('couds', 'coudre', ['v'], ['v']),
                suffixInflection('cousons', 'coudre', ['v'], ['v']),
                suffixInflection('cousez', 'coudre', ['v'], ['v']),

                // 3ème groupe : verbes en -moudre
                suffixInflection('mouds', 'moudre', ['v'], ['v']),
                suffixInflection('moulons', 'moudre', ['v'], ['v']),
                suffixInflection('moulez', 'moudre', ['v'], ['v']),

                // 3ème groupe : verbes en -ivre (suivre, vivre)
                suffixInflection('is', 'vivre', ['v'], ['v']),
                suffixInflection('ivons', 'vivre', ['v'], ['v']),
                suffixInflection('ivez', 'vivre', ['v'], ['v']),

                // 3ème groupe : verbes en -lire (relire)
                suffixInflection('lis', 'lire', ['v'], ['v']),
                suffixInflection('lisons', 'lire', ['v'], ['v']),
                suffixInflection('lisez', 'lire', ['v'], ['v']),

                // 3ème groupe : verbes en -dire (redire)
                suffixInflection('dis', 'dire', ['v'], ['v']),
                suffixInflection('disons', 'dire', ['v'], ['v']),
                suffixInflection('disez', 'dire', ['v'], ['v']),

                // 3ème groupe : verbes en rire (sourire)
                suffixInflection('ris', 'rire', ['v'], ['v']),
                suffixInflection('rions', 'rire', ['v'], ['v']),
                suffixInflection('riez', 'rire', ['v'], ['v']),

                // 3ème groupe : maudire
                suffixInflection('maudis', 'maudire', ['v'], ['v']),
                suffixInflection('maudissons', 'maudire', ['v'], ['v']),
                suffixInflection('maudissez', 'maudire', ['v'], ['v']),

                // 3ème groupe : verbes en crire (décrire)
                suffixInflection('cris', 'crire', ['v'], ['v']),
                suffixInflection('crivons', 'crire', ['v'], ['v']),
                suffixInflection('crivez', 'crire', ['v'], ['v']),

                // 3ème groupe : verbes en -fire, -cire, -frire (suffire, confire etc...)
                suffixInflection('fis', 'fire', ['v'], ['v']),
                suffixInflection('fisons', 'fire', ['v'], ['v']),
                suffixInflection('fisez', 'fire', ['v'], ['v']),

                suffixInflection('cis', 'cire', ['v'], ['v']),
                suffixInflection('cisons', 'cire', ['v'], ['v']),
                suffixInflection('cisez', 'cire', ['v'], ['v']),

                suffixInflection('fris', 'frire', ['v'], ['v']),
                suffixInflection('frisons', 'frire', ['v'], ['v']),
                suffixInflection('frisez', 'frire', ['v'], ['v']),

                // 3ème groupe : verbes en -uire (conduire, cuire etc...)
                suffixInflection('uis', 'uire', ['v'], ['v']),
                suffixInflection('uisons', 'uire', ['v'], ['v']),
                suffixInflection('uisez', 'uire', ['v'], ['v']),
            ],
        },

        // Conditionnel
        'Conditional': {
            name: 'conditional',
            description: 'Conditional form of a verb',
            rules: [
                // auxiliaire être
                suffixInflection('serais', 'être', ['aux'], ['v']),
                suffixInflection('serais', 'être', ['aux'], ['v']),
                suffixInflection('serait', 'être', ['aux'], ['v']),
                suffixInflection('serions', 'être', ['aux'], ['v']),
                suffixInflection('seriez', 'être', ['aux'], ['v']),
                suffixInflection('seraient', 'être', ['aux'], ['v']),

                // auxilaire avoir
                suffixInflection('aurais', 'avoir', ['aux'], ['v']),
                suffixInflection('aurais', 'avoir', ['aux'], ['v']),
                suffixInflection('aurait', 'avoir', ['aux'], ['v']),
                suffixInflection('aurions', 'avoir', ['aux'], ['v']),
                suffixInflection('auriez', 'avoir', ['aux'], ['v']),
                suffixInflection('auraient', 'avoir', ['aux'], ['v']),

                // 1er groupe : verbes en -er
                suffixInflection('erais', 'er', ['v'], ['v']),
                suffixInflection('erait', 'er', ['v'], ['v']),
                suffixInflection('erions', 'er', ['v'], ['v']),
                suffixInflection('eriez', 'er', ['v'], ['v']),
                suffixInflection('eraient', 'er', ['v'], ['v']),

                // 1er groupe : verbes en -cer
                suffixInflection('cerais', 'cer', ['v'], ['v']),
                suffixInflection('cerait', 'cer', ['v'], ['v']),
                suffixInflection('cerions', 'cer', ['v'], ['v']),
                suffixInflection('ceriez', 'cer', ['v'], ['v']),
                suffixInflection('ceraient', 'cer', ['v'], ['v']),

                // 1er groupe : verbes en -ger
                suffixInflection('gerais', 'ger', ['v'], ['v']),
                suffixInflection('gerait', 'ger', ['v'], ['v']),
                suffixInflection('gerions', 'ger', ['v'], ['v']),
                suffixInflection('geriez', 'ger', ['v'], ['v']),
                suffixInflection('géraient', 'ger', ['v'], ['v']),

                // 1er groupe : verbes en e(.)er
                suffixInflection('ècerais', 'ecer', ['v'], ['v']),
                suffixInflection('ècerait', 'ecer', ['v'], ['v']),
                suffixInflection('ècerions', 'ecer', ['v'], ['v']),
                suffixInflection('èceriez', 'ecer', ['v'], ['v']),
                suffixInflection('èceraient', 'ecer', ['v'], ['v']),

                suffixInflection('èverais', 'ever', ['v'], ['v']),
                suffixInflection('èverait', 'ever', ['v'], ['v']),
                suffixInflection('èverions', 'ever', ['v'], ['v']),
                suffixInflection('èveriez', 'ever', ['v'], ['v']),
                suffixInflection('èveraient', 'ever', ['v'], ['v']),

                suffixInflection('ènerais', 'ener', ['v'], ['v']),
                suffixInflection('ènerait', 'ener', ['v'], ['v']),
                suffixInflection('ènerions', 'ener', ['v'], ['v']),
                suffixInflection('èneriez', 'ener', ['v'], ['v']),
                suffixInflection('èneraient', 'ener', ['v'], ['v']),

                suffixInflection('èperais', 'eper', ['v'], ['v']),
                suffixInflection('èperait', 'eper', ['v'], ['v']),
                suffixInflection('èperions', 'eper', ['v'], ['v']),
                suffixInflection('èperiez', 'eper', ['v'], ['v']),
                suffixInflection('èperaient', 'eper', ['v'], ['v']),

                suffixInflection('èrerais', 'erer', ['v'], ['v']),
                suffixInflection('èrerait', 'erer', ['v'], ['v']),
                suffixInflection('èrerions', 'erer', ['v'], ['v']),
                suffixInflection('èreriez', 'erer', ['v'], ['v']),
                suffixInflection('èraient', 'erer', ['v'], ['v']),

                suffixInflection('èmerais', 'emer', ['v'], ['v']),
                suffixInflection('èmerait', 'emer', ['v'], ['v']),
                suffixInflection('èmerions', 'emer', ['v'], ['v']),
                suffixInflection('èmeriez', 'emer', ['v'], ['v']),
                suffixInflection('èmeraient', 'emer', ['v'], ['v']),

                suffixInflection('èvrerais', 'evrer', ['v'], ['v']),
                suffixInflection('èvrerait', 'evrer', ['v'], ['v']),
                suffixInflection('èvrerions', 'evrer', ['v'], ['v']),
                suffixInflection('èvreriez', 'evrer', ['v'], ['v']),
                suffixInflection('èvreraient', 'evrer', ['v'], ['v']),

                suffixInflection('èserais', 'eser', ['v'], ['v']),
                suffixInflection('èserait', 'eser', ['v'], ['v']),
                suffixInflection('èserions', 'eser', ['v'], ['v']),
                suffixInflection('èseriez', 'eser', ['v'], ['v']),
                suffixInflection('èseraient', 'eser', ['v'], ['v']),

                // 1er groupe : verbes en é(.)er
                suffixInflection('éderais', 'éder', ['v'], ['v']),
                suffixInflection('éderait', 'éder', ['v'], ['v']),
                suffixInflection('éderions', 'éder', ['v'], ['v']),
                suffixInflection('éderiez', 'éder', ['v'], ['v']),
                suffixInflection('éderaient', 'éder', ['v'], ['v']),

                suffixInflection('ébrerais', 'ébrer', ['v'], ['v']),
                suffixInflection('ébrerait', 'ébrer', ['v'], ['v']),
                suffixInflection('ébrerions', 'ébrer', ['v'], ['v']),
                suffixInflection('ébreriez', 'ébrer', ['v'], ['v']),
                suffixInflection('ébreraient', 'ébrer', ['v'], ['v']),

                suffixInflection('écerais', 'écer', ['v'], ['v']),
                suffixInflection('écerait', 'écer', ['v'], ['v']),
                suffixInflection('écerions', 'écer', ['v'], ['v']),
                suffixInflection('éceriez', 'écer', ['v'], ['v']),
                suffixInflection('éceraient', 'écer', ['v'], ['v']),

                suffixInflection('écherais', 'écher', ['v'], ['v']),
                suffixInflection('écherait', 'écher', ['v'], ['v']),
                suffixInflection('écherions', 'écher', ['v'], ['v']),
                suffixInflection('écheriez', 'écher', ['v'], ['v']),
                suffixInflection('écheraient', 'écher', ['v'], ['v']),

                suffixInflection('écrerais', 'écrer', ['v'], ['v']),
                suffixInflection('écrerait', 'écrer', ['v'], ['v']),
                suffixInflection('écrerions', 'écrer', ['v'], ['v']),
                suffixInflection('écreriez', 'écrer', ['v'], ['v']),
                suffixInflection('écreraient', 'écrer', ['v'], ['v']),

                suffixInflection('églerais', 'égler', ['v'], ['v']),
                suffixInflection('églerait', 'égler', ['v'], ['v']),
                suffixInflection('églerions', 'égler', ['v'], ['v']),
                suffixInflection('égleriez', 'égler', ['v'], ['v']),
                suffixInflection('égleraient', 'égler', ['v'], ['v']),

                suffixInflection('égnerais', 'égner', ['v'], ['v']),
                suffixInflection('égnerait', 'égner', ['v'], ['v']),
                suffixInflection('égnerions', 'égner', ['v'], ['v']),
                suffixInflection('égneriez', 'égner', ['v'], ['v']),
                suffixInflection('égneraient', 'égner', ['v'], ['v']),

                suffixInflection('égrerais', 'égrer', ['v'], ['v']),
                suffixInflection('égrerait', 'égrer', ['v'], ['v']),
                suffixInflection('égrerions', 'égrer', ['v'], ['v']),
                suffixInflection('égreriez', 'égrer', ['v'], ['v']),
                suffixInflection('égréraient', 'égrer', ['v'], ['v']),

                suffixInflection('éguerais', 'éguer', ['v'], ['v']),
                suffixInflection('éguerait', 'éguer', ['v'], ['v']),
                suffixInflection('éguerions', 'éguer', ['v'], ['v']),
                suffixInflection('égueriez', 'éguer', ['v'], ['v']),
                suffixInflection('égueraient', 'éguer', ['v'], ['v']),

                suffixInflection('élerais', 'éler', ['v'], ['v']),
                suffixInflection('élerait', 'éler', ['v'], ['v']),
                suffixInflection('élerions', 'éler', ['v'], ['v']),
                suffixInflection('éleriez', 'éler', ['v'], ['v']),
                suffixInflection('éleraient', 'éler', ['v'], ['v']),

                suffixInflection('émerais', 'émer', ['v'], ['v']),
                suffixInflection('émerait', 'émer', ['v'], ['v']),
                suffixInflection('émerions', 'émer', ['v'], ['v']),
                suffixInflection('émeriez', 'émer', ['v'], ['v']),
                suffixInflection('émeraient', 'émer', ['v'], ['v']),

                suffixInflection('énerais', 'éner', ['v'], ['v']),
                suffixInflection('énerait', 'éner', ['v'], ['v']),
                suffixInflection('énerions', 'éner', ['v'], ['v']),
                suffixInflection('éneriez', 'éner', ['v'], ['v']),
                suffixInflection('éneraient', 'éner', ['v'], ['v']),

                suffixInflection('éperais', 'éper', ['v'], ['v']),
                suffixInflection('éperait', 'éper', ['v'], ['v']),
                suffixInflection('éperions', 'éper', ['v'], ['v']),
                suffixInflection('éperiez', 'éper', ['v'], ['v']),
                suffixInflection('éperaient', 'éper', ['v'], ['v']),

                suffixInflection('équerais', 'équer', ['v'], ['v']),
                suffixInflection('équerait', 'équer', ['v'], ['v']),
                suffixInflection('équerions', 'équer', ['v'], ['v']),
                suffixInflection('équeriez', 'équer', ['v'], ['v']),
                suffixInflection('équeraient', 'équer', ['v'], ['v']),

                suffixInflection('érerais', 'érer', ['v'], ['v']),
                suffixInflection('érerait', 'érer', ['v'], ['v']),
                suffixInflection('érerions', 'érer', ['v'], ['v']),
                suffixInflection('éreriez', 'érer', ['v'], ['v']),
                suffixInflection('éraient', 'érer', ['v'], ['v']),

                suffixInflection('éserais', 'éser', ['v'], ['v']),
                suffixInflection('éserait', 'éser', ['v'], ['v']),
                suffixInflection('éserions', 'éser', ['v'], ['v']),
                suffixInflection('éseriez', 'éser', ['v'], ['v']),
                suffixInflection('ésaient', 'éser', ['v'], ['v']),

                suffixInflection('éterais', 'éter', ['v'], ['v']),
                suffixInflection('éterait', 'éter', ['v'], ['v']),
                suffixInflection('éterions', 'éter', ['v'], ['v']),
                suffixInflection('éteriez', 'éter', ['v'], ['v']),
                suffixInflection('éteraient', 'éter', ['v'], ['v']),

                suffixInflection('étrerais', 'étrer', ['v'], ['v']),
                suffixInflection('étrerait', 'étrer', ['v'], ['v']),
                suffixInflection('étrerions', 'étrer', ['v'], ['v']),
                suffixInflection('étreriez', 'étrer', ['v'], ['v']),
                suffixInflection('étraient', 'étrer', ['v'], ['v']),

                suffixInflection('éyerais', 'éyer', ['v'], ['v']),
                suffixInflection('éyerait', 'éyer', ['v'], ['v']),
                suffixInflection('éyerions', 'éyer', ['v'], ['v']),
                suffixInflection('éyeriez', 'éyer', ['v'], ['v']),
                suffixInflection('éyeraient', 'éyer', ['v'], ['v']),

                // 1er groupe : verbes en -eler / eter doublant le l
                suffixInflection('ellerais', 'eler', ['v'], ['v']),
                suffixInflection('ellerait', 'eler', ['v'], ['v']),
                suffixInflection('ellerions', 'eler', ['v'], ['v']),
                suffixInflection('elleriez', 'eler', ['v'], ['v']),
                suffixInflection('elleraient', 'eler', ['v'], ['v']),

                suffixInflection('etterais', 'eter', ['v'], ['v']),
                suffixInflection('etterait', 'eter', ['v'], ['v']),
                suffixInflection('etterions', 'eter', ['v'], ['v']),
                suffixInflection('etteriez', 'eter', ['v'], ['v']),
                suffixInflection('etteraient', 'eter', ['v'], ['v']),

                // 1er groupe : verbes en -eler / eter changeant le e en è
                suffixInflection('èlerais', 'eler', ['v'], ['v']),
                suffixInflection('èlerait', 'eler', ['v'], ['v']),
                suffixInflection('èlerions', 'eler', ['v'], ['v']),
                suffixInflection('èleriez', 'eler', ['v'], ['v']),
                suffixInflection('èleraient', 'eler', ['v'], ['v']),

                suffixInflection('èterais', 'eter', ['v'], ['v']),
                suffixInflection('èterait', 'eter', ['v'], ['v']),
                suffixInflection('èterions', 'eter', ['v'], ['v']),
                suffixInflection('èteriez', 'eter', ['v'], ['v']),
                suffixInflection('èteraient', 'eter', ['v'], ['v']),

                // 1er groupe : verbes en -éger
                suffixInflection('égerais', 'éger', ['v'], ['v']),
                suffixInflection('égerait', 'éger', ['v'], ['v']),
                suffixInflection('égerions', 'éger', ['v'], ['v']),
                suffixInflection('égeriez', 'éger', ['v'], ['v']),
                suffixInflection('égeraient', 'éger', ['v'], ['v']),

                // 1er groupe : verbes en -ayer
                suffixInflection('ayerais', 'ayer', ['v'], ['v']),
                suffixInflection('ayerait', 'ayer', ['v'], ['v']),
                suffixInflection('ayerions', 'ayer', ['v'], ['v']),
                suffixInflection('ayeriez', 'ayer', ['v'], ['v']),
                suffixInflection('ayeraient', 'ayer', ['v'], ['v']),
                suffixInflection('aierais', 'ayer', ['v'], ['v']),
                suffixInflection('aierait', 'ayer', ['v'], ['v']),
                suffixInflection('aierions', 'ayer', ['v'], ['v']),
                suffixInflection('aieriez', 'ayer', ['v'], ['v']),
                suffixInflection('aieraient', 'ayer', ['v'], ['v']),

                // 1er groupe : verbes en -oyer et -uyer
                suffixInflection('oierais', 'oyer', ['v'], ['v']),
                suffixInflection('oierait', 'oyer', ['v'], ['v']),
                suffixInflection('oierions', 'oyer', ['v'], ['v']),
                suffixInflection('oieriez', 'oyer', ['v'], ['v']),
                suffixInflection('oieraient', 'oyer', ['v'], ['v']),

                suffixInflection('uyerais', 'uyer', ['v'], ['v']),
                suffixInflection('uyerait', 'uyer', ['v'], ['v']),
                suffixInflection('uyerions', 'uyer', ['v'], ['v']),
                suffixInflection('uyeriez', 'uyer', ['v'], ['v']),
                suffixInflection('uyeraient', 'uyer', ['v'], ['v']),

                // 2e groupe : verbes en -ir (finissant en -issons)
                suffixInflection('irais', 'ir', ['v'], ['v']),
                suffixInflection('irait', 'ir', ['v'], ['v']),
                suffixInflection('irions', 'ir', ['v'], ['v']),
                suffixInflection('iriez', 'ir', ['v'], ['v']),
                suffixInflection('iraient', 'ir', ['v'], ['v']),

                // 2e groupe : haïr
                suffixInflection('haïrais', 'haïr', ['v'], ['v']),
                suffixInflection('haïrait', 'haïr', ['v'], ['v']),
                suffixInflection('haïrions', 'haïr', ['v'], ['v']),
                suffixInflection('haïriez', 'haïr', ['v'], ['v']),
                suffixInflection('haïraient', 'haïr', ['v'], ['v']),

                // 3e groupe : aller
                suffixInflection('irais', 'aller', ['v'], ['v']),
                suffixInflection('irait', 'aller', ['v'], ['v']),
                suffixInflection('irions', 'aller', ['v'], ['v']),
                suffixInflection('iriez', 'aller', ['v'], ['v']),
                suffixInflection('iraient', 'aller', ['v'], ['v']),

                // 3e groupe : -enir
                suffixInflection('iendrais', 'enir', ['v'], ['v']),
                suffixInflection('iendrait', 'enir', ['v'], ['v']),
                suffixInflection('iendrions', 'enir', ['v'], ['v']),
                suffixInflection('iendriez', 'enir', ['v'], ['v']),
                suffixInflection('iendraient', 'enir', ['v'], ['v']),

                // 3e groupe : -éir
                suffixInflection('ierais', 'érir', ['v'], ['v']),
                suffixInflection('ierait', 'érir', ['v'], ['v']),
                suffixInflection('irions', 'érir', ['v'], ['v']),
                suffixInflection('iriez', 'érir', ['v'], ['v']),
                suffixInflection('ièrent', 'érir', ['v'], ['v']),

                // 3e groupe : -tir
                suffixInflection('irais', 'tir', ['v'], ['v']),
                suffixInflection('irait', 'tir', ['v'], ['v']),
                suffixInflection('irions', 'tir', ['v'], ['v']),
                suffixInflection('iriez', 'tir', ['v'], ['v']),
                suffixInflection('raient', 'tir', ['v'], ['v']),

                // 3e groupe : -êtir
                suffixInflection('êtirais', 'êtir', ['v'], ['v']),
                suffixInflection('êtirait', 'êtir', ['v'], ['v']),
                suffixInflection('êtirions', 'êtir', ['v'], ['v']),
                suffixInflection('êtiriez', 'êtir', ['v'], ['v']),
                suffixInflection('êtiraient', 'êtir', ['v'], ['v']),

                // 3e groupe : -vrir
                suffixInflection('vrirais', 'vrir', ['v'], ['v']),
                suffixInflection('vrirait', 'vrir', ['v'], ['v']),
                suffixInflection('vririons', 'vrir', ['v'], ['v']),
                suffixInflection('vririez', 'vrir', ['v'], ['v']),
                suffixInflection('vriraient', 'vrir', ['v'], ['v']),

                // 3e groupe : -frir
                suffixInflection('frirais', 'frir', ['v'], ['v']),
                suffixInflection('frirait', 'frir', ['v'], ['v']),
                suffixInflection('fririons', 'frir', ['v'], ['v']),
                suffixInflection('fririez', 'frir', ['v'], ['v']),
                suffixInflection('friraient', 'frir', ['v'], ['v']),

                // 3e groupe : -ueillir
                suffixInflection('ueillerais', 'ueillir', ['v'], ['v']),
                suffixInflection('ueillerait', 'ueillir', ['v'], ['v']),
                suffixInflection('ueillerions', 'ueillir', ['v'], ['v']),
                suffixInflection('ueilleriez', 'ueillir', ['v'], ['v']),
                suffixInflection('ueilleraient', 'ueillir', ['v'], ['v']),

                // 3e groupe : -aillir
                suffixInflection('aillirais', 'aillir', ['v'], ['v']),
                suffixInflection('aillirait', 'aillir', ['v'], ['v']),
                suffixInflection('aillirions', 'aillir', ['v'], ['v']),
                suffixInflection('ailliriez', 'aillir', ['v'], ['v']),
                suffixInflection('ailliraient', 'aillir', ['v'], ['v']),

                // 3e groupe : faillir (exception)
                suffixInflection('faillirais', 'faillir', ['v'], ['v']),
                suffixInflection('faillirait', 'faillir', ['v'], ['v']),
                suffixInflection('faillirions', 'faillir', ['v'], ['v']),
                suffixInflection('failliriez', 'faillir', ['v'], ['v']),
                suffixInflection('failliraient', 'faillir', ['v'], ['v']),

                // 3e groupe : bouillir
                suffixInflection('bouillirais', 'bouillir', ['v'], ['v']),
                suffixInflection('bouillirait', 'bouillir', ['v'], ['v']),
                suffixInflection('bouillirions', 'bouillir', ['v'], ['v']),
                suffixInflection('bouilliriez', 'bouillir', ['v'], ['v']),
                suffixInflection('bouilliraient', 'bouillir', ['v'], ['v']),

                // 3e groupe : dormir
                suffixInflection('dormirais', 'dormir', ['v'], ['v']),
                suffixInflection('dormirait', 'dormir', ['v'], ['v']),
                suffixInflection('dormirions', 'dormir', ['v'], ['v']),
                suffixInflection('dormiriez', 'dormir', ['v'], ['v']),
                suffixInflection('dormiraient', 'dormir', ['v'], ['v']),

                // 3e groupe : courir
                suffixInflection('courrais', 'courir', ['v'], ['v']),
                suffixInflection('courrait', 'courir', ['v'], ['v']),
                suffixInflection('courrions', 'courir', ['v'], ['v']),
                suffixInflection('courriez', 'courir', ['v'], ['v']),
                suffixInflection('courraient', 'courir', ['v'], ['v']),

                // 3e groupe : mourir
                suffixInflection('mourrais', 'mourir', ['v'], ['v']),
                suffixInflection('mourrait', 'mourir', ['v'], ['v']),
                suffixInflection('mourrions', 'mourir', ['v'], ['v']),
                suffixInflection('mourriez', 'mourir', ['v'], ['v']),
                suffixInflection('mourraient', 'mourir', ['v'], ['v']),

                // 3e groupe : servir
                suffixInflection('servirais', 'servir', ['v'], ['v']),
                suffixInflection('servirait', 'servir', ['v'], ['v']),
                suffixInflection('servirions', 'servir', ['v'], ['v']),
                suffixInflection('serviriez', 'servir', ['v'], ['v']),
                suffixInflection('serviraient', 'servir', ['v'], ['v']),

                // 3e groupe : fuir
                suffixInflection('fuirais', 'fuir', ['v'], ['v']),
                suffixInflection('fuirait', 'fuir', ['v'], ['v']),
                suffixInflection('fuirions', 'fuir', ['v'], ['v']),
                suffixInflection('fuiriez', 'fuir', ['v'], ['v']),
                suffixInflection('fuiraient', 'fuir', ['v'], ['v']),

                // 3e groupe : ouïr
                suffixInflection('ouïrais', 'ouïr', ['v'], ['v']),
                suffixInflection('ouïrait', 'ouïr', ['v'], ['v']),
                suffixInflection('ouïrions', 'ouïr', ['v'], ['v']),
                suffixInflection('ouïriez', 'ouïr', ['v'], ['v']),
                suffixInflection('ouïraient', 'ouïr', ['v'], ['v']),

                // 3e groupe : gésir (rare)
                suffixInflection('gîrais', 'gésir', ['v'], ['v']),
                suffixInflection('gîrait', 'gésir', ['v'], ['v']),
                suffixInflection('gîraient', 'gésir', ['v'], ['v']),

                // 3e groupe : cevoir
                suffixInflection('cevrais', 'cevoir', ['v'], ['v']),
                suffixInflection('cevrait', 'cevoir', ['v'], ['v']),
                suffixInflection('cevrions', 'cevoir', ['v'], ['v']),
                suffixInflection('cevriez', 'cevoir', ['v'], ['v']),
                suffixInflection('cevraient', 'cevoir', ['v'], ['v']),

                // 3e groupe : voir
                suffixInflection('verrais', 'voir', ['v'], ['v']),
                suffixInflection('verrait', 'voir', ['v'], ['v']),
                suffixInflection('verrions', 'voir', ['v'], ['v']),
                suffixInflection('verriez', 'voir', ['v'], ['v']),
                suffixInflection('verraient', 'voir', ['v'], ['v']),

                // 3e groupe : savoir
                suffixInflection('saurais', 'savoir', ['v'], ['v']),
                suffixInflection('saurait', 'savoir', ['v'], ['v']),
                suffixInflection('saurions', 'savoir', ['v'], ['v']),
                suffixInflection('sauriez', 'savoir', ['v'], ['v']),
                suffixInflection('sauraient', 'savoir', ['v'], ['v']),

                // 3e groupe : devoir
                suffixInflection('devrais', 'devoir', ['v'], ['v']),
                suffixInflection('devrait', 'devoir', ['v'], ['v']),
                suffixInflection('devrions', 'devoir', ['v'], ['v']),
                suffixInflection('devriez', 'devoir', ['v'], ['v']),
                suffixInflection('devraient', 'devoir', ['v'], ['v']),

                // 3e groupe : pouvoir
                suffixInflection('pourrais', 'pouvoir', ['v'], ['v']),
                suffixInflection('pourrait', 'pouvoir', ['v'], ['v']),
                suffixInflection('pourrions', 'pouvoir', ['v'], ['v']),
                suffixInflection('pourriez', 'pouvoir', ['v'], ['v']),
                suffixInflection('pourraient', 'pouvoir', ['v'], ['v']),

                // 3e groupe : mouvoir
                suffixInflection('mouvrais', 'mouvoir', ['v'], ['v']),
                suffixInflection('mouvrait', 'mouvoir', ['v'], ['v']),
                suffixInflection('mouvrions', 'mouvoir', ['v'], ['v']),
                suffixInflection('mouvriez', 'mouvoir', ['v'], ['v']),
                suffixInflection('mouvraient', 'mouvoir', ['v'], ['v']),

                // 3e groupe : pleuvoir / falloir
                suffixInflection('pleuvrait', 'pleuvoir', ['v'], ['v']),
                suffixInflection('faudrait', 'falloir', ['v'], ['v']),

                // 3ème groupe : valoir
                suffixInflection('vaudrais', 'valoir', ['v'], ['v']),
                suffixInflection('vaudrait', 'valoir', ['v'], ['v']),
                suffixInflection('vaudrions', 'valoir', ['v'], ['v']),
                suffixInflection('vaudriez', 'valoir', ['v'], ['v']),
                suffixInflection('vaudraient', 'valoir', ['v'], ['v']),

                // 3ème groupe : vouloir
                suffixInflection('voudrais', 'vouloir', ['v'], ['v']),
                suffixInflection('voudrait', 'vouloir', ['v'], ['v']),
                suffixInflection('voudrions', 'vouloir', ['v'], ['v']),
                suffixInflection('voudriez', 'vouloir', ['v'], ['v']),
                suffixInflection('voudraient', 'vouloir', ['v'], ['v']),

                // 3ème groupe : seoir / surseoir
                suffixInflection('serais', 'seoir', ['v'], ['v']),
                suffixInflection('serait', 'seoir', ['v'], ['v']),
                suffixInflection('serions', 'seoir', ['v'], ['v']),
                suffixInflection('seriez', 'seoir', ['v'], ['v']),
                suffixInflection('seraient', 'seoir', ['v'], ['v']),

                // 3ème groupe : asseoir (forme en ie et ye)
                suffixInflection('assoirais', 'asseoir', ['v'], ['v']),
                suffixInflection('assoirait', 'asseoir', ['v'], ['v']),
                suffixInflection('assoirions', 'asseoir', ['v'], ['v']),
                suffixInflection('assoiriez', 'asseoir', ['v'], ['v']),
                suffixInflection('assoiraient', 'asseoir', ['v'], ['v']),

                // 3ème groupe : seoir (convenir) / messeoir (ne pas être convenable)
                suffixInflection('siéraient', 'seoir', ['v'], ['v']),

                // 3ème groupe : choir
                suffixInflection('choirais', 'choir', ['v'], ['v']),
                suffixInflection('choirait', 'choir', ['v'], ['v']),
                suffixInflection('choirions', 'choir', ['v'], ['v']),
                suffixInflection('choiriez', 'choir', ['v'], ['v']),
                suffixInflection('choiraient', 'choir', ['v'], ['v']),

                // 3ème groupe : échoir / déchoir
                suffixInflection('échoirais', 'échoir', ['v'], ['v']),
                suffixInflection('échoirait', 'échoir', ['v'], ['v']),
                suffixInflection('échoirions', 'échoir', ['v'], ['v']),
                suffixInflection('échoiriez', 'échoir', ['v'], ['v']),
                suffixInflection('échoiraient', 'échoir', ['v'], ['v']),

                // 3ème groupe : verbes en -andre, -endre, -ondre, -erdre, -ordre
                suffixInflection('andrais', 'andre', ['v'], ['v']),
                suffixInflection('andrai', 'andre', ['v'], ['v']),
                suffixInflection('andrions', 'andre', ['v'], ['v']),
                suffixInflection('andriez', 'andre', ['v'], ['v']),
                suffixInflection('andraient', 'andre', ['v'], ['v']),

                suffixInflection('endrais', 'endre', ['v'], ['v']),
                suffixInflection('endrai', 'endre', ['v'], ['v']),
                suffixInflection('endrions', 'endre', ['v'], ['v']),
                suffixInflection('endriez', 'endre', ['v'], ['v']),
                suffixInflection('endraient', 'endre', ['v'], ['v']),

                suffixInflection('ondrais', 'ondre', ['v'], ['v']),
                suffixInflection('ondra', 'ondre', ['v'], ['v']),
                suffixInflection('ondrions', 'ondre', ['v'], ['v']),
                suffixInflection('ondriez', 'ondre', ['v'], ['v']),
                suffixInflection('ondraient', 'ondre', ['v'], ['v']),

                suffixInflection('erdras', 'erdre', ['v'], ['v']),
                suffixInflection('erdrait', 'erdre', ['v'], ['v']),
                suffixInflection('erdrions', 'erdre', ['v'], ['v']),
                suffixInflection('erdriez', 'erdre', ['v'], ['v']),
                suffixInflection('erdaient', 'erdre', ['v'], ['v']),

                suffixInflection('ordrais', 'ordre', ['v'], ['v']),
                suffixInflection('ordrait', 'ordre', ['v'], ['v']),
                suffixInflection('ordrions', 'ordre', ['v'], ['v']),
                suffixInflection('ordriez', 'ordre', ['v'], ['v']),
                suffixInflection('ordraient', 'ordre', ['v'], ['v']),

                // 3ème groupe : prendre
                suffixInflection('prendrais', 'prendre', ['v'], ['v']),
                suffixInflection('prendrait', 'prendre', ['v'], ['v']),
                suffixInflection('prendrions', 'prendre', ['v'], ['v']),
                suffixInflection('prendriez', 'prendre', ['v'], ['v']),
                suffixInflection('prendraient', 'prendre', ['v'], ['v']),

                // 3ème groupe : battre
                suffixInflection('battrais', 'battre', ['v'], ['v']),
                suffixInflection('battrait', 'battre', ['v'], ['v']),
                suffixInflection('battrions', 'battre', ['v'], ['v']),
                suffixInflection('battriez', 'battre', ['v'], ['v']),
                suffixInflection('battraient', 'battre', ['v'], ['v']),

                // 3ème groupe : mettre
                suffixInflection('mettrais', 'mettre', ['v'], ['v']),
                suffixInflection('mettrait', 'mettre', ['v'], ['v']),
                suffixInflection('mettrions', 'mettre', ['v'], ['v']),
                suffixInflection('mettriez', 'mettre', ['v'], ['v']),
                suffixInflection('mettraient', 'mettre', ['v'], ['v']),

                // 3ème groupe : verbes en -eindre
                suffixInflection('eindrais', 'eindre', ['v'], ['v']),
                suffixInflection('eindrait', 'eindre', ['v'], ['v']),
                suffixInflection('eindrions', 'eindre', ['v'], ['v']),
                suffixInflection('eindriez', 'eindre', ['v'], ['v']),
                suffixInflection('eindraient', 'eindre', ['v'], ['v']),

                // 3ème groupe : verbes en -oindre
                suffixInflection('oindrais', 'oindre', ['v'], ['v']),
                suffixInflection('oindrait', 'oindre', ['v'], ['v']),
                suffixInflection('oindrions', 'oindre', ['v'], ['v']),
                suffixInflection('oindriez', 'oindre', ['v'], ['v']),
                suffixInflection('oindraient', 'oindre', ['v'], ['v']),

                // 3ème groupe : verbes en -aindre
                suffixInflection('aindrais', 'aindre', ['v'], ['v']),
                suffixInflection('aindrait', 'aindre', ['v'], ['v']),
                suffixInflection('aindrions', 'aindre', ['v'], ['v']),
                suffixInflection('aindriez', 'aindre', ['v'], ['v']),
                suffixInflection('aindraient', 'aindre', ['v'], ['v']),

                // 3ème groupe : vaincre
                suffixInflection('vaincrais', 'vaincre', ['v'], ['v']),
                suffixInflection('vaincrait', 'vaincre', ['v'], ['v']),
                suffixInflection('vaincrions', 'vaincre', ['v'], ['v']),
                suffixInflection('vaincriez', 'vaincre', ['v'], ['v']),
                suffixInflection('vaincraient', 'vaincre', ['v'], ['v']),

                // 3ème groupe : raire
                suffixInflection('rairais', 'raire', ['v'], ['v']),
                suffixInflection('rairait', 'raire', ['v'], ['v']),
                suffixInflection('rairions', 'raire', ['v'], ['v']),
                suffixInflection('rairiez', 'raire', ['v'], ['v']),
                suffixInflection('rairaient', 'raire', ['v'], ['v']),

                // 3ème groupe : faire
                suffixInflection('ferais', 'faire', ['v'], ['v']),
                suffixInflection('ferait', 'faire', ['v'], ['v']),
                suffixInflection('ferions', 'faire', ['v'], ['v']),
                suffixInflection('feriez', 'faire', ['v'], ['v']),
                suffixInflection('feraient', 'faire', ['v'], ['v']),

                // 3ème groupe : plaire
                suffixInflection('plairais', 'faire', ['v'], ['v']),
                suffixInflection('plairait', 'faire', ['v'], ['v']),
                suffixInflection('plairions', 'faire', ['v'], ['v']),
                suffixInflection('plairiez', 'faire', ['v'], ['v']),
                suffixInflection('plairaient', 'faire', ['v'], ['v']),

                // 3ème groupe : verbes en -aître (naître / connaître)
                suffixInflection('naîtrais', 'naître', ['v'], ['v']),
                suffixInflection('naîtrait', 'naître', ['v'], ['v']),
                suffixInflection('naîtrions', 'naître', ['v'], ['v']),
                suffixInflection('naîtriez', 'naître', ['v'], ['v']),
                suffixInflection('naîtraient', 'naître', ['v'], ['v']),

                // 3ème groupe : verbes en -oître
                suffixInflection('oîtrais', 'oître', ['v'], ['v']),
                suffixInflection('oîtrait', 'oître', ['v'], ['v']),
                suffixInflection('oîtrions', 'oître', ['v'], ['v']),
                suffixInflection('oîtriez', 'oître', ['v'], ['v']),
                suffixInflection('oîtraient', 'oître', ['v'], ['v']),

                // 3ème groupe : croire et boire
                suffixInflection('croirais', 'croire', ['v'], ['v']),
                suffixInflection('croirait', 'croire', ['v'], ['v']),
                suffixInflection('croirions', 'croire', ['v'], ['v']),
                suffixInflection('croiriez', 'croire', ['v'], ['v']),
                suffixInflection('croiraient', 'croire', ['v'], ['v']),

                suffixInflection('boirais', 'boire', ['v'], ['v']),
                suffixInflection('boirait', 'boire', ['v'], ['v']),
                suffixInflection('boirions', 'boire', ['v'], ['v']),
                suffixInflection('boiriez', 'boire', ['v'], ['v']),
                suffixInflection('boiraient', 'boire', ['v'], ['v']),

                // 3ème groupe : clore
                suffixInflection('clorais', 'clore', ['v'], ['v']),
                suffixInflection('clorait', 'clore', ['v'], ['v']),
                suffixInflection('clorions', 'clore', ['v'], ['v']),
                suffixInflection('cloriez', 'clore', ['v'], ['v']),
                suffixInflection('cloraient', 'clore', ['v'], ['v']),

                // 3ème groupe : verbes en -clure
                suffixInflection('clurais', 'clure', ['v'], ['v']),
                suffixInflection('clurait', 'clure', ['v'], ['v']),
                suffixInflection('clurions', 'clure', ['v'], ['v']),
                suffixInflection('cluriez', 'clure', ['v'], ['v']),
                suffixInflection('cluraient', 'clure', ['v'], ['v']),

                // 3ème groupe : verbes en -soudre
                suffixInflection('soudrais', 'soudre', ['v'], ['v']),
                suffixInflection('soudrait', 'soudre', ['v'], ['v']),
                suffixInflection('soudrions', 'soudre', ['v'], ['v']),
                suffixInflection('soudriez', 'soudre', ['v'], ['v']),
                suffixInflection('soudraient', 'soudre', ['v'], ['v']),

                // 3ème groupe : verbes en -coudre
                suffixInflection('coudrais', 'coudre', ['v'], ['v']),
                suffixInflection('coudrait', 'coudre', ['v'], ['v']),
                suffixInflection('coudrions', 'coudre', ['v'], ['v']),
                suffixInflection('coudriez', 'coudre', ['v'], ['v']),
                suffixInflection('coudraient', 'coudre', ['v'], ['v']),

                // 3ème groupe : verbes en -moudre
                suffixInflection('moudrais', 'moudre', ['v'], ['v']),
                suffixInflection('moudrait', 'moudre', ['v'], ['v']),
                suffixInflection('moudrions', 'moudre', ['v'], ['v']),
                suffixInflection('moudriez', 'moudre', ['v'], ['v']),
                suffixInflection('moudraient', 'moudre', ['v'], ['v']),

                // 3ème groupe : verbes en -ivre (suivre, vivre)
                suffixInflection('vivrais', 'vivre', ['v'], ['v']),
                suffixInflection('vivrait', 'vivre', ['v'], ['v']),
                suffixInflection('vivrions', 'vivre', ['v'], ['v']),
                suffixInflection('vivriez', 'vivre', ['v'], ['v']),
                suffixInflection('vivraient', 'vivre', ['v'], ['v']),

                // 3ème groupe : verbes en -lire (relire)
                suffixInflection('lirais', 'lire', ['v'], ['v']),
                suffixInflection('lirait', 'lire', ['v'], ['v']),
                suffixInflection('lirions', 'lire', ['v'], ['v']),
                suffixInflection('liriez', 'lire', ['v'], ['v']),
                suffixInflection('liraient', 'lire', ['v'], ['v']),

                // 3ème groupe : verbes en -dire (relire)
                suffixInflection('dirais', 'dire', ['v'], ['v']),
                suffixInflection('dirait', 'dire', ['v'], ['v']),
                suffixInflection('dirions', 'dire', ['v'], ['v']),
                suffixInflection('diriez', 'dire', ['v'], ['v']),
                suffixInflection('diraient', 'dire', ['v'], ['v']),

                // 3ème groupe : verbes en rire (sourire)
                suffixInflection('rirais', 'rire', ['v'], ['v']),
                suffixInflection('rirait', 'rire', ['v'], ['v']),
                suffixInflection('ririons', 'rire', ['v'], ['v']),
                suffixInflection('ririez', 'rire', ['v'], ['v']),
                suffixInflection('riraient', 'rire', ['v'], ['v']),

                // 3ème groupe : maudire
                suffixInflection('maudirais', 'maudire', ['v'], ['v']),
                suffixInflection('maudirait', 'maudire', ['v'], ['v']),
                suffixInflection('maudrions', 'maudire', ['v'], ['v']),
                suffixInflection('maudriez', 'maudire', ['v'], ['v']),
                suffixInflection('maudiraient', 'maudire', ['v'], ['v']),

                // 3ème groupe : verbes en crire (décrire)
                suffixInflection('crirais', 'crire', ['v'], ['v']),
                suffixInflection('crirait', 'crire', ['v'], ['v']),
                suffixInflection('cririons', 'crire', ['v'], ['v']),
                suffixInflection('cririez', 'crire', ['v'], ['v']),
                suffixInflection('criraient', 'crire', ['v'], ['v']),

                // 3ème groupe : verbes en -fire, -cire, -frire (suffire, confire etc...)
                suffixInflection('firais', 'fire', ['v'], ['v']),
                suffixInflection('firait', 'fire', ['v'], ['v']),
                suffixInflection('firions', 'fire', ['v'], ['v']),
                suffixInflection('firiez', 'fire', ['v'], ['v']),
                suffixInflection('firaient', 'fire', ['v'], ['v']),

                suffixInflection('cirais', 'cire', ['v'], ['v']),
                suffixInflection('cirait', 'cire', ['v'], ['v']),
                suffixInflection('cirions', 'cire', ['v'], ['v']),
                suffixInflection('ciriez', 'cire', ['v'], ['v']),
                suffixInflection('ciraient', 'cire', ['v'], ['v']),

                suffixInflection('frirais', 'frire', ['v'], ['v']),
                suffixInflection('frirait', 'frire', ['v'], ['v']),
                suffixInflection('fririons', 'frire', ['v'], ['v']),
                suffixInflection('fririez', 'frire', ['v'], ['v']),
                suffixInflection('friraient', 'frire', ['v'], ['v']),

                // 3ème groupe : verbes en -uire (conduire, cuire etc...)
                suffixInflection('cuirais', 'uire', ['v'], ['v']),
                suffixInflection('cuirait', 'uire', ['v'], ['v']),
                suffixInflection('cuirions', 'uire', ['v'], ['v']),
                suffixInflection('cuiriez', 'uire', ['v'], ['v']),
                suffixInflection('cuiraient', 'uire', ['v'], ['v']),
            ],
        },
        // Preterite
        'Preterite': {
            name: 'Preterite',
            description: 'Preterite (simple past) form of a verb',
            rules: [
                // auxiliaire être
                suffixInflection('fus', 'être', ['aux'], ['v']),
                suffixInflection('fus', 'être', ['aux'], ['v']),
                suffixInflection('fut', 'être', ['aux'], ['v']),
                suffixInflection('fûmes', 'être', ['aux'], ['v']),
                suffixInflection('fûtes', 'être', ['aux'], ['v']),
                suffixInflection('furent', 'être', ['aux'], ['v']),

                // auxiliaire avoir
                suffixInflection('eus', 'avoir', ['aux'], ['v']),
                suffixInflection('eus', 'avoir', ['aux'], ['v']),
                suffixInflection('eut', 'avoir', ['aux'], ['v']),
                suffixInflection('eûmes', 'avoir', ['aux'], ['v']),
                suffixInflection('eûtes', 'avoir', ['aux'], ['v']),
                suffixInflection('eurent', 'avoir', ['aux'], ['v']),

                // 1er groupe (-er)
                suffixInflection('ai', 'er', ['v'], ['v']),
                suffixInflection('as', 'er', ['v'], ['v']),
                suffixInflection('a', 'er', ['v'], ['v']),
                suffixInflection('âmes', 'er', ['v'], ['v']),
                suffixInflection('âtes', 'er', ['v'], ['v']),
                suffixInflection('èrent', 'er', ['v'], ['v']),

                // Verbes en -cer :
                suffixInflection('çai', 'cer', ['v'], ['v']),
                suffixInflection('ças', 'cer', ['v'], ['v']),
                suffixInflection('ça', 'cer', ['v'], ['v']),
                suffixInflection('çâmes', 'cer', ['v'], ['v']),
                suffixInflection('çâtes', 'cer', ['v'], ['v']),
                suffixInflection('çèrent', 'cer', ['v'], ['v']),

                // Verbes en -ger :
                suffixInflection('geai', 'ger', ['v'], ['v']),
                suffixInflection('geas', 'ger', ['v'], ['v']),
                suffixInflection('gea', 'ger', ['v'], ['v']),
                suffixInflection('geâmes', 'ger', ['v'], ['v']),
                suffixInflection('geâtes', 'ger', ['v'], ['v']),
                suffixInflection('gèrent', 'ger', ['v'], ['v']),

                // 1er Groupe : Verbes en e(.)er
                suffixInflection('èçai', 'ecer', ['v'], ['v']),
                suffixInflection('èças', 'ecer', ['v'], ['v']),
                suffixInflection('èça', 'ecer', ['v'], ['v']),
                suffixInflection('èçâmes', 'ecer', ['v'], ['v']),
                suffixInflection('èçâtes', 'ecer', ['v'], ['v']),
                suffixInflection('ècèrent', 'ecer', ['v'], ['v']),

                suffixInflection('èvai', 'ever', ['v'], ['v']),
                suffixInflection('èvas', 'ever', ['v'], ['v']),
                suffixInflection('èva', 'ever', ['v'], ['v']),
                suffixInflection('èvâmes', 'ever', ['v'], ['v']),
                suffixInflection('èvâtes', 'ever', ['v'], ['v']),
                suffixInflection('èvèrent', 'ever', ['v'], ['v']),

                suffixInflection('ènai', 'ener', ['v'], ['v']),
                suffixInflection('ènas', 'ener', ['v'], ['v']),
                suffixInflection('èna', 'ener', ['v'], ['v']),
                suffixInflection('ènâmes', 'ener', ['v'], ['v']),
                suffixInflection('ènâtes', 'ener', ['v'], ['v']),
                suffixInflection('ènèrent', 'ener', ['v'], ['v']),

                suffixInflection('èpai', 'eper', ['v'], ['v']),
                suffixInflection('èpas', 'eper', ['v'], ['v']),
                suffixInflection('èpa', 'eper', ['v'], ['v']),
                suffixInflection('èpâmes', 'eper', ['v'], ['v']),
                suffixInflection('èpâtes', 'eper', ['v'], ['v']),
                suffixInflection('èpèrent', 'eper', ['v'], ['v']),

                suffixInflection('èrai', 'erer', ['v'], ['v']),
                suffixInflection('èras', 'erer', ['v'], ['v']),
                suffixInflection('èra', 'erer', ['v'], ['v']),
                suffixInflection('èrâmes', 'erer', ['v'], ['v']),
                suffixInflection('èrâtes', 'erer', ['v'], ['v']),
                suffixInflection('èrèrent', 'erer', ['v'], ['v']),

                suffixInflection('èmai', 'emer', ['v'], ['v']),
                suffixInflection('èmas', 'emer', ['v'], ['v']),
                suffixInflection('èma', 'emer', ['v'], ['v']),
                suffixInflection('èmâmes', 'emer', ['v'], ['v']),
                suffixInflection('èmâtes', 'emer', ['v'], ['v']),
                suffixInflection('èmèrent', 'emer', ['v'], ['v']),

                suffixInflection('èvrài', 'evrer', ['v'], ['v']),
                suffixInflection('èvràs', 'evrer', ['v'], ['v']),
                suffixInflection('èvrà', 'evrer', ['v'], ['v']),
                suffixInflection('èvrâmes', 'evrer', ['v'], ['v']),
                suffixInflection('èvrâtes', 'evrer', ['v'], ['v']),
                suffixInflection('èvrèrent', 'evrer', ['v'], ['v']),

                suffixInflection('èsai', 'eser', ['v'], ['v']),
                suffixInflection('èsas', 'eser', ['v'], ['v']),
                suffixInflection('èsa', 'eser', ['v'], ['v']),
                suffixInflection('èsâmes', 'eser', ['v'], ['v']),
                suffixInflection('èsâtes', 'eser', ['v'], ['v']),
                suffixInflection('èsèrent', 'eser', ['v'], ['v']),

                // 1er Groupe : Verbes en é(.)er
                suffixInflection('édai', 'éder', ['v'], ['v']),
                suffixInflection('édas', 'éder', ['v'], ['v']),
                suffixInflection('éda', 'éder', ['v'], ['v']),
                suffixInflection('édâmes', 'éder', ['v'], ['v']),
                suffixInflection('édâtes', 'éder', ['v'], ['v']),
                suffixInflection('édèrent', 'éder', ['v'], ['v']),

                suffixInflection('ébrai', 'ébrer', ['v'], ['v']),
                suffixInflection('ébras', 'ébrer', ['v'], ['v']),
                suffixInflection('ébra', 'ébrer', ['v'], ['v']),
                suffixInflection('ébrâmes', 'ébrer', ['v'], ['v']),
                suffixInflection('ébrâtes', 'ébrer', ['v'], ['v']),
                suffixInflection('ébrèrent', 'ébrer', ['v'], ['v']),

                suffixInflection('échai', 'écher', ['v'], ['v']),
                suffixInflection('échas', 'écher', ['v'], ['v']),
                suffixInflection('écha', 'écher', ['v'], ['v']),
                suffixInflection('échâmes', 'écher', ['v'], ['v']),
                suffixInflection('échâtes', 'écher', ['v'], ['v']),
                suffixInflection('échèrent', 'écher', ['v'], ['v']),

                // 1er Groupe : Verbes spéciaux (ex. -ayer, -oyer, etc.)
                suffixInflection('aiyai', 'ayer', ['v'], ['v']),
                suffixInflection('aiyas', 'ayer', ['v'], ['v']),
                suffixInflection('aiya', 'ayer', ['v'], ['v']),
                suffixInflection('aiyâmes', 'ayer', ['v'], ['v']),
                suffixInflection('aiyâtes', 'ayer', ['v'], ['v']),
                suffixInflection('aiyèrent', 'ayer', ['v'], ['v']),

                suffixInflection('oiyai', 'oyer', ['v'], ['v']),
                suffixInflection('oiyas', 'oyer', ['v'], ['v']),
                suffixInflection('oiya', 'oyer', ['v'], ['v']),
                suffixInflection('oiyâmes', 'oyer', ['v'], ['v']),
                suffixInflection('oiyâtes', 'oyer', ['v'], ['v']),
                suffixInflection('oiyèrent', 'oyer', ['v'], ['v']),

                suffixInflection('uiyai', 'uyer', ['v'], ['v']),
                suffixInflection('uiyas', 'uyer', ['v'], ['v']),
                suffixInflection('uiya', 'uyer', ['v'], ['v']),
                suffixInflection('uiyâmes', 'uyer', ['v'], ['v']),
                suffixInflection('uiyâtes', 'uyer', ['v'], ['v']),
                suffixInflection('uiyèrent', 'uyer', ['v'], ['v']),

                // 2e groupe : verbes en -ir (finissant en -issons)
                suffixInflection('is', 'ir', ['v'], ['v']),
                suffixInflection('it', 'ir', ['v'], ['v']),
                suffixInflection('îmes', 'ir', ['v'], ['v']),
                suffixInflection('îtes', 'ir', ['v'], ['v']),
                suffixInflection('irent', 'ir', ['v'], ['v']),

                // 2e groupe : haïr
                suffixInflection('haïs', 'haïr', ['v'], ['v']),
                suffixInflection('haït', 'haïr', ['v'], ['v']),
                suffixInflection('haïmes', 'haïr', ['v'], ['v']),
                suffixInflection('haïtes', 'haïr', ['v'], ['v']),
                suffixInflection('haïrent', 'haïr', ['v'], ['v']),

                // 3ème groupe : aller
                suffixInflection('allai', 'aller', ['v'], ['v']),
                suffixInflection('allas', 'aller', ['v'], ['v']),
                suffixInflection('alla', 'aller', ['v'], ['v']),
                suffixInflection('allâmes', 'aller', ['v'], ['v']),
                suffixInflection('allâtes', 'aller', ['v'], ['v']),
                suffixInflection('allèrent', 'aller', ['v'], ['v']),

                // 3ème groupe : -enir
                suffixInflection('ins', 'enir', ['v'], ['v']),
                suffixInflection('int', 'enir', ['v'], ['v']),
                suffixInflection('înmes', 'enir', ['v'], ['v']),
                suffixInflection('întes', 'enir', ['v'], ['v']),
                suffixInflection('inrent', 'enir', ['v'], ['v']),

                // 3ème groupe : -érir
                suffixInflection('éris', 'érir', ['v'], ['v']),
                suffixInflection('érit', 'érir', ['v'], ['v']),
                suffixInflection('érîmes', 'érir', ['v'], ['v']),
                suffixInflection('érîtes', 'érir', ['v'], ['v']),
                suffixInflection('érirent', 'érir', ['v'], ['v']),

                // 3ème groupe : -tir
                suffixInflection('tis', 'tir', ['v'], ['v']),
                suffixInflection('tit', 'tir', ['v'], ['v']),
                suffixInflection('tîmes', 'tir', ['v'], ['v']),
                suffixInflection('tîtes', 'tir', ['v'], ['v']),
                suffixInflection('tirent', 'tir', ['v'], ['v']),

                // 3ème groupe : -êtir
                suffixInflection('êtis', 'êtir', ['v'], ['v']),
                suffixInflection('êtit', 'êtir', ['v'], ['v']),
                suffixInflection('êtîmes', 'êtir', ['v'], ['v']),
                suffixInflection('êtîtes', 'êtir', ['v'], ['v']),
                suffixInflection('êtirent', 'êtir', ['v'], ['v']),

                // 3ème groupe : -vrir
                suffixInflection('vris', 'vrir', ['v'], ['v']),
                suffixInflection('vrit', 'vrir', ['v'], ['v']),
                suffixInflection('vrîmes', 'vrir', ['v'], ['v']),
                suffixInflection('vrîtes', 'vrir', ['v'], ['v']),
                suffixInflection('vrirent', 'vrir', ['v'], ['v']),

                // 3ème groupe : -frir
                suffixInflection('fris', 'frir', ['v'], ['v']),
                suffixInflection('frit', 'frir', ['v'], ['v']),
                suffixInflection('frîmes', 'frir', ['v'], ['v']),
                suffixInflection('frîtes', 'frir', ['v'], ['v']),
                suffixInflection('frirent', 'frir', ['v'], ['v']),

                // 3ème groupe : -ueillir
                suffixInflection('ueillis', 'ueillir', ['v'], ['v']),
                suffixInflection('ueillit', 'ueillir', ['v'], ['v']),
                suffixInflection('ueillîmes', 'ueillir', ['v'], ['v']),
                suffixInflection('ueillîtes', 'ueillir', ['v'], ['v']),
                suffixInflection('ueillirent', 'ueillir', ['v'], ['v']),

                // 3ème groupe : -aillir
                suffixInflection('aillis', 'aillir', ['v'], ['v']),
                suffixInflection('aillit', 'aillir', ['v'], ['v']),
                suffixInflection('aillîmes', 'aillir', ['v'], ['v']),
                suffixInflection('aillîtes', 'aillir', ['v'], ['v']),
                suffixInflection('aillirent', 'aillir', ['v'], ['v']),

                // 3ème groupe : bouillir
                suffixInflection('bouillis', 'bouillir', ['v'], ['v']),
                suffixInflection('bouillit', 'bouillir', ['v'], ['v']),
                suffixInflection('bouillîmes', 'bouillir', ['v'], ['v']),
                suffixInflection('bouillîtes', 'bouillir', ['v'], ['v']),
                suffixInflection('bouillirent', 'bouillir', ['v'], ['v']),

                // 3ème groupe : dormir
                suffixInflection('dormis', 'dormir', ['v'], ['v']),
                suffixInflection('dormit', 'dormir', ['v'], ['v']),
                suffixInflection('dormîmes', 'dormir', ['v'], ['v']),
                suffixInflection('dormîtes', 'dormir', ['v'], ['v']),
                suffixInflection('dormirent', 'dormir', ['v'], ['v']),

                // 3ème groupe : courir
                suffixInflection('courus', 'courir', ['v'], ['v']),
                suffixInflection('courut', 'courir', ['v'], ['v']),
                suffixInflection('courûmes', 'courir', ['v'], ['v']),
                suffixInflection('courûtes', 'courir', ['v'], ['v']),
                suffixInflection('coururent', 'courir', ['v'], ['v']),

                // 3ème groupe : mourir
                suffixInflection('mourus', 'mourir', ['v'], ['v']),
                suffixInflection('mourut', 'mourir', ['v'], ['v']),
                suffixInflection('mourûmes', 'mourir', ['v'], ['v']),
                suffixInflection('mourûtes', 'mourir', ['v'], ['v']),
                suffixInflection('moururent', 'mourir', ['v'], ['v']),

                // 3ème groupe : servir
                suffixInflection('servis', 'servir', ['v'], ['v']),
                suffixInflection('servit', 'servir', ['v'], ['v']),
                suffixInflection('servîmes', 'servir', ['v'], ['v']),
                suffixInflection('servîtes', 'servir', ['v'], ['v']),
                suffixInflection('servirent', 'servir', ['v'], ['v']),

                // 3ème groupe : fuir
                suffixInflection('fuis', 'fuir', ['v'], ['v']),
                suffixInflection('fuit', 'fuir', ['v'], ['v']),
                suffixInflection('fuîmes', 'fuir', ['v'], ['v']),
                suffixInflection('fuîtes', 'fuir', ['v'], ['v']),
                suffixInflection('fuirent', 'fuir', ['v'], ['v']),

                // 3ème groupe : ouïr
                suffixInflection('ouïs', 'ouïr', ['v'], ['v']),
                suffixInflection('ouït', 'ouïr', ['v'], ['v']),
                suffixInflection('ouïmes', 'ouïr', ['v'], ['v']),
                suffixInflection('ouïtes', 'ouïr', ['v'], ['v']),
                suffixInflection('ouïrent', 'ouïr', ['v'], ['v']),

                // 3ème groupe : gésir
                suffixInflection('gis', 'gésir', ['v'], ['v']),
                suffixInflection('git', 'gésir', ['v'], ['v']),
                suffixInflection('gîmes', 'gésir', ['v'], ['v']),
                suffixInflection('gîtes', 'gésir', ['v'], ['v']),
                suffixInflection('gisirent', 'gésir', ['v'], ['v']),

                // 3ème groupe : -cevoir
                suffixInflection('çus', 'cevoir', ['v'], ['v']),
                suffixInflection('çut', 'cevoir', ['v'], ['v']),
                suffixInflection('çûmes', 'cevoir', ['v'], ['v']),
                suffixInflection('çûtes', 'cevoir', ['v'], ['v']),
                suffixInflection('çurent', 'cevoir', ['v'], ['v']),

                // 3ème groupe : voir
                suffixInflection('vis', 'voir', ['v'], ['v']),
                suffixInflection('vit', 'voir', ['v'], ['v']),
                suffixInflection('vîmes', 'voir', ['v'], ['v']),
                suffixInflection('vîtes', 'voir', ['v'], ['v']),
                suffixInflection('virent', 'voir', ['v'], ['v']),

                // 3ème groupe : savoir
                suffixInflection('sus', 'savoir', ['v'], ['v']),
                suffixInflection('sut', 'savoir', ['v'], ['v']),
                suffixInflection('sûmes', 'savoir', ['v'], ['v']),
                suffixInflection('sûtes', 'savoir', ['v'], ['v']),
                suffixInflection('surent', 'savoir', ['v'], ['v']),

                // 3ème groupe : devoir
                suffixInflection('dus', 'devoir', ['v'], ['v']),
                suffixInflection('dut', 'devoir', ['v'], ['v']),
                suffixInflection('dûmes', 'devoir', ['v'], ['v']),
                suffixInflection('dûtes', 'devoir', ['v'], ['v']),
                suffixInflection('durent', 'devoir', ['v'], ['v']),

                // 3ème groupe : pouvoir
                suffixInflection('pus', 'pouvoir', ['v'], ['v']),
                suffixInflection('put', 'pouvoir', ['v'], ['v']),
                suffixInflection('pûmes', 'pouvoir', ['v'], ['v']),
                suffixInflection('pûtes', 'pouvoir', ['v'], ['v']),
                suffixInflection('purent', 'pouvoir', ['v'], ['v']),

                // 3ème groupe : mouvoir
                suffixInflection('mus', 'mouvoir', ['v'], ['v']),
                suffixInflection('mut', 'mouvoir', ['v'], ['v']),
                suffixInflection('mûmes', 'mouvoir', ['v'], ['v']),
                suffixInflection('mûtes', 'mouvoir', ['v'], ['v']),
                suffixInflection('murent', 'mouvoir', ['v'], ['v']),

                // 3ème groupe : pleuvoir / falloir (verbes impersonnels)
                suffixInflection('plut', 'pleuvoir', ['v'], ['v']),
                suffixInflection('fallut', 'falloir', ['v'], ['v']),

                // 3ème groupe : valoir
                suffixInflection('valus', 'valoir', ['v'], ['v']),
                suffixInflection('valut', 'valoir', ['v'], ['v']),
                suffixInflection('valûmes', 'valoir', ['v'], ['v']),
                suffixInflection('valûtes', 'valoir', ['v'], ['v']),
                suffixInflection('valurent', 'valoir', ['v'], ['v']),

                // 3ème groupe : vouloir
                suffixInflection('voulus', 'vouloir', ['v'], ['v']),
                suffixInflection('voulut', 'vouloir', ['v'], ['v']),
                suffixInflection('voulûmes', 'vouloir', ['v'], ['v']),
                suffixInflection('voulûtes', 'vouloir', ['v'], ['v']),
                suffixInflection('voulurent', 'vouloir', ['v'], ['v']),

                // 3ème groupe : seoir / surseoir
                suffixInflection('seus', 'seoir', ['v'], ['v']),
                suffixInflection('seut', 'seoir', ['v'], ['v']),
                suffixInflection('seûmes', 'seoir', ['v'], ['v']),
                suffixInflection('seûtes', 'seoir', ['v'], ['v']),
                suffixInflection('seurent', 'seoir', ['v'], ['v']),

                // 3ème groupe : asseoir
                suffixInflection('assis', 'asseoir', ['v'], ['v']),
                suffixInflection('assit', 'asseoir', ['v'], ['v']),
                suffixInflection('assîmes', 'asseoir', ['v'], ['v']),
                suffixInflection('assîtes', 'asseoir', ['v'], ['v']),
                suffixInflection('assirent', 'asseoir', ['v'], ['v']),

                // 3ème groupe : choir
                suffixInflection('chus', 'choir', ['v'], ['v']),
                suffixInflection('chut', 'choir', ['v'], ['v']),
                suffixInflection('chûmes', 'choir', ['v'], ['v']),
                suffixInflection('chûtes', 'choir', ['v'], ['v']),
                suffixInflection('churent', 'choir', ['v'], ['v']),

                // Verbes en -andre, -endre, -ondre, -erdre, -ordre
                suffixInflection('andis', 'andre', ['v'], ['v']),
                suffixInflection('andit', 'andre', ['v'], ['v']),
                suffixInflection('andîmes', 'andre', ['v'], ['v']),
                suffixInflection('andîtes', 'andre', ['v'], ['v']),
                suffixInflection('andirent', 'andre', ['v'], ['v']),

                suffixInflection('endis', 'endre', ['v'], ['v']),
                suffixInflection('endit', 'endre', ['v'], ['v']),
                suffixInflection('endîmes', 'endre', ['v'], ['v']),
                suffixInflection('endîtes', 'endre', ['v'], ['v']),
                suffixInflection('endirent', 'endre', ['v'], ['v']),

                suffixInflection('ondis', 'ondre', ['v'], ['v']),
                suffixInflection('ondit', 'ondre', ['v'], ['v']),
                suffixInflection('ondîmes', 'ondre', ['v'], ['v']),
                suffixInflection('ondîtes', 'ondre', ['v'], ['v']),
                suffixInflection('ondirent', 'ondre', ['v'], ['v']),

                suffixInflection('erdis', 'erdre', ['v'], ['v']),
                suffixInflection('erdit', 'erdre', ['v'], ['v']),
                suffixInflection('erdîmes', 'erdre', ['v'], ['v']),
                suffixInflection('erdîtes', 'erdre', ['v'], ['v']),
                suffixInflection('erdirent', 'erdre', ['v'], ['v']),

                suffixInflection('ordis', 'ordre', ['v'], ['v']),
                suffixInflection('ordit', 'ordre', ['v'], ['v']),
                suffixInflection('ordîmes', 'ordre', ['v'], ['v']),
                suffixInflection('ordîtes', 'ordre', ['v'], ['v']),
                suffixInflection('ordirent', 'ordre', ['v'], ['v']),

                // 3eme groupe: prendre
                suffixInflection('pris', 'prendre', ['v'], ['v']),
                suffixInflection('prit', 'prendre', ['v'], ['v']),
                suffixInflection('prîmes', 'prendre', ['v'], ['v']),
                suffixInflection('prîtes', 'prendre', ['v'], ['v']),
                suffixInflection('prirent', 'prendre', ['v'], ['v']),

                // 3ème groupe : battre
                suffixInflection('battis', 'battre', ['v'], ['v']),
                suffixInflection('battit', 'battre', ['v'], ['v']),
                suffixInflection('battîmes', 'battre', ['v'], ['v']),
                suffixInflection('battîtes', 'battre', ['v'], ['v']),
                suffixInflection('battirent', 'battre', ['v'], ['v']),

                // 3ème groupe : mettre
                suffixInflection('mis', 'mettre', ['v'], ['v']),
                suffixInflection('mit', 'mettre', ['v'], ['v']),
                suffixInflection('mîmes', 'mettre', ['v'], ['v']),
                suffixInflection('mîtes', 'mettre', ['v'], ['v']),
                suffixInflection('mirent', 'mettre', ['v'], ['v']),

                // 3ème groupe : verbes en -eindre
                suffixInflection('eignis', 'eindre', ['v'], ['v']),
                suffixInflection('eignit', 'eindre', ['v'], ['v']),
                suffixInflection('eignîmes', 'eindre', ['v'], ['v']),
                suffixInflection('eignîtes', 'eindre', ['v'], ['v']),
                suffixInflection('eignirent', 'eindre', ['v'], ['v']),

                // 3ème groupe : verbes en -oindre
                suffixInflection('oignis', 'oindre', ['v'], ['v']),
                suffixInflection('oignit', 'oindre', ['v'], ['v']),
                suffixInflection('oignîmes', 'oindre', ['v'], ['v']),
                suffixInflection('oignîtes', 'oindre', ['v'], ['v']),
                suffixInflection('oignirent', 'oindre', ['v'], ['v']),

                // 3ème groupe : verbes en -aindre
                suffixInflection('aignis', 'aindre', ['v'], ['v']),
                suffixInflection('aignit', 'aindre', ['v'], ['v']),
                suffixInflection('aignîmes', 'aindre', ['v'], ['v']),
                suffixInflection('aignîtes', 'aindre', ['v'], ['v']),
                suffixInflection('aignirent', 'aindre', ['v'], ['v']),

                // 3ème groupe : vaincre
                suffixInflection('vainquis', 'vaincre', ['v'], ['v']),
                suffixInflection('vainquit', 'vaincre', ['v'], ['v']),
                suffixInflection('vainquîmes', 'vaincre', ['v'], ['v']),
                suffixInflection('vainquîtes', 'vaincre', ['v'], ['v']),
                suffixInflection('vainquirent', 'vaincre', ['v'], ['v']),

                // 3ème groupe : raire
                suffixInflection('rais', 'raire', ['v'], ['v']),
                suffixInflection('rait', 'raire', ['v'], ['v']),
                suffixInflection('rayons', 'raire', ['v'], ['v']),
                suffixInflection('rayez', 'raire', ['v'], ['v']),
                suffixInflection('raient', 'raire', ['v'], ['v']),

                // 3ème groupe : faire
                suffixInflection('fis', 'faire', ['v'], ['v']),
                suffixInflection('fit', 'faire', ['v'], ['v']),
                suffixInflection('fîmes', 'faire', ['v'], ['v']), // 'fîmes' pour 'nous'
                suffixInflection('fîtes', 'faire', ['v'], ['v']), // 'fîtes' pour 'vous'
                suffixInflection('firent', 'faire', ['v'], ['v']), // 'firent' pour 'ils/elles'

                // 3ème groupe : plaire
                suffixInflection('plais', 'plaire', ['v'], ['v']),
                suffixInflection('plut', 'plaire', ['v'], ['v']),
                suffixInflection('plûmes', 'plaire', ['v'], ['v']), // 'plûmes' pour 'nous'
                suffixInflection('plûtes', 'plaire', ['v'], ['v']), // 'plûtes' pour 'vous'
                suffixInflection('plurent', 'plaire', ['v'], ['v']), // 'plurent' pour 'ils/elles'

                // 3ème groupe : verbes en -aître (naître / connaître)
                suffixInflection('naquis', 'naître', ['v'], ['v']),
                suffixInflection('naquit', 'naître', ['v'], ['v']),
                suffixInflection('naquîmes', 'naître', ['v'], ['v']), // 'naquîmes' pour 'nous'
                suffixInflection('naquîtes', 'naître', ['v'], ['v']), // 'naquîtes' pour 'vous'
                suffixInflection('naquirent', 'naître', ['v'], ['v']), // 'naquirent' pour 'ils/elles'

                // 3ème groupe : verbes en -oître
                suffixInflection('perdis', 'perdre', ['v'], ['v']),
                suffixInflection('perdit', 'perdre', ['v'], ['v']),
                suffixInflection('perdîmes', 'perdre', ['v'], ['v']),
                suffixInflection('perdîtes', 'perdre', ['v'], ['v']),
                suffixInflection('perdirent', 'perdre', ['v'], ['v']),

                // 3ème groupe : croire et boire
                suffixInflection('crus', 'croire', ['v'], ['v']),
                suffixInflection('crut', 'croire', ['v'], ['v']),
                suffixInflection('crûmes', 'croire', ['v'], ['v']),
                suffixInflection('crûtes', 'croire', ['v'], ['v']),
                suffixInflection('crurent', 'croire', ['v'], ['v']),

                suffixInflection('bus', 'boire', ['v'], ['v']),
                suffixInflection('but', 'boire', ['v'], ['v']),
                suffixInflection('bûmes', 'boire', ['v'], ['v']),
                suffixInflection('bûtes', 'boire', ['v'], ['v']),
                suffixInflection('burent', 'boire', ['v'], ['v']),

                // 3ème groupe : clore (rare)
                suffixInflection('closis', 'clore', ['v'], ['v']),
                suffixInflection('closit', 'clore', ['v'], ['v']),
                suffixInflection('closîmes', 'clore', ['v'], ['v']),
                suffixInflection('closîtes', 'clore', ['v'], ['v']),
                suffixInflection('closirent', 'clore', ['v'], ['v']),

                // 3ème groupe : verbes en -clure
                suffixInflection('clus', 'clure', ['v'], ['v']),
                suffixInflection('clut', 'clure', ['v'], ['v']),
                suffixInflection('clûmes', 'clure', ['v'], ['v']), // 'clûmes' pour 'nous'
                suffixInflection('clûtes', 'clure', ['v'], ['v']), // 'clûtes' pour 'vous'
                suffixInflection('clurent', 'clure', ['v'], ['v']), // 'clurent' pour 'ils/elles'

                // 3ème groupe : verbes en -soudre
                suffixInflection('sous', 'soudre', ['v'], ['v']),
                suffixInflection('sout', 'soudre', ['v'], ['v']),
                suffixInflection('solvons', 'soudre', ['v'], ['v']),
                suffixInflection('solvez', 'soudre', ['v'], ['v']),
                suffixInflection('solvent', 'soudre', ['v'], ['v']),

                // 3ème groupe : verbes en -coudre
                suffixInflection('couds', 'coudre', ['v'], ['v']),
                suffixInflection('coud', 'coudre', ['v'], ['v']),
                suffixInflection('cousîmes', 'coudre', ['v'], ['v']), // 'cousîmes' pour 'nous'
                suffixInflection('cousîtes', 'coudre', ['v'], ['v']), // 'cousîtes' pour 'vous'
                suffixInflection('cousirent', 'coudre', ['v'], ['v']), // 'cousirent' pour 'ils/elles'

                // 3ème groupe : verbes en -moudre
                suffixInflection('mouds', 'moudre', ['v'], ['v']),
                suffixInflection('moud', 'moudre', ['v'], ['v']),
                suffixInflection('moulîmes', 'moudre', ['v'], ['v']), // 'moulîmes' pour 'nous'
                suffixInflection('moulîtes', 'moudre', ['v'], ['v']), // 'moulîtes' pour 'vous'
                suffixInflection('moulurent', 'moudre', ['v'], ['v']), // 'moulurent' pour 'ils/elles'

                // 3ème groupe : verbes en -ivre
                suffixInflection('vis', 'vivre', ['v'], ['v']),
                suffixInflection('vit', 'vivre', ['v'], ['v']),
                suffixInflection('vîmes', 'vivre', ['v'], ['v']),
                suffixInflection('vîtes', 'vivre', ['v'], ['v']),
                suffixInflection('virent', 'vivre', ['v'], ['v']),

                // 3ème groupe : verbes en -lire
                suffixInflection('lis', 'lire', ['v'], ['v']),
                suffixInflection('lit', 'lire', ['v'], ['v']),
                suffixInflection('lîmes', 'lire', ['v'], ['v']),
                suffixInflection('lîtes', 'lire', ['v'], ['v']),
                suffixInflection('lurent', 'lire', ['v'], ['v']),

                // 3ème groupe : verbes en -dire
                suffixInflection('dis', 'dire', ['v'], ['v']),
                suffixInflection('dit', 'dire', ['v'], ['v']),
                suffixInflection('dîmes', 'dire', ['v'], ['v']),
                suffixInflection('dîtes', 'dire', ['v'], ['v']),
                suffixInflection('dirent', 'dire', ['v'], ['v']),

                // 3ème groupe : verbes en rire
                suffixInflection('ris', 'rire', ['v'], ['v']),
                suffixInflection('rit', 'rire', ['v'], ['v']),
                suffixInflection('rîmes', 'rire', ['v'], ['v']),
                suffixInflection('rîtes', 'rire', ['v'], ['v']),
                suffixInflection('rirent', 'rire', ['v'], ['v']),

                // 3ème groupe : maudire
                suffixInflection('maudis', 'maudire', ['v'], ['v']),
                suffixInflection('maudit', 'maudire', ['v'], ['v']),
                suffixInflection('maudîmes', 'maudire', ['v'], ['v']),
                suffixInflection('maudîtes', 'maudire', ['v'], ['v']),
                suffixInflection('maudissent', 'maudire', ['v'], ['v']), // même terminaison qu'à l'indicatif

                // 3ème groupe : verbes en crire
                suffixInflection('cris', 'crire', ['v'], ['v']),
                suffixInflection('crit', 'crire', ['v'], ['v']),
                suffixInflection('crîmes', 'crire', ['v'], ['v']),
                suffixInflection('crîtes', 'crire', ['v'], ['v']),
                suffixInflection('crirent', 'crire', ['v'], ['v']),

                // 3ème groupe : verbes en -fire, -cire, -frire
                suffixInflection('fis', 'fire', ['v'], ['v']),
                suffixInflection('fit', 'fire', ['v'], ['v']),
                suffixInflection('fîmes', 'fire', ['v'], ['v']),
                suffixInflection('fîtes', 'fire', ['v'], ['v']),
                suffixInflection('fîrent', 'fire', ['v'], ['v']),

                suffixInflection('cis', 'cire', ['v'], ['v']),
                suffixInflection('cit', 'cire', ['v'], ['v']),
                suffixInflection('cîmes', 'cire', ['v'], ['v']),
                suffixInflection('cîtes', 'cire', ['v'], ['v']),
                suffixInflection('cîrent', 'cire', ['v'], ['v']),

                suffixInflection('fris', 'frire', ['v'], ['v']),
                suffixInflection('frit', 'frire', ['v'], ['v']),
                suffixInflection('frîmes', 'frire', ['v'], ['v']),
                suffixInflection('frîtes', 'frire', ['v'], ['v']),
                suffixInflection('frîrent', 'frire', ['v'], ['v']),

                // 3ème groupe : verbes en -uire
                suffixInflection('uis', 'uire', ['v'], ['v']),
                suffixInflection('uit', 'uire', ['v'], ['v']),
                suffixInflection('ûmes', 'uire', ['v'], ['v']),
                suffixInflection('ûtes', 'uire', ['v'], ['v']),
                suffixInflection('urent', 'uire', ['v'], ['v']),
            ],
        },

        'plural': {
            name: 'plural',
            description: 'Plural form of a noun',
            rules: [
                // Cas général : ajouter 's' (noms réguliers)
                suffixInflection('s', '', ['n'], ['n']), // Ajouter un 's' pour les noms réguliers au pluriel

                // Noms en -au, -eau, -eu, -ou (ajout de 'x')
                suffixInflection('aux', 'au', ['n'], ['n']),
                suffixInflection('eaux', 'eau', ['n'], ['n']),
                suffixInflection('eux', 'eu', ['n'], ['n']),
                suffixInflection('oux', 'ou', ['n'], ['n']), // Les noms comme 'bijou', 'caillou'

                // Noms en -al, -ail (ajout de 'aux' ou 's')
                suffixInflection('aux', 'al', ['n'], ['n']),
                suffixInflection('aux', 'ail', ['n'], ['n']), // Pour 'détail', 'travail', etc.
            ],
        },

        'present participle': {
            name: 'present participle',
            description: 'Present participle form of a verb',
            rules: [
                // 1er groupe : verbes en -er
                suffixInflection('ant', 'er', ['v'], ['v']),
                suffixInflection('geant', 'ger', ['v'], ['v']), // 'manger' → 'mangeant'

                // 2ème groupe : verbes en -ir (avec -issant)
                suffixInflection('issant', 'ir', ['v'], ['v']), // 'finir' → 'finissant'

                // 3ème groupe : verbes irréguliers en -ir
                suffixInflection('ant', 'ir', ['v'], ['v']), // 'partir' → 'partant'

                // 3ème groupe : verbes en -re
                suffixInflection('ant', 're', ['v'], ['v']), // 'prendre' → 'prenant'

                // 3ème groupe : verbes en -oir
                suffixInflection('ant', 'oir', ['v'], ['v']), // 'voir' → 'voyant'

                // Participes présents des verbes avec irrégularités

                // Verbes en -indre
                suffixInflection('ignant', 'indre', ['v'], ['v']),

                // Verbes en -soudre
                suffixInflection('solvant', 'soudre', ['v'], ['v']),

                // Verbes en -dre
                suffixInflection('ant', 'dre', ['v'], ['v']),

                // Verbes en -raire
                suffixInflection('rait', 'raire', ['v'], ['v']),

                // Verbes en -oir
                suffixInflection('ant', 'oir', ['v'], ['v']),

                // Verbes irréguliers : avoir, être, faire, dire, lire, voir, savoir
                suffixInflection('ayant', 'avoir', ['v'], ['v']),
                suffixInflection('étant', 'être', ['v'], ['v']),
                suffixInflection('faisant', 'faire', ['v'], ['v']),
                suffixInflection('disant', 'dire', ['v'], ['v']),
                suffixInflection('lisant', 'lire', ['v'], ['v']),
                suffixInflection('voyant', 'voir', ['v'], ['v']),
                suffixInflection('sachant', 'savoir', ['v'], ['v']),

                // TODO (add some irregular verbs) //
            ],
        },
        'present subjunctive': {
            name: 'present subjunctive',
            description: 'Present subjunctive form of a verb',
            rules: [
                // 1er Groupe : Verbes en -er
                suffixInflection('e', 'er', ['v'], ['v']),
                suffixInflection('es', 'er', ['v'], ['v']),
                suffixInflection('e', 'er', ['v'], ['v']),
                suffixInflection('ions', 'er', ['v'], ['v']),
                suffixInflection('iez', 'er', ['v'], ['v']),
                suffixInflection('ent', 'er', ['v'], ['v']),

                // 2ème Groupe : Verbes en -ir
                suffixInflection('sse', 'ir', ['v'], ['v']),
                suffixInflection('sses', 'ir', ['v'], ['v']),
                suffixInflection('t', 'ir', ['v'], ['v']),
                suffixInflection('ssions', 'ir', ['v'], ['v']),
                suffixInflection('ssiez', 'ir', ['v'], ['v']),
                suffixInflection('ssent', 'ir', ['v'], ['v']),

                // 3ème Groupe : Verbes Irréguliers

                // Être
                suffixInflection('sois', 'être', ['v'], ['v']),
                suffixInflection('sois', 'être', ['v'], ['v']),
                suffixInflection('soit', 'être', ['v'], ['v']),
                suffixInflection('soyons', 'être', ['v'], ['v']),
                suffixInflection('soyez', 'être', ['v'], ['v']),
                suffixInflection('soient', 'être', ['v'], ['v']),

                // Avoir
                suffixInflection('aie', 'avoir', ['v'], ['v']),
                suffixInflection('aies', 'avoir', ['v'], ['v']),
                suffixInflection('ait', 'avoir', ['v'], ['v']),
                suffixInflection('ayons', 'avoir', ['v'], ['v']),
                suffixInflection('ayez', 'avoir', ['v'], ['v']),
                suffixInflection('aient', 'avoir', ['v'], ['v']),

                // Faire
                suffixInflection('fasse', 'faire', ['v'], ['v']),
                suffixInflection('fasses', 'faire', ['v'], ['v']),
                suffixInflection('fasse', 'faire', ['v'], ['v']),
                suffixInflection('fassions', 'faire', ['v'], ['v']),
                suffixInflection('fassiez', 'faire', ['v'], ['v']),
                suffixInflection('fassent', 'faire', ['v'], ['v']),

                // Aller
                suffixInflection('aille', 'aller', ['v'], ['v']),
                suffixInflection('ailles', 'aller', ['v'], ['v']),
                suffixInflection('aille', 'aller', ['v'], ['v']),
                suffixInflection('allions', 'aller', ['v'], ['v']),
                suffixInflection('alliez', 'aller', ['v'], ['v']),
                suffixInflection('aillent', 'aller', ['v'], ['v']),

                // Savoir
                suffixInflection('sache', 'savoir', ['v'], ['v']),
                suffixInflection('saches', 'savoir', ['v'], ['v']),
                suffixInflection('sache', 'savoir', ['v'], ['v']),
                suffixInflection('sachions', 'savoir', ['v'], ['v']),
                suffixInflection('sachiez', 'savoir', ['v'], ['v']),
                suffixInflection('sachent', 'savoir', ['v'], ['v']),

                // Pouvoir
                suffixInflection('puisse', 'pouvoir', ['v'], ['v']),
                suffixInflection('puisses', 'pouvoir', ['v'], ['v']),
                suffixInflection('puisse', 'pouvoir', ['v'], ['v']),
                suffixInflection('puissions', 'pouvoir', ['v'], ['v']),
                suffixInflection('puissiez', 'pouvoir', ['v'], ['v']),
                suffixInflection('puissent', 'pouvoir', ['v'], ['v']),

                // 3ème Groupe : Verbes en -re, -ir, -indre, -soudre, etc.

                // Verbes en -re
                suffixInflection('sse', 're', ['v'], ['v']),
                suffixInflection('sses', 're', ['v'], ['v']),
                suffixInflection('t', 're', ['v'], ['v']),
                suffixInflection('ssions', 're', ['v'], ['v']),
                suffixInflection('ssiez', 're', ['v'], ['v']),
                suffixInflection('ssent', 're', ['v'], ['v']),

                // Verbes en -ir (comme *venir*)
                suffixInflection('ienne', 'ir', ['v'], ['v']),
                suffixInflection('iennes', 'ir', ['v'], ['v']),
                suffixInflection('ienne', 'ir', ['v'], ['v']),
                suffixInflection('nions', 'ir', ['v'], ['v']),
                suffixInflection('niez', 'ir', ['v'], ['v']),
                suffixInflection('iennent', 'ir', ['v'], ['v']),

                // Verbes en -indre
                suffixInflection('sse', 'indre', ['v'], ['v']),
                suffixInflection('sses', 'indre', ['v'], ['v']),
                suffixInflection('t', 'indre', ['v'], ['v']),
                suffixInflection('nions', 'indre', ['v'], ['v']),
                suffixInflection('niez', 'indre', ['v'], ['v']),
                suffixInflection('ngent', 'indre', ['v'], ['v']),

                // Verbes en -oudre (comme *résoudre*)
                suffixInflection('sse', 'oudre', ['v'], ['v']),
                suffixInflection('sses', 'oudre', ['v'], ['v']),
                suffixInflection('t', 'oudre', ['v'], ['v']),
                suffixInflection('dions', 'oudre', ['v'], ['v']),
                suffixInflection('diez', 'oudre', ['v'], ['v']),
                suffixInflection('dent', 'oudre', ['v'], ['v']),

                // Verbes en -uire (comme *conduire, cuire*)
                suffixInflection('se', 'uire', ['v'], ['v']),
                suffixInflection('ses', 'uire', ['v'], ['v']),
                suffixInflection('t', 'uire', ['v'], ['v']),
                suffixInflection('sions', 'uire', ['v'], ['v']),
                suffixInflection('siez', 'uire', ['v'], ['v']),
                suffixInflection('sent', 'uire', ['v'], ['v']),

                // Verbes en -ir (comme *dormir, partir*)
                suffixInflection('sse', 'ir', ['v'], ['v']),
                suffixInflection('sses', 'ir', ['v'], ['v']),
                suffixInflection('t', 'ir', ['v'], ['v']),
                suffixInflection('ssions', 'ir', ['v'], ['v']),
                suffixInflection('ssiez', 'ir', ['v'], ['v']),
                suffixInflection('ssent', 'ir', ['v'], ['v']),

                // TODO (add some irregular verbs) //
            ],
        },
        /* TODO: Add more tenses (someone better versed on grammar should take a look):
        *
        * Currently missing as far as I can tell:
        * Indicatif:  Passé composé, Passé antérieur, Plus-que-parfait, Futur antérieur
        * Subjonctif: Passé, Imparfait, Plus-que-parfait
        * Conditionnel: Passé première/deuxième forme
        * Impératif: Passé
        * Participe: Passé
        * Gérondif: Passé, Présent
        *
        * A lot of these are compound tenses (être/avoir + verb) which I don't know if there is a good way to handle
        * There is also a lot of overlap which can be impossible to distinguish.
        * Passé composé is probably the most useful one missing currently but it's compound.
        */

        // TODO: Add gender + better plural de-inflection?
    },
};
