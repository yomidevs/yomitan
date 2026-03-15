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
import {PopupFrequencyBlurController} from '../ext/js/pages/settings/popup-frequency-blur-controller.js';
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
 *     databaseUpdated: Record<string, never>;
 * }} MockApplicationEvents
 */

/**
 * @returns {import('dictionary-importer').Summary[]}
 */
function createDictionaryInfo() {
    return [{
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
    }];
}

/**
 * @augments {EventDispatcher<MockApplicationEvents>}
 */
class MockApplication extends EventDispatcher {
    constructor() {
        super();
        /** @type {{getDictionaryInfo: () => Promise<import('dictionary-importer').Summary[]>, getTermFrequencies: (termReadingList: import('translator').TermReadingList, dictionaries: string[]) => Promise<import('translator').TermFrequencySimple[]>}} */
        this.api = {
            getDictionaryInfo: vi.fn(async () => createDictionaryInfo()),
            getTermFrequencies: vi.fn(async (_termReadingList, _dictionaries) => [
                {term: '来る', reading: null, dictionary: 'Test Dictionary', hasReading: false, frequency: 1, displayValue: null, displayValueParsed: false},
                {term: '猫', reading: null, dictionary: 'Test Dictionary', hasReading: false, frequency: 100, displayValue: null, displayValueParsed: false},
            ]),
        };
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
        /** @type {(path: string, value: unknown) => Promise<import('settings-controller').ModifyResult[]>} */
        this.setProfileSetting = vi.fn(async (_path, _value) => []);
        /** @type {(targets: import('settings-modifications').Modification[]) => Promise<import('settings-controller').ModifyResult[]>} */
        this.modifyProfileSettings = vi.fn(async (_targets) => []);
    }

    /** @returns {Promise<import('dictionary-importer').Summary[]>} */
    async getDictionaryInfo() {
        return await this.application.api.getDictionaryInfo();
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
    window.document.body.innerHTML = `
        <input type="checkbox" id="popup-frequency-blur-enabled">
        <select id="popup-frequency-blur-dictionary"></select>
        <div id="popup-frequency-blur-options" hidden></div>
    `;
}

/**
 * @returns {PopupFrequencyBlurOptions}
 */
function createOptions() {
    return {
        general: {
            popupBlurByFrequencyEnabled: true,
            popupBlurByFrequencyDictionary: 'Test Dictionary',
            popupBlurByFrequencyThreshold: 1,
            popupBlurByFrequencyOrder: 'ascending',
            popupBlurByFrequencyUnblurDelay: 0,
        },
    };
}

describe('PopupFrequencyBlurController (settings)', () => {
    test('prepare restores saved settings on initial load', async ({window}) => {
        setupSettingsDom(window);
        const settingsController = new MockSettingsController(createOptions());
        const controller = new PopupFrequencyBlurController(
            /** @type {import('../ext/js/pages/settings/settings-controller.js').SettingsController} */ (/** @type {unknown} */ (settingsController)),
        );

        await controller.prepare();

        const enabledCheckbox = /** @type {HTMLInputElement} */ (window.document.querySelector('#popup-frequency-blur-enabled'));
        const dictionarySelect = /** @type {HTMLSelectElement} */ (window.document.querySelector('#popup-frequency-blur-dictionary'));
        const optionsNode = /** @type {HTMLElement} */ (window.document.querySelector('#popup-frequency-blur-options'));

        expect(enabledCheckbox.checked).toBe(true);
        expect(optionsNode.hidden).toBe(false);
        expect(dictionarySelect.value).toBe('Test Dictionary');
        expect(settingsController.setProfileSetting).not.toHaveBeenCalled();
    });
});
