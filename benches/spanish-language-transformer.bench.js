/*
 * Copyright (C) 2023-2025  Yomitan Authors
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

import {bench, describe} from 'vitest';
import {spanishTransforms} from '../ext/js/language/es/spanish-transforms.js';
import {LanguageTransformer} from '../ext/js/language/language-transformer.js';

const languageTransformer = new LanguageTransformer();
languageTransformer.addDescriptor(spanishTransforms);

describe('spanish language transformer', () => {
    describe('basic tests', () => {
        const nounInflections = [
            'gatos',
            'sofás',
            'tisús',
            'tisúes',
            'autobuses',
            'ciudades',
            'clics',
            'síes',
            'zigzags',
            'luces',
            'canciones',
        ];

        const verbPresentInflections = [
            'hablo',
            'hablas',
            'habla',
            'hablamos',
            'habláis',
            'hablan',
            'como',
            'comes',
            'come',
            'comemos',
            'coméis',
            'comen',
            'vivo',
            'vives',
            'vive',
            'vivimos',
            'vivís',
            'viven',
            'tengo',
            'tienes',
            'tiene',
            'tenemos',
            'tenéis',
            'tienen',
            'exijo',
            'extingo',
            'escojo',
            'quepo',
            'caigo',
            'conozco',
            'doy',
            'hago',
            'pongo',
            'sé',
            'salgo',
            'traduzco',
            'traigo',
            'valgo',
            'veo',
            'soy',
            'estoy',
            'voy',
            'he',
        ];

        const verbPreteriteInflections = [
            'hablé',
            'hablaste',
            'habló',
            'hablamos',
            'hablasteis',
            'hablaron',
            'comí',
            'comiste',
            'comió',
            'comimos',
            'comisteis',
            'comieron',
            'viví',
            'viviste',
            'vivió',
            'vivimos',
            'vivisteis',
            'vivieron',
            'tuve',
            'tuviste',
            'tuvo',
            'tuvimos',
            'tuvisteis',
            'tuvieron',
            'exigí',
            'extinguí',
            'escogí',
            'cupe',
            'caí',
            'conocí',
            'di',
            'hice',
            'puse',
            'supe',
            'salí',
            'traduje',
            'traje',
            'valí',
            'vi',
            'fui',
            'estuve',
            'fui',
            'hube',
        ];

        const basicTransformations = [...nounInflections, ...verbPresentInflections, ...verbPreteriteInflections];
        bench(`spanish transformations (n=${basicTransformations.length})`, () => {
            for (const transform of basicTransformations) {
                languageTransformer.transform(transform);
            }
        });
    });
});
