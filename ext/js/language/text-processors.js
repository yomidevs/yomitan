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

/** @type {import('language').TextProcessorOptions<boolean>} */
export const basicTextProcessorOptions = [false, true];

/** @type {import('language').TextProcessor<boolean>} */
export const decapitalize = {
    description: 'CAPITALIZED TEXT → capitalized text',
    name: 'Decapitalize text',
    options: basicTextProcessorOptions,
    process: (str, setting) => (setting ? str.toLowerCase() : str),
};

/** @type {import('language').TextProcessor<boolean>} */
export const capitalizeFirstLetter = {
    description: 'lowercase text → Lowercase text',
    name: 'Capitalize first letter',
    options: basicTextProcessorOptions,
    process: (str, setting) => (setting ? str.charAt(0).toUpperCase() + str.slice(1) : str),
};

/**
 * WARNING: This should NOT be used with languages that use Han characters,
 *          as it can result in undesirable normalization:
 *            - '\u9038'.normalize('NFD') => '\u9038' (逸)
 *            - '\ufa67'.normalize('NFD') => '\u9038' (逸 => 逸)
 * @type {import('language').TextProcessor<boolean>}
 */
export const removeAlphabeticDiacritics = {
    description: 'ἄήé -> αηe',
    name: 'Remove Alphabetic Diacritics',
    options: basicTextProcessorOptions,
    process: (str, setting) => (setting ? str.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : str),
};
