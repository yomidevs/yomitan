/*
 * Copyright (C) 2023-2025  Yomitan Authors
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

import {describe, expect, test, vi} from 'vitest';
import {DynamicProperty} from '../ext/js/core/dynamic-property.js';
import {
    addScopeToCss,
    addScopeToCssLegacy,
    clone,
    deepEqual,
    deferPromise,
    escapeRegExp,
    generateId,
    promiseTimeout,
    sanitizeCSS,
    stringReverse,
} from '../ext/js/core/utilities.js';
import {log} from '../ext/js/core/log.js';

describe('DynamicProperty', () => {
    /** @type {import('test/core').DynamicPropertyTestData} */
    const data = [
        {
            initialValue: 0,
            operations: [
                {
                    operation: null,
                    args: [0],
                    expectedDefaultValue: 0,
                    expectedValue: 0,
                    expectedOverrideCount: 0,
                    expectedEventOccurred: false,
                },
                {
                    operation: 'set.defaultValue',
                    args: [1],
                    expectedDefaultValue: 1,
                    expectedValue: 1,
                    expectedOverrideCount: 0,
                    expectedEventOccurred: true,
                },
                {
                    operation: 'set.defaultValue',
                    args: [1],
                    expectedDefaultValue: 1,
                    expectedValue: 1,
                    expectedOverrideCount: 0,
                    expectedEventOccurred: false,
                },
                {
                    operation: 'set.defaultValue',
                    args: [0],
                    expectedDefaultValue: 0,
                    expectedValue: 0,
                    expectedOverrideCount: 0,
                    expectedEventOccurred: true,
                },
                {
                    operation: 'setOverride',
                    args: [8],
                    expectedDefaultValue: 0,
                    expectedValue: 8,
                    expectedOverrideCount: 1,
                    expectedEventOccurred: true,
                },
                {
                    operation: 'setOverride',
                    args: [16],
                    expectedDefaultValue: 0,
                    expectedValue: 8,
                    expectedOverrideCount: 2,
                    expectedEventOccurred: false,
                },
                {
                    operation: 'setOverride',
                    args: [32, 1],
                    expectedDefaultValue: 0,
                    expectedValue: 32,
                    expectedOverrideCount: 3,
                    expectedEventOccurred: true,
                },
                {
                    operation: 'setOverride',
                    args: [64, -1],
                    expectedDefaultValue: 0,
                    expectedValue: 32,
                    expectedOverrideCount: 4,
                    expectedEventOccurred: false,
                },
                {
                    operation: 'clearOverride',
                    args: [-4],
                    expectedDefaultValue: 0,
                    expectedValue: 32,
                    expectedOverrideCount: 3,
                    expectedEventOccurred: false,
                },
                {
                    operation: 'clearOverride',
                    args: [-3],
                    expectedDefaultValue: 0,
                    expectedValue: 32,
                    expectedOverrideCount: 2,
                    expectedEventOccurred: false,
                },
                {
                    operation: 'clearOverride',
                    args: [-2],
                    expectedDefaultValue: 0,
                    expectedValue: 64,
                    expectedOverrideCount: 1,
                    expectedEventOccurred: true,
                },
                {
                    operation: 'clearOverride',
                    args: [-1],
                    expectedDefaultValue: 0,
                    expectedValue: 0,
                    expectedOverrideCount: 0,
                    expectedEventOccurred: true,
                },
            ],
        },
    ];

    describe.each(data)('Test DynamicProperty($initialValue)', ({initialValue, operations}) => {
        test('works as expected', () => {
            const property = new DynamicProperty(initialValue);
            const overrideTokens = [];
            let eventOccurred = false;
            const onChange = () => { eventOccurred = true; };
            property.on('change', onChange);
            for (const {operation, args, expectedDefaultValue, expectedValue, expectedOverrideCount, expectedEventOccurred} of operations) {
                eventOccurred = false;
                switch (operation) {
                    case 'set.defaultValue': property.defaultValue = args[0]; break;
                    case 'setOverride': overrideTokens.push(property.setOverride(...args)); break;
                    case 'clearOverride': property.clearOverride(overrideTokens[overrideTokens.length + args[0]]); break;
                }
                expect(eventOccurred).toStrictEqual(expectedEventOccurred);
                expect(property.defaultValue).toStrictEqual(expectedDefaultValue);
                expect(property.value).toStrictEqual(expectedValue);
                expect(property.overrideCount).toStrictEqual(expectedOverrideCount);
            }
            property.off('change', onChange);
        });
    });
});

