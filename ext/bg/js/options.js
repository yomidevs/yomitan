/*
 * Copyright (C) 2016-2020  Yomichan Authors
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

/*
 * Generic options functions
 */

function optionsGetStringHashCode(string) {
    let hashCode = 0;

    if (typeof string !== 'string') { return hashCode; }

    for (let i = 0, charCode = string.charCodeAt(i); i < string.length; charCode = string.charCodeAt(++i)) {
        hashCode = ((hashCode << 5) - hashCode) + charCode;
        hashCode |= 0;
    }

    return hashCode;
}

function optionsGenericApplyUpdates(options, updates) {
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


/*
 * Per-profile options
 */

const profileOptionsVersionUpdates = [
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
        if (optionsGetStringHashCode(options.anki.fieldTemplates) === 1285806040) {
            options.anki.fieldTemplates = null;
        }
    },
    (options) => {
        if (optionsGetStringHashCode(options.anki.fieldTemplates) === -250091611) {
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
        if (optionsGetStringHashCode(options.anki.fieldTemplates) === 1444379824) {
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

function profileOptionsCreateDefaults() {
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
            showIframePopupsInRootFrame: false
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
            enableSearchTags: false
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

function profileOptionsSetDefaults(options) {
    const defaults = profileOptionsCreateDefaults();

    const combine = (target, source) => {
        for (const key in source) {
            if (!hasOwn(target, key)) {
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

function profileOptionsUpdateVersion(options) {
    profileOptionsSetDefaults(options);
    return optionsGenericApplyUpdates(options, profileOptionsVersionUpdates);
}


/*
 * Global options
 *
 * Each profile has an array named "conditionGroups", which is an array of condition groups
 * which enable the contextual selection of profiles. The structure of the array is as follows:
 * [
 *     {
 *         conditions: [
 *             {
 *                 type: "string",
 *                 operator: "string",
 *                 value: "string"
 *             },
 *             // ...
 *         ]
 *     },
 *     // ...
 * ]
 */

const optionsVersionUpdates = [
    (options) => {
        options.global = {
            database: {
                prefixWildcardsSupported: false
            }
        };
    }
];

function optionsUpdateVersion(options, defaultProfileOptions) {
    // Ensure profiles is an array
    if (!Array.isArray(options.profiles)) {
        options.profiles = [];
    }

    // Remove invalid
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

    // Update profile options
    for (const profile of profiles) {
        if (!Array.isArray(profile.conditionGroups)) {
            profile.conditionGroups = [];
        }
        profile.options = profileOptionsUpdateVersion(profile.options);
    }

    // Version
    if (typeof options.version !== 'number') {
        options.version = 0;
    }

    // Generic updates
    return optionsGenericApplyUpdates(options, optionsVersionUpdates);
}

function optionsLoad() {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(['options'], (store) => {
            const error = chrome.runtime.lastError;
            if (error) {
                reject(new Error(error));
            } else {
                resolve(store.options);
            }
        });
    }).then((optionsStr) => {
        if (typeof optionsStr === 'string') {
            const options = JSON.parse(optionsStr);
            if (isObject(options)) {
                return options;
            }
        }
        return {};
    }).catch(() => {
        return {};
    }).then((options) => {
        return (
            Array.isArray(options.profiles) ?
            optionsUpdateVersion(options, {}) :
            optionsUpdateVersion({}, options)
        );
    });
}

function optionsSave(options) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.set({options: JSON.stringify(options)}, () => {
            const error = chrome.runtime.lastError;
            if (error) {
                reject(new Error(error));
            } else {
                resolve();
            }
        });
    });
}

function optionsGetDefault() {
    return optionsUpdateVersion({}, {});
}
