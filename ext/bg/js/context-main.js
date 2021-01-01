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
 * api
 */

class DisplayController {
    constructor() {
        this._optionsFull = null;
    }

    async prepare() {
        const manifest = chrome.runtime.getManifest();

        this._showExtensionInfo(manifest);
        this._setupEnvironment();
        this._setupButtonEvents('.action-open-search', 'search', chrome.runtime.getURL('/bg/search.html'));
        this._setupButtonEvents('.action-open-help', 'help', chrome.runtime.getURL('/bg/info.html'));

        const optionsFull = await api.optionsGetFull();
        this._optionsFull = optionsFull;

        const optionsPageUrl = optionsFull.global.useSettingsV2 ? '/bg/settings2.html' : manifest.options_ui.page;
        this._setupButtonEvents('.action-open-options', 'options', chrome.runtime.getURL(optionsPageUrl));

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
            node.addEventListener('click', (e) => {
                if (e.button !== 0) { return; }
                api.commandExec(command, {mode: e.ctrlKey ? 'newTab' : 'existingOrNewTab'});
                e.preventDefault();
            }, false);
            node.addEventListener('auxclick', (e) => {
                if (e.button !== 1) { return; }
                api.commandExec(command, {mode: 'newTab'});
                e.preventDefault();
            }, false);

            if (typeof url === 'string') {
                node.href = url;
                node.target = '_blank';
                node.rel = 'noopener';
            }
        }
    }

    async _setupEnvironment() {
        // Firefox mobile opens this page as a full webpage.
        const {browser} = await api.getEnvironmentInfo();
        document.documentElement.dataset.mode = (browser === 'firefox-mobile' ? 'full' : 'mini');
    }

    _setupOptions({options}) {
        const extensionEnabled = options.general.enable;
        const onToggleChanged = () => api.commandExec('toggle');
        for (const toggle of document.querySelectorAll('#enable-search,#enable-search2')) {
            toggle.checked = extensionEnabled;
            toggle.addEventListener('change', onToggleChanged, false);
        }
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
        return await api.modifySettings(
            [{
                action: 'set',
                path: 'profileCurrent',
                value,
                scope: 'global'
            }]
        );
    }
}

(async () => {
    api.forwardLogsToBackend();
    await yomichan.backendReady();

    api.logIndicatorClear();

    const displayController = new DisplayController();
    displayController.prepare();

    yomichan.ready();
})();
