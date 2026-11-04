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

export const IMPORT_SEARCH_PATH = '/decks/import/search';

/** Bunpro accepts at most this many queries per import/search request. */
export const IMPORT_SEARCH_CHUNK = 30;

export const ADD_PATH = '/reviews/update_via_action_type';

export const HYDRATE_PATH = '/reviews/hydrate_reviewables';

export const USER_PATH = '/user';

/**
 * Vocab detail by numeric id or page slug.
 * @param {string|number} idOrSlug
 * @returns {string}
 */
export function vocabPath(idOrSlug) {
    return `/reviewables/vocab/${encodeURIComponent(String(idOrSlug))}`;
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
    return reviewActionBody(match, 'add');
}

/**
 * Bunpro's remove endpoint ignores `reviewables` alone; it needs the review row ids.
 * @param {import('bunpro').BunproMatch} match
 * @param {number[]} reviewIds
 * @returns {import('core').SerializableObject}
 */
export function removeBody(match, reviewIds) {
    return {
        ...reviewActionBody(match, 'remove'),
        review_ids: reviewIds,
    };
}

/**
 * @param {import('bunpro').BunproMatch} match
 * @param {'add'|'remove'} actionType
 * @returns {import('core').SerializableObject}
 */
function reviewActionBody(match, actionType) {
    return {
        action_type: actionType,
        deck_id: null,
        reviewables: reviewablePair(match),
    };
}

/**
 * @param {import('bunpro').BunproMatch|import('bunpro').BunproMatch[]} matchOrMatches
 * @returns {import('core').SerializableObject}
 */
export function hydrateBody(matchOrMatches) {
    const matches = Array.isArray(matchOrMatches) ? matchOrMatches : [matchOrMatches];
    return {
        reviewables: matches.map((match) => /** @type {[string, import('bunpro').ReviewableId]} */ ([KIND[match.kind].reviewable, match.id])),
    };
}

/**
 * @param {import('bunpro').BunproMatch} match
 * @returns {[string, import('bunpro').ReviewableId][]}
 */
function reviewablePair(match) {
    return [[KIND[match.kind].reviewable, match.id]];
}

/**
 * One import/search body. `is_jmdict_mode` applies to every query in the chunk.
 * @param {import('bunpro').BunproQuery[]} queries
 * @param {boolean} isJmdictMode
 * @returns {import('core').SerializableObject}
 */
export function importSearchBody(queries, isJmdictMode) {
    return {
        key: 'yomitan',
        is_jmdict_mode: isJmdictMode,
        queries: queries.map((query, index) => ({
            key: `q${index}`,
            reviewable_type: 'Vocab',
            query: isJmdictMode ? String(query.jmdictId) : query.term,
        })),
    };
}

/**
 * @param {unknown} payload
 * @param {import('bunpro').BunproQuery[]} queries
 * @param {boolean} isJmdictMode
 * @returns {(?import('bunpro').BunproMatch)[]}
 */
export function parseImportSearchResponse(payload, queries, isJmdictMode) {
    const response = asObject(payload);
    const results = response === null || !Array.isArray(response.results) ? [] : response.results;
    /** @type {Map<string, ?import('bunpro').BunproMatch>} */
    const byKey = new Map();
    for (const item of results) {
        const row = asObject(item);
        if (row === null || typeof row.key !== 'string') { continue; }
        const match = parseImportSearchResult(row);
        if (match === null) {
            byKey.set(row.key, null);
            continue;
        }
        const index = Number(row.key.slice(1));
        const query = Number.isInteger(index) ? queries[index] : null;
        if (query === null) {
            byKey.set(row.key, null);
            continue;
        }
        byKey.set(row.key, isJmdictMode ? match : pickExactMatch([match], query));
    }
    return queries.map((_, index) => byKey.get(`q${index}`) ?? null);
}

/**
 * @param {Record<string, unknown>} row
 * @returns {?import('bunpro').BunproMatch}
 */
