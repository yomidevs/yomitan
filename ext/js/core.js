/*
 * Copyright (C) 2023  Yomitan Authors
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

import {ExtensionError} from './core/extension-error.js';

/**
 * Checks whether a given value is a non-array object.
 * @param {unknown} value The value to check.
 * @returns {boolean} `true` if the value is an object and not an array, `false` otherwise.
 */
export function isObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Converts any string into a form that can be passed into the RegExp constructor.
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions
 * @param {string} string The string to convert to a valid regular expression.
 * @returns {string} The escaped string.
 */
export function escapeRegExp(string) {
    return string.replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Reverses a string.
 * @param {string} string The string to reverse.
 * @returns {string} The returned string, which retains proper UTF-16 surrogate pair order.
 */
export function stringReverse(string) {
    return [...string].reverse().join('');
}

/**
 * Creates a deep clone of an object or value. This is similar to `parseJson(JSON.stringify(value))`.
 * @template [T=unknown]
 * @param {T} value The value to clone.
 * @returns {T} A new clone of the value.
 * @throws An error if the value is circular and cannot be cloned.
 */
export function clone(value) {
    if (value === null) { return /** @type {T} */ (null); }
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

/**
 * @template [T=unknown]
 * @param {T} value
 * @param {Set<unknown>} visited
 * @returns {T}
 * @throws {Error}
 */
function cloneInternal(value, visited) {
    if (value === null) { return /** @type {T} */ (null); }
    switch (typeof value) {
        case 'boolean':
        case 'number':
        case 'string':
        case 'bigint':
        case 'symbol':
        case 'undefined':
            return value;
        case 'object':
            return /** @type {T} */ (
                    Array.isArray(value) ?
                    cloneArray(value, visited) :
                    cloneObject(/** @type {import('core').SerializableObject} */ (value), visited)
            );
        default:
            throw new Error(`Cannot clone object of type ${typeof value}`);
    }
}

/**
 * @param {unknown[]} value
 * @param {Set<unknown>} visited
 * @returns {unknown[]}
 * @throws {Error}
 */
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

/**
 * @param {import('core').SerializableObject} value
 * @param {Set<unknown>} visited
 * @returns {import('core').SerializableObject}
 * @throws {Error}
 */
function cloneObject(value, visited) {
    if (visited.has(value)) { throw new Error('Circular'); }
    try {
        visited.add(value);
        /** @type {import('core').SerializableObject} */
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

/**
 * Checks if an object or value is deeply equal to another object or value.
 * @param {unknown} value1 The first value to check.
 * @param {unknown} value2 The second value to check.
 * @returns {boolean} `true` if the values are the same object, or deeply equal without cycles. `false` otherwise.
 */
export function deepEqual(value1, value2) {
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

/**
 * @param {unknown} value1
 * @param {unknown} value2
 * @param {Set<unknown>} visited1
 * @returns {boolean}
 */
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
            return (
                    array ?
                    areArraysEqual(/** @type {unknown[]} */ (value1), /** @type {unknown[]} */ (value2), visited1) :
                    areObjectsEqual(/** @type {import('core').UnknownObject} */ (value1), /** @type {import('core').UnknownObject} */ (value2), visited1)
            );
        }
        default:
            return false;
    }
}

/**
 * @param {import('core').UnknownObject} value1
 * @param {import('core').UnknownObject} value2
 * @param {Set<unknown>} visited1
 * @returns {boolean}
 */
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

/**
 * @param {unknown[]} value1
 * @param {unknown[]} value2
 * @param {Set<unknown>} visited1
 * @returns {boolean}
 */
function areArraysEqual(value1, value2, visited1) {
    const length = value1.length;
    if (length !== value2.length) { return false; }

    for (let i = 0; i < length; ++i) {
        if (!deepEqualInternal(value1[i], value2[i], visited1)) { return false; }
    }

    return true;
}

/**
 * Creates a new base-16 (lower case) string of a sequence of random bytes of the given length.
 * @param {number} length The number of bytes the string represents. The returned string's length will be twice as long.
 * @returns {string} A string of random characters.
 */
export function generateId(length) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    let id = '';
    for (const value of array) {
        id += value.toString(16).padStart(2, '0');
    }
    return id;
}

/**
 * Creates an unresolved promise that can be resolved later, outside the promise's executor function.
 * @template [T=unknown]
 * @returns {import('core').DeferredPromiseDetails<T>} An object `{promise, resolve, reject}`, containing the promise and the resolve/reject functions.
 */
export function deferPromise() {
    /** @type {((value: T) => void)|undefined} */
    let resolve;
    /** @type {((reason?: import('core').RejectionReason) => void)|undefined} */
    let reject;
    const promise = new Promise((resolve2, reject2) => {
        resolve = resolve2;
        reject = reject2;
    });
    return {
        promise,
        resolve: /** @type {(value: T) => void} */ (resolve),
        reject: /** @type {(reason?: import('core').RejectionReason) => void} */ (reject)
    };
}

/**
 * Creates a promise that is resolved after a set delay.
 * @param {number} delay How many milliseconds until the promise should be resolved. If 0, the promise is immediately resolved.
 * @returns {Promise<void>} A promise with two additional properties: `resolve` and `reject`, which can be used to complete the promise early.
 */
export function promiseTimeout(delay) {
    return delay <= 0 ? Promise.resolve() : new Promise((resolve) => { setTimeout(resolve, delay); });
}

/**
 * Creates a promise that will resolve after the next animation frame, using `requestAnimationFrame`.
 * @param {number} [timeout] A maximum duration (in milliseconds) to wait until the promise resolves. If null or omitted, no timeout is used.
 * @returns {Promise<{time: number, timeout: boolean}>} A promise that is resolved with `{time, timeout}`, where `time` is the timestamp from `requestAnimationFrame`,
 *   and `timeout` is a boolean indicating whether the cause was a timeout or not.
 * @throws The promise throws an error if animation is not supported in this context, such as in a service worker.
 */
export function promiseAnimationFrame(timeout) {
    return new Promise((resolve, reject) => {
        if (typeof cancelAnimationFrame !== 'function' || typeof requestAnimationFrame !== 'function') {
            reject(new Error('Animation not supported in this context'));
            return;
        }

        /** @type {?import('core').Timeout} */
        let timer = null;
        /** @type {?number} */
        let frameRequest = null;
        /**
         * @param {number} time
         */
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
            resolve({time: performance.now(), timeout: true});
        };

        // eslint-disable-next-line no-undef
        frameRequest = requestAnimationFrame(onFrame);
        if (typeof timeout === 'number') {
            timer = setTimeout(onTimeout, timeout);
        }
    });
}

