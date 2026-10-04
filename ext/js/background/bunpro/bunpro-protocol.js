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

export const API_BASE = 'https://api.bunpro.jp/api/frontend';

export const SEARCH_PATH = '/search/reviewables_v1_1';

export const ADD_PATH = '/reviews/update_via_action_type';

export const HYDRATE_PATH = '/reviews/hydrate_reviewables';

export const USER_PATH = '/user';

/**
 * The vocab page slug is the written form, as in `/vocabs/国`.
 * @param {string} term
 * @returns {string}
 */
export function vocabPath(term) {
    return `/reviewables/vocab/${encodeURIComponent(term)}`;
}

/** @type {Readonly<Record<import('bunpro').ReviewableKind, import('bunpro').KindWire>>} */
export const KIND = Object.freeze({
    vocab: {searchKey: 'vocabs', recordType: 'vocab', reviewable: 'Vocab'},
    grammar: {searchKey: 'grammar_points', recordType: null, reviewable: 'GrammarPoint'},
});

/** @type {import('bunpro').ReviewableKind[]} */
const KIND_NAMES = ['vocab', 'grammar'];

/**
 * @param {string} term
 * @returns {import('core').SerializableObject}
 */
export function searchBody(term) {
    return {
        query: term,
        options: {
            include_reviews: true,
            include_bookmarks: false,
            include_notes: false,
            only_bookmarks: false,
        },
        is_searching_grammar: true,
        is_searching_vocab: true,
    };
}

/**
 * @param {import('bunpro').BunproMatch} match
 * @returns {import('core').SerializableObject}
 */
export function addBody(match) {
    return {
        action_type: 'add',
        deck_id: null,
        reviewables: reviewablePair(match),
    };
}

/**
 * @param {import('bunpro').BunproMatch} match
 * @returns {import('core').SerializableObject}
 */
export function hydrateBody(match) {
    return {reviewables: reviewablePair(match)};
}

/**
 * @param {import('bunpro').BunproMatch} match
 * @returns {[string, import('bunpro').ReviewableId][]}
 */
function reviewablePair(match) {
    return [[KIND[match.kind].reviewable, match.id]];
}

/**
 * @param {unknown} payload
 * @returns {?import('bunpro').BunproMatch}
 */
export function parseVocabItem(payload) {
    const response = asObject(payload);
    const data = response === null ? null : asObject(response.data);
    if (data === null) { return null; }
    return parseRecord('vocab', data, []);
}

/**
 * An empty list means the item is not in the user's reviews.
 * @param {unknown} payload
 * @returns {boolean}
 */
export function isInReviews(payload) {
    const response = asObject(payload);
    if (response === null) { return false; }
    return recordsOf(response.data).length > 0;
}

/**
 * @param {unknown} payload
 * @returns {import('bunpro').BunproMatch[]}
 */
export function parseSearchResponse(payload) {
    const response = asObject(payload);
    if (response === null) { return []; }
    return KIND_NAMES.flatMap((kind) => parseKindDocument(kind, asObject(response[KIND[kind].searchKey])));
}

/**
 * Bunpro searches fuzzily, so only a candidate spelled as the dictionary headword counts.
 * @param {import('bunpro').BunproMatch[]} candidates
 * @param {import('bunpro').BunproQuery} query
 * @returns {?import('bunpro').BunproMatch}
 */
export function pickExactMatch(candidates, query) {
    const kanaOnly = query.term === query.reading;
    /** @type {?import('bunpro').BunproMatch} */
    let best = null;
    for (const candidate of candidates) {
        const accepted = candidate.written === query.term || (kanaOnly && candidate.reading === query.term);
        if (!accepted) { continue; }
        if (best === null || exactMatchRank(candidate, query) > exactMatchRank(best, query)) {
            best = candidate;
        }
    }
    return best;
}

/**
 * @param {import('bunpro').BunproMatch} candidate
 * @param {import('bunpro').BunproQuery} query
 * @returns {number}
 */
function exactMatchRank(candidate, query) {
    return (candidate.reading === query.reading ? 2 : 0) + (candidate.kind === 'vocab' ? 1 : 0);
}

// JSON:API parsing

/**
 * @param {import('bunpro').ReviewableKind} kind
 * @param {?Record<string, unknown>} document
 * @returns {import('bunpro').BunproMatch[]}
 */
function parseKindDocument(kind, document) {
    if (document === null) { return []; }
    const {recordType} = KIND[kind];
    const reviews = recordsOf(document.included).filter((record) => record.type === 'review');
    /** @type {import('bunpro').BunproMatch[]} */
    const matches = [];
    for (const record of recordsOf(document.data)) {
        const isEntry = recordType === null ? record.type !== 'review' : record.type === recordType;
        if (!isEntry) { continue; }
        const match = parseRecord(kind, record, reviews);
        if (match !== null) { matches.push(match); }
    }
    return matches;
}

/**
 * @param {import('bunpro').ReviewableKind} kind
 * @param {Record<string, unknown>} record
 * @param {Record<string, unknown>[]} reviews
 * @returns {?import('bunpro').BunproMatch}
 */
function parseRecord(kind, record, reviews) {
    const attributes = asObject(record.attributes);
    if (attributes === null) { return null; }
    const id = parseReviewableId(typeof attributes.id === 'number' ? attributes.id : Number(record.id));
    const furigana = attributes.furigana;
    if (id === null || typeof furigana !== 'string' || furigana === '') { return null; }
    return {
        id,
        kind,
        written: furiganaToWritten(furigana),
        reading: furiganaToReading(furigana),
        level: parseLevel(attributes),
        inReviews: reviews.some((review) => isReviewOf(review, kind, id)),
    };
}

