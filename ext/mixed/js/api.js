/*
 * Copyright (C) 2016-2020  Yomichan Authors
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
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */


function apiOptionsSchemaGet() {
    return _apiInvoke('optionsSchemaGet');
}

function apiOptionsGet(optionsContext) {
    return _apiInvoke('optionsGet', {optionsContext});
}

function apiOptionsGetFull() {
    return _apiInvoke('optionsGetFull');
}

function apiOptionsSet(changedOptions, optionsContext, source) {
    return _apiInvoke('optionsSet', {changedOptions, optionsContext, source});
}

function apiOptionsSave(source) {
    return _apiInvoke('optionsSave', {source});
}

function apiTermsFind(text, details, optionsContext) {
    return _apiInvoke('termsFind', {text, details, optionsContext});
}

function apiTextParse(text, optionsContext) {
    return _apiInvoke('textParse', {text, optionsContext});
}

function apiKanjiFind(text, optionsContext) {
    return _apiInvoke('kanjiFind', {text, optionsContext});
}

function apiDefinitionAdd(definition, mode, context, details, optionsContext) {
    return _apiInvoke('definitionAdd', {definition, mode, context, details, optionsContext});
}

function apiDefinitionsAddable(definitions, modes, context, optionsContext) {
    return _apiInvoke('definitionsAddable', {definitions, modes, context, optionsContext});
}

function apiNoteView(noteId) {
    return _apiInvoke('noteView', {noteId});
}

function apiTemplateRender(template, data) {
    return _apiInvoke('templateRender', {data, template});
}

function apiAudioGetUri(definition, source, details) {
    return _apiInvoke('audioGetUri', {definition, source, details});
}

function apiCommandExec(command, params) {
    return _apiInvoke('commandExec', {command, params});
}

function apiScreenshotGet(options) {
    return _apiInvoke('screenshotGet', {options});
}

function apiBroadcastTab(action, params) {
    return _apiInvoke('broadcastTab', {action, params});
}

function apiFrameInformationGet() {
    return _apiInvoke('frameInformationGet');
}

function apiInjectStylesheet(type, value) {
    return _apiInvoke('injectStylesheet', {type, value});
}

function apiGetEnvironmentInfo() {
    return _apiInvoke('getEnvironmentInfo');
}

function apiClipboardGet() {
    return _apiInvoke('clipboardGet');
}

function apiGetDisplayTemplatesHtml() {
    return _apiInvoke('getDisplayTemplatesHtml');
}

function apiGetQueryParserTemplatesHtml() {
    return _apiInvoke('getQueryParserTemplatesHtml');
}

function apiGetZoom() {
    return _apiInvoke('getZoom');
}

function apiGetMessageToken() {
    return _apiInvoke('getMessageToken');
}

function apiGetDefaultAnkiFieldTemplates() {
    return _apiInvoke('getDefaultAnkiFieldTemplates');
}

function apiGetAnkiDeckNames() {
    return _apiInvoke('getAnkiDeckNames');
}

function apiGetAnkiModelNames() {
    return _apiInvoke('getAnkiModelNames');
}

function apiGetAnkiModelFieldNames(modelName) {
    return _apiInvoke('getAnkiModelFieldNames', {modelName});
}

function apiGetDictionaryInfo() {
    return _apiInvoke('getDictionaryInfo');
}

function apiGetDictionaryCounts(dictionaryNames, getTotal) {
    return _apiInvoke('getDictionaryCounts', {dictionaryNames, getTotal});
}

function apiPurgeDatabase() {
    return _apiInvoke('purgeDatabase');
}

function apiGetMedia(targets) {
    return _apiInvoke('getMedia', {targets});
}

function apiLog(error, level, context) {
    return _apiInvoke('log', {error, level, context});
}

function apiLogIndicatorClear() {
    return _apiInvoke('logIndicatorClear');
}

function _apiCreateActionPort(timeout=5000) {
    return new Promise((resolve, reject) => {
        let timer = null;
        let portNameResolve;
        let portNameReject;
        const portNamePromise = new Promise((resolve2, reject2) => {
            portNameResolve = resolve2;
            portNameReject = reject2;
        });

        const onConnect = async (port) => {
            try {
                const portName = await portNamePromise;
                if (port.name !== portName || timer === null) { return; }
            } catch (e) {
                return;
            }

            clearTimeout(timer);
            timer = null;

            chrome.runtime.onConnect.removeListener(onConnect);
            resolve(port);
        };

        const onError = (e) => {
            if (timer !== null) {
                clearTimeout(timer);
                timer = null;
            }
            chrome.runtime.onConnect.removeListener(onConnect);
            portNameReject(e);
            reject(e);
        };

        timer = setTimeout(() => onError(new Error('Timeout')), timeout);

        chrome.runtime.onConnect.addListener(onConnect);
        _apiInvoke('createActionPort').then(portNameResolve, onError);
    });
}

function _apiInvokeWithProgress(action, params, onProgress, timeout=5000) {
    return new Promise((resolve, reject) => {
        let timer = null;
        let port = null;

        if (typeof onProgress !== 'function') {
            onProgress = () => {};
        }

        const onMessage = (message) => {
            switch (message.type) {
                case 'ack':
                    if (timer !== null) {
                        clearTimeout(timer);
                        timer = null;
                    }
                    break;
                case 'progress':
                    try {
                        onProgress(message.data);
                    } catch (e) {
                        // NOP
                    }
                    break;
                case 'complete':
                    cleanup();
                    resolve(message.data);
                    break;
                case 'error':
                    cleanup();
                    reject(jsonToError(message.data));
                    break;
            }
        };

        const onDisconnect = () => {
            cleanup();
            reject(new Error('Disconnected'));
        };

        const cleanup = () => {
            if (timer !== null) {
                clearTimeout(timer);
                timer = null;
            }
            if (port !== null) {
                port.onMessage.removeListener(onMessage);
                port.onDisconnect.removeListener(onDisconnect);
                port.disconnect();
                port = null;
            }
            onProgress = null;
        };

        timer = setTimeout(() => {
            cleanup();
            reject(new Error('Timeout'));
        }, timeout);

        (async () => {
            try {
                port = await _apiCreateActionPort(timeout);
                port.onMessage.addListener(onMessage);
                port.onDisconnect.addListener(onDisconnect);
                port.postMessage({action, params});
            } catch (e) {
                cleanup();
                reject(e);
            } finally {
                action = null;
                params = null;
            }
        })();
    });
}

function _apiInvoke(action, params={}) {
    const data = {action, params};
    return new Promise((resolve, reject) => {
        try {
            chrome.runtime.sendMessage(data, (response) => {
                _apiCheckLastError(chrome.runtime.lastError);
                if (response !== null && typeof response === 'object') {
                    if (typeof response.error !== 'undefined') {
                        reject(jsonToError(response.error));
                    } else {
                        resolve(response.result);
                    }
                } else {
                    const message = response === null ? 'Unexpected null response' : `Unexpected response of type ${typeof response}`;
                    reject(new Error(`${message} (${JSON.stringify(data)})`));
                }
            });
        } catch (e) {
            reject(e);
            yomichan.triggerOrphaned(e);
        }
    });
}

function _apiCheckLastError() {
    // NOP
}

let _apiForwardLogsToBackendEnabled = false;
function apiForwardLogsToBackend() {
    if (_apiForwardLogsToBackendEnabled) { return; }
    _apiForwardLogsToBackendEnabled = true;

    yomichan.on('log', async ({error, level, context}) => {
        try {
            await apiLog(errorToJson(error), level, context);
        } catch (e) {
            // NOP
        }
    });
}
