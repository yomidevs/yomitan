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
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Builder, Browser} from 'selenium-webdriver';
import * as firefox from 'selenium-webdriver/firefox.js';
import {safePerformance} from '../../ext/js/core/safe-performance.js';
import {applyAnkiDedupeOptions, dedupeDictionaryTitle, dedupeSearchTerm, getAnkiDedupeMatrix, normalizeExpectedButtonState} from '../e2e/anki-dedupe-matrix.js';
import {startAnkiMockHttpServer} from '../e2e/anki-mock-http-server.js';
import {createAnkiMockState} from '../e2e/anki-mock-state.js';
import {getMinimalDictionaryDatabaseBase64} from '../e2e/minimal-dictionary-database.js';
import {writeCombinedTabbedReport} from '../e2e/report-tabs.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(dirname, '..', '..');
const logTag = '[firefox-anki-dedupe-e2e]';

/**
 * @param {unknown} value
 * @returns {string}
 */
function errorMessage(value) {
    return value instanceof Error ? value.message : String(value);
}

/**
 * @param {string} message
 */
function fail(message) {
    throw new Error(`${logTag} ${message}`);
}

/**
 * @param {string} value
 * @returns {string}
 */
function escapeHtml(value) {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll('\'', '&#39;');
}

/**
 * @returns {{
 *   startedAtIso: string,
 *   finishedAtIso: string,
 *   status: 'running'|'success'|'failure',
 *   failureReason: string,
 *   extensionBaseUrl: string,
 *   ankiConnectUrl: string,
 *   scenarios: Array<Record<string, unknown>>,
 * }}
 */
function createReport() {
    return {
        startedAtIso: new Date().toISOString(),
        finishedAtIso: '',
        status: 'running',
        failureReason: '',
        extensionBaseUrl: '',
        ankiConnectUrl: '',
        scenarios: [],
    };
}

/**
 * @param {ReturnType<typeof createReport>} report
 * @returns {string}
 */
