/*
 * Copyright (C) 2024  Yomitan Authors
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

import {EventDispatcher} from '../core/event-dispatcher.js';
import {toError} from '../core/to-error.js';

/**
 * @augments EventDispatcher<import('web-extension').Events>
 */
export class WebExtension extends EventDispatcher {
    constructor() {
        super();
        /** @type {boolean} */
        this._unloaded = false;
        /** @type {?string} */
        this._extensionBaseUrl = null;
        try {
            this._extensionBaseUrl = this.getUrl('/');
        } catch (e) {
            // NOP
        }
        /** @type {string} */
        this._extensionName = 'Extension';
        try {
            const {name, version} = chrome.runtime.getManifest();
            this._extensionName = `${name} ${version}`;
        } catch (e) {
            // NOP
        }
    }

    /** @type {boolean} */
    get unloaded() {
        return this._unloaded;
    }

    /** @type {string} */
    get extensionName() {
        return this._extensionName;
    }

    /**
     * @param {string} path
     * @returns {string}
     */
    getUrl(path) {
        return chrome.runtime.getURL(path);
    }

    /**
     * @param {unknown} message
     * @param {(response: unknown) => void} responseCallback
     * @throws {Error}
     */
    sendMessage(message, responseCallback) {
        try {
            chrome.runtime.sendMessage(message, responseCallback);
        } catch (error) {
            this.triggerUnloaded();
            throw toError(error);
        }
    }

    /**
     * @param {unknown} message
     * @returns {Promise<unknown>}
     */
    sendMessagePromise(message) {
        return new Promise((resolve, reject) => {
            try {
                this.sendMessage(message, (response) => {
                    const error = this.getLastError();
                    if (error !== null) {
                        reject(error);
                    } else {
                        resolve(response);
                    }
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * @param {unknown} message
     */
    sendMessageIgnoreResponse(message) {
        this.sendMessage(message, () => {
            // Clear the last error
            this.getLastError();
        });
    }

    /**
     * @returns {?Error}
     */
    getLastError() {
        const {lastError} = chrome.runtime;
        if (lastError) {
            if (lastError instanceof Error) { return lastError; }
            const {message} = lastError;
            return new Error(typeof message === 'string' ? message : 'An unknown web extension error occured');
        }
        return null;
    }

    /** */
    triggerUnloaded() {
        if (this._unloaded) { return; }
        this._unloaded = true;
        this.trigger('unloaded', {});
    }

    /**
     * Checks whether or not a URL is an extension URL.
     * @param {string} url The URL to check.
     * @returns {boolean} `true` if the URL is an extension URL, `false` otherwise.
     */
    isExtensionUrl(url) {
        return this._extensionBaseUrl !== null && url.startsWith(this._extensionBaseUrl);
    }
}
