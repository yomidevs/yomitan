/*
 * Copyright (C) 2016-2017  Alex Yatskov <alex@foosoft.net>
 * Author: Alex Yatskov <alex@foosoft.net>
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
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */


class Backend {
    constructor() {
        this.translator = new Translator();
        this.anki = new AnkiNull();
        this.mecab = new Mecab();
        this.options = null;
        this.optionsContext = {
            depth: 0,
            url: window.location.href
        };

        this.isPreparedResolve = null;
        this.isPreparedPromise = new Promise((resolve) => (this.isPreparedResolve = resolve));

        this.clipboardPasteTarget = document.querySelector('#clipboard-paste-target');

        this.apiForwarder = new BackendApiForwarder();
    }

    async prepare() {
        await this.translator.prepare();
        this.options = await optionsLoad();
        this.onOptionsUpdated('background');

        if (chrome.commands !== null && typeof chrome.commands === 'object') {
            chrome.commands.onCommand.addListener(this.onCommand.bind(this));
        }
        chrome.runtime.onMessage.addListener(this.onMessage.bind(this));

        const options = this.getOptionsSync(this.optionsContext);
        if (options.general.showGuide) {
            chrome.tabs.create({url: chrome.runtime.getURL('/bg/guide.html')});
        }

        this.isPreparedResolve();
        this.isPreparedResolve = null;
        this.isPreparedPromise = null;
    }

    onOptionsUpdated(source) {
        this.applyOptions();

        const callback = () => this.checkLastError(chrome.runtime.lastError);
        chrome.tabs.query({}, (tabs) => {
            for (const tab of tabs) {
                chrome.tabs.sendMessage(tab.id, {action: 'optionsUpdate', params: {source}}, callback);
            }
        });
    }

    onCommand(command) {
        apiCommandExec(command);
    }

    onMessage({action, params}, sender, callback) {
        const handler = Backend._messageHandlers.get(action);
        if (typeof handler !== 'function') { return false; }

        try {
            const promise = handler(this, params, sender);
            promise.then(
                (result) => callback({result}),
                (error) => callback({error: errorToJson(error)})
            );
            return true;
        } catch (error) {
            callback({error: errorToJson(error)});
            return false;
        }
    }

    applyOptions() {
        const options = this.getOptionsSync(this.optionsContext);
        if (!options.general.enable) {
            this.setExtensionBadgeBackgroundColor('#555555');
            this.setExtensionBadgeText('off');
        } else if (!dictConfigured(options)) {
            this.setExtensionBadgeBackgroundColor('#f0ad4e');
            this.setExtensionBadgeText('!');
        } else {
            this.setExtensionBadgeText('');
        }

        this.anki = options.anki.enable ? new AnkiConnect(options.anki.server) : new AnkiNull();

        if (options.parsing.enableMecabParser) {
            this.mecab.startListener();
        } else {
            this.mecab.stopListener();
        }
    }

    async getFullOptions() {
        if (this.isPreparedPromise !== null) {
            await this.isPreparedPromise;
        }
        return this.options;
    }

    async getOptions(optionsContext) {
        if (this.isPreparedPromise !== null) {
            await this.isPreparedPromise;
        }
        return this.getOptionsSync(optionsContext);
    }

    getOptionsSync(optionsContext) {
        return this.getProfileSync(optionsContext).options;
    }

