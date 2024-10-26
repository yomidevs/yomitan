/*
 * Copyright (C) 2023-2024  Yomitan Authors
 * Copyright (C) 2017-2022  Yomichan Authors
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
import {getAllPermissions, hasRequiredPermissionsForOptions} from '../data/permissions-util.js';
import {HotkeyHelpController} from '../input/hotkey-help-controller.js';

class DisplayController {
    /**
     * @param {import('../comm/api.js').API} api
     */
    constructor(api) {
        /** @type {import('../comm/api.js').API} */
        this._api = api;
        /** @type {?import('settings').Options} */
        this._optionsFull = null;
        /** @type {ThemeController} */
        this._themeController = new ThemeController(document.documentElement);
    }

    /** */
    async prepare() {
        this._themeController.prepare();

        const manifest = chrome.runtime.getManifest();

        this._showExtensionInfo(manifest);
        void this._setupEnvironment();
        this._setupButtonEvents('.action-open-search', 'openSearchPage', chrome.runtime.getURL('/search.html'), this._onSearchClick.bind(this));
        this._setupButtonEvents('.action-open-info', 'openInfoPage', chrome.runtime.getURL('/info.html'));

        const optionsFull = await this._api.optionsGetFull();
        this._optionsFull = optionsFull;

        void this._setupHotkeys();

        const optionsPageUrl = (
            typeof manifest.options_ui === 'object' &&
            manifest.options_ui !== null &&
            typeof manifest.options_ui.page === 'string' ?
            manifest.options_ui.page :
            ''
        );
        this._setupButtonEvents('.action-open-settings', 'openSettingsPage', chrome.runtime.getURL(optionsPageUrl));
        this._setupButtonEvents('.action-open-permissions', null, chrome.runtime.getURL('/permissions.html'));

        const {profiles, profileCurrent} = optionsFull;
        const defaultProfile = (profileCurrent >= 0 && profileCurrent < profiles.length) ? profiles[profileCurrent] : null;
        if (defaultProfile !== null) {
            this._setupOptions(defaultProfile);
        }

        /** @type {NodeListOf<HTMLElement>} */
        const profileSelect = document.querySelectorAll('.action-select-profile');
        for (let i = 0; i < profileSelect.length; i++) {
            profileSelect[i].hidden = (profiles.length <= 1);
        }

        this._updateProfileSelect(profiles, profileCurrent);

        setTimeout(() => {
            document.body.dataset.loaded = 'true';
        }, 10);
    }

    // Private

    /**
     * @param {MouseEvent} e
     */
    _onSearchClick(e) {
        if (!e.shiftKey) { return; }
        e.preventDefault();
        location.href = '/search.html?action-popup=true';
    }

    /**
     * @param {chrome.runtime.Manifest} manifest
     */
    _showExtensionInfo(manifest) {
        const node = document.getElementById('extension-info');
        if (node === null) { return; }

        node.textContent = `${manifest.name} v${manifest.version}`;
    }

    /**
     * @param {string} selector
     * @param {?string} command
     * @param {string} url
     * @param {(event: MouseEvent) => void} [customHandler]
     */
    _setupButtonEvents(selector, command, url, customHandler) {
        /** @type {NodeListOf<HTMLAnchorElement>} */
        const nodes = document.querySelectorAll(selector);
        for (const node of nodes) {
            if (typeof command === 'string') {
                /**
                 * @param {MouseEvent} e
                 */
                const onClick = (e) => {
                    if (e.button !== 0) { return; }
                    if (typeof customHandler === 'function') {
                        const result = customHandler(e);
                        if (typeof result !== 'undefined') { return; }
                    }

                    let mode = 'existingOrNewTab';
                    if (e.ctrlKey) {
                        mode = 'newTab';
                    } else if (e.shiftKey) {
                        mode = 'popup';
                    }

                    void this._api.commandExec(command, {mode: mode});
                    e.preventDefault();
                };
                /**
                 * @param {MouseEvent} e
                 */
                const onAuxClick = (e) => {
                    if (e.button !== 1) { return; }
                    void this._api.commandExec(command, {mode: 'newTab'});
                    e.preventDefault();
                };
                node.addEventListener('click', onClick, false);
                node.addEventListener('auxclick', onAuxClick, false);
            }

            if (typeof url === 'string') {
                node.href = url;
                node.target = '_blank';
                node.rel = 'noopener';
            }
        }
    }

    /** */
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

    /**
     * @returns {Promise<chrome.tabs.Tab|undefined>}
     */
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

    /**
     * @param {import('settings').Profile} profile
     */
    _setupOptions({options}) {
        const extensionEnabled = options.general.enable;
        const onToggleChanged = () => this._api.commandExec('toggleTextScanning');
        for (const toggle of /** @type {NodeListOf<HTMLInputElement>} */ (document.querySelectorAll('.enable-search,.enable-search2'))) {
            toggle.checked = extensionEnabled;
            toggle.addEventListener('change', onToggleChanged, false);
        }
        void this._updateDictionariesEnabledWarnings(options);
        void this._updatePermissionsWarnings(options);

        this._themeController.theme = options.general.popupTheme;
        this._themeController.siteOverride = true;
        this._themeController.updateTheme();
    }

    /** */
    async _setupHotkeys() {
        const hotkeyHelpController = new HotkeyHelpController();
        await hotkeyHelpController.prepare(this._api);

        const {profiles, profileCurrent} = /** @type {import('settings').Options} */ (this._optionsFull);
        const defaultProfile = (profileCurrent >= 0 && profileCurrent < profiles.length) ? profiles[profileCurrent] : null;
        if (defaultProfile !== null) {
            hotkeyHelpController.setOptions(defaultProfile.options);
        }

        hotkeyHelpController.setupNode(document.documentElement);
    }

    /**
     * @param {import('settings').Profile[]} profiles
     * @param {number} profileCurrent
     */
    _updateProfileSelect(profiles, profileCurrent) {
        /** @type {NodeListOf<HTMLSelectElement>} */
        const selects = document.querySelectorAll('.profile-select');
        /** @type {NodeListOf<HTMLElement>} */
        const optionGroups = document.querySelectorAll('.profile-select-option-group');
        for (let i = 0; i < Math.min(selects.length, optionGroups.length); i++) {
            const fragment = document.createDocumentFragment();
            for (let j = 0, jj = profiles.length; j < jj; ++j) {
                const {name} = profiles[j];
                const option = document.createElement('option');
                option.textContent = name;
                option.value = `${j}`;
                fragment.appendChild(option);
            }
            optionGroups[i].textContent = '';
            optionGroups[i].appendChild(fragment);
            selects[i].value = `${profileCurrent}`;

            selects[i].addEventListener('change', this._onProfileSelectChange.bind(this), false);
        }
    }

    /**
     * @param {Event} event
     */
    _onProfileSelectChange(event) {
        const node = /** @type {HTMLInputElement} */ (event.currentTarget);
        const value = Number.parseInt(node.value, 10);
        if (typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= /** @type {import('settings').Options} */ (this._optionsFull).profiles.length) {
            void this._setDefaultProfileIndex(value);
        }
    }

    /**
     * @param {number} value
     */
    async _setDefaultProfileIndex(value) {
        /** @type {import('settings-modifications').ScopedModificationSet} */
        const modification = {
            action: 'set',
            path: 'profileCurrent',
            value,
            scope: 'global',
            optionsContext: null,
        };
        await this._api.modifySettings([modification], 'action-popup');
    }

    /**
     * @param {import('settings').ProfileOptions} options
     */
    async _updateDictionariesEnabledWarnings(options) {
        const noDictionariesEnabledWarnings = /** @type {NodeListOf<HTMLElement>} */ (document.querySelectorAll('.no-dictionaries-enabled-warning'));
        const dictionaries = await this._api.getDictionaryInfo();

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

    /**
     * @param {import('settings').ProfileOptions} options
     */
    async _updatePermissionsWarnings(options) {
        const permissions = await getAllPermissions();
        if (hasRequiredPermissionsForOptions(permissions, options)) { return; }

        const warnings = /** @type {NodeListOf<HTMLElement>} */ (document.querySelectorAll('.action-open-permissions,.permissions-required-warning'));
        for (const node of warnings) {
            node.hidden = false;
        }
    }

    /** @returns {Promise<boolean>} */
    async _isSafari() {
        const {browser} = await this._api.getEnvironmentInfo();
        return browser === 'safari';
    }
}

await Application.main(true, async (application) => {
    void application.api.logIndicatorClear();

    const displayController = new DisplayController(application.api);
    await displayController.prepare();
});
