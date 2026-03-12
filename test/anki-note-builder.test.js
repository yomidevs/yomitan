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

import {describe, expect, test, vi} from 'vitest';
import {AnkiNoteBuilder} from '../ext/js/data/anki-note-builder.js';

class MockTemplateRenderer {
    constructor() {
        /** @type {string[]} */
        this.markers = [];
    }

    /**
     * @param {import('template-renderer').RenderMultiItem[]} items
     * @returns {Promise<import('core').Response<import('template-renderer').RenderResult>[]>}
     */
    async renderMulti(items) {
        /** @type {import('core').Response<import('template-renderer').RenderResult>[]} */
        const results = [];
        for (const {templateItems} of items) {
            for (const {datas} of templateItems) {
                for (const {marker} of datas) {
                    this.markers.push(marker);
                    results.push({
                        result: {
                            result: `[${marker}]`,
                            requirements: marker === 'audio' ? [{type: 'audio'}] : [],
                        },
                    });
                }
            }
        }
        return results;
    }
}

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
 * @returns {import('dictionary').DictionaryEntry}
 */
function createKanjiEntry() {
    return /** @type {import('dictionary').DictionaryEntry} */ ({
        type: 'kanji',
        character: '字',
    });
}

/**
 * @returns {MockTemplateRenderer}
 */
function createTemplateRenderer() {
    return new MockTemplateRenderer();
}

/**
 * @param {MockTemplateRenderer} templateRenderer
 * @returns {import('../ext/js/templates/template-renderer-proxy.js').TemplateRendererProxy}
 */
function asTemplateRenderer(templateRenderer) {
    return /** @type {import('../ext/js/templates/template-renderer-proxy.js').TemplateRendererProxy} */ (
        /** @type {unknown} */ (templateRenderer)
    );
}

/**
 * @param {import('dictionary').DictionaryEntryType} type
 * @returns {import('settings').AnkiCardFormat}
 */
function createCardFormat(type) {
    return {
        type,
        name: 'Test',
        deck: 'Deck::Child',
        model: 'Model',
        fields: {
            Front: {
                value: 'front-{first}',
                overwriteMode: 'overwrite',
            },
            Back: {
                value: 'back-{second}-{audio}',
                overwriteMode: 'overwrite',
            },
        },
        icon: 'big-circle',
    };
}

/**
 * @param {import('dictionary').DictionaryEntryType} type
 * @param {string} frontValue
 * @returns {import('settings').AnkiCardFormat}
 */
function createSingleFieldCardFormat(type, frontValue) {
    return {
        type,
        name: 'Test',
        deck: 'Deck::Child',
        model: 'Model',
        fields: {
            Front: {
                value: frontValue,
                overwriteMode: 'overwrite',
            },
        },
        icon: 'big-circle',
    };
}

function createContext() {
    return {
        url: 'chrome-extension://test/search.html',
        sentence: {text: 'sentence', offset: 0},
        documentTitle: 'title',
        query: 'query',
        fullQuery: 'query',
    };
}

