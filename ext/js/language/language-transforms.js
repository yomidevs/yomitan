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


/**
 * @param {string} inflectedSuffix
 * @param {string} deinflectedSuffix
 * @param {string[]} conditionsIn
 * @param {string[]} conditionsOut
 * @returns {import('language-transformer').Rule}
 */
export function suffixInflection(inflectedSuffix, deinflectedSuffix, conditionsIn, conditionsOut) {
    const suffixRegExp = new RegExp(inflectedSuffix + '$');
    return {
        isInflected: suffixRegExp,
        uninflect: (text) => text.replace(suffixRegExp, deinflectedSuffix),
        conditionsIn,
        conditionsOut
    };
}

/**
 * @param {Map<string, string>} suffixMap
 * @param {string[]} conditionsIn
 * @param {string[]} conditionsOut
 * @returns {import('language-transformer').Rule}
 */
export function suffixInflectionMap(suffixMap, conditionsIn, conditionsOut) {
    const inflectedSuffixes = Object.keys(suffixMap);
    const isInflected = new RegExp(`(${inflectedSuffixes.join('|')})$`);
    return {
        isInflected,
        uninflect: (text) => {
            const match = /** @type {RegExpMatchArray} */ (text.match(isInflected));
            const inflectedSuffix = match[0];
            const deinflectedSuffix = /** @type {string} */ (suffixMap.get(inflectedSuffix));
            return text.replace(inflectedSuffix, deinflectedSuffix);
        },
        conditionsIn,
        conditionsOut
    };
}
