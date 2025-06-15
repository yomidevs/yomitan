/*
 * Copyright (C) 2025  Yomitan Authors
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

import {parseHTML} from '../../lib/linkedom.js';
import {invokeApiMapHandler} from '../core/api-map.js';
import {EventListenerCollection} from '../core/event-listener-collection.js';
import {ExtensionError} from '../core/extension-error.js';
import {parseJson, readResponseJson} from '../core/json.js';
import {log} from '../core/log.js';
import {toError} from '../core/to-error.js';
import {getDynamicTemplates} from '../data/anki-template-util.js';
import {AnkiTemplateRenderer} from '../templates/anki-template-renderer.js';

/** */
export class YomitanApi {
    /**
     * @param {import('api').ApiMap} apiMap
     */
    constructor(apiMap) {
        /** @type {?chrome.runtime.Port} */
        this._port = null;
        /** @type {EventListenerCollection} */
        this._eventListeners = new EventListenerCollection();
        /** @type {number} */
        this._timeout = 5000;
        /** @type {number} */
        this._version = 1;
        /** @type {?number} */
        this._remoteVersion = null;
        /** @type {boolean} */
        this._enabled = false;
        /** @type {?Promise<void>} */
        this._setupPortPromise = null;
        /** @type {import('api').ApiMap} */
        this._apiMap = apiMap;
    }

    /**
     * @returns {boolean}
     */
    isEnabled() {
        return this._enabled;
    }

    /**
     * @param {boolean} enabled
     */
    async setEnabled(enabled) {
        this._enabled = !!enabled;
        if (!this._enabled && this._port !== null) {
            this._clearPort();
        }
        if (this._enabled) {
            await this.startApiServer();
        }
    }

    /** */
    disconnect() {
        if (this._port !== null) {
            this._clearPort();
        }
    }

    /**
     * @returns {boolean}
     */
    isConnected() {
        return (this._port !== null);
    }

    /**
     * @returns {number}
     */
    getLocalVersion() {
        return this._version;
    }

    /**
     * @param {string} url
     * @returns {Promise<?number>}
     */
    async getRemoteVersion(url) {
        if (this._port === null) {
            await this.startApiServer();
        }
        await this._updateRemoteVersion(url);
        return this._remoteVersion;
    }

    /**
     * @returns {Promise<boolean>}
     */
    async startApiServer() {
        try {
            await this._setupPortWrapper();
            return true;
        } catch (e) {
            log.error(e);
            return false;
        }
    }

    // Private

    /**
     * @param {unknown} message
     */
    async _onMessage(message) {
        if (typeof message !== 'object' || message === null) { return; }

        if (this._port !== null) {
            const {action, params, body} = /** @type {import('core').SerializableObject} */ (message);
            if (typeof action !== 'string' || typeof params !== 'object' || typeof body !== 'string') {
                this._port.postMessage({action, params, body, data: 'null', responseStatusCode: 400});
                return;
            }

            const optionsFull = await this._invoke('optionsGetFull', void 0);

            try {
                /** @type {?object} */
                const parsedBody = body.length > 0 ? parseJson(body) : null;

                let result = null;
                let statusCode = 200;
                switch (action) {
                    case 'yomitanVersion': {
                        const {version} = chrome.runtime.getManifest();
                        result = {version: version};
                        break;
                    }
                    case 'termEntries': {
                        /** @type {import('yomitan-api.js').termEntriesInput} */
                        // @ts-expect-error - Allow this to error
                        const {term} = parsedBody;
                        const invokeParams = {
                            text: term,
                            details: {},
                            optionsContext: {index: optionsFull.profileCurrent},
                        };
                        result = await this._invoke(
                            'termsFind',
                            invokeParams,
                        );
                        break;
                    }
                    case 'kanjiEntries': {
                        /** @type {import('yomitan-api.js').kanjiEntriesInput} */
                        // @ts-expect-error - Allow this to error
                        const {character} = parsedBody;
                        const invokeParams = {
                            text: character,
                            details: {},
                            optionsContext: {index: optionsFull.profileCurrent},
                        };
                        result = await this._invoke(
                            'kanjiFind',
                            invokeParams,
                        );
                        break;
                    }
                    case 'ankiFields': {
                        /** @type {import('yomitan-api.js').ankiFieldsInput} */
                        // @ts-expect-error - Allow this to error
                        const {text, type, markers, maxEntries} = parsedBody;

                        const ankiTemplate = await this._getAnkiTemplate(optionsFull.profiles[optionsFull.profileCurrent].options);
                        let dictionaryEntries = await this._getDictionaryEntries(text, type, optionsFull.profileCurrent);
                        if (maxEntries > 0) {
                            dictionaryEntries = dictionaryEntries.slice(0, maxEntries);
                        }
                        const commonDatas = await this._createCommonDatas(text, dictionaryEntries);
                        // @ts-expect-error - `parseHTML` can return `null` but this input has been validated to not be `null`
                        const domlessDocument = parseHTML('').document;
                        // @ts-expect-error - `parseHTML` can return `null` but this input has been validated to not be `null`
                        const domlessWindow = parseHTML('').window;
                        const ankiTemplateRenderer = new AnkiTemplateRenderer(domlessDocument, domlessWindow);
                        await ankiTemplateRenderer.prepare();
                        const templateRenderer = ankiTemplateRenderer.templateRenderer;

                        /** @type {Array<Record<string, string>>} */
                        const ankiFieldsResults = [];
                        for (const commonData of commonDatas) {
                            /** @type {Record<string, string>} */
                            const ankiFieldsResult = {};
                            for (const marker of markers) {
                                const templateResult = templateRenderer.render(ankiTemplate, {marker: marker, commonData: commonData}, 'ankiNote');
                                ankiFieldsResult[marker] = templateResult.result;
                            }
                            ankiFieldsResults.push(ankiFieldsResult);
                        }
                        result = ankiFieldsResults;
                        break;
                    }
                    default:
                        statusCode = 400;
                }

                this._port.postMessage({action, params, body, data: result, responseStatusCode: statusCode});
            } catch (error) {
                log.error(error);
                this._port.postMessage({action, params, body, data: JSON.stringify(error), responseStatusCode: 500});
            }
        }
    }

