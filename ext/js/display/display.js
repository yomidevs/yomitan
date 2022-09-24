/*
 * Copyright (C) 2017-2022  Yomichan Authors
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
 * DisplayContentManager
 * DisplayGenerator
 * DisplayHistory
 * DisplayNotification
 * ElementOverflowController
 * FrameEndpoint
 * Frontend
 * HotkeyHelpController
 * OptionToggleHotkeyHandler
 * PopupFactory
 * PopupMenu
 * QueryParser
 * ScrollElement
 * TextScanner
 * ThemeController
 * dynamicLoader
 */

class Display extends EventDispatcher {
    /**
     * Information about how popup content should be shown, specifically related to the inner popup content.
     * @typedef {object} ContentDetails
     * @property {boolean} focus Whether or not the frame should be `focus()`'d.
     * @property {HistoryParams} params An object containing key-value pairs representing the URL search params.
     * @property {?HistoryState} state The semi-persistent state assigned to the navigation entry.
     * @property {?HistoryContent} content The non-persistent content assigned to the navigation entry.
     * @property {'clear'|'overwrite'|'new'} historyMode How the navigation history should be modified.
     */

    /**
     * An object containing key-value pairs representing the URL search params.
     * @typedef {object} HistoryParams
     * @property {'terms'|'kanji'|'unloaded'|'clear'} [type] The type of content that is being shown.
     * @property {string} [query] The search query.
     * @property {'on'|'off'} [wildcards] Whether or not wildcards can be used for the search query.
     * @property {string} [offset] The start position of the `query` string as an index into the `full` query string.
     * @property {string} [full] The full search text. If absent, `query` is the full search text.
     * @property {'true'|'false'} [full-visible] Whether or not the full search query should be forced to be visible.
     * @property {'true'|'false'} [lookup] Whether or not the query should be looked up. If it is not looked up,
     *   the content should be provided.
     */

    /**
     * The semi-persistent state assigned to the navigation entry.
     * @typedef {object} HistoryState
     * @property {'queryParser'} [cause] What was the cause of the navigation.
     * @property {object} [sentence] The sentence context.
     * @property {string} sentence.text The full string.
     * @property {number} sentence.offset The offset from the start of `text` to the full search query.
     * @property {number} [focusEntry] The index of the dictionary entry to focus.
     * @property {number} [scrollX] The horizontal scroll position.
     * @property {number} [scrollY] The vertical scroll position.
     * @property {object} [optionsContext] The options context which should be used for lookups.
     * @property {string} [url] The originating URL of the content.
     * @property {string} [documentTitle] The originating document title of the content.
     */

    /**
     * The non-persistent content assigned to the navigation entry.
     * @typedef {object} HistoryContent
     * @property {boolean} [animate] Whether or not any CSS animations should occur.
     * @property {object[]} [dictionaryEntries] An array of dictionary entries to display as content.
     * @property {object} [contentOrigin] The identifying information for the frame the content originated from.
     * @property {number} [contentOrigin.tabId] The tab id.
     * @property {number} [contentOrigin.frameId] The frame id within the tab.
     */

    constructor(tabId, frameId, pageType, japaneseUtil, documentFocusController, hotkeyHandler) {
        super();
        this._tabId = tabId;
        this._frameId = frameId;
        this._pageType = pageType;
        this._japaneseUtil = japaneseUtil;
        this._documentFocusController = documentFocusController;
        this._hotkeyHandler = hotkeyHandler;
        this._container = document.querySelector('#dictionary-entries');
        this._dictionaryEntries = [];
        this._dictionaryEntryNodes = [];
        this._optionsContext = {depth: 0, url: window.location.href};
        this._options = null;
        this._index = 0;
        this._styleNode = null;
        this._eventListeners = new EventListenerCollection();
        this._setContentToken = null;
        this._contentManager = new DisplayContentManager(this);
        this._hotkeyHelpController = new HotkeyHelpController();
        this._displayGenerator = new DisplayGenerator({
            japaneseUtil,
            contentManager: this._contentManager,
            hotkeyHelpController: this._hotkeyHelpController
        });
        this._messageHandlers = new Map();
        this._directMessageHandlers = new Map();
        this._windowMessageHandlers = new Map();
        this._history = new DisplayHistory({clearable: true, useBrowserHistory: false});
        this._historyChangeIgnore = false;
        this._historyHasChanged = false;
        this._navigationHeader = document.querySelector('#navigation-header');
        this._contentType = 'clear';
        this._defaultTitle = document.title;
        this._titleMaxLength = 1000;
        this._query = '';
        this._fullQuery = '';
        this._queryOffset = 0;
        this._progressIndicator = document.querySelector('#progress-indicator');
        this._progressIndicatorTimer = null;
        this._progressIndicatorVisible = new DynamicProperty(false);
        this._queryParserVisible = false;
        this._queryParserVisibleOverride = null;
        this._queryParserContainer = document.querySelector('#query-parser-container');
        this._queryParser = new QueryParser({
            getSearchContext: this._getSearchContext.bind(this),
            japaneseUtil
        });
        this._contentScrollElement = document.querySelector('#content-scroll');
        this._contentScrollBodyElement = document.querySelector('#content-body');
        this._windowScroll = new ScrollElement(this._contentScrollElement);
        this._closeButton = document.querySelector('#close-button');
        this._navigationPreviousButton = document.querySelector('#navigate-previous-button');
        this._navigationNextButton = document.querySelector('#navigate-next-button');
        this._frontend = null;
        this._frontendSetupPromise = null;
        this._depth = 0;
        this._parentPopupId = null;
        this._parentFrameId = null;
        this._contentOriginTabId = tabId;
        this._contentOriginFrameId = frameId;
        this._childrenSupported = true;
        this._frameEndpoint = (pageType === 'popup' ? new FrameEndpoint() : null);
        this._browser = null;
        this._copyTextarea = null;
        this._contentTextScanner = null;
        this._tagNotification = null;
        this._footerNotificationContainer = document.querySelector('#content-footer');
        this._optionToggleHotkeyHandler = new OptionToggleHotkeyHandler(this);
        this._elementOverflowController = new ElementOverflowController();
        this._frameVisible = (pageType === 'search');
        this._menuContainer = document.querySelector('#popup-menus');
        this._onEntryClickBind = this._onEntryClick.bind(this);
        this._onKanjiLookupBind = this._onKanjiLookup.bind(this);
        this._onDebugLogClickBind = this._onDebugLogClick.bind(this);
        this._onTagClickBind = this._onTagClick.bind(this);
        this._onMenuButtonClickBind = this._onMenuButtonClick.bind(this);
        this._onMenuButtonMenuCloseBind = this._onMenuButtonMenuClose.bind(this);
        this._themeController = new ThemeController(document.documentElement);

        this._hotkeyHandler.registerActions([
            ['close',             () => { this._onHotkeyClose(); }],
            ['nextEntry',         this._onHotkeyActionMoveRelative.bind(this, 1)],
            ['previousEntry',     this._onHotkeyActionMoveRelative.bind(this, -1)],
            ['lastEntry',         () => { this._focusEntry(this._dictionaryEntries.length - 1, 0, true); }],
            ['firstEntry',        () => { this._focusEntry(0, 0, true); }],
            ['historyBackward',   () => { this._sourceTermView(); }],
            ['historyForward',    () => { this._nextTermView(); }],
            ['copyHostSelection', () => this._copyHostSelection()],
            ['nextEntryDifferentDictionary',     () => { this._focusEntryWithDifferentDictionary(1, true); }],
            ['previousEntryDifferentDictionary', () => { this._focusEntryWithDifferentDictionary(-1, true); }]
        ]);
        this.registerDirectMessageHandlers([
            ['Display.setOptionsContext', {async: true,  handler: this._onMessageSetOptionsContext.bind(this)}],
            ['Display.setContent',        {async: false, handler: this._onMessageSetContent.bind(this)}],
            ['Display.setCustomCss',      {async: false, handler: this._onMessageSetCustomCss.bind(this)}],
            ['Display.setContentScale',   {async: false, handler: this._onMessageSetContentScale.bind(this)}],
            ['Display.configure',         {async: true,  handler: this._onMessageConfigure.bind(this)}],
            ['Display.visibilityChanged', {async: false, handler: this._onMessageVisibilityChanged.bind(this)}]
        ]);
        this.registerWindowMessageHandlers([
            ['Display.extensionUnloaded', {async: false, handler: this._onMessageExtensionUnloaded.bind(this)}]
        ]);
    }

