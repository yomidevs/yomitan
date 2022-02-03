/*
 * Copyright (C) 2019-2022  Yomichan Authors
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
        this._refCache = null;
        this._valueStack = [];
        this._schemaStack = [];
        this._progress = null;
        this._progressCounter = 0;
        this._progressInterval = 1;

        this._schemaPush(null, null);
        this._valuePush(null, null);
    }

    get schema() {
        return this._startSchema;
    }

    get rootSchema() {
        return this._rootSchema;
    }

    get progress() {
        return this._progress;
    }

    set progress(value) {
        this._progress = value;
    }

    get progressInterval() {
        return this._progressInterval;
    }

    set progressInterval(value) {
        this._progressInterval = value;
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
        this._schemaPush(this._startSchema, null);
        this._valuePush(value, null);
        try {
            this._validate(value);
        } finally {
            this._valuePop();
            this._schemaPop();
        }
    }

    getValidValueOrDefault(value) {
        return this._getValidValueOrDefault(null, value, {schema: this._startSchema, path: null});
    }

    getObjectPropertySchema(property) {
        const startSchemaInfo = this._getResolveSchemaInfo({schema: this._startSchema, path: null});
        this._schemaPush(startSchemaInfo.schema, startSchemaInfo.path);
        try {
            const schemaInfo = this._getObjectPropertySchemaInfo(property);
            return schemaInfo !== null ? new JsonSchema(schemaInfo.schema, this._rootSchema) : null;
        } finally {
            this._schemaPop();
        }
    }

    getArrayItemSchema(index) {
        const startSchemaInfo = this._getResolveSchemaInfo({schema: this._startSchema, path: null});
        this._schemaPush(startSchemaInfo.schema, startSchemaInfo.path);
        try {
            const schemaInfo = this._getArrayItemSchemaInfo(index);
            return schemaInfo !== null ? new JsonSchema(schemaInfo.schema, this._rootSchema) : null;
        } finally {
            this._schemaPop();
        }
    }

    isObjectPropertyRequired(property) {
        const {required} = this._startSchema;
        return Array.isArray(required) && required.includes(property);
    }

    // Internal state functions for error construction and progress callback

    getValueStack() {
        const valueStack = [];
        for (let i = 1, ii = this._valueStack.length; i < ii; ++i) {
            const {value, path} = this._valueStack[i];
            valueStack.push({value, path});
        }
        return valueStack;
    }

    getSchemaStack() {
        const schemaStack = [];
        for (let i = 1, ii = this._schemaStack.length; i < ii; ++i) {
            const {schema, path} = this._schemaStack[i];
            schemaStack.push({schema, path});
        }
        return schemaStack;
    }

    getValueStackLength() {
        return this._valueStack.length - 1;
    }

    getValueStackItem(index) {
        const {value, path} = this._valueStack[index + 1];
        return {value, path};
    }

    getSchemaStackLength() {
        return this._schemaStack.length - 1;
    }

    getSchemaStackItem(index) {
        const {schema, path} = this._schemaStack[index + 1];
        return {schema, path};
    }

    // Stack

    _valuePush(value, path) {
        this._valueStack.push({value, path});
    }

    _valuePop() {
        this._valueStack.pop();
    }

    _schemaPush(schema, path) {
        this._schemaStack.push({schema, path});
        this._schema = schema;
    }

    _schemaPop() {
        this._schemaStack.pop();
        this._schema = this._schemaStack[this._schemaStack.length - 1].schema;
    }

    // Private

    _createError(message) {
        const valueStack = this.getValueStack();
        const schemaStack = this.getSchemaStack();
        const error = new Error(message);
        error.value = valueStack[valueStack.length - 1].value;
        error.schema = schemaStack[schemaStack.length - 1].schema;
        error.valueStack = valueStack;
        error.schemaStack = schemaStack;
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

    _getObjectPropertySchemaInfo(property) {
        const {properties} = this._schema;
        if (this._isObject(properties)) {
            const propertySchema = properties[property];
            if (this._isObject(propertySchema)) {
                return {schema: propertySchema, path: ['properties', property]};
            }
        }

        const {additionalProperties} = this._schema;
        if (additionalProperties === false) {
            return null;
        } else if (this._isObject(additionalProperties)) {
            return {schema: additionalProperties, path: 'additionalProperties'};
        } else {
            const result = this._getUnconstrainedSchema();
            return {schema: result, path: null};
        }
    }

    _getArrayItemSchemaInfo(index) {
        const {items} = this._schema;
        if (this._isObject(items)) {
            return {schema: items, path: 'items'};
        }
        if (Array.isArray(items)) {
            if (index >= 0 && index < items.length) {
                const propertySchema = items[index];
                if (this._isObject(propertySchema)) {
                    return {schema: propertySchema, path: ['items', index]};
                }
            }
        }

        const {additionalItems} = this._schema;
        if (additionalItems === false) {
            return null;
        } else if (this._isObject(additionalItems)) {
            return {schema: additionalItems, path: 'additionalItems'};
        } else {
            const result = this._getUnconstrainedSchema();
            return {schema: result, path: null};
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

    _getResolveSchemaInfo(schemaInfo) {
        const ref = schemaInfo.schema.$ref;
        if (typeof ref !== 'string') { return schemaInfo; }

        const {path: basePath} = schemaInfo;
        const {schema, path} = this._getReference(ref);
        if (Array.isArray(basePath)) {
            path.unshift(...basePath);
        } else {
            path.unshift(basePath);
        }
        return {schema, path};
    }

    _getReference(ref) {
        if (!ref.startsWith('#/')) {
            throw this._createError(`Unsupported reference path: ${ref}`);
        }

        let info;
        if (this._refCache !== null) {
            info = this._refCache.get(ref);
        } else {
            this._refCache = new Map();
        }

        if (typeof info === 'undefined') {
            info = this._getReferenceUncached(ref);
            this._refCache.set(ref, info);
        }

        return {schema: info.schema, path: [...info.path]};
    }

    _getReferenceUncached(ref) {
        const visited = new Set();
        const path = [];
        while (true) {
            if (visited.has(ref)) {
                throw this._createError(`Recursive reference: ${ref}`);
            }
            visited.add(ref);

            const pathParts = ref.substring(2).split('/');
            let schema = this._rootSchema;
            try {
                for (const pathPart of pathParts) {
                    schema = schema[pathPart];
                }
            } catch (e) {
                throw this._createError(`Invalid reference: ${ref}`);
            }
            if (!this._isObject(schema)) {
                throw this._createError(`Invalid reference: ${ref}`);
            }

            path.push(null, ...pathParts);

            ref = schema.$ref;
            if (typeof ref !== 'string') {
                return {schema, path};
            }
        }
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
        if (this._progress !== null) {
            const counter = (this._progressCounter + 1) % this._progressInterval;
            this._progressCounter = counter;
            if (counter === 0) { this._progress(this); }
        }

        const ref = this._schema.$ref;
        const schemaInfo = (typeof ref === 'string') ? this._getReference(ref) : null;

        if (schemaInfo === null) {
            this._validateInner(value);
        } else {
            this._schemaPush(schemaInfo.schema, schemaInfo.path);
            try {
                this._validateInner(value);
            } finally {
                this._schemaPop();
            }
        }
    }

    _validateInner(value) {
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
        this._schemaPush(ifSchema, 'if');
        try {
            this._validate(value);
        } catch (e) {
            okay = false;
        } finally {
            this._schemaPop();
        }

        const nextSchema = okay ? this._schema.then : this._schema.else;
        if (this._isObject(nextSchema)) { return; }

        this._schemaPush(nextSchema, okay ? 'then' : 'else');
        try {
            this._validate(value);
        } finally {
            this._schemaPop();
        }
    }

    _validateAllOf(value) {
        const subSchemas = this._schema.allOf;
        if (!Array.isArray(subSchemas)) { return; }

        this._schemaPush(subSchemas, 'allOf');
        try {
            for (let i = 0, ii = subSchemas.length; i < ii; ++i) {
                const subSchema = subSchemas[i];
                if (!this._isObject(subSchema)) { continue; }

                this._schemaPush(subSchema, i);
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

        this._schemaPush(subSchemas, 'anyOf');
        try {
            for (let i = 0, ii = subSchemas.length; i < ii; ++i) {
                const subSchema = subSchemas[i];
                if (!this._isObject(subSchema)) { continue; }

                this._schemaPush(subSchema, i);
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

        this._schemaPush(subSchemas, 'oneOf');
        try {
            let count = 0;
            for (let i = 0, ii = subSchemas.length; i < ii; ++i) {
                const subSchema = subSchemas[i];
                if (!this._isObject(subSchema)) { continue; }

                this._schemaPush(subSchema, i);
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

        this._schemaPush(subSchemas, 'not');
        try {
            for (let i = 0, ii = subSchemas.length; i < ii; ++i) {
                const subSchema = subSchemas[i];
                if (!this._isObject(subSchema)) { continue; }

                this._schemaPush(subSchema, i);
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
        const {type: schemaType, const: schemaConst, enum: schemaEnum} = this._schema;
        const type = this._getValueType(value);
        if (!this._isValueTypeAny(value, type, schemaType)) {
            throw this._createError(`Value type ${type} does not match schema type ${schemaType}`);
        }

        if (typeof schemaConst !== 'undefined' && !this._valuesAreEqual(value, schemaConst)) {
            throw this._createError('Invalid constant value');
        }

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
        const {multipleOf, minimum, exclusiveMinimum, maximum, exclusiveMaximum} = this._schema;
        if (typeof multipleOf === 'number' && Math.floor(value / multipleOf) * multipleOf !== value) {
            throw this._createError(`Number is not a multiple of ${multipleOf}`);
        }

        if (typeof minimum === 'number' && value < minimum) {
            throw this._createError(`Number is less than ${minimum}`);
        }

        if (typeof exclusiveMinimum === 'number' && value <= exclusiveMinimum) {
            throw this._createError(`Number is less than or equal to ${exclusiveMinimum}`);
        }

        if (typeof maximum === 'number' && value > maximum) {
            throw this._createError(`Number is greater than ${maximum}`);
        }

        if (typeof exclusiveMaximum === 'number' && value >= exclusiveMaximum) {
            throw this._createError(`Number is greater than or equal to ${exclusiveMaximum}`);
        }
    }

    _validateString(value) {
        const {minLength, maxLength, pattern} = this._schema;
        if (typeof minLength === 'number' && value.length < minLength) {
            throw this._createError('String length too short');
        }

        if (typeof maxLength === 'number' && value.length > maxLength) {
            throw this._createError('String length too long');
        }

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
        const {minItems, maxItems} = this._schema;
        const {length} = value;

        if (typeof minItems === 'number' && length < minItems) {
            throw this._createError('Array length too short');
        }

        if (typeof maxItems === 'number' && length > maxItems) {
            throw this._createError('Array length too long');
        }

        this._validateArrayContains(value);

        for (let i = 0; i < length; ++i) {
            const schemaInfo = this._getArrayItemSchemaInfo(i);
            if (schemaInfo === null) {
                throw this._createError(`No schema found for array[${i}]`);
            }

            const propertyValue = value[i];

            this._schemaPush(schemaInfo.schema, schemaInfo.path);
            this._valuePush(propertyValue, i);
            try {
                this._validate(propertyValue);
            } finally {
                this._valuePop();
                this._schemaPop();
            }
        }
    }

    _validateArrayContains(value) {
        const containsSchema = this._schema.contains;
        if (!this._isObject(containsSchema)) { return; }

        this._schemaPush(containsSchema, 'contains');
        try {
            for (let i = 0, ii = value.length; i < ii; ++i) {
                const propertyValue = value[i];
                this._valuePush(propertyValue, i);
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
        const {required, minProperties, maxProperties} = this._schema;
        const properties = Object.getOwnPropertyNames(value);
        const {length} = properties;

        if (Array.isArray(required)) {
            for (const property of required) {
                if (!Object.prototype.hasOwnProperty.call(value, property)) {
                    throw this._createError(`Missing property ${property}`);
                }
            }
        }

        if (typeof minProperties === 'number' && length < minProperties) {
            throw this._createError('Not enough object properties');
        }

        if (typeof maxProperties === 'number' && length > maxProperties) {
            throw this._createError('Too many object properties');
        }

        for (let i = 0; i < length; ++i) {
            const property = properties[i];
            const schemaInfo = this._getObjectPropertySchemaInfo(property);
            if (schemaInfo === null) {
                throw this._createError(`No schema found for ${property}`);
            }

            const propertyValue = value[property];

            this._schemaPush(schemaInfo.schema, schemaInfo.path);
            this._valuePush(propertyValue, property);
            try {
                this._validate(propertyValue);
            } finally {
                this._valuePop();
                this._schemaPop();
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

    _getValidValueOrDefault(path, value, schemaInfo) {
        schemaInfo = this._getResolveSchemaInfo(schemaInfo);
        this._schemaPush(schemaInfo.schema, schemaInfo.path);
        this._valuePush(value, path);
        try {
            return this._getValidValueOrDefaultInner(value);
        } finally {
            this._valuePop();
            this._schemaPop();
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
                const schemaInfo = this._getObjectPropertySchemaInfo(property);
                if (schemaInfo === null) { continue; }
                const propertyValue = Object.prototype.hasOwnProperty.call(value, property) ? value[property] : void 0;
                value[property] = this._getValidValueOrDefault(property, propertyValue, schemaInfo);
            }
        }

        for (const property of properties) {
            const schemaInfo = this._getObjectPropertySchemaInfo(property);
            if (schemaInfo === null) {
                Reflect.deleteProperty(value, property);
            } else {
                value[property] = this._getValidValueOrDefault(property, value[property], schemaInfo);
            }
        }

        return value;
    }

    _populateArrayDefaults(value) {
        for (let i = 0, ii = value.length; i < ii; ++i) {
            const schemaInfo = this._getArrayItemSchemaInfo(i);
            if (schemaInfo === null) { continue; }
            const propertyValue = value[i];
            value[i] = this._getValidValueOrDefault(i, propertyValue, schemaInfo);
        }

        const {minItems, maxItems} = this._schema;
        if (typeof minItems === 'number' && value.length < minItems) {
            for (let i = value.length; i < minItems; ++i) {
                const schemaInfo = this._getArrayItemSchemaInfo(i);
                if (schemaInfo === null) { break; }
                const item = this._getValidValueOrDefault(i, void 0, schemaInfo);
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
            const index = this._getArrayIndex(property);
            if (index === null) {
                // Note: this does not currently wrap mutating functions like push, pop, shift, unshift, splice
                return target[property];
            }
            property = index;
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
            const index = this._getArrayIndex(property);
            if (index === null) {
                target[property] = value;
                return true;
            }
            if (index > target.length) { throw new Error('Array index out of range'); }
            property = index;
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
            (!Array.isArray(target) && this._schema.isObjectPropertyRequired(property)) :
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
