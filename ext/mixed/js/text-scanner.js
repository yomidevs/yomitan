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

/* global
 * DOM
 * TextSourceRange
 * docRangeFromPoint
 */

class TextScanner extends EventDispatcher {
    constructor({node, ignoreElements, ignorePoint, search}) {
        super();
        this._node = node;
        this._ignoreElements = ignoreElements;
        this._ignorePoint = ignorePoint;
        this._search = search;

        this._ignoreNodes = null;

        this._causeCurrent = null;
        this._scanTimerPromise = null;
        this._textSourceCurrent = null;
        this._textSourceCurrentSelected = false;
        this._pendingLookup = false;
        this._options = null;

        this._enabled = false;
        this._eventListeners = new EventListenerCollection();

        this._primaryTouchIdentifier = null;
        this._preventNextContextMenu = false;
        this._preventNextMouseDown = false;
        this._preventNextClick = false;
        this._preventScroll = false;

        this._canClearSelection = true;
    }

    get canClearSelection() {
        return this._canClearSelection;
    }

    set canClearSelection(value) {
        this._canClearSelection = value;
    }

    get ignoreNodes() {
        return this._ignoreNodes;
    }

    set ignoreNodes(value) {
        this._ignoreNodes = value;
    }

    get causeCurrent() {
        return this._causeCurrent;
    }

    setEnabled(enabled) {
        this._eventListeners.removeAllEventListeners();
        this._enabled = enabled;
        if (this._enabled) {
            this._hookEvents();
        } else {
            this.clearSelection(true);
        }
    }

    setOptions(options) {
        this._options = options;
    }

    async searchAt(x, y, cause) {
        try {
            this._scanTimerClear();

            if (this._pendingLookup) {
                return;
            }

            if (typeof this._ignorePoint === 'function' && await this._ignorePoint(x, y)) {
                return;
            }

            const textSource = docRangeFromPoint(x, y, this._options.scanning.deepDomScan);
            try {
                if (this._textSourceCurrent !== null && this._textSourceCurrent.equals(textSource)) {
                    return;
                }

                this._pendingLookup = true;
                const result = await this._search(textSource, cause);
                if (result !== null) {
                    this._causeCurrent = cause;
                    this.setCurrentTextSource(textSource);
                }
                this._pendingLookup = false;
            } finally {
                if (textSource !== null) {
                    textSource.cleanup();
                }
            }
        } catch (e) {
            yomichan.logError(e);
        }
    }

    getTextSourceContent(textSource, length) {
        const clonedTextSource = textSource.clone();

        clonedTextSource.setEndOffset(length);

        if (this._ignoreNodes !== null && clonedTextSource.range) {
            length = clonedTextSource.text().length;
            while (clonedTextSource.range && length > 0) {
                const nodes = TextSourceRange.getNodesInRange(clonedTextSource.range);
                if (!TextSourceRange.anyNodeMatchesSelector(nodes, this._ignoreNodes)) {
                    break;
                }
                --length;
                clonedTextSource.setEndOffset(length);
            }
        }

        return clonedTextSource.text();
    }

    clearSelection(passive) {
        if (!this._canClearSelection) { return; }
        if (this._textSourceCurrent !== null) {
            if (this._textSourceCurrentSelected) {
                this._textSourceCurrent.deselect();
            }
            this._textSourceCurrent = null;
            this._textSourceCurrentSelected = false;
        }
        this.trigger('clearSelection', {passive});
    }

    getCurrentTextSource() {
        return this._textSourceCurrent;
    }

    setCurrentTextSource(textSource) {
        this._textSourceCurrent = textSource;
        if (this._options.scanning.selectText) {
            this._textSourceCurrent.select();
            this._textSourceCurrentSelected = true;
        } else {
            this._textSourceCurrentSelected = false;
        }
    }

    // Private

    _onMouseOver(e) {
        if (this._ignoreElements().includes(e.target)) {
            this._scanTimerClear();
        }
    }

    _onMouseMove(e) {
        this._scanTimerClear();

        if (this._pendingLookup || DOM.isMouseButtonDown(e, 'primary')) {
            return;
        }

        const modifiers = DOM.getActiveModifiers(e);
        this.trigger('activeModifiersChanged', {modifiers});

        const scanningOptions = this._options.scanning;
        const scanningModifier = scanningOptions.modifier;
        if (!(
            this._isScanningModifierPressed(scanningModifier, e) ||
            (scanningOptions.middleMouse && DOM.isMouseButtonDown(e, 'auxiliary'))
        )) {
            return;
        }

        const search = async () => {
            if (scanningModifier === 'none') {
                if (!await this._scanTimerWait()) {
                    // Aborted
                    return;
                }
            }

            await this.searchAt(e.clientX, e.clientY, 'mouse');
        };

        search();
    }

