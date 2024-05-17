/*
 * Copyright (C) 2023-2024  Yomitan Authors
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

import {EventListenerCollection} from '../../core/event-listener-collection.js';
import {toError} from '../../core/to-error.js';
import {getAllPermissions, setPermissionsGranted} from '../../data/permissions-util.js';
import {querySelectorNotNull} from '../../dom/query-selector.js';

export class RecommendedPermissionsController {
    /**
     * @param {import('./settings-controller.js').SettingsController} settingsController
     */
    constructor(settingsController) {
        /** @type {import('./settings-controller.js').SettingsController} */
        this._settingsController = settingsController;
        /** @type {HTMLInputElement} */
        this._originToggleNode = querySelectorNotNull(document, '#recommended-permissions-toggle');
        /** @type {HTMLInputElement} */
        this._optionalPermissionsToggleNode = querySelectorNotNull(document, '#optional-permissions-toggle');
        /** @type {EventListenerCollection} */
        this._eventListeners = new EventListenerCollection();
        /** @type {?HTMLElement} */
        this._errorContainer = null;
    }

    /** */
    async prepare() {
        this._errorContainer = document.querySelector('#recommended-permissions-error');
        this._originToggleNode.addEventListener('change', this._onOriginToggleChange.bind(this), false);
        this._optionalPermissionsToggleNode.addEventListener('change', this._onOptionalPermissionsToggleChange.bind(this), false);

        this._settingsController.on('permissionsChanged', this._onPermissionsChanged.bind(this));
        await this._updatePermissions();
    }

    // Private

    /**
     * @param {import('settings-controller').EventArgument<'permissionsChanged'>} details
     */
    _onPermissionsChanged({permissions}) {
        this._eventListeners.removeAllEventListeners();
        const originsSet = new Set(permissions.origins);
        const {origin} = this._originToggleNode.dataset;
        this._originToggleNode.checked = typeof origin === 'string' && originsSet.has(origin);

        this._optionalPermissionsToggleNode.checked = Array.isArray(permissions.permissions) && permissions.permissions.includes('clipboardRead') && permissions.permissions.includes('nativeMessaging');
    }

    /**
     * @param {Event} e
     */
    _onOriginToggleChange(e) {
        const node = /** @type {HTMLInputElement} */ (e.currentTarget);
        const value = node.checked;
        node.checked = !value;

        const {origin} = node.dataset;
        if (typeof origin !== 'string') { return; }
        void this._setOriginPermissionEnabled(origin, value);
    }

    /**
     * @param {Event} e
     */
    async _onOptionalPermissionsToggleChange(e) {
        const node = /** @type {HTMLInputElement} */ (e.currentTarget);
        const value = node.checked;
        const permissions = ['clipboardRead', 'nativeMessaging'];
        await setPermissionsGranted({permissions}, value);
        await this._updatePermissions();
    }

    /** */
    async _updatePermissions() {
        const permissions = await getAllPermissions();
        this._onPermissionsChanged({permissions});
        void this._setWelcomePageText();
    }

    /**
     * @param {string} origin
     * @param {boolean} enabled
     * @returns {Promise<boolean>}
     */
    async _setOriginPermissionEnabled(origin, enabled) {
        let added = false;
        try {
            added = await setPermissionsGranted({origins: [origin]}, enabled);
        } catch (e) {
            if (this._errorContainer !== null) {
                this._errorContainer.hidden = false;
                this._errorContainer.textContent = toError(e).message;
            }
        }
        await this._updatePermissions();
        return added;
    }

    /** */
    async _setWelcomePageText() {
        const permissions = await getAllPermissions();
        const recommendedPermissions = permissions.origins?.includes('<all_urls>');
        const optionalPermissions = permissions.permissions?.includes('clipboardRead') && permissions.permissions?.includes('nativeMessaging');
        /** @type {HTMLElement | null} */
        this._textIfFullEnabled = document.querySelector('#full-permissions-enabled');
        /** @type {HTMLElement | null} */
        this._textIfRecommendedEnabled = document.querySelector('#recommended-permissions-enabled');
        /** @type {HTMLElement | null} */
        this._textIfDisabled = document.querySelector('#permissions-disabled');

        if (this._textIfFullEnabled && this._textIfRecommendedEnabled && this._textIfDisabled) {
            this._textIfFullEnabled.hidden = true;
            this._textIfRecommendedEnabled.hidden = true;
            this._textIfDisabled.hidden = true;

            if (optionalPermissions && recommendedPermissions) {
                this._textIfFullEnabled.hidden = false;
            } else if (recommendedPermissions) {
                this._textIfRecommendedEnabled.hidden = false;
            } else {
                this._textIfDisabled.hidden = false;
            }
        }
    }
}
