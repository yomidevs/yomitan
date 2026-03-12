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

import {describe, expect, vi} from 'vitest';
import {DisplayAnki} from '../ext/js/display/display-anki.js';
import {createDomTest} from './fixtures/dom-test.js';

const test = createDomTest();

/**
 * @param {string} text
 * @returns {import('dictionary').TermSource}
 */
function createSource(text) {
    return {
        originalText: text,
        transformedText: text,
        deinflectedText: text,
        matchType: 'exact',
        matchSource: 'term',
        isPrimary: true,
    };
}

/**
 * @returns {import('dictionary').DictionaryEntry}
 */
function createTermEntry() {
    return /** @type {import('dictionary').DictionaryEntry} */ ({
        type: 'term',
        headwords: [
            {
                term: 'term',
                reading: 'reading',
                sources: [createSource('term')],
            },
        ],
    });
}

/**
 * @returns {import('settings').AnkiCardFormat}
 */
function createCardFormat() {
    return {
        type: 'term',
        name: 'Expression',
        deck: 'Deck',
        model: 'Model',
        fields: {
            Front: {
                value: '{first}',
                overwriteMode: 'overwrite',
            },
        },
        icon: 'big-circle',
    };
}

/**
 * @returns {import('settings').AnkiCardFormat}
 */
function createFastProbeCardFormat() {
    return {
        type: 'term',
        name: 'Expression',
        deck: 'Deck',
        model: 'Model',
        fields: {
            Front: {
                value: '{expression}',
                overwriteMode: 'overwrite',
            },
        },
        icon: 'big-circle',
    };
}

/**
 * @param {Document} document
 * @returns {void}
 */
function setupDocument(document) {
    global.chrome = /** @type {typeof chrome} */ ({
        runtime: {
            getURL: (path) => path,
        },
    });
    document.body.innerHTML = `
        <div id="popup-menus"></div>
        <template id="action-button-container-template">
            <div class="action-button-container">
                <button type="button" class="action-button" data-action="save-note">
                    <span class="action-icon icon color-icon" data-icon=""></span>
                </button>
            </div>
        </template>
        <template id="note-action-button-view-note-template">
            <button type="button" class="action-button" data-action="view-note" hidden disabled title="View added note">
                <span class="action-icon icon color-icon" data-icon="view-note"></span>
                <span class="action-button-badge icon"></span>
            </button>
        </template>
        <template id="note-action-button-view-tags-template">
            <button type="button" class="action-button" data-action="view-tags" hidden disabled>
                <span class="action-icon icon" data-icon="tag"></span>
            </button>
        </template>
        <template id="note-action-button-view-flags-template">
            <button type="button" class="action-button" data-action="view-flags" hidden disabled>
                <span class="action-icon icon" data-icon="flag"></span>
            </button>
        </template>
    `;
}

/**
 * @param {Document} document
 * @param {import('dictionary').DictionaryEntry[]} dictionaryEntries
 * @param {Partial<Record<string, unknown>>} [apiOverrides]
 * @returns {{display: any, api: any}}
 */
function createDisplay(document, dictionaryEntries, apiOverrides = {}) {
    const dictionaryEntryNodes = dictionaryEntries.map(() => {
        const node = document.createElement('div');
        node.className = 'entry';
        node.innerHTML = '<div class="note-actions-container"></div>';
        document.body.appendChild(node);
        return node;
    });

    const api = {
        getAnkiNoteInfo: vi.fn(async () => []),
        isAnkiConnected: vi.fn(async () => true),
        addAnkiNote: vi.fn(async () => 42),
        updateAnkiNote: vi.fn(async () => {}),
        getDictionaryInfo: vi.fn(async () => []),
        getDefaultAnkiFieldTemplates: vi.fn(async () => ''),
        forceSync: vi.fn(async () => {}),
        ...apiOverrides,
    };

    const displayGenerator = {
        /**
         * @param {string} name
         * @returns {Node|null}
         */
        instantiateTemplate(name) {
            const template = document.querySelector(`#${name}-template`);
            if (!(template instanceof HTMLTemplateElement)) { return null; }
            const {firstElementChild} = template.content;
            return firstElementChild === null ? null : firstElementChild.cloneNode(true);
        },
        createAnkiNoteErrorsNotificationContent() {
            return document.createElement('div');
        },
    };

    const hotkeyHelpController = {
        setHotkeyLabel: vi.fn(),
        getHotkeyLabel: vi.fn(() => null),
        setupNode: vi.fn(),
    };

    const display = {
        application: {api},
        hotkeyHandler: {registerActions: vi.fn()},
        on: vi.fn(),
        displayGenerator,
        dictionaryEntries,
        dictionaryEntryNodes,
        getOptions: () => ({anki: {enable: true}}),
        getContentOrigin: () => ({tabId: 1, frameId: 0}),
        getOptionsContext: () => /** @type {import('settings').OptionsContext} */ ({current: true}),
        getLanguageSummary: () => ({}),
        createNotification: () => ({setContent: vi.fn(), open: vi.fn(), close: vi.fn()}),
        progressIndicatorVisible: {
            setOverride: vi.fn(() => 1),
            clearOverride: vi.fn(),
        },
        _hotkeyHelpController: hotkeyHelpController,
    };

    return {
        display: /** @type {import('../ext/js/display/display.js').Display} */ (/** @type {unknown} */ (display)),
        api,
    };
}

