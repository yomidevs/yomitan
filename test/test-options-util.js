/*
 * Copyright (C) 2020-2021  Yomichan Authors
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

const fs = require('fs');
const url = require('url');
const path = require('path');
const assert = require('assert');
const {testMain} = require('../dev/util');
const {VM} = require('../dev/vm');


function createVM(extDir) {
    const chrome = {
        runtime: {
            getURL(path2) {
                return url.pathToFileURL(path.join(extDir, path2.replace(/^\//, ''))).href;
            }
        }
    };

    async function fetch(url2) {
        const filePath = url.fileURLToPath(url2);
        await Promise.resolve();
        const content = fs.readFileSync(filePath, {encoding: null});
        return {
            ok: true,
            status: 200,
            statusText: 'OK',
            text: async () => Promise.resolve(content.toString('utf8')),
            json: async () => Promise.resolve(JSON.parse(content.toString('utf8')))
        };
    }

    const vm = new VM({chrome, fetch});
    vm.execute([
        'js/core.js',
        'js/general/cache-map.js',
        'js/data/json-schema.js',
        'js/templates/template-patcher.js',
        'js/data/options-util.js'
    ]);

    return vm;
}


function clone(value) {
    return JSON.parse(JSON.stringify(value));
}


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
            usePopupShadowDom: true
        },
        audio: {
            enabled: true,
            sources: ['jpod101', 'text-to-speech', 'custom'],
            volume: 100,
            autoPlay: false,
            customSourceUrl: 'http://localhost/audio.mp3?term={expression}&reading={reading}',
            textToSpeechVoice: 'example-voice'
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
            layoutAwareScan: false
        },
        translation: {
            convertHalfWidthCharacters: 'false',
            convertNumericCharacters: 'false',
            convertAlphabeticCharacters: 'false',
            convertHiraganaToKatakana: 'false',
            convertKatakanaToHiragana: 'variant',
            collapseEmphaticSequences: 'false'
        },
        dictionaries: {
            'Test Dictionary': {
                priority: 0,
                enabled: true,
                allowSecondarySearches: false
            }
        },
        parsing: {
            enableScanningParser: true,
            enableMecabParser: false,
            selectedParser: null,
            termSpacing: true,
            readingMode: 'hiragana'
        },
        anki: {
            enable: false,
            server: 'http://127.0.0.1:8765',
            tags: ['yomichan'],
            sentenceExt: 200,
            screenshot: {format: 'png', quality: 92},
            terms: {deck: '', model: '', fields: {}},
            kanji: {deck: '', model: '', fields: {}},
            duplicateScope: 'collection',
            fieldTemplates: null
        }
    };
}

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
                                value: 1
                            },
                            {
                                type: 'popupLevel',
                                operator: 'notEqual',
                                value: 0
                            },
                            {
                                type: 'popupLevel',
                                operator: 'lessThan',
                                value: 3
                            },
                            {
                                type: 'popupLevel',
                                operator: 'greaterThan',
                                value: 0
                            },
                            {
                                type: 'popupLevel',
                                operator: 'lessThanOrEqual',
                                value: 2
                            },
                            {
                                type: 'popupLevel',
                                operator: 'greaterThanOrEqual',
                                value: 1
                            }
                        ]
                    },
                    {
                        conditions: [
                            {
                                type: 'url',
                                operator: 'matchDomain',
                                value: 'example.com'
                            },
                            {
                                type: 'url',
                                operator: 'matchRegExp',
                                value: 'example\\.com'
                            }
                        ]
                    },
                    {
                        conditions: [
                            {
                                type: 'modifierKeys',
                                operator: 'are',
                                value: [
                                    'ctrl',
                                    'shift'
                                ]
                            },
                            {
                                type: 'modifierKeys',
                                operator: 'areNot',
                                value: [
                                    'alt',
                                    'shift'
                                ]
                            },
                            {
                                type: 'modifierKeys',
                                operator: 'include',
                                value: 'alt'
                            },
                            {
                                type: 'modifierKeys',
                                operator: 'notInclude',
                                value: 'ctrl'
                            }
                        ]
                    }
                ]
            }
        ],
        profileCurrent: 0,
        version: 2,
        global: {
            database: {
                prefixWildcardsSupported: false
            }
        }
    };
}


function createProfileOptionsUpdatedTestData1() {
    return {
        general: {
            enable: true,
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
            glossaryLayoutMode: 'default',
            mainDictionary: '',
            popupTheme: 'default',
            popupOuterTheme: 'default',
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
            termDisplayMode: 'ruby'
        },
        audio: {
            enabled: true,
            sources: [
                {
                    type: 'jpod101',
                    url: '',
                    voice: ''
                },
                {
                    type: 'text-to-speech',
                    url: '',
                    voice: 'example-voice'
                },
                {
                    type: 'custom',
                    url: 'http://localhost/audio.mp3?term={term}&reading={reading}',
                    voice: ''
                }
            ],
            volume: 100,
            autoPlay: false
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
            preventMiddleMouse: {
                onWebPages: false,
                onPopupPages: false,
                onSearchPages: false,
                onSearchQuery: false
            },
            inputs: [
                {
                    include: 'shift',
                    exclude: 'mouse0',
                    types: {
                        mouse: true,
                        touch: false,
                        pen: false
                    },
                    options: {
                        showAdvanced: false,
                        searchTerms: true,
                        searchKanji: true,
                        scanOnTouchMove: true,
                        scanOnPenHover: true,
                        scanOnPenPress: true,
                        scanOnPenRelease: false,
                        preventTouchScrolling: true
                    }
                },
                {
                    include: 'mouse2',
                    exclude: '',
                    types: {
                        mouse: true,
                        touch: false,
                        pen: false
                    },
                    options: {
                        showAdvanced: false,
                        searchTerms: true,
                        searchKanji: true,
                        scanOnTouchMove: true,
                        scanOnPenHover: true,
                        scanOnPenPress: true,
                        scanOnPenRelease: false,
                        preventTouchScrolling: true
                    }
                },
                {
                    include: '',
                    exclude: '',
                    types: {
                        mouse: false,
                        touch: true,
                        pen: true
                    },
                    options: {
                        showAdvanced: false,
                        searchTerms: true,
                        searchKanji: true,
                        scanOnTouchMove: true,
                        scanOnPenHover: true,
                        scanOnPenPress: true,
                        scanOnPenRelease: false,
                        preventTouchScrolling: true
                    }
                }
            ]
        },
        translation: {
            convertHalfWidthCharacters: 'false',
            convertNumericCharacters: 'false',
            convertAlphabeticCharacters: 'false',
            convertHiraganaToKatakana: 'false',
            convertKatakanaToHiragana: 'variant',
            collapseEmphaticSequences: 'false',
            textReplacements: {
                searchOriginal: true,
                groups: []
            }
        },
        dictionaries: [
            {
                name: 'Test Dictionary',
                priority: 0,
                enabled: true,
                allowSecondarySearches: false,
                definitionsCollapsible: 'not-collapsible'
            }
        ],
        parsing: {
            enableScanningParser: true,
            enableMecabParser: false,
            selectedParser: null,
            termSpacing: true,
            readingMode: 'hiragana'
        },
        anki: {
            enable: false,
            server: 'http://127.0.0.1:8765',
            tags: ['yomichan'],
            screenshot: {format: 'png', quality: 92},
            terms: {deck: '', model: '', fields: {}},
            kanji: {deck: '', model: '', fields: {}},
            duplicateScope: 'collection',
            duplicateScopeCheckAllModels: false,
            displayTags: 'never',
            checkForDuplicates: true,
            fieldTemplates: null,
            suspendNewCards: false
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
                {enabled: true, character1: '…', character2: null, includeCharacterAtStart: false, includeCharacterAtEnd: true}
            ]
        },
        inputs: {
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
                {action: 'viewNote',          argument: '',  key: 'KeyV',      modifiers: ['alt'],  scopes: ['popup', 'search'], enabled: true},
                {action: 'copyHostSelection', argument: '',  key: 'KeyC',      modifiers: ['ctrl'], scopes: ['popup'], enabled: true}
            ]
        },
        popupWindow: {
            width: 400,
            height: 250,
            left: 0,
            top: 0,
            useLeft: false,
            useTop: false,
            windowType: 'popup',
            windowState: 'normal'
        },
        clipboard: {
            enableBackgroundMonitor: false,
            enableSearchPageMonitor: false,
            autoSearchContent: true,
            maximumSearchLength: 1000
        }
    };
}

function createOptionsUpdatedTestData1() {
    return {
        profiles: [
            {
                name: 'Default',
                options: createProfileOptionsUpdatedTestData1(),
                conditionGroups: [
                    {
                        conditions: [
                            {
                                type: 'popupLevel',
                                operator: 'equal',
                                value: '1'
                            },
                            {
                                type: 'popupLevel',
                                operator: 'notEqual',
                                value: '0'
                            },
                            {
                                type: 'popupLevel',
                                operator: 'lessThan',
                                value: '3'
                            },
                            {
                                type: 'popupLevel',
                                operator: 'greaterThan',
                                value: '0'
                            },
                            {
                                type: 'popupLevel',
                                operator: 'lessThanOrEqual',
                                value: '2'
                            },
                            {
                                type: 'popupLevel',
                                operator: 'greaterThanOrEqual',
                                value: '1'
                            }
                        ]
                    },
                    {
                        conditions: [
                            {
                                type: 'url',
                                operator: 'matchDomain',
                                value: 'example.com'
                            },
                            {
                                type: 'url',
                                operator: 'matchRegExp',
                                value: 'example\\.com'
                            }
                        ]
                    },
                    {
                        conditions: [
                            {
                                type: 'modifierKeys',
                                operator: 'are',
                                value: 'ctrl, shift'
                            },
                            {
                                type: 'modifierKeys',
                                operator: 'areNot',
                                value: 'alt, shift'
                            },
                            {
                                type: 'modifierKeys',
                                operator: 'include',
                                value: 'alt'
                            },
                            {
                                type: 'modifierKeys',
                                operator: 'notInclude',
                                value: 'ctrl'
                            }
                        ]
                    }
                ]
            }
        ],
        profileCurrent: 0,
        version: 13,
        global: {
            database: {
                prefixWildcardsSupported: false
            }
        }
    };
}


async function testUpdate(extDir) {
    const vm = createVM(extDir);
    const [OptionsUtil] = vm.get(['OptionsUtil']);
    const optionsUtil = new OptionsUtil();
    await optionsUtil.prepare();

    const options = createOptionsTestData1();
    const optionsUpdated = clone(await optionsUtil.update(options));
    const optionsExpected = createOptionsUpdatedTestData1();
    assert.deepStrictEqual(optionsUpdated, optionsExpected);
}

async function testDefault(extDir) {
    const data = [
        (options) => options,
        (options) => {
            delete options.profiles[0].options.audio.autoPlay;
        },
        (options) => {
            options.profiles[0].options.audio.autoPlay = void 0;
        }
    ];

    const vm = createVM(extDir);
    const [OptionsUtil] = vm.get(['OptionsUtil']);
    const optionsUtil = new OptionsUtil();
    await optionsUtil.prepare();

    for (const modify of data) {
        const options = optionsUtil.getDefault();

        const optionsModified = clone(options);
        modify(optionsModified);

        const optionsUpdated = await optionsUtil.update(clone(optionsModified));
        assert.deepStrictEqual(clone(optionsUpdated), clone(options));
    }
}

async function testFieldTemplatesUpdate(extDir) {
    const vm = createVM(extDir);
    const [OptionsUtil, TemplatePatcher] = vm.get(['OptionsUtil', 'TemplatePatcher']);
    const optionsUtil = new OptionsUtil();
    await optionsUtil.prepare();

    const templatePatcher = new TemplatePatcher();
    const loadDataFile = (fileName) => {
        const content = fs.readFileSync(path.join(extDir, fileName), {encoding: 'utf8'});
        return templatePatcher.parsePatch(content).addition;
    };
    const updates = [
        {version: 2,  changes: loadDataFile('data/templates/anki-field-templates-upgrade-v2.handlebars')},
        {version: 4,  changes: loadDataFile('data/templates/anki-field-templates-upgrade-v4.handlebars')},
        {version: 6,  changes: loadDataFile('data/templates/anki-field-templates-upgrade-v6.handlebars')},
        {version: 8,  changes: loadDataFile('data/templates/anki-field-templates-upgrade-v8.handlebars')},
        {version: 10, changes: loadDataFile('data/templates/anki-field-templates-upgrade-v10.handlebars')},
        {version: 12, changes: loadDataFile('data/templates/anki-field-templates-upgrade-v12.handlebars')},
        {version: 13, changes: loadDataFile('data/templates/anki-field-templates-upgrade-v13.handlebars')}
    ];
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
{{~> (lookup . "marker") ~}}`.trimStart()
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
<<<UPDATE-ADDITIONS>>>`.trimStart()
        },
        // Empty test
        {
            oldVersion: 0,
            newVersion: 12,
            old: `
{{~> (lookup . "marker") ~}}`.trimStart(),

            expected: `
<<<UPDATE-ADDITIONS>>>
{{~> (lookup . "marker") ~}}`.trimStart()
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
`.trimStart()
        },
        // glossary and glossary-brief update
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
{{~> (lookup . "marker") ~}}`.trimStart()
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
{{~> (lookup . "marker") ~}}`.trimStart()
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
{{~> (lookup . "marker") ~}}`.trimStart()
        }
    ];

    const updatesPattern = /<<<UPDATE-ADDITIONS>>>/g;
    for (const {old, expected, oldVersion, newVersion} of data) {
        const options = createOptionsTestData1();
        options.profiles[0].options.anki.fieldTemplates = old;
        options.version = oldVersion;

        const expected2 = expected.replace(updatesPattern, getUpdateAdditions(oldVersion, newVersion));

        const optionsUpdated = clone(await optionsUtil.update(options, newVersion));
        const fieldTemplatesActual = optionsUpdated.profiles[0].options.anki.fieldTemplates;
        assert.deepStrictEqual(fieldTemplatesActual, expected2);
    }
}


async function main() {
    const extDir = path.join(__dirname, '..', 'ext');
    await testUpdate(extDir);
    await testDefault(extDir);
    await testFieldTemplatesUpdate(extDir);
}


if (require.main === module) { testMain(main); }
