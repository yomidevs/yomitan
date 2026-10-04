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

import {isSignedOutError, itemKey, queryKey} from '../background/bunpro/bunpro-match.js';
import {EventListenerCollection} from '../core/event-listener-collection.js';
import {log} from '../core/log.js';
import {toError} from '../core/to-error.js';
import {getPrimaryHeadword} from '../dictionary/dictionary-data-util.js';
import {getControlView} from './bunpro-control-view.js';

export class DisplayBunpro {
    /**
     * @param {import('./display.js').Display} display
     */
    constructor(display) {
        /** @type {import('./display.js').Display} */
        this._display = display;
        /** @type {import('display-bunpro').State} */
        this._state = {phase: 'off'};
        /** @type {EventListenerCollection} */
        this._eventListeners = new EventListenerCollection();
        /** @type {(event: MouseEvent) => void} */
        this._onAddButtonClickBind = this._onAddButtonClick.bind(this);
        /** @type {(event: MouseEvent) => void} */
        this._onOpenClickBind = this._onOpenClick.bind(this);
        /** @type {?symbol} */
        this._generation = null;
    }

    /** */
    prepare() {
        this._display.on('contentClear', this._onContentClear.bind(this));
        this._display.on('contentUpdateComplete', this._onContentUpdateComplete.bind(this));
    }

    // Private

    /** */
    _onContentClear() {
        this._generation = null;
        this._eventListeners.removeAllEventListeners();
        this._state = {phase: 'off'};
    }

    /**
     * Levels appear from the top definition downward. A later search does not hold the ones above it.
     */
    async _onContentUpdateComplete() {
        const options = this._display.getOptions();
        if (options === null || !options.bunpro.enable) {
            this._generation = null;
            this._setState({phase: 'off'});
            return;
        }
        const entryQueries = this._display.dictionaryEntries.map(getBunproQuery);
        const generation = Symbol();
        this._generation = generation;
        const state = createPendingState(entryQueries);
        this._setState(state);
        await this._settleFromTheTop(generation, state, entryQueries);
    }

    /**
     * @param {symbol} generation
     * @param {Extract<import('display-bunpro').State, {phase: 'ready'}>} state
     * @param {(import('bunpro').BunproQuery | null)[]} entryQueries
     */
    async _settleFromTheTop(generation, state, entryQueries) {
        const queries = uniqueQueries(entryQueries);
        /** @type {Map<number, import('bunpro').BunproMatch | null>} */
        const arrived = new Map();
        let next = 0;

        /**
         * @param {number} index
         * @param {import('bunpro').BunproMatch | null} match
         */
        const publish = (index, match) => {
            if (this._generation !== generation) { return; }
            arrived.set(index, match);
            while (arrived.has(next)) {
                const settled = /** @type {import('bunpro').BunproMatch | null} */ (arrived.get(next));
                arrived.delete(next);
                applyQuery(state, entryQueries, queries[next], settled);
                next += 1;
                this._render();
            }
        };

        await runFromTheTop(queries, async (query, index) => {
            if (this._generation !== generation) { return; }
            /** @type {import('bunpro').BunproLookup} */
            let lookup;
            try {
                lookup = await this._display.application.api.findBunproMatches([query]);
            } catch (e) {
                log.error(e);
                publish(index, null);
                return;
            }
            if (lookup.status !== 'ready') {
                if (this._generation === generation) {
                    this._generation = null;
                    this._setState({phase: 'unavailable', reason: lookup.status});
                }
                return;
            }
            publish(index, lookup.matches[0] ?? null);
        });
    }

    /**
     * @param {MouseEvent} e
     */
    _onAddButtonClick(e) {
        e.preventDefault();
        const button = /** @type {HTMLButtonElement} */ (e.currentTarget);
        const index = this._display.getElementDictionaryEntryIndex(button);
        void this._addEntry(index);
    }

    /**
     * @param {MouseEvent} e
     */
    _onOpenClick(e) {
        e.preventDefault();
        const button = /** @type {HTMLButtonElement} */ (e.currentTarget);
        openBunproPage(button.dataset.href ?? '');
    }

    /**
     * @param {number} entryIndex
     */
    async _addEntry(entryIndex) {
        const state = this._state;
        if (state.phase !== 'ready') { return; }
        const key = state.entryItems[entryIndex] ?? null;
        const match = key === null ? void 0 : state.items.get(key);
        if (key === null || typeof match === 'undefined' || match.inReviews) { return; }

        state.attempts.set(key, {state: 'adding'});
        this._render();
        try {
            state.items.set(key, await this._display.application.api.addToBunpro(match));
            state.attempts.delete(key);
        } catch (e) {
            if (isSignedOutError(e)) {
                if (this._state === state) { this._setState({phase: 'unavailable', reason: 'signedOut'}); }
                return;
            }
            state.attempts.set(key, {state: 'failed', error: toError(e).message});
        }
        if (this._state === state) { this._render(); }
    }

