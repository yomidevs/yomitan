/*
 * Copyright (C) 2020-2021  Yomichan Authors
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
const {createDictionaryArchive, testMain} = require('../dev/util');
const {DatabaseVM} = require('../dev/database-vm');


function createTestDictionaryArchive(dictionary, dictionaryName) {
    const dictionaryDirectory = path.join(__dirname, 'data', 'dictionaries', dictionary);
    return createDictionaryArchive(dictionaryDirectory, dictionaryName);
}

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}


async function createVM() {
    // Set up VM
    const vm = new DatabaseVM();
    vm.execute([
        'js/core.js',
        'js/general/cache-map.js',
        'js/language/japanese-util.js',
        'bg/js/json-schema.js',
        'bg/js/media-utility.js',
        'bg/js/dictionary-importer.js',
        'bg/js/database.js',
        'bg/js/dictionary-database.js',
        'bg/js/text-source-map.js',
        'bg/js/deinflector.js',
        'bg/js/translator.js'
    ]);
    const [
        DictionaryImporter,
        DictionaryDatabase,
        JapaneseUtil,
        Translator
    ] = vm.get([
        'DictionaryImporter',
        'DictionaryDatabase',
        'JapaneseUtil',
        'Translator'
    ]);

    // Dictionary
    const testDictionary = createTestDictionaryArchive('valid-dictionary2');
    const testDictionaryContent = await testDictionary.generateAsync({type: 'string'});

    // Setup database
    const dictionaryImporter = new DictionaryImporter();
    const dictionaryDatabase = new DictionaryDatabase();
    await dictionaryDatabase.prepare();

    const {result, errors} = await dictionaryImporter.importDictionary(
        dictionaryDatabase,
        testDictionaryContent,
        {prefixWildcardsSupported: true},
        () => {}
    );

    assert.deepStrictEqual(errors.length, 0);

    // Setup translator
    const japaneseUtil = new JapaneseUtil(null);
    const translator = new Translator({japaneseUtil, database: dictionaryDatabase});
    const deinflectionReasions = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'ext', 'data/deinflect.json')));
    translator.prepare(deinflectionReasions);

    // Done
    return {vm, translator, dictionary: result};
}

function buildOptions(optionsPresets, optionsArray, dictionaryTitle) {
    const options = {};
    if (!Array.isArray(optionsArray)) { optionsArray = [optionsArray]; }
    for (const entry of optionsArray) {
        switch (typeof entry) {
            case 'string':
                if (!Object.prototype.hasOwnProperty.call(optionsPresets, entry)) {
                    throw new Error('Invalid options preset');
                }
                Object.assign(options, clone(optionsPresets[entry]));
                break;
            case 'object':
                Object.assign(options, clone(entry));
                break;
            default:
                throw new Error('Invalid options type');
        }
    }

    // Construct regex
    if (Array.isArray(options.textReplacements)) {
        options.textReplacements = options.textReplacements.map((value) => {
            if (Array.isArray(value)) {
                value = value.map(({pattern, flags, replacement}) => ({pattern: new RegExp(pattern, flags), replacement}));
            }
            return value;
        });
    }

    // Update structure
    const placeholder = '${title}';
    if (options.mainDictionary === placeholder) {
        options.mainDictionary = dictionaryTitle;
    }
    let {enabledDictionaryMap} = options;
    if (Array.isArray(enabledDictionaryMap)) {
        for (const entry of enabledDictionaryMap) {
            if (entry[0] === placeholder) {
                entry[0] = dictionaryTitle;
            }
        }
        enabledDictionaryMap = new Map(enabledDictionaryMap);
        options.enabledDictionaryMap = enabledDictionaryMap;
    }

    return options;
}


async function main() {
    const write = (process.argv[2] === '--write');
    const {translator, dictionary: {title}} = await createVM();

    const dataFilePath = path.join(__dirname, 'data', 'test-translator-data.json');
    const data = JSON.parse(fs.readFileSync(dataFilePath, {encoding: 'utf8'}));
    const {optionsPresets, tests} = data;
    for (const test of tests) {
        switch (test.func) {
            case 'findTerms':
                {
                    const {mode, text} = test;
                    const options = buildOptions(optionsPresets, test.options, title);
                    const [definitions, length] = clone(await translator.findTerms(mode, text, options));
                    if (write) {
                        test.expected = {length, definitions};
                    } else {
                        const {expected} = test;
                        assert.deepStrictEqual(length, expected.length);
                        assert.deepStrictEqual(definitions, expected.definitions);
                    }
                }
                break;
            case 'findKanji':
                {
                    const {text} = test;
                    const options = buildOptions(optionsPresets, test.options, title);
                    const definitions = clone(await translator.findKanji(text, options));
                    if (write) {
                        test.expected = {definitions};
                    } else {
                        const {expected} = test;
                        assert.deepStrictEqual(definitions, expected.definitions);
                    }
                }
                break;
        }
    }

    if (write) {
        fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 4), {encoding: 'utf8'});
    }
}


if (require.main === module) { testMain(main); }
