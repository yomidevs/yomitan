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

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

import {access, mkdir, stat, writeFile} from 'node:fs/promises';
import {Builder, Browser, By, until} from 'selenium-webdriver';
import * as firefox from 'selenium-webdriver/firefox.js';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createDictionaryArchiveData} from '../../dev/dictionary-archive-util.js';
import {safePerformance} from '../../ext/js/core/safe-performance.js';
import {startAnkiMockHttpServer} from '../e2e/anki-mock-http-server.js';
import {createAnkiMockState} from '../e2e/anki-mock-state.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(dirname, '..', '..');
const logTag = '[firefox-happy-path-e2e]';
const dictionaryFixtureDirectory = path.join(root, 'test', 'data', 'dictionaries', 'valid-dictionary1');
const dictionaryTitles = ['firefox-happy-path-a', 'firefox-happy-path-b', 'firefox-happy-path-c'];
const japaneseLookupTerm = '読む';
const japaneseLookupReading = 'よむ';
const japaneseLookupGlossary = 'to read';
const deckName = 'Firefox Happy Deck';
const modelName = 'Firefox Happy Model';
const seedNotes = [{
    noteId: 71_001,
    cardId: 81_001,
    deckName,
    modelName,
    fields: {
        Front: 'existing-front',
        Back: 'existing-back',
    },
    tags: ['manabitan'],
    queue: 2,
    flags: 0,
    findable: true,
}];

function errorMessage(value) {
    return value instanceof Error ? value.message : String(value);
}

function fail(message) {
    throw new Error(`${logTag} ${message}`);
}

function escapeHtml(value) {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll('\'', '&#39;');
}

function createReport() {
    return {
        startedAtIso: new Date().toISOString(),
        finishedAtIso: '',
        status: 'running',
        failureReason: '',
        extensionBaseUrl: '',
        ankiConnectUrl: '',
        importedTitles: [],
        scrollSummary: null,
        addNoteAction: null,
        phases: [],
    };
}

function addPhase(report, name, details, startMs, endMs) {
    report.phases.push({
        name,
        details,
        durationMs: Math.max(0, endMs - startMs),
    });
    console.log(`${logTag} phase: ${name}`);
}

