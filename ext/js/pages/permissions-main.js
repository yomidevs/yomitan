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
 * PermissionsToggleController
 * SettingsController
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

function setupPermissionsToggles() {
    const manifest = chrome.runtime.getManifest();
    let optionalPermissions = manifest.optional_permissions;
    if (!Array.isArray(optionalPermissions)) { optionalPermissions = []; }
    optionalPermissions = new Set(optionalPermissions);

    const hasAllPermisions = (set, values) => {
        for (const value of values) {
            if (!set.has(value)) { return false; }
        }
        return true;
    };

    for (const toggle of document.querySelectorAll('.permissions-toggle')) {
        let permissions = toggle.dataset.requiredPermissions;
        permissions = (typeof permissions === 'string' && permissions.length > 0 ? permissions.split(' ') : []);
        toggle.disabled = !hasAllPermisions(optionalPermissions, permissions);
    }
}

(async () => {
    try {
        const documentFocusController = new DocumentFocusController();
        documentFocusController.prepare();

        setupPermissionsToggles();

        for (const node of document.querySelectorAll('.extension-id-example')) {
            node.textContent = chrome.runtime.getURL('/');
        }

        api.prepare();
        await yomichan.prepare();

        setupEnvironmentInfo();

        const permissionsCheckboxes = [
            document.querySelector('#permission-checkbox-allow-in-private-windows'),
            document.querySelector('#permission-checkbox-allow-file-url-access')
        ];

        const permissions = await Promise.all([
            isAllowedIncognitoAccess(),
            isAllowedFileSchemeAccess()
        ]);

        for (let i = 0, ii = permissions.length; i < ii; ++i) {
            permissionsCheckboxes[i].checked = permissions[i];
        }

        const settingsController = new SettingsController(0);
        settingsController.prepare();

        const permissionsToggleController = new PermissionsToggleController(settingsController);
        permissionsToggleController.prepare();

        await promiseTimeout(100);

        document.documentElement.dataset.loaded = 'true';
    } catch (e) {
        yomichan.logError(e);
    }
})();
