/*
 * Copyright (C) 2017  Alex Yatskov <alex@foosoft.net>
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


class Display {
    constructor(spinner, container) {
        this.spinner = spinner;
        this.container = container;
        this.definitions = [];
        this.options = null;
        this.context = null;
        this.sequence = 0;
        this.index = 0;
        this.audioPlaying = null;
        this.audioFallback = null;
        this.audioCache = {};
        this.styleNode = null;

        this.eventListeners = [];
        this.persistentEventListeners = [];
        this.interactive = false;
        this.eventListenersActive = false;

        this.windowScroll = new WindowScroll();

        this.setInteractive(true);
    }

    onError(error) {
        throw new Error('Override me');
    }

    onSearchClear() {
        throw new Error('Override me');
    }

    onSourceTermView(e) {
        e.preventDefault();
        this.sourceTermView();
    }

    async onKanjiLookup(e) {
        try {
            e.preventDefault();

            const link = e.target;
            this.windowScroll.toY(0);
            const context = {
                source: {
                    definitions: this.definitions,
                    index: this.entryIndexFind(link),
                    scroll: this.windowScroll.y
                }
            };

            if (this.context) {
                context.sentence = this.context.sentence;
                context.url = this.context.url;
                context.source.source = this.context.source;
            }

            const kanjiDefs = await apiKanjiFind(link.textContent, this.getOptionsContext());
            this.kanjiShow(kanjiDefs, context);
        } catch (e) {
            this.onError(e);
        }
    }

    async onTermLookup(e) {
        try {
            e.preventDefault();

            const clickedElement = e.target;
            const textSource = docRangeFromPoint(e.clientX, e.clientY, this.options);
            if (textSource === null) {
                return false;
            }

            let definitions, length, sentence;
            try {
                textSource.setEndOffset(this.options.scanning.length);

                ({definitions, length} = await apiTermsFind(textSource.text(), this.getOptionsContext()));
                if (definitions.length === 0) {
                    return false;
                }

                textSource.setEndOffset(length);

                sentence = docSentenceExtract(textSource, this.options.anki.sentenceExt);
            } finally {
                textSource.cleanup();
            }

            this.windowScroll.toY(0);
            const context = {
                source: {
                    definitions: this.definitions,
                    index: this.entryIndexFind(clickedElement),
                    scroll: this.windowScroll.y
                }
            };

            if (this.context) {
                context.sentence = sentence;
                context.url = this.context.url;
                context.source.source = this.context.source;
            }

            this.termsShow(definitions, context);
        } catch (e) {
            this.onError(e);
        }
    }

    onAudioPlay(e) {
        e.preventDefault();
        const link = e.currentTarget;
        const entry = link.closest('.entry');
        const definitionIndex = this.entryIndexFind(entry);
        const expressionIndex = Display.indexOf(entry.querySelectorAll('.expression .action-play-audio'), link);
        this.audioPlay(this.definitions[definitionIndex], expressionIndex, definitionIndex);
    }

    onNoteAdd(e) {
        e.preventDefault();
        const link = e.currentTarget;
        const index = this.entryIndexFind(link);
        this.noteAdd(this.definitions[index], link.dataset.mode);
    }

    onNoteView(e) {
        e.preventDefault();
        const link = e.currentTarget;
        apiNoteView(link.dataset.noteId);
    }

    onKeyDown(e) {
        const key = Display.getKeyFromEvent(e);
        const handlers = Display.onKeyDownHandlers;
        if (handlers.hasOwnProperty(key)) {
            const handler = handlers[key];
            if (handler(this, e)) {
                e.preventDefault();
            }
        }
    }

    onWheel(e) {
        if (e.altKey) {
            const delta = e.deltaY;
            if (delta !== 0) {
                this.entryScrollIntoView(this.index + (delta > 0 ? 1 : -1), null, true);
                e.preventDefault();
            }
        }
    }

    onRuntimeMessage({action, params}, sender, callback) {
        const handlers = Display.runtimeMessageHandlers;
        if (handlers.hasOwnProperty(action)) {
            const handler = handlers[action];
            handler(this, params);
            callback();
        }
    }

    getOptionsContext() {
        throw new Error('Override me');
    }

    isInitialized() {
        return this.options !== null;
    }

    async initialize(options=null) {
        await this.updateOptions(options);
        chrome.runtime.onMessage.addListener(this.onRuntimeMessage.bind(this));
    }

    async updateOptions(options) {
        this.options = options ? options : await apiOptionsGet(this.getOptionsContext());
        this.updateTheme(this.options.general.popupTheme);
        this.setCustomCss(this.options.general.customPopupCss);
    }

    updateTheme(themeName) {
        document.documentElement.dataset.yomichanTheme = themeName;

        const stylesheets = document.querySelectorAll('link[data-yomichan-theme-name]');
        for (const stylesheet of stylesheets) {
            const match = (stylesheet.dataset.yomichanThemeName === themeName);
            stylesheet.rel = (match ? 'stylesheet' : 'stylesheet alternate');
        }
    }

    setCustomCss(css) {
        if (this.styleNode === null) {
            if (css.length === 0) { return; }
            this.styleNode = document.createElement('style');
        }

        this.styleNode.textContent = css;

        const parent = document.head;
        if (this.styleNode.parentNode !== parent) {
            parent.appendChild(this.styleNode);
        }
    }

    setInteractive(interactive) {
        interactive = !!interactive;
        if (this.interactive === interactive) { return; }
        this.interactive = interactive;

        if (interactive) {
            Display.addEventListener(this.persistentEventListeners, document, 'keydown', this.onKeyDown.bind(this), false);
            Display.addEventListener(this.persistentEventListeners, document, 'wheel', this.onWheel.bind(this), {passive: false});
        } else {
            Display.clearEventListeners(this.persistentEventListeners);
        }
        this.setEventListenersActive(this.eventListenersActive);
    }

    setEventListenersActive(active) {
        active = !!active && this.interactive;
        if (this.eventListenersActive === active) { return; }
        this.eventListenersActive = active;

        if (active) {
            this.addEventListeners('.action-add-note', 'click', this.onNoteAdd.bind(this));
            this.addEventListeners('.action-view-note', 'click', this.onNoteView.bind(this));
            this.addEventListeners('.action-play-audio', 'click', this.onAudioPlay.bind(this));
            this.addEventListeners('.kanji-link', 'click', this.onKanjiLookup.bind(this));
            this.addEventListeners('.source-term', 'click', this.onSourceTermView.bind(this));
            if (this.options.scanning.enablePopupSearch) {
                this.addEventListeners('.glossary-item', 'click', this.onTermLookup.bind(this));
            }
        } else {
            Display.clearEventListeners(this.eventListeners);
        }
    }

    addEventListeners(selector, type, listener, options) {
        this.container.querySelectorAll(selector).forEach((node) => {
            Display.addEventListener(this.eventListeners, node, type, listener, options);
        });
    }

    async termsShow(definitions, context) {
        if (!this.isInitialized()) { return; }

        try {
            const options = this.options;

            this.setEventListenersActive(false);

            if (!context || context.focus !== false) {
                window.focus();
            }

            this.definitions = definitions;
            this.context = context;

            const sequence = ++this.sequence;
            const params = {
                definitions,
                source: context && context.source,
                addable: options.anki.enable,
                grouped: options.general.resultOutputMode === 'group',
                merged: options.general.resultOutputMode === 'merge',
                playback: options.audio.enabled,
                compactGlossaries: options.general.compactGlossaries,
                debug: options.general.debugInfo
            };

            if (context) {
                for (const definition of definitions) {
                    if (context.sentence) {
                        definition.cloze = Display.clozeBuild(context.sentence, definition.source);
                    }

                    definition.url = context.url;
                }
            }

            const content = await apiTemplateRender('terms.html', params);
            this.container.innerHTML = content;
            const {index, scroll} = context || {};
            this.entryScrollIntoView(index || 0, scroll);

            if (options.audio.enabled && options.audio.autoPlay) {
                this.autoPlayAudio();
            }

            this.setEventListenersActive(true);

            await this.adderButtonUpdate(['term-kanji', 'term-kana'], sequence);
        } catch (e) {
            this.onError(e);
        }
    }

    async kanjiShow(definitions, context) {
        if (!this.isInitialized()) { return; }

        try {
            const options = this.options;

            this.setEventListenersActive(false);

            if (!context || context.focus !== false) {
                window.focus();
            }

            this.definitions = definitions;
            this.context = context;

            const sequence = ++this.sequence;
            const params = {
                definitions,
                source: context && context.source,
                addable: options.anki.enable,
                debug: options.general.debugInfo
            };

            if (context) {
                for (const definition of definitions) {
                    if (context.sentence) {
                        definition.cloze = Display.clozeBuild(context.sentence);
                    }

                    definition.url = context.url;
                }
            }

            const content = await apiTemplateRender('kanji.html', params);
            this.container.innerHTML = content;
            const {index, scroll} = context || {};
            this.entryScrollIntoView(index || 0, scroll);

            this.setEventListenersActive(true);

            await this.adderButtonUpdate(['kanji'], sequence);
        } catch (e) {
            this.onError(e);
        }
    }

    autoPlayAudio() {
        this.audioPlay(this.definitions[0], this.firstExpressionIndex, 0);
    }

    async adderButtonUpdate(modes, sequence) {
        try {
            const states = await apiDefinitionsAddable(this.definitions, modes, this.getOptionsContext());
            if (!states || sequence !== this.sequence) {
                return;
            }

            for (let i = 0; i < states.length; ++i) {
                const state = states[i];
                let noteId = null;
                for (const mode in state) {
                    const button = this.adderButtonFind(i, mode);
                    if (button === null) {
                        continue;
                    }

                    const info = state[mode];
                    if (!info.canAdd && noteId === null && info.noteId) {
                        noteId = info.noteId;
                    }
                    button.classList.toggle('disabled', !info.canAdd);
                    button.classList.remove('pending');
                }
                if (noteId !== null) {
                    this.viewerButtonShow(i, noteId);
                }
            }
        } catch (e) {
            this.onError(e);
        }
    }

    entryScrollIntoView(index, scroll, smooth) {
        index = Math.min(index, this.definitions.length - 1);
        index = Math.max(index, 0);

        const entryPre = this.getEntry(this.index);
        if (entryPre !== null) {
            entryPre.classList.remove('entry-current');
        }

        const entry = this.getEntry(index);
        if (entry !== null) {
            entry.classList.add('entry-current');
        }

        this.windowScroll.stop();
        let target;

        if (scroll) {
            target = scroll;
        } else {
            target = index === 0 || entry === null ? 0 : Display.getElementTop(entry);
        }

        if (smooth) {
            this.windowScroll.animate(this.windowScroll.x, target, 200);
        } else {
            this.windowScroll.toY(target);
        }

        this.index = index;
    }

    sourceTermView() {
        if (this.context && this.context.source) {
            const context = {
                url: this.context.source.url,
                sentence: this.context.source.sentence,
                index: this.context.source.index,
                scroll: this.context.source.scroll,
                source: this.context.source.source
            };

            this.termsShow(this.context.source.definitions, context);
        }
    }

    noteTryAdd(mode) {
        const button = this.adderButtonFind(this.index, mode);
        if (button !== null && !button.classList.contains('disabled')) {
            this.noteAdd(this.definitions[this.index], mode);
        }
    }

    noteTryView() {
        const button = this.viewerButtonFind(this.index);
        if (button !== null && !button.classList.contains('disabled')) {
            apiNoteView(button.dataset.noteId);
        }
    }

    async noteAdd(definition, mode) {
        try {
            this.setSpinnerVisible(true);

            const context = {};
            if (this.noteUsesScreenshot()) {
                const screenshot = await this.getScreenshot();
                if (screenshot) {
                    context.screenshot = screenshot;
                }
            }

            const noteId = await apiDefinitionAdd(definition, mode, context, this.getOptionsContext());
            if (noteId) {
                const index = this.definitions.indexOf(definition);
                const adderButton = this.adderButtonFind(index, mode);
                if (adderButton !== null) {
                    adderButton.classList.add('disabled');
                }
                this.viewerButtonShow(index, noteId);
            } else {
                throw new Error('Note could not be added');
            }
        } catch (e) {
            this.onError(e);
        } finally {
            this.setSpinnerVisible(false);
        }
    }

    async audioPlay(definition, expressionIndex, entryIndex) {
        try {
            this.setSpinnerVisible(true);

            const expression = expressionIndex === -1 ? definition : definition.expressions[expressionIndex];

            if (this.audioPlaying !== null) {
                this.audioPlaying.pause();
                this.audioPlaying = null;
            }

            const sources = this.options.audio.sources;
            let {audio, source} = await audioGetFromSources(expression, sources, this.getOptionsContext(), true, this.audioCache);
            let info;
            if (audio === null) {
                if (this.audioFallback === null) {
                    this.audioFallback = new Audio('/mixed/mp3/button.mp3');
                }
                audio = this.audioFallback;
                info = 'Could not find audio';
            } else {
                info = `From source ${1 + sources.indexOf(source)}: ${source}`;
            }

            const button = this.audioButtonFindImage(entryIndex);
            if (button !== null) {
                let titleDefault = button.dataset.titleDefault;
                if (!titleDefault) {
                    titleDefault = button.title || "";
                    button.dataset.titleDefault = titleDefault;
                }
                button.title = `${titleDefault}\n${info}`;
            }

            this.audioPlaying = audio;
            audio.currentTime = 0;
            audio.volume = this.options.audio.volume / 100.0;
            audio.play();
        } catch (e) {
            this.onError(e);
        } finally {
            this.setSpinnerVisible(false);
        }
    }

    noteUsesScreenshot() {
        const fields = this.options.anki.terms.fields;
        for (const name in fields) {
            if (fields[name].includes('{screenshot}')) {
                return true;
            }
        }
        return false;
    }

    async getScreenshot() {
        try {
            await this.setPopupVisibleOverride(false);
            await Display.delay(1); // Wait for popup to be hidden.

            const {format, quality} = this.options.anki.screenshot;
            const dataUrl = await apiScreenshotGet({format, quality});
            if (!dataUrl || dataUrl.error) { return; }

            return {dataUrl, format};
        } finally {
            await this.setPopupVisibleOverride(null);
        }
    }

    get firstExpressionIndex() {
        return this.options.general.resultOutputMode === 'merge' ? 0 : -1;
    }

    setPopupVisibleOverride(visible) {
        return apiForward('popupSetVisibleOverride', {visible});
    }

    setSpinnerVisible(visible) {
        this.spinner.style.display = visible ? 'block' : '';
    }

    getEntry(index) {
        const entries = this.container.querySelectorAll('.entry');
        return index >= 0 && index < entries.length ? entries[index] : null;
    }

    static clozeBuild(sentence, source) {
        const result = {
            sentence: sentence.text.trim()
        };

        if (source) {
            result.prefix = sentence.text.substring(0, sentence.offset).trim();
            result.body = source.trim();
            result.suffix = sentence.text.substring(sentence.offset + source.length).trim();
        }

        return result;
    }

    entryIndexFind(element) {
        const entry = element.closest('.entry');
        return entry !== null ? Display.indexOf(this.container.querySelectorAll('.entry'), entry) : -1;
    }

    adderButtonFind(index, mode) {
        const entry = this.getEntry(index);
        return entry !== null ? entry.querySelector(`.action-add-note[data-mode="${mode}"]`) : null;
    }

    viewerButtonFind(index) {
        const entry = this.getEntry(index);
        return entry !== null ? entry.querySelector('.action-view-note') : null;
    }

    viewerButtonShow(index, noteId) {
        const viewerButton = this.viewerButtonFind(index);
        if (viewerButton === null) {
            return;
        }
        viewerButton.classList.remove('pending', 'disabled');
        viewerButton.dataset.noteId = noteId;
    }

    audioButtonFindImage(index) {
        const entry = this.getEntry(index);
        return entry !== null ? entry.querySelector('.action-play-audio>img') : null;
    }

    static delay(time) {
        return new Promise((resolve) => setTimeout(resolve, time));
    }

    static indexOf(nodeList, node) {
        for (let i = 0, ii = nodeList.length; i < ii; ++i) {
            if (nodeList[i] === node) {
                return i;
            }
        }
        return -1;
    }

    static addEventListener(eventListeners, object, type, listener, options) {
        object.addEventListener(type, listener, options);
        eventListeners.push([object, type, listener, options]);
    }

    static clearEventListeners(eventListeners) {
        for (const [object, type, listener, options] of eventListeners) {
            object.removeEventListener(type, listener, options);
        }
        eventListeners.length = 0;
    }

    static getElementTop(element) {
        const elementRect = element.getBoundingClientRect();
        const documentRect = document.documentElement.getBoundingClientRect();
        return elementRect.top - documentRect.top;
    }

    static getKeyFromEvent(event) {
        const key = event.key;
        return (typeof key === 'string' ? (key.length === 1 ? key.toUpperCase() : key) : '');
    }
}

Display.onKeyDownHandlers = {
    'Escape': (self) => {
        self.onSearchClear();
        return true;
    },

    'PageUp': (self, e) => {
        if (e.altKey) {
            self.entryScrollIntoView(self.index - 3, null, true);
            return true;
        }
        return false;
    },

    'PageDown': (self, e) => {
        if (e.altKey) {
            self.entryScrollIntoView(self.index + 3, null, true);
            return true;
        }
        return false;
    },

    'End': (self, e) => {
        if (e.altKey) {
            self.entryScrollIntoView(self.definitions.length - 1, null, true);
            return true;
        }
        return false;
    },

    'Home': (self, e) => {
        if (e.altKey) {
            self.entryScrollIntoView(0, null, true);
            return true;
        }
        return false;
    },

    'ArrowUp': (self, e) => {
        if (e.altKey) {
            self.entryScrollIntoView(self.index - 1, null, true);
            return true;
        }
        return false;
    },

    'ArrowDown': (self, e) => {
        if (e.altKey) {
            self.entryScrollIntoView(self.index + 1, null, true);
            return true;
        }
        return false;
    },

    'B': (self, e) => {
        if (e.altKey) {
            self.sourceTermView();
            return true;
        }
        return false;
    },

    'E': (self, e) => {
        if (e.altKey) {
            self.noteTryAdd('term-kanji');
            return true;
        }
        return false;
    },

    'K': (self, e) => {
        if (e.altKey) {
            self.noteTryAdd('kanji');
            return true;
        }
        return false;
    },

    'R': (self, e) => {
        if (e.altKey) {
            self.noteTryAdd('term-kana');
            return true;
        }
        return false;
    },

    'P': (self, e) => {
        if (e.altKey) {
            const entry = self.getEntry(self.index);
            if (entry !== null && entry.dataset.type === 'term') {
                self.audioPlay(self.definitions[self.index], self.firstExpressionIndex, self.index);
            }
            return true;
        }
        return false;
    },

    'V': (self, e) => {
        if (e.altKey) {
            self.noteTryView();
            return true;
        }
        return false;
    }
};

Display.runtimeMessageHandlers = {
    optionsUpdate: (self) => self.updateOptions(null)
};
