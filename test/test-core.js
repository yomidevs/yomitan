/*
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

const assert = require('assert');
const {testMain} = require('../dev/util');
const {VM} = require('../dev/vm');

const vm = new VM();
vm.execute([
    'js/core.js'
]);
const [DynamicProperty, deepEqual] = vm.get(['DynamicProperty', 'deepEqual']);


function testDynamicProperty() {
    const data = [
        {
            initialValue: 0,
            operations: [
                {
                    operation: null,
                    expectedDefaultValue: 0,
                    expectedValue: 0,
                    expectedOverrideCount: 0,
                    expeectedEventOccurred: false
                },
                {
                    operation: 'set.defaultValue',
                    args: [1],
                    expectedDefaultValue: 1,
                    expectedValue: 1,
                    expectedOverrideCount: 0,
                    expeectedEventOccurred: true
                },
                {
                    operation: 'set.defaultValue',
                    args: [1],
                    expectedDefaultValue: 1,
                    expectedValue: 1,
                    expectedOverrideCount: 0,
                    expeectedEventOccurred: false
                },
                {
                    operation: 'set.defaultValue',
                    args: [0],
                    expectedDefaultValue: 0,
                    expectedValue: 0,
                    expectedOverrideCount: 0,
                    expeectedEventOccurred: true
                },
                {
                    operation: 'setOverride',
                    args: [8],
                    expectedDefaultValue: 0,
                    expectedValue: 8,
                    expectedOverrideCount: 1,
                    expeectedEventOccurred: true
                },
                {
                    operation: 'setOverride',
                    args: [16],
                    expectedDefaultValue: 0,
                    expectedValue: 8,
                    expectedOverrideCount: 2,
                    expeectedEventOccurred: false
                },
                {
                    operation: 'setOverride',
                    args: [32, 1],
                    expectedDefaultValue: 0,
                    expectedValue: 32,
                    expectedOverrideCount: 3,
                    expeectedEventOccurred: true
                },
                {
                    operation: 'setOverride',
                    args: [64, -1],
                    expectedDefaultValue: 0,
                    expectedValue: 32,
                    expectedOverrideCount: 4,
                    expeectedEventOccurred: false
                },
                {
                    operation: 'clearOverride',
                    args: [-4],
                    expectedDefaultValue: 0,
                    expectedValue: 32,
                    expectedOverrideCount: 3,
                    expeectedEventOccurred: false
                },
                {
                    operation: 'clearOverride',
                    args: [-3],
                    expectedDefaultValue: 0,
                    expectedValue: 32,
                    expectedOverrideCount: 2,
                    expeectedEventOccurred: false
                },
                {
                    operation: 'clearOverride',
                    args: [-2],
                    expectedDefaultValue: 0,
                    expectedValue: 64,
                    expectedOverrideCount: 1,
                    expeectedEventOccurred: true
                },
                {
                    operation: 'clearOverride',
                    args: [-1],
                    expectedDefaultValue: 0,
                    expectedValue: 0,
                    expectedOverrideCount: 0,
                    expeectedEventOccurred: true
                }
            ]
        }
    ];

    for (const {initialValue, operations} of data) {
        const property = new DynamicProperty(initialValue);
        const overrideTokens = [];
        let eventOccurred = false;
        const onChange = () => { eventOccurred = true; };
        property.on('change', onChange);
        for (const {operation, args, expectedDefaultValue, expectedValue, expectedOverrideCount, expeectedEventOccurred} of operations) {
            eventOccurred = false;
            switch (operation) {
                case 'set.defaultValue': property.defaultValue = args[0]; break;
                case 'setOverride': overrideTokens.push(property.setOverride(...args)); break;
                case 'clearOverride': property.clearOverride(overrideTokens[overrideTokens.length + args[0]]); break;
            }
            assert.strictEqual(eventOccurred, expeectedEventOccurred);
            assert.strictEqual(property.defaultValue, expectedDefaultValue);
            assert.strictEqual(property.value, expectedValue);
            assert.strictEqual(property.overrideCount, expectedOverrideCount);
        }
        property.off('change', onChange);
    }
}

function testDeepEqual() {
    const data = [
        // Simple tests
        {
            value1: 0,
            value2: 0,
            expected: true
        },
        {
            value1: null,
            value2: null,
            expected: true
        },
        {
            value1: 'test',
            value2: 'test',
            expected: true
        },
        {
            value1: true,
            value2: true,
            expected: true
        },
        {
            value1: 0,
            value2: 1,
            expected: false
        },
        {
            value1: null,
            value2: false,
            expected: false
        },
        {
            value1: 'test1',
            value2: 'test2',
            expected: false
        },
        {
            value1: true,
            value2: false,
            expected: false
        },

        // Simple object tests
        {
            value1: {},
            value2: {},
            expected: true
        },
        {
            value1: {},
            value2: [],
            expected: false
        },
        {
            value1: [],
            value2: [],
            expected: true
        },
        {
            value1: {},
            value2: null,
            expected: false
        },

        // Complex object tests
        {
            value1: [1],
            value2: [],
            expected: false
        },
        {
            value1: [1],
            value2: [1],
            expected: true
        },
        {
            value1: [1],
            value2: [2],
            expected: false
        },

        {
            value1: {},
            value2: {test: 1},
            expected: false
        },
        {
            value1: {test: 1},
            value2: {test: 1},
            expected: true
        },
        {
            value1: {test: 1},
            value2: {test: {test2: false}},
            expected: false
        },
        {
            value1: {test: {test2: true}},
            value2: {test: {test2: false}},
            expected: false
        },
        {
            value1: {test: {test2: [true]}},
            value2: {test: {test2: [true]}},
            expected: true
        },

        // Recursive
        {
            value1: (() => { const x = {}; x.x = x; return x; })(),
            value2: (() => { const x = {}; x.x = x; return x; })(),
            expected: false
        }
    ];

    let index = 0;
    for (const {value1, value2, expected} of data) {
        const actual1 = deepEqual(value1, value2);
        assert.strictEqual(actual1, expected, `Failed for test ${index}`);

        const actual2 = deepEqual(value2, value1);
        assert.strictEqual(actual2, expected, `Failed for test ${index}`);

        ++index;
    }
}


function main() {
    testDynamicProperty();
    testDeepEqual();
}


if (require.main === module) { testMain(main); }
