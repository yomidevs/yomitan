/*
 * Copyright (C) 2019-2020  Yomichan Authors
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

// toIterable is required on Edge for cross-window origin objects.
function toIterable(value) {
    if (typeof Symbol !== 'undefined' && typeof value[Symbol.iterator] !== 'undefined') {
        return value;
    }

    if (value !== null && typeof value === 'object') {
        const length = value.length;
        if (typeof length === 'number' && Number.isFinite(length)) {
            return Array.from(value);
        }
    }

    throw new Error('Could not convert to iterable');
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

// Expose clone function on the global object, since util.js's utilBackgroundIsolate needs access to it.
if (typeof window === 'object' && window !== null) {
    window.clone = clone;
}

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


/*
 * Common events
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
}

class EventListenerCollection {
    constructor() {
        this._eventListeners = [];
    }

    get size() {
        return this._eventListeners.length;
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
