/*
 * Copyright (C) 2023  Yomitan Authors
 * Copyright (C) 2021-2022  Yomichan Authors
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

import 'fake-indexeddb/auto';
import fs from 'fs';
import {fileURLToPath} from 'node:url';
import path from 'path';
import url from 'url';
import {describe, test, vi} from 'vitest';
import {TranslatorVM} from '../dev/translator-vm.js';
import {AnkiNoteBuilder} from '../ext/js/data/anki-note-builder.js';
import {JapaneseUtil} from '../ext/js/language/sandbox/japanese-util.js';

vi.stubGlobal('fetch', async (url2) => {
    const extDir = path.join(__dirname, '..', 'ext');
    let filePath;
    try {
        filePath = url.fileURLToPath(url2);
    } catch (e) {
        filePath = path.resolve(extDir, url2.replace(/^[/\\]/, ''));
    }
    await Promise.resolve();
    const content = fs.readFileSync(filePath, {encoding: null});
    return {
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => Promise.resolve(content.toString('utf8')),
        json: async () => Promise.resolve(JSON.parse(content.toString('utf8')))
    };
});
vi.mock('../ext/js/templates/template-renderer-proxy.js');

const dirname = path.dirname(fileURLToPath(import.meta.url));

async function createVM() {
    const dictionaryDirectory = path.join(dirname, 'data', 'dictionaries', 'valid-dictionary1');
    const vm = new TranslatorVM();

    await vm.prepare(dictionaryDirectory, 'Test Dictionary 2');

    return vm;
}

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

async function getRenderResults(dictionaryEntries, type, mode, template, expect) {
    const markers = getFieldMarkers(type);
    const fields = [];
    for (const marker of markers) {
        fields.push([marker, `{${marker}}`]);
    }

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
        const ankiNoteBuilder = new AnkiNoteBuilder({japaneseUtil});
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
        const {note: {fields: noteFields}, errors} = await ankiNoteBuilder.createNote({
            dictionaryEntry,
            mode: null,
            context,
            template,
            deckName: 'deckName',
            modelName: 'modelName',
            fields,
            tags: ['yomichan'],
            checkForDuplicates: true,
            duplicateScope: 'collection',
            duplicateScopeCheckAllModels: false,
            resultOutputMode: mode,
            glossaryLayoutMode: 'default',
            compactTags: false
        });
        for (const error of errors) {
            console.error(error);
        }
        expect(errors.length).toStrictEqual(0);
        results.push(noteFields);
    }

    return results;
}


async function main() {
    const vm = await createVM();

    const testInputsFilePath = path.join(dirname, 'data', 'translator-test-inputs.json');
    const {optionsPresets, tests} = JSON.parse(fs.readFileSync(testInputsFilePath, {encoding: 'utf8'}));

    const testResults1FilePath = path.join(dirname, 'data', 'anki-note-builder-test-results.json');
    const expectedResults1 = JSON.parse(fs.readFileSync(testResults1FilePath, {encoding: 'utf8'}));
    const actualResults1 = [];

    const template = fs.readFileSync(path.join(dirname, '..', 'ext', 'data/templates/default-anki-field-templates.handlebars'), {encoding: 'utf8'});

    describe.concurrent('AnkiNoteBuilder', () => {
        for (let i = 0, ii = tests.length; i < ii; ++i) {
            const t = tests[i];
            test(`${t.name}`, async ({expect}) => {
                const expected1 = expectedResults1[i];
                switch (t.func) {
                    case 'findTerms':
                        {
                            const {name, mode, text} = t;
                            const options = vm.buildOptions(optionsPresets, t.options);
                            const {dictionaryEntries} = structuredClone(await vm.translator.findTerms(mode, text, options));
                            const results = mode !== 'simple' ? structuredClone(await getRenderResults(dictionaryEntries, 'terms', mode, template, expect)) : null;
                            actualResults1.push({name, results});
                            expect(results).toStrictEqual(expected1.results);
                        }
                        break;
                    case 'findKanji':
                        {
                            const {name, text} = t;
                            const options = vm.buildOptions(optionsPresets, t.options);
                            const dictionaryEntries = structuredClone(await vm.translator.findKanji(text, options));
                            const results = structuredClone(await getRenderResults(dictionaryEntries, 'kanji', null, template, expect));
                            actualResults1.push({name, results});
                            expect(results).toStrictEqual(expected1.results);
                        }
                        break;
                }
            });
        }
    });
}
await main();
