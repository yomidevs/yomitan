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

import {describe, expect, test, vi} from 'vitest';
import {DictionaryDatabase} from '../ext/js/dictionary/dictionary-database.js';

/**
 * @param {string} name
 * @returns {(this: unknown, ...args: unknown[]) => unknown}
 * @throws {Error}
 */
function getDictionaryDatabaseMethod(name) {
    const method = Reflect.get(DictionaryDatabase.prototype, name);
    if (typeof method !== 'function') {
        throw new Error(`Expected ${name} method`);
    }
    return method;
}

describe('DictionaryDatabase max headword length cache', () => {
    test('returns 0 for an empty terms table and memoizes the query', async () => {
        const selectValue = vi.fn(() => null);
        const context = {
            _maxHeadwordLengthCache: null,
            _requireDb: () => ({selectValue}),
            _asNumber: getDictionaryDatabaseMethod('_asNumber'),
        };

        const getMaxHeadwordLength = getDictionaryDatabaseMethod('getMaxHeadwordLength');
        const first = await getMaxHeadwordLength.call(context);
        const second = await getMaxHeadwordLength.call(context);

        expect(first).toBe(0);
        expect(second).toBe(0);
        expect(selectValue).toHaveBeenCalledTimes(1);
    });

    test('queries both reading and expression lengths when computing the max', async () => {
        const selectValue = vi.fn(() => 11);
        const context = {
            _maxHeadwordLengthCache: null,
            _requireDb: () => ({selectValue}),
            _asNumber: getDictionaryDatabaseMethod('_asNumber'),
        };

        const result = await getDictionaryDatabaseMethod('getMaxHeadwordLength').call(context);

        expect(result).toBe(11);
        expect(selectValue).toHaveBeenCalledTimes(1);
        const firstCall = selectValue.mock.calls[0];
        if (typeof firstCall === 'undefined') {
            throw new Error('Expected selectValue to be called');
        }
        const sql = /** @type {[string]} */ (/** @type {unknown} */ (firstCall))[0];
        expect(sql).toContain('LENGTH(COALESCE(reading');
        expect(sql).toContain('LENGTH(COALESCE(expression');
    });

    test('term mutations invalidate the memoized max headword length', async () => {
        const clearTermEntryContentMetaCaches = vi.fn();
        const bulkAddTerms = vi.fn(async () => {});
        const context = {
            _maxHeadwordLengthCache: 12,
            _requireDb: () => ({}),
            _invalidateMaxHeadwordLengthCache: getDictionaryDatabaseMethod('_invalidateMaxHeadwordLengthCache'),
            _lastBulkAddTermsMetrics: null,
            _termEntryContentCache: new Map(),
            _bulkImportTransactionOpen: false,
            _termEntryContentIdByHash: new Map(),
            _termEntryContentIdByKey: new Map(),
            _clearTermEntryContentMetaCaches: clearTermEntryContentMetaCaches,
            _termExactPresenceCache: new Map(),
            _termPrefixNegativeCache: new Map(),
            _directTermIndexByDictionary: new Map(),
            _bulkAddTerms: bulkAddTerms,
        };

        await getDictionaryDatabaseMethod('bulkAdd').call(context, 'terms', [{}], 0, 1);

        expect(context._maxHeadwordLengthCache).toBeNull();
        expect(bulkAddTerms).toHaveBeenCalledTimes(1);
        expect(clearTermEntryContentMetaCaches).toHaveBeenCalledTimes(1);
    });
});
