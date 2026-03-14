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

import {chromium} from '@playwright/test';
import {createHash} from 'node:crypto';
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {mkdir, rm, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {safePerformance} from '../../ext/js/core/safe-performance.js';
import {ManifestUtil} from '../../dev/manifest-util.js';
import {applyAnkiDedupeOptions, dedupeDictionaryTitle, dedupeSearchTerm, getAnkiDedupeMatrix, normalizeExpectedButtonState} from '../e2e/anki-dedupe-matrix.js';
import {startAnkiMockHttpServer} from '../e2e/anki-mock-http-server.js';
import {createAnkiMockState} from '../e2e/anki-mock-state.js';
import {getMinimalDictionaryDatabaseBase64} from '../e2e/minimal-dictionary-database.js';
import {writeCombinedTabbedReport} from '../e2e/report-tabs.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(dirname, '..', '..');
const extensionPath = path.join(root, 'ext');
const manifestPath = path.join(extensionPath, 'manifest.json');
const logTag = '[chromium-anki-dedupe-e2e]';

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
 * @returns {string | null}
 */
function getConfiguredExtensionId() {
    if (!existsSync(manifestPath)) {
        return null;
    }

    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    if (typeof manifest?.key !== 'string' || manifest.key.length === 0) {
        return null;
    }

    const hash = createHash('sha256')
        .update(Buffer.from(manifest.key, 'base64'))
        .digest('hex')
        .slice(0, 32);
    return [...hash].map((character) => String.fromCharCode('a'.charCodeAt(0) + Number.parseInt(character, 16))).join('');
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
  <title>Chromium Anki Deduplication E2E Report</title>
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
  <h1>Chromium Anki Deduplication E2E Report</h1>
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
    const value = String(process.env.MANABITAN_CHROMIUM_HEADLESS ?? (process.platform === 'win32' ? '0' : '1')).trim().toLowerCase();
    return !(value === '0' || value === 'false' || value === 'no');
}

/**
 * @returns {boolean}
 */
function shouldHideWindow() {
    const value = String(process.env.MANABITAN_CHROMIUM_HIDE_WINDOW ?? (process.platform === 'win32' ? '1' : '0')).trim().toLowerCase();
    return !(value === '0' || value === 'false' || value === 'no');
}

/**
 * @returns {Promise<{context: import('@playwright/test').BrowserContext, cleanup: () => Promise<void>}>}
 */
async function launchExtensionContext() {
    const originalManifest = existsSync(manifestPath) ? readFileSync(manifestPath, 'utf8') : null;
    const manifestUtil = new ManifestUtil();
    const variant = manifestUtil.getManifest('chrome-playwright');
    writeFileSync(
        manifestPath,
        ManifestUtil.createManifestString(variant).replace('$YOMITAN_VERSION', '0.0.0.0'),
        'utf8',
    );

    const headless = shouldRunHeadless();
    /** @type {string[]} */
    const args = [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
    ];
    if (!headless && shouldHideWindow()) {
        args.push('--window-position=3000,3000', '--window-size=1280,800', '--start-minimized');
    }

    const context = await chromium.launchPersistentContext('', {
        headless,
        args,
    });

    return {
        context,
        cleanup: async () => {
            await context.close();
            if (originalManifest === null) {
                await rm(manifestPath, {force: true});
            } else {
                writeFileSync(manifestPath, originalManifest, 'utf8');
            }
        },
    };
}

/**
 * @param {import('@playwright/test').BrowserContext} context
 * @returns {Promise<string>}
 */
async function discoverExtensionId(context) {
    const configuredExtensionId = getConfiguredExtensionId();
    if (configuredExtensionId !== null) {
        return configuredExtensionId;
    }

    const parseId = (url) => {
        const match = /^chrome-extension:\/\/([^/]+)\//.exec(String(url));
        return match ? match[1] : null;
    };

    for (const worker of context.serviceWorkers()) {
        const id = parseId(worker.url());
        if (id !== null) {
            return id;
        }
    }
    await context.waitForEvent('serviceworker', {timeout: 15_000});
    for (const worker of context.serviceWorkers()) {
        const id = parseId(worker.url());
        if (id !== null) {
            return id;
        }
    }
    fail('Unable to discover extension id');
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} url
 * @param {string} readySelector
 * @returns {Promise<void>}
 */
async function gotoExtensionPage(page, url, readySelector) {
    let lastError;
    for (let attempt = 1; attempt <= 10; ++attempt) {
        try {
            await page.goto(url);
            await page.waitForSelector(readySelector, {state: 'attached', timeout: 30_000});
            return;
        } catch (error) {
            lastError = error;
            if (!String(errorMessage(error)).includes('ERR_ABORTED') || attempt >= 10) {
                throw error;
            }
            await page.waitForTimeout(500);
        }
    }
    throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} action
 * @param {Record<string, unknown>|undefined} params
 * @returns {Promise<unknown>}
 */
async function sendRuntimeMessage(page, action, params = void 0) {
    return await page.evaluate(async ({actionName, paramsValue}) => {
        return await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({action: actionName, params: paramsValue}, (response) => {
                const runtimeError = chrome.runtime.lastError;
                if (runtimeError) {
                    reject(new Error(runtimeError.message || String(runtimeError)));
                    return;
                }
                if (response && typeof response === 'object' && 'error' in response) {
                    reject(new Error(JSON.stringify(response.error)));
                    return;
                }
                resolve(response && typeof response === 'object' ? response.result : response);
            });
        });
    }, {actionName: action, paramsValue: params});
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} extensionBaseUrl
 * @returns {Promise<void>}
 */
