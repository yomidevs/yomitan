/*
 * Copyright (C) 2025  Yomitan Authors
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

import {arabicTransforms} from '../../ext/js/language/ar/arabic-transforms.js';
import {LanguageTransformer} from '../../ext/js/language/language-transformer.js';
import {testLanguageTransformer} from '../fixtures/language-transformer-test.js';

const tests = [
    {
        category: 'noun prefixes',
        valid: true,
        tests: [
            {term: 'بيت', source: 'وبيت', rule: 'n', reasons: ['NPref-Wa']},
            {term: 'بيت', source: 'فبيت', rule: 'n', reasons: ['NPref-Wa']},

            {term: 'بيت', source: 'ببيت', rule: 'n', reasons: ['NPref-Bi']},
            {term: 'بيت', source: 'وببيت', rule: 'n', reasons: ['NPref-Bi']},
            {term: 'بيت', source: 'فببيت', rule: 'n', reasons: ['NPref-Bi']},

            {term: 'بيت', source: 'كبيت', rule: 'n', reasons: ['NPref-Ka']},
            {term: 'بيت', source: 'وكبيت', rule: 'n', reasons: ['NPref-Ka']},
            {term: 'بيت', source: 'فكبيت', rule: 'n', reasons: ['NPref-Ka']},

            {term: 'بيت', source: 'لبيت', rule: 'n', reasons: ['NPref-Li']},
            {term: 'بيت', source: 'ولبيت', rule: 'n', reasons: ['NPref-Li']},
            {term: 'بيت', source: 'فلبيت', rule: 'n', reasons: ['NPref-Li']},

            {term: 'بيت', source: 'البيت', rule: 'n', reasons: ['NPref-Al']},
            {term: 'بيت', source: 'والبيت', rule: 'n', reasons: ['NPref-Al']},
            {term: 'بيت', source: 'فالبيت', rule: 'n', reasons: ['NPref-Al']},

            {term: 'بيت', source: 'بالبيت', rule: 'n', reasons: ['NPref-BiAl']},
            {term: 'بيت', source: 'وبالبيت', rule: 'n', reasons: ['NPref-BiAl']},
            {term: 'بيت', source: 'فبالبيت', rule: 'n', reasons: ['NPref-BiAl']},

            {term: 'بيت', source: 'كالبيت', rule: 'n', reasons: ['NPref-KaAl']},
            {term: 'بيت', source: 'وكالبيت', rule: 'n', reasons: ['NPref-KaAl']},
            {term: 'بيت', source: 'فكالبيت', rule: 'n', reasons: ['NPref-KaAl']},

            {term: 'بيت', source: 'للبيت', rule: 'n', reasons: ['NPref-Lil']},
            {term: 'بيت', source: 'وللبيت', rule: 'n', reasons: ['NPref-Lil']},
            {term: 'بيت', source: 'فللبيت', rule: 'n', reasons: ['NPref-Lil']},

            {term: 'ليل', source: 'لليل', rule: 'n', reasons: ['NPref-LiAl']},
            {term: 'ليل', source: 'ولليل', rule: 'n', reasons: ['NPref-LiAl']},
            {term: 'ليل', source: 'فلليل', rule: 'n', reasons: ['NPref-LiAl']},
        ],
    },
    {
        category: 'noun invalid prefixes',
        valid: false,
        tests: [{term: 'ليل', source: 'للليل', rule: 'n', reasons: ['NPref-Lil']}],
    },
    {
        category: 'noun invalid chains',
        valid: false,
        tests: [
            {term: 'بيت', source: 'بوبيت', rule: 'n', reasons: ['NPref-Wa', 'NPref-Bi']},
            {term: 'بيت', source: 'كببيت', rule: 'n', reasons: ['NPref-Bi', 'NPref-Ka']},
            {term: 'بيت', source: 'كلبيت', rule: 'n', reasons: ['NPref-Li', 'NPref-Ka']},
        ],
    },
    {
        category: 'singular noun suffixes',
        valid: true,
        tests: [
            // Possessive Pronouns
            {term: 'كتاب', source: 'كتابه', rule: 'n', reasons: ['NSuff-h']},
            {term: 'كتاب', source: 'كتابها', rule: 'n', reasons: ['NSuff-h']},
            {term: 'كتاب', source: 'كتابهما', rule: 'n', reasons: ['NSuff-h']},
            {term: 'كتاب', source: 'كتابهم', rule: 'n', reasons: ['NSuff-h']},
            {term: 'كتاب', source: 'كتابهن', rule: 'n', reasons: ['NSuff-h']},
            {term: 'كتاب', source: 'كتابك', rule: 'n', reasons: ['NSuff-h']},
            {term: 'كتاب', source: 'كتابكما', rule: 'n', reasons: ['NSuff-h']},
            {term: 'كتاب', source: 'كتابكم', rule: 'n', reasons: ['NSuff-h']},
            {term: 'كتاب', source: 'كتابكن', rule: 'n', reasons: ['NSuff-h']},
            {term: 'كتاب', source: 'كتابي', rule: 'n', reasons: ['NSuff-h']},
            {term: 'كتاب', source: 'كتابنا', rule: 'n', reasons: ['NSuff-h']},

            {term: 'كتاب', source: 'بكتابه', rule: 'n', reasons: ['NPref-Bi', 'NSuff-h']},
            {term: 'كتاب', source: 'ككتابه', rule: 'n', reasons: ['NPref-Ka', 'NSuff-h']},
            {term: 'كتاب', source: 'لكتابه', rule: 'n', reasons: ['NPref-Li', 'NSuff-h']},

            // Ta Marbuta
            {term: 'طويل', source: 'طويلة', rule: 'n', reasons: ['NSuff-ap']},
            {term: 'زوجة', source: 'زوجته', rule: 'n', reasons: ['NSuff-ath']},
            {term: 'زوجة', source: 'زوجتك', rule: 'n', reasons: ['NSuff-ath']},
            {term: 'زوجة', source: 'زوجتي', rule: 'n', reasons: ['NSuff-ath']},

            // Accusative Indefinite
            {term: 'أبد', source: 'أبدا', rule: 'n', reasons: ['NSuff-AF']},
            {term: 'أبد', source: 'وأبدا', rule: 'n', reasons: ['NPref-Wa', 'NSuff-AF']},
        ],
    },
    {
        category: 'singular noun invalid suffixes',
        valid: false,
        tests: [
            // Possessive Pronouns
            {term: 'كتاب', source: 'الكتابه', rule: 'n', reasons: ['NPref-Al', 'NSuff-h']},
            {term: 'كتاب', source: 'بالكتابه', rule: 'n', reasons: ['NPref-BiAl', 'NSuff-h']},
            {term: 'كتاب', source: 'كالكتابه', rule: 'n', reasons: ['NPref-KaAl', 'NSuff-h']},
            {term: 'كتاب', source: 'للكتابه', rule: 'n', reasons: ['NPref-Lil', 'NSuff-h']},
            {term: 'لسان', source: 'للسانه', rule: 'n', reasons: ['NPref-LiAl', 'NSuff-h']},

            // Ta Marbuta
            {term: 'زوجة', source: 'الزوجته', rule: 'n', reasons: ['NPref-Al']},
            {term: 'لؤلؤة', source: 'للؤلؤته', rule: 'n', reasons: ['NPref-LiAl']},

            // Accusative Indefinite
            {term: 'أبد', source: 'بأبدا', rule: 'n', reasons: ['NPref-Bi', 'NSuff-AF']},
            {term: 'أبد', source: 'كأبدا', rule: 'n', reasons: ['NPref-Ka', 'NSuff-AF']},
            {term: 'أبد', source: 'لأبدا', rule: 'n', reasons: ['NPref-Li', 'NSuff-AF']},
            {term: 'أبد', source: 'الأبدا', rule: 'n', reasons: ['NPref-Al', 'NSuff-AF']},
            {term: 'أبد', source: 'بالأبدا', rule: 'n', reasons: ['NPref-BiAl', 'NSuff-AF']},
            {term: 'أبد', source: 'كالأبدا', rule: 'n', reasons: ['NPref-KaAl', 'NSuff-AF']},
            {term: 'أبد', source: 'للأبدا', rule: 'n', reasons: ['NPref-Lil', 'NSuff-AF']},
            {term: 'لاحق', source: 'للاحقا', rule: 'n', reasons: ['NPref-LiAl', 'NSuff-AF']},
        ],
    },
    {
        category: 'dual noun suffixes',
        valid: true,
        tests: [
            // Masculine Nominative
            {term: 'ولد', source: 'ولدان', rule: 'n', reasons: ['NSuff-An']},
            {term: 'مطفأ', source: 'مطفآن', rule: 'n', reasons: ['NSuff-An']},
            {term: 'ولد', source: 'الولدان', rule: 'n', reasons: ['NPref-Al', 'NSuff-An']},
            {term: 'ولد', source: 'لولدان', rule: 'n', reasons: ['NPref-Li', 'NSuff-An']},

            {term: 'ولد', source: 'ولدا', rule: 'n', reasons: ['NSuff-Ah']},
            {term: 'ولد', source: 'ولداه', rule: 'n', reasons: ['NSuff-Ah']},
            {term: 'ولد', source: 'ولداك', rule: 'n', reasons: ['NSuff-Ah']},
            {term: 'ولد', source: 'ولداي', rule: 'n', reasons: ['NSuff-Ah']},
            {term: 'ولد', source: 'لولداي', rule: 'n', reasons: ['NPref-Li', 'NSuff-Ah']},

            // Masculine Accusative/Genitive
            {term: 'ولد', source: 'ولدين', rule: 'n', reasons: ['NSuff-ayn']},
            {term: 'ولد', source: 'بولدين', rule: 'n', reasons: ['NPref-Bi', 'NSuff-ayn']},
            {term: 'ولد', source: 'كولدين', rule: 'n', reasons: ['NPref-Ka', 'NSuff-ayn']},
            {term: 'ولد', source: 'لولدين', rule: 'n', reasons: ['NPref-Li', 'NSuff-ayn']},
            {term: 'ولد', source: 'الولدين', rule: 'n', reasons: ['NPref-Al', 'NSuff-ayn']},
            {term: 'ولد', source: 'بالولدين', rule: 'n', reasons: ['NPref-BiAl', 'NSuff-ayn']},
            {term: 'ولد', source: 'كالولدين', rule: 'n', reasons: ['NPref-KaAl', 'NSuff-ayn']},
            {term: 'ولد', source: 'للولدين', rule: 'n', reasons: ['NPref-Lil', 'NSuff-ayn']},
            {term: 'ليل', source: 'لليلين', rule: 'n', reasons: ['NPref-LiAl', 'NSuff-ayn']},

            {term: 'ولد', source: 'ولدي', rule: 'n', reasons: ['NSuff-ayh']},
            {term: 'ولد', source: 'ولديه', rule: 'n', reasons: ['NSuff-ayh']},
            {term: 'ولد', source: 'ولديك', rule: 'n', reasons: ['NSuff-ayh']},
            {term: 'ولد', source: 'ولدينا', rule: 'n', reasons: ['NSuff-ayh']},
            {term: 'ولد', source: 'بولديه', rule: 'n', reasons: ['NPref-Bi', 'NSuff-ayh']},
            {term: 'ولد', source: 'كولديه', rule: 'n', reasons: ['NPref-Ka', 'NSuff-ayh']},
            {term: 'ولد', source: 'لولديه', rule: 'n', reasons: ['NPref-Li', 'NSuff-ayh']},

            // Feminine Nominative
            {term: 'زوجة', source: 'زوجتان', rule: 'n', reasons: ['NSuff-atAn']},
            {term: 'زوجة', source: 'الزوجتان', rule: 'n', reasons: ['NPref-Al', 'NSuff-atAn']},
            {term: 'زوجة', source: 'لزوجتان', rule: 'n', reasons: ['NPref-Li', 'NSuff-atAn']},

            {term: 'زوجة', source: 'زوجتا', rule: 'n', reasons: ['NSuff-atAh']},
            {term: 'زوجة', source: 'زوجتاه', rule: 'n', reasons: ['NSuff-atAh']},
            {term: 'زوجة', source: 'زوجتاك', rule: 'n', reasons: ['NSuff-atAh']},
            {term: 'زوجة', source: 'زوجتاي', rule: 'n', reasons: ['NSuff-atAh']},
            {term: 'زوجة', source: 'لزوجتاي', rule: 'n', reasons: ['NPref-Li', 'NSuff-atAh']},

            // Feminine Accusative/Genitive
            {term: 'زوجة', source: 'زوجتين', rule: 'n', reasons: ['NSuff-tayn']},
            {term: 'زوجة', source: 'بزوجتين', rule: 'n', reasons: ['NPref-Bi', 'NSuff-tayn']},
            {term: 'زوجة', source: 'كزوجتين', rule: 'n', reasons: ['NPref-Ka', 'NSuff-tayn']},
            {term: 'زوجة', source: 'لزوجتين', rule: 'n', reasons: ['NPref-Li', 'NSuff-tayn']},
            {term: 'زوجة', source: 'الزوجتين', rule: 'n', reasons: ['NPref-Al', 'NSuff-tayn']},
            {term: 'زوجة', source: 'بالزوجتين', rule: 'n', reasons: ['NPref-BiAl', 'NSuff-tayn']},
            {term: 'زوجة', source: 'كالزوجتين', rule: 'n', reasons: ['NPref-KaAl', 'NSuff-tayn']},
            {term: 'زوجة', source: 'للزوجتين', rule: 'n', reasons: ['NPref-Lil', 'NSuff-tayn']},
            {term: 'لهجة', source: 'للهجتين', rule: 'n', reasons: ['NPref-LiAl', 'NSuff-tayn']},

            {term: 'زوجة', source: 'زوجتي', rule: 'n', reasons: ['NSuff-tayh']},
            {term: 'زوجة', source: 'زوجتيه', rule: 'n', reasons: ['NSuff-tayh']},
            {term: 'زوجة', source: 'زوجتيك', rule: 'n', reasons: ['NSuff-tayh']},
            {term: 'زوجة', source: 'زوجتينا', rule: 'n', reasons: ['NSuff-tayh']},
            {term: 'زوجة', source: 'بزوجتيه', rule: 'n', reasons: ['NPref-Bi', 'NSuff-tayh']},
            {term: 'زوجة', source: 'كزوجتيه', rule: 'n', reasons: ['NPref-Ka', 'NSuff-tayh']},
            {term: 'زوجة', source: 'لزوجتيه', rule: 'n', reasons: ['NPref-Li', 'NSuff-tayh']},
        ],
    },
    {
        category: 'dual noun invalid suffixes',
        valid: false,
        tests: [
            // Masculine Nominative
            {term: 'ولد', source: 'بولدان', rule: 'n', reasons: ['NPref-Bi', 'NSuff-An']},
            {term: 'ولد', source: 'كولدان', rule: 'n', reasons: ['NPref-Ka', 'NSuff-An']},
            {term: 'ولد', source: 'بالولدان', rule: 'n', reasons: ['NPref-BiAl', 'NSuff-An']},
            {term: 'ولد', source: 'كالولدان', rule: 'n', reasons: ['NPref-KaAl', 'NSuff-An']},
            {term: 'ولد', source: 'للولدان', rule: 'n', reasons: ['NPref-Lil', 'NSuff-An']},
            {term: 'ليل', source: 'لليلان', rule: 'n', reasons: ['NPref-LiAl', 'NSuff-An']},

            {term: 'ولد', source: 'بولداه', rule: 'n', reasons: ['NPref-Bi', 'NSuff-Ah']},
            {term: 'ولد', source: 'كولداه', rule: 'n', reasons: ['NPref-Ka', 'NSuff-Ah']},
            {term: 'ولد', source: 'الولداه', rule: 'n', reasons: ['NPref-Al', 'NSuff-Ah']},
            {term: 'ولد', source: 'بالولداه', rule: 'n', reasons: ['NPref-BiAl', 'NSuff-Ah']},
            {term: 'ولد', source: 'كالولداه', rule: 'n', reasons: ['NPref-KaAl', 'NSuff-Ah']},
            {term: 'ولد', source: 'للولداه', rule: 'n', reasons: ['NPref-Lil', 'NSuff-Ah']},
            {term: 'ليل', source: 'لليلاه', rule: 'n', reasons: ['NPref-LiAl', 'NSuff-Ah']},

            // Masculine Accusative/Genitive
            {term: 'ولد', source: 'ولديي', rule: 'n', reasons: ['NSuff-ayh']},
            {term: 'ولد', source: 'الولديه', rule: 'n', reasons: ['NPref-Al', 'NSuff-ayh']},
            {term: 'ولد', source: 'بالولديه', rule: 'n', reasons: ['NPref-BiAl', 'NSuff-ayh']},
            {term: 'ولد', source: 'كالولديه', rule: 'n', reasons: ['NPref-KaAl', 'NSuff-ayh']},
            {term: 'ولد', source: 'للولديه', rule: 'n', reasons: ['NPref-Lil', 'NSuff-ayh']},
            {term: 'ليل', source: 'لليليه', rule: 'n', reasons: ['NPref-LiAl', 'NSuff-ayh']},

            // Feminine Nominative
            {term: 'زوجة', source: 'بزوجتان', rule: 'n', reasons: ['NPref-Bi', 'NSuff-atAn']},
            {term: 'زوجة', source: 'كزوجتان', rule: 'n', reasons: ['NPref-Ka', 'NSuff-atAn']},
            {term: 'زوجة', source: 'بالزوجتان', rule: 'n', reasons: ['NPref-BiAl', 'NSuff-atAn']},
            {term: 'زوجة', source: 'كالزوجتان', rule: 'n', reasons: ['NPref-KaAl', 'NSuff-atAn']},
            {term: 'زوجة', source: 'للزوجتان', rule: 'n', reasons: ['NPref-Lil', 'NSuff-atAn']},
            {term: 'لهجة', source: 'للهجتان', rule: 'n', reasons: ['NPref-LiAl', 'NSuff-atAn']},

            {term: 'زوجة', source: 'بزوجتاه', rule: 'n', reasons: ['NPref-Bi', 'NSuff-atAh']},
            {term: 'زوجة', source: 'كزوجتاه', rule: 'n', reasons: ['NPref-Ka', 'NSuff-atAh']},
            {term: 'زوجة', source: 'الزوجتاه', rule: 'n', reasons: ['NPref-Al', 'NSuff-atAh']},
            {term: 'زوجة', source: 'بالزوجتاه', rule: 'n', reasons: ['NPref-BiAl', 'NSuff-atAh']},
            {term: 'زوجة', source: 'كالزوجتاه', rule: 'n', reasons: ['NPref-KaAl', 'NSuff-atAh']},
            {term: 'زوجة', source: 'للزوجتاه', rule: 'n', reasons: ['NPref-Lil', 'NSuff-atAh']},
            {term: 'لهجة', source: 'للهجتاه', rule: 'n', reasons: ['NPref-LiAl', 'NSuff-atAh']},

            // Feminine Accusative/Genitive
            {term: 'زوجة', source: 'زوجتيي', rule: 'n', reasons: ['NSuff-tayh']},
            {term: 'زوجة', source: 'الزوجتيه', rule: 'n', reasons: ['NPref-Al', 'NSuff-tayh']},
            {term: 'زوجة', source: 'بالزوجتيه', rule: 'n', reasons: ['NPref-BiAl', 'NSuff-tayh']},
            {term: 'زوجة', source: 'كالزوجتيه', rule: 'n', reasons: ['NPref-KaAl', 'NSuff-tayh']},
            {term: 'زوجة', source: 'للزوجتيه', rule: 'n', reasons: ['NPref-Lil', 'NSuff-tayh']},
            {term: 'لهجة', source: 'للهجتيه', rule: 'n', reasons: ['NPref-LiAl', 'NSuff-tayh']},
        ],
    },
    {
        category: 'plural noun suffixes',
        valid: true,
        tests: [
            // Feminine
            {term: 'مسلم', source: 'مسلمات', rule: 'n', reasons: ['NSuff-At']},
            {term: 'مطفأ', source: 'مطفآت', rule: 'n', reasons: ['NSuff-At']},
            {term: 'مسلمة', source: 'مسلمات', rule: 'n', reasons: ['NSuff-At']},
            {term: 'مسلمة', source: 'بمسلمات', rule: 'n', reasons: ['NPref-Bi', 'NSuff-At']},
            {term: 'مسلمة', source: 'كمسلمات', rule: 'n', reasons: ['NPref-Ka', 'NSuff-At']},
            {term: 'مسلمة', source: 'لمسلمات', rule: 'n', reasons: ['NPref-Li', 'NSuff-At']},
            {term: 'مسلمة', source: 'المسلمات', rule: 'n', reasons: ['NPref-Al', 'NSuff-At']},
            {term: 'مسلمة', source: 'بالمسلمات', rule: 'n', reasons: ['NPref-BiAl', 'NSuff-At']},
            {term: 'مسلمة', source: 'كالمسلمات', rule: 'n', reasons: ['NPref-KaAl', 'NSuff-At']},
            {term: 'مسلمة', source: 'للمسلمات', rule: 'n', reasons: ['NPref-Lil', 'NSuff-At']},
            {term: 'لغة', source: 'للغات', rule: 'n', reasons: ['NPref-LiAl', 'NSuff-At']},

            {term: 'مسلم', source: 'مسلماته', rule: 'n', reasons: ['NSuff-Ath']},
            {term: 'مسلمة', source: 'مسلماته', rule: 'n', reasons: ['NSuff-Ath']},
            {term: 'مسلمة', source: 'مسلماتك', rule: 'n', reasons: ['NSuff-Ath']},
            {term: 'مسلمة', source: 'مسلماتي', rule: 'n', reasons: ['NSuff-Ath']},
            {term: 'مسلمة', source: 'بمسلماته', rule: 'n', reasons: ['NPref-Bi', 'NSuff-Ath']},
            {term: 'مسلمة', source: 'كمسلماته', rule: 'n', reasons: ['NPref-Ka', 'NSuff-Ath']},
            {term: 'مسلمة', source: 'لمسلماته', rule: 'n', reasons: ['NPref-Li', 'NSuff-Ath']},

            // Masculine Nominative
            {term: 'مسلم', source: 'مسلمون', rule: 'n', reasons: ['NSuff-wn']},
            {term: 'مسلم', source: 'المسلمون', rule: 'n', reasons: ['NPref-Al', 'NSuff-wn']},
            {term: 'مسلم', source: 'لمسلمون', rule: 'n', reasons: ['NPref-Li', 'NSuff-wn']},

            {term: 'مسلم', source: 'مسلمو', rule: 'n', reasons: ['NSuff-wh']},
            {term: 'مسلم', source: 'مسلموه', rule: 'n', reasons: ['NSuff-wh']},
            {term: 'مسلم', source: 'مسلموك', rule: 'n', reasons: ['NSuff-wh']},
            {term: 'مسلم', source: 'مسلمونا', rule: 'n', reasons: ['NSuff-wh']},
            {term: 'مسلم', source: 'لمسلموه', rule: 'n', reasons: ['NPref-Li', 'NSuff-wh']},

            // Masculine Accusative/Genitive
            {term: 'مسلم', source: 'مسلمين', rule: 'n', reasons: ['NSuff-iyn']},
            {term: 'مسلم', source: 'بمسلمين', rule: 'n', reasons: ['NPref-Bi', 'NSuff-iyn']},
            {term: 'مسلم', source: 'كمسلمين', rule: 'n', reasons: ['NPref-Ka', 'NSuff-iyn']},
            {term: 'مسلم', source: 'لمسلمين', rule: 'n', reasons: ['NPref-Li', 'NSuff-iyn']},
            {term: 'مسلم', source: 'المسلمين', rule: 'n', reasons: ['NPref-Al', 'NSuff-iyn']},
            {term: 'مسلم', source: 'بالمسلمين', rule: 'n', reasons: ['NPref-BiAl', 'NSuff-iyn']},
            {term: 'مسلم', source: 'كالمسلمين', rule: 'n', reasons: ['NPref-KaAl', 'NSuff-iyn']},
            {term: 'مسلم', source: 'للمسلمين', rule: 'n', reasons: ['NPref-Lil', 'NSuff-iyn']},
            {term: 'لبناني', source: 'للبنانيين', rule: 'n', reasons: ['NPref-LiAl', 'NSuff-iyn']},

            {term: 'مسلم', source: 'مسلمي', rule: 'n', reasons: ['NSuff-iyh']},
            {term: 'مسلم', source: 'مسلميه', rule: 'n', reasons: ['NSuff-iyh']},
            {term: 'مسلم', source: 'مسلميك', rule: 'n', reasons: ['NSuff-iyh']},
            {term: 'مسلم', source: 'مسلمينا', rule: 'n', reasons: ['NSuff-iyh']},
            {term: 'مسلم', source: 'بمسلميه', rule: 'n', reasons: ['NPref-Bi', 'NSuff-iyh']},
            {term: 'مسلم', source: 'كمسلميه', rule: 'n', reasons: ['NPref-Ka', 'NSuff-iyh']},
            {term: 'مسلم', source: 'لمسلميه', rule: 'n', reasons: ['NPref-Li', 'NSuff-iyh']},
        ],
    },
    {
        category: 'plural noun invalid suffixes',
        valid: false,
        tests: [
            // Feminine
            {term: 'مسلمة', source: 'المسلماته', rule: 'n', reasons: ['NPref-Al', 'NSuff-Ath']},
            {term: 'مسلمة', source: 'بالمسلماته', rule: 'n', reasons: ['NPref-BiAl', 'NSuff-Ath']},
            {term: 'مسلمة', source: 'كالمسلماته', rule: 'n', reasons: ['NPref-KaAl', 'NSuff-Ath']},
            {term: 'مسلمة', source: 'المسلماته', rule: 'n', reasons: ['NPref-Lil', 'NSuff-Ath']},
            {term: 'لغة', source: 'للغاته', rule: 'n', reasons: ['NPref-LiAl', 'NSuff-Ath']},

            // Masculine Nominative
            {term: 'مسلم', source: 'بمسلمون', rule: 'n', reasons: ['NPref-Bi', 'NSuff-wn']},
            {term: 'مسلم', source: 'كمسلمون', rule: 'n', reasons: ['NPref-Ka', 'NSuff-wn']},
            {term: 'مسلم', source: 'بالمسلمون', rule: 'n', reasons: ['NPref-BiAl', 'NSuff-wn']},
            {term: 'مسلم', source: 'كالمسلمون', rule: 'n', reasons: ['NPref-KaAl', 'NSuff-wn']},
            {term: 'مسلم', source: 'للمسلمون', rule: 'n', reasons: ['NPref-Lil', 'NSuff-wn']},
            {term: 'لبناني', source: 'للبنانيون', rule: 'n', reasons: ['NPref-LiAl', 'NSuff-wn']},

            {term: 'مسلم', source: 'بمسلموه', rule: 'n', reasons: ['NPref-Bi', 'NSuff-wh']},
            {term: 'مسلم', source: 'كمسلموه', rule: 'n', reasons: ['NPref-Ka', 'NSuff-wh']},
            {term: 'مسلم', source: 'المسلموه', rule: 'n', reasons: ['NPref-Al', 'NSuff-wh']},
            {term: 'مسلم', source: 'بالمسلموه', rule: 'n', reasons: ['NPref-BiAl', 'NSuff-wh']},
            {term: 'مسلم', source: 'كالمسلموه', rule: 'n', reasons: ['NPref-KaAl', 'NSuff-wh']},
            {term: 'مسلم', source: 'للمسلموه', rule: 'n', reasons: ['NPref-Lil', 'NSuff-wh']},
            {term: 'لبناني', source: 'للبنانيوه', rule: 'n', reasons: ['NPref-LiAl', 'NSuff-wh']},

            // Masculine Accusative/Genitive
            {term: 'مسلم', source: 'مسلميي', rule: 'n', reasons: ['NSuff-iyh']},
            {term: 'مسلم', source: 'المسلميه', rule: 'n', reasons: ['NPref-Al', 'NSuff-iyh']},
            {term: 'مسلم', source: 'بالمسلميه', rule: 'n', reasons: ['NPref-BiAl', 'NSuff-iyh']},
            {term: 'مسلم', source: 'كالمسلميه', rule: 'n', reasons: ['NPref-KaAl', 'NSuff-iyh']},
            {term: 'مسلم', source: 'للمسلميه', rule: 'n', reasons: ['NPref-Lil', 'NSuff-iyh']},
            {term: 'لبناني', source: 'للبنانييه', rule: 'n', reasons: ['NPref-LiAl', 'NSuff-iyh']},
        ],
    },
    {
        category: 'perfect verb conjunction (and)',
        valid: true,
        tests: [
            {term: 'ذهب', source: 'وذهب', rule: 'pv', reasons: ['PVPref-Wa']},
            {term: 'ذهب', source: 'فذهب', rule: 'pv', reasons: ['PVPref-Wa']},
        ],
    },
    {
        category: 'perfect verb result clause particle (would have)',
        valid: true,
        tests: [{term: 'فعل', source: 'لفعل', rule: 'pv', reasons: ['PVPref-La']}],
    },
    {
        category: 'regular perfect verb',
        valid: true,
        tests: [
            {term: 'كتب', source: 'كتبت', rule: 'pv', reasons: ['PVSuff-t']},
            {term: 'كتب', source: 'كتبتما', rule: 'pv', reasons: ['PVSuff-t']},
            {term: 'كتب', source: 'كتبا', rule: 'pv', reasons: ['PVSuff-A']},
            {term: 'كتب', source: 'كتبتا', rule: 'pv', reasons: ['PVSuff-at']},
            {term: 'كتب', source: 'كتبنا', rule: 'pv', reasons: ['PVSuff-n']},
            {term: 'كتب', source: 'كتبتم', rule: 'pv', reasons: ['PVSuff-t']},
            {term: 'كتب', source: 'كتبتن', rule: 'pv', reasons: ['PVSuff-t']},
            {term: 'كتب', source: 'كتبوا', rule: 'pv', reasons: ['PVSuff-uw']},
            {term: 'كتب', source: 'كتبن', rule: 'pv', reasons: ['PVSuff-n']},
        ],
    },
    {
        category: 'perfect verb with assimilated ت',
        valid: true,
        tests: [
            {term: 'كبت', source: 'كبتت', rule: 'pv', reasons: ['PVSuff-t']},
            {term: 'كبت', source: 'كبتتا', rule: 'pv', reasons: ['PVSuff-at']},

            {term: 'كبت', source: 'كبتما', rule: 'pv', reasons: ['PVSuff-t']},
            {term: 'كبت', source: 'كبتم', rule: 'pv', reasons: ['PVSuff-t']},
            {term: 'كبت', source: 'كبتن', rule: 'pv', reasons: ['PVSuff-t']},
        ],
    },
    {
        category: 'perfect verb with assimilated ن',
        valid: true,
        tests: [{term: 'حسن', source: 'حسنا', rule: 'pv', reasons: ['PVSuff-n']}],
    },
    {
        category: 'perfect verb with assimilated أ + ا = آ',
        valid: true,
        tests: [{term: 'قرأ', source: 'قرآ', rule: 'pv', reasons: ['PVSuff-A']}],
    },
    {
        category: 'perfect verb attached direct object pronouns',
        valid: true,
        tests: [
            {term: 'علم', source: 'علمني', rule: 'pv', reasons: ['PVSuff-ah']},
            {term: 'علم', source: 'علمنا', rule: 'pv', reasons: ['PVSuff-ah']},
            {term: 'علم', source: 'علمك', rule: 'pv', reasons: ['PVSuff-ah']},
            {term: 'علم', source: 'علمكما', rule: 'pv', reasons: ['PVSuff-ah']},
            {term: 'علم', source: 'علمكم', rule: 'pv', reasons: ['PVSuff-ah']},
            {term: 'علم', source: 'علمكن', rule: 'pv', reasons: ['PVSuff-ah']},
            {term: 'علم', source: 'علمه', rule: 'pv', reasons: ['PVSuff-ah']},
            {term: 'علم', source: 'علمها', rule: 'pv', reasons: ['PVSuff-ah']},
            {term: 'علم', source: 'علمهما', rule: 'pv', reasons: ['PVSuff-ah']},
            {term: 'علم', source: 'علمهم', rule: 'pv', reasons: ['PVSuff-ah']},
            {term: 'علم', source: 'علمهن', rule: 'pv', reasons: ['PVSuff-ah']},

            {term: 'علم', source: 'علمتني', rule: 'pv', reasons: ['PVSuff-t']},
            {term: 'علم', source: 'علمتنا', rule: 'pv', reasons: ['PVSuff-t']},
            {term: 'علم', source: 'علمتك', rule: 'pv', reasons: ['PVSuff-t']},
            {term: 'علم', source: 'علمتكما', rule: 'pv', reasons: ['PVSuff-t']},
            {term: 'علم', source: 'علمتكم', rule: 'pv', reasons: ['PVSuff-t']},
            {term: 'علم', source: 'علمتكن', rule: 'pv', reasons: ['PVSuff-t']},
            {term: 'علم', source: 'علمته', rule: 'pv', reasons: ['PVSuff-t']},
            {term: 'علم', source: 'علمتها', rule: 'pv', reasons: ['PVSuff-t']},
            {term: 'علم', source: 'علمتهما', rule: 'pv', reasons: ['PVSuff-t']},
            {term: 'علم', source: 'علمتهم', rule: 'pv', reasons: ['PVSuff-t']},
            {term: 'علم', source: 'علمتهن', rule: 'pv', reasons: ['PVSuff-t']},

            {term: 'علم', source: 'علمتموه', rule: 'pv', reasons: ['PVSuff-t']},
            {term: 'علم', source: 'علموه', rule: 'pv', reasons: ['PVSuff-uw']},
        ],
    },
    {
        category: 'perfect verb invalid attached direct object pronouns',
        valid: false,
        tests: [
            {term: 'علم', source: 'علمناني', rule: 'pv', reasons: null},
            {term: 'علم', source: 'علمنانا', rule: 'pv', reasons: null},

            {term: 'علم', source: 'علمتموك', rule: 'pv', reasons: null},
            {term: 'علم', source: 'علمتموكما', rule: 'pv', reasons: null},
            {term: 'علم', source: 'علمتموكم', rule: 'pv', reasons: null},
            {term: 'علم', source: 'علمتموكن', rule: 'pv', reasons: null},

            {term: 'علم', source: 'علمتماك', rule: 'pv', reasons: null},
            {term: 'علم', source: 'علمتماكما', rule: 'pv', reasons: null},
            {term: 'علم', source: 'علمتماكم', rule: 'pv', reasons: null},
            {term: 'علم', source: 'علمتماكن', rule: 'pv', reasons: null},

            {term: 'علم', source: 'علمتنك', rule: 'pv', reasons: null},
            {term: 'علم', source: 'علمتنكما', rule: 'pv', reasons: null},
            {term: 'علم', source: 'علمتنكم', rule: 'pv', reasons: null},
            {term: 'علم', source: 'علمتنكن', rule: 'pv', reasons: null},
        ],
    },
    {
        category: 'perfect verb invalid chains',
        valid: false,
        tests: [
            {term: 'سمع', source: 'ووسمع', rule: 'pv', reasons: ['Pref-Wa', 'Pref-Wa']},
            {term: 'سمع', source: 'فوسمع', rule: 'pv', reasons: ['Pref-Wa', 'Pref-Wa']},
            {term: 'سمع', source: 'وفسمع', rule: 'pv', reasons: ['Pref-Wa', 'Pref-Wa']},

            {term: 'سمع', source: 'سمعتت', rule: 'pv', reasons: ['PVSuff-t', 'PVSuff-t']},
            {term: 'سمع', source: 'سمعتتم', rule: 'pv', reasons: ['PVSuff-t', 'PVSuff-t']},
            {term: 'سمع', source: 'سمعتمن', rule: 'pv', reasons: ['PVSuff-t', 'PVSuff-n']},
            {term: 'سمع', source: 'سمعنتم', rule: 'pv', reasons: ['PVSuff-n', 'PVSuff-t']},
        ],
    },
    {
        category: 'regular imperfect verb',
        valid: true,
        tests: [
            // indicative
            {term: 'جلس', source: 'أجلس', rule: 'iv', reasons: ['IVPref-AnA']},
            {term: 'جلس', source: 'تجلس', rule: 'iv', reasons: ['IVPref-Anta']},
            {term: 'جلس', source: 'تجلسين', rule: 'iv', reasons: ['IVPref-Anti']},
            {term: 'جلس', source: 'يجلس', rule: 'iv', reasons: ['IVPref-hw']},
            {term: 'جلس', source: 'تجلس', rule: 'iv', reasons: ['IVPref-hy']},
            {term: 'جلس', source: 'تجلسان', rule: 'iv', reasons: ['IVPref-AntmA']},
            {term: 'جلس', source: 'يجلسان', rule: 'iv', reasons: ['IVPref-hmA']},
            {term: 'جلس', source: 'تجلسان', rule: 'iv', reasons: ['IVPref-hmA-ta']},
            {term: 'جلس', source: 'نجلس', rule: 'iv', reasons: ['IVPref-nHn']},
            {term: 'جلس', source: 'تجلسون', rule: 'iv', reasons: ['IVPref-Antm']},
            {term: 'جلس', source: 'تجلسن', rule: 'iv', reasons: ['IVPref-Antn']},
            {term: 'جلس', source: 'يجلسون', rule: 'iv', reasons: ['IVPref-hm']},
            {term: 'جلس', source: 'يجلسن', rule: 'iv', reasons: ['IVPref-hn']},

            // subjunctive
            {term: 'جلس', source: 'تجلسي', rule: 'iv', reasons: ['IVPref-Anti']},
            {term: 'جلس', source: 'تجلسا', rule: 'iv', reasons: ['IVPref-AntmA']},
            {term: 'جلس', source: 'يجلسا', rule: 'iv', reasons: ['IVPref-hmA']},
            {term: 'جلس', source: 'تجلسا', rule: 'iv', reasons: ['IVPref-hmA-ta']},
            {term: 'جلس', source: 'تجلسوا', rule: 'iv', reasons: ['IVPref-Antm']},
            {term: 'جلس', source: 'يجلسوا', rule: 'iv', reasons: ['IVPref-hm']},
        ],
    },
    {
        category: 'imperfect verb prefix chains',
        valid: true,
        tests: [
            {term: 'جلس', source: 'ويجلس', rule: 'iv', reasons: ['IVPref-hw']},
            {term: 'جلس', source: 'فيجلس', rule: 'iv', reasons: ['IVPref-hw']},
            {term: 'جلس', source: 'سيجلس', rule: 'iv', reasons: ['IVPref-hw']},
            {term: 'جلس', source: 'وسيجلس', rule: 'iv', reasons: ['IVPref-hw']},
            {term: 'جلس', source: 'فسيجلس', rule: 'iv', reasons: ['IVPref-hw']},
            {term: 'جلس', source: 'ليجلس', rule: 'iv', reasons: ['IVPref-hw']},
            {term: 'جلس', source: 'وليجلس', rule: 'iv', reasons: ['IVPref-hw']},
            {term: 'جلس', source: 'فليجلس', rule: 'iv', reasons: ['IVPref-hw']},

            {term: 'جلس', source: 'ليجلسا', rule: 'iv', reasons: ['IVPref-hmA']},
        ],
    },
    {
        category: 'imperfect verb attached direct object pronouns',
        valid: true,
        tests: [
            {term: 'ضرب', source: 'يضربني', rule: 'iv', reasons: ['IVPref-hw']},
            {term: 'ضرب', source: 'يضربنا', rule: 'iv', reasons: ['IVPref-hw']},
            {term: 'ضرب', source: 'يضربك', rule: 'iv', reasons: ['IVPref-hw']},
            {term: 'ضرب', source: 'يضربكما', rule: 'iv', reasons: ['IVPref-hw']},
            {term: 'ضرب', source: 'يضربكم', rule: 'iv', reasons: ['IVPref-hw']},
            {term: 'ضرب', source: 'يضربكن', rule: 'iv', reasons: ['IVPref-hw']},
            {term: 'ضرب', source: 'يضربه', rule: 'iv', reasons: ['IVPref-hw']},
            {term: 'ضرب', source: 'يضربها', rule: 'iv', reasons: ['IVPref-hw']},
            {term: 'ضرب', source: 'يضربهما', rule: 'iv', reasons: ['IVPref-hw']},
            {term: 'ضرب', source: 'يضربهم', rule: 'iv', reasons: ['IVPref-hw']},
            {term: 'ضرب', source: 'يضربهن', rule: 'iv', reasons: ['IVPref-hw']},

            {term: 'ضرب', source: 'أضربه', rule: 'iv', reasons: ['IVPref-AnA']},
            {term: 'ضرب', source: 'تضربه', rule: 'iv', reasons: ['IVPref-Anta']},
            {term: 'ضرب', source: 'تضربينه', rule: 'iv', reasons: ['IVPref-Anti']},
            {term: 'ضرب', source: 'يضربه', rule: 'iv', reasons: ['IVPref-hw']},
            {term: 'ضرب', source: 'تضربه', rule: 'iv', reasons: ['IVPref-hy']},
            {term: 'ضرب', source: 'تضربانه', rule: 'iv', reasons: ['IVPref-AntmA']},
            {term: 'ضرب', source: 'يضربانه', rule: 'iv', reasons: ['IVPref-hmA']},
            {term: 'ضرب', source: 'تضربانه', rule: 'iv', reasons: ['IVPref-hmA-ta']},
            {term: 'ضرب', source: 'نضربه', rule: 'iv', reasons: ['IVPref-nHn']},
            {term: 'ضرب', source: 'تضربونه', rule: 'iv', reasons: ['IVPref-Antm']},
            {term: 'ضرب', source: 'تضربنه', rule: 'iv', reasons: ['IVPref-Antn']},
            {term: 'ضرب', source: 'يضربونه', rule: 'iv', reasons: ['IVPref-hm']},
            {term: 'ضرب', source: 'يضربنه', rule: 'iv', reasons: ['IVPref-hn']},

            // subjunctive
            {term: 'ضرب', source: 'تضربيه', rule: 'iv', reasons: ['IVPref-Anti']},
            {term: 'ضرب', source: 'تضرباه', rule: 'iv', reasons: ['IVPref-AntmA']},
            {term: 'ضرب', source: 'يضرباه', rule: 'iv', reasons: ['IVPref-hmA']},
            {term: 'ضرب', source: 'تضرباه', rule: 'iv', reasons: ['IVPref-hmA-ta']},
            {term: 'ضرب', source: 'تضربوه', rule: 'iv', reasons: ['IVPref-Antm']},
            {term: 'ضرب', source: 'يضربوه', rule: 'iv', reasons: ['IVPref-hm']},
        ],
    },
    {
        category: 'imperfect verb with assimilated أ + ا = آ',
        valid: true,
        tests: [
            {term: 'قرأ', source: 'يقرآن', rule: 'iv', reasons: ['IVPref-hmA']},
            {term: 'قرأ', source: 'يقرآ', rule: 'iv', reasons: ['IVPref-hmA']},

            {term: 'قرأ', source: 'يقرآنه', rule: 'iv', reasons: ['IVPref-hmA']},
            {term: 'قرأ', source: 'يقرآه', rule: 'iv', reasons: ['IVPref-hmA']},

            {term: 'قرأ', source: 'ليقرآ', rule: 'iv', reasons: ['IVPref-hmA']},
        ],
    },
    {
        category: 'imperfect verb invalid attached direct object pronouns',
        valid: false,
        tests: [
            {term: 'ضرب', source: 'أضربنا', rule: 'iv', reasons: null},
            {term: 'ضرب', source: 'أضربني', rule: 'iv', reasons: null},
            {term: 'ضرب', source: 'نضربني', rule: 'iv', reasons: null},

            {term: 'ضرب', source: 'تضربك', rule: 'iv', reasons: ['IVPref-Anta']},
            {term: 'ضرب', source: 'تضربينك', rule: 'iv', reasons: null},
            {term: 'ضرب', source: 'تضربانك', rule: 'iv', reasons: ['IVPref-Antma']},
            {term: 'ضرب', source: 'تضربونك', rule: 'iv', reasons: null},
            {term: 'ضرب', source: 'تضربنك', rule: 'iv', reasons: null},

            {term: 'ضرب', source: 'تضربنكما', rule: 'iv', reasons: null},
            {term: 'ضرب', source: 'تضربنكم', rule: 'iv', reasons: null},
            {term: 'ضرب', source: 'تضربنكن', rule: 'iv', reasons: null},
        ],
    },
    {
        category: 'imperfect verb invalid chains',
        valid: false,
        tests: [
            {term: 'جلس', source: 'ليجلسان', rule: 'iv', reasons: null},
            {term: 'جلس', source: 'ليجلسون', rule: 'iv', reasons: null},
            {term: 'جلس', source: 'لتجلسين', rule: 'iv', reasons: null},

            {term: 'جلس', source: 'سليجلس', rule: 'iv', reasons: null},
        ],
    },
    {
        category: 'regluar command verb',
        valid: true,
        tests: [
            {term: 'درس', source: 'ادرس', rule: 'cv', reasons: ['CVPref']},
            {term: 'درس', source: 'ادرسي', rule: 'cv', reasons: ['CVSuff', 'CVPref']},
            {term: 'درس', source: 'ادرسا', rule: 'cv', reasons: ['CVSuff', 'CVPref']},
            {term: 'درس', source: 'ادرسوا', rule: 'cv', reasons: ['CVSuff', 'CVPref']},
            {term: 'درس', source: 'ادرسن', rule: 'cv', reasons: ['CVSuff', 'CVPref']},

            {term: 'درس', source: 'وادرس', rule: 'cv', reasons: ['CVPref']},
            {term: 'درس', source: 'فادرس', rule: 'cv', reasons: ['CVPref']},

            {term: 'درس', source: 'ادرسه', rule: 'cv', reasons: ['CVSuff', 'CVPref']},
            {term: 'درس', source: 'ادرسها', rule: 'cv', reasons: ['CVSuff', 'CVPref']},
            {term: 'درس', source: 'ادرسهما', rule: 'cv', reasons: ['CVSuff', 'CVPref']},
            {term: 'درس', source: 'ادرسهم', rule: 'cv', reasons: ['CVSuff', 'CVPref']},
            {term: 'درس', source: 'ادرسهن', rule: 'cv', reasons: ['CVSuff', 'CVPref']},
            {term: 'درس', source: 'ادرسني', rule: 'cv', reasons: ['CVSuff', 'CVPref']},
            {term: 'درس', source: 'ادرسنا', rule: 'cv', reasons: ['CVSuff', 'CVPref']},

            {term: 'درس', source: 'ادرسيه', rule: 'cv', reasons: ['CVSuff', 'CVPref']},
            {term: 'درس', source: 'ادرسوه', rule: 'cv', reasons: ['CVSuff', 'CVPref']},

            // Non-form I Verb
            {term: 'تعلم', source: 'تعلمي', rule: 'cv', reasons: ['CVSuff']},
            {term: 'تعلم', source: 'فتعلمي', rule: 'cv', reasons: ['CVSuff', 'CVPref']},
        ],
    },
    {
        category: 'command verb invalid attached direct object pronouns',
        valid: false,
        tests: [
            {term: 'درس', source: 'ادرسك', rule: 'cv', reasons: null},
            {term: 'درس', source: 'ادرسكما', rule: 'cv', reasons: null},
            {term: 'درس', source: 'ادرسكم', rule: 'cv', reasons: null},
            {term: 'درس', source: 'ادرسكن', rule: 'cv', reasons: null},
        ],
    },
];

const languageTransformer = new LanguageTransformer();
languageTransformer.addDescriptor(arabicTransforms);
testLanguageTransformer(languageTransformer, tests);