describe('AnkiNoteBuilder.createDuplicateCheckNote', () => {
    test.each([
        ['term', createTermEntry()],
        ['kanji', createKanjiEntry()],
    ])('matches the first rendered field for %s cards', async (_name, dictionaryEntry) => {
        const api = {
            injectAnkiNoteMedia: vi.fn(async () => {
                throw new Error('injectAnkiNoteMedia should not be called');
            }),
            parseText: vi.fn(async () => []),
        };
        const templateRenderer = createTemplateRenderer();
        const ankiNoteBuilder = new AnkiNoteBuilder(api, asTemplateRenderer(templateRenderer));
        const cardFormat = createCardFormat(dictionaryEntry.type);

        const createNoteDetails = /** @type {import('anki-note-builder').CreateNoteDetails} */ ({
            dictionaryEntry,
            cardFormat,
            context: createContext(),
            template: 'unused',
            tags: ['tag'],
            requirements: [],
            duplicateScope: 'deck-root',
            duplicateScopeCheckAllModels: true,
            resultOutputMode: 'split',
            glossaryLayoutMode: 'default',
            compactTags: false,
            mediaOptions: null,
            dictionaryStylesMap: new Map(),
        });

        const {note} = await ankiNoteBuilder.createNote(createNoteDetails);
        const duplicateCheckNote = await ankiNoteBuilder.createDuplicateCheckNote(/** @type {import('anki-note-builder').CreateDuplicateCheckNoteDetails} */ ({
            dictionaryEntry,
            cardFormat,
            context: createContext(),
            template: 'unused',
            tags: ['tag'],
            duplicateScope: 'deck-root',
            duplicateScopeCheckAllModels: true,
            resultOutputMode: 'split',
            glossaryLayoutMode: 'default',
            compactTags: false,
            dictionaryStylesMap: new Map(),
        }));

        expect(duplicateCheckNote.fields).toStrictEqual({Front: note.fields.Front});
        expect(duplicateCheckNote.options).toStrictEqual({
            allowDuplicate: true,
            duplicateScope: 'deck',
            duplicateScopeOptions: {
                deckName: 'Deck',
                checkChildren: true,
                checkAllModels: true,
            },
        });
    });

    test('does not render later fields or inject media for duplicate probes', async () => {
        const api = {
            injectAnkiNoteMedia: vi.fn(async () => {
                throw new Error('injectAnkiNoteMedia should not be called');
            }),
            parseText: vi.fn(async () => []),
        };
        const templateRenderer = createTemplateRenderer();
        const ankiNoteBuilder = new AnkiNoteBuilder(api, asTemplateRenderer(templateRenderer));

        const note = await ankiNoteBuilder.createDuplicateCheckNote(/** @type {import('anki-note-builder').CreateDuplicateCheckNoteDetails} */ ({
            dictionaryEntry: createTermEntry(),
            cardFormat: createCardFormat('term'),
            context: createContext(),
            template: 'unused',
            tags: ['tag'],
            duplicateScope: 'collection',
            duplicateScopeCheckAllModels: false,
            resultOutputMode: 'split',
            glossaryLayoutMode: 'default',
            compactTags: false,
            dictionaryStylesMap: new Map(),
        }));

        expect(note.fields).toStrictEqual({Front: 'front-[first]'});
        expect(templateRenderer.markers).toStrictEqual(['first']);
        expect(api.injectAnkiNoteMedia).not.toHaveBeenCalled();
    });

    test('uses a fast path for standard term expression duplicate probes', async () => {
        const api = {
            injectAnkiNoteMedia: vi.fn(async () => {
                throw new Error('injectAnkiNoteMedia should not be called');
            }),
            parseText: vi.fn(async () => []),
        };
        const templateRenderer = createTemplateRenderer();
        const ankiNoteBuilder = new AnkiNoteBuilder(api, asTemplateRenderer(templateRenderer));

        const note = await ankiNoteBuilder.createDuplicateCheckNote(/** @type {import('anki-note-builder').CreateDuplicateCheckNoteDetails} */ ({
            dictionaryEntry: /** @type {import('dictionary').DictionaryEntry} */ ({
                type: 'term',
                headwords: [
                    {
                        term: '<term>&',
                        reading: 'reading',
                        sources: [createSource('<term>&')],
                    },
                ],
            }),
            cardFormat: createSingleFieldCardFormat('term', '{expression}'),
            context: createContext(),
            template: 'unused',
            tags: ['tag'],
            duplicateScope: 'collection',
            duplicateScopeCheckAllModels: false,
            resultOutputMode: 'split',
            glossaryLayoutMode: 'default',
            compactTags: false,
            dictionaryStylesMap: new Map(),
        }));

        expect(note.fields).toStrictEqual({Front: '&lt;term&gt;&amp;'});
        expect(templateRenderer.markers).toStrictEqual([]);
    });

    test('uses a fast path for merged term expression duplicate probes', async () => {
        const api = {
            injectAnkiNoteMedia: vi.fn(async () => {
                throw new Error('injectAnkiNoteMedia should not be called');
            }),
            parseText: vi.fn(async () => []),
        };
        const templateRenderer = createTemplateRenderer();
        const ankiNoteBuilder = new AnkiNoteBuilder(api, asTemplateRenderer(templateRenderer));

        const note = await ankiNoteBuilder.createDuplicateCheckNote(/** @type {import('anki-note-builder').CreateDuplicateCheckNoteDetails} */ ({
            dictionaryEntry: /** @type {import('dictionary').DictionaryEntry} */ ({
                type: 'term',
                headwords: [
                    {term: '打ち込む', reading: 'うちこむ', sources: [createSource('打ち込む')]},
                    {term: '撃ち込む', reading: 'うちこむ', sources: [createSource('撃ち込む')]},
                    {term: '打ち込む', reading: 'うちこむ', sources: [createSource('打ち込む')]},
                ],
            }),
            cardFormat: createSingleFieldCardFormat('term', '{expression}'),
            context: createContext(),
            template: 'unused',
            tags: ['tag'],
            duplicateScope: 'collection',
            duplicateScopeCheckAllModels: false,
            resultOutputMode: 'merge',
            glossaryLayoutMode: 'default',
            compactTags: false,
            dictionaryStylesMap: new Map(),
        }));

        expect(note.fields).toStrictEqual({Front: '打ち込む、撃ち込む'});
        expect(templateRenderer.markers).toStrictEqual([]);
    });

    test('uses a fast path for standard kanji duplicate probes', async () => {
        const api = {
            injectAnkiNoteMedia: vi.fn(async () => {
                throw new Error('injectAnkiNoteMedia should not be called');
            }),
            parseText: vi.fn(async () => []),
        };
        const templateRenderer = createTemplateRenderer();
        const ankiNoteBuilder = new AnkiNoteBuilder(api, asTemplateRenderer(templateRenderer));

        const note = await ankiNoteBuilder.createDuplicateCheckNote(/** @type {import('anki-note-builder').CreateDuplicateCheckNoteDetails} */ ({
            dictionaryEntry: createKanjiEntry(),
            cardFormat: createSingleFieldCardFormat('kanji', '{character}'),
            context: createContext(),
            template: 'unused',
            tags: ['tag'],
            duplicateScope: 'collection',
            duplicateScopeCheckAllModels: false,
            resultOutputMode: 'split',
            glossaryLayoutMode: 'default',
            compactTags: false,
            dictionaryStylesMap: new Map(),
        }));

        expect(note.fields).toStrictEqual({Front: '字'});
        expect(templateRenderer.markers).toStrictEqual([]);
    });

    test('createDuplicateCheckNoteFast handles literal first fields without template rendering', () => {
        const api = {
            injectAnkiNoteMedia: vi.fn(async () => {
                throw new Error('injectAnkiNoteMedia should not be called');
            }),
            parseText: vi.fn(async () => []),
        };
        const templateRenderer = createTemplateRenderer();
        const ankiNoteBuilder = new AnkiNoteBuilder(api, asTemplateRenderer(templateRenderer));

        const note = ankiNoteBuilder.createDuplicateCheckNoteFast(/** @type {import('anki-note-builder').CreateDuplicateCheckNoteDetails} */ ({
            dictionaryEntry: createTermEntry(),
            cardFormat: createSingleFieldCardFormat('term', 'literal-front'),
            tags: ['tag'],
            duplicateScope: 'collection',
            duplicateScopeCheckAllModels: false,
            resultOutputMode: 'split',
        }));

        expect(note?.fields).toStrictEqual({Front: 'literal-front'});
        expect(templateRenderer.markers).toStrictEqual([]);
    });
});
