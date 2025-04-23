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

import type * as Anki from './anki';
import type * as AnkiNoteBuilder from './anki-note-builder';
import type * as AnkiTemplates from './anki-templates';
import type * as Settings from './settings';

export type LogData = {
    ankiNoteData: AnkiTemplates.NoteData | undefined;
    ankiNoteDataException: Error | undefined;
    notes: AnkiNoteLogData[];
};

export type AnkiNoteLogData = {
    cardFormatIndex: number;
    note: Anki.Note | undefined;
    errors?: Error[];
    requirements?: AnkiNoteBuilder.Requirement[];
};

export type DictionaryEntryDetails = {
    noteMap: Map<number, DictionaryEntryNoteDetails>;
};

export type DictionaryEntryNoteDetails = {
    cardFormat: Settings.AnkiNoteOptions;
    note: Anki.Note;
    errors: Error[];
    requirements: AnkiNoteBuilder.Requirement[];
    canAdd: boolean;
    valid: boolean;
    /**
     * Anki IDs of duplicate notes. May contain INVALID_NOTE_ID for notes whose ID could not be found.
     */
    noteIds: Anki.NoteId[] | null;
    noteInfos?: (Anki.NoteInfo | null)[];
    ankiError: Error | null;
};

export type CreateNoteResult = {
    note: Anki.Note;
    errors: Error[];
    requirements: AnkiNoteBuilder.Requirement[];
};

export type RGB = {
    red: number;
    green: number;
    blue: number;
};
