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

import {describe, expect, test} from 'vitest';
import {Deinflector} from '../ext/js/language/deinflector.js';
import {LanguageUtil} from '../ext/js/language/language-util.js';

async function hasTermReasons(deinflector, source, expectedTerm, expectedRule, expectedReasons) {
    const deinflectorOptions = {
        deinflectionPosFilter: true,
        language: 'ja'
    };
    const deinflections = await deinflector.deinflect(source, deinflectorOptions);
    for (const {term, reasons, rules} of deinflections) {
        if (term !== expectedTerm) { continue; }
        if (typeof expectedRule !== 'undefined') {
            const expectedFlags = Deinflector.rulesToRuleFlags([expectedRule]);
            if (rules !== 0 && (rules & expectedFlags) !== expectedFlags) {
                continue;
            }
        }
        let okay = true;
        if (typeof expectedReasons !== 'undefined') {
            if (reasons.length !== expectedReasons.length) { continue; }
            for (let i = 0, ii = expectedReasons.length; i < ii; ++i) {
                if (expectedReasons[i] !== reasons[i]) {
                    okay = false;
                    break;
                }
            }
        }
        if (okay) {
            return {has: true, reasons, rules};
        }
    }
    return {has: false, reasons: null, rules: null};
}


async function testDeinflections() {
    const languageUtil = new LanguageUtil();
    await languageUtil.prepare();
    const deinflector = new Deinflector(languageUtil);
    // const languages = languageUtil.getLanguages();

    // for (const {iso} of languages) {
    const file = '../ext/js/language/languages/ja/test-deinflections.js';
    console.log(`Testing ${file}`);
    // if (!existsSync(file)) { continue; }
    // eslint-disable-next-line no-unsanitized/method
    const {deinflectionTests} = await import(file);

    describe('deinflections', () => {
        for (const {valid, tests} of deinflectionTests) {
            for (const {source, term, rule, reasons} of tests) {
                let message = `${source} ${valid ? 'has' : 'does not have'} term candidate ${JSON.stringify(term)}`;
                if (typeof rule !== 'undefined') {
                    message += ` with rule ${JSON.stringify(rule)}`;
                }
                if (typeof reasons !== 'undefined') {
                    message += (typeof rule !== 'undefined' ? ' and' : ' with');
                    message += ` reasons ${JSON.stringify(reasons)}`;
                }
                test(`${message}`, async () => {
                    const {has} = await hasTermReasons(deinflector, source, term, rule, reasons);
                    expect(has).toStrictEqual(valid);
                });
            }
        }
    });
    // }
}


async function main() {
    await testDeinflections();
}


await main();
