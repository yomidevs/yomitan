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

const assert = require('assert');
const {testMain} = require('../dev/util');
const {VM} = require('../dev/vm');

const vm = new VM({});
vm.execute('js/general/object-property-accessor.js');
/** @type {typeof ObjectPropertyAccessor} */
const ObjectPropertyAccessor2 = vm.getSingle('ObjectPropertyAccessor');


/**
 * @returns {import('core').UnknownObject}
 */
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


/** */
function testGet1() {
    /** @type {[pathArray: (string|number)[], getExpected: (object: import('core').SafeAny) => unknown][]} */
    const data = [
        [[], (object) => object],
        [['0'], (object) => object['0']],
        [['value1'], (object) => object.value1],
        [['value1', 'value2'], (object) => object.value1.value2],
        [['value1', 'value3'], (object) => object.value1.value3],
        [['value1', 'value4'], (object) => object.value1.value4],
        [['value5'], (object) => object.value5],
        [['value5', 0], (object) => object.value5[0]],
        [['value5', 1], (object) => object.value5[1]],
        [['value5', 2], (object) => object.value5[2]]
    ];

    for (const [pathArray, getExpected] of data) {
        const object = createTestObject();
        const accessor = new ObjectPropertyAccessor2(object);
        const expected = getExpected(object);

        assert.strictEqual(accessor.get(pathArray), expected);
    }
}

/** */
function testGet2() {
    const object = createTestObject();
    const accessor = new ObjectPropertyAccessor2(object);

    /** @type {[pathArray: (string|number)[], message: string][]} */
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
        assert.throws(() => accessor.get(pathArray), {message});
    }
}


/** */
function testSet1() {
    const testValue = {};
    /** @type {(string|number)[][]} */
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
        const object = createTestObject();
        const accessor = new ObjectPropertyAccessor2(object);

        accessor.set(pathArray, testValue);
        assert.strictEqual(accessor.get(pathArray), testValue);
    }
}

/** */
function testSet2() {
    const object = createTestObject();
    const accessor = new ObjectPropertyAccessor2(object);

    const testValue = {};
    /** @type {[pathArray: (string|number)[], message: string][]} */
    const data = [
        [[], 'Invalid path'],
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
        assert.throws(() => accessor.set(pathArray, testValue), {message});
    }
}


/** */
function testDelete1() {
    /**
     * @param {unknown} object
     * @param {string} property
     * @returns {boolean}
     */
    const hasOwn = (object, property) => Object.prototype.hasOwnProperty.call(object, property);

    /** @type {[pathArray: (string|number)[], validate: (object: import('core').SafeAny) => boolean][]} */
    const data = [
        [['0'], (object) => !hasOwn(object, '0')],
        [['value1', 'value2'], (object) => !hasOwn(object.value1, 'value2')],
        [['value1', 'value3'], (object) => !hasOwn(object.value1, 'value3')],
        [['value1', 'value4'], (object) => !hasOwn(object.value1, 'value4')],
        [['value1'], (object) => !hasOwn(object, 'value1')],
        [['value5'], (object) => !hasOwn(object, 'value5')]
    ];

    for (const [pathArray, validate] of data) {
        const object = createTestObject();
        const accessor = new ObjectPropertyAccessor2(object);

        accessor.delete(pathArray);
        assert.ok(validate(object));
    }
}

/** */
function testDelete2() {
    /** @type {[pathArray: (string|number)[], message: string][]} */
    const data = [
        [[], 'Invalid path'],
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
        [['value5', 2.5], 'Invalid index'],
        [['value5', 0], 'Invalid type'],
        [['value5', 1], 'Invalid type'],
        [['value5', 2], 'Invalid type']
    ];

    for (const [pathArray, message] of data) {
        const object = createTestObject();
        const accessor = new ObjectPropertyAccessor2(object);

        assert.throws(() => accessor.delete(pathArray), {message});
    }
}


