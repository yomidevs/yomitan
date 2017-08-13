/*
 * Copyright (C) 2016  Alex Yatskov <alex@foosoft.net>
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


window.yomichan_frontend = new class {
    constructor() {
        this.popup = new Popup();
        this.popupTimer = null;
        this.lastMousePos = null;
        this.mouseDownLeft = false;
        this.mouseDownMiddle = false;
        this.lastTextSource = null;
        this.pendingLookup = false;
        this.options = null;
    }

    async prepare() {
        try {
            this.options = await apiOptionsGet();
        } catch (e) {
            this.onError(e);
        }

        window.addEventListener('message', this.onFrameMessage.bind(this));
        window.addEventListener('mousedown', this.onMouseDown.bind(this));
        window.addEventListener('mousemove', this.onMouseMove.bind(this));
        window.addEventListener('mouseover', this.onMouseOver.bind(this));
        window.addEventListener('mouseup', this.onMouseUp.bind(this));
        window.addEventListener('resize', this.onResize.bind(this));

        chrome.runtime.onMessage.addListener(this.onBgMessage.bind(this));
    }

    popupTimerSet(callback) {
        this.popupTimerClear();
        this.popupTimer = window.setTimeout(callback, this.options.scanning.delay);
    }

    popupTimerClear() {
        if (this.popupTimer) {
            window.clearTimeout(this.popupTimer);
            this.popupTimer = null;
        }
    }

    onMouseOver(e) {
        if (e.target === this.popup.container && this.popupTimer) {
            this.popupTimerClear();
        }
    }

    onMouseMove(e) {
        this.lastMousePos = {x: e.clientX, y: e.clientY};
        this.popupTimerClear();

        if (!this.options.general.enable) {
            return;
        }

        if (this.mouseDownLeft) {
            return;
        }

        const mouseScan = this.mouseDownMiddle && this.options.scanning.middleMouse;
        const keyScan =
            this.options.scanning.modifier === 'alt' && e.altKey ||
            this.options.scanning.modifier === 'ctrl' && e.ctrlKey ||
            this.options.scanning.modifier === 'shift' && e.shiftKey ||
            this.options.scanning.modifier === 'none';

        if (!keyScan && !mouseScan) {
            return;
        }

        const searchFunc = () => this.searchAt(this.lastMousePos);
        if (this.options.scanning.modifier === 'none') {
            this.popupTimerSet(searchFunc);
        } else {
            searchFunc();
        }
    }

    onMouseDown(e) {
        this.lastMousePos = {x: e.clientX, y: e.clientY};
        this.popupTimerClear();
        this.searchClear();

        if (e.which === 1) {
            this.mouseDownLeft = true;
        } else if (e.which === 2) {
            this.mouseDownMiddle = true;
        }
    }

    onMouseUp(e) {
        if (e.which === 1) {
            this.mouseDownLeft = false;
        } else if (e.which === 2) {
            this.mouseDownMiddle = false;
        }
    }

    onFrameMessage(e) {
        const handlers = {
            popupClose: () => {
                this.searchClear();
            },

            selectionCopy: () => {
                document.execCommand('copy');
            }
        };

        const handler = handlers[e.data];
        if (handler) {
            handler();
        }
    }

    onBgMessage({action, params}, sender, callback) {
        const handlers = {
            optionsSet: options => {
                this.options = options;
                if (!this.options.enable) {
                    this.searchClear();
                }
            }
        };

        const handler = handlers[action];
        if (handler) {
            handler(params);
        }

        callback();
    }

    onResize() {
        this.onSearchClear();
    }

    async searchAt(point) {
        if (this.pendingLookup) {
            return;
        }

        const textSource = docRangeFromPoint(point);
        if (!textSource || !textSource.containsPoint(point)) {
            docImposterDestroy();
            return;
        }

        if (this.lastTextSource && this.lastTextSource.equals(textSource)) {
            return;
        }

        this.pendingLookup = true;

        try {
            if (!await this.searchTerms(textSource)) {
                await this.searchKanji(textSource);
            }
        } catch (e) {
            this.onError(e);
        }

        docImposterDestroy();
        this.pendingLookup = false;
    }

    async searchTerms(textSource) {
        textSource.setEndOffset(this.options.scanning.length);

        const {definitions, length} = await apiTermsFind(textSource.text());
        if (definitions.length === 0) {
            return false;
        }

        textSource.setEndOffset(length);

        const sentence = docSentenceExtract(textSource, this.options.anki.sentenceExt);
        const url = window.location.href;
        this.popup.termsShow(
            textSource.getRect(),
            definitions,
            this.options,
            {sentence, url}
        );

        this.lastTextSource = textSource;
        if (this.options.scanning.selectText) {
            textSource.select();
        }

        return true;
    }

    async searchKanji(textSource) {
        textSource.setEndOffset(1);

        const definitions = await apiKanjiFind(textSource.text());
        if (definitions.length === 0) {
            return false;
        }

        const sentence = docSentenceExtract(textSource, this.options.anki.sentenceExt);
        const url = window.location.href;
        this.popup.showKanji(
            textSource.getRect(),
            definitions,
            this.options,
            {sentence, url}
        );

        this.lastTextSource = textSource;
        if (this.options.scanning.selectText) {
            textSource.select();
        }

        return true;
    }

    searchClear() {
        docImposterDestroy();
        this.popup.hide();

        if (this.options.scanning.selectText && this.lastTextSource) {
            this.lastTextSource.deselect();
        }

        this.lastTextSource = null;
    }

    handleError(error, textSource) {
        if (window.yomichan_orphaned) {
            if (textSource && this.options.scanning.modifier !== 'none') {
                this.popup.showOrphaned(textSource.getRect(), this.options);
            }
        } else {
            window.alert(`Error: ${error}`);
        }
    }
};
