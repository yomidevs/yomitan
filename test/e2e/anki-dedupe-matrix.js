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

import {INVALID_NOTE_ID} from './anki-mock-state.js';

export const dedupeDictionaryTitle = 'Anki Dedupe Fixture Dictionary';
export const dedupeSearchTerm = '読む';
export const dedupeDeckName = 'Root::Current';
export const dedupeRootDeckName = 'Root';
export const dedupeModelName = 'Model A';
export const dedupeAlternateModelName = 'Model B';
export const dedupeCardFormatName = 'Primary';
export const dedupeCardFormatIcon = 'big-circle';

/**
 * @typedef {{
 *   checkForDuplicates: boolean,
 *   duplicateBehavior: 'prevent'|'new'|'overwrite',
 *   duplicateScope: 'collection'|'deck'|'deck-root',
 *   duplicateScopeCheckAllModels: boolean,
 * }} DedupeScenarioOptions
 */

/**
 * @typedef {{
 *   disabled: boolean,
 *   title?: string,
 *   icon?: string,
 *   overwrite?: boolean,
 *   viewNoteIds?: string|null,
 * }} DedupeExpectedButtonState
 */

/**
 * @typedef {{
 *   id: string,
 *   description: string,
 *   options: DedupeScenarioOptions,
 *   seedNotes: unknown[],
 *   expected: {
 *     button: DedupeExpectedButtonState,
 *     writeAction: 'addNote'|'updateNoteFields'|'none',
 *   },
 * }} DedupeScenario
 */

/**
 * @param {{
 *   noteId: number,
 *   cardId?: number,
 *   deckName?: string,
 *   modelName?: string,
 *   front?: string,
 *   back?: string,
 *   findable?: boolean,
 * }} details
 * @returns {unknown}
 */
export function createDedupeSeedNote(details) {
    const {
        noteId,
        cardId = noteId + 50_000,
        deckName = dedupeDeckName,
        modelName = dedupeModelName,
        front = dedupeSearchTerm,
        back = `seed-${String(noteId)}`,
        findable = true,
    } = details;
    return {
        noteId,
        cardId,
        deckName,
        modelName,
        fields: {
            Front: front,
            Back: back,
        },
        tags: ['manabitan'],
        queue: 2,
        flags: 0,
        findable,
    };
}

/**
 * @param {DedupeScenarioOptions} options
 * @returns {import('settings').AnkiCardFormat}
 */
function createDeterministicCardFormat(options) {
    void options;
    return {
        type: 'term',
        name: dedupeCardFormatName,
        deck: dedupeDeckName,
        model: dedupeModelName,
        icon: dedupeCardFormatIcon,
        fields: {
            Front: {value: '{expression}', overwriteMode: 'overwrite'},
            Back: {value: '{glossary}', overwriteMode: 'overwrite'},
        },
    };
}

/**
 * @param {import('settings').Options} optionsFull
 * @param {string} ankiServerUrl
 * @param {DedupeScenarioOptions} scenarioOptions
 * @returns {import('settings').Options}
 */
export function applyAnkiDedupeOptions(optionsFull, ankiServerUrl, scenarioOptions) {
    for (const profile of optionsFull.profiles) {
        const profileOptions = profile.options;
        let dictionary = profileOptions.dictionaries.find((entry) => entry.name === dedupeDictionaryTitle);
        if (!dictionary) {
            dictionary = {
                name: dedupeDictionaryTitle,
                alias: dedupeDictionaryTitle,
                enabled: true,
                allowSecondarySearches: false,
                definitionsCollapsible: 'not-collapsible',
                partsOfSpeechFilter: true,
                useDeinflections: true,
                styles: '',
            };
            profileOptions.dictionaries.push(dictionary);
        }
        dictionary.enabled = true;
        dictionary.alias = dedupeDictionaryTitle;
        profileOptions.general.mainDictionary = dedupeDictionaryTitle;
        profileOptions.general.sortFrequencyDictionary = null;

        profileOptions.anki.enable = true;
        profileOptions.anki.server = ankiServerUrl;
        profileOptions.anki.apiKey = '';
        profileOptions.anki.checkForDuplicates = scenarioOptions.checkForDuplicates;
        profileOptions.anki.duplicateBehavior = scenarioOptions.duplicateBehavior;
        profileOptions.anki.duplicateScope = scenarioOptions.duplicateScope;
        profileOptions.anki.duplicateScopeCheckAllModels = scenarioOptions.duplicateScopeCheckAllModels;
        profileOptions.anki.displayTagsAndFlags = 'never';
        profileOptions.anki.cardFormats = [createDeterministicCardFormat(scenarioOptions)];
    }
    return optionsFull;
}

