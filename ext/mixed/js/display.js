/*
 * Copyright (C) 2017-2020  Alex Yatskov <alex@foosoft.net>
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
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */


class Display {
    constructor(spinner, container) {
        this.spinner = spinner;
        this.container = container;
        this.definitions = [];
        this.options = null;
        this.context = null;
        this.index = 0;
        this.audioPlaying = null;
        this.audioFallback = null;
        this.audioCache = {};
        this.styleNode = null;

        this.eventListeners = [];
        this.persistentEventListeners = [];
        this.interactive = false;
        this.eventListenersActive = false;
        this.clickScanPrevent = false;
        this.setContentToken = null;

        this.displayGenerator = new DisplayGenerator();
        this.windowScroll = new WindowScroll();

        this.setInteractive(true);
    }

    onError(_error) {
        throw new Error('Override me');
    }

    onSearchClear() {
        throw new Error('Override me');
    }

    onSourceTermView(e) {
        e.preventDefault();
        this.sourceTermView();
    }

    onNextTermView(e) {
        e.preventDefault();
        this.nextTermView();
    }

    async onKanjiLookup(e) {
        try {
            e.preventDefault();
            if (!this.context) { return; }

            const link = e.target;
            this.context.update({
                index: this.entryIndexFind(link),
                scroll: this.windowScroll.y
            });
            const context = {
                sentence: this.context.get('sentence'),
                url: this.context.get('url')
            };

            const definitions = await apiKanjiFind(link.textContent, this.getOptionsContext());
            this.setContent('kanji', {definitions, context});
        } catch (error) {
            this.onError(error);
        }
    }

    onGlossaryMouseDown(e) {
        if (DOM.isMouseButtonPressed(e, 'primary')) {
            this.clickScanPrevent = false;
        }
    }

    onGlossaryMouseMove() {
        this.clickScanPrevent = true;
    }

    onGlossaryMouseUp(e) {
        if (!this.clickScanPrevent && DOM.isMouseButtonPressed(e, 'primary')) {
            this.onTermLookup(e);
        }
    }

    async onTermLookup(e, {disableScroll, selectText, disableHistory}={}) {
        try {
            if (!this.context) { return; }

            const termLookupResults = await this.termLookup(e);
            if (!termLookupResults) { return; }
            const {textSource, definitions} = termLookupResults;

            const scannedElement = e.target;
            const sentence = docSentenceExtract(textSource, this.options.anki.sentenceExt);

            this.context.update({
                index: this.entryIndexFind(scannedElement),
                scroll: this.windowScroll.y
            });
            const context = {
                disableScroll,
                disableHistory,
                sentence,
                url: this.context.get('url')
            };
            if (disableHistory) {
                Object.assign(context, {
                    previous: this.context.previous,
                    next: this.context.next
                });
            } else {
                Object.assign(context, {
                    previous: this.context
                });
            }

            this.setContent('terms', {definitions, context});

            if (selectText) {
                textSource.select();
            }
        } catch (error) {
            this.onError(error);
        }
    }

    async termLookup(e) {
        try {
            e.preventDefault();

            const textSource = docRangeFromPoint(e.clientX, e.clientY, this.options.scanning.deepDomScan);
            if (textSource === null) {
                return false;
            }

            let definitions, length;
            try {
                textSource.setEndOffset(this.options.scanning.length);

                ({definitions, length} = await apiTermsFind(textSource.text(), {}, this.getOptionsContext()));
                if (definitions.length === 0) {
                    return false;
                }

                textSource.setEndOffset(length);
            } finally {
                textSource.cleanup();
            }

            return {textSource, definitions};
        } catch (error) {
            this.onError(error);
        }
    }

    onAudioPlay(e) {
        e.preventDefault();
        const link = e.currentTarget;
        const entry = link.closest('.entry');
        const definitionIndex = this.entryIndexFind(entry);
        const expressionIndex = Display.indexOf(entry.querySelectorAll('.term-expression .action-play-audio'), link);
        this.audioPlay(
            this.definitions[definitionIndex],
            // expressionIndex is used in audioPlay to detect result output mode
            Math.max(expressionIndex, this.options.general.resultOutputMode === 'merge' ? 0 : -1),
            definitionIndex
        );
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
        const handler = Display._onKeyDownHandlers.get(key);
        if (typeof handler === 'function') {
            if (handler(this, e)) {
                e.preventDefault();
                return true;
            }
        }
        return false;
    }

