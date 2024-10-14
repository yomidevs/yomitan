/*
 * Copyright (C) 2024  Yomitan Authors
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

export class RecommendedSettingsController {
    /**
     * @param {import('./settings-controller.js').SettingsController} settingsController
     */
    constructor(settingsController) {
        /** @type {import('./settings-controller.js').SettingsController} */
        this._settingsController = settingsController;
        /** @type {HTMLElement} */
        this._recommendedSettingsModal = querySelectorNotNull(document, '#recommended-settings-modal');
        /** @type {HTMLInputElement} */
        this._languageSelect = querySelectorNotNull(document, '#language-select');
        /** @type {HTMLInputElement} */
        this._applyButton = querySelectorNotNull(document, '#recommended-settings-apply-button');
    }

    /** */
    async prepare() {
        this._languageSelect.addEventListener('change', this._onLanguageSelectChanged.bind(this), false);
        this._applyButton.addEventListener('click', this._onApplyButtonClicked.bind(this), false);
    }

    /**
     * @param {Event} _e
     */
    _onLanguageSelectChanged(_e) {
        const setLanguage = this._languageSelect.value;
        if (typeof setLanguage !== 'string') { return; }

        const recommendedSettings = this._settingsController.getRecommendedSettings(setLanguage);
        if (typeof recommendedSettings !== 'undefined') {
            const settingsList = querySelectorNotNull(document, '#recommended-settings-list');
            settingsList.innerHTML = '';
            for (const {path, value, description} of recommendedSettings) {
                const template = this._settingsController.instantiateTemplate('recommended-settings-list-item');

                // Render label
                const label = querySelectorNotNull(template, '.settings-item-label');
                const pathCodeElement = document.createElement('code');
                pathCodeElement.textContent = path;
                const valueCodeElement = document.createElement('code');
                valueCodeElement.textContent = value;
                label.appendChild(pathCodeElement);
                label.appendChild(document.createTextNode(' -> '));
                label.appendChild(valueCodeElement);

                // Render description
                const descriptionElement = querySelectorNotNull(template, '.settings-item-description');
                if (description !== 'undefined') {
                    descriptionElement.textContent = description;
                }

                // Render checkbox
                /** @type {HTMLInputElement} */
                const checkbox = querySelectorNotNull(template, 'input[type="checkbox"]');
                checkbox.value = path;

                settingsList.append(template);
            }
            this._recommendedSettingsModal.hidden = false;
        }
    }

    /**
     * @param {MouseEvent} e
     */
    _onApplyButtonClicked(e) {
        e.preventDefault();
        /** @type {HTMLInputElement[]} */
        const enabledCheckboxes = querySelectorNotNull(document, '#recommended-settings-list').querySelectorAll('input[type="checkbox"]:checked');
        if (enabledCheckboxes.length > 0) {
            const recommendedSettings = this._settingsController.getRecommendedSettings(this._languageSelect.value);
            const modifications = [];
            for (const checkbox of enabledCheckboxes) {
                const path = checkbox.value;
                const {action, value} = recommendedSettings.find((setting) => setting.path === path);
                modifications.push({action, path, value});
            }
            void this._settingsController.modifyProfileSettings(modifications);
            void this._settingsController.refresh();
        }
        this._recommendedSettingsModal.hidden = true;
    }
}
