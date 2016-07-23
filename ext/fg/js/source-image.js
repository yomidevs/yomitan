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


class ImageSource {
    constructor(image) {
        this.img = image;
        this.length = -1;
    }

    text() {
        const text = this.textRaw();
        return this.length < 0 ? text : text.substring(0, this.length);
    }

    textRaw() {
        return this.img.getAttribute('alt') || '';
    }

    setLength(length) {
        this.length = length;
    }

    containsPoint(point) {
        const rect = this.getRect();
        return point.x >= rect.left && point.x <= rect.right;
    }

    getRect() {
        return this.img.getBoundingClientRect();
    }

    select() {
        // NOP
    }

    deselect() {
        // NOP
    }

    equals(other) {
        return other.img && other.textRaw() == this.textRaw();
    }
}
