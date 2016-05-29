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
        Handlebars.registerHelper('kanjiLinks', function(options) {
            let result = '';
            for (const c of options.fn(this)) {
                if (Translator.isKanji(c)) {
                    result += Handlebars.templates['kanji-link.html']({kanji: c}).trim();
                } else {
                    result += c;
                }
            }

            return result;
        });

        this.translator = new Translator();
        this.asyncPools = {};
        this.setState('disabled');

        loadOptions((opts) => {
            this.setOptions(opts);

            chrome.runtime.onMessage.addListener(this.onMessage.bind(this));
            chrome.browserAction.onClicked.addListener(this.onBrowserAction.bind(this));

            if (this.options.activateOnStartup) {
                this.setState('loading');
            }
        });
    }

    onMessage(request, sender, callback) {
        const {action, params} = request, method = this['api_' + action];

        if (typeof(method) === 'function') {
            params.callback = callback;
            method.call(this, params);
        }

        return true;
    }

    onBrowserAction(tab) {
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
                this.translator.loadData({loadEnamDict: this.options.loadEnamDict}, () => this.setState('enabled'));
                break;
        }

        this.notifyTabs('state', this.state);
    }

    setOptions(options) {
        this.options = options;
        this.notifyTabs('options', this.options);
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
            xhr.withCredentials = true;
            xhr.setRequestHeader('Content-Type', 'text/json');
            xhr.send(JSON.stringify({action, params}));
        } else {
            callback(null);
        }
    }

    formatField(field, definition, kana) {
        const supported = ['character', 'expression', 'glossary', 'kunyomi', 'onyomi', 'reading'];

        for (const key in definition) {
            if (supported.indexOf(key) === -1) {
                continue;
            }

            let value = definition[key];
            if (kana) {
                if (key === 'expression') {
                    value = definition.reading;
                } else if (key === 'reading') {
                    value = '';
                }
            }
            if (key === 'glossary') {
                value = definition.glossary.join('; ');
            }

            field = field.replace(`{${key}}`, value);
        }

        return field;
    }

    formatNote(definition, mode) {
        const note = {fields: {}, tags: []};

        let fields = [];
        if (mode === 'kanji') {
            fields         = this.options.ankiKanjiFields;
            note.deckName  = this.options.ankiKanjiDeck;
            note.modelName = this.options.ankiKanjiModel;
        } else {
            fields         = this.options.ankiVocabFields;
            note.deckName  = this.options.ankiVocabDeck;
            note.modelName = this.options.ankiVocabModel;
        }

        for (const name in fields) {
            note.fields[name] = this.formatField(fields[name], definition, mode === 'vocabReading');
        }

        return note;
    }

    notifyTabs(name, value) {
        chrome.tabs.query({}, (tabs) => {
            for (const tab of tabs) {
                chrome.tabs.sendMessage(tab.id, {name: name, value: value}, () => null);
            }
        });
    }

    api_addNote({definition, mode, callback}) {
        const note = this.formatNote(definition, mode);
        this.ankiInvoke('addNote', {note}, null, callback);
    }

    api_canAddNotes({definitions, modes, callback}) {
        let notes = [];
        for (const definition of definitions) {
            for (const mode of modes) {
                notes.push(this.formatNote(definition, mode));
            }
        }

        this.ankiInvoke('canAddNotes', {notes}, 'notes', (results) => {
            const states = [];
            for (let resultBase = 0; resultBase < results.length; resultBase += modes.length) {
                const state = {};
                for (let modeOffset = 0; modeOffset < modes.length; ++modeOffset) {
                    state[modes[modeOffset]] = results[resultBase + modeOffset];
                }

                states.push(state);
            }

            callback(states);
        });
    }

    api_findKanji({text, callback}) {
        callback(this.translator.findKanji(text));
    }

    api_findTerm({text, callback}) {
        callback(this.translator.findTerm(text));
    }

    api_getDeckNames({callback}) {
        this.ankiInvoke('deckNames', {}, null, callback);
    }

    api_getModelNames({callback}) {
        this.ankiInvoke('modelNames', {}, null, callback);
    }

    api_getModelFieldNames({modelName, callback}) {
        this.ankiInvoke('modelFieldNames', {modelName}, null, callback);
    }

    api_getOptions({callback}) {
        callback(this.options);
    }

    api_getState({callback}) {
        callback(this.state);
    }

    api_renderText({template, data, callback}) {
        callback(Handlebars.templates[template](data));
    }
}

window.yomichan = new Yomichan();
