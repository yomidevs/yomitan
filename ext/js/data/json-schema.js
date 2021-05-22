/*
 * Copyright (C) 2019-2021  Yomichan Authors
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
 * CacheMap
 */

class JsonSchema {
    constructor(schema, rootSchema) {
        this._schema = null;
        this._startSchema = schema;
        this._rootSchema = typeof rootSchema !== 'undefined' ? rootSchema : schema;
        this._regexCache = null;
        this._valuePath = [];
        this._schemaPath = [];

        this._schemaPush(null, null);
        this._valuePush(null, null);
    }

    get schema() {
        return this._startSchema;
    }

    get rootSchema() {
        return this._rootSchema;
    }

    createProxy(value) {
        return (
            typeof value === 'object' && value !== null ?
            new Proxy(value, new JsonSchemaProxyHandler(this)) :
            value
        );
    }

    isValid(value) {
        try {
            this.validate(value);
            return true;
        } catch (e) {
            return false;
        }
    }

    validate(value) {
        this._schemaPush(null, this._startSchema);
        this._valuePush(null, value);
        try {
            this._validate(value);
        } finally {
            this._valuePop();
            this._schemaPop();
        }
    }

    getValidValueOrDefault(value) {
        return this._getValidValueOrDefault(null, value, [{path: null, schema: this._startSchema}]);
    }

    getObjectPropertySchema(property) {
        this._schemaPush(null, this._startSchema);
        try {
            const schemaPath = this._getObjectPropertySchemaPath(property);
            return schemaPath !== null ? new JsonSchema(schemaPath[schemaPath.length - 1].schema, this._rootSchema) : null;
        } finally {
            this._schemaPop();
        }
    }

    getArrayItemSchema(index) {
        this._schemaPush(null, this._startSchema);
        try {
            const schemaPath = this._getArrayItemSchemaPath(index);
            return schemaPath !== null ? new JsonSchema(schemaPath[schemaPath.length - 1].schema, this._rootSchema) : null;
        } finally {
            this._schemaPop();
        }
    }

    isObjectPropertyRequired(property) {
        const {required} = this._startSchema;
        return Array.isArray(required) && required.includes(property);
    }

    // Stack

    _valuePush(path, value) {
        this._valuePath.push({path, value});
    }

    _valuePop() {
        this._valuePath.pop();
    }

    _schemaPush(path, schema) {
        this._schemaPath.push({path, schema});
        this._schema = schema;
    }

    _schemaPop() {
        this._schemaPath.pop();
        this._schema = this._schemaPath[this._schemaPath.length - 1].schema;
    }

    // Private

    _createError(message) {
        const valuePath = [];
        for (let i = 1, ii = this._valuePath.length; i < ii; ++i) {
            const {path, value} = this._valuePath[i];
            valuePath.push({path, value});
        }

        const schemaPath = [];
        for (let i = 1, ii = this._schemaPath.length; i < ii; ++i) {
            const {path, schema} = this._schemaPath[i];
            schemaPath.push({path, schema});
        }

        const error = new Error(message);
        error.value = valuePath[valuePath.length - 1].value;
        error.schema = this._schema;
        error.valuePath = valuePath;
        error.schemaPath = schemaPath;
        return error;
    }

    _isObject(value) {
        return typeof value === 'object' && value !== null && !Array.isArray(value);
    }

    _getRegex(pattern, flags) {
        if (this._regexCache === null) {
            this._regexCache = new CacheMap(100);
        }

        const key = `${flags}:${pattern}`;
        let regex = this._regexCache.get(key);
        if (typeof regex === 'undefined') {
            regex = new RegExp(pattern, flags);
            this._regexCache.set(key, regex);
        }
        return regex;
    }

    _getUnconstrainedSchema() {
        return {};
    }

    _getObjectPropertySchemaPath(property) {
        const {properties} = this._schema;
        if (this._isObject(properties)) {
            const propertySchema = properties[property];
            if (this._isObject(propertySchema)) {
                return [
                    {path: 'properties', schema: properties},
                    {path: property, schema: propertySchema}
                ];
            }
        }

        const {additionalProperties} = this._schema;
        if (additionalProperties === false) {
            return null;
        } else if (this._isObject(additionalProperties)) {
            return [{path: 'additionalProperties', schema: additionalProperties}];
        } else {
            const result = this._getUnconstrainedSchema();
            return [{path: null, schema: result}];
        }
    }

