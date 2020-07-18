/*
 * Copyright (C) 2020  Yomichan Authors
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

// Set up chrome alias if it's not available (Edge Legacy)
if ((() => {
    let hasChrome = false;
    let hasBrowser = false;
    try {
        hasChrome = (typeof chrome === 'object' && chrome !== null && typeof chrome.runtime !== 'undefined');
    } catch (e) {
        // NOP
    }
    try {
        hasBrowser = (typeof browser === 'object' && browser !== null && typeof browser.runtime !== 'undefined');
    } catch (e) {
        // NOP
    }
    return (hasBrowser && !hasChrome);
})()) {
    chrome = browser;
}

const yomichan = (() => {
    class Yomichan extends EventDispatcher {
        constructor() {
            super();

            this._extensionName = 'Yomichan';
            try {
                const manifest = chrome.runtime.getManifest();
                this._extensionName = `${manifest.name} v${manifest.version}`;
            } catch (e) {
                // NOP
            }

            this._isExtensionUnloaded = false;
            this._isReady = false;

            const {promise, resolve} = deferPromise();
            this._isBackendReadyPromise = promise;
            this._isBackendReadyPromiseResolve = resolve;

            this._messageHandlers = new Map([
                ['isReady',        {async: false, handler: this._onMessageIsReady.bind(this)}],
                ['backendReady',   {async: false, handler: this._onMessageBackendReady.bind(this)}],
                ['getUrl',         {async: false, handler: this._onMessageGetUrl.bind(this)}],
                ['optionsUpdated', {async: false, handler: this._onMessageOptionsUpdated.bind(this)}],
                ['zoomChanged',    {async: false, handler: this._onMessageZoomChanged.bind(this)}]
            ]);
        }

        // Public

        get isExtensionUnloaded() {
            return this._isExtensionUnloaded;
        }

        prepare() {
            chrome.runtime.onMessage.addListener(this._onMessage.bind(this));
        }

        backendReady() {
            this.sendMessage({action: 'requestBackendReadySignal'});
            return this._isBackendReadyPromise;
        }

        ready() {
            this._isReady = true;
            this.sendMessage({action: 'yomichanReady'});
        }

        generateId(length) {
            const array = new Uint8Array(length);
            crypto.getRandomValues(array);
            let id = '';
            for (const value of array) {
                id += value.toString(16).padStart(2, '0');
            }
            return id;
        }

        isExtensionUrl(url) {
            try {
                return url.startsWith(chrome.runtime.getURL('/'));
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
                        timeoutId = setTimeout(() => {
                            timeoutId = null;
                            eventHandler.removeListener(runtimeMessageCallback);
                            reject(new Error(`Listener timed out in ${timeout} ms`));
                        }, timeout);
                    }

                    const cleanupResolve = (value) => {
                        if (timeoutId !== null) {
                            clearTimeout(timeoutId);
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

            let message = `${this._extensionName} has encountered a problem.`;
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

        sendMessage(...args) {
            try {
                return chrome.runtime.sendMessage(...args);
            } catch (e) {
                this.triggerExtensionUnloaded();
                throw e;
            }
        }

        connect(...args) {
            try {
                return chrome.runtime.connect(...args);
            } catch (e) {
                this.triggerExtensionUnloaded();
                throw e;
            }
        }

        getMessageResponseResult(response) {
            let error = chrome.runtime.lastError;
            if (error) {
                throw new Error(error.message);
            }
            if (!isObject(response)) {
                throw new Error('Tab did not respond');
            }
            error = response.error;
            if (error) {
                throw jsonToError(error);
            }
            return response.result;
        }

        invokeMessageHandler({handler, async}, params, callback, ...extraArgs) {
            try {
                let promiseOrResult = handler(params, ...extraArgs);
                if (async === 'dynamic') {
                    ({async, result: promiseOrResult} = promiseOrResult);
                }
                if (async) {
                    promiseOrResult.then(
                        (result) => { callback({result}); },
                        (error) => { callback({error: errorToJson(error)}); }
                    );
                    return true;
                } else {
                    callback({result: promiseOrResult});
                    return false;
                }
            } catch (error) {
                callback({error: errorToJson(error)});
                return false;
            }
        }

        triggerExtensionUnloaded() {
            this._isExtensionUnloaded = true;
            this.trigger('extensionUnloaded');
        }

        // Private

        _getUrl() {
            return (typeof window === 'object' && window !== null ? window.location.href : '');
        }

        _getLogContext() {
            return this._getUrl();
        }

        _onMessage({action, params}, sender, callback) {
            const messageHandler = this._messageHandlers.get(action);
            if (typeof messageHandler === 'undefined') { return false; }
            return this.invokeMessageHandler(messageHandler, params, callback, sender);
        }

        _onMessageIsReady() {
            return this._isReady;
        }

        _onMessageBackendReady() {
            if (this._isBackendReadyPromiseResolve === null) { return; }
            this._isBackendReadyPromiseResolve();
            this._isBackendReadyPromiseResolve = null;
        }

        _onMessageGetUrl() {
            return {url: this._getUrl()};
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

yomichan.prepare();
