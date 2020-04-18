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
 * BackendApiForwarder
 * ClipboardMonitor
 * Database
 * DictionaryImporter
 * JsonSchema
 * Mecab
 * Translator
 * conditionsTestValue
 * dictConfigured
 * dictEnabledSet
 * dictTermsSort
 * handlebarsRenderDynamic
 * jp
 * optionsLoad
 * optionsSave
 * profileConditionsDescriptor
 * requestJson
 * requestText
 * utilIsolate
 */

class Backend {
    constructor() {
        this.database = new Database();
        this.dictionaryImporter = new DictionaryImporter();
        this.translator = new Translator(this.database);
        this.anki = new AnkiConnect();
        this.mecab = new Mecab();
        this.clipboardMonitor = new ClipboardMonitor({getClipboard: this._onApiClipboardGet.bind(this)});
        this.options = null;
        this.optionsSchema = null;
        this.defaultAnkiFieldTemplates = null;
        this.audioSystem = new AudioSystem({getAudioUri: this._getAudioUri.bind(this)});
        this.audioUriBuilder = new AudioUriBuilder();
        this.ankiNoteBuilder = new AnkiNoteBuilder({
            anki: this.anki,
            audioSystem: this.audioSystem,
            renderTemplate: this._renderTemplate.bind(this)
        });

        this.optionsContext = {
            depth: 0,
            url: window.location.href
        };

        this.isPrepared = false;

        this.clipboardPasteTarget = document.querySelector('#clipboard-paste-target');

        this.popupWindow = null;

        this.apiForwarder = new BackendApiForwarder();

        this.messageToken = yomichan.generateId(16);

        this._messageHandlers = new Map([
            ['yomichanCoreReady', {handler: this._onApiYomichanCoreReady.bind(this), async: false}],
            ['optionsSchemaGet', {handler: this._onApiOptionsSchemaGet.bind(this), async: false}],
            ['optionsGet', {handler: this._onApiOptionsGet.bind(this), async: false}],
            ['optionsGetFull', {handler: this._onApiOptionsGetFull.bind(this), async: false}],
            ['optionsSet', {handler: this._onApiOptionsSet.bind(this), async: true}],
            ['optionsSave', {handler: this._onApiOptionsSave.bind(this), async: true}],
            ['kanjiFind', {handler: this._onApiKanjiFind.bind(this), async: true}],
            ['termsFind', {handler: this._onApiTermsFind.bind(this), async: true}],
            ['textParse', {handler: this._onApiTextParse.bind(this), async: true}],
            ['textParseMecab', {handler: this._onApiTextParseMecab.bind(this), async: true}],
            ['definitionAdd', {handler: this._onApiDefinitionAdd.bind(this), async: true}],
            ['definitionsAddable', {handler: this._onApiDefinitionsAddable.bind(this), async: true}],
            ['noteView', {handler: this._onApiNoteView.bind(this), async: true}],
            ['templateRender', {handler: this._onApiTemplateRender.bind(this), async: true}],
            ['commandExec', {handler: this._onApiCommandExec.bind(this), async: false}],
            ['audioGetUri', {handler: this._onApiAudioGetUri.bind(this), async: true}],
            ['screenshotGet', {handler: this._onApiScreenshotGet.bind(this), async: true}],
            ['broadcastTab', {handler: this._onApiBroadcastTab.bind(this), async: false}],
            ['frameInformationGet', {handler: this._onApiFrameInformationGet.bind(this), async: true}],
            ['injectStylesheet', {handler: this._onApiInjectStylesheet.bind(this), async: true}],
            ['getEnvironmentInfo', {handler: this._onApiGetEnvironmentInfo.bind(this), async: true}],
            ['clipboardGet', {handler: this._onApiClipboardGet.bind(this), async: true}],
            ['getDisplayTemplatesHtml', {handler: this._onApiGetDisplayTemplatesHtml.bind(this), async: true}],
            ['getQueryParserTemplatesHtml', {handler: this._onApiGetQueryParserTemplatesHtml.bind(this), async: true}],
            ['getZoom', {handler: this._onApiGetZoom.bind(this), async: true}],
            ['getMessageToken', {handler: this._onApiGetMessageToken.bind(this), async: false}],
            ['getDefaultAnkiFieldTemplates', {handler: this._onApiGetDefaultAnkiFieldTemplates.bind(this), async: false}]
        ]);

        this._commandHandlers = new Map([
            ['search', this._onCommandSearch.bind(this)],
            ['help', this._onCommandHelp.bind(this)],
            ['options', this._onCommandOptions.bind(this)],
            ['toggle', this._onCommandToggle.bind(this)]
        ]);
    }

