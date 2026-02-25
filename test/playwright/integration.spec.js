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

import {execFile as execFileCallback} from 'child_process';
import {mkdtemp, readFile} from 'fs/promises';
import os from 'os';
import path from 'path';
import {promisify} from 'util';
import {deferPromise} from '../../ext/js/core/utilities.js';
import {
    expect,
    getExpectedAddNoteBody,
    getMockModelFields,
    mockAnkiRouteHandler,
    test,
    writeToClipboardFromPage,
} from './playwright-util.js';

const execFile = promisify(execFileCallback);
const testDictionaryTitle = 'valid-dictionary1';
/** @type {Promise<string>|null} */
let testDictionaryDatabaseBase64Promise = null;

/**
 * @template [T=unknown]
 * @param {import('@playwright/test').Page} page
 * @param {string} actionName
 * @param {Record<string, unknown>|undefined} paramsValue
 * @returns {Promise<T>}
 */
async function invokeRuntimeApi(page, actionName, paramsValue = void 0) {
    return await page.evaluate(async ({actionName: messageAction, paramsValue: messageParams}) => {
        return await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({action: messageAction, params: messageParams}, (/** @type {unknown} */ responseValue) => {
                const error = chrome.runtime.lastError;
                if (error) {
                    reject(new Error(error.message));
                    return;
                }
                const response = /** @type {{error?: {message?: unknown}, result?: unknown}|undefined} */ (responseValue);
                if (response?.error) {
                    const message = typeof response.error.message === 'string' ? response.error.message : 'Unknown runtime API error';
                    reject(new Error(message));
                    return;
                }
                resolve(/** @type {T} */ (response?.result));
            });
        });
    }, {actionName, paramsValue});
}

/**
 * @param {string} value
 * @returns {string}
 */
function escapeSqlString(value) {
    return value.replaceAll('\'', '\'\'');
}

/**
 * @returns {Promise<string>}
 */
