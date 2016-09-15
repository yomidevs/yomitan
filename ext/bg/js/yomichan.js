/*
 * Copyright (C) 2016  Alex Yatskov <alex@foosoft.net>
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


class Yomichan {
    constructor() {
        Handlebars.partials = Handlebars.templates;
        Handlebars.registerHelper('kanjiLinks', kanjiLinks);

        this.translator = new Translator();
        this.importTabId = null;
        this.asyncPools = {};
        this.ankiConnectVer = 0;
        this.setState('disabled');

        chrome.runtime.onInstalled.addListener(this.onInstalled.bind(this));
        chrome.runtime.onMessage.addListener(this.onMessage.bind(this));
        chrome.browserAction.onClicked.addListener(this.onBrowserAction.bind(this));
        chrome.tabs.onCreated.addListener(tab => this.onTabReady(tab.id));
        chrome.tabs.onUpdated.addListener(this.onTabReady.bind(this));

        loadOptions().then(opts => {
            this.setOptions(opts);
            if (this.options.activateOnStartup) {
                this.setState('loading');
            }
        });
    }

    onInstalled(details) {
        if (details.reason === 'install') {
            chrome.tabs.create({url: chrome.extension.getURL('bg/guide.html')});
        }
    }

    onImport({state, progress}) {
        if (state === 'begin') {
            chrome.tabs.create({url: chrome.extension.getURL('bg/import.html')}, tab => this.importTabId = tab.id);
        }

        if (this.importTabId !== null) {
            chrome.tabs.sendMessage(this.importTabId, {state, progress}, () => null);
        }

        if (state === 'end') {
            this.importTabId = null;
        }
    }

    onMessage(request, sender, callback) {
        const {action, params} = request, method = this['api_' + action];

        if (typeof(method) === 'function') {
            params.callback = callback;
            method.call(this, params);
        }

        return true;
    }

    onTabReady(tabId) {
        this.tabInvoke(tabId, 'setOptions', this.options);
        this.tabInvoke(tabId, 'setEnabled', this.state === 'enabled');
    }

    onBrowserAction() {
        switch (this.state) {
            case 'disabled':
                this.setState('loading');
                break;
            case 'enabled':
                this.setState('disabled');
                break;
        }
    }

    setState(state) {
        if (this.state === state) {
            return;
        }

        this.state = state;

        switch (state) {
            case 'disabled':
                chrome.browserAction.setBadgeText({text: 'off'});
                break;
            case 'enabled':
                chrome.browserAction.setBadgeText({text: ''});
                break;
            case 'loading':
                chrome.browserAction.setBadgeText({text: '...'});
                this.translator.loadData(this.onImport.bind(this)).then(() => this.setState('enabled'));
                break;
        }

        this.tabInvokeAll('setEnabled', this.state === 'enabled');
    }

    setOptions(options) {
        this.options = options;
        this.tabInvokeAll('setOptions', this.options);
    }

    getApiVersion() {
        return 1;
    }

    tabInvokeAll(action, params) {
        chrome.tabs.query({}, tabs => {
            for (const tab of tabs) {
                this.tabInvoke(tab.id, action, params);
            }
        });
    }

    tabInvoke(tabId, action, params) {
        chrome.tabs.sendMessage(tabId, {action, params}, () => null);
    }

    ankiInvokeSafe(action, params, pool, callback) {
        if (this.ankiConnectVer === this.getApiVersion()) {
            this.ankiInvoke(action, params, pool, callback);
        } else {
            this.api_getVersion({callback: version => {
                if (version === this.getApiVersion()) {
                    this.ankiConnectVer = version;
                    this.ankiInvoke(action, params, pool, callback);
                } else {
                    callback(null);
                }
            }});
        }
    }

    ankiInvoke(action, params, pool, callback) {
        if (this.options.enableAnkiConnect) {
            if (pool !== null && this.asyncPools.hasOwnProperty(pool)) {
                this.asyncPools[pool].abort();
            }

            const xhr = new XMLHttpRequest();
            xhr.addEventListener('loadend', () => {
                if (pool !== null) {
                    delete this.asyncPools[pool];
                }

                const resp = xhr.responseText;
                callback(resp ? JSON.parse(resp) : null);
            });

            xhr.open('POST', 'http://127.0.0.1:8765');
            xhr.send(JSON.stringify({action, params}));
        } else {
            callback(null);
        }
    }

    formatField(field, definition, mode) {
        const markers = [
            'audio',
            'character',
            'expression',
            'glossary',
            'glossary-list',
            'kunyomi',
            'onyomi',
            'reading',
            'sentence',
            'tags',
            'url',
        ];

        for (const marker of markers) {
            let value = definition[marker] || null;
            switch (marker) {
                case 'audio':
                    value = '';
                    break;
                case 'expression':
                    if (mode === 'term_kana' && definition.reading) {
                        value = definition.reading;
                    }
                    break;
                case 'reading':
                    if (mode === 'term_kana') {
                        value = null;
                    }
                    break;
                case 'glossary-list':
                    if (definition.glossary) {
                        value = '<ol>';
                        for (const gloss of definition.glossary) {
                            value += `<li>${gloss}</li>`;
                        }
                        value += '</ol>';
                    }
                    break;
                case 'tags':
                    if (definition.tags) {
                        value = definition.tags.map(t => t.name);
                    }
                    break;
            }

            if (value !== null && typeof(value) !== 'string') {
                value = value.join(', ');
            }

            field = field.replace(`{${marker}}`, value || '');
        }

        return field;
    }

    formatNote(definition, mode) {
        const note = {fields: {}, tags: this.options.ankiCardTags};

        let fields = [];
        if (mode === 'kanji') {
            fields = this.options.ankiKanjiFields;
            note.deckName = this.options.ankiKanjiDeck;
            note.modelName = this.options.ankiKanjiModel;
        } else {
            fields = this.options.ankiTermFields;
            note.deckName = this.options.ankiTermDeck;
            note.modelName = this.options.ankiTermModel;

            const audio = {
                kanji:  definition.expression,
                kana:   definition.reading,
                fields: []
            };

            for (const name in fields) {
                if (fields[name].includes('{audio}')) {
                    audio.fields.push(name);
                }
            }

            if (audio.fields.length > 0) {
                note.audio = audio;
            }
        }

        for (const name in fields) {
            note.fields[name] = this.formatField(fields[name], definition, mode);
        }

        return note;
    }

    api_addDefinition({definition, mode, callback}) {
        const note = this.formatNote(definition, mode);
        this.ankiInvokeSafe('addNote', {note}, null, callback);
    }

    api_canAddDefinitions({definitions, modes, callback}) {
        const notes = [];
        for (const definition of definitions) {
            for (const mode of modes) {
                notes.push(this.formatNote(definition, mode));
            }
        }

        this.ankiInvokeSafe('canAddNotes', {notes}, 'notes', results => {
            const states = [];

            if (results !== null) {
                for (let resultBase = 0; resultBase < results.length; resultBase += modes.length) {
                    const state = {};
                    for (let modeOffset = 0; modeOffset < modes.length; ++modeOffset) {
                        state[modes[modeOffset]] = results[resultBase + modeOffset];
                    }

                    states.push(state);
                }
            }

            callback(states);
        });
    }

    api_findKanji({text, callback}) {
        this.translator.findKanji(text).then(result => callback(result));
    }

    api_findTerm({text, callback}) {
        this.translator.findTerm(text).then(result => callback(result));
    }

    api_getDeckNames({callback}) {
        this.ankiInvokeSafe('deckNames', {}, null, callback);
    }

    api_getModelNames({callback}) {
        this.ankiInvokeSafe('modelNames', {}, null, callback);
    }

    api_getModelFieldNames({modelName, callback}) {
        this.ankiInvokeSafe('modelFieldNames', {modelName}, null, callback);
    }

    api_getVersion({callback}) {
        this.ankiInvoke('version', {}, null, callback);
    }

    api_renderText({template, data, callback}) {
        callback(Handlebars.templates[template](data));
    }
}

window.yomichan = new Yomichan();
