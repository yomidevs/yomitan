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
 * AnkiConnect
 * AudioSystem
 * AudioUriBuilder
 * ClipboardMonitor
 * DictionaryDatabase
 * Environment
 * JsonSchemaValidator
 * Mecab
 * ObjectPropertyAccessor
 * OptionsUtil
 * ProfileConditions
 * RequestBuilder
 * Translator
 * jp
 */

class Backend {
    constructor() {
        this._environment = new Environment();
        this._dictionaryDatabase = new DictionaryDatabase();
        this._translator = new Translator(this._dictionaryDatabase);
        this._anki = new AnkiConnect();
        this._mecab = new Mecab();
        this._clipboardMonitor = new ClipboardMonitor({getClipboard: this._onApiClipboardGet.bind(this)});
        this._options = null;
        this._profileConditionsSchemaValidator = new JsonSchemaValidator();
        this._profileConditionsSchemaCache = [];
        this._profileConditionsUtil = new ProfileConditions();
        this._defaultAnkiFieldTemplates = null;
        this._requestBuilder = new RequestBuilder();
        this._audioUriBuilder = new AudioUriBuilder({
            requestBuilder: this._requestBuilder
        });
        this._audioSystem = new AudioSystem({
            audioUriBuilder: this._audioUriBuilder,
            requestBuilder: this._requestBuilder,
            useCache: false
        });
        this._optionsUtil = new OptionsUtil();

        this._clipboardPasteTarget = null;
        this._clipboardPasteTargetInitialized = false;
        this._clipboardImagePasteTarget = null;
        this._clipboardImagePasteTargetInitialized = false;

        this._searchPopupTabId = null;
        this._searchPopupTabCreatePromise = null;

        this._isPrepared = false;
        this._prepareError = false;
        this._preparePromise = null;
        const {promise, resolve, reject} = deferPromise();
        this._prepareCompletePromise = promise;
        this._prepareCompleteResolve = resolve;
        this._prepareCompleteReject = reject;

        this._defaultBrowserActionTitle = null;
        this._badgePrepareDelayTimer = null;
        this._logErrorLevel = null;

        this._messageHandlers = new Map([
            ['requestBackendReadySignal',    {async: false, contentScript: true,  handler: this._onApiRequestBackendReadySignal.bind(this)}],
            ['optionsGet',                   {async: false, contentScript: true,  handler: this._onApiOptionsGet.bind(this)}],
            ['optionsGetFull',               {async: false, contentScript: true,  handler: this._onApiOptionsGetFull.bind(this)}],
            ['kanjiFind',                    {async: true,  contentScript: true,  handler: this._onApiKanjiFind.bind(this)}],
            ['termsFind',                    {async: true,  contentScript: true,  handler: this._onApiTermsFind.bind(this)}],
            ['textParse',                    {async: true,  contentScript: true,  handler: this._onApiTextParse.bind(this)}],
            ['addAnkiNote',                  {async: true,  contentScript: true,  handler: this._onApiAddAnkiNote.bind(this)}],
            ['getAnkiNoteInfo',              {async: true,  contentScript: true,  handler: this._onApiGetAnkiNoteInfo.bind(this)}],
            ['injectAnkiNoteMedia',          {async: true,  contentScript: true,  handler: this._onApiInjectAnkiNoteMedia.bind(this)}],
            ['noteView',                     {async: true,  contentScript: true,  handler: this._onApiNoteView.bind(this)}],
            ['commandExec',                  {async: false, contentScript: true,  handler: this._onApiCommandExec.bind(this)}],
            ['audioGetUri',                  {async: true,  contentScript: true,  handler: this._onApiAudioGetUri.bind(this)}],
            ['screenshotGet',                {async: true,  contentScript: true,  handler: this._onApiScreenshotGet.bind(this)}],
            ['sendMessageToFrame',           {async: false, contentScript: true,  handler: this._onApiSendMessageToFrame.bind(this)}],
            ['broadcastTab',                 {async: false, contentScript: true,  handler: this._onApiBroadcastTab.bind(this)}],
            ['frameInformationGet',          {async: true,  contentScript: true,  handler: this._onApiFrameInformationGet.bind(this)}],
            ['injectStylesheet',             {async: true,  contentScript: true,  handler: this._onApiInjectStylesheet.bind(this)}],
            ['getStylesheetContent',         {async: true,  contentScript: true,  handler: this._onApiGetStylesheetContent.bind(this)}],
            ['getEnvironmentInfo',           {async: false, contentScript: true,  handler: this._onApiGetEnvironmentInfo.bind(this)}],
            ['clipboardGet',                 {async: true,  contentScript: true,  handler: this._onApiClipboardGet.bind(this)}],
            ['clipboardGetImage',            {async: true,  contentScript: true,  handler: this._onApiClipboardImageGet.bind(this)}],
            ['getDisplayTemplatesHtml',      {async: true,  contentScript: true,  handler: this._onApiGetDisplayTemplatesHtml.bind(this)}],
            ['getQueryParserTemplatesHtml',  {async: true,  contentScript: true,  handler: this._onApiGetQueryParserTemplatesHtml.bind(this)}],
            ['getZoom',                      {async: true,  contentScript: true,  handler: this._onApiGetZoom.bind(this)}],
            ['getDefaultAnkiFieldTemplates', {async: false, contentScript: true,  handler: this._onApiGetDefaultAnkiFieldTemplates.bind(this)}],
            ['getDictionaryInfo',            {async: true,  contentScript: false, handler: this._onApiGetDictionaryInfo.bind(this)}],
            ['getDictionaryCounts',          {async: true,  contentScript: false, handler: this._onApiGetDictionaryCounts.bind(this)}],
            ['purgeDatabase',                {async: true,  contentScript: false, handler: this._onApiPurgeDatabase.bind(this)}],
            ['getMedia',                     {async: true,  contentScript: true,  handler: this._onApiGetMedia.bind(this)}],
            ['log',                          {async: false, contentScript: true,  handler: this._onApiLog.bind(this)}],
            ['logIndicatorClear',            {async: false, contentScript: true,  handler: this._onApiLogIndicatorClear.bind(this)}],
            ['createActionPort',             {async: false, contentScript: true,  handler: this._onApiCreateActionPort.bind(this)}],
            ['modifySettings',               {async: true,  contentScript: true,  handler: this._onApiModifySettings.bind(this)}],
            ['getSettings',                  {async: false, contentScript: true,  handler: this._onApiGetSettings.bind(this)}],
            ['setAllSettings',               {async: true,  contentScript: false, handler: this._onApiSetAllSettings.bind(this)}],
            ['getOrCreateSearchPopup',       {async: true,  contentScript: true,  handler: this._onApiGetOrCreateSearchPopup.bind(this)}],
            ['isTabSearchPopup',             {async: true,  contentScript: true,  handler: this._onApiIsTabSearchPopup.bind(this)}],
            ['getDefinitionAudio',           {async: true,  contentScript: true,  handler: this._onApiGetDefinitionAudio.bind(this)}],
            ['triggerDatabaseUpdated',       {async: false, contentScript: true,  handler: this._onApiTriggerDatabaseUpdated.bind(this)}]
        ]);
        this._messageHandlersWithProgress = new Map([
            ['deleteDictionary',        {async: true,  contentScript: false, handler: this._onApiDeleteDictionary.bind(this)}]
        ]);

        this._commandHandlers = new Map([
            ['search',  this._onCommandSearch.bind(this)],
            ['help',    this._onCommandHelp.bind(this)],
            ['options', this._onCommandOptions.bind(this)],
            ['toggle',  this._onCommandToggle.bind(this)]
        ]);
    }

