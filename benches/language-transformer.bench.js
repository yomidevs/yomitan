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

describe('Language transformer basic tests', () => {
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

    bench('transformations', () => {
        for (const transform of [...adjectiveInflections, ...verbInflections, ...inflectionCombinations]) {
            languageTransformer.transform(transform);
        }
    });
});
