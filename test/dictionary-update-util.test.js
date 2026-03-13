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

import {describe, expect, test} from 'vitest';
import {
    applyImportedDictionarySettings,
    getDictionaryUpdateDownloadUrl,
    getProfilesDictionarySettings,
    updateDictionaryAnkiFieldTemplates,
} from '../ext/js/dictionary/dictionary-update-util.js';

/**
 * @param {string} title
 * @param {string} revision
 * @param {boolean} isUpdatable
 * @returns {import('dictionary-importer').Summary}
 */
function createDictionarySummary(title, revision, isUpdatable) {
    return /** @type {import('dictionary-importer').Summary} */ ({
        title,
        revision,
        sequenced: true,
        version: 3,
        importDate: 0,
        prefixWildcardsSupported: false,
        styles: '',
        isUpdatable,
        indexUrl: 'https://example.invalid/index.json',
        downloadUrl: 'https://example.invalid/dictionary.zip',
    });
}

describe('dictionary-update-util', () => {
    test('getDictionaryUpdateDownloadUrl skips dictionaries without update metadata', async () => {
        const dictionaryInfo = createDictionarySummary('Dictionary', '1', false);

        expect(await getDictionaryUpdateDownloadUrl(dictionaryInfo)).toBeNull();
    });

    test('getDictionaryUpdateDownloadUrl returns latest download URL for newer revisions', async () => {
        const dictionaryInfo = createDictionarySummary('Dictionary', '1', true);
        dictionaryInfo.downloadUrl = 'https://example.invalid/current.zip';
        const fetchIndex = /** @type {(url: string) => Promise<Response>} */ (async () => /** @type {Response} */ (/** @type {unknown} */ ({
            ok: true,
            status: 200,
            json: async () => ({
                title: 'Dictionary',
                revision: '2',
                sequenced: true,
                format: 3,
                version: 3,
                author: 'Author',
                description: 'Description',
                attribution: 'Attribution',
                sourceLanguage: 'ja',
                targetLanguage: 'en',
                isUpdatable: true,
                indexUrl: 'https://example.invalid/index.json',
                downloadUrl: 'https://example.invalid/latest.zip',
            }),
        })));

        expect(await getDictionaryUpdateDownloadUrl(dictionaryInfo, fetchIndex)).toBe('https://example.invalid/latest.zip');
    });

    test('applyImportedDictionarySettings preserves dictionary order and updates main dictionary references', () => {
        const options = /** @type {import('settings').Options} */ (/** @type {unknown} */ ({
            version: 0,
            profileCurrent: 1,
            global: {
                database: {
                    prefixWildcardsSupported: false,
                    autoUpdateDictionariesOnStartup: false,
                },
                dataTransmissionConsentShown: false,
            },
            profiles: [
                {
                    id: 'profile-0',
                    options: {
                        general: {mainDictionary: 'Test Dictionary'},
                        dictionaries: [
                            {name: 'Test Dictionary', alias: 'My Alias', enabled: true, allowSecondarySearches: false, definitionsCollapsible: 'not-collapsible', partsOfSpeechFilter: true, useDeinflections: true, styles: 'old'},
                            {name: 'Other Dictionary', alias: 'Other Dictionary', enabled: false, allowSecondarySearches: false, definitionsCollapsible: 'not-collapsible', partsOfSpeechFilter: true, useDeinflections: true, styles: ''},
                        ],
                        anki: {cardFormats: []},
                    },
                },
                {
                    id: 'profile-1',
                    options: {
                        general: {mainDictionary: ''},
                        dictionaries: [
                            {name: 'Test Dictionary', alias: 'Test Dictionary', enabled: false, allowSecondarySearches: false, definitionsCollapsible: 'not-collapsible', partsOfSpeechFilter: true, useDeinflections: true, styles: 'old'},
                        ],
                        anki: {cardFormats: []},
                    },
                },
            ],
        }));

        const profilesDictionarySettings = getProfilesDictionarySettings(options, 'Test Dictionary');
        applyImportedDictionarySettings(options, /** @type {import('dictionary-importer').Summary} */ ({
            title: 'Updated Dictionary',
            revision: '2',
            sequenced: true,
            version: 3,
            importDate: 0,
            prefixWildcardsSupported: false,
            styles: 'new',
        }), profilesDictionarySettings);

        expect(options.profiles[0].options.dictionaries[0]).toMatchObject({name: 'Updated Dictionary', alias: 'My Alias', styles: 'new'});
        expect(options.profiles[1].options.dictionaries[0]).toMatchObject({name: 'Updated Dictionary', alias: 'Updated Dictionary', styles: 'new'});
        expect(options.profiles[0].options.general.mainDictionary).toBe('Updated Dictionary');
        expect(options.profiles[1].options.general.mainDictionary).toBe('Updated Dictionary');
    });

    test('updateDictionaryAnkiFieldTemplates rewrites matching dictionary field segments', () => {
        const options = /** @type {import('settings').Options} */ (/** @type {unknown} */ ({
            version: 0,
            profileCurrent: 0,
            global: {
                database: {
                    prefixWildcardsSupported: false,
                    autoUpdateDictionariesOnStartup: false,
                },
                dataTransmissionConsentShown: false,
            },
            profiles: [
                {
                    id: 'profile-0',
                    options: {
                        anki: {
                            cardFormats: [
                                {
                                    fields: {
                                        glossary: {value: '{{> single-glossary-test-dictionary}}'},
                                        untouched: {value: '{{> single-glossary-other-dictionary}}'},
                                    },
                                },
                            ],
                        },
                    },
                },
            ],
        }));
        const profilesDictionarySettings = /** @type {import('settings-controller').ProfilesDictionarySettings} */ ({
            'profile-0': {
                index: 0,
                name: 'Test Dictionary',
                alias: 'Test Dictionary',
                enabled: true,
                allowSecondarySearches: false,
                definitionsCollapsible: 'not-collapsible',
                partsOfSpeechFilter: true,
                useDeinflections: true,
                styles: '',
            },
        });

        const modified = updateDictionaryAnkiFieldTemplates(options, profilesDictionarySettings, 'Updated Dictionary');

        expect(modified).toBe(true);
        expect(options.profiles[0].options.anki.cardFormats[0].fields.glossary.value).toBe('{{> single-glossary-updated-dictionary}}');
        expect(options.profiles[0].options.anki.cardFormats[0].fields.untouched.value).toBe('{{> single-glossary-other-dictionary}}');
    });
});
