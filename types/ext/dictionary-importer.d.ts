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

import type * as ZipJS from '@zip.js/zip.js';
import type * as Ajv from 'ajv';
import type * as DictionaryData from './dictionary-data';
import type * as DictionaryDatabase from './dictionary-database';
import type * as StructuredContent from './structured-content';

export type OnProgressCallback = (data: ProgressData) => void;

export type ImportStep = {label: string, callback?: () => void};

export type ImportSteps = ImportStep[];

export type ProgressData = {
    index: number;
    count: number;
    nextStep?: boolean;
};

export type ImportResult = {
    result: Summary | null;
    errors: Error[];
};

export type ImportDetails = {
    prefixWildcardsSupported: boolean;
    yomitanVersion: string;
};

export type Summary = {
    title: string;
    revision: string;
    sequenced: boolean;
    minimumYomitanVersion?: string;
    version: number;
    importDate: number;
    prefixWildcardsSupported: boolean;
    counts?: SummaryCounts;
    styles: string;
    isUpdatable?: boolean;
    indexUrl?: string;
    downloadUrl?: string;
    author?: string;
    url?: string;
    description?: string;
    attribution?: string;
    sourceLanguage?: string;
    targetLanguage?: string;
    frequencyMode?: 'occurrence-based' | 'rank-based';
};

export type SummaryDetails = {
    prefixWildcardsSupported: boolean;
    counts: SummaryCounts;
    styles: string;
    yomitanVersion: string;
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
    fileMap: ArchiveFileMap;
    media: Map<string, DictionaryDatabase.MediaDataArrayBufferContent>;
};

export type ArchiveFileMap = Map<string, ZipJS.Entry>;

/**
 * An array of tuples of a file type inside a dictionary and its corresponding regular expression.
 */
export type QueryDetails = [fileType: string, fileNameFormat: RegExp][];

/**
 * A map of file types inside a dictionary and its matching entries.
 */
export type QueryResult = Map<string, ZipJS.Entry[]>;

export type CompiledSchemaNameArray = [
    termBank: CompiledSchemaName,
    termMetaBank: CompiledSchemaName,
    kanjiBank: CompiledSchemaName,
    kanjiMetaBank: CompiledSchemaName,
    tagBank: CompiledSchemaName,
];

export type CompiledSchemaValidators = {
    dictionaryIndex: Ajv.ValidateFunction<unknown>;
    dictionaryTermBankV1: Ajv.ValidateFunction<unknown>;
    dictionaryTermBankV3: Ajv.ValidateFunction<unknown>;
    dictionaryTermMetaBankV3: Ajv.ValidateFunction<unknown>;
    dictionaryKanjiBankV1: Ajv.ValidateFunction<unknown>;
    dictionaryKanjiBankV3: Ajv.ValidateFunction<unknown>;
    dictionaryKanjiMetaBankV3: Ajv.ValidateFunction<unknown>;
    dictionaryTagBankV3: Ajv.ValidateFunction<unknown>;
};

export type CompiledSchemaName = keyof CompiledSchemaValidators;
