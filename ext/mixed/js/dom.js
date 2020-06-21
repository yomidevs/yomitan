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

    static addFullscreenChangeEventListener(onFullscreenChanged, eventListenerCollection=null) {
        const target = document;
        const options = false;
        const fullscreenEventNames = [
            'fullscreenchange',
            'MSFullscreenChange',
            'mozfullscreenchange',
            'webkitfullscreenchange'
        ];
        for (const eventName of fullscreenEventNames) {
            if (eventListenerCollection === null) {
                target.addEventListener(eventName, onFullscreenChanged, options);
            } else {
                eventListenerCollection.addEventListener(target, eventName, onFullscreenChanged, options);
            }
        }
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

    static getNodesInRange(range) {
        const end = range.endContainer;
        const nodes = [];
        for (let node = range.startContainer; node !== null; node = DOM.getNextNode(node)) {
            nodes.push(node);
            if (node === end) { break; }
        }
        return nodes;
    }

    static getNextNode(node) {
        let next = node.firstChild;
        if (next === null) {
            while (true) {
                next = node.nextSibling;
                if (next !== null) { break; }

                next = node.parentNode;
                if (next === null) { break; }

                node = next;
            }
        }
        return next;
    }

    static anyNodeMatchesSelector(nodes, selector) {
        const ELEMENT_NODE = Node.ELEMENT_NODE;
        for (let node of nodes) {
            for (; node !== null; node = node.parentNode) {
                if (node.nodeType !== ELEMENT_NODE) { continue; }
                if (node.matches(selector)) { return true; }
                break;
            }
        }
        return false;
    }
}
