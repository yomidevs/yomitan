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

import {invokeApiMapHandler} from '../core/api-map.js';
import {EventListenerCollection} from '../core/event-listener-collection.js';
import {ExtensionError} from '../core/extension-error.js';
import {parseJson} from '../core/json.js';
import {log} from '../core/log.js';
import {toError} from '../core/to-error.js';

/** */
export class YomitanApi {
    /**
     * @param {import('api').ApiMap} apiMap
     */
    constructor(apiMap) {
        /** @type {?chrome.runtime.Port} */
        this._port = null;
        /** @type {number} */
        this._sequence = 0;
        /** @type {Map<number, {resolve: (value: unknown) => void, reject: (reason?: unknown) => void, timer: import('core').Timeout}>} */
        this._invocations = new Map();
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
     * @returns {boolean}
     */
    isActive() {
        return (this._invocations.size > 0);
    }

    /**
     * @returns {number}
     */
    getLocalVersion() {
        return this._version;
    }

    /**
     * @returns {Promise<?number>}
     */
    async getRemoteVersion() {
        if (this._port === null) {
            await this.startApiServer();
        }
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

            try {
                /** @type {?object} */
                const parsedBody = parseJson(body);

                let result = null;
                let statusCode = 200;
                switch (action) {
                    case 'termEntries': {
                        /** @type {import('yomitan-api.js').termEntriesInput} */
                        // @ts-expect-error - Allow this to error
                        const {term, profileIndex} = parsedBody;
                        const invokeParams = {
                            text: term,
                            details: {},
                            optionsContext: {index: profileIndex},
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
                        const {character, profileIndex} = parsedBody;
                        const invokeParams = {
                            text: character,
                            details: {},
                            optionsContext: {index: profileIndex},
                        };
                        result = await this._invoke(
                            'kanjiFind',
                            invokeParams,
                        );
                        break;
                    }
                    default:
                        statusCode = 400;
                }

                this._port.postMessage({action, params, body, data: result, responseStatusCode: statusCode});
            } catch (error) {
                this._port.postMessage({action, params, body, data: JSON.stringify(error), responseStatusCode: 500});
            }
        }
    }

    /**
     * @returns {void}
     */
    _onDisconnect() {
        if (this._port === null) { return; }
        const e = chrome.runtime.lastError;
        const error = new Error(e ? e.message : 'Yomitan Api disconnected');
        for (const {reject, timer} of this._invocations.values()) {
            clearTimeout(timer);
            reject(error);
        }
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

        this._remoteVersion = 1;

        // try {
        //     const data = await this._invoke('get_version', {});
        //     if (typeof data !== 'object' || data === null) {
        //         throw new Error('Invalid version');
        //     }
        //     const {version} = /** @type {import('core').SerializableObject} */ (data);
        //     if (typeof version !== 'number') {
        //         throw new Error('Invalid version');
        //     }
        //     this._remoteVersion = version;
        //     if (version !== this._version) {
        //         throw new Error(`Unsupported Yomitan Api native messenger version ${version}. Yomitan supports version ${this._version}.`);
        //     }
        // } catch (e) {
        //     if (this._port === port) {
        //         this._clearPort();
        //     }
        //     throw e;
        // }
    }

    /**
     * @returns {void}
     */
    _clearPort() {
        if (this._port !== null) {
            this._port.disconnect();
            this._port = null;
        }
        this._invocations.clear();
        this._eventListeners.removeAllEventListeners();
        this._sequence = 0;
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