/**
 * @param {number} noteId
 * @param {string} value
 * @returns {import('anki').NoteInfo}
 */
function createNoteInfo(noteId, value) {
    return {
        noteId,
        tags: [],
        fields: {
            Front: {value, order: 0},
        },
        modelName: 'Model',
        cards: [noteId],
        cardsInfo: [
            {
                noteId,
                cardId: noteId,
                flags: 0,
                cardState: 0,
            },
        ],
    };
}

/**
 * @returns {import('../ext/js/display/display-audio.js').DisplayAudio}
 */
function createDisplayAudio() {
    return /** @type {import('../ext/js/display/display-audio.js').DisplayAudio} */ (
        /** @type {unknown} */ ({
            getAnkiNoteMediaAudioDetails: vi.fn(() => ({
                sources: [],
                preferredAudioIndex: null,
                enableDefaultAudioSources: true,
            })),
        })
    );
}

/**
 * @param {string} front
 * @returns {import('anki').Note}
 */
function createCollectionNote(front) {
    return {
        fields: {Front: front},
        tags: [],
        deckName: 'Deck',
        modelName: 'Model',
        options: {
            allowDuplicate: true,
            duplicateScope: 'collection',
            duplicateScopeOptions: {
                deckName: null,
                checkChildren: false,
                checkAllModels: false,
            },
        },
    };
}

