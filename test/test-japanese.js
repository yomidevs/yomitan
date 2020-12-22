/*
 * Copyright (C) 2020  Yomichan Authors
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
const {testMain} = require('../dev/util');
const {VM} = require('../dev/vm');

const vm = new VM();
vm.execute([
    'mixed/lib/wanakana.min.js',
    'mixed/js/japanese.js',
    'bg/js/text-source-map.js'
]);
const [JapaneseUtil, TextSourceMap, wanakana] = vm.get(['JapaneseUtil', 'TextSourceMap', 'wanakana']);
const jp = new JapaneseUtil(wanakana);


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
        [['アリガトウ', 'アリガトウ', 'none'], ''],
        [['アリガトウ', 'アリガトウ', 'default'], 'アリガトウ'],

        [['ありがとう', 'ありがとう', 'hiragana'], 'ありがとう'],
        [['ありがとう', 'ありがとう', 'katakana'], 'アリガトウ'],
        [['ありがとう', 'ありがとう', 'romaji'], 'arigatou'],
        [['ありがとう', 'ありがとう', 'none'], ''],
        [['ありがとう', 'ありがとう', 'default'], 'ありがとう'],

        [['有り難う', 'ありがとう', 'hiragana'], 'ありがとう'],
        [['有り難う', 'ありがとう', 'katakana'], 'アリガトウ'],
        [['有り難う', 'ありがとう', 'romaji'], 'arigatou'],
        [['有り難う', 'ありがとう', 'none'], ''],
        [['有り難う', 'ありがとう', 'default'], 'ありがとう'],

        // Cases with falsy readings

        [['ありがとう', '', 'hiragana'], ''],
        [['ありがとう', '', 'katakana'], ''],
        [['ありがとう', '', 'romaji'], 'arigatou'],
        [['ありがとう', '', 'none'], ''],
        [['ありがとう', '', 'default'], ''],

        // Cases with falsy readings and kanji expressions

        [['有り難う', '', 'hiragana'], ''],
        [['有り難う', '', 'katakana'], ''],
        [['有り難う', '', 'romaji'], ''],
        [['有り難う', '', 'none'], ''],
        [['有り難う', '', 'default'], '']
    ];

    for (const [[expression, reading, readingMode], expected] of data) {
        assert.strictEqual(jp.convertReading(expression, reading, readingMode), expected);
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
        const sourceMap = new TextSourceMap(string);
        const actual1 = jp.convertHalfWidthKanaToFullWidth(string, null);
        const actual2 = jp.convertHalfWidthKanaToFullWidth(string, sourceMap);
        assert.strictEqual(actual1, expected);
        assert.strictEqual(actual2, expected);
        if (typeof expectedSourceMapping !== 'undefined') {
            assert.ok(sourceMap.equals(new TextSourceMap(string, expectedSourceMapping)));
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
        const sourceMap = new TextSourceMap(string);
        const actual1 = jp.convertAlphabeticToKana(string, null);
        const actual2 = jp.convertAlphabeticToKana(string, sourceMap);
        assert.strictEqual(actual1, expected);
        assert.strictEqual(actual2, expected);
        if (typeof expectedSourceMapping !== 'undefined') {
            assert.ok(sourceMap.equals(new TextSourceMap(string, expectedSourceMapping)));
        }
    }
}

function testDistributeFurigana() {
    const data = [
        [
            ['有り難う', 'ありがとう'],
            [
                {text: '有', furigana: 'あ'},
                {text: 'り', furigana: ''},
                {text: '難', furigana: 'がと'},
                {text: 'う', furigana: ''}
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
                {text: 'お', furigana: ''},
                {text: '祝', furigana: 'いわ'},
                {text: 'い', furigana: ''}
            ]
        ],
        [
            ['美味しい', 'おいしい'],
            [
                {text: '美味', furigana: 'おい'},
                {text: 'しい', furigana: ''}
            ]
        ],
        [
            ['食べ物', 'たべもの'],
            [
                {text: '食', furigana: 'た'},
                {text: 'べ', furigana: ''},
                {text: '物', furigana: 'もの'}
            ]
        ],
        [
            ['試し切り', 'ためしぎり'],
            [
                {text: '試', furigana: 'ため'},
                {text: 'し', furigana: ''},
                {text: '切', furigana: 'ぎ'},
                {text: 'り', furigana: ''}
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
        ],
        // Same/empty reading
        [
            ['飼い犬', ''],
            [
                {text: '飼い犬', furigana: ''}
            ]
        ],
        [
            ['かいいぬ', 'かいいぬ'],
            [
                {text: 'かいいぬ', furigana: ''}
            ]
        ],
        [
            ['かいぬ', 'かいぬ'],
            [
                {text: 'かいぬ', furigana: ''}
            ]
        ],
        // Misc
        [
            ['月', 'か'],
            [
                {text: '月', furigana: 'か'}
            ]
        ],
        [
            ['月', 'カ'],
            [
                {text: '月', furigana: 'カ'}
            ]
        ],
        // Mismatched kana readings
        [
            ['有り難う', 'アリガトウ'],
            [
                {text: '有', furigana: 'ア'},
                {text: 'り', furigana: 'リ'},
                {text: '難', furigana: 'ガト'},
                {text: 'う', furigana: 'ウ'}
            ]
        ],
        [
            ['ありがとう', 'アリガトウ'],
            [
                {text: 'ありがとう', furigana: 'アリガトウ'}
            ]
        ],
        // Mismatched kana readings (real examples)
        [
            ['カ月', 'かげつ'],
            [
                {text: 'カ', furigana: 'か'},
                {text: '月', furigana: 'げつ'}
            ]
        ],
        [
            ['序ノ口', 'じょのくち'],
            [
                {text: '序', furigana: 'じょ'},
                {text: 'ノ', furigana: 'の'},
                {text: '口', furigana: 'くち'}
            ]
        ],
        [
            ['スズメの涙', 'すずめのなみだ'],
            [
                {text: 'スズメの', furigana: 'すずめの'},
                {text: '涙', furigana: 'なみだ'}
            ]
        ],
        [
            ['二カ所', 'にかしょ'],
            [
                {text: '二', furigana: 'に'},
                {text: 'カ', furigana: 'か'},
                {text: '所', furigana: 'しょ'}
            ]
        ],
        [
            ['八ツ橋', 'やつはし'],
            [
                {text: '八', furigana: 'や'},
                {text: 'ツ', furigana: 'つ'},
                {text: '橋', furigana: 'はし'}
            ]
        ],
        [
            ['八ツ橋', 'やつはし'],
            [
                {text: '八', furigana: 'や'},
                {text: 'ツ', furigana: 'つ'},
                {text: '橋', furigana: 'はし'}
            ]
        ],
        [
            ['一カ月', 'いっかげつ'],
            [
                {text: '一', furigana: 'いっ'},
                {text: 'カ', furigana: 'か'},
                {text: '月', furigana: 'げつ'}
            ]
        ],
        [
            ['一カ所', 'いっかしょ'],
            [
                {text: '一', furigana: 'いっ'},
                {text: 'カ', furigana: 'か'},
                {text: '所', furigana: 'しょ'}
            ]
        ],
        [
            ['カ所', 'かしょ'],
            [
                {text: 'カ', furigana: 'か'},
                {text: '所', furigana: 'しょ'}
            ]
        ],
        [
            ['数カ月', 'すうかげつ'],
            [
                {text: '数', furigana: 'すう'},
                {text: 'カ', furigana: 'か'},
                {text: '月', furigana: 'げつ'}
            ]
        ],
        [
            ['くノ一', 'くのいち'],
            [
                {text: 'くノ', furigana: 'くの'},
                {text: '一', furigana: 'いち'}
            ]
        ],
        [
            ['くノ一', 'くのいち'],
            [
                {text: 'くノ', furigana: 'くの'},
                {text: '一', furigana: 'いち'}
            ]
        ],
        [
            ['数カ国', 'すうかこく'],
            [
                {text: '数', furigana: 'すう'},
                {text: 'カ', furigana: 'か'},
                {text: '国', furigana: 'こく'}
            ]
        ],
        [
            ['数カ所', 'すうかしょ'],
            [
                {text: '数', furigana: 'すう'},
                {text: 'カ', furigana: 'か'},
                {text: '所', furigana: 'しょ'}
            ]
        ],
        [
            ['壇ノ浦の戦い', 'だんのうらのたたかい'],
            [
                {text: '壇', furigana: 'だん'},
                {text: 'ノ', furigana: 'の'},
                {text: '浦', furigana: 'うら'},
                {text: 'の', furigana: ''},
                {text: '戦', furigana: 'たたか'},
                {text: 'い', furigana: ''}
            ]
        ],
        [
            ['壇ノ浦の戦', 'だんのうらのたたかい'],
            [
                {text: '壇', furigana: 'だん'},
                {text: 'ノ', furigana: 'の'},
                {text: '浦', furigana: 'うら'},
                {text: 'の', furigana: ''},
                {text: '戦', furigana: 'たたかい'}
            ]
        ],
        [
            ['序ノ口格', 'じょのくちかく'],
            [
                {text: '序', furigana: 'じょ'},
                {text: 'ノ', furigana: 'の'},
                {text: '口格', furigana: 'くちかく'}
            ]
        ],
        [
            ['二カ国語', 'にかこくご'],
            [
                {text: '二', furigana: 'に'},
                {text: 'カ', furigana: 'か'},
                {text: '国語', furigana: 'こくご'}
            ]
        ],
        [
            ['カ国', 'かこく'],
            [
                {text: 'カ', furigana: 'か'},
                {text: '国', furigana: 'こく'}
            ]
        ],
        [
            ['カ国語', 'かこくご'],
            [
                {text: 'カ', furigana: 'か'},
                {text: '国語', furigana: 'こくご'}
            ]
        ],
        [
            ['壇ノ浦の合戦', 'だんのうらのかっせん'],
            [
                {text: '壇', furigana: 'だん'},
                {text: 'ノ', furigana: 'の'},
                {text: '浦', furigana: 'うら'},
                {text: 'の', furigana: ''},
                {text: '合戦', furigana: 'かっせん'}
            ]
        ],
        [
            ['一タ偏', 'いちたへん'],
            [
                {text: '一', furigana: 'いち'},
                {text: 'タ', furigana: 'た'},
                {text: '偏', furigana: 'へん'}
            ]
        ],
        [
            ['ル又', 'るまた'],
            [
                {text: 'ル', furigana: 'る'},
                {text: '又', furigana: 'また'}
            ]
        ],
        [
            ['ノ木偏', 'のぎへん'],
            [
                {text: 'ノ', furigana: 'の'},
                {text: '木偏', furigana: 'ぎへん'}
            ]
        ],
        [
            ['一ノ貝', 'いちのかい'],
            [
                {text: '一', furigana: 'いち'},
                {text: 'ノ', furigana: 'の'},
                {text: '貝', furigana: 'かい'}
            ]
        ],
        [
            ['虎ノ門事件', 'とらのもんじけん'],
            [
                {text: '虎', furigana: 'とら'},
                {text: 'ノ', furigana: 'の'},
                {text: '門事件', furigana: 'もんじけん'}
            ]
        ],
        [
            ['教育ニ関スル勅語', 'きょういくにかんするちょくご'],
            [
                {text: '教育', furigana: 'きょういく'},
                {text: 'ニ', furigana: 'に'},
                {text: '関', furigana: 'かん'},
                {text: 'スル', furigana: 'する'},
                {text: '勅語', furigana: 'ちょくご'}
            ]
        ],
        [
            ['二カ年', 'にかねん'],
            [
                {text: '二', furigana: 'に'},
                {text: 'カ', furigana: 'か'},
                {text: '年', furigana: 'ねん'}
            ]
        ],
        [
            ['三カ年', 'さんかねん'],
            [
                {text: '三', furigana: 'さん'},
                {text: 'カ', furigana: 'か'},
                {text: '年', furigana: 'ねん'}
            ]
        ],
        [
            ['四カ年', 'よんかねん'],
            [
                {text: '四', furigana: 'よん'},
                {text: 'カ', furigana: 'か'},
                {text: '年', furigana: 'ねん'}
            ]
        ],
        [
            ['五カ年', 'ごかねん'],
            [
                {text: '五', furigana: 'ご'},
                {text: 'カ', furigana: 'か'},
                {text: '年', furigana: 'ねん'}
            ]
        ],
        [
            ['六カ年', 'ろっかねん'],
            [
                {text: '六', furigana: 'ろっ'},
                {text: 'カ', furigana: 'か'},
                {text: '年', furigana: 'ねん'}
            ]
        ],
        [
            ['七カ年', 'ななかねん'],
            [
                {text: '七', furigana: 'なな'},
                {text: 'カ', furigana: 'か'},
                {text: '年', furigana: 'ねん'}
            ]
        ],
        [
            ['八カ年', 'はちかねん'],
            [
                {text: '八', furigana: 'はち'},
                {text: 'カ', furigana: 'か'},
                {text: '年', furigana: 'ねん'}
            ]
        ],
        [
            ['九カ年', 'きゅうかねん'],
            [
                {text: '九', furigana: 'きゅう'},
                {text: 'カ', furigana: 'か'},
                {text: '年', furigana: 'ねん'}
            ]
        ],
        [
            ['十カ年', 'じゅうかねん'],
            [
                {text: '十', furigana: 'じゅう'},
                {text: 'カ', furigana: 'か'},
                {text: '年', furigana: 'ねん'}
            ]
        ],
        [
            ['鏡ノ間', 'かがみのま'],
            [
                {text: '鏡', furigana: 'かがみ'},
                {text: 'ノ', furigana: 'の'},
                {text: '間', furigana: 'ま'}
            ]
        ],
        [
            ['鏡ノ間', 'かがみのま'],
            [
                {text: '鏡', furigana: 'かがみ'},
                {text: 'ノ', furigana: 'の'},
                {text: '間', furigana: 'ま'}
            ]
        ],
        [
            ['ページ違反', 'ぺーじいはん'],
            [
                {text: 'ページ', furigana: 'ぺーじ'},
                {text: '違反', furigana: 'いはん'}
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
                {text: 'し', furigana: ''},
                {text: 'かた', furigana: ''}
            ]
        ],
        [
            ['食べる', 'たべる', '食べた'],
            [
                {text: '食', furigana: 'た'},
                {text: 'べ', furigana: ''},
                {text: 'た', furigana: ''}
            ]
        ]
    ];

    for (const [[expression, reading, source], expected] of data) {
        const actual = jp.distributeFuriganaInflected(expression, reading, source);
        vm.assert.deepStrictEqual(actual, expected);
    }
}

function testCollapseEmphaticSequences() {
    const data = [
        [['かこい', false], ['かこい', [1, 1, 1]]],
        [['かこい', true], ['かこい', [1, 1, 1]]],
        [['かっこい', false], ['かっこい', [1, 1, 1, 1]]],
        [['かっこい', true], ['かこい', [2, 1, 1]]],
        [['かっっこい', false], ['かっこい', [1, 2, 1, 1]]],
        [['かっっこい', true], ['かこい', [3, 1, 1]]],
        [['かっっっこい', false], ['かっこい', [1, 3, 1, 1]]],
        [['かっっっこい', true], ['かこい', [4, 1, 1]]],

        [['こい', false], ['こい', [1, 1]]],
        [['こい', true], ['こい', [1, 1]]],
        [['っこい', false], ['っこい', [1, 1, 1]]],
        [['っこい', true], ['こい', [2, 1]]],
        [['っっこい', false], ['っこい', [2, 1, 1]]],
        [['っっこい', true], ['こい', [3, 1]]],
        [['っっっこい', false], ['っこい', [3, 1, 1]]],
        [['っっっこい', true], ['こい', [4, 1]]],

        [['すごい', false], ['すごい', [1, 1, 1]]],
        [['すごい', true], ['すごい', [1, 1, 1]]],
        [['すごーい', false], ['すごーい', [1, 1, 1, 1]]],
        [['すごーい', true], ['すごい', [1, 2, 1]]],
        [['すごーーい', false], ['すごーい', [1, 1, 2, 1]]],
        [['すごーーい', true], ['すごい', [1, 3, 1]]],
        [['すっごーい', false], ['すっごーい', [1, 1, 1, 1, 1]]],
        [['すっごーい', true], ['すごい', [2, 2, 1]]],
        [['すっっごーーい', false], ['すっごーい', [1, 2, 1, 2, 1]]],
        [['すっっごーーい', true], ['すごい', [3, 3, 1]]],

        [['', false], ['', []]],
        [['', true], ['', []]],
        [['っ', false], ['っ', [1]]],
        [['っ', true], ['', [1]]],
        [['っっ', false], ['っ', [2]]],
        [['っっ', true], ['', [2]]],
        [['っっっ', false], ['っ', [3]]],
        [['っっっ', true], ['', [3]]]
    ];

    for (const [[text, fullCollapse], [expected, expectedSourceMapping]] of data) {
        const sourceMap = new TextSourceMap(text);
        const actual1 = jp.collapseEmphaticSequences(text, fullCollapse, null);
        const actual2 = jp.collapseEmphaticSequences(text, fullCollapse, sourceMap);
        assert.strictEqual(actual1, expected);
        assert.strictEqual(actual2, expected);
        if (typeof expectedSourceMapping !== 'undefined') {
            assert.ok(sourceMap.equals(new TextSourceMap(text, expectedSourceMapping)));
        }
    }
}

function testIsMoraPitchHigh() {
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
        [[3, 4], true]
    ];

    for (const [[moraIndex, pitchAccentPosition], expected] of data) {
        const actual = jp.isMoraPitchHigh(moraIndex, pitchAccentPosition);
        assert.strictEqual(actual, expected);
    }
}

function testGetKanaMorae() {
    const data = [
        ['かこ', ['か', 'こ']],
        ['かっこ', ['か', 'っ', 'こ']],
        ['カコ', ['カ', 'コ']],
        ['カッコ', ['カ', 'ッ', 'コ']],
        ['コート', ['コ', 'ー', 'ト']],
        ['ちゃんと', ['ちゃ', 'ん', 'と']],
        ['とうきょう', ['と', 'う', 'きょ', 'う']],
        ['ぎゅう', ['ぎゅ', 'う']],
        ['ディスコ', ['ディ', 'ス', 'コ']]
    ];

    for (const [text, expected] of data) {
        const actual = jp.getKanaMorae(text);
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
    testCollapseEmphaticSequences();
    testIsMoraPitchHigh();
    testGetKanaMorae();
}


if (require.main === module) { testMain(main); }
