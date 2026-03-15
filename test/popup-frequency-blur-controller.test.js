/*
 * Copyright (C) 2023-2025  Yomitan Authors
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
 *         popupBlurByFrequencyOrder: import('settings').SortFrequencyDictionaryOrder | null;
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
     * @param {PopupFrequencyBlurOptions} options
     */
    setOptions(options) {
        this._options = options;
        this.trigger('optionsUpdated', {options});
    }

    /**
     * @param {import('dictionary').DictionaryEntry[]} dictionaryEntries
     * @param {import('display').PageType} [type]
     */
    setContent(dictionaryEntries, type = 'terms') {
        this.dictionaryEntries = dictionaryEntries;
        this.trigger('contentUpdateComplete', {type});
    }

    /** */
    clearContent() {
        this.dictionaryEntries = [];
        this.trigger('contentClear', {});
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
                <div class="popup-frequency-blur-card">
                    <div class="popup-frequency-blur-card-label" id="popup-frequency-blur-overlay-label">Hover to reveal</div>
                    <div class="popup-frequency-blur-card-sublabel" id="popup-frequency-blur-overlay-sublabel"></div>
                </div>
            </div>
        </div>
    `;
}

/**
 * @param {import('jsdom').DOMWindow} window
 * @returns {HTMLElement}
 */
function getOverlay(window) {
    const overlay = window.document.querySelector('#popup-frequency-blur-overlay');
    expect(overlay).not.toBe(null);
    return /** @type {HTMLElement} */ (overlay);
}

/**
 * @param {import('jsdom').DOMWindow} window
 * @returns {string}
 */
function getOverlaySublabel(window) {
    return window.document.querySelector('#popup-frequency-blur-overlay-sublabel')?.textContent ?? '';
}

/**
 * @param {{enabled?: boolean, dictionary?: string | null, threshold?: number, order?: import('settings').SortFrequencyDictionaryOrder | null, unblurDelay?: number}} [details]
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
 * @param {Array<{dictionary?: string, frequency: number, displayValue?: string | null, displayValueParsed?: boolean, headwordIndex?: number}>} frequencies
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
            headwordIndex = 0,
        }) => ({
            index: headwordIndex,
            dictionary,
            headwordIndex,
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
    test('first term entry qualifies and starts blurred', ({window}) => {
        setupPopupDom(window);
        const display = new MockDisplay(createOptions({threshold: 1, order: 'ascending'}));
        const controller = createController(display);
        controller.prepare();

        display.setContent([createTermEntry([{frequency: 1}])]);

        expect(window.document.documentElement.dataset.popupFrequencyBlurState).toBe('blurred');
        expect(getOverlay(window).hidden).toBe(false);
        expect(getOverlaySublabel(window)).toBe('Test Dictionary · frequency 1');
    });

    test('pointerenter reveals the popup and pointerleave re-blurs it', ({window}) => {
        setupPopupDom(window);
        const display = new MockDisplay(createOptions({threshold: 1, order: 'ascending'}));
        const controller = createController(display);
        controller.prepare();
        display.setContent([createTermEntry([{frequency: 1}])]);

        const contentOuter = /** @type {HTMLElement} */ (window.document.querySelector('.content-outer'));
        expect(contentOuter).not.toBe(null);
        expect(getOverlay(window).hidden).toBe(false);

        contentOuter.dispatchEvent(new window.Event('pointerenter'));
        expect(window.document.documentElement.dataset.popupFrequencyBlurState).toBe('revealed');
        expect(getOverlay(window).hidden).toBe(true);

        contentOuter.dispatchEvent(new window.Event('pointerleave'));
        expect(window.document.documentElement.dataset.popupFrequencyBlurState).toBe('blurred');
        expect(getOverlay(window).hidden).toBe(false);
    });

    test('positive unblur delay auto-reveals without hover', async ({window}) => {
        vi.useFakeTimers();
        try {
            setupPopupDom(window);
            const display = new MockDisplay(createOptions({threshold: 1, order: 'ascending', unblurDelay: 2}));
            const controller = createController(display);
            controller.prepare();

            display.setContent([createTermEntry([{frequency: 1}])]);
            expect(window.document.documentElement.dataset.popupFrequencyBlurState).toBe('blurred');
            expect(window.document.querySelector('#popup-frequency-blur-overlay-label')?.textContent).toBe('Hover or wait 2s to reveal');
            expect(getOverlay(window).hidden).toBe(false);

            await vi.advanceTimersByTimeAsync(1000);
            expect(window.document.querySelector('#popup-frequency-blur-overlay-label')?.textContent).toBe('Hover or wait 1s to reveal');

            await vi.advanceTimersByTimeAsync(1000);
            expect(window.document.documentElement.dataset.popupFrequencyBlurState).toBe('revealed');
            expect(getOverlay(window).hidden).toBe(true);
        } finally {
            vi.useRealTimers();
        }
    });

    test('fractional unblur delay rounds up to whole seconds', async ({window}) => {
        vi.useFakeTimers();
        try {
            setupPopupDom(window);
            const display = new MockDisplay(createOptions({threshold: 1, order: 'ascending', unblurDelay: 1.2}));
            const controller = createController(display);
            controller.prepare();

            display.setContent([createTermEntry([{frequency: 1}])]);
            expect(window.document.querySelector('#popup-frequency-blur-overlay-label')?.textContent).toBe('Hover or wait 2s to reveal');

            await vi.advanceTimersByTimeAsync(200);
            expect(window.document.querySelector('#popup-frequency-blur-overlay-label')?.textContent).toBe('Hover or wait 1s to reveal');

            await vi.advanceTimersByTimeAsync(1000);
            expect(window.document.documentElement.dataset.popupFrequencyBlurState).toBe('revealed');
        } finally {
            vi.useRealTimers();
        }
    });

    test('disabled setting keeps overlay hidden even when the term qualifies', ({window}) => {
        setupPopupDom(window);
        const display = new MockDisplay(createOptions({enabled: false, threshold: 1, order: 'ascending'}));
        const controller = createController(display);
        controller.prepare();

        display.setContent([createTermEntry([{frequency: 1}])]);

        expect(window.document.documentElement.dataset.popupFrequencyBlurState).toBe('off');
        expect(getOverlay(window).hidden).toBe(true);
    });

    test('missing selected-dictionary frequency keeps blur off', ({window}) => {
        setupPopupDom(window);
        const display = new MockDisplay(createOptions());
        const controller = createController(display);
        controller.prepare();

        display.setContent([createTermEntry([{dictionary: 'Other Dictionary', frequency: 1}])]);

        expect(window.document.documentElement.dataset.popupFrequencyBlurState).toBe('off');
        expect(getOverlay(window).hidden).toBe(true);
    });

    test('parsed display values fall back to numeric frequencies when no numeric token is present', ({window}) => {
        setupPopupDom(window);
        const display = new MockDisplay(createOptions({threshold: 4}));
        const controller = createController(display);
        controller.prepare();

        display.setContent([createTermEntry([{
            frequency: 4,
            displayValue: 'unusable',
            displayValueParsed: true,
        }])]);

        expect(window.document.documentElement.dataset.popupFrequencyBlurState).toBe('blurred');
        expect(getOverlaySublabel(window)).toBe('Test Dictionary · frequency 4');
    });

    test('selected dictionary without any usable values keeps blur off', ({window}) => {
        setupPopupDom(window);
        const display = new MockDisplay(createOptions({threshold: 0}));
        const controller = createController(display);
        controller.prepare();

        display.setContent([createTermEntry([{
            frequency: Number.NaN,
            displayValue: 'unusable',
            displayValueParsed: true,
        }])]);

        expect(window.document.documentElement.dataset.popupFrequencyBlurState).toBe('off');
        expect(getOverlay(window).hidden).toBe(true);
    });

    test('parsed composite display values use minimum values for ascending dictionaries', ({window}) => {
        setupPopupDom(window);
        const display = new MockDisplay(createOptions({threshold: 400, order: 'ascending'}));
        const controller = createController(display);
        controller.prepare();

        display.setContent([createTermEntry([{
            frequency: 19291,
            displayValue: '317, 19291',
            displayValueParsed: true,
        }])]);

        expect(window.document.documentElement.dataset.popupFrequencyBlurState).toBe('blurred');
        expect(getOverlaySublabel(window)).toBe('Test Dictionary · frequency 317');
    });

    test('non-term content keeps blur off', ({window}) => {
        setupPopupDom(window);
        const display = new MockDisplay(createOptions());
        const controller = createController(display);
        controller.prepare();

        display.setContent([], 'kanji');

        expect(window.document.documentElement.dataset.popupFrequencyBlurState).toBe('off');
        expect(getOverlay(window).hidden).toBe(true);
    });

    test('order null keeps blur off', ({window}) => {
        setupPopupDom(window);
        const display = new MockDisplay(createOptions({order: null}));
        const controller = createController(display);
        controller.prepare();

        display.setContent([createTermEntry([{frequency: 1}])]);

        expect(window.document.documentElement.dataset.popupFrequencyBlurState).toBe('off');
        expect(getOverlay(window).hidden).toBe(true);
    });

    test('multi-headword entries use minimum values for ascending dictionaries', ({window}) => {
        setupPopupDom(window);
        const display = new MockDisplay(createOptions({threshold: 2, order: 'ascending'}));
        const controller = createController(display);
        controller.prepare();

        display.setContent([createTermEntry([
            {frequency: 5, headwordIndex: 0},
            {frequency: 2, headwordIndex: 1},
            {frequency: 7, headwordIndex: 2},
        ])]);

        expect(window.document.documentElement.dataset.popupFrequencyBlurState).toBe('blurred');
    });

    test('multi-headword entries use maximum values for descending dictionaries', ({window}) => {
        setupPopupDom(window);
        const display = new MockDisplay(createOptions({threshold: 7, order: 'descending'}));
        const controller = createController(display);
        controller.prepare();

        display.setContent([createTermEntry([
            {frequency: 5, headwordIndex: 0},
            {frequency: 2, headwordIndex: 1},
            {frequency: 7, headwordIndex: 2},
        ])]);

        expect(window.document.documentElement.dataset.popupFrequencyBlurState).toBe('blurred');
    });

    test('parsed composite display values use maximum values for descending dictionaries', ({window}) => {
        setupPopupDom(window);
        const display = new MockDisplay(createOptions({threshold: 1000, order: 'descending'}));
        const controller = createController(display);
        controller.prepare();

        display.setContent([createTermEntry([{
            frequency: 317,
            displayValue: '317, 19291',
            displayValueParsed: true,
        }])]);

        expect(window.document.documentElement.dataset.popupFrequencyBlurState).toBe('blurred');
        expect(getOverlaySublabel(window)).toBe('Test Dictionary · frequency 19291');
    });
});
