/*
 * Copyright (C) 2023-2026  Yomitan Authors
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

/* eslint-disable no-underscore-dangle, @typescript-eslint/unbound-method */

import fs from 'fs';
import {afterAll, afterEach, beforeEach, describe, expect, test, vi} from 'vitest';
import {deferPromise} from '../ext/js/core/utilities.js';
import {log} from '../ext/js/core/log.js';
import {INVALID_NOTE_ID} from '../ext/js/data/anki-util.js';
import {DisplayAnki} from '../ext/js/display/display-anki.js';
import {querySelectorNotNull} from '../ext/js/dom/query-selector.js';
import {setupDomTest} from './fixtures/dom-test.js';
import {chrome} from './mocks/common.js';

vi.stubGlobal('chrome', chrome);

const {teardown} = await setupDomTest();
const templates = new DOMParser().parseFromString(fs.readFileSync('ext/templates-display.html', 'utf8'), 'text/html');
afterAll(() => teardown(global));
beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
});

/** @returns {import('settings').AnkiCardFormat} */
function createCardFormat() {
    return {
        type: 'term',
        name: 'Expression',
        deck: 'Default',
        model: 'Basic',
        icon: 'big-circle',
        fields: {
            Word: {value: '{expression}', overwriteMode: 'coalesce'},
            Meaning: {value: '{glossary}', overwriteMode: 'overwrite'},
        },
    };
}

/** @returns {import('anki').Note} */
function createNote() {
    return {deckName: 'Default', modelName: 'Basic', fields: {Word: 'word', Meaning: 'new meaning'}, tags: [], options: {allowDuplicate: true, duplicateScope: 'collection', duplicateScopeOptions: {deckName: null, checkChildren: false, checkAllModels: false}}};
}

/**
 * @param {number} noteId
 * @returns {import('anki').NoteInfo}
 */
function createNoteInfo(noteId) {
    return {noteId, modelName: 'Basic', fields: {Word: {value: 'word', order: 0}, Meaning: {value: 'old meaning', order: 1}}, tags: [], cards: [], cardsInfo: []};
}

/**
 * @param {number[] | null} [noteIds]
 * @param {(import('anki').NoteInfo | null)[]} [noteInfos]
 * @returns {import('anki').NoteInfoWrapper}
 */
function createInfo(noteIds = [10, 20], noteInfos = [createNoteInfo(10), createNoteInfo(20)]) {
    return {valid: true, canAdd: true, noteIds, noteInfos};
}

/**
 * @param {import('settings').AnkiDuplicateBehavior} [behavior]
 * @param {import('anki').NoteInfoWrapper} [info]
 * @returns {{
 *   anki: DisplayAnki,
 *   api: Record<'getAnkiNoteInfo' | 'addAnkiNote' | 'updateAnkiNote' | 'isAnkiConnected' | 'suspendAnkiCardsForNote' | 'forceSync', import('vitest').Mock>,
 *   entry: HTMLElement,
 *   details: import('display-anki').DictionaryEntryNoteDetails,
 *   options: import('settings').ProfileOptions,
 *   button: (action: import('display-anki').NoteAction) => HTMLButtonElement | null,
 *   showErrors: import('vitest').MockInstance,
 * }}
 */
function setup(behavior = 'new-and-overwrite', info = createInfo()) {
    document.body.replaceChildren();
    const menus = document.createElement('div');
    menus.id = 'popup-menus';
    const entries = document.createElement('div');
    entries.id = 'dictionary-entries';
    const entry = document.createElement('div');
    const actions = document.createElement('div');
    actions.className = 'note-actions-container';
    entry.append(actions);
    entries.append(entry);
    document.body.append(menus, entries);
    const api = {
        getAnkiNoteInfo: vi.fn(async () => [info]),
        addAnkiNote: vi.fn(async () => 30),
        updateAnkiNote: vi.fn(async () => null),
        isAnkiConnected: vi.fn(async () => true),
        suspendAnkiCardsForNote: vi.fn(),
        forceSync: vi.fn(),
    };
    const options = /** @type {import('settings').ProfileOptions} */ (/** @type {unknown} */ ({
        general: {},
        dictionaries: [],
        scanning: {},
        anki: {enable: true, tags: [], targetTags: [], cardFormats: [createCardFormat()], screenshot: {}, checkForDuplicates: true, duplicateBehavior: behavior, displayTagsAndFlags: 'never'},
    }));
    const display = {
        application: {api},
        getOptions: () => options,
        dictionaryEntries: [({type: 'term'})],
        dictionaryEntryNodes: [entry],
        selectedIndex: 0,
        getElementDictionaryEntryIndex: () => 0,
        progressIndicatorVisible: {setOverride: vi.fn(), clearOverride: vi.fn()},
        displayGenerator: {
            /**
             * @param {string} name
             * @returns {HTMLElement}
             */
            instantiateTemplate: (name) => {
                const template = /** @type {HTMLTemplateElement} */ (querySelectorNotNull(templates, `#${name}-template`));
                return /** @type {HTMLElement} */ (template.content.firstElementChild?.cloneNode(true));
            },
        },
        _hotkeyHelpController: {setHotkeyLabel: vi.fn(), getHotkeyLabel: vi.fn(), setupNode: vi.fn()},
    };
    const anki = new DisplayAnki(/** @type {import('../ext/js/display/display.js').Display} */ (/** @type {unknown} */ (display)), /** @type {import('../ext/js/display/display-audio.js').DisplayAudio} */ ({}));
    anki._cardFormats = options.anki.cardFormats;
    anki._checkForDuplicates = true;
    anki._duplicateBehavior = behavior;
    const details = {cardFormat: anki._cardFormats[0], note: createNote(), errors: [], requirements: [], ...info, ankiError: null};
    anki._dictionaryEntryDetails = [{noteMap: new Map([[0, details]])}];
    vi.spyOn(anki, '_createNote').mockImplementation(async () => ({note: createNote(), errors: [], requirements: []}));
    const showErrors = vi.spyOn(anki, '_showErrorNotification').mockImplementation(() => {});
    anki._updateSaveButtons(anki._dictionaryEntryDetails);
    /**
     * @param {import('display-anki').NoteAction} action
     * @returns {?HTMLButtonElement}
     */
    const button = (action) => anki._saveButtonFind(0, 0, action);
    return {anki, api, entry, details, options, button, showErrors};
}

