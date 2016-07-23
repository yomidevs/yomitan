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


class RangeSource {
    constructor(range) {
        this.rng = range;
    }

    text() {
        return this.rng.toString();
    }

    setLength(length) {
        const end = RangeSource.seekEnd(this.rng.startContainer, this.rng.startOffset + length);
        this.rng.setEnd(end.node, end.offset);
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
        selection.removeAllRanges();
        selection.addRange(this.rng);
    }

    deselect() {
        const selection = window.getSelection();
        selection.removeAllRanges();
    }

    equals(other) {
        return other.rng && other.rng.compareBoundaryPoints(Range.START_TO_START, this.rng) == 0;
    }

    static seekEnd(node, length) {
        const state = {node, offset: 0, length};

        if (!RangeSource.seekEndRecurse(node, state)) {
            return {node: state.node, offset: state.offset};
        }

        for (let sibling = node.nextSibling; sibling !== null; sibling = sibling.nextSibling) {
            if (!RangeSource.seekEndRecurse(sibling, state)) {
                return {node: state.node, offset: state.offset};
            }
        }

        for (let sibling = node.parentElement.nextSibling; sibling !== null; sibling = sibling.nextSibling) {
            if (!RangeSource.seekEndRecurse(sibling, state)) {
                return {node: state.node, offset: state.offset};
            }
        }

        return {node: state.node, offset: state.offset};
    }

    static seekEndRecurse(node, state) {
        if (node.nodeType === 3) {
            const consumed = Math.min(node.length, state.length);
            state.node = node;
            state.offset = consumed;
            state.length -= consumed;
        } else {
            for (let i = 0; i < node.childNodes.length; ++i) {
                if (!RangeSource.seekEndRecurse(node.childNodes[i], state)) {
                    break;
                }
            }
        }

        return state.length > 0;
    }
}
