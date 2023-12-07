/*
 * Copyright (C) 2023  Yomitan Authors
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

import fs from 'fs';
import url, {fileURLToPath} from 'node:url';
import path from 'path';
import {expect, vi} from 'vitest';
import {AnkiNoteDataCreator} from '../ext/js/data/sandbox/anki-note-data-creator.js';
import {DictionaryDatabase} from '../ext/js/dictionary/dictionary-database.js';
import {DictionaryImporterMediaLoader} from '../ext/js/dictionary/dictionary-importer-media-loader.js';
import {DictionaryImporter} from '../ext/js/dictionary/dictionary-importer.js';
import {JapaneseUtil} from '../ext/js/language/languages/ja/japanese-util.js';
import {Translator} from '../ext/js/language/translator.js';
import {createDictionaryArchive} from './util.js';

vi.mock('../ext/js/dictionary/dictionary-importer-media-loader.js');

const dirname = path.dirname(fileURLToPath(import.meta.url));

export class TranslatorVM {
    constructor() {
        global.chrome = {
            runtime: {
                getURL: (path2) => {
                    return url.pathToFileURL(path.join(dirname, '..', 'ext', path2.replace(/^\//, ''))).href;
                }
            }
        };

        this._japaneseUtil = null;
        this._translator = null;
        this._ankiNoteDataCreator = null;
        this._dictionaryName = null;
    }

    get translator() {
        return this._translator;
    }

    async prepare(dictionaryDirectory, dictionaryName) {
        // Dictionary
        this._dictionaryName = dictionaryName;
        const testDictionary = createDictionaryArchive(dictionaryDirectory, dictionaryName);
        // const testDictionaryContent = await testDictionary.arrayBuffer();
        const testDictionaryContent = await testDictionary.generateAsync({type: 'arraybuffer'});

        // Setup database
        const dictionaryImporterMediaLoader = new DictionaryImporterMediaLoader();
        const dictionaryImporter = new DictionaryImporter(dictionaryImporterMediaLoader, null);
        const dictionaryDatabase = new DictionaryDatabase();
        await dictionaryDatabase.prepare();

        const {errors} = await dictionaryImporter.importDictionary(
            dictionaryDatabase,
            testDictionaryContent,
            {prefixWildcardsSupported: true}
        );

        expect(errors.length).toEqual(0);

        const myDirname = path.dirname(fileURLToPath(import.meta.url));

        // Setup translator
        this._japaneseUtil = new JapaneseUtil(null);
        this._translator = new Translator({
            japaneseUtil: this._japaneseUtil,
            database: dictionaryDatabase
        });
        // TODO
        const deinflectionReasons = JSON.parse(fs.readFileSync(path.join(myDirname, '..', 'ext', 'data/deinflect.json')));
        this._translator.prepare(deinflectionReasons);

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
                    Object.assign(options, structuredClone(optionsPresets[entry]));
                    break;
                case 'object':
                    Object.assign(options, structuredClone(entry));
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
