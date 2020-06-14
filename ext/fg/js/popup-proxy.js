/*
 * Copyright (C) 2019-2020  Yomichan Authors
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
 * api
 */

class PopupProxy extends EventDispatcher {
    constructor(id, depth, parentPopupId, parentFrameId, frameOffsetForwarder=null) {
        super();
        this._id = id;
        this._depth = depth;
        this._parentPopupId = parentPopupId;
        this._parentFrameId = parentFrameId;
        this._frameOffsetForwarder = frameOffsetForwarder;

        this._frameOffset = null;
        this._frameOffsetPromise = null;
        this._frameOffsetUpdatedAt = null;
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

    // Public functions

    async prepare() {
        const {id} = await this._invoke('getOrCreatePopup', {id: this._id, parentId: this._parentPopupId});
        this._id = id;
    }

    isProxy() {
        return true;
    }

    async setOptionsContext(optionsContext, source) {
        return await this._invoke('setOptionsContext', {id: this._id, optionsContext, source});
    }

    hide(changeFocus) {
        this._invoke('hide', {id: this._id, changeFocus});
    }

    async isVisible() {
        return await this._invoke('isVisible', {id: this._id});
    }

    setVisibleOverride(visible) {
        this._invoke('setVisibleOverride', {id: this._id, visible});
    }

    async containsPoint(x, y) {
        if (this._frameOffsetForwarder !== null) {
            await this._updateFrameOffset();
            [x, y] = this._applyFrameOffset(x, y);
        }
        return await this._invoke('containsPoint', {id: this._id, x, y});
    }

    async showContent(elementRect, writingMode, type, details, context) {
        let {x, y, width, height} = elementRect;
        if (this._frameOffsetForwarder !== null) {
            await this._updateFrameOffset();
            [x, y] = this._applyFrameOffset(x, y);
        }
        elementRect = {x, y, width, height};
        return await this._invoke('showContent', {id: this._id, elementRect, writingMode, type, details, context});
    }

    setCustomCss(css) {
        this._invoke('setCustomCss', {id: this._id, css});
    }

    clearAutoPlayTimer() {
        this._invoke('clearAutoPlayTimer', {id: this._id});
    }

    setContentScale(scale) {
        this._invoke('setContentScale', {id: this._id, scale});
    }

    async getUrl() {
        return await this._invoke('getUrl', {});
    }

    // Private

    _invoke(action, params={}) {
        return api.crossFrame.invoke(this._parentFrameId, action, params);
    }

    async _updateFrameOffset() {
        const now = Date.now();
        const firstRun = this._frameOffsetUpdatedAt === null;
        const expired = firstRun || this._frameOffsetUpdatedAt < now - PopupProxy._frameOffsetExpireTimeout;
        if (this._frameOffsetPromise === null && !expired) { return; }

        if (this._frameOffsetPromise !== null) {
            if (firstRun) {
                await this._frameOffsetPromise;
            }
            return;
        }

        const promise = this._updateFrameOffsetInner(now);
        if (firstRun) {
            await promise;
        }
    }

    async _updateFrameOffsetInner(now) {
        this._frameOffsetPromise = this._frameOffsetForwarder.getOffset();
        try {
            const offset = await this._frameOffsetPromise;
            this._frameOffset = offset !== null ? offset : [0, 0];
            if (offset === null) {
                this.trigger('offsetNotFound');
                return;
            }
            this._frameOffsetUpdatedAt = now;
        } catch (e) {
            yomichan.logError(e);
        } finally {
            this._frameOffsetPromise = null;
        }
    }

    _applyFrameOffset(x, y) {
        const [offsetX, offsetY] = this._frameOffset;
        return [x + offsetX, y + offsetY];
    }
}

PopupProxy._frameOffsetExpireTimeout = 1000;
