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

import type * as DictionaryData from './dictionary-data';
import type * as DictionaryDatabase from './dictionary-database';
import type * as StructuredContent from './structured-content';

export type OnProgressCallback = (data: ProgressData) => void;

export type ProgressData = {
    stepIndex: number;
    stepCount: number;
    index: number;
    count: number;
};

export type ImportResult = {
    result: Summary;
    errors: Error[];
};

export type ImportDetails = {
    prefixWildcardsSupported: boolean;
};

export type Summary = {
    title: string;
    revision: string;
    sequenced: boolean;
    version: number;
    importDate: number;
    prefixWildcardsSupported: boolean;
    counts: SummaryCounts;
    author?: string;
    url?: string;
    description?: string;
    attribution?: string;
    frequencyMode?: 'occurrence-based' | 'rank-based';
};

export type SummaryCounts = {
    terms: SummaryItemCount;
    termMeta: SummaryMetaCount;
    kanji: SummaryItemCount;
    kanjiMeta: SummaryMetaCount;
    tagMeta: SummaryItemCount;
    media: SummaryItemCount;
};

export type SummaryItemCount = {
    total: number;
};

export type SummaryMetaCount = {
    total: number;
    [key: string]: number;
};

export type ImportRequirement = (
    ImageImportRequirement |
    StructuredContentImageImportRequirement
);

export type ImageImportRequirement = {
    type: 'image';
    target: DictionaryData.TermGlossaryImage;
    source: DictionaryData.TermGlossaryImage;
    entry: DictionaryDatabase.DatabaseTermEntry;
};

export type StructuredContentImageImportRequirement = {
    type: 'structured-content-image';
    target: StructuredContent.ImageElement;
    source: StructuredContent.ImageElement;
    entry: DictionaryDatabase.DatabaseTermEntry;
};

export type ImportRequirementContext = {
    archive: import('jszip');
    media: Map<string, DictionaryDatabase.MediaDataArrayBufferContent>;
};
