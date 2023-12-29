/*
 * Copyright (C) 2023  Yomitan Authors
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

/* eslint-disable no-multi-spaces */

import {expect, test} from 'vitest';
import {CacheMap} from '../ext/js/general/cache-map.js';

/** */
function testConstructor() {
    test('constructor', () => {
        const data = [
            [false, () => new CacheMap(0)],
            [false, () => new CacheMap(1)],
            [false, () => new CacheMap(Number.MAX_VALUE)],
            [true,  () => new CacheMap(-1)],
            [true,  () => new CacheMap(1.5)],
            [true,  () => new CacheMap(Number.NaN)],
            [true,  () => new CacheMap(Number.POSITIVE_INFINITY)],
        ];

        for (const [throws, create] of data) {
            if (throws) {
                expect(create).toThrowError();
            } else {
                expect(create).not.toThrowError();
            }
        }
    });
}

/** */
function testApi() {
    test('api', () => {
        const data = [
            {
                maxSize: 1,
                expectedSize: 0,
                calls: []
            },
            {
                maxSize: 10,
                expectedSize: 1,
                calls: [
                    {func: 'get', args: ['a1-b-c'],     returnValue: void 0},
                    {func: 'has', args: ['a1-b-c'],     returnValue: false},
                    {func: 'set', args: ['a1-b-c', 32], returnValue: void 0},
                    {func: 'get', args: ['a1-b-c'],     returnValue: 32},
                    {func: 'has', args: ['a1-b-c'],     returnValue: true}
                ]
            },
            {
                maxSize: 10,
                expectedSize: 2,
                calls: [
                    {func: 'set', args: ['a1-b-c', 32], returnValue: void 0},
                    {func: 'get', args: ['a1-b-c'],     returnValue: 32},
                    {func: 'set', args: ['a1-b-c', 64], returnValue: void 0},
                    {func: 'get', args: ['a1-b-c'],     returnValue: 64},
                    {func: 'set', args: ['a2-b-c', 96], returnValue: void 0},
                    {func: 'get', args: ['a2-b-c'],     returnValue: 96}
                ]
            },
            {
                maxSize: 2,
                expectedSize: 2,
                calls: [
                    {func: 'has', args: ['a1-b-c'],    returnValue: false},
                    {func: 'has', args: ['a2-b-c'],    returnValue: false},
                    {func: 'has', args: ['a3-b-c'],    returnValue: false},
                    {func: 'set', args: ['a1-b-c', 1], returnValue: void 0},
                    {func: 'has', args: ['a1-b-c'],    returnValue: true},
                    {func: 'has', args: ['a2-b-c'],    returnValue: false},
                    {func: 'has', args: ['a3-b-c'],    returnValue: false},
                    {func: 'set', args: ['a2-b-c', 2], returnValue: void 0},
                    {func: 'has', args: ['a1-b-c'],    returnValue: true},
                    {func: 'has', args: ['a2-b-c'],    returnValue: true},
                    {func: 'has', args: ['a3-b-c'],    returnValue: false},
                    {func: 'set', args: ['a3-b-c', 3], returnValue: void 0},
                    {func: 'has', args: ['a1-b-c'],    returnValue: false},
                    {func: 'has', args: ['a2-b-c'],    returnValue: true},
                    {func: 'has', args: ['a3-b-c'],    returnValue: true}
                ]
            }
        ];

        for (const {maxSize, expectedSize, calls} of data) {
            const cache = new CacheMap(maxSize);
            expect(cache.maxSize).toStrictEqual(maxSize);
            for (const call of calls) {
                const {func, args} = call;
                let returnValue;
                switch (func) {
                    case 'get': returnValue = cache.get(args[0]); break;
                    case 'set': returnValue = cache.set(args[0], args[1]); break;
                    case 'has': returnValue = cache.has(args[0]); break;
                    case 'clear': returnValue = cache.clear(); break;
                }
                if (Object.prototype.hasOwnProperty.call(call, 'returnValue')) {
                    const {returnValue: expectedReturnValue} = call;
                    expect(returnValue).toStrictEqual(expectedReturnValue);
                }
            }
            expect(cache.size).toStrictEqual(expectedSize);
        }
    });
}


/** */
function main() {
    testConstructor();
    testApi();
}


main();
