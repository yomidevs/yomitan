/*
 * Copyright (C) 2023  Yomitan Authors
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

import {readFileSync} from 'fs';
import {fileURLToPath} from 'node:url';
import path from 'path';
import {describe} from 'vitest';
import {parseJson} from '../dev/json.js';
import {AnkiNoteBuilder} from '../ext/js/data/anki-note-builder.js';
import {JapaneseUtil} from '../ext/js/language/sandbox/japanese-util.js';
import {AnkiTemplateRenderer} from '../ext/js/templates/sandbox/anki-template-renderer.js';
import {createTranslatorTest} from './fixtures/translator-test.js';
import {createTestAnkiNoteData} from './utilities/anki.js';
import {createFindOptions} from './utilities/translator.js';

/**
 * @param {'terms'|'kanji'} type
 * @returns {string[]}
 */
function getFieldMarkers(type) {
    switch (type) {
        case 'terms':
            return [
                'audio',
                'clipboard-image',
                'clipboard-text',
                'cloze-body',
                'cloze-prefix',
                'cloze-suffix',
                'conjugation',
                'dictionary',
                'document-title',
                'expression',
                'frequencies',
                'furigana',
                'furigana-plain',
                'glossary',
                'glossary-brief',
                'glossary-no-dictionary',
                'part-of-speech',
                'pitch-accents',
                'pitch-accent-graphs',
                'pitch-accent-positions',
                'reading',
                'screenshot',
                'search-query',
                'selection-text',
                'sentence',
                'sentence-furigana',
                'tags',
                'url'
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
                'glossary',
                'kunyomi',
                'onyomi',
                'screenshot',
                'search-query',
                'selection-text',
                'sentence',
                'sentence-furigana',
                'stroke-count',
                'tags',
                'url'
            ];
        default:
            return [];
    }
}

/**
 * @param {import('dictionary').DictionaryEntry[]} dictionaryEntries
 * @param {'terms'|'kanji'} type
 * @param {import('settings').ResultOutputMode} mode
 * @param {string} template
 * @param {import('vitest').ExpectStatic} expect
 * @returns {Promise<import('anki').NoteFields[]>}
 */
async function getRenderResults(dictionaryEntries, type, mode, template, expect) {
    const markers = getFieldMarkers(type);
    /** @type {import('anki-note-builder').Field[]} */
    const fields = [];
    for (const marker of markers) {
        fields.push([marker, `{${marker}}`]);
    }

    const ankiTemplateRenderer = new AnkiTemplateRenderer();
    await ankiTemplateRenderer.prepare();
    const japaneseUtil = new JapaneseUtil(null);
    const clozePrefix = 'cloze-prefix';
    const clozeSuffix = 'cloze-suffix';
    const results = [];
    for (const dictionaryEntry of dictionaryEntries) {
        let source = '';
        switch (dictionaryEntry.type) {
            case 'kanji':
                source = dictionaryEntry.character;
                break;
            case 'term':
                if (dictionaryEntry.headwords.length > 0 && dictionaryEntry.headwords[0].sources.length > 0) {
                    source = dictionaryEntry.headwords[0].sources[0].originalText;
                }
                break;
        }
        const ankiNoteBuilder = new AnkiNoteBuilder(japaneseUtil, ankiTemplateRenderer.templateRenderer);
        const context = {
            url: 'url:',
            sentence: {
                text: `${clozePrefix}${source}${clozeSuffix}`,
                offset: clozePrefix.length
            },
            documentTitle: 'title',
            query: 'query',
            fullQuery: 'fullQuery'
        };
        /** @type {import('anki-note-builder').CreateNoteDetails} */
        const details = {
            dictionaryEntry,
            mode: 'test',
            context,
            template,
            deckName: 'deckName',
            modelName: 'modelName',
            fields,
            tags: ['yomitan'],
            checkForDuplicates: true,
            duplicateScope: 'collection',
            duplicateScopeCheckAllModels: false,
            resultOutputMode: mode,
            glossaryLayoutMode: 'default',
            compactTags: false,
            requirements: [],
            mediaOptions: null
        };
        const {note: {fields: noteFields}, errors} = await ankiNoteBuilder.createNote(details);
        for (const error of errors) {
            console.error(error);
        }
        expect(errors.length).toStrictEqual(0);
        results.push(noteFields);
    }

    return results;
}

