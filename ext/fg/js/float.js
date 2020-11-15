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
        super();
        this._nestedPopupsPrepared = false;
        this._frameEndpoint = new FrameEndpoint();
        this._windowMessageHandlers = new Map([
            ['extensionUnloaded', {async: false, handler: this._onMessageExtensionUnloaded.bind(this)}]
        ]);
        this._browser = null;
        this._copyTextarea = null;

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

        const {browser} = await api.getEnvironmentInfo();
        this._browser = browser;

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
        this.close();
    }

    async getDocumentTitle() {
        try {
            const targetFrameId = 0;
            const {title} = await api.crossFrame.invoke(targetFrameId, 'getDocumentInformation');
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

    close() {
        this._invokeOwner('closePopup');
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
        this.ownerFrameId = ownerFrameId;
        await this.setOptionsContext(optionsContext);

        if (childrenSupported && !this._nestedPopupsPrepared) {
            const {depth} = optionsContext;
            this._prepareNestedPopups(depth + 1, popupId, frameId);
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
        this._copyHostSelection();
        return true;
    }

    async _copyHostSelection() {
        switch (this._browser) {
            case 'firefox':
            case 'firefox-mobile':
                {
                    let text;
                    try {
                        text = await this._invokeOwner('getSelectionText');
                    } catch (e) {
                        break;
                    }
                    this._copyText(text);
                }
                break;
            default:
                this._invokeOwner('copySelection');
                break;
        }
    }

    _copyText(text) {
        const parent = document.body;
        if (parent === null) { return; }

        let textarea = this._copyTextarea;
        if (textarea === null) {
            textarea = document.createElement('textarea');
            this._copyTextarea = textarea;
        }

        textarea.value = text;
        parent.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        parent.removeChild(textarea);
    }

    _setContentScale(scale) {
        const body = document.body;
        if (body === null) { return; }
        body.style.fontSize = `${scale}em`;
    }

    async _prepareNestedPopups(depth, parentPopupId, parentFrameId) {
        let complete = false;

        const onOptionsUpdated = async () => {
            const optionsContext = this.getOptionsContext();
            const options = await api.optionsGet(optionsContext);
            const maxPopupDepthExceeded = !(typeof depth === 'number' && depth <= options.scanning.popupNestingMaxDepth);
            if (maxPopupDepthExceeded || complete) { return; }

            complete = true;
            yomichan.off('optionsUpdated', onOptionsUpdated);

            try {
                await this.setupNestedPopups({
                    depth,
                    parentPopupId,
                    parentFrameId,
                    useProxyPopup: true,
                    pageType: 'popup'
                });
            } catch (e) {
                yomichan.logError(e);
            }
        };

        yomichan.on('optionsUpdated', onOptionsUpdated);

        await onOptionsUpdated();
    }

    _invokeOwner(action, params={}) {
        return api.crossFrame.invoke(this.ownerFrameId, action, params);
    }
}
