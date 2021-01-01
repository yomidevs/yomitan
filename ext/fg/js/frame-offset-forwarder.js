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

/* global
 * api
 */

class FrameOffsetForwarder {
    constructor(frameId) {
        this._frameId = frameId;
        this._isPrepared = false;
        this._cacheMaxSize = 1000;
        this._frameCache = new Set();
        this._unreachableContentWindowCache = new Set();
        this._windowMessageHandlers = new Map([
            ['getFrameOffset', this._onMessageGetFrameOffset.bind(this)]
        ]);
    }

    prepare() {
        if (this._isPrepared) { return; }
        window.addEventListener('message', this._onMessage.bind(this), false);
        this._isPrepared = true;
    }

    async getOffset() {
        if (window === window.parent) {
            return [0, 0];
        }

        const uniqueId = generateId(16);

        const frameOffsetPromise = yomichan.getTemporaryListenerResult(
            chrome.runtime.onMessage,
            ({action, params}, {resolve}) => {
                if (action === 'frameOffset' && isObject(params) && params.uniqueId === uniqueId) {
                    resolve(params);
                }
            },
            5000
        );

        this._getFrameOffsetParent([0, 0], uniqueId, this._frameId);

        const {offset} = await frameOffsetPromise;
        return offset;
    }

    // Private

    _onMessage(event) {
        const data = event.data;
        if (data === null || typeof data !== 'object') { return; }

        try {
            const {action, params} = event.data;
            const handler = this._windowMessageHandlers.get(action);
            if (typeof handler !== 'function') { return; }
            handler(params, event);
        } catch (e) {
            // NOP
        }
    }

    _onMessageGetFrameOffset({offset, uniqueId, frameId}, e) {
        let sourceFrame = null;
        if (!this._unreachableContentWindowCache.has(e.source)) {
            sourceFrame = this._findFrameWithContentWindow(e.source);
        }
        if (sourceFrame === null) {
            // closed shadow root etc.
            this._addToCache(this._unreachableContentWindowCache, e.source);
            this._replyFrameOffset(null, uniqueId, frameId);
            return;
        }

        const [forwardedX, forwardedY] = offset;
        const {x, y} = sourceFrame.getBoundingClientRect();
        offset = [forwardedX + x, forwardedY + y];

        if (window === window.parent) {
            this._replyFrameOffset(offset, uniqueId, frameId);
        } else {
            this._getFrameOffsetParent(offset, uniqueId, frameId);
        }
    }

    _findFrameWithContentWindow(contentWindow) {
        const ELEMENT_NODE = Node.ELEMENT_NODE;
        for (const elements of this._getFrameElementSources()) {
            while (elements.length > 0) {
                const element = elements.shift();
                if (element.contentWindow === contentWindow) {
                    this._addToCache(this._frameCache, element);
                    return element;
                }

                const shadowRoot = (
                    element.shadowRoot ||
                    element.openOrClosedShadowRoot // Available to Firefox 63+ for WebExtensions
                );
                if (shadowRoot) {
                    for (const child of shadowRoot.children) {
                        if (child.nodeType === ELEMENT_NODE) {
                            elements.push(child);
                        }
                    }
                }

                for (const child of element.children) {
                    if (child.nodeType === ELEMENT_NODE) {
                        elements.push(child);
                    }
                }
            }
        }

        return null;
    }

    *_getFrameElementSources() {
        const frameCache = [];
        for (const frame of this._frameCache) {
            // removed from DOM
            if (!frame.isConnected) {
                this._frameCache.delete(frame);
                continue;
            }
            frameCache.push(frame);
        }
        yield frameCache;
        // will contain duplicates, but frame elements are cheap to handle
        yield [...document.querySelectorAll('frame,iframe')];
        yield [document.documentElement];
    }

    _addToCache(cache, value) {
        let freeSlots = this._cacheMaxSize - cache.size;
        if (freeSlots <= 0) {
            for (const cachedValue of cache) {
                cache.delete(cachedValue);
                ++freeSlots;
                if (freeSlots > 0) { break; }
            }
        }
        cache.add(value);
    }

    _getFrameOffsetParent(offset, uniqueId, frameId) {
        window.parent.postMessage({
            action: 'getFrameOffset',
            params: {
                offset,
                uniqueId,
                frameId
            }
        }, '*');
    }

    _replyFrameOffset(offset, uniqueId, frameId) {
        api.sendMessageToFrame(frameId, 'frameOffset', {offset, uniqueId});
    }
}
