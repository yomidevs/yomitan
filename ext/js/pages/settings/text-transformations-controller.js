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
import {yomitan} from '../../yomitan.js';

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

        await this._updateOptions();
    }

    // Private

    /**
     * @param {import('settings-controller').EventArgument<'optionsChanged'>} details
     */
    async _onOptionsChanged({options}) {
        console.log('TextTransformationsController._onOptionsChanged', options);
        if (options.general.language !== this._language) {
            this._language = options.general.language;

            const settingsItems = document.querySelectorAll('.text-transformation');
            settingsItems.forEach((transformation) => {
                transformation.remove();
            });

            this._transformations = await yomitan.api.getTextTransformations(this._language);
            this._transformations.forEach((transformation) => {
                const settingsItem = document.createElement('div');
                settingsItem.classList.add('settings-item');
                settingsItem.classList.add('text-transformation');

                const innerWrappableDiv = document.createElement('div');
                innerWrappableDiv.classList.add('settings-item-inner', 'settings-item-inner-wrappable');

                const leftSide = document.createElement('div');
                leftSide.classList.add('settings-item-left');

                const label = document.createElement('div');
                label.classList.add('settings-item-label');
                label.textContent = transformation.name;

                const description = document.createElement('div');
                description.classList.add('settings-item-description');
                description.textContent = transformation.description;

                leftSide.appendChild(label);
                leftSide.appendChild(description);

                const rightSide = document.createElement('div');
                rightSide.classList.add('settings-item-right');

                const select = document.createElement('select');
                select.setAttribute('data-setting', `languages.${this._language}.textTransformations.${transformation.id}`);

                Object.entries(transformation.options).forEach(([optionValue, optionLabel]) => {
                    const optionElement = document.createElement('option');
                    optionElement.value = optionValue;
                    optionElement.textContent = optionLabel;
                    select.appendChild(optionElement);
                });

                rightSide.appendChild(select);

                innerWrappableDiv.appendChild(leftSide);
                innerWrappableDiv.appendChild(rightSide);

                settingsItem.appendChild(innerWrappableDiv);

                this._container.appendChild(settingsItem);
            });
        }
    }


    /**
     *
     */
    async _updateOptions() {
        const options = await this._settingsController.getOptions();
        const optionsContext = this._settingsController.getOptionsContext();
        this._onOptionsChanged({options, optionsContext});
    }
}
