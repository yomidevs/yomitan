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

/* eslint-disable no-underscore-dangle, @typescript-eslint/unbound-method */

import {describe, expect, vi} from 'vitest';
import {DictionaryController} from '../ext/js/pages/settings/dictionary-controller.js';
import {createDomTest} from './fixtures/dom-test.js';

const test = createDomTest();

/**
 * @param {import('jsdom').DOMWindow} window
 * @returns {{checkUpdatesButton: HTMLButtonElement, modalNode: HTMLDivElement}}
 */
function setupSettingsDom(window) {
    window.document.body.innerHTML = `
        <div id="dictionaries-modal-body"></div>
        <div id="dictionary-list"><div class="dictionary-item-bottom"></div></div>
        <input type="checkbox" id="all-dictionaries-enabled">
        <button type="button" id="dictionary-check-updates" class="dictionary-database-mutating-input">Check for Updates</button>
        <button type="button" id="dictionary-update-all" class="dictionary-database-mutating-input">Update All</button>
    `;

    const modalNode = window.document.createElement('div');
    modalNode.innerHTML = '<strong id="dictionary-confirm-update-all-count"></strong>';
    const checkUpdatesButton = /** @type {HTMLButtonElement} */ (window.document.querySelector('#dictionary-check-updates'));

    return {checkUpdatesButton, modalNode};
}

/**
 * @returns {import('dictionary-importer').Summary}
 */
function createDictionarySummary() {
    return /** @type {import('dictionary-importer').Summary} */ ({
        title: 'Dictionary',
        revision: '1',
        sequenced: true,
        version: 3,
        importDate: 0,
        prefixWildcardsSupported: false,
        styles: '',
    });
}

/**
 * @param {HTMLDivElement} modalNode
 * @returns {DictionaryController}
 */
function createController(modalNode) {
    const controller = new DictionaryController(
        /** @type {import('../ext/js/pages/settings/settings-controller.js').SettingsController} */ (/** @type {unknown} */ ({
            application: {
                on: () => {},
            },
        })),
        /** @type {import('../ext/js/pages/settings/modal-controller.js').ModalController} */ (/** @type {unknown} */ ({})),
        /** @type {import('../ext/js/pages/settings/status-footer.js').StatusFooter} */ (/** @type {unknown} */ (null)),
    );
    controller._dictionaries = [createDictionarySummary()];
    controller._updateAllDictionaryModal = /** @type {import('../ext/js/pages/settings/modal.js').Modal} */ (/** @type {unknown} */ ({
        node: modalNode,
        setVisible: vi.fn(),
    }));
    return controller;
}

describe('DictionaryController', () => {
    test('getDictionaryUpdateTasks returns update tasks for dictionaries with available updates', async ({window}) => {
        const {modalNode} = setupSettingsDom(window);
        const controller = createController(modalNode);

        controller._dictionaryEntries = /** @type {any} */ ([
            {
                dictionaryTitle: 'Dictionary A',
                updateDownloadUrl: 'https://example.invalid/a.zip',
                checkForUpdate: vi.fn(async () => true),
            },
            {
                dictionaryTitle: 'Dictionary B',
                updateDownloadUrl: null,
                checkForUpdate: vi.fn(async () => false),
            },
            {
                dictionaryTitle: 'Dictionary C',
                updateDownloadUrl: 'https://example.invalid/c.zip',
                checkForUpdate: vi.fn(async () => true),
            },
        ]);

        const updateTasks = await controller._getDictionaryUpdateTasks();

        expect(updateTasks).toStrictEqual([
            {type: 'update', dictionaryTitle: 'Dictionary A', downloadUrl: 'https://example.invalid/a.zip'},
            {type: 'update', dictionaryTitle: 'Dictionary C', downloadUrl: 'https://example.invalid/c.zip'},
        ]);
    });

    test('update all opens a bulk confirmation modal with the discovered update count', async ({window}) => {
        const {checkUpdatesButton, modalNode} = setupSettingsDom(window);
        const controller = createController(modalNode);
        controller._getDictionaryUpdateTasks = /** @type {any} */ (vi.fn(async () => [
            {type: 'update', dictionaryTitle: 'Dictionary A', downloadUrl: 'https://example.invalid/a.zip'},
            {type: 'update', dictionaryTitle: 'Dictionary C', downloadUrl: 'https://example.invalid/c.zip'},
        ]));

        await controller._updateAllDictionaries();

        expect(checkUpdatesButton.textContent).toBe('2 updates');
        expect(modalNode.querySelector('#dictionary-confirm-update-all-count')?.textContent).toBe('2 dictionaries');
        expect(controller._pendingUpdateTasks).toStrictEqual([
            {type: 'update', dictionaryTitle: 'Dictionary A', downloadUrl: 'https://example.invalid/a.zip'},
            {type: 'update', dictionaryTitle: 'Dictionary C', downloadUrl: 'https://example.invalid/c.zip'},
        ]);
        expect(controller._updateAllDictionaryModal?.setVisible).toHaveBeenCalledWith(true);
    });

    test('bulk update confirmation enqueues the discovered update tasks', async ({window}) => {
        const {modalNode} = setupSettingsDom(window);
        const controller = createController(modalNode);
        controller._pendingUpdateTasks = [
            {type: 'update', dictionaryTitle: 'Dictionary A', downloadUrl: 'https://example.invalid/a.zip'},
            {type: 'update', dictionaryTitle: 'Dictionary B', downloadUrl: 'https://example.invalid/b.zip'},
        ];
        controller._enqueueTask = vi.fn();
        controller._hideUpdatesAvailableButton = vi.fn();

        controller._onDictionaryConfirmUpdateAll(new window.MouseEvent('click'));

        expect(controller._updateAllDictionaryModal?.setVisible).toHaveBeenCalledWith(false);
        expect(controller._enqueueTask).toHaveBeenNthCalledWith(1, {type: 'update', dictionaryTitle: 'Dictionary A', downloadUrl: 'https://example.invalid/a.zip'});
        expect(controller._enqueueTask).toHaveBeenNthCalledWith(2, {type: 'update', dictionaryTitle: 'Dictionary B', downloadUrl: 'https://example.invalid/b.zip'});
        expect(controller._hideUpdatesAvailableButton).toHaveBeenNthCalledWith(1, 'Dictionary A');
        expect(controller._hideUpdatesAvailableButton).toHaveBeenNthCalledWith(2, 'Dictionary B');
        expect(controller._pendingUpdateTasks).toStrictEqual([]);
    });
});

/* eslint-enable no-underscore-dangle, @typescript-eslint/unbound-method */
