/*
 * Copyright (C) 2017-2020  Yomichan Authors
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
 * AudioSystem
 * DOM
 * DisplayContext
 * DisplayGenerator
 * MediaLoader
 * WindowScroll
 * apiAudioGetUri
 * apiBroadcastTab
 * apiDefinitionAdd
 * apiDefinitionsAddable
 * apiKanjiFind
 * apiNoteView
 * apiOptionsGet
 * apiScreenshotGet
 * apiTermsFind
 * docRangeFromPoint
 * docSentenceExtract
 */

class Display {
    constructor(spinner, container) {
        this.spinner = spinner;
        this.container = container;
        this.definitions = [];
        this.optionsContext = null;
        this.options = null;
        this.context = null;
        this.index = 0;
        this.audioPlaying = null;
        this.audioFallback = null;
        this.audioSystem = new AudioSystem({
            audioUriBuilder: {
                getUri: async (definition, source, details) => {
                    return await apiAudioGetUri(definition, source, details);
                }
            },
            useCache: true
        });
        this.styleNode = null;

        this.eventListeners = new EventListenerCollection();
        this.persistentEventListeners = new EventListenerCollection();
        this.interactive = false;
        this.eventListenersActive = false;
        this.clickScanPrevent = false;
        this.setContentToken = null;

        this.mediaLoader = new MediaLoader();
        this.displayGenerator = new DisplayGenerator({mediaLoader: this.mediaLoader});
        this.windowScroll = new WindowScroll();

        this._onKeyDownHandlers = new Map([
            ['Escape', () => {
                this.onEscape();
                return true;
            }],
            ['PageUp', (e) => {
                if (e.altKey) {
                    this.entryScrollIntoView(this.index - 3, null, true);
                    return true;
                }
                return false;
            }],
            ['PageDown', (e) => {
                if (e.altKey) {
                    this.entryScrollIntoView(this.index + 3, null, true);
                    return true;
                }
                return false;
            }],
            ['End', (e) => {
                if (e.altKey) {
                    this.entryScrollIntoView(this.definitions.length - 1, null, true);
                    return true;
                }
                return false;
            }],
            ['Home', (e) => {
                if (e.altKey) {
                    this.entryScrollIntoView(0, null, true);
                    return true;
                }
                return false;
            }],
            ['ArrowUp', (e) => {
                if (e.altKey) {
                    this.entryScrollIntoView(this.index - 1, null, true);
                    return true;
                }
                return false;
            }],
            ['ArrowDown', (e) => {
                if (e.altKey) {
                    this.entryScrollIntoView(this.index + 1, null, true);
                    return true;
                }
                return false;
            }],
            ['B', (e) => {
                if (e.altKey) {
                    this.sourceTermView();
                    return true;
                }
                return false;
            }],
            ['F', (e) => {
                if (e.altKey) {
                    this.nextTermView();
                    return true;
                }
                return false;
            }],
            ['E', (e) => {
                if (e.altKey) {
                    this.noteTryAdd('term-kanji');
                    return true;
                }
                return false;
            }],
            ['K', (e) => {
                if (e.altKey) {
                    this.noteTryAdd('kanji');
                    return true;
                }
                return false;
            }],
            ['R', (e) => {
                if (e.altKey) {
                    this.noteTryAdd('term-kana');
                    return true;
                }
                return false;
            }],
            ['P', (e) => {
                if (e.altKey) {
                    const index = this.index;
                    if (index < 0 || index >= this.definitions.length) { return; }

                    const entry = this.getEntry(index);
                    if (entry !== null && entry.dataset.type === 'term') {
                        this.audioPlay(this.definitions[index], this.firstExpressionIndex, index);
                    }
                    return true;
                }
                return false;
            }],
            ['V', (e) => {
                if (e.altKey) {
                    this.noteTryView();
                    return true;
                }
                return false;
            }]
        ]);

        this.setInteractive(true);
    }

    async prepare() {
        await yomichan.prepare();
        await this.displayGenerator.prepare();
    }

    onError(_error) {
        throw new Error('Override me');
    }

    onEscape() {
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
        const index = this.entryIndexFind(entry);
        if (index < 0 || index >= this.definitions.length) { return; }

        const expressionIndex = Display.indexOf(entry.querySelectorAll('.term-expression .action-play-audio'), link);
        this.audioPlay(
            this.definitions[index],
            // expressionIndex is used in audioPlay to detect result output mode
            Math.max(expressionIndex, this.options.general.resultOutputMode === 'merge' ? 0 : -1),
            index
        );
    }

    onNoteAdd(e) {
        e.preventDefault();
        const link = e.currentTarget;
        const index = this.entryIndexFind(link);
        if (index < 0 || index >= this.definitions.length) { return; }

        this.noteAdd(this.definitions[index], link.dataset.mode);
    }

