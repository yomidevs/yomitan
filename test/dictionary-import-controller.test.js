/*
 * Copyright (C) 2023-2025  Yomitan Authors
 * Copyright (C) 2020-2022  Yomichan Authors
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

import {afterAll, describe, expect, test} from 'vitest';
import {DictionaryImportController, ImportProgressTracker} from '../ext/js/pages/settings/dictionary-import-controller.js';
import {setupDomTest} from './fixtures/dom-test.js';

const testEnv = await setupDomTest();

/**
 * @param {Document} document
 * @returns {HTMLElement}
 * @throws {Error}
 */
function setupProgressDom(document) {
    document.body.innerHTML = `
        <div class="dictionary-import-progress">
            <div class="progress-info"></div>
            <div class="progress-bar"></div>
            <div class="progress-status"></div>
        </div>
    `;
    const info = document.querySelector('.dictionary-import-progress .progress-info');
    if (!(info instanceof HTMLElement)) {
        throw new Error('Expected progress info element');
    }
    return info;
}

/**
 * @returns {import('dictionary-importer').ImportSteps}
 * @throws {Error}
 */
function getFileImportSteps() {
    const getFileImportStepsMethod = Reflect.get(DictionaryImportController.prototype, '_getFileImportSteps');
    if (typeof getFileImportStepsMethod !== 'function') {
        throw new Error('Expected _getFileImportSteps method');
    }
    return getFileImportStepsMethod.call({});
}

/**
 * @returns {import('dictionary-importer').ImportSteps}
 * @throws {Error}
 */
function getUrlImportSteps() {
    const getUrlImportStepsMethod = Reflect.get(DictionaryImportController.prototype, '_getUrlImportSteps');
    if (typeof getUrlImportStepsMethod !== 'function') {
        throw new Error('Expected _getUrlImportSteps method');
    }
    /** @type {Record<string, unknown>} */
    const context = {};
    Reflect.set(context, '_getFileImportSteps', () => getFileImportSteps());
    return getUrlImportStepsMethod.call(context);
}

describe('Dictionary import progress steps', () => {
    const {window, teardown} = testEnv;

    afterAll(async () => {
        await teardown(global);
    });

    test('File and URL import steps exclude validation phase', () => {
        const fileImportSteps = getFileImportSteps();
        expect(fileImportSteps.map(({label}) => label)).toStrictEqual([
            '',
            'Initializing import',
            'Loading dictionary',
            'Importing data',
            'Finalizing import',
        ]);

        const urlImportSteps = getUrlImportSteps();
        expect(urlImportSteps.map(({label}) => label)).toStrictEqual([
            '',
            'Initializing import',
            'Downloading dictionary',
            'Loading dictionary',
            'Importing data',
            'Finalizing import',
        ]);

        for (const label of [...fileImportSteps, ...urlImportSteps].map(({label: stepLabel}) => stepLabel.toLowerCase())) {
            expect(label.includes('validat')).toBe(false);
        }
    });

    test('ImportProgressTracker keeps step numbering stable without validation', () => {
        const infoLabel = setupProgressDom(window.document);
        const steps = getFileImportSteps();
        const tracker = new ImportProgressTracker(steps, 1);

        expect(infoLabel.textContent).toBe('Importing dictionary - Step 1 of 5: ...');

        tracker.onNextDictionary();
        expect(infoLabel.textContent).toBe('Importing dictionary - Step 2 of 5: Initializing import...');

        tracker.onProgress({nextStep: true, index: 0, count: 0});
        expect(infoLabel.textContent).toBe('Importing dictionary - Step 3 of 5: Loading dictionary...');

        tracker.onProgress({nextStep: true, index: 0, count: 0});
        expect(infoLabel.textContent).toBe('Importing dictionary - Step 4 of 5: Importing data...');

        tracker.onProgress({nextStep: true, index: 0, count: 0});
        expect(infoLabel.textContent).toBe('Importing dictionary - Step 5 of 5: Finalizing import...');

        tracker.onProgress({nextStep: true, index: 0, count: 0});
        expect(infoLabel.textContent).toBe('Importing dictionary - Step 5 of 5: Finalizing import...');
    });
});
