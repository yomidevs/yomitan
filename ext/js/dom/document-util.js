/*
 * Copyright (C) 2016-2021  Yomichan Authors
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
    constructor() {
        this._transparentColorPattern = /rgba\s*\([^)]*,\s*0(?:\.0+)?\s*\)/;
    }

    getRangeFromPoint(x, y, deepContentScan) {
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
                    return new TextSourceElement(element);
                case 'INPUT':
                    imposterSourceElement = element;
                    [imposter, imposterContainer] = this._createImposter(element, false);
                    break;
                case 'TEXTAREA':
                    imposterSourceElement = element;
                    [imposter, imposterContainer] = this._createImposter(element, true);
                    break;
            }
        }

        const range = this._caretRangeFromPointExt(x, y, deepContentScan ? elements : []);
        if (range !== null) {
            if (imposter !== null) {
                this._setImposterStyle(imposterContainer.style, 'z-index', '-2147483646');
                this._setImposterStyle(imposter.style, 'pointer-events', 'none');
            }
            return new TextSourceRange(range, '', imposterContainer, imposterSourceElement);
        } else {
            if (imposterContainer !== null) {
                imposterContainer.parentNode.removeChild(imposterContainer);
            }
            return null;
        }
    }

    /**
     * Extract a sentence from a document.
     * @param source The text source object, either `TextSourceRange` or `TextSourceElement`.
     * @param layoutAwareScan Whether or not layout-aware scan mode should be used.
     * @param extent The length of the sentence to extract.
     * @param terminatorMap A mapping of characters that terminate a sentence.
     *   Format:
     *   ```js
     *   new Map([ [character: string, [includeCharacterAtStart: boolean, includeCharacterAtEnd: boolean]], ... ])
     *   ```
     * @param forwardQuoteMap A mapping of quote characters that delimit a sentence.
     *   Format:
     *   ```js
     *   new Map([ [character: string, [otherCharacter: string, includeCharacterAtStart: boolean]], ... ])
     *   ```
     * @param backwardQuoteMap A mapping of quote characters that delimit a sentence,
     *   which is the inverse of forwardQuoteMap.
     *   Format:
     *   ```js
     *   new Map([ [character: string, [otherCharacter: string, includeCharacterAtEnd: boolean]], ... ])
     *   ```
     * @returns The sentence and the offset to the original source: `{sentence: string, offset: integer}`.
     */
    extractSentence(source, layoutAwareScan, extent, terminatorMap, forwardQuoteMap, backwardQuoteMap) {
        // Scan text
        source = source.clone();
        const startLength = source.setStartOffset(extent, layoutAwareScan);
        const endLength = source.setEndOffset(extent * 2 - startLength, layoutAwareScan, true);
        const text = source.text();
        const textLength = text.length;
        const textEndAnchor = textLength - endLength;
        let pos1 = startLength;
        let pos2 = textEndAnchor;

        // Move backward
        let quoteStack = [];
        for (; pos1 > 0; --pos1) {
            const c = text[pos1 - 1];
            if (c === '\n') { break; }

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
            if (c === '\n') { break; }

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

    // Private

    _setImposterStyle(style, propertyName, value) {
        style.setProperty(propertyName, value, 'important');
    }

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
            const width = parseFloat(elementStyle.width) + (elementRect.width - imposterRect.width);
            const height = parseFloat(elementStyle.height) + (elementRect.height - imposterRect.height);
            this._setImposterStyle(imposterStyle, 'width', `${width}px`);
            this._setImposterStyle(imposterStyle, 'height', `${height}px`);
        }
        if (imposterRect.x !== elementRect.x || imposterRect.y !== elementRect.y) {
            left += (elementRect.left - imposterRect.left);
            top += (elementRect.top - imposterRect.top);
            this._setImposterStyle(imposterStyle, 'left', `${left}px`);
            this._setImposterStyle(imposterStyle, 'top', `${top}px`);
        }

        imposter.scrollTop = element.scrollTop;
        imposter.scrollLeft = element.scrollLeft;

        return [imposter, container];
    }

    _getElementsFromPoint(x, y, all) {
        if (all) {
            // document.elementsFromPoint can return duplicates which must be removed.
            const elements = document.elementsFromPoint(x, y);
            return elements.filter((e, i) => elements.indexOf(e) === i);
        }

        const e = document.elementFromPoint(x, y);
        return e !== null ? [e] : [];
    }

    _isPointInRange(x, y, range) {
        // Require a text node to start
        if (range.startContainer.nodeType !== Node.TEXT_NODE) {
            return false;
        }

        // Scan forward
        const nodePre = range.endContainer;
        const offsetPre = range.endOffset;
        try {
            const {node, offset, content} = new DOMTextScanner(range.endContainer, range.endOffset, true, false).seek(1);
            range.setEnd(node, offset);

            if (!this._isWhitespace(content) && DocumentUtil.isPointInAnyRect(x, y, range.getClientRects())) {
                return true;
            }
        } finally {
            range.setEnd(nodePre, offsetPre);
        }

        // Scan backward
        const {node, offset, content} = new DOMTextScanner(range.startContainer, range.startOffset, true, false).seek(-1);
        range.setStart(node, offset);

        if (!this._isWhitespace(content) && DocumentUtil.isPointInAnyRect(x, y, range.getClientRects())) {
            // This purposefully leaves the starting offset as modified and sets the range length to 0.
            range.setEnd(node, offset);
            return true;
        }

        // No match
        return false;
    }

    _isWhitespace(string) {
        return string.trim().length === 0;
    }

    _caretRangeFromPoint(x, y) {
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

    _caretPositionFromPoint(x, y) {
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

    _caretPositionFromPointNormalizeStyles(x, y, nextElement) {
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

    _caretRangeFromPointExt(x, y, elements) {
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
                    if (this._isPointInRange(x, y, range)) {
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

    _disableTransparentElement(elements, i, previousStyles) {
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

    _recordPreviousStyle(previousStyles, element) {
        if (previousStyles.has(element)) { return; }
        const style = element.hasAttribute('style') ? element.getAttribute('style') : null;
        previousStyles.set(element, style);
    }

    _revertStyles(previousStyles) {
        for (const [element, style] of previousStyles.entries()) {
            if (style === null) {
                element.removeAttribute('style');
            } else {
                element.setAttribute('style', style);
            }
        }
    }

    _isElementTransparent(element) {
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

    _isColorTransparent(cssColor) {
        return this._transparentColorPattern.test(cssColor);
    }

    _isElementUserSelectAll(element) {
        return getComputedStyle(element).userSelect === 'all';
    }
}
