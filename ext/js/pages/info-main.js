/*
 * Copyright (C) 2023-2024  Yomitan Authors
 * Copyright (C) 2020-2022  Yomichan Authors
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

import {ThemeController} from '../app/theme-controller.js';
import {Application} from '../application.js';
import {promiseTimeout} from '../core/utilities.js';
import {DocumentFocusController} from '../dom/document-focus-controller.js';
import {querySelectorNotNull} from '../dom/query-selector.js';
import {BackupController} from './settings/backup-controller.js';
import {SettingsController} from './settings/settings-controller.js';

/**
 * @param {import('environment').Browser} browser
 * @returns {string}
 */
function getBrowserDisplayName(browser) {
    switch (browser) {
        case 'chrome': return 'Chrome';
        case 'firefox': return 'Firefox';
        case 'firefox-mobile': return 'Firefox for Android';
        case 'edge': return 'Edge';
        case 'edge-legacy': return 'Edge Legacy';
        case 'safari': return 'Safari';
        default: return `${browser}`;
    }
}

/**
 * @param {import('environment').OperatingSystem} os
 * @returns {string}
 */
function getOperatingSystemDisplayName(os) {
    switch (os) {
        case 'mac': return 'Mac OS';
        case 'win': return 'Windows';
        case 'android': return 'Android';
        case 'cros': return 'Chrome OS';
        case 'linux': return 'Linux';
        case 'openbsd': return 'Open BSD';
        case 'unknown': return 'Unknown';
        default: return `${os}`;
    }
}

/**
 * @param {import('../comm/api.js').API} api
 */
async function showAnkiConnectInfo(api) {
    let ankiConnectVersion = null;
    try {
        ankiConnectVersion = await api.getAnkiConnectVersion();
    } catch (e) {
        // NOP
    }

    /** @type {HTMLElement} */
    const ankiVersionElement = querySelectorNotNull(document, '#anki-connect-version');
    /** @type {HTMLElement} */
    const ankiVersionContainerElement = querySelectorNotNull(document, '#anki-connect-version-container');
    /** @type {HTMLElement} */
    const ankiVersionUnknownElement = querySelectorNotNull(document, '#anki-connect-version-unknown-message');

    ankiVersionElement.textContent = (ankiConnectVersion !== null ? `${ankiConnectVersion}` : 'Unknown');
    ankiVersionContainerElement.dataset.hasError = `${ankiConnectVersion === null}`;
    ankiVersionUnknownElement.hidden = (ankiConnectVersion !== null);
}

/**
 * @param {import('../comm/api.js').API} api
 */
async function showDictionaryInfo(api) {
    let dictionaryInfos;
    try {
        dictionaryInfos = await api.getDictionaryInfo();
    } catch (e) {
        return;
    }

    const fragment = document.createDocumentFragment();
    let first = true;
    for (const {title} of dictionaryInfos) {
        if (first) {
            first = false;
        } else {
            fragment.appendChild(document.createTextNode(', '));
        }

        const node = document.createElement('span');
        node.className = 'installed-dictionary';
        node.textContent = title;
        fragment.appendChild(node);
    }

    /** @type {HTMLElement} */
    const noneElement = querySelectorNotNull(document, '#installed-dictionaries-none');

    noneElement.hidden = (dictionaryInfos.length > 0);
    /** @type {HTMLElement} */
    const container = querySelectorNotNull(document, '#installed-dictionaries');
    container.textContent = '';
    container.appendChild(fragment);
}

await Application.main(true, async (application) => {
    const settingsController = new SettingsController(application);
    await settingsController.prepare();

    /** @type {ThemeController} */
    const themeController = new ThemeController(document.documentElement);
    themeController.prepare();
    const optionsFull = await application.api.optionsGetFull();
    const {profiles, profileCurrent} = optionsFull;
    const primaryProfile = (profileCurrent >= 0 && profileCurrent < profiles.length) ? profiles[profileCurrent] : null;
    if (primaryProfile !== null) {
        themeController.theme = primaryProfile.options.general.popupTheme;
        themeController.siteOverride = true;
        themeController.updateTheme();
    }

    document.body.hidden = false;

    const documentFocusController = new DocumentFocusController();
    documentFocusController.prepare();

    const manifest = chrome.runtime.getManifest();
    const language = chrome.i18n.getUILanguage();

    const {userAgent} = navigator;
    const {name, version} = manifest;
    const {browser, platform: {os}} = await application.api.getEnvironmentInfo();

    /** @type {HTMLLinkElement} */
    const thisVersionLink = querySelectorNotNull(document, '#release-notes-this-version-link');
    const {hrefFormat} = thisVersionLink.dataset;
    thisVersionLink.href = typeof hrefFormat === 'string' ? hrefFormat.replace(/\{version\}/g, version) : '';

    /** @type {HTMLElement} */
    const versionElement = querySelectorNotNull(document, '#version');
    /** @type {HTMLElement} */
    const browserElement = querySelectorNotNull(document, '#browser');
    /** @type {HTMLElement} */
    const platformElement = querySelectorNotNull(document, '#platform');
    /** @type {HTMLElement} */
    const languageElement = querySelectorNotNull(document, '#language');
    /** @type {HTMLElement} */
    const userAgentElement = querySelectorNotNull(document, '#user-agent');

    versionElement.textContent = `${name} ${version}`;
    browserElement.textContent = getBrowserDisplayName(browser);
    platformElement.textContent = getOperatingSystemDisplayName(os);
    languageElement.textContent = `${language}`;
    userAgentElement.textContent = userAgent;

    void showAnkiConnectInfo(application.api);
    void showDictionaryInfo(application.api);

    const backupController = new BackupController(settingsController, null);
    await backupController.prepare();

    await promiseTimeout(100);

    document.documentElement.dataset.loaded = 'true';
});
