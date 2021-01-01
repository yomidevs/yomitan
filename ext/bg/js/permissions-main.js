/*
 * Copyright (C) 2020-2021  Yomichan Authors
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

/* global
 * DocumentFocusController
 * api
 */

async function setupEnvironmentInfo() {
    const {manifest_version: manifestVersion} = chrome.runtime.getManifest();
    const {browser, platform} = await api.getEnvironmentInfo();
    document.documentElement.dataset.browser = browser;
    document.documentElement.dataset.os = platform.os;
    document.documentElement.dataset.manifestVersion = `${manifestVersion}`;
}

async function isAllowedIncognitoAccess() {
    return await new Promise((resolve) => chrome.extension.isAllowedIncognitoAccess(resolve));
}

async function isAllowedFileSchemeAccess() {
    return await new Promise((resolve) => chrome.extension.isAllowedFileSchemeAccess(resolve));
}

async function hasPermissions(permissions) {
    return await new Promise((resolve) => chrome.permissions.contains({permissions}, resolve));
}

async function setPermissionsGranted(permissions, shouldHave) {
    const has = await hasPermissions(permissions);
    if (shouldHave === has) { return has; }

    return await (
        shouldHave ?
        new Promise((resolve) => chrome.permissions.request({permissions}, resolve)) :
        new Promise((resolve) => chrome.permissions.remove({permissions}, (v) => resolve(!v)))
    );
}

(async () => {
    try {
        const documentFocusController = new DocumentFocusController();
        documentFocusController.prepare();

        document.querySelector('#extension-id-example').textContent = chrome.runtime.getURL('/');

        api.forwardLogsToBackend();
        await yomichan.prepare();

        setupEnvironmentInfo();

        const permissionsCheckboxes = [
            document.querySelector('#permission-checkbox-clipboard-read'),
            document.querySelector('#permission-checkbox-allow-in-private-windows'),
            document.querySelector('#permission-checkbox-allow-file-url-access')
        ];

        const permissions = await Promise.all([
            hasPermissions(['clipboardRead']),
            isAllowedIncognitoAccess(),
            isAllowedFileSchemeAccess()
        ]);

        for (let i = 0, ii = permissions.length; i < ii; ++i) {
            permissionsCheckboxes[i].checked = permissions[i];
        }

        permissionsCheckboxes[0].addEventListener('change', (e) => {
            setPermissionsGranted(['clipboardRead'], e.currentTarget.checked);
        });

        await promiseTimeout(100);

        document.documentElement.dataset.loaded = 'true';
    } catch (e) {
        yomichan.logError(e);
    }
})();
