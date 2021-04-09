/*
 * Copyright (C) 2016-2021  Yomichan Authors
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
 * DocumentUtil
 * FrameClient
 * dynamicLoader
 */

class Popup extends EventDispatcher {
    constructor({
        id,
        depth,
        frameId,
        childrenSupported
    }) {
        super();
        this._id = id;
        this._depth = depth;
        this._frameId = frameId;
        this._childrenSupported = childrenSupported;
        this._parent = null;
        this._child = null;
        this._injectPromise = null;
        this._injectPromiseComplete = false;
        this._visible = new DynamicProperty(false);
        this._options = null;
        this._optionsContext = null;
        this._contentScale = 1.0;
        this._targetOrigin = chrome.runtime.getURL('/').replace(/\/$/, '');

        this._frameSizeContentScale = null;
        this._frameClient = null;
        this._frame = document.createElement('iframe');
        this._frame.className = 'yomichan-popup';
        this._frame.style.width = '0';
        this._frame.style.height = '0';

        this._container = this._frame;
        this._shadow = null;

        this._fullscreenEventListeners = new EventListenerCollection();
    }

    // Public properties

    get id() {
        return this._id;
    }

    get parent() {
        return this._parent;
    }

    set parent(value) {
        this._parent = value;
    }

    get child() {
        return this._child;
    }

    set child(value) {
        this._child = value;
    }

    get depth() {
        return this._depth;
    }

    get frameContentWindow() {
        return this._frame.contentWindow;
    }

    get container() {
        return this._container;
    }

    get frameId() {
        return this._frameId;
    }

    // Public functions

    prepare() {
        this._frame.addEventListener('mouseover', this._onFrameMouseOver.bind(this));
        this._frame.addEventListener('mouseout', this._onFrameMouseOut.bind(this));
        this._frame.addEventListener('mousedown', (e) => e.stopPropagation());
        this._frame.addEventListener('scroll', (e) => e.stopPropagation());
        this._frame.addEventListener('load', this._onFrameLoad.bind(this));
        this._visible.on('change', this._onVisibleChange.bind(this));
        yomichan.on('extensionUnloaded', this._onExtensionUnloaded.bind(this));
        this._onVisibleChange({value: this.isVisibleSync()});
    }

