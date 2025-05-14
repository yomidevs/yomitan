/*
 * Copyright (C) 2023-2025  Yomitan Authors
 * Copyright (C) 2021-2022  Yomichan Authors
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

import {EventListenerCollection} from '../core/event-listener-collection.js';
import {log} from '../core/log.js';
import {toError} from '../core/to-error.js';
import {deferPromise} from '../core/utilities.js';
import {AnkiNoteBuilder} from '../data/anki-note-builder.js';
import {getDynamicTemplates} from '../data/anki-template-util.js';
import {INVALID_NOTE_ID, isNoteDataValid} from '../data/anki-util.js';
import {PopupMenu} from '../dom/popup-menu.js';
import {querySelectorNotNull} from '../dom/query-selector.js';
import {TemplateRendererProxy} from '../templates/template-renderer-proxy.js';

export class DisplayAnki {
    /**
     * @param {import('./display.js').Display} display
     * @param {import('./display-audio.js').DisplayAudio} displayAudio
     */
    constructor(display, displayAudio) {
        /** @type {import('./display.js').Display} */
        this._display = display;
        /** @type {import('./display-audio.js').DisplayAudio} */
        this._displayAudio = displayAudio;
        /** @type {?string} */
        this._ankiFieldTemplates = null;
        /** @type {?string} */
        this._ankiFieldTemplatesDefault = null;
        /** @type {AnkiNoteBuilder} */
        this._ankiNoteBuilder = new AnkiNoteBuilder(display.application.api, new TemplateRendererProxy());
        /** @type {?import('./display-notification.js').DisplayNotification} */
        this._errorNotification = null;
        /** @type {?EventListenerCollection} */
        this._errorNotificationEventListeners = null;
        /** @type {?import('./display-notification.js').DisplayNotification} */
        this._tagsNotification = null;
        /** @type {?import('./display-notification.js').DisplayNotification} */
        this._flagsNotification = null;
        /** @type {?Promise<void>} */
        this._updateSaveButtonsPromise = null;
        /** @type {?import('core').TokenObject} */
        this._updateDictionaryEntryDetailsToken = null;
        /** @type {EventListenerCollection} */
        this._eventListeners = new EventListenerCollection();
        /** @type {?import('display-anki').DictionaryEntryDetails[]} */
        this._dictionaryEntryDetails = null;
        /** @type {?import('anki-templates-internal').Context} */
        this._noteContext = null;
        /** @type {boolean} */
        this._checkForDuplicates = false;
        /** @type {boolean} */
        this._suspendNewCards = false;
        /** @type {boolean} */
        this._compactTags = false;
        /** @type {import('settings').ResultOutputMode} */
        this._resultOutputMode = 'split';
        /** @type {import('settings').GlossaryLayoutMode} */
        this._glossaryLayoutMode = 'default';
        /** @type {import('settings').AnkiDisplayTagsAndFlags} */
        this._displayTagsAndFlags = 'never';
        /** @type {import('settings').AnkiDuplicateScope} */
        this._duplicateScope = 'collection';
        /** @type {boolean} */
        this._duplicateScopeCheckAllModels = false;
        /** @type {import('settings').AnkiDuplicateBehavior} */
        this._duplicateBehavior = 'new';
        /** @type {import('settings').AnkiScreenshotFormat} */
        this._screenshotFormat = 'png';
        /** @type {number} */
        this._screenshotQuality = 100;
        /** @type {number} */
        this._scanLength = 10;
        /** @type {import('settings').AnkiNoteGuiMode} */
        this._noteGuiMode = 'browse';
        /** @type {?number} */
        this._audioDownloadIdleTimeout = null;
        /** @type {string[]} */
        this._noteTags = [];
        /** @type {import('settings').AnkiCardFormat[]} */
        this._cardFormats = [];
        /** @type {import('settings').DictionariesOptions} */
        this._dictionaries = [];
        /** @type {HTMLElement} */
        this._menuContainer = querySelectorNotNull(document, '#popup-menus');
        /** @type {(event: MouseEvent) => void} */
        this._onShowTagsBind = this._onShowTags.bind(this);
        /** @type {(event: MouseEvent) => void} */
        this._onShowFlagsBind = this._onShowFlags.bind(this);
        /** @type {(event: MouseEvent) => void} */
        this._onNoteSaveBind = this._onNoteSave.bind(this);
        /** @type {(event: MouseEvent) => void} */
        this._onViewNotesButtonClickBind = this._onViewNotesButtonClick.bind(this);
        /** @type {(event: MouseEvent) => void} */
        this._onViewNotesButtonContextMenuBind = this._onViewNotesButtonContextMenu.bind(this);
        /** @type {(event: import('popup-menu').MenuCloseEvent) => void} */
        this._onViewNotesButtonMenuCloseBind = this._onViewNotesButtonMenuClose.bind(this);
    }

    /** */
    prepare() {
        this._noteContext = this._getNoteContext();
        /* eslint-disable @stylistic/no-multi-spaces */
        this._display.hotkeyHandler.registerActions([
            ['addNote',     this._hotkeySaveAnkiNoteForSelectedEntry.bind(this)],
            ['viewNotes',   this._hotkeyViewNotesForSelectedEntry.bind(this)],
        ]);
        /* eslint-enable @stylistic/no-multi-spaces */
        this._display.on('optionsUpdated', this._onOptionsUpdated.bind(this));
        this._display.on('contentClear', this._onContentClear.bind(this));
        this._display.on('contentUpdateStart', this._onContentUpdateStart.bind(this));
        this._display.on('contentUpdateComplete', this._onContentUpdateComplete.bind(this));
        this._display.on('logDictionaryEntryData', this._onLogDictionaryEntryData.bind(this));
    }

    /**
     * @param {import('dictionary').DictionaryEntry} dictionaryEntry
     * @returns {Promise<import('display-anki').LogData>}
     */
    async getLogData(dictionaryEntry) {
        // Anki note data
        let ankiNoteData;
        let ankiNoteDataException;
        try {
            if (this._noteContext === null) { throw new Error('Note context not initialized'); }
            ankiNoteData = await this._ankiNoteBuilder.getRenderingData({
                dictionaryEntry,
                cardFormat: this._cardFormats[0],
                context: this._noteContext,
                resultOutputMode: this._resultOutputMode,
                glossaryLayoutMode: this._glossaryLayoutMode,
                compactTags: this._compactTags,
                marker: 'test',
                dictionaryStylesMap: this._ankiNoteBuilder.getDictionaryStylesMap(this._dictionaries),
            });
        } catch (e) {
            ankiNoteDataException = e;
        }

        // Anki notes
        /** @type {import('display-anki').AnkiNoteLogData[]} */
        const ankiNotes = [];
        for (const [cardFormatIndex] of this._cardFormats.entries()) {
            let note;
            let errors;
            let requirements;
            try {
                ({note: note, errors, requirements} = await this._createNote(dictionaryEntry, cardFormatIndex, []));
            } catch (e) {
                errors = [toError(e)];
            }
            /** @type {import('display-anki').AnkiNoteLogData} */
            const entry = {cardFormatIndex, note};
            if (Array.isArray(errors) && errors.length > 0) {
                entry.errors = errors;
            }
            if (Array.isArray(requirements) && requirements.length > 0) {
                entry.requirements = requirements;
            }
            ankiNotes.push(entry);
        }

        return {
            ankiNoteData,
            ankiNoteDataException: toError(ankiNoteDataException),
            ankiNotes,
        };
    }

    // Private

    /**
     * @param {import('display').EventArgument<'optionsUpdated'>} details
     */
    _onOptionsUpdated({options}) {
        const {
            general: {
                resultOutputMode,
                glossaryLayoutMode,
                compactTags,
            },
            dictionaries,
            anki: {
                tags,
                duplicateScope,
                duplicateScopeCheckAllModels,
                duplicateBehavior,
                suspendNewCards,
                checkForDuplicates,
                displayTagsAndFlags,
                cardFormats,
                noteGuiMode,
                screenshot: {format, quality},
                downloadTimeout,
            },
            scanning: {length: scanLength},
        } = options;

        this._checkForDuplicates = checkForDuplicates;
        this._suspendNewCards = suspendNewCards;
        this._compactTags = compactTags;
        this._resultOutputMode = resultOutputMode;
        this._glossaryLayoutMode = glossaryLayoutMode;
        this._displayTagsAndFlags = displayTagsAndFlags;
        this._duplicateScope = duplicateScope;
        this._duplicateScopeCheckAllModels = duplicateScopeCheckAllModels;
        this._duplicateBehavior = duplicateBehavior;
        this._screenshotFormat = format;
        this._screenshotQuality = quality;
        this._scanLength = scanLength;
        this._noteGuiMode = noteGuiMode;
        this._noteTags = [...tags];
        this._audioDownloadIdleTimeout = (Number.isFinite(downloadTimeout) && downloadTimeout > 0 ? downloadTimeout : null);
        this._cardFormats = cardFormats;
        this._dictionaries = dictionaries;

        void this._updateAnkiFieldTemplates(options);
    }

    /** */
    _onContentClear() {
        this._updateDictionaryEntryDetailsToken = null;
        this._dictionaryEntryDetails = null;
        this._hideErrorNotification(false);
        this._eventListeners.removeAllEventListeners();
    }

    /** */
    _onContentUpdateStart() {
        this._noteContext = this._getNoteContext();
    }

    /** */
    _onContentUpdateComplete() {
        void this._updateDictionaryEntryDetails();
    }

    /**
     * @param {import('display').EventArgument<'logDictionaryEntryData'>} details
     */
    _onLogDictionaryEntryData({dictionaryEntry, promises}) {
        promises.push(this.getLogData(dictionaryEntry));
    }

    /**
     * @param {MouseEvent} e
     * @throws {Error}
     */
    _onNoteSave(e) {
        e.preventDefault();
        const element = /** @type {HTMLElement} */ (e.currentTarget);
        const cardFormatIndex = element.dataset.cardFormatIndex;
        if (!cardFormatIndex || !Number.isInteger(Number.parseInt(cardFormatIndex, 10))) {
            throw new Error(`Invalid note options index: ${cardFormatIndex}`);
        }
        const index = this._display.getElementDictionaryEntryIndex(element);
        void this._saveAnkiNote(index, Number.parseInt(cardFormatIndex, 10));
    }

    /**
     * @param {MouseEvent} e
     */
    _onShowTags(e) {
        e.preventDefault();
        const element = /** @type {HTMLElement} */ (e.currentTarget);
        const tags = element.title;
        this._showTagsNotification(tags);
    }

    /**
     * @param {MouseEvent} e
     */
    _onShowFlags(e) {
        e.preventDefault();
        const element = /** @type {HTMLElement} */ (e.currentTarget);
        const flags = element.title;
        this._showFlagsNotification(flags);
    }

    /**
     * @param {number} index
     * @param {number} cardFormatIndex
     * @returns {?HTMLButtonElement}
     */
    _createSaveButtons(index, cardFormatIndex) {
        const entry = this._getEntry(index);
        if (entry === null) { return null; }

        const container = entry.querySelector('.note-actions-container');
        if (container === null) { return null; }

        // Create button from template
        const singleNoteActionButtons = /** @type {HTMLElement} */ (this._display.displayGenerator.instantiateTemplate('action-button-container'));
        /** @type {HTMLButtonElement} */
        const saveButton = querySelectorNotNull(singleNoteActionButtons, '.action-button');
        /** @type {HTMLElement} */
        const iconSpan = querySelectorNotNull(saveButton, '.action-icon');
        // Set button properties
        const cardFormat = this._cardFormats[cardFormatIndex];
        singleNoteActionButtons.dataset.cardFormatIndex = cardFormatIndex.toString();
        saveButton.title = `Add ${cardFormat.name} note`;
        saveButton.dataset.cardFormatIndex = cardFormatIndex.toString();
        iconSpan.dataset.icon = cardFormat.icon;

        const saveButtonIndex = container.children.length;
        if ([0, 1].includes(saveButtonIndex)) {
            saveButton.dataset.hotkey = `["addNote${saveButtonIndex + 1}","title","Add ${cardFormat.name} note"]`;
            // eslint-disable-next-line no-underscore-dangle
            this._display._hotkeyHelpController.setHotkeyLabel(saveButton, `Add ${cardFormat.name} note ({0})`);
        } else {
            delete saveButton.dataset.hotkey;
        }
        // Add event listeners
        this._eventListeners.addEventListener(saveButton, 'click', this._onNoteSaveBind);

        // Add button to container
        container.appendChild(singleNoteActionButtons);

        return saveButton;
    }


    /**
     * @param {number} index
     * @returns {?HTMLElement}
     */
    _getEntry(index) {
        const entries = this._display.dictionaryEntryNodes;
        return index >= 0 && index < entries.length ? entries[index] : null;
    }

    /**
     * @returns {?import('anki-templates-internal').Context}
     */
    _getNoteContext() {
        const {state} = this._display.history;
        let documentTitle, url, sentence;
        if (typeof state === 'object' && state !== null) {
            ({documentTitle, url, sentence} = state);
        }
        if (typeof documentTitle !== 'string') {
            documentTitle = document.title;
        }
        if (typeof url !== 'string') {
            url = window.location.href;
        }
        const {query, fullQuery, queryOffset} = this._display;
        sentence = this._getValidSentenceData(sentence, fullQuery, queryOffset);
        return {
            url,
            sentence,
            documentTitle,
            query,
            fullQuery,
        };
    }

    /** */
    async _updateDictionaryEntryDetails() {
        if (!this._display.getOptions()?.anki.enable) { return; }
        const {dictionaryEntries} = this._display;
        /** @type {?import('core').TokenObject} */
        const token = {};
        this._updateDictionaryEntryDetailsToken = token;
        if (this._updateSaveButtonsPromise !== null) {
            await this._updateSaveButtonsPromise;
        }
        if (this._updateDictionaryEntryDetailsToken !== token) { return; }

        const {promise, resolve} = /** @type {import('core').DeferredPromiseDetails<void>} */ (deferPromise());
        try {
            this._updateSaveButtonsPromise = promise;
            const dictionaryEntryDetails = await this._getDictionaryEntryDetails(dictionaryEntries);
            if (this._updateDictionaryEntryDetailsToken !== token) { return; }
            this._dictionaryEntryDetails = dictionaryEntryDetails;
            this._updateSaveButtons(dictionaryEntryDetails);
            // eslint-disable-next-line no-underscore-dangle
            this._display._hotkeyHelpController.setupNode(document.documentElement);
        } finally {
            resolve();
            if (this._updateSaveButtonsPromise === promise) {
                this._updateSaveButtonsPromise = null;
            }
        }
    }

    /**
     * @param {HTMLButtonElement} button
     * @param {number[]} noteIds
     * @throws {Error}
     */
    _updateSaveButtonForDuplicateBehavior(button, noteIds) {
        const behavior = this._duplicateBehavior;
        if (behavior === 'prevent') {
            button.disabled = true;
            return;
        }

        const cardFormatIndex = button.dataset.cardFormatIndex;
        if (typeof cardFormatIndex === 'undefined') { throw new Error('Invalid note options index'); }
        const cardFormatIndexNumber = Number.parseInt(cardFormatIndex, 10);
        if (Number.isNaN(cardFormatIndexNumber)) { throw new Error('Invalid note options index'); }
        const cardFormat = this._cardFormats[cardFormatIndexNumber];

        const verb = behavior === 'overwrite' ? 'Overwrite' : 'Add duplicate';
        const iconPrefix = behavior === 'overwrite' ? 'overwrite' : 'add-duplicate';
        const target = `${cardFormat.name} note`;

        if (behavior === 'overwrite') {
            button.dataset.overwrite = 'true';
            if (!noteIds.some((id) => id !== INVALID_NOTE_ID)) {
                button.disabled = true;
            }
        } else {
            delete button.dataset.overwrite;
        }

        const title = `${verb} ${target}`;
        button.setAttribute('title', title);

        // eslint-disable-next-line no-underscore-dangle
        const hotkeyLabel = this._display._hotkeyHelpController.getHotkeyLabel(button);
        if (hotkeyLabel) {
            // eslint-disable-next-line no-underscore-dangle
            this._display._hotkeyHelpController.setHotkeyLabel(button, `${title} ({0})`); // {0} is a placeholder that gets replaced with the actual hotkey combination. For example, "Add expression (Ctrl+1)" or "Overwrite reading (Ctrl+2)"
        }

        const actionIcon = button.querySelector('.action-icon');
        if (actionIcon instanceof HTMLElement) {
            actionIcon.dataset.icon = `${iconPrefix}-${cardFormat.icon}`;
        }
    }

    /**
     * @param {import('display-anki').DictionaryEntryDetails[]} dictionaryEntryDetails
     */
    _updateSaveButtons(dictionaryEntryDetails) {
        const displayTagsAndFlags = this._displayTagsAndFlags;
        for (let entryIndex = 0, entryCount = dictionaryEntryDetails.length; entryIndex < entryCount; ++entryIndex) {
            for (const [cardFormatIndex, {canAdd, noteIds, noteInfos, ankiError}] of dictionaryEntryDetails[entryIndex].noteMap.entries()) {
                const button = this._createSaveButtons(entryIndex, cardFormatIndex);
                if (button !== null) {
                    button.disabled = !canAdd;
                    button.hidden = (ankiError !== null);
                    if (ankiError && ankiError.message !== 'Anki not connected') {
                        log.error(ankiError);
                    }

                    // If entry has noteIds, show the "add duplicate" button.
                    if (Array.isArray(noteIds) && noteIds.length > 0) {
                        this._updateSaveButtonForDuplicateBehavior(button, noteIds);
                    }
                }

                const validNoteIds = noteIds?.filter((id) => id !== INVALID_NOTE_ID) ?? [];

                this._createViewNoteButton(entryIndex, cardFormatIndex, validNoteIds, Array.isArray(noteInfos) ? noteInfos : []);

                if (displayTagsAndFlags !== 'never' && Array.isArray(noteInfos)) {
                    this._setupTagsIndicator(entryIndex, cardFormatIndex, noteInfos);
                    this._setupFlagsIndicator(entryIndex, cardFormatIndex, noteInfos);
                }
            }
        }
    }

    /**
     * @param {number} i
     * @param {number} cardFormatIndex
     * @param {(?import('anki').NoteInfo)[]} noteInfos
     */
    _setupTagsIndicator(i, cardFormatIndex, noteInfos) {
        const entry = this._getEntry(i);
        if (entry === null) { return; }

        const container = entry.querySelector(`[data-card-format-index="${cardFormatIndex}"]`);
        if (container === null) { return; }

        const tagsIndicator = /** @type {HTMLButtonElement} */ (this._display.displayGenerator.instantiateTemplate('note-action-button-view-tags'));
        if (tagsIndicator === null) { return; }

        const displayTags = new Set();
        for (const item of noteInfos) {
            if (item === null) { continue; }
            for (const tag of item.tags) {
                displayTags.add(tag);
            }
        }
        if (this._displayTagsAndFlags === 'non-standard') {
            for (const tag of this._noteTags) {
                displayTags.delete(tag);
            }
        }

        if (displayTags.size > 0) {
            tagsIndicator.disabled = false;
            tagsIndicator.hidden = false;
            tagsIndicator.title = `Card tags: ${[...displayTags].join(', ')}`;
            tagsIndicator.addEventListener('click', this._onShowTagsBind);
            container.appendChild(tagsIndicator);
        }
    }

    /**
     * @param {number} i
     * @param {number} cardFormatIndex
     * @param {(?import('anki').NoteInfo)[]} noteInfos
     */
    _setupFlagsIndicator(i, cardFormatIndex, noteInfos) {
        const entry = this._getEntry(i);
        if (entry === null) { return; }

        const container = entry.querySelector(`[data-card-format-index="${cardFormatIndex}"]`);
        if (container === null) { return; }

        const flagsIndicator = /** @type {HTMLButtonElement} */ (this._display.displayGenerator.instantiateTemplate('note-action-button-view-flags'));
        if (flagsIndicator === null) { return; }

        /** @type {Set<string>} */
        const displayFlags = new Set();
        for (const item of noteInfos) {
            if (item === null) { continue; }
            for (const cardInfo of item.cardsInfo) {
                if (cardInfo.flags !== 0) {
                    displayFlags.add(this._getFlagName(cardInfo.flags));
                }
            }
        }

        if (displayFlags.size > 0) {
            flagsIndicator.disabled = false;
            flagsIndicator.hidden = false;
            flagsIndicator.title = `Card flags: ${[...displayFlags].join(', ')}`;
            /** @type {HTMLElement | null} */
            const flagsIndicatorIcon = flagsIndicator.querySelector('.action-icon');
            if (flagsIndicatorIcon !== null && flagsIndicator instanceof HTMLElement) {
                flagsIndicatorIcon.style.background = this._getFlagColor(displayFlags);
            }
            flagsIndicator.addEventListener('click', this._onShowFlagsBind);
            container.appendChild(flagsIndicator);
        }
    }

    /**
     * @param {string} message
     */
    _showTagsNotification(message) {
        if (this._tagsNotification === null) {
            this._tagsNotification = this._display.createNotification(true);
        }

        this._tagsNotification.setContent(message);
        this._tagsNotification.open();
    }

    /**
     * @param {string} message
     */
    _showFlagsNotification(message) {
        if (this._flagsNotification === null) {
            this._flagsNotification = this._display.createNotification(true);
        }

        this._flagsNotification.setContent(message);
        this._flagsNotification.open();
    }

    /**
     * @param {unknown} cardFormatStringIndex
     */
    _hotkeySaveAnkiNoteForSelectedEntry(cardFormatStringIndex) {
        if (typeof cardFormatStringIndex !== 'string') { return; }
        const cardFormatIndex = Number.parseInt(cardFormatStringIndex, 10);
        if (Number.isNaN(cardFormatIndex)) { return; }
        const index = this._display.selectedIndex;
        const entry = this._getEntry(index);
        if (entry === null) { return; }
        const container = entry.querySelector('.note-actions-container');
        if (container === null) { return; }
        /** @type {HTMLButtonElement | null} */
        const nthButton = container.querySelector(`.action-button[data-action=save-note][data-card-format-index="${cardFormatIndex}"]`);
        if (nthButton === null) { return; }
        void this._saveAnkiNote(index, cardFormatIndex);
    }

    /**
     * @param {number} dictionaryEntryIndex
     * @param {number} cardFormatIndex
     */
    async _saveAnkiNote(dictionaryEntryIndex, cardFormatIndex) {
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
        const details = dictionaryEntryDetails[dictionaryEntryIndex].noteMap.get(cardFormatIndex);
        if (typeof details === 'undefined') { return; }

        const {requirements} = details;

        const button = this._saveButtonFind(dictionaryEntryIndex, cardFormatIndex);
        if (button === null || button.disabled) { return; }

        this._hideErrorNotification(true);

        /** @type {Error[]} */
        const allErrors = [];
        const progressIndicatorVisible = this._display.progressIndicatorVisible;
        const overrideToken = progressIndicatorVisible.setOverride(true);
        try {
            const {note, errors, requirements: outputRequirements} = await this._createNote(dictionaryEntry, cardFormatIndex, requirements);
            allErrors.push(...errors);

            const error = this._getAddNoteRequirementsError(requirements, outputRequirements);
            if (error !== null) { allErrors.push(error); }
            if (button.dataset.overwrite) {
                const overwrittenNote = await this._getOverwrittenNote(note, dictionaryEntryIndex, cardFormatIndex);
                await this._updateAnkiNote(overwrittenNote, allErrors);
            } else {
                await this._addNewAnkiNote(note, allErrors, button, dictionaryEntryIndex);
            }
        } catch (e) {
            allErrors.push(toError(e));
        } finally {
            progressIndicatorVisible.clearOverride(overrideToken);
        }

        if (allErrors.length > 0) {
            this._showErrorNotification(allErrors);
        } else {
            this._hideErrorNotification(true);
        }
    }

    /**
     * @param {number} dictionaryEntryIndex
     * @param {number} cardFormatIndex
     * @returns {?HTMLButtonElement}
     */
    _saveButtonFind(dictionaryEntryIndex, cardFormatIndex) {
        const entry = this._getEntry(dictionaryEntryIndex);
        if (entry === null) { return null; }
        const container = entry.querySelector('.note-actions-container');
        if (container === null) { return null; }
        const singleNoteActionButtonContainer = container.querySelector(`[data-card-format-index="${cardFormatIndex}"]`);
        if (singleNoteActionButtonContainer === null) { return null; }
        return singleNoteActionButtonContainer.querySelector('.action-button[data-action=save-note]');
    }

    /**
     * @param {import('anki').Note} note
     * @param {number} dictionaryEntryIndex
     * @param {number} cardFormatIndex
     * @returns {Promise<import('anki').NoteWithId | null>}
     */
    async _getOverwrittenNote(note, dictionaryEntryIndex, cardFormatIndex) {
        const dictionaryEntries = this._display.dictionaryEntries;
        const allEntryDetails = await this._getDictionaryEntryDetails(dictionaryEntries);
        const relevantEntryDetails = allEntryDetails[dictionaryEntryIndex];
        const relevantNoteDetails = relevantEntryDetails.noteMap.get(cardFormatIndex);
        if (typeof relevantNoteDetails === 'undefined') { return null; }
        const {noteIds, noteInfos} = relevantNoteDetails;
        if (noteIds === null || typeof noteInfos === 'undefined') { return null; }
        const overwriteId = noteIds.find((id) => id !== INVALID_NOTE_ID);
        if (typeof overwriteId === 'undefined') { return null; }
        const overwriteInfo = noteInfos.find((info) => info !== null && info.noteId === overwriteId);
        if (!overwriteInfo) { return null; }
        const existingFields = overwriteInfo.fields;
        const fieldOptions = this._cardFormats[cardFormatIndex].fields;
        if (!fieldOptions) { return null; }

        const newValues = note.fields;

        /** @type {import('anki').NoteFields} */
        const noteFields = {};
        for (const [field, newValue] of Object.entries(newValues)) {
            const overwriteMode = fieldOptions[field].overwriteMode;
            const existingValue = existingFields[field].value;
            noteFields[field] = this._getOverwrittenField(existingValue, newValue, overwriteMode);
        }
        return {
            ...note,
            fields: noteFields,
            id: overwriteId,
        };
    }

    /**
     * @param {string} existingValue
     * @param {string} newValue
     * @param {import('settings').AnkiNoteFieldOverwriteMode} overwriteMode
     * @returns {string}
     */
    _getOverwrittenField(existingValue, newValue, overwriteMode) {
        switch (overwriteMode) {
            case 'overwrite':
                return newValue;
            case 'skip':
                return existingValue;
            case 'append':
                return existingValue + newValue;
            case 'prepend':
                return newValue + existingValue;
            case 'coalesce':
                return existingValue || newValue;
            case 'coalesce-new':
                return newValue || existingValue;
        }
    }

    /**
     * @param {import('anki').Note} note
     * @param {Error[]} allErrors
     * @param {HTMLButtonElement} button
     * @param {number} dictionaryEntryIndex
     */
    async _addNewAnkiNote(note, allErrors, button, dictionaryEntryIndex) {
        let noteId = null;
        let addNoteOkay = false;
        try {
            noteId = await this._display.application.api.addAnkiNote(note);
            addNoteOkay = true;
        } catch (e) {
            allErrors.length = 0;
            allErrors.push(toError(e));
        }

        if (addNoteOkay) {
            if (noteId === null) {
                allErrors.push(new Error('Note could not be added'));
            } else {
                if (this._suspendNewCards) {
                    try {
                        await this._display.application.api.suspendAnkiCardsForNote(noteId);
                    } catch (e) {
                        allErrors.push(toError(e));
                    }
                }
                const cardFormatIndex = this._getCardFormatIndex(button);

                this._updateSaveButtonForDuplicateBehavior(button, [noteId]);

                this._updateViewNoteButton(dictionaryEntryIndex, cardFormatIndex, [noteId]);
            }
        }
    }

    /**
     * @param {HTMLButtonElement} button
     * @returns {number}
     * @throws {Error}
     */
    _getCardFormatIndex(button) {
        const cardFormatIndex = button.dataset.cardFormatIndex;
        if (typeof cardFormatIndex === 'undefined') { throw new Error('Invalid card format index'); }
        const cardFormatIndexNumber = Number.parseInt(cardFormatIndex, 10);
        if (Number.isNaN(cardFormatIndexNumber)) { throw new Error('Invalid card format index'); }
        return cardFormatIndexNumber;
    }

    /**
     * @param {number} dictionaryEntryIndex
     * @param {number} cardFormatIndex
     * @param {number[]} noteIds
     */
    _updateViewNoteButton(dictionaryEntryIndex, cardFormatIndex, noteIds) {
        const entry = this._getEntry(dictionaryEntryIndex);
        if (entry === null) { return; }
        const singleNoteActions = entry.querySelector(`[data-card-format-index="${cardFormatIndex}"]`);
        if (singleNoteActions === null) { return; }
        /** @type {HTMLButtonElement | null} */
        let viewNoteButton = singleNoteActions.querySelector('.action-button[data-action=view-note]');
        if (viewNoteButton === null) {
            viewNoteButton = this._createViewNoteButton(dictionaryEntryIndex, cardFormatIndex, noteIds, []);
        }
        if (viewNoteButton === null) { return; }
        const newNoteIds = new Set([...this._getNodeNoteIds(viewNoteButton), ...noteIds]);
        viewNoteButton.dataset.noteIds = [...newNoteIds].join(' ');
        this._setViewButtonBadge(viewNoteButton);
        viewNoteButton.hidden = false;
    }

    /**
     * @param {import('anki').NoteWithId | null} noteWithId
     * @param {Error[]} allErrors
     */
    async _updateAnkiNote(noteWithId, allErrors) {
        if (noteWithId === null) { return; }

        try {
            await this._display.application.api.updateAnkiNote(noteWithId);
        } catch (e) {
            allErrors.length = 0;
            allErrors.push(toError(e));
        }
    }

    /**
     * @param {import('anki-note-builder').Requirement[]} requirements
     * @param {import('anki-note-builder').Requirement[]} outputRequirements
     * @returns {?DisplayAnkiError}
     */
    _getAddNoteRequirementsError(requirements, outputRequirements) {
        if (outputRequirements.length === 0) { return null; }

        let count = 0;
        for (const requirement of outputRequirements) {
            const {type} = requirement;
            switch (type) {
                case 'audio':
                case 'clipboardImage':
                    break;
                default:
                    ++count;
                    break;
            }
        }
        if (count === 0) { return null; }

        const error = new DisplayAnkiError('The created card may not have some content');
        error.requirements = requirements;
        error.outputRequirements = outputRequirements;
        return error;
    }

    /**
     * @param {Error[]} errors
     * @param {(DocumentFragment|Node|Error)[]} [displayErrors]
     */
    _showErrorNotification(errors, displayErrors) {
        if (typeof displayErrors === 'undefined') { displayErrors = errors; }

        if (this._errorNotificationEventListeners !== null) {
            this._errorNotificationEventListeners.removeAllEventListeners();
        }

        if (this._errorNotification === null) {
            this._errorNotification = this._display.createNotification(false);
            this._errorNotificationEventListeners = new EventListenerCollection();
        }

        const content = this._display.displayGenerator.createAnkiNoteErrorsNotificationContent(displayErrors);
        for (const node of content.querySelectorAll('.anki-note-error-log-link')) {
            /** @type {EventListenerCollection} */ (this._errorNotificationEventListeners).addEventListener(node, 'click', () => {
                log.log({ankiNoteErrors: errors});
            }, false);
        }

        this._errorNotification.setContent(content);
        this._errorNotification.open();
    }

    /**
     * @param {boolean} animate
     */
    _hideErrorNotification(animate) {
        if (this._errorNotification === null) { return; }
        this._errorNotification.close(animate);
        /** @type {EventListenerCollection} */ (this._errorNotificationEventListeners).removeAllEventListeners();
    }

    /**
     * @param {import('settings').ProfileOptions} options
     */
    async _updateAnkiFieldTemplates(options) {
        this._ankiFieldTemplates = await this._getAnkiFieldTemplates(options);
    }

    /**
     * @param {import('settings').ProfileOptions} options
     * @returns {Promise<string>}
     */
    async _getAnkiFieldTemplates(options) {
        const dictionaryInfo = await this._display.application.api.getDictionaryInfo();
        const staticTemplates = await this._getStaticAnkiFieldTemplates(options);
        const dynamicTemplates = getDynamicTemplates(options, dictionaryInfo);
        return staticTemplates + dynamicTemplates;
    }

    /**
     * @param {import('settings').ProfileOptions} options
     * @returns {Promise<string>}
     */
    async _getStaticAnkiFieldTemplates(options) {
        let templates = options.anki.fieldTemplates;
        if (typeof templates === 'string') { return templates; }

        templates = this._ankiFieldTemplatesDefault;
        if (typeof templates === 'string') { return templates; }

        templates = await this._display.application.api.getDefaultAnkiFieldTemplates();
        this._ankiFieldTemplatesDefault = templates;
        return templates;
    }

    /**
     * Checks whether fetching additional information (e.g. tags and flags, or overwrite) is enabled
     * based on the current instance's display settings and duplicate handling behavior.
     * @returns {boolean} - True if additional info fetching is enabled, false otherwise.
     */
    _isAdditionalInfoEnabled() {
        return this._displayTagsAndFlags !== 'never' || this._duplicateBehavior === 'overwrite';
    }

    /**
     * @param {import('dictionary').DictionaryEntry[]} dictionaryEntries
     * @returns {Promise<import('display-anki').DictionaryEntryDetails[]>}
     */
    async _getDictionaryEntryDetails(dictionaryEntries) {
        const notePromises = [];
        const noteTargets = [];
        for (let i = 0, ii = dictionaryEntries.length; i < ii; ++i) {
            const dictionaryEntry = dictionaryEntries[i];
            const {type} = dictionaryEntry;
            for (const [cardFormatIndex, cardFormat] of this._cardFormats.entries()) {
                if (cardFormat.type !== type) { continue; }
                const notePromise = this._createNote(dictionaryEntry, cardFormatIndex, []);
                notePromises.push(notePromise);
                noteTargets.push({index: i, cardFormatIndex, cardFormat});
            }
        }

        const noteInfoList = await Promise.all(notePromises);
        const notes = noteInfoList.map(({note}) => note);

        let infos;
        let ankiError = null;
        try {
            if (!await this._display.application.api.isAnkiConnected()) {
                throw new Error('Anki not connected');
            }

            infos = this._checkForDuplicates ?
                await this._display.application.api.getAnkiNoteInfo(notes, this._isAdditionalInfoEnabled()) :
                this._getAnkiNoteInfoForceValueIfValid(notes, true);
        } catch (e) {
            infos = this._getAnkiNoteInfoForceValueIfValid(notes, false);
            ankiError = toError(e);
        }

        /** @type {import('display-anki').DictionaryEntryDetails[]} */
        const results = new Array(dictionaryEntries.length).fill(null).map(() => ({noteMap: new Map()}));

        for (let i = 0, ii = noteInfoList.length; i < ii; ++i) {
            const {note, errors, requirements} = noteInfoList[i];
            const {canAdd, valid, noteIds, noteInfos} = infos[i];
            const {cardFormatIndex, cardFormat, index} = noteTargets[i];
            results[index].noteMap.set(cardFormatIndex, {cardFormat, note, errors, requirements, canAdd, valid, noteIds, noteInfos, ankiError});
        }
        return results;
    }

    /**
     * @param {import('anki').Note[]} notes
     * @param {boolean} canAdd
     * @returns {import('anki').NoteInfoWrapper[]}
     */
    _getAnkiNoteInfoForceValueIfValid(notes, canAdd) {
        const results = [];
        for (const note of notes) {
            const valid = isNoteDataValid(note);
            results.push({canAdd: (valid ? canAdd : valid), valid, noteIds: null});
        }
        return results;
    }

    /**
     * @param {import('dictionary').DictionaryEntry} dictionaryEntry
     * @param {number} cardFormatIndex
     * @param {import('anki-note-builder').Requirement[]} requirements
     * @returns {Promise<import('display-anki').CreateNoteResult>}
     */
    async _createNote(dictionaryEntry, cardFormatIndex, requirements) {
        const context = this._noteContext;
        if (context === null) { throw new Error('Note context not initialized'); }
        const cardFormat = this._cardFormats?.[cardFormatIndex];
        if (typeof cardFormat === 'undefined') { throw new Error('Unsupported note type}'); }
        if (!this._ankiFieldTemplates) {
            const options = this._display.getOptions();
            if (options) {
                await this._updateAnkiFieldTemplates(options);
            }
        }
        const template = this._ankiFieldTemplates;
        if (typeof template !== 'string') { throw new Error('Invalid template'); }
        const contentOrigin = this._display.getContentOrigin();
        const details = this._ankiNoteBuilder.getDictionaryEntryDetailsForNote(dictionaryEntry);
        const audioDetails = this._getAnkiNoteMediaAudioDetails(details);
        const optionsContext = this._display.getOptionsContext();
        const dictionaryStylesMap = this._ankiNoteBuilder.getDictionaryStylesMap(this._dictionaries);

        const {note, errors, requirements: outputRequirements} = await this._ankiNoteBuilder.createNote({
            dictionaryEntry,
            cardFormat,
            context,
            template,
            tags: this._noteTags,
            duplicateScope: this._duplicateScope,
            duplicateScopeCheckAllModels: this._duplicateScopeCheckAllModels,
            resultOutputMode: this._resultOutputMode,
            glossaryLayoutMode: this._glossaryLayoutMode,
            compactTags: this._compactTags,
            mediaOptions: {
                audio: audioDetails,
                screenshot: {
                    format: this._screenshotFormat,
                    quality: this._screenshotQuality,
                    contentOrigin,
                },
                textParsing: {
                    optionsContext,
                    scanLength: this._scanLength,
                },
            },
            requirements,
            dictionaryStylesMap,
        });
        return {note, errors, requirements: outputRequirements};
    }

    /**
     * @param {unknown} sentence
     * @param {string} fallback
     * @param {number} fallbackOffset
     * @returns {import('anki-templates-internal').ContextSentence}
     */
    _getValidSentenceData(sentence, fallback, fallbackOffset) {
        let text;
        let offset;
        if (typeof sentence === 'object' && sentence !== null) {
            ({text, offset} = /** @type {import('core').UnknownObject} */ (sentence));
        }
        if (typeof text !== 'string') {
            text = fallback;
            offset = fallbackOffset;
        } else {
            if (typeof offset !== 'number') { offset = 0; }
        }
        return {text, offset};
    }

    /**
     * @param {import('api').InjectAnkiNoteMediaDefinitionDetails} details
     * @returns {?import('anki-note-builder').AudioMediaOptions}
     */
    _getAnkiNoteMediaAudioDetails(details) {
        if (details.type !== 'term') { return null; }
        const {sources, preferredAudioIndex} = this._displayAudio.getAnkiNoteMediaAudioDetails(details.term, details.reading);
        const languageSummary = this._display.getLanguageSummary();
        return {
            sources,
            preferredAudioIndex,
            idleTimeout: this._audioDownloadIdleTimeout,
            languageSummary,
        };
    }

    // View note functions

    /**
     * @param {MouseEvent} e
     */
    _onViewNotesButtonClick(e) {
        const element = /** @type {HTMLElement} */ (e.currentTarget);
        e.preventDefault();
        if (e.shiftKey) {
            this._showViewNotesMenu(element);
        } else {
            void this._viewNotes(element);
        }
    }

    /**
     * @param {MouseEvent} e
     */
    _onViewNotesButtonContextMenu(e) {
        const element = /** @type {HTMLElement} */ (e.currentTarget);
        e.preventDefault();
        this._showViewNotesMenu(element);
    }

    /**
     * @param {import('popup-menu').MenuCloseEvent} e
     */
    _onViewNotesButtonMenuClose(e) {
        const {detail: {action, item}} = e;
        switch (action) {
            case 'viewNotes':
                if (item !== null) {
                    void this._viewNotes(item);
                }
                break;
        }
    }

    /**
     * @param {number} index
     * @param {number} cardFormatIndex
     * @param {number[]} noteIds
     * @param {(?import('anki').NoteInfo)[]} noteInfos
     * @returns {?HTMLButtonElement}
     */
    _createViewNoteButton(index, cardFormatIndex, noteIds, noteInfos) {
        if (noteIds.length === 0) { return null; }
        let viewNoteButton = /** @type {HTMLButtonElement} */ (this._display.displayGenerator.instantiateTemplate('note-action-button-view-note'));
        if (viewNoteButton === null) { return null; }
        const disabled = (noteIds.length === 0);
        viewNoteButton.disabled = disabled;
        viewNoteButton.hidden = disabled;
        viewNoteButton.dataset.noteIds = noteIds.join(' ');

        viewNoteButton = this._setViewNoteButtonCardState(noteInfos, viewNoteButton);

        this._setViewButtonBadge(viewNoteButton);

        const entry = this._getEntry(index);
        if (entry === null) { return null; }

        const container = entry.querySelector('.note-actions-container');
        if (container === null) { return null; }
        const singleNoteActionButtonContainer = container.querySelector(`[data-card-format-index="${cardFormatIndex}"]`);
        if (singleNoteActionButtonContainer === null) { return null; }
        singleNoteActionButtonContainer.appendChild(viewNoteButton);

        this._eventListeners.addEventListener(viewNoteButton, 'click', this._onViewNotesButtonClickBind);
        this._eventListeners.addEventListener(viewNoteButton, 'contextmenu', this._onViewNotesButtonContextMenuBind);
        this._eventListeners.addEventListener(viewNoteButton, 'menuClose', this._onViewNotesButtonMenuCloseBind);

        return viewNoteButton;
    }

    /**
     * @param {(?import('anki').NoteInfo)[]} noteInfos
     * @param {HTMLButtonElement} viewNoteButton
     * @returns {HTMLButtonElement}
     */
    _setViewNoteButtonCardState(noteInfos, viewNoteButton) {
        if (this._isAdditionalInfoEnabled() === false || noteInfos.length === 0) { return viewNoteButton; }

        const cardStates = [];
        for (const item of noteInfos) {
            if (item === null) { continue; }
            for (const cardInfo of item.cardsInfo) {
                cardStates.push(cardInfo.cardState);
            }
        }

        const highestState = this._getHighestPriorityCardState(cardStates);
        const dataIcon = /** @type {HTMLElement} */ (viewNoteButton.querySelector('.icon[data-icon^="view-note"]'));
        dataIcon.dataset.icon = highestState !== 'new' ? `view-note-${highestState}` : 'view-note';

        const label = `View added note (${highestState})`;
        viewNoteButton.title = label;
        viewNoteButton.dataset.hotkey = JSON.stringify(['viewNotes', 'title', `${label} ({0})`]);
        return viewNoteButton;
    }

    /**
     * @param {HTMLButtonElement} viewNoteButton
     */
    _setViewButtonBadge(viewNoteButton) {
        /** @type {?HTMLElement} */
        const badge = viewNoteButton.querySelector('.action-button-badge');
        const noteIds = this._getNodeNoteIds(viewNoteButton);
        if (badge !== null) {
            const badgeData = badge.dataset;
            if (noteIds.length > 1) {
                badgeData.icon = 'plus-thick';
                badge.hidden = false;
            } else {
                delete badgeData.icon;
                badge.hidden = true;
            }
        }
    }

    /**
     * @param {HTMLElement} node
     */
    async _viewNotes(node) {
        const noteIds = this._getNodeNoteIds(node);
        if (noteIds.length === 0) { return; }
        try {
            await this._display.application.api.viewNotes(noteIds, this._noteGuiMode, false);
        } catch (e) {
            const displayErrors = (
                toError(e).message === 'Mode not supported' ?
                [this._display.displayGenerator.instantiateTemplateFragment('footer-notification-anki-view-note-error')] :
                void 0
            );
            this._showErrorNotification([toError(e)], displayErrors);
            return;
        }
    }

    /**
     * @param {HTMLElement} node
     */
    _showViewNotesMenu(node) {
        const noteIds = this._getNodeNoteIds(node);
        if (noteIds.length === 0) { return; }

        /** @type {HTMLElement} */
        const menuContainerNode = this._display.displayGenerator.instantiateTemplate('view-note-button-popup-menu');
        /** @type {HTMLElement} */
        const menuBodyNode = querySelectorNotNull(menuContainerNode, '.popup-menu-body');

        for (let i = 0, ii = noteIds.length; i < ii; ++i) {
            const noteId = noteIds[i];
            /** @type {HTMLElement} */
            const item = this._display.displayGenerator.instantiateTemplate('view-note-button-popup-menu-item');
            /** @type {Element} */
            const label = querySelectorNotNull(item, '.popup-menu-item-label');
            label.textContent = `Note ${i + 1}: ${noteId}`;
            item.dataset.menuAction = 'viewNotes';
            item.dataset.noteIds = `${noteId}`;
            menuBodyNode.appendChild(item);
        }

        this._menuContainer.appendChild(menuContainerNode);
        const popupMenu = new PopupMenu(node, menuContainerNode);
        popupMenu.prepare();
    }

    /**
     * @param {HTMLElement} node
     * @returns {number[]}
     */
    _getNodeNoteIds(node) {
        const {noteIds} = node.dataset;
        const results = [];
        if (typeof noteIds === 'string' && noteIds.length > 0) {
            for (const noteId of noteIds.split(' ')) {
                const noteIdInt = Number.parseInt(noteId, 10);
                if (Number.isFinite(noteIdInt)) {
                    results.push(noteIdInt);
                }
            }
        }
        return results;
    }

    /**
     * @param {number} index
     * @returns {?HTMLButtonElement}
     */
    _getViewNoteButton(index) {
        const entry = this._getEntry(index);
        return entry !== null ? entry.querySelector('.action-button[data-action=view-note]') : null;
    }

    /**
     * @param {unknown} cardFormatStringIndex
     */
    _hotkeyViewNotesForSelectedEntry(cardFormatStringIndex) {
        if (typeof cardFormatStringIndex !== 'string') { return; }
        const cardFormatIndex = Number.parseInt(cardFormatStringIndex, 10);
        if (Number.isNaN(cardFormatIndex)) { return; }
        const index = this._display.selectedIndex;
        const entry = this._getEntry(index);
        if (entry === null) { return; }
        const container = entry.querySelector('.note-actions-container');
        if (container === null) { return; }
        /** @type {HTMLButtonElement | null} */
        const nthButton = container.querySelector(`.action-button-container[data-card-format-index="${cardFormatIndex}"] .action-button[data-action=view-note]`);
        if (nthButton === null) { return; }
        void this._viewNotes(nthButton);
    }

    /**
     * @param {number} flag
     * @returns {string}
     */
    _getFlagName(flag) {
        /** @type {Record<number, string>} */
        const flagNamesDict = {
            1: 'Red',
            2: 'Orange',
            3: 'Green',
            4: 'Blue',
            5: 'Pink',
            6: 'Turquoise',
            7: 'Purple',
        };
        if (flag in flagNamesDict) {
            return flagNamesDict[flag];
        }
        return '';
    }

    /**
     * @param {Set<string>} flags
     * @returns {string}
     */
    _getFlagColor(flags) {
        /** @type {Record<string, import('display-anki').RGB>} */
        const flagColorsDict = {
            Red: {red: 248, green: 113, blue: 113},
            Orange: {red: 253, green: 186, blue: 116},
            Green: {red: 134, green: 239, blue: 172},
            Blue: {red: 96, green: 165, blue: 250},
            Pink: {red: 240, green: 171, blue: 252},
            Turquoise: {red: 94, green: 234, blue: 212},
            Purple: {red: 192, green: 132, blue: 252},
        };

        const gradientSliceSize = 100 / flags.size;
        let currentGradientPercent = 0;

        const gradientSlices = [];
        for (const flag of flags) {
            const flagColor = flagColorsDict[flag];
            gradientSlices.push(
                'rgb(' + flagColor.red + ',' + flagColor.green + ',' + flagColor.blue + ') ' + currentGradientPercent + '%',
                'rgb(' + flagColor.red + ',' + flagColor.green + ',' + flagColor.blue + ') ' + (currentGradientPercent + gradientSliceSize) + '%',
            );
            currentGradientPercent += gradientSliceSize;
        }

        return 'linear-gradient(to right,' + gradientSlices.join(',') + ')';
    }

    /**
     * Get the highest priority state from a list of Anki queue states.
     * Source: https://github.com/ankidroid/Anki-Android/wiki/Database-Structure#cards
     *
     * Priority order:
     *   - -3, -2 → "buried"
     *   - -1 → "suspended"
     *   -  2 → "review"
     *   -  1, 3 → "learning"
     *   -  0 → "new" (default fallback)
     * @param {number[]} cardStates Array of queue state integers.
     * @returns {"buried" | "suspended" | "review" | "learning" | "new" } - The highest priority state found.
     */
    _getHighestPriorityCardState(cardStates) {
        if (cardStates.includes(-3) || cardStates.includes(-2)) {
            return 'buried';
        }
        if (cardStates.includes(-1)) {
            return 'suspended';
        }
        if (cardStates.includes(2)) {
            return 'review';
        }
        if (cardStates.includes(1) || cardStates.includes(3)) {
            return 'learning';
        }
        return 'new';
    }
}

class DisplayAnkiError extends Error {
    /**
     * @param {string} message
     */
    constructor(message) {
        super(message);
        /** @type {string} */
        this.name = 'DisplayAnkiError';
        /** @type {?import('anki-note-builder').Requirement[]} */
        this._requirements = null;
        /** @type {?import('anki-note-builder').Requirement[]} */
        this._outputRequirements = null;
    }

    /** @type {?import('anki-note-builder').Requirement[]} */
    get requirements() { return this._requirements; }
    set requirements(value) { this._requirements = value; }

    /** @type {?import('anki-note-builder').Requirement[]} */
    get outputRequirements() { return this._outputRequirements; }
    set outputRequirements(value) { this._outputRequirements = value; }
}
