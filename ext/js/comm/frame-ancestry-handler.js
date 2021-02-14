/*
 * Copyright (C) 2021  Yomichan Authors
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

/**
 * This class is used to return the ancestor frame IDs for the current frame.
 * This is a workaround to using the `webNavigation.getAllFrames` API, which
 * would require an additional permission that is otherwise unnecessary.
 * It is also used to track the correlation between child frame elements and their IDs.
 */
class FrameAncestryHandler {
    /**
     * Creates a new instance.
     * @param frameId The frame ID of the current frame the instance is instantiated in.
     */
    constructor(frameId) {
        this._frameId = frameId;
        this._isPrepared = false;
        this._requestMessageId = 'FrameAncestryHandler.requestFrameInfo';
        this._responseMessageIdBase = `${this._requestMessageId}.response.`;
        this._getFrameAncestryInfoPromise = null;
        this._childFrameMap = new Map();
    }

    /**
     * Gets the frame ID that the instance is instantiated in.
     */
    get frameId() {
        return this._frameId;
    }

    /**
     * Initializes event event listening.
     */
    prepare() {
        if (this._isPrepared) { return; }
        window.addEventListener('message', this._onWindowMessage.bind(this), false);
        this._isPrepared = true;
    }

    /**
     * Returns whether or not this frame is the root frame in the tab.
     * @returns `true` if it is the root, otherwise `false`.
     */
    isRootFrame() {
        return (window === window.parent);
    }

    /**
     * Gets the frame ancestry information for the current frame. If the frame is the
     * root frame, an empty array is returned. Otherwise, an array of frame IDs is returned,
     * starting from the nearest ancestor.
     * @param timeout The maximum time to wait to receive a response to frame information requests.
     * @returns An array of frame IDs corresponding to the ancestors of the current frame.
     */
    async getFrameAncestryInfo() {
        if (this._getFrameAncestryInfoPromise === null) {
            this._getFrameAncestryInfoPromise = this._getFrameAncestryInfo(5000);
        }
        return await this._getFrameAncestryInfoPromise;
    }

    /**
     * Gets the frame element of a child frame given a frame ID.
     * For this function to work, the `getFrameAncestryInfo` function needs to have
     * been invoked previously.
     * @param frameId The frame ID of the child frame to get.
     * @returns The element corresponding to the frame with ID `frameId`, otherwise `null`.
     */
    getChildFrameElement(frameId) {
        const frameInfo = this._childFrameMap.get(frameId);
        if (typeof frameInfo === 'undefined') { return null; }

        let {frameElement} = frameInfo;
        if (typeof frameElement === 'undefined') {
            frameElement = this._findFrameElementWithContentWindow(frameInfo.window);
            frameInfo.frameElement = frameElement;
        }

        return frameElement;
    }

    // Private

    _getFrameAncestryInfo(timeout=5000) {
        return new Promise((resolve, reject) => {
            const targetWindow = window.parent;
            if (window === targetWindow) {
                resolve([]);
                return;
            }

            const uniqueId = generateId(16);
            let nonce = generateId(16);
            const responseMessageId = `${this._responseMessageIdBase}${uniqueId}`;
            const results = [];
            let timer = null;

            const cleanup = () => {
                if (timer !== null) {
                    clearTimeout(timer);
                    timer = null;
                }
                yomichan.crossFrame.unregisterHandler(responseMessageId);
            };
            const onMessage = (params) => {
                if (params.nonce !== nonce) { return null; }

                // Add result
                const {frameId, more} = params;
                results.push(frameId);
                nonce = generateId(16);

                if (!more) {
                    // Cleanup
                    cleanup();

                    // Finish
                    resolve(results);
                }
                return {nonce};
            };
            const onTimeout = () => {
                timer = null;
                cleanup();
                reject(new Error(`Request for parent frame ID timed out after ${timeout}ms`));
            };
            const resetTimeout = () => {
                if (timer !== null) { clearTimeout(timer); }
                timer = setTimeout(onTimeout, timeout);
            };

            // Start
            yomichan.crossFrame.registerHandlers([[responseMessageId, {async: false, handler: onMessage}]]);
            resetTimeout();
            const frameId = this._frameId;
            this._requestFrameInfo(targetWindow, frameId, frameId, uniqueId, nonce);
        });
    }

    _onWindowMessage(event) {
        const {source} = event;
        if (source === window || source.parent !== window) { return; }

        const {data} = event;
        if (
            typeof data === 'object' &&
            data !== null &&
            data.action === this._requestMessageId
        ) {
            this._onRequestFrameInfo(data.params, source);
        }
    }

    async _onRequestFrameInfo(params, source) {
        try {
            let {originFrameId, childFrameId, uniqueId, nonce} = params;
            if (
                !this._isNonNegativeInteger(originFrameId) ||
                typeof uniqueId !== 'string' ||
                typeof nonce !== 'string'
            ) {
                return;
            }

            const frameId = this._frameId;
            const {parent} = window;
            const more = (window !== parent);
            const responseParams = {frameId, nonce, more};
            const responseMessageId = `${this._responseMessageIdBase}${uniqueId}`;

            try {
                const response = await yomichan.crossFrame.invoke(originFrameId, responseMessageId, responseParams);
                if (response === null) { return; }
                nonce = response.nonce;
            } catch (e) {
                return;
            }

            if (!this._childFrameMap.has(childFrameId)) {
                this._childFrameMap.set(childFrameId, {window: source, frameElement: void 0});
            }

            if (more) {
                this._requestFrameInfo(parent, originFrameId, frameId, uniqueId, nonce);
            }
        } catch (e) {
            // NOP
        }
    }

    _requestFrameInfo(targetWindow, originFrameId, childFrameId, uniqueId, nonce) {
        targetWindow.postMessage({
            action: this._requestMessageId,
            params: {originFrameId, childFrameId, uniqueId, nonce}
        }, '*');
    }

    _isNonNegativeInteger(value) {
        return (
            typeof value === 'number' &&
            Number.isFinite(value) &&
            value >= 0 &&
            Math.floor(value) === value
        );
    }

    _findFrameElementWithContentWindow(contentWindow) {
        // Check frameElement, for non-null same-origin frames
        try {
            const {frameElement} = contentWindow;
            if (frameElement !== null) { return frameElement; }
        } catch (e) {
            // NOP
        }

        // Check frames
        const frameTypes = ['iframe', 'frame', 'embed'];
        for (const frameType of frameTypes) {
            for (const frame of document.getElementsByTagName(frameType)) {
                if (frame.contentWindow === contentWindow) {
                    return frame;
                }
            }
        }

        // Check for shadow roots
        const rootElements = [document.documentElement];
        while (rootElements.length > 0) {
            const rootElement = rootElements.shift();
            const walker = document.createTreeWalker(rootElement, NodeFilter.SHOW_ELEMENT);
            while (walker.nextNode()) {
                const element = walker.currentNode;

                if (element.contentWindow === contentWindow) {
                    return element;
                }

                const shadowRoot = (
                    element.shadowRoot ||
                    element.openOrClosedShadowRoot // Available to Firefox 63+ for WebExtensions
                );
                if (shadowRoot) {
                    rootElements.push(shadowRoot);
                }
            }
        }

        // Not found
        return null;
    }
}
