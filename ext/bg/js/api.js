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
    return utilBackend()._onApiOptionsGet({optionsContext});
}

function apiOptionsSet(changedOptions, optionsContext, source) {
    return utilBackend()._onApiOptionsSet({changedOptions, optionsContext, source});
}

function apiOptionsGetFull() {
    return utilBackend()._onApiOptionsGetFull();
}

function apiOptionsSave(source) {
    return utilBackend()._onApiOptionsSave({source});
}

function apiTermsFind(text, details, optionsContext) {
    return utilBackend()._onApiTermsFind({text, details, optionsContext});
}

function apiTextParse(text, optionsContext) {
    return utilBackend()._onApiTextParse({text, optionsContext});
}

function apiTextParseMecab(text, optionsContext) {
    return utilBackend()._onApiTextParseMecab({text, optionsContext});
}

function apiKanjiFind(text, optionsContext) {
    return utilBackend()._onApiKanjiFind({text, optionsContext});
}

function apiDefinitionAdd(definition, mode, context, optionsContext) {
    return utilBackend()._onApiDefinitionAdd({definition, mode, context, optionsContext});
}

function apiDefinitionsAddable(definitions, modes, optionsContext) {
    return utilBackend()._onApiDefinitionsAddable({definitions, modes, optionsContext});
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
                const tab = await _apiFindTab(1000, (url2) => (
                    url2 !== null &&
                    url2.startsWith(url) &&
                    (url2.length === url.length || url2[url.length] === '?' || url2[url.length] === '#')
                ));
                if (tab !== null) {
                    await _apiFocusTab(tab);
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
    const browser = await _apiGetBrowser();
    const platform = await new Promise((resolve) => chrome.runtime.getPlatformInfo(resolve));
    return {
        browser,
        platform: {
            os: platform.os
        }
    };
}

async function _apiGetBrowser() {
    if (EXTENSION_IS_BROWSER_EDGE) {
        return 'edge';
    }
    if (typeof browser !== 'undefined') {
        try {
            const info = await browser.runtime.getBrowserInfo();
            if (info.name === 'Fennec') {
                return 'firefox-mobile';
            }
        } catch (e) {
            // NOP
        }
        return 'firefox';
    } else {
        return 'chrome';
    }
}

function _apiGetTabUrl(tab) {
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

async function _apiFindTab(timeout, checkUrl) {
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
        const promise = _apiGetTabUrl(tab);
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

async function _apiFocusTab(tab) {
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
