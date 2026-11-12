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
 * Positive shared JMdict sequence from a primary term entry's definitions, or -1.
 * Non-positive sequences (unsequenced dictionaries often store 0 or -1) are ignored
 * so they cannot veto a real JMdict id from another definition on the same entry.
 * @param {import('dictionary').TermDictionaryEntry} dictionaryEntry
 * @returns {number}
 */
export function getTermDictionaryEntrySequence(dictionaryEntry) {
    if (!dictionaryEntry.isPrimary) { return -1; }
    /** @type {?number} */
    let mainSequence = null;
    for (const {sequences} of dictionaryEntry.definitions) {
        const sequence = sequences[0];
        if (!(typeof sequence === 'number' && sequence > 0)) { continue; }
        if (mainSequence === null) {
            mainSequence = sequence;
        } else if (mainSequence !== sequence) {
            return -1;
        }
    }
    return mainSequence !== null ? mainSequence : -1;
}
