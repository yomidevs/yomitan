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

import {afterEach, describe, expect, test, vi} from 'vitest';
import {createBunproClient} from '../ext/js/background/bunpro/bunpro-client.js';
import {parseJson} from '../ext/js/core/json.js';

const TABERU_QUERY = {term: '食べる', reading: 'たべる'};
const TABERU_MATCH = {id: 101, kind: 'vocab', slug: '食べる', written: '食べる', reading: 'たべる', level: 'N5', inReviews: false, studyMode: null};
const API_KEY_FLAG = 'dangerously_authenticate_using_api_token=true';

/**
 * @param {string} path
 * @returns {string}
 */
function bunproUrl(path) {
    return `https://api.bunpro.jp/api/frontend${path}?${API_KEY_FLAG}`;
}

/**
 * @param {number} status
 * @param {unknown} body
 * @returns {Response}
 */
function jsonResponse(status, body) {
    return new Response(JSON.stringify(body), {status, headers: {'Content-Type': 'application/json'}});
}

/**
 * @param {unknown} body
 * @returns {?number}
 */
function reviewableIdFrom(body) {
    if (typeof body !== 'object' || body === null) { return null; }
    const record = /** @type {Record<string, unknown>} */ (body);
    const pairs = record.reviewables;
    if (!Array.isArray(pairs) || !Array.isArray(pairs[0])) { return null; }
    const id = /** @type {unknown} */ (pairs[0][1]);
    return typeof id === 'number' ? id : null;
}

/**
 * Stand-in for Bunpro's frontend API that knows 食べる (101) and 有刺鉄線 / barbed-wire (32468).
 * @param {{validToken?: string, validTokens?: ?string[], failNextPatch?: boolean, reviewedIds?: number[]}} [setup]
 * @returns {{requests: {method: string, url: string, authorization: string, body: unknown}[], setStored: (value: ?string) => void, stored: () => ?string, methods: () => string[], client: ReturnType<typeof createBunproClient>}}
 */
