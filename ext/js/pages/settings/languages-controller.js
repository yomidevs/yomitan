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

import {EventListenerCollection} from '../../core/event-listener-collection.js';
import {querySelectorNotNull} from '../../dom/query-selector.js';

export class LanguagesController {
    /**
     * @param {import('./settings-controller.js').SettingsController} settingsController
     */
    constructor(settingsController) {
        /** @type {import('./settings-controller.js').SettingsController} */
        this._settingsController = settingsController;
        /** @type {import('language').LanguageSummary[]} */
        this._languages = [];
        /** @type {EventListenerCollection} */
        this._eventListeners = new EventListenerCollection();
    }

    /** */
    async prepare() {
        this._languages = await this._settingsController.application.api.getLanguageSummaries();
        this._languages.sort((a, b) => a.iso.localeCompare(b.iso, 'en'));
        this._fillSelect();
    }

    /** */
    _fillSelect() {
        const selectElement = querySelectorNotNull(document, '#language-select');
        for (const {iso, name} of this._languages) {
            const option = document.createElement('option');
            option.value = iso;
            option.text = `(${iso}) ${name}`;
            selectElement.appendChild(option);
        }
    }
}
