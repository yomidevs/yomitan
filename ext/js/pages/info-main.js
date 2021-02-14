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
 * BackupController
 * DocumentFocusController
 * SettingsController
 */

function getBrowserDisplayName(browser) {
    switch (browser) {
        case 'chrome': return 'Chrome';
        case 'firefox': return 'Firefox';
        case 'firefox-mobile': return 'Firefox for Android';
        case 'edge': return 'Edge';
        case 'edge-legacy': return 'Edge Legacy';
        default: return `${browser}`;
    }
}

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

(async () => {
    try {
        const documentFocusController = new DocumentFocusController();
        documentFocusController.prepare();

        const manifest = chrome.runtime.getManifest();
        const language = chrome.i18n.getUILanguage();

        await yomichan.prepare();

        const {userAgent} = navigator;
        const {name, version} = manifest;
        const {browser, platform: {os}} = await yomichan.api.getEnvironmentInfo();

        const thisVersionLink = document.querySelector('#release-notes-this-version-link');
        thisVersionLink.href = thisVersionLink.dataset.hrefFormat.replace(/\{version\}/g, version);

        document.querySelector('#version').textContent = `${name} ${version}`;
        document.querySelector('#browser').textContent = getBrowserDisplayName(browser);
        document.querySelector('#platform').textContent = getOperatingSystemDisplayName(os);
        document.querySelector('#language').textContent = `${language}`;
        document.querySelector('#user-agent').textContent = userAgent;

        (async () => {
            let ankiConnectVersion = null;
            try {
                ankiConnectVersion = await yomichan.api.getAnkiConnectVersion();
            } catch (e) {
                // NOP
            }

            document.querySelector('#anki-connect-version').textContent = (ankiConnectVersion !== null ? `${ankiConnectVersion}` : 'Unknown');
            document.querySelector('#anki-connect-version-container').hasError = `${ankiConnectVersion === null}`;
            document.querySelector('#anki-connect-version-unknown-message').hidden = (ankiConnectVersion !== null);
        })();

        (async () => {
            let dictionaryInfos;
            try {
                dictionaryInfos = await yomichan.api.getDictionaryInfo();
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

            document.querySelector('#installed-dictionaries-none').hidden = (dictionaryInfos.length !== 0);
            const container = document.querySelector('#installed-dictionaries');
            container.textContent = '';
            container.appendChild(fragment);
        })();

        const settingsController = new SettingsController();
        settingsController.prepare();

        const backupController = new BackupController(settingsController, null);
        await backupController.prepare();

        await promiseTimeout(100);

        document.documentElement.dataset.loaded = 'true';
    } catch (e) {
        log.error(e);
    }
})();
