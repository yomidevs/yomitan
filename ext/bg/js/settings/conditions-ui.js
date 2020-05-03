/*
 * Copyright (C) 2019-2020  Yomichan Authors
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
 * DOM
 * conditionsNormalizeOptionValue
 */

class ConditionsUI {
    static instantiateTemplate(templateSelector) {
        const template = document.querySelector(templateSelector);
        const content = document.importNode(template.content, true);
        return $(content.firstChild);
    }
}

ConditionsUI.Container = class Container {
    constructor(conditionDescriptors, conditionNameDefault, conditionGroups, container, addButton) {
        this.children = [];
        this.conditionDescriptors = conditionDescriptors;
        this.conditionNameDefault = conditionNameDefault;
        this.conditionGroups = conditionGroups;
        this.container = container;
        this.addButton = addButton;

        this.container.empty();

        for (const conditionGroup of toIterable(conditionGroups)) {
            this.children.push(new ConditionsUI.ConditionGroup(this, conditionGroup));
        }

        this.addButton.on('click', this.onAddConditionGroup.bind(this));
    }

    cleanup() {
        for (const child of this.children) {
            child.cleanup();
        }

        this.addButton.off('click');
        this.container.empty();
    }

    save() {
        // Override
    }

    isolate(object) {
        // Override
        return object;
    }

    remove(child) {
        const index = this.children.indexOf(child);
        if (index < 0) {
            return;
        }

        child.cleanup();
        this.children.splice(index, 1);
        this.conditionGroups.splice(index, 1);
    }

    onAddConditionGroup() {
        const conditionGroup = this.isolate({
            conditions: [this.createDefaultCondition(this.conditionNameDefault)]
        });
        this.conditionGroups.push(conditionGroup);
        this.save();
        this.children.push(new ConditionsUI.ConditionGroup(this, conditionGroup));
    }

    createDefaultCondition(type) {
        let operator = '';
        let value = '';
        if (hasOwn(this.conditionDescriptors, type)) {
            const conditionDescriptor = this.conditionDescriptors[type];
            operator = conditionDescriptor.defaultOperator;
            ({value} = this.getOperatorDefaultValue(type, operator));
            if (typeof value === 'undefined') {
                value = '';
            }
        }
        return {type, operator, value};
    }

    getOperatorDefaultValue(type, operator) {
        if (hasOwn(this.conditionDescriptors, type)) {
            const conditionDescriptor = this.conditionDescriptors[type];
            if (hasOwn(conditionDescriptor.operators, operator)) {
                const operatorDescriptor = conditionDescriptor.operators[operator];
                if (hasOwn(operatorDescriptor, 'defaultValue')) {
                    return {value: operatorDescriptor.defaultValue, fromOperator: true};
                }
            }
            if (hasOwn(conditionDescriptor, 'defaultValue')) {
                return {value: conditionDescriptor.defaultValue, fromOperator: false};
            }
        }
        return {fromOperator: false};
    }
};

ConditionsUI.ConditionGroup = class ConditionGroup {
    constructor(parent, conditionGroup) {
        this.parent = parent;
        this.children = [];
        this.conditionGroup = conditionGroup;
        this.container = $('<div>').addClass('condition-group').appendTo(parent.container);
        this.options = ConditionsUI.instantiateTemplate('#condition-group-options-template').appendTo(parent.container);
        this.separator = ConditionsUI.instantiateTemplate('#condition-group-separator-template').appendTo(parent.container);
        this.addButton = this.options.find('.condition-add');

        for (const condition of toIterable(conditionGroup.conditions)) {
            this.children.push(new ConditionsUI.Condition(this, condition));
        }

        this.addButton.on('click', this.onAddCondition.bind(this));
    }

    cleanup() {
        for (const child of this.children) {
            child.cleanup();
        }

        this.addButton.off('click');
        this.container.remove();
        this.options.remove();
        this.separator.remove();
    }

    save() {
        this.parent.save();
    }

    isolate(object) {
        return this.parent.isolate(object);
    }

    remove(child) {
        const index = this.children.indexOf(child);
        if (index < 0) {
            return;
        }

        child.cleanup();
        this.children.splice(index, 1);
        this.conditionGroup.conditions.splice(index, 1);

        if (this.children.length === 0) {
            this.parent.remove(this, false);
        }
    }

    onAddCondition() {
        const condition = this.isolate(this.parent.createDefaultCondition(this.parent.conditionNameDefault));
        this.conditionGroup.conditions.push(condition);
        this.children.push(new ConditionsUI.Condition(this, condition));
    }
};

