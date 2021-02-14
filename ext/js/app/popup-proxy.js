/*
 * Copyright (C) 2019-2021  Yomichan Authors
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

class PopupProxy extends EventDispatcher {
    constructor({
        id,
        depth,
        frameId,
        frameOffsetForwarder
    }) {
        super();
        this._id = id;
        this._depth = depth;
        this._frameId = frameId;
        this._frameOffsetForwarder = frameOffsetForwarder;

        this._frameOffset = [0, 0];
        this._frameOffsetPromise = null;
        this._frameOffsetUpdatedAt = null;
        this._frameOffsetExpireTimeout = 1000;
    }

    // Public properties

    get id() {
        return this._id;
    }

    get parent() {
        return null;
    }

    set parent(value) {
        throw new Error('Not supported on PopupProxy');
    }

    get child() {
        return null;
    }

    set child(value) {
        throw new Error('Not supported on PopupProxy');
    }

    get depth() {
        return this._depth;
    }

    get frameContentWindow() {
        return null;
    }

    get container() {
        return null;
    }

    get frameId() {
        return this._frameId;
    }

    // Public functions

    setOptionsContext(optionsContext, source) {
        return this._invokeSafe('setOptionsContext', {id: this._id, optionsContext, source});
    }

    hide(changeFocus) {
        return this._invokeSafe('hide', {id: this._id, changeFocus});
    }

    isVisible() {
        return this._invokeSafe('isVisible', {id: this._id}, false);
    }

    setVisibleOverride(value, priority) {
        return this._invokeSafe('setVisibleOverride', {id: this._id, value, priority}, null);
    }

    clearVisibleOverride(token) {
        return this._invokeSafe('clearVisibleOverride', {id: this._id, token}, false);
    }

    async containsPoint(x, y) {
        if (this._frameOffsetForwarder !== null) {
            await this._updateFrameOffset();
            [x, y] = this._applyFrameOffset(x, y);
        }
        return await this._invokeSafe('containsPoint', {id: this._id, x, y}, false);
    }

    async showContent(details, displayDetails) {
        const {elementRect} = details;
        if (typeof elementRect !== 'undefined') {
            let {x, y, width, height} = elementRect;
            if (this._frameOffsetForwarder !== null) {
                await this._updateFrameOffset();
                [x, y] = this._applyFrameOffset(x, y);
            }
            details.elementRect = {x, y, width, height};
        }
        return await this._invokeSafe('showContent', {id: this._id, details, displayDetails});
    }

    setCustomCss(css) {
        return this._invokeSafe('setCustomCss', {id: this._id, css});
    }

    clearAutoPlayTimer() {
        return this._invokeSafe('clearAutoPlayTimer', {id: this._id});
    }

    setContentScale(scale) {
        return this._invokeSafe('setContentScale', {id: this._id, scale});
    }

    isVisibleSync() {
        throw new Error('Not supported on PopupProxy');
    }

    updateTheme() {
        return this._invokeSafe('updateTheme', {id: this._id});
    }

    setCustomOuterCss(css, useWebExtensionApi) {
        return this._invokeSafe('setCustomOuterCss', {id: this._id, css, useWebExtensionApi});
    }

    getFrameRect() {
        return new DOMRect(0, 0, 0, 0);
    }

    getFrameSize() {
        return this._invokeSafe('popup.getFrameSize', {id: this._id}, {width: 0, height: 0, valid: false});
    }

    setFrameSize(width, height) {
        return this._invokeSafe('popup.setFrameSize', {id: this._id, width, height});
    }

    // Private

    _invoke(action, params={}) {
        return yomichan.crossFrame.invoke(this._frameId, action, params);
    }

    async _invokeSafe(action, params={}, defaultReturnValue) {
        try {
            return await this._invoke(action, params);
        } catch (e) {
            if (!yomichan.isExtensionUnloaded) { throw e; }
            return defaultReturnValue;
        }
    }

    async _updateFrameOffset() {
        const now = Date.now();
        const firstRun = this._frameOffsetUpdatedAt === null;
        const expired = firstRun || this._frameOffsetUpdatedAt < now - this._frameOffsetExpireTimeout;
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
            let offset = null;
            try {
                offset = await this._frameOffsetPromise;
            } catch (e) {
                // NOP
            }
            this._frameOffset = offset !== null ? offset : [0, 0];
            if (offset === null) {
                this.trigger('offsetNotFound');
                return;
            }
            this._frameOffsetUpdatedAt = now;
        } catch (e) {
            log.error(e);
        } finally {
            this._frameOffsetPromise = null;
        }
    }

    _applyFrameOffset(x, y) {
        const [offsetX, offsetY] = this._frameOffset;
        return [x + offsetX, y + offsetY];
    }
}
