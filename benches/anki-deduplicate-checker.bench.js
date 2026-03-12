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

import {readFileSync} from 'fs';
import {fileURLToPath} from 'node:url';
import path from 'path';
import {afterAll, bench, describe, vi} from 'vitest';
import {parseJson} from '../dev/json.js';
import {AnkiNoteBuilder} from '../ext/js/data/anki-note-builder.js';
import {getStandardFieldMarkers} from '../ext/js/data/anki-template-util.js';
import {AnkiTemplateRenderer} from '../ext/js/templates/anki-template-renderer.js';
import {setupDomTest} from '../test/fixtures/dom-test.js';
import {createTranslatorContext} from '../test/fixtures/translator-test.js';
import {setupStubs} from '../test/utilities/database.js';
import {createFindKanjiOptions, createFindTermsOptions} from '../test/utilities/translator.js';

setupStubs();
vi.mock('../ext/lib/kanji-processor.js', () => ({
    /**
     * @param {string} text
     * @returns {string}
     */
    convertVariants: (text) => text,
}));

const {Backend} = await import('../ext/js/background/backend.js');

const dirname = path.dirname(fileURLToPath(import.meta.url));
const dictionaryName = 'Test Dictionary 2';
const dictionaryDirectory = path.join(dirname, '..', 'test', 'data', 'dictionaries', 'valid-dictionary1');
const templateFilePath = path.join(dirname, '..', 'ext', 'data', 'templates', 'default-anki-field-templates.handlebars');
const testInputsFilePath = path.join(dirname, '..', 'test', 'data', 'translator-test-inputs.json');
const template = readFileSync(templateFilePath, {encoding: 'utf8'});
/** @type {import('test/translator').TranslatorTestInputs} */
const {optionsPresets} = parseJson(readFileSync(testInputsFilePath, {encoding: 'utf8'}));
const consoleLog = console.log;
const benchmarkOptions = Object.freeze({
    time: 3000,
    warmupTime: 1000,
    warmupIterations: 8,
});
const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation((...args) => {
    if (typeof args[0] === 'string' && args[0].startsWith('addScopeToCssLegacy failed, falling back on addScopeToCss:')) {
        return;
    }
    consoleLog(...args);
});
const {translator, styles} = await createTranslatorContext(dictionaryDirectory, dictionaryName);

const {window, teardown} = await setupDomTest();
afterAll(async () => {
    consoleLogSpy.mockRestore();
    await teardown(global);
});

// The window property needs to be referenced for it to be initialized.
void window;
// @ts-expect-error - Document and Window are not accessible here and are not read directly.
const ankiTemplateRenderer = new AnkiTemplateRenderer(undefined, undefined);
await ankiTemplateRenderer.prepare();

const api = {
    /**
     * @type {import('anki-note-builder.js').MinimalApi['injectAnkiNoteMedia']}
     */
    async injectAnkiNoteMedia() {
        throw new Error('injectAnkiNoteMedia should not be called in benchmark setup');
    },

    /**
     * @type {import('anki-note-builder.js').MinimalApi['parseText']}
     */
    async parseText() {
        throw new Error('parseText should not be called in benchmark setup');
    },
};
const ankiNoteBuilder = new AnkiNoteBuilder(api, ankiTemplateRenderer.templateRenderer);
const termFindOptions = createFindTermsOptions(dictionaryName, optionsPresets, 'default');
const kanjiFindOptions = createFindKanjiOptions(dictionaryName, optionsPresets, 'kanji');
const {dictionaryEntries: termDictionaryEntries} = await translator.findTerms('split', '打ち込む', termFindOptions);
const kanjiDictionaryEntries = await translator.findKanji('打', kanjiFindOptions);
const kanjiDictionaryEntry = kanjiDictionaryEntries[0];
if (typeof kanjiDictionaryEntry === 'undefined') {
    throw new Error('Expected benchmark kanji fixture data to contain at least one entry');
}

