/*
 * Copyright (C) 2026  Yomitan Authors
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
import {isTextLookupWorthy} from '../../ext/js/language/languages.js';
import {isStringPartiallyUkrainian} from '../../ext/js/language/uk/ukrainian.js';

describe('isStringPartiallyUkrainian', () => {
    /** @type {[string, boolean][]} */
    const cases = [
        ['читати', true],
        ['Україна', true],
        ['їжак', true],
        ['ґанок', true],
        ['п\'ять', true],
        ['чита́ти', true], // a stress mark does not hide the letters
        ['слово, друге', true],
        ['Читати — Yomitan', true], // a Latin word alongside Ukrainian is still worth a lookup
        ['1990 рік', true],
        ['read', false],
        ['Yomitan', false],
        ['', false],
        ['12345', false],
        ['   ', false],
        ['— … «»', false], // punctuation Ukrainian text uses, but no letters
        ['\'’ʼ', false], // the apostrophe variants on their own
        ['読む', false],
        ['ελληνικά', false], // a script with lookalike letters
        ['ABBA', false], // Latin letters that look Cyrillic
    ];

    test.each(cases)('%o -> %o', (str, expected) => {
        expect(isStringPartiallyUkrainian(str)).toBe(expected);
    });

    test('Ukrainian cannot be told apart from other Cyrillic by script alone', () => {
        // "читати" is spelled entirely from letters Russian also has, so a filter narrow enough
        // to reject Russian would reject ordinary Ukrainian too. Cyrillic is the honest test.
        expect(isStringPartiallyUkrainian('читать')).toBe(true);
    });
});

describe('the Ukrainian descriptor uses the filter', () => {
    test('a lookup is worth making for Cyrillic text', () => {
        expect(isTextLookupWorthy('слово', 'uk')).toBe(true);
    });

    test('a lookup is not worth making for Latin text', () => {
        expect(isTextLookupWorthy('word', 'uk')).toBe(false);
    });

    test('an unknown language is unaffected', () => {
        expect(isTextLookupWorthy('word', 'xx')).toBe(false);
    });
});
