/*
 * Copyright (C) 2017-2020  Yomichan Authors
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
 * AnkiNoteBuilder
 * AudioSystem
 * DisplayGenerator
 * DisplayHistory
 * DocumentUtil
 * Frontend
 * MediaLoader
 * PopupFactory
 * QueryParser
 * TemplateRendererProxy
 * WindowScroll
 * api
 * dynamicLoader
 */

class Display extends EventDispatcher {
    constructor() {
        super();
        this._container = document.querySelector('#definitions');
        this._definitions = [];
        this._optionsContext = {depth: 0, url: window.location.href};
        this._options = null;
        this._index = 0;
        this._audioPlaying = null;
        this._audioFallback = null;
        this._audioSystem = new AudioSystem({
            getAudioInfo: this._getAudioInfo.bind(this)
        });
        this._styleNode = null;
        this._eventListeners = new EventListenerCollection();
        this._persistentEventListeners = new EventListenerCollection();
        this._interactive = false;
        this._eventListenersActive = false;
        this._clickScanPrevent = false;
        this._setContentToken = null;
        this._autoPlayAudioTimer = null;
        this._autoPlayAudioDelay = 0;
        this._mediaLoader = new MediaLoader();
        this._displayGenerator = new DisplayGenerator({mediaLoader: this._mediaLoader});
        this._hotkeys = new Map();
        this._actions = new Map();
        this._messageHandlers = new Map();
        this._directMessageHandlers = new Map();
        this._history = new DisplayHistory({clearable: true, useBrowserHistory: false});
        this._historyChangeIgnore = false;
        this._historyHasChanged = false;
        this._navigationHeader = document.querySelector('#navigation-header');
        this._contentType = 'clear';
        this._defaultTitle = 'Yomichan Search';
        this._defaultTitleMaxLength = 1000;
        this._fullQuery = '';
        this._documentUtil = new DocumentUtil();
        this._progressIndicator = document.querySelector('#progress-indicator');
        this._progressIndicatorTimer = null;
        this._progressIndicatorVisible = new DynamicProperty(false);
        this._queryParserVisible = false;
        this._queryParserVisibleOverride = null;
        this._queryParserContainer = document.querySelector('#query-parser-container');
        this._queryParser = new QueryParser({
            getOptionsContext: this.getOptionsContext.bind(this),
            documentUtil: this._documentUtil
        });
        this._mode = null;
        this._ownerFrameId = null;
        this._defaultAnkiFieldTemplates = null;
        this._defaultAnkiFieldTemplatesPromise = null;
        this._templateRenderer = new TemplateRendererProxy();
        this._ankiNoteBuilder = new AnkiNoteBuilder({
            renderTemplate: this._renderTemplate.bind(this)
        });
        this._updateAdderButtonsPromise = Promise.resolve();
        this._contentScrollElement = document.querySelector('#content-scroll');
        this._contentScrollBodyElement = document.querySelector('#content-body');
        this._contentScrollFocusElement = document.querySelector('#content-scroll-focus');
        this._windowScroll = new WindowScroll(this._contentScrollElement);
        this._contentSidebar = document.querySelector('#content-sidebar');
        this._closeButton = document.querySelector('#close-button');
        this._navigationPreviousButton = document.querySelector('#navigate-previous-button');
        this._navigationNextButton = document.querySelector('#navigate-next-button');

        this.registerActions([
            ['close',            () => { this.onEscape(); }],
            ['nextEntry',        () => { this._focusEntry(this._index + 1, true); }],
            ['nextEntry3',       () => { this._focusEntry(this._index + 3, true); }],
            ['previousEntry',    () => { this._focusEntry(this._index - 1, true); }],
            ['previousEntry3',   () => { this._focusEntry(this._index - 3, true); }],
            ['lastEntry',        () => { this._focusEntry(this._definitions.length - 1, true); }],
            ['firstEntry',       () => { this._focusEntry(0, true); }],
            ['historyBackward',  () => { this._sourceTermView(); }],
            ['historyForward',   () => { this._nextTermView(); }],
            ['addNoteKanji',     () => { this._noteTryAdd('kanji'); }],
            ['addNoteTermKanji', () => { this._noteTryAdd('term-kanji'); }],
            ['addNoteTermKana',  () => { this._noteTryAdd('term-kana'); }],
            ['viewNote',         () => { this._noteTryView(); }],
            ['playAudio',        () => { this._playAudioCurrent(); }]
        ]);
        this.registerHotkeys([
            {key: 'Escape',    modifiers: [],      action: 'close'},
            {key: 'PageUp',    modifiers: ['alt'], action: 'previousEntry3'},
            {key: 'PageDown',  modifiers: ['alt'], action: 'nextEntry3'},
            {key: 'End',       modifiers: ['alt'], action: 'lastEntry'},
            {key: 'Home',      modifiers: ['alt'], action: 'firstEntry'},
            {key: 'ArrowUp',   modifiers: ['alt'], action: 'previousEntry'},
            {key: 'ArrowDown', modifiers: ['alt'], action: 'nextEntry'},
            {key: 'B',         modifiers: ['alt'], action: 'historyBackward'},
            {key: 'F',         modifiers: ['alt'], action: 'historyForward'},
            {key: 'K',         modifiers: ['alt'], action: 'addNoteKanji'},
            {key: 'E',         modifiers: ['alt'], action: 'addNoteTermKanji'},
            {key: 'R',         modifiers: ['alt'], action: 'addNoteTermKana'},
            {key: 'P',         modifiers: ['alt'], action: 'playAudio'},
            {key: 'V',         modifiers: ['alt'], action: 'viewNote'}
        ]);
        this.registerMessageHandlers([
            ['setMode', {async: false, handler: this._onMessageSetMode.bind(this)}]
        ]);
        this.registerDirectMessageHandlers([
            ['setOptionsContext',  {async: false, handler: this._onMessageSetOptionsContext.bind(this)}],
            ['setContent',         {async: false, handler: this._onMessageSetContent.bind(this)}],
            ['clearAutoPlayTimer', {async: false, handler: this._onMessageClearAutoPlayTimer.bind(this)}],
            ['setCustomCss',       {async: false, handler: this._onMessageSetCustomCss.bind(this)}]
        ]);
    }