/**
 * The following typedef is required because the JSDoc `implements` tag doesn't work with `import()`.
 * https://github.com/microsoft/TypeScript/issues/49905
 * @typedef {import('core').EventDispatcherOffGeneric} EventDispatcherOffGeneric
 */

/**
 * Base class controls basic event dispatching.
 * @template {import('core').EventSurface} TSurface
 * @implements {EventDispatcherOffGeneric}
 */
export class EventDispatcher {
    /**
     * Creates a new instance.
     */
    constructor() {
        /** @type {Map<import('core').EventNames<TSurface>, import('core').EventHandlerAny[]>} */
        this._eventMap = new Map();
    }

    /**
     * Triggers an event with the given name and specified argument.
     * @template {import('core').EventNames<TSurface>} TName
     * @param {TName} eventName The string representing the event's name.
     * @param {import('core').EventArgument<TSurface, TName>} details The argument passed to the callback functions.
     * @returns {boolean} `true` if any callbacks were registered, `false` otherwise.
     */
    trigger(eventName, details) {
        const callbacks = this._eventMap.get(eventName);
        if (typeof callbacks === 'undefined') { return false; }

        for (const callback of callbacks) {
            callback(details);
        }
        return true;
    }

    /**
     * Adds a single event listener to a specific event.
     * @template {import('core').EventNames<TSurface>} TName
     * @param {TName} eventName The string representing the event's name.
     * @param {import('core').EventHandler<TSurface, TName>} callback The event listener callback to add.
     */
    on(eventName, callback) {
        let callbacks = this._eventMap.get(eventName);
        if (typeof callbacks === 'undefined') {
            callbacks = [];
            this._eventMap.set(eventName, callbacks);
        }
        callbacks.push(callback);
    }

