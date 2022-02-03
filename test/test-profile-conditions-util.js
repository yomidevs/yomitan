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


const vm = new VM({});
vm.execute([
    'js/core.js',
    'js/general/cache-map.js',
    'js/data/json-schema.js',
    'js/background/profile-conditions-util.js'
]);
const [ProfileConditionsUtil] = vm.get(['ProfileConditionsUtil']);


function testNormalizeContext() {
    const data = [
        // Empty
        {
            context: {},
            expected: {flags: []}
        },

        // Domain normalization
        {
            context: {url: ''},
            expected: {url: '', flags: []}
        },
        {
            context: {url: 'http://example.com/'},
            expected: {url: 'http://example.com/', domain: 'example.com', flags: []}
        },
        {
            context: {url: 'http://example.com:1234/'},
            expected: {url: 'http://example.com:1234/', domain: 'example.com', flags: []}
        },
        {
            context: {url: 'http://user@example.com:1234/'},
            expected: {url: 'http://user@example.com:1234/', domain: 'example.com', flags: []}
        }
    ];

    for (const {context, expected} of data) {
        const profileConditionsUtil = new ProfileConditionsUtil();
        const actual = profileConditionsUtil.normalizeContext(context);
        vm.assert.deepStrictEqual(actual, expected);
    }
}

