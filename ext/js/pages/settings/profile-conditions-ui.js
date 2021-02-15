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

class ProfileConditionsUI extends EventDispatcher {
    constructor(settingsController) {
        super();
        this._settingsController = settingsController;
        this._os = null;
        this._conditionGroupsContainer = null;
        this._addConditionGroupButton = null;
        this._children = [];
        this._eventListeners = new EventListenerCollection();
        this._defaultType = 'popupLevel';
        this._profileIndex = 0;
        this._descriptors = new Map([
            [
                'popupLevel',
                {
                    displayName: 'Popup Level',
                    defaultOperator: 'equal',
                    operators: new Map([
                        ['equal',              {displayName: '=',      type: 'integer', defaultValue: '0', validate: this._validateInteger.bind(this), normalize: this._normalizeInteger.bind(this)}],
                        ['notEqual',           {displayName: '\u2260', type: 'integer', defaultValue: '0', validate: this._validateInteger.bind(this), normalize: this._normalizeInteger.bind(this)}],
                        ['lessThan',           {displayName: '<',      type: 'integer', defaultValue: '0', validate: this._validateInteger.bind(this), normalize: this._normalizeInteger.bind(this)}],
                        ['greaterThan',        {displayName: '>',      type: 'integer', defaultValue: '0', validate: this._validateInteger.bind(this), normalize: this._normalizeInteger.bind(this)}],
                        ['lessThanOrEqual',    {displayName: '\u2264', type: 'integer', defaultValue: '0', validate: this._validateInteger.bind(this), normalize: this._normalizeInteger.bind(this)}],
                        ['greaterThanOrEqual', {displayName: '\u2265', type: 'integer', defaultValue: '0', validate: this._validateInteger.bind(this), normalize: this._normalizeInteger.bind(this)}]
                    ])
                }
            ],
            [
                'url',
                {
                    displayName: 'URL',
                    defaultOperator: 'matchDomain',
                    operators: new Map([
                        ['matchDomain', {displayName: 'Matches Domain', type: 'string', defaultValue: 'example.com',   resetDefaultOnChange: true, validate: this._validateDomains.bind(this), normalize: this._normalizeDomains.bind(this)}],
                        ['matchRegExp', {displayName: 'Matches RegExp', type: 'string', defaultValue: 'example\\.com', resetDefaultOnChange: true, validate: this._validateRegExp.bind(this)}]
                    ])
                }
            ],
            [
                'modifierKeys',
                {
                    displayName: 'Modifier Keys',
                    defaultOperator: 'are',
                    operators: new Map([
                        ['are',        {displayName: 'Are',            type: 'modifierKeys', defaultValue: ''}],
                        ['areNot',     {displayName: 'Are Not',        type: 'modifierKeys', defaultValue: ''}],
                        ['include',    {displayName: 'Include',        type: 'modifierKeys', defaultValue: ''}],
                        ['notInclude', {displayName: 'Don\'t Include', type: 'modifierKeys', defaultValue: ''}]
                    ])
                }
            ]
        ]);
    }

    get settingsController() {
        return this._settingsController;
    }

    get profileIndex() {
        return this._profileIndex;
    }

    get os() {
        return this._os;
    }

    set os(value) {
        this._os = value;
    }

    async prepare(profileIndex) {
        const options = await this._settingsController.getOptionsFull();
        const {profiles} = options;
        if (profileIndex < 0 || profileIndex >= profiles.length) { return; }
        const {conditionGroups} = profiles[profileIndex];

        this._profileIndex = profileIndex;
        this._conditionGroupsContainer = document.querySelector('#profile-condition-groups');
        this._addConditionGroupButton = document.querySelector('#profile-add-condition-group');

        for (let i = 0, ii = conditionGroups.length; i < ii; ++i) {
            this._addConditionGroup(conditionGroups[i], i);
        }

        this._eventListeners.addEventListener(this._addConditionGroupButton, 'click', this._onAddConditionGroupButtonClick.bind(this), false);
    }

    cleanup() {
        this._eventListeners.removeAllEventListeners();

        for (const child of this._children) {
            child.cleanup();
        }
        this._children = [];

        this._conditionGroupsContainer = null;
        this._addConditionGroupButton = null;
    }

