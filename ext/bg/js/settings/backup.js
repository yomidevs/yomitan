/*
 * Copyright (C) 2019-2020  Alex Yatskov <alex@foosoft.net>
 * Author: Alex Yatskov <alex@foosoft.net>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

/*global apiOptionsGetFull, apiGetEnvironmentInfo, apiGetDefaultAnkiFieldTemplates
utilBackend, utilIsolate, utilBackgroundIsolate, utilReadFileArrayBuffer
optionsGetDefault, optionsUpdateVersion*/

// Exporting

let _settingsExportToken = null;
let _settingsExportRevoke = null;
const SETTINGS_EXPORT_CURRENT_VERSION = 0;

function _getSettingsExportDateString(date, dateSeparator, dateTimeSeparator, timeSeparator, resolution) {
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

async function _getSettingsExportData(date) {
    const optionsFull = await apiOptionsGetFull();
    const environment = await apiGetEnvironmentInfo();
    const fieldTemplatesDefault = await apiGetDefaultAnkiFieldTemplates();

    // Format options
    for (const {options} of optionsFull.profiles) {
        if (options.anki.fieldTemplates === fieldTemplatesDefault || !options.anki.fieldTemplates) {
            delete options.anki.fieldTemplates; // Default
        }
    }

    const data = {
        version: SETTINGS_EXPORT_CURRENT_VERSION,
        date: _getSettingsExportDateString(date, '-', ' ', ':', 6),
        url: chrome.runtime.getURL('/'),
        manifest: chrome.runtime.getManifest(),
        environment,
        userAgent: navigator.userAgent,
        options: optionsFull
    };

    return data;
}

function _saveBlob(blob, fileName) {
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
        _settingsExportRevoke = null;
    };
    _settingsExportRevoke = revoke;

    a.dispatchEvent(new MouseEvent('click'));
    setTimeout(revoke, 60000);
}

async function _onSettingsExportClick() {
    if (_settingsExportRevoke !== null) {
        _settingsExportRevoke();
        _settingsExportRevoke = null;
    }

    const date = new Date(Date.now());

    const token = {};
    _settingsExportToken = token;
    const data = await _getSettingsExportData(date);
    if (_settingsExportToken !== token) {
        // A new export has been started
        return;
    }
    _settingsExportToken = null;

    const fileName = `yomichan-settings-${_getSettingsExportDateString(date, '-', '-', '-', 6)}.json`;
    const blob = new Blob([JSON.stringify(data, null, 4)], {type: 'application/json'});
    _saveBlob(blob, fileName);
}


// Importing

async function _settingsImportSetOptionsFull(optionsFull) {
    return utilIsolate(utilBackend().setFullOptions(
        utilBackgroundIsolate(optionsFull)
    ));
}

function _showSettingsImportError(error) {
    logError(error);
    document.querySelector('#settings-import-error-modal-message').textContent = `${error}`;
    $('#settings-import-error-modal').modal('show');
}