function createFakeBunpro({validToken = 'token-a', validTokens = null, failNextPatch = false, reviewedIds = []} = {}) {
    /** @type {{method: string, url: string, authorization: string, body: unknown}[]} */
    const requests = [];
    /** @type {Set<number>} */
    const reviewed = new Set(reviewedIds);
    let failPatch = failNextPatch;
    let stored = /** @type {?string} */ (validToken);
    const accepted = new Set(validTokens ?? [validToken]);

    /** @type {Map<string, {id: number, slug: string, furigana: string, title: string, level: string}>} */
    const byTerm = new Map([
        ['食べる', {id: 101, slug: '食べる', furigana: '食（た）べる', title: '食べる', level: 'N5'}],
        ['有刺鉄線', {id: 32468, slug: 'barbed-wire', furigana: '有刺鉄線（ゆうしてっせん）', title: '有刺鉄線', level: 'A20'}],
    ]);
    /** @type {Map<string, {id: number, slug: string, furigana: string, title: string, level: string}>} */
    const byJmdict = new Map([
        ['1628790', /** @type {{id: number, slug: string, furigana: string, title: string, level: string}} */ (byTerm.get('有刺鉄線'))],
    ]);

    /** @type {import('bunpro').ClientPorts} */
    const ports = {
        fetch: async (url, init) => {
            const authorization = /** @type {Record<string, string>} */ (init.headers).Authorization;
            const method = /** @type {string} */ (init.method);
            const body = typeof init.body === 'string' ? parseJson(init.body) : null;
            requests.push({method, url, authorization, body});
            const path = url.split('?')[0];
            if (!accepted.has(authorization.slice('Token token='.length))) { return jsonResponse(401, {errors: [{code: 'unauthorized'}]}); }
            if (method === 'GET' && path.endsWith('/user')) { return jsonResponse(200, {}); }
            if (method === 'GET' && path.includes('/reviewables/vocab/')) {
                const id = decodeURIComponent(path.split('/reviewables/vocab/')[1] ?? '');
                if (id === '101' || id === '食べる') {
                    return jsonResponse(200, {
                        data: {id: '101', type: 'vocab', attributes: {id: 101, furigana: '食（た）べる', level: 'N5', slug: '食べる'}},
                        included: [{type: 'study_question', attributes: {question_type: 'cloze'}}],
                    });
                }
                if (id === '32468') {
                    return jsonResponse(200, {
                        data: {id: '32468', type: 'vocab', attributes: {id: 32468, furigana: '有刺鉄線（ゆうしてっせん）', level: 'A20', slug: 'barbed-wire'}},
                        included: [],
                    });
                }
                return jsonResponse(500, {});
            }
            if (method === 'POST' && path.endsWith('/decks/import/search')) {
                const record = body !== null && typeof body === 'object' ? /** @type {{is_jmdict_mode?: boolean, queries?: {key: string, query: string}[]}} */ (body) : null;
                const isJmdict = record?.is_jmdict_mode === true;
                const results = (record?.queries ?? []).map((query) => {
                    const hit = isJmdict ? byJmdict.get(query.query) : byTerm.get(query.query);
                    if (typeof hit === 'undefined') {
                        return {key: query.key, multiple_matches: false, base_attributes: {data: null}};
                    }
                    return {
                        key: query.key,
                        multiple_matches: false,
                        base_attributes: {
                            data: {
                                id: String(hit.id),
                                type: 'reviewable_base_attribute_mixed',
                                attributes: {
                                    id: hit.id,
                                    slug: hit.slug,
                                    furigana: hit.furigana,
                                    title: hit.title,
                                    level: hit.level,
                                    type_pascal: 'Vocab',
                                },
                            },
                        },
                    };
                });
                return jsonResponse(200, {results});
            }
            if (method === 'PATCH') {
                const record = body !== null && typeof body === 'object' ? /** @type {{action_type?: string, review_ids?: unknown, reviewables?: unknown}} */ (body) : null;
                const action = record?.action_type;
                const id = reviewableIdFrom(body) ?? 101;
                if (action === 'remove') {
                    if (Array.isArray(record?.review_ids) && record.review_ids.length > 0) {
                        reviewed.delete(id);
                    }
                } else {
                    reviewed.add(id);
                }
                if (failPatch) {
                    failPatch = false;
                    return new Response('', {status: 502});
                }
                return jsonResponse(200, {});
            }
            if (method === 'POST' && path.endsWith('/reviews/hydrate_reviewables')) {
                const record = body !== null && typeof body === 'object' ? /** @type {{reviewables?: [string, number][]}} */ (body) : null;
                const pairs = Array.isArray(record?.reviewables) ? record.reviewables : [];
                const data = pairs
                    .filter((pair) => Array.isArray(pair) && reviewed.has(pair[1]))
                    .map((pair, index) => ({
                        id: String(50 + index),
                        type: 'review',
                        attributes: {id: 50 + index, reviewable_id: pair[1], reviewable_type: pair[0], complete: true},
                    }));
                return jsonResponse(200, {data});
            }
            return jsonResponse(500, {});
        },
        readStoredToken: async () => stored,
        writeStoredToken: async (token) => { stored = token; },
    };

    return {
        requests,
        /** @param {?string} value */
        setStored: (value) => { stored = value; },
        /** @returns {?string} */
        stored: () => stored,
        /** @returns {string[]} */
        methods: () => requests.map(({method}) => method),
        client: (() => {
            const client = createBunproClient(ports);
            client.enabled = true;
            return client;
        })(),
    };
}

