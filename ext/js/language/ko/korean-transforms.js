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

/** @type {import('language-transformer').LanguageTransformDescriptor} */
export const koreanTransforms = {
    language: 'ko',
    conditions: {
        v: {
            name: 'Verb or Auxiliary Verb',
            isDictionaryForm: true,
            i18n: [
                {
                    language: 'ko',
                    name: '동사 / 보조 동사'
                }
            ]
        },
        adj: {
            name: 'Adjective or Auxiliary Adjective',
            isDictionaryForm: true,
            i18n: [
                {
                    language: 'ko',
                    name: '형용사 / 보조 형용사'
                }
            ]
        },
        p: {
            name: 'Intermediate past tense ending',
            isDictionaryForm: false
        },
        f: {
            name: 'Intermediate future tense ending',
            isDictionaryForm: false
        },
        eusi: {
            name: 'Intermediate formal ending',
            isDictionaryForm: false
        },
        euob: {
            name: 'Intermediate formal ending',
            isDictionaryForm: false
        },
        sao: {
            name: 'Intermediate formal ending',
            isDictionaryForm: false
        },
        saob: {
            name: 'Intermediate formal ending',
            isDictionaryForm: false
        },
        sab: {
            name: 'Intermediate formal ending',
            isDictionaryForm: false
        }
    },
    transforms: [
        {
            name: '거나',
            rules: [
                suffixInflection('ㄱㅓㄴㅏ', 'ㄷㅏ', [], ['v', 'adj']),
                suffixInflection('ㄱㅓㄴㅏ', '', [], ['p', 'f', 'euob', 'eusi']),
                suffixInflection('ㅇㅣㄱㅓㄴㅏ', 'ㅇㅣㄷㅏ', [], [])
            ]
        }
    ]
};