    get displayGenerator() {
        return this._displayGenerator;
    }

    get queryParserVisible() {
        return this._queryParserVisible;
    }

    set queryParserVisible(value) {
        this._queryParserVisible = value;
        this._updateQueryParser();
    }

    get japaneseUtil() {
        return this._japaneseUtil;
    }

    get depth() {
        return this._depth;
    }

    get hotkeyHandler() {
        return this._hotkeyHandler;
    }

    get dictionaryEntries() {
        return this._dictionaryEntries;
    }

    get dictionaryEntryNodes() {
        return this._dictionaryEntryNodes;
    }

    get progressIndicatorVisible() {
        return this._progressIndicatorVisible;
    }

    get parentPopupId() {
        return this._parentPopupId;
    }

    get selectedIndex() {
        return this._index;
    }

    get history() {
        return this._history;
    }

    get query() {
        return this._query;
    }

    get fullQuery() {
        return this._fullQuery;
    }

    get queryOffset() {
        return this._queryOffset;
    }

    get frameVisible() {
        return this._frameVisible;
    }

    async prepare() {
        // Theme
        this._themeController.siteTheme = 'light';
        this._themeController.prepare();

        // State setup
        const {documentElement} = document;
        const {browser} = await yomichan.api.getEnvironmentInfo();
        this._browser = browser;

        if (documentElement !== null) {
            documentElement.dataset.browser = browser;
        }

        // Prepare
        await this._hotkeyHelpController.prepare();
        await this._displayGenerator.prepare();
        this._queryParser.prepare();
        this._history.prepare();
        this._optionToggleHotkeyHandler.prepare();

        // Event setup
        this._history.on('stateChanged', this._onStateChanged.bind(this));
        this._queryParser.on('searched', this._onQueryParserSearch.bind(this));
        this._progressIndicatorVisible.on('change', this._onProgressIndicatorVisibleChanged.bind(this));
        yomichan.on('extensionUnloaded', this._onExtensionUnloaded.bind(this));
        yomichan.crossFrame.registerHandlers([
            ['popupMessage', {async: 'dynamic', handler: this._onDirectMessage.bind(this)}]
        ]);
        window.addEventListener('message', this._onWindowMessage.bind(this), false);

        if (this._pageType === 'popup' && documentElement !== null) {
            documentElement.addEventListener('mouseup', this._onDocumentElementMouseUp.bind(this), false);
            documentElement.addEventListener('click', this._onDocumentElementClick.bind(this), false);
            documentElement.addEventListener('auxclick', this._onDocumentElementClick.bind(this), false);
        }

        document.addEventListener('wheel', this._onWheel.bind(this), {passive: false});
        if (this._closeButton !== null) {
            this._closeButton.addEventListener('click', this._onCloseButtonClick.bind(this), false);
        }
        if (this._navigationPreviousButton !== null) {
            this._navigationPreviousButton.addEventListener('click', this._onSourceTermView.bind(this), false);
        }
        if (this._navigationNextButton !== null) {
            this._navigationNextButton.addEventListener('click', this._onNextTermView.bind(this), false);
        }
    }

    getContentOrigin() {
        return {
            tabId: this._contentOriginTabId,
            frameId: this._contentOriginFrameId
        };
    }

    initializeState() {
        this._onStateChanged();
        if (this._frameEndpoint !== null) {
            this._frameEndpoint.signal();
        }
    }

    setHistorySettings({clearable, useBrowserHistory}) {
        if (typeof clearable !== 'undefined') {
            this._history.clearable = clearable;
        }
        if (typeof useBrowserHistory !== 'undefined') {
            this._history.useBrowserHistory = useBrowserHistory;
        }
    }

    onError(error) {
        if (yomichan.isExtensionUnloaded) { return; }
        log.error(error);
    }

    getOptions() {
        return this._options;
    }

    getOptionsContext() {
        return this._optionsContext;
    }

    async setOptionsContext(optionsContext) {
        this._optionsContext = optionsContext;
        await this.updateOptions();
    }

