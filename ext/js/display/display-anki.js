/*
 * Copyright (C) 2023-2026  Yomitan Authors
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
import {ExtensionError} from '../core/extension-error.js';
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
        /** @type {import('core').TokenObject} */
        this._noteContextToken = {};
        /** @type {Set<import('display-anki').PendingNoteWrite>} */
        this._pendingNoteWrites = new Set();
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
        /** @type {string[]} */
        this._targetTags = [];
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
        /** @type {boolean} */
        this._forceSync = false;
        /** @type {boolean} */
        this.__noteDupeCheckFirst = false;
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
                targetTags,
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
                forceSync,
                noteDupeCheckFirst,
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
        this._targetTags = [...targetTags];
        this._audioDownloadIdleTimeout = (Number.isFinite(downloadTimeout) && downloadTimeout > 0 ? downloadTimeout : null);
        this._cardFormats = cardFormats;
        this._dictionaries = dictionaries;
        this._forceSync = forceSync;
        this._noteDupeCheckFirst = noteDupeCheckFirst;

        this._onContentClear();
        for (const entry of this._display.dictionaryEntryNodes) {
            entry.querySelector('.note-actions-container')?.replaceChildren();
        }
        this._ankiFieldTemplates = null;
        const token = this._noteContextToken;
        void this._updateAnkiFieldTemplates(options).then(() => {
            if (this._noteContextToken === token && this._display.dictionaryEntryNodes.length > 0) {
                void this._updateDictionaryEntryDetails();
            }
        });
    }

    /** */
    _onContentClear() {
        this._noteContextToken = {};
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
        const action = element.dataset.action;
        if (action !== 'add-note' && action !== 'update-note') { return; }
        void this._saveAnkiNote(index, Number.parseInt(cardFormatIndex, 10), action);
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
     * @returns {?HTMLElement}
     */
    _createSaveButtons(index, cardFormatIndex) {
        const entry = this._getEntry(index);
        if (entry === null) { return null; }

        const container = entry.querySelector('.note-actions-container');
        if (container === null) { return null; }

        const existing = container.querySelector(`[data-card-format-index="${cardFormatIndex}"]`);
        if (existing instanceof HTMLElement) { return existing; }

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

        const saveButtonIndex = container.querySelectorAll('.action-button-container').length;
        if ([0, 1].includes(saveButtonIndex)) {
            saveButton.dataset.hotkey = `["addNote${saveButtonIndex + 1}","title","Add ${cardFormat.name} note"]`;
            // eslint-disable-next-line no-underscore-dangle
            this._display._hotkeyHelpController.setHotkeyLabel(saveButton, `Add ${cardFormat.name} note ({0})`);
        } else {
            delete saveButton.dataset.hotkey;
        }
        /** @type {HTMLButtonElement} */
        const updateButton = querySelectorNotNull(singleNoteActionButtons, '.note-action-button-update');
        updateButton.dataset.cardFormatIndex = cardFormatIndex.toString();
        this._eventListeners.addEventListener(updateButton, 'click', this._onNoteSaveBind);
        // Add event listeners
        this._eventListeners.addEventListener(saveButton, 'click', this._onNoteSaveBind);

        // Add button to container
        container.appendChild(singleNoteActionButtons);

        return singleNoteActionButtons;
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

    /**
     * Checks if Anki has existing notes of the dictionary entries being displayed using
     * notes with only the first note field. Displays whether they are duplicates
     * or not in the pop up while the actual anki cards are being created.
     * --------------------------------------------------------------------
     * Please note that it will call "_displayWhetherDupeOrNotAndLoading" and pass an array of type NoteDupeMappings[]
     * in order to save on memory. Please see types\ext\display-anki.d.ts if you wish to edit this.
     * @param {import('dictionary').DictionaryEntry[]} dictionaryEntries
     * @param {import('core').TokenObject} token
     */
    async _quickDupeCheck(dictionaryEntries, token) {
        const isAnkiConnected = await this._display.application.api.isAnkiConnected();
        let ankiError = null;
        if (!isAnkiConnected) {
            ankiError = new Error('Anki is not connected');
            return;
        }
        const len = dictionaryEntries.length;
        const empty = /** @type {import('dictionary').DictionaryEntry} */ ({});
        const context = this._noteContext;
        if (context === null) { throw new Error('Note context not initialized'); }
        let template = this._ankiFieldTemplates;
        if (template === null) {
            const options = this._display.getOptions();
            if (options) {
                template = await this._updateAnkiFieldTemplates(options);
            }
        }
        if (this._updateDictionaryEntryDetailsToken !== token) { return; }
        if (typeof template !== 'string') { throw new Error('Invalid template'); }
        const skeletonNoteTemplates = [];
        for (const cardFormat of this._cardFormats.values()) {
            skeletonNoteTemplates.push(await this._ankiNoteBuilder.createNote(
                {dictionaryEntry: empty,
                    cardFormat: cardFormat,
                    template: template,
                    duplicateScope: this._duplicateScope,
                    duplicateScopeCheckAllModels: this._duplicateScopeCheckAllModels,
                    context: context,
                    tags: [],
                    requirements: [],
                    resultOutputMode: 'split',
                    glossaryLayoutMode: 'default',
                    compactTags: false,
                    mediaOptions: null,
                    dictionaryStylesMap: new Map()},
            ));
        }
        const notesToCheck = [];
        const noteTargets = [];
        try {
            for (let i = 0, ii = len; i < ii; ++i) {
                const {type} = dictionaryEntries[i];
                const details = this._ankiNoteBuilder.getDictionaryEntryDetailsForNote(dictionaryEntries[i]);
                for (const [cardFormatIndex, cardFormat] of this._cardFormats.entries()) {
                    if (cardFormat.type !== type) { continue; }
                    const skeleton = skeletonNoteTemplates[cardFormatIndex];
                    const fieldValue = details.type === 'kanji' ? details.character : details.term;
                    const firstFieldName = Object.keys(skeletonNoteTemplates[cardFormatIndex].note.fields)[0];
                    const skeletonNoteCardCopy = {
                        ...skeleton,
                        note: {
                            ...skeleton.note,
                            deckName: cardFormat.deck,
                            modelName: cardFormat.model,
                            fields: {
                                ...skeleton.note.fields,
                                [firstFieldName]: fieldValue,
                            },
                        },
                    };
                    notesToCheck.push(skeletonNoteCardCopy);
                    noteTargets.push({index: i, cardFormatIndex, cardFormat});
                }//
            }
        } catch (e) {
            ankiError = (e instanceof ExtensionError && e.message.includes('Anki connection failure')) ?
                new Error('Anki not connected') :
                toError(e);
            return;
        }
        let infos;
        try {
            infos = await this._display.application.api.getAnkiNoteInfo(notesToCheck.map((note) => note.note), this._isAdditionalInfoEnabled());
        } catch (e) {
            ankiError = new Error('Anki not connected');
            return;
        }
        /** @type {import('display-anki').NoteDupeMappings[]} */
        const results = new Array(dictionaryEntries.length).fill(null).map(() => ({noteMap: new Map()}));
        const notesLength = notesToCheck.length;
        for (let i = 0, ii = notesLength; i < ii; ++i) {
            const {noteIds} = infos[i];
            const {cardFormatIndex, cardFormat, index} = noteTargets[i];
            results[index].noteMap.set(cardFormatIndex, {cardFormat, noteIds, ankiError});
        }
        if (this._updateDictionaryEntryDetailsToken !== token) { return; }
        this._displayWhetherDupeOrNotAndLoading(results);
        // eslint-disable-next-line no-underscore-dangle
        this._display._hotkeyHelpController.setupNode(document.documentElement);
    }

    /**
     * Where the add buttons and view note buttons are, put temporary indicators showing if there
     * is already an Anki note for the term or not
     * @param {import('display-anki').NoteDupeMappings[]} dictionaryEntryDetails
     */
    _displayWhetherDupeOrNotAndLoading(dictionaryEntryDetails) {
        for (let entryIndex = 0, entryCount = dictionaryEntryDetails.length; entryIndex < entryCount; ++entryIndex) {
            for (const [cardFormatIndex, {noteIds, cardFormat}] of dictionaryEntryDetails[entryIndex].noteMap.entries()) {
                const entry = this._getEntry(entryIndex);
                if (entry === null) { continue; }
                const container = entry.querySelector('.note-actions-container');
                if (container === null) { continue; }
                /** @type {HTMLButtonElement} */
                const button = document.createElement('button');
                button.className = ('action-button duplicate-indicator');
                button.type = 'button';
                button.dataset.cardFormatIndex = cardFormatIndex.toString();
                button.disabled = true;
                button.style.opacity = '50%';
                button.title = 'Creating Anki notes...';
                const imgSpan = document.createElement('span');
                imgSpan.className = ('action-icon icon color-icon');
                imgSpan.dataset.icon = cardFormat.icon;
                if (this._duplicateBehavior === 'prevent') {
                    imgSpan.dataset.icon = cardFormat.icon;
                } else if (Array.isArray(noteIds) && noteIds.length > 0) {
                    const iconPrefix = this._duplicateBehavior === 'overwrite' ? 'overwrite' : 'add-duplicate';
                    imgSpan.dataset.icon = `${iconPrefix}-${cardFormat.icon}`;
                }
                button.append(imgSpan);
                const group = document.createElement('div');
                group.className = 'action-button-container duplicate-indicator';
                group.dataset.duplicateBehavior = this._duplicateBehavior;
                group.append(button);
                container.append(group);
                if (this._duplicateBehavior === 'new-and-overwrite' && noteIds !== null && noteIds.length > 0) {
                    const updateButton = /** @type {HTMLButtonElement} */ (button.cloneNode(true));
                    /** @type {HTMLElement} */
                    const updateIcon = querySelectorNotNull(updateButton, '.action-icon');
                    updateIcon.dataset.icon = `overwrite-${cardFormat.icon}`;
                    group.append(updateButton);
                }
            }
        }
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
            if (this._checkForDuplicates === true && this._noteDupeCheckFirst === true) {
                try {
                    await this._quickDupeCheck(dictionaryEntries, token);
                } catch (error) {
                    log.error(error);
                }
            }
            if (this._updateDictionaryEntryDetailsToken !== token) { return; }
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
     * @param {string} title
     * @param {string} icon
     */
    _setSaveButtonLabel(button, title, icon) {
        button.title = title;
        // eslint-disable-next-line no-underscore-dangle
        if (this._display._hotkeyHelpController.getHotkeyLabel(button)) {
            // eslint-disable-next-line no-underscore-dangle
            this._display._hotkeyHelpController.setHotkeyLabel(button, `${title} ({0})`);
        }
        /** @type {HTMLElement} */
        const actionIcon = querySelectorNotNull(button, '.action-icon');
        actionIcon.dataset.icon = icon;
    }

    /**
     * Used to remove the temporary duplicate-indicator elements
     * from _displayWhetherDupeOrNotAndLoading
     * so the real ones take their place
     */
    _removeDupeIndicators() {
        if (this._checkForDuplicates === false) { return; }
        for (const element of document.getElementById('dictionary-entries')?.querySelectorAll('.duplicate-indicator') ?? []) {
            element.remove();
        }
    }

    /**
     * @param {import('display-anki').DictionaryEntryDetails[]} dictionaryEntryDetails
     */
    _updateSaveButtons(dictionaryEntryDetails) {
        if (this._checkForDuplicates && this._noteDupeCheckFirst) { this._removeDupeIndicators(); }
        for (let entryIndex = 0; entryIndex < dictionaryEntryDetails.length; ++entryIndex) {
            for (const [cardFormatIndex, details] of dictionaryEntryDetails[entryIndex].noteMap) {
                this._updateNoteButtons(entryIndex, cardFormatIndex, details);
            }
        }
    }

    /**
     * @param {number} entryIndex
     * @param {number} cardFormatIndex
     * @param {import('display-anki').DictionaryEntryNoteDetails} details
     */
    _updateNoteButtons(entryIndex, cardFormatIndex, details) {
        const container = this._createSaveButtons(entryIndex, cardFormatIndex);
        if (container === null) { return; }
        const {canAdd, note, noteIds, noteInfos = [], ankiError, cardFormat} = details;
        const behavior = this._duplicateBehavior;
        const combined = behavior === 'new-and-overwrite';
        const duplicate = (this._checkForDuplicates || !combined) && noteIds !== null && noteIds.length > 0;
        const update = duplicate && behavior === 'overwrite';
        const compatible = this._getFirstCompatibleNote(note, noteIds, noteInfos) !== null;
        const pending = this._isNoteWritePending(entryIndex, cardFormatIndex);
        container.dataset.duplicateBehavior = behavior;
        /** @type {HTMLButtonElement} */
        const primaryButton = querySelectorNotNull(container, '.action-button');
        /** @type {HTMLButtonElement} */
        const updateButton = querySelectorNotNull(container, '.note-action-button-update');
        primaryButton.dataset.action = update ? 'update-note' : 'add-note';
        primaryButton.hidden = ankiError !== null;
        primaryButton.disabled = pending || !canAdd || (duplicate && (behavior === 'prevent' || (update && !compatible)));
        updateButton.hidden = !combined || !duplicate || ankiError !== null;
        updateButton.disabled = pending || !canAdd || !compatible;
        const updateTitle = compatible ?
            `Update existing ${cardFormat.name} note (first available compatible duplicate)` :
            `Cannot update ${cardFormat.name} note: no available duplicate with the configured note type and fields`;
        let title = `Add ${duplicate ? 'duplicate ' : ''}${cardFormat.name} note`;
        let icon = duplicate ? `add-duplicate-${cardFormat.icon}` : cardFormat.icon;
        if (duplicate && behavior === 'prevent') {
            title = 'Duplicate notes are disabled';
            icon = cardFormat.icon;
        } else if (update) {
            title = updateTitle;
            icon = `overwrite-${cardFormat.icon}`;
        }
        this._setSaveButtonLabel(primaryButton, title, icon);
        this._setSaveButtonLabel(updateButton, updateTitle, `overwrite-${cardFormat.icon}`);
        if (ankiError !== null && ankiError.message !== 'Anki not connected') { log.error(ankiError); }

        const validNoteIds = noteIds?.filter((id) => id !== INVALID_NOTE_ID) ?? [];
        this._updateViewNoteButton(entryIndex, cardFormatIndex, validNoteIds, noteInfos);
        for (const indicator of container.querySelectorAll('[data-action="view-tags"], [data-action="view-flags"]')) {
            indicator.remove();
        }
        if (this._displayTagsAndFlags !== 'never') {
            this._setupTagsIndicator(entryIndex, cardFormatIndex, noteInfos);
            this._setupFlagsIndicator(entryIndex, cardFormatIndex, noteInfos);
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
        } else if (this._displayTagsAndFlags === 'custom') {
            const tagsToRemove = [];
            for (const tag of displayTags) {
                if (typeof tag === 'string' && !this._targetTags.includes(tag)) {
                    tagsToRemove.push(tag);
                }
            }
            for (const tag of tagsToRemove) {
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
        const action = this._duplicateBehavior === 'overwrite' && this._saveButtonFind(index, cardFormatIndex, 'update-note') !== null ? 'update-note' : 'add-note';
        void this._saveAnkiNote(index, cardFormatIndex, action);
    }

    /**
     * @param {number} dictionaryEntryIndex
     * @param {number} cardFormatIndex
     * @returns {boolean}
     */
    _isNoteWritePending(dictionaryEntryIndex, cardFormatIndex) {
        const dictionaryEntry = this._display.dictionaryEntries[dictionaryEntryIndex];
        for (const pending of this._pendingNoteWrites) {
            if (pending.dictionaryEntry !== dictionaryEntry) { continue; }
            // Settings can reorder or replace formats, so an older context locks the whole entry.
            if (pending.token !== this._noteContextToken || pending.cardFormatIndex === cardFormatIndex) { return true; }
        }
        return false;
    }

    /**
     * @param {number} dictionaryEntryIndex
     * @param {number} cardFormatIndex
     * @param {import('display-anki').NoteAction} action
     */
    async _saveAnkiNote(dictionaryEntryIndex, cardFormatIndex, action) {
        const dictionaryEntry = this._display.dictionaryEntries[dictionaryEntryIndex];
        const details = this._dictionaryEntryDetails?.[dictionaryEntryIndex]?.noteMap.get(cardFormatIndex);
        if (typeof dictionaryEntry === 'undefined' || typeof details === 'undefined') { return; }
        const button = this._saveButtonFind(dictionaryEntryIndex, cardFormatIndex, action);
        if (!button || button.disabled || this._isNoteWritePending(dictionaryEntryIndex, cardFormatIndex)) { return; }

        const token = this._noteContextToken;
        const {requirements, cardFormat} = details;
        const {_suspendNewCards: suspendNewCards, _forceSync: forceSync} = this;
        const pendingWrite = {dictionaryEntry, cardFormatIndex, token};
        this._pendingNoteWrites.add(pendingWrite);
        this._updateNoteButtons(dictionaryEntryIndex, cardFormatIndex, details);
        // Retain the double-click cooldown, but never unlock before the write settles.
        const cooldown = new Promise((resolve) => { setTimeout(resolve, 2500); });
        /** @type {Error[]} */
        const allErrors = [];
        this._hideErrorNotification(true);
        const progressIndicatorVisible = this._display.progressIndicatorVisible;
        const overrideToken = progressIndicatorVisible.setOverride(true);
        /** @type {?import('anki').Note} */
        let createdNote = null;
        let addedNoteId = null;
        try {
            const {note, errors, requirements: outputRequirements} = await this._createNote(dictionaryEntry, cardFormatIndex, requirements);
            if (this._noteContextToken !== token) { return; }
            createdNote = note;
            allErrors.push(...errors);
            const error = this._getAddNoteRequirementsError(requirements, outputRequirements);
            if (error !== null) { allErrors.push(error); }
            if (action === 'update-note') {
                const overwrittenNote = await this._getOverwrittenNote(note, cardFormat);
                if (this._noteContextToken !== token) { return; }
                await this._display.application.api.updateAnkiNote(overwrittenNote);
            } else {
                addedNoteId = await this._addNewAnkiNote(note, allErrors, suspendNewCards, forceSync);
            }
        } catch (e) {
            allErrors.push(toError(e));
        } finally {
            if (this._noteContextToken === token && createdNote !== null) {
                try {
                    await this._refreshNoteDetails(dictionaryEntryIndex, cardFormatIndex, createdNote, addedNoteId, token);
                } catch (e) {
                    allErrors.push(toError(e));
                }
            }
            progressIndicatorVisible.clearOverride(overrideToken);
            await cooldown;
            try {
                if (this._noteContextToken !== token && this._display.dictionaryEntries.includes(dictionaryEntry)) {
                    // Refresh with the current settings before unlocking rebuilt controls.
                    await this._updateDictionaryEntryDetails();
                }
            } catch (e) {
                log.error(e);
            } finally {
                this._pendingNoteWrites.delete(pendingWrite);
                const currentIndex = this._display.dictionaryEntries.indexOf(dictionaryEntry);
                const currentDetails = this._dictionaryEntryDetails?.[currentIndex];
                if (typeof currentDetails !== 'undefined') {
                    for (const [currentFormatIndex, currentNoteDetails] of currentDetails.noteMap) {
                        this._updateNoteButtons(currentIndex, currentFormatIndex, currentNoteDetails);
                    }
                }
            }
        }
        if (this._noteContextToken !== token) { return; }
        if (allErrors.length > 0) {
            this._showErrorNotification(allErrors);
        } else {
            this._hideErrorNotification(true);
        }
    }

    /**
     * @param {number} dictionaryEntryIndex
     * @param {number} cardFormatIndex
     * @param {import('display-anki').NoteAction} action
     * @returns {?HTMLButtonElement}
     */
    _saveButtonFind(dictionaryEntryIndex, cardFormatIndex, action) {
        return this._getEntry(dictionaryEntryIndex)?.querySelector(`.action-button[data-card-format-index="${cardFormatIndex}"][data-action="${action}"]:not([hidden])`) ?? null;
    }

    /**
     * @param {import('anki').Note} note
     * @param {?number[]} noteIds
     * @param {(?import('anki').NoteInfo)[]} noteInfos
     * @returns {?import('anki').NoteInfo}
     */
    _getFirstCompatibleNote(note, noteIds, noteInfos) {
        for (const id of noteIds ?? []) {
            if (id === INVALID_NOTE_ID) { continue; }
            const info = noteInfos.find((item) => item !== null && item.noteId === id);
            if (info && info.modelName === note.modelName && Object.keys(note.fields).every((field) => typeof info.fields[field]?.value === 'string')) {
                return info;
            }
        }
        return null;
    }

    /**
     * @param {import('anki').Note} note
     * @param {import('settings').AnkiCardFormat} cardFormat
     * @returns {Promise<import('anki').NoteWithId>}
     */
    async _getOverwrittenNote(note, cardFormat) {
        const [info] = await this._display.application.api.getAnkiNoteInfo([note], true);
        const target = this._getFirstCompatibleNote(note, info.noteIds, info.noteInfos ?? []);
        if (!info.valid || target === null) {
            throw new Error('No available compatible duplicate note to update');
        }
        /** @type {import('anki').NoteFields} */
        const fields = {};
        for (const [field, newValue] of Object.entries(note.fields)) {
            fields[field] = this._getOverwrittenField(target.fields[field].value, newValue, cardFormat.fields[field].overwriteMode);
        }
        return {...note, fields, id: target.noteId};
    }

    /**
     * @param {number} entryIndex
     * @param {number} cardFormatIndex
     * @param {import('anki').Note} note
     * @param {?number} addedNoteId
     * @param {import('core').TokenObject} token
     */
    async _refreshNoteDetails(entryIndex, cardFormatIndex, note, addedNoteId, token) {
        const details = this._dictionaryEntryDetails?.[entryIndex]?.noteMap.get(cardFormatIndex);
        if (typeof details === 'undefined') { return; }
        // Keep the returned ID available even if the subsequent refresh fails.
        if (addedNoteId !== null) {
            details.noteIds = [...new Set([...(details.noteIds ?? []), addedNoteId])];
        }
        if (this._checkForDuplicates) {
            const [info] = await this._display.application.api.getAnkiNoteInfo([note], this._isAdditionalInfoEnabled());
            if (this._noteContextToken !== token) { return; }
            Object.assign(details, info);
        }
        this._updateNoteButtons(entryIndex, cardFormatIndex, details);
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
     * @param {boolean} suspendNewCards
     * @param {boolean} forceSync
     * @returns {Promise<number>}
     */
    async _addNewAnkiNote(note, allErrors, suspendNewCards, forceSync) {
        const noteId = await this._display.application.api.addAnkiNote(note);
        if (noteId === null) { throw new Error('Note could not be added'); }
        if (suspendNewCards) {
            try {
                await this._display.application.api.suspendAnkiCardsForNote(noteId);
            } catch (e) {
                allErrors.push(toError(e));
            }
        }
        if (forceSync) {
            try {
                await this._display.application.api.forceSync();
            } catch (e) {
                allErrors.push(toError(e));
            }
        }
        return noteId;
    }

    /**
     * @param {number} dictionaryEntryIndex
     * @param {number} cardFormatIndex
     * @param {number[]} noteIds
     * @param {(?import('anki').NoteInfo)[]} noteInfos
     */
    _updateViewNoteButton(dictionaryEntryIndex, cardFormatIndex, noteIds, noteInfos) {
        const entry = this._getEntry(dictionaryEntryIndex);
        const singleNoteActions = entry?.querySelector(`[data-card-format-index="${cardFormatIndex}"]`);
        if (!singleNoteActions) { return; }
        /** @type {HTMLButtonElement | null} */
        let viewNoteButton = singleNoteActions.querySelector('.action-button[data-action=view-note]');
        if (viewNoteButton === null) {
            viewNoteButton = this._createViewNoteButton(dictionaryEntryIndex, cardFormatIndex, noteIds, noteInfos);
        }
        if (viewNoteButton === null) { return; }
        viewNoteButton.dataset.noteIds = noteIds.join(' ');
        viewNoteButton.disabled = noteIds.length === 0;
        viewNoteButton.hidden = noteIds.length === 0;
        this._setViewNoteButtonCardState(noteInfos, viewNoteButton);
        this._setViewButtonBadge(viewNoteButton);
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
     * @returns {Promise<string>}
     */
    async _updateAnkiFieldTemplates(options) {
        const token = this._noteContextToken;
        const templates = await this._getAnkiFieldTemplates(options);
        if (this._noteContextToken === token) { this._ankiFieldTemplates = templates; }
        // A caller can finish with its own templates even when its context has expired.
        // The context checks at the call sites prevent obsolete results from being used.
        return templates;
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
        return this._displayTagsAndFlags !== 'never' || this._duplicateBehavior === 'overwrite' || this._duplicateBehavior === 'new-and-overwrite';
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

        const noteInfoList = (await Promise.all(notePromises));
        const validNotes = [];
        /** @type {(import('anki').NoteInfoWrapper?)[]} */
        const invalidAndPlaceholderNotes = [];
        for (const noteInfo of noteInfoList) {
            const note = noteInfo.note;
            if (note.deckName.length > 0 && note.modelName.length > 0) {
                validNotes.push(note);
                invalidAndPlaceholderNotes.push(null);
            } else {
                invalidAndPlaceholderNotes.push({
                    canAdd: false,
                    valid: false,
                    noteIds: null,
                });
            }
        }

        let infos;
        let ankiError = null;
        try {
            if (this._checkForDuplicates) {
                infos = await this._display.application.api.getAnkiNoteInfo(validNotes, this._isAdditionalInfoEnabled());
            } else {
                const isAnkiConnected = await this._display.application.api.isAnkiConnected();
                infos = this._getAnkiNoteInfoForceValueIfValid(validNotes, isAnkiConnected);
                ankiError = isAnkiConnected ? null : new Error('Anki not connected');
            }
        } catch (e) {
            infos = this._getAnkiNoteInfoForceValueIfValid(validNotes, false);
            ankiError = (e instanceof ExtensionError && e.message.includes('Anki connection failure')) ?
                new Error('Anki not connected') :
                toError(e);
        }

        /** @type {(import('anki').NoteInfoWrapper)[]} */
        const notesDupechecked = [];
        for (const invalidAndPlaceholderNote of invalidAndPlaceholderNotes) {
            if (invalidAndPlaceholderNote !== null) {
                notesDupechecked.push(invalidAndPlaceholderNote);
            } else {
                const info = infos.shift();
                if (typeof info !== 'undefined') {
                    notesDupechecked.push(info);
                }
            }
        }

        /** @type {import('display-anki').DictionaryEntryDetails[]} */
        const results = new Array(dictionaryEntries.length).fill(null).map(() => ({noteMap: new Map()}));

        for (let i = 0, ii = noteInfoList.length; i < ii; ++i) {
            const {note, errors, requirements} = noteInfoList[i];
            const {canAdd, valid, noteIds, noteInfos} = notesDupechecked[i];
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
        let template = this._ankiFieldTemplates;
        if (template === null) {
            const options = this._display.getOptions();
            if (options) {
                template = await this._updateAnkiFieldTemplates(options);
            }
        }
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
        const {sources, preferredAudioIndex, enableDefaultAudioSources} = this._displayAudio.getAnkiNoteMediaAudioDetails(details.term, details.reading);
        const languageSummary = this._display.getLanguageSummary();
        return {
            sources,
            preferredAudioIndex,
            idleTimeout: this._audioDownloadIdleTimeout,
            languageSummary,
            enableDefaultAudioSources,
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
