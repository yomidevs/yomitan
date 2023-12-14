/*
 * Copyright (C) 2023  Yomitan Authors
 * Copyright (C) 2016-2022  Yomichan Authors
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

import {yomitan} from '../../yomitan.js';
export class LanguagesController {
    constructor(settingsController) {
        this._settingsController = settingsController;
        this._languages = [
            {'iso': 'ja', 'language': 'Japanese', 'flag': '🇯🇵'}
        ];
    }

    async prepare() {
        this._languages = await yomitan.api.getLanguages();
        this._languages.sort((a, b) => a.iso.localeCompare(b.iso));
        this._setSelectElement('language-select');
    }

    _setSelectElement(selectId) {
        this._selectElement = document.getElementById(selectId);
        this._fillSelect();
    }

    _fillSelect() {
        this._languages.forEach((lang) => {
            const option = document.createElement('option');
            option.value = lang.iso;
            // eslint-disable-next-line no-unsanitized/property
            option.innerHTML = `(${lang.iso}) <span i18n="settings.language.languages.${lang.language}">${lang.language}</span> ${lang.flag}`;
            this._selectElement.appendChild(option);
        });
    }
}
