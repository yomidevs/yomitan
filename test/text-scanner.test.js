/*
 * Copyright (C) 2023-2025  Yomitan Authors
 * Copyright (C) 2020-2022  Yomichan Authors
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

import {afterAll, describe, expect, test, vi} from 'vitest';
import {TextScanner} from '../ext/js/language/text-scanner.js';
import {setupDomTest} from './fixtures/dom-test.js';

const testEnv = await setupDomTest();

/**
 * @typedef {object} TermsFindResult
 * @property {import('dictionary').TermDictionaryEntry[]} dictionaryEntries
 * @property {number} originalTextLength
 */

/**
 * @returns {(scanner: TextScanner, x: number, y: number, inputInfo: import('text-scanner').InputInfo) => Promise<void>}
 * @throws {Error}
 */
function getSearchAtMethod() {
    const searchAt = Reflect.get(TextScanner.prototype, '_searchAt');
    if (typeof searchAt !== 'function') {
        throw new Error('Expected TextScanner._searchAt to be available');
    }
    return (scanner, x, y, inputInfo) => searchAt.call(scanner, x, y, inputInfo);
}

/**
 * @param {string} text
 * @returns {import('text-source').TextSource}
 */
function createFakeTextSource(text) {
    return /** @type {import('text-source').TextSource} */ (/** @type {unknown} */ ({
        content: text,
        clone() { return createFakeTextSource(text); },
        text() { return text; },
        setStartOffset() { return 0; },
        setEndOffset() { return 0; },
        getNodesInRange() { return []; },
        getRects() { return []; },
        getWritingMode() { return 'horizontal-tb'; },
        hasSameStart() { return false; },
        cleanup() {},
    }));
}

/**
 * @returns {import('text-scanner').InputInfo}
 */
function createInputInfo() {
    /** @type {import('input').Modifier[]} */
    const modifiers = [];
    /** @type {import('input').ModifierKey[]} */
    const modifierKeys = [];
    return {
        input: null,
        pointerType: 'mouse',
        eventType: 'mouseMove',
        passive: false,
        modifiers,
        modifierKeys,
        detail: null,
    };
}

/**
 * @param {import('../ext/js/comm/api.js').API['termsFind']} termsFindImpl
 * @param {import('text-source').TextSource[]} sourceQueue
 * @returns {TextScanner}
 */
function createScanner(termsFindImpl, sourceQueue) {
    /** @type {import('text-scanner').GetSearchContextCallback} */
    const getSearchContext = () => ({
        optionsContext: {
            depth: 0,
            url: 'https://example.test/',
            modifiers: [],
            modifierKeys: [],
            pointerType: 'mouse',
        },
        detail: {
            documentTitle: 'scanner-test',
        },
    });
    const textSourceGenerator = /** @type {import('../ext/js/dom/text-source-generator.js').TextSourceGenerator} */ (/** @type {unknown} */ ({
        getRangeFromPoint() {
            return sourceQueue.shift() ?? createFakeTextSource('暗記');
        },
        extractSentence() {
            return {text: '', offset: 0};
        },
    }));
    const api = /** @type {import('../ext/js/comm/api.js').API} */ (/** @type {unknown} */ ({
        termsFind: termsFindImpl,
        kanjiFind: async () => [],
        isTextLookupWorthy: async () => false,
    }));
    const scanner = new TextScanner({
        api,
        node: window,
        getSearchContext,
        searchTerms: true,
        searchKanji: false,
        textSourceGenerator,
    });
    scanner.prepare();
    scanner.setEnabled(true);
    return scanner;
}

/**
 * @returns {import('dictionary').TermDictionaryEntry}
 */
function createMockTermEntry() {
    return /** @type {import('dictionary').TermDictionaryEntry} */ (/** @type {unknown} */ ({
        dictionary: 'JMdict',
        definitions: [],
    }));
}

describe('TextScanner lookup robustness', () => {
    const {teardown} = testEnv;
    const searchAt = getSearchAtMethod();

    afterAll(async () => {
        await teardown(global);
    });

    test('hung lookup does not permanently block subsequent scans', async () => {
        /** @type {(value: TermsFindResult) => void} */
        let resolveFirstLookup = () => {};
        const firstLookupPromise = new Promise((resolve) => {
            resolveFirstLookup = resolve;
        });
        const termsFindImpl = vi.fn()
            .mockImplementationOnce(async () => await firstLookupPromise)
            .mockImplementationOnce(async () => ({
                dictionaryEntries: [createMockTermEntry()],
                originalTextLength: 2,
            }));
        const termsFind = /** @type {import('../ext/js/comm/api.js').API['termsFind']} */ (/** @type {unknown} */ (termsFindImpl));
        const sourceQueue = [createFakeTextSource('暗記'), createFakeTextSource('名前')];
        const scanner = createScanner(termsFind, sourceQueue);
        Reflect.set(scanner, '_lookupTimeoutMs', 25);

        let searchSuccessCount = 0;
        scanner.on('searchSuccess', () => {
            ++searchSuccessCount;
        });

        await searchAt(scanner, 10, 10, createInputInfo());
        expect(Reflect.get(scanner, '_pendingLookup')).toBe(false);

        await searchAt(scanner, 12, 10, createInputInfo());
        expect(searchSuccessCount).toBe(1);
        expect(termsFindImpl).toHaveBeenCalledTimes(2);

        resolveFirstLookup({
            dictionaryEntries: [createMockTermEntry()],
            originalTextLength: 2,
        });
        await new Promise((resolve) => {
            setTimeout(resolve, 0);
        });

        // Old timed-out lookup result must be ignored as stale.
        expect(searchSuccessCount).toBe(1);
    });

    test('late stale lookup rejection does not emit searchError', async () => {
        /** @type {(error: Error) => void} */
        let rejectFirstLookup = () => {};
        const firstLookupPromise = new Promise((_, reject) => {
            rejectFirstLookup = reject;
        });
        const termsFindImpl = vi.fn()
            .mockImplementationOnce(async () => await firstLookupPromise)
            .mockImplementationOnce(async () => ({
                dictionaryEntries: [createMockTermEntry()],
                originalTextLength: 2,
            }));
        const termsFind = /** @type {import('../ext/js/comm/api.js').API['termsFind']} */ (/** @type {unknown} */ (termsFindImpl));
        const sourceQueue = [createFakeTextSource('暗記'), createFakeTextSource('名前')];
        const scanner = createScanner(termsFind, sourceQueue);
        Reflect.set(scanner, '_lookupTimeoutMs', 25);

        let searchSuccessCount = 0;
        let searchErrorCount = 0;
        scanner.on('searchSuccess', () => {
            ++searchSuccessCount;
        });
        scanner.on('searchError', () => {
            ++searchErrorCount;
        });

        await searchAt(scanner, 10, 10, createInputInfo());
        await searchAt(scanner, 12, 10, createInputInfo());
        expect(searchSuccessCount).toBe(1);
        expect(searchErrorCount).toBe(0);

        rejectFirstLookup(new Error('stale lookup rejection'));
        await new Promise((resolve) => {
            setTimeout(resolve, 0);
        });

        // Rejection from a stale timed-out lookup should not bubble to searchError.
        expect(searchErrorCount).toBe(0);
    });
});
