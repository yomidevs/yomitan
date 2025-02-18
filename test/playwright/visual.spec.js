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

import {readFileSync} from 'fs';
import path from 'path';
import {pathToFileURL} from 'url';
import {createDictionaryArchiveData} from '../../dev/dictionary-archive-util.js';
import {expect, root, test} from './playwright-util.js';

test.beforeEach(async ({context}) => {
    // Wait for the on-install welcome.html tab to load, which becomes the foreground tab
    const welcome = await context.waitForEvent('page');
    await welcome.close(); // Close the welcome tab so our main tab becomes the foreground tab -- otherwise, the screenshot can hang
});

test('welcome', async ({page, extensionId}) => {
    // Open welcome page
    console.log('Open welcome page');
    await page.goto(`chrome-extension://${extensionId}/welcome.html`);
    await expect(page.getByText('Welcome to Yomitan!')).toBeVisible();

    // Take a screenshot of the welcome page
    await expect.soft(page).toHaveScreenshot('welcome-page.png');
});
test.describe('settings', () => {
    test('local load of jmdict_english', async ({page, extensionId}) => {
        // Open settings
        console.log('Open settings');
        await page.goto(`chrome-extension://${extensionId}/settings.html`);

        await expect(page.locator('id=dictionaries')).toBeVisible();

        // Get the locator for the disk usage indicator so we can later mask it out of the screenshot
        const storage_locator = page.locator('.storage-use-finite >> xpath=..');

        // Take a simple screenshot of the settings page
        await expect.soft(page).toHaveScreenshot('settings-fresh.png', {mask: [storage_locator]});

        // Load in jmdict_english.zip
        console.log('Load in jmdict_english.zip');
        await page.locator('input[id="dictionary-import-file-input"]').setInputFiles(path.join(root, 'dictionaries/jmdict_english.zip'));
        await expect(page.locator('id=dictionaries')).toHaveText('Dictionaries (1 installed, 1 enabled)', {timeout: 5 * 60 * 1000});

        // Take a screenshot of the settings page with jmdict loaded
        await expect.soft(page).toHaveScreenshot('settings-jmdict-loaded.png', {mask: [storage_locator]});
    });
    test('remote load and delete of jmdict_swedish', async ({page, extensionId}) => {
        // Open settings
        console.log('Open settings');
        await page.goto(`chrome-extension://${extensionId}/settings.html`);

        // Enable advanced settings
        // Wait for the advanced settings to be visible
        await page.locator('input#advanced-checkbox').evaluate((/** @type {HTMLInputElement} */ element) => element.click());

        // Import jmdict_swedish.zip from a URL
        console.log('Load in jmdict_swedish.zip');
        await page.locator('.settings-item[data-modal-action="show,dictionaries"]').click();
        await page.locator('button[id="dictionary-import-button"]').click();
        await page.locator('textarea[id="dictionary-import-url-text"]').fill('https://github.com/yomidevs/yomitan/raw/dictionaries/jmdict_swedish.zip');
        await page.locator('button[id="dictionary-import-url-button"]').click();
        await expect(page.locator('id=dictionaries')).toHaveText('Dictionaries (1 installed, 1 enabled)', {timeout: 5 * 60 * 1000});

        // Delete the jmdict_swedish dictionary
        await page.locator('button.dictionary-menu-button').nth(0).click();
        await page.locator('button.popup-menu-item[data-menu-action="delete"]').click();
        await page.locator('#dictionary-confirm-delete-button').click();
        await page.locator('#dictionaries-modal button[data-modal-action="hide"]').getByText('Close').click();
        await expect(page.locator('id=dictionaries')).toHaveText('Dictionaries (0 installed, 0 enabled)', {timeout: 5 * 60 * 1000});

        // Get page height by getting the footer and adding height and y position as other methods of calculation don't work for some reason
        const footer = /** @type {import('@playwright/test').ElementHandle<HTMLElement>} */ (await page.locator('.footer-padding').elementHandle());
        expect(footer).not.toBe(null);
        const boundingBox = /** @type {NonNullable<Awaited<ReturnType<import('@playwright/test').ElementHandle<HTMLElement>['boundingBox']>>>} */ (await footer.boundingBox());
        expect(boundingBox).not.toBe(null);
        const pageHeight = Math.ceil(boundingBox.y + boundingBox.height);

        await page.setViewportSize({width: 1280, height: pageHeight});

        // Wait for any animations or changes to complete
        console.log('Waiting for animations to complete');
        await page.waitForTimeout(500);

        // Get the locator for the disk usage indicator so we can later mask it out of the screenshot
        const storage_locator = page.locator('.storage-use-finite >> xpath=..');

        // Take a full page screenshot of the settings page with advanced settings enabled
        await expect.soft(page).toHaveScreenshot('settings-fresh-full-advanced.png', {
            fullPage: true,
            mask: [storage_locator],
        });
    });
});
test.describe('popup', () => {
    test.beforeEach(async ({page, extensionId}) => {
        // Open settings
        console.log('Open settings');
        await page.goto(`chrome-extension://${extensionId}/settings.html`);

        await expect(page.locator('id=dictionaries')).toBeVisible();

        // Load in test dictionary
        const dictionary = await createDictionaryArchiveData(path.join(root, 'test/data/dictionaries/valid-dictionary1'), 'valid-dictionary1');
        await page.locator('input[id="dictionary-import-file-input"]').setInputFiles({
            name: 'valid-dictionary1.zip',
            mimeType: 'application/x-zip',
            buffer: Buffer.from(dictionary),
        });
        await expect(page.locator('id=dictionaries')).toHaveText('Dictionaries (1 installed, 1 enabled)', {timeout: 1 * 60 * 1000});

        console.log('Open popup-tests.html');
        await page.goto(pathToFileURL(popupTestsPath).toString());
        await page.setViewportSize({width: 700, height: 500});
        await expect(page.locator('id=footer')).toBeVisible();
        await page.keyboard.down('Shift');
    });
    const popupTestsPath = path.join(root, 'test/data/html/popup-tests.html');
    const numberOfTests = (readFileSync(popupTestsPath, 'utf8').match(/hovertarget/g) || []).length;
    for (let i = 1; i <= numberOfTests; i++) {
        test(`test${i}`, async ({page}) => {
            const frame_attached = page.waitForEvent('frameattached', {timeout: 10000});
            const test_name = 'doc2-test' + i;
            console.log(test_name);

            // Find the test element
            const hovertarget_locator = page.locator('.hovertarget').nth(i - 1);

            const testcase_locator = hovertarget_locator.locator('..');

            await testcase_locator.scrollIntoViewIfNeeded();

            const box = (await hovertarget_locator.boundingBox()) || {x: 0, y: 0, width: 0, height: 0};

            const expectedState = (await testcase_locator.getAttribute('data-expected-result')) === 'failure' ? 'hidden' : 'visible';

            try {
                await page.mouse.move(box.x - 5, box.y - 5); // Hover near the test
                await page.mouse.move(box.x + 15, box.y + 15, {steps: 10}); // Hover over the test
                if (expectedState === 'visible') {
                    const popup_frame = await frame_attached;
                    await (await /** @type {import('@playwright/test').Frame} */ (popup_frame).frameElement())
                        .waitForElementState(expectedState, {timeout: 1000});
                } else {
                    expect(
                        await Promise.race([
                            frame_attached,
                            new Promise((resolve) => {
                                setTimeout(() => resolve('timeout'), 1000);
                            }),
                        ]),
                    ).toStrictEqual('timeout');
                }
            } catch (error) {
                console.warn(test_name, 'unexpected popup state', error);
            }

            console.log(test_name, 'taking screenshot');
            await page.bringToFront(); // Bring the page to the foreground so the screenshot doesn't hang; for some reason the frames result in page being in the background
            await expect.soft(page).toHaveScreenshot(test_name + '.png');
        });
    }
});
