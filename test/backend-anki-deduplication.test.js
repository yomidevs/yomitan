/*
 * Copyright (C) 2026  Yomitan Authors
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

import {describe, expect, test, vi} from 'vitest';

vi.mock('../ext/lib/kanji-processor.js', () => ({
    /**
     * @param {string} text
     * @returns {string}
     */
    convertVariants: (text) => text,
}));

const {Backend} = await import('../ext/js/background/backend.js');

/**
 * @param {string} name
 * @returns {(this: unknown, ...args: unknown[]) => unknown}
 * @throws {Error}
 */
function getBackendMethod(name) {
    const method = Reflect.get(Backend.prototype, name);
    if (typeof method !== 'function') {
        throw new Error(`Expected ${name} method`);
    }
    return method;
}

/**
 * @param {string} front
 * @param {string} back
 * @returns {import('anki').Note}
 */
function createNote(front, back) {
    return {
        fields: {
            Front: front,
            Back: back,
        },
        tags: ['benchmark'],
        deckName: 'deck',
        modelName: 'model',
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

/**
 * @param {import('anki').CanAddNotesDetail[]} canAddNotesWithErrorDetail
 * @param {number[][]} duplicateNoteIds
 * @returns {any}
 */
function createBackendContext(canAddNotesWithErrorDetail, duplicateNoteIds) {
    const notesInfo = vi.fn(async (/** @type {number[]} */ noteIds) => noteIds.map((/** @type {number} */ noteId) => ({
        noteId,
        fields: {},
        modelName: 'Model',
        cards: [noteId + 1000],
        cardsInfo: [],
        tags: [],
    })));
    const cardsInfo = vi.fn(async (/** @type {number[]} */ cardIds) => cardIds.map((/** @type {number} */ cardId) => ({
        noteId: cardId - 1000,
        cardId,
        cardState: 0,
        flags: 0,
    })));
    return /** @type {any} */ ({
        _anki: {
            canAddNotesWithErrorDetail: vi.fn(async () => canAddNotesWithErrorDetail),
            findNoteIds: vi.fn(async () => duplicateNoteIds),
            notesInfo,
            cardsInfo,
        },
        _stripNotesArray: getBackendMethod('_stripNotesArray'),
        _findDuplicates: getBackendMethod('_findDuplicates'),
        _findDuplicatesFallback: getBackendMethod('_findDuplicatesFallback'),
        partitionAddibleNotes: getBackendMethod('partitionAddibleNotes'),
        _notesCardsInfoBatched: getBackendMethod('_notesCardsInfoBatched'),
    });
}

describe('Backend Anki deduplication', () => {
    test('getAnkiNoteInfo looks up duplicate note ids using stripped probe notes', async () => {
        const notes = [
            createNote('term-1', 'back-field-1'),
            createNote('term-2', 'back-field-2'),
        ];
        const context = createBackendContext([
            {canAdd: false, error: 'cannot create note because it is a duplicate'},
            {canAdd: true, error: null},
        ], [[42]]);

        const result = /** @type {import('anki').NoteInfoWrapper[]} */ (
            await getBackendMethod('_onApiGetAnkiNoteInfo').call(context, {notes, fetchAdditionalInfo: false})
        );

        expect(context._anki.findNoteIds).toHaveBeenCalledTimes(1);
        expect(context._anki.findNoteIds).toHaveBeenCalledWith([
            {
                ...notes[0],
                fields: {Front: 'term-1'},
                options: {...notes[0].options, allowDuplicate: false},
            },
        ]);
        expect(result).toStrictEqual([
            {canAdd: true, valid: true, isDuplicate: true, noteIds: [42], noteInfos: []},
            {canAdd: true, valid: true, isDuplicate: false, noteIds: null, noteInfos: []},
        ]);
        expect(notes[0].fields).toStrictEqual({
            Front: 'term-1',
            Back: 'back-field-1',
        });
        expect(notes[0].options.allowDuplicate).toBe(true);
    });

    test('getAnkiNoteInfo can skip duplicate note id lookups when only duplicate status is needed', async () => {
        const notes = [
            createNote('term-1', 'back-field-1'),
            createNote('term-2', 'back-field-2'),
        ];
        const context = createBackendContext([
            {canAdd: false, error: 'cannot create note because it is a duplicate'},
            {canAdd: true, error: null},
        ], [[42]]);

        const result = /** @type {import('anki').NoteInfoWrapper[]} */ (
            await getBackendMethod('_onApiGetAnkiNoteInfo').call(context, {
                notes,
                fetchAdditionalInfo: false,
                fetchDuplicateNoteIds: false,
            })
        );

        expect(context._anki.findNoteIds).not.toHaveBeenCalled();
        expect(result).toStrictEqual([
            {canAdd: true, valid: true, isDuplicate: true, noteIds: null, noteInfos: []},
            {canAdd: true, valid: true, isDuplicate: false, noteIds: null, noteInfos: []},
        ]);
    });

    test('getAnkiNoteInfo batches additional note lookups across duplicates', async () => {
        const notes = [
            createNote('term-1', 'back-field-1'),
            createNote('term-2', 'back-field-2'),
        ];
        const context = createBackendContext([
            {canAdd: false, error: 'cannot create note because it is a duplicate'},
            {canAdd: false, error: 'cannot create note because it is a duplicate'},
        ], [[101], [202]]);

        const result = /** @type {import('anki').NoteInfoWrapper[]} */ (
            await getBackendMethod('_onApiGetAnkiNoteInfo').call(context, {notes, fetchAdditionalInfo: true})
        );

        expect(context._anki.notesInfo).toHaveBeenCalledTimes(1);
        expect(context._anki.notesInfo).toHaveBeenCalledWith([101, 202]);
        expect(context._anki.cardsInfo).toHaveBeenCalledTimes(1);
        expect(context._anki.cardsInfo).toHaveBeenCalledWith([1101, 1202]);
        expect(result.map(({isDuplicate}) => isDuplicate)).toStrictEqual([true, true]);
        expect(result.map(({noteInfos}) => noteInfos?.[0]?.noteId ?? null)).toStrictEqual([101, 202]);
        expect(result.map(({noteInfos}) => noteInfos?.[0]?.cardsInfo.length ?? 0)).toStrictEqual([1, 1]);
    });
});
