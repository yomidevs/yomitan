/*
 * Copyright (C) 2019  Alex Yatskov <alex@foosoft.net>
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
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */


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

    const fieldTemplatesDefault = profileOptionsGetDefaultFieldTemplates();

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


// Setup

window.addEventListener('DOMContentLoaded', () => {
    document.querySelector('#settings-export').addEventListener('click', _onSettingsExportClick, false);
}, false);
