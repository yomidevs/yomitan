/*
 * Copyright (C) 2023-2025  Yomitan Authors
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

import {describe, expect, test, vi} from 'vitest';
import {Translator} from '../ext/js/language/translator.js';

/**
 * @returns {(translator: Translator, tagTargets: import('translator').TagExpansionTarget[]) => Promise<void>}
 * @throws {Error}
 */
function getExpandTagGroupsMethod() {
    const method = Reflect.get(Translator.prototype, '_expandTagGroups');
    if (typeof method !== 'function') {
        throw new Error('Expected Translator._expandTagGroups');
    }
    return (translator, tagTargets) => method.call(translator, tagTargets);
}

/**
 * @param {import('../ext/js/dictionary/dictionary-database.js').DictionaryDatabase['findTagMetaBulk']} findTagMetaBulk
 * @returns {Translator}
 */
function createTranslator(findTagMetaBulk) {
    const database = /** @type {import('../ext/js/dictionary/dictionary-database.js').DictionaryDatabase} */ (/** @type {unknown} */ ({
        findTagMetaBulk,
    }));
    return new Translator(database);
}

/**
 * @param {string} dictionary
 * @param {string[]} tagNames
 * @returns {import('translator').TagExpansionTarget[]}
 */
function createTagTargets(dictionary, tagNames) {
    /** @type {import('dictionary').Tag[]} */
    const tags = [];
    return [{tagGroups: [{dictionary, tagNames}], tags}];
}

/**
 * @param {Translator} translator
 * @returns {import('translator').DictionaryTagCache}
 */
function getTagCache(translator) {
    return /** @type {import('translator').DictionaryTagCache} */ (Reflect.get(translator, '_tagCache'));
}

/**
 * @returns {ReturnType<typeof vi.fn>}
 */
function createFindTagMetaBulkMock() {
    return vi.fn(
        /**
         * @param {Array<{query: string, dictionary: string}>} items
         * @returns {Promise<import('dictionary-database').Tag[]>}
         */
        async (items) => items.map((item) => ({
            name: item.query,
            dictionary: item.dictionary,
            category: 'default',
            notes: `note-${item.query}`,
            order: 0,
            score: 0,
        })),
    );
}

describe('Translator tag cache limits', () => {
    const expandTagGroups = getExpandTagGroupsMethod();

    test('enforces per-dictionary entry LRU cap', async () => {
        const findTagMetaBulkImpl = createFindTagMetaBulkMock();
        const findTagMetaBulk = /** @type {import('../ext/js/dictionary/dictionary-database.js').DictionaryDatabase['findTagMetaBulk']} */ (/** @type {unknown} */ (findTagMetaBulkImpl));
        const translator = createTranslator(findTagMetaBulk);
        Reflect.set(translator, '_tagCacheMaxDictionaries', 8);
        Reflect.set(translator, '_tagCacheMaxEntriesPerDictionary', 3);

        await expandTagGroups(translator, createTagTargets('dict-a', ['a', 'b', 'c']));
        expect(findTagMetaBulkImpl).toHaveBeenCalledTimes(1);

        await expandTagGroups(translator, createTagTargets('dict-a', ['a']));
        expect(findTagMetaBulkImpl).toHaveBeenCalledTimes(1);

        await expandTagGroups(translator, createTagTargets('dict-a', ['d']));
        expect(findTagMetaBulkImpl).toHaveBeenCalledTimes(2);

        const dictCacheBeforeRequery = getTagCache(translator).get('dict-a');
        expect(dictCacheBeforeRequery).toBeDefined();
        expect(dictCacheBeforeRequery?.size).toBe(3);
        expect(dictCacheBeforeRequery?.has('a')).toBe(true);
        expect(dictCacheBeforeRequery?.has('b')).toBe(false);
        expect(dictCacheBeforeRequery?.has('c')).toBe(true);
        expect(dictCacheBeforeRequery?.has('d')).toBe(true);

        await expandTagGroups(translator, createTagTargets('dict-a', ['b']));
        expect(findTagMetaBulkImpl).toHaveBeenCalledTimes(3);
    });

    test('enforces dictionary-level LRU cap', async () => {
        const findTagMetaBulkImpl = createFindTagMetaBulkMock();
        const findTagMetaBulk = /** @type {import('../ext/js/dictionary/dictionary-database.js').DictionaryDatabase['findTagMetaBulk']} */ (/** @type {unknown} */ (findTagMetaBulkImpl));
        const translator = createTranslator(findTagMetaBulk);
        Reflect.set(translator, '_tagCacheMaxDictionaries', 2);
        Reflect.set(translator, '_tagCacheMaxEntriesPerDictionary', 16);

        await expandTagGroups(translator, createTagTargets('dict-a', ['x']));
        await expandTagGroups(translator, createTagTargets('dict-b', ['y']));
        await expandTagGroups(translator, createTagTargets('dict-a', ['x']));
        await expandTagGroups(translator, createTagTargets('dict-c', ['z']));

        const tagCache = getTagCache(translator);
        expect(tagCache.size).toBe(2);
        expect(tagCache.has('dict-a')).toBe(true);
        expect(tagCache.has('dict-b')).toBe(false);
        expect(tagCache.has('dict-c')).toBe(true);

        await expandTagGroups(translator, createTagTargets('dict-b', ['y']));
        expect(findTagMetaBulkImpl).toHaveBeenCalledTimes(4);
    });
});
