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

/* globals
 * DOMDataBinder
 */

class GenericSettingController {
    constructor(settingsController) {
        this._settingsController = settingsController;
        this._defaultScope = 'profile';
        this._dataBinder = new DOMDataBinder({
            selector: '[data-setting]',
            createElementMetadata: this._createElementMetadata.bind(this),
            compareElementMetadata: this._compareElementMetadata.bind(this),
            getValues: this._getValues.bind(this),
            setValues: this._setValues.bind(this)
        });
        this._transforms = new Map([
            ['setAttribute', this._setAttribute.bind(this)],
            ['setVisibility', this._setVisibility.bind(this)],
            ['splitTags', this._splitTags.bind(this)],
            ['joinTags', this._joinTags.bind(this)],
            ['toNumber', this._toNumber.bind(this)],
            ['toBoolean', this._toBoolean.bind(this)],
            ['toString', this._toString.bind(this)],
            ['conditionalConvert', this._conditionalConvert.bind(this)]
        ]);
    }

    async prepare() {
        this._dataBinder.observe(document.body);
        this._settingsController.on('optionsChanged', this._onOptionsChanged.bind(this));
    }

    async refresh() {
        await this._dataBinder.refresh();
    }

    // Private

    _onOptionsChanged() {
        this._dataBinder.refresh();
    }

    _createElementMetadata(element) {
        const {dataset: {setting: path, scope, transform: transformRaw}} = element;
        let transforms;
        if (typeof transformRaw === 'string') {
            transforms = JSON.parse(transformRaw);
            if (!Array.isArray(transforms)) { transforms = [transforms]; }
        } else {
            transforms = [];
        }
        return {
            path,
            scope,
            transforms,
            transformRaw
        };
    }

    _compareElementMetadata(metadata1, metadata2) {
        return (
            metadata1.path === metadata2.path &&
            metadata1.scope === metadata2.scope &&
            metadata1.transformRaw === metadata2.transformRaw
        );
    }

    async _getValues(targets) {
        const defaultScope = this._defaultScope;
        const settingsTargets = [];
        for (const {metadata: {path, scope}} of targets) {
            const target = {
                path,
                scope: scope || defaultScope
            };
            settingsTargets.push(target);
        }
        return this._transformResults(await this._settingsController.getSettings(settingsTargets), targets);
    }

    async _setValues(targets) {
        const defaultScope = this._defaultScope;
        const settingsTargets = [];
        for (const {metadata: {path, scope, transforms}, value, element} of targets) {
            const transformedValue = this._applyTransforms(value, transforms, 'pre', element);
            const target = {
                path,
                scope: scope || defaultScope,
                action: 'set',
                value: transformedValue
            };
            settingsTargets.push(target);
        }
        return this._transformResults(await this._settingsController.modifySettings(settingsTargets), targets);
    }

    _transformResults(values, targets) {
        return values.map((value, i) => {
            const error = value.error;
            if (error) { return deserializeError(error); }
            const {metadata: {transforms}, element} = targets[i];
            const result = this._applyTransforms(value.result, transforms, 'post', element);
            return {result};
        });
    }

    _applyTransforms(value, transforms, step, element) {
        for (const transform of transforms) {
            const transformStep = transform.step;
            if (typeof transformStep !== 'undefined' && transformStep !== step) { continue; }

            const transformFunction = this._transforms.get(transform.type);
            if (typeof transformFunction === 'undefined') { continue; }

            value = transformFunction(value, transform, element);
        }
        return value;
    }

    _getAncestor(node, ancestorDistance) {
        if (ancestorDistance < 0) {
            return document.documentElement;
        }
        for (let i = 0; i < ancestorDistance && node !== null; ++i) {
            node = node.parentNode;
        }
        return node;
    }

    _getRelativeElement(node, ancestorDistance, selector) {
        const selectorRoot = (
            typeof ancestorDistance === 'number' ?
            this._getAncestor(node, ancestorDistance) :
            document
        );
        if (selectorRoot === null) { return null; }

        return (
            typeof selector === 'string' ?
            selectorRoot.querySelector(selector) :
            (selectorRoot === document ? document.documentElement : selectorRoot)
        );
    }

    _evaluateSimpleOperation(operation, lhs, rhs) {
        switch (operation) {
            case '!': return !lhs;
            case '!!': return !!lhs;
            case '===': return lhs === rhs;
            case '!==': return lhs !== rhs;
            case '>=': return lhs >= rhs;
            case '<=': return lhs <= rhs;
            case '>': return lhs > rhs;
            case '<': return lhs < rhs;
            default: return false;
        }
    }

    // Transforms

    _setAttribute(value, data, element) {
        const {ancestorDistance, selector, attribute} = data;
        const relativeElement = this._getRelativeElement(element, ancestorDistance, selector);
        if (relativeElement !== null) {
            relativeElement.setAttribute(attribute, `${value}`);
        }
        return value;
    }

    _setVisibility(value, data, element) {
        const {ancestorDistance, selector, condition} = data;
        const relativeElement = this._getRelativeElement(element, ancestorDistance, selector);
        if (relativeElement !== null) {
            relativeElement.hidden = !this._evaluateSimpleOperation(condition.op, value, condition.value);
        }
        return value;
    }

    _splitTags(value) {
        return `${value}`.split(/[,; ]+/).filter((v) => !!v);
    }

    _joinTags(value) {
        return value.join(' ');
    }

    _toNumber(value, data) {
        let {constraints} = data;
        if (!isObject(constraints)) { constraints = {}; }
        return DOMDataBinder.convertToNumber(value, constraints);
    }

    _toBoolean(value) {
        return (value === 'true');
    }

    _toString(value) {
        return `${value}`;
    }

    _conditionalConvert(value, data) {
        const {cases} = data;
        if (Array.isArray(cases)) {
            for (const {op, value: value2, default: isDefault, result} of cases) {
                if (isDefault === true) {
                    value = result;
                } else if (this._evaluateSimpleOperation(op, value, value2)) {
                    value = result;
                    break;
                }
            }
        }
        return value;
    }
}
