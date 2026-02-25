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
import http from 'node:http';
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
    .phase { margin: 0 0 28px; padding: 14px; border: 1px solid #d8dee4; border-radius: 10px; }
    .phase h2 { margin: 0 0 8px; font-size: 18px; }
    .phase p { margin: 6px 0; }
    img { margin-top: 10px; max-width: 100%; border: 1px solid #d8dee4; border-radius: 8px; }
  </style>
</head>
<body>
  <h1>Manabitan Firefox E2E Import Report</h1>
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

    while (safePerformance.now() < deadline) {
        const now = safePerformance.now();
        const currentLabel = await getImportProgressLabel(driver);
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

        const countsText = await getDictionaryCountsText(driver);
        if (countsText === expectedCounts) {
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
                `Dictionary counts reached ${expectedCounts}`,
                importStartTime,
                now,
            );
            return;
        }

        await driver.sleep(250);
    }

    const countsText = await getDictionaryCountsText(driver);
    fail(`Timed out waiting for ${dictionaryName} import completion. Last dictionary counts: ${countsText}`);
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
 * @param {string} title
 * @param {string} outputPath
 * @returns {Promise<void>}
 */
async function buildDictionaryZip(title, outputPath) {
    const dictionaryDir = path.join(root, 'test', 'data', 'dictionaries', 'valid-dictionary1');
    const data = await createDictionaryArchiveData(dictionaryDir, title);
    await writeFile(outputPath, Buffer.from(data));
}

/**
 * @param {import('selenium-webdriver').ThenableWebDriver} driver
 * @param {string} dictionaryName
 * @returns {Promise<void>}
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
    await driver.executeScript(`
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
        button.scrollIntoView({block: 'center', inline: 'nearest'});
        button.click();
    `, dictionaryName);
}

/**
 * @param {import('selenium-webdriver').ThenableWebDriver} driver
 * @param {Record<string, unknown>} recommendedDictionaries
 * @returns {Promise<void>}
 */
async function installRecommendedDictionariesMock(driver, recommendedDictionaries) {
    await driver.executeScript(`
        const data = arguments[0];
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
    `, recommendedDictionaries);
}

/**
 * @returns {Promise<void>}
 * @throws {Error}
 */
async function main() {
    const xpiPath = process.env.MANABITAN_FIREFOX_XPI ?? path.join(root, 'builds', 'manabitan-firefox-dev.xpi');
    const reportPath = process.env.MANABITAN_FIREFOX_E2E_REPORT ?? path.join(root, 'builds', 'firefox-e2e-import-report.html');
    const report = createReport();
    /** @type {Error | undefined} */
    let runError;
    try {
        await access(xpiPath);
    } catch (_) {
        fail(`Extension XPI not found at: ${xpiPath}`);
    }
    const firefoxOptions = new firefox.Options();
    firefoxOptions.addArguments('-headless');
    const driver = /** @type {import('selenium-webdriver').ThenableWebDriver} */ (
        new Builder()
            .forBrowser(Browser.FIREFOX)
            .setFirefoxOptions(firefoxOptions)
            .build()
    );
    /** @type {http.Server|undefined} */
    let server;
    try {
        const tempDir = await mkdtemp(path.join(os.tmpdir(), 'manabitan-firefox-e2e-'));
        const dict1Path = path.join(tempDir, 'integration-dictionary-1.zip');
        const dict2Path = path.join(tempDir, 'integration-dictionary-2.zip');
        await buildDictionaryZip('JMdict', dict1Path);
        await buildDictionaryZip('KANJIDIC', dict2Path);
        const dict1Buffer = await readFile(dict1Path);
        const dict2Buffer = await readFile(dict2Path);

        server = http.createServer((req, res) => {
            const url = String(req.url ?? '/');
            if (url === '/integration-dictionary-1.zip') {
                res.writeHead(200, {'Content-Type': 'application/zip'});
                res.end(dict1Buffer);
                return;
            }
            if (url === '/integration-dictionary-2.zip') {
                res.writeHead(200, {'Content-Type': 'application/zip'});
                res.end(dict2Buffer);
                return;
            }
            res.writeHead(404, {'Content-Type': 'text/plain'});
            res.end('not found');
        });
        await new Promise((resolve) => {
            server.listen(0, '127.0.0.1', () => {
                resolve(void 0);
            });
        });
        const address = server.address();
        if (!(address && typeof address === 'object' && typeof address.port === 'number')) {
            fail('Failed to start local dictionary HTTP server');
        }
        const dict1Url = `http://127.0.0.1:${address.port}/integration-dictionary-1.zip`;
        const dict2Url = `http://127.0.0.1:${address.port}/integration-dictionary-2.zip`;

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

        const mockRecommendedDictionaries = {
            ja: {
                terms: [
                    {
                        name: 'JMdict',
                        description: 'Test JMdict entry',
                        homepage: '',
                        downloadUrl: dict1Url,
                    },
                ],
                kanji: [
                    {
                        name: 'KANJIDIC',
                        description: 'Test KANJIDIC entry',
                        homepage: '',
                        downloadUrl: dict2Url,
                    },
                ],
                frequency: [],
                grammar: [],
                pronunciation: [],
            },
        };
        const mockInstallStart = safePerformance.now();
        await installRecommendedDictionariesMock(driver, mockRecommendedDictionaries);
        const mockInstallEnd = safePerformance.now();
        await addReportPhase(report, driver, 'Install mocked recommended dictionary feed', 'recommended-dictionaries.json overridden to use local JMdict and KANJIDIC test archives', mockInstallStart, mockInstallEnd);

        const jmdictClickStart = safePerformance.now();
        await installRecommendedDictionary(driver, 'JMdict');
        const jmdictClickEnd = safePerformance.now();
        await addReportPhase(report, driver, 'Click JMdict download', 'Triggered recommended JMdict import', jmdictClickStart, jmdictClickEnd);
        await waitForImportWithPhaseScreenshots(driver, report, 'JMdict', '1 installed, 1 enabled', 300_000);

        const kanjidicClickStart = safePerformance.now();
        await installRecommendedDictionary(driver, 'KANJIDIC');
        const kanjidicClickEnd = safePerformance.now();
        await addReportPhase(report, driver, 'Click KANJIDIC download', 'Triggered recommended KANJIDIC import', kanjidicClickStart, kanjidicClickEnd);
        await waitForImportWithPhaseScreenshots(driver, report, 'KANJIDIC', '2 installed, 2 enabled', 300_000);

        const verifyStart = safePerformance.now();
        await clickWithScroll(driver, '.settings-item[data-modal-action="show,dictionaries"]');
        await driver.wait(until.elementLocated(By.css('#dictionaries-modal')), 30_000);
        await driver.wait(async () => {
            // Selenium's executeScript return value is untyped (`any`).
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const dictionaryTitles = await driver.executeScript(`
                return Array.from(document.querySelectorAll('#dictionary-list .dictionary-title'))
                    .map((node) => (node.textContent || '').trim())
                    .filter((title) => title.length > 0);
            `);
            return Array.isArray(dictionaryTitles) &&
            dictionaryTitles.includes('JMdict') &&
            dictionaryTitles.includes('KANJIDIC');
        }, 60_000, 'Expected installed dictionary list to contain JMdict and KANJIDIC');
        const verifyEnd = safePerformance.now();
        await addReportPhase(report, driver, 'Verify installed dictionaries list', 'Opened dictionaries modal and confirmed JMdict + KANJIDIC are listed', verifyStart, verifyEnd);

        report.status = 'success';
        console.log('[firefox-e2e] PASS: Recommended dictionary imports installed JMdict and KANJIDIC.');
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

        if (typeof server !== 'undefined') {
            await new Promise((resolve) => {
                server.close(() => {
                    resolve(void 0);
                });
            });
        }
        await driver.quit();
    }

    if (runError) {
        throw runError;
    }
}

await main();
