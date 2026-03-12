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
import {createApiMap, extendApiMap, getApiMapHandler, invokeApiMapHandler} from '../ext/js/core/api-map.js';
import {ExtensionError} from '../ext/js/core/extension-error.js';

const invokeApiHandler = /** @type {any} */ (invokeApiMapHandler);

describe('api-map', () => {
    test('createApiMap and getApiMapHandler return registered handlers', () => {
        const pingHandler = vi.fn(() => 'pong');
        const map = createApiMap([
            ['ping', pingHandler],
        ]);
        expect(map).toBeInstanceOf(Map);
        expect(getApiMapHandler(map, 'ping')).toBe(pingHandler);
        expect(getApiMapHandler(map, 'missing')).toBeUndefined();
    });

    test('extendApiMap adds handlers and rejects duplicates', () => {
        const map = createApiMap([
            ['first', () => 'first'],
        ]);
        const secondHandler = vi.fn(() => 'second');
        extendApiMap(map, [['second', secondHandler]]);
        expect(getApiMapHandler(map, 'second')).toBe(secondHandler);

        expect(() => extendApiMap(map, [['first', () => 'duplicate']]))
            .toThrow('The handler for first has already been registered');
    });

    test('invokeApiMapHandler returns false for missing handlers and tolerates handlerNotFoundCallback errors', () => {
        const map = /** @type {any} */ (createApiMap([]));
        const callback = vi.fn();
        const handlerNotFoundCallback = vi.fn(() => {
            throw new Error('expected callback error');
        });

        expect(invokeApiHandler(map, 'missing', {}, [], callback)).toBe(false);
        expect(callback).not.toHaveBeenCalled();

        expect(invokeApiHandler(map, 'missing', {}, [], callback, handlerNotFoundCallback)).toBe(false);
        expect(handlerNotFoundCallback).toHaveBeenCalledTimes(1);
        expect(callback).not.toHaveBeenCalled();
    });

    test('invokeApiMapHandler handles synchronous handler results', () => {
        const handler = vi.fn((params, extra) => `${params}-${extra}`);
        const map = /** @type {any} */ (createApiMap([['sync', handler]]));
        const callback = vi.fn();

        const isAsync = invokeApiHandler(map, 'sync', 'p', ['x'], callback);
        expect(isAsync).toBe(false);
        expect(handler).toHaveBeenCalledWith('p', 'x');
        expect(callback).toHaveBeenCalledWith({result: 'p-x'});
    });

    test('invokeApiMapHandler serializes synchronous handler errors', () => {
        const error = new Error('sync failure');
        error.name = 'SyncFailure';
        error.stack = 'SyncFailure: sync failure\nat test';
        const map = /** @type {any} */ (createApiMap([['throw-sync', () => {
            throw error;
        }]]));
        const callback = vi.fn();

        const isAsync = invokeApiHandler(map, 'throw-sync', {}, [], callback);
        expect(isAsync).toBe(false);
        expect(callback).toHaveBeenCalledWith({error: ExtensionError.serialize(error)});
    });

    test('invokeApiMapHandler handles asynchronous handler resolution', async () => {
        const asyncHandler = vi.fn(async () => ({ok: true}));
        const map = /** @type {any} */ (createApiMap([['async-ok', asyncHandler]]));
        const callback = vi.fn();

        const isAsync = invokeApiHandler(map, 'async-ok', 'p', ['x'], callback);
        expect(isAsync).toBe(true);
        expect(callback).not.toHaveBeenCalled();

        await Promise.resolve();
        await Promise.resolve();

        expect(callback).toHaveBeenCalledWith({result: {ok: true}});
    });

    test('invokeApiMapHandler serializes asynchronous handler rejections', async () => {
        const extensionError = new ExtensionError('async failure');
        extensionError.data = {code: 42};
        const map = /** @type {any} */ (createApiMap([['async-fail', async () => {
            throw extensionError;
        }]]));
        const callback = vi.fn();

        const isAsync = invokeApiHandler(map, 'async-fail', {}, [], callback);
        expect(isAsync).toBe(true);

        await Promise.resolve();
        await Promise.resolve();

        expect(callback).toHaveBeenCalledWith({error: ExtensionError.serialize(extensionError)});
    });

    test('invokeApiMapHandler serializes non-error asynchronous rejection values', async () => {
        const map = /** @type {any} */ (createApiMap([['async-fail-value', () => Promise.reject('reject-value')]]));
        const callback = vi.fn();

        const isAsync = invokeApiHandler(map, 'async-fail-value', {}, [], callback);
        expect(isAsync).toBe(true);

        await Promise.resolve();
        await Promise.resolve();

        expect(callback).toHaveBeenCalledWith({error: {value: 'reject-value', hasValue: true}});
    });
});