async function getTestDictionaryDatabaseBase64() {
    if (testDictionaryDatabaseBase64Promise !== null) {
        return await testDictionaryDatabaseBase64Promise;
    }
    testDictionaryDatabaseBase64Promise = (async () => {
        const summaryJson = JSON.stringify({
            title: testDictionaryTitle,
            revision: 'test',
            sequenced: true,
            version: 3,
            importDate: Date.now(),
            prefixWildcardsSupported: false,
            counts: {
                terms: {total: 1},
                termMeta: {total: 0},
                kanji: {total: 0},
                kanjiMeta: {total: 0},
                tagMeta: {total: 0},
                media: {total: 0},
            },
            styles: '',
            importSuccess: true,
        });
        const glossaryJson = JSON.stringify(['to read']);
        const sql = `
            PRAGMA journal_mode = DELETE;
            PRAGMA synchronous = NORMAL;

            CREATE TABLE dictionaries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                version INTEGER NOT NULL,
                summaryJson TEXT NOT NULL
            );

            CREATE TABLE terms (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                dictionary TEXT NOT NULL,
                expression TEXT NOT NULL,
                reading TEXT NOT NULL,
                expressionReverse TEXT,
                readingReverse TEXT,
                definitionTags TEXT,
                termTags TEXT,
                rules TEXT,
                score INTEGER,
                glossaryJson TEXT NOT NULL,
                sequence INTEGER
            );

            CREATE TABLE termMeta (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                dictionary TEXT NOT NULL,
                expression TEXT NOT NULL,
                mode TEXT NOT NULL,
                dataJson TEXT NOT NULL
            );

            CREATE TABLE kanji (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                dictionary TEXT NOT NULL,
                character TEXT NOT NULL,
                onyomi TEXT,
                kunyomi TEXT,
                tags TEXT,
                meaningsJson TEXT NOT NULL,
                statsJson TEXT
            );

            CREATE TABLE kanjiMeta (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                dictionary TEXT NOT NULL,
                character TEXT NOT NULL,
                mode TEXT NOT NULL,
                dataJson TEXT NOT NULL
            );

            CREATE TABLE tagMeta (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                dictionary TEXT NOT NULL,
                name TEXT NOT NULL,
                category TEXT,
                ord INTEGER,
                notes TEXT,
                score INTEGER
            );

            CREATE TABLE media (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                dictionary TEXT NOT NULL,
                path TEXT NOT NULL,
                mediaType TEXT NOT NULL,
                width INTEGER NOT NULL,
                height INTEGER NOT NULL,
                content BLOB NOT NULL
            );

            CREATE INDEX idx_dictionaries_title ON dictionaries(title);
            CREATE INDEX idx_dictionaries_version ON dictionaries(version);
            CREATE INDEX idx_terms_dictionary ON terms(dictionary);
            CREATE INDEX idx_terms_expression ON terms(expression);
            CREATE INDEX idx_terms_reading ON terms(reading);
            CREATE INDEX idx_terms_sequence ON terms(sequence);
            CREATE INDEX idx_terms_expression_reverse ON terms(expressionReverse);
            CREATE INDEX idx_terms_reading_reverse ON terms(readingReverse);
            CREATE INDEX idx_term_meta_dictionary ON termMeta(dictionary);
            CREATE INDEX idx_term_meta_expression ON termMeta(expression);
            CREATE INDEX idx_kanji_dictionary ON kanji(dictionary);
            CREATE INDEX idx_kanji_character ON kanji(character);
            CREATE INDEX idx_kanji_meta_dictionary ON kanjiMeta(dictionary);
            CREATE INDEX idx_kanji_meta_character ON kanjiMeta(character);
            CREATE INDEX idx_tag_meta_dictionary ON tagMeta(dictionary);
            CREATE INDEX idx_tag_meta_name ON tagMeta(name);
            CREATE INDEX idx_media_dictionary ON media(dictionary);
            CREATE INDEX idx_media_path ON media(path);

            INSERT INTO dictionaries(title, version, summaryJson)
            VALUES ('${escapeSqlString(testDictionaryTitle)}', 3, '${escapeSqlString(summaryJson)}');

            INSERT INTO terms(
                dictionary, expression, reading, expressionReverse, readingReverse,
                definitionTags, termTags, rules, score, glossaryJson, sequence
            ) VALUES (
                '${escapeSqlString(testDictionaryTitle)}', '読む', 'よむ', NULL, NULL,
                '', '', '', 0, '${escapeSqlString(glossaryJson)}', 1
            );
        `;

        const tempDirectory = await mkdtemp(path.join(os.tmpdir(), 'manabitan-playwright-db-'));
        const databasePath = path.join(tempDirectory, 'dictionary.sqlite3');
        await execFile('sqlite3', [databasePath, sql], {encoding: 'utf8'});
        const databaseContent = await readFile(databasePath);
        return databaseContent.toString('base64');
    })();
    return await testDictionaryDatabaseBase64Promise;
}

/**
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<void>}
 */
async function importTestDictionary(page) {
    await invokeRuntimeApi(page, 'purgeDatabase');
    await invokeRuntimeApi(page, 'importDictionaryDatabase', {content: await getTestDictionaryDatabaseBase64()});
    const optionsFull = /** @type {import('settings').Options} */ (await invokeRuntimeApi(page, 'optionsGetFull'));
    for (const profile of optionsFull.profiles) {
        const dictionaries = profile.options.dictionaries;
        if (!dictionaries.some((dictionary) => dictionary.name === testDictionaryTitle)) {
            dictionaries.push({
                name: testDictionaryTitle,
                alias: testDictionaryTitle,
                enabled: true,
                allowSecondarySearches: false,
                definitionsCollapsible: 'not-collapsible',
                partsOfSpeechFilter: true,
                useDeinflections: true,
                styles: '',
            });
        }
        if (profile.options.general.mainDictionary === '') {
            profile.options.general.mainDictionary = testDictionaryTitle;
        }
    }
    await invokeRuntimeApi(page, 'setAllSettings', {value: optionsFull, source: 'playwright'});
    await invokeRuntimeApi(page, 'triggerDatabaseUpdated', {type: 'dictionary', cause: 'import'});

    try {
        await expect(async () => {
            const info = /** @type {import('dictionary-importer').Summary[]} */ (await invokeRuntimeApi(page, 'getDictionaryInfo'));
            expect(info.length).toBe(1);
            expect(info[0].title).toBe(testDictionaryTitle);
        }).toPass({timeout: 60_000});
    } catch (error) {
        throw new Error('Failed to import test dictionary database', {cause: error});
    }
}