    /**
     * Removes a single event listener from a specific event.
     * @template {import('core').EventNames<TSurface>} TName
     * @param {TName} eventName The string representing the event's name.
     * @param {import('core').EventHandler<TSurface, TName>} callback The event listener callback to add.
     * @returns {boolean} `true` if the callback was removed, `false` otherwise.
     */
    off(eventName, callback) {
        const callbacks = this._eventMap.get(eventName);
        if (typeof callbacks === 'undefined') { return false; }

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

    /**
     * Checks if an event has any listeners.
     * @template {import('core').EventNames<TSurface>} TName
     * @param {TName} eventName The string representing the event's name.
     * @returns {boolean} `true` if the event has listeners, `false` otherwise.
     */
    hasListeners(eventName) {
        const callbacks = this._eventMap.get(eventName);
        return (typeof callbacks !== 'undefined' && callbacks.length > 0);
    }
}

/**
 * Class which stores event listeners added to various objects, making it easy to remove them in bulk.
 */
export class EventListenerCollection {
    /**
     * Creates a new instance.
     */
    constructor() {
        /** @type {import('event-listener-collection').EventListenerDetails[]} */
        this._eventListeners = [];
    }

    /**
     * Returns the number of event listeners that are currently in the object.
     * @type {number}
     */
    get size() {
        return this._eventListeners.length;
    }

    /**
     * Adds an event listener using `object.addEventListener`. The listener will later be removed using `object.removeEventListener`.
     * @param {import('event-listener-collection').EventTarget} target The object to add the event listener to.
     * @param {string} type The name of the event.
     * @param {EventListener | EventListenerObject | import('event-listener-collection').EventListenerFunction} listener The callback listener.
     * @param {AddEventListenerOptions | boolean} [options] Options for the event.
     */
    addEventListener(target, type, listener, options) {
        target.addEventListener(type, listener, options);
        this._eventListeners.push({type: 'removeEventListener', target, eventName: type, listener, options});
    }

    /**
     * Adds an event listener using `object.addListener`. The listener will later be removed using `object.removeListener`.
     * @template {import('event-listener-collection').EventListenerFunction} TCallback
     * @template [TArgs=unknown]
     * @param {import('event-listener-collection').ExtensionEvent<TCallback, TArgs>} target The object to add the event listener to.
     * @param {TCallback} callback The callback.
     * @param {TArgs[]} args The extra argument array passed to the `addListener`/`removeListener` function.
     */
    addListener(target, callback, ...args) {
        target.addListener(callback, ...args);
        this._eventListeners.push({type: 'removeListener', target, callback, args});
    }

    /**
     * Adds an event listener using `object.on`. The listener will later be removed using `object.off`.
     * @template {import('core').EventSurface} TSurface
     * @template {import('core').EventNames<TSurface>} TName
     * @param {EventDispatcher<TSurface>} target The object to add the event listener to.
     * @param {TName} eventName The string representing the event's name.
     * @param {import('core').EventHandler<TSurface, TName>} callback The event listener callback to add.
     */
    on(target, eventName, callback) {
        target.on(eventName, callback);
        this._eventListeners.push({type: 'off', eventName, target, callback});
    }

    /**
     * Removes all event listeners added to objects for this instance and clears the internal list of event listeners.
     */
    removeAllEventListeners() {
        if (this._eventListeners.length === 0) { return; }
        for (const item of this._eventListeners) {
            switch (item.type) {
                case 'removeEventListener':
                    item.target.removeEventListener(item.eventName, item.listener, item.options);
                    break;
                case 'removeListener':
                    item.target.removeListener(item.callback, ...item.args);
                    break;
                case 'off':
                    item.target.off(item.eventName, item.callback);
                    break;
            }
        }
        this._eventListeners = [];
    }
}

/**
 * Class representing a generic value with an override stack.
 * Changes can be observed by listening to the 'change' event.
 * @template [T=unknown]
 * @augments EventDispatcher<import('dynamic-property').Events<T>>
 */
export class DynamicProperty extends EventDispatcher {
    /**
     * Creates a new instance with the specified value.
     * @param {T} value The value to assign.
     */
    constructor(value) {
        super();
        /** @type {T} */
        this._value = value;
        /** @type {T} */
        this._defaultValue = value;
        /** @type {{value: T, priority: number, token: string}[]} */
        this._overrides = [];
    }

    /**
     * Gets the default value for the property, which is assigned to the
     * public value property when no overrides are present.
     * @type {T}
     */
    get defaultValue() {
        return this._defaultValue;
    }

    /**
     * Assigns the default value for the property. If no overrides are present
     * and if the value is different than the current default value,
     * the 'change' event will be triggered.
     * @param {T} value The value to assign.
     */
    set defaultValue(value) {
        this._defaultValue = value;
        if (this._overrides.length === 0) { this._updateValue(); }
    }