describe('deepEqual', () => {
    /** @type {import('test/core').DeepEqualTestData} */
    const simpleTestsData = [
        {
            value1: 0,
            value2: 0,
            expected: true,
        },
        {
            value1: null,
            value2: null,
            expected: true,
        },
        {
            value1: 'test',
            value2: 'test',
            expected: true,
        },
        {
            value1: true,
            value2: true,
            expected: true,
        },
        {
            value1: 0,
            value2: 1,
            expected: false,
        },
        {
            value1: null,
            value2: false,
            expected: false,
        },
        {
            value1: 'test1',
            value2: 'test2',
            expected: false,
        },
        {
            value1: true,
            value2: false,
            expected: false,
        },
    ];
    /** @type {import('test/core').DeepEqualTestData} */
    const simpleObjectTestsData = [
        {
            value1: {},
            value2: {},
            expected: true,
        },
        {
            value1: {},
            value2: [],
            expected: false,
        },
        {
            value1: [],
            value2: [],
            expected: true,
        },
        {
            value1: {},
            value2: null,
            expected: false,
        },
    ];
    /** @type {import('test/core').DeepEqualTestData} */
    const complexObjectTestsData = [
        {
            value1: [1],
            value2: [],
            expected: false,
        },
        {
            value1: [1],
            value2: [1],
            expected: true,
        },
        {
            value1: [1],
            value2: [2],
            expected: false,
        },

        {
            value1: {},
            value2: {test: 1},
            expected: false,
        },
        {
            value1: {test: 1},
            value2: {test: 1},
            expected: true,
        },
        {
            value1: {test: 1},
            value2: {test: {test2: false}},
            expected: false,
        },
        {
            value1: {test: {test2: true}},
            value2: {test: {test2: false}},
            expected: false,
        },
        {
            value1: {test: {test2: [true]}},
            value2: {test: {test2: [true]}},
            expected: true,
        },
    ];
    /** @type {import('test/core').DeepEqualTestData} */
    const recursiveTestsData = [
        {
            value1: (() => {
                const x = {};
                x.x = x;
                return x;
            })(),
            value2: (() => {
                const x = {};
                x.x = x;
                return x;
            })(),
            expected: false,
        },
    ];
    describe('simple tests', () => {
        test.each(simpleTestsData)('deepEqual($value1, $value2) -> $expected', ({value1, value2, expected}) => {
            const actual1 = deepEqual(value1, value2);
            expect(actual1).toStrictEqual(expected);

            const actual2 = deepEqual(value2, value1);
            expect(actual2).toStrictEqual(expected);
        });
    });

    describe('simple object tests', () => {
        test.each(simpleObjectTestsData)('deepEqual($value1, $value2) -> $expected', ({value1, value2, expected}) => {
            const actual1 = deepEqual(value1, value2);
            expect(actual1).toStrictEqual(expected);

            const actual2 = deepEqual(value2, value1);
            expect(actual2).toStrictEqual(expected);
        });
    });

    describe('complex object tests', () => {
        test.each(complexObjectTestsData)('deepEqual($value1, $value2) -> $expected', ({value1, value2, expected}) => {
            const actual1 = deepEqual(value1, value2);
            expect(actual1).toStrictEqual(expected);

            const actual2 = deepEqual(value2, value1);
            expect(actual2).toStrictEqual(expected);
        });
    });

    describe('recursive tests', () => {
        test.each(recursiveTestsData)('deepEqual($value1, $value2) -> $expected', ({value1, value2, expected}) => {
            const actual1 = deepEqual(value1, value2);
            expect(actual1).toStrictEqual(expected);

            const actual2 = deepEqual(value2, value1);
            expect(actual2).toStrictEqual(expected);
        });
    });
});

