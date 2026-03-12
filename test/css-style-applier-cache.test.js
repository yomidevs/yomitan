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

import {describe, expect, test} from 'vitest';
import {CssStyleApplier} from '../ext/js/dom/css-style-applier.js';

/**
 * @returns {(cssStyleApplier: CssStyleApplier, className: string) => import('css-style-applier').CssRule[]}
 * @throws {Error}
 */
function getCandidateRulesMethod() {
    const method = Reflect.get(CssStyleApplier.prototype, '_getCandidateCssRulesForClass');
    if (typeof method !== 'function') {
        throw new Error('Expected CssStyleApplier._getCandidateCssRulesForClass');
    }
    return (cssStyleApplier, className) => method.call(cssStyleApplier, className);
}

/**
 * @param {CssStyleApplier} cssStyleApplier
 * @returns {Map<string, import('css-style-applier').CssRule[]>}
 */
function getCachedRules(cssStyleApplier) {
    return /** @type {Map<string, import('css-style-applier').CssRule[]>} */ (Reflect.get(cssStyleApplier, '_cachedRules'));
}

describe('CssStyleApplier rule cache eviction', () => {
    const getCandidateRules = getCandidateRulesMethod();

    test('evicts oldest cache entries past max size', () => {
        const cssStyleApplier = new CssStyleApplier('unused://style-data.json');
        Reflect.set(cssStyleApplier, '_cachedRulesMaxSize', 3);

        getCandidateRules(cssStyleApplier, 'class-a');
        getCandidateRules(cssStyleApplier, 'class-b');
        getCandidateRules(cssStyleApplier, 'class-c');
        getCandidateRules(cssStyleApplier, 'class-d');

        const cache = getCachedRules(cssStyleApplier);
        expect(cache.size).toBe(3);
        expect(cache.has('class-a')).toBe(false);
        expect(cache.has('class-b')).toBe(true);
        expect(cache.has('class-c')).toBe(true);
        expect(cache.has('class-d')).toBe(true);
    });

    test('cache hit refreshes recency before eviction', () => {
        const cssStyleApplier = new CssStyleApplier('unused://style-data.json');
        Reflect.set(cssStyleApplier, '_cachedRulesMaxSize', 3);

        getCandidateRules(cssStyleApplier, 'class-a');
        getCandidateRules(cssStyleApplier, 'class-b');
        getCandidateRules(cssStyleApplier, 'class-c');
        getCandidateRules(cssStyleApplier, 'class-a');
        getCandidateRules(cssStyleApplier, 'class-d');

        const cache = getCachedRules(cssStyleApplier);
        expect(cache.size).toBe(3);
        expect(cache.has('class-a')).toBe(true);
        expect(cache.has('class-b')).toBe(false);
        expect(cache.has('class-c')).toBe(true);
        expect(cache.has('class-d')).toBe(true);
    });
});
