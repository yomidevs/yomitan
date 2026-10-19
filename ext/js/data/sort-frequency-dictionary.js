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

/**
 * Sentinel value for the `sortFrequencyDictionary` setting indicating that search
 * results should be sorted by the harmonic average frequency across all installed
 * frequency dictionaries, rather than by a single dictionary. The value contains a
 * leading NUL character so it cannot collide with a real dictionary title.
 * @type {string}
 */
export const SORT_FREQUENCY_DICTIONARY_AVERAGE = '\0average';
