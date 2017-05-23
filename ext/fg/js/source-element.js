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
    constructor(element, content='') {
        this.element = element;
        this.content = content;
    }

    clone() {
        return new TextSourceElement(this.element, this.content);
    }

    text() {
        return this.content;
    }

    setEndOffset(length) {
        switch (this.element.nodeName) {
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

        this.content = this.content || '';
        this.content = this.content.substring(0, length);

        return this.content.length;
    }

    setStartOffset(length) {
        return 0;
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
        return other.element === this.element && other.content === this.content;
    }
}
