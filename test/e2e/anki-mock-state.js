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

import {INVALID_NOTE_ID} from '../../ext/js/data/anki-util.js';

export const ankiDuplicateErrorText = 'cannot create note because it is a duplicate';

/**
 * @typedef {{
 *   noteId: number,
 *   cardId: number,
 *   deckName: string,
 *   modelName: string,
 *   fields: Record<string, string>,
 *   tags: string[],
 *   queue: number,
 *   flags: number,
 *   findable: boolean,
 * }} MockStoredNote
 */

/**
 * @typedef {{
 *   sequence: number,
 *   atIso: string,
 *   scenarioId: string,
 *   action: string,
 *   params: Record<string, unknown>,
 *   result: unknown,
 *   error: string|null,
 * }} MockActionLog
 */

/**
 * @param {unknown} value
 * @returns {Record<string, unknown>|null}
 */
function asRecord(value) {
    return (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value)
    ) ?
        /** @type {Record<string, unknown>} */ (value) :
        null;
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function errorMessage(value) {
    return value instanceof Error ? value.message : String(value);
}

/**
 * @param {Record<string, string>} fields
 * @returns {{name: string, value: string}|null}
 */
function getPrimaryField(fields) {
    for (const [name, value] of Object.entries(fields)) {
        if (typeof value === 'string') {
            return {name, value};
        }
    }
    return null;
}

/**
 * @param {string} query
 * @returns {{deckQuery: string|null, fieldName: string|null, fieldValue: string|null}}
 */
function parseFindNotesQuery(query) {
    /** @type {string[]} */
    const tokens = [];
    const pattern = /"([^"]+)"/g;
    while (true) {
        const match = pattern.exec(query);
        if (match === null) { break; }
        tokens.push(match[1]);
    }
    if (tokens.length === 0 && query.trim().length > 0) {
        tokens.push(query.trim());
    }
    let deckQuery = null;
    let fieldName = null;
    let fieldValue = null;
    for (const token of tokens) {
        const index = token.indexOf(':');
        if (index < 0) { continue; }
        const key = token.slice(0, index).trim();
        const value = token.slice(index + 1).trim();
        if (key.length === 0) { continue; }
        if (key.toLowerCase() === 'deck') {
            deckQuery = value;
        } else {
            fieldName = key;
            fieldValue = value;
        }
    }
    return {deckQuery, fieldName, fieldValue};
}

/**
 * @param {MockStoredNote} candidate
 * @param {string} deckQuery
 * @returns {boolean}
 */
function matchesDeckQuery(candidate, deckQuery) {
    return (
        candidate.deckName === deckQuery ||
        candidate.deckName.startsWith(`${deckQuery}::`)
    );
}

/**
 * @param {MockStoredNote} candidate
 * @param {import('anki').Note} note
 * @returns {boolean}
 */
function matchesDuplicateScope(candidate, note) {
    const options = asRecord(note.options);
    const scopeRaw = typeof options?.duplicateScope === 'string' ? options.duplicateScope : 'collection';
    const scopeOptions = asRecord(options?.duplicateScopeOptions);
    const checkChildren = scopeOptions?.checkChildren === true;
    const deckNameOption = typeof scopeOptions?.deckName === 'string' ? scopeOptions.deckName : '';
    const effectiveDeck = deckNameOption.length > 0 ? deckNameOption : String(note.deckName || '');
    if (scopeRaw === 'collection') {
        return true;
    }
    if (scopeRaw === 'deck-root') {
        const root = effectiveDeck.split('::')[0] || effectiveDeck;
        return matchesDeckQuery(candidate, root);
    }
    if (scopeRaw === 'deck') {
        if (checkChildren) {
            return matchesDeckQuery(candidate, effectiveDeck);
        }
        return candidate.deckName === effectiveDeck;
    }
    return true;
}

/**
 * @param {MockStoredNote} candidate
 * @param {import('anki').Note} note
 * @returns {boolean}
 */
