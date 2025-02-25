/*
 * Copyright (C) 2023-2025  Yomitan Authors
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

/**
 * Controller for managing OpenAI integration settings.
 */
export class OpenAiController {
    /**
     * Creates a new instance of the OpenAI controller.
     * @param {import('./settings-controller').SettingsController} settingsController
     */
    constructor(settingsController) {
        this._settingsController = settingsController;
        this._apiKeyInput = null;
        this._modelSelect = null;
    }

    /**
     * Prepares the controller by setting up event listeners and initializing UI elements.
     */
    async prepare() {
        // Get the input elements
        this._apiKeyInput = document.querySelector('[data-setting="openAi.apiKey"]');
        this._modelSelect = document.querySelector('[data-setting="openAi.model"]');

        if (!this._apiKeyInput || !this._modelSelect) {
            console.error('OpenAI settings elements not found');
            return;
        }

        // Set up event listeners
        this._apiKeyInput.addEventListener('input', this._onApiKeyChange.bind(this));
        this._modelSelect.addEventListener('change', this._onModelChange.bind(this));

        // Initialize values
        await this._updateValues();
    }

    /**
     * Updates the UI elements with the current settings values.
     */
    async _updateValues() {
        const options = await this._settingsController.getOptions();

        // Ensure openAi object exists with default values
        const openAi = options.openAi || { apiKey: '', model: 'gpt-4o-mini' };

        // Verify input elements exist and are of correct type
        if (!this._apiKeyInput || !this._modelSelect) {
            console.error('OpenAI settings elements not found');
            return;
        }

        if (!(this._apiKeyInput instanceof HTMLInputElement) || !(this._modelSelect instanceof HTMLSelectElement)) {
            console.error('OpenAI settings elements are of incorrect type');
            return;
        }

        // Update input values with current or default settings
        this._apiKeyInput.value = openAi.apiKey || '';
        this._modelSelect.value = openAi.model || 'gpt-4o-mini';

        // If openAi object was missing, initialize it in the settings
        if (!options.openAi) {
            await this._settingsController.setProfileSetting('openAi', openAi);
        }
    }

    /**
     * Handles changes to the API key input.
     * @param {Event} event
     */
    async _onApiKeyChange(event) {
        const target = /** @type {HTMLInputElement} */ (event.target);
        const value = target.value;
        try {
            await this._settingsController.setProfileSetting('openAi.apiKey', value);
        } catch (error) {
            console.error('Failed to save API key:', error);
        }
    }

    /**
     * Handles changes to the model selection.
     * @param {Event} event
     */
    async _onModelChange(event) {
        const target = /** @type {HTMLSelectElement} */ (event.target);
        const value = target.value;
        try {
            await this._settingsController.setProfileSetting('openAi.model', value);
        } catch (error) {
            console.error('Failed to save model selection:', error);
        }
    }
}