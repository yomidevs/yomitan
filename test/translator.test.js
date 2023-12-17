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

import {readFileSync} from 'fs';
import {fileURLToPath} from 'node:url';
import path from 'path';
import {describe} from 'vitest';
import {createTranslatorTest} from './fixtures/translator-test.js';
import {createTestAnkiNoteData} from './utilities/anki.js';
import {createFindOptions} from './utilities/translator.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));

const testInputsFilePath = path.join(dirname, 'data/translator-test-inputs.json');
/** @type {import('test/anki-note-builder').TranslatorTestInputs} */
const {optionsPresets, tests} = JSON.parse(readFileSync(testInputsFilePath, {encoding: 'utf8'}));

const testResults1FilePath = path.join(dirname, 'data/translator-test-results.json');
const expectedResults1 = JSON.parse(readFileSync(testResults1FilePath, {encoding: 'utf8'}));

const testResults2FilePath = path.join(dirname, 'data/translator-test-results-note-data1.json');
const expectedResults2 = JSON.parse(readFileSync(testResults2FilePath, {encoding: 'utf8'}));

const dictionaryName = 'Test Dictionary 2';
const test = await createTranslatorTest(void 0, path.join(dirname, 'data/dictionaries/valid-dictionary1'), dictionaryName);

describe('Translator', () => {
    const testData = tests.map((data, i) => ({data, expected1: expectedResults1[i], expected2: expectedResults2[i]}));
    describe.each(testData)('Test %#: $data.name', ({data, expected1, expected2}) => {
        test('Test', async ({translator, ankiNoteDataCreator, expect}) => {
            switch (data.func) {
                case 'findTerms':
                    {
                        const {mode, text} = data;
                        /** @type {import('translation').FindTermsOptions} */
                        const options = createFindOptions(dictionaryName, optionsPresets, data.options);
                        const {dictionaryEntries, originalTextLength} = await translator.findTerms(mode, text, options);
                        const noteDataList = mode !== 'simple' ? dictionaryEntries.map((dictionaryEntry) => createTestAnkiNoteData(ankiNoteDataCreator, dictionaryEntry, mode)) : null;
                        expect(originalTextLength).toStrictEqual(expected1.originalTextLength);
                        expect(dictionaryEntries).toStrictEqual(expected1.dictionaryEntries);
                        expect(noteDataList).toEqual(expected2.noteDataList);
                    }
                    break;
                case 'findKanji':
                    {
                        const {text} = data;
                        /** @type {import('translation').FindKanjiOptions} */
                        const options = createFindOptions(dictionaryName, optionsPresets, data.options);
                        const dictionaryEntries = await translator.findKanji(text, options);
                        const noteDataList = dictionaryEntries.map((dictionaryEntry) => createTestAnkiNoteData(ankiNoteDataCreator, dictionaryEntry, 'split'));
                        expect(dictionaryEntries).toStrictEqual(expected1.dictionaryEntries);
                        expect(noteDataList).toEqual(expected2.noteDataList);
                    }
                    break;
            }
        });
    });
});
