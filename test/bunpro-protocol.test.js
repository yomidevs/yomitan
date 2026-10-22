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
import {addBody, completeReviewIds, hydrateBody, isInReviews, parseSearchResponse, parseVocabItem, pickExactMatch, removeBody} from '../ext/js/background/bunpro/bunpro-protocol.js';

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

describe('parseVocabItem', () => {
    test('reads the single vocab item from the slug response', () => {
        expect(parseVocabItem({
            data: {id: '444', type: 'vocab', attributes: {id: 444, furigana: '国（くに）', jlpt_level: 'N5', slug: '国'}},
            included: [{type: 'study_question'}],
        })).toStrictEqual({id: 444, kind: 'vocab', written: '国', reading: 'くに', level: 'N5', inReviews: false});
        expect(parseVocabItem(null)).toBeNull();
    });
});

describe('isInReviews', () => {
    test('a review row counts only once Bunpro marks it complete', () => {
        expect(isInReviews({data: []})).toStrictEqual(false);
        expect(isInReviews({data: [{type: 'review'}]})).toStrictEqual(false);
        expect(isInReviews({data: [{type: 'review', attributes: {complete: false, next_review: null}}]})).toStrictEqual(false);
        expect(isInReviews({data: [{type: 'review', attributes: {complete: true}}]})).toStrictEqual(true);
    });
});

describe('hydrateBody', () => {
    test('names the same reviewable pair the add request uses', () => {
        expect(hydrateBody(createMatch({id: 444}))).toStrictEqual({reviewables: [['Vocab', 444]]});
    });
});

describe('addBody', () => {
    test('names the reviewable by its Bunpro type', () => {
        expect(addBody(createMatch({id: 7, kind: 'grammar'}))).toStrictEqual({action_type: 'add', deck_id: null, reviewables: [['GrammarPoint', 7]]});
    });
});

describe('removeBody', () => {
    test('includes review row ids Bunpro requires for remove', () => {
        expect(removeBody(createMatch({id: 7, kind: 'grammar'}), [99, 100])).toStrictEqual({
            action_type: 'remove',
            deck_id: null,
            reviewables: [['GrammarPoint', 7]],
            review_ids: [99, 100],
        });
    });
});

describe('completeReviewIds', () => {
    test('returns only complete review row ids', () => {
        expect(completeReviewIds({data: []})).toStrictEqual([]);
        expect(completeReviewIds({
            data: [
                {type: 'review', id: '1', attributes: {id: 1, complete: false}},
                {type: 'review', id: '2', attributes: {id: 2, complete: true}},
                {type: 'vocab', id: '3', attributes: {id: 3, complete: true}},
            ],
        })).toStrictEqual([2]);
    });
});
