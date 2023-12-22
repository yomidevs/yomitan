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

import {existsSync} from 'fs';
import {fileURLToPath} from 'node:url';
import path, {resolve as pathResolve} from 'path';
import {describe, expect, test} from 'vitest';
import {Deinflector} from '../ext/js/language/deinflector.js';
import {LanguageUtil} from '../ext/js/language/language-util.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));
/**
 * @param {Deinflector} deinflector
 * @param {string} source
 * @param {string} expectedTerm
 * @param {string} expectedRule
 * @param {string[]|undefined} expectedReasons
 */
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


/**
 *
 */
async function testDeinflections() {
    const languageUtil = new LanguageUtil();
    await languageUtil.prepare();
    const deinflector = new Deinflector(languageUtil);
    const languages = languageUtil.getLanguages();


    const deinflectionTests = Object.fromEntries(await Promise.all(languages.map(async ({iso}) => {
        const file = `../ext/js/language/languages/${iso}/test-deinflections.js`;
        const filepath = pathResolve(dirname, file);
        if (!existsSync(filepath)) {
            return [iso, null];
        }
        // eslint-disable-next-line no-unsanitized/method
        const {deinflectionTests: languageTests} = await import(file);
        return [iso, languageTests];
    })));

    describe('deinflections', () => {
        for (const {iso, language} of languages) {
            for (const {valid, tests} of deinflectionTests[iso] ?? []) {
                for (const {source, term, rule, reasons} of tests) {
                    let message = `${source} ${valid ? 'has' : 'does not have'} term candidate ${JSON.stringify(term)}`;
                    if (typeof rule !== 'undefined') {
                        message += ` with rule ${JSON.stringify(rule)}`;
                    }
                    if (typeof reasons !== 'undefined') {
                        message += (typeof rule !== 'undefined' ? ' and' : ' with');
                        message += ` reasons ${JSON.stringify(reasons)}`;
                    }
                    test(`${language}: ${message}`, async () => {
                        const {has} = await hasTermReasons(deinflector, source, term, rule, reasons);
                        expect(has).toStrictEqual(valid);
                    });
                }
            }
        }
    });
}


/**
 *
 */
async function main() {
    await testDeinflections();
}


await main();
