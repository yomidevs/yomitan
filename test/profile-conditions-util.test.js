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
import {createSchema, normalizeContext} from '../ext/js/background/profile-conditions-util.js';

describe('Profile conditions utilities', () => {
    describe('NormalizeContext', () => {
        /** @type {{context: import('settings').OptionsContext, expected: import('profile-conditions-util').NormalizedOptionsContext}[]} */
        const data = [
            // Empty
            {
                context: {index: 0},
                expected: {flags: [], index: 0},
            },

            // Domain normalization
            {
                context: {depth: 0, url: ''},
                expected: {depth: 0, flags: [], url: ''},
            },
            {
                context: {depth: 0, url: 'http://example.com/'},
                expected: {depth: 0, domain: 'example.com', flags: [], url: 'http://example.com/'},
            },
            {
                context: {depth: 0, url: 'http://example.com:1234/'},
                expected: {depth: 0, domain: 'example.com', flags: [], url: 'http://example.com:1234/'},
            },
            {
                context: {depth: 0, url: 'http://user@example.com:1234/'},
                expected: {depth: 0, domain: 'example.com', flags: [], url: 'http://user@example.com:1234/'},
            },
        ];

        test.each(data)('normalize-context-test-%#', ({context, expected}) => {
            const actual = normalizeContext(context);
            expect(actual).toStrictEqual(expected);
        });
    });

    describe('Schemas', () => {
        /* eslint-disable @stylistic/no-multi-spaces */
        /** @type {{conditionGroups: import('settings').ProfileConditionGroup[], expectedSchema?: import('ext/json-schema').Schema, inputs?: {expected: boolean, context: import('settings').OptionsContext}[]}[]} */
        const data = [
            // Empty
            {
                conditionGroups: [],
                expectedSchema: {},
                inputs: [
                    {context: {depth: 0, url: 'http://example.com/'}, expected: true},
                ],
            },
            {
                conditionGroups: [
                    {conditions: []},
                ],
                expectedSchema: {},
                inputs: [
                    {context: {depth: 0, url: 'http://example.com/'}, expected: true},
                ],
            },
            {
                conditionGroups: [
                    {conditions: []},
                    {conditions: []},
                ],
                expectedSchema: {},
                inputs: [
                    {context: {depth: 0, url: 'http://example.com/'}, expected: true},
                ],
            },

            // popupLevel tests
            {
                conditionGroups: [
                    {
                        conditions: [
                            {
                                operator: 'equal',
                                type: 'popupLevel',
                                value: '0',
                            },
                        ],
                    },
                ],
                expectedSchema: {
                    properties: {
                        depth: {const: 0},
                    },
                    required: ['depth'],
                },
                inputs: [
                    {context: {depth: 0, url: 'http://example.com/'},  expected: true},
                    {context: {depth: 1, url: 'http://example.com/'}, expected: false},
                    {context: {depth: -1, url: 'http://example.com/'}, expected: false},
                ],
            },
            {
                conditionGroups: [
                    {
                        conditions: [
                            {
                                operator: 'notEqual',
                                type: 'popupLevel',
                                value: '0',
                            },
                        ],
                    },
                ],
                expectedSchema: {
                    not: {
                        anyOf: [
                            {
                                properties: {
                                    depth: {const: 0},
                                },
                                required: ['depth'],
                            },
                        ],
                    },
                },
                inputs: [
                    {context: {depth: 0, url: 'http://example.com/'}, expected: false},
                    {context: {depth: 1, url: 'http://example.com/'},  expected: true},
                    {context: {depth: -1, url: 'http://example.com/'},  expected: true},
                ],
            },
            {
                conditionGroups: [
                    {
                        conditions: [
                            {
                                operator: 'lessThan',
                                type: 'popupLevel',
                                value: '0',
                            },
                        ],
                    },
                ],
                expectedSchema: {
                    properties: {
                        depth: {
                            exclusiveMaximum: 0,
                            type: 'number',
                        },
                    },
                    required: ['depth'],
                },
                inputs: [
                    {context: {depth: 0, url: 'http://example.com/'}, expected: false},
                    {context: {depth: 1, url: 'http://example.com/'}, expected: false},
                    {context: {depth: -1, url: 'http://example.com/'},  expected: true},
                ],
            },
            {
                conditionGroups: [
                    {
                        conditions: [
                            {
                                operator: 'greaterThan',
                                type: 'popupLevel',
                                value: '0',
                            },
                        ],
                    },
                ],
                expectedSchema: {
                    properties: {
                        depth: {
                            exclusiveMinimum: 0,
                            type: 'number',
                        },
                    },
                    required: ['depth'],
                },
                inputs: [
                    {context: {depth: 0, url: 'http://example.com/'}, expected: false},
                    {context: {depth: 1, url: 'http://example.com/'},  expected: true},
                    {context: {depth: -1, url: 'http://example.com/'}, expected: false},
                ],
            },
            {
                conditionGroups: [
                    {
                        conditions: [
                            {
                                operator: 'lessThanOrEqual',
                                type: 'popupLevel',
                                value: '0',
                            },
                        ],
                    },
                ],
                expectedSchema: {
                    properties: {
                        depth: {
                            maximum: 0,
                            type: 'number',
                        },
                    },
                    required: ['depth'],
                },
                inputs: [
                    {context: {depth: 0, url: 'http://example.com/'},  expected: true},
                    {context: {depth: 1, url: 'http://example.com/'}, expected: false},
                    {context: {depth: -1, url: 'http://example.com/'},  expected: true},
                ],
            },
            {
                conditionGroups: [
                    {
                        conditions: [
                            {
                                operator: 'greaterThanOrEqual',
                                type: 'popupLevel',
                                value: '0',
                            },
                        ],
                    },
                ],
                expectedSchema: {
                    properties: {
                        depth: {
                            minimum: 0,
                            type: 'number',
                        },
                    },
                    required: ['depth'],
                },
                inputs: [
                    {context: {depth: 0, url: 'http://example.com/'},  expected: true},
                    {context: {depth: 1, url: 'http://example.com/'},  expected: true},
                    {context: {depth: -1, url: 'http://example.com/'}, expected: false},
                ],
            },

            // Url tests
            {
                conditionGroups: [
                    {
                        conditions: [
                            {
                                operator: 'matchDomain',
                                type: 'url',
                                value: 'example.com',
                            },
                        ],
                    },
                ],
                expectedSchema: {
                    properties: {
                        domain: {
                            oneOf: [
                                {const: 'example.com'},
                            ],
                        },
                    },
                    required: ['domain'],
                },
                inputs: [
                    {context: {depth: 0, url: 'http://example.com/'},  expected: true},
                    {context: {depth: 0, url: 'http://example1.com/'}, expected: false},
                    {context: {depth: 0, url: 'http://example2.com/'}, expected: false},
                    {context: {depth: 0, url: 'http://example.com:1234/'},  expected: true},
                    {context: {depth: 0, url: 'http://user@example.com:1234/'},  expected: true},
                ],
            },
            {
                conditionGroups: [
                    {
                        conditions: [
                            {
                                operator: 'matchDomain',
                                type: 'url',
                                value: 'example.com, example1.com, example2.com',
                            },
                        ],
                    },
                ],
                expectedSchema: {
                    properties: {
                        domain: {
                            oneOf: [
                                {const: 'example.com'},
                                {const: 'example1.com'},
                                {const: 'example2.com'},
                            ],
                        },
                    },
                    required: ['domain'],
                },
                inputs: [
                    {context: {depth: 0, url: 'http://example.com/'},  expected: true},
                    {context: {depth: 0, url: 'http://example1.com/'},  expected: true},
                    {context: {depth: 0, url: 'http://example2.com/'},  expected: true},
                    {context: {depth: 0, url: 'http://example3.com/'}, expected: false},
                    {context: {depth: 0, url: 'http://example.com:1234/'},  expected: true},
                    {context: {depth: 0, url: 'http://user@example.com:1234/'},  expected: true},
                ],
            },
            {
                conditionGroups: [
                    {
                        conditions: [
                            {
                                operator: 'matchRegExp',
                                type: 'url',
                                value: '^http://example\\d?\\.com/[\\w\\W]*$',
                            },
                        ],
                    },
                ],
                expectedSchema: {
                    properties: {
                        url: {
                            pattern: '^http://example\\d?\\.com/[\\w\\W]*$',
                            patternFlags: 'i',
                            type: 'string',
                        },
                    },
                    required: ['url'],
                },
                inputs: [
                    {context: {depth: 0, url: 'http://example.com/'},  expected: true},
                    {context: {depth: 0, url: 'http://example1.com/'},  expected: true},
                    {context: {depth: 0, url: 'http://example2.com/'},  expected: true},
                    {context: {depth: 0, url: 'http://example3.com/'},  expected: true},
                    {context: {depth: 0, url: 'http://example.com/example'},  expected: true},
                    {context: {depth: 0, url: 'http://example.com:1234/'}, expected: false},
                    {context: {depth: 0, url: 'http://user@example.com:1234/'}, expected: false},
                    {context: {depth: 0, url: 'http://example-1.com/'}, expected: false},
                ],
            },

            // modifierKeys tests
            {
                conditionGroups: [
                    {
                        conditions: [
                            {
                                operator: 'are',
                                type: 'modifierKeys',
                                value: '',
                            },
                        ],
                    },
                ],
                expectedSchema: {
                    properties: {
                        modifierKeys: {
                            maxItems: 0,
                            minItems: 0,
                            type: 'array',
                        },
                    },
                    required: ['modifierKeys'],
                },
                inputs: [
                    {context: {depth: 0, modifierKeys: [], url: 'http://example.com/'},  expected: true},
                    {context: {depth: 0, modifierKeys: ['alt'], url: 'http://example.com/'}, expected: false},
                    {context: {depth: 0, modifierKeys: ['alt', 'shift'], url: 'http://example.com/'}, expected: false},
                    {context: {depth: 0, modifierKeys: ['alt', 'shift', 'ctrl'], url: 'http://example.com/'}, expected: false},
                ],
            },
            {
                conditionGroups: [
                    {
                        conditions: [
                            {
                                operator: 'are',
                                type: 'modifierKeys',
                                value: 'alt, shift',
                            },
                        ],
                    },
                ],
                expectedSchema: {
                    properties: {
                        modifierKeys: {
                            allOf: [
                                {contains: {const: 'alt'}},
                                {contains: {const: 'shift'}},
                            ],
                            maxItems: 2,
                            minItems: 2,
                            type: 'array',
                        },
                    },
                    required: ['modifierKeys'],
                },
                inputs: [
                    {context: {depth: 0, modifierKeys: [], url: 'http://example.com/'}, expected: false},
                    {context: {depth: 0, modifierKeys: ['alt'], url: 'http://example.com/'}, expected: false},
                    {context: {depth: 0, modifierKeys: ['alt', 'shift'], url: 'http://example.com/'},  expected: true},
                    {context: {depth: 0, modifierKeys: ['alt', 'shift', 'ctrl'], url: 'http://example.com/'}, expected: false},
                ],
            },
            {
                conditionGroups: [
                    {
                        conditions: [
                            {
                                operator: 'areNot',
                                type: 'modifierKeys',
                                value: '',
                            },
                        ],
                    },
                ],
                expectedSchema: {
                    not: {
                        anyOf: [
                            {
                                properties: {
                                    modifierKeys: {
                                        maxItems: 0,
                                        minItems: 0,
                                        type: 'array',
                                    },
                                },
                                required: ['modifierKeys'],
                            },
                        ],
                    },
                },
                inputs: [
                    {context: {depth: 0, modifierKeys: [], url: 'http://example.com/'}, expected: false},
                    {context: {depth: 0, modifierKeys: ['alt'], url: 'http://example.com/'},  expected: true},
                    {context: {depth: 0, modifierKeys: ['alt', 'shift'], url: 'http://example.com/'},  expected: true},
                    {context: {depth: 0, modifierKeys: ['alt', 'shift', 'ctrl'], url: 'http://example.com/'},  expected: true},
                ],
            },
            {
                conditionGroups: [
                    {
                        conditions: [
                            {
                                operator: 'areNot',
                                type: 'modifierKeys',
                                value: 'alt, shift',
                            },
                        ],
                    },
                ],
                expectedSchema: {
                    not: {
                        anyOf: [
                            {
                                properties: {
                                    modifierKeys: {
                                        allOf: [
                                            {contains: {const: 'alt'}},
                                            {contains: {const: 'shift'}},
                                        ],
                                        maxItems: 2,
                                        minItems: 2,
                                        type: 'array',
                                    },
                                },
                                required: ['modifierKeys'],
                            },
                        ],
                    },
                },
                inputs: [
                    {context: {depth: 0, modifierKeys: [], url: 'http://example.com/'},  expected: true},
                    {context: {depth: 0, modifierKeys: ['alt'], url: 'http://example.com/'},  expected: true},
                    {context: {depth: 0, modifierKeys: ['alt', 'shift'], url: 'http://example.com/'}, expected: false},
                    {context: {depth: 0, modifierKeys: ['alt', 'shift', 'ctrl'], url: 'http://example.com/'},  expected: true},
                ],
            },
            {
                conditionGroups: [
                    {
                        conditions: [
                            {
                                operator: 'include',
                                type: 'modifierKeys',
                                value: '',
                            },
                        ],
                    },
                ],
                expectedSchema: {
                    properties: {
                        modifierKeys: {
                            minItems: 0,
                            type: 'array',
                        },
                    },
                    required: ['modifierKeys'],
                },
                inputs: [
                    {context: {depth: 0, modifierKeys: [], url: 'http://example.com/'},  expected: true},
                    {context: {depth: 0, modifierKeys: ['alt'], url: 'http://example.com/'},  expected: true},
                    {context: {depth: 0, modifierKeys: ['alt', 'shift'], url: 'http://example.com/'},  expected: true},
                    {context: {depth: 0, modifierKeys: ['alt', 'shift', 'ctrl'], url: 'http://example.com/'},  expected: true},
                ],
            },
            {
                conditionGroups: [
                    {
                        conditions: [
                            {
                                operator: 'include',
                                type: 'modifierKeys',
                                value: 'alt, shift',
                            },
                        ],
                    },
                ],
                expectedSchema: {
                    properties: {
                        modifierKeys: {
                            allOf: [
                                {contains: {const: 'alt'}},
                                {contains: {const: 'shift'}},
                            ],
                            minItems: 2,
                            type: 'array',
                        },
                    },
                    required: ['modifierKeys'],
                },
                inputs: [
                    {context: {depth: 0, modifierKeys: [], url: 'http://example.com/'}, expected: false},
                    {context: {depth: 0, modifierKeys: ['alt'], url: 'http://example.com/'}, expected: false},
                    {context: {depth: 0, modifierKeys: ['alt', 'shift'], url: 'http://example.com/'},  expected: true},
                    {context: {depth: 0, modifierKeys: ['alt', 'shift', 'ctrl'], url: 'http://example.com/'},  expected: true},
                ],
            },
            {
                conditionGroups: [
                    {
                        conditions: [
                            {
                                operator: 'notInclude',
                                type: 'modifierKeys',
                                value: '',
                            },
                        ],
                    },
                ],
                expectedSchema: {
                    properties: {
                        modifierKeys: {
                            type: 'array',
                        },
                    },
                    required: ['modifierKeys'],
                },
                inputs: [
                    {context: {depth: 0, modifierKeys: [], url: 'http://example.com/'},  expected: true},
                    {context: {depth: 0, modifierKeys: ['alt'], url: 'http://example.com/'},  expected: true},
                    {context: {depth: 0, modifierKeys: ['alt', 'shift'], url: 'http://example.com/'},  expected: true},
                    {context: {depth: 0, modifierKeys: ['alt', 'shift', 'ctrl'], url: 'http://example.com/'},  expected: true},
                ],
            },
            {
                conditionGroups: [
                    {
                        conditions: [
                            {
                                operator: 'notInclude',
                                type: 'modifierKeys',
                                value: 'alt, shift',
                            },
                        ],
                    },
                ],
                expectedSchema: {
                    properties: {
                        modifierKeys: {
                            not: {
                                anyOf: [
                                    {contains: {const: 'alt'}},
                                    {contains: {const: 'shift'}},
                                ],
                            },
                            type: 'array',
                        },
                    },
                    required: ['modifierKeys'],
                },
                inputs: [
                    {context: {depth: 0, modifierKeys: [], url: 'http://example.com/'},  expected: true},
                    {context: {depth: 0, modifierKeys: ['alt'], url: 'http://example.com/'}, expected: false},
                    {context: {depth: 0, modifierKeys: ['alt', 'shift'], url: 'http://example.com/'}, expected: false},
                    {context: {depth: 0, modifierKeys: ['alt', 'shift', 'ctrl'], url: 'http://example.com/'}, expected: false},
                ],
            },

            // Flags tests
            {
                conditionGroups: [
                    {
                        conditions: [
                            {
                                operator: 'are',
                                type: 'flags',
                                value: '',
                            },
                        ],
                    },
                ],
                expectedSchema: {
                    properties: {
                        flags: {
                            maxItems: 0,
                            minItems: 0,
                            type: 'array',
                        },
                    },
                    required: ['flags'],
                },
                inputs: [
                    {context: {depth: 0, url: ''},  expected: true},
                    {context: {depth: 0, flags: [], url: ''},  expected: true},
                    {context: {depth: 0, flags: ['clipboard'], url: ''}, expected: false},
                    // @ts-expect-error - Ignore type for string flag for testing purposes
                    {context: {depth: 0, flags: ['clipboard', 'test2'], url: ''}, expected: false},
                    // @ts-expect-error - Ignore type for string flag for testing purposes
                    {context: {depth: 0, flags: ['clipboard', 'test2', 'test3'], url: ''}, expected: false},
                ],
            },
            {
                conditionGroups: [
                    {
                        conditions: [
                            {
                                operator: 'are',
                                type: 'flags',
                                value: 'clipboard, test2',
                            },
                        ],
                    },
                ],
                expectedSchema: {
                    properties: {
                        flags: {
                            allOf: [
                                {contains: {const: 'clipboard'}},
                                {contains: {const: 'test2'}},
                            ],
                            maxItems: 2,
                            minItems: 2,
                            type: 'array',
                        },
                    },
                    required: ['flags'],
                },
                inputs: [
                    {context: {depth: 0, url: ''}, expected: false},
                    {context: {depth: 0, flags: [], url: ''}, expected: false},
                    {context: {depth: 0, flags: ['clipboard'], url: ''}, expected: false},
                    // @ts-expect-error - Ignore type for string flag for testing purposes
                    {context: {depth: 0, flags: ['clipboard', 'test2'], url: ''},  expected: true},
                    // @ts-expect-error - Ignore type for string flag for testing purposes
                    {context: {depth: 0, flags: ['clipboard', 'test2', 'test3'], url: ''}, expected: false},
                ],
            },
            {
                conditionGroups: [
                    {
                        conditions: [
                            {
                                operator: 'areNot',
                                type: 'flags',
                                value: '',
                            },
                        ],
                    },
                ],
                expectedSchema: {
                    not: {
                        anyOf: [
                            {
                                properties: {
                                    flags: {
                                        maxItems: 0,
                                        minItems: 0,
                                        type: 'array',
                                    },
                                },
                                required: ['flags'],
                            },
                        ],
                    },
                },
                inputs: [
                    {context: {depth: 0, url: ''}, expected: false},
                    {context: {depth: 0, flags: [], url: ''}, expected: false},
                    {context: {depth: 0, flags: ['clipboard'], url: ''},  expected: true},
                    // @ts-expect-error - Ignore type for string flag for testing purposes
                    {context: {depth: 0, flags: ['clipboard', 'test2'], url: ''},  expected: true},
                    // @ts-expect-error - Ignore type for string flag for testing purposes
                    {context: {depth: 0, flags: ['clipboard', 'test2', 'test3'], url: ''},  expected: true},
                ],
            },
            {
                conditionGroups: [
                    {
                        conditions: [
                            {
                                operator: 'areNot',
                                type: 'flags',
                                value: 'clipboard, test2',
                            },
                        ],
                    },
                ],
                expectedSchema: {
                    not: {
                        anyOf: [
                            {
                                properties: {
                                    flags: {
                                        allOf: [
                                            {contains: {const: 'clipboard'}},
                                            {contains: {const: 'test2'}},
                                        ],
                                        maxItems: 2,
                                        minItems: 2,
                                        type: 'array',
                                    },
                                },
                                required: ['flags'],
                            },
                        ],
                    },
                },
                inputs: [
                    {context: {depth: 0, url: ''},  expected: true},
                    {context: {depth: 0, flags: [], url: ''},  expected: true},
                    {context: {depth: 0, flags: ['clipboard'], url: ''},  expected: true},
                    // @ts-expect-error - Ignore type for string flag for testing purposes
                    {context: {depth: 0, flags: ['clipboard', 'test2'], url: ''}, expected: false},
                    // @ts-expect-error - Ignore type for string flag for testing purposes
                    {context: {depth: 0, flags: ['clipboard', 'test2', 'test3'], url: ''},  expected: true},
                ],
            },
            {
                conditionGroups: [
                    {
                        conditions: [
                            {
                                operator: 'include',
                                type: 'flags',
                                value: '',
                            },
                        ],
                    },
                ],
                expectedSchema: {
                    properties: {
                        flags: {
                            minItems: 0,
                            type: 'array',
                        },
                    },
                    required: ['flags'],
                },
                inputs: [
                    {context: {depth: 0, url: ''},  expected: true},
                    {context: {depth: 0, flags: [], url: ''},  expected: true},
                    {context: {depth: 0, flags: ['clipboard'], url: ''},  expected: true},
                    // @ts-expect-error - Ignore type for string flag for testing purposes
                    {context: {depth: 0, flags: ['clipboard', 'test2'], url: ''},  expected: true},
                    // @ts-expect-error - Ignore type for string flag for testing purposes
                    {context: {depth: 0, flags: ['clipboard', 'test2', 'test3'], url: ''},  expected: true},
                ],
            },
            {
                conditionGroups: [
                    {
                        conditions: [
                            {
                                operator: 'include',
                                type: 'flags',
                                value: 'clipboard, test2',
                            },
                        ],
                    },
                ],
                expectedSchema: {
                    properties: {
                        flags: {
                            allOf: [
                                {contains: {const: 'clipboard'}},
                                {contains: {const: 'test2'}},
                            ],
                            minItems: 2,
                            type: 'array',
                        },
                    },
                    required: ['flags'],
                },
                inputs: [
                    {context: {depth: 0, url: ''}, expected: false},
                    {context: {depth: 0, flags: [], url: ''}, expected: false},
                    {context: {depth: 0, flags: ['clipboard'], url: ''}, expected: false},
                    // @ts-expect-error - Ignore type for string flag for testing purposes
                    {context: {depth: 0, flags: ['clipboard', 'test2'], url: ''},  expected: true},
                    // @ts-expect-error - Ignore type for string flag for testing purposes
                    {context: {depth: 0, flags: ['clipboard', 'test2', 'test3'], url: ''},  expected: true},
                ],
            },
            {
                conditionGroups: [
                    {
                        conditions: [
                            {
                                operator: 'notInclude',
                                type: 'flags',
                                value: '',
                            },
                        ],
                    },
                ],
                expectedSchema: {
                    properties: {
                        flags: {
                            type: 'array',
                        },
                    },
                    required: ['flags'],
                },
                inputs: [
                    {context: {depth: 0, url: ''},  expected: true},
                    {context: {depth: 0, flags: [], url: ''},  expected: true},
                    {context: {depth: 0, flags: ['clipboard'], url: ''},  expected: true},
                    // @ts-expect-error - Ignore type for string flag for testing purposes
                    {context: {depth: 0, flags: ['clipboard', 'test2'], url: ''},  expected: true},
                    // @ts-expect-error - Ignore type for string flag for testing purposes
                    {context: {depth: 0, flags: ['clipboard', 'test2', 'test3'], url: ''},  expected: true},
                ],
            },
            {
                conditionGroups: [
                    {
                        conditions: [
                            {
                                operator: 'notInclude',
                                type: 'flags',
                                value: 'clipboard, test2',
                            },
                        ],
                    },
                ],
                expectedSchema: {
                    properties: {
                        flags: {
                            not: {
                                anyOf: [
                                    {contains: {const: 'clipboard'}},
                                    {contains: {const: 'test2'}},
                                ],
                            },
                            type: 'array',
                        },
                    },
                    required: ['flags'],
                },
                inputs: [
                    {context: {depth: 0, url: ''},  expected: true},
                    {context: {depth: 0, flags: [], url: ''},  expected: true},
                    {context: {depth: 0, flags: ['clipboard'], url: ''}, expected: false},
                    // @ts-expect-error - Ignore type for string flag for testing purposes
                    {context: {depth: 0, flags: ['clipboard', 'test2'], url: ''}, expected: false},
                    // @ts-expect-error - Ignore type for string flag for testing purposes
                    {context: {depth: 0, flags: ['clipboard', 'test2', 'test3'], url: ''}, expected: false},
                ],
            },

            // Multiple conditions tests
            {
                conditionGroups: [
                    {
                        conditions: [
                            {
                                operator: 'greaterThan',
                                type: 'popupLevel',
                                value: '0',
                            },
                            {
                                operator: 'lessThan',
                                type: 'popupLevel',
                                value: '3',
                            },
                        ],
                    },
                ],
                expectedSchema: {
                    allOf: [
                        {
                            properties: {
                                depth: {
                                    exclusiveMinimum: 0,
                                    type: 'number',
                                },
                            },
                            required: ['depth'],
                        },
                        {
                            properties: {
                                depth: {
                                    exclusiveMaximum: 3,
                                    type: 'number',
                                },
                            },
                            required: ['depth'],
                        },
                    ],
                },
                inputs: [
                    {context: {depth: -2, url: 'http://example.com/'}, expected: false},
                    {context: {depth: -1, url: 'http://example.com/'}, expected: false},
                    {context: {depth: 0, url: 'http://example.com/'}, expected: false},
                    {context: {depth: 1, url: 'http://example.com/'},  expected: true},
                    {context: {depth: 2, url: 'http://example.com/'},  expected: true},
                    {context: {depth: 3, url: 'http://example.com/'}, expected: false},
                ],
            },
            {
                conditionGroups: [
                    {
                        conditions: [
                            {
                                operator: 'greaterThan',
                                type: 'popupLevel',
                                value: '0',
                            },
                            {
                                operator: 'lessThan',
                                type: 'popupLevel',
                                value: '3',
                            },
                        ],
                    },
                    {
                        conditions: [
                            {
                                operator: 'equal',
                                type: 'popupLevel',
                                value: '0',
                            },
                        ],
                    },
                ],
                expectedSchema: {
                    anyOf: [
                        {
                            allOf: [
                                {
                                    properties: {
                                        depth: {
                                            exclusiveMinimum: 0,
                                            type: 'number',
                                        },
                                    },
                                    required: ['depth'],
                                },
                                {
                                    properties: {
                                        depth: {
                                            exclusiveMaximum: 3,
                                            type: 'number',
                                        },
                                    },
                                    required: ['depth'],
                                },
                            ],
                        },
                        {
                            properties: {
                                depth: {const: 0},
                            },
                            required: ['depth'],
                        },
                    ],
                },
                inputs: [
                    {context: {depth: -2, url: 'http://example.com/'}, expected: false},
                    {context: {depth: -1, url: 'http://example.com/'}, expected: false},
                    {context: {depth: 0, url: 'http://example.com/'},  expected: true},
                    {context: {depth: 1, url: 'http://example.com/'},  expected: true},
                    {context: {depth: 2, url: 'http://example.com/'},  expected: true},
                    {context: {depth: 3, url: 'http://example.com/'}, expected: false},
                ],
            },
            {
                conditionGroups: [
                    {
                        conditions: [
                            {
                                operator: 'greaterThan',
                                type: 'popupLevel',
                                value: '0',
                            },
                            {
                                operator: 'lessThan',
                                type: 'popupLevel',
                                value: '3',
                            },
                        ],
                    },
                    {
                        conditions: [
                            {
                                operator: 'lessThanOrEqual',
                                type: 'popupLevel',
                                value: '0',
                            },
                            {
                                operator: 'greaterThanOrEqual',
                                type: 'popupLevel',
                                value: '-1',
                            },
                        ],
                    },
                ],
                expectedSchema: {
                    anyOf: [
                        {
                            allOf: [
                                {
                                    properties: {
                                        depth: {
                                            exclusiveMinimum: 0,
                                            type: 'number',
                                        },
                                    },
                                    required: ['depth'],
                                },
                                {
                                    properties: {
                                        depth: {
                                            exclusiveMaximum: 3,
                                            type: 'number',
                                        },
                                    },
                                    required: ['depth'],
                                },
                            ],
                        },
                        {
                            allOf: [
                                {
                                    properties: {
                                        depth: {
                                            maximum: 0,
                                            type: 'number',
                                        },
                                    },
                                    required: ['depth'],
                                },
                                {
                                    properties: {
                                        depth: {
                                            minimum: -1,
                                            type: 'number',
                                        },
                                    },
                                    required: ['depth'],
                                },
                            ],
                        },
                    ],
                },
                inputs: [
                    {context: {depth: -2, url: 'http://example.com/'}, expected: false},
                    {context: {depth: -1, url: 'http://example.com/'},  expected: true},
                    {context: {depth: 0, url: 'http://example.com/'},  expected: true},
                    {context: {depth: 1, url: 'http://example.com/'},  expected: true},
                    {context: {depth: 2, url: 'http://example.com/'},  expected: true},
                    {context: {depth: 3, url: 'http://example.com/'}, expected: false},
                ],
            },
        ];
        /* eslint-enable @stylistic/no-multi-spaces */

        test.each(data)('schemas-test-%#', ({conditionGroups, expectedSchema, inputs}) => {
            const schema = createSchema(conditionGroups);
            if (typeof expectedSchema !== 'undefined') {
                expect(schema.schema).toStrictEqual(expectedSchema);
            }
            if (Array.isArray(inputs)) {
                for (const {context, expected} of inputs) {
                    const normalizedContext = normalizeContext(context);
                    const actual = schema.isValid(normalizedContext);
                    expect(actual).toStrictEqual(expected);
                }
            }
        });
    });
});
