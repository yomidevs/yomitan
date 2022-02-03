/*
 * Copyright (C) 2020-2022  Yomichan Authors
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

const fs = require('fs');
const vm = require('vm');
const path = require('path');
const assert = require('assert');
const crypto = require('crypto');


function getContextEnvironmentRecords(context, names) {
    // Enables export of values from the declarative environment record
    if (!Array.isArray(names) || names.length === 0) {
        return [];
    }

    let scriptSource = '(() => {\n    "use strict";\n    const results = [];';
    for (const name of names) {
        scriptSource += `\n    try { results.push(${name}); } catch (e) { results.push(void 0); }`;
    }
    scriptSource += '\n    return results;\n})();';

    const script = new vm.Script(scriptSource, {filename: 'getContextEnvironmentRecords'});

    const contextHasNames = Object.prototype.hasOwnProperty.call(context, 'names');
    const contextNames = context.names;
    context.names = names;

    const results = script.runInContext(context, {});

    if (contextHasNames) {
        context.names = contextNames;
    } else {
        delete context.names;
    }

    return Array.from(results);
}

function isDeepStrictEqual(val1, val2) {
    if (val1 === val2) { return true; }

    if (Array.isArray(val1)) {
        if (Array.isArray(val2)) {
            return isArrayDeepStrictEqual(val1, val2);
        }
    } else if (typeof val1 === 'object' && val1 !== null) {
        if (typeof val2 === 'object' && val2 !== null) {
            return isObjectDeepStrictEqual(val1, val2);
        }
    }

    return false;
}

function isArrayDeepStrictEqual(val1, val2) {
    const ii = val1.length;
    if (ii !== val2.length) { return false; }

    for (let i = 0; i < ii; ++i) {
        if (!isDeepStrictEqual(val1[i], val2[i])) {
            return false;
        }
    }

    return true;
}

function isObjectDeepStrictEqual(val1, val2) {
    const keys1 = Object.keys(val1);
    const keys2 = Object.keys(val2);

    if (keys1.length !== keys2.length) { return false; }

    const keySet = new Set(keys1);
    for (const key of keys2) {
        if (!keySet.delete(key)) { return false; }
    }

    for (const key of keys1) {
        if (!isDeepStrictEqual(val1[key], val2[key])) {
            return false;
        }
    }

    const tag1 = Object.prototype.toString.call(val1);
    const tag2 = Object.prototype.toString.call(val2);
    if (tag1 !== tag2) { return false; }

    return true;
}

function deepStrictEqual(actual, expected) {
    try {
        // This will fail on prototype === comparison on cross context objects
        assert.deepStrictEqual(actual, expected);
    } catch (e) {
        if (!isDeepStrictEqual(actual, expected)) {
            throw e;
        }
    }
}


function createURLClass() {
    const BaseURL = URL;
    const result = function URL(url) {
        const u = new BaseURL(url);
        this.hash = u.hash;
        this.host = u.host;
        this.hostname = u.hostname;
        this.href = u.href;
        this.origin = u.origin;
        this.password = u.password;
        this.pathname = u.pathname;
        this.port = u.port;
        this.protocol = u.protocol;
        this.search = u.search;
        this.searchParams = u.searchParams;
        this.username = u.username;
    };
    return result;
}


class VM {
    constructor(context={}) {
        context.URL = createURLClass();
        context.crypto = {
            getRandomValues: (array) => {
                const buffer = crypto.randomBytes(array.byteLength);
                buffer.copy(array);
                return array;
            }
        };
        this._context = vm.createContext(context);
        this._assert = {
            deepStrictEqual
        };
    }

    get context() {
        return this._context;
    }

    get assert() {
        return this._assert;
    }

    get(names) {
        if (typeof names === 'string') {
            return getContextEnvironmentRecords(this._context, [names])[0];
        } else if (Array.isArray(names)) {
            return getContextEnvironmentRecords(this._context, names);
        } else {
            throw new Error('Invalid argument');
        }
    }

    set(values) {
        if (typeof values === 'object' && values !== null) {
            Object.assign(this._context, values);
        } else {
            throw new Error('Invalid argument');
        }
    }

    execute(fileNames) {
        const single = !Array.isArray(fileNames);
        if (single) {
            fileNames = [fileNames];
        }

        const results = [];
        for (const fileName of fileNames) {
            const absoluteFileName = path.resolve(__dirname, '..', 'ext', fileName);
            const source = fs.readFileSync(absoluteFileName, {encoding: 'utf8'});
            const script = new vm.Script(source, {filename: absoluteFileName});
            results.push(script.runInContext(this._context, {}));
        }

        return single ? results[0] : results;
    }
}


module.exports = {
    VM
};
