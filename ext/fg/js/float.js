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
 * Display
 * apiBroadcastTab
 * apiGetMessageToken
 * popupNestedInitialize
 */

class DisplayFloat extends Display {
    constructor() {
        super(document.querySelector('#spinner'), document.querySelector('#definitions'));
        this.autoPlayAudioTimer = null;

        this._popupId = null;

        this._orphaned = false;
        this._prepareInvoked = false;
        this._messageToken = null;
        this._messageTokenPromise = null;

        this._onKeyDownHandlers = new Map([
            ['C', (e) => {
                if (e.ctrlKey && !window.getSelection().toString()) {
                    this.onSelectionCopy();
                    return true;
                }
                return false;
            }],
            ...this._onKeyDownHandlers
        ]);

        this._windowMessageHandlers = new Map([
            ['setOptionsContext', ({optionsContext}) => this.setOptionsContext(optionsContext)],
            ['setContent', ({type, details}) => this.setContent(type, details)],
            ['clearAutoPlayTimer', () => this.clearAutoPlayTimer()],
            ['setCustomCss', ({css}) => this.setCustomCss(css)],
            ['prepare', ({popupInfo, optionsContext, childrenSupported, scale}) => this.prepare(popupInfo, optionsContext, childrenSupported, scale)],
            ['setContentScale', ({scale}) => this.setContentScale(scale)]
        ]);

        yomichan.on('orphaned', this.onOrphaned.bind(this));
        window.addEventListener('message', this.onMessage.bind(this), false);
    }

    async prepare(popupInfo, optionsContext, childrenSupported, scale) {
        if (this._prepareInvoked) { return; }
        this._prepareInvoked = true;

        const {id, parentFrameId} = popupInfo;
        this._popupId = id;

        this.optionsContext = optionsContext;

        await super.prepare();
        await this.updateOptions();

        if (childrenSupported) {
            const {depth, url} = optionsContext;
            popupNestedInitialize(id, depth, parentFrameId, url);
        }

        this.setContentScale(scale);

        apiBroadcastTab('popupPrepareCompleted', {targetPopupId: this._popupId});
    }

    onError(error) {
        if (this._orphaned) {
            this.setContent('orphaned');
        } else {
            logError(error, true);
        }
    }

    onOrphaned() {
        this._orphaned = true;
    }

    onSearchClear() {
        window.parent.postMessage('popupClose', '*');
    }

    onSelectionCopy() {
        window.parent.postMessage('selectionCopy', '*');
    }

    onMessage(e) {
        const data = e.data;
        if (typeof data !== 'object' || data === null) { return; } // Invalid data

        const token = data.token;
        if (typeof token !== 'string') { return; } // Invalid data

        if (this._messageToken === null) {
            // Async
            this.getMessageToken()
                .then(
                    () => { this.handleAction(token, data); },
                    () => {}
                );
        } else {
            // Sync
            this.handleAction(token, data);
        }
    }

    async getMessageToken() {
        // this._messageTokenPromise is used to ensure that only one call to apiGetMessageToken is made.
        if (this._messageTokenPromise === null) {
            this._messageTokenPromise = apiGetMessageToken();
        }
        const messageToken = await this._messageTokenPromise;
        if (this._messageToken === null) {
            this._messageToken = messageToken;
        }
        this._messageTokenPromise = null;
    }

    handleAction(token, {action, params}) {
        if (token !== this._messageToken) {
            // Invalid token
            return;
        }

        const handler = this._windowMessageHandlers.get(action);
        if (typeof handler !== 'function') { return; }

        handler(params);
    }

    autoPlayAudio() {
        this.clearAutoPlayTimer();
        this.autoPlayAudioTimer = window.setTimeout(() => super.autoPlayAudio(), 400);
    }

    clearAutoPlayTimer() {
        if (this.autoPlayAudioTimer) {
            window.clearTimeout(this.autoPlayAudioTimer);
            this.autoPlayAudioTimer = null;
        }
    }

    async setOptionsContext(optionsContext) {
        this.optionsContext = optionsContext;
        await this.updateOptions();
    }

    setContentScale(scale) {
        document.body.style.fontSize = `${scale}em`;
    }

    async getDocumentTitle() {
        try {
            const uniqueId = yomichan.generateId(16);

            const promise = yomichan.getTemporaryListenerResult(
                chrome.runtime.onMessage,
                ({action, params}, {resolve}) => {
                    if (
                        action === 'documentInformationBroadcast' &&
                        isObject(params) &&
                        params.uniqueId === uniqueId &&
                        params.frameId === 0
                    ) {
                        resolve(params);
                    }
                },
                2000
            );
            apiBroadcastTab('requestDocumentInformationBroadcast', {uniqueId});

            const {title} = await promise;
            return title;
        } catch (e) {
            return '';
        }
    }
}
