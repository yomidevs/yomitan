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
import {japaneseTransforms} from '../ext/js/language/ja/japanese-transforms.js';
import {LanguageTransformer} from '../ext/js/language/language-transformer.js';

const languageTransformer = new LanguageTransformer();
languageTransformer.addDescriptor(japaneseTransforms);

describe('japanese language transformer', () => {
    describe('basic tests', () => {
        const adjectiveInflections = [
            '愛しい',
            '愛しそう',
            '愛しすぎる',
            '愛し過ぎる',
            '愛しかったら',
            '愛しかったり',
            '愛しくて',
            '愛しく',
            '愛しくない',
            '愛しさ',
            '愛しかった',
            '愛しくありません',
            '愛しくありませんでした',
            '愛しき',
        ];

        const verbInflections = [
            '食べる',
            '食べます',
            '食べた',
            '食べました',
            '食べて',
            '食べられる',
            '食べられる',
            '食べさせる',
            '食べさす',
            '食べさせられる',
            '食べろ',
            '食べない',
            '食べません',
            '食べなかった',
            '食べませんでした',
            '食べなくて',
            '食べられない',
            '食べられない',
            '食べさせない',
            '食べささない',
            '食べさせられない',
            '食べ',
            '食べれば',
            '食べちゃう',
            '食べちまう',
            '食べなさい',
            '食べそう',
            '食べすぎる',
            '食べ過ぎる',
            '食べたい',
            '食べたら',
            '食べたり',
            '食べず',
            '食べぬ',
            '食べ',
            '食べましょう',
            '食べましょっか',
            '食べよう',
            '食べよっか',
            '食べるまい',
            '食べまい',
            '食べておく',
            '食べとく',
            '食べないでおく',
            '食べないどく',
            '食べている',
            '食べておる',
            '食べてる',
            '食べとる',
            '食べてしまう',
            '食べん',
            '食べんかった',
            '食べんばかり',
            '食べんとする',
            '食べますまい',
            '食べましたら',
            '食べますれば',
            '食べませんかった',
        ];

        const inflectionCombinations = [
            '抱き抱えていなければ',
            '抱きかかえていなければ',
            '打ち込んでいませんでした',
            '食べさせられたくなかった',
            '食べんとしませんかった',
            '食べないどきたくありません',
        ];

        const kuruInflections = [
            'くる',
            'きます',
            'きた',
            'きました',
            'きて',
            'こられる',
            'こられる',
            'こさせる',
            'こさす',
            'こさせられる',
            'こい',
            'こない',
            'きません',
            'こなかった',
            'きませんでした',
            'こなくて',
            'こられない',
            'こられない',
            'こさせない',
            'こささない',
            'こさせられない',
            'きまして',
            'くれば',
            'きちゃう',
            'きちまう',
            'きなさい',
            'きそう',
            'きすぎる',
            'き過ぎる',
            'きたい',
            'きたら',
            'きたり',
            'こず',
            'こぬ',
            'こざる',
            'こねば',
            'き',
            'きましょう',
            'きましょっか',
            'こよう',
            'こよっか',
            'くるまい',
            'こまい',
            'きておく',
            'きとく',
            'こないでおく',
            'こないどく',
            'きている',
            'きておる',
            'きてる',
            'きとる',
            'きてしまう',
            'こん',
            'こんかった',
            'こんばかり',
            'こんとする',
            'きますまい',
            'きましたら',
            'きますれば',
            'きませんかった',
        ];

        const suruInflections = [
            'する',
            'します',
            'した',
            'しました',
            'して',
            'できる',
            '出来る',
            'せられる',
            'される',
            'させる',
            'さす',
            'せさせる',
            'させられる',
            'せさせられる',
            'しろ',
            'しない',
            'しません',
            'しなかった',
            'しませんでした',
            'しなくて',
            'せられない',
            'されない',
            'させない',
            'せさせない',
            'ささない',
            'させられない',
            'せさせられない',
            'しまして',
            'すれば',
            'しちゃう',
            'しちまう',
            'しなさい',
            'しそう',
            'しすぎる',
            'し過ぎる',
            'したい',
            'したら',
            'したり',
            'せず',
            'せぬ',
            'せざる',
            'せねば',
            'しましょう',
            'しましょっか',
            'しよう',
            'しよっか',
            'するまい',
            'しまい',
            'しておく',
            'しとく',
            'しないでおく',
            'しないどく',
            'している',
            'しておる',
            'してる',
            'しとる',
            'してしまう',
            'せん',
            'せんかった',
            'せんばかり',
            'せんとする',
            'しますまい',
            'しましたら',
            'しますれば',
            'しませんかった',
        ];

        const kansaibenInflections = [
            'よろしゅう',
            'よろしゅうて',
            'よろしゅうない',
            '買わへん',
            '買わへんかった',
            '買うて',
            '買うた',
            '買うたら',
            '買うたり',
        ];

        const basicTransformations = [...adjectiveInflections, ...verbInflections, ...inflectionCombinations];
        bench(`japanese transformations (n=${basicTransformations.length})`, () => {
            for (const transform of basicTransformations) {
                languageTransformer.transform(transform);
            }
        });

        const transformationsFull = [...basicTransformations, ...kuruInflections, ...suruInflections, ...kansaibenInflections];
        bench(`japanese transformations-full (n=${transformationsFull.length})`, () => {
            for (const transform of transformationsFull) {
                languageTransformer.transform(transform);
            }
        });
    });
});
