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

export class TextPreprocessorsController {
    /**
     * @param {import('./settings-controller.js').SettingsController} settingsController
     */
    constructor(settingsController) {
        /** @type {import('./settings-controller.js').SettingsController} */
        this._settingsController = settingsController;
        /** @type {HTMLSelectElement} */
        this._container = querySelectorNotNull(document, '#text-preprocessors');
        /** @type {import('language').TextPreprocessor[]}*/
        this._preprocessors = [];
        /** @type {string} */
        this._language = '';
    }

    /**
     *
     */
    async prepare() {
        this._settingsController.on('optionsChanged', this._onOptionsChanged.bind(this));

        const languageSelect = querySelectorNotNull(document, '#language-select');
        languageSelect.addEventListener('settingChanged', this._updateOptions.bind(this), false);

        await this._updateOptions();
    }

    // Private

    /**
     * @param {import('settings-controller').EventArgument<'optionsChanged'>} details
     */
    async _onOptionsChanged({options}) {
        if (options.general.language === this._language) {
            return;
        }

        this._language = options.general.language;

        this._clearSettingsItems();
        this._preprocessors = await this._settingsController.application.api.getTextPreprocessors(this._language);
        this._renderSettingsItems();
    }

    /** */
    _clearSettingsItems() {
        const settingsItems = document.querySelectorAll('.text-preprocessor');
        for (const preprocessor of settingsItems) {
            preprocessor.remove();
        }
    }

    /** */
    _renderSettingsItems() {
        for (const preprocessor of this._preprocessors) {
            const settingsItem = this._createSettingsItem(preprocessor);
            this._container.appendChild(settingsItem);
        }
    }

    /**
     * @param {import('language').TextPreprocessor} preprocessor
     * @returns {HTMLElement}
     */
    _createSettingsItem(preprocessor) {
        const settingsItem = document.createElement('div');
        settingsItem.classList.add('settings-item', 'text-preprocessor');

        const innerWrappableDiv = document.createElement('div');
        innerWrappableDiv.classList.add('settings-item-inner', 'settings-item-inner-wrappable');

        innerWrappableDiv.appendChild(this._createLeftSide(preprocessor));
        innerWrappableDiv.appendChild(this._createRightSide(preprocessor));

        settingsItem.appendChild(innerWrappableDiv);

        return settingsItem;
    }

    /**
     * @param {import('language').TextPreprocessor} preprocessor
     * @returns {HTMLElement}
     */
    _createLeftSide(preprocessor) {
        const leftSide = document.createElement('div');
        leftSide.classList.add('settings-item-left');

        leftSide.appendChild(this._createLabel(preprocessor));
        leftSide.appendChild(this._createDescription(preprocessor));

        return leftSide;
    }

    /**
     * @param {import('language').TextPreprocessor} preprocessor
     * @returns {HTMLElement}
     */
    _createLabel(preprocessor) {
        const label = document.createElement('div');
        label.classList.add('settings-item-label');
        label.textContent = preprocessor.name;
        return label;
    }

    /**
     * @param {import('language').TextPreprocessor} preprocessor
     * @returns {HTMLElement}
     */
    _createDescription(preprocessor) {
        const description = document.createElement('div');
        description.classList.add('settings-item-description');
        description.textContent = preprocessor.description;
        return description;
    }

    /**
     * @param {import('language').TextPreprocessor} preprocessor
     * @returns {HTMLElement}
     */
    _createRightSide(preprocessor) {
        const rightSide = document.createElement('div');
        rightSide.classList.add('settings-item-right');

        rightSide.appendChild(this._createSelect(preprocessor));

        return rightSide;
    }

    /**
     * @param {import('language').TextPreprocessor} preprocessor
     * @returns {HTMLSelectElement}
     */
    _createSelect(preprocessor) {
        const select = document.createElement('select');
        select.setAttribute('data-setting', `languages[${JSON.stringify(this._language)}].textPreprocessors.${preprocessor.id}`);

        for (const [optionValue, optionLabel] of preprocessor.options) {
            const optionElement = document.createElement('option');
            optionElement.value = optionValue;
            optionElement.textContent = optionLabel;
            select.appendChild(optionElement);
        }

        return select;
    }

    /** */
    async _updateOptions() {
        const options = await this._settingsController.getOptions();
        const optionsContext = this._settingsController.getOptionsContext();
        this._onOptionsChanged({options, optionsContext});
    }
}
