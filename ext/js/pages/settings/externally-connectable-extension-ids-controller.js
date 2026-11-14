/*
 * Copyright (C) 2024-2026  Yomitan Authors
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

import {querySelectorNotNull} from '../../dom/query-selector.js';

export class ExternallyConnectableExtensionIdsController {
    /**
     * @param {import('./settings-controller.js').SettingsController} settingsController
     */
    constructor(settingsController) {
        /** @type {import('./settings-controller.js').SettingsController} */
        this._settingsController = settingsController;
        /** @type {HTMLDivElement} */
        this._extensionIdList = querySelectorNotNull(document, '#externally-connectable-extension-id-list');
        /** @type {Element[]} */
        this._extensionIdListChildren = [];
        /** @type {HTMLInputElement} */
        this._addInput = querySelectorNotNull(document, '#externally-connectable-extension-id-new-input');
        /** @type {HTMLDivElement} */
        this._errorContainer = querySelectorNotNull(document, '#externally-connectable-extension-id-error');
        /** @type {HTMLInputElement} */
        this._enableCheckbox = querySelectorNotNull(document, '#enable-externally-connectable-extensions');
        /** @type {RegExp[]} */
        this._extensionIdRegexes = [];
        /** @type {boolean} */
        this._inProgress = false;
    }

    /** */
    async prepare() {
        this._settingsController.on('optionsChanged', this._onOptionsChanged.bind(this));
        const addButton = querySelectorNotNull(document, '#externally-connectable-extension-id-add');
        addButton.addEventListener('click', this._onAddButtonClick.bind(this));
        this._enableCheckbox.addEventListener('change', this._onEnableInputChange.bind(this));
        const {browser} = await this._settingsController.application.api.getEnvironmentInfo();
        const isFirefox = browser === 'firefox' || browser === 'firefox-mobile';
        if (isFirefox) {
            this._extensionIdRegexes = [/^\{[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\}$/, /^[a-zA-Z0-9-._]*@[a-zA-Z0-9-._]+$/];
            this._errorContainer.textContent = 'Invalid extension ID. IDs must be formatted like "{xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx}" or "name@example.org".';
        } else {
            this._extensionIdRegexes = [/^[a-p]{32}$/];
            this._errorContainer.textContent = 'Invalid extension ID. IDs must be 32 characters long and can only contain the letters a to p.';
        }
        await this._updateOptions();
    }

    /**
     * @param {Event} e
     */
    async _onEnableInputChange(e) {
        const element = /** @type {HTMLInputElement} */ (e.target);
        await this._settingsController.modifyProfileSettings([{
            action: 'set',
            path: 'general.enableExternallyConnectableExtensions',
            value: element.checked,
        }]);
        await this._updateOptions();
    }

    /** */
    async _onAddButtonClick() {
        if (this._inProgress) { return; }
        this._inProgress = true;
        try {
            let isExtensionIdValid = false;
            for (const regex of this._extensionIdRegexes) {
                if (regex.test(this._addInput.value)) {
                    isExtensionIdValid = true;
                    break;
                }
            }

            if (!isExtensionIdValid) {
                this._errorContainer.hidden = false;
                return;
            }

            this._errorContainer.hidden = true;

            await this._settingsController.modifyProfileSettings([{
                action: 'push',
                path: 'general.externallyConnectableExtensionIds',
                items: [this._addInput.value],
            }]);
            this._addInput.value = '';
            await this._updateOptions();
        } finally {
            this._inProgress = false;
        }
    }

    /** */
    async _updateOptions() {
        const options = await this._settingsController.getOptions();
        const optionsContext = this._settingsController.getOptionsContext();
        void this._onOptionsChanged({options, optionsContext});
    }

    /**
     * @param {import('settings-controller').EventArgument<'optionsChanged'>} details
     */
    async _onOptionsChanged({options: {general: {enableExternallyConnectableExtensions, externallyConnectableExtensionIds}}}) {
        this._enableCheckbox.checked = enableExternallyConnectableExtensions;

        for (const node of this._extensionIdListChildren) {
            if (node.parentNode !== null) {
                node.parentNode.removeChild(node);
            }
        }

        const fragment = document.createDocumentFragment();
        this._extensionIdListChildren = [];

        for (let i = 0; i < externallyConnectableExtensionIds.length; i++) {
            const extensionId = externallyConnectableExtensionIds[i];
            const extensionIdElement = this._settingsController.instantiateTemplateFragment('externally-connectable-extension-id');
            /** @type {HTMLInputElement} */
            const input = querySelectorNotNull(extensionIdElement, '.externally-connectable-extension-id-input');
            input.value = extensionId;
            /** @type {HTMLButtonElement} */
            const deleteButton = querySelectorNotNull(extensionIdElement, '.externally-connectable-extension-id-button');
            deleteButton.addEventListener('click', this._onDeleteClick.bind(this, i, deleteButton));
            this._extensionIdListChildren.push(...extensionIdElement.children);
            fragment.appendChild(extensionIdElement);
        }

        this._extensionIdList.insertBefore(fragment, this._extensionIdList.firstChild);
    }

    /**
     * @param {number} index
     * @param {HTMLButtonElement} deleteButton
     */
    async _onDeleteClick(index, deleteButton) {
        if (this._inProgress) { return; }
        this._inProgress = true;
        try {
            deleteButton.disabled = true;
            await this._settingsController.modifyProfileSettings([{
                action: 'splice',
                path: 'general.externallyConnectableExtensionIds',
                start: index,
                deleteCount: 1,
                items: [],
            }]);
            await this._updateOptions();
        } finally {
            this._inProgress = false;
            if (deleteButton.isConnected) {
                deleteButton.disabled = false;
            }
        }
    }
}
