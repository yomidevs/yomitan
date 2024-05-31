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

import {basicTextProcessorOptions} from '../text-processors.js';

/** @type {import('language').TextProcessor<boolean>} */
export const removeRussianDiacritics = {
    name: 'Remove diacritics',
    description: 'A\u0301 → A, a\u0301 → a',
    options: basicTextProcessorOptions,
    process: (str, setting) => {
        return setting ? str.replace(/\u0301/g, '') : str;
    },
};

/** @type {import('language').TextProcessor<boolean>} */
export const yoToE = {
    name: 'Yo to E',
    description: 'ё → е, Ё → Е',
    options: basicTextProcessorOptions,
    process: (str, setting) => {
        return setting ? str.replace(/ё/g, 'е').replace(/Ё/g, 'Е') : str;
    },
};
