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
 * OptionsUtil
 */

class BackupController {
    constructor(settingsController, modalController) {
        this._settingsController = settingsController;
        this._modalController = modalController;
        this._settingsExportToken = null;
        this._settingsExportRevoke = null;
        this._currentVersion = 0;
        this._settingsResetModal = null;
        this._settingsImportErrorModal = null;
        this._settingsImportWarningModal = null;
        this._optionsUtil = null;
        try {
            this._optionsUtil = new OptionsUtil();
        } catch (e) {
            // NOP
        }
    }

    async prepare() {
        if (this._optionsUtil !== null) {
            await this._optionsUtil.prepare();
        }

        if (this._modalController !== null) {
            this._settingsResetModal = this._modalController.getModal('settings-reset');
            this._settingsImportErrorModal = this._modalController.getModal('settings-import-error');
            this._settingsImportWarningModal = this._modalController.getModal('settings-import-warning');
        }

        this._addNodeEventListener('#settings-export-button', 'click', this._onSettingsExportClick.bind(this), false);
        this._addNodeEventListener('#settings-import-button', 'click', this._onSettingsImportClick.bind(this), false);
        this._addNodeEventListener('#settings-import-file', 'change', this._onSettingsImportFileChange.bind(this), false);
        this._addNodeEventListener('#settings-reset-button', 'click', this._onSettingsResetClick.bind(this), false);
        this._addNodeEventListener('#settings-reset-confirm-button', 'click', this._onSettingsResetConfirmClick.bind(this), false);
    }

    // Private

    _addNodeEventListener(selector, ...args) {
        const node = document.querySelector(selector);
        if (node === null) { return; }

        node.addEventListener(...args);
    }

    _getSettingsExportDateString(date, dateSeparator, dateTimeSeparator, timeSeparator, resolution) {
        const values = [
            date.getUTCFullYear().toString(),
            dateSeparator,
            (date.getUTCMonth() + 1).toString().padStart(2, '0'),
            dateSeparator,
            date.getUTCDate().toString().padStart(2, '0'),
            dateTimeSeparator,
            date.getUTCHours().toString().padStart(2, '0'),
            timeSeparator,
            date.getUTCMinutes().toString().padStart(2, '0'),
            timeSeparator,
            date.getUTCSeconds().toString().padStart(2, '0')
        ];
        return values.slice(0, resolution * 2 - 1).join('');
    }

    async _getSettingsExportData(date) {
        const optionsFull = await this._settingsController.getOptionsFull();
        const environment = await yomichan.api.getEnvironmentInfo();
        const fieldTemplatesDefault = await yomichan.api.getDefaultAnkiFieldTemplates();
        const permissions = await this._settingsController.permissionsUtil.getAllPermissions();

        // Format options
        for (const {options} of optionsFull.profiles) {
            if (options.anki.fieldTemplates === fieldTemplatesDefault || !options.anki.fieldTemplates) {
                options.anki.fieldTemplates = null;
            }
        }

        const data = {
            version: this._currentVersion,
            date: this._getSettingsExportDateString(date, '-', ' ', ':', 6),
            url: chrome.runtime.getURL('/'),
            manifest: chrome.runtime.getManifest(),
            environment,
            userAgent: navigator.userAgent,
            permissions,
            options: optionsFull
        };

        return data;
    }

    _saveBlob(blob, fileName) {
        if (typeof navigator === 'object' && typeof navigator.msSaveBlob === 'function') {
            if (navigator.msSaveBlob(blob)) {
                return;
            }
        }

        const blobUrl = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = fileName;
        a.rel = 'noopener';
        a.target = '_blank';

        const revoke = () => {
            URL.revokeObjectURL(blobUrl);
            a.href = '';
            this._settingsExportRevoke = null;
        };
        this._settingsExportRevoke = revoke;

        a.dispatchEvent(new MouseEvent('click'));
        setTimeout(revoke, 60000);
    }

    async _onSettingsExportClick() {
        if (this._settingsExportRevoke !== null) {
            this._settingsExportRevoke();
            this._settingsExportRevoke = null;
        }

        const date = new Date(Date.now());

        const token = {};
        this._settingsExportToken = token;
        const data = await this._getSettingsExportData(date);
        if (this._settingsExportToken !== token) {
            // A new export has been started
            return;
        }
        this._settingsExportToken = null;

        const fileName = `yomichan-settings-${this._getSettingsExportDateString(date, '-', '-', '-', 6)}.json`;
        const blob = new Blob([JSON.stringify(data, null, 4)], {type: 'application/json'});
        this._saveBlob(blob, fileName);
    }