    _getArrayItemSchemaPath(index) {
        const {items} = this._schema;
        if (this._isObject(items)) {
            return [{path: 'items', schema: items}];
        }
        if (Array.isArray(items)) {
            if (index >= 0 && index < items.length) {
                const propertySchema = items[index];
                if (this._isObject(propertySchema)) {
                    return [
                        {path: 'items', schema: items},
                        {path: index, schema: propertySchema}
                    ];
                }
            }
        }

        const {additionalItems} = this._schema;
        if (additionalItems === false) {
            return null;
        } else if (this._isObject(additionalItems)) {
            return [{path: 'additionalItems', schema: additionalItems}];
        } else {
            const result = this._getUnconstrainedSchema();
            return [{path: null, schema: result}];
        }
    }

    _getSchemaOrValueType(value) {
        const {type} = this._schema;

        if (Array.isArray(type)) {
            if (typeof value !== 'undefined') {
                const valueType = this._getValueType(value);
                if (type.indexOf(valueType) >= 0) {
                    return valueType;
                }
            }
            return null;
        }

        if (typeof type !== 'undefined') { return type; }
        return (typeof value !== 'undefined') ? this._getValueType(value) : null;
    }

    _getValueType(value) {
        const type = typeof value;
        if (type === 'object') {
            if (value === null) { return 'null'; }
            if (Array.isArray(value)) { return 'array'; }
        }
        return type;
    }

    _isValueTypeAny(value, type, schemaTypes) {
        if (typeof schemaTypes === 'string') {
            return this._isValueType(value, type, schemaTypes);
        } else if (Array.isArray(schemaTypes)) {
            for (const schemaType of schemaTypes) {
                if (this._isValueType(value, type, schemaType)) {
                    return true;
                }
            }
            return false;
        }
        return true;
    }

    _isValueType(value, type, schemaType) {
        return (
            type === schemaType ||
            (schemaType === 'integer' && Math.floor(value) === value)
        );
    }

    _valuesAreEqualAny(value1, valueList) {
        for (const value2 of valueList) {
            if (this._valuesAreEqual(value1, value2)) {
                return true;
            }
        }
        return false;
    }

    _valuesAreEqual(value1, value2) {
        return value1 === value2;
    }

    // Validation

    _isValidCurrent(value) {
        try {
            this._validate(value);
            return true;
        } catch (e) {
            return false;
        }
    }

    _validate(value) {
        this._validateSingleSchema(value);
        this._validateConditional(value);
        this._validateAllOf(value);
        this._validateAnyOf(value);
        this._validateOneOf(value);
        this._validateNoneOf(value);
    }

    _validateConditional(value) {
        const ifSchema = this._schema.if;
        if (!this._isObject(ifSchema)) { return; }

        let okay = true;
        this._schemaPush('if', ifSchema);
        try {
            this._validate(value);
        } catch (e) {
            okay = false;
        } finally {
            this._schemaPop();
        }

        const nextSchema = okay ? this._schema.then : this._schema.else;
        if (this._isObject(nextSchema)) { return; }

        this._schemaPush(okay ? 'then' : 'else', nextSchema);
        try {
            this._validate(value);
        } finally {
            this._schemaPop();
        }
    }

    _validateAllOf(value) {
        const subSchemas = this._schema.allOf;
        if (!Array.isArray(subSchemas)) { return; }

        this._schemaPush('allOf', subSchemas);
        try {
            for (let i = 0, ii = subSchemas.length; i < ii; ++i) {
                const subSchema = subSchemas[i];
                if (!this._isObject(subSchema)) { continue; }

                this._schemaPush(i, subSchema);
                try {
                    this._validate(value);
                } finally {
                    this._schemaPop();
                }
            }
        } finally {
            this._schemaPop();
        }
    }

    _validateAnyOf(value) {
        const subSchemas = this._schema.anyOf;
        if (!Array.isArray(subSchemas)) { return; }

        this._schemaPush('anyOf', subSchemas);
        try {
            for (let i = 0, ii = subSchemas.length; i < ii; ++i) {
                const subSchema = subSchemas[i];
                if (!this._isObject(subSchema)) { continue; }

                this._schemaPush(i, subSchema);
                try {
                    this._validate(value);
                    return;
                } catch (e) {
                    // NOP
                } finally {
                    this._schemaPop();
                }
            }

            throw this._createError('0 anyOf schemas matched');
        } finally {
            this._schemaPop();
        }
    }

