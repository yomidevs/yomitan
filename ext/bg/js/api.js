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


function apiOptionsGet(optionsContext) {
    return utilBackend().getOptions(optionsContext);
}

async function apiOptionsSet(changedOptions, optionsContext, source) {
    const options = await apiOptionsGet(optionsContext);

    function getValuePaths(obj) {
        const valuePaths = [];
        const nodes = [{obj, path: []}];
        while (nodes.length > 0) {
            const node = nodes.pop();
            for (const key of Object.keys(node.obj)) {
                const path = node.path.concat(key);
                const obj = node.obj[key];
                if (obj !== null && typeof obj === 'object') {
                    nodes.unshift({obj, path});
                } else {
                    valuePaths.push([obj, path]);
                }
            }
        }
        return valuePaths;
    }

    function modifyOption(path, value, options) {
        let pivot = options;
        for (const key of path.slice(0, -1)) {
            if (!hasOwn(pivot, key)) {
                return false;
            }
            pivot = pivot[key];
        }
        pivot[path[path.length - 1]] = value;
        return true;
    }

    for (const [value, path] of getValuePaths(changedOptions)) {
        modifyOption(path, value, options);
    }

    await apiOptionsSave(source);
}

function apiOptionsGetFull() {
    return utilBackend().getFullOptions();
}

async function apiOptionsSave(source) {
    const backend = utilBackend();
    const options = await apiOptionsGetFull();
    await optionsSave(options);
    backend.onOptionsUpdated(source);
}

async function apiTermsFind(text, details, optionsContext) {
    const options = await apiOptionsGet(optionsContext);
    const [definitions, length] = await utilBackend().translator.findTerms(text, details, options);
    definitions.splice(options.general.maxResults);
    return {length, definitions};
}

async function apiTextParse(text, optionsContext) {
    const options = await apiOptionsGet(optionsContext);
    const translator = utilBackend().translator;

    const results = [];
    while (text.length > 0) {
        const term = [];
        const [definitions, sourceLength] = await translator.findTermsInternal(
            text.slice(0, options.scanning.length),
            dictEnabledSet(options),
            options.scanning.alphanumeric,
            {}
        );
        if (definitions.length > 0) {
            dictTermsSort(definitions);
            const {expression, reading} = definitions[0];
            const source = text.slice(0, sourceLength);
            for (const {text, furigana} of jpDistributeFuriganaInflected(expression, reading, source)) {
                const reading = jpConvertReading(text, furigana, options.parsing.readingMode);
                term.push({text, reading});
            }
            text = text.slice(source.length);
        } else {
            const reading = jpConvertReading(text[0], null, options.parsing.readingMode);
            term.push({text: text[0], reading});
            text = text.slice(1);
        }
        results.push(term);
    }
    return results;
}

async function apiTextParseMecab(text, optionsContext) {
    const options = await apiOptionsGet(optionsContext);
    const mecab = utilBackend().mecab;

    const results = {};
    const rawResults = await mecab.parseText(text);
    for (const mecabName in rawResults) {
        const result = [];
        for (const parsedLine of rawResults[mecabName]) {
            for (const {expression, reading, source} of parsedLine) {
                const term = [];
                if (expression !== null && reading !== null) {
                    for (const {text, furigana} of jpDistributeFuriganaInflected(
                        expression,
                        jpKatakanaToHiragana(reading),
                        source
                    )) {
                        const reading = jpConvertReading(text, furigana, options.parsing.readingMode);
                        term.push({text, reading});
                    }
                } else {
                    const reading = jpConvertReading(source, null, options.parsing.readingMode);
                    term.push({text: source, reading});
                }
                result.push(term);
            }
            result.push([{text: '\n'}]);
        }
        results[mecabName] = result;
    }
    return results;
}

async function apiKanjiFind(text, optionsContext) {
    const options = await apiOptionsGet(optionsContext);
    const definitions = await utilBackend().translator.findKanji(text, options);
    definitions.splice(options.general.maxResults);
    return definitions;
}

