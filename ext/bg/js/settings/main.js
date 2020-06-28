/*
 * Copyright (C) 2016-2020  Yomichan Authors
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
 * AnkiController
 * AnkiTemplatesController
 * AudioController
 * ClipboardPopupsController
 * DictionaryController
 * GenericSettingController
 * PopupPreviewController
 * ProfileController
 * SettingsBackup
 * SettingsController
 * StorageController
 * api
 */

function showExtensionInformation() {
    const node = document.getElementById('extension-info');
    if (node === null) { return; }

    const manifest = chrome.runtime.getManifest();
    node.textContent = `${manifest.name} v${manifest.version}`;
}

async function settingsPopulateModifierKeys() {
    const scanModifierKeySelect = document.querySelector('#scan-modifier-key');
    scanModifierKeySelect.textContent = '';

    const environment = await api.getEnvironmentInfo();
    const modifierKeys = [
        {value: 'none', name: 'None'},
        ...environment.modifiers.keys
    ];
    for (const {value, name} of modifierKeys) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = name;
        scanModifierKeySelect.appendChild(option);
    }
}

async function setupEnvironmentInfo() {
    const {browser, platform} = await api.getEnvironmentInfo();
    document.documentElement.dataset.browser = browser;
    document.documentElement.dataset.operatingSystem = platform.os;
}


(async () => {
    api.forwardLogsToBackend();
    await yomichan.ready();

    setupEnvironmentInfo();
    showExtensionInformation();
    settingsPopulateModifierKeys();

    const optionsFull = await api.optionsGetFull();

    const settingsController = new SettingsController(optionsFull.profileCurrent);
    settingsController.prepare();

    const storageController = new StorageController();
    storageController.prepare();

    const genericSettingController = new GenericSettingController(settingsController);
    genericSettingController.prepare();

    const clipboardPopupsController = new ClipboardPopupsController(settingsController);
    clipboardPopupsController.prepare();

    const popupPreviewController = new PopupPreviewController(settingsController);
    popupPreviewController.prepare();

    const audioController = new AudioController(settingsController);
    audioController.prepare();

    const profileController = new ProfileController(settingsController);
    profileController.prepare();

    const dictionaryController = new DictionaryController(settingsController, storageController);
    dictionaryController.prepare();

    const ankiController = new AnkiController(settingsController);
    ankiController.prepare();

    const ankiTemplatesController = new AnkiTemplatesController(settingsController, ankiController);
    ankiTemplatesController.prepare();

    const settingsBackup = new SettingsBackup(settingsController);
    settingsBackup.prepare();
})();
