/*
 * Copyright (C) 2020  Yomichan Authors
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
 * apiBroadcastTab
 */

class FrameOffsetForwarder {
    constructor() {
        this._started = false;
        this._frameCache = new Set();
        this._unreachableContentWindowCache = new Set();

        this._forwardFrameOffset = (
            window !== window.parent ?
            this._forwardFrameOffsetParent.bind(this) :
            this._forwardFrameOffsetOrigin.bind(this)
        );

        this._windowMessageHandlers = new Map([
            ['getFrameOffset', ({offset, uniqueId}, e) => this._onGetFrameOffset(offset, uniqueId, e)]
        ]);
    }

    start() {
        if (this._started) { return; }
        window.addEventListener('message', this.onMessage.bind(this), false);
        this._started = true;
    }

    async getOffset() {
        const uniqueId = yomichan.generateId(16);

        const frameOffsetPromise = yomichan.getTemporaryListenerResult(
            chrome.runtime.onMessage,
            ({action, params}, {resolve}) => {
                if (action === 'frameOffset' && isObject(params) && params.uniqueId === uniqueId) {
                    resolve(params);
                }
            },
            5000
        );

        window.parent.postMessage({
            action: 'getFrameOffset',
            params: {
                uniqueId,
                offset: [0, 0]
            }
        }, '*');

        const {offset} = await frameOffsetPromise;
        return offset;
    }

    onMessage(e) {
        const {action, params} = e.data;
        const handler = this._windowMessageHandlers.get(action);
        if (typeof handler !== 'function') { return; }
        handler(params, e);
    }

    _onGetFrameOffset(offset, uniqueId, e) {
        let sourceFrame = null;
        if (!this._unreachableContentWindowCache.has(e.source)) {
            sourceFrame = this._findFrameWithContentWindow(e.source);
        }
        if (sourceFrame === null) {
            // closed shadow root etc.
            this._unreachableContentWindowCache.add(e.source);
            this._forwardFrameOffsetOrigin(null, uniqueId);
            return;
        }

        const [forwardedX, forwardedY] = offset;
        const {x, y} = sourceFrame.getBoundingClientRect();
        offset = [forwardedX + x, forwardedY + y];

        this._forwardFrameOffset(offset, uniqueId);
    }

    _findFrameWithContentWindow(contentWindow) {
        const elementSources = [
            () => [...this._frameCache],
            // will contain duplicates, but frame elements are cheap to handle
            () => [...document.querySelectorAll('frame, iframe:not(.yomichan-float)')],
            () => [document.documentElement]
        ];
        const getMoreElements = () => {
            while (true) {
                const source = elementSources.shift();
                if (source) {
                    const elements = source();
                    if (elements.length === 0) { continue; }
                    return elements;
                }
                return [];
            }
        };

        const elements = [];
        const ELEMENT_NODE = Node.ELEMENT_NODE;
        while (elements.length > 0 || elements.push(...getMoreElements())) {
            const element = elements.shift();
            if (element.contentWindow === contentWindow) {
                this._frameCache.add(element);
                return element;
            }

            const shadowRoot = element.shadowRoot;
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

        return null;
    }

    _forwardFrameOffsetParent(offset, uniqueId) {
        window.parent.postMessage({action: 'getFrameOffset', params: {offset, uniqueId}}, '*');
    }

    _forwardFrameOffsetOrigin(offset, uniqueId) {
        apiBroadcastTab('frameOffset', {offset, uniqueId});
    }
}