    async prepare() {
        await this.database.prepare();
        await this.translator.prepare();

        this.optionsSchema = await requestJson(chrome.runtime.getURL('/bg/data/options-schema.json'), 'GET');
        this.defaultAnkiFieldTemplates = await requestText(chrome.runtime.getURL('/bg/data/default-anki-field-templates.handlebars'), 'GET');
        this.options = await optionsLoad();
        try {
            this.options = JsonSchema.getValidValueOrDefault(this.optionsSchema, this.options);
        } catch (e) {
            // This shouldn't happen, but catch errors just in case of bugs
            logError(e);
        }

        this.onOptionsUpdated('background');

        if (isObject(chrome.commands) && isObject(chrome.commands.onCommand)) {
            chrome.commands.onCommand.addListener(this._runCommand.bind(this));
        }
        if (isObject(chrome.tabs) && isObject(chrome.tabs.onZoomChange)) {
            chrome.tabs.onZoomChange.addListener(this._onZoomChange.bind(this));
        }
        chrome.runtime.onMessage.addListener(this.onMessage.bind(this));

        this.isPrepared = true;

        const options = this.getOptions(this.optionsContext);
        if (options.general.showGuide) {
            chrome.tabs.create({url: chrome.runtime.getURL('/bg/guide.html')});
        }

        this.clipboardMonitor.on('change', this._onClipboardText.bind(this));

        this._sendMessageAllTabs('backendPrepared');
        const callback = () => this.checkLastError(chrome.runtime.lastError);
        chrome.runtime.sendMessage({action: 'backendPrepared'}, callback);
    }

    _sendMessageAllTabs(action, params={}) {
        const callback = () => this.checkLastError(chrome.runtime.lastError);
        chrome.tabs.query({}, (tabs) => {
            for (const tab of tabs) {
                chrome.tabs.sendMessage(tab.id, {action, params}, callback);
            }
        });
    }

    onOptionsUpdated(source) {
        this.applyOptions();
        this._sendMessageAllTabs('optionsUpdated', {source});
    }

