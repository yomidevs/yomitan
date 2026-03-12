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

vi.mock('../ext/lib/kanji-processor.js', () => ({
    /**
     * @param {string} text
     * @returns {string}
     */
    convertVariants: (text) => text,
}));

const {Backend} = await import('../ext/js/background/backend.js');

/**
 * @param {string} name
 * @returns {(this: unknown, ...args: unknown[]) => unknown}
 * @throws {Error}
 */
function getBackendMethod(name) {
    const method = Reflect.get(Backend.prototype, name);
    if (typeof method !== 'function') {
        throw new Error(`Expected ${name} method`);
    }
    return method;
}

describe('Backend derived scan length', () => {
    test('optionsGet injects the cached max headword length plus buffer', async () => {
        const rawProfileOptions = {scanning: {length: 16}};
        const context = {
            _getProfileOptions: vi.fn(() => rawProfileOptions),
            _getEffectiveScanLength: vi.fn(async () => 32),
            _createEffectiveProfileOptions: getBackendMethod('_createEffectiveProfileOptions'),
        };

        const result = await getBackendMethod('_onApiOptionsGet').call(context, {optionsContext: {current: true}});

        expect(result).toStrictEqual({scanning: {length: 32}});
        expect(rawProfileOptions).toStrictEqual({scanning: {length: 16}});
        expect(context._getEffectiveScanLength).toHaveBeenCalledWith(16);
    });

    test('missing cached max headword length backfills from the database once', async () => {
        const rawProfileOptions = {scanning: {length: 16}};
        const saveOptions = vi.fn(async () => {});
        const context = {
            _options: {
                global: {
                    database: {
                        maxHeadwordLength: 0,
                    },
                },
            },
            _dictionaryDatabase: {
                getMaxHeadwordLength: vi.fn(async () => 21),
            },
            _dictionaryImportModeActive: false,
            _ensureDictionaryDatabaseReady: vi.fn(async () => {}),
            _saveOptions: saveOptions,
            _getProfileOptions: vi.fn(() => rawProfileOptions),
            _getStoredGlobalMaxHeadwordLength: getBackendMethod('_getStoredGlobalMaxHeadwordLength'),
            _setGlobalMaxHeadwordLength: getBackendMethod('_setGlobalMaxHeadwordLength'),
            _computeMaxHeadwordLengthFromDatabase: getBackendMethod('_computeMaxHeadwordLengthFromDatabase'),
            _getEffectiveScanLength: getBackendMethod('_getEffectiveScanLength'),
            _createEffectiveProfileOptions: getBackendMethod('_createEffectiveProfileOptions'),
        };

        const result = await getBackendMethod('_onApiOptionsGet').call(context, {optionsContext: {current: true}});

        expect(result).toStrictEqual({scanning: {length: 29}});
        expect(rawProfileOptions).toStrictEqual({scanning: {length: 16}});
        expect(context._dictionaryDatabase.getMaxHeadwordLength).toHaveBeenCalledTimes(1);
        expect(context._options.global.database.maxHeadwordLength).toBe(21);
        expect(saveOptions).toHaveBeenCalledTimes(1);
        expect(saveOptions).toHaveBeenCalledWith('background');
    });

    test('falls back to the stored scan length when the database max is 0', async () => {
        const rawProfileOptions = {scanning: {length: 16}};
        const saveOptions = vi.fn(async () => {});
        const context = {
            _options: {
                global: {
                    database: {
                        maxHeadwordLength: 0,
                    },
                },
            },
            _dictionaryDatabase: {
                getMaxHeadwordLength: vi.fn(async () => 0),
            },
            _dictionaryImportModeActive: false,
            _ensureDictionaryDatabaseReady: vi.fn(async () => {}),
            _saveOptions: saveOptions,
            _getProfileOptions: vi.fn(() => rawProfileOptions),
            _getStoredGlobalMaxHeadwordLength: getBackendMethod('_getStoredGlobalMaxHeadwordLength'),
            _setGlobalMaxHeadwordLength: getBackendMethod('_setGlobalMaxHeadwordLength'),
            _computeMaxHeadwordLengthFromDatabase: getBackendMethod('_computeMaxHeadwordLengthFromDatabase'),
            _getEffectiveScanLength: getBackendMethod('_getEffectiveScanLength'),
            _createEffectiveProfileOptions: getBackendMethod('_createEffectiveProfileOptions'),
        };

        const result = await getBackendMethod('_onApiOptionsGet').call(context, {optionsContext: {current: true}});

        expect(result).toStrictEqual({scanning: {length: 16}});
        expect(saveOptions).not.toHaveBeenCalled();
    });

    test('optionsGetFull still returns the raw stored options object', () => {
        const rawOptions = {profiles: [], profileCurrent: 0, version: 76, global: {}};
        const getOptionsFull = vi.fn(() => rawOptions);

        const result = getBackendMethod('_onApiOptionsGetFull').call({_getOptionsFull: getOptionsFull});

        expect(result).toBe(rawOptions);
        expect(getOptionsFull).toHaveBeenCalledWith(false);
    });
});
