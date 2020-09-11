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
 * KeyboardMouseInputField
 * api
 */

class ScanInputsController {
    constructor(settingsController) {
        this._settingsController = settingsController;
        this._os = null;
        this._container = null;
        this._addButton = null;
        this._entries = [];
    }

    async prepare() {
        const {platform: {os}} = await api.getEnvironmentInfo();
        this._os = os;

        this._container = document.querySelector('#scan-input-list');
        this._addButton = document.querySelector('#scan-input-add');

        this._addButton.addEventListener('click', this._onAddButtonClick.bind(this), false);
        this._settingsController.on('optionsChanged', this._onOptionsChanged.bind(this));

        const options = await this._settingsController.getOptions();
        this._onOptionsChanged({options});
    }

    removeInput(index) {
        if (index < 0 || index >= this._entries.length) { return false; }
        const input = this._entries[index];
        input.cleanup();
        this._entries.splice(index, 1);
        for (let i = index, ii = this._entries.length; i < ii; ++i) {
            this._entries[i].index = i;
        }
        this._settingsController.modifyProfileSettings([{
            action: 'splice',
            path: 'scanning.inputs',
            start: index,
            deleteCount: 1,
            items: []
        }]);
    }

    setProperty(index, property, value) {
        const path = `scanning.inputs[${index}].${property}`;
        this._settingsController.setProfileSetting(path, value);
    }

    // Private

    _onOptionsChanged({options}) {
        const {inputs} = options.scanning;

        for (let i = this._entries.length - 1; i >= 0; --i) {
            this._entries[i].cleanup();
        }
        this._entries.length = 0;

        for (let i = 0, ii = inputs.length; i < ii; ++i) {
            const {include, exclude} = inputs[i];
            this._addOption(i, include, exclude);
        }
    }

    _onAddButtonClick(e) {
        e.preventDefault();

        const index = this._entries.length;
        const include = '';
        const exclude = '';
        this._addOption(index, include, exclude);
        this._settingsController.modifyProfileSettings([{
            action: 'splice',
            path: 'scanning.inputs',
            start: index,
            deleteCount: 0,
            items: [{
                include,
                exclude,
                types: {mouse: true, touch: false, pen: false}
            }]
        }]);
    }

    _addOption(index, include, exclude) {
        const field = new ScanInputField(this, index, this._os);
        this._entries.push(field);
        field.prepare(this._container, include, exclude);
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
    }

    prepare(container, include, exclude) {
        const node = this._instantiateTemplate('#scan-input-template');
        const includeInputNode = node.querySelector('.scan-input-include .scan-input-field');
        const includeMouseButton = node.querySelector('.scan-input-include .mouse-button');
        const excludeInputNode = node.querySelector('.scan-input-exclude .scan-input-field');
        const excludeMouseButton = node.querySelector('.scan-input-exclude .mouse-button');
        const removeButton = node.querySelector('.scan-input-remove');

        this._node = node;
        container.appendChild(node);

        this._includeInputField = new KeyboardMouseInputField(includeInputNode, includeMouseButton, this._os);
        this._excludeInputField = new KeyboardMouseInputField(excludeInputNode, excludeMouseButton, this._os);
        this._includeInputField.prepare(include, 'modifierInputs');
        this._excludeInputField.prepare(exclude, 'modifierInputs');

        this._eventListeners.on(this._includeInputField, 'change', this._onIncludeValueChange.bind(this));
        this._eventListeners.on(this._excludeInputField, 'change', this._onExcludeValueChange.bind(this));
        this._eventListeners.addEventListener(removeButton, 'click', this._onRemoveClick.bind(this));

        for (const typeCheckbox of node.querySelectorAll('.scan-input-type-checkbox')) {
            const {type} = typeCheckbox.dataset;
            typeCheckbox.dataset.setting = `scanning.inputs[${this._index}].types.${type}`;
        }
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

    _onIncludeValueChange({value}) {
        this._parent.setProperty(this._index, 'include', value);
    }

    _onExcludeValueChange({value}) {
        this._parent.setProperty(this._index, 'exclude', value);
    }

    _onRemoveClick(e) {
        e.preventDefault();
        this._parent.removeInput(this._index);
    }

    _instantiateTemplate(templateSelector) {
        const template = document.querySelector(templateSelector);
        const content = document.importNode(template.content, true);
        return content.firstChild;
    }
}
