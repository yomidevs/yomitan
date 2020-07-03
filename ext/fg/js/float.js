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
 * Frontend
 * PopupFactory
 * api
 * dynamicLoader
 */

class DisplayFloat extends Display {
    constructor() {
        super(document.querySelector('#spinner'), document.querySelector('#definitions'));
        this._autoPlayAudioTimer = null;
        this._secret = yomichan.generateId(16);
        this._token = null;
        this._nestedPopupsPrepared = false;
        this._windowMessageHandlers = new Map([
            ['initialize',         {handler: this._onMessageInitialize.bind(this), authenticate: false}],
            ['configure',          {handler: this._onMessageConfigure.bind(this)}],
            ['setOptionsContext',  {handler: this._onMessageSetOptionsContext.bind(this)}],
            ['setContent',         {handler: this._onMessageSetContent.bind(this)}],
            ['clearAutoPlayTimer', {handler: this._onMessageClearAutoPlayTimer.bind(this)}],
            ['setCustomCss',       {handler: this._onMessageSetCustomCss.bind(this)}],
            ['setContentScale',    {handler: this._onMessageSetContentScale.bind(this)}]
        ]);

        this.setOnKeyDownHandlers([
            ['C', (e) => {
                if (e.ctrlKey && !window.getSelection().toString()) {
                    this._copySelection();
                    return true;
                }
                return false;
            }]
        ]);
    }

    async prepare() {
        await super.prepare();

        window.addEventListener('message', this._onMessage.bind(this), false);

        api.broadcastTab('popupPrepared', {secret: this._secret});
    }

    onEscape() {
        window.parent.postMessage('popupClose', '*');
    }

    async setOptionsContext(optionsContext) {
        super.setOptionsContext(optionsContext);
        await this.updateOptions();
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
            api.broadcastTab('requestDocumentInformationBroadcast', {uniqueId});

            const {title} = await promise;
            return title;
        } catch (e) {
            return '';
        }
    }

    autoPlayAudio() {
        this._clearAutoPlayTimer();
        this._autoPlayAudioTimer = window.setTimeout(() => super.autoPlayAudio(), 400);
    }

    // Message handling

    _onMessage(e) {
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

    _onMessageInitialize(params) {
        this._initialize(params);
    }

    async _onMessageConfigure({messageId, frameId, popupId, optionsContext, childrenSupported, scale}) {
        this.setOptionsContext(optionsContext);

        await this.updateOptions();

        if (childrenSupported && !this._nestedPopupsPrepared) {
            const {depth, url} = optionsContext;
            this._prepareNestedPopups(popupId, depth, frameId, url);
            this._nestedPopupsPrepared = true;
        }

        this._setContentScale(scale);

        api.sendMessageToFrame(frameId, 'popupConfigured', {messageId});
    }

    _onMessageSetOptionsContext({optionsContext}) {
        this.setOptionsContext(optionsContext);
    }

    _onMessageSetContent({type, details}) {
        this.setContent(type, details);
    }

    _onMessageClearAutoPlayTimer() {
        this._clearAutoPlayTimer.bind(this);
    }

    _onMessageSetCustomCss({css}) {
        this.setCustomCss(css);
    }

    _onMessageSetContentScale({scale}) {
        this._setContentScale(scale);
    }

    // Private

    _copySelection() {
        window.parent.postMessage('selectionCopy', '*');
    }

    _clearAutoPlayTimer() {
        if (this._autoPlayAudioTimer) {
            window.clearTimeout(this._autoPlayAudioTimer);
            this._autoPlayAudioTimer = null;
        }
    }

    _setContentScale(scale) {
        const body = document.body;
        if (body === null) { return; }
        body.style.fontSize = `${scale}em`;
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

        api.sendMessageToFrame(frameId, 'popupInitialized', {secret, token});
    }

    _isMessageAuthenticated(message) {
        return (
            this._token !== null &&
            this._token === message.token &&
            this._secret === message.secret
        );
    }

    async _prepareNestedPopups(id, depth, parentFrameId, url) {
        let complete = false;

        const onOptionsUpdated = async () => {
            const optionsContext = this.getOptionsContext();
            const options = await api.optionsGet(optionsContext);
            const maxPopupDepthExceeded = !(typeof depth === 'number' && depth < options.scanning.popupNestingMaxDepth);
            if (maxPopupDepthExceeded || complete) { return; }

            complete = true;
            yomichan.off('optionsUpdated', onOptionsUpdated);

            try {
                await this._setupNestedPopups(id, depth, parentFrameId, url);
            } catch (e) {
                yomichan.logError(e);
            }
        };

        yomichan.on('optionsUpdated', onOptionsUpdated);

        await onOptionsUpdated();
    }

    async _setupNestedPopups(id, depth, parentFrameId, url) {
        await dynamicLoader.loadScripts([
            '/mixed/js/text-scanner.js',
            '/fg/js/popup.js',
            '/fg/js/popup-proxy.js',
            '/fg/js/popup-factory.js',
            '/fg/js/frame-offset-forwarder.js',
            '/fg/js/frontend.js'
        ]);

        const {frameId} = await api.frameInformationGet();

        const popupFactory = new PopupFactory(frameId);
        popupFactory.prepare();

        const frontend = new Frontend(
            frameId,
            popupFactory,
            {
                id,
                depth,
                parentFrameId,
                url,
                proxy: true
            }
        );
        await frontend.prepare();
    }
}
