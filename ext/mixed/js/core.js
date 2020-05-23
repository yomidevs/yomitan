/*
 * Copyright (C) 2019-2020  Yomichan Authors
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
    try {
        if (isObject(error)) {
            return {
                name: error.name,
                message: error.message,
                stack: error.stack,
                data: error.data
            };
        }
    } catch (e) {
        // NOP
    }
    return {
        value: error,
        hasValue: true
    };
}

function jsonToError(jsonError) {
    if (jsonError.hasValue) {
        return jsonError.value;
    }
    const error = new Error(jsonError.message);
    error.name = jsonError.name;
    error.stack = jsonError.stack;
    error.data = jsonError.data;
    return error;
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

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions
function escapeRegExp(string) {
    return string.replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&');
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

function areSetsEqual(set1, set2) {
    if (set1.size !== set2.size) {
        return false;
    }

    for (const value of set1) {
        if (!set2.has(value)) {
            return false;
        }
    }

    return true;
}

function getSetIntersection(set1, set2) {
    const result = [];
    for (const value of set1) {
        if (set2.has(value)) {
            result.push(value);
        }
    }
    return result;
}

function getSetDifference(set1, set2) {
    return new Set(
        [...set1].filter((value) => !set2.has(value))
    );
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

            this._isBackendPreparedPromise = this.getTemporaryListenerResult(
                chrome.runtime.onMessage,
                ({action}, {resolve}) => {
                    if (action === 'backendPrepared') {
                        resolve();
                    }
                }
            );

            this._messageHandlers = new Map([
                ['getUrl', this._onMessageGetUrl.bind(this)],
                ['optionsUpdated', this._onMessageOptionsUpdated.bind(this)],
                ['zoomChanged', this._onMessageZoomChanged.bind(this)]
            ]);

            chrome.runtime.onMessage.addListener(this._onMessage.bind(this));
        }

        // Public

        prepare() {
            chrome.runtime.sendMessage({action: 'yomichanCoreReady'});
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

        isExtensionUrl(url) {
            try {
                const urlBase = chrome.runtime.getURL('/');
                return url.substring(0, urlBase.length) === urlBase;
            } catch (e) {
                return false;
            }
        }

        getTemporaryListenerResult(eventHandler, userCallback, timeout=null) {
            if (!(
                typeof eventHandler.addListener === 'function' &&
                typeof eventHandler.removeListener === 'function'
            )) {
                throw new Error('Event handler type not supported');
            }

            return new Promise((resolve, reject) => {
                const runtimeMessageCallback = ({action, params}, sender, sendResponse) => {
                    let timeoutId = null;
                    if (timeout !== null) {
                        timeoutId = window.setTimeout(() => {
                            timeoutId = null;
                            eventHandler.removeListener(runtimeMessageCallback);
                            reject(new Error(`Listener timed out in ${timeout} ms`));
                        }, timeout);
                    }

                    const cleanupResolve = (value) => {
                        if (timeoutId !== null) {
                            window.clearTimeout(timeoutId);
                            timeoutId = null;
                        }
                        eventHandler.removeListener(runtimeMessageCallback);
                        sendResponse();
                        resolve(value);
                    };

                    userCallback({action, params}, {resolve: cleanupResolve, sender});
                };

                eventHandler.addListener(runtimeMessageCallback);
            });
        }

        logWarning(error) {
            this.log(error, 'warn');
        }

        logError(error) {
            this.log(error, 'error');
        }

        log(error, level, context=null) {
            if (!isObject(context)) {
                context = this._getLogContext();
            }

            let errorString;
            try {
                errorString = error.toString();
                if (/^\[object \w+\]$/.test(errorString)) {
                    errorString = JSON.stringify(error);
                }
            } catch (e) {
                errorString = `${error}`;
            }

            let errorStack;
            try {
                errorStack = (typeof error.stack === 'string' ? error.stack.trimRight() : '');
            } catch (e) {
                errorStack = '';
            }

            let errorData;
            try {
                errorData = error.data;
            } catch (e) {
                // NOP
            }

            if (errorStack.startsWith(errorString)) {
                errorString = errorStack;
            } else if (errorStack.length > 0) {
                errorString += `\n${errorStack}`;
            }

            const manifest = chrome.runtime.getManifest();
            let message = `${manifest.name} v${manifest.version} has encountered a problem.`;
            message += `\nOriginating URL: ${context.url}\n`;
            message += errorString;
            if (typeof errorData !== 'undefined') {
                message += `\nData: ${JSON.stringify(errorData, null, 4)}`;
            }
            message += '\n\nIssues can be reported at https://github.com/FooSoft/yomichan/issues';

            switch (level) {
                case 'info': console.info(message); break;
                case 'debug': console.debug(message); break;
                case 'warn': console.warn(message); break;
                case 'error': console.error(message); break;
                default: console.log(message); break;
            }

            this.trigger('log', {error, level, context});
        }

        // Private

        _getLogContext() {
            return {
                url: window.location.href
            };
        }

        _onMessage({action, params}, sender, callback) {
            const handler = this._messageHandlers.get(action);
            if (typeof handler !== 'function') { return false; }

            const result = handler(params, sender);
            callback(result);
            return false;
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
