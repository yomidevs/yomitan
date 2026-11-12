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

import {describe, expect, test} from 'vitest';
import {getTermDictionaryEntrySequence} from '../../ext/js/dictionary/term-dictionary-entry-sequence.js';

/**
 * @param {number[]} sequences
 * @param {boolean} [isPrimary]
 * @returns {import('dictionary').TermDictionaryEntry}
 */
function entryWithSequences(sequences, isPrimary = true) {
    return /** @type {import('dictionary').TermDictionaryEntry} */ ({
        type: 'term',
        isPrimary,
        definitions: sequences.map((sequence) => ({sequences: [sequence]})),
    });
}

describe('getTermDictionaryEntrySequence', () => {
    test('ignores non-positive sequences so an unsequenced dictionary cannot veto JMdict', () => {
        expect(getTermDictionaryEntrySequence(entryWithSequences([0, 0, 2520790]))).toBe(2520790);
        expect(getTermDictionaryEntrySequence(entryWithSequences([-1, 1577800]))).toBe(1577800);
        expect(getTermDictionaryEntrySequence(entryWithSequences([0, 1358280]))).toBe(1358280);
    });

    test('returns -1 when positive sequences disagree or none exist', () => {
        expect(getTermDictionaryEntrySequence(entryWithSequences([2520790, 1577800]))).toBe(-1);
        expect(getTermDictionaryEntrySequence(entryWithSequences([0, -1]))).toBe(-1);
        expect(getTermDictionaryEntrySequence(entryWithSequences([2520790], false))).toBe(-1);
    });
});
