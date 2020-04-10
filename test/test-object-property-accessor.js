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

const vm = new VM({});
vm.execute('mixed/js/object-property-accessor.js');
const ObjectPropertyAccessor = vm.get('ObjectPropertyAccessor');


function createTestObject() {
    return {
        0: null,
        value1: {
            value2: {},
            value3: [],
            value4: null
        },
        value5: [
            {},
            [],
            null
        ]
    };
}


function testGetProperty1() {
    const object = createTestObject();
    const accessor = new ObjectPropertyAccessor(object);

    const data = [
        [[], object],
        [['0'], object['0']],
        [['value1'], object.value1],
        [['value1', 'value2'], object.value1.value2],
        [['value1', 'value3'], object.value1.value3],
        [['value1', 'value4'], object.value1.value4],
        [['value5'], object.value5],
        [['value5', 0], object.value5[0]],
        [['value5', 1], object.value5[1]],
        [['value5', 2], object.value5[2]]
    ];

    for (const [pathArray, expected] of data) {
        assert.strictEqual(accessor.getProperty(pathArray), expected);
    }
}

function testGetProperty2() {
    const object = createTestObject();
    const accessor = new ObjectPropertyAccessor(object);

    const data = [
        [[0], 'Invalid path: [0]'],
        [['0', 'invalid'], 'Invalid path: ["0"].invalid'],
        [['invalid'], 'Invalid path: invalid'],
        [['value1', 'invalid'], 'Invalid path: value1.invalid'],
        [['value1', 'value2', 'invalid'], 'Invalid path: value1.value2.invalid'],
        [['value1', 'value2', 0], 'Invalid path: value1.value2[0]'],
        [['value1', 'value3', 'invalid'], 'Invalid path: value1.value3.invalid'],
        [['value1', 'value3', 0], 'Invalid path: value1.value3[0]'],
        [['value1', 'value4', 'invalid'], 'Invalid path: value1.value4.invalid'],
        [['value1', 'value4', 0], 'Invalid path: value1.value4[0]'],
        [['value5', 'length'], 'Invalid path: value5.length'],
        [['value5', 0, 'invalid'], 'Invalid path: value5[0].invalid'],
        [['value5', 0, 0], 'Invalid path: value5[0][0]'],
        [['value5', 1, 'invalid'], 'Invalid path: value5[1].invalid'],
        [['value5', 1, 0], 'Invalid path: value5[1][0]'],
        [['value5', 2, 'invalid'], 'Invalid path: value5[2].invalid'],
        [['value5', 2, 0], 'Invalid path: value5[2][0]'],
        [['value5', 2, 0, 'invalid'], 'Invalid path: value5[2][0]'],
        [['value5', 2.5], 'Invalid index']
    ];

    for (const [pathArray, message] of data) {
        assert.throws(() => accessor.getProperty(pathArray), {message});
    }
}


function testSetProperty1() {
    const object = createTestObject();
    const accessor = new ObjectPropertyAccessor(object);

    const testValue = {};
    const data = [
        ['0'],
        ['value1', 'value2'],
        ['value1', 'value3'],
        ['value1', 'value4'],
        ['value1'],
        ['value5', 0],
        ['value5', 1],
        ['value5', 2],
        ['value5']
    ];

    for (const pathArray of data) {
        accessor.setProperty(pathArray, testValue);
        assert.strictEqual(accessor.getProperty(pathArray), testValue);
    }
}

function testSetProperty2() {
    const object = createTestObject();
    const accessor = new ObjectPropertyAccessor(object);

    const testValue = {};
    const data = [
        [[0], 'Invalid path: [0]'],
        [['0', 'invalid'], 'Invalid path: ["0"].invalid'],
        [['value1', 'value2', 0], 'Invalid path: value1.value2[0]'],
        [['value1', 'value3', 'invalid'], 'Invalid path: value1.value3.invalid'],
        [['value1', 'value4', 'invalid'], 'Invalid path: value1.value4.invalid'],
        [['value1', 'value4', 0], 'Invalid path: value1.value4[0]'],
        [['value5', 1, 'invalid'], 'Invalid path: value5[1].invalid'],
        [['value5', 2, 'invalid'], 'Invalid path: value5[2].invalid'],
        [['value5', 2, 0], 'Invalid path: value5[2][0]'],
        [['value5', 2, 0, 'invalid'], 'Invalid path: value5[2][0]'],
        [['value5', 2.5], 'Invalid index']
    ];

    for (const [pathArray, message] of data) {
        assert.throws(() => accessor.setProperty(pathArray, testValue), {message});
    }
}


