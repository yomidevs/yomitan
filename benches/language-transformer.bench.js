/*
 * Copyright (C) 2023-2024  Yomitan Authors
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

import fs from 'fs';
import {fileURLToPath} from 'node:url';
import path from 'path';
import {bench, describe} from 'vitest';
import {parseJson} from '../dev/json.js';
import {LanguageTransformer} from '../ext/js/language/language-transformer.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('language-transformer').LanguageTransformDescriptor} */
const descriptor = parseJson(fs.readFileSync(path.join(dirname, '..', 'ext', 'data/language/japanese-transforms.json'), {encoding: 'utf8'}));
const languageTransformer = new LanguageTransformer();
languageTransformer.addDescriptor(descriptor);

describe('language transformer', () => {
    describe('basic tests', () => {
        const adjectiveInflections = [
            '愛しい',
            '愛しそう',
            '愛しすぎる',
            '愛しかったら',
            '愛しかったり',
            '愛しくて',
            '愛しく',
            '愛しくない',
            '愛しさ',
            '愛しかった',
            '愛しくありません',
            '愛しくありませんでした',
            '愛しき'
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
            '食べさせられない',
            '食べ',
            '食べれば',
            '食べちゃう',
            '食べちまう',
            '食べなさい',
            '食べそう',
            '食べすぎる',
            '食べたい',
            '食べたら',
            '食べたり',
            '食べず',
            '食べぬ',
            '食べ',
            '食べましょう',
            '食べよう',
            '食べとく',
            '食べている',
            '食べておる',
            '食べてる',
            '食べとる',
            '食べてしまう'
        ];

        const inflectionCombinations = [
            '抱き抱えていなければ',
            '抱きかかえていなければ',
            '打ち込んでいませんでした',
            '食べさせられたくなかった'
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
            'こさせられない',
            'くるな',
            'きまして',
            'くれば',
            'きちゃう',
            'きちまう',
            'きなさい',
            'きそう',
            'きすぎる',
            'きたい',
            'きたら',
            'きたり',
            'こず',
            'こぬ',
            'こざる',
            'こねば',
            'き',
            'きましょう',
            'こよう',
            'きとく',
            'きている',
            'きておる',
            'きてる',
            'きとる',
            'きてしまう'
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
            'させられない',
            'せさせられない',
            'するな',
            'しまして',
            'すれば',
            'しちゃう',
            'しちまう',
            'しなさい',
            'しそう',
            'しすぎる',
            'したい',
            'したら',
            'したり',
            'せず',
            'せぬ',
            'せざる',
            'せねば',
            'しましょう',
            'しよう',
            'しとく',
            'している',
            'しておる',
            'してる',
            'しとる',
            'してしまう'
        ];

        const kansaibenInflections = [
            'よろしゅう',
            'よろしゅうて',
            'よろしゅうない',
            '買わへん',
            '買わへんかった',
            '買うて',
            '買うた',
            '買うたら'
        ];

        const basicTransformations = [...adjectiveInflections, ...verbInflections, ...inflectionCombinations];
        bench(`transformations (n=${basicTransformations.length})`, () => {
            for (const transform of basicTransformations) {
                languageTransformer.transform(transform);
            }
        });

        const transformationsFull = [...basicTransformations, ...kuruInflections, ...suruInflections, ...kansaibenInflections];
        bench(`transformations-full (n=${transformationsFull.length})`, () => {
            for (const transform of transformationsFull) {
                languageTransformer.transform(transform);
            }
        });
    });
});
