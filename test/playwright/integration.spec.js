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

import path from 'path';
import {deferPromise} from '../../ext/js/core/utilities.js';
import {createDictionaryArchiveData} from '../../dev/dictionary-archive-util.js';
import {createDictionaryDatabaseBase64} from '../e2e/minimal-dictionary-database.js';
import {
    expect,
    getExpectedAddNoteBody,
    getMockModelFields,
    mockAnkiRouteHandler,
    root,
    test,
    writeToClipboardFromPage,
} from './playwright-util.js';

const testDictionaryTitle = 'valid-dictionary1';
const japaneseLookupTerm = '読む';
const japaneseLookupReading = 'よむ';
const japaneseLookupGlossary = 'to read';
const importValidationDictionaryTitles = ['playwright-japanese-reader-a', 'playwright-japanese-reader-b'];
const dictionaryFixtureDirectory = path.join(root, 'test', 'data', 'dictionaries', 'valid-dictionary1');
/** @type {Promise<string>|null} */
let testDictionaryDatabaseBase64Promise = null;
/** @type {Promise<Array<{title: string, file: {name: string, mimeType: string, buffer: Buffer}}>>|null} */
let importValidationDictionaryArchivesPromise = null;

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
 * @returns {Promise<string>}
 */
async function getTestDictionaryDatabaseBase64() {
    if (testDictionaryDatabaseBase64Promise !== null) {
        return await testDictionaryDatabaseBase64Promise;
    }
    testDictionaryDatabaseBase64Promise = createDictionaryDatabaseBase64({
        title: testDictionaryTitle,
        revision: 'test',
        expression: japaneseLookupTerm,
        reading: japaneseLookupReading,
        glossary: [japaneseLookupGlossary],
    });
    return await testDictionaryDatabaseBase64Promise;
}

/**
 * @returns {Promise<Array<{title: string, file: {name: string, mimeType: string, buffer: Buffer}}>>}
 */
async function getImportValidationDictionaryArchives() {
    if (importValidationDictionaryArchivesPromise !== null) {
        return await importValidationDictionaryArchivesPromise;
    }
    importValidationDictionaryArchivesPromise = Promise.all(importValidationDictionaryTitles.map(async (title) => ({
        title,
        file: {
            name: `${title}.zip`,
            mimeType: 'application/x-zip',
            buffer: Buffer.from(await createDictionaryArchiveData(dictionaryFixtureDirectory, title)),
        },
    })));
    return await importValidationDictionaryArchivesPromise;
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

/**
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<void>}
 */
async function waitForSettingsPageReady(page) {
    await expect(page.locator('id=dictionaries')).toBeVisible({timeout: 30_000});
}

/**
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<string[]>}
 */
async function importValidationDictionariesFromSettings(page) {
    const dictionaries = await getImportValidationDictionaryArchives();
    const expectedTitles = dictionaries.map(({title}) => title).sort();

    await invokeRuntimeApi(page, 'purgeDatabase');
    await page.reload();
    await waitForSettingsPageReady(page);
    await page.locator('#dictionary-import-file-input').setInputFiles(dictionaries.map(({file}) => file));
    await expect(async () => {
        const info = /** @type {import('dictionary-importer').Summary[]} */ (await invokeRuntimeApi(page, 'getDictionaryInfo'));
        const titles = info.map(({title}) => title).sort();
        expect(titles).toStrictEqual(expectedTitles);
    }).toPass({timeout: 2 * 60 * 1000});
    const optionsFull = /** @type {import('settings').Options} */ (await invokeRuntimeApi(page, 'optionsGetFull'));
    for (const profile of optionsFull.profiles) {
        const configuredDictionaries = profile.options.dictionaries;
        for (const dictionaryTitle of expectedTitles) {
            let dictionary = configuredDictionaries.find(({name}) => name === dictionaryTitle);
            if (typeof dictionary === 'undefined') {
                dictionary = {
                    name: dictionaryTitle,
                    alias: dictionaryTitle,
                    enabled: true,
                    allowSecondarySearches: false,
                    definitionsCollapsible: 'not-collapsible',
                    partsOfSpeechFilter: true,
                    useDeinflections: true,
                    styles: '',
                };
                configuredDictionaries.push(dictionary);
            }
            dictionary.alias = dictionary.alias || dictionaryTitle;
            dictionary.enabled = true;
        }
        if (profile.options.general.mainDictionary === '') {
            profile.options.general.mainDictionary = expectedTitles[0];
        }
    }
    await invokeRuntimeApi(page, 'setAllSettings', {value: optionsFull, source: 'playwright-dictionary-import'});
    await invokeRuntimeApi(page, 'triggerDatabaseUpdated', {type: 'dictionary', cause: 'import'});
    await page.reload();
    await waitForSettingsPageReady(page);
    await expect(page.locator('id=dictionaries')).toHaveText(
        `Dictionaries (${dictionaries.length} installed, ${dictionaries.length} enabled)`,
        {timeout: 2 * 60 * 1000},
    );
    await expect(async () => {
        const info = /** @type {import('dictionary-importer').Summary[]} */ (await invokeRuntimeApi(page, 'getDictionaryInfo'));
        const titles = info.map(({title}) => title).sort();
        expect(titles).toStrictEqual(expectedTitles);
    }).toPass({timeout: 60_000});

    return expectedTitles;
}

/**
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<string[]>}
 */
async function getVisibleResultDictionaryNames(page) {
    return await page.evaluate(() => {
        return [...new Set(
            Array.from(
                document.querySelectorAll('#dictionary-entries .definition-item[data-dictionary], #dictionary-entries .entry [data-dictionary]'),
                (node) => (node instanceof HTMLElement ? (node.dataset.dictionary || '').trim() : ''),
            ).filter((dictionary) => dictionary.length > 0),
        )];
    });
}

test('search clipboard', async ({page, extensionId}) => {
    await page.goto(`chrome-extension://${extensionId}/search.html`);
    await page.locator('#search-option-clipboard-monitor-container > label').click();
    await page.waitForTimeout(200); // Race

    await writeToClipboardFromPage(page, 'あ');
    await expect(page.locator('#search-textbox')).toHaveValue('あ');
});

test('dictionary db export and restore', async ({page, extensionId}) => {
    await page.goto(`chrome-extension://${extensionId}/settings.html`);
    await waitForSettingsPageReady(page);

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

test('imported dictionaries are used for Japanese lookups', async ({page, extensionId}) => {
    const extensionBaseUrl = `chrome-extension://${extensionId}`;
    await page.goto(`${extensionBaseUrl}/settings.html`);
    await waitForSettingsPageReady(page);

    const importedTitles = await importValidationDictionariesFromSettings(page);

    await page.goto(`${extensionBaseUrl}/search.html`);
    await expect(page.locator('#search-textbox')).toBeVisible({timeout: 30_000});
    await page.locator('#search-textbox').fill(japaneseLookupTerm);
    await page.keyboard.press('Enter');

    await expect(page.locator('#search-textbox')).toHaveValue(japaneseLookupTerm);
    await expect(page.locator('#dictionary-entries .entry')).toBeVisible({timeout: 30_000});
    await expect(page.locator('#dictionary-entries .headword-reading').first()).toHaveText(new RegExp(japaneseLookupReading));
    await expect(page.locator('#dictionary-entries')).toContainText(japaneseLookupGlossary);
    await expect(async () => {
        const dictionaryNames = await getVisibleResultDictionaryNames(page);
        expect(dictionaryNames).toEqual(expect.arrayContaining(importedTitles));
    }).toPass({timeout: 30_000});
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

    await waitForSettingsPageReady(page);

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
