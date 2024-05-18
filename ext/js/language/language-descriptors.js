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

import {removeArabicScriptDiacritics} from './ar/arabic-text-preprocessors.js';
import {eszettPreprocessor} from './de/german-text-preprocessors.js';
import {germanTransforms} from './de/german-transforms.js';
import {englishTransforms} from './en/english-transforms.js';
import {collapseEmphaticSequences, convertAlphabeticCharacters, convertHalfWidthCharacters, convertHiraganaToKatakana, convertNumericCharacters} from './ja/japanese-text-preprocessors.js';
import {japaneseTransforms} from './ja/japanese-transforms.js';
import {isStringPartiallyJapanese} from './ja/japanese.js';
import {disassembleHangul, reassembleHangul} from './ko/korean-text-processors.js';
import {koreanTransforms} from './ko/korean-transforms.js';
import {latinTransforms} from './la/latin-transforms.js';
import {removeRussianDiacritics, yoToE} from './ru/russian-text-preprocessors.js';
import {oldIrishTransforms} from './sga/old-irish-transforms.js';
import {albanianTransforms} from './sq/albanian-transforms.js';
import {capitalizeFirstLetter, decapitalize, removeAlphabeticDiacritics} from './text-processors.js';

const capitalizationPreprocessors = {
    decapitalize,
    capitalizeFirstLetter
};

/** @type {import('language-descriptors').LanguageDescriptorAny[]} */
const languageDescriptors = [
    {
        iso: 'ar',
        name: 'Arabic',
        exampleText: 'قَرَأَ',
        textPreprocessors: {
            removeArabicScriptDiacritics
        }
    },
    {
        iso: 'de',
        name: 'German',
        exampleText: 'gelesen',
        textPreprocessors: {
            ...capitalizationPreprocessors,
            eszettPreprocessor
        },
        languageTransforms: germanTransforms
    },
    {
        iso: 'el',
        name: 'Greek',
        exampleText: 'διαβάζω',
        textPreprocessors: capitalizationPreprocessors
    },
    {
        iso: 'en',
        name: 'English',
        exampleText: 'read',
        textPreprocessors: capitalizationPreprocessors,
        languageTransforms: englishTransforms
    },
    {
        iso: 'es',
        name: 'Spanish',
        exampleText: 'acabar de',
        textPreprocessors: capitalizationPreprocessors
    },
    {
        iso: 'fa',
        name: 'Persian',
        exampleText: 'خواندن',
        textPreprocessors: {
            removeArabicScriptDiacritics
        }
    },
    {
        iso: 'fi',
        name: 'Finnish',
        exampleText: 'lukea',
        textPreprocessors: capitalizationPreprocessors
    },
    {
        iso: 'fr',
        name: 'French',
        exampleText: 'lire',
        textPreprocessors: capitalizationPreprocessors
    },
    {
        iso: 'grc',
        name: 'Ancient Greek',
        exampleText: 'γράφω',
        textPreprocessors: {
            ...capitalizationPreprocessors,
            removeAlphabeticDiacritics
        }
    },
    {
        iso: 'hu',
        name: 'Hungarian',
        exampleText: 'olvasni',
        textPreprocessors: capitalizationPreprocessors
    },
    {
        iso: 'id',
        name: 'Indonesian',
        exampleText: 'membaca',
        textPreprocessors: capitalizationPreprocessors
    },
    {
        iso: 'it',
        name: 'Italian',
        exampleText: 'leggere',
        textPreprocessors: capitalizationPreprocessors
    },
    {
        iso: 'la',
        name: 'Latin',
        exampleText: 'legere',
        textPreprocessors: {
            ...capitalizationPreprocessors,
            removeAlphabeticDiacritics
        },
        languageTransforms: latinTransforms
    },
    {
        iso: 'lo',
        name: 'Lao',
        exampleText: 'ອ່ານ'
    },
    {
        iso: 'ja',
        name: 'Japanese',
        exampleText: '読め',
        isTextLookupWorthy: isStringPartiallyJapanese,
        textPreprocessors: {
            convertHalfWidthCharacters,
            convertNumericCharacters,
            convertAlphabeticCharacters,
            convertHiraganaToKatakana,
            collapseEmphaticSequences
        },
        languageTransforms: japaneseTransforms
    },
    {
        iso: 'km',
        name: 'Khmer',
        exampleText: 'អាន'
    },
    {
        iso: 'ko',
        name: 'Korean',
        exampleText: '읽어',
        textPreprocessors: {
            disassembleHangul
        },
        textPostprocessors: {
            reassembleHangul
        },
        languageTransforms: koreanTransforms
    },
    {
        iso: 'nl',
        name: 'Dutch',
        exampleText: 'lezen',
        textPreprocessors: capitalizationPreprocessors
    },
    {
        iso: 'pl',
        name: 'Polish',
        exampleText: 'czytacie',
        textPreprocessors: capitalizationPreprocessors
    },
    {
        iso: 'pt',
        name: 'Portuguese',
        exampleText: 'ler',
        textPreprocessors: capitalizationPreprocessors
    },
    {
        iso: 'ro',
        name: 'Romanian',
        exampleText: 'citit',
        textPreprocessors: capitalizationPreprocessors
    },
    {
        iso: 'ru',
        name: 'Russian',
        exampleText: 'читать',
        textPreprocessors: {
            ...capitalizationPreprocessors,
            yoToE,
            removeRussianDiacritics
        }
    },
    {
        iso: 'sga',
        name: 'Old Irish',
        exampleText: 'légaid',
        textPreprocessors: {
            ...capitalizationPreprocessors,
            removeAlphabeticDiacritics
        },
        languageTransforms: oldIrishTransforms
    },
    {
        iso: 'sh',
        name: 'Serbo-Croatian',
        exampleText: 'čitaše',
        textPreprocessors: capitalizationPreprocessors
    },
    {
        iso: 'sq',
        name: 'Albanian',
        exampleText: 'ndihmojme',
        textPreprocessors: capitalizationPreprocessors,
        languageTransforms: albanianTransforms
    },
    {
        iso: 'sv',
        name: 'Swedish',
        exampleText: 'läsa',
        textPreprocessors: capitalizationPreprocessors
    },
    {
        iso: 'th',
        name: 'Thai',
        exampleText: 'อ่าน'
    },
    {
        iso: 'tr',
        name: 'Turkish',
        exampleText: 'okuyor',
        textPreprocessors: capitalizationPreprocessors
    },
    {
        iso: 'vi',
        name: 'Vietnamese',
        exampleText: 'đọc',
        textPreprocessors: capitalizationPreprocessors
    },
    {
        iso: 'zh',
        name: 'Chinese',
        exampleText: '读'
    }
];

/** @type {Map<string, import('language-descriptors').LanguageDescriptorAny>} */
export const languageDescriptorMap = new Map();
for (const languageDescriptor of languageDescriptors) {
    languageDescriptorMap.set(languageDescriptor.iso, languageDescriptor);
}
