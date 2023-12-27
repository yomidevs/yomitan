/*
 * Copyright (C) 2023  Yomitan Authors
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

import {API} from './comm/api.js';
import {CrossFrameAPI} from './comm/cross-frame-api.js';
import {EventDispatcher, deferPromise, invokeMessageHandler, log} from './core.js';
import {ExtensionError} from './core/extension-error.js';

/**
 * @returns {boolean}
 */
function checkChromeNotAvailable() {
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
}

// Set up chrome alias if it's not available (Edge Legacy)
if (checkChromeNotAvailable()) {
    // @ts-expect-error - objects should have roughly the same interface
    // eslint-disable-next-line no-global-assign
    chrome = browser;
}

/**
 * The Yomitan class is a core component through which various APIs are handled and invoked.
 * @augments EventDispatcher<import('extension').ExtensionEventType>
 */
export class Yomitan extends EventDispatcher {
    /**
     * Creates a new instance. The instance should not be used until it has been fully prepare()'d.
     */
    constructor() {
        super();

        /** @type {string} */
        this._extensionName = 'Yomitan';
        try {
            const manifest = chrome.runtime.getManifest();
            this._extensionName = `${manifest.name} v${manifest.version}`;
        } catch (e) {
            // NOP
        }

        /** @type {?string} */
        this._extensionUrlBase = null;
        try {
            this._extensionUrlBase = chrome.runtime.getURL('/');
        } catch (e) {
            // NOP
        }

        /** @type {?boolean} */
        this._isBackground = null;
        /** @type {?API} */
        this._api = null;
        /** @type {?CrossFrameAPI} */
        this._crossFrame = null;
        /** @type {boolean} */
        this._isExtensionUnloaded = false;
        /** @type {boolean} */
        this._isTriggeringExtensionUnloaded = false;
        /** @type {boolean} */
        this._isReady = false;

        const {promise, resolve} = /** @type {import('core').DeferredPromiseDetails<void>} */ (deferPromise());
        /** @type {Promise<void>} */
        this._isBackendReadyPromise = promise;
        /** @type {?(() => void)} */
        this._isBackendReadyPromiseResolve = resolve;

        /* eslint-disable no-multi-spaces */
        /** @type {import('core').MessageHandlerMap} */
        this._messageHandlers = new Map(/** @type {import('core').MessageHandlerMapInit} */ ([
            ['Yomitan.isReady',         this._onMessageIsReady.bind(this)],
            ['Yomitan.backendReady',    this._onMessageBackendReady.bind(this)],
            ['Yomitan.getUrl',          this._onMessageGetUrl.bind(this)],
            ['Yomitan.optionsUpdated',  this._onMessageOptionsUpdated.bind(this)],
            ['Yomitan.databaseUpdated', this._onMessageDatabaseUpdated.bind(this)],
            ['Yomitan.zoomChanged',     this._onMessageZoomChanged.bind(this)]
        ]));
        /* eslint-enable no-multi-spaces */
    }

    /**
     * Whether the current frame is the background page/service worker or not.
     * @type {boolean}
     */
    get isBackground() {
        if (this._isBackground === null) { throw new Error('Not prepared'); }
        return /** @type {boolean} */ (this._isBackground);
    }

    /**
     * Whether or not the extension is unloaded.
     * @type {boolean}
     */
    get isExtensionUnloaded() {
        return this._isExtensionUnloaded;
    }

    /**
     * Gets the API instance for communicating with the backend.
     * This value will be null on the background page/service worker.
     * @type {API}
     */
    get api() {
        if (this._api === null) { throw new Error('Not prepared'); }
        return this._api;
    }

    /**
     * Gets the CrossFrameAPI instance for communicating with different frames.
     * This value will be null on the background page/service worker.
     * @type {CrossFrameAPI}
     */
    get crossFrame() {
        if (this._crossFrame === null) { throw new Error('Not prepared'); }
        return this._crossFrame;
    }

