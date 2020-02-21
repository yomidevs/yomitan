const fs = require('fs');
const path = require('path');
const assert = require('assert');
const {JSDOM} = require('jsdom');
const yomichanTest = require('./yomichan-test');


// DOMRect class definition
class DOMRect {
    constructor(x, y, width, height) {
        this._x = x;
        this._y = y;
        this._width = width;
        this._height = height;
    }

    get x() { return this._x; }
    get y() { return this._y; }
    get width() { return this._width; }
    get height() { return this._height; }
    get left() { return this._x + Math.min(0, this._width); }
    get right() { return this._x + Math.max(0, this._width); }
    get top() { return this._y + Math.min(0, this._height); }
    get bottom() { return this._y + Math.max(0, this._height); }
}


function createJSDOM(fileName) {
    const domSource = fs.readFileSync(fileName, {encoding: 'utf8'});
    const dom = new JSDOM(domSource);
    const document = dom.window.document;
    const window = dom.window;

    // Define innerText setter as an alias for textContent setter
    Object.defineProperty(window.HTMLDivElement.prototype, 'innerText', {
        set(value) { this.textContent = value; }
    });

    // Placeholder for feature detection
    document.caretRangeFromPoint = () => null;

    return dom;
}

function querySelectorChildOrSelf(element, selector) {
    return selector ? element.querySelector(selector) : element;
}

function getChildTextNodeOrSelf(dom, node) {
    if (node === null) { return null; }
    const Node = dom.window.Node;
    const childNode = node.firstChild;
    return (childNode !== null && childNode.nodeType === Node.TEXT_NODE ? childNode : node);
}

function getPrototypeOfOrNull(value) {
    try {
        return Object.getPrototypeOf(value);
    } catch (e) {
        return null;
    }
}

function findImposterElement(document) {
    // Finds the imposter element based on it's z-index style
    return document.querySelector('div[style*="2147483646"]>*');
}


async function testDocument1() {
    const dom = createJSDOM(path.join(__dirname, 'data', 'html', 'test-document1.html'));
    const window = dom.window;
    const document = window.document;
    const Node = window.Node;
    const Range = window.Range;

    const {DOM} = yomichanTest.requireScript(
        'ext/mixed/js/dom.js',
        ['DOM']
    );
    const {TextSourceRange, TextSourceElement} = yomichanTest.requireScript(
        'ext/fg/js/source.js',
        ['TextSourceRange', 'TextSourceElement'],
        {document, window, Range, Node}
    );
    const {docRangeFromPoint, docSentenceExtract} = yomichanTest.requireScript(
        'ext/fg/js/document.js',
        ['docRangeFromPoint', 'docSentenceExtract'],
        {document, window, Node, TextSourceElement, TextSourceRange, DOM}
    );

    try {
        await testDocument1Inner(dom, {docRangeFromPoint, docSentenceExtract, TextSourceRange, TextSourceElement});
    } finally {
        window.close();
    }
}

async function testDocument1Inner(dom, {docRangeFromPoint, docSentenceExtract, TextSourceRange, TextSourceElement}) {
    const document = dom.window.document;

    for (const testElement of document.querySelectorAll('.test')) {
        // Get test parameters
        let {
            elementFromPointSelector,
            caretRangeFromPointSelector,
            startNodeSelector,
            startOffset,
            endNodeSelector,
            endOffset,
            resultType,
            sentenceExtent,
            sentence,
            hasImposter
        } = testElement.dataset;

        const elementFromPointValue = querySelectorChildOrSelf(testElement, elementFromPointSelector);
        const caretRangeFromPointValue = querySelectorChildOrSelf(testElement, caretRangeFromPointSelector);
        const startNode = getChildTextNodeOrSelf(dom, querySelectorChildOrSelf(testElement, startNodeSelector));
        const endNode = getChildTextNodeOrSelf(dom, querySelectorChildOrSelf(testElement, endNodeSelector));

        startOffset = parseInt(startOffset, 10);
        endOffset = parseInt(endOffset, 10);
        sentenceExtent = parseInt(sentenceExtent, 10);

        assert.notStrictEqual(elementFromPointValue, null);
        assert.notStrictEqual(caretRangeFromPointValue, null);
        assert.notStrictEqual(startNode, null);
        assert.notStrictEqual(endNode, null);

        // Setup functions
        document.elementFromPoint = () => elementFromPointValue;

        document.caretRangeFromPoint = (x, y) => {
            const imposter = getChildTextNodeOrSelf(dom, findImposterElement(document));
            assert.strictEqual(!!imposter, hasImposter === 'true');

            const range = document.createRange();
            range.setStart(imposter ? imposter : startNode, startOffset);
            range.setEnd(imposter ? imposter : startNode, endOffset);

            // Override getClientRects to return a rect guaranteed to contain (x, y)
            range.getClientRects = () => [new DOMRect(x - 1, y - 1, 2, 2)];
            return range;
        };

        // Test docRangeFromPoint
        const source = docRangeFromPoint(0, 0, false);
        switch (resultType) {
            case 'TextSourceRange':
                assert.strictEqual(getPrototypeOfOrNull(source), TextSourceRange.prototype);
                break;
            case 'TextSourceElement':
                assert.strictEqual(getPrototypeOfOrNull(source), TextSourceElement.prototype);
                break;
            case 'null':
                assert.strictEqual(source, null);
                break;
            default:
                assert.ok(false);
                break;
        }
        if (source === null) { continue; }

        // Test docSentenceExtract
        const sentenceActual = docSentenceExtract(source, sentenceExtent).text;
        assert.strictEqual(sentenceActual, sentence);

        // Clean
        source.cleanup();
    }
}


async function main() {
    await testDocument1();
}


if (require.main === module) { main(); }