    _validateOneOf(value) {
        const subSchemas = this._schema.oneOf;
        if (!Array.isArray(subSchemas)) { return; }

        this._schemaPush('oneOf', subSchemas);
        try {
            let count = 0;
            for (let i = 0, ii = subSchemas.length; i < ii; ++i) {
                const subSchema = subSchemas[i];
                if (!this._isObject(subSchema)) { continue; }

                this._schemaPush(i, subSchema);
                try {
                    this._validate(value);
                    ++count;
                } catch (e) {
                    // NOP
                } finally {
                    this._schemaPop();
                }
            }

            if (count !== 1) {
                throw this._createError(`${count} oneOf schemas matched`);
            }
        } finally {
            this._schemaPop();
        }
    }

    _validateNoneOf(value) {
        const subSchemas = this._schema.not;
        if (!Array.isArray(subSchemas)) { return; }

        this._schemaPush('not', subSchemas);
        try {
            for (let i = 0, ii = subSchemas.length; i < ii; ++i) {
                const subSchema = subSchemas[i];
                if (!this._isObject(subSchema)) { continue; }

                this._schemaPush(i, subSchema);
                try {
                    this._validate(value);
                } catch (e) {
                    continue;
                } finally {
                    this._schemaPop();
                }
                throw this._createError(`not[${i}] schema matched`);
            }
        } finally {
            this._schemaPop();
        }
    }

    _validateSingleSchema(value) {
        const type = this._getValueType(value);
        const schemaType = this._schema.type;
        if (!this._isValueTypeAny(value, type, schemaType)) {
            throw this._createError(`Value type ${type} does not match schema type ${schemaType}`);
        }

        const schemaConst = this._schema.const;
        if (typeof schemaConst !== 'undefined' && !this._valuesAreEqual(value, schemaConst)) {
            throw this._createError('Invalid constant value');
        }

        const schemaEnum = this._schema.enum;
        if (Array.isArray(schemaEnum) && !this._valuesAreEqualAny(value, schemaEnum)) {
            throw this._createError('Invalid enum value');
        }

        switch (type) {
            case 'number':
                this._validateNumber(value);
                break;
            case 'string':
                this._validateString(value);
                break;
            case 'array':
                this._validateArray(value);
                break;
            case 'object':
                this._validateObject(value);
                break;
        }
    }

    _validateNumber(value) {
        const {multipleOf} = this._schema;
        if (typeof multipleOf === 'number' && Math.floor(value / multipleOf) * multipleOf !== value) {
            throw this._createError(`Number is not a multiple of ${multipleOf}`);
        }

        const {minimum} = this._schema;
        if (typeof minimum === 'number' && value < minimum) {
            throw this._createError(`Number is less than ${minimum}`);
        }

        const {exclusiveMinimum} = this._schema;
        if (typeof exclusiveMinimum === 'number' && value <= exclusiveMinimum) {
            throw this._createError(`Number is less than or equal to ${exclusiveMinimum}`);
        }

        const {maximum} = this._schema;
        if (typeof maximum === 'number' && value > maximum) {
            throw this._createError(`Number is greater than ${maximum}`);
        }

        const {exclusiveMaximum} = this._schema;
        if (typeof exclusiveMaximum === 'number' && value >= exclusiveMaximum) {
            throw this._createError(`Number is greater than or equal to ${exclusiveMaximum}`);
        }
    }

    _validateString(value) {
        const {minLength} = this._schema;
        if (typeof minLength === 'number' && value.length < minLength) {
            throw this._createError('String length too short');
        }

        const {maxLength} = this._schema;
        if (typeof maxLength === 'number' && value.length > maxLength) {
            throw this._createError('String length too long');
        }

        const {pattern} = this._schema;
        if (typeof pattern === 'string') {
            let {patternFlags} = this._schema;
            if (typeof patternFlags !== 'string') { patternFlags = ''; }

            let regex;
            try {
                regex = this._getRegex(pattern, patternFlags);
            } catch (e) {
                throw this._createError(`Pattern is invalid (${e.message})`);
            }

            if (!regex.test(value)) {
                throw this._createError('Pattern match failed');
            }
        }
    }

