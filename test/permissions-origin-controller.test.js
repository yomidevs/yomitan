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
import {querySelectorNotNull} from '../ext/js/dom/query-selector.js';
import {PermissionsOriginController} from '../ext/js/pages/settings/permissions-origin-controller.js';
import {setupDomTest} from './fixtures/dom-test.js';

const {window, teardown} = await setupDomTest('ext/permissions.html');
const {document} = window;

const origin = 'https://example.com/*';

const chromeMock = {
    runtime: {lastError: void 0},
    permissions: {
        /** @param {(result: {origins: string[], permissions: string[]}) => void} callback */
        getAll: (callback) => { callback({origins: [origin], permissions: []}); },
        remove: vi.fn((_permissions, /** @type {(result: boolean) => void} */ callback) => { callback(true); }),
    },
};
vi.stubGlobal('chrome', chromeMock);

const originTemplate = document.createElement('template');
originTemplate.innerHTML = '<div class="permissions-origin-index"></div><input type="text" class="permissions-origin-input" readonly><button type="button" class="permissions-origin-button"></button>';

const settingsController = /** @type {import('../ext/js/pages/settings/settings-controller.js').SettingsController} */ (/** @type {unknown} */ ({
    on: () => {},
    instantiateTemplateFragment: () => document.importNode(originTemplate.content, true),
}));

afterAll(() => {
    vi.unstubAllGlobals();
    teardown(global);
});

/**
 * @param {?string} action
 */
async function closeOriginMenu(action) {
    const container = querySelectorNotNull(document, '#permissions-origin-list');
    /** @type {HTMLElement} */
    const menuButton = querySelectorNotNull(container, '.permissions-origin-button');
    menuButton.dispatchEvent(new window.CustomEvent('menuClose', {detail: {action, item: null, cause: action === null ? 'outside' : 'item'}}));
    await Promise.resolve();
}

describe('PermissionsOriginController', () => {
    const controller = new PermissionsOriginController(settingsController);
    test('prepare', async () => {
        await controller.prepare();
        /** @type {HTMLInputElement} */
        const input = querySelectorNotNull(document, '#permissions-origin-list .permissions-origin-input');
        expect(input.value).toBe(origin);
    });
    test('closing the origin menu without picking an action keeps the origin', async () => {
        chromeMock.permissions.remove.mockClear();
        await closeOriginMenu(null);
        expect(chromeMock.permissions.remove).not.toHaveBeenCalled();
    });
    test('the remove action removes the origin', async () => {
        chromeMock.permissions.remove.mockClear();
        await closeOriginMenu('remove');
        expect(chromeMock.permissions.remove).toHaveBeenCalledWith({origins: [origin]}, expect.any(Function));
    });
});
