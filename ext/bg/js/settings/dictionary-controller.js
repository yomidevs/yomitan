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
 * DictionaryDatabase
 * Modal
 * ObjectPropertyAccessor
 * api
 */

class DictionaryEntry {
    constructor(dictionaryController, node, dictionaryInfo) {
        this._dictionaryController = dictionaryController;
        this._node = node;
        this._dictionaryInfo = dictionaryInfo;
        this._dictionaryTitle = dictionaryInfo.title;
        this._eventListeners = new EventListenerCollection();
        this._enabledCheckbox = node.querySelector('.dict-enabled');
        this._allowSecondarySearchesCheckbox = node.querySelector('.dict-allow-secondary-searches');
        this._priorityInput = node.querySelector('.dict-priority');
        this._deleteButton = node.querySelector('.dict-delete-button');
        this._detailsToggleLink = node.querySelector('.dict-details-toggle-link');
        this._detailsContainer = node.querySelector('.dict-details');
        this._detailsTable = node.querySelector('.dict-details-table');
    }

    get node() {
        return this._node;
    }

    get dictionaryTitle() {
        return this._dictionaryTitle;
    }

    prepare() {
        const node = this._node;
        const dictionaryInfo = this._dictionaryInfo;
        const {title, revision, prefixWildcardsSupported} = dictionaryInfo;

        if (dictionaryInfo.version < 3) {
            node.querySelector('.dict-outdated').hidden = false;
        }

        node.querySelector('.dict-title').textContent = title;
        node.querySelector('.dict-revision').textContent = `rev.${revision}`;
        node.querySelector('.dict-prefix-wildcard-searches-supported').checked = !!prefixWildcardsSupported;

        this._setupDetails(dictionaryInfo);

        this._enabledCheckbox.dataset.setting = ObjectPropertyAccessor.getPathString(['dictionaries', title, 'enabled']);
        this._allowSecondarySearchesCheckbox.dataset.setting = ObjectPropertyAccessor.getPathString(['dictionaries', title, 'allowSecondarySearches']);
        this._priorityInput.dataset.setting = ObjectPropertyAccessor.getPathString(['dictionaries', title, 'priority']);

        this._eventListeners.addEventListener(this._deleteButton, 'click', this._onDeleteButtonClicked.bind(this), false);
        this._eventListeners.addEventListener(this._detailsToggleLink, 'click', this._onDetailsToggleLinkClicked.bind(this), false);
        this._eventListeners.addEventListener(this._priorityInput, 'settingChanged', this._onPriorityChanged.bind(this), false);
    }

    cleanup() {
        this._eventListeners.removeAllEventListeners();
        const node = this._node;
        if (node.parentNode !== null) {
            node.parentNode.removeChild(node);
        }
    }

    setCounts(counts) {
        const node = this._node.querySelector('.dict-counts');
        node.textContent = JSON.stringify({info: this._dictionaryInfo, counts}, null, 4);
        node.hidden = false;
    }

    // Private

    _onDeleteButtonClicked(e) {
        e.preventDefault();
        this._dictionaryController.deleteDictionary(this._dictionaryTitle);
    }

    _onDetailsToggleLinkClicked(e) {
        e.preventDefault();
        this._detailsContainer.hidden = !this._detailsContainer.hidden;
    }

    _onPriorityChanged(e) {
        const {detail: {value}} = e;
        this._node.style.order = `${-value}`;
    }

    _setupDetails(dictionaryInfo) {
        const targets = [
            ['Author', 'author'],
            ['URL', 'url'],
            ['Description', 'description'],
            ['Attribution', 'attribution']
        ];

        const fragment = document.createDocumentFragment();
        let count = 0;
        for (const [label, key] of targets) {
            const info = dictionaryInfo[key];
            if (typeof info !== 'string') { continue; }

            const n1 = document.createElement('div');
            n1.className = 'dict-details-entry';
            n1.dataset.type = key;

            const n2 = document.createElement('span');
            n2.className = 'dict-details-entry-label';
            n2.textContent = `${label}:`;
            n1.appendChild(n2);

            const n3 = document.createElement('span');
            n3.className = 'dict-details-entry-info';
            n3.textContent = info;
            n1.appendChild(n3);

            fragment.appendChild(n1);

            ++count;
        }

        if (count > 0) {
            this._detailsTable.appendChild(fragment);
        } else {
            this._detailsContainer.hidden = true;
            this._detailsToggleLink.hidden = true;
        }
    }
}