    prepare() {
        if (this._preparePromise === null) {
            const promise = this._prepareInternal();
            promise.then(
                (value) => {
                    this._isPrepared = true;
                    this._prepareCompleteResolve(value);
                },
                (error) => {
                    this._prepareError = true;
                    this._prepareCompleteReject(error);
                }
            );
            promise.finally(() => this._updateBadge());
            this._preparePromise = promise;
        }
        return this._prepareCompletePromise;
    }

    _prepareInternalSync() {
        if (isObject(chrome.commands) && isObject(chrome.commands.onCommand)) {
            const onCommand = this._onWebExtensionEventWrapper(this._onCommand.bind(this));
            chrome.commands.onCommand.addListener(onCommand);
        }

        if (isObject(chrome.tabs) && isObject(chrome.tabs.onZoomChange)) {
            const onZoomChange = this._onWebExtensionEventWrapper(this._onZoomChange.bind(this));
            chrome.tabs.onZoomChange.addListener(onZoomChange);
        }

        const onConnect = this._onWebExtensionEventWrapper(this._onConnect.bind(this));
        chrome.runtime.onConnect.addListener(onConnect);

        const onMessage = this._onMessageWrapper.bind(this);
        chrome.runtime.onMessage.addListener(onMessage);
    }

    async _prepareInternal() {
        try {
            this._prepareInternalSync();

            this._defaultBrowserActionTitle = await this._getBrowserIconTitle();
            this._badgePrepareDelayTimer = setTimeout(() => {
                this._badgePrepareDelayTimer = null;
                this._updateBadge();
            }, 1000);
            this._updateBadge();

            yomichan.on('log', this._onLog.bind(this));

            await this._environment.prepare();
            try {
                await this._dictionaryDatabase.prepare();
            } catch (e) {
                yomichan.logError(e);
            }
            await this._translator.prepare();

            await this._optionsUtil.prepare();
            this._defaultAnkiFieldTemplates = (await this._fetchAsset('/bg/data/default-anki-field-templates.handlebars')).trim();
            this._options = await this._optionsUtil.load();

            this._applyOptions('background');

            const options = this.getOptions({current: true});
            if (options.general.showGuide) {
                chrome.tabs.create({url: chrome.runtime.getURL('/bg/guide.html')});
            }

            this._clipboardMonitor.on('change', this._onClipboardTextChange.bind(this));

            this._sendMessageAllTabs('backendReady');
            const callback = () => this._checkLastError(chrome.runtime.lastError);
            chrome.runtime.sendMessage({action: 'backendReady'}, callback);
        } catch (e) {
            yomichan.logError(e);
            throw e;
        } finally {
            if (this._badgePrepareDelayTimer !== null) {
                clearTimeout(this._badgePrepareDelayTimer);
                this._badgePrepareDelayTimer = null;
            }
        }
    }

    isPrepared() {
        return this._isPrepared;
    }

    getFullOptions(useSchema=false) {
        const options = this._options;
        return useSchema ? this._optionsUtil.createValidatingProxy(options) : options;
    }

    getOptions(optionsContext, useSchema=false) {
        return this._getProfile(optionsContext, useSchema).options;
    }

    // Event handlers

    async _onClipboardTextChange({text}) {
        try {
            const {tab, created} = await this._getOrCreateSearchPopup();
            await this._focusTab(tab);
            await this._updateSearchQuery(tab.id, text, !created);
        } catch (e) {
            // NOP
        }
    }

    _onLog({level}) {
        const levelValue = this._getErrorLevelValue(level);
        if (levelValue <= this._getErrorLevelValue(this._logErrorLevel)) { return; }

        this._logErrorLevel = level;
        this._updateBadge();
    }

    // WebExtension event handlers (with prepared checks)

    _onWebExtensionEventWrapper(handler) {
        return (...args) => {
            if (this._isPrepared) {
                handler(...args);
                return;
            }

            this._prepareCompletePromise.then(
                () => { handler(...args); },
                () => {} // NOP
            );
        };
    }

    _onMessageWrapper(message, sender, sendResponse) {
        if (this._isPrepared) {
            return this._onMessage(message, sender, sendResponse);
        }

        this._prepareCompletePromise.then(
            () => { this._onMessage(message, sender, sendResponse); },
            () => { sendResponse(); }
        );
        return true;
    }

    // WebExtension event handlers

    _onCommand(command) {
        this._runCommand(command);
    }

    _onMessage({action, params}, sender, callback) {
        const messageHandler = this._messageHandlers.get(action);
        if (typeof messageHandler === 'undefined') { return false; }

        if (!messageHandler.contentScript) {
            try {
                this._validatePrivilegedMessageSender(sender);
            } catch (error) {
                callback({error: errorToJson(error)});
                return false;
            }
        }

        return yomichan.invokeMessageHandler(messageHandler, params, callback, sender);
    }

    _onConnect(port) {
        try {
            let details;
            try {
                details = JSON.parse(port.name);
            } catch (e) {
                return;
            }
            if (details.name !== 'background-cross-frame-communication-port') { return; }

            const tabId = (port.sender && port.sender.tab ? port.sender.tab.id : null);
            if (typeof tabId !== 'number') {
                throw new Error('Port does not have an associated tab ID');
            }
            const senderFrameId = port.sender.frameId;
            if (typeof senderFrameId !== 'number') {
                throw new Error('Port does not have an associated frame ID');
            }
            let {targetTabId, targetFrameId} = details;
            if (typeof targetTabId !== 'number') {
                targetTabId = tabId;
            }

            const details2 = {
                name: 'cross-frame-communication-port',
                sourceFrameId: senderFrameId
            };
            let forwardPort = chrome.tabs.connect(targetTabId, {frameId: targetFrameId, name: JSON.stringify(details2)});

            const cleanup = () => {
                this._checkLastError(chrome.runtime.lastError);
                if (forwardPort !== null) {
                    forwardPort.disconnect();
                    forwardPort = null;
                }
                if (port !== null) {
                    port.disconnect();
                    port = null;
                }
            };

            port.onMessage.addListener((message) => { forwardPort.postMessage(message); });
            forwardPort.onMessage.addListener((message) => { port.postMessage(message); });
            port.onDisconnect.addListener(cleanup);
            forwardPort.onDisconnect.addListener(cleanup);
        } catch (e) {
            port.disconnect();
            yomichan.logError(e);
        }
    }

