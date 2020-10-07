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
 * DocumentUtil
 * TextScanner
 * TextSourceElement
 * api
 */

class Frontend {
    constructor({
        frameId,
        popupFactory,
        depth,
        parentPopupId,
        parentFrameId,
        useProxyPopup,
        pageType,
        allowRootFramePopupProxy
    }) {
        this._id = generateId(16);
        this._popup = null;
        this._disabledOverride = false;
        this._options = null;
        this._pageZoomFactor = 1.0;
        this._contentScale = 1.0;
        this._lastShowPromise = Promise.resolve();
        this._activeModifiers = new Set();
        this._optionsUpdatePending = false;
        this._documentUtil = new DocumentUtil();
        this._textScanner = new TextScanner({
            node: window,
            ignoreElements: this._ignoreElements.bind(this),
            ignorePoint: this._ignorePoint.bind(this),
            getOptionsContext: this._getUpToDateOptionsContext.bind(this),
            documentUtil: this._documentUtil,
            searchTerms: true,
            searchKanji: true
        });
        this._parentPopupId = parentPopupId;
        this._parentFrameId = parentFrameId;
        this._useProxyPopup = useProxyPopup;
        this._pageType = pageType;
        this._depth = depth;
        this._frameId = frameId;
        this._popupFactory = popupFactory;
        this._allowRootFramePopupProxy = allowRootFramePopupProxy;
        this._popupCache = new Map();
        this._popupEventListeners = new EventListenerCollection();
        this._updatePopupToken = null;
        this._clearSelectionTimer = null;
        this._isPointerOverPopup = false;

        this._runtimeMessageHandlers = new Map([
            ['requestFrontendReadyBroadcast', {async: false, handler: this._onMessageRequestFrontendReadyBroadcast.bind(this)}],
            ['setAllVisibleOverride',         {async: true,  handler: this._onApiSetAllVisibleOverride.bind(this)}],
            ['clearAllVisibleOverride',       {async: true,  handler: this._onApiClearAllVisibleOverride.bind(this)}]
        ]);
    }

    get canClearSelection() {
        return this._textScanner.canClearSelection;
    }

    set canClearSelection(value) {
        this._textScanner.canClearSelection = value;
    }

    get popup() {
        return this._popup;
    }

    async prepare() {
        await this.updateOptions();
        try {
            const {zoomFactor} = await api.getZoom();
            this._pageZoomFactor = zoomFactor;
        } catch (e) {
            // Ignore exceptions which may occur due to being on an unsupported page (e.g. about:blank)
        }

        this._textScanner.prepare();

        window.addEventListener('resize', this._onResize.bind(this), false);
        DocumentUtil.addFullscreenChangeEventListener(this._updatePopup.bind(this));

        const visualViewport = window.visualViewport;
        if (visualViewport !== null && typeof visualViewport === 'object') {
            visualViewport.addEventListener('scroll', this._onVisualViewportScroll.bind(this));
            visualViewport.addEventListener('resize', this._onVisualViewportResize.bind(this));
        }

        yomichan.on('optionsUpdated', this.updateOptions.bind(this));
        yomichan.on('zoomChanged', this._onZoomChanged.bind(this));
        yomichan.on('closePopups', this._onClosePopups.bind(this));
        chrome.runtime.onMessage.addListener(this._onRuntimeMessage.bind(this));

        this._textScanner.on('clearSelection', this._onClearSelection.bind(this));
        this._textScanner.on('activeModifiersChanged', this._onActiveModifiersChanged.bind(this));
        this._textScanner.on('searched', this._onSearched.bind(this));

        api.crossFrame.registerHandlers([
            ['getUrl',                  {async: false, handler: this._onApiGetUrl.bind(this)}],
            ['closePopup',              {async: false, handler: this._onApiClosePopup.bind(this)}],
            ['copySelection',           {async: false, handler: this._onApiCopySelection.bind(this)}],
            ['getPopupInfo',            {async: false, handler: this._onApiGetPopupInfo.bind(this)}],
            ['getDocumentInformation',  {async: false, handler: this._onApiGetDocumentInformation.bind(this)}]
        ]);

        this._updateContentScale();
        this._signalFrontendReady();
    }

    setDisabledOverride(disabled) {
        this._disabledOverride = disabled;
        this._updateTextScannerEnabled();
    }

    async setTextSource(textSource) {
        await this._textScanner.search(textSource);
    }

