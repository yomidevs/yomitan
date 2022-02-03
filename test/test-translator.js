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

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const {testMain} = require('../dev/util');
const {TranslatorVM} = require('../dev/translator-vm');


function clone(value) {
    return JSON.parse(JSON.stringify(value));
}


async function main() {
    const write = (process.argv[2] === '--write');

    const translatorVM = new TranslatorVM();
    const dictionaryDirectory = path.join(__dirname, 'data', 'dictionaries', 'valid-dictionary1');
    await translatorVM.prepare(dictionaryDirectory, 'Test Dictionary 2');

    const testInputsFilePath = path.join(__dirname, 'data', 'translator-test-inputs.json');
    const {optionsPresets, tests} = JSON.parse(fs.readFileSync(testInputsFilePath, {encoding: 'utf8'}));

    const testResults1FilePath = path.join(__dirname, 'data', 'translator-test-results.json');
    const expectedResults1 = JSON.parse(fs.readFileSync(testResults1FilePath, {encoding: 'utf8'}));
    const actualResults1 = [];

    const testResults2FilePath = path.join(__dirname, 'data', 'translator-test-results-note-data1.json');
    const expectedResults2 = JSON.parse(fs.readFileSync(testResults2FilePath, {encoding: 'utf8'}));
    const actualResults2 = [];

    for (let i = 0, ii = tests.length; i < ii; ++i) {
        const test = tests[i];
        const expected1 = expectedResults1[i];
        const expected2 = expectedResults2[i];
        switch (test.func) {
            case 'findTerms':
                {
                    const {name, mode, text} = test;
                    const options = translatorVM.buildOptions(optionsPresets, test.options);
                    const {dictionaryEntries, originalTextLength} = clone(await translatorVM.translator.findTerms(mode, text, options));
                    const noteDataList = mode !== 'simple' ? clone(dictionaryEntries.map((dictionaryEntry) => translatorVM.createTestAnkiNoteData(clone(dictionaryEntry), mode))) : null;
                    actualResults1.push({name, originalTextLength, dictionaryEntries});
                    actualResults2.push({name, noteDataList});
                    if (!write) {
                        assert.deepStrictEqual(originalTextLength, expected1.originalTextLength);
                        assert.deepStrictEqual(dictionaryEntries, expected1.dictionaryEntries);
                        assert.deepStrictEqual(noteDataList, expected2.noteDataList);
                    }
                }
                break;
            case 'findKanji':
                {
                    const {name, text} = test;
                    const options = translatorVM.buildOptions(optionsPresets, test.options);
                    const dictionaryEntries = clone(await translatorVM.translator.findKanji(text, options));
                    const noteDataList = clone(dictionaryEntries.map((dictionaryEntry) => translatorVM.createTestAnkiNoteData(clone(dictionaryEntry), null)));
                    actualResults1.push({name, dictionaryEntries});
                    actualResults2.push({name, noteDataList});
                    if (!write) {
                        assert.deepStrictEqual(dictionaryEntries, expected1.dictionaryEntries);
                        assert.deepStrictEqual(noteDataList, expected2.noteDataList);
                    }
                }
                break;
        }
    }

    if (write) {
        // Use 2 indent instead of 4 to save a bit of file size
        fs.writeFileSync(testResults1FilePath, JSON.stringify(actualResults1, null, 2), {encoding: 'utf8'});
        fs.writeFileSync(testResults2FilePath, JSON.stringify(actualResults2, null, 2), {encoding: 'utf8'});
    }
}


if (require.main === module) { testMain(main); }
