/*
 * Copyright (C) 2017-2021  Yomichan Authors
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
 * DisplayAnki
 * DisplayAudio
 * DisplayGenerator
 * DisplayHistory
 * DisplayNotification
 * DocumentUtil
 * ElementOverflowController
 * FrameEndpoint
 * Frontend
 * HotkeyHelpController
 * MediaLoader
 * OptionToggleHotkeyHandler
 * PopupFactory
 * PopupMenu
 * QueryParser
 * ScrollElement
 * TextScanner
 * dynamicLoader
 */

class Display extends EventDispatcher {
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
        this._mediaLoader = new MediaLoader();
        this._hotkeyHelpController = new HotkeyHelpController();
        this._displayGenerator = new DisplayGenerator({
            japaneseUtil,
            mediaLoader: this._mediaLoader,
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
        this._rawQuery = '';
        this._fullQuery = '';
        this._documentUtil = new DocumentUtil();
        this._progressIndicator = document.querySelector('#progress-indicator');
        this._progressIndicatorTimer = null;
        this._progressIndicatorVisible = new DynamicProperty(false);
        this._queryParserVisible = false;
        this._queryParserVisibleOverride = null;
        this._queryParserContainer = document.querySelector('#query-parser-container');
        this._queryParser = new QueryParser({
            getSearchContext: this._getSearchContext.bind(this),
            documentUtil: this._documentUtil
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
        this._displayAudio = new DisplayAudio(this);
        this._queryPostProcessor = null;
        this._optionToggleHotkeyHandler = new OptionToggleHotkeyHandler(this);
        this._elementOverflowController = new ElementOverflowController();
        this._displayAnki = new DisplayAnki(this);

        this._hotkeyHandler.registerActions([
            ['close',             () => { this._onHotkeyClose(); }],
            ['nextEntry',         this._onHotkeyActionMoveRelative.bind(this, 1)],
            ['previousEntry',     this._onHotkeyActionMoveRelative.bind(this, -1)],
            ['lastEntry',         () => { this._focusEntry(this._dictionaryEntries.length - 1, true); }],
            ['firstEntry',        () => { this._focusEntry(0, true); }],
            ['historyBackward',   () => { this._sourceTermView(); }],
            ['historyForward',    () => { this._nextTermView(); }],
            ['playAudio',         () => { this._playAudioCurrent(); }],
            ['playAudioFromSource', this._onHotkeyActionPlayAudioFromSource.bind(this)],
            ['copyHostSelection', () => this._copyHostSelection()],
            ['nextEntryDifferentDictionary',     () => { this._focusEntryWithDifferentDictionary(1, true); }],
            ['previousEntryDifferentDictionary', () => { this._focusEntryWithDifferentDictionary(-1, true); }]
        ]);
        this.registerDirectMessageHandlers([
            ['setOptionsContext',  {async: false, handler: this._onMessageSetOptionsContext.bind(this)}],
            ['setContent',         {async: false, handler: this._onMessageSetContent.bind(this)}],
            ['clearAutoPlayTimer', {async: false, handler: this._onMessageClearAutoPlayTimer.bind(this)}],
            ['setCustomCss',       {async: false, handler: this._onMessageSetCustomCss.bind(this)}],
            ['setContentScale',    {async: false, handler: this._onMessageSetContentScale.bind(this)}],
            ['configure',          {async: true,  handler: this._onMessageConfigure.bind(this)}]
        ]);
        this.registerWindowMessageHandlers([
            ['extensionUnloaded', {async: false, handler: this._onMessageExtensionUnloaded.bind(this)}]
        ]);
    }

    get displayGenerator() {
        return this._displayGenerator;
    }

    get autoPlayAudioDelay() {
        return this._displayAudio.autoPlayAudioDelay;
    }

    set autoPlayAudioDelay(value) {
        this._displayAudio.autoPlayAudioDelay = value;
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

    get notificationContainer() {
        return this._footerNotificationContainer;
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

    async prepare() {
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
        this._displayAudio.prepare();
        this._displayAnki.prepare();
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
        this._updateTheme(options.general.popupTheme);
        this.setCustomCss(options.general.customPopupCss);
        this._hotkeyHelpController.setOptions(options);
        this._displayGenerator.updateHotkeys();
        this._hotkeyHelpController.setupNode(document.documentElement);
        this._elementOverflowController.setOptions(options);

        this._queryParser.setOptions({
            selectedParser: options.parsing.selectedParser,
            termSpacing: options.parsing.termSpacing,
            scanning: {
                inputs: scanningOptions.inputs,
                deepContentScan: scanningOptions.deepDomScan,
                selectText: scanningOptions.selectText,
                delay: scanningOptions.delay,
                touchInputEnabled: scanningOptions.touchInputEnabled,
                pointerEventsEnabled: scanningOptions.pointerEventsEnabled,
                scanLength: scanningOptions.length,
                layoutAwareScan: scanningOptions.layoutAwareScan,
                preventMiddleMouse: scanningOptions.preventMiddleMouse.onSearchQuery,
                sentenceParsingOptions
            }
        });

        this._updateNestedFrontend(options);
        this._updateContentTextScanner(options);

        this.trigger('optionsUpdated', {options});
    }

    clearAutoPlayTimer() {
        this._displayAudio.clearAutoPlayTimer();
    }

    setContent(details) {
        const {focus, history, params, state, content} = details;

        if (focus) {
            window.focus();
        }

        const urlSearchParams = new URLSearchParams();
        for (const [key, value] of Object.entries(params)) {
            urlSearchParams.append(key, value);
        }
        const url = `${location.protocol}//${location.host}${location.pathname}?${urlSearchParams.toString()}`;

        if (history && this._historyHasChanged) {
            this._updateHistoryState();
            this._history.pushState(state, content, url);
        } else {
            this._history.clear();
            this._history.replaceState(state, content, url);
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

    setQueryPostProcessor(func) {
        this._queryPostProcessor = func;
    }

    close() {
        switch (this._pageType) {
            case 'popup':
                this.invokeContentOrigin('closePopup');
                break;
            case 'search':
                this._closeTab();
                break;
        }
    }

    blurElement(element) {
        this._documentFocusController.blurElement(element);
    }

    searchLast() {
        const type = this._contentType;
        if (type === 'clear') { return; }
        const query = this._rawQuery;
        const state = (
            this._historyHasState() ?
            clone(this._history.state) :
            {
                focusEntry: 0,
                optionsContext: this._optionsContext,
                url: window.location.href,
                sentence: {text: query, offset: 0},
                documentTitle: document.title
            }
        );
        const details = {
            focus: false,
            history: false,
            params: this._createSearchParams(type, query, false),
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

    getAnkiNoteMediaAudioDetails(term, reading) {
        return this._displayAudio.getAnkiNoteMediaAudioDetails(term, reading);
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

    _onMessageSetOptionsContext({optionsContext}) {
        this.setOptionsContext(optionsContext);
        this.searchLast();
    }

    _onMessageSetContent({details}) {
        this.setContent(details);
    }

    _onMessageClearAutoPlayTimer() {
        this.clearAutoPlayTimer();
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
            this._mediaLoader.unloadAll();
            this._displayAudio.cleanupEntries();
            this._displayAnki.cleanupEntries();
            this._hideTagNotification(false);
            this._dictionaryEntries = [];
            this._dictionaryEntryNodes = [];
            this._elementOverflowController.clearElements();

            // Prepare
            const urlSearchParams = new URLSearchParams(location.search);
            let type = urlSearchParams.get('type');
            if (type === null) { type = 'terms'; }

            const fullVisible = urlSearchParams.get('full-visible');
            this._queryParserVisibleOverride = (fullVisible === null ? null : (fullVisible !== 'false'));
            this._updateQueryParser();

            let clear = true;
            this._historyHasChanged = true;
            this._contentType = type;
            this._query = '';
            this._rawQuery = '';
            const eventArgs = {type, urlSearchParams, token};

            // Set content
            switch (type) {
                case 'terms':
                case 'kanji':
                    {
                        let query = urlSearchParams.get('query');
                        if (query === null) { break; }

                        this._query = query;
                        clear = false;
                        const isTerms = (type === 'terms');
                        query = this._postProcessQuery(query);
                        this._rawQuery = query;
                        let queryFull = urlSearchParams.get('full');
                        queryFull = (queryFull !== null ? this._postProcessQuery(queryFull) : query);
                        const wildcardsEnabled = (urlSearchParams.get('wildcards') !== 'off');
                        const lookup = (urlSearchParams.get('lookup') !== 'false');
                        await this._setContentTermsOrKanji(token, isTerms, query, queryFull, lookup, wildcardsEnabled, eventArgs);
                    }
                    break;
                case 'unloaded':
                    {
                        clear = false;
                        const {content} = this._history;
                        eventArgs.content = content;
                        this.trigger('contentUpdating', eventArgs);
                        this._setContentExtensionUnloaded();
                    }
                    break;
            }

            // Clear
            if (clear) {
                type = 'clear';
                this._contentType = type;
                const {content} = this._history;
                eventArgs.type = type;
                eventArgs.content = content;
                this.trigger('contentUpdating', eventArgs);
                this._clearContent();
            }

            const stale = (this._setContentToken !== token);
            eventArgs.stale = stale;
            this.trigger('contentUpdated', eventArgs);
        } catch (e) {
            this.onError(e);
        }
    }

    _onQueryParserSearch({type, dictionaryEntries, sentence, inputInfo: {eventType}, textSource, optionsContext}) {
        const query = textSource.text();
        const historyState = this._history.state;
        const history = (
            eventType === 'click' ||
            !isObject(historyState) ||
            historyState.cause !== 'queryParser'
        );
        const details = {
            focus: false,
            history,
            params: this._createSearchParams(type, query, false),
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
            history: false,
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
                history: true,
                params: this._createSearchParams('kanji', query, false),
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
                this._focusEntry(this._index + (e.deltaY > 0 ? 1 : -1), true);
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

    _showTagNotification(tagNode) {
        tagNode = tagNode.parentNode;
        if (tagNode === null) { return; }

        if (this._tagNotification === null) {
            const node = this._displayGenerator.createEmptyFooterNotification();
            node.classList.add('click-scannable');
            this._tagNotification = new DisplayNotification(this._footerNotificationContainer, node);
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
        data.showPitchAccentDownstepNotation = `${options.general.showPitchAccentDownstepNotation}`;
        data.showPitchAccentPositionNotation = `${options.general.showPitchAccentPositionNotation}`;
        data.showPitchAccentGraph = `${options.general.showPitchAccentGraph}`;
        data.debug = `${options.general.debugInfo}`;
        data.popupDisplayMode = `${options.general.popupDisplayMode}`;
        data.popupCurrentIndicatorMode = `${options.general.popupCurrentIndicatorMode}`;
        data.popupActionBarVisibility = `${options.general.popupActionBarVisibility}`;
        data.popupActionBarLocation = `${options.general.popupActionBarLocation}`;
    }

    _updateTheme(themeName) {
        document.documentElement.dataset.theme = themeName;
    }

    async _findDictionaryEntries(isTerms, source, wildcardsEnabled, optionsContext) {
        if (isTerms) {
            const findDetails = {};
            if (wildcardsEnabled) {
                const match = /^([*\uff0a]*)([\w\W]*?)([*\uff0a]*)$/.exec(source);
                if (match !== null) {
                    if (match[1]) {
                        findDetails.wildcard = 'prefix';
                    } else if (match[3]) {
                        findDetails.wildcard = 'suffix';
                    }
                    source = match[2];
                }
            }

            const {dictionaryEntries} = await yomichan.api.termsFind(source, findDetails, optionsContext);
            return dictionaryEntries;
        } else {
            const dictionaryEntries = await yomichan.api.kanjiFind(source, optionsContext);
            return dictionaryEntries;
        }
    }

    async _setContentTermsOrKanji(token, isTerms, query, queryFull, lookup, wildcardsEnabled, eventArgs) {
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

        let {
            focusEntry=null,
            scrollX=null,
            scrollY=null,
            optionsContext=null
        } = state;
        if (typeof focusEntry !== 'number') { focusEntry = 0; }
        if (!(typeof optionsContext === 'object' && optionsContext !== null)) {
            optionsContext = this.getOptionsContext();
            state.optionsContext = optionsContext;
            changeHistory = true;
        }

        this._setFullQuery(queryFull);
        this._setTitleText(query);

        let {dictionaryEntries} = content;
        if (!Array.isArray(dictionaryEntries)) {
            dictionaryEntries = lookup && query.length > 0 ? await this._findDictionaryEntries(isTerms, query, wildcardsEnabled, optionsContext) : [];
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

        eventArgs.source = query;
        eventArgs.content = content;
        this.trigger('contentUpdating', eventArgs);

        this._dictionaryEntries = dictionaryEntries;

        this._updateNavigation(this._history.hasPrevious(), this._history.hasNext());
        this._setNoContentVisible(dictionaryEntries.length === 0 && lookup);

        const container = this._container;
        container.textContent = '';

        this._displayAnki.setupEntriesBegin();

        for (let i = 0, ii = dictionaryEntries.length; i < ii; ++i) {
            if (i > 0) {
                await promiseTimeout(1);
                if (this._setContentToken !== token) { return; }
            }

            const dictionaryEntry = dictionaryEntries[i];
            const entry = (
                isTerms ?
                this._displayGenerator.createTermEntry(dictionaryEntry) :
                this._displayGenerator.createKanjiEntry(dictionaryEntry)
            );
            entry.dataset.index = `${i}`;
            this._dictionaryEntryNodes.push(entry);
            this._addEntryEventListeners(entry);
            this._displayAudio.setupEntry(entry, i);
            this._displayAnki.setupEntry(entry, i);
            container.appendChild(entry);
            if (focusEntry === i) {
                this._focusEntry(i, false);
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

        this._displayAudio.setupEntriesComplete();
        this._displayAnki.setupEntriesComplete();
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
        this._setTitleText('');
        this._setFullQuery('');
    }

    _clearContent() {
        this._container.textContent = '';
        this._setTitleText('');
        this._setFullQuery('');
    }

    _setNoContentVisible(visible) {
        const noResults = document.querySelector('#no-results');

        if (noResults !== null) {
            noResults.hidden = !visible;
        }
    }

    _setFullQuery(text) {
        this._fullQuery = text;
        this._updateQueryParser();
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

        return entry;
    }

    _focusEntry(index, smooth) {
        index = Math.max(Math.min(index, this._dictionaryEntries.length - 1), 0);

        const entry = this._entrySetCurrent(index);
        let target = index === 0 || entry === null ? 0 : this._getElementTop(entry);

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
        const offsetSign = Math.sign(offset);
        if (offsetSign === 0) { return false; }

        let index = this._index;
        const dictionaryEntryCount = this._dictionaryEntries.length;
        if (index < 0 || index >= dictionaryEntryCount) { return false; }

        const {dictionary} = this._dictionaryEntries[index];
        for (let indexNext = index + offsetSign; indexNext >= 0 && indexNext < dictionaryEntryCount; indexNext += offsetSign) {
            const {dictionaryNames} = this._dictionaryEntries[indexNext];
            if (dictionaryNames.length > 1 || !dictionaryNames.includes(dictionary)) {
                offset -= offsetSign;
                if (Math.sign(offsetSign) !== offset) {
                    index = indexNext;
                    break;
                }
            }
        }

        if (index === this._index) { return false; }

        this._focusEntry(index, smooth);
        return true;
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

    async _playAudioCurrent() {
        await this._displayAudio.playAudio(this._index, 0);
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

    _createSearchParams(type, query, wildcards) {
        const params = {};
        if (query.length < this._fullQuery.length) {
            params.full = this._fullQuery;
        }
        params.query = query;
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
                        text = await this.invokeContentOrigin('getSelectionText');
                    } catch (e) {
                        break;
                    }
                    this._copyText(text);
                }
                break;
            default:
                await this.invokeContentOrigin('copySelection');
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

    _addMultipleEventListeners(container, selector, ...args) {
        for (const node of container.querySelectorAll(selector)) {
            this._eventListeners.addEventListener(node, ...args);
        }
    }

    _addEntryEventListeners(entry) {
        this._eventListeners.addEventListener(entry, 'click', this._onEntryClick.bind(this));
        this._addMultipleEventListeners(entry, '.headword-kanji-link', 'click', this._onKanjiLookup.bind(this));
        this._addMultipleEventListeners(entry, '.debug-log-link', 'click', this._onDebugLogClick.bind(this));
        this._addMultipleEventListeners(entry, '.tag-label', 'click', this._onTagClick.bind(this));
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
                documentUtil: this._documentUtil,
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
                    scanOnPenHover: false,
                    scanOnPenPress: false,
                    scanOnPenRelease: false,
                    preventTouchScrolling: false
                }
            }],
            deepContentScan: scanningOptions.deepDomScan,
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
            history: true,
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
        this._focusEntry(this._index + count * sign, true);
    }

    _onHotkeyActionPlayAudioFromSource(source) {
        this._displayAudio.playAudio(this._index, 0, source);
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

    _postProcessQuery(query) {
        const queryPostProcessor = this._queryPostProcessor;
        return typeof queryPostProcessor === 'function' ? queryPostProcessor(query) : query;
    }

    async _logDictionaryEntryData(index) {
        if (index < 0 || index >= this._dictionaryEntries.length) { return; }
        const dictionaryEntry = this._dictionaryEntries[index];
        const result = {dictionaryEntry};

        const result2 = await this._displayAnki.getLogData(dictionaryEntry);
        Object.assign(result, result2);

        console.log(result);
    }
}
