/*
 * Copyright (C) 2023-2025  Yomitan Authors
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

import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';
import {ExtensionError} from '../ext/js/core/extension-error.js';
import {log} from '../ext/js/core/log.js';

/**
 * @param {{mock: {calls: unknown[][]}}} spy
 * @returns {string}
 */
function getFirstMessage(spy) {
    const value = spy.mock.calls[0]?.[0];
    switch (typeof value) {
        case 'string':
            return value;
        case 'number':
        case 'boolean':
        case 'bigint':
            return String(value);
        case 'undefined':
            return '';
        case 'object':
            if (value === null) {
                return '';
            }
            try {
                const serialized = JSON.stringify(value);
                return typeof serialized === 'string' ? serialized : '';
            } catch (error) {
                return '';
            }
        default:
            return '';
    }
}

describe('log', () => {
    /** @type {string} */
    let originalExtensionName;
    /** @type {string|null} */
    let originalIssueUrl;

    beforeEach(() => {
        originalExtensionName = /** @type {string} */ (Reflect.get(log, '_extensionName'));
        originalIssueUrl = /** @type {string|null} */ (Reflect.get(log, '_issueUrl'));
        log.configure('Extension');
        Reflect.set(log, '_issueUrl', 'https://github.com/yomidevs/yomitan/issues');
    });

    afterEach(() => {
        log.configure(originalExtensionName);
        Reflect.set(log, '_issueUrl', originalIssueUrl);
        vi.restoreAllMocks();
    });

    test('warn logs string errors with unknown URL context and emits events', () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const listener = vi.fn();
        log.on('logGenericError', listener);

        log.warn('warning payload');

        expect(warnSpy).toHaveBeenCalledTimes(1);
        const message = getFirstMessage(warnSpy);
        expect(message).toContain('Extension has encountered a problem.');
        expect(message).toContain('Originating URL: unknown');
        expect(message).toContain('warning payload');
        expect(message).toContain('Issues can be reported at https://github.com/yomidevs/yomitan/issues');

        expect(listener).toHaveBeenCalledTimes(1);
        expect(listener).toHaveBeenCalledWith({
            error: 'warning payload',
            level: 'warn',
            context: {url: 'unknown'},
        });
        log.off('logGenericError', listener);
    });

    test('error logs ExtensionError stack/data details', () => {
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const listener = vi.fn();
        log.on('logGenericError', listener);
        const error = new ExtensionError('test extension error');
        error.stack = 'ExtensionError: test extension error\nat test';
        error.data = {status: 'failed'};

        log.error(error);

        expect(errorSpy).toHaveBeenCalledTimes(1);
        const message = getFirstMessage(errorSpy);
        expect(message).toContain('Originating URL: unknown');
        expect(message).toContain('ExtensionError: test extension error');
        expect(message).toContain('Data: {\n    "status": "failed"\n}');

        expect(listener).toHaveBeenCalledTimes(1);
        expect(listener).toHaveBeenCalledWith({
            error,
            level: 'error',
            context: {url: 'unknown'},
        });
        log.off('logGenericError', listener);
    });

    test('logGenericError stringifies plain objects and can omit issue URL', () => {
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        Reflect.set(log, '_issueUrl', null);
        const error = {reason: 'plain-object'};
        const context = {url: 'https://example.test/path'};

        log.logGenericError(error, 'log', context);

        expect(logSpy).toHaveBeenCalledTimes(1);
        const message = getFirstMessage(logSpy);
        expect(message).toContain('Originating URL: https://example.test/path');
        expect(message).toContain('{"reason":"plain-object"}');
        expect(message).not.toContain('Issues can be reported at');
    });

    test('logGenericError appends stack when it does not start with the error string', () => {
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const error = new Error('base');
        error.stack = 'Stack header\nat frame';

        log.logGenericError(error, 'error', {url: 'https://example.test/stack'});

        expect(errorSpy).toHaveBeenCalledTimes(1);
        const message = getFirstMessage(errorSpy);
        expect(message).toContain('Error: base\nStack header\nat frame');
    });

    test('configure updates extension name used in messages', () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        log.configure('Manabitan');

        log.warn('configured logger message');

        expect(warnSpy).toHaveBeenCalledTimes(1);
        const message = getFirstMessage(warnSpy);
        expect(message).toContain('Manabitan has encountered a problem.');
    });

    test('log() forwards message and optional params to console.log', () => {
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        log.log('base', {count: 1}, 2);
        expect(logSpy).toHaveBeenCalledTimes(1);
        expect(logSpy).toHaveBeenCalledWith('base', {count: 1}, 2);
    });

    test('logGenericError handles non-object errors through template-string fallback', () => {
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        log.logGenericError(123, 'log', {url: 'https://example.test/number'});
        const message = getFirstMessage(logSpy);
        expect(message).toContain('Originating URL: https://example.test/number');
        expect(message).toContain('\n123');
    });

    test('logGenericError recovers when error.toString throws on first access', () => {
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        const throwingToStringError = {
            toStringCalled: false,
            toString() {
                if (!this.toStringCalled) {
                    this.toStringCalled = true;
                    throw new Error('first toString failure');
                }
                return 'recovered toString';
            },
        };

        log.logGenericError(throwingToStringError, 'log', {url: 'https://example.test/to-string'});
        const message = getFirstMessage(logSpy);
        expect(message).toContain('recovered toString');
    });

    test('logGenericError handles stack/data getter failures without throwing', () => {
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const extensionError = new ExtensionError('stack/data edge');
        Object.defineProperty(extensionError, 'stack', {
            configurable: true,
            get() {
                throw new Error('stack read failed');
            },
        });
        Object.defineProperty(extensionError, 'data', {
            configurable: true,
            get() {
                throw new Error('data read failed');
            },
        });

        expect(() => log.logGenericError(extensionError, 'error', {url: 'https://example.test/getter-failure'})).not.toThrow();
        const message = getFirstMessage(errorSpy);
        expect(message).toContain('Originating URL: https://example.test/getter-failure');
        expect(message).toContain('ExtensionError: stack/data edge');
    });

    test('logGenericError uses location.href when context is omitted and location is available', () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'location');
        Object.defineProperty(globalThis, 'location', {
            configurable: true,
            value: {href: 'https://example.test/from-location'},
        });
        try {
            log.warn('with-location');
            const message = getFirstMessage(warnSpy);
            expect(message).toContain('Originating URL: https://example.test/from-location');
        } finally {
            if (typeof originalDescriptor !== 'undefined') {
                Object.defineProperty(globalThis, 'location', originalDescriptor);
            } else {
                Reflect.deleteProperty(globalThis, 'location');
            }
        }
    });

    test('logGenericError handles Error values with non-string stack', () => {
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const error = new Error('non-string stack');
        Object.defineProperty(error, 'stack', {
            configurable: true,
            value: 123,
        });
        log.logGenericError(error, 'error', {url: 'https://example.test/non-string-stack'});
        const message = getFirstMessage(errorSpy);
        expect(message).toContain('Error: non-string stack');
        expect(message).not.toContain('\n123');
    });
});