    onWheel(e) {
        if (e.altKey) {
            if (e.deltaY !== 0) {
                this.entryScrollIntoView(this.index + (e.deltaY > 0 ? 1 : -1), null, true);
                e.preventDefault();
            }
        } else if (e.shiftKey) {
            this.onHistoryWheel(e);
        }
    }

    onHistoryWheel(e) {
        const delta = -e.deltaX || e.deltaY;
        if (delta > 0) {
            this.sourceTermView();
            e.preventDefault();
        } else if (delta < 0) {
            this.nextTermView();
            e.preventDefault();
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
        yomichan.on('optionsUpdate', () => this.updateOptions(null));
    }

    async updateOptions(options) {
        this.options = options ? options : await apiOptionsGet(this.getOptionsContext());
        this.updateDocumentOptions(this.options);
        this.updateTheme(this.options.general.popupTheme);
        this.setCustomCss(this.options.general.customPopupCss);
        audioPrepareTextToSpeech(this.options);
    }

    updateDocumentOptions(options) {
        const data = document.documentElement.dataset;
        data.ankiEnabled = `${options.anki.enable}`;
        data.audioEnabled = `${options.audio.enable}`;
        data.compactGlossaries = `${options.general.compactGlossaries}`;
        data.debug = `${options.general.debugInfo}`;
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
            Display.addEventListener(this.persistentEventListeners, document.querySelector('.action-previous'), 'click', this.onSourceTermView.bind(this));
            Display.addEventListener(this.persistentEventListeners, document.querySelector('.action-next'), 'click', this.onNextTermView.bind(this));
            Display.addEventListener(this.persistentEventListeners, document.querySelector('.navigation-header'), 'wheel', this.onHistoryWheel.bind(this), {passive: false});
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
            if (this.options.scanning.enablePopupSearch) {
                this.addEventListeners('.term-glossary-item', 'mouseup', this.onGlossaryMouseUp.bind(this));
                this.addEventListeners('.term-glossary-item', 'mousedown', this.onGlossaryMouseDown.bind(this));
                this.addEventListeners('.term-glossary-item', 'mousemove', this.onGlossaryMouseMove.bind(this));
            }
        } else {
            Display.clearEventListeners(this.eventListeners);
        }
    }

    addEventListeners(selector, type, listener, options) {
        for (const node of this.container.querySelectorAll(selector)) {
            Display.addEventListener(this.eventListeners, node, type, listener, options);
        }
    }

    async setContent(type, details) {
        const token = {}; // Unique identifier token
        this.setContentToken = token;
        try {
            switch (type) {
                case 'terms':
                    await this.setContentTerms(details.definitions, details.context, token);
                    break;
                case 'kanji':
                    await this.setContentKanji(details.definitions, details.context, token);
                    break;
                case 'orphaned':
                    this.setContentOrphaned();
                    break;
            }
        } catch (e) {
            this.onError(e);
        } finally {
            if (this.setContentToken === token) {
                this.setContentToken = null;
            }
        }
    }

