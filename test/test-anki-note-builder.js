/*
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

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const {JSDOM} = require('jsdom');
const {testMain} = require('../dev/util');
const {TranslatorVM} = require('../dev/translator-vm');


function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

async function createVM() {
    const dom = new JSDOM();
    const {Node, NodeFilter, document} = dom.window;

    const vm = new TranslatorVM({
        Node,
        NodeFilter,
        document,
        location: new URL('https://yomichan.test/')
    });

    const dictionaryDirectory = path.join(__dirname, 'data', 'dictionaries', 'valid-dictionary1');
    await vm.prepare(dictionaryDirectory, 'Test Dictionary 2');

    vm.execute([
        'js/data/anki-note-builder.js',
        'js/data/anki-util.js',
        'js/dom/sandbox/css-style-applier.js',
        'js/display/sandbox/pronunciation-generator.js',
        'js/display/sandbox/structured-content-generator.js',
        'js/templates/sandbox/anki-template-renderer.js',
        'js/templates/sandbox/anki-template-renderer-content-manager.js',
        'js/templates/sandbox/template-renderer.js',
        'js/templates/sandbox/template-renderer-media-provider.js',
        'lib/handlebars.min.js'
    ]);

    const [
        JapaneseUtil,
        AnkiNoteBuilder,
        AnkiTemplateRenderer
    ] = vm.get([
        'JapaneseUtil',
        'AnkiNoteBuilder',
        'AnkiTemplateRenderer'
    ]);

    class TemplateRendererProxy {
        constructor() {
            this._preparePromise = null;
            this._ankiTemplateRenderer = new AnkiTemplateRenderer();
        }

        async render(template, data, type) {
            await this._prepare();
            return await this._ankiTemplateRenderer.templateRenderer.render(template, data, type);
        }

        async renderMulti(items) {
            await this._prepare();
            return await this._serializeMulti(this._ankiTemplateRenderer.templateRenderer.renderMulti(items));
        }

        _prepare() {
            if (this._preparePromise === null) {
                this._preparePromise = this._prepareInternal();
            }
            return this._preparePromise;
        }

        async _prepareInternal() {
            await this._ankiTemplateRenderer.prepare();
        }

        _serializeError(error) {
            try {
                if (typeof error === 'object' && error !== null) {
                    const result = {
                        name: error.name,
                        message: error.message,
                        stack: error.stack
                    };
                    if (Object.prototype.hasOwnProperty.call(error, 'data')) {
                        result.data = error.data;
                    }
                    return result;
                }
            } catch (e) {
                // NOP
            }
            return {
                value: error,
                hasValue: true
            };
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

    return {vm, AnkiNoteBuilder, JapaneseUtil};
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

async function getRenderResults(dictionaryEntries, type, mode, template, AnkiNoteBuilder, JapaneseUtil, write) {
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
        if (!write) {
            for (const error of errors) {
                console.error(error);
            }
            assert.strictEqual(errors.length, 0);
        }
        results.push(noteFields);
    }

    return results;
}


async function main() {
    const write = (process.argv[2] === '--write');

    const {vm, AnkiNoteBuilder, JapaneseUtil} = await createVM();

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
                    const results = mode !== 'simple' ? clone(await getRenderResults(dictionaryEntries, 'terms', mode, template, AnkiNoteBuilder, JapaneseUtil, write)) : null;
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
                    const results = clone(await getRenderResults(dictionaryEntries, 'kanji', null, template, AnkiNoteBuilder, JapaneseUtil, write));
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
