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

/* global
 * KeyboardMouseInputField
 */

class ScanInputsController {
    constructor(settingsController) {
        this._settingsController = settingsController;
        this._os = null;
        this._container = null;
        this._addButton = null;
        this._scanningInputCountNodes = null;
        this._entries = [];
    }

    async prepare() {
        const {platform: {os}} = await yomichan.api.getEnvironmentInfo();
        this._os = os;

        this._container = document.querySelector('#scan-input-list');
        this._addButton = document.querySelector('#scan-input-add');
        this._scanningInputCountNodes = document.querySelectorAll('.scanning-input-count');

        this._addButton.addEventListener('click', this._onAddButtonClick.bind(this), false);
        this._settingsController.on('scanInputsChanged', this._onScanInputsChanged.bind(this));
        this._settingsController.on('optionsChanged', this._onOptionsChanged.bind(this));

        this.refresh();
    }

    removeInput(index) {
        if (index < 0 || index >= this._entries.length) { return false; }
        const input = this._entries[index];
        input.cleanup();
        this._entries.splice(index, 1);
        for (let i = index, ii = this._entries.length; i < ii; ++i) {
            this._entries[i].index = i;
        }
        this._updateCounts();
        this._modifyProfileSettings([{
            action: 'splice',
            path: 'scanning.inputs',
            start: index,
            deleteCount: 1,
            items: []
        }]);
        return true;
    }

    async setProperty(index, property, value, event) {
        const path = `scanning.inputs[${index}].${property}`;
        await this._settingsController.setProfileSetting(path, value);
        if (event) {
            this._triggerScanInputsChanged();
        }
    }

    instantiateTemplate(name) {
        return this._settingsController.instantiateTemplate(name);
    }

    async refresh() {
        const options = await this._settingsController.getOptions();
        this._onOptionsChanged({options});
    }

    // Private

    _onScanInputsChanged({source}) {
        if (source === this) { return; }
        this.refresh();
    }

    _onOptionsChanged({options}) {
        const {inputs} = options.scanning;

        for (let i = this._entries.length - 1; i >= 0; --i) {
            this._entries[i].cleanup();
        }
        this._entries.length = 0;

        for (let i = 0, ii = inputs.length; i < ii; ++i) {
            this._addOption(i, inputs[i]);
        }

        this._updateCounts();
    }

    _onAddButtonClick(e) {
        e.preventDefault();

        const index = this._entries.length;
        const scanningInput = ScanInputsController.createDefaultMouseInput('', '');
        this._addOption(index, scanningInput);
        this._updateCounts();
        this._modifyProfileSettings([{
            action: 'splice',
            path: 'scanning.inputs',
            start: index,
            deleteCount: 0,
            items: [scanningInput]
        }]);
    }

    _addOption(index, scanningInput) {
        const field = new ScanInputField(this, index, this._os);
        this._entries.push(field);
        field.prepare(this._container, scanningInput);
    }

    _updateCounts() {
        const stringValue = `${this._entries.length}`;
        for (const node of this._scanningInputCountNodes) {
            node.textContent = stringValue;
        }
    }

    async _modifyProfileSettings(targets) {
        await this._settingsController.modifyProfileSettings(targets);
        this._triggerScanInputsChanged();
    }

    _triggerScanInputsChanged() {
        this._settingsController.trigger('scanInputsChanged', {source: this});
    }

    static createDefaultMouseInput(include, exclude) {
        return {
            include,
            exclude,
            types: {mouse: true, touch: false, pen: false},
            options: {
                showAdvanced: false,
                searchTerms: true,
                searchKanji: true,
                scanOnTouchMove: true,
                scanOnPenHover: true,
                scanOnPenPress: true,
                scanOnPenRelease: false,
                preventTouchScrolling: true
            }
        };
    }
}

class ScanInputField {
    constructor(parent, index, os) {
        this._parent = parent;
        this._index = index;
        this._os = os;
        this._node = null;
        this._includeInputField = null;
        this._excludeInputField = null;
        this._eventListeners = new EventListenerCollection();
    }

    get index() {
        return this._index;
    }

    set index(value) {
        this._index = value;
        this._updateDataSettingTargets();
    }