/**
 * @param {string|null} noteIds
 * @returns {string|null}
 */
function normalizeViewNoteIds(noteIds) {
    if (typeof noteIds !== 'string') {
        return null;
    }
    const normalized = noteIds
        .split(/\s+/)
        .map((value) => value.trim())
        .filter((value) => value.length > 0);
    if (normalized.length === 0) {
        return null;
    }
    return normalized.join(' ');
}

/**
 * @returns {DedupeScenario[]}
 */
export function getAnkiDedupeMatrix() {
    const addTitle = `Add ${dedupeCardFormatName} note`;
    const overwriteTitle = `Overwrite ${dedupeCardFormatName} note`;
    const addDuplicateTitle = `Add duplicate ${dedupeCardFormatName} note`;

    return [
        {
            id: 'check-for-duplicates-disabled',
            description: 'checkForDuplicates=false with duplicate present: save path behaves as normal add.',
            options: {
                checkForDuplicates: false,
                duplicateBehavior: 'prevent',
                duplicateScope: 'collection',
                duplicateScopeCheckAllModels: false,
            },
            seedNotes: [createDedupeSeedNote({noteId: 101})],
            expected: {
                button: {disabled: false, title: addTitle, icon: dedupeCardFormatIcon, overwrite: false},
                writeAction: 'addNote',
            },
        },
        {
            id: 'duplicate-prevent',
            description: 'duplicateBehavior=prevent with duplicate present: save disabled and no write action.',
            options: {
                checkForDuplicates: true,
                duplicateBehavior: 'prevent',
                duplicateScope: 'collection',
                duplicateScopeCheckAllModels: false,
            },
            seedNotes: [createDedupeSeedNote({noteId: 201})],
            expected: {
                button: {disabled: true, title: 'Duplicate notes are disabled', icon: dedupeCardFormatIcon, overwrite: false},
                writeAction: 'none',
            },
        },
        {
            id: 'duplicate-new',
            description: 'duplicateBehavior=new with duplicate present: add-duplicate affordance and addNote.',
            options: {
                checkForDuplicates: true,
                duplicateBehavior: 'new',
                duplicateScope: 'collection',
                duplicateScopeCheckAllModels: false,
            },
            seedNotes: [createDedupeSeedNote({noteId: 301})],
            expected: {
                button: {disabled: false, icon: `add-duplicate-${dedupeCardFormatIcon}`, overwrite: false, viewNoteIds: '301'},
                writeAction: 'addNote',
            },
        },
        {
            id: 'duplicate-overwrite-resolved',
            description: 'duplicateBehavior=overwrite with duplicate present and resolvable ID: updateNoteFields.',
            options: {
                checkForDuplicates: true,
                duplicateBehavior: 'overwrite',
                duplicateScope: 'collection',
                duplicateScopeCheckAllModels: false,
            },
            seedNotes: [createDedupeSeedNote({noteId: 401})],
            expected: {
                button: {disabled: false, title: overwriteTitle, icon: `overwrite-${dedupeCardFormatIcon}`, overwrite: true, viewNoteIds: '401'},
                writeAction: 'updateNoteFields',
            },
        },
        {
            id: 'duplicate-overwrite-unresolved',
            description: 'duplicateBehavior=overwrite with duplicate present but unresolved ID: overwrite blocked path.',
            options: {
                checkForDuplicates: true,
                duplicateBehavior: 'overwrite',
                duplicateScope: 'collection',
                duplicateScopeCheckAllModels: false,
            },
            seedNotes: [createDedupeSeedNote({noteId: 501, findable: false})],
            expected: {
                button: {disabled: true},
                writeAction: 'none',
            },
        },
        {
            id: 'scope-deck-other-deck',
            description: 'duplicateScope=deck with duplicate only in other deck: treated as non-duplicate.',
            options: {
                checkForDuplicates: true,
                duplicateBehavior: 'prevent',
                duplicateScope: 'deck',
                duplicateScopeCheckAllModels: false,
            },
            seedNotes: [createDedupeSeedNote({noteId: 601, deckName: 'Root::Other'})],
            expected: {
                button: {disabled: false, title: addTitle, icon: dedupeCardFormatIcon, overwrite: false},
                writeAction: 'addNote',
            },
        },
        {
            id: 'scope-deck-same-deck',
            description: 'duplicateScope=deck with duplicate in same deck: detected as duplicate.',
            options: {
                checkForDuplicates: true,
                duplicateBehavior: 'prevent',
                duplicateScope: 'deck',
                duplicateScopeCheckAllModels: false,
            },
            seedNotes: [createDedupeSeedNote({noteId: 701, deckName: dedupeDeckName})],
            expected: {
                button: {disabled: true, title: 'Duplicate notes are disabled', icon: dedupeCardFormatIcon, overwrite: false},
                writeAction: 'none',
            },
        },
        {
            id: 'scope-deck-root-child',
            description: 'duplicateScope=deck-root with duplicate in child deck: detected as duplicate.',
            options: {
                checkForDuplicates: true,
                duplicateBehavior: 'prevent',
                duplicateScope: 'deck-root',
                duplicateScopeCheckAllModels: false,
            },
            seedNotes: [createDedupeSeedNote({noteId: 801, deckName: 'Root::Child'})],
            expected: {
                button: {disabled: true, title: 'Duplicate notes are disabled', icon: dedupeCardFormatIcon, overwrite: false},
                writeAction: 'none',
            },
        },
        {
            id: 'scope-model-filter-off',
            description: 'duplicateScopeCheckAllModels=false with duplicate only in different model: non-duplicate.',
            options: {
                checkForDuplicates: true,
                duplicateBehavior: 'prevent',
                duplicateScope: 'collection',
                duplicateScopeCheckAllModels: false,
            },
            seedNotes: [createDedupeSeedNote({noteId: 901, modelName: dedupeAlternateModelName})],
            expected: {
                button: {disabled: false, title: addTitle, icon: dedupeCardFormatIcon, overwrite: false},
                writeAction: 'addNote',
            },
        },
        {
            id: 'scope-model-filter-on',
            description: 'duplicateScopeCheckAllModels=true with duplicate in different model: treated as duplicate.',
            options: {
                checkForDuplicates: true,
                duplicateBehavior: 'prevent',
                duplicateScope: 'collection',
                duplicateScopeCheckAllModels: true,
            },
            seedNotes: [createDedupeSeedNote({noteId: 1001, modelName: dedupeAlternateModelName})],
            expected: {
                button: {disabled: true, title: 'Duplicate notes are disabled', icon: dedupeCardFormatIcon, overwrite: false},
                writeAction: 'none',
            },
        },
    ];
}

