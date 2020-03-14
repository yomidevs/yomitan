/*
 * Copyright (C) 2020  Alex Yatskov <alex@foosoft.net>
 * Author: Alex Yatskov <alex@foosoft.net>
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

const assert = require('assert');
const {VM} = require('./yomichan-vm');

const vm = new VM();
vm.execute([
    'mixed/lib/wanakana.min.js',
    'bg/js/japanese.js'
]);
const jp = vm.get('jp');


function testIsCodePointKanji() {
    const data = [
        ['力方', true],
        ['\u53f1\u{20b9f}', true],
        ['かたカタ々kata、。？,.?', false]
    ];

    for (const [characters, expected] of data) {
        for (const character of characters) {
            const codePoint = character.codePointAt(0);
            const actual = jp.isCodePointKanji(codePoint);
            assert.strictEqual(actual, expected, `isCodePointKanji failed for ${character} (\\u{${codePoint.toString(16)}})`);
        }
    }
}

function testIsCodePointKana() {
    const data = [
        ['かたカタ', true],
        ['力方々kata、。？,.?', false],
        ['\u53f1\u{20b9f}', false]
    ];

    for (const [characters, expected] of data) {
        for (const character of characters) {
            const codePoint = character.codePointAt(0);
            const actual = jp.isCodePointKana(codePoint);
            assert.strictEqual(actual, expected, `isCodePointKana failed for ${character} (\\u{${codePoint.toString(16)}})`);
        }
    }
}

function testIsCodePointJapanese() {
    const data = [
        ['かたカタ力方々、。？', true],
        ['\u53f1\u{20b9f}', true],
        ['kata,.?', false]
    ];

    for (const [characters, expected] of data) {
        for (const character of characters) {
            const codePoint = character.codePointAt(0);
            const actual = jp.isCodePointJapanese(codePoint);
            assert.strictEqual(actual, expected, `isCodePointJapanese failed for ${character} (\\u{${codePoint.toString(16)}})`);
        }
    }
}

function testIsStringEntirelyKana() {
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
        ['kata,.?かた', false]
    ];

    for (const [string, expected] of data) {
        assert.strictEqual(jp.isStringEntirelyKana(string), expected);
    }
}

function testIsStringPartiallyJapanese() {
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
        ['kata,.?かた', true]
    ];

    for (const [string, expected] of data) {
        assert.strictEqual(jp.isStringPartiallyJapanese(string), expected);
    }
}

function testConvertKatakanaToHiragana() {
    const data = [
        ['かたかな', 'かたかな'],
        ['ひらがな', 'ひらがな'],
        ['カタカナ', 'かたかな'],
        ['ヒラガナ', 'ひらがな'],
        ['カタカナかたかな', 'かたかなかたかな'],
        ['ヒラガナひらがな', 'ひらがなひらがな'],
        ['chikaraちからチカラ力', 'chikaraちからちから力'],
        ['katakana', 'katakana'],
        ['hiragana', 'hiragana']
    ];

    for (const [string, expected] of data) {
        assert.strictEqual(jp.convertKatakanaToHiragana(string), expected);
    }
}

function testConvertHiraganaToKatakana() {
    const data = [
        ['かたかな', 'カタカナ'],
        ['ひらがな', 'ヒラガナ'],
        ['カタカナ', 'カタカナ'],
        ['ヒラガナ', 'ヒラガナ'],
        ['カタカナかたかな', 'カタカナカタカナ'],
        ['ヒラガナひらがな', 'ヒラガナヒラガナ'],
        ['chikaraちからチカラ力', 'chikaraチカラチカラ力'],
        ['katakana', 'katakana'],
        ['hiragana', 'hiragana']
    ];

    for (const [string, expected] of data) {
        assert.strictEqual(jp.convertHiraganaToKatakana(string), expected);
    }
}

function testConvertToRomaji() {
    const data = [
        ['かたかな', 'katakana'],
        ['ひらがな', 'hiragana'],
        ['カタカナ', 'katakana'],
        ['ヒラガナ', 'hiragana'],
        ['カタカナかたかな', 'katakanakatakana'],
        ['ヒラガナひらがな', 'hiraganahiragana'],
        ['chikaraちからチカラ力', 'chikarachikarachikara力'],
        ['katakana', 'katakana'],
        ['hiragana', 'hiragana']
    ];

    for (const [string, expected] of data) {
        assert.strictEqual(jp.convertToRomaji(string), expected);
    }
}

function testConvertReading() {
    const data = [
        [['アリガトウ', 'アリガトウ', 'hiragana'], 'ありがとう'],
        [['アリガトウ', 'アリガトウ', 'katakana'], 'アリガトウ'],
        [['アリガトウ', 'アリガトウ', 'romaji'], 'arigatou'],
        [['アリガトウ', 'アリガトウ', 'none'], null],
        [['アリガトウ', 'アリガトウ', 'default'], 'アリガトウ'],

        [['ありがとう', 'ありがとう', 'hiragana'], 'ありがとう'],
        [['ありがとう', 'ありがとう', 'katakana'], 'アリガトウ'],
        [['ありがとう', 'ありがとう', 'romaji'], 'arigatou'],
        [['ありがとう', 'ありがとう', 'none'], null],
        [['ありがとう', 'ありがとう', 'default'], 'ありがとう'],

        [['有り難う', 'ありがとう', 'hiragana'], 'ありがとう'],
        [['有り難う', 'ありがとう', 'katakana'], 'アリガトウ'],
        [['有り難う', 'ありがとう', 'romaji'], 'arigatou'],
        [['有り難う', 'ありがとう', 'none'], null],
        [['有り難う', 'ありがとう', 'default'], 'ありがとう']
    ];

    for (const [[expressionFragment, readingFragment, readingMode], expected] of data) {
        assert.strictEqual(jp.convertReading(expressionFragment, readingFragment, readingMode), expected);
    }
}

function testConvertNumericToFullWidth() {
    const data = [
        ['0123456789', '０１２３４５６７８９'],
        ['abcdefghij', 'abcdefghij'],
        ['カタカナ', 'カタカナ'],
        ['ひらがな', 'ひらがな']
    ];

    for (const [string, expected] of data) {
        assert.strictEqual(jp.convertNumericToFullWidth(string), expected);
    }
}

function testConvertHalfWidthKanaToFullWidth() {
    const data = [
        ['0123456789', '0123456789'],
        ['abcdefghij', 'abcdefghij'],
        ['カタカナ', 'カタカナ'],
        ['ひらがな', 'ひらがな'],
        ['ｶｷ', 'カキ', [1, 1]],
        ['ｶﾞｷ', 'ガキ', [2, 1]],
        ['ﾆﾎﾝ', 'ニホン', [1, 1, 1]],
        ['ﾆｯﾎﾟﾝ', 'ニッポン', [1, 1, 2, 1]]
    ];

    for (const [string, expected, expectedSourceMapping] of data) {
        const sourceMapping = new Array(string.length).fill(1);
        const actual1 = jp.convertHalfWidthKanaToFullWidth(string, null);
        const actual2 = jp.convertHalfWidthKanaToFullWidth(string, sourceMapping);
        assert.strictEqual(actual1, expected);
        assert.strictEqual(actual2, expected);
        if (Array.isArray(expectedSourceMapping)) {
            vm.assert.deepStrictEqual(sourceMapping, expectedSourceMapping);
        }
    }
}

function testConvertAlphabeticToKana() {
    const data = [
        ['0123456789', '0123456789'],
        ['abcdefghij', 'あbcでfgひj', [1, 1, 1, 2, 1, 1, 2, 1]],
        ['ABCDEFGHIJ', 'あbcでfgひj', [1, 1, 1, 2, 1, 1, 2, 1]], // wanakana.toHiragana converts text to lower case
        ['カタカナ', 'カタカナ'],
        ['ひらがな', 'ひらがな'],
        ['chikara', 'ちから', [3, 2, 2]],
        ['CHIKARA', 'ちから', [3, 2, 2]]
    ];

    for (const [string, expected, expectedSourceMapping] of data) {
        const sourceMapping = new Array(string.length).fill(1);
        const actual1 = jp.convertAlphabeticToKana(string, null);
        const actual2 = jp.convertAlphabeticToKana(string, sourceMapping);
        assert.strictEqual(actual1, expected);
        assert.strictEqual(actual2, expected);
        if (Array.isArray(expectedSourceMapping)) {
            vm.assert.deepStrictEqual(sourceMapping, expectedSourceMapping);
        }
    }
}

function testDistributeFurigana() {
    const data = [
        [
            ['有り難う', 'ありがとう'],
            [
                {text: '有', furigana: 'あ'},
                {text: 'り'},
                {text: '難', furigana: 'がと'},
                {text: 'う'}
            ]
        ],
        [
            ['方々', 'かたがた'],
            [
                {text: '方々', furigana: 'かたがた'}
            ]
        ],
        [
            ['お祝い', 'おいわい'],
            [
                {text: 'お'},
                {text: '祝', furigana: 'いわ'},
                {text: 'い'}
            ]
        ],
        [
            ['美味しい', 'おいしい'],
            [
                {text: '美味', furigana: 'おい'},
                {text: 'しい'}
            ]
        ],
        [
            ['食べ物', 'たべもの'],
            [
                {text: '食', furigana: 'た'},
                {text: 'べ'},
                {text: '物', furigana: 'もの'}
            ]
        ],
        [
            ['試し切り', 'ためしぎり'],
            [
                {text: '試', furigana: 'ため'},
                {text: 'し'},
                {text: '切', furigana: 'ぎ'},
                {text: 'り'}
            ]
        ],
        // Ambiguous
        [
            ['飼い犬', 'かいいぬ'],
            [
                {text: '飼い犬', furigana: 'かいいぬ'}
            ]
        ],
        [
            ['長い間', 'ながいあいだ'],
            [
                {text: '長い間', furigana: 'ながいあいだ'}
            ]
        ]
    ];

    for (const [[expression, reading], expected] of data) {
        const actual = jp.distributeFurigana(expression, reading);
        vm.assert.deepStrictEqual(actual, expected);
    }
}

function testDistributeFuriganaInflected() {
    const data = [
        [
            ['美味しい', 'おいしい', '美味しかた'],
            [
                {text: '美味', furigana: 'おい'},
                {text: 'し'},
                {text: 'かた'}
            ]
        ],
        [
            ['食べる', 'たべる', '食べた'],
            [
                {text: '食', furigana: 'た'},
                {text: 'べ'},
                {text: 'た'}
            ]
        ]
    ];

    for (const [[expression, reading, source], expected] of data) {
        const actual = jp.distributeFuriganaInflected(expression, reading, source);
        vm.assert.deepStrictEqual(actual, expected);
    }
}


function main() {
    testIsCodePointKanji();
    testIsCodePointKana();
    testIsCodePointJapanese();
    testIsStringEntirelyKana();
    testIsStringPartiallyJapanese();
    testConvertKatakanaToHiragana();
    testConvertHiraganaToKatakana();
    testConvertToRomaji();
    testConvertReading();
    testConvertNumericToFullWidth();
    testConvertHalfWidthKanaToFullWidth();
    testConvertAlphabeticToKana();
    testDistributeFurigana();
    testDistributeFuriganaInflected();
}


if (require.main === module) { main(); }