async function importDictionaryFixture(page, extensionBaseUrl) {
    await gotoExtensionPage(page, `${extensionBaseUrl}/settings.html`, '#dictionary-import-file-input');
    await sendRuntimeMessage(page, 'purgeDatabase', void 0);
    await sendRuntimeMessage(page, 'importDictionaryDatabase', {content: await getMinimalDictionaryDatabaseBase64()});
    await sendRuntimeMessage(page, 'triggerDatabaseUpdated', {type: 'dictionary', cause: 'import'});
    const deadline = safePerformance.now() + 60_000;
    while (safePerformance.now() < deadline) {
        const dictionaryInfo = /** @type {Array<{title: string}>} */ (await sendRuntimeMessage(page, 'getDictionaryInfo', void 0));
        if (Array.isArray(dictionaryInfo) && dictionaryInfo.some((item) => String(item?.title || '') === dedupeDictionaryTitle)) {
            return;
        }
        await page.waitForTimeout(200);
    }
    fail(`Timed out waiting for dictionary import: ${dedupeDictionaryTitle}`);
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} ankiConnectUrl
 * @param {import('../e2e/anki-dedupe-matrix.js').DedupeScenarioOptions} scenarioOptions
 * @returns {Promise<void>}
 */
async function applyScenarioOptions(page, ankiConnectUrl, scenarioOptions) {
    const optionsFull = /** @type {import('settings').Options} */ (await sendRuntimeMessage(page, 'optionsGetFull', void 0));
    applyAnkiDedupeOptions(optionsFull, ankiConnectUrl, scenarioOptions);
    await sendRuntimeMessage(page, 'setAllSettings', {value: optionsFull, source: 'chromium-anki-dedupe-e2e'});
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} extensionBaseUrl
 * @returns {Promise<void>}
 */
async function openSearchAndLookup(page, extensionBaseUrl) {
    await gotoExtensionPage(page, `${extensionBaseUrl}/search.html`, '#search-textbox');
    await page.fill('#search-textbox', dedupeSearchTerm);
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => {
        const entry = document.querySelector('.entry');
        if (entry instanceof HTMLElement) { return true; }
        const noResults = document.querySelector('#no-results');
        return noResults instanceof HTMLElement && !noResults.hidden;
    }, {timeout: 30_000});
    const hasEntry = await page.evaluate(() => document.querySelector('.entry') instanceof HTMLElement);
    if (!hasEntry) {
        fail(`Search returned no entry for fixture term: ${dedupeSearchTerm}`);
    }
}

/**
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<{ready: boolean, disabled: boolean, title: string, icon: string, overwrite: boolean, viewNoteIds: string|null}>}
 */
