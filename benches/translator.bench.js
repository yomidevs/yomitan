/*
 * Copyright (C) 2023-2024  Yomitan Authors
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

import {readFileSync} from 'fs';
import {fileURLToPath} from 'node:url';
import path from 'path';
import {bench, describe} from 'vitest';
import {parseJson} from '../dev/json.js';
import {createFindKanjiOptions, createFindTermsOptions} from '../test/utilities/translator.js';
import {createTranslatorContext} from '../test/fixtures/translator-test.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const dictionaryName = 'Test Dictionary 2';
const translator = await createTranslatorContext(path.join(dirname, '..', 'test', 'data/dictionaries/valid-dictionary1'), dictionaryName);

describe('Translator', () => {
    const testInputsFilePath = path.join(dirname, '..', 'test', 'data/translator-test-inputs.json');
    /** @type {import('test/translator').TranslatorTestInputs} */
    const {optionsPresets, tests} = parseJson(readFileSync(testInputsFilePath, {encoding: 'utf8'}));

    const findKanjiTests = tests.filter((data) => data.options === 'kanji');
    const findTermTests = tests.filter((data) => data.options === 'default');
    const findTermWithTextTransformationsTests = tests.filter((data) => data.options !== 'kanji' && data.options !== 'default');

    bench(`Translator.prototype.findTerms - no text transformations  (n=${findTermTests.length})`, async () => {
        for (const data of /** @type {import('test/translator').TestInputFindTerm[]} */ (findTermTests)) {
            const {mode, text} = data;
            const options = createFindTermsOptions(dictionaryName, optionsPresets, data.options);
            await translator.findTerms(mode, text, options);
        }
    });

    bench(`Translator.prototype.findTerms - text transformations  (n=${findTermWithTextTransformationsTests.length})`, async () => {
        for (const data of /** @type {import('test/translator').TestInputFindTerm[]} */ (findTermWithTextTransformationsTests)) {
            const {mode, text} = data;
            const options = createFindTermsOptions(dictionaryName, optionsPresets, data.options);
            await translator.findTerms(mode, text, options);
        }
    });

    bench(`Translator.prototype.findKanji - (n=${findKanjiTests.length})`, async () => {
        for (const data of /** @type {import('test/translator').TestInputFindKanji[]} */ (findKanjiTests)) {
            const {text} = data;
            const options = createFindKanjiOptions(dictionaryName, optionsPresets, data.options);
            await translator.findKanji(text, options);
        }
    });
});