describe('DisplayAnki preload and save flow', () => {
    test('preload uses duplicate-check notes instead of full note creation', {timeout: 15_000}, async ({window}) => {
        setupDocument(window.document);
        const dictionaryEntries = [createTermEntry()];
        const {display, api} = createDisplay(window.document, dictionaryEntries, {
            getAnkiNoteInfo: vi.fn(async () => [{
                canAdd: true,
                valid: true,
                isDuplicate: true,
                noteIds: [123],
                noteInfos: [createNoteInfo(123, 'existing')],
            }]),
        });
        const displayAnki = new DisplayAnki(display, createDisplayAudio());
        displayAnki._checkForDuplicates = true;
        displayAnki._duplicateBehavior = 'overwrite';
        displayAnki._displayTagsAndFlags = 'never';
        displayAnki._cardFormats = [createFastProbeCardFormat()];
        displayAnki._dictionaryEntryDetails = null;

        const createDuplicateCheckNoteFastSpy = vi.spyOn(displayAnki, '_tryCreateDuplicateCheckNoteFast');
        const createNoteSpy = vi.spyOn(displayAnki, '_createNote');

        await displayAnki._updateDictionaryEntryDetails();

        expect(createDuplicateCheckNoteFastSpy).toHaveBeenCalledTimes(1);
        expect(createNoteSpy).not.toHaveBeenCalled();
        expect(api.getAnkiNoteInfo).toHaveBeenCalledWith([{
            fields: {Front: 'term'},
            tags: [],
            deckName: 'Deck',
            modelName: 'Model',
            options: {
                allowDuplicate: true,
                duplicateScope: 'collection',
                duplicateScopeOptions: {
                    deckName: null,
                    checkChildren: false,
                    checkAllModels: false,
                },
            },
        }], true, true);

        const saveButton = display.dictionaryEntryNodes[0].querySelector('.action-button[data-action="save-note"]');
        const viewNoteButton = display.dictionaryEntryNodes[0].querySelector('.action-button[data-action="view-note"]');
        expect(saveButton?.dataset.overwrite).toBe('true');
        expect(viewNoteButton?.dataset.noteIds).toBe('123');
    });

    test('preload fast path skips template fetching for standard duplicate probes', async ({window}) => {
        setupDocument(window.document);
        const dictionaryEntries = [createTermEntry()];
        const {display, api} = createDisplay(window.document, dictionaryEntries, {
            getAnkiNoteInfo: vi.fn(async () => [{
                canAdd: true,
                valid: true,
                isDuplicate: false,
                noteIds: null,
                noteInfos: [],
            }]),
        });
        const displayAnki = new DisplayAnki(display, createDisplayAudio());
        displayAnki._checkForDuplicates = true;
        displayAnki._duplicateBehavior = 'prevent';
        displayAnki._displayTagsAndFlags = 'never';
        displayAnki._cardFormats = [createFastProbeCardFormat()];
        displayAnki._dictionaryEntryDetails = null;

        await displayAnki._updateDictionaryEntryDetails();

        expect(api.getDefaultAnkiFieldTemplates).not.toHaveBeenCalled();
        expect(api.getDictionaryInfo).not.toHaveBeenCalled();
        expect(api.getAnkiNoteInfo).toHaveBeenCalledWith([
            {
                fields: {Front: 'term'},
                tags: [],
                deckName: 'Deck',
                modelName: 'Model',
                options: {
                    allowDuplicate: true,
                    duplicateScope: 'collection',
                    duplicateScopeOptions: {
                        deckName: null,
                        checkChildren: false,
                        checkAllModels: false,
                    },
                },
            },
        ], false, false);
    });

    test('cold save performs the two-pass note build before adding a note', async ({window}) => {
        setupDocument(window.document);
        const dictionaryEntries = [createTermEntry()];
        const {display, api} = createDisplay(window.document, dictionaryEntries);
        const displayAnki = new DisplayAnki(display, createDisplayAudio());
        const cardFormat = createCardFormat();
        displayAnki._cardFormats = [cardFormat];
        displayAnki._duplicateBehavior = 'new';
        displayAnki._dictionaryEntryDetails = /** @type {import('display-anki').DictionaryEntryDetails[]} */ ([{
            noteMap: new Map([[0, {
                cardFormat,
                canAdd: true,
                valid: true,
                isDuplicate: false,
                noteIds: null,
                ankiError: null,
            }]]),
        }]);

        const dictionaryEntryDetails = displayAnki._dictionaryEntryDetails;
        if (dictionaryEntryDetails === null) {
            throw new Error('Expected dictionary entry details');
        }
        displayAnki._updateSaveButtons(dictionaryEntryDetails);

        const initialNote = createCollectionNote('initial');
        const finalNote = {...initialNote, fields: {Front: 'final'}};

        const createNoteSpy = vi.spyOn(displayAnki, '_createNote')
            .mockResolvedValueOnce({note: initialNote, errors: [], requirements: [{type: 'audio'}]})
            .mockResolvedValueOnce({note: finalNote, errors: [], requirements: []});

        await displayAnki._saveAnkiNote(0, 0);

        expect(createNoteSpy).toHaveBeenNthCalledWith(1, dictionaryEntries[0], 0, []);
        expect(createNoteSpy).toHaveBeenNthCalledWith(2, dictionaryEntries[0], 0, [{type: 'audio'}]);
        expect(api.addAnkiNote).toHaveBeenCalledWith(finalNote);
    });

    test('prevent duplicate mode disables save without fetching duplicate note ids', async ({window}) => {
        setupDocument(window.document);
        const dictionaryEntries = [createTermEntry()];
        const {display, api} = createDisplay(window.document, dictionaryEntries, {
            getAnkiNoteInfo: vi.fn(async () => [{
                canAdd: true,
                valid: true,
                isDuplicate: true,
                noteIds: null,
                noteInfos: [],
            }]),
        });
        const displayAnki = new DisplayAnki(display, createDisplayAudio());
        displayAnki._checkForDuplicates = true;
        displayAnki._duplicateBehavior = 'prevent';
        displayAnki._displayTagsAndFlags = 'never';
        displayAnki._cardFormats = [createFastProbeCardFormat()];
        displayAnki._dictionaryEntryDetails = null;

        await displayAnki._updateDictionaryEntryDetails();

        expect(api.getAnkiNoteInfo).toHaveBeenCalledWith([{
            fields: {Front: 'term'},
            tags: [],
            deckName: 'Deck',
            modelName: 'Model',
            options: {
                allowDuplicate: true,
                duplicateScope: 'collection',
                duplicateScopeOptions: {
                    deckName: null,
                    checkChildren: false,
                    checkAllModels: false,
                },
            },
        }], false, false);
        const saveButton = display.dictionaryEntryNodes[0].querySelector('.action-button[data-action="save-note"]');
        expect(saveButton?.disabled).toBe(true);
    });

    test('new duplicate mode fetches duplicate note ids lazily after the initial status check', async ({window}) => {
        setupDocument(window.document);
        const dictionaryEntries = [createTermEntry()];
        const getAnkiNoteInfo = vi.fn()
            .mockResolvedValueOnce([{
                canAdd: true,
                valid: true,
                isDuplicate: true,
                noteIds: null,
                noteInfos: [],
            }])
            .mockResolvedValueOnce([{
                canAdd: true,
                valid: true,
                isDuplicate: true,
                noteIds: [123],
                noteInfos: [],
            }]);
        const {display} = createDisplay(window.document, dictionaryEntries, {getAnkiNoteInfo});
        const displayAnki = new DisplayAnki(display, createDisplayAudio());
        displayAnki._checkForDuplicates = true;
        displayAnki._duplicateBehavior = 'new';
        displayAnki._displayTagsAndFlags = 'never';
        displayAnki._cardFormats = [createFastProbeCardFormat()];
        displayAnki._dictionaryEntryDetails = null;

        await displayAnki._updateDictionaryEntryDetails();
        await new Promise((resolve) => {
            setTimeout(resolve, 0);
        });

        expect(getAnkiNoteInfo).toHaveBeenNthCalledWith(1, [{
            fields: {Front: 'term'},
            tags: [],
            deckName: 'Deck',
            modelName: 'Model',
            options: {
                allowDuplicate: true,
                duplicateScope: 'collection',
                duplicateScopeOptions: {
                    deckName: null,
                    checkChildren: false,
                    checkAllModels: false,
                },
            },
        }], false, false);
        expect(getAnkiNoteInfo).toHaveBeenNthCalledWith(2, [{
            fields: {Front: 'term'},
            tags: [],
            deckName: 'Deck',
            modelName: 'Model',
            options: {
                allowDuplicate: true,
                duplicateScope: 'collection',
                duplicateScopeOptions: {
                    deckName: null,
                    checkChildren: false,
                    checkAllModels: false,
                },
            },
        }], false, true);

        const saveButton = display.dictionaryEntryNodes[0].querySelector('.action-button[data-action="save-note"]');
        const viewNoteButton = display.dictionaryEntryNodes[0].querySelector('.action-button[data-action="view-note"]');
        expect(saveButton?.title).toBe('Add duplicate Expression note');
        expect(viewNoteButton?.dataset.noteIds).toBe('123');
    });

    test('overwrite uses cached duplicate metadata without recomputing popup details', async ({window}) => {
        setupDocument(window.document);
        const dictionaryEntries = [createTermEntry()];
        const {display, api} = createDisplay(window.document, dictionaryEntries);
        const displayAnki = new DisplayAnki(display, createDisplayAudio());
        const cardFormat = createCardFormat();
        displayAnki._cardFormats = [cardFormat];
        displayAnki._duplicateBehavior = 'overwrite';
        displayAnki._dictionaryEntryDetails = [{
            noteMap: new Map([[0, {
                cardFormat,
                canAdd: true,
                valid: true,
                isDuplicate: true,
                noteIds: [123],
                noteInfos: [createNoteInfo(123, 'existing value')],
                ankiError: null,
            }]]),
        }];

        displayAnki._updateSaveButtons(displayAnki._dictionaryEntryDetails);

        const note = createCollectionNote('updated value');

        const getDictionaryEntryDetailsSpy = vi.spyOn(displayAnki, '_getDictionaryEntryDetails');
        vi.spyOn(displayAnki, '_createNote')
            .mockResolvedValueOnce({note, errors: [], requirements: []})
            .mockResolvedValueOnce({note, errors: [], requirements: []});

        await displayAnki._saveAnkiNote(0, 0);

        expect(getDictionaryEntryDetailsSpy).not.toHaveBeenCalled();
        expect(api.updateAnkiNote).toHaveBeenCalledWith({
            ...note,
            id: 123,
        });
    });
});
