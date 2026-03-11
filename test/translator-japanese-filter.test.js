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
import {Translator} from '../ext/js/language/translator.js';

/**
 * @returns {(this: Translator, text: string) => string}
 * @throws {Error}
 */
function getJapaneseChineseKoreanOnlyTextMethod() {
    const method = Reflect.get(Translator.prototype, '_getJapaneseChineseKoreanOnlyText');
    if (typeof method !== 'function') {
        throw new Error('Expected Translator._getJapaneseChineseKoreanOnlyText');
    }
    return method;
}

describe('Translator Japanese filtering', () => {
    const getJapaneseChineseKoreanOnlyText = getJapaneseChineseKoreanOnlyTextMethod();

    test.each([
        ['9月', '9月'],
        ['2026年3月', '2026年3月'],
        ['９月', '９月'],
        ['A月', ''],
        ['9月ABC', '9月'],
    ])('filters %s to %s', (text, expected) => {
        const translator = new Translator(
            /** @type {import('../ext/js/dictionary/dictionary-database.js').DictionaryDatabase} */ (
                /** @type {unknown} */ ({})
            ),
        );

        expect(getJapaneseChineseKoreanOnlyText.call(translator, text)).toStrictEqual(expected);
    });
});
