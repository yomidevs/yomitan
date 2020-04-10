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
        this.input = this.container.find('input');
        this.typeSelect = this.container.find('.condition-type');
        this.operatorSelect = this.container.find('.condition-operator');
        this.removeButton = this.container.find('.condition-remove');

        this.updateTypes();
        this.updateOperators();
        this.updateInput();

        this.input.on('change', this.onInputChanged.bind(this));
        this.typeSelect.on('change', this.onConditionTypeChanged.bind(this));
        this.operatorSelect.on('change', this.onConditionOperatorChanged.bind(this));
        this.removeButton.on('click', this.onRemoveClicked.bind(this));
    }

    cleanup() {
        this.input.off('change');
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
        const props = new Map([
            ['placeholder', ''],
            ['type', 'text']
        ]);

        const objects = [];
        if (hasOwn(conditionDescriptors, type)) {
            const conditionDescriptor = conditionDescriptors[type];
            objects.push(conditionDescriptor);
            if (hasOwn(conditionDescriptor.operators, operator)) {
                const operatorDescriptor = conditionDescriptor.operators[operator];
                objects.push(operatorDescriptor);
            }
        }

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
            this.input.prop(prop, value);
        }

        const {valid} = this.validateValue(this.condition.value);
        this.input.toggleClass('is-invalid', !valid);
        this.input.val(this.condition.value);
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
        const {valid, value} = this.validateValue(this.input.val());
        this.input.toggleClass('is-invalid', !valid);
        this.input.val(value);
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