function parseImportSearchResult(row) {
    const base = asObject(row.base_attributes);
    const data = base === null ? null : asObject(base.data);
    if (data === null) { return null; }
    const attributes = asObject(data.attributes);
    if (attributes === null) { return null; }
    if (attributes.type_pascal !== 'Vocab' && typeof attributes.type_pascal !== 'undefined') { return null; }
    const id = parseReviewableId(typeof attributes.id === 'number' ? attributes.id : Number(data.id));
    if (id === null) { return null; }
    const furigana = typeof attributes.furigana === 'string' ? attributes.furigana : '';
    const title = typeof attributes.title === 'string' ? attributes.title : '';
    const written = title !== '' ? title : (furigana !== '' ? furiganaToWritten(furigana) : '');
    if (written === '') { return null; }
    const reading = furigana !== '' ? furiganaToReading(furigana) : written;
    const slug = typeof attributes.slug === 'string' && attributes.slug !== '' ? attributes.slug : written;
    return {
        id,
        kind: 'vocab',
        slug,
        written,
        reading,
        level: parseLevel(attributes),
        inReviews: false,
    };
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
 * Cloze if any included study question is cloze; sentences if only readonly (or other non-cloze);
 * translation when there are no study questions.
 * @param {unknown} payload
 * @returns {import('bunpro').StudyMode}
 */
export function parseStudyMode(payload) {
    const response = asObject(payload);
    if (response === null) { return 'translation'; }
    let hasQuestion = false;
    for (const record of recordsOf(response.included)) {
        if (record.type !== 'study_question') { continue; }
        hasQuestion = true;
        const attributes = asObject(record.attributes);
        if (attributes !== null && attributes.question_type === 'cloze') {
            return 'cloze';
        }
    }
    return hasQuestion ? 'sentences' : 'translation';
}

/**
 * Bunpro can return a review row that is not in the queue yet.
 * The vocab page counts the item as added only when that row is complete.
 * @param {unknown} payload
 * @returns {boolean}
 */
export function isInReviews(payload) {
    const response = asObject(payload);
    if (response === null) { return false; }
    return recordsOf(response.data).some((record) => {
        if (record.type !== 'review' && typeof record.type !== 'undefined') { return false; }
        const attributes = asObject(record.attributes);
        return attributes !== null && attributes.complete === true;
    });
}

/**
 * Ids of hydrate review rows that Bunpro treats as currently in reviews.
 * Remove requests need these; `reviewables` alone is a no-op.
 * @param {unknown} payload
 * @returns {number[]}
 */
export function completeReviewIds(payload) {
    const response = asObject(payload);
    if (response === null) { return []; }
    /** @type {number[]} */
    const ids = [];
    for (const record of recordsOf(response.data)) {
        if (record.type !== 'review') { continue; }
        const attributes = asObject(record.attributes);
        if (attributes === null || attributes.complete !== true) { continue; }
        const id = typeof attributes.id === 'number' ? attributes.id : Number(record.id);
        if (Number.isSafeInteger(id) && id > 0) { ids.push(id); }
    }
    return ids;
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
    const written = furiganaToWritten(furigana);
    const slug = typeof attributes.slug === 'string' && attributes.slug !== '' ? attributes.slug : written;
    return {
        id,
        kind,
        slug,
        written,
        reading: furiganaToReading(furigana),
        level: parseLevel(attributes),
        inReviews: reviews.some((review) => isReviewOf(review, kind, id)),
    };
}

/**
 * Item keys (`vocab:123`) of hydrate rows Bunpro treats as currently in reviews.
 * @param {unknown} payload
 * @returns {Set<import('bunpro').ItemKey>}
 */
export function reviewedItemKeys(payload) {
    const response = asObject(payload);
    /** @type {Set<import('bunpro').ItemKey>} */
    const keys = new Set();
    if (response === null) { return keys; }
    for (const record of recordsOf(response.data)) {
        if (record.type !== 'review' && typeof record.type !== 'undefined') { continue; }
        const attributes = asObject(record.attributes);
        if (attributes === null || attributes.complete !== true) { continue; }
        const id = parseReviewableId(Number(attributes.reviewable_id));
        if (id === null) { continue; }
        const type = attributes.reviewable_type;
        const kind = type === KIND.grammar.reviewable ? 'grammar' : 'vocab';
        keys.add(/** @type {import('bunpro').ItemKey} */ (`${kind}:${id}`));
    }
    return keys;
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