/**
 * @param {Promise<void>} promise
 */
async function finish(promise) {
    await vi.runAllTimersAsync();
    await promise;
}

/** @param {DisplayAnki} anki */
function clearContent(anki) {
    anki._onContentClear();
    Object.assign(anki._display, {dictionaryEntries: [], dictionaryEntryNodes: []});
}

describe('Anki duplicate actions', () => {
    test('add duplicate never updates a note and refreshes all duplicate IDs', async () => {
        const {anki, api, button, entry} = setup();
        api.getAnkiNoteInfo.mockResolvedValue([createInfo([10, 20, 30])]);
        const promise = anki._saveAnkiNote(0, 0, 'add-note');
        expect(button('add-note')?.disabled).toBe(true);
        expect(button('update-note')?.disabled).toBe(true);
        await finish(promise);
        expect(api.addAnkiNote).toHaveBeenCalledExactlyOnceWith(createNote());
        expect(api.updateAnkiNote).not.toHaveBeenCalled();
        expect(entry.querySelector('[data-action="view-note"]')?.getAttribute('data-note-ids')).toBe('10 20 30');
        expect(button('add-note')?.disabled).toBe(false);
        expect(button('update-note')?.disabled).toBe(false);
    });

    test('updates only the first compatible returned ID using freshly fetched fields', async () => {
        const {anki, api} = setup();
        const differentModel = {...createNoteInfo(1), modelName: 'Other'};
        const missingField = {...createNoteInfo(2), fields: {Word: {value: 'word', order: 0}}};
        const target = createNoteInfo(20);
        target.fields.Word.value = 'recent manual edit';
        api.getAnkiNoteInfo.mockResolvedValue([createInfo([INVALID_NOTE_ID, 99, 1, 2, 20, 10], [null, differentModel, missingField, createNoteInfo(10), target])]);
        await finish(anki._saveAnkiNote(0, 0, 'update-note'));
        expect(api.updateAnkiNote).toHaveBeenCalledExactlyOnceWith({...createNote(), id: 20, fields: {Word: 'recent manual edit', Meaning: 'new meaning'}});
        expect(api.addAnkiNote).not.toHaveBeenCalled();
        expect(api.getAnkiNoteInfo).toHaveBeenCalledWith([createNote()], true);
    });

    test.each([createInfo([INVALID_NOTE_ID], []), createInfo([99], [null]), createInfo([1], [{...createNoteInfo(1), modelName: 'Other'}])])('disables updates for unavailable targets', (info) => {
        const {button} = setup('new-and-overwrite', info);
        expect(button('add-note')?.disabled).toBe(false);
        expect(button('update-note')?.disabled).toBe(true);
        expect(button('update-note')?.title).toContain('no available duplicate');
    });

    test.each(['deleted', 'write failed'])('reports an update failure (%s) without adding a note', async (failure) => {
        const {anki, api, showErrors} = setup();
        if (failure === 'deleted') {
            api.getAnkiNoteInfo.mockResolvedValue([createInfo(null, [])]);
        } else {
            api.updateAnkiNote.mockRejectedValue(new Error('write failed'));
        }
        await finish(anki._saveAnkiNote(0, 0, 'update-note'));
        expect(api.addAnkiNote).not.toHaveBeenCalled();
        expect(api.updateAnkiNote).toHaveBeenCalledTimes(failure === 'deleted' ? 0 : 1);
        expect(showErrors).toHaveBeenCalledOnce();
    });

    test('keeps both actions locked for a write longer than the double-click cooldown', async () => {
        const {anki, api, button} = setup();
        const pending = deferPromise();
        api.addAnkiNote.mockImplementation(async () => {
            await pending.promise;
            return 30;
        });
        const write = anki._saveAnkiNote(0, 0, 'add-note');
        await vi.advanceTimersByTimeAsync(3000);
        await anki._saveAnkiNote(0, 0, 'update-note');
        await anki._saveAnkiNote(0, 0, 'add-note');
        expect(button('add-note')?.disabled).toBe(true);
        expect(button('update-note')?.disabled).toBe(true);
        expect(api.addAnkiNote).toHaveBeenCalledOnce();
        expect(api.updateAnkiNote).not.toHaveBeenCalled();
        pending.resolve(void 0);
        await finish(write);
        expect(button('add-note')?.disabled).toBe(false);
    });

    test.each([
        ['add-note', 'pending'],
        ['add-note', 'cooldown'],
        ['update-note', 'pending'],
        ['update-note', 'cooldown'],
    ])('keeps rebuilt controls locked during %s (%s)', async (action, phase) => {
        const {anki, api, button, entry, options} = setup();
        const pending = deferPromise();
        const writeApi = action === 'add-note' ? api.addAnkiNote : api.updateAnkiNote;
        writeApi.mockImplementation(async () => {
            await pending.promise;
            return action === 'add-note' ? 30 : null;
        });
        vi.spyOn(anki, '_getAnkiFieldTemplates').mockResolvedValue('template');
        const originalButton = button('add-note');
        const write = anki._saveAnkiNote(0, 0, /** @type {import('display-anki').NoteAction} */ (action));
        await vi.advanceTimersByTimeAsync(0);
        expect(writeApi).toHaveBeenCalledOnce();
        if (phase === 'cooldown') {
            pending.resolve(void 0);
            await vi.advanceTimersByTimeAsync(0);
        }

        const updatedOptions = structuredClone(options);
        const updatedNote = {...createNote(), fields: {Word: 'word', Meaning: 'updated template'}};
        vi.mocked(anki._createNote).mockResolvedValue({note: updatedNote, errors: [], requirements: []});
        anki._display.getOptions = () => updatedOptions;
        anki._onOptionsUpdated({options: updatedOptions});
        await vi.advanceTimersByTimeAsync(0);
        expect(button('add-note')).not.toBe(originalButton);
        expect(button('add-note')?.disabled).toBe(true);
        expect(button('update-note')?.disabled).toBe(true);
        button('add-note')?.click();
        button('update-note')?.click();
        anki._hotkeySaveAnkiNoteForSelectedEntry('0');
        await vi.advanceTimersByTimeAsync(0);
        expect(writeApi).toHaveBeenCalledOnce();

        if (phase === 'pending') {
            await vi.advanceTimersByTimeAsync(3000);
            expect(button('add-note')?.disabled).toBe(true);
            expect(button('update-note')?.disabled).toBe(true);
        }
        api.getAnkiNoteInfo.mockImplementation(async () => [createInfo([10, 20, 30])]);
        pending.resolve(void 0);
        await finish(write);
        expect(button('add-note')?.disabled).toBe(false);
        expect(button('update-note')?.disabled).toBe(false);
        expect(entry.querySelector('[data-action="view-note"]')?.getAttribute('data-note-ids')).toBe('10 20 30');
        expect(api.getAnkiNoteInfo).toHaveBeenLastCalledWith([updatedNote], true);
        expect(api.addAnkiNote).toHaveBeenCalledTimes(action === 'add-note' ? 1 : 0);
        expect(api.updateAnkiNote).toHaveBeenCalledTimes(action === 'update-note' ? 1 : 0);
    });

    test.each(['add-note', 'update-note'])('unlocks rebuilt controls after a failed %s', async (action) => {
        const {anki, api, button, options, showErrors} = setup();
        const pending = deferPromise();
        const writeApi = action === 'add-note' ? api.addAnkiNote : api.updateAnkiNote;
        writeApi.mockImplementationOnce(async () => {
            await pending.promise;
            throw new Error('write failed');
        });
        vi.spyOn(anki, '_getAnkiFieldTemplates').mockResolvedValue('template');
        const write = anki._saveAnkiNote(0, 0, /** @type {import('display-anki').NoteAction} */ (action));
        await vi.advanceTimersByTimeAsync(0);
        anki._onOptionsUpdated({options});
        await vi.advanceTimersByTimeAsync(0);
        expect(button('add-note')?.disabled).toBe(true);
        pending.resolve(void 0);
        await finish(write);
        expect(button('add-note')?.disabled).toBe(false);
        expect(button('update-note')?.disabled).toBe(false);
        expect(showErrors).not.toHaveBeenCalled();
        await finish(anki._saveAnkiNote(0, 0, /** @type {import('display-anki').NoteAction} */ (action)));
        expect(writeApi).toHaveBeenCalledTimes(2);
    });

    test.each(['render', 'target lookup'])('unlocks rebuilt controls after cancelling a pending %s', async (phase) => {
        const {anki, api, button, options} = setup();
        const pending = deferPromise();
        if (phase === 'render') {
            vi.mocked(anki._createNote).mockImplementationOnce(async () => {
                await pending.promise;
                return {note: createNote(), requirements: [], errors: []};
            });
        } else {
            api.getAnkiNoteInfo.mockImplementationOnce(async () => {
                await pending.promise;
                return [createInfo()];
            });
        }
        vi.spyOn(anki, '_getAnkiFieldTemplates').mockResolvedValue('template');
        const write = anki._saveAnkiNote(0, 0, 'update-note');
        await vi.advanceTimersByTimeAsync(0);
        anki._onOptionsUpdated({options});
        await vi.advanceTimersByTimeAsync(0);
        expect(button('add-note')?.disabled).toBe(true);
        expect(button('update-note')?.disabled).toBe(true);
        pending.resolve(void 0);
        await finish(write);
        expect(button('add-note')?.disabled).toBe(false);
        expect(button('update-note')?.disabled).toBe(false);
        expect(api.addAnkiNote).not.toHaveBeenCalled();
        expect(api.updateAnkiNote).not.toHaveBeenCalled();
    });

    test('preserves locks when a format moves while keeping other entries independent', async () => {
        const {anki, api, entry, options} = setup();
        const format = {...createCardFormat(), name: 'Reading'};
        options.anki.cardFormats.push(format);
        const otherEntry = /** @type {HTMLElement} */ (entry.cloneNode(true));
        querySelectorNotNull(otherEntry, '.note-actions-container').replaceChildren();
        entry.after(otherEntry);
        anki._display.dictionaryEntryNodes.push(otherEntry);
        anki._display.dictionaryEntries.push({...anki._display.dictionaryEntries[0]});
        api.getAnkiNoteInfo.mockImplementation(async (notes) => notes.map(() => createInfo()));
        await anki._updateDictionaryEntryDetails();

        const pending = deferPromise();
        const otherPending = deferPromise();
        api.addAnkiNote.mockImplementationOnce(async () => {
            await pending.promise;
            return 30;
        }).mockImplementationOnce(async () => {
            await otherPending.promise;
            return 40;
        });
        const write = anki._saveAnkiNote(0, 1, 'add-note');
        await vi.advanceTimersByTimeAsync(0);
        expect(anki._saveButtonFind(0, 0, 'add-note')?.disabled).toBe(false);
        expect(anki._saveButtonFind(0, 1, 'add-note')?.disabled).toBe(true);

        vi.spyOn(anki, '_getAnkiFieldTemplates').mockResolvedValue('template');
        const updatedOptions = {...options, anki: {...options.anki, cardFormats: [structuredClone(format)]}};
        anki._display.getOptions = () => updatedOptions;
        anki._onOptionsUpdated({options: updatedOptions});
        await vi.advanceTimersByTimeAsync(0);
        expect(anki._saveButtonFind(0, 0, 'add-note')?.disabled).toBe(true);
        expect(anki._saveButtonFind(0, 0, 'update-note')?.disabled).toBe(true);
        expect(anki._saveButtonFind(1, 0, 'add-note')?.disabled).toBe(false);

        const otherWrite = anki._saveAnkiNote(1, 0, 'add-note');
        await vi.advanceTimersByTimeAsync(0);
        expect(api.addAnkiNote).toHaveBeenCalledTimes(2);
        pending.resolve(void 0);
        await finish(write);
        expect(anki._saveButtonFind(0, 0, 'add-note')?.disabled).toBe(false);
        expect(anki._saveButtonFind(1, 0, 'add-note')?.disabled).toBe(true);
        otherPending.resolve(void 0);
        await finish(otherWrite);
        expect(anki._saveButtonFind(1, 0, 'add-note')?.disabled).toBe(false);
    });

    test('does not refresh or unlock a new entry when an old write finishes', async () => {
        const {anki, api} = setup();
        const pending = deferPromise();
        const otherPending = deferPromise();
        api.addAnkiNote.mockImplementationOnce(async () => {
            await pending.promise;
            return 30;
        }).mockImplementationOnce(async () => {
            await otherPending.promise;
            return 40;
        });
        const write = anki._saveAnkiNote(0, 0, 'add-note');
        await vi.advanceTimersByTimeAsync(0);
        const oldEntry = anki._display.dictionaryEntryNodes[0];
        const dictionaryEntry = {...anki._display.dictionaryEntries[0]};
        clearContent(anki);
        const entry = /** @type {HTMLElement} */ (oldEntry.cloneNode(true));
        querySelectorNotNull(entry, '.note-actions-container').replaceChildren();
        oldEntry.replaceWith(entry);
        anki._display.dictionaryEntryNodes.push(entry);
        anki._display.dictionaryEntries.push(dictionaryEntry);
        await anki._updateDictionaryEntryDetails();
        expect(anki._saveButtonFind(0, 0, 'add-note')?.disabled).toBe(false);
        const otherWrite = anki._saveAnkiNote(0, 0, 'add-note');
        await vi.advanceTimersByTimeAsync(0);
        api.getAnkiNoteInfo.mockClear();
        pending.resolve(void 0);
        await finish(write);
        expect(api.getAnkiNoteInfo).not.toHaveBeenCalled();
        expect(anki._saveButtonFind(0, 0, 'add-note')?.disabled).toBe(true);
        otherPending.resolve(void 0);
        await finish(otherWrite);
        expect(anki._saveButtonFind(0, 0, 'add-note')?.disabled).toBe(false);
    });

    test.each([0, 1])('keeps the entry locked until both old writes settle (format %s first)', async (first) => {
        const {anki, api, options} = setup();
        options.anki.cardFormats.push({...createCardFormat(), name: 'Reading'});
        api.getAnkiNoteInfo.mockImplementation(async (notes) => notes.map(() => createInfo()));
        await anki._updateDictionaryEntryDetails();
        const pending = [deferPromise(), deferPromise()];
        api.addAnkiNote.mockImplementationOnce(async () => {
            await pending[0].promise;
            return 30;
        }).mockImplementationOnce(async () => {
            await pending[1].promise;
            return 40;
        });
        const writes = [anki._saveAnkiNote(0, 0, 'add-note'), anki._saveAnkiNote(0, 1, 'add-note')];
        await vi.advanceTimersByTimeAsync(0);
        expect(api.addAnkiNote).toHaveBeenCalledTimes(2);
        vi.spyOn(anki, '_getAnkiFieldTemplates').mockResolvedValue('template');
        anki._onOptionsUpdated({options});
        await vi.advanceTimersByTimeAsync(0);
        pending[first].resolve(void 0);
        await finish(writes[first]);
        for (const index of [0, 1]) {
            expect(anki._saveButtonFind(0, index, 'add-note')?.disabled).toBe(true);
            expect(anki._saveButtonFind(0, index, 'update-note')?.disabled).toBe(true);
        }
        pending[1 - first].resolve(void 0);
        await finish(writes[1 - first]);
        for (const index of [0, 1]) {
            expect(anki._saveButtonFind(0, index, 'add-note')?.disabled).toBe(false);
            expect(anki._saveButtonFind(0, index, 'update-note')?.disabled).toBe(false);
        }
    });

    test.each(['settings', 'navigation', 'disabled'])('discards the final refresh after another %s change', async (change) => {
        const {anki, api, options, button, entry} = setup();
        const pending = deferPromise();
        api.addAnkiNote.mockImplementationOnce(async () => {
            await pending.promise;
            return 30;
        });
        const write = anki._saveAnkiNote(0, 0, 'add-note');
        await vi.advanceTimersByTimeAsync(0);
        vi.spyOn(anki, '_getAnkiFieldTemplates').mockResolvedValue('template');
        anki._onOptionsUpdated({options});
        await vi.advanceTimersByTimeAsync(0);
        const refresh = deferPromise();
        api.getAnkiNoteInfo.mockImplementationOnce(async () => {
            await refresh.promise;
            return [createInfo([30], [createNoteInfo(30)])];
        });
        pending.resolve(void 0);
        await vi.runAllTimersAsync();
        expect(button('add-note')?.disabled).toBe(true);
        expect(button('update-note')?.disabled).toBe(true);
        if (change === 'navigation') {
            clearContent(anki);
        } else {
            const updatedOptions = {...options, anki: {...options.anki, enable: change !== 'disabled'}};
            anki._display.getOptions = () => updatedOptions;
            anki._onOptionsUpdated({options: updatedOptions});
        }
        await vi.advanceTimersByTimeAsync(0);
        refresh.resolve(void 0);
        await finish(write);
        if (change === 'settings') {
            expect(button('add-note')?.disabled).toBe(false);
            expect(button('update-note')?.disabled).toBe(false);
            expect(entry.querySelector('[data-action="view-note"]')?.getAttribute('data-note-ids')).toBe('10 20');
        } else {
            expect(anki._dictionaryEntryDetails).toBeNull();
            expect(button('add-note')).toBeNull();
        }
    });

    test('releases the lock and logs a failure in the final refresh', async () => {
        const {anki, api, options, button} = setup();
        const pending = deferPromise();
        api.addAnkiNote.mockImplementationOnce(async () => {
            await pending.promise;
            return 30;
        });
        const write = anki._saveAnkiNote(0, 0, 'add-note');
        await vi.advanceTimersByTimeAsync(0);
        vi.spyOn(anki, '_getAnkiFieldTemplates').mockResolvedValue('template');
        anki._onOptionsUpdated({options});
        await vi.advanceTimersByTimeAsync(0);
        const error = new Error('render failed');
        vi.mocked(anki._createNote).mockRejectedValueOnce(error);
        const logError = vi.spyOn(log, 'error').mockImplementation(() => {});
        pending.resolve(void 0);
        await finish(write);
        expect(button('add-note')?.disabled).toBe(false);
        expect(button('update-note')?.disabled).toBe(false);
        expect(logError).toHaveBeenCalledExactlyOnceWith(error);
        await finish(anki._saveAnkiNote(0, 0, 'add-note'));
        expect(api.addAnkiNote).toHaveBeenCalledTimes(2);
    });

    test('turns a new note into separate add-duplicate and update actions', async () => {
        const {anki, api, button} = setup('new-and-overwrite', createInfo(null, []));
        expect(button('update-note')).toBeNull();
        api.getAnkiNoteInfo.mockResolvedValue([createInfo([30], [createNoteInfo(30)])]);
        await finish(anki._saveAnkiNote(0, 0, 'add-note'));
        expect(button('add-note')?.title).toContain('Add duplicate');
        expect(button('update-note')?.disabled).toBe(false);
    });

    test.each(['prevent', 'new', 'overwrite', 'new-and-overwrite'])('preserves hotkey behavior for %s', async (behavior) => {
        const {anki, api} = setup(/** @type {import('settings').AnkiDuplicateBehavior} */ (behavior));
        anki._hotkeySaveAnkiNoteForSelectedEntry('0');
        await vi.runAllTimersAsync();
        expect(api.addAnkiNote).toHaveBeenCalledTimes(behavior === 'new' || behavior === 'new-and-overwrite' ? 1 : 0);
        expect(api.updateAnkiNote).toHaveBeenCalledTimes(behavior === 'overwrite' ? 1 : 0);
    });

    test('fetches metadata with hidden tags and flags and hides update when checking is disabled', async () => {
        const {anki, api, button} = setup();
        expect(anki._displayTagsAndFlags).toBe('never');
        expect(anki._isAdditionalInfoEnabled()).toBe(true);
        anki._checkForDuplicates = false;
        anki._updateSaveButtons(/** @type {import('display-anki').DictionaryEntryDetails[]} */ (anki._dictionaryEntryDetails));
        expect(button('update-note')).toBeNull();
        expect(button('add-note')?.title).toBe('Add Expression note');
        await finish(anki._saveAnkiNote(0, 0, 'add-note'));
        expect(api.getAnkiNoteInfo).not.toHaveBeenCalled();
    });

    test('shows two disabled quick-check indicators for combined duplicates', () => {
        const {anki, entry} = setup();
        anki._displayWhetherDupeOrNotAndLoading([{noteMap: new Map([[0, {cardFormat: createCardFormat(), noteIds: [10], ankiError: null}]])}]);
        const buttons = entry.querySelectorAll('button.duplicate-indicator');
        expect(buttons).toHaveLength(2);
        expect([...buttons].every((button) => /** @type {HTMLButtonElement} */ (button).disabled)).toBe(true);
        anki._removeDupeIndicators();
        expect(entry.querySelector('.duplicate-indicator')).toBeNull();
    });

    test.each(['before render', 'before update', 'after write'])('ignores navigation %s', async (when) => {
        const {anki, api, showErrors} = setup();
        const pending = deferPromise();
        if (when === 'before render') {
            vi.mocked(anki._createNote).mockImplementation(async () => {
                await pending.promise;
                return {note: createNote(), requirements: [], errors: []};
            });
        } else if (when === 'before update') {
            api.getAnkiNoteInfo.mockImplementation(async () => {
                await pending.promise;
                return [createInfo()];
            });
        } else {
            api.updateAnkiNote.mockImplementation(async () => {
                await pending.promise;
                return null;
            });
        }
        const write = anki._saveAnkiNote(0, 0, 'update-note');
        await vi.advanceTimersByTimeAsync(0);
        clearContent(anki);
        pending.resolve(void 0);
        await finish(write);
        expect(api.updateAnkiNote).toHaveBeenCalledTimes(when === 'after write' ? 1 : 0);
        expect(api.addAnkiNote).not.toHaveBeenCalled();
        expect(showErrors).not.toHaveBeenCalled();
        expect(anki._dictionaryEntryDetails).toBeNull();
    });

    test('dispatches the clicked action and card format independently', async () => {
        const {anki, api, entry, details} = setup();
        const format = {...createCardFormat(), name: 'Reading', model: 'Reading model'};
        anki._cardFormats.push(format);
        const otherNote = {...createNote(), modelName: format.model};
        const otherDetails = {...details, cardFormat: format, note: otherNote, noteIds: [50], noteInfos: [{...createNoteInfo(50), modelName: format.model}]};
        anki._dictionaryEntryDetails?.[0].noteMap.set(1, otherDetails);
        anki._updateNoteButtons(0, 1, otherDetails);
        vi.mocked(anki._createNote).mockResolvedValue({note: otherNote, errors: [], requirements: []});
        api.getAnkiNoteInfo.mockResolvedValue([otherDetails]);
        const button = /** @type {HTMLButtonElement} */ (querySelectorNotNull(entry, '[data-card-format-index="1"][data-action="update-note"]'));
        button.click();
        await vi.runAllTimersAsync();
        expect(api.updateAnkiNote).toHaveBeenCalledExactlyOnceWith({...otherNote, id: 50});
        expect(api.addAnkiNote).not.toHaveBeenCalled();
        expect(anki._createNote).toHaveBeenCalledWith(expect.anything(), 1, []);
    });

    test('keeps unavailable configurations disabled and disconnected controls hidden', () => {
        const {anki, details, button, entry} = setup();
        details.canAdd = false;
        details.valid = false;
        anki._updateNoteButtons(0, 0, details);
        expect(button('add-note')?.disabled).toBe(true);
        expect(button('update-note')?.disabled).toBe(true);
        details.ankiError = new Error('Anki not connected');
        anki._updateNoteButtons(0, 0, details);
        expect(button('add-note')).toBeNull();
        expect(button('update-note')).toBeNull();
        expect(entry.querySelectorAll('.action-button-container')).toHaveLength(1);
    });

    test('recovers both controls after a failed add without updating a note', async () => {
        const {anki, api, button, showErrors} = setup();
        api.addAnkiNote.mockRejectedValue(new Error('add failed'));
        await finish(anki._saveAnkiNote(0, 0, 'add-note'));
        expect(api.updateAnkiNote).not.toHaveBeenCalled();
        expect(showErrors).toHaveBeenCalledOnce();
        expect(button('add-note')?.disabled).toBe(false);
        expect(button('update-note')?.disabled).toBe(false);
    });

    test('refreshes tags, flags, and view-note state after updating', async () => {
        const {anki, api, entry, details} = setup();
        anki._displayTagsAndFlags = 'always';
        const target = createNoteInfo(10);
        target.tags = ['fresh-tag'];
        target.cardsInfo = [{noteId: 10, cardId: 100, cardState: 2, flags: 1}];
        anki._updateNoteButtons(0, 0, details);
        api.getAnkiNoteInfo.mockResolvedValue([createInfo([10], [target])]);
        await finish(anki._saveAnkiNote(0, 0, 'update-note'));
        expect(entry.querySelector('[data-action="view-tags"]')?.getAttribute('title')).toContain('fresh-tag');
        expect(entry.querySelector('[data-action="view-flags"]')?.getAttribute('title')).toContain('Red');
        expect(entry.querySelector('[data-action="view-note"] .action-icon')?.getAttribute('data-icon')).toBe('view-note-review');
        expect(entry.querySelectorAll('[data-action="view-tags"]')).toHaveLength(1);
    });

    test('ignores a duplicate refresh that finishes after navigation', async () => {
        const {anki, api, entry} = setup();
        const pending = deferPromise();
        api.getAnkiNoteInfo.mockImplementation(async () => {
            await pending.promise;
            return [createInfo([30], [createNoteInfo(30)])];
        });
        const write = anki._saveAnkiNote(0, 0, 'add-note');
        await vi.advanceTimersByTimeAsync(0);
        clearContent(anki);
        pending.resolve(void 0);
        await finish(write);
        expect(anki._dictionaryEntryDetails).toBeNull();
        expect(entry.querySelector('[data-action="view-note"]')?.getAttribute('data-note-ids')).toBe('10 20');
    });

    test('invalidates a pending update when the profile or card formats change', async () => {
        const {anki, api} = setup();
        const pending = deferPromise();
        api.getAnkiNoteInfo.mockImplementation(async () => {
            await pending.promise;
            return [createInfo()];
        });
        vi.spyOn(anki, '_getAnkiFieldTemplates').mockResolvedValue('template');
        vi.spyOn(anki, '_updateDictionaryEntryDetails').mockResolvedValue();
        const write = anki._saveAnkiNote(0, 0, 'update-note');
        await vi.advanceTimersByTimeAsync(0);
        anki._onOptionsUpdated({options: /** @type {import('settings').ProfileOptions} */ (/** @type {unknown} */ ({
            general: {},
            dictionaries: [],
            scanning: {},
            anki: {tags: [], targetTags: [], cardFormats: [], screenshot: {}},
        }))});
        pending.resolve(void 0);
        await finish(write);
        expect(api.updateAnkiNote).not.toHaveBeenCalled();
        expect(api.addAnkiNote).not.toHaveBeenCalled();
    });

    test.each([
        ['coalesce', 'broken nonempty content', 'replacement', 'broken nonempty content'],
        ['coalesce', '', 'replacement', 'replacement'],
        ['coalesce-new', 'old', '', 'old'],
        ['coalesce-new', 'old', 'new', 'new'],
        ['overwrite', 'broken nonempty content', 'replacement', 'replacement'],
        ['skip', 'old', 'new', 'old'],
        ['append', 'old', 'new', 'oldnew'],
        ['prepend', 'old', 'new', 'newold'],
    ])('preserves the %s field policy', (mode, oldValue, newValue, expected) => {
        const {anki} = setup();
        expect(anki._getOverwrittenField(oldValue, newValue, /** @type {import('settings').AnkiNoteFieldOverwriteMode} */ (mode))).toBe(expected);
    });
});

