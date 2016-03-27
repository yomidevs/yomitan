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
    if (length === 0) {
        return null;
    }

    range.setEnd(node, offset + length);
    return range;
}

function getRangePaddedRect(range) {
    const node        = range.startContainer;
    const startOffset = range.startOffset;
    const endOffset   = range.endOffset;

    range.setStart(node, Math.max(0, startOffset - 1));
    range.setEnd(node, Math.min(node.length, endOffset + 1));
    const rect = range.getBoundingClientRect();
    range.setStart(node, startOffset);
    range.setEnd(node, endOffset);

    return rect;
}

function getPopupPositionForRange(popup, range, offset) {
    const rangeRect = range.getBoundingClientRect();
    const popupRect = popup.get(0).getBoundingClientRect();

    let posX = rangeRect.left;
    if (posX + popupRect.width >= window.innerWidth) {
        posX = window.innerWidth - popupRect.width;
    }

    let posY = rangeRect.bottom + offset;
    if (posY + popupRect.height >= window.innerHeight) {
        posY = rangeRect.top - popupRect.height - offset;
    }

    return {x: posX, y: posY};
}

function whenEnabled(callback) {
    return (...args) => {
        getState((state) => {
            if (state === 'enabled') {
                callback(...args);
            }
        });
    };
}
