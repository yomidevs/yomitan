/*
 * Copyright (C) 2026  Yomitan Authors
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

const {Offscreen} = await import('../ext/js/background/offscreen.js');
const {ExtensionError} = await import('../ext/js/core/extension-error.js');
const {log} = await import('../ext/js/core/log.js');

afterEach(() => {
    vi.restoreAllMocks();
});

/**
 * @param {string} name
 * @returns {(this: unknown, ...args: unknown[]) => unknown}
 * @throws {Error}
 */
function getOffscreenMethod(name) {
    const method = Reflect.get(Offscreen.prototype, name);
    if (typeof method !== 'function') {
        throw new Error(`Expected ${name} method`);
    }
    return method;
}

describe('Offscreen dictionary worker failures', () => {
    test('dictionary worker errors reject all pending responses', async () => {
        vi.spyOn(log, 'error').mockImplementation(() => {});

        const responseHandlers = new Map();
        const promise1 = new Promise((resolve, reject) => {
            responseHandlers.set(1, {resolve, reject});
        });
        const promise2 = new Promise((resolve, reject) => {
            responseHandlers.set(2, {resolve, reject});
        });
        const context = {
            _dictionaryWorkerResponseHandlers: responseHandlers,
            _rejectPendingDictionaryWorkerResponses: getOffscreenMethod('_rejectPendingDictionaryWorkerResponses'),
        };

        getOffscreenMethod('_onDictionaryWorkerError').call(context, {
            filename: 'worker.js',
            lineno: 12,
            colno: 34,
            message: 'boom',
        });

        const results = await Promise.allSettled([promise1, promise2]);

        expect(responseHandlers.size).toBe(0);
        expect(results).toHaveLength(2);
        for (const result of results) {
            expect(result.status).toBe('rejected');
            if (result.status !== 'rejected') {
                continue;
            }
            expect(result.reason).toBeInstanceOf(ExtensionError);
            expect(result.reason.message).toBe('Offscreen: Dictionary worker terminated with an error');
            expect(result.reason.data).toStrictEqual({
                filename: 'worker.js',
                lineno: 12,
                colno: 34,
                message: 'boom',
            });
        }
        expect(results[0].status).toBe('rejected');
        expect(results[1].status).toBe('rejected');
        if (results[0].status === 'rejected' && results[1].status === 'rejected') {
            expect(results[1].reason).toBe(results[0].reason);
        }
    });
});
