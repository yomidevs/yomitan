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
            show: ({id, elementRect, options}) => this.show(id, elementRect, options),
            showOrphaned: ({id, elementRect, options}) => this.show(id, elementRect, options),
            hide: ({id}) => this.hide(id),
            setVisible: ({id, visible}) => this.setVisible(id, visible),
            containsPoint: ({id, point}) => this.containsPoint(id, point),
            termsShow: ({id, elementRect, writingMode, definitions, options, context}) => this.termsShow(id, elementRect, writingMode, definitions, options, context),
            kanjiShow: ({id, elementRect, writingMode, definitions, options, context}) => this.kanjiShow(id, elementRect, writingMode, definitions, options, context),
            clearAutoPlayTimer: ({id}) => this.clearAutoPlayTimer(id)
        });
    }

    createPopup(parentId) {
        const parent = (typeof parentId === 'string' && this.popups.hasOwnProperty(parentId) ? this.popups[parentId] : null);
        const depth = (parent !== null ? parent.depth + 1 : 0);
        const id = `${this.nextId}`;
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
        return this.createPopup(parentId).id;
    }

    getPopup(id) {
        if (!this.popups.hasOwnProperty(id)) {
            throw 'Invalid popup ID';
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

    async show(id, elementRect, options) {
        const popup = this.getPopup(id);
        elementRect = this.jsonRectToDOMRect(popup, elementRect);
        return await popup.show(elementRect, options);
    }

    async showOrphaned(id, elementRect, options) {
        const popup = this.getPopup(id);
        elementRect = this.jsonRectToDOMRect(popup, elementRect);
        return await popup.showOrphaned(elementRect, options);
    }

    async hide(id) {
        const popup = this.getPopup(id);
        return popup.hide();
    }

    async setVisible(id, visible) {
        const popup = this.getPopup(id);
        return popup.setVisible(visible);
    }

    async containsPoint(id, point) {
        const popup = this.getPopup(id);
        return await popup.containsPoint(point);
    }

    async termsShow(id, elementRect, writingMode, definitions, options, context) {
        const popup = this.getPopup(id);
        elementRect = this.jsonRectToDOMRect(popup, elementRect);
        if (!PopupProxyHost.popupCanShow(popup)) { return false; }
        return await popup.termsShow(elementRect, writingMode, definitions, options, context);
    }

    async kanjiShow(id, elementRect, writingMode, definitions, options, context) {
        const popup = this.getPopup(id);
        elementRect = this.jsonRectToDOMRect(popup, elementRect);
        if (!PopupProxyHost.popupCanShow(popup)) { return false; }
        return await popup.kanjiShow(elementRect, writingMode, definitions, options, context);
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
