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

import {deserializeError, isObject} from '../core.js';
import {ArrayBufferUtil} from '../data/sandbox/array-buffer-util.js';

export class OffscreenProxy {
    constructor() {
        this._creatingOffscreen = null;
    }

    // https://developer.chrome.com/docs/extensions/reference/offscreen/
    async prepare() {
        if (await this._hasOffscreenDocument()) {
            return;
        }
        if (this._creatingOffscreen) {
            await this._creatingOffscreen;
            return;
        }

        this._creatingOffscreen = chrome.offscreen.createDocument({
            url: 'offscreen.html',
            reasons: ['CLIPBOARD'],
            justification: 'Access to the clipboard'
        });
        await this._creatingOffscreen;
        this._creatingOffscreen = null;
    }

    async _hasOffscreenDocument() {
        const offscreenUrl = chrome.runtime.getURL('offscreen.html');
        if (!chrome.runtime.getContexts) { // chrome version <116
            const matchedClients = await clients.matchAll();
            return await matchedClients.some((client) => client.url === offscreenUrl);
        }

        const contexts = await chrome.runtime.getContexts({
            contextTypes: ['OFFSCREEN_DOCUMENT'],
            documentUrls: [offscreenUrl]
        });
        return !!contexts.length;
    }

    sendMessagePromise(...args) {
        return new Promise((resolve, reject) => {
            const callback = (response) => {
                try {
                    resolve(this._getMessageResponseResult(response));
                } catch (error) {
                    reject(error);
                }
            };

            chrome.runtime.sendMessage(...args, callback);
        });
    }

    _getMessageResponseResult(response) {
        let error = chrome.runtime.lastError;
        if (error) {
            throw new Error(error.message);
        }
        if (!isObject(response)) {
            throw new Error('Offscreen document did not respond');
        }
        error = response.error;
        if (error) {
            throw deserializeError(error);
        }
        return response.result;
    }
}

export class DictionaryDatabaseProxy {
    constructor(offscreen) {
        this._offscreen = offscreen;
    }

    prepare() {
        return this._offscreen.sendMessagePromise({action: 'databasePrepareOffscreen'});
    }

    getDictionaryInfo() {
        return this._offscreen.sendMessagePromise({action: 'getDictionaryInfoOffscreen'});
    }

    purge() {
        return this._offscreen.sendMessagePromise({action: 'databasePurgeOffscreen'});
    }

    async getMedia(targets) {
        const serializedMedia = await this._offscreen.sendMessagePromise({action: 'databaseGetMediaOffscreen', params: {targets}});
        const media = serializedMedia.map((m) => ({...m, content: ArrayBufferUtil.base64ToArrayBuffer(m.content)}));
        return media;
    }
}

export class TranslatorProxy {
    constructor(offscreen) {
        this._offscreen = offscreen;
    }

    prepare(deinflectionReasons) {
        return this._offscreen.sendMessagePromise({action: 'translatorPrepareOffscreen', params: {deinflectionReasons}});
    }

    async findKanji(text, findKanjiOptions) {
        const enabledDictionaryMapList = [...findKanjiOptions.enabledDictionaryMap];
        const modifiedKanjiOptions = {
            ...findKanjiOptions,
            enabledDictionaryMap: enabledDictionaryMapList
        };
        return this._offscreen.sendMessagePromise({action: 'findKanjiOffscreen', params: {text, findKanjiOptions: modifiedKanjiOptions}});
    }

    async findTerms(mode, text, findTermsOptions) {
        const {enabledDictionaryMap, excludeDictionaryDefinitions, textReplacements} = findTermsOptions;
        const enabledDictionaryMapList = [...enabledDictionaryMap];
        const excludeDictionaryDefinitionsList = excludeDictionaryDefinitions ? [...excludeDictionaryDefinitions] : null;
        const textReplacementsSerialized = textReplacements.map((group) => {
            if (!group) {
                return group;
            }
            return group.map((opt) => ({...opt, pattern: opt.pattern.toString()}));
        });
        const modifiedFindTermsOptions = {
            ...findTermsOptions,
            enabledDictionaryMap: enabledDictionaryMapList,
            excludeDictionaryDefinitions: excludeDictionaryDefinitionsList,
            textReplacements: textReplacementsSerialized
        };
        return this._offscreen.sendMessagePromise({action: 'findTermsOffscreen', params: {mode, text, findTermsOptions: modifiedFindTermsOptions}});
    }

    async getTermFrequencies(termReadingList, dictionaries) {
        return this._offscreen.sendMessagePromise({action: 'getTermFrequenciesOffscreen', params: {termReadingList, dictionaries}});
    }

    clearDatabaseCaches() {
        return this._offscreen.sendMessagePromise({action: 'clearDatabaseCachesOffscreen'});
    }
}

export class ClipboardReaderProxy {
    constructor(offscreen) {
        this._offscreen = offscreen;
    }

    async getText(useRichText) {
        return this._offscreen.sendMessagePromise({action: 'clipboardGetTextOffscreen', params: {useRichText}});
    }

    async getImage() {
        return this._offscreen.sendMessagePromise({action: 'clipboardGetImageOffscreen'});
    }
}
