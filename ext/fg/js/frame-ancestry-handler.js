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

/* global
 * api
 */

/**
 * This class is used to return the ancestor frame IDs for the current frame.
 * This is a workaround to using the `webNavigation.getAllFrames` API, which
 * would require an additional permission that is otherwise unnecessary.
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
        this._responseMessageId = `${this._requestMessageId}.response`;
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
     * Gets the frame ancestry information for the current frame. If the frame is the
     * root frame, an empty array is returned. Otherwise, an array of frame IDs is returned,
     * starting from the nearest ancestor.
     * @param timeout The maximum time to wait to receive a response to frame information requests.
     * @returns An array of frame IDs corresponding to the ancestors of the current frame.
     */
    getFrameAncestryInfo(timeout=5000) {
        return new Promise((resolve, reject) => {
            const targetWindow = window.parent;
            if (window === targetWindow) {
                resolve([]);
                return;
            }

            const uniqueId = generateId(16);
            const responseMessageId = this._responseMessageId;
            const results = [];
            let resultsExpectedCount = null;
            let resultsCount = 0;
            let timer = null;

            const cleanup = () => {
                if (timer !== null) {
                    clearTimeout(timer);
                    timer = null;
                }
                chrome.runtime.onMessage.removeListener(onMessage);
            };
            const onMessage = (message, sender, sendResponse) => {
                // Validate message
                if (
                    typeof message !== 'object' ||
                    message === null ||
                    message.action !== responseMessageId
                ) {
                    return;
                }

                const {params} = message;
                if (params.uniqueId !== uniqueId) { return; } // Wrong ID

                const {frameId, index, more} = params;
                console.log({frameId, index, more});
                if (typeof results[index] !== 'undefined') { return; } // Invalid repeat

                // Add result
                results[index] = frameId;
                ++resultsCount;
                if (!more) {
                    resultsExpectedCount = index + 1;
                }

                if (resultsExpectedCount !== null && resultsCount >= resultsExpectedCount) {
                    // Cleanup
                    cleanup();
                    sendResponse();

                    // Finish
                    resolve(results);
                } else {
                    resetTimeout();
                }
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
            chrome.runtime.onMessage.addListener(onMessage);
            resetTimeout();
            this._requestFrameInfo(targetWindow, uniqueId, this._frameId, 0);
        });
    }

    // Private

    _onWindowMessage(event) {
        const {data} = event;
        if (
            typeof data === 'object' &&
            data !== null &&
            data.action === this._requestMessageId
        ) {
            try {
                this._onRequestFrameInfo(data.params);
            } catch (e) {
                // NOP
            }
        }
    }

    _onRequestFrameInfo({uniqueId, originFrameId, index}) {
        if (
            typeof uniqueId !== 'string' ||
            typeof originFrameId !== 'number' ||
            !this._isNonNegativeInteger(index)
        ) {
            return;
        }

        const {parent} = window;
        const more = (window !== parent);

        const responseParams = {uniqueId, frameId: this._frameId, index, more};
        this._safeSendMessageToFrame(originFrameId, this._responseMessageId, responseParams);

        if (more) {
            this._requestFrameInfo(parent, uniqueId, originFrameId, index + 1);
        }
    }

    async _safeSendMessageToFrame(frameId, action, params) {
        try {
            await api.sendMessageToFrame(frameId, action, params);
        } catch (e) {
            // NOP
        }
    }

    _requestFrameInfo(targetWindow, uniqueId, originFrameId, index) {
        targetWindow.postMessage({
            action: this._requestMessageId,
            params: {uniqueId, originFrameId, index}
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
}
