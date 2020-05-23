/*
 * Copyright (C) 2019-2020  Yomichan Authors
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
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */


class DOM {
    static isPointInRect(x, y, rect) {
        return (
            x >= rect.left && x < rect.right &&
            y >= rect.top && y < rect.bottom
        );
    }

    static isPointInAnyRect(x, y, rects) {
        for (const rect of rects) {
            if (DOM.isPointInRect(x, y, rect)) {
                return true;
            }
        }
        return false;
    }

    static isPointInSelection(x, y, selection) {
        for (let i = 0; i < selection.rangeCount; ++i) {
            const range = selection.getRangeAt(i);
            if (DOM.isPointInAnyRect(x, y, range.getClientRects())) {
                return true;
            }
        }
        return false;
    }

    static isMouseButtonPressed(mouseEvent, button) {
        const mouseEventButton = mouseEvent.button;
        switch (button) {
            case 'primary': return mouseEventButton === 0;
            case 'secondary': return mouseEventButton === 2;
            case 'auxiliary': return mouseEventButton === 1;
            default: return false;
        }
    }

    static isMouseButtonDown(mouseEvent, button) {
        const mouseEventButtons = mouseEvent.buttons;
        switch (button) {
            case 'primary': return (mouseEventButtons & 0x1) !== 0x0;
            case 'secondary': return (mouseEventButtons & 0x2) !== 0x0;
            case 'auxiliary': return (mouseEventButtons & 0x4) !== 0x0;
            default: return false;
        }
    }

    static getActiveModifiers(event) {
        const modifiers = new Set();
        if (event.altKey) { modifiers.add('alt'); }
        if (event.ctrlKey) { modifiers.add('ctrl'); }
        if (event.metaKey) { modifiers.add('meta'); }
        if (event.shiftKey) { modifiers.add('shift'); }
        return modifiers;
    }

    static getKeyFromEvent(event) {
        const key = event.key;
        return (typeof key === 'string' ? (key.length === 1 ? key.toUpperCase() : key) : '');
    }

    static getFullscreenElement() {
        return (
            document.fullscreenElement ||
            document.msFullscreenElement ||
            document.mozFullScreenElement ||
            document.webkitFullscreenElement ||
            null
        );
    }
}