    _validateArray(value) {
        const {length} = value;

        const {minItems} = this._schema;
        if (typeof minItems === 'number' && length < minItems) {
            throw this._createError('Array length too short');
        }

        const {maxItems} = this._schema;
        if (typeof maxItems === 'number' && length > maxItems) {
            throw this._createError('Array length too long');
        }

        this._validateArrayContains(value);

        for (let i = 0; i < length; ++i) {
            const schemaPath = this._getArrayItemSchemaPath(i);
            if (schemaPath === null) {
                throw this._createError(`No schema found for array[${i}]`);
            }

            const propertyValue = value[i];

            for (const {path, schema} of schemaPath) { this._schemaPush(path, schema); }
            this._valuePush(i, propertyValue);
            try {
                this._validate(propertyValue);
            } finally {
                this._valuePop();
                for (let j = 0, jj = schemaPath.length; j < jj; ++j) { this._schemaPop(); }
            }
        }
    }

    _validateArrayContains(value) {
        const containsSchema = this._schema.contains;
        if (!this._isObject(containsSchema)) { return; }

        this._schemaPush('contains', containsSchema);
        try {
            for (let i = 0, ii = value.length; i < ii; ++i) {
                const propertyValue = value[i];
                this._valuePush(i, propertyValue);
                try {
                    this._validate(propertyValue);
                    return;
                } catch (e) {
                    // NOP
                } finally {
                    this._valuePop();
                }
            }
            throw this._createError('contains schema didn\'t match');
        } finally {
            this._schemaPop();
        }
    }

    _validateObject(value) {
        const properties = new Set(Object.getOwnPropertyNames(value));

        const {required} = this._schema;
        if (Array.isArray(required)) {
            for (const property of required) {
                if (!properties.has(property)) {
                    throw this._createError(`Missing property ${property}`);
                }
            }
        }

        const {minProperties} = this._schema;
        if (typeof minProperties === 'number' && properties.length < minProperties) {
            throw this._createError('Not enough object properties');
        }

        const {maxProperties} = this._schema;
        if (typeof maxProperties === 'number' && properties.length > maxProperties) {
            throw this._createError('Too many object properties');
        }

        for (const property of properties) {
            const schemaPath = this._getObjectPropertySchemaPath(property);
            if (schemaPath === null) {
                throw this._createError(`No schema found for ${property}`);
            }

            const propertyValue = value[property];

            for (const {path, schema} of schemaPath) { this._schemaPush(path, schema); }
            this._valuePush(property, propertyValue);
            try {
                this._validate(propertyValue);
            } finally {
                this._valuePop();
                for (let j = 0, jj = schemaPath.length; j < jj; ++j) { this._schemaPop(); }
            }
        }
    }

    // Creation

    _getDefaultTypeValue(type) {
        if (typeof type === 'string') {
            switch (type) {
                case 'null':
                    return null;
                case 'boolean':
                    return false;
                case 'number':
                case 'integer':
                    return 0;
                case 'string':
                    return '';
                case 'array':
                    return [];
                case 'object':
                    return {};
            }
        }
        return null;
    }

    _getDefaultSchemaValue() {
        const {type: schemaType, default: schemaDefault} = this._schema;
        return (
            typeof schemaDefault !== 'undefined' &&
            this._isValueTypeAny(schemaDefault, this._getValueType(schemaDefault), schemaType) ?
            clone(schemaDefault) :
            this._getDefaultTypeValue(schemaType)
        );
    }

    _getValidValueOrDefault(path, value, schemaPath) {
        this._valuePush(path, value);
        for (const {path: path2, schema} of schemaPath) { this._schemaPush(path2, schema); }
        try {
            return this._getValidValueOrDefaultInner(value);
        } finally {
            for (let i = 0, ii = schemaPath.length; i < ii; ++i) { this._schemaPop(); }
            this._valuePop();
        }
    }

    _getValidValueOrDefaultInner(value) {
        let type = this._getValueType(value);
        if (typeof value === 'undefined' || !this._isValueTypeAny(value, type, this._schema.type)) {
            value = this._getDefaultSchemaValue();
            type = this._getValueType(value);
        }

        switch (type) {
            case 'object':
                value = this._populateObjectDefaults(value);
                break;
            case 'array':
                value = this._populateArrayDefaults(value);
                break;
            default:
                if (!this._isValidCurrent(value)) {
                    const schemaDefault = this._getDefaultSchemaValue();
                    if (this._isValidCurrent(schemaDefault)) {
                        value = schemaDefault;
                    }
                }
                break;
        }

        return value;
    }

