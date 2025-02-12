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

import {describe, expect, test} from 'vitest';
import {LanguageTransformer} from '../../ext/js/language/language-transformer.js';

/**
 * @param {LanguageTransformer} languageTransformer
 * @param {string} source
 * @param {string} expectedTerm
 * @param {string|null} expectedConditionName
 * @param {string[]|null} expectedReasons
 * @returns {{has: false, reasons: null, rules: null}|{has: true, reasons: string[], rules: number}}
 */
function hasTermReasons(languageTransformer, source, expectedTerm, expectedConditionName, expectedReasons) {
    for (const {text, conditions, trace} of languageTransformer.transform(source)) {
        if (text !== expectedTerm) { continue; }
        if (expectedConditionName !== null) {
            const expectedConditions = languageTransformer.getConditionFlagsFromConditionType(expectedConditionName);
            if (!LanguageTransformer.conditionsMatch(conditions, expectedConditions)) { continue; }
        }
        let okay = true;
        if (expectedReasons !== null) {
            if (trace.length !== expectedReasons.length) { continue; }
            for (let i = 0, ii = expectedReasons.length; i < ii; ++i) {
                if (expectedReasons[i] !== trace[i].transform) {
                    okay = false;
                    break;
                }
            }
        }
        if (okay) {
            return {
                has: true,
                reasons: trace.map((frame) => frame.transform),
                rules: conditions,
            };
        }
    }
    return {has: false, reasons: null, rules: null};
}

/**
 * @param {LanguageTransformer} languageTransformer
 * @param {import('test/language-transformer-test').LanguageTransformerTestCategory[]} data
 * @param {(input: string) => string} [preprocess] An optional function for if the input to the transformer needs to be preprocessed.
 */
export function testLanguageTransformer(languageTransformer, data, preprocess) {
    if (typeof preprocess === 'undefined') { preprocess = (input) => input; }
    describe('deinflections', () => {
        describe.each(data)('$category', ({valid, tests}) => {
            for (const {source, term, rule, reasons} of tests) {
                const {has} = hasTermReasons(languageTransformer, preprocess(source), preprocess(term), rule, reasons);
                let message = `${source} ${valid ? 'has' : 'does not have'} term candidate ${JSON.stringify(term)}`;
                if (rule !== null) {
                    message += ` with rule ${JSON.stringify(rule)}`;
                }
                if (reasons !== null) {
                    message += (typeof rule !== 'undefined' ? ' and' : ' with');
                    message += ` reasons ${JSON.stringify(reasons)}`;
                }
                test(`${message}`, () => {
                    expect(has).toStrictEqual(valid);
                });
            }
        });
    });
}
