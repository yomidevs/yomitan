/*
 * Copyright (C) 2021  Yomichan Authors
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

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const {testMain} = require('../dev/util');
const {TranslatorVM} = require('../dev/translator-vm');


function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

async function createVM() {
    const vm = new TranslatorVM();

    const dictionaryDirectory = path.join(__dirname, 'data', 'dictionaries', 'valid-dictionary2');
    await vm.prepare(dictionaryDirectory, 'Test Dictionary 2');

    vm.execute([
        'js/data/anki-note-builder.js',
        'js/data/anki-util.js',
        'js/templates/template-renderer.js',
        'lib/handlebars.min.js'
    ]);

    const [
        JapaneseUtil,
        TemplateRenderer,
        AnkiNoteBuilder
    ] = vm.get([
        'JapaneseUtil',
        'TemplateRenderer',
        'AnkiNoteBuilder'
    ]);

    const ankiNoteDataCreator = vm.ankiNoteDataCreator;
    class TemplateRendererProxy {
        constructor() {
            const japaneseUtil = new JapaneseUtil(null);
            this._templateRenderer = new TemplateRenderer(japaneseUtil);
            this._templateRenderer.registerDataType('ankiNote', {
                modifier: ({marker, commonData}) => ankiNoteDataCreator.create(marker, commonData),
                composeData: (marker, commonData) => ({marker, commonData})
            });
        }

        async render(template, data, type) {
            return this._templateRenderer.render(template, data, type);
        }

        async renderMulti(items) {
            return this._serializeMulti(this._templateRenderer.renderMulti(items));
        }

        _serializeMulti(array) {
            for (let i = 0, ii = array.length; i < ii; ++i) {
                const value = array[i];
                const {error} = value;
                if (typeof error !== 'undefined') {
                    value.error = this._serializeError(error);
                }
            }
            return array;
        }
    }
    vm.set({TemplateRendererProxy});

    return {vm, AnkiNoteBuilder};
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
                'sentence',
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
                'sentence',
                'stroke-count',
                'tags',
                'url'
            ];
        default:
            return [];
    }
}

async function getRenderResults(dictionaryEntries, type, mode, template, AnkiNoteBuilder, write) {
    const markers = getFieldMarkers(type);
    const fields = [];
    for (const marker of markers) {
        fields.push([marker, `{${marker}}`]);
    }

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
        const ankiNoteBuilder = new AnkiNoteBuilder();
        const context = {
            url: 'url:',
            sentence: {
                text: `${clozePrefix}${source}${clozeSuffix}`,
                offset: clozePrefix.length
            },
            documentTitle: 'title'
        };
        const errors = [];
        const noteFields = (await ankiNoteBuilder.createNote({
            definition: dictionaryEntry,
            mode: null,
            context,
            template,
            deckName: 'deckName',
            modelName: 'modelName',
            fields,
            tags: ['yomichan'],
            injectedMedia: null,
            checkForDuplicates: true,
            duplicateScope: 'collection',
            resultOutputMode: mode,
            glossaryLayoutMode: 'default',
            compactTags: false,
            errors
        })).fields;
        if (!write) {
            assert.deepStrictEqual(errors, []);
        }
        results.push(noteFields);
    }

    return results;
}


async function main() {
    const write = (process.argv[2] === '--write');

    const {vm, AnkiNoteBuilder} = await createVM();

    const testInputsFilePath = path.join(__dirname, 'data', 'translator-test-inputs.json');
    const {optionsPresets, tests} = JSON.parse(fs.readFileSync(testInputsFilePath, {encoding: 'utf8'}));

    const testResults1FilePath = path.join(__dirname, 'data', 'anki-note-builder-test-results.json');
    const expectedResults1 = JSON.parse(fs.readFileSync(testResults1FilePath, {encoding: 'utf8'}));
    const actualResults1 = [];

    const template = fs.readFileSync(path.join(__dirname, '..', 'ext', 'data/templates/default-anki-field-templates.handlebars'), {encoding: 'utf8'});

    for (let i = 0, ii = tests.length; i < ii; ++i) {
        const test = tests[i];
        const expected1 = expectedResults1[i];
        switch (test.func) {
            case 'findTerms':
                {
                    const {name, mode, text} = test;
                    const options = vm.buildOptions(optionsPresets, test.options);
                    const {dictionaryEntries} = clone(await vm.translator.findTerms(mode, text, options));
                    const results = mode !== 'simple' ? clone(await getRenderResults(dictionaryEntries, 'terms', mode, template, AnkiNoteBuilder, write)) : null;
                    actualResults1.push({name, results});
                    if (!write) {
                        assert.deepStrictEqual(results, expected1.results);
                    }
                }
                break;
            case 'findKanji':
                {
                    const {name, text} = test;
                    const options = vm.buildOptions(optionsPresets, test.options);
                    const dictionaryEntries = clone(await vm.translator.findKanji(text, options));
                    const results = clone(await getRenderResults(dictionaryEntries, 'kanji', null, template, AnkiNoteBuilder, write));
                    actualResults1.push({name, results});
                    if (!write) {
                        assert.deepStrictEqual(results, expected1.results);
                    }
                }
                break;
        }
    }

    if (write) {
        // Use 2 indent instead of 4 to save a bit of file size
        fs.writeFileSync(testResults1FilePath, JSON.stringify(actualResults1, null, 2), {encoding: 'utf8'});
    }
}


if (require.main === module) { testMain(main); }
