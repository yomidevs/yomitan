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

import type {OptionsList, OptionsPresetObject} from 'dev/vm';
import type {FindTermsMode} from 'translator';
import type {DictionaryEntry} from 'dictionary';
import type {NoteData} from 'anki-templates';
import type {NoteFields} from 'anki';

export type TranslatorTestInputs = {
    optionsPresets: OptionsPresetObject;
    tests: TestInput[];
};

export type TestInput = TestInputFindKanji | TestInputFindTerm;

export type TestInputFindKanji = {
    func: 'findKanji';
    name: string;
    text: string;
    options: OptionsList;
};

export type TestInputFindTerm = {
    func: 'findTerms';
    name: string;
    mode: FindTermsMode;
    text: string;
    options: OptionsList;
};

export type TranslatorTestResults = TranslatorTestResult[];

export type TranslatorTestResult = {
    name: string;
    originalTextLength?: number;
    dictionaryEntries: DictionaryEntry[];
};

export type TranslatorTestNoteDataResults = TranslatorTestNoteDataResult[];

export type TranslatorTestNoteDataResult = {
    name: string;
    noteDataList: Omit<NoteData, 'dictionaryEntry'>[] | null;
};

export type AnkiNoteBuilderTestResults = AnkiNoteBuilderTestResult[];

export type AnkiNoteBuilderTestResult = {
    name: string;
    results: NoteFields[] | null;
};