    _onZoomChange({tabId, oldZoomFactor, newZoomFactor}) {
        const callback = () => this._checkLastError(chrome.runtime.lastError);
        chrome.tabs.sendMessage(tabId, {action: 'zoomChanged', params: {oldZoomFactor, newZoomFactor}}, callback);
    }

    // Message handlers

    _onApiRequestBackendReadySignal(_params, sender) {
        // tab ID isn't set in background (e.g. browser_action)
        const callback = () => this._checkLastError(chrome.runtime.lastError);
        const data = {action: 'backendReady'};
        if (typeof sender.tab === 'undefined') {
            chrome.runtime.sendMessage(data, callback);
            return false;
        } else {
            chrome.tabs.sendMessage(sender.tab.id, data, callback);
            return true;
        }
    }

    _onApiOptionsGet({optionsContext}) {
        return this.getOptions(optionsContext);
    }

    _onApiOptionsGetFull() {
        return this.getFullOptions();
    }

    async _onApiKanjiFind({text, optionsContext}) {
        const options = this.getOptions(optionsContext);
        const definitions = await this._translator.findKanji(text, options);
        definitions.splice(options.general.maxResults);
        return definitions;
    }

    async _onApiTermsFind({text, details, optionsContext}) {
        const options = this.getOptions(optionsContext);
        const mode = options.general.resultOutputMode;
        const [definitions, length] = await this._translator.findTerms(mode, text, details, options);
        definitions.splice(options.general.maxResults);
        return {length, definitions};
    }

    async _onApiTextParse({text, optionsContext}) {
        const options = this.getOptions(optionsContext);
        const results = [];

        if (options.parsing.enableScanningParser) {
            results.push({
                source: 'scanning-parser',
                id: 'scan',
                content: await this._textParseScanning(text, options)
            });
        }

        if (options.parsing.enableMecabParser) {
            const mecabResults = await this._textParseMecab(text, options);
            for (const [mecabDictName, mecabDictResults] of mecabResults) {
                results.push({
                    source: 'mecab',
                    dictionary: mecabDictName,
                    id: `mecab-${mecabDictName}`,
                    content: mecabDictResults
                });
            }
        }

        return results;
    }

    async _onApiAddAnkiNote({note}) {
        return await this._anki.addNote(note);
    }

    async _onApiGetAnkiNoteInfo({notes, duplicateScope}) {
        const results = [];
        const cannotAdd = [];
        const canAddArray = await this._anki.canAddNotes(notes);

        for (let i = 0; i < notes.length; ++i) {
            const note = notes[i];
            const canAdd = canAddArray[i];
            const info = {canAdd, noteIds: null};
            results.push(info);
            if (!canAdd) {
                cannotAdd.push({note, info});
            }
        }

        if (cannotAdd.length > 0) {
            const cannotAddNotes = cannotAdd.map(({note}) => note);
            const noteIdsArray = await this._anki.findNoteIds(cannotAddNotes, duplicateScope);
            for (let i = 0, ii = Math.min(cannotAdd.length, noteIdsArray.length); i < ii; ++i) {
                const noteIds = noteIdsArray[i];
                if (noteIds.length > 0) {
                    cannotAdd[i].info.noteIds = noteIds;
                }
            }
        }

        return results;
    }

    async _onApiInjectAnkiNoteMedia({expression, reading, timestamp, audioDetails, screenshotDetails, clipboardImage}, sender) {
        if (isObject(screenshotDetails)) {
            const {id: tabId, windowId} = (sender && sender.tab ? sender.tab : {});
            screenshotDetails = Object.assign({}, screenshotDetails, {tabId, windowId});
        }
        return await this._injectAnkNoteMedia(
            this._anki,
            expression,
            reading,
            timestamp,
            audioDetails,
            screenshotDetails,
            clipboardImage
        );
    }

    async _onApiNoteView({noteId}) {
        return await this._anki.guiBrowseNote(noteId);
    }

    _onApiCommandExec({command, params}) {
        return this._runCommand(command, params);
    }

    async _onApiAudioGetUri({source, expression, reading, details}) {
        return await this._audioUriBuilder.getUri(source, expression, reading, details);
    }

    _onApiScreenshotGet({options}, sender) {
        if (!(sender && sender.tab)) {
            return Promise.resolve();
        }

        const windowId = sender.tab.windowId;
        return new Promise((resolve, reject) => {
            chrome.tabs.captureVisibleTab(windowId, options, (dataUrl) => {
                const e = chrome.runtime.lastError;
                if (e) {
                    reject(new Error(e.message));
                } else {
                    resolve(dataUrl);
                }
            });
        });
    }

    _onApiSendMessageToFrame({frameId: targetFrameId, action, params}, sender) {
        if (!(sender && sender.tab)) {
            return false;
        }

        const tabId = sender.tab.id;
        const frameId = sender.frameId;
        const callback = () => this._checkLastError(chrome.runtime.lastError);
        chrome.tabs.sendMessage(tabId, {action, params, frameId}, {frameId: targetFrameId}, callback);
        return true;
    }

    _onApiBroadcastTab({action, params}, sender) {
        if (!(sender && sender.tab)) {
            return false;
        }

        const tabId = sender.tab.id;
        const frameId = sender.frameId;
        const callback = () => this._checkLastError(chrome.runtime.lastError);
        chrome.tabs.sendMessage(tabId, {action, params, frameId}, callback);
        return true;
    }

    _onApiFrameInformationGet(params, sender) {
        const frameId = sender.frameId;
        return Promise.resolve({frameId});
    }

    _onApiInjectStylesheet({type, value}, sender) {
        if (!sender.tab) {
            return Promise.reject(new Error('Invalid tab'));
        }

        const tabId = sender.tab.id;
        const frameId = sender.frameId;
        const details = (
            type === 'file' ?
            {
                file: value,
                runAt: 'document_start',
                cssOrigin: 'author',
                allFrames: false,
                matchAboutBlank: true
            } :
            {
                code: value,
                runAt: 'document_start',
                cssOrigin: 'user',
                allFrames: false,
                matchAboutBlank: true
            }
        );
        if (typeof frameId === 'number') {
            details.frameId = frameId;
        }

        return new Promise((resolve, reject) => {
            chrome.tabs.insertCSS(tabId, details, () => {
                const e = chrome.runtime.lastError;
                if (e) {
                    reject(new Error(e.message));
                } else {
                    resolve();
                }
            });
        });
    }

