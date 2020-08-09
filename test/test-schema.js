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

const vm = new VM();
vm.execute([
    'mixed/js/core.js',
    'mixed/js/cache-map.js',
    'bg/js/json-schema.js'
]);
const JsonSchema = vm.get('JsonSchema');


function testValidate1() {
    const schema = {
        allOf: [
            {
                type: 'number'
            },
            {
                anyOf: [
                    {minimum: 10, maximum: 100},
                    {minimum: -100, maximum: -10}
                ]
            },
            {
                oneOf: [
                    {multipleOf: 3},
                    {multipleOf: 5}
                ]
            },
            {
                not: [
                    {multipleOf: 20}
                ]
            }
        ]
    };

    const schemaValidate = (value) => {
        try {
            JsonSchema.validate(value, schema);
            return true;
        } catch (e) {
            return false;
        }
    };

    const jsValidate = (value) => {
        return (
            typeof value === 'number' &&
            (
                (value >= 10 && value <= 100) ||
                (value >= -100 && value <= -10)
            ) &&
            (
                (
                    (value % 3) === 0 ||
                    (value % 5) === 0
                ) &&
                (value % 15) !== 0
            ) &&
            (value % 20) !== 0
        );
    };

    for (let i = -111; i <= 111; i++) {
        const actual = schemaValidate(i, schema);
        const expected = jsValidate(i);
        assert.strictEqual(actual, expected);
    }
}

function testValidate2() {
    const data = [
        // String tests
        {
            schema: {
                type: 'string'
            },
            inputs: [
                {expected: false, value: null},
                {expected: false, value: void 0},
                {expected: false, value: 0},
                {expected: false, value: {}},
                {expected: false, value: []},
                {expected: true,  value: ''}
            ]
        },
        {
            schema: {
                type: 'string',
                minLength: 2
            },
            inputs: [
                {expected: false, value: ''},
                {expected: false,  value: '1'},
                {expected: true,  value: '12'},
                {expected: true,  value: '123'}
            ]
        },
        {
            schema: {
                type: 'string',
                maxLength: 2
            },
            inputs: [
                {expected: true,  value: ''},
                {expected: true,  value: '1'},
                {expected: true,  value: '12'},
                {expected: false, value: '123'}
            ]
        },
        {
            schema: {
                type: 'string',
                pattern: 'test'
            },
            inputs: [
                {expected: false, value: ''},
                {expected: true,  value: 'test'},
                {expected: false, value: 'TEST'},
                {expected: true,  value: 'ABCtestDEF'},
                {expected: false, value: 'ABCTESTDEF'}
            ]
        },
        {
            schema: {
                type: 'string',
                pattern: '^test$'
            },
            inputs: [
                {expected: false, value: ''},
                {expected: true,  value: 'test'},
                {expected: false, value: 'TEST'},
                {expected: false, value: 'ABCtestDEF'},
                {expected: false, value: 'ABCTESTDEF'}
            ]
        },
        {
            schema: {
                type: 'string',
                pattern: '^test$',
                patternFlags: 'i'
            },
            inputs: [
                {expected: false, value: ''},
                {expected: true,  value: 'test'},
                {expected: true,  value: 'TEST'},
                {expected: false, value: 'ABCtestDEF'},
                {expected: false, value: 'ABCTESTDEF'}
            ]
        },
        {
            schema: {
                type: 'string',
                pattern: '*'
            },
            inputs: [
                {expected: false, value: ''}
            ]
        },
        {
            schema: {
                type: 'string',
                pattern: '.',
                patternFlags: '?'
            },
            inputs: [
                {expected: false, value: ''}
            ]
        }
    ];

    const schemaValidate = (value, schema) => {
        try {
            JsonSchema.validate(value, schema);
            return true;
        } catch (e) {
            return false;
        }
    };

    for (const {schema, inputs} of data) {
        for (const {expected, value} of inputs) {
            const actual = schemaValidate(value, schema);
            assert.strictEqual(actual, expected);
        }
    }
}


function testGetValidValueOrDefault1() {
    // Test value defaulting on objects with additionalProperties=false
    const schema = {
        type: 'object',
        required: ['test'],
        properties: {
            test: {
                type: 'string',
                default: 'default'
            }
        },
        additionalProperties: false
    };

    const testData = [
        [
            void 0,
            {test: 'default'}
        ],
        [
            null,
            {test: 'default'}
        ],
        [
            0,
            {test: 'default'}
        ],
        [
            '',
            {test: 'default'}
        ],
        [
            [],
            {test: 'default'}
        ],
        [
            {},
            {test: 'default'}
        ],
        [
            {test: 'value'},
            {test: 'value'}
        ],
        [
            {test2: 'value2'},
            {test: 'default'}
        ],
        [
            {test: 'value', test2: 'value2'},
            {test: 'value'}
        ]
    ];

    for (const [value, expected] of testData) {
        const actual = JsonSchema.getValidValueOrDefault(schema, value);
        vm.assert.deepStrictEqual(actual, expected);
    }
}

function testGetValidValueOrDefault2() {
    // Test value defaulting on objects with additionalProperties=true
    const schema = {
        type: 'object',
        required: ['test'],
        properties: {
            test: {
                type: 'string',
                default: 'default'
            }
        },
        additionalProperties: true
    };

    const testData = [
        [
            {},
            {test: 'default'}
        ],
        [
            {test: 'value'},
            {test: 'value'}
        ],
        [
            {test2: 'value2'},
            {test: 'default', test2: 'value2'}
        ],
        [
            {test: 'value', test2: 'value2'},
            {test: 'value', test2: 'value2'}
        ]
    ];

    for (const [value, expected] of testData) {
        const actual = JsonSchema.getValidValueOrDefault(schema, value);
        vm.assert.deepStrictEqual(actual, expected);
    }
}

function testGetValidValueOrDefault3() {
    // Test value defaulting on objects with additionalProperties={schema}
    const schema = {
        type: 'object',
        required: ['test'],
        properties: {
            test: {
                type: 'string',
                default: 'default'
            }
        },
        additionalProperties: {
            type: 'number',
            default: 10
        }
    };

    const testData = [
        [
            {},
            {test: 'default'}
        ],
        [
            {test: 'value'},
            {test: 'value'}
        ],
        [
            {test2: 'value2'},
            {test: 'default', test2: 10}
        ],
        [
            {test: 'value', test2: 'value2'},
            {test: 'value', test2: 10}
        ],
        [
            {test2: 2},
            {test: 'default', test2: 2}
        ],
        [
            {test: 'value', test2: 2},
            {test: 'value', test2: 2}
        ],
        [
            {test: 'value', test2: 2, test3: null},
            {test: 'value', test2: 2, test3: 10}
        ],
        [
            {test: 'value', test2: 2, test3: void 0},
            {test: 'value', test2: 2, test3: 10}
        ]
    ];

    for (const [value, expected] of testData) {
        const actual = JsonSchema.getValidValueOrDefault(schema, value);
        vm.assert.deepStrictEqual(actual, expected);
    }
}


function main() {
    testValidate1();
    testValidate2();
    testGetValidValueOrDefault1();
    testGetValidValueOrDefault2();
    testGetValidValueOrDefault3();
}


if (require.main === module) { main(); }
