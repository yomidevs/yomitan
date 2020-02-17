const fs = require('fs');
const path = require('path');
const assert = require('assert');

const jsonSchemaFileName = path.join(__dirname, '../ext/bg/js/json-schema.js');
const jsonSchemaFileSource = fs.readFileSync(jsonSchemaFileName, {encoding: 'utf8'});
const JsonSchema = Function(`'use strict';${jsonSchemaFileSource};return JsonSchema;`)();


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

    const schemaValidate = (value, schema) => {
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
                    (value % 3 )=== 0 ||
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
            void(0),
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
        assert.deepStrictEqual(actual, expected);
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
        assert.deepStrictEqual(actual, expected);
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
            {test: 'value', test2: 2, test3: void(0)},
            {test: 'value', test2: 2, test3: 10}
        ]
    ];

    for (const [value, expected] of testData) {
        const actual = JsonSchema.getValidValueOrDefault(schema, value);
        assert.deepStrictEqual(actual, expected);
    }
}


function main() {
    testValidate1();
    testGetValidValueOrDefault1();
    testGetValidValueOrDefault2();
    testGetValidValueOrDefault3();
}


main();
