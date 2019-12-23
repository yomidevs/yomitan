/*
 * Copyright (C) 2016-2020  Alex Yatskov <alex@foosoft.net>
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


class Popup {
    constructor(id, depth, frameIdPromise) {
        this._id = id;
        this._depth = depth;
        this._frameIdPromise = frameIdPromise;
        this._frameId = null;
        this._parent = null;
        this._child = null;
        this._childrenSupported = true;
        this._injectPromise = null;
        this._isInjected = false;
        this._isInjectedAndLoaded = false;
        this._visible = false;
        this._visibleOverride = null;
        this._options = null;
        this._stylesheetInjectedViaApi = false;

        this._container = document.createElement('iframe');
        this._container.className = 'yomichan-float';
        this._container.addEventListener('mousedown', (e) => e.stopPropagation());
        this._container.addEventListener('scroll', (e) => e.stopPropagation());
        this._container.setAttribute('src', chrome.runtime.getURL('/fg/float.html'));
        this._container.style.width = '0px';
        this._container.style.height = '0px';

        this._updateVisibility();
    }

    // Public properties

    get parent() {
        return this._parent;
    }

    get depth() {
        return this._depth;
    }

    get url() {
        return window.location.href;
    }

    // Public functions

    isProxy() {
        return false;
    }

    async setOptions(options) {
        this._options = options;
        this.updateTheme();
    }

    hide(changeFocus) {
        if (!this.isVisibleSync()) {
            return;
        }

        this._setVisible(false);
        if (this._child !== null) {
            this._child.hide(false);
        }
        if (changeFocus) {
            this._focusParent();
        }
    }

    async isVisible() {
        return this.isVisibleSync();
    }

    setVisibleOverride(visible) {
        this._visibleOverride = visible;
        this._updateVisibility();
    }

    async containsPoint(x, y) {
        for (let popup = this; popup !== null && popup.isVisibleSync(); popup = popup._child) {
            const rect = popup._container.getBoundingClientRect();
            if (x >= rect.left && y >= rect.top && x < rect.right && y < rect.bottom) {
                return true;
            }
        }
        return false;
    }

    async showContent(elementRect, writingMode, type=null, details=null) {
        if (!this._isInitialized()) { return; }
        await this._show(elementRect, writingMode);
        if (type === null) { return; }
        this._invokeApi('setContent', {type, details});
    }

    async setCustomCss(css) {
        this._invokeApi('setCustomCss', {css});
    }

    clearAutoPlayTimer() {
        if (this._isInjectedAndLoaded) {
            this._invokeApi('clearAutoPlayTimer');
        }
    }

    // Popup-only public functions

    setParent(parent) {
        if (parent === null) {
            throw new Error('Cannot set popup parent to null');
        }
        if (this._parent !== null) {
            throw new Error('Popup already has a parent');
        }
        if (parent._child !== null) {
            throw new Error('Cannot parent popup to another popup which already has a child');
        }
        this._parent = parent;
        parent._child = this;
    }

    isVisibleSync() {
        return this._isInjected && (this._visibleOverride !== null ? this._visibleOverride : this._visible);
    }

    updateTheme() {
        this._container.dataset.yomichanTheme = this._options.general.popupOuterTheme;
        this._container.dataset.yomichanSiteColor = this._getSiteColor();
    }

    async setCustomOuterCss(css, injectDirectly) {
        // Cannot repeatedly inject stylesheets using web extension APIs since there is no way to remove them.
        if (this._stylesheetInjectedViaApi) { return; }

        if (injectDirectly || Popup._isOnExtensionPage()) {
            Popup.injectOuterStylesheet(css);
        } else {
            if (!css) { return; }
            try {
                await apiInjectStylesheet(css);
                this._stylesheetInjectedViaApi = true;
            } catch (e) {
                // NOP
            }
        }
    }

    setChildrenSupported(value) {
        this._childrenSupported = value;
    }

    getContainer() {
        return this._container;
    }

    getContainerRect() {
        return this._container.getBoundingClientRect();
    }

    static injectOuterStylesheet(css) {
        if (Popup.outerStylesheet === null) {
            if (!css) { return; }
            Popup.outerStylesheet = document.createElement('style');
            Popup.outerStylesheet.id = 'yomichan-popup-outer-stylesheet';
        }

        const outerStylesheet = Popup.outerStylesheet;
        if (css) {
            outerStylesheet.textContent = css;

            const par = document.head;
            if (par && outerStylesheet.parentNode !== par) {
                par.appendChild(outerStylesheet);
            }
        } else {
            outerStylesheet.textContent = '';
        }
    }

    // Private functions

    _inject() {
        if (this._injectPromise === null) {
            this._injectPromise = this._createInjectPromise();
        }
        return this._injectPromise;
    }

    async _createInjectPromise() {
        try {
            const {frameId} = await this._frameIdPromise;
            if (typeof frameId === 'number') {
                this._frameId = frameId;
            }
        } catch (e) {
            // NOP
        }

        return new Promise((resolve) => {
            const parentFrameId = (typeof this._frameId === 'number' ? this._frameId : null);
            this._container.addEventListener('load', () => {
                this._isInjectedAndLoaded = true;
                this._invokeApi('initialize', {
                    options: this._options,
                    popupInfo: {
                        id: this._id,
                        depth: this._depth,
                        parentFrameId
                    },
                    url: this.url,
                    childrenSupported: this._childrenSupported
                });
                resolve();
            });
            this._observeFullscreen();
            this._onFullscreenChanged();
            this.setCustomOuterCss(this._options.general.customPopupOuterCss, false);
            this._isInjected = true;
        });
    }

    _isInitialized() {
        return this._options !== null;
    }

    async _show(elementRect, writingMode) {
        await this._inject();

        const optionsGeneral = this._options.general;
        const container = this._container;
        const containerRect = container.getBoundingClientRect();
        const getPosition = (
            writingMode === 'horizontal-tb' || optionsGeneral.popupVerticalTextPosition === 'default' ?
            Popup._getPositionForHorizontalText :
            Popup._getPositionForVerticalText
        );

        const [x, y, width, height, below] = getPosition(
            elementRect,
            Math.max(containerRect.width, optionsGeneral.popupWidth),
            Math.max(containerRect.height, optionsGeneral.popupHeight),
            document.body.clientWidth,
            window.innerHeight,
            optionsGeneral,
            writingMode
        );

        container.classList.toggle('yomichan-float-full-width', optionsGeneral.popupDisplayMode === 'full-width');
        container.classList.toggle('yomichan-float-above', !below);
        container.style.left = `${x}px`;
        container.style.top = `${y}px`;
        container.style.width = `${width}px`;
        container.style.height = `${height}px`;

        this._setVisible(true);
        if (this._child !== null) {
            this._child.hide(true);
        }
    }

    _setVisible(visible) {
        this._visible = visible;
        this._updateVisibility();
    }

    _updateVisibility() {
        this._container.style.setProperty('visibility', this.isVisibleSync() ? 'visible' : 'hidden', 'important');
    }

    _focusParent() {
        if (this._parent !== null) {
            // Chrome doesn't like focusing iframe without contentWindow.
            const contentWindow = this._parent._container.contentWindow;
            if (contentWindow !== null) {
                contentWindow.focus();
            }
        } else {
            // Firefox doesn't like focusing window without first blurring the iframe.
            // this.container.contentWindow.blur() doesn't work on Firefox for some reason.
            this._container.blur();
            // This is needed for Chrome.
            window.focus();
        }
    }

    _getSiteColor() {
        const color = [255, 255, 255];
        Popup._addColor(color, Popup._getColorInfo(window.getComputedStyle(document.documentElement).backgroundColor));
        Popup._addColor(color, Popup._getColorInfo(window.getComputedStyle(document.body).backgroundColor));
        const dark = (color[0] < 128 && color[1] < 128 && color[2] < 128);
        return dark ? 'dark' : 'light';
    }

    _invokeApi(action, params={}) {
        if (!this._isInjectedAndLoaded) {
            throw new Error('Frame not loaded');
        }
        this._container.contentWindow.postMessage({action, params}, '*');
    }

    _observeFullscreen() {
        const fullscreenEvents = [
            'fullscreenchange',
            'MSFullscreenChange',
            'mozfullscreenchange',
            'webkitfullscreenchange'
        ];
        for (const eventName of fullscreenEvents) {
            document.addEventListener(eventName, () => this._onFullscreenChanged(), false);
        }
    }

    _getFullscreenElement() {
        return (
            document.fullscreenElement ||
            document.msFullscreenElement ||
            document.mozFullScreenElement ||
            document.webkitFullscreenElement
        );
    }

    _onFullscreenChanged() {
        const parent = (this._getFullscreenElement() || document.body || null);
        if (parent !== null && this._container.parentNode !== parent) {
            parent.appendChild(this._container);
        }
    }

    static _getPositionForHorizontalText(elementRect, width, height, maxWidth, maxHeight, optionsGeneral) {
        let x = elementRect.left + optionsGeneral.popupHorizontalOffset;
        const overflowX = Math.max(x + width - maxWidth, 0);
        if (overflowX > 0) {
            if (x >= overflowX) {
                x -= overflowX;
            } else {
                width = maxWidth;
                x = 0;
            }
        }

        const preferBelow = (optionsGeneral.popupHorizontalTextPosition === 'below');

        const verticalOffset = optionsGeneral.popupVerticalOffset;
        const [y, h, below] = Popup._limitGeometry(
            elementRect.top - verticalOffset,
            elementRect.bottom + verticalOffset,
            height,
            maxHeight,
            preferBelow
        );

        return [x, y, width, h, below];
    }

    static _getPositionForVerticalText(elementRect, width, height, maxWidth, maxHeight, optionsGeneral, writingMode) {
        const preferRight = Popup._isVerticalTextPopupOnRight(optionsGeneral.popupVerticalTextPosition, writingMode);
        const horizontalOffset = optionsGeneral.popupHorizontalOffset2;
        const verticalOffset = optionsGeneral.popupVerticalOffset2;

        const [x, w] = Popup._limitGeometry(
            elementRect.left - horizontalOffset,
            elementRect.right + horizontalOffset,
            width,
            maxWidth,
            preferRight
        );
        const [y, h, below] = Popup._limitGeometry(
            elementRect.bottom - verticalOffset,
            elementRect.top + verticalOffset,
            height,
            maxHeight,
            true
        );
        return [x, y, w, h, below];
    }

    static _isVerticalTextPopupOnRight(positionPreference, writingMode) {
        switch (positionPreference) {
            case 'before':
                return !Popup._isWritingModeLeftToRight(writingMode);
            case 'after':
                return Popup._isWritingModeLeftToRight(writingMode);
            case 'left':
                return false;
            case 'right':
                return true;
        }
    }

    static _isWritingModeLeftToRight(writingMode) {
        switch (writingMode) {
            case 'vertical-lr':
            case 'sideways-lr':
                return true;
            default:
                return false;
        }
    }

    static _limitGeometry(positionBefore, positionAfter, size, limit, preferAfter) {
        let after = preferAfter;
        let position = 0;
        const overflowBefore = Math.max(0, size - positionBefore);
        const overflowAfter = Math.max(0, positionAfter + size - limit);
        if (overflowAfter > 0 || overflowBefore > 0) {
            if (overflowAfter < overflowBefore) {
                size = Math.max(0, size - overflowAfter);
                position = positionAfter;
                after = true;
            } else {
                size = Math.max(0, size - overflowBefore);
                position = Math.max(0, positionBefore - size);
                after = false;
            }
        } else {
            position = preferAfter ? positionAfter : positionBefore - size;
        }

        return [position, size, after];
    }

    static _addColor(target, color) {
        if (color === null) { return; }

        const a = color[3];
        if (a <= 0.0) { return; }

        const aInv = 1.0 - a;
        for (let i = 0; i < 3; ++i) {
            target[i] = target[i] * aInv + color[i] * a;
        }
    }

    static _getColorInfo(cssColor) {
        const m = /^\s*rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)\s*$/.exec(cssColor);
        if (m === null) { return null; }

        const m4 = m[4];
        return [
            Number.parseInt(m[1], 10),
            Number.parseInt(m[2], 10),
            Number.parseInt(m[3], 10),
            m4 ? Math.max(0.0, Math.min(1.0, Number.parseFloat(m4))) : 1.0
        ];
    }

    static _isOnExtensionPage() {
        try {
            const url = chrome.runtime.getURL('/');
            return window.location.href.substring(0, url.length) === url;
        } catch (e) {
            // NOP
        }
    }
}

Popup.outerStylesheet = null;
