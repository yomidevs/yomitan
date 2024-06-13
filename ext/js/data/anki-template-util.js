/*
 * Copyright (C) 2024  Yomitan Authors
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
 * @returns {string[]} The list of field markers.
 * @throws {Error}
 */
export function getStandardFieldMarkers(type) {
    switch (type) {
        case 'term':
            return [
                'audio',
                'clipboard-image',
                'clipboard-text',
                'cloze-body',
                'cloze-body-kana',
                'cloze-prefix',
                'cloze-suffix',
                'conjugation',
                'dictionary',
                'document-title',
                'expression',
                'frequencies',
                'frequency-harmonic-rank',
                'frequency-harmonic-occurrence',
                'frequency-average-rank',
                'frequency-average-occurrence',
                'furigana',
                'furigana-plain',
                'glossary',
                'glossary-brief',
                'glossary-no-dictionary',
                'glossary-first',
                'glossary-first-brief',
                'glossary-first-no-dictionary',
                'part-of-speech',
                'pitch-accents',
                'pitch-accent-graphs',
                'pitch-accent-graphs-jj',
                'pitch-accent-positions',
                'pitch-accent-categories',
                'phonetic-transcriptions',
                'reading',
                'screenshot',
                'search-query',
                'selection-text',
                'sentence',
                'sentence-furigana',
                'tags',
                'url',
            ];
        case 'kanji':
            return [
                'character',
                'clipboard-image',
                'clipboard-text',
                'cloze-body',
                'cloze-prefix',
                'cloze-suffix',
                'dictionary',
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
                'selection-text',
                'sentence',
                'sentence-furigana',
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
 * @returns {string}
 */
export function getDynamicTemplates(options) {
    let dynamicTemplates = '\n';
    for (const dictionary of options.dictionaries) {
        if (!dictionary.enabled) { continue; }
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
`;
    }
    return dynamicTemplates;
}

/**
 * @param {import('settings').DictionariesOptions} dictionaries
 * @returns {string[]} The list of field markers.
 */
export function getDynamicFieldMarkers(dictionaries) {
    const markers = [];
    for (const dictionary of dictionaries) {
        if (!dictionary.enabled) { continue; }
        markers.push(`single-glossary-${getKebabCase(dictionary.name)}`);
    }
    return markers;
}

/**
 * @param {string} str
 * @returns {string}
 */
function getKebabCase(str) {
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
