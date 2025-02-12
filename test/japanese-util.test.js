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
import * as jpw from '../ext/js/language/ja/japanese-wanakana.js';
import * as jp from '../ext/js/language/ja/japanese.js';

describe('Japanese utility functions', () => {
    describe('isCodePointKanji', () => {
        /** @type {[characters: string, expected: boolean][]} */
        const data = [
            ['力方', true],
            ['\u53f1\u{20b9f}', true],
            ['かたカタ々kata、。？,.?', false],
            ['逸逸', true],
        ];

        test.each(data)('%s -> %o', (characters, expected) => {
            for (const character of characters) {
                const codePoint = /** @type {number} */ (character.codePointAt(0));
                const actual = jp.isCodePointKanji(codePoint);
                expect(actual).toStrictEqual(expected); // `isCodePointKanji failed for ${character} (\\u{${codePoint.toString(16)}})`
            }
        });
    });

    describe('isCodePointKana', () => {
        /** @type {[characters: string, expected: boolean][]} */
        const data = [
            ['かたカタ', true],
            ['力方々kata、。？,.?', false],
            ['\u53f1\u{20b9f}', false],
        ];

        test.each(data)('%s -> %o', (characters, expected) => {
            for (const character of characters) {
                const codePoint = /** @type {number} */ (character.codePointAt(0));
                const actual = jp.isCodePointKana(codePoint);
                expect(actual).toStrictEqual(expected); // `isCodePointKana failed for ${character} (\\u{${codePoint.toString(16)}})`
            }
        });
    });

    describe('isCodePointJapanese', () => {
        /** @type {[characters: string, expected: boolean][]} */
        const data = [
            ['かたカタ力方々、。？', true],
            ['\u53f1\u{20b9f}', true],
            ['kata,.?', false],
            ['逸逸', true],
        ];

        test.each(data)('%s -> %o', (characters, expected) => {
            for (const character of characters) {
                const codePoint = /** @type {number} */ (character.codePointAt(0));
                const actual = jp.isCodePointJapanese(codePoint);
                expect(actual).toStrictEqual(expected); // `isCodePointJapanese failed for ${character} (\\u{${codePoint.toString(16)}})`
            }
        });
    });

    describe('isStringEntirelyKana', () => {
        /** @type {[string: string, expected: boolean][]} */
        const data = [
            ['かたかな', true],
            ['カタカナ', true],
            ['ひらがな', true],
            ['ヒラガナ', true],
            ['カタカナひらがな', true],
            ['かたカタ力方々、。？', false],
            ['\u53f1\u{20b9f}', false],
            ['kata,.?', false],
            ['かたカタ力方々、。？invalid', false],
            ['\u53f1\u{20b9f}invalid', false],
            ['kata,.?かた', false],
        ];

        test.each(data)('%s -> %o', (string, expected) => {
            expect(jp.isStringEntirelyKana(string)).toStrictEqual(expected);
        });
    });

    describe('isStringPartiallyJapanese', () => {
        /** @type {[string: string, expected: boolean][]} */
        const data = [
            ['かたかな', true],
            ['カタカナ', true],
            ['ひらがな', true],
            ['ヒラガナ', true],
            ['カタカナひらがな', true],
            ['かたカタ力方々、。？', true],
            ['\u53f1\u{20b9f}', true],
            ['kata,.?', false],
            ['かたカタ力方々、。？invalid', true],
            ['\u53f1\u{20b9f}invalid', true],
            ['kata,.?かた', true],
            ['逸逸', true],
        ];

        test.each(data)('%s -> %o', (string, expected) => {
            expect(jp.isStringPartiallyJapanese(string)).toStrictEqual(expected);
        });
    });

    describe('convertKatakanaToHiragana', () => {
        /** @type {[string: string, expected: string, keepProlongedSoundMarks?: boolean][]} */
        const data = [
            ['かたかな', 'かたかな'],
            ['ひらがな', 'ひらがな'],
            ['カタカナ', 'かたかな'],
            ['ヒラガナ', 'ひらがな'],
            ['カタカナかたかな', 'かたかなかたかな'],
            ['ヒラガナひらがな', 'ひらがなひらがな'],
            ['chikaraちからチカラ力', 'chikaraちからちから力'],
            ['katakana', 'katakana'],
            ['hiragana', 'hiragana'],
            ['カーナー', 'かあなあ'],
            ['カーナー', 'かーなー', true],
        ];

        for (const [string, expected, keepProlongedSoundMarks = false] of data) {
            test(`${string}${keepProlongedSoundMarks ? ' keeping prolonged sound marks' : ''} -> ${expected}`, () => {
                expect(jp.convertKatakanaToHiragana(string, keepProlongedSoundMarks)).toStrictEqual(expected);
            });
        }
    });

    describe('convertHiraganaToKatakana', () => {
        /** @type {[string: string, expected: string][]} */
        const data = [
            ['かたかな', 'カタカナ'],
            ['ひらがな', 'ヒラガナ'],
            ['カタカナ', 'カタカナ'],
            ['ヒラガナ', 'ヒラガナ'],
            ['カタカナかたかな', 'カタカナカタカナ'],
            ['ヒラガナひらがな', 'ヒラガナヒラガナ'],
            ['chikaraちからチカラ力', 'chikaraチカラチカラ力'],
            ['katakana', 'katakana'],
            ['hiragana', 'hiragana'],
        ];

        test.each(data)('%s -> %o', (string, expected) => {
            expect(jp.convertHiraganaToKatakana(string)).toStrictEqual(expected);
        });
    });

    describe('convertToRomaji', () => {
        /** @type {[string: string, expected: string][]} */
        const data = [
            ['かたかな', 'katakana'],
            ['ひらがな', 'hiragana'],
            ['カタカナ', 'katakana'],
            ['ヒラガナ', 'hiragana'],
            ['カタカナかたかな', 'katakanakatakana'],
            ['ヒラガナひらがな', 'hiraganahiragana'],
            ['chikaraちからチカラ力', 'chikarachikarachikara力'],
            ['katakana', 'katakana'],
            ['hiragana', 'hiragana'],
        ];

        test.each(data)('%s -> %o', (string, expected) => {
            expect(jpw.convertToRomaji(string)).toStrictEqual(expected);
        });
    });

    describe('convertAlphanumericToFullWidth', () => {
        /** @type {[string: string, expected: string][]} */
        const data = [
            ['0123456789', '０１２３４５６７８９'],
            ['abcdefghij', 'ａｂｃｄｅｆｇｈｉｊ'],
            ['カタカナ', 'カタカナ'],
            ['ひらがな', 'ひらがな'],
        ];

        test.each(data)('%s -> %o', (string, expected) => {
            expect(jp.convertAlphanumericToFullWidth(string)).toStrictEqual(expected);
        });
    });

    describe('convertHalfWidthKanaToFullWidth', () => {
        /** @type {[string: string, expected: string][]} */
        const data = [
            ['0123456789', '0123456789'],
            ['abcdefghij', 'abcdefghij'],
            ['カタカナ', 'カタカナ'],
            ['ひらがな', 'ひらがな'],
            ['ｶｷ', 'カキ'],
            ['ｶﾞｷ', 'ガキ'],
            ['ﾆﾎﾝ', 'ニホン'],
            ['ﾆｯﾎﾟﾝ', 'ニッポン'],
        ];

        for (const [string, expected] of data) {
            test(`${string} -> ${expected}`, () => {
                const actual1 = jp.convertHalfWidthKanaToFullWidth(string);
                const actual2 = jp.convertHalfWidthKanaToFullWidth(string);
                expect(actual1).toStrictEqual(expected);
                expect(actual2).toStrictEqual(expected);
            });
        }
    });

    describe('convertAlphabeticToKana', () => {
        /** @type {[string: string, expected: string][]} */
        const data = [
            ['0123456789', '0123456789'],
            ['abcdefghij', 'あbcでfgひj'],
            ['ABCDEFGHIJ', 'あbcでfgひj'], // wanakana.toHiragana converts text to lower case
            ['カタカナ', 'カタカナ'],
            ['ひらがな', 'ひらがな'],
            ['chikara', 'ちから'],
            ['CHIKARA', 'ちから'],
        ];

        for (const [string, expected] of data) {
            test(`${string} -> ${string}`, () => {
                const actual1 = jpw.convertAlphabeticToKana(string);
                const actual2 = jpw.convertAlphabeticToKana(string);
                expect(actual1).toStrictEqual(expected);
                expect(actual2).toStrictEqual(expected);
            });
        }
    });

    describe('distributeFurigana', () => {
        /** @type {[input: [term: string, reading: string], expected: {text: string, reading: string}[]][]} */
        const data = [
            [
                ['有り難う', 'ありがとう'],
                [
                    {text: '有', reading: 'あ'},
                    {text: 'り', reading: ''},
                    {text: '難', reading: 'がと'},
                    {text: 'う', reading: ''},
                ],
            ],
            [
                ['方々', 'かたがた'],
                [
                    {text: '方々', reading: 'かたがた'},
                ],
            ],
            [
                ['お祝い', 'おいわい'],
                [
                    {text: 'お', reading: ''},
                    {text: '祝', reading: 'いわ'},
                    {text: 'い', reading: ''},
                ],
            ],
            [
                ['美味しい', 'おいしい'],
                [
                    {text: '美味', reading: 'おい'},
                    {text: 'しい', reading: ''},
                ],
            ],
            [
                ['食べ物', 'たべもの'],
                [
                    {text: '食', reading: 'た'},
                    {text: 'べ', reading: ''},
                    {text: '物', reading: 'もの'},
                ],
            ],
            [
                ['試し切り', 'ためしぎり'],
                [
                    {text: '試', reading: 'ため'},
                    {text: 'し', reading: ''},
                    {text: '切', reading: 'ぎ'},
                    {text: 'り', reading: ''},
                ],
            ],
            // Ambiguous
            [
                ['飼い犬', 'かいいぬ'],
                [
                    {text: '飼い犬', reading: 'かいいぬ'},
                ],
            ],
            [
                ['長い間', 'ながいあいだ'],
                [
                    {text: '長い間', reading: 'ながいあいだ'},
                ],
            ],
            // Same/empty reading
            [
                ['飼い犬', ''],
                [
                    {text: '飼い犬', reading: ''},
                ],
            ],
            [
                ['かいいぬ', 'かいいぬ'],
                [
                    {text: 'かいいぬ', reading: ''},
                ],
            ],
            [
                ['かいぬ', 'かいぬ'],
                [
                    {text: 'かいぬ', reading: ''},
                ],
            ],
            // Misc
            [
                ['月', 'か'],
                [
                    {text: '月', reading: 'か'},
                ],
            ],
            [
                ['月', 'カ'],
                [
                    {text: '月', reading: 'カ'},
                ],
            ],
            // Mismatched kana readings
            [
                ['有り難う', 'アリガトウ'],
                [
                    {text: '有', reading: 'ア'},
                    {text: 'り', reading: 'リ'},
                    {text: '難', reading: 'ガト'},
                    {text: 'う', reading: 'ウ'},
                ],
            ],
            [
                ['ありがとう', 'アリガトウ'],
                [
                    {text: 'ありがとう', reading: 'アリガトウ'},
                ],
            ],
            // Mismatched kana readings (real examples)
            [
                ['カ月', 'かげつ'],
                [
                    {text: 'カ', reading: 'か'},
                    {text: '月', reading: 'げつ'},
                ],
            ],
            [
                ['序ノ口', 'じょのくち'],
                [
                    {text: '序', reading: 'じょ'},
                    {text: 'ノ', reading: 'の'},
                    {text: '口', reading: 'くち'},
                ],
            ],
            [
                ['スズメの涙', 'すずめのなみだ'],
                [
                    {text: 'スズメ', reading: 'すずめ'},
                    {text: 'の', reading: ''},
                    {text: '涙', reading: 'なみだ'},
                ],
            ],
            [
                ['二カ所', 'にかしょ'],
                [
                    {text: '二', reading: 'に'},
                    {text: 'カ', reading: 'か'},
                    {text: '所', reading: 'しょ'},
                ],
            ],
            [
                ['八ツ橋', 'やつはし'],
                [
                    {text: '八', reading: 'や'},
                    {text: 'ツ', reading: 'つ'},
                    {text: '橋', reading: 'はし'},
                ],
            ],
            [
                ['八ツ橋', 'やつはし'],
                [
                    {text: '八', reading: 'や'},
                    {text: 'ツ', reading: 'つ'},
                    {text: '橋', reading: 'はし'},
                ],
            ],
            [
                ['一カ月', 'いっかげつ'],
                [
                    {text: '一', reading: 'いっ'},
                    {text: 'カ', reading: 'か'},
                    {text: '月', reading: 'げつ'},
                ],
            ],
            [
                ['一カ所', 'いっかしょ'],
                [
                    {text: '一', reading: 'いっ'},
                    {text: 'カ', reading: 'か'},
                    {text: '所', reading: 'しょ'},
                ],
            ],
            [
                ['カ所', 'かしょ'],
                [
                    {text: 'カ', reading: 'か'},
                    {text: '所', reading: 'しょ'},
                ],
            ],
            [
                ['数カ月', 'すうかげつ'],
                [
                    {text: '数', reading: 'すう'},
                    {text: 'カ', reading: 'か'},
                    {text: '月', reading: 'げつ'},
                ],
            ],
            [
                ['くノ一', 'くのいち'],
                [
                    {text: 'く', reading: ''},
                    {text: 'ノ', reading: 'の'},
                    {text: '一', reading: 'いち'},
                ],
            ],
            [
                ['くノ一', 'くのいち'],
                [
                    {text: 'く', reading: ''},
                    {text: 'ノ', reading: 'の'},
                    {text: '一', reading: 'いち'},
                ],
            ],
            [
                ['数カ国', 'すうかこく'],
                [
                    {text: '数', reading: 'すう'},
                    {text: 'カ', reading: 'か'},
                    {text: '国', reading: 'こく'},
                ],
            ],
            [
                ['数カ所', 'すうかしょ'],
                [
                    {text: '数', reading: 'すう'},
                    {text: 'カ', reading: 'か'},
                    {text: '所', reading: 'しょ'},
                ],
            ],
            [
                ['壇ノ浦の戦い', 'だんのうらのたたかい'],
                [
                    {text: '壇', reading: 'だん'},
                    {text: 'ノ', reading: 'の'},
                    {text: '浦', reading: 'うら'},
                    {text: 'の', reading: ''},
                    {text: '戦', reading: 'たたか'},
                    {text: 'い', reading: ''},
                ],
            ],
            [
                ['壇ノ浦の戦', 'だんのうらのたたかい'],
                [
                    {text: '壇', reading: 'だん'},
                    {text: 'ノ', reading: 'の'},
                    {text: '浦', reading: 'うら'},
                    {text: 'の', reading: ''},
                    {text: '戦', reading: 'たたかい'},
                ],
            ],
            [
                ['序ノ口格', 'じょのくちかく'],
                [
                    {text: '序', reading: 'じょ'},
                    {text: 'ノ', reading: 'の'},
                    {text: '口格', reading: 'くちかく'},
                ],
            ],
            [
                ['二カ国語', 'にかこくご'],
                [
                    {text: '二', reading: 'に'},
                    {text: 'カ', reading: 'か'},
                    {text: '国語', reading: 'こくご'},
                ],
            ],
            [
                ['カ国', 'かこく'],
                [
                    {text: 'カ', reading: 'か'},
                    {text: '国', reading: 'こく'},
                ],
            ],
            [
                ['カ国語', 'かこくご'],
                [
                    {text: 'カ', reading: 'か'},
                    {text: '国語', reading: 'こくご'},
                ],
            ],
            [
                ['壇ノ浦の合戦', 'だんのうらのかっせん'],
                [
                    {text: '壇', reading: 'だん'},
                    {text: 'ノ', reading: 'の'},
                    {text: '浦', reading: 'うら'},
                    {text: 'の', reading: ''},
                    {text: '合戦', reading: 'かっせん'},
                ],
            ],
            [
                ['一タ偏', 'いちたへん'],
                [
                    {text: '一', reading: 'いち'},
                    {text: 'タ', reading: 'た'},
                    {text: '偏', reading: 'へん'},
                ],
            ],
            [
                ['ル又', 'るまた'],
                [
                    {text: 'ル', reading: 'る'},
                    {text: '又', reading: 'また'},
                ],
            ],
            [
                ['ノ木偏', 'のぎへん'],
                [
                    {text: 'ノ', reading: 'の'},
                    {text: '木偏', reading: 'ぎへん'},
                ],
            ],
            [
                ['一ノ貝', 'いちのかい'],
                [
                    {text: '一', reading: 'いち'},
                    {text: 'ノ', reading: 'の'},
                    {text: '貝', reading: 'かい'},
                ],
            ],
            [
                ['虎ノ門事件', 'とらのもんじけん'],
                [
                    {text: '虎', reading: 'とら'},
                    {text: 'ノ', reading: 'の'},
                    {text: '門事件', reading: 'もんじけん'},
                ],
            ],
            [
                ['教育ニ関スル勅語', 'きょういくにかんするちょくご'],
                [
                    {text: '教育', reading: 'きょういく'},
                    {text: 'ニ', reading: 'に'},
                    {text: '関', reading: 'かん'},
                    {text: 'スル', reading: 'する'},
                    {text: '勅語', reading: 'ちょくご'},
                ],
            ],
            [
                ['二カ年', 'にかねん'],
                [
                    {text: '二', reading: 'に'},
                    {text: 'カ', reading: 'か'},
                    {text: '年', reading: 'ねん'},
                ],
            ],
            [
                ['三カ年', 'さんかねん'],
                [
                    {text: '三', reading: 'さん'},
                    {text: 'カ', reading: 'か'},
                    {text: '年', reading: 'ねん'},
                ],
            ],
            [
                ['四カ年', 'よんかねん'],
                [
                    {text: '四', reading: 'よん'},
                    {text: 'カ', reading: 'か'},
                    {text: '年', reading: 'ねん'},
                ],
            ],
            [
                ['五カ年', 'ごかねん'],
                [
                    {text: '五', reading: 'ご'},
                    {text: 'カ', reading: 'か'},
                    {text: '年', reading: 'ねん'},
                ],
            ],
            [
                ['六カ年', 'ろっかねん'],
                [
                    {text: '六', reading: 'ろっ'},
                    {text: 'カ', reading: 'か'},
                    {text: '年', reading: 'ねん'},
                ],
            ],
            [
                ['七カ年', 'ななかねん'],
                [
                    {text: '七', reading: 'なな'},
                    {text: 'カ', reading: 'か'},
                    {text: '年', reading: 'ねん'},
                ],
            ],
            [
                ['八カ年', 'はちかねん'],
                [
                    {text: '八', reading: 'はち'},
                    {text: 'カ', reading: 'か'},
                    {text: '年', reading: 'ねん'},
                ],
            ],
            [
                ['九カ年', 'きゅうかねん'],
                [
                    {text: '九', reading: 'きゅう'},
                    {text: 'カ', reading: 'か'},
                    {text: '年', reading: 'ねん'},
                ],
            ],
            [
                ['十カ年', 'じゅうかねん'],
                [
                    {text: '十', reading: 'じゅう'},
                    {text: 'カ', reading: 'か'},
                    {text: '年', reading: 'ねん'},
                ],
            ],
            [
                ['鏡ノ間', 'かがみのま'],
                [
                    {text: '鏡', reading: 'かがみ'},
                    {text: 'ノ', reading: 'の'},
                    {text: '間', reading: 'ま'},
                ],
            ],
            [
                ['鏡ノ間', 'かがみのま'],
                [
                    {text: '鏡', reading: 'かがみ'},
                    {text: 'ノ', reading: 'の'},
                    {text: '間', reading: 'ま'},
                ],
            ],
            [
                ['ページ違反', 'ぺーじいはん'],
                [
                    {text: 'ペ', reading: 'ぺ'},
                    {text: 'ー', reading: ''},
                    {text: 'ジ', reading: 'じ'},
                    {text: '違反', reading: 'いはん'},
                ],
            ],
            // Mismatched kana
            [
                ['サボる', 'サボル'],
                [
                    {text: 'サボ', reading: ''},
                    {text: 'る', reading: 'ル'},
                ],
            ],
            // Reading starts with term, but has remainder characters
            [
                ['シック', 'シック・ビルしょうこうぐん'],
                [
                    {text: 'シック', reading: 'シック・ビルしょうこうぐん'},
                ],
            ],
            // Kanji distribution tests
            [
                ['逸らす', 'そらす'],
                [
                    {text: '逸', reading: 'そ'},
                    {text: 'らす', reading: ''},
                ],
            ],
            [
                ['逸らす', 'そらす'],
                [
                    {text: '逸', reading: 'そ'},
                    {text: 'らす', reading: ''},
                ],
            ],
        ];

        test.each(data)('%o -> %o', (input, expected) => {
            const [term, reading] = input;
            const actual = jp.distributeFurigana(term, reading);
            expect(actual).toStrictEqual(expected);
        });
    });

    describe('distributeFuriganaInflected', () => {
        /** @type {[input: [term: string, reading: string, source: string], expected: {text: string, reading: string}[]][]} */
        const data = [
            [
                ['美味しい', 'おいしい', '美味しかた'],
                [
                    {text: '美味', reading: 'おい'},
                    {text: 'しかた', reading: ''},
                ],
            ],
            [
                ['食べる', 'たべる', '食べた'],
                [
                    {text: '食', reading: 'た'},
                    {text: 'べた', reading: ''},
                ],
            ],
            [
                ['迄に', 'までに', 'までに'],
                [
                    {text: 'までに', reading: ''},
                ],
            ],
            [
                ['行う', 'おこなう', 'おこなわなかった'],
                [
                    {text: 'おこなわなかった', reading: ''},
                ],
            ],
            [
                ['いい', 'いい', 'イイ'],
                [
                    {text: 'イイ', reading: ''},
                ],
            ],
            [
                ['否か', 'いなか', '否カ'],
                [
                    {text: '否', reading: 'いな'},
                    {text: 'カ', reading: 'か'},
                ],
            ],
        ];

        test.each(data)('%o -> %o', (input, expected) => {
            const [term, reading, source] = input;
            const actual = jp.distributeFuriganaInflected(term, reading, source);
            expect(actual).toStrictEqual(expected);
        });
    });

    describe('collapseEmphaticSequences', () => {
        /** @type {[input: [text: string, fullCollapse: boolean], output: string][]} */
        const data = [
            [['かこい', false], 'かこい'],
            [['かこい', true], 'かこい'],
            [['かっこい', false], 'かっこい'],
            [['かっこい', true], 'かこい'],
            [['かっっこい', false], 'かっこい'],
            [['かっっこい', true], 'かこい'],
            [['かっっっこい', false], 'かっこい'],
            [['かっっっこい', true], 'かこい'],

            [['すごい', false], 'すごい'],
            [['すごい', true], 'すごい'],
            [['すごーい', false], 'すごーい'],
            [['すごーい', true], 'すごい'],
            [['すごーーい', false], 'すごーい'],
            [['すごーーい', true], 'すごい'],
            [['すっごーい', false], 'すっごーい'],
            [['すっごーい', true], 'すごい'],
            [['すっっごーーい', false], 'すっごーい'],
            [['すっっごーーい', true], 'すごい'],

            [['こい', false], 'こい'],
            [['こい', true], 'こい'],
            [['っこい', false], 'っこい'],
            [['っこい', true], 'っこい'],
            [['っっこい', false], 'っっこい'],
            [['っっこい', true], 'っっこい'],
            [['っっっこい', false], 'っっっこい'],
            [['っっっこい', true], 'っっっこい'],
            [['こいっ', false], 'こいっ'],
            [['こいっ', true], 'こいっ'],
            [['こいっっ', false], 'こいっっ'],
            [['こいっっ', true], 'こいっっ'],
            [['こいっっっ', false], 'こいっっっ'],
            [['こいっっっ', true], 'こいっっっ'],
            [['っこいっ', false], 'っこいっ'],
            [['っこいっ', true], 'っこいっ'],
            [['っっこいっっ', false], 'っっこいっっ'],
            [['っっこいっっ', true], 'っっこいっっ'],
            [['っっっこいっっっ', false], 'っっっこいっっっ'],
            [['っっっこいっっっ', true], 'っっっこいっっっ'],

            [['', false], ''],
            [['', true], ''],
            [['っ', false], 'っ'],
            [['っ', true], 'っ'],
            [['っっ', false], 'っっ'],
            [['っっ', true], 'っっ'],
            [['っっっ', false], 'っっっ'],
            [['っっっ', true], 'っっっ'],

            [['っーッかっこいいっーッ', false], 'っーッかっこいいっーッ'],
            [['っーッかっこいいっーッ', true], 'っーッかこいいっーッ'],
            [['っっーーッッかっこいいっっーーッッ', false], 'っっーーッッかっこいいっっーーッッ'],
            [['っっーーッッかっこいいっっーーッッ', true], 'っっーーッッかこいいっっーーッッ'],

            [['っーッ', false], 'っーッ'],
            [['っーッ', true], 'っーッ'],
            [['っっーーッッ', false], 'っっーーッッ'],
            [['っっーーッッ', true], 'っっーーッッ'],
        ];

        test.each(data)('%o -> %o', (input, output) => {
            const [text, fullCollapse] = input;

            const actual1 = jp.collapseEmphaticSequences(text, fullCollapse);
            const actual2 = jp.collapseEmphaticSequences(text, fullCollapse);
            expect(actual1).toStrictEqual(output);
            expect(actual2).toStrictEqual(output);
        });
    });

    describe('isMoraPitchHigh', () => {
        /** @type {[input: [moraIndex: number, pitchAccentDownstepPosition: number], expected: boolean][]} */
        const data = [
            [[0, 0], false],
            [[1, 0], true],
            [[2, 0], true],
            [[3, 0], true],

            [[0, 1], true],
            [[1, 1], false],
            [[2, 1], false],
            [[3, 1], false],

            [[0, 2], false],
            [[1, 2], true],
            [[2, 2], false],
            [[3, 2], false],

            [[0, 3], false],
            [[1, 3], true],
            [[2, 3], true],
            [[3, 3], false],

            [[0, 4], false],
            [[1, 4], true],
            [[2, 4], true],
            [[3, 4], true],
        ];

        test.each(data)('%o -> %o', (input, expected) => {
            const [moraIndex, pitchAccentDownstepPosition] = input;
            const actual = jp.isMoraPitchHigh(moraIndex, pitchAccentDownstepPosition);
            expect(actual).toStrictEqual(expected);
        });
    });

    describe('getKanaMorae', () => {
        /** @type {[text: string, expected: string[]][]} */
        const data = [
            ['かこ', ['か', 'こ']],
            ['かっこ', ['か', 'っ', 'こ']],
            ['カコ', ['カ', 'コ']],
            ['カッコ', ['カ', 'ッ', 'コ']],
            ['コート', ['コ', 'ー', 'ト']],
            ['ちゃんと', ['ちゃ', 'ん', 'と']],
            ['とうきょう', ['と', 'う', 'きょ', 'う']],
            ['ぎゅう', ['ぎゅ', 'う']],
            ['ディスコ', ['ディ', 'ス', 'コ']],
        ];

        test.each(data)('%s -> %o', (text, expected) => {
            const actual = jp.getKanaMorae(text);
            expect(actual).toStrictEqual(expected);
        });
    });
});

