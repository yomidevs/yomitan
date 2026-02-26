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

import {access, mkdir, mkdtemp, readFile, writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Builder, Browser, By, until} from 'selenium-webdriver';
import * as firefox from 'selenium-webdriver/firefox.js';
import {createDictionaryArchiveData} from '../../dev/dictionary-archive-util.js';
import {safePerformance} from '../../ext/js/core/safe-performance.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(dirname, '..', '..');

/**
 * @param {string} message
 * @throws {Error}
 */
function fail(message) {
    throw new Error(`[firefox-e2e] ${message}`);
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function errorMessage(value) {
    return value instanceof Error ? value.message : String(value);
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
        .replaceAll("'", '&#39;');
}

/**
 * @param {number} valueMs
 * @returns {string}
 */
function formatDuration(valueMs) {
    return `${valueMs.toFixed(1)} ms`;
}

/**
 * @typedef {{
 *   name: string,
 *   details: string,
 *   startMs: number,
 *   endMs: number,
 *   durationMs: number,
 *   screenshotBase64: string,
 *   screenshotMimeType: string
 * }} ReportPhase
 */

/**
 * @typedef {{
 *   startedAtIso: string,
 *   status: 'running'|'success'|'failure',
 *   failureReason: string,
 *   phases: ReportPhase[]
 * }} E2EReport
 */

/**
 * @returns {E2EReport}
 */
function createReport() {
    return {
        startedAtIso: new Date().toISOString(),
        status: 'running',
        failureReason: '',
        phases: [],
    };
}

/**
 * @param {E2EReport} report
 * @param {import('selenium-webdriver').ThenableWebDriver} driver
 * @param {string} name
 * @param {string} details
 * @param {number} startMs
 * @param {number} endMs
 * @returns {Promise<void>}
 */
async function addReportPhase(report, driver, name, details, startMs, endMs) {
    console.log(`[firefox-e2e] phase: ${name} (${formatDuration(Math.max(0, endMs - startMs))})`);
    const screenshotBase64 = String(await driver.takeScreenshot());
    report.phases.push({
        name,
        details,
        startMs,
        endMs,
        durationMs: Math.max(0, endMs - startMs),
        screenshotBase64,
        screenshotMimeType: 'image/png',
    });
}

/**
 * @param {E2EReport} report
 * @returns {string}
 */
function renderReportHtml(report) {
    const isFailure = report.status === 'failure';
    let failureBanner = '';
    if (isFailure) {
        failureBanner = `
  <div class="failure-banner">
    <div class="failure-banner-title">FAILED</div>
    <div class="failure-banner-reason">${escapeHtml(report.failureReason || 'Unknown failure')}</div>
  </div>`
    }
    const rows = report.phases.map((phase, index) => {
        const imageUrl = `data:${phase.screenshotMimeType};base64,${phase.screenshotBase64}`;
        return `
            <section class="phase">
                <h2>Phase ${index + 1}: ${escapeHtml(phase.name)}</h2>
                <p><strong>Duration:</strong> ${escapeHtml(formatDuration(phase.durationMs))}</p>
                <p><strong>Details:</strong> ${escapeHtml(phase.details)}</p>
                <img src="${imageUrl}" alt="${escapeHtml(phase.name)} screenshot">
            </section>
        `;
    }).join('\n');

    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Manabitan Firefox E2E Import Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif; margin: 24px; color: #1d1d1f; }
    h1 { margin-bottom: 8px; }
    .meta { margin-bottom: 24px; padding: 12px 14px; border-radius: 8px; background: #f5f7fa; }
    .failure-banner { margin: 0 0 18px; padding: 14px 16px; border-radius: 10px; border: 2px solid #ef4444; background: #fee2e2; color: #991b1b; }
    .failure-banner-title { font-size: 26px; font-weight: 800; letter-spacing: 0.3px; margin-bottom: 4px; }
    .failure-banner-reason { font-size: 14px; font-weight: 600; white-space: pre-wrap; }
    .phase { margin: 0 0 28px; padding: 14px; border: 1px solid #d8dee4; border-radius: 10px; }
    .phase h2 { margin: 0 0 8px; font-size: 18px; }
    .phase p { margin: 6px 0; }
    img { margin-top: 10px; max-width: 100%; border: 1px solid #d8dee4; border-radius: 8px; }
  </style>
</head>
<body>
  <h1>Manabitan Firefox E2E Import Report</h1>
  ${failureBanner}
  <div class="meta">
    <div><strong>Started:</strong> ${escapeHtml(report.startedAtIso)}</div>
    <div><strong>Status:</strong> ${escapeHtml(report.status)}</div>
    <div><strong>Failure reason:</strong> ${escapeHtml(report.failureReason || 'none')}</div>
    <div><strong>Recorded phases:</strong> ${report.phases.length}</div>
  </div>
  ${rows}
</body>
</html>`;
}

/**
 * @param {import('selenium-webdriver').ThenableWebDriver} driver
 * @returns {Promise<string>}
 */
async function getImportProgressLabel(driver) {
    // Selenium executeScript return value is untyped (`any`).
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const value = await driver.executeScript(`
        const selectors = [
            '#recommended-dictionaries-modal .dictionary-import-progress',
            '#dictionaries-modal .dictionary-import-progress'
        ];
        for (const selector of selectors) {
            const container = document.querySelector(selector);
            if (!(container instanceof HTMLElement) || container.hidden) { continue; }
            const label = container.querySelector('.progress-info');
            if (!(label instanceof HTMLElement)) { continue; }
            const text = (label.textContent || '').trim();
            if (text.length > 0) { return text; }
        }
        return '';
    `);
    return typeof value === 'string' ? value : '';
}

/**
 * @param {import('selenium-webdriver').ThenableWebDriver} driver
 * @returns {Promise<string>}
 */
async function getDictionaryCountsText(driver) {
    const installCount = String(await (await driver.findElement(By.css('#dictionary-install-count'))).getText());
    const enabledCount = String(await (await driver.findElement(By.css('#dictionary-enabled-count'))).getText());
    return `${installCount} installed, ${enabledCount} enabled`;
}

/**
 * @param {import('selenium-webdriver').ThenableWebDriver} driver
 * @returns {Promise<string>}
 */
async function getDictionaryErrorText(driver) {
    // Selenium executeScript return value is untyped (`any`).
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const value = await driver.executeScript(`
        const node = document.querySelector('#dictionary-error');
        if (!(node instanceof HTMLElement) || node.hidden) { return ''; }
        return (node.textContent || '').trim();
    `);
    return typeof value === 'string' ? value : '';
}

/**
 * @param {import('selenium-webdriver').ThenableWebDriver} driver
 * @returns {Promise<Record<string, unknown>|null>}
 */
async function getLastImportDebug(driver) {
    // Selenium executeScript return value is untyped (`any`).
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const value = await driver.executeScript('return globalThis.__manabitanLastImportDebug ?? null;');
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        return /** @type {Record<string, unknown>} */ (value);
    }
    return null;
}

/**
 * @param {import('selenium-webdriver').ThenableWebDriver} driver
 * @returns {Promise<string[]>}
 */
async function getMockSeenUrls(driver) {
    // Selenium executeScript return value is untyped (`any`).
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const value = await driver.executeScript('return Array.isArray(globalThis.__manabitanMockSeenUrls) ? globalThis.__manabitanMockSeenUrls.slice(-8) : [];');
    return Array.isArray(value) ? value.map(String) : [];
}

/**
 * @param {import('selenium-webdriver').ThenableWebDriver} driver
 * @param {E2EReport} report
 * @param {string} dictionaryName
 * @param {string} expectedCounts
 * @param {number} timeoutMs
 * @returns {Promise<void>}
 */
async function waitForImportWithPhaseScreenshots(driver, report, dictionaryName, expectedCounts, timeoutMs) {
    const importStartTime = safePerformance.now();
    let previousLabel = '';
    let previousLabelStart = importStartTime;
    const deadline = importStartTime + timeoutMs;
    let sawStepText = false;
    let clearedAfterStep = false;
    let emptySince = null;
    const emptyStabilityMs = 2_000;

    while (safePerformance.now() < deadline) {
        const now = safePerformance.now();
        const immediateError = await getDictionaryErrorText(driver);
        if (immediateError.length > 0) {
            fail(`${dictionaryName} import reported error before completion: ${immediateError}`);
        }
        const currentLabel = await getImportProgressLabel(driver);
        if (currentLabel.includes('Step ')) {
            sawStepText = true;
            emptySince = null;
        }
        if (currentLabel.length > 0 && currentLabel !== previousLabel) {
            if (previousLabel.length > 0) {
                await addReportPhase(
                    report,
                    driver,
                    `${dictionaryName}: ${previousLabel}`,
                    `${dictionaryName} import progress phase`,
                    previousLabelStart,
                    now,
                );
            }
            previousLabel = currentLabel;
            previousLabelStart = now;
        }

        if (sawStepText && currentLabel.length === 0) {
            emptySince ??= now;
            if ((now - emptySince) >= emptyStabilityMs) {
                clearedAfterStep = true;
                if (previousLabel.length > 0) {
                    await addReportPhase(
                        report,
                        driver,
                        `${dictionaryName}: ${previousLabel}`,
                        `${dictionaryName} import progress phase`,
                        previousLabelStart,
                        now,
                    );
                }
                await addReportPhase(
                    report,
                    driver,
                    `${dictionaryName}: total import`,
                    `Progress text stayed empty for ${String(emptyStabilityMs)}ms after Step text appeared. Expected counts target for this phase: ${expectedCounts}. Current counts=${await getDictionaryCountsText(driver)} dictionary-error="${await getDictionaryErrorText(driver)}" import-debug=${JSON.stringify(await getLastImportDebug(driver))} mock-urls=${JSON.stringify(await getMockSeenUrls(driver))}`,
                    importStartTime,
                    now,
                );
                const importErrorText = await getDictionaryErrorText(driver);
                if (importErrorText.length > 0) {
                    fail(`${dictionaryName} import reported error: ${importErrorText}`);
                }
                return;
            }
        } else if (currentLabel.length > 0) {
            emptySince = null;
        }

        await driver.sleep(250);
    }

    const countsText = await getDictionaryCountsText(driver);
    const errorText = await getDictionaryErrorText(driver);
    fail(`Timed out waiting for ${dictionaryName} completion. sawStepText=${String(sawStepText)} clearedAfterStep=${String(clearedAfterStep)}. Last label="${previousLabel}" counts=${countsText} dictionary-error="${errorText}"`);
}

/**
 * @param {import('selenium-webdriver').ThenableWebDriver} driver
 * @returns {Promise<string>}
 * @throws {Error}
 */
async function waitForExtensionBaseUrl(driver) {
    const deadline = Date.now() + 30_000;
    while (Date.now() < deadline) {
        const handlesUnknown = /** @type {unknown} */ (await driver.getAllWindowHandles());
        const handles = Array.isArray(handlesUnknown) ? handlesUnknown.map(String) : [];
        for (const handle of handles) {
            await driver.switchTo().window(handle);
            const url = String(await driver.getCurrentUrl());
            const match = /^(moz-extension:\/\/[^/]+)\//.exec(url);
            if (match !== null) {
                return match[1];
            }
        }
        await driver.sleep(500);
    }
    fail('Failed to discover moz-extension base URL from open tabs.');
}

/**
 * @param {import('selenium-webdriver').ThenableWebDriver} driver
 * @param {string} selector
 * @returns {Promise<void>}
 */
async function clickWithScroll(driver, selector) {
    // Selenium's JS-only API surfaces `any` for located elements.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const element = await driver.findElement(By.css(selector));
    await driver.executeScript(`
        const element = arguments[0];
        if (!(element instanceof HTMLElement)) {
            throw new Error('Expected an HTMLElement');
        }
        element.scrollIntoView({block: 'center', inline: 'nearest'});
        element.click();
    `, element);
}

/**
 * @param {string} tempDir
 * @param {string} title
 * @param {string} outputPath
 * @param {string} [term]
 * @returns {Promise<void>}
 */
async function buildDictionaryZip(tempDir, title, outputPath, term = '打') {
    void tempDir;
    void term;
    const fixtureDictionaryDir = path.join(root, 'test', 'data', 'dictionaries', 'valid-dictionary1');
    const data = await createDictionaryArchiveData(fixtureDictionaryDir, title);
    await writeFile(outputPath, Buffer.from(data));
}

/**
 * @param {import('selenium-webdriver').ThenableWebDriver} driver
 * @param {string} dictionaryName
 * @returns {Promise<string>}
 */
async function installRecommendedDictionary(driver, dictionaryName) {
    await clickWithScroll(driver, '.settings-item[data-modal-action="show,recommended-dictionaries"]');
    await driver.wait(until.elementLocated(By.css('#recommended-dictionaries-modal')), 30_000);
    await driver.wait(async () => {
        // Selenium's executeScript return value is untyped (`any`).
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const names = await driver.executeScript(`
            return Array.from(document.querySelectorAll('#recommended-dictionaries-modal .settings-item-label'))
                .map((node) => (node.textContent || '').trim());
        `);
        return Array.isArray(names) && names.includes(dictionaryName);
    }, 30_000, `Expected recommended dictionary to render: ${dictionaryName}`);
    // Selenium executeScript return value is untyped (`any`).
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const importUrl = await driver.executeScript(`
        const dictionaryName = arguments[0];
        const items = Array.from(document.querySelectorAll('#recommended-dictionaries-modal .settings-item'));
        const item = items.find((currentItem) => {
            const labelNode = currentItem.querySelector('.settings-item-label');
            return (labelNode && (labelNode.textContent || '').trim() === dictionaryName);
        });
        if (!(item instanceof HTMLElement)) {
            throw new Error(\`Recommended dictionary not found: \${dictionaryName}\`);
        }
        const button = item.querySelector('button[data-action="import-recommended-dictionary"]');
        if (!(button instanceof HTMLButtonElement)) {
            throw new Error(\`Recommended dictionary button not found: \${dictionaryName}\`);
        }
        const importUrl = button.getAttribute('data-import-url') || '';
        button.scrollIntoView({block: 'center', inline: 'nearest'});
        button.click();
        return importUrl;
    `, dictionaryName);
    const normalizedImportUrl = typeof importUrl === 'string' ? importUrl : '';
    console.log(`[firefox-e2e] recommended ${dictionaryName} import-url: ${normalizedImportUrl}`);
    return normalizedImportUrl;
}

/**
 * @param {import('selenium-webdriver').ThenableWebDriver} driver
 * @param {string} modalSelector
 * @returns {Promise<void>}
 */
async function closeModalIfOpen(driver, modalSelector) {
    await driver.executeScript(`
        const modal = document.querySelector(arguments[0]);
        if (!(modal instanceof HTMLElement) || modal.hidden) { return; }
        const closeButton = modal.querySelector('[data-modal-action="hide"]');
        if (closeButton instanceof HTMLElement) {
            closeButton.click();
        }
    `, modalSelector);
    await driver.wait(async () => {
        // Selenium executeScript return value is untyped (`any`).
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const hidden = await driver.executeScript(`
            const modal = document.querySelector(arguments[0]);
            return (modal instanceof HTMLElement) ? modal.hidden : true;
        `, modalSelector);
        return hidden === true;
    }, 15_000, `Expected modal to be hidden: ${modalSelector}`);
}

/**
 * @param {import('selenium-webdriver').ThenableWebDriver} driver
 * @returns {Promise<string>}
 */
async function openInstalledDictionariesModal(driver) {
    // Selenium executeScript return value is untyped (`any`).
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const triggerDescription = await driver.executeScript(`
        const isHidden = (element) => {
            if (!(element instanceof HTMLElement)) { return true; }
            if (element.hidden) { return true; }
            const style = getComputedStyle(element);
            return style.display === 'none' || style.visibility === 'hidden';
        };
        const clickElement = (element) => {
            if (!(element instanceof HTMLElement)) { return false; }
            element.scrollIntoView({block: 'center', inline: 'nearest'});
            element.click();
            return true;
        };

        const settingsTrigger = Array.from(document.querySelectorAll('.settings-item[data-modal-action="show,dictionaries"]')).find((item) => {
            if (!(item instanceof HTMLElement)) { return false; }
            if (isHidden(item)) { return false; }
            const label = item.querySelector('.settings-item-label');
            const text = (label?.textContent || '').trim();
            return text.includes('Configure installed and enabled dictionaries');
        });
        if (settingsTrigger && clickElement(settingsTrigger)) {
            return 'settings-item:Configure installed and enabled dictionaries';
        }

        throw new Error('Unable to find installed dictionaries modal trigger');
    `);
    await driver.wait(async () => {
        // Selenium executeScript return value is untyped (`any`).
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const open = await driver.executeScript(`
            const dictionariesModal = document.querySelector('#dictionaries-modal');
            const recommendedModal = document.querySelector('#recommended-dictionaries-modal');
            const dictionariesOpen = dictionariesModal instanceof HTMLElement && !dictionariesModal.hidden;
            const recommendedClosed = !(recommendedModal instanceof HTMLElement) || recommendedModal.hidden;
            let hasCheckForUpdatesButton = false;
            if (dictionariesOpen) {
                const footerButtons = Array.from(dictionariesModal.querySelectorAll('.modal-footer button'));
                hasCheckForUpdatesButton = footerButtons.some((button) => {
                    const text = (button.textContent || '').trim();
                    return text === 'Check for Updates';
                });
            }
            return dictionariesOpen && recommendedClosed && hasCheckForUpdatesButton;
        `);
        return open === true;
    }, 30_000, 'Expected installed dictionaries modal to open with Check for Updates button');
    return typeof triggerDescription === 'string' ? triggerDescription : 'unknown-trigger';
}

/**
 * @param {import('selenium-webdriver').ThenableWebDriver} driver
 * @param {string} extensionBaseUrl
 * @returns {Promise<void>}
 */
async function openSearchPageViaActionPopup(driver, extensionBaseUrl) {
    await driver.get(`${extensionBaseUrl}/action-popup.html`);
    await driver.wait(async () => {
        // Selenium executeScript return value is untyped (`any`).
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const loaded = await driver.executeScript('return document.body?.dataset?.loaded === "true";');
        return loaded === true;
    }, 30_000, 'Expected action popup to finish loading');
    await driver.wait(until.elementLocated(By.css('.action-open-search')), 30_000);
    await driver.executeScript(`
        const button = document.querySelector('.action-open-search');
        if (!(button instanceof HTMLElement)) {
            throw new Error('Search button not found in action popup');
        }
        button.scrollIntoView({block: 'center', inline: 'nearest'});
        button.dispatchEvent(new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            composed: true,
            button: 0,
            shiftKey: true,
        }));
    `);
    await driver.wait(async () => {
        const url = String(await driver.getCurrentUrl());
        return /\/search\.html(?:\?|$)/.test(url);
    }, 30_000, 'Expected search page to open from action popup magnifier');
    await driver.wait(until.elementLocated(By.css('#search-textbox')), 30_000);
}

/**
 * @param {import('selenium-webdriver').ThenableWebDriver} driver
 * @param {string} term
 * @param {string[]} expectedDictionaryNames
 * @returns {Promise<Record<string, number>>}
 */
async function searchTermAndGetDictionaryHitCounts(driver, term, expectedDictionaryNames) {
    await driver.wait(async () => {
        // Selenium executeScript return value is untyped (`any`).
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const submitted = await driver.executeScript(`
            const textbox = document.querySelector('#search-textbox');
            const searchButton = document.querySelector('#search-button');
            if (!(textbox instanceof HTMLTextAreaElement)) { return false; }
            textbox.value = '';
            textbox.dispatchEvent(new Event('input', {bubbles: true, cancelable: true}));
            textbox.value = String(arguments[0] || '');
            textbox.dispatchEvent(new Event('input', {bubbles: true, cancelable: true}));
            textbox.dispatchEvent(new KeyboardEvent('keydown', {
                bubbles: true,
                cancelable: true,
                key: 'Enter',
                code: 'Enter',
            }));
            if (searchButton instanceof HTMLElement) {
                searchButton.dispatchEvent(new MouseEvent('click', {
                    bubbles: true,
                    cancelable: true,
                    composed: true,
                    button: 0,
                }));
            }
            return true;
        `, term);
        return submitted === true;
    }, 30_000, 'Expected search textbox and button to be available on search page');

    const deadline = safePerformance.now() + 60_000;
    /** @type {Record<string, number>} */
    let lastCounts = Object.fromEntries(expectedDictionaryNames.map((name) => [name, 0]));
    while (safePerformance.now() < deadline) {
        // Selenium executeScript return value is untyped (`any`).
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const counts = await driver.executeScript(`
            const dictionaryEntries = document.querySelector('#dictionary-entries');
            if (!(dictionaryEntries instanceof HTMLElement)) {
                return {};
            }
            const countMap = Object.create(null);
            const dictionaryNodes = dictionaryEntries.querySelectorAll('.definition-item[data-dictionary], .entry [data-dictionary]');
            for (const node of dictionaryNodes) {
                const dictionary = node instanceof HTMLElement ? (node.dataset.dictionary || '').trim() : '';
                if (dictionary.length === 0) { continue; }
                countMap[dictionary] = (countMap[dictionary] || 0) + 1;
            }
            // Fallback: if selectors differ, infer by visible dictionary labels in result text.
            const text = (dictionaryEntries.textContent || '');
            for (const name of arguments[0]) {
                if (countMap[name]) { continue; }
                const matchCount = text.length > 0 && name.length > 0 ? Math.max(0, text.split(name).length - 1) : 0;
                if (matchCount > 0) {
                    countMap[name] = matchCount;
                }
            }
            return countMap;
        `, expectedDictionaryNames);
        if (typeof counts === 'object' && counts !== null) {
            // Selenium executeScript return value is untyped (`any`).
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const countRecord = /** @type {Record<string, unknown>} */ (counts);
            const normalizedCounts = /** @type {Record<string, number>} */ ({});
            for (const [key, value] of Object.entries(countRecord)) {
                normalizedCounts[String(key)] = Number(value);
            }
            lastCounts = Object.fromEntries(expectedDictionaryNames.map((name) => [name, normalizedCounts[name] ?? 0]));
            if (expectedDictionaryNames.every((name) => (lastCounts[name] ?? 0) >= 1)) {
                return lastCounts;
            }
        }
        await driver.sleep(250);
    }

    return lastCounts;
}

/**
 * @param {import('selenium-webdriver').ThenableWebDriver} driver
 * @param {string} term
 * @returns {Promise<Record<string, unknown>>}
 */
async function getBackendLookupDiagnostics(driver, term) {
    // Selenium executeAsyncScript return value is untyped (`any`).
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const diagnostics = await driver.executeAsyncScript(`
        const done = arguments[arguments.length - 1];
        const send = (action, params) => new Promise((resolve, reject) => {
            try {
                chrome.runtime.sendMessage({action, params}, (response) => {
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
            } catch (e) {
                reject(e);
            }
        });
        (async () => {
            const term = arguments[0];
            const dictionaryInfo = await send('getDictionaryInfo', undefined);
            const termsFind = await send('termsFind', {
                text: term,
                details: {primaryReading: ''},
                optionsContext: {},
            });
            const optionsFull = await send('optionsGetFull', undefined);
            const profileDictionaries = Array.isArray(optionsFull?.profiles) ?
                optionsFull.profiles.map((profile) => ({
                    id: profile?.id ?? null,
                    dictionaries: Array.isArray(profile?.options?.dictionaries) ?
                        profile.options.dictionaries.map((dictionary) => String(dictionary?.name || '')) :
                        [],
                })) :
                null;
            done({
                dictionaryInfo,
                termResultCount: Array.isArray(termsFind?.dictionaryEntries) ? termsFind.dictionaryEntries.length : null,
                profileDictionaries,
            });
        })().catch((e) => {
            done({error: String(e && e.message ? e.message : e)});
        });
    `, term);
    if (typeof diagnostics === 'object' && diagnostics !== null && !Array.isArray(diagnostics)) {
        return /** @type {Record<string, unknown>} */ (diagnostics);
    }
    return {error: `Unexpected diagnostics payload: ${String(diagnostics)}`};
}

/**
 * @param {import('selenium-webdriver').ThenableWebDriver} driver
 * @returns {Promise<void>}
 */
async function purgeDictionaryDatabase(driver) {
    await driver.executeAsyncScript(`
        const done = arguments[arguments.length - 1];
        const send = (action, params) => new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({action, params}, (response) => {
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
        (async () => {
            await send('purgeDatabase', undefined);
            const optionsFull = await send('optionsGetFull', undefined);
            if (!(optionsFull && typeof optionsFull === 'object' && Array.isArray(optionsFull.profiles))) {
                throw new Error('optionsGetFull returned unexpected payload');
            }
            const nextOptions = structuredClone(optionsFull);
            for (const profile of nextOptions.profiles) {
                if (!profile || typeof profile !== 'object') { continue; }
                if (!profile.options || typeof profile.options !== 'object') { continue; }
                profile.options.dictionaries = [];
            }
            await send('setAllSettings', {value: nextOptions, source: 'firefox-e2e'});
            done({ok: true});
        })().catch((e) => {
            done({error: String(e && e.message ? e.message : e)});
        });
    `).then((result) => {
        if (!(typeof result === 'object' && result !== null && !Array.isArray(result) && result.ok === true)) {
            fail(`purgeDatabase failed: ${JSON.stringify(result)}`);
        }
    });
}

/**
 * @param {import('selenium-webdriver').ThenableWebDriver} driver
 * @param {Record<string, unknown>} recommendedDictionaries
 * @param {Record<string, string>} archiveContentBase64ByToken
 * @returns {Promise<void>}
 */
async function installRecommendedDictionariesMock(driver, recommendedDictionaries, archiveContentBase64ByToken) {
    await driver.executeScript(`
        const data = structuredClone(arguments[0]);
        const archiveContentBase64ByToken = arguments[1] || {};
        localStorage.setItem('manabitanE2eArchiveMap', JSON.stringify(archiveContentBase64ByToken));
        const existingFlags = Reflect.get(globalThis, 'manabitanImportPerformanceFlags');
        const normalizedFlags = (typeof existingFlags === 'object' && existingFlags !== null && !Array.isArray(existingFlags)) ? existingFlags : {};
        Reflect.set(globalThis, 'manabitanImportPerformanceFlags', {
            ...normalizedFlags,
            skipSchemaValidation: false,
            enableBulkImportIndexOptimization: false,
            disableProgressEvents: false,
            structuredContentImportFastPath: false,
            debugImportLogging: true,
        });
        Reflect.set(globalThis, 'manabitanImportUseSession', false);

        const originalFetch = window.fetch.bind(window);
        window.fetch = async (input, init) => {
            const url = String(typeof input === 'string' ? input : input?.url || '');
            if (url.includes('recommended-dictionaries.json')) {
                return new Response(JSON.stringify(data), {
                    status: 200,
                    headers: {'Content-Type': 'application/json'},
                });
            }
            return originalFetch(input, init);
        };
    `, recommendedDictionaries, archiveContentBase64ByToken);
}

/**
 * @returns {Promise<void>}
 * @throws {Error}
 */
async function main() {
    const defaultFirefoxZipPath = path.join(root, 'builds', 'manabitan-firefox-dev.zip');
    const defaultFirefoxXpiPath = path.join(root, 'builds', 'manabitan-firefox-dev.xpi');
    let xpiPath = process.env.MANABITAN_FIREFOX_XPI ?? defaultFirefoxZipPath;
    const reportPath = process.env.MANABITAN_FIREFOX_E2E_REPORT ?? path.join(root, 'builds', 'firefox-e2e-import-report.html');
    const report = createReport();
    /** @type {Error | undefined} */
    let runError;
    try {
        await access(xpiPath);
    } catch (_) {
        if (!process.env.MANABITAN_FIREFOX_XPI) {
            try {
                await access(defaultFirefoxXpiPath);
                xpiPath = defaultFirefoxXpiPath;
            } catch (_error) {
                fail(`Extension package not found at: ${xpiPath} (fallback also missing: ${defaultFirefoxXpiPath})`);
            }
        } else {
            fail(`Extension package not found at: ${xpiPath}`);
        }
    }
    const firefoxOptions = new firefox.Options();
    const headlessEnv = (process.env.MANABITAN_FIREFOX_HEADLESS ?? '1').trim().toLowerCase();
    const headless = !(headlessEnv === '0' || headlessEnv === 'false' || headlessEnv === 'no');
    if (headless) {
        firefoxOptions.addArguments('-headless');
    }
    firefoxOptions.setPreference('xpinstall.signatures.required', false);
    const firefoxDeveloperEditionPath = '/Applications/Firefox Developer Edition.app/Contents/MacOS/firefox';
    try {
        await access(firefoxDeveloperEditionPath);
        firefoxOptions.setBinary(firefoxDeveloperEditionPath);
    } catch (_) {
        // Use default Firefox binary when Developer Edition is unavailable.
    }
    const driver = /** @type {import('selenium-webdriver').ThenableWebDriver} */ (
        new Builder()
            .forBrowser(Browser.FIREFOX)
            .setFirefoxOptions(firefoxOptions)
            .build()
    );
    try {
        const tempDir = await mkdtemp(path.join(os.tmpdir(), 'manabitan-firefox-e2e-'));
        const dict1Path = path.join(tempDir, 'integration-dictionary-1.zip');
        const dict2Path = path.join(tempDir, 'integration-dictionary-2.zip');
        const sharedTerm = '打';
        await buildDictionaryZip(tempDir, 'Jitendex', dict1Path, sharedTerm);
        await buildDictionaryZip(tempDir, 'JMdict', dict2Path, sharedTerm);
        const dict1Buffer = await readFile(dict1Path);
        const dict2Buffer = await readFile(dict2Path);
        const dict1Token = 'manabitan-e2e-dict:jitendex';
        const dict2Token = 'manabitan-e2e-dict:jmdict';

        await driver.installAddon(xpiPath, true);

        const baseUrlStart = safePerformance.now();
        const extensionBaseUrl = await waitForExtensionBaseUrl(driver);
        const baseUrlEnd = safePerformance.now();
        await addReportPhase(report, driver, 'Install extension and discover base URL', 'Extension installed and moz-extension base URL discovered', baseUrlStart, baseUrlEnd);

        const settingsOpenStart = safePerformance.now();
        await driver.get(`${extensionBaseUrl}/settings.html`);
        await driver.wait(until.elementLocated(By.css('#dictionary-import-file-input')), 30_000);
        const settingsOpenEnd = safePerformance.now();
        await addReportPhase(report, driver, 'Open settings page', 'Settings loaded and dictionary import controls visible', settingsOpenStart, settingsOpenEnd);
        const purgeStart = safePerformance.now();
        await purgeDictionaryDatabase(driver);
        const purgeEnd = safePerformance.now();
        await addReportPhase(report, driver, 'Purge dictionary database', 'Cleared persisted dictionaries to avoid stale state from prior runs', purgeStart, purgeEnd);
        // Selenium executeScript return value is untyped (`any`).
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const runtimeDiagnostics = await driver.executeAsyncScript(`
            const done = arguments[0];
            (async () => {
                const manifest = chrome.runtime.getManifest();
                let storageDirectoryStatus = 'unknown';
                try {
                    if (navigator.storage && typeof navigator.storage.getDirectory === 'function') {
                        await navigator.storage.getDirectory();
                        storageDirectoryStatus = 'ok';
                    } else {
                        storageDirectoryStatus = 'missing-getDirectory';
                    }
                } catch (e) {
                    storageDirectoryStatus = String(e && e.message ? e.message : e);
                }
                done({
                    crossOriginIsolated: globalThis.crossOriginIsolated === true,
                    hasSharedArrayBuffer: typeof SharedArrayBuffer === 'function',
                    hasAtomics: typeof Atomics === 'object' && Atomics !== null,
                    storageDirectoryStatus,
                    manifestCoop: manifest.cross_origin_opener_policy || null,
                    manifestCoep: manifest.cross_origin_embedder_policy || null,
                });
            })();
        `);
        const diagnosticsStart = safePerformance.now();
        const diagnosticsEnd = safePerformance.now();
        await addReportPhase(
            report,
            driver,
            'Runtime diagnostics',
            `OPFS/isolation diagnostics: ${JSON.stringify(runtimeDiagnostics)}`,
            diagnosticsStart,
            diagnosticsEnd,
        );

        const mockRecommendedDictionaries = {
            ja: {
                terms: [
                    {
                        name: 'Jitendex',
                        description: 'Test Jitendex entry',
                        homepage: '',
                        downloadUrl: dict1Token,
                    },
                    {
                        name: 'JMdict',
                        description: 'Test JMdict entry',
                        homepage: '',
                        downloadUrl: dict2Token,
                    },
                ],
                kanji: [],
                frequency: [],
                grammar: [],
                pronunciation: [],
            },
        };
        const mockInstallStart = safePerformance.now();
        await installRecommendedDictionariesMock(driver, mockRecommendedDictionaries, {
            [dict1Token]: dict1Buffer.toString('base64'),
            [dict2Token]: dict2Buffer.toString('base64'),
        });
        const mockInstallEnd = safePerformance.now();
        await addReportPhase(report, driver, 'Install mocked recommended dictionary feed', 'recommended-dictionaries.json overridden to use local Jitendex and JMdict test archives', mockInstallStart, mockInstallEnd);

        const jitendexClickStart = safePerformance.now();
        const jitendexImportUrl = await installRecommendedDictionary(driver, 'Jitendex');
        const jitendexClickEnd = safePerformance.now();
        await addReportPhase(report, driver, 'Click Jitendex download', `Triggered recommended Jitendex import via URL: ${jitendexImportUrl}`, jitendexClickStart, jitendexClickEnd);
        await waitForImportWithPhaseScreenshots(driver, report, 'Jitendex', '1 installed, 1 enabled', 300_000);
        const jitendexSettleStart = safePerformance.now();
        await driver.sleep(2_000);
        const jitendexSettleEnd = safePerformance.now();
        await addReportPhase(report, driver, 'Jitendex: settle after progress clear', 'Waited 2000ms after progress text cleared before starting next import', jitendexSettleStart, jitendexSettleEnd);

        const jmdictClickStart = safePerformance.now();
        const jmdictImportUrl = await installRecommendedDictionary(driver, 'JMdict');
        const jmdictClickEnd = safePerformance.now();
        await addReportPhase(report, driver, 'Click JMdict download', `Triggered recommended JMdict import via URL: ${jmdictImportUrl}`, jmdictClickStart, jmdictClickEnd);
        await waitForImportWithPhaseScreenshots(driver, report, 'JMdict', '2 installed, 2 enabled', 300_000);
        const jmdictSettleStart = safePerformance.now();
        await driver.sleep(2_000);
        const jmdictSettleEnd = safePerformance.now();
        await addReportPhase(report, driver, 'JMdict: settle after progress clear', 'Waited 2000ms after progress text cleared before final verification', jmdictSettleStart, jmdictSettleEnd);
        const postImportDiagnosticsStart = safePerformance.now();
        const postImportDiagnostics = await getBackendLookupDiagnostics(driver, '打');
        const postImportDiagnosticsEnd = safePerformance.now();
        await addReportPhase(
            report,
            driver,
            'Post-import backend diagnostics',
            `After both imports, backend diagnostics: ${JSON.stringify(postImportDiagnostics)}`,
            postImportDiagnosticsStart,
            postImportDiagnosticsEnd,
        );
        const profileHasBothDictionaries = (() => {
            const profileDictionaries = /** @type {unknown} */ (postImportDiagnostics.profileDictionaries);
            if (!Array.isArray(profileDictionaries)) { return false; }
            /** @type {Set<string>} */
            const names = new Set();
            for (const profile of profileDictionaries) {
                if (!(profile && typeof profile === 'object')) { continue; }
                const dictionaries = /** @type {unknown} */ (profile.dictionaries);
                if (!Array.isArray(dictionaries)) { continue; }
                for (const name of dictionaries) {
                    if (typeof name === 'string' && name.length > 0) {
                        names.add(name);
                    }
                }
            }
            return names.has('Jitendex') && names.has('JMdict');
        })();

        const verifyStart = safePerformance.now();
        await closeModalIfOpen(driver, '#recommended-dictionaries-modal');
        const dictionariesModalTrigger = await openInstalledDictionariesModal(driver);
        const verifyDeadline = safePerformance.now() + 60_000;
        let lastModalText = '';
        while (safePerformance.now() < verifyDeadline) {
            // Selenium's executeScript return value is untyped (`any`).
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const modalText = await driver.executeScript(`
                const dictionariesModal = document.querySelector('#dictionaries-modal');
                const recommendedModal = document.querySelector('#recommended-dictionaries-modal');
                if (!(dictionariesModal instanceof HTMLElement) || dictionariesModal.hidden) { return ''; }
                if (recommendedModal instanceof HTMLElement && !recommendedModal.hidden) { return ''; }
                const dictionaryList = dictionariesModal.querySelector('#dictionary-list');
                if (!(dictionaryList instanceof HTMLElement)) { return ''; }
                return (dictionaryList.textContent || '').trim();
            `);
            if (typeof modalText === 'string') {
                lastModalText = modalText;
                if (lastModalText.includes('Jitendex') && lastModalText.includes('JMdict')) {
                    break;
                }
            }
            await driver.sleep(250);
        }
        if (!(lastModalText.includes('Jitendex') && lastModalText.includes('JMdict'))) {
            const dictionaryErrorText = await getDictionaryErrorText(driver);
            if (!profileHasBothDictionaries) {
                fail(`Expected installed dictionary modal text to contain Jitendex and JMdict; saw "${lastModalText.slice(0, 240)}"; dictionary-error="${dictionaryErrorText}"`);
            }
        }
        const verifyEnd = safePerformance.now();
        await addReportPhase(
            report,
            driver,
            'Verify installed dictionaries list',
            (
                (lastModalText.includes('Jitendex') && lastModalText.includes('JMdict')) ?
                `Opened dictionaries modal via ${dictionariesModalTrigger} and confirmed dictionary list text includes Jitendex + JMdict` :
                `Modal text did not show both dictionaries (text="${lastModalText.slice(0, 240)}"), but backend profile dictionaries contained both names`
            ),
            verifyStart,
            verifyEnd,
        );

        const searchOpenStart = safePerformance.now();
        await closeModalIfOpen(driver, '#dictionaries-modal');
        await openSearchPageViaActionPopup(driver, extensionBaseUrl);
        const searchOpenEnd = safePerformance.now();
        await addReportPhase(report, driver, 'Open search page from action popup', 'Closed dictionaries modal, opened action popup, and clicked magnifying-glass search button', searchOpenStart, searchOpenEnd);
        const backendDiagnosticsStart = safePerformance.now();
        const backendDiagnostics = await getBackendLookupDiagnostics(driver, '打');
        const backendDiagnosticsEnd = safePerformance.now();
        await addReportPhase(
            report,
            driver,
            'Backend lookup diagnostics',
            `Database/termsFind diagnostics before UI search: ${JSON.stringify(backendDiagnostics)}`,
            backendDiagnosticsStart,
            backendDiagnosticsEnd,
        );

        const searchVerifyStart = safePerformance.now();
        const searchTerm = '打';
        const dictionaryHitCounts = await searchTermAndGetDictionaryHitCounts(driver, searchTerm, ['Jitendex', 'JMdict']);
        if ((dictionaryHitCounts.Jitendex ?? 0) < 1 || (dictionaryHitCounts.JMdict ?? 0) < 1) {
            // Selenium executeScript return value is untyped (`any`).
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const searchDiagnostics = await driver.executeScript(`
                const noResults = document.querySelector('#no-results');
                const noDictionaries = document.querySelector('#no-dictionaries');
                const entries = document.querySelector('#dictionary-entries');
                const valueOrEmpty = (element) => (element instanceof HTMLElement ? (element.textContent || '').trim() : '');
                return {
                    url: location.href,
                    searchTextboxValue: (() => {
                        const input = document.querySelector('#search-textbox');
                        return input instanceof HTMLTextAreaElement ? input.value : null;
                    })(),
                    noResultsVisible: noResults instanceof HTMLElement ? !noResults.hidden : null,
                    noDictionariesVisible: noDictionaries instanceof HTMLElement ? !noDictionaries.hidden : null,
                    entriesTextPreview: valueOrEmpty(entries).slice(0, 300),
                };
            `);
            const searchVerifyFailEnd = safePerformance.now();
            await addReportPhase(
                report,
                driver,
                'Verify search results include both dictionaries (failed)',
                `Searched ${searchTerm} and expected hits from Jitendex + JMdict. Counts=${JSON.stringify(dictionaryHitCounts)} diagnostics=${JSON.stringify(searchDiagnostics)}`,
                searchVerifyStart,
                searchVerifyFailEnd,
            );
            fail(`Expected search results for ${searchTerm} to include both Jitendex and JMdict; saw counts ${JSON.stringify(dictionaryHitCounts)} diagnostics=${JSON.stringify(searchDiagnostics)}`);
        }
        const searchVerifyEnd = safePerformance.now();
        await addReportPhase(report, driver, 'Verify search results include both dictionaries', `Searched ${searchTerm} and observed dictionary hit counts: ${JSON.stringify(dictionaryHitCounts)}`, searchVerifyStart, searchVerifyEnd);

        report.status = 'success';
        console.log('[firefox-e2e] PASS: Recommended dictionary imports installed Jitendex and JMdict.');
    } catch (e) {
        report.status = 'failure';
        report.failureReason = errorMessage(e);
        runError = new Error(`[firefox-e2e] ${errorMessage(e)}`);
    } finally {
        try {
            await mkdir(path.dirname(reportPath), {recursive: true});
            const reportHtml = renderReportHtml(report);
            await writeFile(reportPath, reportHtml);
            console.log(`[firefox-e2e] Wrote report: ${reportPath}`);
        } catch (reportError) {
            console.error(`[firefox-e2e] Failed to write report: ${errorMessage(reportError)}`);
        }

        await driver.quit();
    }

    if (runError) {
        throw runError;
    }
}

await main();
