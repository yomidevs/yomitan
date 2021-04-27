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
 * DOMDataBinder
 * KeyboardMouseInputField
 * ObjectPropertyAccessor
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
        this._actionDetails = new Map([
            ['',                                 {scopes: new Set()}],
            ['close',                            {scopes: new Set(['popup', 'search'])}],
            ['focusSearchBox',                   {scopes: new Set(['search'])}],
            ['nextEntry',                        {scopes: new Set(['popup', 'search']), argument: {template: 'hotkey-argument-move-offset', default: '1'}}],
            ['previousEntry',                    {scopes: new Set(['popup', 'search']), argument: {template: 'hotkey-argument-move-offset', default: '1'}}],
            ['lastEntry',                        {scopes: new Set(['popup', 'search'])}],
            ['firstEntry',                       {scopes: new Set(['popup', 'search'])}],
            ['nextEntryDifferentDictionary',     {scopes: new Set(['popup', 'search'])}],
            ['previousEntryDifferentDictionary', {scopes: new Set(['popup', 'search'])}],
            ['historyBackward',                  {scopes: new Set(['popup', 'search'])}],
            ['historyForward',                   {scopes: new Set(['popup', 'search'])}],
            ['addNoteKanji',                     {scopes: new Set(['popup', 'search'])}],
            ['addNoteTermKanji',                 {scopes: new Set(['popup', 'search'])}],
            ['addNoteTermKana',                  {scopes: new Set(['popup', 'search'])}],
            ['viewNote',                         {scopes: new Set(['popup', 'search'])}],
            ['playAudio',                        {scopes: new Set(['popup', 'search'])}],
            ['playAudioFromSource',              {scopes: new Set(['popup', 'search']), argument: {template: 'hotkey-argument-audio-source', default: 'jpod101'}}],
            ['copyHostSelection',                {scopes: new Set(['popup'])}],
            ['scanSelectedText',                 {scopes: new Set(['web'])}],
            ['scanTextAtCaret',                  {scopes: new Set(['web'])}],
            ['toggleOption',                     {scopes: new Set(['popup', 'search']), argument: {template: 'hotkey-argument-setting-path', default: ''}}]
        ]);
    }

    get settingsController() {
        return this._settingsController;
    }

    async prepare() {
        const {platform: {os}} = await yomichan.api.getEnvironmentInfo();
        this._os = os;

        this._addButton = document.querySelector('#hotkey-list-add');
        this._resetButton = document.querySelector('#hotkey-list-reset');
        this._listContainer = document.querySelector('#hotkey-list');
        this._emptyIndicator = document.querySelector('#hotkey-list-empty');
        this._scrollContainer = document.querySelector('#keyboard-shortcuts-modal .modal-body');

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

    getActionDetails(action) {
        return this._actionDetails.get(action);
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
            argument: '',
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
        this._basePath = `inputs.hotkeys[${this._index}]`;
        this._stringComparer = stringComparer;
        this._enabledButton = null;
        this._scopeMenu = null;
        this._scopeMenuEventListeners = new EventListenerCollection();
        this._argumentContainer = null;
        this._argumentInput = null;
        this._argumentEventListeners = new EventListenerCollection();
    }

    prepare() {
        const node = this._node;

        const menuButton = node.querySelector('.hotkey-list-item-button');
        const input = node.querySelector('.hotkey-list-item-input');
        const action = node.querySelector('.hotkey-list-item-action');
        const enabledToggle = node.querySelector('.hotkey-list-item-enabled');
        const scopesButton = node.querySelector('.hotkey-list-item-scopes-button');
        const enabledButton = node.querySelector('.hotkey-list-item-enabled-button');

        this._actionSelect = action;
        this._enabledButton = enabledButton;
        this._argumentContainer = node.querySelector('.hotkey-list-item-action-argument-container');

        this._inputField = new KeyboardMouseInputField(input, null, this._os);
        this._inputField.prepare(this._data.key, this._data.modifiers, false, true);

        action.value = this._data.action;

        enabledToggle.checked = this._data.enabled;
        enabledToggle.dataset.setting = `${this._basePath}.enabled`;

        this._updateScopesButton();
        this._updateActionArgument();

        this._eventListeners.addEventListener(scopesButton, 'menuOpen', this._onScopesMenuOpen.bind(this));
        this._eventListeners.addEventListener(scopesButton, 'menuClose', this._onScopesMenuClose.bind(this));
        this._eventListeners.addEventListener(menuButton, 'menuOpen', this._onMenuOpen.bind(this), false);
        this._eventListeners.addEventListener(menuButton, 'menuClose', this._onMenuClose.bind(this), false);
        this._eventListeners.addEventListener(this._actionSelect, 'change', this._onActionSelectChange.bind(this), false);
        this._eventListeners.on(this._inputField, 'change', this._onInputFieldChange.bind(this));
    }

    cleanup() {
        this._eventListeners.removeAllEventListeners();
        this._inputField.cleanup();
        this._clearScopeMenu();
        this._clearArgumentEventListeners();
        if (this._node.parentNode !== null) {
            this._node.parentNode.removeChild(this._node);
        }
    }

    // Private

    _onMenuOpen(e) {
        const {action} = this._data;

        const {menu} = e.detail;
        const resetArgument = menu.bodyNode.querySelector('.popup-menu-item[data-menu-action="resetArgument"]');

        const details = this._parent.getActionDetails(action);
        const argumentDetails = typeof details !== 'undefined' ? details.argument : void 0;

        resetArgument.hidden = (typeof argumentDetails === 'undefined');
    }

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
            case 'resetArgument':
                this._resetArgument();
                break;
        }
    }

    _onScopesMenuOpen(e) {
        const {menu} = e.detail;
        const validScopes = this._getValidScopesForAction(this._data.action);
        if (validScopes.size === 0) {
            menu.close();
            return;
        }
        this._scopeMenu = menu;
        this._updateScopeMenuItems(menu);
        this._updateDisplay(menu.containerNode); // Fix a animation issue due to changing checkbox values
    }

    _onScopesMenuClose(e) {
        const {menu, action} = e.detail;
        if (action === 'toggleScope') {
            e.preventDefault();
            return;
        }
        if (this._scopeMenu === menu) {
            this._clearScopeMenu();
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

    _onArgumentValueChange(template, e) {
        const node = e.currentTarget;
        let value = this._getArgumentInputValue(node);
        switch (template) {
            case 'hotkey-argument-move-offset':
                value = `${DOMDataBinder.convertToNumber(value, node)}`;
                break;
        }
        this._setArgument(value);
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

        this._updateScopesButton();
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

    async _resetArgument() {
        const {action} = this._data;
        const details = this._parent.getActionDetails(action);
        const argumentDetails = typeof details !== 'undefined' ? details.argument : void 0;
        let argumentDefault = typeof argumentDetails !== 'undefined' ? argumentDetails.default : void 0;
        if (typeof argumentDefault !== 'string') { argumentDefault = ''; }
        await this._setArgument(argumentDefault);
    }

    _getDefaultKeyAndModifiers(defaultHotkeys, action) {
        for (const {action: action2, key, modifiers} of defaultHotkeys) {
            if (action2 !== action) { continue; }
            return {modifiers, key};
        }
        return null;
    }

    async _setAction(value) {
        const validScopesOld = this._getValidScopesForAction(this._data.action);

        const scopes = this._data.scopes;

        let details = this._parent.getActionDetails(value);
        if (typeof details === 'undefined') { details = {}; }

        let validScopes = details.scopes;
        if (typeof validScopes === 'undefined') { validScopes = new Set(); }

        const {argument: argumentDetails} = details;
        let defaultArgument = typeof argumentDetails !== 'undefined' ? argumentDetails.default : '';
        if (typeof defaultArgument !== 'string') { defaultArgument = ''; }

        this._data.action = value;
        this._data.argument = defaultArgument;

        let scopesChanged = false;
        if ((validScopesOld !== null ? validScopesOld.size : 0) === scopes.length) {
            scopes.length = 0;
            scopesChanged = true;
        } else {
            for (let i = 0, ii = scopes.length; i < ii; ++i) {
                if (!validScopes.has(scopes[i])) {
                    scopes.splice(i, 1);
                    --i;
                    --ii;
                    scopesChanged = true;
                }
            }
        }
        if (scopesChanged && scopes.length === 0) {
            scopes.push(...validScopes);
        }

        await this._modifyProfileSettings([
            {
                action: 'set',
                path: `${this._basePath}.action`,
                value: this._data.action
            },
            {
                action: 'set',
                path: `${this._basePath}.argument`,
                value: this._data.argument
            },
            {
                action: 'set',
                path: `${this._basePath}.scopes`,
                value: this._data.scopes
            }
        ]);

        this._updateScopesButton();
        this._updateScopesMenu();
        this._updateActionArgument();
    }

    async _setArgument(value) {
        this._data.argument = value;

        const node = this._argumentInput;
        if (node !== null && this._getArgumentInputValue(node) !== value) {
            this._setArgumentInputValue(node, value);
        }

        this._updateArgumentInputValidity();

        await this._modifyProfileSettings([{
            action: 'set',
            path: `${this._basePath}.argument`,
            value
        }]);
    }

    _updateScopesMenu() {
        if (this._scopeMenu === null) { return; }
        this._updateScopeMenuItems(this._scopeMenu);
    }

    _getValidScopesForAction(action) {
        const details = this._parent.getActionDetails(action);
        return typeof details !== 'undefined' ? details.scopes : null;
    }

    _updateScopeMenuItems(menu) {
        this._scopeMenuEventListeners.removeAllEventListeners();

        const scopes = this._data.scopes;
        const validScopes = this._getValidScopesForAction(this._data.action);

        const bodyNode = menu.bodyNode;
        const menuItems = bodyNode.querySelectorAll('.popup-menu-item');
        for (const menuItem of menuItems) {
            if (menuItem.dataset.menuAction !== 'toggleScope') { continue; }

            const {scope} = menuItem.dataset;
            menuItem.hidden = !(validScopes === null || validScopes.has(scope));

            const checkbox = menuItem.querySelector('.hotkey-scope-checkbox');
            if (checkbox !== null) {
                checkbox.checked = scopes.includes(scope);
                this._scopeMenuEventListeners.addEventListener(checkbox, 'change', this._onScopeCheckboxChange.bind(this), false);
            }
        }
    }

    _clearScopeMenu() {
        this._scopeMenuEventListeners.removeAllEventListeners();
        this._scopeMenu = null;
    }

    _updateScopesButton() {
        const {scopes} = this._data;
        this._enabledButton.dataset.scopeCount = `${scopes.length}`;
    }

    _updateDisplay(node) {
        const {style} = node;
        const {display} = style;
        style.display = 'none';
        getComputedStyle(node).getPropertyValue('display');
        style.display = display;
    }

    _updateActionArgument() {
        this._clearArgumentEventListeners();

        const {action, argument} = this._data;
        const details = this._parent.getActionDetails(action);
        const {argument: argumentDetails} = typeof details !== 'undefined' ? details : {};

        this._argumentContainer.textContent = '';
        if (typeof argumentDetails !== 'undefined') {
            const {template} = argumentDetails;
            const node = this._parent.settingsController.instantiateTemplate(template);
            const inputSelector = '.hotkey-argument-input';
            const inputNode = node.matches(inputSelector) ? node : node.querySelector(inputSelector);
            if (inputNode !== null) {
                this._setArgumentInputValue(inputNode, argument);
                this._argumentInput = inputNode;
                this._updateArgumentInputValidity();
                this._argumentEventListeners.addEventListener(inputNode, 'change', this._onArgumentValueChange.bind(this, template), false);
            }
            this._argumentContainer.appendChild(node);
        }
    }

    _clearArgumentEventListeners() {
        this._argumentEventListeners.removeAllEventListeners();
        this._argumentInput = null;
    }

    _getArgumentInputValue(node) {
        return node.value;
    }

    _setArgumentInputValue(node, value) {
        node.value = value;
    }

    async _updateArgumentInputValidity() {
        if (this._argumentInput === null) { return; }

        let okay = true;
        const {action, argument} = this._data;
        const details = this._parent.getActionDetails(action);
        const {argument: argumentDetails} = typeof details !== 'undefined' ? details : {};

        if (typeof argumentDetails !== 'undefined') {
            const {template} = argumentDetails;
            switch (template) {
                case 'hotkey-argument-setting-path':
                    okay = await this._isHotkeyArgumentSettingPathValid(argument);
                    break;
            }
        }

        this._argumentInput.dataset.invalid = `${!okay}`;
    }

    async _isHotkeyArgumentSettingPathValid(path) {
        if (path.length === 0) { return true; }

        const options = await this._parent.settingsController.getOptions();
        const accessor = new ObjectPropertyAccessor(options);
        const pathArray = ObjectPropertyAccessor.getPathArray(path);
        try {
            const value = accessor.get(pathArray, pathArray.length);
            if (typeof value === 'boolean') {
                return true;
            }
        } catch (e) {
            // NOP
        }
        return false;
    }
}