describe('combining dakuten/handakuten normalization', () => {
    const testCasesDakuten = [
        ['か\u3099', 'が'],
        ['き\u3099', 'ぎ'],
        ['く\u3099', 'ぐ'],
        ['け\u3099', 'げ'],
        ['こ\u3099', 'ご'],
        ['さ\u3099', 'ざ'],
        ['し\u3099', 'じ'],
        ['す\u3099', 'ず'],
        ['せ\u3099', 'ぜ'],
        ['そ\u3099', 'ぞ'],
        ['た\u3099', 'だ'],
        ['ち\u3099', 'ぢ'],
        ['つ\u3099', 'づ'],
        ['て\u3099', 'で'],
        ['と\u3099', 'ど'],
        ['は\u3099', 'ば'],
        ['ひ\u3099', 'び'],
        ['ふ\u3099', 'ぶ'],
        ['へ\u3099', 'べ'],
        ['ほ\u3099', 'ぼ'],
        ['カ\u3099', 'ガ'],
        ['キ\u3099', 'ギ'],
        ['ク\u3099', 'グ'],
        ['ケ\u3099', 'ゲ'],
        ['コ\u3099', 'ゴ'],
        ['サ\u3099', 'ザ'],
        ['シ\u3099', 'ジ'],
        ['ス\u3099', 'ズ'],
        ['セ\u3099', 'ゼ'],
        ['ソ\u3099', 'ゾ'],
        ['タ\u3099', 'ダ'],
        ['チ\u3099', 'ヂ'],
        ['ツ\u3099', 'ヅ'],
        ['テ\u3099', 'デ'],
        ['ト\u3099', 'ド'],
        ['ハ\u3099', 'バ'],
        ['ヒ\u3099', 'ビ'],
        ['フ\u3099', 'ブ'],
        ['ヘ\u3099', 'ベ'],
        ['ホ\u3099', 'ボ'],
    ];

    const testCasesHandakuten = [
        ['は\u309A', 'ぱ'],
        ['ひ\u309A', 'ぴ'],
        ['ふ\u309A', 'ぷ'],
        ['へ\u309A', 'ぺ'],
        ['ほ\u309A', 'ぽ'],
        ['ハ\u309A', 'パ'],
        ['ヒ\u309A', 'ピ'],
        ['フ\u309A', 'プ'],
        ['ヘ\u309A', 'ペ'],
        ['ホ\u309A', 'ポ'],
    ];

    const testCasesIgnored = [
        ['な\u3099', 'な\u3099'],
        ['な\u309A', 'な\u309A'],
        ['に\u3099', 'に\u3099'],
        ['に\u309A', 'に\u309A'],
        ['ぬ\u3099', 'ぬ\u3099'],
        ['ぬ\u309A', 'ぬ\u309A'],
        ['ね\u3099', 'ね\u3099'],
        ['ね\u309A', 'ね\u309A'],
        ['の\u3099', 'の\u3099'],
        ['の\u309A', 'の\u309A'],
        ['ま\u3099', 'ま\u3099'],
        ['ま\u309A', 'ま\u309A'],
        ['み\u3099', 'み\u3099'],
        ['み\u309A', 'み\u309A'],
        ['む\u3099', 'む\u3099'],
        ['む\u309A', 'む\u309A'],
        ['め\u3099', 'め\u3099'],
        ['め\u309A', 'め\u309A'],
        ['も\u3099', 'も\u3099'],
        ['も\u309A', 'も\u309A'],
        ['ゃ\u3099', 'ゃ\u3099'],
        ['ゃ\u309A', 'ゃ\u309A'],
        ['や\u3099', 'や\u3099'],
        ['や\u309A', 'や\u309A'],
        ['ゅ\u3099', 'ゅ\u3099'],
        ['ゅ\u309A', 'ゅ\u309A'],
        ['ゆ\u3099', 'ゆ\u3099'],
        ['ゆ\u309A', 'ゆ\u309A'],
        ['ょ\u3099', 'ょ\u3099'],
        ['ょ\u309A', 'ょ\u309A'],
        ['よ\u3099', 'よ\u3099'],
        ['よ\u309A', 'よ\u309A'],
        ['ら\u3099', 'ら\u3099'],
        ['ら\u309A', 'ら\u309A'],
        ['り\u3099', 'り\u3099'],
        ['り\u309A', 'り\u309A'],
        ['る\u3099', 'る\u3099'],
        ['る\u309A', 'る\u309A'],
        ['れ\u3099', 'れ\u3099'],
        ['れ\u309A', 'れ\u309A'],
        ['ろ\u3099', 'ろ\u3099'],
        ['ろ\u309A', 'ろ\u309A'],
        ['ゎ\u3099', 'ゎ\u3099'],
        ['ゎ\u309A', 'ゎ\u309A'],
        ['わ\u3099', 'わ\u3099'],
        ['わ\u309A', 'わ\u309A'],
        ['ゐ\u3099', 'ゐ\u3099'],
        ['ゐ\u309A', 'ゐ\u309A'],
        ['ゑ\u3099', 'ゑ\u3099'],
        ['ゑ\u309A', 'ゑ\u309A'],
        ['を\u3099', 'を\u3099'],
        ['を\u309A', 'を\u309A'],
        ['ん\u3099', 'ん\u3099'],
        ['ん\u309A', 'ん\u309A'],
        ['ナ\u3099', 'ナ\u3099'],
        ['ナ\u309A', 'ナ\u309A'],
        ['ニ\u3099', 'ニ\u3099'],
        ['ニ\u309A', 'ニ\u309A'],
        ['ヌ\u3099', 'ヌ\u3099'],
        ['ヌ\u309A', 'ヌ\u309A'],
        ['ネ\u3099', 'ネ\u3099'],
        ['ネ\u309A', 'ネ\u309A'],
        ['ノ\u3099', 'ノ\u3099'],
        ['ノ\u309A', 'ノ\u309A'],
        ['マ\u3099', 'マ\u3099'],
        ['マ\u309A', 'マ\u309A'],
        ['ミ\u3099', 'ミ\u3099'],
        ['ミ\u309A', 'ミ\u309A'],
        ['ム\u3099', 'ム\u3099'],
        ['ム\u309A', 'ム\u309A'],
        ['メ\u3099', 'メ\u3099'],
        ['メ\u309A', 'メ\u309A'],
        ['モ\u3099', 'モ\u3099'],
        ['モ\u309A', 'モ\u309A'],
        ['ャ\u3099', 'ャ\u3099'],
        ['ャ\u309A', 'ャ\u309A'],
        ['ヤ\u3099', 'ヤ\u3099'],
        ['ヤ\u309A', 'ヤ\u309A'],
        ['ュ\u3099', 'ュ\u3099'],
        ['ュ\u309A', 'ュ\u309A'],
        ['ユ\u3099', 'ユ\u3099'],
        ['ユ\u309A', 'ユ\u309A'],
        ['ョ\u3099', 'ョ\u3099'],
        ['ョ\u309A', 'ョ\u309A'],
        ['ヨ\u3099', 'ヨ\u3099'],
        ['ヨ\u309A', 'ヨ\u309A'],
        ['ラ\u3099', 'ラ\u3099'],
        ['ラ\u309A', 'ラ\u309A'],
        ['リ\u3099', 'リ\u3099'],
        ['リ\u309A', 'リ\u309A'],
        ['ル\u3099', 'ル\u3099'],
        ['ル\u309A', 'ル\u309A'],
        ['レ\u3099', 'レ\u3099'],
        ['レ\u309A', 'レ\u309A'],
        ['ロ\u3099', 'ロ\u3099'],
        ['ロ\u309A', 'ロ\u309A'],
        ['ヮ\u3099', 'ヮ\u3099'],
        ['ヮ\u309A', 'ヮ\u309A'],
        ['ワ\u3099', 'ワ\u3099'],
        ['ワ\u309A', 'ワ\u309A'],
        ['ヰ\u3099', 'ヰ\u3099'],
        ['ヰ\u309A', 'ヰ\u309A'],
        ['ヱ\u3099', 'ヱ\u3099'],
        ['ヱ\u309A', 'ヱ\u309A'],
        ['ヲ\u3099', 'ヲ\u3099'],
        ['ヲ\u309A', 'ヲ\u309A'],
        ['ン\u3099', 'ン\u3099'],
        ['ン\u309A', 'ン\u309A'],
    ];

    const textCasesMisc = [
        ['', ''],
        ['\u3099ハ', '\u3099ハ'],
        ['\u309Aハ', '\u309Aハ'],
        ['さくらし\u3099また\u3099いこん', 'さくらじまだいこん'],
        ['いっほ\u309Aん', 'いっぽん'],
    ];

    const testCases = [...testCasesDakuten, ...testCasesHandakuten, ...testCasesIgnored, ...textCasesMisc];
    test.each(testCases)('%s normalizes to %s', (input, expected) => {
        expect(jp.normalizeCombiningCharacters(input)).toStrictEqual(expected);
    });
});

