/*
 * Copyright (C) 2023  Yomitan Authors
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

import fs from 'fs';
import {JSDOM} from 'jsdom';
import path from 'path';
import {expect, test} from 'vitest';
import {DOMTextScanner} from '../ext/js/dom/dom-text-scanner.js';


/**
 * @param {string} fileName
 * @returns {JSDOM}
 */
function createJSDOM(fileName) {
    const domSource = fs.readFileSync(fileName, {encoding: 'utf8'});
    return new JSDOM(domSource);
}

/**
 * @param {Element} element
 * @param {string} selector
 * @returns {?Node}
 */
function querySelectorTextNode(element, selector) {
    let textIndex = -1;
    const match = /::text$|::nth-text\((\d+)\)$/.exec(selector);
    if (match !== null) {
        textIndex = (match[1] ? parseInt(match[1], 10) - 1 : 0);
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
                const value = parseFloat(fontSize.substring(0, fontSize.length - 2));
                return value;
            }
        }
    }
    const defaultFontSize = 14;
    return defaultFontSize;
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
            get: (target, property) => {
                let result = /** @type {import('core').SafeAny} */ (target)[property];
                if (typeof result === 'string') {
                    result = result.replace(/([-+]?\d(?:\.\d)?(?:[eE][-+]?\d+)?)em/g, (g0, g1) => {
                        const fontSize = getComputedFontSizeInPixels(window, getComputedStyleOld, element);
                        return `${parseFloat(g1) * fontSize}px`;
                    });
                }
                return result;
            }
        });
    };
}


/**
 * @param {JSDOM} dom
 */
async function testDomTextScanner(dom) {
    const document = dom.window.document;

    test('DomTextScanner', () => {
        for (const testElement of /** @type {NodeListOf<HTMLElement>} */ (document.querySelectorAll('y-test'))) {
            let testData = JSON.parse(/** @type {string} */ (testElement.dataset.testData));
            if (!Array.isArray(testData)) {
                testData = [testData];
            }
            for (const testDataItem of testData) {
                let {
                    node,
                    offset,
                    length,
                    forcePreserveWhitespace,
                    generateLayoutContent,
                    reversible,
                    expected: {
                        node: expectedNode,
                        offset: expectedOffset,
                        content: expectedContent,
                        remainder: expectedRemainder
                    }
                } = testDataItem;

                node = querySelectorTextNode(testElement, node);
                expectedNode = querySelectorTextNode(testElement, expectedNode);

                // Standard test
                {
                    const scanner = new DOMTextScanner(node, offset, forcePreserveWhitespace, generateLayoutContent);
                    scanner.seek(length);

                    const {node: actualNode1, offset: actualOffset1, content: actualContent1, remainder: actualRemainder1} = scanner;
                    expect(actualContent1).toStrictEqual(expectedContent);
                    expect(actualOffset1).toStrictEqual(expectedOffset);
                    expect(actualNode1).toStrictEqual(expectedNode);
                    expect(actualRemainder1).toStrictEqual(expectedRemainder || 0);
                }

                // Substring tests
                for (let i = 1; i <= length; ++i) {
                    const scanner = new DOMTextScanner(node, offset, forcePreserveWhitespace, generateLayoutContent);
                    scanner.seek(length - i);

                    const {content: actualContent} = scanner;
                    expect(actualContent).toStrictEqual(expectedContent.substring(0, expectedContent.length - i));
                }

                if (reversible === false) { continue; }

                // Reversed test
                {
                    const scanner = new DOMTextScanner(expectedNode, expectedOffset, forcePreserveWhitespace, generateLayoutContent);
                    scanner.seek(-length);

                    const {content: actualContent} = scanner;
                    expect(actualContent).toStrictEqual(expectedContent);
                }

                // Reversed substring tests
                for (let i = 1; i <= length; ++i) {
                    const scanner = new DOMTextScanner(expectedNode, expectedOffset, forcePreserveWhitespace, generateLayoutContent);
                    scanner.seek(-(length - i));

                    const {content: actualContent} = scanner;
                    expect(actualContent).toStrictEqual(expectedContent.substring(i));
                }
            }
        }
    });
}


/** */
async function testDocument1() {
    const dom = createJSDOM(path.join(__dirname, 'data', 'html', 'test-dom-text-scanner.html'));
    const window = dom.window;
    try {
        window.getComputedStyle = createAbsoluteGetComputedStyle(window);

        await testDomTextScanner(dom);
    } finally {
        window.close();
    }
}


/** */
async function main() {
    await testDocument1();
}

await main();
