/*
 * Copyright (C) 2024-2025  Yomitan Authors
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
});
