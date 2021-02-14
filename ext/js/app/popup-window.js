/*
 * Copyright (C) 2020-2021  Yomichan Authors
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

class PopupWindow extends EventDispatcher {
    constructor({
        id,
        depth,
        frameId
    }) {
        super();
        this._id = id;
        this._depth = depth;
        this._frameId = frameId;
        this._popupTabId = null;
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
        return this._invoke(false, 'setOptionsContext', {id: this._id, optionsContext, source});
    }

    hide(_changeFocus) {
        // NOP
    }

    async isVisible() {
        return (this._popupTabId !== null && await yomichan.api.isTabSearchPopup(this._popupTabId));
    }

    async setVisibleOverride(_value, _priority) {
        return null;
    }

    clearVisibleOverride(_token) {
        return false;
    }

    async containsPoint(_x, _y) {
        return false;
    }

    async showContent(_details, displayDetails) {
        if (displayDetails === null) { return; }
        await this._invoke(true, 'setContent', {id: this._id, details: displayDetails});
    }

    setCustomCss(css) {
        return this._invoke(false, 'setCustomCss', {id: this._id, css});
    }

    clearAutoPlayTimer() {
        return this._invoke(false, 'clearAutoPlayTimer', {id: this._id});
    }

    setContentScale(_scale) {
        // NOP
    }

    isVisibleSync() {
        throw new Error('Not supported on PopupWindow');
    }

    updateTheme() {
        // NOP
    }

    async setCustomOuterCss(_css, _useWebExtensionApi) {
        // NOP
    }

    getFrameRect() {
        return new DOMRect(0, 0, 0, 0);
    }

    async getFrameSize() {
        return {width: 0, height: 0, valid: false};
    }

    async setFrameSize(_width, _height) {
        return false;
    }

    // Private

    async _invoke(open, action, params={}, defaultReturnValue) {
        if (yomichan.isExtensionUnloaded) {
            return defaultReturnValue;
        }

        const frameId = 0;
        if (this._popupTabId !== null) {
            try {
                return await yomichan.crossFrame.invokeTab(this._popupTabId, frameId, 'popupMessage', {action, params});
            } catch (e) {
                if (yomichan.isExtensionUnloaded) {
                    open = false;
                }
            }
            this._popupTabId = null;
        }

        if (!open) {
            return defaultReturnValue;
        }

        const {tabId} = await yomichan.api.getOrCreateSearchPopup({focus: 'ifCreated'});
        this._popupTabId = tabId;

        return await yomichan.crossFrame.invokeTab(this._popupTabId, frameId, 'popupMessage', {action, params});
    }
}