async function _showSettingsImportWarnings(warnings) {
    const modalNode = $('#settings-import-warning-modal');
    const buttons = document.querySelectorAll('.settings-import-warning-modal-import-button');
    const messageContainer = document.querySelector('#settings-import-warning-modal-message');
    if (modalNode.length === 0 || buttons.length === 0 || messageContainer === null) {
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
    modalNode.modal('show');

    // Wait for modal to close
    return new Promise((resolve) => {
        const onButtonClick = (e) => {
            e.preventDefault();
            complete({
                result: true,
                sanitize: e.currentTarget.dataset.importSanitize === 'true'
            });
            modalNode.modal('hide');
        };
        const onModalHide = () => {
            complete({result: false});
        };

        let completed = false;
        const complete = (result) => {
            if (completed) { return; }
            completed = true;

            modalNode.off('hide.bs.modal', onModalHide);
            for (const button of buttons) {
                button.removeEventListener('click', onButtonClick, false);
            }

            resolve(result);
        };

        // Hook events
        modalNode.on('hide.bs.modal', onModalHide);
        for (const button of buttons) {
            button.addEventListener('click', onButtonClick, false);
        }
    });
}

function _isLocalhostUrl(urlString) {
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

function _settingsImportSanitizeProfileOptions(options, dryRun) {
    const warnings = [];

    const anki = options.anki;
    if (isObject(anki)) {
        const fieldTemplates = anki.fieldTemplates;
        if (typeof fieldTemplates === 'string') {
            warnings.push('anki.fieldTemplates contains a non-default value');
            if (!dryRun) {
                delete anki.fieldTemplates;
            }
        }
        const server = anki.server;
        if (typeof server === 'string' && server.length > 0 && !_isLocalhostUrl(server)) {
            warnings.push('anki.server uses a non-localhost URL');
            if (!dryRun) {
                delete anki.server;
            }
        }
    }

    const audio = options.audio;
    if (isObject(audio)) {
        const customSourceUrl = audio.customSourceUrl;
        if (typeof customSourceUrl === 'string' && customSourceUrl.length > 0 && !_isLocalhostUrl(customSourceUrl)) {
            warnings.push('audio.customSourceUrl uses a non-localhost URL');
            if (!dryRun) {
                delete audio.customSourceUrl;
            }
        }
    }

    return warnings;
}

function _settingsImportSanitizeOptions(optionsFull, dryRun) {
    const warnings = new Set();

    const profiles = optionsFull.profiles;
    if (Array.isArray(profiles)) {
        for (const profile of profiles) {
            if (!isObject(profile)) { continue; }
            const options = profile.options;
            if (!isObject(options)) { continue; }

            const warnings2 = _settingsImportSanitizeProfileOptions(options, dryRun);
            for (const warning of warnings2) {
                warnings.add(warning);
            }
        }
    }

    return warnings;
}

function _utf8Decode(arrayBuffer) {
    try {
        return new TextDecoder('utf-8').decode(arrayBuffer);
    } catch (e) {
        const binaryString = String.fromCharCode.apply(null, new Uint8Array(arrayBuffer));
        return decodeURIComponent(escape(binaryString));
    }
}

async function _importSettingsFile(file) {
    const dataString = _utf8Decode(await utilReadFileArrayBuffer(file));
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
        version <= SETTINGS_EXPORT_CURRENT_VERSION
    )) {
        throw new Error(`Unsupported version: ${version}`);
    }

    // Verify options exists
    let optionsFull = data.options;
    if (!isObject(optionsFull)) {
        throw new Error(`Invalid options type: ${typeof optionsFull}`);
    }

    // Upgrade options
    optionsFull = optionsUpdateVersion(optionsFull, {});

    // Check for warnings
    const sanitizationWarnings = _settingsImportSanitizeOptions(optionsFull, true);

    // Show sanitization warnings
    if (sanitizationWarnings.size > 0) {
        const {result, sanitize} = await _showSettingsImportWarnings(sanitizationWarnings);
        if (!result) { return; }

        if (sanitize !== false) {
            _settingsImportSanitizeOptions(optionsFull, false);
        }
    }

    // Assign options
    await _settingsImportSetOptionsFull(optionsFull);

    // Reload settings page
    window.location.reload();
}

function _onSettingsImportClick() {
    document.querySelector('#settings-import-file').click();
}

function _onSettingsImportFileChange(e) {
    const files = e.target.files;
    if (files.length === 0) { return; }

    const file = files[0];
    e.target.value = null;
    _importSettingsFile(file).catch(_showSettingsImportError);
}


// Resetting

function _onSettingsResetClick() {
    $('#settings-reset-modal').modal('show');
}

async function _onSettingsResetConfirmClick() {
    $('#settings-reset-modal').modal('hide');

    // Get default options
    const optionsFull = optionsGetDefault();

    // Assign options
    await _settingsImportSetOptionsFull(optionsFull);

    // Reload settings page
    window.location.reload();
}


// Setup

function backupInitialize() {
    document.querySelector('#settings-export').addEventListener('click', _onSettingsExportClick, false);
    document.querySelector('#settings-import').addEventListener('click', _onSettingsImportClick, false);
    document.querySelector('#settings-import-file').addEventListener('change', _onSettingsImportFileChange, false);
    document.querySelector('#settings-reset').addEventListener('click', _onSettingsResetClick, false);
    document.querySelector('#settings-reset-modal-confirm').addEventListener('click', _onSettingsResetConfirmClick, false);
}
