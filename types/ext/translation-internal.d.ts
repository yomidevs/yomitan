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

import type * as DictionaryDatabase from './dictionary-database';
import type * as DictionaryData from './dictionary-data';
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

export enum DeinflectionRuleFlags {
    None = 0x0,
    VerbIchidan = 0b00000001, // Verb ichidan
    VerbGodan = 0b00000010, // Verb godan
    VerbSuru = 0b00000100, // Verb suru
    VerbKuru = 0b00001000, // Verb kuru
    VerbZuru = 0b00010000, // Verb zuru
    AdjectiveI = 0b00100000, // Adjective i
    IruEndingIntermediate = 0b01000000, // Intermediate -iru endings for progressive or perfect tense
}

export type Deinflection = {
    term: string;
    rules: DeinflectionRuleFlags;
    reasons: string[];
};

export type DatabaseDeinflection = {
    originalText: string;
    transformedText: string;
    deinflectedText: string;
    rules: DeinflectionRuleFlags;
    inflectionHypotheses: InflectionHypothesis[];
    databaseEntries: DictionaryDatabase.TermEntry[];
};

export type TextTransformation = {
    id: string;
    name: string;
    transform: Function;
    setting: Translation.FindTermsVariantMode;
};

export type InflectionHypothesis = {
    source: string;
    inflections: DictionaryData.InflectionHypothesis;
};
