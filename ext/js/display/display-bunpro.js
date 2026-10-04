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

import {isSignedOutError, itemKey} from '../background/bunpro/bunpro-match.js';
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
    }

    /** */
    prepare() {
        this._display.on('contentClear', this._onContentClear.bind(this));
        this._display.on('contentUpdateComplete', this._onContentUpdateComplete.bind(this));
    }

    // Private

    /** */
    _onContentClear() {
        this._eventListeners.removeAllEventListeners();
        this._state = {phase: 'off'};
    }

    /** */
    async _onContentUpdateComplete() {
        const options = this._display.getOptions();
        if (options === null || !options.bunpro.enable) {
            this._setState({phase: 'off'});
            return;
        }
        const entryQueries = this._display.dictionaryEntries.map(getBunproQuery);
        /** @type {import('display-bunpro').State} */
        const loading = {phase: 'loading', entryQueries};
        this._setState(loading);
        const nextState = await this._lookUp(entryQueries);
        if (this._state === loading) { this._setState(nextState); }
    }

    /**
     * @param {(import('bunpro').BunproQuery | null)[]} entryQueries
     * @returns {Promise<import('display-bunpro').State>}
     */
    async _lookUp(entryQueries) {
        /** @type {import('bunpro').BunproQuery[]} */
        const queries = [];
        for (const query of entryQueries) {
            if (query !== null) { queries.push(query); }
        }

        /** @type {import('bunpro').BunproLookup} */
        let lookup;
        try {
            lookup = await this._display.application.api.findBunproMatches(queries);
        } catch (e) {
            log.error(e);
            return {phase: 'unavailable', reason: 'error'};
        }
        if (lookup.status !== 'ready') { return {phase: 'unavailable', reason: lookup.status}; }
        return createReadyState(entryQueries, lookup.matches);
    }

    /**
     * @param {MouseEvent} e
     */
    _onAddButtonClick(e) {
        e.preventDefault();
        const index = this._display.getElementDictionaryEntryIndex(/** @type {HTMLElement} */ (e.currentTarget));
        void this._addEntry(index);
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
            const button = this._createButton(getControlView(this._state, i));
            if (button !== null) { container.appendChild(button); }
        }
    }

    /**
     * @param {import('display-bunpro').ControlView} view
     * @returns {?HTMLButtonElement}
     */
    _createButton(view) {
        if (view.kind === 'none') { return null; }
        const button = /** @type {HTMLButtonElement} */ (this._display.displayGenerator.instantiateTemplate('bunpro-button'));
        if (view.kind === 'reserved') {
            button.dataset.reserved = 'true';
            button.disabled = true;
            button.textContent = '+';
            return button;
        }
        button.textContent = view.text;
        button.title = view.title;
        button.disabled = view.disabled;
        this._eventListeners.addEventListener(button, 'click', this._onAddButtonClickBind);
        return button;
    }
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
 * @param {(import('bunpro').BunproMatch | null)[]} matches One per non-null query, in order.
 * @returns {import('display-bunpro').State}
 */
function createReadyState(entryQueries, matches) {
    /** @type {Map<import('bunpro').ItemKey, import('bunpro').BunproMatch>} */
    const items = new Map();
    /** @type {(import('bunpro').ItemKey | null)[]} */
    const entryItems = [];
    let matchIndex = 0;
    for (const query of entryQueries) {
        const match = query === null ? null : (matches[matchIndex++] ?? null);
        if (match === null) {
            entryItems.push(null);
            continue;
        }
        const key = itemKey(match);
        items.set(key, match);
        entryItems.push(key);
    }
    return {phase: 'ready', entryItems, items, attempts: new Map()};
}
