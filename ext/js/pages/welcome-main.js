/*
 * Copyright (C) 2019-2021  Yomichan Authors
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
 * DictionaryController
 * DictionaryImportController
 * DocumentFocusController
 * GenericSettingController
 * ModalController
 * ScanInputsSimpleController
 * SettingsController
 * SettingsDisplayController
 * StatusFooter
 */

async function setupEnvironmentInfo() {
    const {manifest_version: manifestVersion} = chrome.runtime.getManifest();
    const {browser, platform} = await yomichan.api.getEnvironmentInfo();
    document.documentElement.dataset.browser = browser;
    document.documentElement.dataset.os = platform.os;
    document.documentElement.dataset.manifestVersion = `${manifestVersion}`;
}

async function setupGenericSettingsController(genericSettingController) {
    await genericSettingController.prepare();
    await genericSettingController.refresh();
}

(async () => {
    try {
        const documentFocusController = new DocumentFocusController();
        documentFocusController.prepare();

        const statusFooter = new StatusFooter(document.querySelector('.status-footer-container'));
        statusFooter.prepare();

        await yomichan.prepare();

        setupEnvironmentInfo();

        const optionsFull = await yomichan.api.optionsGetFull();

        const preparePromises = [];

        const modalController = new ModalController();
        modalController.prepare();

        const settingsController = new SettingsController(optionsFull.profileCurrent);
        settingsController.prepare();

        const dictionaryController = new DictionaryController(settingsController, modalController, statusFooter);
        dictionaryController.prepare();

        const dictionaryImportController = new DictionaryImportController(settingsController, modalController, statusFooter);
        dictionaryImportController.prepare();

        const genericSettingController = new GenericSettingController(settingsController);
        preparePromises.push(setupGenericSettingsController(genericSettingController));

        const simpleScanningInputController = new ScanInputsSimpleController(settingsController);
        simpleScanningInputController.prepare();

        await Promise.all(preparePromises);

        document.documentElement.dataset.loaded = 'true';

        const settingsDisplayController = new SettingsDisplayController(settingsController, modalController);
        settingsDisplayController.prepare();
    } catch (e) {
        log.error(e);
    }
})();
