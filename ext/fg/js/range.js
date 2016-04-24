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

        this.range.setEnd(node, offset + length);
        return length;
    }

    containsPoint(point) {
        const rect = this.getBoundingClientRect();
        return point.x >= rect.left && point.x <= rect.right;
    }

    getBoundingClientRect() {
        const range       = this.range.cloneRange();
        const startOffset = range.startOffset;
        const endOffset   = range.endOffset;
        const node        = range.startContainer;

        range.setStart(node, Math.max(0, startOffset - 1));
        range.setEnd(node, Math.min(node.length, endOffset + 1));

        return range.getBoundingClientRect();
    }

    select(length) {
        const range = this.range.cloneRange();
        range.setEnd(range.startContainer, range.startOffset + length);

        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
    }

    deselect() {
        const selection = window.getSelection();
        selection.removeAllRanges();
    }

    equals(range) {
        const equal =
            range.range.compareBoundaryPoints(Range.END_TO_END, this.range) === 0 &&
            range.range.compareBoundaryPoints(Range.START_TO_START, this.range) === 0;

        return equal;

    }

    static fromPoint(point) {
        const range = document.caretRangeFromPoint(point.x, point.y);
        return range === null ? null : new Range(range);
    }
}
