//src/components/__tests/example.test.js
import {afterAll, beforeEach, describe, expect, test, it, vi} from "vitest";
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

function setNewDate() {
    var date = new Date();
    date.setDate(date.getDate() + 1)
    vi.setSystemTime(date)
}

function setDateBack() {
    vi.setSystemTime(new Date())
}

describe('Statistics', () => {
    const {window, teardown} = domTestEnv;
    afterAll(() => teardown(global));

    let counter = 0 // VERY DUMB HACK - CANT FIGURE OUT HOW TO BREAK THE FOR LOOP INTO INDIVIDUAL ELEMENTS...
    test('Scan 0 check', () => {
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
                    if (counter == 0) { // test first case
                        counter += 1
                        chrome.storage.local.get('numSelects', function(data) {
                            expect(data.numSelects).toStrictEqual(0);
                        });
                        break
                    }
                }


            }
        }
        setNewDate()
        chrome.storage.local.get('numSelects', function(data) {
            expect(data.numSelects).toStrictEqual(0);
        });
        setDateBack()
    });

    test('Scan 1 check', () => {
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
                    if (counter == 1) { // test second case
                        counter += 1
                        chrome.storage.local.get('numSelects', function(data) {
                            expect(data.numSelects).toStrictEqual(1);
                        });
                        break
                    }
                }


            }
        }
        setNewDate()
        chrome.storage.local.get('numSelects', function(data) {
            expect(data.numSelects).toStrictEqual(0);
        });
        setDateBack()
    });

    test('Scan 3 check', () => {
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
                    if (counter == 2) { // test first case
                        counter += 1
                        chrome.storage.local.get('numSelects', function(data) {
                            expect(data.numSelects).toStrictEqual(3);
                        });
                        break
                    }
                }


            }
        }
        setNewDate()
        chrome.storage.local.get('numSelects', function(data) {
            expect(data.numSelects).toStrictEqual(0);
        });
        setDateBack()
    });





})

