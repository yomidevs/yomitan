/*
 * Copyright (C) 2023-2024  Yomitan Authors
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

import fs from 'fs';
import {fileURLToPath} from 'node:url';
import path from 'path';
import {describe, expect, test, vi} from 'vitest';
import {OptionsUtil} from '../ext/js/data/options-util.js';
import {TemplatePatcher} from '../ext/js/templates/template-patcher.js';
import {chrome, fetch} from './mocks/common.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));

vi.stubGlobal('fetch', fetch);
vi.stubGlobal('chrome', chrome);

/**
 * @returns {unknown}
 */
function createProfileOptionsTestData1() {
    return {
        version: 14,
        general: {
            enable: true,
            enableClipboardPopups: false,
            resultOutputMode: 'group',
            debugInfo: false,
            maxResults: 32,
            showAdvanced: false,
            popupDisplayMode: 'default',
            popupWidth: 400,
            popupHeight: 250,
            popupHorizontalOffset: 0,
            popupVerticalOffset: 10,
            popupHorizontalOffset2: 10,
            popupVerticalOffset2: 0,
            popupHorizontalTextPosition: 'below',
            popupVerticalTextPosition: 'before',
            popupScalingFactor: 1,
            popupScaleRelativeToPageZoom: false,
            popupScaleRelativeToVisualViewport: true,
            showGuide: true,
            compactTags: false,
            compactGlossaries: false,
            mainDictionary: '',
            popupTheme: 'default',
            popupOuterTheme: 'default',
            customPopupCss: '',
            customPopupOuterCss: '',
            enableWanakana: true,
            enableClipboardMonitor: false,
            showPitchAccentDownstepNotation: true,
            showPitchAccentPositionNotation: true,
            showPitchAccentGraph: false,
            showIframePopupsInRootFrame: false,
            useSecurePopupFrameUrl: true,
            usePopupShadowDom: true,
        },
        audio: {
            enabled: true,
            sources: ['jpod101', 'text-to-speech', 'custom', 'jpod101-alternate'],
            volume: 100,
            autoPlay: false,
            customSourceUrl: 'http://localhost/audio.mp3?term={expression}&reading={reading}',
            textToSpeechVoice: 'example-voice',
        },
        scanning: {
            middleMouse: true,
            touchInputEnabled: true,
            selectText: true,
            alphanumeric: true,
            autoHideResults: false,
            delay: 20,
            length: 10,
            modifier: 'shift',
            deepDomScan: false,
            popupNestingMaxDepth: 0,
            enablePopupSearch: false,
            enableOnPopupExpressions: false,
            enableOnSearchPage: true,
            enableSearchTags: false,
            layoutAwareScan: false,
            scanAltText: true,
        },
        translation: {
            convertHalfWidthCharacters: 'false',
            convertNumericCharacters: 'false',
            convertAlphabeticCharacters: 'false',
            convertHiraganaToKatakana: 'false',
            convertKatakanaToHiragana: 'variant',
            collapseEmphaticSequences: 'false',
        },
        dictionaries: {
            'Test Dictionary': {
                priority: 0,
                enabled: true,
                allowSecondarySearches: false,
            },
        },
        parsing: {
            enableScanningParser: true,
            enableMecabParser: false,
            selectedParser: null,
            termSpacing: true,
            readingMode: 'hiragana',
        },
        anki: {
            enable: false,
            server: 'http://127.0.0.1:8765',
            tags: ['yomitan'],
            sentenceExt: 200,
            screenshot: {format: 'png', quality: 92},
            terms: {
                deck: '',
                model: '',
                fields: {
                    expression: '{selection-text}',
                },
            },
            kanji: {
                deck: '',
                model: '',
                fields: {
                    expression: '{selection-text}',
                },
            },
            duplicateScope: 'collection',
            fieldTemplates: null,
        },
    };
}

/**
 * @returns {unknown}
 */
function createOptionsTestData1() {
    return {
        profiles: [
            {
                name: 'Default',
                options: createProfileOptionsTestData1(),
                conditionGroups: [
                    {
                        conditions: [
                            {
                                type: 'popupLevel',
                                operator: 'equal',
                                value: 1,
                            },
                            {
                                type: 'popupLevel',
                                operator: 'notEqual',
                                value: 0,
                            },
                            {
                                type: 'popupLevel',
                                operator: 'lessThan',
                                value: 3,
                            },
                            {
                                type: 'popupLevel',
                                operator: 'greaterThan',
                                value: 0,
                            },
                            {
                                type: 'popupLevel',
                                operator: 'lessThanOrEqual',
                                value: 2,
                            },
                            {
                                type: 'popupLevel',
                                operator: 'greaterThanOrEqual',
                                value: 1,
                            },
                        ],
                    },
                    {
                        conditions: [
                            {
                                type: 'url',
                                operator: 'matchDomain',
                                value: 'example.com',
                            },
                            {
                                type: 'url',
                                operator: 'matchRegExp',
                                value: 'example\\.com',
                            },
                        ],
                    },
                    {
                        conditions: [
                            {
                                type: 'modifierKeys',
                                operator: 'are',
                                value: [
                                    'ctrl',
                                    'shift',
                                ],
                            },
                            {
                                type: 'modifierKeys',
                                operator: 'areNot',
                                value: [
                                    'alt',
                                    'shift',
                                ],
                            },
                            {
                                type: 'modifierKeys',
                                operator: 'include',
                                value: 'alt',
                            },
                            {
                                type: 'modifierKeys',
                                operator: 'notInclude',
                                value: 'ctrl',
                            },
                        ],
                    },
                ],
            },
        ],
        profileCurrent: 0,
        version: 2,
        global: {
            database: {
                prefixWildcardsSupported: false,
            },
        },
    };
}


/**
 * @returns {unknown}
 */