    _populateObjectDefaults(value) {
        const properties = new Set(Object.getOwnPropertyNames(value));

        const {required} = this._schema;
        if (Array.isArray(required)) {
            for (const property of required) {
                properties.delete(property);
                const schemaPath = this._getObjectPropertySchemaPath(property);
                if (schemaPath === null) { continue; }
                const propertyValue = Object.prototype.hasOwnProperty.call(value, property) ? value[property] : void 0;
                value[property] = this._getValidValueOrDefault(property, propertyValue, schemaPath);
            }
        }

        for (const property of properties) {
            const schemaPath = this._getObjectPropertySchemaPath(property);
            if (schemaPath === null) {
                Reflect.deleteProperty(value, property);
            } else {
                value[property] = this._getValidValueOrDefault(property, value[property], schemaPath);
            }
        }

        return value;
    }

    _populateArrayDefaults(value) {
        for (let i = 0, ii = value.length; i < ii; ++i) {
            const schemaPath = this._getArrayItemSchemaPath(i);
            if (schemaPath === null) { continue; }
            const propertyValue = value[i];
            value[i] = this._getValidValueOrDefault(i, propertyValue, schemaPath);
        }

        const {minItems, maxItems} = this._schema;
        if (typeof minItems === 'number' && value.length < minItems) {
            for (let i = value.length; i < minItems; ++i) {
                const schemaPath = this._getArrayItemSchemaPath(i);
                if (schemaPath === null) { break; }
                const item = this._getValidValueOrDefault(i, void 0, schemaPath);
                value.push(item);
            }
        }

        if (typeof maxItems === 'number' && value.length > maxItems) {
            value.splice(maxItems, value.length - maxItems);
        }

        return value;
    }
}

class JsonSchemaProxyHandler {
    constructor(schema) {
        this._schema = schema;
        this._numberPattern = /^(?:0|[1-9]\d*)$/;
    }

    getPrototypeOf(target) {
        return Object.getPrototypeOf(target);
    }

    setPrototypeOf() {
        throw new Error('setPrototypeOf not supported');
    }

    isExtensible(target) {
        return Object.isExtensible(target);
    }

    preventExtensions(target) {
        Object.preventExtensions(target);
        return true;
    }

    getOwnPropertyDescriptor(target, property) {
        return Object.getOwnPropertyDescriptor(target, property);
    }

    defineProperty() {
        throw new Error('defineProperty not supported');
    }

    has(target, property) {
        return property in target;
    }

    get(target, property) {
        if (typeof property === 'symbol') { return target[property]; }

        let propertySchema;
        if (Array.isArray(target)) {
            property = this._getArrayIndex(property);
            if (property === null) {
                // Note: this does not currently wrap mutating functions like push, pop, shift, unshift, splice
                return target[property];
            }
            propertySchema = this._schema.getArrayItemSchema(property);
        } else {
            propertySchema = this._schema.getObjectPropertySchema(property);
        }

        if (propertySchema === null) { return void 0; }

        const value = target[property];
        return value !== null && typeof value === 'object' ? propertySchema.createProxy(value) : value;
    }

    set(target, property, value) {
        if (typeof property === 'symbol') { throw new Error(`Cannot assign symbol property ${property}`); }

        let propertySchema;
        if (Array.isArray(target)) {
            property = this._getArrayIndex(property);
            if (property === null) { throw new Error(`Property ${property} cannot be assigned to array`); }
            if (property > target.length) { throw new Error('Array index out of range'); }
            propertySchema = this._schema.getArrayItemSchema(property);
        } else {
            propertySchema = this._schema.getObjectPropertySchema(property);
        }

        if (propertySchema === null) { throw new Error(`Property ${property} not supported`); }

        value = clone(value);
        propertySchema.validate(value);

        target[property] = value;
        return true;
    }

    deleteProperty(target, property) {
        const required = (
            (typeof target === 'object' && target !== null) ?
            (Array.isArray(target) || this._schema.isObjectPropertyRequired(property)) :
            true
        );
        if (required) {
            throw new Error(`${property} cannot be deleted`);
        }
        return Reflect.deleteProperty(target, property);
    }

    ownKeys(target) {
        return Reflect.ownKeys(target);
    }

    apply() {
        throw new Error('apply not supported');
    }

    construct() {
        throw new Error('construct not supported');
    }

    // Private

    _getArrayIndex(property) {
        if (typeof property === 'string' && this._numberPattern.test(property)) {
            return Number.parseInt(property, 10);
        } else if (typeof property === 'number' && Math.floor(property) === property && property >= 0) {
            return property;
        } else {
            return null;
        }
    }
}