function testGetPathString1() {
    const data = [
        [[], ''],
        [[0], '[0]'],
        [['escape\\'], '["escape\\\\"]'],
        [['\'quote\''], '["\'quote\'"]'],
        [['"quote"'], '["\\"quote\\""]'],
        [['part1', 'part2'], 'part1.part2'],
        [['part1', 'part2', 3], 'part1.part2[3]'],
        [['part1', 'part2', '3'], 'part1.part2["3"]'],
        [['part1', 'part2', '3part'], 'part1.part2["3part"]'],
        [['part1', 'part2', '3part', 'part4'], 'part1.part2["3part"].part4'],
        [['part1', 'part2', '3part', '4part'], 'part1.part2["3part"]["4part"]']
    ];

    for (const [pathArray, expected] of data) {
        assert.strictEqual(ObjectPropertyAccessor.getPathString(pathArray), expected);
    }
}

function testGetPathString2() {
    const data = [
        [[1.5], 'Invalid index'],
        [[null], 'Invalid type: object']
    ];

    for (const [pathArray, message] of data) {
        assert.throws(() => ObjectPropertyAccessor.getPathString(pathArray), {message});
    }
}


function testGetPathArray1() {
    const data = [
        ['', []],
        ['[0]', [0]],
        ['["escape\\\\"]', ['escape\\']],
        ['["\'quote\'"]', ['\'quote\'']],
        ['["\\"quote\\""]', ['"quote"']],
        ['part1.part2', ['part1', 'part2']],
        ['part1.part2[3]', ['part1', 'part2', 3]],
        ['part1.part2["3"]', ['part1', 'part2', '3']],
        ['part1.part2[\'3\']', ['part1', 'part2', '3']],
        ['part1.part2["3part"]', ['part1', 'part2', '3part']],
        ['part1.part2[\'3part\']', ['part1', 'part2', '3part']],
        ['part1.part2["3part"].part4', ['part1', 'part2', '3part', 'part4']],
        ['part1.part2[\'3part\'].part4', ['part1', 'part2', '3part', 'part4']],
        ['part1.part2["3part"]["4part"]', ['part1', 'part2', '3part', '4part']],
        ['part1.part2[\'3part\'][\'4part\']', ['part1', 'part2', '3part', '4part']]
    ];

    for (const [pathString, expected] of data) {
        vm.assert.deepStrictEqual(ObjectPropertyAccessor.getPathArray(pathString), expected);
    }
}

function testGetPathArray2() {
    const data = [
        ['?', 'Unexpected character: ?'],
        ['.', 'Unexpected character: .'],
        ['0', 'Unexpected character: 0'],
        ['part1.[0]', 'Unexpected character: ['],
        ['part1?', 'Unexpected character: ?'],
        ['[part1]', 'Unexpected character: p'],
        ['[0a]', 'Unexpected character: a'],
        ['["part1"x]', 'Unexpected character: x'],
        ['[\'part1\'x]', 'Unexpected character: x'],
        ['["part1"]x', 'Unexpected character: x'],
        ['[\'part1\']x', 'Unexpected character: x'],
        ['part1..part2', 'Unexpected character: .'],

        ['[', 'Path not terminated correctly'],
        ['part1.', 'Path not terminated correctly'],
        ['part1[', 'Path not terminated correctly'],
        ['part1["', 'Path not terminated correctly'],
        ['part1[\'', 'Path not terminated correctly'],
        ['part1[""', 'Path not terminated correctly'],
        ['part1[\'\'', 'Path not terminated correctly'],
        ['part1[0', 'Path not terminated correctly'],
        ['part1[0].', 'Path not terminated correctly']
    ];

    for (const [pathString, message] of data) {
        assert.throws(() => ObjectPropertyAccessor.getPathArray(pathString), {message});
    }
}


function testHasProperty() {
    const data = [
        [{}, 'invalid', false],
        [{}, 0, false],
        [{valid: 0}, 'valid', true],
        [{null: 0}, null, false],
        [[], 'invalid', false],
        [[], 0, false],
        [[0], 0, true],
        [[0], null, false],
        ['string', 0, false],
        ['string', 'length', false],
        ['string', null, false]
    ];

    for (const [object, property, expected] of data) {
        assert.strictEqual(ObjectPropertyAccessor.hasProperty(object, property), expected);
    }
}

function testIsValidPropertyType() {
    const data = [
        [{}, 'invalid', true],
        [{}, 0, false],
        [{valid: 0}, 'valid', true],
        [{null: 0}, null, false],
        [[], 'invalid', false],
        [[], 0, true],
        [[0], 0, true],
        [[0], null, false],
        ['string', 0, false],
        ['string', 'length', false],
        ['string', null, false]
    ];

    for (const [object, property, expected] of data) {
        assert.strictEqual(ObjectPropertyAccessor.isValidPropertyType(object, property), expected);
    }
}


function main() {
    testGetProperty1();
    testGetProperty2();
    testSetProperty1();
    testSetProperty2();
    testGetPathString1();
    testGetPathString2();
    testGetPathArray1();
    testGetPathArray2();
    testHasProperty();
    testIsValidPropertyType();
}


if (require.main === module) { main(); }
