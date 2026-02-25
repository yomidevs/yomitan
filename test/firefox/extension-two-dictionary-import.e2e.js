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

import {access, mkdtemp, readFile, writeFile} from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Builder, Browser, By, until} from 'selenium-webdriver';
import * as firefox from 'selenium-webdriver/firefox.js';
import {createDictionaryArchiveData} from '../../dev/dictionary-archive-util.js';

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
 * @param {string} text
 * @param {number} timeoutMs
 * @returns {Promise<void>}
 */
async function waitForText(driver, selector, text, timeoutMs) {
    await driver.wait(async () => {
        return String(await (await driver.findElement(By.css(selector))).getText()) === text;
    }, timeoutMs, `Expected ${selector} text to become: ${text}`);
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
 * @param {string} dictionaryUrl
 * @returns {Promise<void>}
 */
async function importDictionaryFromUrl(driver, dictionaryUrl) {
    await clickWithScroll(driver, '.settings-item[data-modal-action="show,dictionaries"]');
    await clickWithScroll(driver, '#dictionary-import-button');
    await driver.wait(until.elementLocated(By.css('#dictionary-import-url-text')), 30_000);
    // Headless Firefox can fail to scroll textareas for sendKeys; set value directly.
    await driver.executeScript(`
        const value = arguments[0];
        const element = document.querySelector('#dictionary-import-url-text');
        if (!(element instanceof HTMLTextAreaElement)) {
            throw new Error('URL textarea not found');
        }
        element.value = String(value);
        element.dispatchEvent(new Event('input', {bubbles: true}));
        element.dispatchEvent(new Event('change', {bubbles: true}));
    `, dictionaryUrl);
    await clickWithScroll(driver, '#dictionary-import-url-button');
}

/**
 * @returns {Promise<void>}
 * @throws {Error}
 */
async function main() {
    const xpiPath = process.env.MANABITAN_FIREFOX_XPI ?? path.join(root, 'builds', 'manabitan-firefox-dev.xpi');
    try {
        await access(xpiPath);
    } catch (_) {
        fail(`Extension XPI not found at: ${xpiPath}`);
    }
    // Selenium's JS-only API surfaces `any` here.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const firefoxOptions = new firefox.Options();
    firefoxOptions.addArguments('-headless');
    // Selenium's JS-only API surfaces `any` here.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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
        await buildDictionaryZip('IntegrationDictionary1', dict1Path);
        await buildDictionaryZip('IntegrationDictionary2', dict2Path);
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

        const extensionBaseUrl = await waitForExtensionBaseUrl(driver);
        await driver.get(`${extensionBaseUrl}/settings.html`);
        await driver.wait(until.elementLocated(By.css('#dictionary-import-file-input')), 30_000);

        await importDictionaryFromUrl(driver, dict1Url);
        await waitForText(driver, '#dictionaries', 'Dictionaries (1 installed, 1 enabled)', 300_000);

        await importDictionaryFromUrl(driver, dict2Url);
        await waitForText(driver, '#dictionaries', 'Dictionaries (2 installed, 2 enabled)', 300_000);

        console.log('[firefox-e2e] PASS: Two sequential dictionary imports are preserved.');
    } catch (e) {
        fail(errorMessage(e));
    } finally {
        if (typeof server !== 'undefined') {
            await new Promise((resolve) => {
                server.close(() => {
                    resolve(void 0);
                });
            });
        }
        await driver.quit();
    }
}

await main();
