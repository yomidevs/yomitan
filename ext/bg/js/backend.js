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

        this.apiForwarder = new BackendApiForwarder();
    }

    async prepare() {
        await this.translator.prepare();
        await apiOptionsSet(await optionsLoad());

        if (chrome.commands !== null && typeof chrome.commands === 'object') {
            chrome.commands.onCommand.addListener(this.onCommand.bind(this));
        }
        chrome.runtime.onMessage.addListener(this.onMessage.bind(this));

        if (this.options.general.showGuide) {
            chrome.tabs.create({url: chrome.extension.getURL('/bg/guide.html')});
        }
    }

    onOptionsUpdated(options) {
        this.options = utilIsolate(options);

        if (!options.general.enable) {
            this.setExtensionBadgeBackgroundColor('#555555');
            this.setExtensionBadgeText('off');
        } else if (!dictConfigured(options)) {
            this.setExtensionBadgeBackgroundColor('#f0ad4e');
            this.setExtensionBadgeText('!');
        } else {
            this.setExtensionBadgeText('');
        }

        if (options.anki.enable) {
            this.anki = new AnkiConnect(options.anki.server);
        } else {
            this.anki = new AnkiNull();
        }

        const callback = () => this.checkLastError(chrome.runtime.lastError);
        chrome.tabs.query({}, tabs => {
            for (const tab of tabs) {
                chrome.tabs.sendMessage(tab.id, {action: 'optionsSet', params: options}, callback);
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
                callback({error: error.toString ? error.toString() : error});
            });
        };

        const handlers = {
            optionsGet: ({callback}) => {
                forward(apiOptionsGet(), callback);
            },

            kanjiFind: ({text, callback}) => {
                forward(apiKanjiFind(text), callback);
            },

            termsFind: ({text, callback}) => {
                forward(apiTermsFind(text), callback);
            },

            definitionAdd: ({definition, mode, context, callback}) => {
                forward(apiDefinitionAdd(definition, mode, context), callback);
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
            },

            screenshotGet: ({options}) => {
                forward(apiScreenshotGet(options, sender), callback);
            },

            forward: ({action, params}) => {
                forward(apiForward(action, params, sender), callback);
            },

            frameInformationGet: () => {
                forward(apiFrameInformationGet(sender), callback);
            }
        };

        const handler = handlers[action];
        if (handler) {
            params.callback = callback;
            handler(params);
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

    checkLastError(e) {
        // NOP
    }
}

window.yomichan_backend = new Backend();
window.yomichan_backend.prepare();
