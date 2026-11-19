/*
 * Copyright (C) 2024-2026  Yomitan Authors
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
import {insertWildcard} from '../../ext/js/language/ja/japanese-text-preprocessors.js';

const {process} = insertWildcard;

describe('insertWildcard', () => {
    test('short input (1 char) returns only original', () => {
        expect(process('あ')).toStrictEqual(['あ']);
    });

    test('short input (2 chars) returns only original', () => {
        expect(process('あい')).toStrictEqual(['あい']);
    });

    test('3-char input produces 1 wildcard variant', () => {
        const variants = process('あいう');
        expect(variants).toContain('あいう');
        expect(variants).toContain('あ～う');
        expect(variants).toHaveLength(2);
    });

    test('いくら騒いでも produces いくら～でも', () => {
        const variants = process('いくら騒いでも');
        expect(variants).toContain('いくら騒いでも');
        expect(variants).toContain('いくら～でも');
    });

    test('single-char prefix works for ば～ほど pattern', () => {
        const variants = process('ば食べるほど');
        expect(variants).toContain('ば食べるほど');
        expect(variants).toContain('ば～ほど');
    });

    test('しか～ない pattern works', () => {
        const variants = process('しか言わない');
        expect(variants).toContain('しか言わない');
        expect(variants).toContain('しか～ない');
    });

    test('wildcard character is fullwidth tilde U+FF5E', () => {
        const variants = process('あいう');
        const wildcardVariant = variants.find((v) => v !== 'あいう');
        expect(wildcardVariant).toBe('あ\uFF5Eう');
    });

    test('variant count for 5-char input', () => {
        // n=5: prefixLen 1..3, for each suffixLen 1..(n-prefixLen-1)
        // p=1: s=1,2,3 (3); p=2: s=1,2 (2); p=3: s=1 (1) = 6 variants + original
        const variants = process('あいうえお');
        expect(variants).toHaveLength(7);
    });

    test('variant count for 7-char input', () => {
        // (n-1)(n-2)/2 = 6*5/2 = 15 variants + original
        const variants = process('あいうえおかき');
        expect(variants).toHaveLength(16);
    });

    test('variants are capped at 51 for long inputs', () => {
        const longStr = 'あいうえおかきくけこさしすせそ'; // 15 chars
        const variants = process(longStr);
        expect(variants).toHaveLength(51);
    });

    test('empty string returns only original', () => {
        expect(process('')).toStrictEqual(['']);
    });

    test('original string is always first', () => {
        const input = 'いくら騒いでも';
        const variants = process(input);
        expect(variants[0]).toBe(input);
    });
});
