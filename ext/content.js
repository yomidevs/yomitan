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


function getRangeAtCursor(e, lookAhead) {
    const range = document.caretRangeFromPoint(e.clientX, e.clientY);
    if (range === null) {
        return null;
    }

    const node = range.startContainer;
    if (node.nodeType !== 3 /* TEXT_NODE */) {
        return null;
    }

    const offset = range.startOffset;
    const length = Math.min(node.length - offset, lookAhead);

    range.setEnd(node, offset + length);
    return range;
}


function onMouseDown(e) {
    e.preventDefault();

    const range = getRangeAtCursor(e, 20);
    if (range === null) {
        return;
    }

    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);

    findTerm(range.toString(), response => {
        console.log(response);
    });
}

window.addEventListener('mousedown', onMouseDown, false);