    /**
     * Gets the current value for the property, taking any overrides into account.
     * @type {T}
     */
    get value() {
        return this._value;
    }

    /**
     * Gets the number of overrides added to the property.
     * @type {number}
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
     * @param {T} value The override value to assign.
     * @param {number} [priority] The priority value to use, as a number.
     * @returns {import('core').TokenString} A string token which can be passed to the clearOverride function
     *   to remove the override.
     */
    setOverride(value, priority = 0) {
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
     * @param {import('core').TokenString} token The token for the corresponding override which is to be removed.
     * @returns {boolean} `true` if an override was returned, `false` otherwise.
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

/**
 * This class handles logging of messages to the console and triggering
 * an event for log calls.
 * @augments EventDispatcher<import('log').Events>
 */
export class Logger extends EventDispatcher {
    /**
     * Creates a new instance.
     */
    constructor() {
        super();
        /** @type {string} */
        this._extensionName = 'Yomitan';
        try {
            const {name, version} = chrome.runtime.getManifest();
            this._extensionName = `${name} ${version}`;
        } catch (e) {
            // NOP
        }
    }

    /**
     * Logs a generic error. This will trigger the 'log' event with the same arguments as the function invocation.
     * @param {unknown} error The error to log. This is typically an `Error` or `Error`-like object.
     * @param {import('log').LogLevel} level The level to log at. Values include `'info'`, `'debug'`, `'warn'`, and `'error'`.
     *   Other values will be logged at a non-error level.
     * @param {?import('log').LogContext} [context] An optional context object for the error which should typically include a `url` field.
     */
    log(error, level, context = null) {
        if (typeof context !== 'object' || context === null) {
            context = {url: location.href};
        }

        let errorString;
        try {
            if (typeof error === 'string') {
                errorString = error;
            } else {
                errorString = (
                    typeof error === 'object' && error !== null ?
                    error.toString() :
                    `${error}`
                );
                if (/^\[object \w+\]$/.test(errorString)) {
                    errorString = JSON.stringify(error);
                }
            }
        } catch (e) {
            errorString = `${error}`;
        }

        let errorStack;
        try {
            errorStack = (
                error instanceof Error ?
                (typeof error.stack === 'string' ? error.stack.trimEnd() : '') :
                ''
            );
        } catch (e) {
            errorStack = '';
        }

        let errorData;
        try {
            if (error instanceof ExtensionError) {
                errorData = error.data;
            }
        } catch (e) {
            // NOP
        }

        if (errorStack.startsWith(errorString)) {
            errorString = errorStack;
        } else if (errorStack.length > 0) {
            errorString += `\n${errorStack}`;
        }

        let message = `${this._extensionName} has encountered a problem.`;
        message += `\nOriginating URL: ${context.url}\n`;
        message += errorString;
        if (typeof errorData !== 'undefined') {
            message += `\nData: ${JSON.stringify(errorData, null, 4)}`;
        }
        message += '\n\nIssues can be reported at https://github.com/themoeway/yomitan/issues';

        /* eslint-disable no-console */
        switch (level) {
            case 'log': console.log(message); break;
            case 'info': console.info(message); break;
            case 'debug': console.debug(message); break;
            case 'warn': console.warn(message); break;
            case 'error': console.error(message); break;
        }
        /* eslint-enable no-console */

        this.trigger('log', {error, level, context});
    }

    /**
     * Logs a warning. This function invokes `log` internally.
     * @param {unknown} error The error to log. This is typically an `Error` or `Error`-like object.
     * @param {?import('log').LogContext} context An optional context object for the error which should typically include a `url` field.
     */
    warn(error, context = null) {
        this.log(error, 'warn', context);
    }

    /**
     * Logs an error. This function invokes `log` internally.
     * @param {unknown} error The error to log. This is typically an `Error` or `Error`-like object.
     * @param {?import('log').LogContext} context An optional context object for the error which should typically include a `url` field.
     */
    error(error, context = null) {
        this.log(error, 'error', context);
    }

    /**
     * @param {import('log').LogLevel} errorLevel
     * @returns {import('log').LogErrorLevelValue}
     */
    getLogErrorLevelValue(errorLevel) {
        switch (errorLevel) {
            case 'log':
            case 'info':
            case 'debug':
                return 0;
            case 'warn': return 1;
            case 'error': return 2;
        }
    }
}

/**
 * This object is the default logger used by the runtime.
 */
export const log = new Logger();