ConditionsUI.Condition = class Condition {
    constructor(parent, condition) {
        this.parent = parent;
        this.condition = condition;
        this.container = ConditionsUI.instantiateTemplate('#condition-template').appendTo(parent.container);
        this.input = this.container.find('.condition-input');
        this.inputInner = null;
        this.typeSelect = this.container.find('.condition-type');
        this.operatorSelect = this.container.find('.condition-operator');
        this.removeButton = this.container.find('.condition-remove');

        this.updateTypes();
        this.updateOperators();
        this.updateInput();

        this.typeSelect.on('change', this.onConditionTypeChanged.bind(this));
        this.operatorSelect.on('change', this.onConditionOperatorChanged.bind(this));
        this.removeButton.on('click', this.onRemoveClicked.bind(this));
    }

    cleanup() {
        this.inputInner.off('change');
        this.typeSelect.off('change');
        this.operatorSelect.off('change');
        this.removeButton.off('click');
        this.container.remove();
    }

    save() {
        this.parent.save();
    }

    updateTypes() {
        const conditionDescriptors = this.parent.parent.conditionDescriptors;
        const optionGroup = this.typeSelect.find('optgroup');
        optionGroup.empty();
        for (const type of Object.keys(conditionDescriptors)) {
            const conditionDescriptor = conditionDescriptors[type];
            $('<option>').val(type).text(conditionDescriptor.name).appendTo(optionGroup);
        }
        this.typeSelect.val(this.condition.type);
    }

    updateOperators() {
        const conditionDescriptors = this.parent.parent.conditionDescriptors;
        const optionGroup = this.operatorSelect.find('optgroup');
        optionGroup.empty();

        const type = this.condition.type;
        if (hasOwn(conditionDescriptors, type)) {
            const conditionDescriptor = conditionDescriptors[type];
            const operators = conditionDescriptor.operators;
            for (const operatorName of Object.keys(operators)) {
                const operatorDescriptor = operators[operatorName];
                $('<option>').val(operatorName).text(operatorDescriptor.name).appendTo(optionGroup);
            }
        }

        this.operatorSelect.val(this.condition.operator);
    }

    updateInput() {
        const conditionDescriptors = this.parent.parent.conditionDescriptors;
        const {type, operator} = this.condition;

        const objects = [];
        let inputType = null;
        if (hasOwn(conditionDescriptors, type)) {
            const conditionDescriptor = conditionDescriptors[type];
            objects.push(conditionDescriptor);
            if (hasOwn(conditionDescriptor, 'type')) {
                inputType = conditionDescriptor.type;
            }
            if (hasOwn(conditionDescriptor.operators, operator)) {
                const operatorDescriptor = conditionDescriptor.operators[operator];
                objects.push(operatorDescriptor);
                if (hasOwn(operatorDescriptor, 'type')) {
                    inputType = operatorDescriptor.type;
                }
            }
        }

        this.input.empty();
        if (inputType === 'select') {
            this.inputInner = this.createSelectElement(objects);
        } else if (inputType === 'keyMulti') {
            this.inputInner = this.createInputKeyMultiElement(objects);
        } else {
            this.inputInner = this.createInputElement(objects);
        }
        this.inputInner.appendTo(this.input);
        this.inputInner.on('change', this.onInputChanged.bind(this));

        const {valid} = this.validateValue(this.condition.value);
        this.inputInner.toggleClass('is-invalid', !valid);
        this.inputInner.val(this.condition.value);
    }

    createInputElement(objects) {
        const inputInner = ConditionsUI.instantiateTemplate('#condition-input-text-template');

        const props = new Map([
            ['placeholder', ''],
            ['type', 'text']
        ]);

        for (const object of objects) {
            if (hasOwn(object, 'placeholder')) {
                props.set('placeholder', object.placeholder);
            }
            if (object.type === 'number') {
                props.set('type', 'number');
                for (const prop of ['step', 'min', 'max']) {
                    if (hasOwn(object, prop)) {
                        props.set(prop, object[prop]);
                    }
                }
            }
        }

        for (const [prop, value] of props.entries()) {
            inputInner.prop(prop, value);
        }

        return inputInner;
    }

    createInputKeyMultiElement(objects) {
        const inputInner = this.createInputElement(objects);

        inputInner.prop('readonly', true);

        let values = [];
        for (const object of objects) {
            if (hasOwn(object, 'values')) {
                values = object.values;
            }
        }

        const pressedKeyIndices = new Set();

        const onKeyDown = ({originalEvent}) => {
            const pressedKeyEventName = DOM.getKeyFromEvent(originalEvent);
            if (pressedKeyEventName === 'Escape' || pressedKeyEventName === 'Backspace') {
                pressedKeyIndices.clear();
                inputInner.val('');
                inputInner.change();
                return;
            }

            const pressedModifiers = DOM.getActiveModifiers(originalEvent);
            // https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/metaKey
            // https://askubuntu.com/questions/567731/why-is-shift-alt-being-mapped-to-meta
            // It works with mouse events on some platforms, so try to determine if metaKey is pressed
            // hack; only works when Shift and Alt are not pressed
            const isMetaKeyChrome = (
                pressedKeyEventName === 'Meta' &&
                getSetDifference(new Set(['shift', 'alt']), pressedModifiers).size !== 0
            );
            if (isMetaKeyChrome) {
                pressedModifiers.add('meta');
            }

            for (const modifier of pressedModifiers) {
                const foundIndex = values.findIndex(({optionValue}) => optionValue === modifier);
                if (foundIndex !== -1) {
                    pressedKeyIndices.add(foundIndex);
                }
            }

            const inputValue = [...pressedKeyIndices].map((i) => values[i].name).join(' + ');
            inputInner.val(inputValue);
            inputInner.change();
        };

        inputInner.on('keydown', onKeyDown);

        return inputInner;
    }

    createSelectElement(objects) {
        const inputInner = ConditionsUI.instantiateTemplate('#condition-input-select-template');

        const data = new Map([
            ['values', []],
            ['defaultValue', null]
        ]);

        for (const object of objects) {
            if (hasOwn(object, 'values')) {
                data.set('values', object.values);
            }
            if (hasOwn(object, 'defaultValue')) {
                data.set('defaultValue', object.defaultValue);
            }
        }

        for (const {optionValue, name} of data.get('values')) {
            const option = ConditionsUI.instantiateTemplate('#condition-input-option-template');
            option.attr('value', optionValue);
            option.text(name);
            option.appendTo(inputInner);
        }

        const defaultValue = data.get('defaultValue');
        if (defaultValue !== null) {
            inputInner.val(defaultValue);
        }

        return inputInner;
    }

    validateValue(value) {
        const conditionDescriptors = this.parent.parent.conditionDescriptors;
        let valid = true;
        try {
            value = conditionsNormalizeOptionValue(
                conditionDescriptors,
                this.condition.type,
                this.condition.operator,
                value
            );
        } catch (e) {
            valid = false;
        }
        return {valid, value};
    }

    onInputChanged() {
        const {valid, value} = this.validateValue(this.inputInner.val());
        this.inputInner.toggleClass('is-invalid', !valid);
        this.inputInner.val(value);
        this.condition.value = value;
        this.save();
    }

    onConditionTypeChanged() {
        const type = this.typeSelect.val();
        const {operator, value} = this.parent.parent.createDefaultCondition(type);
        this.condition.type = type;
        this.condition.operator = operator;
        this.condition.value = value;
        this.save();
        this.updateOperators();
        this.updateInput();
    }

    onConditionOperatorChanged() {
        const type = this.condition.type;
        const operator = this.operatorSelect.val();
        const {value, fromOperator} = this.parent.parent.getOperatorDefaultValue(type, operator);
        this.condition.operator = operator;
        if (fromOperator) {
            this.condition.value = value;
        }
        this.save();
        this.updateInput();
    }

    onRemoveClicked() {
        this.parent.remove(this);
        this.save();
    }
};