    async getOptionsContext() {
        let url = window.location.href;
        if (this._useProxyPopup) {
            try {
                url = await api.crossFrame.invoke(this._parentFrameId, 'getUrl', {});
            } catch (e) {
                // NOP
            }
        }

        const depth = this._depth;
        const modifierKeys = [...this._activeModifiers];
        return {depth, url, modifierKeys};
    }

    async updateOptions() {
        try {
            await this._updateOptionsInternal();
        } catch (e) {
            if (!yomichan.isExtensionUnloaded) {
                throw e;
            }
            this._showExtensionUnloaded(null);
        }
    }

    showContentCompleted() {
        return this._lastShowPromise;
    }

    // Message handlers

    _onMessageRequestFrontendReadyBroadcast({frameId}) {
        this._signalFrontendReady(frameId);
    }

    // API message handlers

    _onApiGetUrl() {
        return window.location.href;
    }

    _onApiClosePopup() {
        this._clearSelection(false);
    }

    _onApiCopySelection() {
        document.execCommand('copy');
    }

    _onApiGetPopupInfo() {
        return {
            popupId: (this._popup !== null ? this._popup.id : null)
        };
    }

    _onApiGetDocumentInformation() {
        return {
            title: document.title
        };
    }

    async _onApiSetAllVisibleOverride({value, priority, awaitFrame}) {
        const result = await this._popupFactory.setAllVisibleOverride(value, priority);
        if (awaitFrame) {
            await promiseAnimationFrame(100);
        }
        return result;
    }

    async _onApiClearAllVisibleOverride({token}) {
        return await this._popupFactory.clearAllVisibleOverride(token);
    }

    // Private

    _onResize() {
        this._updatePopupPosition();
    }

    _onRuntimeMessage({action, params}, sender, callback) {
        const messageHandler = this._runtimeMessageHandlers.get(action);
        if (typeof messageHandler === 'undefined') { return false; }
        return yomichan.invokeMessageHandler(messageHandler, params, callback, sender);
    }

    _onZoomChanged({newZoomFactor}) {
        this._pageZoomFactor = newZoomFactor;
        this._updateContentScale();
    }

    _onClosePopups() {
        this._clearSelection(true);
    }

    _onVisualViewportScroll() {
        this._updatePopupPosition();
    }

    _onVisualViewportResize() {
        this._updateContentScale();
    }

    _onClearSelection({passive}) {
        this._stopClearSelectionDelayed();
        if (this._popup !== null) {
            this._popup.hide(!passive);
            this._popup.clearAutoPlayTimer();
            this._isPointerOverPopup = false;
        }
        this._updatePendingOptions();
    }

    async _onActiveModifiersChanged({modifiers}) {
        if (areSetsEqual(modifiers, this._activeModifiers)) { return; }
        this._activeModifiers = modifiers;
        if (this._popup !== null && await this._popup.isVisible()) {
            this._optionsUpdatePending = true;
            return;
        }
        await this.updateOptions();
    }

    _onSearched({type, definitions, sentence, input: {cause, empty}, textSource, optionsContext, error}) {
        const scanningOptions = this._options.scanning;

        if (error !== null) {
            if (yomichan.isExtensionUnloaded) {
                if (textSource !== null && !empty) {
                    this._showExtensionUnloaded(textSource);
                }
            } else {
                yomichan.logError(error);
            }
        } if (type !== null) {
            this._stopClearSelectionDelayed();
            const focus = (cause === 'mouseMove');
            this._showContent(textSource, focus, definitions, type, sentence, optionsContext);
        } else {
            if (scanningOptions.autoHideResults) {
                this._clearSelectionDelayed(scanningOptions.hideDelay, false);
            }
        }
    }

    _onPopupFramePointerOver() {
        this._isPointerOverPopup = true;
        this._stopClearSelectionDelayed();
    }

    _onPopupFramePointerOut() {
        this._isPointerOverPopup = false;
    }

    _clearSelection(passive) {
        this._stopClearSelectionDelayed();
        this._textScanner.clearSelection(passive);
    }

    _clearSelectionDelayed(delay, restart, passive) {
        if (!this._textScanner.hasSelection()) { return; }
        if (delay > 0) {
            if (this._clearSelectionTimer !== null && !restart) { return; } // Already running
            this._stopClearSelectionDelayed();
            this._clearSelectionTimer = setTimeout(() => {
                this._clearSelectionTimer = null;
                if (this._isPointerOverPopup) { return; }
                this._clearSelection(passive);
            }, delay);
        } else {
            this._clearSelection(passive);
        }
    }

