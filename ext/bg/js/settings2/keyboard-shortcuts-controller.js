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

/* global
 * KeyboardMouseInputField
 * api
 */

class KeyboardShortcutController {
    constructor(settingsController) {
        this._settingsController = settingsController;
        this._entries = [];
        this._os = null;
        this._addButton = null;
        this._resetButton = null;
        this._listContainer = null;
        this._emptyIndicator = null;
        this._stringComparer = new Intl.Collator('en-US'); // Invariant locale
        this._scrollContainer = null;
    }

    get settingsController() {
        return this._settingsController;
    }

    async prepare() {
        const {platform: {os}} = await api.getEnvironmentInfo();
        this._os = os;

        this._addButton = document.querySelector('#hotkey-list-add');
        this._resetButton = document.querySelector('#hotkey-list-reset');
        this._listContainer = document.querySelector('#hotkey-list');
        this._emptyIndicator = document.querySelector('#hotkey-list-empty');
        this._scrollContainer = document.querySelector('#keyboard-shortcuts .modal-body');

        this._addButton.addEventListener('click', this._onAddClick.bind(this));
        this._resetButton.addEventListener('click', this._onResetClick.bind(this));
        this._settingsController.on('optionsChanged', this._onOptionsChanged.bind(this));

        await this._updateOptions();
    }

    async addEntry(terminationCharacterEntry) {
        const options = await this._settingsController.getOptions();
        const {inputs: {hotkeys}} = options;

        await this._settingsController.modifyProfileSettings([{
            action: 'splice',
            path: 'inputs.hotkeys',
            start: hotkeys.length,
            deleteCount: 0,
            items: [terminationCharacterEntry]
        }]);

        await this._updateOptions();
        this._scrollContainer.scrollTop = this._scrollContainer.scrollHeight;
    }