describe('BunproClient.findMatches', () => {
    test('batches import/search and leaves review state for hydrate', async () => {
        const bunpro = createFakeBunpro();
        const lookup = await bunpro.client.findMatches([TABERU_QUERY, {term: '食べ', reading: 'たべ'}, TABERU_QUERY]);
        expect(lookup).toStrictEqual({status: 'ready', matches: [TABERU_MATCH, null, TABERU_MATCH]});
        expect(bunpro.requests.map(({method, url, body}) => [method, url, body])).toStrictEqual([
            ['POST', bunproUrl('/decks/import/search'), {
                key: 'yomitan',
                is_jmdict_mode: false,
                queries: [
                    {key: 'q0', reviewable_type: 'Vocab', query: '食べる'},
                    {key: 'q1', reviewable_type: 'Vocab', query: '食べ'},
                ],
            }],
        ]);
    });

    test('JMdict ids and leftover terms use separate import/search partitions', async () => {
        const bunpro = createFakeBunpro();
        const lookup = await bunpro.client.findMatches([
            {term: '有刺鉄線', reading: 'ゆうしてっせん', jmdictId: 1628790},
            TABERU_QUERY,
        ]);
        expect(lookup).toStrictEqual({
            status: 'ready',
            matches: [
                {id: 32468, kind: 'vocab', slug: 'barbed-wire', written: '有刺鉄線', reading: 'ゆうしてっせん', level: 'A20', inReviews: false, studyMode: null},
                TABERU_MATCH,
            ],
        });
        expect(bunpro.requests.map(({body}) => body)).toStrictEqual([
            {
                key: 'yomitan',
                is_jmdict_mode: true,
                queries: [{key: 'q0', reviewable_type: 'Vocab', query: '1628790'}],
            },
            {
                key: 'yomitan',
                is_jmdict_mode: false,
                queries: [{key: 'q0', reviewable_type: 'Vocab', query: '食べる'}],
            },
        ]);
    });

    test('classifyStudyMode paints cloze vs translation from vocab detail', async () => {
        const bunpro = createFakeBunpro();
        const lookup = await bunpro.client.findMatches([TABERU_QUERY, {term: '有刺鉄線', reading: 'ゆうしてっせん', jmdictId: 1628790}]);
        if (lookup.status !== 'ready' || lookup.matches[0] === null || lookup.matches[1] === null) {
            throw new Error('expected matches');
        }
        expect((await bunpro.client.classifyStudyMode(lookup.matches[0])).studyMode).toStrictEqual('cloze');
        expect((await bunpro.client.classifyStudyMode(lookup.matches[1])).studyMode).toStrictEqual('translation');
        // Second call is cached.
        const before = bunpro.requests.length;
        expect((await bunpro.client.classifyStudyMode(lookup.matches[0])).studyMode).toStrictEqual('cloze');
        expect(bunpro.requests.length).toStrictEqual(before);
    });

    test('hydrateMatches marks complete reviews in one call', async () => {
        const bunpro = createFakeBunpro();
        const lookup = await bunpro.client.findMatches([TABERU_QUERY, {term: '有刺鉄線', reading: 'ゆうしてっせん', jmdictId: 1628790}]);
        if (lookup.status !== 'ready' || lookup.matches[0] === null || lookup.matches[1] === null) {
            throw new Error('expected matches');
        }
        await bunpro.client.add(lookup.matches[0]);
        const hydrated = await bunpro.client.hydrateMatches([lookup.matches[0], lookup.matches[1]]);
        expect(hydrated.map(({id, inReviews}) => [id, inReviews])).toStrictEqual([[101, true], [32468, false]]);
        expect(bunpro.requests.at(-1)).toMatchObject({
            method: 'POST',
            url: bunproUrl('/reviews/hydrate_reviewables'),
            body: {reviewables: [['Vocab', 101], ['Vocab', 32468]]},
        });
    });

    test('reports disabled without touching the network', async () => {
        const bunpro = createFakeBunpro();
        bunpro.client.enabled = false;
        expect(await bunpro.client.findMatches([TABERU_QUERY])).toStrictEqual({status: 'disabled'});
        expect(bunpro.requests).toStrictEqual([]);
    });
});