    _readFileArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error);
            reader.readAsArrayBuffer(file);
        });
    }

    // Importing

    async _settingsImportSetOptionsFull(optionsFull) {
        await this._settingsController.setAllSettings(optionsFull);
    }

    _showSettingsImportError(error) {
        log.error(error);
        document.querySelector('#settings-import-error-message').textContent = `${error}`;
        this._settingsImportErrorModal.setVisible(true);
    }

    async _showSettingsImportWarnings(warnings) {
        const modal = this._settingsImportWarningModal;
        const buttons = document.querySelectorAll('.settings-import-warning-import-button');
        const messageContainer = document.querySelector('#settings-import-warning-message');
        if (buttons.length === 0 || messageContainer === null) {
            return {result: false};
        }

        // Set message
        const fragment = document.createDocumentFragment();
        for (const warning of warnings) {
            const node = document.createElement('li');
            node.textContent = `${warning}`;
            fragment.appendChild(node);
        }
        messageContainer.textContent = '';
        messageContainer.appendChild(fragment);

        // Show modal
        modal.setVisible(true);

        // Wait for modal to close
        return new Promise((resolve) => {
            const onButtonClick = (e) => {
                e.preventDefault();
                complete({
                    result: true,
                    sanitize: e.currentTarget.dataset.importSanitize === 'true'
                });
                modal.setVisible(false);
            };
            const onModalVisibilityChanged = ({visible}) => {
                if (visible) { return; }
                complete({result: false});
            };

            let completed = false;
            const complete = (result) => {
                if (completed) { return; }
                completed = true;

                modal.off('visibilityChanged', onModalVisibilityChanged);
                for (const button of buttons) {
                    button.removeEventListener('click', onButtonClick, false);
                }

                resolve(result);
            };

            // Hook events
            modal.on('visibilityChanged', onModalVisibilityChanged);
            for (const button of buttons) {
                button.addEventListener('click', onButtonClick, false);
            }
        });
    }

    _isLocalhostUrl(urlString) {
        try {
            const url = new URL(urlString);
            switch (url.hostname.toLowerCase()) {
                case 'localhost':
                case '127.0.0.1':
                case '[::1]':
                    switch (url.protocol.toLowerCase()) {
                        case 'http:':
                        case 'https:':
                            return true;
                    }
                    break;
            }
        } catch (e) {
            // NOP
        }
        return false;
    }

    _settingsImportSanitizeProfileOptions(options, dryRun) {
        const warnings = [];

        const anki = options.anki;
        if (isObject(anki)) {
            const fieldTemplates = anki.fieldTemplates;
            if (typeof fieldTemplates === 'string') {
                warnings.push('anki.fieldTemplates contains a non-default value');
                if (!dryRun) {
                    anki.fieldTemplates = null;
                }
            }
            const server = anki.server;
            if (typeof server === 'string' && server.length > 0 && !this._isLocalhostUrl(server)) {
                warnings.push('anki.server uses a non-localhost URL');
                if (!dryRun) {
                    anki.server = 'http://127.0.0.1:8765';
                }
            }
        }

        const audio = options.audio;
        if (isObject(audio)) {
            const customSourceUrl = audio.customSourceUrl;
            if (typeof customSourceUrl === 'string' && customSourceUrl.length > 0 && !this._isLocalhostUrl(customSourceUrl)) {
                warnings.push('audio.customSourceUrl uses a non-localhost URL');
                if (!dryRun) {
                    audio.customSourceUrl = '';
                }
            }
        }

        return warnings;
    }

    _settingsImportSanitizeOptions(optionsFull, dryRun) {
        const warnings = new Set();

        const profiles = optionsFull.profiles;
        if (Array.isArray(profiles)) {
            for (const profile of profiles) {
                if (!isObject(profile)) { continue; }
                const options = profile.options;
                if (!isObject(options)) { continue; }

                const warnings2 = this._settingsImportSanitizeProfileOptions(options, dryRun);
                for (const warning of warnings2) {
                    warnings.add(warning);
                }
            }
        }

        return warnings;
    }

    _utf8Decode(arrayBuffer) {
        try {
            return new TextDecoder('utf-8').decode(arrayBuffer);
        } catch (e) {
            const binaryString = String.fromCharCode.apply(null, new Uint8Array(arrayBuffer));
            return decodeURIComponent(escape(binaryString));
        }
    }

    async _importSettingsFile(file) {
        const dataString = this._utf8Decode(await this._readFileArrayBuffer(file));
        const data = JSON.parse(dataString);

        // Type check
        if (!isObject(data)) {
            throw new Error(`Invalid data type: ${typeof data}`);
        }

        // Version check
        const version = data.version;
        if (!(
            typeof version === 'number' &&
            Number.isFinite(version) &&
            version === Math.floor(version)
        )) {
            throw new Error(`Invalid version: ${version}`);
        }

        if (!(
            version >= 0 &&
            version <= this._currentVersion
        )) {
            throw new Error(`Unsupported version: ${version}`);
        }

        // Verify options exists
        let optionsFull = data.options;
        if (!isObject(optionsFull)) {
            throw new Error(`Invalid options type: ${typeof optionsFull}`);
        }

        // Upgrade options
        optionsFull = await this._optionsUtil.update(optionsFull);

        // Check for warnings
        const sanitizationWarnings = this._settingsImportSanitizeOptions(optionsFull, true);

        // Show sanitization warnings
        if (sanitizationWarnings.size > 0) {
            const {result, sanitize} = await this._showSettingsImportWarnings(sanitizationWarnings);
            if (!result) { return; }

            if (sanitize !== false) {
                this._settingsImportSanitizeOptions(optionsFull, false);
            }
        }

        // Update dictionaries
        await DictionaryController.ensureDictionarySettings(this._settingsController, void 0, optionsFull, false, false);

        // Assign options
        await this._settingsImportSetOptionsFull(optionsFull);
    }

    _onSettingsImportClick() {
        document.querySelector('#settings-import-file').click();
    }

    async _onSettingsImportFileChange(e) {
        const files = e.target.files;
        if (files.length === 0) { return; }

        const file = files[0];
        e.target.value = null;
        try {
            await this._importSettingsFile(file);
        } catch (error) {
            this._showSettingsImportError(error);
        }
    }

    // Resetting

    _onSettingsResetClick() {
        this._settingsResetModal.setVisible(true);
    }

    async _onSettingsResetConfirmClick() {
        this._settingsResetModal.setVisible(false);

        // Get default options
        const optionsFull = this._optionsUtil.getDefault();

        // Update dictionaries
        await DictionaryController.ensureDictionarySettings(this._settingsController, void 0, optionsFull, false, false);

        // Assign options
        try {
            await this._settingsImportSetOptionsFull(optionsFull);
        } catch (e) {
            log.error(e);
        }
    }
}
