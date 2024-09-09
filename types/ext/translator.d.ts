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
import type * as DictionaryDatabaseTypes from './dictionary-database';

/**
 * Information about how popup content should be shown, specifically related to the outer popup frame.
 */
export type TermFrequencySimple = {
    /** The name of the dictionary that the term frequency originates from. */
    dictionary: string;
    /** The display value for the frequency, or `null` if none is specified. */
    displayValue: null | string;
    /** Whether or not the `frequency` field is derived from a parsed string. */
    displayValueParsed: boolean;
    /** The frequency value for the term. */
    frequency: number;
    /** Whether or not a reading was specified. */
    hasReading: boolean;
    /** The reading of the term. */
    reading: null | string;
    /** The term. */
    term: string;
};

export type TagGroup = {
    dictionary: string;
    tagNames: string[];
};

export type TagExpansionTarget = {
    tagGroups: TagGroup[];
    tags: Dictionary.Tag[];
};

export type DictionaryTagCache = Map<string, TagCache>;

export type TagCache = Map<string, DictionaryDatabaseTypes.Tag | null>;

export type TagTargetMap = Map<string, Map<string, TagTargetItem>>;

export type TagTargetItem = {
    cache: null | TagCache;
    databaseTag: DictionaryDatabaseTypes.Tag | null;
    dictionary: string;
    query: string;
    tagName: string;
    targets: Dictionary.Tag[][];
};

export type SequenceQuery = {
    dictionary: string;
    query: number;
};

export type FindTermsMode = 'group' | 'merge' | 'simple' | 'split';

export type TermReadingItem = {
    reading: null | string;
    term: string;
};

export type TermReadingList = TermReadingItem[];

export type FindTermsResult = {
    dictionaryEntries: Dictionary.TermDictionaryEntry[];
    originalTextLength: number;
};