    async _onApiGetStylesheetContent({url}) {
        if (!url.startsWith('/') || url.startsWith('//') || !url.endsWith('.css')) {
            throw new Error('Invalid URL');
        }
        return await this._fetchAsset(url);
    }

    _onApiGetEnvironmentInfo() {
        return this._environment.getInfo();
    }

    async _onApiClipboardGet() {
        /*
        Notes:
            document.execCommand('paste') doesn't work on Firefox.
            This may be a bug: https://bugzilla.mozilla.org/show_bug.cgi?id=1603985
            Therefore, navigator.clipboard.readText() is used on Firefox.

            navigator.clipboard.readText() can't be used in Chrome for two reasons:
            * Requires page to be focused, else it rejects with an exception.
            * When the page is focused, Chrome will request clipboard permission, despite already
              being an extension with clipboard permissions. It effectively asks for the
              non-extension permission for clipboard access.
        */
        const {browser} = this._environment.getInfo();
        if (browser === 'firefox' || browser === 'firefox-mobile') {
            return await navigator.clipboard.readText();
        }

        if (!this._environmentHasDocument()) {
            throw new Error('Reading the clipboard is not supported in this context');
        }

        if (!this._clipboardPasteTargetInitialized) {
            this._clipboardPasteTarget = document.querySelector('#clipboard-paste-target');
            this._clipboardPasteTargetInitialized = true;
        }

        const target = this._clipboardPasteTarget;
        if (target === null) {
            throw new Error('Clipboard paste target does not exist');
        }

        target.value = '';
        target.focus();
        this._executePasteCommand();
        const result = target.value;
        target.value = '';
        return result;
    }

    async _onApiClipboardImageGet() {
        // See browser-specific notes in _onApiClipboardGet
        const {browser} = this._environment.getInfo();
        if (browser === 'firefox' || browser === 'firefox-mobile') {
            if (typeof navigator.clipboard !== 'undefined' && typeof navigator.clipboard.read === 'function') {
                // This function is behind the flag: dom.events.asyncClipboard.dataTransfer
                const {files} = await navigator.clipboard.read();
                if (files.length === 0) { return null; }
                const result = await this._readFileAsDataURL(files[0]);
                return result;
            }
        }

        if (!this._environmentHasDocument()) {
            throw new Error('Reading the clipboard is not supported in this context');
        }

        if (!this._clipboardImagePasteTargetInitialized) {
            this._clipboardImagePasteTarget = document.querySelector('#clipboard-image-paste-target');
            this._clipboardImagePasteTargetInitialized = true;
        }

        const target = this._clipboardImagePasteTarget;
        if (target === null) {
            throw new Error('Clipboard paste target does not exist');
        }

        target.focus();
        this._executePasteCommand();
        const image = target.querySelector('img[src^="data:"]');
        const result = (image !== null ? image.getAttribute('src') : null);
        target.textContent = '';
        return result;
    }

    async _onApiGetDisplayTemplatesHtml() {
        return await this._fetchAsset('/mixed/display-templates.html');
    }

    async _onApiGetQueryParserTemplatesHtml() {
        return await this._fetchAsset('/bg/query-parser-templates.html');
    }

    _onApiGetZoom(params, sender) {
        if (!sender || !sender.tab) {
            return Promise.reject(new Error('Invalid tab'));
        }

        return new Promise((resolve, reject) => {
            const tabId = sender.tab.id;
            if (!(
                chrome.tabs !== null &&
                typeof chrome.tabs === 'object' &&
                typeof chrome.tabs.getZoom === 'function'
            )) {
                // Not supported
                resolve({zoomFactor: 1.0});
                return;
            }
            chrome.tabs.getZoom(tabId, (zoomFactor) => {
                const e = chrome.runtime.lastError;
                if (e) {
                    reject(new Error(e.message));
                } else {
                    resolve({zoomFactor});
                }
            });
        });
    }

    _onApiGetDefaultAnkiFieldTemplates() {
        return this._defaultAnkiFieldTemplates;
    }

    async _onApiGetDictionaryInfo() {
        return await this._dictionaryDatabase.getDictionaryInfo();
    }

    async _onApiGetDictionaryCounts({dictionaryNames, getTotal}) {
        return await this._dictionaryDatabase.getDictionaryCounts(dictionaryNames, getTotal);
    }

    async _onApiPurgeDatabase() {
        this._translator.clearDatabaseCaches();
        await this._dictionaryDatabase.purge();
        this._triggerDatabaseUpdated('dictionary', 'purge');
    }

    async _onApiGetMedia({targets}) {
        return await this._dictionaryDatabase.getMedia(targets);
    }

    _onApiLog({error, level, context}) {
        yomichan.log(jsonToError(error), level, context);
    }

    _onApiLogIndicatorClear() {
        if (this._logErrorLevel === null) { return; }
        this._logErrorLevel = null;
        this._updateBadge();
    }

    _onApiCreateActionPort(params, sender) {
        if (!sender || !sender.tab) { throw new Error('Invalid sender'); }
        const tabId = sender.tab.id;
        if (typeof tabId !== 'number') { throw new Error('Sender has invalid tab ID'); }

        const frameId = sender.frameId;
        const id = generateId(16);
        const details = {
            name: 'action-port',
            id
        };

        const port = chrome.tabs.connect(tabId, {name: JSON.stringify(details), frameId});
        try {
            this._createActionListenerPort(port, sender, this._messageHandlersWithProgress);
        } catch (e) {
            port.disconnect();
            throw e;
        }

        return details;
    }

    async _onApiDeleteDictionary({dictionaryName}, sender, onProgress) {
        this._translator.clearDatabaseCaches();
        await this._dictionaryDatabase.deleteDictionary(dictionaryName, {rate: 1000}, onProgress);
        this._triggerDatabaseUpdated('dictionary', 'delete');
    }

    async _onApiModifySettings({targets, source}) {
        const results = [];
        for (const target of targets) {
            try {
                const result = this._modifySetting(target);
                results.push({result: clone(result)});
            } catch (e) {
                results.push({error: errorToJson(e)});
            }
        }
        await this._saveOptions(source);
        return results;
    }

    _onApiGetSettings({targets}) {
        const results = [];
        for (const target of targets) {
            try {
                const result = this._getSetting(target);
                results.push({result: clone(result)});
            } catch (e) {
                results.push({error: errorToJson(e)});
            }
        }
        return results;
    }

    async _onApiSetAllSettings({value, source}) {
        this._optionsUtil.validate(value);
        this._options = clone(value);
        await this._saveOptions(source);
    }

    async _onApiGetOrCreateSearchPopup({focus=false, text=null}) {
        const {tab, created} = await this._getOrCreateSearchPopup();
        if (focus === true || (focus === 'ifCreated' && created)) {
            await this._focusTab(tab);
        }
        if (typeof text === 'string') {
            await this._updateSearchQuery(tab.id, text, !created);
        }
        return {tabId: tab.id, windowId: tab.windowId};
    }

