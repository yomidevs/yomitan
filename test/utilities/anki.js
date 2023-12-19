/*
 * Copyright (C) 2023  Yomitan Authors
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

/**
 * @param {import('../../ext/js/data/sandbox/anki-note-data-creator.js').AnkiNoteDataCreator} ankiNoteDataCreator
 * @param {import('dictionary').DictionaryEntry} dictionaryEntry
 * @param {import('settings').ResultOutputMode} mode
 * @returns {import('anki-templates').NoteData}
 * @throws {Error}
 */
export function createTestAnkiNoteData(ankiNoteDataCreator, dictionaryEntry, mode) {
    const marker = '{marker}';
    /** @type {import('anki-templates-internal').CreateDetails} */
    const data = {
        dictionaryEntry,
        resultOutputMode: mode,
        mode: 'test',
        glossaryLayoutMode: 'default',
        compactTags: false,
        context: {
            url: 'url:',
            sentence: {text: '', offset: 0},
            documentTitle: 'title',
            query: 'query',
            fullQuery: 'fullQuery'
        },
        media: {}
    };
    return ankiNoteDataCreator.create(marker, data);
}
