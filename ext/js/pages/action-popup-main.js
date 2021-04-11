/*
 * Copyright (C) 2017-2021  Yomichan Authors
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
 * HotkeyHelpController
 * PermissionsUtil
 */

class DisplayController {
    constructor() {
        this._optionsFull = null;
        this._permissionsUtil = new PermissionsUtil();
    }

    async prepare() {
        const manifest = chrome.runtime.getManifest();

        this._showExtensionInfo(manifest);
        this._setupEnvironment();
        this._setupButtonEvents('.action-open-search', 'openSearchPage', chrome.runtime.getURL('/search.html'));
        this._setupButtonEvents('.action-open-info', 'openInfoPage', chrome.runtime.getURL('/info.html'));

        const optionsFull = await yomichan.api.optionsGetFull();
        this._optionsFull = optionsFull;

        this._setupHotkeys();

        const optionsPageUrl = manifest.options_ui.page;
        this._setupButtonEvents('.action-open-settings', 'openSettingsPage', chrome.runtime.getURL(optionsPageUrl));
        this._setupButtonEvents('.action-open-permissions', null, chrome.runtime.getURL('/permissions.html'));

        const {profiles, profileCurrent} = optionsFull;
        const primaryProfile = (profileCurrent >= 0 && profileCurrent < profiles.length) ? profiles[profileCurrent] : null;
        if (primaryProfile !== null) {
            this._setupOptions(primaryProfile);
        }

        document.querySelector('.action-select-profile').hidden = (profiles.length <= 1);

        this._updateProfileSelect(profiles, profileCurrent);

        setTimeout(() => {
            document.body.dataset.loaded = 'true';
        }, 10);
    }

    // Private

    _showExtensionInfo(manifest) {
        const node = document.getElementById('extension-info');
        if (node === null) { return; }

        node.textContent = `${manifest.name} v${manifest.version}`;
    }

    _setupButtonEvents(selector, command, url) {
        const nodes = document.querySelectorAll(selector);
        for (const node of nodes) {
            if (typeof command === 'string') {
                node.addEventListener('click', (e) => {
                    if (e.button !== 0) { return; }
                    yomichan.api.commandExec(command, {mode: e.ctrlKey ? 'newTab' : 'existingOrNewTab'});
                    e.preventDefault();
                }, false);
                node.addEventListener('auxclick', (e) => {
                    if (e.button !== 1) { return; }
                    yomichan.api.commandExec(command, {mode: 'newTab'});
                    e.preventDefault();
                }, false);
            }

            if (typeof url === 'string') {
                node.href = url;
                node.target = '_blank';
                node.rel = 'noopener';
            }
        }
    }

    async _setupEnvironment() {
        const urlSearchParams = new URLSearchParams(location.search);
        let mode = urlSearchParams.get('mode');
        switch (mode) {
            case 'full':
            case 'mini':
                break;
            default:
                {
                    let tab;
                    try {
                        tab = await this._getCurrentTab();
                        // Safari assigns a tab object to the popup, other browsers do not
                        if (tab && await this._isSafari()) {
                            tab = void 0;
                        }
                    } catch (e) {
                        // NOP
                    }
                    mode = (tab ? 'full' : 'mini');
                }
                break;
        }

        document.documentElement.dataset.mode = mode;
    }

    _getCurrentTab() {
        return new Promise((resolve, reject) => {
            chrome.tabs.getCurrent((result) => {
                const e = chrome.runtime.lastError;
                if (e) {
                    reject(new Error(e.message));
                } else {
                    resolve(result);
                }
            });
        });
    }

    _setupOptions({options}) {
        const extensionEnabled = options.general.enable;
        const onToggleChanged = () => yomichan.api.commandExec('toggleTextScanning');
        for (const toggle of document.querySelectorAll('#enable-search,#enable-search2')) {
            toggle.checked = extensionEnabled;
            toggle.addEventListener('change', onToggleChanged, false);
        }
        this._updateDictionariesEnabledWarnings(options);
        this._updatePermissionsWarnings(options);
    }

    async _setupHotkeys() {
        const hotkeyHelpController = new HotkeyHelpController();
        await hotkeyHelpController.prepare();

        const {profiles, profileCurrent} = this._optionsFull;
        const primaryProfile = (profileCurrent >= 0 && profileCurrent < profiles.length) ? profiles[profileCurrent] : null;
        if (primaryProfile !== null) {
            hotkeyHelpController.setOptions(primaryProfile.options);
        }

        hotkeyHelpController.setupNode(document.documentElement);
    }

    _updateProfileSelect(profiles, profileCurrent) {
        const select = document.querySelector('#profile-select');
        const optionGroup = document.querySelector('#profile-select-option-group');
        const fragment = document.createDocumentFragment();
        for (let i = 0, ii = profiles.length; i < ii; ++i) {
            const {name} = profiles[i];
            const option = document.createElement('option');
            option.textContent = name;
            option.value = `${i}`;
            fragment.appendChild(option);
        }
        optionGroup.textContent = '';
        optionGroup.appendChild(fragment);
        select.value = `${profileCurrent}`;

        select.addEventListener('change', this._onProfileSelectChange.bind(this), false);
    }

    _onProfileSelectChange(e) {
        const value = parseInt(e.currentTarget.value, 10);
        if (typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= this._optionsFull.profiles.length) {
            this._setPrimaryProfileIndex(value);
        }
    }

    async _setPrimaryProfileIndex(value) {
        return await yomichan.api.modifySettings(
            [{
                action: 'set',
                path: 'profileCurrent',
                value,
                scope: 'global'
            }]
        );
    }

    async _updateDictionariesEnabledWarnings(options) {
        const noDictionariesEnabledWarnings = document.querySelectorAll('.no-dictionaries-enabled-warning');
        const dictionaries = await yomichan.api.getDictionaryInfo();

        const enabledDictionaries = new Set();
        for (const {name, enabled} of options.dictionaries) {
            if (enabled) {
                enabledDictionaries.add(name);
            }
        }

        let enabledCount = 0;
        for (const {title} of dictionaries) {
            if (enabledDictionaries.has(title)) {
                ++enabledCount;
            }
        }

        const hasEnabledDictionary = (enabledCount > 0);
        for (const node of noDictionariesEnabledWarnings) {
            node.hidden = hasEnabledDictionary;
        }
    }

    async _updatePermissionsWarnings(options) {
        const permissions = await this._permissionsUtil.getAllPermissions();
        if (this._permissionsUtil.hasRequiredPermissionsForOptions(permissions, options)) { return; }

        const warnings = document.querySelectorAll('.action-open-permissions,.permissions-required-warning');
        for (const node of warnings) {
            node.hidden = false;
        }
    }

    async _isSafari() {
        const {browser} = await yomichan.api.getEnvironmentInfo();
        return browser === 'safari';
    }
}

(async () => {
    await yomichan.prepare();

    yomichan.api.logIndicatorClear();

    const displayController = new DisplayController();
    displayController.prepare();

    yomichan.ready();
})();