    instantiateTemplate(names) {
        return this._settingsController.instantiateTemplate(names);
    }

    getDescriptorTypes() {
        const results = [];
        for (const [name, {displayName}] of this._descriptors.entries()) {
            results.push({name, displayName});
        }
        return results;
    }

    getDescriptorOperators(type) {
        const info = this._descriptors.get(type);
        const results = [];
        if (typeof info !== 'undefined') {
            for (const [name, {displayName}] of info.operators.entries()) {
                results.push({name, displayName});
            }
        }
        return results;
    }

    getDefaultType() {
        return this._defaultType;
    }

    getDefaultOperator(type) {
        const info = this._descriptors.get(type);
        return (typeof info !== 'undefined' ? info.defaultOperator : '');
    }

    getOperatorDetails(type, operator) {
        const info = this._getOperatorDetails(type, operator);

        const {
            displayName=operator,
            type: type2='string',
            defaultValue='',
            resetDefaultOnChange=false,
            validate=null,
            normalize=null
        } = (typeof info === 'undefined' ? {} : info);

        return {
            displayName,
            type: type2,
            defaultValue,
            resetDefaultOnChange,
            validate,
            normalize
        };
    }

    getDefaultCondition() {
        const type = this.getDefaultType();
        const operator = this.getDefaultOperator(type);
        const {defaultValue: value} = this.getOperatorDetails(type, operator);
        return {type, operator, value};
    }

    removeConditionGroup(child) {
        const index = child.index;
        if (index < 0 || index >= this._children.length) { return false; }

        const child2 = this._children[index];
        if (child !== child2) { return false; }

        this._children.splice(index, 1);
        child.cleanup();

        for (let i = index, ii = this._children.length; i < ii; ++i) {
            this._children[i].index = i;
        }

        this.settingsController.modifyGlobalSettings([{
            action: 'splice',
            path: this.getPath('conditionGroups'),
            start: index,
            deleteCount: 1,
            items: []
        }]);

        this._triggerConditionGroupCountChanged(this._children.length);

        return true;
    }

    splitValue(value) {
        return value.split(/[,;\s]+/).map((v) => v.trim().toLowerCase()).filter((v) => v.length > 0);
    }

    getPath(property) {
        property = (typeof property === 'string' ? `.${property}` : '');
        return `profiles[${this.profileIndex}]${property}`;
    }

    createKeyboardMouseInputField(inputNode, mouseButton) {
        return new KeyboardMouseInputField(inputNode, mouseButton, this._os);
    }

    // Private

    _onAddConditionGroupButtonClick() {
        const conditionGroup = {
            conditions: [this.getDefaultCondition()]
        };
        const index = this._children.length;

        this._addConditionGroup(conditionGroup, index);

        this.settingsController.modifyGlobalSettings([{
            action: 'splice',
            path: this.getPath('conditionGroups'),
            start: index,
            deleteCount: 0,
            items: [conditionGroup]
        }]);

        this._triggerConditionGroupCountChanged(this._children.length);
    }

    _addConditionGroup(conditionGroup, index) {
        const child = new ProfileConditionGroupUI(this, index);
        child.prepare(conditionGroup);
        this._children.push(child);
        this._conditionGroupsContainer.appendChild(child.node);
        return child;
    }

    _getOperatorDetails(type, operator) {
        const info = this._descriptors.get(type);
        return (typeof info !== 'undefined' ? info.operators.get(operator) : void 0);
    }

    _validateInteger(value) {
        const number = Number.parseFloat(value);
        return Number.isFinite(number) && Math.floor(number) === number;
    }

    _validateDomains(value) {
        return this.splitValue(value).length > 0;
    }

    _validateRegExp(value) {
        try {
            new RegExp(value, 'i');
            return true;
        } catch (e) {
            return false;
        }
    }

    _normalizeInteger(value) {
        const number = Number.parseFloat(value);
        return `${number}`;
    }

    _normalizeDomains(value) {
        return this.splitValue(value).join(', ');
    }