/**
 * @param {DedupeScenarioOptions} scenarioOptions
 * @returns {import('anki').Note}
 */
export function createDedupeProbeNote(scenarioOptions) {
    const duplicateScope = scenarioOptions.duplicateScope === 'deck-root' ? 'deck' : scenarioOptions.duplicateScope;
    const duplicateScopeOptions = {
        deckName: scenarioOptions.duplicateScope === 'deck-root' ? dedupeRootDeckName : null,
        checkChildren: scenarioOptions.duplicateScope === 'deck-root',
        checkAllModels: scenarioOptions.duplicateScopeCheckAllModels,
    };
    return {
        deckName: dedupeDeckName,
        modelName: dedupeModelName,
        fields: {
            Front: dedupeSearchTerm,
            Back: 'probe-back',
        },
        tags: ['manabitan'],
        options: {
            allowDuplicate: true,
            duplicateScope,
            duplicateScopeOptions,
        },
    };
}

/**
 * @param {import('anki').Note} note
 * @returns {import('anki').Note}
 */
function stripToFirstField(note) {
    const entries = Object.entries(note.fields);
    const first = entries[0] || ['Front', ''];
    return {
        ...note,
        fields: {
            [first[0]]: first[1],
        },
    };
}

/**
 * @param {string} value
 * @returns {string}
 */
function escapeQuery(value) {
    return value.replaceAll('"', '');
}

/**
 * @param {import('anki').Note} note
 * @returns {string}
 */
