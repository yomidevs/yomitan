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
vm.execute(['js/general/text-source-map.js']);
const TextSourceMap = vm.get('TextSourceMap');


function testSource() {
    const data = [
        ['source1'],
        ['source2'],
        ['source3']
    ];

    for (const [source] of data) {
        const sourceMap = new TextSourceMap(source);
        assert.strictEqual(source, sourceMap.source);
    }
}

function testEquals() {
    const data = [
        [['source1', null], ['source1', null], true],
        [['source2', null], ['source2', null], true],
        [['source3', null], ['source3', null], true],

        [['source1', [1, 1, 1, 1, 1, 1, 1]], ['source1', null], true],
        [['source2', [1, 1, 1, 1, 1, 1, 1]], ['source2', null], true],
        [['source3', [1, 1, 1, 1, 1, 1, 1]], ['source3', null], true],

        [['source1', null], ['source1', [1, 1, 1, 1, 1, 1, 1]], true],
        [['source2', null], ['source2', [1, 1, 1, 1, 1, 1, 1]], true],
        [['source3', null], ['source3', [1, 1, 1, 1, 1, 1, 1]], true],

        [['source1', [1, 1, 1, 1, 1, 1, 1]], ['source1', [1, 1, 1, 1, 1, 1, 1]], true],
        [['source2', [1, 1, 1, 1, 1, 1, 1]], ['source2', [1, 1, 1, 1, 1, 1, 1]], true],
        [['source3', [1, 1, 1, 1, 1, 1, 1]], ['source3', [1, 1, 1, 1, 1, 1, 1]], true],

        [['source1', [1, 2, 1, 3]], ['source1', [1, 2, 1, 3]], true],
        [['source2', [1, 2, 1, 3]], ['source2', [1, 2, 1, 3]], true],
        [['source3', [1, 2, 1, 3]], ['source3', [1, 2, 1, 3]], true],

        [['source1', [1, 3, 1, 2]], ['source1', [1, 2, 1, 3]], false],
        [['source2', [1, 3, 1, 2]], ['source2', [1, 2, 1, 3]], false],
        [['source3', [1, 3, 1, 2]], ['source3', [1, 2, 1, 3]], false],

        [['source1', [1, 1, 1, 1, 1, 1, 1]], ['source4', [1, 1, 1, 1, 1, 1, 1]], false],
        [['source2', [1, 1, 1, 1, 1, 1, 1]], ['source5', [1, 1, 1, 1, 1, 1, 1]], false],
        [['source3', [1, 1, 1, 1, 1, 1, 1]], ['source6', [1, 1, 1, 1, 1, 1, 1]], false]
    ];

    for (const [[source1, mapping1], [source2, mapping2], expectedEquals] of data) {
        const sourceMap1 = new TextSourceMap(source1, mapping1);
        const sourceMap2 = new TextSourceMap(source2, mapping2);
        assert.ok(sourceMap1.equals(sourceMap1));
        assert.ok(sourceMap2.equals(sourceMap2));
        assert.strictEqual(sourceMap1.equals(sourceMap2), expectedEquals);
    }
}

function testGetSourceLength() {
    const data = [
        [['source', [1, 1, 1, 1, 1, 1]], 1, 1],
        [['source', [1, 1, 1, 1, 1, 1]], 2, 2],
        [['source', [1, 1, 1, 1, 1, 1]], 3, 3],
        [['source', [1, 1, 1, 1, 1, 1]], 4, 4],
        [['source', [1, 1, 1, 1, 1, 1]], 5, 5],
        [['source', [1, 1, 1, 1, 1, 1]], 6, 6],

        [['source', [2, 2, 2]], 1, 2],
        [['source', [2, 2, 2]], 2, 4],
        [['source', [2, 2, 2]], 3, 6],

        [['source', [3, 3]], 1, 3],
        [['source', [3, 3]], 2, 6],

        [['source', [6, 6]], 1, 6]
    ];

    for (const [[source, mapping], finalLength, expectedValue] of data) {
        const sourceMap = new TextSourceMap(source, mapping);
        assert.strictEqual(sourceMap.getSourceLength(finalLength), expectedValue);
    }
}

function testCombineInsert() {
    const data = [
        // No operations
        [
            ['source', null],
            ['source', [1, 1, 1, 1, 1, 1]],
            []
        ],

        // Combine
        [
            ['source', null],
            ['source', [3, 1, 1, 1]],
            [
                ['combine', 0, 2]
            ]
        ],
        [
            ['source', null],
            ['source', [1, 1, 1, 3]],
            [
                ['combine', 3, 2]
            ]
        ],
        [
            ['source', null],
            ['source', [3, 3]],
            [
                ['combine', 0, 2],
                ['combine', 1, 2]
            ]
        ],
        [
            ['source', null],
            ['source', [3, 3]],
            [
                ['combine', 3, 2],
                ['combine', 0, 2]
            ]
        ],

        // Insert
        [
            ['source', null],
            ['source', [0, 1, 1, 1, 1, 1, 1]],
            [
                ['insert', 0, 0]
            ]
        ],
        [
            ['source', null],
            ['source', [1, 1, 1, 1, 1, 1, 0]],
            [
                ['insert', 6, 0]
            ]
        ],
        [
            ['source', null],
            ['source', [0, 1, 1, 1, 1, 1, 1, 0]],
            [
                ['insert', 0, 0],
                ['insert', 7, 0]
            ]
        ],
        [
            ['source', null],
            ['source', [0, 1, 1, 1, 1, 1, 1, 0]],
            [
                ['insert', 6, 0],
                ['insert', 0, 0]
            ]
        ],

        // Mixed
        [
            ['source', null],
            ['source', [3, 0, 3]],
            [
                ['combine', 0, 2],
                ['insert', 1, 0],
                ['combine', 2, 2]
            ]
        ],
        [
            ['source', null],
            ['source', [3, 0, 3]],
            [
                ['combine', 0, 2],
                ['combine', 1, 2],
                ['insert', 1, 0]
            ]
        ],
        [
            ['source', null],
            ['source', [3, 0, 3]],
            [
                ['insert', 3, 0],
                ['combine', 0, 2],
                ['combine', 2, 2]
            ]
        ]
    ];

    for (const [[source, mapping], [expectedSource, expectedMapping], operations] of data) {
        const sourceMap = new TextSourceMap(source, mapping);
        const expectedSourceMap = new TextSourceMap(expectedSource, expectedMapping);
        for (const [operation, ...args] of operations) {
            switch (operation) {
                case 'combine':
                    sourceMap.combine(...args);
                    break;
                case 'insert':
                    sourceMap.insert(...args);
                    break;
            }
        }
        assert.ok(sourceMap.equals(expectedSourceMap));
    }
}


function main() {
    testSource();
    testEquals();
    testGetSourceLength();
    testCombineInsert();
}


if (require.main === module) { testMain(main); }
