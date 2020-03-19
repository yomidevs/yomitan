/*
 * Copyright (C) 2019-2020  Alex Yatskov <alex@foosoft.net>
 * Author: Alex Yatskov <alex@foosoft.net>
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
 * FrontendApiSender
 */

class PopupProxy {
    constructor(id, depth, parentId, parentFrameId, url) {
        this._parentId = parentId;
        this._parentFrameId = parentFrameId;
        this._id = id;
        this._depth = depth;
        this._url = url;
        this._apiSender = new FrontendApiSender();

        this._windowMessageHandlers = new Map([
            ['getIframeOffset', ({offset, uniqueId}, e) => { return this._onGetIframeOffset(offset, uniqueId, e); }]
        ]);

        window.addEventListener('message', this.onMessage.bind(this), false);
    }

    // Public properties

    get id() {
        return this._id;
    }

    get parent() {
        return null;
    }

    get depth() {
        return this._depth;
    }

    get url() {
        return this._url;
    }

    // Public functions

    async prepare() {
        const {id} = await this._invokeHostApi('getOrCreatePopup', {id: this._id, parentId: this._parentId});
        this._id = id;
    }

    isProxy() {
        return true;
    }

    broadcastRootPopupInformation() {
        // NOP
    }

    async setOptions(options) {
        return await this._invokeHostApi('setOptions', {id: this._id, options});
    }

    hide(changeFocus) {
        this._invokeHostApi('hide', {id: this._id, changeFocus});
    }

    async isVisible() {
        return await this._invokeHostApi('isVisible', {id: this._id});
    }

    setVisibleOverride(visible) {
        this._invokeHostApi('setVisibleOverride', {id: this._id, visible});
    }

    async containsPoint(x, y) {
        if (this._depth === 0) {
            [x, y] = await PopupProxy._convertIframePointToRootPagePoint(x, y);
        }
        return await this._invokeHostApi('containsPoint', {id: this._id, x, y});
    }

    async showContent(elementRect, writingMode, type=null, details=null) {
        let {x, y, width, height} = elementRect;
        if (this._depth === 0) {
            [x, y] = await PopupProxy._convertIframePointToRootPagePoint(x, y);
        }
        elementRect = {x, y, width, height};
        return await this._invokeHostApi('showContent', {id: this._id, elementRect, writingMode, type, details});
    }

    async setCustomCss(css) {
        return await this._invokeHostApi('setCustomCss', {id: this._id, css});
    }

    clearAutoPlayTimer() {
        this._invokeHostApi('clearAutoPlayTimer', {id: this._id});
    }

    async setContentScale(scale) {
        this._invokeHostApi('setContentScale', {id: this._id, scale});
    }

    // Window message handlers

    onMessage(e) {
        const {action, params} = e.data;
        const handler = this._windowMessageHandlers.get(action);
        if (typeof handler !== 'function') { return; }
        handler(params, e);
    }

    _onGetIframeOffset(offset, uniqueId, e) {
        let sourceIframe = null;
        for (const iframe of document.querySelectorAll('iframe:not(.yomichan-float)')) {
            if (iframe.contentWindow !== e.source) { continue; }
            sourceIframe = iframe;
            break;
        }
        if (sourceIframe === null) { return; }

        const [forwardedX, forwardedY] = offset;
        const {x, y} = sourceIframe.getBoundingClientRect();
        offset = [forwardedX + x, forwardedY + y];
        window.parent.postMessage({action: 'getIframeOffset', params: {offset, uniqueId}}, '*');
    }


    // Private

    _invokeHostApi(action, params={}) {
        if (typeof this._parentFrameId !== 'number') {
            return Promise.reject(new Error('Invalid frame'));
        }
        return this._apiSender.invoke(action, params, `popup-proxy-host#${this._parentFrameId}`);
    }

    static async _convertIframePointToRootPagePoint(x, y) {
        const uniqueId = yomichan.generateId(16);

        let frameOffsetResolve = null;
        const frameOffsetPromise = new Promise((resolve) => (frameOffsetResolve = resolve));

        const runtimeMessageCallback = ({action, params}, sender, callback) => {
            if (action === 'iframeOffset' && isObject(params) && params.uniqueId === uniqueId) {
                chrome.runtime.onMessage.removeListener(runtimeMessageCallback);
                callback();
                frameOffsetResolve(params);
                return false;
            }
        };
        chrome.runtime.onMessage.addListener(runtimeMessageCallback);

        window.parent.postMessage({
            action: 'getIframeOffset',
            params: {
                uniqueId,
                offset: [x, y]
            }
        }, '*');

        const {offset} = await frameOffsetPromise;

        return offset;
    }
}
