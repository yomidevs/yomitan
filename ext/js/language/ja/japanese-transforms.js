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
export const japaneseTransforms = {
    language: 'ja',
    conditions: {
        'v': {
            name: 'Verb',
            i18n: [
                {
                    language: 'ja',
                    name: '動詞'
                }
            ],
            isDictionaryForm: false,
            subConditions: ['v1', 'v5', 'vk', 'vs', 'vz']
        },
        'v1': {
            name: 'Ichidan verb',
            i18n: [
                {
                    language: 'ja',
                    name: '一段動詞'
                }
            ],
            isDictionaryForm: true,
            subConditions: ['v1d', 'v1p']
        },
        'v1d': {
            name: 'Ichidan verb, dictionary form',
            i18n: [
                {
                    language: 'ja',
                    name: '一段動詞、辞書形'
                }
            ],
            isDictionaryForm: false
        },
        'v1p': {
            name: 'Ichidan verb, progressive or perfect form',
            i18n: [
                {
                    language: 'ja',
                    name: '一段動詞、進行形または完了形'
                }
            ],
            isDictionaryForm: false
        },
        'v5': {
            name: 'Godan verb',
            i18n: [
                {
                    language: 'ja',
                    name: '五段動詞'
                }
            ],
            isDictionaryForm: true
        },
        'vk': {
            name: 'Kuru verb',
            i18n: [
                {
                    language: 'ja',
                    name: '来る動詞'
                }
            ],
            isDictionaryForm: true
        },
        'vs': {
            name: 'Suru verb',
            i18n: [
                {
                    language: 'ja',
                    name: 'する動詞'
                }
            ],
            isDictionaryForm: true
        },
        'vz': {
            name: 'Zuru verb',
            i18n: [
                {
                    language: 'ja',
                    name: 'ずる動詞'
                }
            ],
            isDictionaryForm: true
        },
        'adj-i': {
            name: 'Adjective with i ending',
            i18n: [
                {
                    language: 'ja',
                    name: '形容詞'
                }
            ],
            isDictionaryForm: true
        },
        '-te': {
            name: 'Intermediate -te endings for progressive or perfect tense',
            isDictionaryForm: false
        },
        'adv': {
            name: 'Intermediate -ku endings for adverbs',
            isDictionaryForm: false
        },
        'past': {
            name: '-ta past form ending',
            isDictionaryForm: false
        }
    },
    transforms: [
        {
            name: '-ba',
            description: 'Conditional',
            i18n: [
                {
                    language: 'ja',
                    name: 'ば',
                    description: '仮定形'
                }
            ],
            rules: [
                suffixInflection('ければ', 'い', [], ['adj-i']),
                suffixInflection('えば', 'う', [], ['v5']),
                suffixInflection('けば', 'く', [], ['v5']),
                suffixInflection('げば', 'ぐ', [], ['v5']),
                suffixInflection('せば', 'す', [], ['v5']),
                suffixInflection('てば', 'つ', [], ['v5']),
                suffixInflection('ねば', 'ぬ', [], ['v5']),
                suffixInflection('べば', 'ぶ', [], ['v5']),
                suffixInflection('めば', 'む', [], ['v5']),
                suffixInflection('れば', 'る', [], ['v1', 'v5', 'vk', 'vs', 'vz'])
            ]
        },
        {
            name: '-chau',
            rules: [
                suffixInflection('ちゃう', 'る', ['v5'], ['v1']),
                suffixInflection('いじゃう', 'ぐ', ['v5'], ['v5']),
                suffixInflection('いちゃう', 'く', ['v5'], ['v5']),
                suffixInflection('しちゃう', 'す', ['v5'], ['v5']),
                suffixInflection('っちゃう', 'う', ['v5'], ['v5']),
                suffixInflection('っちゃう', 'く', ['v5'], ['v5']),
                suffixInflection('っちゃう', 'つ', ['v5'], ['v5']),
                suffixInflection('っちゃう', 'る', ['v5'], ['v5']),
                suffixInflection('んじゃう', 'ぬ', ['v5'], ['v5']),
                suffixInflection('んじゃう', 'ぶ', ['v5'], ['v5']),
                suffixInflection('んじゃう', 'む', ['v5'], ['v5']),
                suffixInflection('じちゃう', 'ずる', ['v5'], ['vz']),
                suffixInflection('しちゃう', 'する', ['v5'], ['vs']),
                suffixInflection('為ちゃう', '為る', ['v5'], ['vs']),
                suffixInflection('きちゃう', 'くる', ['v5'], ['vk']),
                suffixInflection('来ちゃう', '来る', ['v5'], ['vk']),
                suffixInflection('來ちゃう', '來る', ['v5'], ['vk'])
            ]
        },
        {
            name: '-chimau',
            rules: [
                suffixInflection('ちまう', 'る', ['v5'], ['v1']),
                suffixInflection('いじまう', 'ぐ', ['v5'], ['v5']),
                suffixInflection('いちまう', 'く', ['v5'], ['v5']),
                suffixInflection('しちまう', 'す', ['v5'], ['v5']),
                suffixInflection('っちまう', 'う', ['v5'], ['v5']),
                suffixInflection('っちまう', 'く', ['v5'], ['v5']),
                suffixInflection('っちまう', 'つ', ['v5'], ['v5']),
                suffixInflection('っちまう', 'る', ['v5'], ['v5']),
                suffixInflection('んじまう', 'ぬ', ['v5'], ['v5']),
                suffixInflection('んじまう', 'ぶ', ['v5'], ['v5']),
                suffixInflection('んじまう', 'む', ['v5'], ['v5']),
                suffixInflection('じちまう', 'ずる', ['v5'], ['vz']),
                suffixInflection('しちまう', 'する', ['v5'], ['vs']),
                suffixInflection('為ちまう', '為る', ['v5'], ['vs']),
                suffixInflection('きちまう', 'くる', ['v5'], ['vk']),
                suffixInflection('来ちまう', '来る', ['v5'], ['vk']),
                suffixInflection('來ちまう', '來る', ['v5'], ['vk'])
            ]
        },
        {
            name: '-shimau',
            rules: [
                suffixInflection('てしまう', 'て', ['v5'], ['-te']),
                suffixInflection('でしまう', 'で', ['v5'], ['-te'])
            ]
        },
        {
            name: '-nasai',
            rules: [
                suffixInflection('なさい', 'る', [], ['v1']),
                suffixInflection('いなさい', 'う', [], ['v5']),
                suffixInflection('きなさい', 'く', [], ['v5']),
                suffixInflection('ぎなさい', 'ぐ', [], ['v5']),
                suffixInflection('しなさい', 'す', [], ['v5']),
                suffixInflection('ちなさい', 'つ', [], ['v5']),
                suffixInflection('になさい', 'ぬ', [], ['v5']),
                suffixInflection('びなさい', 'ぶ', [], ['v5']),
                suffixInflection('みなさい', 'む', [], ['v5']),
                suffixInflection('りなさい', 'る', [], ['v5']),
                suffixInflection('じなさい', 'ずる', [], ['vz']),
                suffixInflection('しなさい', 'する', [], ['vs']),
                suffixInflection('為なさい', '為る', [], ['vs']),
                suffixInflection('きなさい', 'くる', [], ['vk']),
                suffixInflection('来なさい', '来る', [], ['vk']),
                suffixInflection('來なさい', '來る', [], ['vk'])
            ]
        },
        {
            name: '-sou',
            rules: [
                suffixInflection('そう', 'い', [], ['adj-i']),
                suffixInflection('そう', 'る', [], ['v1']),
                suffixInflection('いそう', 'う', [], ['v5']),
                suffixInflection('きそう', 'く', [], ['v5']),
                suffixInflection('ぎそう', 'ぐ', [], ['v5']),
                suffixInflection('しそう', 'す', [], ['v5']),
                suffixInflection('ちそう', 'つ', [], ['v5']),
                suffixInflection('にそう', 'ぬ', [], ['v5']),
                suffixInflection('びそう', 'ぶ', [], ['v5']),
                suffixInflection('みそう', 'む', [], ['v5']),
                suffixInflection('りそう', 'る', [], ['v5']),
                suffixInflection('じそう', 'ずる', [], ['vz']),
                suffixInflection('しそう', 'する', [], ['vs']),
                suffixInflection('為そう', '為る', [], ['vs']),
                suffixInflection('きそう', 'くる', [], ['vk']),
                suffixInflection('来そう', '来る', [], ['vk']),
                suffixInflection('來そう', '來る', [], ['vk'])
            ]
        },
        {
            name: '-sugiru',
            rules: [
                suffixInflection('すぎる', 'い', ['v1'], ['adj-i']),
                suffixInflection('すぎる', 'る', ['v1'], ['v1']),
                suffixInflection('いすぎる', 'う', ['v1'], ['v5']),
                suffixInflection('きすぎる', 'く', ['v1'], ['v5']),
                suffixInflection('ぎすぎる', 'ぐ', ['v1'], ['v5']),
                suffixInflection('しすぎる', 'す', ['v1'], ['v5']),
                suffixInflection('ちすぎる', 'つ', ['v1'], ['v5']),
                suffixInflection('にすぎる', 'ぬ', ['v1'], ['v5']),
                suffixInflection('びすぎる', 'ぶ', ['v1'], ['v5']),
                suffixInflection('みすぎる', 'む', ['v1'], ['v5']),
                suffixInflection('りすぎる', 'る', ['v1'], ['v5']),
                suffixInflection('じすぎる', 'ずる', ['v1'], ['vz']),
                suffixInflection('しすぎる', 'する', ['v1'], ['vs']),
                suffixInflection('為すぎる', '為る', ['v1'], ['vs']),
                suffixInflection('きすぎる', 'くる', ['v1'], ['vk']),
                suffixInflection('来すぎる', '来る', ['v1'], ['vk']),
                suffixInflection('來すぎる', '來る', ['v1'], ['vk'])
            ]
        },
        {
            name: '-tai',
            rules: [
                suffixInflection('たい', 'る', ['adj-i'], ['v1']),
                suffixInflection('いたい', 'う', ['adj-i'], ['v5']),
                suffixInflection('きたい', 'く', ['adj-i'], ['v5']),
                suffixInflection('ぎたい', 'ぐ', ['adj-i'], ['v5']),
                suffixInflection('したい', 'す', ['adj-i'], ['v5']),
                suffixInflection('ちたい', 'つ', ['adj-i'], ['v5']),
                suffixInflection('にたい', 'ぬ', ['adj-i'], ['v5']),
                suffixInflection('びたい', 'ぶ', ['adj-i'], ['v5']),
                suffixInflection('みたい', 'む', ['adj-i'], ['v5']),
                suffixInflection('りたい', 'る', ['adj-i'], ['v5']),
                suffixInflection('じたい', 'ずる', ['adj-i'], ['vz']),
                suffixInflection('したい', 'する', ['adj-i'], ['vs']),
                suffixInflection('為たい', '為る', ['adj-i'], ['vs']),
                suffixInflection('きたい', 'くる', ['adj-i'], ['vk']),
                suffixInflection('来たい', '来る', ['adj-i'], ['vk']),
                suffixInflection('來たい', '來る', ['adj-i'], ['vk'])
            ]
        },
        {
            name: '-tara',
            rules: [
                suffixInflection('かったら', 'い', [], ['adj-i']),
                suffixInflection('たら', 'る', [], ['v1']),
                suffixInflection('いたら', 'く', [], ['v5']),
                suffixInflection('いだら', 'ぐ', [], ['v5']),
                suffixInflection('したら', 'す', [], ['v5']),
                suffixInflection('ったら', 'う', [], ['v5']),
                suffixInflection('ったら', 'つ', [], ['v5']),
                suffixInflection('ったら', 'る', [], ['v5']),
                suffixInflection('んだら', 'ぬ', [], ['v5']),
                suffixInflection('んだら', 'ぶ', [], ['v5']),
                suffixInflection('んだら', 'む', [], ['v5']),
                suffixInflection('じたら', 'ずる', [], ['vz']),
                suffixInflection('したら', 'する', [], ['vs']),
                suffixInflection('為たら', '為る', [], ['vs']),
                suffixInflection('きたら', 'くる', [], ['vk']),
                suffixInflection('来たら', '来る', [], ['vk']),
                suffixInflection('來たら', '來る', [], ['vk']),
                suffixInflection('いったら', 'いく', [], ['v5']),
                suffixInflection('おうたら', 'おう', [], ['v5']),
                suffixInflection('こうたら', 'こう', [], ['v5']),
                suffixInflection('そうたら', 'そう', [], ['v5']),
                suffixInflection('とうたら', 'とう', [], ['v5']),
                suffixInflection('行ったら', '行く', [], ['v5']),
                suffixInflection('逝ったら', '逝く', [], ['v5']),
                suffixInflection('往ったら', '往く', [], ['v5']),
                suffixInflection('請うたら', '請う', [], ['v5']),
                suffixInflection('乞うたら', '乞う', [], ['v5']),
                suffixInflection('恋うたら', '恋う', [], ['v5']),
                suffixInflection('問うたら', '問う', [], ['v5']),
                suffixInflection('負うたら', '負う', [], ['v5']),
                suffixInflection('沿うたら', '沿う', [], ['v5']),
                suffixInflection('添うたら', '添う', [], ['v5']),
                suffixInflection('副うたら', '副う', [], ['v5']),
                suffixInflection('厭うたら', '厭う', [], ['v5']),
                suffixInflection('のたもうたら', 'のたまう', [], ['v5'])
            ]
        },
        {
            name: '-tari',
            rules: [
                suffixInflection('かったり', 'い', [], ['adj-i']),
                suffixInflection('たり', 'る', [], ['v1']),
                suffixInflection('いたり', 'く', [], ['v5']),
                suffixInflection('いだり', 'ぐ', [], ['v5']),
                suffixInflection('したり', 'す', [], ['v5']),
                suffixInflection('ったり', 'う', [], ['v5']),
                suffixInflection('ったり', 'つ', [], ['v5']),
                suffixInflection('ったり', 'る', [], ['v5']),
                suffixInflection('んだり', 'ぬ', [], ['v5']),
                suffixInflection('んだり', 'ぶ', [], ['v5']),
                suffixInflection('んだり', 'む', [], ['v5']),
                suffixInflection('じたり', 'ずる', [], ['vz']),
                suffixInflection('したり', 'する', [], ['vs']),
                suffixInflection('為たり', '為る', [], ['vs']),
                suffixInflection('きたり', 'くる', [], ['vk']),
                suffixInflection('来たり', '来る', [], ['vk']),
                suffixInflection('來たり', '來る', [], ['vk']),
                suffixInflection('いったり', 'いく', [], ['v5']),
                suffixInflection('おうたり', 'おう', [], ['v5']),
                suffixInflection('こうたり', 'こう', [], ['v5']),
                suffixInflection('そうたり', 'そう', [], ['v5']),
                suffixInflection('とうたり', 'とう', [], ['v5']),
                suffixInflection('行ったり', '行く', [], ['v5']),
                suffixInflection('逝ったり', '逝く', [], ['v5']),
                suffixInflection('往ったり', '往く', [], ['v5']),
                suffixInflection('請うたり', '請う', [], ['v5']),
                suffixInflection('乞うたり', '乞う', [], ['v5']),
                suffixInflection('恋うたり', '恋う', [], ['v5']),
                suffixInflection('問うたり', '問う', [], ['v5']),
                suffixInflection('負うたり', '負う', [], ['v5']),
                suffixInflection('沿うたり', '沿う', [], ['v5']),
                suffixInflection('添うたり', '添う', [], ['v5']),
                suffixInflection('副うたり', '副う', [], ['v5']),
                suffixInflection('厭うたり', '厭う', [], ['v5']),
                suffixInflection('のたもうたり', 'のたまう', [], ['v5'])
            ]
        },
        {
            name: '-te',
            rules: [
                suffixInflection('くて', 'い', ['-te'], ['adj-i']),
                suffixInflection('て', 'る', ['-te'], ['v1']),
                suffixInflection('いて', 'く', ['-te'], ['v5']),
                suffixInflection('いで', 'ぐ', ['-te'], ['v5']),
                suffixInflection('して', 'す', ['-te'], ['v5']),
                suffixInflection('って', 'う', ['-te'], ['v5']),
                suffixInflection('って', 'つ', ['-te'], ['v5']),
                suffixInflection('って', 'る', ['-te'], ['v5']),
                suffixInflection('んで', 'ぬ', ['-te'], ['v5']),
                suffixInflection('んで', 'ぶ', ['-te'], ['v5']),
                suffixInflection('んで', 'む', ['-te'], ['v5']),
                suffixInflection('じて', 'ずる', ['-te'], ['vz']),
                suffixInflection('して', 'する', ['-te'], ['vs']),
                suffixInflection('為て', '為る', ['-te'], ['vs']),
                suffixInflection('きて', 'くる', ['-te'], ['vk']),
                suffixInflection('来て', '来る', ['-te'], ['vk']),
                suffixInflection('來て', '來る', ['-te'], ['vk']),
                suffixInflection('いって', 'いく', ['-te'], ['v5']),
                suffixInflection('おうて', 'おう', ['-te'], ['v5']),
                suffixInflection('こうて', 'こう', ['-te'], ['v5']),
                suffixInflection('そうて', 'そう', ['-te'], ['v5']),
                suffixInflection('とうて', 'とう', ['-te'], ['v5']),
                suffixInflection('行って', '行く', ['-te'], ['v5']),
                suffixInflection('逝って', '逝く', ['-te'], ['v5']),
                suffixInflection('往って', '往く', ['-te'], ['v5']),
                suffixInflection('請うて', '請う', ['-te'], ['v5']),
                suffixInflection('乞うて', '乞う', ['-te'], ['v5']),
                suffixInflection('恋うて', '恋う', ['-te'], ['v5']),
                suffixInflection('問うて', '問う', ['-te'], ['v5']),
                suffixInflection('負うて', '負う', ['-te'], ['v5']),
                suffixInflection('沿うて', '沿う', ['-te'], ['v5']),
                suffixInflection('添うて', '添う', ['-te'], ['v5']),
                suffixInflection('副うて', '副う', ['-te'], ['v5']),
                suffixInflection('厭うて', '厭う', ['-te'], ['v5']),
                suffixInflection('のたもうて', 'のたまう', ['-te'], ['v5']),
                suffixInflection('まして', 'ます', [], ['v'])
            ]
        },
        {
            name: '-zu',
            rules: [
                suffixInflection('ず', 'る', [], ['v1']),
                suffixInflection('かず', 'く', [], ['v5']),
                suffixInflection('がず', 'ぐ', [], ['v5']),
                suffixInflection('さず', 'す', [], ['v5']),
                suffixInflection('たず', 'つ', [], ['v5']),
                suffixInflection('なず', 'ぬ', [], ['v5']),
                suffixInflection('ばず', 'ぶ', [], ['v5']),
                suffixInflection('まず', 'む', [], ['v5']),
                suffixInflection('らず', 'る', [], ['v5']),
                suffixInflection('わず', 'う', [], ['v5']),
                suffixInflection('ぜず', 'ずる', [], ['vz']),
                suffixInflection('せず', 'する', [], ['vs']),
                suffixInflection('為ず', '為る', [], ['vs']),
                suffixInflection('こず', 'くる', [], ['vk']),
                suffixInflection('来ず', '来る', [], ['vk']),
                suffixInflection('來ず', '來る', [], ['vk'])
            ]
        },
        {
            name: '-nu',
            rules: [
                suffixInflection('ぬ', 'る', [], ['v1']),
                suffixInflection('かぬ', 'く', [], ['v5']),
                suffixInflection('がぬ', 'ぐ', [], ['v5']),
                suffixInflection('さぬ', 'す', [], ['v5']),
                suffixInflection('たぬ', 'つ', [], ['v5']),
                suffixInflection('なぬ', 'ぬ', [], ['v5']),
                suffixInflection('ばぬ', 'ぶ', [], ['v5']),
                suffixInflection('まぬ', 'む', [], ['v5']),
                suffixInflection('らぬ', 'る', [], ['v5']),
                suffixInflection('わぬ', 'う', [], ['v5']),
                suffixInflection('ぜぬ', 'ずる', [], ['vz']),
                suffixInflection('せぬ', 'する', [], ['vs']),
                suffixInflection('為ぬ', '為る', [], ['vs']),
                suffixInflection('こぬ', 'くる', [], ['vk']),
                suffixInflection('来ぬ', '来る', [], ['vk']),
                suffixInflection('來ぬ', '來る', [], ['vk'])
            ]
        },
        {
            name: '-mu',
            rules: [
                suffixInflection('む', 'る', [], ['v1']),
                suffixInflection('かむ', 'く', [], ['v5']),
                suffixInflection('がむ', 'ぐ', [], ['v5']),
                suffixInflection('さむ', 'す', [], ['v5']),
                suffixInflection('たむ', 'つ', [], ['v5']),
                suffixInflection('なむ', 'ぬ', [], ['v5']),
                suffixInflection('ばむ', 'ぶ', [], ['v5']),
                suffixInflection('まむ', 'む', [], ['v5']),
                suffixInflection('らむ', 'る', [], ['v5']),
                suffixInflection('わむ', 'う', [], ['v5']),
                suffixInflection('ぜむ', 'ずる', [], ['vz']),
                suffixInflection('せむ', 'する', [], ['vs']),
                suffixInflection('為む', '為る', [], ['vs']),
                suffixInflection('こむ', 'くる', [], ['vk']),
                suffixInflection('来む', '来る', [], ['vk']),
                suffixInflection('來む', '來る', [], ['vk'])
            ]
        },
        {
            name: '-zaru',
            rules: [
                suffixInflection('ざる', 'る', [], ['v1']),
                suffixInflection('かざる', 'く', [], ['v5']),
                suffixInflection('がざる', 'ぐ', [], ['v5']),
                suffixInflection('さざる', 'す', [], ['v5']),
                suffixInflection('たざる', 'つ', [], ['v5']),
                suffixInflection('なざる', 'ぬ', [], ['v5']),
                suffixInflection('ばざる', 'ぶ', [], ['v5']),
                suffixInflection('まざる', 'む', [], ['v5']),
                suffixInflection('らざる', 'る', [], ['v5']),
                suffixInflection('わざる', 'う', [], ['v5']),
                suffixInflection('ぜざる', 'ずる', [], ['vz']),
                suffixInflection('せざる', 'する', [], ['vs']),
                suffixInflection('為ざる', '為る', [], ['vs']),
                suffixInflection('こざる', 'くる', [], ['vk']),
                suffixInflection('来ざる', '来る', [], ['vk']),
                suffixInflection('來ざる', '來る', [], ['vk'])
            ]
        },
        {
            name: '-neba',
            rules: [
                suffixInflection('ねば', 'る', [], ['v1']),
                suffixInflection('かねば', 'く', [], ['v5']),
                suffixInflection('がねば', 'ぐ', [], ['v5']),
                suffixInflection('さねば', 'す', [], ['v5']),
                suffixInflection('たねば', 'つ', [], ['v5']),
                suffixInflection('なねば', 'ぬ', [], ['v5']),
                suffixInflection('ばねば', 'ぶ', [], ['v5']),
                suffixInflection('まねば', 'む', [], ['v5']),
                suffixInflection('らねば', 'る', [], ['v5']),
                suffixInflection('わねば', 'う', [], ['v5']),
                suffixInflection('ぜねば', 'ずる', [], ['vz']),
                suffixInflection('せねば', 'する', [], ['vs']),
                suffixInflection('為ねば', '為る', [], ['vs']),
                suffixInflection('こねば', 'くる', [], ['vk']),
                suffixInflection('来ねば', '来る', [], ['vk']),
                suffixInflection('來ねば', '來る', [], ['vk'])
            ]
        },
        {
            name: 'adv',
            rules: [
                suffixInflection('く', 'い', ['adv'], ['adj-i'])
            ]
        },
        {
            name: 'causative',
            rules: [
                suffixInflection('させる', 'る', ['v1'], ['v1']),
                suffixInflection('かせる', 'く', ['v1'], ['v5']),
                suffixInflection('がせる', 'ぐ', ['v1'], ['v5']),
                suffixInflection('させる', 'す', ['v1'], ['v5']),
                suffixInflection('たせる', 'つ', ['v1'], ['v5']),
                suffixInflection('なせる', 'ぬ', ['v1'], ['v5']),
                suffixInflection('ばせる', 'ぶ', ['v1'], ['v5']),
                suffixInflection('ませる', 'む', ['v1'], ['v5']),
                suffixInflection('らせる', 'る', ['v1'], ['v5']),
                suffixInflection('わせる', 'う', ['v1'], ['v5']),
                suffixInflection('じさせる', 'ずる', ['v1'], ['vz']),
                suffixInflection('ぜさせる', 'ずる', ['v1'], ['vz']),
                suffixInflection('させる', 'する', ['v1'], ['vs']),
                suffixInflection('為せる', '為る', ['v1'], ['vs']),
                suffixInflection('せさせる', 'する', ['v1'], ['vs']),
                suffixInflection('為させる', '為る', ['v1'], ['vs']),
                suffixInflection('こさせる', 'くる', ['v1'], ['vk']),
                suffixInflection('来させる', '来る', ['v1'], ['vk']),
                suffixInflection('來させる', '來る', ['v1'], ['vk'])
            ]
        },
        {
            name: 'imperative',
            rules: [
                suffixInflection('ろ', 'る', [], ['v1']),
                suffixInflection('よ', 'る', [], ['v1']),
                suffixInflection('え', 'う', [], ['v5']),
                suffixInflection('け', 'く', [], ['v5']),
                suffixInflection('げ', 'ぐ', [], ['v5']),
                suffixInflection('せ', 'す', [], ['v5']),
                suffixInflection('て', 'つ', [], ['v5']),
                suffixInflection('ね', 'ぬ', [], ['v5']),
                suffixInflection('べ', 'ぶ', [], ['v5']),
                suffixInflection('め', 'む', [], ['v5']),
                suffixInflection('れ', 'る', [], ['v5']),
                suffixInflection('じろ', 'ずる', [], ['vz']),
                suffixInflection('ぜよ', 'ずる', [], ['vz']),
                suffixInflection('しろ', 'する', [], ['vs']),
                suffixInflection('せよ', 'する', [], ['vs']),
                suffixInflection('為ろ', '為る', [], ['vs']),
                suffixInflection('為よ', '為る', [], ['vs']),
                suffixInflection('こい', 'くる', [], ['vk']),
                suffixInflection('来い', '来る', [], ['vk']),
                suffixInflection('來い', '來る', [], ['vk'])
            ]
        },
        {
            name: 'imperative negative',
            rules: [
                suffixInflection('な', '', [], ['v'])
            ]
        },
        {
            name: 'masu stem',
            rules: [
                suffixInflection('い', 'いる', [], ['v1d']),
                suffixInflection('え', 'える', [], ['v1d']),
                suffixInflection('き', 'きる', [], ['v1d']),
                suffixInflection('ぎ', 'ぎる', [], ['v1d']),
                suffixInflection('け', 'ける', [], ['v1d']),
                suffixInflection('げ', 'げる', [], ['v1d']),
                suffixInflection('じ', 'じる', [], ['v1d']),
                suffixInflection('せ', 'せる', [], ['v1d']),
                suffixInflection('ぜ', 'ぜる', [], ['v1d']),
                suffixInflection('ち', 'ちる', [], ['v1d']),
                suffixInflection('て', 'てる', [], ['v1d']),
                suffixInflection('で', 'でる', [], ['v1d']),
                suffixInflection('に', 'にる', [], ['v1d']),
                suffixInflection('ね', 'ねる', [], ['v1d']),
                suffixInflection('ひ', 'ひる', [], ['v1d']),
                suffixInflection('び', 'びる', [], ['v1d']),
                suffixInflection('へ', 'へる', [], ['v1d']),
                suffixInflection('べ', 'べる', [], ['v1d']),
                suffixInflection('み', 'みる', [], ['v1d']),
                suffixInflection('め', 'める', [], ['v1d']),
                suffixInflection('り', 'りる', [], ['v1d']),
                suffixInflection('れ', 'れる', [], ['v1d']),
                suffixInflection('い', 'う', [], ['v5']),
                suffixInflection('き', 'く', [], ['v5']),
                suffixInflection('ぎ', 'ぐ', [], ['v5']),
                suffixInflection('し', 'す', [], ['v5']),
                suffixInflection('ち', 'つ', [], ['v5']),
                suffixInflection('に', 'ぬ', [], ['v5']),
                suffixInflection('び', 'ぶ', [], ['v5']),
                suffixInflection('み', 'む', [], ['v5']),
                suffixInflection('り', 'る', [], ['v5']),
                suffixInflection('き', 'くる', [], ['vk']),
                suffixInflection('し', 'する', [], ['vs']),
                suffixInflection('来', '来る', [], ['vk']),
                suffixInflection('來', '來る', [], ['vk'])
            ]
        },
        {
            name: 'negative',
            rules: [
                suffixInflection('くない', 'い', ['adj-i'], ['adj-i']),
                suffixInflection('ない', 'る', ['adj-i'], ['v1']),
                suffixInflection('かない', 'く', ['adj-i'], ['v5']),
                suffixInflection('がない', 'ぐ', ['adj-i'], ['v5']),
                suffixInflection('さない', 'す', ['adj-i'], ['v5']),
                suffixInflection('たない', 'つ', ['adj-i'], ['v5']),
                suffixInflection('なない', 'ぬ', ['adj-i'], ['v5']),
                suffixInflection('ばない', 'ぶ', ['adj-i'], ['v5']),
                suffixInflection('まない', 'む', ['adj-i'], ['v5']),
                suffixInflection('らない', 'る', ['adj-i'], ['v5']),
                suffixInflection('わない', 'う', ['adj-i'], ['v5']),
                suffixInflection('じない', 'ずる', ['adj-i'], ['vz']),
                suffixInflection('しない', 'する', ['adj-i'], ['vs']),
                suffixInflection('為ない', '為る', ['adj-i'], ['vs']),
                suffixInflection('こない', 'くる', ['adj-i'], ['vk']),
                suffixInflection('来ない', '来る', ['adj-i'], ['vk']),
                suffixInflection('來ない', '來る', ['adj-i'], ['vk']),
                suffixInflection('ません', 'ます', ['v'], ['v'])
            ]
        },
        {
            name: 'noun',
            rules: [
                suffixInflection('さ', 'い', [], ['adj-i'])
            ]
        },
        {
            name: 'passive',
            rules: [
                suffixInflection('かれる', 'く', ['v1'], ['v5']),
                suffixInflection('がれる', 'ぐ', ['v1'], ['v5']),
                suffixInflection('される', 'す', ['v1'], ['v5']),
                suffixInflection('たれる', 'つ', ['v1'], ['v5']),
                suffixInflection('なれる', 'ぬ', ['v1'], ['v5']),
                suffixInflection('ばれる', 'ぶ', ['v1'], ['v5']),
                suffixInflection('まれる', 'む', ['v1'], ['v5']),
                suffixInflection('われる', 'う', ['v1'], ['v5']),
                suffixInflection('られる', 'る', ['v1'], ['v5']),
                suffixInflection('じされる', 'ずる', ['v1'], ['vz']),
                suffixInflection('ぜされる', 'ずる', ['v1'], ['vz']),
                suffixInflection('される', 'する', ['v1'], ['vs']),
                suffixInflection('為れる', '為る', ['v1'], ['vs']),
                suffixInflection('こられる', 'くる', ['v1'], ['vk']),
                suffixInflection('来られる', '来る', ['v1'], ['vk']),
                suffixInflection('來られる', '來る', ['v1'], ['vk'])
            ]
        },
        {
            name: 'past',
            rules: [
                suffixInflection('かった', 'い', ['past'], ['adj-i']),
                suffixInflection('た', 'る', ['past'], ['v1']),
                suffixInflection('いた', 'く', ['past'], ['v5']),
                suffixInflection('いだ', 'ぐ', ['past'], ['v5']),
                suffixInflection('した', 'す', ['past'], ['v5']),
                suffixInflection('った', 'う', ['past'], ['v5']),
                suffixInflection('った', 'つ', ['past'], ['v5']),
                suffixInflection('った', 'る', ['past'], ['v5']),
                suffixInflection('んだ', 'ぬ', ['past'], ['v5']),
                suffixInflection('んだ', 'ぶ', ['past'], ['v5']),
                suffixInflection('んだ', 'む', ['past'], ['v5']),
                suffixInflection('じた', 'ずる', ['past'], ['vz']),
                suffixInflection('した', 'する', ['past'], ['vs']),
                suffixInflection('為た', '為る', ['past'], ['vs']),
                suffixInflection('きた', 'くる', ['past'], ['vk']),
                suffixInflection('来た', '来る', ['past'], ['vk']),
                suffixInflection('來た', '來る', ['past'], ['vk']),
                suffixInflection('いった', 'いく', ['past'], ['v5']),
                suffixInflection('おうた', 'おう', ['past'], ['v5']),
                suffixInflection('こうた', 'こう', ['past'], ['v5']),
                suffixInflection('そうた', 'そう', ['past'], ['v5']),
                suffixInflection('とうた', 'とう', ['past'], ['v5']),
                suffixInflection('行った', '行く', ['past'], ['v5']),
                suffixInflection('逝った', '逝く', ['past'], ['v5']),
                suffixInflection('往った', '往く', ['past'], ['v5']),
                suffixInflection('請うた', '請う', ['past'], ['v5']),
                suffixInflection('乞うた', '乞う', ['past'], ['v5']),
                suffixInflection('恋うた', '恋う', ['past'], ['v5']),
                suffixInflection('問うた', '問う', ['past'], ['v5']),
                suffixInflection('負うた', '負う', ['past'], ['v5']),
                suffixInflection('沿うた', '沿う', ['past'], ['v5']),
                suffixInflection('添うた', '添う', ['past'], ['v5']),
                suffixInflection('副うた', '副う', ['past'], ['v5']),
                suffixInflection('厭うた', '厭う', ['past'], ['v5']),
                suffixInflection('のたもうた', 'のたまう', ['past'], ['v5']),
                suffixInflection('ました', 'ます', ['past'], ['v']),
                suffixInflection('ませんでした', 'ません', ['past'], ['v'])
            ]
        },
        {
            name: 'polite',
            rules: [
                suffixInflection('ます', 'る', ['v1'], ['v1']),
                suffixInflection('います', 'う', ['v5'], ['v5']),
                suffixInflection('きます', 'く', ['v5'], ['v5']),
                suffixInflection('ぎます', 'ぐ', ['v5'], ['v5']),
                suffixInflection('します', 'す', ['v5'], ['v5']),
                suffixInflection('ちます', 'つ', ['v5'], ['v5']),
                suffixInflection('にます', 'ぬ', ['v5'], ['v5']),
                suffixInflection('びます', 'ぶ', ['v5'], ['v5']),
                suffixInflection('みます', 'む', ['v5'], ['v5']),
                suffixInflection('ります', 'る', ['v5'], ['v5']),
                suffixInflection('じます', 'ずる', ['vz'], ['vz']),
                suffixInflection('します', 'する', ['vs'], ['vs']),
                suffixInflection('為ます', '為る', ['vs'], ['vs']),
                suffixInflection('きます', 'くる', ['vk'], ['vk']),
                suffixInflection('来ます', '来る', ['vk'], ['vk']),
                suffixInflection('來ます', '來る', ['vk'], ['vk']),
                suffixInflection('くあります', 'い', ['v'], ['adj-i'])
            ]
        },
        {
            name: 'potential',
            rules: [
                suffixInflection('れる', 'る', ['v1'], ['v1', 'v5']),
                suffixInflection('える', 'う', ['v1'], ['v5']),
                suffixInflection('ける', 'く', ['v1'], ['v5']),
                suffixInflection('げる', 'ぐ', ['v1'], ['v5']),
                suffixInflection('せる', 'す', ['v1'], ['v5']),
                suffixInflection('てる', 'つ', ['v1'], ['v5']),
                suffixInflection('ねる', 'ぬ', ['v1'], ['v5']),
                suffixInflection('べる', 'ぶ', ['v1'], ['v5']),
                suffixInflection('める', 'む', ['v1'], ['v5']),
                suffixInflection('できる', 'する', ['v1'], ['vs']),
                suffixInflection('出来る', 'する', ['v1'], ['vs']),
                suffixInflection('これる', 'くる', ['v1'], ['vk']),
                suffixInflection('来れる', '来る', ['v1'], ['vk']),
                suffixInflection('來れる', '來る', ['v1'], ['vk'])
            ]
        },
        {
            name: 'potential or passive',
            rules: [
                suffixInflection('られる', 'る', ['v1'], ['v1']),
                suffixInflection('ざれる', 'ずる', ['v1'], ['vz']),
                suffixInflection('ぜられる', 'ずる', ['v1'], ['vz']),
                suffixInflection('せられる', 'する', ['v1'], ['vs']),
                suffixInflection('為られる', '為る', ['v1'], ['vs']),
                suffixInflection('こられる', 'くる', ['v1'], ['vk']),
                suffixInflection('来られる', '来る', ['v1'], ['vk']),
                suffixInflection('來られる', '來る', ['v1'], ['vk'])
            ]
        },
        {
            name: 'volitional',
            rules: [
                suffixInflection('よう', 'る', [], ['v1']),
                suffixInflection('おう', 'う', [], ['v5']),
                suffixInflection('こう', 'く', [], ['v5']),
                suffixInflection('ごう', 'ぐ', [], ['v5']),
                suffixInflection('そう', 'す', [], ['v5']),
                suffixInflection('とう', 'つ', [], ['v5']),
                suffixInflection('のう', 'ぬ', [], ['v5']),
                suffixInflection('ぼう', 'ぶ', [], ['v5']),
                suffixInflection('もう', 'む', [], ['v5']),
                suffixInflection('ろう', 'る', [], ['v5']),
                suffixInflection('じよう', 'ずる', [], ['vz']),
                suffixInflection('しよう', 'する', [], ['vs']),
                suffixInflection('為よう', '為る', [], ['vs']),
                suffixInflection('こよう', 'くる', [], ['vk']),
                suffixInflection('来よう', '来る', [], ['vk']),
                suffixInflection('來よう', '來る', [], ['vk']),
                suffixInflection('ましょう', 'ます', [], ['v'])
            ]
        },
        {
            name: 'causative passive',
            rules: [
                suffixInflection('かされる', 'く', ['v1'], ['v5']),
                suffixInflection('がされる', 'ぐ', ['v1'], ['v5']),
                suffixInflection('たされる', 'つ', ['v1'], ['v5']),
                suffixInflection('なされる', 'ぬ', ['v1'], ['v5']),
                suffixInflection('ばされる', 'ぶ', ['v1'], ['v5']),
                suffixInflection('まされる', 'む', ['v1'], ['v5']),
                suffixInflection('らされる', 'る', ['v1'], ['v5']),
                suffixInflection('わされる', 'う', ['v1'], ['v5'])
            ]
        },
        {
            name: '-toku',
            rules: [
                suffixInflection('とく', 'る', ['v5'], ['v1']),
                suffixInflection('いとく', 'く', ['v5'], ['v5']),
                suffixInflection('いどく', 'ぐ', ['v5'], ['v5']),
                suffixInflection('しとく', 'す', ['v5'], ['v5']),
                suffixInflection('っとく', 'う', ['v5'], ['v5']),
                suffixInflection('っとく', 'つ', ['v5'], ['v5']),
                suffixInflection('っとく', 'る', ['v5'], ['v5']),
                suffixInflection('んどく', 'ぬ', ['v5'], ['v5']),
                suffixInflection('んどく', 'ぶ', ['v5'], ['v5']),
                suffixInflection('んどく', 'む', ['v5'], ['v5']),
                suffixInflection('じとく', 'ずる', ['v5'], ['vz']),
                suffixInflection('しとく', 'する', ['v5'], ['vs']),
                suffixInflection('為とく', '為る', ['v5'], ['vs']),
                suffixInflection('きとく', 'くる', ['v5'], ['vk']),
                suffixInflection('来とく', '来る', ['v5'], ['vk']),
                suffixInflection('來とく', '來る', ['v5'], ['vk'])
            ]
        },
        {
            name: 'progressive or perfect',
            rules: [
                suffixInflection('ている', 'て', ['v1'], ['-te']),
                suffixInflection('ておる', 'て', ['v5'], ['-te']),
                suffixInflection('てる', 'て', ['v1p'], ['-te']),
                suffixInflection('でいる', 'で', ['v1'], ['-te']),
                suffixInflection('でおる', 'で', ['v5'], ['-te']),
                suffixInflection('でる', 'で', ['v1p'], ['-te']),
                suffixInflection('とる', 'て', ['v5'], ['-te']),
                suffixInflection('ないでいる', 'ない', ['v1'], ['adj-i'])
            ]
        },
        {
            name: '-ki',
            rules: [
                suffixInflection('き', 'い', [], ['adj-i'])
            ]
        },
        {
            name: '-ge',
            rules: [
                suffixInflection('しげ', 'しい', [], ['adj-i'])
            ]
        },
        {
            name: '-e',
            rules: [
                suffixInflection('ねえ', 'ない', [], ['adj-i']),
                suffixInflection('めえ', 'むい', [], ['adj-i']),
                suffixInflection('みい', 'むい', [], ['adj-i']),
                suffixInflection('ちぇえ', 'つい', [], ['adj-i']),
                suffixInflection('ちい', 'つい', [], ['adj-i']),
                suffixInflection('せえ', 'すい', [], ['adj-i']),
                suffixInflection('ええ', 'いい', [], ['adj-i']),
                suffixInflection('ええ', 'わい', [], ['adj-i']),
                suffixInflection('ええ', 'よい', [], ['adj-i']),
                suffixInflection('いぇえ', 'よい', [], ['adj-i']),
                suffixInflection('うぇえ', 'わい', [], ['adj-i']),
                suffixInflection('けえ', 'かい', [], ['adj-i']),
                suffixInflection('げえ', 'がい', [], ['adj-i']),
                suffixInflection('げえ', 'ごい', [], ['adj-i']),
                suffixInflection('せえ', 'さい', [], ['adj-i']),
                suffixInflection('めえ', 'まい', [], ['adj-i']),
                suffixInflection('ぜえ', 'ずい', [], ['adj-i']),
                suffixInflection('っぜえ', 'ずい', [], ['adj-i']),
                suffixInflection('れえ', 'らい', [], ['adj-i']),
                suffixInflection('れえ', 'らい', [], ['adj-i']),
                suffixInflection('ちぇえ', 'ちゃい', [], ['adj-i']),
                suffixInflection('でえ', 'どい', [], ['adj-i']),
                suffixInflection('れえ', 'れい', [], ['adj-i']),
                suffixInflection('べえ', 'ばい', [], ['adj-i']),
                suffixInflection('てえ', 'たい', [], ['adj-i']),
                suffixInflection('ねぇ', 'ない', [], ['adj-i']),
                suffixInflection('めぇ', 'むい', [], ['adj-i']),
                suffixInflection('みぃ', 'むい', [], ['adj-i']),
                suffixInflection('ちぃ', 'つい', [], ['adj-i']),
                suffixInflection('せぇ', 'すい', [], ['adj-i']),
                suffixInflection('けぇ', 'かい', [], ['adj-i']),
                suffixInflection('げぇ', 'がい', [], ['adj-i']),
                suffixInflection('げぇ', 'ごい', [], ['adj-i']),
                suffixInflection('せぇ', 'さい', [], ['adj-i']),
                suffixInflection('めぇ', 'まい', [], ['adj-i']),
                suffixInflection('ぜぇ', 'ずい', [], ['adj-i']),
                suffixInflection('っぜぇ', 'ずい', [], ['adj-i']),
                suffixInflection('れぇ', 'らい', [], ['adj-i']),
                suffixInflection('でぇ', 'どい', [], ['adj-i']),
                suffixInflection('れぇ', 'れい', [], ['adj-i']),
                suffixInflection('べぇ', 'ばい', [], ['adj-i']),
                suffixInflection('てぇ', 'たい', [], ['adj-i'])
            ]
        },
        {
            name: 'slang',
            rules: [
                suffixInflection('てぇてぇ', 'とうとい', [], ['adj-i']),
                suffixInflection('てぇてぇ', '尊い', [], ['adj-i']),
                suffixInflection('おなしゃす', 'おねがいします', [], ['v5']),
                suffixInflection('おなしゃす', 'お願いします', [], ['v5']),
                suffixInflection('あざす', 'ありがとうございます', [], ['v5']),
                suffixInflection('さーせん', 'すみません', [], ['v5']),
                suffixInflection('神ってる', '神がかっている', [], ['v1p']),
                suffixInflection('じわる', 'じわじわ来る', [], ['vk']),
                suffixInflection('おさしみ', 'おやすみ', [], []),
                suffixInflection('おやさい', 'おやすみ', [], [])
            ]
        },
        {
            name: 'kansai-ben',
            description: 'Negative form of kansai-ben verbs',
            rules: [
                suffixInflection('へん', 'ない', [], ['adj-i']),
                suffixInflection('ひん', 'ない', [], ['adj-i']),
                suffixInflection('せえへん', 'しない', [], ['adj-i']),
                suffixInflection('へんかった', 'なかった', ['past'], ['past']),
                suffixInflection('ひんかった', 'なかった', ['past'], ['past']),
                suffixInflection('うてへん', 'ってない', [], ['adj-i'])
            ]
        },
        {
            name: 'kansai-ben',
            description: '-te form of kansai-ben verbs',
            rules: [
                suffixInflection('うて', 'って', ['-te'], ['-te']),
                suffixInflection('おうて', 'あって', ['-te'], ['-te']),
                suffixInflection('こうて', 'かって', ['-te'], ['-te']),
                suffixInflection('ごうて', 'がって', ['-te'], ['-te']),
                suffixInflection('そうて', 'さって', ['-te'], ['-te']),
                suffixInflection('ぞうて', 'ざって', ['-te'], ['-te']),
                suffixInflection('とうて', 'たって', ['-te'], ['-te']),
                suffixInflection('どうて', 'だって', ['-te'], ['-te']),
                suffixInflection('のうて', 'なって', ['-te'], ['-te']),
                suffixInflection('ほうて', 'はって', ['-te'], ['-te']),
                suffixInflection('ぼうて', 'ばって', ['-te'], ['-te']),
                suffixInflection('もうて', 'まって', ['-te'], ['-te']),
                suffixInflection('ろうて', 'らって', ['-te'], ['-te']),
                suffixInflection('ようて', 'やって', ['-te'], ['-te']),
                suffixInflection('ゆうて', 'いって', ['-te'], ['-te'])
            ]
        },
        {
            name: 'kansai-ben',
            description: 'past form of kansai-ben terms',
            rules: [
                suffixInflection('うた', 'った', ['past'], ['past']),
                suffixInflection('おうた', 'あった', ['past'], ['past']),
                suffixInflection('こうた', 'かった', ['past'], ['past']),
                suffixInflection('ごうた', 'がった', ['past'], ['past']),
                suffixInflection('そうた', 'さった', ['past'], ['past']),
                suffixInflection('ぞうた', 'ざった', ['past'], ['past']),
                suffixInflection('とうた', 'たった', ['past'], ['past']),
                suffixInflection('どうた', 'だった', ['past'], ['past']),
                suffixInflection('のうた', 'なった', ['past'], ['past']),
                suffixInflection('ほうた', 'はった', ['past'], ['past']),
                suffixInflection('ぼうた', 'ばった', ['past'], ['past']),
                suffixInflection('もうた', 'まった', ['past'], ['past']),
                suffixInflection('ろうた', 'らった', ['past'], ['past']),
                suffixInflection('ようた', 'やった', ['past'], ['past']),
                suffixInflection('ゆうた', 'いった', ['past'], ['past'])
            ]
        },
        {
            name: 'kansai-ben',
            description: '-tara form of kansai-ben terms',
            rules: [
                suffixInflection('うたら', 'ったら', [], []),
                suffixInflection('おうたら', 'あったら', [], []),
                suffixInflection('こうたら', 'かったら', [], []),
                suffixInflection('ごうたら', 'がったら', [], []),
                suffixInflection('そうたら', 'さったら', [], []),
                suffixInflection('ぞうたら', 'ざったら', [], []),
                suffixInflection('とうたら', 'たったら', [], []),
                suffixInflection('どうたら', 'だったら', [], []),
                suffixInflection('のうたら', 'なったら', [], []),
                suffixInflection('ほうたら', 'はったら', [], []),
                suffixInflection('ぼうたら', 'ばったら', [], []),
                suffixInflection('もうたら', 'まったら', [], []),
                suffixInflection('ろうたら', 'らったら', [], []),
                suffixInflection('ようたら', 'やったら', [], []),
                suffixInflection('ゆうたら', 'いったら', [], [])
            ]
        },
        {
            name: 'kansai-ben',
            description: '-ku stem of kansai-ben adjectives',
            rules: [
                suffixInflection('う', 'く', [], ['adv']),
                suffixInflection('こう', 'かく', [], ['adv']),
                suffixInflection('ごう', 'がく', [], ['adv']),
                suffixInflection('そう', 'さく', [], ['adv']),
                suffixInflection('とう', 'たく', [], ['adv']),
                suffixInflection('のう', 'なく', [], ['adv']),
                suffixInflection('ぼう', 'ばく', [], ['adv']),
                suffixInflection('もう', 'まく', [], ['adv']),
                suffixInflection('ろう', 'らく', [], ['adv']),
                suffixInflection('よう', 'よく', [], ['adv']),
                suffixInflection('しゅう', 'しく', [], ['adv'])
            ]
        },
        {
            name: 'kansai-ben',
            description: '-te form of kansai-ben adjectives',
            rules: [
                suffixInflection('うて', 'くて', ['-te'], ['-te']),
                suffixInflection('こうて', 'かくて', ['-te'], ['-te']),
                suffixInflection('ごうて', 'がくて', ['-te'], ['-te']),
                suffixInflection('そうて', 'さくて', ['-te'], ['-te']),
                suffixInflection('とうて', 'たくて', ['-te'], ['-te']),
                suffixInflection('のうて', 'なくて', ['-te'], ['-te']),
                suffixInflection('ぼうて', 'ばくて', ['-te'], ['-te']),
                suffixInflection('もうて', 'まくて', ['-te'], ['-te']),
                suffixInflection('ろうて', 'らくて', ['-te'], ['-te']),
                suffixInflection('ようて', 'よくて', ['-te'], ['-te']),
                suffixInflection('しゅうて', 'しくて', ['-te'], ['-te'])
            ]
        },
        {
            name: 'kansai-ben',
            description: 'Negative form of kansai-ben adjectives',
            rules: [
                suffixInflection('うない', 'くない', ['adj-i'], ['adj-i']),
                suffixInflection('こうない', 'かくない', ['adj-i'], ['adj-i']),
                suffixInflection('ごうない', 'がくない', ['adj-i'], ['adj-i']),
                suffixInflection('そうない', 'さくない', ['adj-i'], ['adj-i']),
                suffixInflection('とうない', 'たくない', ['adj-i'], ['adj-i']),
                suffixInflection('のうない', 'なくない', ['adj-i'], ['adj-i']),
                suffixInflection('ぼうない', 'ばくない', ['adj-i'], ['adj-i']),
                suffixInflection('もうない', 'まくない', ['adj-i'], ['adj-i']),
                suffixInflection('ろうない', 'らくない', ['adj-i'], ['adj-i']),
                suffixInflection('ようない', 'よくない', ['adj-i'], ['adj-i']),
                suffixInflection('しゅうない', 'しくない', ['adj-i'], ['adj-i'])
            ]
        }
    ]
};
