/*
 * Copyright (C) 2020-2021  Yomichan Authors
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

const assert = require('assert');
const {testMain} = require('../dev/util');
const {VM} = require('../dev/vm');

const vm = new VM({console});
vm.execute([
    'mixed/js/cache-map.js'
]);
const CacheMap = vm.get('CacheMap');


function testConstructor() {
    const data = [
        [false, () => new CacheMap(0, () => null)],
        [false, () => new CacheMap(1, () => null)],
        [false, () => new CacheMap(Number.MAX_VALUE, () => null)],
        [true,  () => new CacheMap(-1, () => null)],
        [true,  () => new CacheMap(1.5, () => null)],
        [true,  () => new CacheMap(Number.NaN, () => null)],
        [true,  () => new CacheMap(Number.POSITIVE_INFINITY, () => null)],
        [true,  () => new CacheMap('a', () => null)]
    ];

    for (const [throws, create] of data) {
        if (throws) {
            assert.throws(create);
        } else {
            assert.doesNotThrow(create);
        }
    }
}

function testApi() {
    const data = [
        {
            maxCount: 1,
            expectedCount: 0,
            calls: []
        },
        {
            maxCount: 1,
            expectedCount: 1,
            calls: [
                {func: 'getOrCreate', args: [['a', 'b', 'c']]}
            ]
        },
        {
            maxCount: 10,
            expectedCount: 1,
            calls: [
                {func: 'getOrCreate', args: [['a', 'b', 'c']]},
                {func: 'getOrCreate', args: [['a', 'b', 'c']]},
                {func: 'getOrCreate', args: [['a', 'b', 'c']]}
            ]
        },
        {
            maxCount: 10,
            expectedCount: 3,
            calls: [
                {func: 'getOrCreate', args: [['a1', 'b', 'c']]},
                {func: 'getOrCreate', args: [['a2', 'b', 'c']]},
                {func: 'getOrCreate', args: [['a3', 'b', 'c']]}
            ]
        },
        {
            maxCount: 10,
            expectedCount: 3,
            calls: [
                {func: 'getOrCreate', args: [['a', 'b1', 'c']]},
                {func: 'getOrCreate', args: [['a', 'b2', 'c']]},
                {func: 'getOrCreate', args: [['a', 'b3', 'c']]}
            ]
        },
        {
            maxCount: 10,
            expectedCount: 3,
            calls: [
                {func: 'getOrCreate', args: [['a', 'b', 'c1']]},
                {func: 'getOrCreate', args: [['a', 'b', 'c2']]},
                {func: 'getOrCreate', args: [['a', 'b', 'c3']]}
            ]
        },
        {
            maxCount: 1,
            expectedCount: 1,
            calls: [
                {func: 'getOrCreate', args: [['a1', 'b', 'c']]},
                {func: 'getOrCreate', args: [['a2', 'b', 'c']]},
                {func: 'getOrCreate', args: [['a3', 'b', 'c']]}
            ]
        },
        {
            maxCount: 1,
            expectedCount: 1,
            calls: [
                {func: 'getOrCreate', args: [['a', 'b1', 'c']]},
                {func: 'getOrCreate', args: [['a', 'b2', 'c']]},
                {func: 'getOrCreate', args: [['a', 'b3', 'c']]}
            ]
        },
        {
            maxCount: 1,
            expectedCount: 1,
            calls: [
                {func: 'getOrCreate', args: [['a', 'b', 'c1']]},
                {func: 'getOrCreate', args: [['a', 'b', 'c2']]},
                {func: 'getOrCreate', args: [['a', 'b', 'c3']]}
            ]
        },
        {
            maxCount: 10,
            expectedCount: 0,
            calls: [
                {func: 'getOrCreate', args: [['a', 'b', 'c1']]},
                {func: 'getOrCreate', args: [['a', 'b', 'c2']]},
                {func: 'getOrCreate', args: [['a', 'b', 'c3']]},
                {func: 'clear', args: []}
            ]
        },
        {
            maxCount: 0,
            expectedCount: 0,
            calls: [
                {func: 'getOrCreate', args: [['a1', 'b', 'c']]},
                {func: 'getOrCreate', args: [['a', 'b2', 'c']]},
                {func: 'getOrCreate', args: [['a', 'b', 'c3']]}
            ]
        },
        {
            maxCount: 10,
            expectedCount: 1,
            calls: [
                {func: 'get', args: [['a1', 'b', 'c']], returnValue: void 0},
                {func: 'has', args: [['a1', 'b', 'c']], returnValue: false},
                {func: 'set', args: [['a1', 'b', 'c'], 32], returnValue: void 0},
                {func: 'get', args: [['a1', 'b', 'c']], returnValue: 32},
                {func: 'has', args: [['a1', 'b', 'c']], returnValue: true}
            ]
        },
        {
            maxCount: 10,
            expectedCount: 2,
            calls: [
                {func: 'set', args: [['a1', 'b', 'c'], 32], returnValue: void 0},
                {func: 'get', args: [['a1', 'b', 'c']], returnValue: 32},
                {func: 'set', args: [['a1', 'b', 'c'], 64], returnValue: void 0},
                {func: 'get', args: [['a1', 'b', 'c']], returnValue: 64},
                {func: 'set', args: [['a2', 'b', 'c'], 96], returnValue: void 0},
                {func: 'get', args: [['a2', 'b', 'c']], returnValue: 96}
            ]
        },
        {
            maxCount: 2,
            expectedCount: 2,
            calls: [
                {func: 'has', args: [['a1', 'b', 'c']], returnValue: false},
                {func: 'has', args: [['a2', 'b', 'c']], returnValue: false},
                {func: 'has', args: [['a3', 'b', 'c']], returnValue: false},
                {func: 'set', args: [['a1', 'b', 'c'], 1], returnValue: void 0},
                {func: 'has', args: [['a1', 'b', 'c']], returnValue: true},
                {func: 'has', args: [['a2', 'b', 'c']], returnValue: false},
                {func: 'has', args: [['a3', 'b', 'c']], returnValue: false},
                {func: 'set', args: [['a2', 'b', 'c'], 2], returnValue: void 0},
                {func: 'has', args: [['a1', 'b', 'c']], returnValue: true},
                {func: 'has', args: [['a2', 'b', 'c']], returnValue: true},
                {func: 'has', args: [['a3', 'b', 'c']], returnValue: false},
                {func: 'set', args: [['a3', 'b', 'c'], 3], returnValue: void 0},
                {func: 'has', args: [['a1', 'b', 'c']], returnValue: false},
                {func: 'has', args: [['a2', 'b', 'c']], returnValue: true},
                {func: 'has', args: [['a3', 'b', 'c']], returnValue: true}
            ]
        }
    ];

    const create = (args) => args.join(',');
    for (const {maxCount, expectedCount, calls} of data) {
        const cache = new CacheMap(maxCount, create);
        assert.strictEqual(cache.maxCount, maxCount);
        for (const call of calls) {
            const {func, args} = call;
            let returnValue;
            switch (func) {
                case 'get': returnValue = cache.get(...args); break;
                case 'getOrCreate': returnValue = cache.getOrCreate(...args); break;
                case 'set': returnValue = cache.set(...args); break;
                case 'has': returnValue = cache.has(...args); break;
                case 'clear': returnValue = cache.clear(...args); break;
            }
            if (Object.prototype.hasOwnProperty.call(call, 'returnValue')) {
                const {returnValue: expectedReturnValue} = call;
                assert.deepStrictEqual(returnValue, expectedReturnValue);
            }
        }
        assert.strictEqual(cache.count, expectedCount);
    }
}


function main() {
    testConstructor();
    testApi();
}


if (require.main === module) { testMain(main); }