    _triggerConditionGroupCountChanged(count) {
        this.trigger('conditionGroupCountChanged', {count, profileIndex: this._profileIndex});
    }
}

class ProfileConditionGroupUI {
    constructor(parent, index) {
        this._parent = parent;
        this._index = index;
        this._node = null;
        this._conditionContainer = null;
        this._addConditionButton = null;
        this._children = [];
        this._eventListeners = new EventListenerCollection();
    }

    get settingsController() {
        return this._parent.settingsController;
    }

    get parent() {
        return this._parent;
    }

    get index() {
        return this._index;
    }

    set index(value) {
        this._index = value;
    }

    get node() {
        return this._node;
    }

    get childCount() {
        return this._children.length;
    }

    prepare(conditionGroup) {
        this._node = this._parent.instantiateTemplate('profile-condition-group');
        this._conditionContainer = this._node.querySelector('.profile-condition-list');
        this._addConditionButton = this._node.querySelector('.profile-condition-add-button');

        const conditions = conditionGroup.conditions;
        for (let i = 0, ii = conditions.length; i < ii; ++i) {
            this._addCondition(conditions[i], i);
        }

        this._eventListeners.addEventListener(this._addConditionButton, 'click', this._onAddConditionButtonClick.bind(this), false);
    }

    cleanup() {
        this._eventListeners.removeAllEventListeners();

        for (const child of this._children) {
            child.cleanup();
        }
        this._children = [];

        if (this._node === null) { return; }

        const node = this._node;
        this._node = null;
        this._conditionContainer = null;
        this._addConditionButton = null;

        if (node.parentNode !== null) {
            node.parentNode.removeChild(node);
        }
    }

    removeCondition(child) {
        const index = child.index;
        if (index < 0 || index >= this._children.length) { return false; }

        const child2 = this._children[index];
        if (child !== child2) { return false; }

        this._children.splice(index, 1);
        child.cleanup();

        for (let i = index, ii = this._children.length; i < ii; ++i) {
            this._children[i].index = i;
        }

        this.settingsController.modifyGlobalSettings([{
            action: 'splice',
            path: this.getPath('conditions'),
            start: index,
            deleteCount: 1,
            items: []
        }]);

        if (this._children.length === 0) {
            this.removeSelf();
        }

        return true;
    }

    getPath(property) {
        property = (typeof property === 'string' ? `.${property}` : '');
        return this._parent.getPath(`conditionGroups[${this._index}]${property}`);
    }

    removeSelf() {
        this._parent.removeConditionGroup(this);
    }

    // Private

    _onAddConditionButtonClick() {
        const condition = this._parent.getDefaultCondition();
        const index = this._children.length;

        this._addCondition(condition, index);

        this.settingsController.modifyGlobalSettings([{
            action: 'splice',
            path: this.getPath('conditions'),
            start: index,
            deleteCount: 0,
            items: [condition]
        }]);
    }

    _addCondition(condition, index) {
        const child = new ProfileConditionUI(this, index);
        child.prepare(condition);
        this._children.push(child);
        this._conditionContainer.appendChild(child.node);
        return child;
    }
}

class ProfileConditionUI {
    constructor(parent, index) {
        this._parent = parent;
        this._index = index;
        this._node = null;
        this._typeInput = null;
        this._operatorInput = null;
        this._valueInputContainer = null;
        this._removeButton = null;
        this._mouseButton = null;
        this._mouseButtonContainer = null;
        this._menuButton = null;
        this._value = '';
        this._kbmInputField = null;
        this._eventListeners = new EventListenerCollection();
        this._inputEventListeners = new EventListenerCollection();
    }

    get settingsController() {
        return this._parent.parent.settingsController;
    }

    get parent() {
        return this._parent;
    }

    get index() {
        return this._index;
    }

    set index(value) {
        this._index = value;
    }

    get node() {
        return this._node;
    }

