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


class PopupProxyHost {
    constructor() {
        this.popups = {};
        this.nextId = 0;
        this.apiReceiver = null;
        this.frameIdPromise = null;
    }

    static create() {
        const popupProxyHost = new PopupProxyHost();
        popupProxyHost.prepare();
        return popupProxyHost;
    }

    async prepare() {
        this.frameIdPromise = apiFrameInformationGet();
        const {frameId} = await this.frameIdPromise;
        if (typeof frameId !== 'number') { return; }

        this.apiReceiver = new FrontendApiReceiver(`popup-proxy-host#${frameId}`, {
            createNestedPopup: ({parentId}) => this.createNestedPopup(parentId),
            setOptions: ({id, options}) => this.setOptions(id, options),
            hide: ({id, changeFocus}) => this.hide(id, changeFocus),
            isVisibleAsync: ({id}) => this.isVisibleAsync(id),
            setVisibleOverride: ({id, visible}) => this.setVisibleOverride(id, visible),
            containsPoint: ({id, x, y}) => this.containsPoint(id, x, y),
            showContent: ({id, elementRect, writingMode, type, details}) => this.showContent(id, elementRect, writingMode, type, details),
            setCustomCss: ({id, css}) => this.setCustomCss(id, css),
            clearAutoPlayTimer: ({id}) => this.clearAutoPlayTimer(id)
        });
    }

    createPopup(parentId, depth) {
        const parent = (typeof parentId === 'string' && hasOwn(this.popups, parentId) ? this.popups[parentId] : null);
        const id = `${this.nextId}`;
        if (parent !== null) {
            depth = parent.depth + 1;
        }
        ++this.nextId;
        const popup = new Popup(id, depth, this.frameIdPromise);
        if (parent !== null) {
            popup.parent = parent;
            parent.child = popup;
        }
        this.popups[id] = popup;
        return popup;
    }

    async createNestedPopup(parentId) {
        return this.createPopup(parentId, 0).id;
    }

    getPopup(id) {
        if (!hasOwn(this.popups, id)) {
            throw new Error('Invalid popup ID');
        }

        return this.popups[id];
    }

    jsonRectToDOMRect(popup, jsonRect) {
        let x = jsonRect.x;
        let y = jsonRect.y;
        if (popup.parent !== null) {
            const popupRect = popup.parent.container.getBoundingClientRect();
            x += popupRect.x;
            y += popupRect.y;
        }
        return new DOMRect(x, y, jsonRect.width, jsonRect.height);
    }

    async setOptions(id, options) {
        const popup = this.getPopup(id);
        return await popup.setOptions(options);
    }

    async hide(id, changeFocus) {
        const popup = this.getPopup(id);
        return popup.hide(changeFocus);
    }

    async isVisibleAsync(id) {
        const popup = this.getPopup(id);
        return await popup.isVisibleAsync();
    }

    async setVisibleOverride(id, visible) {
        const popup = this.getPopup(id);
        return await popup.setVisibleOverride(visible);
    }

    async containsPoint(id, x, y) {
        const popup = this.getPopup(id);
        return await popup.containsPoint(x, y);
    }

    async showContent(id, elementRect, writingMode, type, details) {
        const popup = this.getPopup(id);
        elementRect = this.jsonRectToDOMRect(popup, elementRect);
        if (!PopupProxyHost.popupCanShow(popup)) { return Promise.resolve(false); }
        return await popup.showContent(elementRect, writingMode, type, details);
    }

    async setCustomCss(id, css) {
        const popup = this.getPopup(id);
        return popup.setCustomCss(css);
    }

    async clearAutoPlayTimer(id) {
        const popup = this.getPopup(id);
        return popup.clearAutoPlayTimer();
    }

    static popupCanShow(popup) {
        return popup.parent === null || popup.parent.isVisible();
    }
}

PopupProxyHost.instance = PopupProxyHost.create();
