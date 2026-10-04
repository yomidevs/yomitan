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

/**
 * @param {number} status
 * @param {unknown} body
 * @returns {Response}
 */
function jsonResponse(status, body) {
    return new Response(JSON.stringify(body), {status, headers: {'Content-Type': 'application/json'}});
}

/**
 * A stand-in for Bunpro's frontend API that knows one vocab, 食べる (id 101).
 * @param {{validToken?: string, failNextPatch?: boolean}} [setup]
 * @returns {{requests: {method: string, url: string, authorization: string, body: unknown}[], setCookie: (value: ?string) => void, methods: () => string[], client: ReturnType<typeof createBunproClient>}}
 */
function createFakeBunpro({validToken = 'token-a', failNextPatch = false} = {}) {
    /** @type {{method: string, url: string, authorization: string, body: unknown}[]} */
    const requests = [];
    /** @type {Set<number>} */
    const reviewed = new Set();
    let failPatch = failNextPatch;
    let cookie = /** @type {?string} */ (validToken);

    /** @type {import('bunpro').ClientPorts} */
    const ports = {
        fetch: async (url, init) => {
            const authorization = /** @type {Record<string, string>} */ (init.headers).Authorization;
            const method = /** @type {string} */ (init.method);
            const body = parseJson(/** @type {string} */ (init.body));
            requests.push({method, url, authorization, body});
            if (authorization !== `Token token=${validToken}`) { return jsonResponse(401, {errors: [{code: 'unauthorized'}]}); }
            if (method === 'PATCH') {
                reviewed.add(101);
                if (failPatch) {
                    failPatch = false;
                    return new Response('', {status: 502});
                }
                return jsonResponse(200, {});
            }
            return jsonResponse(200, {
                vocabs: {
                    data: [{id: '101', type: 'vocab', attributes: {id: 101, furigana: '食（た）べる', level: 'N5'}}],
                    included: reviewed.has(101) ? [{id: '1', type: 'review', attributes: {reviewable_id: 101, reviewable_type: 'Vocab'}}] : [],
                },
                grammar_points: {data: [], included: []},
            });
        },
        readCookie: async () => cookie,
        hasCookiesPermission: async () => true,
    };

    return {
        requests,
        /** @param {?string} value */
        setCookie: (value) => { cookie = value; },
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
    test('returns the exact match per query and searches identical queries once', async () => {
        const bunpro = createFakeBunpro();
        const lookup = await bunpro.client.findMatches([TABERU_QUERY, {term: '食べ', reading: 'たべ'}, TABERU_QUERY]);
        const taberu = {id: 101, kind: 'vocab', written: '食べる', reading: 'たべる', level: 'N5', inReviews: false};
        expect(lookup).toStrictEqual({status: 'ready', matches: [taberu, null, taberu]});
        expect(bunpro.requests.map(({url, body}) => [url, body])).toStrictEqual([
            ['https://api.bunpro.jp/api/frontend/search/reviewables_v1_1', {
                query: '食べる',
                options: {include_reviews: true, include_bookmarks: false, include_notes: false, only_bookmarks: false},
                is_searching_grammar: true,
                is_searching_vocab: true,
            }],
            ['https://api.bunpro.jp/api/frontend/search/reviewables_v1_1', expect.objectContaining({query: '食べ'})],
        ]);
    });

    test('reports disabled without touching the network', async () => {
        const bunpro = createFakeBunpro();
        bunpro.client.enabled = false;
        expect(await bunpro.client.findMatches([TABERU_QUERY])).toStrictEqual({status: 'disabled'});
        expect(bunpro.requests).toStrictEqual([]);
    });
});

