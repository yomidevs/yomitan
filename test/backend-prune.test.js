/*
 * Copyright (C) 2023-2025  Yomitan Authors
 * Copyright (C) 2020-2022  Yomichan Authors
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
 * @returns {(this: unknown) => Promise<unknown>}
 * @throws {Error}
 */
function getPruneMethod() {
    const pruneMethod = Reflect.get(Backend.prototype, '_pruneStaleProfileDictionaryOptions');
    if (typeof pruneMethod !== 'function') {
        throw new Error('Expected _pruneStaleProfileDictionaryOptions method');
    }
    return pruneMethod;
}

describe('Backend stale dictionary option pruning', () => {
    test('Prunes stale dictionary entries and resets stale selectors', async () => {
        const optionsUtilSave = vi.fn(async () => {});
        const clearProfileConditionsSchemaCache = vi.fn(() => {});
        const context = {
            _options: {
                profiles: [
                    {
                        options: {
                            dictionaries: [{name: 'A'}, {name: 'B'}, {name: 'Shared'}],
                            general: {mainDictionary: 'B', sortFrequencyDictionary: 'B'},
                        },
                    },
                    {
                        options: {
                            dictionaries: [{name: 'Shared'}, {name: 'C'}],
                            general: {mainDictionary: 'C', sortFrequencyDictionary: 'C'},
                        },
                    },
                ],
            },
            _dictionaryDatabase: {
                getDictionaryInfo: async () => [{title: 'A'}, {title: 'Shared'}],
            },
            _ensureDictionaryDatabaseReady: async () => {},
            _optionsUtil: {
                save: optionsUtilSave,
            },
            _clearProfileConditionsSchemaCache: clearProfileConditionsSchemaCache,
        };

        const summary = await getPruneMethod().call(context);

        expect(summary).toStrictEqual({
            skipped: false,
            reason: 'completed',
            removedEntryCount: 2,
            removedNames: ['B', 'C'],
            affectedProfiles: 2,
            installedCount: 2,
            mainDictionaryResets: 2,
            sortFrequencyDictionaryResets: 2,
        });
        const options = /** @type {{profiles: Array<{options: {dictionaries: unknown[], general: {mainDictionary: string, sortFrequencyDictionary: string|null}}}>}} */ (
            Reflect.get(context, '_options')
        );
        expect(options.profiles[0].options.dictionaries).toStrictEqual([{name: 'A'}, {name: 'Shared'}]);
        expect(options.profiles[1].options.dictionaries).toStrictEqual([{name: 'Shared'}]);
        expect(options.profiles[0].options.general.mainDictionary).toBe('');
        expect(options.profiles[1].options.general.mainDictionary).toBe('');
        expect(options.profiles[0].options.general.sortFrequencyDictionary).toBeNull();
        expect(options.profiles[1].options.general.sortFrequencyDictionary).toBeNull();
        expect(optionsUtilSave).toHaveBeenCalledTimes(1);
        expect(clearProfileConditionsSchemaCache).toHaveBeenCalledTimes(1);
    });

    test('Does not save options when no stale dictionary settings exist', async () => {
        const optionsUtilSave = vi.fn(async () => {});
        const clearProfileConditionsSchemaCache = vi.fn(() => {});
        const context = {
            _options: {
                profiles: [
                    {
                        options: {
                            dictionaries: [{name: 'A'}],
                            general: {mainDictionary: 'A', sortFrequencyDictionary: null},
                        },
                    },
                ],
            },
            _dictionaryDatabase: {
                getDictionaryInfo: async () => [{title: 'A'}],
            },
            _ensureDictionaryDatabaseReady: async () => {},
            _optionsUtil: {
                save: optionsUtilSave,
            },
            _clearProfileConditionsSchemaCache: clearProfileConditionsSchemaCache,
        };

        const summary = await getPruneMethod().call(context);

        expect(summary).toStrictEqual({
            skipped: false,
            reason: 'completed',
            removedEntryCount: 0,
            removedNames: [],
            affectedProfiles: 0,
            installedCount: 1,
            mainDictionaryResets: 0,
            sortFrequencyDictionaryResets: 0,
        });
        expect(optionsUtilSave).toHaveBeenCalledTimes(0);
        expect(clearProfileConditionsSchemaCache).toHaveBeenCalledTimes(0);
    });

    test('Returns skipped summary when dictionary info fails', async () => {
        const optionsUtilSave = vi.fn(async () => {});
        const clearProfileConditionsSchemaCache = vi.fn(() => {});
        const context = {
            _options: {profiles: []},
            _dictionaryDatabase: {
                getDictionaryInfo: async () => {
                    throw new Error('dictionary info unavailable');
                },
            },
            _ensureDictionaryDatabaseReady: async () => {},
            _optionsUtil: {
                save: optionsUtilSave,
            },
            _clearProfileConditionsSchemaCache: clearProfileConditionsSchemaCache,
        };

        const summary = await getPruneMethod().call(context);

        expect(summary).toStrictEqual({
            skipped: true,
            reason: 'dictionary-info-failed',
            message: 'dictionary info unavailable',
            removedEntryCount: 0,
            removedNames: [],
            affectedProfiles: 0,
            installedCount: 0,
            mainDictionaryResets: 0,
            sortFrequencyDictionaryResets: 0,
        });
        expect(optionsUtilSave).toHaveBeenCalledTimes(0);
        expect(clearProfileConditionsSchemaCache).toHaveBeenCalledTimes(0);
    });
});