describe('BunproClient.add', () => {
    test('a hydrated match not in reviews is added with one PATCH, and adding again sends nothing', async () => {
        const bunpro = createFakeBunpro();
        const lookup = await bunpro.client.findMatches([TABERU_QUERY]);
        if (lookup.status !== 'ready' || lookup.matches[0] === null) { throw new Error('expected a match'); }
        const [match] = await bunpro.client.hydrateMatches([lookup.matches[0]]);

        const added = await bunpro.client.add(match);
        expect(added).toStrictEqual({...match, inReviews: true});
        // Known from hydrate: skip the pre-add hydrate and PATCH once.
        expect(bunpro.requests.slice(2).map(({method, body}) => [method, body])).toStrictEqual([
            ['PATCH', {action_type: 'add', deck_id: null, reviewables: [['Vocab', 101]]}],
        ]);

        expect(await bunpro.client.add(match)).toStrictEqual({...match, inReviews: true});
        expect(bunpro.methods()).toStrictEqual(['POST', 'POST', 'PATCH']);
        expect(await bunpro.client.findMatches([TABERU_QUERY])).toStrictEqual({status: 'ready', matches: [{...match, inReviews: true}]});
    });

    test('an add before hydrate checks review state instead of trusting the import/search placeholder', async () => {
        const bunpro = createFakeBunpro({reviewedIds: [101]});
        const lookup = await bunpro.client.findMatches([TABERU_QUERY]);
        if (lookup.status !== 'ready' || lookup.matches[0] === null) { throw new Error('expected a match'); }
        expect(lookup.matches[0].inReviews).toStrictEqual(false);

        expect((await bunpro.client.add(lookup.matches[0])).inReviews).toStrictEqual(true);
        expect(bunpro.methods()).toStrictEqual(['POST', 'POST']);
    });

    test('two overlapping adds share one PATCH', async () => {
        const bunpro = createFakeBunpro();
        const lookup = await bunpro.client.findMatches([TABERU_QUERY]);
        if (lookup.status !== 'ready' || lookup.matches[0] === null) { throw new Error('expected a match'); }
        const match = lookup.matches[0];

        const results = await Promise.all([bunpro.client.add(match), bunpro.client.add(match)]);
        expect(results.map(({inReviews}) => inReviews)).toStrictEqual([true, true]);
        expect(bunpro.methods()).toStrictEqual(['POST', 'POST', 'PATCH']);
    });

    test('an unknown match is checked for an existing review first', async () => {
        const bunpro = createFakeBunpro();
        const match = /** @type {import('bunpro').BunproMatch} */ ({...TABERU_MATCH});
        expect(await bunpro.client.add(match)).toStrictEqual({...match, inReviews: true});
        expect(bunpro.methods()).toStrictEqual(['POST', 'PATCH']);
    });

    test('a failed PATCH that landed anyway is a success', async () => {
        const bunpro = createFakeBunpro({failNextPatch: true});
        const lookup = await bunpro.client.findMatches([TABERU_QUERY]);
        if (lookup.status !== 'ready' || lookup.matches[0] === null) { throw new Error('expected a match'); }

        expect((await bunpro.client.add(lookup.matches[0])).inReviews).toStrictEqual(true);
        expect(bunpro.methods()).toStrictEqual(['POST', 'POST', 'PATCH', 'POST']);
    });
});