class DictionaryController {
    constructor(settingsController, modalController) {
        this._settingsController = settingsController;
        this._modalController = modalController;
        this._dictionaries = null;
        this._dictionaryEntries = [];
        this._databaseStateToken = null;
        this._checkingIntegrity = false;
        this._warningNode = null;
        this._mainDictionarySelect = null;
        this._checkIntegrityButton = null;
        this._dictionaryEntryContainer = null;
        this._integrityExtraInfoContainer = null;
        this._deleteDictionaryModal = null;
        this._integrityExtraInfoNode = null;
        this._isDeleting = false;
    }

    async prepare() {
        this._warningNode = document.querySelector('#dict-warning');
        this._mainDictionarySelect = document.querySelector('#dict-main');
        this._checkIntegrityButton = document.querySelector('#dict-check-integrity');
        this._dictionaryEntryContainer = document.querySelector('#dict-groups');
        this._integrityExtraInfoContainer = document.querySelector('#dict-groups-extra');
        this._deleteDictionaryModal = this._modalController.getModal('dict-delete-modal');

        yomichan.on('databaseUpdated', this._onDatabaseUpdated.bind(this));

        document.querySelector('#dict-delete-confirm').addEventListener('click', this._onDictionaryConfirmDelete.bind(this), false);
        this._checkIntegrityButton.addEventListener('click', this._onCheckIntegrityButtonClick.bind(this), false);

        await this._onDatabaseUpdated();
    }

    deleteDictionary(dictionaryTitle) {
        if (this._isDeleting) { return; }
        const modal = this._deleteDictionaryModal;
        modal.node.dataset.dictionaryTitle = dictionaryTitle;
        modal.node.querySelector('#dict-remove-modal-dict-name').textContent = dictionaryTitle;
        modal.setVisible(true);
    }

    // Private

    async _onDatabaseUpdated() {
        const token = {};
        this._databaseStateToken = token;
        this._dictionaries = null;
        const dictionaries = await api.getDictionaryInfo();
        if (this._databaseStateToken !== token) { return; }
        this._dictionaries = dictionaries;

        this._warningNode.hidden = (dictionaries.length > 0);
        this._updateMainDictionarySelectOptions(dictionaries);

        for (const entry of this._dictionaryEntries) {
            entry.cleanup();
        }
        this._dictionaryEntries = [];

        for (const dictionary of dictionaries) {
            this._createDictionaryEntry(dictionary);
        }
    }

    _onDictionaryConfirmDelete(e) {
        e.preventDefault();

        const modal = this._deleteDictionaryModal;
        modal.setVisible(false);

        const title = modal.node.dataset.dictionaryTitle;
        if (typeof title !== 'string') { return; }
        delete modal.node.dataset.dictionaryTitle;

        this._deleteDictionary(title);
    }

    _onCheckIntegrityButtonClick(e) {
        e.preventDefault();
        this._checkIntegrity();
    }

    _updateMainDictionarySelectOptions(dictionaries) {
        const fragment = document.createDocumentFragment();

        let option = document.createElement('option');
        option.className = 'text-muted';
        option.value = '';
        option.textContent = 'Not selected';
        fragment.appendChild(option);

        for (const {title, sequenced} of dictionaries) {
            if (!sequenced) { continue; }
            option = document.createElement('option');
            option.value = title;
            option.textContent = title;
            fragment.appendChild(option);
        }

        const select = this._mainDictionarySelect;
        select.textContent = ''; // Empty
        select.appendChild(fragment);
    }

    async _checkIntegrity() {
        if (this._dictionaries === null || this._checkingIntegrity || this._isDeleting) { return; }

        try {
            this._checkingIntegrity = true;
            this._setButtonsEnabled(false);

            const token = this._databaseStateToken;
            const dictionaryTitles = this._dictionaries.map(({title}) => title);
            const {counts, total} = await api.getDictionaryCounts(dictionaryTitles, true);
            if (this._databaseStateToken !== token) { return; }

            for (let i = 0, ii = Math.min(counts.length, this._dictionaryEntries.length); i < ii; ++i) {
                const entry = this._dictionaryEntries[i];
                entry.setCounts(counts[i]);
            }

            this._setCounts(counts, total);
        } finally {
            this._setButtonsEnabled(true);
            this._checkingIntegrity = false;
        }
    }

