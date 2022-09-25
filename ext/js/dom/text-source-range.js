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
 * DocumentUtil
 */

class TextSourceRange {
    constructor(range, rangeStartOffset, content, imposterElement, imposterSourceElement, cachedRects, cachedSourceRect) {
        this._range = range;
        this._rangeStartOffset = rangeStartOffset;
        this._content = content;
        this._imposterElement = imposterElement;
        this._imposterSourceElement = imposterSourceElement;
        this._cachedRects = cachedRects;
        this._cachedSourceRect = cachedSourceRect;
    }

    get type() {
        return 'range';
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

    clone() {
        return new TextSourceRange(
            this._range.cloneRange(),
            this._rangeStartOffset,
            this._content,
            this._imposterElement,
            this._imposterSourceElement,
            this._cachedRects,
            this._cachedSourceRect
        );
    }

    cleanup() {
        if (this._imposterElement !== null && this._imposterElement.parentNode !== null) {
            this._imposterElement.parentNode.removeChild(this._imposterElement);
        }
    }

    text() {
        return this._content;
    }

    setEndOffset(length, fromEnd, layoutAwareScan) {
        let node;
        let offset;
        if (fromEnd) {
            node = this._range.endContainer;
            offset = this._range.endOffset;
        } else {
            node = this._range.startContainer;
            offset = this._range.startOffset;
        }
        const state = new DOMTextScanner(node, offset, !layoutAwareScan, layoutAwareScan).seek(length);
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

    getRects() {
        if (this._isImposterDisconnected()) { return this._getCachedRects(); }
        return DocumentUtil.convertMultipleRectZoomCoordinates(this._range.getClientRects(), this._range.startContainer);
    }

    getWritingMode() {
        const node = this._isImposterDisconnected() ? this._imposterSourceElement : this._range.startContainer;
        return DocumentUtil.getElementWritingMode(node !== null ? node.parentElement : null);
    }

    select() {
        if (this._imposterElement !== null) { return; }
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(this._range);
    }

    deselect() {
        if (this._imposterElement !== null) { return; }
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

    static create(range) {
        return new TextSourceRange(range, range.startOffset, range.toString(), null, null, null, null);
    }

    static createFromImposter(range, imposterElement, imposterSourceElement) {
        const cachedRects = DocumentUtil.convertMultipleRectZoomCoordinates(range.getClientRects(), range.startContainer);
        const cachedSourceRect = DocumentUtil.convertRectZoomCoordinates(imposterSourceElement.getBoundingClientRect(), imposterSourceElement);
        return new TextSourceRange(range, range.startOffset, range.toString(), imposterElement, imposterSourceElement, cachedRects, cachedSourceRect);
    }

    _isImposterDisconnected() {
        return this._imposterElement !== null && !this._imposterElement.isConnected;
    }

    _getCachedRects() {
        const sourceRect = DocumentUtil.convertRectZoomCoordinates(this._imposterSourceElement.getBoundingClientRect(), this._imposterSourceElement);
        return DocumentUtil.offsetDOMRects(
            this._cachedRects,
            sourceRect.left - this._cachedSourceRect.left,
            sourceRect.top - this._cachedSourceRect.top
        );
    }
}
