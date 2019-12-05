/*
 * Copyright (C) 2019  Alex Yatskov <alex@foosoft.net>
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


class TextScanner {
    constructor(node, ignoreNodes, popup, onTextSearch) {
        this.node = node;
        this.ignoreNodes = (Array.isArray(ignoreNodes) && ignoreNodes.length > 0 ? ignoreNodes.join(',') : null);
        this.popup = popup;
        this.onTextSearch = onTextSearch;

        this.popupTimerPromise = null;
        this.textSourceCurrent = null;
        this.pendingLookup = false;
        this.options = null;

        this.enabled = false;
        this.eventListeners = [];

        this.primaryTouchIdentifier = null;
        this.preventNextContextMenu = false;
        this.preventNextMouseDown = false;
        this.preventNextClick = false;
        this.preventScroll = false;
    }

    onMouseOver(e) {
        if (this.popup && e.target === this.popup.container) {
            this.popupTimerClear();
        }
    }

    onMouseMove(e) {
        this.popupTimerClear();

        if (this.pendingLookup || DOM.isMouseButtonDown(e, 'primary')) {
            return;
        }

        const scanningOptions = this.options.scanning;
        const scanningModifier = scanningOptions.modifier;
        if (!(
            TextScanner.isScanningModifierPressed(scanningModifier, e) ||
            (scanningOptions.middleMouse && DOM.isMouseButtonDown(e, 'auxiliary'))
        )) {
            return;
        }

        const search = async () => {
            if (scanningModifier === 'none') {
                if (!await this.popupTimerWait()) {
                    // Aborted
                    return;
                }
            }

            await this.searchAt(e.clientX, e.clientY, 'mouse');
        };

        search();
    }

    onMouseDown(e) {
        if (this.preventNextMouseDown) {
            this.preventNextMouseDown = false;
            this.preventNextClick = true;
            e.preventDefault();
            e.stopPropagation();
            return false;
        }

        if (DOM.isMouseButtonPressed(e, 'primary')) {
            this.popupTimerClear();
            this.searchClear();
        }
    }

    onMouseOut() {
        this.popupTimerClear();
    }

    onClick(e) {
        if (this.preventNextClick) {
            this.preventNextClick = false;
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
    }

    onAuxClick() {
        this.preventNextContextMenu = false;
    }

    onContextMenu(e) {
        if (this.preventNextContextMenu) {
            this.preventNextContextMenu = false;
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
    }

    onTouchStart(e) {
        if (this.primaryTouchIdentifier !== null || e.changedTouches.length === 0) {
            return;
        }

        this.preventScroll = false;
        this.preventNextContextMenu = false;
        this.preventNextMouseDown = false;
        this.preventNextClick = false;

        const primaryTouch = e.changedTouches[0];
        if (DOM.isPointInSelection(primaryTouch.clientX, primaryTouch.clientY, this.node.getSelection())) {
            return;
        }

        this.primaryTouchIdentifier = primaryTouch.identifier;

        if (this.pendingLookup) {
            return;
        }

        const textSourceCurrentPrevious = this.textSourceCurrent !== null ? this.textSourceCurrent.clone() : null;

        this.searchAt(primaryTouch.clientX, primaryTouch.clientY, 'touchStart')
        .then(() => {
            if (
                this.textSourceCurrent === null ||
                this.textSourceCurrent.equals(textSourceCurrentPrevious)
            ) {
                return;
            }

            this.preventScroll = true;
            this.preventNextContextMenu = true;
            this.preventNextMouseDown = true;
        });
    }

    onTouchEnd(e) {
        if (
            this.primaryTouchIdentifier === null ||
            TextScanner.getIndexOfTouch(e.changedTouches, this.primaryTouchIdentifier) < 0
        ) {
            return;
        }

        this.primaryTouchIdentifier = null;
        this.preventScroll = false;
        this.preventNextClick = false;
        // Don't revert context menu and mouse down prevention,
        // since these events can occur after the touch has ended.
        // this.preventNextContextMenu = false;
        // this.preventNextMouseDown = false;
    }

    onTouchCancel(e) {
        this.onTouchEnd(e);
    }

    onTouchMove(e) {
        if (!this.preventScroll || !e.cancelable || this.primaryTouchIdentifier === null) {
            return;
        }

        const touches = e.changedTouches;
        const index = TextScanner.getIndexOfTouch(touches, this.primaryTouchIdentifier);
        if (index < 0) {
            return;
        }

        const primaryTouch = touches[index];
        this.searchAt(primaryTouch.clientX, primaryTouch.clientY, 'touchMove');

        e.preventDefault(); // Disable scroll
    }

    async popupTimerWait() {
        const delay = this.options.scanning.delay;
        const promise = promiseTimeout(delay, true);
        this.popupTimerPromise = promise;
        try {
            return await promise;
        } finally {
            if (this.popupTimerPromise === promise) {
                this.popupTimerPromise = null;
            }
        }
    }

    popupTimerClear() {
        if (this.popupTimerPromise !== null) {
            this.popupTimerPromise.resolve(false);
            this.popupTimerPromise = null;
        }
    }

    setEnabled(enabled) {
        if (enabled) {
            if (!this.enabled) {
                this.hookEvents();
                this.enabled = true;
            }
        } else {
            if (this.enabled) {
                this.clearEventListeners();
                this.enabled = false;
            }
            this.searchClear();
        }
    }

    hookEvents() {
        this.addEventListener('mousedown', this.onMouseDown.bind(this));
        this.addEventListener('mousemove', this.onMouseMove.bind(this));
        this.addEventListener('mouseover', this.onMouseOver.bind(this));
        this.addEventListener('mouseout', this.onMouseOut.bind(this));

        if (this.options.scanning.touchInputEnabled) {
            this.addEventListener('click', this.onClick.bind(this));
            this.addEventListener('auxclick', this.onAuxClick.bind(this));
            this.addEventListener('touchstart', this.onTouchStart.bind(this));
            this.addEventListener('touchend', this.onTouchEnd.bind(this));
            this.addEventListener('touchcancel', this.onTouchCancel.bind(this));
            this.addEventListener('touchmove', this.onTouchMove.bind(this), {passive: false});
            this.addEventListener('contextmenu', this.onContextMenu.bind(this));
        }
    }

    addEventListener(type, listener, options) {
        this.node.addEventListener(type, listener, options);
        this.eventListeners.push([type, listener, options]);
    }

    clearEventListeners() {
        for (const [type, listener, options] of this.eventListeners) {
            this.node.removeEventListener(type, listener, options);
        }
        this.eventListeners = [];
    }

    setOptions(options) {
        this.options = options;
    }

    async searchAt(x, y, cause) {
        try {
            this.popupTimerClear();

            if (this.pendingLookup || (this.popup && await this.popup.containsPoint(x, y))) {
                return;
            }

            const textSource = docRangeFromPoint(x, y, this.options);
            if (this.textSourceCurrent !== null && this.textSourceCurrent.equals(textSource)) {
                return;
            }

            try {
                await this.onTextSearch(textSource, cause);
            } finally {
                if (textSource !== null) {
                    textSource.cleanup();
                }
            }
        } catch (e) {
            this.onError(e);
        }
    }

    setTextSourceScanLength(textSource, length) {
        textSource.setEndOffset(length);
        if (this.ignoreNodes === null || !textSource.range) {
            return;
        }

        length = textSource.text().length;
        while (textSource.range && length > 0) {
            const nodes = TextSourceRange.getNodesInRange(textSource.range);
            if (!TextSourceRange.anyNodeMatchesSelector(nodes, this.ignoreNodes)) {
                break;
            }
            --length;
            textSource.setEndOffset(length);
        }
    }

    searchClear() {
        if (this.textSourceCurrent !== null) {
            if (this.options.scanning.selectText) {
                this.textSourceCurrent.deselect();
            }
            this.textSourceCurrent = null;
        }
    }

    getCurrentTextSource() {
        return this.textSourceCurrent;
    }

    setCurrentTextSource(textSource) {
        return this.textSourceCurrent = textSource;
    }

    static isScanningModifierPressed(scanningModifier, mouseEvent) {
        switch (scanningModifier) {
            case 'alt': return mouseEvent.altKey;
            case 'ctrl': return mouseEvent.ctrlKey;
            case 'shift': return mouseEvent.shiftKey;
            case 'none': return true;
            default: return false;
        }
    }

    static getIndexOfTouch(touchList, identifier) {
        for (const i in touchList) {
            const t = touchList[i];
            if (t.identifier === identifier) {
                return i;
            }
        }
        return -1;
    }
}
