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

import {ExtensionError} from '../../core/extension-error.js';
import {readResponseJson} from '../../core/json.js';
import {hasPermissions} from '../../data/permissions-util.js';
import {SIGNED_OUT_ERROR_CODE, isSignedOutError, itemKey} from './bunpro-match.js';
import {ADD_PATH, API_BASE, SEARCH_PATH, addBody, parseSearchResponse, pickExactMatch, searchBody} from './bunpro-protocol.js';

const TOKEN_COOKIE = {url: 'https://bunpro.jp/', name: 'frontend_api_token'};
const MAX_SEARCHES_IN_FLIGHT = 4;

/**
 * The cookie is the user's Bunpro credential, so only the background page may hold it.
 * @param {?import('bunpro').ClientPorts} [ports] Replacements for the browser APIs, for tests.
 * @returns {BunproClient}
 * @throws {Error}
 */
export function createBunproClient(ports = null) {
    if (ports !== null) { return new BunproClient(ports); }
    if (!isBackgroundContext()) {
        throw new Error('The Bunpro client can only be created in the background page');
    }
    return new BunproClient(browserPorts());
}

class BunproClient {
    /**
     * @param {import('bunpro').ClientPorts} ports
     */
    constructor(ports) {
        /** @type {import('bunpro').ClientPorts} */
        this._ports = ports;
        /** @type {boolean} */
        this._enabled = false;
        /** @type {?string} */
        this._rejectedCookie = null;
        /** @type {Map<string, ?import('bunpro').ItemKey>} */
        this._resolutions = new Map();
        /** @type {Map<import('bunpro').ItemKey, import('bunpro').BunproMatch>} */
        this._items = new Map();
        /** @type {Map<import('bunpro').ItemKey, Promise<import('bunpro').BunproMatch>>} */
        this._adds = new Map();
    }

    /** @type {boolean} */
    get enabled() {
        return this._enabled;
    }

    set enabled(value) {
        this._enabled = value;
        if (!value) { this._forget(); }
    }

    /**
     * @returns {Promise<import('bunpro').BunproStatus>}
     */
    async getStatus() {
        return (await this._getSession()).status;
    }

    /**
     * @param {import('bunpro').BunproQuery[]} queries
     * @returns {Promise<import('bunpro').BunproLookup>}
     */
    async findMatches(queries) {
        const session = await this._getSession();
        if (session.status !== 'ready') { return {status: session.status}; }

        const unresolved = [...new Map(queries.map((query) => [queryKey(query), query])).values()]
            .filter((query) => !this._resolutions.has(queryKey(query)));
        try {
            await forEachLimited(unresolved, MAX_SEARCHES_IN_FLIGHT, (query) => this._resolve(session.cookie, query));
        } catch (e) {
            if (isSignedOutError(e)) { return {status: 'signedOut'}; }
            throw e;
        }
        return {status: 'ready', matches: queries.map((query) => this._lookup(query))};
    }

    /**
     * Safe to repeat: an item already in reviews, or already being added, is not sent again.
     * @param {import('bunpro').BunproMatch} match
     * @returns {Promise<import('bunpro').BunproMatch>}
     */
    add(match) {
        const key = itemKey(match);
        const known = this._items.get(key);
        if (typeof known !== 'undefined' && known.inReviews) { return Promise.resolve(known); }
        const pending = this._adds.get(key);
        if (typeof pending !== 'undefined') { return pending; }

        const promise = this._addOnce(match).finally(() => this._adds.delete(key));
        this._adds.set(key, promise);
        return promise;
    }

    // Private

    /**
     * @param {import('bunpro').BunproMatch} match
     * @returns {Promise<import('bunpro').BunproMatch>}
     */
    async _addOnce(match) {
        const session = await this._getSession();
        if (session.status !== 'ready') { throw createNotReadyError(session.status); }
        const {cookie} = session;

        if (!this._items.has(itemKey(match))) {
            const current = await this._searchItem(cookie, match);
            if (current !== null && current.inReviews) { return current; }
        }

        try {
            await this._request(cookie, ADD_PATH, 'PATCH', addBody(match));
        } catch (e) {
            if (isSignedOutError(e)) { throw e; }
            // The add may have landed even though the response failed.
            const current = await this._searchItem(cookie, match).catch(() => null);
            if (current !== null && current.inReviews) { return current; }
            throw e;
        }
        return this._remember({...match, inReviews: true});
    }

    /**
     * @param {string} cookie
     * @param {import('bunpro').BunproQuery} query
     */
    async _resolve(cookie, query) {
        const match = pickExactMatch(await this._search(cookie, query.term), query);
        this._resolutions.set(queryKey(query), match === null ? null : itemKey(this._remember(match)));
    }