describe('BunproClient.remove', () => {
    test('a known match in reviews is removed with one PATCH, and removing again sends nothing', async () => {
        const bunpro = createFakeBunpro();
        const lookup = await bunpro.client.findMatches([TABERU_QUERY]);
        if (lookup.status !== 'ready' || lookup.matches[0] === null) { throw new Error('expected a match'); }
        const match = await bunpro.client.add(lookup.matches[0]);

        const removed = await bunpro.client.remove(match);
        expect(removed).toStrictEqual({...match, inReviews: false});
        expect(bunpro.requests.at(-1)).toMatchObject({
            method: 'PATCH',
            body: {action_type: 'remove', deck_id: null, reviewables: [['Vocab', 101]], review_ids: [50]},
        });

        expect(await bunpro.client.remove(match)).toStrictEqual({...match, inReviews: false});
        expect(bunpro.requests.filter(({method, body}) => (
            method === 'PATCH' && body !== null && typeof body === 'object' && /** @type {{action_type?: string}} */ (body).action_type === 'remove'
        )).length).toStrictEqual(1);
        expect(await bunpro.client.findMatches([TABERU_QUERY])).toStrictEqual({status: 'ready', matches: [{...match, inReviews: false}]});
    });

    test('two overlapping removes share one PATCH', async () => {
        const bunpro = createFakeBunpro();
        const lookup = await bunpro.client.findMatches([TABERU_QUERY]);
        if (lookup.status !== 'ready' || lookup.matches[0] === null) { throw new Error('expected a match'); }
        const match = await bunpro.client.add(lookup.matches[0]);

        const results = await Promise.all([bunpro.client.remove(match), bunpro.client.remove(match)]);
        expect(results.map(({inReviews}) => inReviews)).toStrictEqual([false, false]);
        expect(bunpro.requests.filter(({method, body}) => (
            method === 'PATCH' && body !== null && typeof body === 'object' && /** @type {{action_type?: string}} */ (body).action_type === 'remove'
        )).length).toStrictEqual(1);
    });
});

describe('BunproClient sign-in', () => {
    test('a 401 clears the saved key until a different one is stored', async () => {
        const bunpro = createFakeBunpro({validToken: 'token-b'});
        bunpro.setStored('token-a');
        expect(await bunpro.client.getStatus()).toStrictEqual('ready');
        expect(await bunpro.client.findMatches([TABERU_QUERY])).toStrictEqual({status: 'signedOut'});
        expect(await bunpro.client.getStatus()).toStrictEqual('signedOut');
        expect(bunpro.stored()).toBeNull();
        expect(bunpro.requests.length).toStrictEqual(1);

        bunpro.setStored('token-b');
        expect(await bunpro.client.getStatus()).toStrictEqual('ready');
        expect(bunpro.requests.length).toStrictEqual(1);
    });

    test('replacing the saved key drops the previous account\'s review cache', async () => {
        const bunpro = createFakeBunpro({validTokens: ['token-a', 'token-b']});
        bunpro.setStored('token-a');
        const lookupA = await bunpro.client.findMatches([TABERU_QUERY]);
        if (lookupA.status !== 'ready' || lookupA.matches[0] === null) { throw new Error('expected a match'); }
        await bunpro.client.add(lookupA.matches[0]);
        const cached = await bunpro.client.findMatches([TABERU_QUERY]);
        if (cached.status !== 'ready') { throw new Error('expected a ready lookup'); }
        expect(cached.matches[0]?.inReviews).toStrictEqual(true);
        const requestCount = bunpro.requests.length;

        bunpro.setStored('token-b');
        await bunpro.client.findMatches([TABERU_QUERY]);
        expect(bunpro.requests.length).toBeGreaterThan(requestCount);
        expect(bunpro.requests.slice(requestCount).map(({method}) => method)).toContain('POST');
    });

    test('an add rejected with 401 throws the signed-out error', async () => {
        const bunpro = createFakeBunpro({validToken: 'token-b'});
        bunpro.setStored('token-a');
        const match = /** @type {import('bunpro').BunproMatch} */ ({...TABERU_MATCH});
        await expect(bunpro.client.add(match)).rejects.toMatchObject({data: {code: 'bunpro-signed-out'}});
        expect(await bunpro.client.getStatus()).toStrictEqual('signedOut');
    });

    test('a missing key is signed out', async () => {
        const bunpro = createFakeBunpro();
        bunpro.setStored(null);
        expect(await bunpro.client.getStatus()).toStrictEqual('signedOut');
    });
});

