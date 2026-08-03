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

import {getMessage} from '../language/i18n-util.js';

/**
 * @param {string} name Dictionary display name from recommended-dictionaries.json
 * @param {?Record<string, string>} nameToKey Map name → message key (rec_dict_desc_*)
 * @param {string} fallbackDescription English description from JSON
 * @returns {string}
 */
export function getRecommendedDictionaryDescription(name, nameToKey, fallbackDescription) {
    if (nameToKey !== null && typeof nameToKey[name] === 'string') {
        const message = getMessage(nameToKey[name]);
        if (message) {
            return message;
        }
    }
    return fallbackDescription;
}
