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


/*
 * Helpers
 */

function utilNoteFormat(definition, mode) {
    const options = chrome.extension.getBackgroundPage().yomichan.options;
    const note = {fields: {}, tags: options.anki.tags};
    let fields = [];

    if (mode === 'kanji') {
        fields = options.anki.kanji.fields;
        note.deckName = options.anki.kanji.deck;
        note.modelName = options.anki.kanji.model;
    } else {
        fields = options.anki.terms.fields;
        note.deckName = options.anki.terms.deck;
        note.modelName = options.anki.terms.model;

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
        note.fields[name] = dictFieldFormat(fields[name], definition, mode, options);
    }

    return note;
}


/*
 * API
 */

async function apiCommandExec(command) {
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
            const options = chrome.extension.getBackgroundPage().yomichan.options;
            options.general.enable = !options.general.enable;
            optionsSave(options).then(() => apiOptionsSet(options));
        }
    };

    const handler = handlers[command];
    if (handler) {
        handler();
    }
}

async function apiOptionsSet(options) {
    // In Firefox, setting options from the options UI somehow carries references
    // to the DOM across to the background page, causing the options object to
    // become a "DeadObject" after the options page is closed. The workaround used
    // here is to create a deep copy of the options object.
    const yomichan = chrome.extension.getBackgroundPage().yomichan;
    yomichan.options = JSON.parse(JSON.stringify(options));

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
        yomichan.anki = new AnkiConnect(options.anki.server);
    } else {
        yomichan.anki = new AnkiNull();
    }

    chrome.tabs.query({}, tabs => {
        for (const tab of tabs) {
            chrome.tabs.sendMessage(tab.id, {action: 'optionsSet', params: options}, () => null);
        }
    });
}

async function apiOptionsGet() {
    return chrome.extension.getBackgroundPage().yomichan.options;
}

async function apiTermsFind(text) {
    const yomichan = chrome.extension.getBackgroundPage().yomichan;
    const options = yomichan.options;
    const translator = yomichan.translator;

    const searcher = options.general.groupResults ?
        translator.findTermsGrouped.bind(translator) :
        translator.findTerms.bind(translator);

    const {definitions, length} = await searcher(
        text,
        dictEnabledSet(options),
        options.scanning.alphanumeric
    );

    return {
        length,
        definitions: definitions.slice(0, options.general.maxResults)
    };
}

async function apiKanjiFind(text) {
    const yomichan = chrome.extension.getBackgroundPage().yomichan;
    const options = yomichan.options;
    const definitions = await yomichan.translator.findKanji(text, dictEnabledSet(options));
    return definitions.slice(0, options.general.maxResults);
}

async function apiDefinitionAdd(definition, mode) {
    const yomichan = chrome.extension.getBackgroundPage().yomichan;

    if (mode !== 'kanji') {
        const options = yomichan.options;
        await audioInject(
            definition,
            options.anki.terms.fields,
            options.general.audioSource
        );
    }

    return yomichan.anki.addNote(utilNoteFormat(definition, mode));
}

async function apiDefinitionsAddable(definitions, modes) {
    const notes = [];
    for (const definition of definitions) {
        for (const mode of modes) {
            notes.push(utilNoteFormat(definition, mode));
        }
    }

    const yomichan = chrome.extension.getBackgroundPage().yomichan;
    const results = await yomichan.anki.canAddNotes(notes);
    const states = [];
    for (let resultBase = 0; resultBase < results.length; resultBase += modes.length) {
        const state = {};
        for (let modeOffset = 0; modeOffset < modes.length; ++modeOffset) {
            state[modes[modeOffset]] = results[resultBase + modeOffset];
        }

        states.push(state);
    }

    return states;
}

async function apiNoteView(noteId) {
    const yomichan = chrome.extension.getBackgroundPage().yomichan;
    return yomichan.anki.guiBrowse(`nid:${noteId}`);
}

async function apiTemplateRender(template, data) {
    return handlebarsRender(template, data);
}