    _stopClearSelectionDelayed() {
        if (this._clearSelectionTimer !== null) {
            clearTimeout(this._clearSelectionTimer);
            this._clearSelectionTimer = null;
        }
    }

    async _updateOptionsInternal() {
        const optionsContext = await this.getOptionsContext();
        const options = await api.optionsGet(optionsContext);
        const scanningOptions = options.scanning;
        this._options = options;

        await this._updatePopup();

        const preventMiddleMouse = this._getPreventMiddleMouseValueForPageType(scanningOptions.preventMiddleMouse);
        this._textScanner.setOptions({
            inputs: scanningOptions.inputs,
            deepContentScan: scanningOptions.deepDomScan,
            selectText: scanningOptions.selectText,
            delay: scanningOptions.delay,
            touchInputEnabled: scanningOptions.touchInputEnabled,
            pointerEventsEnabled: scanningOptions.pointerEventsEnabled,
            scanLength: scanningOptions.length,
            sentenceExtent: options.anki.sentenceExt,
            layoutAwareScan: scanningOptions.layoutAwareScan,
            preventMiddleMouse
        });
        this._updateTextScannerEnabled();

        const ignoreNodes = ['.scan-disable', '.scan-disable *'];
        if (!this._options.scanning.enableOnPopupExpressions) {
            ignoreNodes.push('.source-text', '.source-text *');
        }
        this._textScanner.ignoreNodes = ignoreNodes.join(',');

        this._updateContentScale();

        await this._textScanner.searchLast();
    }

    async _updatePopup() {
        const {usePopupWindow, showIframePopupsInRootFrame} = this._options.general;
        const isIframe = !this._useProxyPopup && (window !== window.parent);

        let popupPromise;
        if (usePopupWindow) {
            popupPromise = this._popupCache.get('window');
            if (typeof popupPromise === 'undefined') {
                popupPromise = this._getPopupWindow();
                this._popupCache.set('window', popupPromise);
            }
        } else if (
            isIframe &&
            showIframePopupsInRootFrame &&
            DocumentUtil.getFullscreenElement() === null &&
            this._allowRootFramePopupProxy
        ) {
            popupPromise = this._popupCache.get('iframe');
            if (typeof popupPromise === 'undefined') {
                popupPromise = this._getIframeProxyPopup();
                this._popupCache.set('iframe', popupPromise);
            }
        } else if (this._useProxyPopup) {
            popupPromise = this._popupCache.get('proxy');
            if (typeof popupPromise === 'undefined') {
                popupPromise = this._getProxyPopup();
                this._popupCache.set('proxy', popupPromise);
            }
        } else {
            popupPromise = this._popupCache.get('default');
            if (typeof popupPromise === 'undefined') {
                popupPromise = this._getDefaultPopup();
                this._popupCache.set('default', popupPromise);
            }
        }

        // The token below is used as a unique identifier to ensure that a new _updatePopup call
        // hasn't been started during the await.
        const token = {};
        this._updatePopupToken = token;
        const popup = await popupPromise;
        const optionsContext = await this.getOptionsContext();
        if (this._updatePopupToken !== token) { return; }
        if (popup !== null) {
            await popup.setOptionsContext(optionsContext, this._id);
        }
        if (this._updatePopupToken !== token) { return; }

        if (this._pageType === 'search') {
            this.setDisabledOverride(!this._options.scanning.enableOnSearchPage);
        }

        this._clearSelection(true);
        this._popupEventListeners.removeAllEventListeners();
        this._popup = popup;
        if (popup !== null) {
            this._popupEventListeners.on(popup, 'framePointerOver', this._onPopupFramePointerOver.bind(this));
            this._popupEventListeners.on(popup, 'framePointerOut', this._onPopupFramePointerOut.bind(this));
        }
        this._isPointerOverPopup = false;
    }

    async _getDefaultPopup() {
        const isXmlDocument = (typeof XMLDocument !== 'undefined' && document instanceof XMLDocument);
        if (isXmlDocument) {
            return null;
        }

        return await this._popupFactory.getOrCreatePopup({
            frameId: this._frameId,
            ownerFrameId: this._frameId,
            depth: this._depth
        });
    }

    async _getProxyPopup() {
        return await this._popupFactory.getOrCreatePopup({
            frameId: this._parentFrameId,
            ownerFrameId: this._frameId,
            depth: this._depth,
            parentPopupId: this._parentPopupId
        });
    }

