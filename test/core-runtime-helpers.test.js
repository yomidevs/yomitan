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

import {afterEach, describe, expect, test, vi} from 'vitest';
import {EventDispatcher} from '../ext/js/core/event-dispatcher.js';
import {EventListenerCollection} from '../ext/js/core/event-listener-collection.js';
import {fetchJson, fetchText} from '../ext/js/core/fetch-utilities.js';
import {log} from '../ext/js/core/log.js';
import {isObject, isObjectNotArray} from '../ext/js/core/object-utilities.js';
import {promiseAnimationFrame} from '../ext/js/core/promise-animation-frame.js';
import {safePerformance} from '../ext/js/core/safe-performance.js';

/** @type {Array<() => void>} */
const restoreGlobals = [];

/**
 * @param {string} name
 * @param {unknown} value
 */
function setGlobalValue(name, value) {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, {
        configurable: true,
        writable: true,
        value,
    });
    restoreGlobals.push(() => {
        if (typeof descriptor !== 'undefined') {
            Object.defineProperty(globalThis, name, descriptor);
        } else {
            Reflect.deleteProperty(globalThis, name);
        }
    });
}

afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    while (restoreGlobals.length > 0) {
        const restore = restoreGlobals.pop();
        if (typeof restore === 'function') {
            restore();
        }
    }
});

describe('EventListenerCollection', () => {
    test('tracks listeners added by all supported registration methods and removes them in bulk', () => {
        const collection = new EventListenerCollection();
        const options = {passive: true};
        const eventCallback = vi.fn();
        const domTarget = {
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        };
        const extensionCallback = vi.fn();
        const extensionTarget = {
            addListener: vi.fn(),
            removeListener: vi.fn(),
        };
        const dispatcher = new EventDispatcher();

        collection.addEventListener(domTarget, 'click', eventCallback, options);
        collection.addListener(extensionTarget, extensionCallback, 'extra', 2);
        collection.on(dispatcher, 'event', eventCallback);

        expect(collection.size).toBe(3);
        expect(dispatcher.hasListeners('event')).toBe(true);

        collection.removeAllEventListeners();

        expect(domTarget.removeEventListener).toHaveBeenCalledWith('click', eventCallback, options);
        expect(extensionTarget.removeListener).toHaveBeenCalledWith(extensionCallback, 'extra', 2);
        expect(dispatcher.hasListeners('event')).toBe(false);
        expect(collection.size).toBe(0);
    });

    test('removeAllEventListeners is a no-op when no listeners were added', () => {
        const collection = new EventListenerCollection();
        expect(collection.size).toBe(0);
        collection.removeAllEventListeners();
        expect(collection.size).toBe(0);
    });
});

describe('object-utilities', () => {
    test('isObject and isObjectNotArray handle object-like values correctly', () => {
        expect(isObject({})).toBe(true);
        expect(isObject([])).toBe(true);
        expect(isObject(null)).toBe(false);
        expect(isObject('x')).toBe(false);

        expect(isObjectNotArray({})).toBe(true);
        expect(isObjectNotArray([])).toBe(false);
        expect(isObjectNotArray(null)).toBe(false);
        expect(isObjectNotArray(1)).toBe(false);
    });
});

describe('safePerformance', () => {
    test('mark/measure delegate to performance methods and now returns performance.now', () => {
        /** @type {PerformanceMark} */
        const markResult = /** @type {PerformanceMark} */ ({name: 'mark'});
        /** @type {PerformanceMeasure} */
        const measureResult = /** @type {PerformanceMeasure} */ ({name: 'measure'});
        const markSpy = vi.spyOn(performance, 'mark').mockReturnValue(markResult);
        const measureSpy = vi.spyOn(performance, 'measure').mockReturnValue(measureResult);
        const nowSpy = vi.spyOn(performance, 'now').mockReturnValue(123);

        expect(safePerformance.mark('m')).toBe(markResult);
        expect(safePerformance.measure('measure')).toBe(measureResult);
        expect(safePerformance.now()).toBe(123);

        expect(markSpy).toHaveBeenCalledWith('m', void 0);
        expect(measureSpy).toHaveBeenCalledWith('measure', void 0, void 0);
        expect(nowSpy).toHaveBeenCalledTimes(1);
    });

    test('mark/measure return undefined and log when performance throws', () => {
        const markError = new Error('mark failed');
        const measureError = new Error('measure failed');
        vi.spyOn(performance, 'mark').mockImplementation(() => {
            throw markError;
        });
        vi.spyOn(performance, 'measure').mockImplementation(() => {
            throw measureError;
        });
        const logErrorSpy = vi.spyOn(log, 'error').mockImplementation(() => {});

        expect(safePerformance.mark('m')).toBeUndefined();
        expect(safePerformance.measure('measure')).toBeUndefined();
        expect(logErrorSpy).toHaveBeenCalledWith(markError);
        expect(logErrorSpy).toHaveBeenCalledWith(measureError);
    });
});

