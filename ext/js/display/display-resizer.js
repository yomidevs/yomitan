/*
 * Copyright (C) 2021  Yomichan Authors
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

class DisplayResizer {
    constructor(display) {
        this._display = display;
        this._token = null;
        this._handle = null;
        this._touchIdentifier = null;
        this._startSize = null;
        this._startOffset = null;
        this._eventListeners = new EventListenerCollection();
    }

    prepare() {
        this._handle = document.querySelector('#frame-resizer-handle');
        if (this._handle === null) { return; }

        this._handle.addEventListener('mousedown', this._onFrameResizerMouseDown.bind(this), false);
        this._handle.addEventListener('touchstart', this._onFrameResizerTouchStart.bind(this), false);
    }

    // Private

    _onFrameResizerMouseDown(e) {
        if (e.button !== 0) { return; }
        // Don't do e.preventDefault() here; this allows mousemove events to be processed
        // if the pointer moves out of the frame.
        this._startFrameResize(e);
    }

    _onFrameResizerTouchStart(e) {
        e.preventDefault();
        this._startFrameResizeTouch(e);
    }

    _onFrameResizerMouseUp() {
        this._stopFrameResize();
    }

    _onFrameResizerWindowBlur() {
        this._stopFrameResize();
    }

    _onFrameResizerMouseMove(e) {
        if ((e.buttons & 0x1) === 0x0) {
            this._stopFrameResize();
        } else {
            if (this._startSize === null) { return; }
            const {clientX: x, clientY: y} = e;
            this._updateFrameSize(x, y);
        }
    }

    _onFrameResizerTouchEnd(e) {
        if (this._getTouch(e.changedTouches, this._touchIdentifier) === null) { return; }
        this._stopFrameResize();
    }

    _onFrameResizerTouchCancel(e) {
        if (this._getTouch(e.changedTouches, this._touchIdentifier) === null) { return; }
        this._stopFrameResize();
    }

    _onFrameResizerTouchMove(e) {
        if (this._startSize === null) { return; }
        const primaryTouch = this._getTouch(e.changedTouches, this._touchIdentifier);
        if (primaryTouch === null) { return; }
        const {clientX: x, clientY: y} = primaryTouch;
        this._updateFrameSize(x, y);
    }

    _startFrameResize(e) {
        if (this._token !== null) { return; }

        const {clientX: x, clientY: y} = e;
        const token = {};
        this._token = token;
        this._startOffset = {x, y};
        this._eventListeners.addEventListener(window, 'mouseup', this._onFrameResizerMouseUp.bind(this), false);
        this._eventListeners.addEventListener(window, 'blur', this._onFrameResizerWindowBlur.bind(this), false);
        this._eventListeners.addEventListener(window, 'mousemove', this._onFrameResizerMouseMove.bind(this), false);

        const {documentElement} = document;
        if (documentElement !== null) {
            documentElement.dataset.isResizing = 'true';
        }

        this._initializeFrameResize(token);
    }

    _startFrameResizeTouch(e) {
        if (this._token !== null) { return; }

        const {clientX: x, clientY: y, identifier} = e.changedTouches[0];
        const token = {};
        this._token = token;
        this._startOffset = {x, y};
        this._touchIdentifier = identifier;
        this._eventListeners.addEventListener(window, 'touchend', this._onFrameResizerTouchEnd.bind(this), false);
        this._eventListeners.addEventListener(window, 'touchcancel', this._onFrameResizerTouchCancel.bind(this), false);
        this._eventListeners.addEventListener(window, 'blur', this._onFrameResizerWindowBlur.bind(this), false);
        this._eventListeners.addEventListener(window, 'touchmove', this._onFrameResizerTouchMove.bind(this), false);

        const {documentElement} = document;
        if (documentElement !== null) {
            documentElement.dataset.isResizing = 'true';
        }

        this._initializeFrameResize(token);
    }

    async _initializeFrameResize(token) {
        const {parentPopupId} = this._display;
        if (parentPopupId === null) { return; }

        const size = await this._display.invokeParentFrame('popup.getFrameSize', {id: parentPopupId});
        if (this._token !== token) { return; }
        this._startSize = size;
    }

    _stopFrameResize() {
        if (this._token === null) { return; }

        this._eventListeners.removeAllEventListeners();
        this._startSize = null;
        this._startOffset = null;
        this._touchIdentifier = null;
        this._token = null;

        const {documentElement} = document;
        if (documentElement !== null) {
            delete documentElement.dataset.isResizing;
        }
    }

    async _updateFrameSize(x, y) {
        const {parentPopupId} = this._display;
        if (parentPopupId === null) { return; }

        const handleSize = this._handle.getBoundingClientRect();
        let {width, height} = this._startSize;
        width += x - this._startOffset.x;
        height += y - this._startOffset.y;
        width = Math.max(Math.max(0, handleSize.width), width);
        height = Math.max(Math.max(0, handleSize.height), height);
        await this._display.invokeParentFrame('popup.setFrameSize', {id: parentPopupId, width, height});
    }

    _getTouch(touchList, identifier) {
        for (const touch of touchList) {
            if (touch.identifier === identifier) {
                return touch;
            }
        }
        return null;
    }
}
