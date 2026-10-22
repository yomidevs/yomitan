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

import {LanguageTransformer} from '../../ext/js/language/language-transformer.js';
import {indonesianTransforms} from '../../ext/js/language/id/indonesian-transforms.js';
import {testLanguageTransformer} from '../fixtures/language-transformer-test.js';


const tests = [
    {
        category: 'meN- prefixes',
        valid: true,
        tests: [
            // me- : mandatory before l, m, n, r, w, y
            {term: 'lihat', source: 'melihat', rule: null, reasons: ['me-']},
            {term: 'rasa', source: 'merasa', rule: null, reasons: ['me-']},
            // mem- : strips before b, f, and restores root-initial p
            {term: 'baca', source: 'membaca', rule: null, reasons: ['mem-']},
            {term: 'pukul', source: 'memukul', rule: null, reasons: ['mem-']},
            {term: 'pilih', source: 'memilih', rule: null, reasons: ['mem-']},
            // men- : strips before c, d, j, and restores root-initial t
            {term: 'dengar', source: 'mendengar', rule: null, reasons: ['men-']},
            {term: 'tulis', source: 'menulis', rule: null, reasons: ['men-']},
            // meng- : the k-hasanat serap variant cases
            {term: 'ambil', source: 'mengambil', rule: null, reasons: ['meng-']},
            {term: 'gambar', source: 'menggambar', rule: null, reasons: ['meng-']},
            {term: 'hitung', source: 'menghitung', rule: null, reasons: ['meng-']},
            {term: 'kirim', source: 'mengirim', rule: null, reasons: ['meng-']},
            // meny- : restores a dropped s
            {term: 'suka', source: 'menyukai', rule: null, reasons: ['-i', 'meny-']},
        ],
    },
    {
        category: 'other prefixes',
        valid: true,
        tests: [
            {term: 'bantu', source: 'membantu', rule: null, reasons: ['mem-']},
            {term: 'maju', source: 'memaju', rule: null, reasons: ['me-']},
            {term: 'maju', source: 'bermaju', rule: null, reasons: ['ber-']},
            {term: 'ajar', source: 'belajar', rule: null, reasons: ['bel-']},
            {term: 'duduk', source: 'duduki', rule: null, reasons: ['-i']},
            {term: 'buka', source: 'dibuka', rule: null, reasons: ['di-']},
            {term: 'mana', source: 'kemana', rule: null, reasons: ['ke-']},
            {term: 'hari', source: 'sehari', rule: null, reasons: ['se-']},
            {term: 'dahulu', source: 'terdahulu', rule: null, reasons: ['ter-']},
            {term: 'main', source: 'permainan', rule: null, reasons: ['per-', '-an']},
            {term: 'baca', source: 'pembaca', rule: null, reasons: ['pem-']},
            {term: 'pukul', source: 'pemukul', rule: null, reasons: ['pem-']},
            {term: 'duduk', source: 'penduduk', rule: null, reasons: ['pen-']},
            {term: 'tulis', source: 'penulisan', rule: null, reasons: ['pen-', '-an']},
            {term: 'air', source: 'pengairan', rule: null, reasons: ['peng-', '-an']},
            {term: 'kunci', source: 'pengunci', rule: null, reasons: ['peng-']},
            {term: 'sabar', source: 'penyabar', rule: null, reasons: ['peny-']},
            {term: 'coba', source: 'percobaan', rule: null, reasons: ['per-', '-an']},
        ],
    },
    {
        category: 'suffixes',
        valid: true,
        tests: [
            {term: 'pindah', source: 'pindahkan', rule: null, reasons: ['-kan']},
            {term: 'makan', source: 'makanan', rule: null, reasons: ['-an']},
            {term: 'duduk', source: 'duduki', rule: null, reasons: ['-i']},
            {term: 'rumah', source: 'rumahnya', rule: null, reasons: ['-nya']},
            {term: 'bapak', source: 'bapakku', rule: null, reasons: ['-ku']},
            {term: 'buku', source: 'bukumu', rule: null, reasons: ['-mu']},
            {term: 'jangan', source: 'janganlah', rule: null, reasons: ['-lah']},
            {term: 'ada', source: 'adakah', rule: null, reasons: ['-kah']},
            {term: 'ada', source: 'adapun', rule: null, reasons: ['-pun']},
            {term: 'agama', source: 'agamawan', rule: null, reasons: ['-wan']},
            {term: 'aksara', source: 'aksarawati', rule: null, reasons: ['-wati']},
        ],
    },
    {
        category: 'attached forms',
        valid: true,
        tests: [
            {term: 'masuk', source: 'memasukkan', rule: null, reasons: ['-kan', 'me-']},
            {term: 'turut', source: 'menuruti', rule: null, reasons: ['-i', 'men-']},
            {term: 'tahu', source: 'mengetahui', rule: null, reasons: ['-i', 'ke-', 'meng-']},
        ],
    },
    {
        category: 'sandwich circumfixes',
        valid: true,
        tests: [
            {term: 'jadi', source: 'kejadian', rule: null, reasons: ['ke-', '-an']},
            {term: 'mungkin', source: 'kemungkinan', rule: null, reasons: ['ke-', '-an']},
            {term: 'tulis', source: 'menuliskan', rule: null, reasons: ['-kan', 'men-']},
            {term: 'tulis', source: 'penulisan', rule: null, reasons: ['pen-', '-an']},
            {term: 'tahu', source: 'ketidaktahuan', rule: null, reasons: ['-an', 'tidak-', 'ke-']},
        ],
    },
    {
        category: 'reduplication',
        valid: true,
        tests: [
            {term: 'rumah', source: 'rumah-rumah', rule: null, reasons: ['reduplication']},
            {term: 'rumah', source: 'rumah-rumahnya', rule: null, reasons: ['reduplication', '-nya']},
            {term: 'main', source: 'bermain-main', rule: null, reasons: ['reduplication', 'ber-']},
            {term: 'main', source: 'bermainmain', rule: null, reasons: ['reduplication', 'ber-']},
            {term: 'besar', source: 'sebesar-besarnya', rule: null, reasons: ['reduplication', 'se-', '-nya']},
            {term: 'malu', source: 'malu-malu', rule: null, reasons: ['reduplication']},
        ],
    },
    {
        category: 'invalid',
        valid: false,
        tests: [
            // Paired-word reduplication cannot be reduced to a single word (it is its own dictionary entry).
            {term: 'adik', source: 'adik-beradik', rule: null, reasons: null},
            // Kata ulang berubah bunyi (changed-sound repetition) has no general rule.
            {term: 'balik', source: 'bolak-balik', rule: null, reasons: null},
        ],
    },
];

const languageTransformer = new LanguageTransformer();
languageTransformer.addDescriptor(indonesianTransforms);
testLanguageTransformer(languageTransformer, tests);