const dictionaryStylesMap = createDictionaryStylesMap(styles);
const termCardFormat = createCardFormat('term');
const kanjiCardFormat = createCardFormat('kanji');
const termDuplicateCheckDetails = termDictionaryEntries.map((dictionaryEntry) => createDuplicateCheckDetails(dictionaryEntry, termCardFormat, dictionaryStylesMap));
const termCreateNoteDetails = termDictionaryEntries.map((dictionaryEntry) => createCreateNoteDetails(dictionaryEntry, termCardFormat, dictionaryStylesMap));
const kanjiDuplicateCheckDetails = [createDuplicateCheckDetails(kanjiDictionaryEntry, kanjiCardFormat, dictionaryStylesMap)];
const kanjiCreateNoteDetails = [createCreateNoteDetails(kanjiDictionaryEntry, kanjiCardFormat, dictionaryStylesMap)];
const termDuplicateCheckNotes = await Promise.all(termDuplicateCheckDetails.map((details) => ankiNoteBuilder.createDuplicateCheckNote(details)));
const duplicateNoteKeys = createDuplicateNoteKeys(termDuplicateCheckNotes);
const backend = /** @type {any} */ (createBackendBenchmarkHarness(duplicateNoteKeys));

describe('Anki deduplicate checker', () => {
    bench(`AnkiNoteBuilder.createDuplicateCheckNote - term batch (n=${termDuplicateCheckDetails.length})`, async () => {
        for (const details of termDuplicateCheckDetails) {
            await ankiNoteBuilder.createDuplicateCheckNote(details);
        }
    }, benchmarkOptions);

    bench(`AnkiNoteBuilder.createNote - term batch baseline (n=${termCreateNoteDetails.length})`, async () => {
        for (const details of termCreateNoteDetails) {
            await ankiNoteBuilder.createNote(details);
        }
    }, benchmarkOptions);

    bench(`AnkiNoteBuilder.createDuplicateCheckNote - kanji sample (n=${kanjiDuplicateCheckDetails.length})`, async () => {
        for (const details of kanjiDuplicateCheckDetails) {
            await ankiNoteBuilder.createDuplicateCheckNote(details);
        }
    }, benchmarkOptions);

    bench(`AnkiNoteBuilder.createNote - kanji sample baseline (n=${kanjiCreateNoteDetails.length})`, async () => {
        for (const details of kanjiCreateNoteDetails) {
            await ankiNoteBuilder.createNote(details);
        }
    }, benchmarkOptions);

    bench(`Backend.partitionAddibleNotes - term batch (n=${termDuplicateCheckNotes.length})`, async () => {
        await backend.partitionAddibleNotes(termDuplicateCheckNotes);
    }, benchmarkOptions);

    bench(`Backend._onApiGetAnkiNoteInfo - term batch, no additional info (n=${termDuplicateCheckNotes.length})`, async () => {
        await backend._onApiGetAnkiNoteInfo({notes: termDuplicateCheckNotes, fetchAdditionalInfo: false});
    }, benchmarkOptions);

    bench(`Backend._onApiGetAnkiNoteInfo - term batch, additional info (n=${termDuplicateCheckNotes.length})`, async () => {
        await backend._onApiGetAnkiNoteInfo({notes: termDuplicateCheckNotes, fetchAdditionalInfo: true});
    }, benchmarkOptions);
});

/**
 * @param {string} styles
 * @returns {Map<string, string>}
 */
function createDictionaryStylesMap(styles) {
    const result = new Map();
    if (styles.length > 0) {
        result.set(dictionaryName, styles);
    }
    return result;
}

/**
 * @param {import('dictionary').DictionaryEntryType} type
 * @returns {import('settings').AnkiCardFormat}
 */
