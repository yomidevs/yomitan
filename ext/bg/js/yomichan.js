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


window.yomichan = new class {
    constructor() {
        handlebarsRegister();

        this.translator = new Translator();
        this.anki = new AnkiNull();
        this.options = null;

        this.translator.prepare().then(optionsLoad).then(this.optionsSet.bind(this)).then(() => {
            chrome.commands.onCommand.addListener(this.onCommand.bind(this));
            chrome.runtime.onMessage.addListener(this.onMessage.bind(this));
            if (this.options.general.showGuide) {
                chrome.tabs.create({url: chrome.extension.getURL('/bg/guide.html')});
            }
        });
    }

    optionsSet(options) {
        this.options = options;

        if (!options.general.enable) {
            chrome.browserAction.setBadgeBackgroundColor({color: '#d9534f'});
            chrome.browserAction.setBadgeText({text: 'off'});
        } else if (!dictConfigured(options)) {
            chrome.browserAction.setBadgeBackgroundColor({color: '#f0ad4e'});
            chrome.browserAction.setBadgeText({text: '!'});
        } else {
            chrome.browserAction.setBadgeText({text: ''});
        }

        if (options.anki.enable) {
            this.anki = new AnkiConnect(this.options.anki.server);
        } else {
            this.anki = new AnkiNull();
        }
    }

    noteFormat(definition, mode) {
        const note = {
            fields: {},
            tags: this.options.anki.tags
        };

        let fields = [];
        if (mode === 'kanji') {
            fields = this.options.anki.kanji.fields;
            note.deckName = this.options.anki.kanji.deck;
            note.modelName = this.options.anki.kanji.model;
        } else {
            fields = this.options.anki.terms.fields;
            note.deckName = this.options.anki.terms.deck;
            note.modelName = this.options.anki.terms.model;

            if (definition.audio) {
                const audio = {
                    url: definition.audio.url,
                    filename: definition.audio.filename,
                    skipHash: '7e2c2f954ef6051373ba916f000168dc',
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
        }

        for (const name in fields) {
            note.fields[name] = dictFieldFormat(
                fields[name],
                definition,
                mode,
                this.options
            );
        }

        return note;
    }

    termsFind(text) {
        const searcher = this.options.general.groupResults ?
            this.translator.findTermsGrouped.bind(this.translator) :
            this.translator.findTerms.bind(this.translator);

        return searcher(text, dictEnabledSet(this.options), this.options.general.softKatakana, this.options.scanning.alphanumeric).then(({definitions, length}) => {
            return {length, definitions: definitions.slice(0, this.options.general.maxResults)};
        });
    }

    kanjiFind(text) {
        return this.translator.findKanji(text, dictEnabledSet(this.options)).then(definitions => {
            return definitions.slice(0, this.options.general.maxResults);
        });
    }

    definitionAdd(definition, mode) {
        let promise = Promise.resolve();
        if (mode !== 'kanji') {
            promise = audioInject(definition, this.options.anki.terms.fields, this.options.general.audioSource);
        }

        return promise.then(() => {
            const note = this.noteFormat(definition, mode);
            return this.anki.addNote(note);
        });
    }

    definitionsAddable(definitions, modes) {
        const notes = [];
        for (const definition of definitions) {
            for (const mode of modes) {
                notes.push(this.noteFormat(definition, mode));
            }
        }

        return this.anki.canAddNotes(notes).then(raw => {
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
    }

    templateRender(template, data) {
        return Promise.resolve(handlebarsRender(template, data));
    }

    onCommand(command) {
        const handlers = {
            search: () => {
                chrome.tabs.create({url: chrome.extension.getURL('/bg/search.html')});
            },

            help: () => {
                chrome.tabs.create({url: 'https://foosoft.net/projects/yomichan/'});
            },

            options: () => {
                chrome.runtime.openOptionsPage();
            },

            toggle: () => {
                this.options.general.enable = !this.options.general.enable;
                optionsSave(this.options).then(() => this.optionsSet(this.options));
            }
        };

        const handler = handlers[command];
        if (handler) {
            handler();
        }
    }

    onMessage({action, params}, sender, callback) {
        const handlers = {
            optionsGet: ({callback}) => {
                promiseCallback(optionsLoad(), callback);
            },

            kanjiFind: ({text, callback}) => {
                promiseCallback(this.kanjiFind(text), callback);
            },

            termsFind: ({text, callback}) => {
                promiseCallback(this.termsFind(text), callback);
            },

            templateRender: ({template, data, callback}) => {
                promiseCallback(this.templateRender(template, data), callback);
            },

            definitionAdd: ({definition, mode, callback}) => {
                promiseCallback(this.definitionAdd(definition, mode), callback);
            },

            definitionsAddable: ({definitions, modes, callback}) => {
                promiseCallback(this.definitionsAddable(definitions, modes), callback);
            }
        };

        const handler = handlers[action];
        if (handler) {
            params.callback = callback;
            handler(params);
        }

        return true;
    }
};
