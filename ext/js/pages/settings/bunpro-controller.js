/*
 * Copyright (C) 2026  Yomitan Authors
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

import {log} from '../../core/log.js';
import {toError} from '../../core/to-error.js';
import {querySelectorNotNull} from '../../dom/query-selector.js';

/** @type {Record<import('bunpro').BunproStatus, string>} */
const STATUS_TEXT = {
    disabled: 'Add looked-up words to your Bunpro reviews.',
    needsPermission: 'Needs the cookies permission to use your Bunpro sign-in.',
    signedOut: 'Not signed in to Bunpro.',
    ready: 'Connected to your Bunpro account.',
};

export class BunproController {
    /**
     * @param {import('./settings-controller.js').SettingsController} settingsController
     */
    constructor(settingsController) {
        /** @type {import('./settings-controller.js').SettingsController} */
        this._settingsController = settingsController;
        /** @type {HTMLElement} */
        this._statusNode = querySelectorNotNull(document, '#bunpro-status');
        /** @type {HTMLElement} */
        this._signInLink = querySelectorNotNull(document, '#bunpro-sign-in-link');
    }

    /** */
    async prepare() {
        const refresh = () => { void this._refreshStatus(); };
        this._settingsController.on('optionsChanged', refresh);
        this._settingsController.on('permissionsChanged', refresh);
        window.addEventListener('focus', refresh, false);
        await this._refreshStatus();
    }

    // Private

    /** */
    async _refreshStatus() {
        try {
            const status = await this._settingsController.application.api.getBunproStatus();
            this._statusNode.textContent = STATUS_TEXT[status];
            this._signInLink.hidden = status !== 'signedOut';
        } catch (e) {
            log.error(e);
            this._statusNode.textContent = toError(e).message;
            this._signInLink.hidden = true;
        }
    }
}
