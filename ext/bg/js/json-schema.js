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

class JsonSchemaProxyHandler {
    constructor(schema, jsonSchemaValidator) {
        this._schema = schema;
        this._jsonSchemaValidator = jsonSchemaValidator;
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
        if (typeof property === 'symbol') {
            return target[property];
        }

        if (Array.isArray(target)) {
            if (typeof property === 'string' && /^\d+$/.test(property)) {
                property = parseInt(property, 10);
            } else if (typeof property === 'string') {
                return target[property];
            }
        }

        const propertySchema = this._jsonSchemaValidator.getPropertySchema(this._schema, property, target);
        if (propertySchema === null) {
            return;
        }

        const value = target[property];
        return value !== null && typeof value === 'object' ? this._jsonSchemaValidator.createProxy(value, propertySchema) : value;
    }

    set(target, property, value) {
        if (Array.isArray(target)) {
            if (typeof property === 'string' && /^\d+$/.test(property)) {
                property = parseInt(property, 10);
                if (property > target.length) {
                    throw new Error('Array index out of range');
                }
            } else if (typeof property === 'string') {
                target[property] = value;
                return true;
            }
        }

        const propertySchema = this._jsonSchemaValidator.getPropertySchema(this._schema, property, target);
        if (propertySchema === null) {
            throw new Error(`Property ${property} not supported`);
        }

        value = clone(value);

        this._jsonSchemaValidator.validate(value, propertySchema);

        target[property] = value;
        return true;
    }

