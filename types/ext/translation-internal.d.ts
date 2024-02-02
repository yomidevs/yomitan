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

export type TextDeinflectionOptions = [
    textReplacements: Translation.FindTermsTextReplacement[] | null,
    halfWidth: boolean,
    numeric: boolean,
    alphabetic: boolean,
    katakana: boolean,
    hiragana: boolean,
    emphatic: [collapseEmphatic: boolean, collapseEmphaticFull: boolean],
];

export type TextDeinflectionOptionsArrays = [
    textReplacements: (Translation.FindTermsTextReplacement[] | null)[],
    halfWidth: boolean[],
    numeric: boolean[],
    alphabetic: boolean[],
    katakana: boolean[],
    hiragana: boolean[],
    emphatic: [collapseEmphatic: boolean, collapseEmphaticFull: boolean][],
];

export type DatabaseDeinflection = {
    originalText: string;
    transformedText: string;
    deinflectedText: string;
    conditions: number;
    inflectionRuleChainCandidates: Dictionary.InflectionRuleChainCandidate[];
    databaseEntries: DictionaryDatabase.TermEntry[];
};
