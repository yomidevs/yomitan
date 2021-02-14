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
            ['isReady',         {async: false, handler: this._onMessageIsReady.bind(this)}],
            ['backendReady',    {async: false, handler: this._onMessageBackendReady.bind(this)}],
            ['getUrl',          {async: false, handler: this._onMessageGetUrl.bind(this)}],
            ['optionsUpdated',  {async: false, handler: this._onMessageOptionsUpdated.bind(this)}],
            ['databaseUpdated', {async: false, handler: this._onMessageDatabaseUpdated.bind(this)}],
            ['zoomChanged',     {async: false, handler: this._onMessageZoomChanged.bind(this)}]
        ]);
    }

    // Public

    get isBackground() {
        return this._isBackground;
    }

    get isExtensionUnloaded() {
        return this._isExtensionUnloaded;
    }

    get api() {
        return this._api;
    }

    get crossFrame() {
        return this._crossFrame;
    }

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

    ready() {
        this._isReady = true;
        this.sendMessage({action: 'yomichanReady'});
    }

    isExtensionUrl(url) {
        try {
            return url.startsWith(chrome.runtime.getURL('/'));
        } catch (e) {
            return false;
        }
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

const yomichan = new Yomichan();
