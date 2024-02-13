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

import {descriptor as descriptorArabic} from './ar/language-arabic.js';
import {descriptor as descriptorGerman} from './de/language-german.js';
import {descriptor as descriptorGreek} from './el/language-greek.js';
import {descriptor as descriptorEnglish} from './en/language-english.js';
import {descriptor as descriptorSpanish} from './es/language-spanish.js';
import {descriptor as descriptorPersian} from './fa/language-persian.js';
import {descriptor as descriptorFrench} from './fr/language-french.js';
import {descriptor as descriptorAncientGreek} from './grc/language-ancient-greek.js';
import {descriptor as descriptorHungarian} from './hu/language-hungarian.js';
import {descriptor as descriptorIndonesian} from './id/language-indonesian.js';
import {descriptor as descriptorItalian} from './it/language-italian.js';
import {descriptor as descriptorJapanese} from './ja/language-japanese.js';
import {descriptor as descriptorKhmer} from './km/language-khmer.js';
import {descriptor as descriptorLatin} from './la/language-latin.js';
import {descriptor as descriptorPolish} from './pl/language-polish.js';
import {descriptor as descriptorPortuguese} from './pt/language-portuguese.js';
import {descriptor as descriptorRomanian} from './ro/language-romanian.js';
import {descriptor as descriptorRussian} from './ru/language-russian.js';
import {descriptor as descriptorSerboCroatian} from './sh/language-serbo-croatian.js';
import {descriptor as descriptorAlbanian} from './sq/language-albanian.js';
import {descriptor as descriptorSwedish} from './sv/language-swedish.js';
import {descriptor as descriptorThai} from './th/language-thai.js';
import {descriptor as descriptorVietnamese} from './vi/language-vietnamese.js';
import {descriptor as descriptorChinese} from './zh/language-chinese.js';

const languageDescriptors = [
    descriptorAlbanian,
    descriptorArabic,
    descriptorAncientGreek,
    descriptorChinese,
    descriptorEnglish,
    descriptorFrench,
    descriptorGerman,
    descriptorGreek,
    descriptorHungarian,
    descriptorIndonesian,
    descriptorItalian,
    descriptorJapanese,
    descriptorKhmer,
    descriptorLatin,
    descriptorPersian,
    descriptorPolish,
    descriptorPortuguese,
    descriptorRomanian,
    descriptorRussian,
    descriptorSerboCroatian,
    descriptorSwedish,
    descriptorSpanish,
    descriptorThai,
    descriptorVietnamese
];

/** @type {Map<string, typeof languageDescriptors[0]>} */
const languageDescriptorMap = new Map();
for (const languageDescriptor of languageDescriptors) {
    languageDescriptorMap.set(languageDescriptor.iso, languageDescriptor);
}

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
