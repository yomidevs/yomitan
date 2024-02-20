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
import {collapseEmphaticSequences, convertAlphabeticCharacters, convertHalfWidthCharacters, convertHiraganaToKatakana, convertNumericCharacters} from './ja/japanese-text-preprocessors.js';
import {removeLatinDiacritics} from './la/latin-text-preprocessors.js';
import {removeRussianDiacritics, yoToE} from './ru/russian-text-preprocessors.js';
import {capitalizeFirstLetter, decapitalize} from './text-preprocessors.js';

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
        }
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
        textPreprocessors: capitalizationPreprocessors
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
            capitalizeFirstLetter,
            decapitalize
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
            removeLatinDiacritics
        }
    },
    {
        iso: 'ja',
        name: 'Japanese',
        exampleText: '読め',
        textPreprocessors: {
            convertHalfWidthCharacters,
            convertNumericCharacters,
            convertAlphabeticCharacters,
            convertHiraganaToKatakana,
            collapseEmphaticSequences
        }
    },
    {
        iso: 'km',
        name: 'Khmer',
        exampleText: 'អាន',
        textPreprocessors: {}
    },
    {
        iso: 'pl',
        name: 'Polish',
        exampleText: 'czytacie',
        textPreprocessors: {
            capitalizeFirstLetter,
            decapitalize
        }
    },
    {
        iso: 'pt',
        name: 'Portuguese',
        exampleText: 'ler',
        textPreprocessors: {
            capitalizeFirstLetter,
            decapitalize
        }
    },
    {
        iso: 'ro',
        name: 'Romanian',
        exampleText: 'citit',
        textPreprocessors: {
            capitalizeFirstLetter,
            decapitalize
        }
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
        iso: 'sh',
        name: 'Serbo-Croatian',
        exampleText: 'čitaše',
        textPreprocessors: {
            capitalizeFirstLetter,
            decapitalize
        }
    },
    {
        iso: 'sq',
        name: 'Albanian',
        exampleText: 'ndihmojme',
        textPreprocessors: {
            capitalizeFirstLetter,
            decapitalize
        }
    },
    {
        iso: 'sv',
        name: 'Swedish',
        exampleText: 'läsa',
        textPreprocessors: {
            capitalizeFirstLetter,
            decapitalize
        }
    },
    {
        iso: 'th',
        name: 'Thai',
        exampleText: 'อ่าน',
        textPreprocessors: {}
    },
    {
        iso: 'vi',
        name: 'Vietnamese',
        exampleText: 'đọc',
        textPreprocessors: {
            capitalizeFirstLetter,
            decapitalize
        }
    },
    {
        iso: 'zh',
        name: 'Chinese',
        exampleText: '读',
        textPreprocessors: {}
    }
];

/** @type {Map<string, import('language-descriptors').LanguageDescriptorAny>} */
export const languageDescriptorMap = new Map();
for (const languageDescriptor of languageDescriptors) {
    languageDescriptorMap.set(languageDescriptor.iso, languageDescriptor);
}
