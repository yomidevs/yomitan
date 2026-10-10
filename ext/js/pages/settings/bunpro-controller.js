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
    needsPermission: 'Needs the cookies permission to look for a Bunpro login in this browser.',
    signedOut: 'No saved key, and no Bunpro login was found in this browser.',
    ready: 'Connected to the Bunpro login in this browser.',
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
        /** @type {HTMLElement} */
        this._browserLogin = querySelectorNotNull(document, '#bunpro-browser-login');
        /** @type {HTMLElement} */
        this._browserLoginPrompt = querySelectorNotNull(document, '#bunpro-browser-login-prompt');
        /** @type {HTMLButtonElement} */
        this._useBrowserLoginButton = querySelectorNotNull(document, '#bunpro-use-browser-login');
        /** @type {HTMLElement} */
        this._savedKey = querySelectorNotNull(document, '#bunpro-saved-key');
        /** @type {HTMLInputElement} */
        this._tokenInput = querySelectorNotNull(document, '#bunpro-token-input');
        /** @type {HTMLButtonElement} */
        this._saveButton = querySelectorNotNull(document, '#bunpro-save-token');
        /** @type {HTMLButtonElement} */
        this._clearButton = querySelectorNotNull(document, '#bunpro-clear-token');
        /** @type {HTMLElement} */
        this._keyError = querySelectorNotNull(document, '#bunpro-key-error');
    }

    /** */
    async prepare() {
        this._useBrowserLoginButton.addEventListener('click', () => {
            void this._runKeyAction(() => this._settingsController.application.api.saveBunproBrowserLogin());
        }, false);
        this._saveButton.addEventListener('click', () => {
            const token = this._tokenInput.value;
            void this._runKeyAction(async () => {
                const authorization = await this._settingsController.application.api.saveBunproToken(token);
                this._tokenInput.value = '';
                return authorization;
            });
        }, false);
        this._clearButton.addEventListener('click', () => {
            void this._runKeyAction(() => this._settingsController.application.api.clearBunproToken());
        }, false);

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
            this._showAuthorization(await this._settingsController.application.api.getBunproStatus());
        } catch (e) {
            log.error(e);
            this._statusNode.textContent = toError(e).message;
            this._signInLink.hidden = true;
            this._browserLogin.hidden = true;
        }
    }

    /**
     * @param {() => Promise<import('bunpro').BunproAuthorization>} action
     */
    async _runKeyAction(action) {
        this._setKeyBusy(true);
        try {
            this._showAuthorization(await action());
        } catch (e) {
            log.error(e);
            this._keyError.hidden = false;
            this._keyError.textContent = toError(e).message;
        } finally {
            this._setKeyBusy(false);
        }
    }

    /**
     * @param {import('bunpro').BunproAuthorization} authorization
     */
    _showAuthorization(authorization) {
        this._statusNode.textContent = authorization.status === 'ready' && authorization.saved ?
            'Connected with a saved Bunpro key.' :
            STATUS_TEXT[authorization.status];
        this._signInLink.hidden = authorization.status !== 'signedOut';
        this._browserLogin.hidden = !authorization.offerBrowserLogin;
        this._browserLoginPrompt.textContent = authorization.saved ?
            'A different Bunpro login was found in this browser. Use this key instead?' :
            'A Bunpro login was found in this browser. Use this key?';
        this._savedKey.textContent = authorization.saved ?
            'A key is saved on this device. Settings backups do not include it.' :
            'No key is saved yet.';
        this._clearButton.hidden = !authorization.saved;
        this._keyError.hidden = true;
        this._keyError.textContent = '';
    }

    /**
     * @param {boolean} busy
     */
    _setKeyBusy(busy) {
        this._useBrowserLoginButton.disabled = busy;
        this._saveButton.disabled = busy;
        this._clearButton.disabled = busy;
        this._tokenInput.disabled = busy;
    }
}
