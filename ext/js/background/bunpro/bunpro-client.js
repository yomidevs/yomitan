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
import {SIGNED_OUT_ERROR_CODE, isSignedOutError, itemKey, queryKey} from './bunpro-match.js';
import {ADD_PATH, API_BASE, HYDRATE_PATH, USER_PATH, addBody, hydrateBody, isInReviews, parseVocabItem, pickExactMatch, vocabPath} from './bunpro-protocol.js';

const TOKEN_COOKIE = {url: 'https://bunpro.jp/', name: 'frontend_api_token'};
const TOKEN_STORAGE_KEY = 'bunproFrontendToken';
const MAX_SEARCHES_IN_FLIGHT = 4;
const SEARCH_TIMEOUT_MS = 8000;

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
        /** @type {Map<string, Promise<void>>} */
        this._searches = new Map();
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
     * Validates the saved key, then the browser login, before the settings page offers either.
     * @returns {Promise<import('bunpro').BunproAuthorization>}
     */
    async getAuthorization() {
        const stored = blankToNull(await this._ports.readStoredToken());
        const savedToken = stored !== null && stored !== this._rejectedCookie ? stored : null;
        if (!this._enabled) {
            return {status: 'disabled', saved: savedToken !== null, offerBrowserLogin: false};
        }
        if (savedToken !== null) {
            if (await this._probe(savedToken)) {
                return {status: 'ready', saved: true, offerBrowserLogin: await this._browserLoginIsUsable(savedToken)};
            }
            await this._rejectToken(savedToken);
        }
        return await this._authorizationFromBrowser();
    }

    /**
     * @returns {Promise<import('bunpro').BunproAuthorization>}
     */
    async saveBrowserLogin() {
        if (!(await this._ports.hasCookiesPermission())) { throw createNotReadyError('needsPermission'); }
        const cookie = blankToNull(await this._ports.readCookie());
        if (cookie === null || !(await this._probe(cookie))) { throw rejectedKeyError(); }
        await this._storeToken(cookie);
        return await this.getAuthorization();
    }

    /**
     * @param {string} token
     * @returns {Promise<import('bunpro').BunproAuthorization>}
     */
    async saveToken(token) {
        const value = token.trim();
        if (value === '') { throw new ExtensionError('Enter a Bunpro key.'); }
        if (!(await this._probe(value))) { throw rejectedKeyError(); }
        await this._storeToken(value);
        return await this.getAuthorization();
    }

    /**
     * @returns {Promise<import('bunpro').BunproAuthorization>}
     */
    async clearToken() {
        await this._ports.writeStoredToken(null);
        this._forget();
        return await this.getAuthorization();
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
            const current = await this._withReviewState(cookie, match);
            if (current.inReviews) { return current; }
        }

        try {
            await this._request(cookie, ADD_PATH, 'PATCH', addBody(match));
        } catch (e) {
            if (isSignedOutError(e)) { throw e; }
            // The add may have landed even though the response failed.
            const current = await this._withReviewState(cookie, match).catch(() => null);
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
        const key = queryKey(query);
        if (this._resolutions.has(key)) { return; }
        let pending = this._searches.get(key);
        if (typeof pending === 'undefined') {
            pending = this._searchOnce(cookie, query).finally(() => {
                if (this._searches.get(key) === pending) { this._searches.delete(key); }
            });
            this._searches.set(key, pending);
        }
        await pending;
    }

    /**
     * A failed lookup is not remembered, so the next lookup can try again.
     * An unknown slug is remembered: Bunpro answers that with HTTP 500.
     * @param {string} cookie
     * @param {import('bunpro').BunproQuery} query
     */
    async _searchOnce(cookie, query) {
        try {
            const item = parseVocabItem(await this._get(cookie, vocabPath(query.term)));
            const match = item === null ? null : pickExactMatch([item], query);
            if (match === null) {
                this._resolutions.set(queryKey(query), null);
                return;
            }
            const reviewed = await this._withReviewState(cookie, match);
            this._resolutions.set(queryKey(query), itemKey(reviewed));
        } catch (e) {
            if (isSignedOutError(e)) { throw e; }
        }
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
     * @returns {Promise<import('bunpro').BunproMatch>}
     */
    async _withReviewState(cookie, match) {
        const payload = await this._request(cookie, HYDRATE_PATH, 'POST', hydrateBody(match));
        return this._remember({...match, inReviews: isInReviews(payload)});
    }

    /**
     * @param {string} cookie
     * @param {string} path
     * @returns {Promise<unknown>}
     * @throws {Error}
     */
    async _get(cookie, path) {
        const response = await this._send(cookie, path, 'GET');
        if (response.status === 404 || response.status === 500) { return null; }
        if (!response.ok) {
            throw new Error(`Bunpro responded with HTTP status ${response.status}`);
        }
        return await readResponseJson(response);
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
        const response = await this._send(cookie, path, method, body);
        if (!response.ok) {
            throw new Error(`Bunpro responded with HTTP status ${response.status}`);
        }
        return await readResponseJson(response);
    }

    /**
     * @param {string} cookie
     * @param {string} path
     * @param {'GET'|'POST'|'PATCH'} method
     * @param {import('core').SerializableObject} [body]
     * @returns {Promise<Response>}
     * @throws {Error}
     */
    async _send(cookie, path, method, body) {
        /** @type {Record<string, string>} */
        const headers = {
            Accept: 'application/json',
            Authorization: `Token token=${cookie}`,
        };
        if (typeof body !== 'undefined') { headers['Content-Type'] = 'application/json'; }
        const response = await this._ports.fetch(`${API_BASE}${path}`, {
            method,
            credentials: 'omit',
            signal: searchSignal(this._ports),
            headers,
            body: typeof body === 'undefined' ? void 0 : JSON.stringify(body),
        });
        if (response.status === 401) {
            await this._rejectToken(cookie);
            throw createNotReadyError('signedOut');
        }
        return response;
    }

    /**
     * @returns {Promise<import('bunpro').Session>}
     */
    async _getSession() {
        if (!this._enabled) { return {status: 'disabled'}; }
        const saved = blankToNull(await this._ports.readStoredToken());
        if (saved !== null && saved !== this._rejectedCookie) { return {status: 'ready', cookie: saved}; }
        if (!(await this._ports.hasCookiesPermission())) { return {status: 'needsPermission'}; }
        const cookie = blankToNull(await this._ports.readCookie());
        if (cookie === null || cookie === this._rejectedCookie) { return {status: 'signedOut'}; }
        return {status: 'ready', cookie};
    }

    /**
     * @returns {Promise<import('bunpro').BunproAuthorization>}
     */
    async _authorizationFromBrowser() {
        if (!(await this._ports.hasCookiesPermission())) {
            return {status: 'needsPermission', saved: false, offerBrowserLogin: false};
        }
        const cookie = blankToNull(await this._ports.readCookie());
        if (cookie === null || cookie === this._rejectedCookie) {
            return {status: 'signedOut', saved: false, offerBrowserLogin: false};
        }
        if (!(await this._probe(cookie))) {
            await this._rejectToken(cookie);
            return {status: 'signedOut', saved: false, offerBrowserLogin: false};
        }
        return {status: 'ready', saved: false, offerBrowserLogin: true};
    }

    /**
     * A browser login is offerable when it is present, different from the saved key, and accepted by Bunpro.
     * A failed check does not reject the saved key.
     * @param {string} savedToken
     * @returns {Promise<boolean>}
     */
    async _browserLoginIsUsable(savedToken) {
        try {
            if (!(await this._ports.hasCookiesPermission())) { return false; }
            const cookie = blankToNull(await this._ports.readCookie());
            if (cookie === null || cookie === savedToken || cookie === this._rejectedCookie) { return false; }
            return await this._probe(cookie);
        } catch {
            return false;
        }
    }

    /**
     * @param {string} token
     * @returns {Promise<boolean>}
     */
    async _probe(token) {
        const response = await this._ports.fetch(`${API_BASE}${USER_PATH}`, {
            method: 'GET',
            credentials: 'omit',
            signal: searchSignal(this._ports),
            headers: {
                Accept: 'application/json',
                Authorization: `Token token=${token}`,
            },
        });
        if (response.status === 401) { return false; }
        if (!response.ok) {
            throw new Error(`Bunpro responded with HTTP status ${response.status}`);
        }
        return true;
    }

    /**
     * @param {string} token
     */
    async _storeToken(token) {
        const previous = blankToNull(await this._ports.readStoredToken());
        await this._ports.writeStoredToken(token);
        if (previous !== token) { this._forget(); }
        if (this._rejectedCookie === token) { this._rejectedCookie = null; }
    }

    /**
     * @param {string} token
     */
    async _rejectToken(token) {
        this._rejectedCookie = token;
        const stored = blankToNull(await this._ports.readStoredToken());
        if (stored === token) { await this._ports.writeStoredToken(null); }
        this._forget();
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
 * @param {import('bunpro').ClientPorts} ports
 * @returns {AbortSignal}
 */
function searchSignal(ports) {
    const timeoutMs = typeof ports.searchTimeoutMs === 'number' ? ports.searchTimeoutMs : SEARCH_TIMEOUT_MS;
    return AbortSignal.timeout(timeoutMs);
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
 * @returns {ExtensionError}
 */
function rejectedKeyError() {
    const error = new ExtensionError('Bunpro rejected this key.');
    error.data = {code: SIGNED_OUT_ERROR_CODE};
    return error;
}

/**
 * @param {?string} value
 * @returns {?string}
 */
function blankToNull(value) {
    return typeof value === 'string' && value !== '' ? value : null;
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
        readStoredToken: readStoredToken,
        writeStoredToken: writeStoredToken,
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
function readStoredToken() {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get([TOKEN_STORAGE_KEY], (store) => {
            const e = chrome.runtime.lastError;
            if (e) {
                reject(new Error(e.message));
            } else {
                const value = store[TOKEN_STORAGE_KEY];
                resolve(typeof value === 'string' && value !== '' ? value : null);
            }
        });
    });
}

/**
 * @param {?string} token
 * @returns {Promise<void>}
 */
function writeStoredToken(token) {
    return new Promise((resolve, reject) => {
        /**
         * @returns {void}
         */
        const finish = () => {
            const e = chrome.runtime.lastError;
            if (e) {
                reject(new Error(e.message));
            } else {
                resolve();
            }
        };
        if (token === null) {
            chrome.storage.local.remove(TOKEN_STORAGE_KEY, finish);
        } else {
            chrome.storage.local.set({[TOKEN_STORAGE_KEY]: token}, finish);
        }
    });
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
