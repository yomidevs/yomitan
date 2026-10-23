/*
 * Copyright (C) 2024-2026  Yomitan Authors
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

import {IDBKeyRange, indexedDB} from 'fake-indexeddb';
import {readFileSync} from 'fs';
import {fileURLToPath} from 'node:url';
import path from 'path';
import {bench, describe, vi} from 'vitest';
import {parseJson} from '../dev/json.js';
import {AnkiTemplateRenderer} from '../ext/js/templates/anki-template-renderer.js';
import {setupDomTest} from '../test/fixtures/dom-test.js';
import {createTranslatorContext} from '../test/fixtures/translator-test.js';
import {chrome, fetch} from '../test/mocks/common.js';
import {setupStubs} from '../test/utilities/database.js';
import {createFindKanjiOptions, createFindTermsOptions} from '../test/utilities/translator.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const dictionaryName = 'Test Dictionary 2';

setupStubs();

const {translator} = await createTranslatorContext(path.join(dirname, '..', 'test', 'data/dictionaries/valid-dictionary1'), dictionaryName);

const testInputsFilePath = path.join(dirname, '..', 'test', 'data/translator-test-inputs.json');
/** @type {import('test/translator').TranslatorTestInputs} */
const {optionsPresets} = parseJson(readFileSync(testInputsFilePath, {encoding: 'utf8'}));

const {dictionaryEntries: termDictionaryEntries} = await translator.findTerms(
    'split',
    '打つ',
    createFindTermsOptions(dictionaryName, optionsPresets, 'default'),
);
const kanjiDictionaryEntries = await translator.findKanji(
    '打',
    createFindKanjiOptions(dictionaryName, optionsPresets, 'kanji'),
);

// The DOM is required to render structured content glossaries. It is set up
// after the dictionary is imported because the jsdom environment replaces the
// global object, including the stubs used by the dictionary database.
const {window} = await setupDomTest();
void window;
vi.stubGlobal('indexedDB', indexedDB);
vi.stubGlobal('IDBKeyRange', IDBKeyRange);
vi.stubGlobal('fetch', fetch);
vi.stubGlobal('chrome', chrome);

const ankiTemplateRenderer = new AnkiTemplateRenderer(
    // @ts-expect-error - The document and window are not accessed by the benchmarked markers
    // eslint-disable-next-line no-undefined
    undefined,
    // eslint-disable-next-line no-undefined
    undefined,
);
await ankiTemplateRenderer.prepare();
const {templateRenderer} = ankiTemplateRenderer;

const template = readFileSync(path.join(dirname, '..', 'ext', 'data/templates/default-anki-field-templates.handlebars'), {encoding: 'utf8'});

/**
 * @param {import('dictionary').DictionaryEntry} dictionaryEntry
 * @param {'term'|'kanji'} type
 * @returns {import('anki-templates-internal').CreateDetails}
 */
function createCommonData(dictionaryEntry, type) {
    return {
        cardFormat: {
            deck: 'deck',
            fields: {},
            icon: 'big-circle',
            model: 'model',
            name: 'test',
            type,
        },
        compactTags: false,
        context: {
            documentTitle: 'documentTitle',
            fullQuery: '昨日は友達と映画を見に行った。',
            query: '打つ',
            sentence: {
                offset: 0,
                text: '彼はボールを打つのが上手だ。',
            },
            url: 'http://localhost/',
        },
        dictionaryEntry,
        dictionaryStylesMap: new Map(),
        glossaryLayoutMode: 'default',
        resultOutputMode: 'split',
    };
}

const termMarkers = [
    'expression',
    'reading',
    'furigana',
    'furigana-plain',
    'glossary',
    'glossary-brief',
    'glossary-first',
    'glossary-plain',
    'sentence',
    'sentence-furigana',
    'cloze-prefix',
    'cloze-body',
    'cloze-suffix',
    'tags',
    'frequencies',
    'pitch-accents',
    'pitch-accent-graphs',
    'conjugation',
    'part-of-speech',
    'dictionary',
    'document-title',
    'url',
];

const kanjiMarkers = [
    'character',
    'onyomi',
    'kunyomi',
    'glossary',
    'stroke-count',
    'tags',
    'frequencies',
    'dictionary',
    'url',
];

const termCommonData = createCommonData(termDictionaryEntries[0], 'term');
const kanjiCommonData = createCommonData(kanjiDictionaryEntries[0], 'kanji');

describe('AnkiTemplateRenderer', () => {
    bench(`render term note fields (n=${termMarkers.length})`, () => {
        for (const marker of termMarkers) {
            templateRenderer.render(template, {commonData: termCommonData, marker}, 'ankiNote');
        }
    });

    bench(`render kanji note fields (n=${kanjiMarkers.length})`, () => {
        for (const marker of kanjiMarkers) {
            templateRenderer.render(template, {commonData: kanjiCommonData, marker}, 'ankiNote');
        }
    });
});
