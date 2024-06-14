/*
 * Copyright (C) 2024  Yomitan Authors
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

import {computeZoomScale, isPointInAnyRect} from './document-util.js';
import {DOMTextScanner} from './dom-text-scanner.js';
import {TextSourceElement} from './text-source-element.js';
import {TextSourceRange} from './text-source-range.js';

export class TextSourceGenerator {
    constructor() {
        /** @type {RegExp} @readonly */
        this._transparentColorPattern = /rgba\s*\([^)]*,\s*0(?:\.0+)?\s*\)/;
        /** @type {import('text-source-generator').GetRangeFromPointHandler[]} @readonly */
        this._getRangeFromPointHandlers = [];
    }

    /**
     * @param {number} x
     * @param {number} y
     * @param {import('document-util').GetRangeFromPointOptions} options
     * @returns {?import('text-source').TextSource}
     */
    getRangeFromPoint(x, y, options) {
        for (const handler of this._getRangeFromPointHandlers) {
            const result = handler(x, y, options);
            if (result !== null) { return result; }
        }
        return this._getRangeFromPointInternal(x, y, options);
    }

    /**
     * Registers a custom handler for scanning for text or elements at the input position.
     * @param {import('text-source-generator').GetRangeFromPointHandler} handler The handler callback which will be invoked when calling `getRangeFromPoint`.
     */
    registerGetRangeFromPointHandler(handler) {
        this._getRangeFromPointHandlers.push(handler);
    }

    /**
     * Extract a sentence from a document.
     * @param {import('text-source').TextSource} source The text source object, either `TextSourceRange` or `TextSourceElement`.
     * @param {boolean} layoutAwareScan Whether or not layout-aware scan mode should be used.
     * @param {number} extent The length of the sentence to extract.
     * @param {boolean} terminateAtNewlines Whether or not a sentence should be terminated at newline characters.
     * @param {import('text-scanner').SentenceTerminatorMap} terminatorMap A mapping of characters that terminate a sentence.
     * @param {import('text-scanner').SentenceForwardQuoteMap} forwardQuoteMap A mapping of quote characters that delimit a sentence.
     * @param {import('text-scanner').SentenceBackwardQuoteMap} backwardQuoteMap A mapping of quote characters that delimit a sentence, which is the inverse of forwardQuoteMap.
     * @returns {{text: string, offset: number}} The sentence and the offset to the original source.
     */
    extractSentence(source, layoutAwareScan, extent, terminateAtNewlines, terminatorMap, forwardQuoteMap, backwardQuoteMap) {
        // Scan text
        source = source.clone();
        const startLength = source.setStartOffset(extent, layoutAwareScan);
        const endLength = source.setEndOffset(extent * 2 - startLength, true, layoutAwareScan);
        const text = source.text();
        const textLength = text.length;
        const textEndAnchor = textLength - endLength;

        /** Relative start position of the sentence (inclusive). */
        let cursorStart = startLength;
        /** Relative end position of the sentence (exclusive). */
        let cursorEnd = textEndAnchor;

        // Move backward
        let quoteStack = [];
        for (; cursorStart > 0; --cursorStart) {
            // Check if the previous character should be included.
            let c = text[cursorStart - 1];
            if (c === '\n' && terminateAtNewlines) { break; }

            if (quoteStack.length === 0) {
                let terminatorInfo = terminatorMap.get(c);
                if (typeof terminatorInfo !== 'undefined') {
                    // Include the previous character while it is a terminator character and is included at start.
                    while (terminatorInfo[0] && cursorStart > 0) {
                        --cursorStart;
                        if (cursorStart === 0) { break; }
                        c = text[cursorStart - 1];
                        terminatorInfo = terminatorMap.get(c);
                        if (typeof terminatorInfo === 'undefined') { break; }
                    }
                    break;
                }
            }

            let quoteInfo = forwardQuoteMap.get(c);
            if (typeof quoteInfo !== 'undefined') {
                if (quoteStack.length === 0) {
                    // Include the previous character while it is a quote character and is included at start.
                    while (quoteInfo[1] && cursorStart > 0) {
                        --cursorStart;
                        if (cursorStart === 0) { break; }
                        c = text[cursorStart - 1];
                        quoteInfo = forwardQuoteMap.get(c);
                        if (typeof quoteInfo === 'undefined') { break; }
                    }
                    break;
                } else if (quoteStack[0] === c) {
                    quoteStack.pop();
                    continue;
                }
            }

            quoteInfo = backwardQuoteMap.get(c);
            if (typeof quoteInfo !== 'undefined') {
                quoteStack.unshift(quoteInfo[0]);
            }
        }

        // Move forward
        quoteStack = [];
        for (; cursorEnd < textLength; ++cursorEnd) {
            // Check if the following character should be included.
            let c = text[cursorEnd];
            if (c === '\n' && terminateAtNewlines) { break; }

            if (quoteStack.length === 0) {
                let terminatorInfo = terminatorMap.get(c);
                if (typeof terminatorInfo !== 'undefined') {
                    // Include the following character while it is a terminator character and is included at end.
                    while (terminatorInfo[1] && cursorEnd < textLength) {
                        ++cursorEnd;
                        if (cursorEnd === textLength) { break; }
                        c = text[cursorEnd];
                        terminatorInfo = terminatorMap.get(c);
                        if (typeof terminatorInfo === 'undefined') { break; }
                    }
                    break;
                }
            }

            let quoteInfo = backwardQuoteMap.get(c);
            if (typeof quoteInfo !== 'undefined') {
                if (quoteStack.length === 0) {
                    // Include the following character while it is a quote character and is included at end.
                    while (quoteInfo[1] && cursorEnd < textLength) {
                        ++cursorEnd;
                        if (cursorEnd === textLength) { break; }
                        c = text[cursorEnd];
                        quoteInfo = forwardQuoteMap.get(c);
                        if (typeof quoteInfo === 'undefined') { break; }
                    }
                    break;
                } else if (quoteStack[0] === c) {
                    quoteStack.pop();
                    continue;
                }
            }

            quoteInfo = forwardQuoteMap.get(c);
            if (typeof quoteInfo !== 'undefined') {
                quoteStack.unshift(quoteInfo[0]);
            }
        }

        // Trim whitespace
        for (; cursorStart < startLength && this._isWhitespace(text[cursorStart]); ++cursorStart) { /* NOP */ }
        for (; cursorEnd > textEndAnchor && this._isWhitespace(text[cursorEnd - 1]); --cursorEnd) { /* NOP */ }

        // Result
        return {
            text: text.substring(cursorStart, cursorEnd),
            offset: startLength - cursorStart,
        };
    }

    /**
     * Scans the document for text or elements with text information at the given coordinate.
     * Coordinates are provided in [client space](https://developer.mozilla.org/en-US/docs/Web/CSS/CSSOM_View/Coordinate_systems).
     * @param {number} x The x coordinate to search at.
     * @param {number} y The y coordinate to search at.
     * @param {import('document-util').GetRangeFromPointOptions} options Options to configure how element detection is performed.
     * @returns {?import('text-source').TextSource} A range for the hovered text or element, or `null` if no applicable content was found.
     */
    _getRangeFromPointInternal(x, y, options) {
        const {deepContentScan, normalizeCssZoom} = options;

        const elements = this._getElementsFromPoint(x, y, deepContentScan);
        /** @type {?HTMLDivElement} */
        let imposter = null;
        /** @type {?HTMLDivElement} */
        let imposterContainer = null;
        /** @type {?Element} */
        let imposterSourceElement = null;
        if (elements.length > 0) {
            const element = elements[0];
            switch (element.nodeName.toUpperCase()) {
                case 'IMG':
                case 'BUTTON':
                case 'SELECT':
                    return TextSourceElement.create(element);
                case 'INPUT':
                    if (/** @type {HTMLInputElement} */ (element).type === 'text') {
                        imposterSourceElement = element;
                        [imposter, imposterContainer] = this._createImposter(/** @type {HTMLInputElement} */ (element), false);
                    }
                    break;
                case 'TEXTAREA':
                    imposterSourceElement = element;
                    [imposter, imposterContainer] = this._createImposter(/** @type {HTMLTextAreaElement} */ (element), true);
                    break;
            }
        }

        const range = this._caretRangeFromPointExt(x, y, deepContentScan ? elements : [], normalizeCssZoom);
        if (range !== null) {
            if (imposter !== null) {
                this._setImposterStyle(/** @type {HTMLDivElement} */ (imposterContainer).style, 'z-index', '-2147483646');
                this._setImposterStyle(imposter.style, 'pointer-events', 'none');
                return TextSourceRange.createFromImposter(range, /** @type {HTMLDivElement} */ (imposterContainer), /** @type {HTMLElement} */ (imposterSourceElement));
            }
            return TextSourceRange.create(range);
        } else {
            if (imposterContainer !== null) {
                const {parentNode} = imposterContainer;
                if (parentNode !== null) {
                    parentNode.removeChild(imposterContainer);
                }
            }
            return null;
        }
    }

    /**
     * @param {CSSStyleDeclaration} style
     * @param {string} propertyName
     * @param {string} value
     */
    _setImposterStyle(style, propertyName, value) {
        style.setProperty(propertyName, value, 'important');
    }

    /**
     * @param {HTMLInputElement|HTMLTextAreaElement} element
     * @param {boolean} isTextarea
     * @returns {[imposter: ?HTMLDivElement, container: ?HTMLDivElement]}
     */
    _createImposter(element, isTextarea) {
        const body = document.body;
        if (body === null) { return [null, null]; }

        const elementStyle = window.getComputedStyle(element);
        const elementRect = element.getBoundingClientRect();
        const documentRect = document.documentElement.getBoundingClientRect();
        let left = elementRect.left - documentRect.left;
        let top = elementRect.top - documentRect.top;

        // Container
        const container = document.createElement('div');
        const containerStyle = container.style;
        this._setImposterStyle(containerStyle, 'all', 'initial');
        this._setImposterStyle(containerStyle, 'position', 'absolute');
        this._setImposterStyle(containerStyle, 'left', '0');
        this._setImposterStyle(containerStyle, 'top', '0');
        this._setImposterStyle(containerStyle, 'width', `${documentRect.width}px`);
        this._setImposterStyle(containerStyle, 'height', `${documentRect.height}px`);
        this._setImposterStyle(containerStyle, 'overflow', 'hidden');
        this._setImposterStyle(containerStyle, 'opacity', '0');
        this._setImposterStyle(containerStyle, 'pointer-events', 'none');
        this._setImposterStyle(containerStyle, 'z-index', '2147483646');

        // Imposter
        const imposter = document.createElement('div');
        const imposterStyle = imposter.style;

        let value = element.value;
        if (value.endsWith('\n')) { value += '\n'; }
        imposter.textContent = value;

        for (let i = 0, ii = elementStyle.length; i < ii; ++i) {
            const property = elementStyle[i];
            this._setImposterStyle(imposterStyle, property, elementStyle.getPropertyValue(property));
        }
        this._setImposterStyle(imposterStyle, 'position', 'absolute');
        this._setImposterStyle(imposterStyle, 'top', `${top}px`);
        this._setImposterStyle(imposterStyle, 'left', `${left}px`);
        this._setImposterStyle(imposterStyle, 'margin', '0');
        this._setImposterStyle(imposterStyle, 'pointer-events', 'auto');

        if (isTextarea) {
            if (elementStyle.overflow === 'visible') {
                this._setImposterStyle(imposterStyle, 'overflow', 'auto');
            }
        } else {
            this._setImposterStyle(imposterStyle, 'overflow', 'hidden');
            this._setImposterStyle(imposterStyle, 'white-space', 'nowrap');
            this._setImposterStyle(imposterStyle, 'line-height', elementStyle.height);
        }

        container.appendChild(imposter);
        body.appendChild(container);

        // Adjust size
        const imposterRect = imposter.getBoundingClientRect();
        if (imposterRect.width !== elementRect.width || imposterRect.height !== elementRect.height) {
            const width = Number.parseFloat(elementStyle.width) + (elementRect.width - imposterRect.width);
            const height = Number.parseFloat(elementStyle.height) + (elementRect.height - imposterRect.height);
            this._setImposterStyle(imposterStyle, 'width', `${width}px`);
            this._setImposterStyle(imposterStyle, 'height', `${height}px`);
        }
        if (imposterRect.left !== elementRect.left || imposterRect.top !== elementRect.top) {
            left += (elementRect.left - imposterRect.left);
            top += (elementRect.top - imposterRect.top);
            this._setImposterStyle(imposterStyle, 'left', `${left}px`);
            this._setImposterStyle(imposterStyle, 'top', `${top}px`);
        }

        imposter.scrollTop = element.scrollTop;
        imposter.scrollLeft = element.scrollLeft;

        return [imposter, container];
    }

    /**
     * @param {number} x
     * @param {number} y
     * @param {boolean} all
     * @returns {Element[]}
     */
    _getElementsFromPoint(x, y, all) {
        if (all) {
            // document.elementsFromPoint can return duplicates which must be removed.
            const elements = document.elementsFromPoint(x, y);
            return elements.filter((e, i) => elements.indexOf(e) === i);
        }

        const e = document.elementFromPoint(x, y);
        return e !== null ? [e] : [];
    }

    /**
     * @param {number} x
     * @param {number} y
     * @param {Range} range
     * @param {boolean} normalizeCssZoom
     * @returns {boolean}
     */
    _isPointInRange(x, y, range, normalizeCssZoom) {
        // Require a text node to start
        const {startContainer} = range;
        if (startContainer.nodeType !== Node.TEXT_NODE) {
            return false;
        }

        // Convert CSS zoom coordinates
        if (normalizeCssZoom) {
            const scale = computeZoomScale(startContainer);
            x /= scale;
            y /= scale;
        }

        // Scan forward
        const nodePre = range.endContainer;
        const offsetPre = range.endOffset;
        try {
            const {node, offset, content} = new DOMTextScanner(nodePre, offsetPre, true, false).seek(1);
            range.setEnd(node, offset);

            if (!this._isWhitespace(content) && isPointInAnyRect(x, y, range.getClientRects())) {
                return true;
            }
        } finally {
            range.setEnd(nodePre, offsetPre);
        }

        // Scan backward
        const {node, offset, content} = new DOMTextScanner(startContainer, range.startOffset, true, false).seek(-1);
        range.setStart(node, offset);

        if (!this._isWhitespace(content) && isPointInAnyRect(x, y, range.getClientRects())) {
            // This purposefully leaves the starting offset as modified and sets the range length to 0.
            range.setEnd(node, offset);
            return true;
        }

        // No match
        return false;
    }

    /**
     * @param {number} x
     * @param {number} y
     * @returns {?Range}
     */
    _caretRangeFromPoint(x, y) {
        if (typeof document.caretRangeFromPoint === 'function') {
            // Chrome, Edge
            return document.caretRangeFromPoint(x, y);
        }

        // @ts-expect-error - caretPositionFromPoint is non-standard
        if (typeof document.caretPositionFromPoint === 'function') {
            // Firefox
            return this._caretPositionFromPoint(x, y);
        }

        // No support
        return null;
    }

    /**
     * @param {number} x
     * @param {number} y
     * @returns {?Range}
     */
    _caretPositionFromPoint(x, y) {
        // @ts-expect-error - caretPositionFromPoint is non-standard
        const position = /** @type {(x: number, y: number) => ?{offsetNode: Node, offset: number}} */ (document.caretPositionFromPoint)(x, y);
        if (position === null) {
            return null;
        }
        const node = position.offsetNode;
        if (node === null) {
            return null;
        }

        let offset = 0;
        const {nodeType} = node;
        switch (nodeType) {
            case Node.TEXT_NODE:
                offset = position.offset;
                break;
            case Node.ELEMENT_NODE:
                // Elements with user-select: all will return the element
                // instead of a text point inside the element.
                if (this._isElementUserSelectAll(/** @type {Element} */ (node))) {
                    return this._caretPositionFromPointNormalizeStyles(x, y, /** @type {Element} */ (node));
                }
                break;
        }

        try {
            const range = document.createRange();
            range.setStart(node, offset);
            range.setEnd(node, offset);
            return range;
        } catch (e) {
            // Firefox throws new DOMException("The operation is insecure.")
            // when trying to select a node from within a ShadowRoot.
            return null;
        }
    }

    /**
     * @param {number} x
     * @param {number} y
     * @param {Element} nextElement
     * @returns {?Range}
     */
    _caretPositionFromPointNormalizeStyles(x, y, nextElement) {
        /** @type {Map<Element, ?string>} */
        const previousStyles = new Map();
        try {
            while (true) {
                if (nextElement instanceof HTMLElement) {
                    this._recordPreviousStyle(previousStyles, nextElement);
                    nextElement.style.setProperty('user-select', 'text', 'important');
                }

                // @ts-expect-error - caretPositionFromPoint is non-standard
                const position = /** @type {(x: number, y: number) => ?{offsetNode: Node, offset: number}} */ (document.caretPositionFromPoint)(x, y);
                if (position === null) {
                    return null;
                }
                const node = position.offsetNode;
                if (node === null) {
                    return null;
                }

                let offset = 0;
                const {nodeType} = node;
                switch (nodeType) {
                    case Node.TEXT_NODE:
                        offset = position.offset;
                        break;
                    case Node.ELEMENT_NODE:
                        // Elements with user-select: all will return the element
                        // instead of a text point inside the element.
                        if (this._isElementUserSelectAll(/** @type {Element} */ (node))) {
                            if (previousStyles.has(/** @type {Element} */ (node))) {
                                // Recursive
                                return null;
                            }
                            nextElement = /** @type {Element} */ (node);
                            continue;
                        }
                        break;
                }

                try {
                    const range = document.createRange();
                    range.setStart(node, offset);
                    range.setEnd(node, offset);
                    return range;
                } catch (e) {
                    // Firefox throws new DOMException("The operation is insecure.")
                    // when trying to select a node from within a ShadowRoot.
                    return null;
                }
            }
        } finally {
            this._revertStyles(previousStyles);
        }
    }

    /**
     * @param {number} x
     * @param {number} y
     * @param {Element[]} elements
     * @param {boolean} normalizeCssZoom
     * @returns {?Range}
     */
    _caretRangeFromPointExt(x, y, elements, normalizeCssZoom) {
        /** @type {?Map<Element, ?string>} */
        let previousStyles = null;
        try {
            let i = 0;
            let startContinerPre = null;
            while (true) {
                const range = this._caretRangeFromPoint(x, y);
                if (range === null) {
                    return null;
                }

                const startContainer = range.startContainer;
                if (startContinerPre !== startContainer) {
                    if (this._isPointInRange(x, y, range, normalizeCssZoom)) {
                        return range;
                    }
                    startContinerPre = startContainer;
                }

                if (previousStyles === null) { previousStyles = new Map(); }
                i = this._disableTransparentElement(elements, i, previousStyles);
                if (i < 0) {
                    return null;
                }
            }
        } finally {
            if (previousStyles !== null && previousStyles.size > 0) {
                this._revertStyles(previousStyles);
            }
        }
    }

    /**
     * @param {Element[]} elements
     * @param {number} i
     * @param {Map<Element, ?string>} previousStyles
     * @returns {number}
     */
    _disableTransparentElement(elements, i, previousStyles) {
        while (true) {
            if (i >= elements.length) {
                return -1;
            }

            const element = elements[i++];
            if (this._isElementTransparent(element)) {
                if (element instanceof HTMLElement) {
                    this._recordPreviousStyle(previousStyles, element);
                    element.style.setProperty('pointer-events', 'none', 'important');
                }
                return i;
            }
        }
    }

    /**
     * @param {Map<Element, ?string>} previousStyles
     * @param {Element} element
     */
    _recordPreviousStyle(previousStyles, element) {
        if (previousStyles.has(element)) { return; }
        const style = element.hasAttribute('style') ? element.getAttribute('style') : null;
        previousStyles.set(element, style);
    }

    /**
     * @param {Map<Element, ?string>} previousStyles
     */
    _revertStyles(previousStyles) {
        for (const [element, style] of previousStyles.entries()) {
            if (style === null) {
                element.removeAttribute('style');
            } else {
                element.setAttribute('style', style);
            }
        }
    }

    /**
     * @param {Element} element
     * @returns {boolean}
     */
    _isElementTransparent(element) {
        if (
            element === document.body ||
            element === document.documentElement
        ) {
            return false;
        }
        const style = window.getComputedStyle(element);
        return (
            Number.parseFloat(style.opacity) <= 0 ||
            style.visibility === 'hidden' ||
            (style.backgroundImage === 'none' && this._isColorTransparent(style.backgroundColor))
        );
    }

    /**
     * @param {string} cssColor
     * @returns {boolean}
     */
    _isColorTransparent(cssColor) {
        return this._transparentColorPattern.test(cssColor);
    }

    /**
     * @param {Element} element
     * @returns {boolean}
     */
    _isElementUserSelectAll(element) {
        return getComputedStyle(element).userSelect === 'all';
    }

    /**
     * @param {string} string
     * @returns {boolean}
     */
    _isWhitespace(string) {
        return string.trim().length === 0;
    }
}
