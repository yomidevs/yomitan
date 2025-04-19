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

import {basicTextProcessorOptions} from '../text-processors.js';

const optionalDiacritics = [
    '\u0618', // Small Fatha
    '\u0619', // Small Damma
    '\u061A', // Small Kasra
    '\u064B', // Fathatan
    '\u064C', // Dammatan
    '\u064D', // Kasratan
    '\u064E', // Fatha
    '\u064F', // Damma
    '\u0650', // Kasra
    '\u0651', // Shadda
    '\u0652', // Sukun
    '\u0653', // Maddah
    '\u0654', // Hamza Above
    '\u0655', // Hamza Below
    '\u0656', // Subscript Alef
    '\u0670', // Dagger Alef
];

const diacriticsRegex = new RegExp(`[${optionalDiacritics.join('')}]`, 'g');

/** @type {import('language').TextProcessor<boolean>} */
export const removeArabicScriptDiacritics = {
    name: 'Remove diacritics',
    description: 'وَلَدَ → ولد',
    options: basicTextProcessorOptions,
    process: (text, setting) => {
        return setting ? text.replace(diacriticsRegex, '') : text;
    },
};

/** @type {import('language').TextProcessor<boolean>} */
export const removeTatweel = {
    name: 'Remove tatweel characters',
    description: 'لـكن → لكن',
    options: basicTextProcessorOptions,
    process: (text, setting) => {
        return setting ? text.replaceAll('ـ', '') : text;
    },
};

/** @type {import('language').TextProcessor<boolean>} */
export const normalizeUnicode = {
    name: 'Normalize unicode',
    description: 'ﻴ → ي',
    options: basicTextProcessorOptions,
    process: (text, setting) => {
        return setting ? text.normalize('NFKC') : text;
    },
};

/** @type {import('language').TextProcessor<boolean>} */
export const addHamzaTop = {
    name: 'Add Hamza to top of Alif',
    description: 'اكبر → أكبر',
    options: basicTextProcessorOptions,
    process: (text, setting) => {
        return setting ? text.replace('ا', 'أ') : text;
    },
};

/** @type {import('language').TextProcessor<boolean>} */
export const addHamzaBottom = {
    name: 'Add Hamza to bottom of Alif',
    description: 'اسلام → إسلام',
    options: basicTextProcessorOptions,
    process: (text, setting) => {
        return setting ? text.replace('ا', 'إ') : text;
    },
};

/** @type {import('language').TextProcessor<boolean>} */
export const convertAlifMaqsuraToYaa = {
    name: 'Convert Alif Maqsura to Yaa',
    description: 'فى → في',
    options: basicTextProcessorOptions,
    process: (text, setting) => {
        return setting ? text.replace(/ى$/, 'ي') : text;
    },
};

/** @type {import('language').TextProcessor<boolean>} */
export const convertHaToTaMarbuta = {
    name: 'Convert final Ha to Ta Marbuta',
    description: 'لغه → لغة',
    options: basicTextProcessorOptions,
    process: (text, setting) => {
        return setting ? text.replace(/ه$/, 'ة') : text;
    },
};