describe('BunproClient.add', () => {
    test('a known match not in reviews is added with one PATCH, and adding again sends nothing', async () => {
        const bunpro = createFakeBunpro();
        const lookup = await bunpro.client.findMatches([TABERU_QUERY]);
        if (lookup.status !== 'ready' || lookup.matches[0] === null) { throw new Error('expected a match'); }
        const match = lookup.matches[0];

        const added = await bunpro.client.add(match);
        expect(added).toStrictEqual({...match, inReviews: true});
        expect(bunpro.requests.slice(1).map(({method, body}) => [method, body])).toStrictEqual([
            ['PATCH', {action_type: 'add', deck_id: null, reviewables: [['Vocab', 101]]}],
        ]);

        expect(await bunpro.client.add(match)).toStrictEqual({...match, inReviews: true});
        expect(bunpro.methods()).toStrictEqual(['POST', 'PATCH']);
        expect(await bunpro.client.findMatches([TABERU_QUERY])).toStrictEqual({status: 'ready', matches: [{...match, inReviews: true}]});
    });

    test('two overlapping adds share one PATCH', async () => {
        const bunpro = createFakeBunpro();
        const lookup = await bunpro.client.findMatches([TABERU_QUERY]);
        if (lookup.status !== 'ready' || lookup.matches[0] === null) { throw new Error('expected a match'); }
        const match = lookup.matches[0];

        const results = await Promise.all([bunpro.client.add(match), bunpro.client.add(match)]);
        expect(results.map(({inReviews}) => inReviews)).toStrictEqual([true, true]);
        expect(bunpro.methods()).toStrictEqual(['POST', 'PATCH']);
    });

    test('an unknown match is searched first', async () => {
        const bunpro = createFakeBunpro();
        const match = /** @type {import('bunpro').BunproMatch} */ ({id: 101, kind: 'vocab', written: '食べる', reading: 'たべる', level: 'N5', inReviews: false});
        expect(await bunpro.client.add(match)).toStrictEqual({...match, inReviews: true});
        expect(bunpro.methods()).toStrictEqual(['POST', 'PATCH']);
    });

    test('a failed PATCH that landed anyway is a success', async () => {
        const bunpro = createFakeBunpro({failNextPatch: true});
        const lookup = await bunpro.client.findMatches([TABERU_QUERY]);
        if (lookup.status !== 'ready' || lookup.matches[0] === null) { throw new Error('expected a match'); }

        expect((await bunpro.client.add(lookup.matches[0])).inReviews).toStrictEqual(true);
        expect(bunpro.methods()).toStrictEqual(['POST', 'PATCH', 'POST']);
    });
});

describe('BunproClient sign-in', () => {
    test('a 401 remembers the cookie until it changes', async () => {
        const bunpro = createFakeBunpro({validToken: 'token-b'});
        bunpro.setCookie('token-a');
        expect(await bunpro.client.getStatus()).toStrictEqual('ready');
        expect(await bunpro.client.findMatches([TABERU_QUERY])).toStrictEqual({status: 'signedOut'});
        expect(await bunpro.client.getStatus()).toStrictEqual('signedOut');
        expect(bunpro.requests.length).toStrictEqual(1);

        bunpro.setCookie('token-b');
        expect(await bunpro.client.getStatus()).toStrictEqual('ready');
        expect(bunpro.requests.length).toStrictEqual(1);
    });

    test('an add rejected with 401 throws the signed-out error', async () => {
        const bunpro = createFakeBunpro({validToken: 'token-b'});
        bunpro.setCookie('token-a');
        const match = /** @type {import('bunpro').BunproMatch} */ ({id: 101, kind: 'vocab', written: '食べる', reading: 'たべる', level: 'N5', inReviews: false});
        await expect(bunpro.client.add(match)).rejects.toMatchObject({data: {code: 'bunpro-signed-out'}});
        expect(await bunpro.client.getStatus()).toStrictEqual('signedOut');
    });

    test('a missing cookie is signed out', async () => {
        const bunpro = createFakeBunpro();
        bunpro.setCookie(null);
        expect(await bunpro.client.getStatus()).toStrictEqual('signedOut');
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
