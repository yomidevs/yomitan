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

function createTermEntry() {
    return {
        type: 'term',
        headwords: [
            {
                term: 'term',
                reading: 'reading',
                sources: [{originalText: 'term', deinflectedText: 'term'}],
            },
        ],
    };
}

function createKanjiEntry() {
    return {
        type: 'kanji',
        character: '字',
    };
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
        const templateRenderer = new MockTemplateRenderer();
        const ankiNoteBuilder = new AnkiNoteBuilder(api, templateRenderer);
        const cardFormat = createCardFormat(dictionaryEntry.type);

        const createNoteDetails = {
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
        };

        const {note} = await ankiNoteBuilder.createNote(createNoteDetails);
        const duplicateCheckNote = await ankiNoteBuilder.createDuplicateCheckNote({
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
        });

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
        const templateRenderer = new MockTemplateRenderer();
        const ankiNoteBuilder = new AnkiNoteBuilder(api, templateRenderer);

        const note = await ankiNoteBuilder.createDuplicateCheckNote({
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
        });

        expect(note.fields).toStrictEqual({Front: 'front-[first]'});
        expect(templateRenderer.markers).toStrictEqual(['first']);
        expect(api.injectAnkiNoteMedia).not.toHaveBeenCalled();
    });
});
