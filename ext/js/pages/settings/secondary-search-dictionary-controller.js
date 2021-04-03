/*
 * Copyright (C) 2020-2021  Yomichan Authors
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

class SecondarySearchDictionaryController {
    constructor(settingsController) {
        this._settingsController = settingsController;
        this._getDictionaryInfoToken = null;
        this._dictionaryInfoMap = new Map();
        this._eventListeners = new EventListenerCollection();
        this._container = null;
    }

    async prepare() {
        this._container = document.querySelector('#secondary-search-dictionary-list');

        await this._onDatabaseUpdated();

        yomichan.on('databaseUpdated', this._onDatabaseUpdated.bind(this));
        this._settingsController.on('optionsChanged', this._onOptionsChanged.bind(this));
    }

    // Private

    async _onDatabaseUpdated() {
        const token = {};
        this._getDictionaryInfoToken = token;
        const dictionaries = await this._settingsController.getDictionaryInfo();
        if (this._getDictionaryInfoToken !== token) { return; }
        this._getDictionaryInfoToken = null;

        this._dictionaryInfoMap.clear();
        for (const entry of dictionaries) {
            this._dictionaryInfoMap.set(entry.title, entry);
        }

        const options = await this._settingsController.getOptions();
        this._onOptionsChanged({options});
    }

    _onOptionsChanged({options}) {
        this._eventListeners.removeAllEventListeners();

        const fragment = document.createDocumentFragment();

        const {dictionaries} = options;
        for (let i = 0, ii = dictionaries.length; i < ii; ++i) {
            const {name} = dictionaries[i];
            const dictionaryInfo = this._dictionaryInfoMap.get(name);
            if (typeof dictionaryInfo === 'undefined') { continue; }

            const node = this._settingsController.instantiateTemplate('secondary-search-dictionary');
            fragment.appendChild(node);

            const nameNode = node.querySelector('.dictionary-title');
            nameNode.textContent = name;

            const versionNode = node.querySelector('.dictionary-version');
            versionNode.textContent = `rev.${dictionaryInfo.revision}`;

            const toggle = node.querySelector('.dictionary-allow-secondary-searches');
            toggle.dataset.setting = `dictionaries[${i}].allowSecondarySearches`;
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