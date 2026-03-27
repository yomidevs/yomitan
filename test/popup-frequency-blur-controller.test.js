/*
 * Copyright (C) 2025  Yomitan Authors
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

import {describe, expect, vi} from 'vitest';
import {EventDispatcher} from '../ext/js/core/event-dispatcher.js';
import {PopupFrequencyBlurController} from '../ext/js/display/popup-frequency-blur-controller.js';
import {createDomTest} from './fixtures/dom-test.js';

const test = createDomTest();

/**
 * @typedef {{
 *     general: {
 *         popupBlurByFrequencyEnabled: boolean;
 *         popupBlurByFrequencyDictionary: string | null;
 *         popupBlurByFrequencyThreshold: number;
 *         popupBlurByFrequencyOrder: import('settings').SortFrequencyDictionaryOrder;
 *         popupBlurByFrequencyUnblurDelay: number;
 *     };
 * }} PopupFrequencyBlurOptions
 */

/**
 * @typedef {{
 *     optionsUpdated: {options: PopupFrequencyBlurOptions};
 *     contentClear: Record<string, never>;
 *     contentUpdateComplete: {type: import('display').PageType};
 * }} MockDisplayEvents
 */

/**
 * @augments {EventDispatcher<MockDisplayEvents>}
 */
class MockDisplay extends EventDispatcher {
    /**
     * @param {PopupFrequencyBlurOptions} options
     */
    constructor(options) {
        super();
        /** @type {PopupFrequencyBlurOptions} */
        this._options = options;
        /** @type {import('dictionary').DictionaryEntry[]} */
        this.dictionaryEntries = [];
    }

    /** @returns {PopupFrequencyBlurOptions} */
    getOptions() {
        return this._options;
    }

    /**
     * @param {import('dictionary').DictionaryEntry[]} dictionaryEntries
     * @param {import('display').PageType} [type]
     */
    setContent(dictionaryEntries, type = 'terms') {
        this.dictionaryEntries = dictionaryEntries;
        this.trigger('contentUpdateComplete', {type});
    }
}

/**
 * @param {import('jsdom').DOMWindow} window
 */
function setupPopupDom(window) {
    const {document} = window;
    document.documentElement.dataset.pageType = 'popup';
    document.body.innerHTML = `
        <div class="content-outer">
            <div class="content"></div>
            <div class="content-sidebar"></div>
            <div id="popup-frequency-blur-overlay" hidden>
                <div id="popup-frequency-blur-overlay-label"></div>
                <div id="popup-frequency-blur-overlay-sublabel"></div>
            </div>
        </div>
    `;
}

/**
 * @param {{enabled?: boolean, dictionary?: string | null, threshold?: number, order?: import('settings').SortFrequencyDictionaryOrder, unblurDelay?: number}} [details]
 * @returns {PopupFrequencyBlurOptions}
 */
function createOptions(details = {}) {
    const {
        enabled = true,
        dictionary = 'Test Dictionary',
        threshold = 1,
        order = 'ascending',
        unblurDelay = 0,
    } = details;
    return {
        general: {
            popupBlurByFrequencyEnabled: enabled,
            popupBlurByFrequencyDictionary: dictionary,
            popupBlurByFrequencyThreshold: threshold,
            popupBlurByFrequencyOrder: order,
            popupBlurByFrequencyUnblurDelay: unblurDelay,
        },
    };
}

/**
 * @param {Array<{dictionary?: string, frequency: number, displayValue?: string | null, displayValueParsed?: boolean}>} frequencies
 * @returns {import('dictionary').TermDictionaryEntry}
 */
function createTermEntry(frequencies) {
    return {
        type: 'term',
        isPrimary: true,
        textProcessorRuleChainCandidates: [],
        inflectionRuleChainCandidates: [],
        score: 0,
        frequencyOrder: 0,
        dictionaryIndex: 0,
        dictionaryAlias: 'Test Dictionary',
        sourceTermExactMatchCount: 1,
        matchPrimaryReading: true,
        maxOriginalTextLength: 1,
        headwords: [],
        definitions: [],
        pronunciations: [],
        frequencies: frequencies.map(({
            dictionary = 'Test Dictionary',
            frequency,
            displayValue = null,
            displayValueParsed = false,
        }) => ({
            index: 0,
            dictionary,
            headwordIndex: 0,
            dictionaryIndex: 0,
            dictionaryAlias: dictionary,
            hasReading: false,
            frequency,
            displayValue,
            displayValueParsed,
        })),
    };
}

