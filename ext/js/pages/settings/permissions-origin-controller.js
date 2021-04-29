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

class PermissionsOriginController {
    constructor(settingsController) {
        this._settingsController = settingsController;
        this._originContainer = null;
        this._originEmpty = null;
        this._originToggleNodes = null;
        this._addOriginInput = null;
        this._errorContainer = null;
        this._originContainerChildren = [];
        this._eventListeners = new EventListenerCollection();
    }

    async prepare() {
        this._originContainer = document.querySelector('#permissions-origin-list');
        this._originEmpty = document.querySelector('#permissions-origin-list-empty');
        this._originToggleNodes = document.querySelectorAll('.permissions-origin-toggle');
        this._addOriginInput = document.querySelector('#permissions-origin-new-input');
        this._errorContainer = document.querySelector('#permissions-origin-list-error');
        const addButton = document.querySelector('#permissions-origin-add');

        for (const node of this._originToggleNodes) {
            node.addEventListener('change', this._onOriginToggleChange.bind(this), false);
        }
        addButton.addEventListener('click', this._onAddButtonClick.bind(this), false);

        this._settingsController.on('permissionsChanged', this._onPermissionsChanged.bind(this));
        await this._updatePermissions();
    }

    // Private

    _onPermissionsChanged({permissions}) {
        this._eventListeners.removeAllEventListeners();
        for (const node of this._originContainerChildren) {
            if (node.parentNode === null) { continue; }
            node.parentNode.removeChild(node);
        }
        this._originContainerChildren = [];

        const originsSet = new Set(permissions.origins);
        for (const node of this._originToggleNodes) {
            node.checked = originsSet.has(node.dataset.origin);
        }

        let any = false;
        const excludeOrigins = new Set([
            '<all_urls>'
        ]);
        const fragment = document.createDocumentFragment();
        for (const origin of permissions.origins) {
            if (excludeOrigins.has(origin)) { continue; }
            const node = this._settingsController.instantiateTemplateFragment('permissions-origin');
            const input = node.querySelector('.permissions-origin-input');
            const menuButton = node.querySelector('.permissions-origin-button');
            input.value = origin;
            this._eventListeners.addEventListener(menuButton, 'menuClose', this._onOriginMenuClose.bind(this, origin), false);
            this._originContainerChildren.push(...node.childNodes);
            fragment.appendChild(node);
            any = true;
        }
        this._originContainer.insertBefore(fragment, this._originContainer.firstChild);
        this._originEmpty.hidden = any;

        this._errorContainer.hidden = true;
    }

    _onOriginToggleChange(e) {
        const node = e.currentTarget;
        const value = node.checked;
        node.checked = !value;

        const {origin} = node.dataset;
        this._setOriginPermissionEnabled(origin, value);
    }

    _onOriginMenuClose(origin) {
        this._setOriginPermissionEnabled(origin, false);
    }

    _onAddButtonClick() {
        this._addOrigin();
    }

    async _addOrigin() {
        const origin = this._addOriginInput.value;
        const added = await this._setOriginPermissionEnabled(origin, true);
        if (added) {
            this._addOriginInput.value = '';
        }
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
