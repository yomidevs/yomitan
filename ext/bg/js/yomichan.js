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
        Handlebars.registerHelper('multiLine', multiLine);

        this.translator = new Translator();
        this.anki = new AnkiNull();
        this.options = null;
        this.setState('disabled');

        chrome.runtime.onMessage.addListener(this.onMessage.bind(this));
        chrome.browserAction.onClicked.addListener(this.onBrowserAction.bind(this));
        chrome.runtime.onInstalled.addListener(this.onInstalled.bind(this));

        optionsLoad().then(options => {
            this.setOptions(options);
            if (this.options.general.autoStart) {
                this.setState('loading');
            }
        });
    }

    onInstalled(details) {
        if (details.reason === 'install') {
            chrome.tabs.create({url: chrome.extension.getURL('bg/guide.html')});
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
                this.translator.prepare().then(this.setState('enabled'));
                break;
        }

        this.tabInvokeAll('setEnabled', this.state === 'enabled');
    }

    setOptions(options) {
        this.options = options;

        if (options.anki.enable) {
            this.anki = new AnkiConnect();
        } else {
            this.anki = new AnkiNull();
        }

        this.tabInvokeAll('setOptions', this.options);
    }

    tabInvokeAll(action, params) {
        chrome.tabs.query({}, tabs => {
            for (const tab of tabs) {
                chrome.tabs.sendMessage(tab.id, {action, params}, () => null);
            }
        });
    }

    formatNote(definition, mode) {
        const note = {fields: {}, tags: this.options.anki.tags};

        let fields = [];
        if (mode === 'kanji') {
            fields = this.options.anki.kanji.fields;
            note.deckName = this.options.anki.kanji.deck;
            note.modelName = this.options.anki.kanji.model;
        } else {
            fields = this.options.anki.terms.fields;
            note.deckName = this.options.anki.terms.deck;
            note.modelName = this.options.anki.terms.model;

            const audio = {
                kanji: definition.expression,
                kana: definition.reading,
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
            note.fields[name] = formatField(fields[name], definition, mode);
        }

        return note;
    }

    api_getEnabled({callback}) {
        callback({result: this.state === 'enabled'});
    }

    api_getOptions({callback}) {
        promiseCallback(optionsLoad(), callback);
    }

    api_findKanji({text, callback}) {
        promiseCallback(
            this.translator.findKanji(text, enabledDicts(this.options)),
            callback
        );
    }

    api_findTerms({text, callback}) {
        promiseCallback(
            this.translator.findTerms(text, enabledDicts(this.options), this.options.general.softKatakana),
            callback
        );
    }

    api_findTermsGrouped({text, callback}) {
        promiseCallback(
            this.translator.findTermsGrouped(text, enabledDicts(this.options), this.options.general.softKatakana),
            callback
        );
    }

    api_renderText({template, data, callback}) {
        callback({result: Handlebars.templates[template](data)});
    }

    api_addDefinition({definition, mode, callback}) {
        const note = this.formatNote(definition, mode);
        promiseCallback(this.anki.addNote(note), callback);
    }

    api_canAddDefinitions({definitions, modes, callback}) {
        const notes = [];
        for (const definition of definitions) {
            for (const mode of modes) {
                notes.push(this.formatNote(definition, mode));
            }
        }

        const promise = this.anki.canAddNotes(notes).then(raw => {
            const states = [];
            for (let resultBase = 0; resultBase < raw.length; resultBase += modes.length) {
                const state = {};
                for (let modeOffset = 0; modeOffset < modes.length; ++modeOffset) {
                    state[modes[modeOffset]] = raw[resultBase + modeOffset];
                }

                states.push(state);
            }

            return states;
        });

        promiseCallback(promise, callback);
    }
}

window.yomichan = new Yomichan();