    async _onApiIsTabSearchPopup({tabId}) {
        const baseUrl = chrome.runtime.getURL('/bg/search.html');
        const tab = typeof tabId === 'number' ? await this._checkTabUrl(tabId, (url) => url.startsWith(baseUrl)) : null;
        return (tab !== null);
    }

    async _onApiGetDefinitionAudio({sources, expression, reading, details}) {
        return this._getDefinitionAudio(sources, expression, reading, details);
    }

    _onApiTriggerDatabaseUpdated({type, cause}) {
        this._triggerDatabaseUpdated(type, cause);
    }

    // Command handlers

    async _onCommandSearch(params) {
        const {mode='existingOrNewTab', query} = params || {};

        const baseUrl = chrome.runtime.getURL('/bg/search.html');
        const queryParams = {};
        if (query && query.length > 0) { queryParams.query = query; }
        const queryString = new URLSearchParams(queryParams).toString();
        let url = baseUrl;
        if (queryString.length > 0) {
            url += `?${queryString}`;
        }

        const isTabMatch = (url2) => {
            if (url2 === null || !url2.startsWith(baseUrl)) { return false; }
            const {baseUrl: baseUrl2, queryParams: queryParams2} = parseUrl(url2);
            return baseUrl2 === baseUrl && (queryParams2.mode === mode || (!queryParams2.mode && mode === 'existingOrNewTab'));
        };

        const openInTab = async () => {
            const tab = await this._findTab(1000, isTabMatch);
            if (tab !== null) {
                await this._focusTab(tab);
                if (queryParams.query) {
                    await this._updateSearchQuery(tab.id, queryParams.query, true);
                }
                return true;
            }
        };

        switch (mode) {
            case 'existingOrNewTab':
                try {
                    if (await openInTab()) { return; }
                } catch (e) {
                    // NOP
                }
                chrome.tabs.create({url});
                return;
            case 'newTab':
                chrome.tabs.create({url});
                return;
        }
    }

    _onCommandHelp() {
        chrome.tabs.create({url: 'https://foosoft.net/projects/yomichan/'});
    }

    _onCommandOptions(params) {
        const {mode='existingOrNewTab'} = params || {};
        if (mode === 'existingOrNewTab') {
            chrome.runtime.openOptionsPage();
        } else if (mode === 'newTab') {
            const manifest = chrome.runtime.getManifest();
            const url = chrome.runtime.getURL(manifest.options_ui.page);
            chrome.tabs.create({url});
        }
    }

    async _onCommandToggle() {
        const source = 'popup';
        const options = this.getOptions({current: true});
        options.general.enable = !options.general.enable;
        await this._saveOptions(source);
    }

    // Utilities

    _getOrCreateSearchPopup() {
        if (this._searchPopupTabCreatePromise === null) {
            const promise = this._getOrCreateSearchPopup2();
            this._searchPopupTabCreatePromise = promise;
            promise.then(() => { this._searchPopupTabCreatePromise = null; });
        }
        return this._searchPopupTabCreatePromise;
    }

    async _getOrCreateSearchPopup2() {
        // Reuse same tab
        const baseUrl = chrome.runtime.getURL('/bg/search.html');
        if (this._searchPopupTabId !== null) {
            const tab = await this._checkTabUrl(this._searchPopupTabId, (url) => url.startsWith(baseUrl));
            if (tab !== null) {
                return {tab, created: false};
            }
            this._searchPopupTabId = null;
        }

        // chrome.windows not supported (e.g. on Firefox mobile)
        if (!isObject(chrome.windows)) {
            throw new Error('Window creation not supported');
        }

        // Create a new window
        const options = this.getOptions({current: true});
        const {popupWidth, popupHeight} = options.general;
        const popupWindow = await new Promise((resolve, reject) => {
            chrome.windows.create(
                {
                    url: baseUrl,
                    width: popupWidth,
                    height: popupHeight,
                    type: 'popup'
                },
                (result) => {
                    const error = chrome.runtime.lastError;
                    if (error) {
                        reject(new Error(error.message));
                    } else {
                        resolve(result);
                    }
                }
            );
        });

        const {tabs} = popupWindow;
        if (tabs.length === 0) {
            throw new Error('Created window did not contain a tab');
        }

        const tab = tabs[0];
        await this._waitUntilTabFrameIsReady(tab.id, 0, 2000);

        await this._sendMessageTab(
            tab.id,
            {action: 'setMode', params: {mode: 'popup'}},
            {frameId: 0}
        );

        this._searchPopupTabId = tab.id;
        return {tab, created: true};
    }

    _updateSearchQuery(tabId, text, animate) {
        return this._sendMessageTab(
            tabId,
            {action: 'updateSearchQuery', params: {text, animate}},
            {frameId: 0}
        );
    }

    _sendMessageAllTabs(action, params={}) {
        const callback = () => this._checkLastError(chrome.runtime.lastError);
        chrome.tabs.query({}, (tabs) => {
            for (const tab of tabs) {
                chrome.tabs.sendMessage(tab.id, {action, params}, callback);
            }
        });
    }

    _applyOptions(source) {
        const options = this.getOptions({current: true});
        this._updateBadge();

        this._anki.server = options.anki.server;
        this._anki.enabled = options.anki.enable;

        if (options.parsing.enableMecabParser) {
            this._mecab.startListener();
        } else {
            this._mecab.stopListener();
        }

        if (options.general.enableClipboardPopups) {
            this._clipboardMonitor.start();
        } else {
            this._clipboardMonitor.stop();
        }

        this._sendMessageAllTabs('optionsUpdated', {source});
    }

    _getProfile(optionsContext, useSchema=false) {
        const options = this.getFullOptions(useSchema);
        const profiles = options.profiles;
        if (optionsContext.current) {
            return profiles[options.profileCurrent];
        }
        if (typeof optionsContext.index === 'number') {
            return profiles[optionsContext.index];
        }
        const profile = this._getProfileFromContext(options, optionsContext);
        return profile !== null ? profile : profiles[options.profileCurrent];
    }

    _getProfileFromContext(options, optionsContext) {
        optionsContext = this._profileConditionsUtil.normalizeContext(optionsContext);

        let index = 0;
        for (const profile of options.profiles) {
            const conditionGroups = profile.conditionGroups;

            let schema;
            if (index < this._profileConditionsSchemaCache.length) {
                schema = this._profileConditionsSchemaCache[index];
            } else {
                schema = this._profileConditionsUtil.createSchema(conditionGroups);
                this._profileConditionsSchemaCache.push(schema);
            }

            if (conditionGroups.length > 0 && this._profileConditionsSchemaValidator.isValid(optionsContext, schema)) {
                return profile;
            }
            ++index;
        }

        return null;
    }

