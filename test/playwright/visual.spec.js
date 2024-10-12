/*
 * Copyright (C) 2023-2024  Yomitan Authors
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
import {pathToFileURL} from 'url';
import {expect, root, test} from './playwright-util.js';

test.beforeEach(async ({context}) => {
    // Wait for the on-install welcome.html tab to load, which becomes the foreground tab
    const welcome = await context.waitForEvent('page');
    await welcome.close(); // Close the welcome tab so our main tab becomes the foreground tab -- otherwise, the screenshot can hang
});

test('visual', async ({page, extensionId}) => {
    // Open welcome page
    await page.goto(`chrome-extension://${extensionId}/welcome.html`);
    await expect(page.getByText('Welcome to Yomitan!')).toBeVisible();

    // Take a screenshot of the welcome page
    await expect.soft(page).toHaveScreenshot('welcome-page.png');

    // Open settings
    await page.goto(`chrome-extension://${extensionId}/settings.html`);

    await expect(page.locator('id=dictionaries')).toBeVisible();

    // Get the locator for the disk usage indicator so we can later mask it out of the screenshot
    const storage_locator = page.locator('.storage-use-finite >> xpath=..');

    // Take a simple screenshot of the settings page
    await expect.soft(page).toHaveScreenshot('settings-fresh.png', {mask: [storage_locator]});

    // Load in jmdict_english.zip
    await page.locator('input[id="dictionary-import-file-input"]').setInputFiles(path.join(root, 'dictionaries/jmdict_english.zip'));
    await expect(page.locator('id=dictionaries')).toHaveText('Dictionaries (1 installed, 1 enabled)', {timeout: 5 * 60 * 1000});

    // Take a screenshot of the settings page with jmdict loaded
    await expect.soft(page).toHaveScreenshot('settings-jmdict-loaded.png', {mask: [storage_locator]});

    // Enable advanced settings
    // Wait for the advanced settings to be visible
    await page.locator('input#advanced-checkbox').evaluate((/** @type {HTMLInputElement} */ element) => element.click());

    // Import jmdict_swedish.zip from a URL
    await page.locator('.settings-item[data-modal-action="show,dictionaries"]').click();
    await page.locator('button[id="dictionary-import-button"]').click();
    await page.locator('textarea[id="dictionary-import-url-text"]').fill('https://github.com/yomidevs/yomitan/raw/dictionaries/jmdict_swedish.zip');
    await page.locator('button[id="dictionary-import-url-button"]').click();
    await expect(page.locator('id=dictionaries')).toHaveText('Dictionaries (2 installed, 2 enabled)', {timeout: 5 * 60 * 1000});

    // Delete the jmdict_swedish dictionary
    await page.locator('button.dictionary-menu-button').nth(1).click();
    await page.locator('button.popup-menu-item[data-menu-action="delete"]').click();
    await page.locator('#dictionary-confirm-delete-button').click();
    await page.locator('#dictionaries-modal button[data-modal-action="hide"]').getByText('Close').click();
    await expect(page.locator('id=dictionaries')).toHaveText('Dictionaries (1 installed, 1 enabled)', {timeout: 5 * 60 * 1000});

    // Get page height by getting the footer and adding height and y position as other methods of calculation don't work for some reason
    const footer = /** @type {import('@playwright/test').ElementHandle<HTMLElement>} */ (await page.locator('.footer-padding').elementHandle());
    expect(footer).not.toBe(null);
    const boundingBox = /** @type {NonNullable<Awaited<ReturnType<import('@playwright/test').ElementHandle<HTMLElement>['boundingBox']>>>} */ (await footer.boundingBox());
    expect(boundingBox).not.toBe(null);
    const pageHeight = Math.ceil(boundingBox.y + boundingBox.height);

    await page.setViewportSize({width: 1280, height: pageHeight});

    // Wait for any animations or changes to complete
    await page.waitForTimeout(500);

    // Take a full page screenshot of the settings page with advanced settings enabled
    await expect.soft(page).toHaveScreenshot('settings-fresh-full-advanced.png', {
        fullPage: true,
        mask: [storage_locator],
    });

    /**
     * @param {number} doc_number
     * @param {number} test_number
     * @param {import('@playwright/test').ElementHandle<Node>} el
     * @param {{x: number, y: number}} offset
     */
    const screenshot = async (doc_number, test_number, el, offset) => {
        const test_name = 'doc' + doc_number + '-test' + test_number;

        const box = (await el.boundingBox()) || {x: 0, y: 0, width: 0, height: 0};

        // Find the popup frame if it exists
        let popup_frame = page.frames().find((f) => f.url().includes('popup.html'));

        // Otherwise prepare for it to be attached
        let frame_attached;
        if (typeof popup_frame === 'undefined') {
            frame_attached = page.waitForEvent('frameattached');
        }
        await page.mouse.move(box.x + offset.x, box.y + offset.y, {steps: 10}); // Hover over the test
        if (typeof popup_frame === 'undefined') {
            popup_frame = await frame_attached; // Wait for popup to be attached
        }
        try {
            // Some tests don't have a popup, so don't fail if it's not there
            // TODO: check if the popup is expected to be there
            await (await /** @type {import('@playwright/test').Frame} */ (popup_frame).frameElement()).waitForElementState('visible', {timeout: 500});
        } catch (error) {
            console.log(test_name + ' has no popup');
        }

        await page.bringToFront(); // Bring the page to the foreground so the screenshot doesn't hang; for some reason the frames result in page being in the background
        await expect.soft(page).toHaveScreenshot(test_name + '.png');

        await page.mouse.click(0, 0); // Click away so popup disappears
        await (await /** @type {import('@playwright/test').Frame} */ (popup_frame).frameElement()).waitForElementState('hidden'); // Wait for popup to disappear
    };

    // Test document 1
    await page.goto(pathToFileURL(path.join(root, 'test/data/html/document-util.html')).toString());
    await page.setViewportSize({width: 1000, height: 1800});
    await page.keyboard.down('Shift');
    let i = 1;
    for (const el of await page.locator('div > *:nth-child(1)').elementHandles()) {
        await screenshot(1, i, el, {x: 6, y: 6});
        i++;
    }

    // Test document 2
    await page.goto(pathToFileURL(path.join(root, 'test/data/html/popup-tests.html')).toString());
    await page.setViewportSize({width: 1000, height: 4500});
    await page.keyboard.down('Shift');
    i = 1;
    for (const el of await page.locator('.hovertarget').elementHandles()) {
        await screenshot(2, i, el, {x: 15, y: 15});
        i++;
    }
});
