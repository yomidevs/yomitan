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

import {afterAll, describe, expect, test} from 'vitest';
import {DisplayAudio} from '../ext/js/display/display-audio.js';
import {setupDomTest} from './fixtures/dom-test.js';

const testEnv = await setupDomTest('ext/search.html');

/**
 * @returns {(displayAudio: DisplayAudio, term: string, reading: string, create: boolean) => import('display-audio').CacheItem|undefined}
 * @throws {Error}
 */
function getCacheItemMethod() {
    const method = Reflect.get(DisplayAudio.prototype, '_getCacheItem');
    if (typeof method !== 'function') {
        throw new Error('Expected DisplayAudio._getCacheItem to exist');
    }
    return (displayAudio, term, reading, create) => method.call(displayAudio, term, reading, create);
}

/**
 * @param {DisplayAudio} displayAudio
 * @returns {Map<string, import('display-audio').CacheItem>}
 */
function getCache(displayAudio) {
    return /** @type {Map<string, import('display-audio').CacheItem>} */ (Reflect.get(displayAudio, '_cache'));
}

/**
 * @param {string} term
 * @param {string} reading
 * @returns {string}
 */
function createCacheKey(term, reading) {
    return JSON.stringify([term, reading]);
}

/**
 * @returns {DisplayAudio}
 */
function createDisplayAudio() {
    const display = /** @type {import('../ext/js/display/display.js').Display} */ (/** @type {unknown} */ ({}));
    return new DisplayAudio(display);
}

describe('DisplayAudio cache eviction', () => {
    const {teardown} = testEnv;
    const getCacheItem = getCacheItemMethod();

    afterAll(async () => {
        await teardown(global);
    });

    test('evicts oldest cache items past max size', () => {
        const displayAudio = createDisplayAudio();
        Reflect.set(displayAudio, '_cacheMaxSize', 3);

        getCacheItem(displayAudio, 'term-1', 'read-1', true);
        getCacheItem(displayAudio, 'term-2', 'read-2', true);
        getCacheItem(displayAudio, 'term-3', 'read-3', true);
        getCacheItem(displayAudio, 'term-4', 'read-4', true);

        const cache = getCache(displayAudio);
        expect(cache.size).toBe(3);
        expect(cache.has(createCacheKey('term-1', 'read-1'))).toBe(false);
        expect(cache.has(createCacheKey('term-2', 'read-2'))).toBe(true);
        expect(cache.has(createCacheKey('term-3', 'read-3'))).toBe(true);
        expect(cache.has(createCacheKey('term-4', 'read-4'))).toBe(true);
    });

    test('touching an entry updates recency before eviction', () => {
        const displayAudio = createDisplayAudio();
        Reflect.set(displayAudio, '_cacheMaxSize', 3);

        getCacheItem(displayAudio, 'term-a', 'read-a', true);
        getCacheItem(displayAudio, 'term-b', 'read-b', true);
        getCacheItem(displayAudio, 'term-c', 'read-c', true);
        getCacheItem(displayAudio, 'term-a', 'read-a', false);
        getCacheItem(displayAudio, 'term-d', 'read-d', true);

        const cache = getCache(displayAudio);
        expect(cache.size).toBe(3);
        expect(cache.has(createCacheKey('term-a', 'read-a'))).toBe(true);
        expect(cache.has(createCacheKey('term-b', 'read-b'))).toBe(false);
        expect(cache.has(createCacheKey('term-c', 'read-c'))).toBe(true);
        expect(cache.has(createCacheKey('term-d', 'read-d'))).toBe(true);
    });
});