    async updateOptions() {
        const options = await yomichan.api.optionsGet(this.getOptionsContext());
        const {scanning: scanningOptions, sentenceParsing: sentenceParsingOptions} = options;
        this._options = options;

        this._updateHotkeys(options);
        this._updateDocumentOptions(options);
        this._setTheme(options);
        this._hotkeyHelpController.setOptions(options);
        this._displayGenerator.updateHotkeys();
        this._hotkeyHelpController.setupNode(document.documentElement);
        this._elementOverflowController.setOptions(options);

        this._queryParser.setOptions({
            selectedParser: options.parsing.selectedParser,
            termSpacing: options.parsing.termSpacing,
            readingMode: options.parsing.readingMode,
            useInternalParser: options.parsing.enableScanningParser,
            useMecabParser: options.parsing.enableMecabParser,
            scanning: {
                inputs: scanningOptions.inputs,
                deepContentScan: scanningOptions.deepDomScan,
                normalizeCssZoom: scanningOptions.normalizeCssZoom,
                selectText: scanningOptions.selectText,
                delay: scanningOptions.delay,
                touchInputEnabled: scanningOptions.touchInputEnabled,
                pointerEventsEnabled: scanningOptions.pointerEventsEnabled,
                scanLength: scanningOptions.length,
                layoutAwareScan: scanningOptions.layoutAwareScan,
                preventMiddleMouse: scanningOptions.preventMiddleMouse.onSearchQuery,
                matchTypePrefix: false,
                sentenceParsingOptions
            }
        });

        this._updateNestedFrontend(options);
        this._updateContentTextScanner(options);

        this.trigger('optionsUpdated', {options});
    }

    /**
     * Updates the content of the display.
     * @param {ContentDetails} details Information about the content to show.
     */
    setContent(details) {
        const {focus, params, state, content} = details;
        const historyMode = this._historyHasChanged ? details.historyMode : 'clear';

        if (focus) {
            window.focus();
        }

        const urlSearchParams = new URLSearchParams();
        for (const [key, value] of Object.entries(params)) {
            urlSearchParams.append(key, value);
        }
        const url = `${location.protocol}//${location.host}${location.pathname}?${urlSearchParams.toString()}`;

        switch (historyMode) {
            case 'clear':
                this._history.clear();
                this._history.replaceState(state, content, url);
                break;
            case 'overwrite':
                this._history.replaceState(state, content, url);
                break;
            default: // 'new'
                this._updateHistoryState();
                this._history.pushState(state, content, url);
                break;
        }
    }

    setCustomCss(css) {
        if (this._styleNode === null) {
            if (css.length === 0) { return; }
            this._styleNode = document.createElement('style');
        }

        this._styleNode.textContent = css;

        const parent = document.head;
        if (this._styleNode.parentNode !== parent) {
            parent.appendChild(this._styleNode);
        }
    }

    registerDirectMessageHandlers(handlers) {
        for (const [name, handlerInfo] of handlers) {
            this._directMessageHandlers.set(name, handlerInfo);
        }
    }

    registerWindowMessageHandlers(handlers) {
        for (const [name, handlerInfo] of handlers) {
            this._windowMessageHandlers.set(name, handlerInfo);
        }
    }

    close() {
        switch (this._pageType) {
            case 'popup':
                this.invokeContentOrigin('Frontend.closePopup');
                break;
            case 'search':
                this._closeTab();
                break;
        }
    }

    blurElement(element) {
        this._documentFocusController.blurElement(element);
    }

    searchLast(updateOptionsContext) {
        const type = this._contentType;
        if (type === 'clear') { return; }
        const query = this._query;
        const hasState = this._historyHasState();
        const state = (
            hasState ?
            clone(this._history.state) :
            {
                focusEntry: 0,
                optionsContext: null,
                url: window.location.href,
                sentence: {text: query, offset: 0},
                documentTitle: document.title
            }
        );
        if (!hasState || updateOptionsContext) {
            state.optionsContext = clone(this._optionsContext);
        }
        const details = {
            focus: false,
            historyMode: 'clear',
            params: this._createSearchParams(type, query, false, this._queryOffset),
            state,
            content: {
                dictionaryEntries: null,
                contentOrigin: this.getContentOrigin()
            }
        };
        this.setContent(details);
    }

    async invokeContentOrigin(action, params={}) {
        if (this._contentOriginTabId === this._tabId && this._contentOriginFrameId === this._frameId) {
            throw new Error('Content origin is same page');
        }
        return await yomichan.crossFrame.invokeTab(this._contentOriginTabId, this._contentOriginFrameId, action, params);
    }

    async invokeParentFrame(action, params={}) {
        if (this._parentFrameId === null || this._parentFrameId === this._frameId) {
            throw new Error('Invalid parent frame');
        }
        return await yomichan.crossFrame.invoke(this._parentFrameId, action, params);
    }

    getElementDictionaryEntryIndex(element) {
        const node = element.closest('.entry');
        if (node === null) { return -1; }
        const index = parseInt(node.dataset.index, 10);
        return Number.isFinite(index) ? index : -1;
    }

    /**
     * Creates a new notification.
     * @param {boolean} scannable Whether or not the notification should permit its content to be scanned.
     * @returns {DisplayNotification} A new notification instance.
     */
    createNotification(scannable) {
        const node = this._displayGenerator.createEmptyFooterNotification();
        if (scannable) {
            node.classList.add('click-scannable');
        }
        return new DisplayNotification(this._footerNotificationContainer, node);
    }

    // Message handlers

    _onDirectMessage(data) {
        data = this._authenticateMessageData(data);
        const {action, params} = data;
        const handlerInfo = this._directMessageHandlers.get(action);
        if (typeof handlerInfo === 'undefined') {
            throw new Error(`Invalid action: ${action}`);
        }

        const {async, handler} = handlerInfo;
        const result = handler(params);
        return {async, result};
    }

    _onWindowMessage({data}) {
        try {
            data = this._authenticateMessageData(data);
        } catch (e) {
            return;
        }

        const {action, params} = data;
        const messageHandler = this._windowMessageHandlers.get(action);
        if (typeof messageHandler === 'undefined') { return; }

        const callback = () => {}; // NOP
        invokeMessageHandler(messageHandler, params, callback);
    }

    async _onMessageSetOptionsContext({optionsContext}) {
        await this.setOptionsContext(optionsContext);
        this.searchLast(true);
    }

    _onMessageSetContent({details}) {
        this.setContent(details);
    }

    _onMessageSetCustomCss({css}) {
        this.setCustomCss(css);
    }

    _onMessageSetContentScale({scale}) {
        this._setContentScale(scale);
    }

    async _onMessageConfigure({depth, parentPopupId, parentFrameId, childrenSupported, scale, optionsContext}) {
        this._depth = depth;
        this._parentPopupId = parentPopupId;
        this._parentFrameId = parentFrameId;
        this._childrenSupported = childrenSupported;
        this._setContentScale(scale);
        await this.setOptionsContext(optionsContext);
    }

    _onMessageVisibilityChanged({value}) {
        this._frameVisible = value;
        this.trigger('frameVisibilityChange', {value});
    }

    _onMessageExtensionUnloaded() {
        if (yomichan.isExtensionUnloaded) { return; }
        yomichan.triggerExtensionUnloaded();
    }