    onNoteView(e) {
        e.preventDefault();
        const link = e.currentTarget;
        apiNoteView(link.dataset.noteId);
    }

    onKeyDown(e) {
        const key = DOM.getKeyFromEvent(e);
        const handler = this._onKeyDownHandlers.get(key);
        if (typeof handler === 'function') {
            if (handler(e)) {
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
        if (e.altKey) { return; }
        const delta = -e.deltaX || e.deltaY;
        if (delta > 0) {
            this.sourceTermView();
            e.preventDefault();
            e.stopPropagation();
        } else if (delta < 0) {
            this.nextTermView();
            e.preventDefault();
            e.stopPropagation();
        }
    }

    getOptionsContext() {
        return this.optionsContext;
    }

    async updateOptions() {
        this.options = await apiOptionsGet(this.getOptionsContext());
        this.updateDocumentOptions(this.options);
        this.updateTheme(this.options.general.popupTheme);
        this.setCustomCss(this.options.general.customPopupCss);
    }

    updateDocumentOptions(options) {
        const data = document.documentElement.dataset;
        data.ankiEnabled = `${options.anki.enable}`;
        data.audioEnabled = `${options.audio.enabled}`;
        data.compactGlossaries = `${options.general.compactGlossaries}`;
        data.enableSearchTags = `${options.scanning.enableSearchTags}`;
        data.showPitchAccentDownstepNotation = `${options.general.showPitchAccentDownstepNotation}`;
        data.showPitchAccentPositionNotation = `${options.general.showPitchAccentPositionNotation}`;
        data.showPitchAccentGraph = `${options.general.showPitchAccentGraph}`;
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
            const actionPrevious = document.querySelector('.action-previous');
            const actionNext = document.querySelector('.action-next');
            // const navigationHeader = document.querySelector('.navigation-header');

            this.persistentEventListeners.addEventListener(document, 'keydown', this.onKeyDown.bind(this), false);
            this.persistentEventListeners.addEventListener(document, 'wheel', this.onWheel.bind(this), {passive: false});
            if (actionPrevious !== null) {
                this.persistentEventListeners.addEventListener(actionPrevious, 'click', this.onSourceTermView.bind(this));
            }
            if (actionNext !== null) {
                this.persistentEventListeners.addEventListener(actionNext, 'click', this.onNextTermView.bind(this));
            }
            // temporarily disabled
            // if (navigationHeader !== null) {
            //     this.persistentEventListeners.addEventListener(navigationHeader, 'wheel', this.onHistoryWheel.bind(this), {passive: false});
            // }
        } else {
            this.persistentEventListeners.removeAllEventListeners();
        }
        this.setEventListenersActive(this.eventListenersActive);
    }

    setEventListenersActive(active) {
        active = !!active && this.interactive;
        if (this.eventListenersActive === active) { return; }
        this.eventListenersActive = active;

        if (active) {
            this.addMultipleEventListeners('.action-add-note', 'click', this.onNoteAdd.bind(this));
            this.addMultipleEventListeners('.action-view-note', 'click', this.onNoteView.bind(this));
            this.addMultipleEventListeners('.action-play-audio', 'click', this.onAudioPlay.bind(this));
            this.addMultipleEventListeners('.kanji-link', 'click', this.onKanjiLookup.bind(this));
            if (this.options.scanning.enablePopupSearch) {
                this.addMultipleEventListeners('.term-glossary-item, .tag', 'mouseup', this.onGlossaryMouseUp.bind(this));
                this.addMultipleEventListeners('.term-glossary-item, .tag', 'mousedown', this.onGlossaryMouseDown.bind(this));
                this.addMultipleEventListeners('.term-glossary-item, .tag', 'mousemove', this.onGlossaryMouseMove.bind(this));
            }
        } else {
            this.eventListeners.removeAllEventListeners();
        }
    }

    addMultipleEventListeners(selector, type, listener, options) {
        for (const node of this.container.querySelectorAll(selector)) {
            this.eventListeners.addEventListener(node, type, listener, options);
        }
    }

    async setContent(type, details) {
        const token = {}; // Unique identifier token
        this.setContentToken = token;
        try {
            this.mediaLoader.unloadAll();

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

        this.setEventListenersActive(false);

        if (context.focus !== false) {
            window.focus();
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

        const states = await this.getDefinitionsAddable(definitions, ['term-kanji', 'term-kana']);
        if (this.setContentToken !== token) { return; }

        this.updateAdderButtons(states);
    }

    async setContentKanji(definitions, context, token) {
        if (!context) { throw new Error('Context expected'); }

        this.setEventListenersActive(false);

        if (context.focus !== false) {
            window.focus();
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
                await promiseTimeout(1);
                if (this.setContentToken !== token) { return; }
            }

            const entry = this.displayGenerator.createKanjiEntry(definitions[i]);
            container.appendChild(entry);
        }

        const {index, scroll} = context;
        this.entryScrollIntoView(index || 0, scroll);

        this.setEventListenersActive(true);

        const states = await this.getDefinitionsAddable(definitions, ['kanji']);
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
        if (this.definitions.length === 0) { return; }

        this.audioPlay(this.definitions[0], this.firstExpressionIndex, 0);
    }

    updateAdderButtons(states) {
        for (let i = 0; i < states.length; ++i) {
            let noteId = null;
            for (const [mode, info] of Object.entries(states[i])) {
                const button = this.adderButtonFind(i, mode);
                if (button === null) {
                    continue;
                }

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
        const index = this.index;
        if (index < 0 || index >= this.definitions.length) { return; }

        const button = this.adderButtonFind(index, mode);
        if (button !== null && !button.classList.contains('disabled')) {
            this.noteAdd(this.definitions[index], mode);
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

            const details = {};
            if (this.noteUsesScreenshot(mode)) {
                const screenshot = await this.getScreenshot();
                if (screenshot) {
                    details.screenshot = screenshot;
                }
            }

            const context = await this._getNoteContext();
            const noteId = await apiDefinitionAdd(definition, mode, context, details, this.getOptionsContext());
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

            this._stopPlayingAudio();

            let audio, info;
            try {
                const {sources, textToSpeechVoice, customSourceUrl} = this.options.audio;
                let index;
                ({audio, index} = await this.audioSystem.getDefinitionAudio(expression, sources, {textToSpeechVoice, customSourceUrl}));
                info = `From source ${1 + index}: ${sources[index]}`;
            } catch (e) {
                if (this.audioFallback === null) {
                    this.audioFallback = new Audio('/mixed/mp3/button.mp3');
                }
                audio = this.audioFallback;
                info = 'Could not find audio';
            }

            const button = this.audioButtonFindImage(entryIndex, expressionIndex);
            if (button !== null) {
                let titleDefault = button.dataset.titleDefault;
                if (!titleDefault) {
                    titleDefault = button.title || '';
                    button.dataset.titleDefault = titleDefault;
                }
                button.title = `${titleDefault}\n${info}`;
            }

            this._stopPlayingAudio();

            this.audioPlaying = audio;
            audio.currentTime = 0;
            audio.volume = this.options.audio.volume / 100.0;
            const playPromise = audio.play();
            if (typeof playPromise !== 'undefined') {
                try {
                    await playPromise;
                } catch (e2) {
                    // NOP
                }
            }
        } catch (e) {
            this.onError(e);
        } finally {
            this.setSpinnerVisible(false);
        }
    }

    _stopPlayingAudio() {
        if (this.audioPlaying !== null) {
            this.audioPlaying.pause();
            this.audioPlaying = null;
        }
    }

    noteUsesScreenshot(mode) {
        const optionsAnki = this.options.anki;
        const fields = (mode === 'kanji' ? optionsAnki.kanji : optionsAnki.terms).fields;
        for (const fieldValue of Object.values(fields)) {
            if (fieldValue.includes('{screenshot}')) {
                return true;
            }
        }
        return false;
    }

    async getScreenshot() {
        try {
            await this.setPopupVisibleOverride(false);
            await promiseTimeout(1); // Wait for popup to be hidden.

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
        return apiBroadcastTab('popupSetVisibleOverride', {visible});
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

    audioButtonFindImage(index, expressionIndex) {
        const entry = this.getEntry(index);
        if (entry === null) { return null; }

        const container = (
            expressionIndex >= 0 ?
            entry.querySelector(`.term-expression:nth-of-type(${expressionIndex + 1})`) :
            entry
        );
        return container !== null ? container.querySelector('.action-play-audio>img') : null;
    }

    async getDefinitionsAddable(definitions, modes) {
        try {
            const context = await this._getNoteContext();
            return await apiDefinitionsAddable(definitions, modes, context, this.getOptionsContext());
        } catch (e) {
            return [];
        }
    }

    async getDocumentTitle() {
        return document.title;
    }

    static indexOf(nodeList, node) {
        for (let i = 0, ii = nodeList.length; i < ii; ++i) {
            if (nodeList[i] === node) {
                return i;
            }
        }
        return -1;
    }

    static getElementTop(element) {
        const elementRect = element.getBoundingClientRect();
        const documentRect = document.documentElement.getBoundingClientRect();
        return elementRect.top - documentRect.top;
    }

    async _getNoteContext() {
        const documentTitle = await this.getDocumentTitle();
        return {
            document: {
                title: documentTitle
            }
        };
    }
}
