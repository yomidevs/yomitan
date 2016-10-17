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
        this.audio = {};
        this.lastMousePos = null;
        this.lastTextSource = null;
        this.pendingLookup = false;
        this.enabled = false;
        this.options = null;
        this.definitions = null;
        this.sequence = 0;
        this.fgRoot = chrome.extension.getURL('fg');

        chrome.runtime.onMessage.addListener(this.onBgMessage.bind(this));
        window.addEventListener('message', this.onFrameMessage.bind(this));
        window.addEventListener('mouseover', this.onMouseOver.bind(this));
        window.addEventListener('mousedown', this.onMouseDown.bind(this));
        window.addEventListener('mousemove', this.onMouseMove.bind(this));
        window.addEventListener('keydown', this.onKeyDown.bind(this));
        window.addEventListener('resize', e => this.hidePopup());

        getOptions().then(opts => {
            this.options = opts;
            return getEnabled();
        }).then(enabled => {
            this.enabled = enabled;
        });
    }

    popupTimerSet(callback) {
        this.popupTimerClear();
        this.popupTimer = window.setTimeout(callback, this.options.scanDelay);
    }

    popupTimerClear() {
        if (this.popupTimer !== null) {
            window.clearTimeout(this.popupTimer);
            this.popupTimer = null;
        }
    }

    onKeyDown(e) {
        this.popupTimerClear();

        if (this.enabled && this.lastMousePos !== null && e.keyCode === 16 /* shift */) {
            this.searchAt(this.lastMousePos, true);
        } else if (e.keyCode === 27 /* esc */) {
            this.hidePopup();
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

        if (!this.enabled) {
            return;
        }

        if (e.which === 1 /* lmb */) {
            return;
        }

        if (this.options.holdShiftToScan && !e.shiftKey) {
            return;
        }

        const searcher = () => this.searchAt(this.lastMousePos, false);
        if (!this.popup.visible() || e.shiftKey || e.which === 2 /* mmb */) {
            searcher();
        } else {
            this.popupTimerSet(searcher);
        }
    }

    onMouseDown(e) {
        this.lastMousePos = {x: e.clientX, y: e.clientY};
        this.popupTimerClear();

        if (this.popup.visible()) {
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

    searchTerms(textSource) {
        textSource.setEndOffset(this.options.scanLength);

        this.pendingLookup = true;
        return findTerm(textSource.text()).then(({definitions, length}) => {
            if (definitions.length === 0) {
                this.pendingLookup = false;
                return false;
            } else {
                textSource.setEndOffset(length);

                const sentence = extractSentence(textSource, this.options.sentenceExtent);
                definitions.forEach(definition => {
                    definition.url = window.location.href;
                    definition.sentence = sentence;
                });

                const sequence = ++this.sequence;
                return renderText({definitions, sequence, root: this.fgRoot, options: this.options}, 'term-list.html').then(content => {
                    this.definitions = definitions;
                    this.pendingLookup = false;
                    this.showPopup(textSource, content);
                    return canAddDefinitions(definitions, ['term_kanji', 'term_kana']);
                }).then(states => {
                    if (states !== null) {
                        states.forEach((state, index) => this.popup.invokeApi('setActionState', {index, state, sequence}));
                    }

                    return true;
                });
            }
        });
    }

    searchKanji(textSource) {
        textSource.setEndOffset(1);

        this.pendingLookup = true;
        return findKanji(textSource.text()).then(definitions => {
            if (definitions.length === 0) {
                this.pendingLookup = false;
                return false;
            } else {
                definitions.forEach(definition => definition.url = window.location.href);

                const sequence = ++this.sequence;
                return renderText({definitions, sequence, root: this.fgRoot, options: this.options}, 'kanji-list.html').then(content => {
                    this.definitions = definitions;
                    this.pendingLookup = false;
                    this.showPopup(textSource, content);
                    return canAddDefinitions(definitions, ['kanji']);
                }).then(states => {
                    if (states !== null) {
                        states.forEach((state, index) => this.popup.invokeApi('setActionState', {index, state, sequence}));
                    }

                    return true;
                });
            }
        });
    }

    searchAt(point, hideNotFound) {
        if (this.pendingLookup) {
            return;
        }

        const textSource = textSourceFromPoint(point);
        if (textSource === null || !textSource.containsPoint(point)) {
            if (hideNotFound) {
                this.hidePopup();
            }

            return;
        }

        if (this.lastTextSource !== null && this.lastTextSource.equals(textSource)) {
            return true;
        }

        this.searchTerms(textSource).then(found => {
            if (!found) {
                this.searchKanji(textSource).then(found => {
                    if (!found && hideNotFound) {
                        this.hidePopup();
                    }
                });
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

        this.lastTextSource = null;
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
        const state = {[mode]: false};
        addDefinition(this.definitions[index], mode).then(success => {
            if (success) {
                this.popup.invokeApi('setActionState', {index, state, sequence: this.sequence});
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

        for (const key in this.audio) {
            this.audio[key].pause();
        }

        const audio = this.audio[url] || new Audio(url);
        audio.currentTime = 0;
        audio.play();

        this.audio[url] = audio;
    }

    api_displayKanji(kanji) {
        findKanji(kanji).then(definitions => {
            definitions.forEach(definition => definition.url = window.location.href);

            const sequence = ++this.sequence;
            return renderText({definitions, sequence, root: this.fgRoot, options: this.options}, 'kanji-list.html').then(content => {
                this.definitions = definitions;
                this.popup.setContent(content, definitions);
                return canAddDefinitions(definitions, ['kanji']);
            }).then(states => {
                if (states !== null) {
                    states.forEach((state, index) => this.popup.invokeApi('setActionState', {index, state, sequence}));
                }
            });
        });
    }
}

window.driver = new Driver();
