/*
 * Copyright (C) 2023-2024  Yomitan Authors
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
import {yomitan} from '../../yomitan.js';

export class LanguagesController {
    /**
     * @param {import('./settings-controller.js').SettingsController} settingsController
     */
    constructor(settingsController) {
        /** @type {import('./settings-controller.js').SettingsController} */
        this._settingsController = settingsController;
        /** @type {import('language').Language[]} */
        this._languages = [];
    }

    /** */
    async prepare() {
        this._languages = await yomitan.api.getLanguages();
        this._languages.sort((a, b) => a.iso.localeCompare(b.iso));
        this._fillSelect();
    }

    /** */
    _fillSelect() {
        const selectElement = querySelectorNotNull(document, '#language-select');
        for (const {iso, name, flag} of this._languages) {
            const option = document.createElement('option');
            option.value = iso;
            option.text = `(${iso}) ${name} ${flag}`;
            selectElement.appendChild(option);
        }
    }
}

