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
        this.rng = range;
    }

    text() {
        return this.rng.toString();
    }

    setLength(length) {
        const node   = this.rng.startContainer;
        const offset = this.rng.startOffset;

        length = Math.min(node.length - offset, length);
        if (length === 0) {
            return null;
        }

        this.rng.setEnd(node, offset + length);
        return length;
    }

    containsPoint(point) {
        const rect = this.getPaddedRect();
        return point.x >= rect.left && point.x <= rect.right;
    }

    getRect() {
        return this.rng.getBoundingClientRect();
    }

    getPaddedRect() {
        const range       = this.rng.cloneRange();
        const startOffset = range.startOffset;
        const endOffset   = range.endOffset;
        const node        = range.startContainer;

        range.setStart(node, Math.max(0, startOffset - 1));
        range.setEnd(node, Math.min(node.length, endOffset + 1));

        return range.getBoundingClientRect();
    }

    select() {
        const selection = window.getSelection();
        selection.addRange(this.rng);
    }

    deselect() {
        const selection = window.getSelection();
        selection.removeAllRanges();
    }

    compareOrigin(range) {
        return range.rng.compareBoundaryPoints(Range.END_TO_END, this.rng);

    }

    static fromPoint(point) {
        const range = document.caretRangeFromPoint(point.x, point.y);
        return range === null ? null : new Range(range);
    }
}
