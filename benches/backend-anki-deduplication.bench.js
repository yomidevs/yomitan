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

import {bench, describe, vi} from 'vitest';

vi.mock('../ext/lib/kanji-processor.js', () => ({
    /**
     * @param {string} text
     * @returns {string}
     */
    convertVariants: (text) => text,
}));

const {Backend} = await import('../ext/js/background/backend.js');

const benchmarkOptions = Object.freeze({
    time: 3000,
    warmupTime: 1000,
    warmupIterations: 8,
});

const noteCount = 50;
const oversizedFieldValue = 'x'.repeat(4096);
const notes = createNotes(noteCount, oversizedFieldValue);
const backend = /** @type {any} */ (createBackendBenchmarkHarness(notes));

describe('Backend Anki deduplication', () => {
    bench(`Backend._stripNotesArray (n=${noteCount})`, () => {
        backend._stripNotesArray(notes);
    }, benchmarkOptions);

    bench(`Backend.partitionAddibleNotes (n=${noteCount})`, async () => {
        await backend.partitionAddibleNotes(notes);
    }, benchmarkOptions);

    bench(`Backend._onApiGetAnkiNoteInfo - no additional info (n=${noteCount})`, async () => {
        await backend._onApiGetAnkiNoteInfo({notes, fetchAdditionalInfo: false, fetchDuplicateNoteIds: true});
    }, benchmarkOptions);

    bench(`Backend._onApiGetAnkiNoteInfo - duplicate status only (n=${noteCount})`, async () => {
        await backend._onApiGetAnkiNoteInfo({notes, fetchAdditionalInfo: false, fetchDuplicateNoteIds: false});
    }, benchmarkOptions);

    bench(`Backend._onApiGetAnkiNoteInfo - additional info (n=${noteCount})`, async () => {
        await backend._onApiGetAnkiNoteInfo({notes, fetchAdditionalInfo: true, fetchDuplicateNoteIds: true});
    }, benchmarkOptions);
});

/**
 * @param {number} count
 * @param {string} oversizedFieldValue
 * @returns {import('anki').Note[]}
 */
function createNotes(count, oversizedFieldValue) {
    /** @type {import('anki').Note[]} */
    const result = [];
    for (let i = 0; i < count; ++i) {
        result.push(/** @type {import('anki').Note} */ ({
            fields: {
                Front: `term-${i}`,
                Back: oversizedFieldValue,
                Sentence: `${oversizedFieldValue}${i}`,
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
        }));
    }
    return result;
}

/**
 * @param {import('anki').Note[]} notesToDuplicate
 * @returns {any}
 */
function createBackendBenchmarkHarness(notesToDuplicate) {
    const backend = Object.create(Backend.prototype);
    backend._anki = new DuplicateCheckBenchmarkAnki(notesToDuplicate);
    return backend;
}

class DuplicateCheckBenchmarkAnki {
    /**
     * @param {import('anki').Note[]} notesToDuplicate
     */
    constructor(notesToDuplicate) {
        this._duplicateNoteIds = new Map();
        let noteId = 1;
        for (let i = 0; i < notesToDuplicate.length; i += 2) {
            this._duplicateNoteIds.set(getDuplicateNoteKey(notesToDuplicate[i]), noteId);
            noteId += 1;
        }
    }

    /**
     * @param {import('anki').Note[]} notes
     * @returns {Promise<import('anki').CanAddNotesDetail[]>}
     */
    async canAddNotesWithErrorDetail(notes) {
        return notes.map((note) => ({
            canAdd: !this._duplicateNoteIds.has(getDuplicateNoteKey(note)),
            error: this._duplicateNoteIds.has(getDuplicateNoteKey(note)) ? 'cannot create note because it is a duplicate' : null,
        }));
    }

    /**
     * @param {import('anki').Note[]} notes
     * @returns {Promise<import('anki').NoteId[][]>}
     */
    async findNoteIds(notes) {
        return notes.map((note) => {
            const noteId = this._duplicateNoteIds.get(getDuplicateNoteKey(note));
            return typeof noteId === 'number' ? [noteId] : [];
        });
    }

    /**
     * @param {number[]} noteIds
     * @returns {Promise<(?import('anki').NoteInfo)[]>}
     */
    async notesInfo(noteIds) {
        return noteIds.map((noteId) => ({
            noteId,
            fields: {},
            modelName: 'Model',
            cards: [noteId + 1000],
            cardsInfo: [],
            tags: [],
        }));
    }

    /**
     * @param {number[]} cardIds
     * @returns {Promise<(?import('anki').CardInfo)[]>}
     */
    async cardsInfo(cardIds) {
        return cardIds.map((cardId) => ({
            noteId: cardId - 1000,
            cardId,
            cardState: 0,
            flags: 0,
        }));
    }
}

/**
 * @param {import('anki').Note} note
 * @returns {string}
 */
function getDuplicateNoteKey(note) {
    const fieldEntries = Object.entries(note.fields);
    return JSON.stringify([
        note.deckName,
        note.modelName,
        note.options?.duplicateScope ?? null,
        note.options?.duplicateScopeOptions?.deckName ?? null,
        note.options?.duplicateScopeOptions?.checkChildren ?? false,
        note.options?.duplicateScopeOptions?.checkAllModels ?? false,
        fieldEntries[0] ?? null,
    ]);
}
