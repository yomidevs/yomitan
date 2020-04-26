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

class Frontend extends TextScanner {
    constructor(popup, getUrl=null) {
        super(
            window,
            () => this.popup.isProxy() ? [] : [this.popup.getContainer()],
            [(x, y) => this.popup.containsPoint(x, y)]
        );

        this._id = yomichan.generateId(16);

        this.popup = popup;

        this._getUrl = getUrl;

        this._disabledOverride = false;

        this.options = null;

        this._pageZoomFactor = 1.0;
        this._contentScale = 1.0;
        this._orphaned = false;
        this._lastShowPromise = Promise.resolve();

        this._windowMessageHandlers = new Map([
            ['popupClose', () => this.onSearchClear(true)],
            ['selectionCopy', () => document.execCommand('copy')]
        ]);

        this._runtimeMessageHandlers = new Map([
            ['popupSetVisibleOverride', ({visible}) => { this.popup.setVisibleOverride(visible); }],
            ['rootPopupRequestInformationBroadcast', () => { this._broadcastRootPopupInformation(); }],
            ['requestDocumentInformationBroadcast', ({uniqueId}) => { this._broadcastDocumentInformation(uniqueId); }]
        ]);
    }

    async prepare() {
        try {
            await this.updateOptions();
            const {zoomFactor} = await apiGetZoom();
            this._pageZoomFactor = zoomFactor;

            window.addEventListener('resize', this.onResize.bind(this), false);

            const visualViewport = window.visualViewport;
            if (visualViewport !== null && typeof visualViewport === 'object') {
                window.visualViewport.addEventListener('scroll', this.onVisualViewportScroll.bind(this));
                window.visualViewport.addEventListener('resize', this.onVisualViewportResize.bind(this));
            }

            yomichan.on('orphaned', this.onOrphaned.bind(this));
            yomichan.on('optionsUpdated', this.updateOptions.bind(this));
            yomichan.on('zoomChanged', this.onZoomChanged.bind(this));
            chrome.runtime.onMessage.addListener(this.onRuntimeMessage.bind(this));

            this._updateContentScale();
            this._broadcastRootPopupInformation();
        } catch (e) {
            this.onError(e);
        }
    }

    onResize() {
        this._updatePopupPosition();
    }

    onWindowMessage(e) {
        const action = e.data;
        const handler = this._windowMessageHandlers.get(action);
        if (typeof handler !== 'function') { return false; }

        handler();
    }

    onRuntimeMessage({action, params}, sender, callback) {
        const {targetPopupId} = params || {};
        if (typeof targetPopupId !== 'undefined' && targetPopupId !== this.popup.id) { return; }

        const handler = this._runtimeMessageHandlers.get(action);
        if (typeof handler !== 'function') { return false; }

        const result = handler(params, sender);
        callback(result);
        return false;
    }

    onOrphaned() {
        this._orphaned = true;
    }

    onZoomChanged({newZoomFactor}) {
        this._pageZoomFactor = newZoomFactor;
        this._updateContentScale();
    }

    onVisualViewportScroll() {
        this._updatePopupPosition();
    }

    onVisualViewportResize() {
        this._updateContentScale();
    }

    getMouseEventListeners() {
        return [
            ...super.getMouseEventListeners(),
            [window, 'message', this.onWindowMessage.bind(this)]
        ];
    }

    setDisabledOverride(disabled) {
        this._disabledOverride = disabled;
        this.setEnabled(this.options.general.enable, this._canEnable());
    }

    async setPopup(popup) {
        this.onSearchClear(false);
        this.popup = popup;
        await popup.setOptionsContext(await this.getOptionsContext(), this._id);
    }

    async updateOptions() {
        const optionsContext = await this.getOptionsContext();
        this.options = await apiOptionsGet(optionsContext);
        this.setOptions(this.options, this._canEnable());

        const ignoreNodes = ['.scan-disable', '.scan-disable *'];
        if (!this.options.scanning.enableOnPopupExpressions) {
            ignoreNodes.push('.source-text', '.source-text *');
        }
        this.ignoreNodes = ignoreNodes.join(',');

        await this.popup.setOptionsContext(optionsContext, this._id);

        this._updateContentScale();

        if (this.textSourceCurrent !== null && this.causeCurrent !== null) {
            await this.onSearchSource(this.textSourceCurrent, this.causeCurrent);
        }
    }