    /**
     * @param {import('settings').ProfileOptions} options
     * @returns {Promise<string>}
     */
    async _getAnkiTemplate(options) {
        let staticTemplates = options.anki.fieldTemplates;
        if (typeof staticTemplates !== 'string') { staticTemplates = await this._invoke('getDefaultAnkiFieldTemplates', void 0); }
        const dictionaryInfo = await this._invoke('getDictionaryInfo', void 0);
        const dynamicTemplates = getDynamicTemplates(options, dictionaryInfo);
        return staticTemplates + '\n' + dynamicTemplates;
    }

    /**
     * @param {string} text
     * @param {import('settings.js').AnkiCardFormatType} type
     * @param {number} profileIndex
     * @returns {Promise<import('dictionary.js').DictionaryEntry[]>}
     */
    async _getDictionaryEntries(text, type, profileIndex) {
        if (type === 'term') {
            const invokeParams = {
                text: text,
                details: {},
                optionsContext: {index: profileIndex},
            };
            return (await this._invoke('termsFind', invokeParams)).dictionaryEntries;
        } else {
            const invokeParams = {
                text: text,
                details: {},
                optionsContext: {index: profileIndex},
            };
            return await this._invoke('kanjiFind', invokeParams);
        }
    }

    /**
     * @param {string} text
     * @param {import('dictionary.js').DictionaryEntry[]} dictionaryEntries
     * @returns {Promise<import('anki-note-builder.js').CommonData[]>}
     */
    async _createCommonDatas(text, dictionaryEntries) {
        /** @type {import('anki-note-builder.js').CommonData[]} */
        const commonDatas = [];
        for (const dictionaryEntry of dictionaryEntries) {
            commonDatas.push({
                dictionaryEntry: dictionaryEntry,
                resultOutputMode: 'group',
                cardFormat: {
                    type: 'term',
                    name: '',
                    deck: '',
                    model: '',
                    fields: {},
                    icon: 'big-circle',
                },
                glossaryLayoutMode: 'default',
                compactTags: false,
                context: {
                    url: '',
                    documentTitle: '',
                    query: text,
                    fullQuery: text,
                    sentence: {
                        text: text,
                        offset: 0,
                    },
                },
                dictionaryStylesMap: new Map(),
            });
        }
        return commonDatas;
    }

    /**
     * @param {string} url
     */
    async _updateRemoteVersion(url) {
        if (!url) {
            throw new Error('Missing Yomitan API URL');
        }
        try {
            const response = await fetch(url + '/serverVersion', {
                method: 'POST',
            });
            /** @type {import('yomitan-api.js').remoteVersionResponse} */
            const {version} = await readResponseJson(response);

            this._remoteVersion = version;
        } catch (e) {
            log.error(e);
            throw new Error('Failed to fetch. Try again in a moment. The nativemessaging component can take a few seconds to start.');
        }
    }

    /**
     * @returns {void}
     */
    _onDisconnect() {
        if (this._port === null) { return; }
        const e = chrome.runtime.lastError;
        const error = new Error(e ? e.message : 'Yomitan Api disconnected');
        log.error(error);
        this._clearPort();
    }

    /**
     * @returns {Promise<void>}
     */
    async _setupPortWrapper() {
        if (!this._enabled) {
            throw new Error('Yomitan Api not enabled');
        }
        if (this._setupPortPromise === null) {
            this._setupPortPromise = this._setupPort();
        }
        try {
            await this._setupPortPromise;
        } catch (e) {
            throw toError(e);
        }
    }

    /**
     * @returns {Promise<void>}
     */
    async _setupPort() {
        const port = chrome.runtime.connectNative('yomitan_api');
        this._eventListeners.addListener(port.onMessage, this._onMessage.bind(this));
        this._eventListeners.addListener(port.onDisconnect, this._onDisconnect.bind(this));
        this._port = port;
    }

    /**
     * @returns {void}
     */
    _clearPort() {
        if (this._port !== null) {
            this._port.disconnect();
            this._port = null;
        }
        this._eventListeners.removeAllEventListeners();
        this._setupPortPromise = null;
    }

    /**
     * @template {import('api').ApiNames} TAction
     * @template {import('api').ApiParams<TAction>} TParams
     * @param {TAction} action
     * @param {TParams} params
     * @returns {Promise<import('api').ApiReturn<TAction>>}
     */
    _invoke(action, params) {
        return new Promise((resolve, reject) => {
            try {
                invokeApiMapHandler(this._apiMap, action, params, [{}], (response) => {
                    if (response !== null && typeof response === 'object') {
                        const {error} = /** @type {import('core').UnknownObject} */ (response);
                        if (typeof error !== 'undefined') {
                            reject(ExtensionError.deserialize(/** @type {import('core').SerializedError} */(error)));
                        } else {
                            const {result} = /** @type {import('core').UnknownObject} */ (response);
                            resolve(/** @type {import('api').ApiReturn<TAction>} */(result));
                        }
                    } else {
                        const message = response === null ? 'Unexpected null response. You may need to refresh the page.' : `Unexpected response of type ${typeof response}. You may need to refresh the page.`;
                        reject(new Error(`${message} (${JSON.stringify(action)})`));
                    }
                });
            } catch (e) {
                reject(e);
            }
        });
    }
}