describe('cjk compatibility characters normalization', () => {
    const testCases = [
        ['㌀', 'アパート'],
        ['㌁', 'アルファ'],
        ['㌂', 'アンペア'],
        ['㌃', 'アール'],
        ['㌄', 'イニング'],
        ['㌅', 'インチ'],
        ['㌆', 'ウォン'],
        ['㌇', 'エスクード'],
        ['㌈', 'エーカー'],
        ['㌉', 'オンス'],
        ['㌊', 'オーム'],
        ['㌋', 'カイリ'],
        ['㌌', 'カラット'],
        ['㌍', 'カロリー'],
        ['㌎', 'ガロン'],
        ['㌏', 'ガンマ'],
        ['㌐', 'ギガ'],
        ['㌑', 'ギニー'],
        ['㌒', 'キュリー'],
        ['㌓', 'ギルダー'],
        ['㌔', 'キロ'],
        ['㌕', 'キログラム'],
        ['㌖', 'キロメートル'],
        ['㌗', 'キロワット'],
        ['㌘', 'グラム'],
        ['㌙', 'グラムトン'],
        ['㌚', 'クルゼイロ'],
        ['㌛', 'クローネ'],
        ['㌜', 'ケース'],
        ['㌝', 'コルナ'],
        ['㌞', 'コーポ'],
        ['㌟', 'サイクル'],
        ['㌠', 'サンチーム'],
        ['㌡', 'シリング'],
        ['㌢', 'センチ'],
        ['㌣', 'セント'],
        ['㌤', 'ダース'],
        ['㌥', 'デシ'],
        ['㌦', 'ドル'],
        ['㌧', 'トン'],
        ['㌨', 'ナノ'],
        ['㌩', 'ノット'],
        ['㌪', 'ハイツ'],
        ['㌫', 'パーセント'],
        ['㌬', 'パーツ'],
        ['㌭', 'バーレル'],
        ['㌮', 'ピアストル'],
        ['㌯', 'ピクル'],
        ['㌰', 'ピコ'],
        ['㌱', 'ビル'],
        ['㌲', 'ファラッド'],
        ['㌳', 'フィート'],
        ['㌴', 'ブッシェル'],
        ['㌵', 'フラン'],
        ['㌶', 'ヘクタール'],
        ['㌷', 'ペソ'],
        ['㌸', 'ペニヒ'],
        ['㌹', 'ヘルツ'],
        ['㌺', 'ペンス'],
        ['㌻', 'ページ'],
        ['㌼', 'ベータ'],
        ['㌽', 'ポイント'],
        ['㌾', 'ボルト'],
        ['㌿', 'ホン'],
        ['㍀', 'ポンド'],
        ['㍁', 'ホール'],
        ['㍂', 'ホーン'],
        ['㍃', 'マイクロ'],
        ['㍄', 'マイル'],
        ['㍅', 'マッハ'],
        ['㍆', 'マルク'],
        ['㍇', 'マンション'],
        ['㍈', 'ミクロン'],
        ['㍉', 'ミリ'],
        ['㍊', 'ミリバール'],
        ['㍋', 'メガ'],
        ['㍌', 'メガトン'],
        ['㍍', 'メートル'],
        ['㍎', 'ヤード'],
        ['㍏', 'ヤール'],
        ['㍐', 'ユアン'],
        ['㍑', 'リットル'],
        ['㍒', 'リラ'],
        ['㍓', 'ルピー'],
        ['㍔', 'ルーブル'],
        ['㍕', 'レム'],
        ['㍖', 'レントゲン'],
        ['㍗', 'ワット'],
        ['㍘', '0点'],
        ['㍙', '1点'],
        ['㍚', '2点'],
        ['㍛', '3点'],
        ['㍜', '4点'],
        ['㍝', '5点'],
        ['㍞', '6点'],
        ['㍟', '7点'],
        ['㍠', '8点'],
        ['㍡', '9点'],
        ['㍢', '10点'],
        ['㍣', '11点'],
        ['㍤', '12点'],
        ['㍥', '13点'],
        ['㍦', '14点'],
        ['㍧', '15点'],
        ['㍨', '16点'],
        ['㍩', '17点'],
        ['㍪', '18点'],
        ['㍫', '19点'],
        ['㍬', '20点'],
        ['㍭', '21点'],
        ['㍮', '22点'],
        ['㍯', '23点'],
        ['㍰', '24点'],
        ['㍻', '平成'],
        ['㍼', '昭和'],
        ['㍽', '大正'],
        ['㍾', '明治'],
        ['㍿', '株式会社'],
        ['㏠', '1日'],
        ['㏡', '2日'],
        ['㏢', '3日'],
        ['㏣', '4日'],
        ['㏤', '5日'],
        ['㏥', '6日'],
        ['㏦', '7日'],
        ['㏧', '8日'],
        ['㏨', '9日'],
        ['㏩', '10日'],
        ['㏪', '11日'],
        ['㏫', '12日'],
        ['㏬', '13日'],
        ['㏭', '14日'],
        ['㏮', '15日'],
        ['㏯', '16日'],
        ['㏰', '17日'],
        ['㏱', '18日'],
        ['㏲', '19日'],
        ['㏳', '20日'],
        ['㏴', '21日'],
        ['㏵', '22日'],
        ['㏶', '23日'],
        ['㏷', '24日'],
        ['㏸', '25日'],
        ['㏹', '26日'],
        ['㏺', '27日'],
        ['㏻', '28日'],
        ['㏼', '29日'],
        ['㏽', '30日'],
        ['㏾', '31日'],
    ];

    test.each(testCases)('%s normalizes to %s', (input, expected) => {
        expect(jp.normalizeCJKCompatibilityCharacters(input)).toStrictEqual(expected);
    });
});
