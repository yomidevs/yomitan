/*
 * Copyright (C) 2019-2020  Alex Yatskov <alex@foosoft.net>
 * Author: Alex Yatskov <alex@foosoft.net>
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


class JsonSchemaProxyHandler {
    constructor(schema) {
        this._schema = schema;
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

        const propertySchema = JsonSchemaProxyHandler.getPropertySchema(this._schema, property, target);
        if (propertySchema === null) {
            return;
        }

        const value = target[property];
        return value !== null && typeof value === 'object' ? JsonSchema.createProxy(value, propertySchema) : value;
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

        const propertySchema = JsonSchemaProxyHandler.getPropertySchema(this._schema, property, target);
        if (propertySchema === null) {
            throw new Error(`Property ${property} not supported`);
        }

        value = JsonSchema.isolate(value);

        JsonSchemaProxyHandler.validate(value, propertySchema, new JsonSchemaTraversalInfo(value, propertySchema));

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

    static getPropertySchema(schema, property, value, path=null) {
        const type = JsonSchemaProxyHandler.getSchemaOrValueType(schema, value);
        switch (type) {
            case 'object':
            {
                const properties = schema.properties;
                if (JsonSchemaProxyHandler.isObject(properties)) {
                    const propertySchema = properties[property];
                    if (JsonSchemaProxyHandler.isObject(propertySchema)) {
                        if (path !== null) { path.push(['properties', properties], [property, propertySchema]); }
                        return propertySchema;
                    }
                }

                const additionalProperties = schema.additionalProperties;
                if (additionalProperties === false) {
                    return null;
                } else if (JsonSchemaProxyHandler.isObject(additionalProperties)) {
                    if (path !== null) { path.push(['additionalProperties', additionalProperties]); }
                    return additionalProperties;
                } else {
                    const result = JsonSchemaProxyHandler._unconstrainedSchema;
                    if (path !== null) { path.push([null, result]); }
                    return result;
                }
            }
            case 'array':
            {
                const items = schema.items;
                if (JsonSchemaProxyHandler.isObject(items)) {
                    return items;
                }
                if (Array.isArray(items)) {
                    if (property >= 0 && property < items.length) {
                        const propertySchema = items[property];
                        if (JsonSchemaProxyHandler.isObject(propertySchema)) {
                            if (path !== null) { path.push(['items', items], [property, propertySchema]); }
                            return propertySchema;
                        }
                    }
                }

                const additionalItems = schema.additionalItems;
                if (additionalItems === false) {
                    return null;
                } else if (JsonSchemaProxyHandler.isObject(additionalItems)) {
                    if (path !== null) { path.push(['additionalItems', additionalItems]); }
                    return additionalItems;
                } else {
                    const result = JsonSchemaProxyHandler._unconstrainedSchema;
                    if (path !== null) { path.push([null, result]); }
                    return result;
                }
            }
            default:
                return null;
        }
    }

    static getSchemaOrValueType(schema, value) {
        const type = schema.type;

        if (Array.isArray(type)) {
            if (typeof value !== 'undefined') {
                const valueType = JsonSchemaProxyHandler.getValueType(value);
                if (type.indexOf(valueType) >= 0) {
                    return valueType;
                }
            }
            return null;
        }

        if (typeof type === 'undefined') {
            if (typeof value !== 'undefined') {
                return JsonSchemaProxyHandler.getValueType(value);
            }
            return null;
        }

        return type;
    }

    static validate(value, schema, info) {
        JsonSchemaProxyHandler.validateSingleSchema(value, schema, info);
        JsonSchemaProxyHandler.validateConditional(value, schema, info);
        JsonSchemaProxyHandler.validateAllOf(value, schema, info);
        JsonSchemaProxyHandler.validateAnyOf(value, schema, info);
        JsonSchemaProxyHandler.validateOneOf(value, schema, info);
        JsonSchemaProxyHandler.validateNoneOf(value, schema, info);
    }

    static validateConditional(value, schema, info) {
        const ifSchema = schema.if;
        if (!JsonSchemaProxyHandler.isObject(ifSchema)) { return; }

        let okay = true;
        info.schemaPush('if', ifSchema);
        try {
            JsonSchemaProxyHandler.validate(value, ifSchema, info);
        } catch (e) {
            okay = false;
        }
        info.schemaPop();

        const nextSchema = okay ? schema.then : schema.else;
        if (JsonSchemaProxyHandler.isObject(nextSchema)) {
            info.schemaPush(okay ? 'then' : 'else', nextSchema);
            JsonSchemaProxyHandler.validate(value, nextSchema, info);
            info.schemaPop();
        }
    }

    static validateAllOf(value, schema, info) {
        const subSchemas = schema.allOf;
        if (!Array.isArray(subSchemas)) { return; }

        info.schemaPush('allOf', subSchemas);
        for (let i = 0; i < subSchemas.length; ++i) {
            const subSchema = subSchemas[i];
            info.schemaPush(i, subSchema);
            JsonSchemaProxyHandler.validate(value, subSchema, info);
            info.schemaPop();
        }
        info.schemaPop();
    }

    static validateAnyOf(value, schema, info) {
        const subSchemas = schema.anyOf;
        if (!Array.isArray(subSchemas)) { return; }

        info.schemaPush('anyOf', subSchemas);
        for (let i = 0; i < subSchemas.length; ++i) {
            const subSchema = subSchemas[i];
            info.schemaPush(i, subSchema);
            try {
                JsonSchemaProxyHandler.validate(value, subSchema, info);
                return;
            } catch (e) {
                // NOP
            }
            info.schemaPop();
        }

        throw new JsonSchemaValidationError('0 anyOf schemas matched', value, schema, info);
        // info.schemaPop(); // Unreachable
    }

    static validateOneOf(value, schema, info) {
        const subSchemas = schema.oneOf;
        if (!Array.isArray(subSchemas)) { return; }

        info.schemaPush('oneOf', subSchemas);
        let count = 0;
        for (let i = 0; i < subSchemas.length; ++i) {
            const subSchema = subSchemas[i];
            info.schemaPush(i, subSchema);
            try {
                JsonSchemaProxyHandler.validate(value, subSchema, info);
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

    static validateNoneOf(value, schema, info) {
        const subSchemas = schema.not;
        if (!Array.isArray(subSchemas)) { return; }

        info.schemaPush('not', subSchemas);
        for (let i = 0; i < subSchemas.length; ++i) {
            const subSchema = subSchemas[i];
            info.schemaPush(i, subSchema);
            try {
                JsonSchemaProxyHandler.validate(value, subSchema, info);
            } catch (e) {
                info.schemaPop();
                continue;
            }
            throw new JsonSchemaValidationError(`not[${i}] schema matched`, value, schema, info);
        }
        info.schemaPop();
    }

    static validateSingleSchema(value, schema, info) {
        const type = JsonSchemaProxyHandler.getValueType(value);
        const schemaType = schema.type;
        if (!JsonSchemaProxyHandler.isValueTypeAny(value, type, schemaType)) {
            throw new JsonSchemaValidationError(`Value type ${type} does not match schema type ${schemaType}`, value, schema, info);
        }

        const schemaEnum = schema.enum;
        if (Array.isArray(schemaEnum) && !JsonSchemaProxyHandler.valuesAreEqualAny(value, schemaEnum)) {
            throw new JsonSchemaValidationError('Invalid enum value', value, schema, info);
        }

        switch (type) {
            case 'number':
                JsonSchemaProxyHandler.validateNumber(value, schema, info);
                break;
            case 'string':
                JsonSchemaProxyHandler.validateString(value, schema, info);
                break;
            case 'array':
                JsonSchemaProxyHandler.validateArray(value, schema, info);
                break;
            case 'object':
                JsonSchemaProxyHandler.validateObject(value, schema, info);
                break;
        }
    }

    static validateNumber(value, schema, info) {
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

    static validateString(value, schema, info) {
        const minLength = schema.minLength;
        if (typeof minLength === 'number' && value.length < minLength) {
            throw new JsonSchemaValidationError('String length too short', value, schema, info);
        }

        const maxLength = schema.maxLength;
        if (typeof maxLength === 'number' && value.length > maxLength) {
            throw new JsonSchemaValidationError('String length too long', value, schema, info);
        }
    }

    static validateArray(value, schema, info) {
        const minItems = schema.minItems;
        if (typeof minItems === 'number' && value.length < minItems) {
            throw new JsonSchemaValidationError('Array length too short', value, schema, info);
        }

        const maxItems = schema.maxItems;
        if (typeof maxItems === 'number' && value.length > maxItems) {
            throw new JsonSchemaValidationError('Array length too long', value, schema, info);
        }

        for (let i = 0, ii = value.length; i < ii; ++i) {
            const schemaPath = [];
            const propertySchema = JsonSchemaProxyHandler.getPropertySchema(schema, i, value, schemaPath);
            if (propertySchema === null) {
                throw new JsonSchemaValidationError(`No schema found for array[${i}]`, value, schema, info);
            }

            const propertyValue = value[i];

            for (const [p, s] of schemaPath) { info.schemaPush(p, s); }
            info.valuePush(i, propertyValue);
            JsonSchemaProxyHandler.validate(propertyValue, propertySchema, info);
            info.valuePop();
            for (let i = 0; i < schemaPath.length; ++i) { info.schemaPop(); }
        }
    }

    static validateObject(value, schema, info) {
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
            const propertySchema = JsonSchemaProxyHandler.getPropertySchema(schema, property, value, schemaPath);
            if (propertySchema === null) {
                throw new JsonSchemaValidationError(`No schema found for ${property}`, value, schema, info);
            }

            const propertyValue = value[property];

            for (const [p, s] of schemaPath) { info.schemaPush(p, s); }
            info.valuePush(property, propertyValue);
            JsonSchemaProxyHandler.validate(propertyValue, propertySchema, info);
            info.valuePop();
            for (let i = 0; i < schemaPath.length; ++i) { info.schemaPop(); }
        }
    }

    static isValueTypeAny(value, type, schemaTypes) {
        if (typeof schemaTypes === 'string') {
            return JsonSchemaProxyHandler.isValueType(value, type, schemaTypes);
        } else if (Array.isArray(schemaTypes)) {
            for (const schemaType of schemaTypes) {
                if (JsonSchemaProxyHandler.isValueType(value, type, schemaType)) {
                    return true;
                }
            }
            return false;
        }
        return true;
    }

    static isValueType(value, type, schemaType) {
        return (
            type === schemaType ||
            (schemaType === 'integer' && Math.floor(value) === value)
        );
    }

    static getValueType(value) {
        const type = typeof value;
        if (type === 'object') {
            if (value === null) { return 'null'; }
            if (Array.isArray(value)) { return 'array'; }
        }
        return type;
    }

    static valuesAreEqualAny(value1, valueList) {
        for (const value2 of valueList) {
            if (JsonSchemaProxyHandler.valuesAreEqual(value1, value2)) {
                return true;
            }
        }
        return false;
    }

    static valuesAreEqual(value1, value2) {
        return value1 === value2;
    }

    static getDefaultTypeValue(type) {
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

    static getValidValueOrDefault(schema, value) {
        let type = JsonSchemaProxyHandler.getValueType(value);
        const schemaType = schema.type;
        if (!JsonSchemaProxyHandler.isValueTypeAny(value, type, schemaType)) {
            let assignDefault = true;

            const schemaDefault = schema.default;
            if (typeof schemaDefault !== 'undefined') {
                value = JsonSchema.isolate(schemaDefault);
                type = JsonSchemaProxyHandler.getValueType(value);
                assignDefault = !JsonSchemaProxyHandler.isValueTypeAny(value, type, schemaType);
            }

            if (assignDefault) {
                value = JsonSchemaProxyHandler.getDefaultTypeValue(schemaType);
                type = JsonSchemaProxyHandler.getValueType(value);
            }
        }

        switch (type) {
            case 'object':
                value = JsonSchemaProxyHandler.populateObjectDefaults(value, schema);
                break;
            case 'array':
                value = JsonSchemaProxyHandler.populateArrayDefaults(value, schema);
                break;
        }

        return value;
    }

    static populateObjectDefaults(value, schema) {
        const properties = new Set(Object.getOwnPropertyNames(value));

        const required = schema.required;
        if (Array.isArray(required)) {
            for (const property of required) {
                properties.delete(property);

                const propertySchema = JsonSchemaProxyHandler.getPropertySchema(schema, property, value);
                if (propertySchema === null) { continue; }
                value[property] = JsonSchemaProxyHandler.getValidValueOrDefault(propertySchema, value[property]);
            }
        }

        for (const property of properties) {
            const propertySchema = JsonSchemaProxyHandler.getPropertySchema(schema, property, value);
            if (propertySchema === null) {
                Reflect.deleteProperty(value, property);
            } else {
                value[property] = JsonSchemaProxyHandler.getValidValueOrDefault(propertySchema, value[property]);
            }
        }

        return value;
    }

    static populateArrayDefaults(value, schema) {
        for (let i = 0, ii = value.length; i < ii; ++i) {
            const propertySchema = JsonSchemaProxyHandler.getPropertySchema(schema, i, value);
            if (propertySchema === null) { continue; }
            value[i] = JsonSchemaProxyHandler.getValidValueOrDefault(propertySchema, value[i]);
        }

        return value;
    }

    static isObject(value) {
        return typeof value === 'object' && value !== null && !Array.isArray(value);
    }
}

JsonSchemaProxyHandler._unconstrainedSchema = {};

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

class JsonSchema {
    static createProxy(target, schema) {
        return new Proxy(target, new JsonSchemaProxyHandler(schema));
    }

    static validate(value, schema) {
        return JsonSchemaProxyHandler.validate(value, schema, new JsonSchemaTraversalInfo(value, schema));
    }

    static getValidValueOrDefault(schema, value) {
        return JsonSchemaProxyHandler.getValidValueOrDefault(schema, value);
    }

    static isolate(value) {
        if (value === null) { return null; }

        switch (typeof value) {
            case 'boolean':
            case 'number':
            case 'string':
            case 'bigint':
            case 'symbol':
                return value;
        }

        const stringValue = JSON.stringify(value);
        return typeof stringValue === 'string' ? JSON.parse(stringValue) : null;
    }
}
