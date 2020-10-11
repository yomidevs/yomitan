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
            ['setDocumentAttribute', this._setDocumentAttribute.bind(this)],
            ['setRelativeAttribute', this._setRelativeAttribute.bind(this)],
            ['setVisibility', this._setVisibility.bind(this)],
            ['splitTags', this._splitTags.bind(this)],
            ['joinTags', this._joinTags.bind(this)],
            ['toNumber', this._toNumber.bind(this)],
            ['toString', this._toString.bind(this)]
        ]);
    }

    async prepare() {
        this._dataBinder.observe(document.body);
        this._settingsController.on('optionsChanged', this._onOptionsChanged.bind(this));
    }

    // Private

    _onOptionsChanged() {
        this._dataBinder.refresh();
    }

    _createElementMetadata(element) {
        const {dataset: {setting: path, scope, transform, transformPre, transformPost}} = element;
        return {
            path,
            scope,
            transformPre: typeof transformPre === 'string' ? transformPre : transform,
            transformPost: typeof transformPost === 'string' ? transformPost : transform
        };
    }

    _compareElementMetadata(metadata1, metadata2) {
        return (
            metadata1.path === metadata2.path &&
            metadata1.scope === metadata2.scope &&
            metadata1.transformPre === metadata2.transformPre &&
            metadata1.transformPost === metadata2.transformPost
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
        for (const {metadata, value, element} of targets) {
            const {path, scope, transformPre} = metadata;
            const target = {
                path,
                scope: scope || defaultScope,
                action: 'set',
                value: this._transform(value, transformPre, metadata, element)
            };
            settingsTargets.push(target);
        }
        return this._transformResults(await this._settingsController.modifySettings(settingsTargets), targets);
    }

    _transformResults(values, targets) {
        return values.map((value, i) => {
            const error = value.error;
            if (error) { return jsonToError(error); }
            const {metadata, element} = targets[i];
            const result = this._transform(value.result, metadata.transformPost, metadata, element);
            return {result};
        });
    }

    _transform(value, transform, metadata, element) {
        if (typeof transform === 'string') {
            const transformFunction = this._transforms.get(transform);
            if (typeof transformFunction !== 'undefined') {
                value = transformFunction(value, metadata, element);
            }
        }
        return value;
    }

    _getAncestor(node, ancestorDistance) {
        if (typeof ancestorDistance === 'string') {
            const ii = Number.parseInt(ancestorDistance, 10);
            if (Number.isFinite(ii)) {
                if (ii < 0) {
                    node = document.documentElement;
                } else {
                    for (let i = 0; i < ii && node !== null; ++i) {
                        node = node.parentNode;
                    }
                }
            }
        }
        return node;
    }

    _getElementRelativeToAncestor(node, ancestorDistance, relativeSelector) {
        const relativeElement = this._getAncestor(node, ancestorDistance);
        if (relativeElement === null) { return null; }

        return (
            typeof relativeSelector === 'string' ?
            relativeElement.querySelector(relativeSelector) :
            relativeElement
        );
    }

    _getConditionalResult(value, conditionString) {
        let op = '!!';
        let rhsOperand = null;
        try {
            if (typeof conditionString === 'string') {
                const {op: op2, value: value2} = JSON.parse(conditionString);
                op = (typeof op2 === 'string' ? op2 : '===');
                rhsOperand = value2;
            }
        } catch (e) {
            // NOP
        }
        return this._evaluateSimpleOperation(op, value, rhsOperand);
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

    _setDocumentAttribute(value, metadata, element) {
        document.documentElement.setAttribute(element.dataset.documentAttribute, `${value}`);
        return value;
    }

    _setRelativeAttribute(value, metadata, element) {
        const {ancestorDistance, relativeSelector, relativeAttribute} = element.dataset;
        const relativeElement = this._getElementRelativeToAncestor(element, ancestorDistance, relativeSelector);
        if (relativeElement !== null) {
            relativeElement.setAttribute(relativeAttribute, `${value}`);
        }
        return value;
    }

    _setVisibility(value, metadata, element) {
        const {ancestorDistance, relativeSelector, visbilityCondition} = element.dataset;
        const relativeElement = this._getElementRelativeToAncestor(element, ancestorDistance, relativeSelector);
        if (relativeElement !== null) {
            relativeElement.hidden = !this._getConditionalResult(value, visbilityCondition);
        }
        return value;
    }

    _splitTags(value) {
        return `${value}`.split(/[,; ]+/).filter((v) => !!v);
    }

    _joinTags(value) {
        return value.join(' ');
    }

    _toNumber(value, metadata, element) {
        return DOMDataBinder.convertToNumber(value, element.dataset);
    }

    _toString(value) {
        return `${value}`;
    }
}
