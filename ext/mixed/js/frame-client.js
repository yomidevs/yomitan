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

class FrameClient {
    constructor() {
        this._secret = null;
        this._token = null;
        this._frameId = null;
    }

    get frameId() {
        return this._frameId;
    }

    async connect(frame, targetOrigin, hostFrameId, setupFrame, timeout=10000) {
        const {secret, token, frameId} = await this._connectIternal(frame, targetOrigin, hostFrameId, setupFrame, timeout);
        this._secret = secret;
        this._token = token;
        this._frameId = frameId;
    }

    isConnected() {
        return (this._secret !== null);
    }

    createMessage(data) {
        if (!this.isConnected()) {
            throw new Error('Not connected');
        }
        return {
            token: this._token,
            secret: this._secret,
            data
        };
    }

    _connectIternal(frame, targetOrigin, hostFrameId, setupFrame, timeout) {
        return new Promise((resolve, reject) => {
            const tokenMap = new Map();
            let timer = null;
            let {
                promise: frameLoadedPromise,
                resolve: frameLoadedResolve,
                reject: frameLoadedReject
            } = deferPromise();

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
                    await frameLoadedPromise;
                    if (timer === null) { return; } // Done

                    switch (action) {
                        case 'frameEndpointReady':
                            {
                                const {secret} = params;
                                const token = generateId(16);
                                tokenMap.set(secret, token);
                                postMessage('frameEndpointConnect', {secret, token, hostFrameId});
                            }
                            break;
                        case 'frameEndpointConnected':
                            {
                                const {secret, token} = params;
                                const frameId = message.frameId;
                                const token2 = tokenMap.get(secret);
                                if (typeof token2 !== 'undefined' && token === token2) {
                                    cleanup();
                                    resolve({secret, token, frameId});
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

                if (FrameClient.isFrameAboutBlank(frame)) {
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
            frameLoadedPromise.catch(() => {}); // NOP

            setupFrame(frame);
        });
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
