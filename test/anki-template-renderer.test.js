/*
 * Copyright (C) 2023-2024  Yomitan Authors
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

import {describe} from 'vitest';
import {createAnkiTemplateRendererTest} from './fixtures/anki-template-renderer-test.js';

const test = await createAnkiTemplateRendererTest();

describe('AnkiTemplateRenderer', () => {
    /** @type {import('template-renderer').CompositeRenderData} */
    const data = {
        commonData: {
            compactTags: false,
            context: {
                documentTitle: 'documentTitle',
                fullQuery: 'query.full',
                query: 'query',
                sentence: {
                    offset: 9,
                    text: 'sentence.query.full',
                },
                url: 'http://localhost/',
            },
            dictionaryEntry: {
                character: 'c',
                definitions: [],
                dictionary: 'dictionary',
                dictionaryAlias: 'dictionaryAlias',
                frequencies: [],
                kunyomi: [],
                onyomi: [],
                stats: {},
                tags: [],
                type: 'kanji',
            },
            dictionaryStylesMap: new Map(),
            glossaryLayoutMode: 'default',
            media: void 0,
            mode: 'test',
            resultOutputMode: 'split',
        },
        marker: 'test',
    };
    const testCases = [
        {
            name: 'regexMatch 1',
            result: 'test',
            template: '{{#regexMatch "test" "gu"}}this is a test of regexMatch{{/regexMatch}}',
        },
        {
            name: 'regexMatch 2',
            result: 'test',
            template: '{{regexMatch "test" "gu" "this is a test of regexMatch"}}',
        },
        {
            name: 'regexMatch 3',
            result: 'true',
            template: '{{#if (regexMatch "test" "gu" "this is a test of regexMatch")}}true{{else}}false{{/if}}',
        },
        {
            name: 'regexReplace 1',
            result: 'this is a TEST of regexReplace',
            template: '{{#regexReplace "test" "TEST" "gu"}}this is a test of regexReplace{{/regexReplace}}',
        },
        {
            name: 'regexReplace 2',
            result: 'this is a TEST of regexReplace',
            template: '{{regexReplace "test" "TEST" "gu" "this is a test of regexReplace"}}',
        },
        {
            name: 'regexReplace 3',
            result: 'false',
            template: '{{#if (regexReplace "test" "" "gu" "test")}}true{{else}}false{{/if}}',
        },
    ];
    describe.each(testCases)('$name', ({result: expectedResult, template}) => {
        test('Test', ({ankiTemplateRenderer, expect}) => {
            const {result} = ankiTemplateRenderer.templateRenderer.render(template, data, 'ankiNote');
            expect(result).toEqual(expectedResult);
        });
    });
});