    onMessage({action, params}, sender, callback) {
        const messageHandler = this._messageHandlers.get(action);
        if (typeof messageHandler === 'undefined') { return false; }

        const {handler, async} = messageHandler;

        try {
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

    _onClipboardText({text}) {
        this._onCommandSearch({mode: 'popup', query: text});
    }

    _onZoomChange({tabId, oldZoomFactor, newZoomFactor}) {
        const callback = () => this.checkLastError(chrome.runtime.lastError);
        chrome.tabs.sendMessage(tabId, {action: 'zoomChanged', params: {oldZoomFactor, newZoomFactor}}, callback);
    }

    applyOptions() {
        const options = this.getOptions(this.optionsContext);
        if (!options.general.enable) {
            this.setExtensionBadgeBackgroundColor('#555555');
            this.setExtensionBadgeText('off');
        } else if (!dictConfigured(options)) {
            this.setExtensionBadgeBackgroundColor('#f0ad4e');
            this.setExtensionBadgeText('!');
        } else {
            this.setExtensionBadgeText('');
        }

        this.anki.setServer(options.anki.server);
        this.anki.setEnabled(options.anki.enable);

        if (options.parsing.enableMecabParser) {
            this.mecab.startListener();
        } else {
            this.mecab.stopListener();
        }

        if (options.general.enableClipboardPopups) {
            this.clipboardMonitor.start();
        } else {
            this.clipboardMonitor.stop();
        }
    }

    getOptionsSchema() {
        return this.optionsSchema;
    }

    getFullOptions() {
        return this.options;
    }

    setFullOptions(options) {
        try {
            this.options = JsonSchema.getValidValueOrDefault(this.optionsSchema, utilIsolate(options));
        } catch (e) {
            // This shouldn't happen, but catch errors just in case of bugs
            logError(e);
        }
    }

    getOptions(optionsContext) {
        return this.getProfile(optionsContext).options;
    }

    getProfile(optionsContext) {
        const profiles = this.options.profiles;
        if (typeof optionsContext.index === 'number') {
            return profiles[optionsContext.index];
        }
        const profile = this.getProfileFromContext(optionsContext);
        return profile !== null ? profile : this.options.profiles[this.options.profileCurrent];
    }

    getProfileFromContext(optionsContext) {
        for (const profile of this.options.profiles) {
            const conditionGroups = profile.conditionGroups;
            if (conditionGroups.length > 0 && Backend.testConditionGroups(conditionGroups, optionsContext)) {
                return profile;
            }
        }
        return null;
    }

    static testConditionGroups(conditionGroups, data) {
        if (conditionGroups.length === 0) { return false; }

        for (const conditionGroup of conditionGroups) {
            const conditions = conditionGroup.conditions;
            if (conditions.length > 0 && Backend.testConditions(conditions, data)) {
                return true;
            }
        }

        return false;
    }

    static testConditions(conditions, data) {
        for (const condition of conditions) {
            if (!conditionsTestValue(profileConditionsDescriptor, condition.type, condition.operator, condition.value, data)) {
                return false;
            }
        }
        return true;
    }

    setExtensionBadgeBackgroundColor(color) {
        if (typeof chrome.browserAction.setBadgeBackgroundColor === 'function') {
            chrome.browserAction.setBadgeBackgroundColor({color});
        }
    }

    setExtensionBadgeText(text) {
        if (typeof chrome.browserAction.setBadgeText === 'function') {
            chrome.browserAction.setBadgeText({text});
        }
    }

    checkLastError() {
        // NOP
    }

    _runCommand(command, params) {
        const handler = this._commandHandlers.get(command);
        if (typeof handler !== 'function') { return false; }

        handler(params);
        return true;
    }

    async importDictionary(archiveSource, onProgress, details) {
        return await this.dictionaryImporter.import(this.database, archiveSource, onProgress, details);
    }

    // Message handlers

    _onApiYomichanCoreReady(_params, sender) {
        // tab ID isn't set in background (e.g. browser_action)
        const callback = () => this.checkLastError(chrome.runtime.lastError);
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
        return this.getOptionsSchema();
    }

    _onApiOptionsGet({optionsContext}) {
        return this.getOptions(optionsContext);
    }

    _onApiOptionsGetFull() {
        return this.getFullOptions();
    }

    async _onApiOptionsSet({changedOptions, optionsContext, source}) {
        const options = this.getOptions(optionsContext);

        function getValuePaths(obj) {
            const valuePaths = [];
            const nodes = [{obj, path: []}];
            while (nodes.length > 0) {
                const node = nodes.pop();
                for (const key of Object.keys(node.obj)) {
                    const path = node.path.concat(key);
                    const obj2 = node.obj[key];
                    if (obj2 !== null && typeof obj2 === 'object') {
                        nodes.unshift({obj: obj2, path});
                    } else {
                        valuePaths.push([obj2, path]);
                    }
                }
            }
            return valuePaths;
        }

        function modifyOption(path, value) {
            let pivot = options;
            for (const key of path.slice(0, -1)) {
                if (!hasOwn(pivot, key)) {
                    return false;
                }
                pivot = pivot[key];
            }
            pivot[path[path.length - 1]] = value;
            return true;
        }

        for (const [value, path] of getValuePaths(changedOptions)) {
            modifyOption(path, value);
        }

        await this._onApiOptionsSave({source});
    }

    async _onApiOptionsSave({source}) {
        const options = this.getFullOptions();
        await optionsSave(options);
        this.onOptionsUpdated(source);
    }

    async _onApiKanjiFind({text, optionsContext}) {
        const options = this.getOptions(optionsContext);
        const definitions = await this.translator.findKanji(text, options);
        definitions.splice(options.general.maxResults);
        return definitions;
    }

    async _onApiTermsFind({text, details, optionsContext}) {
        const options = this.getOptions(optionsContext);
        const mode = options.general.resultOutputMode;
        const [definitions, length] = await this.translator.findTerms(mode, text, details, options);
        definitions.splice(options.general.maxResults);
        return {length, definitions};
    }

    async _onApiTextParse({text, optionsContext}) {
        const options = this.getOptions(optionsContext);
        const results = [];
        while (text.length > 0) {
            const term = [];
            const [definitions, sourceLength] = await this.translator.findTerms(
                'simple',
                text.substring(0, options.scanning.length),
                {},
                options
            );
            if (definitions.length > 0) {
                dictTermsSort(definitions);
                const {expression, reading} = definitions[0];
                const source = text.substring(0, sourceLength);
                for (const {text: text2, furigana} of jp.distributeFuriganaInflected(expression, reading, source)) {
                    const reading2 = jp.convertReading(text2, furigana, options.parsing.readingMode);
                    term.push({text: text2, reading: reading2});
                }
                text = text.substring(source.length);
            } else {
                const reading = jp.convertReading(text[0], null, options.parsing.readingMode);
                term.push({text: text[0], reading});
                text = text.substring(1);
            }
            results.push(term);
        }
        return results;
    }

    async _onApiTextParseMecab({text, optionsContext}) {
        const options = this.getOptions(optionsContext);
        const results = [];
        const rawResults = await this.mecab.parseText(text);
        for (const [mecabName, parsedLines] of Object.entries(rawResults)) {
            const result = [];
            for (const parsedLine of parsedLines) {
                for (const {expression, reading, source} of parsedLine) {
                    const term = [];
                    if (expression !== null && reading !== null) {
                        for (const {text: text2, furigana} of jp.distributeFuriganaInflected(
                            expression,
                            jp.convertKatakanaToHiragana(reading),
                            source
                        )) {
                            const reading2 = jp.convertReading(text2, furigana, options.parsing.readingMode);
                            term.push({text: text2, reading: reading2});
                        }
                    } else {
                        const reading2 = jp.convertReading(source, null, options.parsing.readingMode);
                        term.push({text: source, reading: reading2});
                    }
                    result.push(term);
                }
                result.push([{text: '\n'}]);
            }
            results.push([mecabName, result]);
        }
        return results;
    }

    async _onApiDefinitionAdd({definition, mode, context, details, optionsContext}) {
        const options = this.getOptions(optionsContext);
        const templates = this.defaultAnkiFieldTemplates;

        if (mode !== 'kanji') {
            await this.ankiNoteBuilder.injectAudio(
                definition,
                options.anki.terms.fields,
                options.audio.sources,
                optionsContext
            );
        }

        if (details && details.screenshot) {
            await this.ankiNoteBuilder.injectScreenshot(
                definition,
                options.anki.terms.fields,
                details.screenshot
            );
        }

        const note = await this.ankiNoteBuilder.createNote(definition, mode, context, options, templates);
        return this.anki.addNote(note);
    }

    async _onApiDefinitionsAddable({definitions, modes, context, optionsContext}) {
        const options = this.getOptions(optionsContext);
        const templates = this.defaultAnkiFieldTemplates;
        const states = [];

        try {
            const notes = [];
            for (const definition of definitions) {
                for (const mode of modes) {
                    const note = await this.ankiNoteBuilder.createNote(definition, mode, context, options, templates);
                    notes.push(note);
                }
            }

            const cannotAdd = [];
            const results = await this.anki.canAddNotes(notes);
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
                const noteIdsArray = await this.anki.findNoteIds(cannotAdd.map((e) => e[0]));
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
        return await this.anki.guiBrowse(`nid:${noteId}`);
    }

    async _onApiTemplateRender({template, data}) {
        return this._renderTemplate(template, data);
    }

    _onApiCommandExec({command, params}) {
        return this._runCommand(command, params);
    }

    async _onApiAudioGetUri({definition, source, optionsContext}) {
        const options = this.getOptions(optionsContext);
        return await this.audioUriBuilder.getUri(definition, source, options);
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

    _onApiBroadcastTab({action, params}, sender) {
        if (!(sender && sender.tab)) {
            return false;
        }

        const tabId = sender.tab.id;
        const callback = () => this.checkLastError(chrome.runtime.lastError);
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

    async _onApiGetEnvironmentInfo() {
        const browser = await Backend._getBrowser();
        const platform = await new Promise((resolve) => chrome.runtime.getPlatformInfo(resolve));
        return {
            browser,
            platform: {
                os: platform.os
            }
        };
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
        const browser = await Backend._getBrowser();
        if (browser === 'firefox' || browser === 'firefox-mobile') {
            return await navigator.clipboard.readText();
        } else {
            const clipboardPasteTarget = this.clipboardPasteTarget;
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

    _onApiGetMessageToken() {
        return this.messageToken;
    }

    _onApiGetDefaultAnkiFieldTemplates() {
        return this.defaultAnkiFieldTemplates;
    }

    // Command handlers

    async _onCommandSearch(params) {
        const {mode='existingOrNewTab', query} = params || {};

        const options = this.getOptions(this.optionsContext);
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
            const tab = await Backend._findTab(1000, isTabMatch);
            if (tab !== null) {
                await Backend._focusTab(tab);
                if (queryParams.query) {
                    await new Promise((resolve) => chrome.tabs.sendMessage(
                        tab.id, {action: 'searchQueryUpdate', params: {text: queryParams.query}}, resolve
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
                    if (this.popupWindow !== null) {
                        const callback = () => this.checkLastError(chrome.runtime.lastError);
                        chrome.windows.remove(this.popupWindow.id, callback);
                    }
                    // open new popup
                    this.popupWindow = await new Promise((resolve) => chrome.windows.create(
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
        const optionsContext = {
            depth: 0,
            url: window.location.href
        };
        const source = 'popup';

        const options = this.getOptions(optionsContext);
        options.general.enable = !options.general.enable;
        await this._onApiOptionsSave({source});
    }

    // Utilities

    async _getAudioUri(definition, source, details) {
        let optionsContext = (typeof details === 'object' && details !== null ? details.optionsContext : null);
        if (!(typeof optionsContext === 'object' && optionsContext !== null)) {
            optionsContext = this.optionsContext;
        }

        const options = this.getOptions(optionsContext);
        return await this.audioUriBuilder.getUri(definition, source, options);
    }

    async _renderTemplate(template, data) {
        return handlebarsRenderDynamic(template, data);
    }

    static _getTabUrl(tab) {
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

    static async _findTab(timeout, checkUrl) {
        // This function works around the need to have the "tabs" permission to access tab.url.
        const tabs = await new Promise((resolve) => chrome.tabs.query({}, resolve));
        let matchPromiseResolve = null;
        const matchPromise = new Promise((resolve) => { matchPromiseResolve = resolve; });

        const checkTabUrl = ({tab, url}) => {
            if (checkUrl(url, tab)) {
                matchPromiseResolve(tab);
            }
        };

        const promises = [];
        for (const tab of tabs) {
            const promise = Backend._getTabUrl(tab);
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

    static async _focusTab(tab) {
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

    static async _getBrowser() {
        if (EXTENSION_IS_BROWSER_EDGE) {
            return 'edge';
        }
        if (typeof browser !== 'undefined') {
            try {
                const info = await browser.runtime.getBrowserInfo();
                if (info.name === 'Fennec') {
                    return 'firefox-mobile';
                }
            } catch (e) {
                // NOP
            }
            return 'firefox';
        } else {
            return 'chrome';
        }
    }
}

window.yomichanBackend = new Backend();
window.yomichanBackend.prepare();
