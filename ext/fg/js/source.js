/*
 * Copyright (C) 2016-2017  Alex Yatskov <alex@foosoft.net>
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
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
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
        if (node.nodeType !== 1) {
            return false;
        }

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

    static seekForward(node, offset, length) {
        const state = {node, offset, remainder: length, content: ''};
        if (!TextSourceRange.seekForwardHelper(node, state)) {
            return state;
        }

        for (let current = node; current !== null; current = current.parentElement) {
            for (let sibling = current.nextSibling; sibling !== null; sibling = sibling.nextSibling) {
                if (!TextSourceRange.seekForwardHelper(sibling, state)) {
                    return state;
                }
            }
        }

        return state;
    }

    static seekForwardHelper(node, state) {
        if (node.nodeType === 3 && node.parentElement && TextSourceRange.shouldEnter(node.parentElement)) {
            const offset = state.node === node ? state.offset : 0;

            let consumed = 0;
            let stripped = 0;
            while (state.remainder - consumed > 0) {
                const currentChar = node.nodeValue[offset + consumed + stripped];
                if (!currentChar) {
                    break;
                } else if (currentChar.match(IGNORE_TEXT_PATTERN)) {
                    stripped++;
                } else {
                    consumed++;
                    state.content += currentChar;
                }
            }

            state.node = node;
            state.offset = offset + consumed + stripped;
            state.remainder -= consumed;
        } else if (TextSourceRange.shouldEnter(node)) {
            for (let i = 0; i < node.childNodes.length; ++i) {
                if (!TextSourceRange.seekForwardHelper(node.childNodes[i], state)) {
                    break;
                }
            }
        }

        return state.remainder > 0;
    }

    static seekBackward(node, offset, length) {
        const state = {node, offset, remainder: length, content: ''};
        if (!TextSourceRange.seekBackwardHelper(node, state)) {
            return state;
        }

        for (let current = node; current !== null; current = current.parentElement) {
            for (let sibling = current.previousSibling; sibling !== null; sibling = sibling.previousSibling) {
                if (!TextSourceRange.seekBackwardHelper(sibling, state)) {
                    return state;
                }
            }
        }

        return state;
    }

    static seekBackwardHelper(node, state) {
        if (node.nodeType === 3 && node.parentElement && TextSourceRange.shouldEnter(node.parentElement)) {
            const offset = state.node === node ? state.offset : node.length;

            let consumed = 0;
            let stripped = 0;
            while (state.remainder - consumed > 0) {
                const currentChar = node.nodeValue[offset - 1 - consumed - stripped]; // negative indices are undefined in JS
                if (!currentChar) {
                    break;
                } else if (currentChar.match(IGNORE_TEXT_PATTERN)) {
                    stripped++;
                } else {
                    consumed++;
                    state.content = currentChar + state.content;
                }
            }

            state.node = node;
            state.offset = offset - consumed - stripped;
            state.remainder -= consumed;
        } else if (TextSourceRange.shouldEnter(node)) {
            for (let i = node.childNodes.length - 1; i >= 0; --i) {
                if (!TextSourceRange.seekBackwardHelper(node.childNodes[i], state)) {
                    break;
                }
            }
        }

        return state.remainder > 0;
    }

    static getParentElement(node) {
        while (node !== null && node.nodeType !== Node.ELEMENT_NODE) {
            node = node.parentNode;
        }
        return node;
    }

    static getElementWritingMode(element) {
        if (element === null) {
            return 'horizontal-tb';
        }

        const style = window.getComputedStyle(element);
        const writingMode = style.writingMode;
        return typeof writingMode === 'string' ? writingMode : 'horizontal-tb';
    }

    static getNodesInRange(range) {
        const end = range.endContainer;
        const nodes = [];
        for (let node = range.startContainer; node !== null; node = TextSourceRange.getNextNode(node)) {
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
                if (node === null) { break; }

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
        for (let currentChar of this.content || '') {
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

    setStartOffset(length) {
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
