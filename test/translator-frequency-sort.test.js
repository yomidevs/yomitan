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
import {Translator} from '../ext/js/language/translator.js';

/**
 * Creates a term frequency in the internal shape produced by the translator.
 * @param {number} index
 * @param {string} dictionary
 * @param {number} dictionaryIndex
 * @param {number} frequency
 * @returns {import('dictionary').TermFrequency}
 */
function createFrequency(index, dictionary, dictionaryIndex, frequency) {
    return {
        index,
        headwordIndex: 0,
        dictionary,
        dictionaryAlias: dictionary,
        dictionaryIndex,
        frequencyMode: 'rank-based',
        hasReading: false,
        frequency,
        displayValue: null,
        displayValueParsed: false,
    };
}

/**
 * Builds a minimal single-headword term dictionary entry carrying only the fields
 * used by the harmonic frequency sort.
 * @param {import('dictionary').TermFrequency[]} frequencies
 * @returns {import('translation-internal').TermDictionaryEntry}
 */
function createEntry(frequencies) {
    return /** @type {import('translation-internal').TermDictionaryEntry} */ (/** @type {unknown} */ ({
        headwords: [{}],
        definitions: [{headwordIndices: [0], frequencyOrder: 0}],
        frequencies,
        frequencyOrder: 0,
    }));
}

describe('Translator harmonic frequency sort', () => {
    const translator = new Translator(/** @type {import('../ext/js/dictionary/dictionary-database.js').DictionaryDatabase} */ (/** @type {unknown} */ ({})));
    // Accessed via a string key so the underscore-prefixed method name does not trip no-underscore-dangle.
    // eslint-disable-next-line dot-notation
    const updateSortFrequenciesHarmonic = translator['_updateSortFrequenciesHarmonic'].bind(translator);

    test('averages the frequency across all dictionaries (matching the displayed harmonic value)', () => {
        // harmonic(1, 3) = 2 / (1/1 + 1/3) = 1.5 -> floor 1
        const entryLow = createEntry([
            createFrequency(0, 'A', 0, 1),
            createFrequency(1, 'B', 1, 3),
        ]);
        // harmonic(4, 12) = 2 / (1/4 + 1/12) = 6
        const entryHigh = createEntry([
            createFrequency(0, 'A', 0, 4),
            createFrequency(1, 'B', 1, 12),
        ]);

        /** @type {import('translation-internal').TermDictionaryEntry[]} */
        const entries = [entryHigh, entryLow];
        updateSortFrequenciesHarmonic(entries, true);

        expect(entryLow.frequencyOrder).toStrictEqual(1);
        expect(entryHigh.frequencyOrder).toStrictEqual(6);
        expect(entryLow.definitions[0].frequencyOrder).toStrictEqual(1);
        expect(entryHigh.definitions[0].frequencyOrder).toStrictEqual(6);

        // Ascending places the lower average first.
        entries.sort((a, b) => a.frequencyOrder - b.frequencyOrder);
        expect(entries).toStrictEqual([entryLow, entryHigh]);
    });

    test('descending negates the order so the higher average sorts first', () => {
        const entryLow = createEntry([createFrequency(0, 'A', 0, 2)]);
        const entryHigh = createEntry([createFrequency(0, 'A', 0, 50)]);

        const entries = [entryLow, entryHigh];
        updateSortFrequenciesHarmonic(entries, false);

        expect(entryLow.frequencyOrder).toStrictEqual(-2);
        expect(entryHigh.frequencyOrder).toStrictEqual(-50);

        entries.sort((a, b) => a.frequencyOrder - b.frequencyOrder);
        expect(entries).toStrictEqual([entryHigh, entryLow]);
    });

    test('counts at most one frequency per dictionary', () => {
        // The second value from dictionary A must be ignored: harmonic(1, 3) = 1, not harmonic(1, 100, 3).
        const entry = createEntry([
            createFrequency(0, 'A', 0, 1),
            createFrequency(1, 'A', 0, 100),
            createFrequency(2, 'B', 1, 3),
        ]);
        updateSortFrequenciesHarmonic([entry], true);
        expect(entry.frequencyOrder).toStrictEqual(1);
    });

    test('entries without frequency data sort last', () => {
        const entryWithData = createEntry([createFrequency(0, 'A', 0, 5)]);
        const entryNoData = createEntry([]);

        const ascending = [entryWithData, entryNoData];
        updateSortFrequenciesHarmonic(ascending, true);
        expect(entryNoData.frequencyOrder).toStrictEqual(Number.MAX_SAFE_INTEGER);
        expect(entryWithData.frequencyOrder).toStrictEqual(5);

        updateSortFrequenciesHarmonic([entryWithData, entryNoData], false);
        expect(entryNoData.frequencyOrder).toStrictEqual(0);
        expect(entryWithData.frequencyOrder).toStrictEqual(-5);
    });
});
