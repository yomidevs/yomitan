/*
 * Copyright (C) 2023  Yomitan Authors
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

import {yomitan} from '../yomitan.js';
export class LocalizationController {
    /**
     *
     * @param settingsController
     */
    constructor(settingsController) {
        /**
         *
         */
        this._settingsController = settingsController;
        /**
         *
         */
        this._locale = '';
        /**
         *
         */
        this._translations = {};
    }

    /**
     *
     * @param options
     */
    async prepare(options) {
        this._settingsController?.on('optionsChanged', this._onOptionsChanged.bind(this));
        this._locales = await yomitan.api.getLocales();
        this._setSelectElement('locale-select');
        if (options) {
            this._onOptionsChanged({options});
        } else {
            await this._updateOptions();
        }
    }

    /**
     *
     * @param selectId
     */
    _setSelectElement(selectId) {
        this._selectElement = document.getElementById(selectId);
        if (!this._selectElement) { return; }
        this._fillSelect();
        this._selectElement.addEventListener('change', this._onSelectChange.bind(this));
    }

    /**
     *
     */
    _onSelectChange() {
        this._updateOptions();
    }

    /**
     *
     */
    _fillSelect() {
        this._locales.forEach((locale) => {
            const option = document.createElement('option');
            option.value = locale.iso;
            // eslint-disable-next-line no-unsanitized/property
            option.innerHTML = `<span i18n="settings.language.languages.${locale.language}">${locale.language}</span> ${locale.flag}`;
            this._selectElement.appendChild(option);
        });
    }

    /**
     *
     * @param root0
     * @param root0.options
     * @param root0.options.general
     * @param root0.options.general.locale
     */
    async _onOptionsChanged({options: {general: {locale}}}) {
        if (locale !== this._locale) {
            this._locale = locale;
            this._translations = await yomitan.api.getTranslations(this._locale);
            this._translateAll();
        }
    }

    /**
     *
     */
    async _updateOptions() {
        const options = await this._settingsController.getOptions();
        this._onOptionsChanged({options});
    }

    /**
     *
     */
    _translateAll() {
        const translatables = document.querySelectorAll('[i18n], [i18n-title]');
        translatables.forEach((element) => {
            this._translateElement(element);
        });
    }

    /**
     *
     * @param element
     */
    _translateElement(element) {
        const key = element.getAttribute('i18n');
        const title = element.getAttribute('i18n-title');
        if (key){
            const translation = this.getDeep(this._translations, key);
            element.innerText = translation || element.innerText;
        }
        if (title){
            const translation = this.getDeep(this._translations, title);
            element.setAttribute('title', translation || element.getAttribute('title'));
        }
    }

    /**
     *
     * @param object
     * @param path
     * @param defaultValue
     */
    getDeep(object, path, defaultValue = null) {
        return path
            .split('.')
            .reduce((o, p) => o ? o[p] : defaultValue, object);
    }
}