function renderReportHtml(report) {
    const rows = report.scenarios.map((scenario) => {
        const passed = scenario.pass === true;
        const className = passed ? 'row-pass' : 'row-fail';
        return `
            <tr class="${className}">
                <td>${escapeHtml(String(scenario.id || ''))}</td>
                <td>${escapeHtml(String(scenario.description || ''))}</td>
                <td>${escapeHtml(String(passed ? 'PASS' : 'FAIL'))}</td>
                <td><pre>${escapeHtml(JSON.stringify(scenario.expected, null, 2))}</pre></td>
                <td><pre>${escapeHtml(JSON.stringify(scenario.observed, null, 2))}</pre></td>
            </tr>
        `;
    }).join('\n');

    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Firefox Anki Deduplication E2E Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif; margin: 24px; color: #111827; }
    .meta { margin-bottom: 16px; padding: 12px; border: 1px solid #d1d5db; border-radius: 8px; background: #f9fafb; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #e5e7eb; padding: 8px; vertical-align: top; text-align: left; }
    th { background: #f3f4f6; }
    .row-pass { background: #ecfdf5; }
    .row-fail { background: #fef2f2; }
    pre { margin: 0; white-space: pre-wrap; word-break: break-word; }
  </style>
</head>
<body>
  <h1>Firefox Anki Deduplication E2E Report</h1>
  <div class="meta">
    <div><strong>Started:</strong> ${escapeHtml(report.startedAtIso)}</div>
    <div><strong>Finished:</strong> ${escapeHtml(report.finishedAtIso)}</div>
    <div><strong>Status:</strong> ${escapeHtml(report.status)}</div>
    <div><strong>Failure:</strong> ${escapeHtml(report.failureReason || 'none')}</div>
    <div><strong>Extension Base URL:</strong> ${escapeHtml(report.extensionBaseUrl)}</div>
    <div><strong>AnkiConnect URL:</strong> ${escapeHtml(report.ankiConnectUrl)}</div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Scenario</th>
        <th>Description</th>
        <th>Result</th>
        <th>Expected</th>
        <th>Observed</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
</body>
</html>`;
}

/**
 * @returns {boolean}
 */
function shouldRunHeadless() {
    const value = String(process.env.MANABITAN_FIREFOX_HEADLESS ?? '1').trim().toLowerCase();
    return !(value === '0' || value === 'false' || value === 'no');
}

/**
 * @returns {Promise<string>}
 */
async function resolveFirefoxAddonPath() {
    const configuredPath = String(process.env.MANABITAN_FIREFOX_XPI || '').trim();
    if (configuredPath.length > 0) {
        await access(configuredPath);
        return configuredPath;
    }
    const defaultZipPath = path.join(root, 'builds', 'manabitan-firefox-dev.zip');
    const defaultXpiPath = path.join(root, 'builds', 'manabitan-firefox-dev.xpi');
    /** @type {Array<{path: string, mtimeMs: number}>} */
    const candidates = [];
    for (const candidate of [defaultZipPath, defaultXpiPath]) {
        try {
            const info = await stat(candidate);
            candidates.push({path: candidate, mtimeMs: Number(info.mtimeMs || 0)});
        } catch (_) {
            // Ignore missing candidate.
        }
    }
    if (candidates.length === 0) {
        fail(`Could not find Firefox addon package. Expected one of: ${defaultZipPath}, ${defaultXpiPath}`);
    }
    candidates.sort((a, b) => b.mtimeMs - a.mtimeMs);
    return candidates[0].path;
}

/**
 * @param {import('selenium-webdriver').ThenableWebDriver} driver
 * @returns {Promise<string>}
 */
/**
 * @param {import('selenium-webdriver').ThenableWebDriver} driver
 * @param {string} [installedAddonId]
 * @returns {Promise<string>}
 */
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
            const match = /^(moz-extension:\/\/[^/]+)(?:\/|$)/.exec(url);
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

/**
 * @param {import('selenium-webdriver').ThenableWebDriver} driver
 * @param {string} action
 * @param {Record<string, unknown>|undefined} params
 * @returns {Promise<unknown>}
 */
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

/**
 * @param {import('selenium-webdriver').ThenableWebDriver} driver
 * @param {string} extensionBaseUrl
 * @returns {Promise<void>}
 */
async function importDictionaryFixture(driver, extensionBaseUrl) {
    await driver.get(`${extensionBaseUrl}/settings.html`);
    await driver.executeScript('return document.readyState === "complete";');
    await sendRuntimeMessage(driver, 'purgeDatabase', void 0);
    await sendRuntimeMessage(driver, 'importDictionaryDatabase', {content: await getMinimalDictionaryDatabaseBase64()});
    await sendRuntimeMessage(driver, 'triggerDatabaseUpdated', {type: 'dictionary', cause: 'import'});
    const deadline = safePerformance.now() + 60_000;
    while (safePerformance.now() < deadline) {
        const dictionaryInfo = /** @type {Array<{title: string}>} */ (await sendRuntimeMessage(driver, 'getDictionaryInfo', void 0));
        if (Array.isArray(dictionaryInfo) && dictionaryInfo.some((item) => String(item?.title || '') === dedupeDictionaryTitle)) {
            return;
        }
        await driver.sleep(200);
    }
    fail(`Timed out waiting for dictionary import: ${dedupeDictionaryTitle}`);
}

/**
 * @param {import('selenium-webdriver').ThenableWebDriver} driver
 * @param {string} ankiConnectUrl
 * @param {import('../e2e/anki-dedupe-matrix.js').DedupeScenarioOptions} scenarioOptions
 * @returns {Promise<void>}
 */
async function applyScenarioOptions(driver, ankiConnectUrl, scenarioOptions) {
    const optionsFull = /** @type {import('settings').Options} */ (await sendRuntimeMessage(driver, 'optionsGetFull', void 0));
    applyAnkiDedupeOptions(optionsFull, ankiConnectUrl, scenarioOptions);
    await sendRuntimeMessage(driver, 'setAllSettings', {value: optionsFull, source: 'firefox-anki-dedupe-e2e'});
}

/**
 * @param {import('selenium-webdriver').ThenableWebDriver} driver
 * @param {string} extensionBaseUrl
 * @returns {Promise<void>}
 */
async function openSearchAndLookup(driver, extensionBaseUrl) {
    await driver.get(`${extensionBaseUrl}/search.html`);
    await driver.executeScript(`
        const textbox = document.querySelector('#search-textbox');
        if (!(textbox instanceof HTMLTextAreaElement)) {
            throw new Error('Search textbox not found');
        }
        textbox.value = '';
        textbox.dispatchEvent(new Event('input', {bubbles: true, cancelable: true}));
        textbox.value = arguments[0];
        textbox.dispatchEvent(new Event('input', {bubbles: true, cancelable: true}));
        textbox.dispatchEvent(new KeyboardEvent('keydown', {
            bubbles: true,
            cancelable: true,
            key: 'Enter',
            code: 'Enter',
        }));
    `, dedupeSearchTerm);
    const deadline = safePerformance.now() + 30_000;
    while (safePerformance.now() < deadline) {
        const hasEntry = await driver.executeScript(`
            if (document.querySelector('.entry') instanceof HTMLElement) {
                return true;
            }
            const noResults = document.querySelector('#no-results');
            return noResults instanceof HTMLElement && !noResults.hidden;
        `);
        if (hasEntry === true) {
            break;
        }
        await driver.sleep(200);
    }
    const hasEntry = await driver.executeScript('return document.querySelector(".entry") instanceof HTMLElement;');
    if (hasEntry !== true) {
        fail(`Search returned no entry for fixture term: ${dedupeSearchTerm}`);
    }
}

/**
 * @param {import('selenium-webdriver').ThenableWebDriver} driver
 * @returns {Promise<{ready: boolean, disabled: boolean, title: string, icon: string, overwrite: boolean, viewNoteIds: string|null}>}
 */
async function getSaveButtonState(driver) {
    return await driver.executeScript(`
        const saveButton = document.querySelector('.entry .note-actions-container .action-button[data-action="save-note"]');
        if (!(saveButton instanceof HTMLButtonElement)) {
            return {ready: false, disabled: true, title: '', icon: '', overwrite: false, viewNoteIds: null};
        }
        const iconNode = saveButton.querySelector('.action-icon');
        const icon = iconNode instanceof HTMLElement ? String(iconNode.dataset.icon || '') : '';
        const actionContainer = saveButton.closest('.action-button-container');
        const viewButton = actionContainer?.querySelector('.action-button[data-action="view-note"]');
        const viewNoteIdsRaw = viewButton instanceof HTMLElement ? String(viewButton.dataset.noteIds || '') : '';
        const viewNoteIds = viewNoteIdsRaw.trim().length > 0 ? viewNoteIdsRaw.trim().split(/\\s+/).join(' ') : null;
        return {
            ready: true,
            disabled: saveButton.disabled,
            title: String(saveButton.title || ''),
            icon,
            overwrite: saveButton.dataset.overwrite === 'true',
            viewNoteIds,
        };
    `);
}

/**
 * @param {import('selenium-webdriver').ThenableWebDriver} driver
 * @param {import('../e2e/anki-dedupe-matrix.js').DedupeExpectedButtonState} expectedState
 * @param {number} [timeoutMs]
 * @returns {Promise<{ready: boolean, disabled: boolean, title: string, icon: string, overwrite: boolean, viewNoteIds: string|null}>}
 */
async function waitForExpectedButtonState(driver, expectedState, timeoutMs = 15_000) {
    const expected = normalizeExpectedButtonState(expectedState);
    const deadline = safePerformance.now() + timeoutMs;
    let lastState = await getSaveButtonState(driver);
    while (safePerformance.now() < deadline) {
        lastState = await getSaveButtonState(driver);
        if (
            lastState.ready &&
            lastState.disabled === expected.disabled &&
            lastState.title === expected.title &&
            lastState.icon === expected.icon &&
            lastState.overwrite === expected.overwrite &&
            lastState.viewNoteIds === expected.viewNoteIds
        ) {
            return lastState;
        }
        await driver.sleep(200);
    }
    fail(`Timed out waiting for expected save button state. expected=${JSON.stringify(expected)} observed=${JSON.stringify(lastState)}`);
}

/**
 * @param {{actions: Array<{action: string}>}} scenarioState
 * @returns {Array<'addNote'|'updateNoteFields'>}
 */
function getWriteActions(scenarioState) {
    const output = [];
    for (const row of scenarioState.actions) {
        if (row.action === 'addNote' || row.action === 'updateNoteFields') {
            output.push(row.action);
        }
    }
    return output;
}

/**
 * @param {'addNote'|'updateNoteFields'|'none'} expectedAction
 * @param {Array<'addNote'|'updateNoteFields'>} observedActions
 * @returns {boolean}
 */
function isExpectedWriteAction(expectedAction, observedActions) {
    if (expectedAction === 'none') {
        return observedActions.length === 0;
    }
    if (expectedAction === 'addNote') {
        return observedActions.includes('addNote') && !observedActions.includes('updateNoteFields');
    }
    return observedActions.includes('updateNoteFields') && !observedActions.includes('addNote');
}

/**
 * @param {import('selenium-webdriver').ThenableWebDriver} driver
 * @returns {Promise<void>}
 */
async function clickSaveButton(driver) {
    await driver.executeScript(`
        const saveButton = document.querySelector('.entry .note-actions-container .action-button[data-action="save-note"]');
        if (!(saveButton instanceof HTMLButtonElement)) {
            throw new Error('Save button not found');
        }
        saveButton.click();
    `);
}

/**
 * @returns {Promise<void>}
 */
async function main() {
    const report = createReport();
    const reportPath = process.env.MANABITAN_FIREFOX_ANKI_DEDUPE_REPORT ?? path.join(root, 'builds', 'firefox-e2e-anki-dedupe-report.html');
    const reportJsonPath = reportPath.replace(/\.html$/i, '.json');
    const chromiumReportPath = path.join(root, 'builds', 'chromium-e2e-anki-dedupe-report.html');
    const combinedReportPath = path.join(root, 'builds', 'extension-e2e-anki-dedupe-report.html');
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

    /** @type {import('selenium-webdriver').ThenableWebDriver|null} */
    let driver = null;
    /** @type {Error|undefined} */
    let runError;
    try {
        driver = /** @type {import('selenium-webdriver').ThenableWebDriver} */ (
            new Builder()
                .forBrowser(Browser.FIREFOX)
                .setFirefoxOptions(firefoxOptions)
                .build()
        );

        const temporaryAddonInstall = String(process.env.MANABITAN_FIREFOX_TEMPORARY_ADDON ?? '1').trim() !== '0';
        const installedAddonId = await driver.installAddon(addonPath, temporaryAddonInstall);
        const extensionBaseUrl = await waitForExtensionBaseUrl(driver, String(installedAddonId || ''));
        report.extensionBaseUrl = extensionBaseUrl;

        await importDictionaryFixture(driver, extensionBaseUrl);

        const matrix = getAnkiDedupeMatrix();
        for (const scenario of matrix) {
            const startedAt = safePerformance.now();
            try {
                mockState.beginScenario(scenario.id, scenario.seedNotes);
                await applyScenarioOptions(driver, localServer.ankiConnectUrl, scenario.options);
                await openSearchAndLookup(driver, extensionBaseUrl);
                const observedButtonState = await waitForExpectedButtonState(driver, scenario.expected.button);
                const clickAttempted = !observedButtonState.disabled;
                if (clickAttempted) {
                    await clickSaveButton(driver);
                    await driver.sleep(800);
                } else {
                    await driver.sleep(300);
                }
                const scenarioState = mockState.getScenarioState();
                const writeActions = getWriteActions(scenarioState);
                const pass = isExpectedWriteAction(scenario.expected.writeAction, writeActions);
                const endedAt = safePerformance.now();
                report.scenarios.push({
                    id: scenario.id,
                    description: scenario.description,
                    pass,
                    durationMs: Math.max(0, endedAt - startedAt),
                    expected: scenario.expected,
                    observed: {
                        button: observedButtonState,
                        clickAttempted,
                        writeActions,
                    },
                    actionLog: scenarioState.actions,
                    snapshots: scenarioState.snapshots,
                });
                console.log(`${logTag} scenario ${scenario.id} => ${pass ? 'PASS' : 'FAIL'}`);
            } catch (scenarioError) {
                const scenarioState = mockState.getScenarioState();
                const endedAt = safePerformance.now();
                report.scenarios.push({
                    id: scenario.id,
                    description: scenario.description,
                    pass: false,
                    durationMs: Math.max(0, endedAt - startedAt),
                    expected: scenario.expected,
                    observed: {
                        error: errorMessage(scenarioError),
                        writeActions: getWriteActions(scenarioState),
                    },
                    actionLog: scenarioState.actions,
                    snapshots: scenarioState.snapshots,
                });
                console.log(`${logTag} scenario ${scenario.id} => FAIL (${errorMessage(scenarioError)})`);
            }
        }

        if (report.scenarios.some((item) => item.pass !== true)) {
            const failedIds = report.scenarios.filter((item) => item.pass !== true).map((item) => item.id);
            fail(`Dedupe matrix failures: ${JSON.stringify(failedIds)}`);
        }
        report.status = 'success';
    } catch (e) {
        report.status = 'failure';
        report.failureReason = errorMessage(e);
        runError = new Error(`${logTag} ${report.failureReason}`);
    } finally {
        report.finishedAtIso = new Date().toISOString();
        try {
            await mkdir(path.dirname(reportPath), {recursive: true});
            await writeFile(reportPath, renderReportHtml(report), 'utf8');
            await writeFile(reportJsonPath, JSON.stringify(report, null, 2), 'utf8');
            await writeCombinedTabbedReport({
                chromiumReportPath,
                firefoxReportPath: reportPath,
                outputPath: combinedReportPath,
            });
            console.log(`${logTag} wrote report: ${reportPath}`);
            console.log(`${logTag} wrote report json: ${reportJsonPath}`);
            console.log(`${logTag} wrote combined report: ${combinedReportPath}`);
        } catch (reportError) {
            console.error(`${logTag} failed to write report: ${errorMessage(reportError)}`);
        }

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
