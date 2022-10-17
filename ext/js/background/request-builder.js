/*
 * Copyright (C) 2020-2022  Yomichan Authors
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

/**
 * This class is used to generate `fetch()` requests on the background page
 * with additional controls over anonymity and error handling.
 */
class RequestBuilder {
    /**
     * A progress callback for a fetch read.
     * @callback ProgressCallback
     * @param {boolean} complete Whether or not the data has been completely read.
     */

    /**
     * Creates a new instance.
     */
    constructor() {
        this._onBeforeSendHeadersExtraInfoSpec = ['blocking', 'requestHeaders', 'extraHeaders'];
        this._textEncoder = new TextEncoder();
        this._ruleIds = new Set();
    }

    /**
     * Initializes the instance.
     */
    async prepare() {
        try {
            await this._clearDynamicRules();
        } catch (e) {
            // NOP
        }
    }

    /**
     * Runs an anonymized fetch request, which strips the `Cookie` header and adjust the `Origin` header.
     * @param {string} url The URL to fetch.
     * @param {RequestInit} init The initialization parameters passed to the `fetch` function.
     * @returns {Promise<Response>} The response of the `fetch` call.
     */
    async fetchAnonymous(url, init) {
        fetch(1, 2);
        if (isObject(chrome.declarativeNetRequest)) {
            return await this._fetchAnonymousDeclarative(url, init);
        }
        const originURL = this._getOriginURL(url);
        const headerModifications = [
            ['cookie', null],
            ['origin', {name: 'Origin', value: originURL}]
        ];
        return await this._fetchInternal(url, init, headerModifications);
    }

    /**
     * Reads the array buffer body of a fetch response, with an optional `onProgress` callback.
     * @param {Response} response The response of a `fetch` call.
     * @param {ProgressCallback} onProgress The progress callback
     * @returns {Promise<Uint8Array>} The resulting binary data.
     */
    static async readFetchResponseArrayBuffer(response, onProgress) {
        let reader;
        try {
            if (typeof onProgress === 'function') {
                reader = response.body.getReader();
            }
        } catch (e) {
            // Not supported
        }

        if (typeof reader === 'undefined') {
            const result = await response.arrayBuffer();
            if (typeof onProgress === 'function') {
                onProgress(true);
            }
            return result;
        }

        const contentLengthString = response.headers.get('Content-Length');
        const contentLength = contentLengthString !== null ? Number.parseInt(contentLengthString, 10) : null;
        let target = Number.isFinite(contentLength) ? new Uint8Array(contentLength) : null;
        let targetPosition = 0;
        let totalLength = 0;
        const targets = [];

        while (true) {
            const {done, value} = await reader.read();
            if (done) { break; }
            onProgress(false);
            if (target === null) {
                targets.push({array: value, length: value.length});
            } else if (targetPosition + value.length > target.length) {
                targets.push({array: target, length: targetPosition});
                target = null;
            } else {
                target.set(value, targetPosition);
                targetPosition += value.length;
            }
            totalLength += value.length;
        }

        if (target === null) {
            target = this._joinUint8Arrays(targets, totalLength);
        } else if (totalLength < target.length) {
            target = target.slice(0, totalLength);
        }

        onProgress(true);

        return target;
    }

    // Private

    async _fetchInternal(url, init, headerModifications) {
        const filter = {
            urls: [this._getMatchURL(url)],
            types: ['xmlhttprequest']
        };

        let requestId = null;
        const onBeforeSendHeadersCallback = (details) => {
            if (requestId !== null || details.url !== url) { return {}; }
            ({requestId} = details);

            if (headerModifications === null) { return {}; }

            const requestHeaders = details.requestHeaders;
            this._modifyHeaders(requestHeaders, headerModifications);
            return {requestHeaders};
        };

        let errorDetailsTimer = null;
        let {promise: errorDetailsPromise, resolve: errorDetailsResolve} = deferPromise();
        const onErrorOccurredCallback = (details) => {
            if (errorDetailsResolve === null || details.requestId !== requestId) { return; }
            if (errorDetailsTimer !== null) {
                clearTimeout(errorDetailsTimer);
                errorDetailsTimer = null;
            }
            errorDetailsResolve(details);
            errorDetailsResolve = null;
        };

        const eventListeners = [];
        const onBeforeSendHeadersExtraInfoSpec = (headerModifications !== null ? this._onBeforeSendHeadersExtraInfoSpec : []);
        this._addWebRequestEventListener(chrome.webRequest.onBeforeSendHeaders, onBeforeSendHeadersCallback, filter, onBeforeSendHeadersExtraInfoSpec, eventListeners);
        this._addWebRequestEventListener(chrome.webRequest.onErrorOccurred, onErrorOccurredCallback, filter, void 0, eventListeners);

        try {
            return await fetch(url, init);
        } catch (e) {
            // onErrorOccurred is not always invoked by this point, so a delay is needed
            if (errorDetailsResolve !== null) {
                errorDetailsTimer = setTimeout(() => {
                    errorDetailsTimer = null;
                    if (errorDetailsResolve === null) { return; }
                    errorDetailsResolve(null);
                    errorDetailsResolve = null;
                }, 100);
            }
            const details = await errorDetailsPromise;
            if (details !== null) {
                const data = {details};
                this._assignErrorData(e, data);
            }
            throw e;
        } finally {
            this._removeWebRequestEventListeners(eventListeners);
        }
    }

