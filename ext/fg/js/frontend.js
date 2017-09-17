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


class Frontend {
    constructor() {
        this.popup = new Popup();
        this.popupTimer = null;
        this.mouseDownLeft = false;
        this.mouseDownMiddle = false;
        this.textSourceLast = null;
        this.pendingLookup = false;
        this.options = null;
    }

    async prepare() {
        try {
            this.options = await apiOptionsGet();

            window.addEventListener('message', this.onFrameMessage.bind(this));
            window.addEventListener('mousedown', this.onMouseDown.bind(this));
            window.addEventListener('mousemove', this.onMouseMove.bind(this));
            window.addEventListener('mouseover', this.onMouseOver.bind(this));
            window.addEventListener('mouseup', this.onMouseUp.bind(this));
            window.addEventListener('resize', this.onResize.bind(this));

            chrome.runtime.onMessage.addListener(this.onBgMessage.bind(this));
        } catch (e) {
            this.onError(e);
        }
    }

    onMouseOver(e) {
        if (e.target === this.popup.container && this.popupTimer) {
            this.popupTimerClear();
        }
    }

    onMouseMove(e) {
        this.popupTimerClear();

        if (!this.options.general.enable) {
            return;
        }

        if (this.mouseDownLeft) {
            return;
        }

        if (this.pendingLookup) {
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

        const search = async () => {
            try {
                await this.searchAt({x: e.clientX, y: e.clientY});
                this.pendingLookup = false;
            } catch (e) {
                this.onError(e);
            }
        };

        if (this.options.scanning.modifier === 'none') {
            this.popupTimerSet(search);
        } else {
            search();
        }
    }

    onMouseDown(e) {
        this.mousePosLast = {x: e.clientX, y: e.clientY};
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

    onResize() {
        this.searchClear();
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

    onError(error) {
        window.alert(`Error: ${error}`);
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

    async searchAt(point) {
        const textSource = docRangeFromPoint(point);
        let hideResults = false;

        try {
            if (this.pendingLookup) {
                return;
            }

            if (this.textSourceLast && this.textSourceLast.equals(textSource)) {
                return;
            }

            if (textSource && textSource.containsPoint(point)) {
                this.pendingLookup = true;
                hideResults = !await this.searchTerms(textSource) && !await this.searchKanji(textSource);
            }
        } catch (e) {
            if (window.yomichan_orphaned) {
                if (textSource && this.options.scanning.modifier !== 'none') {
                    this.popup.showOrphaned(textSource.getRect(), this.options);
                }
            } else {
                this.onError(e);
            }
        } finally {
            docImposterDestroy();

            if (hideResults && this.options.scanning.autoHideResults) {
                this.popup.hide();
            }

            this.pendingLookup = false;
        }
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

        this.textSourceLast = textSource;
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
        this.popup.kanjiShow(
            textSource.getRect(),
            definitions,
            this.options,
            {sentence, url}
        );

        this.textSourceLast = textSource;
        if (this.options.scanning.selectText) {
            textSource.select();
        }

        return true;
    }

    searchClear() {
        docImposterDestroy();
        this.popup.hide();

        if (this.options.scanning.selectText && this.textSourceLast) {
            this.textSourceLast.deselect();
        }

        this.textSourceLast = null;
    }
}

window.yomichan_frontend = new Frontend();
window.yomichan_frontend.prepare();
