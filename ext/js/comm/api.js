/*
 * Copyright (C) 2016-2021  Yomichan Authors
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

class API {
    constructor(yomichan) {
        this._yomichan = yomichan;
    }

    optionsGet(optionsContext) {
        return this._invoke('optionsGet', {optionsContext});
    }

    optionsGetFull() {
        return this._invoke('optionsGetFull');
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

    isAnkiConnected() {
        return this._invoke('isAnkiConnected');
    }

    getAnkiConnectVersion() {
        return this._invoke('getAnkiConnectVersion');
    }

    addAnkiNote(note) {
        return this._invoke('addAnkiNote', {note});
    }

    getAnkiNoteInfo(notes, fetchAdditionalInfo) {
        return this._invoke('getAnkiNoteInfo', {notes, fetchAdditionalInfo});
    }

    injectAnkiNoteMedia(timestamp, definitionDetails, audioDetails, screenshotDetails, clipboardDetails) {
        return this._invoke('injectAnkiNoteMedia', {timestamp, definitionDetails, audioDetails, screenshotDetails, clipboardDetails});
    }

    noteView(noteId) {
        return this._invoke('noteView', {noteId});
    }

    suspendAnkiCardsForNote(noteId) {
        return this._invoke('suspendAnkiCardsForNote', {noteId});
    }

    getTermAudioInfoList(source, term, reading, details) {
        return this._invoke('getTermAudioInfoList', {source, term, reading, details});
    }

    commandExec(command, params) {
        return this._invoke('commandExec', {command, params});
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

    getStylesheetContent(url) {
        return this._invoke('getStylesheetContent', {url});
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

    getZoom() {
        return this._invoke('getZoom');
    }

    getDefaultAnkiFieldTemplates() {
        return this._invoke('getDefaultAnkiFieldTemplates');
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

    getSettings(targets) {
        return this._invoke('getSettings', {targets});
    }

    setAllSettings(value, source) {
        return this._invoke('setAllSettings', {value, source});
    }

    getOrCreateSearchPopup(details) {
        return this._invoke('getOrCreateSearchPopup', isObject(details) ? details : {});
    }

    isTabSearchPopup(tabId) {
        return this._invoke('isTabSearchPopup', {tabId});
    }

    triggerDatabaseUpdated(type, cause) {
        return this._invoke('triggerDatabaseUpdated', {type, cause});
    }

    testMecab() {
        return this._invoke('testMecab', {});
    }

    textHasJapaneseCharacters(text) {
        return this._invoke('textHasJapaneseCharacters', {text});
    }

    // Utilities

    _createActionPort(timeout=5000) {
        return new Promise((resolve, reject) => {
            let timer = null;
            const portDetails = deferPromise();

            const onConnect = async (port) => {
                try {
                    const {name: expectedName, id: expectedId} = await portDetails.promise;
                    const {name, id} = JSON.parse(port.name);
                    if (name !== expectedName || id !== expectedId || timer === null) { return; }
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
                portDetails.reject(e);
                reject(e);
            };

            timer = setTimeout(() => onError(new Error('Timeout')), timeout);

            chrome.runtime.onConnect.addListener(onConnect);
            this._invoke('createActionPort').then(portDetails.resolve, onError);
        });
    }

    _invokeWithProgress(action, params, onProgress, timeout=5000) {
        return new Promise((resolve, reject) => {
            let port = null;

            if (typeof onProgress !== 'function') {
                onProgress = () => {};
            }

            const onMessage = (message) => {
                switch (message.type) {
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
                        reject(deserializeError(message.data));
                        break;
                }
            };

            const onDisconnect = () => {
                cleanup();
                reject(new Error('Disconnected'));
            };

            const cleanup = () => {
                if (port !== null) {
                    port.onMessage.removeListener(onMessage);
                    port.onDisconnect.removeListener(onDisconnect);
                    port.disconnect();
                    port = null;
                }
                onProgress = null;
            };

            (async () => {
                try {
                    port = await this._createActionPort(timeout);
                    port.onMessage.addListener(onMessage);
                    port.onDisconnect.addListener(onDisconnect);

                    // Chrome has a maximum message size that can be sent, so longer messages must be fragmented.
                    const messageString = JSON.stringify({action, params});
                    const fragmentSize = 1e7; // 10 MB
                    for (let i = 0, ii = messageString.length; i < ii; i += fragmentSize) {
                        const data = messageString.substring(i, i + fragmentSize);
                        port.postMessage({action: 'fragment', data});
                    }
                    port.postMessage({action: 'invoke'});
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
                this._yomichan.sendMessage(data, (response) => {
                    this._checkLastError(chrome.runtime.lastError);
                    if (response !== null && typeof response === 'object') {
                        if (typeof response.error !== 'undefined') {
                            reject(deserializeError(response.error));
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
            }
        });
    }

    _checkLastError() {
        // NOP
    }
}
