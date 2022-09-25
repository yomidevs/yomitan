/*
 * Copyright (C) 2016-2022  Yomichan Authors
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
 * GoogleDocsUtil
 * TextScanner
 * TextSourceRange
 */

/**
 * This is the main class responsible for scanning and handling webpage content.
 */
class Frontend {
    /**
     * Creates a new instance.
     * @param {object} details Details about how to set up the instance.
     * @param {string} details.pageType The type of page, one of 'web', 'popup', or 'search'.
     * @param {PopupFactory} details.popupFactory A PopupFactory instance to use for generating popups.
     * @param {number} details.depth The nesting depth value of the popup.
     * @param {number} details.tabId The tab ID of the host tab.
     * @param {number} details.frameId The frame ID of the host frame.
     * @param {?string} details.parentPopupId The popup ID of the parent popup if one exists, otherwise null.
     * @param {?number} details.parentFrameId The frame ID of the parent popup if one exists, otherwise null.
     * @param {boolean} details.useProxyPopup Whether or not proxy popups should be used.
     * @param {boolean} details.canUseWindowPopup Whether or not window popups can be used.
     * @param {boolean} details.allowRootFramePopupProxy Whether or not popups can be hosted in the root frame.
     * @param {boolean} details.childrenSupported Whether popups can create child popups or not.
     * @param {HotkeyHandler} details.hotkeyHandler A HotkeyHandler instance.
     */
    constructor({
        pageType,
        popupFactory,
        depth,
        tabId,
        frameId,
        parentPopupId,
        parentFrameId,
        useProxyPopup,
        canUseWindowPopup=true,
        allowRootFramePopupProxy,
        childrenSupported=true,
        hotkeyHandler
    }) {
        this._pageType = pageType;
        this._popupFactory = popupFactory;
        this._depth = depth;
        this._tabId = tabId;
        this._frameId = frameId;
        this._parentPopupId = parentPopupId;
        this._parentFrameId = parentFrameId;
        this._useProxyPopup = useProxyPopup;
        this._canUseWindowPopup = canUseWindowPopup;
        this._allowRootFramePopupProxy = allowRootFramePopupProxy;
        this._childrenSupported = childrenSupported;
        this._hotkeyHandler = hotkeyHandler;
        this._popup = null;
        this._disabledOverride = false;
        this._options = null;
        this._pageZoomFactor = 1.0;
        this._contentScale = 1.0;
        this._lastShowPromise = Promise.resolve();
        this._textScanner = new TextScanner({
            node: window,
            ignoreElements: this._ignoreElements.bind(this),
            ignorePoint: this._ignorePoint.bind(this),
            getSearchContext: this._getSearchContext.bind(this),
            searchTerms: true,
            searchKanji: true
        });
        this._textScannerHasBeenEnabled = false;
        this._popupCache = new Map();
        this._popupEventListeners = new EventListenerCollection();
        this._updatePopupToken = null;
        this._clearSelectionTimer = null;
        this._isPointerOverPopup = false;
        this._optionsContextOverride = null;

        this._runtimeMessageHandlers = new Map([
            ['Frontend.requestReadyBroadcast',   {async: false, handler: this._onMessageRequestFrontendReadyBroadcast.bind(this)}],
            ['Frontend.setAllVisibleOverride',   {async: true,  handler: this._onApiSetAllVisibleOverride.bind(this)}],
            ['Frontend.clearAllVisibleOverride', {async: true,  handler: this._onApiClearAllVisibleOverride.bind(this)}]
        ]);

        this._hotkeyHandler.registerActions([
            ['scanSelectedText', this._onActionScanSelectedText.bind(this)],
            ['scanTextAtCaret',  this._onActionScanTextAtCaret.bind(this)]
        ]);
    }

    /**
     * Get whether or not the text selection can be cleared.
     * @type {boolean}
     */
    get canClearSelection() {
        return this._textScanner.canClearSelection;
    }

    /**
     * Set whether or not the text selection can be cleared.
     * @param {boolean} value The new value to assign.
     */
    set canClearSelection(value) {
        this._textScanner.canClearSelection = value;
    }

    /**
     * Gets the popup instance.
     * @type {Popup}
     */
    get popup() {
        return this._popup;
    }

