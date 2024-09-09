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

import type * as Dictionary from './dictionary';

export type FrequencyData = {
    displayValue: null | string;
    frequency: number;
};

export type KanjiFrequenciesMap3 = Map<string, FrequencyData>;

export type TermFrequenciesMap1 = Map<string, TermFrequenciesMap2>;

export type TermFrequenciesMap2 = Map<string, TermFrequenciesMap2Data>;

export type TermFrequenciesMap2Data = {
    reading: null | string;
    term: string;
    values: TermFrequenciesMap3;
};

export type KanjiFrequenciesMap1 = Map<string, KanjiFrequenciesMap2>;

export type KanjiFrequenciesMap2 = Map<string, KanjiFrequenciesMap2Data>;

export type KanjiFrequenciesMap2Data = {
    character: string;
    values: KanjiFrequenciesMap3;
};

export type TermFrequenciesMap3 = Map<string, FrequencyData>;

export type DictionaryFrequency<T = unknown> = {
    dictionary: string;
    dictionaryAlias: string;
    frequencies: T[];
};

export type TermFrequency = {
    reading: null | string;
    term: string;
    values: FrequencyData[];
};

export type KanjiFrequency = {
    character: string;
    values: FrequencyData[];
};

export type TermFrequencyType = 'normal' | 'popular' | 'rare';

export type GroupedPronunciationInternal = {
    pronunciation: Dictionary.Pronunciation;
    reading: string;
    terms: Set<string>;
};

export type GroupedPronunciation = {
    exclusiveReadings: string[];
    exclusiveTerms: string[];
    pronunciation: Dictionary.Pronunciation;
    reading: string;
    terms: string[];
};

export type DictionaryGroupedPronunciations = {
    dictionary: string;
    dictionaryAlias: string;
    pronunciations: GroupedPronunciation[];
};

export type TagGroup = {
    headwordIndices: number[];
    tag: Dictionary.Tag;
};
