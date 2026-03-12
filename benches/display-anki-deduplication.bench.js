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

import {afterAll, bench, describe, vi} from 'vitest';
import {DisplayAnki} from '../ext/js/display/display-anki.js';
import {setupDomTest} from '../test/fixtures/dom-test.js';

const benchmarkOptions = Object.freeze({
    time: 3000,
    warmupTime: 1000,
    warmupIterations: 8,
});

const noteCount = 50;
const dictionaryEntries = /** @type {import('dictionary').DictionaryEntry[]} */ (
    Array.from({length: noteCount}, () => createTermEntry())
);

const {window, teardown} = await setupDomTest();
afterAll(async () => {
    await teardown(global);
});

global.chrome = /** @type {typeof chrome} */ ({
    runtime: {
        getURL: (path) => path,
    },
});

window.document.body.innerHTML = '<div id="popup-menus"></div>';

const fastDisplayAnki = createDisplayAnki(window.document);
const legacyDisplayAnki = createDisplayAnki(window.document);
legacyDisplayAnki._tryCreateDuplicateCheckNoteFast = () => null;

describe('Display Anki deduplication', () => {
    bench(`DisplayAnki._getDictionaryEntryDetails - legacy common-data path (n=${noteCount})`, async () => {
        await legacyDisplayAnki._getDictionaryEntryDetails(dictionaryEntries);
    }, benchmarkOptions);

    bench(`DisplayAnki._getDictionaryEntryDetails - fast probe path (n=${noteCount})`, async () => {
        await fastDisplayAnki._getDictionaryEntryDetails(dictionaryEntries);
    }, benchmarkOptions);
});

/**
 * @param {Document} document
 * @returns {DisplayAnki}
 */
function createDisplayAnki(document) {
    const api = {
        getAnkiNoteInfo: vi.fn(async (/** @type {import('anki').Note[]} */ notes) => notes.map((/** @type {import('anki').Note} */ note) => ({
            canAdd: true,
            valid: true,
            isDuplicate: false,
            noteIds: null,
            noteInfos: [],
        }))),
        getDictionaryInfo: vi.fn(async () => []),
        getDefaultAnkiFieldTemplates: vi.fn(async () => ''),
    };
    const display = {
        application: {api},
        displayGenerator: {
            instantiateTemplate: () => null,
            createAnkiNoteErrorsNotificationContent: () => document.createElement('div'),
        },
        dictionaryEntries,
        dictionaryEntryNodes: [],
        getOptions: () => ({anki: {enable: true, fieldTemplates: ''}, dictionaries: []}),
        getContentOrigin: () => ({tabId: 1, frameId: 0}),
        getOptionsContext: () => /** @type {import('settings').OptionsContext} */ ({current: true}),
        getLanguageSummary: () => ({}),
        createNotification: () => ({setContent: vi.fn(), open: vi.fn(), close: vi.fn()}),
        progressIndicatorVisible: {
            setOverride: vi.fn(() => 1),
            clearOverride: vi.fn(),
        },
        hotkeyHandler: {registerActions: vi.fn()},
        on: vi.fn(),
        _hotkeyHelpController: {
            setHotkeyLabel: vi.fn(),
            getHotkeyLabel: vi.fn(() => null),
            setupNode: vi.fn(),
        },
    };
    const displayAnki = new DisplayAnki(
        /** @type {import('../ext/js/display/display.js').Display} */ (/** @type {unknown} */ (display)),
        /** @type {import('../ext/js/display/display-audio.js').DisplayAudio} */ (/** @type {unknown} */ ({
            getAnkiNoteMediaAudioDetails: vi.fn(() => ({sources: [], preferredAudioIndex: null, enableDefaultAudioSources: true})),
        })),
    );
    displayAnki._checkForDuplicates = true;
    displayAnki._duplicateBehavior = 'prevent';
    displayAnki._displayTagsAndFlags = 'never';
    displayAnki._cardFormats = [createFastProbeCardFormat()];
    displayAnki._dictionaryEntryDetails = null;
    displayAnki._dictionaries = [];
    displayAnki._noteContext = {
        url: 'https://example.test',
        sentence: {text: 'term', offset: 0},
        documentTitle: 'title',
        query: 'term',
        fullQuery: 'term',
    };
    return displayAnki;
}

function createTermEntry() {
    return /** @type {import('dictionary').DictionaryEntry} */ ({
        type: 'term',
        headwords: [
            {
                term: 'term',
                reading: 'reading',
                sources: [{
                    originalText: 'term',
                    transformedText: 'term',
                    deinflectedText: 'term',
                    matchType: 'exact',
                    matchSource: 'term',
                    isPrimary: true,
                }],
            },
        ],
    });
}

/**
 * @returns {import('settings').AnkiCardFormat}
 */
function createFastProbeCardFormat() {
    return {
        type: 'term',
        name: 'Expression',
        deck: 'Deck',
        model: 'Model',
        fields: {
            Front: {
                value: '{expression}',
                overwriteMode: 'overwrite',
            },
        },
        icon: 'big-circle',
    };
}