    _clearProfileConditionsSchemaCache() {
        this._profileConditionsSchemaCache = [];
        this._profileConditionsSchemaValidator.clearCache();
    }

    _checkLastError() {
        // NOP
    }

    _runCommand(command, params) {
        const handler = this._commandHandlers.get(command);
        if (typeof handler !== 'function') { return false; }

        handler(params);
        return true;
    }

    async _textParseScanning(text, options) {
        const results = [];
        while (text.length > 0) {
            const term = [];
            const [definitions, sourceLength] = await this._translator.findTerms(
                'simple',
                text.substring(0, options.scanning.length),
                {},
                options
            );
            if (definitions.length > 0 && sourceLength > 0) {
                const {expression, reading} = definitions[0];
                const source = text.substring(0, sourceLength);
                for (const {text: text2, furigana} of jp.distributeFuriganaInflected(expression, reading, source)) {
                    const reading2 = jp.convertReading(text2, furigana, options.parsing.readingMode);
                    term.push({text: text2, reading: reading2});
                }
                text = text.substring(source.length);
            } else {
                const reading = jp.convertReading(text[0], '', options.parsing.readingMode);
                term.push({text: text[0], reading});
                text = text.substring(1);
            }
            results.push(term);
        }
        return results;
    }

    async _textParseMecab(text, options) {
        const results = [];
        const rawResults = await this._mecab.parseText(text);
        for (const [mecabName, parsedLines] of Object.entries(rawResults)) {
            const result = [];
            for (const parsedLine of parsedLines) {
                for (const {expression, reading, source} of parsedLine) {
                    const term = [];
                    for (const {text: text2, furigana} of jp.distributeFuriganaInflected(
                        expression.length > 0 ? expression : source,
                        jp.convertKatakanaToHiragana(reading),
                        source
                    )) {
                        const reading2 = jp.convertReading(text2, furigana, options.parsing.readingMode);
                        term.push({text: text2, reading: reading2});
                    }
                    result.push(term);
                }
                result.push([{text: '\n', reading: ''}]);
            }
            results.push([mecabName, result]);
        }
        return results;
    }

    _createActionListenerPort(port, sender, handlers) {
        let hasStarted = false;
        let messageString = '';

        const onProgress = (...data) => {
            try {
                if (port === null) { return; }
                port.postMessage({type: 'progress', data});
            } catch (e) {
                // NOP
            }
        };

        const onMessage = (message) => {
            if (hasStarted) { return; }

            try {
                const {action, data} = message;
                switch (action) {
                    case 'fragment':
                        messageString += data;
                        break;
                    case 'invoke':
                        {
                            hasStarted = true;
                            port.onMessage.removeListener(onMessage);

                            const messageData = JSON.parse(messageString);
                            messageString = null;
                            onMessageComplete(messageData);
                        }
                        break;
                }
            } catch (e) {
                cleanup(e);
            }
        };

        const onMessageComplete = async (message) => {
            try {
                const {action, params} = message;
                port.postMessage({type: 'ack'});

                const messageHandler = handlers.get(action);
                if (typeof messageHandler === 'undefined') {
                    throw new Error('Invalid action');
                }
                const {handler, async, contentScript} = messageHandler;

                if (!contentScript) {
                    this._validatePrivilegedMessageSender(sender);
                }

                const promiseOrResult = handler(params, sender, onProgress);
                const result = async ? await promiseOrResult : promiseOrResult;
                port.postMessage({type: 'complete', data: result});
            } catch (e) {
                cleanup(e);
            }
        };

        const onDisconnect = () => {
            cleanup(null);
        };

        const cleanup = (error) => {
            if (port === null) { return; }
            if (error !== null) {
                port.postMessage({type: 'error', data: errorToJson(error)});
            }
            if (!hasStarted) {
                port.onMessage.removeListener(onMessage);
            }
            port.onDisconnect.removeListener(onDisconnect);
            port = null;
            handlers = null;
        };

        port.onMessage.addListener(onMessage);
        port.onDisconnect.addListener(onDisconnect);
    }

    _getErrorLevelValue(errorLevel) {
        switch (errorLevel) {
            case 'info': return 0;
            case 'debug': return 0;
            case 'warn': return 1;
            case 'error': return 2;
            default: return 0;
        }
    }

    _getModifySettingObject(target) {
        const scope = target.scope;
        switch (scope) {
            case 'profile':
                if (!isObject(target.optionsContext)) { throw new Error('Invalid optionsContext'); }
                return this.getOptions(target.optionsContext, true);
            case 'global':
                return this.getFullOptions(true);
            default:
                throw new Error(`Invalid scope: ${scope}`);
        }
    }

    _getSetting(target) {
        const options = this._getModifySettingObject(target);
        const accessor = new ObjectPropertyAccessor(options);
        const {path} = target;
        if (typeof path !== 'string') { throw new Error('Invalid path'); }
        return accessor.get(ObjectPropertyAccessor.getPathArray(path));
    }

    _modifySetting(target) {
        const options = this._getModifySettingObject(target);
        const accessor = new ObjectPropertyAccessor(options);
        const action = target.action;
        switch (action) {
            case 'set':
            {
                const {path, value} = target;
                if (typeof path !== 'string') { throw new Error('Invalid path'); }
                const pathArray = ObjectPropertyAccessor.getPathArray(path);
                accessor.set(pathArray, value);
                return accessor.get(pathArray);
            }
            case 'delete':
            {
                const {path} = target;
                if (typeof path !== 'string') { throw new Error('Invalid path'); }
                accessor.delete(ObjectPropertyAccessor.getPathArray(path));
                return true;
            }
            case 'swap':
            {
                const {path1, path2} = target;
                if (typeof path1 !== 'string') { throw new Error('Invalid path1'); }
                if (typeof path2 !== 'string') { throw new Error('Invalid path2'); }
                accessor.swap(ObjectPropertyAccessor.getPathArray(path1), ObjectPropertyAccessor.getPathArray(path2));
                return true;
            }
            case 'splice':
            {
                const {path, start, deleteCount, items} = target;
                if (typeof path !== 'string') { throw new Error('Invalid path'); }
                if (typeof start !== 'number' || Math.floor(start) !== start) { throw new Error('Invalid start'); }
                if (typeof deleteCount !== 'number' || Math.floor(deleteCount) !== deleteCount) { throw new Error('Invalid deleteCount'); }
                if (!Array.isArray(items)) { throw new Error('Invalid items'); }
                const array = accessor.get(ObjectPropertyAccessor.getPathArray(path));
                if (!Array.isArray(array)) { throw new Error('Invalid target type'); }
                return array.splice(start, deleteCount, ...items);
            }
            default:
                throw new Error(`Unknown action: ${action}`);
        }
    }

