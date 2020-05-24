/*
 * Copyright (C) 2019-2020  Yomichan Authors
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

function storageBytesToLabeledString(size) {
    const base = 1000;
    const labels = [' bytes', 'KB', 'MB', 'GB'];
    let labelIndex = 0;
    while (size >= base) {
        size /= base;
        ++labelIndex;
    }
    const label = labelIndex === 0 ? `${size}` : size.toFixed(1);
    return `${label}${labels[labelIndex]}`;
}

async function storageEstimate() {
    try {
        return (storageEstimate.mostRecent = await navigator.storage.estimate());
    } catch (e) {
        // NOP
    }
    return null;
}
storageEstimate.mostRecent = null;

async function isStoragePeristent() {
    try {
        return await navigator.storage.persisted();
    } catch (e) {
        // NOP
    }
    return false;
}

async function storageInfoInitialize() {
    storagePersistInitialize();
    const {browser, platform} = await api.getEnvironmentInfo();
    document.documentElement.dataset.browser = browser;
    document.documentElement.dataset.operatingSystem = platform.os;

    await storageShowInfo();

    document.querySelector('#storage-refresh').addEventListener('click', storageShowInfo, false);
}

async function storageUpdateStats() {
    storageUpdateStats.isUpdating = true;

    const estimate = await storageEstimate();
    const valid = (estimate !== null);

    if (valid) {
        // Firefox reports usage as 0 when persistent storage is enabled.
        const finite = (estimate.usage > 0 || !(await isStoragePeristent()));
        if (finite) {
            document.querySelector('#storage-usage').textContent = storageBytesToLabeledString(estimate.usage);
            document.querySelector('#storage-quota').textContent = storageBytesToLabeledString(estimate.quota);
        }
        document.querySelector('#storage-use-finite').classList.toggle('storage-hidden', !finite);
        document.querySelector('#storage-use-infinite').classList.toggle('storage-hidden', finite);
    }

    storageUpdateStats.isUpdating = false;
    return valid;
}
storageUpdateStats.isUpdating = false;

async function storageShowInfo() {
    storageSpinnerShow(true);

    const valid = await storageUpdateStats();
    document.querySelector('#storage-use').classList.toggle('storage-hidden', !valid);
    document.querySelector('#storage-error').classList.toggle('storage-hidden', valid);

    storageSpinnerShow(false);
}

function storageSpinnerShow(show) {
    const spinner = $('#storage-spinner');
    if (show) {
        spinner.show();
    } else {
        spinner.hide();
    }
}

async function storagePersistInitialize() {
    if (!(navigator.storage && navigator.storage.persist)) {
        // Not supported
        return;
    }

    const info = document.querySelector('#storage-persist-info');
    const button = document.querySelector('#storage-persist-button');
    const checkbox = document.querySelector('#storage-persist-button-checkbox');

    info.classList.remove('storage-hidden');
    button.classList.remove('storage-hidden');

    let persisted = await isStoragePeristent();
    checkbox.checked = persisted;

    button.addEventListener('click', async () => {
        if (persisted) {
            return;
        }
        let result = false;
        try {
            result = await navigator.storage.persist();
        } catch (e) {
            // NOP
        }

        if (result) {
            persisted = true;
            checkbox.checked = true;
            storageShowInfo();
        } else {
            $('.storage-persist-fail-warning').removeClass('storage-hidden');
        }
    }, false);
}
