/*
 * Copyright (C) 2024-2025  Yomitan Authors
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

/**
 * Gets a list of field markers from the standard Handlebars template.
 * @param {import('dictionary').DictionaryEntryType} type What type of dictionary entry to get the fields for.
 * @param {string} language
 * @returns {string[]} The list of field markers.
 * @throws {Error}
 */
export function getStandardFieldMarkers(type, language = 'ja') {
    switch (type) {
        case 'term': {
            const markers = [
                'audio',
                'clipboard-image',
                'clipboard-text',
                'cloze-body',
                'cloze-prefix',
                'cloze-suffix',
                'conjugation',
                'dictionary',
                'dictionary-alias',
                'document-title',
                'expression',
                'frequencies',
                'frequency-harmonic-rank',
                'frequency-harmonic-occurrence',
                'frequency-average-rank',
                'frequency-average-occurrence',
                'glossary',
                'glossary-brief',
                'glossary-no-dictionary',
                'glossary-plain',
                'glossary-plain-no-dictionary',
                'glossary-first',
                'glossary-first-brief',
                'glossary-first-no-dictionary',
                'part-of-speech',
                'phonetic-transcriptions',
                'reading',
                'screenshot',
                'search-query',
                'popup-selection-text',
                'sentence',
                'tags',
                'url',
            ];
            if (language === 'ja') {
                markers.push(
                    'cloze-body-kana',
                    'furigana',
                    'furigana-plain',
                    'pitch-accents',
                    'pitch-accent-graphs',
                    'pitch-accent-graphs-jj',
                    'pitch-accent-positions',
                    'pitch-accent-categories',
                    'sentence-furigana',
                    'sentence-furigana-plain',
                );
            }
            return markers;
        }
        case 'kanji':
            return [
                'character',
                'clipboard-image',
                'clipboard-text',
                'cloze-body',
                'cloze-prefix',
                'cloze-suffix',
                'dictionary',
                'dictionary-alias',
                'document-title',
                'frequencies',
                'frequency-harmonic-rank',
                'frequency-harmonic-occurrence',
                'frequency-average-rank',
                'frequency-average-occurrence',
                'glossary',
                'kunyomi',
                'onyomi',
                'onyomi-hiragana',
                'screenshot',
                'search-query',
                'popup-selection-text',
                'sentence',
                'sentence-furigana',
                'sentence-furigana-plain',
                'stroke-count',
                'tags',
                'url',
            ];
        default:
            throw new Error(`Unsupported type: ${type}`);
    }
}

/**
 * @param {import('settings').ProfileOptions} options
 * @param {import('dictionary-importer').Summary[]} dictionaryInfo
 * @returns {string}
 */
export function getDynamicTemplates(options, dictionaryInfo) {
    let dynamicTemplates = '\n';
    for (const dictionary of options.dictionaries) {
        const currentDictionaryInfo = dictionaryInfo.find(({title}) => title === dictionary.name);
        if (!dictionary.enabled) { continue; }
        const totalTerms = currentDictionaryInfo?.counts?.terms?.total;
        if (totalTerms && totalTerms > 0) {
            dynamicTemplates += `
{{#*inline "single-glossary-${getKebabCase(dictionary.name)}"}}
    {{~> glossary selectedDictionary='${escapeDictName(dictionary.name)}'}}
{{/inline}}

{{#*inline "single-glossary-${getKebabCase(dictionary.name)}-no-dictionary"}}
    {{~> glossary selectedDictionary='${escapeDictName(dictionary.name)}' noDictionaryTag=true}}
{{/inline}}

{{#*inline "single-glossary-${getKebabCase(dictionary.name)}-brief"}}
    {{~> glossary selectedDictionary='${escapeDictName(dictionary.name)}' brief=true}}
{{/inline}}

{{#*inline "single-glossary-${getKebabCase(dictionary.name)}-plain"}}
    {{~> glossary-plain selectedDictionary='${escapeDictName(dictionary.name)}'}}
{{/inline}}

{{#*inline "single-glossary-${getKebabCase(dictionary.name)}-plain-no-dictionary"}}
    {{~> glossary-plain-no-dictionary selectedDictionary='${escapeDictName(dictionary.name)}' noDictionaryTag=true}}
{{/inline}}
`;
        }
        const totalMeta = currentDictionaryInfo?.counts?.termMeta;
        if (totalMeta && totalMeta.freq && totalMeta.freq > 0) {
            dynamicTemplates += `
{{#*inline "single-frequency-number-${getKebabCase(dictionary.name)}"}}
    {{~> single-frequency-number selectedDictionary='${escapeDictName(dictionary.name)}'}}
{{/inline}}
{{#*inline "single-frequency-${getKebabCase(dictionary.name)}"}}
    {{~> frequencies selectedDictionary='${escapeDictName(dictionary.name)}'}}
{{/inline}}
`;
        }
    }
    return dynamicTemplates;
}

/**
 * @param {import('settings').DictionariesOptions} dictionaries
 * @param {import('dictionary-importer').Summary[]} dictionaryInfo
 * @returns {string[]} The list of field markers.
 */
export function getDynamicFieldMarkers(dictionaries, dictionaryInfo) {
    const markers = [];
    for (const dictionary of dictionaries) {
        const currentDictionaryInfo = dictionaryInfo.find(({title}) => title === dictionary.name);
        if (!dictionary.enabled) { continue; }
        const totalTerms = currentDictionaryInfo?.counts?.terms?.total;
        if (totalTerms && totalTerms > 0) {
            markers.push(`single-glossary-${getKebabCase(dictionary.name)}`);
        }
        const totalMeta = currentDictionaryInfo?.counts?.termMeta;
        if (totalMeta && totalMeta.freq && totalMeta.freq > 0) {
            markers.push(`single-frequency-number-${getKebabCase(dictionary.name)}`);
        }
    }
    return markers;
}

/**
 * @param {string} str
 * @returns {string}
 */
export function getKebabCase(str) {
    return str
        .replace(/[\s_\u3000]/g, '-')
        .replace(/[^\p{L}\p{N}-]/gu, '')
        .replace(/--+/g, '-')
        .replace(/^-|-$/g, '')
        .toLowerCase();
}

/**
 * @param {string} name
 * @returns {string}
 */
function escapeDictName(name) {
    return name
        .replace(/\\/g, '\\\\')
        .replace(/'/g, '\\\'');
}
