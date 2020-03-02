/*
 * Copyright (C) 2019-2020  Alex Yatskov <alex@foosoft.net>
 * Author: Alex Yatskov <alex@foosoft.net>
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


/*
 * Extension information
 */

function _extensionHasChrome() {
    try {
        return typeof chrome === 'object' && chrome !== null;
    } catch (e) {
        return false;
    }
}

function _extensionHasBrowser() {
    try {
        return typeof browser === 'object' && browser !== null;
    } catch (e) {
        return false;
    }
}

const EXTENSION_IS_BROWSER_EDGE = (
    _extensionHasBrowser() &&
    (!_extensionHasChrome() || (typeof chrome.runtime === 'undefined' && typeof browser.runtime !== 'undefined'))
);

if (EXTENSION_IS_BROWSER_EDGE) {
    // Edge does not have chrome defined.
    chrome = browser;
}


/*
 * Error handling
 */

function errorToJson(error) {
    return {
        name: error.name,
        message: error.message,
        stack: error.stack,
        data: error.data
    };
}

function jsonToError(jsonError) {
    const error = new Error(jsonError.message);
    error.name = jsonError.name;
    error.stack = jsonError.stack;
    error.data = jsonError.data;
    return error;
}

function logError(error, alert) {
    const manifest = chrome.runtime.getManifest();
    let errorMessage = `${manifest.name} v${manifest.version} has encountered an error.\n`;
    errorMessage += `Originating URL: ${window.location.href}\n`;

    const errorString = `${error.toString ? error.toString() : error}`;
    const stack = `${error.stack}`.trimRight();
    if (!stack.startsWith(errorString)) { errorMessage += `${errorString}\n`; }
    errorMessage += stack;

    const data = error.data;
    if (typeof data !== 'undefined') { errorMessage += `\nData: ${JSON.stringify(data, null, 4)}`; }

    errorMessage += '\n\nIssues can be reported at https://github.com/FooSoft/yomichan/issues';

    console.error(errorMessage);

    if (alert) {
        window.alert(`${errorString}\n\nCheck the developer console for more details.`);
    }
}


/*
 * Common helpers
 */

function isObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOwn(object, property) {
    return Object.prototype.hasOwnProperty.call(object, property);
}

// toIterable is required on Edge for cross-window origin objects.
function toIterable(value) {
    if (typeof Symbol !== 'undefined' && typeof value[Symbol.iterator] !== 'undefined') {
        return value;
    }

    if (value !== null && typeof value === 'object') {
        const length = value.length;
        if (typeof length === 'number' && Number.isFinite(length)) {
            return Array.from(value);
        }
    }

    throw new Error('Could not convert to iterable');
}

function stringReverse(string) {
    return string.split('').reverse().join('').replace(/([\uDC00-\uDFFF])([\uD800-\uDBFF])/g, '$2$1');
}

function parseUrl(url) {
    const parsedUrl = new URL(url);
    const baseUrl = `${parsedUrl.origin}${parsedUrl.pathname}`;
    const queryParams = Array.from(parsedUrl.searchParams.entries())
        .reduce((a, [k, v]) => Object.assign({}, a, {[k]: v}), {});
    return {baseUrl, queryParams};
}


/*
 * Async utilities
 */

function promiseTimeout(delay, resolveValue) {
    if (delay <= 0) {
        return Promise.resolve(resolveValue);
    }

    let timer = null;
    let promiseResolve = null;
    let promiseReject = null;

    const complete = (callback, value) => {
        if (callback === null) { return; }
        if (timer !== null) {
            window.clearTimeout(timer);
            timer = null;
        }
        promiseResolve = null;
        promiseReject = null;
        callback(value);
    };

    const resolve = (value) => complete(promiseResolve, value);
    const reject = (value) => complete(promiseReject, value);

    const promise = new Promise((resolve2, reject2) => {
        promiseResolve = resolve2;
        promiseReject = reject2;
    });
    timer = window.setTimeout(() => {
        timer = null;
        resolve(resolveValue);
    }, delay);

    promise.resolve = resolve;
    promise.reject = reject;

    return promise;
}

