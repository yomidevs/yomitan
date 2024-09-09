/*
 * Copyright (C) 2023-2024  Yomitan Authors
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

export type ValueObject = {[key: string]: Value};

export type Value = boolean | null | number | string | Value[] | ValueObject;

export type ValueObjectOrArray = Value[] | ValueObject;

export type Type = 'array' | 'boolean' | 'integer' | 'null' | 'number' | 'object' | 'string';

export type SchemaObject = {
    $ref?: string;
    additionalItems?: Schema;

    additionalProperties?: Schema;
    allOf?: Schema[];
    anyOf?: Schema[];
    const?: Value;
    contains?: Schema;
    default?: Value;
    definitions?: {[key: string]: Schema};
    else?: Schema;
    enum?: Value[];
    exclusiveMaximum?: number;
    exclusiveMinimum?: number;
    if?: Schema;
    items?: Schema | Schema[]; // Legacy schema format for the array
    maximum?: number;
    maxItems?: number;
    maxLength?: number;
    maxProperties?: number;

    minimum?: number;

    minItems?: number;
    minLength?: number;
    minProperties?: number;
    multipleOf?: number;
    not?: Schema;
    oneOf?: Schema[];
    pattern?: string;
    patternFlags?: string;
    prefixItems?: Schema[];
    properties?: {[key: string]: Schema};
    required?: string[];
    then?: Schema;
    type?: Type | Type[];
};

export type Schema = false | SchemaObject | true;

export type SchemaStackItem = {
    path: null | number | string;
    schema: Schema | Schema[];
};

export type ValueStackItem = {
    path: null | number | string;
    value: unknown;
};