function testSchemas() {
    const data = [
        // Empty
        {
            conditionGroups: [],
            expectedSchema: {},
            inputs: [
                {expected: true, context: {url: 'http://example.com/'}}
            ]
        },
        {
            conditionGroups: [
                {conditions: []}
            ],
            expectedSchema: {},
            inputs: [
                {expected: true, context: {url: 'http://example.com/'}}
            ]
        },
        {
            conditionGroups: [
                {conditions: []},
                {conditions: []}
            ],
            expectedSchema: {},
            inputs: [
                {expected: true, context: {url: 'http://example.com/'}}
            ]
        },

        // popupLevel tests
        {
            conditionGroups: [
                {
                    conditions: [
                        {
                            type: 'popupLevel',
                            operator: 'equal',
                            value: '0'
                        }
                    ]
                }
            ],
            expectedSchema: {
                properties: {
                    depth: {const: 0}
                },
                required: ['depth']
            },
            inputs: [
                {expected: true,  context: {depth: 0, url: 'http://example.com/'}},
                {expected: false, context: {depth: 1, url: 'http://example.com/'}},
                {expected: false, context: {depth: -1, url: 'http://example.com/'}}
            ]
        },
        {
            conditionGroups: [
                {
                    conditions: [
                        {
                            type: 'popupLevel',
                            operator: 'notEqual',
                            value: '0'
                        }
                    ]
                }
            ],
            expectedSchema: {
                not: [
                    {
                        properties: {
                            depth: {const: 0}
                        },
                        required: ['depth']
                    }
                ]
            },
            inputs: [
                {expected: false, context: {depth: 0, url: 'http://example.com/'}},
                {expected: true,  context: {depth: 1, url: 'http://example.com/'}},
                {expected: true,  context: {depth: -1, url: 'http://example.com/'}}
            ]
        },
        {
            conditionGroups: [
                {
                    conditions: [
                        {
                            type: 'popupLevel',
                            operator: 'lessThan',
                            value: '0'
                        }
                    ]
                }
            ],
            expectedSchema: {
                properties: {
                    depth: {
                        type: 'number',
                        exclusiveMaximum: 0
                    }
                },
                required: ['depth']
            },
            inputs: [
                {expected: false, context: {depth: 0, url: 'http://example.com/'}},
                {expected: false, context: {depth: 1, url: 'http://example.com/'}},
                {expected: true,  context: {depth: -1, url: 'http://example.com/'}}
            ]
        },
        {
            conditionGroups: [
                {
                    conditions: [
                        {
                            type: 'popupLevel',
                            operator: 'greaterThan',
                            value: '0'
                        }
                    ]
                }
            ],
            expectedSchema: {
                properties: {
                    depth: {
                        type: 'number',
                        exclusiveMinimum: 0
                    }
                },
                required: ['depth']
            },
            inputs: [
                {expected: false, context: {depth: 0, url: 'http://example.com/'}},
                {expected: true,  context: {depth: 1, url: 'http://example.com/'}},
                {expected: false, context: {depth: -1, url: 'http://example.com/'}}
            ]
        },
        {
            conditionGroups: [
                {
                    conditions: [
                        {
                            type: 'popupLevel',
                            operator: 'lessThanOrEqual',
                            value: '0'
                        }
                    ]
                }
            ],
            expectedSchema: {
                properties: {
                    depth: {
                        type: 'number',
                        maximum: 0
                    }
                },
                required: ['depth']
            },
            inputs: [
                {expected: true,  context: {depth: 0, url: 'http://example.com/'}},
                {expected: false, context: {depth: 1, url: 'http://example.com/'}},
                {expected: true,  context: {depth: -1, url: 'http://example.com/'}}
            ]
        },
        {
            conditionGroups: [
                {
                    conditions: [
                        {
                            type: 'popupLevel',
                            operator: 'greaterThanOrEqual',
                            value: '0'
                        }
                    ]
                }
            ],
            expectedSchema: {
                properties: {
                    depth: {
                        type: 'number',
                        minimum: 0
                    }
                },
                required: ['depth']
            },
            inputs: [
                {expected: true,  context: {depth: 0, url: 'http://example.com/'}},
                {expected: true,  context: {depth: 1, url: 'http://example.com/'}},
                {expected: false, context: {depth: -1, url: 'http://example.com/'}}
            ]
        },

        // url tests
        {
            conditionGroups: [
                {
                    conditions: [
                        {
                            type: 'url',
                            operator: 'matchDomain',
                            value: 'example.com'
                        }
                    ]
                }
            ],
            expectedSchema: {
                properties: {
                    domain: {
                        oneOf: [
                            {const: 'example.com'}
                        ]
                    }
                },
                required: ['domain']
            },
            inputs: [
                {expected: true,  context: {depth: 0, url: 'http://example.com/'}},
                {expected: false, context: {depth: 0, url: 'http://example1.com/'}},
                {expected: false, context: {depth: 0, url: 'http://example2.com/'}},
                {expected: true,  context: {depth: 0, url: 'http://example.com:1234/'}},
                {expected: true,  context: {depth: 0, url: 'http://user@example.com:1234/'}}
            ]
        },
        {
            conditionGroups: [
                {
                    conditions: [
                        {
                            type: 'url',
                            operator: 'matchDomain',
                            value: 'example.com, example1.com, example2.com'
                        }
                    ]
                }
            ],
            expectedSchema: {
                properties: {
                    domain: {
                        oneOf: [
                            {const: 'example.com'},
                            {const: 'example1.com'},
                            {const: 'example2.com'}
                        ]
                    }
                },
                required: ['domain']
            },
            inputs: [
                {expected: true,  context: {depth: 0, url: 'http://example.com/'}},
                {expected: true,  context: {depth: 0, url: 'http://example1.com/'}},
                {expected: true,  context: {depth: 0, url: 'http://example2.com/'}},
                {expected: false, context: {depth: 0, url: 'http://example3.com/'}},
                {expected: true,  context: {depth: 0, url: 'http://example.com:1234/'}},
                {expected: true,  context: {depth: 0, url: 'http://user@example.com:1234/'}}
            ]
        },
        {
            conditionGroups: [
                {
                    conditions: [
                        {
                            type: 'url',
                            operator: 'matchRegExp',
                            value: '^http://example\\d?\\.com/[\\w\\W]*$'
                        }
                    ]
                }
            ],
            expectedSchema: {
                properties: {
                    url: {
                        type: 'string',
                        pattern: '^http://example\\d?\\.com/[\\w\\W]*$',
                        patternFlags: 'i'
                    }
                },
                required: ['url']
            },
            inputs: [
                {expected: true,  context: {depth: 0, url: 'http://example.com/'}},
                {expected: true,  context: {depth: 0, url: 'http://example1.com/'}},
                {expected: true,  context: {depth: 0, url: 'http://example2.com/'}},
                {expected: true,  context: {depth: 0, url: 'http://example3.com/'}},
                {expected: true,  context: {depth: 0, url: 'http://example.com/example'}},
                {expected: false, context: {depth: 0, url: 'http://example.com:1234/'}},
                {expected: false, context: {depth: 0, url: 'http://user@example.com:1234/'}},
                {expected: false, context: {depth: 0, url: 'http://example-1.com/'}}
            ]
        },

        // modifierKeys tests
        {
            conditionGroups: [
                {
                    conditions: [
                        {
                            type: 'modifierKeys',
                            operator: 'are',
                            value: ''
                        }
                    ]
                }
            ],
            expectedSchema: {
                properties: {
                    modifierKeys: {
                        type: 'array',
                        maxItems: 0,
                        minItems: 0
                    }
                },
                required: ['modifierKeys']
            },
            inputs: [
                {expected: true,  context: {depth: 0, url: 'http://example.com/', modifierKeys: []}},
                {expected: false, context: {depth: 0, url: 'http://example.com/', modifierKeys: ['Alt']}},
                {expected: false, context: {depth: 0, url: 'http://example.com/', modifierKeys: ['Alt', 'Shift']}},
                {expected: false, context: {depth: 0, url: 'http://example.com/', modifierKeys: ['Alt', 'Shift', 'Ctrl']}}
            ]
        },
        {
            conditionGroups: [
                {
                    conditions: [
                        {
                            type: 'modifierKeys',
                            operator: 'are',
                            value: 'Alt, Shift'
                        }
                    ]
                }
            ],
            expectedSchema: {
                properties: {
                    modifierKeys: {
                        type: 'array',
                        maxItems: 2,
                        minItems: 2,
                        allOf: [
                            {contains: {const: 'Alt'}},
                            {contains: {const: 'Shift'}}
                        ]
                    }
                },
                required: ['modifierKeys']
            },
            inputs: [
                {expected: false, context: {depth: 0, url: 'http://example.com/', modifierKeys: []}},
                {expected: false, context: {depth: 0, url: 'http://example.com/', modifierKeys: ['Alt']}},
                {expected: true,  context: {depth: 0, url: 'http://example.com/', modifierKeys: ['Alt', 'Shift']}},
                {expected: false, context: {depth: 0, url: 'http://example.com/', modifierKeys: ['Alt', 'Shift', 'Ctrl']}}
            ]
        },
        {
            conditionGroups: [
                {
                    conditions: [
                        {
                            type: 'modifierKeys',
                            operator: 'areNot',
                            value: ''
                        }
                    ]
                }
            ],
            expectedSchema: {
                not: [
                    {
                        properties: {
                            modifierKeys: {
                                type: 'array',
                                maxItems: 0,
                                minItems: 0
                            }
                        },
                        required: ['modifierKeys']
                    }
                ]
            },
            inputs: [
                {expected: false, context: {depth: 0, url: 'http://example.com/', modifierKeys: []}},
                {expected: true,  context: {depth: 0, url: 'http://example.com/', modifierKeys: ['Alt']}},
                {expected: true,  context: {depth: 0, url: 'http://example.com/', modifierKeys: ['Alt', 'Shift']}},
                {expected: true,  context: {depth: 0, url: 'http://example.com/', modifierKeys: ['Alt', 'Shift', 'Ctrl']}}
            ]
        },
        {
            conditionGroups: [
                {
                    conditions: [
                        {
                            type: 'modifierKeys',
                            operator: 'areNot',
                            value: 'Alt, Shift'
                        }
                    ]
                }
            ],
            expectedSchema: {
                not: [
                    {
                        properties: {
                            modifierKeys: {
                                type: 'array',
                                maxItems: 2,
                                minItems: 2,
                                allOf: [
                                    {contains: {const: 'Alt'}},
                                    {contains: {const: 'Shift'}}
                                ]
                            }
                        },
                        required: ['modifierKeys']
                    }
                ]
            },
            inputs: [
                {expected: true,  context: {depth: 0, url: 'http://example.com/', modifierKeys: []}},
                {expected: true,  context: {depth: 0, url: 'http://example.com/', modifierKeys: ['Alt']}},
                {expected: false, context: {depth: 0, url: 'http://example.com/', modifierKeys: ['Alt', 'Shift']}},
                {expected: true,  context: {depth: 0, url: 'http://example.com/', modifierKeys: ['Alt', 'Shift', 'Ctrl']}}
            ]
        },
        {
            conditionGroups: [
                {
                    conditions: [
                        {
                            type: 'modifierKeys',
                            operator: 'include',
                            value: ''
                        }
                    ]
                }
            ],
            expectedSchema: {
                properties: {
                    modifierKeys: {
                        type: 'array',
                        minItems: 0
                    }
                },
                required: ['modifierKeys']
            },
            inputs: [
                {expected: true,  context: {depth: 0, url: 'http://example.com/', modifierKeys: []}},
                {expected: true,  context: {depth: 0, url: 'http://example.com/', modifierKeys: ['Alt']}},
                {expected: true,  context: {depth: 0, url: 'http://example.com/', modifierKeys: ['Alt', 'Shift']}},
                {expected: true,  context: {depth: 0, url: 'http://example.com/', modifierKeys: ['Alt', 'Shift', 'Ctrl']}}
            ]
        },
        {
            conditionGroups: [
                {
                    conditions: [
                        {
                            type: 'modifierKeys',
                            operator: 'include',
                            value: 'Alt, Shift'
                        }
                    ]
                }
            ],
            expectedSchema: {
                properties: {
                    modifierKeys: {
                        type: 'array',
                        minItems: 2,
                        allOf: [
                            {contains: {const: 'Alt'}},
                            {contains: {const: 'Shift'}}
                        ]
                    }
                },
                required: ['modifierKeys']
            },
            inputs: [
                {expected: false, context: {depth: 0, url: 'http://example.com/', modifierKeys: []}},
                {expected: false, context: {depth: 0, url: 'http://example.com/', modifierKeys: ['Alt']}},
                {expected: true,  context: {depth: 0, url: 'http://example.com/', modifierKeys: ['Alt', 'Shift']}},
                {expected: true,  context: {depth: 0, url: 'http://example.com/', modifierKeys: ['Alt', 'Shift', 'Ctrl']}}
            ]
        },
        {
            conditionGroups: [
                {
                    conditions: [
                        {
                            type: 'modifierKeys',
                            operator: 'notInclude',
                            value: ''
                        }
                    ]
                }
            ],
            expectedSchema: {
                properties: {
                    modifierKeys: {
                        type: 'array'
                    }
                },
                required: ['modifierKeys']
            },
            inputs: [
                {expected: true,  context: {depth: 0, url: 'http://example.com/', modifierKeys: []}},
                {expected: true,  context: {depth: 0, url: 'http://example.com/', modifierKeys: ['Alt']}},
                {expected: true,  context: {depth: 0, url: 'http://example.com/', modifierKeys: ['Alt', 'Shift']}},
                {expected: true,  context: {depth: 0, url: 'http://example.com/', modifierKeys: ['Alt', 'Shift', 'Ctrl']}}
            ]
        },
        {
            conditionGroups: [
                {
                    conditions: [
                        {
                            type: 'modifierKeys',
                            operator: 'notInclude',
                            value: 'Alt, Shift'
                        }
                    ]
                }
            ],
            expectedSchema: {
                properties: {
                    modifierKeys: {
                        type: 'array',
                        not: [
                            {contains: {const: 'Alt'}},
                            {contains: {const: 'Shift'}}
                        ]
                    }
                },
                required: ['modifierKeys']
            },
            inputs: [
                {expected: true,  context: {depth: 0, url: 'http://example.com/', modifierKeys: []}},
                {expected: false, context: {depth: 0, url: 'http://example.com/', modifierKeys: ['Alt']}},
                {expected: false, context: {depth: 0, url: 'http://example.com/', modifierKeys: ['Alt', 'Shift']}},
                {expected: false, context: {depth: 0, url: 'http://example.com/', modifierKeys: ['Alt', 'Shift', 'Ctrl']}}
            ]
        },

        // flags tests
        {
            conditionGroups: [
                {
                    conditions: [
                        {
                            type: 'flags',
                            operator: 'are',
                            value: ''
                        }
                    ]
                }
            ],
            expectedSchema: {
                required: ['flags'],
                properties: {
                    flags: {
                        type: 'array',
                        maxItems: 0,
                        minItems: 0
                    }
                }
            },
            inputs: [
                {expected: true,  context: {}},
                {expected: true,  context: {flags: []}},
                {expected: false, context: {flags: ['test1']}},
                {expected: false, context: {flags: ['test1', 'test2']}},
                {expected: false, context: {flags: ['test1', 'test2', 'test3']}}
            ]
        },
        {
            conditionGroups: [
                {
                    conditions: [
                        {
                            type: 'flags',
                            operator: 'are',
                            value: 'test1, test2'
                        }
                    ]
                }
            ],
            expectedSchema: {
                required: ['flags'],
                properties: {
                    flags: {
                        type: 'array',
                        maxItems: 2,
                        minItems: 2,
                        allOf: [
                            {contains: {const: 'test1'}},
                            {contains: {const: 'test2'}}
                        ]
                    }
                }
            },
            inputs: [
                {expected: false, context: {}},
                {expected: false, context: {flags: []}},
                {expected: false, context: {flags: ['test1']}},
                {expected: true,  context: {flags: ['test1', 'test2']}},
                {expected: false, context: {flags: ['test1', 'test2', 'test3']}}
            ]
        },
        {
            conditionGroups: [
                {
                    conditions: [
                        {
                            type: 'flags',
                            operator: 'areNot',
                            value: ''
                        }
                    ]
                }
            ],
            expectedSchema: {
                not: [
                    {
                        required: ['flags'],
                        properties: {
                            flags: {
                                type: 'array',
                                maxItems: 0,
                                minItems: 0
                            }
                        }
                    }
                ]
            },
            inputs: [
                {expected: false, context: {}},
                {expected: false, context: {flags: []}},
                {expected: true,  context: {flags: ['test1']}},
                {expected: true,  context: {flags: ['test1', 'test2']}},
                {expected: true,  context: {flags: ['test1', 'test2', 'test3']}}
            ]
        },
        {
            conditionGroups: [
                {
                    conditions: [
                        {
                            type: 'flags',
                            operator: 'areNot',
                            value: 'test1, test2'
                        }
                    ]
                }
            ],
            expectedSchema: {
                not: [
                    {
                        required: ['flags'],
                        properties: {
                            flags: {
                                type: 'array',
                                maxItems: 2,
                                minItems: 2,
                                allOf: [
                                    {contains: {const: 'test1'}},
                                    {contains: {const: 'test2'}}
                                ]
                            }
                        }
                    }
                ]
            },
            inputs: [
                {expected: true,  context: {}},
                {expected: true,  context: {flags: []}},
                {expected: true,  context: {flags: ['test1']}},
                {expected: false, context: {flags: ['test1', 'test2']}},
                {expected: true,  context: {flags: ['test1', 'test2', 'test3']}}
            ]
        },
        {
            conditionGroups: [
                {
                    conditions: [
                        {
                            type: 'flags',
                            operator: 'include',
                            value: ''
                        }
                    ]
                }
            ],
            expectedSchema: {
                required: ['flags'],
                properties: {
                    flags: {
                        type: 'array',
                        minItems: 0
                    }
                }
            },
            inputs: [
                {expected: true,  context: {}},
                {expected: true,  context: {flags: []}},
                {expected: true,  context: {flags: ['test1']}},
                {expected: true,  context: {flags: ['test1', 'test2']}},
                {expected: true,  context: {flags: ['test1', 'test2', 'test3']}}
            ]
        },
        {
            conditionGroups: [
                {
                    conditions: [
                        {
                            type: 'flags',
                            operator: 'include',
                            value: 'test1, test2'
                        }
                    ]
                }
            ],
            expectedSchema: {
                required: ['flags'],
                properties: {
                    flags: {
                        type: 'array',
                        minItems: 2,
                        allOf: [
                            {contains: {const: 'test1'}},
                            {contains: {const: 'test2'}}
                        ]
                    }
                }
            },
            inputs: [
                {expected: false, context: {}},
                {expected: false, context: {flags: []}},
                {expected: false, context: {flags: ['test1']}},
                {expected: true,  context: {flags: ['test1', 'test2']}},
                {expected: true,  context: {flags: ['test1', 'test2', 'test3']}}
            ]
        },
        {
            conditionGroups: [
                {
                    conditions: [
                        {
                            type: 'flags',
                            operator: 'notInclude',
                            value: ''
                        }
                    ]
                }
            ],
            expectedSchema: {
                required: ['flags'],
                properties: {
                    flags: {
                        type: 'array'
                    }
                }
            },
            inputs: [
                {expected: true,  context: {}},
                {expected: true,  context: {flags: []}},
                {expected: true,  context: {flags: ['test1']}},
                {expected: true,  context: {flags: ['test1', 'test2']}},
                {expected: true,  context: {flags: ['test1', 'test2', 'test3']}}
            ]
        },
        {
            conditionGroups: [
                {
                    conditions: [
                        {
                            type: 'flags',
                            operator: 'notInclude',
                            value: 'test1, test2'
                        }
                    ]
                }
            ],
            expectedSchema: {
                required: ['flags'],
                properties: {
                    flags: {
                        type: 'array',
                        not: [
                            {contains: {const: 'test1'}},
                            {contains: {const: 'test2'}}
                        ]
                    }
                }
            },
            inputs: [
                {expected: true,  context: {}},
                {expected: true,  context: {flags: []}},
                {expected: false, context: {flags: ['test1']}},
                {expected: false, context: {flags: ['test1', 'test2']}},
                {expected: false, context: {flags: ['test1', 'test2', 'test3']}}
            ]
        },

        // Multiple conditions tests
        {
            conditionGroups: [
                {
                    conditions: [
                        {
                            type: 'popupLevel',
                            operator: 'greaterThan',
                            value: '0'
                        },
                        {
                            type: 'popupLevel',
                            operator: 'lessThan',
                            value: '3'
                        }
                    ]
                }
            ],
            expectedSchema: {
                allOf: [
                    {
                        properties: {
                            depth: {
                                type: 'number',
                                exclusiveMinimum: 0
                            }
                        },
                        required: ['depth']
                    },
                    {
                        properties: {
                            depth: {
                                type: 'number',
                                exclusiveMaximum: 3
                            }
                        },
                        required: ['depth']
                    }
                ]
            },
            inputs: [
                {expected: false, context: {depth: -2, url: 'http://example.com/'}},
                {expected: false, context: {depth: -1, url: 'http://example.com/'}},
                {expected: false, context: {depth: 0, url: 'http://example.com/'}},
                {expected: true,  context: {depth: 1, url: 'http://example.com/'}},
                {expected: true,  context: {depth: 2, url: 'http://example.com/'}},
                {expected: false, context: {depth: 3, url: 'http://example.com/'}}
            ]
        },
        {
            conditionGroups: [
                {
                    conditions: [
                        {
                            type: 'popupLevel',
                            operator: 'greaterThan',
                            value: '0'
                        },
                        {
                            type: 'popupLevel',
                            operator: 'lessThan',
                            value: '3'
                        }
                    ]
                },
                {
                    conditions: [
                        {
                            type: 'popupLevel',
                            operator: 'equal',
                            value: '0'
                        }
                    ]
                }
            ],
            expectedSchema: {
                anyOf: [
                    {
                        allOf: [
                            {
                                properties: {
                                    depth: {
                                        type: 'number',
                                        exclusiveMinimum: 0
                                    }
                                },
                                required: ['depth']
                            },
                            {
                                properties: {
                                    depth: {
                                        type: 'number',
                                        exclusiveMaximum: 3
                                    }
                                },
                                required: ['depth']
                            }
                        ]
                    },
                    {
                        properties: {
                            depth: {const: 0}
                        },
                        required: ['depth']
                    }
                ]
            },
            inputs: [
                {expected: false, context: {depth: -2, url: 'http://example.com/'}},
                {expected: false, context: {depth: -1, url: 'http://example.com/'}},
                {expected: true,  context: {depth: 0, url: 'http://example.com/'}},
                {expected: true,  context: {depth: 1, url: 'http://example.com/'}},
                {expected: true,  context: {depth: 2, url: 'http://example.com/'}},
                {expected: false, context: {depth: 3, url: 'http://example.com/'}}
            ]
        },
        {
            conditionGroups: [
                {
                    conditions: [
                        {
                            type: 'popupLevel',
                            operator: 'greaterThan',
                            value: '0'
                        },
                        {
                            type: 'popupLevel',
                            operator: 'lessThan',
                            value: '3'
                        }
                    ]
                },
                {
                    conditions: [
                        {
                            type: 'popupLevel',
                            operator: 'lessThanOrEqual',
                            value: '0'
                        },
                        {
                            type: 'popupLevel',
                            operator: 'greaterThanOrEqual',
                            value: '-1'
                        }
                    ]
                }
            ],
            expectedSchema: {
                anyOf: [
                    {
                        allOf: [
                            {
                                properties: {
                                    depth: {
                                        type: 'number',
                                        exclusiveMinimum: 0
                                    }
                                },
                                required: ['depth']
                            },
                            {
                                properties: {
                                    depth: {
                                        type: 'number',
                                        exclusiveMaximum: 3
                                    }
                                },
                                required: ['depth']
                            }
                        ]
                    },
                    {
                        allOf: [
                            {
                                properties: {
                                    depth: {
                                        type: 'number',
                                        maximum: 0
                                    }
                                },
                                required: ['depth']
                            },
                            {
                                properties: {
                                    depth: {
                                        type: 'number',
                                        minimum: -1
                                    }
                                },
                                required: ['depth']
                            }
                        ]
                    }
                ]
            },
            inputs: [
                {expected: false, context: {depth: -2, url: 'http://example.com/'}},
                {expected: true,  context: {depth: -1, url: 'http://example.com/'}},
                {expected: true,  context: {depth: 0, url: 'http://example.com/'}},
                {expected: true,  context: {depth: 1, url: 'http://example.com/'}},
                {expected: true,  context: {depth: 2, url: 'http://example.com/'}},
                {expected: false, context: {depth: 3, url: 'http://example.com/'}}
            ]
        }
    ];

    for (const {conditionGroups, expectedSchema, inputs} of data) {
        const profileConditionsUtil = new ProfileConditionsUtil();
        const schema = profileConditionsUtil.createSchema(conditionGroups);
        if (typeof expectedSchema !== 'undefined') {
            vm.assert.deepStrictEqual(schema.schema, expectedSchema);
        }
        if (Array.isArray(inputs)) {
            for (const {expected, context} of inputs) {
                const normalizedContext = profileConditionsUtil.normalizeContext(context);
                const actual = schema.isValid(normalizedContext);
                assert.strictEqual(actual, expected);
            }
        }
    }
}


function main() {
    testNormalizeContext();
    testSchemas();
}


if (require.main === module) { testMain(main); }
