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
 * Backend
 */

function backend() {
    return chrome.extension.getBackgroundPage().yomichan_backend;
}


/*
 * API
 */

async function apiOptionsSet(options) {
    // In Firefox, setting options from the options UI somehow carries references
    // to the DOM across to the background page, causing the options object to
    // become a "DeadObject" after the options page is closed. The workaround used
    // here is to create a deep copy of the options object.
    backend().optionsSet(JSON.parse(JSON.stringify(options)));
}

async function apiOptionsGet() {
    return backend().options;
}

async function apiTermsFind(text) {
    const options = backend().options;
    const translator = backend().translator;

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
    const options = backend().options;
    const definitions = await backend().translator.findKanji(text, dictEnabledSet(options));
    return definitions.slice(0, options.general.maxResults);
}

async function apiDefinitionAdd(definition, mode) {
    const options = backend().options;

    if (mode !== 'kanji') {
        await audioInject(
            definition,
            options.anki.terms.fields,
            options.general.audioSource
        );
    }

    return backend().anki.addNote(dictNoteFormat(definition, mode, options));
}

async function apiDefinitionsAddable(definitions, modes) {
    const notes = [];
    for (const definition of definitions) {
        for (const mode of modes) {
            notes.push(dictNoteFormat(definition, mode, backend().options));
        }
    }

    const results = await backend().anki.canAddNotes(notes);
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
    return backend().anki.guiBrowse(`nid:${noteId}`);
}

async function apiTemplateRender(template, data) {
    return handlebarsRender(template, data);
}

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

        toggle: async () => {
            const options = backend().options;
            options.general.enable = !options.general.enable;
            await optionsSave(options);
            await apiOptionsSet(options);
        }
    };

    const handler = handlers[command];
    if (handler) {
        handler();
    }
}

