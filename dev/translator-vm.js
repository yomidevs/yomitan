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
import {DictionaryDatabase} from '../ext/js/language/dictionary-database.js';
import {DictionaryImporterMediaLoader} from '../ext/js/language/dictionary-importer-media-loader.js';
import {DictionaryImporter} from '../ext/js/language/dictionary-importer.js';
import {JapaneseUtil} from '../ext/js/language/sandbox/japanese-util.js';
import {Translator} from '../ext/js/language/translator.js';
import {createDictionaryArchive} from './util.js';

vi.mock('../ext/js/language/dictionary-importer-media-loader.js');

const dirname = path.dirname(fileURLToPath(import.meta.url));

export class TranslatorVM {
    constructor() {
        /** @type {import('dev/vm').PseudoChrome} */
        const chrome = {
            runtime: {
                getURL: (path2) => {
                    return url.pathToFileURL(path.join(dirname, '..', 'ext', path2.replace(/^\//, ''))).href;
                }
            }
        };
        // @ts-expect-error - Overwriting a global
        global.chrome = chrome;

        /** @type {?JapaneseUtil} */
        this._japaneseUtil = null;
        /** @type {?Translator} */
        this._translator = null;
        /** @type {?AnkiNoteDataCreator} */
        this._ankiNoteDataCreator = null;
        /** @type {?string} */
        this._dictionaryName = null;
    }

    /** @type {Translator} */
    get translator() {
        if (this._translator === null) { throw new Error('Not prepared'); }
        return this._translator;
    }

    /**
     * @param {string} dictionaryDirectory
     * @param {string} dictionaryName
     */
    async prepare(dictionaryDirectory, dictionaryName) {
        // Dictionary
        this._dictionaryName = dictionaryName;
        const testDictionary = createDictionaryArchive(dictionaryDirectory, dictionaryName);
        const testDictionaryContent = await testDictionary.generateAsync({type: 'arraybuffer'});

        // Setup database
        const dictionaryImporterMediaLoader = new DictionaryImporterMediaLoader();
        const dictionaryImporter = new DictionaryImporter(dictionaryImporterMediaLoader);
        const dictionaryDatabase = new DictionaryDatabase();
        await dictionaryDatabase.prepare();

        const {errors} = await dictionaryImporter.importDictionary(
            dictionaryDatabase,
            testDictionaryContent,
            {prefixWildcardsSupported: true}
        );

        expect(errors.length).toEqual(0);

        // Setup translator
        this._japaneseUtil = new JapaneseUtil(null);
        this._translator = new Translator({
            japaneseUtil: this._japaneseUtil,
            database: dictionaryDatabase
        });
        const deinflectionReasons = JSON.parse(fs.readFileSync(path.join(dirname, '..', 'ext', 'data/deinflect.json'), {encoding: 'utf8'}));
        this._translator.prepare(deinflectionReasons);

        // Assign properties
        this._ankiNoteDataCreator = new AnkiNoteDataCreator(this._japaneseUtil);
    }

    /**
     * @param {import('dictionary').DictionaryEntry} dictionaryEntry
     * @param {import('settings').ResultOutputMode} mode
     * @returns {import('anki-templates').NoteData}
     * @throws {Error}
     */
    createTestAnkiNoteData(dictionaryEntry, mode) {
        if (this._ankiNoteDataCreator === null) {
            throw new Error('Not prepared');
        }
        const marker = '{marker}';
        /** @type {import('anki-templates-internal').CreateDetails} */
        const data = {
            dictionaryEntry,
            resultOutputMode: mode,
            mode: 'test',
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

    /**
     * @template {import('translation').FindTermsOptions|import('translation').FindKanjiOptions} T
     * @param {import('dev/vm').OptionsPresetObject} optionsPresets
     * @param {string|import('dev/vm').OptionsPresetObject|(string|import('dev/vm').OptionsPresetObject)[]} optionsArray
     * @returns {T}
     * @throws {Error}
     */
    buildOptions(optionsPresets, optionsArray) {
        const dictionaryName = this._dictionaryName;
        /** @type {import('core').UnknownObject} */
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

        return /** @type {T} */ (options);
    }
}
