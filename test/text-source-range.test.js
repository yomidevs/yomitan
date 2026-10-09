/*
 * Copyright (C) 2024-2026  Yomitan Authors
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

import {fail} from 'node:assert';
import {fileURLToPath} from 'node:url';
import path from 'path';
import {afterAll, describe, expect, test} from 'vitest';
import {TextSourceRange} from '../ext/js/dom/text-source-range.js';
import {TextScanner} from '../ext/js/language/text-scanner.js';
import {setupDomTest} from './fixtures/dom-test.js';


const dirname = path.dirname(fileURLToPath(import.meta.url));
const textSourceRangeTestEnv = await setupDomTest(path.join(dirname, 'data/html/text-source-range.html'));


describe('TextSourceRange', () => {
    const {window, teardown} = textSourceRangeTestEnv;
    afterAll(() => teardown(global));

    test('lazy', () => {
        const {document} = window;
        const testElement /** @type {NodeListOf<HTMLElement>} */ = document.getElementById('text-source-range-lazy');
        if (testElement === null) {
            fail('test element not found');
        }

        const range = new Range();
        range.selectNodeContents(testElement);

        const source = TextSourceRange.createLazy(range);
        const startLength = source.setStartOffset(200, false);
        const endLength = source.setEndOffset(200, true, false);

        const text = source.text();
        const textLength = text.length;

        expect(startLength).toBeLessThanOrEqual(textLength);
        expect(endLength).toBeLessThan(textLength);
        const count = (text.match(/人/g) || []).length;
        expect(count).toEqual(1);
    });

    test('standard', () => {
        const {document} = window;
        const testElement /** @type {NodeListOf<HTMLElement>} */ = document.getElementById('text-source-range');
        if (testElement === null) {
            fail('test element not found');
        }

        const range = new Range();

        range.selectNodeContents(testElement);

        const source = TextSourceRange.create(range);
        const startLength = source.setStartOffset(15, false);
        const endLength = source.setEndOffset(15, true, false);

        const text = source.text();
        const textLength = text.length;

        expect(startLength).toBeLessThan(textLength);
        expect(endLength).toBeLessThan(textLength);
        const count = (text.match(/山/g) || []).length;
        expect(count).toEqual(1);
    });

    test('term lookup selects the matched number of supplementary characters', async () => {
        const {document} = window;
        const textNode = document.createTextNode('𤾓𢆥𥪞𡎝');
        document.body.appendChild(textNode);
        const range = document.createRange();
        range.setStart(textNode, 0);
        range.collapse(true);
        const source = TextSourceRange.create(range);
        const matchedTerm = '𤾓𢆥';
        const scanner = new TextScanner({
            api: /** @type {import('../ext/js/comm/api.js').API} */ (/** @type {unknown} */ ({
                termsFind: async (/** @type {string} */ searchText) => {
                    expect(searchText).toBe('𤾓𢆥𥪞𡎝');
                    return {dictionaryEntries: [{}], originalTextLength: matchedTerm.length};
                },
            })),
            node: /** @type {Window} */ (/** @type {unknown} */ (window)),
            browser: null,
            getSearchContext: () => { throw new Error('Unexpected search context request'); },
            textSourceGenerator: /** @type {import('../ext/js/dom/text-source-generator.js').TextSourceGenerator} */ (/** @type {unknown} */ ({
                extractSentence: () => ({text: '', offset: 0}),
            })),
        });
        scanner.setOptions({scanLength: 4});

        // eslint-disable-next-line no-underscore-dangle
        await scanner._findTermDictionaryEntries(source, /** @type {import('settings').OptionsContext} */ (/** @type {unknown} */ ({})));

        expect(source.text()).toBe(matchedTerm);
        expect(source.range.toString()).toBe(matchedTerm);
        textNode.remove();
    });
});
