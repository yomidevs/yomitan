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


class PopupProxyHost {
    constructor() {
        this._popups = new Map();
        this._nextId = 0;
        this._apiReceiver = null;
        this._frameIdPromise = null;
    }

    // Public functions

    async prepare() {
        this._frameIdPromise = apiFrameInformationGet();
        const {frameId} = await this._frameIdPromise;
        if (typeof frameId !== 'number') { return; }

        this._apiReceiver = new FrontendApiReceiver(`popup-proxy-host#${frameId}`, new Map([
            ['createNestedPopup', ({parentId}) => this._onApiCreateNestedPopup(parentId)],
            ['setOptions', ({id, options}) => this._onApiSetOptions(id, options)],
            ['hide', ({id, changeFocus}) => this._onApiHide(id, changeFocus)],
            ['isVisible', ({id}) => this._onApiIsVisibleAsync(id)],
            ['setVisibleOverride', ({id, visible}) => this._onApiSetVisibleOverride(id, visible)],
            ['containsPoint', ({id, x, y}) => this._onApiContainsPoint(id, x, y)],
            ['showContent', ({id, elementRect, writingMode, type, details}) => this._onApiShowContent(id, elementRect, writingMode, type, details)],
            ['setCustomCss', ({id, css}) => this._onApiSetCustomCss(id, css)],
            ['clearAutoPlayTimer', ({id}) => this._onApiClearAutoPlayTimer(id)]
        ]));
    }

    createPopup(parentId, depth) {
        return this._createPopupInternal(parentId, depth).popup;
    }

    // Message handlers

    async _onApiCreateNestedPopup(parentId) {
        return this._createPopupInternal(parentId, 0).id;
    }

    async _onApiSetOptions(id, options) {
        const popup = this._getPopup(id);
        return await popup.setOptions(options);
    }

    async _onApiHide(id, changeFocus) {
        const popup = this._getPopup(id);
        return popup.hide(changeFocus);
    }

    async _onApiIsVisibleAsync(id) {
        const popup = this._getPopup(id);
        return await popup.isVisible();
    }

    async _onApiSetVisibleOverride(id, visible) {
        const popup = this._getPopup(id);
        return await popup.setVisibleOverride(visible);
    }

    async _onApiContainsPoint(id, x, y) {
        const popup = this._getPopup(id);
        return await popup.containsPoint(x, y);
    }

    async _onApiShowContent(id, elementRect, writingMode, type, details) {
        const popup = this._getPopup(id);
        elementRect = PopupProxyHost._convertJsonRectToDOMRect(popup, elementRect);
        if (!PopupProxyHost._popupCanShow(popup)) { return; }
        return await popup.showContent(elementRect, writingMode, type, details);
    }

    async _onApiSetCustomCss(id, css) {
        const popup = this._getPopup(id);
        return popup.setCustomCss(css);
    }

    async _onApiClearAutoPlayTimer(id) {
        const popup = this._getPopup(id);
        return popup.clearAutoPlayTimer();
    }

    // Private functions

    _createPopupInternal(parentId, depth) {
        const parent = (typeof parentId === 'string' && this._popups.has(parentId) ? this._popups.get(parentId) : null);
        const id = `${this._nextId}`;
        if (parent !== null) {
            depth = parent.depth + 1;
        }
        ++this._nextId;
        const popup = new Popup(id, depth, this._frameIdPromise);
        if (parent !== null) {
            popup.setParent(parent);
        }
        this._popups.set(id, popup);
        return {popup, id};
    }

    _getPopup(id) {
        const popup = this._popups.get(id);
        if (typeof popup === 'undefined') {
            throw new Error('Invalid popup ID');
        }
        return popup;
    }

    static _convertJsonRectToDOMRect(popup, jsonRect) {
        let x = jsonRect.x;
        let y = jsonRect.y;
        if (popup.parent !== null) {
            const popupRect = popup.parent.getContainerRect();
            x += popupRect.x;
            y += popupRect.y;
        }
        return new DOMRect(x, y, jsonRect.width, jsonRect.height);
    }

    static _popupCanShow(popup) {
        return popup.parent === null || popup.parent.isVisibleSync();
    }
}
