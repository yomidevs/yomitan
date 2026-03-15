/*
 * Copyright (C) 2023-2026  Yomitan Authors
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

import {describe, expect, test} from 'vitest';
import {Backend} from '../ext/js/background/backend.js';

describe('Backend._onApiParseText', () => {
    test('matches mecab tokenize output format and keeps lemma data only on the first split item', async () => {
        const parsedLine = [
            {term: '思い出せなく', reading: 'オモイダセナク', source: '思い出せなく', lemma: '思い出す', lemma_reading: 'おもいだす'},
            {term: 'なった', reading: 'ナッタ', source: 'なった', lemma: '成る', lemma_reading: 'なる'},
        ];

        const context = {
            _mecab: {
                parseText: async () => ([
                    {name: 'unidic-mecab-translate', lines: [parsedLine]},
                    {name: 'unidic-csj-202302', lines: [parsedLine]},
                ]),
            },
            // eslint-disable-next-line no-underscore-dangle, @typescript-eslint/unbound-method
            _textParseMecab: Backend.prototype._textParseMecab,
            _textParseScanning: async () => {
                throw new Error('Unexpected call to _textParseScanning');
            },
        };
        // eslint-disable-next-line no-underscore-dangle, @typescript-eslint/unbound-method
        const onApiParseText = Backend.prototype._onApiParseText;

        const results = await onApiParseText.call(context, {
            text: '思い出せなくなった',
            optionsContext: {index: 0},
            scanLength: 4096,
            useInternalParser: false,
            useMecabParser: true,
        }, /** @type {*} */ ({}));

        const expectedContent = [
            [
                {text: '思', reading: 'おも', lemma: '思い出す', lemmaReading: 'おもいだす'},
                {text: 'い', reading: ''},
                {text: '出', reading: 'だ'},
                {text: 'せなく', reading: ''},
            ],
            [
                {text: 'なった', reading: '', lemma: '成る', lemmaReading: 'なる'},
            ],
        ];
        expect(results).toStrictEqual([
            {
                id: 'mecab-unidic-mecab-translate',
                source: 'mecab',
                dictionary: 'unidic-mecab-translate',
                index: 0,
                content: expectedContent,
            },
            {
                id: 'mecab-unidic-csj-202302',
                source: 'mecab',
                dictionary: 'unidic-csj-202302',
                index: 0,
                content: expectedContent,
            },
        ]);
    });
});
