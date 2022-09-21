/*
 * Copyright (C) 2016-2022  Yomichan Authors
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

/* global
 * JsonSchema
 * TemplatePatcher
 */

class OptionsUtil {
    constructor() {
        this._templatePatcher = null;
        this._optionsSchema = null;
    }

    async prepare() {
        const schema = await this._fetchAsset('/data/schemas/options-schema.json', true);
        this._optionsSchema = new JsonSchema(schema);
    }

    async update(options, targetVersion=null) {
        // Invalid options
        if (!isObject(options)) {
            options = {};
        }

        // Check for legacy options
        let defaultProfileOptions = {};
        if (!Array.isArray(options.profiles)) {
            defaultProfileOptions = options;
            options = {};
        }

        // Ensure profiles is an array
        if (!Array.isArray(options.profiles)) {
            options.profiles = [];
        }

        // Remove invalid profiles
        const profiles = options.profiles;
        for (let i = profiles.length - 1; i >= 0; --i) {
            if (!isObject(profiles[i])) {
                profiles.splice(i, 1);
            }
        }

        // Require at least one profile
        if (profiles.length === 0) {
            profiles.push({
                name: 'Default',
                options: defaultProfileOptions,
                conditionGroups: []
            });
        }

        // Ensure profileCurrent is valid
        const profileCurrent = options.profileCurrent;
        if (!(
            typeof profileCurrent === 'number' &&
            Number.isFinite(profileCurrent) &&
            Math.floor(profileCurrent) === profileCurrent &&
            profileCurrent >= 0 &&
            profileCurrent < profiles.length
        )) {
            options.profileCurrent = 0;
        }

        // Version
        if (typeof options.version !== 'number') {
            options.version = 0;
        }

        // Generic updates
        options = await this._applyUpdates(options, this._getVersionUpdates(targetVersion));

        // Validation
        options = this._optionsSchema.getValidValueOrDefault(options);

        // Result
        return options;
    }

    async load() {
        let options;
        try {
            const optionsStr = await new Promise((resolve, reject) => {
                chrome.storage.local.get(['options'], (store) => {
                    const error = chrome.runtime.lastError;
                    if (error) {
                        reject(new Error(error.message));
                    } else {
                        resolve(store.options);
                    }
                });
            });
            options = JSON.parse(optionsStr);
        } catch (e) {
            // NOP
        }

        if (typeof options !== 'undefined') {
            options = await this.update(options);
        } else {
            options = this.getDefault();
        }

        return options;
    }

    save(options) {
        return new Promise((resolve, reject) => {
            chrome.storage.local.set({options: JSON.stringify(options)}, () => {
                const error = chrome.runtime.lastError;
                if (error) {
                    reject(new Error(error.message));
                } else {
                    resolve();
                }
            });
        });
    }

    getDefault() {
        const optionsVersion = this._getVersionUpdates().length;
        const options = this._optionsSchema.getValidValueOrDefault();
        options.version = optionsVersion;
        return options;
    }

    createValidatingProxy(options) {
        return this._optionsSchema.createProxy(options);
    }

    validate(options) {
        return this._optionsSchema.validate(options);
    }

    // Legacy profile updating

