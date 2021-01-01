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

/*
 * Error handling
 */

function errorToJson(error) {
    try {
        if (isObject(error)) {
            return {
                name: error.name,
                message: error.message,
                stack: error.stack,
                data: error.data
            };
        }
    } catch (e) {
        // NOP
    }
    return {
        value: error,
        hasValue: true
    };
}

function jsonToError(jsonError) {
    if (jsonError.hasValue) {
        return jsonError.value;
    }
    const error = new Error(jsonError.message);
    error.name = jsonError.name;
    error.stack = jsonError.stack;
    error.data = jsonError.data;
    return error;
}


/*
 * Common helpers
 */

function isObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOwn(object, property) {
    return Object.prototype.hasOwnProperty.call(object, property);
}

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions
function escapeRegExp(string) {
    return string.replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&');
}

function stringReverse(string) {
    return string.split('').reverse().join('').replace(/([\uDC00-\uDFFF])([\uD800-\uDBFF])/g, '$2$1');
}

function parseUrl(url) {
    const parsedUrl = new URL(url);
    const baseUrl = `${parsedUrl.origin}${parsedUrl.pathname}`;
    const queryParams = Array.from(parsedUrl.searchParams.entries())
        .reduce((a, [k, v]) => Object.assign({}, a, {[k]: v}), {});
    return {baseUrl, queryParams};
}

function areSetsEqual(set1, set2) {
    if (set1.size !== set2.size) {
        return false;
    }

    for (const value of set1) {
        if (!set2.has(value)) {
            return false;
        }
    }

    return true;
}

function getSetIntersection(set1, set2) {
    const result = [];
    for (const value of set1) {
        if (set2.has(value)) {
            result.push(value);
        }
    }
    return result;
}

function getSetDifference(set1, set2) {
    return new Set(
        [...set1].filter((value) => !set2.has(value))
    );
}

const clone = (() => {
    // eslint-disable-next-line no-shadow
    function clone(value) {
        if (value === null) { return null; }
        switch (typeof value) {
            case 'boolean':
            case 'number':
            case 'string':
            case 'bigint':
            case 'symbol':
            case 'undefined':
                return value;
            default:
                return cloneInternal(value, new Set());
        }
    }

    function cloneInternal(value, visited) {
        if (value === null) { return null; }
        switch (typeof value) {
            case 'boolean':
            case 'number':
            case 'string':
            case 'bigint':
            case 'symbol':
            case 'undefined':
                return value;
            case 'function':
                return cloneObject(value, visited);
            case 'object':
                return Array.isArray(value) ? cloneArray(value, visited) : cloneObject(value, visited);
        }
    }

    function cloneArray(value, visited) {
        if (visited.has(value)) { throw new Error('Circular'); }
        try {
            visited.add(value);
            const result = [];
            for (const item of value) {
                result.push(cloneInternal(item, visited));
            }
            return result;
        } finally {
            visited.delete(value);
        }
    }

    function cloneObject(value, visited) {
        if (visited.has(value)) { throw new Error('Circular'); }
        try {
            visited.add(value);
            const result = {};
            for (const key in value) {
                if (Object.prototype.hasOwnProperty.call(value, key)) {
                    result[key] = cloneInternal(value[key], visited);
                }
            }
            return result;
        } finally {
            visited.delete(value);
        }
    }

    return clone;
})();

