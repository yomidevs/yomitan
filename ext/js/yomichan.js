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

/* global
 * API
 * CrossFrameAPI
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

/**
 * The Yomichan class is a core component through which various APIs are handled and invoked.
 */
class Yomichan extends EventDispatcher {
    /**
     * Creates a new instance. The instance should not be used until it has been fully prepare()'d.
     */
    constructor() {
        super();

        try {
            const manifest = chrome.runtime.getManifest();
            this._extensionName = `${manifest.name} v${manifest.version}`;
        } catch (e) {
            this._extensionName = 'Yomichan';
        }

        try {
            this._extensionUrlBase = chrome.runtime.getURL('/');
        } catch (e) {
            this._extensionUrlBase = null;
        }

        this._isBackground = null;
        this._api = null;
        this._crossFrame = null;
        this._isExtensionUnloaded = false;
        this._isTriggeringExtensionUnloaded = false;
        this._isReady = false;

        const {promise, resolve} = deferPromise();
        this._isBackendReadyPromise = promise;
        this._isBackendReadyPromiseResolve = resolve;

        this._messageHandlers = new Map([
            ['Yomichan.isReady',         {async: false, handler: this._onMessageIsReady.bind(this)}],
            ['Yomichan.backendReady',    {async: false, handler: this._onMessageBackendReady.bind(this)}],
            ['Yomichan.getUrl',          {async: false, handler: this._onMessageGetUrl.bind(this)}],
            ['Yomichan.optionsUpdated',  {async: false, handler: this._onMessageOptionsUpdated.bind(this)}],
            ['Yomichan.databaseUpdated', {async: false, handler: this._onMessageDatabaseUpdated.bind(this)}],
            ['Yomichan.zoomChanged',     {async: false, handler: this._onMessageZoomChanged.bind(this)}]
        ]);
    }

    /**
     * Whether the current frame is the background page/service worker or not.
     * @type {boolean}
     */
    get isBackground() {
        return this._isBackground;
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
        return this._api;
    }

    /**
     * Gets the CrossFrameAPI instance for communicating with different frames.
     * This value will be null on the background page/service worker.
     * @type {CrossFrameAPI}
     */
    get crossFrame() {
        return this._crossFrame;
    }

    /**
     * Prepares the instance for use.
     * @param {boolean} [isBackground=false] Assigns whether this instance is being used from the background page/service worker.
     */
    async prepare(isBackground=false) {
        this._isBackground = isBackground;
        chrome.runtime.onMessage.addListener(this._onMessage.bind(this));

        if (!isBackground) {
            this._api = new API(this);

            this._crossFrame = new CrossFrameAPI();
            this._crossFrame.prepare();

            this.sendMessage({action: 'requestBackendReadySignal'});
            await this._isBackendReadyPromise;

            log.on('log', this._onForwardLog.bind(this));
        }
    }

    /**
     * Sends a message to the backend indicating that the frame is ready and all script
     * setup has completed.
     */
    ready() {
        this._isReady = true;
        this.sendMessage({action: 'yomichanReady'});
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
     * @param {...*} args The arguments to be passed to `chrome.runtime.sendMessage()`.
     * @returns {void} The result of the `chrome.runtime.sendMessage()` call.
     * @throws {Error} Errors thrown by `chrome.runtime.sendMessage()` are re-thrown.
     */
    sendMessage(...args) {
        try {
            return chrome.runtime.sendMessage(...args);
        } catch (e) {
            this.triggerExtensionUnloaded();
            throw e;
        }
    }

    /**
     * Runs `chrome.runtime.connect()` with additional exception handling events.
     * @param {...*} args The arguments to be passed to `chrome.runtime.connect()`.
     * @returns {Port} The resulting port.
     * @throws {Error} Errors thrown by `chrome.runtime.connect()` are re-thrown.
     */
    connect(...args) {
        try {
            return chrome.runtime.connect(...args);
        } catch (e) {
            this.triggerExtensionUnloaded();
            throw e;
        }
    }

    /**
     * Runs chrome.runtime.connect() with additional exception handling events.
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

    _getUrl() {
        return location.href;
    }

    _getLogContext() {
        return {url: this._getUrl()};
    }

    _onMessage({action, params}, sender, callback) {
        const messageHandler = this._messageHandlers.get(action);
        if (typeof messageHandler === 'undefined') { return false; }
        return invokeMessageHandler(messageHandler, params, callback, sender);
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

    _onMessageDatabaseUpdated({type, cause}) {
        this.trigger('databaseUpdated', {type, cause});
    }

    _onMessageZoomChanged({oldZoomFactor, newZoomFactor}) {
        this.trigger('zoomChanged', {oldZoomFactor, newZoomFactor});
    }

    async _onForwardLog({error, level, context}) {
        try {
            await this._api.log(serializeError(error), level, context);
        } catch (e) {
            // NOP
        }
    }
}

/**
 * The default Yomichan class instance.
 */
const yomichan = new Yomichan();
