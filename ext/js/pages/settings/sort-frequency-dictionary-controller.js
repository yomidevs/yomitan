/*
 * Copyright (C) 2023-2025  Yomitan Authors
 * Copyright (C) 2021-2022  Yomichan Authors
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
import {getFrequencyDictionaryOrder, getTermFrequencyDictionaryTitles} from './frequency-dictionary-order-util.js';

export class SortFrequencyDictionaryController {
    /**
     * @param {import('./settings-controller.js').SettingsController} settingsController
     */
    constructor(settingsController) {
        /** @type {import('./settings-controller.js').SettingsController} */
        this._settingsController = settingsController;
        /** @type {HTMLSelectElement} */
        this._sortFrequencyDictionarySelect = querySelectorNotNull(document, '#sort-frequency-dictionary');
        /** @type {HTMLSelectElement} */
        this._sortFrequencyDictionaryOrderSelect = querySelectorNotNull(document, '#sort-frequency-dictionary-order');
        /** @type {HTMLButtonElement} */
        this._sortFrequencyDictionaryOrderAutoButton = querySelectorNotNull(document, '#sort-frequency-dictionary-order-auto');
        /** @type {HTMLElement} */
        this._sortFrequencyDictionaryOrderContainerNode = querySelectorNotNull(document, '#sort-frequency-dictionary-order-container');
        /** @type {?import('core').TokenObject} */
        this._getDictionaryInfoToken = null;
    }

    /** */
    async prepare() {
        this._settingsController.application.on('databaseUpdated', this._onDatabaseUpdated.bind(this));
        this._settingsController.on('optionsChanged', this._onOptionsChanged.bind(this));
        this._sortFrequencyDictionarySelect.addEventListener('change', this._onSortFrequencyDictionarySelectChange.bind(this));
        this._sortFrequencyDictionaryOrderSelect.addEventListener('change', this._onSortFrequencyDictionaryOrderSelectChange.bind(this));
        this._sortFrequencyDictionaryOrderAutoButton.addEventListener('click', this._onSortFrequencyDictionaryOrderAutoButtonClick.bind(this));

        await this._onDatabaseUpdated();
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
        const {sortFrequencyDictionary, sortFrequencyDictionaryOrder} = options.general;
        /** @type {HTMLSelectElement} */ (this._sortFrequencyDictionarySelect).value = (sortFrequencyDictionary !== null ? sortFrequencyDictionary : '');
        /** @type {HTMLSelectElement} */ (this._sortFrequencyDictionaryOrderSelect).value = sortFrequencyDictionaryOrder;
        /** @type {HTMLElement} */ (this._sortFrequencyDictionaryOrderContainerNode).hidden = (sortFrequencyDictionary === null);
    }

    /** */
    _onSortFrequencyDictionarySelectChange() {
        const {value} = /** @type {HTMLSelectElement} */ (this._sortFrequencyDictionarySelect);
        void this._setSortFrequencyDictionaryValue(value !== '' ? value : null);
    }

    /** */
    _onSortFrequencyDictionaryOrderSelectChange() {
        const {value} = /** @type {HTMLSelectElement} */ (this._sortFrequencyDictionaryOrderSelect);
        const value2 = this._normalizeSortFrequencyDictionaryOrder(value);
        if (value2 === null) { return; }
        void this._setSortFrequencyDictionaryOrderValue(value2);
    }

    /** */
    _onSortFrequencyDictionaryOrderAutoButtonClick() {
        const {value} = /** @type {HTMLSelectElement} */ (this._sortFrequencyDictionarySelect);
        if (value === '') { return; }
        void this._autoUpdateOrder(value);
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
        for (const title of getTermFrequencyDictionaryTitles(dictionaries)) {
            option = document.createElement('option');
            option.value = title;
            option.textContent = title;
            fragment.appendChild(option);
        }
        const select = /** @type {HTMLSelectElement} */ (this._sortFrequencyDictionarySelect);
        select.textContent = '';
        select.appendChild(fragment);
    }

    /**
     * @param {?string} value
     */
    async _setSortFrequencyDictionaryValue(value) {
        /** @type {HTMLElement} */ (this._sortFrequencyDictionaryOrderContainerNode).hidden = (value === null);
        await this._settingsController.setProfileSetting('general.sortFrequencyDictionary', value);
        if (value !== null) {
            await this._autoUpdateOrder(value);
        }
    }

    /**
     * @param {import('settings').SortFrequencyDictionaryOrder} value
     */
    async _setSortFrequencyDictionaryOrderValue(value) {
        await this._settingsController.setProfileSetting('general.sortFrequencyDictionaryOrder', value);
    }

    /**
     * @param {string} dictionary
     */
    async _autoUpdateOrder(dictionary) {
        const value = await getFrequencyDictionaryOrder(this._settingsController.application.api, dictionary);
        if (value === null) { return; }
        /** @type {HTMLSelectElement} */ (this._sortFrequencyDictionaryOrderSelect).value = value;
        await this._setSortFrequencyDictionaryOrderValue(value);
    }

    /**
     * @param {string} value
     * @returns {?import('settings').SortFrequencyDictionaryOrder}
     */
    _normalizeSortFrequencyDictionaryOrder(value) {
        switch (value) {
            case 'ascending':
            case 'descending':
                return value;
            default:
                return null;
        }
    }
}