const deepEqual = (() => {
    // eslint-disable-next-line no-shadow
    function deepEqual(value1, value2) {
        if (value1 === value2) { return true; }

        const type = typeof value1;
        if (typeof value2 !== type) { return false; }

        switch (type) {
            case 'object':
            case 'function':
                return deepEqualInternal(value1, value2, new Set());
            default:
                return false;
        }
    }

    function deepEqualInternal(value1, value2, visited1) {
        if (value1 === value2) { return true; }

        const type = typeof value1;
        if (typeof value2 !== type) { return false; }

        switch (type) {
            case 'object':
            case 'function':
            {
                if (value1 === null || value2 === null) { return false; }
                const array = Array.isArray(value1);
                if (array !== Array.isArray(value2)) { return false; }
                if (visited1.has(value1)) { return false; }
                visited1.add(value1);
                return array ? areArraysEqual(value1, value2, visited1) : areObjectsEqual(value1, value2, visited1);
            }
            default:
                return false;
        }
    }

    function areObjectsEqual(value1, value2, visited1) {
        const keys1 = Object.keys(value1);
        const keys2 = Object.keys(value2);
        if (keys1.length !== keys2.length) { return false; }

        const keys1Set = new Set(keys1);
        for (const key of keys2) {
            if (!keys1Set.has(key) || !deepEqualInternal(value1[key], value2[key], visited1)) { return false; }
        }

        return true;
    }

    function areArraysEqual(value1, value2, visited1) {
        const length = value1.length;
        if (length !== value2.length) { return false; }

        for (let i = 0; i < length; ++i) {
            if (!deepEqualInternal(value1[i], value2[i], visited1)) { return false; }
        }

        return true;
    }

    return deepEqual;
})();

function generateId(length) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    let id = '';
    for (const value of array) {
        id += value.toString(16).padStart(2, '0');
    }
    return id;
}


/*
 * Async utilities
 */

function deferPromise() {
    let resolve;
    let reject;
    const promise = new Promise((resolve2, reject2) => {
        resolve = resolve2;
        reject = reject2;
    });
    return {promise, resolve, reject};
}

function promiseTimeout(delay, resolveValue) {
    if (delay <= 0) {
        const promise = Promise.resolve(resolveValue);
        promise.resolve = () => {}; // NOP
        promise.reject = () => {}; // NOP
        return promise;
    }

    let timer = null;
    let {promise, resolve, reject} = deferPromise();

    const complete = (callback, value) => {
        if (callback === null) { return; }
        if (timer !== null) {
            clearTimeout(timer);
            timer = null;
        }
        resolve = null;
        reject = null;
        callback(value);
    };

    const resolveWrapper = (value) => complete(resolve, value);
    const rejectWrapper = (value) => complete(reject, value);

    timer = setTimeout(() => {
        timer = null;
        resolveWrapper(resolveValue);
    }, delay);

    promise.resolve = resolveWrapper;
    promise.reject = rejectWrapper;

    return promise;
}

function promiseAnimationFrame(timeout=null) {
    return new Promise((resolve, reject) => {
        if (typeof cancelAnimationFrame !== 'function' || typeof requestAnimationFrame !== 'function') {
            reject(new Error('Animation not supported in this context'));
            return;
        }

        let timer = null;
        let frameRequest = null;
        const onFrame = (time) => {
            frameRequest = null;
            if (timer !== null) {
                clearTimeout(timer);
                timer = null;
            }
            resolve({time, timeout: false});
        };
        const onTimeout = () => {
            timer = null;
            if (frameRequest !== null) {
                // eslint-disable-next-line no-undef
                cancelAnimationFrame(frameRequest);
                frameRequest = null;
            }
            resolve({time: timeout, timeout: true});
        };

        // eslint-disable-next-line no-undef
        frameRequest = requestAnimationFrame(onFrame);
        if (typeof timeout === 'number') {
            timer = setTimeout(onTimeout, timeout);
        }
    });
}


/*
 * Common classes
 */

class EventDispatcher {
    constructor() {
        this._eventMap = new Map();
    }

    trigger(eventName, details) {
        const callbacks = this._eventMap.get(eventName);
        if (typeof callbacks === 'undefined') { return false; }

        for (const callback of callbacks) {
            callback(details);
        }
    }

    on(eventName, callback) {
        let callbacks = this._eventMap.get(eventName);
        if (typeof callbacks === 'undefined') {
            callbacks = [];
            this._eventMap.set(eventName, callbacks);
        }
        callbacks.push(callback);
    }

    off(eventName, callback) {
        const callbacks = this._eventMap.get(eventName);
        if (typeof callbacks === 'undefined') { return true; }

        const ii = callbacks.length;
        for (let i = 0; i < ii; ++i) {
            if (callbacks[i] === callback) {
                callbacks.splice(i, 1);
                if (callbacks.length === 0) {
                    this._eventMap.delete(eventName);
                }
                return true;
            }
        }
        return false;
    }

