/*
 * Copyright (C) 2021-2022  Yomichan Authors
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
const {DatabaseVM, DatabaseVMDictionaryImporterMediaLoader} = require('./database-vm');
const {createDictionaryArchive} = require('./util');

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

class TranslatorVM extends DatabaseVM {
    constructor(globals) {
        super(globals);
        this._japaneseUtil = null;
        this._translator = null;
        this._ankiNoteDataCreator = null;
        this._dictionaryName = null;
    }

    get translator() {
        return this._translator;
    }

    async prepare(dictionaryDirectory, dictionaryName) {
        this.execute([
            'js/core.js',
            'js/data/sandbox/anki-note-data-creator.js',
            'js/data/database.js',
            'js/data/json-schema.js',
            'js/general/cache-map.js',
            'js/general/regex-util.js',
            'js/general/text-source-map.js',
            'js/language/deinflector.js',
            'js/language/sandbox/dictionary-data-util.js',
            'js/language/dictionary-importer.js',
            'js/language/dictionary-database.js',
            'js/language/sandbox/japanese-util.js',
            'js/language/translator.js',
            'js/media/media-util.js'
        ]);
        const [
            DictionaryImporter,
            DictionaryDatabase,
            JapaneseUtil,
            Translator,
            AnkiNoteDataCreator
        ] = this.get([
            'DictionaryImporter',
            'DictionaryDatabase',
            'JapaneseUtil',
            'Translator',
            'AnkiNoteDataCreator'
        ]);

        // Dictionary
        this._dictionaryName = dictionaryName;
        const testDictionary = createDictionaryArchive(dictionaryDirectory, dictionaryName);
        const testDictionaryContent = await testDictionary.generateAsync({type: 'arraybuffer'});

        // Setup database
        const dictionaryImporterMediaLoader = new DatabaseVMDictionaryImporterMediaLoader();
        const dictionaryImporter = new DictionaryImporter(dictionaryImporterMediaLoader, null);
        const dictionaryDatabase = new DictionaryDatabase();
        await dictionaryDatabase.prepare();

        const {errors} = await dictionaryImporter.importDictionary(
            dictionaryDatabase,
            testDictionaryContent,
            {prefixWildcardsSupported: true}
        );

        assert.deepStrictEqual(errors.length, 0);

        // Setup translator
        this._japaneseUtil = new JapaneseUtil(null);
        this._translator = new Translator({
            japaneseUtil: this._japaneseUtil,
            database: dictionaryDatabase
        });
        const deinflectionReasions = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'ext', 'data/deinflect.json')));
        this._translator.prepare(deinflectionReasions);

        // Assign properties
        this._ankiNoteDataCreator = new AnkiNoteDataCreator(this._japaneseUtil);
    }

    createTestAnkiNoteData(dictionaryEntry, mode) {
        const marker = '{marker}';
        const data = {
            dictionaryEntry,
            resultOutputMode: mode,
            mode: 'mode',
            glossaryLayoutMode: 'default',
            compactTags: false,
            context: {
                url: 'url:',
                sentence: {text: '', offset: 0},
                documentTitle: 'title',
                query: 'query',
                fullQuery: 'fullQuery'
            },
            media: {}
        };
        return this._ankiNoteDataCreator.create(marker, data);
    }

    buildOptions(optionsPresets, optionsArray) {
        const dictionaryName = this._dictionaryName;
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
            options.mainDictionary = dictionaryName;
        }
        let {enabledDictionaryMap} = options;
        if (Array.isArray(enabledDictionaryMap)) {
            for (const entry of enabledDictionaryMap) {
                if (entry[0] === placeholder) {
                    entry[0] = dictionaryName;
                }
            }
            enabledDictionaryMap = new Map(enabledDictionaryMap);
            options.enabledDictionaryMap = enabledDictionaryMap;
        }
        const {excludeDictionaryDefinitions} = options;
        options.excludeDictionaryDefinitions = (
            Array.isArray(excludeDictionaryDefinitions) ?
            new Set(excludeDictionaryDefinitions) :
            null
        );

        return options;
    }
}

module.exports = {
    TranslatorVM
};