    prepare(condition) {
        const {type, operator, value} = condition;

        this._node = this._parent.parent.instantiateTemplate('profile-condition');
        this._typeInput = this._node.querySelector('.profile-condition-type');
        this._typeOptionContainer = this._typeInput.querySelector('optgroup');
        this._operatorInput = this._node.querySelector('.profile-condition-operator');
        this._operatorOptionContainer = this._operatorInput.querySelector('optgroup');
        this._valueInput = this._node.querySelector('.profile-condition-input');
        this._removeButton = this._node.querySelector('.profile-condition-remove');
        this._mouseButton = this._node.querySelector('.mouse-button');
        this._mouseButtonContainer = this._node.querySelector('.mouse-button-container');
        this._menuButton = this._node.querySelector('.profile-condition-menu-button');

        const operatorDetails = this._getOperatorDetails(type, operator);
        this._updateTypes(type);
        this._updateOperators(type, operator);
        this._updateValueInput(value, operatorDetails);

        this._eventListeners.addEventListener(this._typeInput, 'change', this._onTypeChange.bind(this), false);
        this._eventListeners.addEventListener(this._operatorInput, 'change', this._onOperatorChange.bind(this), false);
        if (this._removeButton !== null) { this._eventListeners.addEventListener(this._removeButton, 'click', this._onRemoveButtonClick.bind(this), false); }
        if (this._menuButton !== null) {
            this._eventListeners.addEventListener(this._menuButton, 'menuOpen', this._onMenuOpen.bind(this), false);
            this._eventListeners.addEventListener(this._menuButton, 'menuClose', this._onMenuClose.bind(this), false);
        }
    }

    cleanup() {
        this._eventListeners.removeAllEventListeners();
        this._value = '';

        if (this._node === null) { return; }

        const node = this._node;
        this._node = null;
        this._typeInput = null;
        this._operatorInput = null;
        this._valueInputContainer = null;
        this._removeButton = null;

        if (node.parentNode !== null) {
            node.parentNode.removeChild(node);
        }
    }

    getPath(property) {
        property = (typeof property === 'string' ? `.${property}` : '');
        return this._parent.getPath(`conditions[${this._index}]${property}`);
    }

    // Private

    _onTypeChange(e) {
        const type = e.currentTarget.value;
        this._setType(type);
    }

    _onOperatorChange(e) {
        const type = this._typeInput.value;
        const operator = e.currentTarget.value;
        this._setOperator(type, operator);
    }

    _onValueInputChange({validate, normalize}, e) {
        const node = e.currentTarget;
        const value = node.value;
        const okay = this._validateValue(value, validate);
        this._value = value;
        if (okay) {
            const normalizedValue = this._normalizeValue(value, normalize);
            node.value = normalizedValue;
            this.settingsController.setGlobalSetting(this.getPath('value'), normalizedValue);
        }
    }

    _onModifierInputChange({validate, normalize}, {modifiers}) {
        modifiers = this._joinModifiers(modifiers);
        const okay = this._validateValue(modifiers, validate);
        this._value = modifiers;
        if (okay) {
            const normalizedValue = this._normalizeValue(modifiers, normalize);
            this.settingsController.setGlobalSetting(this.getPath('value'), normalizedValue);
        }
    }

    _onRemoveButtonClick() {
        this._removeSelf();
    }

    _onMenuOpen(e) {
        const bodyNode = e.detail.menu.bodyNode;
        const deleteGroup = bodyNode.querySelector('.popup-menu-item[data-menu-action="deleteGroup"]');
        if (deleteGroup !== null) {
            deleteGroup.hidden = (this._parent.childCount <= 1);
        }
    }

    _onMenuClose(e) {
        switch (e.detail.action) {
            case 'delete':
                this._removeSelf();
                break;
            case 'deleteGroup':
                this._parent.removeSelf();
                break;
            case 'resetValue':
                this._resetValue();
                break;
        }
    }

    _getDescriptorTypes() {
        return this._parent.parent.getDescriptorTypes();
    }

    _getDescriptorOperators(type) {
        return this._parent.parent.getDescriptorOperators(type);
    }

    _getOperatorDetails(type, operator) {
        return this._parent.parent.getOperatorDetails(type, operator);
    }

    _updateTypes(type) {
        const types = this._getDescriptorTypes();
        this._updateSelect(this._typeInput, this._typeOptionContainer, types, type);
    }