    deleteProperty(target, property) {
        const required = this._schema.required;
        if (Array.isArray(required) && required.includes(property)) {
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
}

class JsonSchemaValidator {
    constructor() {
        this._regexCache = new CacheMap(100);
    }

    createProxy(target, schema) {
        return new Proxy(target, new JsonSchemaProxyHandler(schema, this));
    }

    isValid(value, schema) {
        try {
            this.validate(value, schema);
            return true;
        } catch (e) {
            return false;
        }
    }

    validate(value, schema) {
        const info = new JsonSchemaTraversalInfo(value, schema);
        this._validate(value, schema, info);
    }

    getValidValueOrDefault(schema, value) {
        const info = new JsonSchemaTraversalInfo(value, schema);
        return this._getValidValueOrDefault(schema, value, info);
    }

    getPropertySchema(schema, property, value) {
        return this._getPropertySchema(schema, property, value, null);
    }

    clearCache() {
        this._regexCache.clear();
    }

    // Private

    _getPropertySchema(schema, property, value, path) {
        const type = this._getSchemaOrValueType(schema, value);
        switch (type) {
            case 'object':
            {
                const properties = schema.properties;
                if (this._isObject(properties)) {
                    const propertySchema = properties[property];
                    if (this._isObject(propertySchema)) {
                        if (path !== null) { path.push(['properties', properties], [property, propertySchema]); }
                        return propertySchema;
                    }
                }

                const additionalProperties = schema.additionalProperties;
                if (additionalProperties === false) {
                    return null;
                } else if (this._isObject(additionalProperties)) {
                    if (path !== null) { path.push(['additionalProperties', additionalProperties]); }
                    return additionalProperties;
                } else {
                    const result = JsonSchemaValidator.unconstrainedSchema;
                    if (path !== null) { path.push([null, result]); }
                    return result;
                }
            }
            case 'array':
            {
                const items = schema.items;
                if (this._isObject(items)) {
                    return items;
                }
                if (Array.isArray(items)) {
                    if (property >= 0 && property < items.length) {
                        const propertySchema = items[property];
                        if (this._isObject(propertySchema)) {
                            if (path !== null) { path.push(['items', items], [property, propertySchema]); }
                            return propertySchema;
                        }
                    }
                }

                const additionalItems = schema.additionalItems;
                if (additionalItems === false) {
                    return null;
                } else if (this._isObject(additionalItems)) {
                    if (path !== null) { path.push(['additionalItems', additionalItems]); }
                    return additionalItems;
                } else {
                    const result = JsonSchemaValidator.unconstrainedSchema;
                    if (path !== null) { path.push([null, result]); }
                    return result;
                }
            }
            default:
                return null;
        }
    }

    _getSchemaOrValueType(schema, value) {
        const type = schema.type;

        if (Array.isArray(type)) {
            if (typeof value !== 'undefined') {
                const valueType = this._getValueType(value);
                if (type.indexOf(valueType) >= 0) {
                    return valueType;
                }
            }
            return null;
        }

        if (typeof type === 'undefined') {
            if (typeof value !== 'undefined') {
                return this._getValueType(value);
            }
            return null;
        }

        return type;
    }

    _validate(value, schema, info) {
        this._validateSingleSchema(value, schema, info);
        this._validateConditional(value, schema, info);
        this._validateAllOf(value, schema, info);
        this._validateAnyOf(value, schema, info);
        this._validateOneOf(value, schema, info);
        this._validateNoneOf(value, schema, info);
    }

    _validateConditional(value, schema, info) {
        const ifSchema = schema.if;
        if (!this._isObject(ifSchema)) { return; }

        let okay = true;
        info.schemaPush('if', ifSchema);
        try {
            this._validate(value, ifSchema, info);
        } catch (e) {
            okay = false;
        }
        info.schemaPop();

        const nextSchema = okay ? schema.then : schema.else;
        if (this._isObject(nextSchema)) {
            info.schemaPush(okay ? 'then' : 'else', nextSchema);
            this._validate(value, nextSchema, info);
            info.schemaPop();
        }
    }

    _validateAllOf(value, schema, info) {
        const subSchemas = schema.allOf;
        if (!Array.isArray(subSchemas)) { return; }

        info.schemaPush('allOf', subSchemas);
        for (let i = 0; i < subSchemas.length; ++i) {
            const subSchema = subSchemas[i];
            info.schemaPush(i, subSchema);
            this._validate(value, subSchema, info);
            info.schemaPop();
        }
        info.schemaPop();
    }

    _validateAnyOf(value, schema, info) {
        const subSchemas = schema.anyOf;
        if (!Array.isArray(subSchemas)) { return; }

        info.schemaPush('anyOf', subSchemas);
        for (let i = 0; i < subSchemas.length; ++i) {
            const subSchema = subSchemas[i];
            info.schemaPush(i, subSchema);
            try {
                this._validate(value, subSchema, info);
                return;
            } catch (e) {
                // NOP
            }
            info.schemaPop();
        }

        throw new JsonSchemaValidationError('0 anyOf schemas matched', value, schema, info);
        // info.schemaPop(); // Unreachable
    }

    _validateOneOf(value, schema, info) {
        const subSchemas = schema.oneOf;
        if (!Array.isArray(subSchemas)) { return; }

        info.schemaPush('oneOf', subSchemas);
        let count = 0;
        for (let i = 0; i < subSchemas.length; ++i) {
            const subSchema = subSchemas[i];
            info.schemaPush(i, subSchema);
            try {
                this._validate(value, subSchema, info);
                ++count;
            } catch (e) {
                // NOP
            }
            info.schemaPop();
        }

        if (count !== 1) {
            throw new JsonSchemaValidationError(`${count} oneOf schemas matched`, value, schema, info);
        }

        info.schemaPop();
    }

    _validateNoneOf(value, schema, info) {
        const subSchemas = schema.not;
        if (!Array.isArray(subSchemas)) { return; }

        info.schemaPush('not', subSchemas);
        for (let i = 0; i < subSchemas.length; ++i) {
            const subSchema = subSchemas[i];
            info.schemaPush(i, subSchema);
            try {
                this._validate(value, subSchema, info);
            } catch (e) {
                info.schemaPop();
                continue;
            }
            throw new JsonSchemaValidationError(`not[${i}] schema matched`, value, schema, info);
        }
        info.schemaPop();
    }

    _validateSingleSchema(value, schema, info) {
        const type = this._getValueType(value);
        const schemaType = schema.type;
        if (!this._isValueTypeAny(value, type, schemaType)) {
            throw new JsonSchemaValidationError(`Value type ${type} does not match schema type ${schemaType}`, value, schema, info);
        }

        const schemaConst = schema.const;
        if (typeof schemaConst !== 'undefined' && !this._valuesAreEqual(value, schemaConst)) {
            throw new JsonSchemaValidationError('Invalid constant value', value, schema, info);
        }

        const schemaEnum = schema.enum;
        if (Array.isArray(schemaEnum) && !this._valuesAreEqualAny(value, schemaEnum)) {
            throw new JsonSchemaValidationError('Invalid enum value', value, schema, info);
        }

        switch (type) {
            case 'number':
                this._validateNumber(value, schema, info);
                break;
            case 'string':
                this._validateString(value, schema, info);
                break;
            case 'array':
                this._validateArray(value, schema, info);
                break;
            case 'object':
                this._validateObject(value, schema, info);
                break;
        }
    }

    _validateNumber(value, schema, info) {
        const multipleOf = schema.multipleOf;
        if (typeof multipleOf === 'number' && Math.floor(value / multipleOf) * multipleOf !== value) {
            throw new JsonSchemaValidationError(`Number is not a multiple of ${multipleOf}`, value, schema, info);
        }

        const minimum = schema.minimum;
        if (typeof minimum === 'number' && value < minimum) {
            throw new JsonSchemaValidationError(`Number is less than ${minimum}`, value, schema, info);
        }

        const exclusiveMinimum = schema.exclusiveMinimum;
        if (typeof exclusiveMinimum === 'number' && value <= exclusiveMinimum) {
            throw new JsonSchemaValidationError(`Number is less than or equal to ${exclusiveMinimum}`, value, schema, info);
        }

        const maximum = schema.maximum;
        if (typeof maximum === 'number' && value > maximum) {
            throw new JsonSchemaValidationError(`Number is greater than ${maximum}`, value, schema, info);
        }

        const exclusiveMaximum = schema.exclusiveMaximum;
        if (typeof exclusiveMaximum === 'number' && value >= exclusiveMaximum) {
            throw new JsonSchemaValidationError(`Number is greater than or equal to ${exclusiveMaximum}`, value, schema, info);
        }
    }

    _validateString(value, schema, info) {
        const minLength = schema.minLength;
        if (typeof minLength === 'number' && value.length < minLength) {
            throw new JsonSchemaValidationError('String length too short', value, schema, info);
        }

        const maxLength = schema.maxLength;
        if (typeof maxLength === 'number' && value.length > maxLength) {
            throw new JsonSchemaValidationError('String length too long', value, schema, info);
        }

        const pattern = schema.pattern;
        if (typeof pattern === 'string') {
            let patternFlags = schema.patternFlags;
            if (typeof patternFlags !== 'string') { patternFlags = ''; }

            let regex;
            try {
                regex = this._getRegex(pattern, patternFlags);
            } catch (e) {
                throw new JsonSchemaValidationError(`Pattern is invalid (${e.message})`, value, schema, info);
            }

            if (!regex.test(value)) {
                throw new JsonSchemaValidationError('Pattern match failed', value, schema, info);
            }
        }
    }

    _validateArray(value, schema, info) {
        const minItems = schema.minItems;
        if (typeof minItems === 'number' && value.length < minItems) {
            throw new JsonSchemaValidationError('Array length too short', value, schema, info);
        }

        const maxItems = schema.maxItems;
        if (typeof maxItems === 'number' && value.length > maxItems) {
            throw new JsonSchemaValidationError('Array length too long', value, schema, info);
        }

        this._validateArrayContains(value, schema, info);

        for (let i = 0, ii = value.length; i < ii; ++i) {
            const schemaPath = [];
            const propertySchema = this._getPropertySchema(schema, i, value, schemaPath);
            if (propertySchema === null) {
                throw new JsonSchemaValidationError(`No schema found for array[${i}]`, value, schema, info);
            }

            const propertyValue = value[i];

            for (const [p, s] of schemaPath) { info.schemaPush(p, s); }
            info.valuePush(i, propertyValue);
            this._validate(propertyValue, propertySchema, info);
            info.valuePop();
            for (let j = 0, jj = schemaPath.length; j < jj; ++j) { info.schemaPop(); }
        }
    }

    _validateArrayContains(value, schema, info) {
        const containsSchema = schema.contains;
        if (!this._isObject(containsSchema)) { return; }

        info.schemaPush('contains', containsSchema);
        for (let i = 0, ii = value.length; i < ii; ++i) {
            const propertyValue = value[i];
            info.valuePush(i, propertyValue);
            try {
                this._validate(propertyValue, containsSchema, info);
                info.schemaPop();
                return;
            } catch (e) {
                // NOP
            }
            info.valuePop();
        }
        throw new JsonSchemaValidationError('contains schema didn\'t match', value, schema, info);
    }

    _validateObject(value, schema, info) {
        const properties = new Set(Object.getOwnPropertyNames(value));

        const required = schema.required;
        if (Array.isArray(required)) {
            for (const property of required) {
                if (!properties.has(property)) {
                    throw new JsonSchemaValidationError(`Missing property ${property}`, value, schema, info);
                }
            }
        }

        const minProperties = schema.minProperties;
        if (typeof minProperties === 'number' && properties.length < minProperties) {
            throw new JsonSchemaValidationError('Not enough object properties', value, schema, info);
        }

        const maxProperties = schema.maxProperties;
        if (typeof maxProperties === 'number' && properties.length > maxProperties) {
            throw new JsonSchemaValidationError('Too many object properties', value, schema, info);
        }

        for (const property of properties) {
            const schemaPath = [];
            const propertySchema = this._getPropertySchema(schema, property, value, schemaPath);
            if (propertySchema === null) {
                throw new JsonSchemaValidationError(`No schema found for ${property}`, value, schema, info);
            }

            const propertyValue = value[property];

            for (const [p, s] of schemaPath) { info.schemaPush(p, s); }
            info.valuePush(property, propertyValue);
            this._validate(propertyValue, propertySchema, info);
            info.valuePop();
            for (let i = 0; i < schemaPath.length; ++i) { info.schemaPop(); }
        }
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

    _getValueType(value) {
        const type = typeof value;
        if (type === 'object') {
            if (value === null) { return 'null'; }
            if (Array.isArray(value)) { return 'array'; }
        }
        return type;
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

    _getDefaultSchemaValue(schema) {
        const schemaType = schema.type;
        const schemaDefault = schema.default;
        return (
            typeof schemaDefault !== 'undefined' &&
            this._isValueTypeAny(schemaDefault, this._getValueType(schemaDefault), schemaType) ?
            clone(schemaDefault) :
            this._getDefaultTypeValue(schemaType)
        );
    }

    _getValidValueOrDefault(schema, value, info) {
        let type = this._getValueType(value);
        if (typeof value === 'undefined' || !this._isValueTypeAny(value, type, schema.type)) {
            value = this._getDefaultSchemaValue(schema);
            type = this._getValueType(value);
        }

        switch (type) {
            case 'object':
                value = this._populateObjectDefaults(value, schema, info);
                break;
            case 'array':
                value = this._populateArrayDefaults(value, schema, info);
                break;
            default:
                if (!this.isValid(value, schema)) {
                    const schemaDefault = this._getDefaultSchemaValue(schema);
                    if (this.isValid(schemaDefault, schema)) {
                        value = schemaDefault;
                    }
                }
                break;
        }

        return value;
    }

    _populateObjectDefaults(value, schema, info) {
        const properties = new Set(Object.getOwnPropertyNames(value));

        const required = schema.required;
        if (Array.isArray(required)) {
            for (const property of required) {
                properties.delete(property);

                const propertySchema = this._getPropertySchema(schema, property, value, null);
                if (propertySchema === null) { continue; }
                info.valuePush(property, value);
                info.schemaPush(property, propertySchema);
                const hasValue = Object.prototype.hasOwnProperty.call(value, property);
                value[property] = this._getValidValueOrDefault(propertySchema, hasValue ? value[property] : void 0, info);
                info.schemaPop();
                info.valuePop();
            }
        }

        for (const property of properties) {
            const propertySchema = this._getPropertySchema(schema, property, value, null);
            if (propertySchema === null) {
                Reflect.deleteProperty(value, property);
            } else {
                info.valuePush(property, value);
                info.schemaPush(property, propertySchema);
                value[property] = this._getValidValueOrDefault(propertySchema, value[property], info);
                info.schemaPop();
                info.valuePop();
            }
        }

        return value;
    }

    _populateArrayDefaults(value, schema, info) {
        for (let i = 0, ii = value.length; i < ii; ++i) {
            const propertySchema = this._getPropertySchema(schema, i, value, null);
            if (propertySchema === null) { continue; }
            info.valuePush(i, value);
            info.schemaPush(i, propertySchema);
            value[i] = this._getValidValueOrDefault(propertySchema, value[i], info);
            info.schemaPop();
            info.valuePop();
        }

        const minItems = schema.minItems;
        if (typeof minItems === 'number' && value.length < minItems) {
            for (let i = value.length; i < minItems; ++i) {
                const propertySchema = this._getPropertySchema(schema, i, value, null);
                if (propertySchema === null) { break; }
                info.valuePush(i, value);
                info.schemaPush(i, propertySchema);
                const item = this._getValidValueOrDefault(propertySchema, void 0, info);
                info.schemaPop();
                info.valuePop();
                value.push(item);
            }
        }

        const maxItems = schema.maxItems;
        if (typeof maxItems === 'number' && value.length > maxItems) {
            value.splice(maxItems, value.length - maxItems);
        }

        return value;
    }

    _isObject(value) {
        return typeof value === 'object' && value !== null && !Array.isArray(value);
    }

    _getRegex(pattern, flags) {
        const key = `${flags}:${pattern}`;
        let regex = this._regexCache.get(key);
        if (typeof regex === 'undefined') {
            regex = new RegExp(pattern, flags);
            this._regexCache.set(key, regex);
        }
        return regex;
    }
}

Object.defineProperty(JsonSchemaValidator, 'unconstrainedSchema', {
    value: Object.freeze({}),
    configurable: false,
    enumerable: true,
    writable: false
});

class JsonSchemaTraversalInfo {
    constructor(value, schema) {
        this.valuePath = [];
        this.schemaPath = [];
        this.valuePush(null, value);
        this.schemaPush(null, schema);
    }

    valuePush(path, value) {
        this.valuePath.push([path, value]);
    }

    valuePop() {
        this.valuePath.pop();
    }

    schemaPush(path, schema) {
        this.schemaPath.push([path, schema]);
    }

    schemaPop() {
        this.schemaPath.pop();
    }
}

class JsonSchemaValidationError extends Error {
    constructor(message, value, schema, info) {
        super(message);
        this.value = value;
        this.schema = schema;
        this.info = info;
    }
}
