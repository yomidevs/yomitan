/*
 * Copyright (C) 2016-2020  Yomichan Authors
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
 * TextScanner
 * apiBroadcastTab
 * apiGetZoom
 * apiKanjiFind
 * apiOptionsGet
 * apiTermsFind
 * docSentenceExtract
 */

class Frontend {
    constructor(popup, getUrl=null) {
        this._id = yomichan.generateId(16);
        this._popup = popup;
        this._getUrl = getUrl;
        this._disabledOverride = false;
        this._options = null;
        this._pageZoomFactor = 1.0;
        this._contentScale = 1.0;
        this._orphaned = false;
        this._lastShowPromise = Promise.resolve();
        this._enabledEventListeners = new EventListenerCollection();
        this._activeModifiers = new Set();
        this._optionsUpdatePending = false;
        this._textScanner = new TextScanner({
            node: window,
            ignoreElements: () => this._popup.isProxy() ? [] : [this._popup.getFrame()],
            ignorePoint: (x, y) => this._popup.containsPoint(x, y),
            search: this._search.bind(this)
        });

        this._windowMessageHandlers = new Map([
            ['popupClose', this._onMessagePopupClose.bind(this)],
            ['selectionCopy', this._onMessageSelectionCopy.bind()]
        ]);

        this._runtimeMessageHandlers = new Map([
            ['popupSetVisibleOverride', this._onMessagePopupSetVisibleOverride.bind(this)],
            ['rootPopupRequestInformationBroadcast', this._onMessageRootPopupRequestInformationBroadcast.bind(this)],
            ['requestDocumentInformationBroadcast', this._onMessageRequestDocumentInformationBroadcast.bind(this)]
        ]);
    }

    get canClearSelection() {
        return this._textScanner.canClearSelection;
    }

    set canClearSelection(value) {
        this._textScanner.canClearSelection = value;
    }

    async prepare() {
        try {
            await this.updateOptions();
            const {zoomFactor} = await apiGetZoom();
            this._pageZoomFactor = zoomFactor;

            window.addEventListener('resize', this._onResize.bind(this), false);

            const visualViewport = window.visualViewport;
            if (visualViewport !== null && typeof visualViewport === 'object') {
                window.visualViewport.addEventListener('scroll', this._onVisualViewportScroll.bind(this));
                window.visualViewport.addEventListener('resize', this._onVisualViewportResize.bind(this));
            }

            yomichan.on('orphaned', this._onOrphaned.bind(this));
            yomichan.on('optionsUpdated', this.updateOptions.bind(this));
            yomichan.on('zoomChanged', this._onZoomChanged.bind(this));
            chrome.runtime.onMessage.addListener(this._onRuntimeMessage.bind(this));

            this._textScanner.on('clearSelection', this._onClearSelection.bind(this));
            this._textScanner.on('activeModifiersChanged', this._onActiveModifiersChanged.bind(this));

            this._updateContentScale();
            this._broadcastRootPopupInformation();
        } catch (e) {
            yomichan.logError(e);
        }
    }

    async setPopup(popup) {
        this._textScanner.clearSelection(true);
        this._popup = popup;
        await popup.setOptionsContext(await this.getOptionsContext(), this._id);
    }

    setDisabledOverride(disabled) {
        this._disabledOverride = disabled;
        this._updateTextScannerEnabled();
    }

    async setTextSource(textSource) {
        await this._search(textSource, 'script');
        this._textScanner.setCurrentTextSource(textSource);
    }

    async getOptionsContext() {
        const url = this._getUrl !== null ? await this._getUrl() : window.location.href;
        const depth = this._popup.depth;
        const modifierKeys = [...this._activeModifiers];
        return {depth, url, modifierKeys};
    }

    async updateOptions() {
        const optionsContext = await this.getOptionsContext();
        this._options = await apiOptionsGet(optionsContext);
        this._textScanner.setOptions(this._options);
        this._updateTextScannerEnabled();

        const ignoreNodes = ['.scan-disable', '.scan-disable *'];
        if (!this._options.scanning.enableOnPopupExpressions) {
            ignoreNodes.push('.source-text', '.source-text *');
        }
        this._textScanner.ignoreNodes = ignoreNodes.join(',');

        await this._popup.setOptionsContext(optionsContext, this._id);

        this._updateContentScale();

        const textSourceCurrent = this._textScanner.getCurrentTextSource();
        const causeCurrent = this._textScanner.causeCurrent;
        if (textSourceCurrent !== null && causeCurrent !== null) {
            await this._search(textSourceCurrent, causeCurrent);
        }
    }

    showContentCompleted() {
        return this._lastShowPromise;
    }

    // Message handlers

    _onMessagePopupClose() {
        this._textScanner.clearSelection(false);
    }

    _onMessageSelectionCopy() {
        document.execCommand('copy');
    }

    _onMessagePopupSetVisibleOverride({visible}) {
        this._popup.setVisibleOverride(visible);
    }

    _onMessageRootPopupRequestInformationBroadcast() {
        this._broadcastRootPopupInformation();
    }

    _onMessageRequestDocumentInformationBroadcast({uniqueId}) {
        this._broadcastDocumentInformation(uniqueId);
    }

    // Private

    _onResize() {
        this._updatePopupPosition();
    }

    _onWindowMessage(e) {
        const action = e.data;
        const handler = this._windowMessageHandlers.get(action);
        if (typeof handler !== 'function') { return false; }

        handler();
    }

