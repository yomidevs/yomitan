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
 * AudioSystem
 * DOM
 * DisplayGenerator
 * DisplayHistory
 * Frontend
 * MediaLoader
 * PopupFactory
 * QueryParser
 * WindowScroll
 * api
 * docRangeFromPoint
 * docSentenceExtract
 * dynamicLoader
 */

class Display extends EventDispatcher {
    constructor(spinner, container) {
        super();
        this._spinner = spinner;
        this._container = container;
        this._definitions = [];
        this._optionsContext = {depth: 0, url: window.location.href};
        this._options = null;
        this._index = 0;
        this._audioPlaying = null;
        this._audioFallback = null;
        this._audioSystem = new AudioSystem({
            audioUriBuilder: {
                getUri: async (definition, source, details) => {
                    return await api.audioGetUri(definition, source, details);
                }
            },
            useCache: true
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
        this._windowScroll = new WindowScroll();
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
        this._queryParserVisible = false;
        this._queryParserVisibleOverride = null;
        this._queryParserContainer = document.querySelector('#query-parser-container');
        this._queryParser = new QueryParser({
            getOptionsContext: this.getOptionsContext.bind(this),
            setSpinnerVisible: this.setSpinnerVisible.bind(this)
        });
        this._mode = null;

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
        this._updateQueryParserVisibility();
    }

    get mode() {
        return this._mode;
    }

    async prepare() {
        this._updateMode();
        this._setInteractive(true);
        await this._displayGenerator.prepare();
        await this._queryParser.prepare();
        this._history.prepare();
        this._history.on('stateChanged', this._onStateChanged.bind(this));
        this._queryParser.on('searched', this._onQueryParserSearch.bind(this));
        yomichan.on('extensionUnloaded', this._onExtensionUnloaded.bind(this));
        chrome.runtime.onMessage.addListener(this._onMessage.bind(this));
        api.crossFrame.registerHandlers([
            ['popupMessage', {async: 'dynamic', handler: this._onDirectMessage.bind(this)}]
        ]);
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
        const key = DOM.getKeyFromEvent(e);
        const handlers = this._hotkeys.get(key);
        if (typeof handlers === 'undefined') { return false; }

        const eventModifiers = DOM.getActiveModifiers(e);
        for (const {modifiers, action} of handlers) {
            if (getSetDifference(modifiers, eventModifiers).size !== 0) { continue; }

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

    setOptionsContext(optionsContext) {
        this._optionsContext = optionsContext;
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
            scanLength: scanning.length,
            sentenceExtent: options.anki.sentenceExt,
            layoutAwareScan: scanning.layoutAwareScan,
            termSpacing: options.parsing.termSpacing,
            scanning: {
                deepContentScan: scanning.deepDomScan,
                selectText: scanning.selectText,
                modifier: scanning.modifier,
                useMiddleMouse: scanning.middleMouse,
                delay: scanning.delay,
                touchInputEnabled: scanning.touchInputEnabled
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

        const definition = this._definitions[0];
        const expressionIndex = this._getFirstExpressionIndex();
        const callback = () => {
            this._audioPlay(definition, expressionIndex, 0);
        };

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

    setSpinnerVisible(visible) {
        if (this._spinner !== null) {
            this._spinner.hidden = !visible;
        }
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

    async setupNestedPopups(frontendInitializationData) {
        await dynamicLoader.loadScripts([
            '/mixed/js/text-scanner.js',
            '/mixed/js/frame-client.js',
            '/fg/js/popup.js',
            '/fg/js/popup-proxy.js',
            '/fg/js/popup-factory.js',
            '/fg/js/frame-offset-forwarder.js',
            '/fg/js/frontend.js'
        ]);

        const {frameId} = await api.frameInformationGet();

        const popupFactory = new PopupFactory(frameId);
        popupFactory.prepare();

        const frontend = new Frontend(frameId, popupFactory, frontendInitializationData);
        await frontend.prepare();
    }

    authenticateMessageData(data) {
        return data;
    }

    postProcessQuery(query) {
        return query;
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
            this._updateQueryParserVisibility();

            this._closePopups();
            this._setEventListenersActive(false);

            let asigned = false;
            const eventArgs = {type, urlSearchParams, token};
            this._historyHasChanged = true;
            this._contentType = type;
            this._mediaLoader.unloadAll();
            switch (type) {
                case 'terms':
                case 'kanji':
                    {
                        const isTerms = (type === 'terms');
                        asigned = await this._setContentTermsOrKanji(token, isTerms, urlSearchParams, eventArgs);
                    }
                    break;
                case 'unloaded':
                    {
                        const {content} = this._history;
                        eventArgs.content = content;
                        this.trigger('contentUpdating', eventArgs);
                        this._setContentExtensionUnloaded();
                        asigned = true;
                    }
                    break;
            }

            const stale = (this._setContentToken !== token);
            if (!stale) {
                if (!asigned) {
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

    _onQueryParserSearch({type, definitions, sentence, cause, textSource}) {
        const query = textSource.text();
        const details = {
            focus: false,
            history: cause !== 'mouse',
            params: this._createSearchParams(type, query, false),
            state: {
                sentence,
                url: window.location.href
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

    _onSourceTermView(e) {
        e.preventDefault();
        this._sourceTermView();
    }

    _onNextTermView(e) {
        e.preventDefault();
        this._nextTermView();
    }

    async _onKanjiLookup(e) {
        try {
            e.preventDefault();
            if (!this._historyHasState()) { return; }

            const link = e.target;
            const {state} = this._history;

            state.focusEntry = this._entryIndexFind(link);
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
                    url: state.url
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
        if (DOM.isMouseButtonPressed(e, 'primary')) {
            this._clickScanPrevent = false;
        }
    }

    _onGlossaryMouseMove() {
        this._clickScanPrevent = true;
    }

    _onGlossaryMouseUp(e) {
        if (!this._clickScanPrevent && DOM.isMouseButtonPressed(e, 'primary')) {
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
        const sentence = docSentenceExtract(textSource, sentenceExtent, layoutAwareScan);

        state.focusEntry = this._entryIndexFind(scannedElement);
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
                url: state.url
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
        const textSource = docRangeFromPoint(e.clientX, e.clientY, deepScan);
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
        const entry = link.closest('.entry');
        const index = this._entryIndexFind(entry);
        if (index < 0 || index >= this._definitions.length) { return; }

        const expressionIndex = this._indexOf(entry.querySelectorAll('.term-expression .action-play-audio'), link);
        this._audioPlay(
            this._definitions[index],
            // expressionIndex is used in audioPlay to detect result output mode
            Math.max(expressionIndex, this._options.general.resultOutputMode === 'merge' ? 0 : -1),
            index
        );
    }

    _onNoteAdd(e) {
        e.preventDefault();
        const link = e.currentTarget;
        const index = this._entryIndexFind(link);
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

    _updateDocumentOptions(options) {
        const data = document.documentElement.dataset;
        data.ankiEnabled = `${options.anki.enable}`;
        data.audioEnabled = `${options.audio.enabled}`;
        data.compactGlossaries = `${options.general.compactGlossaries}`;
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
            const actionPrevious = document.querySelector('.action-previous');
            const actionNext = document.querySelector('.action-next');

            this._persistentEventListeners.addEventListener(document, 'keydown', this.onKeyDown.bind(this), false);
            this._persistentEventListeners.addEventListener(document, 'wheel', this._onWheel.bind(this), {passive: false});
            if (actionPrevious !== null) {
                this._persistentEventListeners.addEventListener(actionPrevious, 'click', this._onSourceTermView.bind(this));
            }
            if (actionNext !== null) {
                this._persistentEventListeners.addEventListener(actionNext, 'click', this._onNextTermView.bind(this));
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
            if (this._options !== null && this._options.scanning.enablePopupSearch) {
                this.addMultipleEventListeners('.term-glossary-item, .tag', 'mouseup', this._onGlossaryMouseUp.bind(this));
                this.addMultipleEventListeners('.term-glossary-item, .tag', 'mousedown', this._onGlossaryMouseDown.bind(this));
                this.addMultipleEventListeners('.term-glossary-item, .tag', 'mousemove', this._onGlossaryMouseMove.bind(this));
            }
        } else {
            this._eventListeners.removeAllEventListeners();
        }
    }

    async _findDefinitions(isTerms, source, urlSearchParams) {
        const optionsContext = this.getOptionsContext();
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
        if (!source) { return false; }

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

        source = this.postProcessQuery(source);
        let full = urlSearchParams.get('full');
        full = (full === null ? source : this.postProcessQuery(full));
        this._setQueryParserText(full);
        this._setTitleText(source);

        let {definitions} = content;
        if (!Array.isArray(definitions)) {
            definitions = await this._findDefinitions(isTerms, source, urlSearchParams);
            if (this._setContentToken !== token) { return true; }
            content.definitions = definitions;
            changeHistory = true;
        }

        if (changeHistory) {
            this._historyStateUpdate(state, content);
        }

        eventArgs.source = source;
        eventArgs.content = content;
        this.trigger('contentUpdating', eventArgs);

        let {sentence=null, url=null, focusEntry=null, scrollX=null, scrollY=null} = state;
        if (typeof url !== 'string') { url = window.location.href; }
        sentence = this._getValidSentenceData(sentence);

        this._definitions = definitions;

        for (const definition of definitions) {
            definition.cloze = this._clozeBuild(sentence, isTerms ? definition.source : definition.character);
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
            container.appendChild(entry);
        }

        if (typeof focusEntry === 'number') {
            this._focusEntry(focusEntry, false);
        }
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

        this._setContentTermsOrKanjiUpdateAdderButtons(token, isTerms, definitions);

        return true;
    }

    async _setContentTermsOrKanjiUpdateAdderButtons(token, isTerms, definitions) {
        const modes = isTerms ? ['term-kanji', 'term-kana'] : ['kanji'];
        const states = await this._getDefinitionsAddable(definitions, modes);
        if (this._setContentToken !== token) { return; }

        this._updateAdderButtons(states);
    }

    _setContentExtensionUnloaded() {
        const errorExtensionUnloaded = document.querySelector('#error-extension-unloaded');

        if (this._container !== null) {
            this._container.hidden = true;
        }

        if (errorExtensionUnloaded !== null) {
            errorExtensionUnloaded.hidden = false;
        }

        this._updateNavigation(null, null);
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

    _setQueryParserText(text) {
        if (this._fullQuery === text) { return; }
        this._fullQuery = text;
        if (!this._isQueryParserVisible()) { return; }
        this._queryParser.setText(text);
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
        if (this._navigationHeader === null) { return; }
        this._navigationHeader.hidden = !(previous || next);
        this._navigationHeader.dataset.hasPrevious = `${!!previous}`;
        this._navigationHeader.dataset.hasNext = `${!!next}`;
    }

    _updateAdderButtons(states) {
        for (let i = 0; i < states.length; ++i) {
            let noteId = null;
            for (const [mode, info] of Object.entries(states[i])) {
                const button = this._adderButtonFind(i, mode);
                if (button === null) {
                    continue;
                }

                if (!info.canAdd && noteId === null && info.noteId) {
                    noteId = info.noteId;
                }
                button.classList.toggle('disabled', !info.canAdd);
                button.classList.remove('pending');
            }
            if (noteId !== null) {
                this._viewerButtonShow(i, noteId);
            }
        }
    }

    _entrySetCurrent(index) {
        index = Math.min(index, this._definitions.length - 1);
        index = Math.max(index, 0);

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
        try {
            this.setSpinnerVisible(true);

            const details = {};
            if (this._noteUsesScreenshot(mode)) {
                const screenshot = await this._getScreenshot();
                if (screenshot) {
                    details.screenshot = screenshot;
                }
            }

            const noteContext = await this._getNoteContext();
            const noteId = await api.definitionAdd(definition, mode, noteContext, details, this.getOptionsContext());
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
            this.setSpinnerVisible(false);
        }
    }

    async _audioPlay(definition, expressionIndex, entryIndex) {
        try {
            this.setSpinnerVisible(true);

            const expression = expressionIndex === -1 ? definition : definition.expressions[expressionIndex];

            this._stopPlayingAudio();

            let audio, info;
            try {
                const {sources, textToSpeechVoice, customSourceUrl} = this._options.audio;
                let index;
                ({audio, index} = await this._audioSystem.getDefinitionAudio(expression, sources, {textToSpeechVoice, customSourceUrl}));
                info = `From source ${1 + index}: ${sources[index]}`;
            } catch (e) {
                if (this._audioFallback === null) {
                    this._audioFallback = new Audio('/mixed/mp3/button.mp3');
                }
                audio = this._audioFallback;
                info = 'Could not find audio';
            }

            const button = this._audioButtonFindImage(entryIndex, expressionIndex);
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
            this.setSpinnerVisible(false);
        }
    }

    _stopPlayingAudio() {
        if (this._audioPlaying !== null) {
            this._audioPlaying.pause();
            this._audioPlaying = null;
        }
    }

    _noteUsesScreenshot(mode) {
        const optionsAnki = this._options.anki;
        const fields = (mode === 'kanji' ? optionsAnki.kanji : optionsAnki.terms).fields;
        for (const fieldValue of Object.values(fields)) {
            if (fieldValue.includes('{screenshot}')) {
                return true;
            }
        }
        return false;
    }

    async _getScreenshot() {
        try {
            await this._setPopupVisibleOverride(false);
            await promiseTimeout(1); // Wait for popup to be hidden.

            const {format, quality} = this._options.anki.screenshot;
            const dataUrl = await api.screenshotGet({format, quality});
            if (!dataUrl || dataUrl.error) { return; }

            return {dataUrl, format};
        } finally {
            await this._setPopupVisibleOverride(null);
        }
    }

    _getFirstExpressionIndex() {
        return this._options.general.resultOutputMode === 'merge' ? 0 : -1;
    }

    _setPopupVisibleOverride(visible) {
        return api.broadcastTab('popupSetVisibleOverride', {visible});
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

    _entryIndexFind(element) {
        const entry = element.closest('.entry');
        return entry !== null ? this._indexOf(this._container.querySelectorAll('.entry'), entry) : -1;
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

    async _getDefinitionsAddable(definitions, modes) {
        try {
            const noteContext = await this._getNoteContext();
            return await api.definitionsAddable(definitions, modes, noteContext, this.getOptionsContext());
        } catch (e) {
            return [];
        }
    }

    _indexOf(nodeList, node) {
        for (let i = 0, ii = nodeList.length; i < ii; ++i) {
            if (nodeList[i] === node) {
                return i;
            }
        }
        return -1;
    }

    _getElementTop(element) {
        const elementRect = element.getBoundingClientRect();
        const documentRect = document.documentElement.getBoundingClientRect();
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

    _playAudioCurrent() {
        const index = this._index;
        if (index < 0 || index >= this._definitions.length) { return; }

        const entry = this._getEntry(index);
        if (entry !== null && entry.dataset.type === 'term') {
            this._audioPlay(this._definitions[index], this._getFirstExpressionIndex(), index);
        }
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

    _updateQueryParserVisibility() {
        this._queryParserContainer.hidden = !this._isQueryParserVisible();
    }

    _closePopups() {
        yomichan.trigger('closePopups');
    }

    _updateMode() {
        const mode = sessionStorage.getItem('mode');
        this._setMode(mode, false);
    }

    _setMode(mode, save) {
        if (mode === this._mode) { return; }
        if (save) {
            if (mode === null) {
                sessionStorage.removeItem('mode');
            } else {
                sessionStorage.setItem('mode', mode);
            }
        }
        this._mode = mode;
        this.trigger('modeChange', {mode});
    }
}
