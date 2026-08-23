/*
 * Copyright (C) 2023-2026  Yomitan Authors
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

import {afterAll, describe, expect, test} from 'vitest';
import {KeyboardTextNavigator} from '../ext/js/language/keyboard-text-navigator.js';
import {setupDomTest} from './fixtures/dom-test.js';

const domTestEnv = await setupDomTest();

describe('KeyboardTextNavigator', () => {
    const {window, teardown} = domTestEnv;
    afterAll(() => teardown(global));

    /**
     * @param {string} text
     * @returns {HTMLElement}
     */
    function createContainer(text) {
        const {document} = window;
        const container = document.createElement('div');
        container.textContent = text;
        document.body.appendChild(container);
        return container;
    }

    test('probes forward across the container, skipping whitespace', () => {
        const container = createContainer('one two three');
        const navigator = new KeyboardTextNavigator();

        const first = navigator.getNextCandidate(container);
        expect(first).not.toBeNull();
        expect(first?.offset).toBe(0);
        expect(first?.range.toString()).toBe('one two three');
        navigator.reportSuccess(/** @type {number} */ (first?.offset), 3); // "one"

        const second = navigator.getNextCandidate(container);
        expect(second).not.toBeNull();
        expect(second?.offset).toBe(4); // skips the space after "one"
        expect(second?.range.toString()).toBe('two three');
        navigator.reportSuccess(/** @type {number} */ (second?.offset), 3); // "two"

        const third = navigator.getNextCandidate(container);
        expect(third).not.toBeNull();
        expect(third?.offset).toBe(8);
        navigator.reportSuccess(/** @type {number} */ (third?.offset), 5); // "three"

        expect(navigator.getNextCandidate(container)).toBeNull();
    });

    test('skips over failed candidates when probing forward', () => {
        const container = createContainer('xx ok');
        const navigator = new KeyboardTextNavigator();

        const first = navigator.getNextCandidate(container);
        expect(first?.offset).toBe(0);
        navigator.reportFailure(/** @type {number} */ (first?.offset));

        const second = navigator.getNextCandidate(container);
        expect(second?.offset).toBe(1);
        navigator.reportFailure(/** @type {number} */ (second?.offset));

        const third = navigator.getNextCandidate(container);
        expect(third?.offset).toBe(3); // skips the space, lands on "ok"
        expect(third?.range.toString()).toBe('ok');
    });

    test('replays history backward and forward without re-probing', () => {
        const container = createContainer('alpha beta');
        const navigator = new KeyboardTextNavigator();

        const first = navigator.getNextCandidate(container);
        navigator.reportSuccess(/** @type {number} */ (first?.offset), 5); // "alpha"

        const second = navigator.getNextCandidate(container);
        navigator.reportSuccess(/** @type {number} */ (second?.offset), 4); // "beta"

        const previous = navigator.getPrevious(container);
        expect(previous?.toString()).toBe('alpha beta');

        expect(navigator.getPrevious(container)).toBeNull(); // nothing earlier than the first entry

        const replay = navigator.getNextCandidate(container);
        expect(replay?.offset).toBe(6);
        expect(replay?.range.toString()).toBe('beta');
    });

    test('resets navigation state when the container element changes', () => {
        const containerA = createContainer('foo');
        const containerB = createContainer('bar');
        const navigator = new KeyboardTextNavigator();

        const first = navigator.getNextCandidate(containerA);
        navigator.reportSuccess(/** @type {number} */ (first?.offset), 3);
        expect(navigator.getPrevious(containerA)).toBeNull();

        const other = navigator.getNextCandidate(containerB);
        expect(other?.offset).toBe(0);
        expect(other?.range.toString()).toBe('bar');
    });

    test('drops a stale replayed offset instead of retrying it forever', () => {
        const container = createContainer('alpha beta');
        const navigator = new KeyboardTextNavigator();

        const first = navigator.getNextCandidate(container);
        navigator.reportSuccess(/** @type {number} */ (first?.offset), 5); // "alpha"
        const second = navigator.getNextCandidate(container);
        navigator.reportSuccess(/** @type {number} */ (second?.offset), 4); // "beta"

        navigator.getPrevious(container); // back to "alpha", historyIndex now points at offset 0

        // Next replays the recorded "beta" offset (6), but the caller reports it no
        // longer matches (e.g. the underlying text changed in a way that isn't detectable
        // via the container element reference alone).
        const replay = navigator.getNextCandidate(container);
        expect(replay?.offset).toBe(6);
        navigator.reportFailure(/** @type {number} */ (replay?.offset));

        // The stale entry must be dropped, not retried indefinitely; probing resumes
        // strictly after the failed offset.
        const resumed = navigator.getNextCandidate(container);
        expect(resumed).not.toBeNull();
        expect(resumed?.offset).toBe(7);
    });

    test('returns null when the container has no scannable text', () => {
        const container = createContainer('   ');
        const navigator = new KeyboardTextNavigator();
        expect(navigator.getNextCandidate(container)).toBeNull();
    });
});
