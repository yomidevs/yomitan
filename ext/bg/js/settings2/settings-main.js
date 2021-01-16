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
 * AnkiController
 * AnkiTemplatesController
 * AudioController
 * BackupController
 * ClipboardPopupsController
 * DictionaryController
 * DictionaryImportController
 * DocumentFocusController
 * GenericSettingController
 * KeyboardShortcutController
 * ModalController
 * NestedPopupsController
 * PopupPreviewController
 * PopupWindowController
 * ProfileController
 * ScanInputsController
 * ScanInputsSimpleController
 * SecondarySearchDictionaryController
 * SentenceTerminationCharactersController
 * SettingsController
 * SettingsDisplayController
 * StatusFooter
 * StorageController
 * TranslationTextReplacementsController
 * api
 */

async function setupEnvironmentInfo() {
    const {manifest_version: manifestVersion} = chrome.runtime.getManifest();
    const {browser, platform} = await api.getEnvironmentInfo();
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

        api.forwardLogsToBackend();
        await yomichan.prepare();

        setupEnvironmentInfo();

        const optionsFull = await api.optionsGetFull();

        const preparePromises = [];

        const modalController = new ModalController();
        modalController.prepare();

        const settingsController = new SettingsController(optionsFull.profileCurrent);
        settingsController.prepare();

        const storageController = new StorageController();
        storageController.prepare();

        const dictionaryController = new DictionaryController(settingsController, modalController, storageController, statusFooter);
        dictionaryController.prepare();

        const dictionaryImportController = new DictionaryImportController(settingsController, modalController, storageController, statusFooter);
        dictionaryImportController.prepare();

        const genericSettingController = new GenericSettingController(settingsController);
        preparePromises.push(setupGenericSettingsController(genericSettingController));

        const audioController = new AudioController(settingsController);
        audioController.prepare();

        const profileController = new ProfileController(settingsController, modalController);
        profileController.prepare();

        const settingsBackup = new BackupController(settingsController, modalController);
        settingsBackup.prepare();

        const ankiController = new AnkiController(settingsController);
        ankiController.prepare();

        const ankiTemplatesController = new AnkiTemplatesController(settingsController, modalController, ankiController);
        ankiTemplatesController.prepare();

        const popupPreviewController = new PopupPreviewController(settingsController);
        popupPreviewController.prepare();

        const scanInputsController = new ScanInputsController(settingsController);
        scanInputsController.prepare();

        const simpleScanningInputController = new ScanInputsSimpleController(settingsController);
        simpleScanningInputController.prepare();

        const nestedPopupsController = new NestedPopupsController(settingsController);
        nestedPopupsController.prepare();

        const clipboardPopupsController = new ClipboardPopupsController(settingsController);
        clipboardPopupsController.prepare();

        const secondarySearchDictionaryController = new SecondarySearchDictionaryController(settingsController);
        secondarySearchDictionaryController.prepare();

        const translationTextReplacementsController = new TranslationTextReplacementsController(settingsController);
        translationTextReplacementsController.prepare();

        const sentenceTerminationCharactersController = new SentenceTerminationCharactersController(settingsController);
        sentenceTerminationCharactersController.prepare();

        const keyboardShortcutController = new KeyboardShortcutController(settingsController);
        keyboardShortcutController.prepare();

        const popupWindowController = new PopupWindowController();
        popupWindowController.prepare();

        await Promise.all(preparePromises);

        document.documentElement.dataset.loaded = 'true';

        const settingsDisplayController = new SettingsDisplayController(settingsController, modalController);
        settingsDisplayController.prepare();
    } catch (e) {
        yomichan.logError(e);
    }
})();