    /**
     * Prepares the instance for use.
     * @param {boolean} [isBackground=false] Assigns whether this instance is being used from the background page/service worker.
     */
    async prepare(isBackground = false) {
        this._isBackground = isBackground;
        chrome.runtime.onMessage.addListener(this._onMessage.bind(this));

        if (!isBackground) {
            this._api = new API(this);

            this.sendMessage({action: 'requestBackendReadySignal'});
            await this._isBackendReadyPromise;

            this._crossFrame = new CrossFrameAPI();
            await this._crossFrame.prepare();

            log.on('log', this._onForwardLog.bind(this));
        }
    }

    /**
     * Sends a message to the backend indicating that the frame is ready and all script
     * setup has completed.
     */
    ready() {
        this._isReady = true;
        this.sendMessage({action: 'yomitanReady'});
    }

    /**
     * Checks whether or not a URL is an extension URL.
     * @param {string} url The URL to check.
     * @returns {boolean} `true` if the URL is an extension URL, `false` otherwise.
     */
    isExtensionUrl(url) {
        return this._extensionUrlBase !== null && url.startsWith(this._extensionUrlBase);
    }

    /**
     * Runs `chrome.runtime.sendMessage()` with additional exception handling events.
     * @param {import('extension').ChromeRuntimeSendMessageArgs} args The arguments to be passed to `chrome.runtime.sendMessage()`.
     * @throws {Error} Errors thrown by `chrome.runtime.sendMessage()` are re-thrown.
     */
    sendMessage(...args) {
        try {
            // @ts-expect-error - issue with type conversion, somewhat difficult to resolve in pure JS
            chrome.runtime.sendMessage(...args);
        } catch (e) {
            this.triggerExtensionUnloaded();
            throw e;
        }
    }

    /**
     * Triggers the extensionUnloaded event.
     */
    triggerExtensionUnloaded() {
        this._isExtensionUnloaded = true;
        if (this._isTriggeringExtensionUnloaded) { return; }
        try {
            this._isTriggeringExtensionUnloaded = true;
            this.trigger('extensionUnloaded');
        } finally {
            this._isTriggeringExtensionUnloaded = false;
        }
    }

    // Private

    /**
     * @returns {string}
     */
    _getUrl() {
        return location.href;
    }

    /** @type {import('extension').ChromeRuntimeOnMessageCallback} */
    _onMessage({action, params}, sender, callback) {
        const messageHandler = this._messageHandlers.get(action);
        if (typeof messageHandler === 'undefined') { return false; }
        return invokeMessageHandler(messageHandler, params, callback, sender);
    }

    /**
     * @returns {boolean}
     */
    _onMessageIsReady() {
        return this._isReady;
    }

    /**
     * @returns {void}
     */
    _onMessageBackendReady() {
        if (this._isBackendReadyPromiseResolve === null) { return; }
        this._isBackendReadyPromiseResolve();
        this._isBackendReadyPromiseResolve = null;
    }

    /**
     * @returns {{url: string}}
     */
    _onMessageGetUrl() {
        return {url: this._getUrl()};
    }

    /**
     * @param {{source: string}} params
     */
    _onMessageOptionsUpdated({source}) {
        if (source !== 'background') {
            this.trigger('optionsUpdated', {source});
        }
    }

    /**
     * @param {{type: string, cause: string}} params
     */
    _onMessageDatabaseUpdated({type, cause}) {
        this.trigger('databaseUpdated', {type, cause});
    }

    /**
     * @param {{oldZoomFactor: number, newZoomFactor: number}} params
     */
    _onMessageZoomChanged({oldZoomFactor, newZoomFactor}) {
        this.trigger('zoomChanged', {oldZoomFactor, newZoomFactor});
    }

    /**
     * @param {{error: unknown, level: import('log').LogLevel, context?: import('log').LogContext}} params
     */
    async _onForwardLog({error, level, context}) {
        try {
            const api = /** @type {API} */ (this._api);
            await api.log(ExtensionError.serialize(error), level, context);
        } catch (e) {
            // NOP
        }
    }
}

/**
 * The default Yomitan class instance.
 */
export const yomitan = new Yomitan();
