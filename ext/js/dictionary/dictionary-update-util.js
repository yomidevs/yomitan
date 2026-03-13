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

import * as ajvSchemas0 from '../../lib/validate-schemas.js';
import {getKebabCase} from '../data/anki-template-util.js';
import {readResponseJson} from '../core/json.js';
import {compareRevisions} from './dictionary-data-util.js';

const ajvSchemas = /** @type {import('dictionary-importer').CompiledSchemaValidators} */ (/** @type {unknown} */ (ajvSchemas0));

/**
 * @param {string} name
 * @param {boolean} enabled
 * @param {string} styles
 * @returns {import('settings').DictionaryOptions}
 */
export function createDefaultDictionarySettings(name, enabled, styles) {
    return {
        name,
        alias: name,
        enabled,
        allowSecondarySearches: false,
        definitionsCollapsible: 'not-collapsible',
        partsOfSpeechFilter: true,
        useDeinflections: true,
        styles: styles ?? '',
    };
}

/**
 * @param {import('dictionary-importer').Summary} dictionaryInfo
 * @param {(url: string) => Promise<Response>} [fetchIndex]
 * @returns {Promise<string | null>}
 */
export async function getDictionaryUpdateDownloadUrl(dictionaryInfo, fetchIndex = fetchIndexDefault) {
    const {isUpdatable, indexUrl, revision: currentRevision, downloadUrl: currentDownloadUrl} = dictionaryInfo;
    if (!isUpdatable || !indexUrl || !currentDownloadUrl) { return null; }

    const response = await fetchIndex(indexUrl);
    if (!response.ok) {
        throw new Error(`Failed to fetch dictionary update index: ${indexUrl} (${response.status})`);
    }

    /** @type {unknown} */
    const index = await readResponseJson(response);
    if (!ajvSchemas.dictionaryIndex(index)) {
        throw new Error('Invalid dictionary index');
    }

    const validIndex = /** @type {import('dictionary-data').Index} */ (index);
    const {revision: latestRevision, downloadUrl: latestDownloadUrl} = validIndex;
    if (!compareRevisions(currentRevision, latestRevision)) {
        return null;
    }

    return latestDownloadUrl ?? currentDownloadUrl;
}

/**
 * @param {import('settings').Options} optionsFull
 * @param {string} dictionaryTitle
 * @returns {import('settings-controller').ProfilesDictionarySettings}
 */
export function getProfilesDictionarySettings(optionsFull, dictionaryTitle) {
    /** @type {import('settings-controller').ProfilesDictionarySettings} */
    const profilesDictionarySettings = {};
    for (const profile of optionsFull.profiles) {
        const dictionaries = profile.options.dictionaries;
        for (let i = 0; i < dictionaries.length; ++i) {
            if (dictionaries[i].name === dictionaryTitle) {
                profilesDictionarySettings[profile.id] = {...dictionaries[i], index: i};
                break;
            }
        }
    }
    return profilesDictionarySettings;
}

/**
 * @param {import('settings').Options} optionsFull
 * @param {import('dictionary-importer').Summary} summary
 * @param {import('settings-controller').ProfilesDictionarySettings} profilesDictionarySettings
 */
export function applyImportedDictionarySettings(optionsFull, summary, profilesDictionarySettings) {
    const {title, sequenced, styles} = summary;
    const profileIndex = optionsFull.profileCurrent;

    for (let i = 0; i < optionsFull.profiles.length; ++i) {
        const profile = optionsFull.profiles[i];
        const {options, id: profileId} = profile;
        const savedDictionarySettings = profilesDictionarySettings?.[profileId];

        if (typeof savedDictionarySettings === 'undefined') {
            const enabled = (profileIndex === i);
            const defaultSettings = createDefaultDictionarySettings(title, enabled, styles);
            const existingIndex = options.dictionaries.findIndex((dictionary) => dictionary.name === title);
            if (existingIndex >= 0) {
                options.dictionaries.splice(existingIndex, 1, defaultSettings);
            } else {
                options.dictionaries.push(defaultSettings);
            }
        } else {
            const {index, alias, name, ...currentSettings} = savedDictionarySettings;
            const newAlias = alias === name ? title : alias;
            const nextSettings = {
                ...currentSettings,
                styles,
                name: title,
                alias: newAlias,
            };
            const existingIndex = options.dictionaries.findIndex((dictionary) => dictionary.name === name || dictionary.name === title);
            if (existingIndex >= 0) {
                options.dictionaries.splice(existingIndex, 1, nextSettings);
            } else {
                const targetIndex = Math.max(0, Math.min(index, options.dictionaries.length));
                options.dictionaries.splice(targetIndex, 0, nextSettings);
            }
            if (options.general.mainDictionary === name) {
                options.general.mainDictionary = title;
            }
        }

        if (sequenced && options.general.mainDictionary === '') {
            options.general.mainDictionary = title;
        }
    }
}

/**
 * @param {import('settings').Options} optionsFull
 * @param {import('settings-controller').ProfilesDictionarySettings} profilesDictionarySettings
 * @param {string} newTitle
 * @returns {boolean}
 */
export function updateDictionaryAnkiFieldTemplates(optionsFull, profilesDictionarySettings, newTitle) {
    if (profilesDictionarySettings === null) { return false; }

    const newFieldSegment = getKebabCase(newTitle);
    let modified = false;

    for (const profile of optionsFull.profiles) {
        const savedDictionarySettings = profilesDictionarySettings[profile.id];
        if (typeof savedDictionarySettings === 'undefined') { continue; }

        const oldFieldSegment = getKebabCase(savedDictionarySettings.name);
        if (oldFieldSegment === newFieldSegment || oldFieldSegment.length === 0) { continue; }

        const oldFieldSegmentRegex = new RegExp(oldFieldSegment, 'g');
        for (const cardFormat of profile.options.anki.cardFormats) {
            const ankiTermFields = cardFormat.fields;
            for (const key of Object.keys(ankiTermFields)) {
                const {value} = ankiTermFields[key];
                const nextValue = value.replace(oldFieldSegmentRegex, newFieldSegment);
                if (nextValue !== value) {
                    ankiTermFields[key].value = nextValue;
                    modified = true;
                }
            }
        }
    }

    return modified;
}

/**
 * @param {string} url
 * @returns {Promise<Response>}
 */
async function fetchIndexDefault(url) {
    return await fetch(url);
}
