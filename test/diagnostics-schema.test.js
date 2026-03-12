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

import Ajv from 'ajv';
import {IDBKeyRange} from 'fake-indexeddb';
import {describe, expect, test, vi} from 'vitest';

vi.mock('../ext/lib/kanji-processor.js', () => ({
    /**
     * @param {string} text
     * @returns {string}
     */
    convertVariants: (text) => text,
}));

const {Backend} = await import('../ext/js/background/backend.js');
import {DictionaryDatabase} from '../ext/js/dictionary/dictionary-database.js';
import {chrome, fetch} from './mocks/common.js';
import {setupStubs} from './utilities/database.js';

setupStubs();
vi.stubGlobal('IDBKeyRange', IDBKeyRange);
vi.stubGlobal('fetch', fetch);
vi.stubGlobal('chrome', chrome);

const ajv = new Ajv({allErrors: true, strict: false});

const dictionaryOptionsPruneSummarySchema = {
    type: 'object',
    additionalProperties: false,
    required: [
        'skipped',
        'reason',
        'removedEntryCount',
        'removedNames',
        'affectedProfiles',
        'installedCount',
        'mainDictionaryResets',
        'sortFrequencyDictionaryResets',
    ],
    properties: {
        skipped: {type: 'boolean'},
        reason: {type: 'string'},
        message: {type: 'string'},
        removedEntryCount: {type: 'integer', minimum: 0},
        removedNames: {type: 'array', items: {type: 'string'}},
        affectedProfiles: {type: 'integer', minimum: 0},
        installedCount: {type: 'integer', minimum: 0},
        mainDictionaryResets: {type: 'integer', minimum: 0},
        sortFrequencyDictionaryResets: {type: 'integer', minimum: 0},
    },
};

const dictionaryStartupCleanupSummarySchema = {
    type: 'object',
    additionalProperties: false,
    required: [
        'scannedCount',
        'removedCount',
        'removedTitles',
        'removedEmptyTitleRows',
        'failedCount',
        'failedTitles',
        'parseErrorCount',
    ],
    properties: {
        scannedCount: {type: 'integer', minimum: 0},
        removedCount: {type: 'integer', minimum: 0},
        removedTitles: {type: 'array', items: {type: 'string'}},
        removedEmptyTitleRows: {type: 'integer', minimum: 0},
        failedCount: {type: 'integer', minimum: 0},
        failedTitles: {type: 'array', items: {type: 'string'}},
        parseErrorCount: {type: 'integer', minimum: 0},
    },
};

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

describe('Diagnostics payload schema', () => {
    test('Dictionary options prune completed payload matches schema and count semantics', async () => {
        const context = {
            _options: {
                profiles: [
                    {
                        options: {
                            dictionaries: [{name: 'A'}, {name: 'B'}],
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
            _optionsUtil: {save: async () => {}},
            _clearProfileConditionsSchemaCache: () => {},
        };
        const summary = /** @type {{skipped: boolean, reason: string, removedEntryCount: number, removedNames: string[], affectedProfiles: number, installedCount: number, mainDictionaryResets: number, sortFrequencyDictionaryResets: number, message?: string}} */ (await getPruneMethod().call(context));
        const validate = ajv.compile(dictionaryOptionsPruneSummarySchema);

        expect(validate(summary)).toBe(true);
        expect(summary.skipped).toBe(false);
        expect(summary.removedEntryCount).toBe(2);
        expect(summary.removedNames).toStrictEqual(['B', 'C']);
        expect(summary.removedNames.length <= summary.removedEntryCount).toBe(true);
        expect(summary.mainDictionaryResets).toBe(2);
        expect(summary.sortFrequencyDictionaryResets).toBe(2);
    });

    test('Dictionary options prune skipped payload matches schema and count semantics', async () => {
        const context = {
            _options: {profiles: []},
            _dictionaryDatabase: {
                getDictionaryInfo: async () => {
                    throw new Error('dictionary info unavailable');
                },
            },
            _ensureDictionaryDatabaseReady: async () => {
                throw new Error('dictionary info unavailable');
            },
            _optionsUtil: {save: async () => {}},
            _clearProfileConditionsSchemaCache: () => {},
        };
        const summary = /** @type {{skipped: boolean, reason: string, removedEntryCount: number, removedNames: string[], affectedProfiles: number, installedCount: number, mainDictionaryResets: number, sortFrequencyDictionaryResets: number, message?: string}} */ (await getPruneMethod().call(context));
        const validate = ajv.compile(dictionaryOptionsPruneSummarySchema);

        expect(validate(summary)).toBe(true);
        expect(summary.skipped).toBe(true);
        expect(summary.removedEntryCount).toBe(0);
        expect(summary.removedNames).toStrictEqual([]);
        expect(summary.installedCount).toBe(0);
    });

    test('Dictionary startup cleanup summary matches schema and count semantics', async () => {
        const dictionaryDatabase = new DictionaryDatabase();
        await dictionaryDatabase.prepare();
        try {
            const requireDb = Reflect.get(dictionaryDatabase, '_requireDb');
            if (typeof requireDb !== 'function') {
                throw new Error('Expected _requireDb method');
            }
            const db = requireDb.call(dictionaryDatabase);
            db.exec({
                sql: 'INSERT INTO dictionaries(title, version, summaryJson) VALUES ($title, $version, $summaryJson)',
                bind: {$title: 'Healthy', $version: 3, $summaryJson: JSON.stringify({title: 'Healthy', revision: '1', version: 3, importSuccess: true})},
            });
            db.exec({
                sql: 'INSERT INTO dictionaries(title, version, summaryJson) VALUES ($title, $version, $summaryJson)',
                bind: {$title: '', $version: 3, $summaryJson: JSON.stringify({title: '', revision: '1', version: 3, importSuccess: false})},
            });
            db.exec({
                sql: 'INSERT INTO dictionaries(title, version, summaryJson) VALUES ($title, $version, $summaryJson)',
                bind: {$title: 'Broken Parse', $version: 3, $summaryJson: '{broken-json'},
            });
            db.exec({
                sql: 'INSERT INTO dictionaries(title, version, summaryJson) VALUES ($title, $version, $summaryJson)',
                bind: {$title: 'Broken Flag', $version: 3, $summaryJson: JSON.stringify({title: 'Broken Flag', revision: '1', version: 3, importSuccess: false})},
            });

            const cleanupMethod = Reflect.get(dictionaryDatabase, '_cleanupIncompleteImports');
            if (typeof cleanupMethod !== 'function') {
                throw new Error('Expected _cleanupIncompleteImports method');
            }
            const summary = /** @type {{scannedCount: number, removedCount: number, removedTitles: string[], removedEmptyTitleRows: number, failedCount: number, failedTitles: string[], parseErrorCount: number}} */ (await Promise.resolve(cleanupMethod.call(dictionaryDatabase)));
            const validate = ajv.compile(dictionaryStartupCleanupSummarySchema);

            expect(validate(summary)).toBe(true);
            expect(summary.scannedCount).toBe(4);
            expect(summary.removedTitles).toStrictEqual(['Broken Flag', 'Broken Parse']);
            expect(summary.removedCount).toBe(summary.removedTitles.length + summary.removedEmptyTitleRows);
            expect(summary.removedEmptyTitleRows).toBe(1);
            expect(summary.failedCount).toBe(summary.failedTitles.length);
            expect(summary.parseErrorCount).toBe(1);
        } finally {
            await dictionaryDatabase.close();
        }
    });
});