    _legacyProfileUpdateGetUpdates() {
        return [
            null,
            null,
            null,
            null,
            (options) => {
                options.general.audioSource = options.general.audioPlayback ? 'jpod101' : 'disabled';
            },
            (options) => {
                options.general.showGuide = false;
            },
            (options) => {
                options.scanning.modifier = options.scanning.requireShift ? 'shift' : 'none';
            },
            (options) => {
                options.general.resultOutputMode = options.general.groupResults ? 'group' : 'split';
                options.anki.fieldTemplates = null;
            },
            (options) => {
                if (this._getStringHashCode(options.anki.fieldTemplates) === 1285806040) {
                    options.anki.fieldTemplates = null;
                }
            },
            (options) => {
                if (this._getStringHashCode(options.anki.fieldTemplates) === -250091611) {
                    options.anki.fieldTemplates = null;
                }
            },
            (options) => {
                const oldAudioSource = options.general.audioSource;
                const disabled = oldAudioSource === 'disabled';
                options.audio.enabled = !disabled;
                options.audio.volume = options.general.audioVolume;
                options.audio.autoPlay = options.general.autoPlayAudio;
                options.audio.sources = [disabled ? 'jpod101' : oldAudioSource];

                delete options.general.audioSource;
                delete options.general.audioVolume;
                delete options.general.autoPlayAudio;
            },
            (options) => {
                // Version 12 changes:
                //  The preferred default value of options.anki.fieldTemplates has been changed to null.
                if (this._getStringHashCode(options.anki.fieldTemplates) === 1444379824) {
                    options.anki.fieldTemplates = null;
                }
            },
            (options) => {
                // Version 13 changes:
                //  Default anki field tempaltes updated to include {document-title}.
                let fieldTemplates = options.anki.fieldTemplates;
                if (typeof fieldTemplates === 'string') {
                    fieldTemplates += '\n\n{{#*inline "document-title"}}\n    {{~context.document.title~}}\n{{/inline}}';
                    options.anki.fieldTemplates = fieldTemplates;
                }
            },
            (options) => {
                // Version 14 changes:
                //  Changed template for Anki audio and tags.
                let fieldTemplates = options.anki.fieldTemplates;
                if (typeof fieldTemplates !== 'string') { return; }

                const replacements = [
                    [
                        '{{#*inline "audio"}}{{/inline}}',
                        '{{#*inline "audio"}}\n    {{~#if definition.audioFileName~}}\n        [sound:{{definition.audioFileName}}]\n    {{~/if~}}\n{{/inline}}'
                    ],
                    [
                        '{{#*inline "tags"}}\n    {{~#each definition.definitionTags}}{{name}}{{#unless @last}}, {{/unless}}{{/each~}}\n{{/inline}}',
                        '{{#*inline "tags"}}\n    {{~#mergeTags definition group merge}}{{this}}{{/mergeTags~}}\n{{/inline}}'
                    ]
                ];

                for (const [pattern, replacement] of replacements) {
                    let replaced = false;
                    fieldTemplates = fieldTemplates.replace(new RegExp(escapeRegExp(pattern), 'g'), () => {
                        replaced = true;
                        return replacement;
                    });

                    if (!replaced) {
                        fieldTemplates += '\n\n' + replacement;
                    }
                }

                options.anki.fieldTemplates = fieldTemplates;
            }
        ];
    }

