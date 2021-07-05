/*
 * Copyright (C) 2021  Yomichan Authors
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
 * AnkiNoteBuilder
 * AnkiUtil
 * DisplayNotification
 */

class DisplayAnki {
    constructor(display) {
        this._display = display;
        this._ankiFieldTemplates = null;
        this._ankiFieldTemplatesDefault = null;
        this._ankiNoteBuilder = new AnkiNoteBuilder();
        this._ankiNoteNotification = null;
        this._ankiNoteNotificationEventListeners = null;
        this._ankiTagNotification = null;
        this._updateAdderButtonsPromise = Promise.resolve();
        this._updateDictionaryEntryDetailsToken = null;
        this._eventListeners = new EventListenerCollection();
        this._dictionaryEntryDetails = null;
        this._noteContext = null;
        this._checkForDuplicates = false;
        this._suspendNewCards = false;
        this._compactTags = false;
        this._resultOutputMode = 'split';
        this._glossaryLayoutMode = 'default';
        this._displayTags = 'never';
        this._duplicateScope = 'collection';
        this._screenshotFormat = 'png';
        this._screenshotQuality = 100;
        this._noteTags = [];
        this._modeOptions = new Map();
        this._dictionaryEntryTypeModeMap = new Map([
            ['kanji', ['kanji']],
            ['term', ['term-kanji', 'term-kana']]
        ]);
        this._onShowTagsBind = this._onShowTags.bind(this);
        this._onNoteAddBind = this._onNoteAdd.bind(this);
        this._onNoteViewBind = this._onNoteView.bind(this);
    }

    prepare() {
        this._noteContext = this._getNoteContext();
        this._display.hotkeyHandler.registerActions([
            ['addNoteKanji',      () => { this._tryAddAnkiNoteForSelectedEntry('kanji'); }],
            ['addNoteTermKanji',  () => { this._tryAddAnkiNoteForSelectedEntry('term-kanji'); }],
            ['addNoteTermKana',   () => { this._tryAddAnkiNoteForSelectedEntry('term-kana'); }],
            ['viewNote',          () => { this._tryViewAnkiNoteForSelectedEntry(); }]
        ]);
        this._display.on('optionsUpdated', this._onOptionsUpdated.bind(this));
    }

    cleanupEntries() {
        this._updateDictionaryEntryDetailsToken = null;
        this._dictionaryEntryDetails = null;
        this._hideAnkiNoteErrors(false);
    }

    setupEntriesBegin() {
        this._noteContext = this._getNoteContext();
    }

    setupEntry(entry) {
        this._addMultipleEventListeners(entry, '.action-view-tags', 'click', this._onShowTagsBind);
        this._addMultipleEventListeners(entry, '.action-add-note', 'click', this._onNoteAddBind);
        this._addMultipleEventListeners(entry, '.action-view-note', 'click', this._onNoteViewBind);
    }

    setupEntriesComplete() {
        this._updateDictionaryEntryDetails();
    }

    async getLogData(dictionaryEntry) {
        const result = {};

        // Anki note data
        let ankiNoteData;
        let ankiNoteDataException;
        try {
            ankiNoteData = await this._ankiNoteBuilder.getRenderingData({
                dictionaryEntry,
                mode: 'test',
                context: this._noteContext,
                resultOutputMode: this.resultOutputMode,
                glossaryLayoutMode: this._glossaryLayoutMode,
                compactTags: this._compactTags,
                injectedMedia: null,
                marker: 'test'
            });
        } catch (e) {
            ankiNoteDataException = e;
        }
        result.ankiNoteData = ankiNoteData;
        if (typeof ankiNoteDataException !== 'undefined') {
            result.ankiNoteDataException = ankiNoteDataException;
        }

        // Anki notes
        const ankiNotes = [];
        const modes = this._getModes(dictionaryEntry.type === 'term');
        for (const mode of modes) {
            let note;
            let errors;
            let requirements;
            try {
                ({note: note, errors, requirements} = await this._createNote(dictionaryEntry, mode, false, []));
            } catch (e) {
                errors = [e];
            }
            const entry = {mode, note};
            if (Array.isArray(errors) && errors.length > 0) {
                entry.errors = errors;
            }
            if (Array.isArray(requirements) && requirements.length > 0) {
                entry.requirements = requirements;
            }
            ankiNotes.push(entry);
        }
        result.ankiNotes = ankiNotes;

        return result;
    }

