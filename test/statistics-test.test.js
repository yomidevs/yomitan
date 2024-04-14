//src/components/__tests/example.test.js
import {afterAll, describe, expect, test} from "vitest";
import {setupDomTest} from './fixtures/dom-test.js';
import path from 'path';
import {fileURLToPath} from 'node:url';
import {parseJson} from '../dev/json.js';
import {DOMTextScanner} from '../ext/js/dom/dom-text-scanner.js';
const dirname = path.dirname(fileURLToPath(import.meta.url));

const domTestEnv = await setupDomTest(path.join(dirname, 'data/html/statistics.html'));

/**
 * @param {Element} element
 * @param {string} selector
 * @returns {?Node}
*/

function querySelectorTextNode(element, selector) {
    let textIndex = -1;
    const match = /::text$|::nth-text\((\d+)\)$/.exec(selector);
    console.log(match)
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

describe('Statistics', () => {
    const {window, teardown} = domTestEnv;
    afterAll(() => teardown(global));
    test('Seek tests', () => {
        const {document} = window;

        for (const testElement of /** @type {NodeListOf<HTMLElement>} */ (document.querySelectorAll('test-case'))) {
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
                        remainder: expectedRemainder
                    }
                } = testDataItem;
             

                const node = querySelectorTextNode(testElement, nodeSelector);
                const expectedNode = querySelectorTextNode(testElement, expectedNodeSelector);

                expect(node).not.toEqual(null);
                expect(expectedNode).not.toEqual(null);
                if (node === null || expectedNode === null) { continue; }

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


            }
        }
    });



    // test scanned no items + check, then reset date and check

    // test scanned 1 item + check, then reset date and check

    // test scanned 10 items + check, then reset date and check

})

