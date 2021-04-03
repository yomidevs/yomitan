/*
 * Copyright (C) 2021  Yomichan Authors
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

class PersistentStorageController {
    constructor() {
        this._persistentStorageCheckbox = false;
    }

    async prepare() {
        this._persistentStorageCheckbox = document.querySelector('#storage-persistent-checkbox');
        this._persistentStorageCheckbox.addEventListener('change', this._onPersistentStorageCheckboxChange.bind(this), false);

        if (!this._isPersistentStorageSupported()) { return; }

        const info = document.querySelector('#storage-persistent-info');
        if (info !== null) { info.hidden = false; }

        const isStoragePeristent = await this.isStoragePeristent();
        this._updateCheckbox(isStoragePeristent);
    }

    async isStoragePeristent() {
        try {
            return await navigator.storage.persisted();
        } catch (e) {
            // NOP
        }
        return false;
    }

    // Private

    _onPersistentStorageCheckboxChange(e) {
        const node = e.currentTarget;
        if (node.checked) {
            node.checked = false;
            this._attemptPersistStorage();
        } else {
            node.checked = true;
        }
    }

    async _attemptPersistStorage() {
        let isStoragePeristent = false;
        try {
            isStoragePeristent = await navigator.storage.persist();
        } catch (e) {
            // NOP
        }

        this._updateCheckbox(isStoragePeristent);

        const node = document.querySelector('#storage-persistent-fail-warning');
        if (node !== null) { node.hidden = isStoragePeristent; }

        yomichan.trigger('storageChanged');
    }

    _isPersistentStorageSupported() {
        return isObject(navigator.storage) && typeof navigator.storage.persist === 'function';
    }

    _updateCheckbox(isStoragePeristent) {
        this._persistentStorageCheckbox.checked = isStoragePeristent;
        this._persistentStorageCheckbox.readOnly = isStoragePeristent;
    }
}
