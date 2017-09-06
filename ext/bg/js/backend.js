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
        this.options = null;
        this.sequence = 0;
    }

    async prepare() {
        await this.translator.prepare();
        await apiOptionsSet(await optionsLoad());

        chrome.commands.onCommand.addListener(this.onCommand.bind(this));
        chrome.runtime.onMessage.addListener(this.onMessage.bind(this));

        if (this.options.general.showGuide) {
            chrome.tabs.create({url: chrome.extension.getURL('/bg/guide.html')});
        }
    }

    sequenceNew() {
        return this.sequence++;
    }

    sandbox() {
        return document.getElementById('sandbox').contentWindow;
    }

    onOptionsUpdated(options) {
        this.options = utilIsolate(options);

        if (!options.general.enable) {
            chrome.browserAction.setBadgeBackgroundColor({color: '#555555'});
            chrome.browserAction.setBadgeText({text: 'off'});
        } else if (!dictConfigured(options)) {
            chrome.browserAction.setBadgeBackgroundColor({color: '#f0ad4e'});
            chrome.browserAction.setBadgeText({text: '!'});
        } else {
            chrome.browserAction.setBadgeText({text: ''});
        }

        if (options.anki.enable) {
            this.anki = new AnkiConnect(options.anki.server);
        } else {
            this.anki = new AnkiNull();
        }

        chrome.tabs.query({}, tabs => {
            for (const tab of tabs) {
                chrome.tabs.sendMessage(tab.id, {action: 'optionsSet', params: options}, () => null);
            }
        });
    }

    onCommand(command) {
        apiCommandExec(command);
    }

    onMessage({action, params}, sender, callback) {
        const forward = (promise, callback) => {
            return promise.then(result => {
                callback({result});
            }).catch(error => {
                callback({error});
            });
        };

        const handlers = {
            optionsGet: ({callback}) => {
                forward(apiOptionsGet(), callback);
            },

            optionsSet: ({options, callback}) => {
                forward(apiOptionsSet(options), callback);
            },

            kanjiFind: ({text, callback}) => {
                forward(apiKanjiFind(text), callback);
            },

            termsFind: ({text, callback}) => {
                forward(apiTermsFind(text), callback);
            },

            definitionAdd: ({definition, mode, callback}) => {
                forward(apiDefinitionAdd(definition, mode), callback);
            },

            definitionsAddable: ({definitions, modes, callback}) => {
                forward(apiDefinitionsAddable(definitions, modes), callback);
            },

            noteView: ({noteId}) => {
                forward(apiNoteView(noteId), callback);
            },

            templateRender: ({template, data, dynamic, callback}) => {
                forward(apiTemplateRender(template, data, dynamic), callback);
            },

            commandExec: ({command, callback}) => {
                forward(apiCommandExec(command), callback);
            },

            audioGetUrl: ({definition, source, callback}) => {
                forward(apiAudioGetUrl(definition, source), callback);
            }
        };

        const handler = handlers[action];
        if (handler) {
            params.callback = callback;
            handler(params);
        }

        return true;
    }
}

window.yomichan_backend = new Backend();
window.yomichan_backend.prepare();