    get autoPlayAudioDelay() {
        return this._autoPlayAudioDelay;
    }

    set autoPlayAudioDelay(value) {
        this._autoPlayAudioDelay = value;
    }

    get queryParserVisible() {
        return this._queryParserVisible;
    }

    set queryParserVisible(value) {
        this._queryParserVisible = value;
        this._updateQueryParser();
    }

    get mode() {
        return this._mode;
    }

    get ownerFrameId() {
        return this._ownerFrameId;
    }

    set ownerFrameId(value) {
        this._ownerFrameId = value;
    }

    async prepare() {
        this._audioSystem.prepare();
        this._updateMode();
        this._setInteractive(true);
        await this._displayGenerator.prepare();
        this._queryParser.prepare();
        this._history.prepare();
        this._history.on('stateChanged', this._onStateChanged.bind(this));
        this._queryParser.on('searched', this._onQueryParserSearch.bind(this));
        yomichan.on('extensionUnloaded', this._onExtensionUnloaded.bind(this));
        chrome.runtime.onMessage.addListener(this._onMessage.bind(this));
        api.crossFrame.registerHandlers([
            ['popupMessage', {async: 'dynamic', handler: this._onDirectMessage.bind(this)}]
        ]);
        window.addEventListener('focus', this._onWindowFocus.bind(this), false);
        this._updateFocusedElement();
        this._progressIndicatorVisible.on('change', this._onProgressIndicatorVisibleChanged.bind(this));
    }

    initializeState() {
        this._onStateChanged();
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
        yomichan.logError(error);
    }

    onEscape() {
        throw new Error('Override me');
    }

    onKeyDown(e) {
        const key = DocumentUtil.getKeyFromEvent(e);
        const handlers = this._hotkeys.get(key);
        if (typeof handlers === 'undefined') { return false; }

        const eventModifiers = DocumentUtil.getActiveModifiers(e);
        for (const {modifiers, action} of handlers) {
            if (!this._areSame(modifiers, eventModifiers)) { continue; }

            const actionHandler = this._actions.get(action);
            if (typeof actionHandler === 'undefined') { continue; }

            const result = actionHandler(e);
            if (result !== false) {
                e.preventDefault();
                return true;
            }
        }
        return false;
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
        const options = await api.optionsGet(this.getOptionsContext());
        const scanning = options.scanning;
        this._options = options;

        this._updateDocumentOptions(options);
        this._updateTheme(options.general.popupTheme);
        this.setCustomCss(options.general.customPopupCss);

        this._queryParser.setOptions({
            selectedParser: options.parsing.selectedParser,
            termSpacing: options.parsing.termSpacing,
            scanning: {
                inputs: scanning.inputs,
                deepContentScan: scanning.deepDomScan,
                selectText: scanning.selectText,
                delay: scanning.delay,
                touchInputEnabled: scanning.touchInputEnabled,
                pointerEventsEnabled: scanning.pointerEventsEnabled,
                scanLength: scanning.length,
                sentenceExtent: options.anki.sentenceExt,
                layoutAwareScan: scanning.layoutAwareScan,
                preventMiddleMouse: scanning.preventMiddleMouse.onSearchQuery
            }
        });
    }

    addMultipleEventListeners(selector, type, listener, options) {
        for (const node of this._container.querySelectorAll(selector)) {
            this._eventListeners.addEventListener(node, type, listener, options);
        }
    }

    autoPlayAudio() {
        this.clearAutoPlayTimer();

        if (this._definitions.length === 0) { return; }

        const callback = () => this._playAudio(0, 0);

        if (this._autoPlayAudioDelay > 0) {
            this._autoPlayAudioTimer = setTimeout(callback, this._autoPlayAudioDelay);
        } else {
            callback();
        }
    }

