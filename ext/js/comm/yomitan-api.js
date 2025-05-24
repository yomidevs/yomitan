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

import {EventListenerCollection} from '../core/event-listener-collection.js';
import {log} from '../core/log.js';
import {toError} from '../core/to-error.js';

/** */
export class YomitanApi {
    /** */
    constructor() {
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
    setEnabled(enabled) {
        this._enabled = !!enabled;
        if (!this._enabled && this._port !== null) {
            this._clearPort();
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
        try {
            await this._setupPortWrapper();
        } catch (e) {
            log.error(e);
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
        console.log('Yomitan API _onMessage');
        console.log(message);

        const {action, params, sequence, data} = /** @type {import('core').SerializableObject} */ (message);
        if (typeof sequence !== 'number') { return; }

        if (this._port !== null) {
            const placeholder_data = 'placeholder data';
            this._port.postMessage({action, params, data: placeholder_data, sequence});
        }

        const invocation = this._invocations.get(sequence);
        if (typeof invocation === 'undefined') { return; }

        const {resolve, timer} = invocation;
        clearTimeout(timer);
        resolve(data);
        this._invocations.delete(sequence);
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
     * @param {string} action
     * @param {import('core').SerializableObject} params
     * @returns {Promise<unknown>}
     */
    _invoke(action, params) {
        return new Promise((resolve, reject) => {
            if (this._port === null) {
                reject(new Error('Port disconnected'));
                return;
            }

            const sequence = this._sequence++;

            const timer = setTimeout(() => {
                this._invocations.delete(sequence);
                reject(new Error(`Yomitan Api invoke timed out after ${this._timeout}ms`));
            }, this._timeout);

            this._invocations.set(sequence, {resolve, reject, timer});

            this._port.postMessage({action, params, sequence});
        });
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
}
