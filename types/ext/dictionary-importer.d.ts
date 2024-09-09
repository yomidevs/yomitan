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

import type * as ZipJS from '@zip.js/zip.js';
import type * as Ajv from 'ajv';
import type * as DictionaryData from './dictionary-data';
import type * as DictionaryDatabase from './dictionary-database';
import type * as StructuredContent from './structured-content';

export type OnProgressCallback = (data: ProgressData) => void;

export type ImportStep = {callback?: () => void, label: string};

export type ImportSteps = ImportStep[];

export type ProgressData = {
    count: number;
    index: number;
    nextStep?: boolean;
};

export type ImportResult = {
    errors: Error[];
    result: null | Summary;
};

export type ImportDetails = {
    prefixWildcardsSupported: boolean;
};

export type Summary = {
    attribution?: string;
    author?: string;
    counts: SummaryCounts;
    description?: string;
    downloadUrl?: string;
    frequencyMode?: 'occurrence-based' | 'rank-based';
    importDate: number;
    indexUrl?: string;
    isUpdatable?: boolean;
    prefixWildcardsSupported: boolean;
    revision: string;
    sequenced: boolean;
    sourceLanguage?: string;
    styles: string;
    targetLanguage?: string;
    title: string;
    url?: string;
    version: number;
};

export type SummaryDetails = {
    counts: SummaryCounts;
    prefixWildcardsSupported: boolean;
    styles: string;
};

export type SummaryCounts = {
    kanji: SummaryItemCount;
    kanjiMeta: SummaryMetaCount;
    media: SummaryItemCount;
    tagMeta: SummaryItemCount;
    termMeta: SummaryMetaCount;
    terms: SummaryItemCount;
};

export type SummaryItemCount = {
    total: number;
};

export type SummaryMetaCount = {
    [key: string]: number;
    total: number;
};

export type ImportRequirement = (
    ImageImportRequirement |
    StructuredContentImageImportRequirement
);

export type ImageImportRequirement = {
    entry: DictionaryDatabase.DatabaseTermEntry;
    source: DictionaryData.TermGlossaryImage;
    target: DictionaryData.TermGlossaryImage;
    type: 'image';
};

export type StructuredContentImageImportRequirement = {
    entry: DictionaryDatabase.DatabaseTermEntry;
    source: StructuredContent.ImageElement;
    target: StructuredContent.ImageElement;
    type: 'structured-content-image';
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
    dictionaryKanjiBankV1: Ajv.ValidateFunction<unknown>;
    dictionaryKanjiBankV3: Ajv.ValidateFunction<unknown>;
    dictionaryKanjiMetaBankV3: Ajv.ValidateFunction<unknown>;
    dictionaryTagBankV3: Ajv.ValidateFunction<unknown>;
    dictionaryTermBankV1: Ajv.ValidateFunction<unknown>;
    dictionaryTermBankV3: Ajv.ValidateFunction<unknown>;
    dictionaryTermMetaBankV3: Ajv.ValidateFunction<unknown>;
};

export type CompiledSchemaName = keyof CompiledSchemaValidators;
