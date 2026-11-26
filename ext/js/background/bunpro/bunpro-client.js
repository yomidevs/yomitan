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
import {SIGNED_OUT_ERROR_CODE, isSignedOutError, itemKey, queryKey} from './bunpro-match.js';
import {ADD_PATH, API_BASE, HYDRATE_PATH, IMPORT_SEARCH_CHUNK, IMPORT_SEARCH_PATH, USER_PATH, addBody, completeReviewIds, hydrateBody, importSearchBody, isInReviews, parseImportSearchResponse, parseStudyMode, removeBody, reviewedItemKeys, vocabPath} from './bunpro-protocol.js';

const TOKEN_STORAGE_KEY = 'bunproApiToken';
/** A frontend login cookie saved by older builds. It is not an API key, so it is deleted rather than sent. */
const LEGACY_COOKIE_TOKEN_KEY = 'bunproFrontendToken';
const API_KEY_AUTH_QUERY = 'dangerously_authenticate_using_api_token=true';
const SEARCH_TIMEOUT_MS = 8000;

/**
 * The API key is the user's Bunpro credential, so only the background page may hold it.
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
        this._rejectedToken = null;
        /** Credential last used for cached lookups; cleared when it changes. */
        /** @type {?string} */
        this._sessionToken = null;
        /** @type {Map<string, ?import('bunpro').ItemKey>} */
        this._resolutions = new Map();
        /** @type {Map<import('bunpro').ItemKey, import('bunpro').BunproMatch>} */
        this._items = new Map();
        /**
         * Items whose `inReviews` came from Bunpro (hydrate, add, remove). Import/search
         * only resolves ids, so its `inReviews: false` is a placeholder and does not count.
         * @type {Set<import('bunpro').ItemKey>}
         */
        this._reviewStateKnown = new Set();
        /** @type {Map<import('bunpro').ItemKey, Promise<import('bunpro').BunproMatch>>} */
        this._adds = new Map();
        /** @type {Map<import('bunpro').ItemKey, Promise<import('bunpro').BunproMatch>>} */
        this._removes = new Map();
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
     * The active Bunpro credential, for an explicit settings reveal only.
     * @returns {Promise<?string>}
     */
    async getSessionToken() {
        const session = await this._getSession();
        return session.status === 'ready' ? session.token : null;
    }

    /**
     * Validates the saved API key before the settings page reports a connection.
     * @returns {Promise<import('bunpro').BunproAuthorization>}
     */
    async getAuthorization() {
        const stored = blankToNull(await this._ports.readStoredToken());
        const savedToken = stored !== null && stored !== this._rejectedToken ? stored : null;
        if (!this._enabled) {
            return authorization('disabled', {saved: savedToken !== null});
        }
        if (savedToken === null) { return authorization('signedOut'); }
        if (await this._probe(savedToken)) {
            return authorization('ready', {saved: true, token: savedToken});
        }
        await this._rejectToken(savedToken);
        return authorization('signedOut');
    }

    /**
     * @param {string} token
     * @returns {Promise<import('bunpro').BunproAuthorization>}
     */
    async saveToken(token) {
        const value = token.trim();
        if (value === '') { throw new ExtensionError('Enter a Bunpro API key.'); }
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
     * Resolves queries to Bunpro ids/slugs/levels via import/search. Does not hydrate review state.
     * @param {import('bunpro').BunproQuery[]} queries
     * @returns {Promise<import('bunpro').BunproLookup>}
     */
    async findMatches(queries) {
        const session = await this._getSession();
        if (session.status !== 'ready') { return {status: session.status}; }

        const unresolved = [...new Map(queries.map((query) => [queryKey(query), query])).values()]
            .filter((query) => !this._resolutions.has(queryKey(query)));
        try {
            await this._resolveQueries(session.token, unresolved);
        } catch (e) {
            if (isSignedOutError(e)) { return {status: 'signedOut'}; }
            throw e;
        }
        return {status: 'ready', matches: queries.map((query) => this._lookup(query))};
    }

    /**
     * One hydrate for every match; returns the same matches with `inReviews` updated.
     * @param {import('bunpro').BunproMatch[]} matches
     * @returns {Promise<import('bunpro').BunproMatch[]>}
     */
    async hydrateMatches(matches) {
        const session = await this._getSession();
        if (session.status !== 'ready') {
            throw createNotReadyError(session.status);
        }
        if (matches.length === 0) { return []; }

        const unique = [...new Map(matches.map((match) => [itemKey(match), match])).values()];
        const payload = await this._request(session.token, HYDRATE_PATH, 'POST', hydrateBody(unique));
        const reviewed = reviewedItemKeys(payload);
        for (const match of unique) {
            this._rememberReviewState({...match, inReviews: reviewed.has(itemKey(match))});
        }
        return matches.map((match) => this._items.get(itemKey(match)) ?? match);
    }

    /**
     * Loads study questions for one vocab and remembers cloze / sentences / translation.
     * @param {import('bunpro').BunproMatch} match
     * @returns {Promise<import('bunpro').BunproMatch>}
     */
    async classifyStudyMode(match) {
        const key = itemKey(match);
        const known = this._items.get(key);
        if (typeof known !== 'undefined' && (known.studyMode === 'cloze' || known.studyMode === 'sentences' || known.studyMode === 'translation')) {
            return known;
        }
        const session = await this._getSession();
        if (session.status !== 'ready') {
            throw createNotReadyError(session.status);
        }
        try {
            const payload = await this._get(session.token, vocabPath(match.id));
            const studyMode = payload === null ? 'translation' : parseStudyMode(payload);
            const base = typeof known !== 'undefined' ? known : match;
            return this._remember({...base, studyMode});
        } catch (e) {
            if (isSignedOutError(e)) { throw e; }
            const base = typeof known !== 'undefined' ? known : match;
            return this._remember({...base, studyMode: 'translation'});
        }
    }

    /**
     * Safe to repeat: an item already in reviews, or already being added, is not sent again.
     * @param {import('bunpro').BunproMatch} match
     * @returns {Promise<import('bunpro').BunproMatch>}
     */
    add(match) {
        const key = itemKey(match);
        const known = this._knownReviewState(key);
        if (known !== null && known.inReviews) { return Promise.resolve(known); }
        const pending = this._adds.get(key);
        if (typeof pending !== 'undefined') { return pending; }

        const promise = this._addOnce(match).finally(() => this._adds.delete(key));
        this._adds.set(key, promise);
        return promise;
    }

    /**
     * Safe to repeat: an item already out of reviews, or already being removed, is not sent again.
     * @param {import('bunpro').BunproMatch} match
     * @returns {Promise<import('bunpro').BunproMatch>}
     */
    remove(match) {
        const key = itemKey(match);
        const known = this._knownReviewState(key);
        if (known !== null && !known.inReviews) { return Promise.resolve(known); }
        const pending = this._removes.get(key);
        if (typeof pending !== 'undefined') { return pending; }

        const promise = this._removeOnce(match).finally(() => this._removes.delete(key));
        this._removes.set(key, promise);
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
        const {token} = session;

        if (this._knownReviewState(itemKey(match)) === null) {
            const current = await this._withReviewState(token, match);
            if (current.inReviews) { return current; }
        }

        try {
            await this._request(token, ADD_PATH, 'PATCH', addBody(match));
        } catch (e) {
            if (isSignedOutError(e)) { throw e; }
            // The add may have landed even though the response failed.
            const current = await this._withReviewState(token, match).catch(() => null);
            if (current !== null && current.inReviews) { return current; }
            throw e;
        }
        return this._rememberReviewState({...match, inReviews: true});
    }

    /**
     * @param {import('bunpro').BunproMatch} match
     * @returns {Promise<import('bunpro').BunproMatch>}
     */
    async _removeOnce(match) {
        const session = await this._getSession();
        if (session.status !== 'ready') { throw createNotReadyError(session.status); }
        const {token} = session;

        // Bunpro remove needs the review row ids from hydrate; reviewables alone is a no-op.
        const hydrate = await this._request(token, HYDRATE_PATH, 'POST', hydrateBody(match));
        const reviewIds = completeReviewIds(hydrate);
        if (reviewIds.length === 0) {
            return this._rememberReviewState({...match, inReviews: false});
        }

        try {
            await this._request(token, ADD_PATH, 'PATCH', removeBody(match, reviewIds));
        } catch (e) {
            if (isSignedOutError(e)) { throw e; }
            // The remove may have landed even though the response failed.
            const current = await this._withReviewState(token, match).catch(() => null);
            if (current !== null && !current.inReviews) { return current; }
            throw e;
        }
        return this._rememberReviewState({...match, inReviews: false});
    }

    /**
     * Partition by JMdict id, import/search each mode in chunks of 30, remember hits without hydrating.
     * A failed batch is not remembered, so the next lookup can try again.
     * @param {string} token
     * @param {import('bunpro').BunproQuery[]} queries
     */
    async _resolveQueries(token, queries) {
        if (queries.length === 0) { return; }
        const withId = queries.filter((query) => typeof query.jmdictId === 'number' && query.jmdictId > 0);
        const withoutId = queries.filter((query) => typeof query.jmdictId !== 'number' || query.jmdictId <= 0);
        await this._importSearchPartition(token, withId, true);
        // Bunpro's JMdict map can miss a sequenced headword that still exists under the Japanese spelling.
        const jmdictMisses = withId.filter((query) => this._resolutions.get(queryKey(query)) === null);
        await this._importSearchPartition(token, [...withoutId, ...jmdictMisses], false);
    }

    /**
     * @param {string} token
     * @param {import('bunpro').BunproQuery[]} queries
     * @param {boolean} isJmdictMode
     */
    async _importSearchPartition(token, queries, isJmdictMode) {
        for (let offset = 0; offset < queries.length; offset += IMPORT_SEARCH_CHUNK) {
            const chunk = queries.slice(offset, offset + IMPORT_SEARCH_CHUNK);
            try {
                const payload = await this._request(token, IMPORT_SEARCH_PATH, 'POST', importSearchBody(chunk, isJmdictMode));
                const matches = parseImportSearchResponse(payload, chunk, isJmdictMode);
                for (let i = 0; i < chunk.length; i++) {
                    this._rememberResolution(chunk[i], matches[i] ?? null);
                }
            } catch (e) {
                if (isSignedOutError(e)) { throw e; }
                // Soft failure: leave unresolved so a later call can retry.
            }
        }
    }

    /**
     * @param {import('bunpro').BunproQuery} query
     * @param {?import('bunpro').BunproMatch} match
     */
    _rememberResolution(query, match) {
        if (match === null) {
            this._resolutions.set(queryKey(query), null);
            return;
        }
        const known = this._items.get(itemKey(match));
        const remembered = this._remember({
            ...match,
            inReviews: typeof known !== 'undefined' ? known.inReviews : false,
        });
        this._resolutions.set(queryKey(query), itemKey(remembered));
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
     * @param {string} token
     * @param {import('bunpro').BunproMatch} match
     * @returns {Promise<import('bunpro').BunproMatch>}
     */
    async _withReviewState(token, match) {
        const payload = await this._request(token, HYDRATE_PATH, 'POST', hydrateBody(match));
        return this._rememberReviewState({...match, inReviews: isInReviews(payload)});
    }

    /**
     * @param {string} token
     * @param {string} path
     * @returns {Promise<unknown>}
     * @throws {Error}
     */
    async _get(token, path) {
        const response = await this._send(token, path, 'GET');
        if (response.status === 404 || response.status === 500) { return null; }
        if (!response.ok) {
            throw new Error(`Bunpro responded with HTTP status ${response.status}`);
        }
        return await readResponseJson(response);
    }

    /**
     * @param {string} token
     * @param {string} path
     * @param {'POST'|'PATCH'} method
     * @param {import('core').SerializableObject} body
     * @returns {Promise<unknown>}
     * @throws {Error}
     */
    async _request(token, path, method, body) {
        const response = await this._send(token, path, method, body);
        if (!response.ok) {
            throw new Error(`Bunpro responded with HTTP status ${response.status}`);
        }
        return await readResponseJson(response);
    }

    /**
     * @param {string} token
     * @param {string} path
     * @param {'GET'|'POST'|'PATCH'} method
     * @param {import('core').SerializableObject} [body]
     * @returns {Promise<Response>}
     * @throws {Error}
     */
    async _send(token, path, method, body) {
        /** @type {Record<string, string>} */
        const headers = {
            Accept: 'application/json',
            Authorization: `Token token=${token}`,
        };
        if (typeof body !== 'undefined') { headers['Content-Type'] = 'application/json'; }
        const response = await this._ports.fetch(requestUrl(path), {
            method,
            credentials: 'omit',
            signal: searchSignal(this._ports),
            headers,
            body: typeof body === 'undefined' ? void 0 : JSON.stringify(body),
        });
        if (response.status === 401) {
            await this._rejectToken(token);
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
        if (saved === null || saved === this._rejectedToken) { return {status: 'signedOut'}; }
        this._adoptCredential(saved);
        return {status: 'ready', token: saved};
    }

    /**
     * Drop caches built under a different Bunpro API key.
     * @param {string} token
     */
    _adoptCredential(token) {
        if (this._sessionToken === token) { return; }
        this._forget();
        this._sessionToken = token;
    }

    /**
     * @param {string} token
     * @returns {Promise<boolean>}
     */
    async _probe(token) {
        const response = await this._ports.fetch(requestUrl(USER_PATH), {
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
        if (this._rejectedToken === token) { this._rejectedToken = null; }
    }

    /**
     * @param {string} token
     */
    async _rejectToken(token) {
        this._rejectedToken = token;
        const stored = blankToNull(await this._ports.readStoredToken());
        if (stored === token) { await this._ports.writeStoredToken(null); }
        this._forget();
    }

    /**
     * @param {import('bunpro').BunproMatch} match
     * @returns {import('bunpro').BunproMatch}
     */
    _remember(match) {
        const key = itemKey(match);
        const previous = this._items.get(key);
        const studyMode = (
            match.studyMode === 'cloze' || match.studyMode === 'sentences' || match.studyMode === 'translation' ?
            match.studyMode :
            (typeof previous !== 'undefined' ? previous.studyMode : null)
        );
        const remembered = {...match, studyMode: studyMode ?? null};
        this._items.set(key, remembered);
        return remembered;
    }

    /**
     * @param {import('bunpro').BunproMatch} match
     * @returns {import('bunpro').BunproMatch}
     */
    _rememberReviewState(match) {
        this._reviewStateKnown.add(itemKey(match));
        return this._remember(match);
    }

    /**
     * @param {import('bunpro').ItemKey} key
     * @returns {?import('bunpro').BunproMatch}
     */
    _knownReviewState(key) {
        if (!this._reviewStateKnown.has(key)) { return null; }
        return this._items.get(key) ?? null;
    }

    /** */
    _forget() {
        this._resolutions.clear();
        this._items.clear();
        this._reviewStateKnown.clear();
        this._sessionToken = null;
    }
}

/**
 * @param {import('bunpro').ClientPorts} ports
 * @returns {AbortSignal}
 */
function searchSignal(ports) {
    const timeoutMs = typeof ports.searchTimeoutMs === 'number' ? ports.searchTimeoutMs : SEARCH_TIMEOUT_MS;
    if (typeof AbortSignal.timeout === 'function') {
        return AbortSignal.timeout(timeoutMs);
    }
    const controller = new AbortController();
    setTimeout(() => controller.abort(), timeoutMs);
    return controller.signal;
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
    const error = new ExtensionError('Bunpro rejected this API key.');
    error.data = {code: SIGNED_OUT_ERROR_CODE};
    return error;
}

/**
 * The Settings API key is only accepted on the frontend routes with this flag.
 * @param {string} path
 * @returns {string}
 */
function requestUrl(path) {
    const joiner = path.includes('?') ? '&' : '?';
    return `${API_BASE}${path}${joiner}${API_KEY_AUTH_QUERY}`;
}

/**
 * @param {import('bunpro').BunproStatus} status
 * @param {{saved?: boolean, token?: ?string}} [details]
 * @returns {import('bunpro').BunproAuthorization}
 */
function authorization(status, {saved = false, token = null} = {}) {
    return {
        status,
        saved,
        tokenLength: token === null ? null : token.length,
    };
}

/**
 * @param {?string} value
 * @returns {?string}
 */
function blankToNull(value) {
    return typeof value === 'string' && value !== '' ? value : null;
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
        readStoredToken: readStoredToken,
        writeStoredToken: writeStoredToken,
    };
}

/**
 * @returns {Promise<?string>}
 */
function readStoredToken() {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get([TOKEN_STORAGE_KEY, LEGACY_COOKIE_TOKEN_KEY], (store) => {
            const e = chrome.runtime.lastError;
            if (e) {
                reject(new Error(e.message));
                return;
            }
            if (typeof store[LEGACY_COOKIE_TOKEN_KEY] === 'string') {
                void chrome.storage.local.remove(LEGACY_COOKIE_TOKEN_KEY);
            }
            const value = store[TOKEN_STORAGE_KEY];
            resolve(typeof value === 'string' && value !== '' ? value : null);
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
