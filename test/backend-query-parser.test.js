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

import {describe, expect, test, vi} from 'vitest';

vi.mock('../ext/lib/kanji-processor.js', () => ({
    convertVariants: (text) => text,
}));

const {Backend} = await import('../ext/js/background/backend.js');

/**
 * @returns {(this: unknown, text: string, scanLength: number, optionsContext: import('settings').OptionsContext) => Promise<import('api').ParseTextLine[]>}
 * @throws {Error}
 */
function getTextParseScanningMethod() {
    const parseMethod = Reflect.get(Backend.prototype, '_textParseScanning');
    if (typeof parseMethod !== 'function') {
        throw new Error('Expected _textParseScanning method');
    }
    return parseMethod;
}

/**
 * @returns {unknown}
 */
function createBackendContext() {
    return {
        _ensureDictionaryDatabaseReady: async () => {},
        _getProfileOptions: () => ({}),
        _getTranslatorFindTermsOptions: () => ({}),
        _textParseCache: new Map(),
        _translator: {
            findTerms: vi.fn(async () => ({dictionaryEntries: [], originalTextLength: 0})),
        },
    };
}

describe('Backend query parser segmentation', () => {
    const textParseScanning = getTextParseScanningMethod();

    test.each([
        ['カタかな', [[{text: 'カタ', reading: ''}], [{text: 'かな', reading: ''}]]],
        ['かなカナ', [[{text: 'かな', reading: ''}], [{text: 'カナ', reading: ''}]]],
        ['カタカナ', [[{text: 'カタカナ', reading: ''}]]],
        ['ひらがな', [[{text: 'ひらがな', reading: ''}]]],
    ])('splits unmatched text for %s', async (text, expected) => {
        const context = createBackendContext();

        const actual = await textParseScanning.call(context, text, text.length, {});

        expect(actual).toStrictEqual(expected);
    });

    test('matches text that only fits within the derived +8 scan-length buffer', async () => {
        const baseHeadwordLength = 4;
        const derivedScanLength = baseHeadwordLength + 8;
        const source = 'abcdefghij';
        const context = createBackendContext();
        context._translator.findTerms = vi.fn(async (_mode, substring) => {
            if (substring.startsWith(source) && substring.length >= source.length) {
                return {
                    dictionaryEntries: [{
                        headwords: [{
                            term: source,
                            reading: '',
                            sources: [{originalText: source, isPrimary: true, matchType: 'exact'}],
                        }],
                    }],
                    originalTextLength: source.length,
                };
            }
            return {dictionaryEntries: [], originalTextLength: 0};
        });

        const actual = await textParseScanning.call(context, source, derivedScanLength, {});

        expect(actual).toStrictEqual([[
            {
                text: source,
                reading: '',
                headwords: [[{
                    term: source,
                    reading: '',
                    sources: [{originalText: source, isPrimary: true, matchType: 'exact'}],
                }]],
            },
        ]]);
    });
});
