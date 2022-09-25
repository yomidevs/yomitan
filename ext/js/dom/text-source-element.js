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
 * DocumentUtil
 * StringUtil
 */

class TextSourceElement {
    constructor(element, fullContent, startOffset, endOffset) {
        this._element = element;
        this._fullContent = fullContent;
        this._startOffset = startOffset;
        this._endOffset = endOffset;
        this._content = this._fullContent.substring(this._startOffset, this._endOffset);
    }

    get type() {
        return 'element';
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

    setEndOffset(length, fromEnd) {
        const offset = fromEnd ? this._endOffset : this._startOffset;
        length = Math.min(this._fullContent.length - offset, length);
        if (length > 0) {
            length = StringUtil.readCodePointsForward(this._fullContent, offset, length).length;
        }
        this._endOffset = offset + length;
        this._content = this._fullContent.substring(this._startOffset, this._endOffset);
        return length;
    }

    setStartOffset(length) {
        length = Math.min(this._startOffset, length);
        if (length > 0) {
            length = StringUtil.readCodePointsBackward(this._fullContent, this._startOffset - 1, length).length;
        }
        this._startOffset -= length;
        this._content = this._fullContent.substring(this._startOffset, this._endOffset);
        return length;
    }

    getRects() {
        return DocumentUtil.convertMultipleRectZoomCoordinates(this._element.getClientRects(), this._element);
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

    hasSameStart(other) {
        return (
            typeof other === 'object' &&
            other !== null &&
            other instanceof TextSourceElement &&
            this._element === other.element &&
            this._fullContent === other.fullContent &&
            this._startOffset === other.startOffset
        );
    }

    getNodesInRange() {
        return [this._element];
    }

    static create(element) {
        return new TextSourceElement(element, this._getElementContent(element), 0, 0);
    }

    static _getElementContent(element) {
        let content;
        switch (element.nodeName.toUpperCase()) {
            case 'BUTTON':
                content = element.textContent;
                break;
            case 'IMG':
                content = element.getAttribute('alt') || '';
                break;
            case 'SELECT':
                {
                    const {selectedIndex, options} = element;
                    const option = (selectedIndex >= 0 && selectedIndex < options.length ? options[selectedIndex] : null);
                    content = (option !== null ? option.textContent : '');
                }
                break;
            default:
                content = `${element.value}`;
                break;
        }

        // Remove zero-width space and zero-width non-joiner
        content = content.replace(/[\u200b\u200c]/g, '');

        return content;
    }
}
