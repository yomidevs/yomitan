/*
 * Copyright (C) 2020-2021  Yomichan Authors
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

class RequestBuilder {
    constructor() {
        this._extraHeadersSupported = null;
        this._onBeforeSendHeadersExtraInfoSpec = ['blocking', 'requestHeaders', 'extraHeaders'];
        this._textEncoder = new TextEncoder();
        this._ruleIds = new Set();
    }

    async prepare() {
        try {
            await this._clearDynamicRules();
        } catch (e) {
            // NOP
        }
    }

    async fetchAnonymous(url, init) {
        if (isObject(chrome.declarativeNetRequest)) {
            return await this._fetchAnonymousDeclarative(url, init);
        }
        const originURL = this._getOriginURL(url);
        const modifications = [
            ['cookie', null],
            ['origin', {name: 'Origin', value: originURL}]
        ];
        return await this._fetchModifyHeaders(url, init, modifications);
    }

    // Private

    async _fetchModifyHeaders(url, init, modifications) {
        const matchURL = this._getMatchURL(url);

        let done = false;
        const callback = (details) => {
            if (done || details.url !== url) { return {}; }
            done = true;

            const requestHeaders = details.requestHeaders;
            this._modifyHeaders(requestHeaders, modifications);
            return {requestHeaders};
        };
        const filter = {
            urls: [matchURL],
            types: ['xmlhttprequest']
        };

        let needsCleanup = false;
        try {
            this._onBeforeSendHeadersAddListener(callback, filter);
            needsCleanup = true;
        } catch (e) {
            // NOP
        }

        try {
            return await fetch(url, init);
        } finally {
            if (needsCleanup) {
                try {
                    chrome.webRequest.onBeforeSendHeaders.removeListener(callback);
                } catch (e) {
                    // NOP
                }
            }
        }
    }

    _onBeforeSendHeadersAddListener(callback, filter) {
        const extraInfoSpec = this._onBeforeSendHeadersExtraInfoSpec;
        for (let i = 0; i < 2; ++i) {
            try {
                chrome.webRequest.onBeforeSendHeaders.addListener(callback, filter, extraInfoSpec);
                if (this._extraHeadersSupported === null) {
                    this._extraHeadersSupported = true;
                }
                break;
            } catch (e) {
                // Firefox doesn't support the 'extraHeaders' option and will throw the following error:
                // Type error for parameter extraInfoSpec (Error processing 2: Invalid enumeration value "extraHeaders") for webRequest.onBeforeSendHeaders.
                if (this._extraHeadersSupported !== null || !`${e.message}`.includes('extraHeaders')) {
                    throw e;
                }
            }

            // addListener failed; remove 'extraHeaders' from extraInfoSpec.
            this._extraHeadersSupported = false;
            const index = extraInfoSpec.indexOf('extraHeaders');
            if (index >= 0) { extraInfoSpec.splice(index, 1); }
        }
    }

    _getMatchURL(url) {
        const url2 = new URL(url);
        return `${url2.protocol}//${url2.host}${url2.pathname}`;
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
                return await fetch(url, init);
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
}
