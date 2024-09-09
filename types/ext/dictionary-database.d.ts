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

import type * as Dictionary from './dictionary';
import type * as DictionaryData from './dictionary-data';
import type * as DictionaryImporter from './dictionary-importer';

export type DatabaseId = {
    id: number; // Automatic database primary key
};

export type MediaDataBase<TContentType = unknown> = {
    content: TContentType;
    dictionary: string;
    height: number;
    mediaType: string;
    path: string;
    width: number;
};

export type MediaDataArrayBufferContent = MediaDataBase<ArrayBuffer>;

export type MediaDataStringContent = MediaDataBase<string>;

type MediaType = ArrayBuffer | string;

export type Media<T extends MediaType = ArrayBuffer> = {index: number} & MediaDataBase<T>;

export type DatabaseTermEntry = {
    definitionTags: null | string;
    dictionary: string;
    expression: string;
    expressionReverse?: string;
    glossary: DictionaryData.TermGlossary[];
    reading: string;
    readingReverse?: string;
    rules: string;
    score: number;
    sequence?: number;
    /** Legacy alias for the `definitionTags` field. */
    tags?: string;
    termTags?: string;
};

export type DatabaseTermEntryWithId = DatabaseId & DatabaseTermEntry;

export type TermEntry = {
    definitions: DictionaryData.TermGlossary[];
    definitionTags: string[];
    dictionary: string;
    id: number;
    index: number;
    matchSource: MatchSource;
    matchType: MatchType;
    reading: string;
    rules: string[];
    score: number;
    sequence: number;
    term: string;
    termTags: string[];
};

export type DatabaseKanjiEntry = {
    character: string;
    dictionary: string;
    kunyomi: string;
    meanings: string[];
    onyomi: string;
    stats?: {[name: string]: string};
    tags: string;
};

export type KanjiEntry = {
    character: string;
    definitions: string[];
    dictionary: string;
    index: number;
    kunyomi: string[];
    onyomi: string[];
    stats: {[name: string]: string};
    tags: string[];
};

export type Tag = {
    category: string;
    dictionary: string;
    name: string;
    notes: string;
    order: number;
    score: number;
};

export type DatabaseTermMeta = DatabaseTermMetaFrequency | DatabaseTermMetaPhoneticData | DatabaseTermMetaPitch;

export type DatabaseTermMetaFrequency = {
    data: DictionaryData.GenericFrequencyData | DictionaryData.TermMetaFrequencyDataWithReading;
    dictionary: string;
    expression: string;
    mode: 'freq';
};

export type DatabaseTermMetaPitch = {
    data: DictionaryData.TermMetaPitchData;
    dictionary: string;
    expression: string;
    mode: 'pitch';
};

export type DatabaseTermMetaPhoneticData = {
    data: DictionaryData.TermMetaPhoneticData;
    dictionary: string;
    expression: string;
    mode: 'ipa';
};

export type TermMetaFrequencyDataWithReading = {
    frequency: DictionaryData.GenericFrequencyData;
    reading: string;
};

export type TermMeta = TermMetaFrequency | TermMetaPhoneticData | TermMetaPitch;

export type TermMetaType = TermMeta['mode'];

export type TermMetaFrequency = {
    data: DictionaryData.GenericFrequencyData | DictionaryData.TermMetaFrequencyDataWithReading;
    dictionary: string;
    index: number;
    mode: 'freq';
    term: string;
};

export type TermMetaPitch = {
    data: DictionaryData.TermMetaPitchData;
    dictionary: string;
    index: number;
    mode: 'pitch';
    term: string;
};

export type TermMetaPhoneticData = {
    data: DictionaryData.TermMetaPhoneticData;
    dictionary: string;
    index: number;
    mode: 'ipa';
    term: string;
};

export type DatabaseKanjiMeta = DatabaseKanjiMetaFrequency;

export type DatabaseKanjiMetaFrequency = {
    character: string;
    data: DictionaryData.GenericFrequencyData;
    dictionary: string;
    mode: 'freq';
};

export type KanjiMeta = KanjiMetaFrequency;

export type KanjiMetaType = KanjiMeta['mode'];

export type KanjiMetaFrequency = {
    character: string;
    data: DictionaryData.GenericFrequencyData;
    dictionary: string;
    index: number;
    mode: 'freq';
};

export type DictionaryCounts = {
    counts: DictionaryCountGroup[];
    total: DictionaryCountGroup | null;
};

export type DictionaryCountGroup = {
    [key: string]: number;
};

export type ObjectStoreName = (
    'dictionaries' |
    'kanji' |
    'kanjiMeta' |
    'media' |
    'tagMeta' |
    'termMeta' |
    'terms'
);

export type ObjectStoreData<T extends ObjectStoreName> = (
    T extends 'dictionaries' ? DictionaryImporter.Summary :
    T extends 'terms' ? DatabaseTermEntry :
    T extends 'termMeta' ? DatabaseTermMeta :
    T extends 'kanji' ? DatabaseKanjiEntry :
    T extends 'kanjiMeta' ? DatabaseKanjiMeta :
    T extends 'tagMeta' ? Tag :
    T extends 'media' ? MediaDataArrayBufferContent :
    never
);

export type DeleteDictionaryProgressData = {
    count: number;
    processed: number;
    storeCount: number;
    storesProcesed: number;
};

export type DeleteDictionaryProgressCallback = (data: DeleteDictionaryProgressData) => void;

export type MatchType = Dictionary.TermSourceMatchType;

export type MatchSource = Dictionary.TermSourceMatchSource;

export type DictionaryAndQueryRequest = {
    dictionary: string;
    query: number | string;
};

export type TermExactRequest = {
    reading: string;
    term: string;
};

export type MediaRequest = {
    dictionary: string;
    path: string;
};

export type FindMultiBulkData<TItem = unknown> = {
    indexIndex: number;
    item: TItem;
    itemIndex: number;
};

export type CreateQuery<TItem = unknown> = (item: TItem) => (IDBKeyRange | IDBValidKey | null);

export type FindPredicate<TItem = unknown, TRow = unknown> = (row: TRow, item: TItem) => boolean;

export type CreateResult<TItem = unknown, TRow = unknown, TResult = unknown> = (row: TRow, data: FindMultiBulkData<TItem>) => TResult;

export type DictionarySet = {
    has(value: string): boolean;
};