    // Private

    _authenticateMessageData(data) {
        if (this._frameEndpoint === null) {
            return data;
        }
        if (!this._frameEndpoint.authenticate(data)) {
            throw new Error('Invalid authentication');
        }
        return data.data;
    }

    async _onStateChanged() {
        if (this._historyChangeIgnore) { return; }

        const token = {}; // Unique identifier token
        this._setContentToken = token;
        try {
            // Clear
            this._closePopups();
            this._closeAllPopupMenus();
            this._eventListeners.removeAllEventListeners();
            this._contentManager.unloadAll();
            this._hideTagNotification(false);
            this._triggerContentClear();
            this._dictionaryEntries = [];
            this._dictionaryEntryNodes = [];
            this._elementOverflowController.clearElements();

            // Prepare
            const urlSearchParams = new URLSearchParams(location.search);
            let type = urlSearchParams.get('type');
            if (type === null && urlSearchParams.get('query') !== null) { type = 'terms'; }

            const fullVisible = urlSearchParams.get('full-visible');
            this._queryParserVisibleOverride = (fullVisible === null ? null : (fullVisible !== 'false'));

            this._historyHasChanged = true;
            this._contentType = type;

            // Set content
            switch (type) {
                case 'terms':
                case 'kanji':
                    await this._setContentTermsOrKanji(type, urlSearchParams, token);
                    break;
                case 'unloaded':
                    this._setContentExtensionUnloaded();
                    break;
                default:
                    this._contentType = 'clear';
                    this._clearContent();
                    break;
            }
        } catch (e) {
            this.onError(e);
        }
    }

    _onQueryParserSearch({type, dictionaryEntries, sentence, inputInfo: {eventType}, textSource, optionsContext, sentenceOffset}) {
        const query = textSource.text();
        const historyState = this._history.state;
        const historyMode = (
            eventType === 'click' ||
            !isObject(historyState) ||
            historyState.cause !== 'queryParser'
        ) ? 'new' : 'overwrite';
        const details = {
            focus: false,
            historyMode,
            params: this._createSearchParams(type, query, false, sentenceOffset),
            state: {
                sentence,
                optionsContext,
                cause: 'queryParser'
            },
            content: {
                dictionaryEntries,
                contentOrigin: this.getContentOrigin()
            }
        };
        this.setContent(details);
    }

    _onExtensionUnloaded() {
        const type = 'unloaded';
        if (this._contentType === type) { return; }
        const details = {
            focus: false,
            historyMode: 'clear',
            params: {type},
            state: {},
            content: {
                contentOrigin: {
                    tabId: this._tabId,
                    frameId: this._frameId
                }
            }
        };
        this.setContent(details);
    }

    _onCloseButtonClick(e) {
        e.preventDefault();
        this.close();
    }

    _onSourceTermView(e) {
        e.preventDefault();
        this._sourceTermView();
    }

    _onNextTermView(e) {
        e.preventDefault();
        this._nextTermView();
    }

    _onProgressIndicatorVisibleChanged({value}) {
        if (this._progressIndicatorTimer !== null) {
            clearTimeout(this._progressIndicatorTimer);
            this._progressIndicatorTimer = null;
        }

        if (value) {
            this._progressIndicator.hidden = false;
            getComputedStyle(this._progressIndicator).getPropertyValue('display'); // Force update of CSS display property, allowing animation
            this._progressIndicator.dataset.active = 'true';
        } else {
            this._progressIndicator.dataset.active = 'false';
            this._progressIndicatorTimer = setTimeout(() => {
                this._progressIndicator.hidden = true;
                this._progressIndicatorTimer = null;
            }, 250);
        }
    }

    async _onKanjiLookup(e) {
        try {
            e.preventDefault();
            if (!this._historyHasState()) { return; }

            let {state: {sentence, url, documentTitle}} = this._history;
            if (typeof url !== 'string') { url = window.location.href; }
            if (typeof documentTitle !== 'string') { documentTitle = document.title; }
            const optionsContext = this.getOptionsContext();
            const query = e.currentTarget.textContent;
            const dictionaryEntries = await yomichan.api.kanjiFind(query, optionsContext);
            const details = {
                focus: false,
                historyMode: 'new',
                params: this._createSearchParams('kanji', query, false, null),
                state: {
                    focusEntry: 0,
                    optionsContext,
                    url,
                    sentence,
                    documentTitle
                },
                content: {
                    dictionaryEntries,
                    contentOrigin: this.getContentOrigin()
                }
            };
            this.setContent(details);
        } catch (error) {
            this.onError(error);
        }
    }

    _onWheel(e) {
        if (e.altKey) {
            if (e.deltaY !== 0) {
                this._focusEntry(this._index + (e.deltaY > 0 ? 1 : -1), 0, true);
                e.preventDefault();
            }
        } else if (e.shiftKey) {
            this._onHistoryWheel(e);
        }
    }

    _onHistoryWheel(e) {
        if (e.altKey) { return; }
        const delta = -e.deltaX || e.deltaY;
        if (delta > 0) {
            this._sourceTermView();
            e.preventDefault();
            e.stopPropagation();
        } else if (delta < 0) {
            this._nextTermView();
            e.preventDefault();
            e.stopPropagation();
        }
    }

    _onDebugLogClick(e) {
        const link = e.currentTarget;
        const index = this.getElementDictionaryEntryIndex(link);
        this._logDictionaryEntryData(index);
    }

    _onDocumentElementMouseUp(e) {
        switch (e.button) {
            case 3: // Back
                if (this._history.hasPrevious()) {
                    e.preventDefault();
                }
                break;
            case 4: // Forward
                if (this._history.hasNext()) {
                    e.preventDefault();
                }
                break;
        }
    }

    _onDocumentElementClick(e) {
        switch (e.button) {
            case 3: // Back
                if (this._history.hasPrevious()) {
                    e.preventDefault();
                    this._history.back();
                }
                break;
            case 4: // Forward
                if (this._history.hasNext()) {
                    e.preventDefault();
                    this._history.forward();
                }
                break;
        }
    }

    _onEntryClick(e) {
        if (e.button !== 0) { return; }
        const node = e.currentTarget;
        const index = parseInt(node.dataset.index, 10);
        if (!Number.isFinite(index)) { return; }
        this._entrySetCurrent(index);
    }

    _onTagClick(e) {
        this._showTagNotification(e.currentTarget);
    }

