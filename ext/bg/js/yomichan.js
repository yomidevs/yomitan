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
        this.anki = new AnkiNull();
        this.options = null;
        this.setState('disabled');

        chrome.runtime.onMessage.addListener(this.onMessage.bind(this));
        chrome.browserAction.onClicked.addListener(this.onBrowserAction.bind(this));
        chrome.runtime.onInstalled.addListener(this.onInstalled.bind(this));

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

        switch (options.ankiMethod) {
            case 'ankiweb':
                this.anki = new AnkiWeb(options.ankiUsername, options.ankiPassword);
                break;
            case 'ankiconnect':
                this.anki = new AnkiConnect();
                break;
            default:
                this.anki = new AnkiNull();
                break;
        }

        this.tabInvokeAll('setOptions', this.options);
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

    formatField(field, definition, mode) {
        const markers = [
            'audio',
            'character',
            'expression',
            'expression-furigana',
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
                case 'expression-furigana':
                    if (mode === 'term_kana' && definition.reading) {
                        value = definition.reading;
                    } else {
                        value = `<ruby>${definition.expression}<rt>${definition.reading}</rt></ruby>`;
                    }
                    break;
                case 'reading':
                    if (mode === 'term_kana') {
                        value = null;
                    }
                    break;
                case 'glossary-list':
                    if (definition.glossary) {
                        if (definition.glossary.length > 1) {
                            value = '<ol style="white-space: pre; text-align: left;">';
                            for (const gloss of definition.glossary) {
                                value += `<li>${gloss}</li>`;
                            }
                            value += '</ol>';
                        } else {
                            value = `<p style="white-space: pre;">${definition.glossary.join('')}</p>`;
                        }
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
            note.fields[name] = this.formatField(fields[name], definition, mode);
        }

        return note;
    }

    api_getEnabled({callback}) {
        callback({result: this.state === 'enabled'});
    }

    api_getOptions({callback}) {
        promiseCallback(loadOptions(), callback);
    }

    api_findKanji({text, callback}) {
        const dictionaries = [];
        for (const title in this.options.dictionaries) {
            if (this.options.dictionaries[title].enableKanji) {
                dictionaries.push(title);
            }
        }

        promiseCallback(
            this.translator.findKanji(text, dictionaries),
            callback
        );
    }

    api_findTerm({text, callback}) {
        const dictionaries = [];
        for (const title in this.options.dictionaries) {
            if (this.options.dictionaries[title].enableTerms) {
                dictionaries.push(title);
            }
        }

        promiseCallback(
            this.translator.findTerm(text, dictionaries, this.options.enableSoftKatakanaSearch),
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