/**
 * @param {MockDisplay} display
 * @returns {PopupFrequencyBlurController}
 */
function createController(display) {
    return new PopupFrequencyBlurController(
        /** @type {import('../ext/js/display/display.js').Display} */ (/** @type {unknown} */ (display)),
    );
}

describe('PopupFrequencyBlurController', () => {
    test('manual blur mode uses the selected threshold comparison for both frequency orders', ({window}) => {
        setupPopupDom(window);
        for (const {order, threshold, frequency} of [
            {order: /** @type {const} */ ('ascending'), threshold: 3, frequency: 3},
            {order: /** @type {const} */ ('descending'), threshold: 100, frequency: 100},
        ]) {
            const display = new MockDisplay(createOptions({order, threshold}));
            createController(display).prepare();

            display.setContent([createTermEntry([{frequency}])]);

            expect(window.document.documentElement.dataset.popupFrequencyBlurState).toBe('blurred');
            expect(window.document.querySelector('#popup-frequency-blur-overlay')?.hasAttribute('hidden')).toBe(false);
            expect(window.document.querySelector('#popup-frequency-blur-overlay-sublabel')?.textContent).toBe(`Test Dictionary · frequency ${frequency}`);

            window.document.body.innerHTML = '';
            setupPopupDom(window);
        }
    });

    test('positive unblur delay shows a countdown and auto-reveals', async ({window}) => {
        vi.useFakeTimers();
        try {
            setupPopupDom(window);
            const display = new MockDisplay(createOptions({threshold: 1, order: 'ascending', unblurDelay: 2}));
            createController(display).prepare();

            display.setContent([createTermEntry([{frequency: 1}])]);
            expect(window.document.documentElement.dataset.popupFrequencyBlurState).toBe('blurred');
            expect(window.document.querySelector('#popup-frequency-blur-overlay-label')?.textContent).toBe('Hover or wait 2s to reveal');

            await vi.advanceTimersByTimeAsync(1000);
            expect(window.document.querySelector('#popup-frequency-blur-overlay-label')?.textContent).toBe('Hover or wait 1s to reveal');

            await vi.advanceTimersByTimeAsync(1000);
            expect(window.document.documentElement.dataset.popupFrequencyBlurState).toBe('revealed');
        } finally {
            vi.useRealTimers();
        }
    });

    test('blur stays off when the blur dictionary is unset or missing on the first term entry', ({window}) => {
        setupPopupDom(window);
        for (const {dictionary, frequencies} of [
            {dictionary: null, frequencies: [{frequency: 1}]},
            {dictionary: 'Test Dictionary', frequencies: [{dictionary: 'Other Dictionary', frequency: 1}]},
        ]) {
            const display = new MockDisplay(createOptions({dictionary}));
            createController(display).prepare();

            display.setContent([createTermEntry(frequencies)]);

            expect(window.document.documentElement.dataset.popupFrequencyBlurState).toBe('off');
            expect(window.document.querySelector('#popup-frequency-blur-overlay')?.hasAttribute('hidden')).toBe(true);

            window.document.body.innerHTML = '';
            setupPopupDom(window);
        }
    });

    test('parsed display values fall back to numeric frequency when no numeric token is present', ({window}) => {
        setupPopupDom(window);
        const display = new MockDisplay(createOptions({threshold: 4}));
        createController(display).prepare();

        display.setContent([createTermEntry([{
            frequency: 4,
            displayValue: 'unusable',
            displayValueParsed: true,
        }])]);

        expect(window.document.documentElement.dataset.popupFrequencyBlurState).toBe('blurred');
        expect(window.document.querySelector('#popup-frequency-blur-overlay-sublabel')?.textContent).toBe('Test Dictionary · frequency 4');
    });
});