function matchesDuplicateModel(candidate, note) {
    const options = asRecord(note.options);
    const scopeOptions = asRecord(options?.duplicateScopeOptions);
    const checkAllModels = scopeOptions?.checkAllModels === true;
    if (checkAllModels) {
        return true;
    }
    return candidate.modelName === String(note.modelName || '');
}

/**
 * @param {MockStoredNote} candidate
 * @param {import('anki').Note} note
 * @returns {boolean}
 */
function matchesDuplicateField(candidate, note) {
    const noteFields = asRecord(note.fields);
    if (noteFields === null) {
        return false;
    }
    /** @type {Record<string, string>} */
    const normalizedFields = {};
    for (const [name, value] of Object.entries(noteFields)) {
        normalizedFields[name] = String(value ?? '');
    }
    const notePrimaryField = getPrimaryField(normalizedFields);
    if (notePrimaryField === null) {
        return false;
    }
    const candidatePrimaryField = getPrimaryField(candidate.fields);
    if (candidatePrimaryField === null) {
        return false;
    }
    return (
        candidatePrimaryField.name.toLowerCase() === notePrimaryField.name.toLowerCase() &&
        candidatePrimaryField.value === notePrimaryField.value
    );
}

/**
 * @param {unknown} value
 * @returns {MockStoredNote[]}
 */
function normalizeSeedNotes(value) {
    if (!Array.isArray(value)) {
        return [];
    }
    /** @type {MockStoredNote[]} */
    const notes = [];
    for (const item of value) {
        const record = asRecord(item);
        if (record === null) { continue; }
        const fieldsRecord = asRecord(record.fields);
        /** @type {Record<string, string>} */
        const fields = {};
        if (fieldsRecord !== null) {
            for (const [name, fieldValue] of Object.entries(fieldsRecord)) {
                fields[name] = String(fieldValue ?? '');
            }
        }
        notes.push({
            noteId: Number(record.noteId),
            cardId: Number(record.cardId),
            deckName: String(record.deckName || ''),
            modelName: String(record.modelName || ''),
            fields,
            tags: Array.isArray(record.tags) ? record.tags.map((tag) => String(tag || '')) : [],
            queue: Number.isFinite(Number(record.queue)) ? Number(record.queue) : 0,
            flags: Number.isFinite(Number(record.flags)) ? Number(record.flags) : 0,
            findable: record.findable !== false,
        });
    }
    return notes;
}

/**
 * @returns {{
 *   beginScenario: (scenarioId: string, seedNotes: unknown[]) => void,
 *   handleRequestBody: (body: unknown) => {result: unknown, error: string|null},
 *   getScenarioState: () => {scenarioId: string, actions: MockActionLog[], snapshots: unknown[]},
 *   getActionNames: () => string[],
 * }}
 */