    _updateOperators(type, operator) {
        const operators = this._getDescriptorOperators(type);
        this._updateSelect(this._operatorInput, this._operatorOptionContainer, operators, operator);
    }

    _updateSelect(select, optionContainer, values, value) {
        optionContainer.textContent = '';
        for (const {name, displayName} of values) {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = displayName;
            optionContainer.appendChild(option);
        }
        select.value = value;
    }

    _updateValueInput(value, {type, validate, normalize}) {
        this._inputEventListeners.removeAllEventListeners();
        if (this._kbmInputField !== null) {
            this._kbmInputField.cleanup();
            this._kbmInputField = null;
        }

        let inputType = 'text';
        let inputValue = value;
        let inputStep = null;
        let showMouseButton = false;
        const events = [];
        const inputData = {validate, normalize};
        const node = this._valueInput;

        switch (type) {
            case 'integer':
                inputType = 'number';
                inputStep = '1';
                events.push(['addEventListener', node, 'change', this._onValueInputChange.bind(this, inputData), false]);
                break;
            case 'modifierKeys':
            case 'modifierInputs':
                inputValue = null;
                showMouseButton = (type === 'modifierInputs');
                this._kbmInputField = this._parent.parent.createKeyboardMouseInputField(node, this._mouseButton);
                this._kbmInputField.prepare(null, this._splitModifiers(value), showMouseButton, false);
                events.push(['on', this._kbmInputField, 'change', this._onModifierInputChange.bind(this, inputData), false]);
                break;
            default: // 'string'
                events.push(['addEventListener', node, 'change', this._onValueInputChange.bind(this, inputData), false]);
                break;
        }

        this._value = value;
        delete node.dataset.invalid;
        node.type = inputType;
        if (inputValue !== null) {
            node.value = inputValue;
        }
        if (typeof inputStep === 'string') {
            node.step = inputStep;
        } else {
            node.removeAttribute('step');
        }
        this._mouseButtonContainer.hidden = !showMouseButton;
        for (const args of events) {
            this._inputEventListeners.addGeneric(...args);
        }

        this._validateValue(value, validate);
    }

    _validateValue(value, validate) {
        const okay = (validate === null || validate(value));
        this._valueInput.dataset.invalid = `${!okay}`;
        return okay;
    }

    _normalizeValue(value, normalize) {
        return (normalize !== null ? normalize(value) : value);
    }

    _removeSelf() {
        this._parent.removeCondition(this);
    }

    _splitModifiers(modifiersString) {
        return modifiersString.split(/[,;\s]+/).map((v) => v.trim().toLowerCase()).filter((v) => v.length > 0);
    }

    _joinModifiers(modifiersArray) {
        return modifiersArray.join(', ');
    }

    async _setType(type, operator) {
        const operators = this._getDescriptorOperators(type);
        if (typeof operator === 'undefined') {
            operator = operators.length > 0 ? operators[0].name : '';
        }
        const operatorDetails = this._getOperatorDetails(type, operator);
        const {defaultValue} = operatorDetails;
        this._updateSelect(this._operatorInput, this._operatorOptionContainer, operators, operator);
        this._updateValueInput(defaultValue, operatorDetails);
        await this.settingsController.modifyGlobalSettings([
            {action: 'set', path: this.getPath('type'), value: type},
            {action: 'set', path: this.getPath('operator'), value: operator},
            {action: 'set', path: this.getPath('value'), value: defaultValue}
        ]);
    }

    async _setOperator(type, operator) {
        const operatorDetails = this._getOperatorDetails(type, operator);
        const settingsModifications = [{action: 'set', path: this.getPath('operator'), value: operator}];
        if (operatorDetails.resetDefaultOnChange) {
            const {defaultValue} = operatorDetails;
            const okay = this._updateValueInput(defaultValue, operatorDetails);
            if (okay) {
                settingsModifications.push({action: 'set', path: this.getPath('value'), value: defaultValue});
            }
        }
        await this.settingsController.modifyGlobalSettings(settingsModifications);
    }

    async _resetValue() {
        const type = this._typeInput.value;
        const operator = this._operatorInput.value;
        await this._setType(type, operator);
    }
}
