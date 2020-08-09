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
 * api
 */

class DisplayFloat extends Display {
    constructor() {
        super(document.querySelector('#spinner'), document.querySelector('#definitions'));
        this._nestedPopupsPrepared = false;
        this._ownerFrameId = null;
        this._frameEndpoint = new FrameEndpoint();
        this._windowMessageHandlers = new Map([
            ['extensionUnloaded', {async: false, handler: this._onMessageExtensionUnloaded.bind(this)}]
        ]);

        this.registerActions([
            ['copyHostSelection', () => this._copySelection()]
        ]);
        this.registerHotkeys([
            {key: 'C', modifiers: ['ctrl'], action: 'copyHostSelection'}
        ]);

        this.autoPlayAudioDelay = 400;
    }

    async prepare() {
        await super.prepare();

        this.registerDirectMessageHandlers([
            ['configure',       {async: true,  handler: this._onMessageConfigure.bind(this)}],
            ['setContentScale', {async: false, handler: this._onMessageSetContentScale.bind(this)}]
        ]);
        window.addEventListener('message', this._onWindowMessage.bind(this), false);
        document.documentElement.addEventListener('mouseup', this._onMouseUp.bind(this), false);
        document.documentElement.addEventListener('click', this._onClick.bind(this), false);
        document.documentElement.addEventListener('auxclick', this._onClick.bind(this), false);

        this.initializeState();

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

    authenticateMessageData(data) {
        if (!this._frameEndpoint.authenticate(data)) {
            throw new Error('Invalid authentication');
        }
        return data.data;
    }

    // Message handling

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

    _onMessageSetContentScale({scale}) {
        this._setContentScale(scale);
    }

    _onMessageExtensionUnloaded() {
        if (yomichan.isExtensionUnloaded) { return; }
        yomichan.triggerExtensionUnloaded();
    }

    // Private

    _onMouseUp(e) {
        switch (e.button) {
            case 3: // Back
                if (this._history.hasPrevious()) {
                    e.preventDefault();
                }
                break;
            case 4: // Forward
                if (this._history.hasNext()) {
                    e.preventDefault();
                }
                break;
        }
    }

    _onClick(e) {
        switch (e.button) {
            case 3: // Back
                if (this._history.hasPrevious()) {
                    e.preventDefault();
                    this._history.back();
                }
                break;
            case 4: // Forward
                if (this._history.hasNext()) {
                    e.preventDefault();
                    this._history.forward();
                }
                break;
        }
    }

    _copySelection() {
        if (window.getSelection().toString()) { return false; }
        this._invoke('copySelection');
        return true;
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
                await this.setupNestedPopups({
                    id,
                    depth,
                    parentFrameId,
                    url,
                    proxy: true
                });
            } catch (e) {
                yomichan.logError(e);
            }
        };

        yomichan.on('optionsUpdated', onOptionsUpdated);

        await onOptionsUpdated();
    }

    _invoke(action, params={}) {
        return api.crossFrame.invoke(this._ownerFrameId, action, params);
    }
}
