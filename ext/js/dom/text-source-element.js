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

    get isConnected() {
        return this._element.isConnected;
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

    collapse(toStart) {
        if (toStart) {
            this._endOffset = this._startOffset;
        } else {
            this._startOffset = this._endOffset;
        }
        this._content = '';
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

    static getElementContent(element) {
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