function createCardFormat(type) {
    /** @type {import('settings').AnkiFields} */
    const fields = {};
    for (const marker of getOrderedFieldMarkers(type)) {
        fields[marker] = {value: `{${marker}}`, overwriteMode: 'coalesce'};
    }
    return {
        type,
        name: `Benchmark ${type}`,
        deck: 'deck',
        model: 'model',
        fields,
        icon: 'big-circle',
    };
}

/**
 * @param {import('dictionary').DictionaryEntryType} type
 * @returns {string[]}
 */
function getOrderedFieldMarkers(type) {
    const primaryMarker = type === 'kanji' ? 'character' : 'expression';
    const markers = getStandardFieldMarkers(type);
    return [primaryMarker, ...markers.filter((marker) => marker !== primaryMarker)];
}

/**
 * @param {import('dictionary').DictionaryEntry} dictionaryEntry
 * @param {import('settings').AnkiCardFormat} cardFormat
 * @param {Map<string, string>} dictionaryStylesMap
 * @returns {import('anki-note-builder').CreateDuplicateCheckNoteDetails}
 */
function createDuplicateCheckDetails(dictionaryEntry, cardFormat, dictionaryStylesMap) {
    return {
        dictionaryEntry,
        cardFormat,
        context: createContext(dictionaryEntry),
        template,
        tags: ['yomitan'],
        duplicateScope: 'collection',
        duplicateScopeCheckAllModels: false,
        resultOutputMode: 'split',
        glossaryLayoutMode: 'default',
        compactTags: false,
        dictionaryStylesMap,
    };
}

/**
 * @param {import('dictionary').DictionaryEntry} dictionaryEntry
 * @param {import('settings').AnkiCardFormat} cardFormat
 * @param {Map<string, string>} dictionaryStylesMap
 * @returns {import('anki-note-builder').CreateNoteDetails}
 */
function createCreateNoteDetails(dictionaryEntry, cardFormat, dictionaryStylesMap) {
    return /** @type {import('anki-note-builder').CreateNoteDetails} */ ({
        ...createDuplicateCheckDetails(dictionaryEntry, cardFormat, dictionaryStylesMap),
        requirements: [],
        mediaOptions: null,
    });
}

/**
 * @param {import('dictionary').DictionaryEntry} dictionaryEntry
 * @returns {import('anki-templates-internal').Context}
 */
function createContext(dictionaryEntry) {
    const clozePrefix = 'cloze-prefix';
    const clozeSuffix = 'cloze-suffix';
    let source = '';
    switch (dictionaryEntry.type) {
        case 'kanji':
            source = dictionaryEntry.character;
            break;
        case 'term':
            if (dictionaryEntry.headwords.length > 0 && dictionaryEntry.headwords[0].sources.length > 0) {
                source = dictionaryEntry.headwords[0].sources[0].originalText;
            }
            break;
    }

    return {
        url: 'url:',
        sentence: {
            text: `${clozePrefix}${source}${clozeSuffix}`,
            offset: clozePrefix.length,
        },
        documentTitle: 'title',
        query: source,
        fullQuery: source,
    };
}

/**
 * @param {import('anki').Note[]} notes
 * @returns {Set<string>}
 */
function createDuplicateNoteKeys(notes) {
    const result = new Set();
    for (let i = 0; i < notes.length; i += 2) {
        result.add(getDuplicateNoteKey(notes[i]));
    }
    return result;
}

/**
 * @param {Set<string>} duplicateNoteKeys
 * @returns {any}
 */
function createBackendBenchmarkHarness(duplicateNoteKeys) {
    const backend = Object.create(Backend.prototype);
    backend._anki = new DuplicateCheckBenchmarkAnki(duplicateNoteKeys);
    return backend;
}

class DuplicateCheckBenchmarkAnki {
    /**
     * @param {Set<string>} duplicateNoteKeys
     */
    constructor(duplicateNoteKeys) {
        this._duplicateNoteIds = new Map();
        let noteId = 1;
        for (const key of duplicateNoteKeys) {
            this._duplicateNoteIds.set(key, noteId);
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