    _onMenuButtonClick(e) {
        const node = e.currentTarget;

        const menuContainerNode = this._displayGenerator.instantiateTemplate('dictionary-entry-popup-menu');
        const menuBodyNode = menuContainerNode.querySelector('.popup-menu-body');

        const addItem = (menuAction, label) => {
            const item = this._displayGenerator.instantiateTemplate('dictionary-entry-popup-menu-item');
            item.querySelector('.popup-menu-item-label').textContent = label;
            item.dataset.menuAction = menuAction;
            menuBodyNode.appendChild(item);
        };

        addItem('log-debug-info', 'Log debug info');

        this._menuContainer.appendChild(menuContainerNode);
        const popupMenu = new PopupMenu(node, menuContainerNode);
        popupMenu.prepare();
    }

    _onMenuButtonMenuClose(e) {
        const {currentTarget: node, detail: {action}} = e;
        switch (action) {
            case 'log-debug-info':
                this._logDictionaryEntryData(this.getElementDictionaryEntryIndex(node));
                break;
        }
    }

    _showTagNotification(tagNode) {
        tagNode = tagNode.parentNode;
        if (tagNode === null) { return; }

        if (this._tagNotification === null) {
            this._tagNotification = this.createNotification(true);
        }

        const index = this.getElementDictionaryEntryIndex(tagNode);
        const dictionaryEntry = (index >= 0 && index < this._dictionaryEntries.length ? this._dictionaryEntries[index] : null);

        const content = this._displayGenerator.createTagFooterNotificationDetails(tagNode, dictionaryEntry);
        this._tagNotification.setContent(content);
        this._tagNotification.open();
    }

    _hideTagNotification(animate) {
        if (this._tagNotification === null) { return; }
        this._tagNotification.close(animate);
    }

    _updateDocumentOptions(options) {
        const data = document.documentElement.dataset;
        data.ankiEnabled = `${options.anki.enable}`;
        data.resultOutputMode = `${options.general.resultOutputMode}`;
        data.glossaryLayoutMode = `${options.general.glossaryLayoutMode}`;
        data.compactTags = `${options.general.compactTags}`;
        data.frequencyDisplayMode = `${options.general.frequencyDisplayMode}`;
        data.termDisplayMode = `${options.general.termDisplayMode}`;
        data.enableSearchTags = `${options.scanning.enableSearchTags}`;
        data.showPronunciationText = `${options.general.showPitchAccentDownstepNotation}`;
        data.showPronunciationDownstepPosition = `${options.general.showPitchAccentPositionNotation}`;
        data.showPronunciationGraph = `${options.general.showPitchAccentGraph}`;
        data.debug = `${options.general.debugInfo}`;
        data.popupDisplayMode = `${options.general.popupDisplayMode}`;
        data.popupCurrentIndicatorMode = `${options.general.popupCurrentIndicatorMode}`;
        data.popupActionBarVisibility = `${options.general.popupActionBarVisibility}`;
        data.popupActionBarLocation = `${options.general.popupActionBarLocation}`;
    }

    _setTheme(options) {
        const {general} = options;
        const {popupTheme} = general;
        this._themeController.theme = popupTheme;
        this._themeController.outerTheme = general.popupOuterTheme;
        this._themeController.updateTheme();
        this.setCustomCss(general.customPopupCss);
    }

    async _findDictionaryEntries(isKanji, source, wildcardsEnabled, optionsContext) {
        if (isKanji) {
            const dictionaryEntries = await yomichan.api.kanjiFind(source, optionsContext);
            return dictionaryEntries;
        } else {
            const findDetails = {};
            if (wildcardsEnabled) {
                const match = /^([*\uff0a]*)([\w\W]*?)([*\uff0a]*)$/.exec(source);
                if (match !== null) {
                    if (match[1]) {
                        findDetails.matchType = 'suffix';
                        findDetails.deinflect = false;
                    } else if (match[3]) {
                        findDetails.matchType = 'prefix';
                        findDetails.deinflect = false;
                    }
                    source = match[2];
                }
            }

            const {dictionaryEntries} = await yomichan.api.termsFind(source, findDetails, optionsContext);
            return dictionaryEntries;
        }
    }

    async _setContentTermsOrKanji(type, urlSearchParams, token) {
        const lookup = (urlSearchParams.get('lookup') !== 'false');
        const wildcardsEnabled = (urlSearchParams.get('wildcards') !== 'off');

        // Set query
        let query = urlSearchParams.get('query');
        if (query === null) { query = ''; }
        let queryFull = urlSearchParams.get('full');
        queryFull = (queryFull !== null ? queryFull : query);
        let queryOffset = urlSearchParams.get('offset');
        if (queryOffset !== null) {
            queryOffset = Number.parseInt(queryOffset, 10);
            queryOffset = Number.isFinite(queryOffset) ? Math.max(0, Math.min(queryFull.length - query.length, queryOffset)) : null;
        }
        this._setQuery(query, queryFull, queryOffset);

        let {state, content} = this._history;
        let changeHistory = false;
        if (!isObject(content)) {
            content = {};
            changeHistory = true;
        }
        if (!isObject(state)) {
            state = {};
            changeHistory = true;
        }

        let {focusEntry, scrollX, scrollY, optionsContext} = state;
        if (typeof focusEntry !== 'number') { focusEntry = 0; }
        if (!(typeof optionsContext === 'object' && optionsContext !== null)) {
            optionsContext = this.getOptionsContext();
            state.optionsContext = optionsContext;
            changeHistory = true;
        }

        let {dictionaryEntries} = content;
        if (!Array.isArray(dictionaryEntries)) {
            dictionaryEntries = lookup && query.length > 0 ? await this._findDictionaryEntries(type === 'kanji', query, wildcardsEnabled, optionsContext) : [];
            if (this._setContentToken !== token) { return; }
            content.dictionaryEntries = dictionaryEntries;
            changeHistory = true;
        }

        let contentOriginValid = false;
        const {contentOrigin} = content;
        if (typeof contentOrigin === 'object' && contentOrigin !== null) {
            const {tabId, frameId} = contentOrigin;
            if (typeof tabId === 'number' && typeof frameId === 'number') {
                this._contentOriginTabId = tabId;
                this._contentOriginFrameId = frameId;
                contentOriginValid = true;
            }
        }
        if (!contentOriginValid) {
            content.contentOrigin = this.getContentOrigin();
            changeHistory = true;
        }

        await this._setOptionsContextIfDifferent(optionsContext);
        if (this._setContentToken !== token) { return; }

        if (this._options === null) {
            await this.updateOptions();
            if (this._setContentToken !== token) { return; }
        }

        if (changeHistory) {
            this._replaceHistoryStateNoNavigate(state, content);
        }

        this._dictionaryEntries = dictionaryEntries;

        this._updateNavigationAuto();
        this._setNoContentVisible(dictionaryEntries.length === 0 && lookup);

        const container = this._container;
        container.textContent = '';

        this._triggerContentUpdateStart();

        for (let i = 0, ii = dictionaryEntries.length; i < ii; ++i) {
            if (i > 0) {
                await promiseTimeout(1);
                if (this._setContentToken !== token) { return; }
            }

            const dictionaryEntry = dictionaryEntries[i];
            const entry = (
                dictionaryEntry.type === 'term' ?
                this._displayGenerator.createTermEntry(dictionaryEntry) :
                this._displayGenerator.createKanjiEntry(dictionaryEntry)
            );
            entry.dataset.index = `${i}`;
            this._dictionaryEntryNodes.push(entry);
            this._addEntryEventListeners(entry);
            this._triggerContentUpdateEntry(dictionaryEntry, entry, i);
            container.appendChild(entry);
            if (focusEntry === i) {
                this._focusEntry(i, 0, false);
            }

            this._elementOverflowController.addElements(entry);
        }

        if (typeof scrollX === 'number' || typeof scrollY === 'number') {
            let {x, y} = this._windowScroll;
            if (typeof scrollX === 'number') { x = scrollX; }
            if (typeof scrollY === 'number') { y = scrollY; }
            this._windowScroll.stop();
            this._windowScroll.to(x, y);
        }

        this._triggerContentUpdateComplete();
    }

