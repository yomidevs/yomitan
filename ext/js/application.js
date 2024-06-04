/*
 * Copyright (C) 2023-2024  Yomitan Authors
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
import {createApiMap, invokeApiMapHandler} from './core/api-map.js';
import {EventDispatcher} from './core/event-dispatcher.js';
import {ExtensionError} from './core/extension-error.js';
import {log} from './core/log.js';
import {deferPromise} from './core/utilities.js';
import {WebExtension} from './extension/web-extension.js';

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
 * @param {WebExtension} webExtension
 */
async function waitForBackendReady(webExtension) {
    const {promise, resolve} = /** @type {import('core').DeferredPromiseDetails<void>} */ (deferPromise());
    /** @type {import('application').ApiMap} */
    const apiMap = createApiMap([['applicationBackendReady', () => { resolve(); }]]);
    /** @type {import('extension').ChromeRuntimeOnMessageCallback<import('application').ApiMessageAny>} */
    const onMessage = ({action, params}, _sender, callback) => invokeApiMapHandler(apiMap, action, params, [], callback);
    chrome.runtime.onMessage.addListener(onMessage);
    try {
        await webExtension.sendMessagePromise({action: 'requestBackendReadySignal'});
        await promise;
    } finally {
        chrome.runtime.onMessage.removeListener(onMessage);
    }
}

/**
 * @returns {Promise<void>}
 */
function waitForDomContentLoaded() {
    return new Promise((resolve) => {
        if (document.readyState !== 'loading') {
            resolve();
            return;
        }
        const onDomContentLoaded = () => {
            document.removeEventListener('DOMContentLoaded', onDomContentLoaded);
            resolve();
        };
        document.addEventListener('DOMContentLoaded', onDomContentLoaded);
    });
}

/**
 * The Yomitan class is a core component through which various APIs are handled and invoked.
 * @augments EventDispatcher<import('application').Events>
 */
export class Application extends EventDispatcher {
    /**
     * Creates a new instance. The instance should not be used until it has been fully prepare()'d.
     * @param {API} api
     * @param {CrossFrameAPI} crossFrameApi
     */
    constructor(api, crossFrameApi) {
        super();
        /** @type {WebExtension} */
        this._webExtension = new WebExtension();
        /** @type {?boolean} */
        this._isBackground = null;
        /** @type {API} */
        this._api = api;
        /** @type {CrossFrameAPI} */
        this._crossFrame = crossFrameApi;
        /** @type {boolean} */
        this._isReady = false;
        /* eslint-disable @stylistic/no-multi-spaces */
        /** @type {import('application').ApiMap} */
        this._apiMap = createApiMap([
            ['applicationIsReady',         this._onMessageIsReady.bind(this)],
            ['applicationGetUrl',          this._onMessageGetUrl.bind(this)],
            ['applicationOptionsUpdated',  this._onMessageOptionsUpdated.bind(this)],
            ['applicationDatabaseUpdated', this._onMessageDatabaseUpdated.bind(this)],
            ['applicationZoomChanged',     this._onMessageZoomChanged.bind(this)],
        ]);
        /* eslint-enable @stylistic/no-multi-spaces */
    }

    /** @type {WebExtension} */
    get webExtension() {
        return this._webExtension;
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
     * @type {?number}
     */
    get tabId() {
        return this._crossFrame.tabId;
    }

    /**
     * @type {?number}
     */
    get frameId() {
        return this._crossFrame.frameId;
    }

    /**
     * Prepares the instance for use.
     */
    prepare() {
        chrome.runtime.onMessage.addListener(this._onMessage.bind(this));
        log.on('logGenericError', this._onLogGenericError.bind(this));
    }

    /**
     * Sends a message to the backend indicating that the frame is ready and all script
     * setup has completed.
     */
    ready() {
        if (this._isReady) { return; }
        this._isReady = true;
        void this._webExtension.sendMessagePromise({action: 'applicationReady'});
    }

    /** */
    triggerStorageChanged() {
        this.trigger('storageChanged', {});
    }

    /** */
    triggerClosePopups() {
        this.trigger('closePopups', {});
    }

    /**
     * @param {boolean} waitForDom
     * @param {(application: Application) => (Promise<void>)} mainFunction
     */
    static async main(waitForDom, mainFunction) {
        const webExtension = new WebExtension();
        log.configure(webExtension.extensionName);
        const api = new API(webExtension);
        await waitForBackendReady(webExtension);
        const {tabId, frameId} = await api.frameInformationGet();
        const crossFrameApi = new CrossFrameAPI(api, tabId, frameId);
        crossFrameApi.prepare();
        const application = new Application(api, crossFrameApi);
        application.prepare();
        if (waitForDom) { await waitForDomContentLoaded(); }
        try {
            await mainFunction(application);
        } catch (error) {
            log.error(error);
        } finally {
            application.ready();
        }
    }

    // Private

    /**
     * @returns {string}
     */
    _getUrl() {
        return location.href;
    }

    /** @type {import('extension').ChromeRuntimeOnMessageCallback<import('application').ApiMessageAny>} */
    _onMessage({action, params}, _sender, callback) {
        return invokeApiMapHandler(this._apiMap, action, params, [], callback);
    }

    /** @type {import('application').ApiHandler<'applicationIsReady'>} */
    _onMessageIsReady() {
        return this._isReady;
    }

    /** @type {import('application').ApiHandler<'applicationGetUrl'>} */
    _onMessageGetUrl() {
        return {url: this._getUrl()};
    }

    /** @type {import('application').ApiHandler<'applicationOptionsUpdated'>} */
    _onMessageOptionsUpdated({source}) {
        if (source !== 'background') {
            this.trigger('optionsUpdated', {source});
        }
    }

    /** @type {import('application').ApiHandler<'applicationDatabaseUpdated'>} */
    _onMessageDatabaseUpdated({type, cause}) {
        this.trigger('databaseUpdated', {type, cause});
    }

    /** @type {import('application').ApiHandler<'applicationZoomChanged'>} */
    _onMessageZoomChanged({oldZoomFactor, newZoomFactor}) {
        this.trigger('zoomChanged', {oldZoomFactor, newZoomFactor});
    }

    /**
     * @param {import('log').Events['logGenericError']} params
     */
    async _onLogGenericError({error, level, context}) {
        try {
            await this._api.logGenericErrorBackend(ExtensionError.serialize(error), level, context);
        } catch (e) {
            // NOP
        }
    }
}