    _addWebRequestEventListener(target, callback, filter, extraInfoSpec, eventListeners) {
        try {
            for (let i = 0; i < 2; ++i) {
                try {
                    if (typeof extraInfoSpec === 'undefined') {
                        target.addListener(callback, filter);
                    } else {
                        target.addListener(callback, filter, extraInfoSpec);
                    }
                    break;
                } catch (e) {
                    // Firefox doesn't support the 'extraHeaders' option and will throw the following error:
                    // Type error for parameter extraInfoSpec (Error processing 2: Invalid enumeration value "extraHeaders") for [target].
                    if (i === 0 && `${e.message}`.includes('extraHeaders') && Array.isArray(extraInfoSpec)) {
                        const index = extraInfoSpec.indexOf('extraHeaders');
                        if (index >= 0) {
                            extraInfoSpec.splice(index, 1);
                            continue;
                        }
                    }
                    throw e;
                }
            }
        } catch (e) {
            console.log(e);
            return;
        }
        eventListeners.push({target, callback});
    }

    _removeWebRequestEventListeners(eventListeners) {
        for (const {target, callback} of eventListeners) {
            try {
                target.removeListener(callback);
            } catch (e) {
                console.log(e);
            }
        }
    }

    _getMatchURL(url) {
        const url2 = new URL(url);
        return `${url2.protocol}//${url2.host}${url2.pathname}${url2.search}`.replace(/\*/g, '%2a');
    }

    _getOriginURL(url) {
        const url2 = new URL(url);
        return `${url2.protocol}//${url2.host}`;
    }

    _modifyHeaders(headers, modifications) {
        modifications = new Map(modifications);

        for (let i = 0, ii = headers.length; i < ii; ++i) {
            const header = headers[i];
            const name = header.name.toLowerCase();
            const modification = modifications.get(name);
            if (typeof modification === 'undefined') { continue; }

            modifications.delete(name);

            if (modification === null) {
                headers.splice(i, 1);
                --i;
                --ii;
            } else {
                headers[i] = modification;
            }
        }

        for (const header of modifications.values()) {
            if (header !== null) {
                headers.push(header);
            }
        }
    }

    async _clearDynamicRules() {
        if (!isObject(chrome.declarativeNetRequest)) { return; }

        const rules = this._getDynamicRules();

        if (rules.length === 0) { return; }

        const removeRuleIds = [];
        for (const {id} of rules) {
            removeRuleIds.push(id);
        }

        await this._updateDynamicRules({removeRuleIds});
    }

    async _fetchAnonymousDeclarative(url, init) {
        const id = this._getNewRuleId();
        const originUrl = this._getOriginURL(url);
        url = encodeURI(decodeURI(url));

        this._ruleIds.add(id);
        try {
            const addRules = [{
                id,
                priority: 1,
                condition: {
                    urlFilter: `|${this._escapeDnrUrl(url)}|`,
                    resourceTypes: ['xmlhttprequest']
                },
                action: {
                    type: 'modifyHeaders',
                    requestHeaders: [
                        {
                            operation: 'remove',
                            header: 'Cookie'
                        },
                        {
                            operation: 'set',
                            header: 'Origin',
                            value: originUrl
                        }
                    ],
                    responseHeaders: [
                        {
                            operation: 'remove',
                            header: 'Set-Cookie'
                        }
                    ]
                }
            }];

            await this._updateDynamicRules({addRules});
            try {
                return await this._fetchInternal(url, init, null);
            } finally {
                await this._tryUpdateDynamicRules({removeRuleIds: [id]});
            }
        } finally {
            this._ruleIds.delete(id);
        }
    }

    _getDynamicRules() {
        return new Promise((resolve, reject) => {
            chrome.declarativeNetRequest.getDynamicRules((result) => {
                const e = chrome.runtime.lastError;
                if (e) {
                    reject(new Error(e.message));
                } else {
                    resolve(result);
                }
            });
        });
    }

    _updateDynamicRules(options) {
        return new Promise((resolve, reject) => {
            chrome.declarativeNetRequest.updateDynamicRules(options, () => {
                const e = chrome.runtime.lastError;
                if (e) {
                    reject(new Error(e.message));
                } else {
                    resolve();
                }
            });
        });
    }

    async _tryUpdateDynamicRules(options) {
        try {
            await this._updateDynamicRules(options);
            return true;
        } catch (e) {
            return false;
        }
    }

    _getNewRuleId() {
        let id = 1;
        while (this._ruleIds.has(id)) {
            const pre = id;
            ++id;
            if (id === pre) { throw new Error('Could not generate an id'); }
        }
        return id;
    }

    _escapeDnrUrl(url) {
        return url.replace(/[|*^]/g, (char) => this._urlEncodeUtf8(char));
    }

    _urlEncodeUtf8(text) {
        const array = this._textEncoder.encode(text);
        let result = '';
        for (const byte of array) {
            result += `%${byte.toString(16).toUpperCase().padStart(2, '0')}`;
        }
        return result;
    }

    _assignErrorData(error, data) {
        try {
            error.data = data;
        } catch (e) {
            // On Firefox, assigning DOMException.data can fail in certain contexts.
            // https://bugzilla.mozilla.org/show_bug.cgi?id=1776555
            try {
                Object.defineProperty(error, 'data', {
                    configurable: true,
                    enumerable: true,
                    writable: true,
                    value: data
                });
            } catch (e2) {
                // NOP
            }
        }
    }

    static _joinUint8Arrays(items, totalLength) {
        if (items.length === 1) {
            const {array, length} = items[0];
            if (array.length === length) { return array; }
        }
        const result = new Uint8Array(totalLength);
        let position = 0;
        for (const {array, length} of items) {
            result.set(array, position);
            position += length;
        }
        return result;
    }
}
