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

import {describe, expect} from 'vitest';
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
                    <div class="popup-frequency-blur-card-label">Hover to reveal</div>
                    <div class="popup-frequency-blur-card-sublabel" id="popup-frequency-blur-overlay-sublabel"></div>
                </div>
            </div>
        </div>
    `;
}

/**
 * @param {{enabled?: boolean, dictionary?: string | null, threshold?: number, order?: import('settings').SortFrequencyDictionaryOrder | null}} [details]
 * @returns {PopupFrequencyBlurOptions}
 */
function createOptions(details = {}) {
    const {
        enabled = true,
        dictionary = 'Test Dictionary',
        threshold = 1,
        order = 'ascending',
    } = details;
    return {
        general: {
            popupBlurByFrequencyEnabled: enabled,
            popupBlurByFrequencyDictionary: dictionary,
            popupBlurByFrequencyThreshold: threshold,
            popupBlurByFrequencyOrder: order,
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
    });

    test('pointerenter reveals the popup and pointerleave re-blurs it', ({window}) => {
        setupPopupDom(window);
        const display = new MockDisplay(createOptions({threshold: 1, order: 'ascending'}));
        const controller = createController(display);
        controller.prepare();
        display.setContent([createTermEntry([{frequency: 1}])]);

        const contentOuter = /** @type {HTMLElement} */ (window.document.querySelector('.content-outer'));
        expect(contentOuter).not.toBe(null);

        contentOuter.dispatchEvent(new window.Event('pointerenter'));
        expect(window.document.documentElement.dataset.popupFrequencyBlurState).toBe('revealed');

        contentOuter.dispatchEvent(new window.Event('pointerleave'));
        expect(window.document.documentElement.dataset.popupFrequencyBlurState).toBe('blurred');
    });

    test('missing selected-dictionary frequency keeps blur off', ({window}) => {
        setupPopupDom(window);
        const display = new MockDisplay(createOptions());
        const controller = createController(display);
        controller.prepare();

        display.setContent([createTermEntry([{dictionary: 'Other Dictionary', frequency: 1}])]);

        expect(window.document.documentElement.dataset.popupFrequencyBlurState).toBe('off');
    });

    test('selected dictionary without a usable value keeps blur off', ({window}) => {
        setupPopupDom(window);
        const display = new MockDisplay(createOptions({threshold: 0}));
        const controller = createController(display);
        controller.prepare();

        display.setContent([createTermEntry([{
            frequency: 0,
            displayValue: 'unusable',
            displayValueParsed: true,
        }])]);

        expect(window.document.documentElement.dataset.popupFrequencyBlurState).toBe('off');
    });

    test('non-term content keeps blur off', ({window}) => {
        setupPopupDom(window);
        const display = new MockDisplay(createOptions());
        const controller = createController(display);
        controller.prepare();

        display.setContent([], 'kanji');

        expect(window.document.documentElement.dataset.popupFrequencyBlurState).toBe('off');
    });

    test('order null keeps blur off', ({window}) => {
        setupPopupDom(window);
        const display = new MockDisplay(createOptions({order: null}));
        const controller = createController(display);
        controller.prepare();

        display.setContent([createTermEntry([{frequency: 1}])]);

        expect(window.document.documentElement.dataset.popupFrequencyBlurState).toBe('off');
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
});
