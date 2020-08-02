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
 */

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

    get startOffset() {
        return this.range.startOffset;
    }

    get endOffset() {
        return this.range.endOffset;
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

    setEndOffset(length, layoutAwareScan, fromEnd=false) {
        const state = (
            fromEnd ?
            new DOMTextScanner(this.range.endContainer, this.range.endOffset, !layoutAwareScan, layoutAwareScan).seek(length) :
            new DOMTextScanner(this.range.startContainer, this.range.startOffset, !layoutAwareScan, layoutAwareScan).seek(length)
        );
        this.range.setEnd(state.node, state.offset);
        this.content = (fromEnd ? this.content + state.content : state.content);
        return length - state.remainder;
    }

    setStartOffset(length, layoutAwareScan) {
        const state = new DOMTextScanner(this.range.startContainer, this.range.startOffset, !layoutAwareScan, layoutAwareScan).seek(-length);
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
            this._startOffset === other.startOffset
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
