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

const api = (() => {
    class API {
        constructor() {
            this._forwardLogsToBackendEnabled = false;
        }

        forwardLogsToBackend() {
            if (this._forwardLogsToBackendEnabled) { return; }
            this._forwardLogsToBackendEnabled = true;

            yomichan.on('log', async ({error, level, context}) => {
                try {
                    await this.log(errorToJson(error), level, context);
                } catch (e) {
                    // NOP
                }
            });
        }

        // Invoke functions

        optionsSchemaGet() {
            return this._invoke('optionsSchemaGet');
        }

        optionsGet(optionsContext) {
            return this._invoke('optionsGet', {optionsContext});
        }

        optionsGetFull() {
            return this._invoke('optionsGetFull');
        }

        optionsSave(source) {
            return this._invoke('optionsSave', {source});
        }

        termsFind(text, details, optionsContext) {
            return this._invoke('termsFind', {text, details, optionsContext});
        }

        textParse(text, optionsContext) {
            return this._invoke('textParse', {text, optionsContext});
        }

        kanjiFind(text, optionsContext) {
            return this._invoke('kanjiFind', {text, optionsContext});
        }

        definitionAdd(definition, mode, context, details, optionsContext) {
            return this._invoke('definitionAdd', {definition, mode, context, details, optionsContext});
        }

        definitionsAddable(definitions, modes, context, optionsContext) {
            return this._invoke('definitionsAddable', {definitions, modes, context, optionsContext});
        }

        noteView(noteId) {
            return this._invoke('noteView', {noteId});
        }

        templateRender(template, data) {
            return this._invoke('templateRender', {data, template});
        }

        audioGetUri(definition, source, details) {
            return this._invoke('audioGetUri', {definition, source, details});
        }

        commandExec(command, params) {
            return this._invoke('commandExec', {command, params});
        }

        screenshotGet(options) {
            return this._invoke('screenshotGet', {options});
        }

        sendMessageToFrame(frameId, action, params) {
            return this._invoke('sendMessageToFrame', {frameId, action, params});
        }

        broadcastTab(action, params) {
            return this._invoke('broadcastTab', {action, params});
        }

        frameInformationGet() {
            return this._invoke('frameInformationGet');
        }

        injectStylesheet(type, value) {
            return this._invoke('injectStylesheet', {type, value});
        }

        getEnvironmentInfo() {
            return this._invoke('getEnvironmentInfo');
        }

        clipboardGet() {
            return this._invoke('clipboardGet');
        }

        getDisplayTemplatesHtml() {
            return this._invoke('getDisplayTemplatesHtml');
        }

        getQueryParserTemplatesHtml() {
            return this._invoke('getQueryParserTemplatesHtml');
        }

        getZoom() {
            return this._invoke('getZoom');
        }

        getDefaultAnkiFieldTemplates() {
            return this._invoke('getDefaultAnkiFieldTemplates');
        }

        getAnkiDeckNames() {
            return this._invoke('getAnkiDeckNames');
        }

        getAnkiModelNames() {
            return this._invoke('getAnkiModelNames');
        }

        getAnkiModelFieldNames(modelName) {
            return this._invoke('getAnkiModelFieldNames', {modelName});
        }

        getDictionaryInfo() {
            return this._invoke('getDictionaryInfo');
        }

        getDictionaryCounts(dictionaryNames, getTotal) {
            return this._invoke('getDictionaryCounts', {dictionaryNames, getTotal});
        }

        purgeDatabase() {
            return this._invoke('purgeDatabase');
        }

        getMedia(targets) {
            return this._invoke('getMedia', {targets});
        }

        log(error, level, context) {
            return this._invoke('log', {error, level, context});
        }

        logIndicatorClear() {
            return this._invoke('logIndicatorClear');
        }

        modifySettings(targets, source) {
            return this._invoke('modifySettings', {targets, source});
        }

        // Invoke functions with progress

        importDictionaryArchive(archiveContent, details, onProgress) {
            return this._invokeWithProgress('importDictionaryArchive', {archiveContent, details}, onProgress);
        }

        deleteDictionary(dictionaryName, onProgress) {
            return this._invokeWithProgress('deleteDictionary', {dictionaryName}, onProgress);
        }

        // Utilities

        _createActionPort(timeout=5000) {
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
                this._invoke('createActionPort').then(portNameResolve, onError);
            });
        }

        _invokeWithProgress(action, params, onProgress, timeout=5000) {
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
                                onProgress(...message.data);
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
                        port = await this._createActionPort(timeout);
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

        _invoke(action, params={}) {
            const data = {action, params};
            return new Promise((resolve, reject) => {
                try {
                    chrome.runtime.sendMessage(data, (response) => {
                        this._checkLastError(chrome.runtime.lastError);
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

        _checkLastError() {
            // NOP
        }
    }

    return new API();
})();
