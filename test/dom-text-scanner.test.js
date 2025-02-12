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

import {fileURLToPath} from 'node:url';
import path from 'path';
import {afterAll, describe, expect, test} from 'vitest';
import {parseJson} from '../dev/json.js';
import {DOMTextScanner} from '../ext/js/dom/dom-text-scanner.js';
import {setupDomTest} from './fixtures/dom-test.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * @param {Element} element
 * @param {string} selector
 * @returns {?Node}
 */
function querySelectorTextNode(element, selector) {
    let textIndex = -1;
    const match = /::text$|::nth-text\((\d+)\)$/.exec(selector);
    if (match !== null) {
        textIndex = (match[1] ? Number.parseInt(match[1], 10) - 1 : 0);
        selector = selector.substring(0, selector.length - match[0].length);
    }
    const result = element.querySelector(selector);
    if (result === null) {
        return null;
    }
    if (textIndex < 0) {
        return result;
    }
    for (let n = result.firstChild; n !== null; n = n.nextSibling) {
        if (n.nodeType === /** @type {typeof Node} */ (n.constructor).TEXT_NODE) {
            if (textIndex === 0) {
                return /** @type {Text} */ (n);
            }
            --textIndex;
        }
    }
    return null;
}


/**
 * @param {import('jsdom').DOMWindow} window
 * @param {(element: Element) => CSSStyleDeclaration} getComputedStyle
 * @param {?Node} element
 * @returns {number}
 */
function getComputedFontSizeInPixels(window, getComputedStyle, element) {
    for (; element !== null; element = element.parentNode) {
        if (element.nodeType === window.Node.ELEMENT_NODE) {
            const fontSize = getComputedStyle(/** @type {Element} */ (element)).fontSize;
            if (fontSize.endsWith('px')) {
                return Number.parseFloat(fontSize.substring(0, fontSize.length - 2));
            }
        }
    }
    return 14; // Default font size
}

/**
 * @param {import('jsdom').DOMWindow} window
 * @returns {(element: Element, pseudoElement?: ?string) => CSSStyleDeclaration}
 */
function createAbsoluteGetComputedStyle(window) {
    // Wrapper to convert em units to px units
    const getComputedStyleOld = window.getComputedStyle.bind(window);
    /** @type {(element: Element, pseudoElement?: ?string) => CSSStyleDeclaration} */
    return (element, ...args) => {
        const style = getComputedStyleOld(element, ...args);
        return new Proxy(style, {
            /**
             * @param {CSSStyleDeclaration} target
             * @param {string|symbol} property
             * @returns {unknown}
             */
            get: (target, property) => {
                let result = /** @type {Record<string|symbol, unknown>} */ (/** @type {unknown} */ (target))[property];
                if (typeof result === 'string') {
                    /**
                     * @param {string} g0
                     * @param {string} g1
                     * @returns {string}
                     */
                    const replacer = (g0, g1) => {
                        const fontSize = getComputedFontSizeInPixels(window, getComputedStyleOld, element);
                        return `${Number.parseFloat(g1) * fontSize}px`;
                    };
                    result = result.replace(/([-+]?\d(?:\.\d)?(?:[eE][-+]?\d+)?)em/g, replacer);
                }
                return result;
            },
        });
    };
}

const domTestEnv = await setupDomTest(path.join(dirname, 'data/html/dom-text-scanner.html'));

describe('DOMTextScanner seek tests', () => {
    const {window, teardown} = domTestEnv;
    afterAll(() => teardown(global));

    const {document} = window;
    window.getComputedStyle = createAbsoluteGetComputedStyle(window);

    for (const testElement of /** @type {NodeListOf<HTMLElement>} */ (document.querySelectorAll('test-case'))) {
        const testDescription = testElement.querySelector('test-description')?.textContent || 'Test description not found.';

        /** @type {import('test/dom-text-scanner').TestData|import('test/dom-text-scanner').TestData[]} */
        let testData = parseJson(/** @type {string} */ (testElement.dataset.testData));
        if (!Array.isArray(testData)) {
            testData = [testData];
        }

        for (const testDataItem of testData) {
            const {
                node: nodeSelector,
                offset,
                length,
                forcePreserveWhitespace,
                generateLayoutContent,
                reversible,
                expected: {
                    node: expectedNodeSelector,
                    offset: expectedOffset,
                    content: expectedContent,
                    remainder: expectedRemainder,
                },
            } = testDataItem;

            const node = querySelectorTextNode(testElement, nodeSelector);
            const expectedNode = querySelectorTextNode(testElement, expectedNodeSelector);

            expect(node).not.toEqual(null);
            expect(expectedNode).not.toEqual(null);
            if (node === null || expectedNode === null) { continue; }

            test(`${testDescription} standard test`, () => {
                const scanner = new DOMTextScanner(node, offset, forcePreserveWhitespace, generateLayoutContent);
                scanner.seek(length);

                const {node: actualNode1, offset: actualOffset1, content: actualContent1, remainder: actualRemainder1} = scanner;
                expect(actualContent1).toStrictEqual(expectedContent);
                expect(actualOffset1).toStrictEqual(expectedOffset);
                expect(actualNode1).toStrictEqual(expectedNode);
                expect(actualRemainder1).toStrictEqual(expectedRemainder || 0);
            });

            test(`${testDescription} substring test`, () => {
                for (let i = 1; i <= length; ++i) {
                    const scanner = new DOMTextScanner(node, offset, forcePreserveWhitespace, generateLayoutContent);
                    scanner.seek(length - i);

                    const {content: actualContent} = scanner;
                    expect(actualContent).toStrictEqual(expectedContent.substring(0, expectedContent.length - i));
                }
            });

            test.runIf(reversible)(`${testDescription} reversed test`, () => {
                const scanner = new DOMTextScanner(expectedNode, expectedOffset, forcePreserveWhitespace, generateLayoutContent);
                scanner.seek(-length);

                const {content: actualContent} = scanner;
                expect(actualContent).toStrictEqual(expectedContent);
            });

            test.runIf(reversible)(`${testDescription} reversed substring test`, () => {
                for (let i = 1; i <= length; ++i) {
                    const scanner = new DOMTextScanner(expectedNode, expectedOffset, forcePreserveWhitespace, generateLayoutContent);
                    scanner.seek(-(length - i));

                    const {content: actualContent} = scanner;
                    expect(actualContent).toStrictEqual(expectedContent.substring(i));
                }
            });
        }
    }
});
