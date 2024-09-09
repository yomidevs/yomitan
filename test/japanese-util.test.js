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
                    {reading: 'あ', text: '有'},
                    {reading: '', text: 'り'},
                    {reading: 'がと', text: '難'},
                    {reading: '', text: 'う'},
                ],
            ],
            [
                ['方々', 'かたがた'],
                [
                    {reading: 'かたがた', text: '方々'},
                ],
            ],
            [
                ['お祝い', 'おいわい'],
                [
                    {reading: '', text: 'お'},
                    {reading: 'いわ', text: '祝'},
                    {reading: '', text: 'い'},
                ],
            ],
            [
                ['美味しい', 'おいしい'],
                [
                    {reading: 'おい', text: '美味'},
                    {reading: '', text: 'しい'},
                ],
            ],
            [
                ['食べ物', 'たべもの'],
                [
                    {reading: 'た', text: '食'},
                    {reading: '', text: 'べ'},
                    {reading: 'もの', text: '物'},
                ],
            ],
            [
                ['試し切り', 'ためしぎり'],
                [
                    {reading: 'ため', text: '試'},
                    {reading: '', text: 'し'},
                    {reading: 'ぎ', text: '切'},
                    {reading: '', text: 'り'},
                ],
            ],
            // Ambiguous
            [
                ['飼い犬', 'かいいぬ'],
                [
                    {reading: 'かいいぬ', text: '飼い犬'},
                ],
            ],
            [
                ['長い間', 'ながいあいだ'],
                [
                    {reading: 'ながいあいだ', text: '長い間'},
                ],
            ],
            // Same/empty reading
            [
                ['飼い犬', ''],
                [
                    {reading: '', text: '飼い犬'},
                ],
            ],
            [
                ['かいいぬ', 'かいいぬ'],
                [
                    {reading: '', text: 'かいいぬ'},
                ],
            ],
            [
                ['かいぬ', 'かいぬ'],
                [
                    {reading: '', text: 'かいぬ'},
                ],
            ],
            // Misc
            [
                ['月', 'か'],
                [
                    {reading: 'か', text: '月'},
                ],
            ],
            [
                ['月', 'カ'],
                [
                    {reading: 'カ', text: '月'},
                ],
            ],
            // Mismatched kana readings
            [
                ['有り難う', 'アリガトウ'],
                [
                    {reading: 'ア', text: '有'},
                    {reading: 'リ', text: 'り'},
                    {reading: 'ガト', text: '難'},
                    {reading: 'ウ', text: 'う'},
                ],
            ],
            [
                ['ありがとう', 'アリガトウ'],
                [
                    {reading: 'アリガトウ', text: 'ありがとう'},
                ],
            ],
            // Mismatched kana readings (real examples)
            [
                ['カ月', 'かげつ'],
                [
                    {reading: 'か', text: 'カ'},
                    {reading: 'げつ', text: '月'},
                ],
            ],
            [
                ['序ノ口', 'じょのくち'],
                [
                    {reading: 'じょ', text: '序'},
                    {reading: 'の', text: 'ノ'},
                    {reading: 'くち', text: '口'},
                ],
            ],
            [
                ['スズメの涙', 'すずめのなみだ'],
                [
                    {reading: 'すずめ', text: 'スズメ'},
                    {reading: '', text: 'の'},
                    {reading: 'なみだ', text: '涙'},
                ],
            ],
            [
                ['二カ所', 'にかしょ'],
                [
                    {reading: 'に', text: '二'},
                    {reading: 'か', text: 'カ'},
                    {reading: 'しょ', text: '所'},
                ],
            ],
            [
                ['八ツ橋', 'やつはし'],
                [
                    {reading: 'や', text: '八'},
                    {reading: 'つ', text: 'ツ'},
                    {reading: 'はし', text: '橋'},
                ],
            ],
            [
                ['八ツ橋', 'やつはし'],
                [
                    {reading: 'や', text: '八'},
                    {reading: 'つ', text: 'ツ'},
                    {reading: 'はし', text: '橋'},
                ],
            ],
            [
                ['一カ月', 'いっかげつ'],
                [
                    {reading: 'いっ', text: '一'},
                    {reading: 'か', text: 'カ'},
                    {reading: 'げつ', text: '月'},
                ],
            ],
            [
                ['一カ所', 'いっかしょ'],
                [
                    {reading: 'いっ', text: '一'},
                    {reading: 'か', text: 'カ'},
                    {reading: 'しょ', text: '所'},
                ],
            ],
            [
                ['カ所', 'かしょ'],
                [
                    {reading: 'か', text: 'カ'},
                    {reading: 'しょ', text: '所'},
                ],
            ],
            [
                ['数カ月', 'すうかげつ'],
                [
                    {reading: 'すう', text: '数'},
                    {reading: 'か', text: 'カ'},
                    {reading: 'げつ', text: '月'},
                ],
            ],
            [
                ['くノ一', 'くのいち'],
                [
                    {reading: '', text: 'く'},
                    {reading: 'の', text: 'ノ'},
                    {reading: 'いち', text: '一'},
                ],
            ],
            [
                ['くノ一', 'くのいち'],
                [
                    {reading: '', text: 'く'},
                    {reading: 'の', text: 'ノ'},
                    {reading: 'いち', text: '一'},
                ],
            ],
            [
                ['数カ国', 'すうかこく'],
                [
                    {reading: 'すう', text: '数'},
                    {reading: 'か', text: 'カ'},
                    {reading: 'こく', text: '国'},
                ],
            ],
            [
                ['数カ所', 'すうかしょ'],
                [
                    {reading: 'すう', text: '数'},
                    {reading: 'か', text: 'カ'},
                    {reading: 'しょ', text: '所'},
                ],
            ],
            [
                ['壇ノ浦の戦い', 'だんのうらのたたかい'],
                [
                    {reading: 'だん', text: '壇'},
                    {reading: 'の', text: 'ノ'},
                    {reading: 'うら', text: '浦'},
                    {reading: '', text: 'の'},
                    {reading: 'たたか', text: '戦'},
                    {reading: '', text: 'い'},
                ],
            ],
            [
                ['壇ノ浦の戦', 'だんのうらのたたかい'],
                [
                    {reading: 'だん', text: '壇'},
                    {reading: 'の', text: 'ノ'},
                    {reading: 'うら', text: '浦'},
                    {reading: '', text: 'の'},
                    {reading: 'たたかい', text: '戦'},
                ],
            ],
            [
                ['序ノ口格', 'じょのくちかく'],
                [
                    {reading: 'じょ', text: '序'},
                    {reading: 'の', text: 'ノ'},
                    {reading: 'くちかく', text: '口格'},
                ],
            ],
            [
                ['二カ国語', 'にかこくご'],
                [
                    {reading: 'に', text: '二'},
                    {reading: 'か', text: 'カ'},
                    {reading: 'こくご', text: '国語'},
                ],
            ],
            [
                ['カ国', 'かこく'],
                [
                    {reading: 'か', text: 'カ'},
                    {reading: 'こく', text: '国'},
                ],
            ],
            [
                ['カ国語', 'かこくご'],
                [
                    {reading: 'か', text: 'カ'},
                    {reading: 'こくご', text: '国語'},
                ],
            ],
            [
                ['壇ノ浦の合戦', 'だんのうらのかっせん'],
                [
                    {reading: 'だん', text: '壇'},
                    {reading: 'の', text: 'ノ'},
                    {reading: 'うら', text: '浦'},
                    {reading: '', text: 'の'},
                    {reading: 'かっせん', text: '合戦'},
                ],
            ],
            [
                ['一タ偏', 'いちたへん'],
                [
                    {reading: 'いち', text: '一'},
                    {reading: 'た', text: 'タ'},
                    {reading: 'へん', text: '偏'},
                ],
            ],
            [
                ['ル又', 'るまた'],
                [
                    {reading: 'る', text: 'ル'},
                    {reading: 'また', text: '又'},
                ],
            ],
            [
                ['ノ木偏', 'のぎへん'],
                [
                    {reading: 'の', text: 'ノ'},
                    {reading: 'ぎへん', text: '木偏'},
                ],
            ],
            [
                ['一ノ貝', 'いちのかい'],
                [
                    {reading: 'いち', text: '一'},
                    {reading: 'の', text: 'ノ'},
                    {reading: 'かい', text: '貝'},
                ],
            ],
            [
                ['虎ノ門事件', 'とらのもんじけん'],
                [
                    {reading: 'とら', text: '虎'},
                    {reading: 'の', text: 'ノ'},
                    {reading: 'もんじけん', text: '門事件'},
                ],
            ],
            [
                ['教育ニ関スル勅語', 'きょういくにかんするちょくご'],
                [
                    {reading: 'きょういく', text: '教育'},
                    {reading: 'に', text: 'ニ'},
                    {reading: 'かん', text: '関'},
                    {reading: 'する', text: 'スル'},
                    {reading: 'ちょくご', text: '勅語'},
                ],
            ],
            [
                ['二カ年', 'にかねん'],
                [
                    {reading: 'に', text: '二'},
                    {reading: 'か', text: 'カ'},
                    {reading: 'ねん', text: '年'},
                ],
            ],
            [
                ['三カ年', 'さんかねん'],
                [
                    {reading: 'さん', text: '三'},
                    {reading: 'か', text: 'カ'},
                    {reading: 'ねん', text: '年'},
                ],
            ],
            [
                ['四カ年', 'よんかねん'],
                [
                    {reading: 'よん', text: '四'},
                    {reading: 'か', text: 'カ'},
                    {reading: 'ねん', text: '年'},
                ],
            ],
            [
                ['五カ年', 'ごかねん'],
                [
                    {reading: 'ご', text: '五'},
                    {reading: 'か', text: 'カ'},
                    {reading: 'ねん', text: '年'},
                ],
            ],
            [
                ['六カ年', 'ろっかねん'],
                [
                    {reading: 'ろっ', text: '六'},
                    {reading: 'か', text: 'カ'},
                    {reading: 'ねん', text: '年'},
                ],
            ],
            [
                ['七カ年', 'ななかねん'],
                [
                    {reading: 'なな', text: '七'},
                    {reading: 'か', text: 'カ'},
                    {reading: 'ねん', text: '年'},
                ],
            ],
            [
                ['八カ年', 'はちかねん'],
                [
                    {reading: 'はち', text: '八'},
                    {reading: 'か', text: 'カ'},
                    {reading: 'ねん', text: '年'},
                ],
            ],
            [
                ['九カ年', 'きゅうかねん'],
                [
                    {reading: 'きゅう', text: '九'},
                    {reading: 'か', text: 'カ'},
                    {reading: 'ねん', text: '年'},
                ],
            ],
            [
                ['十カ年', 'じゅうかねん'],
                [
                    {reading: 'じゅう', text: '十'},
                    {reading: 'か', text: 'カ'},
                    {reading: 'ねん', text: '年'},
                ],
            ],
            [
                ['鏡ノ間', 'かがみのま'],
                [
                    {reading: 'かがみ', text: '鏡'},
                    {reading: 'の', text: 'ノ'},
                    {reading: 'ま', text: '間'},
                ],
            ],
            [
                ['鏡ノ間', 'かがみのま'],
                [
                    {reading: 'かがみ', text: '鏡'},
                    {reading: 'の', text: 'ノ'},
                    {reading: 'ま', text: '間'},
                ],
            ],
            [
                ['ページ違反', 'ぺーじいはん'],
                [
                    {reading: 'ぺ', text: 'ペ'},
                    {reading: '', text: 'ー'},
                    {reading: 'じ', text: 'ジ'},
                    {reading: 'いはん', text: '違反'},
                ],
            ],
            // Mismatched kana
            [
                ['サボる', 'サボル'],
                [
                    {reading: '', text: 'サボ'},
                    {reading: 'ル', text: 'る'},
                ],
            ],
            // Reading starts with term, but has remainder characters
            [
                ['シック', 'シック・ビルしょうこうぐん'],
                [
                    {reading: 'シック・ビルしょうこうぐん', text: 'シック'},
                ],
            ],
            // Kanji distribution tests
            [
                ['逸らす', 'そらす'],
                [
                    {reading: 'そ', text: '逸'},
                    {reading: '', text: 'らす'},
                ],
            ],
            [
                ['逸らす', 'そらす'],
                [
                    {reading: 'そ', text: '逸'},
                    {reading: '', text: 'らす'},
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
                    {reading: 'おい', text: '美味'},
                    {reading: '', text: 'しかた'},
                ],
            ],
            [
                ['食べる', 'たべる', '食べた'],
                [
                    {reading: 'た', text: '食'},
                    {reading: '', text: 'べた'},
                ],
            ],
            [
                ['迄に', 'までに', 'までに'],
                [
                    {reading: '', text: 'までに'},
                ],
            ],
            [
                ['行う', 'おこなう', 'おこなわなかった'],
                [
                    {reading: '', text: 'おこなわなかった'},
                ],
            ],
            [
                ['いい', 'いい', 'イイ'],
                [
                    {reading: '', text: 'イイ'},
                ],
            ],
            [
                ['否か', 'いなか', '否カ'],
                [
                    {reading: 'いな', text: '否'},
                    {reading: 'か', text: 'カ'},
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
