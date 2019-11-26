/*
 * Copyright (C) 2016  Alex Yatskov <alex@foosoft.net>
 * Author: Alex Yatskov <alex@foosoft.net>
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
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */


/*
 * Generic options functions
 */

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
        const fieldTemplatesDefault = profileOptionsGetDefaultFieldTemplates();
        options.general.resultOutputMode = options.general.groupResults ? 'group' : 'split';
        options.anki.fieldTemplates = (
            (utilStringHashCode(options.anki.fieldTemplates) !== -805327496) ?
            `{{#if merge}}${fieldTemplatesDefault}{{else}}${options.anki.fieldTemplates}{{/if}}` :
            fieldTemplatesDefault
        );
    },
    (options) => {
        if (utilStringHashCode(options.anki.fieldTemplates) === 1285806040) {
            options.anki.fieldTemplates = profileOptionsGetDefaultFieldTemplates();
        }
    },
    (options) => {
        if (utilStringHashCode(options.anki.fieldTemplates) === -250091611) {
            options.anki.fieldTemplates = profileOptionsGetDefaultFieldTemplates();
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
    }
];

function profileOptionsGetDefaultFieldTemplates() {
    return `
{{#*inline "glossary-single"}}
    {{~#unless brief~}}
        {{~#if definitionTags~}}<i>({{#each definitionTags}}{{name}}{{#unless @last}}, {{/unless}}{{/each}})</i> {{/if~}}
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

{{#*inline "audio"}}{{/inline}}

{{#*inline "character"}}
    {{~definition.character~}}
{{/inline}}

{{#*inline "dictionary"}}
    {{~definition.dictionary~}}
{{/inline}}

{{#*inline "expression"}}
    {{~#if merge~}}
        {{~#if modeTermKana~}}
            {{~#each definition.reading~}}
                {{{.}}}
                {{~#unless @last}}、{{/unless~}}
            {{~else~}}
                {{~#each definition.expression~}}
                    {{{.}}}
                    {{~#unless @last}}、{{/unless~}}
                {{~/each~}}
            {{~/each~}}
        {{~else~}}
            {{~#each definition.expression~}}
                {{{.}}}
                {{~#unless @last}}、{{/unless~}}
            {{~/each~}}
        {{~/if~}}
    {{~else~}}
        {{~#if modeTermKana~}}
            {{~#if definition.reading~}}
                {{definition.reading}}
            {{~else~}}
                {{definition.expression}}
            {{~/if~}}
        {{~else~}}
            {{definition.expression}}
        {{~/if~}}
    {{~/if~}}
{{/inline}}

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
                <ol>{{#each definition.definitions}}<li>{{> glossary-single brief=../brief compactGlossaries=../compactGlossaries}}</li>{{/each}}</ol>
            {{~else~}}
                {{~> glossary-single definition.definitions.[0] brief=brief compactGlossaries=compactGlossaries~}}
            {{~/if~}}
        {{~else if merge~}}
            {{~#if definition.definitions.[1]~}}
                <ol>{{#each definition.definitions}}<li>{{> glossary-single brief=../brief compactGlossaries=../compactGlossaries}}</li>{{/each}}</ol>
            {{~else~}}
                {{~> glossary-single definition.definitions.[0] brief=brief compactGlossaries=compactGlossaries~}}
            {{~/if~}}
        {{~else~}}
            {{~> glossary-single definition brief=brief compactGlossaries=compactGlossaries~}}
        {{~/if~}}
    {{~/if~}}
    </div>
{{/inline}}

{{#*inline "glossary-brief"}}
    {{~> glossary brief=true ~}}
{{/inline}}

{{#*inline "kunyomi"}}
    {{~#each definition.kunyomi}}{{.}}{{#unless @last}}, {{/unless}}{{/each~}}
{{/inline}}

{{#*inline "onyomi"}}
    {{~#each definition.onyomi}}{{.}}{{#unless @last}}, {{/unless}}{{/each~}}
{{/inline}}

{{#*inline "reading"}}
    {{~#unless modeTermKana~}}
        {{~#if merge~}}
            {{~#each definition.reading~}}
                {{{.}}}
                {{~#unless @last}}、{{/unless~}}
            {{~/each~}}
        {{~else~}}
            {{~definition.reading~}}
        {{~/if~}}
    {{~/unless~}}
{{/inline}}

{{#*inline "sentence"}}
    {{~#if definition.cloze}}{{definition.cloze.sentence}}{{/if~}}
{{/inline}}

{{#*inline "cloze-prefix"}}
    {{~#if definition.cloze}}{{definition.cloze.prefix}}{{/if~}}
{{/inline}}

{{#*inline "cloze-body"}}
    {{~#if definition.cloze}}{{definition.cloze.body}}{{/if~}}
{{/inline}}

{{#*inline "cloze-suffix"}}
    {{~#if definition.cloze}}{{definition.cloze.suffix}}{{/if~}}
{{/inline}}

{{#*inline "tags"}}
    {{~#each definition.definitionTags}}{{name}}{{#unless @last}}, {{/unless}}{{/each~}}
{{/inline}}

{{#*inline "url"}}
    <a href="{{definition.url}}">{{definition.url}}</a>
{{/inline}}

{{#*inline "screenshot"}}
    <img src="{{definition.screenshotFileName}}" />
{{/inline}}

{{~> (lookup . "marker") ~}}
`.trim();
}

function profileOptionsCreateDefaults() {
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
            showGuide: true,
            compactTags: false,
            compactGlossaries: false,
            mainDictionary: '',
            popupTheme: 'default',
            popupOuterTheme: 'default',
            customPopupCss: '',
            customPopupOuterCss: '',
            enableWanakana: true,
            enableClipboardMonitor: false
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
            enableOnSearchPage: true
        },

        dictionaries: {},

        parsing: {
            enableScanningParser: true,
            enableMecabParser: false,
            selectedParser: null,
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
            fieldTemplates: profileOptionsGetDefaultFieldTemplates()
        }
    };
}

function profileOptionsSetDefaults(options) {
    const defaults = profileOptionsCreateDefaults();

    const combine = (target, source) => {
        for (const key in source) {
            if (!target.hasOwnProperty(key)) {
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

const optionsVersionUpdates = [];

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

    // Generic updates
    return optionsGenericApplyUpdates(options, optionsVersionUpdates);
}

function optionsLoad() {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(['options'], store => {
            const error = chrome.runtime.lastError;
            if (error) {
                reject(new Error(error));
            } else {
                resolve(store.options);
            }
        });
    }).then(optionsStr => {
        if (typeof optionsStr === 'string') {
            const options = JSON.parse(optionsStr);
            if (isObject(options)) {
                return options;
            }
        }
        return {};
    }).catch(() => {
        return {};
    }).then(options => {
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
