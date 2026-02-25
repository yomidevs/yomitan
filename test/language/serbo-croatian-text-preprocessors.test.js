/*
 * Copyright (C) 2024-2025  Yomitan Authors
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
import {addSerboCroatianDiacritics} from '../../ext/js/language/sh/serbo-croatian-text-preprocessors.js';

const {process} = addSerboCroatianDiacritics;

describe('addSerboCroatianDiacritics', () => {
    test('no replaceable letters passes through unchanged', () => {
        expect(process('hello')).toStrictEqual(['hello']);
    });

    test('c expands to c, č, ć', () => {
        expect(process('c')).toStrictEqual(['c', 'č', 'ć']);
    });

    test('C expands to C, Č, Ć', () => {
        expect(process('C')).toStrictEqual(['C', 'Č', 'Ć']);
    });

    test('z expands to z, ž', () => {
        expect(process('z')).toStrictEqual(['z', 'ž']);
    });

    test('Z expands to Z, Ž', () => {
        expect(process('Z')).toStrictEqual(['Z', 'Ž']);
    });

    test('s expands to s, š', () => {
        expect(process('s')).toStrictEqual(['s', 'š']);
    });

    test('S expands to S, Š', () => {
        expect(process('S')).toStrictEqual(['S', 'Š']);
    });

    test('dj expands to dj, đ', () => {
        expect(process('dj')).toStrictEqual(['dj', 'đ']);
    });

    test('DJ expands to DJ, Đ', () => {
        expect(process('DJ')).toStrictEqual(['DJ', 'Đ']);
    });

    test('dj digraph is matched before d alone', () => {
        const variants = process('djak');
        expect(variants).toContain('đak');
        expect(variants).toContain('djak');
        // d alone should not produce đ when followed by j (already consumed)
        expect(variants).toHaveLength(2);
    });

    test('d not followed by j is left unchanged', () => {
        expect(process('dan')).toStrictEqual(['dan']);
    });

    test('combinations multiply correctly', () => {
        // 'sz': s(2) * z(2) = 4 variants
        const variants = process('sz');
        expect(variants).toHaveLength(4);
        expect(variants).toContain('sz');
        expect(variants).toContain('šz');
        expect(variants).toContain('sž');
        expect(variants).toContain('šž');
    });

    test('word with c and dj produces all combinations', () => {
        // 'cdj': c(3) * dj(2) = 6 variants
        const variants = process('cdj');
        expect(variants).toHaveLength(6);
        expect(variants).toContain('cdj');
        expect(variants).toContain('cđ');
        expect(variants).toContain('čdj');
        expect(variants).toContain('čđ');
        expect(variants).toContain('ćdj');
        expect(variants).toContain('ćđ');
    });

    test('realistic word: "cas" produces all c/s variants', () => {
        // c(3) * s(2) = 6 variants
        const variants = process('cas');
        expect(variants).toHaveLength(6);
        expect(variants).toContain('cas');
        expect(variants).toContain('čas');
        expect(variants).toContain('ćas');
        expect(variants).toContain('caš');
        expect(variants).toContain('čaš');
        expect(variants).toContain('ćaš');
    });

    test('NFC and NFD input produce identical output', () => {
        const inputNFC = 'čas'; // č as single codepoint U+010D
        const inputNFD = 'čas'.normalize('NFD'); // č as c + U+030C
        expect(process(inputNFC)).toStrictEqual(process(inputNFD));
    });
});