function renderReportHtml(report) {
    const rows = report.phases.map((phase, index) => `
        <section class="phase">
            <h3>Phase ${String(index + 1)}: ${escapeHtml(phase.name)}</h3>
            <div><strong>Duration:</strong> ${phase.durationMs.toFixed(1)} ms</div>
            <pre>${escapeHtml(phase.details)}</pre>
        </section>
    `).join('\n');
    const isFailure = report.status === 'failure';
    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Firefox Happy Path E2E Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif; margin: 24px; color: #111827; }
    .banner { padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; font-weight: 700; }
    .banner.pass { background: #dcfce7; color: #166534; }
    .banner.fail { background: #fee2e2; color: #991b1b; }
    .meta { margin-bottom: 16px; }
    .meta div { margin: 3px 0; }
    .phase { border: 1px solid #d1d5db; border-radius: 8px; padding: 12px; margin-bottom: 12px; }
    pre { white-space: pre-wrap; word-break: break-word; margin: 8px 0 0; }
  </style>
</head>
<body>
  <div class="banner ${isFailure ? 'fail' : 'pass'}">${isFailure ? 'FAILED' : 'PASSED'}</div>
  <div class="meta">
    <div><strong>Started:</strong> ${escapeHtml(report.startedAtIso)}</div>
    <div><strong>Finished:</strong> ${escapeHtml(report.finishedAtIso)}</div>
    <div><strong>Status:</strong> ${escapeHtml(report.status)}</div>
    <div><strong>Failure:</strong> ${escapeHtml(report.failureReason || 'none')}</div>
    <div><strong>Extension Base URL:</strong> ${escapeHtml(report.extensionBaseUrl || '')}</div>
    <div><strong>AnkiConnect URL:</strong> ${escapeHtml(report.ankiConnectUrl || '')}</div>
    <div><strong>Imported Titles:</strong> ${escapeHtml(JSON.stringify(report.importedTitles || []))}</div>
    <div><strong>Scroll Summary:</strong> ${escapeHtml(JSON.stringify(report.scrollSummary || null))}</div>
    <div><strong>Add Note:</strong> ${escapeHtml(JSON.stringify(report.addNoteAction || null))}</div>
  </div>
  ${rows}
</body>
</html>`;
}

function shouldRunHeadless() {
    const value = String(process.env.MANABITAN_FIREFOX_HEADLESS ?? '1').trim().toLowerCase();
    return !(value === '0' || value === 'false' || value === 'no');
}

async function resolveFirefoxAddonPath() {
    const configuredPath = String(process.env.MANABITAN_FIREFOX_XPI || '').trim();
    if (configuredPath.length > 0) {
        await access(configuredPath);
        return configuredPath;
    }
    const candidates = [
        path.join(root, 'builds', 'manabitan-firefox-dev.zip'),
        path.join(root, 'builds', 'manabitan-firefox-dev.xpi'),
    ];
    let bestCandidate = '';
    let bestMtimeMs = -1;
    for (const candidate of candidates) {
        try {
            const info = await stat(candidate);
            if (Number(info.mtimeMs || 0) > bestMtimeMs) {
                bestCandidate = candidate;
                bestMtimeMs = Number(info.mtimeMs || 0);
            }
        } catch (_) {
            // Ignore missing candidate.
        }
    }
    if (bestCandidate.length === 0) {
        fail(`Could not find Firefox addon package. Expected one of: ${candidates.join(', ')}`);
    }
    return bestCandidate;
}

async function waitForExtensionBaseUrl(driver, installedAddonId = '') {
    const normalizedAddonId = String(installedAddonId || '').trim();
    const expectedBaseUrl = normalizedAddonId.length > 0 ? `moz-extension://${normalizedAddonId}` : '';
    const deadline = Date.now() + 30_000;
    let fallbackBaseUrl = '';
    while (Date.now() < deadline) {
        const handles = await driver.getAllWindowHandles();
        for (const handle of handles) {
            await driver.switchTo().window(handle);
            const url = String(await driver.getCurrentUrl());
            const match = /^(moz-extension:\/\/[^/]+)(?:\/|$)/u.exec(url);
            if (match !== null) {
                fallbackBaseUrl = match[1];
                if (expectedBaseUrl.length === 0 || expectedBaseUrl === match[1]) {
                    return match[1];
                }
            }
        }
        await driver.sleep(300);
    }
    if (fallbackBaseUrl.length > 0) {
        return fallbackBaseUrl;
    }
    if (expectedBaseUrl.length > 0) {
        return expectedBaseUrl;
    }
    fail('Unable to discover Firefox extension base URL');
}

async function sendRuntimeMessage(driver, action, params = void 0) {
    return await driver.executeAsyncScript(`
        const [actionName, paramsValue, done] = arguments;
        chrome.runtime.sendMessage({action: actionName, params: paramsValue}, (response) => {
            const runtimeError = chrome.runtime.lastError;
            if (runtimeError) {
                done({ok: false, error: runtimeError.message || String(runtimeError)});
                return;
            }
            if (response && typeof response === 'object' && 'error' in response) {
                done({ok: false, error: JSON.stringify(response.error)});
                return;
            }
            done({ok: true, result: response && typeof response === 'object' ? response.result : response});
        });
    `, action, params).then((payload) => {
        if (!(payload && typeof payload === 'object' && !Array.isArray(payload))) {
            throw new Error(`Unexpected runtime message payload: ${String(payload)}`);
        }
        if (payload.ok !== true) {
            throw new Error(String(payload.error || 'Unknown runtime message error'));
        }
        return payload.result;
    });
}

async function writeDictionaryArchives() {
    const outputDir = path.join(root, 'builds', 'firefox-happy-path-dictionaries');
    await mkdir(outputDir, {recursive: true});
    const outputPaths = [];
    for (const dictionaryTitle of dictionaryTitles) {
        const archivePath = path.join(outputDir, `${dictionaryTitle}.zip`);
        const archiveData = Buffer.from(await createDictionaryArchiveData(dictionaryFixtureDirectory, dictionaryTitle));
        await writeFile(archivePath, archiveData);
        outputPaths.push(archivePath);
    }
    return outputPaths;
}

async function waitForSettingsPageReady(driver) {
    await driver.wait(async () => {
        return await driver.executeScript(`
            return document.documentElement?.dataset?.loaded === 'true' &&
                document.querySelector('#dictionary-import-file-input') instanceof HTMLInputElement;
        `);
    }, 30_000);
}

async function waitForSearchPageReady(driver) {
    await driver.wait(async () => {
        return await driver.executeScript(`
            return document.documentElement?.dataset?.loaded === 'true' &&
                document.querySelector('#search-textbox') instanceof HTMLTextAreaElement &&
                document.querySelector('#search-button') instanceof HTMLButtonElement;
        `);
    }, 30_000);
}

async function ensureImportedDictionariesConfigured(driver, titles) {
    const optionsFull = await sendRuntimeMessage(driver, 'optionsGetFull');
    for (const profile of optionsFull.profiles) {
        for (const title of titles) {
            let dictionary = profile.options.dictionaries.find((item) => item.name === title);
            if (typeof dictionary === 'undefined') {
                dictionary = {
                    name: title,
                    alias: title,
                    enabled: true,
                    allowSecondarySearches: false,
                    definitionsCollapsible: 'not-collapsible',
                    partsOfSpeechFilter: true,
                    useDeinflections: true,
                    styles: '',
                };
                profile.options.dictionaries.push(dictionary);
            }
            dictionary.alias = dictionary.alias || title;
            dictionary.enabled = true;
        }
        if (profile.options.general.mainDictionary === '' && titles.length > 0) {
            profile.options.general.mainDictionary = titles[0];
        }
    }
    await sendRuntimeMessage(driver, 'setAllSettings', {value: optionsFull, source: 'firefox-happy-path-e2e'});
}

async function importDictionariesFromSettings(driver, extensionBaseUrl) {
    const archivePaths = await writeDictionaryArchives();
    await driver.get(`${extensionBaseUrl}/settings.html`);
    await waitForSettingsPageReady(driver);
    const fileInput = await driver.findElement(By.css('#dictionary-import-file-input'));
    await fileInput.sendKeys(archivePaths.join('\n'));
    const deadline = Date.now() + 60_000;
    let importedTitles = [];
    while (Date.now() < deadline) {
        const dictionaryInfo = await sendRuntimeMessage(driver, 'getDictionaryInfo');
        importedTitles = Array.isArray(dictionaryInfo) ? dictionaryInfo.map(({title}) => String(title || '')).filter((value) => value.length > 0).sort() : [];
        const allPresent = dictionaryTitles.every((title) => importedTitles.includes(title));
        if (allPresent) {
            break;
        }
        await driver.sleep(250);
    }
    if (!dictionaryTitles.every((title) => importedTitles.includes(title))) {
        fail(`Timed out waiting for imported dictionaries. expected=${JSON.stringify(dictionaryTitles)} observed=${JSON.stringify(importedTitles)}`);
    }
    await ensureImportedDictionariesConfigured(driver, dictionaryTitles);
    return importedTitles;
}

async function verifyImportedDictionariesEnabled(driver, titles) {
    const optionsFull = await sendRuntimeMessage(driver, 'optionsGetFull');
    const configuredTitles = [];
    for (const profile of optionsFull.profiles) {
        for (const title of titles) {
            const dictionary = profile.options.dictionaries.find((item) => item.name === title);
            if (typeof dictionary === 'undefined' || dictionary.enabled !== true) {
                fail(`Imported dictionary ${title} is not enabled in profile options. dictionaries=${JSON.stringify(profile.options.dictionaries)}`);
            }
            configuredTitles.push(title);
        }
    }
    const dictionaryInfo = await sendRuntimeMessage(driver, 'getDictionaryInfo');
    const importedTitles = Array.isArray(dictionaryInfo) ? dictionaryInfo.map(({title}) => String(title || '')).filter((value) => value.length > 0).sort() : [];
    for (const title of titles) {
        if (!importedTitles.includes(title)) {
            fail(`Imported dictionary ${title} is missing from dictionary info. importedTitles=${JSON.stringify(importedTitles)}`);
        }
    }
    return [...new Set(configuredTitles)].sort();
}

async function configureAnkiServerViaRuntimeApi(driver, ankiConnectUrl) {
    const optionsFull = await sendRuntimeMessage(driver, 'optionsGetFull');
    for (const profile of optionsFull.profiles) {
        profile.options.anki.server = ankiConnectUrl;
        profile.options.anki.apiKey = '';
    }
    await sendRuntimeMessage(driver, 'setAllSettings', {value: optionsFull, source: 'firefox-happy-path-anki'});
}

async function configureAnkiCardViaUi(driver, deck, model) {
    await driver.executeScript(`
        const modalTrigger = document.querySelector('[data-modal-action="show,anki-cards"]');
        if (!(modalTrigger instanceof HTMLElement)) {
            throw new Error('Anki cards modal trigger not found');
        }
        modalTrigger.click();
    `);
    await driver.wait(until.elementLocated(By.css('#anki-cards-modal')), 30_000);
    await driver.wait(async () => {
        return await driver.executeScript(`
            const modal = document.querySelector('#anki-cards-modal');
            return modal instanceof HTMLElement && !modal.hidden;
        `);
    }, 30_000);
    await driver.wait(async () => {
        return await driver.executeScript(`
            const modal = document.querySelector('#anki-cards-modal');
            if (!(modal instanceof HTMLElement)) { return false; }
            const deckSelect = modal.querySelector('select.anki-card-deck');
            const modelSelect = modal.querySelector('select.anki-card-model');
            if (!(deckSelect instanceof HTMLSelectElement) || !(modelSelect instanceof HTMLSelectElement)) { return false; }
            const deckOptions = Array.from(deckSelect.options, (option) => option.label);
            const modelOptions = Array.from(modelSelect.options, (option) => option.label);
            return deckOptions.includes(arguments[0]) && modelOptions.includes(arguments[1]);
        `, deck, model);
    }, 30_000);
    await driver.executeScript(`
        const modal = document.querySelector('#anki-cards-modal');
        if (!(modal instanceof HTMLElement)) { throw new Error('Anki cards modal not found'); }
        const deckSelect = modal.querySelector('select.anki-card-deck');
        const modelSelect = modal.querySelector('select.anki-card-model');
        const frontField = modal.querySelector('[data-setting="anki.cardFormats[0].fields.Front.value"]');
        const backField = modal.querySelector('[data-setting="anki.cardFormats[0].fields.Back.value"]');
        if (!(deckSelect instanceof HTMLSelectElement) ||
            !(modelSelect instanceof HTMLSelectElement) ||
            !(frontField instanceof HTMLInputElement || frontField instanceof HTMLTextAreaElement) ||
            !(backField instanceof HTMLInputElement || backField instanceof HTMLTextAreaElement)) {
            throw new Error('Anki card modal controls are unavailable');
        }
        deckSelect.value = Array.from(deckSelect.options).find((option) => option.label === arguments[0])?.value || '';
        deckSelect.dispatchEvent(new Event('change', {bubbles: true}));
        modelSelect.value = Array.from(modelSelect.options).find((option) => option.label === arguments[1])?.value || '';
        modelSelect.dispatchEvent(new Event('change', {bubbles: true}));
        frontField.value = '{expression}';
        frontField.dispatchEvent(new Event('input', {bubbles: true}));
        frontField.dispatchEvent(new Event('change', {bubbles: true}));
        backField.value = '{glossary}';
        backField.dispatchEvent(new Event('input', {bubbles: true}));
        backField.dispatchEvent(new Event('change', {bubbles: true}));
    `, deck, model);
    await driver.wait(async () => {
        const optionsFull = await sendRuntimeMessage(driver, 'optionsGetFull');
        const profileOptions = optionsFull.profiles[Number.isInteger(optionsFull.profileCurrent) ? optionsFull.profileCurrent : 0]?.options ?? optionsFull.profiles[0]?.options;
        const cardFormat = profileOptions?.anki?.cardFormats?.[0];
        return cardFormat?.deck === deck &&
        cardFormat?.model === model &&
        cardFormat?.fields?.Front?.value === '{expression}' &&
        cardFormat?.fields?.Back?.value === '{glossary}';
    }, 30_000);
    await driver.executeScript(`
        const hideButton = document.querySelector('#anki-cards-modal button[data-modal-action="hide"]');
        if (!(hideButton instanceof HTMLButtonElement)) { throw new Error('Hide modal button not found'); }
        hideButton.click();
    `);
}

async function waitForTermsLookupReady(driver, query) {
    const deadline = Date.now() + 30_000;
    while (Date.now() < deadline) {
        const result = await sendRuntimeMessage(driver, 'termsFind', {
            text: query,
            details: {
                matchType: 'exact',
                deinflect: true,
                primaryReading: '',
            },
        });
        if (result && typeof result === 'object' && Array.isArray(result.dictionaryEntries) && result.dictionaryEntries.length > 0) {
            return;
        }
        await driver.sleep(250);
    }
    fail(`Timed out waiting for runtime lookup readiness for ${query}`);
}

async function runSearch(driver, query) {
    await driver.executeScript(`
        const textbox = document.querySelector('#search-textbox');
        const button = document.querySelector('#search-button');
        if (!(textbox instanceof HTMLTextAreaElement) || !(button instanceof HTMLButtonElement)) {
            throw new Error('Search controls are unavailable');
        }
        textbox.value = arguments[0];
        textbox.dispatchEvent(new Event('input', {bubbles: true, cancelable: true}));
        button.click();
    `, query);
}

async function waitForSearchResults(driver) {
    await driver.wait(async () => {
        return await driver.executeScript(`
            return document.querySelector('#dictionary-entries .entry') instanceof HTMLElement;
        `);
    }, 30_000);
}

async function getResultDictionaryNames(driver, viewportOnly = false) {
    return await driver.executeScript(`
        const scrollElement = document.querySelector('#content-scroll');
        const scrollRect = scrollElement instanceof HTMLElement ? scrollElement.getBoundingClientRect() : null;
        return [...new Set(
            Array.from(
                document.querySelectorAll('#dictionary-entries .definition-item[data-dictionary], #dictionary-entries .kanji-entry[data-dictionary]'),
                (node) => {
                    if (!(node instanceof HTMLElement)) { return ''; }
                    const dictionary = (node.dataset.dictionary || '').trim();
                    if (dictionary.length === 0) { return ''; }
                    if (arguments[0] && scrollRect !== null) {
                        const rect = node.getBoundingClientRect();
                        const intersectsViewport = rect.bottom > scrollRect.top && rect.top < scrollRect.bottom;
                        if (!intersectsViewport) { return ''; }
                    }
                    return dictionary;
                },
            ).filter((dictionary) => dictionary.length > 0),
        )];
    `, viewportOnly);
}

async function getContentScrollMetrics(driver) {
    return await driver.executeScript(`
        const scrollElement = document.querySelector('#content-scroll');
        if (!(scrollElement instanceof HTMLElement)) {
            return {scrollHeight: 0, clientHeight: 0, scrollTop: 0, maxScrollTop: 0};
        }
        return {
            scrollHeight: scrollElement.scrollHeight,
            clientHeight: scrollElement.clientHeight,
            scrollTop: scrollElement.scrollTop,
            maxScrollTop: Math.max(0, scrollElement.scrollHeight - scrollElement.clientHeight),
        };
    `);
}

async function setContentScrollTop(driver, scrollTop) {
    await driver.executeScript(`
        const scrollElement = document.querySelector('#content-scroll');
        if (scrollElement instanceof HTMLElement) {
            scrollElement.scrollTo({top: arguments[0]});
        }
    `, scrollTop);
}

async function collectDictionaryNamesWhileScrolling(driver, expectedTitles) {
    const initialMetrics = await getContentScrollMetrics(driver);
    if (Number(initialMetrics.scrollHeight) <= Number(initialMetrics.clientHeight)) {
        fail(`Expected #content-scroll to be scrollable but got ${JSON.stringify(initialMetrics)}`);
    }
    const seenNames = new Set(await getResultDictionaryNames(driver, true));
    let metrics = initialMetrics;
    let maxObservedScrollTop = Number(metrics.scrollTop || 0);
    while (Number(metrics.scrollTop || 0) < Number(metrics.maxScrollTop || 0) && seenNames.size < expectedTitles.length) {
        const step = Math.max(120, Math.floor(Number(metrics.clientHeight || 0) * 0.6));
        const nextScrollTop = Math.min(Number(metrics.maxScrollTop || 0), Number(metrics.scrollTop || 0) + step);
        await setContentScrollTop(driver, nextScrollTop);
        await driver.sleep(150);
        metrics = await getContentScrollMetrics(driver);
        maxObservedScrollTop = Math.max(maxObservedScrollTop, Number(metrics.scrollTop || 0));
        for (const dictionaryName of await getResultDictionaryNames(driver, true)) {
            seenNames.add(dictionaryName);
        }
    }
    if (Number(metrics.scrollTop || 0) < Number(metrics.maxScrollTop || 0)) {
        await setContentScrollTop(driver, Number(metrics.maxScrollTop || 0));
        await driver.sleep(150);
        metrics = await getContentScrollMetrics(driver);
        maxObservedScrollTop = Math.max(maxObservedScrollTop, Number(metrics.scrollTop || 0));
        for (const dictionaryName of await getResultDictionaryNames(driver, true)) {
            seenNames.add(dictionaryName);
        }
    }
    return {
        seenNames: [...seenNames].sort(),
        initialScrollTop: Number(initialMetrics.scrollTop || 0),
        maxObservedScrollTop,
        finalScrollTop: Number(metrics.scrollTop || 0),
        scrollHeight: Number(metrics.scrollHeight || 0),
        clientHeight: Number(metrics.clientHeight || 0),
    };
}

async function getSearchContentText(driver) {
    return await driver.executeScript(`
        const entries = document.querySelector('#dictionary-entries');
        return entries instanceof HTMLElement ? String(entries.textContent || '') : '';
    `);
}

async function clickSaveButton(driver) {
    await driver.executeScript(`
        const saveButton = document.querySelector('.entry .note-actions-container .action-button[data-action="save-note"]:not([disabled])');
        if (!(saveButton instanceof HTMLButtonElement)) {
            throw new Error('Enabled save note button not found');
        }
        saveButton.click();
    `);
}

async function waitForSaveButtonEnabled(driver) {
    await driver.wait(async () => {
        return await driver.executeScript(`
            const saveButton = document.querySelector('.entry .note-actions-container .action-button[data-action="save-note"]');
            return saveButton instanceof HTMLButtonElement && !saveButton.disabled;
        `);
    }, 30_000);
}

async function main() {
    const report = createReport();
    const reportPath = process.env.MANABITAN_FIREFOX_HAPPY_PATH_REPORT ?? path.join(root, 'builds', 'firefox-happy-path-e2e-report.html');
    const reportJsonPath = reportPath.replace(/\.html$/iu, '.json');
    const addonPath = await resolveFirefoxAddonPath();
    const mockState = createAnkiMockState();
    const localServer = await startAnkiMockHttpServer(mockState);
    report.ankiConnectUrl = localServer.ankiConnectUrl;

    const firefoxOptions = new firefox.Options();
    if (shouldRunHeadless()) {
        firefoxOptions.addArguments('-headless');
    }
    firefoxOptions.setPreference('xpinstall.signatures.required', false);
    firefoxOptions.setPreference('extensions.manifestV3.enabled', true);
    firefoxOptions.setPreference('extensions.backgroundServiceWorker.enabled', true);

    let driver = null;
    let runError;
    try {
        driver = new Builder()
            .forBrowser(Browser.FIREFOX)
            .setFirefoxOptions(firefoxOptions)
            .build();

        const installStart = safePerformance.now();
        const installedAddonId = await driver.installAddon(addonPath, String(process.env.MANABITAN_FIREFOX_TEMPORARY_ADDON ?? '1').trim() !== '0');
        const extensionBaseUrl = await waitForExtensionBaseUrl(driver, String(installedAddonId || ''));
        report.extensionBaseUrl = extensionBaseUrl;
        const installEnd = safePerformance.now();
        addPhase(report, 'Install Firefox addon', `addonPath=${addonPath} extensionBaseUrl=${extensionBaseUrl}`, installStart, installEnd);

        const importStart = safePerformance.now();
        const importedTitles = await importDictionariesFromSettings(driver, extensionBaseUrl);
        await driver.get(`${extensionBaseUrl}/settings.html`);
        await waitForSettingsPageReady(driver);
        await verifyImportedDictionariesEnabled(driver, importedTitles);
        report.importedTitles = importedTitles;
        const importEnd = safePerformance.now();
        addPhase(report, 'Import three dictionaries via settings UI', `importedTitles=${JSON.stringify(importedTitles)} verifiedEnabled=true`, importStart, importEnd);

        mockState.beginScenario('firefox-happy-path-settings', seedNotes);
        const ankiStart = safePerformance.now();
        await configureAnkiServerViaRuntimeApi(driver, localServer.ankiConnectUrl);
        await driver.get(`${extensionBaseUrl}/settings.html`);
        await waitForSettingsPageReady(driver);
        const ankiEnableCheckbox = await driver.findElement(By.css('[data-setting="anki.enable"]'));
        if (!(await ankiEnableCheckbox.isSelected())) {
            await driver.executeScript(`
                const checkbox = document.querySelector('[data-setting="anki.enable"]');
                if (!(checkbox instanceof HTMLInputElement)) { throw new Error('Anki enable checkbox not found'); }
                checkbox.click();
            `);
        }
        await driver.wait(until.elementTextContains(await driver.findElement(By.css('#anki-error-message')), 'Connected'), 30_000);
        await configureAnkiCardViaUi(driver, deckName, modelName);
        const ankiEnd = safePerformance.now();
        addPhase(report, 'Configure Anki settings and card format', `ankiConnectUrl=${localServer.ankiConnectUrl} deck=${deckName} model=${modelName}`, ankiStart, ankiEnd);

        mockState.beginScenario('firefox-happy-path-search', seedNotes);
        const searchStart = safePerformance.now();
        await driver.manage().window().setRect({width: 1280, height: 360});
        await driver.get(`${extensionBaseUrl}/search.html`);
        await waitForSearchPageReady(driver);
        await waitForTermsLookupReady(driver, japaneseLookupTerm);
        await runSearch(driver, japaneseLookupTerm);
        await waitForSearchResults(driver);
        const searchContentText = await getSearchContentText(driver);
        if (!searchContentText.includes(japaneseLookupReading) || !searchContentText.includes(japaneseLookupGlossary)) {
            fail(`Search results are missing expected reading/glossary text. content=${searchContentText.slice(0, 400)}`);
        }
        const dictionaryNames = await getResultDictionaryNames(driver, false);
        for (const title of importedTitles) {
            if (!dictionaryNames.includes(title)) {
                fail(`Search results are missing imported dictionary ${title}. names=${JSON.stringify(dictionaryNames)}`);
            }
        }
        const scrollSummary = await collectDictionaryNamesWhileScrolling(driver, importedTitles);
        report.scrollSummary = scrollSummary;
        if (scrollSummary.maxObservedScrollTop <= scrollSummary.initialScrollTop) {
            fail(`Expected scrolling to move through results. summary=${JSON.stringify(scrollSummary)}`);
        }
        for (const title of importedTitles) {
            if (!scrollSummary.seenNames.includes(title)) {
                fail(`Did not observe imported dictionary ${title} while scrolling. summary=${JSON.stringify(scrollSummary)}`);
            }
        }
        await setContentScrollTop(driver, 0);
        await driver.sleep(150);
        await waitForSaveButtonEnabled(driver);
        await clickSaveButton(driver);
        const searchEnd = safePerformance.now();
        addPhase(report, 'Search, verify scroll, and save note', `dictionaryNames=${JSON.stringify(dictionaryNames)} scrollSummary=${JSON.stringify(scrollSummary)} saveButtonEnabled=true`, searchStart, searchEnd);

        const verifyAddStart = safePerformance.now();
        const deadline = Date.now() + 30_000;
        let addNoteAction = null;
        while (Date.now() < deadline) {
            const actions = mockState.getScenarioState().actions.filter(({action}) => action === 'addNote');
            if (actions.length === 1) {
                addNoteAction = actions[0];
                break;
            }
            await driver.sleep(250);
        }
        if (addNoteAction === null) {
            fail(`Expected exactly one addNote action. observed=${JSON.stringify(mockState.getScenarioState().actions)}`);
        }
        const note = addNoteAction?.params?.note;
        if (note?.deckName !== deckName || note?.modelName !== modelName) {
            fail(`Unexpected note destination. note=${JSON.stringify(note)}`);
        }
        if (String(note?.fields?.Front || '') !== japaneseLookupTerm) {
            fail(`Unexpected Front field. note=${JSON.stringify(note)}`);
        }
        if (!String(note?.fields?.Back || '').includes(japaneseLookupGlossary)) {
            fail(`Unexpected Back field. note=${JSON.stringify(note)}`);
        }
        report.addNoteAction = addNoteAction;
        const verifyAddEnd = safePerformance.now();
        addPhase(report, 'Verify mocked addNote payload', `note=${JSON.stringify(note)}`, verifyAddStart, verifyAddEnd);

        report.status = 'success';
    } catch (e) {
        report.status = 'failure';
        report.failureReason = errorMessage(e);
        runError = new Error(`${logTag} ${report.failureReason}`);
    } finally {
        report.finishedAtIso = new Date().toISOString();
        await mkdir(path.dirname(reportPath), {recursive: true});
        await writeFile(reportPath, renderReportHtml(report), 'utf8');
        await writeFile(reportJsonPath, JSON.stringify(report, null, 2), 'utf8');
        console.log(`${logTag} wrote report: ${reportPath}`);
        console.log(`${logTag} wrote report json: ${reportJsonPath}`);
        if (driver !== null) {
            try {
                await driver.quit();
            } catch (_) {
                // Ignore quit errors.
            }
        }
        try {
            await localServer.close();
        } catch (_) {
            // Ignore close errors.
        }
    }
    if (runError) {
        throw runError;
    }
}

await main();