    async deleteEntry(index) {
        const options = await this._settingsController.getOptions();
        const {inputs: {hotkeys}} = options;

        if (index < 0 || index >= hotkeys.length) { return false; }

        await this._settingsController.modifyProfileSettings([{
            action: 'splice',
            path: 'inputs.hotkeys',
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

    async getDefaultHotkeys() {
        const defaultOptions = await this._settingsController.getDefaultOptions();
        return defaultOptions.profiles[0].options.inputs.hotkeys;
    }

    // Private

    _onOptionsChanged({options}) {
        for (const entry of this._entries) {
            entry.cleanup();
        }

        this._entries = [];
        const {inputs: {hotkeys}} = options;
        const fragment = document.createDocumentFragment();

        for (let i = 0, ii = hotkeys.length; i < ii; ++i) {
            const hotkeyEntry = hotkeys[i];
            const node = this._settingsController.instantiateTemplate('hotkey-list-item');
            fragment.appendChild(node);
            const entry = new KeyboardShortcutHotkeyEntry(this, hotkeyEntry, i, node, this._os, this._stringComparer);
            this._entries.push(entry);
            entry.prepare();
        }

        this._listContainer.appendChild(fragment);
        this._listContainer.hidden = (hotkeys.length === 0);
        this._emptyIndicator.hidden = (hotkeys.length !== 0);
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
            action: '',
            key: null,
            modifiers: [],
            scopes: ['popup', 'search'],
            enabled: true
        };
        return await this.addEntry(newEntry);
    }

    async _updateOptions() {
        const options = await this._settingsController.getOptions();
        this._onOptionsChanged({options});
    }

    async _reset() {
        const value = await this.getDefaultHotkeys();
        await this._settingsController.setProfileSetting('inputs.hotkeys', value);
        await this._updateOptions();
    }
}

class KeyboardShortcutHotkeyEntry {
    constructor(parent, data, index, node, os, stringComparer) {
        this._parent = parent;
        this._data = data;
        this._index = index;
        this._node = node;
        this._os = os;
        this._eventListeners = new EventListenerCollection();
        this._inputField = null;
        this._actionSelect = null;
        this._scopeCheckboxes = null;
        this._scopeCheckboxContainers = null;
        this._basePath = `inputs.hotkeys[${this._index}]`;
        this._stringComparer = stringComparer;
    }

    prepare() {
        const node = this._node;

        const menuButton = node.querySelector('.hotkey-list-item-button');
        const input = node.querySelector('.hotkey-list-item-input');
        const action = node.querySelector('.hotkey-list-item-action');
        const scopeCheckboxes = node.querySelectorAll('.hotkey-scope-checkbox');
        const scopeCheckboxContainers = node.querySelectorAll('.hotkey-scope-checkbox-container');
        const enabledToggle = node.querySelector('.hotkey-list-item-enabled');

        this._actionSelect = action;
        this._scopeCheckboxes = scopeCheckboxes;
        this._scopeCheckboxContainers = scopeCheckboxContainers;

        this._inputField = new KeyboardMouseInputField(input, null, this._os);
        this._inputField.prepare(this._data.key, this._data.modifiers, false, true);

        action.value = this._data.action;

        enabledToggle.checked = this._data.enabled;
        enabledToggle.dataset.setting = `${this._basePath}.enabled`;

        this._updateCheckboxVisibility();
        this._updateCheckboxStates();

        for (const scopeCheckbox of scopeCheckboxes) {
            this._eventListeners.addEventListener(scopeCheckbox, 'change', this._onScopeCheckboxChange.bind(this), false);
        }
        this._eventListeners.addEventListener(menuButton, 'menuClose', this._onMenuClose.bind(this), false);
        this._eventListeners.addEventListener(this._actionSelect, 'change', this._onActionSelectChange.bind(this), false);
        this._eventListeners.on(this._inputField, 'change', this._onInputFieldChange.bind(this));
    }

    cleanup() {
        this._eventListeners.removeAllEventListeners();
        this._inputField.cleanup();
        if (this._node.parentNode !== null) {
            this._node.parentNode.removeChild(this._node);
        }
    }

    // Private

    _onMenuClose(e) {
        switch (e.detail.action) {
            case 'delete':
                this._delete();
                break;
            case 'clearInputs':
                this._inputField.clearInputs();
                break;
            case 'resetInput':
                this._resetInput();
                break;
        }
    }

    _onInputFieldChange({key, modifiers}) {
        this._setKeyAndModifiers(key, modifiers);
    }

    _onScopeCheckboxChange(e) {
        const node = e.currentTarget;
        const {scope} = node.dataset;
        if (typeof scope !== 'string') { return; }
        this._setScopeEnabled(scope, node.checked);
    }

    _onActionSelectChange(e) {
        const value = e.currentTarget.value;
        this._setAction(value);
    }

    async _delete() {
        this._parent.deleteEntry(this._index);
    }

    async _setKeyAndModifiers(key, modifiers) {
        this._data.key = key;
        this._data.modifiers = modifiers;
        await this._modifyProfileSettings([
            {
                action: 'set',
                path: `${this._basePath}.key`,
                value: key
            },
            {
                action: 'set',
                path: `${this._basePath}.modifiers`,
                value: modifiers
            }
        ]);
    }

    async _setScopeEnabled(scope, enabled) {
        const scopes = this._data.scopes;
        const index = scopes.indexOf(scope);
        if ((index >= 0) === enabled) { return; }

        if (enabled) {
            scopes.push(scope);
            const stringComparer = this._stringComparer;
            scopes.sort((scope1, scope2) => stringComparer.compare(scope1, scope2));
        } else {
            scopes.splice(index, 1);
        }

        await this._modifyProfileSettings([{
            action: 'set',
            path: `${this._basePath}.scopes`,
            value: scopes
        }]);
    }

    async _modifyProfileSettings(targets) {
        return await this._parent.settingsController.modifyProfileSettings(targets);
    }

    async _resetInput() {
        const defaultHotkeys = await this._parent.getDefaultHotkeys();
        const defaultValue = this._getDefaultKeyAndModifiers(defaultHotkeys, this._data.action);
        if (defaultValue === null) { return; }

        const {key, modifiers} = defaultValue;
        await this._setKeyAndModifiers(key, modifiers);
        this._inputField.setInput(key, modifiers);
    }

    _getDefaultKeyAndModifiers(defaultHotkeys, action) {
        for (const {action: action2, key, modifiers} of defaultHotkeys) {
            if (action2 !== action) { continue; }
            return {modifiers, key};
        }
        return null;
    }

    async _setAction(value) {
        const targets = [{
            action: 'set',
            path: `${this._basePath}.action`,
            value
        }];

        this._data.action = value;

        const scopes = this._data.scopes;
        const validScopes = this._getValidScopesForAction(value);
        if (validScopes !== null) {
            let changed = false;
            for (let i = 0, ii = scopes.length; i < ii; ++i) {
                if (!validScopes.has(scopes[i])) {
                    scopes.splice(i, 1);
                    --i;
                    --ii;
                    changed = true;
                }
            }
            if (changed) {
                if (scopes.length === 0) {
                    scopes.push(...validScopes);
                }
                targets.push({
                    action: 'set',
                    path: `${this._basePath}.scopes`,
                    value: scopes
                });
                this._updateCheckboxStates();
            }
        }

        await this._modifyProfileSettings(targets);

        this._updateCheckboxVisibility();
    }

    _updateCheckboxStates() {
        const scopes = this._data.scopes;
        for (const scopeCheckbox of this._scopeCheckboxes) {
            scopeCheckbox.checked = scopes.includes(scopeCheckbox.dataset.scope);
        }
    }

    _updateCheckboxVisibility() {
        const validScopes = this._getValidScopesForAction(this._data.action);
        for (const node of this._scopeCheckboxContainers) {
            node.hidden = !(validScopes === null || validScopes.has(node.dataset.scope));
        }
    }

    _getValidScopesForAction(action) {
        const optionNode = this._actionSelect.querySelector(`option[value="${action}"]`);
        const scopesString = (optionNode !== null ? optionNode.dataset.scopes : void 0);
        return (typeof scopesString === 'string' ? new Set(scopesString.split(' ')) : null);
    }
}
