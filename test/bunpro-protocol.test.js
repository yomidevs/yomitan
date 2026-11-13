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
import {addBody, completeReviewIds, hydrateBody, importSearchBody, isInReviews, parseImportSearchResponse, parseSearchResponse, parseStudyMode, parseVocabItem, pickExactMatch, removeBody, reviewedItemKeys} from '../ext/js/background/bunpro/bunpro-protocol.js';

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
    const written = fields.written ?? '';
    return /** @type {import('bunpro').BunproMatch} */ ({
        id: 1,
        kind: 'vocab',
        written,
        reading: '',
        level: null,
        inReviews: false,
        ...fields,
        slug: fields.slug ?? written,
    });
}

describe('parseSearchResponse', () => {
    test('reads written form, reading, level, slug, and review state from both kinds', () => {
        expect(parseSearchResponse(SEARCH_RESPONSE)).toStrictEqual([
            {id: 101, kind: 'vocab', slug: '食べる', written: '食べる', reading: 'たべる', level: 'N5', inReviews: true},
            {id: 102, kind: 'vocab', slug: '食べ物', written: '食べ物', reading: 'たべもの', level: '4', inReviews: false},
            {id: 7, kind: 'grammar', slug: '食べる', written: '食べる', reading: 'たべる', level: 'N3', inReviews: false},
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
            {id: 101, kind: 'vocab', slug: '食べる', written: '食べる', reading: 'たべる', level: 'N5', inReviews: true},
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
        // Katakana reading still counts as the same kana-only headword.
        expect(pickExactMatch([kanji], {term: 'すごい', reading: 'スゴイ'})).toStrictEqual(kanji);
    });

    test('hiragana and katakana spellings of the same word match', () => {
        const hiragana = createMatch({id: 9, written: 'ぴくぴく', reading: 'ぴくぴく', slug: 'ぴくぴく'});
        expect(pickExactMatch([hiragana], {term: 'ピクピク', reading: 'ピクピク'})).toStrictEqual(hiragana);
        expect(pickExactMatch([hiragana], {term: 'ぴくぴく', reading: 'ぴくぴく'})).toStrictEqual(hiragana);
    });
});

describe('parseVocabItem', () => {
    test('reads the single vocab item from the slug response', () => {
        expect(parseVocabItem({
            data: {id: '444', type: 'vocab', attributes: {id: 444, furigana: '国（くに）', jlpt_level: 'N5', slug: '国'}},
            included: [{type: 'study_question'}],
        })).toStrictEqual({id: 444, kind: 'vocab', slug: '国', written: '国', reading: 'くに', level: 'N5', inReviews: false});
        expect(parseVocabItem(null)).toBeNull();
    });
});

describe('importSearchBody', () => {
    test('builds a JMdict-mode chunk from sequence ids', () => {
        expect(importSearchBody([{term: '有刺鉄線', reading: 'ゆうしてっせん', jmdictId: 1628790}], true)).toStrictEqual({
            key: 'yomitan',
            is_jmdict_mode: true,
            queries: [{key: 'q0', reviewable_type: 'Vocab', query: '1628790'}],
        });
    });

    test('builds a term-mode chunk from spellings', () => {
        expect(importSearchBody([{term: '国', reading: 'くに'}], false)).toStrictEqual({
            key: 'yomitan',
            is_jmdict_mode: false,
            queries: [{key: 'q0', reviewable_type: 'Vocab', query: '国'}],
        });
    });
});

describe('parseImportSearchResponse', () => {
    test('maps English-slug hits in JMdict mode without requiring the written form to match the query term', () => {
        const queries = [{term: '有刺鉄線', reading: 'ゆうしてっせん', jmdictId: 1628790}];
        expect(parseImportSearchResponse({
            results: [{
                key: 'q0',
                multiple_matches: false,
                base_attributes: {
                    data: {
                        id: '32468',
                        type: 'reviewable_base_attribute_mixed',
                        attributes: {
                            id: 32468,
                            slug: 'barbed-wire',
                            furigana: '有刺鉄線（ゆうしてっせん）',
                            title: '有刺鉄線',
                            level: 'A20',
                            type_pascal: 'Vocab',
                        },
                    },
                },
            }],
        }, queries, true)).toStrictEqual([
            {id: 32468, kind: 'vocab', slug: 'barbed-wire', written: '有刺鉄線', reading: 'ゆうしてっせん', level: 'A20', inReviews: false},
        ]);
    });

    test('term mode still requires an exact spelling match', () => {
        const queries = [{term: '食べ', reading: 'たべ'}];
        expect(parseImportSearchResponse({
            results: [{
                key: 'q0',
                base_attributes: {
                    data: {
                        attributes: {
                            id: 101,
                            slug: '食べる',
                            furigana: '食（た）べる',
                            title: '食べる',
                            level: 'N5',
                            type_pascal: 'Vocab',
                        },
                    },
                },
            }],
        }, queries, false)).toStrictEqual([null]);
    });
});

describe('parseStudyMode', () => {
    test('cloze wins when any study question is cloze', () => {
        expect(parseStudyMode({
            included: [
                {type: 'study_question', attributes: {question_type: 'readonly'}},
                {type: 'study_question', attributes: {question_type: 'cloze'}},
            ],
        })).toStrictEqual('cloze');
    });

    test('readonly-only questions are sentences', () => {
        expect(parseStudyMode({
            included: [
                {type: 'study_question', attributes: {question_type: 'readonly'}},
                {type: 'study_question', attributes: {question_type: 'readonly'}},
            ],
        })).toStrictEqual('sentences');
    });

    test('no study questions means translation-only', () => {
        expect(parseStudyMode({included: []})).toStrictEqual('translation');
        expect(parseStudyMode({})).toStrictEqual('translation');
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

describe('reviewedItemKeys', () => {
    test('collects complete reviewable item keys from a multi hydrate', () => {
        expect(reviewedItemKeys({
            data: [
                {type: 'review', attributes: {complete: true, reviewable_id: 101, reviewable_type: 'Vocab'}},
                {type: 'review', attributes: {complete: false, reviewable_id: 102, reviewable_type: 'Vocab'}},
                {type: 'review', attributes: {complete: true, reviewable_id: 7, reviewable_type: 'GrammarPoint'}},
            ],
        })).toStrictEqual(new Set(['vocab:101', 'grammar:7']));
    });
});

describe('hydrateBody', () => {
    test('names one or many reviewable pairs', () => {
        expect(hydrateBody(createMatch({id: 444, written: '国'}))).toStrictEqual({reviewables: [['Vocab', 444]]});
        expect(hydrateBody([createMatch({id: 444}), createMatch({id: 101})])).toStrictEqual({
            reviewables: [['Vocab', 444], ['Vocab', 101]],
        });
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
