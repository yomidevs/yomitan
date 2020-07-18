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
 * FrameEndpoint
 * Frontend
 * PopupFactory
 * api
 * dynamicLoader
 */

class DisplayFloat extends Display {
    constructor() {
        super(document.querySelector('#spinner'), document.querySelector('#definitions'));
        this._autoPlayAudioTimer = null;
        this._nestedPopupsPrepared = false;
        this._ownerFrameId = null;
        this._frameEndpoint = new FrameEndpoint();
        this._messageHandlers = new Map([
            ['configure',          {async: true,  handler: this._onMessageConfigure.bind(this)}],
            ['setOptionsContext',  {async: false, handler: this._onMessageSetOptionsContext.bind(this)}],
            ['setContent',         {async: false, handler: this._onMessageSetContent.bind(this)}],
            ['clearAutoPlayTimer', {async: false, handler: this._onMessageClearAutoPlayTimer.bind(this)}],
            ['setCustomCss',       {async: false, handler: this._onMessageSetCustomCss.bind(this)}],
            ['setContentScale',    {async: false, handler: this._onMessageSetContentScale.bind(this)}]
        ]);
        this._windowMessageHandlers = new Map([
            ['extensionUnloaded', {async: false, handler: this._onMessageExtensionUnloaded.bind(this)}]
        ]);

        this.registerActions([
            ['copy-host-selection', () => this._copySelection()]
        ]);
        this.registerHotkeys([
            {key: 'C', modifiers: ['ctrl'], action: 'copy-host-selection'}
        ]);
    }

    async prepare() {
        await super.prepare();

        api.crossFrame.registerHandlers([
            ['popupMessage', {async: 'dynamic', handler: this._onMessage.bind(this)}]
        ]);
        window.addEventListener('message', this._onWindowMessage.bind(this), false);

        this._frameEndpoint.signal();
    }

    onEscape() {
        this._invoke('closePopup');
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

    _onMessage(data) {
        if (!this._frameEndpoint.authenticate(data)) {
            throw new Error('Invalid authentication');
        }

        const {action, params} = data.data;
        const handlerInfo = this._messageHandlers.get(action);
        if (typeof handlerInfo === 'undefined') {
            throw new Error(`Invalid action: ${action}`);
        }

        const {async, handler} = handlerInfo;
        const result = handler(params);
        return {async, result};
    }

    _onWindowMessage(e) {
        const data = e.data;
        if (!this._frameEndpoint.authenticate(data)) { return; }

        const {action, params} = data.data;
        const messageHandler = this._windowMessageHandlers.get(action);
        if (typeof messageHandler === 'undefined') { return; }

        const callback = () => {}; // NOP
        yomichan.invokeMessageHandler(messageHandler, params, callback);
    }

    async _onMessageConfigure({frameId, ownerFrameId, popupId, optionsContext, childrenSupported, scale}) {
        this._ownerFrameId = ownerFrameId;
        this.setOptionsContext(optionsContext);

        await this.updateOptions();

        if (childrenSupported && !this._nestedPopupsPrepared) {
            const {depth, url} = optionsContext;
            this._prepareNestedPopups(popupId, depth, frameId, url);
            this._nestedPopupsPrepared = true;
        }

        this._setContentScale(scale);
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

    _onMessageExtensionUnloaded() {
        if (yomichan.isExtensionUnloaded) { return; }
        yomichan.triggerExtensionUnloaded();
    }

    // Private

    _copySelection() {
        if (window.getSelection().toString()) { return false; }
        this._invoke('copySelection');
        return true;
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
            '/mixed/js/frame-client.js',
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

    _invoke(action, params={}) {
        return api.crossFrame.invoke(this._ownerFrameId, action, params);
    }
}
