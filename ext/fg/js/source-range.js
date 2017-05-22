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


class TextSourceRange {
    constructor(range) {
        this.rng = range;
        this.content = '';
    }

    clone() {
        const tmp = new TextSourceRange(this.rng.cloneRange());
        tmp.content = this.content;
        return tmp;
    }

    text() {
        return this.content;
    }

    setEndOffset(length) {
        const state = TextSourceRange.seekForward(this.rng.startContainer, this.rng.startOffset, length);
        this.rng.setEnd(state.node, state.offset);
        this.content = state.content;
        return length - state.remainder;
    }

    setStartOffset(length) {
        const state = TextSourceRange.seekBackward(this.rng.startContainer, this.rng.startOffset, length);
        this.rng.setStart(state.node, state.offset);
        this.content = state.content;
        return length - state.remainder;
    }

    containsPoint(point) {
        const rect = this.getPaddedRect();
        return point.x >= rect.left && point.x <= rect.right;
    }

    getRect() {
        return this.rng.getBoundingClientRect();
    }

    getPaddedRect() {
        const range = this.rng.cloneRange();
        const startOffset = range.startOffset;
        const endOffset = range.endOffset;
        const node = range.startContainer;

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
        return other.rng && other.rng.compareBoundaryPoints(Range.START_TO_START, this.rng) === 0;
    }

    static shouldEnter(node) {
        if (node.nodeType !== 1) {
            return false;
        }

        const skip = ['RT', 'SCRIPT', 'STYLE'];
        if (skip.includes(node.nodeName)) {
            return false;
        }

        const style = window.getComputedStyle(node);
        const hidden =
            style.visibility === 'hidden' ||
            style.display === 'none' ||
            parseFloat(style.fontSize) === 0;

        return !hidden;
    }

    static seekForward(node, offset, length) {
        const state = {node, offset, remainder: length, content: ''};
        if (!TextSourceRange.seekForwardHelper(node, state)) {
            return state;
        }

        for (let current = node; current !== null; current = current.parentElement) {
            for (let sibling = current.nextSibling; sibling !== null; sibling = sibling.nextSibling) {
                if (!TextSourceRange.seekForwardHelper(sibling, state)) {
                    return state;
                }
            }
        }

        return state;
    }

    static seekForwardHelper(node, state) {
        if (node.nodeType === 3 && node.parentElement && TextSourceRange.shouldEnter(node.parentElement)) {
            const offset = state.node === node ? state.offset : 0;
            const remaining = node.length - offset;
            const consumed = Math.min(remaining, state.remainder);
            state.content = state.content + node.nodeValue.substring(offset, offset + consumed);
            state.node = node;
            state.offset = offset + consumed;
            state.remainder -= consumed;
        } else if (TextSourceRange.shouldEnter(node)) {
            for (let i = 0; i < node.childNodes.length; ++i) {
                if (!TextSourceRange.seekForwardHelper(node.childNodes[i], state)) {
                    break;
                }
            }
        }

        return state.remainder > 0;
    }

    static seekBackward(node, offset, length) {
        const state = {node, offset, remainder: length, content: ''};
        if (!TextSourceRange.seekBackwardHelper(node, state)) {
            return state;
        }

        for (let current = node; current !== null; current = current.parentElement) {
            for (let sibling = current.previousSibling; sibling !== null; sibling = sibling.previousSibling) {
                if (!TextSourceRange.seekBackwardHelper(sibling, state)) {
                    return state;
                }
            }
        }

        return state;
    }

    static seekBackwardHelper(node, state) {
        if (node.nodeType === 3 && node.parentElement && TextSourceRange.shouldEnter(node.parentElement)) {
            const offset = state.node === node ? state.offset : node.length;
            const remaining = offset;
            const consumed = Math.min(remaining, state.remainder);
            state.content = node.nodeValue.substring(offset - consumed, offset) + state.content;
            state.node = node;
            state.offset = offset - consumed;
            state.remainder -= consumed;
        } else if (TextSourceRange.shouldEnter(node)) {
            for (let i = node.childNodes.length - 1; i >= 0; --i) {
                if (!TextSourceRange.seekBackwardHelper(node.childNodes[i], state)) {
                    break;
                }
            }
        }

        return state.remainder > 0;
    }
}
