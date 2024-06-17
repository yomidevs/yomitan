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

const shimauEnglishDescription = '1. Shows a sense of regret/surprise when you did have volition in doing something, but it turned out to be bad to do.\n' +
'2. Shows perfective/punctual achievement. This shows that an action has been completed.\n' +
'3. Shows unintentional action–“accidentally”.\n';

const passiveEnglishDescription = '1. Indicates an action received from an action performer.\n' +
'2. Expresses respect for the subject of action performer.\n';

/** @type {import('language-transformer').LanguageTransformDescriptor} */
export const japaneseTransforms = {
    language: 'ja',
    conditions: {
        'v': {
            name: 'Verb',
            i18n: [
                {
                    language: 'ja',
                    name: '動詞',
                },
            ],
            isDictionaryForm: false,
            subConditions: ['v1', 'v5', 'vk', 'vs', 'vz'],
        },
        'v1': {
            name: 'Ichidan verb',
            i18n: [
                {
                    language: 'ja',
                    name: '一段動詞',
                },
            ],
            isDictionaryForm: true,
            subConditions: ['v1d', 'v1p'],
        },
        'v1d': {
            name: 'Ichidan verb, dictionary form',
            i18n: [
                {
                    language: 'ja',
                    name: '一段動詞、辞書形',
                },
            ],
            isDictionaryForm: false,
        },
        'v1p': {
            name: 'Ichidan verb, progressive or perfect form',
            i18n: [
                {
                    language: 'ja',
                    name: '一段動詞、進行形または完了形',
                },
            ],
            isDictionaryForm: false,
        },
        'v5': {
            name: 'Godan verb',
            i18n: [
                {
                    language: 'ja',
                    name: '五段動詞',
                },
            ],
            isDictionaryForm: true,
            subConditions: ['v5d', 'v5m'],
        },
        'v5d': {
            name: 'Godan verb, dictionary form',
            i18n: [
                {
                    language: 'ja',
                    name: '五段動詞、辞書形',
                },
            ],
            isDictionaryForm: false,
        },
        'v5m': {
            name: 'Godan verb, polite (masu) form',
            isDictionaryForm: false,
        },
        'vk': {
            name: 'Kuru verb',
            i18n: [
                {
                    language: 'ja',
                    name: '来る動詞',
                },
            ],
            isDictionaryForm: true,
        },
        'vs': {
            name: 'Suru verb',
            i18n: [
                {
                    language: 'ja',
                    name: 'する動詞',
                },
            ],
            isDictionaryForm: true,
        },
        'vz': {
            name: 'Zuru verb',
            i18n: [
                {
                    language: 'ja',
                    name: 'ずる動詞',
                },
            ],
            isDictionaryForm: true,
        },
        'adj-i': {
            name: 'Adjective with i ending',
            i18n: [
                {
                    language: 'ja',
                    name: '形容詞',
                },
            ],
            isDictionaryForm: true,
        },
        '-te': {
            name: 'Intermediate -te endings for progressive or perfect tense',
            isDictionaryForm: false,
        },
        '-ba': {
            name: 'Intermediate -ba endings for conditional contraction',
            isDictionaryForm: false,
        },
        'adv': {
            name: 'Intermediate -ku endings for adverbs',
            isDictionaryForm: false,
        },
        'past': {
            name: '-ta past form ending',
            isDictionaryForm: false,
        },
    },
    transforms: {
        '-ba': {
            name: '-ba',
            description: '1. Conditional form; shows that the previous stated condition\'s establishment is the condition for the latter stated condition to occur.\n' +
            '2. Shows a trigger for a latter stated perception or judgment.\n' +
            'Usage: Attach ば to the hypothetical/realis form (kateikei/izenkei) of verbs and i-adjectives.',
            i18n: [
                {
                    language: 'ja',
                    name: '～ば',
                    description: '仮定形',
                },
            ],
            rules: [
                suffixInflection('ければ', 'い', ['-ba'], ['adj-i']),
                suffixInflection('えば', 'う', ['-ba'], ['v5']),
                suffixInflection('けば', 'く', ['-ba'], ['v5']),
                suffixInflection('げば', 'ぐ', ['-ba'], ['v5']),
                suffixInflection('せば', 'す', ['-ba'], ['v5']),
                suffixInflection('てば', 'つ', ['-ba'], ['v5']),
                suffixInflection('ねば', 'ぬ', ['-ba'], ['v5']),
                suffixInflection('べば', 'ぶ', ['-ba'], ['v5']),
                suffixInflection('めば', 'む', ['-ba'], ['v5']),
                suffixInflection('れば', 'る', ['-ba'], ['v1', 'v5', 'vk', 'vs', 'vz']),
            ],
        },
        '-ya': {
            name: '-ya',
            description: 'Contraction of -ba.',
            i18n: [
                {
                    language: 'ja',
                    name: '～ゃ',
                    description: '仮定形の縮約系',
                },
            ],
            rules: [
                suffixInflection('けりゃ', 'ければ', [], ['-ba']),
                suffixInflection('きゃ', 'ければ', [], ['-ba']),
                suffixInflection('や', 'えば', [], ['-ba']),
                suffixInflection('きゃ', 'けば', [], ['-ba']),
                suffixInflection('ぎゃ', 'げば', [], ['-ba']),
                suffixInflection('しゃ', 'せば', [], ['-ba']),
                suffixInflection('ちゃ', 'てば', [], ['-ba']),
                suffixInflection('にゃ', 'ねば', [], ['-ba']),
                suffixInflection('びゃ', 'べば', [], ['-ba']),
                suffixInflection('みゃ', 'めば', [], ['-ba']),
                suffixInflection('りゃ', 'れば', [], ['-ba']),
            ],
        },
        '-cha': {
            name: '-cha',
            description: 'Contraction of ～ては.\n' +
            '1. Explains how something always happens under the condition that it marks.\n' +
            '2. Expresses the repetition (of a series of) actions.\n' +
            '3. Indicates a hypothetical situation in which the speaker gives a (negative) evaluation about the other party\'s intentions.\n' +
            '4. Used in "Must Not" patterns like ～てはいけない.\n' +
            'Usage: Attach は after the te-form of verbs, contract ては into ちゃ.',
            i18n: [
                {
                    language: 'ja',
                    name: '～ちゃ',
                    description: '「～ては」の縮約系',
                },
            ],
            rules: [
                suffixInflection('ちゃ', 'る', ['v5'], ['v1']),
                suffixInflection('いじゃ', 'ぐ', ['v5'], ['v5']),
                suffixInflection('いちゃ', 'く', ['v5'], ['v5']),
                suffixInflection('しちゃ', 'す', ['v5'], ['v5']),
                suffixInflection('っちゃ', 'う', ['v5'], ['v5']),
                suffixInflection('っちゃ', 'く', ['v5'], ['v5']),
                suffixInflection('っちゃ', 'つ', ['v5'], ['v5']),
                suffixInflection('っちゃ', 'る', ['v5'], ['v5']),
                suffixInflection('んじゃ', 'ぬ', ['v5'], ['v5']),
                suffixInflection('んじゃ', 'ぶ', ['v5'], ['v5']),
                suffixInflection('んじゃ', 'む', ['v5'], ['v5']),
                suffixInflection('じちゃ', 'ずる', ['v5'], ['vz']),
                suffixInflection('しちゃ', 'する', ['v5'], ['vs']),
                suffixInflection('為ちゃ', '為る', ['v5'], ['vs']),
                suffixInflection('きちゃ', 'くる', ['v5'], ['vk']),
                suffixInflection('来ちゃ', '来る', ['v5'], ['vk']),
                suffixInflection('來ちゃ', '來る', ['v5'], ['vk']),
            ],
        },
        '-chau': {
            name: '-chau',
            description: 'Contraction of -shimau.\n' + shimauEnglishDescription +
            'Usage: Attach しまう after the te-form of verbs, contract てしまう into ちゃう.',
            i18n: [
                {
                    language: 'ja',
                    name: '～ちゃう',
                    description: '「～てしまう」のややくだけた口頭語的表現',
                },
            ],
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
                suffixInflection('來ちゃう', '來る', ['v5'], ['vk']),
            ],
        },
        '-chimau': {
            name: '-chimau',
            description: 'Contraction of -shimau.\n' + shimauEnglishDescription +
            'Usage: Attach しまう after the te-form of verbs, contract てしまう into ちまう.',
            i18n: [
                {
                    language: 'ja',
                    name: '～ちまう',
                    description: '「～てしまう」の音変化',
                },
            ],
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
                suffixInflection('來ちまう', '來る', ['v5'], ['vk']),
            ],
        },
        '-shimau': {
            name: '-shimau',
            description: shimauEnglishDescription +
            'Usage: Attach しまう after the te-form of verbs.',
            i18n: [
                {
                    language: 'ja',
                    name: '～しまう',
                    description: 'その動作がすっかり終わる、その状態が完成することを表す。終わったことを強調したり、不本意である、困ったことになった、などの気持ちを添えたりすることもある。',
                },
            ],
            rules: [
                suffixInflection('てしまう', 'て', ['v5'], ['-te']),
                suffixInflection('でしまう', 'で', ['v5'], ['-te']),
            ],
        },
        '-nasai': {
            name: '-nasai',
            description: 'Polite imperative suffix.\n' +
            'Usage: Attach なさい after the continuative form (renyoukei) of verbs.',
            i18n: [
                {
                    language: 'ja',
                    name: '～なさい',
                    description: '動詞「なさる」の命令形',
                },
            ],
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
                suffixInflection('來なさい', '來る', [], ['vk']),
            ],
        },
        '-sou': {
            name: '-sou',
            description: 'Appearing that; looking like.\n' +
            'Usage: Attach そう to the continuative form (renyoukei) of verbs, or to the stem of adjectives.',
            i18n: [
                {
                    language: 'ja',
                    name: '～そう',
                    description: 'そういう様子だ、そうなる様子だということ、すなわち様態を表す助動詞。',
                },
            ],
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
                suffixInflection('來そう', '來る', [], ['vk']),
            ],
        },
        '-sugiru': {
            name: '-sugiru',
            description: 'Shows something "is too..." or someone is doing something "too much".\n' +
            'Usage: Attach すぎる to the continuative form (renyoukei) of verbs, or to the stem of adjectives.',
            i18n: [
                {
                    language: 'ja',
                    name: '～すぎる',
                    description: '程度や限度を超える',
                },
            ],
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
                suffixInflection('來すぎる', '來る', ['v1'], ['vk']),
            ],
        },
        '-tai': {
            name: '-tai',
            description: '1. Expresses the feeling of desire or hope.\n' +
            '2. Used in ...たいと思います, an indirect way of saying what the speaker intends to do.\n' +
            'Usage: Attach たい to the continuative form (renyoukei) of verbs. たい itself conjugates as i-adjective.',
            i18n: [
                {
                    language: 'ja',
                    name: '～たい',
                    description: 'することをのぞんでいる、という、希望や願望の気持ちをあらわす。',
                },
            ],
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
                suffixInflection('來たい', '來る', ['adj-i'], ['vk']),
            ],
        },
        '-tara': {
            name: '-tara',
            description: '1. Denotes the latter stated event is a continuation of the previous stated event.\n' +
            '2. Assumes that a matter has been completed or concluded.\n' +
            'Usage: Attach たら to the continuative form (renyoukei) of verbs after euphonic change form, かったら to the stem of i-adjectives.',
            i18n: [
                {
                    language: 'ja',
                    name: '～たら',
                    description: '仮定をあらわす・…すると・したあとに',
                },
            ],
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
                suffixInflection('のたもうたら', 'のたまう', [], ['v5']),
            ],
        },
        '-tari': {
            name: '-tari',
            description: '1. Shows two actions occurring back and forth (when used with two verbs).\n' +
            '2. Shows examples of actions and states (when used with multiple verbs and adjectives).\n' +
            'Usage: Attach たり to the continuative form (renyoukei) of verbs after euphonic change form, かったり to the stem of i-adjectives',
            i18n: [
                {
                    language: 'ja',
                    name: '～たり',
                    description: 'ある動作を例示的にあげることを表わす。',
                },
            ],
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
                suffixInflection('のたもうたり', 'のたまう', [], ['v5']),
            ],
        },
        '-te': {
            name: '-te',
            description: 'te-form.\n' +
            'It has a myriad of meanings. Primarily, it is a conjunctive particle that connects two clauses together.\n' +
            'Usage: Attach て to the continuative form (renyoukei) of verbs after euphonic change form, くて to the stem of i-adjectives.',
            i18n: [
                {
                    language: 'ja',
                    name: '～て',
                    description: 'て（で）形',
                },
            ],
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
                suffixInflection('まして', 'ます', [], ['v']),
            ],
        },
        '-zu': {
            name: '-zu',
            description: '1. Negative form of verbs.\n' +
            '2. Continuative form (renyoukei) of the particle ぬ (nu).\n' +
            'Usage: Attach ず to the irrealis form (mizenkei) of verbs.',
            i18n: [
                {
                    language: 'ja',
                    name: '～ず',
                    description: '口語の否定の助動詞「ぬ」の連用形',
                },
            ],
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
                suffixInflection('來ず', '來る', [], ['vk']),
            ],
        },
        '-nu': {
            name: '-nu',
            description: 'Negative form of verbs.\n' +
            'Usage: Attach ぬ to the irrealis form (mizenkei) of verbs.',
            i18n: [
                {
                    language: 'ja',
                    name: '～ぬ',
                    description: '動作・状態などを「…ない」と否定することを表わす。',
                },
            ],
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
                suffixInflection('來ぬ', '來る', [], ['vk']),
            ],
        },
        '-n': {
            name: '-n',
            description: '1. Negative form of verbs; a sound change of ぬ.\n' +
            '2. (As …んばかり) Shows an action or condition is on the verge of occurring, or an excessive/extreme degree.\n' +
            'Usage: Attach ん to the irrealis form (mizenkei) of verbs.',
            i18n: [
                {
                    language: 'ja',
                    name: '～ん',
                    description: '〔否定の助動詞〕…ない',
                },
            ],
            rules: [
                suffixInflection('ん', 'る', [], ['v1']),
                suffixInflection('かん', 'く', [], ['v5']),
                suffixInflection('がん', 'ぐ', [], ['v5']),
                suffixInflection('さん', 'す', [], ['v5']),
                suffixInflection('たん', 'つ', [], ['v5']),
                suffixInflection('なん', 'ぬ', [], ['v5']),
                suffixInflection('ばん', 'ぶ', [], ['v5']),
                suffixInflection('まん', 'む', [], ['v5']),
                suffixInflection('らん', 'る', [], ['v5']),
                suffixInflection('わん', 'う', [], ['v5']),
                suffixInflection('ぜん', 'ずる', [], ['vz']),
                suffixInflection('せん', 'する', [], ['vs']),
                suffixInflection('為ん', '為る', [], ['vs']),
                suffixInflection('こん', 'くる', [], ['vk']),
                suffixInflection('来ん', '来る', [], ['vk']),
                suffixInflection('來ん', '來る', [], ['vk']),
            ],
        },
        '-mu': {
            name: '-mu',
            description: 'Archaic.\n' +
            '1. Shows an inference of a certain matter.\n' +
            '2. Shows speaker\'s intention.\n' +
            'Usage: Attach む to the irrealis form (mizenkei) of verbs.',
            i18n: [
                {
                    language: 'ja',
                    name: '～む',
                    description: '…だろう',
                },
            ],
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
                suffixInflection('來む', '來る', [], ['vk']),
            ],
        },
        '-zaru': {
            name: '-zaru',
            description: 'Negative form of verbs.\n' +
            'Usage: Attach ざる to the irrealis form (mizenkei) of verbs.',
            i18n: [
                {
                    language: 'ja',
                    name: '～ざる',
                    description: '…ない…',
                },
            ],
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
                suffixInflection('來ざる', '來る', [], ['vk']),
            ],
        },
        '-neba': {
            name: '-neba',
            description: '1. Shows a hypothetical negation; if not ...\n' +
            '2. Shows a must. Used with or without ならぬ.\n' +
            'Usage: Attach ねば to the irrealis form (mizenkei) of verbs.',
            i18n: [
                {
                    language: 'ja',
                    name: '～ねば',
                    description: 'もし…ないなら。…なければならない。',
                },
            ],
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
                suffixInflection('來ねば', '來る', [], ['vk']),
            ],
        },
        '-ku': {
            name: '-ku',
            description: 'Adverbial form of i-adjectives.\n',
            i18n: [
                {
                    language: 'ja',
                    name: '連用形',
                    description: '〔形容詞で〕用言へ続く。例、「大きく育つ」の「大きく」。',
                },
            ],
            rules: [
                suffixInflection('く', 'い', ['adv'], ['adj-i']),
            ],
        },
        'causative': {
            name: 'causative',
            description: 'Describes the intention to make someone do something.\n' +
            'Usage: Attach させる to the irrealis form (mizenkei) of ichidan verbs and くる.\n' +
            'Attach せる to the irrealis form (mizenkei) of godan verbs and する.\n' +
            'It itself conjugates as an ichidan verb.',
            i18n: [
                {
                    language: 'ja',
                    name: '使役形',
                    description: 'だれかにある行為をさせる意を表わす時の言い方。例、「行かせる」の「せる」。',
                },
            ],
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
                suffixInflection('來させる', '來る', ['v1'], ['vk']),
            ],
        },
        'imperative': {
            name: 'imperative',
            description: '1. To give orders.\n' +
            '2. (As あれ) Represents the fact that it will never change no matter the circumstances.\n' +
            '3. Express a feeling of hope.',
            i18n: [
                {
                    language: 'ja',
                    name: '命令形',
                    description: '命令の意味を表わすときの形。例、「行け」。',
                },
            ],
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
                suffixInflection('來い', '來る', [], ['vk']),
            ],
        },
        'imperative negative': {
            name: 'imperative negative',
            rules: [
                suffixInflection('な', '', [], ['v']),
            ],
        },
        'continuative': {
            name: 'continuative',
            description: 'Used to indicate actions that are (being) carried out.\n' +
            'Refers to the renyoukei, the part of the verb after conjugating with -masu and dropping masu.',
            i18n: [
                {
                    language: 'ja',
                    name: '連用形',
                    description: '〔動詞などで〕「ます」などに続く。例、「バスを降りて歩きます」の「降り」「歩き」。',
                },
            ],
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
                suffixInflection('來', '來る', [], ['vk']),
            ],
        },
        'negative': {
            name: 'negative',
            description: '1. Negative form of verbs.\n' +
            '2. Expresses a feeling of solicitation to the other party.\n' +
            'Usage: Attach ない to the irrealis form (mizenkei) of verbs, くない to the stem of i-adjectives. ない itself conjugates as i-adjective. ます becomes ません.',
            i18n: [
                {
                    language: 'ja',
                    name: '～ない',
                    description: 'その動作・作用・状態の成立を否定することを表わす。',
                },
            ],
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
                suffixInflection('ません', 'ます', ['v'], ['v']),
            ],
        },
        '-sa': {
            name: '-sa',
            description: 'Nominalizing suffix of i-adjectives indicating nature, state, mind or degree.\n' +
            'Usage: Attach さ to the stem of i-adjectives.',
            i18n: [
                {
                    language: 'ja',
                    name: '～さ',
                    description: 'こと。程度。',
                },
            ],
            rules: [
                suffixInflection('さ', 'い', [], ['adj-i']),
            ],
        },
        'passive': {
            name: 'passive',
            description: passiveEnglishDescription +
            'Usage: Attach れる to the irrealis form (mizenkei) of godan verbs.',
            i18n: [
                {
                    language: 'ja',
                    name: '受身形',
                },
            ],
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
                suffixInflection('來られる', '來る', ['v1'], ['vk']),
            ],
        },
        '-ta': {
            name: '-ta',
            description: '1. Indicates a reality that has happened in the past.\n' +
            '2. Indicates the completion of an action.\n' +
            '3. Indicates the confirmation of a matter.\n' +
            '4. Indicates the speaker\'s confidence that the action will definitely be fulfilled.\n' +
            '5. Indicates the events that occur before the main clause are represented as relative past.\n' +
            '6. Indicates a mild imperative/command.\n' +
            'Usage: Attach た to the continuative form (renyoukei) of verbs after euphonic change form, かった to the stem of i-adjectives.',
            i18n: [
                {
                    language: 'ja',
                    name: '～た・かった形',
                },
            ],
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
                suffixInflection('ませんでした', 'ません', ['past'], ['v']),
            ],
        },
        '-masu': {
            name: '-masu',
            description: 'Polite conjugation of verbs and adjectives.\n' +
            'Usage: Attach ます to the continuative form (renyoukei) of verbs.',
            i18n: [
                {
                    language: 'ja',
                    name: '～ます',
                },
            ],
            rules: [
                suffixInflection('ます', 'る', ['v1'], ['v1']),
                suffixInflection('います', 'う', ['v5m'], ['v5d']),
                suffixInflection('きます', 'く', ['v5m'], ['v5d']),
                suffixInflection('ぎます', 'ぐ', ['v5m'], ['v5d']),
                suffixInflection('します', 'す', ['v5m'], ['v5d']),
                suffixInflection('ちます', 'つ', ['v5m'], ['v5d']),
                suffixInflection('にます', 'ぬ', ['v5m'], ['v5d']),
                suffixInflection('びます', 'ぶ', ['v5m'], ['v5d']),
                suffixInflection('みます', 'む', ['v5m'], ['v5d']),
                suffixInflection('ります', 'る', ['v5m'], ['v5d']),
                suffixInflection('じます', 'ずる', ['vz'], ['vz']),
                suffixInflection('します', 'する', ['vs'], ['vs']),
                suffixInflection('為ます', '為る', ['vs'], ['vs']),
                suffixInflection('きます', 'くる', ['vk'], ['vk']),
                suffixInflection('来ます', '来る', ['vk'], ['vk']),
                suffixInflection('來ます', '來る', ['vk'], ['vk']),
                suffixInflection('くあります', 'い', ['v'], ['adj-i']),
            ],
        },
        'potential': {
            name: 'potential',
            description: 'Indicates a state of being (naturally) capable of doing an action.\n' +
            'Usage: Attach (ら)れる to the irrealis form (mizenkei) of ichidan verbs.\n' +
            'Attach る to the imperative form (meireikei) of godan verbs.\n' +
            'する becomes できる, くる becomes こ(ら)れる',
            i18n: [
                {
                    language: 'ja',
                    name: '可能',
                },
            ],
            rules: [
                suffixInflection('れる', 'る', ['v1'], ['v1', 'v5d']),
                suffixInflection('える', 'う', ['v1'], ['v5d']),
                suffixInflection('ける', 'く', ['v1'], ['v5d']),
                suffixInflection('げる', 'ぐ', ['v1'], ['v5d']),
                suffixInflection('せる', 'す', ['v1'], ['v5d']),
                suffixInflection('てる', 'つ', ['v1'], ['v5d']),
                suffixInflection('ねる', 'ぬ', ['v1'], ['v5d']),
                suffixInflection('べる', 'ぶ', ['v1'], ['v5d']),
                suffixInflection('める', 'む', ['v1'], ['v5d']),
                suffixInflection('できる', 'する', ['v1'], ['vs']),
                suffixInflection('出来る', 'する', ['v1'], ['vs']),
                suffixInflection('これる', 'くる', ['v1'], ['vk']),
                suffixInflection('来れる', '来る', ['v1'], ['vk']),
                suffixInflection('來れる', '來る', ['v1'], ['vk']),
            ],
        },
        'potential or passive': {
            name: 'potential or passive',
            description: passiveEnglishDescription +
            '3. Indicates a state of being (naturally) capable of doing an action.\n' +
            'Usage: Attach られる to the irrealis form (mizenkei) of ichidan verbs.\n' +
            'する becomes せられる, くる becomes こられる',
            i18n: [
                {
                    language: 'ja',
                    name: '受身・自発・可能・尊敬',
                },
            ],
            rules: [
                suffixInflection('られる', 'る', ['v1'], ['v1']),
                suffixInflection('ざれる', 'ずる', ['v1'], ['vz']),
                suffixInflection('ぜられる', 'ずる', ['v1'], ['vz']),
                suffixInflection('せられる', 'する', ['v1'], ['vs']),
                suffixInflection('為られる', '為る', ['v1'], ['vs']),
                suffixInflection('こられる', 'くる', ['v1'], ['vk']),
                suffixInflection('来られる', '来る', ['v1'], ['vk']),
                suffixInflection('來られる', '來る', ['v1'], ['vk']),
            ],
        },
        'volitional': {
            name: 'volitional',
            description: '1. Expresses speaker\'s will or intention; volitional form.\n' +
            '2. Expresses an invitation to the other party.\n' +
            '3. (Used in …ようとする) Indicates being on the verge of initiating an action or transforming a state.\n' +
            '4. Indicates an inference of a matter.\n' +
            'Usage: Attach よう to the irrealis form (mizenkei) of ichidan verbs.\n' +
            'Attach う to the irrealis form (mizenkei) of godan verbs after -o euphonic change form.\n' +
            'Attach かろう to the stem of i-adjectives (4th meaning only).',
            i18n: [
                {
                    language: 'ja',
                    name: '～う形',
                    description: '主体の意志を表わす',
                },
            ],
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
                suffixInflection('ましょう', 'ます', [], ['v']),
                suffixInflection('かろう', 'い', [], ['adj-i']),
            ],
        },
        'causative-passive': {
            name: 'causative-passive',
            description: 'Contraction of the passive of the causative form of verbs.\n' +
            'Someone was made to do something by someone else.\n' +
            'Usage: ～せられる becomes ~される (only for godan verbs)',
            i18n: [
                {
                    language: 'ja',
                    name: '使役受け身形',
                },
            ],
            rules: [
                suffixInflection('かされる', 'く', ['v1'], ['v5']),
                suffixInflection('がされる', 'ぐ', ['v1'], ['v5']),
                suffixInflection('たされる', 'つ', ['v1'], ['v5']),
                suffixInflection('なされる', 'ぬ', ['v1'], ['v5']),
                suffixInflection('ばされる', 'ぶ', ['v1'], ['v5']),
                suffixInflection('まされる', 'む', ['v1'], ['v5']),
                suffixInflection('らされる', 'る', ['v1'], ['v5']),
                suffixInflection('わされる', 'う', ['v1'], ['v5']),
            ],
        },
        '-toku': {
            name: '-toku',
            description: 'Contraction of -teoku.\n' +
            'To do certain things in advance in preparation (or in anticipation) of latter needs.\n' +
            'Usage: Attach おく to the te-form of verbs, then contract ておく into とく.',
            i18n: [
                {
                    language: 'ja',
                    name: '～とく',
                    description: '「～テオク」の縮約系',
                },
            ],
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
                suffixInflection('來とく', '來る', ['v5'], ['vk']),
            ],
        },
        '-teiru': {
            name: '-teiru',
            description: '1. Indicates an action continues or progresses to a point in time.\n' +
            '2. Indicates an action is completed and remains as is.\n' +
            '3. Indicates a state or condition that can be taken to be the result of undergoing some change.\n' +
            'Usage: Attach いる to the te-form of verbs. い can be dropped in speech.\n' +
            '(Slang) Attach おる to the te-form of verbs. Contracts to とる・でる in speech.',
            i18n: [
                {
                    language: 'ja',
                    name: '～ている',
                },
            ],
            rules: [
                suffixInflection('ている', 'て', ['v1'], ['-te']),
                suffixInflection('ておる', 'て', ['v5'], ['-te']),
                suffixInflection('てる', 'て', ['v1p'], ['-te']),
                suffixInflection('でいる', 'で', ['v1'], ['-te']),
                suffixInflection('でおる', 'で', ['v5'], ['-te']),
                suffixInflection('でる', 'で', ['v1p'], ['-te']),
                suffixInflection('とる', 'て', ['v5'], ['-te']),
                suffixInflection('ないでいる', 'ない', ['v1'], ['adj-i']),
            ],
        },
        '-ki': {
            name: '-ki',
            description: 'Attributive form (rentaikei) of i-adjectives. An archaic form that remains in modern Japanese.',
            i18n: [
                {
                    language: 'ja',
                    name: '～き',
                    description: '連体形',
                },
            ],
            rules: [
                suffixInflection('き', 'い', [], ['adj-i']),
            ],
        },
        '-ge': {
            name: '-ge',
            description: 'Describes a person\'s appearance. Shows feelings of the person.\n' +
            'Usage: Attach げ or 気 to the stem of i-adjectives',
            i18n: [
                {
                    language: 'ja',
                    name: '～げ',
                    description: '…でありそうな様子。いかにも…らしいさま。',
                },
            ],
            rules: [
                suffixInflection('げ', 'い', [], ['adj-i']),
                suffixInflection('気', 'い', [], ['adj-i']),
            ],
        },
        '-garu': {
            name: '-garu',
            description: '1. Shows subject’s feelings contrast with what is thought/known about them.\n' +
            '2. Indicates subject\'s behavior (stands out).\n' +
            'Usage: Attach がる to the stem of i-adjectives. It itself conjugates as a godan verb.',
            i18n: [
                {
                    language: 'ja',
                    name: '～がる',
                    description: 'いかにもその状態にあるという印象を相手に与えるような言動をする。',
                },
            ],
            rules: [
                suffixInflection('がる', 'い', ['v5'], ['adj-i']),
            ],
        },
        '-e': {
            name: '-e',
            description: 'Slang. A sound change of i-adjectives.\n' +
            'ai：やばい → やべぇ\n' +
            'ui：さむい → さみぃ/さめぇ\n' +
            'oi：すごい → すげぇ',
            i18n: [
                {
                    language: 'ja',
                    name: '～え',
                    description: '方言。例、「ない→ねえ」',
                },
            ],
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
                suffixInflection('てぇ', 'たい', [], ['adj-i']),
            ],
        },
        'slang': {
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
                suffixInflection('おやさい', 'おやすみ', [], []),
            ],
        },
        'kansai-ben negative': {
            name: 'kansai-ben',
            description: 'Negative form of kansai-ben verbs',
            rules: [
                suffixInflection('へん', 'ない', [], ['adj-i']),
                suffixInflection('ひん', 'ない', [], ['adj-i']),
                suffixInflection('せえへん', 'しない', [], ['adj-i']),
                suffixInflection('へんかった', 'なかった', ['past'], ['past']),
                suffixInflection('ひんかった', 'なかった', ['past'], ['past']),
                suffixInflection('うてへん', 'ってない', [], ['adj-i']),
            ],
        },
        'kansai-ben -te': {
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
                suffixInflection('ゆうて', 'いって', ['-te'], ['-te']),
            ],
        },
        'kansai-ben past': {
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
                suffixInflection('ゆうた', 'いった', ['past'], ['past']),
            ],
        },
        'kansai-ben -tara': {
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
                suffixInflection('ゆうたら', 'いったら', [], []),
            ],
        },
        'kansai-ben -ku': {
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
                suffixInflection('しゅう', 'しく', [], ['adv']),
            ],
        },
        'kansai-ben adjective -te': {
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
                suffixInflection('しゅうて', 'しくて', ['-te'], ['-te']),
            ],
        },
        'kansai-ben adjective negative': {
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
                suffixInflection('しゅうない', 'しくない', ['adj-i'], ['adj-i']),
            ],
        },
    },
};
