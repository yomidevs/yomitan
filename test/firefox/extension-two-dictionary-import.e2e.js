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

import {access, mkdtemp, writeFile} from 'node:fs/promises';
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
 * @param {string} filePath
 * @returns {Promise<void>}
 */
async function uploadDictionaryFile(driver, filePath) {
    await driver.executeScript(`
        const input = document.querySelector('#dictionary-import-file-input');
        if (!(input instanceof HTMLInputElement)) { throw new Error('Dictionary file input not found'); }
        input.hidden = false;
        input.style.display = 'block';
        input.style.opacity = '1';
    `);
    await (await driver.findElement(By.css('#dictionary-import-file-input'))).sendKeys(filePath);
    await driver.executeScript(`
        const input = document.querySelector('#dictionary-import-file-input');
        if (!(input instanceof HTMLInputElement)) { throw new Error('Dictionary file input not found after upload'); }
        input.dispatchEvent(new Event('change', {bubbles: true}));
    `);
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
    const firefoxOptions = new firefox.Options();
    firefoxOptions.addArguments('-headless');
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
        await buildDictionaryZip('IntegrationDictionary1', dict1Path);
        await buildDictionaryZip('IntegrationDictionary2', dict2Path);

        await driver.installAddon(xpiPath, true);

        const extensionBaseUrl = await waitForExtensionBaseUrl(driver);
        await driver.get(`${extensionBaseUrl}/settings.html`);
        await driver.wait(until.elementLocated(By.css('#dictionary-import-file-input')), 30_000);

        await uploadDictionaryFile(driver, dict1Path);
        await waitForText(driver, '#dictionaries', 'Dictionaries (1 installed, 1 enabled)', 120_000);

        await uploadDictionaryFile(driver, dict2Path);
        await waitForText(driver, '#dictionaries', 'Dictionaries (2 installed, 2 enabled)', 120_000);

        console.log('[firefox-e2e] PASS: Two sequential dictionary imports are preserved.');
    } catch (e) {
        fail(errorMessage(e));
    } finally {
        await driver.quit();
    }
}

await main();
