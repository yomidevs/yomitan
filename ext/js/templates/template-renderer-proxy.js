/*
 * Copyright (C) 2020-2022  Yomichan Authors
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

class TemplateRendererProxy {
    constructor() {
        this._frame = null;
        this._frameNeedsLoad = true;
        this._frameLoading = false;
        this._frameLoadPromise = null;
        this._frameUrl = chrome.runtime.getURL('/template-renderer.html');
        this._invocations = new Set();
    }

    async render(template, data, type) {
        await this._prepareFrame();
        return await this._invoke('render', {template, data, type});
    }

    async renderMulti(items) {
        await this._prepareFrame();
        return await this._invoke('renderMulti', {items});
    }

    async getModifiedData(data, type) {
        await this._prepareFrame();
        return await this._invoke('getModifiedData', {data, type});
    }

    // Private

    async _prepareFrame() {
        if (this._frame === null) {
            this._frame = document.createElement('iframe');
            this._frame.addEventListener('load', this._onFrameLoad.bind(this), false);
            const style = this._frame.style;
            style.opacity = '0';
            style.width = '0';
            style.height = '0';
            style.position = 'absolute';
            style.border = '0';
            style.margin = '0';
            style.padding = '0';
            style.pointerEvents = 'none';
        }
        if (this._frameNeedsLoad) {
            this._frameNeedsLoad = false;
            this._frameLoading = true;
            this._frameLoadPromise = this._loadFrame(this._frame, this._frameUrl)
                .finally(() => { this._frameLoading = false; });
        }
        await this._frameLoadPromise;
    }

    _loadFrame(frame, url, timeout=5000) {
        return new Promise((resolve, reject) => {
            let state = 0x0; // 0x1 = frame added; 0x2 = frame loaded; 0x4 = frame ready
            const cleanup = () => {
                frame.removeEventListener('load', onLoad, false);
                window.removeEventListener('message', onWindowMessage, false);
                if (timer !== null) {
                    clearTimeout(timer);
                    timer = null;
                }
            };
            const updateState = (flags) => {
                state |= flags;
                if (state !== 0x7) { return; }
                cleanup();
                resolve();
            };
            const onLoad = () => {
                if ((state & 0x3) !== 0x1) { return; }
                updateState(0x2);
            };
            const onWindowMessage = (e) => {
                if ((state & 0x5) !== 0x1) { return; }
                const frameWindow = frame.contentWindow;
                if (frameWindow === null || frameWindow !== e.source) { return; }
                const {data} = e;
                if (!(typeof data === 'object' && data !== null && data.action === 'ready')) { return; }
                updateState(0x4);
            };

            let timer = setTimeout(() => {
                timer = null;
                cleanup();
                reject(new Error('Timeout'));
            }, timeout);

            frame.removeAttribute('src');
            frame.removeAttribute('srcdoc');
            frame.addEventListener('load', onLoad, false);
            window.addEventListener('message', onWindowMessage, false);
            try {
                document.body.appendChild(frame);
                state = 0x1;
                frame.contentDocument.location.href = url;
            } catch (e) {
                cleanup();
                reject(e);
            }
        });
    }

    _invoke(action, params, timeout=null) {
        return new Promise((resolve, reject) => {
            const frameWindow = (this._frame !== null ? this._frame.contentWindow : null);
            if (frameWindow === null) {
                reject(new Error('Frame not set up'));
                return;
            }

            const id = generateId(16);
            const invocation = {
                cancel: () => {
                    cleanup();
                    reject(new Error('Terminated'));
                }
            };

            const cleanup = () => {
                this._invocations.delete(invocation);
                window.removeEventListener('message', onMessage, false);
                if (timer !== null) {
                    clearTimeout(timer);
                    timer = null;
                }
            };
            const onMessage = (e) => {
                if (
                    e.source !== frameWindow ||
                    e.data.id !== id ||
                    e.data.action !== `${action}.response`
                ) {
                    return;
                }

                const response = e.data.params;
                cleanup();
                const {error} = response;
                if (error) {
                    reject(deserializeError(error));
                } else {
                    resolve(response.result);
                }
            };

            let timer = (typeof timeout === 'number' ? setTimeout(() => {
                cleanup();
                reject(new Error('Timeout'));
            }, timeout) : null);

            this._invocations.add(invocation);

            window.addEventListener('message', onMessage, false);
            frameWindow.postMessage({action, params, id}, '*');
        });
    }

    _onFrameLoad() {
        if (this._frameLoading) { return; }
        this._frameNeedsLoad = true;

        for (const invocation of this._invocations) {
            invocation.cancel();
        }
        this._invocations.clear();
    }
}
