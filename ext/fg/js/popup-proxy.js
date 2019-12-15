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
        this.parentId = parentId;
        this.parentFrameId = parentFrameId;
        this.id = null;
        this.idPromise = null;
        this.parent = null;
        this.child = null;
        this.depth = depth;
        this.url = url;

        this.container = null;

        this.apiSender = new FrontendApiSender();
    }

    async setOptions(options) {
        const id = await this._getPopupId();
        return await this._invokeHostApi('setOptions', {id, options});
    }

    async hide(changeFocus) {
        if (this.id === null) {
            return;
        }
        return await this._invokeHostApi('hide', {id: this.id, changeFocus});
    }

    async isVisibleAsync() {
        const id = await this._getPopupId();
        return await this._invokeHostApi('isVisibleAsync', {id});
    }

    async setVisibleOverride(visible) {
        const id = await this._getPopupId();
        return await this._invokeHostApi('setVisibleOverride', {id, visible});
    }

    async containsPoint(x, y) {
        if (this.id === null) {
            return false;
        }
        return await this._invokeHostApi('containsPoint', {id: this.id, x, y});
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

    async clearAutoPlayTimer() {
        if (this.id === null) {
            return;
        }
        return await this._invokeHostApi('clearAutoPlayTimer', {id: this.id});
    }

    // Private

    _getPopupId() {
        if (this.idPromise === null) {
            this.idPromise = this._getPopupIdAsync();
        }
        return this.idPromise;
    }

    async _getPopupIdAsync() {
        const id = await this._invokeHostApi('createNestedPopup', {parentId: this.parentId});
        this.id = id;
        return id;
    }

    _invokeHostApi(action, params={}) {
        if (typeof this.parentFrameId !== 'number') {
            return Promise.reject(new Error('Invalid frame'));
        }
        return this.apiSender.invoke(action, params, `popup-proxy-host#${this.parentFrameId}`);
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