function createFindNotesQuery(note) {
    let query = '';
    if (note.options.duplicateScope === 'deck') {
        query = `"deck:${escapeQuery(note.deckName)}" `;
    }
    if (note.options.duplicateScope === 'deck-root') {
        query = `"deck:${escapeQuery(dedupeRootDeckName)}" `;
    }
    const firstFieldEntry = Object.entries(note.fields)[0] || ['front', ''];
    query += `"${firstFieldEntry[0].toLowerCase()}:${escapeQuery(String(firstFieldEntry[1]))}"`;
    return query;
}

/**
 * @param {{handleRequestBody: (body: unknown) => {result: unknown, error: string|null}}} state
 * @param {string} action
 * @param {Record<string, unknown>} params
 * @returns {unknown}
 */
function invoke(state, action, params) {
    const {result, error} = state.handleRequestBody({action, params, version: 2});
    if (typeof error === 'string' && error.length > 0) {
        throw new Error(error);
    }
    return result;
}

/**
 * @param {{
 *   beginScenario: (scenarioId: string, seedNotes: unknown[]) => void,
 *   handleRequestBody: (body: unknown) => {result: unknown, error: string|null},
 *   getScenarioState: () => {actions: Array<{action: string}>},
 * }} state
 * @param {DedupeScenario[]} [matrix]
 * @returns {{ok: boolean, results: Array<Record<string, unknown>>}}
 */
export function runAnkiDedupeContractMatrix(state, matrix = getAnkiDedupeMatrix()) {
    /** @type {Array<Record<string, unknown>>} */
    const results = [];
    for (const scenario of matrix) {
        state.beginScenario(scenario.id, scenario.seedNotes);
        const note = createDedupeProbeNote(scenario.options);
        const duplicateProbeNote = {
            ...stripToFirstField(note),
            options: {
                ...note.options,
                allowDuplicate: false,
            },
        };
        const detailResult = /** @type {Array<{canAdd: boolean, error: string|null}>} */ (
            invoke(state, 'canAddNotesWithErrorDetail', {notes: [duplicateProbeNote]})
        );
        const isDuplicate = Array.isArray(detailResult) && detailResult[0]?.canAdd === false;
        let duplicateNoteIds = /** @type {number[]} */ ([]);
        if (isDuplicate) {
            const query = createFindNotesQuery(note);
            const multiResult = /** @type {unknown[]} */ (invoke(state, 'multi', {
                actions: [{action: 'findNotes', params: {query}}],
            }));
            duplicateNoteIds = Array.isArray(multiResult?.[0]) ? multiResult[0].map((value) => Number(value)) : [];
            if (duplicateNoteIds.length === 0) {
                duplicateNoteIds = [INVALID_NOTE_ID];
            }
        }

        const validNoteIds = duplicateNoteIds.filter((noteId) => Number.isFinite(noteId) && noteId !== INVALID_NOTE_ID);
        let observedWriteAction = /** @type {'addNote'|'updateNoteFields'|'none'} */ ('none');
        if (!scenario.options.checkForDuplicates || !isDuplicate) {
            invoke(state, 'addNote', {note});
            observedWriteAction = 'addNote';
        } else if (scenario.options.duplicateBehavior === 'new') {
            invoke(state, 'addNote', {note});
            observedWriteAction = 'addNote';
        } else if (scenario.options.duplicateBehavior === 'overwrite' && validNoteIds.length > 0) {
            invoke(state, 'updateNoteFields', {note: {...note, id: validNoteIds[0]}});
            observedWriteAction = 'updateNoteFields';
        }

        const scenarioState = state.getScenarioState();
        const observedActions = scenarioState.actions.map((entry) => entry.action);
        const pass = observedWriteAction === scenario.expected.writeAction;
        results.push({
            id: scenario.id,
            description: scenario.description,
            expectedWriteAction: scenario.expected.writeAction,
            observedWriteAction,
            isDuplicate,
            duplicateNoteIds,
            validNoteIds,
            observedActions,
            pass,
        });
    }
    return {
        ok: results.every((result) => result.pass === true),
        results,
    };
}

/**
 * @param {DedupeExpectedButtonState} value
 * @returns {DedupeExpectedButtonState}
 */
export function normalizeExpectedButtonState(value) {
    return {
        ...value,
        viewNoteIds: (typeof value.viewNoteIds === 'undefined' ? void 0 : normalizeViewNoteIds(value.viewNoteIds)),
    };
}
