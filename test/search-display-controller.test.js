/*
 * Copyright (C) 2023-2024  Yomitan Authors
 * Copyright (C) 2016-2022  Yomichan Authors
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

import {describe, expect, afterAll, test} from 'vitest';
import {setupDomTest} from './fixtures/dom-test.js';
import {querySelectorNotNull} from '../ext/js/dom/query-selector.js';

const documentSearchDisplayControllerEnv = await setupDomTest('ext/search.html');

const {window, teardown} = documentSearchDisplayControllerEnv;

const {document} = window;

let queryInputCount = 0;

/**
 * @param {?Element} element
 * @returns {boolean}
 */
function isElementInput(element) {
    if (element === null) { return false; }
    switch (element.tagName.toLowerCase()) {
        case 'input':
        case 'textarea':
        case 'button':
        case 'select':
            return true;
    }
    return element instanceof HTMLElement && !!element.isContentEditable;
}

/**
 * @type {HTMLInputElement}
 */
const queryInput = querySelectorNotNull(document, '#search-textbox');

/**
 * @param {KeyboardEvent} e
 */
function onKeyDownCurrent(e) {
    const {activeElement} = document;
    if (
        activeElement !== queryInput &&
        !isElementInput(activeElement) &&
        (!e.ctrlKey || e.key === 'Backspace') &&
        !e.metaKey &&
        !e.altKey &&
        (e.key.length === 1 || e.key === 'Backspace') &&
        e.key !== ' '
    ) {
        queryInput.focus({preventScroll: true});
        queryInputCount += 1;
    }
}

/**
 * @param {KeyboardEvent} e
 */
function onKeyDownNew(e) {
    const activeElement = document.activeElement;
    const isInputField = isElementInput(activeElement);
    const isAllowedKey = e.key.length === 1 || e.key === 'Backspace';
    const isModifierKey = e.ctrlKey || e.metaKey || e.altKey;
    const isSpaceKey = e.key === ' ';

    if (!isInputField && !isModifierKey && isAllowedKey && !isSpaceKey) {
        queryInput.focus({preventScroll: true});
        queryInputCount += 1;
    }
}

describe('Keyboard Event Handling', () => {
    afterAll(() => teardown(global));

    const keypressEvents = [
        new KeyboardEvent('keydown', {key: 'a', ctrlKey: false, metaKey: false, altKey: false}),
        new KeyboardEvent('keydown', {key: '', ctrlKey: true, metaKey: false, altKey: false}),
        new KeyboardEvent('keydown', {key: '', ctrlKey: false, metaKey: true, altKey: false}),
        new KeyboardEvent('keydown', {key: '', ctrlKey: false, metaKey: false, altKey: true}),
        new KeyboardEvent('keydown', {key: ' ', ctrlKey: false, metaKey: false, altKey: false})
    ];

    test('should test that onKeyDownCurrent function focuses input', () => {
        for (const event of keypressEvents) {
            onKeyDownCurrent(event);
        }

        expect(queryInputCount).toBe(1);

        queryInput.blur();
    });

    test('should test that onKeyDownNew function focuses input', () => {
        for (const event of keypressEvents) {
            onKeyDownNew(event);
        }

        expect(queryInputCount).toBe(2);
    });
});
