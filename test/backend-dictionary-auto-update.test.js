/*
 * Copyright (C) 2023-2025  Yomitan Authors
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

import {afterEach, describe, expect, test, vi} from 'vitest';

vi.mock('../ext/lib/kanji-processor.js', () => ({
    convertVariants: (text) => text,
}));

const {Backend} = await import('../ext/js/background/backend.js');

const DICTIONARY_AUTO_UPDATE_INTERVAL_MS = 60 * 60 * 1000;

afterEach(() => {
    vi.restoreAllMocks();
});

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

/**
 * @param {Partial<import('dictionary-importer').Summary>} [overrides]
 * @returns {import('dictionary-importer').Summary}
 */
function createDictionarySummary(overrides = {}) {
    return /** @type {import('dictionary-importer').Summary} */ ({
        title: 'Test Dictionary',
        revision: '1',
        sequenced: false,
        version: 3,
        importDate: 0,
        prefixWildcardsSupported: false,
        styles: '',
        counts: {
            terms: {total: 1},
            termMeta: {total: 0},
            kanji: {total: 0},
            kanjiMeta: {total: 0},
            tagMeta: {total: 0},
            media: {total: 0},
        },
        isUpdatable: true,
        indexUrl: 'https://example.invalid/index.json',
        downloadUrl: 'https://example.invalid/dictionary.zip',
        importSuccess: true,
        ...overrides,
    });
}

/**
 * @param {Partial<import('backend').DictionaryUpdateCheckResult>} [overrides]
 * @returns {import('backend').DictionaryUpdateCheckResult}
 */
function createCheckResult(overrides = {}) {
    return {
        dictionaryTitle: 'Test Dictionary',
        hasUpdate: true,
        currentRevision: '1',
        latestRevision: '2',
        downloadUrl: 'https://example.invalid/dictionary-v2.zip',
        error: null,
        ...overrides,
    };
}