export function createAnkiMockState() {
    /** @type {MockStoredNote[]} */
    let notes = [];
    /** @type {MockActionLog[]} */
    let actions = [];
    /** @type {unknown[]} */
    let snapshots = [];
    let scenarioId = 'uninitialized';
    let sequence = 0;
    let nextNoteId = 10_000;
    let nextCardId = 20_000;

    /**
     * @param {string} reason
     */
    const captureSnapshot = (reason) => {
        snapshots.push({
            reason,
            scenarioId,
            atIso: new Date().toISOString(),
            noteCount: notes.length,
            notes: notes.map((item) => ({
                noteId: item.noteId,
                cardId: item.cardId,
                deckName: item.deckName,
                modelName: item.modelName,
                fields: structuredClone(item.fields),
                findable: item.findable,
            })),
        });
    };

    /**
     * @param {string} action
     * @param {Record<string, unknown>} params
     * @param {unknown} result
     * @param {string|null} error
     */
    const appendActionLog = (action, params, result, error) => {
        sequence += 1;
        actions.push({
            sequence,
            atIso: new Date().toISOString(),
            scenarioId,
            action,
            params: structuredClone(params),
            result: structuredClone(result),
            error,
        });
    };

    /**
     * @param {import('anki').Note} note
     * @param {{includeUnfindable: boolean}} options
     * @returns {MockStoredNote[]}
     */
    const findDuplicatesForNote = (note, {includeUnfindable}) => {
        return notes.filter((candidate) => {
            if (!includeUnfindable && !candidate.findable) {
                return false;
            }
            return (
                matchesDuplicateScope(candidate, note) &&
                matchesDuplicateModel(candidate, note) &&
                matchesDuplicateField(candidate, note)
            );
        });
    };

    /**
     * @param {import('anki').Note} note
     * @returns {boolean}
     */
    const canAddWithDuplicateSettings = (note) => {
        const options = asRecord(note.options);
        const allowDuplicate = options?.allowDuplicate === true;
        if (allowDuplicate) {
            return true;
        }
        const duplicates = findDuplicatesForNote(note, {includeUnfindable: true});
        return duplicates.length === 0;
    };

    /**
     * @param {import('anki').Note} note
     * @returns {number[]}
     */
    const findNotesForNote = (note) => {
        return findDuplicatesForNote(note, {includeUnfindable: false}).map((item) => item.noteId);
    };

    /**
     * @param {Record<string, unknown>} params
     * @returns {unknown}
     */
    const invokeAction = (params) => {
        const action = String(params.action || '');
        const payload = asRecord(params.params) || {};
        switch (action) {
            case 'version':
                return 6;
            case 'canAddNotesWithErrorDetail': {
                const notesParam = Array.isArray(payload.notes) ? payload.notes : [];
                return notesParam.map((item) => {
                    const note = /** @type {import('anki').Note} */ (item);
                    const canAdd = canAddWithDuplicateSettings(note);
                    return {
                        canAdd,
                        error: canAdd ? null : ankiDuplicateErrorText,
                    };
                });
            }
            case 'canAddNotes': {
                const notesParam = Array.isArray(payload.notes) ? payload.notes : [];
                return notesParam.map((item) => {
                    const note = /** @type {import('anki').Note} */ (item);
                    return canAddWithDuplicateSettings(note);
                });
            }
            case 'findNotes': {
                const query = String(payload.query || '');
                const {deckQuery, fieldName, fieldValue} = parseFindNotesQuery(query);
                return notes.filter((item) => {
                    if (!item.findable) { return false; }
                    if (deckQuery !== null && !matchesDeckQuery(item, deckQuery)) {
                        return false;
                    }
                    if (fieldName !== null && fieldValue !== null) {
                        const fieldsLower = Object.fromEntries(
                            Object.entries(item.fields).map(([name, value]) => [name.toLowerCase(), value]),
                        );
                        if (fieldsLower[fieldName.toLowerCase()] !== fieldValue) {
                            return false;
                        }
                    }
                    return true;
                }).map((item) => item.noteId);
            }
            case 'multi': {
                const actionsParam = Array.isArray(payload.actions) ? payload.actions : [];
                return actionsParam.map((entry) => {
                    const row = asRecord(entry);
                    if (row === null) {
                        return null;
                    }
                    return invokeAction(row);
                });
            }
            case 'notesInfo': {
                const noteIds = Array.isArray(payload.notes) ? payload.notes.map((item) => Number(item)) : [];
                return noteIds.map((noteId) => {
                    const note = notes.find((item) => item.noteId === noteId) || null;
                    if (note === null) {
                        return null;
                    }
                    const fields = Object.fromEntries(
                        Object.entries(note.fields).map(([name, value], index) => [name, {value, order: index}]),
                    );
                    return {
                        noteId: note.noteId,
                        tags: [...note.tags],
                        fields,
                        modelName: note.modelName,
                        cards: [note.cardId],
                    };
                });
            }
            case 'cardsInfo': {
                const cardIds = Array.isArray(payload.cards) ? payload.cards.map((item) => Number(item)) : [];
                return cardIds.map((cardId) => {
                    const note = notes.find((item) => item.cardId === cardId) || null;
                    if (note === null) {
                        return null;
                    }
                    return {
                        cardId,
                        note: note.noteId,
                        flags: note.flags,
                        queue: note.queue,
                    };
                });
            }
            case 'deckNames': {
                return [...new Set(notes.map((item) => item.deckName))];
            }
            case 'modelNames': {
                return [...new Set(notes.map((item) => item.modelName))];
            }
            case 'modelFieldNames': {
                return ['Front', 'Back'];
            }
            case 'addNote': {
                const noteRecord = asRecord(payload.note);
                if (noteRecord === null) {
                    throw new Error('addNote params.note must be an object');
                }
                const fieldsRecord = asRecord(noteRecord.fields);
                if (fieldsRecord === null) {
                    throw new Error('addNote params.note.fields must be an object');
                }
                /** @type {Record<string, string>} */
                const fields = {};
                for (const [name, value] of Object.entries(fieldsRecord)) {
                    fields[name] = String(value ?? '');
                }
                const noteId = nextNoteId;
                const cardId = nextCardId;
                nextNoteId += 1;
                nextCardId += 1;
                notes.push({
                    noteId,
                    cardId,
                    deckName: String(noteRecord.deckName || ''),
                    modelName: String(noteRecord.modelName || ''),
                    fields,
                    tags: Array.isArray(noteRecord.tags) ? noteRecord.tags.map((tag) => String(tag || '')) : [],
                    queue: 0,
                    flags: 0,
                    findable: true,
                });
                captureSnapshot('addNote');
                return noteId;
            }
            case 'updateNoteFields': {
                const noteWithId = asRecord(payload.note);
                if (noteWithId === null) {
                    throw new Error('updateNoteFields params.note must be an object');
                }
                const noteId = Number(noteWithId.id);
                const target = notes.find((item) => item.noteId === noteId) || null;
                if (target === null) {
                    throw new Error(`note ${String(noteId)} was not found`);
                }
                const fieldsRecord = asRecord(noteWithId.fields);
                if (fieldsRecord !== null) {
                    for (const [name, value] of Object.entries(fieldsRecord)) {
                        target.fields[name] = String(value ?? '');
                    }
                }
                captureSnapshot('updateNoteFields');
                return null;
            }
            default:
                throw new Error('unsupported action');
        }
    };

    return {
        beginScenario(nextScenarioId, seedNotes) {
            scenarioId = String(nextScenarioId || 'unnamed-scenario');
            actions = [];
            snapshots = [];
            notes = normalizeSeedNotes(seedNotes);
            let maxNoteId = 9_999;
            let maxCardId = 19_999;
            for (const note of notes) {
                if (Number.isFinite(note.noteId)) {
                    maxNoteId = Math.max(maxNoteId, note.noteId);
                }
                if (Number.isFinite(note.cardId)) {
                    maxCardId = Math.max(maxCardId, note.cardId);
                }
            }
            nextNoteId = maxNoteId + 1;
            nextCardId = maxCardId + 1;
            captureSnapshot('scenario-start');
        },
        handleRequestBody(body) {
            const request = asRecord(body);
            if (request === null) {
                const error = 'request body must be a JSON object';
                appendActionLog('invalid', {}, null, error);
                return {result: null, error};
            }
            const action = String(request.action || '');
            const params = asRecord(request.params) || {};
            try {
                const result = invokeAction({action, params});
                appendActionLog(action, params, result, null);
                return {result, error: null};
            } catch (e) {
                const message = errorMessage(e);
                appendActionLog(action, params, null, message);
                return {result: null, error: message};
            }
        },
        getScenarioState() {
            return {
                scenarioId,
                actions: structuredClone(actions),
                snapshots: structuredClone(snapshots),
            };
        },
        getActionNames() {
            return actions.map((entry) => entry.action);
        },
    };
}

export {INVALID_NOTE_ID};