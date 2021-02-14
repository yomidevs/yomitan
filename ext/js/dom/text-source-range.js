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
 * DocumentUtil
 */

class TextSourceRange {
    constructor(range, content, imposterContainer, imposterSourceElement) {
        this._range = range;
        this._rangeStartOffset = range.startOffset;
        this._content = content;
        this._imposterContainer = imposterContainer;
        this._imposterSourceElement = imposterSourceElement;
    }

    get range() {
        return this._range;
    }

    get rangeStartOffset() {
        return this._rangeStartOffset;
    }

    get imposterSourceElement() {
        return this._imposterSourceElement;
    }

    get isConnected() {
        return (
            this._range.startContainer.isConnected &&
            this._range.endContainer.isConnected
        );
    }

    clone() {
        return new TextSourceRange(this._range.cloneRange(), this._content, this._imposterContainer, this._imposterSourceElement);
    }

    cleanup() {
        if (this._imposterContainer !== null && this._imposterContainer.parentNode !== null) {
            this._imposterContainer.parentNode.removeChild(this._imposterContainer);
        }
    }

    text() {
        return this._content;
    }

    setEndOffset(length, layoutAwareScan, fromEnd=false) {
        const state = (
            fromEnd ?
            new DOMTextScanner(this._range.endContainer, this._range.endOffset, !layoutAwareScan, layoutAwareScan).seek(length) :
            new DOMTextScanner(this._range.startContainer, this._range.startOffset, !layoutAwareScan, layoutAwareScan).seek(length)
        );
        this._range.setEnd(state.node, state.offset);
        this._content = (fromEnd ? this._content + state.content : state.content);
        return length - state.remainder;
    }

    setStartOffset(length, layoutAwareScan) {
        const state = new DOMTextScanner(this._range.startContainer, this._range.startOffset, !layoutAwareScan, layoutAwareScan).seek(-length);
        this._range.setStart(state.node, state.offset);
        this._rangeStartOffset = this._range.startOffset;
        this._content = state.content + this._content;
        return length - state.remainder;
    }

    collapse(toStart) {
        this._range.collapse(toStart);
        this._content = '';
    }

    getRect() {
        return this._range.getBoundingClientRect();
    }

    getWritingMode() {
        return TextSourceRange.getElementWritingMode(TextSourceRange.getParentElement(this._range.startContainer));
    }

    select() {
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(this._range);
    }

    deselect() {
        const selection = window.getSelection();
        selection.removeAllRanges();
    }

    hasSameStart(other) {
        if (!(
            typeof other === 'object' &&
            other !== null &&
            other instanceof TextSourceRange
        )) {
            return false;
        }
        if (this._imposterSourceElement !== null) {
            return (
                this._imposterSourceElement === other.imposterSourceElement &&
                this._rangeStartOffset === other.rangeStartOffset
            );
        } else {
            try {
                return this._range.compareBoundaryPoints(Range.START_TO_START, other.range) === 0;
            } catch (e) {
                if (e.name === 'WrongDocumentError') {
                    // This can happen with shadow DOMs if the ranges are in different documents.
                    return false;
                }
                throw e;
            }
        }
    }

    getNodesInRange() {
        return DocumentUtil.getNodesInRange(this._range);
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