describe('Backend dictionary auto-update helpers', () => {
    test('Prunes stale auto-update settings and runtime state', async () => {
        const saveOptions = vi.fn(async () => {});
        const setState = vi.fn(async () => {});
        const context = {
            _options: {
                global: {
                    dictionaryAutoUpdates: [
                        'https://example.invalid/keep.json',
                        'https://example.invalid/remove.json',
                    ],
                },
            },
            _ensureDictionaryDatabaseReady: async () => {},
            _dictionaryDatabase: {
                getDictionaryInfo: async () => [
                    createDictionarySummary({indexUrl: 'https://example.invalid/keep.json'}),
                    createDictionarySummary({title: 'Static Dictionary', isUpdatable: false, indexUrl: 'https://example.invalid/static.json'}),
                ],
            },
            _saveOptions: saveOptions,
            _getDictionaryAutoUpdateState: async () => ({
                'https://example.invalid/keep.json': {lastAttemptAt: 1},
                'https://example.invalid/remove.json': {lastAttemptAt: 2},
            }),
            _setDictionaryAutoUpdateState: setState,
        };

        await getBackendMethod('_pruneStaleDictionaryAutoUpdates').call(context);

        expect(context._options.global.dictionaryAutoUpdates).toStrictEqual(['https://example.invalid/keep.json']);
        expect(saveOptions).toHaveBeenCalledTimes(1);
        expect(setState).toHaveBeenCalledTimes(1);
        expect(setState).toHaveBeenCalledWith({
            'https://example.invalid/keep.json': {lastAttemptAt: 1},
        });
    });

    test('HEAD 304 check updates validators without fetching the index body', async () => {
        const dictionary = createDictionarySummary();
        /** @type {Record<string, {etag?: string, lastModified?: string, lastAttemptAt?: number, lastSuccessfulCheckAt?: number, lastSeenRevision?: string, lastError?: string|null}>} */
        const state = {
            'https://example.invalid/index.json': {
                etag: '"old-etag"',
                lastModified: 'Mon, 01 Jan 2024 00:00:00 GMT',
            },
        };
        const fetchAnonymous = vi.fn(async () => new Response(null, {
            status: 304,
            headers: {
                ETag: '"new-etag"',
                'Last-Modified': 'Tue, 02 Jan 2024 00:00:00 GMT',
            },
        }));
        const context = {
            _requestBuilder: {fetchAnonymous},
            _getDictionaryIndexSchema: async () => ({isValid: () => true}),
        };

        const result = await getBackendMethod('_checkDictionaryUpdate').call(context, dictionary, state);

        expect(result).toStrictEqual({
            dictionaryTitle: 'Test Dictionary',
            hasUpdate: false,
            currentRevision: '1',
            latestRevision: null,
            downloadUrl: 'https://example.invalid/dictionary.zip',
            error: null,
        });
        expect(fetchAnonymous).toHaveBeenCalledTimes(1);
        expect(fetchAnonymous).toHaveBeenCalledWith('https://example.invalid/index.json', expect.objectContaining({
            method: 'HEAD',
            headers: {
                'If-None-Match': '"old-etag"',
                'If-Modified-Since': 'Mon, 01 Jan 2024 00:00:00 GMT',
            },
        }));
        expect(state['https://example.invalid/index.json']).toMatchObject({
            etag: '"new-etag"',
            lastModified: 'Tue, 02 Jan 2024 00:00:00 GMT',
            lastSeenRevision: '1',
            lastError: null,
        });
        expect(state['https://example.invalid/index.json'].lastAttemptAt).toEqual(expect.any(Number));
        expect(state['https://example.invalid/index.json'].lastSuccessfulCheckAt).toEqual(expect.any(Number));
    });

    test('HEAD success falls through to GET and reports newer revisions', async () => {
        const dictionary = createDictionarySummary();
        /** @type {Record<string, {etag?: string, lastModified?: string|null, lastAttemptAt?: number, lastSuccessfulCheckAt?: number, lastSeenRevision?: string, lastError?: string|null}>} */
        const state = {'https://example.invalid/index.json': {}};
        const fetchAnonymous = vi
            .fn()
            .mockResolvedValueOnce(new Response(null, {
                status: 200,
                headers: {
                    ETag: '"head-etag"',
                    'Last-Modified': 'Tue, 02 Jan 2024 00:00:00 GMT',
                },
            }))
            .mockResolvedValueOnce(new Response(JSON.stringify({
                revision: '2',
                downloadUrl: 'https://example.invalid/dictionary-v2.zip',
            }), {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    ETag: '"get-etag"',
                },
            }));
        const context = {
            _requestBuilder: {fetchAnonymous},
            _getDictionaryIndexSchema: async () => ({isValid: () => true}),
        };

        const result = await getBackendMethod('_checkDictionaryUpdate').call(context, dictionary, state);

        expect(fetchAnonymous).toHaveBeenCalledTimes(2);
        expect(fetchAnonymous.mock.calls[0][1]).toEqual(expect.objectContaining({method: 'HEAD'}));
        expect(fetchAnonymous.mock.calls[1][1]).toEqual(expect.objectContaining({method: 'GET', headers: {}}));
        expect(result).toStrictEqual({
            dictionaryTitle: 'Test Dictionary',
            hasUpdate: true,
            currentRevision: '1',
            latestRevision: '2',
            downloadUrl: 'https://example.invalid/dictionary-v2.zip',
            error: null,
        });
        expect(state['https://example.invalid/index.json']).toMatchObject({
            etag: '"get-etag"',
            lastModified: null,
            lastSeenRevision: '2',
            lastError: null,
        });
    });

    test('GET fallback reuses validators when HEAD fails', async () => {
        const dictionary = createDictionarySummary();
        /** @type {Record<string, {etag?: string, lastModified?: string, lastAttemptAt?: number, lastSuccessfulCheckAt?: number, lastSeenRevision?: string, lastError?: string|null}>} */
        const state = {
            'https://example.invalid/index.json': {
                etag: '"old-etag"',
                lastModified: 'Mon, 01 Jan 2024 00:00:00 GMT',
            },
        };
        const fetchAnonymous = vi
            .fn()
            .mockRejectedValueOnce(new Error('HEAD unsupported'))
            .mockResolvedValueOnce(new Response(JSON.stringify({revision: '1'}), {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    ETag: '"get-etag"',
                },
            }));
        const context = {
            _requestBuilder: {fetchAnonymous},
            _getDictionaryIndexSchema: async () => ({isValid: () => true}),
        };

        const result = await getBackendMethod('_checkDictionaryUpdate').call(context, dictionary, state);

        expect(fetchAnonymous).toHaveBeenCalledTimes(2);
        expect(fetchAnonymous.mock.calls[0][1]).toEqual(expect.objectContaining({method: 'HEAD'}));
        expect(fetchAnonymous.mock.calls[1][1]).toEqual(expect.objectContaining({
            method: 'GET',
            headers: {
                'If-None-Match': '"old-etag"',
                'If-Modified-Since': 'Mon, 01 Jan 2024 00:00:00 GMT',
            },
        }));
        expect(result).toStrictEqual({
            dictionaryTitle: 'Test Dictionary',
            hasUpdate: false,
            currentRevision: '1',
            latestRevision: '1',
            downloadUrl: 'https://example.invalid/dictionary.zip',
            error: null,
        });
        expect(state['https://example.invalid/index.json']).toMatchObject({
            etag: '"get-etag"',
            lastSeenRevision: '1',
            lastError: null,
        });
    });

    test('Auto-update pass only checks enabled dictionaries that are due', async () => {
        vi.spyOn(Date, 'now').mockReturnValue(2 * DICTIONARY_AUTO_UPDATE_INTERVAL_MS);
        const checkDictionaryUpdates = vi.fn(async () => [createCheckResult()]);
        const updateDictionaryByTitle = vi.fn(async () => ({status: 'updated'}));
        const context = {
            _dictionaryAutoUpdatePassPromise: null,
            _dictionaryImportModeActive: false,
            _options: {
                global: {
                    dictionaryAutoUpdates: [
                        'https://example.invalid/due.json',
                        'https://example.invalid/recent.json',
                    ],
                },
            },
            _ensureDictionaryDatabaseReady: async () => {},
            _dictionaryDatabase: {
                getDictionaryInfo: async () => [
                    createDictionarySummary({title: 'Recent', indexUrl: 'https://example.invalid/recent.json'}),
                    createDictionarySummary({title: 'Due', indexUrl: 'https://example.invalid/due.json'}),
                    createDictionarySummary({title: 'Static', isUpdatable: false, indexUrl: 'https://example.invalid/static.json'}),
                ],
            },
            _getDictionaryAutoUpdateState: async () => ({
                'https://example.invalid/due.json': {lastAttemptAt: 0},
                'https://example.invalid/recent.json': {lastAttemptAt: (2 * DICTIONARY_AUTO_UPDATE_INTERVAL_MS) - 1},
            }),
            _checkDictionaryUpdates: checkDictionaryUpdates,
            _updateDictionaryByTitle: updateDictionaryByTitle,
        };

        await getBackendMethod('_runDictionaryAutoUpdatePass').call(context, 'alarm');

        expect(checkDictionaryUpdates).toHaveBeenCalledTimes(1);
        expect(checkDictionaryUpdates).toHaveBeenCalledWith(['Due']);
        expect(updateDictionaryByTitle).toHaveBeenCalledTimes(1);
        expect(updateDictionaryByTitle).toHaveBeenCalledWith('Due', false, expect.objectContaining({
            dictionaryTitle: 'Test Dictionary',
            hasUpdate: true,
        }));
        expect(context._dictionaryAutoUpdatePassPromise).toBeNull();
    });

    test('Auto-update update skips when the mutation lock is busy', async () => {
        const dictionary = createDictionarySummary();
        const fetchAnonymous = vi.fn(async () => new Response(new Uint8Array([1, 2, 3]), {status: 200}));
        const performDictionaryUpdate = vi.fn(async () => ({status: 'updated'}));
        const context = {
            _options: {
                global: {
                    dictionaryAutoUpdates: ['https://example.invalid/index.json'],
                },
            },
            _ensureDictionaryDatabaseReady: async () => {},
            _dictionaryDatabase: {
                getDictionaryInfo: async () => [dictionary],
            },
            _requestBuilder: {fetchAnonymous},
            _setDictionaryAutoUpdateError: vi.fn(async () => {}),
            _runWithDictionaryMutationLock: vi.fn(async () => void 0),
            _performDictionaryUpdate: performDictionaryUpdate,
        };

        const result = await getBackendMethod('_updateDictionaryByTitle').call(
            context,
            'Test Dictionary',
            false,
            createCheckResult(),
        );

        expect(result).toStrictEqual({
            dictionaryTitle: 'Test Dictionary',
            status: 'skipped',
            latestRevision: '2',
            error: null,
        });
        expect(fetchAnonymous).toHaveBeenCalledTimes(1);
        expect(performDictionaryUpdate).not.toHaveBeenCalled();
    });

    test('Auto-update update aborts when hourly updates were disabled before commit', async () => {
        const dictionary = createDictionarySummary();
        const performDictionaryUpdate = vi.fn(async () => ({status: 'updated'}));
        const context = {
            _options: {
                global: {
                    dictionaryAutoUpdates: [],
                },
            },
            _ensureDictionaryDatabaseReady: async () => {},
            _dictionaryDatabase: {
                getDictionaryInfo: vi.fn(async () => [dictionary]),
            },
            _requestBuilder: {
                fetchAnonymous: vi.fn(async () => new Response(new Uint8Array([1, 2, 3]), {status: 200})),
            },
            _setDictionaryAutoUpdateError: vi.fn(async () => {}),
            _runWithDictionaryMutationLock: vi.fn(async (callback) => await callback()),
            _performDictionaryUpdate: performDictionaryUpdate,
        };

        const result = await getBackendMethod('_updateDictionaryByTitle').call(
            context,
            'Test Dictionary',
            false,
            createCheckResult(),
        );

        expect(result).toStrictEqual({
            dictionaryTitle: 'Test Dictionary',
            status: 'skipped',
            latestRevision: '2',
            error: null,
        });
        expect(performDictionaryUpdate).not.toHaveBeenCalled();
    });

    test('Imported dictionary settings migrate aliases, Anki fields, and auto-update preferences', async () => {
        const saveOptions = vi.fn(async () => {});
        const context = {
            _options: {
                profileCurrent: 0,
                profiles: [
                    {
                        id: 'profile-1',
                        options: {
                            dictionaries: [
                                {
                                    name: 'Old Dictionary',
                                    alias: 'Custom Alias',
                                    enabled: true,
                                    allowSecondarySearches: true,
                                    definitionsCollapsible: 'not-collapsible',
                                    partsOfSpeechFilter: false,
                                    useDeinflections: false,
                                    styles: 'old-style',
                                },
                                {
                                    name: 'Other Dictionary',
                                    alias: 'Other Dictionary',
                                    enabled: false,
                                    allowSecondarySearches: false,
                                    definitionsCollapsible: 'not-collapsible',
                                    partsOfSpeechFilter: true,
                                    useDeinflections: true,
                                    styles: '',
                                },
                            ],
                            general: {
                                mainDictionary: 'Old Dictionary',
                                sortFrequencyDictionary: 'Old Dictionary',
                            },
                            anki: {
                                cardFormats: [
                                    {
                                        fields: {
                                            expression: {
                                                value: 'old-dictionary-term old-dictionary-reading',
                                            },
                                        },
                                    },
                                ],
                            },
                        },
                    },
                ],
                global: {
                    dictionaryAutoUpdates: ['https://example.invalid/old-index.json'],
                },
            },
            _saveOptions: saveOptions,
        };
        const previousSummary = createDictionarySummary({
            title: 'Old Dictionary',
            indexUrl: 'https://example.invalid/old-index.json',
            styles: 'old-style',
        });
        const importedSummary = createDictionarySummary({
            title: 'New Dictionary',
            indexUrl: 'https://example.invalid/new-index.json',
            styles: 'new-style',
        });
        const updateContext = {
            profilesDictionarySettings: {
                'profile-1': {
                    index: 0,
                    name: 'Old Dictionary',
                    alias: 'Custom Alias',
                    enabled: true,
                    allowSecondarySearches: true,
                    definitionsCollapsible: 'not-collapsible',
                    partsOfSpeechFilter: false,
                    useDeinflections: false,
                    styles: 'old-style',
                },
            },
            mainDictionaryProfileIds: new Set(['profile-1']),
            sortFrequencyDictionaryProfileIds: new Set(['profile-1']),
        };

        await getBackendMethod('_applyImportedDictionarySettings').call(context, previousSummary, importedSummary, updateContext);

        const profile = context._options.profiles[0];
        expect(profile.options.dictionaries).toStrictEqual([
            {
                name: 'New Dictionary',
                alias: 'Custom Alias',
                enabled: true,
                allowSecondarySearches: true,
                definitionsCollapsible: 'not-collapsible',
                partsOfSpeechFilter: false,
                useDeinflections: false,
                styles: 'new-style',
            },
            {
                name: 'Other Dictionary',
                alias: 'Other Dictionary',
                enabled: false,
                allowSecondarySearches: false,
                definitionsCollapsible: 'not-collapsible',
                partsOfSpeechFilter: true,
                useDeinflections: true,
                styles: '',
            },
        ]);
        expect(profile.options.general.mainDictionary).toBe('New Dictionary');
        expect(profile.options.general.sortFrequencyDictionary).toBe('New Dictionary');
        expect(profile.options.anki.cardFormats[0].fields.expression.value).toBe('new-dictionary-term new-dictionary-reading');
        expect(context._options.global.dictionaryAutoUpdates).toStrictEqual(['https://example.invalid/new-index.json']);
        expect(saveOptions).toHaveBeenCalledTimes(1);
        expect(saveOptions).toHaveBeenCalledWith('background');
    });
});