    // Private

    _onOptionsUpdated({options}) {
        const {
            general: {resultOutputMode, glossaryLayoutMode, compactTags},
            anki: {tags, duplicateScope, suspendNewCards, checkForDuplicates, displayTags, kanji, terms, screenshot: {format, quality}}
        } = options;

        this._checkForDuplicates = checkForDuplicates;
        this._suspendNewCards = suspendNewCards;
        this._compactTags = compactTags;
        this._resultOutputMode = resultOutputMode;
        this._glossaryLayoutMode = glossaryLayoutMode;
        this._displayTags = displayTags;
        this._duplicateScope = duplicateScope;
        this._screenshotFormat = format;
        this._screenshotQuality = quality;
        this._noteTags = [...tags];
        this._modeOptions.clear();
        this._modeOptions.set('kanji', kanji);
        this._modeOptions.set('term-kanji', terms);
        this._modeOptions.set('term-kana', terms);

        this._updateAnkiFieldTemplates(options);
    }

    _onNoteAdd(e) {
        e.preventDefault();
        const node = e.currentTarget;
        const index = this._display.getElementDictionaryEntryIndex(node);
        this._addAnkiNote(index, node.dataset.mode);
    }

    _onShowTags(e) {
        e.preventDefault();
        const tags = e.currentTarget.title;
        this._showAnkiTagsNotification(tags);
    }

    _onNoteView(e) {
        e.preventDefault();
        const link = e.currentTarget;
        yomichan.api.noteView(link.dataset.noteId);
    }

    _addMultipleEventListeners(container, selector, ...args) {
        for (const node of container.querySelectorAll(selector)) {
            this._eventListeners.addEventListener(node, ...args);
        }
    }

    _adderButtonFind(index, mode) {
        const entry = this._getEntry(index);
        return entry !== null ? entry.querySelector(`.action-add-note[data-mode="${mode}"]`) : null;
    }

    _tagsIndicatorFind(index) {
        const entry = this._getEntry(index);
        return entry !== null ? entry.querySelector('.action-view-tags') : null;
    }

    _viewerButtonFind(index) {
        const entry = this._getEntry(index);
        return entry !== null ? entry.querySelector('.action-view-note') : null;
    }

    _getEntry(index) {
        const entries = this._display.dictionaryEntryNodes;
        return index >= 0 && index < entries.length ? entries[index] : null;
    }

    _viewerButtonShow(index, noteId) {
        const viewerButton = this._viewerButtonFind(index);
        if (viewerButton === null) {
            return;
        }
        viewerButton.disabled = false;
        viewerButton.hidden = false;
        viewerButton.dataset.noteId = noteId;
    }

    _getNoteContext() {
        const {state} = this._display.history;
        let {documentTitle, url, sentence} = (isObject(state) ? state : {});
        if (typeof documentTitle !== 'string') {
            documentTitle = document.title;
        }
        if (typeof url !== 'string') {
            url = window.location.href;
        }
        sentence = this._getValidSentenceData(sentence);
        return {
            url,
            sentence,
            documentTitle,
            query: this._display.query,
            fullQuery: this._display.fullQuery
        };
    }

    _getDictionaryEntryDetailsForNote(dictionaryEntry) {
        const {type} = dictionaryEntry;
        if (type === 'kanji') {
            const {character} = dictionaryEntry;
            return {type, character};
        }

        const {headwords} = dictionaryEntry;
        let bestIndex = -1;
        for (let i = 0, ii = headwords.length; i < ii; ++i) {
            const {term, reading, sources} = headwords[i];
            for (const {deinflectedText} of sources) {
                if (term === deinflectedText) {
                    bestIndex = i;
                    i = ii;
                    break;
                } else if (reading === deinflectedText && bestIndex < 0) {
                    bestIndex = i;
                    break;
                }
            }
        }

        const {term, reading} = headwords[Math.max(0, bestIndex)];
        return {type, term, reading};
    }

