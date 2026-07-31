/*
 * Copyright (C) 2023-2026  Yomitan Authors
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
import {describe, expect} from 'vitest';
import {parseJson} from '../dev/json.js';
import {createTranslatorTest} from './fixtures/translator-test.js';
import {setupStubs} from './utilities/database.js';
import {createFindTermsOptions} from './utilities/translator.js';

setupStubs();

const dirname = path.dirname(fileURLToPath(import.meta.url));
const dictionaryName = 'Test Dictionary 2';
const translatorTest = await createTranslatorTest(void 0, path.join(dirname, 'data/dictionaries/valid-dictionary1'), dictionaryName);
/** @type {import('test/translator').TranslatorTestInputs} */
const {optionsPresets} = parseJson(readFileSync(path.join(dirname, 'data/translator-test-inputs.json'), {encoding: 'utf8'}));

describe('Fuseji lookup', () => {
    /**
     * @param {import('dictionary').TermDictionaryEntry[]} dictionaryEntries
     * @returns {{total: number, unique: number}}
     */
    function countDefinitionIds(dictionaryEntries) {
        const ids = new Set();
        let total = 0;
        for (const {definitions} of dictionaryEntries) {
            for (const {id} of definitions) {
                ++total;
                ids.add(id);
            }
        }
        return {total, unique: ids.size};
    }

    translatorTest('does not find fuseji terms when disabled', async ({translator}) => {
        const options = createFindTermsOptions(dictionaryName, optionsPresets, 'default');

        const {dictionaryEntries} = await translator.findTerms('split', '打〇込む', options);
        expect(dictionaryEntries.some(({headwords}) => headwords.some(({term}) => term === '打ち込む'))).toBe(false);
    });

    translatorTest('finds terms using custom fuseji trigger characters', async ({translator}) => {
        const options = createFindTermsOptions(dictionaryName, optionsPresets, 'default');
        options.enableFusejiLookup = true;
        options.fusejiTriggers = '〇●';

        const {dictionaryEntries, originalTextLength} = await translator.findTerms('split', '打〇込む', options);
        expect(originalTextLength).toBe(4);
        expect(dictionaryEntries.some(({headwords}) => headwords.some(({term}) => term === '打ち込む'))).toBe(true);
    });

    translatorTest('does not treat circle variants as triggers unless configured', async ({translator}) => {
        const options = createFindTermsOptions(dictionaryName, optionsPresets, 'default');
        options.enableFusejiLookup = true;
        options.fusejiTriggers = '●';

        const {dictionaryEntries} = await translator.findTerms('split', '打〇込む', options);
        expect(dictionaryEntries.some(({headwords}) => headwords.some(({term}) => term === '打ち込む'))).toBe(false);
    });

    translatorTest('falls back to a normal lookup for an unmasked word preceding a later trigger', async ({translator}) => {
        const options = createFindTermsOptions(dictionaryName, optionsPresets, 'default');
        options.enableFusejiLookup = true;

        const {dictionaryEntries, originalTextLength} = await translator.findTerms('split', '打ち込むマ○ド', options);
        expect(originalTextLength).toBe(4);
        expect(dictionaryEntries.some(({headwords}) => headwords.some(({term}) => term === '打ち込む'))).toBe(true);
    });

    translatorTest('finds fuseji terms at the start of scanned sentence text', async ({translator}) => {
        const options = createFindTermsOptions(dictionaryName, optionsPresets, 'default');
        options.enableFusejiLookup = true;

        const {dictionaryEntries, originalTextLength} = await translator.findTerms('split', '打〇込むという', options);
        expect(originalTextLength).toBe(4);
        expect(dictionaryEntries.some(({headwords}) => headwords.some(({term}) => term === '打ち込む'))).toBe(true);
    });

    translatorTest('finds multi-mask katakana terms', async ({translator}) => {
        const options = createFindTermsOptions(dictionaryName, optionsPresets, 'default');
        options.enableFusejiLookup = true;

        const {dictionaryEntries, originalTextLength} = await translator.findTerms('split', 'マ○ド○ルド', options);
        expect(originalTextLength).toBe(6);
        expect(dictionaryEntries.some(({headwords}) => headwords.some(({term}) => term === 'マクドナルド'))).toBe(true);
    });

    translatorTest('finds multi-mask katakana terms at the start of scanned sentence text', async ({translator}) => {
        const options = createFindTermsOptions(dictionaryName, optionsPresets, 'default');
        options.enableFusejiLookup = true;

        const {dictionaryEntries, originalTextLength} = await translator.findTerms('split', 'マ○ド○ルドに行きたい', options);
        expect(originalTextLength).toBe(6);
        expect(dictionaryEntries.some(({headwords}) => headwords.some(({term}) => term === 'マクドナルド'))).toBe(true);
    });

    translatorTest('sorts fuller fuseji matches before shorter partial matches', async ({translator}) => {
        const options = createFindTermsOptions(dictionaryName, optionsPresets, 'default');
        options.enableFusejiLookup = true;

        const {dictionaryEntries, originalTextLength} = await translator.findTerms('split', 'マ○ドナ○ドに行きたい', options);
        expect(originalTextLength).toBe(6);
        expect(dictionaryEntries.length).toBeGreaterThan(1);
        expect(dictionaryEntries[0].maxOriginalTextLength).toBe(6);
        const macdonaldIndex = dictionaryEntries.findIndex(({headwords}) => headwords.some(({term}) => term === 'マクドナルド'));
        const magiIndex = dictionaryEntries.findIndex(({headwords}) => headwords.some(({term}) => term === 'マギ'));
        expect(macdonaldIndex).toBeGreaterThanOrEqual(0);
        expect(magiIndex).toBeGreaterThan(macdonaldIndex);
    });

    translatorTest('aggregates matches across preprocessor variants and ranks shorter partials last', async ({translator}) => {
        const options = createFindTermsOptions(dictionaryName, optionsPresets, 'default');
        options.enableFusejiLookup = true;

        const {dictionaryEntries, originalTextLength} = await translator.findTerms('split', 'ま○どなるど', options);
        expect(originalTextLength).toBe(6);
        expect(dictionaryEntries[0].maxOriginalTextLength).toBe(6);
        const definitionIds = countDefinitionIds(dictionaryEntries);
        expect(definitionIds.unique).toBe(definitionIds.total);

        const hiraganaIndex = dictionaryEntries.findIndex(({headwords}) => headwords.some(({term}) => term === 'まくどなるど'));
        const katakanaIndex = dictionaryEntries.findIndex(({headwords}) => headwords.some(({term}) => term === 'マクドナルド'));
        const magiIndex = dictionaryEntries.findIndex(({headwords}) => headwords.some(({term}) => term === 'マギ'));

        expect(hiraganaIndex).toBeGreaterThanOrEqual(0);
        expect(katakanaIndex).toBeGreaterThanOrEqual(0);
        expect(magiIndex).toBeGreaterThanOrEqual(0);
        expect(magiIndex).toBeGreaterThan(hiraganaIndex);
        expect(magiIndex).toBeGreaterThan(katakanaIndex);
        expect(hiraganaIndex).toBeLessThan(katakanaIndex);
    });

    translatorTest('deduplicates repeated rows across text variants', async ({translator}) => {
        const options = createFindTermsOptions(dictionaryName, optionsPresets, 'default');
        options.enableFusejiLookup = true;
        options.textReplacements = [
            null,
            [
                {pattern: /打/g, replacement: 'う'},
                {pattern: /込/g, replacement: 'こ'},
            ],
        ];

        const {dictionaryEntries} = await translator.findTerms('split', '打〇込む', options);
        const definitionIds = countDefinitionIds(dictionaryEntries);
        expect(definitionIds.total).toBeGreaterThan(0);
        expect(definitionIds.unique).toBe(definitionIds.total);
    });

    translatorTest('finds terms with leading fuseji triggers', async ({translator}) => {
        const options = createFindTermsOptions(dictionaryName, optionsPresets, 'default');
        options.enableFusejiLookup = true;

        const {dictionaryEntries, originalTextLength} = await translator.findTerms('split', '〇ち込む', options);
        expect(originalTextLength).toBe(4);
        expect(dictionaryEntries.some(({headwords}) => headwords.some(({term}) => term === '打ち込む'))).toBe(true);
    });

    translatorTest('finds leading-trigger fuseji terms at the start of scanned sentence text', async ({translator}) => {
        const options = createFindTermsOptions(dictionaryName, optionsPresets, 'default');
        options.enableFusejiLookup = true;

        const {dictionaryEntries, originalTextLength} = await translator.findTerms('split', '〇ち込むという', options);
        expect(originalTextLength).toBe(4);
        expect(dictionaryEntries.some(({headwords}) => headwords.some(({term}) => term === '打ち込む'))).toBe(true);
    });

    translatorTest('finds terms with trailing fuseji triggers', async ({translator}) => {
        const options = createFindTermsOptions(dictionaryName, optionsPresets, 'default');
        options.enableFusejiLookup = true;

        const {dictionaryEntries, originalTextLength} = await translator.findTerms('split', '打ち込〇', options);
        expect(originalTextLength).toBe(4);
        expect(dictionaryEntries.some(({headwords}) => headwords.some(({term}) => term === '打ち込む'))).toBe(true);
    });

    translatorTest('matches masked latin terms', async ({translator}) => {
        const options = createFindTermsOptions(dictionaryName, optionsPresets, 'default');
        options.enableFusejiLookup = true;

        const {dictionaryEntries, originalTextLength} = await translator.findTerms('split', 'Eng○ish', options);
        expect(originalTextLength).toBe(7);
        expect(dictionaryEntries.some(({headwords}) => headwords.some(({term}) => term === 'English'))).toBe(true);
    });

    translatorTest('bounds the masked word to the first group when a later masked word is in range', async ({translator}) => {
        const options = createFindTermsOptions(dictionaryName, optionsPresets, 'default');
        options.enableFusejiLookup = true;

        const {dictionaryEntries, originalTextLength} = await translator.findTerms('split', '〇ち込む」「マ○ド', options);
        expect(originalTextLength).toBe(4);
        expect(dictionaryEntries.some(({headwords}) => headwords.some(({term}) => term === '打ち込む'))).toBe(true);
    });
});
