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

import {describe, expect} from 'vitest';
import {EventDispatcher} from '../ext/js/core/event-dispatcher.js';
import {PopupFrequencyBlurController} from '../ext/js/pages/settings/popup-frequency-blur-controller.js';
import {createDomTest} from './fixtures/dom-test.js';

const test = createDomTest();

/**
 * @typedef {{
 *     general: {
 *         popupBlurByFrequencyDictionary: string | null;
 *     };
 * }} PopupFrequencyBlurOptions
 */

/**
 * @typedef {{
 *     databaseUpdated: Record<string, never>;
 * }} MockApplicationEvents
 */

/**
 * @returns {import('dictionary-importer').Summary[]}
 */
function createDictionaryInfo() {
    return [
        {
            title: 'Test Dictionary',
            revision: '1',
            sequenced: false,
            version: 3,
            importDate: 0,
            prefixWildcardsSupported: false,
            styles: '',
            sourceLanguage: 'ja',
            counts: {
                terms: {total: 0},
                termMeta: {total: 0, freq: 1},
                kanji: {total: 0},
                kanjiMeta: {total: 0},
                tagMeta: {total: 0},
                media: {total: 0},
            },
        },
        {
            title: 'No Frequency Data',
            revision: '1',
            sequenced: false,
            version: 3,
            importDate: 0,
            prefixWildcardsSupported: false,
            styles: '',
            sourceLanguage: 'ja',
            counts: {
                terms: {total: 0},
                termMeta: {total: 0, freq: 0},
                kanji: {total: 0},
                kanjiMeta: {total: 0},
                tagMeta: {total: 0},
                media: {total: 0},
            },
        },
    ];
}

/**
 * @augments {EventDispatcher<MockApplicationEvents>}
 */
class MockApplication extends EventDispatcher {
    constructor() {
        super();
        /** @type {Record<string, never>} */
        this.api = {};
    }
}

/**
 * @augments {EventDispatcher<import('settings-controller').Events>}
 */
class MockSettingsController extends EventDispatcher {
    /**
     * @param {PopupFrequencyBlurOptions} options
     */
    constructor(options) {
        super();
        /** @type {MockApplication} */
        this.application = new MockApplication();
        /** @type {PopupFrequencyBlurOptions} */
        this._options = options;
    }

    /** @returns {Promise<import('dictionary-importer').Summary[]>} */
    async getDictionaryInfo() {
        return createDictionaryInfo();
    }

    /** @returns {Promise<PopupFrequencyBlurOptions>} */
    async getOptions() {
        return this._options;
    }

    /** @returns {import('settings').OptionsContext} */
    getOptionsContext() {
        return {index: 0};
    }
}

/**
 * @param {import('jsdom').DOMWindow} window
 */
function setupSettingsDom(window) {
    window.document.body.innerHTML = '<select id="popup-frequency-blur-dictionary" data-setting="general.popupBlurByFrequencyDictionary"></select>';
}

describe('PopupFrequencyBlurController (settings)', () => {
    test('prepare populates only frequency dictionaries and restores the saved selection', async ({window}) => {
        setupSettingsDom(window);
        const settingsController = new MockSettingsController({
            general: {
                popupBlurByFrequencyDictionary: 'Test Dictionary',
            },
        });
        await new PopupFrequencyBlurController(
            /** @type {import('../ext/js/pages/settings/settings-controller.js').SettingsController} */ (/** @type {unknown} */ (settingsController)),
        ).prepare();

        const dictionarySelect = /** @type {HTMLSelectElement} */ (window.document.querySelector('#popup-frequency-blur-dictionary'));
        const optionValues = Array.from(dictionarySelect.options, ({value}) => value);

        expect(optionValues).toStrictEqual(['', 'Test Dictionary']);
        expect(dictionarySelect.value).toBe('Test Dictionary');
    });
});
