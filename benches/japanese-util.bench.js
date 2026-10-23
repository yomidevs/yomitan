/*
 * Copyright (C) 2023-2026  Yomitan Authors
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

import {bench, describe} from 'vitest';
import * as jpw from '../ext/js/language/ja/japanese-wanakana.js';
import * as jp from '../ext/js/language/ja/japanese.js';

/**
 * Text that is representative of what is scanned on a web page: kanji, kana,
 * half width kana, full width alphanumerics, punctuation and latin text.
 */
const sentences = [
    '銀河鉄道の夜は、宮沢賢治の童話である。',
    'ジョバンニは、天の川の岸に立って、ぼんやりと星を見ていました。',
    'ﾊﾝｶｸｶﾀｶﾅﾃｽﾄ ＡＢＣ１２３ ｱｲｳｴｵ',
    '彼は「そうですか？」と言った。それから、静かに歩き出した。',
    'The 日本語 text is mixed with English words like Yomitan.',
    'すすすすごーーーい!! たたたたのしーーーー!!!',
    '珈琲を飲みながら、新聞を読んでいた。',
    '⼀⼆⼓⾔ ㍿ ㌔ ①②③',
];

const words = [
    '読む',
    '食べる',
    '愛しい',
    '走って',
    '出来る',
    '見せられない',
    '取り返す',
    '引き続き',
    '打ち合わせ',
    '思い出す',
    '나다',
    'テスト',
];

/** @type {[term: string, reading: string][]} */
const furiganaPairs = [
    ['読む', 'よむ'],
    ['日本語', 'にほんご'],
    ['取り返す', 'とりかえす'],
    ['お問い合わせ', 'おといあわせ'],
    ['見せられない', 'みせられない'],
    ['食べ物', 'たべもの'],
    ['お客さん', 'おきゃくさん'],
    ['さくらの木', 'さくらのき'],
];

describe('japanese util', () => {
    bench(`convertKatakanaToHiragana (n=${sentences.length})`, () => {
        for (const sentence of sentences) {
            jp.convertKatakanaToHiragana(sentence);
        }
    });

    bench(`convertHiraganaToKatakana (n=${sentences.length})`, () => {
        for (const sentence of sentences) {
            jp.convertHiraganaToKatakana(sentence);
        }
    });

    bench(`convertHalfWidthKanaToFullWidth (n=${sentences.length})`, () => {
        for (const sentence of sentences) {
            jp.convertHalfWidthKanaToFullWidth(sentence);
        }
    });

    bench(`normalizeCJKCompatibilityCharacters (n=${sentences.length})`, () => {
        for (const sentence of sentences) {
            jp.normalizeCJKCompatibilityCharacters(sentence);
        }
    });

    bench(`collapseEmphaticSequences (n=${sentences.length})`, () => {
        for (const sentence of sentences) {
            jp.collapseEmphaticSequences(sentence, false);
            jp.collapseEmphaticSequences(sentence, true);
        }
    });

    bench(`isStringPartiallyJapanese (n=${sentences.length})`, () => {
        for (const sentence of sentences) {
            jp.isStringPartiallyJapanese(sentence);
            jp.isStringEntirelyKana(sentence);
        }
    });

    bench(`distributeFurigana (n=${furiganaPairs.length})`, () => {
        for (const [term, reading] of furiganaPairs) {
            jp.distributeFurigana(term, reading);
        }
    });

    bench(`distributeFuriganaInflected (n=${furiganaPairs.length})`, () => {
        for (const [term, reading] of furiganaPairs) {
            jp.distributeFuriganaInflected(term, reading, term);
        }
    });

    bench(`getKanaMorae (n=${words.length})`, () => {
        for (const word of words) {
            jp.getKanaMorae(jp.convertKatakanaToHiragana(word));
        }
    });

    bench(`wanakana conversions (n=${words.length})`, () => {
        for (const word of words) {
            jpw.convertToKana(word);
            jpw.convertToHiragana(word);
            jpw.convertToRomaji(word);
            jpw.convertAlphabeticToKana(word);
        }
    });
});
