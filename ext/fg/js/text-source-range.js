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
