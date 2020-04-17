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
        for (const frame of document.querySelectorAll('frame, iframe:not(.yomichan-float)')) {
            if (frame.contentWindow !== e.source) { continue; }
            sourceFrame = frame;
            break;
        }

        if (sourceFrame === null) {
            sourceFrame = this._getOpenShadowRootSourceFrame(e.source);
            if (!sourceFrame) {
                // closed shadow root etc.
                this._forwardFrameOffsetOrigin(null, uniqueId);
                return;
            }
        }

        const [forwardedX, forwardedY] = offset;
        const {x, y} = sourceFrame.getBoundingClientRect();
        offset = [forwardedX + x, forwardedY + y];

        this._forwardFrameOffset(offset, uniqueId);
    }

    _getOpenShadowRootSourceFrame(sourceWindow) {
        const getShadowRootElements = (documentOrElement) => {
            const elements = Array.from(documentOrElement.querySelectorAll('*'))
                .filter((el) => !!el.shadowRoot);
            const childElements = elements
                .map((el) => el.shadowRoot)
                .map(getShadowRootElements);
            elements.push(childElements.flat());

            return elements.flat();
        };

        return getShadowRootElements(document)
            .map((el) => Array.from(el.shadowRoot.querySelectorAll('frame, iframe:not(.yomichan-float)')))
            .flat()
            .find((el) => el.contentWindow === sourceWindow);
    }

    _forwardFrameOffsetParent(offset, uniqueId) {
        window.parent.postMessage({action: 'getFrameOffset', params: {offset, uniqueId}}, '*');
    }

    _forwardFrameOffsetOrigin(offset, uniqueId) {
        apiBroadcastTab('frameOffset', {offset, uniqueId});
    }
}
