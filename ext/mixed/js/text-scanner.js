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
 * DocumentUtil
 * api
 */

class TextScanner extends EventDispatcher {
    constructor({node, ignoreElements, ignorePoint, documentUtil, getOptionsContext, searchTerms=false, searchKanji=false, searchOnClick=false}) {
        super();
        this._node = node;
        this._ignoreElements = ignoreElements;
        this._ignorePoint = ignorePoint;
        this._documentUtil = documentUtil;
        this._getOptionsContext = getOptionsContext;
        this._searchTerms = searchTerms;
        this._searchKanji = searchKanji;
        this._searchOnClick = searchOnClick;

        this._isPrepared = false;
        this._ignoreNodes = null;

        this._inputCurrent = null;
        this._scanTimerPromise = null;
        this._textSourceCurrent = null;
        this._textSourceCurrentSelected = false;
        this._pendingLookup = false;

        this._deepContentScan = false;
        this._selectText = false;
        this._modifier = 'none';
        this._useMiddleMouse = false;
        this._delay = 0;
        this._touchInputEnabled = false;
        this._scanLength = 1;
        this._sentenceExtent = 1;
        this._layoutAwareScan = false;

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

    prepare() {
        this._isPrepared = true;
        this.setEnabled(this._enabled);
    }

    setEnabled(enabled) {
        this._eventListeners.removeAllEventListeners();
        this._enabled = enabled;
        if (this._enabled && this._isPrepared) {
            this._hookEvents();
        } else {
            this.clearSelection(true);
        }
    }

    setOptions({deepContentScan, selectText, modifier, useMiddleMouse, delay, touchInputEnabled, scanLength, sentenceExtent, layoutAwareScan}) {
        if (typeof deepContentScan === 'boolean') {
            this._deepContentScan = deepContentScan;
        }
        if (typeof selectText === 'boolean') {
            this._selectText = selectText;
        }
        if (typeof modifier === 'string') {
            this._modifier = modifier;
        }
        if (typeof useMiddleMouse === 'boolean') {
            this._useMiddleMouse = useMiddleMouse;
        }
        if (typeof delay === 'number') {
            this._delay = delay;
        }
        if (typeof touchInputEnabled === 'boolean') {
            this._touchInputEnabled = touchInputEnabled;
        }
        if (typeof scanLength === 'number') {
            this._scanLength = scanLength;
        }
        if (typeof sentenceExtent === 'number') {
            this._sentenceExtent = sentenceExtent;
        }
        if (typeof layoutAwareScan === 'boolean') {
            this._layoutAwareScan = layoutAwareScan;
        }
    }

    getTextSourceContent(textSource, length, layoutAwareScan) {
        const clonedTextSource = textSource.clone();

        clonedTextSource.setEndOffset(length, layoutAwareScan);

        if (this._ignoreNodes !== null && clonedTextSource.range) {
            length = clonedTextSource.text().length;
            while (clonedTextSource.range && length > 0) {
                const nodes = DocumentUtil.getNodesInRange(clonedTextSource.range);
                if (!DocumentUtil.anyNodeMatchesSelector(nodes, this._ignoreNodes)) {
                    break;
                }
                --length;
                clonedTextSource.setEndOffset(length, layoutAwareScan);
            }
        }

        return clonedTextSource.text();
    }

    hasSelection() {
        return (this._textSourceCurrent !== null);
    }

    clearSelection(passive) {
        if (!this._canClearSelection) { return; }
        if (this._textSourceCurrent !== null) {
            if (this._textSourceCurrentSelected) {
                this._textSourceCurrent.deselect();
            }
            this._textSourceCurrent = null;
            this._textSourceCurrentSelected = false;
            this._inputCurrent = null;
        }
        this.trigger('clearSelection', {passive});
    }

    getCurrentTextSource() {
        return this._textSourceCurrent;
    }

    setCurrentTextSource(textSource) {
        this._textSourceCurrent = textSource;
        if (this._selectText) {
            this._textSourceCurrent.select();
            this._textSourceCurrentSelected = true;
        } else {
            this._textSourceCurrentSelected = false;
        }
    }

    async searchLast() {
        if (this._textSourceCurrent !== null && this._inputCurrent !== null) {
            await this._search(this._textSourceCurrent, this._inputCurrent);
            return true;
        }
        return false;
    }

    async search(textSource) {
        return await this._search(textSource, {cause: 'script'});
    }

    // Private

    async _search(textSource, input) {
        let definitions = null;
        let sentence = null;
        let type = null;
        let error = null;
        let searched = false;
        let optionsContext = null;

        try {
            if (this._textSourceCurrent !== null && this._textSourceCurrent.equals(textSource)) {
                return;
            }

            optionsContext = await this._getOptionsContext();
            searched = true;

            const result = await this._findDefinitions(textSource, optionsContext);
            if (result !== null) {
                ({definitions, sentence, type} = result);
                this._inputCurrent = input;
                this.setCurrentTextSource(textSource);
            }
        } catch (e) {
            error = e;
        }

        if (!searched) { return; }

        this.trigger('searched', {
            textScanner: this,
            type,
            definitions,
            sentence,
            input,
            textSource,
            optionsContext,
            error
        });
    }

    _onMouseOver(e) {
        if (this._ignoreElements().includes(e.target)) {
            this._scanTimerClear();
        }
    }

    _onMouseMove(e) {
        this._scanTimerClear();

        if (DocumentUtil.isMouseButtonDown(e, 'primary')) {
            return;
        }

        const modifiers = DocumentUtil.getActiveModifiers(e);
        this.trigger('activeModifiersChanged', {modifiers});

        if (!(
            this._isScanningModifierPressed(this._modifier, e) ||
            (this._useMiddleMouse && DocumentUtil.isMouseButtonDown(e, 'auxiliary'))
        )) {
            return;
        }

        this._searchAtFromMouse(e.clientX, e.clientY);
    }

    _onMouseDown(e) {
        if (this._preventNextMouseDown) {
            this._preventNextMouseDown = false;
            this._preventNextClick = true;
            e.preventDefault();
            e.stopPropagation();
            return false;
        }

        if (DocumentUtil.isMouseButtonDown(e, 'primary')) {
            this._scanTimerClear();
            this.clearSelection(false);
        }
    }

    _onMouseOut() {
        this._scanTimerClear();
    }

    _onClick(e) {
        if (this._searchOnClick) {
            this._searchAt(e.clientX, e.clientY, {cause: 'click'});
        }

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
        if (DocumentUtil.isPointInSelection(primaryTouch.clientX, primaryTouch.clientY, window.getSelection())) {
            return;
        }

        this._primaryTouchIdentifier = primaryTouch.identifier;

        this._searchAtFromTouchStart(primaryTouch.clientX, primaryTouch.clientY);
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

        this._searchAt(primaryTouch.clientX, primaryTouch.clientY, {cause: 'touchMove'});

        e.preventDefault(); // Disable scroll
    }

    async _scanTimerWait() {
        const delay = this._delay;
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
        if (this._touchInputEnabled) {
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
            [this._node, 'mouseout', this._onMouseOut.bind(this)],
            [this._node, 'click', this._onClick.bind(this)]
        ];
    }

    _getTouchEventListeners() {
        return [
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

    async _findDefinitions(textSource, optionsContext) {
        if (textSource === null) {
            return null;
        }
        if (this._searchTerms) {
            const results = await this._findTerms(textSource, optionsContext);
            if (results !== null) { return results; }
        }
        if (this._searchKanji) {
            const results = await this._findKanji(textSource, optionsContext);
            if (results !== null) { return results; }
        }
        return null;
    }

    async _findTerms(textSource, optionsContext) {
        const scanLength = this._scanLength;
        const sentenceExtent = this._sentenceExtent;
        const layoutAwareScan = this._layoutAwareScan;
        const searchText = this.getTextSourceContent(textSource, scanLength, layoutAwareScan);
        if (searchText.length === 0) { return null; }

        const {definitions, length} = await api.termsFind(searchText, {}, optionsContext);
        if (definitions.length === 0) { return null; }

        textSource.setEndOffset(length, layoutAwareScan);
        const sentence = this._documentUtil.extractSentence(textSource, sentenceExtent, layoutAwareScan);

        return {definitions, sentence, type: 'terms'};
    }

    async _findKanji(textSource, optionsContext) {
        const sentenceExtent = this._sentenceExtent;
        const layoutAwareScan = this._layoutAwareScan;
        const searchText = this.getTextSourceContent(textSource, 1, layoutAwareScan);
        if (searchText.length === 0) { return null; }

        const definitions = await api.kanjiFind(searchText, optionsContext);
        if (definitions.length === 0) { return null; }

        textSource.setEndOffset(1, layoutAwareScan);
        const sentence = this._documentUtil.extractSentence(textSource, sentenceExtent, layoutAwareScan);

        return {definitions, sentence, type: 'kanji'};
    }

    async _searchAt(x, y, input) {
        if (this._pendingLookup) { return; }

        try {
            this._pendingLookup = true;
            this._scanTimerClear();

            if (typeof this._ignorePoint === 'function' && await this._ignorePoint(x, y)) {
                return;
            }

            const textSource = this._documentUtil.getRangeFromPoint(x, y, this._deepContentScan);
            try {
                await this._search(textSource, input);
            } finally {
                if (textSource !== null) {
                    textSource.cleanup();
                }
            }
        } catch (e) {
            yomichan.logError(e);
        } finally {
            this._pendingLookup = false;
        }
    }

    async _searchAtFromMouse(x, y) {
        if (this._pendingLookup) { return; }

        if (this._modifier === 'none') {
            if (!await this._scanTimerWait()) {
                // Aborted
                return;
            }
        }

        await this._searchAt(x, y, {cause: 'mouse'});
    }

    async _searchAtFromTouchStart(x, y) {
        if (this._pendingLookup) { return; }

        const textSourceCurrentPrevious = this._textSourceCurrent !== null ? this._textSourceCurrent.clone() : null;

        await this._searchAt(x, y, {cause: 'touchStart'});

        if (
            this._textSourceCurrent !== null &&
            !this._textSourceCurrent.equals(textSourceCurrentPrevious)
        ) {
            this._preventScroll = true;
            this._preventNextContextMenu = true;
            this._preventNextMouseDown = true;
        }
    }
}
