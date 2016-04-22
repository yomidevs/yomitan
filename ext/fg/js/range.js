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


class Range {
    constructor(range) {
        this.range = range;
    }

    text() {
        return this.range.toString();
    }

    setLength(length) {
        const node   = this.range.startContainer;
        const offset = this.range.startOffset;

        length = Math.min(node.length - offset, length);
        if (length === 0) {
            return null;
        }

        range.setEnd(node, offset + length);
        return length;
    }

    paddedRect() {
        const node        = this.range.startContainer;
        const startOffset = this.range.startOffset;
        const endOffset   = this.range.endOffset;

        this.range.setStart(node, Math.max(0, startOffset - 1));
        this.range.setEnd(node, Math.min(node.length, endOffset + 1));
        const rect = range.getBoundingClientRect();
        this.range.setStart(node, startOffset);
        this.range.setEnd(node, endOffset);

        return rect;
    }

    static fromPoint(point) {
        const range = document.caretRangeFromPoint(point.x, point.y);
        return range === null ? null : new Range(range);
    }
}