    async onSearchSource(textSource, cause) {
        let results = null;

        try {
            if (textSource !== null) {
                const optionsContext = await this.getOptionsContext();
                results = (
                    await this.findTerms(textSource, optionsContext) ||
                    await this.findKanji(textSource, optionsContext)
                );
                if (results !== null) {
                    const focus = (cause === 'mouse');
                    this.showContent(textSource, focus, results.definitions, results.type, optionsContext);
                }
            }
        } catch (e) {
            if (this._orphaned) {
                if (textSource !== null && this.options.scanning.modifier !== 'none') {
                    this._showPopupContent(textSource, await this.getOptionsContext(), 'orphaned');
                }
            } else {
                this.onError(e);
            }
        } finally {
            if (results === null && this.options.scanning.autoHideResults) {
                this.onSearchClear(true);
            }
        }

        return results;
    }

    showContent(textSource, focus, definitions, type, optionsContext) {
        const {url} = optionsContext;
        const sentence = docSentenceExtract(textSource, this.options.anki.sentenceExt);
        this._showPopupContent(
            textSource,
            optionsContext,
            type,
            {definitions, context: {sentence, url, focus, disableHistory: true}}
        );
    }

    showContentCompleted() {
        return this._lastShowPromise;
    }

    async findTerms(textSource, optionsContext) {
        this.setTextSourceScanLength(textSource, this.options.scanning.length);

        const searchText = textSource.text();
        if (searchText.length === 0) { return null; }

        const {definitions, length} = await apiTermsFind(searchText, {}, optionsContext);
        if (definitions.length === 0) { return null; }

        textSource.setEndOffset(length);

        return {definitions, type: 'terms'};
    }

    async findKanji(textSource, optionsContext) {
        this.setTextSourceScanLength(textSource, 1);

        const searchText = textSource.text();
        if (searchText.length === 0) { return null; }

        const definitions = await apiKanjiFind(searchText, optionsContext);
        if (definitions.length === 0) { return null; }

        return {definitions, type: 'kanji'};
    }

    onSearchClear(changeFocus) {
        this.popup.hide(changeFocus);
        this.popup.clearAutoPlayTimer();
        super.onSearchClear(changeFocus);
    }

    async getOptionsContext() {
        const url = this._getUrl !== null ? await this._getUrl() : window.location.href;
        const depth = this.popup.depth;
        return {depth, url};
    }

    _showPopupContent(textSource, optionsContext, type=null, details=null) {
        const context = {optionsContext, source: this._id};
        this._lastShowPromise = this.popup.showContent(
            textSource.getRect(),
            textSource.getWritingMode(),
            type,
            details,
            context
        );
        return this._lastShowPromise;
    }

    _updateContentScale() {
        const {popupScalingFactor, popupScaleRelativeToPageZoom, popupScaleRelativeToVisualViewport} = this.options.general;
        let contentScale = popupScalingFactor;
        if (popupScaleRelativeToPageZoom) {
            contentScale /= this._pageZoomFactor;
        }
        if (popupScaleRelativeToVisualViewport) {
            contentScale /= Frontend._getVisualViewportScale();
        }
        if (contentScale === this._contentScale) { return; }

        this._contentScale = contentScale;
        this.popup.setContentScale(this._contentScale);
        this._updatePopupPosition();
    }

    _broadcastRootPopupInformation() {
        if (!this.popup.isProxy() && this.popup.depth === 0 && this.popup.frameId === 0) {
            apiBroadcastTab('rootPopupInformation', {popupId: this.popup.id, frameId: this.popup.frameId});
        }
    }

    _broadcastDocumentInformation(uniqueId) {
        apiBroadcastTab('documentInformationBroadcast', {
            uniqueId,
            frameId: this.popup.frameId,
            title: document.title
        });
    }

    _canEnable() {
        return this.popup.depth <= this.options.scanning.popupNestingMaxDepth && !this._disabledOverride;
    }

    async _updatePopupPosition() {
        const textSource = this.getCurrentTextSource();
        if (textSource !== null && await this.popup.isVisible()) {
            this._showPopupContent(textSource, await this.getOptionsContext());
        }
    }

    static _getVisualViewportScale() {
        const visualViewport = window.visualViewport;
        return visualViewport !== null && typeof visualViewport === 'object' ? visualViewport.scale : 1.0;
    }
}
