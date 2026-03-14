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
import {createDictionaryArchiveData} from '../../dev/dictionary-archive-util.js';
import {createDictionaryDatabaseBase64} from '../e2e/minimal-dictionary-database.js';
import {startAnkiMockHttpServer} from '../e2e/anki-mock-http-server.js';
import {createAnkiMockState} from '../e2e/anki-mock-state.js';
import {
    expect,
    root,
    test,
    writeToClipboardFromPage,
} from './playwright-util.js';

const testDictionaryTitle = 'valid-dictionary1';
const japaneseLookupTerm = '読む';
const japaneseLookupReading = 'よむ';
const japaneseLookupGlossary = 'to read';
const defaultImportValidationDictionaryTitles = ['playwright-japanese-reader-a', 'playwright-japanese-reader-b'];
const happyPathDictionaryTitles = ['playwright-japanese-happy-a', 'playwright-japanese-happy-b', 'playwright-japanese-happy-c'];
const happyPathDeckName = 'Playwright Deck';
const happyPathModelName = 'Playwright Model';
const happyPathSeedNotes = [{
    noteId: 9_001,
    cardId: 59_001,
    deckName: happyPathDeckName,
    modelName: happyPathModelName,
    fields: {
        Front: 'existing-front',
        Back: 'existing-back',
    },
    tags: ['manabitan'],
    queue: 2,
    flags: 0,
    findable: true,
}];
const dictionaryFixtureDirectory = path.join(root, 'test', 'data', 'dictionaries', 'valid-dictionary1');
const clipboardMonitorInitialValue = 'い';
const clipboardMonitorUpdatedValue = 'あ';
/** @type {Promise<string>|null} */
let testDictionaryDatabaseBase64Promise = null;
/** @type {Map<string, Promise<Array<{title: string, file: {name: string, mimeType: string, buffer: Buffer}}>>>} */
const importValidationDictionaryArchivesPromiseMap = new Map();

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
 * @param {import('settings').Options} optionsFull
 * @returns {import('settings').ProfileOptions}
 */
function getCurrentProfileOptions(optionsFull) {
    const currentProfileIndex = Number.isInteger(optionsFull.profileCurrent) ? optionsFull.profileCurrent : 0;
    const profileOptions = optionsFull.profiles[currentProfileIndex]?.options ?? optionsFull.profiles[0]?.options;
    if (typeof profileOptions === 'undefined') {
        throw new Error('No profile options are available');
    }
    return profileOptions;
}

/**
 * @param {string} dictionaryTitle
 * @returns {import('settings').DictionaryOptions}
 */
function createEnabledDictionaryOption(dictionaryTitle) {
    return {
        name: dictionaryTitle,
        alias: dictionaryTitle,
        enabled: true,
        allowSecondarySearches: false,
        definitionsCollapsible: 'not-collapsible',
        partsOfSpeechFilter: true,
        useDeinflections: true,
        styles: '',
    };
}

/**
 * @param {import('settings').DictionaryOptions[]} configuredDictionaries
 * @param {string} dictionaryTitle
 * @returns {import('settings').DictionaryOptions}
 */
function ensureDictionaryConfigured(configuredDictionaries, dictionaryTitle) {
    let dictionary = configuredDictionaries.find(({name}) => name === dictionaryTitle);
    if (typeof dictionary === 'undefined') {
        dictionary = createEnabledDictionaryOption(dictionaryTitle);
        configuredDictionaries.push(dictionary);
    }
    dictionary.alias = dictionary.alias || dictionaryTitle;
    dictionary.enabled = true;
    return dictionary;
}

/**
 * @param {import('settings').Options} optionsFull
 * @param {string[]} dictionaryTitles
 */