    async _getIframeProxyPopup() {
        const targetFrameId = 0; // Root frameId
        try {
            await this._waitForFrontendReady(targetFrameId);
        } catch (e) {
            // Root frame not available
            return await this._getDefaultPopup();
        }

        const {popupId} = await api.crossFrame.invoke(targetFrameId, 'getPopupInfo');
        if (popupId === null) {
            return null;
        }

        const popup = await this._popupFactory.getOrCreatePopup({
            frameId: targetFrameId,
            ownerFrameId: this._frameId,
            id: popupId
        });
        popup.on('offsetNotFound', () => {
            this._allowRootFramePopupProxy = false;
            this._updatePopup();
        });
        return popup;
    }

    async _getPopupWindow() {
        return await this._popupFactory.getOrCreatePopup({
            ownerFrameId: this._frameId,
            depth: this._depth,
            popupWindow: true
        });
    }

    _ignoreElements() {
        if (this._popup !== null) {
            const container = this._popup.container;
            if (container !== null) {
                return [container];
            }
        }
        return [];
    }

    async _ignorePoint(x, y) {
        try {
            return this._popup !== null && await this._popup.containsPoint(x, y);
        } catch (e) {
            if (!yomichan.isExtensionUnloaded) {
                throw e;
            }
            return false;
        }
    }

    async _showExtensionUnloaded(textSource) {
        if (textSource === null) {
            textSource = this._textScanner.getCurrentTextSource();
            if (textSource === null) { return; }
        }
        this._showPopupContent(textSource, await this.getOptionsContext());
    }

    _showContent(textSource, focus, definitions, type, sentence, optionsContext) {
        const {url} = optionsContext;
        const query = textSource.text();
        const details = {
            focus,
            history: false,
            params: {
                type,
                query,
                wildcards: 'off'
            },
            state: {
                focusEntry: 0,
                sentence,
                url
            },
            content: {
                definitions
            }
        };
        if (textSource instanceof TextSourceElement && textSource.fullContent !== query) {
            details.params.full = textSource.fullContent;
            details.params['full-visible'] = 'true';
        }
        this._showPopupContent(textSource, optionsContext, details);
    }

    _showPopupContent(textSource, optionsContext, details=null) {
        this._lastShowPromise = (
            this._popup !== null ?
            this._popup.showContent(
                {
                    source: this._id,
                    optionsContext,
                    elementRect: textSource.getRect(),
                    writingMode: textSource.getWritingMode()
                },
                details
            ) :
            Promise.resolve()
        );
        this._lastShowPromise.catch((error) => {
            if (yomichan.isExtensionUnloaded) { return; }
            yomichan.logError(error);
        });
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
            this._depth <= this._options.scanning.popupNestingMaxDepth &&
            !this._disabledOverride
        );
        this._textScanner.setEnabled(enabled);
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
        if (this._popup !== null) {
            this._popup.setContentScale(this._contentScale);
        }
        this._updatePopupPosition();
    }

    async _updatePopupPosition() {
        const textSource = this._textScanner.getCurrentTextSource();
        if (
            textSource !== null &&
            this._popup !== null &&
            await this._popup.isVisible()
        ) {
            this._showPopupContent(textSource, await this.getOptionsContext());
        }
    }

    _signalFrontendReady(targetFrameId=null) {
        const params = {frameId: this._frameId};
        if (targetFrameId === null) {
            api.broadcastTab('frontendReady', params);
        } else {
            api.sendMessageToFrame(targetFrameId, 'frontendReady', params);
        }
    }

    async _waitForFrontendReady(frameId) {
        const promise = yomichan.getTemporaryListenerResult(
            chrome.runtime.onMessage,
            ({action, params}, {resolve}) => {
                if (
                    action === 'frontendReady' &&
                    params.frameId === frameId
                ) {
                    resolve();
                }
            },
            10000
        );
        api.broadcastTab('requestFrontendReadyBroadcast', {frameId: this._frameId});
        await promise;
    }

    async _getUpToDateOptionsContext() {
        await this._updatePendingOptions();
        return await this.getOptionsContext();
    }

    _getPreventMiddleMouseValueForPageType(preventMiddleMouseOptions) {
        switch (this._pageType) {
            case 'web': return preventMiddleMouseOptions.onWebPages;
            case 'popup': return preventMiddleMouseOptions.onPopupPages;
            case 'search': return preventMiddleMouseOptions.onSearchPages;
            default: return false;
        }
    }
}
