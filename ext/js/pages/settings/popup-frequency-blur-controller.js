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

import {querySelectorNotNull} from '../../dom/query-selector.js';

export class PopupFrequencyBlurController {
    /**
     * @param {import('./settings-controller.js').SettingsController} settingsController
     */
    constructor(settingsController) {
        /** @type {import('./settings-controller.js').SettingsController} */
        this._settingsController = settingsController;
        /** @type {HTMLSelectElement} */
        this._popupFrequencyBlurDictionarySelect = querySelectorNotNull(document, '#popup-frequency-blur-dictionary');
        /** @type {?import('core').TokenObject} */
        this._getDictionaryInfoToken = null;
    }

    /** */
    async prepare() {
        await this._onDatabaseUpdated();

        this._settingsController.application.on('databaseUpdated', this._onDatabaseUpdated.bind(this));
        this._settingsController.on('optionsChanged', this._onOptionsChanged.bind(this));
    }

    // Private

    /** */
    async _onDatabaseUpdated() {
        /** @type {?import('core').TokenObject} */
        const token = {};
        this._getDictionaryInfoToken = token;
        const dictionaries = await this._settingsController.getDictionaryInfo();
        if (this._getDictionaryInfoToken !== token) { return; }
        this._getDictionaryInfoToken = null;

        this._updateDictionaryOptions(dictionaries);

        const options = await this._settingsController.getOptions();
        const optionsContext = this._settingsController.getOptionsContext();
        this._onOptionsChanged({options, optionsContext});
    }

    /**
     * @param {import('settings-controller').EventArgument<'optionsChanged'>} details
     */
    _onOptionsChanged({options}) {
        const {popupBlurByFrequencyDictionary} = options.general;
        this._popupFrequencyBlurDictionarySelect.value = (popupBlurByFrequencyDictionary !== null ? popupBlurByFrequencyDictionary : '');
    }

    /**
     * @param {import('dictionary-importer').Summary[]} dictionaries
     */
    _updateDictionaryOptions(dictionaries) {
        const fragment = document.createDocumentFragment();
        let option = document.createElement('option');
        option.value = '';
        option.textContent = 'None';
        fragment.appendChild(option);

        for (const {title, counts} of dictionaries) {
            if (counts && counts.termMeta && counts.termMeta.freq > 0) {
                option = document.createElement('option');
                option.value = title;
                option.textContent = title;
                fragment.appendChild(option);
            }
        }

        this._popupFrequencyBlurDictionarySelect.textContent = '';
        this._popupFrequencyBlurDictionarySelect.appendChild(fragment);
    }
}