function createProfileOptionsUpdatedTestData1() {
    return {
        general: {
            enable: true,
            language: 'ja',
            resultOutputMode: 'group',
            debugInfo: false,
            maxResults: 32,
            fontFamily: '',
            fontSize: 14,
            lineHeight: '1.5',
            showAdvanced: false,
            showDebug: false,
            popupDisplayMode: 'default',
            popupWidth: 400,
            popupHeight: 250,
            popupHorizontalOffset: 0,
            popupVerticalOffset: 10,
            popupHorizontalOffset2: 10,
            popupVerticalOffset2: 0,
            popupHorizontalTextPosition: 'below',
            popupVerticalTextPosition: 'before',
            popupScalingFactor: 1,
            popupScaleRelativeToPageZoom: false,
            popupScaleRelativeToVisualViewport: true,
            showGuide: true,
            enableContextMenuScanSelected: true,
            compactTags: false,
            glossaryLayoutMode: 'default',
            mainDictionary: '',
            popupTheme: 'light',
            popupOuterTheme: 'light',
            customPopupCss: '',
            customPopupOuterCss: '',
            enableWanakana: true,
            showPitchAccentDownstepNotation: true,
            showPitchAccentPositionNotation: true,
            showPitchAccentGraph: false,
            showIframePopupsInRootFrame: false,
            useSecurePopupFrameUrl: true,
            usePopupShadowDom: true,
            usePopupWindow: false,
            popupCurrentIndicatorMode: 'triangle',
            popupActionBarVisibility: 'auto',
            popupActionBarLocation: 'top',
            frequencyDisplayMode: 'split-tags-grouped',
            termDisplayMode: 'ruby',
            sortFrequencyDictionary: null,
            sortFrequencyDictionaryOrder: 'descending',
            stickySearchHeader: false,
        },
        audio: {
            enabled: true,
            sources: [
                {
                    type: 'jpod101',
                    url: '',
                    voice: '',
                },
                {
                    type: 'text-to-speech',
                    url: '',
                    voice: 'example-voice',
                },
                {
                    type: 'custom',
                    url: 'http://localhost/audio.mp3?term={term}&reading={reading}',
                    voice: '',
                },
                {
                    type: 'language-pod-101',
                    url: '',
                    voice: '',
                },
            ],
            volume: 100,
            autoPlay: false,
        },
        scanning: {
            touchInputEnabled: true,
            selectText: true,
            alphanumeric: true,
            autoHideResults: false,
            delay: 20,
            length: 10,
            deepDomScan: false,
            popupNestingMaxDepth: 0,
            enablePopupSearch: false,
            enableOnPopupExpressions: false,
            enableOnSearchPage: true,
            enableSearchTags: false,
            layoutAwareScan: false,
            hideDelay: 0,
            pointerEventsEnabled: false,
            matchTypePrefix: false,
            hidePopupOnCursorExit: false,
            hidePopupOnCursorExitDelay: 0,
            normalizeCssZoom: true,
            preventMiddleMouse: {
                onWebPages: false,
                onPopupPages: false,
                onSearchPages: false,
                onSearchQuery: false,
            },
            scanWithoutMousemove: true,
            scanResolution: 'character',
            inputs: [
                {
                    include: 'shift',
                    exclude: 'mouse0',
                    types: {
                        mouse: true,
                        touch: false,
                        pen: false,
                    },
                    options: {
                        showAdvanced: false,
                        searchTerms: true,
                        searchKanji: true,
                        scanOnTouchTap: true,
                        scanOnTouchMove: false,
                        scanOnTouchPress: false,
                        scanOnTouchRelease: false,
                        scanOnPenMove: true,
                        scanOnPenHover: true,
                        scanOnPenReleaseHover: false,
                        scanOnPenPress: true,
                        scanOnPenRelease: false,
                        preventTouchScrolling: true,
                        preventPenScrolling: true,
                    },
                },
                {
                    include: 'mouse2',
                    exclude: '',
                    types: {
                        mouse: true,
                        touch: false,
                        pen: false,
                    },
                    options: {
                        showAdvanced: false,
                        searchTerms: true,
                        searchKanji: true,
                        scanOnTouchTap: true,
                        scanOnTouchMove: false,
                        scanOnTouchPress: false,
                        scanOnTouchRelease: false,
                        scanOnPenMove: true,
                        scanOnPenHover: true,
                        scanOnPenReleaseHover: false,
                        scanOnPenPress: true,
                        scanOnPenRelease: false,
                        preventTouchScrolling: true,
                        preventPenScrolling: true,
                    },
                },
                {
                    include: '',
                    exclude: '',
                    types: {
                        mouse: false,
                        touch: true,
                        pen: true,
                    },
                    options: {
                        showAdvanced: false,
                        searchTerms: true,
                        searchKanji: true,
                        scanOnTouchTap: true,
                        scanOnTouchMove: false,
                        scanOnTouchPress: false,
                        scanOnTouchRelease: false,
                        scanOnPenMove: true,
                        scanOnPenHover: true,
                        scanOnPenReleaseHover: false,
                        scanOnPenPress: true,
                        scanOnPenRelease: false,
                        preventTouchScrolling: true,
                        preventPenScrolling: true,
                    },
                },
            ],
        },
        translation: {
            searchResolution: 'letter',
            textReplacements: {
                searchOriginal: true,
                groups: [],
            },
        },
        dictionaries: [
            {
                name: 'Test Dictionary',
                alias: 'Test Dictionary',
                priority: 0,
                enabled: true,
                allowSecondarySearches: false,
                definitionsCollapsible: 'not-collapsible',
                partsOfSpeechFilter: true,
                useDeinflections: true,
            },
        ],
        parsing: {
            enableScanningParser: true,
            enableMecabParser: false,
            selectedParser: null,
            termSpacing: true,
            readingMode: 'hiragana',
        },
        anki: {
            enable: false,
            server: 'http://127.0.0.1:8765',
            tags: ['yomitan'],
            screenshot: {format: 'png', quality: 92},
            terms: {
                deck: '',
                model: '',
                fields: {
                    expression: '{popup-selection-text}',
                },
            },
            kanji: {
                deck: '',
                model: '',
                fields: {
                    expression: '{popup-selection-text}',
                },
            },
            duplicateBehavior: 'new',
            duplicateScope: 'collection',
            duplicateScopeCheckAllModels: false,
            displayTagsAndFlags: 'never',
            checkForDuplicates: true,
            fieldTemplates: null,
            suspendNewCards: false,
            noteGuiMode: 'browse',
            apiKey: '',
            downloadTimeout: 0,
        },
        sentenceParsing: {
            scanExtent: 200,
            terminationCharacterMode: 'custom',
            terminationCharacters: [
                {enabled: true, character1: '「', character2: '」', includeCharacterAtStart: false, includeCharacterAtEnd: false},
                {enabled: true, character1: '『', character2: '』', includeCharacterAtStart: false, includeCharacterAtEnd: false},
                {enabled: true, character1: '"', character2: '"', includeCharacterAtStart: false, includeCharacterAtEnd: false},
                {enabled: true, character1: '\'', character2: '\'', includeCharacterAtStart: false, includeCharacterAtEnd: false},
                {enabled: true, character1: '.', character2: null, includeCharacterAtStart: false, includeCharacterAtEnd: true},
                {enabled: true, character1: '!', character2: null, includeCharacterAtStart: false, includeCharacterAtEnd: true},
                {enabled: true, character1: '?', character2: null, includeCharacterAtStart: false, includeCharacterAtEnd: true},
                {enabled: true, character1: '．', character2: null, includeCharacterAtStart: false, includeCharacterAtEnd: true},
                {enabled: true, character1: '。', character2: null, includeCharacterAtStart: false, includeCharacterAtEnd: true},
                {enabled: true, character1: '！', character2: null, includeCharacterAtStart: false, includeCharacterAtEnd: true},
                {enabled: true, character1: '？', character2: null, includeCharacterAtStart: false, includeCharacterAtEnd: true},
                {enabled: true, character1: '…', character2: null, includeCharacterAtStart: false, includeCharacterAtEnd: true},
                {enabled: true, character1: '︒', character2: null, includeCharacterAtStart: false, includeCharacterAtEnd: true},
                {enabled: true, character1: '︕', character2: null, includeCharacterAtStart: false, includeCharacterAtEnd: true},
                {enabled: true, character1: '︖', character2: null, includeCharacterAtStart: false, includeCharacterAtEnd: true},
                {enabled: true, character1: '︙', character2: null, includeCharacterAtStart: false, includeCharacterAtEnd: true},
            ],
        },
        inputs: {
            /* eslint-disable @stylistic/no-multi-spaces */
            hotkeys: [
                {action: 'close',             argument: '',  key: 'Escape',    modifiers: [],       scopes: ['popup'], enabled: true},
                {action: 'focusSearchBox',    argument: '',  key: 'Escape',    modifiers: [],       scopes: ['search'], enabled: true},
                {action: 'previousEntry',     argument: '3', key: 'PageUp',    modifiers: ['alt'],  scopes: ['popup', 'search'], enabled: true},
                {action: 'nextEntry',         argument: '3', key: 'PageDown',  modifiers: ['alt'],  scopes: ['popup', 'search'], enabled: true},
                {action: 'lastEntry',         argument: '',  key: 'End',       modifiers: ['alt'],  scopes: ['popup', 'search'], enabled: true},
                {action: 'firstEntry',        argument: '',  key: 'Home',      modifiers: ['alt'],  scopes: ['popup', 'search'], enabled: true},
                {action: 'previousEntry',     argument: '1', key: 'ArrowUp',   modifiers: ['alt'],  scopes: ['popup', 'search'], enabled: true},
                {action: 'nextEntry',         argument: '1', key: 'ArrowDown', modifiers: ['alt'],  scopes: ['popup', 'search'], enabled: true},
                {action: 'historyBackward',   argument: '',  key: 'KeyB',      modifiers: ['alt'],  scopes: ['popup', 'search'], enabled: true},
                {action: 'historyForward',    argument: '',  key: 'KeyF',      modifiers: ['alt'],  scopes: ['popup', 'search'], enabled: true},
                {action: 'addNoteKanji',      argument: '',  key: 'KeyK',      modifiers: ['alt'],  scopes: ['popup', 'search'], enabled: true},
                {action: 'addNoteTermKanji',  argument: '',  key: 'KeyE',      modifiers: ['alt'],  scopes: ['popup', 'search'], enabled: true},
                {action: 'addNoteTermKana',   argument: '',  key: 'KeyR',      modifiers: ['alt'],  scopes: ['popup', 'search'], enabled: true},
                {action: 'playAudio',         argument: '',  key: 'KeyP',      modifiers: ['alt'],  scopes: ['popup', 'search'], enabled: true},
                {action: 'viewNotes',         argument: '',  key: 'KeyV',      modifiers: ['alt'],  scopes: ['popup', 'search'], enabled: true},
                {action: 'copyHostSelection', argument: '',  key: 'KeyC',      modifiers: ['ctrl'], scopes: ['popup'], enabled: true},
                {action: 'profilePrevious',   argument: '',  key: 'Minus',     modifiers: ['alt'],  scopes: ['popup', 'search', 'web'], enabled: true},
                {action: 'profileNext',       argument: '',  key: 'Equal',     modifiers: ['alt'],  scopes: ['popup', 'search', 'web'], enabled: true},
            ],
            /* eslint-enable @stylistic/no-multi-spaces */
        },
        popupWindow: {
            width: 400,
            height: 250,
            left: 0,
            top: 0,
            useLeft: false,
            useTop: false,
            windowType: 'popup',
            windowState: 'normal',
        },
        clipboard: {
            enableBackgroundMonitor: false,
            enableSearchPageMonitor: false,
            autoSearchContent: true,
            maximumSearchLength: 1000,
        },
        accessibility: {
            forceGoogleDocsHtmlRendering: false,
        },
    };
}

/**
 * @returns {unknown}
 */
function createOptionsUpdatedTestData1() {
    return {
        profiles: [
            {
                id: 'profile-0',
                name: 'Default',
                options: createProfileOptionsUpdatedTestData1(),
                conditionGroups: [
                    {
                        conditions: [
                            {
                                type: 'popupLevel',
                                operator: 'equal',
                                value: '1',
                            },
                            {
                                type: 'popupLevel',
                                operator: 'notEqual',
                                value: '0',
                            },
                            {
                                type: 'popupLevel',
                                operator: 'lessThan',
                                value: '3',
                            },
                            {
                                type: 'popupLevel',
                                operator: 'greaterThan',
                                value: '0',
                            },
                            {
                                type: 'popupLevel',
                                operator: 'lessThanOrEqual',
                                value: '2',
                            },
                            {
                                type: 'popupLevel',
                                operator: 'greaterThanOrEqual',
                                value: '1',
                            },
                        ],
                    },
                    {
                        conditions: [
                            {
                                type: 'url',
                                operator: 'matchDomain',
                                value: 'example.com',
                            },
                            {
                                type: 'url',
                                operator: 'matchRegExp',
                                value: 'example\\.com',
                            },
                        ],
                    },
                    {
                        conditions: [
                            {
                                type: 'modifierKeys',
                                operator: 'are',
                                value: 'ctrl, shift',
                            },
                            {
                                type: 'modifierKeys',
                                operator: 'areNot',
                                value: 'alt, shift',
                            },
                            {
                                type: 'modifierKeys',
                                operator: 'include',
                                value: 'alt',
                            },
                            {
                                type: 'modifierKeys',
                                operator: 'notInclude',
                                value: 'ctrl',
                            },
                        ],
                    },
                ],
            },
        ],
        profileCurrent: 0,
        version: 54,
        global: {
            database: {
                prefixWildcardsSupported: false,
            },
        },
    };
}