describe('promiseAnimationFrame', () => {
    test('rejects when animation APIs are unavailable', async () => {
        setGlobalValue('requestAnimationFrame', void 0);
        setGlobalValue('cancelAnimationFrame', void 0);
        await expect(promiseAnimationFrame()).rejects.toThrow('Animation not supported in this context');
    });

    test('resolves on animation frame callback', async () => {
        /** @type {(time: number) => void} */
        let onFrame = () => {};
        /**
         * @param {(time: number) => void} callback
         * @returns {number}
         */
        const requestAnimationFrameImplementation = (callback) => {
            onFrame = callback;
            return 7;
        };
        const requestAnimationFrameMock = vi.fn(requestAnimationFrameImplementation);
        const cancelAnimationFrameMock = vi.fn();
        setGlobalValue('requestAnimationFrame', requestAnimationFrameMock);
        setGlobalValue('cancelAnimationFrame', cancelAnimationFrameMock);

        const promise = promiseAnimationFrame();
        onFrame(321);

        await expect(promise).resolves.toStrictEqual({time: 321, timeout: false});
        expect(cancelAnimationFrameMock).not.toHaveBeenCalled();
    });

    test('resolves on frame and clears timeout when timeout is configured', async () => {
        vi.useFakeTimers();
        /** @type {(time: number) => void} */
        let onFrame = () => {};
        /**
         * @param {(time: number) => void} callback
         * @returns {number}
         */
        const requestAnimationFrameImplementation = (callback) => {
            onFrame = callback;
            return 8;
        };
        const requestAnimationFrameMock = vi.fn(requestAnimationFrameImplementation);
        const cancelAnimationFrameMock = vi.fn();
        setGlobalValue('requestAnimationFrame', requestAnimationFrameMock);
        setGlobalValue('cancelAnimationFrame', cancelAnimationFrameMock);
        const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');

        const promise = promiseAnimationFrame(20);
        onFrame(222);
        await expect(promise).resolves.toStrictEqual({time: 222, timeout: false});
        expect(clearTimeoutSpy).toHaveBeenCalledTimes(1);
        expect(cancelAnimationFrameMock).not.toHaveBeenCalled();
    });

    test('resolves by timeout and cancels pending animation frame request', async () => {
        vi.useFakeTimers();
        const requestAnimationFrameMock = vi.fn(() => 12);
        const cancelAnimationFrameMock = vi.fn();
        setGlobalValue('requestAnimationFrame', requestAnimationFrameMock);
        setGlobalValue('cancelAnimationFrame', cancelAnimationFrameMock);
        vi.spyOn(safePerformance, 'now').mockReturnValue(456);

        const promise = promiseAnimationFrame(10);
        await vi.advanceTimersByTimeAsync(10);

        await expect(promise).resolves.toStrictEqual({time: 456, timeout: true});
        expect(cancelAnimationFrameMock).toHaveBeenCalledWith(12);
    });
});

describe('fetch-utilities', () => {
    test('fetchText requests extension asset text and returns response text', async () => {
        const runtimeGetURLMock = vi.fn((url) => `chrome-extension://id/${url}`);
        setGlobalValue('chrome', {runtime: {getURL: runtimeGetURLMock}});
        const textMock = vi.fn(async () => 'asset-content');
        const fetchMock = vi.fn(async () => ({
            ok: true,
            text: textMock,
        }));
        setGlobalValue('fetch', fetchMock);

        await expect(fetchText('data/file.txt')).resolves.toBe('asset-content');
        expect(runtimeGetURLMock).toHaveBeenCalledWith('data/file.txt');
        expect(fetchMock).toHaveBeenCalledWith('chrome-extension://id/data/file.txt', {
            method: 'GET',
            mode: 'no-cors',
            cache: 'default',
            credentials: 'omit',
            redirect: 'follow',
            referrerPolicy: 'no-referrer',
        });
        expect(textMock).toHaveBeenCalledTimes(1);
    });

    test('fetchJson returns parsed response JSON and throws on non-ok responses', async () => {
        const runtimeGetURLMock = vi.fn((url) => `chrome-extension://id/${url}`);
        setGlobalValue('chrome', {runtime: {getURL: runtimeGetURLMock}});
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce({
                ok: true,
                json: vi.fn(async () => ({ok: true})),
            })
            .mockResolvedValueOnce({
                ok: false,
                status: 404,
            });
        setGlobalValue('fetch', fetchMock);

        await expect(fetchJson('data/file.json')).resolves.toStrictEqual({ok: true});
        await expect(fetchText('missing.txt')).rejects.toThrow('Failed to fetch missing.txt: 404');
        expect(runtimeGetURLMock).toHaveBeenCalledWith('data/file.json');
        expect(runtimeGetURLMock).toHaveBeenCalledWith('missing.txt');
    });
});
