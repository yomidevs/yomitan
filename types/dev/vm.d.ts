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

import type {FindTermsMatchType, FindTermsSortOrder, FindTermsVariantMode, FindTermsEmphaticSequencesMode, FindKanjiDictionary, FindTermDictionary} from '../ext/translation';

export type PseudoChrome = {
    runtime: {
        getURL(path: string): string;
    };
};

export type PseudoFetchResponse = {
    ok: boolean;
    status: number;
    statusText: string;
    text(): Promise<string>;
    json(): Promise<unknown>;
};

export type OptionsPresetObject = {
    [key: string]: OptionsPreset;
};

export type OptionsList = string | (string | OptionsPreset)[];

export type OptionsPreset = FindKanjiOptionsPreset | FindTermsOptionsPreset;

export type FindKanjiOptionsPreset = {
    enabledDictionaryMap?: [key: string, value: FindKanjiDictionary][];
    removeNonJapaneseCharacters?: boolean;
};

export type FindTermsOptionsPreset = {
    matchType?: FindTermsMatchType;
    deinflect?: boolean;
    mainDictionary?: string;
    sortFrequencyDictionary?: string | null;
    sortFrequencyDictionaryOrder?: FindTermsSortOrder;
    removeNonJapaneseCharacters?: boolean;
    convertHalfWidthCharacters?: FindTermsVariantMode;
    convertNumericCharacters?: FindTermsVariantMode;
    convertAlphabeticCharacters?: FindTermsVariantMode;
    convertHiraganaToKatakana?: FindTermsVariantMode;
    convertKatakanaToHiragana?: FindTermsVariantMode;
    collapseEmphaticSequences?: FindTermsEmphaticSequencesMode;
    textReplacements?: (FindTermsTextReplacement[] | null)[];
    enabledDictionaryMap?: [key: string, value: FindTermDictionary][];
    excludeDictionaryDefinitions?: string[] | null;
};

export type FindTermsTextReplacement = {
    pattern: string;
    flags: string;
    replacement: string;
};