describe('Anki template loading', () => {
    /** @returns {ReturnType<typeof setup> & {options: import('settings').ProfileOptions}} */
    function setupTemplateLoading() {
        const result = setup();
        const {anki, api} = result;
        const options = /** @type {import('settings').ProfileOptions} */ (/** @type {unknown} */ ({
            general: {},
            dictionaries: [],
            scanning: {},
            anki: {enable: true, tags: [], targetTags: [], cardFormats: anki._cardFormats, screenshot: {}, fieldTemplates: 'old template', checkForDuplicates: true},
        }));
        Object.assign(anki._display, {
            getOptions: () => options,
            getContentOrigin: () => ({}),
            getOptionsContext: () => ({}),
        });
        Object.assign(api, {getDictionaryInfo: vi.fn(async () => [])});
        anki._noteContext = {url: '', sentence: {text: '', offset: 0}, documentTitle: '', query: '', fullQuery: ''};
        vi.mocked(anki._createNote).mockRestore();
        vi.spyOn(anki, '_getAnkiNoteMediaAudioDetails').mockReturnValue(null);
        vi.spyOn(anki._ankiNoteBuilder, 'getDictionaryEntryDetailsForNote').mockReturnValue({type: 'kanji', character: '字'});
        vi.spyOn(anki._ankiNoteBuilder, 'createNote').mockResolvedValue({note: createNote(), errors: [], requirements: []});
        return {...result, options};
    }

    test('finishes an obsolete render without treating its uncached template as invalid', async () => {
        const {anki, api} = setupTemplateLoading();
        const pending = /** @type {import('core').DeferredPromiseDetails<import('dictionary-importer').Summary[]>} */ (deferPromise());
        vi.mocked(anki._display.application.api.getDictionaryInfo).mockReturnValueOnce(pending.promise);
        const updateButtons = vi.spyOn(anki, '_updateSaveButtons');
        const render = expect(anki._updateDictionaryEntryDetails()).resolves.toBeUndefined();
        anki._onContentClear();
        pending.resolve([]);
        await render;
        expect(anki._ankiFieldTemplates).toBeNull();
        expect(anki._dictionaryEntryDetails).toBeNull();
        expect(updateButtons).not.toHaveBeenCalled();
        expect(api.addAnkiNote).not.toHaveBeenCalled();
        expect(api.updateAnkiNote).not.toHaveBeenCalled();

        await anki._updateDictionaryEntryDetails();
        expect(anki._ankiFieldTemplates).toBe('old template\n');
        expect(updateButtons).toHaveBeenCalledOnce();
    });

    test('uses each completed load locally without replacing newer settings templates', async () => {
        const {anki, options} = setupTemplateLoading();
        const pending = /** @type {import('core').DeferredPromiseDetails<import('dictionary-importer').Summary[]>} */ (deferPromise());
        vi.mocked(anki._display.application.api.getDictionaryInfo).mockReturnValueOnce(pending.promise);
        const updateButtons = vi.spyOn(anki, '_updateSaveButtons');
        const render = expect(anki._updateDictionaryEntryDetails()).resolves.toBeUndefined();
        const updatedOptions = {...options, anki: {...options.anki, fieldTemplates: 'new template'}};
        anki._display.getOptions = () => updatedOptions;
        anki._onOptionsUpdated({options: updatedOptions});
        await vi.advanceTimersByTimeAsync(0);
        expect(anki._ankiFieldTemplates).toBe('new template\n');
        pending.resolve([]);
        await render;
        await vi.advanceTimersByTimeAsync(0);
        expect(anki._ankiFieldTemplates).toBe('new template\n');
        expect(updateButtons).toHaveBeenCalledOnce();
        expect(anki._dictionaryEntryDetails).not.toBeNull();
        const calls = vi.mocked(anki._ankiNoteBuilder.createNote).mock.calls;
        expect(calls[0][0].template).toBe('old template\n');
        expect(calls[1][0].template).toBe('new template\n');
    });

    test('cancels a preliminary duplicate check during template loading without logging an error', async () => {
        const {anki} = setupTemplateLoading();
        anki._noteDupeCheckFirst = true;
        const pending = /** @type {import('core').DeferredPromiseDetails<import('dictionary-importer').Summary[]>} */ (deferPromise());
        vi.mocked(anki._display.application.api.getDictionaryInfo).mockReturnValueOnce(pending.promise);
        const logError = vi.spyOn(log, 'error').mockImplementation(() => {});
        const indicators = vi.spyOn(anki, '_displayWhetherDupeOrNotAndLoading');
        const render = anki._updateDictionaryEntryDetails();
        await vi.advanceTimersByTimeAsync(0);
        anki._onContentClear();
        pending.resolve([]);
        await render;
        expect(logError).not.toHaveBeenCalled();
        expect(indicators).not.toHaveBeenCalled();
        expect(anki._dictionaryEntryDetails).toBeNull();
    });
});

/* eslint-enable no-underscore-dangle, @typescript-eslint/unbound-method */