    async _updateDictionaryEntryDetails() {
        const {dictionaryEntries} = this._display;
        const token = {};
        this._updateDictionaryEntryDetailsToken = token;
        if (this._updateAdderButtonsPromise !== null) {
            await this._updateAdderButtonsPromise;
        }
        if (this._updateDictionaryEntryDetailsToken !== token) { return; }

        const {promise, resolve} = deferPromise();
        try {
            this._updateAdderButtonsPromise = promise;
            const dictionaryEntryDetails = await this._getDictionaryEntryDetails(dictionaryEntries);
            if (this._updateDictionaryEntryDetailsToken !== token) { return; }
            this._dictionaryEntryDetails = dictionaryEntryDetails;
            this._updateAdderButtons();
        } finally {
            resolve();
            if (this._updateAdderButtonsPromise === promise) {
                this._updateAdderButtonsPromise = null;
            }
        }
    }

    _updateAdderButtons() {
        const displayTags = this._displayTags;
        const dictionaryEntryDetails = this._dictionaryEntryDetails;
        for (let i = 0, ii = dictionaryEntryDetails.length; i < ii; ++i) {
            let noteId = null;
            for (const {mode, canAdd, noteIds, noteInfos, ankiError} of dictionaryEntryDetails[i].modeMap.values()) {
                const button = this._adderButtonFind(i, mode);
                if (button !== null) {
                    button.disabled = !canAdd;
                    button.hidden = (ankiError !== null);
                }

                if (Array.isArray(noteIds) && noteIds.length > 0) {
                    noteId = noteIds[0];
                }

                if (displayTags !== 'never' && Array.isArray(noteInfos)) {
                    this._setupTagsIndicator(i, noteInfos);
                }
            }
            if (noteId !== null) {
                this._viewerButtonShow(i, noteId);
            }
        }
    }

    _setupTagsIndicator(i, noteInfos) {
        const tagsIndicator = this._tagsIndicatorFind(i);
        if (tagsIndicator === null) {
            return;
        }

        const displayTags = new Set();
        for (const {tags} of noteInfos) {
            for (const tag of tags) {
                displayTags.add(tag);
            }
        }
        if (this._displayTags === 'non-standard') {
            for (const tag of this._noteTags) {
                displayTags.delete(tag);
            }
        }

        if (displayTags.size > 0) {
            tagsIndicator.disabled = false;
            tagsIndicator.hidden = false;
            tagsIndicator.title = `Card tags: ${[...displayTags].join(', ')}`;
        }
    }

    _showAnkiTagsNotification(message) {
        if (this._ankiTagNotification === null) {
            const node = this._display.displayGenerator.createEmptyFooterNotification();
            node.classList.add('click-scannable');
            this._ankiTagNotification = new DisplayNotification(this._display.notificationContainer, node);
        }

        this._ankiTagNotification.setContent(message);
        this._ankiTagNotification.open();
    }


    _tryAddAnkiNoteForSelectedEntry(mode) {
        const index = this._display.selectedIndex;
        this._addAnkiNote(index, mode);
    }

    _tryViewAnkiNoteForSelectedEntry() {
        const index = this._display.selectedIndex;
        const button = this._viewerButtonFind(index);
        if (button !== null && !button.disabled) {
            yomichan.api.noteView(button.dataset.noteId);
        }
    }

