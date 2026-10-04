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
 * A stand-in for Bunpro's frontend API that knows one vocab, 食べる (id 101).
 * @param {{validToken?: string, validTokens?: string[], failNextPatch?: boolean}} [setup]
 * @returns {{requests: {method: string, url: string, authorization: string, body: unknown}[], setCookie: (value: ?string) => void, setStored: (value: ?string) => void, stored: () => ?string, setCookiesPermission: (value: boolean) => void, methods: () => string[], client: ReturnType<typeof createBunproClient>}}
 */
function createFakeBunpro({validToken = 'token-a', validTokens = null, failNextPatch = false} = {}) {
    /** @type {{method: string, url: string, authorization: string, body: unknown}[]} */
    const requests = [];
    /** @type {Set<number>} */
    const reviewed = new Set();
    let failPatch = failNextPatch;
    let cookie = /** @type {?string} */ (validToken);
    let stored = /** @type {?string} */ (null);
    let cookiesPermission = true;
    const accepted = new Set(validTokens ?? [validToken]);

    /** @type {import('bunpro').ClientPorts} */
    const ports = {
        fetch: async (url, init) => {
            const authorization = /** @type {Record<string, string>} */ (init.headers).Authorization;
            const method = /** @type {string} */ (init.method);
            const body = typeof init.body === 'string' ? parseJson(init.body) : null;
            requests.push({method, url, authorization, body});
            if (!accepted.has(authorization.slice('Token token='.length))) { return jsonResponse(401, {errors: [{code: 'unauthorized'}]}); }
            if (method === 'GET' && url.endsWith('/user')) { return jsonResponse(200, {}); }
            if (method === 'GET') {
                const slug = decodeURIComponent(url.split('/reviewables/vocab/')[1] ?? '');
                if (slug !== '食べる') { return jsonResponse(500, {}); }
                return jsonResponse(200, {
                    data: {id: '101', type: 'vocab', attributes: {id: 101, furigana: '食（た）べる', level: 'N5'}},
                });
            }
            if (method === 'PATCH') {
                reviewed.add(101);
                if (failPatch) {
                    failPatch = false;
                    return new Response('', {status: 502});
                }
                return jsonResponse(200, {});
            }
            const reviewableId = reviewableIdFrom(body);
            const inReviews = typeof reviewableId === 'number' && reviewed.has(reviewableId);
            return jsonResponse(200, {
                data: inReviews ? [{id: '1', type: 'review', attributes: {reviewable_id: reviewableId, reviewable_type: 'Vocab'}}] : [],
            });
        },
        readCookie: async () => cookie,
        hasCookiesPermission: async () => cookiesPermission,
        readStoredToken: async () => stored,
        writeStoredToken: async (token) => { stored = token; },
    };

    return {
        requests,
        /** @param {?string} value */
        setCookie: (value) => { cookie = value; },
        /** @param {?string} value */
        setStored: (value) => { stored = value; },
        /** @returns {?string} */
        stored: () => stored,
        /** @param {boolean} value */
        setCookiesPermission: (value) => { cookiesPermission = value; },
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
        expect(bunpro.requests.map(({method, url, body}) => [method, url, body])).toStrictEqual([
            ['GET', 'https://api.bunpro.jp/api/frontend/reviewables/vocab/%E9%A3%9F%E3%81%B9%E3%82%8B', null],
            ['GET', 'https://api.bunpro.jp/api/frontend/reviewables/vocab/%E9%A3%9F%E3%81%B9', null],
            ['POST', 'https://api.bunpro.jp/api/frontend/reviews/hydrate_reviewables', {reviewables: [['Vocab', 101]]}],
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
        expect(bunpro.requests.slice(2).map(({method, body}) => [method, body])).toStrictEqual([
            ['PATCH', {action_type: 'add', deck_id: null, reviewables: [['Vocab', 101]]}],
        ]);

        expect(await bunpro.client.add(match)).toStrictEqual({...match, inReviews: true});
        expect(bunpro.methods()).toStrictEqual(['GET', 'POST', 'PATCH']);
        expect(await bunpro.client.findMatches([TABERU_QUERY])).toStrictEqual({status: 'ready', matches: [{...match, inReviews: true}]});
    });

    test('two overlapping adds share one PATCH', async () => {
        const bunpro = createFakeBunpro();
        const lookup = await bunpro.client.findMatches([TABERU_QUERY]);
        if (lookup.status !== 'ready' || lookup.matches[0] === null) { throw new Error('expected a match'); }
        const match = lookup.matches[0];

        const results = await Promise.all([bunpro.client.add(match), bunpro.client.add(match)]);
        expect(results.map(({inReviews}) => inReviews)).toStrictEqual([true, true]);
        expect(bunpro.methods()).toStrictEqual(['GET', 'POST', 'PATCH']);
    });

    test('an unknown match is checked for an existing review first', async () => {
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
        expect(bunpro.methods()).toStrictEqual(['GET', 'POST', 'PATCH', 'POST']);
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

describe('BunproClient saved key', () => {
    test('a saved key is used when the browser has no login', async () => {
        const bunpro = createFakeBunpro();
        bunpro.setStored('token-a');
        bunpro.setCookie(null);
        const lookup = await bunpro.client.findMatches([TABERU_QUERY]);
        expect(lookup.status).toStrictEqual('ready');
        expect(bunpro.requests[0].authorization).toStrictEqual('Token token=token-a');
    });

    test('a saved key does not need the cookies permission', async () => {
        const bunpro = createFakeBunpro();
        bunpro.setStored('token-a');
        bunpro.setCookiesPermission(false);
        expect(await bunpro.client.getStatus()).toStrictEqual('ready');
    });

    test('a rejected saved key is removed', async () => {
        const bunpro = createFakeBunpro({validToken: 'token-b'});
        bunpro.setStored('token-a');
        bunpro.setCookie(null);
        expect(await bunpro.client.findMatches([TABERU_QUERY])).toStrictEqual({status: 'signedOut'});
        expect(bunpro.stored()).toBeNull();
    });

    test('a valid browser login is offered until it is saved', async () => {
        const bunpro = createFakeBunpro();
        bunpro.setCookie('token-a');
        expect(await bunpro.client.getAuthorization()).toStrictEqual({status: 'ready', saved: false, offerBrowserLogin: true});

        expect(await bunpro.client.saveBrowserLogin()).toStrictEqual({status: 'ready', saved: true, offerBrowserLogin: false});
        expect(bunpro.stored()).toStrictEqual('token-a');
        bunpro.setCookie(null);
        expect(await bunpro.client.getStatus()).toStrictEqual('ready');
    });

    test('the current browser login is not offered again', async () => {
        const bunpro = createFakeBunpro();
        bunpro.setStored('token-a');
        expect(await bunpro.client.getAuthorization()).toStrictEqual({status: 'ready', saved: true, offerBrowserLogin: false});
        expect(bunpro.methods()).toStrictEqual(['GET']);
    });

    test('an invalid saved key is dropped and a valid browser login is offered', async () => {
        const bunpro = createFakeBunpro({validToken: 'token-b'});
        bunpro.setStored('token-a');
        bunpro.setCookie('token-b');
        expect(await bunpro.client.getAuthorization()).toStrictEqual({status: 'ready', saved: false, offerBrowserLogin: true});
        expect(bunpro.stored()).toBeNull();
    });

    test('a different valid browser login is offered beside a saved key', async () => {
        const bunpro = createFakeBunpro({validTokens: ['token-a', 'token-b']});
        bunpro.setStored('token-a');
        bunpro.setCookie('token-b');
        expect(await bunpro.client.getAuthorization()).toStrictEqual({status: 'ready', saved: true, offerBrowserLogin: true});
        expect(bunpro.stored()).toStrictEqual('token-a');
    });

    test('a rejected manual key is not saved', async () => {
        const bunpro = createFakeBunpro();
        await expect(bunpro.client.saveToken('token-b')).rejects.toMatchObject({data: {code: 'bunpro-signed-out'}});
        expect(bunpro.stored()).toBeNull();
    });

    test('an empty manual key is refused before any request', async () => {
        const bunpro = createFakeBunpro();
        await expect(bunpro.client.saveToken('  ')).rejects.toThrow('Enter a Bunpro key.');
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
                return Promise.resolve(jsonResponse(200, {}));
            },
            readCookie: async () => 'token-a',
            hasCookiesPermission: async () => true,
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

    test('removing the saved key falls back to the browser login', async () => {
        const bunpro = createFakeBunpro();
        bunpro.setStored('token-a');
        expect(await bunpro.client.clearToken()).toStrictEqual({status: 'ready', saved: false, offerBrowserLogin: true});
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
