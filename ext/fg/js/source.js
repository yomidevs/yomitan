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

// \u200c (Zero-width non-joiner) appears on Google Docs from Chrome 76 onwards
const IGNORE_TEXT_PATTERN = /\u200c/;


/*
 * TextSourceRange
 */

class TextSourceRange {
    constructor(range, content, imposterContainer, imposterSourceElement) {
        this.range = range;
        this.rangeStartOffset = range.startOffset;
        this.content = content;
        this.imposterContainer = imposterContainer;
        this.imposterSourceElement = imposterSourceElement;
    }

    clone() {
        return new TextSourceRange(this.range.cloneRange(), this.content, this.imposterContainer, this.imposterSourceElement);
    }

    cleanup() {
        if (this.imposterContainer !== null && this.imposterContainer.parentNode !== null) {
            this.imposterContainer.parentNode.removeChild(this.imposterContainer);
        }
    }

    text() {
        return this.content;
    }

    setEndOffset(length, fromEnd=false) {
        const state = (
            fromEnd ?
            TextSourceRange.seekForward(this.range.endContainer, this.range.endOffset, length) :
            TextSourceRange.seekForward(this.range.startContainer, this.range.startOffset, length)
        );
        this.range.setEnd(state.node, state.offset);
        this.content = (fromEnd ? this.content + state.content : state.content);
        return length - state.remainder;
    }

    setStartOffset(length) {
        const state = TextSourceRange.seekBackward(this.range.startContainer, this.range.startOffset, length);
        this.range.setStart(state.node, state.offset);
        this.rangeStartOffset = this.range.startOffset;
        this.content = state.content + this.content;
        return length - state.remainder;
    }

    getRect() {
        return this.range.getBoundingClientRect();
    }

    getWritingMode() {
        return TextSourceRange.getElementWritingMode(TextSourceRange.getParentElement(this.range.startContainer));
    }

    select() {
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(this.range);
    }

    deselect() {
        const selection = window.getSelection();
        selection.removeAllRanges();
    }

    equals(other) {
        if (!(
            typeof other === 'object' &&
            other !== null &&
            other instanceof TextSourceRange
        )) {
            return false;
        }
        if (this.imposterSourceElement !== null) {
            return (
                this.imposterSourceElement === other.imposterSourceElement &&
                this.rangeStartOffset === other.rangeStartOffset
            );
        } else {
            try {
                return this.range.compareBoundaryPoints(Range.START_TO_START, other.range) === 0;
            } catch (e) {
                if (e.name === 'WrongDocumentError') {
                    // This can happen with shadow DOMs if the ranges are in different documents.
                    return false;
                }
                throw e;
            }
        }
    }

    static shouldEnter(node) {
        switch (node.nodeName.toUpperCase()) {
            case 'RT':
            case 'SCRIPT':
            case 'STYLE':
                return false;
        }

        const style = window.getComputedStyle(node);
        return !(
            style.visibility === 'hidden' ||
            style.display === 'none' ||
            parseFloat(style.fontSize) === 0
        );
    }

    static getRubyElement(node) {
        node = TextSourceRange.getParentElement(node);
        if (node !== null && node.nodeName.toUpperCase() === 'RT') {
            node = node.parentNode;
            return (node !== null && node.nodeName.toUpperCase() === 'RUBY') ? node : null;
        }
        return null;
    }

    static seekForward(node, offset, length) {
        const state = {node, offset, remainder: length, content: ''};
        if (length <= 0) {
            return state;
        }

        const TEXT_NODE = Node.TEXT_NODE;
        const ELEMENT_NODE = Node.ELEMENT_NODE;
        let resetOffset = false;

        const ruby = TextSourceRange.getRubyElement(node);
        if (ruby !== null) {
            node = ruby;
            resetOffset = true;
        }

        while (node !== null) {
            let visitChildren = true;
            const nodeType = node.nodeType;

            if (nodeType === TEXT_NODE) {
                state.node = node;
                if (TextSourceRange.seekForwardTextNode(state, resetOffset)) {
                    break;
                }
                resetOffset = true;
            } else if (nodeType === ELEMENT_NODE) {
                visitChildren = TextSourceRange.shouldEnter(node);
            }

            node = TextSourceRange.getNextNode(node, visitChildren);
        }

        return state;
    }

    static seekForwardTextNode(state, resetOffset) {
        const nodeValue = state.node.nodeValue;
        const nodeValueLength = nodeValue.length;
        let content = state.content;
        let offset = resetOffset ? 0 : state.offset;
        let remainder = state.remainder;
        let result = false;

        for (; offset < nodeValueLength; ++offset) {
            const c = nodeValue[offset];
            if (!IGNORE_TEXT_PATTERN.test(c)) {
                content += c;
                if (--remainder <= 0) {
                    result = true;
                    ++offset;
                    break;
                }
            }
        }

        state.offset = offset;
        state.content = content;
        state.remainder = remainder;
        return result;
    }

