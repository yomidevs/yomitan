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

const placeholder = '${title}';

/**
 * @template {import('test/translator').OptionsType} T
 * @param {T} type
 * @param {import('test/translator').OptionsPresetObject} optionsPresets
 * @param {import('test/translator').OptionsList} optionsArray
 * @returns {import('test/translator').OptionsPresetGeneric<T>}
 * @throws {Error}
 */
function getCompositePreset(type, optionsPresets, optionsArray) {
    const preset = /** @type {import('test/translator').OptionsPresetGeneric<T>} */ ({type});
    if (!Array.isArray(optionsArray)) { optionsArray = [optionsArray]; }
    for (const entry of optionsArray) {
        switch (typeof entry) {
            case 'string':
                {
                    if (!Object.prototype.hasOwnProperty.call(optionsPresets, entry)) {
                        throw new Error('Options preset not found');
                    }
                    const preset2 = optionsPresets[entry];
                    if (preset2.type !== type) {
                        throw new Error('Invalid options preset type');
                    }
                    Object.assign(preset, structuredClone(preset2));
                }
                break;
            case 'object':
                if (entry.type !== type) {
                    throw new Error('Invalid options preset type');
                }
                Object.assign(preset, structuredClone(entry));
                break;
            default:
                throw new Error('Invalid options type');
        }
    }
    return preset;
}


/**
 * @param {string} dictionaryName
 * @param {import('test/translator').OptionsPresetObject} optionsPresets
 * @param {import('test/translator').OptionsList} optionsArray
 * @returns {import('translation').FindKanjiOptions}
 */
export function createFindKanjiOptions(dictionaryName, optionsPresets, optionsArray) {
    const preset = getCompositePreset('kanji', optionsPresets, optionsArray);

    /** @type {import('translation').KanjiEnabledDictionaryMap} */
    const enabledDictionaryMap = new Map();
    const presetEnabledDictionaryMap = preset.enabledDictionaryMap;
    if (Array.isArray(presetEnabledDictionaryMap)) {
        for (const [key, value] of presetEnabledDictionaryMap) {
            enabledDictionaryMap.set(key === placeholder ? dictionaryName : key, value);
        }
    }

    return {
        enabledDictionaryMap,
        removeNonJapaneseCharacters: !!preset.removeNonJapaneseCharacters
    };
}

/**
 * @param {string} dictionaryName
 * @param {import('test/translator').OptionsPresetObject} optionsPresets
 * @param {import('test/translator').OptionsList} optionsArray
 * @returns {import('translation').FindTermsOptions}
 */
export function createFindTermsOptions(dictionaryName, optionsPresets, optionsArray) {
    const preset = getCompositePreset('terms', optionsPresets, optionsArray);

    /** @type {import('translation').TermEnabledDictionaryMap} */
    const enabledDictionaryMap = new Map();
    const presetEnabledDictionaryMap = preset.enabledDictionaryMap;
    if (Array.isArray(presetEnabledDictionaryMap)) {
        for (const [key, value] of presetEnabledDictionaryMap) {
            enabledDictionaryMap.set(key === placeholder ? dictionaryName : key, value);
        }
    }

    /** @type {import('translation').FindTermsTextReplacements} */
    const textReplacements = [];
    if (Array.isArray(preset.textReplacements)) {
        for (const value of preset.textReplacements) {
            if (Array.isArray(value)) {
                const array = [];
                for (const {pattern, flags, replacement} of value) {
                    array.push({pattern: new RegExp(pattern, flags), replacement});
                }
                textReplacements.push(array);
            } else {
                // Null
                textReplacements.push(value);
            }
        }
    }

    const {
        matchType,
        deinflect,
        mainDictionary,
        sortFrequencyDictionary,
        sortFrequencyDictionaryOrder,
        removeNonJapaneseCharacters,
        convertHalfWidthCharacters,
        convertNumericCharacters,
        convertAlphabeticCharacters,
        convertHiraganaToKatakana,
        convertKatakanaToHiragana,
        collapseEmphaticSequences,
        excludeDictionaryDefinitions,
        searchResolution
    } = preset;

    return {
        matchType: typeof matchType !== 'undefined' ? matchType : 'exact',
        deinflect: typeof deinflect !== 'undefined' ? deinflect : true,
        mainDictionary: typeof mainDictionary !== 'undefined' && mainDictionary !== placeholder ? mainDictionary : dictionaryName,
        sortFrequencyDictionary: typeof sortFrequencyDictionary !== 'undefined' ? sortFrequencyDictionary : null,
        sortFrequencyDictionaryOrder: typeof sortFrequencyDictionaryOrder !== 'undefined' ? sortFrequencyDictionaryOrder : 'ascending',
        removeNonJapaneseCharacters: typeof removeNonJapaneseCharacters !== 'undefined' ? removeNonJapaneseCharacters : false,
        convertHalfWidthCharacters: typeof convertHalfWidthCharacters !== 'undefined' ? convertHalfWidthCharacters : 'false',
        convertNumericCharacters: typeof convertNumericCharacters !== 'undefined' ? convertNumericCharacters : 'false',
        convertAlphabeticCharacters: typeof convertAlphabeticCharacters !== 'undefined' ? convertAlphabeticCharacters : 'false',
        convertHiraganaToKatakana: typeof convertHiraganaToKatakana !== 'undefined' ? convertHiraganaToKatakana : 'false',
        convertKatakanaToHiragana: typeof convertKatakanaToHiragana !== 'undefined' ? convertKatakanaToHiragana : 'false',
        collapseEmphaticSequences: typeof collapseEmphaticSequences !== 'undefined' ? collapseEmphaticSequences : 'false',
        textReplacements,
        enabledDictionaryMap,
        excludeDictionaryDefinitions: Array.isArray(excludeDictionaryDefinitions) ? new Set(excludeDictionaryDefinitions) : null,
        searchResolution: typeof searchResolution !== 'undefined' ? searchResolution : 'letter'
    };
}
