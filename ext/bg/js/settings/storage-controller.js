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

class StorageController {
    constructor() {
        this._mostRecentStorageEstimate = null;
        this._storageEstimateFailed = false;
        this._isUpdating = false;
    }

    prepare() {
        this._preparePersistentStorage();
        this.updateStats();
        document.querySelector('#storage-refresh').addEventListener('click', this.updateStats.bind(this), false);
    }

    async updateStats() {
        try {
            this._isUpdating = true;

            const estimate = await this._storageEstimate();
            const valid = (estimate !== null);

            if (valid) {
                // Firefox reports usage as 0 when persistent storage is enabled.
                const finite = (estimate.usage > 0 || !(await this._isStoragePeristent()));
                if (finite) {
                    document.querySelector('#storage-usage').textContent = this._bytesToLabeledString(estimate.usage);
                    document.querySelector('#storage-quota').textContent = this._bytesToLabeledString(estimate.quota);
                }
                document.querySelector('#storage-use-finite').classList.toggle('storage-hidden', !finite);
                document.querySelector('#storage-use-infinite').classList.toggle('storage-hidden', finite);
            }

            document.querySelector('#storage-use').classList.toggle('storage-hidden', !valid);
            document.querySelector('#storage-error').classList.toggle('storage-hidden', valid);

            return valid;
        } finally {
            this._isUpdating = false;
        }
    }

    // Private

    async _preparePersistentStorage() {
        if (!(navigator.storage && navigator.storage.persist)) {
            // Not supported
            return;
        }

        const info = document.querySelector('#storage-persist-info');
        const button = document.querySelector('#storage-persist-button');
        const checkbox = document.querySelector('#storage-persist-button-checkbox');

        info.classList.remove('storage-hidden');
        button.classList.remove('storage-hidden');

        let persisted = await this._isStoragePeristent();
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
                this.updateStats();
            } else {
                document.querySelector('.storage-persist-fail-warning').classList.remove('storage-hidden');
            }
        }, false);
    }

    async _storageEstimate() {
        if (this._storageEstimateFailed && this._mostRecentStorageEstimate === null) {
            return null;
        }
        try {
            const value = await navigator.storage.estimate();
            this._mostRecentStorageEstimate = value;
            return value;
        } catch (e) {
            this._storageEstimateFailed = true;
        }
        return null;
    }

    _bytesToLabeledString(size) {
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

    async _isStoragePeristent() {
        try {
            return await navigator.storage.persisted();
        } catch (e) {
            // NOP
        }
        return false;
    }
}
