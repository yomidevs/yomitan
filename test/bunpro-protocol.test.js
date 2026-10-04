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
import {addBody, parseSearchResponse, pickExactMatch} from '../ext/js/background/bunpro/bunpro-protocol.js';

const SEARCH_RESPONSE = {
    vocabs: {
        data: [
            {id: '101', type: 'vocab', attributes: {id: 101, furigana: '食（た）べる', level: 'N5'}},
            {id: '102', type: 'vocab', attributes: {id: 102, furigana: '食（た）べ物（もの）', jlpt_level: 4}},
        ],
        included: [
            {id: '9', type: 'review', attributes: {id: 9, reviewable_id: 101, reviewable_type: 'Vocab'}},
            {id: '10', type: 'review', attributes: {id: 10, reviewable_id: 102, reviewable_type: 'GrammarPoint'}},
        ],
    },
    grammar_points: {
        data: [
            {id: '7', type: 'grammar_point', attributes: {id: 7, furigana: '食（た）べる', jlpt_level: 'N3'}},
            {id: '11', type: 'review', attributes: {id: 11, reviewable_id: 7}},
        ],
        included: [],
    },
};

/**
 * @param {Partial<Omit<import('bunpro').BunproMatch, 'id'>> & {id?: number}} fields
 * @returns {import('bunpro').BunproMatch}
 */
function createMatch(fields) {
    return /** @type {import('bunpro').BunproMatch} */ ({id: 1, kind: 'vocab', written: '', reading: '', level: null, inReviews: false, ...fields});
}

describe('parseSearchResponse', () => {
    test('reads written form, reading, level, and review state from both kinds', () => {
        expect(parseSearchResponse(SEARCH_RESPONSE)).toStrictEqual([
            {id: 101, kind: 'vocab', written: '食べる', reading: 'たべる', level: 'N5', inReviews: true},
            {id: 102, kind: 'vocab', written: '食べ物', reading: 'たべもの', level: '4', inReviews: false},
            {id: 7, kind: 'grammar', written: '食べる', reading: 'たべる', level: 'N3', inReviews: false},
        ]);
    });

    test('a malformed payload has no candidates', () => {
        expect(parseSearchResponse({vocabs: {data: [{type: 'vocab', attributes: {furigana: 'x'}}]}, grammar_points: 'nope'})).toStrictEqual([]);
    });
});

describe('pickExactMatch', () => {
    test('picks the vocab spelled as the query and drops the fuzzy neighbor', () => {
        const candidates = parseSearchResponse(SEARCH_RESPONSE);
        expect(pickExactMatch(candidates, {term: '食べる', reading: 'たべる'})).toStrictEqual(
            {id: 101, kind: 'vocab', written: '食べる', reading: 'たべる', level: 'N5', inReviews: true},
        );
        expect(pickExactMatch(candidates, {term: '食べ', reading: 'たべ'})).toStrictEqual(null);
    });

    test('grammar loses a tie to vocab regardless of order', () => {
        const grammar = createMatch({id: 7, kind: 'grammar', written: 'ため', reading: 'ため'});
        const vocab = createMatch({id: 8, kind: 'vocab', written: 'ため', reading: 'ため'});
        expect(pickExactMatch([grammar, vocab], {term: 'ため', reading: 'ため'})).toStrictEqual(vocab);
    });

    test('a matching reading outranks the kind', () => {
        const grammar = createMatch({id: 7, kind: 'grammar', written: '方', reading: 'かた'});
        const vocab = createMatch({id: 8, kind: 'vocab', written: '方', reading: 'ほう'});
        expect(pickExactMatch([vocab, grammar], {term: '方', reading: 'かた'})).toStrictEqual(grammar);
    });

    test('a kana-only query also accepts a candidate read as the query', () => {
        const kanji = createMatch({id: 5, written: '凄い', reading: 'すごい'});
        expect(pickExactMatch([kanji], {term: 'すごい', reading: 'すごい'})).toStrictEqual(kanji);
        expect(pickExactMatch([kanji], {term: 'すごい', reading: 'スゴイ'})).toStrictEqual(null);
    });
});

describe('addBody', () => {
    test('names the reviewable by its Bunpro type', () => {
        expect(addBody(createMatch({id: 7, kind: 'grammar'}))).toStrictEqual({action_type: 'add', deck_id: null, reviewables: [['GrammarPoint', 7]]});
    });
});