    clearAutoPlayTimer() {
        if (this._autoPlayAudioTimer !== null) {
            clearTimeout(this._autoPlayAudioTimer);
            this._autoPlayAudioTimer = null;
        }
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

    async getDocumentTitle() {
        return document.title;
    }

    registerActions(actions) {
        for (const [name, handler] of actions) {
            this._actions.set(name, handler);
        }
    }

    registerHotkeys(hotkeys) {
        for (const {key, modifiers, action} of hotkeys) {
            let handlers = this._hotkeys.get(key);
            if (typeof handlers === 'undefined') {
                handlers = [];
                this._hotkeys.set(key, handlers);
            }
            handlers.push({modifiers: new Set(modifiers), action});
        }
    }

    registerMessageHandlers(handlers) {
        for (const [name, handlerInfo] of handlers) {
            this._messageHandlers.set(name, handlerInfo);
        }
    }

    registerDirectMessageHandlers(handlers) {
        for (const [name, handlerInfo] of handlers) {
            this._directMessageHandlers.set(name, handlerInfo);
        }
    }

    async setupNestedPopups({depth, parentPopupId, parentFrameId, useProxyPopup, pageType}) {
        await dynamicLoader.loadScripts([
            '/mixed/js/text-scanner.js',
            '/mixed/js/frame-client.js',
            '/fg/js/popup.js',
            '/fg/js/popup-proxy.js',
            '/fg/js/popup-window.js',
            '/fg/js/popup-factory.js',
            '/fg/js/frame-offset-forwarder.js',
            '/fg/js/frontend.js'
        ]);

        const {frameId} = await api.frameInformationGet();

        const popupFactory = new PopupFactory(frameId);
        popupFactory.prepare();

        const frontend = new Frontend({
            frameId,
            popupFactory,
            depth,
            parentPopupId,
            parentFrameId,
            useProxyPopup,
            pageType,
            allowRootFramePopupProxy: true
        });
        await frontend.prepare();
    }

    authenticateMessageData(data) {
        return data;
    }

    postProcessQuery(query) {
        return query;
    }

    close() {
        // NOP
    }

    blurElement(element) {
        element.blur();
        this._updateFocusedElement();
    }

    // Message handlers

    _onMessage({action, params}, sender, callback) {
        const messageHandler = this._messageHandlers.get(action);
        if (typeof messageHandler === 'undefined') { return false; }
        return yomichan.invokeMessageHandler(messageHandler, params, callback, sender);
    }

    _onDirectMessage(data) {
        data = this.authenticateMessageData(data);
        const {action, params} = data;
        const handlerInfo = this._directMessageHandlers.get(action);
        if (typeof handlerInfo === 'undefined') {
            throw new Error(`Invalid action: ${action}`);
        }

        const {async, handler} = handlerInfo;
        const result = handler(params);
        return {async, result};
    }

    _onMessageSetMode({mode}) {
        this._setMode(mode, true);
    }

    _onMessageSetOptionsContext({optionsContext}) {
        this.setOptionsContext(optionsContext);
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

    // Private

    async _onStateChanged() {
        if (this._historyChangeIgnore) { return; }

        const token = {}; // Unique identifier token
        this._setContentToken = token;
        try {
            const urlSearchParams = new URLSearchParams(location.search);
            let type = urlSearchParams.get('type');
            if (type === null) { type = 'terms'; }

            const fullVisible = urlSearchParams.get('full-visible');
            this._queryParserVisibleOverride = (fullVisible === null ? null : (fullVisible !== 'false'));
            this._updateQueryParser();

            this._closePopups();
            this._setEventListenersActive(false);

            let assigned = false;
            const eventArgs = {type, urlSearchParams, token};
            this._historyHasChanged = true;
            this._contentType = type;
            this._mediaLoader.unloadAll();
            switch (type) {
                case 'terms':
                case 'kanji':
                    {
                        const isTerms = (type === 'terms');
                        assigned = await this._setContentTermsOrKanji(token, isTerms, urlSearchParams, eventArgs);
                    }
                    break;
                case 'unloaded':
                    {
                        const {content} = this._history;
                        eventArgs.content = content;
                        this.trigger('contentUpdating', eventArgs);
                        this._setContentExtensionUnloaded();
                        assigned = true;
                    }
                    break;
            }

            const stale = (this._setContentToken !== token);
            if (!stale) {
                if (!assigned) {
                    type = 'clear';
                    this._contentType = type;
                    const {content} = this._history;
                    eventArgs.type = type;
                    eventArgs.content = content;
                    this.trigger('contentUpdating', eventArgs);
                    this._clearContent();
                }

                this._setEventListenersActive(true);
            }

            eventArgs.stale = stale;
            this.trigger('contentUpdated', eventArgs);
        } catch (e) {
            this.onError(e);
        }
    }

    _onQueryParserSearch({type, definitions, sentence, inputInfo: {cause}, textSource, optionsContext}) {
        const query = textSource.text();
        const history = (cause === 'click');
        const details = {
            focus: false,
            history,
            params: this._createSearchParams(type, query, false),
            state: {
                sentence,
                optionsContext
            },
            content: {
                definitions
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
            content: {}
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

    _onWindowFocus() {
        this._updateFocusedElement();
    }

    async _onKanjiLookup(e) {
        try {
            e.preventDefault();
            if (!this._historyHasState()) { return; }

            const link = e.target;
            const {state} = this._history;

            state.focusEntry = this._getClosestDefinitionIndex(link);
            state.scrollX = this._windowScroll.x;
            state.scrollY = this._windowScroll.y;
            this._historyStateUpdate(state);

            const query = link.textContent;
            const definitions = await api.kanjiFind(query, this.getOptionsContext());
            const details = {
                focus: false,
                history: true,
                params: this._createSearchParams('kanji', query, false),
                state: {
                    focusEntry: 0,
                    sentence: state.sentence,
                    optionsContext: state.optionsContext
                },
                content: {
                    definitions
                }
            };
            this.setContent(details);
        } catch (error) {
            this.onError(error);
        }
    }

    _onGlossaryMouseDown(e) {
        if (DocumentUtil.isMouseButtonPressed(e, 'primary')) {
            this._clickScanPrevent = false;
        }
    }

    _onGlossaryMouseMove() {
        this._clickScanPrevent = true;
    }

    _onGlossaryMouseUp(e) {
        if (!this._clickScanPrevent && DocumentUtil.isMouseButtonPressed(e, 'primary')) {
            try {
                this._onTermLookup(e);
            } catch (error) {
                this.onError(error);
            }
        }
    }

    async _onTermLookup(e) {
        if (!this._historyHasState()) { return; }

        const termLookupResults = await this._termLookup(e);
        if (!termLookupResults || !this._historyHasState()) { return; }

        const {state} = this._history;
        const {textSource, definitions} = termLookupResults;

        const scannedElement = e.target;
        const sentenceExtent = this._options.anki.sentenceExt;
        const layoutAwareScan = this._options.scanning.layoutAwareScan;
        const sentence = this._documentUtil.extractSentence(textSource, sentenceExtent, layoutAwareScan);

        state.focusEntry = this._getClosestDefinitionIndex(scannedElement);
        state.scrollX = this._windowScroll.x;
        state.scrollY = this._windowScroll.y;
        this._historyStateUpdate(state);

        const query = textSource.text();
        const details = {
            focus: false,
            history: true,
            params: this._createSearchParams('terms', query, false),
            state: {
                focusEntry: 0,
                sentence,
                optionsContext: state.optionsContext
            },
            content: {
                definitions
            }
        };
        this.setContent(details);
    }

    async _termLookup(e) {
        e.preventDefault();

        const {length: scanLength, deepDomScan: deepScan, layoutAwareScan} = this._options.scanning;
        const textSource = this._documentUtil.getRangeFromPoint(e.clientX, e.clientY, deepScan);
        if (textSource === null) {
            return false;
        }

        let definitions, length;
        try {
            textSource.setEndOffset(scanLength, layoutAwareScan);

            ({definitions, length} = await api.termsFind(textSource.text(), {}, this.getOptionsContext()));
            if (definitions.length === 0) {
                return false;
            }

            textSource.setEndOffset(length, layoutAwareScan);
        } finally {
            textSource.cleanup();
        }

        return {textSource, definitions};
    }

    _onAudioPlay(e) {
        e.preventDefault();
        const link = e.currentTarget;
        const definitionIndex = this._getClosestDefinitionIndex(link);
        if (definitionIndex < 0) { return; }
        const expressionIndex = Math.max(0, this._getClosestExpressionIndex(link));
        this._playAudio(definitionIndex, expressionIndex);
    }

    _onNoteAdd(e) {
        e.preventDefault();
        const link = e.currentTarget;
        const index = this._getClosestDefinitionIndex(link);
        if (index < 0 || index >= this._definitions.length) { return; }

        this._noteAdd(this._definitions[index], link.dataset.mode);
    }

    _onNoteView(e) {
        e.preventDefault();
        const link = e.currentTarget;
        api.noteView(link.dataset.noteId);
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
        const index = this._getClosestDefinitionIndex(link);
        if (index < 0 || index >= this._definitions.length) { return; }
        const definition = this._definitions[index];
        console.log(definition);
    }

    _updateDocumentOptions(options) {
        const data = document.documentElement.dataset;
        data.ankiEnabled = `${options.anki.enable}`;
        data.audioEnabled = `${options.audio.enabled && options.audio.sources.length > 0}`;
        data.compactGlossaries = `${options.general.compactGlossaries}`;
        data.compactTags = `${options.general.compactTags}`;
        data.enableSearchTags = `${options.scanning.enableSearchTags}`;
        data.showPitchAccentDownstepNotation = `${options.general.showPitchAccentDownstepNotation}`;
        data.showPitchAccentPositionNotation = `${options.general.showPitchAccentPositionNotation}`;
        data.showPitchAccentGraph = `${options.general.showPitchAccentGraph}`;
        data.debug = `${options.general.debugInfo}`;
    }

    _updateTheme(themeName) {
        document.documentElement.dataset.yomichanTheme = themeName;
    }

    _setInteractive(interactive) {
        interactive = !!interactive;
        if (this._interactive === interactive) { return; }
        this._interactive = interactive;

        if (interactive) {
            this._persistentEventListeners.addEventListener(document, 'keydown', this.onKeyDown.bind(this), false);
            this._persistentEventListeners.addEventListener(document, 'wheel', this._onWheel.bind(this), {passive: false});
            if (this._closeButton !== null) {
                this._persistentEventListeners.addEventListener(this._closeButton, 'click', this._onCloseButtonClick.bind(this));
            }
            if (this._navigationPreviousButton !== null) {
                this._persistentEventListeners.addEventListener(this._navigationPreviousButton, 'click', this._onSourceTermView.bind(this));
            }
            if (this._navigationNextButton !== null) {
                this._persistentEventListeners.addEventListener(this._navigationNextButton, 'click', this._onNextTermView.bind(this));
            }
        } else {
            this._persistentEventListeners.removeAllEventListeners();
        }
        this._setEventListenersActive(this._eventListenersActive);
    }

    _setEventListenersActive(active) {
        active = !!active && this._interactive;
        if (this._eventListenersActive === active) { return; }
        this._eventListenersActive = active;

        if (active) {
            this.addMultipleEventListeners('.action-add-note', 'click', this._onNoteAdd.bind(this));
            this.addMultipleEventListeners('.action-view-note', 'click', this._onNoteView.bind(this));
            this.addMultipleEventListeners('.action-play-audio', 'click', this._onAudioPlay.bind(this));
            this.addMultipleEventListeners('.kanji-link', 'click', this._onKanjiLookup.bind(this));
            this.addMultipleEventListeners('.debug-log-link', 'click', this._onDebugLogClick.bind(this));
            if (this._options !== null && this._options.scanning.enablePopupSearch) {
                this.addMultipleEventListeners('.term-glossary-item, .tag', 'mouseup', this._onGlossaryMouseUp.bind(this));
                this.addMultipleEventListeners('.term-glossary-item, .tag', 'mousedown', this._onGlossaryMouseDown.bind(this));
                this.addMultipleEventListeners('.term-glossary-item, .tag', 'mousemove', this._onGlossaryMouseMove.bind(this));
            }
        } else {
            this._eventListeners.removeAllEventListeners();
        }
    }

    async _findDefinitions(isTerms, source, urlSearchParams, optionsContext) {
        if (isTerms) {
            const findDetails = {};
            if (urlSearchParams.get('wildcards') !== 'off') {
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

            const {definitions} = await api.termsFind(source, findDetails, optionsContext);
            return definitions;
        } else {
            const definitions = await api.kanjiFind(source, optionsContext);
            return definitions;
        }
    }

    async _setContentTermsOrKanji(token, isTerms, urlSearchParams, eventArgs) {
        let source = urlSearchParams.get('query');
        if (!source) {
            this._setFullQuery('');
            return false;
        }

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

        let {sentence=null, optionsContext=null, focusEntry=null, scrollX=null, scrollY=null} = state;
        if (!(typeof optionsContext === 'object' && optionsContext !== null)) {
            optionsContext = this.getOptionsContext();
            state.optionsContext = optionsContext;
            changeHistory = true;
        }
        let {url} = optionsContext;
        if (typeof url !== 'string') { url = window.location.href; }
        sentence = this._getValidSentenceData(sentence);

        source = this.postProcessQuery(source);
        let full = urlSearchParams.get('full');
        full = (full === null ? source : this.postProcessQuery(full));
        this._setFullQuery(full);
        this._setTitleText(source);

        let {definitions} = content;
        if (!Array.isArray(definitions)) {
            definitions = await this._findDefinitions(isTerms, source, urlSearchParams, optionsContext);
            if (this._setContentToken !== token) { return true; }
            content.definitions = definitions;
            changeHistory = true;
        }

        await this._setOptionsContextIfDifferent(optionsContext);
        if (this._setContentToken !== token) { return true; }

        if (changeHistory) {
            this._historyStateUpdate(state, content);
        }

        eventArgs.source = source;
        eventArgs.content = content;
        this.trigger('contentUpdating', eventArgs);

        this._definitions = definitions;

        for (const definition of definitions) {
            definition.cloze = this._clozeBuild(sentence, isTerms ? definition.rawSource : definition.character);
            definition.url = url;
        }

        this._updateNavigation(this._history.hasPrevious(), this._history.hasNext());
        this._setNoContentVisible(definitions.length === 0);

        const container = this._container;
        container.textContent = '';

        for (let i = 0, ii = definitions.length; i < ii; ++i) {
            if (i > 0) {
                await promiseTimeout(1);
                if (this._setContentToken !== token) { return true; }
            }

            const entry = (
                isTerms ?
                this._displayGenerator.createTermEntry(definitions[i]) :
                this._displayGenerator.createKanjiEntry(definitions[i])
            );
            entry.dataset.index = `${i}`;
            container.appendChild(entry);
        }

        this._focusEntry(typeof focusEntry === 'number' ? focusEntry : 0, false);
        if (typeof scrollX === 'number' || typeof scrollY === 'number') {
            let {x, y} = this._windowScroll;
            if (typeof scrollX === 'number') { x = scrollX; }
            if (typeof scrollY === 'number') { y = scrollY; }
            this._windowScroll.stop();
            this._windowScroll.to(x, y);
        }

        if (
            isTerms &&
            this._options.audio.enabled &&
            this._options.audio.autoPlay
        ) {
            this.autoPlayAudio();
        }

        this._updateAdderButtons(token, isTerms, definitions);

        return true;
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
    }

    _clearContent() {
        this._container.textContent = '';
        this._setTitleText('');
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
        // Chrome limits title to 1024 characters
        const ellipsis = '...';
        const maxLength = this._defaultTitleMaxLength - this._defaultTitle.length;
        if (text.length > maxLength) {
            text = `${text.substring(0, Math.max(0, maxLength - maxLength))}${ellipsis}`;
        }

        document.title = (
            text.length === 0 ?
            this._defaultTitle :
            `${text} - ${this._defaultTitle}`
        );
    }

    _updateNavigation(previous, next) {
        if (this._contentSidebar !== null) {
            this._contentSidebar.dataset.hasNavigationPrevious = `${previous}`;
            this._contentSidebar.dataset.hasNavigationNext = `${next}`;
        }
        if (this._navigationPreviousButton !== null) {
            this._navigationPreviousButton.disabled = !previous;
        }
        if (this._navigationNextButton !== null) {
            this._navigationNextButton.disabled = !next;
        }
    }

    async _updateAdderButtons(token, isTerms, definitions) {
        await this._updateAdderButtonsPromise;
        if (this._setContentToken !== token) { return; }

        const {promise, resolve} = deferPromise();
        try {
            this._updateAdderButtonsPromise = promise;

            const modes = isTerms ? ['term-kanji', 'term-kana'] : ['kanji'];
            let states;
            try {
                if (this._options.anki.checkForDuplicates) {
                    const noteContext = await this._getNoteContext();
                    states = await this._areDefinitionsAddable(definitions, modes, noteContext);
                } else {
                    if (!await api.isAnkiConnected()) {
                        throw new Error('Anki not connected');
                    }
                    states = this._areDefinitionsAddableForcedValue(definitions, modes, true);
                }
            } catch (e) {
                return;
            }

            if (this._setContentToken !== token) { return; }

            this._updateAdderButtons2(states, modes);
        } finally {
            resolve();
        }
    }

    _updateAdderButtons2(states, modes) {
        for (let i = 0, ii = states.length; i < ii; ++i) {
            const infos = states[i];
            let noteId = null;
            for (let j = 0, jj = infos.length; j < jj; ++j) {
                const {canAdd, noteIds} = infos[j];
                const mode = modes[j];
                const button = this._adderButtonFind(i, mode);
                if (button === null) {
                    continue;
                }

                if (Array.isArray(noteIds) && noteIds.length > 0) {
                    noteId = noteIds[0];
                }
                button.classList.toggle('disabled', !canAdd);
                button.classList.remove('pending');
            }
            if (noteId !== null) {
                this._viewerButtonShow(i, noteId);
            }
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
        index = Math.max(Math.min(index, this._definitions.length - 1), 0);

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

    _noteTryAdd(mode) {
        const index = this._index;
        if (index < 0 || index >= this._definitions.length) { return; }

        const button = this._adderButtonFind(index, mode);
        if (button !== null && !button.classList.contains('disabled')) {
            this._noteAdd(this._definitions[index], mode);
        }
    }

    _noteTryView() {
        const button = this._viewerButtonFind(this._index);
        if (button !== null && !button.classList.contains('disabled')) {
            api.noteView(button.dataset.noteId);
        }
    }

    async _noteAdd(definition, mode) {
        const overrideToken = this._progressIndicatorVisible.setOverride(true);
        try {
            const noteContext = await this._getNoteContext();
            const noteId = await this._addDefinition(definition, mode, noteContext);
            if (noteId) {
                const index = this._definitions.indexOf(definition);
                const adderButton = this._adderButtonFind(index, mode);
                if (adderButton !== null) {
                    adderButton.classList.add('disabled');
                }
                this._viewerButtonShow(index, noteId);
            } else {
                throw new Error('Note could not be added');
            }
        } catch (e) {
            this.onError(e);
        } finally {
            this._progressIndicatorVisible.clearOverride(overrideToken);
        }
    }

    async _playAudio(definitionIndex, expressionIndex) {
        if (definitionIndex < 0 || definitionIndex >= this._definitions.length) { return; }

        const definition = this._definitions[definitionIndex];
        if (definition.type === 'kanji') { return; }

        const {expressions} = definition;
        if (expressionIndex < 0 || expressionIndex >= expressions.length) { return; }

        const {expression, reading} = expressions[expressionIndex];

        const overrideToken = this._progressIndicatorVisible.setOverride(true);
        try {
            this._stopPlayingAudio();

            let audio, info;
            try {
                const {sources, textToSpeechVoice, customSourceUrl} = this._options.audio;
                let index;
                ({audio, index} = await this._audioSystem.createDefinitionAudio(sources, expression, reading, {textToSpeechVoice, customSourceUrl}));
                info = `From source ${1 + index}: ${sources[index]}`;
            } catch (e) {
                if (this._audioFallback === null) {
                    this._audioFallback = new Audio('/mixed/mp3/button.mp3');
                }
                audio = this._audioFallback;
                info = 'Could not find audio';
            }

            const button = this._audioButtonFindImage(definitionIndex, expressionIndex);
            if (button !== null) {
                let titleDefault = button.dataset.titleDefault;
                if (!titleDefault) {
                    titleDefault = button.title || '';
                    button.dataset.titleDefault = titleDefault;
                }
                button.title = `${titleDefault}\n${info}`;
            }

            this._stopPlayingAudio();

            const volume = Math.max(0.0, Math.min(1.0, this._options.audio.volume / 100.0));
            this._audioPlaying = audio;
            audio.currentTime = 0;
            audio.volume = Number.isFinite(volume) ? volume : 1.0;
            const playPromise = audio.play();
            if (typeof playPromise !== 'undefined') {
                try {
                    await playPromise;
                } catch (e2) {
                    // NOP
                }
            }
        } catch (e) {
            this.onError(e);
        } finally {
            this._progressIndicatorVisible.clearOverride(overrideToken);
        }
    }

    async _playAudioCurrent() {
        return await this._playAudio(this._index, 0);
    }

    _stopPlayingAudio() {
        if (this._audioPlaying !== null) {
            this._audioPlaying.pause();
            this._audioPlaying = null;
        }
    }

    _getEntry(index) {
        const entries = this._container.querySelectorAll('.entry');
        return index >= 0 && index < entries.length ? entries[index] : null;
    }

    _getValidSentenceData(sentence) {
        let {text, offset} = (isObject(sentence) ? sentence : {});
        if (typeof text !== 'string') { text = ''; }
        if (typeof offset !== 'number') { offset = 0; }
        return {text, offset};
    }

    _clozeBuild({text, offset}, source) {
        return {
            sentence: text.trim(),
            prefix: text.substring(0, offset).trim(),
            body: text.substring(offset, offset + source.length),
            suffix: text.substring(offset + source.length).trim()
        };
    }

    _getClosestDefinitionIndex(element) {
        return this._getClosestIndex(element, '.entry');
    }

    _getClosestExpressionIndex(element) {
        return this._getClosestIndex(element, '.term-expression');
    }

    _getClosestIndex(element, selector) {
        const node = element.closest(selector);
        if (node === null) { return -1; }
        const index = parseInt(node.dataset.index, 10);
        return Number.isFinite(index) ? index : -1;
    }

    _adderButtonFind(index, mode) {
        const entry = this._getEntry(index);
        return entry !== null ? entry.querySelector(`.action-add-note[data-mode="${mode}"]`) : null;
    }

    _viewerButtonFind(index) {
        const entry = this._getEntry(index);
        return entry !== null ? entry.querySelector('.action-view-note') : null;
    }

    _viewerButtonShow(index, noteId) {
        const viewerButton = this._viewerButtonFind(index);
        if (viewerButton === null) {
            return;
        }
        viewerButton.classList.remove('pending', 'disabled');
        viewerButton.dataset.noteId = noteId;
    }

    _audioButtonFindImage(index, expressionIndex) {
        const entry = this._getEntry(index);
        if (entry === null) { return null; }

        const container = (
            expressionIndex >= 0 ?
            entry.querySelector(`.term-expression:nth-of-type(${expressionIndex + 1})`) :
            entry
        );
        return container !== null ? container.querySelector('.action-play-audio>img') : null;
    }

    _getElementTop(element) {
        const elementRect = element.getBoundingClientRect();
        const documentRect = this._contentScrollBodyElement.getBoundingClientRect();
        return elementRect.top - documentRect.top;
    }

    async _getNoteContext() {
        const documentTitle = await this.getDocumentTitle();
        return {
            document: {
                title: documentTitle
            }
        };
    }

    _historyHasState() {
        return isObject(this._history.state);
    }

    _historyStateUpdate(state, content) {
        const historyChangeIgnorePre = this._historyChangeIgnore;
        try {
            this._historyChangeIgnore = true;
            if (typeof state === 'undefined') { state = this._history.state; }
            if (typeof content === 'undefined') { content = this._history.content; }
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

    _updateMode() {
        let mode = null;
        try {
            mode = sessionStorage.getItem('mode');
        } catch (e) {
            // Browsers can throw a SecurityError when cookie blocking is enabled.
        }
        this._setMode(mode, false);
    }

    _setMode(mode, save) {
        if (mode === this._mode) { return; }
        if (save) {
            try {
                if (mode === null) {
                    sessionStorage.removeItem('mode');
                } else {
                    sessionStorage.setItem('mode', mode);
                }
            } catch (e) {
                // Browsers can throw a SecurityError when cookie blocking is enabled.
            }
        }
        this._mode = mode;
        this.trigger('modeChange', {mode});
    }

    async _getTemplates(options) {
        let templates = options.anki.fieldTemplates;
        if (typeof templates === 'string') { return templates; }

        templates = this._defaultAnkiFieldTemplates;
        if (typeof templates === 'string') { return templates; }

        return await this._getDefaultTemplatesPromise();
    }

    _getDefaultTemplatesPromise() {
        if (this._defaultAnkiFieldTemplatesPromise === null) {
            this._defaultAnkiFieldTemplatesPromise = this._getDefaultTemplates();
            this._defaultAnkiFieldTemplatesPromise.then(
                () => { this._defaultAnkiFieldTemplatesPromise = null; },
                () => {} // NOP
            );
        }
        return this._defaultAnkiFieldTemplatesPromise;
    }

    async _getDefaultTemplates() {
        const value = await api.getDefaultAnkiFieldTemplates();
        this._defaultAnkiFieldTemplates = value;
        return value;
    }

    async _renderTemplate(template, data, marker) {
        return await this._templateRenderer.render(template, data, marker);
    }

    async _addDefinition(definition, mode, context) {
        const options = this._options;
        const templates = await this._getTemplates(options);
        const note = await this._createNote(definition, mode, context, options, templates, true);
        return await api.addAnkiNote(note);
    }

    async _areDefinitionsAddable(definitions, modes, context) {
        const options = this._options;
        const templates = await this._getTemplates(options);

        const modeCount = modes.length;
        const {duplicateScope} = options.anki;
        const notePromises = [];
        for (const definition of definitions) {
            for (const mode of modes) {
                const notePromise = this._createNote(definition, mode, context, options, templates, false);
                notePromises.push(notePromise);
            }
        }
        const notes = await Promise.all(notePromises);

        const infos = await api.getAnkiNoteInfo(notes, duplicateScope);
        const results = [];
        for (let i = 0, ii = infos.length; i < ii; i += modeCount) {
            results.push(infos.slice(i, i + modeCount));
        }
        return results;
    }

    _areDefinitionsAddableForcedValue(definitions, modes, canAdd) {
        const results = [];
        const definitionCount = definitions.length;
        const modeCount = modes.length;
        for (let i = 0; i < definitionCount; ++i) {
            const modeArray = [];
            for (let j = 0; j < modeCount; ++j) {
                modeArray.push({canAdd, noteIds: null});
            }
            results.push(modeArray);
        }
        return results;
    }

    async _createNote(definition, mode, context, options, templates, injectMedia) {
        const {
            general: {resultOutputMode, compactGlossaries, compactTags},
            anki: {tags, checkForDuplicates, duplicateScope, kanji, terms, screenshot: {format, quality}},
            audio: {sources, customSourceUrl}
        } = options;
        const modeOptions = (mode === 'kanji') ? kanji : terms;

        if (injectMedia) {
            const timestamp = Date.now();
            const ownerFrameId = this._ownerFrameId;
            const {fields} = modeOptions;
            const {expression, reading} = this._getDefinitionPrimaryExpressionAndReading(definition);
            const audioDetails = (mode !== 'kanji' && this._ankiNoteBuilder.containsMarker(fields, 'audio') ? {sources, customSourceUrl} : null);
            const screenshotDetails = (this._ankiNoteBuilder.containsMarker(fields, 'screenshot') ? {ownerFrameId, format, quality} : null);
            const clipboardDetails = {
                image: this._ankiNoteBuilder.containsMarker(fields, 'clipboard-image'),
                text: this._ankiNoteBuilder.containsMarker(fields, 'clipboard-text')
            };
            const {screenshotFileName, clipboardImageFileName, clipboardText, audioFileName} = await api.injectAnkiNoteMedia(
                expression,
                reading,
                timestamp,
                audioDetails,
                screenshotDetails,
                clipboardDetails
            );
            if (screenshotFileName !== null) { definition.screenshotFileName = screenshotFileName; }
            if (clipboardImageFileName !== null) { definition.clipboardImageFileName = clipboardImageFileName; }
            if (audioFileName !== null) { definition.audioFileName = audioFileName; }
            if (clipboardText !== null) { definition.clipboardText = clipboardText; }
        }

        return await this._ankiNoteBuilder.createNote({
            definition,
            mode,
            context,
            templates,
            tags,
            checkForDuplicates,
            duplicateScope,
            resultOutputMode,
            compactGlossaries,
            compactTags,
            modeOptions
        });
    }

    async _getAudioInfo(source, expression, reading, details) {
        return await api.getDefinitionAudioInfo(source, expression, reading, details);
    }

    _getDefinitionPrimaryExpressionAndReading(definition) {
        const termDetailsList = definition.expressions;
        let bestIndex = -1;
        for (let i = 0, ii = termDetailsList.length; i < ii; ++i) {
            const {sourceTerm, expression, reading} = termDetailsList[i];
            if (expression === sourceTerm) {
                bestIndex = i;
                break;
            } else if (reading === sourceTerm && bestIndex < 0) {
                bestIndex = i;
            }
        }
        const {expression, reading} = termDetailsList[Math.max(0, bestIndex)];
        return {expression, reading};
    }

    _areSame(set, array) {
        if (set.size !== array.length) { return false; }
        for (const value of array) {
            if (!set.has(value)) {
                return false;
            }
        }
        return true;
    }

    async _setOptionsContextIfDifferent(optionsContext) {
        if (deepEqual(this._optionsContext, optionsContext)) { return; }
        await this.setOptionsContext(optionsContext);
    }

    _updateFocusedElement() {
        const target = this._contentScrollFocusElement;
        if (target === null) { return; }
        const {activeElement} = document;
        if (
            activeElement === null ||
            activeElement === document.documentElement ||
            activeElement === document.body
        ) {
            target.focus({preventScroll: true});
        }
    }
}
