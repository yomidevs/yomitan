/*
 * Copyright (C) 2016-2020  Yomichan Authors
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

    extractSentence(source, extent, layoutAwareScan) {
        const quotesFwd = {'「': '」', '『': '』', "'": "'", '"': '"'};
        const quotesBwd = {'」': '「', '』': '『', "'": "'", '"': '"'};
        const terminators = '…。．.？?！!';

        const sourceLocal = source.clone();
        const position = sourceLocal.setStartOffset(extent, layoutAwareScan);
        sourceLocal.setEndOffset(extent * 2 - position, layoutAwareScan, true);
        const content = sourceLocal.text();

        let quoteStack = [];

        let startPos = 0;
        for (let i = position; i >= startPos; --i) {
            const c = content[i];

            if (c === '\n') {
                startPos = i + 1;
                break;
            }

            if (quoteStack.length === 0 && (terminators.includes(c) || c in quotesFwd)) {
                startPos = i + 1;
                break;
            }

            if (quoteStack.length > 0 && c === quoteStack[0]) {
                quoteStack.pop();
            } else if (c in quotesBwd) {
                quoteStack.unshift(quotesBwd[c]);
            }
        }

        quoteStack = [];

        let endPos = content.length;
        for (let i = position; i <= endPos; ++i) {
            const c = content[i];

            if (c === '\n') {
                endPos = i + 1;
                break;
            }

            if (quoteStack.length === 0) {
                if (terminators.includes(c)) {
                    endPos = i + 1;
                    break;
                } else if (c in quotesBwd) {
                    endPos = i;
                    break;
                }
            }

            if (quoteStack.length > 0 && c === quoteStack[0]) {
                quoteStack.pop();
            } else if (c in quotesFwd) {
                quoteStack.unshift(quotesFwd[c]);
            }
        }

        const text = content.substring(startPos, endPos);
        const padding = text.length - text.replace(/^\s+/, '').length;

        return {
            text: text.trim(),
            offset: position - startPos - padding
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

    static isMouseButtonDown(mouseEvent, button) {
        const mouseEventButtons = mouseEvent.buttons;
        switch (button) {
            case 'primary': return (mouseEventButtons & 0x1) !== 0x0;
            case 'secondary': return (mouseEventButtons & 0x2) !== 0x0;
            case 'auxiliary': return (mouseEventButtons & 0x4) !== 0x0;
            default: return false;
        }
    }

    static getActiveModifiers(event) {
        const modifiers = new Set();
        if (event.altKey) { modifiers.add('alt'); }
        if (event.ctrlKey) { modifiers.add('ctrl'); }
        if (event.metaKey) { modifiers.add('meta'); }
        if (event.shiftKey) { modifiers.add('shift'); }
        return modifiers;
    }

    static getKeyFromEvent(event) {
        const key = event.key;
        return (typeof key === 'string' ? (key.length === 1 ? key.toUpperCase() : key) : '');
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

        const range = document.createRange();
        const offset = (node.nodeType === Node.TEXT_NODE ? position.offset : 0);
        try {
            range.setStart(node, offset);
            range.setEnd(node, offset);
        } catch (e) {
            // Firefox throws new DOMException("The operation is insecure.")
            // when trying to select a node from within a ShadowRoot.
            return null;
        }
        return range;
    }

    _caretRangeFromPointExt(x, y, elements) {
        const modifications = [];
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

                i = this._disableTransparentElement(elements, i, modifications);
                if (i < 0) {
                    return null;
                }
            }
        } finally {
            if (modifications.length > 0) {
                this._restoreElementStyleModifications(modifications);
            }
        }
    }

    _disableTransparentElement(elements, i, modifications) {
        while (true) {
            if (i >= elements.length) {
                return -1;
            }

            const element = elements[i++];
            if (this._isElementTransparent(element)) {
                const style = element.hasAttribute('style') ? element.getAttribute('style') : null;
                modifications.push({element, style});
                element.style.setProperty('pointer-events', 'none', 'important');
                return i;
            }
        }
    }

    _restoreElementStyleModifications(modifications) {
        for (const {element, style} of modifications) {
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
}