    _onRuntimeMessage({action, params}, sender, callback) {
        const handler = this._runtimeMessageHandlers.get(action);
        if (typeof handler !== 'function') { return false; }

        const result = handler(params, sender);
        callback(result);
        return false;
    }

    _onOrphaned() {
        this._orphaned = true;
    }

    _onZoomChanged({newZoomFactor}) {
        this._pageZoomFactor = newZoomFactor;
        this._updateContentScale();
    }

    _onVisualViewportScroll() {
        this._updatePopupPosition();
    }

    _onVisualViewportResize() {
        this._updateContentScale();
    }

    _onClearSelection({passive}) {
        this._popup.hide(!passive);
        this._popup.clearAutoPlayTimer();
        this._updatePendingOptions();
    }

    async _onActiveModifiersChanged({modifiers}) {
        if (areSetsEqual(modifiers, this._activeModifiers)) { return; }
        this._activeModifiers = modifiers;
        if (await this._popup.isVisible()) {
            this._optionsUpdatePending = true;
            return;
        }
        await this.updateOptions();
    }

    async _search(textSource, cause) {
        await this._updatePendingOptions();

        let results = null;

        try {
            if (textSource !== null) {
                const optionsContext = await this.getOptionsContext();
                results = (
                    await this._findTerms(textSource, optionsContext) ||
                    await this._findKanji(textSource, optionsContext)
                );
                if (results !== null) {
                    const focus = (cause === 'mouse');
                    this._showContent(textSource, focus, results.definitions, results.type, optionsContext);
                }
            }
        } catch (e) {
            if (this._orphaned) {
                if (textSource !== null && this._options.scanning.modifier !== 'none') {
                    this._showPopupContent(textSource, await this.getOptionsContext(), 'orphaned');
                }
            } else {
                yomichan.logError(e);
            }
        } finally {
            if (results === null && this._options.scanning.autoHideResults) {
                this._textScanner.clearSelection(false);
            }
        }

        return results;
    }

    async _findTerms(textSource, optionsContext) {
        const searchText = this._textScanner.getTextSourceContent(textSource, this._options.scanning.length);
        if (searchText.length === 0) { return null; }

        const {definitions, length} = await apiTermsFind(searchText, {}, optionsContext);
        if (definitions.length === 0) { return null; }

        textSource.setEndOffset(length);

        return {definitions, type: 'terms'};
    }

    async _findKanji(textSource, optionsContext) {
        const searchText = this._textScanner.getTextSourceContent(textSource, 1);
        if (searchText.length === 0) { return null; }

        const definitions = await apiKanjiFind(searchText, optionsContext);
        if (definitions.length === 0) { return null; }

        textSource.setEndOffset(1);

        return {definitions, type: 'kanji'};
    }

    _showContent(textSource, focus, definitions, type, optionsContext) {
        const {url} = optionsContext;
        const sentence = docSentenceExtract(textSource, this._options.anki.sentenceExt);
        this._showPopupContent(
            textSource,
            optionsContext,
            type,
            {definitions, context: {sentence, url, focus, disableHistory: true}}
        );
    }

    _showPopupContent(textSource, optionsContext, type=null, details=null) {
        const context = {optionsContext, source: this._id};
        this._lastShowPromise = this._popup.showContent(
            textSource.getRect(),
            textSource.getWritingMode(),
            type,
            details,
            context
        );
        return this._lastShowPromise;
    }

    async _updatePendingOptions() {
        if (this._optionsUpdatePending) {
            this._optionsUpdatePending = false;
            await this.updateOptions();
        }
    }

    _updateTextScannerEnabled() {
        const enabled = (
            this._options.general.enable &&
            this._popup.depth <= this._options.scanning.popupNestingMaxDepth &&
            !this._disabledOverride
        );
        this._enabledEventListeners.removeAllEventListeners();
        this._textScanner.setEnabled(enabled);
        if (enabled) {
            this._enabledEventListeners.addEventListener(window, 'message', this._onWindowMessage.bind(this));
        }
    }

    _updateContentScale() {
        const {popupScalingFactor, popupScaleRelativeToPageZoom, popupScaleRelativeToVisualViewport} = this._options.general;
        let contentScale = popupScalingFactor;
        if (popupScaleRelativeToPageZoom) {
            contentScale /= this._pageZoomFactor;
        }
        if (popupScaleRelativeToVisualViewport) {
            const visualViewport = window.visualViewport;
            const visualViewportScale = (visualViewport !== null && typeof visualViewport === 'object' ? visualViewport.scale : 1.0);
            contentScale /= visualViewportScale;
        }
        if (contentScale === this._contentScale) { return; }

        this._contentScale = contentScale;
        this._popup.setContentScale(this._contentScale);
        this._updatePopupPosition();
    }

    async _updatePopupPosition() {
        const textSource = this._textScanner.getCurrentTextSource();
        if (textSource !== null && await this._popup.isVisible()) {
            this._showPopupContent(textSource, await this.getOptionsContext());
        }
    }

    _broadcastRootPopupInformation() {
        if (!this._popup.isProxy() && this._popup.depth === 0 && this._popup.frameId === 0) {
            apiBroadcastTab('rootPopupInformation', {popupId: this._popup.id, frameId: this._popup.frameId});
        }
    }

    _broadcastDocumentInformation(uniqueId) {
        apiBroadcastTab('documentInformationBroadcast', {
            uniqueId,
            frameId: this._popup.frameId,
            title: document.title
        });
    }
}