function ensureImportedDictionariesConfigured(optionsFull, dictionaryTitles) {
    for (const profile of optionsFull.profiles) {
        const configuredDictionaries = profile.options.dictionaries;
        for (const dictionaryTitle of dictionaryTitles) {
            ensureDictionaryConfigured(configuredDictionaries, dictionaryTitle);
        }
        if (profile.options.general.mainDictionary === '' && dictionaryTitles.length > 0) {
            profile.options.general.mainDictionary = dictionaryTitles[0];
        }
    }
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
 * @param {string[]} [dictionaryTitles]
 * @returns {Promise<Array<{title: string, file: {name: string, mimeType: string, buffer: Buffer}}>>}
 */
async function getImportValidationDictionaryArchives(dictionaryTitles = defaultImportValidationDictionaryTitles) {
    const cacheKey = JSON.stringify(dictionaryTitles);
    let promise = importValidationDictionaryArchivesPromiseMap.get(cacheKey);
    if (typeof promise !== 'undefined') {
        return await promise;
    }
    promise = Promise.all(dictionaryTitles.map(async (title) => ({
        title,
        file: {
            name: `${title}.zip`,
            mimeType: 'application/x-zip',
            buffer: Buffer.from(await createDictionaryArchiveData(dictionaryFixtureDirectory, title)),
        },
    })));
    importValidationDictionaryArchivesPromiseMap.set(cacheKey, promise);
    return await promise;
}

/**
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<void>}
 */
async function importTestDictionary(page) {
    await invokeRuntimeApi(page, 'purgeDatabase');
    await invokeRuntimeApi(page, 'importDictionaryDatabase', {content: await getTestDictionaryDatabaseBase64()});
    const optionsFull = /** @type {import('settings').Options} */ (await invokeRuntimeApi(page, 'optionsGetFull'));
    ensureImportedDictionariesConfigured(optionsFull, [testDictionaryTitle]);
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
    await expect(page.locator('html')).toHaveAttribute('data-loaded', 'true', {timeout: 30_000});
    await expect(page.locator('id=dictionaries')).toBeVisible({timeout: 30_000});
}

/**
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<void>}
 */
async function waitForSearchPageReady(page) {
    await expect(page.locator('html')).toHaveAttribute('data-loaded', 'true', {timeout: 30_000});
    await expect(page.locator('#search-textbox')).toBeVisible({timeout: 30_000});
    await expect(page.locator('#search-button')).toBeEnabled({timeout: 30_000});
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} query
 * @returns {Promise<void>}
 */
async function waitForTermsLookupReady(page, query) {
    await expect(async () => {
        const result = /** @type {{dictionaryEntries?: unknown[]}|undefined} */ (await invokeRuntimeApi(page, 'termsFind', {
            text: query,
            details: {
                matchType: 'exact',
                deinflect: true,
                primaryReading: '',
            },
            optionsContext: {
                depth: 0,
                url: page.url(),
            },
        }));
        expect(Array.isArray(result?.dictionaryEntries)).toBe(true);
        expect(result?.dictionaryEntries?.length ?? 0).toBeGreaterThan(0);
    }).toPass({timeout: 30_000});
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string[]} [dictionaryTitles]
 * @returns {Promise<string[]>}
 */
async function importValidationDictionariesFromSettings(page, dictionaryTitles = defaultImportValidationDictionaryTitles) {
    const dictionaries = await getImportValidationDictionaryArchives(dictionaryTitles);
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
    ensureImportedDictionariesConfigured(optionsFull, expectedTitles);
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
 * @param {string[]} expectedTitles
 * @returns {Promise<void>}
 */
async function verifyImportedDictionariesEnabled(page, expectedTitles) {
    await expect(async () => {
        const optionsFull = /** @type {import('settings').Options} */ (await invokeRuntimeApi(page, 'optionsGetFull'));
        for (const profile of optionsFull.profiles) {
            for (const title of expectedTitles) {
                const dictionary = profile.options.dictionaries.find((item) => item.name === title);
                expect(dictionary?.enabled).toBe(true);
            }
        }
        const info = /** @type {import('dictionary-importer').Summary[]} */ (await invokeRuntimeApi(page, 'getDictionaryInfo'));
        const importedTitles = info.map(({title}) => title).sort();
        expect(importedTitles).toStrictEqual([...expectedTitles].sort());
    }).toPass({timeout: 30_000});
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {boolean} [viewportOnly]
 * @returns {Promise<string[]>}
 */
async function getResultDictionaryNames(page, viewportOnly = false) {
    return await page.evaluate(({viewportOnly: useViewportOnly}) => {
        const scrollElement = document.querySelector('#content-scroll');
        const scrollRect = scrollElement instanceof HTMLElement ? scrollElement.getBoundingClientRect() : null;
        return [...new Set(
            Array.from(
                document.querySelectorAll('#dictionary-entries .definition-item[data-dictionary], #dictionary-entries .kanji-entry[data-dictionary]'),
                (node) => {
                    if (!(node instanceof HTMLElement)) { return ''; }
                    const dictionary = (node.dataset.dictionary || '').trim();
                    if (dictionary.length === 0) { return ''; }
                    if (useViewportOnly && scrollRect !== null) {
                        const rect = node.getBoundingClientRect();
                        const intersectsViewport = rect.bottom > scrollRect.top && rect.top < scrollRect.bottom;
                        if (!intersectsViewport) { return ''; }
                    }
                    return dictionary;
                },
            ).filter((dictionary) => dictionary.length > 0),
        )];
    }, {viewportOnly});
}

/**
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<{scrollHeight: number, clientHeight: number, scrollTop: number, maxScrollTop: number}>}
 */
async function getContentScrollMetrics(page) {
    return await page.evaluate(() => {
        const scrollElement = document.querySelector('#content-scroll');
        if (!(scrollElement instanceof HTMLElement)) {
            return {scrollHeight: 0, clientHeight: 0, scrollTop: 0, maxScrollTop: 0};
        }
        const {scrollHeight, clientHeight, scrollTop} = scrollElement;
        return {
            scrollHeight,
            clientHeight,
            scrollTop,
            maxScrollTop: Math.max(0, scrollHeight - clientHeight),
        };
    });
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {number} scrollTop
 * @returns {Promise<void>}
 */
async function setContentScrollTop(page, scrollTop) {
    await page.evaluate((nextScrollTop) => {
        const scrollElement = document.querySelector('#content-scroll');
        if (!(scrollElement instanceof HTMLElement)) { return; }
        scrollElement.scrollTo({top: nextScrollTop});
    }, scrollTop);
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string[]} expectedTitles
 * @returns {Promise<{seenNames: string[], initialScrollTop: number, maxObservedScrollTop: number, finalScrollTop: number, scrollHeight: number, clientHeight: number}>}
 */
async function collectDictionaryNamesWhileScrolling(page, expectedTitles) {
    await expect(async () => {
        const {scrollHeight, clientHeight} = await getContentScrollMetrics(page);
        expect(scrollHeight).toBeGreaterThan(clientHeight);
    }).toPass({timeout: 30_000});

    const seenNames = new Set();
    for (const dictionaryName of await getResultDictionaryNames(page, true)) {
        seenNames.add(dictionaryName);
    }

    let metrics = await getContentScrollMetrics(page);
    const initialScrollTop = metrics.scrollTop;
    let maxObservedScrollTop = initialScrollTop;

    while (metrics.scrollTop < metrics.maxScrollTop && seenNames.size < expectedTitles.length) {
        const step = Math.max(120, Math.floor(metrics.clientHeight * 0.6));
        const nextScrollTop = Math.min(metrics.maxScrollTop, metrics.scrollTop + step);
        await setContentScrollTop(page, nextScrollTop);
        await page.waitForTimeout(150);
        metrics = await getContentScrollMetrics(page);
        maxObservedScrollTop = Math.max(maxObservedScrollTop, metrics.scrollTop);
        for (const dictionaryName of await getResultDictionaryNames(page, true)) {
            seenNames.add(dictionaryName);
        }
        if (nextScrollTop === metrics.scrollTop && metrics.scrollTop < metrics.maxScrollTop) {
            break;
        }
    }

    if (metrics.scrollTop < metrics.maxScrollTop) {
        await setContentScrollTop(page, metrics.maxScrollTop);
        await page.waitForTimeout(150);
        metrics = await getContentScrollMetrics(page);
        maxObservedScrollTop = Math.max(maxObservedScrollTop, metrics.scrollTop);
        for (const dictionaryName of await getResultDictionaryNames(page, true)) {
            seenNames.add(dictionaryName);
        }
    }

    return {
        seenNames: [...seenNames].sort(),
        initialScrollTop,
        maxObservedScrollTop,
        finalScrollTop: metrics.scrollTop,
        scrollHeight: metrics.scrollHeight,
        clientHeight: metrics.clientHeight,
    };
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} ankiConnectUrl
 * @returns {Promise<void>}
 */
async function configureAnkiServerViaRuntimeApi(page, ankiConnectUrl) {
    const optionsFull = /** @type {import('settings').Options} */ (await invokeRuntimeApi(page, 'optionsGetFull'));
    for (const profile of optionsFull.profiles) {
        profile.options.anki.server = ankiConnectUrl;
        profile.options.anki.apiKey = '';
    }
    await invokeRuntimeApi(page, 'setAllSettings', {value: optionsFull, source: 'playwright-anki-mock'});
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} deckName
 * @param {string} modelName
 * @returns {Promise<void>}
 */
async function configureAnkiCardViaUi(page, deckName, modelName) {
    const modal = page.locator('#anki-cards-modal');
    await page.locator('[data-modal-action="show,anki-cards"]').click();
    await expect(modal).toBeVisible({timeout: 30_000});
    await expect(async () => {
        const deckOptions = await modal.locator('select.anki-card-deck option').allTextContents();
        const modelOptions = await modal.locator('select.anki-card-model option').allTextContents();
        expect(deckOptions).toContain(deckName);
        expect(modelOptions).toContain(modelName);
    }).toPass({timeout: 30_000});

    await modal.locator('select.anki-card-deck').selectOption({label: deckName});
    await modal.locator('select.anki-card-model').selectOption({label: modelName});

    const frontField = modal.locator('[data-setting="anki.cardFormats[0].fields.Front.value"]');
    const backField = modal.locator('[data-setting="anki.cardFormats[0].fields.Back.value"]');
    await expect(frontField).toBeVisible({timeout: 30_000});
    await expect(backField).toBeVisible({timeout: 30_000});
    await frontField.fill('{expression}');
    await frontField.blur();
    await backField.fill('{glossary}');
    await backField.blur();

    await expect(async () => {
        const optionsFull = /** @type {import('settings').Options} */ (await invokeRuntimeApi(page, 'optionsGetFull'));
        const profileOptions = getCurrentProfileOptions(optionsFull);
        const cardFormat = profileOptions.anki.cardFormats[0];
        expect(cardFormat.deck).toBe(deckName);
        expect(cardFormat.model).toBe(modelName);
        expect(cardFormat.fields.Front.value).toBe('{expression}');
        expect(cardFormat.fields.Back.value).toBe('{glossary}');
    }).toPass({timeout: 30_000});

    await modal.locator('button[data-modal-action="hide"]').click();
    await expect(modal).toBeHidden({timeout: 30_000});
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} query
 * @returns {Promise<void>}
 */
async function runSearch(page, query) {
    await waitForSearchPageReady(page);
    const searchTextbox = page.locator('#search-textbox');
    const searchButton = page.locator('#search-button');
    await searchTextbox.fill(query);
    await expect(searchTextbox).toHaveValue(query);
    await searchButton.click();
}

/**
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<void>}
 */
async function waitForSaveButtonEnabled(page) {
    const saveButton = page.locator('.entry .note-actions-container .action-button[data-action="save-note"]').first();
    await expect(saveButton).toBeVisible({timeout: 30_000});
    await expect(saveButton).toBeEnabled({timeout: 30_000});
}

test('search clipboard', async ({page, extensionId}) => {
    await page.goto(`chrome-extension://${extensionId}/search.html`);
    await waitForSearchPageReady(page);
    await writeToClipboardFromPage(page, clipboardMonitorInitialValue);
    await page.locator('#search-option-clipboard-monitor-container > label').click();
    await expect(page.locator('#clipboard-monitor-enable')).toBeChecked();

    await expect(async () => {
        await writeToClipboardFromPage(page, clipboardMonitorUpdatedValue);
        await expect(page.locator('#search-textbox')).toHaveValue(clipboardMonitorUpdatedValue);
    }).toPass({timeout: 15_000});
});

test('dictionary db export and restore', async ({page, extensionId}) => {
    await page.goto(`chrome-extension://${extensionId}/settings.html`);
    await waitForSettingsPageReady(page);

    await importTestDictionary(page);

    const exported = await invokeRuntimeApi(page, 'exportDictionaryDatabase');
    await invokeRuntimeApi(page, 'purgeDatabase');
    await page.reload();
    await waitForSettingsPageReady(page);

    await expect(async () => {
        const info = /** @type {import('dictionary-importer').Summary[]} */ (await invokeRuntimeApi(page, 'getDictionaryInfo'));
        expect(info.length).toBe(0);
    }).toPass({timeout: 10_000});

    await invokeRuntimeApi(page, 'importDictionaryDatabase', {content: exported});
    await page.reload();
    await waitForSettingsPageReady(page);

    await expect(async () => {
        const info = /** @type {import('dictionary-importer').Summary[]} */ (await invokeRuntimeApi(page, 'getDictionaryInfo'));
        expect(info.length).toBe(1);
        expect(info[0].title).toBe(testDictionaryTitle);
    }).toPass({timeout: 10_000});
});

test('chromium happy path covers multi-dictionary import, lookup scroll, and Anki add', async ({page, extensionId}) => {
    const extensionBaseUrl = `chrome-extension://${extensionId}`;
    const mockState = createAnkiMockState();
    const localServer = await startAnkiMockHttpServer(mockState);

    try {
        mockState.beginScenario('playwright-happy-path-settings', happyPathSeedNotes);

        await page.goto(`${extensionBaseUrl}/settings.html`);
        await waitForSettingsPageReady(page);

        const importedTitles = await importValidationDictionariesFromSettings(page, happyPathDictionaryTitles);
        await verifyImportedDictionariesEnabled(page, importedTitles);
        await configureAnkiServerViaRuntimeApi(page, localServer.ankiConnectUrl);
        await page.reload();
        await waitForSettingsPageReady(page);

        const ankiEnableCheckbox = page.locator('[data-setting="anki.enable"]');
        if (!(await ankiEnableCheckbox.isChecked())) {
            await page.locator('.toggle', {has: ankiEnableCheckbox}).click();
        }
        await expect(page.locator('#anki-error-message')).toHaveText('Connected', {timeout: 30_000});
        await configureAnkiCardViaUi(page, happyPathDeckName, happyPathModelName);

        mockState.beginScenario('playwright-happy-path-search', happyPathSeedNotes);

        await page.setViewportSize({width: 1280, height: 320});
        await page.goto(`${extensionBaseUrl}/search.html`);
        await waitForSearchPageReady(page);
        await waitForTermsLookupReady(page, japaneseLookupTerm);
        await runSearch(page, japaneseLookupTerm);
        await expect(page.locator('#dictionary-entries .entry')).toBeVisible({timeout: 30_000});
        await expect(page.locator('#dictionary-entries .headword-reading').first()).toHaveText(new RegExp(japaneseLookupReading));
        await expect(page.locator('#dictionary-entries')).toContainText(japaneseLookupGlossary);
        await expect(async () => {
            const dictionaryNames = await getResultDictionaryNames(page);
            expect(dictionaryNames).toEqual(expect.arrayContaining(importedTitles));
        }).toPass({timeout: 30_000});

        const scrollSummary = await collectDictionaryNamesWhileScrolling(page, importedTitles);
        expect(scrollSummary.scrollHeight).toBeGreaterThan(scrollSummary.clientHeight);
        expect(scrollSummary.maxObservedScrollTop).toBeGreaterThan(scrollSummary.initialScrollTop);
        expect(scrollSummary.seenNames).toEqual(expect.arrayContaining(importedTitles));

        await setContentScrollTop(page, 0);
        await page.waitForTimeout(150);

        await waitForSaveButtonEnabled(page);
        const saveButton = page.locator('.entry .note-actions-container .action-button[data-action="save-note"]:not([disabled])').first();
        await saveButton.click();

        await expect(async () => {
            const addNoteActions = mockState.getScenarioState().actions.filter(({action}) => action === 'addNote');
            expect(addNoteActions).toHaveLength(1);
        }).toPass({timeout: 30_000});

        const addNoteAction = mockState.getScenarioState().actions.find(({action}) => action === 'addNote');
        const note = /** @type {import('anki').Note|undefined} */ (addNoteAction?.params?.note);
        expect(note).toBeDefined();
        expect(note?.deckName).toBe(happyPathDeckName);
        expect(note?.modelName).toBe(happyPathModelName);
        expect(note?.fields).toMatchObject({
            Front: japaneseLookupTerm,
        });
        expect(String(note?.fields?.Back || '')).toContain(japaneseLookupGlossary);
    } finally {
        await localServer.close();
    }
});
