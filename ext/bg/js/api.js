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


async function apiOptionsSet(options) {
    utilBackend().onOptionsUpdated(options);
}

async function apiOptionsGet() {
    return utilBackend().options;
}

async function apiTermsFind(text) {
    const options = utilBackend().options;
    const translator = utilBackend().translator;

    const searcher = {
        'merge': translator.findTermsMerged,
        'split': translator.findTermsSplit,
        'group': translator.findTermsGrouped
    }[options.general.resultOutputMode].bind(translator);

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
    const options = utilBackend().options;
    const definitions = await utilBackend().translator.findKanji(text, dictEnabledSet(options));
    return definitions.slice(0, options.general.maxResults);
}

async function apiDefinitionAdd(definition, mode, context) {
    const options = utilBackend().options;

    if (mode !== 'kanji') {
        await audioInject(
            definition,
            options.anki.terms.fields,
            options.general.audioSource
        );
    }

    if (context && context.screenshot) {
        await apiInjectScreenshot(
            definition,
            options.anki.terms.fields,
            context.screenshot
        );
    }

    const note = await dictNoteFormat(definition, mode, options);
    return utilBackend().anki.addNote(note);
}

async function apiDefinitionsAddable(definitions, modes) {
    const states = [];

    try {
        const notes = [];
        for (const definition of definitions) {
            for (const mode of modes) {
                const note = await dictNoteFormat(definition, mode, utilBackend().options);
                notes.push(note);
            }
        }

        const results = await utilBackend().anki.canAddNotes(notes);
        for (let resultBase = 0; resultBase < results.length; resultBase += modes.length) {
            const state = {};
            for (let modeOffset = 0; modeOffset < modes.length; ++modeOffset) {
                state[modes[modeOffset]] = results[resultBase + modeOffset];
            }

            states.push(state);
        }
    } catch (e) {
        // NOP
    }

    return states;
}

async function apiNoteView(noteId) {
    return utilBackend().anki.guiBrowse(`nid:${noteId}`);
}

async function apiTemplateRender(template, data, dynamic) {
    if (dynamic) {
        return handlebarsRenderDynamic(template, data);
    } else {
        return handlebarsRenderStatic(template, data);
    }
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
            const options = utilBackend().options;
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

async function apiAudioGetUrl(definition, source) {
    return audioBuildUrl(definition, source);
}

async function apiInjectScreenshot(definition, fields, screenshot) {
    let usesScreenshot = false;
    for (const name in fields) {
        if (fields[name].includes('{screenshot}')) {
            usesScreenshot = true;
            break;
        }
    }

    if (!usesScreenshot) {
        return;
    }

    const dateToString = (date) => {
        const year = date.getUTCFullYear();
        const month = date.getUTCMonth().toString().padStart(2, '0');
        const day = date.getUTCDate().toString().padStart(2, '0');
        const hours = date.getUTCHours().toString().padStart(2, '0');
        const minutes = date.getUTCMinutes().toString().padStart(2, '0');
        const seconds = date.getUTCSeconds().toString().padStart(2, '0');
        return `${year}-${month}-${day}-${hours}-${minutes}-${seconds}`;
    };

    const now = new Date(Date.now());
    const filename = `yomichan_browser_screenshot_${definition.reading}_${dateToString(now)}.${screenshot.format}`;
    const data = screenshot.dataUrl.replace(/^data:[\w\W]*?,/, '');

    try {
        await utilBackend().anki.storeMediaFile(filename, data);
    } catch (e) {
        return;
    }

    definition.screenshotFileName = filename;
}

function apiScreenshotGet(options, sender) {
    if (!(sender && sender.tab)) {
        return Promise.resolve();
    }

    const windowId = sender.tab.windowId;
    return new Promise((resolve) => {
        chrome.tabs.captureVisibleTab(windowId, options, (dataUrl) => resolve(dataUrl));
    });
}

function apiForward(action, params, sender) {
    if (!(sender && sender.tab)) {
        return Promise.resolve();
    }

    const tabId = sender.tab.id;
    return new Promise((resolve) => {
        chrome.tabs.sendMessage(tabId, {action, params}, (response) => resolve(response));
    });
}