    _setContentExtensionUnloaded() {
        const errorExtensionUnloaded = document.querySelector('#error-extension-unloaded');

        if (this._container !== null) {
            this._container.hidden = true;
        }

        if (errorExtensionUnloaded !== null) {
            errorExtensionUnloaded.hidden = false;
        }

        this._updateNavigation(false, false);
        this._setNoContentVisible(false);
        this._setQuery('', '', 0);

        this._triggerContentUpdateStart();
        this._triggerContentUpdateComplete();
    }

    _clearContent() {
        this._container.textContent = '';
        this._updateNavigationAuto();
        this._setQuery('', '', 0);

        this._triggerContentUpdateStart();
        this._triggerContentUpdateComplete();
    }

    _setNoContentVisible(visible) {
        const noResults = document.querySelector('#no-results');

        if (noResults !== null) {
            noResults.hidden = !visible;
        }
    }

    _setQuery(query, fullQuery, queryOffset) {
        this._query = query;
        this._fullQuery = fullQuery;
        this._queryOffset = queryOffset;
        this._updateQueryParser();
        this._setTitleText(query);
    }

    _updateQueryParser() {
        const text = this._fullQuery;
        const visible = this._isQueryParserVisible();
        this._queryParserContainer.hidden = !visible || text.length === 0;
        if (visible && this._queryParser.text !== text) {
            this._setQueryParserText(text);
        }
    }

    async _setQueryParserText(text) {
        const overrideToken = this._progressIndicatorVisible.setOverride(true);
        try {
            await this._queryParser.setText(text);
        } finally {
            this._progressIndicatorVisible.clearOverride(overrideToken);
        }
    }

    _setTitleText(text) {
        let title = this._defaultTitle;
        if (text.length > 0) {
            // Chrome limits title to 1024 characters
            const ellipsis = '...';
            const separator = ' - ';
            const maxLength = this._titleMaxLength - title.length - separator.length;
            if (text.length > maxLength) {
                text = `${text.substring(0, Math.max(0, maxLength - ellipsis.length))}${ellipsis}`;
            }

            title = `${text}${separator}${title}`;
        }
        document.title = title;
    }

    _updateNavigationAuto() {
        this._updateNavigation(this._history.hasPrevious(), this._history.hasNext());
    }

    _updateNavigation(previous, next) {
        const {documentElement} = document;
        if (documentElement !== null) {
            documentElement.dataset.hasNavigationPrevious = `${previous}`;
            documentElement.dataset.hasNavigationNext = `${next}`;
        }
        if (this._navigationPreviousButton !== null) {
            this._navigationPreviousButton.disabled = !previous;
        }
        if (this._navigationNextButton !== null) {
            this._navigationNextButton.disabled = !next;
        }
    }

    _entrySetCurrent(index) {
        const entryPre = this._getEntry(this._index);
        if (entryPre !== null) {
            entryPre.classList.remove('entry-current');
        }

        const entry = this._getEntry(index);
        if (entry !== null) {
            entry.classList.add('entry-current');
        }

        this._index = index;
    }

    _focusEntry(index, definitionIndex, smooth) {
        index = Math.max(Math.min(index, this._dictionaryEntries.length - 1), 0);

        this._entrySetCurrent(index);

        let node = (index >= 0 && index < this._dictionaryEntryNodes.length ? this._dictionaryEntryNodes[index] : null);
        if (definitionIndex > 0) {
            const definitionNodes = this._getDictionaryEntryDefinitionNodes(index);
            if (definitionIndex < definitionNodes.length) {
                node = definitionNodes[definitionIndex];
            }
        }
        let target = (index === 0 && definitionIndex <= 0) || node === null ? 0 : this._getElementTop(node);

        if (this._navigationHeader !== null) {
            target -= this._navigationHeader.getBoundingClientRect().height;
        }

        this._windowScroll.stop();
        if (smooth) {
            this._windowScroll.animate(this._windowScroll.x, target, 200);
        } else {
            this._windowScroll.toY(target);
        }
    }

    _focusEntryWithDifferentDictionary(offset, smooth) {
        const sign = Math.sign(offset);
        if (sign === 0) { return false; }

        let index = this._index;
        const count = Math.min(this._dictionaryEntries.length, this._dictionaryEntryNodes.length);
        if (index < 0 || index >= count) { return false; }

        const dictionaryEntry = this._dictionaryEntries[index];
        const visibleDefinitionIndex = this._getDictionaryEntryVisibleDefinitionIndex(index, sign);
        if (visibleDefinitionIndex === null) { return false; }

        const {dictionary} = dictionaryEntry.definitions[visibleDefinitionIndex];
        let focusDefinitionIndex = null;
        for (let i = index; i >= 0 && i < count; i += sign) {
            const {definitions} = this._dictionaryEntries[i];
            const jj = definitions.length;
            let j = (i === index ? visibleDefinitionIndex + sign : (sign > 0 ? 0 : jj - 1));
            for (; j >= 0 && j < jj; j += sign) {
                if (definitions[j].dictionary !== dictionary) {
                    focusDefinitionIndex = j;
                    index = i;
                    i = -2; // Terminate outer loop
                    break;
                }
            }
        }

        if (focusDefinitionIndex === null) { return false; }

        this._focusEntry(index, focusDefinitionIndex, smooth);
        return true;
    }

