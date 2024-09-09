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

import type * as DictionaryDatabase from './dictionary-database';
import type * as Dictionary from './dictionary';
import type * as Translation from './translation';
import type * as Language from './language';

export type TextDeinflectionOptions = [
    textReplacements: null | Translation.FindTermsTextReplacement[],
    halfWidth: boolean,
    numeric: boolean,
    alphabetic: boolean,
    katakana: boolean,
    hiragana: boolean,
    emphatic: [collapseEmphatic: boolean, collapseEmphaticFull: boolean],
];

export type TextDeinflectionOptionsArrays = [
    textReplacements: (null | Translation.FindTermsTextReplacement[])[],
    halfWidth: boolean[],
    numeric: boolean[],
    alphabetic: boolean[],
    katakana: boolean[],
    hiragana: boolean[],
    emphatic: [collapseEmphatic: boolean, collapseEmphaticFull: boolean][],
];

export type TextProcessorRuleChainCandidate = string[];

export type VariantAndTextProcessorRuleChainCandidatesMap = Map<string, TextProcessorRuleChainCandidate[]>;

export type TermDictionaryEntry = {
    inflectionRuleChainCandidates: InflectionRuleChainCandidate[];
    textProcessorRuleChainCandidates: TextProcessorRuleChainCandidate[];
} & Omit<Dictionary.TermDictionaryEntry, 'inflectionRuleChainCandidates'>;

export type InflectionRuleChainCandidate = {
    inflectionRules: string[];
    source: Dictionary.InflectionSource;
};

export type DatabaseDeinflection = {
    conditions: number;
    databaseEntries: DictionaryDatabase.TermEntry[];
    deinflectedText: string;
    inflectionRuleChainCandidates: InflectionRuleChainCandidate[];
    originalText: string;
    textProcessorRuleChainCandidates: TextProcessorRuleChainCandidate[];
    transformedText: string;
};

export type DictionaryEntryGroup = {
    dictionaryEntries: TermDictionaryEntry[];
    ids: Set<number>;
};

export type TextProcessorMap = Map<
    string,
    {
        textPostprocessors: Language.TextProcessorWithId<unknown>[];
        textPreprocessors: Language.TextProcessorWithId<unknown>[];
    }
>;

export type ReadingNormalizerMap = Map<
    string,
    Language.ReadingNormalizer
>;

export type TextCache = Map<string, Map<string, Map<unknown, string>>>;