/** */
function testSwap1() {
    /** @type {[pathArray: (string|number)[], compareValues: boolean][]} */
    const data = [
        [['0'], true],
        [['value1', 'value2'], true],
        [['value1', 'value3'], true],
        [['value1', 'value4'], true],
        [['value1'], false],
        [['value5', 0], true],
        [['value5', 1], true],
        [['value5', 2], true],
        [['value5'], false]
    ];

    for (const [pathArray1, compareValues1] of data) {
        for (const [pathArray2, compareValues2] of data) {
            const object = createTestObject();
            const accessor = new ObjectPropertyAccessor2(object);

            const value1a = accessor.get(pathArray1);
            const value2a = accessor.get(pathArray2);

            accessor.swap(pathArray1, pathArray2);

            if (!compareValues1 || !compareValues2) { continue; }

            const value1b = accessor.get(pathArray1);
            const value2b = accessor.get(pathArray2);

            assert.deepStrictEqual(value1a, value2b);
            assert.deepStrictEqual(value2a, value1b);
        }
    }
}

/** */
function testSwap2() {
    /** @type {[pathArray1: (string|number)[], pathArray2: (string|number)[], checkRevert: boolean, message: string][]} */
    const data = [
        [[], [], false, 'Invalid path 1'],
        [['0'], [], false, 'Invalid path 2'],
        [[], ['0'], false, 'Invalid path 1'],
        [[0], ['0'], false, 'Invalid path 1: [0]'],
        [['0'], [0], false, 'Invalid path 2: [0]']
    ];

    for (const [pathArray1, pathArray2, checkRevert, message] of data) {
        const object = createTestObject();
        const accessor = new ObjectPropertyAccessor2(object);

        let value1a;
        let value2a;
        if (checkRevert) {
            try {
                value1a = accessor.get(pathArray1);
                value2a = accessor.get(pathArray2);
            } catch (e) {
                // NOP
            }
        }

        assert.throws(() => accessor.swap(pathArray1, pathArray2), {message});

        if (!checkRevert) { continue; }

        const value1b = accessor.get(pathArray1);
        const value2b = accessor.get(pathArray2);

        assert.deepStrictEqual(value1a, value1b);
        assert.deepStrictEqual(value2a, value2b);
    }
}


/** */
function testGetPathString1() {
    /** @type {[pathArray: (string|number)[], expected: string][]} */
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
        assert.strictEqual(ObjectPropertyAccessor2.getPathString(pathArray), expected);
    }
}

/** */
function testGetPathString2() {
    /** @type {[pathArray: unknown[], message: string][]} */
    const data = [
        [[1.5], 'Invalid index'],
        [[null], 'Invalid type: object']
    ];

    for (const [pathArray, message] of data) {
        // @ts-ignore - Throwing is expected
        assert.throws(() => ObjectPropertyAccessor2.getPathString(pathArray), {message});
    }
}


/** */
function testGetPathArray1() {
    /** @type {[pathString: string, pathArray: (string|number)[]][]} */
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
        // @ts-ignore
        vm.assert.deepStrictEqual(ObjectPropertyAccessor2.getPathArray(pathString), expected);
    }
}

/** */
function testGetPathArray2() {
    /** @type {[pathString: string, message: string][]} */
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
        assert.throws(() => ObjectPropertyAccessor2.getPathArray(pathString), {message});
    }
}


/** */
function testHasProperty() {
    /** @type {[object: unknown, property: unknown, expected: boolean][]} */
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
        // @ts-ignore
        assert.strictEqual(ObjectPropertyAccessor2.hasProperty(object, property), expected);
    }
}

/** */
function testIsValidPropertyType() {
    /** @type {[object: unknown, property: unknown, expected: boolean][]} */
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
        // @ts-ignore
        assert.strictEqual(ObjectPropertyAccessor2.isValidPropertyType(object, property), expected);
    }
}


/** */
function main() {
    testGet1();
    testGet2();
    testSet1();
    testSet2();
    testDelete1();
    testDelete2();
    testSwap1();
    testSwap2();
    testGetPathString1();
    testGetPathString2();
    testGetPathArray1();
    testGetPathArray2();
    testHasProperty();
    testIsValidPropertyType();
}


if (require.main === module) { testMain(main); }