    _legacyProfileUpdateGetDefaults() {
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

    _legacyProfileUpdateAssignDefaults(options) {
        const defaults = this._legacyProfileUpdateGetDefaults();

        const combine = (target, source) => {
            for (const key in source) {
                if (!Object.prototype.hasOwnProperty.call(target, key)) {
                    target[key] = source[key];
                }
            }
        };

        combine(options, defaults);
        combine(options.general, defaults.general);
        combine(options.scanning, defaults.scanning);
        combine(options.anki, defaults.anki);
        combine(options.anki.terms, defaults.anki.terms);
        combine(options.anki.kanji, defaults.anki.kanji);

        return options;
    }

    _legacyProfileUpdateUpdateVersion(options) {
        const updates = this._legacyProfileUpdateGetUpdates();
        this._legacyProfileUpdateAssignDefaults(options);

        const targetVersion = updates.length;
        const currentVersion = options.version;

        if (typeof currentVersion === 'number' && Number.isFinite(currentVersion)) {
            for (let i = Math.max(0, Math.floor(currentVersion)); i < targetVersion; ++i) {
                const update = updates[i];
                if (update !== null) {
                    update(options);
                }
            }
        }

        options.version = targetVersion;
        return options;
    }

    // Private

    async _applyAnkiFieldTemplatesPatch(options, modificationsUrl) {
        let patch = null;
        for (const {options: profileOptions} of options.profiles) {
            const fieldTemplates = profileOptions.anki.fieldTemplates;
            if (fieldTemplates === null) { continue; }

            if (patch === null) {
                const content = await this._fetchAsset(modificationsUrl);
                if (this._templatePatcher === null) {
                    this._templatePatcher = new TemplatePatcher();
                }
                patch = this._templatePatcher.parsePatch(content);
            }

            profileOptions.anki.fieldTemplates = this._templatePatcher.applyPatch(fieldTemplates, patch);
        }
    }

    async _fetchAsset(url, json=false) {
        url = chrome.runtime.getURL(url);
        const response = await fetch(url, {
            method: 'GET',
            mode: 'no-cors',
            cache: 'default',
            credentials: 'omit',
            redirect: 'follow',
            referrerPolicy: 'no-referrer'
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch ${url}: ${response.status}`);
        }
        return await (json ? response.json() : response.text());
    }

    _getStringHashCode(string) {
        let hashCode = 0;

        if (typeof string !== 'string') { return hashCode; }

        for (let i = 0, charCode = string.charCodeAt(i); i < string.length; charCode = string.charCodeAt(++i)) {
            hashCode = ((hashCode << 5) - hashCode) + charCode;
            hashCode |= 0;
        }

        return hashCode;
    }

    async _applyUpdates(options, updates) {
        const targetVersion = updates.length;
        let currentVersion = options.version;

        if (typeof currentVersion !== 'number' || !Number.isFinite(currentVersion)) {
            currentVersion = 0;
        }

        for (let i = Math.max(0, Math.floor(currentVersion)); i < targetVersion; ++i) {
            const {update, async} = updates[i];
            const result = update(options);
            options = (async ? await result : result);
        }

        options.version = targetVersion;
        return options;
    }

    _getVersionUpdates(targetVersion) {
        const result = [
            {async: false, update: this._updateVersion1.bind(this)},
            {async: false, update: this._updateVersion2.bind(this)},
            {async: true,  update: this._updateVersion3.bind(this)},
            {async: true,  update: this._updateVersion4.bind(this)},
            {async: false, update: this._updateVersion5.bind(this)},
            {async: true,  update: this._updateVersion6.bind(this)},
            {async: false, update: this._updateVersion7.bind(this)},
            {async: true,  update: this._updateVersion8.bind(this)},
            {async: false, update: this._updateVersion9.bind(this)},
            {async: true,  update: this._updateVersion10.bind(this)},
            {async: false, update: this._updateVersion11.bind(this)},
            {async: true,  update: this._updateVersion12.bind(this)},
            {async: true,  update: this._updateVersion13.bind(this)},
            {async: false, update: this._updateVersion14.bind(this)},
            {async: false, update: this._updateVersion15.bind(this)},
            {async: false, update: this._updateVersion16.bind(this)},
            {async: false, update: this._updateVersion17.bind(this)},
            {async: false, update: this._updateVersion18.bind(this)},
            {async: false, update: this._updateVersion19.bind(this)},
            {async: false, update: this._updateVersion20.bind(this)}
        ];
        if (typeof targetVersion === 'number' && targetVersion < result.length) {
            result.splice(targetVersion);
        }
        return result;
    }

    _updateVersion1(options) {
        // Version 1 changes:
        //  Added options.global.database.prefixWildcardsSupported = false.
        options.global = {
            database: {
                prefixWildcardsSupported: false
            }
        };
        return options;
    }

    _updateVersion2(options) {
        // Version 2 changes:
        //  Legacy profile update process moved into this upgrade function.
        for (const profile of options.profiles) {
            if (!Array.isArray(profile.conditionGroups)) {
                profile.conditionGroups = [];
            }
            profile.options = this._legacyProfileUpdateUpdateVersion(profile.options);
        }
        return options;
    }

    async _updateVersion3(options) {
        // Version 3 changes:
        //  Pitch accent Anki field templates added.
        await this._applyAnkiFieldTemplatesPatch(options, '/data/templates/anki-field-templates-upgrade-v2.handlebars');
        return options;
    }

    async _updateVersion4(options) {
        // Version 4 changes:
        //  Options conditions converted to string representations.
        //  Added usePopupWindow.
        //  Updated handlebars templates to include "clipboard-image" definition.
        //  Updated handlebars templates to include "clipboard-text" definition.
        //  Added hideDelay.
        //  Added inputs to profileOptions.scanning.
        //  Added pointerEventsEnabled to profileOptions.scanning.
        //  Added preventMiddleMouse to profileOptions.scanning.
        for (const {conditionGroups} of options.profiles) {
            for (const {conditions} of conditionGroups) {
                for (const condition of conditions) {
                    const value = condition.value;
                    condition.value = (
                        Array.isArray(value) ?
                        value.join(', ') :
                        `${value}`
                    );
                }
            }
        }
        const createInputDefaultOptions = () => ({
            showAdvanced: false,
            searchTerms: true,
            searchKanji: true,
            scanOnTouchMove: true,
            scanOnPenHover: true,
            scanOnPenPress: true,
            scanOnPenRelease: false,
            preventTouchScrolling: true
        });
        for (const {options: profileOptions} of options.profiles) {
            profileOptions.general.usePopupWindow = false;
            profileOptions.scanning.hideDelay = 0;
            profileOptions.scanning.pointerEventsEnabled = false;
            profileOptions.scanning.preventMiddleMouse = {
                onWebPages: false,
                onPopupPages: false,
                onSearchPages: false,
                onSearchQuery: false
            };

            const {modifier, middleMouse} = profileOptions.scanning;
            delete profileOptions.scanning.modifier;
            delete profileOptions.scanning.middleMouse;
            const scanningInputs = [];
            let modifierInput = '';
            switch (modifier) {
                case 'alt':
                case 'ctrl':
                case 'shift':
                case 'meta':
                    modifierInput = modifier;
                    break;
                case 'none':
                    modifierInput = '';
                    break;
            }
            scanningInputs.push({
                include: modifierInput,
                exclude: 'mouse0',
                types: {mouse: true, touch: false, pen: false},
                options: createInputDefaultOptions()
            });
            if (middleMouse) {
                scanningInputs.push({
                    include: 'mouse2',
                    exclude: '',
                    types: {mouse: true, touch: false, pen: false},
                    options: createInputDefaultOptions()
                });
            }
            scanningInputs.push({
                include: '',
                exclude: '',
                types: {mouse: false, touch: true, pen: true},
                options: createInputDefaultOptions()
            });
            profileOptions.scanning.inputs = scanningInputs;
        }
        await this._applyAnkiFieldTemplatesPatch(options, '/data/templates/anki-field-templates-upgrade-v4.handlebars');
        return options;
    }

    _updateVersion5(options) {
        // Version 5 changes:
        //  Removed legacy version number from profile options.
        for (const profile of options.profiles) {
            delete profile.options.version;
        }
        return options;
    }

    async _updateVersion6(options) {
        // Version 6 changes:
        //  Updated handlebars templates to include "conjugation" definition.
        //  Added global option showPopupPreview.
        //  Added global option useSettingsV2.
        //  Added anki.checkForDuplicates.
        //  Added general.glossaryLayoutMode; removed general.compactGlossaries.
        await this._applyAnkiFieldTemplatesPatch(options, '/data/templates/anki-field-templates-upgrade-v6.handlebars');
        options.global.showPopupPreview = false;
        options.global.useSettingsV2 = false;
        for (const profile of options.profiles) {
            profile.options.anki.checkForDuplicates = true;
            profile.options.general.glossaryLayoutMode = (profile.options.general.compactGlossaries ? 'compact' : 'default');
            delete profile.options.general.compactGlossaries;
            const fieldTemplates = profile.options.anki.fieldTemplates;
            if (typeof fieldTemplates === 'string') {
                profile.options.anki.fieldTemplates = this._updateVersion6AnkiTemplatesCompactTags(fieldTemplates);
            }
        }
        return options;
    }

    _updateVersion6AnkiTemplatesCompactTags(templates) {
        const rawPattern1 = '{{~#if definitionTags~}}<i>({{#each definitionTags}}{{name}}{{#unless @last}}, {{/unless}}{{/each}})</i> {{/if~}}';
        const pattern1 = new RegExp(`((\r?\n)?[ \t]*)${escapeRegExp(rawPattern1)}`, 'g');
        const replacement1 = (
        // eslint-disable-next-line indent
`{{~#scope~}}
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
{{~/scope~}}`
        );
        const simpleNewline = /\n/g;
        templates = templates.replace(pattern1, (g0, space) => (space + replacement1.replace(simpleNewline, space)));
        templates = templates.replace(/\bcompactGlossaries=((?:\.*\/)*)compactGlossaries\b/g, (g0, g1) => `${g0} data=${g1}.`);
        return templates;
    }

    _updateVersion7(options) {
        // Version 7 changes:
        //  Added general.maximumClipboardSearchLength.
        //  Added general.popupCurrentIndicatorMode.
        //  Added general.popupActionBarVisibility.
        //  Added general.popupActionBarLocation.
        //  Removed global option showPopupPreview.
        delete options.global.showPopupPreview;
        for (const profile of options.profiles) {
            profile.options.general.maximumClipboardSearchLength = 1000;
            profile.options.general.popupCurrentIndicatorMode = 'triangle';
            profile.options.general.popupActionBarVisibility = 'auto';
            profile.options.general.popupActionBarLocation = 'right';
        }
        return options;
    }

    async _updateVersion8(options) {
        // Version 8 changes:
        //  Added translation.textReplacements.
        //  Moved anki.sentenceExt to sentenceParsing.scanExtent.
        //  Added sentenceParsing.enableTerminationCharacters.
        //  Added sentenceParsing.terminationCharacters.
        //  Changed general.popupActionBarLocation.
        //  Added inputs.hotkeys.
        //  Added anki.suspendNewCards.
        //  Added popupWindow.
        //  Updated handlebars templates to include "stroke-count" definition.
        //  Updated global.useSettingsV2 to be true (opt-out).
        //  Added audio.customSourceType.
        //  Moved general.enableClipboardPopups => clipboard.enableBackgroundMonitor.
        //  Moved general.enableClipboardMonitor => clipboard.enableSearchPageMonitor. Forced value to false due to a bug which caused its value to not be read.
        //  Moved general.maximumClipboardSearchLength => clipboard.maximumSearchLength.
        //  Added clipboard.autoSearchContent.
        await this._applyAnkiFieldTemplatesPatch(options, '/data/templates/anki-field-templates-upgrade-v8.handlebars');
        options.global.useSettingsV2 = true;
        for (const profile of options.profiles) {
            profile.options.translation.textReplacements = {
                searchOriginal: true,
                groups: []
            };
            profile.options.sentenceParsing = {
                scanExtent: profile.options.anki.sentenceExt,
                enableTerminationCharacters: true,
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
            };
            delete profile.options.anki.sentenceExt;
            profile.options.general.popupActionBarLocation = 'top';
            profile.options.inputs = {
                hotkeys: [
                    {action: 'close',             key: 'Escape',    modifiers: [],       scopes: ['popup'], enabled: true},
                    {action: 'focusSearchBox',    key: 'Escape',    modifiers: [],       scopes: ['search'], enabled: true},
                    {action: 'previousEntry3',    key: 'PageUp',    modifiers: ['alt'],  scopes: ['popup', 'search'], enabled: true},
                    {action: 'nextEntry3',        key: 'PageDown',  modifiers: ['alt'],  scopes: ['popup', 'search'], enabled: true},
                    {action: 'lastEntry',         key: 'End',       modifiers: ['alt'],  scopes: ['popup', 'search'], enabled: true},
                    {action: 'firstEntry',        key: 'Home',      modifiers: ['alt'],  scopes: ['popup', 'search'], enabled: true},
                    {action: 'previousEntry',     key: 'ArrowUp',   modifiers: ['alt'],  scopes: ['popup', 'search'], enabled: true},
                    {action: 'nextEntry',         key: 'ArrowDown', modifiers: ['alt'],  scopes: ['popup', 'search'], enabled: true},
                    {action: 'historyBackward',   key: 'KeyB',      modifiers: ['alt'],  scopes: ['popup', 'search'], enabled: true},
                    {action: 'historyForward',    key: 'KeyF',      modifiers: ['alt'],  scopes: ['popup', 'search'], enabled: true},
                    {action: 'addNoteKanji',      key: 'KeyK',      modifiers: ['alt'],  scopes: ['popup', 'search'], enabled: true},
                    {action: 'addNoteTermKanji',  key: 'KeyE',      modifiers: ['alt'],  scopes: ['popup', 'search'], enabled: true},
                    {action: 'addNoteTermKana',   key: 'KeyR',      modifiers: ['alt'],  scopes: ['popup', 'search'], enabled: true},
                    {action: 'playAudio',         key: 'KeyP',      modifiers: ['alt'],  scopes: ['popup', 'search'], enabled: true},
                    {action: 'viewNote',          key: 'KeyV',      modifiers: ['alt'],  scopes: ['popup', 'search'], enabled: true},
                    {action: 'copyHostSelection', key: 'KeyC',      modifiers: ['ctrl'], scopes: ['popup'], enabled: true}
                ]
            };
            profile.options.anki.suspendNewCards = false;
            profile.options.popupWindow = {
                width: profile.options.general.popupWidth,
                height: profile.options.general.popupHeight,
                left: 0,
                top: 0,
                useLeft: false,
                useTop: false,
                windowType: 'popup',
                windowState: 'normal'
            };
            profile.options.audio.customSourceType = 'audio';
            profile.options.clipboard = {
                enableBackgroundMonitor: profile.options.general.enableClipboardPopups,
                enableSearchPageMonitor: false,
                autoSearchContent: true,
                maximumSearchLength: profile.options.general.maximumClipboardSearchLength
            };
            delete profile.options.general.enableClipboardPopups;
            delete profile.options.general.enableClipboardMonitor;
            delete profile.options.general.maximumClipboardSearchLength;
        }
        return options;
    }

    _updateVersion9(options) {
        // Version 9 changes:
        //  Added general.frequencyDisplayMode.
        //  Added general.termDisplayMode.
        for (const profile of options.profiles) {
            profile.options.general.frequencyDisplayMode = 'split-tags-grouped';
            profile.options.general.termDisplayMode = 'ruby';
        }
        return options;
    }

    async _updateVersion10(options) {
        // Version 10 changes:
        //  Removed global option useSettingsV2.
        //  Added part-of-speech field template.
        //  Added an argument to hotkey inputs.
        //  Added definitionsCollapsible to dictionary options.
        await this._applyAnkiFieldTemplatesPatch(options, '/data/templates/anki-field-templates-upgrade-v10.handlebars');
        delete options.global.useSettingsV2;
        for (const profile of options.profiles) {
            for (const dictionaryOptions of Object.values(profile.options.dictionaries)) {
                dictionaryOptions.definitionsCollapsible = 'not-collapsible';
            }
            for (const hotkey of profile.options.inputs.hotkeys) {
                switch (hotkey.action) {
                    case 'previousEntry':
                        hotkey.argument = '1';
                        break;
                    case 'previousEntry3':
                        hotkey.action = 'previousEntry';
                        hotkey.argument = '3';
                        break;
                    case 'nextEntry':
                        hotkey.argument = '1';
                        break;
                    case 'nextEntry3':
                        hotkey.action = 'nextEntry';
                        hotkey.argument = '3';
                        break;
                    default:
                        hotkey.argument = '';
                        break;
                }
            }
        }
        return options;
    }

    _updateVersion11(options) {
        // Version 11 changes:
        //  Changed dictionaries to an array.
        //  Changed audio.customSourceUrl's {expression} marker to {term}.
        //  Added anki.displayTags.
        const customSourceUrlPattern = /\{expression\}/g;
        for (const profile of options.profiles) {
            const dictionariesNew = [];
            for (const [name, {priority, enabled, allowSecondarySearches, definitionsCollapsible}] of Object.entries(profile.options.dictionaries)) {
                dictionariesNew.push({name, priority, enabled, allowSecondarySearches, definitionsCollapsible});
            }
            profile.options.dictionaries = dictionariesNew;

            let {customSourceUrl} = profile.options.audio;
            if (typeof customSourceUrl === 'string') {
                customSourceUrl = customSourceUrl.replace(customSourceUrlPattern, '{term}');
            }
            profile.options.audio.customSourceUrl = customSourceUrl;

            profile.options.anki.displayTags = 'never';
        }
        return options;
    }

    async _updateVersion12(options) {
        // Version 12 changes:
        //  Changed sentenceParsing.enableTerminationCharacters to sentenceParsing.terminationCharacterMode.
        //  Added {search-query} field marker.
        //  Updated audio.sources[] to change 'custom' into 'custom-json'.
        //  Removed audio.customSourceType.
        await this._applyAnkiFieldTemplatesPatch(options, '/data/templates/anki-field-templates-upgrade-v12.handlebars');
        for (const profile of options.profiles) {
            const {sentenceParsing, audio} = profile.options;

            sentenceParsing.terminationCharacterMode = sentenceParsing.enableTerminationCharacters ? 'custom' : 'newlines';
            delete sentenceParsing.enableTerminationCharacters;

            const {sources, customSourceUrl, customSourceType, textToSpeechVoice} = audio;
            audio.sources = sources.map((type) => {
                switch (type) {
                    case 'text-to-speech':
                    case 'text-to-speech-reading':
                        return {type, url: '', voice: textToSpeechVoice};
                    case 'custom':
                        return {type: (customSourceType === 'json' ? 'custom-json' : 'custom'), url: customSourceUrl, voice: ''};
                    default:
                        return {type, url: '', voice: ''};
                }
            });
            delete audio.customSourceType;
            delete audio.customSourceUrl;
            delete audio.textToSpeechVoice;
        }
        return options;
    }

    async _updateVersion13(options) {
        // Version 13 changes:
        //  Handlebars templates updated to use formatGlossary.
        //  Handlebars templates updated to use new media format.
        //  Added {selection-text} field marker.
        //  Added {sentence-furigana} field marker.
        //  Added anki.duplicateScopeCheckAllModels.
        //  Updated pronunciation templates.
        await this._applyAnkiFieldTemplatesPatch(options, '/data/templates/anki-field-templates-upgrade-v13.handlebars');
        for (const profile of options.profiles) {
            profile.options.anki.duplicateScopeCheckAllModels = false;
        }
        return options;
    }

    _updateVersion14(options) {
        // Version 14 changes:
        //  Added accessibility options.
        for (const profile of options.profiles) {
            profile.options.accessibility = {
                forceGoogleDocsHtmlRendering: false
            };
        }
        return options;
    }

    _updateVersion15(options) {
        // Version 15 changes:
        //  Added general.sortFrequencyDictionary.
        //  Added general.sortFrequencyDictionaryOrder.
        for (const profile of options.profiles) {
            profile.options.general.sortFrequencyDictionary = null;
            profile.options.general.sortFrequencyDictionaryOrder = 'descending';
        }
        return options;
    }

    _updateVersion16(options) {
        // Version 16 changes:
        //  Added scanning.matchTypePrefix.
        for (const profile of options.profiles) {
            profile.options.scanning.matchTypePrefix = false;
        }
        return options;
    }

    _updateVersion17(options) {
        // Version 17 changes:
        //  Added vertical sentence punctuation to terminationCharacters.
        const additions = ['︒', '︕', '︖', '︙'];
        for (const profile of options.profiles) {
            const {terminationCharacters} = profile.options.sentenceParsing;
            const newAdditions = [];
            for (const character of additions) {
                if (terminationCharacters.findIndex((value) => (value.character1 === character && value.character2 === null)) < 0) {
                    newAdditions.push(character);
                }
            }
            for (const character of newAdditions) {
                terminationCharacters.push({
                    enabled: true,
                    character1: character,
                    character2: null,
                    includeCharacterAtStart: false,
                    includeCharacterAtEnd: true
                });
            }
        }
        return options;
    }

    _updateVersion18(options) {
        // Version 18 changes:
        //  general.popupTheme's 'default' value changed to 'light'
        //  general.popupOuterTheme's 'default' value changed to 'light'
        //  general.popupOuterTheme's 'auto' value changed to 'site'
        //  Added scanning.hidePopupOnCursorExit.
        //  Added scanning.hidePopupOnCursorExitDelay.
        for (const profile of options.profiles) {
            const {general} = profile.options;
            if (general.popupTheme === 'default') {
                general.popupTheme = 'light';
            }
            switch (general.popupOuterTheme) {
                case 'default': general.popupOuterTheme = 'light'; break;
                case 'auto': general.popupOuterTheme = 'site'; break;
            }
            profile.options.scanning.hidePopupOnCursorExit = false;
            profile.options.scanning.hidePopupOnCursorExitDelay = profile.options.scanning.hideDelay;
        }
        return options;
    }

    _updateVersion19(options) {
        // Version 19 changes:
        //  Added anki.noteGuiMode.
        //  Added anki.apiKey.
        //  Renamed scanning.inputs[].options.scanOnPenPress to scanOnPenMove.
        //  Renamed scanning.inputs[].options.scanOnPenRelease to scanOnPenReleaseHover.
        //  Added scanning.inputs[].options.scanOnTouchPress.
        //  Added scanning.inputs[].options.scanOnTouchRelease.
        //  Added scanning.inputs[].options.scanOnPenPress.
        //  Added scanning.inputs[].options.scanOnPenRelease.
        //  Added scanning.inputs[].options.preventPenScrolling.
        for (const profile of options.profiles) {
            profile.options.anki.noteGuiMode = 'browse';
            profile.options.anki.apiKey = '';
            for (const input of profile.options.scanning.inputs) {
                input.options.scanOnPenMove = input.options.scanOnPenPress;
                input.options.scanOnPenReleaseHover = input.options.scanOnPenRelease;
                input.options.scanOnTouchPress = true;
                input.options.scanOnTouchRelease = false;
                input.options.scanOnPenPress = input.options.scanOnPenMove;
                input.options.scanOnPenRelease = false;
                input.options.preventPenScrolling = input.options.preventTouchScrolling;
            }
        }
        return options;
    }

    _updateVersion20(options) {
        // Version 20 changes:
        //  Added anki.downloadTimeout.
        //  Added scanning.normalizeCssZoom.
        //  Fixed general.popupTheme invalid default.
        //  Fixed general.popupOuterTheme invalid default.
        for (const profile of options.profiles) {
            profile.options.anki.downloadTimeout = 0;
            profile.options.scanning.normalizeCssZoom = true;
            const {general} = profile.options;
            if (general.popupTheme === 'default') {
                general.popupTheme = 'light';
            }
            if (general.popupOuterTheme === 'default') {
                general.popupOuterTheme = 'light';
            }
        }
        return options;
    }
}