    async setContentTerms(definitions, context, token) {
        if (!context) { throw new Error('Context expected'); }
        if (!this.isInitialized()) { return; }

        this.setEventListenersActive(false);

        if (context.focus !== false) {
            window.focus();
        }

        if (!this.displayGenerator.isInitialized()) {
            await this.displayGenerator.initialize();
            if (this.setContentToken !== token) { return; }
        }

        this.definitions = definitions;
        if (context.disableHistory) {
            delete context.disableHistory;
            this.context = new DisplayContext('terms', definitions, context);
        } else {
            this.context = DisplayContext.push(this.context, 'terms', definitions, context);
        }

        for (const definition of definitions) {
            definition.cloze = Display.clozeBuild(context.sentence, definition.source);
            definition.url = context.url;
        }

        this.updateNavigation(this.context.previous, this.context.next);
        this.setNoContentVisible(definitions.length === 0);

        const container = this.container;
        container.textContent = '';

        for (let i = 0, ii = definitions.length; i < ii; ++i) {
            if (i > 0) {
                await promiseTimeout(1);
                if (this.setContentToken !== token) { return; }
            }

            const entry = this.displayGenerator.createTermEntry(definitions[i]);
            container.appendChild(entry);
        }

        const {index, scroll, disableScroll} = context;
        if (!disableScroll) {
            this.entryScrollIntoView(index || 0, scroll);
        } else {
            delete context.disableScroll;
            this.entrySetCurrent(index || 0);
        }

        if (this.options.audio.enabled && this.options.audio.autoPlay) {
            this.autoPlayAudio();
        }

        this.setEventListenersActive(true);

        const states = await apiDefinitionsAddable(definitions, ['term-kanji', 'term-kana'], this.getOptionsContext());
        if (this.setContentToken !== token) { return; }

        this.updateAdderButtons(states);
    }

    async setContentKanji(definitions, context, token) {
        if (!context) { throw new Error('Context expected'); }
        if (!this.isInitialized()) { return; }

        this.setEventListenersActive(false);

        if (context.focus !== false) {
            window.focus();
        }

        if (!this.displayGenerator.isInitialized()) {
            await this.displayGenerator.initialize();
            if (this.setContentToken !== token) { return; }
        }

        this.definitions = definitions;
        if (context.disableHistory) {
            delete context.disableHistory;
            this.context = new DisplayContext('kanji', definitions, context);
        } else {
            this.context = DisplayContext.push(this.context, 'kanji', definitions, context);
        }

        for (const definition of definitions) {
            definition.cloze = Display.clozeBuild(context.sentence, definition.character);
            definition.url = context.url;
        }

        this.updateNavigation(this.context.previous, this.context.next);
        this.setNoContentVisible(definitions.length === 0);

        const container = this.container;
        container.textContent = '';

        for (let i = 0, ii = definitions.length; i < ii; ++i) {
            if (i > 0) {
                await promiseTimeout(0);
                if (this.setContentToken !== token) { return; }
            }

            const entry = this.displayGenerator.createKanjiEntry(definitions[i]);
            container.appendChild(entry);
        }

        const {index, scroll} = context;
        this.entryScrollIntoView(index || 0, scroll);

        this.setEventListenersActive(true);

        const states = await apiDefinitionsAddable(definitions, ['kanji'], this.getOptionsContext());
        if (this.setContentToken !== token) { return; }

        this.updateAdderButtons(states);
    }

    setContentOrphaned() {
        const errorOrphaned = document.querySelector('#error-orphaned');

        if (this.container !== null) {
            this.container.hidden = true;
        }

        if (errorOrphaned !== null) {
            errorOrphaned.hidden = false;
        }

        this.updateNavigation(null, null);
        this.setNoContentVisible(false);
    }

    setNoContentVisible(visible) {
        const noResults = document.querySelector('#no-results');

        if (noResults !== null) {
            noResults.hidden = !visible;
        }
    }

    updateNavigation(previous, next) {
        const navigation = document.querySelector('#navigation-header');
        if (navigation !== null) {
            navigation.hidden = !(previous || next);
            navigation.dataset.hasPrevious = `${!!previous}`;
            navigation.dataset.hasNext = `${!!next}`;
        }
    }

    autoPlayAudio() {
        this.audioPlay(this.definitions[0], this.firstExpressionIndex, 0);
    }

    updateAdderButtons(states) {
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
    }

    entrySetCurrent(index) {
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

        this.index = index;

        return entry;
    }

