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


class Driver {
    constructor() {
        this.popup = new Popup();
        this.popupTimer = null;
        this.lastMousePos = null;
        this.leftMouseDown = false;
        this.lastTextSource = null;
        this.pendingLookup = false;
        this.options = null;

        getOptions().then(options => {
            this.options = options;
            window.addEventListener('mouseover', this.onMouseOver.bind(this));
            window.addEventListener('mousedown', this.onMouseDown.bind(this));
            window.addEventListener('mouseup', this.onMouseUp.bind(this));
            window.addEventListener('mousemove', this.onMouseMove.bind(this));
            window.addEventListener('resize', e => this.searchClear());
            chrome.runtime.onMessage.addListener(this.onBgMessage.bind(this));
        }).catch(this.handleError.bind(this));
    }

    popupTimerSet(callback) {
        this.popupTimerClear();
        this.popupTimer = window.setTimeout(callback, this.options.scanning.delay);
    }

    popupTimerClear() {
        if (this.popupTimer !== null) {
            window.clearTimeout(this.popupTimer);
            this.popupTimer = null;
        }
    }

    onMouseOver(e) {
        if (e.target === this.popup.container && this.popuptimer !== null) {
            this.popupTimerClear();
        }
    }

    onMouseMove(e) {
        this.lastMousePos = {x: e.clientX, y: e.clientY};
        this.popupTimerClear();

        if (!this.options.general.enable) {
            return;
        }

        if (this.leftMouseDown) {
            return;
        }

        if (this.options.scanning.requireShift && !e.shiftKey) {
            return;
        }

        const searcher = () => this.searchAt(this.lastMousePos);
        if (!this.popup.isVisible() || e.shiftKey || e.which === 2 /* mmb */) {
            searcher();
        } else {
            this.popupTimerSet(searcher);
        }
    }

    onMouseDown(e) {
        this.lastMousePos = {x: e.clientX, y: e.clientY};
        this.popupTimerClear();
        this.searchClear();

        if (e.which === 1) {
            this.leftMouseDown = true;
        }
    }

    onMouseUp(e) {
        if (e.which === 1) {
            this.leftMouseDown = false;
        }
    }

    onBgMessage({action, params}, sender, callback) {
        const method = this['api_' + action];
        if (typeof(method) === 'function') {
            method.call(this, params);
        }

        callback();
    }

    searchAt(point) {
        if (this.pendingLookup) {
            return;
        }

        const textSource = textSourceFromPoint(point, this.options.scanning.imposter);
        if (textSource === null || !textSource.containsPoint(point)) {
            return;
        }

        if (this.lastTextSource !== null && this.lastTextSource.equals(textSource)) {
            return;
        }

        this.pendingLookup = true;
        this.searchTerms(textSource).then(found => {
            if (!found) {
                return this.searchKanji(textSource);
            }
        }).catch(error => {
            this.handleError(error, textSource);
        }).then(() => {
            this.pendingLookup = false;
        });
    }

    searchTerms(textSource) {
        textSource.setEndOffset(this.options.scanning.length);

        const findFunc = this.options.general.groupResults ? findTermsGrouped : findTerms;
        return findFunc(textSource.text()).then(({definitions, length}) => {
            if (definitions.length === 0) {
                return false;
            } else {
                textSource.setEndOffset(length);

                const sentence = extractSentence(textSource, this.options.anki.sentenceExt);
                const url = window.location.href;

                this.popup.showNextTo(textSource.getRect());
                this.popup.showTermDefs(definitions, this.options, {sentence, url});

                this.lastTextSource = textSource;
                if (this.options.scanning.selectText) {
                    textSource.select();
                }

                return true;
            }
        });
    }

    searchKanji(textSource) {
        textSource.setEndOffset(1);

        return findKanji(textSource.text()).then(definitions => {
            if (definitions.length === 0) {
                return false;
            } else {
                const sentence = extractSentence(textSource, this.options.anki.sentenceExt);
                const url = window.location.href;

                this.popup.showNextTo(textSource.getRect());
                this.popup.showKanjiDefs(definitions, this.options, {sentence, url});

                this.lastTextSource = textSource;
                if (this.options.scanning.selectText) {
                    textSource.select();
                }

                return true;
            }
        });
    }

    searchClear() {
        destroyImposters();
        this.popup.hide();

        if (this.options.scanning.selectText && this.lastTextSource !== null) {
            this.lastTextSource.deselect();
        }

        this.lastTextSource = null;
    }

    handleError(error, textSource) {
        if (window.orphaned) {
            if (textSource) {
                this.popup.showNextTo(textSource.getRect());
                this.popup.showOrphaned();
            }
        } else {
            showError(error);
        }
    }

    api_setOptions(options) {
        this.options = options;
    }
}

window.driver = new Driver();
