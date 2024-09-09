/*
 * Copyright (C) 2023-2024  Yomitan Authors
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

import {describe, expect, test} from 'vitest';
import {CacheMap} from '../ext/js/general/cache-map.js';

describe('CacheMap', () => {
    describe('constructor', () => {
        const shouldThrow = [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY];
        const shouldNotThrow = [0, 1, Number.MAX_VALUE];

        test.each(shouldNotThrow)('`() => new CacheMap(%d)` should not throw', (param) => {
            expect(() => new CacheMap(param)).not.toThrowError();
        });
        test.each(shouldThrow)('`() => new CacheMap(%d)` should throw', (param) => {
            expect(() => new CacheMap(param)).toThrowError();
        });
    });

    describe('api', () => {
        /* eslint-disable @stylistic/no-multi-spaces */
        const data = [
            {
                calls: [],
                expectedSize: 0,
                maxSize: 1,
            },
            {
                calls: [
                    {args: ['a1-b-c'], func: 'get',     returnValue: void 0},
                    {args: ['a1-b-c'], func: 'has',     returnValue: false},
                    {args: ['a1-b-c', 32], func: 'set', returnValue: void 0},
                    {args: ['a1-b-c'], func: 'get',     returnValue: 32},
                    {args: ['a1-b-c'], func: 'has',     returnValue: true},
                ],
                expectedSize: 1,
                maxSize: 10,
            },
            {
                calls: [
                    {args: ['a1-b-c', 32], func: 'set', returnValue: void 0},
                    {args: ['a1-b-c'], func: 'get',     returnValue: 32},
                    {args: ['a1-b-c', 64], func: 'set', returnValue: void 0},
                    {args: ['a1-b-c'], func: 'get',     returnValue: 64},
                    {args: ['a2-b-c', 96], func: 'set', returnValue: void 0},
                    {args: ['a2-b-c'], func: 'get',     returnValue: 96},
                ],
                expectedSize: 2,
                maxSize: 10,
            },
            {
                calls: [
                    {args: ['a1-b-c'], func: 'has',    returnValue: false},
                    {args: ['a2-b-c'], func: 'has',    returnValue: false},
                    {args: ['a3-b-c'], func: 'has',    returnValue: false},
                    {args: ['a1-b-c', 1], func: 'set', returnValue: void 0},
                    {args: ['a1-b-c'], func: 'has',    returnValue: true},
                    {args: ['a2-b-c'], func: 'has',    returnValue: false},
                    {args: ['a3-b-c'], func: 'has',    returnValue: false},
                    {args: ['a2-b-c', 2], func: 'set', returnValue: void 0},
                    {args: ['a1-b-c'], func: 'has',    returnValue: true},
                    {args: ['a2-b-c'], func: 'has',    returnValue: true},
                    {args: ['a3-b-c'], func: 'has',    returnValue: false},
                    {args: ['a3-b-c', 3], func: 'set', returnValue: void 0},
                    {args: ['a1-b-c'], func: 'has',    returnValue: false},
                    {args: ['a2-b-c'], func: 'has',    returnValue: true},
                    {args: ['a3-b-c'], func: 'has',    returnValue: true},
                ],
                expectedSize: 2,
                maxSize: 2,
            },
        ];
        /* eslint-enable @stylistic/no-multi-spaces */

        test.each(data)('api-test-%#', ({calls, expectedSize, maxSize}) => {
            const cache = new CacheMap(maxSize);
            expect(cache.maxSize).toStrictEqual(maxSize);
            for (const call of calls) {
                const {args, func} = call;
                let returnValue;
                switch (func) {
                    case 'clear': returnValue = cache.clear(); break;
                    case 'get': returnValue = cache.get(args[0]); break;
                    case 'has': returnValue = cache.has(args[0]); break;
                    case 'set': returnValue = cache.set(args[0], args[1]); break;
                }
                if (Object.prototype.hasOwnProperty.call(call, 'returnValue')) {
                    const {returnValue: expectedReturnValue} = call;
                    expect(returnValue).toStrictEqual(expectedReturnValue);
                }
            }
            expect(cache.size).toStrictEqual(expectedSize);
        });
    });
});