describe('BunproClient saved token', () => {
    test('a saved key is sent with the frontend api-key flag', async () => {
        const bunpro = createFakeBunpro();
        const lookup = await bunpro.client.findMatches([TABERU_QUERY]);
        expect(lookup.status).toStrictEqual('ready');
        expect(bunpro.requests[0].authorization).toStrictEqual('Token token=token-a');
        expect(bunpro.requests[0].url).toContain(API_KEY_FLAG);
    });

    test('the session token is the saved key when connected', async () => {
        const bunpro = createFakeBunpro();
        expect(await bunpro.client.getSessionToken()).toStrictEqual('token-a');
    });

    test('the session token is null when signed out', async () => {
        const bunpro = createFakeBunpro();
        bunpro.setStored(null);
        expect(await bunpro.client.getSessionToken()).toBeNull();
    });

    test('a rejected saved key is removed', async () => {
        const bunpro = createFakeBunpro({validToken: 'token-b'});
        bunpro.setStored('token-a');
        expect(await bunpro.client.findMatches([TABERU_QUERY])).toStrictEqual({status: 'signedOut'});
        expect(bunpro.stored()).toBeNull();
    });

    test('a saved key that Bunpro accepts is reported as connected', async () => {
        const bunpro = createFakeBunpro();
        expect(await bunpro.client.getAuthorization()).toStrictEqual({status: 'ready', saved: true, tokenLength: 7});
        expect(bunpro.methods()).toStrictEqual(['GET']);
    });

    test('an invalid saved key is dropped', async () => {
        const bunpro = createFakeBunpro({validToken: 'token-b'});
        bunpro.setStored('token-a');
        expect(await bunpro.client.getAuthorization()).toStrictEqual({status: 'signedOut', saved: false, tokenLength: null});
        expect(bunpro.stored()).toBeNull();
    });

    test('a rejected manual key is not saved', async () => {
        const bunpro = createFakeBunpro();
        bunpro.setStored(null);
        await expect(bunpro.client.saveToken('token-b')).rejects.toMatchObject({data: {code: 'bunpro-signed-out'}});
        expect(bunpro.stored()).toBeNull();
    });

    test('an empty manual key is refused before any request', async () => {
        const bunpro = createFakeBunpro();
        await expect(bunpro.client.saveToken('  ')).rejects.toThrow('Enter a Bunpro API key.');
        expect(bunpro.requests).toStrictEqual([]);
    });

    test('a search that never answers is skipped and can be tried again', async () => {
        let calls = 0;
        /** @type {import('bunpro').ClientPorts} */
        const ports = {
            fetch: (_url, init) => {
                calls += 1;
                if (calls === 1) {
                    return new Promise((_resolve, reject) => {
                        init.signal?.addEventListener('abort', () => reject(init.signal?.reason));
                    });
                }
                return Promise.resolve(jsonResponse(200, {results: []}));
            },
            readStoredToken: async () => 'token-a',
            writeStoredToken: async () => {},
            searchTimeoutMs: 30,
        };
        const client = createBunproClient(ports);
        client.enabled = true;

        expect(await client.findMatches([TABERU_QUERY])).toStrictEqual({status: 'ready', matches: [null]});
        expect(await client.findMatches([TABERU_QUERY])).toStrictEqual({status: 'ready', matches: [null]});
        expect(calls).toStrictEqual(2);
    });

    test('removing the saved key signs out', async () => {
        const bunpro = createFakeBunpro();
        expect(await bunpro.client.clearToken()).toStrictEqual({status: 'signedOut', saved: false, tokenLength: null});
        expect(bunpro.stored()).toBeNull();
    });
});

describe('createBunproClient', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    test('refuses to build in a page window without test ports', () => {
        vi.stubGlobal('window', {location: {pathname: '/popup.html'}});
        expect(() => createBunproClient()).toThrow('The Bunpro client can only be created in the background page');
    });

    test('builds in the background page window', () => {
        vi.stubGlobal('window', {location: {pathname: '/background.html'}});
        expect(createBunproClient().enabled).toStrictEqual(false);
    });
});
