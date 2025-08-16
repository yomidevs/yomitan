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

import {AnkiNoteBuilder} from '../../ext/js/data/anki-note-builder.js';
import {createAnkiNoteData} from '../../ext/js/data/anki-note-data-creator.js';
import {getStandardFieldMarkers} from '../../ext/js/data/anki-template-util.js';
import {AnkiTemplateRenderer} from '../../ext/js/templates/anki-template-renderer.js';

/**
 * @param {import('dictionary').DictionaryEntryType} type
 * @returns {import('settings').AnkiFields}
 */
function createTestFields(type) {
    /** @type {import('settings').AnkiFields} */
    const fields = {};
    for (const marker of getStandardFieldMarkers(type)) {
        fields[marker] = {value: `{${marker}}`, overwriteMode: 'coalesce'};
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
    /** @type {Map<string, string>} */
    const dictionaryStylesMap = new Map();
    if (styles !== '') {
        dictionaryStylesMap.set('Test Dictionary 2', styles);
    }
    /** @type {import('anki-templates-internal').CreateDetails} */
    const data = {
        dictionaryEntry,
        resultOutputMode: mode,
        cardFormat: {
            type: 'term',
            name: 'test',
            deck: 'deck',
            model: 'model',
            fields: {},
            icon: 'big-circle',
        },
        glossaryLayoutMode: 'default',
        compactTags: false,
        context: {
            url: 'url:',
            sentence: {text: '', offset: 0},
            documentTitle: 'title',
            query: 'query',
            fullQuery: 'fullQuery',
        },
        media: {},
        dictionaryStylesMap,
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
    const ankiTemplateRenderer = new AnkiTemplateRenderer(document, window);
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
            url: 'url:',
            sentence: {
                text: `${clozePrefix}${source}${clozeSuffix}`,
                offset: clozePrefix.length,
            },
            documentTitle: 'title',
            query: 'query',
            fullQuery: 'fullQuery',
        };
        /** @type {Map<string, string>} */
        const dictionaryStylesMap = new Map();
        if (styles) {
            dictionaryStylesMap.set('Test Dictionary 2', styles);
        }
        /** @type {import('anki-note-builder').CreateNoteDetails} */
        const details = {
            dictionaryEntry,
            cardFormat: {
                type: dictionaryEntry.type,
                name: 'test',
                deck: 'deckName',
                model: 'modelName',
                fields: createTestFields(dictionaryEntry.type),
                icon: 'big-circle',
            },
            context,
            template,
            tags: ['yomitan'],
            duplicateScope: 'collection',
            duplicateScopeCheckAllModels: false,
            resultOutputMode: mode,
            glossaryLayoutMode: 'default',
            compactTags: false,
            requirements: [],
            mediaOptions: null,
            dictionaryStylesMap,
        };
        const {note: {fields: noteFields}, errors} = await ankiNoteBuilder.createNote(details);
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
