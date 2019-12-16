/*
 * Copyright (C) 2019 Alex Yatskov <alex@foosoft.net>
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
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */


class PopupProxy {
    constructor(depth, parentId, parentFrameId, url) {
        this._parentId = parentId;
        this._parentFrameId = parentFrameId;
        this._id = null;
        this._idPromise = null;
        this._depth = depth;
        this._url = url;
        this._apiSender = new FrontendApiSender();
    }

    // Public properties

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

    isProxy() {
        return true;
    }

    async setOptions(options) {
        const id = await this._getPopupId();
        return await this._invokeHostApi('setOptions', {id, options});
    }

    hide(changeFocus) {
        if (this._id === null) {
            return;
        }
        this._invokeHostApi('hide', {id: this._id, changeFocus});
    }

    async isVisible() {
        const id = await this._getPopupId();
        return await this._invokeHostApi('isVisible', {id});
    }

    setVisibleOverride(visible) {
        if (this._id === null) {
            return;
        }
        this._invokeHostApi('setVisibleOverride', {id, visible});
    }

    async containsPoint(x, y) {
        if (this._id === null) {
            return false;
        }
        return await this._invokeHostApi('containsPoint', {id: this._id, x, y});
    }

    async showContent(elementRect, writingMode, type=null, details=null) {
        const id = await this._getPopupId();
        elementRect = PopupProxy._convertDOMRectToJson(elementRect);
        return await this._invokeHostApi('showContent', {id, elementRect, writingMode, type, details});
    }

    async setCustomCss(css) {
        const id = await this._getPopupId();
        return await this._invokeHostApi('setCustomCss', {id, css});
    }

    clearAutoPlayTimer() {
        if (this._id === null) {
            return;
        }
        this._invokeHostApi('clearAutoPlayTimer', {id: this._id});
    }

    // Private

    _getPopupId() {
        if (this._idPromise === null) {
            this._idPromise = this._getPopupIdAsync();
        }
        return this._idPromise;
    }

    async _getPopupIdAsync() {
        const id = await this._invokeHostApi('createNestedPopup', {parentId: this._parentId});
        this._id = id;
        return id;
    }

    _invokeHostApi(action, params={}) {
        if (typeof this._parentFrameId !== 'number') {
            return Promise.reject(new Error('Invalid frame'));
        }
        return this._apiSender.invoke(action, params, `popup-proxy-host#${this._parentFrameId}`);
    }

    static _convertDOMRectToJson(domRect) {
        return {
            x: domRect.x,
            y: domRect.y,
            width: domRect.width,
            height: domRect.height
        };
    }
}
