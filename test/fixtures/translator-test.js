/*
 * Copyright (C) 2023-2024  Yomitan Authors
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

import {IDBKeyRange, indexedDB} from 'fake-indexeddb';
import {expect, vi} from 'vitest';
import {createDictionaryArchiveData} from '../../dev/dictionary-archive-util.js';
import {DictionaryDatabase} from '../../ext/js/dictionary/dictionary-database.js';
import {DictionaryImporter} from '../../ext/js/dictionary/dictionary-importer.js';
import {Translator} from '../../ext/js/language/translator.js';
import {chrome, fetch} from '../mocks/common.js';
import {DictionaryImporterMediaLoader} from '../mocks/dictionary-importer-media-loader.js';
import {createDomTest} from './dom-test.js';

vi.stubGlobal('indexedDB', indexedDB);
vi.stubGlobal('IDBKeyRange', IDBKeyRange);
vi.stubGlobal('fetch', fetch);
vi.stubGlobal('chrome', chrome);

/**
 * @param {string} dictionaryDirectory
 * @param {string} dictionaryName
 * @returns {Promise<{translator: Translator, styles: string}>}
 */
export async function createTranslatorContext(dictionaryDirectory, dictionaryName) {
    // Dictionary
    const testDictionaryData = await createDictionaryArchiveData(dictionaryDirectory, dictionaryName);

    // Setup database
    const dictionaryImporterMediaLoader = new DictionaryImporterMediaLoader();
    const dictionaryImporter = new DictionaryImporter(dictionaryImporterMediaLoader);
    const dictionaryDatabase = new DictionaryDatabase();
    await dictionaryDatabase.prepare();

    const {errors, result} = await dictionaryImporter.importDictionary(
        dictionaryDatabase,
        testDictionaryData,
        {prefixWildcardsSupported: true},
    );

    expect(errors.length).toEqual(0);
    expect(result).not.toBeNull();

    const styles = result?.styles ?? '';

    // Setup translator
    const translator = new Translator(dictionaryDatabase);
    translator.prepare();

    return {translator, styles};
}

/**
 * @param {string|undefined} htmlFilePath
 * @param {string} dictionaryDirectory
 * @param {string} dictionaryName
 * @returns {Promise<import('vitest').TestAPI<{window: import('jsdom').DOMWindow, translator: Translator, styles: string}>>}
 */
export async function createTranslatorTest(htmlFilePath, dictionaryDirectory, dictionaryName) {
    const test = createDomTest(htmlFilePath);
    const {translator, styles} = await createTranslatorContext(dictionaryDirectory, dictionaryName);
    /** @type {import('vitest').TestAPI<{window: import('jsdom').DOMWindow, translator: Translator, styles: string}>} */
    // eslint-disable-next-line sonarjs/prefer-immediate-return
    const result = test.extend({
        window: async ({window}, use) => { await use(window); },
        // eslint-disable-next-line no-empty-pattern
        translator: async ({}, use) => { await use(translator); },
        // eslint-disable-next-line no-empty-pattern
        styles: async ({}, use) => { await use(styles); },
    });
    return result;
}