    async _addAnkiNote(dictionaryEntryIndex, mode) {
        const dictionaryEntries = this._display.dictionaryEntries;
        const dictionaryEntryDetails = this._dictionaryEntryDetails;
        if (!(
            dictionaryEntryDetails !== null &&
            dictionaryEntryIndex >= 0 &&
            dictionaryEntryIndex < dictionaryEntries.length &&
            dictionaryEntryIndex < dictionaryEntryDetails.length
        )) {
            return;
        }
        const dictionaryEntry = dictionaryEntries[dictionaryEntryIndex];
        const details = dictionaryEntryDetails[dictionaryEntryIndex].modeMap.get(mode);
        if (typeof details === 'undefined') { return; }

        const {requirements} = details;

        const button = this._adderButtonFind(dictionaryEntryIndex, mode);
        if (button === null || button.disabled) { return; }

        this._hideAnkiNoteErrors(true);

        const allErrors = [];
        const progressIndicatorVisible = this._display.progressIndicatorVisible;
        const overrideToken = progressIndicatorVisible.setOverride(true);
        try {
            const {note, errors, requirements: outputRequirements} = await this._createNote(dictionaryEntry, mode, true, requirements);
            allErrors.push(...errors);

            if (outputRequirements.length > 0) {
                const error = new Error('The created card may not have some content');
                error.requirements = requirements;
                error.outputRequirements = outputRequirements;
                allErrors.push(error);
            }

            let noteId = null;
            let addNoteOkay = false;
            try {
                noteId = await yomichan.api.addAnkiNote(note);
                addNoteOkay = true;
            } catch (e) {
                allErrors.length = 0;
                allErrors.push(e);
            }

            if (addNoteOkay) {
                if (noteId === null) {
                    allErrors.push(new Error('Note could not be added'));
                } else {
                    if (this._suspendNewCards) {
                        try {
                            await yomichan.api.suspendAnkiCardsForNote(noteId);
                        } catch (e) {
                            allErrors.push(e);
                        }
                    }
                    button.disabled = true;
                    this._viewerButtonShow(dictionaryEntryIndex, noteId);
                }
            }
        } catch (e) {
            allErrors.push(e);
        } finally {
            progressIndicatorVisible.clearOverride(overrideToken);
        }

        if (allErrors.length > 0) {
            this._showAnkiNoteErrors(allErrors);
        } else {
            this._hideAnkiNoteErrors(true);
        }
    }

    _showAnkiNoteErrors(errors) {
        if (this._ankiNoteNotificationEventListeners !== null) {
            this._ankiNoteNotificationEventListeners.removeAllEventListeners();
        }

        if (this._ankiNoteNotification === null) {
            const node = this._display.displayGenerator.createEmptyFooterNotification();
            this._ankiNoteNotification = new DisplayNotification(this._display.notificationContainer, node);
            this._ankiNoteNotificationEventListeners = new EventListenerCollection();
        }

        const content = this._display.displayGenerator.createAnkiNoteErrorsNotificationContent(errors);
        for (const node of content.querySelectorAll('.anki-note-error-log-link')) {
            this._ankiNoteNotificationEventListeners.addEventListener(node, 'click', () => {
                console.log({ankiNoteErrors: errors});
            }, false);
        }

        this._ankiNoteNotification.setContent(content);
        this._ankiNoteNotification.open();
    }

    _hideAnkiNoteErrors(animate) {
        if (this._ankiNoteNotification === null) { return; }
        this._ankiNoteNotification.close(animate);
        this._ankiNoteNotificationEventListeners.removeAllEventListeners();
    }

    async _updateAnkiFieldTemplates(options) {
        this._ankiFieldTemplates = await this._getAnkiFieldTemplates(options);
    }

    async _getAnkiFieldTemplates(options) {
        let templates = options.anki.fieldTemplates;
        if (typeof templates === 'string') { return templates; }

        templates = this._ankiFieldTemplatesDefault;
        if (typeof templates === 'string') { return templates; }

        templates = await yomichan.api.getDefaultAnkiFieldTemplates();
        this._ankiFieldTemplatesDefault = templates;
        return templates;
    }

    async _getDictionaryEntryDetails(dictionaryEntries) {
        const forceCanAddValue = (this._checkForDuplicates ? null : true);
        const fetchAdditionalInfo = (this._displayTags !== 'never');

        const notePromises = [];
        const noteTargets = [];
        for (let i = 0, ii = dictionaryEntries.length; i < ii; ++i) {
            const dictionaryEntry = dictionaryEntries[i];
            const {type} = dictionaryEntry;
            const modes = this._dictionaryEntryTypeModeMap.get(type);
            if (typeof modes === 'undefined') { continue; }
            for (const mode of modes) {
                const notePromise = this._createNote(dictionaryEntry, mode, false, []);
                notePromises.push(notePromise);
                noteTargets.push({index: i, mode});
            }
        }

        const noteInfoList = await Promise.all(notePromises);
        const notes = noteInfoList.map(({note}) => note);

        let infos;
        let ankiError = null;
        try {
            if (forceCanAddValue !== null) {
                if (!await yomichan.api.isAnkiConnected()) {
                    throw new Error('Anki not connected');
                }
                infos = this._getAnkiNoteInfoForceValue(notes, forceCanAddValue);
            } else {
                infos = await yomichan.api.getAnkiNoteInfo(notes, fetchAdditionalInfo);
            }
        } catch (e) {
            infos = this._getAnkiNoteInfoForceValue(notes, false);
            ankiError = e;
        }

        const results = [];
        for (let i = 0, ii = dictionaryEntries.length; i < ii; ++i) {
            results.push({
                modeMap: new Map()
            });
        }

        for (let i = 0, ii = noteInfoList.length; i < ii; ++i) {
            const {note, errors, requirements} = noteInfoList[i];
            const {canAdd, valid, noteIds, noteInfos} = infos[i];
            const {mode, index} = noteTargets[i];
            results[index].modeMap.set(mode, {mode, note, errors, requirements, canAdd, valid, noteIds, noteInfos, ankiError});
        }
        return results;
    }

