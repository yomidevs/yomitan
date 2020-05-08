/*
 * Copyright (C) 2016-2020  Yomichan Authors
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
 * DOM
 * apiInjectStylesheet
 * apiOptionsGet
 */

class Popup {
    constructor(id, depth, frameId) {
        this._id = id;
        this._depth = depth;
        this._frameId = frameId;
        this._parent = null;
        this._child = null;
        this._childrenSupported = true;
        this._injectPromise = null;
        this._injectPromiseComplete = false;
        this._visible = false;
        this._visibleOverride = null;
        this._options = null;
        this._optionsContext = null;
        this._contentScale = 1.0;
        this._targetOrigin = chrome.runtime.getURL('/').replace(/\/$/, '');
        this._previousOptionsContextSource = null;

        this._frameSizeContentScale = null;
        this._frameSecret = null;
        this._frameToken = null;
        this._frame = document.createElement('iframe');
        this._frame.className = 'yomichan-float';
        this._frame.style.width = '0';
        this._frame.style.height = '0';

        this._fullscreenEventListeners = new EventListenerCollection();
    }

    // Public properties

    get id() {
        return this._id;
    }

    get parent() {
        return this._parent;
    }

    get child() {
        return this._child;
    }

    get depth() {
        return this._depth;
    }

    get frameId() {
        return this._frameId;
    }

    // Public functions

    prepare() {
        this._updateVisibility();
        this._frame.addEventListener('mousedown', (e) => e.stopPropagation());
        this._frame.addEventListener('scroll', (e) => e.stopPropagation());
        this._frame.addEventListener('load', this._onFrameLoad.bind(this));
    }

    isProxy() {
        return false;
    }

