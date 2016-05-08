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


class Client {
    constructor() {
        this.popup        = new Popup();
        this.lastMousePos = null;
        this.lastRange    = null;
        this.activateKey  = 16;
        this.activateBtn  = 2;
        this.enabled      = false;
        this.options      = {};
        this.definitions  = null;
        this.sequence     = 0;
        this.fgRoot       = chrome.extension.getURL('fg');

        chrome.runtime.onMessage.addListener(this.onBgMessage.bind(this));
        window.addEventListener('message', this.onFrameMessage.bind(this));
        window.addEventListener('mousedown', this.onMouseDown.bind(this));
        window.addEventListener('mousemove', this.onMouseMove.bind(this));
        window.addEventListener('keydown', this.onKeyDown.bind(this));
        window.addEventListener('scroll', (e) => this.hidePopup());
        window.addEventListener('resize', (e) => this.hidePopup());

        bgGetOptions((opts) => {
            this.setOptions(opts);
            bgGetState((state) => this.setEnabled(state === 'enabled'));
        });
    }

    onKeyDown(e) {
        if (this.enabled && this.lastMousePos !== null && (e.keyCode === this.activateKey || e.charCode === this.activateKey)) {
            this.searchAt(this.lastMousePos);
        }
    }

    onMouseMove(e) {
        this.lastMousePos = {x: e.clientX, y: e.clientY};
        if (this.enabled && (e.shiftKey || e.which === this.activateBtn)) {
            this.searchAt(this.lastMousePos);
        }
    }

    onMouseDown(e) {
        this.lastMousePos = {x: e.clientX, y: e.clientY};
        if (this.enabled && (e.shiftKey || e.which === this.activateBtn)) {
            this.searchAt(this.lastMousePos);
        } else {
            this.hidePopup();
        }
    }

    onBgMessage({name, value}, sender, callback) {
        switch (name) {
            case 'state':
                this.setEnabled(value === 'enabled');
                break;
            case 'options':
                this.setOptions(value);
                break;
        }

        callback();
    }

    onFrameMessage(e) {
        const {action, params} = e.data, handlers = {
            addNote:      ({mode, index}) => this.actionAddNote(index, mode, (data) => e.source.postMessage(data, e.origin)),
            displayKanji: this.actionDisplayKanji
        };

        if (handlers.hasOwnProperty(action)) {
            handlers[action].call(this, params);
        }
    }

    searchAt(point) {
        const range = Range.fromPoint(point);
        if (range === null || !range.containsPoint(point)) {
            this.hidePopup();
            return;
        }

        if (this.lastRange !== null && this.lastRange.compareOrigin(range) === 0) {
            return;
        }

        range.setLength(this.options.scanLength);
        bgFindTerm(range.text(), ({definitions, length}) => {
            if (length === 0) {
                this.hidePopup();
            } else {
                const sequence = ++this.sequence;
                range.setLength(length);
                bgRenderText(
                    {defs: definitions, root: this.fgRoot, options: this.options, sequence: sequence},
                    'term-list.html',
                    (content) => {
                        this.definitions = definitions;
                        this.showPopup(range, content);

                        bgCanAddNotes(definitions, ['vocabExp', 'vocabReading'], (states) => {
                            if (states !== null) {
                                states.forEach((state, index) => this.popup.sendMessage('setActionState', {index: index, state: state, sequence: sequence}));
                            }
                        });
                    }
                );
            }
        });
    }

    actionAddNote(index, mode, callback) {
        const state = {};
        state[mode] = false;

        bgAddNote(this.definitions[index], mode, (success) => {
            if (success) {
                this.popup.sendMessage('setActionState', {index: index, state: state, sequence: this.sequence});
            } else {
                alert('Note could not be added');
            }
        });

    }

    actionDisplayKanji(kanji) {
        bgFindKanji(kanji, (definitions) => {
            const sequence = ++this.sequence;
            bgRenderText(
                {defs: definitions, root: this.fgRoot, options: this.options, sequence: sequence},
                'kanji-list.html',
                (content) => {
                    this.definitions = definitions;
                    this.popup.setContent(content, definitions);

                    bgCanAddNotes(definitions, ['kanji'], (states) => {
                        if (states !== null) {
                            states.forEach((state, index) => this.popup.sendMessage('setActionState', {index: index, state: state, sequence: sequence}));
                        }
                    });
                }
            );
        });
    }

    showPopup(range, content) {
        this.popup.showNextTo(range.getRect(), content);

        if (this.options.selectMatchedText) {
            range.select();
        }

        this.lastRange = range;
    }

    hidePopup() {
        this.popup.hide();

        if (this.options.selectMatchedText && this.lastRange !== null) {
            this.lastRange.deselect();
        }

        this.lastRange   = null;
        this.definitions = null;
    }

    setEnabled(enabled) {
        if (!(this.enabled = enabled)) {
            this.hidePopup();
        }
    }

    setOptions(opts) {
        this.options = opts;
    }
}

window.yomiClient = new Client();
