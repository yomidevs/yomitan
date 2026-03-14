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

import {test as base, chromium} from '@playwright/test';
import {createHash} from 'crypto';
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import {ManifestUtil} from '../../dev/manifest-util.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));

export const root = path.join(dirname, '..', '..');

const manifestPath = path.join(root, 'ext', 'manifest.json');

/**
 * @returns {string|null}
 */
function getConfiguredExtensionId() {
    if (!fs.existsSync(manifestPath)) {
        return null;
    }

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    if (typeof manifest?.key !== 'string' || manifest.key.length === 0) {
        return null;
    }

    const hash = createHash('sha256')
        .update(Buffer.from(manifest.key, 'base64'))
        .digest('hex')
        .slice(0, 32);
    return [...hash].map((character) => String.fromCharCode('a'.charCodeAt(0) + Number.parseInt(character, 16))).join('');
}

export const test = base.extend({
    // eslint-disable-next-line no-empty-pattern
    context: async ({}, /** @type {(r: import('playwright').BrowserContext) => Promise<void>} */ use) => {
        let createdManifest = false;
        if (!fs.existsSync(manifestPath)) {
            const manifestUtil = new ManifestUtil();
            const variant = manifestUtil.getManifest('chrome-playwright');
            fs.writeFileSync(manifestPath, ManifestUtil.createManifestString(variant).replace('$YOMITAN_VERSION', '0.0.0.0'));
            createdManifest = true;
        }

        const pathToExtension = path.join(root, 'ext');
        const runHeadless = (process.env.MANABITAN_CHROMIUM_HEADLESS ?? (process.platform === 'win32' ? '0' : '1')).trim() === '1';
        const hideWindow = (process.env.MANABITAN_CHROMIUM_HIDE_WINDOW ?? (process.platform === 'win32' ? '1' : '0')).trim() === '1';
        /** @type {string[]} */
        const launchArgs = [
            `--disable-extensions-except=${pathToExtension}`,
            `--load-extension=${pathToExtension}`,
        ];
        if (!runHeadless && hideWindow) {
            launchArgs.push('--window-position=3000,3000', '--window-size=1280,800', '--start-minimized');
        }
        const context = await chromium.launchPersistentContext('', {
            headless: runHeadless,
            args: launchArgs,
        });
        try {
            await use(context);
        } finally {
            await context.close();
            if (createdManifest) {
                fs.unlinkSync(manifestPath);
            }
        }
    },
    extensionId: async ({context}, use) => {
        const configuredExtensionId = getConfiguredExtensionId();
        if (configuredExtensionId !== null) {
            await use(configuredExtensionId);
            return;
        }

        const deadline = Date.now() + 45_000;
        while (Date.now() < deadline) {
            const [background] = context.serviceWorkers();
            if (background) {
                await use(background.url().split('/')[2]);
                return;
            }

            const extensionPage = context.pages().find((page) => page.url().startsWith('chrome-extension://'));
            if (extensionPage) {
                await use(extensionPage.url().split('/')[2]);
                return;
            }

            const timeout = Math.max(1, Math.min(5_000, deadline - Date.now()));
            try {
                const eventResult = await Promise.any([
                    context.waitForEvent('serviceworker', {timeout}).then((serviceWorker) => serviceWorker.url()),
                    context.waitForEvent('page', {timeout}).then((page) => page.url()),
                ]);
                if (eventResult.startsWith('chrome-extension://')) {
                    await use(eventResult.split('/')[2]);
                    return;
                }
            } catch (_) {
                // Retry until the extension worker or page is available.
            }

            const extensionPageAfterEvent = context.pages().find((page) => page.url().startsWith('chrome-extension://'));
            if (extensionPageAfterEvent) {
                await use(extensionPageAfterEvent.url().split('/')[2]);
                return;
            }
        }
        throw new Error('Unable to discover extension id');
    },
});

export const expect = test.expect;

/**
 * @param {import('playwright').Page} page
 * @param {string} text
 * @returns {Promise<void>}
 */
export const writeToClipboardFromPage = async (page, text) => {
    await page.bringToFront();
    await page.evaluate(() => {
        window.focus();
    });
    await page.evaluate(`navigator.clipboard.writeText('${text}')`);
};
