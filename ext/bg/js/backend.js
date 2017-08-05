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
        this.translator = new Translator();
        this.anki = new AnkiNull();
        this.options = null;

        this.translator.prepare().then(optionsLoad).then(options => {
            apiOptionsSet(options);

            chrome.commands.onCommand.addListener(apiCommandExec);
            chrome.runtime.onMessage.addListener(({action, params}, sender, callback) => {
                const forward = (promise, callback) => {
                    return promise.then(result => {
                        callback({result});
                    }).catch(error => {
                        callback({error});
                    });
                };

                const handlers = {
                    optionsGet: ({callback}) => {
                        forward(optionsLoad(), callback);
                    },

                    kanjiFind: ({text, callback}) => {
                        forward(apiKanjiFind(text), callback);
                    },

                    termsFind: ({text, callback}) => {
                        forward(apiTermsFind(text), callback);
                    },

                    templateRender: ({template, data, callback}) => {
                        forward(apiTemplateRender(template, data), callback);
                    },

                    definitionAdd: ({definition, mode, callback}) => {
                        forward(apiDefinitionAdd(definition, mode), callback);
                    },

                    definitionsAddable: ({definitions, modes, callback}) => {
                        forward(apiDefinitionsAddable(definitions, modes), callback);
                    },

                    noteView: ({noteId}) => {
                        forward(apiNoteView(noteId), callback);
                    }
                };

                const handler = handlers[action];
                if (handler) {
                    params.callback = callback;
                    handler(params);
                }

                return true;
            });

            if (options.general.showGuide) {
                chrome.tabs.create({url: chrome.extension.getURL('/bg/guide.html')});
            }
        });
    }
};
