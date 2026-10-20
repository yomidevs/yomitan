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

import {afterAll, describe, expect, test, vi} from 'vitest';
import {Application} from '../ext/js/application.js';
import {API} from '../ext/js/comm/api.js';
import {CrossFrameAPI} from '../ext/js/comm/cross-frame-api.js';
import {createAnkiNoteData} from '../ext/js/data/anki-note-data-creator.js';
import {DisplayAudio} from '../ext/js/display/display-audio.js';
import {Display} from '../ext/js/display/display.js';
import {SearchDisplayController} from '../ext/js/display/search-display-controller.js';
import {SearchPersistentStateController} from '../ext/js/display/search-persistent-state-controller.js';
import {DocumentFocusController} from '../ext/js/dom/document-focus-controller.js';
import {querySelectorNotNull} from '../ext/js/dom/query-selector.js';
import {WebExtension} from '../ext/js/extension/web-extension.js';
import {HotkeyHandler} from '../ext/js/input/hotkey-handler.js';
import {setupDomTest} from './fixtures/dom-test.js';

const documentSearchDisplayControllerEnv = await setupDomTest('ext/search.html');

const {window, teardown} = documentSearchDisplayControllerEnv;

const {document} = window;

const frameId = 1;
const tabId = 1;
const webExtension = new WebExtension();
const hotkeyHandler = new HotkeyHandler();
const documentFocusController = new DocumentFocusController();
const displayPageType = 'search';
const api = new API(webExtension);
const crossFrameAPI = new CrossFrameAPI(api, tabId, frameId);
const application = new Application(api, crossFrameAPI);
const display = new Display(application, displayPageType, documentFocusController, hotkeyHandler);
const displayAudio = new DisplayAudio(display);
const searchPersistentStateController = new SearchPersistentStateController();

const searchDisplayController = new SearchDisplayController(display, displayAudio, searchPersistentStateController);

// eslint-disable-next-line no-underscore-dangle
const onKeyDownMethod = searchDisplayController._onKeyDown.bind(searchDisplayController);

/**
 * @type {HTMLInputElement}
 */
const queryInput = querySelectorNotNull(document, '#search-textbox');

const focusSpy = vi.spyOn(queryInput, 'focus');

describe('Search query', () => {
    test.each([
        [' 具'],
        ['  具'],
        ['　具'],
        ['\t具'],
        ['具 '],
        [' 具\n'],
    ])('should ignore surrounding whitespace in query %j', (inputText) => {
        const setContentSpy = vi.spyOn(display, 'setContent').mockImplementation(() => {});

        queryInput.value = inputText;
        // eslint-disable-next-line no-underscore-dangle
        searchDisplayController._search(false, 'new', true, null);

        expect(setContentSpy).toHaveBeenCalledTimes(1);
        const {params: {query}, state} = setContentSpy.mock.calls[0][0];
        const sentence = state?.sentence;
        expect(query).toBe('具');
        expect(sentence).toStrictEqual({text: '具', offset: 0});

        // The Anki cloze is built from the sentence, so the looked up text must end up in its body
        const noteData = createAnkiNoteData('cloze-body', {
            dictionaryEntry: {
                type: 'kanji',
                character: '具',
                dictionary: 'Test Dictionary',
                dictionaryIndex: 0,
                dictionaryAlias: 'Test Dictionary',
                onyomi: [],
                kunyomi: [],
                tags: [],
                stats: {},
                definitions: [],
                frequencies: [],
            },
            resultOutputMode: 'split',
            cardFormat: {type: 'kanji', name: 'test', deck: 'deck', model: 'model', fields: {}, icon: 'big-circle'},
            glossaryLayoutMode: 'default',
            compactTags: false,
            context: {url: '', documentTitle: '', query: `${query}`, fullQuery: `${query}`, sentence: {...sentence}},
            dictionaryStylesMap: new Map(),
        });
        const {cloze} = /** @type {import('anki-templates').KanjiDictionaryEntry} */ (noteData.definition);
        expect(cloze).toStrictEqual({sentence: '具', prefix: '', body: '具', bodyKana: '具', suffix: ''});

        setContentSpy.mockRestore();
    });
});

describe('Keyboard Event Handling', () => {
    afterAll(() => teardown(global));

    const validKeypressEvents = [
        new KeyboardEvent('keydown', {key: 'a', ctrlKey: false, metaKey: false, altKey: false}),
        new KeyboardEvent('keydown', {key: 'Backspace'}),
        new KeyboardEvent('keydown', {key: 'Backspace', ctrlKey: true, metaKey: false, altKey: false}),
    ];

    const invalidKeypressEvents = [
        new KeyboardEvent('keydown', {key: '', ctrlKey: true, metaKey: false, altKey: false}),
        new KeyboardEvent('keydown', {key: '', ctrlKey: false, metaKey: true, altKey: false}),
        new KeyboardEvent('keydown', {key: '', ctrlKey: false, metaKey: false, altKey: true}),
        new KeyboardEvent('keydown', {key: ' ', ctrlKey: false, metaKey: false, altKey: false}),
        new KeyboardEvent('keydown', {key: 'a', ctrlKey: true, metaKey: false, altKey: false}),
        new KeyboardEvent('keydown', {key: 'a', ctrlKey: false, metaKey: true, altKey: false}),
        new KeyboardEvent('keydown', {key: 'a', ctrlKey: false, metaKey: false, altKey: true}),
        new KeyboardEvent('keydown', {key: 'Backspace', ctrlKey: false, metaKey: true, altKey: false}),
        new KeyboardEvent('keydown', {key: 'Backspace', ctrlKey: false, metaKey: false, altKey: true}),
        new KeyboardEvent('keydown', {key: 'ArrowDown'}),
    ];

    test('should test that onKeyDown function focuses input for valid keys', () => {
        for (const event of validKeypressEvents) {
            queryInput.blur();
            onKeyDownMethod(event);
        }

        expect(focusSpy.mock.calls.length).toBe(validKeypressEvents.length);
        focusSpy.mockReset();
    });


    test('should test that onKeyDown function does not focus input for invalid keys', () => {
        for (const event of invalidKeypressEvents) {
            queryInput.blur();
            onKeyDownMethod(event);
        }

        expect(focusSpy.mock.calls.length).toBe(0);
    });
});
