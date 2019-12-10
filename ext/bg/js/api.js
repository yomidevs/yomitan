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

function apiNoteView(noteId) {
    return utilBackend()._onApiNoteView({noteId});
}

function apiTemplateRender(template, data, dynamic) {
    return utilBackend()._onApiTemplateRender({template, data, dynamic});
}

function apiCommandExec(command, params) {
    return utilBackend()._onApiCommandExec({command, params});
}

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

async function apiClipboardGet() {
    const clipboardPasteTarget = utilBackend().clipboardPasteTarget;
    clipboardPasteTarget.innerText = '';
    clipboardPasteTarget.focus();
    document.execCommand('paste');
    return clipboardPasteTarget.innerText;
}
