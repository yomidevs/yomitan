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

import {describe, expect, test} from 'vitest';
import {itemKey} from '../ext/js/background/bunpro/bunpro-match.js';
import {getControlView} from '../ext/js/display/bunpro-control-view.js';

/**
 * @param {Partial<Omit<import('bunpro').BunproMatch, 'id'>> & {id?: number}} fields
 * @returns {import('bunpro').BunproMatch}
 */
function createMatch(fields = {}) {
    return /** @type {import('bunpro').BunproMatch} */ ({id: 101, kind: 'vocab', written: '食べる', reading: 'たべる', level: 'N3', inReviews: false, ...fields});
}

/**
 * One entry with the given match, or with no match when it is null.
 * @param {?import('bunpro').BunproMatch} match
 * @param {?import('display-bunpro').AddAttempt} [attempt]
 * @returns {import('display-bunpro').State}
 */
function createReadyState(match, attempt = null) {
    /** @type {Map<import('bunpro').ItemKey, import('bunpro').BunproMatch>} */
    const items = new Map();
    /** @type {Map<import('bunpro').ItemKey, import('display-bunpro').AddAttempt>} */
    const attempts = new Map();
    if (match === null) { return {phase: 'ready', entryItems: [null], items, attempts}; }
    const key = itemKey(match);
    items.set(key, match);
    if (attempt !== null) { attempts.set(key, attempt); }
    return {phase: 'ready', entryItems: [key], items, attempts};
}

describe('getControlView', () => {
    test('a pending lookup reserves space for terms only', () => {
        const state = /** @type {import('display-bunpro').State} */ ({phase: 'loading', entryQueries: [{term: '食べる', reading: 'たべる'}, null]});
        expect(getControlView(state, 0)).toStrictEqual({kind: 'reserved'});
        expect(getControlView(state, 1)).toStrictEqual({kind: 'none'});
    });

    test('a ready entry still waiting on its lookup reserves space', () => {
        const state = createReadyState(null);
        state.pending = [true];
        expect(getControlView(state, 0)).toStrictEqual({kind: 'reserved'});
    });

    test('an absent match renders nothing', () => {
        expect(getControlView(createReadyState(null), 0)).toStrictEqual({kind: 'none'});
    });

    test('a match not in reviews offers a plus and links to its vocab page', () => {
        expect(getControlView(createReadyState(createMatch()), 0)).toStrictEqual({
            kind: 'button',
            mark: 'plus',
            busy: false,
            level: 'N3',
            statusTitle: 'Add to Bunpro reviews',
            href: 'https://bunpro.jp/vocabs/%E9%A3%9F%E3%81%B9%E3%82%8B',
        });
    });

    test('an add in progress keeps the plus and the page link', () => {
        expect(getControlView(createReadyState(createMatch(), {state: 'adding'}), 0)).toStrictEqual({
            kind: 'button',
            mark: 'plus',
            busy: true,
            level: 'N3',
            statusTitle: 'Adding to Bunpro reviews',
            href: 'https://bunpro.jp/vocabs/%E9%A3%9F%E3%81%B9%E3%82%8B',
        });
    });

    test('a failed add shows the error on the plus', () => {
        expect(getControlView(createReadyState(createMatch(), {state: 'failed', error: 'Bunpro responded with HTTP status 502'}), 0)).toStrictEqual({
            kind: 'button',
            mark: 'plus',
            busy: false,
            level: 'N3',
            statusTitle: 'Bunpro responded with HTTP status 502',
            href: 'https://bunpro.jp/vocabs/%E9%A3%9F%E3%81%B9%E3%82%8B',
        });
    });

    test('a match in reviews shows a check and still links to its page', () => {
        const done = {
            kind: 'button',
            mark: 'check',
            busy: false,
            level: 'N3',
            statusTitle: 'In your Bunpro reviews',
            href: 'https://bunpro.jp/vocabs/%E9%A3%9F%E3%81%B9%E3%82%8B',
        };
        expect(getControlView(createReadyState(createMatch({inReviews: true})), 0)).toStrictEqual(done);
        expect(getControlView(createReadyState(createMatch({inReviews: true}), {state: 'failed', error: 'stale'}), 0)).toStrictEqual(done);
    });

    test('a match without a level still links to the vocab page', () => {
        expect(getControlView(createReadyState(createMatch({level: null})), 0)).toStrictEqual({
            kind: 'button',
            mark: 'plus',
            busy: false,
            level: null,
            statusTitle: 'Add to Bunpro reviews',
            href: 'https://bunpro.jp/vocabs/%E9%A3%9F%E3%81%B9%E3%82%8B',
        });
    });

    test('signed out, other unavailable states, and off render no per-entry control', () => {
        expect(getControlView({phase: 'unavailable', reason: 'signedOut'}, 0)).toStrictEqual({kind: 'none'});
        expect(getControlView({phase: 'unavailable', reason: 'error'}, 0)).toStrictEqual({kind: 'none'});
        expect(getControlView({phase: 'off'}, 0)).toStrictEqual({kind: 'none'});
    });
});
