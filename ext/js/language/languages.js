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

import {languageDescriptorMap} from './language-descriptors.js';

/**
 * @returns {import('language').LanguageSummary[]}
 */
export function getLanguageSummaries() {
    const results = [];
    for (const {name, iso, exampleText} of languageDescriptorMap.values()) {
        results.push({name, iso, exampleText});
    }
    return results;
}

/**
 * @returns {import('language').LanguageAndPreprocessors[]}
 * @throws {Error}
 */
export function getAllLanguageTextPreprocessors() {
    const results = [];
    for (const {iso, textPreprocessors} of languageDescriptorMap.values()) {
        /** @type {import('language').TextPreprocessorWithId<unknown>[]} */
        const textPreprocessorsArray = [];
        for (const [id, textPreprocessor] of Object.entries(textPreprocessors)) {
            textPreprocessorsArray.push({
                id,
                textPreprocessor: /** @type {import('language').TextPreprocessor<unknown>} */ (textPreprocessor)
            });
        }
        results.push({iso, textPreprocessors: textPreprocessorsArray});
    }
    return results;
}

/**
 * @param {string} text
 * @param {string} language
 * @returns {boolean}
 */
export function isTextLookupWorthy(text, language) {
    const descriptor = languageDescriptorMap.get(language);
    if (typeof descriptor === 'undefined') { return false; }
    return typeof descriptor.isTextLookupWorthy === 'undefined' || descriptor.isTextLookupWorthy(text);
}

/**
 * @returns {import('language').LanguageAndTransforms[]}
 */
export function getAllLanguageTransformDescriptors() {
    const results = [];
    for (const {iso, languageTransforms} of languageDescriptorMap.values()) {
        if (languageTransforms) {
            results.push({iso, languageTransforms});
        }
    }
    return results;
}