    async setOptionsContext(optionsContext, source) {
        this._optionsContext = optionsContext;
        this._previousOptionsContextSource = source;

        this._options = await apiOptionsGet(optionsContext);
        this.updateTheme();

        this._invokeApi('setOptionsContext', {optionsContext});
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
            const rect = popup._frame.getBoundingClientRect();
            if (x >= rect.left && y >= rect.top && x < rect.right && y < rect.bottom) {
                return true;
            }
        }
        return false;
    }

    async showContent(elementRect, writingMode, type, details, context) {
        if (this._options === null) { throw new Error('Options not assigned'); }

        const {optionsContext, source} = context;
        if (source !== this._previousOptionsContextSource) {
            await this.setOptionsContext(optionsContext, source);
        }

        await this._show(elementRect, writingMode);
        if (type === null) { return; }
        this._invokeApi('setContent', {type, details});
    }

    setCustomCss(css) {
        this._invokeApi('setCustomCss', {css});
    }

    clearAutoPlayTimer() {
        this._invokeApi('clearAutoPlayTimer');
    }

    setContentScale(scale) {
        this._contentScale = scale;
        this._invokeApi('setContentScale', {scale});
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
        return (this._visibleOverride !== null ? this._visibleOverride : this._visible);
    }

    updateTheme() {
        this._frame.dataset.yomichanTheme = this._options.general.popupOuterTheme;
        this._frame.dataset.yomichanSiteColor = this._getSiteColor();
    }

    async setCustomOuterCss(css, useWebExtensionApi) {
        return await this._injectStylesheet(
            'yomichan-popup-outer-user-stylesheet',
            'code',
            css,
            useWebExtensionApi
        );
    }

    setChildrenSupported(value) {
        this._childrenSupported = value;
    }

    getFrame() {
        return this._frame;
    }

    getFrameRect() {
        return this._frame.getBoundingClientRect();
    }

    // Private functions

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

    _initializeFrame(frame, targetOrigin, frameId, setupFrame, timeout=10000) {
        return new Promise((resolve, reject) => {
            const tokenMap = new Map();
            let timer = null;
            let frameLoadedResolve = null;
            let frameLoadedReject = null;
            const frameLoaded = new Promise((resolve2, reject2) => {
                frameLoadedResolve = resolve2;
                frameLoadedReject = reject2;
            });

            const postMessage = (action, params) => {
                const contentWindow = frame.contentWindow;
                if (contentWindow === null) { throw new Error('Frame missing content window'); }

                let validOrigin = true;
                try {
                    validOrigin = (contentWindow.location.origin === targetOrigin);
                } catch (e) {
                    // NOP
                }
                if (!validOrigin) { throw new Error('Unexpected frame origin'); }

                contentWindow.postMessage({action, params}, targetOrigin);
            };

            const onMessage = (message) => {
                onMessageInner(message);
                return false;
            };

            const onMessageInner = async (message) => {
                try {
                    if (!isObject(message)) { return; }
                    const {action, params} = message;
                    if (!isObject(params)) { return; }
                    await frameLoaded;
                    if (timer === null) { return; } // Done

                    switch (action) {
                        case 'popupPrepared':
                            {
                                const {secret} = params;
                                const token = yomichan.generateId(16);
                                tokenMap.set(secret, token);
                                postMessage('initialize', {secret, token, frameId});
                            }
                            break;
                        case 'popupInitialized':
                            {
                                const {secret, token} = params;
                                const token2 = tokenMap.get(secret);
                                if (typeof token2 !== 'undefined' && token === token2) {
                                    cleanup();
                                    resolve({secret, token});
                                }
                            }
                            break;
                    }
                } catch (e) {
                    cleanup();
                    reject(e);
                }
            };

            const onLoad = () => {
                if (frameLoadedResolve === null) {
                    cleanup();
                    reject(new Error('Unexpected load event'));
                    return;
                }

                if (Popup.isFrameAboutBlank(frame)) {
                    return;
                }

                frameLoadedResolve();
                frameLoadedResolve = null;
                frameLoadedReject = null;
            };

            const cleanup = () => {
                if (timer === null) { return; } // Done
                clearTimeout(timer);
                timer = null;

                frameLoadedResolve = null;
                if (frameLoadedReject !== null) {
                    frameLoadedReject(new Error('Terminated'));
                    frameLoadedReject = null;
                }

                chrome.runtime.onMessage.removeListener(onMessage);
                frame.removeEventListener('load', onLoad);
            };

            // Start
            timer = setTimeout(() => {
                cleanup();
                reject(new Error('Timeout'));
            }, timeout);

            chrome.runtime.onMessage.addListener(onMessage);
            frame.addEventListener('load', onLoad);

            // Prevent unhandled rejections
            frameLoaded.catch(() => {}); // NOP

            setupFrame(frame);
        });
    }

    async _createInjectPromise() {
        this._injectStyles();

        const {secret, token} = await this._initializeFrame(this._frame, this._targetOrigin, this._frameId, (frame) => {
            frame.removeAttribute('src');
            frame.removeAttribute('srcdoc');
            frame.setAttribute('src', chrome.runtime.getURL('/fg/float.html'));
            this._observeFullscreen(true);
            this._onFullscreenChanged();
        });
        this._frameSecret = secret;
        this._frameToken = token;

        // Configure
        const messageId = yomichan.generateId(16);
        const popupPreparedPromise = yomichan.getTemporaryListenerResult(
            chrome.runtime.onMessage,
            (message, {resolve}) => {
                if (
                    isObject(message) &&
                    message.action === 'popupConfigured' &&
                    isObject(message.params) &&
                    message.params.messageId === messageId
                ) {
                    resolve();
                }
            }
        );
        this._invokeApi('configure', {
            messageId,
            frameId: this._frameId,
            popupId: this._id,
            optionsContext: this._optionsContext,
            childrenSupported: this._childrenSupported,
            scale: this._contentScale
        });

        return popupPreparedPromise;
    }

    _onFrameLoad() {
        if (!this._injectPromiseComplete) { return; }
        this._resetFrame();
    }

    _resetFrame() {
        const parent = this._frame.parentNode;
        if (parent !== null) {
            parent.removeChild(this._frame);
        }
        this._frame.removeAttribute('src');
        this._frame.removeAttribute('srcdoc');

        this._frameSecret = null;
        this._frameToken = null;
        this._injectPromise = null;
        this._injectPromiseComplete = false;
    }

    async _injectStyles() {
        try {
            await this._injectStylesheet('yomichan-popup-outer-stylesheet', 'file', '/fg/css/client.css', true);
        } catch (e) {
            // NOP
        }

        try {
            await this.setCustomOuterCss(this._options.general.customPopupOuterCss, true);
        } catch (e) {
            // NOP
        }
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

        const fullscreenEvents = [
            'fullscreenchange',
            'MSFullscreenChange',
            'mozfullscreenchange',
            'webkitfullscreenchange'
        ];
        const onFullscreenChanged = this._onFullscreenChanged.bind(this);
        for (const eventName of fullscreenEvents) {
            this._fullscreenEventListeners.addEventListener(document, eventName, onFullscreenChanged, false);
        }
    }

    _onFullscreenChanged() {
        const parent = this._getFrameParentElement();
        if (parent !== null && this._frame.parentNode !== parent) {
            parent.appendChild(this._frame);
        }
    }

    async _show(elementRect, writingMode) {
        await this._inject();

        const optionsGeneral = this._options.general;
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

        const fullWidth = (optionsGeneral.popupDisplayMode === 'full-width');
        frame.classList.toggle('yomichan-float-full-width', fullWidth);
        frame.classList.toggle('yomichan-float-above', !below);

        if (optionsGeneral.popupDisplayMode === 'full-width') {
            x = viewport.left;
            y = below ? viewport.bottom - height : viewport.top;
            width = viewport.right - viewport.left;
        }

        frame.style.left = `${x}px`;
        frame.style.top = `${y}px`;
        frame.style.width = `${width}px`;
        frame.style.height = `${height}px`;

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
        this._frame.style.setProperty('visibility', this.isVisibleSync() ? 'visible' : 'hidden', 'important');
    }

    _focusParent() {
        if (this._parent !== null) {
            // Chrome doesn't like focusing iframe without contentWindow.
            const contentWindow = this._parent.getFrame().contentWindow;
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

    _invokeApi(action, params={}) {
        const secret = this._frameSecret;
        const token = this._frameToken;
        const contentWindow = this._frame.contentWindow;
        if (secret === null || token === null || contentWindow === null) { return; }

        contentWindow.postMessage({action, params, secret, token}, this._targetOrigin);
    }

    _getFrameParentElement() {
        const defaultParent = document.body;
        const fullscreenElement = DOM.getFullscreenElement();
        if (fullscreenElement === null || fullscreenElement.shadowRoot) {
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

        const body = document.body;
        return {
            left: 0,
            top: 0,
            right: (body !== null ? body.clientWidth : 0),
            bottom: window.innerHeight
        };
    }

    async _injectStylesheet(id, type, value, useWebExtensionApi) {
        const injectedStylesheets = Popup._injectedStylesheets;

        if (yomichan.isExtensionUrl(window.location.href)) {
            // Permissions error will occur if trying to use the WebExtension API to inject
            // into an extension page.
            useWebExtensionApi = false;
        }

        let styleNode = injectedStylesheets.get(id);
        if (typeof styleNode !== 'undefined') {
            if (styleNode === null) {
                // Previously injected via WebExtension API
                throw new Error(`Stylesheet with id ${id} has already been injected using the WebExtension API`);
            }
        } else {
            styleNode = null;
        }

        if (useWebExtensionApi) {
            // Inject via WebExtension API
            if (styleNode !== null && styleNode.parentNode !== null) {
                styleNode.parentNode.removeChild(styleNode);
            }

            await apiInjectStylesheet(type, value);

            injectedStylesheets.set(id, null);
            return null;
        }

        // Create node in document
        const parentNode = document.head;
        if (parentNode === null) {
            throw new Error('No parent node');
        }

        // Create or reuse node
        const isFile = (type === 'file');
        const tagName = isFile ? 'link' : 'style';
        if (styleNode === null || styleNode.nodeName.toLowerCase() !== tagName) {
            if (styleNode !== null && styleNode.parentNode !== null) {
                styleNode.parentNode.removeChild(styleNode);
            }
            styleNode = document.createElement(tagName);
            styleNode.id = id;
        }

        // Update node style
        if (isFile) {
            styleNode.rel = value;
        } else {
            styleNode.textContent = value;
        }

        // Update parent
        if (styleNode.parentNode !== parentNode) {
            parentNode.appendChild(styleNode);
        }

        // Add to map
        injectedStylesheets.set(id, styleNode);
        return styleNode;
    }

    static isFrameAboutBlank(frame) {
        try {
            const contentDocument = frame.contentDocument;
            if (contentDocument === null) { return false; }
            const url = contentDocument.location.href;
            return /^about:blank(?:[#?]|$)/.test(url);
        } catch (e) {
            return false;
        }
    }
}

Popup._injectedStylesheets = new Map();
