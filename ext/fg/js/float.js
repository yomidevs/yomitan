/*
 * Copyright (C) 2016-2020  Yomichan Authors
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
 * Display
 * apiBroadcastTab
 * apiSendMessageToFrame
 * popupNestedInitialize
 */

class DisplayFloat extends Display {
    constructor() {
        super(document.querySelector('#spinner'), document.querySelector('#definitions'));
        this.autoPlayAudioTimer = null;

        this._secret = yomichan.generateId(16);
        this._token = null;

        this._orphaned = false;
        this._initializedNestedPopups = false;

        this._onKeyDownHandlers = new Map([
            ['C', (e) => {
                if (e.ctrlKey && !window.getSelection().toString()) {
                    this.onSelectionCopy();
                    return true;
                }
                return false;
            }],
            ...this._onKeyDownHandlers
        ]);

        this._windowMessageHandlers = new Map([
            ['initialize', {handler: this._initialize.bind(this), authenticate: false}],
            ['configure', {handler: this._configure.bind(this)}],
            ['setOptionsContext', {handler: ({optionsContext}) => this.setOptionsContext(optionsContext)}],
            ['setContent', {handler: ({type, details}) => this.setContent(type, details)}],
            ['clearAutoPlayTimer', {handler: () => this.clearAutoPlayTimer()}],
            ['setCustomCss', {handler: ({css}) => this.setCustomCss(css)}],
            ['setContentScale', {handler: ({scale}) => this.setContentScale(scale)}]
        ]);
    }

    async prepare() {
        await super.prepare();

        yomichan.on('orphaned', this.onOrphaned.bind(this));
        window.addEventListener('message', this.onMessage.bind(this), false);

        apiBroadcastTab('popupPrepared', {secret: this._secret});
    }

    onError(error) {
        if (this._orphaned) {
            this.setContent('orphaned');
        } else {
            yomichan.logError(error);
        }
    }

    onOrphaned() {
        this._orphaned = true;
    }

    onEscape() {
        window.parent.postMessage('popupClose', '*');
    }

    onSelectionCopy() {
        window.parent.postMessage('selectionCopy', '*');
    }

    onMessage(e) {
        const data = e.data;
        if (typeof data !== 'object' || data === null) {
            this._logMessageError(e, 'Invalid data');
            return;
        }

        const action = data.action;
        if (typeof action !== 'string') {
            this._logMessageError(e, 'Invalid data');
            return;
        }

        const handlerInfo = this._windowMessageHandlers.get(action);
        if (typeof handlerInfo === 'undefined') {
            this._logMessageError(e, `Invalid action: ${JSON.stringify(action)}`);
            return;
        }

        if (handlerInfo.authenticate !== false && !this._isMessageAuthenticated(data)) {
            this._logMessageError(e, 'Invalid authentication');
            return;
        }

        const handler = handlerInfo.handler;
        handler(data.params);
    }

    autoPlayAudio() {
        this.clearAutoPlayTimer();
        this.autoPlayAudioTimer = window.setTimeout(() => super.autoPlayAudio(), 400);
    }

    clearAutoPlayTimer() {
        if (this.autoPlayAudioTimer) {
            window.clearTimeout(this.autoPlayAudioTimer);
            this.autoPlayAudioTimer = null;
        }
    }

    async setOptionsContext(optionsContext) {
        this.optionsContext = optionsContext;
        await this.updateOptions();
    }

    setContentScale(scale) {
        const body = document.body;
        if (body === null) { return; }
        body.style.fontSize = `${scale}em`;
    }

    async getDocumentTitle() {
        try {
            const uniqueId = yomichan.generateId(16);

            const promise = yomichan.getTemporaryListenerResult(
                chrome.runtime.onMessage,
                ({action, params}, {resolve}) => {
                    if (
                        action === 'documentInformationBroadcast' &&
                        isObject(params) &&
                        params.uniqueId === uniqueId &&
                        params.frameId === 0
                    ) {
                        resolve(params);
                    }
                },
                2000
            );
            apiBroadcastTab('requestDocumentInformationBroadcast', {uniqueId});

            const {title} = await promise;
            return title;
        } catch (e) {
            return '';
        }
    }

    _logMessageError(event, type) {
        yomichan.logWarning(new Error(`Popup received invalid message from origin ${JSON.stringify(event.origin)}: ${type}`));
    }

    _initialize(params) {
        if (this._token !== null) { return; } // Already initialized
        if (!isObject(params)) { return; } // Invalid data

        const secret = params.secret;
        if (secret !== this._secret) { return; } // Invalid authentication

        const {token, frameId} = params;
        this._token = token;

        apiSendMessageToFrame(frameId, 'popupInitialized', {secret, token});
    }

    async _configure({messageId, frameId, popupId, optionsContext, childrenSupported, scale}) {
        this.optionsContext = optionsContext;

        await this.updateOptions();

        if (childrenSupported && !this._initializedNestedPopups) {
            const {depth, url} = optionsContext;
            popupNestedInitialize(popupId, depth, frameId, url);
            this._initializedNestedPopups = true;
        }

        this.setContentScale(scale);

        apiSendMessageToFrame(frameId, 'popupConfigured', {messageId});
    }

    _isMessageAuthenticated(message) {
        return (
            this._token !== null &&
            this._token === message.token &&
            this._secret === message.secret
        );
    }
}
