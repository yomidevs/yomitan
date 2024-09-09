/*
 * Copyright (C) 2023-2024  Yomitan Authors
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

import {AnkiNoteBuilder} from '../../ext/js/data/anki-note-builder.js';
import {createAnkiNoteData} from '../../ext/js/data/anki-note-data-creator.js';
import {getStandardFieldMarkers} from '../../ext/js/data/anki-template-util.js';
import {AnkiTemplateRenderer} from '../../ext/js/templates/anki-template-renderer.js';

/**
 * @param {import('dictionary').DictionaryEntryType} type
 * @returns {import('anki-note-builder').Field[]}
 */
function createTestFields(type) {
    /** @type {import('anki-note-builder').Field[]} */
    const fields = [];
    for (const marker of getStandardFieldMarkers(type)) {
        fields.push([marker, `{${marker}}`]);
    }
    return fields;
}

/**
 * @param {import('dictionary').DictionaryEntry} dictionaryEntry
 * @param {import('settings').ResultOutputMode} mode
 * @param {string} styles
 * @returns {import('anki-templates').NoteData}
 * @throws {Error}
 */
export function createTestAnkiNoteData(dictionaryEntry, mode, styles = '') {
    const marker = '{marker}';
    const dictionaryStylesMap = new Map();
    if (styles !== '') {
        dictionaryStylesMap.set('Test Dictionary 2', styles);
    }
    /** @type {import('anki-templates-internal').CreateDetails} */
    const data = {
        compactTags: false,
        context: {
            documentTitle: 'title',
            fullQuery: 'fullQuery',
            query: 'query',
            sentence: {offset: 0, text: ''},
            url: 'url:',
        },
        dictionaryEntry,
        dictionaryStylesMap,
        glossaryLayoutMode: 'default',
        media: {},
        mode: 'test',
        resultOutputMode: mode,
    };
    return createAnkiNoteData(marker, data);
}

/**
 * @param {import('dictionary').DictionaryEntry[]} dictionaryEntries
 * @param {import('settings').ResultOutputMode} mode
 * @param {string} template
 * @param {?import('vitest').ExpectStatic} expect
 * @param {string} styles
 * @returns {Promise<import('anki').NoteFields[]>}
 */
export async function getTemplateRenderResults(dictionaryEntries, mode, template, expect, styles = '') {
    const ankiTemplateRenderer = new AnkiTemplateRenderer();
    await ankiTemplateRenderer.prepare();
    const clozePrefix = 'cloze-prefix';
    const clozeSuffix = 'cloze-suffix';
    const results = [];
    for (const dictionaryEntry of dictionaryEntries) {
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
        const api = new MinimalApi();
        const ankiNoteBuilder = new AnkiNoteBuilder(api, ankiTemplateRenderer.templateRenderer);
        const context = {
            documentTitle: 'title',
            fullQuery: 'fullQuery',
            query: 'query',
            sentence: {
                offset: clozePrefix.length,
                text: `${clozePrefix}${source}${clozeSuffix}`,
            },
            url: 'url:',
        };
        const dictionaryStylesMap = new Map();
        if (styles) {
            dictionaryStylesMap.set('Test Dictionary 2', styles);
        }
        /** @type {import('anki-note-builder').CreateNoteDetails} */
        const details = {
            compactTags: false,
            context,
            deckName: 'deckName',
            dictionaryEntry,
            dictionaryStylesMap,
            duplicateScope: 'collection',
            duplicateScopeCheckAllModels: false,
            fields: createTestFields(dictionaryEntry.type),
            glossaryLayoutMode: 'default',
            mediaOptions: null,
            mode: 'test',
            modelName: 'modelName',
            requirements: [],
            resultOutputMode: mode,
            tags: ['yomitan'],
            template,
        };
        const {errors, note: {fields: noteFields}} = await ankiNoteBuilder.createNote(details);
        for (const error of errors) {
            console.error(error);
        }
        if (expect !== null) {
            expect(errors.length).toStrictEqual(0);
        }
        results.push(noteFields);
    }

    return results;
}

class MinimalApi {
    /**
     * @type {import('anki-note-builder.js').MinimalApi['injectAnkiNoteMedia']}
     */
    async injectAnkiNoteMedia() {
        throw new Error('Not supported');
    }

    /**
     * @type {import('anki-note-builder.js').MinimalApi['parseText']}
     */
    async parseText() {
        throw new Error('Not supported');
    }
}