    _onMouseDown(e) {
        if (this._preventNextMouseDown) {
            this._preventNextMouseDown = false;
            this._preventNextClick = true;
            e.preventDefault();
            e.stopPropagation();
            return false;
        }

        if (DOM.isMouseButtonDown(e, 'primary')) {
            this._scanTimerClear();
            this.clearSelection(false);
        }
    }

    _onMouseOut() {
        this._scanTimerClear();
    }

    _onClick(e) {
        if (this._preventNextClick) {
            this._preventNextClick = false;
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
    }

    _onAuxClick() {
        this._preventNextContextMenu = false;
    }

    _onContextMenu(e) {
        if (this._preventNextContextMenu) {
            this._preventNextContextMenu = false;
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
    }

    _onTouchStart(e) {
        if (this._primaryTouchIdentifier !== null || e.changedTouches.length === 0) {
            return;
        }

        this._preventScroll = false;
        this._preventNextContextMenu = false;
        this._preventNextMouseDown = false;
        this._preventNextClick = false;

        const primaryTouch = e.changedTouches[0];
        if (DOM.isPointInSelection(primaryTouch.clientX, primaryTouch.clientY, window.getSelection())) {
            return;
        }

        this._primaryTouchIdentifier = primaryTouch.identifier;

        if (this._pendingLookup) {
            return;
        }

        const textSourceCurrentPrevious = this._textSourceCurrent !== null ? this._textSourceCurrent.clone() : null;

        this.searchAt(primaryTouch.clientX, primaryTouch.clientY, 'touchStart')
            .then(() => {
                if (
                    this._textSourceCurrent === null ||
                    this._textSourceCurrent.equals(textSourceCurrentPrevious)
                ) {
                    return;
                }

                this._preventScroll = true;
                this._preventNextContextMenu = true;
                this._preventNextMouseDown = true;
            });
    }

    _onTouchEnd(e) {
        if (
            this._primaryTouchIdentifier === null ||
            this._getTouch(e.changedTouches, this._primaryTouchIdentifier) === null
        ) {
            return;
        }

        this._primaryTouchIdentifier = null;
        this._preventScroll = false;
        this._preventNextClick = false;
        // Don't revert context menu and mouse down prevention, since these events can occur after the touch has ended.
        // I.e. this._preventNextContextMenu and this._preventNextMouseDown should not be assigned to false.
    }

    _onTouchCancel(e) {
        this._onTouchEnd(e);
    }

    _onTouchMove(e) {
        if (!this._preventScroll || !e.cancelable || this._primaryTouchIdentifier === null) {
            return;
        }

        const primaryTouch = this._getTouch(e.changedTouches, this._primaryTouchIdentifier);
        if (primaryTouch === null) {
            return;
        }

        this.searchAt(primaryTouch.clientX, primaryTouch.clientY, 'touchMove');

        e.preventDefault(); // Disable scroll
    }

    async _scanTimerWait() {
        const delay = this._options.scanning.delay;
        const promise = promiseTimeout(delay, true);
        this._scanTimerPromise = promise;
        try {
            return await promise;
        } finally {
            if (this._scanTimerPromise === promise) {
                this._scanTimerPromise = null;
            }
        }
    }

    _scanTimerClear() {
        if (this._scanTimerPromise !== null) {
            this._scanTimerPromise.resolve(false);
            this._scanTimerPromise = null;
        }
    }

    _hookEvents() {
        const eventListenerInfos = this._getMouseEventListeners();
        if (this._options.scanning.touchInputEnabled) {
            eventListenerInfos.push(...this._getTouchEventListeners());
        }

        for (const [node, type, listener, options] of eventListenerInfos) {
            this._eventListeners.addEventListener(node, type, listener, options);
        }
    }

    _getMouseEventListeners() {
        return [
            [this._node, 'mousedown', this._onMouseDown.bind(this)],
            [this._node, 'mousemove', this._onMouseMove.bind(this)],
            [this._node, 'mouseover', this._onMouseOver.bind(this)],
            [this._node, 'mouseout', this._onMouseOut.bind(this)]
        ];
    }

    _getTouchEventListeners() {
        return [
            [this._node, 'click', this._onClick.bind(this)],
            [this._node, 'auxclick', this._onAuxClick.bind(this)],
            [this._node, 'touchstart', this._onTouchStart.bind(this)],
            [this._node, 'touchend', this._onTouchEnd.bind(this)],
            [this._node, 'touchcancel', this._onTouchCancel.bind(this)],
            [this._node, 'touchmove', this._onTouchMove.bind(this), {passive: false}],
            [this._node, 'contextmenu', this._onContextMenu.bind(this)]
        ];
    }

    _isScanningModifierPressed(scanningModifier, mouseEvent) {
        switch (scanningModifier) {
            case 'alt': return mouseEvent.altKey;
            case 'ctrl': return mouseEvent.ctrlKey;
            case 'shift': return mouseEvent.shiftKey;
            case 'meta': return mouseEvent.metaKey;
            case 'none': return true;
            default: return false;
        }
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
