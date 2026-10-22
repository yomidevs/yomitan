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

const PASTE_TOKEN_PLACEHOLDER = 'Paste the Bunpro token';
const REPLACE_TOKEN_PLACEHOLDER = 'Paste a new token to replace';

/** @type {Record<import('bunpro').BunproStatus, string>} */
const STATUS_TEXT = {
    disabled: 'Add looked-up words to your Bunpro reviews.',
    needsPermission: 'Needs the cookies permission to look for a Bunpro login in this browser.',
    signedOut: 'Not connected',
    ready: 'Connected',
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
        /** @type {HTMLInputElement} */
        this._tokenInput = querySelectorNotNull(document, '#bunpro-token-input');
        /** @type {HTMLButtonElement} */
        this._toggleVisibilityButton = querySelectorNotNull(document, '#bunpro-toggle-token-visibility');
        /** @type {HTMLButtonElement} */
        this._saveButton = querySelectorNotNull(document, '#bunpro-save-token');
        /** @type {HTMLButtonElement} */
        this._clearButton = querySelectorNotNull(document, '#bunpro-clear-token');
        /** @type {HTMLElement} */
        this._tokenError = querySelectorNotNull(document, '#bunpro-token-error');
        /** @type {boolean} */
        this._tokenSaved = false;
        /** @type {boolean} */
        this._tokenConnected = false;
        /** @type {boolean} */
        this._tokenEditing = false;
        /** @type {?string} */
        this._revealedToken = null;
        /** @type {string} */
        this._tokenMask = '';
    }

    /** */
    async prepare() {
        this._saveButton.addEventListener('click', () => {
            const token = this._tokenInput.value.trim();
            if (!this._isDirty()) { return; }
            void this._runTokenAction(async () => {
                const authorization = await this._settingsController.application.api.saveBunproToken(token);
                this._tokenEditing = false;
                this._revealedToken = null;
                this._hideToken();
                return authorization;
            });
        }, false);
        this._clearButton.addEventListener('click', () => {
            void this._runTokenAction(async () => {
                const authorization = await this._settingsController.application.api.clearBunproToken();
                this._tokenEditing = false;
                this._revealedToken = null;
                this._hideToken();
                this._tokenInput.value = '';
                return authorization;
            });
        }, false);
        this._toggleVisibilityButton.addEventListener('click', () => {
            void this._toggleTokenVisibility();
        }, false);
        this._tokenInput.addEventListener('focus', () => {
            if (this._tokenMask !== '' && this._tokenInput.value === this._tokenMask) {
                this._tokenInput.value = '';
                this._tokenEditing = true;
                this._updateActionButtons();
            }
        }, false);
        this._tokenInput.addEventListener('input', () => {
            this._tokenEditing = true;
            this._updateActionButtons();
        }, false);
        this._tokenInput.addEventListener('blur', () => {
            if (this._tokenConnected && this._tokenInput.value.trim() === '' && this._revealedToken === null) {
                this._tokenEditing = false;
                this._showTokenMask();
                this._updateActionButtons();
            }
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
            this._setStatus(toError(e).message, 'danger');
            this._signInLink.hidden = true;
        }
    }

    /**
     * @param {() => Promise<import('bunpro').BunproAuthorization>} action
     */
    async _runTokenAction(action) {
        this._setTokenBusy(true);
        try {
            this._showAuthorization(await action());
        } catch (e) {
            log.error(e);
            this._tokenError.hidden = false;
            this._tokenError.textContent = toError(e).message;
        } finally {
            this._setTokenBusy(false);
        }
    }

    /** */
    async _toggleTokenVisibility() {
        if (this._tokenInput.type === 'text' && this._revealedToken !== null && !this._isDirty()) {
            this._revealedToken = null;
            this._tokenEditing = false;
            this._showTokenMask();
            this._hideToken();
            this._updateActionButtons();
            return;
        }
        if (this._tokenInput.type === 'text') {
            this._hideToken();
            this._updateActionButtons();
            return;
        }
        if ((this._tokenMask !== '' && this._tokenInput.value === this._tokenMask) ||
        (this._tokenConnected && this._tokenInput.value.trim() === '')) {
            try {
                const token = await this._settingsController.application.api.getBunproToken();
                if (token === null || token === '') { return; }
                this._revealedToken = token;
                this._tokenMask = '*'.repeat(token.length);
                this._tokenEditing = false;
                this._tokenInput.value = token;
            } catch (e) {
                log.error(e);
                this._tokenError.hidden = false;
                this._tokenError.textContent = toError(e).message;
                return;
            }
        }
        this._showToken();
        this._updateActionButtons();
    }

    /**
     * @param {import('bunpro').BunproAuthorization} authorization
     */
    _showAuthorization(authorization) {
        this._tokenSaved = authorization.saved;
        this._tokenConnected = authorization.status === 'ready';
        this._tokenMask = authorization.tokenLength === null ? '' : '*'.repeat(authorization.tokenLength);
        this._signInLink.hidden = authorization.status !== 'signedOut';
        this._clearButton.hidden = !authorization.saved;
        this._tokenError.hidden = true;
        this._tokenError.textContent = '';
        this._showStatus(authorization);
        this._showTokenField(authorization);
        this._updateActionButtons();
    }

    /**
     * @param {import('bunpro').BunproAuthorization} authorization
     */
    _showStatus(authorization) {
        if (authorization.status === 'ready') {
            this._setStatus(
                authorization.saved ? 'Connected' : 'Connected via browser login',
                'success',
            );
            return;
        }
        if (authorization.status === 'signedOut' || authorization.status === 'needsPermission') {
            this._setStatus(STATUS_TEXT[authorization.status], 'danger');
            return;
        }
        this._setStatus(STATUS_TEXT[authorization.status], null);
    }

    /**
     * @param {import('bunpro').BunproAuthorization} authorization
     */
    _showTokenField(authorization) {
        if (this._tokenEditing && this._tokenMask !== '' && this._tokenInput.value !== this._tokenMask) { return; }
        this._revealedToken = null;
        this._hideToken();
        if (authorization.status === 'ready') {
            this._showTokenMask();
            return;
        }
        this._tokenInput.value = '';
        this._tokenInput.placeholder = PASTE_TOKEN_PLACEHOLDER;
    }

    /** */
    _showTokenMask() {
        this._tokenInput.value = this._tokenMask;
        this._tokenInput.placeholder = REPLACE_TOKEN_PLACEHOLDER;
    }

    /** */
    _showToken() {
        this._tokenInput.type = 'text';
        this._toggleVisibilityButton.textContent = 'Hide';
        this._toggleVisibilityButton.title = 'Hide token';
    }

    /** */
    _hideToken() {
        this._tokenInput.type = 'password';
        this._toggleVisibilityButton.textContent = 'Show';
        this._toggleVisibilityButton.title = 'Show token';
    }

    /** @returns {boolean} */
    _isDirty() {
        const value = this._tokenInput.value.trim();
        return value !== '' && value !== this._tokenMask && value !== this._revealedToken;
    }

    /** */
    _updateActionButtons() {
        this._saveButton.disabled = !this._isDirty();
        this._toggleVisibilityButton.disabled = !(
            this._tokenConnected ||
            this._tokenInput.value.trim() !== '' ||
            this._revealedToken !== null
        );
    }

    /**
     * @param {string} text
     * @param {?'success'|'danger'} tone
     */
    _setStatus(text, tone) {
        this._statusNode.textContent = text;
        this._statusNode.classList.toggle('success-text', tone === 'success');
        this._statusNode.classList.toggle('danger-text', tone === 'danger');
    }

    /**
     * @param {boolean} busy
     */
    _setTokenBusy(busy) {
        this._saveButton.disabled = busy || !this._isDirty();
        this._clearButton.disabled = busy;
        this._tokenInput.disabled = busy;
        this._toggleVisibilityButton.disabled = busy || !(
            this._tokenConnected ||
            this._tokenInput.value.trim() !== '' ||
            this._revealedToken !== null
        );
    }
}
