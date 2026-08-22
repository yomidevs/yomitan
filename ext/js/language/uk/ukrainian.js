/*
 * Copyright (C) 2026  Yomitan Authors
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
 * Ukrainian is written exclusively in Cyrillic, so a string with no Cyrillic in it cannot be
 * Ukrainian. The test is deliberately for the script rather than for the thirty-three letters of
 * the Ukrainian alphabet: most Ukrainian words are spelled entirely from the letters Ukrainian
 * shares with its neighbours, so an alphabet test could not tell Ukrainian from Russian anyway,
 * while it would reject text that merely quotes a foreign name or an older orthography.
 */
const cyrillicRegExp = /\p{Script=Cyrillic}/u;

/**
 * @param {string} str
 * @returns {boolean}
 */
export function isStringPartiallyUkrainian(str) {
    return cyrillicRegExp.test(str);
}
