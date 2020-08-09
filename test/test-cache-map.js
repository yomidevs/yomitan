/*
 * Copyright (C) 2020  Yomichan Authors
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
const {VM} = require('./yomichan-vm');

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
                ['get', 'a', 'b', 'c']
            ]
        },
        {
            maxCount: 10,
            expectedCount: 1,
            calls: [
                ['get', 'a', 'b', 'c'],
                ['get', 'a', 'b', 'c'],
                ['get', 'a', 'b', 'c']
            ]
        },
        {
            maxCount: 10,
            expectedCount: 3,
            calls: [
                ['get', 'a1', 'b', 'c'],
                ['get', 'a2', 'b', 'c'],
                ['get', 'a3', 'b', 'c']
            ]
        },
        {
            maxCount: 10,
            expectedCount: 3,
            calls: [
                ['get', 'a', 'b1', 'c'],
                ['get', 'a', 'b2', 'c'],
                ['get', 'a', 'b3', 'c']
            ]
        },
        {
            maxCount: 10,
            expectedCount: 3,
            calls: [
                ['get', 'a', 'b', 'c1'],
                ['get', 'a', 'b', 'c2'],
                ['get', 'a', 'b', 'c3']
            ]
        },
        {
            maxCount: 1,
            expectedCount: 1,
            calls: [
                ['get', 'a1', 'b', 'c'],
                ['get', 'a2', 'b', 'c'],
                ['get', 'a3', 'b', 'c']
            ]
        },
        {
            maxCount: 1,
            expectedCount: 1,
            calls: [
                ['get', 'a', 'b1', 'c'],
                ['get', 'a', 'b2', 'c'],
                ['get', 'a', 'b3', 'c']
            ]
        },
        {
            maxCount: 1,
            expectedCount: 1,
            calls: [
                ['get', 'a', 'b', 'c1'],
                ['get', 'a', 'b', 'c2'],
                ['get', 'a', 'b', 'c3']
            ]
        },
        {
            maxCount: 10,
            expectedCount: 0,
            calls: [
                ['get', 'a', 'b', 'c1'],
                ['get', 'a', 'b', 'c2'],
                ['get', 'a', 'b', 'c3'],
                ['clear']
            ]
        },
        {
            maxCount: 0,
            expectedCount: 0,
            calls: [
                ['get', 'a1', 'b', 'c'],
                ['get', 'a', 'b2', 'c'],
                ['get', 'a', 'b', 'c3']
            ]
        }
    ];

    const create = (...args) => args.join(',');
    for (const {maxCount, expectedCount, calls} of data) {
        const cache = new CacheMap(maxCount, create);
        assert.strictEqual(cache.maxCount, maxCount);
        for (const [name, ...args] of calls) {
            switch (name) {
                case 'get': cache.get(...args); break;
                case 'clear': cache.clear(); break;
            }
        }
        assert.strictEqual(cache.count, expectedCount);
    }
}


function main() {
    testConstructor();
    testApi();
}


if (require.main === module) { main(); }
