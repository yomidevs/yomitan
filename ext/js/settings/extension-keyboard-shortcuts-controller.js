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
 * HotkeyUtil
 * KeyboardMouseInputField
 */

class ExtensionKeyboardShortcutController {
    constructor(settingsController) {
        this._settingsController = settingsController;
        this._resetButton = null;
        this._clearButton = null;
        this._listContainer = null;
        this._hotkeyUtil = new HotkeyUtil();
        this._os = null;
        this._entries = [];
    }

    get hotkeyUtil() {
        return this._hotkeyUtil;
    }

    async prepare() {
        this._resetButton = document.querySelector('#extension-hotkey-list-reset-all');
        this._clearButton = document.querySelector('#extension-hotkey-list-clear-all');
        this._listContainer = document.querySelector('#extension-hotkey-list');

        const canResetCommands = this.canResetCommands();
        const canModifyCommands = this.canModifyCommands();
        this._resetButton.hidden = !canResetCommands;
        this._clearButton.hidden = !canModifyCommands;

        if (canResetCommands) {
            this._resetButton.addEventListener('click', this._onResetClick.bind(this));
        }
        if (canModifyCommands) {
            this._clearButton.addEventListener('click', this._onClearClick.bind(this));
        }

        const {platform: {os}} = await yomichan.api.getEnvironmentInfo();
        this._os = os;
        this._hotkeyUtil.os = os;

        const commands = await this._getCommands();
        this._setupCommands(commands);
    }

    async resetCommand(name) {
        await this._resetCommand(name);

        let key = null;
        let modifiers = [];

        const commands = await this._getCommands();
        for (const {name: name2, shortcut} of commands) {
            if (name === name2) {
                ({key, modifiers} = this._hotkeyUtil.convertCommandToInput(shortcut));
                break;
            }
        }

        return {key, modifiers};
    }

    async updateCommand(name, key, modifiers) {
        // Firefox-only; uses Promise API
        const shortcut = this._hotkeyUtil.convertInputToCommand(key, modifiers);
        return await chrome.commands.update({name, shortcut});
    }

    canResetCommands() {
        return isObject(chrome.commands) && typeof chrome.commands.reset === 'function';
    }

    canModifyCommands() {
        return isObject(chrome.commands) && typeof chrome.commands.update === 'function';
    }

    // Add

    _onResetClick(e) {
        e.preventDefault();
        this._resetAllCommands();
    }

    _onClearClick(e) {
        e.preventDefault();
        this._clearAllCommands();
    }

    _getCommands() {
        return new Promise((resolve, reject) => {
            if (!(isObject(chrome.commands) && typeof chrome.commands.getAll === 'function')) {
                resolve([]);
                return;
            }

            chrome.commands.getAll((result) => {
                const e = chrome.runtime.lastError;
                if (e) {
                    reject(new Error(e.message));
                } else {
                    resolve(result);
                }
            });
        });
    }

    _setupCommands(commands) {
        for (const entry of this._entries) {
            entry.cleanup();
        }
        this._entries = [];

        const fragment = document.createDocumentFragment();

        for (const {name, description, shortcut} of commands) {
            if (name.startsWith('_')) { continue; }

            const {key, modifiers} = this._hotkeyUtil.convertCommandToInput(shortcut);

            const node = this._settingsController.instantiateTemplate('extension-hotkey-list-item');
            fragment.appendChild(node);

            const entry = new ExtensionKeyboardShortcutHotkeyEntry(this, node, name, description, key, modifiers, this._os);
            entry.prepare();
            this._entries.push(entry);
        }

        this._listContainer.textContent = '';
        this._listContainer.appendChild(fragment);
    }

    async _resetAllCommands() {
        if (!this.canModifyCommands()) { return; }

        let commands = await this._getCommands();
        const promises = [];

        for (const {name} of commands) {
            if (name.startsWith('_')) { continue; }
            promises.push(this._resetCommand(name));
        }

        await Promise.all(promises);

        commands = await this._getCommands();
        this._setupCommands(commands);
    }

    async _clearAllCommands() {
        if (!this.canModifyCommands()) { return; }

        let commands = await this._getCommands();
        const promises = [];

        for (const {name} of commands) {
            if (name.startsWith('_')) { continue; }
            promises.push(this.updateCommand(name, null, []));
        }

        await Promise.all(promises);

        commands = await this._getCommands();
        this._setupCommands(commands);
    }

    async _resetCommand(name) {
        // Firefox-only; uses Promise API
        return await chrome.commands.reset(name);
    }
}

class ExtensionKeyboardShortcutHotkeyEntry {
    constructor(parent, node, name, description, key, modifiers, os) {
        this._parent = parent;
        this._node = node;
        this._name = name;
        this._description = description;
        this._key = key;
        this._modifiers = modifiers;
        this._os = os;
        this._input = null;
        this._inputField = null;
        this._eventListeners = new EventListenerCollection();
    }

    prepare() {
        this._node.querySelector('.settings-item-label').textContent = this._description || this._name;

        const button = this._node.querySelector('.extension-hotkey-list-item-button');
        const input = this._node.querySelector('input');

        this._input = input;

        if (this._parent.canModifyCommands()) {
            this._inputField = new KeyboardMouseInputField(input, null, this._os);
            this._inputField.prepare(this._key, this._modifiers, false, true);
            this._eventListeners.on(this._inputField, 'change', this._onInputFieldChange.bind(this));
            this._eventListeners.addEventListener(button, 'menuClose', this._onMenuClose.bind(this));
            this._eventListeners.addEventListener(input, 'blur', this._onInputFieldBlur.bind(this));
        } else {
            input.readOnly = true;
            input.value = this._parent.hotkeyUtil.getInputDisplayValue(this._key, this._modifiers);
            button.hidden = true;
        }
    }

    cleanup() {
        this._eventListeners.removeAllEventListeners();
        if (this._node.parentNode !== null) {
            this._node.parentNode.removeChild(this._node);
        }
        if (this._inputField !== null) {
            this._inputField.cleanup();
            this._inputField = null;
        }
    }

    // Private

    _onInputFieldChange(e) {
        const {key, modifiers} = e;
        this._tryUpdateInput(key, modifiers, false);
    }

    _onInputFieldBlur() {
        this._updateInput();
    }

    _onMenuClose(e) {
        switch (e.detail.action) {
            case 'clearInput':
                this._tryUpdateInput(null, [], true);
                break;
            case 'resetInput':
                this._resetInput();
                break;
        }
    }

    _updateInput() {
        this._inputField.setInput(this._key, this._modifiers);
        delete this._input.dataset.invalid;
    }

    async _tryUpdateInput(key, modifiers, updateInput) {
        let okay = (key === null ? (modifiers.length === 0) : (modifiers.length !== 0));
        if (okay) {
            try {
                await this._parent.updateCommand(this._name, key, modifiers);
            } catch (e) {
                okay = false;
            }
        }

        if (okay) {
            this._key = key;
            this._modifiers = modifiers;
            delete this._input.dataset.invalid;
        } else {
            this._input.dataset.invalid = 'true';
        }

        if (updateInput) {
            this._updateInput();
        }
    }

    async _resetInput() {
        const {key, modifiers} = await this._parent.resetCommand(this._name);
        this._key = key;
        this._modifiers = modifiers;
        this._updateInput();
    }
}
