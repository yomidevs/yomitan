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

import {describe, expect, test, vi} from 'vitest';
import {EventDispatcher} from '../ext/js/core/event-dispatcher.js';
import {ExtensionError} from '../ext/js/core/extension-error.js';
import {parseJson, readResponseJson} from '../ext/js/core/json.js';
import {toError} from '../ext/js/core/to-error.js';

describe('EventDispatcher', () => {
    test('handles listener lifecycle and trigger results', () => {
        const dispatcher = new EventDispatcher();
        const listener1 = vi.fn();
        const listener2 = vi.fn();
        const missingListener = vi.fn();

        expect(dispatcher.hasListeners('event')).toBe(false);
        expect(dispatcher.trigger('event', {count: 0})).toBe(false);
        expect(dispatcher.off('event', missingListener)).toBe(false);

        dispatcher.on('event', listener1);
        dispatcher.on('event', listener2);
        expect(dispatcher.hasListeners('event')).toBe(true);
        expect(dispatcher.trigger('event', {count: 1})).toBe(true);
        expect(listener1).toHaveBeenCalledWith({count: 1});
        expect(listener2).toHaveBeenCalledWith({count: 1});

        expect(dispatcher.off('event', missingListener)).toBe(false);
        expect(dispatcher.off('event', listener1)).toBe(true);
        expect(dispatcher.hasListeners('event')).toBe(true);
        expect(dispatcher.off('event', listener2)).toBe(true);
        expect(dispatcher.hasListeners('event')).toBe(false);
    });
});

describe('ExtensionError', () => {
    test('supports data payload and serializes ExtensionError details', () => {
        const error = new ExtensionError('failure');
        error.stack = 'ExtensionError: failure\nat test';
        error.data = {code: 42};
        expect(error.name).toBe('ExtensionError');
        expect(error.data).toStrictEqual({code: 42});
        expect(ExtensionError.serialize(error)).toStrictEqual({
            name: 'ExtensionError',
            message: 'failure',
            stack: 'ExtensionError: failure\nat test',
            data: {code: 42},
        });
    });

    test('serializes plain objects and falls back for non-objects/throws', () => {
        expect(ExtensionError.serialize({
            name: 'MyError',
            message: 'Oops',
            stack: 'at line 1',
        })).toStrictEqual({
            name: 'MyError',
            message: 'Oops',
            stack: 'at line 1',
        });

        expect(ExtensionError.serialize(123)).toStrictEqual({
            value: 123,
            hasValue: true,
        });

        expect(ExtensionError.serialize({
            name: 1,
            message: null,
            stack: {},
        })).toStrictEqual({
            name: '',
            message: '',
            stack: '',
        });

        const throwingValue = {};
        Object.defineProperty(throwingValue, 'name', {
            get() {
                throw new Error('getter failure');
            },
        });
        expect(ExtensionError.serialize(throwingValue)).toStrictEqual({
            value: throwingValue,
            hasValue: true,
        });
    });

    test('deserializes hasValue and structured error payloads', () => {
        const fromValue = ExtensionError.deserialize({value: 'boom', hasValue: true});
        expect(fromValue).toBeInstanceOf(ExtensionError);
        expect(fromValue.message).toBe('Error of type string: boom');

        const fromStructured = ExtensionError.deserialize({
            name: 'CustomError',
            message: 'structured',
            stack: 'stack line',
            data: {reason: 'test'},
        });
        expect(fromStructured).toBeInstanceOf(ExtensionError);
        expect(fromStructured.name).toBe('CustomError');
        expect(fromStructured.message).toBe('structured');
        expect(fromStructured.stack).toBe('stack line');
        expect(fromStructured.data).toStrictEqual({reason: 'test'});
    });
});

describe('toError', () => {
    test('returns existing Error instances and wraps non-errors', () => {
        const existing = new Error('existing');
        expect(toError(existing)).toBe(existing);

        expect(toError('x').message).toBe('x');
        expect(toError(123).message).toBe('123');
        expect(toError({k: 'v'}).message).toBe('[object Object]');
    });
});

describe('json helpers', () => {
    test('parseJson parses valid JSON and throws on invalid JSON', () => {
        expect(parseJson('{"a":1}')).toStrictEqual({a: 1});
        expect(() => parseJson('{')).toThrow();
    });

    test('readResponseJson proxies response.json', async () => {
        const response = {
            json: vi.fn(async () => ({ok: true})),
        };
        await expect(readResponseJson(/** @type {Response} */ (/** @type {unknown} */ (response))))
            .resolves
            .toStrictEqual({ok: true});

        const failingResponse = {
            json: vi.fn(async () => {
                throw new Error('json failed');
            }),
        };
        await expect(readResponseJson(/** @type {Response} */ (/** @type {unknown} */ (failingResponse))))
            .rejects
            .toThrow('json failed');
    });
});