    static seekBackward(node, offset, length) {
        const state = {node, offset, remainder: length, content: ''};
        if (length <= 0) {
            return state;
        }

        const TEXT_NODE = Node.TEXT_NODE;
        const ELEMENT_NODE = Node.ELEMENT_NODE;
        let resetOffset = false;

        const ruby = TextSourceRange.getRubyElement(node);
        if (ruby !== null) {
            node = ruby;
            resetOffset = true;
        }

        while (node !== null) {
            let visitChildren = true;
            const nodeType = node.nodeType;

            if (nodeType === TEXT_NODE) {
                state.node = node;
                if (TextSourceRange.seekBackwardTextNode(state, resetOffset)) {
                    break;
                }
                resetOffset = true;
            } else if (nodeType === ELEMENT_NODE) {
                visitChildren = TextSourceRange.shouldEnter(node);
            }

            node = TextSourceRange.getPreviousNode(node, visitChildren);
        }

        return state;
    }

    static seekBackwardTextNode(state, resetOffset) {
        const nodeValue = state.node.nodeValue;
        let content = state.content;
        let offset = resetOffset ? nodeValue.length : state.offset;
        let remainder = state.remainder;
        let result = false;

        for (; offset > 0; --offset) {
            const c = nodeValue[offset - 1];
            if (!IGNORE_TEXT_PATTERN.test(c)) {
                content = c + content;
                if (--remainder <= 0) {
                    result = true;
                    --offset;
                    break;
                }
            }
        }

        state.offset = offset;
        state.content = content;
        state.remainder = remainder;
        return result;
    }

    static getParentElement(node) {
        while (node !== null && node.nodeType !== Node.ELEMENT_NODE) {
            node = node.parentNode;
        }
        return node;
    }

    static getElementWritingMode(element) {
        if (element !== null) {
            const style = window.getComputedStyle(element);
            const writingMode = style.writingMode;
            if (typeof writingMode === 'string') {
                return TextSourceRange.normalizeWritingMode(writingMode);
            }
        }
        return 'horizontal-tb';
    }

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

    static getNodesInRange(range) {
        const end = range.endContainer;
        const nodes = [];
        for (let node = range.startContainer; node !== null; node = TextSourceRange.getNextNode(node, true)) {
            nodes.push(node);
            if (node === end) { break; }
        }
        return nodes;
    }

    static getNextNode(node, visitChildren) {
        let next = visitChildren ? node.firstChild : null;
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

    static getPreviousNode(node, visitChildren) {
        let next = visitChildren ? node.lastChild : null;
        if (next === null) {
            while (true) {
                next = node.previousSibling;
                if (next !== null) { break; }

                next = node.parentNode;
                if (next === null) { break; }

                node = next;
            }
        }
        return next;
    }

    static anyNodeMatchesSelector(nodeList, selector) {
        for (const node of nodeList) {
            if (TextSourceRange.nodeMatchesSelector(node, selector)) {
                return true;
            }
        }
        return false;
    }

    static nodeMatchesSelector(node, selector) {
        for (; node !== null; node = node.parentNode) {
            if (node.nodeType === Node.ELEMENT_NODE) {
                return node.matches(selector);
            }
        }
        return false;
    }
}


/*
 * TextSourceElement
 */

class TextSourceElement {
    constructor(element, fullContent=null, startOffset=0, endOffset=0) {
        this._element = element;
        this._fullContent = (typeof fullContent === 'string' ? fullContent : TextSourceElement.getElementContent(element));
        this._startOffset = startOffset;
        this._endOffset = endOffset;
        this._content = this._fullContent.substring(this._startOffset, this._endOffset);
    }

    get element() {
        return this._element;
    }

    get fullContent() {
        return this._fullContent;
    }

    get startOffset() {
        return this._startOffset;
    }

    get endOffset() {
        return this._endOffset;
    }

    clone() {
        return new TextSourceElement(this._element, this._fullContent, this._startOffset, this._endOffset);
    }

    cleanup() {
        // NOP
    }

    text() {
        return this._content;
    }

    setEndOffset(length, fromEnd=false) {
        if (fromEnd) {
            const delta = Math.min(this._fullContent.length - this._endOffset, length);
            this._endOffset += delta;
            this._content = this._fullContent.substring(this._startOffset, this._endOffset);
            return delta;
        } else {
            const delta = Math.min(this._fullContent.length - this._startOffset, length);
            this._endOffset = this._startOffset + delta;
            this._content = this._fullContent.substring(this._startOffset, this._endOffset);
            return delta;
        }
    }

    setStartOffset(length) {
        const delta = Math.min(this._startOffset, length);
        this._startOffset -= delta;
        this._content = this._fullContent.substring(this._startOffset, this._endOffset);
        return delta;
    }

    getRect() {
        return this._element.getBoundingClientRect();
    }

    getWritingMode() {
        return 'horizontal-tb';
    }

    select() {
        // NOP
    }

    deselect() {
        // NOP
    }

    equals(other) {
        return (
            typeof other === 'object' &&
            other !== null &&
            other instanceof TextSourceElement &&
            this._element === other.element &&
            this._fullContent === other.fullContent &&
            this._startOffset === other.startOffset &&
            this._endOffset === other.endOffset
        );
    }

    static getElementContent(element) {
        let content;
        switch (element.nodeName.toUpperCase()) {
            case 'BUTTON':
                content = element.textContent;
                break;
            case 'IMG':
                content = element.getAttribute('alt') || '';
                break;
            default:
                content = `${element.value}`;
                break;
        }

        // Remove zero-width non-joiner
        content = content.replace(/\u200c/g, '');

        return content;
    }
}
