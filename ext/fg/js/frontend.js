/*
 * Copyright (C) 2016-2017  Alex Yatskov <alex@foosoft.net>
 * Author: Alex Yatskov <alex@foosoft.net>
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
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */


class Frontend extends TextScanner {
    constructor(popup, ignoreNodes) {
        super(
            window,
            ignoreNodes,
            [popup.getContainer()],
            [(x, y) => this.popup.containsPoint(x, y)]
        );

        this.popup = popup;
        this.options = null;

        this.optionsContext = {
            depth: popup.depth,
            url: popup.url
        };

        this.isPreparedPromiseResolve = null;
        this.isPreparedPromise = new Promise((resolve) => { this.isPreparedPromiseResolve = resolve; });

        this._lastShowPromise = Promise.resolve();
    }

    static create() {
        const data = window.frontendInitializationData || {};
        const {id, depth=0, parentFrameId, ignoreNodes, url, proxy=false} = data;

        const popup = proxy ? new PopupProxy(depth + 1, id, parentFrameId, url) : PopupProxyHost.instance.createPopup(null, depth);
        const frontend = new Frontend(popup, ignoreNodes);
        frontend.prepare();
        return frontend;
    }

    async prepare() {
        try {
            await this.updateOptions();

            chrome.runtime.onMessage.addListener(this.onRuntimeMessage.bind(this));
            this.isPreparedPromiseResolve();
        } catch (e) {
            this.onError(e);
        }
    }

    isPrepared() {
        return this.isPreparedPromise;
    }

    async onResize() {
        const textSource = this.textSourceCurrent;
        if (textSource !== null && await this.popup.isVisibleAsync()) {
            this._lastShowPromise = this.popup.showContent(
                textSource.getRect(),
                textSource.getWritingMode()
            );
        }
    }

    onWindowMessage(e) {
        const action = e.data;
        const handler = Frontend._windowMessageHandlers.get(action);
        if (typeof handler !== 'function') { return false; }

        handler(this);
    }

    onRuntimeMessage({action, params}, sender, callback) {
        const handler = Frontend._runtimeMessageHandlers.get(action);
        if (typeof handler !== 'function') { return false; }

        const result = handler(this, params, sender);
        callback(result);
        return false;
    }

    getMouseEventListeners() {
        return [
            ...super.getMouseEventListeners(),
            [window, 'message', this.onWindowMessage.bind(this)],
            [window, 'resize', this.onResize.bind(this)]
        ];
    }

    async updateOptions() {
        this.options = await apiOptionsGet(this.getOptionsContext());
        await this.popup.setOptions(this.options);
        this.setEnabled(this.options.general.enable);
    }

    async onSearchSource(textSource, cause) {
        let results = null;

        try {
            if (textSource !== null) {
                results = (
                    await this.findTerms(textSource) ||
                    await this.findKanji(textSource)
                );
                if (results !== null) {
                    const focus = (cause === 'mouse');
                    this.showContent(textSource, focus, results.definitions, results.type);
                }
            }
        } catch (e) {
            if (window.yomichan_orphaned) {
                if (textSource !== null && this.options.scanning.modifier !== 'none') {
                    this._lastShowPromise = this.popup.showContent(
                        textSource.getRect(),
                        textSource.getWritingMode(),
                        'orphaned'
                    );
                }
            } else {
                this.onError(e);
            }
        } finally {
            if (results === null && this.options.scanning.autoHideResults) {
                this.onSearchClear(true);
            }
        }

        return results;
    }

    showContent(textSource, focus, definitions, type) {
        const sentence = docSentenceExtract(textSource, this.options.anki.sentenceExt);
        const url = window.location.href;
        this._lastShowPromise = this.popup.showContent(
            textSource.getRect(),
            textSource.getWritingMode(),
            type,
            {definitions, context: {sentence, url, focus, disableHistory: true}}
        );
    }

    showContentCompleted() {
        return this._lastShowPromise;
    }

    async findTerms(textSource) {
        this.setTextSourceScanLength(textSource, this.options.scanning.length);

        const searchText = textSource.text();
        if (searchText.length === 0) { return null; }

        const {definitions, length} = await apiTermsFind(searchText, {}, this.getOptionsContext());
        if (definitions.length === 0) { return null; }

        textSource.setEndOffset(length);

        return {definitions, type: 'terms'};
    }

    async findKanji(textSource) {
        this.setTextSourceScanLength(textSource, 1);

        const searchText = textSource.text();
        if (searchText.length === 0) { return null; }

        const definitions = await apiKanjiFind(searchText, this.getOptionsContext());
        if (definitions.length === 0) { return null; }

        return {definitions, type: 'kanji'};
    }

    onSearchClear(changeFocus) {
        this.popup.hide(changeFocus);
        this.popup.clearAutoPlayTimer();
        super.onSearchClear(changeFocus);
    }

    getOptionsContext() {
        this.optionsContext.url = this.popup.url;
        return this.optionsContext;
    }
}

Frontend._windowMessageHandlers = new Map([
    ['popupClose', (self) => self.onSearchClear(true)],
    ['selectionCopy', () => document.execCommand('copy')]
]);

Frontend._runtimeMessageHandlers = new Map([
    ['optionsUpdate', (self) => self.updateOptions()],
    ['popupSetVisibleOverride', (self, {visible}) => self.popup.setVisibleOverride(visible)]
]);