    /**
     * @param {import('bunpro').BunproQuery} query
     * @returns {?import('bunpro').BunproMatch}
     */
    _lookup(query) {
        const key = this._resolutions.get(queryKey(query));
        return typeof key === 'string' ? (this._items.get(key) ?? null) : null;
    }

    /**
     * @param {string} cookie
     * @param {import('bunpro').BunproMatch} match
     * @returns {Promise<?import('bunpro').BunproMatch>}
     */
    async _searchItem(cookie, match) {
        const key = itemKey(match);
        const current = (await this._search(cookie, match.written)).find((candidate) => itemKey(candidate) === key);
        return typeof current === 'undefined' ? null : this._remember(current);
    }

    /**
     * @param {string} cookie
     * @param {string} term
     * @returns {Promise<import('bunpro').BunproMatch[]>}
     */
    async _search(cookie, term) {
        return parseSearchResponse(await this._request(cookie, SEARCH_PATH, 'POST', searchBody(term)));
    }

    /**
     * @param {string} cookie
     * @param {string} path
     * @param {'POST'|'PATCH'} method
     * @param {import('core').SerializableObject} body
     * @returns {Promise<unknown>}
     * @throws {Error}
     */
    async _request(cookie, path, method, body) {
        const response = await this._ports.fetch(`${API_BASE}${path}`, {
            method,
            credentials: 'omit',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Token token=${cookie}`,
            },
            body: JSON.stringify(body),
        });
        if (response.status === 401) {
            this._rejectedCookie = cookie;
            this._forget();
            throw createNotReadyError('signedOut');
        }
        if (!response.ok) {
            throw new Error(`Bunpro responded with HTTP status ${response.status}`);
        }
        return await readResponseJson(response);
    }

    /**
     * @returns {Promise<import('bunpro').Session>}
     */
    async _getSession() {
        if (!this._enabled) { return {status: 'disabled'}; }
        if (!(await this._ports.hasCookiesPermission())) { return {status: 'needsPermission'}; }
        const cookie = await this._ports.readCookie();
        if (cookie === null || cookie === this._rejectedCookie) { return {status: 'signedOut'}; }
        return {status: 'ready', cookie};
    }

    /**
     * @param {import('bunpro').BunproMatch} match
     * @returns {import('bunpro').BunproMatch}
     */
    _remember(match) {
        this._items.set(itemKey(match), match);
        return match;
    }

    /** */
    _forget() {
        this._resolutions.clear();
        this._items.clear();
    }
}

/**
 * @param {import('bunpro').BunproQuery} query
 * @returns {string}
 */
function queryKey({term, reading}) {
    return `${term}\n${reading}`;
}

/**
 * @param {Exclude<import('bunpro').BunproStatus, 'ready'>} status
 * @returns {ExtensionError}
 */
function createNotReadyError(status) {
    const error = new ExtensionError(status === 'signedOut' ? 'Signed out of Bunpro' : `Bunpro is unavailable: ${status}`);
    error.data = {code: status === 'signedOut' ? SIGNED_OUT_ERROR_CODE : `bunpro-${status}`};
    return error;
}

/**
 * @template T
 * @param {T[]} items
 * @param {number} limit
 * @param {(item: T) => Promise<void>} run
 */
async function forEachLimited(items, limit, run) {
    let next = 0;
    const worker = async () => {
        while (next < items.length) {
            await run(items[next++]);
        }
    };
    await Promise.all(Array.from({length: Math.min(limit, items.length)}, worker));
}

/**
 * @returns {boolean}
 */
function isBackgroundContext() {
    return typeof window === 'undefined' || window.location.pathname === '/background.html';
}

/**
 * @returns {import('bunpro').ClientPorts}
 */
function browserPorts() {
    return {
        fetch: (url, init) => fetch(url, init),
        readCookie: readTokenCookie,
        hasCookiesPermission: () => hasPermissions({permissions: ['cookies']}),
    };
}

/**
 * `chrome.cookies.get` may return a value that is already decoded. A stray `%`
 * must not fail the read.
 * @param {string} value
 * @returns {string}
 */
function decodeCookieValue(value) {
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
}

/**
 * @returns {Promise<?string>}
 */
function readTokenCookie() {
    return new Promise((resolve, reject) => {
        chrome.cookies.get(TOKEN_COOKIE, (cookie) => {
            const e = chrome.runtime.lastError;
            if (e) {
                reject(new Error(e.message));
            } else {
                resolve(cookie !== null && cookie.value !== '' ? decodeCookieValue(cookie.value) : null);
            }
        });
    });
}