/**
 * @param {Record<string, unknown>} attributes
 * @returns {?string}
 */
function parseLevel({level, jlpt_level: jlptLevel}) {
    if (typeof level === 'string') { return level; }
    if (typeof jlptLevel === 'string') { return jlptLevel; }
    if (typeof jlptLevel === 'number' && Number.isFinite(jlptLevel)) { return `${jlptLevel}`; }
    return null;
}

/**
 * @param {Record<string, unknown>} review
 * @param {import('bunpro').ReviewableKind} kind
 * @param {import('bunpro').ReviewableId} id
 * @returns {boolean}
 */
function isReviewOf(review, kind, id) {
    const attributes = asObject(review.attributes);
    if (attributes === null || Number(attributes.reviewable_id) !== id) { return false; }
    const type = attributes.reviewable_type;
    return typeof type !== 'string' || type === KIND[kind].reviewable;
}

/**
 * @param {number} value
 * @returns {?import('bunpro').ReviewableId}
 */
function parseReviewableId(value) {
    return Number.isSafeInteger(value) && value > 0 ? /** @type {import('bunpro').ReviewableId} */ (value) : null;
}

/**
 * @param {unknown} value
 * @returns {Record<string, unknown>[]}
 */
function recordsOf(value) {
    const list = Array.isArray(value) ? value : [value];
    /** @type {Record<string, unknown>[]} */
    const records = [];
    for (const item of list) {
        const record = asObject(item);
        if (record !== null) { records.push(record); }
    }
    return records;
}

/**
 * @param {unknown} value
 * @returns {?Record<string, unknown>}
 */
function asObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value) ? /** @type {Record<string, unknown>} */ (value) : null;
}

// Furigana. Bunpro writes readings inline, as in `食（た）べる`. The pair pattern
// follows Bunpro's own renderer. Ranges are `\uXXXX` escapes because the
// look-alike full-width characters do not survive text normalization.

const KANJI = String.raw`\u2E80-\u2E99\u2E9B-\u2EF3\u2F00-\u2FD5\u3005\u3007\u3021-\u3029\u3038-\u303B\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFA6D\uFA70-\uFAD9`;
const HIRAGANA = String.raw`\u3041-\u3096\u309D-\u309F`;
const KATAKANA = String.raw`\u30A0-\u30FF\u30FC`;
const JAPANESE = `${KANJI}${HIRAGANA}${KATAKANA}`;
/** ヶ takes a reading, though it is not a kanji. */
const ANNOTATABLE = `${KANJI}\\u30F6`;
const FULL_WIDTH_DIGITS = String.raw`\uFF10-\uFF19`;
const FULL_WIDTH_ALNUM = String.raw`\uFF21-\uFF3A\uFF41-\uFF5A${FULL_WIDTH_DIGITS}`;
const FULL_WIDTH_COMMA = String.raw`\uFF0C`;
const SYMBOLS = String.raw`\uFF0E\uFF1A\u30FC\u301C\uFF05\uFF06\uFF20\u21D2\u2103\uFF0B\u03B2`;
const OPEN_PAREN = String.raw`\uFF08`;
const CLOSE_PAREN = String.raw`\uFF09`;

const FURIGANA_WORD = `[${FULL_WIDTH_ALNUM}]*[${ANNOTATABLE}]*[${HIRAGANA}]*`;
const FURIGANA_DIGIT_GROUPS = `[${FULL_WIDTH_DIGITS}]+(?:${FULL_WIDTH_COMMA}[${FULL_WIDTH_DIGITS}]+)+`;
const FURIGANA_BASE = `((?:${FURIGANA_WORD}?)|(?:${FURIGANA_DIGIT_GROUPS})|(?:[${SYMBOLS}]))`;
const FURIGANA_PAIR = new RegExp(`${FURIGANA_BASE}${OPEN_PAREN}([${JAPANESE}]*)${CLOSE_PAREN}`, 'g');
const NON_JAPANESE = new RegExp(`[^${JAPANESE}]`);
const STARTS_ANNOTATABLE = new RegExp(`^[${ANNOTATABLE}]`);
const ALL_FULL_WIDTH = new RegExp(`^[${FULL_WIDTH_ALNUM}${SYMBOLS}${FULL_WIDTH_COMMA}]+$`);

/**
 * @param {string} furigana
 * @returns {string}
 */
function furiganaToWritten(furigana) {
    return dropAnnotations(furigana, (base) => base);
}

/**
 * @param {string} furigana
 * @returns {string}
 */
function furiganaToReading(furigana) {
    return dropAnnotations(furigana, (_base, reading) => reading);
}

/**
 * @param {string} furigana
 * @param {(base: string, reading: string) => string} keep
 * @returns {string}
 */
function dropAnnotations(furigana, keep) {
    return furigana.replace(FURIGANA_PAIR, (pair, /** @type {string} */ base, /** @type {string} */ reading) => (
        canAnnotate(base, reading) ? keep(base, reading) : pair
    ));
}

/**
 * @param {string} base
 * @param {string} reading
 * @returns {boolean}
 */
function canAnnotate(base, reading) {
    if (base === '' || reading === '' || NON_JAPANESE.test(reading)) { return false; }
    return STARTS_ANNOTATABLE.test(base) || ALL_FULL_WIDTH.test(base);
}
