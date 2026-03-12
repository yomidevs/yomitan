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

import {afterAll, describe, expect, test, vi} from 'vitest';
import {DictionaryImportController, ImportProgressTracker} from '../ext/js/pages/settings/dictionary-import-controller.js';
import {setupDomTest} from './fixtures/dom-test.js';

const testEnv = await setupDomTest();
afterAll(async () => {
    await testEnv.teardown(global);
});

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

/**
 * @param {Partial<import('dictionary-recommended.js').LanguageRecommendedDictionaries>} [overrides]
 * @returns {import('dictionary-recommended.js').LanguageRecommendedDictionaries}
 */
function createLanguageRecommendations(overrides = {}) {
    return {
        terms: [],
        kanji: [],
        frequency: [],
        grammar: [],
        pronunciation: [],
        ...overrides,
    };
}

/**
 * @returns {DictionaryImportController}
 */
function createControllerForInternalTests() {
    return /** @type {DictionaryImportController} */ (Object.create(DictionaryImportController.prototype));
}

/**
 * @param {Document} document
 * @param {string} value
 * @returns {HTMLSelectElement}
 */
function createLanguageSelect(document, value) {
    const select = document.createElement('select');
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
    select.value = value;
    return select;
}

/**
 * @param {string} name
 * @returns {Function}
 * @throws {Error}
 */
function getDictionaryImportControllerMethod(name) {
    const method = /** @type {unknown} */ (Reflect.get(DictionaryImportController.prototype, name));
    if (typeof method !== 'function') {
        throw new Error(`Expected DictionaryImportController.${name} to be a function`);
    }
    return method;
}