    async setOptionsContext(optionsContext) {
        await this._setOptionsContext(optionsContext);
        await this._invokeSafe('setOptionsContext', {optionsContext});
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

    async setVisibleOverride(value, priority) {
        return this._visible.setOverride(value, priority);
    }

    async clearVisibleOverride(token) {
        return this._visible.clearOverride(token);
    }

    async containsPoint(x, y) {
        for (let popup = this; popup !== null && popup.isVisibleSync(); popup = popup.child) {
            const rect = popup.getFrameRect();
            if (x >= rect.left && y >= rect.top && x < rect.right && y < rect.bottom) {
                return true;
            }
        }
        return false;
    }

    async showContent(details, displayDetails) {
        if (this._options === null) { throw new Error('Options not assigned'); }

        const {optionsContext, elementRect, writingMode} = details;
        if (optionsContext !== null) {
            await this._setOptionsContextIfDifferent(optionsContext);
        }

        if (typeof elementRect !== 'undefined' && typeof writingMode !== 'undefined') {
            await this._show(elementRect, writingMode);
        }

        if (displayDetails !== null) {
            this._invokeSafe('setContent', {details: displayDetails});
        }
    }

    setCustomCss(css) {
        this._invokeSafe('setCustomCss', {css});
    }

    clearAutoPlayTimer() {
        this._invokeSafe('clearAutoPlayTimer');
    }

    setContentScale(scale) {
        this._contentScale = scale;
        this._frame.style.fontSize = `${scale}px`;
        this._invokeSafe('setContentScale', {scale});
    }

    isVisibleSync() {
        return this._visible.value;
    }

    updateTheme() {
        const {popupTheme, popupOuterTheme} = this._options.general;
        this._frame.dataset.theme = popupTheme;
        this._frame.dataset.outerTheme = popupOuterTheme;
        this._frame.dataset.siteColor = this._getSiteColor();
    }

    async setCustomOuterCss(css, useWebExtensionApi) {
        let parentNode = null;
        const inShadow = (this._shadow !== null);
        if (inShadow) {
            useWebExtensionApi = false;
            parentNode = this._shadow;
        }
        const node = await dynamicLoader.loadStyle('yomichan-popup-outer-user-stylesheet', 'code', css, useWebExtensionApi, parentNode);
        this.trigger('customOuterCssChanged', {node, useWebExtensionApi, inShadow});
    }

    getFrameRect() {
        return this._frame.getBoundingClientRect();
    }

    async getFrameSize() {
        const rect = this._frame.getBoundingClientRect();
        return {width: rect.width, height: rect.height, valid: true};
    }

    async setFrameSize(width, height) {
        this._setFrameSize(width, height);
        return true;
    }

    // Private functions

    _onFrameMouseOver() {
        this.trigger('framePointerOver', {});
    }

    _onFrameMouseOut() {
        this.trigger('framePointerOut', {});
    }

    _inject() {
        let injectPromise = this._injectPromise;
        if (injectPromise === null) {
            injectPromise = this._createInjectPromise();
            this._injectPromise = injectPromise;
            injectPromise.then(
                () => {
                    if (injectPromise !== this._injectPromise) { return; }
                    this._injectPromiseComplete = true;
                },
                () => { this._resetFrame(); }
            );
        }
        return injectPromise;
    }

    async _createInjectPromise() {
        if (this._options === null) {
            throw new Error('Options not initialized');
        }

        const {useSecurePopupFrameUrl, usePopupShadowDom} = this._options.general;

        await this._setUpContainer(usePopupShadowDom);

        const setupFrame = (frame) => {
            frame.removeAttribute('src');
            frame.removeAttribute('srcdoc');
            this._observeFullscreen(true);
            this._onFullscreenChanged();
            const url = chrome.runtime.getURL('/popup.html');
            if (useSecurePopupFrameUrl) {
                frame.contentDocument.location.href = url;
            } else {
                frame.setAttribute('src', url);
            }
        };

        const frameClient = new FrameClient();
        this._frameClient = frameClient;
        await frameClient.connect(this._frame, this._targetOrigin, this._frameId, setupFrame);

        // Configure
        await this._invokeSafe('configure', {
            depth: this._depth,
            parentPopupId: this._id,
            parentFrameId: this._frameId,
            childrenSupported: this._childrenSupported,
            scale: this._contentScale,
            optionsContext: this._optionsContext
        });
    }

    _onFrameLoad() {
        if (!this._injectPromiseComplete) { return; }
        this._resetFrame();
    }

    _resetFrame() {
        const parent = this._container.parentNode;
        if (parent !== null) {
            parent.removeChild(this._container);
        }
        this._frame.removeAttribute('src');
        this._frame.removeAttribute('srcdoc');

        this._frameClient = null;
        this._injectPromise = null;
        this._injectPromiseComplete = false;
    }

    async _setUpContainer(usePopupShadowDom) {
        if (usePopupShadowDom && typeof this._frame.attachShadow === 'function') {
            const container = document.createElement('div');
            container.style.setProperty('all', 'initial', 'important');
            const shadow = container.attachShadow({mode: 'closed', delegatesFocus: true});
            shadow.appendChild(this._frame);

            this._container = container;
            this._shadow = shadow;
        } else {
            const frameParentNode = this._frame.parentNode;
            if (frameParentNode !== null) {
                frameParentNode.removeChild(this._frame);
            }

            this._container = this._frame;
            this._shadow = null;
        }

        await this._injectStyles();
    }

    async _injectStyles() {
        try {
            await this._injectPopupOuterStylesheet();
        } catch (e) {
            // NOP
        }

        try {
            await this.setCustomOuterCss(this._options.general.customPopupOuterCss, true);
        } catch (e) {
            // NOP
        }
    }

    async _injectPopupOuterStylesheet() {
        let fileType = 'file';
        let useWebExtensionApi = true;
        let parentNode = null;
        if (this._shadow !== null) {
            fileType = 'file-content';
            useWebExtensionApi = false;
            parentNode = this._shadow;
        }
        await dynamicLoader.loadStyle('yomichan-popup-outer-stylesheet', fileType, '/css/popup-outer.css', useWebExtensionApi, parentNode);
    }

    _observeFullscreen(observe) {
        if (!observe) {
            this._fullscreenEventListeners.removeAllEventListeners();
            return;
        }

        if (this._fullscreenEventListeners.size > 0) {
            // Already observing
            return;
        }

        DocumentUtil.addFullscreenChangeEventListener(this._onFullscreenChanged.bind(this), this._fullscreenEventListeners);
    }

    _onFullscreenChanged() {
        const parent = this._getFrameParentElement();
        if (parent !== null && this._container.parentNode !== parent) {
            parent.appendChild(this._container);
        }
    }

    async _show(elementRect, writingMode) {
        await this._inject();

        const optionsGeneral = this._options.general;
        const {popupDisplayMode} = optionsGeneral;
        const frame = this._frame;
        const frameRect = frame.getBoundingClientRect();

        const viewport = this._getViewport(optionsGeneral.popupScaleRelativeToVisualViewport);
        const scale = this._contentScale;
        const scaleRatio = this._frameSizeContentScale === null ? 1.0 : scale / this._frameSizeContentScale;
        this._frameSizeContentScale = scale;
        const getPositionArgs = [
            elementRect,
            Math.max(frameRect.width * scaleRatio, optionsGeneral.popupWidth * scale),
            Math.max(frameRect.height * scaleRatio, optionsGeneral.popupHeight * scale),
            viewport,
            scale,
            optionsGeneral,
            writingMode
        ];
        let [x, y, width, height, below] = (
            writingMode === 'horizontal-tb' || optionsGeneral.popupVerticalTextPosition === 'default' ?
            this._getPositionForHorizontalText(...getPositionArgs) :
            this._getPositionForVerticalText(...getPositionArgs)
        );

        frame.dataset.popupDisplayMode = popupDisplayMode;
        frame.dataset.below = `${below}`;

        if (popupDisplayMode === 'full-width') {
            x = viewport.left;
            y = below ? viewport.bottom - height : viewport.top;
            width = viewport.right - viewport.left;
        }

        frame.style.left = `${x}px`;
        frame.style.top = `${y}px`;
        this._setFrameSize(width, height);

        this._setVisible(true);
        if (this._child !== null) {
            this._child.hide(true);
        }
    }

    _setFrameSize(width, height) {
        const {style} = this._frame;
        style.width = `${width}px`;
        style.height = `${height}px`;
    }

    _setVisible(visible) {
        this._visible.defaultValue = visible;
    }

    _onVisibleChange({value}) {
        this._frame.style.setProperty('visibility', value ? 'visible' : 'hidden', 'important');
    }

    _focusParent() {
        if (this._parent !== null) {
            // Chrome doesn't like focusing iframe without contentWindow.
            const contentWindow = this._parent.frameContentWindow;
            if (contentWindow !== null) {
                contentWindow.focus();
            }
        } else {
            // Firefox doesn't like focusing window without first blurring the iframe.
            // this._frame.contentWindow.blur() doesn't work on Firefox for some reason.
            this._frame.blur();
            // This is needed for Chrome.
            window.focus();
        }
    }

    _getSiteColor() {
        const color = [255, 255, 255];
        const {documentElement, body} = document;
        if (documentElement !== null) {
            this._addColor(color, window.getComputedStyle(documentElement).backgroundColor);
        }
        if (body !== null) {
            this._addColor(color, window.getComputedStyle(body).backgroundColor);
        }
        const dark = (color[0] < 128 && color[1] < 128 && color[2] < 128);
        return dark ? 'dark' : 'light';
    }

    async _invoke(action, params={}) {
        const contentWindow = this._frame.contentWindow;
        if (this._frameClient === null || !this._frameClient.isConnected() || contentWindow === null) { return; }

        const message = this._frameClient.createMessage({action, params});
        return await yomichan.crossFrame.invoke(this._frameClient.frameId, 'popupMessage', message);
    }

    async _invokeSafe(action, params={}, defaultReturnValue) {
        try {
            return await this._invoke(action, params);
        } catch (e) {
            if (!yomichan.isExtensionUnloaded) { throw e; }
            return defaultReturnValue;
        }
    }

    _invokeWindow(action, params={}) {
        const contentWindow = this._frame.contentWindow;
        if (this._frameClient === null || !this._frameClient.isConnected() || contentWindow === null) { return; }

        const message = this._frameClient.createMessage({action, params});
        contentWindow.postMessage(message, this._targetOrigin);
    }

    _onExtensionUnloaded() {
        this._invokeWindow('extensionUnloaded');
    }

    _getFrameParentElement() {
        const defaultParent = document.body;
        const fullscreenElement = DocumentUtil.getFullscreenElement();
        if (
            fullscreenElement === null ||
            fullscreenElement.shadowRoot ||
            fullscreenElement.openOrClosedShadowRoot // Available to Firefox 63+ for WebExtensions
        ) {
            return defaultParent;
        }

        switch (fullscreenElement.nodeName.toUpperCase()) {
            case 'IFRAME':
            case 'FRAME':
                return defaultParent;
        }

        return fullscreenElement;
    }

    _getPositionForHorizontalText(elementRect, width, height, viewport, offsetScale, optionsGeneral) {
        const preferBelow = (optionsGeneral.popupHorizontalTextPosition === 'below');
        const horizontalOffset = optionsGeneral.popupHorizontalOffset * offsetScale;
        const verticalOffset = optionsGeneral.popupVerticalOffset * offsetScale;

        const [x, w] = this._getConstrainedPosition(
            elementRect.right - horizontalOffset,
            elementRect.left + horizontalOffset,
            width,
            viewport.left,
            viewport.right,
            true
        );
        const [y, h, below] = this._getConstrainedPositionBinary(
            elementRect.top - verticalOffset,
            elementRect.bottom + verticalOffset,
            height,
            viewport.top,
            viewport.bottom,
            preferBelow
        );
        return [x, y, w, h, below];
    }

    _getPositionForVerticalText(elementRect, width, height, viewport, offsetScale, optionsGeneral, writingMode) {
        const preferRight = this._isVerticalTextPopupOnRight(optionsGeneral.popupVerticalTextPosition, writingMode);
        const horizontalOffset = optionsGeneral.popupHorizontalOffset2 * offsetScale;
        const verticalOffset = optionsGeneral.popupVerticalOffset2 * offsetScale;

        const [x, w] = this._getConstrainedPositionBinary(
            elementRect.left - horizontalOffset,
            elementRect.right + horizontalOffset,
            width,
            viewport.left,
            viewport.right,
            preferRight
        );
        const [y, h, below] = this._getConstrainedPosition(
            elementRect.bottom - verticalOffset,
            elementRect.top + verticalOffset,
            height,
            viewport.top,
            viewport.bottom,
            true
        );
        return [x, y, w, h, below];
    }

    _isVerticalTextPopupOnRight(positionPreference, writingMode) {
        switch (positionPreference) {
            case 'before':
                return !this._isWritingModeLeftToRight(writingMode);
            case 'after':
                return this._isWritingModeLeftToRight(writingMode);
            case 'left':
                return false;
            case 'right':
                return true;
            default:
                return false;
        }
    }

    _isWritingModeLeftToRight(writingMode) {
        switch (writingMode) {
            case 'vertical-lr':
            case 'sideways-lr':
                return true;
            default:
                return false;
        }
    }

    _getConstrainedPosition(positionBefore, positionAfter, size, minLimit, maxLimit, after) {
        size = Math.min(size, maxLimit - minLimit);

        let position;
        if (after) {
            position = Math.max(minLimit, positionAfter);
            position = position - Math.max(0, (position + size) - maxLimit);
        } else {
            position = Math.min(maxLimit, positionBefore) - size;
            position = position + Math.max(0, minLimit - position);
        }

        return [position, size, after];
    }

    _getConstrainedPositionBinary(positionBefore, positionAfter, size, minLimit, maxLimit, after) {
        const overflowBefore = minLimit - (positionBefore - size);
        const overflowAfter = (positionAfter + size) - maxLimit;

        if (overflowAfter > 0 || overflowBefore > 0) {
            after = (overflowAfter < overflowBefore);
        }

        let position;
        if (after) {
            size -= Math.max(0, overflowAfter);
            position = Math.max(minLimit, positionAfter);
        } else {
            size -= Math.max(0, overflowBefore);
            position = Math.min(maxLimit, positionBefore) - size;
        }

        return [position, size, after];
    }

    _addColor(target, cssColor) {
        if (typeof cssColor !== 'string') { return; }

        const color = this._getColorInfo(cssColor);
        if (color === null) { return; }

        const a = color[3];
        if (a <= 0.0) { return; }

        const aInv = 1.0 - a;
        for (let i = 0; i < 3; ++i) {
            target[i] = target[i] * aInv + color[i] * a;
        }
    }

    _getColorInfo(cssColor) {
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

    _getViewport(useVisualViewport) {
        const visualViewport = window.visualViewport;
        if (visualViewport !== null && typeof visualViewport === 'object') {
            const left = visualViewport.offsetLeft;
            const top = visualViewport.offsetTop;
            const width = visualViewport.width;
            const height = visualViewport.height;
            if (useVisualViewport) {
                return {
                    left,
                    top,
                    right: left + width,
                    bottom: top + height
                };
            } else {
                const scale = visualViewport.scale;
                return {
                    left: 0,
                    top: 0,
                    right: Math.max(left + width, width * scale),
                    bottom: Math.max(top + height, height * scale)
                };
            }
        }

        return {
            left: 0,
            top: 0,
            right: window.innerWidth,
            bottom: window.innerHeight
        };
    }

    async _setOptionsContext(optionsContext) {
        this._optionsContext = optionsContext;
        this._options = await yomichan.api.optionsGet(optionsContext);
        this.updateTheme();
    }

    async _setOptionsContextIfDifferent(optionsContext) {
        if (deepEqual(this._optionsContext, optionsContext)) { return; }
        await this._setOptionsContext(optionsContext);
    }
}