    _validatePrivilegedMessageSender(sender) {
        const url = sender.url;
        if (!(typeof url === 'string' && yomichan.isExtensionUrl(url))) {
            throw new Error('Invalid message sender');
        }
    }

    _getBrowserIconTitle() {
        return (
            isObject(chrome.browserAction) &&
            typeof chrome.browserAction.getTitle === 'function' ?
                new Promise((resolve) => chrome.browserAction.getTitle({}, resolve)) :
                Promise.resolve('')
        );
    }

    _updateBadge() {
        let title = this._defaultBrowserActionTitle;
        if (title === null || !isObject(chrome.browserAction)) {
            // Not ready or invalid
            return;
        }

        let text = '';
        let color = null;
        let status = null;

        if (this._logErrorLevel !== null) {
            switch (this._logErrorLevel) {
                case 'error':
                    text = '!!';
                    color = '#f04e4e';
                    status = 'Error';
                    break;
                default: // 'warn'
                    text = '!';
                    color = '#f0ad4e';
                    status = 'Warning';
                    break;
            }
        } else if (!this._isPrepared) {
            if (this._prepareError) {
                text = '!!';
                color = '#f04e4e';
                status = 'Error';
            } else if (this._badgePrepareDelayTimer === null) {
                text = '...';
                color = '#f0ad4e';
                status = 'Loading';
            }
        } else if (!this._anyOptionsMatches((options) => options.general.enable)) {
            text = 'off';
            color = '#555555';
            status = 'Disabled';
        } else if (!this._anyOptionsMatches((options) => this._isAnyDictionaryEnabled(options))) {
            text = '!';
            color = '#f0ad4e';
            status = 'No dictionaries installed';
        }

        if (color !== null && typeof chrome.browserAction.setBadgeBackgroundColor === 'function') {
            chrome.browserAction.setBadgeBackgroundColor({color});
        }
        if (text !== null && typeof chrome.browserAction.setBadgeText === 'function') {
            chrome.browserAction.setBadgeText({text});
        }
        if (typeof chrome.browserAction.setTitle === 'function') {
            if (status !== null) {
                title = `${title} - ${status}`;
            }
            chrome.browserAction.setTitle({title});
        }
    }

    _isAnyDictionaryEnabled(options) {
        for (const {enabled} of Object.values(options.dictionaries)) {
            if (enabled) {
                return true;
            }
        }
        return false;
    }

    _anyOptionsMatches(predicate) {
        for (const {options} of this._options.profiles) {
            const value = predicate(options);
            if (value) { return value; }
        }
        return false;
    }

    _getTemplates(options) {
        const templates = options.anki.fieldTemplates;
        return typeof templates === 'string' ? templates : this._defaultAnkiFieldTemplates;
    }

    async _getTabUrl(tabId) {
        try {
            const {url} = await this._sendMessageTab(
                tabId,
                {action: 'getUrl', params: {}},
                {frameId: 0}
            );
            if (typeof url === 'string') {
                return url;
            }
        } catch (e) {
            // NOP
        }
        return null;
    }

    async _findTab(timeout, checkUrl) {
        // This function works around the need to have the "tabs" permission to access tab.url.
        const tabs = await new Promise((resolve) => chrome.tabs.query({}, resolve));
        const {promise: matchPromise, resolve: matchPromiseResolve} = deferPromise();

        const checkTabUrl = ({tab, url}) => {
            if (checkUrl(url, tab)) {
                matchPromiseResolve(tab);
            }
        };

        const promises = [];
        for (const tab of tabs) {
            const promise = this._getTabUrl(tab);
            promise.then(checkTabUrl);
            promises.push(promise);
        }

        const racePromises = [
            matchPromise,
            Promise.all(promises).then(() => null)
        ];
        if (typeof timeout === 'number') {
            racePromises.push(new Promise((resolve) => setTimeout(() => resolve(null), timeout)));
        }

        return await Promise.race(racePromises);
    }

    async _focusTab(tab) {
        await new Promise((resolve, reject) => {
            chrome.tabs.update(tab.id, {active: true}, () => {
                const e = chrome.runtime.lastError;
                if (e) {
                    reject(new Error(e.message));
                } else {
                    resolve();
                }
            });
        });

        if (!(typeof chrome.windows === 'object' && chrome.windows !== null)) {
            // Windows not supported (e.g. on Firefox mobile)
            return;
        }

        try {
            const tabWindow = await new Promise((resolve, reject) => {
                chrome.windows.get(tab.windowId, {}, (value) => {
                    const e = chrome.runtime.lastError;
                    if (e) {
                        reject(new Error(e.message));
                    } else {
                        resolve(value);
                    }
                });
            });
            if (!tabWindow.focused) {
                await new Promise((resolve, reject) => {
                    chrome.windows.update(tab.windowId, {focused: true}, () => {
                        const e = chrome.runtime.lastError;
                        if (e) {
                            reject(new Error(e.message));
                        } else {
                            resolve();
                        }
                    });
                });
            }
        } catch (e) {
            // Edge throws exception for no reason here.
        }
    }

    _waitUntilTabFrameIsReady(tabId, frameId, timeout=null) {
        return new Promise((resolve, reject) => {
            let timer = null;
            let onMessage = (message, sender) => {
                if (
                    !sender.tab ||
                    sender.tab.id !== tabId ||
                    sender.frameId !== frameId ||
                    !isObject(message) ||
                    message.action !== 'yomichanReady'
                ) {
                    return;
                }

                cleanup();
                resolve();
            };
            const cleanup = () => {
                if (timer !== null) {
                    clearTimeout(timer);
                    timer = null;
                }
                if (onMessage !== null) {
                    chrome.runtime.onMessage.removeListener(onMessage);
                    onMessage = null;
                }
            };

            chrome.runtime.onMessage.addListener(onMessage);

            chrome.tabs.sendMessage(tabId, {action: 'isReady'}, {frameId}, (response) => {
                const error = chrome.runtime.lastError;
                if (error) { return; }

                try {
                    const value = yomichan.getMessageResponseResult(response);
                    if (!value) { return; }

                    cleanup();
                    resolve();
                } catch (e) {
                    // NOP
                }
            });

            if (timeout !== null) {
                timer = setTimeout(() => {
                    timer = null;
                    cleanup();
                    reject(new Error('Timeout'));
                }, timeout);
            }
        });
    }

