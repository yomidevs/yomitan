/*
 * Copyright (C) 2021  Yomichan Authors
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

class SentenceTerminationCharactersController {
    constructor(settingsController) {
        this._settingsController = settingsController;
        this._entries = [];
        this._addButton = null;
        this._resetButton = null;
        this._listTable = null;
        this._listContainer = null;
        this._emptyIndicator = null;
    }

    get settingsController() {
        return this._settingsController;
    }

    async prepare() {
        this._addButton = document.querySelector('#sentence-termination-character-list-add');
        this._resetButton = document.querySelector('#sentence-termination-character-list-reset');
        this._listTable = document.querySelector('#sentence-termination-character-list-table');
        this._listContainer = document.querySelector('#sentence-termination-character-list');
        this._emptyIndicator = document.querySelector('#sentence-termination-character-list-empty');

        this._addButton.addEventListener('click', this._onAddClick.bind(this));
        this._resetButton.addEventListener('click', this._onResetClick.bind(this));
        this._settingsController.on('optionsChanged', this._onOptionsChanged.bind(this));

        await this._updateOptions();
    }

    async addEntry(terminationCharacterEntry) {
        const options = await this._settingsController.getOptions();
        const {sentenceParsing: {terminationCharacters}} = options;

        await this._settingsController.modifyProfileSettings([{
            action: 'splice',
            path: 'sentenceParsing.terminationCharacters',
            start: terminationCharacters.length,
            deleteCount: 0,
            items: [terminationCharacterEntry]
        }]);

        await this._updateOptions();
    }

    async deleteEntry(index) {
        const options = await this._settingsController.getOptions();
        const {sentenceParsing: {terminationCharacters}} = options;

        if (index < 0 || index >= terminationCharacters.length) { return false; }

        await this._settingsController.modifyProfileSettings([{
            action: 'splice',
            path: 'sentenceParsing.terminationCharacters',
            start: index,
            deleteCount: 1,
            items: []
        }]);

        await this._updateOptions();
        return true;
    }

    async modifyProfileSettings(targets) {
        return await this._settingsController.modifyProfileSettings(targets);
    }

    // Private

    _onOptionsChanged({options}) {
        for (const entry of this._entries) {
            entry.cleanup();
        }

        this._entries = [];
        const {sentenceParsing: {terminationCharacters}} = options;

        for (let i = 0, ii = terminationCharacters.length; i < ii; ++i) {
            const terminationCharacterEntry = terminationCharacters[i];
            const node = this._settingsController.instantiateTemplate('sentence-termination-character-entry');
            this._listContainer.appendChild(node);
            const entry = new SentenceTerminationCharacterEntry(this, terminationCharacterEntry, i, node);
            this._entries.push(entry);
            entry.prepare();
        }

        this._listTable.hidden = (terminationCharacters.length === 0);
        this._emptyIndicator.hidden = (terminationCharacters.length !== 0);
    }

    _onAddClick(e) {
        e.preventDefault();
        this._addNewEntry();
    }

    _onResetClick(e) {
        e.preventDefault();
        this._reset();
    }

    async _addNewEntry() {
        const newEntry = {
            enabled: true,
            character1: '"',
            character2: '"',
            includeCharacterAtStart: false,
            includeCharacterAtEnd: false
        };
        return await this.addEntry(newEntry);
    }

    async _updateOptions() {
        const options = await this._settingsController.getOptions();
        this._onOptionsChanged({options});
    }

    async _reset() {
        const defaultOptions = await this._settingsController.getDefaultOptions();
        const value = defaultOptions.profiles[0].options.sentenceParsing.terminationCharacters;
        await this._settingsController.setProfileSetting('sentenceParsing.terminationCharacters', value);
        await this._updateOptions();
    }
}

class SentenceTerminationCharacterEntry {
    constructor(parent, data, index, node) {
        this._parent = parent;
        this._data = data;
        this._index = index;
        this._node = node;
        this._eventListeners = new EventListenerCollection();
        this._character1Input = null;
        this._character2Input = null;
        this._basePath = `sentenceParsing.terminationCharacters[${this._index}]`;
    }

    prepare() {
        const {enabled, character1, character2, includeCharacterAtStart, includeCharacterAtEnd} = this._data;
        const node = this._node;

        const enabledToggle = node.querySelector('.sentence-termination-character-enabled');
        const typeSelect = node.querySelector('.sentence-termination-character-type');
        const character1Input = node.querySelector('.sentence-termination-character-input1');
        const character2Input = node.querySelector('.sentence-termination-character-input2');
        const includeAtStartCheckbox = node.querySelector('.sentence-termination-character-include-at-start');
        const includeAtEndheckbox = node.querySelector('.sentence-termination-character-include-at-end');
        const menuButton = node.querySelector('.sentence-termination-character-entry-button');

        this._character1Input = character1Input;
        this._character2Input = character2Input;

        const type = (character2 === null ? 'terminator' : 'quote');
        node.dataset.type = type;

        enabledToggle.checked = enabled;
        typeSelect.value = type;
        character1Input.value = character1;
        character2Input.value = (character2 !== null ? character2 : '');
        includeAtStartCheckbox.checked = includeCharacterAtStart;
        includeAtEndheckbox.checked = includeCharacterAtEnd;

        enabledToggle.dataset.setting = `${this._basePath}.enabled`;
        includeAtStartCheckbox.dataset.setting = `${this._basePath}.includeCharacterAtStart`;
        includeAtEndheckbox.dataset.setting = `${this._basePath}.includeCharacterAtEnd`;

        this._eventListeners.addEventListener(typeSelect, 'change', this._onTypeSelectChange.bind(this), false);
        this._eventListeners.addEventListener(character1Input, 'change', this._onCharacterChange.bind(this, 1), false);
        this._eventListeners.addEventListener(character2Input, 'change', this._onCharacterChange.bind(this, 2), false);
        this._eventListeners.addEventListener(menuButton, 'menuClose', this._onMenuClose.bind(this), false);
    }

    cleanup() {
        this._eventListeners.removeAllEventListeners();
        if (this._node.parentNode !== null) {
            this._node.parentNode.removeChild(this._node);
        }
    }

    // Private

    _onTypeSelectChange(e) {
        this._setHasCharacter2(e.currentTarget.value === 'quote');
    }

    _onCharacterChange(characterNumber, e) {
        const node = e.currentTarget;
        if (characterNumber === 2 && this._data.character2 === null) {
            node.value = '';
        }

        const value = node.value.substring(0, 1);
        this._setCharacterValue(node, characterNumber, value);
    }

    _onMenuClose(e) {
        switch (e.detail.action) {
            case 'delete':
                this._delete();
                break;
        }
    }

    async _delete() {
        this._parent.deleteEntry(this._index);
    }

    async _setHasCharacter2(has) {
        const okay = await this._setCharacterValue(this._character2Input, 2, has ? this._data.character1 : null);
        if (okay) {
            const type = (!has ? 'terminator' : 'quote');
            this._node.dataset.type = type;
        }
    }

    async _setCharacterValue(inputNode, characterNumber, value) {
        const pathEnd = `character${characterNumber}`;
        const r = await this._parent.settingsController.setProfileSetting(`${this._basePath}.${pathEnd}`, value);
        const okay = !r[0].error;
        if (okay) {
            this._data[pathEnd] = value;
        } else {
            value = this._data[pathEnd];
        }
        inputNode.value = (value !== null ? value : '');
        return okay;
    }
}