    /**
     * Prepares the instance for use.
     */
    async prepare() {
        await this.updateOptions();
        try {
            const {zoomFactor} = await yomichan.api.getZoom();
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

        this._textScanner.on('clear', this._onTextScannerClear.bind(this));
        this._textScanner.on('searched', this._onSearched.bind(this));

        yomichan.crossFrame.registerHandlers([
            ['Frontend.closePopup',       {async: false, handler: this._onApiClosePopup.bind(this)}],
            ['Frontend.copySelection',    {async: false, handler: this._onApiCopySelection.bind(this)}],
            ['Frontend.getSelectionText', {async: false, handler: this._onApiGetSelectionText.bind(this)}],
            ['Frontend.getPopupInfo',     {async: false, handler: this._onApiGetPopupInfo.bind(this)}],
            ['Frontend.getPageInfo',      {async: false, handler: this._onApiGetPageInfo.bind(this)}]
        ]);

        this._prepareSiteSpecific();
        this._updateContentScale();
        this._signalFrontendReady();
    }

    /**
     * Set whether or not the instance is disabled.
     * @param {boolean} disabled Whether or not the instance is disabled.
     */
    setDisabledOverride(disabled) {
        this._disabledOverride = disabled;
        this._updateTextScannerEnabled();
    }

    /**
     * Set or clear an override options context object.
     * @param {?object} optionsContext An options context object to use as the override, or `null` to clear the override.
     */
    setOptionsContextOverride(optionsContext) {
        this._optionsContextOverride = optionsContext;
    }

    /**
     * Performs a new search on a specific source.
     * @param {TextSourceRange|TextSourceElement} textSource The text source to search.
     */
    async setTextSource(textSource) {
        this._textScanner.setCurrentTextSource(null);
        await this._textScanner.search(textSource);
    }

    /**
     * Updates the internal options representation.
     */
    async updateOptions() {
        try {
            await this._updateOptionsInternal();
        } catch (e) {
            if (!yomichan.isExtensionUnloaded) {
                throw e;
            }
        }
    }

    /**
     * Waits for the previous `showContent` call to be completed.
     * @returns {Promise} A promise which is resolved when the previous `showContent` call has completed.
     */
    showContentCompleted() {
        return this._lastShowPromise;
    }

    // Message handlers

    _onMessageRequestFrontendReadyBroadcast({frameId}) {
        this._signalFrontendReady(frameId);
    }

    // Action handlers

    _onActionScanSelectedText() {
        this._scanSelectedText(false);
    }

    _onActionScanTextAtCaret() {
        this._scanSelectedText(true);
    }

    // API message handlers

    _onApiGetUrl() {
        return window.location.href;
    }

    _onApiClosePopup() {
        this._clearSelection(false);
    }

    _onApiCopySelection() {
        // This will not work on Firefox if a popup has focus, which is usually the case when this function is called.
        document.execCommand('copy');
    }

    _onApiGetSelectionText() {
        return document.getSelection().toString();
    }

    _onApiGetPopupInfo() {
        return {
            popupId: (this._popup !== null ? this._popup.id : null)
        };
    }

    _onApiGetPageInfo() {
        return {
            url: window.location.href,
            documentTitle: document.title
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
        return invokeMessageHandler(messageHandler, params, callback, sender);
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

    _onTextScannerClear() {
        this._clearSelection(false);
    }

    _onSearched({type, dictionaryEntries, sentence, inputInfo: {eventType, passive, detail}, textSource, optionsContext, detail: {documentTitle}, error}) {
        const scanningOptions = this._options.scanning;

        if (error !== null) {
            if (yomichan.isExtensionUnloaded) {
                if (textSource !== null && !passive) {
                    this._showExtensionUnloaded(textSource);
                }
            } else {
                log.error(error);
            }
        } if (type !== null) {
            this._stopClearSelectionDelayed();
            let focus = (eventType === 'mouseMove');
            if (isObject(detail)) {
                const focus2 = detail.focus;
                if (typeof focus2 === 'boolean') { focus = focus2; }
            }
            this._showContent(textSource, focus, dictionaryEntries, type, sentence, documentTitle, optionsContext);
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
        const scanningOptions = this._options.scanning;
        if (scanningOptions.hidePopupOnCursorExit) {
            this._clearSelectionDelayed(scanningOptions.hidePopupOnCursorExitDelay, false);
        }
    }

    _clearSelection(passive) {
        this._stopClearSelectionDelayed();
        if (this._popup !== null) {
            this._popup.clearAutoPlayTimer();
            this._popup.hide(!passive);
            this._isPointerOverPopup = false;
        }
        this._textScanner.clearSelection();
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
        const optionsContext = await this._getOptionsContext();
        const options = await yomichan.api.optionsGet(optionsContext);
        const {scanning: scanningOptions, sentenceParsing: sentenceParsingOptions} = options;
        this._options = options;

        this._hotkeyHandler.setHotkeys('web', options.inputs.hotkeys);

        await this._updatePopup();

        const preventMiddleMouse = this._getPreventMiddleMouseValueForPageType(scanningOptions.preventMiddleMouse);
        this._textScanner.setOptions({
            inputs: scanningOptions.inputs,
            deepContentScan: scanningOptions.deepDomScan,
            normalizeCssZoom: scanningOptions.normalizeCssZoom,
            selectText: scanningOptions.selectText,
            delay: scanningOptions.delay,
            touchInputEnabled: scanningOptions.touchInputEnabled,
            pointerEventsEnabled: scanningOptions.pointerEventsEnabled,
            scanLength: scanningOptions.length,
            layoutAwareScan: scanningOptions.layoutAwareScan,
            matchTypePrefix: scanningOptions.matchTypePrefix,
            preventMiddleMouse,
            sentenceParsingOptions
        });
        this._updateTextScannerEnabled();

        if (this._pageType !== 'web') {
            const excludeSelectors = ['.scan-disable', '.scan-disable *'];
            if (!scanningOptions.enableOnPopupExpressions) {
                excludeSelectors.push('.source-text', '.source-text *');
            }
            this._textScanner.excludeSelector = excludeSelectors.join(',');
        }

        this._updateContentScale();

        await this._textScanner.searchLast();
    }

    async _updatePopup() {
        const {usePopupWindow, showIframePopupsInRootFrame} = this._options.general;
        const isIframe = !this._useProxyPopup && (window !== window.parent);

        const currentPopup = this._popup;

        let popupPromise;
        if (usePopupWindow && this._canUseWindowPopup) {
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
        const optionsContext = await this._getOptionsContext();
        if (this._updatePopupToken !== token) { return; }
        if (popup !== null) {
            await popup.setOptionsContext(optionsContext);
        }
        if (this._updatePopupToken !== token) { return; }

        if (popup !== currentPopup) {
            this._clearSelection(true);
        }

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
            depth: this._depth,
            childrenSupported: this._childrenSupported
        });
    }

    async _getProxyPopup() {
        return await this._popupFactory.getOrCreatePopup({
            frameId: this._parentFrameId,
            depth: this._depth,
            parentPopupId: this._parentPopupId,
            childrenSupported: this._childrenSupported
        });
    }

    async _getIframeProxyPopup() {
        const targetFrameId = 0; // Root frameId
        try {
            await this._waitForFrontendReady(targetFrameId, 10000);
        } catch (e) {
            // Root frame not available
            return await this._getDefaultPopup();
        }

        const {popupId} = await yomichan.crossFrame.invoke(targetFrameId, 'Frontend.getPopupInfo');
        if (popupId === null) {
            return null;
        }

        const popup = await this._popupFactory.getOrCreatePopup({
            frameId: targetFrameId,
            id: popupId,
            childrenSupported: this._childrenSupported
        });
        popup.on('offsetNotFound', () => {
            this._allowRootFramePopupProxy = false;
            this._updatePopup();
        });
        return popup;
    }

    async _getPopupWindow() {
        return await this._popupFactory.getOrCreatePopup({
            depth: this._depth,
            popupWindow: true,
            childrenSupported: this._childrenSupported
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

    _showExtensionUnloaded(textSource) {
        if (textSource === null) {
            textSource = this._textScanner.getCurrentTextSource();
            if (textSource === null) { return; }
        }
        this._showPopupContent(textSource, null, null);
    }

    _showContent(textSource, focus, dictionaryEntries, type, sentence, documentTitle, optionsContext) {
        const query = textSource.text();
        const {url} = optionsContext;
        const details = {
            focus,
            historyMode: 'clear',
            params: {
                type,
                query,
                wildcards: 'off'
            },
            state: {
                focusEntry: 0,
                optionsContext,
                url,
                sentence,
                documentTitle
            },
            content: {
                dictionaryEntries,
                contentOrigin: {
                    tabId: this._tabId,
                    frameId: this._frameId
                }
            }
        };
        if (textSource.type === 'element' && textSource.fullContent !== query) {
            details.params.full = textSource.fullContent;
            details.params['full-visible'] = 'true';
        }
        this._showPopupContent(textSource, optionsContext, details);
    }

    _showPopupContent(textSource, optionsContext, details) {
        const sourceRects = [];
        for (const {left, top, right, bottom} of textSource.getRects()) {
            sourceRects.push({left, top, right, bottom});
        }
        this._lastShowPromise = (
            this._popup !== null ?
            this._popup.showContent(
                {
                    optionsContext,
                    sourceRects,
                    writingMode: textSource.getWritingMode()
                },
                details
            ) :
            Promise.resolve()
        );
        this._lastShowPromise.catch((error) => {
            if (yomichan.isExtensionUnloaded) { return; }
            log.error(error);
        });
        return this._lastShowPromise;
    }

    _updateTextScannerEnabled() {
        const enabled = (this._options !== null && this._options.general.enable && !this._disabledOverride);
        if (enabled === this._textScanner.isEnabled()) { return; }
        this._textScanner.setEnabled(enabled);
        if (this._textScannerHasBeenEnabled) {
            this._clearSelection(true);
        }
        if (enabled) {
            this._textScannerHasBeenEnabled = true;
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
            this._showPopupContent(textSource, null, null);
        }
    }

    _signalFrontendReady(targetFrameId=null) {
        const params = {frameId: this._frameId};
        if (targetFrameId === null) {
            yomichan.api.broadcastTab('frontendReady', params);
        } else {
            yomichan.api.sendMessageToFrame(targetFrameId, 'frontendReady', params);
        }
    }

    async _waitForFrontendReady(frameId, timeout) {
        return new Promise((resolve, reject) => {
            let timeoutId = null;

            const cleanup = () => {
                if (timeoutId !== null) {
                    clearTimeout(timeoutId);
                    timeoutId = null;
                }
                chrome.runtime.onMessage.removeListener(onMessage);
            };
            const onMessage = (message, sender, sendResponse) => {
                try {
                    const {action, params} = message;
                    if (action === 'frontendReady' && params.frameId === frameId) {
                        cleanup();
                        resolve();
                        sendResponse();
                    }
                } catch (e) {
                    // NOP
                }
            };

            if (timeout !== null) {
                timeoutId = setTimeout(() => {
                    timeoutId = null;
                    cleanup();
                    reject(new Error(`Wait for frontend ready timed out after ${timeout}ms`));
                }, timeout);
            }

            chrome.runtime.onMessage.addListener(onMessage);
            yomichan.api.broadcastTab('Frontend.requestReadyBroadcast', {frameId: this._frameId});
        });
    }

    _getPreventMiddleMouseValueForPageType(preventMiddleMouseOptions) {
        switch (this._pageType) {
            case 'web': return preventMiddleMouseOptions.onWebPages;
            case 'popup': return preventMiddleMouseOptions.onPopupPages;
            case 'search': return preventMiddleMouseOptions.onSearchPages;
            default: return false;
        }
    }

    async _getOptionsContext() {
        let optionsContext = this._optionsContextOverride;
        if (optionsContext === null) {
            optionsContext = (await this._getSearchContext()).optionsContext;
        }
        return optionsContext;
    }

    async _getSearchContext() {
        let url = window.location.href;
        let documentTitle = document.title;
        if (this._useProxyPopup) {
            try {
                ({url, documentTitle} = await yomichan.crossFrame.invoke(this._parentFrameId, 'Frontend.getPageInfo', {}));
            } catch (e) {
                // NOP
            }
        }

        let optionsContext = this._optionsContextOverride;
        if (optionsContext === null) {
            optionsContext = {depth: this._depth, url};
        }

        return {
            optionsContext,
            detail: {documentTitle}
        };
    }

    async _scanSelectedText(allowEmptyRange) {
        const range = this._getFirstSelectionRange(allowEmptyRange);
        if (range === null) { return false; }
        const source = TextSourceRange.create(range);
        await this._textScanner.search(source, {focus: true, restoreSelection: true});
        return true;
    }

    _getFirstSelectionRange(allowEmptyRange) {
        const selection = window.getSelection();
        for (let i = 0, ii = selection.rangeCount; i < ii; ++i) {
            const range = selection.getRangeAt(i);
            if (range.toString().length > 0 || allowEmptyRange) {
                return range;
            }
        }
        return null;
    }

    _prepareSiteSpecific() {
        switch (location.hostname.toLowerCase()) {
            case 'docs.google.com':
                this._prepareGoogleDocs();
                break;
        }
    }

    async _prepareGoogleDocs() {
        if (typeof GoogleDocsUtil !== 'undefined') { return; }
        await yomichan.api.loadExtensionScripts([
            '/js/accessibility/google-docs-util.js'
        ]);
        if (typeof GoogleDocsUtil === 'undefined') { return; }
        DocumentUtil.registerGetRangeFromPointHandler(GoogleDocsUtil.getRangeFromPoint.bind(GoogleDocsUtil));
    }
}