    prepare(container, scanningInput) {
        const {include, exclude, options: {showAdvanced}} = scanningInput;

        const node = this._parent.instantiateTemplate('scan-input');
        const includeInputNode = node.querySelector('.scan-input-field[data-property=include]');
        const includeMouseButton = node.querySelector('.mouse-button[data-property=include]');
        const excludeInputNode = node.querySelector('.scan-input-field[data-property=exclude]');
        const excludeMouseButton = node.querySelector('.mouse-button[data-property=exclude]');
        const removeButton = node.querySelector('.scan-input-remove');
        const menuButton = node.querySelector('.scanning-input-menu-button');

        node.dataset.showAdvanced = `${showAdvanced}`;

        this._node = node;
        container.appendChild(node);

        const isPointerTypeSupported = this._isPointerTypeSupported.bind(this);
        this._includeInputField = new KeyboardMouseInputField(includeInputNode, includeMouseButton, this._os, isPointerTypeSupported);
        this._excludeInputField = new KeyboardMouseInputField(excludeInputNode, excludeMouseButton, this._os, isPointerTypeSupported);
        this._includeInputField.prepare(null, this._splitModifiers(include), true, false);
        this._excludeInputField.prepare(null, this._splitModifiers(exclude), true, false);

        this._eventListeners.on(this._includeInputField, 'change', this._onIncludeValueChange.bind(this));
        this._eventListeners.on(this._excludeInputField, 'change', this._onExcludeValueChange.bind(this));
        if (removeButton !== null) {
            this._eventListeners.addEventListener(removeButton, 'click', this._onRemoveClick.bind(this));
        }
        if (menuButton !== null) {
            this._eventListeners.addEventListener(menuButton, 'menuOpen', this._onMenuOpen.bind(this));
            this._eventListeners.addEventListener(menuButton, 'menuClose', this._onMenuClose.bind(this));
        }

        this._updateDataSettingTargets();
    }

    cleanup() {
        this._eventListeners.removeAllEventListeners();
        if (this._includeInputField !== null) {
            this._includeInputField.cleanup();
            this._includeInputField = null;
        }
        if (this._node !== null) {
            const parent = this._node.parentNode;
            if (parent !== null) { parent.removeChild(this._node); }
            this._node = null;
        }
    }

    // Private

    _onIncludeValueChange({modifiers}) {
        modifiers = this._joinModifiers(modifiers);
        this._parent.setProperty(this._index, 'include', modifiers, true);
    }

    _onExcludeValueChange({modifiers}) {
        modifiers = this._joinModifiers(modifiers);
        this._parent.setProperty(this._index, 'exclude', modifiers, true);
    }

    _onRemoveClick(e) {
        e.preventDefault();
        this._removeSelf();
    }

    _onMenuOpen(e) {
        const bodyNode = e.detail.menu.bodyNode;
        const showAdvanced = bodyNode.querySelector('.popup-menu-item[data-menu-action="showAdvanced"]');
        const hideAdvanced = bodyNode.querySelector('.popup-menu-item[data-menu-action="hideAdvanced"]');
        const advancedVisible = (this._node.dataset.showAdvanced === 'true');
        if (showAdvanced !== null) {
            showAdvanced.hidden = advancedVisible;
        }
        if (hideAdvanced !== null) {
            hideAdvanced.hidden = !advancedVisible;
        }
    }

    _onMenuClose(e) {
        switch (e.detail.action) {
            case 'remove':
                this._removeSelf();
                break;
            case 'showAdvanced':
                this._setAdvancedOptionsVisible(true);
                break;
            case 'hideAdvanced':
                this._setAdvancedOptionsVisible(false);
                break;
            case 'clearInputs':
                this._includeInputField.clearInputs();
                this._excludeInputField.clearInputs();
                break;
        }
    }

    _isPointerTypeSupported(pointerType) {
        if (this._node === null) { return false; }
        const node = this._node.querySelector(`input.scan-input-settings-checkbox[data-property="types.${pointerType}"]`);
        return node !== null && node.checked;
    }

    _updateDataSettingTargets() {
        const index = this._index;
        for (const typeCheckbox of this._node.querySelectorAll('.scan-input-settings-checkbox')) {
            const {property} = typeCheckbox.dataset;
            typeCheckbox.dataset.setting = `scanning.inputs[${index}].${property}`;
        }
    }

    _removeSelf() {
        this._parent.removeInput(this._index);
    }

    _setAdvancedOptionsVisible(showAdvanced) {
        showAdvanced = !!showAdvanced;
        this._node.dataset.showAdvanced = `${showAdvanced}`;
        this._parent.setProperty(this._index, 'options.showAdvanced', showAdvanced, false);
    }

    _splitModifiers(modifiersString) {
        return modifiersString.split(/[,;\s]+/).map((v) => v.trim().toLowerCase()).filter((v) => v.length > 0);
    }

    _joinModifiers(modifiersArray) {
        return modifiersArray.join(', ');
    }
}