    entryScrollIntoView(index, scroll, smooth) {
        this.windowScroll.stop();

        const entry = this.entrySetCurrent(index);
        let target;
        if (scroll !== null) {
            target = scroll;
        } else {
            target = this.index === 0 || entry === null ? 0 : Display.getElementTop(entry);

            const header = document.querySelector('#navigation-header');
            if (header !== null) {
                target -= header.getBoundingClientRect().height;
            }
        }

        if (smooth) {
            this.windowScroll.animate(this.windowScroll.x, target, 200);
        } else {
            this.windowScroll.toY(target);
        }
    }

    sourceTermView() {
        if (!this.context || !this.context.previous) { return; }
        this.context.update({
            index: this.index,
            scroll: this.windowScroll.y
        });
        const previousContext = this.context.previous;
        previousContext.set('disableHistory', true);
        const details = {
            definitions: previousContext.definitions,
            context: previousContext.context
        };
        this.setContent(previousContext.type, details);
    }

    nextTermView() {
        if (!this.context || !this.context.next) { return; }
        this.context.update({
            index: this.index,
            scroll: this.windowScroll.y
        });
        const nextContext = this.context.next;
        nextContext.set('disableHistory', true);
        const details = {
            definitions: nextContext.definitions,
            context: nextContext.context
        };
        this.setContent(nextContext.type, details);
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
            let {audio, source} = await audioGetFromSources(expression, sources, this.getOptionsContext(), false, this.audioCache);
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
                    titleDefault = button.title || '';
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
        if (this.spinner !== null) {
            this.spinner.hidden = !visible;
        }
    }

    getEntry(index) {
        const entries = this.container.querySelectorAll('.entry');
        return index >= 0 && index < entries.length ? entries[index] : null;
    }

    static clozeBuild({text, offset}, source) {
        return {
            sentence: text.trim(),
            prefix: text.substring(0, offset).trim(),
            body: text.substring(offset, offset + source.length),
            suffix: text.substring(offset + source.length).trim()
        };
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
        if (object === null) { return; }
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

Display._onKeyDownHandlers = new Map([
    ['Escape', (self) => {
        self.onSearchClear();
        return true;
    }],

    ['PageUp', (self, e) => {
        if (e.altKey) {
            self.entryScrollIntoView(self.index - 3, null, true);
            return true;
        }
        return false;
    }],

    ['PageDown', (self, e) => {
        if (e.altKey) {
            self.entryScrollIntoView(self.index + 3, null, true);
            return true;
        }
        return false;
    }],

    ['End', (self, e) => {
        if (e.altKey) {
            self.entryScrollIntoView(self.definitions.length - 1, null, true);
            return true;
        }
        return false;
    }],

    ['Home', (self, e) => {
        if (e.altKey) {
            self.entryScrollIntoView(0, null, true);
            return true;
        }
        return false;
    }],

    ['ArrowUp', (self, e) => {
        if (e.altKey) {
            self.entryScrollIntoView(self.index - 1, null, true);
            return true;
        }
        return false;
    }],

    ['ArrowDown', (self, e) => {
        if (e.altKey) {
            self.entryScrollIntoView(self.index + 1, null, true);
            return true;
        }
        return false;
    }],

    ['B', (self, e) => {
        if (e.altKey) {
            self.sourceTermView();
            return true;
        }
        return false;
    }],

    ['F', (self, e) => {
        if (e.altKey) {
            self.nextTermView();
            return true;
        }
        return false;
    }],

    ['E', (self, e) => {
        if (e.altKey) {
            self.noteTryAdd('term-kanji');
            return true;
        }
        return false;
    }],

    ['K', (self, e) => {
        if (e.altKey) {
            self.noteTryAdd('kanji');
            return true;
        }
        return false;
    }],

    ['R', (self, e) => {
        if (e.altKey) {
            self.noteTryAdd('term-kana');
            return true;
        }
        return false;
    }],

    ['P', (self, e) => {
        if (e.altKey) {
            const entry = self.getEntry(self.index);
            if (entry !== null && entry.dataset.type === 'term') {
                self.audioPlay(self.definitions[self.index], self.firstExpressionIndex, self.index);
            }
            return true;
        }
        return false;
    }],

    ['V', (self, e) => {
        if (e.altKey) {
            self.noteTryView();
            return true;
        }
        return false;
    }]
]);