async function apiDefinitionAdd(definition, mode, context, optionsContext) {
    const options = await apiOptionsGet(optionsContext);

    if (mode !== 'kanji') {
        await audioInject(
            definition,
            options.anki.terms.fields,
            options.audio.sources,
            optionsContext
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

async function apiDefinitionsAddable(definitions, modes, optionsContext) {
    const options = await apiOptionsGet(optionsContext);
    const states = [];

    try {
        const notes = [];
        for (const definition of definitions) {
            for (const mode of modes) {
                const note = await dictNoteFormat(definition, mode, options);
                notes.push(note);
            }
        }

        const cannotAdd = [];
        const anki = utilBackend().anki;
        const results = await anki.canAddNotes(notes);
        for (let resultBase = 0; resultBase < results.length; resultBase += modes.length) {
            const state = {};
            for (let modeOffset = 0; modeOffset < modes.length; ++modeOffset) {
                const index = resultBase + modeOffset;
                const result = results[index];
                const info = {canAdd: result};
                state[modes[modeOffset]] = info;
                if (!result) {
                    cannotAdd.push([notes[index], info]);
                }
            }

            states.push(state);
        }

        if (cannotAdd.length > 0) {
            const noteIdsArray = await anki.findNoteIds(cannotAdd.map(e => e[0]));
            for (let i = 0, ii = Math.min(cannotAdd.length, noteIdsArray.length); i < ii; ++i) {
                const noteIds = noteIdsArray[i];
                if (noteIds.length > 0) {
                    cannotAdd[i][1].noteId = noteIds[0];
                }
            }
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

async function apiCommandExec(command, params) {
    const handlers = apiCommandExec.handlers;
    if (hasOwn(handlers, command)) {
        const handler = handlers[command];
        handler(params);
    }
}
apiCommandExec.handlers = {
    search: async (params) => {
        const url = chrome.runtime.getURL('/bg/search.html');
        if (!(params && params.newTab)) {
            try {
                const tab = await apiFindTab(1000, (url2) => (
                    url2 !== null &&
                    url2.startsWith(url) &&
                    (url2.length === url.length || url2[url.length] === '?' || url2[url.length] === '#')
                ));
                if (tab !== null) {
                    await apiFocusTab(tab);
                    return;
                }
            } catch (e) {
                // NOP
            }
        }
        chrome.tabs.create({url});
    },

    help: () => {
        chrome.tabs.create({url: 'https://foosoft.net/projects/yomichan/'});
    },

    options: (params) => {
        if (!(params && params.newTab)) {
            chrome.runtime.openOptionsPage();
        } else {
            const manifest = chrome.runtime.getManifest();
            const url = chrome.runtime.getURL(manifest.options_ui.page);
            chrome.tabs.create({url});
        }
    },

    toggle: async () => {
        const optionsContext = {
            depth: 0,
            url: window.location.href
        };
        const options = await apiOptionsGet(optionsContext);
        options.general.enable = !options.general.enable;
        await apiOptionsSave('popup');
    }
};

async function apiAudioGetUrl(definition, source, optionsContext) {
    return audioGetUrl(definition, source, optionsContext);
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

function apiFrameInformationGet(sender) {
    const frameId = sender.frameId;
    return Promise.resolve({frameId});
}

function apiInjectStylesheet(css, sender) {
    if (!sender.tab) {
        return Promise.reject(new Error('Invalid tab'));
    }

    const tabId = sender.tab.id;
    const frameId = sender.frameId;
    const details = {
        code: css,
        runAt: 'document_start',
        cssOrigin: 'user',
        allFrames: false
    };
    if (typeof frameId === 'number') {
        details.frameId = frameId;
    }

    return new Promise((resolve, reject) => {
        chrome.tabs.insertCSS(tabId, details, () => {
            const e = chrome.runtime.lastError;
            if (e) {
                reject(new Error(e.message));
            } else {
                resolve();
            }
        });
    });
}

async function apiGetEnvironmentInfo() {
    const browser = await apiGetBrowser();
    const platform = await new Promise((resolve) => chrome.runtime.getPlatformInfo(resolve));
    return {
        browser,
        platform: {
            os: platform.os
        }
    };
}

async function apiGetBrowser() {
    if (EXTENSION_IS_BROWSER_EDGE) {
        return 'edge';
    }
    if (typeof browser !== 'undefined') {
        try {
            const info = await browser.runtime.getBrowserInfo();
            if (info.name === 'Fennec') {
                return 'firefox-mobile';
            }
        } catch (e) { }
        return 'firefox';
    } else {
        return 'chrome';
    }
}

function apiGetTabUrl(tab) {
    return new Promise((resolve) => {
        chrome.tabs.sendMessage(tab.id, {action: 'getUrl'}, {frameId: 0}, (response) => {
            let url = null;
            if (!chrome.runtime.lastError) {
                url = (response !== null && typeof response === 'object' && !Array.isArray(response) ? response.url : null);
                if (url !== null && typeof url !== 'string') {
                    url = null;
                }
            }
            resolve({tab, url});
        });
    });
}

async function apiFindTab(timeout, checkUrl) {
    // This function works around the need to have the "tabs" permission to access tab.url.
    const tabs = await new Promise((resolve) => chrome.tabs.query({}, resolve));
    let matchPromiseResolve = null;
    const matchPromise = new Promise((resolve) => { matchPromiseResolve = resolve; });

    const checkTabUrl = ({tab, url}) => {
        if (checkUrl(url, tab)) {
            matchPromiseResolve(tab);
        }
    };

    const promises = [];
    for (const tab of tabs) {
        const promise = apiGetTabUrl(tab);
        promise.then(checkTabUrl);
        promises.push(promise);
    }

    const racePromises = [
        matchPromise,
        Promise.all(promises).then(() => null)
    ];
    if (typeof timeout === 'number') {
        racePromises.push(new Promise((resolve) => setTimeout(() => resolve(null), timeout)));
    }

    return await Promise.race(racePromises);
}

async function apiFocusTab(tab) {
    await new Promise((resolve, reject) => {
        chrome.tabs.update(tab.id, {active: true}, () => {
            const e = chrome.runtime.lastError;
            if (e) { reject(e); }
            else { resolve(); }
        });
    });

    if (!(typeof chrome.windows === 'object' && chrome.windows !== null)) {
        // Windows not supported (e.g. on Firefox mobile)
        return;
    }

    try {
        const tabWindow = await new Promise((resolve) => {
            chrome.windows.get(tab.windowId, {}, (tabWindow) => {
                const e = chrome.runtime.lastError;
                if (e) { reject(e); }
                else { resolve(tabWindow); }
            });
        });
        if (!tabWindow.focused) {
            await new Promise((resolve, reject) => {
                chrome.windows.update(tab.windowId, {focused: true}, () => {
                    const e = chrome.runtime.lastError;
                    if (e) { reject(e); }
                    else { resolve(); }
                });
            });
        }
    } catch (e) {
        // Edge throws exception for no reason here.
    }
}

async function apiClipboardGet() {
    const clipboardPasteTarget = utilBackend().clipboardPasteTarget;
    clipboardPasteTarget.innerText = '';
    clipboardPasteTarget.focus();
    document.execCommand('paste');
    return clipboardPasteTarget.innerText;
}
