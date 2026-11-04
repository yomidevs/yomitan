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
        this._onRemoveButtonClickBind = this._onRemoveButtonClick.bind(this);
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
        if (options === null || !options.bunpro.enable || options.general.language !== 'ja') {
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
     * Resolve every unique query in one import/search wave, paint levels/links, then one hydrate for checks.
     * @param {symbol} generation
     * @param {Extract<import('display-bunpro').State, {phase: 'ready'}>} state
     * @param {(import('bunpro').BunproQuery | null)[]} entryQueries
     */
    async _settleFromTheTop(generation, state, entryQueries) {
        const queries = uniqueQueries(entryQueries);
        if (queries.length === 0) { return; }

        /** @type {import('bunpro').BunproLookup} */
        let lookup;
        try {
            lookup = await this._display.application.api.findBunproMatches(queries);
        } catch (e) {
            log.error(e);
            if (this._generation !== generation) { return; }
            for (const query of queries) {
                applyQuery(state, entryQueries, query, null);
            }
            this._render();
            return;
        }
        if (this._generation !== generation) { return; }
        if (lookup.status !== 'ready') {
            this._generation = null;
            this._setState({phase: 'unavailable', reason: lookup.status});
            return;
        }

        for (let i = 0; i < queries.length; i++) {
            applyQuery(state, entryQueries, queries[i], lookup.matches[i] ?? null);
        }
        this._render();

        /** @type {import('bunpro').BunproMatch[]} */
        const resolved = [];
        for (const match of lookup.matches) {
            if (match !== null) { resolved.push(match); }
        }
        if (resolved.length === 0) { return; }

        /** @type {import('bunpro').BunproMatch[]} */
        let hydrated;
        try {
            hydrated = await this._display.application.api.hydrateBunproMatches(resolved);
        } catch (e) {
            if (isSignedOutError(e)) {
                if (this._generation === generation) {
                    this._generation = null;
                    this._setState({phase: 'unavailable', reason: 'signedOut'});
                }
                return;
            }
            log.error(e);
            return;
        }
        if (this._generation !== generation || this._state !== state) { return; }
        for (const match of hydrated) {
            state.items.set(itemKey(match), match);
        }
        this._render();

        const colorStudyModes = this._display.getOptions()?.bunpro.colorStudyModes === true;
        if (!colorStudyModes) { return; }

        // After levels + reviews are visible, classify study mode one-by-one and paint as each returns.
        for (const match of hydrated) {
            if (this._generation !== generation || this._state !== state) { return; }
            try {
                const classified = await this._display.application.api.classifyBunproStudyMode(match);
                if (this._generation !== generation || this._state !== state) { return; }
                state.items.set(itemKey(classified), classified);
                this._render();
                await yieldForPaint();
            } catch (e) {
                if (isSignedOutError(e)) {
                    if (this._generation === generation) {
                        this._generation = null;
                        this._setState({phase: 'unavailable', reason: 'signedOut'});
                    }
                    return;
                }
                log.error(e);
            }
        }
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
    _onRemoveButtonClick(e) {
        e.preventDefault();
        const button = /** @type {HTMLButtonElement} */ (e.currentTarget);
        const index = this._display.getElementDictionaryEntryIndex(button);
        void this._removeEntry(index);
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
     * @param {number} entryIndex
     */
    async _removeEntry(entryIndex) {
        const state = this._state;
        if (state.phase !== 'ready') { return; }
        const key = state.entryItems[entryIndex] ?? null;
        const match = key === null ? void 0 : state.items.get(key);
        if (key === null || typeof match === 'undefined' || !match.inReviews) { return; }

        state.attempts.set(key, {state: 'removing'});
        this._render();
        try {
            state.items.set(key, await this._display.application.api.removeFromBunpro(match));
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
        if (view.studyMode !== null) {
            control.dataset.studyMode = view.studyMode;
        }
        const status = /** @type {HTMLButtonElement} */ (control.querySelector('.bunpro-status'));
        const added = /** @type {HTMLButtonElement} */ (control.querySelector('.bunpro-added'));
        const open = /** @type {HTMLButtonElement} */ (control.querySelector('.bunpro-open'));
        const level = /** @type {?HTMLElement} */ (control.querySelector('.bunpro-button-level'));
        if (level !== null) {
            level.hidden = view.level === null;
            level.textContent = view.level ?? '';
        }
        status.hidden = view.mark === 'check';
        added.hidden = view.mark !== 'check';
        if (view.mark === 'plus') {
            status.title = view.statusTitle;
            status.setAttribute('aria-label', view.statusTitle);
            status.disabled = view.busy;
            if (!view.busy) {
                this._eventListeners.addEventListener(status, 'click', this._onAddButtonClickBind);
            }
        } else {
            added.title = view.statusTitle;
            added.setAttribute('aria-label', view.statusTitle);
            added.disabled = view.busy;
            if (!view.busy) {
                this._eventListeners.addEventListener(added, 'click', this._onRemoveButtonClickBind);
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
 * Let the browser paint between sequential study-mode updates.
 * @returns {Promise<void>}
 */
function yieldForPaint() {
    return new Promise((resolve) => {
        if (typeof requestAnimationFrame !== 'function') {
            setTimeout(resolve, 0);
            return;
        }
        requestAnimationFrame(() => {
            requestAnimationFrame(() => resolve());
        });
    });
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
    if (headword.type !== 'term') { return null; }
    /** @type {import('bunpro').BunproQuery} */
    const query = {term: headword.term, reading: headword.reading};
    if (dictionaryEntry.type === 'term') {
        const jmdictId = termJmdictId(dictionaryEntry);
        if (jmdictId !== null) { query.jmdictId = jmdictId; }
    }
    return query;
}

/**
 * Positive shared JMdict sequence from the entry's definitions, or null.
 * Same rule as Anki's sequence helper: disagreeing or missing sequences yield no id.
 * @param {import('dictionary').TermDictionaryEntry} dictionaryEntry
 * @returns {?number}
 */
function termJmdictId(dictionaryEntry) {
    if (!dictionaryEntry.isPrimary) { return null; }
    let hasSequence = false;
    let mainSequence = -1;
    for (const {sequences} of dictionaryEntry.definitions) {
        const sequence = sequences[0];
        if (!hasSequence) {
            mainSequence = sequence;
            hasSequence = true;
            if (mainSequence === -1) { break; }
        } else if (mainSequence !== sequence) {
            mainSequence = -1;
            break;
        }
    }
    return mainSequence > 0 ? mainSequence : null;
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
