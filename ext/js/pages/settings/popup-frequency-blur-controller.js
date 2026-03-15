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
import {getFrequencyDictionaryOrder, getTermFrequencyDictionaryTitles} from './frequency-dictionary-order-util.js';

export class PopupFrequencyBlurController {
    /**
     * @param {import('./settings-controller.js').SettingsController} settingsController
     */
    constructor(settingsController) {
        /** @type {import('./settings-controller.js').SettingsController} */
        this._settingsController = settingsController;
        /** @type {HTMLInputElement} */
        this._popupFrequencyBlurEnabledCheckbox = querySelectorNotNull(document, '#popup-frequency-blur-enabled');
        /** @type {HTMLSelectElement} */
        this._popupFrequencyBlurDictionarySelect = querySelectorNotNull(document, '#popup-frequency-blur-dictionary');
        /** @type {HTMLElement} */
        this._popupFrequencyBlurOptionsNode = querySelectorNotNull(document, '#popup-frequency-blur-options');
        /** @type {?import('core').TokenObject} */
        this._getDictionaryInfoToken = null;
        /** @type {?import('core').TokenObject} */
        this._setDictionaryToken = null;
    }

    /** */
    async prepare() {
        this._settingsController.application.on('databaseUpdated', this._onDatabaseUpdated.bind(this));
        this._settingsController.on('optionsChanged', this._onOptionsChanged.bind(this));
        this._popupFrequencyBlurEnabledCheckbox.addEventListener('change', this._onPopupFrequencyBlurEnabledChange.bind(this), false);
        this._popupFrequencyBlurDictionarySelect.addEventListener('change', this._onPopupFrequencyBlurDictionarySelectChange.bind(this));

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

        this._updateDictionaryOptions(dictionaries);

        let options = await this._settingsController.getOptions();
        await this._syncSelectedDictionaryOrder(options.general, getTermFrequencyDictionaryTitles(dictionaries));
        if (this._getDictionaryInfoToken !== token) { return; }
        this._getDictionaryInfoToken = null;

        options = await this._settingsController.getOptions();
        const optionsContext = this._settingsController.getOptionsContext();
        this._onOptionsChanged({options, optionsContext});
    }

    /**
     * @param {import('settings-controller').EventArgument<'optionsChanged'>} details
     */
    _onOptionsChanged({options}) {
        const {popupBlurByFrequencyEnabled, popupBlurByFrequencyDictionary} = options.general;
        /** @type {HTMLInputElement} */ (this._popupFrequencyBlurEnabledCheckbox).checked = popupBlurByFrequencyEnabled;
        /** @type {HTMLElement} */ (this._popupFrequencyBlurOptionsNode).hidden = !popupBlurByFrequencyEnabled;
        /** @type {HTMLSelectElement} */ (this._popupFrequencyBlurDictionarySelect).value = (popupBlurByFrequencyDictionary !== null ? popupBlurByFrequencyDictionary : '');
    }

    /**
     * @param {Event} e
     */
    _onPopupFrequencyBlurEnabledChange(e) {
        const node = /** @type {HTMLInputElement} */ (e.currentTarget);
        /** @type {HTMLElement} */ (this._popupFrequencyBlurOptionsNode).hidden = !node.checked;
    }

    /** */
    _onPopupFrequencyBlurDictionarySelectChange() {
        const {value} = /** @type {HTMLSelectElement} */ (this._popupFrequencyBlurDictionarySelect);
        void this._setPopupFrequencyBlurDictionaryValue(value !== '' ? value : null);
    }

    /**
     * @param {import('dictionary-importer').Summary[]} dictionaries
     */
    _updateDictionaryOptions(dictionaries) {
        const fragment = document.createDocumentFragment();
        let option = document.createElement('option');
        option.value = '';
        option.textContent = 'Select dictionary';
        fragment.appendChild(option);
        for (const title of getTermFrequencyDictionaryTitles(dictionaries)) {
            option = document.createElement('option');
            option.value = title;
            option.textContent = title;
            fragment.appendChild(option);
        }
        const select = /** @type {HTMLSelectElement} */ (this._popupFrequencyBlurDictionarySelect);
        select.textContent = '';
        select.appendChild(fragment);
    }

    /**
     * @param {?string} value
     */
    async _setPopupFrequencyBlurDictionaryValue(value) {
        /** @type {import('settings').SortFrequencyDictionaryOrder|null} */
        let order = null;
        /** @type {?import('core').TokenObject} */
        const token = {};
        this._setDictionaryToken = token;
        if (value !== null) {
            order = await getFrequencyDictionaryOrder(this._settingsController.application.api, value);
            if (this._setDictionaryToken !== token) { return; }
        }
        this._setDictionaryToken = null;

        await this._settingsController.modifyProfileSettings([
            {action: 'set', path: 'general.popupBlurByFrequencyDictionary', value},
            {action: 'set', path: 'general.popupBlurByFrequencyOrder', value: order},
        ]);
    }

    /**
     * @param {import('settings').GeneralOptions} generalOptions
     * @param {string[]} availableDictionaries
     */
    async _syncSelectedDictionaryOrder({popupBlurByFrequencyDictionary, popupBlurByFrequencyOrder}, availableDictionaries) {
        const dictionary = popupBlurByFrequencyDictionary;
        /** @type {import('settings').SortFrequencyDictionaryOrder|null} */
        let order = null;
        /** @type {?import('core').TokenObject} */
        const token = {};
        this._setDictionaryToken = token;
        if (dictionary !== null && availableDictionaries.includes(dictionary)) {
            order = await getFrequencyDictionaryOrder(this._settingsController.application.api, dictionary);
            if (this._setDictionaryToken !== token) { return; }
        }
        this._setDictionaryToken = null;

        if (order === popupBlurByFrequencyOrder) { return; }
        await this._settingsController.setProfileSetting('general.popupBlurByFrequencyOrder', order);
    }
}
