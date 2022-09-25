/*
 * Copyright (C) 2016-2022  Yomichan Authors
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

/* global
 * DOMTextScanner
 * TextSourceElement
 * TextSourceRange
 */

class DocumentUtil {
    /**
     * Options to configure how element detection is performed.
     * @typedef {object} GetRangeFromPointOptions
     * @property {boolean} deepContentScan Whether or deep content scanning should be performed. When deep content scanning is enabled,
     *   some transparent overlay elements will be ignored when looking for the element at the input position.
     * @property {boolean} normalizeCssZoom Whether or not zoom coordinates should be normalized.
     */

    /**
     * Scans the document for text or elements with text information at the given coordinate.
     * Coordinates are provided in [client space](https://developer.mozilla.org/en-US/docs/Web/CSS/CSSOM_View/Coordinate_systems).
     * @callback GetRangeFromPointHandler
     * @param {number} x The x coordinate to search at.
     * @param {number} y The y coordinate to search at.
     * @param {GetRangeFromPointOptions} options Options to configure how element detection is performed.
     * @returns {?TextSourceRange|TextSourceElement} A range for the hovered text or element, or `null` if no applicable content was found.
     */

    /**
     * Scans the document for text or elements with text information at the given coordinate.
     * Coordinates are provided in [client space](https://developer.mozilla.org/en-US/docs/Web/CSS/CSSOM_View/Coordinate_systems).
     * @param {number} x The x coordinate to search at.
     * @param {number} y The y coordinate to search at.
     * @param {GetRangeFromPointOptions} options Options to configure how element detection is performed.
     * @returns {?TextSourceRange|TextSourceElement} A range for the hovered text or element, or `null` if no applicable content was found.
     */
    static getRangeFromPoint(x, y, options) {
        for (const handler of this._getRangeFromPointHandlers) {
            const r = handler(x, y, options);
            if (r !== null) { return r; }
        }

        const {deepContentScan, normalizeCssZoom} = options;

        const elements = this._getElementsFromPoint(x, y, deepContentScan);
        let imposter = null;
        let imposterContainer = null;
        let imposterSourceElement = null;
        if (elements.length > 0) {
            const element = elements[0];
            switch (element.nodeName.toUpperCase()) {
                case 'IMG':
                case 'BUTTON':
                case 'SELECT':
                    return TextSourceElement.create(element);
                case 'INPUT':
                    if (element.type === 'text') {
                        imposterSourceElement = element;
                        [imposter, imposterContainer] = this._createImposter(element, false);
                    }
                    break;
                case 'TEXTAREA':
                    imposterSourceElement = element;
                    [imposter, imposterContainer] = this._createImposter(element, true);
                    break;
            }
        }

        const range = this._caretRangeFromPointExt(x, y, deepContentScan ? elements : [], normalizeCssZoom);
        if (range !== null) {
            if (imposter !== null) {
                this._setImposterStyle(imposterContainer.style, 'z-index', '-2147483646');
                this._setImposterStyle(imposter.style, 'pointer-events', 'none');
                return TextSourceRange.createFromImposter(range, imposterContainer, imposterSourceElement);
            }
            return TextSourceRange.create(range);
        } else {
            if (imposterContainer !== null) {
                imposterContainer.parentNode.removeChild(imposterContainer);
            }
            return null;
        }
    }

    /**
     * Registers a custom handler for scanning for text or elements at the input position.
     * @param {GetRangeFromPointHandler} handler The handler callback which will be invoked when calling `getRangeFromPoint`.
     */
    static registerGetRangeFromPointHandler(handler) {
        this._getRangeFromPointHandlers.push(handler);
    }

