/*
 * Copyright (C) 2016-2020  Alex Yatskov <alex@foosoft.net>
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

/**
 * Class used to get and set generic properties of an object by using path strings.
 */
class ObjectPropertyAccessor {
    constructor(target, setter=null) {
        this._target = target;
        this._setter = (typeof setter === 'function' ? setter : null);
    }

    getProperty(pathArray, pathLength) {
        let target = this._target;
        const ii = typeof pathLength === 'number' ? Math.min(pathArray.length, pathLength) : pathArray.length;
        for (let i = 0; i < ii; ++i) {
            const key = pathArray[i];
            if (!ObjectPropertyAccessor.hasProperty(target, key)) {
                throw new Error(`Invalid path: ${ObjectPropertyAccessor.getPathString(pathArray.slice(0, i + 1))}`);
            }
            target = target[key];
        }
        return target;
    }

    setProperty(pathArray, value) {
        if (pathArray.length === 0) {
            throw new Error('Invalid path');
        }

        const target = this.getProperty(pathArray, pathArray.length - 1);
        const key = pathArray[pathArray.length - 1];
        if (!ObjectPropertyAccessor.isValidPropertyType(target, key)) {
            throw new Error(`Invalid path: ${ObjectPropertyAccessor.getPathString(pathArray)}`);
        }

        if (this._setter !== null) {
            this._setter(target, key, value, pathArray);
        } else {
            target[key] = value;
        }
    }

    static getPathString(pathArray) {
        const regexShort = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
        let pathString = '';
        let first = true;
        for (let part of pathArray) {
            switch (typeof part) {
                case 'number':
                    if (Math.floor(part) !== part || part < 0) {
                        throw new Error('Invalid index');
                    }
                    part = `[${part}]`;
                    break;
                case 'string':
                    if (!regexShort.test(part)) {
                        const escapedPart = part.replace(/["\\]/g, '\\$&');
                        part = `["${escapedPart}"]`;
                    } else {
                        if (!first) {
                            part = `.${part}`;
                        }
                    }
                    break;
                default:
                    throw new Error(`Invalid type: ${typeof part}`);
            }
            pathString += part;
            first = false;
        }
        return pathString;
    }

    static getPathArray(pathString) {
        const pathArray = [];
        let state = 0;
        let quote = 0;
        let value = '';
        let escaped = false;
        for (const c of pathString) {
            const v = c.codePointAt(0);
            switch (state) {
                case 0: // Empty
                case 1: // Expecting identifier start
                    if (v === 0x5b) { // '['
                        if (state === 1) {
                            throw new Error(`Unexpected character: ${c}`);
                        }
                        state = 3;
                    } else if (
                        (v >= 0x41 && v <= 0x5a) || // ['A', 'Z']
                        (v >= 0x61 && v <= 0x7a) || // ['a', 'z']
                        v === 0x5f // '_'
                    ) {
                        state = 2;
                        value += c;
                    } else {
                        throw new Error(`Unexpected character: ${c}`);
                    }
                    break;
                case 2: // Identifier
                    if (
                        (v >= 0x41 && v <= 0x5a) || // ['A', 'Z']
                        (v >= 0x61 && v <= 0x7a) || // ['a', 'z']
                        (v >= 0x30 && v <= 0x39) || // ['0', '9']
                        v === 0x5f // '_'
                    ) {
                        value += c;
                    } else if (v === 0x5b) { // '['
                        pathArray.push(value);
                        value = '';
                        state = 3;
                    } else if (v === 0x2e) { // '.'
                        pathArray.push(value);
                        value = '';
                        state = 1;
                    } else {
                        throw new Error(`Unexpected character: ${c}`);
                    }
                    break;
                case 3: // Open bracket
                    if (v === 0x22 || v === 0x27) { // '"' or '\''
                        quote = v;
                        state = 4;
                    } else if (v >= 0x30 && v <= 0x39) { // ['0', '9']
                        state = 5;
                        value += c;
                    } else {
                        throw new Error(`Unexpected character: ${c}`);
                    }
                    break;
                case 4: // Quoted string
                    if (escaped) {
                        value += c;
                        escaped = false;
                    } else if (v === 0x5c) { // '\\'
                        escaped = true;
                    } else if (v !== quote) {
                        value += c;
                    } else {
                        state = 6;
                    }
                    break;
                case 5: // Number
                    if (v >= 0x30 && v <= 0x39) { // ['0', '9']
                        value += c;
                    } else if (v === 0x5d) { // ']'
                        pathArray.push(Number.parseInt(value, 10));
                        value = '';
                        state = 7;
                    } else {
                        throw new Error(`Unexpected character: ${c}`);
                    }
                    break;
                case 6: // Expecting closing bracket after quoted string
                    if (v === 0x5d) { // ']'
                        pathArray.push(value);
                        value = '';
                        state = 7;
                    } else {
                        throw new Error(`Unexpected character: ${c}`);
                    }
                    break;
                case 7: // Expecting . or [
                    if (v === 0x5b) { // '['
                        state = 3;
                    } else if (v === 0x2e) { // '.'
                        state = 1;
                    } else {
                        throw new Error(`Unexpected character: ${c}`);
                    }
                    break;
            }
        }
        switch (state) {
            case 0:
            case 7:
                break;
            case 2:
                pathArray.push(value);
                value = '';
                break;
            default:
                throw new Error('Path not terminated correctly');
        }
        return pathArray;
    }

    static hasProperty(object, property) {
        switch (typeof property) {
            case 'string':
                return (
                    typeof object === 'object' &&
                    object !== null &&
                    !Array.isArray(object) &&
                    Object.prototype.hasOwnProperty.call(object, property)
                );
            case 'number':
                return (
                    Array.isArray(object) &&
                    property >= 0 &&
                    property < object.length &&
                    property === Math.floor(property)
                );
            default:
                return false;
        }
    }

    static isValidPropertyType(object, property) {
        switch (typeof property) {
            case 'string':
                return (
                    typeof object === 'object' &&
                    object !== null &&
                    !Array.isArray(object)
                );
            case 'number':
                return (
                    Array.isArray(object) &&
                    property >= 0 &&
                    property === Math.floor(property)
                );
            default:
                return false;
        }
    }
}
