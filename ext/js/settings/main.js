/*
 * Copyright (C) 2016-2021  Yomichan Authors
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
 * BackupController
 * DictionaryController
 * DictionaryImportController
 * GenericSettingController
 * ModalController
 * PermissionsToggleController
 * PopupPreviewController
 * ProfileController
 * ScanInputsController
 * ScanInputsSimpleController
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

async function setupEnvironmentInfo() {
    const {browser, platform} = await api.getEnvironmentInfo();
    document.documentElement.dataset.browser = browser;
    document.documentElement.dataset.operatingSystem = platform.os;
}


(async () => {
    try {
        api.forwardLogsToBackend();
        await yomichan.backendReady();

        setupEnvironmentInfo();
        showExtensionInformation();

        const optionsFull = await api.optionsGetFull();

        const modalController = new ModalController();
        modalController.prepare();

        const settingsController = new SettingsController(optionsFull.profileCurrent);
        settingsController.prepare();

        const storageController = new StorageController();
        storageController.prepare();

        const genericSettingController = new GenericSettingController(settingsController);
        genericSettingController.prepare();

        const permissionsToggleController = new PermissionsToggleController(settingsController);
        permissionsToggleController.prepare();

        const popupPreviewController = new PopupPreviewController(settingsController);
        popupPreviewController.prepare();

        const audioController = new AudioController(settingsController);
        audioController.prepare();

        const profileController = new ProfileController(settingsController, modalController);
        profileController.prepare();

        const dictionaryController = new DictionaryController(settingsController, modalController, storageController, null);
        dictionaryController.prepare();

        const dictionaryImportController = new DictionaryImportController(settingsController, modalController, storageController, null);
        dictionaryImportController.prepare();

        const ankiController = new AnkiController(settingsController);
        ankiController.prepare();

        const ankiTemplatesController = new AnkiTemplatesController(settingsController, modalController, ankiController);
        ankiTemplatesController.prepare();

        const settingsBackup = new BackupController(settingsController, modalController);
        settingsBackup.prepare();

        const scanInputsController = new ScanInputsController(settingsController);
        scanInputsController.prepare();

        const simpleScanningInputController = new ScanInputsSimpleController(settingsController);
        simpleScanningInputController.prepare();

        yomichan.ready();
    } catch (e) {
        yomichan.logError(e);
    }
})();
