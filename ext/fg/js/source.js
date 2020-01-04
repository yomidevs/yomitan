/*
 * Copyright (C) 2016-2020  Alex Yatskov <alex@foosoft.net>
 * Author: Alex Yatskov <alex@foosoft.net>
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
    constructor(range, content, imposterContainer) {
        this.range = range;
        this.content = content;
        this.imposterContainer = imposterContainer;
    }

    clone() {
        return new TextSourceRange(this.range.cloneRange(), this.content, this.imposterContainer);
    }

    cleanup() {
        if (this.imposterContainer !== null && this.imposterContainer.parentNode !== null) {
            this.imposterContainer.parentNode.removeChild(this.imposterContainer);
        }
    }

    text() {
        return this.content;
    }

    setEndOffset(length) {
        const state = TextSourceRange.seekForward(this.range.startContainer, this.range.startOffset, length);
        this.range.setEnd(state.node, state.offset);
        this.content = state.content;
        return length - state.remainder;
    }

    setStartOffset(length) {
        const state = TextSourceRange.seekBackward(this.range.startContainer, this.range.startOffset, length);
        this.range.setStart(state.node, state.offset);
        this.content = state.content;
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
        return other && other.range && other.range.compareBoundaryPoints(Range.START_TO_START, this.range) === 0;
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
            parseFloat(style.fontSize) === 0);
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
    constructor(element, content='') {
        this.element = element;
        this.content = content;
    }

    clone() {
        return new TextSourceElement(this.element, this.content);
    }

    cleanup() {
        // NOP
    }

    text() {
        return this.content;
    }

    setEndOffset(length) {
        switch (this.element.nodeName.toUpperCase()) {
            case 'BUTTON':
                this.content = this.element.innerHTML;
                break;
            case 'IMG':
                this.content = this.element.getAttribute('alt');
                break;
            default:
                this.content = this.element.value;
                break;
        }

        let consumed = 0;
        let content = '';
        for (const currentChar of this.content || '') {
            if (consumed >= length) {
                break;
            } else if (!currentChar.match(IGNORE_TEXT_PATTERN)) {
                consumed++;
                content += currentChar;
            }
        }

        this.content = content;

        return this.content.length;
    }

    setStartOffset() {
        return 0;
    }

    getRect() {
        return this.element.getBoundingClientRect();
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
        return other && other.element === this.element && other.content === this.content;
    }
}