    _getAnkiNoteInfoForceValue(notes, canAdd) {
        const results = [];
        for (const note of notes) {
            const valid = AnkiUtil.isNoteDataValid(note);
            results.push({canAdd, valid, noteIds: null});
        }
        return results;
    }

    async _createNote(dictionaryEntry, mode, injectMedia, _requirements) {
        const context = this._noteContext;
        const modeOptions = this._modeOptions.get(mode);
        if (typeof modeOptions === 'undefined') { throw new Error(`Unsupported note type: ${mode}`); }
        const template = this._ankiFieldTemplates;
        const {deck: deckName, model: modelName} = modeOptions;
        const fields = Object.entries(modeOptions.fields);

        const errors = [];
        let injectedMedia = null;
        if (injectMedia) {
            let errors2;
            ({result: injectedMedia, errors: errors2} = await this._injectAnkiNoteMedia(dictionaryEntry, fields));
            for (const error of errors2) {
                errors.push(deserializeError(error));
            }
        }

        const {note, errors: createNoteErrors, requirements: outputRequirements} = await this._ankiNoteBuilder.createNote({
            dictionaryEntry,
            mode,
            context,
            template,
            deckName,
            modelName,
            fields,
            tags: this._noteTags,
            checkForDuplicates: this._checkForDuplicates,
            duplicateScope: this._duplicateScope,
            resultOutputMode: this.resultOutputMode,
            glossaryLayoutMode: this._glossaryLayoutMode,
            compactTags: this._compactTags,
            injectedMedia,
            errors
        });
        errors.push(...createNoteErrors);
        return {note, errors, requirements: outputRequirements};
    }

    async _injectAnkiNoteMedia(dictionaryEntry, fields) {
        const timestamp = Date.now();

        const dictionaryEntryDetails = this._getDictionaryEntryDetailsForNote(dictionaryEntry);

        const audioDetails = (
            dictionaryEntryDetails.type !== 'kanji' && AnkiUtil.fieldsObjectContainsMarker(fields, 'audio') ?
            this._display.getAnkiNoteMediaAudioDetails(dictionaryEntryDetails.term, dictionaryEntryDetails.reading) :
            null
        );

        const {tabId, frameId} = this._display.getContentOrigin();
        const screenshotDetails = (
            AnkiUtil.fieldsObjectContainsMarker(fields, 'screenshot') && typeof tabId === 'number' ?
            {tabId, frameId, format: this._screenshotFormat, quality: this._screenshotQuality} :
            null
        );

        const clipboardDetails = {
            image: AnkiUtil.fieldsObjectContainsMarker(fields, 'clipboard-image'),
            text: AnkiUtil.fieldsObjectContainsMarker(fields, 'clipboard-text')
        };

        return await yomichan.api.injectAnkiNoteMedia(
            timestamp,
            dictionaryEntryDetails,
            audioDetails,
            screenshotDetails,
            clipboardDetails
        );
    }

    _getModes(isTerms) {
        return isTerms ? ['term-kanji', 'term-kana'] : ['kanji'];
    }

    _getValidSentenceData(sentence) {
        let {text, offset} = (isObject(sentence) ? sentence : {});
        if (typeof text !== 'string') { text = ''; }
        if (typeof offset !== 'number') { offset = 0; }
        return {text, offset};
    }
}
