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

function hasPermissions(permissions) {
    return new Promise((resolve) => chrome.permissions.contains({permissions}, (result) => {
        const e = chrome.runtime.lastError;
        resolve(!e && result);
    }));
}

function setPermissionsGranted(permissions, shouldHave) {
    return (
        shouldHave ?
        new Promise((resolve, reject) => chrome.permissions.request({permissions}, (result) => {
            const e = chrome.runtime.lastError;
            if (e) {
                reject(new Error(e.message));
            } else {
                resolve(result);
            }
        })) :
        new Promise((resolve, reject) => chrome.permissions.remove({permissions}, (result) => {
            const e = chrome.runtime.lastError;
            if (e) {
                reject(new Error(e.message));
            } else {
                resolve(!result);
            }
        }))
    );
}

function setupPermissionCheckbox(checkbox, permissions) {
    checkbox.addEventListener('change', (e) => {
        updatePermissionCheckbox(checkbox, permissions, e.currentTarget.checked);
    }, false);
}

async function updatePermissionCheckbox(checkbox, permissions, value) {
    checkbox.checked = !value;
    const hasPermission = await setPermissionsGranted(permissions, value);
    checkbox.checked = hasPermission;
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

        setupPermissionCheckbox(permissionsCheckboxes[0], ['clipboardRead']);

        await promiseTimeout(100);

        document.documentElement.dataset.loaded = 'true';
    } catch (e) {
        yomichan.logError(e);
    }
})();
