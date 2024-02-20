/*
 * Copyright (C) 2024  Yomitan Authors
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

import type {TextSourceMap} from '../../ext/js/general/text-source-map.js';

export type TextPreprocessorOptions<T = unknown> = T[];

export type TextPreprocessorFunction<T = unknown> = (str: string, setting: T, sourceMap: TextSourceMap) => string;

/**
 * Text preprocessors are used during the translation process to create alternate versions of the input text to search for.
 * This is helpful when the input text doesn't exactly match the term or expression found in the database.
 * When a language has multiple preprocessors, the translator will generate variants of the text by applying all combinations of the preprocessors.
 */
export type TextPreprocessor<T = unknown> = {
    name: string;
    description: string;
    options: TextPreprocessorOptions<T>;
    process: TextPreprocessorFunction<T>;
};

export type BidirectionalPreprocessorOptions = 'off' | 'direct' | 'inverse';

export type BidirectionalConversionPreprocessor = TextPreprocessor<BidirectionalPreprocessorOptions>;

export type LanguageAndPreprocessors = {
    iso: string;
    textPreprocessors: TextPreprocessorWithId<unknown>[];
};

export type TextPreprocessorWithId<T = unknown> = {
    id: string;
    textPreprocessor: TextPreprocessor<T>;
};

export type LanguageSummary = {
    name: string;
    iso: string;
    exampleText: string;
};