    /**
     * @param {import('display-bunpro').State} state
     */
    _setState(state) {
        this._state = state;
        this._render();
    }

    /** */
    _render() {
        this._eventListeners.removeAllEventListeners();
        const entries = this._display.dictionaryEntryNodes;
        for (let i = 0, ii = entries.length; i < ii; ++i) {
            const container = entries[i].querySelector('.bunpro-actions-container');
            if (container === null) { continue; }
            container.textContent = '';
            const control = this._createControl(getControlView(this._state, i));
            if (control !== null) { container.appendChild(control); }
        }
    }

    /**
     * @param {import('display-bunpro').ControlView} view
     * @returns {?HTMLElement}
     */
    _createControl(view) {
        if (view.kind === 'none') { return null; }
        const control = this._display.displayGenerator.instantiateTemplate('bunpro-button');
        if (view.kind === 'reserved') {
            control.dataset.reserved = 'true';
            return control;
        }
        const status = /** @type {HTMLButtonElement} */ (control.querySelector('.bunpro-status'));
        const added = control.querySelector('.bunpro-added');
        const open = /** @type {HTMLButtonElement} */ (control.querySelector('.bunpro-open'));
        const level = control.querySelector('.bunpro-button-level');
        if (level !== null) {
            level.hidden = view.level === null;
            level.textContent = view.level ?? '';
        }
        status.hidden = view.mark === 'check';
        if (added !== null) {
            added.hidden = view.mark !== 'check';
            added.title = view.mark === 'check' ? view.statusTitle : '';
        }
        if (view.mark === 'plus') {
            status.title = view.statusTitle;
            status.setAttribute('aria-label', view.statusTitle);
            status.disabled = view.busy;
            if (!view.busy) {
                this._eventListeners.addEventListener(status, 'click', this._onAddButtonClickBind);
            }
        }
        open.dataset.href = view.href;
        open.title = 'Open in Bunpro';
        open.setAttribute('aria-label', 'Open in Bunpro');
        this._eventListeners.addEventListener(open, 'click', this._onOpenClickBind);
        return control;
    }
}

/**
 * @param {string} url
 */
function openBunproPage(url) {
    if (url === '') { return; }
    if (typeof chrome !== 'undefined' && chrome.tabs && typeof chrome.tabs.create === 'function') {
        void chrome.tabs.create({url});
        return;
    }
    window.open(url, '_blank');
}

/**
 * @param {import('dictionary').DictionaryEntry} dictionaryEntry
 * @returns {?import('bunpro').BunproQuery}
 */
function getBunproQuery(dictionaryEntry) {
    const headword = getPrimaryHeadword(dictionaryEntry);
    return headword.type === 'term' ? {term: headword.term, reading: headword.reading} : null;
}

/**
 * @param {(import('bunpro').BunproQuery | null)[]} entryQueries
 * @returns {Extract<import('display-bunpro').State, {phase: 'ready'}>}
 */
function createPendingState(entryQueries) {
    return {
        phase: 'ready',
        entryItems: entryQueries.map(() => null),
        items: new Map(),
        attempts: new Map(),
        pending: entryQueries.map((query) => query !== null),
    };
}

/**
 * @param {(import('bunpro').BunproQuery | null)[]} entryQueries
 * @returns {import('bunpro').BunproQuery[]}
 */
function uniqueQueries(entryQueries) {
    /** @type {import('bunpro').BunproQuery[]} */
    const queries = [];
    const seen = new Set();
    for (const query of entryQueries) {
        if (query === null) { continue; }
        const key = queryKey(query);
        if (seen.has(key)) { continue; }
        seen.add(key);
        queries.push(query);
    }
    return queries;
}

/**
 * @param {Extract<import('display-bunpro').State, {phase: 'ready'}>} state
 * @param {(import('bunpro').BunproQuery | null)[]} entryQueries
 * @param {import('bunpro').BunproQuery} query
 * @param {?import('bunpro').BunproMatch} match
 */
function applyQuery(state, entryQueries, query, match) {
    const key = queryKey(query);
    const pending = state.pending ?? [];
    for (let i = 0; i < entryQueries.length; i++) {
        const entryQuery = entryQueries[i];
        if (entryQuery === null || queryKey(entryQuery) !== key) { continue; }
        pending[i] = false;
        if (match === null) {
            state.entryItems[i] = null;
            continue;
        }
        const item = itemKey(match);
        state.items.set(item, match);
        state.entryItems[i] = item;
    }
}

/**
 * Starts at the top query and keeps a few searches running. Results are published by the caller in order.
 * @template T
 * @param {T[]} items
 * @param {(item: T, index: number) => Promise<void>} run
 */
async function runFromTheTop(items, run) {
    const limit = 4;
    let cursor = 0;
    const worker = async () => {
        while (cursor < items.length) {
            const index = cursor;
            cursor += 1;
            await run(items[index], index);
        }
    };
    await Promise.all(Array.from({length: Math.min(limit, items.length)}, worker));
}
