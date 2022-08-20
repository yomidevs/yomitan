/*
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

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const {JSDOM} = require('jsdom');
const {testMain} = require('../dev/util');
const {VM} = require('../dev/vm');


function createJSDOM(fileName) {
    const domSource = fs.readFileSync(fileName, {encoding: 'utf8'});
    return new JSDOM(domSource);
}

function querySelectorTextNode(element, selector) {
    let textIndex = -1;
    const match = /::text$|::nth-text\((\d+)\)$/.exec(selector);
    if (match !== null) {
        textIndex = (match[1] ? parseInt(match[1], 10) - 1 : 0);
        selector = selector.substring(0, selector.length - match[0].length);
    }
    const result = element.querySelector(selector);
    if (textIndex < 0) {
        return result;
    }
    for (let n = result.firstChild; n !== null; n = n.nextSibling) {
        if (n.nodeType === n.constructor.TEXT_NODE) {
            if (textIndex === 0) {
                return n;
            }
            --textIndex;
        }
    }
    return null;
}


function getComputedFontSizeInPixels(window, getComputedStyle, element) {
    for (; element !== null; element = element.parentNode) {
        if (element.nodeType === window.Node.ELEMENT_NODE) {
            const fontSize = getComputedStyle(element).fontSize;
            if (fontSize.endsWith('px')) {
                const value = parseFloat(fontSize.substring(0, fontSize.length - 2));
                return value;
            }
        }
    }
    const defaultFontSize = 14;
    return defaultFontSize;
}

function createAbsoluteGetComputedStyle(window) {
    // Wrapper to convert em units to px units
    const getComputedStyleOld = window.getComputedStyle.bind(window);
    return (element, ...args) => {
        const style = getComputedStyleOld(element, ...args);
        return new Proxy(style, {
            get: (target, property) => {
                let result = target[property];
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


async function testDomTextScanner(dom, {DOMTextScanner}) {
    const document = dom.window.document;
    for (const testElement of document.querySelectorAll('y-test')) {
        let testData = JSON.parse(testElement.dataset.testData);
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
                assert.strictEqual(actualContent1, expectedContent);
                assert.strictEqual(actualOffset1, expectedOffset);
                assert.strictEqual(actualNode1, expectedNode);
                assert.strictEqual(actualRemainder1, expectedRemainder || 0);
            }

            // Substring tests
            for (let i = 1; i <= length; ++i) {
                const scanner = new DOMTextScanner(node, offset, forcePreserveWhitespace, generateLayoutContent);
                scanner.seek(length - i);

                const {content: actualContent} = scanner;
                assert.strictEqual(actualContent, expectedContent.substring(0, expectedContent.length - i));
            }

            if (reversible === false) { continue; }

            // Reversed test
            {
                const scanner = new DOMTextScanner(expectedNode, expectedOffset, forcePreserveWhitespace, generateLayoutContent);
                scanner.seek(-length);

                const {content: actualContent} = scanner;
                assert.strictEqual(actualContent, expectedContent);
            }

            // Reversed substring tests
            for (let i = 1; i <= length; ++i) {
                const scanner = new DOMTextScanner(expectedNode, expectedOffset, forcePreserveWhitespace, generateLayoutContent);
                scanner.seek(-(length - i));

                const {content: actualContent} = scanner;
                assert.strictEqual(actualContent, expectedContent.substring(i));
            }
        }
    }
}


async function testDocument1() {
    const dom = createJSDOM(path.join(__dirname, 'data', 'html', 'test-dom-text-scanner.html'));
    const window = dom.window;
    try {
        const {document, Node, Range} = window;

        window.getComputedStyle = createAbsoluteGetComputedStyle(window);

        const vm = new VM({document, window, Range, Node});
        vm.execute([
            'js/data/sandbox/string-util.js',
            'js/dom/dom-text-scanner.js'
        ]);
        const DOMTextScanner = vm.get('DOMTextScanner');

        await testDomTextScanner(dom, {DOMTextScanner});
    } finally {
        window.close();
    }
}


async function main() {
    await testDocument1();
}


if (require.main === module) { testMain(main); }