describe('utility helpers', () => {
    test('escapeRegExp escapes regex metacharacters', () => {
        const input = 'a.b*c+d?^${}()|[]\\-';
        const escaped = escapeRegExp(input);
        expect(escaped).toBe('a\\.b\\*c\\+d\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\\\-');
        expect(new RegExp(`^${escaped}$`).test(input)).toBe(true);
    });

    test('stringReverse preserves surrogate pairs', () => {
        expect(stringReverse('A😀𠮷B')).toBe('B𠮷😀A');
    });

    test('clone deep-clones arrays and objects', () => {
        const original = {
            value: 1,
            nested: {value: 2},
            array: [{value: 3}, true, 'text', null],
        };
        const copied = clone(original);
        expect(copied).toStrictEqual(original);
        expect(copied).not.toBe(original);
        expect(copied.nested).not.toBe(original.nested);
        expect(copied.array).not.toBe(original.array);
        expect(copied.array[0]).not.toBe(original.array[0]);
    });

    test('clone preserves primitive values and throws for unsupported/circular values', () => {
        const symbol = Symbol('token');
        expect(clone(null)).toBeNull();
        expect(clone(true)).toBe(true);
        expect(clone(42)).toBe(42);
        expect(clone('text')).toBe('text');
        expect(clone(123n)).toBe(123n);
        expect(clone(symbol)).toBe(symbol);
        expect(clone(void 0)).toBe(void 0);
        expect(() => clone(() => {})).toThrow('Cannot clone object of type function');

        /** @type {{self?: unknown}} */
        const circular = {};
        circular.self = circular;
        expect(() => clone(circular)).toThrow('Circular');

        /** @type {unknown[]} */
        const circularArray = [];
        circularArray.push(circularArray);
        expect(() => clone(circularArray)).toThrow('Circular');
    });

    test('generateId returns lowercase hex of expected length', () => {
        const id = generateId(16);
        expect(id).toHaveLength(32);
        expect(id).toMatch(/^[0-9a-f]+$/);
        expect(generateId(0)).toBe('');
    });

    test('deferPromise can resolve and reject externally', async () => {
        const deferredResolve = deferPromise();
        const deferredReject = deferPromise();
        const error = new Error('expected reject');

        deferredResolve.resolve('ok');
        deferredReject.reject(error);

        await expect(deferredResolve.promise).resolves.toBe('ok');
        await expect(deferredReject.promise).rejects.toBe(error);
    });

    test('promiseTimeout resolves immediately for non-positive delay and later for positive delay', async () => {
        await expect(promiseTimeout(0)).resolves.toBeUndefined();

        vi.useFakeTimers();
        try {
            let resolved = false;
            const delayedPromise = promiseTimeout(10).then(() => {
                resolved = true;
            });
            await vi.advanceTimersByTimeAsync(9);
            expect(resolved).toBe(false);
            await vi.advanceTimersByTimeAsync(1);
            await delayedPromise;
            expect(resolved).toBe(true);
        } finally {
            vi.useRealTimers();
        }
    });

    test('sanitizeCSS normalizes cssRules output via CSSStyleSheet', () => {
        const originalCSSStyleSheetDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'CSSStyleSheet');

        class FakeCSSStyleSheet {
            constructor() {
                /** @type {Array<{cssText?: string}>} */
                this.cssRules = [];
            }

            /**
             * @param {string} css
             */
            replaceSync(css) {
                this.cssRules = [
                    {cssText: `${css}-rule-1`},
                    {cssText: ''},
                    {cssText: `${css}-rule-2`},
                ];
            }
        }

        Object.defineProperty(globalThis, 'CSSStyleSheet', {
            configurable: true,
            writable: true,
            value: FakeCSSStyleSheet,
        });
        try {
            expect(sanitizeCSS('x')).toBe('x-rule-1\n\nx-rule-2');
        } finally {
            if (typeof originalCSSStyleSheetDescriptor !== 'undefined') {
                Object.defineProperty(globalThis, 'CSSStyleSheet', originalCSSStyleSheetDescriptor);
            } else {
                Reflect.deleteProperty(globalThis, 'CSSStyleSheet');
            }
        }
    });

    test('addScopeToCss wraps css in the provided scope', () => {
        expect(addScopeToCss('.a{color:red;}', '#scope')).toBe('#scope {.a{color:red;}\n}');
    });

    test('addScopeToCssLegacy rewrites only style rules', () => {
        const originalCSSStyleSheetDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'CSSStyleSheet');
        const originalCSSStyleRuleDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'CSSStyleRule');


        class FakeCSSStyleRule {
            /**
             * @param {string} selectorText
             * @param {string} cssText
             */
            constructor(selectorText, cssText) {
                this.selectorText = selectorText;
                this.cssText = cssText;
            }
        }

        class FakeCSSStyleSheet {
            constructor() {
                /** @type {Array<{cssText?: string}>} */
                this.cssRules = [];
            }

            /**
             * @param {string} css
             */
            replaceSync(css) {
                if (css === 'input-css') {
                    this.cssRules = [
                        new FakeCSSStyleRule('.a,.b', '.a,.b{color:red;}'),
                        {cssText: '@media all {}'},
                    ];
                    return;
                }
                this.cssRules = css.split('\n').filter((line) => line.length > 0).map((line) => ({cssText: line}));
            }
        }


        Object.defineProperty(globalThis, 'CSSStyleSheet', {
            configurable: true,
            writable: true,
            value: FakeCSSStyleSheet,
        });
        Object.defineProperty(globalThis, 'CSSStyleRule', {
            configurable: true,
            writable: true,
            value: FakeCSSStyleRule,
        });
        try {
            expect(addScopeToCssLegacy('input-css', '#scope')).toBe('#scope .a, #scope .b{color:red;}');
        } finally {
            if (typeof originalCSSStyleSheetDescriptor !== 'undefined') {
                Object.defineProperty(globalThis, 'CSSStyleSheet', originalCSSStyleSheetDescriptor);
            } else {
                Reflect.deleteProperty(globalThis, 'CSSStyleSheet');
            }
            if (typeof originalCSSStyleRuleDescriptor !== 'undefined') {
                Object.defineProperty(globalThis, 'CSSStyleRule', originalCSSStyleRuleDescriptor);
            } else {
                Reflect.deleteProperty(globalThis, 'CSSStyleRule');
            }
        }
    });

    test('addScopeToCssLegacy falls back when stylesheet parsing fails', () => {
        const originalCSSStyleSheetDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'CSSStyleSheet');
        const logSpy = vi.spyOn(log, 'log').mockImplementation(() => {});
        class ThrowingCSSStyleSheet {
            /**
             * @param {string} _css
             * @throws {Error}
             */
            replaceSync(_css) {
                throw new Error('stylesheet parse failure');
            }
        }
        Object.defineProperty(globalThis, 'CSSStyleSheet', {
            configurable: true,
            writable: true,
            value: ThrowingCSSStyleSheet,
        });
        try {
            expect(addScopeToCssLegacy('.a{color:red;}', '#fallback')).toBe('#fallback {.a{color:red;}\n}');
            expect(logSpy).toHaveBeenCalledTimes(1);
            expect(logSpy.mock.calls[0][0]).toContain('falling back on addScopeToCss: stylesheet parse failure');
        } finally {
            logSpy.mockRestore();
            if (typeof originalCSSStyleSheetDescriptor !== 'undefined') {
                Object.defineProperty(globalThis, 'CSSStyleSheet', originalCSSStyleSheetDescriptor);
            } else {
                Reflect.deleteProperty(globalThis, 'CSSStyleSheet');
            }
        }
    });

    test('addScopeToCssLegacy handles empty cssText values when serializing final rules', () => {
        const originalCSSStyleSheetDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'CSSStyleSheet');
        const originalCSSStyleRuleDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'CSSStyleRule');

        class FakeCSSStyleRule {
            /**
             * @param {string} selectorText
             * @param {string} cssText
             */
            constructor(selectorText, cssText) {
                this.selectorText = selectorText;
                this.cssText = cssText;
            }
        }
        class FakeCSSStyleSheet {
            constructor() {
                /** @type {Array<{cssText?: string}>} */
                this.cssRules = [];
                this.replaceCount = 0;
            }

            /**
             * @param {string} _css
             */
            replaceSync(_css) {
                this.replaceCount += 1;
                if (this.replaceCount === 1) {
                    this.cssRules = [new FakeCSSStyleRule('.x', '.x{color:red;}')];
                    return;
                }
                this.cssRules = [{}];
            }
        }

        Object.defineProperty(globalThis, 'CSSStyleSheet', {
            configurable: true,
            writable: true,
            value: FakeCSSStyleSheet,
        });
        Object.defineProperty(globalThis, 'CSSStyleRule', {
            configurable: true,
            writable: true,
            value: FakeCSSStyleRule,
        });
        try {
            expect(addScopeToCssLegacy('input-css', '#scope')).toBe('');
        } finally {
            if (typeof originalCSSStyleSheetDescriptor !== 'undefined') {
                Object.defineProperty(globalThis, 'CSSStyleSheet', originalCSSStyleSheetDescriptor);
            } else {
                Reflect.deleteProperty(globalThis, 'CSSStyleSheet');
            }
            if (typeof originalCSSStyleRuleDescriptor !== 'undefined') {
                Object.defineProperty(globalThis, 'CSSStyleRule', originalCSSStyleRuleDescriptor);
            } else {
                Reflect.deleteProperty(globalThis, 'CSSStyleRule');
            }
        }
    });
});
