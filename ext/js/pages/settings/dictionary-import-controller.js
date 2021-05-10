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
 * DictionaryController
 * DictionaryDatabase
 * DictionaryImporter
 */

class DictionaryImportController {
    constructor(settingsController, modalController, statusFooter) {
        this._settingsController = settingsController;
        this._modalController = modalController;
        this._statusFooter = statusFooter;
        this._modifying = false;
        this._purgeButton = null;
        this._purgeConfirmButton = null;
        this._importFileButton = null;
        this._importFileInput = null;
        this._purgeConfirmModal = null;
        this._errorContainer = null;
        this._spinner = null;
        this._purgeNotification = null;
        this._errorToStringOverrides = [
            [
                'A mutation operation was attempted on a database that did not allow mutations.',
                'Access to IndexedDB appears to be restricted. Firefox seems to require that the history preference is set to "Remember history" before IndexedDB use of any kind is allowed.'
            ],
            [
                'The operation failed for reasons unrelated to the database itself and not covered by any other error code.',
                'Unable to access IndexedDB due to a possibly corrupt user profile. Try using the "Refresh Firefox" feature to reset your user profile.'
            ]
        ];
    }

    async prepare() {
        this._purgeButton = document.querySelector('#dictionary-delete-all-button');
        this._purgeConfirmButton = document.querySelector('#dictionary-confirm-delete-all-button');
        this._importFileButton = document.querySelector('#dictionary-import-file-button');
        this._importFileInput = document.querySelector('#dictionary-import-file-input');
        this._purgeConfirmModal = this._modalController.getModal('dictionary-confirm-delete-all');
        this._errorContainer = document.querySelector('#dictionary-error');
        this._spinner = document.querySelector('#dictionary-spinner');
        this._purgeNotification = document.querySelector('#dictionary-delete-all-status');

        this._purgeButton.addEventListener('click', this._onPurgeButtonClick.bind(this), false);
        this._purgeConfirmButton.addEventListener('click', this._onPurgeConfirmButtonClick.bind(this), false);
        this._importFileButton.addEventListener('click', this._onImportButtonClick.bind(this), false);
        this._importFileInput.addEventListener('change', this._onImportFileChange.bind(this), false);
    }

    // Private

    _onImportButtonClick() {
        this._importFileInput.click();
    }

    _onPurgeButtonClick(e) {
        e.preventDefault();
        this._purgeConfirmModal.setVisible(true);
    }

    _onPurgeConfirmButtonClick(e) {
        e.preventDefault();
        this._purgeConfirmModal.setVisible(false);
        this._purgeDatabase();
    }

    _onImportFileChange(e) {
        const node = e.currentTarget;
        const files = [...node.files];
        node.value = null;
        this._importDictionaries(files);
    }

    async _purgeDatabase() {
        if (this._modifying) { return; }

        const purgeNotification = this._purgeNotification;
        const prevention = this._preventPageExit();

        try {
            this._setModifying(true);
            this._hideErrors();
            this._setSpinnerVisible(true);
            if (purgeNotification !== null) { purgeNotification.hidden = false; }

            await yomichan.api.purgeDatabase();
            const errors = await this._clearDictionarySettings();

            if (errors.length > 0) {
                this._showErrors(errors);
            }
        } catch (error) {
            this._showErrors([error]);
        } finally {
            prevention.end();
            if (purgeNotification !== null) { purgeNotification.hidden = true; }
            this._setSpinnerVisible(false);
            this._setModifying(false);
            this._triggerStorageChanged();
        }
    }

    async _importDictionaries(files) {
        if (this._modifying) { return; }

        const statusFooter = this._statusFooter;
        const importInfo = document.querySelector('#dictionary-import-info');
        const progressSelector = '.dictionary-import-progress';
        const progressContainers = document.querySelectorAll(`#dictionaries-modal ${progressSelector}`);
        const progressBars = document.querySelectorAll(`${progressSelector} .progress-bar`);
        const infoLabels = document.querySelectorAll(`${progressSelector} .progress-info`);
        const statusLabels = document.querySelectorAll(`${progressSelector} .progress-status`);

        const prevention = this._preventPageExit();

        try {
            this._setModifying(true);
            this._hideErrors();
            this._setSpinnerVisible(true);

            for (const progress of progressContainers) { progress.hidden = false; }

            const optionsFull = await this._settingsController.getOptionsFull();
            const importDetails = {
                prefixWildcardsSupported: optionsFull.global.database.prefixWildcardsSupported
            };

            const onProgress = (total, current) => {
                const percent = (current / total * 100.0);
                const cssString = `${percent}%`;
                const statusString = `${percent.toFixed(0)}%`;
                for (const progressBar of progressBars) { progressBar.style.width = cssString; }
                for (const label of statusLabels) { label.textContent = statusString; }
                this._triggerStorageChanged();
            };

            const fileCount = files.length;
            for (let i = 0; i < fileCount; ++i) {
                if (importInfo !== null && fileCount > 1) {
                    importInfo.hidden = false;
                    importInfo.textContent = `(${i + 1} of ${fileCount})`;
                }

                onProgress(1, 0);

                const labelText = `Importing dictionary${fileCount > 1 ? ` (${i + 1} of ${fileCount})` : ''}...`;
                for (const label of infoLabels) { label.textContent = labelText; }
                if (statusFooter !== null) { statusFooter.setTaskActive(progressSelector, true); }

                await this._importDictionary(files[i], importDetails, onProgress);
            }
        } catch (err) {
            this._showErrors([err]);
        } finally {
            prevention.end();
            for (const progress of progressContainers) { progress.hidden = true; }
            if (statusFooter !== null) { statusFooter.setTaskActive(progressSelector, false); }
            if (importInfo !== null) {
                importInfo.textContent = '';
                importInfo.hidden = true;
            }
            this._setSpinnerVisible(false);
            this._setModifying(false);
            this._triggerStorageChanged();
        }
    }

