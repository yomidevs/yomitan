/*
 * Copyright (C) 2020  Yomichan Authors
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
        'mixed/js/core.js',
        'mixed/js/cache-map.js',
        'bg/js/json-schema.js',
        'bg/js/options.js'
    ]);

    return vm;
}


function clone(value) {
    return JSON.parse(JSON.stringify(value));
}


function createProfileOptionsTestData1() {
    return {
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
            sources: ['jpod101'],
            volume: 100,
            autoPlay: false,
            customSourceUrl: '',
            textToSpeechVoice: ''
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
        dictionaries: {},
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
            usePopupWindow: false
        },
        audio: {
            enabled: true,
            sources: ['jpod101'],
            volume: 100,
            autoPlay: false,
            customSourceUrl: '',
            textToSpeechVoice: ''
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
                        scanOnTouchMove: true,
                        scanOnPenHover: true,
                        scanOnPenPress: true,
                        scanOnPenRelease: false,
                        searchTerms: true,
                        searchKanji: true,
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
                        scanOnTouchMove: true,
                        scanOnPenHover: true,
                        scanOnPenPress: true,
                        scanOnPenRelease: false,
                        searchTerms: true,
                        searchKanji: true,
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
                        scanOnTouchMove: true,
                        scanOnPenHover: true,
                        scanOnPenPress: true,
                        scanOnPenRelease: false,
                        searchTerms: true,
                        searchKanji: true,
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
            collapseEmphaticSequences: 'false'
        },
        dictionaries: {},
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
        version: 4,
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


async function testFieldTemplatesUpdate(extDir) {
    const vm = createVM(extDir);
    const [OptionsUtil] = vm.get(['OptionsUtil']);
    const optionsUtil = new OptionsUtil();
    await optionsUtil.prepare();

    const loadDataFile = (fileName) => fs.readFileSync(path.join(extDir, fileName), {encoding: 'utf8'});
    const update2 = loadDataFile('bg/data/anki-field-templates-upgrade-v2.handlebars');
    const update4 = loadDataFile('bg/data/anki-field-templates-upgrade-v4.handlebars');

    const data = [
        // Standard format
        {
            old: `
{{#*inline "character"}}
    {{~definition.character~}}
{{/inline}}

{{~> (lookup . "marker") ~}}`.trimStart(),

            expected: `
{{#*inline "character"}}
    {{~definition.character~}}
{{/inline}}

${update2}
${update4}
{{~> (lookup . "marker") ~}}`.trimStart()
        },
        // Non-standard marker format
        {
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
${update2}
${update4}`.trimStart()
        },
        // Empty test
        {
            old: `
{{~> (lookup . "marker") ~}}`.trimStart(),

            expected: `
${update2}
${update4}
{{~> (lookup . "marker") ~}}`.trimStart()
        }
    ];

    for (const {old, expected} of data) {
        const options = createOptionsTestData1();
        options.profiles[0].options.anki.fieldTemplates = old;
        const optionsUpdated = clone(await optionsUtil.update(options));
        const fieldTemplatesActual = optionsUpdated.profiles[0].options.anki.fieldTemplates;
        assert.deepStrictEqual(fieldTemplatesActual, expected);
    }
}


async function main() {
    const extDir = path.join(__dirname, '..', 'ext');
    await testUpdate(extDir);
    await testFieldTemplatesUpdate(extDir);
}


if (require.main === module) { main(); }