    hasListeners(eventName) {
        const callbacks = this._eventMap.get(eventName);
        return (typeof callbacks !== 'undefined' && callbacks.length > 0);
    }
}

class EventListenerCollection {
    constructor() {
        this._eventListeners = [];
    }

    get size() {
        return this._eventListeners.length;
    }

    addGeneric(type, object, ...args) {
        switch (type) {
            case 'addEventListener': return this.addEventListener(object, ...args);
            case 'addListener': return this.addListener(object, ...args);
            case 'on': return this.on(object, ...args);
        }
    }

    addEventListener(object, ...args) {
        object.addEventListener(...args);
        this._eventListeners.push(['removeEventListener', object, ...args]);
    }

    addListener(object, ...args) {
        object.addListener(...args);
        this._eventListeners.push(['removeListener', object, ...args]);
    }

    on(object, ...args) {
        object.on(...args);
        this._eventListeners.push(['off', object, ...args]);
    }

    removeAllEventListeners() {
        if (this._eventListeners.length === 0) { return; }
        for (const [removeFunctionName, object, ...args] of this._eventListeners) {
            switch (removeFunctionName) {
                case 'removeEventListener':
                    object.removeEventListener(...args);
                    break;
                case 'removeListener':
                    object.removeListener(...args);
                    break;
                case 'off':
                    object.off(...args);
                    break;
                default:
                    throw new Error(`Unknown remove function: ${removeFunctionName}`);
            }
        }
        this._eventListeners = [];
    }
}

/**
 * Class representing a generic value with an override stack.
 * Changes can be observed by listening to the 'change' event.
 */
class DynamicProperty extends EventDispatcher {
    /**
     * Creates a new instance with the specified value.
     * @param value The value to assign.
     */
    constructor(value) {
        super();
        this._value = value;
        this._defaultValue = value;
        this._overrides = [];
    }

    /**
     * Gets the default value for the property, which is assigned to the
     * public value property when no overrides are present.
     */
    get defaultValue() {
        return this._defaultValue;
    }

    /**
     * Assigns the default value for the property. If no overrides are present
     * and if the value is different than the current default value,
     * the 'change' event will be triggered.
     * @param value The value to assign.
     */
    set defaultValue(value) {
        this._defaultValue = value;
        if (this._overrides.length === 0) { this._updateValue(); }
    }

    /**
     * Gets the current value for the property, taking any overrides into account.
     */
    get value() {
        return this._value;
    }

    /**
     * Gets the number of overrides added to the property.
     */
    get overrideCount() {
        return this._overrides.length;
    }

    /**
     * Adds an override value with the specified priority to the override stack.
     * Values with higher priority will take precedence over those with lower.
     * For tie breaks, the override value added first will take precedence.
     * If the newly added override has the highest priority of all overrides
     * and if the override value is different from the current value,
     * the 'change' event will be fired.
     * @param value The override value to assign.
     * @param priority The priority value to use, as a number.
     * @returns A string token which can be passed to the clearOverride function
     *  to remove the override.
     */
    setOverride(value, priority=0) {
        const overridesCount = this._overrides.length;
        let i = 0;
        for (; i < overridesCount; ++i) {
            if (priority > this._overrides[i].priority) { break; }
        }
        const token = generateId(16);
        this._overrides.splice(i, 0, {value, priority, token});
        if (i === 0) { this._updateValue(); }
        return token;
    }

    /**
     * Removes a specific override value. If the removed override
     * had the highest priority, and the new value is different from
     * the previous value, the 'change' event will be fired.
     * @param token The token for the corresponding override which is to be removed.
     * @returns true if an override was returned, false otherwise.
     */
    clearOverride(token) {
        for (let i = 0, ii = this._overrides.length; i < ii; ++i) {
            if (this._overrides[i].token === token) {
                this._overrides.splice(i, 1);
                if (i === 0) { this._updateValue(); }
                return true;
            }
        }
        return false;
    }

    /**
     * Updates the current value using the current overrides and default value.
     * If the new value differs from the previous value, the 'change' event will be fired.
     */
    _updateValue() {
        const value = this._overrides.length > 0 ? this._overrides[0].value : this._defaultValue;
        if (this._value === value) { return; }
        this._value = value;
        this.trigger('change', {value});
    }
}
