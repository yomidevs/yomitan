/*
 * Copyright (C) 2026  Yomitan Authors
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

import {describe, expect, test} from 'vitest';
import {Translator} from '../ext/js/language/translator.js';

const dictionary = 'Test English Dictionary';

/**
 * @param {string[]} termList
 * @returns {Promise<import('dictionary-database').TermEntry[]>}
 */
async function findTermsBulk(termList) {
    /** @type {import('dictionary-database').TermEntry[]} */
    const entries = [];
    for (const [index, term] of termList.entries()) {
        if (term !== 'admire') { continue; }
        entries.push({
            index,
            matchType: 'exact',
            matchSource: 'term',
            term: 'admire',
            reading: '',
            definitionTags: [],
            termTags: [],
            rules: ['v'],
            definitions: ['admire definition'],
            score: 1,
            dictionary,
            id: 1,
            sequence: -1,
        });
    }
    return entries;
}

/**
 * @returns {Translator}
 */
function createTranslator() {
    const translator = new Translator(/** @type {import('../ext/js/dictionary/dictionary-database.js').DictionaryDatabase} */ (/** @type {unknown} */ ({
        findTermsBulk,
    })));
    translator.prepare();
    return translator;
}

describe('English translator POS filtering', () => {
    test('matches verb entries for -able deinflections through adverbs', async () => {
        const translator = createTranslator();
        const {dictionaryEntries} = await translator.findTerms('simple', 'admirably', {
            matchType: 'exact',
            deinflect: true,
            mainDictionary: dictionary,
            sortFrequencyDictionary: null,
            sortFrequencyDictionaryOrder: 'descending',
            removeNonJapaneseCharacters: false,
            primaryReading: '',
            textReplacements: [null],
            enabledDictionaryMap: new Map([
                [dictionary, {
                    index: 0,
                    alias: dictionary,
                    allowSecondarySearches: false,
                    partsOfSpeechFilter: true,
                    useDeinflections: true,
                }],
            ]),
            excludeDictionaryDefinitions: null,
            searchResolution: 'word',
            language: 'en',
            useAllFrequencyDictionaries: false,
        });

        expect(dictionaryEntries).toHaveLength(1);
        expect(dictionaryEntries[0].headwords[0].term).toBe('admire');
        expect(dictionaryEntries[0].headwords[0].wordClasses).toStrictEqual(['v']);
        const inflectionRuleChainCandidates = dictionaryEntries[0].inflectionRuleChainCandidates.map(({source, inflectionRules}) => ({
            source,
            inflectionRules: inflectionRules.map(({name}) => name),
        }));
        expect(inflectionRuleChainCandidates).toContainEqual({
            source: 'algorithm',
            inflectionRules: ['-able', 'adverb'],
        });
    });
});
