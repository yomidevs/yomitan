/*
 * Copyright (C) 2023-2025  Yomitan Authors
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

import {ExtensionError} from '../../core/extension-error.js';
import {log} from '../../core/log.js';
import {toError} from '../../core/to-error.js';
import {AnkiNoteBuilder} from '../../data/anki-note-builder.js';
import {getDynamicTemplates} from '../../data/anki-template-util.js';
import {querySelectorNotNull} from '../../dom/query-selector.js';
import {getLanguageSummaries} from '../../language/languages.js';
import {TemplateRendererProxy} from '../../templates/template-renderer-proxy.js';

export class AnkiDeckGeneratorController {
    /**
     * @param {import('../../application.js').Application} application
     * @param {import('./settings-controller.js').SettingsController} settingsController
     * @param {import('./modal-controller.js').ModalController} modalController
     * @param {import('./anki-controller.js').AnkiController} ankiController
     */
    constructor(application, settingsController, modalController, ankiController) {
        /** @type {import('../../application.js').Application} */
        this._application = application;
        /** @type {import('./settings-controller.js').SettingsController} */
        this._settingsController = settingsController;
        /** @type {import('./modal-controller.js').ModalController} */
        this._modalController = modalController;
        /** @type {import('./anki-controller.js').AnkiController} */
        this._ankiController = ankiController;
        /** @type {?string} */
        this._defaultFieldTemplates = null;
        /** @type {HTMLTextAreaElement} */
        this._mainSettingsEntry = querySelectorNotNull(document, '#generate-anki-notes-main-settings-entry');
        /** @type {HTMLTextAreaElement} */
        this._wordInputTextarea = querySelectorNotNull(document, '#generate-anki-notes-textarea');
        /** @type {HTMLInputElement} */
        this._renderTextInput = querySelectorNotNull(document, '#generate-anki-notes-test-text-input');
        /** @type {HTMLElement} */
        this._renderResult = querySelectorNotNull(document, '#generate-anki-notes-render-result');
        /** @type {HTMLElement} */
        this._activeModelText = querySelectorNotNull(document, '#generate-anki-notes-active-model');
        /** @type {HTMLElement} */
        this._activeDeckText = querySelectorNotNull(document, '#generate-anki-notes-active-deck');
        /** @type {HTMLSelectElement} */
        this._activeFlashcardFormatSelect = querySelectorNotNull(document, '#generate-anki-flashcard-format');
        /** @type {import('settings').AnkiCardFormat[]} */
        this._flashcardFormatDetails = [];
        /** @type {HTMLInputElement} */
        this._addMediaCheckbox = querySelectorNotNull(document, '#generate-anki-notes-add-media');
        /** @type {HTMLInputElement} */
        this._disallowDuplicatesCheckbox = querySelectorNotNull(document, '#generate-anki-notes-disallow-duplicates');
        /** @type {string} */
        this._activeNoteType = '';
        /** @type {string} */
        this._activeAnkiDeck = '';
        /** @type {HTMLSpanElement} */
        this._sendWordcount = querySelectorNotNull(document, '#generate-anki-notes-send-wordcount');
        /** @type {HTMLSpanElement} */
        this._exportWordcount = querySelectorNotNull(document, '#generate-anki-notes-export-wordcount');
        /** @type {HTMLButtonElement} */
        this._sendToAnkiButtonConfirmButton = querySelectorNotNull(document, '#generate-anki-notes-send-button-confirm');
        /** @type {HTMLButtonElement} */
        this._exportButtonConfirmButton = querySelectorNotNull(document, '#generate-anki-notes-export-button-confirm');
        /** @type {NodeListOf<HTMLElement>} */
        this._progressContainers = (document.querySelectorAll('.generate-anki-notes-progress'));
        /** @type {?import('./modal.js').Modal} */
        this._sendToAnkiConfirmModal = null;
        /** @type {?import('./modal.js').Modal} */
        this._exportConfirmModal = null;
        /** @type {boolean} */
        this._cancel = false;
        /** @type {boolean} */
        this._inProgress = false;
        /** @type {AnkiNoteBuilder} */
        this._ankiNoteBuilder = new AnkiNoteBuilder(settingsController.application.api, new TemplateRendererProxy());
    }

    /** */
    async prepare() {
        this._defaultFieldTemplates = await this._settingsController.application.api.getDefaultAnkiFieldTemplates();

        /** @type {HTMLButtonElement} */
        const testRenderButton = querySelectorNotNull(document, '#generate-anki-notes-test-render-button');
        /** @type {HTMLButtonElement} */
        const sendToAnkiButton = querySelectorNotNull(document, '#generate-anki-notes-send-to-anki-button');
        /** @type {HTMLButtonElement} */
        const sendToAnkiCancelButton = querySelectorNotNull(document, '#generate-anki-notes-send-to-anki-cancel-button');
        /** @type {HTMLButtonElement} */
        const exportButton = querySelectorNotNull(document, '#generate-anki-notes-export-button');
        /** @type {HTMLButtonElement} */
        const exportCancelButton = querySelectorNotNull(document, '#generate-anki-notes-export-cancel-button');
        /** @type {HTMLButtonElement} */
        const generateButton = querySelectorNotNull(document, '#generate-anki-notes-export-button');

        this._sendToAnkiConfirmModal = this._modalController.getModal('generate-anki-notes-send-to-anki');
        this._exportConfirmModal = this._modalController.getModal('generate-anki-notes-export');

        testRenderButton.addEventListener('click', this._onRender.bind(this), false);
        sendToAnkiButton.addEventListener('click', this._onSendToAnki.bind(this), false);
        this._sendToAnkiButtonConfirmButton.addEventListener('click', this._onSendToAnkiConfirm.bind(this), false);
        sendToAnkiCancelButton.addEventListener('click', (() => { this._cancel = true; }).bind(this), false);
        exportButton.addEventListener('click', this._onExport.bind(this), false);
        this._exportButtonConfirmButton.addEventListener('click', this._onExportConfirm.bind(this), false);
        exportCancelButton.addEventListener('click', (() => { this._cancel = true; }).bind(this), false);
        generateButton.addEventListener('click', this._onExport.bind(this), false);

        void this._updateExampleText();
        this._mainSettingsEntry.addEventListener('click', this._updateExampleText.bind(this), false);

        void this._setupModelSelection();
        this._mainSettingsEntry.addEventListener('click', this._setupModelSelection.bind(this), false);

        this._activeFlashcardFormatSelect.addEventListener('change', this._updateActiveModel.bind(this), false);
    }

    // Private

    /** */
    async _setupModelSelection() {
        const activeFlashcardFormat = /** @type {HTMLSelectElement} */ (this._activeFlashcardFormatSelect);
        const options = await this._settingsController.getOptions();
        this._flashcardFormatDetails = options.anki.cardFormats;

        activeFlashcardFormat.innerHTML = '';

        for (let i = 0; i < options.anki.cardFormats.length; i++) {
            const option = document.createElement('option');
            option.value = i.toString();
            option.text = options.anki.cardFormats[i].name;
            activeFlashcardFormat.add(option);
        }

        void this._updateActiveModel();
    }

    /** */
    async _updateActiveModel() {
        const activeModelText = /** @type {HTMLElement} */ (this._activeModelText);
        const activeDeckText = /** @type {HTMLElement} */ (this._activeDeckText);
        const activeDeckTextConfirm = querySelectorNotNull(document, '#generate-anki-notes-active-deck-confirm');

        const index = Number(this._activeFlashcardFormatSelect.value);

        this._activeNoteType = this._flashcardFormatDetails[index].model;
        this._activeAnkiDeck = this._flashcardFormatDetails[index].deck;
        activeModelText.textContent = this._activeNoteType;
        activeDeckText.textContent = this._activeAnkiDeck;
        activeDeckTextConfirm.textContent = this._activeAnkiDeck;
    }

    /** */
    async _resetState() {
        this._updateProgressBar(true, '', 0, 1, false);
        this._cancel = false;

        this._exportButtonConfirmButton.disabled = false;
        this._exportWordcount.textContent = /** @type {HTMLTextAreaElement} */ (this._wordInputTextarea).value.split('\n').filter(Boolean).length.toString();

        this._sendToAnkiButtonConfirmButton.disabled = false;
        this._addMediaCheckbox.disabled = false;
        this._disallowDuplicatesCheckbox.disabled = false;
        this._sendWordcount.textContent = /** @type {HTMLTextAreaElement} */ (this._wordInputTextarea).value.split('\n').filter(Boolean).length.toString();
    }

    /** */
    async _startGenerationState() {
        this._inProgress = true;

        this._exportButtonConfirmButton.disabled = true;

        this._sendToAnkiButtonConfirmButton.disabled = true;
        this._addMediaCheckbox.disabled = true;
        this._disallowDuplicatesCheckbox.disabled = true;
    }

    /** */
    async _endGenerationState() {
        this._inProgress = false;

        if (this._exportConfirmModal !== null) {
            this._exportConfirmModal.setVisible(false);
        }

        if (this._sendToAnkiConfirmModal !== null) {
            this._sendToAnkiConfirmModal.setVisible(false);
        }

        this._updateProgressBar(false, '', 1, 1, false);
    }

    /** */
    async _endGenerationStateError() {
        this._inProgress = false;
    }

    /**
     * @param {MouseEvent} e
     */
    _onExport(e) {
        e.preventDefault();
        if (this._exportConfirmModal !== null) {
            this._exportConfirmModal.setVisible(true);
            if (this._inProgress) { return; }
            void this._resetState();
        }
    }

    /**
     * @param {MouseEvent} e
     */
    async _onExportConfirm(e) {
        e.preventDefault();
        void this._startGenerationState();
        const terms = /** @type {HTMLTextAreaElement} */ (this._wordInputTextarea).value.split('\n');
        let ankiTSV = '#separator:tab\n#html:true\n#notetype column:1\n#deck column:2\n#tags column:3\n';
        let index = 0;
        requestAnimationFrame(() => {
            this._updateProgressBar(true, 'Exporting to File...', 0, terms.length, true);
            setTimeout(async () => {
                for (const value of terms) {
                    if (!value) { continue; }
                    if (this._cancel) {
                        void this._endGenerationState();
                        return;
                    }
                    const noteData = await this._generateNoteData(value, false);
                    if (noteData !== null) {
                        const fieldsTSV = this._fieldsToTSV(noteData.fields);
                        if (fieldsTSV) {
                            ankiTSV += this._activeNoteType + '\t';
                            ankiTSV += this._activeAnkiDeck + '\t';
                            ankiTSV += noteData.tags.join(' ') + '\t';
                            ankiTSV += fieldsTSV;
                            ankiTSV += '\n';
                        }
                    }
                    index++;
                    this._updateProgressBar(false, '', index, terms.length, true);
                }
                const today = new Date();
                const fileName = 'anki-deck-' + today.toISOString().split('.')[0].replaceAll(/(T|:)/g, '-') + '.txt';
                const blob = new Blob([ankiTSV], {type: 'application/octet-stream'});
                this._saveBlob(blob, fileName);

                void this._endGenerationState();
            }, 1);
        });
    }

    /**
     * @param {MouseEvent} e
     */
    _onSendToAnki(e) {
        e.preventDefault();
        if (this._sendToAnkiConfirmModal !== null) {
            this._sendToAnkiConfirmModal.setVisible(true);
            if (this._inProgress) { return; }
            void this._resetState();
        }
    }

    /**
     * @param {MouseEvent} e
     */
    async _onSendToAnkiConfirm(e) {
        e.preventDefault();
        void this._startGenerationState();
        const terms = /** @type {HTMLTextAreaElement} */ (this._wordInputTextarea).value.split('\n');
        const addMedia = this._addMediaCheckbox.checked;
        const disallowDuplicates = this._disallowDuplicatesCheckbox.checked;
        /** @type {import("anki.js").Note[]} */
        let notes = [];
        let index = 0;
        requestAnimationFrame(() => {
            this._updateProgressBar(true, 'Sending to Anki...', 0, terms.length, true);
            setTimeout(async () => {
                for (const value of terms) {
                    if (!value) { continue; }
                    if (this._cancel) {
                        void this._endGenerationState();
                        return;
                    }
                    const noteData = await this._generateNoteData(value, addMedia);
                    if (noteData) {
                        notes.push(noteData);
                    }
                    if (notes.length >= 100) {
                        const sendNotesResult = await this._sendNotes(notes, disallowDuplicates);
                        if (sendNotesResult === false) {
                            void this._endGenerationStateError();
                            return;
                        }
                        notes = [];
                    }
                    index++;
                    this._updateProgressBar(false, '', index, terms.length, true);
                }
                if (notes.length > 0) {
                    const sendNotesResult = await this._sendNotes(notes, disallowDuplicates);
                    if (sendNotesResult === false) {
                        void this._endGenerationStateError();
                        return;
                    }
                }

                void this._endGenerationState();
            }, 1);
        });
    }

    /**
     * @param {import("anki.js").Note[]} notes
     * @param {boolean} disallowDuplicates
     * @returns {Promise<boolean>}
     */
    async _sendNotes(notes, disallowDuplicates) {
        try {
            if (disallowDuplicates) {
                const duplicateNotes = await this._ankiController.canAddNotes(notes.map((note) => ({...note, options: {...note.options, allowDuplicate: false}})));
                notes = notes.filter((_, i) => duplicateNotes[i]);
            }
            const addNotesResult = await this._ankiController.addNotes(notes);
            if (addNotesResult === null || addNotesResult.includes(null)) {
                this._updateProgressBarError('Ankiconnect error: Failed to add cards');
                return false;
            }
        } catch (error) {
            if (error instanceof Error) {
                this._updateProgressBarError('Ankiconnect error: ' + error.message + '');
                log.error(error);
                return false;
            }
        }
        return true;
    }

    /**
     * @param {boolean} init
     * @param {string} text
     * @param {number} current
     * @param {number} end
     * @param {boolean} visible
     */
    _updateProgressBar(init, text, current, end, visible) {
        if (!visible) {
            for (const progress of this._progressContainers) { progress.hidden = true; }
            return;
        }
        if (init) {
            for (const progress of this._progressContainers) {
                progress.hidden = false;
                for (const infoLabel of progress.querySelectorAll('.progress-info')) {
                    infoLabel.textContent = text;
                    infoLabel.classList.remove('danger-text');
                }
            }
        }
        for (const progress of this._progressContainers) {
            /** @type {NodeListOf<HTMLElement>} */
            const statusLabels = progress.querySelectorAll('.progress-status');
            for (const statusLabel of statusLabels) { statusLabel.textContent = ((current / end) * 100).toFixed(0).toString() + '%'; }
            /** @type {NodeListOf<HTMLElement>} */
            const progressBars = progress.querySelectorAll('.progress-bar');
            for (const progressBar of progressBars) { progressBar.style.width = ((current / end) * 100).toString() + '%'; }
        }
    }

    /**
     * @param {string} text
     */
    _updateProgressBarError(text) {
        for (const progress of this._progressContainers) {
            progress.hidden = false;
            for (const infoLabel of progress.querySelectorAll('.progress-info')) {
                infoLabel.textContent = text;
                infoLabel.classList.add('danger-text');
            }
        }
    }

    /**
     * @param {HTMLElement} infoNode
     * @param {boolean} showSuccessResult
     */
    async _testNoteData(infoNode, showSuccessResult) {
        /** @type {Error[]} */
        const allErrors = [];
        const text = /** @type {HTMLInputElement} */ (this._renderTextInput).value;
        let result;
        try {
            const noteData = await this._generateNoteData(text, false);
            result = noteData ? this._fieldsToTSV(noteData.fields) : `No definition found for ${text}`;
        } catch (e) {
            allErrors.push(toError(e));
        }

        /**
         * @param {Error} e
         * @returns {string}
         */
        const errorToMessageString = (e) => {
            if (e instanceof ExtensionError) {
                const v = e.data;
                if (typeof v === 'object' && v !== null) {
                    const v2 = /** @type {import('core').UnknownObject} */ (v).error;
                    if (v2 instanceof Error) {
                        return v2.message;
                    }
                }
            }
            return e.message;
        };

        const hasError = allErrors.length > 0;
        infoNode.hidden = !(showSuccessResult || hasError);
        if (hasError || !result) {
            infoNode.textContent = allErrors.map(errorToMessageString).join('\n');
        } else {
            infoNode.textContent = showSuccessResult ? result : '';
        }
        infoNode.classList.toggle('text-danger', hasError);
    }

    /**
     * @param {string} word
     * @param {boolean} addMedia
     * @returns {Promise<?import('anki.js').Note>}
     */
    async _generateNoteData(word, addMedia) {
        const optionsContext = this._settingsController.getOptionsContext();
        const activeFlashcardFormatDetails = this._flashcardFormatDetails[Number(this._activeFlashcardFormatSelect.value)];
        const data = await this._getDictionaryEntry(word, optionsContext, activeFlashcardFormatDetails.type);

        if (data === null) {
            return null;
        }
        const {dictionaryEntry, text: sentenceText} = data;
        const options = await this._settingsController.getOptions();
        const context = {
            url: window.location.href,
            sentence: {
                text: sentenceText,
                offset: 0,
            },
            documentTitle: document.title,
            query: sentenceText,
            fullQuery: sentenceText,
        };
        const template = await this._getAnkiTemplate(options);
        const deckOptionsFields = activeFlashcardFormatDetails.fields;
        const {general: {resultOutputMode, glossaryLayoutMode, compactTags}} = options;
        const idleTimeout = (Number.isFinite(options.anki.downloadTimeout) && options.anki.downloadTimeout > 0 ? options.anki.downloadTimeout : null);
        const languageSummary = getLanguageSummaries().find(({iso}) => iso === options.general.language);
        const mediaOptions = addMedia ? {audio: {sources: options.audio.sources, preferredAudioIndex: null, idleTimeout: idleTimeout, languageSummary: languageSummary}} : null;
        const requirements = addMedia ? [...this._getDictionaryEntryMedia(dictionaryEntry), {type: 'audio'}] : [];
        const dictionaryStylesMap = this._ankiNoteBuilder.getDictionaryStylesMap(options.dictionaries);
        const cardFormat = /** @type {import('settings').AnkiCardFormat} */ ({
            deck: this._activeAnkiDeck,
            model: this._activeNoteType,
            fields: deckOptionsFields,
            type: activeFlashcardFormatDetails.type,
            name: '',
            icon: 'big-circle',
        });
        const {note} = await this._ankiNoteBuilder.createNote(/** @type {import('anki-note-builder').CreateNoteDetails} */ ({
            dictionaryEntry,
            cardFormat,
            context,
            template,
            resultOutputMode,
            glossaryLayoutMode,
            compactTags,
            tags: options.anki.tags,
            mediaOptions: mediaOptions,
            requirements: requirements,
            duplicateScope: options.anki.duplicateScope,
            duplicateScopeCheckAllModels: options.anki.duplicateScopeCheckAllModels,
            dictionaryStylesMap: dictionaryStylesMap,
        }));
        return note;
    }

    /**
     * @param {string} text
     * @param {import('settings').OptionsContext} optionsContext
     * @param {import('settings').AnkiCardFormatType} type
     * @returns {Promise<?{dictionaryEntry: (import('dictionary').DictionaryEntry), text: string}>}
     */
    async _getDictionaryEntry(text, optionsContext, type) {
        let dictionaryEntriesTermKanji = null;
        if (type === 'term') {
            const {dictionaryEntries} = await this._settingsController.application.api.termsFind(text, {}, optionsContext);
            dictionaryEntriesTermKanji = dictionaryEntries;
        }
        if (type === 'kanji') {
            dictionaryEntriesTermKanji = await this._settingsController.application.api.kanjiFind(text[0], optionsContext);
        }

        if (!dictionaryEntriesTermKanji || dictionaryEntriesTermKanji.length === 0) { return null; }

        return {
            dictionaryEntry: /** @type {import('dictionary').DictionaryEntry} */ (dictionaryEntriesTermKanji[0]),
            text: text,
        };
    }

    /**
     * @param {import('dictionary').DictionaryEntry} dictionaryEntry
     * @returns {Array<object>}
     */
    _getDictionaryEntryMedia(dictionaryEntry) {
        if (dictionaryEntry.type !== 'term') {
            return [];
        }
        const media = [];
        const definitions = dictionaryEntry.definitions;
        for (const definition of definitions) {
            const paths = this._findAllPaths(definition);
            for (const path of paths) {
                media.push({dictionary: definition.dictionary, path: path, type: 'dictionaryMedia'});
            }
        }
        return media;
    }

    /**
     * Extracts all values of json keys named `path` which contain a string value.
     * Example json snippet containing a path:
     * ...","path":"example-dictionary/svg/example-media.svg","...
     * The path can be found in many different positions in the structure of the definition json.
     * It is most reliable to flatten it to a string and use regex.
     * @param {object} obj
     * @returns {Array<string>}
     */
    _findAllPaths(obj) {
        return JSON.stringify(obj).match(/(?<="path":").*?(?=")/g) ?? [];
    }

    /**
     * @param {import('settings').ProfileOptions} options
     * @returns {Promise<string>}
     */
    async _getAnkiTemplate(options) {
        let staticTemplates = options.anki.fieldTemplates;
        if (typeof staticTemplates !== 'string') { staticTemplates = this._defaultFieldTemplates; }
        const dictionaryInfo = await this._application.api.getDictionaryInfo();
        const dynamicTemplates = getDynamicTemplates(options, dictionaryInfo);
        return staticTemplates + '\n' + dynamicTemplates;
    }

    /**
     * @param {Event} e
     */
    _onRender(e) {
        e.preventDefault();

        const infoNode = /** @type {HTMLElement} */ (this._renderResult);
        infoNode.hidden = true;
        void this._testNoteData(infoNode, true);
    }

    /** */
    async _updateExampleText() {
        const languageSummaries = await this._application.api.getLanguageSummaries();
        const options = await this._settingsController.getOptions();
        const activeLanguage = /** @type {import('language').LanguageSummary} */ (languageSummaries.find(({iso}) => iso === options.general.language));
        this._renderTextInput.lang = options.general.language;
        this._renderTextInput.value = activeLanguage.exampleText;
        this._renderResult.lang = options.general.language;
    }

    /**
     * @param {import('anki.js').NoteFields} noteFields
     * @returns {string}
     */
    _fieldsToTSV(noteFields) {
        let tsv = '';
        for (const key in noteFields) {
            if (Object.prototype.hasOwnProperty.call(noteFields, key)) {
                tsv += noteFields[key].replaceAll('\t', '&nbsp;&nbsp;&nbsp;').replaceAll('\n', '').replaceAll('\r', '') + '\t';
            }
        }
        return tsv;
    }

    /**
     * @param {Blob} blob
     * @param {string} fileName
     */
    _saveBlob(blob, fileName) {
        if (
            typeof navigator === 'object' && navigator !== null &&
            // @ts-expect-error - call for legacy Edge
            typeof navigator.msSaveBlob === 'function' &&
            // @ts-expect-error - call for legacy Edge
            navigator.msSaveBlob(blob)
        ) {
            return;
        }

        const blobUrl = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = fileName;
        a.rel = 'noopener';
        a.target = '_blank';

        const revoke = () => {
            URL.revokeObjectURL(blobUrl);
            a.href = '';
            this._settingsExportRevoke = null;
        };
        this._settingsExportRevoke = revoke;

        a.dispatchEvent(new MouseEvent('click'));
        setTimeout(revoke, 60000);
    }
}
