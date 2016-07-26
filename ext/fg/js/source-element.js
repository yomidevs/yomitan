/*
 * Copyright (C) 2016  Alex Yatskov <alex@foosoft.net>
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


class TextSourceElement {
    constructor(element, length=-1) {
        this.element = element;
        this.length = length;
    }

    clone() {
        return new TextSourceElement(this.element, this.length);
    }

    text() {
        const text = this.textRaw();
        return this.length < 0 ? text : text.substring(0, this.length);
    }

    textRaw() {
        switch (this.element.nodeName) {
            case 'BUTTON':
                return this.element.innerHTML;
            case 'IMG':
                return this.element.getAttribute('alt');
            default:
                return this.element.value;
        }
    }

    setStartOffset(length) {
        // NOP
        return 0;
    }

    setEndOffset(length) {
        this.length = length;
        return length;
    }

    containsPoint(point) {
        const rect = this.getRect();
        return point.x >= rect.left && point.x <= rect.right;
    }

    getRect() {
        return this.element.getBoundingClientRect();
    }

    select() {
        // NOP
    }

    deselect() {
        // NOP
    }

    equals(other) {
        return other.element && other.textRaw() == this.textRaw();
    }
}