describe('Dictionary import progress steps', () => {
    const {window} = testEnv;

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

describe('Welcome recommended dictionary auto import', () => {
    const {window} = testEnv;
    const resolveRecommendedLanguage = /** @type {(requestedLanguage: string, recommendedDictionaries: import('dictionary-recommended.js').RecommendedDictionaries, allowJapaneseFallback: boolean) => string | null} */ (getDictionaryImportControllerMethod('_resolveRecommendedLanguage'));
    const getWelcomeAutoImportDecision = /** @type {(requestedLanguage: string, recommendedDictionaries: import('dictionary-recommended.js').RecommendedDictionaries, installedDictionaries: import('dictionary-importer').Summary[]) => {status: string, resolvedLanguage: string | null, urls: string[]}} */ (getDictionaryImportControllerMethod('_getWelcomeAutoImportDecision'));
    const onWelcomeLanguageSelectChanged = /** @type {(event: Event) => Promise<void>} */ (getDictionaryImportControllerMethod('_onWelcomeLanguageSelectChanged'));

    test('resolves exact and base language without Japanese fallback', () => {
        const controller = createControllerForInternalTests();
        const recommended = {
            en: createLanguageRecommendations({terms: [{name: 'A', downloadUrl: 'https://example.invalid/a.zip', description: 'A'}]}),
            ja: createLanguageRecommendations({terms: [{name: 'J', downloadUrl: 'https://example.invalid/j.zip', description: 'J'}]}),
        };

        const exact = resolveRecommendedLanguage.call(controller, 'en', recommended, false);
        const base = resolveRecommendedLanguage.call(controller, 'en-US', recommended, false);
        const none = resolveRecommendedLanguage.call(controller, 'fr-CA', recommended, false);

        expect(exact).toBe('en');
        expect(base).toBe('en');
        expect(none).toBeNull();
    });

    test('does not fallback to Japanese for welcome auto import', () => {
        const controller = createControllerForInternalTests();
        const recommended = {
            ja: createLanguageRecommendations({terms: [{name: 'Jitendex', downloadUrl: 'https://example.invalid/jitendex.zip', description: 'J'}]}),
        };
        const decision = getWelcomeAutoImportDecision.call(controller, 'fr', recommended, []);
        expect(decision.status).toBe('no-match');
    });

    test('flattens categories, de-duplicates URLs, and skips installed dictionaries', () => {
        const controller = createControllerForInternalTests();
        const recommended = {
            en: createLanguageRecommendations({
                terms: [
                    {name: 'A', downloadUrl: 'https://example.invalid/a.zip', description: 'A'},
                    {name: 'B', downloadUrl: 'https://example.invalid/b.zip', description: 'B'},
                ],
                kanji: [
                    {name: 'B-duplicate', downloadUrl: 'https://example.invalid/b.zip', description: 'B2'},
                ],
                frequency: [
                    {name: 'F', downloadUrl: 'https://example.invalid/f.zip', description: 'F'},
                ],
                pronunciation: [
                    {name: 'P', downloadUrl: 'https://example.invalid/p.zip', description: 'P'},
                ],
            }),
        };
        const installed = /** @type {import('dictionary-importer').Summary[]} */ (/** @type {unknown} */ ([
            {title: 'B', downloadUrl: 'https://example.invalid/b.zip'},
            {title: 'already-url', downloadUrl: 'https://example.invalid/p.zip'},
        ]));

        const decision = getWelcomeAutoImportDecision.call(controller, 'en-US', recommended, installed);
        expect(decision.status).toBe('ready');
        if (decision.status !== 'ready') {
            throw new Error(`Expected ready status, got ${decision.status}`);
        }
        expect(decision.resolvedLanguage).toBe('en');
        expect(decision.urls).toStrictEqual([
            'https://example.invalid/a.zip',
            'https://example.invalid/f.zip',
        ]);
    });

    test('returns already-installed when all recommendations are already present', () => {
        const controller = createControllerForInternalTests();
        const recommended = {
            en: createLanguageRecommendations({
                terms: [
                    {name: 'A', downloadUrl: 'https://example.invalid/a.zip', description: 'A'},
                ],
            }),
        };
        const installed = /** @type {import('dictionary-importer').Summary[]} */ (/** @type {unknown} */ ([
            {title: 'A', downloadUrl: 'https://example.invalid/a.zip'},
        ]));
        const decision = getWelcomeAutoImportDecision.call(controller, 'en', recommended, installed);
        expect(decision.status).toBe('already-installed');
    });

    test('change handler does not auto-import outside welcome page', async () => {
        const controller = createControllerForInternalTests();
        Reflect.set(controller, '_welcomeLanguageAutoImportEnabled', false);
        const importFilesFromURLs = vi.fn().mockResolvedValue(void 0);
        Reflect.set(controller, 'importFilesFromURLs', importFilesFromURLs);

        const select = createLanguageSelect(window.document, 'en');
        await onWelcomeLanguageSelectChanged.call(controller, /** @type {Event} */ (/** @type {unknown} */ ({currentTarget: select})));

        expect(importFilesFromURLs).not.toHaveBeenCalled();
    });

    test('change handler shows no-match status and does not import', async () => {
        const controller = createControllerForInternalTests();
        Reflect.set(controller, '_welcomeLanguageAutoImportEnabled', true);
        Reflect.set(controller, '_modifying', false);
        Reflect.set(controller, '_settingsController', {
            getDictionaryInfo: vi.fn().mockResolvedValue([]),
        });
        Reflect.set(controller, '_loadRecommendedDictionaries', vi.fn().mockResolvedValue({
            recommendedDictionaries: {
                ja: createLanguageRecommendations({
                    terms: [{name: 'Jitendex', downloadUrl: 'https://example.invalid/jitendex.zip', description: 'J'}],
                }),
            },
            source: 'extension-data',
            url: '../../data/recommended-dictionaries.json',
        }));
        const setWelcomeLanguageAutoImportStatus = vi.fn();
        Reflect.set(controller, '_setWelcomeLanguageAutoImportStatus', setWelcomeLanguageAutoImportStatus);
        const importFilesFromURLs = vi.fn().mockResolvedValue(void 0);
        Reflect.set(controller, 'importFilesFromURLs', importFilesFromURLs);

        const select = createLanguageSelect(window.document, 'de');
        await onWelcomeLanguageSelectChanged.call(controller, /** @type {Event} */ (/** @type {unknown} */ ({currentTarget: select})));

        expect(importFilesFromURLs).not.toHaveBeenCalled();
        const lastCall = setWelcomeLanguageAutoImportStatus.mock.calls.at(-1);
        expect(lastCall?.[0]).toContain('No recommended dictionaries are currently available');
        expect(lastCall?.[0]).toContain('"de"');
    });
});
