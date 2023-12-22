/*
 * Copyright (C) 2023  Yomitan Authors
 * Copyright (C) 2016-2022  Yomichan Authors
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

import {deferPromise} from '../core.js';
import {ExtensionError} from '../core/extension-error.js';
import {parseJson} from '../core/json.js';

export class API {
    /**
     * @param {import('../yomitan.js').Yomitan} yomitan
     */
    constructor(yomitan) {
        /** @type {import('../yomitan.js').Yomitan} */
        this._yomitan = yomitan;
    }

    /**
     * @param {import('api').OptionsGetDetails['optionsContext']} optionsContext
     * @returns {Promise<import('api').OptionsGetResult>}
     */
    optionsGet(optionsContext) {
        /** @type {import('api').OptionsGetDetails} */
        const details = {optionsContext};
        return this._invoke('optionsGet', details);
    }

    /**
     * @returns {Promise<import('api').OptionsGetFullResult>}
     */
    optionsGetFull() {
        return this._invoke('optionsGetFull');
    }

    /**
     * @param {import('api').TermsFindDetails['text']} text
     * @param {import('api').TermsFindDetails['details']} details
     * @param {import('api').TermsFindDetails['optionsContext']} optionsContext
     * @returns {Promise<import('api').TermsFindResult>}
     */
    termsFind(text, details, optionsContext) {
        /** @type {import('api').TermsFindDetails} */
        const details2 = {text, details, optionsContext};
        return this._invoke('termsFind', details2);
    }

    /**
     * @param {import('api').ParseTextDetails['text']} text
     * @param {import('api').ParseTextDetails['optionsContext']} optionsContext
     * @param {import('api').ParseTextDetails['scanLength']} scanLength
     * @param {import('api').ParseTextDetails['useInternalParser']} useInternalParser
     * @param {import('api').ParseTextDetails['useMecabParser']} useMecabParser
     * @returns {Promise<import('api').ParseTextResult>}
     */
    parseText(text, optionsContext, scanLength, useInternalParser, useMecabParser) {
        /** @type {import('api').ParseTextDetails} */
        const details = {text, optionsContext, scanLength, useInternalParser, useMecabParser};
        return this._invoke('parseText', details);
    }

    /**
     * @param {import('api').KanjiFindDetails['text']} text
     * @param {import('api').KanjiFindDetails['optionsContext']} optionsContext
     * @returns {Promise<import('api').KanjiFindResult>}
     */
    kanjiFind(text, optionsContext) {
        /** @type {import('api').KanjiFindDetails} */
        const details = {text, optionsContext};
        return this._invoke('kanjiFind', details);
    }

    /**
     * @returns {Promise<import('api').IsAnkiConnectedResult>}
     */
    isAnkiConnected() {
        return this._invoke('isAnkiConnected');
    }

    /**
     * @returns {Promise<import('api').GetAnkiConnectVersionResult>}
     */
    getAnkiConnectVersion() {
        return this._invoke('getAnkiConnectVersion');
    }

    /**
     * @param {import('api').AddAnkiNoteDetails['note']} note
     * @returns {Promise<import('api').AddAnkiNoteResult>}
     */
    addAnkiNote(note) {
        /** @type {import('api').AddAnkiNoteDetails} */
        const details = {note};
        return this._invoke('addAnkiNote', details);
    }

    /**
     * @param {import('api').GetAnkiNoteInfoDetails['notes']} notes
     * @param {import('api').GetAnkiNoteInfoDetails['fetchAdditionalInfo']} fetchAdditionalInfo
     * @returns {Promise<import('api').GetAnkiNoteInfoResult>}
     */
    getAnkiNoteInfo(notes, fetchAdditionalInfo) {
        /** @type {import('api').GetAnkiNoteInfoDetails} */
        const details = {notes, fetchAdditionalInfo};
        return this._invoke('getAnkiNoteInfo', details);
    }

    /**
     * @param {import('api').InjectAnkiNoteMediaDetails['timestamp']} timestamp
     * @param {import('api').InjectAnkiNoteMediaDetails['definitionDetails']} definitionDetails
     * @param {import('api').InjectAnkiNoteMediaDetails['audioDetails']} audioDetails
     * @param {import('api').InjectAnkiNoteMediaDetails['screenshotDetails']} screenshotDetails
     * @param {import('api').InjectAnkiNoteMediaDetails['clipboardDetails']} clipboardDetails
     * @param {import('api').InjectAnkiNoteMediaDetails['dictionaryMediaDetails']} dictionaryMediaDetails
     * @returns {Promise<import('api').InjectAnkiNoteMediaResult>}
     */
    injectAnkiNoteMedia(timestamp, definitionDetails, audioDetails, screenshotDetails, clipboardDetails, dictionaryMediaDetails) {
        /** @type {import('api').InjectAnkiNoteMediaDetails} */
        const details = {timestamp, definitionDetails, audioDetails, screenshotDetails, clipboardDetails, dictionaryMediaDetails};
        return this._invoke('injectAnkiNoteMedia', details);
    }

    /**
     * @param {import('api').NoteViewDetails['noteId']} noteId
     * @param {import('api').NoteViewDetails['mode']} mode
     * @param {import('api').NoteViewDetails['allowFallback']} allowFallback
     * @returns {Promise<import('api').NoteViewResult>}
     */
    noteView(noteId, mode, allowFallback) {
        /** @type {import('api').NoteViewDetails} */
        const details = {noteId, mode, allowFallback};
        return this._invoke('noteView', details);
    }

    /**
     * @param {import('api').SuspendAnkiCardsForNoteDetails['noteId']} noteId
     * @returns {Promise<import('api').SuspendAnkiCardsForNoteResult>}
     */
    suspendAnkiCardsForNote(noteId) {
        /** @type {import('api').SuspendAnkiCardsForNoteDetails} */
        const details = {noteId};
        return this._invoke('suspendAnkiCardsForNote', details);
    }

    /**
     * @param {import('api').GetTermAudioInfoListDetails['source']} source
     * @param {import('api').GetTermAudioInfoListDetails['term']} term
     * @param {import('api').GetTermAudioInfoListDetails['reading']} reading
     * @returns {Promise<import('api').GetTermAudioInfoListResult>}
     */
    getTermAudioInfoList(source, term, reading) {
        /** @type {import('api').GetTermAudioInfoListDetails} */
        const details = {source, term, reading};
        return this._invoke('getTermAudioInfoList', details);
    }

    /**
     * @param {import('api').CommandExecDetails['command']} command
     * @param {import('api').CommandExecDetails['params']} [params]
     * @returns {Promise<import('api').CommandExecResult>}
     */
    commandExec(command, params) {
        /** @type {import('api').CommandExecDetails} */
        const details = {command, params};
        return this._invoke('commandExec', details);
    }

    /**
     * @param {import('api').SendMessageToFrameDetails['frameId']} frameId
     * @param {import('api').SendMessageToFrameDetails['action']} action
     * @param {import('api').SendMessageToFrameDetails['params']} [params]
     * @returns {Promise<import('api').SendMessageToFrameResult>}
     */
    sendMessageToFrame(frameId, action, params) {
        /** @type {import('api').SendMessageToFrameDetails} */
        const details = {frameId, action, params};
        return this._invoke('sendMessageToFrame', details);
    }

    /**
     * @param {import('api').BroadcastTabDetails['action']} action
     * @param {import('api').BroadcastTabDetails['params']} params
     * @returns {Promise<import('api').BroadcastTabResult>}
     */
    broadcastTab(action, params) {
        /** @type {import('api').BroadcastTabDetails} */
        const details = {action, params};
        return this._invoke('broadcastTab', details);
    }

    /**
     * @returns {Promise<import('api').FrameInformationGetResult>}
     */
    frameInformationGet() {
        return this._invoke('frameInformationGet');
    }

    /**
     * @param {import('api').InjectStylesheetDetails['type']} type
     * @param {import('api').InjectStylesheetDetails['value']} value
     * @returns {Promise<import('api').InjectStylesheetResult>}
     */
    injectStylesheet(type, value) {
        /** @type {import('api').InjectStylesheetDetails} */
        const details = {type, value};
        return this._invoke('injectStylesheet', details);
    }

    /**
     * @param {import('api').GetStylesheetContentDetails['url']} url
     * @returns {Promise<import('api').GetStylesheetContentResult>}
     */
    getStylesheetContent(url) {
        /** @type {import('api').GetStylesheetContentDetails} */
        const details = {url};
        return this._invoke('getStylesheetContent', details);
    }

    /**
     * @returns {Promise<import('api').GetEnvironmentInfoResult>}
     */
    getEnvironmentInfo() {
        return this._invoke('getEnvironmentInfo');
    }

    /**
     * @returns {Promise<import('api').ClipboardGetResult>}
     */
    clipboardGet() {
        return this._invoke('clipboardGet');
    }

    /**
     * @returns {Promise<import('api').GetDisplayTemplatesHtmlResult>}
     */
    getDisplayTemplatesHtml() {
        return this._invoke('getDisplayTemplatesHtml');
    }

    /**
     * @returns {Promise<import('api').GetZoomResult>}
     */
    getZoom() {
        return this._invoke('getZoom');
    }

    /**
     * @returns {Promise<import('api').GetDefaultAnkiFieldTemplatesResult>}
     */
    getDefaultAnkiFieldTemplates() {
        return this._invoke('getDefaultAnkiFieldTemplates');
    }

    /**
     * @returns {Promise<import('api').GetDictionaryInfoResult>}
     */
    getDictionaryInfo() {
        return this._invoke('getDictionaryInfo');
    }

    /**
     * @returns {Promise<import('api').PurgeDatabaseResult>}
     */
    purgeDatabase() {
        return this._invoke('purgeDatabase');
    }

    /**
     * @param {import('api').GetMediaDetails['targets']} targets
     * @returns {Promise<import('api').GetMediaResult>}
     */
    getMedia(targets) {
        /** @type {import('api').GetMediaDetails} */
        const details = {targets};
        return this._invoke('getMedia', details);
    }

    /**
     * @param {import('api').LogDetails['error']} error
     * @param {import('api').LogDetails['level']} level
     * @param {import('api').LogDetails['context']} context
     * @returns {Promise<import('api').LogResult>}
     */
    log(error, level, context) {
        /** @type {import('api').LogDetails} */
        const details = {error, level, context};
        return this._invoke('log', details);
    }

    /**
     * @returns {Promise<import('api').LogIndicatorClearResult>}
     */
    logIndicatorClear() {
        return this._invoke('logIndicatorClear');
    }

    /**
     * @param {import('api').ModifySettingsDetails['targets']} targets
     * @param {import('api').ModifySettingsDetails['source']} source
     * @returns {Promise<import('api').ModifySettingsResult>}
     */
    modifySettings(targets, source) {
        const details = {targets, source};
        return this._invoke('modifySettings', details);
    }

    /**
     * @param {import('api').GetSettingsDetails['targets']} targets
     * @returns {Promise<import('api').GetSettingsResult>}
     */
    getSettings(targets) {
        /** @type {import('api').GetSettingsDetails} */
        const details = {targets};
        return this._invoke('getSettings', details);
    }

    /**
     * @param {import('api').SetAllSettingsDetails['value']} value
     * @param {import('api').SetAllSettingsDetails['source']} source
     * @returns {Promise<import('api').SetAllSettingsResult>}
     */
    setAllSettings(value, source) {
        /** @type {import('api').SetAllSettingsDetails} */
        const details = {value, source};
        return this._invoke('setAllSettings', details);
    }

    /**
     * @param {import('api').GetOrCreateSearchPopupDetails} details
     * @returns {Promise<import('api').GetOrCreateSearchPopupResult>}
     */
    getOrCreateSearchPopup(details) {
        return this._invoke('getOrCreateSearchPopup', details);
    }

    /**
     * @param {import('api').IsTabSearchPopupDetails['tabId']} tabId
     * @returns {Promise<import('api').IsTabSearchPopupResult>}
     */
    isTabSearchPopup(tabId) {
        /** @type {import('api').IsTabSearchPopupDetails} */
        const details = {tabId};
        return this._invoke('isTabSearchPopup', details);
    }

    /**
     * @param {import('api').TriggerDatabaseUpdatedDetails['type']} type
     * @param {import('api').TriggerDatabaseUpdatedDetails['cause']} cause
     * @returns {Promise<import('api').TriggerDatabaseUpdatedResult>}
     */
    triggerDatabaseUpdated(type, cause) {
        /** @type {import('api').TriggerDatabaseUpdatedDetails} */
        const details = {type, cause};
        return this._invoke('triggerDatabaseUpdated', details);
    }

    /**
     * @returns {Promise<import('api').TestMecabResult>}
     */
    testMecab() {
        return this._invoke('testMecab');
    }

    /**
     * @param {import('api').TextHasJapaneseCharactersDetails['text']} text
     * @returns {Promise<import('api').TextHasJapaneseCharactersResult>}
     */
    textHasJapaneseCharacters(text) {
        /** @type {import('api').TextHasJapaneseCharactersDetails} */
        const details = {text};
        return this._invoke('textHasJapaneseCharacters', details);
    }

    /**
     * @param {import('api').GetTermFrequenciesDetails['termReadingList']} termReadingList
     * @param {import('api').GetTermFrequenciesDetails['dictionaries']} dictionaries
     * @returns {Promise<import('api').GetTermFrequenciesResult>}
     */
    getTermFrequencies(termReadingList, dictionaries) {
        /** @type {import('api').GetTermFrequenciesDetails} */
        const details = {termReadingList, dictionaries};
        return this._invoke('getTermFrequencies', details);
    }

    /**
     * @param {import('api').FindAnkiNotesDetails['query']} query
     * @returns {Promise<import('api').FindAnkiNotesResult>}
     */
    findAnkiNotes(query) {
        /** @type {import('api').FindAnkiNotesDetails} */
        const details = {query};
        return this._invoke('findAnkiNotes', details);
    }

    /**
     * @param {import('api').LoadExtensionScriptsDetails['files']} files
     * @returns {Promise<import('api').LoadExtensionScriptsResult>}
     */
    loadExtensionScripts(files) {
        /** @type {import('api').LoadExtensionScriptsDetails} */
        const details = {files};
        return this._invoke('loadExtensionScripts', details);
    }

    /**
     * @param {import('api').OpenCrossFramePortDetails['targetTabId']} targetTabId
     * @param {import('api').OpenCrossFramePortDetails['targetFrameId']} targetFrameId
     * @returns {Promise<import('api').OpenCrossFramePortResult>}
     */
    openCrossFramePort(targetTabId, targetFrameId) {
        return this._invoke('openCrossFramePort', {targetTabId, targetFrameId});
    }

    getTextTransformations(language){
        const result = this._invoke('getTextTransformations', {language});
        return result;
    }

    getLanguages(){
        return this._invoke('getLanguages');
    }

    getLocales(){
        return this._invoke('getLocales');
    }

    getTranslations(language){
        return this._invoke('getTranslations', {language});
    }

    // Utilities

    /**
     * @param {number} timeout
     * @returns {Promise<chrome.runtime.Port>}
     */
    _createActionPort(timeout) {
        return new Promise((resolve, reject) => {
            /** @type {?import('core').Timeout} */
            let timer = null;
            /** @type {import('core').DeferredPromiseDetails<import('api').CreateActionPortResult>} */
            const portDetails = deferPromise();

            /**
             * @param {chrome.runtime.Port} port
             */
            const onConnect = async (port) => {
                try {
                    const {name: expectedName, id: expectedId} = await portDetails.promise;
                    /** @type {import('cross-frame-api').PortDetails} */
                    const portDetails2 = parseJson(port.name);
                    if (portDetails2.name !== expectedName || portDetails2.id !== expectedId || timer === null) { return; }
                } catch (e) {
                    return;
                }

                clearTimeout(timer);
                timer = null;

                chrome.runtime.onConnect.removeListener(onConnect);
                resolve(port);
            };

            /**
             * @param {Error} e
             */
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
            /** @type {Promise<import('api').CreateActionPortResult>} */
            const createActionPortResult = this._invoke('createActionPort');
            createActionPortResult.then(portDetails.resolve, onError);
        });
    }

    /**
     * @template [TReturn=unknown]
     * @param {string} action
     * @param {import('core').SerializableObject} params
     * @param {?(...args: unknown[]) => void} onProgress0
     * @param {number} [timeout]
     * @returns {Promise<TReturn>}
     */
    _invokeWithProgress(action, params, onProgress0, timeout = 5000) {
        return new Promise((resolve, reject) => {
            /** @type {?chrome.runtime.Port} */
            let port = null;

            const onProgress = typeof onProgress0 === 'function' ? onProgress0 : () => {};

            /**
             * @param {import('backend').InvokeWithProgressResponseMessage<TReturn>} message
             */
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
                        reject(ExtensionError.deserialize(message.data));
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
                        port.postMessage(/** @type {import('backend').InvokeWithProgressRequestFragmentMessage} */ ({action: 'fragment', data}));
                    }
                    port.postMessage(/** @type {import('backend').InvokeWithProgressRequestInvokeMessage} */ ({action: 'invoke'}));
                } catch (e) {
                    cleanup();
                    reject(e);
                }
            })();
        });
    }

    /**
     * @template [TReturn=unknown]
     * @param {string} action
     * @param {import('core').SerializableObject} [params]
     * @returns {Promise<TReturn>}
     */
    _invoke(action, params = {}) {
        const data = {action, params};
        return new Promise((resolve, reject) => {
            try {
                this._yomitan.sendMessage(data, (response) => {
                    this._checkLastError(chrome.runtime.lastError);
                    if (response !== null && typeof response === 'object') {
                        if (typeof response.error !== 'undefined') {
                            reject(ExtensionError.deserialize(response.error));
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

    /**
     * @param {chrome.runtime.LastError|undefined} _ignore
     */
    _checkLastError(_ignore) {
        // NOP
    }
}