    async _importDictionary(file, importDetails, onProgress) {
        const dictionaryDatabase = await this._getPreparedDictionaryDatabase();
        try {
            const dictionaryImporter = new DictionaryImporter();
            const archiveContent = await this._readFile(file);
            const {result, errors} = await dictionaryImporter.importDictionary(dictionaryDatabase, archiveContent, importDetails, onProgress);
            yomichan.api.triggerDatabaseUpdated('dictionary', 'import');
            const errors2 = await this._addDictionarySettings(result.sequenced, result.title);

            if (errors.length > 0) {
                const allErrors = [...errors, ...errors2];
                allErrors.push(new Error(`Dictionary may not have been imported properly: ${allErrors.length} error${allErrors.length === 1 ? '' : 's'} reported.`));
                this._showErrors(allErrors);
            }
        } finally {
            dictionaryDatabase.close();
        }
    }

    async _addDictionarySettings(sequenced, title) {
        const optionsFull = await this._settingsController.getOptionsFull();
        const targets = [];
        const profileCount = optionsFull.profiles.length;
        for (let i = 0; i < profileCount; ++i) {
            const {options} = optionsFull.profiles[i];
            const value = DictionaryController.createDefaultDictionarySettings(title, true);
            const path1 = `profiles[${i}].options.dictionaries`;
            targets.push({action: 'push', path: path1, items: [value]});

            if (sequenced && options.general.mainDictionary === '') {
                const path2 = `profiles[${i}].options.general.mainDictionary`;
                targets.push({action: 'set', path: path2, value: title});
            }
        }
        return await this._modifyGlobalSettings(targets);
    }

    async _clearDictionarySettings() {
        const optionsFull = await this._settingsController.getOptionsFull();
        const targets = [];
        const profileCount = optionsFull.profiles.length;
        for (let i = 0; i < profileCount; ++i) {
            const path1 = `profiles[${i}].options.dictionaries`;
            targets.push({action: 'set', path: path1, value: []});
            const path2 = `profiles[${i}].options.general.mainDictionary`;
            targets.push({action: 'set', path: path2, value: ''});
        }
        return await this._modifyGlobalSettings(targets);
    }

    _setSpinnerVisible(visible) {
        if (this._spinner !== null) {
            this._spinner.hidden = !visible;
        }
    }

    _preventPageExit() {
        return this._settingsController.preventPageExit();
    }

    _showErrors(errors) {
        const uniqueErrors = new Map();
        for (const error of errors) {
            log.error(error);
            const errorString = this._errorToString(error);
            let count = uniqueErrors.get(errorString);
            if (typeof count === 'undefined') {
                count = 0;
            }
            uniqueErrors.set(errorString, count + 1);
        }

        const fragment = document.createDocumentFragment();
        for (const [e, count] of uniqueErrors.entries()) {
            const div = document.createElement('p');
            if (count > 1) {
                div.textContent = `${e} `;
                const em = document.createElement('em');
                em.textContent = `(${count})`;
                div.appendChild(em);
            } else {
                div.textContent = `${e}`;
            }
            fragment.appendChild(div);
        }

        this._errorContainer.appendChild(fragment);
        this._errorContainer.hidden = false;
    }

    _hideErrors() {
        this._errorContainer.textContent = '';
        this._errorContainer.hidden = true;
    }

    _readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error);
            reader.readAsBinaryString(file);
        });
    }

    _errorToString(error) {
        error = (typeof error.toString === 'function' ? error.toString() : `${error}`);

        for (const [match, newErrorString] of this._errorToStringOverrides) {
            if (error.includes(match)) {
                return newErrorString;
            }
        }

        return error;
    }

    _setModifying(value) {
        this._modifying = value;
        this._setButtonsEnabled(!value);
    }

    _setButtonsEnabled(value) {
        value = !value;
        for (const node of document.querySelectorAll('.dictionary-database-mutating-input')) {
            node.disabled = value;
        }
    }

    async _getPreparedDictionaryDatabase() {
        const dictionaryDatabase = new DictionaryDatabase();
        await dictionaryDatabase.prepare();
        return dictionaryDatabase;
    }

    async _modifyGlobalSettings(targets) {
        const results = await this._settingsController.modifyGlobalSettings(targets);
        const errors = [];
        for (const {error} of results) {
            if (typeof error !== 'undefined') {
                errors.push(deserializeError(error));
            }
        }
        return errors;
    }

    _triggerStorageChanged() {
        yomichan.trigger('storageChanged');
    }
}
