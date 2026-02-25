/*
 * Copyright (C) 2024-2025  Yomitan Authors
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

import type {LanguageTransformDescriptor} from './language-transformer.js';

export type TextProcessorFunction = (str: string) => string[];

/**
 * Text pre- and post-processors are used during the translation process to create alternate versions of the input text to search for.
 * This is helpful when the input text doesn't exactly match the term or expression found in the database.
 * When a language has multiple processors, the translator will generate variants of the text by applying all combinations of the processors.
 * The process function returns an array of strings: all variants the processor wants to produce for the given input.
 * Returning the original string as the first element is conventional for optional processors (equivalent to an "off" option).
 * Always-on processors omit the original string from the result.
 */
export type TextProcessor = {
    name: string;
    description: string;
    process: TextProcessorFunction;
};

export type ReadingNormalizer = (str: string) => string;

export type LanguageAndProcessors = {
    iso: string;
    textPreprocessors?: TextProcessorWithId[];
    textPostprocessors?: TextProcessorWithId[];
};

export type LanguageAndReadingNormalizer = {
    iso: string;
    readingNormalizer: ReadingNormalizer;
};

export type LanguageAndTransforms = {
    iso: string;
    languageTransforms: LanguageTransformDescriptor;
};

export type TextProcessorWithId = {
    id: string;
    textProcessor: TextProcessor;
};

export type LanguageSummary = {
    name: string;
    iso: string;
    iso639_3: string;
    exampleText: string;
};

export type KanaIMEOutput = {
    kanaString: string;
    newSelectionStart: number;
};
