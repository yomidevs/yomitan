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

class StorageController {
    constructor(persistentStorageController) {
        this._persistentStorageController = persistentStorageController;
        this._mostRecentStorageEstimate = null;
        this._storageEstimateFailed = false;
        this._isUpdating = false;
        this._storageUsageNode = null;
        this._storageQuotaNode = null;
        this._storageUseFiniteNodes = null;
        this._storageUseInfiniteNodes = null;
        this._storageUseValidNodes = null;
        this._storageUseInvalidNodes = null;
    }

    prepare() {
        this._storageUsageNodes = document.querySelectorAll('.storage-usage');
        this._storageQuotaNodes = document.querySelectorAll('.storage-quota');
        this._storageUseFiniteNodes = document.querySelectorAll('.storage-use-finite');
        this._storageUseInfiniteNodes = document.querySelectorAll('.storage-use-infinite');
        this._storageUseValidNodes = document.querySelectorAll('.storage-use-valid');
        this._storageUseInvalidNodes = document.querySelectorAll('.storage-use-invalid');

        document.querySelector('#storage-refresh').addEventListener('click', this._onStorageRefreshButtonClick.bind(this), false);
        yomichan.on('storageChanged', this._onStorageChanged.bind(this));

        this._updateStats();
    }

    // Private

    _onStorageRefreshButtonClick() {
        this._updateStats();
    }

    _onStorageChanged() {
        this._updateStats();
    }

    async _updateStats() {
        if (this._isUpdating) { return; }

        try {
            this._isUpdating = true;

            const estimate = await this._storageEstimate();
            const valid = (estimate !== null);

            // Firefox reports usage as 0 when persistent storage is enabled.
            const finite = valid && (estimate.usage > 0 || !(await this._persistentStorageController.isStoragePeristent()));
            if (finite) {
                for (const node of this._storageUsageNodes) {
                    node.textContent = this._bytesToLabeledString(estimate.usage);
                }
                for (const node of this._storageQuotaNodes) {
                    node.textContent = this._bytesToLabeledString(estimate.quota);
                }
            }

            this._setElementsVisible(this._storageUseFiniteNodes, valid && finite);
            this._setElementsVisible(this._storageUseInfiniteNodes, valid && !finite);
            this._setElementsVisible(this._storageUseValidNodes, valid);
            this._setElementsVisible(this._storageUseInvalidNodes, !valid);

            return valid;
        } finally {
            this._isUpdating = false;
        }
    }

    // Private

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
        const labels = [' bytes', 'KB', 'MB', 'GB', 'TB'];
        const maxLabelIndex = labels.length - 1;
        let labelIndex = 0;
        while (size >= base && labelIndex < maxLabelIndex) {
            size /= base;
            ++labelIndex;
        }
        const label = labelIndex === 0 ? `${size}` : size.toFixed(1);
        return `${label}${labels[labelIndex]}`;
    }

    _setElementsVisible(elements, visible) {
        visible = !visible;
        for (const element of elements) {
            element.hidden = visible;
        }
    }
}
