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

const PASTE_TOKEN_PLACEHOLDER = 'Paste the Bunpro API key';
const REPLACE_TOKEN_PLACEHOLDER = 'Paste a new API key to replace';

/** @type {Record<import('bunpro').BunproStatus, string>} */
const STATUS_TEXT = {
    disabled: 'Add looked-up words to your Bunpro reviews.',
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
        /** @type {HTMLElement} */
        this._sequencedDictionaryWarning = querySelectorNotNull(document, '#bunpro-sequenced-dictionary-warning');
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
        /** Ignores a status response that started before the latest toggle. */
        /** @type {number} */
        this._statusGeneration = 0;
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
        this._settingsController.application.on('databaseUpdated', refresh);
        this._settingsController.on('settingsModified', ({paths}) => {
            if (paths.includes('bunpro.enable') || paths.some((path) => path.includes('dictionaries'))) { refresh(); }
        });
        window.addEventListener('focus', refresh, false);
        const enableToggle = /** @type {HTMLInputElement} */ (querySelectorNotNull(document, '[data-setting="bunpro.enable"]'));
        enableToggle.addEventListener('change', () => {
            this._showToggleStatus(enableToggle.checked);
            void this._updateSequencedDictionaryWarning(enableToggle.checked, this._tokenSaved);
        }, false);
        await this._refreshStatus();
    }

    // Private

    /** */
    async _refreshStatus() {
        const generation = ++this._statusGeneration;
        try {
            const authorization = await this._settingsController.application.api.getBunproStatus();
            if (generation !== this._statusGeneration) { return; }
            this._showAuthorization(authorization);
        } catch (e) {
            if (generation !== this._statusGeneration) { return; }
            log.error(e);
            this._setStatus(toError(e).message, 'danger');
            this._signInLink.hidden = true;
        }
    }

    /**
     * The page ignores the options echo from its own toggle, so the line under the
     * switch follows the checkbox immediately. A later refresh confirms a saved key.
     * @param {boolean} enabled
     */
    _showToggleStatus(enabled) {
        this._statusGeneration += 1;
        if (!enabled) {
            this._showAuthorization({
                status: 'disabled',
                saved: this._tokenSaved,
                tokenLength: this._tokenMask === '' ? null : this._tokenMask.length,
            });
            return;
        }
        if (!this._tokenSaved) {
            this._showAuthorization({status: 'signedOut', saved: false, tokenLength: null});
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
        void this._updateSequencedDictionaryWarning(authorization.status !== 'disabled', authorization.saved);
    }

    /**
     * Bunpro matching is much more reliable when an enabled sequenced dictionary
     * (Jitendex / JMdict) can supply JMdict ids. Only nudge once an API key is saved.
     * @param {boolean} enabled
     * @param {boolean} apiKeySaved
     */
    async _updateSequencedDictionaryWarning(enabled, apiKeySaved) {
        if (!enabled || !apiKeySaved) {
            this._sequencedDictionaryWarning.hidden = true;
            return;
        }
        try {
            const [options, dictionaries] = await Promise.all([
                this._settingsController.getOptions(),
                this._settingsController.getDictionaryInfo(),
            ]);
            const enabledNames = new Set(
                options.dictionaries.filter((dictionary) => dictionary.enabled).map((dictionary) => dictionary.name),
            );
            const hasSequenced = dictionaries.some((dictionary) => dictionary.sequenced === true && enabledNames.has(dictionary.title));
            this._sequencedDictionaryWarning.hidden = hasSequenced;
        } catch (e) {
            log.error(e);
            this._sequencedDictionaryWarning.hidden = true;
        }
    }

    /**
     * @param {import('bunpro').BunproAuthorization} authorization
     */
    _showStatus(authorization) {
        if (authorization.status === 'ready') {
            this._setStatus(STATUS_TEXT.ready, 'success');
            return;
        }
        if (authorization.status === 'signedOut') {
            this._setStatus(STATUS_TEXT.signedOut, 'danger');
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