/**
 * @param {string} templates
 * @returns {Map<string, string>}
 */
function getHandlebarsPartials(templates) {
    const inlinePartialRegex = /{{~?#\*inline .*?"([^"]*)"~?}}.*?{{~?\/inline~?}}/gs;
    const matches = templates.matchAll(inlinePartialRegex);
    const partials = new Map();
    for (const match of matches) {
        const [template, name] = match;
        partials.set(name, template);
    }
    return partials;
}

describe('OptionsUtil', () => {
    test('Update', async () => {
        const optionsUtil = new OptionsUtil();
        await optionsUtil.prepare();

        const options = createOptionsTestData1();
        const optionsUpdated = structuredClone(await optionsUtil.update(options));
        const optionsExpected = createOptionsUpdatedTestData1();
        expect(optionsUpdated).toStrictEqual(optionsExpected);
    });

    test('CumulativeFieldTemplatesUpdates', async () => {
        const optionsUtil = new OptionsUtil();
        await optionsUtil.prepare();

        const options = /** @type {import('core').SafeAny} */ (createOptionsTestData1());

        const oldAnkiFieldTemplates = fs.readFileSync(path.join(dirname, 'data', 'templates', 'old-default-anki-field-templates.handlebars'), {encoding: 'utf8'});
        const defaultAnkiFieldTemplates = fs.readFileSync(path.join(dirname, '..', 'ext', 'data', 'templates', 'default-anki-field-templates.handlebars'), {encoding: 'utf8'});

        options.profiles[0].options.anki.fieldTemplates = oldAnkiFieldTemplates;
        const optionsUpdated = structuredClone(await optionsUtil.update(options));
        const fieldTemplatesUpdated = optionsUpdated.profiles[0].options.anki.fieldTemplates || '';

        const partialsUpdated = getHandlebarsPartials(fieldTemplatesUpdated);
        const partialsExpected = getHandlebarsPartials(defaultAnkiFieldTemplates);

        expect(partialsUpdated).toStrictEqual(partialsExpected);
    });

    describe('Default', () => {
        /** @type {((options: import('options-util').IntermediateOptions) => void)[]} */
        const data = [
            (options) => options,
            (options) => {
                delete options.profiles[0].options.audio.autoPlay;
            },
            (options) => {
                options.profiles[0].options.audio.autoPlay = void 0;
            },
        ];

        test.each(data)('default-test-%#', async (modify) => {
            const optionsUtil = new OptionsUtil();
            await optionsUtil.prepare();

            const options = optionsUtil.getDefault();
            const optionsModified = structuredClone(options);
            modify(optionsModified);
            const optionsUpdated = await optionsUtil.update(structuredClone(optionsModified));
            expect(structuredClone(optionsUpdated)).toStrictEqual(structuredClone(options));
        });
    });

    describe('FieldTemplatesUpdate', () => {
        const templatePatcher = new TemplatePatcher();
        /**
         * @param {string} fileName
         * @returns {string}
         */
        const loadDataFile = (fileName) => {
            const content = fs.readFileSync(fileName, {encoding: 'utf8'});
            return templatePatcher.parsePatch(content).addition;
        };

        /** @type {import('options-util').TemplateFieldUpdate[]} */
        const updates = [];
        const fileNameRegex = /^anki-field-templates-upgrade-v(\d+)\.handlebars$/;
        const templatesDirPath = path.join(dirname, '..', 'ext', 'data', 'templates');
        const templatesDir = fs.readdirSync(templatesDirPath, {encoding: 'utf8'});
        for (const fileName of templatesDir) {
            const match = fileNameRegex.exec(fileName);
            if (match !== null) {
                updates.push({
                    version: Number.parseInt(match[1], 10),
                    changes: loadDataFile(path.join(templatesDirPath, match[0])),
                });
            }
        }
        updates.sort((a, b) => a.version - b.version);
        /**
         * @param {number} startVersion
         * @param {number} targetVersion
         * @returns {string}
         */
        const getUpdateAdditions = (startVersion, targetVersion) => {
            let value = '';
            for (const {version, changes} of updates) {
                if (version <= startVersion || version > targetVersion || changes.length === 0) { continue; }
                if (value.length > 0) { value += '\n'; }
                value += changes;
            }
            return value;
        };

        const data = [
            // Standard format
            {
                oldVersion: 0,
                newVersion: 12,
                old: `
{{#*inline "character"}}
    {{~definition.character~}}
{{/inline}}

{{~> (lookup . "marker") ~}}`.trimStart(),

                expected: `
{{#*inline "character"}}
    {{~definition.character~}}
{{/inline}}

<<<UPDATE-ADDITIONS>>>
{{~> (lookup . "marker") ~}}`.trimStart(),
            },
            // Non-standard marker format
            {
                oldVersion: 0,
                newVersion: 12,
                old: `
{{#*inline "character"}}
    {{~definition.character~}}
{{/inline}}

{{~> (lookup . "marker2") ~}}`.trimStart(),

                expected: `
{{#*inline "character"}}
    {{~definition.character~}}
{{/inline}}

{{~> (lookup . "marker2") ~}}
<<<UPDATE-ADDITIONS>>>`.trimStart(),
            },
            // Empty test
            {
                oldVersion: 0,
                newVersion: 12,
                old: `
{{~> (lookup . "marker") ~}}`.trimStart(),

                expected: `
<<<UPDATE-ADDITIONS>>>
{{~> (lookup . "marker") ~}}`.trimStart(),
            },
            // Definition tags update
            {
                oldVersion: 0,
                newVersion: 12,
                old: `
{{#*inline "glossary-single"}}
    {{~#unless brief~}}
        {{~#if definitionTags~}}<i>({{#each definitionTags}}{{name}}{{#unless @last}}, {{/unless}}{{/each}})</i> {{/if~}}
        {{~#if only~}}({{#each only}}{{{.}}}{{#unless @last}}, {{/unless}}{{/each}} only) {{/if~}}
    {{~/unless~}}
{{/inline}}

{{#*inline "glossary-single2"}}
    {{~#unless brief~}}
        {{~#if definitionTags~}}<i>({{#each definitionTags}}{{name}}{{#unless @last}}, {{/unless}}{{/each}})</i> {{/if~}}
        {{~#if only~}}({{#each only}}{{{.}}}{{#unless @last}}, {{/unless}}{{/each}} only) {{/if~}}
    {{~/unless~}}
{{/inline}}

{{#*inline "glossary"}}
    {{~> glossary-single definition brief=brief compactGlossaries=compactGlossaries~}}
    {{~> glossary-single definition brief=brief compactGlossaries=../compactGlossaries~}}
{{/inline}}

{{~> (lookup . "marker") ~}}
`.trimStart(),

                expected: `
{{#*inline "glossary-single"}}
    {{~#unless brief~}}
        {{~#scope~}}
            {{~#set "any" false}}{{/set~}}
            {{~#if definitionTags~}}{{#each definitionTags~}}
                {{~#if (op "||" (op "!" ../data.compactTags) (op "!" redundant))~}}
                    {{~#if (get "any")}}, {{else}}<i>({{/if~}}
                    {{name}}
                    {{~#set "any" true}}{{/set~}}
                {{~/if~}}
            {{~/each~}}
            {{~#if (get "any")}})</i> {{/if~}}
            {{~/if~}}
        {{~/scope~}}
        {{~#if only~}}({{#each only}}{{{.}}}{{#unless @last}}, {{/unless}}{{/each}} only) {{/if~}}
    {{~/unless~}}
{{/inline}}

{{#*inline "glossary-single2"}}
    {{~#unless brief~}}
        {{~#scope~}}
            {{~#set "any" false}}{{/set~}}
            {{~#if definitionTags~}}{{#each definitionTags~}}
                {{~#if (op "||" (op "!" ../data.compactTags) (op "!" redundant))~}}
                    {{~#if (get "any")}}, {{else}}<i>({{/if~}}
                    {{name}}
                    {{~#set "any" true}}{{/set~}}
                {{~/if~}}
            {{~/each~}}
            {{~#if (get "any")}})</i> {{/if~}}
            {{~/if~}}
        {{~/scope~}}
        {{~#if only~}}({{#each only}}{{{.}}}{{#unless @last}}, {{/unless}}{{/each}} only) {{/if~}}
    {{~/unless~}}
{{/inline}}

{{#*inline "glossary"}}
    {{~> glossary-single definition brief=brief compactGlossaries=compactGlossaries data=.~}}
    {{~> glossary-single definition brief=brief compactGlossaries=../compactGlossaries data=../.~}}
{{/inline}}

<<<UPDATE-ADDITIONS>>>
{{~> (lookup . "marker") ~}}
`.trimStart(),
            },
            // Glossary and glossary-brief update
            {
                oldVersion: 7,
                newVersion: 12,
                old: `
{{#*inline "glossary-single"}}
    {{~#unless brief~}}
        {{~#scope~}}
            {{~#set "any" false}}{{/set~}}
            {{~#if definitionTags~}}{{#each definitionTags~}}
                {{~#if (op "||" (op "!" ../data.compactTags) (op "!" redundant))~}}
                    {{~#if (get "any")}}, {{else}}<i>({{/if~}}
                    {{name}}
                    {{~#set "any" true}}{{/set~}}
                {{~/if~}}
            {{~/each~}}
            {{~#if (get "any")}})</i> {{/if~}}
            {{~/if~}}
        {{~/scope~}}
        {{~#if only~}}({{#each only}}{{{.}}}{{#unless @last}}, {{/unless}}{{/each}} only) {{/if~}}
    {{~/unless~}}
    {{~#if glossary.[1]~}}
        {{~#if compactGlossaries~}}
            {{#each glossary}}{{#multiLine}}{{.}}{{/multiLine}}{{#unless @last}} | {{/unless}}{{/each}}
        {{~else~}}
            <ul>{{#each glossary}}<li>{{#multiLine}}{{.}}{{/multiLine}}</li>{{/each}}</ul>
        {{~/if~}}
    {{~else~}}
        {{~#multiLine}}{{glossary.[0]}}{{/multiLine~}}
    {{~/if~}}
{{/inline}}

{{#*inline "character"}}
    {{~definition.character~}}
{{/inline}}

{{#*inline "glossary"}}
    <div style="text-align: left;">
    {{~#if modeKanji~}}
        {{~#if definition.glossary.[1]~}}
            <ol>{{#each definition.glossary}}<li>{{.}}</li>{{/each}}</ol>
        {{~else~}}
            {{definition.glossary.[0]}}
        {{~/if~}}
    {{~else~}}
        {{~#if group~}}
            {{~#if definition.definitions.[1]~}}
                <ol>{{#each definition.definitions}}<li>{{> glossary-single brief=../brief compactGlossaries=../compactGlossaries data=../.}}</li>{{/each}}</ol>
            {{~else~}}
                {{~> glossary-single definition.definitions.[0] brief=brief compactGlossaries=compactGlossaries data=.~}}
            {{~/if~}}
        {{~else if merge~}}
            {{~#if definition.definitions.[1]~}}
                <ol>{{#each definition.definitions}}<li>{{> glossary-single brief=../brief compactGlossaries=../compactGlossaries data=../.}}</li>{{/each}}</ol>
            {{~else~}}
                {{~> glossary-single definition.definitions.[0] brief=brief compactGlossaries=compactGlossaries data=.~}}
            {{~/if~}}
        {{~else~}}
            {{~> glossary-single definition brief=brief compactGlossaries=compactGlossaries data=.~}}
        {{~/if~}}
    {{~/if~}}
    </div>
{{/inline}}

{{#*inline "glossary-brief"}}
    {{~> glossary brief=true ~}}
{{/inline}}

{{~> (lookup . "marker") ~}}`.trimStart(),

                expected: `
{{#*inline "glossary-single"}}
    {{~#unless brief~}}
        {{~#scope~}}
            {{~#set "any" false}}{{/set~}}
            {{~#each definitionTags~}}
                {{~#if (op "||" (op "!" @root.compactTags) (op "!" redundant))~}}
                    {{~#if (get "any")}}, {{else}}<i>({{/if~}}
                    {{name}}
                    {{~#set "any" true}}{{/set~}}
                {{~/if~}}
            {{~/each~}}
            {{~#unless noDictionaryTag~}}
                {{~#if (op "||" (op "!" @root.compactTags) (op "!==" dictionary (get "previousDictionary")))~}}
                    {{~#if (get "any")}}, {{else}}<i>({{/if~}}
                    {{dictionary}}
                    {{~#set "any" true}}{{/set~}}
                {{~/if~}}
            {{~/unless~}}
            {{~#if (get "any")}})</i> {{/if~}}
        {{~/scope~}}
        {{~#if only~}}({{#each only}}{{.}}{{#unless @last}}, {{/unless}}{{/each}} only) {{/if~}}
    {{~/unless~}}
    {{~#if (op "<=" glossary.length 1)~}}
        {{#each glossary}}{{#multiLine}}{{.}}{{/multiLine}}{{/each}}
    {{~else if @root.compactGlossaries~}}
        {{#each glossary}}{{#multiLine}}{{.}}{{/multiLine}}{{#unless @last}} | {{/unless}}{{/each}}
    {{~else~}}
        <ul>{{#each glossary}}<li>{{#multiLine}}{{.}}{{/multiLine}}</li>{{/each}}</ul>
    {{~/if~}}
    {{~#set "previousDictionary" dictionary~}}{{~/set~}}
{{/inline}}

{{#*inline "character"}}
    {{~definition.character~}}
{{/inline}}

{{~#*inline "glossary"~}}
    <div style="text-align: left;">
    {{~#scope~}}
        {{~#if (op "===" definition.type "term")~}}
            {{~> glossary-single definition brief=brief noDictionaryTag=noDictionaryTag ~}}
        {{~else if (op "||" (op "===" definition.type "termGrouped") (op "===" definition.type "termMerged"))~}}
            {{~#if (op ">" definition.definitions.length 1)~}}
                <ol>{{~#each definition.definitions~}}<li>{{~> glossary-single . brief=../brief noDictionaryTag=../noDictionaryTag ~}}</li>{{~/each~}}</ol>
            {{~else~}}
                {{~#each definition.definitions~}}{{~> glossary-single . brief=../brief noDictionaryTag=../noDictionaryTag ~}}{{~/each~}}
            {{~/if~}}
        {{~else if (op "===" definition.type "kanji")~}}
            {{~#if (op ">" definition.glossary.length 1)~}}
                <ol>{{#each definition.glossary}}<li>{{.}}</li>{{/each}}</ol>
            {{~else~}}
                {{~#each definition.glossary~}}{{.}}{{~/each~}}
            {{~/if~}}
        {{~/if~}}
    {{~/scope~}}
    </div>
{{~/inline~}}

{{#*inline "glossary-no-dictionary"}}
    {{~> glossary noDictionaryTag=true ~}}
{{/inline}}

{{#*inline "glossary-brief"}}
    {{~> glossary brief=true ~}}
{{/inline}}

<<<UPDATE-ADDITIONS>>>
{{~> (lookup . "marker") ~}}`.trimStart(),
            },
            // formatGlossary update
            {
                oldVersion: 12,
                newVersion: 13,
                old: `
{{#*inline "example"}}
    {{~#if (op "<=" glossary.length 1)~}}
        {{#each glossary}}{{#multiLine}}{{.}}{{/multiLine}}{{/each}}
    {{~else if @root.compactGlossaries~}}
        {{#each glossary}}{{#multiLine}}{{.}}{{/multiLine}}{{#unless @last}} | {{/unless}}{{/each}}
    {{~else~}}
        <ul>{{#each glossary}}<li>{{#multiLine}}{{.}}{{/multiLine}}</li>{{/each}}</ul>
    {{~/if~}}
{{/inline}}

{{~> (lookup . "marker") ~}}`.trimStart(),

                expected: `
{{#*inline "example"}}
    {{~#if (op "<=" glossary.length 1)~}}
        {{#each glossary}}{{#formatGlossary ../dictionary}}{{{.}}}{{/formatGlossary}}{{/each}}
    {{~else if @root.compactGlossaries~}}
        {{#each glossary}}{{#formatGlossary ../dictionary}}{{{.}}}{{/formatGlossary}}{{#unless @last}} | {{/unless}}{{/each}}
    {{~else~}}
        <ul>{{#each glossary}}<li>{{#formatGlossary ../dictionary}}{{{.}}}{{/formatGlossary}}</li>{{/each}}</ul>
    {{~/if~}}
{{/inline}}

<<<UPDATE-ADDITIONS>>>
{{~> (lookup . "marker") ~}}`.trimStart(),
            },
            // hasMedia/getMedia update
            {
                oldVersion: 12,
                newVersion: 13,
                old: `
{{#*inline "audio"}}
    {{~#if definition.audioFileName~}}
        [sound:{{definition.audioFileName}}]
    {{~/if~}}
{{/inline}}

{{#*inline "screenshot"}}
    <img src="{{definition.screenshotFileName}}" />
{{/inline}}

{{#*inline "clipboard-image"}}
    {{~#if definition.clipboardImageFileName~}}
        <img src="{{definition.clipboardImageFileName}}" />
    {{~/if~}}
{{/inline}}

{{#*inline "clipboard-text"}}
    {{~#if definition.clipboardText~}}{{definition.clipboardText}}{{~/if~}}
{{/inline}}

{{~> (lookup . "marker") ~}}`.trimStart(),

                expected: `
{{#*inline "audio"}}
    {{~#if (hasMedia "audio")~}}
        [sound:{{#getMedia "audio"}}{{/getMedia}}]
    {{~/if~}}
{{/inline}}

{{#*inline "screenshot"}}
    {{~#if (hasMedia "screenshot")~}}
        <img src="{{#getMedia "screenshot"}}{{/getMedia}}" />
    {{~/if~}}
{{/inline}}

{{#*inline "clipboard-image"}}
    {{~#if (hasMedia "clipboardImage")~}}
        <img src="{{#getMedia "clipboardImage"}}{{/getMedia}}" />
    {{~/if~}}
{{/inline}}

{{#*inline "clipboard-text"}}
    {{~#if (hasMedia "clipboardText")}}{{#getMedia "clipboardText"}}{{/getMedia}}{{/if~}}
{{/inline}}

<<<UPDATE-ADDITIONS>>>
{{~> (lookup . "marker") ~}}`.trimStart(),
            },
            // hasMedia/getMedia update
            {
                oldVersion: 12,
                newVersion: 13,
                old: `
{{! Pitch Accents }}
{{#*inline "pitch-accent-item-downstep-notation"}}
    {{~#scope~}}
        <span>
        {{~#set "style1a"~}}display:inline-block;position:relative;{{~/set~}}
        {{~#set "style1b"~}}padding-right:0.1em;margin-right:0.1em;{{~/set~}}
        {{~#set "style2a"~}}display:block;user-select:none;pointer-events:none;position:absolute;top:0.1em;left:0;right:0;height:0;border-top:0.1em solid;{{~/set~}}
        {{~#set "style2b"~}}right:-0.1em;height:0.4em;border-right:0.1em solid;{{~/set~}}
        {{~#each (getKanaMorae reading)~}}
            {{~#set "style1"}}{{#get "style1a"}}{{/get}}{{/set~}}
            {{~#set "style2"}}{{/set~}}
            {{~#if (isMoraPitchHigh @index ../position)}}
                {{~#set "style2"}}{{#get "style2a"}}{{/get}}{{/set~}}
                {{~#if (op "!" (isMoraPitchHigh (op "+" @index 1) ../position))~}}
                    {{~#set "style1" (op "+" (get "style1") (get "style1b"))}}{{/set~}}
                    {{~#set "style2" (op "+" (get "style2") (get "style2b"))}}{{/set~}}
                {{~/if~}}
            {{~/if~}}
            <span style="{{#get "style1"}}{{/get}}">{{{.}}}<span style="{{#get "style2"}}{{/get}}"></span></span>
        {{~/each~}}
        </span>
    {{~/scope~}}
{{/inline}}

{{#*inline "pitch-accent-item-graph-position-x"}}{{#op "+" 25 (op "*" index 50)}}{{/op}}{{/inline}}
{{#*inline "pitch-accent-item-graph-position-y"}}{{#op "+" 25 (op "?:" (isMoraPitchHigh index position) 0 50)}}{{/op}}{{/inline}}
{{#*inline "pitch-accent-item-graph-position"}}{{> pitch-accent-item-graph-position-x index=index position=position}} {{> pitch-accent-item-graph-position-y index=index position=position}}{{/inline}}
{{#*inline "pitch-accent-item-graph"}}
    {{~#scope~}}
        {{~#set "morae" (getKanaMorae reading)}}{{/set~}}
        {{~#set "morae-count" (property (get "morae") "length")}}{{/set~}}
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {{#op "+" 50 (op "*" 50 (get "morae-count"))}}{{/op}} 100" style="display:inline-block;height:2em;">
    <defs>
        <g id="term-pitch-accent-graph-dot"><circle cx="0" cy="0" r="15" style="fill:#000;stroke:#000;stroke-width:5;" /></g>
        <g id="term-pitch-accent-graph-dot-downstep"><circle cx="0" cy="0" r="15" style="fill:none;stroke:#000;stroke-width:5;" /><circle cx="0" cy="0" r="5" style="fill:none;stroke:#000;stroke-width:5;" /></g>
        <g id="term-pitch-accent-graph-triangle"><path d="M0 13 L15 -13 L-15 -13 Z" style="fill:none;stroke:#000;stroke-width:5;" /></g>
    </defs>
    <path style="fill:none;stroke:#000;stroke-width:5;" d="
    {{~#set "cmd" "M"}}{{/set~}}
    {{~#each (get "morae")~}}
        {{~#get "cmd"}}{{/get~}}
        {{~> pitch-accent-item-graph-position index=@index position=../position~}}
        {{~#set "cmd" "L"}}{{/set~}}
    {{~/each~}}
    "></path>
    <path style="fill:none;stroke:#000;stroke-width:5;stroke-dasharray:5 5;" d="M{{> pitch-accent-item-graph-position index=(op "-" (get "morae-count") 1) position=position}} L{{> pitch-accent-item-graph-position index=(get "morae-count") position=position}}"></path>
    {{#each (get "morae")}}
    <use href="{{#if (op "&&" (isMoraPitchHigh @index ../position) (op "!" (isMoraPitchHigh (op "+" @index 1) ../position)))}}#term-pitch-accent-graph-dot-downstep{{else}}#term-pitch-accent-graph-dot{{/if}}" x="{{> pitch-accent-item-graph-position-x index=@index position=../position}}" y="{{> pitch-accent-item-graph-position-y index=@index position=../position}}"></use>
    {{/each}}
    <use href="#term-pitch-accent-graph-triangle" x="{{> pitch-accent-item-graph-position-x index=(get "morae-count") position=position}}" y="{{> pitch-accent-item-graph-position-y index=(get "morae-count") position=position}}"></use>
</svg>
    {{~/scope~}}
{{/inline}}

{{#*inline "pitch-accent-item-position"~}}
    <span>[{{position}}]</span>
{{~/inline}}

{{#*inline "pitch-accent-item"}}
    {{~#if (op "==" format "downstep-notation")~}}
        {{~> pitch-accent-item-downstep-notation~}}
    {{~else if (op "==" format "graph")~}}
        {{~> pitch-accent-item-graph~}}
    {{~else if (op "==" format "position")~}}
        {{~> pitch-accent-item-position~}}
    {{~/if~}}
{{/inline}}

{{#*inline "pitch-accent-item-disambiguation"}}
    {{~#scope~}}
        {{~#set "exclusive" (spread exclusiveExpressions exclusiveReadings)}}{{/set~}}
        {{~#if (op ">" (property (get "exclusive") "length") 0)~}}
            {{~#set "separator" ""~}}{{/set~}}
            <em>({{#each (get "exclusive")~}}
                {{~#get "separator"}}{{/get~}}{{{.}}}
            {{~/each}} only) </em>
        {{~/if~}}
    {{~/scope~}}
{{/inline}}

{{#*inline "pitch-accent-list"}}
    {{~#if (op ">" pitchCount 0)~}}
        {{~#if (op ">" pitchCount 1)~}}<ol>{{~/if~}}
        {{~#each pitches~}}
            {{~#each pitches~}}
                {{~#if (op ">" ../../pitchCount 1)~}}<li>{{~/if~}}
                    {{~> pitch-accent-item-disambiguation~}}
                    {{~> pitch-accent-item format=../../format~}}
                {{~#if (op ">" ../../pitchCount 1)~}}</li>{{~/if~}}
            {{~/each~}}
        {{~/each~}}
        {{~#if (op ">" pitchCount 1)~}}</ol>{{~/if~}}
    {{~else~}}
        No pitch accent data
    {{~/if~}}
{{/inline}}

{{#*inline "pitch-accents"}}
    {{~> pitch-accent-list format='downstep-notation'~}}
{{/inline}}

{{#*inline "pitch-accent-graphs"}}
    {{~> pitch-accent-list format='graph'~}}
{{/inline}}

{{#*inline "pitch-accent-positions"}}
    {{~> pitch-accent-list format='position'~}}
{{/inline}}
{{! End Pitch Accents }}

{{~> (lookup . "marker") ~}}`.trimStart(),

                expected: `
{{! Pitch Accents }}
{{#*inline "pitch-accent-item"}}
    {{~#pronunciation format=format reading=reading downstepPosition=position nasalPositions=nasalPositions devoicePositions=devoicePositions~}}{{~/pronunciation~}}
{{/inline}}

{{#*inline "pitch-accent-item-disambiguation"}}
    {{~#scope~}}
        {{~#set "exclusive" (spread exclusiveExpressions exclusiveReadings)}}{{/set~}}
        {{~#if (op ">" (property (get "exclusive") "length") 0)~}}
            {{~#set "separator" ""~}}{{/set~}}
            <em>({{#each (get "exclusive")~}}
                {{~#get "separator"}}{{/get~}}{{{.}}}
            {{~/each}} only) </em>
        {{~/if~}}
    {{~/scope~}}
{{/inline}}

{{#*inline "pitch-accent-list"}}
    {{~#if (op ">" pitchCount 0)~}}
        {{~#if (op ">" pitchCount 1)~}}<ol>{{~/if~}}
        {{~#each pitches~}}
            {{~#each pitches~}}
                {{~#if (op ">" ../../pitchCount 1)~}}<li>{{~/if~}}
                    {{~> pitch-accent-item-disambiguation~}}
                    {{~> pitch-accent-item format=../../format~}}
                {{~#if (op ">" ../../pitchCount 1)~}}</li>{{~/if~}}
            {{~/each~}}
        {{~/each~}}
        {{~#if (op ">" pitchCount 1)~}}</ol>{{~/if~}}
    {{~else~}}
        No pitch accent data
    {{~/if~}}
{{/inline}}

{{#*inline "pitch-accents"}}
    {{~> pitch-accent-list format='text'~}}
{{/inline}}

{{#*inline "pitch-accent-graphs"}}
    {{~> pitch-accent-list format='graph'~}}
{{/inline}}

{{#*inline "pitch-accent-positions"}}
    {{~> pitch-accent-list format='position'~}}
{{/inline}}
{{! End Pitch Accents }}

<<<UPDATE-ADDITIONS>>>
{{~> (lookup . "marker") ~}}`.trimStart(),
            },
            // Block helper update: furigana and furiganaPlain
            {
                oldVersion: 20,
                newVersion: 21,
                old: `
{{#*inline "furigana"}}
    {{~#if merge~}}
        {{~#each definition.expressions~}}
            <span class="expression-{{termFrequency}}">{{~#furigana}}{{{.}}}{{/furigana~}}</span>
            {{~#unless @last}}、{{/unless~}}
        {{~/each~}}
    {{~else~}}
        {{#furigana}}{{{definition}}}{{/furigana}}
    {{~/if~}}
{{/inline}}

{{#*inline "furigana-plain"}}
    {{~#if merge~}}
        {{~#each definition.expressions~}}
            <span class="expression-{{termFrequency}}">{{~#furiganaPlain}}{{{.}}}{{/furiganaPlain~}}</span>
            {{~#unless @last}}、{{/unless~}}
        {{~/each~}}
    {{~else~}}
        {{#furiganaPlain}}{{{definition}}}{{/furiganaPlain}}
    {{~/if~}}
{{/inline}}

{{#*inline "frequencies"}}
    {{~#if (op ">" definition.frequencies.length 0)~}}
        <ul style="text-align: left;">
        {{~#each definition.frequencies~}}
            <li>
            {{~#if (op "!==" ../definition.type "kanji")~}}
                {{~#if (op "||" (op ">" ../uniqueExpressions.length 1) (op ">" ../uniqueReadings.length 1))~}}(
                    {{~#furigana expression reading~}}{{~/furigana~}}
                ) {{/if~}}
            {{~/if~}}
            {{~dictionary}}: {{frequency~}}
            </li>
        {{~/each~}}
        </ul>
    {{~/if~}}
{{/inline}}

{{~> (lookup . "marker") ~}}`.trimStart(),

                expected: `
{{#*inline "furigana"}}
    {{~#if merge~}}
        {{~#each definition.expressions~}}
            <span class="expression-{{termFrequency}}">{{~furigana .~}}</span>
            {{~#unless @last}}、{{/unless~}}
        {{~/each~}}
    {{~else~}}
        {{furigana definition}}
    {{~/if~}}
{{/inline}}

{{#*inline "furigana-plain"}}
    {{~#if merge~}}
        {{~#each definition.expressions~}}
            <span class="expression-{{termFrequency}}">{{~furiganaPlain .~}}</span>
            {{~#unless @last}}、{{/unless~}}
        {{~/each~}}
    {{~else~}}
        {{furiganaPlain definition}}
    {{~/if~}}
{{/inline}}

{{#*inline "frequencies"}}
    {{~#if (op ">" definition.frequencies.length 0)~}}
        <ul style="text-align: left;">
        {{~#each definition.frequencies~}}
            <li>
            {{~#if (op "!==" ../definition.type "kanji")~}}
                {{~#if (op "||" (op ">" ../uniqueExpressions.length 1) (op ">" ../uniqueReadings.length 1))~}}(
                    {{~furigana expression reading~}}
                ) {{/if~}}
            {{~/if~}}
            {{~dictionary}}: {{frequency~}}
            </li>
        {{~/each~}}
        </ul>
    {{~/if~}}
{{/inline}}

{{~> (lookup . "marker") ~}}`.trimStart(),
            },
            // Block helper update: formatGlossary
            {
                oldVersion: 20,
                newVersion: 21,
                old: `
{{#*inline "glossary-single"}}
    {{~#unless brief~}}
        {{~#scope~}}
            {{~#set "any" false}}{{/set~}}
            {{~#each definitionTags~}}
                {{~#if (op "||" (op "!" @root.compactTags) (op "!" redundant))~}}
                    {{~#if (get "any")}}, {{else}}<i>({{/if~}}
                    {{name}}
                    {{~#set "any" true}}{{/set~}}
                {{~/if~}}
            {{~/each~}}
            {{~#unless noDictionaryTag~}}
                {{~#if (op "||" (op "!" @root.compactTags) (op "!==" dictionary (get "previousDictionary")))~}}
                    {{~#if (get "any")}}, {{else}}<i>({{/if~}}
                    {{dictionary}}
                    {{~#set "any" true}}{{/set~}}
                {{~/if~}}
            {{~/unless~}}
            {{~#if (get "any")}})</i> {{/if~}}
        {{~/scope~}}
        {{~#if only~}}({{#each only}}{{.}}{{#unless @last}}, {{/unless}}{{/each}} only) {{/if~}}
    {{~/unless~}}
    {{~#if (op "<=" glossary.length 1)~}}
        {{#each glossary}}{{#formatGlossary ../dictionary}}{{{.}}}{{/formatGlossary}}{{/each}}
    {{~else if @root.compactGlossaries~}}
        {{#each glossary}}{{#formatGlossary ../dictionary}}{{{.}}}{{/formatGlossary}}{{#unless @last}} | {{/unless}}{{/each}}
    {{~else~}}
        <ul>{{#each glossary}}<li>{{#formatGlossary ../dictionary}}{{{.}}}{{/formatGlossary}}</li>{{/each}}</ul>
    {{~/if~}}
    {{~#set "previousDictionary" dictionary~}}{{~/set~}}
{{/inline}}

{{~> (lookup . "marker") ~}}`.trimStart(),

                expected: `
{{#*inline "glossary-single"}}
    {{~#unless brief~}}
        {{~#scope~}}
            {{~set "any" false~}}
            {{~#each definitionTags~}}
                {{~#if (op "||" (op "!" @root.compactTags) (op "!" redundant))~}}
                    {{~#if (get "any")}}, {{else}}<i>({{/if~}}
                    {{name}}
                    {{~set "any" true~}}
                {{~/if~}}
            {{~/each~}}
            {{~#unless noDictionaryTag~}}
                {{~#if (op "||" (op "!" @root.compactTags) (op "!==" dictionary (get "previousDictionary")))~}}
                    {{~#if (get "any")}}, {{else}}<i>({{/if~}}
                    {{dictionary}}
                    {{~set "any" true~}}
                {{~/if~}}
            {{~/unless~}}
            {{~#if (get "any")}})</i> {{/if~}}
        {{~/scope~}}
        {{~#if only~}}({{#each only}}{{.}}{{#unless @last}}, {{/unless}}{{/each}} only) {{/if~}}
    {{~/unless~}}
    {{~#if (op "<=" glossary.length 1)~}}
        {{#each glossary}}{{formatGlossary ../dictionary .}}{{/each}}
    {{~else if @root.compactGlossaries~}}
        {{#each glossary}}{{formatGlossary ../dictionary .}}{{#unless @last}} | {{/unless}}{{/each}}
    {{~else~}}
        <ul>{{#each glossary}}<li>{{formatGlossary ../dictionary .}}</li>{{/each}}</ul>
    {{~/if~}}
    {{~set "previousDictionary" dictionary~}}
{{/inline}}

{{~> (lookup . "marker") ~}}`.trimStart(),
            },
            // Block helper update: set and get
            {
                oldVersion: 20,
                newVersion: 21,
                old: `
{{#*inline "pitch-accent-item-disambiguation"}}
    {{~#scope~}}
        {{~#set "exclusive" (spread exclusiveExpressions exclusiveReadings)}}{{/set~}}
        {{~#if (op ">" (property (get "exclusive") "length") 0)~}}
            {{~#set "separator" ""~}}{{/set~}}
            <em>({{#each (get "exclusive")~}}
                {{~#get "separator"}}{{/get~}}{{{.}}}
            {{~/each}} only) </em>
        {{~/if~}}
    {{~/scope~}}
{{/inline}}

{{#*inline "stroke-count"}}
    {{~#scope~}}
        {{~#set "found" false}}{{/set~}}
        {{~#each definition.stats.misc~}}
            {{~#if (op "===" name "strokes")~}}
                {{~#set "found" true}}{{/set~}}
                Stroke count: {{value}}
            {{~/if~}}
        {{~/each~}}
        {{~#if (op "!" (get "found"))~}}
            Stroke count: Unknown
        {{~/if~}}
    {{~/scope~}}
{{/inline}}

{{#*inline "part-of-speech"}}
    {{~#scope~}}
        {{~#if (op "!==" definition.type "kanji")~}}
            {{~#set "first" true}}{{/set~}}
            {{~#each definition.expressions~}}
                {{~#each wordClasses~}}
                    {{~#unless (get (concat "used_" .))~}}
                        {{~> part-of-speech-pretty . ~}}
                        {{~#unless (get "first")}}, {{/unless~}}
                        {{~#set (concat "used_" .) true~}}{{~/set~}}
                        {{~#set "first" false~}}{{~/set~}}
                    {{~/unless~}}
                {{~/each~}}
            {{~/each~}}
            {{~#if (get "first")~}}Unknown{{~/if~}}
        {{~/if~}}
    {{~/scope~}}
{{/inline}}

{{~> (lookup . "marker") ~}}`.trimStart(),

                expected: `
{{#*inline "pitch-accent-item-disambiguation"}}
    {{~#scope~}}
        {{~set "exclusive" (spread exclusiveExpressions exclusiveReadings)~}}
        {{~#if (op ">" (property (get "exclusive") "length") 0)~}}
            {{~set "separator" ""~}}
            <em>({{#each (get "exclusive")~}}
                {{~get "separator"~}}{{{.}}}
            {{~/each}} only) </em>
        {{~/if~}}
    {{~/scope~}}
{{/inline}}

{{#*inline "stroke-count"}}
    {{~#scope~}}
        {{~set "found" false~}}
        {{~#each definition.stats.misc~}}
            {{~#if (op "===" name "strokes")~}}
                {{~set "found" true~}}
                Stroke count: {{value}}
            {{~/if~}}
        {{~/each~}}
        {{~#if (op "!" (get "found"))~}}
            Stroke count: Unknown
        {{~/if~}}
    {{~/scope~}}
{{/inline}}

{{#*inline "part-of-speech"}}
    {{~#scope~}}
        {{~#if (op "!==" definition.type "kanji")~}}
            {{~set "first" true~}}
            {{~#each definition.expressions~}}
                {{~#each wordClasses~}}
                    {{~#unless (get (concat "used_" .))~}}
                        {{~> part-of-speech-pretty . ~}}
                        {{~#unless (get "first")}}, {{/unless~}}
                        {{~set (concat "used_" .) true~}}
                        {{~set "first" false~}}
                    {{~/unless~}}
                {{~/each~}}
            {{~/each~}}
            {{~#if (get "first")~}}Unknown{{~/if~}}
        {{~/if~}}
    {{~/scope~}}
{{/inline}}

{{~> (lookup . "marker") ~}}`.trimStart(),
            },
            // Block helper update: hasMedia and getMedia
            {
                oldVersion: 20,
                newVersion: 21,
                old: `
{{#*inline "audio"}}
    {{~#if (hasMedia "audio")~}}
        [sound:{{#getMedia "audio"}}{{/getMedia}}]
    {{~/if~}}
{{/inline}}

{{#*inline "screenshot"}}
    {{~#if (hasMedia "screenshot")~}}
        <img src="{{#getMedia "screenshot"}}{{/getMedia}}" />
    {{~/if~}}
{{/inline}}

{{#*inline "clipboard-image"}}
    {{~#if (hasMedia "clipboardImage")~}}
        <img src="{{#getMedia "clipboardImage"}}{{/getMedia}}" />
    {{~/if~}}
{{/inline}}

{{#*inline "clipboard-text"}}
    {{~#if (hasMedia "clipboardText")}}{{#getMedia "clipboardText"}}{{/getMedia}}{{/if~}}
{{/inline}}

{{#*inline "selection-text"}}
    {{~#if (hasMedia "selectionText")}}{{#getMedia "selectionText"}}{{/getMedia}}{{/if~}}
{{/inline}}

{{#*inline "sentence-furigana"}}
    {{~#if definition.cloze~}}
        {{~#if (hasMedia "textFurigana" definition.cloze.sentence)~}}
            {{#getMedia "textFurigana" definition.cloze.sentence escape=false}}{{/getMedia}}
        {{~else~}}
            {{definition.cloze.sentence}}
        {{~/if~}}
    {{~/if~}}
{{/inline}}

{{~> (lookup . "marker") ~}}`.trimStart(),

                expected: `
{{#*inline "audio"}}
    {{~#if (hasMedia "audio")~}}
        [sound:{{getMedia "audio"}}]
    {{~/if~}}
{{/inline}}

{{#*inline "screenshot"}}
    {{~#if (hasMedia "screenshot")~}}
        <img src="{{getMedia "screenshot"}}" />
    {{~/if~}}
{{/inline}}

{{#*inline "clipboard-image"}}
    {{~#if (hasMedia "clipboardImage")~}}
        <img src="{{getMedia "clipboardImage"}}" />
    {{~/if~}}
{{/inline}}

{{#*inline "clipboard-text"}}
    {{~#if (hasMedia "clipboardText")}}{{getMedia "clipboardText"}}{{/if~}}
{{/inline}}

{{#*inline "selection-text"}}
    {{~#if (hasMedia "selectionText")}}{{getMedia "selectionText"}}{{/if~}}
{{/inline}}

{{#*inline "sentence-furigana"}}
    {{~#if definition.cloze~}}
        {{~#if (hasMedia "textFurigana" definition.cloze.sentence)~}}
            {{getMedia "textFurigana" definition.cloze.sentence escape=false}}
        {{~else~}}
            {{definition.cloze.sentence}}
        {{~/if~}}
    {{~/if~}}
{{/inline}}

{{~> (lookup . "marker") ~}}`.trimStart(),
            },
            // Block helper update: pronunciation
            {
                oldVersion: 20,
                newVersion: 21,
                old: `
{{#*inline "pitch-accent-item"}}
    {{~#pronunciation format=format reading=reading downstepPosition=position nasalPositions=nasalPositions devoicePositions=devoicePositions~}}{{~/pronunciation~}}
{{/inline}}

{{~> (lookup . "marker") ~}}`.trimStart(),

                expected: `
{{#*inline "pitch-accent-item"}}
    {{~pronunciation format=format reading=reading downstepPosition=position nasalPositions=nasalPositions devoicePositions=devoicePositions~}}
{{/inline}}

{{~> (lookup . "marker") ~}}`.trimStart(),
            },
            {
                oldVersion: 21,
                newVersion: 24,
                old: `
{{#*inline "conjugation"}}
    {{~#if definition.reasons~}}
        {{~#each definition.reasons~}}
            {{~#if (op ">" @index 0)}} « {{/if~}}
            {{.}}
        {{~/each~}}
    {{~/if~}}
{{/inline}}`.trimStart(),

                expected: `
{{#*inline "conjugation"}}
    {{~#if (op ">" definition.inflectionRuleChainCandidates.length 0)~}}
        {{~set "multiple" false~}}
        {{~#if (op ">" definition.inflectionRuleChainCandidates.length 1)~}}
            {{~set "multiple" true~}}
        {{~/if~}}
        {{~#if (get "multiple")~}}<ul>{{/if~}}
            {{~#each definition.inflectionRuleChainCandidates~}}
                {{~#if (op ">" inflectionRules.length 0)~}}
                    {{~#if (get "multiple")~}}<li>{{/if~}}
                    {{~#each inflectionRules~}}
                        {{~#if (op ">" @index 0)}} « {{/if~}}
                        {{.}}
                    {{~/each~}}
                    {{~#if (get "multiple")~}}</li>{{/if~}}
                {{~/if~}}
            {{~/each~}}
        {{~#if (get "multiple")~}}</ul>{{/if~}}
    {{~/if~}}
{{/inline}}
{{#*inline "cloze-body-kana"}}
    {{~#if definition.cloze}}{{definition.cloze.bodyKana}}{{/if~}}
{{/inline}}

{{#*inline "phonetic-transcriptions"}}
    {{~#if (op ">" definition.phoneticTranscriptions.length 0)~}}
        <ul>
            {{~#each definition.phoneticTranscriptions~}}
                {{~#each phoneticTranscriptions~}}
                    <li>
                        {{~set "any" false~}}
                        {{~#each tags~}}
                            {{~#if (get "any")}}, {{else}}<i>({{/if~}}
                            {{name}}
                            {{~set "any" true~}}
                        {{~/each~}}
                        {{~#if (get "any")}})</i> {{/if~}}
                        {{ipa~}}
                    </li>
                {{~/each~}}
            {{~/each~}}
        </ul>
    {{~/if~}}
{{/inline}}
{{#*inline "frequency-harmonic-rank"}}
    {{~#if (op "===" definition.frequencyHarmonic -1) ~}}
        9999999
    {{~else ~}}
        {{definition.frequencyHarmonic}}
    {{~/if~}}
{{/inline}}

{{#*inline "frequency-harmonic-occurrence"}}
    {{~#if (op "===" definition.frequencyHarmonic -1) ~}}
        0
    {{~else ~}}
        {{definition.frequencyHarmonic}}
    {{~/if~}}
{{/inline}}

{{#*inline "frequency-average-rank"}}
    {{~#if (op "===" definition.frequencyAverage -1) ~}}
        9999999
    {{~else ~}}
        {{definition.frequencyAverage}}
    {{~/if~}}
{{/inline}}

{{#*inline "frequency-average-occurrence"}}
    {{~#if (op "===" definition.frequencyAverage -1) ~}}
        0
    {{~else ~}}
        {{definition.frequencyAverage}}
    {{~/if~}}
{{/inline}}

{{~#*inline "pitch-accent-categories"~}}
    {{~#each (pitchCategories @root)~}}{{~.~}}{{~#unless @last~}},{{~/unless~}}{{~/each~}}
{{~/inline~}}`.trimStart(),
            },
            {
                oldVersion: 24,
                newVersion: 27,
                old: `
{{#*inline "sentence-furigana"}}
    {{~#if definition.cloze~}}
        {{~#if (hasMedia "textFurigana" definition.cloze.sentence)~}}
            {{getMedia "textFurigana" definition.cloze.sentence escape=false}}
        {{~else~}}
            {{definition.cloze.sentence}}
        {{~/if~}}
    {{~/if~}}
{{/inline}}
`.trimStart(),

                expected: `
{{#*inline "sentence-furigana"}}
    {{~#if definition.cloze~}}
        {{~#if (hasMedia "textFurigana" definition.cloze.sentence)~}}
            {{{getMedia "textFurigana" definition.cloze.sentence escape=false}}}
        {{~else~}}
            {{{definition.cloze.sentence}}}
        {{~/if~}}
    {{~/if~}}
{{/inline}}
`.trimStart(),
            },
            {
                oldVersion: 32,
                newVersion: 33,
                old: `
{{#*inline "sentence"}}
    {{~#if definition.cloze}}{{definition.cloze.sentence}}{{/if~}}
{{/inline}}

{{#*inline "cloze-prefix"}}
    {{~#if definition.cloze}}{{definition.cloze.prefix}}{{/if~}}
{{/inline}}

{{#*inline "cloze-body"}}
    {{~#if definition.cloze}}{{definition.cloze.body}}{{/if~}}
{{/inline}}

{{#*inline "cloze-body-kana"}}
    {{~#if definition.cloze}}{{definition.cloze.bodyKana}}{{/if~}}
{{/inline}}

{{#*inline "cloze-suffix"}}
    {{~#if definition.cloze}}{{definition.cloze.suffix}}{{/if~}}
{{/inline}}

{{#*inline "clipboard-text"}}
    {{~#if (hasMedia "clipboardText")}}{{getMedia "clipboardText"}}{{/if~}}
{{/inline}}

{{#*inline "selection-text"}}
    {{~#if (hasMedia "selectionText")}}{{getMedia "selectionText"}}{{/if~}}
{{/inline}}
`.trimStart(),

                expected: `
{{#*inline "sentence"}}
    {{~#if definition.cloze}}{{{definition.cloze.sentence}}}{{/if~}}
{{/inline}}

{{#*inline "cloze-prefix"}}
    {{~#if definition.cloze}}{{{definition.cloze.prefix}}}{{/if~}}
{{/inline}}

{{#*inline "cloze-body"}}
    {{~#if definition.cloze}}{{{definition.cloze.body}}}{{/if~}}
{{/inline}}

{{#*inline "cloze-body-kana"}}
    {{~#if definition.cloze}}{{{definition.cloze.bodyKana}}}{{/if~}}
{{/inline}}

{{#*inline "cloze-suffix"}}
    {{~#if definition.cloze}}{{{definition.cloze.suffix}}}{{/if~}}
{{/inline}}

{{#*inline "clipboard-text"}}
    {{~#if (hasMedia "clipboardText")}}{{{getMedia "clipboardText"}}}{{/if~}}
{{/inline}}

{{#*inline "selection-text"}}
    {{~#if (hasMedia "selectionText")}}{{{getMedia "selectionText"}}}{{/if~}}
{{/inline}}
`.trimStart(),
            },
            {
                oldVersion: 44,
                newVersion: 45,
                old: `
{{#*inline "selection-text"}}
    {{~#if (hasMedia "selectionText")}}{{{getMedia "selectionText"}}}{{/if~}}
{{/inline}}
`.trimStart(),

                expected: `
{{#*inline "popup-selection-text"}}
    {{~#if (hasMedia "popupSelectionText")}}{{{getMedia "popupSelectionText"}}}{{/if~}}
{{/inline}}
`.trimStart(),
            },
            {
                oldVersion: 48,
                newVersion: 49,
                old: `
{{#*inline "glossary-single"}}
    {{~#unless brief~}}
        {{~#scope~}}
            {{~set "any" false~}}
            {{~#each definitionTags~}}
                {{~#if (op "||" (op "!" @root.compactTags) (op "!" redundant))~}}
                    {{~#if (get "any")}}, {{else}}<i>({{/if~}}
                    {{name}}
                    {{~set "any" true~}}
                {{~/if~}}
            {{~/each~}}
            {{~#unless noDictionaryTag~}}
                {{~#if (op "||" (op "!" @root.compactTags) (op "!==" dictionary (get "previousDictionary")))~}}
                    {{~#if (get "any")}}, {{else}}<i>({{/if~}}
                    {{dictionary}}
                    {{~set "any" true~}}
                {{~/if~}}
            {{~/unless~}}
            {{~#if (get "any")}})</i> {{/if~}}
        {{~/scope~}}
        {{~#if only~}}({{#each only}}{{.}}{{#unless @last}}, {{/unless}}{{/each}} only) {{/if~}}
    {{~/unless~}}
    {{~#if (op "<=" glossary.length 1)~}}
        {{#each glossary}}{{formatGlossary ../dictionary .}}{{/each}}
    {{~else if @root.compactGlossaries~}}
        {{#each glossary}}{{formatGlossary ../dictionary .}}{{#unless @last}} | {{/unless}}{{/each}}
    {{~else~}}
        <ul>{{#each glossary}}<li>{{formatGlossary ../dictionary .}}</li>{{/each}}</ul>
    {{~/if~}}
    {{~set "previousDictionary" dictionary~}}
{{/inline}}

{{#*inline "dictionary"}}
    {{~definition.dictionary~}}
{{/inline}}

{{#*inline "frequencies"}}
    {{~#if (op ">" definition.frequencies.length 0)~}}
        <ul style="text-align: left;">
        {{~#each definition.frequencies~}}
            <li>
            {{~#if (op "!==" ../definition.type "kanji")~}}
                {{~#if (op "||" (op ">" ../uniqueExpressions.length 1) (op ">" ../uniqueReadings.length 1))~}}(
                    {{~furigana expression reading~}}
                ) {{/if~}}
            {{~/if~}}
            {{~dictionary}}: {{frequency~}}
            </li>
        {{~/each~}}
        </ul>
    {{~/if~}}
{{/inline}}
`.trimStart(),

                expected: `
{{#*inline "glossary-single"}}
    {{~#unless brief~}}
        {{~#scope~}}
            {{~set "any" false~}}
            {{~#each definitionTags~}}
                {{~#if (op "||" (op "!" @root.compactTags) (op "!" redundant))~}}
                    {{~#if (get "any")}}, {{else}}<i>({{/if~}}
                    {{name}}
                    {{~set "any" true~}}
                {{~/if~}}
            {{~/each~}}
            {{~#unless noDictionaryTag~}}
                {{~#if (op "||" (op "!" @root.compactTags) (op "!==" dictionary (get "previousDictionary")))~}}
                    {{~#if (get "any")}}, {{else}}<i>({{/if~}}
                    {{dictionaryAlias}}
                    {{~set "any" true~}}
                {{~/if~}}
            {{~/unless~}}
            {{~#if (get "any")}})</i> {{/if~}}
        {{~/scope~}}
        {{~#if only~}}({{#each only}}{{.}}{{#unless @last}}, {{/unless}}{{/each}} only) {{/if~}}
    {{~/unless~}}
    {{~#if (op "<=" glossary.length 1)~}}
        {{#each glossary}}{{formatGlossary ../dictionary .}}{{/each}}
    {{~else if @root.compactGlossaries~}}
        {{#each glossary}}{{formatGlossary ../dictionary .}}{{#unless @last}} | {{/unless}}{{/each}}
    {{~else~}}
        <ul>{{#each glossary}}<li>{{formatGlossary ../dictionary .}}</li>{{/each}}</ul>
    {{~/if~}}
    {{~set "previousDictionary" dictionary~}}
{{/inline}}

{{#*inline "dictionary"}}
    {{~definition.dictionary~}}
{{/inline}}

{{#*inline "dictionary-alias"}}
    {{~definition.dictionaryAlias~}}
{{/inline}}

{{#*inline "frequencies"}}
    {{~#if (op ">" definition.frequencies.length 0)~}}
        <ul style="text-align: left;">
        {{~#each definition.frequencies~}}
            <li>
            {{~#if (op "!==" ../definition.type "kanji")~}}
                {{~#if (op "||" (op ">" ../uniqueExpressions.length 1) (op ">" ../uniqueReadings.length 1))~}}(
                    {{~furigana expression reading~}}
                ) {{/if~}}
            {{~/if~}}
            {{~dictionaryAlias}}: {{frequency~}}
            </li>
        {{~/each~}}
        </ul>
    {{~/if~}}
{{/inline}}
`.trimStart(),
            },
        ];

        const updatesPattern = /<<<UPDATE-ADDITIONS>>>/g;

        test.each(data)('field-templates-update-test-%#', async ({old, expected, oldVersion, newVersion}) => {
            const optionsUtil = new OptionsUtil();
            await optionsUtil.prepare();

            const options = /** @type {import('core').SafeAny} */ (createOptionsTestData1());
            options.profiles[0].options.anki.fieldTemplates = old;
            options.version = oldVersion;

            const expected2 = expected.replace(updatesPattern, getUpdateAdditions(oldVersion, newVersion));

            const optionsUpdated = structuredClone(await optionsUtil.update(options, newVersion));
            const fieldTemplatesActual = optionsUpdated.profiles[0].options.anki.fieldTemplates;
            expect(fieldTemplatesActual).toStrictEqual(expected2);
        });
    });
});
