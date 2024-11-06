/*
 * Copyright (C) 2023-2024  Yomitan Authors
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
        this._duplicateBehavior = 'prevent';
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
        /** @type {Map<import('display-anki').CreateMode, import('settings').AnkiNoteOptions>} */
        this._modeOptions = new Map();
        /** @type {import('settings').DictionariesOptions} */
        this._dictionaries = [];
        /** @type {Map<import('dictionary').DictionaryEntryType, import('display-anki').CreateMode[]>} */
        this._dictionaryEntryTypeModeMap = new Map([
            ['kanji', ['kanji']],
            ['term', ['term-kanji', 'term-kana']],
        ]);
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
            ['addNoteKanji',      () => { this._hotkeySaveAnkiNoteForSelectedEntry('kanji'); }],
            ['addNoteTermKanji',  () => { this._hotkeySaveAnkiNoteForSelectedEntry('term-kanji'); }],
            ['addNoteTermKana',   () => { this._hotkeySaveAnkiNoteForSelectedEntry('term-kana'); }],
            ['viewNotes',         this._viewNotesForSelectedEntry.bind(this)],
        ]);
        /* eslint-enable @stylistic/no-multi-spaces */
        this._display.on('optionsUpdated', this._onOptionsUpdated.bind(this));
        this._display.on('contentClear', this._onContentClear.bind(this));
        this._display.on('contentUpdateStart', this._onContentUpdateStart.bind(this));
        this._display.on('contentUpdateEntry', this._onContentUpdateEntry.bind(this));
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
                mode: 'test',
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
        const modes = this._getModes(dictionaryEntry.type === 'term');
        for (const mode of modes) {
            let note;
            let errors;
            let requirements;
            try {
                ({note: note, errors, requirements} = await this._createNote(dictionaryEntry, mode, []));
            } catch (e) {
                errors = [toError(e)];
            }
            /** @type {import('display-anki').AnkiNoteLogData} */
            const entry = {mode, note};
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
                kanji,
                terms,
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
        this._modeOptions.clear();
        this._modeOptions.set('kanji', kanji);
        this._modeOptions.set('term-kanji', terms);
        this._modeOptions.set('term-kana', terms);
        this._dictionaries = dictionaries;

        void this._updateAnkiFieldTemplates(options);
    }

    /** */
    _onContentClear() {
        this._updateDictionaryEntryDetailsToken = null;
        this._dictionaryEntryDetails = null;
        this._hideErrorNotification(false);
    }

    /** */
    _onContentUpdateStart() {
        this._noteContext = this._getNoteContext();
    }

    /**
     * @param {import('display').EventArgument<'contentUpdateEntry'>} details
     */
    _onContentUpdateEntry({element}) {
        const eventListeners = this._eventListeners;
        for (const node of element.querySelectorAll('.action-button[data-action=view-tags]')) {
            eventListeners.addEventListener(node, 'click', this._onShowTagsBind);
        }
        for (const node of element.querySelectorAll('.action-button[data-action=view-flags]')) {
            eventListeners.addEventListener(node, 'click', this._onShowFlagsBind);
        }
        for (const node of element.querySelectorAll('.action-button[data-action=save-note]')) {
            eventListeners.addEventListener(node, 'click', this._onNoteSaveBind);
        }
        for (const node of element.querySelectorAll('.action-button[data-action=view-note]')) {
            eventListeners.addEventListener(node, 'click', this._onViewNotesButtonClickBind);
            eventListeners.addEventListener(node, 'contextmenu', this._onViewNotesButtonContextMenuBind);
            eventListeners.addEventListener(node, 'menuClose', this._onViewNotesButtonMenuCloseBind);
        }
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
     */
    _onNoteSave(e) {
        e.preventDefault();
        const element = /** @type {HTMLElement} */ (e.currentTarget);
        const mode = this._getValidCreateMode(element.dataset.mode);
        if (mode === null) { return; }
        const index = this._display.getElementDictionaryEntryIndex(element);
        void this._saveAnkiNote(index, mode);
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
     * @param {import('display-anki').CreateMode} mode
     * @returns {?HTMLButtonElement}
     */
    _saveButtonFind(index, mode) {
        const entry = this._getEntry(index);
        return entry !== null ? entry.querySelector(`.action-button[data-action=save-note][data-mode="${mode}"]`) : null;
    }

    /**
     * @param {number} index
     * @returns {?HTMLButtonElement}
     */
    _tagsIndicatorFind(index) {
        const entry = this._getEntry(index);
        return entry !== null ? entry.querySelector('.action-button[data-action=view-tags]') : null;
    }

    /**
     * @param {number} index
     * @returns {?HTMLButtonElement}
     */
    _flagsIndicatorFind(index) {
        const entry = this._getEntry(index);
        return entry !== null ? entry.querySelector('.action-button[data-action=view-flags]') : null;
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
     */
    _updateSaveButtonForDuplicateBehavior(button, noteIds) {
        const behavior = this._duplicateBehavior;
        if (behavior === 'prevent') {
            button.disabled = true;
            return;
        }

        const mode = button.dataset.mode;
        const verb = behavior === 'overwrite' ? 'Overwrite' : 'Add duplicate';
        const iconPrefix = behavior === 'overwrite' ? 'overwrite' : 'add-duplicate';
        const target = mode === 'term-kanji' ? 'expression' : 'reading';

        if (behavior === 'overwrite') {
            button.dataset.overwrite = 'true';
            if (!noteIds.some((id) => id !== INVALID_NOTE_ID)) {
                button.disabled = true;
            }
        } else {
            delete button.dataset.overwrite;
        }

        button.setAttribute('title', `${verb} ${target}`);

        // eslint-disable-next-line no-underscore-dangle
        const hotkeyLabel = this._display._hotkeyHelpController.getHotkeyLabel(button);
        if (hotkeyLabel) {
            // eslint-disable-next-line no-underscore-dangle
            this._display._hotkeyHelpController.setHotkeyLabel(button, `${verb} ${target} ({0})`);
        }

        const actionIcon = button.querySelector('.action-icon');
        if (actionIcon instanceof HTMLElement) {
            actionIcon.dataset.icon = `${iconPrefix}-${mode}`;
        }
    }

    /**
     * @param {import('display-anki').DictionaryEntryDetails[]} dictionaryEntryDetails
     */
    _updateSaveButtons(dictionaryEntryDetails) {
        const displayTagsAndFlags = this._displayTagsAndFlags;
        for (let i = 0, ii = dictionaryEntryDetails.length; i < ii; ++i) {
            /** @type {?Set<number>} */
            let allNoteIds = null;
            for (const {mode, canAdd, noteIds, noteInfos, ankiError} of dictionaryEntryDetails[i].modeMap.values()) {
                const button = this._saveButtonFind(i, mode);
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

                if (Array.isArray(noteIds) && noteIds.length > 0) {
                    if (allNoteIds === null) { allNoteIds = new Set(); }
                    for (const noteId of noteIds) {
                        if (noteId !== INVALID_NOTE_ID) {
                            allNoteIds.add(noteId);
                        }
                    }
                }

                if (displayTagsAndFlags !== 'never' && Array.isArray(noteInfos)) {
                    this._setupTagsIndicator(i, noteInfos);
                    this._setupFlagsIndicator(i, noteInfos);
                }
            }

            this._updateViewNoteButton(i, allNoteIds !== null ? [...allNoteIds] : [], false);
        }
    }

    /**
     * @param {number} i
     * @param {(?import('anki').NoteInfo)[]} noteInfos
     */
    _setupTagsIndicator(i, noteInfos) {
        const tagsIndicator = this._tagsIndicatorFind(i);
        if (tagsIndicator === null) {
            return;
        }

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
     * @param {number} i
     * @param {(?import('anki').NoteInfo)[]} noteInfos
     */
    _setupFlagsIndicator(i, noteInfos) {
        const flagsIndicator = this._flagsIndicatorFind(i);
        if (flagsIndicator === null) {
            return;
        }

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
        }
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
     * @param {import('display-anki').CreateMode} mode
     */
    _hotkeySaveAnkiNoteForSelectedEntry(mode) {
        const index = this._display.selectedIndex;
        void this._saveAnkiNote(index, mode);
    }

    /**
     * @param {number} dictionaryEntryIndex
     * @param {import('display-anki').CreateMode} mode
     */
    async _saveAnkiNote(dictionaryEntryIndex, mode) {
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

        const button = this._saveButtonFind(dictionaryEntryIndex, mode);
        if (button === null || button.disabled) { return; }

        this._hideErrorNotification(true);

        /** @type {Error[]} */
        const allErrors = [];
        const progressIndicatorVisible = this._display.progressIndicatorVisible;
        const overrideToken = progressIndicatorVisible.setOverride(true);
        try {
            const {note, errors, requirements: outputRequirements} = await this._createNote(dictionaryEntry, mode, requirements);
            allErrors.push(...errors);

            const error = this._getAddNoteRequirementsError(requirements, outputRequirements);
            if (error !== null) { allErrors.push(error); }
            await (button.dataset.overwrite ?
                this._updateAnkiNote(note, allErrors, button, dictionaryEntryIndex) :
                this._addNewAnkiNote(note, allErrors, button, dictionaryEntryIndex));
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
                this._updateSaveButtonForDuplicateBehavior(button, [noteId]);

                this._updateViewNoteButton(dictionaryEntryIndex, [noteId], true);
            }
        }
    }

    /**
     * @param {import('anki').Note} note
     * @param {Error[]} allErrors
     * @param {HTMLButtonElement} button
     * @param {number} dictionaryEntryIndex
     */
    async _updateAnkiNote(note, allErrors, button, dictionaryEntryIndex) {
        const dictionaryEntries = this._display.dictionaryEntries;
        const allEntryDetails = await this._getDictionaryEntryDetails(dictionaryEntries);
        const relevantEntryDetails = allEntryDetails[dictionaryEntryIndex];
        const mode = this._getValidCreateMode(button.dataset.mode);
        if (mode === null) { return; }
        const relevantModeDetails = relevantEntryDetails.modeMap.get(mode);
        if (typeof relevantModeDetails === 'undefined') { return; }
        const {noteIds} = relevantModeDetails;
        if (noteIds === null) { return; }
        const overwriteTarget = noteIds.find((id) => id !== INVALID_NOTE_ID);
        if (typeof overwriteTarget === 'undefined') { return; }

        try {
            const noteWithId = {...note, id: overwriteTarget};
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
        const staticTemplates = await this._getStaticAnkiFieldTemplates(options);
        const dynamicTemplates = getDynamicTemplates(options);
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
     * @param {import('dictionary').DictionaryEntry[]} dictionaryEntries
     * @returns {Promise<import('display-anki').DictionaryEntryDetails[]>}
     */
    async _getDictionaryEntryDetails(dictionaryEntries) {
        const fetchAdditionalInfo = (this._displayTagsAndFlags !== 'never');

        const notePromises = [];
        const noteTargets = [];
        for (let i = 0, ii = dictionaryEntries.length; i < ii; ++i) {
            const dictionaryEntry = dictionaryEntries[i];
            const {type} = dictionaryEntry;
            const modes = this._dictionaryEntryTypeModeMap.get(type);
            if (typeof modes === 'undefined') { continue; }
            for (const mode of modes) {
                const notePromise = this._createNote(dictionaryEntry, mode, []);
                notePromises.push(notePromise);
                noteTargets.push({index: i, mode});
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
                await this._display.application.api.getAnkiNoteInfo(notes, fetchAdditionalInfo) :
                this._getAnkiNoteInfoForceValue(notes, true);
        } catch (e) {
            infos = this._getAnkiNoteInfoForceValue(notes, false);
            ankiError = toError(e);
        }

        /** @type {import('display-anki').DictionaryEntryDetails[]} */
        const results = [];
        for (let i = 0, ii = dictionaryEntries.length; i < ii; ++i) {
            results.push({
                modeMap: new Map(),
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

    /**
     * @param {import('anki').Note[]} notes
     * @param {boolean} canAdd
     * @returns {import('anki').NoteInfoWrapper[]}
     */
    _getAnkiNoteInfoForceValue(notes, canAdd) {
        const results = [];
        for (const note of notes) {
            const valid = isNoteDataValid(note);
            results.push({canAdd, valid, noteIds: null});
        }
        return results;
    }

    /**
     * @param {import('dictionary').DictionaryEntry} dictionaryEntry
     * @param {import('display-anki').CreateMode} mode
     * @param {import('anki-note-builder').Requirement[]} requirements
     * @returns {Promise<import('display-anki').CreateNoteResult>}
     */
    async _createNote(dictionaryEntry, mode, requirements) {
        const context = this._noteContext;
        if (context === null) { throw new Error('Note context not initialized'); }
        const modeOptions = this._modeOptions.get(mode);
        if (typeof modeOptions === 'undefined') { throw new Error(`Unsupported note type: ${mode}`); }
        const template = this._ankiFieldTemplates;
        if (typeof template !== 'string') { throw new Error('Invalid template'); }
        const {deck: deckName, model: modelName} = modeOptions;
        const fields = Object.entries(modeOptions.fields);
        const contentOrigin = this._display.getContentOrigin();
        const details = this._ankiNoteBuilder.getDictionaryEntryDetailsForNote(dictionaryEntry);
        const audioDetails = this._getAnkiNoteMediaAudioDetails(details);
        const optionsContext = this._display.getOptionsContext();
        const dictionaryStylesMap = this._ankiNoteBuilder.getDictionaryStylesMap(this._dictionaries);

        const {note, errors, requirements: outputRequirements} = await this._ankiNoteBuilder.createNote({
            dictionaryEntry,
            mode,
            context,
            template,
            deckName,
            modelName,
            fields,
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
     * @param {boolean} isTerms
     * @returns {import('display-anki').CreateMode[]}
     */
    _getModes(isTerms) {
        return isTerms ? ['term-kanji', 'term-kana'] : ['kanji'];
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
     * @param {number[]} noteIds
     * @param {boolean} prepend
     */
    _updateViewNoteButton(index, noteIds, prepend) {
        const button = this._getViewNoteButton(index);
        if (button === null) { return; }
        /** @type {(number|string)[]} */
        let allNoteIds = noteIds;
        if (prepend) {
            const currentNoteIds = button.dataset.noteIds;
            if (typeof currentNoteIds === 'string' && currentNoteIds.length > 0) {
                allNoteIds = [...allNoteIds, ...currentNoteIds.split(' ')];
            }
        }
        const disabled = (allNoteIds.length === 0);
        button.disabled = disabled;
        button.hidden = disabled;
        button.dataset.noteIds = allNoteIds.join(' ');

        /** @type {?HTMLElement} */
        const badge = button.querySelector('.action-button-badge');
        if (badge !== null) {
            const badgeData = badge.dataset;
            if (allNoteIds.length > 1) {
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
     * Shows notes for selected pop-up entry when "View Notes" hotkey is used.
     */
    _viewNotesForSelectedEntry() {
        const index = this._display.selectedIndex;
        const button = this._getViewNoteButton(index);
        if (button !== null) {
            void this._viewNotes(button);
        }
    }

    /**
     * @param {string|undefined} value
     * @returns {?import('display-anki').CreateMode}
     */
    _getValidCreateMode(value) {
        switch (value) {
            case 'kanji':
            case 'term-kanji':
            case 'term-kana':
                return value;
            default:
                return null;
        }
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