async function getSaveButtonState(page) {
    return await page.evaluate(() => {
        const saveButton = document.querySelector('.entry .note-actions-container .action-button[data-action="save-note"]');
        if (!(saveButton instanceof HTMLButtonElement)) {
            return {ready: false, disabled: true, title: '', icon: '', overwrite: false, viewNoteIds: null};
        }
        const iconNode = saveButton.querySelector('.action-icon');
        const icon = iconNode instanceof HTMLElement ? String(iconNode.dataset.icon || '') : '';
        const actionContainer = saveButton.closest('.action-button-container');
        const viewButton = actionContainer?.querySelector('.action-button[data-action="view-note"]');
        const viewNoteIdsRaw = viewButton instanceof HTMLElement ? String(viewButton.dataset.noteIds || '') : '';
        const viewNoteIds = viewNoteIdsRaw.trim().length > 0 ? viewNoteIdsRaw.trim().split(/\s+/).join(' ') : null;
        return {
            ready: true,
            disabled: saveButton.disabled,
            title: String(saveButton.title || ''),
            icon,
            overwrite: saveButton.dataset.overwrite === 'true',
            viewNoteIds,
        };
    });
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {import('../e2e/anki-dedupe-matrix.js').DedupeExpectedButtonState} expectedState
 * @param {number} [timeoutMs]
 * @returns {Promise<{ready: boolean, disabled: boolean, title: string, icon: string, overwrite: boolean, viewNoteIds: string|null}>}
 */
async function waitForExpectedButtonState(page, expectedState, timeoutMs = 15_000) {
    const expected = normalizeExpectedButtonState(expectedState);
    const deadline = safePerformance.now() + timeoutMs;
    let lastState = await getSaveButtonState(page);
    while (safePerformance.now() < deadline) {
        lastState = await getSaveButtonState(page);
        if (
            lastState.ready &&
            lastState.disabled === expected.disabled &&
            (typeof expected.title === 'undefined' || lastState.title === expected.title) &&
            (typeof expected.icon === 'undefined' || lastState.icon === expected.icon) &&
            (typeof expected.overwrite === 'undefined' || lastState.overwrite === expected.overwrite) &&
            (typeof expected.viewNoteIds === 'undefined' || lastState.viewNoteIds === expected.viewNoteIds)
        ) {
            return lastState;
        }
        await page.waitForTimeout(200);
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
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<void>}
 */
async function clickSaveButton(page) {
    await page.click('.entry .note-actions-container .action-button[data-action="save-note"]');
}

/**
 * @returns {Promise<void>}
 */
async function main() {
    const report = createReport();
    const reportPath = process.env.MANABITAN_CHROMIUM_ANKI_DEDUPE_REPORT ?? path.join(root, 'builds', 'chromium-e2e-anki-dedupe-report.html');
    const reportJsonPath = reportPath.replace(/\.html$/i, '.json');
    const firefoxReportPath = path.join(root, 'builds', 'firefox-e2e-anki-dedupe-report.html');
    const combinedReportPath = path.join(root, 'builds', 'extension-e2e-anki-dedupe-report.html');
    const mockState = createAnkiMockState();
    const localServer = await startAnkiMockHttpServer(mockState);
    report.ankiConnectUrl = localServer.ankiConnectUrl;

    let cleanup = null;
    /** @type {Error|undefined} */
    let runError;
    try {
        const launched = await launchExtensionContext();
        cleanup = launched.cleanup;
        const {context} = launched;

        for (const page of context.pages()) {
            if (page.url().endsWith('/welcome.html')) {
                await page.close();
            }
        }

        const extensionId = await discoverExtensionId(context);
        const extensionBaseUrl = `chrome-extension://${extensionId}`;
        report.extensionBaseUrl = extensionBaseUrl;
        const page = context.pages()[0] ?? await context.newPage();

        await importDictionaryFixture(page, extensionBaseUrl);

        const matrix = getAnkiDedupeMatrix();
        for (const scenario of matrix) {
            const startedAt = safePerformance.now();
            try {
                mockState.beginScenario(scenario.id, scenario.seedNotes);
                await applyScenarioOptions(page, localServer.ankiConnectUrl, scenario.options);
                await openSearchAndLookup(page, extensionBaseUrl);
                const observedButtonState = await waitForExpectedButtonState(page, scenario.expected.button);
                const clickAttempted = !observedButtonState.disabled;
                if (clickAttempted) {
                    await clickSaveButton(page);
                    await page.waitForTimeout(800);
                } else {
                    await page.waitForTimeout(300);
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
                chromiumReportPath: reportPath,
                firefoxReportPath,
                outputPath: combinedReportPath,
            });
            console.log(`${logTag} wrote report: ${reportPath}`);
            console.log(`${logTag} wrote report json: ${reportJsonPath}`);
            console.log(`${logTag} wrote combined report: ${combinedReportPath}`);
        } catch (reportError) {
            console.error(`${logTag} failed to write report: ${errorMessage(reportError)}`);
        }
        try {
            await localServer.close();
        } catch (_) {
            // Ignore close errors.
        }
        if (cleanup !== null) {
            try {
                await cleanup();
            } catch (_) {
                // Ignore cleanup errors.
            }
        }
    }

    if (runError) {
        throw runError;
    }
}

await main();
