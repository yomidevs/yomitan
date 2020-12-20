/*
 * Copyright (C) 2020  Yomichan Authors
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

/* global
 * ObjectPropertyAccessor
 */

class SecondarySearchDictionaryController {
    constructor(settingsController) {
        this._settingsController = settingsController;
        this._getDictionaryInfoToken = null;
        this._container = null;
        this._eventListeners = new EventListenerCollection();
    }

    async prepare() {
        this._container = document.querySelector('#secondary-search-dictionary-list');

        yomichan.on('databaseUpdated', this._onDatabaseUpdated.bind(this));

        await this._onDatabaseUpdated();
    }

    // Private

    async _onDatabaseUpdated() {
        this._eventListeners.removeAllEventListeners();

        const token = {};
        this._getDictionaryInfoToken = token;
        const dictionaries = await this._settingsController.getDictionaryInfo();
        if (this._getDictionaryInfoToken !== token) { return; }
        this._getDictionaryInfoToken = null;

        const fragment = document.createDocumentFragment();
        for (const {title, revision} of dictionaries) {
            const node = this._settingsController.instantiateTemplate('secondary-search-dictionary');
            fragment.appendChild(node);

            const nameNode = node.querySelector('.dictionary-title');
            nameNode.textContent = title;

            const versionNode = node.querySelector('.dictionary-version');
            versionNode.textContent = `rev.${revision}`;

            const toggle = node.querySelector('.dictionary-allow-secondary-searches');
            toggle.dataset.setting = ObjectPropertyAccessor.getPathString(['dictionaries', title, 'allowSecondarySearches']);
            this._eventListeners.addEventListener(toggle, 'settingChanged', this._onEnabledChanged.bind(this, node), false);
        }

        this._container.textContent = '';
        this._container.appendChild(fragment);
    }

    _onEnabledChanged(node, e) {
        const {detail: {value}} = e;
        node.dataset.enabled = `${value}`;
    }
}