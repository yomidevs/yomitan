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

export class TextTransformationsController {
    /**
     * @param {import('./settings-controller.js').SettingsController} settingsController
     */
    constructor(settingsController) {
        /** @type {import('./settings-controller.js').SettingsController} */
        this._settingsController = settingsController;
        /** @type {HTMLSelectElement} */
        this._container = querySelectorNotNull(document, '#text-transformations');
        /** @type {import('language').TextTransformation[]}*/
        this._transformations = [];
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
        this._transformations = await this._settingsController.application.api.getTextTransformations(this._language);
        this._renderSettingsItems();
    }

    /** */
    _clearSettingsItems() {
        const settingsItems = document.querySelectorAll('.text-transformation');
        for (const transformation of settingsItems) {
            transformation.remove();
        }
    }

    /** */
    _renderSettingsItems() {
        for (const transformation of this._transformations) {
            const settingsItem = this._createSettingsItem(transformation);
            this._container.appendChild(settingsItem);
        }
    }

    /**
     * @param {import('language').TextTransformation} transformation
     * @returns {HTMLElement}
     */
    _createSettingsItem(transformation) {
        const settingsItem = document.createElement('div');
        settingsItem.classList.add('settings-item', 'text-transformation');

        const innerWrappableDiv = document.createElement('div');
        innerWrappableDiv.classList.add('settings-item-inner', 'settings-item-inner-wrappable');

        innerWrappableDiv.appendChild(this._createLeftSide(transformation));
        innerWrappableDiv.appendChild(this._createRightSide(transformation));

        settingsItem.appendChild(innerWrappableDiv);

        return settingsItem;
    }

    /**
     * @param {import('language').TextTransformation} transformation
     * @returns {HTMLElement}
     */
    _createLeftSide(transformation) {
        const leftSide = document.createElement('div');
        leftSide.classList.add('settings-item-left');

        leftSide.appendChild(this._createLabel(transformation));
        leftSide.appendChild(this._createDescription(transformation));

        return leftSide;
    }

    /**
     * @param {import('language').TextTransformation} transformation
     * @returns {HTMLElement}
     */
    _createLabel(transformation) {
        const label = document.createElement('div');
        label.classList.add('settings-item-label');
        label.textContent = transformation.name;
        return label;
    }

    /**
     * @param {import('language').TextTransformation} transformation
     * @returns {HTMLElement}
     */
    _createDescription(transformation) {
        const description = document.createElement('div');
        description.classList.add('settings-item-description');
        description.textContent = transformation.description;
        return description;
    }

    /**
     * @param {import('language').TextTransformation} transformation
     * @returns {HTMLElement}
     */
    _createRightSide(transformation) {
        const rightSide = document.createElement('div');
        rightSide.classList.add('settings-item-right');

        rightSide.appendChild(this._createSelect(transformation));

        return rightSide;
    }

    /**
     * @param {import('language').TextTransformation} transformation
     * @returns {HTMLSelectElement}
     */
    _createSelect(transformation) {
        const select = document.createElement('select');
        select.setAttribute('data-setting', `languages.${this._language}.textTransformations.${transformation.id}`);

        for (const [optionValue, optionLabel] of transformation.options) {
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
