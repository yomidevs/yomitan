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

        const error = JsonSchemaProxyHandler.validate(value, propertySchema);
        if (error !== null) {
            throw new Error(`Invalid value: ${error}`);
        }

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

    static getPropertySchema(schema, property, value) {
        const type = JsonSchemaProxyHandler.getSchemaOrValueType(schema, value);
        switch (type) {
            case 'object':
            {
                const properties = schema.properties;
                if (JsonSchemaProxyHandler.isObject(properties)) {
                    if (Object.prototype.hasOwnProperty.call(properties, property)) {
                        return properties[property];
                    }
                }

                const additionalProperties = schema.additionalProperties;
                if (additionalProperties === false) {
                    return null;
                } if (JsonSchemaProxyHandler.isObject(additionalProperties)) {
                    return additionalProperties;
                } else {
                    return JsonSchemaProxyHandler._unconstrainedSchema;
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
                        return items[property];
                    }
                }

                const additionalItems = schema.additionalItems;
                if (additionalItems === false) {
                    return null;
                } else if (JsonSchemaProxyHandler.isObject(additionalItems)) {
                    return additionalItems;
                } else {
                    return JsonSchemaProxyHandler._unconstrainedSchema;
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
            throw new Error(`Ambiguous property type for ${property}`);
        }

        if (typeof type === 'undefined') {
            if (typeof value !== 'undefined') {
                return JsonSchemaProxyHandler.getValueType(value);
            }
            throw new Error(`No property type for ${property}`);
        }

        return type;
    }

    static validate(value, schema) {
        let result = JsonSchemaProxyHandler.validateSingleSchema(value, schema);
        if (result !== null) { return result; }

        result = JsonSchemaProxyHandler.validateConditional(value, schema);
        if (result !== null) { return result; }

        result = JsonSchemaProxyHandler.validateAllOf(value, schema);
        if (result !== null) { return result; }

        result = JsonSchemaProxyHandler.validateAnyOf(value, schema);
        if (result !== null) { return result; }

        result = JsonSchemaProxyHandler.validateOneOf(value, schema);
        if (result !== null) { return result; }

        result = JsonSchemaProxyHandler.validateNoneOf(value, schema);
        if (result !== null) { return result; }

        return null;
    }

    static validateConditional(value, schema) {
        const ifCondition = schema.if;
        if (!JsonSchemaProxyHandler.isObject(ifCondition)) { return null; }

        const thenSchema = schema.then;
        if (JsonSchemaProxyHandler.isObject(thenSchema)) {
            const result = JsonSchemaProxyHandler.validate(value, thenSchema);
            if (result !== null) { return `then conditional didn't match: ${result}`; }
        }

        const elseSchema = schema.else;
        if (JsonSchemaProxyHandler.isObject(elseSchema)) {
            const result = JsonSchemaProxyHandler.validate(value, thenSchema);
            if (result !== null) { return `else conditional didn't match: ${result}`; }
        }

        return null;
    }

    static validateAllOf(value, schema) {
        const subSchemas = schema.allOf;
        if (!Array.isArray(subSchemas)) { return null; }

        for (let i = 0; i < subSchemas.length; ++i) {
            const result = JsonSchemaProxyHandler.validate(value, subSchemas[i]);
            if (result !== null) { return `allOf[${i}] schema didn't match: ${result}`; }
        }
        return null;
    }

    static validateAnyOf(value, schema) {
        const subSchemas = schema.anyOf;
        if (!Array.isArray(subSchemas)) { return null; }

        for (let i = 0; i < subSchemas.length; ++i) {
            const result = JsonSchemaProxyHandler.validate(value, subSchemas[i]);
            if (result === null) { return null; }
        }
        return '0 anyOf schemas matched';
    }

    static validateOneOf(value, schema) {
        const subSchemas = schema.oneOf;
        if (!Array.isArray(subSchemas)) { return null; }

        let count = 0;
        for (let i = 0; i < subSchemas.length; ++i) {
            const result = JsonSchemaProxyHandler.validate(value, subSchemas[i]);
            if (result === null) { ++count; }
        }
        return count === 1 ? null : `${count} oneOf schemas matched`;
    }

    static validateNoneOf(value, schema) {
        const subSchemas = schema.not;
        if (!Array.isArray(subSchemas)) { return null; }

        for (let i = 0; i < subSchemas.length; ++i) {
            const result = JsonSchemaProxyHandler.validate(value, subSchemas[i]);
            if (result === null) { return `not[${i}] schema matched`; }
        }
        return null;
    }

    static validateSingleSchema(value, schema) {
        const type = JsonSchemaProxyHandler.getValueType(value);
        const schemaType = schema.type;
        if (!JsonSchemaProxyHandler.isValueTypeAny(value, type, schemaType)) {
            return `Value type ${type} does not match schema type ${schemaType}`;
        }

        const schemaEnum = schema.enum;
        if (Array.isArray(schemaEnum) && !JsonSchemaProxyHandler.valuesAreEqualAny(value, schemaEnum)) {
            return 'Invalid enum value';
        }

        switch (type) {
            case 'number':
                return JsonSchemaProxyHandler.validateNumber(value, schema);
            case 'string':
                return JsonSchemaProxyHandler.validateString(value, schema);
            case 'array':
                return JsonSchemaProxyHandler.validateArray(value, schema);
            case 'object':
                return JsonSchemaProxyHandler.validateObject(value, schema);
            default:
                return null;
        }
    }

    static validateNumber(value, schema) {
        const multipleOf = schema.multipleOf;
        if (typeof multipleOf === 'number' && Math.floor(value / multipleOf) * multipleOf !== value) {
            return `Number is not a multiple of ${multipleOf}`;
        }

        const minimum = schema.minimum;
        if (typeof minimum === 'number' && value < minimum) {
            return `Number is less than ${minimum}`;
        }

        const exclusiveMinimum = schema.exclusiveMinimum;
        if (typeof exclusiveMinimum === 'number' && value <= exclusiveMinimum) {
            return `Number is less than or equal to ${exclusiveMinimum}`;
        }

        const maximum = schema.maximum;
        if (typeof maximum === 'number' && value > maximum) {
            return `Number is greater than ${maximum}`;
        }

        const exclusiveMaximum = schema.exclusiveMaximum;
        if (typeof exclusiveMaximum === 'number' && value >= exclusiveMaximum) {
            return `Number is greater than or equal to ${exclusiveMaximum}`;
        }

        return null;
    }

    static validateString(value, schema) {
        const minLength = schema.minLength;
        if (typeof minLength === 'number' && value.length < minLength) {
            return 'String length too short';
        }

        const maxLength = schema.minLength;
        if (typeof maxLength === 'number' && value.length > maxLength) {
            return 'String length too long';
        }

        return null;
    }

    static validateArray(value, schema) {
        const minItems = schema.minItems;
        if (typeof minItems === 'number' && value.length < minItems) {
            return 'Array length too short';
        }

        const maxItems = schema.maxItems;
        if (typeof maxItems === 'number' && value.length > maxItems) {
            return 'Array length too long';
        }

        for (let i = 0, ii = value.length; i < ii; ++i) {
            const propertySchema = JsonSchemaProxyHandler.getPropertySchema(schema, i, value);
            if (propertySchema === null) {
                return `No schema found for array[${i}]`;
            }

            const error = JsonSchemaProxyHandler.validate(value[i], propertySchema);
            if (error !== null) {
                return error;
            }
        }

        return null;
    }

    static validateObject(value, schema) {
        const properties = new Set(Object.getOwnPropertyNames(value));

        const required = schema.required;
        if (Array.isArray(required)) {
            for (const property of required) {
                if (!properties.has(property)) {
                    return `Missing property ${property}`;
                }
            }
        }

        const minProperties = schema.minProperties;
        if (typeof minProperties === 'number' && properties.length < minProperties) {
            return 'Not enough object properties';
        }

        const maxProperties = schema.maxProperties;
        if (typeof maxProperties === 'number' && properties.length > maxProperties) {
            return 'Too many object properties';
        }

        for (const property of properties) {
            const propertySchema = JsonSchemaProxyHandler.getPropertySchema(schema, property, value);
            if (propertySchema === null) {
                return `No schema found for ${property}`;
            }
            const error = JsonSchemaProxyHandler.validate(value[property], propertySchema);
            if (error !== null) {
                return error;
            }
        }

        return null;
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

class JsonSchema {
    static createProxy(target, schema) {
        return new Proxy(target, new JsonSchemaProxyHandler(schema));
    }

    static validate(value, schema) {
        return JsonSchemaProxyHandler.validate(value, schema);
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
