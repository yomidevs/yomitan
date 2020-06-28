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
 * AnkiNoteBuilder
 * AudioSystem
 * AudioUriBuilder
 * ClipboardMonitor
 * Database
 * DictionaryImporter
 * Environment
 * JsonSchema
 * Mecab
 * ObjectPropertyAccessor
 * TemplateRenderer
 * Translator
 * conditionsTestValue
 * dictTermsSort
 * jp
 * optionsLoad
 * optionsSave
 * profileConditionsDescriptor
 * profileConditionsDescriptorPromise
 * requestJson
 * requestText
 */

class Backend {
    constructor() {
        this._environment = new Environment();
        this._database = new Database();
        this._dictionaryImporter = new DictionaryImporter();
        this._translator = new Translator(this._database);
        this._anki = new AnkiConnect();
        this._mecab = new Mecab();
        this._clipboardMonitor = new ClipboardMonitor({getClipboard: this._onApiClipboardGet.bind(this)});
        this._options = null;
        this._optionsSchema = null;
        this._defaultAnkiFieldTemplates = null;
        this._audioUriBuilder = new AudioUriBuilder();
        this._audioSystem = new AudioSystem({
            audioUriBuilder: this._audioUriBuilder,
            useCache: false
        });
        this._ankiNoteBuilder = new AnkiNoteBuilder({
            anki: this._anki,
            audioSystem: this._audioSystem,
            renderTemplate: this._renderTemplate.bind(this)
        });
        this._templateRenderer = new TemplateRenderer();

        const url = (typeof window === 'object' && window !== null ? window.location.href : '');
        this._optionsContext = {depth: 0, url};

        this._clipboardPasteTarget = (
            typeof document === 'object' && document !== null ?
            document.querySelector('#clipboard-paste-target') :
            null
        );

        this._popupWindow = null;

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
            ['yomichanCoreReady',            {async: false, contentScript: true,  handler: this._onApiYomichanCoreReady.bind(this)}],
            ['optionsSchemaGet',             {async: false, contentScript: true,  handler: this._onApiOptionsSchemaGet.bind(this)}],
            ['optionsGet',                   {async: false, contentScript: true,  handler: this._onApiOptionsGet.bind(this)}],
            ['optionsGetFull',               {async: false, contentScript: true,  handler: this._onApiOptionsGetFull.bind(this)}],
            ['optionsSave',                  {async: true,  contentScript: true,  handler: this._onApiOptionsSave.bind(this)}],
            ['kanjiFind',                    {async: true,  contentScript: true,  handler: this._onApiKanjiFind.bind(this)}],
            ['termsFind',                    {async: true,  contentScript: true,  handler: this._onApiTermsFind.bind(this)}],
            ['textParse',                    {async: true,  contentScript: true,  handler: this._onApiTextParse.bind(this)}],
            ['definitionAdd',                {async: true,  contentScript: true,  handler: this._onApiDefinitionAdd.bind(this)}],
            ['definitionsAddable',           {async: true,  contentScript: true,  handler: this._onApiDefinitionsAddable.bind(this)}],
            ['noteView',                     {async: true,  contentScript: true,  handler: this._onApiNoteView.bind(this)}],
            ['templateRender',               {async: true,  contentScript: true,  handler: this._onApiTemplateRender.bind(this)}],
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
            ['getDisplayTemplatesHtml',      {async: true,  contentScript: true,  handler: this._onApiGetDisplayTemplatesHtml.bind(this)}],
            ['getQueryParserTemplatesHtml',  {async: true,  contentScript: true,  handler: this._onApiGetQueryParserTemplatesHtml.bind(this)}],
            ['getZoom',                      {async: true,  contentScript: true,  handler: this._onApiGetZoom.bind(this)}],
            ['getDefaultAnkiFieldTemplates', {async: false, contentScript: true,  handler: this._onApiGetDefaultAnkiFieldTemplates.bind(this)}],
            ['getAnkiDeckNames',             {async: true,  contentScript: false, handler: this._onApiGetAnkiDeckNames.bind(this)}],
            ['getAnkiModelNames',            {async: true,  contentScript: false, handler: this._onApiGetAnkiModelNames.bind(this)}],
            ['getAnkiModelFieldNames',       {async: true,  contentScript: false, handler: this._onApiGetAnkiModelFieldNames.bind(this)}],
            ['getDictionaryInfo',            {async: true,  contentScript: false, handler: this._onApiGetDictionaryInfo.bind(this)}],
            ['getDictionaryCounts',          {async: true,  contentScript: false, handler: this._onApiGetDictionaryCounts.bind(this)}],
            ['purgeDatabase',                {async: true,  contentScript: false, handler: this._onApiPurgeDatabase.bind(this)}],
            ['getMedia',                     {async: true,  contentScript: true,  handler: this._onApiGetMedia.bind(this)}],
            ['log',                          {async: false, contentScript: true,  handler: this._onApiLog.bind(this)}],
            ['logIndicatorClear',            {async: false, contentScript: true,  handler: this._onApiLogIndicatorClear.bind(this)}],
            ['createActionPort',             {async: false, contentScript: true,  handler: this._onApiCreateActionPort.bind(this)}],
            ['modifySettings',               {async: true,  contentScript: true,  handler: this._onApiModifySettings.bind(this)}],
            ['getSettings',                  {async: false, contentScript: true,  handler: this._onApiGetSettings.bind(this)}],
            ['setAllSettings',               {async: true,  contentScript: false, handler: this._onApiSetAllSettings.bind(this)}]
        ]);
        this._messageHandlersWithProgress = new Map([
            ['importDictionaryArchive', {async: true,  contentScript: false, handler: this._onApiImportDictionaryArchive.bind(this)}],
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
                await this._database.prepare();
            } catch (e) {
                yomichan.logError(e);
            }
            await this._translator.prepare();

            await profileConditionsDescriptorPromise;

            this._optionsSchema = await requestJson(chrome.runtime.getURL('/bg/data/options-schema.json'), 'GET');
            this._defaultAnkiFieldTemplates = (await requestText(chrome.runtime.getURL('/bg/data/default-anki-field-templates.handlebars'), 'GET')).trim();
            this._options = await optionsLoad();
            this._options = JsonSchema.getValidValueOrDefault(this._optionsSchema, this._options);

            this._applyOptions('background');

            const options = this.getOptions(this._optionsContext);
            if (options.general.showGuide) {
                chrome.tabs.create({url: chrome.runtime.getURL('/bg/guide.html')});
            }

            this._clipboardMonitor.on('change', this._onClipboardTextChange.bind(this));

            this._sendMessageAllTabs('backendPrepared');
            const callback = () => this._checkLastError(chrome.runtime.lastError);
            chrome.runtime.sendMessage({action: 'backendPrepared'}, callback);
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
        return useSchema ? JsonSchema.createProxy(options, this._optionsSchema) : options;
    }

    getOptions(optionsContext, useSchema=false) {
        return this._getProfile(optionsContext, useSchema).options;
    }

    // Event handlers

    _onClipboardTextChange({text}) {
        this._onCommandSearch({mode: 'popup', query: text});
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

        const {handler, async, contentScript} = messageHandler;

        try {
            if (!contentScript) {
                this._validatePrivilegedMessageSender(sender);
            }

            const promiseOrResult = handler(params, sender);
            if (async) {
                promiseOrResult.then(
                    (result) => callback({result}),
                    (error) => callback({error: errorToJson(error)})
                );
                return true;
            } else {
                callback({result: promiseOrResult});
                return false;
            }
        } catch (error) {
            callback({error: errorToJson(error)});
            return false;
        }
    }

    _onConnect(port) {
        try {
            const match = /^background-cross-frame-communication-port-(\d+)$/.exec(`${port.name}`);
            if (match === null) { return; }

            const tabId = (port.sender && port.sender.tab ? port.sender.tab.id : null);
            if (typeof tabId !== 'number') {
                throw new Error('Port does not have an associated tab ID');
            }
            const senderFrameId = port.sender.frameId;
            if (typeof tabId !== 'number') {
                throw new Error('Port does not have an associated frame ID');
            }
            const targetFrameId = parseInt(match[1], 10);

            let forwardPort = chrome.tabs.connect(tabId, {frameId: targetFrameId, name: `cross-frame-communication-port-${senderFrameId}`});

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

    _onApiYomichanCoreReady(_params, sender) {
        // tab ID isn't set in background (e.g. browser_action)
        const callback = () => this._checkLastError(chrome.runtime.lastError);
        const data = {action: 'backendPrepared'};
        if (typeof sender.tab === 'undefined') {
            chrome.runtime.sendMessage(data, callback);
            return false;
        } else {
            chrome.tabs.sendMessage(sender.tab.id, data, callback);
            return true;
        }
    }

    _onApiOptionsSchemaGet() {
        return this._optionsSchema;
    }

    _onApiOptionsGet({optionsContext}) {
        return this.getOptions(optionsContext);
    }

    _onApiOptionsGetFull() {
        return this.getFullOptions();
    }

    async _onApiOptionsSave({source}) {
        const options = this.getFullOptions();
        await optionsSave(options);
        this._applyOptions(source);
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

    async _onApiDefinitionAdd({definition, mode, context, details, optionsContext}) {
        const options = this.getOptions(optionsContext);
        const templates = this._getTemplates(options);

        if (mode !== 'kanji') {
            const {customSourceUrl} = options.audio;
            await this._ankiNoteBuilder.injectAudio(
                definition,
                options.anki.terms.fields,
                options.audio.sources,
                customSourceUrl
            );
        }

        if (details && details.screenshot) {
            await this._ankiNoteBuilder.injectScreenshot(
                definition,
                options.anki.terms.fields,
                details.screenshot
            );
        }

        const note = await this._ankiNoteBuilder.createNote(definition, mode, context, options, templates);
        return this._anki.addNote(note);
    }

    async _onApiDefinitionsAddable({definitions, modes, context, optionsContext}) {
        const options = this.getOptions(optionsContext);
        const templates = this._getTemplates(options);
        const states = [];

        try {
            const notePromises = [];
            for (const definition of definitions) {
                for (const mode of modes) {
                    const notePromise = this._ankiNoteBuilder.createNote(definition, mode, context, options, templates);
                    notePromises.push(notePromise);
                }
            }
            const notes = await Promise.all(notePromises);

            const cannotAdd = [];
            const results = await this._anki.canAddNotes(notes);
            for (let resultBase = 0; resultBase < results.length; resultBase += modes.length) {
                const state = {};
                for (let modeOffset = 0; modeOffset < modes.length; ++modeOffset) {
                    const index = resultBase + modeOffset;
                    const result = results[index];
                    const info = {canAdd: result};
                    state[modes[modeOffset]] = info;
                    if (!result) {
                        cannotAdd.push([notes[index], info]);
                    }
                }

                states.push(state);
            }

            if (cannotAdd.length > 0) {
                const noteIdsArray = await this._anki.findNoteIds(cannotAdd.map((e) => e[0]), options.anki.duplicateScope);
                for (let i = 0, ii = Math.min(cannotAdd.length, noteIdsArray.length); i < ii; ++i) {
                    const noteIds = noteIdsArray[i];
                    if (noteIds.length > 0) {
                        cannotAdd[i][1].noteId = noteIds[0];
                    }
                }
            }
        } catch (e) {
            // NOP
        }

        return states;
    }

    async _onApiNoteView({noteId}) {
        return await this._anki.guiBrowse(`nid:${noteId}`);
    }

    async _onApiTemplateRender({template, data}) {
        return this._renderTemplate(template, data);
    }

    _onApiCommandExec({command, params}) {
        return this._runCommand(command, params);
    }

    async _onApiAudioGetUri({definition, source, details}) {
        return await this._audioUriBuilder.getUri(definition, source, details);
    }

    _onApiScreenshotGet({options}, sender) {
        if (!(sender && sender.tab)) {
            return Promise.resolve();
        }

        const windowId = sender.tab.windowId;
        return new Promise((resolve) => {
            chrome.tabs.captureVisibleTab(windowId, options, (dataUrl) => resolve(dataUrl));
        });
    }

    _onApiSendMessageToFrame({frameId, action, params}, sender) {
        if (!(sender && sender.tab)) {
            return false;
        }

        const tabId = sender.tab.id;
        const callback = () => this._checkLastError(chrome.runtime.lastError);
        chrome.tabs.sendMessage(tabId, {action, params}, {frameId}, callback);
        return true;
    }

    _onApiBroadcastTab({action, params}, sender) {
        if (!(sender && sender.tab)) {
            return false;
        }

        const tabId = sender.tab.id;
        const callback = () => this._checkLastError(chrome.runtime.lastError);
        chrome.tabs.sendMessage(tabId, {action, params}, callback);
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
        return await requestText(url, 'GET');
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
        } else {
            const clipboardPasteTarget = this._clipboardPasteTarget;
            if (clipboardPasteTarget === null) {
                throw new Error('Reading the clipboard is not supported in this context');
            }
            clipboardPasteTarget.value = '';
            clipboardPasteTarget.focus();
            document.execCommand('paste');
            const result = clipboardPasteTarget.value;
            clipboardPasteTarget.value = '';
            return result;
        }
    }

    async _onApiGetDisplayTemplatesHtml() {
        const url = chrome.runtime.getURL('/mixed/display-templates.html');
        return await requestText(url, 'GET');
    }

    async _onApiGetQueryParserTemplatesHtml() {
        const url = chrome.runtime.getURL('/bg/query-parser-templates.html');
        return await requestText(url, 'GET');
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

    async _onApiGetAnkiDeckNames() {
        return await this._anki.getDeckNames();
    }

    async _onApiGetAnkiModelNames() {
        return await this._anki.getModelNames();
    }

    async _onApiGetAnkiModelFieldNames({modelName}) {
        return await this._anki.getModelFieldNames(modelName);
    }

    async _onApiGetDictionaryInfo() {
        return await this._translator.database.getDictionaryInfo();
    }

    async _onApiGetDictionaryCounts({dictionaryNames, getTotal}) {
        return await this._translator.database.getDictionaryCounts(dictionaryNames, getTotal);
    }

    async _onApiPurgeDatabase() {
        this._translator.clearDatabaseCaches();
        await this._database.purge();
    }

    async _onApiGetMedia({targets}) {
        return await this._database.getMedia(targets);
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
        const id = yomichan.generateId(16);
        const portName = `action-port-${id}`;

        const port = chrome.tabs.connect(tabId, {name: portName, frameId});
        try {
            this._createActionListenerPort(port, sender, this._messageHandlersWithProgress);
        } catch (e) {
            port.disconnect();
            throw e;
        }

        return portName;
    }

    async _onApiImportDictionaryArchive({archiveContent, details}, sender, onProgress) {
        return await this._dictionaryImporter.import(this._database, archiveContent, details, onProgress);
    }

    async _onApiDeleteDictionary({dictionaryName}, sender, onProgress) {
        this._translator.clearDatabaseCaches();
        await this._database.deleteDictionary(dictionaryName, {rate: 1000}, onProgress);
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
        await this._onApiOptionsSave({source});
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
        this._options = JsonSchema.getValidValueOrDefault(this._optionsSchema, value);
        await this._onApiOptionsSave({source});
    }

    // Command handlers

    async _onCommandSearch(params) {
        const {mode='existingOrNewTab', query} = params || {};

        const options = this.getOptions(this._optionsContext);
        const {popupWidth, popupHeight} = options.general;

        const baseUrl = chrome.runtime.getURL('/bg/search.html');
        const queryParams = {mode};
        if (query && query.length > 0) { queryParams.query = query; }
        const queryString = new URLSearchParams(queryParams).toString();
        const url = `${baseUrl}?${queryString}`;

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
                    await new Promise((resolve) => chrome.tabs.sendMessage(
                        tab.id,
                        {action: 'searchQueryUpdate', params: {text: queryParams.query}},
                        resolve
                    ));
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
            case 'popup':
                try {
                    // chrome.windows not supported (e.g. on Firefox mobile)
                    if (!isObject(chrome.windows)) { return; }
                    if (await openInTab()) { return; }
                    // if the previous popup is open in an invalid state, close it
                    if (this._popupWindow !== null) {
                        const callback = () => this._checkLastError(chrome.runtime.lastError);
                        chrome.windows.remove(this._popupWindow.id, callback);
                    }
                    // open new popup
                    this._popupWindow = await new Promise((resolve) => chrome.windows.create(
                        {url, width: popupWidth, height: popupHeight, type: 'popup'},
                        resolve
                    ));
                } catch (e) {
                    // NOP
                }
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
        const options = this.getOptions(this._optionsContext);
        options.general.enable = !options.general.enable;
        await this._onApiOptionsSave({source});
    }

    // Utilities

    _sendMessageAllTabs(action, params={}) {
        const callback = () => this._checkLastError(chrome.runtime.lastError);
        chrome.tabs.query({}, (tabs) => {
            for (const tab of tabs) {
                chrome.tabs.sendMessage(tab.id, {action, params}, callback);
            }
        });
    }

    _applyOptions(source) {
        const options = this.getOptions(this._optionsContext);
        this._updateBadge();

        this._anki.setServer(options.anki.server);
        this._anki.setEnabled(options.anki.enable);

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
        if (typeof optionsContext.index === 'number') {
            return profiles[optionsContext.index];
        }
        const profile = this._getProfileFromContext(options, optionsContext);
        return profile !== null ? profile : options.profiles[options.profileCurrent];
    }

    _getProfileFromContext(options, optionsContext) {
        for (const profile of options.profiles) {
            const conditionGroups = profile.conditionGroups;
            if (conditionGroups.length > 0 && this._testConditionGroups(conditionGroups, optionsContext)) {
                return profile;
            }
        }
        return null;
    }

    _testConditionGroups(conditionGroups, data) {
        if (conditionGroups.length === 0) { return false; }

        for (const conditionGroup of conditionGroups) {
            const conditions = conditionGroup.conditions;
            if (conditions.length > 0 && this._testConditions(conditions, data)) {
                return true;
            }
        }

        return false;
    }

    _testConditions(conditions, data) {
        for (const condition of conditions) {
            if (!conditionsTestValue(profileConditionsDescriptor, condition.type, condition.operator, condition.value, data)) {
                return false;
            }
        }
        return true;
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

    async _importDictionary(archiveSource, onProgress, details) {
        return await this._dictionaryImporter.import(this._database, archiveSource, onProgress, details);
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
                dictTermsSort(definitions);
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

    async _renderTemplate(template, data) {
        return await this._templateRenderer.render(template, data);
    }

    _getTemplates(options) {
        const templates = options.anki.fieldTemplates;
        return typeof templates === 'string' ? templates : this._defaultAnkiFieldTemplates;
    }

    _getTabUrl(tab) {
        return new Promise((resolve) => {
            chrome.tabs.sendMessage(tab.id, {action: 'getUrl'}, {frameId: 0}, (response) => {
                let url = null;
                if (!chrome.runtime.lastError) {
                    url = (response !== null && typeof response === 'object' && !Array.isArray(response) ? response.url : null);
                    if (url !== null && typeof url !== 'string') {
                        url = null;
                    }
                }
                resolve({tab, url});
            });
        });
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
}
