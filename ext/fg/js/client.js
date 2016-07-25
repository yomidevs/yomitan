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
        this.popup          = new Popup();
        this.audio          = {};
        this.lastMousePos   = null;
        this.lastTextSource = null;
        this.activateKey    = 16;
        this.activateBtn    = 2;
        this.enabled        = false;
        this.options        = {};
        this.definitions    = null;
        this.sequence       = 0;
        this.fgRoot         = chrome.extension.getURL('fg');

        chrome.runtime.onMessage.addListener(this.onBgMessage.bind(this));
        window.addEventListener('message', this.onFrameMessage.bind(this));
        window.addEventListener('mousedown', this.onMouseDown.bind(this));
        window.addEventListener('mousemove', this.onMouseMove.bind(this));
        window.addEventListener('keydown', this.onKeyDown.bind(this));
        window.addEventListener('scroll', (e) => this.hidePopup());
        window.addEventListener('resize', (e) => this.hidePopup());
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

    onBgMessage({action, params}, sender, callback) {
        const method = this['api_' + action];
        if (typeof(method) === 'function') {
            method.call(this, params);
        }

        callback();
    }

    onFrameMessage(e) {
        const {action, params} = e.data, method = this['api_' + action];
        if (typeof(method) === 'function') {
            method.call(this, params);
        }
    }

    textSourceFromPoint(point) {
        const element = document.elementFromPoint(point.x, point.y);
        if (element !== null) {
            switch (element.nodeName) {
                case 'IMG':
                    return new TextSourceImage(element);
                case 'INPUT':
                case 'BUTTON':
                case 'TEXTAREA':
                    return new TextSourceInput(element);
            }
        }

        const range = document.caretRangeFromPoint(point.x, point.y);
        if (range !== null) {
            return new TextSourceRange(range);
        }

        return null;
    }

    searchAt(point) {
        const textSource = this.textSourceFromPoint(point);
        if (textSource === null || !textSource.containsPoint(point)) {
            this.hidePopup();
            return;
        }

        if (this.lastTextSource !== null && this.lastTextSource.equals(textSource)) {
            return;
        }

        textSource.setEndOffset(this.options.scanLength);
        bgFindTerm(textSource.text(), ({definitions, length}) => {
            if (length === 0) {
                this.hidePopup();
            } else {
                const sequence = ++this.sequence;
                textSource.setEndOffset(length);

                bgRenderText(
                    {definitions, root: this.fgRoot, options: this.options, sequence},
                    'term-list.html',
                    (content) => {
                        this.definitions = definitions;
                        this.showPopup(textSource, content);

                        bgCanAddDefinitions(definitions, ['vocab_kanji', 'vocab_kana'], (states) => {
                            if (states !== null) {
                                states.forEach((state, index) => this.popup.sendMessage('setActionState', {index, state, sequence}));
                            }
                        });
                    }
                );
            }
        });
    }

    showPopup(textSource, content) {
        this.popup.showNextTo(textSource.getRect(), content);

        if (this.options.selectMatchedText) {
            textSource.select();
        }

        this.lastTextSource = textSource;
    }

    hidePopup() {
        this.popup.hide();

        if (this.options.selectMatchedText && this.lastTextSource !== null) {
            this.lastTextSource.deselect();
        }

        this.lastTextSource   = null;
        this.definitions = null;
    }

    api_setOptions(opts) {
        this.options = opts;
    }

    api_setEnabled(enabled) {
        if (!(this.enabled = enabled)) {
            this.hidePopup();
        }
    }

    api_addNote({index, mode}) {
        const state = {};
        state[mode] = false;

        bgAddDefinition(this.definitions[index], mode, (success) => {
            if (success) {
                this.popup.sendMessage('setActionState', {index, state, sequence: this.sequence});
            } else {
                alert('Note could not be added');
            }
        });
    }

    api_playAudio(index) {
        const definition = this.definitions[index];

        let url = `https://assets.languagepod101.com/dictionary/japanese/audiomp3.php?kanji=${encodeURIComponent(definition.expression)}`;
        if (definition.reading) {
            url += `&kana=${encodeURIComponent(definition.reading)}`;
        }

        for (let key in this.audio) {
            this.audio[key].pause();
        }

        const audio = this.audio[url] || new Audio(url);
        audio.currentTime = 0;
        audio.play();

        this.audio[url] = audio;
    }

    api_displayKanji(kanji) {
        bgFindKanji(kanji, (definitions) => {
            const sequence = ++this.sequence;
            bgRenderText(
                {definitions, root: this.fgRoot, options: this.options, sequence},
                'kanji-list.html',
                (content) => {
                    this.definitions = definitions;
                    this.popup.setContent(content, definitions);

                    bgCanAddDefinitions(definitions, ['kanji'], (states) => {
                        if (states !== null) {
                            states.forEach((state, index) => this.popup.sendMessage('setActionState', {index, state, sequence}));
                        }
                    });
                }
            );
        });
    }
}

window.yomiClient = new Client();
