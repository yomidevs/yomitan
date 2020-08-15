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
 * Popup
 * api
 */

class PopupFactory {
    constructor(frameId) {
        this._popups = new Map();
        this._frameId = frameId;
    }

    // Public functions

    prepare() {
        api.crossFrame.registerHandlers([
            ['getOrCreatePopup',     {async: false, handler: this._onApiGetOrCreatePopup.bind(this)}],
            ['setOptionsContext',    {async: true,  handler: this._onApiSetOptionsContext.bind(this)}],
            ['hide',                 {async: false, handler: this._onApiHide.bind(this)}],
            ['isVisible',            {async: true,  handler: this._onApiIsVisibleAsync.bind(this)}],
            ['setVisibleOverride',   {async: true,  handler: this._onApiSetVisibleOverride.bind(this)}],
            ['containsPoint',        {async: true,  handler: this._onApiContainsPoint.bind(this)}],
            ['showContent',          {async: true,  handler: this._onApiShowContent.bind(this)}],
            ['setCustomCss',         {async: false, handler: this._onApiSetCustomCss.bind(this)}],
            ['clearAutoPlayTimer',   {async: false, handler: this._onApiClearAutoPlayTimer.bind(this)}],
            ['setContentScale',      {async: false, handler: this._onApiSetContentScale.bind(this)}],
            ['updateTheme',          {async: false, handler: this._onApiUpdateTheme.bind(this)}],
            ['setCustomOuterCss',    {async: false, handler: this._onApiSetCustomOuterCss.bind(this)}],
            ['setChildrenSupported', {async: false, handler: this._onApiSetChildrenSupported.bind(this)}]
        ]);
    }

    getOrCreatePopup({id=null, parentId=null, ownerFrameId=null, depth=null}) {
        // Find by existing id
        if (id !== null) {
            const popup = this._popups.get(id);
            if (typeof popup !== 'undefined') {
                return popup;
            }
        }

        // Find by existing parent id
        let parent = null;
        if (parentId !== null) {
            parent = this._popups.get(parentId);
            if (typeof parent !== 'undefined') {
                const popup = parent.child;
                if (popup !== null) {
                    return popup;
                }
            } else {
                parent = null;
            }
        }

        // New unique id
        if (id === null) {
            id = yomichan.generateId(16);
        }

        // Create new popup
        if (parent !== null) {
            if (depth !== null) {
                throw new Error('Depth cannot be set when parent exists');
            }
            depth = parent.depth + 1;
        } else if (depth === null) {
            depth = 0;
        }
        const popup = new Popup(id, depth, this._frameId, ownerFrameId);
        if (parent !== null) {
            if (parent.child !== null) {
                throw new Error('Parent popup already has a child');
            }
            popup.parent = parent;
            parent.child = popup;
        }
        this._popups.set(id, popup);
        popup.prepare();
        return popup;
    }

    // API message handlers

    _onApiGetOrCreatePopup({id, parentId, ownerFrameId}) {
        const popup = this.getOrCreatePopup({id, parentId, ownerFrameId});
        return {
            id: popup.id
        };
    }

    async _onApiSetOptionsContext({id, optionsContext, source}) {
        const popup = this._getPopup(id);
        return await popup.setOptionsContext(optionsContext, source);
    }

    _onApiHide({id, changeFocus}) {
        const popup = this._getPopup(id);
        return popup.hide(changeFocus);
    }

    async _onApiIsVisibleAsync({id}) {
        const popup = this._getPopup(id);
        return await popup.isVisible();
    }

    async _onApiSetVisibleOverride({id, visible}) {
        const popup = this._getPopup(id);
        return await popup.setVisibleOverride(visible);
    }

    async _onApiContainsPoint({id, x, y}) {
        const popup = this._getPopup(id);
        [x, y] = this._convertPopupPointToRootPagePoint(popup, x, y);
        return await popup.containsPoint(x, y);
    }

    async _onApiShowContent({id, details, displayDetails}) {
        const popup = this._getPopup(id);
        if (!this._popupCanShow(popup)) { return; }

        const {elementRect} = details;
        if (typeof elementRect !== 'undefined') {
            details.elementRect = this._convertJsonRectToDOMRect(popup, elementRect);
        }

        return await popup.showContent(details, displayDetails);
    }

    _onApiSetCustomCss({id, css}) {
        const popup = this._getPopup(id);
        return popup.setCustomCss(css);
    }

    _onApiClearAutoPlayTimer({id}) {
        const popup = this._getPopup(id);
        return popup.clearAutoPlayTimer();
    }

    _onApiSetContentScale({id, scale}) {
        const popup = this._getPopup(id);
        return popup.setContentScale(scale);
    }

    _onApiUpdateTheme({id}) {
        const popup = this._getPopup(id);
        return popup.updateTheme();
    }

    _onApiSetCustomOuterCss({id, css, useWebExtensionApi}) {
        const popup = this._getPopup(id);
        return popup.setCustomOuterCss(css, useWebExtensionApi);
    }

    _onApiSetChildrenSupported({id, value}) {
        const popup = this._getPopup(id);
        return popup.setChildrenSupported(value);
    }

    // Private functions

    _getPopup(id) {
        const popup = this._popups.get(id);
        if (typeof popup === 'undefined') {
            throw new Error(`Invalid popup ID ${id}`);
        }
        return popup;
    }

    _convertJsonRectToDOMRect(popup, jsonRect) {
        const [x, y] = this._convertPopupPointToRootPagePoint(popup, jsonRect.x, jsonRect.y);
        return new DOMRect(x, y, jsonRect.width, jsonRect.height);
    }

    _convertPopupPointToRootPagePoint(popup, x, y) {
        const parent = popup.parent;
        if (parent !== null) {
            const popupRect = parent.getFrameRect();
            x += popupRect.x;
            y += popupRect.y;
        }
        return [x, y];
    }

    _popupCanShow(popup) {
        const parent = popup.parent;
        return parent === null || parent.isVisibleSync();
    }
}