    _getDictionaryEntryVisibleDefinitionIndex(index, sign) {
        const {top: scrollTop, bottom: scrollBottom} = this._windowScroll.getRect();

        const {definitions} = this._dictionaryEntries[index];
        const nodes = this._getDictionaryEntryDefinitionNodes(index);
        const definitionCount = Math.min(definitions.length, nodes.length);
        if (definitionCount <= 0) { return null; }

        let visibleIndex = null;
        let visibleCoverage = 0;
        for (let i = (sign > 0 ? 0 : definitionCount - 1); i >= 0 && i < definitionCount; i += sign) {
            const {top, bottom} = nodes[i].getBoundingClientRect();
            if (bottom <= scrollTop || top >= scrollBottom) { continue; }
            const top2 = Math.max(scrollTop, Math.min(scrollBottom, top));
            const bottom2 = Math.max(scrollTop, Math.min(scrollBottom, bottom));
            const coverage = (bottom2 - top2) / (bottom - top);
            if (coverage >= visibleCoverage) {
                visibleCoverage = coverage;
                visibleIndex = i;
            }
        }

        return visibleIndex !== null ? visibleIndex : (sign > 0 ? definitionCount - 1 : 0);
    }

    _getDictionaryEntryDefinitionNodes(index) {
        return this._dictionaryEntryNodes[index].querySelectorAll('.definition-item');
    }

    _sourceTermView() {
        this._relativeTermView(false);
    }

    _nextTermView() {
        this._relativeTermView(true);
    }

    _relativeTermView(next) {
        if (next) {
            return this._history.hasNext() && this._history.forward();
        } else {
            return this._history.hasPrevious() && this._history.back();
        }
    }

    _getEntry(index) {
        const entries = this._dictionaryEntryNodes;
        return index >= 0 && index < entries.length ? entries[index] : null;
    }

    _getElementTop(element) {
        const elementRect = element.getBoundingClientRect();
        const documentRect = this._contentScrollBodyElement.getBoundingClientRect();
        return elementRect.top - documentRect.top;
    }

    _historyHasState() {
        return isObject(this._history.state);
    }

    _updateHistoryState() {
        const {state, content} = this._history;
        if (!isObject(state)) { return; }

        state.focusEntry = this._index;
        state.scrollX = this._windowScroll.x;
        state.scrollY = this._windowScroll.y;
        this._replaceHistoryStateNoNavigate(state, content);
    }

    _replaceHistoryStateNoNavigate(state, content) {
        const historyChangeIgnorePre = this._historyChangeIgnore;
        try {
            this._historyChangeIgnore = true;
            this._history.replaceState(state, content);
        } finally {
            this._historyChangeIgnore = historyChangeIgnorePre;
        }
    }

    _createSearchParams(type, query, wildcards, sentenceOffset) {
        const params = {};
        const fullQuery = this._fullQuery;
        const includeFull = (query.length < fullQuery.length);
        if (includeFull) {
            params.full = fullQuery;
        }
        params.query = query;
        if (includeFull && sentenceOffset !== null) {
            params.offset = `${sentenceOffset}`;
        }
        if (typeof type === 'string') {
            params.type = type;
        }
        if (!wildcards) {
            params.wildcards = 'off';
        }
        if (this._queryParserVisibleOverride !== null) {
            params['full-visible'] = `${this._queryParserVisibleOverride}`;
        }
        return params;
    }

    _isQueryParserVisible() {
        return (
            this._queryParserVisibleOverride !== null ?
            this._queryParserVisibleOverride :
            this._queryParserVisible
        );
    }

    _closePopups() {
        yomichan.trigger('closePopups');
    }

    async _setOptionsContextIfDifferent(optionsContext) {
        if (deepEqual(this._optionsContext, optionsContext)) { return; }
        await this.setOptionsContext(optionsContext);
    }

    _setContentScale(scale) {
        const body = document.body;
        if (body === null) { return; }
        body.style.fontSize = `${scale}em`;
    }

    async _updateNestedFrontend(options) {
        const isSearchPage = (this._pageType === 'search');
        const isEnabled = (
            this._childrenSupported &&
            typeof this._tabId === 'number' &&
            (
                (isSearchPage) ?
                (options.scanning.enableOnSearchPage) :
                (this._depth < options.scanning.popupNestingMaxDepth)
            )
        );

        if (this._frontend === null) {
            if (!isEnabled) { return; }

            try {
                if (this._frontendSetupPromise === null) {
                    this._frontendSetupPromise = this._setupNestedFrontend();
                }
                await this._frontendSetupPromise;
            } catch (e) {
                log.error(e);
                return;
            } finally {
                this._frontendSetupPromise = null;
            }
        }

        this._frontend.setDisabledOverride(!isEnabled);
    }

    async _setupNestedFrontend() {
        const setupNestedPopupsOptions = {
            useProxyPopup: this._parentFrameId !== null,
            parentPopupId: this._parentPopupId,
            parentFrameId: this._parentFrameId
        };

        await dynamicLoader.loadScripts([
            '/js/language/text-scanner.js',
            '/js/comm/frame-client.js',
            '/js/app/popup.js',
            '/js/app/popup-proxy.js',
            '/js/app/popup-window.js',
            '/js/app/popup-factory.js',
            '/js/comm/frame-ancestry-handler.js',
            '/js/comm/frame-offset-forwarder.js',
            '/js/app/frontend.js'
        ]);

        const popupFactory = new PopupFactory(this._frameId);
        popupFactory.prepare();

        Object.assign(setupNestedPopupsOptions, {
            depth: this._depth + 1,
            tabId: this._tabId,
            frameId: this._frameId,
            popupFactory,
            pageType: this._pageType,
            allowRootFramePopupProxy: true,
            childrenSupported: this._childrenSupported,
            hotkeyHandler: this._hotkeyHandler
        });

        const frontend = new Frontend(setupNestedPopupsOptions);
        this._frontend = frontend;
        await frontend.prepare();
    }

    _copyHostSelection() {
        if (this._contentOriginFrameId === null || window.getSelection().toString()) { return false; }
        this._copyHostSelectionSafe();
        return true;
    }

    async _copyHostSelectionSafe() {
        try {
            await this._copyHostSelectionInner();
        } catch (e) {
            // NOP
        }
    }