    _setCounts(dictionaryCounts, totalCounts) {
        const remainders = Object.assign({}, totalCounts);
        const keys = Object.keys(remainders);

        for (const counts of dictionaryCounts) {
            for (const key of keys) {
                remainders[key] -= counts[key];
            }
        }

        let totalRemainder = 0;
        for (const key of keys) {
            totalRemainder += remainders[key];
        }

        this._cleanupExtra();
        if (totalRemainder > 0) {
            this.extra = this._createExtra(totalCounts, remainders, totalRemainder);
        }
    }

    _createExtra(totalCounts, remainders, totalRemainder) {
        const node = this._settingsController.instantiateTemplate('dict-extra');
        this._integrityExtraInfoNode = node;

        node.querySelector('.dict-total-count').textContent = `${totalRemainder} item${totalRemainder !== 1 ? 's' : ''}`;

        const n = node.querySelector('.dict-counts');
        n.textContent = JSON.stringify({counts: totalCounts, remainders}, null, 4);
        n.hidden = false;

        this._integrityExtraInfoContainer.appendChild(node);
    }

    _cleanupExtra() {
        const node = this._integrityExtraInfoNode;
        if (node === null) { return; }
        this._integrityExtraInfoNode = null;

        const parent = node.parentNode;
        if (parent === null) { return; }

        parent.removeChild(node);
    }

    _createDictionaryEntry(dictionary) {
        const node = this._settingsController.instantiateTemplate('dict');
        this._dictionaryEntryContainer.appendChild(node);

        const entry = new DictionaryEntry(this, node, dictionary);
        this._dictionaryEntries.push(entry);
        entry.prepare();
    }

    async _deleteDictionary(dictionaryTitle) {
        if (this._isDeleting || this._checkingIntegrity) { return; }

        const index = this._dictionaryEntries.findIndex((entry) => entry.dictionaryTitle === dictionaryTitle);
        if (index < 0) { return; }

        const entry = this._dictionaryEntries[index];
        const node = entry.node;
        const progress = node.querySelector('.progress');
        const progressBar = node.querySelector('.progress-bar');
        const prevention = this._settingsController.preventPageExit();
        try {
            this._isDeleting = true;
            this._setButtonsEnabled(false);

            progress.hidden = false;

            const onProgress = ({processed, count, storeCount, storesProcesed}) => {
                let percent = 0.0;
                if (count > 0 && storesProcesed > 0) {
                    percent = (processed / count) * (storesProcesed / storeCount) * 100.0;
                }
                progressBar.style.width = `${percent}%`;
            };

            await this._deleteDictionaryInternal(dictionaryTitle, onProgress);
            await this._deleteDictionarySettings(dictionaryTitle);
        } catch (e) {
            yomichan.logError(e);
        } finally {
            prevention.end();
            progress.hidden = true;
            this._setButtonsEnabled(true);
            this._isDeleting = false;
        }
    }

    _setButtonsEnabled(value) {
        value = !value;
        for (const node of document.querySelectorAll('.dictionary-modifying-input')) {
            node.disabled = value;
        }
    }

    async _deleteDictionaryInternal(dictionaryTitle, onProgress) {
        const dictionaryDatabase = await this._getPreparedDictionaryDatabase();
        try {
            await dictionaryDatabase.deleteDictionary(dictionaryTitle, {rate: 1000}, onProgress);
            api.triggerDatabaseUpdated('dictionary', 'delete');
        } finally {
            dictionaryDatabase.close();
        }
    }

    async _getPreparedDictionaryDatabase() {
        const dictionaryDatabase = new DictionaryDatabase();
        await dictionaryDatabase.prepare();
        return dictionaryDatabase;
    }

    async _deleteDictionarySettings(dictionaryTitle) {
        const optionsFull = await this._settingsController.getOptionsFull();
        const {profiles} = optionsFull;
        const targets = [];
        for (let i = 0, ii = profiles.length; i < ii; ++i) {
            const {options: {dictionaries}} = profiles[i];
            if (Object.prototype.hasOwnProperty.call(dictionaries, dictionaryTitle)) {
                const path = ObjectPropertyAccessor.getPathString(['profiles', i, 'options', 'dictionaries', dictionaryTitle]);
                targets.push({action: 'delete', path});
            }
        }
        await this._settingsController.modifyGlobalSettings(targets);
    }
}