const dirname = path.dirname(fileURLToPath(import.meta.url));
const dictionaryName = 'Test Dictionary 2';
const test = await createTranslatorTest(void 0, path.join(dirname, 'data/dictionaries/valid-dictionary1'), dictionaryName);

describe('Dictionary data', () => {
    const testInputsFilePath = path.join(dirname, 'data/translator-test-inputs.json');
    /** @type {import('test/translator').TranslatorTestInputs} */
    const {optionsPresets, tests} = parseJson(readFileSync(testInputsFilePath, {encoding: 'utf8'}));

    const testResults1FilePath = path.join(dirname, 'data/translator-test-results.json');
    /** @type {import('test/translator').TranslatorTestResults} */
    const expectedResults1 = parseJson(readFileSync(testResults1FilePath, {encoding: 'utf8'}));

    const testResults2FilePath = path.join(dirname, 'data/translator-test-results-note-data1.json');
    /** @type {import('test/translator').TranslatorTestNoteDataResults} */
    const expectedResults2 = parseJson(readFileSync(testResults2FilePath, {encoding: 'utf8'}));

    const testResults3FilePath = path.join(dirname, 'data/anki-note-builder-test-results.json');
    /** @type {import('test/translator').AnkiNoteBuilderTestResults} */
    const expectedResults3 = parseJson(readFileSync(testResults3FilePath, {encoding: 'utf8'}));

    const template = readFileSync(path.join(dirname, '../ext/data/templates/default-anki-field-templates.handlebars'), {encoding: 'utf8'});

    const testCases = tests.map((data, i) => ({
        data,
        expected1: expectedResults1[i],
        expected2: expectedResults2[i],
        expected3: expectedResults3[i]
    }));
    describe.each(testCases)('Test %#: $data.name', ({data, expected1, expected2, expected3}) => {
        test('Test', async ({translator, ankiNoteDataCreator, expect}) => {
            switch (data.func) {
                case 'findTerms':
                    {
                        const {mode, text} = data;
                        /** @type {import('translation').FindTermsOptions} */
                        const options = createFindOptions(dictionaryName, optionsPresets, data.options);
                        const {dictionaryEntries, originalTextLength} = await translator.findTerms(mode, text, options);
                        const renderResults = mode !== 'simple' ? await getRenderResults(dictionaryEntries, 'terms', mode, template, expect) : null;
                        const noteDataList = mode !== 'simple' ? dictionaryEntries.map((dictionaryEntry) => createTestAnkiNoteData(ankiNoteDataCreator, dictionaryEntry, mode)) : null;
                        expect.soft(originalTextLength).toStrictEqual(expected1.originalTextLength);
                        expect.soft(dictionaryEntries).toStrictEqual(expected1.dictionaryEntries);
                        expect.soft(noteDataList).toEqual(expected2.noteDataList);
                        expect.soft(renderResults).toStrictEqual(expected3.results);
                    }
                    break;
                case 'findKanji':
                    {
                        const {text} = data;
                        /** @type {import('translation').FindKanjiOptions} */
                        const options = createFindOptions(dictionaryName, optionsPresets, data.options);
                        const dictionaryEntries = await translator.findKanji(text, options);
                        const renderResults = await getRenderResults(dictionaryEntries, 'kanji', 'split', template, expect);
                        const noteDataList = dictionaryEntries.map((dictionaryEntry) => createTestAnkiNoteData(ankiNoteDataCreator, dictionaryEntry, 'split'));
                        expect.soft(dictionaryEntries).toStrictEqual(expected1.dictionaryEntries);
                        expect.soft(noteDataList).toEqual(expected2.noteDataList);
                        expect.soft(renderResults).toStrictEqual(expected3.results);
                    }
                    break;
            }
        });
    });
});
