/*
 * Copyright (C) 2023  Yomitan Authors
 * Copyright (C) 2021-2022  Yomichan Authors
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

import {EventListenerCollection} from '../../core.js';

export class RecommendedPermissionsController {
    constructor(settingsController) {
        this._settingsController = settingsController;
        /** @type {NodeListOf<HTMLInputElement>} */
        this._originToggleNodes = null;
        this._eventListeners = new EventListenerCollection();
        /** @type {HTMLDivElement} */
        this._errorContainer = null;
    }

    async prepare() {
        this._originToggleNodes = document.querySelectorAll('.recommended-permissions-toggle');
        this._errorContainer = document.querySelector('#recommended-permissions-error');
        for (const node of this._originToggleNodes) {
            node.addEventListener('change', this._onOriginToggleChange.bind(this), false);
        }

        this._settingsController.on('permissionsChanged', this._onPermissionsChanged.bind(this));
        await this._updatePermissions();
    }

    // Private

    _onPermissionsChanged({permissions}) {
        this._eventListeners.removeAllEventListeners();
        const originsSet = new Set(permissions.origins);
        for (const node of this._originToggleNodes) {
            node.checked = originsSet.has(node.dataset.origin);
        }
    }

    _onOriginToggleChange(e) {
        const node = e.currentTarget;
        const value = node.checked;
        node.checked = !value;

        const {origin} = node.dataset;
        this._setOriginPermissionEnabled(origin, value);
    }

    async _updatePermissions() {
        const permissions = await this._settingsController.permissionsUtil.getAllPermissions();
        this._onPermissionsChanged({permissions});
    }

    async _setOriginPermissionEnabled(origin, enabled) {
        let added = false;
        try {
            added = await this._settingsController.permissionsUtil.setPermissionsGranted({origins: [origin]}, enabled);
        } catch (e) {
            this._errorContainer.hidden = false;
            this._errorContainer.textContent = e.message;
        }
        if (!added) { return false; }
        await this._updatePermissions();
        return true;
    }
}