function stringReplaceAsync(str, regex, replacer) {
    let match;
    let index = 0;
    const parts = [];
    while ((match = regex.exec(str)) !== null) {
        parts.push(str.substring(index, match.index), replacer(...match, match.index, str));
        index = regex.lastIndex;
    }
    if (parts.length === 0) {
        return Promise.resolve(str);
    }
    parts.push(str.substring(index));
    return Promise.all(parts).then((v) => v.join(''));
}


/*
 * Common events
 */

class EventDispatcher {
    constructor() {
        this._eventMap = new Map();
    }

    trigger(eventName, details) {
        const callbacks = this._eventMap.get(eventName);
        if (typeof callbacks === 'undefined') { return false; }

        for (const callback of callbacks) {
            callback(details);
        }
    }

    on(eventName, callback) {
        let callbacks = this._eventMap.get(eventName);
        if (typeof callbacks === 'undefined') {
            callbacks = [];
            this._eventMap.set(eventName, callbacks);
        }
        callbacks.push(callback);
    }

    off(eventName, callback) {
        const callbacks = this._eventMap.get(eventName);
        if (typeof callbacks === 'undefined') { return true; }

        const ii = callbacks.length;
        for (let i = 0; i < ii; ++i) {
            if (callbacks[i] === callback) {
                callbacks.splice(i, 1);
                if (callbacks.length === 0) {
                    this._eventMap.delete(eventName);
                }
                return true;
            }
        }
        return false;
    }
}

class EventListenerCollection {
    constructor() {
        this._eventListeners = [];
    }

    get size() {
        return this._eventListeners.length;
    }

    addEventListener(node, type, listener, options) {
        node.addEventListener(type, listener, options);
        this._eventListeners.push([node, type, listener, options]);
    }

    removeAllEventListeners() {
        if (this._eventListeners.length === 0) { return; }
        for (const [node, type, listener, options] of this._eventListeners) {
            node.removeEventListener(type, listener, options);
        }
        this._eventListeners = [];
    }
}


/*
 * Default message handlers
 */

const yomichan = (() => {
    class Yomichan extends EventDispatcher {
        constructor() {
            super();

            this._isBackendPreparedResolve = null;
            this._isBackendPreparedPromise = new Promise((resolve) => (this._isBackendPreparedResolve = resolve));

            this._messageHandlers = new Map([
                ['backendPrepared', this._onBackendPrepared.bind(this)],
                ['getUrl', this._onMessageGetUrl.bind(this)],
                ['optionsUpdated', this._onMessageOptionsUpdated.bind(this)],
                ['zoomChanged', this._onMessageZoomChanged.bind(this)]
            ]);

            chrome.runtime.onMessage.addListener(this._onMessage.bind(this));
            chrome.runtime.sendMessage({action: 'yomichanOnline'});
        }

        // Public

        prepare() {
            return this._isBackendPreparedPromise;
        }

        generateId(length) {
            const array = new Uint8Array(length);
            window.crypto.getRandomValues(array);
            let id = '';
            for (const value of array) {
                id += value.toString(16).padStart(2, '0');
            }
            return id;
        }

        triggerOrphaned(error) {
            this.trigger('orphaned', {error});
        }

        // Private

        _onMessage({action, params}, sender, callback) {
            const handler = this._messageHandlers.get(action);
            if (typeof handler !== 'function') { return false; }

            const result = handler(params, sender);
            callback(result);
            return false;
        }

        _onBackendPrepared() {
            this._isBackendPreparedResolve();
        }

        _onMessageGetUrl() {
            return {url: window.location.href};
        }

        _onMessageOptionsUpdated({source}) {
            this.trigger('optionsUpdated', {source});
        }

        _onMessageZoomChanged({oldZoomFactor, newZoomFactor}) {
            this.trigger('zoomChanged', {oldZoomFactor, newZoomFactor});
        }
    }

    return new Yomichan();
})();