    async _fetchAsset(url, json=false) {
        const response = await fetch(chrome.runtime.getURL(url), {
            method: 'GET',
            mode: 'no-cors',
            cache: 'default',
            credentials: 'omit',
            redirect: 'follow',
            referrerPolicy: 'no-referrer'
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch ${url}: ${response.status}`);
        }
        return await (json ? response.json() : response.text());
    }

    _sendMessageTab(...args) {
        return new Promise((resolve, reject) => {
            const callback = (response) => {
                try {
                    resolve(yomichan.getMessageResponseResult(response));
                } catch (error) {
                    reject(error);
                }
            };

            chrome.tabs.sendMessage(...args, callback);
        });
    }

    async _checkTabUrl(tabId, urlPredicate) {
        const tab = await new Promise((resolve) => {
            chrome.tabs.get(
                tabId,
                (result) => { resolve(chrome.runtime.lastError ? null : result); }
            );
        });
        if (tab === null) { return null; }

        const url = await this._getTabUrl(tabId);
        const isValidTab = urlPredicate(url);
        return isValidTab ? tab : null;
    }

    _environmentHasDocument() {
        return (typeof document === 'object' && document !== null);
    }

    _executePasteCommand() {
        document.execCommand('paste');
    }

    _readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
        });
    }

    async _getScreenshot(windowId, tabId, ownerFrameId, format, quality) {
        if (typeof windowId !== 'number') {
            throw new Error('Invalid window ID');
        }

        let token = null;
        try {
            if (typeof tabId === 'number' && typeof ownerFrameId === 'number') {
                const action = 'setAllVisibleOverride';
                const params = {value: false, priority: 0, awaitFrame: true};
                token = await this._sendMessageTab(tabId, {action, params}, {frameId: ownerFrameId});
            }

            return await new Promise((resolve, reject) => {
                chrome.tabs.captureVisibleTab(windowId, {format, quality}, (result) => {
                    const e = chrome.runtime.lastError;
                    if (e) {
                        reject(new Error(e.message));
                    } else {
                        resolve(result);
                    }
                });
            });
        } finally {
            if (token !== null) {
                const action = 'clearAllVisibleOverride';
                const params = {token};
                try {
                    await this._sendMessageTab(tabId, {action, params}, {frameId: ownerFrameId});
                } catch (e) {
                    // NOP
                }
            }
        }
    }

    async _getDefinitionAudio(sources, expression, reading, details) {
        return await this._audioSystem.getDefinitionAudio(sources, expression, reading, details);
    }

    async _injectAnkNoteMedia(ankiConnect, expression, reading, timestamp, audioDetails, screenshotDetails, clipboardImage) {
        const screenshotFileName = (
            screenshotDetails !== null ?
            await this._injectAnkNoteScreenshot(ankiConnect, expression, reading, timestamp, screenshotDetails) :
            null
        );
        const clipboardImageFileName = (
            clipboardImage ?
            await this._injectAnkNoteClipboardImage(ankiConnect, expression, reading, timestamp) :
            null
        );
        const audioFileName = (
            audioDetails !== null ?
            await this._injectAnkNoteAudio(ankiConnect, expression, reading, timestamp, audioDetails) :
            null
        );
        return {screenshotFileName, clipboardImageFileName, audioFileName};
    }

    async _injectAnkNoteAudio(ankiConnect, expression, reading, timestamp, details) {
        try {
            if (!reading && !expression) {
                throw new Error('Invalid reading and expression');
            }

            let fileName = 'yomichan';
            if (reading) { fileName += `_${reading}`; }
            if (expression) { fileName += `_${expression}`; }
            fileName += '.mp3';
            fileName = fileName.replace(/\]/g, '');
            fileName = this._replaceInvalidFileNameCharacters(fileName);

            const {sources, customSourceUrl} = details;
            const {audio: data} = await this._getDefinitionAudio(
                sources,
                expression,
                reading,
                {
                    textToSpeechVoice: null,
                    customSourceUrl,
                    binary: true,
                    disableCache: true
                }
            );

            await ankiConnect.storeMediaFile(fileName, data);

            return fileName;
        } catch (e) {
            return null;
        }
    }

    async _injectAnkNoteScreenshot(ankiConnect, expression, reading, timestamp, details) {
        try {
            const now = new Date(timestamp);

            const {windowId, tabId, ownerFrameId, format, quality} = details;
            const dataUrl = await this._getScreenshot(windowId, tabId, ownerFrameId, format, quality);

            const {mediaType, data} = this._getDataUrlInfo(dataUrl);
            const extension = this._getImageExtensionFromMediaType(mediaType);

            let fileName = `yomichan_browser_screenshot_${reading}_${this._ankNoteDateToString(now)}.${extension}`;
            fileName = this._replaceInvalidFileNameCharacters(fileName);

            await ankiConnect.storeMediaFile(fileName, data);

            return fileName;
        } catch (e) {
            return null;
        }
    }

    async _injectAnkNoteClipboardImage(ankiConnect, expression, reading, timestamp) {
        try {
            const now = new Date(timestamp);

            const dataUrl = await this._onApiClipboardImageGet();
            if (dataUrl === null) {
                throw new Error('No clipboard image');
            }

            const {mediaType, data} = this._getDataUrlInfo(dataUrl);
            const extension = this._getImageExtensionFromMediaType(mediaType);

            let fileName = `yomichan_clipboard_image_${reading}_${this._ankNoteDateToString(now)}.${extension}`;
            fileName = this._replaceInvalidFileNameCharacters(fileName);

            await ankiConnect.storeMediaFile(fileName, data);

            return fileName;
        } catch (e) {
            return null;
        }
    }

    _replaceInvalidFileNameCharacters(fileName) {
        // eslint-disable-next-line no-control-regex
        return fileName.replace(/[<>:"/\\|?*\x00-\x1F]/g, '-');
    }

    _ankNoteDateToString(date) {
        const year = date.getUTCFullYear();
        const month = date.getUTCMonth().toString().padStart(2, '0');
        const day = date.getUTCDate().toString().padStart(2, '0');
        const hours = date.getUTCHours().toString().padStart(2, '0');
        const minutes = date.getUTCMinutes().toString().padStart(2, '0');
        const seconds = date.getUTCSeconds().toString().padStart(2, '0');
        return `${year}-${month}-${day}-${hours}-${minutes}-${seconds}`;
    }

    _getDataUrlInfo(dataUrl) {
        const match = /^data:([^,]*?)(;base64)?,/.exec(dataUrl);
        if (match === null) {
            throw new Error('Invalid data URL');
        }

        let mediaType = match[1];
        if (mediaType.length === 0) { mediaType = 'text/plain'; }

        let data = dataUrl.substring(match[0].length);
        if (typeof match[2] === 'undefined') { data = btoa(data); }

        return {mediaType, data};
    }

    _getImageExtensionFromMediaType(mediaType) {
        switch (mediaType.toLowerCase()) {
            case 'image/png': return 'png';
            case 'image/jpeg': return 'jpeg';
            default: throw new Error('Unknown image media type');
        }
    }

    _triggerDatabaseUpdated(type, cause) {
        this._sendMessageAllTabs('databaseUpdated', {type, cause});
    }

    async _saveOptions(source) {
        this._clearProfileConditionsSchemaCache();
        const options = this.getFullOptions();
        await this._optionsUtil.save(options);
        this._applyOptions(source);
    }
}
