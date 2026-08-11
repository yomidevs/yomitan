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
import {removeUkrainianDiacritics, ukrainianApostropheVariants} from '../../ext/js/language/uk/ukrainian-text-preprocessors.js';

describe('removeUkrainianDiacritics', () => {
    const {process} = removeUkrainianDiacritics;

    test('text without stress marks passes through unchanged', () => {
        expect(process('читати')).toStrictEqual(['читати', 'читати']);
    });

    test('the combining acute accent is removed', () => {
        expect(process('чита́ти')).toStrictEqual(['чита́ти', 'читати']);
    });

    test('every stress mark is removed', () => {
        expect(process('го́лово́ю')).toStrictEqual(['го́лово́ю', 'головою']);
    });

    test('the letter ї is preserved', () => {
        expect(process('украї́нська')).toStrictEqual(['украї́нська', 'українська']);
    });
});

describe('ukrainianApostropheVariants', () => {
    const {process} = ukrainianApostropheVariants;

    test('text without an apostrophe passes through unchanged', () => {
        expect(process('читати')).toStrictEqual(['читати', 'читати', 'читати', 'читати']);
    });

    test('the typographic apostrophe is normalized', () => {
        expect(process('п’ять')).toStrictEqual(['п’ять', 'п\'ять', 'п’ять', 'пʼять']);
    });

    test('the typewriter apostrophe is normalized', () => {
        expect(process('п\'ять')).toStrictEqual(['п\'ять', 'п\'ять', 'п’ять', 'пʼять']);
    });

    test('the modifier letter apostrophe is normalized', () => {
        expect(process('пʼять')).toStrictEqual(['пʼять', 'п\'ять', 'п’ять', 'пʼять']);
    });

    test('the grave and acute accents used as apostrophes are normalized', () => {
        expect(process('п`ять')).toStrictEqual(['п`ять', 'п\'ять', 'п’ять', 'пʼять']);
        expect(process('п´ять')).toStrictEqual(['п´ять', 'п\'ять', 'п’ять', 'пʼять']);
    });

    test('a variant is produced for every apostrophe a dictionary may store', () => {
        // An entry spelled with U+02BC has to be reachable from text spelled with U+0027
        expect(process('розв\'язання')).toContain('розвʼязання');
        expect(process('розвʼязання')).toContain('розв\'язання');
        expect(process('розвʼязання')).toContain('розв’язання');
    });

    test('every apostrophe in the text is normalized', () => {
        expect(process('м’яко-п’яний')).toStrictEqual(['м’яко-п’яний', 'м\'яко-п\'яний', 'м’яко-п’яний', 'мʼяко-пʼяний']);
    });
});