    getProfileSync(optionsContext) {
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

    // Message handlers

    _onApiOptionsGet({optionsContext}) {
        return this.getOptions(optionsContext);
    }

    _onApiOptionsGetFull() {
        return this.getFullOptions();
    }

    async _onApiOptionsSet({changedOptions, optionsContext, source}) {
        const options = await this.getOptions(optionsContext);

        function getValuePaths(obj) {
            const valuePaths = [];
            const nodes = [{obj, path: []}];
            while (nodes.length > 0) {
                const node = nodes.pop();
                for (const key of Object.keys(node.obj)) {
                    const path = node.path.concat(key);
                    const obj = node.obj[key];
                    if (obj !== null && typeof obj === 'object') {
                        nodes.unshift({obj, path});
                    } else {
                        valuePaths.push([obj, path]);
                    }
                }
            }
            return valuePaths;
        }

        function modifyOption(path, value, options) {
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
            modifyOption(path, value, options);
        }

        await this._optionsSave({source});
    }

    async _onApiOptionsSave({source}) {
        const options = await this.getFullOptions();
        await optionsSave(options);
        this.onOptionsUpdated(source);
    }

    _onApiKanjiFind({text, optionsContext}) {
        return apiKanjiFind(text, optionsContext);
    }

    _onApiTermsFind({text, details, optionsContext}) {
        return apiTermsFind(text, details, optionsContext);
    }

    _onApiTextParse({text, optionsContext}) {
        return apiTextParse(text, optionsContext);
    }

    _onApiTextParseMecab({text, optionsContext}) {
        return apiTextParseMecab(text, optionsContext);
    }

    _onApiDefinitionAdd({definition, mode, context, optionsContext}) {
        return apiDefinitionAdd(definition, mode, context, optionsContext);
    }

    _onApiDefinitionsAddable({definitions, modes, optionsContext}) {
        return apiDefinitionsAddable(definitions, modes, optionsContext);
    }

    _onApiNoteView({noteId}) {
        return apiNoteView(noteId);
    }

    _onApiTemplateRender({template, data, dynamic}) {
        return apiTemplateRender(template, data, dynamic);
    }

    _onApiCommandExec({command, params}) {
        return apiCommandExec(command, params);
    }

    _onApiAudioGetUrl({definition, source, optionsContext}) {
        return apiAudioGetUrl(definition, source, optionsContext);
    }

    _onApiScreenshotGet({options}, sender) {
        return apiScreenshotGet(options, sender);
    }

    _onApiForward({action, params}, sender) {
        return apiForward(action, params, sender);
    }

    _onApiFrameInformationGet(params, sender) {
        return apiFrameInformationGet(sender);
    }

    _onApiInjectStylesheet({css}, sender) {
        return apiInjectStylesheet(css, sender);
    }

    _onApiGetEnvironmentInfo() {
        return apiGetEnvironmentInfo();
    }

    _onApiClipboardGet() {
        return apiClipboardGet();
    }
}

Backend._messageHandlers = new Map([
    ['optionsGet', (self, ...args) => self._onApiOptionsGet(...args)],
    ['optionsGetFull', (self, ...args) => self._onApiOptionsGetFull(...args)],
    ['optionsSet', (self, ...args) => self._onApiOptionsSet(...args)],
    ['optionsSave', (self, ...args) => self._onApiOptionsSave(...args)],
    ['kanjiFind', (self, ...args) => self._onApiKanjiFind(...args)],
    ['termsFind', (self, ...args) => self._onApiTermsFind(...args)],
    ['textParse', (self, ...args) => self._onApiTextParse(...args)],
    ['textParseMecab', (self, ...args) => self._onApiTextParseMecab(...args)],
    ['definitionAdd', (self, ...args) => self._onApiDefinitionAdd(...args)],
    ['definitionsAddable', (self, ...args) => self._onApiDefinitionsAddable(...args)],
    ['noteView', (self, ...args) => self._onApiNoteView(...args)],
    ['templateRender', (self, ...args) => self._onApiTemplateRender(...args)],
    ['commandExec', (self, ...args) => self._onApiCommandExec(...args)],
    ['audioGetUrl', (self, ...args) => self._onApiAudioGetUrl(...args)],
    ['screenshotGet', (self, ...args) => self._onApiScreenshotGet(...args)],
    ['forward', (self, ...args) => self._onApiForward(...args)],
    ['frameInformationGet', (self, ...args) => self._onApiFrameInformationGet(...args)],
    ['injectStylesheet', (self, ...args) => self._onApiInjectStylesheet(...args)],
    ['getEnvironmentInfo', (self, ...args) => self._onApiGetEnvironmentInfo(...args)],
    ['clipboardGet', (self, ...args) => self._onApiClipboardGet(...args)]
]);

window.yomichan_backend = new Backend();
window.yomichan_backend.prepare();