    /**
     * Extract a sentence from a document.
     * @param {TextSourceRange|TextSourceElement} source The text source object, either `TextSourceRange` or `TextSourceElement`.
     * @param {boolean} layoutAwareScan Whether or not layout-aware scan mode should be used.
     * @param {number} extent The length of the sentence to extract.
     * @param {boolean} terminateAtNewlines Whether or not a sentence should be terminated at newline characters.
     * @param {Map<string, *[]>} terminatorMap A mapping of characters that terminate a sentence.
     *   Format:
     *   ```js
     *   new Map([ [character: string, [includeCharacterAtStart: boolean, includeCharacterAtEnd: boolean]], ... ])
     *   ```
     * @param {Map<string, *[]>} forwardQuoteMap A mapping of quote characters that delimit a sentence.
     *   Format:
     *   ```js
     *   new Map([ [character: string, [otherCharacter: string, includeCharacterAtStart: boolean]], ... ])
     *   ```
     * @param {Map<string, *[]>} backwardQuoteMap A mapping of quote characters that delimit a sentence,
     *   which is the inverse of forwardQuoteMap.
     *   Format:
     *   ```js
     *   new Map([ [character: string, [otherCharacter: string, includeCharacterAtEnd: boolean]], ... ])
     *   ```
     * @returns {{sentence: string, offset: number}} The sentence and the offset to the original source.
     */
    static extractSentence(source, layoutAwareScan, extent, terminateAtNewlines, terminatorMap, forwardQuoteMap, backwardQuoteMap) {
        // Scan text
        source = source.clone();
        const startLength = source.setStartOffset(extent, layoutAwareScan);
        const endLength = source.setEndOffset(extent * 2 - startLength, true, layoutAwareScan);
        const text = source.text();
        const textLength = text.length;
        const textEndAnchor = textLength - endLength;
        let pos1 = startLength;
        let pos2 = textEndAnchor;

        // Move backward
        let quoteStack = [];
        for (; pos1 > 0; --pos1) {
            const c = text[pos1 - 1];
            if (c === '\n' && terminateAtNewlines) { break; }

            if (quoteStack.length === 0) {
                const terminatorInfo = terminatorMap.get(c);
                if (typeof terminatorInfo !== 'undefined') {
                    if (terminatorInfo[0]) { --pos1; }
                    break;
                }
            }

            let quoteInfo = forwardQuoteMap.get(c);
            if (typeof quoteInfo !== 'undefined') {
                if (quoteStack.length === 0) {
                    if (quoteInfo[1]) { --pos1; }
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
        for (; pos2 < textLength; ++pos2) {
            const c = text[pos2];
            if (c === '\n' && terminateAtNewlines) { break; }

            if (quoteStack.length === 0) {
                const terminatorInfo = terminatorMap.get(c);
                if (typeof terminatorInfo !== 'undefined') {
                    if (terminatorInfo[1]) { ++pos2; }
                    break;
                }
            }

            let quoteInfo = backwardQuoteMap.get(c);
            if (typeof quoteInfo !== 'undefined') {
                if (quoteStack.length === 0) {
                    if (quoteInfo[1]) { ++pos2; }
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
        for (; pos1 < startLength && this._isWhitespace(text[pos1]); ++pos1) { /* NOP */ }
        for (; pos2 > textEndAnchor && this._isWhitespace(text[pos2 - 1]); --pos2) { /* NOP */ }

        // Result
        return {
            text: text.substring(pos1, pos2),
            offset: startLength - pos1
        };
    }

    /**
     * Computes the scaling adjustment that is necessary for client space coordinates based on the
     * CSS zoom level.
     * @param {Node} node A node in the document.
     * @returns {number} The scaling factor.
     */
    static computeZoomScale(node) {
        if (this._cssZoomSupported === null) {
            this._cssZoomSupported = (typeof document.createElement('div').style.zoom === 'string');
        }
        if (!this._cssZoomSupported) { return 1; }
        // documentElement must be excluded because the computer style of its zoom property is inconsistent.
        // * If CSS `:root{zoom:X;}` is specified, the computed zoom will always report `X`.
        // * If CSS `:root{zoom:X;}` is not specified, the computed zoom report the browser's zoom level.
        // Therefor, if CSS root zoom is specified as a value other than 1, the adjusted {x, y} values
        // would be incorrect, which is not new behaviour.
        let scale = 1;
        const {ELEMENT_NODE, DOCUMENT_FRAGMENT_NODE} = Node;
        const {documentElement} = document;
        for (; node !== null && node !== documentElement; node = node.parentNode) {
            const {nodeType} = node;
            if (nodeType === DOCUMENT_FRAGMENT_NODE) {
                const {host} = node;
                if (typeof host !== 'undefined') {
                    node = host;
                }
                continue;
            } else if (nodeType !== ELEMENT_NODE) {
                continue;
            }
            let {zoom} = getComputedStyle(node);
            if (typeof zoom !== 'string') { continue; }
            zoom = Number.parseFloat(zoom);
            if (!Number.isFinite(zoom) || zoom === 0) { continue; }
            scale *= zoom;
        }
        return scale;
    }

    static convertRectZoomCoordinates(rect, node) {
        const scale = this.computeZoomScale(node);
        return (scale === 1 ? rect : new DOMRect(rect.left * scale, rect.top * scale, rect.width * scale, rect.height * scale));
    }

    static convertMultipleRectZoomCoordinates(rects, node) {
        const scale = this.computeZoomScale(node);
        if (scale === 1) { return rects; }
        const results = [];
        for (const rect of rects) {
            results.push(new DOMRect(rect.left * scale, rect.top * scale, rect.width * scale, rect.height * scale));
        }
        return results;
    }

    static isPointInRect(x, y, rect) {
        return (
            x >= rect.left && x < rect.right &&
            y >= rect.top && y < rect.bottom
        );
    }

    static isPointInAnyRect(x, y, rects) {
        for (const rect of rects) {
            if (this.isPointInRect(x, y, rect)) {
                return true;
            }
        }
        return false;
    }

    static isPointInSelection(x, y, selection) {
        for (let i = 0; i < selection.rangeCount; ++i) {
            const range = selection.getRangeAt(i);
            if (this.isPointInAnyRect(x, y, range.getClientRects())) {
                return true;
            }
        }
        return false;
    }

    static isMouseButtonPressed(mouseEvent, button) {
        const mouseEventButton = mouseEvent.button;
        switch (button) {
            case 'primary': return mouseEventButton === 0;
            case 'secondary': return mouseEventButton === 2;
            case 'auxiliary': return mouseEventButton === 1;
            default: return false;
        }
    }

    static getActiveModifiers(event) {
        const modifiers = [];
        if (event.altKey) { modifiers.push('alt'); }
        if (event.ctrlKey) { modifiers.push('ctrl'); }
        if (event.metaKey) { modifiers.push('meta'); }
        if (event.shiftKey) { modifiers.push('shift'); }
        return modifiers;
    }

    static getActiveModifiersAndButtons(event) {
        const modifiers = this.getActiveModifiers(event);
        this._getActiveButtons(event, modifiers);
        return modifiers;
    }

    static getActiveButtons(event) {
        const buttons = [];
        this._getActiveButtons(event, buttons);
        return buttons;
    }

    static addFullscreenChangeEventListener(onFullscreenChanged, eventListenerCollection=null) {
        const target = document;
        const options = false;
        const fullscreenEventNames = [
            'fullscreenchange',
            'MSFullscreenChange',
            'mozfullscreenchange',
            'webkitfullscreenchange'
        ];
        for (const eventName of fullscreenEventNames) {
            if (eventListenerCollection === null) {
                target.addEventListener(eventName, onFullscreenChanged, options);
            } else {
                eventListenerCollection.addEventListener(target, eventName, onFullscreenChanged, options);
            }
        }
    }

    static getFullscreenElement() {
        return (
            document.fullscreenElement ||
            document.msFullscreenElement ||
            document.mozFullScreenElement ||
            document.webkitFullscreenElement ||
            null
        );
    }

    static getNodesInRange(range) {
        const end = range.endContainer;
        const nodes = [];
        for (let node = range.startContainer; node !== null; node = this.getNextNode(node)) {
            nodes.push(node);
            if (node === end) { break; }
        }
        return nodes;
    }

    static getNextNode(node) {
        let next = node.firstChild;
        if (next === null) {
            while (true) {
                next = node.nextSibling;
                if (next !== null) { break; }

                next = node.parentNode;
                if (next === null) { break; }

                node = next;
            }
        }
        return next;
    }

    static anyNodeMatchesSelector(nodes, selector) {
        const ELEMENT_NODE = Node.ELEMENT_NODE;
        for (let node of nodes) {
            for (; node !== null; node = node.parentNode) {
                if (node.nodeType !== ELEMENT_NODE) { continue; }
                if (node.matches(selector)) { return true; }
                break;
            }
        }
        return false;
    }

    static everyNodeMatchesSelector(nodes, selector) {
        const ELEMENT_NODE = Node.ELEMENT_NODE;
        for (let node of nodes) {
            while (true) {
                if (node === null) { return false; }
                if (node.nodeType === ELEMENT_NODE && node.matches(selector)) { break; }
                node = node.parentNode;
            }
        }
        return true;
    }

    static isMetaKeySupported(os, browser) {
        return !(browser === 'firefox' || browser === 'firefox-mobile') || os === 'mac';
    }

    static isInputElementFocused() {
        const element = document.activeElement;
        if (element === null) { return false; }
        const type = element.nodeName.toUpperCase();
        switch (type) {
            case 'INPUT':
            case 'TEXTAREA':
            case 'SELECT':
                return true;
            default:
                return element.isContentEditable;
        }
    }

    /**
     * Offsets an array of DOMRects by a given amount.
     * @param {DOMRect[]} rects The DOMRects to offset.
     * @param {number} x The horizontal offset amount.
     * @param {number} y The vertical offset amount.
     * @returns {DOMRect} The DOMRects with the offset applied.
     */
    static offsetDOMRects(rects, x, y) {
        const results = [];
        for (const rect of rects) {
            results.push(new DOMRect(rect.left + x, rect.top + y, rect.width, rect.height));
        }
        return results;
    }

    /**
     * Gets the parent writing mode of an element.
     * See: https://developer.mozilla.org/en-US/docs/Web/CSS/writing-mode.
     * @param {Element} element The HTML element to check.
     * @returns {string} The writing mode.
     */
    static getElementWritingMode(element) {
        if (element !== null) {
            const {writingMode} = getComputedStyle(element);
            if (typeof writingMode === 'string') {
                return this.normalizeWritingMode(writingMode);
            }
        }
        return 'horizontal-tb';
    }

    /**
     * Normalizes a CSS writing mode value by converting non-standard and deprecated values
     * into their corresponding standard vaules.
     * @param {string} writingMode The writing mode to normalize.
     * @returns {string} The normalized writing mode.
     */
    static normalizeWritingMode(writingMode) {
        switch (writingMode) {
            case 'lr':
            case 'lr-tb':
            case 'rl':
                return 'horizontal-tb';
            case 'tb':
                return 'vertical-lr';
            case 'tb-rl':
                return 'vertical-rl';
            default:
                return writingMode;
        }
    }

    // Private

    static _getActiveButtons(event, array) {
        let {buttons} = event;
        if (typeof buttons === 'number' && buttons > 0) {
            for (let i = 0; i < 6; ++i) {
                const buttonFlag = (1 << i);
                if ((buttons & buttonFlag) !== 0) {
                    array.push(`mouse${i}`);
                    buttons &= ~buttonFlag;
                    if (buttons === 0) { break; }
                }
            }
        }
    }

    static _setImposterStyle(style, propertyName, value) {
        style.setProperty(propertyName, value, 'important');
    }

    static _createImposter(element, isTextarea) {
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
            const width = parseFloat(elementStyle.width) + (elementRect.width - imposterRect.width);
            const height = parseFloat(elementStyle.height) + (elementRect.height - imposterRect.height);
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

    static _getElementsFromPoint(x, y, all) {
        if (all) {
            // document.elementsFromPoint can return duplicates which must be removed.
            const elements = document.elementsFromPoint(x, y);
            return elements.filter((e, i) => elements.indexOf(e) === i);
        }

        const e = document.elementFromPoint(x, y);
        return e !== null ? [e] : [];
    }

    static _isPointInRange(x, y, range, normalizeCssZoom) {
        // Require a text node to start
        const {startContainer} = range;
        if (startContainer.nodeType !== Node.TEXT_NODE) {
            return false;
        }

        // Convert CSS zoom coordinates
        if (normalizeCssZoom) {
            const scale = this.computeZoomScale(startContainer);
            x /= scale;
            y /= scale;
        }

        // Scan forward
        const nodePre = range.endContainer;
        const offsetPre = range.endOffset;
        try {
            const {node, offset, content} = new DOMTextScanner(nodePre, offsetPre, true, false).seek(1);
            range.setEnd(node, offset);

            if (!this._isWhitespace(content) && this.isPointInAnyRect(x, y, range.getClientRects())) {
                return true;
            }
        } finally {
            range.setEnd(nodePre, offsetPre);
        }

        // Scan backward
        const {node, offset, content} = new DOMTextScanner(startContainer, range.startOffset, true, false).seek(-1);
        range.setStart(node, offset);

        if (!this._isWhitespace(content) && this.isPointInAnyRect(x, y, range.getClientRects())) {
            // This purposefully leaves the starting offset as modified and sets the range length to 0.
            range.setEnd(node, offset);
            return true;
        }

        // No match
        return false;
    }

    static _isWhitespace(string) {
        return string.trim().length === 0;
    }

    static _caretRangeFromPoint(x, y) {
        if (typeof document.caretRangeFromPoint === 'function') {
            // Chrome, Edge
            return document.caretRangeFromPoint(x, y);
        }

        if (typeof document.caretPositionFromPoint === 'function') {
            // Firefox
            return this._caretPositionFromPoint(x, y);
        }

        // No support
        return null;
    }

    static _caretPositionFromPoint(x, y) {
        const position = document.caretPositionFromPoint(x, y);
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
                if (this._isElementUserSelectAll(node)) {
                    return this._caretPositionFromPointNormalizeStyles(x, y, node);
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

    static _caretPositionFromPointNormalizeStyles(x, y, nextElement) {
        const previousStyles = new Map();
        try {
            while (true) {
                this._recordPreviousStyle(previousStyles, nextElement);
                nextElement.style.setProperty('user-select', 'text', 'important');

                const position = document.caretPositionFromPoint(x, y);
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
                        if (this._isElementUserSelectAll(node)) {
                            if (previousStyles.has(node)) {
                                // Recursive
                                return null;
                            }
                            nextElement = node;
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

    static _caretRangeFromPointExt(x, y, elements, normalizeCssZoom) {
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

    static _disableTransparentElement(elements, i, previousStyles) {
        while (true) {
            if (i >= elements.length) {
                return -1;
            }

            const element = elements[i++];
            if (this._isElementTransparent(element)) {
                this._recordPreviousStyle(previousStyles, element);
                element.style.setProperty('pointer-events', 'none', 'important');
                return i;
            }
        }
    }

    static _recordPreviousStyle(previousStyles, element) {
        if (previousStyles.has(element)) { return; }
        const style = element.hasAttribute('style') ? element.getAttribute('style') : null;
        previousStyles.set(element, style);
    }

    static _revertStyles(previousStyles) {
        for (const [element, style] of previousStyles.entries()) {
            if (style === null) {
                element.removeAttribute('style');
            } else {
                element.setAttribute('style', style);
            }
        }
    }

    static _isElementTransparent(element) {
        if (
            element === document.body ||
            element === document.documentElement
        ) {
            return false;
        }
        const style = window.getComputedStyle(element);
        return (
            parseFloat(style.opacity) <= 0 ||
            style.visibility === 'hidden' ||
            (style.backgroundImage === 'none' && this._isColorTransparent(style.backgroundColor))
        );
    }

    static _isColorTransparent(cssColor) {
        return this._transparentColorPattern.test(cssColor);
    }

    static _isElementUserSelectAll(element) {
        return getComputedStyle(element).userSelect === 'all';
    }
}
// eslint-disable-next-line no-underscore-dangle
DocumentUtil._transparentColorPattern = /rgba\s*\([^)]*,\s*0(?:\.0+)?\s*\)/;
// eslint-disable-next-line no-underscore-dangle
DocumentUtil._cssZoomSupported = null;
// eslint-disable-next-line no-underscore-dangle
DocumentUtil._getRangeFromPointHandlers = [];
