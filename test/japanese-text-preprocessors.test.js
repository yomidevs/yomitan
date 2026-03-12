/*
 * Copyright (C) 2026  Yomitan Authors
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
import {getAllLanguageTextProcessors} from '../ext/js/language/languages.js';

describe('Japanese text preprocessors', () => {
    test('include explicit kanji duplication variants', () => {
        const japaneseProcessors = getAllLanguageTextProcessors().find(({iso}) => iso === 'ja');
        expect(japaneseProcessors).toBeDefined();
        if (typeof japaneseProcessors === 'undefined') {
            throw new Error('Japanese text processors not found');
        }

        const {textPreprocessors} = japaneseProcessors;
        expect(Array.isArray(textPreprocessors)).toBe(true);
        if (!Array.isArray(textPreprocessors)) {
            throw new Error('Japanese text preprocessors not found');
        }

        const processorWithId = textPreprocessors.find(({id}) => id === 'convertIterationMarksToKanjiDuplication');
        expect(processorWithId).toBeDefined();
        if (typeof processorWithId === 'undefined') {
            throw new Error('Iteration mark processor not found');
        }

        const processor = processorWithId.textProcessor;
        expect(processor.process('瑞々しい', 'off')).toStrictEqual('瑞々しい');
        expect(processor.process('瑞々しい', 'direct')).toStrictEqual('瑞瑞しい');
        expect(processor.process('瑞瑞しい', 'inverse')).toStrictEqual('瑞々しい');
    });
});
