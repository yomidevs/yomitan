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

        chrome.runtime.onMessage.addListener(this.onMessage.bind(this));
        if (chrome.runtime.onInstalled) {
            chrome.runtime.onInstalled.addListener(this.onInstalled.bind(this));
        }

        this.translator.prepare().then(optionsLoad).then(this.optionsSet.bind(this));
    }

    optionsSet(options) {
        this.options = options;

        let configured = false;
        for (const title in options.dictionaries) {
            if (options.dictionaries[title].enabled) {
                configured = true;
                break;
            }
        }

        chrome.browserAction.setBadgeBackgroundColor({color: '#f0ad4e'});
        chrome.browserAction.setBadgeText({text: configured ? '' : '!'});

        if (options.anki.enable) {
            this.anki = new AnkiConnect(this.options.anki.server);
        } else {
            this.anki = new AnkiNull();
        }
    }

    noteFormat(definition, mode) {
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

        return searcher(text, dictEnabled(this.options), this.options.general.softKatakana).then(({definitions, length}) => {
            return {length, definitions: definitions.slice(0, this.options.general.maxResults)};
        });
    }

    kanjiFind(text) {
        return this.translator.findKanji(text, dictEnabled(this.options)).then(definitions => {
            return definitions.slice(0, this.options.general.maxResults);
        });
    }

    definitionAdd(definition, mode) {
        const note = this.noteFormat(definition, mode);
        return this.anki.addNote(note);
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

    onInstalled(details) {
        if (details.reason === 'install') {
            chrome.tabs.create({url: chrome.extension.getURL('bg/guide.html')});
        }
    }

    onMessage(request, sender, callback) {
        const handlers = new class {
            api_optionsGet({callback}) {
                promiseCallback(optionsLoad(), callback);
            }

            api_kanjiFind({text, callback}) {
                promiseCallback(this.kanjiFind(text), callback);
            }

            api_termsFind({text, callback}) {
                promiseCallback(this.termsFind(text), callback);
            }

            api_templateRender({template, data, callback}) {
                promiseCallback(this.templateRender(template, data), callback);
            }

            api_definitionAdd({definition, mode, callback}) {
                promiseCallback(this.definitionAdd(definition, mode), callback);
            }

            api_definitionsAddable({definitions, modes, callback}) {
                promiseCallback(this.definitionsAddable(definitions, modes), callback);
            }
        };

        const {action, params} = request, method = handlers[`api_${action}`];
        if (typeof(method) === 'function') {
            params.callback = callback;
            method.call(this, params);
        }

        return true;
    }
};