test.beforeEach(async ({context}) => {
    // Close welcome page if it appears so it doesn't steal focus from the active test page.
    const welcomePage = context.pages().find((page) => page.url().endsWith('/welcome.html'));
    if (welcomePage) {
        await welcomePage.close();
        return;
    }
    try {
        const welcome = await context.waitForEvent('page', {timeout: 5_000});
        if (welcome.url().endsWith('/welcome.html')) {
            await welcome.close();
        }
    } catch (_) {
        // No welcome page in this run; continue.
    }
});

test('search clipboard', async ({page, extensionId}) => {
    await page.goto(`chrome-extension://${extensionId}/search.html`);
    await page.locator('#search-option-clipboard-monitor-container > label').click();
    await page.waitForTimeout(200); // Race

    await writeToClipboardFromPage(page, 'あ');
    await expect(page.locator('#search-textbox')).toHaveValue('あ');
});

test('dictionary db export and restore', async ({page, extensionId}) => {
    await page.goto(`chrome-extension://${extensionId}/settings.html`);
    await expect(page.locator('id=dictionaries')).toBeVisible();

    await importTestDictionary(page);

    const exported = await invokeRuntimeApi(page, 'exportDictionaryDatabase');
    await invokeRuntimeApi(page, 'purgeDatabase');
    await page.reload();

    await expect(async () => {
        const info = /** @type {import('dictionary-importer').Summary[]} */ (await invokeRuntimeApi(page, 'getDictionaryInfo'));
        expect(info.length).toBe(0);
    }).toPass({timeout: 10_000});

    await invokeRuntimeApi(page, 'importDictionaryDatabase', {content: exported});
    await page.reload();

    await expect(async () => {
        const info = /** @type {import('dictionary-importer').Summary[]} */ (await invokeRuntimeApi(page, 'getDictionaryInfo'));
        expect(info.length).toBe(1);
        expect(info[0].title).toBe(testDictionaryTitle);
    }).toPass({timeout: 10_000});
});

test('anki add', async ({context, page, extensionId}) => {
    // Mock anki routes
    /** @type {import('core').DeferredPromiseDetails<Record<string, unknown>>} */
    const addNotePromiseDetails = deferPromise();
    await context.route(/127.0.0.1:8765\/*/, (route) => {
        void mockAnkiRouteHandler(route);
        const req = route.request();
        if (req.url().includes('127.0.0.1:8765')) {
            /** @type {unknown} */
            const requestJson = req.postDataJSON();
            if (
                typeof requestJson === 'object' &&
                requestJson !== null &&
                /** @type {Record<string, unknown>} */ (requestJson).action === 'addNote'
            ) {
                addNotePromiseDetails.resolve(/** @type {Record<string, unknown>} */ (requestJson));
            }
        }
    });

    // Open settings
    await page.goto(`chrome-extension://${extensionId}/settings.html`);

    await expect(page.locator('id=dictionaries')).toBeVisible();

    // Load in test dictionary
    await importTestDictionary(page);

    // Connect to anki
    await page.locator('.toggle', {has: page.locator('[data-setting="anki.enable"]')}).click();
    await expect(page.locator('#anki-error-message')).toHaveText('Connected');

    // Prep anki deck
    await page.locator('[data-modal-action="show,anki-cards"]').click();
    await page.locator('select.anki-card-deck').selectOption('Mock Deck');
    await page.locator('select.anki-card-model').selectOption('Mock Model');
    const mockFields = getMockModelFields();
    for (const [modelField, value] of mockFields) {
        await page.locator(`[data-setting="anki.cardFormats[0].fields.${modelField}.value"]`).fill(value);
    }
    await page.locator('#anki-cards-modal > div > div.modal-footer > button:nth-child(2)').click();
    await writeToClipboardFromPage(page, '読むの例文');
    const expectedAddNoteBody = /** @type {{params: {note: Record<string, unknown>}}} */ (getExpectedAddNoteBody());
    await invokeRuntimeApi(page, 'addAnkiNote', {note: expectedAddNoteBody.params.note});
    const addNoteReqBody = await addNotePromiseDetails.promise;
    expect(addNoteReqBody).toMatchObject(getExpectedAddNoteBody());
});