    async _copyHostSelectionInner() {
        switch (this._browser) {
            case 'firefox':
            case 'firefox-mobile':
                {
                    let text;
                    try {
                        text = await this.invokeContentOrigin('Frontend.getSelectionText');
                    } catch (e) {
                        break;
                    }
                    this._copyText(text);
                }
                break;
            default:
                await this.invokeContentOrigin('Frontend.copySelection');
                break;
        }
    }

    _copyText(text) {
        const parent = document.body;
        if (parent === null) { return; }

        let textarea = this._copyTextarea;
        if (textarea === null) {
            textarea = document.createElement('textarea');
            this._copyTextarea = textarea;
        }

        textarea.value = text;
        parent.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        parent.removeChild(textarea);
    }

    _addEntryEventListeners(entry) {
        const eventListeners = this._eventListeners;
        eventListeners.addEventListener(entry, 'click', this._onEntryClickBind);
        for (const node of entry.querySelectorAll('.headword-kanji-link')) {
            eventListeners.addEventListener(node, 'click', this._onKanjiLookupBind);
        }
        for (const node of entry.querySelectorAll('.tag-label')) {
            eventListeners.addEventListener(node, 'click', this._onTagClickBind);
        }
        for (const node of entry.querySelectorAll('.action-button[data-action=menu]')) {
            eventListeners.addEventListener(node, 'click', this._onMenuButtonClickBind);
            eventListeners.addEventListener(node, 'menuClose', this._onMenuButtonMenuCloseBind);
        }
    }

    _updateContentTextScanner(options) {
        if (!options.scanning.enablePopupSearch) {
            if (this._contentTextScanner !== null) {
                this._contentTextScanner.setEnabled(false);
                this._contentTextScanner.clearSelection();
            }
            return;
        }

        if (this._contentTextScanner === null) {
            this._contentTextScanner = new TextScanner({
                node: window,
                getSearchContext: this._getSearchContext.bind(this),
                searchTerms: true,
                searchKanji: false,
                searchOnClick: true,
                searchOnClickOnly: true
            });
            this._contentTextScanner.includeSelector = '.click-scannable,.click-scannable *';
            this._contentTextScanner.excludeSelector = '.scan-disable,.scan-disable *';
            this._contentTextScanner.prepare();
            this._contentTextScanner.on('clear', this._onContentTextScannerClear.bind(this));
            this._contentTextScanner.on('searched', this._onContentTextScannerSearched.bind(this));
        }

        const {scanning: scanningOptions, sentenceParsing: sentenceParsingOptions} = options;
        this._contentTextScanner.setOptions({
            inputs: [{
                include: 'mouse0',
                exclude: '',
                types: {mouse: true, pen: false, touch: false},
                options: {
                    searchTerms: true,
                    searchKanji: true,
                    scanOnTouchMove: false,
                    scanOnTouchPress: false,
                    scanOnTouchRelease: false,
                    scanOnPenMove: false,
                    scanOnPenHover: false,
                    scanOnPenReleaseHover: false,
                    scanOnPenPress: false,
                    scanOnPenRelease: false,
                    preventTouchScrolling: false,
                    preventPenScrolling: false
                }
            }],
            deepContentScan: scanningOptions.deepDomScan,
            normalizeCssZoom: scanningOptions.normalizeCssZoom,
            selectText: false,
            delay: scanningOptions.delay,
            touchInputEnabled: false,
            pointerEventsEnabled: false,
            scanLength: scanningOptions.length,
            layoutAwareScan: scanningOptions.layoutAwareScan,
            preventMiddleMouse: false,
            sentenceParsingOptions
        });

        this._contentTextScanner.setEnabled(true);
    }

    _onContentTextScannerClear() {
        this._contentTextScanner.clearSelection();
    }

    _onContentTextScannerSearched({type, dictionaryEntries, sentence, textSource, optionsContext, error}) {
        if (error !== null && !yomichan.isExtensionUnloaded) {
            log.error(error);
        }

        if (type === null) { return; }

        const query = textSource.text();
        const url = window.location.href;
        const documentTitle = document.title;
        const details = {
            focus: false,
            historyMode: 'new',
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
                contentOrigin: this.getContentOrigin()
            }
        };
        this._contentTextScanner.clearSelection();
        this.setContent(details);
    }

    _getSearchContext() {
        return {optionsContext: this.getOptionsContext()};
    }

    _updateHotkeys(options) {
        this._hotkeyHandler.setHotkeys(this._pageType, options.inputs.hotkeys);
    }

    async _closeTab() {
        const tab = await new Promise((resolve, reject) => {
            chrome.tabs.getCurrent((result) => {
                const e = chrome.runtime.lastError;
                if (e) {
                    reject(new Error(e.message));
                } else {
                    resolve(result);
                }
            });
        });
        const tabId = tab.id;
        await new Promise((resolve, reject) => {
            chrome.tabs.remove(tabId, () => {
                const e = chrome.runtime.lastError;
                if (e) {
                    reject(new Error(e.message));
                } else {
                    resolve();
                }
            });
        });
    }

    _onHotkeyClose() {
        if (this._closeSinglePopupMenu()) { return; }
        this.close();
    }

    _onHotkeyActionMoveRelative(sign, argument) {
        let count = Number.parseInt(argument, 10);
        if (!Number.isFinite(count)) { count = 1; }
        count = Math.max(0, Math.floor(count));
        this._focusEntry(this._index + count * sign, 0, true);
    }

    _closeAllPopupMenus() {
        for (const popupMenu of PopupMenu.openMenus) {
            popupMenu.close();
        }
    }

    _closeSinglePopupMenu() {
        for (const popupMenu of PopupMenu.openMenus) {
            popupMenu.close();
            return true;
        }
        return false;
    }

    async _logDictionaryEntryData(index) {
        if (index < 0 || index >= this._dictionaryEntries.length) { return; }
        const dictionaryEntry = this._dictionaryEntries[index];
        const result = {dictionaryEntry};

        const promises = [];
        this.trigger('logDictionaryEntryData', {dictionaryEntry, promises});
        if (promises.length > 0) {
            for (const result2 of await Promise.all(promises)) {
                Object.assign(result, result2);
            }
        }

        console.log(result);
    }

    _triggerContentClear() {
        this.trigger('contentClear', {});
    }

    _triggerContentUpdateStart() {
        this.trigger('contentUpdateStart', {type: this._contentType, query: this._query});
    }

    _triggerContentUpdateEntry(dictionaryEntry, element, index) {
        this.trigger('contentUpdateEntry', {dictionaryEntry, element, index});
    }

    _triggerContentUpdateComplete() {
        this.trigger('contentUpdateComplete', {type: this._contentType});
    }
}
