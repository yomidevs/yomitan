/*
 * Copyright (C) 2023-2026  Yomitan Authors
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

import {bench, describe} from 'vitest';
import {getAllLanguageReadingNormalizers, getAllLanguageTextProcessors, getLanguageSummaries, isTextLookupWorthy} from '../ext/js/language/languages.js';

const languageSummaries = getLanguageSummaries();
const exampleTextMap = new Map(languageSummaries.map(({iso, exampleText}) => [iso, exampleText]));

const textProcessorEntries = getAllLanguageTextProcessors().map(({iso, textPostprocessors, textPreprocessors}) => ({
    iso,
    text: exampleTextMap.get(iso) ?? '',
    textProcessors: [...(textPreprocessors ?? []), ...(textPostprocessors ?? [])],
}));

const readingNormalizers = getAllLanguageReadingNormalizers();

const processorCount = textProcessorEntries.reduce((total, {textProcessors}) => total + textProcessors.length, 0);

describe('language text processors', () => {
    bench(`all text pre/postprocessors on example text (n=${processorCount})`, () => {
        for (const {text, textProcessors} of textProcessorEntries) {
            for (const {textProcessor} of textProcessors) {
                textProcessor.process(text);
            }
        }
    });

    bench(`reading normalizers on example text (n=${readingNormalizers.length})`, () => {
        for (const {iso, readingNormalizer} of readingNormalizers) {
            readingNormalizer(exampleTextMap.get(iso) ?? '');
        }
    });

    bench(`isTextLookupWorthy on example text (n=${languageSummaries.length})`, () => {
        for (const {iso, exampleText} of languageSummaries) {
            isTextLookupWorthy(exampleText, iso);
        }
    });
});
